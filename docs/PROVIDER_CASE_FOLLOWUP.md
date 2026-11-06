# Provider same-case follow-up adapter

This bounded adapter proposes `progress.progression-level.8` (Packet empire) as a paid, human voice conversation followed by a consented human digital conversation for the same person, tenant and case. The canonical source remains `LEVELS[7]` / `LV_REQ[7]` in `src/game/40-progress/10-businesses.js`; its original 16 Tbps / 32 POP predicate is not claimed to have been executed by these tests. This is a versioned Provider adaptation, not research acceptance or completion of L8.

The helper, contextual renderer, paid Provider dispatch, authored demand, metering, worker composition and L8 facts/receipts are integrated. Actual paid public dispatch has passed a bounded development test; final frozen browser and broad regression evidence remain outstanding.

## Paid alternatives

These fictional terms authorize workflow use, not consent, customer staff, licences, additional demand or free funds.

| Operation | Setup | Per period | Preparation | Shared engineers / support |
| --- | ---: | ---: | ---: | ---: |
| `direct-case-followup` | A$180 | A$40 | 5 minutes | 1 / 1 |
| `managed-case-followup` | A$90 | A$65 | 7 minutes | 0 / 1 |
| `retry-case-followup` | A$40 | A$0 | 2 minutes | 0 / 1 |

The managed alternative requires a valid earned L8 receipt in the customer's market. Both workflow alternatives require a paid effective Cisco programmable engagement connector and current permitted boundaries and eligible human handling. A retry is bound to one failed digital attempt and its original job; there is at most one paid retry. Failed accepted message attempts still incur the existing plan's message price.

## Conservation and lifecycle

New v8 campaigns opt in with `providerCampaign.caseFollowupVersion = 1`. Older campaigns do not acquire new obligations through rendering or import. The trusted demand adapter reserves one existing optional voice obligation at arrival, deterministically distinct from the queued-handoff slot and resilience case when both products are available. Versioned `caseFollowupDemand` gives this reserved case a twenty-minute deadline at arrival, with an arrival no later than minute 40. The ordinary eight-minute SMB deadline cannot contain both real human phases. This is an authored paid-workflow variant; it does not extend a case after arrival. The peak-window variant authors a thirty-minute deadline for its one follow-up case because its voice burst can exhaust current handling capacity; its arrivals are all within minute 16. Both deadlines are fixed at original arrival. Other cases retain their existing deadlines. It must retain 24 unique jobs/cases and the mandatory voice floor. The helper rejects overlap with a queued handoff or resilience sequence and a second follow-up reservation in the same customer's period.

`job.interactionId` remains the original voice interaction. `job.followup` binds the original job/case/person/tenant, arrival, deadline, paid workflow and canonical authored choice. It records zero, one or two digital attempts. The voice must actually resolve through a human agent, with requested conversation duration, two-way media, admitted carrier path, case context and no outstanding obligations. A failed queued voice handoff or a bot acknowledgement cannot satisfy this phase.

Only after that voice completion may a current consented digital interaction start through the paid connector. It must resolve through human handling with actual channel delivery evidence. Voice completion alone leaves the one obligation pending. The helper neither adds a job nor awards money. `observe` returns the combined case status, original voice usage, unique accepted digital interaction IDs and `messageUnits`.

The original authored deadline never moves. Funding a retry is refused when its two-minute preparation cannot finish before that deadline. This does not guarantee enough remaining queue/handling time: a later completed case is late, and an unfinished case fails under the existing settlement policy. At settlement the coordinator must reconcile or terminate pending legs consistently before freezing the settled job; a later target completion must not silently rewrite an already-settled bill or outcome.

## Pure APIs and trusted hooks

`terms`, `canOrder` and `operationPlan` describe the direct/managed purchase. `reserve` returns a new arrival receipt. `eligibility` is strict **start** eligibility. `quoteDetails` also supports quoting the unfunded retry: it returns `fundingRequired`, its A$40 charge and two-minute preparation, while `startPlan` continues to refuse until the scoped retry project is paid and complete. Once funded, the start plan has no additional retry setup charge.

`startPlan` returns a message request and a `PROVIDER_CASE_FOLLOWUP` trace descriptor. On an owned dispatch copy, the coordinator starts the real interaction, attaches that exact trace and then calls `recordAttempt`; only a successful atomic dispatch installs the returned receipt. Each attempt binds its actual interaction ID, start minute, paid connector generation/configuration and optional retry project/posting. Failed immediate dispatch must not consume a retry or leave a half-installed receipt.

Required hooks fail closed when absent:

| Hook | Trusted fact required |
| --- | --- |
| `customerRoot(state, customerId)` | Exact customer-owned simulation root. |
| `authoredCase(state, customerId, job)` | Canonical reconstruction of the actual demand plan and arrival; exact version, plan minute, case index, person, consented choice, account, template, destination and original deadline. No reconstruction from an editable receipt alone. |
| `workflowAt(state, customerId, at)` | Effective paid workflow project and posting at the requested historical minute. |
| `connectorAt(state, customerId, at)` | Effective paid connector project/posting plus exact historical `generation` and `configuration`. Never substitute today's configuration for missing historical authority. |
| `paidProject(state, project, at)` | Actual paid posting and complete project lineage at that minute. |
| `earnedAt(state, customerId, sourceId, at)` | Valid market-scoped earned receipt for the managed purchase at its acceptance minute. |
| `consentAt(state, customerId, person, caseId, at)` | Authored consent and actual channel permission at this attempt's start. Purchasing a workflow does not grant permission. |
| `boundaryAt(state, customerId, at)` | Actual permitted service/information boundary at this attempt's start. |
| `humanReady(state, customerId)` | Current eligible customer handling capacity; no automatic BPO allocation. |
| `retryAt(state, customerId, jobId, at)` | Exact completed paid retry for this failed case, if any. |
| `connectorAccepted(state, customerId, interaction, connectorProof)` | The completed digital interaction actually used the paid feature, backed by its real accepted trace. |

The authored descriptor is exactly `{version:1, planAt, caseIndex, caseId, person, consented:true, connectorId:'social-messaging', account:'chatterleaf', template:'service-outside-window', to:'+61255500201', deadlineAt}`. The helper checks these constants and job scope; the hook must additionally reconstruct the deterministic scenario choice and actual arrival provenance. Synthetic permission facts in the isolated tests are not an implementation of this authority hook.

## Integration and retention obligations

Integration and remaining verification:

1. Implemented: three paid operations, version marker, canonical separate demand slot and historical connector/workflow hooks.
2. Implemented: quoted purchases, starts and retries enter the same revision/idempotency/treasury/team boundary. Retry purchases retain their original commitment and job binding. A full public retry failure/recovery run remains to be executed.
3. Implemented: one job reconciles both phases; `messageUnits` counts unique accepted attempts and settlement sums those units. Original voice minutes remain metered separately. Restore checks the retained actual traces.
4. Implemented: actual worker composition and restore validation check case status, completion minute and units. Public worker continuation is included in AC710.
5. Derived pins protect both phases and their case while the job remains retained. Ordinary non-retry jobs prune normally; earned proof remains pinned. Paid retry projects currently retain their live job proof, and bounded archival retirement of this proof remains an explicit engineering item. The current `evidence` / `validateEvidence` APIs require retained actual jobs and interactions and a settled job; they have no permissive archived-proof fallback. A durable progression receipt needs separately validated bounded retained proof before those objects are pruned.
6. Implemented: contextual workflow/message comparisons, follow-up quotes and shell commands. Pending follow-ups remain visible alongside the six most recent journeys. UI tests AC711–713 verify exact start/retry commands, stale-draft preservation, translated comparisons and multi-attempt billing text.
7. Translations and registrations are present. Execute the final frozen broad checks and visible desktop/mobile journeys before claiming completion.

Historical validation checks permission and connector authority at the attempt minute. A later lawful product retirement must not invalidate completed service. Coherently removing a retry project and its receipt must still reject the second attempt. Changing the person, destination, tenant, case, deadline, paid generation or units is not a valid recovery.

## Earned receipt adapter

`23-provider-progression.js` evaluates L8 only for the opted-in campaign and exposes the actual settled helper evidence. `23-provider-progression-receipts.js` validates that evidence before claim and on restoration using `hooks.caseFollowupHooks(state)`. Claiming is idempotent, changes no cash or resources, and unlocks only a quoted `managed-case-followup` purchase in the evidenced market. Later lawful retirement preserves the historical receipt while the actual proof remains retained. A rehashed receipt cannot substitute another person, market, paid project, digital agent or billed unit count.

The evidence includes exact settled job, voice and final digital snapshots, all attempt IDs, customer/portfolio/market, interval and aggregate units. `caseFollowupRetentionPins(receipt, customerId)` exposes its job, case and interaction pins for the coordinator. It must be called only after receipt validation. It currently returns no event pins: the trusted authored-plan hook must retain/reconstruct canonical arrival authority independently. There is no invented historical fallback if the retained job or either interaction disappears.

## Executed bounded evidence

Command from the integration worktree:

```sh
rtk node --test --test-isolation=none tests/provider-case-followup.test.js tests/provider-case-followup-ui.test.js
```

The latest focused run, `/tmp/soc-followup-focused-final.log`, passed all ten tests (AC-SOC-700–709), with no skips. Tests use real ordinary Lab voice and digital dispatch, actual human assignment and an accepted digital attempt that times out when the Lab roster is unavailable, followed by real Lab recovery. Provider paid projects, demand reconstruction and authority hooks are explicitly isolated contract fixtures. The test appends the proposed provider provenance trace at the coordinator seam; it does not claim that production Provider dispatch currently appends it.

The tests also exercise coherent receipt edits, no-free-retry refusal, actual Lab save restoration, pure quoting/rendering, serialized helper equivalence and bounded pins. AC708–709 execute the real receipt maker and validator with the real follow-up evaluator, while isolating unrelated progression facts. They test paid-offer scope, no automatic awards, idempotency, historical retirement and rehashed receipt counterexamples. Serialized helper equivalence is not public SOC worker integration. These results do not establish funded Provider L8 delivery, browser usability, a release gate or source acceptance. Earlier unsuccessful test-fixture approaches remain in `/tmp/soc-followup-helper-r*.log`; they are not passes.

## Actual paid Provider development run

`tests/provider-case-followup-dispatch.test.js` AC710 passed in `/tmp/soc-followup-public-r4.log` (63.7 seconds). It starts a fresh SMB, funds all three Swift stages and Cisco programmable engagement, pays A$180 for direct follow-up, waits for a real completed voice conversation, and starts the separate human digital leg through dispatch. It checks one case/job, the original twenty-minute deadline, actual voice and accepted-message units, a full 24-case period, exact settlement, stale quote refusal, duplicate request idempotency, restore and actual worker continuation. Only the settled proof enables an L8 claim; claiming awards no cash, and the managed workflow costs a further A$90 and completes paid delivery. Actual product-path acceptance and historical configuration checks are enforced.

This is a mutable development run, not final candidate evidence. AC710 and AC714 subsequently passed together in `/tmp/soc-followup-public-r5.log` (2/2, 65 seconds), including public-save product-path, deadline, funding and version forgery checks. A public paid retry failure/recovery journey, archival retry-proof retention and browser journeys remain open. No gameplay assertion or research item was promoted by this run.
