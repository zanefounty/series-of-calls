# Provider external reach progression adapter

This document records the bounded Provider representation for canonical source `progress.goal.tr`. It does not change the source pack or mark the source obligation accepted.

## Preserved source

The original goal is **“Reach the whole internet”**, with the comparison: **“Your eyeballs want everything. Buy IP transit from a Tier 1 or Tier 2 in your city. Transit gives you the full routing table.”** Its original predicate checks that transit exists and its reward is source-game cash. The Provider version keeps the idea of reaching outside the local network while preserving the joke’s ambitious “everything” comparison. Source-game cash has no conversion into Provider money.

## Fictional Provider evidence

`SOC_PROVIDER_EXTERNAL_REACH.evaluate(state, customerId, hooks)` is a pure current-readiness adapter. A ready result requires one active or renewal Enterprise customer with accepted retail terms, validated tenant root, paid completed base/carrier/partner stages, a paid effective room, and all of the following from that same customer:

- An autonomous completed outbound voice job to an external E.164 destination, with a matching arrival event, retained case, resolved non-probe interaction, no outstanding obligations, positive requested duration and observed usage, ordered route, active owned caller number, permitted prefix, carrier admission, signalling, and both media directions.
- A separate autonomous completed inbound voice job with the same retained case and resolution requirements, an active called number and holder, ordered inbound route, inbound permission, carrier admission, signalling, and both media directions.
- A completed Provider-scheduled guest meeting whose authored Enterprise rule names a foreign synthetic guest tenant. The meeting must match the saved Provider row, booking and session; prove guest admission and presence for the authored duration; use the current guest-policy and platform generations; and have bidirectional media. Meeting capture is checked when that session's profile enabled recording. A join probe, attendee count, configured `guestJoin` permission or stale session does not count as delivery.

Queued voice calls do not have an `interaction.connectedAt` field. For the version 4 Enterprise scenario, the actual `AGENT_ASSIGNED` trace records `minimumConversationMinutes` and `handlingMinutes`; a matching `WRAP_UP` must occur after at least that requested span. The proof then requires the Provider job's `voiceMinutes` and `observedUsageMinutes` to equal the resolved interaction's actual `usageMinutes`, which must meet the requested duration. These usage totals can include queue occupancy, so queue wait alone never establishes the required conversation span. The receipt also binds the retained interaction's two-way media, empty obligation list, outcome and traces, and the guest admission ID follows the canonical `guest-<booking>-<session>` form.

The adapter saves paid project and posting IDs, resource generations, job/event/interaction/case IDs, complete external admission snapshots, the relevant traces, guest booking/session evidence and the evidence interval. Its agreement reference is the immutable original `customerAcceptedAt`, so a later retail renewal does not replace the terms under which the original service was accepted. Historical receipt validation rechecks retained records and explicit retention checkpoints. It allows later supported resource generations and accepted retail renewals while preserving the original paid and delivered facts. Current readiness still requires current guest policy, room platform and call-admission generations.

## Earned receipt and paid alternative

The progression receipt helper handles `progress.goal.tr` atomically and idempotently through the existing claim command. Claiming stores evidence only; it does not credit cash, staff, capacity, numbering or service. The receipt unlock descriptor is `provider-managed-external-reach-v1`. It offers the authored `managed-external-reach` operation in the recorded market, quoted and revalidated through `SOC.provider.quote`. The ordinary `direct-external-reach` alternative remains separately available under its existing eligibility rules. Both alternatives require funded delivery and commissioning.

The current authored terms are:

| Operation | Setup | Recurring | Work lead | Engineers | Support |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct external reach | A$300 | A$50 / period | 8 minutes | 1 | 0 |
| Managed external reach | A$150 | A$80 / period | 10 minutes | 0 | 1 |

The lower setup and engineering commitment of managed reach trades against greater recurring exposure and a longer work lead. The paid delivery adds scoped carrier sessions, authored number aliases and an explicit international prefix/route; it does not add customer agents, seats, or general permission. Actual outbound/inbound demand must exercise the new scope after delivery.

## Integration and status

The helper is worker-serializable through `source()` and must be assembled before Provider progression facts and earned receipts. Those facts expose the canonical goal row and the receipt adapter validates the retained source evidence before claim and on restore. The helper expects mission rules, customer-root lookup and resource observation through trusted hooks.

The bounded real-dispatch retention case is AC-SOC-751. It funds BPO capacity and transcription through quoted operations, claims the measured proof, advances the fresh campaign to the first job-pruning boundary at clock 420, checks retained paid voice jobs, provider arrival events, child interactions/cases and the actual guest meeting booking/session, then restores and checks worker/synchronous continuation. It also checks pure legacy-marker migration and rejects malformed or re-sealed forged retention markers. The separate 2,001-minute journey was not run for this bounded verification.

AC-SOC-751 diagnostic execution: `rtk proxy env NODE_PATH=/home/zane-fountylabs/workspace/zefun/series-of-calls/node_modules node --test --test-isolation=none tests/provider-external-reach-retention-boundary.test.js`; result `1/1 pass`, 209,582 ms total, log `/tmp/soc-external-reach-retention-boundary-ac751-final.log`. The supplied dependency override is disclosed and is not the locked-dependency baseline. The SHA-256 values below were captured after launch while the process was running, not before launch and not from a launcher manifest. Root changed shared runtime code during that run, so these hashes do not establish the exact launch inputs; treat this as mutable-worktree diagnostic evidence, not frozen-head proof. A fresh run on frozen inputs remains outstanding. Post-launch worktree snapshot SHA-256: test `9a73e26a5f8d1f7add5cc2778123a5da27498ecfbc744e665b0bd0207a7b58b9`; runtime files `src/game/23-provider-external-reach.js` `c92b2b45a0ca427f426e5536420ea20d4a98601227b326c21498fbb5f7b8968d`, `src/game/23-provider-history.js` `94c169e09443efa8bc215b8d5de17b7af0a0e7f53b2af5115546cd23c8169a84`, `src/game/25-provider-campaign.js` `1804785266b64b2e128f4c61c7ea6a8f605519810dcd820fdb22b22162bcf89e`, and `src/game/55-communications.js` `74fdd4fc913fb95ae1765bf77b25a3162de31069b65f58085e06d2407fd457e6`.

Browser acceptance, deployed behavior, source acceptance and all-catalogue fidelity remain pending. No automatic source cash reward is applied.
