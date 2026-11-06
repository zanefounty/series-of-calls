# Provider support-history reconstruction

Version-8 support samples are checked against the paid Provider and customer timelines at the sample minute. Historical reconstruction uses paid stage/configuration provenance, retained work origins and assignments, workforce/payroll history, incident and repair timing, product deployment evidence, and the paid service-boundary receipt. It does not trust the sampled `eligible`, `missing`, resource, or boundary fields as authority.

The customer path and paid service boundary are evaluated only after the commissioned stages and retained voice and digital work make the customer ready. A boundary on identity, phone and engage also depends on the same paid MSP responsibility and all commissioned stage resources: an active carrier outage can invalidate the shared boundary even while the boundary’s own three flow-resource generations remain unchanged. Samples are taken before same-minute commands become historical inputs; the boundary receipt’s same-minute state is reconstructed using the actual sample ordering.

Local speech product dependencies use the retained `speechModels` installation and integration-test rows, scoped to deployment ID, product generation/version, offer, mode and region, and require their real effective/verified timestamps to be at or before the sample. A later current deployment state cannot backdate evidence. Unknown or missing resource history returns an explicit unsupported result; it does not fall back to mutable current configuration.

The call-local validator shares only per-invocation configuration and observation results. It does not persist cache state into saves or workers.

## Focused verification

- `node --test --test-isolation=none tests/provider-support-history.test.js` — 4/4 pass, including carrier outage and paid repair, forged sample rejection, retained-arrival validation, restore, purity and worker serialization.
- `node --test --test-isolation=none tests/provider-product-campaign.test.js` — 14/14 authored product recipes pass funded public campaign deployment readiness.

These focused checks do not establish the regional claims or endgame. Public AC656/T2 journeys, broader provider suites, and final integrated verification remain separate checks.
