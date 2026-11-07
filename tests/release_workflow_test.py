"""Publication must retain fresh verification before its protected deployment."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PublicationVerificationTests(unittest.TestCase):
    def test_all_shards_gate_build_and_protected_deployment(self):
        workflow = (ROOT / '.github/workflows/release.yml').read_text()
        jobs = dict(re.findall(r'^  (\w+):\n(.*?)(?=^  \w+:\n|\Z)', workflow, re.M | re.S))
        tests, build, deploy = (jobs[name] for name in ('tests', 'build', 'deploy'))
        accountability = jobs['accountability']
        called = (ROOT / '.github/workflows/accountability.yml').read_text()
        self.assertIn('part: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]', tests)
        self.assertIn('name: publication test ${{ matrix.part }}/16', tests)
        self.assertIn('npm test -- --shard ${{ matrix.part }}/16', tests)
        self.assertIn('fail-fast: false', tests)
        self.assertIn('timeout-minutes: 20', tests)
        self.assertIn('needs: [tests, accountability]', build)
        self.assertIn('uses: ./.github/workflows/accountability.yml', accountability)
        self.assertIn("if: github.ref == 'refs/heads/main'", accountability)
        self.assertIn('  workflow_call:', called)
        self.assertIn('scripts/record-evidence.py --shard ${{ matrix.part }}/20', called)
        self.assertIn('scripts/verify.py all --acceptance-shard ${{ matrix.part }}/8', called)
        self.assertIn('--merge-shards acceptance-parts --shard-count 20', called)
        self.assertIn('needs: [acceptance, acceptance-merge, gates, mutations]', called)
        self.assertIn('part: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]', called)
        self.assertEqual(called.count('part: [1, 2, 3, 4, 5, 6, 7, 8]'), 1)
        self.assertIn("if: github.ref == 'refs/heads/main'", build)
        self.assertIn('timeout-minutes: 30', build)
        self.assertIn('needs: build', deploy)
        self.assertIn('name: github-pages', deploy)
        for body in (tests, accountability, build, deploy):
            self.assertNotIn('continue-on-error:', body)
            self.assertNotIn('always()', body)
        for body in (tests, build):
            self.assertIn('persist-credentials: false', body)
            self.assertIn('node-version: 24', body)
            self.assertIn('npm ci', body)
        commands = [
            'Remove checked-in acceptance receipts', 'actions/download-artifact@v8',
            "Require this run's acceptance receipts", 'npm run check:release',
            'npm run build', 'npm audit --audit-level=low',
            'scripts/install-gitleaks.sh', 'scripts/check-pages-artifact.py _site',
            'scripts/check-secrets.py', 'actions/upload-pages-artifact@v5',
        ]
        positions = [build.index(command) for command in commands]
        self.assertEqual(positions, sorted(positions))
        self.assertIn("if: inputs.publication == 'release'", build)
        self.assertIn('actions/deploy-pages@v5', deploy)


if __name__ == '__main__':
    unittest.main()
