# Retained mapping review

## Scope

Structural and literal checks for the 1,074 original Retain mapping rows. A matching path, symbol, constant or label is not proof that the complete original behavior is playable or semantically equivalent.

The source mapping is pinned to commit `48e6200c532d486f79bc8376de0aecbf6169123b` (tree `02ebd05a76bcb8e2f74de625aadb27e4564a1894`). The separately tracked latest upstream snapshot is `da1a4e2f3c9f7fac12c94eefb8d35bd6b1e4ae16`. Byte-exact matches compare current files to the latest observed upstream tree, not to the pinned 1.37.0 mapping commit.

## Results

Run the reproducible checks with `python3 scripts/audit-retained.py`; use `--write` to refresh this report and its JSON row inventory.

- Retain rows checked: **1074** across **47** distinct source paths.
- Current mapped source files present: **47** distinct files covering **1074** row links; **36** of those files are byte-exact against the separately observed latest upstream tree.
- Source-symbol root identifiers found in mapped files: **1044/1054** expressions with identifier roots; complete symbol expressions are literal in **185** rows. A root match only confirms an identifier exists.
- Geographic and physical catalogue identity groups have distinct original and target IDs (see per-category counts). Cable system identity/name/price/age literals and **471/475** route endpoint tuples are checked against the source tables.
- Two separate hardware resale rates remain explicit: spare optics **0.4**, routers **0.3**.

## Category checks

| Retained category | Rows | Distinct targets | Exact original ID literals | Exact original name literals |
|---|---:|---:|---:|---:|
| Cable route pairs | 475 | 475 | 0 | 0 |
| Cable ship names | 8 | 8 | 0 | 7 |
| Cable systems | 162 | 162 | 162 | 162 |
| Land connectivity groups | 58 | 58 | 58 | 58 |
| Optical modules | 4 | 4 | 4 | 4 |
| Owned cable name templates | 16 | 16 | 14 | 16 |
| Physical port tiers | 6 | 6 | 6 | 6 |
| Regions | 6 | 6 | 6 | 0 |
| Transport capacity tiers | 7 | 7 | 7 | 7 |

## Automated checks

- `passed` `source-map-sha` — The reviewed map hash matches the preserved source mapping.
- `passed` `retain-count` — Found 1074 rows explicitly marked Retain.
- `passed` `retain-review-rows` — Every retained source row has its matching structural review record.
- `passed` `retained-source-files` — 1074/1074 retained rows point to files present in the current working tree.
- `passed` `retained-symbol-roots` — 1044/1054 identifier-root expressions occur in their mapped current source file; 10 expressions need individual review because their root names are absent.
- `passed` `distinct-targets:Cable route pairs` — Cable route pairs: 475 retained rows have distinct target IDs.
- `passed` `distinct-original-ids:Cable route pairs` — Cable route pairs: 475 retained rows have distinct original IDs.
- `passed` `distinct-targets:Cable ship names` — Cable ship names: 8 retained rows have distinct target IDs.
- `passed` `distinct-original-ids:Cable ship names` — Cable ship names: 8 retained rows have distinct original IDs.
- `passed` `distinct-targets:Cable systems` — Cable systems: 162 retained rows have distinct target IDs.
- `passed` `distinct-original-ids:Cable systems` — Cable systems: 162 retained rows have distinct original IDs.
- `passed` `distinct-targets:Land connectivity groups` — Land connectivity groups: 58 retained rows have distinct target IDs.
- `passed` `distinct-original-ids:Land connectivity groups` — Land connectivity groups: 58 retained rows have distinct original IDs.
- `passed` `distinct-targets:Optical modules` — Optical modules: 4 retained rows have distinct target IDs.
- `passed` `distinct-original-ids:Optical modules` — Optical modules: 4 retained rows have distinct original IDs.
- `passed` `distinct-targets:Owned cable name templates` — Owned cable name templates: 16 retained rows have distinct target IDs.
- `passed` `distinct-original-ids:Owned cable name templates` — Owned cable name templates: 16 retained rows have distinct original IDs.
- `passed` `distinct-targets:Physical port tiers` — Physical port tiers: 6 retained rows have distinct target IDs.
- `passed` `distinct-original-ids:Physical port tiers` — Physical port tiers: 6 retained rows have distinct original IDs.
- `passed` `distinct-targets:Regions` — Regions: 6 retained rows have distinct target IDs.
- `passed` `distinct-original-ids:Regions` — Regions: 6 retained rows have distinct original IDs.
- `passed` `distinct-targets:Transport capacity tiers` — Transport capacity tiers: 7 retained rows have distinct target IDs.
- `passed` `distinct-original-ids:Transport capacity tiers` — Transport capacity tiers: 7 retained rows have distinct original IDs.
- `passed` `cable-system-literals` — Structured current source literals preserve id, name, price and age for 162/162 retained cable systems.
- `passed` `cable-route-endpoints` — Source pair tuples appear under their mapped cable IDs for 471/475 retained route rows; missing tuples are reported for review.
- `passed` `spare-resale-fraction` — Original spare resale remains 0.4.
- `passed` `router-resale-fraction` — Original router resale remains 0.3; it is checked independently from spare resale.

## Open review

- **retain-symbol-root-not-literal** — These mapped source-symbol roots do not appear literally in the current source file. Some may be renamed code symbols; inspect each before treating it as a missing mechanic.
- **retain-cable-route-pair-mismatch** — These four Retain mapping rows keep distinct target IDs but their original endpoint pair is absent under the mapped cable ID in the current cable source. A route elsewhere is not treated as equivalent; review or restore the exact route identity.
- **retain-cable-ship-fleet-move** — The original eight names are found across current fleet data, correcting the earlier false absent-name finding. Four remain installation-ship labels; three are now repair-ship labels and MV Cable Guy appears there as Cable Guy. The old indexed installation identity is not preserved: current LAY_SHIPS uses a different order and four replacement names, while layName chooses by a link hash. Keep name retention, role change and stable-ID behavior as separate classifications.
- No current file path is treated as evidence that its original behavior was retained.
- Source-symbol checks report literal expression presence or root identifier presence only; they do not resolve JavaScript expressions.
- Only cable system identity/name/price/age and cable-pair endpoint tuples are parsed as structured source literals in this audit.
- Retained city, company, customer and gameplay behaviors require separate semantic tests; they are not cleared by this audit.
- The source capture and latest upstream byte-hash comparison have different commit scopes and are reported separately.
- The local upstream evidence contains the Git tree manifest with blob hashes, not a separate 352-file content archive; byte matches are recomputed from current working-tree files against that manifest.
- The audit does not establish gameplay coverage or semantic parity for cities, companies, customers, finance, progression, player actions, or retained engine/UI behavior.
- The original source mapping contains more than labels and tables. Retained actions and state fields still need executable behavior checks tied to their exact source functions and attributes.
- The wider audit notes unresolved catalogue scope, including 154 core companies, 60 smaller companies, 152 named customer templates, 125 supply relationships and the full physical catalogue. This report does not clear those obligations.

Audit status: **passed-with-open-semantic-review**. `passed-with-open-semantic-review` means the checks in this report succeeded; semantic review remains open.
