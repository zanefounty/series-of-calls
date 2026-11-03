# Hosted protection and observation validation receipts

Observed against public `zanefounty/series-of-calls` on 4 November 2026. These receipts cover remote controls and disposable tests; they do not establish product or release readiness.

## Active rulesets on `main`

The repository is public and independent (`isFork=false`); default branch `main` was `3c977ad654bc2621bae6bbfa422907976a944b36` throughout this check. Live API reads of rulesets `26489083` and `26489086` returned:

- **Main required checks; no bypass** (`26489083`): `active`, applies to `refs/heads/main`, strict required status checks enabled, contexts `test`, `translations`, `accountability`, each tied to GitHub Actions integration `15368`; `bypass_actors=[]`, `current_user_can_bypass=never`.
- **Main owner review** (`26489086`): `active`, applies to `refs/heads/main`, one approving review, CODEOWNERS review and thread resolution required, extra approval for unattributed changes. User `6007194` is the bypass actor with `pull_request` mode; the API reports `current_user_can_bypass=pull_requests_only`.

The classic branch-protection endpoint returned HTTP 404 (“Branch not protected”). The active rulesets above are the observed controls. Their live pages are [required checks](https://github.com/zanefounty/series-of-calls/rules/26489083) and [owner review](https://github.com/zanefounty/series-of-calls/rules/26489086).

## Ready owner PR with a deliberately failing required check

Created the one-line test commit `f070153548fa448113a52aad59d941bb7a2dfe13` on `verification/required-check-failure`, changing only German translation `action_helpers.light_fiber_pair_n_price` to omit required `{n}`. The locked local check `node scripts/i18n-check.js de` failed with exactly one broken entry, that key. The PR title and body said “PROTECTION TEST — DO NOT MERGE”. It was authored by `zanefounty` (User `6007194`), so it exercised the configured owner identity. No merge or auto-merge was attempted.

PR [#2](https://github.com/zanefounty/series-of-calls/pull/2) was reopened and marked ready for review. At the captured live read, GitHub returned `isDraft=false`, `autoMergeRequest=null`, `mergeStateStatus=BLOCKED`, and `reviewDecision=REVIEW_REQUIRED`. The first hosted run (`41727342018`) reported:

| Check | Result | Evidence |
| --- | --- | --- |
| `translations` | failure | The broken German placeholder, matching the local checker. |
| `test 2/4` | failure | `tests/gameplay-rules.test.js` C3 runs translation validation and rejected the same fixture. |
| `test 3/4` | failure | `tests/i18n.test.js` rejected the same missing placeholder. |
| `build`, `test 1/4`, `test 4/4`, `bench` | success | Hosted check rollup for run `41727342018` and performance run `41727342076`. |
| `accountability` | cancelled | Run `41727341911` ended cancelled after 10m18s; it did not pass. |

The ready PR triggered another CI run (`41729242689`); its build passed and its `translations` job again completed with failure while the observed merge state remained `BLOCKED`. The job output is available at [the failed translation run](https://github.com/zanefounty/series-of-calls/actions/runs/41727342018/job/126235482417). This is direct hosted evidence that failed required statuses leave a ready owner PR blocked. The broad `test` aggregate also failed because the same malformed translation is checked in its shards; the evidence does not claim that other required contexts passed.

After capturing the result, PR #2 was closed without merging and the disposable remote branch was deleted. `mergedAt` was null. `main` remained at `3c977ad654bc2621bae6bbfa422907976a944b36`. Existing governance PR #1 remained open and draft at `governance/publication-checks`; it was not edited.

## Earlier observation validator failure and fix proposal (historical)

Authorized observation runs `41728252702` (upstream) and `41728262745` (references) completed before creating any bot PR. Both trusted persistence jobs rejected the same filename pattern: observer timestamps preserve ISO UTC offsets as `+00-00`, but `scripts/accept-observation.py` allowed only `[A-Za-z0-9_.:-]`. Exact errors were:

```text
Unsupported observation path: history/2026-11-03T21-30-48.263614+00-00-b2366ed26018f957309292d04adf5d6e76a89c65.json
Unsupported observation path: reference-history/2026-11-03T22-09-31.352429+00-00.json
```

The actual upstream history artifact was downloaded from artifact `13275198803` and SHA-256 checked as `4a211ac6a74d0c915d2a73ae82d6520489c88038653b6d18b97b8ca6aba455ff`. The references history from artifact `13275757747` hashes to `2cc3cc633ae81b560c9071c596327a895e2703998d9f168fb9e961f822e882c4`. In a disposable worktree only, the allow-list was extended to admit `+`; both actual artifacts then passed the validator read-only (seven upstream files, two reference files). No artifact was persisted to the repository.

The patch at [observation-validator-fix.patch](observation-validator-fix.patch) changes only those two allow-lists and adds focused tests for timestamped UTC filenames and symlink traversal rejection. Its SHA-256 is `0cf7b7a29056afeecaf747b4a8714b5a2d47f056fd4effba3c0c8e47e9a5d265`. `python3 tests/observations_test.py -v` passed all eight tests in the disposable worktree, and `git apply --check` passed against a clean detached checkout at `origin/main`. The patch remains a proposal for separate integration and governance review; no source, workflow, ruleset or remote repository content was changed by this audit.

The two hosted observation workflows produced no bot-authored PR because they failed before the PR creation step. **Bot-authored PR review enforcement remains unproven.** The proposed validator change has not been pushed, and the observation workflows should be rerun after its separate review and integration.

## Completed bot review check

After the owner-reviewed validator correction, both observation workflows succeeded and created real GitHub Actions bot PRs. Reference PR #4 subsequently passed all 11 hosted checks while remaining non-draft, `BLOCKED`, and `REVIEW_REQUIRED`; auto-merge is disabled. [The captured state](../github/bot-pr-4-all-checks-review-required.json) supplements the earlier failed observer attempts. Combined with the deliberately failing non-draft owner PR and the active ruleset receipts, this supports the branchProtection readiness flag. The owner subsequently approved both observation-only records after checks. All 11 checks passed on each current head, an owner review was recorded, and PR #3 merged at `bf783f99edaed87c0fef24ca63b235f5af865429`, PR #4 at `1678a6d8a3e73afe77801406958373c79de5982a`. This accepts the observation records only; canonical research acceptance remains zero. See [owner scope](owner-observation-decision.json) and [final PR #4 checks](../github/bot-pr-4-pre-merge.json).
