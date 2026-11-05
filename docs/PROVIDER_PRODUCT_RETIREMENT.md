# Provider product retirement and recommissioning

Candidate implementation, 5 November 2026. This does not close source catalogue or full gameplay acceptance.

A completed funded product project exposes a map retirement quote. The preview lists the bound resources, active calls, scheduled/active meetings and processing work, retained setup, effective withdrawal minute and remaining supplier commitment. Explicit revision-bound commitment schedules withdrawal for the next simulation minute. Rendering cannot withdraw service.

Withdrawal keeps the actual product binding enforced: retired or recommissioning products cannot silently fall back to unpaid base service. In-flight calls fail through the normal service checks and release capture reservations. Existing records and prior configuration generations remain retained. Retirement keeps recurring product charges until the later of effective withdrawal and the quoted minimum term measured from commissioning; customer exit does not erase that retained obligation. The quote and forecast expose it.

A new funded order for the same retired product charges full setup, reserves the normal implementation team and waits the authored delivery time. Reinstatement advances the real deployment generation. Government evidence and local speech model/integration evidence are regenerated for that generation before the new operation completes. An explicitly suspended standing policy remains suspended. Failed commissioning can retry its unchanged paid intent without fabricating a new configuration generation or charging another setup fee. Submitted delivery attempts retry at five-minute intervals while the offer remains sold and supported; reinstatement preparation can retry immediately to submit its fresh scoped evidence.

`tests/provider-product-retirement.test.js` and `tests/provider-product-retirement-edge.test.js` passed nine integrated tests in `/tmp/soc-retirement-lineage.log`, including refusal of removed retirement markers and forged higher generations. Pure lifecycle and shell interaction tests passed fifteen tests in `/tmp/soc-retirement-ui-integration.log`. These are development diagnostics; frozen-candidate browser and complete-suite verification remain required.

The implementation covers funded product projects. Non-product operation retirement, supplier replacement/number-port migration, broader lifecycle events and all progression unlocks remain outstanding. These are implementation gaps, not approved exclusions.

## Supplier term content version 3

New careers use `provider-campaigns-3`. Recurring operation projects now retain the quoted minimum term even when a customer exits without first retiring the service. Each new operation carries its validated minimum-period count; omitting or altering it is rejected. Cancellation before commissioning still retains only setup. Recurring charges start at actual commissioning.

Version 3 computes each invoice from cumulative cents since commissioning, so fragmented periods telescope to the exact supplier term rather than losing a cent through repeated rounding. Future retirement and exit quotes use the same exposure functions. Version 1 and version 2 saves retain their original operation terms and rounding; restore adds no historical obligation.

Eleven integrated lifecycle and compatibility tests passed in `/tmp/soc-minimum-terms-exit.log`. A subsequent focused suite passed eight retirement tests in `/tmp/soc-retirement-preorder2.log`, additionally proving that exit before supplier submission excludes cancelled recurring obligations while retaining paid setup. These include direct exit without retirement, persistence of future supplier bills and unchanged restoration of version-two campaigns.
