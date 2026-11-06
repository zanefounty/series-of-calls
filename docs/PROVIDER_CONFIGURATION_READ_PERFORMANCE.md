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
