# WP-ESTATE implementation handoff

Module: `src/game/48-estate.js`; acceptance tests: `tests/estate-operations.test.js`.

## Parent integration contract

Add `SOC_ESTATE` to the classic worker source before the central kernel and load the same module in Node. Attach `estate: estate.create(s)` when starting the pack. The kernel must call `estate.validate(s)` from save validation and `estate.advance(s, hooks)` during each simulated minute. Add `type: 'estate'` with `command` to the central command schema and dispatch it only after the normal authorization/clone boundary. The pack's clock is read from `s.clock`; the module does not advance time or mutate on inspection.

The hook signatures are:

```js
getResource(state, resourceId) // central resource record, including desired/effective/generation
applyResource(state, resourceId, completeConfig, expectedGeneration)
applyLeaver(state, resourceId, completeConfig, revocations, expectedGeneration)
nativeMeetingRequired(state, resourceId, firmware)
nativeMeetingCompatible(state, resourceId, firmware)
```

`applyResource` calls the central configuration validator and authorization path, rejects when the current generation differs from `expectedGeneration`, then schedules ordinary provisioning. It does not assign effective state directly. `applyLeaver` does the same for a complete user/directory or device configuration and applies the requested revocations atomically on a trial state before committing. Jobs recheck connector authority, reachability, identity resolution and resource generation immediately before applying each item. Completed items are not replayed when failed items retry.

Commands:

- `discover {items}` reconciles by stable `sourceKey`; each item has `kind`, `observedId`, `confidence`, `conflicts`, and `unknowns`.
- `link {sourceKey, canonicalId, resource}` explicitly clears unresolved evidence and links to a real central resource.
- `connector {connector}` stores exact actions/resource kinds plus authentication, delegation, reachability, and version.
- `jml {operation, connector, kind, items:[{resource,config,revocations?}]}`, `retry {job}`, and `recover {connector,authenticated,delegated,reachable}`. Leaver items require explicit categories. The `identity` item must remove exactly one linked canonical identity from the complete core identity and entitlement config; matching device resources require separate `device` items with their own generation-checked complete config. `group-token` removes the person from configured calling groups/routing/delegation mappings; `number` removes calling number/public-reach mappings and releases matching synthetic operations numbers. These calling changes are staged through calling-pack provisioning.
- A matching workforce profile is made unavailable through the workforce roster command; a person with an active assignment blocks that item for retry. Assignment snapshots and case/history records are retained.
- `device {connector,devices:[{resource,compatible,nativeMeeting}],firmware,maintenanceAt}` and `rollback {project,resource}`. For native-mode rooms, the parent requires the native compatibility hook even if the request omits `nativeMeeting`; it checks the current room, directory, calendar, firmware, peripherals, interop state and an effective product deployment/version bound to that room.
- `transfer {operation,record,connector,destinationRegion,administratorRegion,keyRegion,localDependency,access}`.

Information transfer snapshots the current record hold/deletion/access/lineage and tests storage destination, administrator region, key region, backup source locality, connected dependencies, and access narrowing independently. Parent policy must additionally determine whether a particular operation is allowed under the selected dated jurisdiction pack; region matches do not establish legal approval. This module intentionally does not infer product approval or encode legal assertions.

## Limits for parent audit

Estate discovery is synthetic and only preserves supplied evidence; it does not infer a canonical identity. Leaver effects are bounded to the modeled identity, calling group/number, endpoint/room and workforce records described above. Product deployments have no per-person license assignment in this schema, so the pack does not claim to revoke an individual product license. A successful item stages desired state; dependent effective state changes only when the corresponding normal provisioning generation becomes ready. Restore is a new explicit joiner/configuration request using a reviewed complete desired configuration; leaver does not automatically undo other generations. Native-room checks are synthetic scenario compatibility only, not provider certification. Rollback is per-device and generation checked. Transfer metadata is a simulation record and does not export real data.

`tests/estate-operations.test.js` covers AC-SOC-059–064 at module level. `tests/estate-lifecycle-integration.test.js` covers AC-SOC-115–118 through `SOC.dispatch`, including multi-surface leaver changes, authority/generation retry, active-assignment safety, accepted-message history, synthetic product-bound room checks and worker/save replay. Wording keeps the fictional “Disco”/“Orchard” tone; no runtime text makes claims about actual suppliers or legal status.
