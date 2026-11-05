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

The focused helper tests and the real-dispatch retention journey run in the isolated external-reach worktree. The retention journey funds BPO capacity and transcription through quoted operations, claims the measured proof, advances 2,001 minutes through real renewals and history pruning, restores the state, and checks worker/synchronous continuation. Browser acceptance, deployed behavior, source acceptance and all-catalogue fidelity remain pending. No automatic source cash reward is applied.
