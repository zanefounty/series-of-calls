# WP-ISSUE-EXERCISES — bounded operator-report training exercises

Status: optional exercises for mechanics already represented by the synthetic runtime. This pack does not accept archive proposals as product requirements and does not claim to reproduce the historical incidents.

## Evidence and limits

The source set is the bounded historical Cisco VoIP and VoiceOps sample in [WP-CISCO-VOIP-ISSUES](WP-CISCO-VOIP-ISSUES.md) and [WP-VOICEOPS-ISSUES](WP-VOICEOPS-ISSUES.md). The source records are [Cisco findings](../../research/community/cisco-voip-findings.json) and [VoiceOps findings](../../research/community/voiceops-findings.json). Posts are anecdotal, historical and sometimes unresolved. The archive root and month indexes were not available to the research agent; the linked individual pages are the evidence actually sampled. The runtime scenarios use synthetic names and destinations.

The pack contains two deliberately narrow exercises:

| Exercise | Source | Behavior demonstrated | Important gap |
| --- | --- | --- | --- |
| `directional-media` | `RES-CISCO-VOIP-002`, posted 2014-04-30 | Carrier inbound media disabled, a voice test produces one-way media, then media is restored and a fresh call has both directions. | The engine does not model a blind-transfer-created leg, SDP renegotiation, CUBE/Lync behavior or early-offer trunk profiles. This is not a reproduction of the transfer-specific report. |
| `carrier-outage-recovery` | `voiceops-2010-12-dash-outage`, posted 2010-12-15 | A real synthetic carrier fault causes signalling failure; after clearing it, a fresh call succeeds with bidirectional media. | The source thread does not establish outage cause, scope, duration or resolution. The engine does not model incident evidence confidence, communications, alternate routing or the reported provider event. |

Further researched issues remain pending where the current runtime cannot reproduce the necessary mechanism. See `content/issue-exercises.json` for stable source IDs and explicit gaps. In particular, the pack does not simulate transfer-leg SDP negotiation, hold/resume profiles, BLF firmware, ingress-node membership, room URI drift, import row conflicts, peer codec negotiation, or transport keepalive expiry. Do not create a success/failure by setting an exercise-specific canned flag.

## Module contract

`src/game/40-issue-exercises.js` exports `SOC_ISSUE_EXERCISES` and the source-serializable factory `socIssueExercisesKernel`.

- `create(rootState)` returns optional state for `rootState.issueExercises`.
- `command(rootState, command, hooks)` accepts `step`, `select`, `restart`, and `cancel`. Steps are the explicit commands returned by `referenceCommands(exerciseId)`. A step calls the parent-supplied `dispatchRootCommand(rootState, actualSocCommand)` hook. The hook must use the normal validated SOC dispatch boundary, return a root state with an increased revision and the exact nested command as its last recorded command. The module validates that evidence and adopts the returned state in place so it composes with the enclosing SOC dispatch clone. A new exercise can be selected after the prior run has recorded all of its steps. Switching away from a partial run is rejected until the learner explicitly restarts that exercise or cancels its active selection. Restart clears only that exercise's progress; root interactions remain as historical evidence.
- `evaluate(rootState, exerciseId)` is read-only and derives success from actual interactions, completed interaction phase, obligations, media traces and current carrier state. A `200_OK` or media trace before the interaction resolves does not establish a pass. Recorded step names do not establish a pass.
- `inspect`, `validate`, and `fingerprint` support parent integration. Fingerprints contain exercise progress, not transient call traces.
- `source()` emits the module factory for worker serialization.

The shared kernel starts the optional pack with `{type:'issue-exercises',command:{action:'start'}}`, routes step commands through the normal SOC dispatch validator, validates saved `issueExercises` state, exposes read-only inspection, and includes the factory in worker source. A step dispatches only the module's literal allowlisted SOC command; callers cannot provide arbitrary nested commands. AC-SOC-149–156 exercise the module contract. AC-SOC-157 and 159 add selected shared-dispatch, restart, save/restore, and worker checks; AC-SOC-160 checks the learning controls under the edit lock. These cases validate the described synthetic paths only; they do not reproduce the source-specific blind-transfer sequence or the historical provider event.

## Acceptance scope

AC-SOC-149–156 cover source caveats and pending gaps, successful reproduction of both supported failure/recovery pairs, command allowlisting, pure assessment, save validation, and worker source serialization. The recovery checks require call handling to resolve without obligations after bidirectional media is observed. These cases establish only the described synthetic runtime mechanics. They do not complete the broader archive proposals or the full source conversion.
