# WP-WORKFORCE-ADHERENCE — observed presence and skill coverage

Sources: `uc-new:domain:workforce`, `uc-new:domain:journeys`, `uc-new:domain:pricing`, and `uc-new:domain:commercial-roles`. Runtime source IDs are exposed as `SOC_WORKFORCE.sourceIds`. This bounded addition extends `SOC_WORKFORCE` in `src/game/49-workforce.js`; it does not establish complete fidelity for workforce or contact-centre source profiles.

## Behaviour

The optional `workforceOps.actualPresence` map records observed `available`, `away`, or `offline` state by person. It is independent of an agent's configured shift and break schedule. Queue allocation requires both an `available` actual-presence state and current scheduled availability. Presence changes take effect immediately and do not alter the desired roster, provisioning generation, or configured schedule. Existing saves without the map retain their prior `person.available` behavior as the fallback.

The canonical workforce command is:

```js
{ action: 'presence', person: 'agent-a', state: 'available' | 'away' | 'offline' }
```

Customer-operated staffing is externally controlled and rejects attendance commands. A BPO operator requires a nonexpired workforce agreement whose actions include `attendance`; `configure` alone does not grant attendance control. The legacy `availability` action edits desired roster eligibility and provisions before affecting capacity; it never overwrites observed presence.

Arrival records may optionally include both `skill` and `language`, with `sampleMinutes` (default 60) identifying the observation duration. The `staffing-forecast` command takes `channel`, `skill`, `language`, `horizon`, and `method` (`mean` or `last-period`). It uses only matching history, converts arrivals to a duration-weighted rate and scales that rate to the requested horizon. Capacity is summed minute by minute across effective shifts/breaks, matching skills, languages, entitlement and current observed attendance/assignments. The forecast assumes present attendance and assignments persist; it reports `projectedCapacity` and `projectedGap` without advancing demand. A forecast is a bounded game estimate rather than an external workforce-planning certification.

## Inspection, state, and integration

`inspect(root).presence` returns effective roster rows with `person` and observed `state`; `inspect(root).adherence` retains its previous fields, with `actual` and `available` now reflecting actual presence and scheduled attendance separately. Forecast inspection returns the demand dimensions and projected supply/gap with stale status. Both `effectiveCapacity` and queue admission use actual presence, so reporting absence changes real synthetic allocation.

`71-workforce-presence-ui.js` sends attendance, duration-qualified samples and forecast commands through the validated workforce boundary; schedule and break fields remain roster configuration. `90-service-admin-ui.js` exposes the independent BPO attendance grant. Root dispatch prohibits public `admit` and `finish` actions, which are internal interaction hooks. Active assignment imports must match a real handling interaction/person/handle; arbitrary assignments cannot fabricate busy capacity. Worker, save and UI integration cases extend the module checks.

## Acceptance

Tests `AC-SOC-425`–`AC-SOC-430` cover shift/break versus actual presence, queue-capacity effect, customer and BPO attendance authority, skill/language-specific forecast gaps, malformed save rejection, pure inspection, worker serialization, and fallback behavior for older saves. `AC-SOC-447`, `448`, `451` and `454` add shared-dispatch, UI, duration/shift forecasting and assignment-integrity checks. Existing scheduled-break acceptance remains separately covered by `AC-SOC-363`–`AC-SOC-365`. These cases do not prove all source-profile behavior.
