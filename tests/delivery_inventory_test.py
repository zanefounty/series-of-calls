import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/delivery-inventory.py"
spec = importlib.util.spec_from_file_location("delivery_inventory", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture_plan():
    items = [
            {"stage": n, "id": f"s{n}", "title": f"Stage {n}", "work": "work",
             "acceptance": "acceptance", "owner": "owner", "closure": "closure",
             "dependsOn": [], "families": []}
            for n in range(1, 9)
        ]
    items[0]["families"] = [{"id": "fixture-file", "sourcePrefix": "FILE"}]
    return {"items": items}


class DeliveryInventoryTests(unittest.TestCase):
    def assert_fixture_fails(self, requirements, plan, message):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.json"
            path.write_text(json.dumps({"requirements": requirements, "plan": plan}), encoding="utf-8")
            data = json.loads(path.read_text(encoding="utf-8"))
        with self.assertRaisesRegex(module.InventoryError, message):
            module.validate(data["requirements"], data["plan"])

    def test_fixture_assigns_each_requirement_once(self):
        plan = fixture_plan()
        plan["items"][0]["families"] = [{"id": "foundation", "sourcePrefix": "FILE"}]
        plan["items"][1]["families"] = [{"id": "research", "sourcePrefix": "DESIGN"}]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.json"
            path.write_text(json.dumps({"requirements": [
                {"id": "REQ-a", "sources": ["FILE:readme"]},
                {"id": "REQ-b", "sources": ["DESIGN:paragraph"]},
            ], "plan": plan}), encoding="utf-8")
            data = json.loads(path.read_text(encoding="utf-8"))
        result = module.validate(data["requirements"], data["plan"])
        self.assertEqual(result["requirements"], 2)
        self.assertEqual(result["byStage"], {1: 1, 2: 1})

    def test_omitted_family_fails(self):
        plan = fixture_plan()
        plan["items"][0]["families"] = []
        plan["items"][1]["families"] = [{"id": "unrelated", "sourcePrefix": "OTHER"}]
        self.assert_fixture_fails([{"id": "REQ-a", "sources": ["FILE:readme"]}], plan, "matched 0 families")

    def test_duplicate_overlapping_assignment_fails(self):
        plan = fixture_plan()
        plan["items"][0]["families"] = [{"id": "file-all", "sourcePrefix": "FILE"}]
        plan["items"][1]["families"] = [{"id": "file-copy", "sourcePrefix": "FILE:"}]
        self.assert_fixture_fails([{"id": "REQ-a", "sources": ["FILE:readme"]}], plan, "matched 2 families")

    def test_unresolved_source_fails(self):
        plan = fixture_plan()
        plan["items"][0]["families"] = [{"id": "known", "sourcePrefix": "FILE"}]
        self.assert_fixture_fails([{"id": "REQ-a", "sources": ["UNKNOWN:thing"]}], plan, "matched 0 families")

    def test_multiple_sources_fail_closed(self):
        plan = fixture_plan()
        self.assert_fixture_fails([{"id": "REQ-a", "sources": ["FILE:a", "FILE:b"]}], plan,
                                  "expected exactly one source")

    def test_duplicate_requirement_ids_fail(self):
        plan = fixture_plan()
        self.assert_fixture_fails([{"id": "REQ-a", "sources": ["FILE:a"]},
                                   {"id": "REQ-a", "sources": ["FILE:b"]}], plan,
                                  "duplicate or missing requirement IDs")

    def test_unresolved_tracker_path_fails(self):
        plan = fixture_plan()
        plan["sourceReferences"] = ["missing/register.json"]
        plan["archiveQueue"] = {"source": "research/archive-gameplay"}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "research/archive-gameplay").mkdir(parents=True)
            with self.assertRaisesRegex(module.InventoryError, "tracker path is missing"):
                module.validate([], plan, root)

    def test_stage_dependency_cycle_fails(self):
        plan = fixture_plan()
        plan["items"][0]["dependsOn"] = ["s2"]
        plan["items"][1]["dependsOn"] = ["s1"]
        with self.assertRaisesRegex(module.InventoryError, "dependency cycle"):
            module.validate([], plan)

    def test_reference_review_counts_use_canonical_reviews_not_fetch_observations(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_registers(root, references=[
                {"id": "REF-a", "acceptedReview": None},
                {"id": "REF-b", "acceptedReview": None},
                {"id": "REF-c", "acceptedReview": {"reviewer": "not-authoritative"}},
            ], reviews=[{"review": "REV-a", "reference": "REF-a", "acceptedAt": "2026-01-01"}])
            observed = root / "maintenance/reference-check.json"
            observed.parent.mkdir(parents=True, exist_ok=True)
            observed.write_text(json.dumps({"observations": [{"id": "REF-b", "acceptedReview": True}]}), encoding="utf-8")
            counts = module.register_counts(root)
        self.assertEqual(counts["references"], 3)
        self.assertEqual(counts["acceptedReferences"], 1)
        self.assertEqual(counts["pendingReferences"], 2)

    def test_inventory_counts_follow_register_sizes_not_fixed_constants(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_registers(root,
                records=[{}, {}, {}], files=[{}], clauses=[{}, {}],
                source_items=[{}, {}, {}, {}], requirements=[{}, {}],
                references=[{"id": "REF-a", "acceptedReview": None}],
                archive_cases=[{}], commits=[{}, {}], file_versions=[{}],
                dispositions={"one": {}, "two": {}})
            counts = module.register_counts(root)
        self.assertEqual(counts["mappingRecords"], 3)
        self.assertEqual(counts["fileRecords"], 1)
        self.assertEqual(counts["clauses"], 2)
        self.assertEqual(counts["sourceItems"], 4)
        self.assertEqual(counts["requirements"], 2)
        self.assertEqual(counts["archiveCases"], 1)
        self.assertEqual(counts["commits"], 2)
        self.assertEqual(counts["fileVersions"], 1)
        self.assertEqual(counts["dispositions"], 2)

    @staticmethod
    def write_registers(root, *, records=None, files=None, clauses=None,
                        source_items=None, requirements=None, references=None,
                        reviews=None, archive_cases=None, commits=None, file_versions=None,
                        dispositions=None):
        values = {
            "spec/audit/mapping-review.json": {"records": records or [], "files": files or [], "clauses": clauses or []},
            "spec/generated/source-items.json": source_items or [],
            "spec/generated/requirements.json": requirements or [],
            "research/generated/references.json": references or [],
            "research/reviews.json": reviews or [],
            "research/archive-gameplay/catalogue.json": {"cases": archive_cases or []},
            "maintenance/upstream/register.json": {"commits": commits or [], "fileVersions": file_versions or []},
            "spec/dispositions.json": dispositions or {},
        }
        for relative, value in values.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(value), encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
