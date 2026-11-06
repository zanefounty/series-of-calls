"""Regression tests for the proposed recorder's execution-time input freeze.

The test copies the actual proposed recorder into a minimal temporary repository
and stubs only its child `node` executable. The stub returns controlled TAP and
can mutate/delete one declared input while the recorder waits. The repository's
real verify.acceptance_results parser is copied into the fixture. No application
suite runs here, and the emitted TAP is not evidence of application acceptance.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


OVERLAY = Path(__file__).resolve().parents[1]
REPOSITORY = Path(os.environ.get('SOC_REPOSITORY_ROOT', Path.cwd()))
RECORDER = OVERLAY / 'scripts' / 'record-evidence.py'
PARSER = REPOSITORY / 'scripts' / 'verify.py'


class EvidenceFreezeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='soc-evidence-freeze-')
        self.root = Path(self.tmp.name) / 'fixture'
        (self.root / 'scripts').mkdir(parents=True)
        (self.root / 'spec').mkdir()
        (self.root / 'tests').mkdir()
        (self.root / 'bin').mkdir()
        shutil.copy2(RECORDER, self.root / 'scripts' / 'record-evidence.py')
        shutil.copy2(PARSER, self.root / 'scripts' / 'verify.py')
        self.input = self.root / 'fixture-input.txt'
        self.input.write_text('immutable before child starts\n')
        (self.root / 'tests' / 'acceptance.test.js').write_text('// declared fixture suite\n')
        (self.root / 'spec' / 'acceptance-plan.json').write_text(json.dumps({
            'inputs': ['fixture-input.txt'],
            'suites': {'tests/acceptance.test.js': ['AC-SOC-001']},
        }))
        node = self.root / 'bin' / 'node'
        node.write_text('''#!/usr/bin/env python3
import os, pathlib, sys
if sys.argv[1:] == ['--version']:
    print('v24.22.2')
    raise SystemExit(0)
target = pathlib.Path(os.environ['SOC_FREEZE_FIXTURE_INPUT'])
mode = os.environ.get('SOC_FREEZE_MUTATION', 'none')
if mode == 'modify': target.write_text('changed while test subprocess was running\\n')
elif mode == 'delete': target.unlink()
print('TAP version 13')
if mode == 'duplicate':
    print('1..2')
    print('ok 1 - AC-SOC-001 first')
    print('ok 2 - AC-SOC-001 duplicate')
elif mode == 'missing':
    print('1..0')
elif mode == 'fail':
    print('1..1')
    print('not ok 1 - AC-SOC-001 controlled failure')
    raise SystemExit(1)
elif mode == 'skip':
    print('1..1')
    print('ok 1 - AC-SOC-001 # SKIP controlled skip')
else:
    print('1..1')
    print('ok 1 - AC-SOC-001')
''')
        node.chmod(0o755)
        self.original_hash = hashlib.sha256(self.input.read_bytes()).hexdigest()

    def tearDown(self):
        self.tmp.cleanup()

    def run_recorder(self, mutation='none'):
        env = os.environ.copy()
        env['PATH'] = str(self.root / 'bin') + os.pathsep + env.get('PATH', '')
        env['SOC_FREEZE_FIXTURE_INPUT'] = str(self.input)
        env['SOC_FREEZE_MUTATION'] = mutation
        env['TEST_JOBS'] = '2'
        result = subprocess.run(
            [sys.executable, str(self.root / 'scripts' / 'record-evidence.py')],
            cwd=self.root, env=env, capture_output=True, text=True, timeout=10,
        )
        report_path = self.root / 'evidence' / 'acceptance.json'
        if not report_path.is_file():
            raise AssertionError('recorder produced no receipt: ' + result.stdout + result.stderr)
        report = json.loads(report_path.read_text())
        return result, report

    def test_unchanged_inputs_and_passing_tap_succeed(self):
        result, report = self.run_recorder()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(report['failures'], 0)
        self.assertEqual(report['tests'], {'AC-SOC-001': 'passed'})
        self.assertEqual(report['changedInputs'], [])
        self.assertEqual(report['inputs']['fixture-input.txt'], self.original_hash)
        self.assertEqual(report['inputs']['spec/acceptance-plan.json'], hashlib.sha256(
            (self.root / 'spec' / 'acceptance-plan.json').read_bytes()).hexdigest())

    def test_passing_tap_cannot_hide_an_input_mutation(self):
        result, report = self.run_recorder('modify')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertEqual(report['tests'], {'AC-SOC-001': 'passed'})
        self.assertEqual(report['failures'], 1)
        self.assertEqual(report['inputs']['fixture-input.txt'], self.original_hash)
        self.assertNotEqual(hashlib.sha256(self.input.read_bytes()).hexdigest(), self.original_hash)
        self.assertEqual(report['changedInputs'], ['fixture-input.txt'])
        self.assertIn('Acceptance inputs changed during execution', report['parseError'])

    def test_passing_tap_cannot_hide_input_deletion_and_original_hash_is_retained(self):
        result, report = self.run_recorder('delete')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertEqual(report['tests'], {'AC-SOC-001': 'passed'})
        self.assertEqual(report['failures'], 1)
        self.assertFalse(self.input.exists())
        self.assertEqual(report['inputs']['fixture-input.txt'], self.original_hash)
        self.assertEqual(report['changedInputs'], ['fixture-input.txt'])
        self.assertIn('Acceptance inputs changed during execution', report['parseError'])


    def test_parallel_command_fails_closed_on_duplicate_results(self):
        result, report = self.run_recorder('duplicate')
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertEqual(report['tests'], {})
        self.assertEqual(report['failures'], 1)
        self.assertIn('--test-isolation=process', report['command'])
        self.assertIn('--test-concurrency=2', report['command'])
        self.assertIn('Duplicate executed acceptance ID', report['parseError'])

    def test_parallel_command_fails_closed_on_missing_and_failed_suites(self):
        missing, missing_report = self.run_recorder('missing')
        self.assertEqual(missing.returncode, 1, missing.stdout + missing.stderr)
        self.assertEqual(missing_report['tests'], {})
        self.assertIn('Executed acceptance IDs differ from plan', missing_report['parseError'])
        failed, failed_report = self.run_recorder('fail')
        self.assertEqual(failed.returncode, 1, failed.stdout + failed.stderr)
        self.assertEqual(failed_report['tests'], {})
        self.assertIn('Acceptance tests failed', failed_report['parseError'])
        skipped, skipped_report = self.run_recorder('skip')
        self.assertEqual(skipped.returncode, 1, skipped.stdout + skipped.stderr)
        self.assertEqual(skipped_report['tests'], {})
        self.assertIn('Skipped acceptance test', skipped_report['parseError'])

    def test_duplicate_plan_id_is_not_collapsed_by_a_set(self):
        plan_path = self.root / 'spec' / 'acceptance-plan.json'
        plan = json.loads(plan_path.read_text())
        plan['suites']['tests/acceptance.test.js'].append('AC-SOC-001')
        plan_path.write_text(json.dumps(plan))
        result, report = self.run_recorder()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertEqual(report['tests'], {})
        self.assertIn('Duplicate acceptance plan ID', report['parseError'])


class WorkflowOverlayTests(unittest.TestCase):
    def test_aggregate_ci_requires_translations_and_pages_build_is_main_only(self):
        ci = (OVERLAY / '.github' / 'workflows' / 'ci.yml').read_text()
        release = (OVERLAY / '.github' / 'workflows' / 'release.yml').read_text()
        self.assertIn('needs: [part, build, translations]', ci)
        self.assertIn('needs.translations.result', ci)
        self.assertRegex(ci, r'test .*needs\.translations\.result.* = success')
        self.assertIn("if: github.ref == 'refs/heads/main'", release)


if __name__ == '__main__':
    unittest.main(verbosity=2)
