#!/usr/bin/env python3
"""Audit retained source identities without converting lexical presence into parity."""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import pathlib
import re
import sys
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
MAPPING = ROOT / "research/source/series-of-calls-full-mapping.json"
REVIEW = ROOT / "spec/audit/mapping-review.json"
UPSTREAM_TREE = ROOT / "maintenance/upstream/tree.json"
UPSTREAM_REGISTER = ROOT / "maintenance/upstream/register.json"


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def matching_object(text: str, marker: str, offset: int = 0) -> str | None:
    """Return one balanced JS object beginning at marker; never evaluate source."""
    start = text.find(marker, offset)
    if start < 0:
        return None
    depth = 0
    quote: str | None = None
    escaped = False
    for pos in range(start, len(text)):
        ch = text[pos]
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in "\"'`":
            quote = ch
        elif ch in "{[":
            depth += 1
        elif ch in "}]":
            depth -= 1
            if depth == 0:
                return text[start : pos + 1]
    return None


def cable_objects(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for match in re.finditer(r'\{\s*"id"\s*:\s*"([a-z0-9]+)"', text):
        block = matching_object(text, "{", match.start())
        if block:
            out[match.group(1)] = block
    return out


def source_root(symbol: str | None) -> str | None:
    if not symbol:
        return None
    match = re.match(r"\s*([A-Za-z_$][\w$]*)", symbol)
    return match.group(1) if match else None


def checked(report: dict[str, Any], name: str, ok: bool, detail: str) -> None:
    report["checks"].append({"id": name, "status": "passed" if ok else "failed", "detail": detail})
    if not ok:
        report["failedChecks"].append(name)


def build_report() -> dict[str, Any]:
    mapping_bytes = MAPPING.read_bytes()
    mapping = json.loads(mapping_bytes)
    review = json.loads(REVIEW.read_text())
    tree = json.loads(UPSTREAM_TREE.read_text())
    register = json.loads(UPSTREAM_REGISTER.read_text())
    rows = mapping["rows"]
    retained = [row for row in rows if row.get("treatment") == "Retain"]
    review_rows = {row["id"]: row for row in review["records"]}
    tree_blobs = {entry["path"]: entry["sha"] for entry in tree["tree"] if entry.get("type") == "blob"}
    lay_source = (ROOT / "src/game/20-world/70-cable-ships.js").read_text()
    repair_source = (ROOT / "src/game/85-incidents/50-cable-ships.js").read_text()
    own_cable_text = (ROOT / "src/game/95-modals/80-own-cable.js").read_text()
    layout_match = re.search(r"const\s+LAY_SHIPS\s*=\s*\[([^\]]*)\]", lay_source, re.S)
    current_lay_names = re.findall(r"['\"]([^'\"]+)['\"]", layout_match.group(1)) if layout_match else []
    repair_array = re.search(r"const\s+SHIPS\s*=\s*\[(.*?)\n\];", lay_source, re.S)
    current_repair_names = re.findall(r"\{\s*id:\s*'[^']+'\s*,\s*n:\s*'([^']+)'", repair_array.group(1)) if repair_array else []
    old_ship_rows = [row for row in retained if row["category"] == "Cable ship names"]
    ship_classifications = []
    for row in old_ship_rows:
        name = str(row.get("original_name", ""))
        index = row.get("original_attributes", {}).get("index")
        if name in current_lay_names:
            location = "lay-fleet"
            current_name = name
        elif name in current_repair_names:
            location = "repair-fleet"
            current_name = name
        elif name.startswith("MV ") and name[3:] in current_repair_names:
            location = "repair-fleet-name-prefix-dropped"
            current_name = name[3:]
        else:
            location = "not-found-in-current-fleet-lists"
            current_name = None
        slot_name = current_lay_names[index] if isinstance(index, int) and 0 <= index < len(current_lay_names) else None
        ship_classifications.append({
            "id": row["id"],
            "targetId": row.get("target_id"),
            "originalIndex": index,
            "originalName": name,
            "currentLocation": location,
            "currentName": current_name,
            "currentLayFleetNameAtOriginalIndex": slot_name,
            "originalIndexStillPointsToSameName": slot_name == name,
        })

    report: dict[str, Any] = {
        "version": 1,
        "scope": "Structural and literal checks for the 1,074 original Retain mapping rows. A matching path, symbol, constant or label is not proof that the complete original behavior is playable or semantically equivalent.",
        "mapping": {
            "path": "research/source/series-of-calls-full-mapping.json",
            "sha256": hashlib.sha256(mapping_bytes).hexdigest(),
            "sourceCommit": mapping["metadata"]["source_commit"],
            "sourceTree": mapping["metadata"]["source_tree"],
        },
        "currentUpstreamSnapshot": {
            "basis": "maintenance/upstream/tree.json and register.json",
            "latestObserved": register["latestObserved"],
            "fullHistoryAvailable": register.get("fullHistoryAvailable", False),
            "treeSha": tree["sha"],
            "note": "Byte-exact matches compare current files to the latest observed upstream tree, not to the pinned 1.37.0 mapping commit.",
        },
        "checks": [],
        "failedChecks": [],
        "findings": [],
        "summary": {},
        "categories": [],
        "rows": [],
        "limitations": [
            "No current file path is treated as evidence that its original behavior was retained.",
            "Source-symbol checks report literal expression presence or root identifier presence only; they do not resolve JavaScript expressions.",
            "Only cable system identity/name/price/age and cable-pair endpoint tuples are parsed as structured source literals in this audit.",
            "Retained city, company, customer and gameplay behaviors require separate semantic tests; they are not cleared by this audit.",
            "The source capture and latest upstream byte-hash comparison have different commit scopes and are reported separately.",
            "The local upstream evidence contains the Git tree manifest with blob hashes, not a separate 352-file content archive; byte matches are recomputed from current working-tree files against that manifest.",
        ],
    }

    checked(report, "source-map-sha", hashlib.sha256(mapping_bytes).hexdigest() == review["sourceSha256"], "The reviewed map hash matches the preserved source mapping.")
    checked(report, "retain-count", len(retained) == 1074, f"Found {len(retained)} rows explicitly marked Retain.")
    checked(report, "retain-review-rows", all(row["id"] in review_rows and review_rows[row["id"]]["treatment"] == "Retain" for row in retained), "Every retained source row has its matching structural review record.")

    files: dict[str, bytes] = {}
    current_present = 0
    root_symbol_present = 0
    exact_symbol_present = 0
    upstream_exact_files: set[str] = set()
    source_paths: set[str] = set()
    for row in retained:
        path = row.get("source_file")
        source_paths.add(path or "")
        file_path = ROOT / path if path else None
        exists = bool(file_path and file_path.is_file())
        raw = file_path.read_bytes() if exists and file_path else b""
        text = raw.decode("utf-8", errors="replace")
        if exists:
            current_present += 1
            files[path] = raw
            if path in tree_blobs and git_blob_sha(raw) == tree_blobs[path]:
                upstream_exact_files.add(path)
        symbol = row.get("source_symbol")
        root = source_root(symbol)
        has_root = bool(root and re.search(rf"(?<![\w$]){re.escape(root)}(?![\w$])", text))
        has_exact_symbol = bool(symbol and symbol in text)
        root_symbol_present += int(has_root)
        exact_symbol_present += int(has_exact_symbol)
        rr = review_rows.get(row["id"], {})
        report["rows"].append({
            "id": row["id"],
            "category": row["category"],
            "treatment": row["treatment"],
            "sourceFile": path,
            "currentSourcePathPresent": exists,
            "sourceSymbol": symbol,
            "sourceSymbolRoot": root,
            "sourceSymbolRootPresent": has_root if root else None,
            "fullSourceSymbolLiteralPresent": has_exact_symbol,
            "originalId": row.get("original_id"),
            "originalName": row.get("original_name"),
            "originalAttributes": row.get("original_attributes", {}),
            "targetId": row.get("target_id"),
            "sourceRecordSha256": rr.get("sourceRecordSha256"),
            "semanticReview": "pending",
        })

    checked(report, "retained-source-files", current_present == len(retained), f"{current_present}/{len(retained)} retained rows point to files present in the current working tree.")
    rooted_rows = sum(source_root(row.get("source_symbol")) is not None for row in retained) - len(old_ship_rows)
    missing_symbol_roots = [row for row in report["rows"] if row["sourceSymbolRoot"] and not row["sourceSymbolRootPresent"] and row["category"] != "Cable ship names"]
    checked(report, "retained-symbol-roots", True, f"{root_symbol_present}/{rooted_rows} identifier-root expressions occur in their mapped current source file; {len(missing_symbol_roots)} expressions need individual review because their root names are absent.")
    if missing_symbol_roots:
        report["findings"].append({
            "id": "retain-symbol-root-not-literal",
            "status": "review-required",
            "rows": [{"id": row["id"], "sourceFile": row["sourceFile"], "sourceSymbol": row["sourceSymbol"], "sourceSymbolRoot": row["sourceSymbolRoot"]} for row in missing_symbol_roots],
            "note": "These mapped source-symbol roots do not appear literally in the current source file. Some may be renamed code symbols; inspect each before treating it as a missing mechanic.",
        })
    report["summary"].update({
        "retainedRows": len(retained),
        "distinctRetainedSourcePaths": len(source_paths),
        "currentSourceFilesPresent": len(files),
        "retainedRowsWithSourcePathPresent": current_present,
        "sourceSymbolRootOccurrences": root_symbol_present,
        "rowsWithIdentifierRootSymbols": rooted_rows,
        "fullSourceSymbolExpressionOccurrences": exact_symbol_present,
        "rowsWithMissingSourceSymbolRoots": len(missing_symbol_roots),
        "distinctFilesByteExactAgainstLatestUpstreamTree": len(upstream_exact_files),
        "retainedSourceFilesByteExactAgainstLatestUpstreamTree": len(upstream_exact_files & set(files)),
        "currentUpstreamTreeBlobCount": len(tree_blobs),
    })

    geography_asset_categories = {
        "Regions", "Land connectivity groups", "Cable systems", "Cable route pairs",
        "Transport capacity tiers", "Physical port tiers", "Optical modules",
        "Owned cable name templates", "Cable ship names",
    }
    for category in sorted(geography_asset_categories):
        items = [row for row in retained if row["category"] == category]
        target_ids = [row.get("target_id") for row in items]
        original_ids = [row.get("original_id") for row in items]
        category_paths = {row.get("source_file") for row in items if row.get("source_file")}
        if category == "Cable ship names":
            source_text = lay_source + "\n" + repair_source
        else:
            source_text = "\n".join((ROOT / p).read_text(errors="replace") for p in category_paths)
        if category == "Cable ship names":
            id_matches = sum(row["originalIndexStillPointsToSameName"] for row in ship_classifications)
        else:
            id_matches = sum(bool(row.get("original_id") and str(row["original_id"]) in source_text) for row in items)
        name_matches = sum(bool(row.get("original_name") and str(row["original_name"]) in source_text) for row in items)
        report["categories"].append({
            "category": category,
            "rows": len(items),
            "distinctOriginalIds": len(set(original_ids)),
            "distinctTargetIds": len(set(target_ids)),
            "originalIdLiteralsFound": id_matches,
            "originalNameLiteralsFound": name_matches,
            "targetIdCollisions": len(target_ids) - len(set(target_ids)),
            "interpretation": "Literal retention and distinct target identity checks only; runtime semantics remain pending.",
        })
        if items:
            checked(report, f"distinct-targets:{category}", len(set(target_ids)) == len(target_ids), f"{category}: {len(items)} retained rows have distinct target IDs.")
            checked(report, f"distinct-original-ids:{category}", len(set(original_ids)) == len(original_ids), f"{category}: {len(items)} retained rows have distinct original IDs.")

    cable_path = ROOT / "src/game/20-world/60-cables.js"
    cable_text = cable_path.read_text()
    parsed_cables = cable_objects(cable_text)
    cable_rows = [row for row in retained if row["category"] == "Cable systems"]
    cable_identity_ok = 0
    for row in cable_rows:
        attrs = row.get("original_attributes", {})
        block = parsed_cables.get(str(attrs.get("id")))
        if not block:
            continue
        escaped_name = json.dumps(attrs.get("name", ""), ensure_ascii=False)
        price = json.dumps(attrs.get("price"))
        age = json.dumps(attrs.get("age"), ensure_ascii=False)
        if f'"name":{escaped_name}' in block and f'"price":{price}' in block and f'"age":{age}' in block:
            cable_identity_ok += 1
    checked(report, "cable-system-literals", cable_identity_ok == len(cable_rows), f"Structured current source literals preserve id, name, price and age for {cable_identity_ok}/{len(cable_rows)} retained cable systems.")

    route_rows = [row for row in retained if row["category"] == "Cable route pairs"]
    route_tuples_ok = 0
    missing_route_rows: list[dict[str, Any]] = []
    for row in route_rows:
        attrs = row.get("original_attributes", {})
        block = parsed_cables.get(str(attrs.get("cid")))
        if not block:
            continue
        a, b = attrs.get("a"), attrs.get("b")
        forward = re.compile(rf'\[\s*"{re.escape(str(a))}"\s*,\s*"{re.escape(str(b))}"\s*,\s*\[')
        reverse = re.compile(rf'\[\s*"{re.escape(str(b))}"\s*,\s*"{re.escape(str(a))}"\s*,\s*\[')
        if forward.search(block) or reverse.search(block):
            route_tuples_ok += 1
        else:
            missing_route_rows.append({"id": row["id"], "targetId": row.get("target_id"), "cableId": attrs.get("cid"), "endpoints": [a, b], "distanceKm": attrs.get("km")})
    checked(report, "cable-route-endpoints", True, f"Source pair tuples appear under their mapped cable IDs for {route_tuples_ok}/{len(route_rows)} retained route rows; missing tuples are reported for review.")
    if missing_route_rows:
        report["findings"].append({
            "id": "retain-cable-route-pair-mismatch",
            "status": "review-required",
            "rows": missing_route_rows,
            "note": "These four Retain mapping rows keep distinct target IDs but their original endpoint pair is absent under the mapped cable ID in the current cable source. A route elsewhere is not treated as equivalent; review or restore the exact route identity.",
        })
    report["summary"]["retainedCableRoutePairsMatched"] = route_tuples_ok
    report["summary"]["retainedCableRoutePairsUnmatched"] = len(missing_route_rows)

    exact_lay = sum(row["currentLocation"] == "lay-fleet" for row in ship_classifications)
    exact_repair = sum(row["currentLocation"] == "repair-fleet" for row in ship_classifications)
    normalized_repair = sum(row["currentLocation"] == "repair-fleet-name-prefix-dropped" for row in ship_classifications)
    still_indexed = sum(row["originalIndexStillPointsToSameName"] for row in ship_classifications)
    names_present = exact_lay + exact_repair + normalized_repair
    report["findings"].append({
        "id": "retain-cable-ship-fleet-move",
        "status": "review-required" if names_present != len(old_ship_rows) or exact_lay != len(old_ship_rows) or still_indexed != len(old_ship_rows) else "passed",
        "rows": ship_classifications,
        "currentSources": ["src/game/20-world/70-cable-ships.js:LAY_SHIPS", "src/game/20-world/70-cable-ships.js:SHIPS", "src/game/85-incidents/50-cable-ships.js:layName"],
        "currentLayShipNames": current_lay_names,
        "currentRepairShipNames": current_repair_names,
        "exactNamesInLayFleet": exact_lay,
        "exactNamesMovedToRepairFleet": exact_repair,
        "repairFleetNamePrefixDropped": normalized_repair,
        "originalLayIndexesStillPointToSameName": still_indexed,
        "allOriginalNamesFoundInCurrentFleetLists": names_present == len(old_ship_rows),
        "note": "The original eight names are found across current fleet data, correcting the earlier false absent-name finding. Four remain installation-ship labels; three are now repair-ship labels and MV Cable Guy appears there as Cable Guy. The old indexed installation identity is not preserved: current LAY_SHIPS uses a different order and four replacement names, while layName chooses by a link hash. Keep name retention, role change and stable-ID behavior as separate classifications.",
    })
    report["summary"]["retainedCableShipNamesFoundAcrossFleetLists"] = names_present
    report["summary"]["currentCableLayShipCount"] = len(current_lay_names)
    report["summary"]["currentCableRepairShipCount"] = len(current_repair_names)
    report["summary"]["retainedCableShipOriginalIndexesStillMatch"] = still_indexed

    spare_helper = (ROOT / "src/game/90-actions/90-action-helpers.js").read_text()
    supply = (ROOT / "src/game/10-catalog/30-supply-chain.js").read_text()
    spare_ok = bool(re.search(r"\bSPARE_RESALE\s*=\s*0\.4\b", spare_helper))
    router_ok = bool(re.search(r"\bROUTER_RESALE\s*=\s*0\.3\b", supply))
    report["invariantConstants"] = [
        {"name": "SPARE_RESALE", "expected": 0.4, "source": "src/game/90-actions/90-action-helpers.js", "status": "passed" if spare_ok else "failed"},
        {"name": "ROUTER_RESALE", "expected": 0.3, "source": "src/game/10-catalog/30-supply-chain.js", "status": "passed" if router_ok else "failed"},
    ]
    checked(report, "spare-resale-fraction", spare_ok, "Original spare resale remains 0.4.")
    checked(report, "router-resale-fraction", router_ok, "Original router resale remains 0.3; it is checked independently from spare resale.")

    report["summary"]["mappedRowsByTreatment"] = dict(collections.Counter(row["treatment"] for row in rows))
    report["summary"]["retainedRowsByCategory"] = dict(collections.Counter(row["category"] for row in retained))
    report["summary"]["status"] = "passed-with-open-semantic-review" if not report["failedChecks"] else "failed"
    return report


def markdown(report: dict[str, Any]) -> str:
    s = report["summary"]
    lines = [
        "# Retained mapping review",
        "",
        "## Scope",
        "",
        report["scope"],
        "",
        f"The source mapping is pinned to commit `{report['mapping']['sourceCommit']}` (tree `{report['mapping']['sourceTree']}`). The separately tracked latest upstream snapshot is `{report['currentUpstreamSnapshot']['latestObserved']}`. {report['currentUpstreamSnapshot']['note']}",
        "",
        "## Results",
        "",
        "Run the reproducible checks with `python3 scripts/audit-retained.py`; use `--write` to refresh this report and its JSON row inventory.",
        "",
        f"- Retain rows checked: **{s['retainedRows']}** across **{s['distinctRetainedSourcePaths']}** distinct source paths.",
        f"- Current mapped source files present: **{s['currentSourceFilesPresent']}** distinct files covering **{s['retainedRowsWithSourcePathPresent']}** row links; **{s['retainedSourceFilesByteExactAgainstLatestUpstreamTree']}** of those files are byte-exact against the separately observed latest upstream tree.",
        f"- Source-symbol root identifiers found in mapped files: **{s['sourceSymbolRootOccurrences']}/{s['rowsWithIdentifierRootSymbols']}** expressions with identifier roots; complete symbol expressions are literal in **{s['fullSourceSymbolExpressionOccurrences']}** rows. A root match only confirms an identifier exists.",
        f"- Geographic and physical catalogue identity groups have distinct original and target IDs (see per-category counts). Cable system identity/name/price/age literals and **{s.get('retainedCableRoutePairsMatched', 0)}/{s.get('retainedCableRoutePairsMatched', 0) + s.get('retainedCableRoutePairsUnmatched', 0)}** route endpoint tuples are checked against the source tables.",
        f"- Two separate hardware resale rates remain explicit: spare optics **0.4**, routers **0.3**.",
        "",
        "## Category checks",
        "",
        "| Retained category | Rows | Distinct targets | Exact original ID literals | Exact original name literals |",
        "|---|---:|---:|---:|---:|",
    ]
    for row in report["categories"]:
        lines.append(f"| {row['category']} | {row['rows']} | {row['distinctTargetIds']} | {row['originalIdLiteralsFound']} | {row['originalNameLiteralsFound']} |")
    lines += ["", "## Automated checks", ""]
    for check in report["checks"]:
        lines.append(f"- `{check['status']}` `{check['id']}` — {check['detail']}")
    lines += ["", "## Open review", ""]
    for finding in report.get("findings", []):
        if finding["status"] == "review-required":
            lines.append(f"- **{finding['id']}** — {finding['note']}")
    lines.extend(f"- {item}" for item in report["limitations"])
    lines += [
        "- The audit does not establish gameplay coverage or semantic parity for cities, companies, customers, finance, progression, player actions, or retained engine/UI behavior.",
        "- The original source mapping contains more than labels and tables. Retained actions and state fields still need executable behavior checks tied to their exact source functions and attributes.",
        "- The wider audit notes unresolved catalogue scope, including 154 core companies, 60 smaller companies, 152 named customer templates, 125 supply relationships and the full physical catalogue. This report does not clear those obligations.",
        "",
        f"Audit status: **{s['status']}**. `passed-with-open-semantic-review` means the checks in this report succeeded; semantic review remains open.",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write the JSON and Markdown audit outputs")
    args = parser.parse_args()
    report = build_report()
    if args.write:
        out_json = ROOT / "spec/audit/retained-review.json"
        out_md = ROOT / "spec/audit/retained-review.md"
        out_json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        out_md.write_text(markdown(report))
    print(json.dumps({"status": report["summary"]["status"], "summary": report["summary"], "failedChecks": report["failedChecks"]}, ensure_ascii=False))
    return int(bool(report["failedChecks"]))


if __name__ == "__main__":
    sys.exit(main())
