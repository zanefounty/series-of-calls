# Site operations and multi-site migration

## Scope

The optional `soc-site-operations-1` module models a bounded customer site inventory and site-level operational evidence on top of canonical transport and communications resources. It adapts the source goals `progress.goal.ln` (first fiber/site connection), `progress.goal.df` (operated infrastructure) and `progress.goal.m2` (independent buildings) as gameplay contracts. It does not convert source rewards or claim parity with the full upstream physical network.

The central SOC kernel exposes this optional pack through `site-operations` commands and state inspection. Its public API is `SOC_SITE_OPERATIONS.{PACK,VERSION,GOALS,sourceIds,create,command,advance,validate,inspect,assess,goalEvidence,validateEvidence,fingerprint,source}`. `command(root, command, hooks)` mutates only the validated site pack under the supplied canonical root; inspection and evidence reads are read-only; `source()` supports worker serialization.

## Site records

A site command supplies exactly:

```js
{
  action: 'site', id,
  config: {
    name, region, transportSite, ownership, owner,
    powerDomain, failureDomain, sharedDomains,
    adminResource, endpointResources, backupResource, restoreResource
  }
}
```

`ownership` is `customer` or `provider`; region is one of the current fictional AU/US/JP/EU profiles. Every resource and transport-site identifier is an actual ID resolved by trusted hooks. Claimed region and domain values must match the transport-site resolver. Shared domains must also be listed by that resolver. Site IDs, identity ownership, and endpoint resources are never free-form evidence.

Each accepted site config has a desired generation and delayed provisioning state. On success the pack snapshots effective configuration, effective generation and resource generations. If a dependency is unavailable at the provisioning deadline, the attempted generation is marked failed and the prior effective configuration, effective generation and bindings are retained. Dynamic observations distinguish site reachability, power, administration, backup and restore. A `bind` command attaches only an endpoint declared in the site's current effective generation and records both resource and effective site generation. Exercises and migrations are invalidated only when a new site generation actually becomes effective.

The parent integration supplies trusted hooks:

| Hook | Contract |
| --- | --- |
| `authorize(root, action, owner)` | Return true only when the canonical current actor is authorized for that owner and operation. Called independently for configuration, binding, exercises, recovery, restore, and both ends of migration. |
| `resource(root, id)` | Return `{id, generation, ready, ...}` for a canonical current effective resource; `ready` may be false when staging a desired generation. Missing or noncanonical IDs fail closed. |
| `transportSite(root, id)` | Return `{id, ready, region, powerDomain, failureDomain, sharedDomains, ...}` from the actual transport graph. The pack checks identity, region and domain references. |
| `observeSite(root, {site, config, resourceGenerations})` | Return current booleans `{available,power,administration,backup,restore}` derived from effective resources and actual observations. If omitted, the module derives a conservative result using the transport and resource resolvers. |
| `injectFault(root, {exerciseId,kind,sites,domain})` | Apply a real synthetic parent fault and return `{id,domain,active:true}` only after the canonical fault is active. |
| `clearFault(root, faultId)` | Clear that exact injected parent fault; return true only after recovery is observed/accepted by the integration. |
| `journey(root, context)` | Execute/read an actual parent journey and return `{success,interactionId,sourceSite,targetSite,targetResource,edges}`. The baseline targets the second canonical site; outage probes target the surviving site's declared endpoint. Context includes kind, phase, endpoint resources and active fault domain. This may not be backed by a user-set success flag. |
| `edgeInDomain(root, edgeId, domain)` | Resolve whether a returned physical edge belongs to the active failed domain; the module rejects a “successful” path that traverses that domain. |
| `captureBackup(root, context)` | Capture the actual configs/generations of the target site's admin and endpoint resources in the declared backup resource; return matching resource snapshots with a snapshot and receipt ID. |
| `restore(root, context)` | Stage those captured configs through the declared restore resource and return `{accepted:true,receiptId,backupSnapshotId,restoreResource,due}`. Completion is recorded only after provisioning has made each config effective and the module confirms the restored values. |
| `migrateResource(root, context)` | Atomically migrate one resource in the parent system and return a receipt `{success,receiptId,resource,fromSite,toSite}`. The callback must not change the parent binding on failure. |

Missing authority, resource, transport, fault, journey, restore or migration evidence fails closed. Callbacks are a narrow adapter boundary; standalone tests cannot establish that a future host wires them to real observed state.

## Exercises and migration

`exercise` first captures a backup and stores a baseline-pending two-site `power`, `site-failure`, or `shared-risk` test after current generations are effective. On the next advance, the module requires a successful actual baseline interaction before injecting the parent fault. Subsequent advances record interactions against the canonical survivor endpoint while the fault remains active; failed samples prevent recovery. Clearing the exact fault is a separate command. The next explicit restore command stages the backed-up resource configs; a later advance verifies actual effective configs, and another advance requires a fresh survivor-targeted interaction. A configuration-generation change invalidates stale exercise work. The `m2` candidate requires per-site power and whole-site failures plus a shared-risk exercise over the same pair. Evidence records distinguish cross-site endpoints, journey IDs, restore receipts and captured ownership/observations. These records do not assert external certification.

Migration uses `plan` with source site, target site and a list of resources bound to the source and declared at the target. `cutover` calls the parent adapter independently for each resource. Each accepted transfer stores its own receipt and updates the site binding; failed items remain retryable while completed items are not replayed. A changed source or target generation blocks the migration. The integration callback must make each item transfer atomic; the module does not claim whole-cohort transactional rollback.

## Persistence, limits and pending work

`validate(root)` checks bounded collections, exact domain schemas, resource/site generation links, migration lineage, exercise evidence shape, once-only item receipts and completion prerequisites. Dynamic authority and current resource readiness are rechecked by the parent integration because pure save validation has no trusted runtime hook. `goalEvidence` returns reduced typed snapshots; `validateEvidence` checks those snapshots against retained completed exercises and their receipts, including historical generations. `fingerprint(root)` includes site configurations, bindings, exercises and migration progression. `advance(root,hooks)` processes due site provisioning and captures current observations; inspection itself does not mutate state.

The module does not model all facilities, cities, optical equipment, route construction, physical crew scheduling, supplier markets, or source-game rewards. The central dispatcher and transport adapters now provide synthetic site provisioning, scoped faults, actual communications probes, resource restore staging, and evidence hooks; focused module and integrated fixture tests cover those paths. The adapter's backup and restore receipts are synthetic game records, not external backup certification. Broader source acceptance remains pending.
