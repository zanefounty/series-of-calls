# Flow, attention and interaction cost

Inspect the player's route from a visible problem to a useful consequence. The aim is an understandable strategy game; raw click reduction is only one possible intervention. See [the research register](../../../../docs/GAME_DESIGN_RESEARCH.md) for the developer examples and foundations.

## Audit the whole journey

Record the sequence: notice the problem, understand the options, commit, observe execution, interpret the result, choose what follows. At each transition ask what the player sees, what they must remember, what can fail and how they recover.

Count separately:

- Decisions that change a promise, resource allocation, policy or future opportunity.
- Physical clicks, taps or keyboard activations required to execute those decisions.
- Navigation, scrolling, modal transitions, repeated entry and confirmations.
- Compulsory waits, interruptions and repeated execution of an already chosen policy.

Domain commands are not clicks. Automated elapsed time is not a novice's reading time. If a target such as first useful consequence within 90 seconds is proposed, label it a hypothesis and measure it with the intended players. There is no universal scientific maximum number of buttons or acceptable clicks.

## Improve the opening through a visible problem

Show a customer, their current work and a near-term promise. Let a small complete action change something observable. Introduce the next mechanic when the player encounters the problem it solves. Keep alternative starting modes comparable under declared workload, seed, costs and observation period.

For each early mechanic, check whether a new player can explain the goal, predict the next action and recognize its result. Use the existing opening pilot rather than adding a second onboarding questionnaire. Do not require business model, region, sector, every integration and every policy to be selected before the player has seen the relevant problem.

## Make the decision readable

Keep the actual alternatives, their complete commitments and the confirm action in a usable decision view. Provide an accessible label, stable focus and an explanation for a blocked action. Use a consistent action vocabulary. Avoid introducing new jargon merely to name an existing command.

Audit the assembled screen, including appended catalogues, scale offers, comparison groups and overlays. Check desktop and mobile, keyboard-only navigation, zoom, focus restoration, overlapping drawers, scrolling and motion. Do not rely on color or animation alone to explain service status. An isolated component screenshot cannot establish that the full interface is uncluttered or operable.

Place the relevant customer's outcome beside the action that caused it. Keep the map or service flow useful: show work reaching a destination, a bottleneck, a changed route or an affected site. A pulsing line that has no relationship to actual state supplies decoration rather than feedback.

## Control attention and time

For an opportunity, record when it appears, how the player can discover it, its actual deadline and what pauses the clock. Test supported speeds. Measure wall-clock availability when making usability claims; simulation ticks alone do not establish usable reading time.

Choose pause, grace period, queueing or policy automation according to the intended tension. A first encounter may need time to learn; later repetition may be handled by a player-owned policy. Persist deadlines as state created by explicit events. Rendering, reopening an inspector and saving must not renew them accidentally.

Rank notifications by whether the player needs to make a new decision. Separate urgent service loss from background construction and routine receipts. Show the live problem even while a previously ordered project is running. Stop interrupting for an already completed goal unless a new consequence needs attention.

## Bundle execution while retaining the choice

A complete plan can be one priced commitment while provisioning stages still consume time, staff and cash. Before bundling, define transaction behavior: all-or-nothing acceptance or explicit partial completion, stale quote refusal, idempotency, failure and cancellation. A shortcut must use the existing validated commands.

For recurring work, specify a policy with scope, triggers, budget/capacity limits, precedence, stop conditions and an exception explanation. Examples include routine case handoff, low-risk renewals or routing within an approved supplier set. Test insufficient funds, supplier failure, unavailable staff, incompatible data boundaries, conflicting policies, retry and deadlock. Make a safe fallback visible rather than silently stalling.

Do not automate the strategic commitment itself unless that is the player's chosen policy. Automation should let the next difficult decision emerge, not remove all reasons to observe the game.

## Separate responsiveness from usability

If the complaint is lag, measure input-to-feedback delay, main-thread work, simulation step cost and rendering under a declared device/workload. Preserve correctness checks while investigating performance. Report frame rate or latency only when measured. Fewer controls may help comprehension without fixing frame stalls; faster simulation may make an already short decision window worse.

Current entry points include `src/game/93-ui/75-provider-panels.js`, `src/game/93-ui/79-provider-comparisons.js`, `src/game/93-ui/79-provider-context-actions.js`, `src/game/97-provider-shell.js` and `src/game/98-provider-runtime.js`. Reuse `scripts/provider-browser.js` and the relevant specialized browser runner after inspecting their scope. Do not infer human ease from a scripted route pass.
