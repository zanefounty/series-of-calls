# Business shared allowance integration handoff

## Implemented hook

All mutations stay on the existing validated `business` command path through `socBusinessKernel.command`; no second ledger or direct UI mutation is required.

Create a pool with:

```js
{ action: 'allowancePool', id: 'voice-bundle', customer: 'customer', owner: 'orchard-msp', currency: 'AUD', unit: 'minute', periodMinutes: 60, allowance: 100 }
```

Pool fields are `id`, `customer`, `owner`, `currency`, `unit`, `periodMinutes`, `allowance`, `effectiveAllowance`, `desiredAllowance`, `status`, `readyAt`, `periodAnchor`, `periodIndex`, `remaining`, `consumed`, `everActivated`, and `pendingEffectiveAt`. Creation starts in `provisioning`, becomes `active` after two simulation minutes, and emits `ALLOWANCE_POOL_READY`. Owners must have a service provider role (`msp`, `integrator`, or `bpo`); customers must be customer organizations or within the player's consolidated group.

Attach contracts by adding `allowancePool: 'voice-bundle'` to the existing order command. A pool can serve multiple contracts of the same offer, allowing otherwise duplicate offers only when they point to the same pool. Contract/customer, support owner, currency, offer usage unit, and accelerated billing interval must exactly match pool scope. Contract statuses still govern eligibility; only active contracts accrue metered usage.

Usage is charged through a resource-bound module hook:

```js
business.meterResource(state, 'minute', amount, ['phone', 'carrier'])
```

The hook selects an active matching contract in the explicit resource priority order. Same-unit resource overlap is rejected at order/import time; a deterministic contract ID tie-break remains defensive. A provided context with no match does not charge an unrelated contract. `business.meter(state, unit, amount)` remains compatible when no runtime context exists and retains the prior first active matching contract behavior. `business.meter(state, unit, amount, contractId)` remains available to internal deterministic tests/hooks. Orders and imported state reject overlapping active same-unit resource bindings (cancelled historical contracts are exempt). Metering consumes the shared allowance once in contract call order and usage call order; each contract retains its own usage and shared included amount. The normal billing code posts wholesale costs for all usage, including included usage. Pool state resets per `periodMinutes` period. Repeated calculation/rendering does not consume allowance.

Amend an allowance with `{ action: 'amendAllowancePool', pool: 'voice-bundle', allowance: 150 }`. The pool retains its old effective amount while provisioning for two minutes; after provisioning, the amendment becomes effective at the next pool billing boundary on or after readiness. Usage in the pending interval still consumes the old effective amount; a mid-period amendment cannot reset or grant another allowance. Pool-linked contract billing aligns to the pool's anchor and period boundaries. Failed/unknown IDs and invalid quantities reject before mutation. Pool `status`, `allowance`, `effectiveAllowance`, `desiredAllowance`, and `pendingEffectiveAt` expose effective and pending state.

## Errors and recovery

- `INVALID_ALLOWANCE_POOL`: malformed scope, unsupported customer/owner, currency/unit or period, or invalid amount. Correct the command and resubmit.
- `UNKNOWN_ALLOWANCE_POOL`: amendment references no pool. Create the pool first.
- `ALLOWANCE_POOL_SCOPE_MISMATCH`: the order's customer/owner/currency/usage unit/period conflicts with the selected pool. Correct the contract or create a properly scoped pool.
- `INVALID_SAVED_ALLOWANCE_POOL`, `INVALID_SAVED_ALLOWANCE_USAGE`, `INVALID_SAVED_USAGE_CONTRACT_OVERLAP`, or `INVALID_SAVED_CONTRACT`: imported pool/member relationships, consumed counters, included usage, or resource bindings do not validate. Restore a consistent saved snapshot; do not silently detach a mismatched pool.
- Provisioning delay is recoverable by advancing simulation time. A pool is unavailable to metering until active; that usage remains billable wholesale and earns no shared inclusion.

Existing saves without pool data are normalized to an empty pool list and contracts without pool fields retain their prior per-contract allowance behaviour.

## Source links and acceptance

The change advances the shared allowance clause in `spec/07-commercial.md` (commercial shared allowance boundaries and typed dimensions). This source passage has no standalone stable `AC-*` ID in the checked authored spec; parent integration should register descriptive acceptance cases in the existing acceptance register rather than relabeling `AC-SOC-017`, whose contract-specific checks remain distinct.

`tests/business-shared-allowances.test.js` covers shared consumption across multiple eligible contracts, wholesale costs, incompatible units, invalid customer/provider scope, amendment provisioning, pure calculation and save restore. Acceptance IDs AC-SOC-369–381 cover the pool/UI/integration cases; AC-SOC-402–405 cover actual voice, messaging, processor usage and recursive legacy migration through the shared dispatcher. See the executed acceptance register for results.
