# Provider dedicated carrier interconnect contract

This is a bounded, **not yet dispatched** Provider adapter for `progress.goal.pn`. It preserves the source goal `GOALS.pn` in `src/game/40-progress/20-goals.js`, its original attributes/hash in `content/progression.json`, and the two-direction gateway contract in `spec/work-packages/WP-CALLING-ACHIEVEMENTS.md`. It does not certify a real carrier, approve source research, implement an external service, or convert the source cash reward.

`src/game/23-provider-dedicated-interconnect.js` is pure. It creates plans/receipt values and evaluates supplied authoritative records. It neither bills nor configures the simulation. The existing `53-service-operations.js` carrier schema and actual `CARRIER_MODEL_SELECTED`, `CARRIER_PATH_ADMITTED`, signalling, routing and media traces remain authoritative. Dedicated UC platform ownership alone does not qualify.

## Proposed versioned paid offers

These synthetic content terms require coordinator integration into version 8. Both use the existing paid capacity; neither adds sessions, people, cash or free service.

| Operation | Setup cents | Recurring cents/period | Staff work minutes | Engineers | Support |
| --- | ---: | ---: | ---: | ---: | ---: |
| `direct-dedicated-interconnect` | 24000 | 6000 | 6 | 1 | 1 |
| `managed-dedicated-interconnect` | 12000 | 9000 | 8 | 0 | 1 |

Managed ordering additionally requires a validated PN earned receipt covering the customer's market. The direct offer remains available. A managed follow-on must still be purchased, commissioned and carry actual service; receiving the badge supplies no deployment or capacity.

The quoted work minutes are engineering effort, not immediate service. The helper requires carrier configuration submission after that work and at least one further actual provisioning minute before delivery. The coordinator must quote the complete lead time, recurring exposure and existing plan usage charges, enforce funds/staff/reservations, and preserve rejected drafts and idempotency.

## Coordinator API and writes

Opt in only new eligible campaigns with `providerCampaign.dedicatedInterconnectVersion = 1` and `contentVersion = 'provider-campaigns-8'`; unknown versions fail. Do not silently reinterpret older saves.

- `terms(operationId)` returns a copy of the exact synthetic commercial terms.
- `canOrder(state, {customerId, operationId}, hooks)` reports prerequisites; this is guidance, not a substitute for shared quote/dispatch authority.
- `plan(state, request, hooks)` records `version, operationId, customerId, portfolioId, tenant, market, acceptedAt, previous, carrierProfile, carrierGeneration, phoneGeneration, terms, earnedReceiptId`.
- `createReceipt(plan, {projectId, postingId, submittedAt})` returns the exact `operationReceipt`: `{kind:'provider-dedicated-interconnect', version:1, projectId, postingId, submittedAt, plan, deliveredAt:null}`.
- `commissionEvidence(state, project, hooks)` returns `{deliveredAt:state.clock}` only after actual matching effective configuration and readiness. Root writes that value once, together with `project.status='complete'` and `completedAt`. `validateReceipt` then requires exact agreement.
- `evaluate(state, customerId, hooks)` returns locked/ready and the actual two-call proof; no claim is issued here.
- `validateEvidence(state, customerId, proof, hooks, {historical:true})` checks the earned historical proof independently of today's readiness. Without historical mode it additionally requires current effective gateway configuration/support/service.
- `pins(proof)` returns call, job, case and arrival-event IDs required for bounded retention. `source()` is a self-contained declaration for the actual worker composition.

The trusted configuration submission is the existing operations command `configure`, kind `carrier`, with the plan's full `carrierProfile`. It keeps provider, codec and unrelated controls, changes mode to `gateway` and enables `sbcCertified`, `tlsTrusted`, `hostnameValid`, `peerAuthenticated`. The operations engine increments its carrier generation once and, if needed, changes the phone carrier model/generation. The helper pins those exact expected generations. It does not increment or change the trunk's capacity or configuration. Root must refuse/requote a stale planned generation rather than overwrite intervening paid work. Root also owns no-op/repeated-project eligibility.

Root must preserve authoritative carrier/phone/trunk configuration history at purchase, submission, effective delivery and subsequent configuration changes. `configurationAt` must replay paid configuration and timing independently of receipt copies; **never fill a missing old generation from today's configuration**. The current bounded proof requires the exact commissioned phone/carrier/trunk generation set; subsequent paid changes can preserve an earned historical receipt but require a new correctly scoped proof for current readiness. A future relaxation for compatible capacity upgrades needs a separately tested paid-generation lineage rule.

### Required trusted hooks

| Hook | Exact responsibility |
| --- | --- |
| `customerRoot(state, customerId)` | Resolve validated campaign customer to its independent portfolio root. Child `providerCustomer.id` and tenant must agree. |
| `configurationAt(state, customerId, minute)` | Return `{carrier:{generation,effective}, phone:{generation,effective}, trunk:{generation,effective}}` from independently validated historical paid state. Return no snapshot when history cannot be established. |
| `validatePaidProject(state, project)` | Validate canonical operation, full terms, customer/project/setup posting and retained posting lineage, including real import/replay authority. |
| `supportReady(state, customerId, minute)` | Establish actual supported paid scope at the supplied historical/current minute. |
| `serviceReady(state, customerId)` | Current observed resource, dependency, carrier and service eligibility. |
| `earnedReceipt(state, customerId, sourceId)` / `validateEarnedReceipt(state, receipt)` | Provide and validate a same-market existing PN claim for managed quote eligibility. |
| `validateManagedPurchase(state, project, receiptId, acceptedAt, market)` | Independently prove managed entitlement at purchase; later readiness changes do not revoke a lawful historical purchase. |
| `retainedWork(state, customerId, callProof)` | Optional, historical-only proof of actual validated eviction plus immutable retained original job/arrival/call/case lineage. Missing rows fail closed without this hook. A numeric watermark alone or receipt self-comparison is insufficient. |

Each proof retains the exact funded receipt and both real jobs, arrivals and interaction traces. It requires completed nonprobe voice calls in both directions, canonical same-customer cases, actual carrier admission, routing/number acceptance, INVITE/200 OK, successful two-way media, no outstanding obligations, real conversation duration, and usage equal to the Provider job's metered minutes. It checks effective paid gateway scope across the whole conversation, not just admission. The bounded adapter accepts the core maximum 120-minute requested conversation and at most one day of elapsed call lifecycle, avoiding an unbounded historical replay loop on malformed imported timestamps; this is not a new mission SLA or a relaxed duration rule. A still-retained row conflicting with a proof always fails, even if another row was legitimately pruned.

## Focused evidence and limits

`rtk node --test --test-isolation=none tests/provider-dedicated-interconnect.test.js` passes five cases, AC-SOC-679–683. The fixtures execute actual Lab gateway configuration and inbound/outbound calls, then wrap their results in **isolated Provider helper contract fixtures**. They cover exact terms/no capacity award; managed-market refusal; real completed calls versus signalling/probe/missing admission/media/cross-tenant failures; unpaid, premature and forged profile receipts; historical configuration loss and strict partial-retention checks; JSON roundtrip and serialized helper equivalence.

These tests do not claim public paid Provider dispatch, actual worker transport, a progression claim, browser controls, successful managed follow-on delivery, or source acceptance. Coordinator work still includes quote/content integration, canonical configuration replay, dispatch/billing, earned receipt registration, actual worker composition, contextual carrier controls, and public success/failure/paid-recovery plus desktop/mobile execution. Full release gates remain unchanged.
