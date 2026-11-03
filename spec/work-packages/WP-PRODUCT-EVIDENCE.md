# WP-PRODUCT-EVIDENCE

## Scope and claims

This optional pack supplies a bounded, fictional evidence workflow for three dependency slots in the product-family model: `jurisdiction-evidence`, `eligibility-evidence`, and `lifecycle-evidence`. Its purpose is to let the synthetic government-family scenario progress when the actual scenario state supports it. It does not establish real vendor certifications, legal approval, government authorization, or current product availability. Every generated record must carry `synthetic: true` and `externalApprovalClaim: false`.

Evidence is scoped to an existing product deployment, feature, dependency slot, actual root resource, family, offer, version, mode, product-deployment generation, and root jurisdiction/scenario. The command never accepts caller-supplied “approved” flags or arbitrary proof payloads. A request snapshots scope from the saved product deployment; evaluation uses current trusted runtime sources.

## Evidence inputs

- `eligibility-evidence`: the current business supplier qualification for the active scenario, read from the business state and checked against its expiry. It is a fictional qualification receipt, not a real government approval.
- `jurisdiction-evidence`: a currently effective boundary contract bound to the target resource, an eligible boundary evaluation, the actual 55 enforcement result, and a contract profile matching the root jurisdiction. It is a fictional scenario check, not legal advice or an approval claim.
- `lifecycle-evidence`: the specialist lifecycle pack's current supported evidence for the exact product deployment. The evidence must be ready, supported, and scoped to the same offer, product version, generation, and feature set.

The central adapter supplies trusted hooks for boundary enforcement and specialist lifecycle inspection. Missing hooks or missing packs produce explicit unavailable/blocked results. A positive boolean with no underlying contract, qualification expiry, or lifecycle scope is insufficient.

## State and lifecycle

An evidence request follows `desired request → pending provisioning → evaluated effective proof`, or becomes failed with named blocking reasons. A new product generation, changed version/mode/family/jurisdiction, changed feature scope, stale boundary contract/resource generation, revoked lifecycle support, expired qualification, or explicit revocation makes the proof unavailable immediately. Historical records remain for inspection, but stale records do not satisfy current dependencies. A fixed synthetic evidence lifetime also bounds otherwise-current proofs.

The module exports `create(root)`, `command(root, command, hooks)`, `advance(root, hooks)`, `validate(root, hooks)`, `inspect(root, hooks)`, `fingerprint(root)`, `availability(root, kind, resourceId, context, hooks)`, and `source()`. `availability` is pure and is the integration entry point for `45-products.js` / the central dependency observer.

## Acceptance

- A valid government-family deployment remains blocked until all requested scope-specific evidence becomes effective.
- Evidence is issued only for declared dependencies and existing resources on an actual product deployment.
- Eligibility proof stops working at business qualification expiry.
- Jurisdiction proof stops working when the boundary binding, effective contract, profile, resource generation, or central enforcement changes.
- Lifecycle proof stops working if support is ended or product deployment scope changes.
- A revoked request cannot satisfy a dependency; a fresh request after repair may.
- Forged caller flags, wrong deployment/resource/feature scope, tampered proof IDs, expired proof, and stale generations fail validation or availability.
- Inspection and availability are pure; deterministic save validation and worker serialization preserve the evidence state.

## Remaining limits

The pack does not model external approval workflows, audit identities or signatures, national accreditation catalogues, official service registrations, real vendor support matrices, language-model/version support, or real procurement evidence. Those dependencies must remain unavailable until the runtime has a source-backed, validated model. A synthetic scenario result must never be presented as a current factual claim.
