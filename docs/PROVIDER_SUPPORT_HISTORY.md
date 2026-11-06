# Provider support-history reconstruction

Version-8 support samples are checked against the paid Provider and customer timelines at the sample minute. Historical reconstruction uses paid stage/configuration provenance, retained work origins and assignments, workforce/payroll history, incident and repair timing, product deployment evidence, and the paid service-boundary receipt. It does not trust the sampled `eligible`, `missing`, resource, or boundary fields as authority.

The customer path and paid service boundary are evaluated only after the commissioned stages and retained voice and digital work make the customer ready. A boundary on identity, phone and engage also depends on the same paid MSP responsibility and all commissioned stage resources: an active carrier outage can invalidate the shared boundary even while the boundary’s own three flow-resource generations remain unchanged. Samples are taken before same-minute commands become historical inputs; the boundary receipt’s same-minute state is reconstructed using the actual sample ordering.

Local speech product dependencies use the retained `speechModels` installation and integration-test rows, scoped to deployment ID, product generation/version, offer, mode and region, and require their real effective/verified timestamps to be at or before the sample. A later current deployment state cannot backdate evidence. Unknown or missing resource history returns an explicit unsupported result; it does not fall back to mutable current configuration.

The call-local validator shares only per-invocation configuration and observation results. It does not persist cache state into saves or workers.

## Focused verification

- `node --test --test-isolation=none tests/provider-support-history.test.js` — 4/4 pass, including carrier outage and paid repair, forged sample rejection, retained-arrival validation, restore, purity and worker serialization.
- `node --test --test-isolation=none tests/provider-product-campaign.test.js` — 14/14 authored product recipes pass funded public campaign deployment readiness.

These focused checks do not establish the regional claims or endgame. Public AC656/T2 journeys, broader provider suites, and final integrated verification remain separate checks.

## Review regression repairs

The PR #43 review exercises additionally exposed three historical projection errors. Paid product resources created by a native `add` can already be enabled at generation 1; their creation must not be replayed as a second configure command. Direct UC/contact integration commissioning changes a native connection, without reconfiguring its phone dependency. Defence support history now reconstructs the finite local-autonomy window from the authored disconnection and the funded local deployment/spares receipts, including exhaustion and repair.

Product-dependent boundaries retain the underlying feature and licence checks while excluding the UC/contact connection test from its own prerequisites. During an actual migration cutover, the prior effective endpoint can still support the paid MSP record even though the generation gap prevents current-service qualification. Explicit owned-site restore commands take effect in the following minute's sample; later recovery writes cannot rewrite an earlier sample.

Focused executions on the review worktree passed the five configuration/dedicated/PN retention tests, seven earned follow-on/local-speech tests, and the native-room replacement/recommission regression. The five regional integration tests also passed, including paid retirement/recommission, same-generation scope retest and actual worker continuation. A new paid native backup restore test passed its same-minute/next-minute generation, import-counterexample and worker checks. The three owned-site platform/migration cases passed across their affected reruns after correcting the transport-repair child-clock receipt to the minute before parent incident resolution. The actual failed dispatch capture also restores and advances after the fix, while a forged receipt using the parent timestamp is refused. Both routed-endpoint recovery tests subsequently passed after historical path reconstruction preserved the native paid migration insertion order. Retained progression regressions remain under investigation. These are mutable-worktree diagnostic results, not frozen final-candidate evidence. The original full-suite and registered-acceptance executions retain their original inputs and failures; final evidence must be regenerated after integration.

## Pruning and qualification review fixes — 6 November 2026

Two independent settlement failures used the count of pruned jobs as if it were a job-ID boundary. Earned external-reach proofs and paid UC/CC task proofs now retain their exact native jobs and arrival events. External reach also retains the two child interactions/cases and its provider meeting. Its optional versioned child marker is validated against the earned receipt; validated legacy saves acquire a derived marker only on an owned restore/dispatch copy. No archive counter is treated as new service evidence. AC-SOC-751 and AC-SOC-754 cover the separate paths; the owner-parked long-play runs remain separate.

Partner qualification now performs paid review without generic configuration writes to identity or customer-context services. It retains the existing cost, staff, lead-time and settlement checks while preserving service-boundary generations. AC-SOC-752 exercises the actual paid review and subsequent distributor-room delivery.

Named-support history distinguishes automatic settlement exits before sampling from explicit customer exits after that minute’s sample, using retained native exit events. New pruning keeps these bounded customer-exit events. Legacy saves without the event use the retained minute cohort; if neither ordering record survives, the prior interpretation is preserved. AC-SOC-753 covers both exit orders and legacy fallback, while the existing explicit-exit cases remain intact.

Mutable-worktree diagnostics passed the first pruning boundary, qualification/distributor delivery, settlement-exit regression and existing explicit-exit cases. Exact saved Tier Two 539→540 and Level Seven 839→840 failure replays now advance successfully. These narrow replays do not prove the entire Tier Two or Level Seven journey, nor repair an old qualification that already rewrote dependencies. Fresh frozen-input verification is required before merge.

The earlier frozen acceptance recorder at be7801e completed 787 tests (771 passed, 16 failed). Its report rejects the inventory because AC-SOC-654–656 were executed but unregistered; all three journeys are now explicitly registered, without asserting they pass. The failed receipt is retained unchanged. Source, coverage, translation and build checks pass on the review worktree. The 99 gate-mutation checks reported three failures and one skip: regenerated mapping accounting fixes the narrative-source test (confirmed by a focused rerun); the two evidence-inventory failures still require freshly executed acceptance evidence. No gate was weakened.
