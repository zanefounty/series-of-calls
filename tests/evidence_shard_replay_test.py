"""Real Node replay proves every shard is necessary; receipts remain globally checked."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import verify as V


class ShardedReplayTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='soc-replay-shards-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.suites = {f'tests/case-{n}.test.js': [f'AC-SOC-{n:03}'] for n in range(1, 5)}
        for n, path in enumerate(self.suites, 1):
            target = self.root / path
            target.parent.mkdir(exist_ok=True)
            target.write_text(f"require('node:test')('AC-SOC-{n:03} real replay',()=>{{}});\n")
        self.plan = {'version': 1, 'suites': self.suites, 'inputs': list(self.suites)}
        self.write('spec/acceptance-plan.json', self.plan)
        self.write('spec/generated/source-items.json', [{'id': 'fixture-source'}])
        self.write('spec/implementation.json', {'behaviours': [{
            'id': 'fixture-behaviour', 'sources': ['fixture-source'],
            'implementation': list(self.suites),
            'testIds': [x for ids in self.suites.values() for x in ids],
        }]})
        self.receipt()

    def write(self, path, data):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(data))

    def receipt(self):
        # Synthetic receipt belongs only to this adversarial test fixture.
        self.report = {
            'inputs': {p: hashlib.sha256((self.root / p).read_bytes()).hexdigest()
                       for p in self.plan['inputs'] + ['spec/acceptance-plan.json']},
            'failures': 0, 'tests': {ids[0]: 'passed' for ids in self.suites.values()},
        }
        self.write('evidence/acceptance.json', self.report)

    def test_partitions_cover_every_file_and_id_exactly_once(self):
        for count in range(1, 5):
            parts = [V.acceptance_suites(self.plan, (i, count)) for i in range(1, count + 1)]
            paths = [p for part in parts for p in part]
            self.assertEqual(len(paths), len(set(paths)))
            self.assertEqual(set(paths), set(self.suites))
        for shard in [(0, 4), (5, 4), (1, 5), (True, 4), (1, 0)]:
            with self.subTest(shard=shard), self.assertRaises(V.GateError):
                V.acceptance_suites(self.plan, shard)

    def test_actual_replays_cover_complete_receipt_and_full_default_still_runs(self):
        with patch.dict(os.environ, {'TEST_JOBS': '2'}):
            for index in range(1, 5):
                V.evidence(self.root, (index, 4))
            V.evidence(self.root)

    def test_forged_pass_cannot_hide_failure_in_another_required_shard(self):
        (self.root / 'tests/case-4.test.js').write_text(
            "require('node:test')('AC-SOC-004 actual failure',()=>{throw Error('must fail');});\n")
        self.receipt()
        V.evidence(self.root, (1, 4))
        with self.assertRaisesRegex(V.GateError, 'Current behavioural tests fail'):
            V.evidence(self.root, (4, 4))
        with self.assertRaisesRegex(V.GateError, 'Current behavioural tests fail'):
            V.evidence(self.root)

    def test_each_shard_rejects_missing_global_evidence_before_replay(self):
        del self.report['tests']['AC-SOC-004']
        self.write('evidence/acceptance.json', self.report)
        with self.assertRaisesRegex(V.GateError, 'Missing or failing acceptance evidence'):
            V.evidence(self.root, (1, 4))

    def test_each_shard_rejects_stale_unselected_inputs(self):
        (self.root / 'tests/case-4.test.js').write_text('// changed after receipt\n')
        with self.assertRaisesRegex(V.GateError, 'Evidence input changed'):
            V.evidence(self.root, (1, 4))

    def test_replay_cannot_mutate_an_unselected_input_and_claim_success(self):
        (self.root / 'tests/case-1.test.js').write_text(
            "require('node:test')('AC-SOC-001 mutation',()=>{require('node:fs').appendFileSync('tests/case-4.test.js','// drift');});\n")
        self.receipt()
        with self.assertRaisesRegex(V.GateError, 'Evidence input changed during replay'):
            V.evidence(self.root, (1, 4))

    def test_release_cannot_use_partial_replay_option(self):
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/verify.py'),
                                 'release', '--acceptance-shard', '1/4'], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('release always replays the complete plan', result.stderr)


if __name__ == '__main__':
    unittest.main()
