# Workforce and BPO handoff

## Scope and source links

This slice adds named break schedules to individual workforce profiles and exposes individual adherence through the workforce inspector. A scheduled break or off-shift minute removes that person from allocation while `available` continues to report their separately observed attendance flag. Source anchors: `uc-new:domain:workforce`, `uc-new:domain:commercial-roles`, `uc-new:journeys`, `uc-new:pricing`, and contact-centre product-family catalogue rows. The specific obligations are in `spec/work-packages/WP-WORKFORCE.md`; this is a partial implementation and does not complete those rows.

## Runtime hooks

- `SOC_WORKFORCE.command(state, {action:'roster', people, operator})` sets desired per-person profiles. Profiles accept optional `breaks: [{start, end}]`, where both values are minute-of-day integers and start is exclusive of end. As with shifts, an interval cannot span midnight. Roster changes provision at `clock + 1` through `SOC_WORKFORCE.advance(state)`.
- `SOC_WORKFORCE.allocation(state, {channel, skill, language})` and `effectiveCapacity` use the effective roster; scheduled breaks and off-shift time return no capacity for that person. Skills and languages still must belong to the same person.
- `SOC_WORKFORCE.inspect(state).adherence` gives one row per effective person: `scheduled` (on shift and outside break), `actual` (the saved attendance flag), `available` (both), and `onBreak`. This is read-only and costs nothing.
- Service administration exposes one optional structured break interval per person through `breakStart` / `breakEnd` minute-of-day inputs. Both must be supplied together; malformed, overlapping, and off-shift intervals are rejected by the shared validated workforce command. Customer-operated rosters render disabled. Effective inspector rows display scheduled availability, actual attendance and on-break status separately.
- For BPO operation, a customer grant uses `command(..., {action:'agreement', id, resources:['workforce'], actions:['configure'] or ['coach'], expires})`. The BPO operator may perform only the granted action before its expiry. Customer-operated profiles remain player-read-only. Agreement creation is a customer-side setup action; it does not itself change the operator.
- Existing `arrival`, `forecast`, `coach`, `admit`, and `finish` commands remain available. Forecasts snapshot recorded arrivals and become stale by horizon; coaching emits explicit `COACHING_COST` cents and applies the skill after its scheduled duration. Inspection does not accrue costs or advance either process.

## Persistence and integration

The optional `breaks` field preserves compatibility with pre-existing profiles and saves; absent breaks mean an empty schedule. `validate` rejects malformed, overlapping, or off-shift intervals on desired and effective rosters. The embedded worker source uses the same deterministic factory and behavior. No shared communications kernel, commercial ledger, evidence register or source-pack bytes were changed. The service-admin form now exposes a single break interval and separate adherence states. Parent campaign/business integration must continue to consume explicit cost events rather than infer billing from inspection. New English keys to register in translation checks: `service_admin.actual_availability`, `service_admin.break_end`, `service_admin.break_start`, `service_admin.on_break`, `service_admin.scheduled_availability`, and `service_admin.yes`.

## Verification

Run from `series-of-calls` with the requested dependency override:

```sh
NODE_PATH=/home/zane-fountylabs/workspace/fountry/node_modules rtk node --test --test-isolation=none tests/workforce-bpo.test.js tests/workforce-bpo-integration.test.js tests/workforce-bpo-ui.test.js tests/workforce-operations.test.js tests/service-admin-ui.test.js
```

The added suites cover an on-break capacity failure and recovery through shared dispatch, scoped BPO delegation failure/recovery/expiry, malformed and overlapping imported schedules, worker-source inspector equivalence, and the live service-admin form handler. Parent acceptance IDs should be assigned when integrating the shared acceptance register; the descriptive test names here do not claim acceptance-row completion.
