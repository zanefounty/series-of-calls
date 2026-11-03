# Research, upstream and release governance

## Source provenance

The two supplied files are imported unchanged from the user's Windows Downloads directory. `research/source-manifest.json` records original paths, modification timestamps, import times and SHA-256 hashes. `research/revisions/1.json` binds the manifest digest. A source revision adds a new immutable revision entry and explains changes; updating a hash alone is not a revision.

The mapping baseline is v1.37.0, commit `48e6200c532d486f79bc8376de0aecbf6169123b`. The approved implementation plan supersedes that baseline with latest upstream. The initial snapshot was `da1a4e2f3c9f7fac12c94eefb8d35bd6b1e4ae16`. The latest inspected main is `b7e5f193b424689e3dbdf6e57639b5212e04d5c2`, with 368 files and 349 intervening commits from the mapping baseline. Both inventories and all 426 historical file versions are retained. The comparison inventory records renames, replacements and deletions. The full Git clone remains pending because shell GitHub DNS access failed; the connector supplied verified text snapshots and complete paginated commit metadata, not a replacement Git history.

The separately checked v2.5.0 release tag points to `15dc5741d4b40ae1517e84834f647ac3e5d1e025`; main is a later snapshot. The latest v2.6.0 tag resolves directly to `366c9a25420e28f8708b0f329c82fae3367f46f7`, ten commits before observed main. The initial 56 release tags plus this newly observed release have pinned commit identities in `maintenance/upstream/releases.json`. A release's mutable `target_commitish` must not substitute for its resolved tag object.

`research/decisions.json` records the plan and superseded proposals: configuration training replaces a management-only interpretation; full scope replaces the compact initial catalogue as the final endpoint; fictional gameplay replaces real reference identities; latest upstream replaces the old mapping snapshot; independent repository creation replaces a GitHub fork relationship; and original ISP saves are rejected rather than silently converted.

## Research register

Every cited occurrence retains its source passage, claim, reference ID, historical evidence date, applicability uncertainty and requirement. Following a cited dependency is limited to what is necessary to understand that claim. A product website is not permission to treat its entire documentation corpus as verified research. Unavailable pages, marketing claims, version ambiguity and inferred interoperability remain explicit uncertainties.

Monthly checks record HTTP outcome, final URL, material-content fingerprint, observation time and differences from the previous observation. Historical observations are append-only. Observed change is distinct from reviewer-accepted specification change. No observer rewrites gameplay. Active jurisdiction claims require review within ninety days; pending research cannot be silently promoted by refreshing a link timestamp.

## Upstream ledger

Weekly and manual checks observe upstream main and releases at exact revisions. Store complete commit and file inventories, including deletions and previous paths. Keep last successful check, latest observed revision, classification, implemented/resolved state and outstanding adoption work separately. A partial fetch must not update the successful-check timestamp.

Dispositions are copy, adapt, already covered or explicitly excluded. Copy/adapt remain pending until implementation and evidence exist. Already covered requires the relevant implementation and acceptance evidence. Exclusion requires zanefounty's approval and rationale. No exclusion has been approved in the initial register.

Classify within seven days of detection. Adopt ordinary applicable changes within thirty days and urgent applicable fixes within seven. At release, the last successful check must be no older than fourteen days. Development may continue with pending work; overdue required work blocks release. Historical records remain through rename, replacement and deletion. There is no watchdog or waiver subsystem.

## Unattended adaptation design

A GitHub-hosted generation job has repository read access, an isolated writable working directory and only the dedicated API credential needed for Codex. Its patch is an untrusted artifact. A separate trusted writer validates paths and patch structure, creates a bot branch/PR and explicitly dispatches validation. It does not execute proposed code with a write token. Candidate validation uses read-only credentials and a distinct job.

One adaptation run is active at a time. Attempts and wall time are bounded. Record repository base, upstream revisions, runtime/CLI/model identity, changed paths, tests, final status and reported usage. An incomplete/conflicting attempt remains visible in artifacts and a draft PR when a safe patch can be published. The agent cannot approve exclusions, alter budgets/deadlines, edit enforcement or approve its own work. Governance changes require a separate owner-reviewed PR.

Execution remains disabled until a dedicated API project, credentials and an enforced US$25 monthly limit are verified. [OpenAI's spend-limit documentation](https://developers.openai.com/api/docs/guides/spend-limits) distinguishes alerts from hard limits and notes delayed enforcement can slightly exceed the configured amount. This is not an exact per-run dollar ceiling. The [Codex action documentation](https://developers.openai.com/codex/github-action) supports isolated generation and separate publication jobs. Neither credential nor budget has been configured by this implementation session.

## Branch and release policy

Protect main and required checks. Bot-authored changes require zanefounty's approval; owner-authored PRs can bypass that review requirement but cannot bypass checks. Protect governance paths separately and reject bot edits to gates, workflows, source revisions, dispositions, budgets or evidence rules. Release uses the pinned candidate's complete tests, freshness, coverage, browser evidence and source integrity before GitHub Pages deployment. A preview version cannot masquerade as a complete conversion.

Remote repository creation, branch protection, bot identity, dedicated API budget and workflow enablement need remote access and verified returned settings. Configuration files alone do not establish that these controls are active. `maintenance/readiness.json` records current unresolved deployment requirements, and the full release gate remains closed.

## Observation persistence jobs

Weekly upstream and monthly reference workflows now separate observation from PR publication. The observation job has read-only repository access. A trusted publishing job checks out the pinned workflow revision and accepts only bounded JSON artifacts at specific maintenance paths. It rejects code, symlinks, overwritten history, removed accounting, changed dispositions, automatic claim acceptance and a successful-check date advanced by failed link observations. New upstream items remain unclassified/pending. The publisher proposes a bot-authored PR and explicitly dispatches accountability validation. No workflow merges or reviews its own PR.

These paths have local positive/negative tests, but hosted execution and required owner review remain unverified because the independent repository and protections do not yet exist. The Codex adaptation path remains separately disabled.

## Adoption evidence receipts

An upstream row cannot become verified merely by naming a test file. The upstream gate validates scoped receipt inputs against current implementation/test bytes and reruns the complete referenced acceptance suite. Test results do not establish semantic equivalence: the per-change rationale and source-specific review remain necessary. The latest observation is preserved separately from adoption; pending rows keep their original detection dates and deadlines.
