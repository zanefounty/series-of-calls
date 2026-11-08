# First-time-player opening comparison

Status: prepared, no participants or results recorded. This protocol compares the two implemented SMB openings at current candidate revision `89bb03e105bfd98bb0401cc61b7d849fa4e2b4f3` (PR #78). Re-pin the revision and verify both routes before any session if the candidate changes. This revision has not been published as a recovery build.

## Session setup

Recruit six to eight people who have not played Series of Calls. Give half the order A then B and half B then A. In the new-career form choose SMB, the peak-window workload, deterministic seed 1, normal difficulty and Sydney market for both openings. Keep the browser and desktop or mobile size the same for both openings for each person. Start each opening with a clean save and note the actual URL, revision, browser, viewport and any assistive technology. Do not demonstrate controls or name the intended tradeoff.

Read aloud only: “Run a reliable service for this customer. You may stop whenever you want.” Start a wall-clock timer when the opening is visible. Observe silently. If the player is stuck for two minutes, record the point and the exact help offered before continuing; helped actions do not count as unaided success.

Opening A is **Take over a funded estate**. Opening B is **Win the first customer**. End each opening after the first delivered work and the first consequential capacity or incident decision, or after ten minutes without progress. Keep the session under 30 minutes including the short interview.

Automated preflight on `89bb03e` passed the funded-estate mobile opening with three funded completed stages, three pending cases, A$14,000 cash, both choices visible and no page errors (report SHA-256 `5477c019f61f41268b235fc9a458508fdec58aeed1f6e5106953aac7d111ee4b`; trace SHA-256 `e70e51208abddfb4bd47a62e0a1ca1864edd0aaa0b54c8661c15b3ad21fd5612`). The peak-window first-customer Chromium route also passed without source drift (report SHA-256 `1ca9603712f8c57a8560b6a07f450c6996d4eb17d510da0d13ab4ad0f7951ed1`). Its scripted first delivered work took 3.95 seconds; that excludes a person's reading and choice time. That route used the form's default seed, so the facilitator must explicitly enter seed 1 in both openings. These are route checks, not comparison participants or evidence for choosing a default.

## Observation record (one row per opening)

| Field | Record |
| --- | --- |
| Participant code and opening order | Anonymous code, A→B or B→A |
| Revision, browser, viewport, seed | Exact values |
| First consequential choice | Action and wall-clock time from opening |
| First delivered work | Observed case/job ID, simulation minute and wall-clock time; write “none” if absent |
| Every required activation | Control label, simulation minute and wall-clock time in order |
| Compulsory pauses and navigation detours | Count and exact cause |
| First failed or delayed work | Actual case/job ID and observed reason |
| Cash and commitments | Before and after chosen purchase, quoted setup and recurring exposure |
| Confusion, help and abandonment | Verbatim comment, help given and stopping point |
| Voluntary continuation | Yes/no after the opening |

After each opening, ask without hints and record the answer verbatim: “What did you buy or inherit?”, “What might fail?”, and “What would you do next?” Then ask which opening made the tradeoff clearer and why. Record a blank or incorrect answer as such; do not interpret silence as understanding.

## Comparison and decision

Report each opening's median and range for time to first choice and first delivered work, the number who correctly explain the acquired service, failure exposure and next objective, the number needing help, and abandonment. Include all raw anonymous rows and verbatim answers alongside any summary. Compare A and B under the same workload and settlement rules. Select the default only after reviewing these observations and correcting any repeated confusion; rerun affected sessions after a UI change. The three-action and 90-second targets are hypotheses, not acceptance facts.
