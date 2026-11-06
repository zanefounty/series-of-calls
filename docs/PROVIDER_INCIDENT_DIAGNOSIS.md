# Provider incident diagnosis helper

This helper is a bounded proposal for PLAY-024-A03. The acceptance assertion says: “Diagnosis can consume time/effort when the scenario makes it a decision; looking at public information is free.” The existing incident inspector remains free and read-only.

The operation ID is `diagnose-incident`: A$60.00 one-time setup, A$0 recurring, six work minutes, one engineer and one support. The helper returns the terms and incident scope to the dispatcher; it does not reserve money, advance time, acknowledge an incident, repair service, mitigate capacity or grant resources.

## Evidence contract

`SOC_PROVIDER_INCIDENT_DIAGNOSIS` exports `publicInspection`, `readiness`, `plan`, `complete`, `validateDiagnosis`, `validateObservation`, constants and `source()`.

The host `observe(provider, customer, child, incidentId)` hook must return a strict v1 observation at the current child clock. It binds the customer and incident IDs, incident kind/status/fault/receipt, current service readiness and reasons, and bounded path rows containing endpoints, profile, result, reason, and ordered edge snapshots `{id,desiredGeneration,effectiveGeneration,domain,ready}`. A missing effective generation is explicitly `null`. The helper checks the snapshot against the retained incident row. This observation is the host's trusted report of actual service/path state; fixture hooks below the campaign boundary are not evidence of production dispatch behavior.

The paid dispatcher should create the authored operation with config `{incidentId}`, then store the exact `complete()` result in `project.operationReceipt` as `{kind:'diagnose-incident',version:1,projectId,postingId,evidence}`. The host's `validatePaidProject` hook must validate the real funding and project lineage. Historical receipt validation also requires `validateRecordedObservation(provider, customer, project, observation)` to reconstruct or validate the incident/path snapshot from retained authoritative history. Copying or rehashing the receipt is not authority.

Cause classification is conservative. A transport-domain cause requires the retained incident receipt's domain to appear in a failed measured path. Resource outage, capacity, disconnection and boundary causes each require matching incident receipt and current service/path evidence. Otherwise the result is `unconfirmed` with an `accepted-loss` decision; it does not manufacture a diagnosis. A likely cause gives a response category (`repair` or `mitigation`) as guidance only, and both action fields remain `not-performed`.

## Verification status

The focused unit tests use explicitly synthetic hook/project fixtures to test strict shapes, pure inspection/planning, cause evidence, unknown-cause handling, receipt linkage and worker serialization. They do not execute the paid operation through `SOC.dispatch`, prove production observation hooks, or close PLAY-024-A03. A dispatcher integration test and visible costed workflow remain required before acceptance.

## Paid Provider integration

The v8 campaign now quotes and dispatches `diagnose-incident` with exact incident scope. Its ordinary paid project reserves shared staffing for six simulation minutes. Public inspection remains pure; diagnosis completion records a result without acknowledging or repairing the incident. Native outage and disconnected observations are reconstructed from authored incident writes and paid repair receipts for restore validation. Equal-clock acknowledgement can follow diagnosis completion; historical status accepts only transitions permitted at that recorded minute, while the native symptom remains exact. Other failure domains currently produce an explicitly inconclusive result. The helper transport-path fixture is not a claim that production transport diagnosis is integrated.

AC-SOC-740–742 execute actual paid construction, an authored outage, free inspection, charged diagnosis, insufficient staffing, stale/foreign scope refusal, duplicate request idempotency, six-minute completion, later paid repair, restore/worker equality and forged result rejection. These and the six isolated helper tests passed (9 total) in `/tmp/soc-diagnosis-public-r3.log`. Final frozen visible-control evidence remains pending.
