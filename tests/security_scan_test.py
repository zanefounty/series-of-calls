import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / 'scripts' / 'check-secrets.py'
CANARY = hashlib.sha256(b'synthetic gitleaks canary for SOC tests').hexdigest()


def gitleaks_binary():
    configured = os.environ.get('GITLEAKS_BIN')
    if configured:
        path = Path(configured)
        if not path.is_file():
            raise AssertionError('GITLEAKS_BIN is set but does not name a file')
    else:
        found = shutil.which('gitleaks')
        if not found:
            raise unittest.SkipTest('GITLEAKS_BIN is unset and Gitleaks is not installed')
        path = Path(found)
    version = subprocess.run([str(path), 'version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if version.returncode or version.stdout.strip() != '8.30.1':
        if configured:
            raise AssertionError('Configured Gitleaks binary must be version 8.30.1')
        raise unittest.SkipTest('Automatic Gitleaks installation is not pinned to 8.30.1')
    return path


def git(repo, *args):
    return subprocess.run(['git', '-C', str(repo), *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


class SecretScanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.gitleaks = gitleaks_binary()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='soc-secret-scan-test-')
        self.base = Path(self.temp.name)
        self.repo = self.base / 'repo'
        self.repo.mkdir()
        git(self.repo, 'init', '-q')
        git(self.repo, 'config', 'user.name', 'SOC security fixture')
        git(self.repo, 'config', 'user.email', 'fixture@example.invalid')

    def tearDown(self):
        self.temp.cleanup()

    def commit_all(self, message):
        git(self.repo, 'add', '-A')
        git(self.repo, 'commit', '-m', message, '-q')

    def run_scan(self, artifact=None):
        command = ['python3', str(RUNNER), '--gitleaks', str(self.gitleaks), '--repo', str(self.repo)]
        if artifact is not None:
            command.extend(['--artifact', str(artifact)])
        return subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    def assert_redacted(self, result):
        self.assertNotIn(CANARY, result.stdout)
        self.assertNotIn(CANARY, result.stderr)
        self.assertNotIn('REDACTED', result.stdout + result.stderr)

    def test_current_untracked_canary_is_found_even_with_inline_allow_comment(self):
        path = self.repo / 'canary.js'
        path.write_text(f'const api_key = "{CANARY}"; // gitleaks:allow\n')
        result = self.run_scan()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('finding(s)', result.stderr)
        self.assertIn('generic-api-key=', result.stderr)
        self.assert_redacted(result)

    def test_deleted_historical_canary_is_found(self):
        base_branch = subprocess.run(['git', '-C', str(self.repo), 'branch', '--show-current'],
                                     check=True, stdout=subprocess.PIPE, text=True).stdout.strip()
        path = self.repo / 'old-config.txt'
        path.write_text(f'api_key={CANARY}\n')
        self.commit_all('add synthetic canary')
        git(self.repo, 'branch', 'retained-canary-history')
        path.unlink()
        self.commit_all('remove synthetic canary')
        self.assertNotEqual(base_branch, 'retained-canary-history')
        result = self.run_scan()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('generic-api-key=', result.stderr)
        self.assert_redacted(result)

    def test_provider_pat_canary_is_found(self):
        pat = 'gh' + 'p_' + hashlib.sha256(b'provider-specific synthetic canary').hexdigest()[:36]
        (self.repo / 'provider-token.txt').write_text(f'github_token={pat}\n')
        result = self.run_scan()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('github-pat=', result.stderr)
        self.assert_redacted(result)

    def test_artifact_canary_is_scanned_and_redacted(self):
        artifact = self.base / 'artifact'
        artifact.mkdir()
        (artifact / 'index.html').write_text(f'<script>const api_key="{CANARY}";</script>\n')
        result = self.run_scan(artifact)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('generic-api-key=', result.stderr)
        self.assert_redacted(result)

    def test_artifact_name_cannot_shadow_current_source_path(self):
        collision = self.repo / '_pages_artifact' / 'index.html'
        collision.parent.mkdir()
        collision.write_text(f'const api_key="{CANARY}";\n')
        artifact = self.base / 'artifact'
        artifact.mkdir()
        (artifact / 'index.html').write_text('<h1>safe artifact</h1>')
        result = self.run_scan(artifact)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('generic-api-key=', result.stderr)
        self.assert_redacted(result)

    def test_shallow_repository_fails_closed(self):
        shallow = subprocess.run(['git', '-C', str(self.repo), 'rev-parse', '--git-path', 'shallow'],
                                 check=True, stdout=subprocess.PIPE, text=True).stdout.strip()
        path = Path(shallow)
        if not path.is_absolute():
            path = self.repo / path
        path.write_text('0' * 40 + '\n')
        result = self.run_scan()
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn('non-shallow repository', result.stderr)

    def test_evidence_hash_allowlist_is_contextual_and_does_not_hide_canary(self):
        evidence = self.repo / 'evidence'
        evidence.mkdir()
        digest = hashlib.sha256(b'public deterministic fixture bytes').hexdigest()
        path = evidence / 'sample.json'
        path.write_text('{\n  "src/example.js": "' + digest + '"\n}\n')
        self.commit_all('add public integrity digest fixture')
        clean = self.run_scan()
        self.assertEqual(clean.returncode, 0, clean.stdout + clean.stderr)
        self.assertIn('no findings', clean.stdout)

        path.write_text('{\n  "src/example.js": "' + digest + '",\n  "api_key": "' + CANARY + '"\n}\n')
        detected = self.run_scan()
        self.assertEqual(detected.returncode, 1, detected.stdout + detected.stderr)
        self.assertIn('generic-api-key=', detected.stderr)
        self.assert_redacted(detected)

    def test_public_indexnow_key_context_does_not_suppress_other_key(self):
        workflow = self.repo / '.github' / 'workflows' / 'release.yml'
        workflow.parent.mkdir(parents=True)
        canary = hashlib.sha256(b'IndexNow key canary').hexdigest()[:32]
        workflow.write_text('# published IndexNow endpoint key fixture\nKEY: ' + canary + '\n')
        result = self.run_scan()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('generic-api-key=', result.stderr)
        self.assert_redacted(result)


if __name__ == '__main__':
    unittest.main()
