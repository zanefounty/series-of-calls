# WP-MANAGED-OPERATIONS — cross-customer lifecycle orchestration

**Status:** bounded optional module is integrated with the shared SOC portfolio, estate and business settlement paths. Real-core integration tests cover two-customer jobs, readiness-delayed settlement, partial retry, billing lineage, worker/save replay, and portfolio deactivation obligations. This does not complete the VOSS organization profile or the 94-row product-profile catalogue.

## Scope

`SOC_MANAGED_OPERATIONS` orchestrates only synthetic user `joiner` and `mover` jobs through each selected portfolio customer's existing estate connector. A joiner adds one identity and may add its calling entitlement. The bounded mover action changes exactly one existing identity's calling entitlement while preserving the canonical identity; it does not model team, office or geographic movement. No-op or unsupported config changes block before child dispatch, so they cannot be charged. The module records one result per customer and resource, retains blocked/failed reasons, retries an incomplete customer job at most once through its ordinary estate retry command, and does not replay completed items. Discovery confidence, connector inventory import, assurance windows, leavers, device firmware, direct supplier equivalence and general multi-tenant administration remain outside this module.

## Commands and dependencies

The parent SOC root must have the portfolio pack started. `create(root)` creates an empty bounded job ledger. `command(root, {action:'submit', id, participants}, hooks)` accepts up to 20 distinct portfolio customers. Each participant has this exact shape:

```js
{
  customerId,
  contractId,
  connector,
  operation: 'joiner' | 'mover',
  items: [{ resource, config }]
}
```

The module requires an active, accepted `managed-operations` contract for each customer, with the `managed-operation` unit, the selected resource scope, and an operator support owner with a permitted operator role. The target must have a unique conflict-free canonical estate inventory link, a current resource generation, and an effective, authenticated, delegated, reachable connector whose observed state supports user provisioning. A trusted per-resource authorization hook confirms current child-root business authority.

The trusted dispatcher signature is `dispatchCustomer(root, customerId, ordinaryChildCommand) -> updatedChildRoot`. The parent adapter must route this through the portfolio's validated `dispatchcustomer` command so its root, journal, clock, and revision remain consistent. This module itself emits only allowlisted `estate` JML submit/retry commands; callers cannot pass arbitrary child command types. The portfolio clock is authoritative, and every participating child clock must match it.

`command(root, {action:'retry', job, customerId}, hooks)` retries only incomplete items in the named customer participant and is accepted at most once. `advance(root, hooks)` reconciles retained child estate jobs and can settle typed usage; `inspect` and `fingerprint` are pure.

## Typed settlement boundary

An estate JML item marked complete is not yet a completed managed operation: it only records desired configuration application. The module keeps the item in `provisioning` until the actual child resource has the same applied generation, ready provisioning state, and exact effective configuration, and a trusted `resourceReadiness(root, {customerId, resource, generation, config})` adapter confirms current observed readiness. The parent adapter must derive this from the shared resource observation path.

Only then does each resource contribute one unit of `managed-operation` usage, with a stable bounded `managed-usage-N` identifier. The caller supplies no price or commission. A trusted `settleUsage(root, request)` adapter must use the accepted business offer's terms and a core idempotent managed-usage operation. The module checks the returned entry ID against an actual child business ledger row or retained managed-charge receipt with the same usage ID, customer, contract, operator, resource, generation, unit and quantity. This permits ordinary bounded ledger pruning without losing the receipt lineage.

Without that adapter, completed work remains explicitly `deferred` and is never presented as billed. A transient settlement error remains pending; a malformed receipt is blocked. A retry cannot create a second usage record for a completed resource.

## Evidence and limits

The focused tests cover partial cross-customer submissions, exact child dispatch, contract/resource/connector/authority denial, meaningful joiner and entitlement-only mover changes, no-op rejection, mixed item outcomes, one retry without replaying prior successes, delayed effective provisioning, live and retained charge receipt binding, tampered save rejection, worker serialization, read purity, and real shared-SOC portfolio/estate/business settlement. The portfolio blocks customer deactivation while a managed-operation participant still has an unfinished job, even if that customer's accepted contract is later canceled; posted completed history does not by itself block deactivation.

This mechanic is a narrow candidate adaptation to the mapped VOSS lifecycle/service-assurance row (`uc-new:actor:voss`) and provider-operations family. It does not claim live integrations, provider compatibility, inventory parity, external support or general assurance behavior.

## Managed identity leaver extension

The later [managed identity-retirement contract](WP-MANAGED-LEAVER.md) supersedes this baseline’s statement that every managed leaver is unsupported. It adds one explicitly approved identity item, current delegated scope, retained history and settlement after effective readiness. Device/number/group and broader lifecycle coverage remain open.
