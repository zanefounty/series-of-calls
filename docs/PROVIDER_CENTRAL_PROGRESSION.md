# Provider central progression evidence

This adapter implements the Provider evidence for `progress.progression-level.5` (National communications SP) and `progress.progression-level.6` (Public-service communications specialist). It uses the campaign, tenant, ledger, boundary, workload and information records already produced by validated SOC commands. It does not award cash or infer product certification, legal approval or regulatory acceptance.

## Level 5: National communications SP

Readiness requires two distinct live customer tenants in the same complete, profitable Provider settlement period. Each must have:

- paid, effective base, carrier and partner projects, plus current paid Orchard MSP support;
- a completed paid `cisco-provider-operations` deployment effective before the qualifying period;
- a real completed outbound PSTN call with a public number, ordered route, admitted carrier path, two-way media, assigned trained human, retained case context and a resolved interaction; and
- the customer's own retail revenue, provider wholesale and usage costs, and central settlement rows that reconcile to the period history.

The call proof uses the runtime's actual `CALL_REQUEST`, `ORDERED_ROUTE` and `CARRIER_PATH_ADMITTED` trace records. A guest admission or a catalogue deployment does not stand in for an outbound call. The evidence keeps the customer's durable original acceptance time; the candidate period must still begin after the current accepted renewal.

After a claim, the two paid carrier offers remain separate choices: national headroom costs A$260 setup plus A$60 per period and takes six work minutes with one engineer; supplier-managed headroom costs A$140 setup plus A$90 per period and takes eight work minutes with one support worker. Both add eight sessions to the selected evidenced customer. The public fixture funds one alternative on each tenant. These purchases change neither the historical wholesale statement nor its recorded resource-generation proof.

## Level 6: Public-service communications specialist

Readiness requires an active Government customer with a paid eligible regional-cloud or local-processing architecture, the actual Government mission victory, a seeded speech support-boundary incident and its unique paid speech repair, plus qualified period history backed by a real complete recording and completed local-jurisdiction speech processing.

The architecture proof compares every bound flow with the authored architecture recipe for processing, storage, backup, key custody, administration and support regions. Resource readiness and the paid architecture project are checked independently. The incident row does not carry a repair-project ID; the adapter links it to the unique completed repair for that customer whose speech receipt and submission/completion times match the resolved incident. Processing is tied to the actual final information job whose `parent` is the transcript record; its timestamp comes from the retained job's `createdAt` field.

The Government follow-on is a paid capture reserve: eight more concurrent recording reservations, A$380 setup, A$60 recurring per period, twelve work minutes, one engineer and one support worker. The reserve may increase capture capacity above the architecture recipe's baseline while the original jurisdiction and boundary requirements remain in force.

## Validation and retention

`evaluate(state, hooks)` produces current readiness. `validateEvidence` rechecks the actual jobs, interactions, assignments, case ownership, configurations, projects, postings, settlement rows, boundary incident/repair and retained source records. The L5 responsibility snapshot is bound to the canonical MSP identity, the exact union of paid stage resources, its partner-stage posting, authored stage costs and a fresh sampled workforce/payroll responsibility record retained at claim time. That separate retained sample allows historical validation after the rolling 60-minute sample window and after a lawful later staffing change. Paid stage acceptance and completion times must match the project records exactly. Recomputed receipt digests do not bypass these source checks. Historical validation permits later configuration generations while requiring the saved generation to be no newer than the current one and retains the exact authored boundary snapshot. Missing interactions after routine pruning make a new claim ineligible; they are not reconstructed from a caller-provided success flag.

`retentionPins(evidence, customerId)` returns the exact interaction, case, workload, processing, record, incident and project references that the root progression receipt must retain. The module's `source()` serializes the same pure implementation into worker execution. Current eligibility and historical claim validation remain distinct.

The behavioural fixture `tests/provider-central-progression.test.js` exercises a public SMB campaign through two independently supported customers, a common qualifying wholesale period, a public Level 5 claim and both paid carrier headroom alternatives; it also exercises Government mission victory, the actual boundary incident and repair, source-bound processing evidence, claim and restore, plus refusal and recomputed-digest support-forgery cases. These bounded tests do not close other progression levels, missions, actor families or source-catalogue obligations.
