# Fork-inspired transport recovery and measured headroom

The owner requested the [pinned upstream/fork review](../../research/forks/README.md) and compatible gameplay additions. This slice maps to existing transport source `DESIGN-5fd1c25706b12388` and pricing source `uc-new:domain:pricing`; behaviours BEH-SOC-382/383 and AC-SOC-593 through 613 remain partial.

## Leased-IP withdrawal

The [Lair-us fork incident](https://github.com/thesysadmindev/seriesoftubes/commit/77776c855724ed407a7b18bde1ee22c3e5da8046) inspires an explicit `transport/lease-revoke` exercise. A ready, effective purchased link loses leased-address reachability for 7–60 synthetic training minutes. Configuration and physical observations remain separate. The player can wait for deterministic renumbering or provide another usable path. A continuing call reroutes on advancement; an isolated call fails. Renumbering never clears physical, power or shared-domain faults. There is no extra invented withdrawal charge.

The UI names Lair-us only in its original leased-address role. The fork's 7–60 *days*, random rarity, day-60 eligibility and three-link prerequisite are not relabeled as implemented; explicit training minutes are an intentional adaptation.

A bounded retained history binds events to exact root command revisions, tenant/scenario scope, clocks, duration, link and original generation. New roots preserve a count across command pruning; deleting old event rows while retaining that count fails. Legacy saves without both optional fields remain valid. Once all relevant command receipts have pruned, stripping both optional history and counter is indistinguishable from a legacy save; this is structural validation, not cryptographic provenance.

## Measured capacity headroom

The [port-headroom fork](https://github.com/thesysadmindev/seriesoftubes/commit/62c242c9a73913675c22b30356684d9041e796d9) inspires a pure advisor over actual reserved Kbps and an explicit `transport/headroom-upgrade` order. Threshold and target utilization use integer basis points; provisioned capacity uses Mbps. The request is recomputed at dispatch, enforces maximum and contract allocation, and cannot silently order during failed/pending provisioning or an outage. An accepted upgrade charges the existing configured setup fee once and retains old effective capacity until the declared lead time expires. No idle, blocked or repeated-pending request mutates state or money.

The [AU NNI tests](https://github.com/thesysadmindev/SeriesOfTubesAU/blob/c650d84d0f79219e8b2249bae9bac3bbfe3b2d5e/tests/nbn-poi.test.js) inform before/during/after upgrade and refusal-without-charge assertions. Existing SOC access contracts already separate capacity and units. This slice does not implement Australia's 121 POIs, NNI wholesale tariffs, hosting racks, autonomous staffing standing orders or real broadband economics.

## Verification contract

Tests exercise real failed, continuing and recovered calls; independent outages; exact cost and capacity; rejected-command atomicity; all four fictional jurisdictions; DOM controls and read-only locks; deterministic replay/worker parity; malformed imports; and an independently modeled seeded long play with real command pruning and mid/late save continuation. Actual stdio MCP and real-browser feature journeys use the same dispatcher. Full source fidelity and release eligibility remain separate.

Raw logs, traces, screenshots and copied builds remain outside Git. Compact canonical receipts record final matching-input runs. Source packs, MIT licensing, canonical owner research acceptance and gates remain unchanged.
