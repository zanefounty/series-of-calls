# WP-ADMISSION-SECURITY — independent communications abuse controls

Status: synthetic controls, shared-dispatch voice-call lifecycle, and typed admin panel are implemented and tested. The source progression award remains pending; transport-site placement and campaign/source-goal integration are not represented as complete.

## Source contract

`progress.goal.scrub` is the preserved source row for “Stand up DDoS defences.” The original row describes a scrubbing center attached to infrastructure capacity and service sales, with a source reward of 20,000 and predicate `hasScrub()`. That amount is source-game currency and is not converted to AUD or a runtime award. The source is retained in [admission-security.json](../../content/admission-security.json), together with related `progress.incident-mechanic.scrub`, `action:scrubUp`, `action:scrubMode`, `state:S.scrubMode`, `state:S.scrubs`, `requirement:scrubbed`, `requirement:scrubnear`, protection asset and tier IDs.

The source requires separate volumetric protection, SIP abuse controls and toll-fraud controls. It also distinguishes transport protection mode/capacity charges from UC service costs. Source clean-bandwidth tiers remain provenance and never become PPS, sessions, agents, seats, or AUD. `requirement:scrubnear` remains pending because there is no physical scrubbing-site inventory or geographic continent model. A filtered packet flood is not proof that a call or application recovered.

## Module API

`src/game/38-admission-security.js` exports `SOC_ADMISSION_SECURITY` and `socAdmissionSecurityKernel`.

- `create(rootState)` returns optional root state `admissionSecurity`.
- `command(rootState, command)` accepts only configuration staging, observations, synthetic peer observations, and bounded packet/signalling batches. Synthetic input never opens a call or creates success evidence.
- Controls use independent desired, pending/ready/failed provisioning, effective and observed state.
- `advance(rootState)` must run once per root simulation minute. It resets per-minute packet buckets and per-peer attempts-per-simulated-second buckets, and promotes staged configs. Reads do not consume counters or mutate observations.
- `preflight(rootState, interaction, context)` is pure and returns all independent blockers for an outgoing voice attempt. Context is parent-derived: `{peerId,method,messageBytes,messageValid,destination,secondOffset}`. `destination` is the normalized synthetic destination selected by core routing.
- `admit(rootState, interaction, context)` rechecks preflight, records an admitted/blocked event and consumes one SIP attempt only after admission.
- Successful admissions retain a compact immutable receipt linked to the interaction, effective policy generations and admission event ID. Save validation requires that receipt to link to a live reservation or settlement. If the event ring has evicted the event, the receipt remains valid only when the ring is full and all retained event IDs are newer; retained calls must also carry the terminal core admission trace.
- `admitUsage(rootState, interactionId)` runs immediately before a live queued/handling voice call contributes to the core minute's usage. It reserves that call's next 2-cent voice minute only if both per-interaction and rolling-window caps allow it. A block must exclude that call from the core usage and cost before billing.
- `settle(rootState, interactionId)` is called for terminal calls. It reconciles each reserved minute against an actual core `minute-N` ledger row, including that call's ID in `voiceInteractions` and the aggregate `usage`/cost. It transfers held usage to rolling spend without posting another cost. Settling is idempotent.
- `release(rootState, interactionId, reason)` releases a reservation for a failed/no-charge call. A reservation with already accrued voice minutes cannot be silently released; those minutes must reconcile through settlement.
- `evaluate`, `inspect`, `validate`, `fingerprint`, and `source` support pure grading, saves and worker serialization.

## Required parent integration

The shared core exposes the module as an optional root pack through validated `SOC.dispatch({type:'admission-security',command})` paths, worker serialization and restore validation. It calls `advance` once inside each root minute and includes policy/observations in campaign fingerprints. Do not call `preflight` or `inspect` as a token-consuming operation.

In the outgoing voice path, derive peer, normalized destination, method and message validity from core state. Call `admit` before accepting the call; rejection stops the interaction and appends synthetic reason traces. Immediately before the per-minute core usage calculation, call `admitUsage` for each eligible voice interaction. Put precisely the admitted interaction IDs in that minute's `voiceInteractions` array, with `usage` equal to its length; the existing core ledger records usage and its existing 2-cent-per-voice-unit cost. When a call becomes terminal, call `settle` so successful and failed calls reconcile already incurred usage; call `release` only for failures with no billable minutes. Module state records the matching core minute row IDs and never posts a second charge or invents money.

The core acceptance suite proves an allowed resolved voice call succeeds through all three active controls; packet flood and SIP abuse fixtures fail independently; a blocked destination/spend attempt accrues no new call cost; an allowed call's actual voice-minute cost is reconciled once; and state, traces and behavior match after restore and worker dispatch. `SOC_ADMISSION_SECURITY.evaluate(...).sourceGoalStatus` reports core shared-dispatch integration complete while the source progression award remains pending; this pack alone does not earn `progress.goal.scrub`.

## Acceptance scope

AC-SOC-169–176 cover source-row traceability and unconverted source reward, staged configuration, independent PPS filtering, authenticated/method/rate-aware SIP checks, destination prefixes and AUD-cent spending, per-minute reservation and core-ledger reconciliation, explicit bucket reset, blocked synthetic trace evidence, strict retained interaction/admission proof, valid full-ring pruning, pure evaluation/save validation, and source serialization. AC-SOC-197–198 exercise normal shared-dispatch call admission and ledger settlement. AC-SOC-199–200 cover the typed admin panel, read-only mode, and ordinary core interaction submission. These tests do not establish completion of the original source progression goal.
