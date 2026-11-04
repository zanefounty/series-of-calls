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

- Full test suite: `TEST_JOBS=4 npm test` — **528 passed, 0 failed**, Node test-runner duration 168.965 seconds. Raw output: [au-full-test.log](au-full-test.log).
- Build: `npm run build` — **passed**, built Series of Tubes: Australia 3.0.0 for 2026-11-04 into ignored `_site/` (2.4 MB). Raw output: [au-build.log](au-build.log).
- Translation check: `npm run i18n:check` — **passed**, English 2,709 labels with 0 problems; de/es/fr/it/pt each 100.0%, 0 missing/unused/broken labels. Raw output: [au-i18n.log](au-i18n.log).
- Map consistency: `node scripts/build-au-map.js --check` — **passed**, “map files are up to date.” Raw output: [au-map-check.log](au-map-check.log).

Dependencies were already installed from the pinned lockfile using `npm ci --ignore-scripts` in the earlier bounded survey. Runtime versions: Node v24.22.2, npm 12.2.1. The tracked clone worktree is clean after verification; no foreign source or scripts were edited and no commits were made. `_site/` is build output under the temporary clone.
