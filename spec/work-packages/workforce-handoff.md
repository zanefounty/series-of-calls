# WP-WORKFORCE integration handoff

Module: `src/game/49-workforce.js`; export/factory instance: `SOC_WORKFORCE` / `socWorkforceKernel`; save key: optional `s.workforceOps`; pack: `soc-workforce-1`.

## Kernel hooks

- On pack start, set `s.workforceOps = SOC_WORKFORCE.create(s)`. Saves without this key remain a no-op under `validate`, `inspect`, and `fingerprint`.
- In the canonical dispatch path, forward workforce commands to `SOC_WORKFORCE.command(s, command)` on the cloned state. Supported actions are `roster`, `agreement`, `availability`, `arrival`, `forecast`, `coach`, `admit`, and `finish`. Existing resource commands continue to own named seat/session entitlements; this pack's per-person `entitlements` list records which person can use a named agent seat.
- After the kernel increments `s.clock`, call `SOC_WORKFORCE.advance(s)`. Roster edits become effective at their due minute. Coaching is unavailable work time and adds its trained skill only at completion. This hook must run once per simulated minute, not during inspection.
- Invoke `SOC_WORKFORCE.validate(s)` from save validation and `inspect`/`fingerprint` from the corresponding pure APIs. Include `SOC_WORKFORCE.source()` in worker source generation.
- Queue eligibility: call `effectiveCapacity(s, {channel:'voice'|'digital', skill, language})`. Its `people` list only contains individuals who meet all three constraints themselves, hold at least one named entitlement, are on shift and free. Do not union skills, languages, or entitlement counts across people. Session/trunk admission stays in the parent kernel.
- Queue admission: once the parent has selected an eligible interaction, call `admit(s, {interaction, channel, skill, language})`. It deterministically reserves the first sorted eligible person and returns the recorded assignment. On handling completion call `finish(s, interaction, wrapMinutes)`; the same person remains unavailable through wrap. The next `advance` releases completed wrap reservations. No parent allocation should run `admit` from a read or calculate method.
- Aggregate demand can use `effectiveCapacity` with its channel's required skill/language and count people or digital slots from that snapshot. Arrival history is recorded explicitly through `arrival`; forecasts are snapshots and never supply or change real demand. Cost consumers can read append-only `costEvents` (currently coaching posts `COACHING_COST` cents in the fictional AUD unit); do not post these twice.

## Operating boundaries and known scope

Customer operator state rejects roster edits. BPO operations require an unexpired agreement that names the `workforce` resource and the requested action. Forecasts retain their sample count, horizon and method and report stale status in inspection. Named seats do not create people or skills. Assignments and wrap reservations survive desired roster edits; a reduced effective roster may therefore show fewer free people while old work remains assigned.

Inspection keeps the comparison concrete: “A named seat can reserve a chair; it still cannot answer the ringing phone.” Skills and languages are matched on the same agent, so one person's Japanese and another person's billing experience do not combine by committee.

`tests/workforce-operations.test.js` exercises AC-SOC-053–058 directly against a real `SOC.create()` fixture plus the workforce hooks, including worker serialization of the factory. The root kernel has not yet wired these hooks in this work package, so these cases do not claim end-to-end `SOC.dispatch` queue behavior or integrated save restore. Parent integration must run the shared acceptance suite and complete the generated evidence links. No source-pack exclusion or completion claim is made here.
