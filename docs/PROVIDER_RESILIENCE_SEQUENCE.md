# Provider resilience sequence adapter

`SOC_PROVIDER_RESILIENCE_SEQUENCE` assesses the version 1 Provider sequence on `provider-campaigns-5`. It remains separate from the Training service observation rules. The adapter does not replace or certify the existing `39-service-observation.js` adaptation.

A qualifying sequence is attached to one paid, completed `primary-upstream` project and the authored first voice case of a 24-case period. The original interaction retains the mission's requested duration; two sequential same-case, same-caller outbound interactions request three minutes each. The first finishes before the incident window. A paid transport-domain incident then marks the primary failure. The during call must be admitted and observed on the independently funded backup link while an actual failed-domain sample is recorded. After the incident's paid repair resolves, the final call must be admitted and observed on the restored primary. The sequence requires ten consecutive minute samples and all three calls to finish by `windowStart + 10`; the case-level completion deadline remains separately enforced by campaign state.

The pure module exports:

- `validateJob(parent, customer, job, child)`: rejects malformed authority, phase, interaction, case, assignment, usage, incident and sample links during dispatch/save/restore validation. It accepts legitimate partial and failed work without treating it as a pass.
- `evaluate(parent, customerId, job, { child })`: returns `{ eligible, missing, evidence }` after checking actual admission and transport-observation traces, the primary and backup IDs/domains, real work samples and the ten-minute completion window. It does not change simulation state or assess period profitability.
- `source()`: emits the self-contained assessor for the worker runtime. Rule and variant lookups happen lazily after ordered worker source loading.

The Provider campaign retains the sequence job and `providerResilienceCase` protects its up to three referenced interactions and their actual traces from ordinary history pruning. Revalidation reads those retained rows; it does not invent a compact historical snapshot when they are absent. Full-period settlement, support qualification and progression receipts remain separate evidence checks. All services and transport are synthetic.
