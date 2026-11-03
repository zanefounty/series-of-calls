import importlib.util
from pathlib import Path
import tomllib
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('soc_user_config', HERE/'prepare-user-config.py')
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)

class Setup(unittest.TestCase):
    def test_preferences_and_unrelated_credentials_survive(self):
        for preference in [True, False]:
            source = 'analytics_enabled = '+str(preference).lower()+'\nmodel = "owner-choice"\n[example]\ncredential = "synthetic-sentinel"\n'
            result, actions = migration.migrate(source, '/tmp/soc-project')
            value = tomllib.loads(result)
            self.assertEqual(value['analytics']['enabled'], preference)
            self.assertEqual(value['model'], 'owner-choice')
            self.assertEqual(value['example']['credential'], 'synthetic-sentinel')
            self.assertEqual(len(actions), 2)

    def test_repeat_is_noop(self):
        result, _ = migration.migrate('analytics_enabled = false\n', '/tmp/soc-project')
        self.assertEqual(migration.migrate(result, '/tmp/soc-project'), (result, []))

    def test_existing_modern_same_preference_is_preserved(self):
        result, _ = migration.migrate('analytics_enabled = false\n[analytics]\nenabled = false\n', '/tmp/soc-project')
        self.assertFalse(tomllib.loads(result)['analytics']['enabled'])
        self.assertNotIn('analytics_enabled', tomllib.loads(result))

    def test_conflicting_preferences_are_not_overwritten(self):
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            migration.migrate('analytics_enabled = true\n[analytics]\nenabled = false\n', '/tmp/soc-project')

    def test_explicit_untrusted_decision_is_not_overwritten(self):
        with self.assertRaisesRegex(ValueError, 'trust decision'):
            migration.migrate('[projects."/tmp/soc-project"]\ntrust_level="untrusted"\n', '/tmp/soc-project')

    def test_malformed_legacy_value_is_not_guessed(self):
        with self.assertRaisesRegex(ValueError, 'boolean'):
            migration.migrate('analytics_enabled = "yes"\n', '/tmp/soc-project')

    def test_quoted_project_path_roundtrips(self):
        path = '/tmp/project "with" spaces'
        result, _ = migration.migrate('', path)
        self.assertEqual(tomllib.loads(result)['projects'][path]['trust_level'], 'trusted')

    def test_stdio_paths_resolve_to_real_repository_entrypoints(self):
        root = HERE.parents[1]
        config_dir = root/'.codex'
        config = tomllib.loads((config_dir/'config.toml').read_text())
        for name in ['series-of-calls', 'series-of-calls-sp']:
            server = config['mcp_servers'][name]
            cwd = (config_dir/server['cwd']).resolve()
            self.assertEqual(cwd, root)
            self.assertTrue((cwd/server['args'][0]).is_file())
        self.assertNotIn('sandbox_mode', config)
        self.assertNotIn('default_permissions', config)
        self.assertNotIn('approval_policy', config)

if __name__ == '__main__':
    unittest.main()
