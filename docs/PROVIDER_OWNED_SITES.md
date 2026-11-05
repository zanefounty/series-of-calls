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
| `site-diverse-ingress` | A$320 | A$70 / period | 8 min | 1 | 1 |
| `owned-site-operations` | A$420 | A$45 / period | 10 min | 1 | 1 |
| `site-recovery` | A$160 | A$10 / period | 6 min | 1 | 1 |
| `managed-site-recovery` | A$100 | A$22 / period | 9 min | 0 | 1 |
| `site-resource-migration` | A$120 per item | A$0 | 4 min per item | 1 | 1 |
| `custody-review` | A$55 | A$0 | 3 min | 0 | 1 |

The adapter does not post money, advance time, or perform a mutation. The central Provider quote/dispatch path remains authoritative and must revalidate the project, customer scope, funds and shared staffing before applying its returned intents. `managed-site-recovery` is a separate paid alternative to the direct recovery operation, available only after the customer earns DF in the same market. Both operation IDs use the same authored recovery sequence and receipts; the managed offer reduces setup and engineer demand at higher recurring cost and longer lead time. The ingress quote includes eight minutes of physical commissioning in addition to its eight minutes of implementation; its site and two links commission in parallel. Owned-site setup is unavailable until this separately paid infrastructure has become effective.

## Independent call ingress

The primary/branch pair alone is not a valid continuity path for actual calls: the primary carrier and identity are placed at the head site, and the two endpoints are at customer sites. Before provisioning owned-site administration, `site-diverse-ingress` purchases a third synthetic transport site `${customerId}-ingress` and two actual 20 Mbps links, `${customerId}-ingress-head` and `${customerId}-ingress-branch`. The ingress has a separate site domain; its two links have distinct domains, separate from both customer-site domains and the head-to-branch shared domain. It moves the carrier to ingress. Identity remains at the head until paid owned-site setup moves it to ingress.

The ingress receipt binds those exact site and link IDs, their effective generation 1, the paid carrier rebind from head to ingress, the project/posting/customer IDs, and the commissioning time. A label or `probe:true` interaction cannot satisfy a continuity exercise. The Provider adapter dispatches actual duration-bearing maintenance calls and binds their recorded interactions, cases, routes, media and usage to the exercise; during a head outage the carrier source reaches Alex at branch, and during a branch outage it reaches Bea at head. The failed site's endpoint is not counted as reachable.

## Owned-site plan contract

`canOrder(state, customerId, operationId, request, hooks)` is a read-only pre-purchase check. `actionDescriptors(...)` returns its result with the exact authored terms for each operation; these are guidance for the quote UI, not a substitute for central quote revalidation. `operationPlan(state, customerId, operationId, hooks)` requires a validated Provider campaign root and a paid project for the requested operation. It returns typed commands for the coordinator to dispatch through SOC. It does not mutate state, advance time, post money, create a project, or bypass the central authority boundary. `owned-site-operations` requires the real paid primary transport installation. Its fixed site identities are `provider-owned-head` and `provider-owned-branch`; the actual transport sites remain `${customerId}-head` and `${customerId}-branch` from the paid resilience installation.

The endpoint assignments are derived from actual resource configurations: `desk` / Bea at the head site and `dedicated-endpoint` / Alex at the branch. Both endpoints must have a validated paid resilience binding before setup. The paid owned-site project binds `identity` to ingress, `desk` and Bea to the head, and `dedicated-endpoint` and Alex to the branch. It records all five actual transport binding changes in its receipt; `desk` and `dedicated-endpoint` are also bound in the 32-site domain. The setup order pays for and records the `+61255500202` Alex alias and its routes on the phone and dedicated platform, preserving Bea's existing `+61255500201` assignment. Both site records declare the two actual endpoint IDs so each can be migrated separately and retried through the domain's item receipts. The plan provides six local resources: infrastructure for administration and restore at each site, and an archive for each backup. Their IDs are fixed (`owned-head-*`, `owned-branch-*`), and their local region comes from each effective transport site. Backup and restore configuration is checked against the effective resources by the site domain.

The central Provider operation must preserve a submitted, operation-specific config on its paid project: setup has no caller-selected resource IDs; recovery uses exactly `{kind, targetSite}`; migration uses exactly `{resourceId, fromSite, toSite}`. The adapter allowlists recovery steps in order: `power` at the head, `power` at the branch, `site-failure` at the head, `site-failure` at the branch, then `shared-risk` at the head. Migration is one endpoint per paid project, for `desk` or `dedicated-endpoint`, between the two owned sites. It rejects arbitrary IDs, target sites, duplicate completed items and attempts whose current source binding has changed. Parent quote/dispatch code binds the config into the quote revision, revalidates it at commitment, stores it on the project and passes that exact saved config here. Work starts as a funded `running` project; submitted setup is commissioned only from the paid project and its effective site, resource and endpoint observations.

The owned-site installation receipt required by `validateOwnedInstall` has this exact outer schema:

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
    { resource: 'identity', from: '<customer>-head', to: '<customer>-ingress', at: installedAt },
    { resource: 'desk', from: '<paid endpoint site>', to: '<customer>-head', at: installedAt },
    { resource: 'dedicated-endpoint', from: '<paid endpoint site>', to: '<customer>-branch', at: installedAt },
    { resource: 'bea', from: null, to: '<customer>-head', at: installedAt },
    { resource: 'alex', from: null, to: '<customer>-branch', at: installedAt }
  ]
}
```

`identity` and endpoint `from` values must match paid resilience installations. Person alias sources must be null or one of the two paid customer sites; alias targets are fixed by the actual endpoint identity. The adapter validates the actual site pack, local resource kinds/regions, ownership record, effective generations, shared domains, and current endpoint-to-site bindings. After a later migration, the current endpoint binding may change only through a complete 32-domain migration with the matching paid project receipt. `ingressReady` and `ownedSiteReady` are pure commissioning checks; the latter returns the two delayed site-pack endpoint binding commands for the root's authorized dispatcher to apply once sites, resources and observations are ready. A pending paid project remains a valid saved state when its exact submitted topology is still provisioning.

Both `site-recovery` and `managed-site-recovery` use exactly `{kind, targetSite}`. The player explicitly orders `recover` after surviving work and `restore` after fault recovery. Their paid project receipts pin the actual backup snapshot ID when the exercise starts, keep `restoreReceiptId:null` until the restore command succeeds, and then pin the exact restoration receipt ID through completion. Validation checks those IDs against the retained exercise and rejects invented or mismatched receipts. The completion receipt also binds the fresh recovered interaction. A failed real call can remain a valid incomplete paid project so the player can diagnose and recover without the save validator rejecting the failure state. `site-resource-migration` config is exactly `{resourceId, fromSite, toSite}` for `desk` or `dedicated-endpoint`; its receipt binds the paid project to the same completed migration item. The adapter never batches arbitrary resource IDs or marks a partial migration complete.

## Custody and four-scenario adapter contracts

The root integration supplies `custodyReadiness` and `validateCustodyRead` hooks. The evidence must identify the same customer, processed record, processing job, paid processing and review projects/postings, permission receipt, read receipt, site, region, and real audit timestamps. The read must occur after the paid review and completed transcript output. The paid custody operation performs the actual read after its lead time; its full `RECORD_READ` audit row and permission snapshot are retained in the paid receipt, while the root pins the linked interaction, case, processing job and records. Current validation checks live read permission and, when still retained, exact audit equality. Historical validation reconstructs the authorized information policy and paid archive configuration at the read time, then compares that independent result with the saved permission snapshot and full audit receipt. Coordinated edits to all saved snapshot copies cannot invent permission. It accepts a missing audit row only below the validated audit-pruning watermark and permits a record tombstone only when deletion happened after the real read. Later paid archive changes do not rewrite the original read-time authority. One completed custody review per customer keeps this retained evidence bounded. A string marker without those references stays incomplete.

The root integration supplies `missionEvidence` and `validateMissionEvidence` hooks for GI. The summary contains exactly four full `missionVictoryProof` rows for `smb`, `enterprise`, `government`, and `defence`; each row retains the actual winning customer and tenant, victory event/proof, and paid project/posting references. Validation resolves the retained proof against segment history and actual Provider customers. There are no fabricated per-mission source IDs, child-economy transfers, or Training awards. Campaign content version 7 retains these mission proofs across mission resets; supported older saves preserve their original history without invented victory evidence. The integrated support adapter also binds the selected customer to a real named MSP responsibility, paid stage postings, an actual support sample and a staff payroll posting. The full public four-victory/L12/GI journey remains unproved; helper fixtures alone do not close GI.

## API, persistence and limits

The module exports `SOC_PROVIDER_OWNED_SITES` with fixed `OPERATION_IDS`, `RECOVERY_IDS`, `isRecoveryOperation`, quote `TERMS`, `SITE_IDS`, `RESOURCE_IDS`, `expectedConfigs`, `canOrder`, `actionDescriptors`, `operationPlan` (also exposed as `plan` and the setup-specific `installCommands`), `inspect`, `evaluate`, `validateEvidence`, `validateCustomer`, and `source()` for worker serialization. It stores no new mutable state. `SOC_SITE_OPERATIONS` remains the authority for provisioning delays, backup snapshots, fault probes, recovery, generation checks, and per-item migration retries. Rendering reads its measured assessment only.

The central dispatcher/schema/registries and operation catalog remain coordinator-owned. Focused tests cover the pure helper, real paid endpoint purchases, ingress and owned-site commissioning, paid per-endpoint migrations, real failure/surviving-work/recover/restore/fresh-work dispatch, and tampered Provider binding/restore receipts. A public-dispatch test completes a paid custody read from an actual processed recording. A frozen diagnostic browser journey completes five recoveries, two migrations and DF/M2/L4 claims on desktop and mobile; subsequent validation and wording changes require fresh candidate evidence. The combined L12 claim, full four-mission/GI journey and other earned follow-on choices remain open. The helper deliberately fails closed when required hooks or receipts are absent.
