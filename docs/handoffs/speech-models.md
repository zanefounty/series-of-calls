# Local speech model pack handoff

**Source scope:** `uc-new:family:cisco:local-speech` (“Disco local transcription”), a proposed synthetic family with no direct upstream equivalent. The preserved profile calls for local inference, languages, supported stages, versioned integration, stored outputs, operator effort and licensing connectivity to remain distinct. Its note says exact features, region, version and licensing evidence are per offer; a local label does not establish disconnected operation. This pack supplies a bounded training mechanic, not a disposition of the full profile.

The reference review and preserved design distinguish hosted speech processing from customer-operated local inference, and call out capture permission, processing location, storage, licensing and offline access as separate conditions. The cited disconnected-container and deployment documents are evidence about their named real services and dates only. This synthetic model makes no claim about Cisco, AI POD, another vendor, a real model, its supported languages, a license, certification, current compatibility or legal eligibility. Its only model ID is `scenario-local-speech`, with `scenario-MAJOR.MINOR.PATCH` versions.

## Runtime and dispatch contract

`src/game/27-speech-models.js` is a pure factory with `create(root)`, `command(root, command, hooks)`, `advance(root, hooks)`, `validate(root)`, `inspect(root, hooks)`, `fingerprint(root)`, `availability(root, dependencyKind, resourceId, productContext, hooks)`, `processingGate(root, request, hooks)` and `source()`. The shared dispatcher starts the optional pack with `{type:'speech-models',command:{action:'start'}}`; old saves remain valid without it. It dispatches `install` and `test-integration`, advances it before the product pack on each tick, validates/imports it, includes `source()` in worker source and exposes its inspect report to the parent panel.

Commands use the existing central command validator/dispatcher. `install` creates desired installation state and queues provisioning for the next tick. It snapshots the selected deployment generation and product version; a product deployment can still be provisioning while the model and integration are staged, allowing those dependencies to resolve before the product deployment becomes effective. Provisioning fails with explicit reasons if the deployment is stale or wrong-family, compute is absent/insufficient, permission is missing, location is wrong, licensing is unavailable, model language/stage is unsupported, or offline operation is requested without both model capability and cached offline authorization. A failed attempt remains visible; after correcting prerequisites, a new installation command provides a reviewable recovery record.

`test-integration` queues a versioned test for a pending or ready installation. It cannot submit a claimed success. During advance, installations resolve before tests, then the product deployment observes their typed `language-model` and `integration-version` evidence. The parent `integration` hook returns `status: 'scenario-verified'` only when its deterministic synthetic adapter matches the requested deployment ID/generation, product version, offer, integration ID/version, model version and region. A failed/mismatched test produces failed evidence; a correctly scoped retry creates a new test record. Both the installation and test evidence are deployment-scoped, synthetic and explicitly carry `externalApprovalClaim: false`.

## Parent hook shapes

All hooks are deterministic, read-only lookups over the current state. Missing hooks/data fail closed.

```js
deployment(root, deploymentId) => {
  id, family: 'cisco:local-speech', mode: 'customer-operated-local',
  status: 'ready' | 'provisioning', generation, productVersion, offerId, region
}

resource(root, resourceId, role) => {
  // role is compute, permission, or licensing
  // compute: ready, generation, region, localInference, capacity,
  //          offlineSupported, languages[], stages[]
  // permission: ready, generation, deploymentId, localSpeech
  // licensing: ready, generation, deploymentId, connected,
  //            offlineAuthorized
}

authorize(root, { operator, action, scope, source }) => true | false

integration(root, {
  integrationId, integrationVersion, deploymentId,
  deploymentGeneration, productVersion, modelVersion, region
}) => {
  status: 'scenario-verified', integrationId, integrationVersion,
  deploymentId, deploymentGeneration, productVersion, offerId, region
} | { status: 'blocked' | 'missing', reason }
```

`resource` is the explicit seam where the parent translates effective resource state, information-processing permission, local compute, regional processing and licensing state into typed observations. It must not derive availability from a product label or from the requested configuration. An offline-capable installation can be prepared while connected; offline processing requires `offlineAuthorized` and `offlineSupported` true. When disconnected, work must use that offline capability. When connected, the same installation can process online.

The product hook intercepts `language-model` and `integration-version` before ordinary resource lookup, then calls `Speech.availability(root, kind, resourceId, context, speechHooks)`. This pack supplies typed scenario evidence for those two dependency kinds. Other product dependencies continue through their existing observers. Government recording creation checks the bound speech product feature gate before adding any processor artefact. Product-bound information jobs retain the complete model scope `{deploymentId,family,generation,mode,offer,productVersion,region,modelResourceId,integrationResourceId}`. Each processing stage calls `Speech.processingGate` with that scope plus source language, stage, compute units, processing region and online/offline status. The requested model and integration resource IDs must resolve to the same effective installation. A false result blocks the job with its reasons; permission is checked from effective information and recorder configuration.

The UI exports `socSpeechModelsPanel(s, results)` and `socBindSpeechModels()` for the parent game mount. It uses `N_` keys listed in `docs/handoffs/speech-labels.json`; merge those English values into `src/i18n/en.js` when the parent integrates the panel. The UI exposes the optional pack start, typed installation and versioned adapter test. It marks the synthetic boundaries and does not present these forms as real product or licensing approval.

## Acceptance and boundaries

The isolated tests cover queued/effective installation and integration evidence, supported-language/stage/compute gates, denied permission, insufficient compute, location mismatch, licensing and offline authorization failures, recovery after correction, save tampering, and main/worker equivalence. They do not certify an external provider, establish all language-model capabilities, or complete all mapped speech-processing obligations. The source profile and wider design still require separate review of capture, storage/output lineage, operating effort, retention, regional scope and actual information-policy integration.
