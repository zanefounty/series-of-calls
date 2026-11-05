# Provider regional support and market evidence

This helper adds paid, named Provider workforce coverage to the existing 60-minute Provider support observation. It adapts the canonical identities `progress.goal.c3`, `progress.goal.c5`, `progress.goal.t2`, and `progress.progression-level.7`; it does not award them automatically or alter their thresholds.

## Evidence and terms

The optional version-1 operation is `provider-support-coverage`. Its exact plan request is `{customerId, market, personId, coverageId}`. The authored roster has one named Orchard MSP support person per market, with `support` skill and the market's configured language. `business-hours` coverage is 08:00–20:00 (A$90 setup, A$80 per period, four work minutes and one support slot); `extended` covers all minutes (A$180 setup, A$160 per period, six work minutes and one support slot). These are fictional balance terms.

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

The v3 Provider observation rows also retain the effective scoped distributor responsibility and its exact qualification fields, including the nested version-1 certificate (`id`, customer, issuer and holder, scopes, accepted/effective/expiry minutes, project ID and posting ID). Historical checks bind both records to their paid projects and expiry interval, rather than treating an actor role or an unexpired label as procurement evidence. Integration snapshots for t2 must be actual, scenario-verified product edges with matching deployment IDs, versions and generations. They are deduplicated by `customerId + integration ID`, matching the existing market qualification rule.

## Qualification rules

- **c3** needs at least three active customers from three different configured markets over 60 consecutive minutes.
- **c5** and **Level 7** need all five configured market IDs across those minutes.
- **t2** needs at least three customers in two markets and two distinct current integration/customer pairs.
- Every participant remains actively supported and boundary-covered each minute, and records at least one new central customer settlement in the sampled interval. Level 7 additionally requires the market's language, a current carrier resource and a valid scoped distributor project at every minute.

Current readiness is separate from historical proof. A current sample checks the live named roster, shared support slots, source support configuration, and (for Level 7) the observed carrier and active distributor qualification. Historical proof recomputes the 60 sampled assignment and paid project lineages. A later team reduction can make the current window ineligible without removing an earlier earned receipt. The exported retention pins include the standard seven interaction/case/job/record/incident/project arrays plus customer, posting, boundary, integration and distributor metadata.

The helper exports `operationPlan(request)`, `canOrder(state, request)`, `capacity(state, {personId, customerId})`, `sample(state, customerId, at, hooks)`, `evaluate(state, hooks)`, `validateEvidence(state, sourceId, evidence, hooks, options)`, sample-lineage validators, `retentionPins(evidence)`, and `source()` for worker assembly. `validateEvidence(..., {historical:true})` is intended for receipt restoration; parent dispatch must still run the existing authoritative Provider support-sample validator and current-readiness gate before issuing a claim.

This is a synthetic market/support adaptation. It does not assert geographic coverage, legal approval, real provider employment, or catalogue completion. The helper alone does not establish public-dispatch or visible-control acceptance; those require parent integration and public Provider tests.
