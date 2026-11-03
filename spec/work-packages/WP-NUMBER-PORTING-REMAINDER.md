# WP: Number porting remainder

## Source boundary

This remainder is linked to the preserved full-source row `uc-new:domain:number-porting` (`NEW:domain:number-porting`). Its mapped behavior is: “Track reservation, allocation, assignment, port orders, supplier lead times, acceptance, cutover, failed ports and recovery. Number portability does not by itself migrate identities, recording or workflows.” The row is a design capability scope, not a vendor process specification. This package does not assert real supplier rules, regulatory requirements, or emergency-service behavior.

## Existing implementation

`src/game/53-service-operations.js` and `tests/service-operations.test.js` already exercise a bounded single-number lifecycle (AC-SOC-024):

- reserve one E.164-shaped synthetic number, then assign it to a configured identity;
- submit a port for an active number with a target provider and a cutover no earlier than the modeled lead time;
- schedule or reject it from the supplied donor-acceptance boolean;
- cut over the provider after the scheduled time;
- recover a completed port to its recorded previous provider, and retain failed/recovered order history.

The code does **not** implement number-range reservations, external supplier integrations, or actual supplier data validation. A successful simulated port changes only the provider recorded on that number. It does not migrate identity, recording, message/workflow state, or other resources; these separations are explicitly required by the source row.

## Additive supplier-order behavior

AC-SOC-024 remains the legacy lifecycle. Its `port` action and existing rows are retained as schema version 1, including the supplied acceptance boolean and fixed two-minute validation delay. The additive version 2 `portOrder` lifecycle distinguishes submission from supplier response:

1. `portOrder` creates a submitted order with `leadBusinessDays`, a calculated response due tick, no supplier response, and a planned cutover no earlier than the response due tick.
2. `portResponse {port, accepted, reason?}` records a response only at/after its due tick and before planned cutover. Rejection terminates the order with the supplied reason. An absent response that reaches cutover fails without changing the number's provider.
3. Scenario tick zero is Monday; each day is 1,440 synthetic minutes and weekdays are Monday through Friday. The due tick advances by the requested number of weekdays while preserving the submitted time-of-day. No wall clock or real supplier calendar is consulted.
4. An accepted order is scheduled for its planned cutover; `advance` changes the provider only at that tick. `recoverPort` accepts a failed or completed legacy or version 2 order and restores the previous provider captured when the order began.

Suggested API shape for parent approval (not yet implemented):

```js
{ action: 'portOrder', number, target, leadBusinessDays, cutoverAt }
{ action: 'portResponse', port, accepted, reason? }
{ action: 'recoverPort', port }
```

`leadBusinessDays` is an integer from 1 through 60; `cutoverAt` uses the simulation clock's integer minute ticks. The version 2 order captures source provider, planned target, submission tick, due tick, response, and recovery history. Version 1 records remain valid and retain their old interpretation; no save is reinterpreted as a version 2 order.

## Explicit exclusions and evidence needs

- No range-reservation semantics are stated in the mapped row; a range command should not be added without a more specific source requirement.
- “Allocation” is represented only by inventory reservation and assignment today. Any more detailed allocation policy needs source evidence before implementation.
- The row does not specify emergency calling, emergency address dependencies, port-in eligibility checks, rejection codes, partial/range cutovers, real-world lead-time units, or supplier protocols. These are not requirements in this remainder.
- All numbers, suppliers, acceptance events, and outcomes remain synthetic. Historical incident reports may motivate training scenarios but do not establish universal supplier behavior.

## Acceptance focus for the proposed change

The additive module cases are `AC-SOC-239` through `AC-SOC-246` in `tests/number-porting.test.js`; typed UI cases are `AC-SOC-247` and `AC-SOC-248` in `tests/number-porting-ui.test.js`.

- accepted response after the due tick and before planned cutover changes the provider only at cutover;
- rejected or absent response never changes the provider;
- too-early response/cutover, duplicate active order, malformed saved history, or recovery of an ineligible order is rejected;
- successful and failed order history survives save/restore and pure inspection;
- recovery restores the captured prior provider without claiming that identity, recording, or workflow resources moved.
