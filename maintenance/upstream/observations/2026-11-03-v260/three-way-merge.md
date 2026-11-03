# v2.6.0 upstream merge record

This is a local adaptation record for the text-file merge against the captured upstream observations dated 2026-11-03. It does not change the pending classification proposal or imply wholesale adoption of upstream behavior.

## Inputs and integrity

- Base: pinned upstream commit `da1a4e2f3c9f7fac12c94eefb8d35bd6b1e4ae16`.
- Upstream side: captured `main` commit `b7e5f193b424689e3dbdf6e57639b5212e04d5c2`.
- Compare inventory: `classification-proposal.json`, `compare-pinned-to-main.json`, and `tree-main.json` in this directory.
- For each of the 15 locally modified text files listed below, base and upstream Git blob bodies were fetched through the configured GitHub connector's Git database blob endpoint. Their recomputed Git blob SHA-1 values matched the respective pinned and upstream inventory entries before merging. No raw binary download or repository history rewrite was used.
- Merge method: three-way text merge (`git merge-file` on temporary files), followed by the fork-specific adaptations listed below. Fourteen files merged without conflict markers; one file needed a manual resolution. Files were copied back only after review.

## Merged files

`scripts/lib/mcp-game.js`, `scripts/lib/mcp-page.js`, `scripts/mcp.js`, `site/i18n/de.js`, `site/i18n/es.js`, `site/i18n/fr.js`, `site/i18n/it.js`, `site/i18n/pt.js`, `src/game/88-days/20-badges.js`, `src/game/96-map/30-settings.js`, `src/i18n/en.js`, `tests/game.test.js`, `tests/issues.test.js`, `tests/mcp.test.js`, and `tests/pages.test.js`.

`package.json`, `package-lock.json`, and `CHANGELOG.md` were not part of this merge record's edits; they were reserved for the parent integration.

## Manual adaptations and fork-specific tests

- `src/game/96-map/30-settings.js`: retained `soc-sp-prefs` as the canonical storage key. Final integration reads only `soc-sp-prefs`, preserving independent application storage and leaving original-game preferences untouched. A regression covers coexisting keys. Adopted upstream's `quiet` default and `quietOn()` behavior.
- `scripts/mcp.js`: changed upstream-facing product descriptions/instructions from “Series of Tubes” to “Series of Calls” and the fork's optional backbone sandbox terminology. Retained the fork's `series-of-calls-sp` identifiers and custom MCP wrapper.
- `tests/mcp.test.js`: adjusted the version assertion to use the checked-out package version (`0.1.0-preview.1`) and changed the foreign upstream save fixture assertion to require rejection as incompatible with Series of Calls. This preserves the save boundary instead of treating a Series of Tubes save as a valid local fixture.
- The English and five site locale dictionaries were sorted with the existing i18n tooling after the upstream merge. Fork-specific operations and domain strings were retained; locale audit reported no missing, unused, or broken entries. Final integration constructs stable progression source IDs from their components, avoiding their misclassification as translation keys; these identities must never be translated or shortened by the build.
- UI labels for the implemented progression rows and market qualifications now use translated human-readable names rather than raw source identifiers/booleans. Focused UI assertions cover this rendering.

## Verification and limitations

Passed focused runs:

- `tests/best-effort.test.js`: 9 passed.
- Selected upstream-targeted tests in `tests/game.test.js` and `tests/issues.test.js`: 1 each passed.
- `tests/pages.test.js`: 5 passed.
- `tests/mcp.test.js` non-stdio behavioral cases: 6 passed.
- `tests/learning-integration.test.js`: 4 passed.
- `tests/market-ui.test.js`: 1 passed.

The MCP stdio integration test could not be completed in this environment: both it and a minimal Node parent/child echo stalled under the sandbox. Direct invocation with an initialize request returned a valid MCP initialize response when run with the workspace's documented `NODE_PATH` dependency override. This is recorded as an environment limitation, not a passing stdio test. These focused checks do not replace the parent's final full verification.
