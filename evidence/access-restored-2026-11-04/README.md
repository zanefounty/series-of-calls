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

The owner designated `zanefounty` as the accountable contact and selected GitHub as the current route, deferring a separate private conduct channel. GitHub private vulnerability reporting is enabled. The [contact policy patch](../../maintenance/proposals/contact-routing.md), existing CI/Pages safeguards and evidence-freeze proposal belong in a separate owner-reviewed governance PR. Hosted adaptation remains disabled; no provider-enforced budget or dedicated credential is inferred.

## Remaining scope

Full actor/product/catalogue, specialist workforce/BPO, commercial/public-sector, enterprise migration, SP economy/progression and upstream source obligations remain incomplete. Full browser matrices, final-input gates and hosted protections are separate acceptance work. Release remains blocked by unaccepted research and unfinished requirements; no gate has been weakened and no Pages deployment is claimed.

## Frozen verification in progress

The frozen complete JavaScript run passed **1,324 tests** (zero failures/cancellations/skips), using locked local dependencies. [Actual stdio MCP](mcp-final.json) passed **64 cases**, including the new profile-bound renewal failure/repair and the existing campaigns. [Final browser MCP](browser-mcp/2026-11-03T21-45-21-590417Z/report.json) passed **22 bounded checks**, with no source drift or console errors. These counts overlap and must not be added together. The full matrix and remaining gate results are recorded separately when their producers finish.
