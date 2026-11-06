"""CI keeps every JavaScript test in eight independently required, complete shards."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CiWorkflowContract(unittest.TestCase):
    def test_eight_complete_test_parts_and_build_remain_required(self):
        source = (ROOT / '.github/workflows/ci.yml').read_text()
        jobs = dict(re.findall(r'^  (\w+):\n(.*?)(?=^  \w+:\n|\Z)', source, re.M | re.S))
        part, build, aggregate = jobs['part'], jobs['build'], jobs['test']
        self.assertIn('part: [1, 2, 3, 4, 5, 6, 7, 8]', part)
        self.assertIn('name: test ${{ matrix.part }}/8', part)
        self.assertIn('npm test -- --shard ${{ matrix.part }}/8', part)
        self.assertIn('fail-fast: false', part)
        self.assertIn('timeout-minutes: 20', part)
        self.assertIn('node-version: 24', part)
        self.assertIn('npm ci', part)
        self.assertIn('needs: [part, build, translations]', aggregate)
        self.assertIn('needs.build.result', aggregate)
        self.assertIn('needs.translations.result', aggregate)
        self.assertNotIn('continue-on-error:', part + build + aggregate)
        self.assertNotIn('always()', part + build)


if __name__ == '__main__':
    unittest.main(verbosity=2)
