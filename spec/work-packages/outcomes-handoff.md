# Outcomes pack handoff

The optional `soc-outcomes-1` factory is exported as `SOC_OUTCOMES` from `src/game/46-outcomes.js`. It provides `create`, `command`, `advance`, `evaluate`, `settle`, `validate`, `inspect`, `fingerprint`, and `source`. Saves without `s.outcomes` remain valid; advancing such a state returns zero.

## Need and task-result API

The parent attaches outcomes through `{type:'outcomes', command:{action:'start'}}`; the module command API receives the root state. Configure a full or partial config with:

```js
SOC_OUTCOMES.command(state, { action: 'configure', config: {
  supportedIntents: ['appointment-change'],
  taskIntegrations: [{ intent: 'appointment-change', integration: 'cases', evidence: ['case-updated'] }],
  handoffDestination: 'service-desk',
  maxAttempts: 3,
  repeatInterval: 5,
  repeatEffort: 1,
  contextLossEffort: 2,
  maxRepeatEmissionsPerAdvance: 2
} });
```

Configuration is desired/effective and generation-versioned. Parent dispatch applies due configuration generations after advancing its clock. A need is registered with `{type:'outcomes', command:{action:'need', tenant, person, caseId, purpose, intent, permittedChannels}}`; parent derives tenant/person/case from canonical identity and CRM evidence and authorizes every outcomes command. `action:'task-result'` records a synthetic backend result keyed by `{needId, interactionId}` with `{intent, integration, succeeded, evidence, botAnswered}`. Conflicting duplicate results are rejected. Bot prose or containment alone never proves a task completed.

## Parent interaction hook

For an actual interaction with `needId`, parent finish calls `evaluate` and `settle` on the cloned root state, with actor, technical result, preserved case/identity context and the need's business purpose. Channel policy purpose remains a separate enum on the interaction (for example `service`). A valid but untracked need ID is a no-op. The pure evaluation returns `resolved`, `unresolved`, or `escalate`; settlement recomputes the verdict and is idempotent by interaction key. It never changes the interaction's technical phase. Parent revenue/resolved counts include a need-bound interaction only when the need verdict resolves.

The verdict describes the customer need. It must not overwrite the parent interaction's technical phase, clear recording or other mandatory obligations, or treat transcripts as business-task evidence. `technicalSuccess` is retained on each outcome attempt so a need may be resolved from explicit task evidence while a separate technical obligation remains.

## Repeat-arrival hook

`advance(state, hooks)` never increments the parent clock. To emit a due repeat, the parent supplies:

- `channelAvailable(state, need, channel)`, returning literal `true` only when that permitted channel can take the arrival.
- `emitRepeat(state, request)`, which reserves a central interaction ID and queues the request. The parent starts it through the canonical path after `advance` returns, preventing a synchronous finish before the repeat reservation is recorded.

The request carries the same tenant/person/case/purpose, a selected permitted channel, `needId`, `repeatOfInteraction`, `originalAttemptIdempotencyKey`, a unique repeat `idempotencyKey` and `usageToken`, `newContact:true`, and `noDuplicateOriginalCharge:true`. The parent repeats with the original channel-policy purpose and creates a separate usage event for the new accepted message/call. Only reprocessing the original attempt is deduplicated. If no permitted channel is available, the need stays open and the due time moves forward one parent minute. An emitted repeat stays outstanding until its actual interaction is settled, preventing duplicate arrivals.

## Limits and verification

Repeat attempts and emissions are bounded by the captured need contract and a per-advance emission cap. Exhausted, escalated, and unresolved needs remain saved; the module does not prune them or manufacture completion. Task outcomes are explicit synthetic inputs, not live AI or network calls. `fingerprint` covers effective/desired contract configuration, not needs, attempts, task-result progress, or metrics.

Task integration availability has a narrow synthetic implementation: `cases` resolves to the observed core CRM resource when identity mapping is effective; `engage` resolves to the observed workflow only while its configured CRM and service queue dependencies are ready; `room` requires the observed room, calendar and configured account identity. Unknown IDs and IDs with the wrong resource kind remain unavailable. `task-result` is an explicit synthetic backend outcome, not evidence fetched from a live service.

`tests/outcomes.test.js` covers AC-SOC-079–084. `tests/journey-integration.test.js` covers AC-SOC-094–098 across parent dispatch, repeat emission, task evidence, identity/case binding, task-resource failure, save validation and worker parity. This is synthetic integration coverage, not live backend or provider verification.
