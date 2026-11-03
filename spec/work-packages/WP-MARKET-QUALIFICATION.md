# WP-MARKET-QUALIFICATION — Sustained market and portfolio qualifications

## Status and source boundary

This package defines a synthetic qualification overlay for `c3`, `c5`, `t2`, `t1`, and progression levels 2, 7, and 13. The market IDs come from the implemented portfolio: `au-sydney`, `au-melbourne`, `us-seattle`, `jp-tokyo`, and `eu-dublin`. They are distinct fictional commercial markets, not continents, Points of Presence, legal approvals, or claims about real suppliers. Sydney and Melbourne share the AU jurisdiction; counting them as two markets does not create two jurisdiction profiles.

The module is `src/game/36-market-qualification.js`, content is `content/market-qualification.json`, and the portfolio-root state is `root.marketQualification`. All seven source rows remain partial: these requirements adapt the requested market and provider progression into observed communications operations. They do not implement source POPs, IX ports/peering, continent coverage, satellite/Mars service, or source cash rewards. The source attributes and witty names remain in `content/progression.json`.

Selected thresholds are fictional v1 gameplay balance, not validated economic balance and not conversions of Gbit/s, POPs, IX ports, peering sessions, or cash. Use the exact portfolio market IDs, customer roots, business ledgers, product compatibility results, workforce rosters, boundary assessments, and service-observation proofs described below; do not accept caller-supplied booleans as evidence.

## Runtime API

The classic-JavaScript factory exports `PACK`, `VERSION`, `CONTENT`, `GOALS`, `create(root)`, `command(root, command, hooks)`, `observe(root, hooks)`, `advance(root, hooks)`, `calculate(root, hooks)`, `inspect(root, hooks)`, `validate(root, options)`, `fingerprint(root)`, `currentProof(root, qualification)`, `currentReadiness(root, qualification, hooks)`, `proofCurrent(root, proof, hooks)`, and `source()`. It requires the real `SOC_PORTFOLIO` object at `root.portfolio`; a root without a started portfolio cannot start the pack. Parent integration must create it only after `portfolio` starts, validate it when present, call `observe` after each portfolio customer/configuration/deactivation mutation to latch a sticky failure, call `advance` once after every shared portfolio minute, add it to calculate/inspect and worker source, and preserve saves where the optional pack is absent. Child portfolio roots must not contain this global pack, and campaign-track switching must preserve it outside per-track snapshots.

Commands are exact:

```js
{ action: 'start' }
{ action: 'open-window', qualification: 'c3' | 'c5' | 't2' | 't1' | 'level-2' | 'level-7' | 'level-13' }
```

Opening a window records the active customer cohort, customer markets and scenarios, effective configuration, active external contract IDs and billed-period counters, current validated integration results, information-boundary assessments, and retained continuity evidence. It does not open if its cohort is currently ineligible. An open window has exactly 60 consecutive portfolio-minute samples. The cohort must remain unchanged and active at each minute. Configuration, support, integration, boundary, resource, or continuity changes fail the window permanently. Closing early, skipping a tick, deactivating a participant, adding/removing a customer, or failing a sampled obligation cannot be repaired into a pass.

Trusted hooks supplied by the parent are `validatePortfolio(root)`, `resourceReady(customerRoot, resourceId)`, `integrationStatus(customerRoot, integrationId)`, and `boundaryAssessment(customerRoot, contractId)`. They must delegate to the central validated portfolio, resource, product-compatibility, and boundary implementations. `integrationStatus` returns the current compatibility status for the exact edge; only `scenario-verified` qualifies. `boundaryAssessment` returns the central evaluation for the exact effective information-boundary contract. The module never fabricates a child root or dispatches child commands itself.

## Evidence and shared invariants

Every participant must be an active portfolio customer with a distinct ID and the exact market/scenario binding stored by `SOC_PORTFOLIO`. Every qualifying bill must link to a `sell:true`, `status:'active'` business contract sold to a customer-role organization, an actual positive external `revenue` ledger entry for a new billed period inside the window, and a support owner with an applicable provider role. Opening capital, loans, funding, internal ledger transfers, core diagnostic revenue, and historical revenue do not count as profit or new billing.

At every sample, each participant must still have at least one active eligible externally billed service contract, a current support owner, a nonempty effective named workforce with available in-shift support/service skills and languages, effective carrier/service dependencies, and an eligible bound information-boundary contract covering a contracted resource. The boundary hook must return the central evaluation result; a profile label by itself is not evidence. Product integrations count only while the central current compatibility check says `scenario-verified` and its version/generation scope still matches.

The per-minute sample retains a bounded participant checklist and bill receipt IDs. Completed proofs retain all 60 samples and frozen cohort/market/contract/integration/configuration lineage. Validation recomputes result counts from samples, checks exact 60-minute sequencing, unique participant/market sets, receipt-to-contract links, boundary and integration evidence shapes, and proof/window/journal cross-links. A saved historical proof remains distinct from current readiness; changing current resources after completion makes readiness stale but does not retroactively remove an earned progression award. When a child ledger has genuinely rolled over, a missing old bill row is accepted only if its ledger is full and every retained row for that contract has a later period/entry ID. Empty or selectively deleted ledgers are rejected. This is structural tamper detection, not cryptographic proof.

## Fictional thresholds

| Qualification | 60-minute evidence |
| --- | --- |
| `c3` | At least 3 distinct active market IDs with a covered customer root in every minute; each has a newly billed external customer contract, named support, effective carrier/service, and eligible information boundary. |
| `c5` | All 5 portfolio market IDs meet the `c3` obligations for the full window. Five city/market IDs remain distinct from the four jurisdiction profiles. |
| `t2` | At least 3 active customer roots across at least 2 market IDs; each has an active newly billed supported contract and staffed support at every sample; at least 2 distinct current version-scoped, scenario-verified integration edges across the cohort. |
| `t1` | At least one active customer in each `smb`, `enterprise`, `government`, and `defence` scenario; every track has supported new contract billing throughout the samples, fresh `rd` continuity proof, and a final 60-minute aggregate external operating profit above 0 cents. |
| Level 2 | At least 2 distinct active customer roots with effective supported services; each records at least one resolved human service interaction linked to its canonical case during the window and has a new external bill. |
| Level 7 | All 5 market IDs meet active supported billing; each has effective carrier, a current staffed support person with the market's configured language, an accepted contract ordered through an organization with distributor role, and an eligible boundary flow. The locale mapping is synthetic (AU/US/IE: `en`; Tokyo: `ja`) and makes no legal claim. |
| Level 13 | All 4 scenario segments have a distinct active supported customer, fresh `rd` continuity proof, and newly billed eligible service; at least 3 distinct provider roles occur across supporting organizations; the complete 60-minute aggregate external operating profit is positive. |

The selected thresholds do not award progress automatically. They produce a tested qualification proof that the progression pack can consume through a separate explicit claim command. Source cash rewards are never converted into finance, and source win flags remain unimplemented.

## Acceptance cases

| ID | Required coverage |
| --- | --- |
| AC-SOC-211 | Five market identities count separately from jurisdictions; c3/c5 reject duplicated jurisdiction labels, inactive pins, and short windows. |
| AC-SOC-212 | Real new billing receipts, active external contracts, support roles, rostered people, resources, and boundary evaluations satisfy c3; missing obligations fail stickily. |
| AC-SOC-213 | c5 requires all five market IDs across all 60 sampled minutes. |
| AC-SOC-214 | t2 requires the customer/market/support target and distinct current compatible integrations; stale or alias integrations fail. |
| AC-SOC-215 | t1 requires all four scenario segments, fresh continuity evidence, and positive external operating profit; funding, opening capital, transfers, and diagnostics cannot pass. |
| AC-SOC-216 | Levels 2, 7, and 13 each use their distinct provider evidence; specifically test support cases, language/carrier/distributor proof, and four-track role/continuity proof. |
| AC-SOC-217 | Sticky failure for skipped minutes, changing cohort, inactivation, contract cancellation, stale configuration, support loss, or boundary/integration drift; current readiness differs from historical proof. |
| AC-SOC-218 | Save validation rejects tampered/deleted samples, receipts, market IDs, proof lineage and journal rows; worker serialization, restore and pure inspection are deterministic. |
