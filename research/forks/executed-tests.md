# Pinned fork feature test results

Tested in isolated full-history checkouts under `/tmp/soc-fork-survey/checkouts/`; raw command output remains under `/tmp/soc-fork-survey/rawlogs/`. These are local test results for fork commits, not upstream or SOC verification.

Runtime: Node `v24.22.2`, npm `12.2.1`. All four `npm ci` commands exited 0 from the checkout at the exact test SHA. Each installed 64 packages, reported 0 vulnerabilities, and emitted one deprecated `whatwg-encoding@3.1.1` warning. The package engine field was `node >=20`.

| Feature | Exact tested HEAD | Locked install | Test command | Result |
|---|---|---|---|---|
| Lair-us IP-space revocation | `77776c855724ed407a7b18bde1ee22c3e5da8046` | `npm ci` exit 0 | `npm test -- tests/ip-space.test.js` | exit 0; 9/9 passed, 0 failed, 10.1 s |
| Intern PNI/IX port headroom | `62c242c9a73913675c22b30356684d9041e796d9` | `npm ci` exit 0 | `npm test -- tests/intern-ports.test.js` | exit 0; 12/12 passed, 0 failed, 7.3 s |
| City traffic-share cache sizing | `528fdb6184ec3a1ff6ec7c29ff46a9967fda8819` | `npm ci` exit 0 | `npm test -- tests/utilities-caches.test.js` | exit 0; 10/10 passed, 0 failed, 3.3 s |
| Route-server placement + scenario regression | `260f014e1159d75825df380900bcf4d4281da737` | `npm ci` exit 0 | `npm test -- tests/route-server-peers.test.js tests/scenarios-playtest.test.js` | exit 0; 19/19 passed, 0 failed, 30.8 s |

The route-server slice includes both the focused `#265` assertion and existing scenario reference/shortcut regression cases. The other three original feature-specific test files were run without additional suites. No build, translations, full repository suite, hosted checks, or release gate was run. No repository source, registry, or governance files were changed.

Raw logs: `lease-npm-ci.log`, `lease-test.log`, `intern-npm-ci.log`, `intern-test.log`, `cache-npm-ci.log`, `cache-test.log`, `route-server-npm-ci.log`, `route-server-test.log`.

# Pinned AU fork full verification

Checked 2026-11-04 at `thesysadmindev/SeriesOfTubesAU` HEAD `c650d84d0f79219e8b2249bae9bac3bbfe3b2d5e`. The clone remained pinned at this commit before and after verification. Package scripts were inspected before execution: the test runner discovers `tests/*.test.js`; build removes/recreates `_site/`; translation check reads dictionaries and source; map `--check` compares generated output and does not write it.

## Results

- Full test suite: `TEST_JOBS=4 npm test` — **528 passed, 0 failed**, Node test-runner duration 168.965 seconds. Raw output: `/tmp/soc-fork-survey/au-full-test.log` (local diagnostic).
- Build: `npm run build` — **passed**, built Series of Tubes: Australia 3.0.0 for 2026-11-04 into ignored `_site/` (2.4 MB). Raw output: `/tmp/soc-fork-survey/au-build.log` (local diagnostic).
- Translation check: `npm run i18n:check` — **passed**, English 2,709 labels with 0 problems; de/es/fr/it/pt each 100.0%, 0 missing/unused/broken labels. Raw output: `/tmp/soc-fork-survey/au-i18n.log` (local diagnostic).
- Map consistency: `node scripts/build-au-map.js --check` — **passed**, “map files are up to date.” Raw output: `/tmp/soc-fork-survey/au-map-check.log` (local diagnostic).

Dependencies were already installed from the pinned lockfile using `npm ci --ignore-scripts` in the earlier bounded survey. Runtime versions: Node v24.22.2, npm 12.2.1. The tracked clone worktree is clean after verification; no foreign source or scripts were edited and no commits were made. `_site/` is build output under the temporary clone.

## Additional top-ten source tests

Five further isolated checkouts passed their locked `npm ci` installations with Node 24.22.2/npm 12.2.1. The following commands exercised the foreign source revisions; they are separate from SOC acceptance. All reported zero failed, cancelled and skipped tests.

| Source and immutable revision | Executed tests | Result |
| --- | --- | --- |
| [alexgn100 cloud sync](https://github.com/alexgn100/seriesoftubes/commit/6971f2d7ad72c60abf051815f7305eb801b88825) | Repository-defined `npm test`, including sync protocol/authentication/save conflicts | 219 passed |
| [tannerryan network realism](https://github.com/tannerryan/seriesoftubes/commit/108cb5dfa2ad75759cc19bff09510b22555d5ba8) | `TEST_JOBS=4 npm test -- tests/network-realism.test.js tests/network-routing.test.js tests/transit-pricing.test.js tests/transit-markets.test.js tests/landing-stations.test.js tests/network-footprints.test.js tests/closed-corridors.test.js tests/incumbent-peering.test.js` | 35 passed |
| [yeled stale-tab ownership](https://github.com/yeled/seriesoftubes/commit/39ccb64f982c8dd5f57589cfc39169e23c0681df) | `npm test -- tests/one-tab.test.js tests/persist.test.js` | 13 passed |
| [yeled route reuse](https://github.com/yeled/seriesoftubes/commit/12eb96c618cb4014b7f4d352d54640647c1530ce) | `npm test -- tests/route-reuse.test.js` | 3 passed |
| [wnagele browser MCP](https://github.com/wnagele/seriesoftubes/commit/7438fd106562506f5e6ab774d9d04905c5cd4d58) | HTTP, relay and five core MCP/agent suites, commands below | 6 HTTP, 16 relay and 37 core tests passed |

Wnagele commands were `npm test -- --test-name-pattern='^(?!.*--http: where it listens)' tests/mcp-http.test.js`, `npm test -- --test-name-pattern='^(?!.*dev.js: a bare --host binds loopback)' tests/agent-relay.test.js`, and `npm test -- tests/agent-settings.test.js tests/mcp-parity.test.js tests/mcp.test.js tests/mcp-commands.test.js tests/agent-api.test.js`. The attempted negative name filters did **not** exclude either host-binding test: both files ran every test, including brief ephemeral `0.0.0.0` listeners with local clients. No hosted credentials or cloud service calls were used. These results exercise HTTP/stdio validation and parity, clock/state control, reconnect and origin handling; they are not real-browser acceptance.

All five source snapshots used jsdom 24.1.3 and playwright-core 1.56.0. Wnagele additionally used `@modelcontextprotocol/node` 2.1.2, `@modelcontextprotocol/server` 2.4.0 and `ws` 8.22.0. Alex's full script exercised local login, revisions/conflicts, two-device saves, logout, body limits and rate limiting. Docker/live cloud deployment, full Wnagele/Tanner suites, and real-browser cross-tab execution were not tested here. Route-reuse examples are not a large-network performance benchmark. Raw output stays outside Git under `soc-runtime-artifacts/fork-source-tests/2026-11-04/extended/` in the parent workspace.

### Network-realism rules and remaining adaptation

The eight Tanner suites specifically test these rules:

- New games receive the expanded Tier 1 roster while old saves retain their previous club and contracts.
- IPv4/IPv6 reach partitions, customer-cone inheritance, multihoming/peering repair and isolated PoPs affect delivery; congested preferred transit does not spill to another carrier, and partial reach cannot round up to Tier 1.
- Regional strength and small-market costs affect quotes/billing; each city has bounded Tier 2 sellers, and an existing contract can grow after its offer disappears.
- New landing stations/cable pairs have coordinates; closed corridors reject new circuits in either direction while preserving legacy circuits.
- Remote IX membership does not imply foreign PNI access; restrictive incumbent volume criteria and bilateral route-server opt-outs remain separate policies.

Retained SP modules already contain customer-cone/city shares (`30-networks/40-traffic-shares.js`), destination reach and Tier 1 rounding rules (`70-rules/10-helpers.js`, `80-hot-ports-and-rank.js`), and city-specific interconnection/policy (`20-exchanges.js`, `30-pnis.js`, `40-peering-desk.js`, `50-peering-policy.js`). This is concept overlap, not proof of parity with the fork's expanded country/IPv6/access-market dataset or a communications-game adaptation. These source-specific differences remain proposals; no requirement or owner research decision was closed by the test results.
