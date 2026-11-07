# Playability recovery: candidate and evidence

This document records the recovery slice against the 7 November 2026 review pack. It is a development record, not a release approval. The reviewed baseline was `a4e7e54b5010b2625c2c982607faa279ab9e5524`; the implementation branch starts from that revision. The complete review ZIP was read and its member hashes checked before implementation.

The implementation and browser driver are in revision `b1401768a84bb293620b75f3699c41d1da4fda7b`, with the opening viewport correction in `1af63d58f1304b25b33990f0aa05fad4cfd186d4`. Later evidence-only commits must cite both revisions when attributing behavior.

## Implemented in this candidate

| Brief requirement | Implementation | Evidence |
| --- | --- | --- |
| Compare two openings | `SOC.create({experience:'campaign',opening:'win'|'estate'})`; estate purchases Swift through the dispatcher, runs real commissioning, records funded project and posting lineage, and opens with a real queue. The default remains the win opening pending human comparison. | `tests/provider-playability-recovery.test.js`; browser opening controls |
| One complete paid plan | `SOC.provider.quote({action:'plan',…})` quotes all three native stages; one Provider dispatch funds all three on its transaction copy. Stage prices, postings, reservations and delivery remain separate. | Atomicity, duplicate request, stale quote, restore and delivery tests in `tests/provider-playability-recovery.test.js` |
| Persistent recovery objective | A resolved historical incident no longer reopens the completed recovery goal. The current objective distinguishes delivery, active failure, first bill countdown and next customer affordability. | `tests/provider-playability-recovery.test.js`; visible SMB browser journey |
| Contextual response | The incident offers priced repair and mitigation directly. One dispatch acknowledges and funds the chosen operation. Accepting exposure resumes time without declaring service restored. | Scoped response test; visible browser incident journey |
| Responsive controls | Provider owns Space and speed keys while active; the SP handler does not change the other clock. Pointer movement pans continuously, cancellation reverts the drag, wheel zoom anchors to the pointer, and rerender restores focus to the same action. | Browser checks and Provider shell tests |
| Outcome reactions | Authored Orchard reactions are triggered once by retained job, incident or settlement IDs and saved with view preferences. They describe observed outcomes without changing simulation authority. | Browser save/reload inspection; Provider engine tests |

New text was registered in the translation dictionaries. Non-English entries added for this slice are English placeholders awaiting translation review.

## Verification commands

Run from the exact candidate revision after freezing code:

```text
npm run i18n:check
npm run build
node --test tests/provider-playability-recovery.test.js tests/provider-rules.test.js
npm run test:provider
SOC_PROVIDER_BROWSER_JOURNEYS=swift-desktop,steady-mobile,keyboard-smb-opening,mobile-hud-opening npm run test:provider:browser
npm run evidence
npm run check:source
npm run check:coverage
npm run check:evidence
npm run test:gates
```

Browser recordings, saves and large receipts belong under `/tmp`, outside Git. Scripted timings are automated observations and cannot answer whether first-time players understood the tradeoff.

## Remaining work and current limits

- Run the first-time-player comparison with real participants. Ask each person, without prompting, what they bought, what can fail and what to do next; record confusion, abandonment, activations and elapsed time. Select the default from those results. No human result is claimed here.
- Complete a 15-minute post-repair opportunity with two viable investments and an observed customer callback. The current bill countdown and optional operations do not yet meet this chapter requirement.
- Stop instant staffing resize arbitrage with a versioned commitment or mobilisation rule, preserving existing workforce history and settlement evidence.
- Add bounded renewal and receipt policies, including explicit exception handling and inspectable suspension; automate only included compatibility checks whose results are still validated.
- Add compatible connection previews and keyboard equivalent, plus focused mobile and pointer-cancel assertions.
- Produce an inspectable fresh-run transcript with a failed or delayed strategy and recovery, cash and service transitions, compulsory pauses and activation counts.
- Re-run all required gates on a frozen revision; preserve any failures. Deployment and externally controlled acceptance changes require their own authorization.

## First-time-player comparison protocol

Use the same scenario seed, costs, workload and settlement contract for both openings, counterbalancing order across 6–8 first-time players. Give only the goal of running a reliable service. Observe the first three choices and first delivered case. After each opening ask, without hints: “What did you buy?”, “What might fail?”, and “What would you do next?” Record answers verbatim, time to first consequential choice and first delivered work, compulsory pauses, detours, confusion and abandonment. Do not treat an automated browser run as a participant.
