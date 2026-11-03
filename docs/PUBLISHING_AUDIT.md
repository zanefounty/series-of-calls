# Publishing and attribution audit — updated 4 November 2026

> Access-restored continuation: genuine history, independent repository and locked local dependencies are now established; real browser smoke and actual browser MCP runs have executed. The historical limitations below are superseded only where fresh receipts in [the continuation evidence](../evidence/access-restored-2026-11-04/README.md) demonstrate it. Full product/release readiness remains incomplete.

This is a documentation and provenance review of the local preview, not a release approval or verification of a public repository. Git metadata is not present in this workspace, so this review does not claim repository history, current remote settings, or public-link availability.

## Findings addressed in the 3 November pass

- Kept [`LICENSE`](../LICENSE) unchanged. Its SHA-256 at review start was `9a05d7606b8295d3833d42381da2c2ce334c9a909c36a0c7c014680f70ed499d` (1,070 bytes).
- Added [`NOTICE`](../NOTICE) and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) to separate upstream attribution from user-supplied research and cited external material. The root license is not asserted as a grant for every source record.
- Replaced the inherited contributor and conduct instructions that directed people to upstream Series of Tubes contacts, labels, versioning, and workflows.
- Added [`SECURITY.md`](../SECURITY.md), which explicitly says no supported release or verified private reporting channel exists yet. It does not invent an email or promise a response time.
- Removed upstream Signal and educational-resource links from the issue-form contact menu. Updated issue and pull-request templates for fictional training state, safe synthetic exports, source provenance, negative tests, and remaining limitations.
- Clarified that the top of [`CHANGELOG.md`](../CHANGELOG.md) is the Series of Calls preview log and the following section is preserved Series of Tubes history, not a Series of Calls release record.
- Added policy and attribution links to [`README.md`](../README.md). The README continues to say this directory is unpublished and that the full source conversion is incomplete.

## Remaining publication checks

1. **License scope documented.** The application code and package metadata use MIT, preserving the upstream copyright and license bytes. `NOTICE` identifies the independent adaptation. Supplied research remains an unchanged source pack; external excerpts and citations retain their original rights and attribution. Distribution tests verify the license and both notice files. No external work is relicensed by a citation.
2. **Repository and metadata.** The destination repository and Pages URL in metadata/setup notes are planned but not verified. Preserve genuine upstream history before pushing the independent repository; do not initialize unrelated history or establish a GitHub fork relationship. Confirm `repository`, `homepage`, `private`, and any publication-specific package metadata against the actual destination; no public repository or release is claimed here. The existing task authorizes repository preparation; governance changes still require their separate owner-reviewed PR.
3. **Contact and enforcement.** There is no current project support contact, private Code of Conduct report route, or named security contact. Establish and test those routes before enabling public issue intake or deploying a public site. The upstream maintainer and Signal group are not responsible for this adaptation.
4. **Security policy.** Configure and test GitHub private vulnerability reporting (or an equally private route), state supported versions, and publish response expectations only after an accountable owner is named. Until then, `SECURITY.md` is a blocker notice, not an operational reporting channel.
5. **Distribution inventory.** Review exactly what a published site and repository contain, including static assets, generated source-derived catalogue excerpts, embedded attribution, and dependencies. The current build script copies `site/`, assembles application files, and copies `LICENSE`, `NOTICE`, and `THIRD_PARTY_NOTICES.md` into its output; it does not copy `node_modules/`. The build test now compares all three shipped files byte-for-byte with their originals and pins the upstream licence hash. Repeat that check on the final release artifact before publishing. Do not infer from a source-tree notice alone that a built site includes it.
6. **Upstream completeness.** Genuine upstream Git history is not attached and six binary assets remain unrecovered in the recorded acquisition. Do not present the local snapshot as a complete upstream fork or as a fully attributed reconstruction until these items are resolved.
7. **Verification.** The locked dependency baseline, real-browser/offline acceptance, hosted workflow protections, and final release checks remain pending in [`STATUS.md`](../STATUS.md) and [`evidence/verification.json`](../evidence/verification.json). Documentation polish does not satisfy those gates.

## Maintainer checklist before opening public intake

- Preserve the documented application/source-pack distinction and the upstream licence bytes when adding new material.
- Attach genuine upstream history, inspect the independent destination and remotes, recover/resolve missing upstream assets, and check all links against the actual repository.
- Confirm package metadata with the owner; determine whether this is only a private static-site package or may be distributed as an npm package.
- Verify the shipped artifact contains the intended `LICENSE`, `NOTICE`, and `THIRD_PARTY_NOTICES.md`, and inventory runtime/development dependencies separately.
- Configure a confidential security-report channel and Code of Conduct enforcement contact. Test access as a reporter and recipient without publishing sensitive details.
- Recheck issue forms, safe-save guidance, privacy wording, contribution licensing, support links, branch protections, and all published status claims.
- Run the locked dependency tests, all required gates, translation checks, build, and real-browser/offline checks; publish only the status supported by those results.

## 4 November documentation and agent review

Rechecked the unchanged `LICENSE`: 1,070 bytes, SHA-256 `9a05d7606b8295d3833d42381da2c2ce334c9a909c36a0c7c014680f70ed499d`. This directory still has no `.git`; no remote or hosted setting was verified in this pass. `site/` has a local SVG favicon and no CNAME. Package metadata remains `private: true`, which prevents accidental npm publication and does not make a future GitHub repository private.

The [documentation index](README.md), [architecture](ARCHITECTURE.md), [MCP guide](MCP.md) and inherited [ADR applicability notes](adr/README.md) now separate the current communications preview from historical SP operations. The new [development skill and agent definitions](AGENT_WORKFLOW.md) are repository-local authoring tools. They do not certify release readiness, enforce the API project's budget, or enable the unattended workflow. Original skill/release instructions remain subordinate to the current project scope and gates.

The [archive intake](RESEARCH_GAMEPLAY_INTAKE.md) accounts for 75 curated historical proposals. It is not an implemented-content inventory or permission to reproduce entire mailing-list posts. Review attribution and any copied excerpts when promoting a candidate. Preserve original evidence separately from authored fictional scenarios.

The earlier implementation session recorded 466 selected tests and 352 registered acceptance cases. An earlier deployment review recorded 470 focused tests and 362 acceptance cases, plus a complete 175-file/1,231-test JavaScript run and 49 actual stdio MCP cases. All passed with the disclosed external jsdom dependency override. Source integrity, accounting gates, 61 negative gate tests, translation checks and the static build passed; the release check still rejects unreviewed research. Real-browser testing stopped at a denied localhost listener. See [the deployment review](DEPLOYMENT_REVIEW.md) for receipts and the remaining product backlog. The full-plan, locked-dependency, browser, hosted protection and publication blockers above remain open. Follow [the development workflow](DEVELOPMENT_WORKFLOW.md) and [GitHub setup notes](../maintenance/github-setup.md) to complete them without changing the licence or claiming a new pass.

## Latest verification scope

The subsequent implementation pass ran all 187 JavaScript test files with per-case TAP: 1,277 tests passed without failures or skipped cases. Actual stdio MCP passed 50 cases. The acceptance plan registers 408 cases; current evidence/gate results and earlier failed attempts remain separately recorded. See [the updated deployment review](DEPLOYMENT_REVIEW.md). These results still use the external dependency override and do not establish complete gameplay, a locked baseline, browser acceptance or publication readiness.

## New artwork provenance and distribution

The six new project illustrations, responsive WebP exports, social preview and raster install icons are indexed in [the artwork manifest](../artwork/manifest.json), with [generation briefs](../artwork/BRIEFS.md). They do not recover or replace the provenance obligations for six unavailable upstream binaries. The new illustrative jokes are separate from the 119 source-linked text comparisons. Browser layout, contrast and offline artwork review remain pending; asset/hash and DOM checks are narrower evidence.

## Reference guidance

GitHub's [README guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes) recommends that a repository README identify what a project does, how to start, where to get help, and who maintains it. GitHub documents adding a [license](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository), a [Code of Conduct](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-code-of-conduct-to-your-project), and a [security policy](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/add-security-policy). This audit applies that guidance by recording missing ownership/contact decisions instead of inventing them.
