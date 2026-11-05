# Provider progression receipts: implemented claim scope

This document records the bounded receipt implementation in `src/game/23-provider-progression-receipts.js`. It covers four canonical identities with executable evidence adapters. The other progression identities remain visible and blocked until they have their own source-supported predicates and validated evidence. Readiness is not a claim, and a claim does not award money.

## Supported identities

| Canonical identity | Evidence required | Costed choice exposed after the claim |
| --- | --- | --- |
| `progress.goal.bb` — First customer live | One customer with completed and paid base, carrier and partner stages; current ready resources; retained resolved human voice and message work tied to real jobs, interactions, assignments and tenant cases. | No separate unlock is attached to this foundational claim. |
| `progress.progression-level.1` — Local UC reseller | The same customer as the first-live receipt, with an actual qualified full-period settlement, central ledger postings and positive consolidated operating result. | `managed-carrier-headroom`, quoted through `SOC.provider.quote`: A$80 setup, A$60 per period, six minutes, zero engineers and one support reservation. It adds four real concurrent carrier sessions after delivery. |
| `progress.goal.bz` — First managed business contract | A non-starter active or renewing customer; accepted retail terms; paid completed stages; recent qualified full-period settlement with actual customer and central postings; resolved voice and message work; and current same-customer MSP responsibility backed by paid shared payroll. | `integrator-room`, quoted through `SOC.provider.quote`: A$650 setup, A$100 per period, eight minutes, one engineer and one support reservation. It commissions a room and calendar path. The campaign then schedules and delivers an actual meeting. |
| `progress.progression-level.2` — Regional communications MSP | A prior Level 1 receipt in the cohort; at least two active customers in the eligible markets recorded by the window; 60 retained, validated consecutive support samples; current paid stages, supported boundaries, MSP responsibility, human work and actual customer and central settlements across the cohort. | `regional-provisioning`, quoted through `SOC.provider.quote`: A$150 setup, A$80 per period, four minutes, zero engineers and one support reservation. Its v2 policy scope is provisioning-only and limited to markets recorded in the receipt. Each customer order still needs its own quote, funds and capacity. |

Amounts above are simulator cents converted to Australian dollars. The quote engine remains the source of commercial terms; receipt inspection can ask it for a current proposal but never commits a purchase.

## Evidence and persistence

Receipts are stored under `providerCampaign.progressionReceipts` with pack, schema and content versions. Saves without this field remain legacy saves. Unknown versions, unknown identities, duplicate receipts and malformed or invalid references are rejected. Claiming is idempotent and returns a copied state; it does not mutate the caller's state or treasury.

Each receipt retains compact source evidence, customer and portfolio scope, paid project and posting references, observed resource generations, resolved work proofs, settlement proof where applicable, and an integrity digest. The digest detects accidental edits; it is not treated as authority. Restore validation checks retained Provider projects, actual jobs, tenant interactions/cases, workforce assignments, campaign arrival events, settlement history and central ledger postings. When bounded histories have pruned a referenced item, validation accepts only the corresponding validated retention checkpoint and matching compact proof. Rehashing altered evidence does not make it valid.

Historical claims survive subsequent service loss when their referenced proof remains valid. Current eligibility can still be lost; this does not erase an already earned historical receipt. The support-window claim snapshots the 60-minute cohort and validates the exact sampled customers, markets, responsibility, boundaries, settlements and work. A changed observation window cannot rewrite that snapshot.

## Authority and integration

The pure helper exports `eligibility(state, sourceId, hooks)`, `claim(state, sourceId, hooks)`, `unlockProposal(state, sourceId, hooks)`, `inspect(state, hooks)`, `validate(state, hooks)` and `source()` for the worker kernel. Provider dispatch owns command authorization, once-only behavior, save validation and worker integration. The helper does not create evidence by itself: it derives claims from `SOC_PROVIDER_PROGRESSION_FACTS` and validated roots/resource observations. Training state is not accepted as Provider evidence.

An unlock descriptor identifies a paid operation and requires a fresh `SOC.provider.quote` result. The regional descriptor additionally carries the exact proven markets and a provisioning-only policy scope. The reviewed policy remains bounded by its saved customer scope, cash floor, lifetime budget, action count and staffing ceilings. No unlock mints a resource or bypasses ordinary project delivery.

## Executed checks and remaining scope

The focused test suite uses actual campaign commands and real Provider quotes. It covers legacy and unknown versions, positive first-live/sustainable/nonstarter/regional claims, dispatch and worker parity, idempotency, rejected and rehashed evidence, receipt restore, ledger/work pruning, support loss, scoped regional policy purchase, and a paid integrator-room project followed by the campaign's scheduled delivered meeting and named Twig responsibility record.

The other 28 canonical identities remain blocked with measured missing evidence. The receipt tests do not establish all progression predicates, all 32 useful unlocks, every product-family path, full source fidelity, browser acceptance or human pilot evidence. Those remain separate release obligations in `docs/PROVIDER_PROGRESSION_CONTRACT.md` and the gameplay acceptance register.
