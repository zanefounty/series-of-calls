# Gameplay rebuild exploratory pilot

**Status: prepared; recruitment, sessions and results are pending. No participant has been recorded by this protocol.** Automated journeys, staff rehearsals, screenshots and simulated answers do not count as human evidence.

This protocol implements PLAY-023-A03 and PLAY-052-A01–A03 in [requirements.json](../spec/provider-gameplay-v1/requirements.json), the “Exploratory human pilot” section of the [gameplay specification](../spec/provider-gameplay-v1/series-of-calls-gameplay-ui-spec.html), and the existing [rebuild protocol](PROVIDER_REBUILD.md#exploratory-human-pilot--pending-participants). It includes the owner's additional map-based Training requirement. It does not replace four-mission, fourteen-family, browser, authority or release verification.

## Candidate and recruitment

Recruit 6–8 adults who did not implement this revision: half UC practitioners, half management-game players. Record overlapping experience rather than forcing a false distinction. Use anonymous IDs P01–P08; names and contact details stay outside study notes. Ask about communications work, management-game familiarity, prior exposure to either game, usual input method, language and accessibility preferences. Do not solicit employer/customer details.

Before recruitment sessions, record the exact upstream build and Provider candidate URL, commit, built-asset hashes, content version, seed/profile, browser/version, OS, hardware, viewport, device/input and speed settings. Freeze tested builds. Verify each assigned starting scenario and alternate constraint through real controls, with a legitimate failure/recovery and affordable choices. This rehearsal is engineering evidence only. A broken essential control is a defect to fix, not a reason to teach participants a hidden workaround.

Use a desktop at 1366×768 for both primary games; allocate 1440×900 evenly in a separate cohort only if needed and report it separately. The mobile supplement uses 390×844 with real touch where available; label emulation explicitly. Keep viewport, equipment, time allowance and introductory explanation the same within each upstream/Provider comparison. Participants may use reduced motion, sound off or other accessibility settings; record them and preserve them across restarts. Test the alternate input without requiring an inaccessible interaction.

## Consent script and data handling

Read before observation: “We are testing the game, not your ability. Participation is voluntary. You can skip a question, take a break or stop at any time. We would like to observe your actions and take anonymous notes. Screen or audio recording is optional and requires your separate agreement. Please avoid entering personal or work information. We will report observations under a participant code and will not describe automated runs as people playing.”

Record separate yes/no consent for participation, anonymous quotations, screen recording and audio. Declining recording does not prevent participation. Agree the retention/deletion date and who can access raw notes before collecting data. Store notes, recordings, traces and full saves in the approved private external location, not Git. Retain only consented anonymized findings in a later concise repository summary. The facilitator records withdrawal/deletion requests without publishing identity. No recruiting messages are authorized by preparing this protocol.

## Counterbalanced assignment

Use the first six rows for a six-person pilot; add both P07 and P08 for eight. Randomly assign people within their experience group to its available rows before sessions. The IDs below are **empty scheduling slots, not participants or results**.

| Slot | Recruitment group | Primary game order | First Provider plan to inspect | Supplemental device order |
| --- | --- | --- | --- | --- |
| P01 | UC practitioner | Upstream → Provider | Swift | Desktop → Mobile |
| P02 | Management-game player | Provider → Upstream | Steady | Mobile → Desktop |
| P03 | UC practitioner | Provider → Upstream | Steady | Mobile → Desktop |
| P04 | Management-game player | Upstream → Provider | Swift | Desktop → Mobile |
| P05 | UC practitioner | Upstream → Provider | Steady | Mobile → Desktop |
| P06 | Management-game player | Provider → Upstream | Swift | Desktop → Mobile |
| P07 | UC practitioner | Provider → Upstream | Swift | Desktop → Mobile |
| P08 | Management-game player | Upstream → Provider | Steady | Mobile → Desktop |

Half of either sample sees each game, plan and supplemental device first. Both primary games remain on the same desktop, so device differences do not masquerade as an upstream/Provider preference. Plan order is an inspection prompt, not a forced purchase: ask participants to compare both and choose. In the changed-constraint exercise ask them to consider the other strategy; record refusal or a reasoned decision to keep the original plan. Do not make reaching one recipe the success criterion.

Record actual order and deviations. Report findings by experience group, first game, actual selected plan and device. This small counterbalanced pilot can reveal usability problems; it cannot establish statistical superiority or a scientific “fun score.”

## Session schedule and neutral tasks

Allow approximately 85–100 minutes including breaks; participants can stop earlier. The **20–30-minute target applies to each primary game loop**, not to the entire research appointment.

1. **Introduction and consent, 5 minutes.** Give the same short explanation: “Build a service business, meet customers' needs, manage costs and respond when service goes wrong. Use the information in the game. Tell us what you expect your choices to change.” Explain think-aloud without teaching controls or solving the scenario.
2. **First primary game, 25 minutes, maximum 30.** Start a fresh ordinary game. Let the participant choose, build, operate and react. Use the corresponding neutral task card below. Do not direct them to a button or purchase order.
3. **Brief comprehension questions and break, 5 minutes.** Ask questions only after the timed loop so they do not teach the solution during first-choice/delivery measurement.
4. **Second primary game, same 25–30-minute allowance.** Use a fresh save and the same task goal. Record prior-game learning as an order effect.
5. **Changed constraint, 8–10 minutes.** Run the preselected supported Provider alternate profile/seed from a fresh save. Show the changed brief and ask what they would change. Observe a real decision, not only a stated preference.
6. **Device/input and Training supplement, 10 minutes.** Use short equivalent fresh Provider opening/inspection tasks in the assigned desktop/mobile order. On desktop ask for a brief keyboard-only route to a quote, its cancellation and incident inspection. On mobile ask to open/close a sheet, compare a quote, select a dependency and find the bill. Open one Training lesson on its map, ask for its objective and a permitted action, then ask how its assessment differs from Provider money. Preserve separate saves. These are supplemental observations, not another full mission claim.
7. **Debrief and optional continuation, 5–10 minutes.** Ask the questions below, then offer a real, consequence-free choice to continue for up to five minutes or finish. Record both the answer and whether play actually continues. Do not penalize stopping or persuade them to stay.

**Provider primary task card:** “Start a small communications provider. Compare the two opening plans and choose one. Get a customer's service working, see whether it delivers useful work, respond to a service problem, explain the bill, decide whether to renew or exit, and consider a second customer using the same money and team.” Show no schema fields, solver instructions, command snippets or pack-start checklist. Leave coaching dismissible/resumable and acceleration discoverable.

**Upstream primary task card:** “Start a small provider. Choose an initial investment, get customers receiving service, respond to a service problem, inspect operating costs and income, and decide how to expand using the same business resources.” Preserve the upstream rules; do not pretend it has the same communications settlement or renewal controls. Compare clarity, decision and consequence, not unlike numeric units or completion counts.

**Changed-constraint card:** “This new customer/profile has a different requirement. Compare it with your earlier plan. Explain your next investment or operating response, then try it.” Before sessions, fill the alternate-profile fields with an actually supported variant that changes workload, deadline, dependency, market willingness or staffing constraints. Record the exact changed fact, source content version and why at least two responses are credible. A seed that changes nothing useful is not an adaptation test. Do not inject faults or edit customer requirements during Provider play. If the candidate offers no usable changed constraint, record an engineering defect and leave this measure untested.

## Measurement definitions and scoring

Use wall-clock timestamps, not simulation minutes. Start timing when the interactive fresh-game page and task prompt are available, before the first purchase. Record browser/tool failures and breaks separately; retain total elapsed time and optionally active-task time. Do not silently subtract time spent searching, waiting for commissioning or finding acceleration.

| Measure | Operational definition / recording |
| --- | --- |
| First consequential choice | First explicit commitment to a costed plan/operation that changes shared cash, obligations, capacity or staffing. Record choice, quote and authoritative result. Opening a quote alone is a separate timestamp. Target: ≤2 minutes. |
| First delivered service | First non-probe autonomous customer job visibly reported completed, linked to actual simulation evidence. Record when the engine completed it and when the participant first noticed it. Commissioning, a spinner or a purchased licence does not qualify. Target: visible delivered work ≤5 minutes. |
| Full operating loop | Observe investment → actual operation → consequential incident response → history-based settlement/bill explanation → expansion decision within 20–30 minutes. Record which steps were reached; do not substitute a screenshot for missing work. |
| Setup and inspection effort | Total time building/commissioning versus reading/inspecting versus waiting/searching; timestamp transitions. Distinguish useful comparison from confusion. |
| Goal understanding | After play: 0 = incorrect/unexplained; 1 = partly correct or prompted; 2 = independently describes delivered customer outcomes, shared costs and sustained progress. Keep a short verbatim consented explanation. |
| Tradeoff explanation | 0 = no causal tradeoff; 1 = names one cost/capacity factor or needs a prompt; 2 = explains at least two competing consequences with a reference to the actual choice. |
| Failure cause | 0 = incorrect/no cause; 1 = symptom or prompted cause; 2 = identifies an actual constrained dependency/unit or staffing condition and a plausible response. Verify against read-only event evidence after the session. |
| Bill comprehension | Can distinguish setup, recurring/usage, earned revenue, credits and debt; quote the participant's explanation and compare with the recorded period. Mark absent/unreached separately from incorrect. |
| Adapted plan | Record previous and changed constraint, proposed response, actual chosen action and resulting consequence. Score 0 = ignores change; 1 = notices but no useful actionable revision; 2 = makes a justified relevant revision, or correctly justifies keeping the strategy under the new facts. |
| Meaningful decisions | Count comparisons with materially different cost/time/capacity/risk consequences. Do not count every click, field or tick as a decision. |
| Help/interventions | Timestamp every request and facilitator action, including whether it revealed a control or solution. Assisted completion cannot be reported as unassisted. |
| Continue | Record voluntary yes/no/undecided, observed continuation duration and reason if volunteered. Separate behavior from a satisfaction answer. |

The specification's proposed eight-person target is **six of eight independently explaining the goal and one tradeoff, with nobody trapped by a missing essential control**. For six participants, report the numerator/denominator and observations; do not quietly invent an equivalent accepted threshold. Report every two/five-minute miss and incomplete loop. These are design targets, not current performance claims or a substitute for fixing defects.

During tasks the facilitator may say “What are you trying to do?” or “What did you expect?” without pointing to the answer. After 60 seconds without progress, offer “Would you like help, or more time?” Log any assistance and continue if requested. Stop and save evidence for a crash, inaccessible essential control or repeated unresolvable refusal. User frustration and accessibility needs take priority over finishing a script.

Debrief questions: “What was your goal?”, “Why did you choose that plan?”, “What did it give up?”, “Why did that customer succeed or fail?”, “What did the bill charge for?”, “What would you buy or change next?”, “What changed your plan in the second profile?”, and “Would you like to keep playing, or finish here?” Ask before explaining the intended answer.

## Empty recording templates

Create one private record per real participant only after consent. Leave unobserved fields null; use `not_reached`, `declined` or `environment_blocked` with a reason instead of invented values.

```json
{
  "participantCode": null,
  "group": null,
  "priorExperience": null,
  "consent": {"participation": null, "anonymousQuotes": null, "screen": null, "audio": null},
  "actualGameOrder": [], "actualPlanInspectionOrder": [], "actualDeviceOrder": [],
  "candidate": {"url": null, "commit": null, "artifactHash": null, "contentVersion": null},
  "upstream": {"url": null, "commit": null, "artifactHash": null},
  "environment": {"browserVersion": null, "os": null, "hardware": null, "viewport": null, "input": null, "preferences": null},
  "profile": {"scenario": null, "market": null, "seed": null, "difficulty": null},
  "timing": {"startedAt": null, "firstQuoteSeconds": null, "firstCommitSeconds": null, "engineDeliverySeconds": null, "noticedDeliverySeconds": null, "loopSeconds": null, "breakSeconds": null},
  "loopReached": [], "selectedPlan": null, "meaningfulDecisions": [],
  "goalScore": null, "tradeoffScore": null, "failureCauseScore": null,
  "billExplanation": null, "changedConstraint": null, "adaptationScore": null,
  "helpRequests": [], "interventions": [], "observedErrors": [],
  "voluntaryContinue": null, "continuedSeconds": null,
  "consentedQuotes": [], "privateEvidenceReferences": [], "protocolDeviations": []
}
```

Event notes use columns: participant code; elapsed wall time; game/build/profile/device; action; expected consequence as expressed; actual visible consequence; read-only engine evidence reference; assistance; observed difficulty; interpretation. Keep the participant's action/words separate from the researcher's inference.

## Findings, fixes and retesting

For each observed failure, record reproducible starting conditions, affected essential task, severity, evidence, proposed fix and owner. Preserve failed-session notes. Fix blocked actions, misleading economics, wrong scope, inaccessible controls and unexplained waiting before declaring the candidate usable. A verbal workaround is not a product fix.

Freeze a new candidate after changes and repeat affected tasks on the affected device/input/profile, preferably with the same participant for regression and an unexposed participant for discoverability. Label repeated participants as experienced; do not pool their new scores with first-use results. Rerun technical checks whose inputs changed. Report resolved and unresolved findings, participant counts, assigned/actual orders, all individual timing/scoring observations and aggregates with denominators. No participants means **pilot pending**, even if the protocol and automation pass.

The final handoff must separately state: engineering criteria remaining; browser/build/publication evidence; actual human sessions and results (or their absence); and broader source/research obligations. Pilot participation and applicable publication review may be external dependencies. Missing gameplay, absent changed constraints and usability defects remain engineering work.
