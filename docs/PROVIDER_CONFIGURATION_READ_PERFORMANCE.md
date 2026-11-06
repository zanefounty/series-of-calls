# Historical configuration read performance — 6 November 2026

The historical reader now builds a local view of a customer root and copies only the site-exercise fields that change at the requested time. Previously it serialized and copied the full tenant, including unrelated calls, cases and information history, for each historical minute. Paid configuration replay and generation checks still execute.

On the actual retained minute-345 state, twelve validations took 5,788.2 ms before the change and 4,397.9 ms afterward. Three individual dispatched ticks took 3,443.5 ms before and 2,411.2 ms afterward: about 30% faster in this bounded measurement. Historical outputs for all fifteen resources at minutes 0, 120, 240, 344 and 345 had identical hashes. A forged generation produced the identical rejection. Raw comparison: `/tmp/soc-config-reader-perf-benchmark.json`.

Frozen candidate `906832d7a6d55c121fe741c1724f3743ab5ea3c6` passed 22 configuration history, replay, purity and owned-site cases in 135.9 seconds. The tests include actual site recovery, worker execution, frozen input reads, mutation of returned configuration/provenance and invalid generation refusal. All 1,416 tracked input hashes remained unchanged. The manifest, log and result are under `/tmp/soc-reader-906832d/`.

This measurement does not establish that the complete acceptance producer or the longest progression case fits the hosted deadline. The previously observed single-case runtime remains a performance issue. CI deadlines, acceptance requirements and release gates are unchanged.
