---
name: series-of-calls-development
description: Build, test, document and extend the Series of Calls synthetic communications simulator, including source mapping, archive issue intake and upstream adoption. Use for work in this repository; not for configuring real communications services or declaring a release from test counts alone.
---

# Series of Calls development

Work from the Series of Calls repository root. Read `AGENTS.md`, `spec/README.md` and the parts of `docs/ARCHITECTURE.md` relevant to the task. Treat `STATUS.md`, `maintenance/next-work.json` and evidence receipts as dated records; inspect the current implementation before accepting their claims. Follow the user's existing scope and authorization without repeatedly asking to continue.

Choose the smallest complete, reviewable behaviour slice that advances the requested scope. When asked to finish a backlog, keep working through actionable items and distinguish external blockers from implementation work. An intermediate milestone is not the full conversion.

Examples in the workflow guide are invocation examples, not additional assignments. A bounded read-only or offline task stays within that scope; record the missing live-source check without promoting an unverified claim. Preserve a source joke where one exists; do not invent one and present it as an original comparison.

## Select the workflow

- **Build or repair:** establish source IDs, existing behaviour and a failing outcome; implement through the shared SOC command boundary; exercise a valid solution, a meaningful failure and recovery. Use `docs/agents/builder.md`.
- **Test or audit:** verify observable state transitions, evidence inputs and real test results independently. Use `docs/agents/verifier.md`. Never edit a receipt to manufacture a pass.
- **Research or mapping:** use `docs/RESEARCH_GAMEPLAY_INTAKE.md` and `docs/agents/research.md`. Historical mailing-list claims remain historical; a catalogue proposal is not an accepted requirement.
- **Upstream maintenance:** use `docs/agents/upstream.md`. Keep complete pinned inventories and pending adoption work. Observe changes before adapting them.
- **Documentation or publishing preparation:** use `docs/README.md` and `docs/PUBLISHING_AUDIT.md`. Check commands and local links against files; retain inherited ADR context and add dated applicability notes.

Load [session lessons](references/session-lessons.md) when changing state, evidence, progression, portfolio or research promotion. It records the non-obvious failures and decisions from the implementation session.

## Integrate work

Keep desired configuration, provisioning, effective state and observed service distinct. Calculation and rendering must be repeatable; only explicit commands/time advancement change state or bill. Preserve typed resource units, deterministic clocks/IDs, worker serialization, stale-result rejection and save validation. All UI, automation and MCP routes use the same validator/dispatcher.

Retain source IDs and unchanged source-pack bytes. Link each substantive implementation to its requirement, fictional representation, implementation and acceptance evidence. Shared mechanics do not prove every product's distinctive behaviour. Preserve the original joke's comparison and role when adapting it to fictional communications; consult the narrative mapping and test its visible placement.

Run relevant checks from `docs/DEVELOPMENT_WORKFLOW.md`. Report exact commands, dependency versions, results and limitations. Regenerate evidence by executing its recorder when tested inputs change; do not relabel old outputs as current. Keep false completion, missing evidence and invalid-reference negative tests effective. A failing release gate is outstanding work, not permission to weaken it.

For authorized parallel work, assign disjoint files and explicit contracts using the roles in `docs/AGENT_WORKFLOW.md`. The coordinator owns shared dispatch integration, registries and final evidence. Use cheaper agents for bounded research and implementation; split difficult work into smaller contracts or return it for review when capability is insufficient. Agent files do not grant permissions, start scheduled jobs or enforce a spending cap.

Finish with changed behaviour/documents, actual verification and remaining work. Preserve owner decisions for exclusions and governance. Never enable the unattended adaptation workflow, publish, or claim legal/provider approval merely because a local skill or agent exists.
