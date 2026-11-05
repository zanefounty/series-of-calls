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
        self.assertIn('part: [1, 2, 3, 4]', tests)
        self.assertIn('npm test -- --shard ${{ matrix.part }}/4', tests)
        self.assertIn('fail-fast: false', tests)
        self.assertIn('timeout-minutes: 20', tests)
        self.assertIn('needs: [tests]', build)
        self.assertIn("if: github.ref == 'refs/heads/main'", build)
        self.assertIn('timeout-minutes: 30', build)
        self.assertIn('needs: build', deploy)
        self.assertIn('name: github-pages', deploy)
        for body in (tests, build, deploy):
            self.assertNotIn('continue-on-error:', body)
            self.assertNotIn('always()', body)
        for body in (tests, build):
            self.assertIn('persist-credentials: false', body)
            self.assertIn('node-version: 24', body)
            self.assertIn('npm ci', body)
        commands = [
            'npm run evidence', 'npm run check:all', 'npm run check:release',
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
