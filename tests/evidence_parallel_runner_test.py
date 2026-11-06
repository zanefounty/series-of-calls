"""The parallel acceptance runner preserves plan accounting and input freezes."""
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
sys.path.insert(0, str(REPOSITORY / 'scripts'))
from verify import GateError, acceptance_results
PARSER = REPOSITORY / 'scripts' / 'verify.py'


class ParallelAcceptanceTests(unittest.TestCase):
    def test_skipped_acceptance_result_is_not_passed(self):
        with self.assertRaisesRegex(GateError, 'Skipped acceptance test'):
            acceptance_results('ok 1 - AC-SOC-001 # SKIP intentionally skipped\n', {'AC-SOC-001'})

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='soc-parallel-acceptance-')
        self.root = Path(self.tmp.name) / 'fixture'
        for name in ('scripts', 'spec', 'tests'):
            (self.root / name).mkdir(parents=True)
        shutil.copy2(RECORDER, self.root / 'scripts' / 'record-evidence.py')
        shutil.copy2(PARSER, self.root / 'scripts' / 'verify.py')
        self.event_dir = self.root / 'events'
        self.event_dir.mkdir()
        self.input = self.root / 'fixture-input.txt'
        self.input.write_text('frozen during execution\n')
        suites = {}
        for name, ac in (('first', 'AC-SOC-001'), ('second', 'AC-SOC-002')):
            suite = self.root / 'tests' / f'{name}.test.js'
            suite.write_text(f"""const {{test}}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
test('{ac} {name} case',async()=>{{
 const stem=path.join(process.env.SOC_ACCEPTANCE_EVENT_DIR,'{name}');
 fs.writeFileSync(stem+'.start',String(Date.now()));
 await new Promise(resolve=>setTimeout(resolve,1200));
 fs.writeFileSync(stem+'.end',String(Date.now()));
}});
""")
            suites[f'tests/{name}.test.js'] = [ac]
        (self.root / 'spec' / 'acceptance-plan.json').write_text(json.dumps({
            'version': 1,
            'inputs': ['fixture-input.txt'],
            'suites': suites,
        }))

    def tearDown(self):
        self.tmp.cleanup()

    def test_native_node_workers_overlap_and_emit_exact_valid_tap(self):
        env = os.environ.copy()
        env['TEST_JOBS'] = '2'
        env['SOC_ACCEPTANCE_EVENT_DIR'] = str(self.event_dir)
        result = subprocess.run(
            [sys.executable, str(self.root / 'scripts' / 'record-evidence.py')],
            cwd=self.root, env=env, capture_output=True, text=True, timeout=20,
        )
        report = json.loads((self.root / 'evidence' / 'acceptance.json').read_text())
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(report['tests'], {'AC-SOC-001': 'passed', 'AC-SOC-002': 'passed'})
        self.assertEqual(report['changedInputs'], [])
        self.assertIn('--test-concurrency=2', report['command'])
        tap = (self.root / 'evidence' / 'communications.tap').read_text()
        self.assertIn('1..2', tap)
        self.assertEqual(sum(1 for line in tap.splitlines() if line.startswith(('ok ', 'not ok '))), 2)
        intervals = []
        for name in ('first', 'second'):
            start = int((self.event_dir / f'{name}.start').read_text())
            end = int((self.event_dir / f'{name}.end').read_text())
            intervals.append((start, end))
        self.assertLess(max(x[0] for x in intervals), min(x[1] for x in intervals), 'suite files should run concurrently')
        self.assertEqual(report['inputs']['fixture-input.txt'], hashlib.sha256(self.input.read_bytes()).hexdigest())


if __name__ == '__main__':
    unittest.main(verbosity=2)
