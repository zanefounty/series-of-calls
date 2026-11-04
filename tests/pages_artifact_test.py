import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('check_pages_artifact', ROOT / 'scripts' / 'check-pages-artifact.py')
CHECK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECK)


class PagesArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='soc-pages-artifact-')
        self.base = Path(self.temp.name)
        self.artifact = self.base / 'built'
        self.artifact.mkdir()
        env = os.environ.copy()
        env['OUT'] = str(self.artifact)
        subprocess.run(['node', 'scripts/build.js'], cwd=ROOT, env=env, check=True, capture_output=True, text=True)

    def tearDown(self):
        self.temp.cleanup()

    def copy_artifact(self, name='copy'):
        destination = self.base / name
        shutil.copytree(self.artifact, destination)
        return destination

    def test_actual_build_matches_exact_47_file_manifest_and_notices(self):
        self.assertEqual(len(CHECK.load_manifest(CHECK.MANIFEST)), 47)
        self.assertEqual(CHECK.validate(self.artifact), {'files': 47, 'bytes': sum(p.stat().st_size for p in self.artifact.rglob('*') if p.is_file())})

    def test_rejects_injected_hidden_environment_file(self):
        artifact = self.copy_artifact()
        (artifact / '.env').write_text('SENTINEL=synthetic\n')
        with self.assertRaisesRegex(ValueError, 'Unexpected Pages artifact file'):
            CHECK.validate(artifact)

    def test_rejects_missing_allowlisted_file(self):
        artifact = self.copy_artifact()
        (artifact / 'robots.txt').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing Pages artifact files'):
            CHECK.validate(artifact)

    def test_rejects_symlink_at_allowlisted_path(self):
        artifact = self.copy_artifact()
        target = self.base / 'linked-favicon.svg'
        target.write_text('<svg/>')
        link = artifact / 'favicon.svg'
        link.unlink()
        link.symlink_to(target)
        with self.assertRaisesRegex(ValueError, 'not a regular file'):
            CHECK.validate(artifact)

    def test_rejects_hard_linked_artifact_file(self):
        artifact = self.copy_artifact()
        os.link(artifact / 'LICENSE', self.base / 'outside-hard-link')
        with self.assertRaisesRegex(ValueError, 'multiple hard links'):
            CHECK.validate(artifact)

    def test_rejects_changed_distribution_notice_bytes(self):
        artifact = self.copy_artifact()
        with (artifact / 'NOTICE').open('ab') as notice:
            notice.write(b'\nsynthetic mutation')
        with self.assertRaisesRegex(ValueError, 'differs from repository bytes'):
            CHECK.validate(artifact)

    def test_rejects_oversized_file_before_reading_it(self):
        artifact = self.copy_artifact()
        with (artifact / 'llms.txt').open('r+b') as file:
            file.truncate(CHECK.MAX_FILE_BYTES + 1)
        with self.assertRaisesRegex(ValueError, 'exceeds 100000000 bytes'):
            CHECK.validate(artifact)

    def test_rejects_manifest_traversal_and_duplicate_paths(self):
        original = json.loads(CHECK.MANIFEST.read_text())
        for injected, expected_error in [
            ('../outside', 'Unsafe Pages manifest path'),
            ('index.html', 'Duplicate Pages manifest path'),
            ('credentials.json', 'private or server-side path'),
            ('web.config', 'private or server-side path'),
        ]:
            with self.subTest(injected=injected):
                data = dict(original)
                data['files'] = list(original['files']) + [injected]
                manifest = self.base / 'bad-manifest.json'
                manifest.write_text(json.dumps(data))
                with self.assertRaisesRegex(ValueError, expected_error):
                    CHECK.validate(self.artifact, manifest=manifest)


if __name__ == '__main__':
    unittest.main()
