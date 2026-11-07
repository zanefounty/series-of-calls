"""Portable regression contract for the accountability workflow split.

Uses only Python's standard library. It exercises the actual shell snippets from
the workflow for missing receipts and aggregate success/failure outcomes.
"""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / '.github' / 'workflows' / 'accountability.yml'


def job_block(source, name, next_name=None):
    start_marker = f'  {name}:\n'
    start = source.index(start_marker)
    end = source.find(f'  {next_name}:\n', start + len(start_marker)) if next_name else len(source)
    if end < 0:
        end = len(source)
    return source[start:end]


def run_block(job, step_name):
    lines = job.splitlines()
    marker = f'      - name: {step_name}'
    start = lines.index(marker)
    for i in range(start + 1, len(lines)):
        if lines[i].startswith('      - '):
            break
        if lines[i].startswith('        run: ') and lines[i].strip() != 'run: |':
            return lines[i].strip()[len('run: '):] + '\n'
        if lines[i].strip() == 'run: |':
            content = []
            for line in lines[i + 1:]:
                if line and not line.startswith('          '):
                    break
                content.append(line[10:] if line.startswith('          ') else '')
            return '\n'.join(content).rstrip() + '\n'
    raise AssertionError(f'No literal run block for workflow step {step_name}')


class AccountabilityWorkflowContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = WORKFLOW.read_text()
        cls.acceptance = job_block(cls.source, 'acceptance', 'acceptance-merge')
        cls.merge = job_block(cls.source, 'acceptance-merge', 'gates')
        cls.gates = job_block(cls.source, 'gates', 'mutations')
        cls.mutations = job_block(cls.source, 'mutations', 'accountability')
        cls.aggregate = job_block(cls.source, 'accountability')

    def test_gate_cleans_checked_in_receipts_before_exact_run_artifact_download(self):
        clean = self.gates.index('name: Remove checked-in receipts before artifact download')
        download = self.gates.index('uses: actions/download-artifact@')
        self.assertLess(clean, download)
        self.assertIn('needs: [acceptance-merge]', self.gates)
        self.assertIn('name: acceptance-${{ github.run_id }}-${{ github.run_attempt }}', self.merge)
        self.assertIn('name: acceptance-${{ github.run_id }}-${{ github.run_attempt }}', self.gates)
        cleanup = run_block(self.gates, 'Remove checked-in receipts before artifact download')
        required = run_block(self.gates, "Require this run's acceptance receipts")
        with tempfile.TemporaryDirectory(prefix='soc-workflow-receipts-') as tmp:
            evidence = Path(tmp) / 'evidence'
            evidence.mkdir()
            old_json, old_tap = evidence / 'acceptance.json', evidence / 'communications.tap'
            old_json.write_text('{"stale":true}')
            old_tap.write_text('stale TAP\n')
            subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', cleanup], cwd=tmp, check=True)
            self.assertFalse(old_json.exists())
            self.assertFalse(old_tap.exists())
            # Model a successful artifact action that supplied only its log.
            (evidence / 'recorder.log').write_text('producer completed without receipts\n')
            check = subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', required], cwd=tmp, capture_output=True)
            self.assertNotEqual(check.returncode, 0)
            old_json.write_text('{"run":"current"}')
            old_tap.write_text('ok 1 - current producer TAP\n')
            current = subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', required], cwd=tmp, capture_output=True)
            self.assertEqual(current.returncode, 0, current.stdout.decode() + current.stderr.decode())

    def test_mutations_require_fresh_acceptance_artifact_not_checked_in_receipts(self):
        self.assertIn('needs: [acceptance-merge]', self.mutations)
        self.assertIn('name: acceptance-${{ github.run_id }}-${{ github.run_attempt }}', self.merge)
        self.assertIn('name: acceptance-${{ github.run_id }}-${{ github.run_attempt }}', self.mutations)
        clean = self.mutations.index('name: Remove checked-in receipts before artifact download')
        download = self.mutations.index('uses: actions/download-artifact@')
        require = self.mutations.index("name: Require this run's acceptance receipts")
        run_tests = self.mutations.index('name: Run fail-closed gate mutation tests')
        self.assertLess(clean, download)
        self.assertLess(download, require)
        self.assertLess(require, run_tests)
        cleanup = run_block(self.mutations, 'Remove checked-in receipts before artifact download')
        required = run_block(self.mutations, "Require this run's acceptance receipts")
        with tempfile.TemporaryDirectory(prefix='soc-mutation-receipts-') as tmp:
            evidence = Path(tmp) / 'evidence'
            evidence.mkdir()
            old_json, old_tap = evidence / 'acceptance.json', evidence / 'communications.tap'
            old_json.write_text('{"stale_register_hash":true}')
            old_tap.write_text('stale TAP\n')
            subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', cleanup], cwd=tmp, check=True)
            self.assertFalse(old_json.exists())
            self.assertFalse(old_tap.exists())
            # A same-run artifact with logs but no receipts must fail closed.
            (evidence / 'recorder.log').write_text('producer completed without receipts\n')
            check = subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', required], cwd=tmp, capture_output=True)
            self.assertNotEqual(check.returncode, 0)

    def test_each_work_job_keeps_node_24_npm_ci_and_ten_minute_limit(self):
        for key, block in [('acceptance', self.acceptance), ('gates', self.gates), ('mutations', self.mutations)]:
            with self.subTest(job=key):
                self.assertRegex(block, r'timeout-minutes: 10\b')
                self.assertIn('node-version: 24', block)
                self.assertRegex(block, r'(?m)^      - run: npm ci$|\bnpm ci\b')
        self.assertRegex(self.aggregate, r'timeout-minutes: 10\b')
        self.assertRegex(self.merge, r'timeout-minutes: 10\b')

    def test_workflow_is_callable_by_publication_without_changing_its_other_triggers(self):
        triggers = self.source.split('permissions:', 1)[0]
        self.assertIn('  pull_request:', triggers)
        self.assertIn('  push:', triggers)
        self.assertIn('  workflow_dispatch:', triggers)
        self.assertIn('  workflow_call:', triggers)
        self.assertIn('branches: [main]', triggers)

    def test_each_producer_has_an_independent_required_replay(self):
        for block in [self.acceptance, self.gates]:
            self.assertIn('fail-fast: false', block)
        self.assertIn('part: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]', self.acceptance)
        self.assertIn('part: [1, 2, 3, 4, 5, 6, 7, 8]', self.gates)
        self.assertIn('scripts/record-evidence.py --shard ${{ matrix.part }}/20', self.acceptance)
        self.assertIn('name: development gates ${{ matrix.part }}/8', self.gates)
        self.assertIn('scripts/verify.py all --acceptance-shard ${{ matrix.part }}/8', self.gates)
        self.assertIn('needs: [acceptance]', self.merge)
        self.assertIn('--merge-shards acceptance-parts --shard-count 20', self.merge)
        self.assertIn('pattern: acceptance-part-*-${{ github.run_id }}-${{ github.run_attempt }}', self.merge)
        self.assertNotIn('merge-multiple: true', self.merge)
        self.assertLess(self.merge.index('Remove checked-in receipts'), self.merge.index('actions/download-artifact@'))

    def test_setup_failure_cannot_upload_checked_in_receipts_as_current_output(self):
        clean = self.acceptance.index('name: Remove checked-in receipts before producer execution')
        install = self.acceptance.index('npm ci')
        self.assertLess(clean, install)
        self.assertIn('evidence/acceptance.json evidence/communications.tap evidence/recorder.log', self.acceptance)
        for block, stale in [(self.gates, ['evidence/gates.log', 'evidence/gates-install.log']),
                             (self.mutations, ['evidence/gate-mutations.log', 'evidence/mutations-install.log'])]:
            for path in stale:
                self.assertIn(path, block)
            self.assertLess(block.index('Clear '), block.index('npm ci'))

    def test_mutation_job_remains_required_and_artifacts_upload_after_failure(self):
        self.assertIn("python3 -m unittest discover -s tests -p '*_test.py'", self.mutations)
        self.assertIn('needs: [acceptance, acceptance-merge, gates, mutations]', self.aggregate)
        for block in [self.acceptance, self.merge, self.gates, self.mutations]:
            self.assertIn('if: always()', block)
        self.assertIn('evidence/acceptance.json', self.acceptance)
        self.assertIn('evidence/communications.tap', self.acceptance)
        self.assertIn('evidence/recorder.log', self.acceptance)

    def test_actual_aggregate_shell_fails_when_any_required_job_is_not_success(self):
        self.assertIn('if: always()', self.aggregate)
        self.assertIn('needs: [acceptance, acceptance-merge, gates, mutations]', self.aggregate)
        script = run_block(self.aggregate, 'Require every accountability job to succeed')
        cases = [
            ('success', 'success', 'success', True),
            ('failure', 'success', 'success', False),
            ('success', 'failure', 'success', False),
            ('success', 'success', 'failure', False),
            ('skipped', 'success', 'success', False),
            ('success', 'skipped', 'success', False),
            ('success', 'success', 'skipped', False),
            ('cancelled', 'success', 'success', False),
        ]
        for a, g, m, expected in cases:
            env = os.environ.copy()
            env.update(ACCEPTANCE_RESULT=a, MERGE_RESULT='success', GATES_RESULT=g, MUTATIONS_RESULT=m)
            result = subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', script], env=env, capture_output=True)
            with self.subTest(results=(a, g, m)):
                self.assertEqual(result.returncode == 0, expected, result.stdout.decode() + result.stderr.decode())
        for merge in ['failure', 'cancelled', 'skipped', '']:
            env = dict(os.environ, ACCEPTANCE_RESULT='success', MERGE_RESULT=merge, GATES_RESULT='success', MUTATIONS_RESULT='success')
            result = subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', script], env=env, capture_output=True)
            self.assertNotEqual(result.returncode, 0)


class PublicationWorkflowContract(unittest.TestCase):
    def test_publication_requires_fresh_json_and_tap_after_removing_seed_receipts(self):
        release = (ROOT / '.github' / 'workflows' / 'release.yml').read_text()
        build = job_block(release, 'build', 'deploy')
        cleanup = run_block(build, 'Remove checked-in acceptance receipts before artifact download')
        required = run_block(build, "Require this run's acceptance receipts")
        with tempfile.TemporaryDirectory(prefix='soc-publication-receipts-') as tmp:
            evidence = Path(tmp) / 'evidence'
            evidence.mkdir()
            receipt, tap = evidence / 'acceptance.json', evidence / 'communications.tap'
            receipt.write_text('{"stale":true}')
            tap.write_text('stale TAP')
            subprocess.run(['bash', '-e', '-c', cleanup], cwd=tmp, check=True)
            self.assertFalse(receipt.exists())
            self.assertFalse(tap.exists())
            for json_bytes, tap_bytes, expected in [('', '', False), ('current', '', False),
                                                    ('', 'current', False), ('current', 'current', True)]:
                receipt.write_text(json_bytes)
                tap.write_text(tap_bytes)
                result = subprocess.run(['bash', '-e', '-c', required], cwd=tmp, capture_output=True)
                self.assertEqual(result.returncode == 0, expected)

    def test_publication_choice_shell_refuses_unrecognized_values(self):
        release = (ROOT / '.github' / 'workflows' / 'release.yml').read_text()
        script = run_block(job_block(release, 'build', 'deploy'), 'Validate publication choice')
        for value in ['preview', 'release', '', 'unknown', 'PREVIEW']:
            env = dict(os.environ, PUBLICATION=value)
            result = subprocess.run(['bash', '-e', '-c', script], env=env, capture_output=True)
            self.assertEqual(result.returncode == 0, value in ['preview', 'release'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
