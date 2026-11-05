# Provider journey time and usage

The selected customer’s recent journeys explain recorded work before the raw trace. `23-provider-journeys.js` is a pure projection; rendering, inspecting and changing display preferences cannot create work, advance time or meter usage.

- Waiting is elapsed time between queue entry (including a human handoff or transfer) and assignment or termination.
- Talk/handling is elapsed time between assignment or endpoint connection and wrap or termination. Transfers close the previous handling interval and open another queue interval.
- After-call work is elapsed time between `WRAP_UP` and completion. A customer agent may still be occupied during wrap; the external carrier session is released.
- Current carrier occupancy follows the same admission and active-phase predicate used by the simulation. A queued external call can occupy a session before an agent answers. It is a current count, not a reconstructed historical session-minute total.
- Supplier usage comes from the job’s recorded voice-minute and accepted-message counters. Metering samples eligible sessions once per simulation minute, including eligible queue time. These quantities are not inferred by summing displayed elapsed durations.
- Customer retail remains the agreed service-period price, prorated for a partial period and adjusted by actual delivery credits. The supplier counters do not create an additional customer per-conversation bill.

Each retained interaction in a resilience sequence is explained separately; job usage remains the recorded aggregate. Missing interactions and capped traces show that timing is unavailable. They do not become zero-duration conversations. No transcript sentiment or conversational quality is inferred.

`AC-SOC-644` exercises actual autonomous Provider voice delivery, pure repeated rendering and equal worker/save continuation. `AC-SOC-645` exercises transfer intervals, missing evidence and serialized projection equivalence. These cases do not establish a new voice-to-digital handoff, every live media failure or browser acceptance. Source links remain `DEC-011` and `uc-new:domain:pricing`; the implementation disposition is partial.
