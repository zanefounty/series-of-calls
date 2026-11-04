# Provider gameplay rebuild candidate

The implementation branch is `feature/provider-gameplay-rebuild`. The pack is preserved in `spec/provider-gameplay-v1/`; those files are the supplied specification, not completion receipts. Provider campaign is the default entry. Training, Lab and the physical SP experience remain separate.

## Revision reconciliation

The supplied review used port `4d354ddb6118caccee9c4eea10ff8d879bc0be4c` and upstream `b2366ed26018f957309292d04adf5d6e76a89c65`. This branch started from main `dcc11d0a81d36f2fff111bff5cc8e530ecca6e85`. The intervening governance, security, publication, transport headroom and lease recovery changes were retained. The rebuild uses a separate worktree and genuine history; it does not replace the original project.

## Play locally

Use Node 24, `npm ci`, then `npm run serve`. Play / Continue opens the provider career. New career exposes all four scenarios without requiring a completed earlier career. The game starts paused. Compare a plan in Deals, commit its managed-service stage, select that customer, and purchase the external-calling and partner stages. Resume delivery. Resource provisioning and actual delivered work are separate.

Swift Start costs less initially and commissions faster, with higher recurring supplier costs. Steady Route commits more capital and takes longer, with lower recurring costs. The quote shows all three required stages, staff commitment, usage prices and the conditional operating forecast. Normal initial capital is A$20,000 (Easy A$25,000; Hard A$16,000); all customers share it. Values are fictional balance rules in `content/provider-campaigns.json`, mirrored in the worker-safe rules module.

Incidents pause the UI. Acknowledge the affected service and quote a funded repair or mitigation in Operations. Finance displays actual period settlements and credits. The first mission requires two full qualified, profitable periods and funded expansion. Continue operating resumes construction of the next customer without creating a second treasury. BPO workers are separate from customer workers and provider engineers/support; a coaching course temporarily removes its named BPO worker from eligible service.

## Reference strategies

| Opening | All-stage setup | Supplier commitment / period | Implementation work | Tradeoff |
|---|---:|---:|---:|---|
| Swift Start | A$6,000 | A$1,020 | 3 + 2 + 2 minutes | More cash available for early capabilities and expansion; higher recurring costs |
| Steady Route | A$10,000 | A$720 | 8 + 3 + 3 minutes | More capital and time committed initially; lower recurring costs |

These are Sydney reference terms before new-contract rival pressure. Both include base, carrier and partner stages; provider payroll and actual voice/message usage are additional. Inspect the quote before committing. Sydney, Melbourne, Seattle, Tokyo and Dublin have authored willingness factors; a seeded rival-bundle event changes new offers after six to eight periods. Existing agreements retain their accepted terms.

For either SMB opening, fund the base stage, resume its work, connect external calling and buy the partner capability. Watch the actual service and work feed. At the carrier incident, acknowledge it and compare repair with capacity mitigation: the latter takes longer and costs more but provisions an extra actual capacity unit. Resume delivery and inspect Finance after settlement. Recover early enough to deliver at least 22 of 24 due cases in each of two full profitable periods, then fund the next customer. A brief probe, purchase or empty period cannot win the mission.

After the milestone, **Continue operating** commissions the funded customer with the same cash and team. **Enter enterprise segment** instead opens the next segment's opportunity while retaining existing customers, obligations and history. Earn enterprise and government milestones to unlock government and defence in the same career. Each segment also remains directly available in New career. Eligible customers must be renewed through actual history; exiting previews outstanding jobs and minimum supplier payments. In-flight work settles after exit, while new arrivals stop.

## Segment decisions

| Segment | Reference build beyond base/carrier/partner | Distinct service evidence |
|---|---|---|
| SMB | Repair or capacity mitigation; optional BPO, channels or assurance | Actual calls/digital cases, service credits, profitable settled delivery |
| Enterprise | Meeting room, consented recording and migration | Duration-bearing room sessions, identity/number dependencies, completed migration and continuity |
| Government | Recording, transcription and scoped compliance contracts | Captured source, actual processing and versioned workload-boundary evidence; both opening plans are tested |
| Defence | Pre-provisioned local dependencies, room and recording | Actual completed work during external disconnection, retained work, reconnection and settled delivery |

All conditions are fictional exercise requirements. Country and deployment labels confer no real regulatory or security approval.

Fourteen Microsoft/Cisco family recipes are paid operations with actual prerequisites and product readiness. Social messaging, workplace chat and supported video change eligible work in the following period while conserving 24 customer cases and mandatory calling floors. Channel delivery uses actual asynchronous attempts, receipts, quotas and case-preserving human handoff. Provider assurance has a capped repair budget and can be suspended; suspension leaves already funded jobs and support commitments payable. Paid BPO cover adds named people, and coaching removes its assigned person from service until completion. Quality findings are derived from a consented service record rather than authored grades.

## Verification policy

Screenshots, raw logs and full saved states belong outside Git. `scripts/provider-browser.js` records visible-control journeys using the locked application Playwright version. The long-run provider soak is a distinct declared fixture; a 2,001-minute empty or ordinary root is not a substitute for 20 active customers and sustained demand. A focused test or a green build does not establish release completion.

The canonical source catalogue, research acceptance and release readiness remain separate. The representative product recipes do not dispose of all distinctive feature obligations. No source exclusion or owner research acceptance is inferred from this rebuild.

## Exploratory human pilot — pending participants

Recruit 6–8 people who have not worked on this implementation. Record their prior familiarity with provider games and communications. Counterbalance the order: half use the upstream game first, half the provider candidate first. Use the same desktop, time allowance and initial explanation for each session. Record the actual candidate commit, seed, scenario and browser.

Give each participant 20–30 minutes to choose a plan, deliver service, respond to an incident and decide whether to expand. Ask them to think aloud; do not supply a solver sequence. Record time to first consequential choice, time to first delivered service, quote comprehension, mistaken expectations, incident diagnosis, plan changes, requests for help and voluntary continuation. Afterwards ask them to explain the cost tradeoff, what caused a failed job, what the bill reflects, and what they would change next.

Report individual observations and the counterbalanced order alongside aggregates. Separate observed behaviour from participants' opinions. Participation and results remain pending until people actually take part; automated browser runs do not count as this pilot.
