# Top-ten upstream fork review

**Snapshot:** [fork inventory](catalogue.json), complete 39-repository GitHub fork-list snapshot. Selected by `pushed_at` descending, `full_name` descending tie-break; every snapshot star count is zero, so stars do not distinguish these forks. All are public forks of `fjaeckel/seriesoftubes`, the original JavaScript/Node network-management game. Upstream comparison pin: `b2366ed26018f957309292d04adf5d6e76a89c65` (the repo's `maintenance/upstream/register.json` latest successful observation, 2026-11-03T22:36:56Z).

This is a branch/revision inventory, not an adoption decision. Default-branch ancestry and fork-only branch commits are reported separately. “No unique commits” means no commits reachable from the pinned branch that are absent from this comparison pin; it does not establish that no edits were ever made or that a feature is semantically covered. Check-run results are GitHub-hosted observations for the named SHA and are not local verification. Tests were not run for this research task.

## Ranked inventory

| Rank | Fork; pushed at; stars | Default-branch SHA vs pin | Hosted checks for default tip | Fork-specific result |
|---|---|---|---|---|
| 1 | [Lambro-codes/seriesoftubes](https://github.com/Lambro-codes/seriesoftubes); 2026-11-04 02:01Z; 0 | `b2366ed26018` exactly equals pin | 0 check runs returned | No fork-only changes. Current upstream snapshot. |
| 2 | [wnagele/seriesoftubes](https://github.com/wnagele/seriesoftubes); 2026-11-04 00:22Z; 0 | `da1a4e2f3c9f`, ancestor; 33 commits behind | 11 runs: build/test shards/translations/release succeeded; deploy failed; indexnow skipped | Default is stale. Separate `mcp-browser-mode` branch has 3 commits on current pin, detailed below. |
| 3 | [thesysadmindev/seriesoftubes](https://github.com/thesysadmindev/seriesoftubes); 2026-11-03 11:59Z; 0 | `66aaaec5f1cc`, ancestor; 68 commits behind | 7 runs: test/test shards/translations/build all succeeded | Default is stale. Two distinctive feature branches: temporary IP-space revocation and PNI/IX port headroom. |
| 4 | [pcn/seriesoftubes](https://github.com/pcn/seriesoftubes); 2026-11-03 11:54Z; 0 | `41d5bc8b2118`, ancestor; 6 commits behind | 0 check runs returned | No fork-only changes found. |
| 5 | [yeled/seriesoftubes](https://github.com/yeled/seriesoftubes); 2026-11-03 10:55Z; 0 | `de4a750cdd82`, ancestor; 31 commits behind | 0 check runs returned | Default is stale. Relevant branch-only patches cover stale cross-tab saves, router/optic gameplay, and route-compute performance prototypes. |
| 6 | [alexgn100/seriesoftubes](https://github.com/alexgn100/seriesoftubes); 2026-11-02 19:27Z; 0 | `48bb34e61f4c`, diverged from pin at `15dc5741d4b4`; 16 branch commits / 35 pin commits after merge base | 0 check runs returned | German localization, Docker packaging and a cloud save-sync server; see below. |
| 7 | [tannerryan/seriesoftubes](https://github.com/tannerryan/seriesoftubes); 2026-11-02 03:14Z; 0 | `10e5ff0073ee`, diverged at `add3d67e48b7`; one authored feature plus two upstream merge commits / 37 pin commits after merge base | 0 check runs returned | Feature branch introduces locations and more realistic routing, volume, interconnection and pricing. |
| 8 | [hdecreis/seriesoftubes-hdc](https://github.com/hdecreis/seriesoftubes-hdc); 2026-11-02 00:52Z; 0 | `add3d67e48b7`, ancestor; 37 commits behind | 0 check runs returned | `cache-city-shares` branch has one tested cache-sizing correction. |
| 9 | [ddryden/seriesoftubes](https://github.com/ddryden/seriesoftubes); 2026-10-31 14:59Z; 0 | `20c70f16e684`, ancestor; 93 commits behind | 0 check runs returned | Default and `focus-link-on-inspect` branch contain no commits unique to the comparison pin. |
| 10 | [cookiesowns/seriesoftubes](https://github.com/cookiesowns/seriesoftubes); 2026-10-31 06:51Z; 0 | `664dd24bbd1d`, ancestor; 130 commits behind | 0 check runs returned | No fork-only changes. |

The commit-distance figures are based on Git ancestry to the pinned commit. For diverged repositories they are counts on each side after the merge base, not simple ahead/behind counts.

## Distinctive top-ten branch work

### 1. Temporary leased-address-space revocation — strongest new failure mechanic

`thesysadmindev/seriesoftubes` branch `lease-revocation` contains original commit [`77776c855724`](https://github.com/thesysadmindev/seriesoftubes/commit/77776c855724ed407a7b18bde1ee22c3e5da8046). Lair-us temporarily revokes the address space behind one active wave or lit fiber, darkening that link until renumbering for 7–60 days. Duration is weighted toward shorter outages. The random event is rare, begins after day 60, requires at least three eligible links, and cannot overlap another such revocation. The game computes lost served traffic, exposes the incident in the NOC and selected-link panel, and automatically restores connectivity at expiry. It composes with other outages by retaining the later `cut` expiry.

The accompanying [`tests/ip-space.test.js`](https://github.com/thesysadmindev/seriesoftubes/blob/77776c855724ed407a7b18bde1ee22c3e5da8046/tests/ip-space.test.js) exercises bounds/distribution, one-link selection, duration and recovery, eligibility and rarity, coexisting outages, UI/NOC evidence, deletion cleanup, save/reload, old saves, malformed/dangling references, and localized strings. The test file has 187 lines in the original feature commit. This is a strong candidate for adapting as an explicit timed, recoverable outage with observable cause and cross-incident tests. Treat as proposed until source/requirement mapping and compatibility are reviewed.

The default `main` does not contain this commit; the remote feature tip `949c311c8ea3` adds upstream sync merges after it. GitHub API returned no check runs for that tip. This report did not execute its tests.

### 2. PNI/IX port headroom standing order

`thesysadmindev/seriesoftubes` branch `intern-port-headroom` starts with [`62c242c9a7`](https://github.com/thesysadmindev/seriesoftubes/commit/62c242c9a73913675c22b30356684d9041e796d9), “The intern can keep PNI and IX ports ahead of their traffic.” It automates capacity headroom for peering/interconnection ports as demand grows, adding an explicit operational staffing/automation choice. [`tests/intern-ports.test.js`](https://github.com/thesysadmindev/seriesoftubes/blob/62c242c9a73913675c22b30356684d9041e796d9/tests/intern-ports.test.js) adds 181 lines of behavioral tests. Branch tip `44c587221a8e` adds an upstream merge; GitHub returned no check runs for it. Potential adaptation: model desired port headroom separately from observed utilization and test growth, saturation, and delayed provisioning.

### 3. Cross-tab save ownership

`yeled/seriesoftubes` branch `claude/fix-200` has [`39ccb64f98`](https://github.com/yeled/seriesoftubes/commit/39ccb64f982c8dd5f57589cfc39169e23c0681df), preventing a forgotten older tab from overwriting a newer local save. A tab claims `sot-save-tab`; on losing ownership it stops writing and asks the user to load the newer save or continue locally. [`tests/one-tab.test.js`](https://github.com/yeled/seriesoftubes/blob/39ccb64f982c8dd5f57589cfc39169e23c0681df/tests/one-tab.test.js) has 73 lines for ownership and stale-tab behavior. This is a concrete persistence/concurrency edge case, but browser storage semantics and current SOC save controls need review before adapting.

### 4. Other distinct gameplay and performance branches

- `yeled/seriesoftubes` branch `claude/fix-265`: [`260f014e11`](https://github.com/yeled/seriesoftubes/commit/260f014e1159d75825df380900bcf4d4281da737) keeps route-server networks on the route server; adds routing assertions in [`tests/route-server-peers.test.js`](https://github.com/yeled/seriesoftubes/blob/260f014e1159d75825df380900bcf4d4281da737/tests/route-server-peers.test.js).
- `yeled/seriesoftubes` branch `claude/intern-optics-262`: [`2254967602`](https://github.com/yeled/seriesoftubes/commit/22549676026a866ca1662a926db661fac4db8488) makes an intern choose the largest compatible optic for new fiber; [`tests/intern-optics.test.js`](https://github.com/yeled/seriesoftubes/blob/22549676026a866ca1662a926db661fac4db8488/tests/intern-optics.test.js) adds 59 lines.
- `yeled/seriesoftubes` has performance prototypes: [`f61c199b3a`](https://github.com/yeled/seriesoftubes/commit/f61c199b3a67af887a206c5d937cd6d1b7053d8b) groups routing flows with identical exits then splits results by demand; [`13165b9518`](https://github.com/yeled/seriesoftubes/commit/13165b951879a63d555a9fdf1285968f15bbded7) and [`12eb96c618`](https://github.com/yeled/seriesoftubes/commit/12eb96c618cb4014b7f4d352d54640647c1530ce) reuse prior routing on quiet days. The latter two add `tests/route-reuse.test.js` (55 and 51 lines respectively). These are performance proposals; require correctness/parity benchmarks before adaptation.
- `hdecreis/seriesoftubes-hdc` branch `cache-city-shares`: [`528fdb6184`](https://github.com/hdecreis/seriesoftubes-hdc/commit/528fdb6184ec3a1ff6ec7c29ff46a9967fda8819) sizes city caches by that city's traffic share after routes split traffic. It adjusts utility caching and adds 11 lines to [`tests/utilities-caches.test.js`](https://github.com/hdecreis/seriesoftubes-hdc/blob/528fdb6184ec3a1ff6ec7c29ff46a9967fda8819/tests/utilities-caches.test.js). A narrow correction suitable for comparison against SOC typed-unit/cache mechanics.
- `tannerryan/seriesoftubes`: original [`108cb5dfa2`](https://github.com/tannerryan/seriesoftubes/commit/108cb5dfa2ad75759cc19bff09510b22555d5ba8) expands location launches and network realism across routing, demand volume, interconnection and prices. The two subsequent commits are upstream sync merges. This is a broad gameplay/world-data change (119 files, about 5,900 insertions); the same commit adds or updates focused tests including `tests/network-realism.test.js`, `tests/network-routing.test.js`, `tests/transit-pricing.test.js` and `tests/landing-stations.test.js`. Split it into individual mechanic contracts before considering adaptation. Hosted check-runs were not returned for the fork tip; no tests were run locally.

### 5. Cloud sync and agent/browser mode

- `alexgn100/seriesoftubes` has original commits [`6971f2d7ad`](https://github.com/alexgn100/seriesoftubes/commit/6971f2d7ad72c60abf051815f7305eb801b88825) and [`ef0fc63e45`](https://github.com/alexgn100/seriesoftubes/commit/ef0fc63e45d338cf1e5abddd1b8505901474302c). The former adds an optional Node `server/sync.js` service, Docker Compose/nginx packaging, and browser-side cross-device cloud sync; [`tests/sync.test.js`](https://github.com/alexgn100/seriesoftubes/blob/6971f2d7ad72c60abf051815f7305eb801b88825/tests/sync.test.js) adds 219 lines. The latter adds German localization and a Docker image. Not a gameplay mechanic; service trust, privacy, deployment and authorization would require separate governance/architecture review. Its default branch is diverged and behind current upstream.
- `wnagele/seriesoftubes` branch `mcp-browser-mode` ends at [`7438fd1065`](https://github.com/wnagele/seriesoftubes/commit/7438fd106562506f5e6ab774d9d04905c5cd4d58), with three original commits. It moves an agent facade into browser-assembled development code, adds an MCP server using the official SDK over stdio or HTTP, and a browser-tab agent mode with relay and clock control. Tests include `tests/mcp-http.test.js` (166 lines), `tests/agent-relay.test.js` (528), `tests/agent-settings.test.js` (166), and `tests/mcp-parity.test.js` (83). Stack is JavaScript/Node, official MCP SDK, stdio/HTTP, browser page and relay; this is implementation/automation architecture rather than new game-domain behavior. GitHub returned no check runs for feature tip. Default `main` hosted checks include a deploy failure, but are attached to its older `da1a4e2` tip and do not verify this branch.

## Non-top-ten distinctive branches noticed

A `git ls-remote --heads` scan of the remaining 29 forks surfaced, but did not fully analyze, unusually specific branches. These should remain visible as follow-up leads rather than claimed adaptations:

- [Flol0/seriesoftubes `main`](https://github.com/Flol0/seriesoftubes/tree/main) has a 1.10–1.15 extension history for power management, automatic maintenance/server hosting, scalable customer capacity/growth, proprietary submarine cables and long-haul regeneration, service switches, redundant uplinks and POP capacity planning. It later retires/supersedes extensions while syncing upstream. This could contain the largest non-top-ten feature portfolio; inspect immutable commits before selecting it.
- [LookedPath/seriesoftubes `perf/large-network-responsiveness`](https://github.com/LookedPath/seriesoftubes/tree/perf/large-network-responsiveness) has a large-network/mobile performance change and paused-map redraw suppression. Its named branches also include subsea cable design, ocean routing, upgrade scheduling and a routing benchmark, but their unique commit content was not investigated in this bounded pass.
- [wesleymarquesnetworks/seriesoftubes `feat-link-redundancy-manager`](https://github.com/wesleymarquesnetworks/seriesoftubes/tree/feat-link-redundancy-manager) proposes safe bulk review/decommission of parallel links; `fix-pni-dual-site-lag` splits a single-member PNI across both sites; `perf-compute-saturated-paths` skips saturated paths during route exit scans. Branch commit histories confirmed these messages as unique against the pin; code/tests/checks were not audited.

## Prioritized review/adaptation proposals

1. **Timed address-space revocation** — most distinctive bounded incident with strong lifecycle/evidence/save tests. Map to synthetic tenant/carrier/route assets and prove outage, impact, expiry and interaction with another outage before considering code.
2. **Capacity headroom and optic selection** — useful workforce/configuration decisions; preserve desired threshold, provisioning lag, effective capacity and observed saturation as separate states.
3. **Stale second-tab save protection** — an important browser persistence hazard; adapt only through the shared SOC save/dispatch boundary and real multi-tab acceptance.
4. **Route-server placement and city-share cache correction** — narrow correctness rules with focused unit tests; compare to current SOC source-specific routing and cache implementation rather than assume equivalence.
5. **Route reuse / large-network optimization** — promising performance work but currently prototype-like; require deterministic output parity and workload benchmarks before any port.
6. **Cloud sync and browser agent/MCP server** — defer from gameplay adoption; they change trust boundaries and deployment architecture and require the repository's existing security/governance review.


## Evidence and limitations

- Bare clones of the ten selected repos and three noteworthy non-top-ten forks are under `/tmp/soc-fork-survey/repos`. Heads and all advertised branch refs were inspected from those pinned clone objects.
- GitHub REST `check-runs` was queried for the ten default branch SHAs and selected feature branch SHAs. Zero runs means none were returned by that endpoint; it is not proof tests did not run in every system. Hosted statuses are not local results.
- No branch tests, build, translation checks, release gates or browser acceptance were run. No claim of clean tests, compatibility, approval, or exhaustive originality is made.
- The branch scan is bounded by the fetched snapshot and advertised refs. Push recency is not a reliable measure of feature originality or adoption. The three non-top-ten leads have not received the same full investigation as the top ten.
## Subsequent focused execution

The pinned revocation (9), headroom (12), cache (10), and route-server/scenario (19) tests subsequently passed with locked installs. See [executed fork tests](executed-tests.md). Statements above about unexecuted tests describe the initial inspection; the later table names exactly which slices were run.

The follow-up also executed Alex's full repository test script (219), Tanner's eight focused realism suites (35), Yeled's stale-tab/persistence (13) and route-reuse (3) suites, and Wnagele's selected HTTP/relay/core MCP suites (6/16/37). [Exact commands, pins and limits](executed-tests.md#additional-top-ten-source-tests) preserve the distinction between source tests, real browsers and SOC implementation.

## Local semantic overlap check

The coordinator compared route-server placement, city cache shares and optic selection with the current retained SP implementation. All three concepts already have implementation and tests locally; the city-cache implementation also normalizes its local shares. See [the local comparison](README.md#comparison-with-the-current-optional-sp-implementation). Commit ancestry alone had not established this overlap. No duplicate patch was applied.
