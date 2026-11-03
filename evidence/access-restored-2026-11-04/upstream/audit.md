# Upstream history recovery and adoption audit

**Observed:** 4 November 2026. **Scope:** read-only comparison of the attached genuine history, the pinned register, and the upstream remote. This report proposes review work; it does not update canonical adoption status or approve any exclusion.

## History and freshness

`scripts/hydrate-history.py` attached the genuine upstream repository history without changing the authored working tree. The attached `main`/`HEAD` is `b7e5f193b424689e3dbdf6e57639b5212e04d5c2`, matching `maintenance/upstream/register.json`'s `latestObserved`. The `upstream` remote points to `fjaeckel/seriesoftubes`; `origin` points to the configured independent destination `zanefounty/series-of-calls`. `git fsck --full --no-reflogs --connectivity-only` exited 0.

The currently fetched `upstream/main` is `b2366ed26018f957309292d04adf5d6e76a89c65`, 17 commits beyond the pinned head. It describes as `v2.7.0-6-gb2366ed`; tag `v2.7.0` resolves to `41d5bc8b2118d3de49df59dc35a522eb12b17227`. The pinned `v2.6.0` remains at `366c9a25420e28f8708b0f329c82fae3367f46f7`. Therefore the previously current register and v2.6.0 adoption record are stale against observed upstream. The register's last successful check is `2026-11-03T11:14:30Z`; do not advance that canonical timestamp or inventory from this report alone.

The revision range contains 17 commits: 13 content commits and four merge commits. `git log`'s default history simplification displayed only 13; `git rev-list --reverse HEAD..upstream/main` confirms all 17. The default `git diff HEAD..upstream/main` reports 35 changed paths. No release or product readiness conclusion follows from this comparison.

## New upstream commits and proposed review

All rows below are **proposed `adapt`, pending** because this project retains the optional upstream network sandbox but has substantially diverged runtime, UI, MCP, packaging and tests. The factual changes are in upstream history; the proposed work is to reconcile them against the local implementations and preserve the relevant behaviours. Merge commits provide provenance and must not be counted as a second feature implementation.

| Commit | Upstream change | Proposed adoption work |
| --- | --- | --- |
| `23eeddf44f19946c2b92853cbed48244d7214c1d` | Adds the keyboard help/dialog, shortcuts for POP stepping and zoom, translations, CSS and tests. | Compare input focus/modal behavior and action semantics with local UI. Port the shortcuts into the retained sandbox only where they remain usable and do not bypass existing action validation. |
| `d88684d86ea0bc7a478fceab88555eeea38c2ff3` | Adds `n` then a letter to open NOC tabs; corrects/help-tests keyboard action. | Verify key timing, focus suppression, modal behavior and tab selection against local dashboard/admin controls. |
| `2680f3d82b2569c06bda4872690a9744c5cee4fa` | Adds held arrow/WASD map movement, with translated help and tests. | Check key repeat, map focus, input-field exclusion and keyboard accessibility in the local canvas. |
| `a0acb27c7af71ffc661b1e4da472e7b3f32b8115` | Merge of keyboard-shortcuts branch and main. | Provenance only; reconcile its parent changes once. |
| `daec638bfc84c1ba973d8a2fc2a4598f6222602b` | MCP classifies `popStep`, `zoomStep` and `keys` as views. | Reconcile tool schemas and read-only classification with the local MCP boundary; verify mutations remain dispatched and view calls remain pure. |
| `3192f42b5a9daedde3015bc908d38875d3d1b7ac` | `$` selects the open offer expiring soonest; adds UI, translations and test changes. | Compare offer ordering, expiry ties, selected-offer persistence and local offer lifecycle before adopting. |
| `c5c5aac9704546d06c3de4538a05b1d485036b50` | Merge of keyboard-shortcuts branch and main. | Provenance only; reconcile its parent changes once. |
| `9cf90d0ad0bfeb3991d492f295b6221ef4dd47e0` | Merge of PR 270. | Provenance only; reconcile its parent changes once. |
| `48ba0048dab7c1e11ded28daf3526a32109ab69f` | Makes keyboard help open on the title screen and exposes new actions to MCP. | Check pre-game UI lifecycle and MCP action/view separation against local session setup. |
| `d1a25041046680dfb468d57d351bfde287b6a80c` | Merge of PR 270b. | Provenance only; reconcile its parent changes once. |
| `41d5bc8b2118d3de49df59dc35a522eb12b17227` | Release commit for v2.7.0: Northern Australia, keyboard shortcuts and faster subsea cables; updates package metadata. | Compare release-level source, dependency and performance changes. Do not take the package lockfile wholesale; confirm supported Node/dependency contract and rerun local checks. Preserve the local release identity and MIT/attribution metadata. |
| `017eba4ca22a23f9cf5e69c37fec9e209f325473` | Adds US state capitals, DC, Canadian capitals and Greenland; updates geography, cities, routes, translations and tests. | Reconcile complete geographic/capital and route fixtures with the local optional sandbox, checking stable IDs, price/route assumptions and exact data provenance. |
| `c5c0d853ae650c9b604970de343fae01e229e9eb` | Adds capital cities across the Americas, coastline/coordinates and route/network data. | Same review, with country-capital exceptions and resulting network topology checked against local rules. |
| `296392fb961c3643b87768c2ca59d869571e3bab` | Adds European capitals and updates the weekly scenario. | Review city/coast/route changes and scenario compatibility; retain any local narrative/source comparison attached to this scenario. |
| `894307a35c6582868956fba88a4332ad3e968068` | Adds Middle East, Caucasus and Central Asian capitals; changes MCP page output and weekly scenario. | Verify regional topology and scenario; reconcile MCP output shape without changing SOC dispatch/security guarantees. |
| `b4cfa2b32097acaebcbf63a80d55c04ee85c28c0` | Adds South, East and Southeast Asian and Pacific capitals. | Reconcile geography, routes and region tests against local map model and retained content. |
| `b2366ed26018f957309292d04adf5d6e76a89c65` | Adds African capitals, completing the upstream world-capital inventory; updates routes, translations and scenario tests. | Audit completeness and source data across the entire map after regional additions; retain explicit disputed/alternate capital modeling where the upstream tests encode it. |

The six regional geography commits (`017eba4`, `c5c0d85`, `296392f`, `894307a`, `b4cfa2b`, `b2366ed`) each modify the world-model/cable/network data and tests. They form one cumulative data change; do not treat each commit's intermediate tree as a separate final inventory. Their unchanged root joke/narrative intent should be checked against the local source-linked narrative mapping before importing dialogue or summaries.

## Six original binary assets

The six binary blobs recorded as unavailable by `maintenance/baseline.json` are now recoverable from the attached genuine history at pinned `HEAD`. Each `git cat-file blob <object>` succeeded and the SHA-256 below was computed from those exact Git blob bytes. Local files currently have different SHA-256 values: they are later fork assets, so preserve them and keep their distinct provenance. No replacement or overwrite was performed.

| Original upstream path | Git blob ID | Size (bytes) | SHA-256 of recovered upstream bytes |
| --- | --- | ---: | --- |
| `site/apple-touch-icon.png` | `9c5f1ee60bcf21221df7cbb72f925c6577350baf` | 5,054 | `9a7460ee8d538008ce83be3cfeeddef03eed0f55207435adae043933a24c42e8` |
| `site/favicon.ico` | `a8c2a13a818c32244fe48514565a1282e6afada9` | 2,107 | `7a16ef6cfa0a42158f99afae5600ce55ce5901789ccf2aaf7173172f000e2c82` |
| `site/icon-192.png` | `61c6d7598187fa78af10eb9e747400a26436bb0d` | 9,342 | `b904dff728feedc8304092a1c4d754a6d530dd3d10f8847e2b6012b9cb4eef7e` |
| `site/icon-512.png` | `58dada30cf8e9ba924bc155133bdedee79ad2a99` | 26,342 | `206aeac58530a14f1f2006504fed1d20e9fe9fbba22c3dfca8a560bc0cb89d33` |
| `site/icon-maskable-512.png` | `ccc2c8d7e2cac80fe162de1b7e02c2e31727cb16` | 13,098 | `31c07a9aa432118e4eaebc322701cca0e0cfef467ea4e9de61dca4831319dd17` |
| `site/images/og-image.png` | `495cf360ca30665998139e4d3bd1cf8bc74ac3cb` | 282,773 | `b2a9d851277ddf8251ac4133de454e542b96756e830211caf12b4852692b5445` |

Recovery recipe, without modifying the working tree: `git cat-file blob <blob-id> > /path/outside/repository/<basename>`. The blob IDs are stronger provenance anchors than a filename or a currently generated replacement. The local adoption record can now state that the original bytes are available in recovered history; any desired archival copy should be saved outside active paths or in an explicitly assigned provenance archive, not written over current assets.

## Reproducible checks and remaining work

Commands run from the repository root:

```text
rtk git remote -v
rtk git rev-parse HEAD upstream/main
rtk git rev-list --count HEAD..upstream/main
rtk git diff --name-status HEAD..upstream/main
rtk git fsck --full --no-reflogs --connectivity-only
```

Observed outcomes: remotes are configured as specified; pinned `HEAD` equals the register's `latestObserved`; `upstream/main` is 17 commits ahead; the two-tree diff reports 35 changed paths; connectivity check exits 0. Six object reads and byte hashes are listed above. No source, register, generated specification, release readiness, remote setting or deployment state was changed.

The coordinator should run the repository's complete upstream observer against the current remote when integrating this work. It writes the immutable full inventory and pending new commit/file/version rows; it must be followed by semantic classification and adoption receipts. Existing 349 commit and 426 historical file-version obligations remain unresolved unless their row-specific review/evidence says otherwise. The six recovered bytes close only the binary-history availability question, not full upstream review. The 17 new commits have not been adopted or independently tested here; required follow-up is local behavior comparison, selective adaptation, specific tests, and owner-reviewed exclusions if any are proposed. The latest successful upstream check must be refreshed by the observer for release freshness; this report is a read-only audit, not that canonical check.
