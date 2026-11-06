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

All behavior is synthetic. An executed scenario test is not external vendor support, certification or legal approval. The paid Provider operation and evidence remain separate from this shared-dispatch mechanic until its project, billing, actual meeting and provider receipt are wired and tested.
