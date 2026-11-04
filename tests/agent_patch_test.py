import importlib.util,pathlib,unittest
spec=importlib.util.spec_from_file_location('validator',pathlib.Path(__file__).resolve().parents[1]/'scripts/validate-agent-patch.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
class PatchGate(unittest.TestCase):
 def test_current_and_future_python_governance_tests_are_protected(self):
  for name in ['workflow_security_test.py','security_scan_test.py','pages_artifact_test.py','future_policy_test.py']:
   with self.subTest(name=name),self.assertRaises(ValueError):
    v.validate(f'diff --git a/tests/{name} b/tests/{name}\n--- a/tests/{name}\n+++ /dev/null\n@@ -1 +0,0 @@\n-old\n'.encode())
 def test_code_patch(self):
  self.assertTrue(v.validate(b'diff --git a/src/game/example.js b/src/game/example.js\n--- a/src/game/example.js\n+++ b/src/game/example.js\n@@ -1 +1 @@\n-old\n+new\n'))
 def test_governance_and_metadata_bypasses(self):
  for raw in [b'diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml\n',b'diff --git a/src/a.js b/src/b.js\nrename from .github/workflows/ci.yml\nrename to src/b.js\n',b'diff --git a/src/a.js b/src/a.js\nnew file mode 120000\n',b'diff --git a/src/../scripts/verify.py b/src/../scripts/verify.py\n',b'diff --git a/tests/communications.test.js b/tests/communications.test.js\n',b'']:
   with self.subTest(raw=raw),self.assertRaises(ValueError):v.validate(raw)
if __name__=='__main__':unittest.main()
