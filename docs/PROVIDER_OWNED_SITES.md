# Provider-owned sites and recovery adapter

## Scope and source links

This bounded adapter connects Provider campaign purchases to the existing `SOC_SITE_OPERATIONS` domain. It supports these preserved identities:

| Source identity | Required measured Provider behaviour |
| --- | --- |
| `progress.goal.df` — “Light your own dark fiber” | Paid local site administration, captured configuration backup, a real incident, surviving work, paid restoration, effective restored configuration, and fresh recovered work. The source's 40,000 reward is not converted to Provider cash. |
| `progress.goal.m2` — “Be in two buildings at once” | Two distinct sites with paid recovery evidence for power and whole-site failures at both sites, plus a shared-risk exercise that keeps real work available on the alternate path. The source's 30,000 reward is not converted. |
| `progress.progression-level.4` — “Big league” | Paid per-resource migrations for both real endpoint resources, followed by the actual site-continuity and recovery evidence. The reception/desk dependency remains visible; aggregate completion cannot hide a failed item. |
| `progress.progression-level.12` — “Too big to route” | Existing L4 evidence plus a paid, authorized read of an actual processed record with a retained permission and read audit. A route-leak joke or label cannot grant the level. |
| `progress.goal.gi` — “Sign a giant” | Existing L12 evidence plus all four validated Provider scenario victory proofs and paid MSP scope. Signing a contract or joining one room is insufficient. The source's 150,000 reward is not converted. |

Source wording and comparisons remain in [`content/progression.json`](../content/progression.json); the original network source's cash and bandwidth quantities remain provenance only.

## Paid operation terms

The pure exported `SOC_PROVIDER_OWNED_SITES.TERMS` contract records the Provider quote terms supplied for this slice:

| Operation | Setup | Recurring | Work | Engineers | Support |
| --- | ---: | ---: | ---: | ---: | ---: |
| `owned-site-operations` | A$420 | A$45 / period | 10 min | 1 | 1 |
| `site-recovery` | A$160 | A$10 / period | 6 min | 1 | 1 |
| `site-resource-migration` | A$120 per item | A$0 | 4 min per item | 1 | 1 |
| `custody-review` | A$55 | A$0 | 3 min | 0 | 1 |

The adapter does not post money, advance time, or perform a mutation. The central Provider quote/dispatch path remains authoritative and must revalidate the project, customer scope, funds and shared staffing before applying its returned intents.

## Owned-site plan contract

`canOrder(state, customerId, operationId, request, hooks)` is a read-only pre-purchase check. `actionDescriptors(...)` returns its result with the exact authored terms for each operation; these are guidance for the quote UI, not a substitute for central quote revalidation. `operationPlan(state, customerId, operationId, hooks)` requires a validated Provider campaign root and a paid project for the requested operation. It returns typed commands for the coordinator to dispatch through SOC. It does not mutate state, advance time, post money, create a project, or bypass the central authority boundary. `owned-site-operations` requires the real paid primary transport installation. Its fixed site identities are `provider-owned-head` and `provider-owned-branch`; the actual transport sites remain `${customerId}-head` and `${customerId}-branch` from the paid resilience installation.

The endpoint assignments are derived from actual resource configurations: `desk` / Bea at the head site and `alexdesk` / Alex at the branch. The paid owned-site project authorizes the binding changes. Both site records declare the two actual endpoint IDs so each can be migrated separately and retried through the domain's item receipts. The plan provides six local resources: infrastructure for administration and restore at each site, and an archive for each backup. Their IDs are fixed (`owned-head-*`, `owned-branch-*`), and their local region comes from each effective transport site. Backup and restore configuration is checked against the effective resources by the site domain.

The central Provider operation must preserve a submitted, operation-specific config on its paid project: setup has no caller-selected resource IDs; recovery uses exactly `{kind, targetSite}`; migration uses exactly `{resourceId, fromSite, toSite}`. The adapter allowlists recovery steps in order: `power` at the head, `power` at the branch, `site-failure` at the head, `site-failure` at the branch, then `shared-risk` at the head. Migration is one endpoint per paid project, for `desk` or `alexdesk`, between the two owned sites. It rejects arbitrary IDs, target sites, duplicate completed items and attempts whose current source binding has changed. Parent quote/dispatch code must bind the config into the quote revision, validate it again at commitment, save it on the project and pass that exact saved config here.

The installation receipt required by `validateOwnedInstall` has this exact outer schema:

```js
{
  kind: 'provider-owned-sites', version: 1,
  projectId, postingId, customerId, installedAt,
  siteIds: ['provider-owned-head', 'provider-owned-branch'],
  resourceIds: {
    head: { admin: 'owned-head-admin', backup: 'owned-head-backup', restore: 'owned-head-restore' },
    branch: { admin: 'owned-branch-admin', backup: 'owned-branch-backup', restore: 'owned-branch-restore' }
  },
  siteConfigs: { head: /* exact SOC_SITE_OPERATIONS config */, branch: /* exact config */ },
  transportBindings: [
    { resource: 'desk', from, to: '<customer>-head', at: installedAt },
    { resource: 'alexdesk', from, to: '<customer>-branch', at: installedAt }
  ]
}
```

`from` must match the paid primary-resilience installation's retained binding. The adapter validates the actual site pack, local resource kinds/regions, ownership record, effective generations, shared domains, and current endpoint-to-site bindings. After a later migration, the current binding may change only through a complete 32-domain migration with the matching paid project receipt.

`site-recovery` project config is exactly `{kind, targetSite}`. Its completion receipt binds one paid project to the exact completed domain exercise, including backup snapshot, restoration receipt and fresh recovered interaction. `site-resource-migration` config is exactly `{resourceId, fromSite, toSite}` for `desk` or `alexdesk`; its receipt binds the paid project to the same completed migration item. The adapter never batches arbitrary resource IDs or marks a partial migration complete.

## Custody and four-scenario adapter contracts

The root integration supplies `custodyReadiness` and `validateCustodyRead` hooks. The evidence must identify the same customer, processed record, processing job, paid processing and review projects/postings, permission receipt, read receipt, site, region, and real audit timestamps. The read must occur after the paid review and the processing work. Current and historical validation must resolve those IDs against actual records, access permissions, and retained audit history. A string marker without those references stays incomplete.

The root integration supplies `missionEvidence` and `validateMissionEvidence` hooks for GI. The summary contains exactly four full `missionVictoryProof` rows for `smb`, `enterprise`, `government`, and `defence`; each row retains the actual winning customer and tenant, victory event/proof, and paid project/posting references. Validation resolves the retained proof against segment history and actual Provider customers. There are no fabricated per-mission source IDs, child-economy transfers, or Training awards. The mission-event history must be retained by the coordinator before any active mission reset; until that hook is integrated, GI remains incomplete.

## API, persistence and limits

The module exports `SOC_PROVIDER_OWNED_SITES` with fixed `OPERATION_IDS`, quote `TERMS`, `SITE_IDS`, `RESOURCE_IDS`, `expectedConfigs`, `canOrder`, `actionDescriptors`, `operationPlan` (also exposed as `plan` and the setup-specific `installCommands`), `inspect`, `evaluate`, `validateEvidence`, `validateCustomer`, and `source()` for worker serialization. It stores no new mutable state. `SOC_SITE_OPERATIONS` remains the authority for provisioning delays, backup snapshots, fault probes, recovery, generation checks, and per-item migration retries. Rendering reads its measured assessment only.

The central dispatcher/schema/registries and operation catalog are coordinator-owned and are not modified here. The focused local tests establish module and site-domain behavior; Provider positive-dispatch proof, real custody reads, four-mission retained proof, and browser-visible quotes remain integration work until those central hooks and authored operations are installed. The helper deliberately fails closed when those hooks or receipts are absent.
