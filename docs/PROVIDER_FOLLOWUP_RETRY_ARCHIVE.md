# Terminal follow-up retry authorization archive

This versioned helper preserves the authority for a paid `retry-case-followup` after its settled case leaves ordinary live history. It does not supply an alternative L8 progression proof. L8 continues to require its independently retained live case and interactions.

`SOC_PROVIDER_FOLLOWUP_RETRY_ARCHIVE.create(state, projectId, pruneOrdinal, hooks)` returns a new archive without changing its input. Call it immediately before ordinary pruning, while the terminal settled job, case, two or three interactions, and channel acceptances are still retained. The ordinal must be `jobCheckpoint.pruned + 1`. Attach the result to that retained project's `followupRetryArchive`, then perform the existing single checkpoint increment and job removal. Active/unsettled work and other progression/support pins remain protected.

`validate(state, projectId, archive, hooks)` validates exact archive/project/job/case/acceptance schemas, matching live rows wherever retained, funded retry terms and timing, canonical scope, recorded failed first attempt, terminal legs and accepted units. A missing live job requires its recorded ordinal to be within `jobCheckpoint.pruned`; a missing live row while the job still exists rejects. It replays the existing follow-up helper on a private copy containing the archived service rows and the actual imported paid/configuration history. It never installs historical permission grants or effective product configurations from the archive.

`validateAll(state, hooks)` checks all present archives, unique job/ordinal assignments, and lower bounds on their contributions to the existing job checkpoint. The coordinator must still reject a pruned retry job without an archive; an absent archive is not a permissive fallback. Ordinary ledger and aggregate validation remain necessary.

The exact archive envelope is `{kind, version, archivedAt, pruneOrdinal, project, job, case, interactions, acceptances, settlement}`. The project snapshot contains its scoped job configuration, posting ID, status, accepted/due/completed times and all five authored commercial terms. The job includes its canonical `followupPlan` and original fixed deadline. The settlement is the actual customer-period row, not an invented single-case invoice.

## Required trusted hooks

- `followup`: the existing `SOC_PROVIDER_CASE_FOLLOWUP` module.
- `followupHooks(state)`: existing authoritative historical demand, paid workflow/connector, consent, boundary, retry and accepted-path callbacks. Every callback must use its supplied state; archived replay supplies a private copy.
- `settlement(state, job)`: the exact retained customer-period row when creating the archive.
- `validateSettlement(state, customerId, row, job, archivedAt)`: verify the retained row or an explicitly validated historical settlement anchor, including actual period/posting/checkpoint lineage. Returning true from shape alone is insufficient. Missing causal evidence must fail.
- `validateAcceptance(state, customerId, acceptance, interaction, attempt)`: verify actual paid permission/account history and acceptance timing. A copied `permissionGranted` field is not authority. Current grants alone cannot replace historic project/generation/configuration evidence.

The coordinator owns dispatch, project-field allowlisting, pruning integration, worker composition, retained settlement anchors and live save validation. Create archives only for jobs actually selected for ordinary pruning, not jobs protected by an earned claim. Re-run pure validation before releasing their retry-specific pins. Root clocks, cash and case counts must not change when creating or validating archives.

## Bounds and verification

An archive holds at most three terminal interactions, two exact channel acceptances, 96 trace rows per interaction and 65,536 UTF-8 bytes. No circular values, non-JSON scalars or full-root snapshots are accepted. At most 100 archives can accompany the existing 100-project collection. Those bounds do not prove that a whole portfolio fits its existing save limit; actual byte measurement and capacity/refusal behavior require public integration tests. The real three-leg Lab fixture uses approximately 33 KB, chiefly immutable interaction fingerprints; no trace is silently truncated to fit.

AC-SOC-726–734 exercise actual Lab voice, a failed accepted digital message under workforce congestion, and a subsequent human digital retry. Provider projects, canonical workload and historical settlement/acceptance hooks are explicitly isolated fixtures. They test live purity, pending refusal, recorded pruning, no archive-only L8 evidence, schema/size bounds, paid terms, coordinated scope edits, failed-leg and usage checks, missing history, checkpoint accounting, source serialization and lawful later retirement.

Executed development command: `rtk node --test --test-isolation=none tests/provider-followup-retry-archive.test.js tests/provider-case-followup.test.js` — 17 tests passed, no skips, in `/tmp/soc-followup-retry-archive-r5.log`. Earlier fixture/schema failures remain in r1–r3 logs. This is not public Provider retry-retention, worker-dispatch, long-play or acceptance-closure evidence. The coordinator's real paid retry state is a separate fixture for the forthcoming integration proof.

Actual public dispatch verification (2026-11-06): AC-SOC-735 and AC-SOC-736 passed together in 110.7 seconds. A paid peak-window retry delivered both human legs, retained channel acceptance while the case was live, archived before ordinary job pruning at minute 180, and restored with equal worker continuation. Orphan proof, altered authorization, outcome, ordinal and settlement counterexamples were rejected. This bounded run does not establish long-play performance or the final browser matrix. External receipt: `/tmp/soc-followup-public-retry-archive-r1.log`.
