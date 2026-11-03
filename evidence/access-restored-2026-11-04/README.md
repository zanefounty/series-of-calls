# Access-restored implementation and verification — 4 November 2026

This is an implementation checkpoint for the incomplete preview, not full source completion or a deployed release. Execution timestamps use UTC on 3 November.

## Restored capabilities and provenance

[Preflight](preflight.json) passes DNS, loopback listening, genuine project Git metadata, exact local jsdom 24.1.3 / playwright-core 1.56.0 and project TOML parsing. Clean `env -u NODE_PATH npm ci` succeeded. The [initial suite](initial-locked-suite.log) passed 1,314 tests; subsequent implementation changes require the separate final-input run. [Environment observations](environment.json) record its limited scope.

The hydration helper attached genuine history at `b7e5f193b424689e3dbdf6e57639b5212e04d5c2` without overwriting authored files. The independent public repository is `zanefounty/series-of-calls`, with `fork: false`, `origin` there and `upstream` at `fjaeckel/seriesoftubes`. Six original binary blobs were recovered into [a separate archive](upstream/original-binaries.json); active artwork remains preserved. [The upstream audit](upstream/audit.md) records the 17 newly observed commits; the observer independently updated pending inventories to 366 commits and 461 historical file versions. The source inventory is now 4,839 requirements; no final disposition follows from this observation.

## Implemented behavior

Customer requirements can bind explicitly to retail contracts. Measured seat, agent and room capacity respects each contract's purchased quantity, correctly typed effective resources and current dependency readiness. An effective requirement shortfall prevents renewal; a desired-only repair does not. Saved binding lineage prevents removing profile fields to bypass the constraint. Remaining service, support, accessibility, jurisdiction and monthly-price dimensions stay unproven. A 60-minute synthetic billing period is not silently treated as a calendar month.

Imported service-observation samples now require exact boolean resource dimensions and agreement with their aggregate readiness. Later repairs preserve genuine failed history. Modern HTML identifier patterns were repaired across consoles. A valid import now clears a prior import error after successful persistence.

## Browser environment and retained attempts

The application Playwright 1.56.0 does not support host Ubuntu 26.04 directly. Its first fallback Chromium run used `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64` and passed the [three-viewport smoke](browser-initial/browser.json), labelled diagnostic. A separate [container smoke](browser-container-initial/browser.json) passed using supported Ubuntu 24.04, matching Playwright 1.56.0 browser builds and host Node 24.22.2 mounted into the container. Image digest: `mcr.microsoft.com/playwright@sha256:35246d87a7c88ea9b771c65d33171b2611b02a8253b4b12ce6f94376c55f99f2`.

The first compact run retained console errors from invalid HTML `pattern` expressions; its failure is preserved under `evidence/browser-campaigns/2026-11-03T21-32-53-340Z-e02a58/`. The [actual browser MCP exploration](browser-mcp/README.md) used independently pinned MCP 0.0.84 and Playwright 1.65.0-alpha-2026-10-30 / Chromium revision1252. It found and reproduced the import error defect; all 22 later checks passed but the preliminary report correctly records source drift. Frozen reruns are required and recorded separately.

## Research and owner decisions

[Research follow-up](../../research/review-proposals/followup-2026-11-04/README.md) retrieves the three previously unresolved original archive pages and audits all 40 revise recommendations into concrete per-claim amendments, retaining retrieval limits. Historical reports stay historical. The owner asked to retain these for the next release; no claim-by-claim acceptance is recorded.

The owner designated `zanefounty` as the accountable contact and selected GitHub as the current route, deferring a separate private conduct channel. GitHub private vulnerability reporting is enabled. The [contact policy patch](../../maintenance/proposals/contact-routing.md), CI/Pages safeguards and evidence-freeze changes were separately reviewed and merged in governance PR #1. Hosted adaptation remains disabled; no provider-enforced budget or dedicated credential is inferred.

## Remaining scope

Full actor/product/catalogue, specialist workforce/BPO, commercial/public-sector, enterprise migration, SP economy/progression and upstream source obligations remain incomplete. Full browser matrices and final-input gates are separately recorded below; hosted protections have been exercised. Release remains blocked by unaccepted research and unfinished requirements; no gate has been weakened and no Pages deployment is claimed.

## Frozen verification checkpoint

The frozen complete JavaScript run passed **1,324 tests** (zero failures/cancellations/skips), using locked local dependencies. [Actual stdio MCP](mcp-final.json) passed **64 cases**, including the new profile-bound renewal failure/repair and the existing campaigns. [Final browser MCP](browser-mcp/2026-11-03T21-45-21-590417Z/report.json) passed **22 bounded checks**, with no source drift or console errors. These counts overlap and must not be added together. The full matrix and remaining gate results are recorded separately when their producers finish.

The [frozen check run](final-checks/results.json) passed all 1,324 tests, 455 registered acceptance cases, 71 Python gate/mutation tests, development/delivery gates, 5,608-label translation structure and build with **no input drift**. Release correctly failed at the unreviewed reference `REF-ac194430f67b3832`. The [canonical browser smoke](../browser.json) passed three viewports and offline reload. Each compact matrix passed 144 cases with no drift: Chromium `matrices/2026-11-03T21-45-03-081Z-b7626c`, Firefox `matrices/2026-11-03T21-45-06-296Z-91a611`, WebKit `matrices/2026-11-03T21-45-09-115Z-31dca9`.

The preview commit `3c977ad654bc2621bae6bbfa422907976a944b36` is pushed to the independent public repository. [Remote receipts](github/) record required checks with no bypass, a separate owner-only PR review exception, private vulnerability reporting, and main-only owner-reviewed Pages environment. Pages configuration is not deployment. [Owner approval](governance-validation/owner-decision.json) and the later merge receipts cover PR #1 after its checks. Repository/history/locked-baseline and branch-protection readiness now have actual receipts; remaining flags require their separate evidence.

Browser traces are retained locally and hash-indexed rather than adding multiple gigabytes of zip files to Git. A generated browser core dump was removed after recording [its metadata](browser-core-dump.json); it is not test evidence. Full campaign runs and their sharded replacement remain separately recorded, with no full campaign pass inferred from compact results.

The original serial campaign attempts stopped at the unchanged 30-minute budget: Chromium 65/144, Firefox 57/144, WebKit 59/144. Their final in-flight cases hit the remaining time limit. WebKit also had an earlier page crash in `smb-au-sandbox-mobile`. These are **failed attempts**, preserved in [the attempt index](serial-campaign-attempts.json), not passes or excluded cases. Deterministic shards rerun the complete matrix; only exact full coverage with matching inputs and artifacts can produce an aggregate pass.

[Governance PR #1](https://github.com/zanefounty/series-of-calls/pull/1) merged at `43135706cfa4fc878b25dd9100a8cbc91111841d` after all 11 hosted checks passed and the owner approved the updated scope. Hosted evidence records 1,324 JavaScript tests, 455 acceptance cases and 82 Python checks. Reporting routes are active and issue intake is enabled. The original owner-only review exception was used after all required checks passed; required-check protections were unchanged. [The merge and pre-merge receipts](governance-validation/) retain the exact head and outcomes.

Both observation workflows then succeeded and created bot PRs #3 and #4. Upstream PR #3 exposed a stale checked-in receipt in the separate mutation job; [PR #5](https://github.com/zanefounty/series-of-calls/pull/5) corrected the current-run artifact handoff and merged after explicit owner approval and all 11 checks passed (83 Python checks). Observation-only PRs #3 and #4 subsequently passed all 11 checks, received the owner’s explicit approval and merged. [Their receipts](github/bot-pr-4-merged.json) and [scope audit](protections/observation-owner-review.md) preserve the distinction: canonical research acceptance remains zero. [Gate fixture verification](fixture-checks/README.md) independently passed all 82 local Python tests after the reviewed integration.

## Native client discovery

[The direct interactive Codex receipt](native-codex.json) verifies actual `/mcp` connections to Calls (5 tools), SP (22), pinned browser MCP (29) and official documentation (5), plus discovery of the local development skill. The first launch exposed the incorrect stdio working directory; changing `..` to `.` and relaunching fixed it. The eight setup tests now use the actual native path semantics. [Fresh preflight](codex-preflight-current.json) passes. The previously applied global migration was not repeated.

## Complete current browser baseline

[Six strict aggregates](sharded-matrices/README.md) now pass all 144 cases independently for compact and campaign journeys in Chromium, Firefox and WebKit, with identical frozen inputs and retained artifacts. WebKit required one explicitly retained full-shard retry after an intermittent initial Training-entry crash; the original failed attempt remains visible and its cause is unresolved. The canonical smoke and separate browser-MCP checks cover keyboard/topology, save/import/replay, worker fallback, concurrent tabs and offline reload. This establishes the browser baseline for the current implemented preview, not the missing source-specific behavior. `fullBrowserAcceptance` records that bounded baseline and must be reconsidered when implementation inputs change.
