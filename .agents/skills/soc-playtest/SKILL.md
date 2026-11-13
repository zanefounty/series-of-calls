---
name: soc-playtest
description: Audit Series of Calls playability using paired experiments, visible-control journeys and actual human-pilot evidence. Use for strategy/opening comparisons, upstream flow or gameplay verification. Excludes historical summaries, syntax checks and unrelated fixes.
---

# Series of Calls playtesting

Work from the repository root and follow `AGENTS.md`. Review independently. Inspect current code and raw artifacts before accepting a handoff. Do not modify application code during an independent review; write probes and outputs only to the assigned location. Continue within the user's authorized scope without a new approval ceremony.

## Choose the evidence needed

| Question | Procedure |
| --- | --- |
| Does the choice change service, money or future obligations? | [Paired experiments](references/experiments.md) |
| Can a player find, understand and execute it? | [Visible play and human evidence](references/visible-play.md) |
| Which design methods or online skills support the process? | [Dated research](../../../docs/GAME_DESIGN_RESEARCH.md) |

Do not require every procedure for every task. For a broad playability review, combine simulation and visible UI evidence, then identify what still needs actual participants. If execution is blocked, retain the failure and complete useful source analysis with its limits clearly stated.

## Establish the experiment

Record the review date, candidate commit and working-tree changes, upstream pin when compared, scenario, seed, market, opening, difficulty, clock, speed, workload and browser/device as applicable. State the hypothesis, competing explanation, intervention and stopping rule before examining results.

Use a legitimate checkpoint for focused investigation and a separate journey through real controls for reachability. Keep engine probes, DOM tests, browser observations, expert judgments and human observations labelled. A screenshot cannot prove a working mechanic; a successful command cannot prove a discoverable control.

## Seek disconfirming evidence

Compare feasible alternatives under the same promised workload and horizon. Test a condition where the claimed advantage should matter. Include inaction or a plausible failure and recovery where relevant. Challenge early victory, moving deadlines, hidden obligations, global totals satisfying local promises and rewards unrelated to delivered work.

Inspect the full composed UI, not just the changed component. Count consequential decisions separately from user activations and domain commands. Check the actual opportunity window and pause behavior. Recheck relevant save/replay and worker behavior when state changes are involved. Choose checks from `docs/DEVELOPMENT_WORKFLOW.md`; do not rerun the entire suite merely to appear thorough.

## Return evidence that changes the next build

For each finding, give severity, exact state/steps, expected player promise, observed result, file/symbol evidence, likely consequence and the smallest useful next experiment or fix. Report what passed, what failed, what was blocked and what was not attempted. Preserve inconvenient and interrupted runs.

A balance conclusion is scoped to the tested cases. A human insight names the actual observed participants and assistance. If there were no participants, say so. Never create a numerical fun score, declare retention improvements from tiny samples or convert an agent persona into a human tester.

Return proposed implementation work to the coordinator or `soc_builder`; use `soc_verifier` for independent correctness and acceptance checks. A playability finding does not authorize a release, a source disposition or a rewritten historical receipt.
