# Module boundary audit

Scope: state and authority boundaries in the optional estate, workforce, and calling packs as they connect to the synthetic communications kernel. This audit checks program invariants; it does not make claims about real deployments, regulatory compliance, or cryptographic save integrity.

## Findings addressed

- Estate inventory links now retain the linked resource ID and validate its kind against the discovered record. JML save validation binds every item to the linked source record and current resource kind.
- Estate connectors now separate `desired`, `effective`, and `observed` state. Connector configuration is generation staged; `advance` applies it after prerequisites pass and preserves the last effective configuration on failure. Integrations can provide `connectorReady(state, connector)`; the standalone fallback requires a connected dependency or a connector configured with `localDependency: true`. Auth, delegation, reachability, and fault are independent observations changed through `recover` and `fault` commands.
- JML, device projects, rollback, exports, and backups read effective connector capabilities and current observed status. Retries re-check authority, reachability, faults, action, and resource-kind scope per item. Revoking authority or narrowing scope blocks the affected item and does not abort simulation advancement.
- Estate fingerprints include inventory reconciliation and connector configuration/observation changes, not job, project, or transfer progress records.
- Device projects re-check the same connector controls at maintenance time. Central estate integration requires native-room checks for native-mode rooms even when the submitted flag is false; a positive result needs current directory/calendar/peripheral/interop/firmware state and an effective room-bound synthetic product deployment/version. This is not an external certification claim.
- Estate transfer records retain source parents and the connection state used for the decision. Save validation recomputes the decision reasons and checks that lineage and exported access metadata agree with the captured policy.
- Calling voicemail reads now require the stored owner, tenant, and retention to match the currently effective mailbox definition. Save validation enforces that same binding, including mailbox existence.
- Calling fingerprints include node policy/provisioning state and exclude voicemail/event progress so unrelated messages do not stale an interaction assessment.
- Workforce active assignments now carry a person snapshot; validation checks its entitlement, skill, language, and active concurrency boundaries. Historical assignment snapshots remain part of saved state.
- Desired/effective policy generations remain separate: a pending configuration update preserves the previously effective configuration until provisioning completes.

## Estate leaver scope and remaining boundary

The central estate hook now handles explicit per-item `identity`, `group-token`, `number`, and `device` revocations on supported synthetic resources. It validates the full desired configuration, role authority and expected generation, stages calling directory/service changes, releases matching synthetic operations numbers, and makes a matching workforce profile unavailable. Active work blocks the item for retry; assignment and case history are retained. A failed item does not partially mutate central resources because related changes are preflighted on a trial state before commit.

This is not a general app-license deprovisioner. Product deployments currently have no per-person assignment state, so no individual product license is inferred or revoked. Native-room compatibility is an explicit synthetic check of configured product and current core resource state, not vendor certification. Desired state can be committed while dependent resources remain in ordinary provisioning; callers must inspect effective state before treating revocation as operationally active. Restoration is a new reviewed joiner/configuration operation, never an automatic rollback over newer generations.

## Integration handoff

- Configure a connector with `{action:'connector', connector:{id, actions, resourceKinds, version, localDependency?}}`. This stages `desired`; only `advance` can update `effective` after prerequisites pass.
- Stored connector fields are `{id, desired, effective, generation, provisioning:{status,due,generation,errors}, observed:{authenticated,delegated,reachable,fault}}`. New connectors start unauthenticated, undelegated, and unreachable.
- `recover` updates the three boolean observations. `fault` sets or clears `OUTAGE`, `CERTIFICATE_EXPIRED`, `DEPENDENCY_UNAVAILABLE`, or `AUTHENTICATION_REQUIRED` independently.
- Integrations may provide `connectorReady(state, connector)` and must return literal `true` to allow promotion. Device projects on native-mode rooms require `nativeMeetingCompatible(state, resourceId, firmware) === true`; the central hook verifies a current product deployment bound to the room and synthetic resource prerequisites.
- Estate commands read effective capabilities plus current observations. A failed reprovision leaves the prior effective capability set available until a later successful generation.

## Coverage and status

`tests/module-boundaries.test.js` covers sixteen boundary cases: tampered JML lineage, cross-kind inventory links, preservation of reviewed links during rediscovery, authority loss and retry recovery, independent connector fault/recover state, connector scope changes, failed connector reprovision retaining prior effective capabilities, transient-versus-meaningful estate fingerprints, pending versus effective state, unavailable native meeting compatibility, transfer lineage/access tampering, invalid workforce person/entitlement assignments, per-person concurrency, mailbox owner/tenant tampering, calling policy/effective-state tampering, and calling fingerprint scope. `tests/estate-operations.test.js` covers AC-SOC-059–064. `tests/estate-lifecycle-integration.test.js` covers AC-SOC-115–118 through the root dispatch/worker/save paths.

Verified on 2026-11-03 with:

```text
rtk node --test tests/module-boundaries.test.js tests/estate-operations.test.js tests/calling-policy.test.js
3 test files passed; 0 failed.
```

The broader relevant suite also passed:

```text
rtk node --test tests/communications.test.js tests/module-boundaries.test.js tests/estate-operations.test.js tests/calling-policy.test.js tests/workforce-operations.test.js tests/business.test.js
6 test files passed; 0 failed.
```

This is a focused module suite, not a full repository test run. Saved JSON validation detects malformed and internally inconsistent state; it is not a cryptographic tamper-evidence mechanism.
