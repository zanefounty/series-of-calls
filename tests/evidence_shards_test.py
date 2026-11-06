"""End-to-end tests for real Node TAP acceptance shards and their merge."""
import hashlib
import json
import os
from pathlib import Path
import signal
import shutil
import subprocess
import sys
import tempfile
import time
import unittest


ROOT = Path(__file__).resolve().parents[1]
RECORDER = ROOT / 'scripts' / 'record-evidence.py'


class EvidenceShardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='soc-evidence-shards-')
        cls.base = Path(cls.tmp.name) / 'repository'
        for folder in ('scripts', 'spec', 'tests'):
            (cls.base / folder).mkdir(parents=True, exist_ok=True)
        shutil.copy2(RECORDER, cls.base / 'scripts' / 'record-evidence.py')
        shutil.copy2(ROOT / 'scripts' / 'verify.py', cls.base / 'scripts' / 'verify.py')
        cls.input = cls.base / 'fixture-input.txt'
        cls.input.write_text('immutable shard input\n')
        suites = {}
        for index in range(1, 9):
            path = cls.base / 'tests' / f'shard-{index}.test.js'
            path.write_text(f"""const {{test, describe}} = require('node:test');
test('AC-SOC-{index:03d} real acceptance case', () => {{}});
test('auxiliary unregistered test', {{skip: process.env.SOC_SKIP_AUX === '1'}}, () => {{}});
describe('nested non-AC helper suite', () => {{ test('nested helper assertion', () => {{}}); }});
""")
            suites[f'tests/shard-{index}.test.js'] = [f'AC-SOC-{index:03d}']
        (cls.base / 'spec' / 'acceptance-plan.json').write_text(json.dumps({
            'version': 1,
            'inputs': ['fixture-input.txt'],
            'suites': suites,
        }))
        cls.collector = Path(cls.tmp.name) / 'shards'
        cls.collector.mkdir()
        for index in range(1, 5):
            env = cls.environment(skip_aux=True)
            result = subprocess.run(
                [sys.executable, str(cls.base / 'scripts' / 'record-evidence.py'),
                 '--shard', f'{index}/4'],
                cwd=cls.base, env=env, capture_output=True, text=True, timeout=30,
            )
            if result.returncode:
                receipt = (cls.base / 'evidence' / 'acceptance.json').read_text()
                tap = (cls.base / 'evidence' / 'communications.tap').read_text()
                raise AssertionError(f'shard {index} failed: {result.stdout}\n{result.stderr}\n{receipt}\n{tap}')
            target = cls.collector / f'part-{index}'
            shutil.copytree(cls.base / 'evidence', target)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    @classmethod
    def environment(cls, skip_aux=False):
        env = os.environ.copy()
        env['TEST_JOBS'] = '2'
        if skip_aux:
            env['SOC_SKIP_AUX'] = '1'
        else:
            env.pop('SOC_SKIP_AUX', None)
        return env

    def fresh_collector(self):
        temp = tempfile.TemporaryDirectory(prefix='soc-shard-case-')
        target = Path(temp.name) / 'shards'
        shutil.copytree(self.collector, target)
        self.addCleanup(temp.cleanup)
        return target

    def merge(self, directory):
        return subprocess.run(
            [sys.executable, str(self.base / 'scripts' / 'record-evidence.py'),
             '--merge-shards', str(directory), '--shard-count', '4'],
            cwd=self.base, env=self.environment(), capture_output=True, text=True, timeout=30,
        )

    def test_full_run_and_four_real_shards_merge_without_dropping_non_ac_tap(self):
        full = subprocess.run(
            [sys.executable, str(self.base / 'scripts' / 'record-evidence.py')],
            cwd=self.base, env=self.environment(), capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(full.returncode, 0, full.stdout + full.stderr)
        full_tap = (self.base / 'evidence' / 'communications.tap').read_bytes()
        self.assertIn(b'auxiliary unregistered test', full_tap)

        shard_dir = self.fresh_collector()
        merged = self.merge(shard_dir)
        self.assertEqual(merged.returncode, 0, merged.stdout + merged.stderr)
        output = self.base / 'evidence' / 'communications.tap'
        tap = output.read_bytes()
        report = json.loads((self.base / 'evidence' / 'acceptance.json').read_text())
        self.assertEqual(report['tests'], {f'AC-SOC-{index:03d}': 'passed' for index in range(1, 9)})
        self.assertEqual(report['nodeSummary']['tests'], 24)
        self.assertEqual(report['nodeSummary']['suites'], 8)
        self.assertEqual(report['nodeSummary']['skipped'], 8)
        for part in range(1, 5):
            raw = (shard_dir / f'part-{part}' / 'communications.tap').read_bytes()
            self.assertIn(raw, tap)
        self.assertEqual(tap.count(b'TAP version 13'), 4)
        self.assertIn(b'auxiliary unregistered test', tap)
        archived = [path for path in (self.base / 'evidence' / 'acceptance-shards').rglob('shard-communications.tap')]
        self.assertEqual(len(archived), 4)

    def test_merge_rejects_a_failing_unregistered_tap_result_even_if_receipt_claims_zero(self):
        directory = self.fresh_collector()
        part = directory / 'part-1'
        tap_path = part / 'communications.tap'
        tap = tap_path.read_text()
        self.assertIn('ok 2 - auxiliary unregistered test', tap)
        tap = tap.replace('ok 2 - auxiliary unregistered test', 'not ok 2 - auxiliary unregistered test')
        tap = tap.replace('# pass 2', '# pass 1').replace('# fail 0', '# fail 1')
        tap_path.write_text(tap)
        report_path = part / 'acceptance.json'
        report = json.loads(report_path.read_text())
        report['tapSha256'] = hashlib.sha256(tap_path.read_bytes()).hexdigest()
        report['nodeSummary']['pass'] = 1
        report['nodeSummary']['fail'] = 1
        report_path.write_text(json.dumps(report))
        result = self.merge(directory)
        self.assertEqual(result.returncode, 1)
        self.assertIn('failed test result', result.stderr)

    def test_merge_rejects_truncated_tap_even_when_the_report_claims_success(self):
        directory = self.fresh_collector()
        part = directory / 'part-2'
        tap_path = part / 'communications.tap'
        tap_path.write_text(tap_path.read_text().rsplit('\n1..', 1)[0] + '\n')
        report_path = part / 'acceptance.json'
        report = json.loads(report_path.read_text())
        report['tapSha256'] = hashlib.sha256(tap_path.read_bytes()).hexdigest()
        report_path.write_text(json.dumps(report))
        result = self.merge(directory)
        self.assertEqual(result.returncode, 1)
        self.assertIn('plan is missing', result.stderr)

    def test_merge_rejects_tap_hash_mismatch_and_extra_or_missing_parts(self):
        directory = self.fresh_collector()
        (directory / 'part-1' / 'communications.tap').write_bytes(b'TAP version 13\n')
        result = self.merge(directory)
        self.assertEqual(result.returncode, 1)
        self.assertIn('TAP hash mismatch', result.stderr)

        directory = self.fresh_collector()
        shutil.copytree(directory / 'part-1', directory / 'duplicate')
        result = self.merge(directory)
        self.assertEqual(result.returncode, 1)
        self.assertIn('exactly 4 acceptance shard reports', result.stderr)

    def test_merge_rejects_duplicate_index_wrong_suite_or_id_changed_input_and_command_or_runtime(self):
        cases = (
            (4, lambda report: report['shard'].update(index=1), 'Duplicate acceptance shard index'),
            (4, lambda report: report['shard'].update(suites=['tests/shard-1.test.js']), 'suite assignment mismatch'),
            (2, lambda report: report.update(tests={'AC-SOC-999': 'passed'}), 'test receipt mismatch'),
            (3, lambda report: report.update(changedInputs=['fixture-input.txt']), 'changed inputs'),
            (1, lambda report: report['command'].__setitem__(-1, 'tests/shard-8.test.js'), 'command suite list mismatch'),
            (2, lambda report: report.update(runtime='v0.0.0'), 'runtime mismatch'),
        )
        for part_number, mutate, expected_error in cases:
            with self.subTest(expected_error=expected_error):
                directory = self.fresh_collector()
                report_path = directory / f'part-{part_number}' / 'acceptance.json'
                report = json.loads(report_path.read_text())
                mutate(report)
                report_path.write_text(json.dumps(report))
                result = self.merge(directory)
                self.assertEqual(result.returncode, 1)
                self.assertIn(expected_error, result.stderr)

        directory = self.fresh_collector()
        shutil.rmtree(directory / 'part-4')
        result = self.merge(directory)
        self.assertEqual(result.returncode, 1)
        self.assertIn('exactly 4 acceptance shard reports', result.stderr)

    def test_merge_rejects_changed_plan_inputs_and_registered_skip(self):
        directory = self.fresh_collector()
        self.input.write_text('changed after shards were run\n')
        result = self.merge(directory)
        self.assertEqual(result.returncode, 1)
        self.assertIn('inputs differ', result.stderr)
        self.input.write_text('immutable shard input\n')

        directory = self.fresh_collector()
        part = directory / 'part-3'
        tap_path = part / 'communications.tap'
        tap = tap_path.read_text().replace(
            'ok 1 - AC-SOC-003 real acceptance case',
            'ok 1 - AC-SOC-003 real acceptance case # SKIP invalid registered skip',
        )
        tap_path.write_text(tap)
        report_path = part / 'acceptance.json'
        report = json.loads(report_path.read_text())
        report['tapSha256'] = hashlib.sha256(tap_path.read_bytes()).hexdigest()
        report_path.write_text(json.dumps(report))
        result = self.merge(directory)
        self.assertEqual(result.returncode, 1)
        self.assertIn('Skipped acceptance test', result.stderr)

    def test_interrupted_execution_keeps_streamed_tap_and_removes_old_pass_receipt(self):
        evidence = self.base / 'evidence'
        evidence.mkdir(exist_ok=True)
        old_receipt = evidence / 'acceptance.json'
        old_receipt.write_text('{"failures":0,"tests":{"stale":"passed"}}\n')
        tap_path = evidence / 'communications.tap'
        tap_path.unlink(missing_ok=True)
        fake_bin = self.base / 'slow-bin'
        fake_bin.mkdir()
        fake_node = fake_bin / 'node'
        fake_node.write_text("""#!/usr/bin/env python3
import sys, time
if sys.argv[1:] == ['--version']:
    print('v24.22.2')
    raise SystemExit(0)
print('TAP version 13', flush=True)
time.sleep(30)
""")
        fake_node.chmod(0o755)
        env = self.environment()
        env['PATH'] = str(fake_bin) + os.pathsep + env.get('PATH', '')
        process = subprocess.Popen(
            [sys.executable, str(self.base / 'scripts' / 'record-evidence.py')],
            cwd=self.base, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, start_new_session=True,
        )
        try:
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                if tap_path.is_file() and 'TAP version 13' in tap_path.read_text():
                    break
                if process.poll() is not None:
                    self.fail('recorder exited before streaming TAP')
                time.sleep(0.02)
            else:
                self.fail('partial TAP was not visible while Node was still running')
            self.assertFalse(old_receipt.exists(), 'stale passing receipt survived new run start')
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=5)
            self.assertEqual(tap_path.read_text(), 'TAP version 13\n')
            self.assertFalse(old_receipt.exists(), 'interrupted run left a passing report')
        finally:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=5)
            process.communicate(timeout=5)


if __name__ == '__main__':
    unittest.main(verbosity=2)
