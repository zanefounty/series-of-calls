# Product compatibility module handoff

**Status:** optional module implemented and module-tested; central kernel, shared command dispatch, UI, catalogue register and full interaction-path integration are not implemented by this handoff. This is not product parity or real supplier compatibility evidence.

## Module API

`src/game/45-products.js` exports `SOC_PRODUCTS` (`socProductsKernel` factory). It is classic JavaScript and `source()` returns a worker-serializable factory declaration. The module takes the whole root state object for every operation and stores data at `state.products`.

- `create(state)` returns `{pack:'soc-products-1', version:1, offers, deployments, integrations, events, nextId}` for the kernel to attach to `state.products` when a scenario opts in.
- `command(state, command, hooks)` handles `offer`, `lifecycle`, `deploy`, `configure`, `integration` and `test-integration`. It mutates only `state.products`; the kernel must call it only on its command clone and commit only after its normal validation/revision checks.
- `advance(state, hooks)` applies due offer lifecycle and deployment generations. Call once per simulation minute after root `state.clock` has advanced and before gameplay consumers inspect product state.
- `validate(state)` validates the full product pack and cross-references offers, families, generations and compatibility edges. Saves without `state.products` should skip this validator.
- `inspect(state)` and `fingerprint(state)` are pure. `featureStatus(state, deploymentId, featureKey, hooks)` checks the effective deployment, offer support lifecycle and current dependency observations. `compatibilityStatus(state, integrationId)` distinguishes unverified, stale and recorded synthetic results. A passed result is scoped to the exact directional feature mapping, version and deployment generations.
- `source()` is required when the kernel builds its worker script; the worker must include `SOC_PRODUCTS` before constructing its own SOC kernel.

## Required kernel hooks

Pass these hooks as the third argument to `command` and the second to `advance`, `featureStatus` and `test-integration`:

```js
{
  authorize(state, objectId, action) {
    // Return true only after the shared business/delegation and resource-scope checks pass.
  },
  observeDependency(state, dependencyKind, resourceId) {
    // Return { ready: boolean, generation?: integer, reason?: string }.
    // Read current effective/observed resource state; do not trust desired state alone.
  },
  testDirectionalPath(state, sourceDeployment, targetDeployment, integration) {
    // Return true or { ready: boolean, reason?: string } from an actual synthetic path test.
  }
}
```

Dependency kinds and references are explicit configuration. The kernel adapter must translate kinds to the appropriate core resource checks (for example `identity`, `carrier`, `calendar`, `workforce`, `capture-permission`, `compute`, `licensing-service`, `media`, or synthetic jurisdiction/eligibility evidence). Generic resource readiness alone is insufficient when the requirement depends on a field such as calendar enabled, a staffed roster, current local licensing or an approved synthetic channel. Do not automatically turn an evidence reference into a positive result. If a dependency or directional path is not observed, the module reports a blocked/unobserved result.

The shared dispatcher should add an opt-in start action that sets `state.products = SOC_PRODUCTS.create(state)`, a command route to `SOC_PRODUCTS.command(state, payload, hooks)`, conditional validation and inspection, advancement, calculation/fingerprint participation, and worker serialization. It should perform normal actor authorization, stale revision checks, atomic clone/commit and save validation. Offer IDs and deployment IDs must also be scoped by the central identity/ownership policy; the module's hook is intentionally generic so it does not invent kernel permissions.

## Modeled contract and limits

The fourteen family keys match `uc-new:family:*` in the preserved mapping and the family records in `product-profile-obligations.json`. They use the mapped fictional names Microsnoft and Disco and their mapped organization references (`provider:msf` and `actor:disco-collaboration`). Their `features` are a closed vocabulary of **synthetic scenario slots**, derived from the source implementation descriptions. They are not current product feature assertions. Target examples from source rows are not accepted as arbitrary feature identifiers. Offers select a subset from the family vocabulary; deployments select an offer, synthetic version label, allowed scenario deployment mode, feature subset and explicit dependency references.

Lifecycle is offer-scoped and separates `sale` (`available` / `ended`) from `support` (`supported` / `ended`). Changes become effective after the next simulated minute. Sale closure prevents new deployments; end of support prevents the module from reporting a scenario feature as available. Existing deployments and their effective generations are retained for inspection. Quantities have explicit units; this module does not set prices or merge seat, agent, session, room, API, processor or storage amounts.

Integrations are directional. Each edge names source and target deployments, a source-to-target feature mapping, exact synthetic version labels and captured generations. A test records either `scenario-verified` or `blocked` with per-feature checks, reason codes and `externalSupportClaim:false`. Reconfiguring either endpoint makes the captured compatibility result stale. It cannot be used to assert manufacturer support, certification, eligibility, sale availability or general interoperability.

Current profile-specific constraints include distinct deployment-mode allowlists; explicit feature prerequisites; separate local licensing dependencies; a scenario-only conflict between protected meeting mode and meeting intelligence; and jurisdiction/workload evidence dependencies that are never approvals. There is no guessed price, real vendor fact, live integration, generalized feature parity, or legal approval. The module does not provision core resources itself: the shared kernel must own authorization, resource configuration, generation conflicts, provisioning and delivery-path checks.

## Test coverage

`tests/products.test.js` has AC-SOC-085–090 module-level coverage using real `SOC.create` and core resource observations:

- enumerates all fourteen mapped families, recognizes their own scenario feature/mode contracts, rejects source target-example strings as unsupported features, and provisions a positive synthetic deployment for every family;
- proves independent sale/support lifecycle transitions;
- checks deployment mode, offer feature subset, dependency blocking, old effective-state retention and invalid-save rejection;
- tests directional feature mapping, exact version/generation scope and stale compatibility;
- exercises the meeting feature conflict, synthetic jurisdiction evidence and local licensing dependency;
- validates JSON save/restore, pure repeated inspection/fingerprints and deterministic worker-source execution.

Tests invoke the module API directly with core-state fixtures and adapter hooks. They do **not** prove central `SOC.dispatch` routing, shared command authorization, config UI, commercial metering, live calling/meeting/CC path integration, kernel worker construction, or current real-world vendor compatibility. Those remain parent integration and evidence work.
