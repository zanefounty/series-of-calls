#!/usr/bin/env python3
"""Read-only validation and report for the full-scope delivery index."""
from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]


class InventoryError(ValueError):
    pass


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(requirements, plan, root: Path | None = None):
    items = plan.get("items", [])
    if len(items) != 8 or {i.get("stage") for i in items} != set(range(1, 9)):
        raise InventoryError("delivery index must preserve stages 1 through 8 exactly once")
    stage_ids = {i.get("id") for i in items}
    if len(stage_ids) != 8 or None in stage_ids:
        raise InventoryError("stage IDs must be present and unique")
    families = {}
    stage_by_id = {item["id"]: item for item in items}
    for item in items:
        if not all(item.get(k) for k in ("title", "work", "acceptance", "owner", "closure")):
            raise InventoryError(f"stage {item['stage']} is missing work, acceptance, owner, or closure")
        dependencies = item.get("dependsOn", [])
        if not isinstance(dependencies, list):
            raise InventoryError(f"stage {item['stage']} dependencies must be a list")
        for dep in dependencies:
            if dep not in stage_ids or dep == item["id"]:
                raise InventoryError(f"stage {item['stage']} has unresolved dependency {dep!r}")
        for family in item.get("families", []):
            fid, prefix = family.get("id"), family.get("sourcePrefix")
            if not fid or not prefix:
                raise InventoryError(f"stage {item['stage']} has unresolved family or sourcePrefix")
            if fid in families:
                raise InventoryError(f"duplicate family assignment {fid}")
            families[fid] = (item["stage"], prefix)
    if not families:
        raise InventoryError("no requirement assignment families are configured")

    visiting, visited = set(), set()
    def visit(stage_id):
        if stage_id in visiting:
            raise InventoryError(f"stage dependency cycle includes {stage_id}")
        if stage_id in visited:
            return
        visiting.add(stage_id)
        for dependency in stage_by_id[stage_id].get("dependsOn", []):
            visit(dependency)
        visiting.remove(stage_id)
        visited.add(stage_id)
    for stage_id in stage_ids:
        visit(stage_id)

    if root is not None:
        declared = plan.get("sourceReferences", [])
        if not isinstance(declared, list):
            raise InventoryError("sourceReferences must be a list of repository paths")
        paths = [(path, False) for path in declared]
        archive_queue = plan.get("archiveQueue")
        archive = archive_queue.get("source") if isinstance(archive_queue, dict) else None
        if not archive:
            raise InventoryError("archiveQueue must declare an existing source directory")
        paths.append((archive, True))
        for value, directory in paths:
            if not isinstance(value, str) or not value:
                raise InventoryError(f"invalid tracker path {value!r}")
            path = (root / value).resolve()
            if not path.is_relative_to(root.resolve()) or not (path.is_dir() if directory else path.is_file()):
                raise InventoryError(f"tracker path is missing or invalid: {value}")

    assignments = collections.defaultdict(list)
    unresolved = []
    invalid = []
    seen_requirement_ids = set()
    for req in requirements:
        rid = req.get("id")
        if not rid or rid in seen_requirement_ids:
            invalid.append(rid or "<missing requirement id>")
            continue
        seen_requirement_ids.add(rid)
        sources = req.get("sources")
        if not isinstance(sources, list) or len(sources) != 1:
            unresolved.append(f"{rid}: expected exactly one source; got {sources!r}")
            continue
        source = sources[0]
        matches = [(fid, stage) for fid, (stage, prefix) in families.items() if source.startswith(prefix)]
        if len(matches) != 1:
            unresolved.append(f"{rid}: source {source!r} matched {len(matches)} families")
        else:
            fid, stage = matches[0]
            assignments[rid].append((stage, fid))
    if invalid:
        raise InventoryError("duplicate or missing requirement IDs: " + ", ".join(invalid[:10]))
    if unresolved:
        raise InventoryError("unresolved requirement assignments: " + "; ".join(unresolved[:10]))
    duplicate = {rid: places for rid, places in assignments.items() if len(places) != 1}
    if duplicate:
        raise InventoryError(f"duplicate requirement assignment(s): {list(duplicate)[:10]}")
    if len(assignments) != len(requirements):
        raise InventoryError(f"assigned {len(assignments)} of {len(requirements)} requirements")
    by_stage = collections.Counter(stage for places in assignments.values() for stage, _ in places)
    by_family = collections.Counter(fid for places in assignments.values() for _, fid in places)
    return {"requirements": len(requirements), "byStage": dict(sorted(by_stage.items())),
            "byFamily": dict(sorted(by_family.items())), "assignments": assignments}


def count_rows(value, *keys):
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key)
        else:
            return None
    return len(value) if isinstance(value, (list, dict)) else value if isinstance(value, int) else None


def register_counts(root: Path):
    mapping = load(root / "spec/audit/mapping-review.json")
    source_items = load(root / "spec/generated/source-items.json")
    requirements = load(root / "spec/generated/requirements.json")
    references = load(root / "research/generated/references.json")
    archive = load(root / "research/archive-gameplay/catalogue.json")
    upstream = load(root / "maintenance/upstream/register.json")
    dispositions = load(root / "spec/dispositions.json")
    ref_rows = references.get("references", references) if isinstance(references, dict) else references
    if not all(isinstance(rows, list) for rows in (source_items, requirements, ref_rows)):
        raise InventoryError("canonical source, requirement, or reference register has an invalid shape")
    reviews = load(root / "research/reviews.json")
    if not isinstance(reviews, list):
        raise InventoryError("canonical research review register has an invalid shape")
    # Match the release freshness gate: an actual canonical review keyed by
    # reference with acceptedAt is authoritative. Reference fetch observations
    # intentionally do not grant acceptance.
    reviews_by_reference = {row.get("reference"): row for row in reviews if isinstance(row, dict)}
    accepted = sum(1 for row in ref_rows
                   if row.get("id") in reviews_by_reference
                   and reviews_by_reference[row.get("id")].get("acceptedAt"))
    return {
        "mappingRecords": count_rows(mapping, "records"),
        "fileRecords": count_rows(mapping, "files"),
        "clauses": count_rows(mapping, "clauses"),
        "sourceItems": len(source_items),
        "requirements": len(requirements),
        "references": len(ref_rows),
        "acceptedReferences": accepted,
        "pendingReferences": len(ref_rows) - accepted,
        "archiveCases": count_rows(archive, "cases"),
        "commits": count_rows(upstream, "commits"),
        "fileVersions": count_rows(upstream, "fileVersions"),
        "dispositions": len(dispositions) if isinstance(dispositions, (list, dict)) else None,
    }


def summary(root: Path, report):
    counts = register_counts(root)
    status = collections.Counter(r.get("status", "unresolved") for r in load(root / "spec/generated/requirements.json"))
    print(f"Validated assignment: {report['requirements']} requirements across {len(report['byFamily'])} families and 8 stages.")
    print("Requirement status snapshot (not completion): " + ", ".join(f"{k}={v}" for k, v in sorted(status.items())))
    print(f"Structural/source counts: mappings={counts['mappingRecords']}; files={counts['fileRecords']}; clauses={counts['clauses']}; source items={counts['sourceItems']}; requirements={counts['requirements']}.")
    print(f"Upstream accounting: {counts['commits']} commits, {counts['fileVersions']} historical file versions.")
    print(f"Reference register: {counts['references']} entries, {counts['acceptedReferences']} with a canonical accepted review, {counts['pendingReferences']} without one.")
    print(f"Disposition register records: {counts['dispositions']}; archive proposals: {counts['archiveCases']}, outside core.")
    print("No implementation completion, disposition, legal approval, provider certification, or release readiness is inferred.")
    for item in load(root / "maintenance/next-work.json")["items"]:
        print(f"Stage {item['stage']} {item['id']}: {item['title']} ({report['byStage'].get(item['stage'], 0)} requirements)")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="validate and report; read-only")
    parser.add_argument("--root", type=Path, default=ROOT, help=argparse.SUPPRESS)
    args = parser.parse_args()
    try:
        root = args.root
        report = validate(load(root / "spec/generated/requirements.json"), load(root / "maintenance/next-work.json"), root)
        if args.check:
            summary(root, report)
        else:
            parser.error("select --check")
    except (OSError, json.JSONDecodeError, InventoryError, KeyError, TypeError) as exc:
        print(f"delivery inventory: FAIL: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
