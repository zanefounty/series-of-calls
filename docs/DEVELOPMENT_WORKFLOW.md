# Building and verifying the next slice

Updated 4 November 2026. Run commands from the repository root. On the author's RTK-managed environment, prefix shell commands with `rtk` (use `rtk proxy` for commands whose unfiltered output matters). The portable commands below also work outside that environment.

## Establish what is unfinished

Read [the specification](../spec/README.md), [STATUS](../STATUS.md), [the stage backlog](../maintenance/next-work.json) and the relevant source audit. Inspect runtime code and tests before treating any old status as current. The 3,454 original mapping records and 4,787 registered source items are accounting inventories, not completion counts. The 75 archive proposals are a separate research queue.

Write a bounded contract before delegating: source/requirement IDs, fictional product or operator, current trigger and wrong outcome, desired/provisioning/effective/observed transitions, resource units, permissions, failure/recovery, inspector evidence, affected saves/worker state and acceptance cases. Explain what distinctive source behaviour this adds. Keep uncertain research claims visible.

For assessed gameplay, specify a successful reference solution, another valid configuration where alternatives are allowed, a meaningful failing configuration and a repair. A scripted reference solution must not become the only answer the assessor accepts.

## Implement through the real path

Use [the architecture](ARCHITECTURE.md) to find the owning factory and the shared dispatcher. Add the administration controls and inspector explanation alongside the simulation change. Validate imported state as well as new commands; reject cross-tenant and incompatible references. Preserve historical receipts without allowing fabricated history. Make worker and synchronous results equivalent and reject stale async results.

Use the existing translation mechanism for visible strings. Adapt humour using the source-linked narrative records; avoid merely replacing a brand name while losing the comparison's meaning. Keep source archives unchanged and update authored specifications and generated appendices through their existing generators.

## Verification ladder

Use Node 24 or later and the exact dependencies in `package-lock.json` for release evidence. `npm ci` establishes that baseline when network access permits. Do not substitute another project's dependency tree and report it as the locked baseline.

| Change | Execute and inspect |
| --- | --- |
| One mechanic | `node --test --test-isolation=none tests/<actual-suite>.test.js`; include positive, negative and recovery outcomes |
| Shared integration/state | Relevant integration, save/replay, malformed-save and worker-equivalence suites; then `npm run test:communications` |
| Sources/spec/catalogue | `npm run check:source`, `npm run check:coverage`, `npm run check:catalogue`, `npm run check:mapping`; use `npm run spec:generate` only after editing the authored inputs |
| Registered acceptance inputs | `npm run evidence` then `npm run check:evidence`; inspect per-case execution and input hashes |
| Enforcement or evidence machinery | `npm run test:gates`; prove deliberate omissions/false completion still fail |
| Visible controls/content/build | Relevant UI tests, `npm run i18n:check`, `npm run build`, then real-browser checks |
| Documentation/agent files only | Validate links, native configuration syntax and examples; do not rewrite historical gameplay receipts |
| Integration milestone | `python3 scripts/verify-foundation.py`; it records selected checks, not full-plan acceptance |
| Release candidate | Full `npm test`, `npm run check:all`, `npm run check:release`, browser acceptance and [publishing checks](PUBLISHING_AUDIT.md) on the intended release inputs |

`check:all` and the release check are different: development accounting can pass while release readiness fails. Evidence commands can rerun registered suites; read scripts before combining them into a costly repeated loop. Do not shorten required checks merely to produce green output.

The Accountability workflow partitions whole acceptance files across twenty producer jobs with `scripts/record-evidence.py --shard I/20`. It assembles their actual TAP and receipts with `--merge-shards DIRECTORY --shard-count 20`; missing, duplicate, failed, skipped or stale parts fail assembly. Eight separate gate jobs validate the complete receipt and independently execute every partition again using `scripts/verify.py all --acceptance-shard I/8`. The required `accountability` result needs all producers, assembly, all replays and mutation tests to succeed. A single shard is never complete acceptance. All ten-minute job limits remain unchanged. The CI and publication workflows run the complete JavaScript test inventory in sixteen shards with the existing 20-minute per-shard limit and unchanged per-runner test concurrency. Local commands without shard options and the release gate still execute the complete plan.

The latest continuation passed 1,314 JavaScript tests across all 194 files, 63 actual stdio MCP cases and eight separate Codex setup checks. The acceptance plan registers 445 cases; inspect the [current verification index](https://github.com/zanefounty/series-of-calls/blob/11e16893a9598f96f340aa07322497219bf2c019/evidence/completion-pass-2026-11-04/README.md) for final input/accounting checks and retained failures. These runs use the disclosed external dependency tree. Clean locked-dependency and real-browser acceptance remain outstanding. Use [Codex setup](CODEX_SETUP.md) and [the handoff](RESTART_HANDOFF.md) when relaunching.

## Browser and publishing handoff

Start `npm run dev` for live source assembly; use `npm run serve` for the built artifact. Inspect the actual URL printed by the server. Run `npm run test:browser` in an environment that permits browser/listening sockets. Read `scripts/browser-smoke.js` for its browser selection and coverage before interpreting a pass. A DOM test does not prove browser offline operation, mobile layout or tab locking.

Exercise desktop/mobile consoles, keyboard focus, topology and interaction inspection; save/reload/replay, two tabs competing for one slot, configuration progression and worker fallback; offline reload after a successful cache installation; and the `/series-of-calls/` deployment prefix. Record screenshots, console errors, steps, browser version and unresolved failures. Expand acceptance where the smoke script does not cover those requirements.

If sockets, DNS or package installation fail, retain the failing command and environment evidence. Continue independent code/spec work; rerun the blocked operation when the environment changes. Do not mark `maintenance/readiness.json` true based on a plan, a mock or an external-tool capability guess.

## Evidence and handoff

The coordinator owns shared registry changes. Preserve stable source IDs; link sources to requirements, fictional representations, code and executed acceptance cases. Keep partial implementation dispositions partial until every distinctive obligation has evidence or an owner-approved disposition. Never approve exclusions on the owner's behalf.

Hand off: changed behaviour; owned files; source/requirement/candidate IDs; tests and exact results; dependency overrides; remaining source gaps; and any next action blocked on external access. Preserve input hashes from the actual run. If a document change touches receipt inputs, report that receipt as historical until its producer reruns—do not recalculate its hashes around old logs.
