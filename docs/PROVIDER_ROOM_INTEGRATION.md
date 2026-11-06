# Synthetic room interoperability integration

This optional scenario integration joins one Microsnoft meeting-room deployment to one Disco interoperability deployment through the existing product compatibility path. It is a bounded fictional mechanic; it does not complete either product family or the full source conversion.

## Source mapping

- [`uc-new:domain:room-joining` / `REQ-ab54e717f2267a8e`](../spec/appendices/catalogue/new-uc-cc-domain-object.md) requires the selected room identity, calendar, interop provider, join path and media dependencies to be tested together.
- [`uc-new:family:microsoft:meetings-rooms` / `REQ-6f269960d4606e62`](../spec/appendices/catalogue/new-microsoft-product-family.md) supplies the `room-devices` feature.
- [`uc-new:family:cisco:meetings-devices` / `REQ-06fac6ac0a8bd5cc`](../spec/appendices/catalogue/new-cisco-product-family.md) supplies the `interop-join` feature.

The recipe uses canonical deployment IDs `d-ms-meetings-room` and `d-cisco-meetings-interoperability`, and the directional edge `room-to-interop` with exactly one feature pair: `room-devices` → `interop-join`.

## Meeting acceptance

A bridge meeting retains the edge test time, acceptance/start time, meeting-profile generation, booking ID, both deployment product versions and generations, feature IDs, and a successful `identity` → `room` `meeting` path observation at 5,000 Kbps. The path comes from `transport.resourcePath`; a ready-shaped value without a ready resource path is not evidence.

The shared meeting dispatcher checks current endpoint feature gates and edge scope before admission, then repeats those checks and the actual transport-path observation during each active minute. A stale deployment, blocked current edge test, unavailable endpoint feature or unavailable meeting path fails the meeting. Reconfiguring the path allows a newly booked meeting to recover. Existing sessions without this optional proof keep their legacy save shape.

The saved `MEETING_SESSION_STARTED` audit row retains the accepted snapshot and is linked by `productIntegrationAuditId`, so import rejects a session whose acceptance was changed without matching retained start evidence. Same-generation product retests retain prior results in `integration.testHistory` so the exact accepted test remains traceable while the current edge result is still required to be scenario-verified.

## Paid Provider project

The Provider recipe is `direct-room-integration`: A$500 setup, A$120 per period, eight work minutes, one engineer and one support person. Ordering requires completed paid Provider projects for both canonical endpoint products and the current effective room, feature, edge and transport checks. The accepted quote retains the exact `roomIntegrationPlan`; when paid setup completes, `createReceipt(state, projectId, hooks)` clones that plan into a project receipt only if it still matches current configuration.

The explicit integration test runs through the native product test command. `captureTest` records the exact actual edge result and generations, including a blocked result during an outage, so a failed test remains visible and the same paid project can be retested after repair. Project commissioning remains incomplete until an actual, completed bridge meeting for the same customer starts after both the receipt submission and a passing test, retains the accepted edge, endpoint generations, identity-to-room path and start audit, and lasts for a positive duration. The operation can then retain immutable delivery evidence without requiring project completion as a prerequisite to commissioning. An outage can block this project’s readiness; it does not stop global time or silently replace the endpoint generations accepted in the quote.

Completed evidence checks the retained test history, endpoint configuration or retirement history, actual meeting session, booking, accepted path and matching start audit. It accepts a missing start-audit row only when native information history has advanced its validated FIFO pruning checkpoint past that audit ID; a missing unpruned audit remains invalid. This supports historical validation after a later fault, retest, retirement or ordinary audit pruning while rejecting a forged meeting, route or receipt. These are synthetic project records and compatibility exercises; they do not establish external vendor support, certification or legal approval. The shared-dispatch lab cases remain independent of the paid Provider project and do not count as funded delivery.
