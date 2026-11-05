# Provider regional support and market evidence

This helper adds paid, named Provider workforce coverage to the existing 60-minute Provider support observation. It adapts the canonical identities `progress.goal.c3`, `progress.goal.c5`, `progress.goal.t2`, and `progress.progression-level.7`; it does not award them automatically or alter their thresholds.

## Evidence and terms

The optional version-1 operation is `provider-support-coverage`. Its exact plan request is `{customerId, market, personId, coverageId}`. The authored roster has one named Orchard MSP support person per market, with `support` skill and the market's configured language. `business-hours` coverage is 08:00–20:00 (A$90 setup, A$80 per period, four work minutes and one support slot); `extended` covers all minutes (A$180 setup, A$160 per period, six work minutes and one support slot). These are proposed fictional balance terms, not yet available through Provider dispatch.

The parent campaign remains the sole treasury and payroll owner. This helper does not create a business, cash, or people. A candidate quote must fit the already-paid shared Provider support headcount. Active assignments count distinct named people, and a person can cover at most two customers in the same authored market. The named roster does not replace customer agents or BPO.

On commissioning, the parent stores the exact operation receipt on the paid Provider project:

```js
{
  kind: 'provider-support-coverage', version: 1,
  projectId, postingId, customerId, installedAt,
  supportAssignment: {
    version: 1, personId, employer, market, languages, skills,
    coverageId, shiftStart, shiftEnd, scopeCustomerIds
  }
}
```

`installedAt` is bound to the operation submission clock; the assignment only counts from the actual project completion minute. Every saved support sample retains the named assignment, its effective minute, sampled shared headcount and payroll counters. The adapter checks the assignment against the paid project, setup posting, authored terms, scope, shift and language. Historical validation uses the captured headcount/payroll sample; later lawful staff changes affect current eligibility but do not rewrite the earned minute.

The integration contract calls for versioned Provider observation rows to retain the effective scoped distributor responsibility and its exact qualification fields, including the nested version-1 certificate (`id`, customer, issuer and holder, scopes, accepted/effective/expiry minutes, project ID and posting ID). Historical checks bind both records to their paid projects and expiry interval, rather than treating an actor role or an unexpired label as procurement evidence. Integration snapshots for t2 must be actual, scenario-verified product edges with matching deployment IDs, versions and generations in every one of the 60 samples; alternating single edges cannot be combined into a qualifying pair. They are deduplicated by `customerId + integration ID`, matching the existing market qualification rule.

## Qualification rules

- **c3** needs at least three active customers from three different configured markets over 60 consecutive minutes.
- **c5** and **Level 7** need all five configured market IDs across those minutes.
- **t2** needs at least three customers in two markets and two distinct current integration/customer pairs.
- Every participant remains actively supported and boundary-covered each minute, and records at least one new central customer settlement in the sampled interval. Level 7 additionally requires the market's language, a current carrier resource and a valid scoped distributor project at every minute.

Current readiness is separate from historical proof. A current sample checks the live named roster, shared support slots, source support configuration, and (for Level 7) the observed carrier and active distributor qualification. Historical proof recomputes the 60 sampled assignment and paid project lineages. A later team reduction can make the current window ineligible without removing an earlier earned receipt. The exported retention pins include the standard seven interaction/case/job/record/incident/project arrays plus customer, posting, boundary, integration and distributor metadata.

The helper exports `operationPlan(request)`, `canOrder(state, request)`, `capacity(state, {personId, customerId})`, `sample(state, customerId, at, hooks)`, `evaluate(state, hooks)`, `validateEvidence(state, sourceId, evidence, hooks, options)`, sample-lineage validators, `retentionPins(evidence)`, and `source()` for worker assembly. `validateEvidence(..., {historical:true})` is intended for receipt restoration; parent dispatch must still run the existing authoritative Provider support-sample validator and current-readiness gate before issuing a claim.

This is a synthetic market/support adaptation. It does not assert geographic coverage, legal approval, real provider employment, or catalogue completion. The helper alone does not establish public-dispatch or visible-control acceptance; those require parent integration and public Provider tests.


## Coordinator integration contract (not implemented by this isolated branch)

The standalone helper and renderer are ready for integration review. The ordered static assembler discovers these files, but `SOC.dispatch`, the strict campaign schema, worker source composition, support-sample codec, claims, inspector caller and locales **are not yet integrated**. Existing helper fixtures deliberately supply a trusted test validator; they are domain counterexamples, not paid campaign, restore-transport or browser acceptance. Do not import a permissive test hook into runtime.

### Purchase, installation and replacement

Use one exact public command through the existing Provider boundary:

```js
{type:'provider', command:{
  action:'operate', customerId, operationId:'provider-support-coverage',
  config:{market, personId, coverageId}, quoteRevision
}}
```

This is an integration proposal; the current dispatcher does not accept it. Normalize `config` to the exact helper request `{customerId,market,personId,coverageId}`. Call `canOrder` during both quotation and atomic commitment. Recompute canonical `operationPlan`; never accept prices, scope, language or names from the command. Recheck revision, idempotency, cash, available implementation support and named reservations before one setup posting. Save the canonical request as `project.supportRequest` at commitment so a running/blocked order already reserves its named person and customer scope. A rejected/stale quote preserves its UI draft and commits nothing.

| Coverage | Setup cents | Period cents | Work minutes | Engineers | Support during work | Shift |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| business-hours | 9000 | 8000 | 4 | 0 | 1 | minute-of-day 480 inclusive to 1200 exclusive |
| extended | 18000 | 16000 | 6 | 0 | 1 | 0 inclusive to 1440 exclusive |

The root chooses and validates the existing scenario minimum term using `mission.termPeriods`; quote its remaining exposure explicitly. Add that canonical `minimumTermPeriods` to the projected `terms` for display. The helper does not change contractual liability. Resource list is empty: this buys named Provider support coverage, not customer people, capacity, carrier sessions or licences. Shared headcount continues to require normal paid staffing and payroll. One distinct named person consumes one ongoing paid support slot, at most two customers in that person's market. Pending orders reserve those slots before installation. Normal implementation work also occupies actual support slots until its quoted `dueAt`, so the same finite staff cannot qualify ongoing coverage while busy installing it; waiting for later assessment does not hold implementation staff indefinitely.

Preserve standard operation timing: `dueAt=acceptedAt+workMinutes`, `configSubmittedAt=dueAt`; trusted child submission receipt `installedAt=configSubmittedAt-1`. Only mark complete when the assignment is installed; readiness never follows from an offer, desired plan or pending receipt alone. Recurring service exposure begins at actual project completion under the ordinary operation billing rule. A pre-installation cancellation retains its setup posting and canonical request, removes the reservation, and creates no installed assignment.

A business-hours customer may buy extended coverage for **the same person and customer**. `canOrder` returns `supportReplacesProjectId`; root includes this exact predecessor and old remaining liability in the quote, revalidates it at commitment and stores the ID on the new paid project. The old assignment remains effective until the replacement completes; then only the new assignment is current. The helper rejects cross-customer/person replacements, early delivery and overlapping duplicate coverage. Existing old setup/payroll postings and sampled history stay unchanged. Billing must retain the old minimum obligation until its end and cease the superseded recurring service thereafter; bill the new coverage independently from its completion. The helper does not issue refunds or edit prior invoices. Root must add a separately validated replacement financial transition rather than treating this personnel pointer as a generic retirement override.

### Sampler and historical claims

1. Gate the new experience/schema using a versioned campaign marker. Unknown versions must fail; older saves continue under their validated existing experience. Add factory source to worker assembly and call `validate` on owned restored state.
2. At each actual shared minute, call the existing authoritative `sampleSupport`, then `sample(state,customerId,clock,hooks)` for each same-cohort participant. Append `namedSupport` and `distributor`, plus the exact currently verified integration snapshot, to a new validated sample version. `eligible` must require both base and regional checks. Do not start a second clock or create synthetic jobs/bills. The present strict facts decoder rejects these extra keys until explicitly versioned.
3. Extend the existing dictionary codec with these exact fields without losing retained per-minute payroll, support availability or configuration lineage. The helper snapshot now contains `implementationSupportSlots`, derived from real accepted/due project intervals. No alias/label/locale substitution counts as a market. Every sample keeps a stable cohort, market, resource/boundary configuration, named assignment and integration set; any gap/change invalidates that 60-minute candidate. A new unchanged 60-minute interval can later qualify.
4. Supply `validateSupportSamples` that first validates the base canonical fields against real Provider jobs, assignments, cases, central period history and postings, then validates regional fields using `validateSampleEvidence`. Its success cannot be a saved boolean. The base validator needs a validated projection without extension keys, or an explicitly versioned full schema. `observeResource` must call actual observation; `responsibilities` must call real scoped responsibility evaluation; `customerRoot` resolves only the campaign's retained portfolio ID.
5. For t2 use actual compatibility status. Historical `integrationValidAt` must validate the **retained paid integration test/project/generation and delivered-task evidence at that minute**, not current compatibility after a lawful later upgrade and not the saved edge's claimed status. Preserve this trusted provenance independently when live edges are replaced.
6. Claim using existing `claim-progression` after current `evaluate` returns ready; source ID remains exactly c3/c5/t2/L7. No cash, capacity or employee is awarded. Save the exact returned evidence under the standard receipt and retain an independent claim-time support/history snapshot, as the central support receipt does. Historical validation must bind that immutable parent-owned snapshot, projects and real job/bill lineage; coherently rewriting both sampled staff counts and a rehashed receipt must not fabricate paid coverage. The helper by itself cannot supply this independent trust anchor.
7. Union `retentionPins` into existing retention before pruning. It includes scoped customer/job/interaction/case/project/posting/boundary/integration/distributor references. Preserve earned historical evidence after actual later staffing reduction, retirement, expired qualification or integration rebase; current eligibility must separately become unavailable. When restoration calls `validateEvidence(...,{historical:true})`, supply the historical lineage hooks above.

### Contextual UI adapter

Call `inspectCustomer(state,customerId,hooks)` for the selected customer's inspector and render through `SOCProviderRegionalSupport.render(model)`. Root may append validated `retainedClaims:[{sourceId,receiptId}]`; this never implies live eligibility. Offer buttons use `data-provider-action="quote-regional-support"` with `data-customer`, `data-market`, `data-person`, `data-coverage`. The root handler opens the ordinary quote comparison and sends only the exact public command above. Disabled controls expose readable scope/shift/staff blockers; raw evidence is in a collapsed details element. Final quote terms, cash and minimum obligations come from `SOC.provider.quote`, not renderer calculations. Add the static keys in `/tmp/provider-regional-support-labels.json` to all six locales before integrating the UI. A DOM pass does not establish mobile geometry, touch targets or browser accessibility.

### Useful unlock contract still requiring authored integration

These are proposed earned alternatives, not claims about original source entitlements. Do not re-lock existing expansion or standard coverage. A minimal common mechanism is a claim-scoped support offer using the same named roster and actual shared payroll, with a different setup/recurring/work tradeoff. The coordinator must author versioned terms and verify paid delivery before any assertion closes. c3 should enable a costed second-customer regional rollout; c5 a repeatable five-market scoped provisioning option; L7 a distributor-qualified managed coverage option; t2 a reusable integration-aware support assurance policy that suspends on scope/version loss. Do not implement t2 by merely displaying a different price or granting an uncosted automation marker. These follow-on orders/policy mechanics remain engineering work outside this helper and must appear as open criteria until executed.

## Verification added in this branch

`tests/provider-regional-support.test.js` exercises pending reservations, finite named scope, actual-shift predicates, paid replacement lineages, installation timing, malformed/changed samples, per-minute distinct integration requirements, source-serialized equivalence and historical proof after later staffing/coverage changes. `tests/provider-regional-support-ui.test.js` covers deterministic frozen-input rendering, scoped quote controls, readable cost/shift/refusal comparison, escaping, translations and historical/current separation.

Required coordinator public tests remain: legally fund all five markets and named people; run 60 real minutes with real bills and human work; L7 requires five real distributor procurements/qualifications; t2 requires two actual paid tested integrations; lose coverage through real shift/staff/dependency conditions, pay for replacement and qualify a new full interval. Exercise stale quote, duplicate request, insufficient cash/staff, nested/worker/MCP refusal, pending save/restore, coherent forged sample/receipt/history rejection, pruned valid receipt restoration, earned offers and actual desktop/mobile controls. No source acceptance, registry promotion or full release claim follows from this isolated branch.
