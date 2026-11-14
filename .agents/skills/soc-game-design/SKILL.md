---
name: soc-game-design
description: Design, critique or rebalance Series of Calls decisions, economy, progression, UC/CC careers and state-driven stories. Use for gameplay proposals, existing-choice audits or repetitive setup. Excludes typo fixes, dependency updates and real services.
---

# Series of Calls game design

Work from the repository root. Follow `AGENTS.md` and the existing development workflow. Inspect the current playable path and relevant specification before proposing changes. Treat past reviews as leads to reproduce, not current findings. Keep this skill subordinate to the user's scope and the versioned specification.

## Choose the relevant reference

| Task | Read |
| --- | --- |
| Plans, balance, objectives, progression or simulation logic | [Decisions and economy](references/decisions-and-economy.md) |
| Too much setup, poor feedback, interruptions or hard-to-find actions | [Flow and attention](references/flow-and-attention.md) |
| Customer/MSP/SI/provider tracks, collaboration, CC or story | [Roles and consequences](references/roles-and-consequences.md) |
| Current methods, external skills or provenance | [Dated research](../../../docs/GAME_DESIGN_RESEARCH.md) |

Load only what the task needs. Use `$soc-playtest` for independent experiments or an observed usability review. Use the existing development skill for implementation, source intake and release work.

## Start with the player's problem

Name the person playing, what they want to achieve, what they can currently see and where play breaks down. Separate a source-inspection finding from an executed result. Locate the public command, simulation consequence and complete visible journey. Compare the relevant upstream interaction pattern when the user requests parity; preserve the reason that pattern works rather than its telecom nouns.

State one experience hypothesis. For example: making a migration window a visible commitment should let the player anticipate service risk. Identify evidence that would disprove it. Adding a menu, product, achievement or animation is not itself an experience hypothesis.

## Specify the decision

Use a short table or paragraph, not a mandatory new design document:

- **Situation:** actor, current goal, visible pressure, information and time available.
- **Choices:** feasible alternatives and when each could be sensible; include waiting or declining when meaningful.
- **Commitment:** money, capacity, staff time, authority, delay, uncertainty and what the player gives up.
- **Feedback:** what can be predicted, what becomes effective, how delivered work is observed and why failure occurs.
- **Consequence:** the outcome, recovery and next opportunity that changes because of the choice.

Separate a strategic decision from routine execution. Simplify repeated administration when it adds no further judgment. Preserve the consequential commitment, actual cost and failure exposure underneath any bundle or automation.

## Challenge the design before expanding it

Compare alternatives from equivalent legitimate states over the promised outcome window. Find a context where each intended strategy's advantage matters. Check the objective itself, including timing, customer scope, effective delivery and unresolved obligations. Use state-based story consequences and different role incentives where relevant. Do not claim balance or enjoyment from test counts, different labels or an agent's preference.

Select the smallest complete slice that can change play. Prefer finishing one understandable decision and its consequence to opening several unfinished tracks. Continue authorized implementation through the existing builder/coordinator workflow; a review-only request remains read-only. Do not create a new approval gate for ordinary design work.

## Hand off something buildable

Return the current problem and evidence, the proposed decision, its falsifiable test and the bounded implementation contract. Include affected source/requirement IDs or explicitly proposed mappings, owned files, command/state changes, visible controls, alternative/failure/recovery cases and save/worker implications. Reuse the existing specification and acceptance process. Do not promote new research or fictional role assumptions into accepted requirements silently.

Keep reported claims separate: implemented, simulated, browser-observed, expert judgment and human-tested. Cite primary sources for imported methods or product facts; describe the UC adaptation as a design proposal. Preserve synthetic operation, validated dispatch, pure rendering and the existing release/governance requirements.
