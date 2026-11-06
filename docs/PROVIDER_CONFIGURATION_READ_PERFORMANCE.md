# Historical configuration read performance — 6 November 2026

The historical reader now builds a local view of a customer root and copies only the site-exercise fields that change at the requested time. Previously it serialized and copied the full tenant, including unrelated calls, cases and information history, for each historical minute. Paid configuration replay and generation checks still execute.

On the actual retained minute-345 state, twelve validations took 5,788.2 ms before the change and 4,397.9 ms afterward. Three individual dispatched ticks took 3,443.5 ms before and 2,411.2 ms afterward: about 30% faster in this bounded measurement. Historical outputs for all fifteen resources at minutes 0, 120, 240, 344 and 345 had identical hashes. A forged generation produced the identical rejection. Raw comparison: `/tmp/soc-config-reader-perf-benchmark.json`.

Frozen candidate `906832d7a6d55c121fe741c1724f3743ab5ea3c6` passed 22 configuration history, replay, purity and owned-site cases in 135.9 seconds. The tests include actual site recovery, worker execution, frozen input reads, mutation of returned configuration/provenance and invalid generation refusal. All 1,416 tracked input hashes remained unchanged. The manifest, log and result are under `/tmp/soc-reader-906832d/`.

This measurement does not establish that the complete acceptance producer or the longest progression case fits the hosted deadline. The previously observed single-case runtime remains a performance issue. CI deadlines, acceptance requirements and release gates are unchanged.

## Validator-scoped projection reuse

Candidate `9105d7610b5d9c7f62a0af937a98efe621e88beb` additionally reuses equivalent paid configuration models within a single synchronous, read-only validation. The opaque token owns no serialized state and must be discarded before any input mutation or dispatch. Per-read generation/provenance checks and defensive output copies still execute. It is not a reusable cross-command cache.

The same minute-345 benchmark took 2,759.8 ms for twelve validations and 1,581.8 ms for three dispatched ticks, approximately 52% and 54% less than the original baseline. All 1,038 customer-minute queries matched uncached configurations and provenance. A separate five-customer minute-660 validation averaged 1,325.3 ms. These bounded results do not establish the full acceptance deadline. Detailed measurements: `/tmp/soc-config-reader-perf-timeline-benchmark.json`.

The integrated candidate passed all 30 focused tests in 63.1 seconds with unchanged tracked inputs, including actual paid site recovery, restore/worker, migration, service retirement, frozen-input purity and returned-value mutation checks. AC-SOC-776 also covers a synthetic nested restoration/retirement cache-key collision; that fixture is an internal model-boundary regression, not an accepted gameplay save. Independent review found no additional correctness blocker within the immutable validation scope (`/tmp/soc-config-reader-ce19e16-independent-audit.json`).

The first mapping check correctly rejected an out-of-date generated audit after registration. Regenerating that audit repaired the metadata; subsequent source, coverage, mapping, translation and build checks passed with runtime unchanged. Preserve both the failed first run and follow-up logs under `/tmp/soc-timeline-integrated-verification/`. Full registered acceptance remains pending.

## Private support reconstruction copies

The follow-on change uses shallow private boundary-evaluator views and reuses internal configuration/provenance rows within the same read-only reconstruction. The public authority reader still returns copies. Independent review found a supported custom `resourceObservationAt` hook could retain and mutate an internal plan after return; AC-SOC-781 reproduced the failure before the repair. The callback now receives its own defensive copy while the built-in read-only path keeps the optimization.

The repaired integration passed 30 configuration/history/replay/owned-site tests, including AC-SOC-780/781, in 51.9 seconds (`/tmp/soc-history-hook-green.log`). The failing-before log remains `/tmp/soc-history-hook-red.log`. Candidate `557129b` subsequently passed source/coverage/mapping, translations and build with unchanged tracked inputs (`/tmp/soc-copy-perf-integration/`). These focused runs are not a fresh full acceptance producer.

Before the hook-only boundary repair, the unchanged clock-660 snapshot measured 788.8/779.6/801.1 ms per validation, compared with 1222.5/1152.9/1165.9 ms before internal cache-copy removal; three dispatched ticks took 5044.6 ms. The external-hook repair does not change the built-in path, but these timings remain the specifically measured earlier candidate. Receipt: `/tmp/soc-config-reader-perf-copy-path-receipt.json`; independent review: `/tmp/soc-config-reader-c05620a-independent-audit.json`.

A fresh AC-SOC-656 run is now separately measuring the paid L7 support journey on frozen `557129b`, with a 600-second local cap. No result is claimed before its terminal receipt at `/home/zane-fountylabs/soc-evidence-archive/regional-656-557129b/result.json`. This does not alter any hosted deadline.
