# WP-MEDIA-NEGOTIATION

## Scope

This optional pack models a narrow gap in the existing synthetic calling/media behavior: endpoints and a transit carrier can each be individually available while the end-to-end codec offers do not overlap. A separately configured transcoder can bridge offers when its direction, readiness, and session capacity permit. The model reports signaling and each media direction separately.

The motivating archive item is `voiceops-2010-08-peer-of-peer` (2010-08-10, [archived message](https://puck.nether.net/pipermail/voiceops/2010-August/001763.html)). It records one operator anecdote and peer discussion. It is not a verified vendor behavior, a universal interconnect rule, or evidence that transcoding always resolves the issue. The fictional names and outcomes are training proposals only.

## Existing behavior and boundary

`50-calling.js` has a simple codec allowlist and quality thresholds. `53-service-operations.js` has a single carrier codec gate. Neither represents independently administered endpoint offers, a carrier's ingress and egress offers, an ordered end-to-end intersection, or an explicitly capacity-limited transcoder. This pack does not replace those mechanics automatically. Central dispatch may consult it only after a user starts the optional pack and the parent supplies canonical route context.

## State and commands

The factory exports `create(root)`, `command(root, command)`, `advance(root)`, `validate(root)`, `inspect(root)`, `fingerprint(root)`, `preflight(root, path, hooks)`, `reserve(root, interactionId, path, hooks)`, `release(root, interactionId)`, and `source()`.

Endpoint profiles bind a profile ID to an existing root resource and tenant and hold an ordered codec list. Carrier profiles bind to a real root resource and keep separate ingress and egress codec offers. Transcoders declare bidirectional codec-pair mappings and explicit concurrent session capacity; each pair must include its reverse mapping. Configurations move through desired, one-minute provisioning, effective, and observed status. Failed provisioning preserves the prior effective generation.

Supported route shapes:

```js
{ direction: 'outbound', fromEndpoint, toEndpoint, carrierId, transcoderId? }
{ direction: 'internal', fromEndpoint, toEndpoint, transcoderId? }
{ direction: 'inbound', carrierId, toEndpoint, transcoderId? }
```

`preflight` is read-only. Its optional hooks are `resourceExists(root, resourceId)`, `resourceReady(root, resourceId)`, and `routeAuthorized(root, path, fromTenant, toTenant)`. The default resource check requires `root.resources[resourceId]`; the default route check allows same-tenant paths or a directed federation edge in the effective calling directory. The central adapter must supply actual effective-resource readiness and canonical route authorization when it has that context. Number authorization, call admission, quality thresholds, and completion remain owned by their existing packs and the core.

`reserve` requires a live root interaction. It records a synthetic session only after a ready preflight. Capacity counts only active transcoder sessions; repeat preflight may pass `excludeInteractionId` so a call does not count itself twice. Released session and event histories are bounded monotonic rings. Endpoint early/delayed offer modes produce distinct explicit synthetic offer-trace entries; they do not model timers or SIP exchanges. The central adapter should release the session on terminal interaction state. The pack itself does not create calls, signal a `200 OK`, or declare a customer task successful.

## Acceptance

- An ordered intersection across endpoint and carrier legs selects a deterministic codec and reports both media directions.
- A route with no overlap blocks with `NO_COMMON_MEDIA` when no compatible effective transcoder is selected.
- A compatible transcoder permits the synthetic path; a full session limit blocks another reservation and release makes capacity available.
- Internal routes need no carrier; inbound routes need no internal source endpoint.
- Signaling can be ready while media direction is unavailable. Such a route remains blocked.
- Desired changes stay pending until observed readiness and clock advancement. Failed generations do not erase prior effective offers. Offers expose the synthetic early/delayed trace.
- Read/inspect/preflight operations are pure. Save validation rejects orphaned or non-live reserved sessions. Worker `source()` reproduces inspection.

## Limitations

The pack does not claim source-domain completion. It does not model SIP offer/answer timers, codec parameters, encryption, NAT traversal, packetization, quality-of-service, real carrier behavior, actual transcoding products, or legal/licensing status. Offer traces identify fictional ordering only; there is no timing state machine. Existing simple calling behavior remains available unless central dispatch explicitly opts into this pack.
