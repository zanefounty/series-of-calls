# Repository skill and development agents

Updated 13 November 2026. These are local, interactive development definitions. They do not start a job, install credentials, change session permissions or enable the disabled GitHub adaptation workflow. Earlier validation results below retain their original dates and scope.

The repository now includes [project configuration](../.codex/config.toml) for three spawned threads plus the coordinator and the communications/SP/browser/documentation MCP connections. Read [Codex setup](CODEX_SETUP.md) and the [restart handoff](RESTART_HANDOFF.md) before relaunching. Current standalone agent schemas were rechecked against official documentation; the explicit cheaper-model choices remain unchanged. The CLI's global MCP management listing does not prove runtime project discovery.

## Load the workflow

Launch Codex or Claude Code **from the Series of Calls directory**. The canonical [development skill](../.agents/skills/series-of-calls-development/SKILL.md) lives under `.agents/skills/`; Claude has a small [discovery wrapper](../.claude/skills/series-of-calls-development/SKILL.md) which reads it. Both use shared [role briefs](agents/) and the [development checklist](DEVELOPMENT_WORKFLOW.md).

In Codex, invoke `$series-of-calls-development`, `$soc-game-design` or `$soc-playtest`. Use `/skills` to inspect local discovery. In Claude Code, invoke `/series-of-calls-development`; its canonical router can read the new guidance, but this change adds no new native Claude role definitions. A managed client may restrict local customization. No global user configuration was changed.

Current OpenAI documentation specifies standalone project agent TOML files with `name`, `description` and `developer_instructions`; they inherit the parent session's permissions. It also documents repository skills under `.agents/skills`. See [Codex custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents) and [Codex skills](https://learn.chatgpt.com/docs/build-skills), rechecked 13 November 2026. These files target that format rather than the older role-to-`config_file` layout.

Claude definitions use project `.claude/agents/*.md` with YAML frontmatter. The research roles have read/search tools; the verifier can execute checks; the builder can edit. Their `skills` field loads the Claude wrapper. See [Claude subagents](https://code.claude.com/docs/en/sub-agents) and [Claude skills](https://code.claude.com/docs/en/skills), checked 4 November 2026. Tool lists reduce available tools but do not grant permission to use a service.

## Roles and cost choices

| Task | Codex definition | Claude definition | Shared contract |
| --- | --- | --- | --- |
| Bounded implementation | [soc_builder](../.codex/agents/soc_builder.toml) | [soc-builder](../.claude/agents/soc-builder.md) | [Builder](agents/builder.md) |
| Independent verification | [soc_verifier](../.codex/agents/soc_verifier.toml) | [soc-verifier](../.claude/agents/soc-verifier.md) | [Verifier](agents/verifier.md) |
| Archive/spec research | [soc_research](../.codex/agents/soc_research.toml) | [soc-research](../.claude/agents/soc-research.md) | [Research](agents/research.md) |
| Upstream accounting | [soc_upstream](../.codex/agents/soc_upstream.toml) | [soc-upstream](../.claude/agents/soc-upstream.md) | [Upstream](agents/upstream.md) |
| Gameplay decisions, balance and story | [soc_game_designer](../.codex/agents/soc_game_designer.toml) | Shared guidance via canonical skill | [Game designer](agents/game-designer.md) |
| Independent playability investigation | [soc_playtester](../.codex/agents/soc_playtester.toml) | Shared guidance via canonical skill | [Playtester](agents/playtester.md) |

The requested cheaper-model preference is explicit: Codex's bounded builder/research/upstream roles use `gpt-6-luna` with high reasoning; Claude research/upstream use `haiku`, and its builder uses `sonnet`. Both verifiers inherit the parent model. The new Codex designer and playtester also inherit the parent; they do not silently select a premium model. Model access is account-dependent and these choices are not a dollar cap. If a selected model is unavailable, select an available model explicitly; do not silently switch to a more expensive one. Keep difficult cross-module integration and semantic sign-off with the coordinator.

Codex's read-only roles are instructions, not separate sandboxes; the current format inherits the parent's permissions. Claude research/upstream omit shell and edit tools; the coordinator runs pinned Git inventories and supplies the results when needed. The verifier's shell can write generated reports, so file ownership and session permissions still matter.

The hosted adaptation job is a separate system. Its dedicated API credentials, provider-enforced US$25 monthly project limit, bot identity and protections remain unconfigured/unverified. Local agent definitions neither satisfy those prerequisites nor enforce that budget. Leave `maintenance/agent.json` and the workflow disabled until their existing requirements are met.

## Delegate a complete contract

Use at most three parallel specialists plus the coordinator for this project's usual four-slot workspace; adapt to the actual available slots. Parallelize independent research/verification or disjoint modules. Do not have multiple agents edit the shared dispatcher, acceptance plan, source registers, generated files or evidence receipts concurrently. The coordinator integrates those files and reruns the relevant checks.

Each assignment supplies:

- Source/requirement or archive-candidate IDs, scope and observable success/failure.
- Owned files, read-only inputs, shared interface contract and dependencies.
- Required tests and artifact destination; what remains outside this slice.
- A clear return contract: changes, commands/results, evidence and unresolved work.

Agents return unproven assumptions before implementing across another agent's interface. A researcher can prepare a brief while a builder finishes an already accepted slice; research findings do not silently change that slice. Resume after a power outage or context reset by reading the current files and receipts, not by replaying old commands blindly.

## Example requests

For a gameplay improvement that should proceed through implementation:

```text
Use $soc-game-design and the existing development workflow. Have
soc_game_designer inspect the current first-customer loop and define one
consequential choice with less repetitive setup. Implement the selected
bounded slice with soc_builder. Have soc_playtester compare alternatives
and the visible journey, and soc_verifier check correctness and replay.
Keep the source obligations and existing gates; report actual evidence.
```

For role and story design without application changes:

```text
Use $soc-game-design with soc_game_designer. Design customer IT and MSP
play around one shared regional contract. Show different objectives,
authority, cash and capacity ownership, acceptance, failure and recovery,
and a later customer opportunity caused by the result. Inspect current
mechanics first and return a bounded proposal. Do not edit the game.
```

For independent playability review:

```text
Use $soc-playtest with soc_playtester. Compare the current opening routes
from matching inputs and a declared outcome window. Inspect the full UI
through visible controls. Keep clicks, decisions, commands and actual
human evidence separate. Return reproducible findings and the next fix.
```

For Codex:

```text
Use $series-of-calls-development. Have soc_research inspect ARCH-UC-072
and its cited follow-ups, compare existing service-observation tests, and
return a proposed fictional scenario contract. Do not promote it yet.
Continue the original backlog independently while that research runs.
```

For implementation after a concrete contract has been selected:

```text
Use the Series of Calls development skill. Assign soc_builder (Claude:
soc-builder) the agreed behaviour and its own module/test files. Keep
dispatcher, acceptance registration and evidence integration with the
coordinator. After integration, have soc_verifier (Claude: soc-verifier)
independently exercise success, meaningful failure, recovery and replay.
Continue through fixes and verification; report remaining source gaps.
```

For broader audit:

```text
Use the development skill and soc_upstream (Claude: soc-upstream) to
compare the supplied pinned upstream inventories with the adoption
register. Return unresolved changes and proposed dispositions with
evidence. Do not approve exclusions or change deadlines.
```

For research intake, use [the 75-candidate crosswalk](RESEARCH_GAMEPLAY_INTAKE.md). Prioritize closing the original full-plan/source backlog; archive scenarios become implementation work after the baseline is complete or the user explicitly reprioritizes them.

## Check the setup

Parse every project agent TOML file and Claude frontmatter; verify their role briefs and skill paths exist. The skill-creator validator checks `SKILL.md` frontmatter, and bounded independent tasks check whether the instructions produce useful design and evidence. Neither proves native-client discovery or paid model availability. Check discovery in the actual local client; do not launch a paid run just to test syntax. See [the dated research and evaluation cases](GAME_DESIGN_RESEARCH.md) for this extension's scope.

Inherited `.claude/skills/` remain useful for optional SP editing, labels and tests. Their historical release/domain instructions do not supersede `AGENTS.md`, the current specification, publication gates or the user's current instruction. Do not execute an inherited release recipe without checking the current workflow and release eligibility.

### Gameplay skill validation on 13 November 2026

Validation used a genuine checkout of `d7de3b91d29741640b7aec74acc134f866899f62` with this instruction/documentation change. Application, content, package-lock, protected workflow and historical evidence inputs were not edited. Node was `v24.22.1`; the installed Codex binary reported `0.167.0-alpha.4`.

The Skill Creator validator passed both new skills and the updated development skill. All six project agent TOML files parsed with the required standalone fields. Skill UI metadata, explicit invocation names, referenced code paths and local Markdown targets were checked. `git diff --check` passed. The experiment reference's JavaScript example executed through the real dispatcher: a paid plan, one-minute advance, two independent restored states and stale-quote rejection passed.

Two fresh agent tasks used the skills without the earlier audit diagnosis. The design task inspected current customer acceptance, provider resources and existing Rina reactions, then proposed one customer/MSP contract with separate authority and a retained consequence. It marked the selectable customer opening as a proposal beyond the present MSP start. It made no application edits and claimed no executed gameplay evidence.

The playtest task inspected the existing pilot and executed six deterministic branches through minute 180: standard Swift/Steady, peak-window Swift/Steady and funded-estate keep-cash/headroom alternatives. Inputs were SMB, Sydney, normal, seed 1; incident repair was performed when feasible, with no BPO, expansion or renewal. Recorded inputs did not drift and all six final saves restored identically. The estate alternatives had the same completed/on-time/failed work, while buying headroom left A$344 less cash and A$6 of minimum supplier exposure still open. The result was scoped to that workload and policy, not generalized to all strategies. No human participants or fresh browser observations were claimed. A focused UI test attempt was blocked by the absent local `jsdom` dependency; that failure was retained outside the repository.

A separate six-request routing assessment kept typo, dependency and historical-summary work out of specialist gameplay review. It identified ambiguity around critiques of existing choices and historical reports; the descriptions were clarified. This was an agent routing assessment, not a benchmark of native automatic invocation or proof of improved enjoyment.

Native client discovery was attempted without a model turn. Strict startup rejected the existing global `features.experimental_use_rmcp_client` field; ordinary startup then failed to open the environment's Codex state database. Global configuration and permissions were left unchanged. Native discovery and account/model availability therefore remain unverified in this environment. The local preflight also reported DNS lookup failures and missing locked browser dependencies, although the proxied Git clone succeeded. These limits do not turn syntax checks into runtime discovery. No full gameplay suite, browser acceptance or release acceptance was run for this skills change.

### Local validation on 4 November 2026

All four Codex TOML definitions and four Claude frontmatter definitions parsed successfully; both the canonical skill and Claude wrapper passed the skill-creator validator. The 75 intake IDs exactly matched the source catalogue without duplicates. Local Markdown link targets were checked. Native-client discovery and model-account access were not exercised by a paid run.

An independent agent used the skill in an offline, read-only ARCH-UC-072 exercise. It inspected current mechanisms, proposed success/failure/recovery and alternative configurations, and kept completion unclaimed because the distinctive scenario and live-source review were missing. Its feedback led to explicit guidance about example prompts, offline scope and sources with no original joke. This was a workflow dry run, not implementation or formal acceptance of ARCH-UC-072.

Source, coverage, catalogue, mapping, upstream-accounting and freshness gates passed. The build passed. The normal translation check could not load the missing local `jsdom`; rerunning with the disclosed external jsdom 30.0.1 dependency tree passed all 5,482 labels and five dictionaries. That rerun does not establish the locked jsdom 24.1.3 baseline. Both communications MCP handler tests passed, as did the separate simulated offline-cache test; the documented commands/export/import were exercised in process. A legacy MCP suite attempt was stopped after 60 seconds without output and is not recorded as a pass. No full gameplay suite, real-browser or release acceptance is claimed for this documentation-only change. Existing gameplay receipt inputs remained unchanged.
