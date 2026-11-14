# Visible play and human evidence

Use the existing [opening pilot](../../../../docs/PLAYABILITY_PILOT.md) for the two starting routes and [full pilot protocol](../../../../docs/GAMEPLAY_PILOT_PROTOCOL.md) for broader sessions. Follow their recruitment, consent, counterbalancing and reporting requirements. This reference helps choose a bounded question; it does not replace those protocols.

## Observe an actual route

Record the tested commit/build, URL, browser version, viewport, input method, seed, speed and save origin. Inspect the actual initial screen. Use visible controls to start, find the relevant customer or case, compare options, commit, observe delivery and continue to the next decision. Do not use DOM evaluation to click hidden controls, inject state or fast-forward a journey claimed as visible play.

Read-only state inspection may explain a result; keep it separate from what the player can see. A diagnostic fixture is useful for a deep meeting or migration state, but also verify the real transitions that reach it when claiming end-to-end reachability. Use the current locked browser tooling. Inspect the relevant runner before choosing it; a broad acceptance script may perform more work than this question needs.

Capture screenshots at decision points, control/focus state, console failures and observed outcomes. Include the assembled inspector, catalogue/scale additions, comparison area and overlays. Test keyboard operation and an appropriate narrow viewport. Check scroll/focus recovery, overlapping drawers, blocked-action explanations, color-independent status and motion where relevant.

## Keep four clocks separate

Record simulation time, actual wall-clock time, the opportunity's deadline and time spent waiting for the tool or browser. Mark pauses and their causes. A single simulation tick may have a very different practical duration at different speeds or under CPU load. Measure the usable window rather than converting an ideal tick rate into a human observation.

Use a short interaction ledger:

| Moment | Visible information | Input | Decision or execution? | Simulation/wall time | Result or obstacle |
| --- | --- | --- | --- | --- | --- |
| Problem noticed | Exact relevant text/state | Actual control | Classify | Record both | Record what changed |

Count physical activations, navigation, confirmations, waiting and consequential commitments separately. Do not infer a user's click count from a dispatcher log. Do not report an automated browser's completion time as a person's reading/choice time.

## Compare upstream fairly

Pin both versions. Compare the same design job, such as accepting a complete plan, modifying an existing service, renewing a contract or handling an exception. Record the real paths and what useful consequences they reveal. The UC version need not duplicate the upstream economy or exact click count. Explain which pattern transfers and which domain constraint changes it. Avoid comparing a polished upstream opening with a deep diagnostic UC console as though they were equivalent starts.

## Run a neutral human session when people are available

Use the applicable existing pilot and record only actual participants. Ask the player to pursue a goal without naming the intended controls. Observe before teaching. Ask them to explain their goal, predict an option's effect, describe the result and choose what to do next. Preserve incorrect answers and every assistance event. Distinguish think-aloud sessions from timed unprompted play when interpreting timing.

Use small early rounds to identify confusion and test a focused revision. They do not establish statistical retention or a universal preferred design. Counterbalance comparisons and match workloads as the existing protocol requires. Report individual outcomes, ranges, abandonment and unexpected behavior, not only a favorable average. Do not select a default opening before the actual comparison supports it.

If no humans participate, return browser/expert findings plus a prepared participant test. Agent personas can generate hypotheses, but they are not users. Never invent participant quotes, interviews, comprehension or enjoyment.

## Make the report useful to the builder

Separate four evidence types: source inspection, deterministic execution, browser interaction and human observation. Mark expert interpretation as interpretation. For each defect, show the exact route, state and mismatch between the player's expected promise and the result. Rank by the observed harm: blocked play or false reward, an unreachable/irrelevant decision, repeated confusion or unnecessary work, then polish.

Recommend one bounded change and the observation that would justify keeping it. Keep a contradictory observation visible. A passing automated journey supports reachability under its conditions; it does not establish that the game is intuitive or engaging.
