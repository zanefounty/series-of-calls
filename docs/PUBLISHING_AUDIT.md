# Publishing and attribution audit — updated 4 November 2026

> Current as of 4 November 2026: the implemented runtime passed all six compact/campaign browser matrices; full product conversion remains incomplete. Pages uses a manual, main-only workflow with an owner-reviewed environment and HTTPS. The workflow offers labeled preview and full-release modes; only the latter requires `check:release`. See the [workflow](https://github.com/zanefounty/series-of-calls/blob/main/.github/workflows/release.yml) and [current run status](https://github.com/zanefounty/series-of-calls/actions/runs/41796717064).

This audit records provenance and publication readiness, not release approval. Live repository, ruleset, reporting, environment and merge receipts are indexed in [the access-restored evidence](https://github.com/zanefounty/series-of-calls/blob/11e16893a9598f96f340aa07322497219bf2c019/evidence/access-restored-2026-11-04/README.md). The repository is public and independent (`fork: false`), with `origin` at `zanefounty/series-of-calls`, `upstream` at `fjaeckel/seriesoftubes`, and genuine upstream history attached by the hydration tool. Six original binary blobs have been recovered and separately indexed; authored active artwork remains distinct.

## Findings addressed in the 3 November pass

- Kept [`LICENSE`](../LICENSE) unchanged. Its SHA-256 at review start was `9a05d7606b8295d3833d42381da2c2ce334c9a909c36a0c7c014680f70ed499d` (1,070 bytes).
- Added [`NOTICE`](../NOTICE) and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) to separate upstream attribution from user-supplied research and cited external material. The root license is not asserted as a grant for every source record.
- Replaced the inherited contributor and conduct instructions that directed people to upstream Series of Tubes contacts, labels, versioning, and workflows.
- Added [`SECURITY.md`](../SECURITY.md), which at that 3 November checkpoint said there was no supported release or verified private reporting channel. GitHub private vulnerability reporting is now enabled; the separate private conduct route remains deferred.
- Removed upstream Signal and educational-resource links from the issue-form contact menu. Updated issue and pull-request templates for fictional training state, safe synthetic exports, source provenance, negative tests, and remaining limitations.
- Clarified that the top of [`CHANGELOG.md`](../CHANGELOG.md) is the Series of Calls preview log and the following section is preserved Series of Tubes history, not a Series of Calls release record.
- Added policy and attribution links to [`README.md`](../README.md). The README now distinguishes the public repository, preview publication and incomplete full conversion.

## Current publication and governance status

1. **Repository and history verified.** GitHub reports the public, independent `zanefounty/series-of-calls` repository (`fork: false`). Genuine upstream history is attached; `origin` and `upstream` point to the intended projects. The six original binary blobs are recovered into a provenance-indexed archive. Latest observed upstream object `b2366ed26018f957309292d04adf5d6e76a89c65` exists in the observation history but is not an ancestor of current `main`, so adoption is still open. Current receipts: [repository and protection evidence](https://github.com/zanefounty/series-of-calls/tree/11e16893a9598f96f340aa07322497219bf2c019/evidence/access-restored-2026-11-04/github) and [upstream audit](https://github.com/zanefounty/series-of-calls/blob/11e16893a9598f96f340aa07322497219bf2c019/evidence/access-restored-2026-11-04/upstream/audit.md).
2. **Locked dependencies verified.** Clean `env -u NODE_PATH npm ci` succeeded with lockfile versions `jsdom` 24.1.3 and `playwright-core` 1.56.0. This supersedes the earlier offline-cache failure; later checks still need to be tied to frozen current inputs.
3. **Governance merged and enforced.** Owner-approved PRs #1 and #5 (governance and mutation-receipt correction) and observation-only bot PRs #3/#4 were each merged after all 11 checks passed. Main requires strict `test`, `translations`, `accountability` and `security` checks with no bypass; a separate review ruleset requires owner/CODEOWNERS review and thread resolution. A ready owner-authored test PR with required translation failures remained blocked. See [protection validation](https://github.com/zanefounty/series-of-calls/blob/11e16893a9598f96f340aa07322497219bf2c019/evidence/access-restored-2026-11-04/protections/README.md) and the [merge receipts](https://github.com/zanefounty/series-of-calls/tree/11e16893a9598f96f340aa07322497219bf2c019/evidence/access-restored-2026-11-04/github).
4. **Contact route partially established.** The owner designated `zanefounty` as accountable contact and GitHub as the current route; private vulnerability reporting is enabled. A separate private conduct-reporting channel was deferred. Do not claim a separate confidential conduct route or invent response expectations.
5. **Pages preview workflow.** Publication is manually dispatched from `main` through the owner-reviewed `github-pages` environment. Check the [workflow](https://github.com/zanefounty/series-of-calls/blob/main/.github/workflows/release.yml) and [run status](https://github.com/zanefounty/series-of-calls/actions/runs/41796717064). The preview remains labeled as incomplete; the full-release gate is unchanged and required for full release.
6. **Implemented-runtime browser coverage passed; full product acceptance remains open.** The current specification has 4,839 requirements: 216 partial, 4,623 pending and zero final dispositions. All six compact/campaign matrices passed on the frozen runtime, with the WebKit crash and complete-shard retry retained. Canonical source-reference reviews remain zero. See [the current verification receipt](../evidence/verification.json); neither test volume nor publication implies full conversion.
7. **Hosted adaptation remains disabled.** The live secret inventory is empty and no provider-enforced US$25 monthly budget is verified. Do not enable the workflow until dedicated credentials, provider-enforced limit and protections are independently verified.

## Maintainer checklist before opening public intake

- Preserve the documented application/source-pack distinction and upstream licence bytes when adding new material.
- Recheck the independent destination, remotes, recovered-blob archive and links before any release; preserve the genuine history.
- Keep package metadata `private: true` unless the owner separately decides on package distribution; the GitHub repository itself is public.
- Verify the shipped artifact contains the intended `LICENSE`, `NOTICE`, and `THIRD_PARTY_NOTICES.md`, and inventory runtime/development dependencies separately.
- Retain the verified private vulnerability-reporting route. Use the owner-selected GitHub conduct route; a separate private channel was explicitly deferred.
- Recheck issue forms, safe-save guidance, privacy wording, contribution licensing, support links, branch protections, and all published status claims.
- Run the locked dependency tests, all required gates, translation checks, build, and real-browser/offline checks; publish only the status supported by those results.

## Historical 4 November documentation and agent review

The earlier local documentation pass rechecked the unchanged `LICENSE`: 1,070 bytes, SHA-256 `9a05d7606b8295d3833d42381da2c2ce334c9a909c36a0c7c014680f70ed499d`. Its statement that no `.git`, remote or hosted setting was verified was true at that checkpoint and is superseded by the access-restored evidence above. `site/` has a local SVG favicon and no CNAME. Package metadata remains `private: true`, which prevents accidental npm publication and does not make a future GitHub repository private.

The [documentation index](README.md), [architecture](ARCHITECTURE.md), [MCP guide](MCP.md) and inherited [ADR applicability notes](adr/README.md) now separate the current communications preview from historical SP operations. The new [development skill and agent definitions](AGENT_WORKFLOW.md) are repository-local authoring tools. They do not certify release readiness, enforce the API project's budget, or enable the unattended workflow. Original skill/release instructions remain subordinate to the current project scope and gates.

The [archive intake](RESEARCH_GAMEPLAY_INTAKE.md) accounts for 75 curated historical proposals. It is not an implemented-content inventory or permission to reproduce entire mailing-list posts. Review attribution and any copied excerpts when promoting a candidate. Preserve original evidence separately from authored fictional scenarios.

At that earlier checkpoint, selected and full-suite tests used a disclosed external jsdom dependency override; browser execution stopped at a denied localhost listener and hosted settings were not verified. Those dependency, browser-access and hosted-protection observations are historical and superseded where the current status above links fresh evidence. The full-plan, research acceptance and hosted-adaptation budget blockers remain open. See [the deployment review](DEPLOYMENT_REVIEW.md) for the current product backlog. Follow [the development workflow](DEVELOPMENT_WORKFLOW.md) and [GitHub setup notes](../maintenance/github-setup.md) to complete them without changing the licence or claiming a new pass.

## Earlier verification scope (historical)

The preceding implementation pass ran 187 JavaScript test files: 1,277 tests passed, and actual stdio MCP passed 50 cases. Its runs used an external dependency override and predated clean locked installation and later input changes. These historical counts do not describe the current tree or establish complete gameplay, browser acceptance or publication readiness. See [the deployment review](DEPLOYMENT_REVIEW.md) and the dated receipts.

## New artwork provenance and distribution

The six new project illustrations, responsive WebP exports, social preview and raster install icons are indexed in [the artwork manifest](../artwork/manifest.json), with [generation briefs](../artwork/BRIEFS.md). The recovered upstream binaries have separate provenance. The new illustrative jokes are separate from the 119 source-linked text comparisons. The current runtime has browser, offline and visual review recorded in the verification receipt; asset/hash and DOM checks alone would be narrower evidence.

## Reference guidance

GitHub's [README guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) recommends that a repository README identify what a project does, how to start, where to get help, and who maintains it. GitHub documents adding a [license](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository), a [Code of Conduct](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-code-of-conduct-to-your-project), and a [security policy](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/add-security-policy). This audit applies that guidance by recording missing ownership/contact decisions instead of inventing them.

## Publishing the playable preview

Run **Publish GitHub Pages** on `main`, selecting `preview`, then review the `github-pages` environment deployment. The workflow installs locked dependencies, runs tests and development gates, builds, scans source/history/output for secrets, audits dependencies and checks the exact static file inventory before upload. The only deploy job uses GitHub Pages with its own minimal write permissions. No API key is required. See the [current run status](https://github.com/zanefounty/series-of-calls/actions/runs/41796717064).

Selecting `release` additionally runs the full product release gate, which still rejects unreviewed source material and incomplete requirements. Preview publication does not mark these obligations complete. GitHub Pages is configured for workflow builds and enforced HTTPS; Dependabot alerts, secret scanning and push protection are enabled. See [the security policy](../SECURITY.md) for local checks and reporting.

[PR #15](https://github.com/zanefounty/series-of-calls/pull/15) merged after all 12 checks passed. `security` is now a strict required check, preserving the no-bypass policy and the separate owner review rule. Actions use current supported major tags with Dependabot updates, as requested in owner review.
