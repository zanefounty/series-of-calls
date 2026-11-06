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

Focused executions on the review worktree passed the five configuration/dedicated/PN retention tests, seven earned follow-on/local-speech tests, and the native-room replacement/recommission regression. The five regional integration tests also passed, including paid retirement/recommission, same-generation scope retest and actual worker continuation. A new paid native backup restore test passed its same-minute/next-minute generation, import-counterexample and worker checks. The broader owned-site migration/recovery rerun remains in progress at this note. These are mutable-worktree diagnostic results, not frozen final-candidate evidence. The original full-suite and registered-acceptance executions retain their original inputs and failures; final evidence must be regenerated after integration.
