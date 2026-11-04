# Provider rebuild verification

Engineering handoff for [PR #20](https://github.com/zanefounty/series-of-calls/pull/20), 4 November 2026 UTC (5 November in Sydney). This is the supplied gameplay revision, not a declaration that the full source conversion or release is complete. Reference strategies and the six-phase implementation are described in [PROVIDER_REBUILD.md](PROVIDER_REBUILD.md); source obligations remain in [PROVIDER_SOURCE_ACCOUNTING.md](PROVIDER_SOURCE_ACCOUNTING.md).

## Candidate and environment

The branch starts from `dcc11d0a81d36f2fff111bff5cc8e530ecca6e85`. Simulation/UI candidate `8c6c281` contains the final migration, autonomy and reconciliation choices plus their behavioural tests. Browser recorder `8aed5b2` builds the static site, copies it to an immutable external directory and records source/artifact hashes. Later presentation corrections `223730d` and `a98ee0c` received focused HUD/quote checks below. Training form-driver change `b1f30a8` commits the final field before its unchanged mouse click. Documentation changes do not change simulation outcomes. Receipts retain their actual input hashes; baseline and changed-surface checks are distinguished below.

Dependencies came from clean `npm ci`, without `NODE_PATH`: Node 24.22.2, npm 12.2.1, jsdom 24.1.3 and application playwright-core 1.56.0. The application's Chromium is build 1194. Firefox/WebKit run in `mcr.microsoft.com/playwright:v1.56.0-noble` with Node 24 because the host Ubuntu 26.04 lacks the pinned WebKit libraries. Browser MCP is separately pinned to 0.0.84 and uses its own browser dependencies. The configured native browser connector cannot launch `/opt/google/chrome/chrome`; the separately launched actual stdio MCP session is reported separately.

## Executed checks

Counts overlap. None is a count of completed source requirements.

| Check | Actual result and scope |
| --- | --- |
| Full JavaScript at `8c6c281` | Clean archive and `npm ci`; 1,584 tests: 1,582 passed, two opt-in soaks skipped, no failures. |
| Provider delta at `8c6c281` | 101 tests: 99 passed, two opt-in soaks skipped, no failures. Includes authority, two plans, demand, live media/capture, shared finance/payroll, incident options, product paths, segment progression, migration choices, autonomy exhaustion/recovery, reconciliation, saves and worker parity. |
| Registered acceptance at `8c6c281` | 603 executed, no failures and no changed inputs; regenerated again on final presentation candidate `9a0fef5` at 13:41:05 UTC with the same passing result. Local development gates pass source, coverage, mapping, catalogue, evidence, upstream and freshness. |
| Actual communications/SP stdio MCP | 94 cases passed. Provider-specific stdio separately passed five journeys: two SMB strategies and enterprise/government/defence; no state injection. |
| Canonical Training smoke | Three viewports and offline reload passed on the built project-path artifact. |
| 20-customer soak at `8c6c281` | Passed 10,000 minutes with sustained demand, 167 settlements and 20 resolved incidents. See conservation below. |
| Channel soak at `8c6c281` | 10,080 simulated minutes; 3/3 tests passed, including over 2,000 actual message deliveries, bounded archives and restored/worker continuation. |
| Browser MCP at `8c6c281` | 19/19 visible-control checks passed through actual pinned stdio MCP; no source drift. |
| Provider browser at `8aed5b2` | 23/23 visible-control journeys passed on an immutable compiled artifact; 321 source hashes matched before/after. Includes four SMB plan/viewport journeys, three further missions, persistence/ownership/offline, keyboard opening and fourteen product paths. |
| Python gate/mutation/configuration checks | 91 tests ran successfully; the security-scanner class skipped because the ambient binary was not the required version. All eight security-scanner tests then passed separately with the pinned Gitleaks 8.30.1 binary. |
| Extended Training matrices | Six complete matrices passed, 144 cases each. Chromium/WebKit compact and campaign use baseline `0eee845`; Firefox compact and campaign use frozen Provider snapshot `b1f30a8` with the form-driver correction. Every aggregate has zero case errors and source drift. Later Provider presentation checks are recorded separately. |
| Build, translations and artifact audit at `8aed5b2` | Passed. 5,818 existing English labels and five dictionaries are structurally consistent. This does not claim that the new Provider prose has been translated. |
| Secret scanning at `8aed5b2` | Gitleaks 8.30.1 found no findings in full Git history, current files or the built Pages artifact. `npm audit` reported zero vulnerabilities. |

### Soak conservation

The declared soak begins at simulation minute 3,442 after establishing 20 active customers through paid commands, and ends at 13,442. It records 79,960 new offers plus 59 jobs already open at the start, 80,019 completions, zero failures and zero open jobs at the end. Completions therefore include the 59 pre-window jobs; they are not all new offers. Restoring the final save and advancing another 60 minutes produced byte-identical state. The report hashes 75 tested input files (`3d3a91b713e5ae8dbcb3dec303a9dc4130b62e342d642289cfeabdb1745a3409`). Revenue and cost deltas in that report are integer AUD cents.

### Visible gameplay

The visible-control driver uses the running application clock, costed quotes and normal controls. Read-only observations assert outcomes; it does not inject cash, demand, success or time. It records both SMB plans at 1366×768 and 390×844, mission-specific enterprise/government/defence work, funded expansion, renewal/exit, fourteen paid family recipes, keyboard-only operation and persistence/ownership/offline behaviours. Each product path must reach an effective deployment and complete at least four real customer work items.

The four missions require two consecutive full qualified profitable periods, recovered incidents and funded expansion. Enterprise uses actual room sessions and migration; government uses captured/transcribed work and versioned boundary evidence; defence completes supported local work during disconnection before repair and reconnection. A probe, readiness flag or empty period cannot win.

Automated opening records reach all three effective stages at simulation minute 7 (Swift) or 14 (Steady), show completed work by the incident snapshots at minute 23/31, and reach the mission milestone at minute 180. These runs use 8× speed and do not record wall-clock first-choice/first-delivery timestamps. They do not establish the proposed two/five/20–30 real-minute usability targets; those measurements remain in the real-person pilot.

### Later presentation check

The long-name HUD correction `223730d` was exercised through the visible new-career controls using “Harbour defence Communications” at 1366×768, 1050×900 and 390×844. All four statistics, clock and speed controls stayed visible and within the header, without document overflow. This is a focused CSS delta check, separate from the 23 full journeys above. Tested CSS SHA-256: `6673cfeb44bbe9e74a52f197ce00f16ea8e57f6aea4638f8fcd2e93d6879ec48`.

The quote presentation correction `a98ee0c` displays both the forecast with the proposed commitment before usage and the validated conditional full-plan forecast, explicitly labelled “not guaranteed.” Swift/Steady show conditional A$450/A$750 per period, alongside committed-before-usage −A$770/−A$650; these are engine values, not UI calculations. Operation minimum terms use the validated commercial quote. The final panel delta `169c702` removes stale internal family-count text and humanizes blocked-offer reasons. Nine focused UI tests passed, including actual engine quotes and an active-customer operation term. Built-browser assertions and screenshots checked both SMB quotes. Scrolled desktop/mobile checks confirmed that the conditional forecast, three-period term and commit button are reachable without horizontal overflow.

### Failures retained

- An added supporting browser-driver test initially used the invalid canonical label `AC-SOC-399a`. The recorder correctly rejected that run with zero accepted cases despite passing underlying tests. Its receipt is retained; the helper regression now has a descriptive, noncanonical title, and the existing 603-case plan is unchanged.
- The final audit found quotes displaying the forecast for the quoted commitment as if it described the completed plan, and operation quotes omitting an available minimum term. The presentation correction and checks above address both.
- An earlier hosted persistence fixture failed `SUPPORT_CAPACITY` because repair now reserves the only support person. The fixed fixture first proves refusal, then pays for another support seat through the public command before testing concurrent coaching and save/worker continuation.
- A recorder spanning source edits rejected its inputs. That report remains a failed diagnostic; it was not relabelled as current acceptance.
- Some Firefox compact/campaign shards timed out during a mouse click on an ordinary Training journey form. Unchanged retries sometimes passed and sometimes failed on different profiles. A targeted diagnostic passed the previously failing case after Escape/Tab committed the last field before the same pointer click; a native input overlay is a hypothesis, not an established cause. Both full changed-driver Firefox matrices subsequently passed without retries: 12 campaign shards and six compact shards, 144 cases each. Firefox 142.0.1 / Playwright 1.56.0; common input SHA-256 `33cf2e1aea72d993770d92f55e0082eba681eff41c83f056a966e92093c6e007`. All initial failures and retry inputs are retained, with no deadline or outcome assertion relaxed.
- Screenshot review found that mobile HUD scrolling hid cash when a speed button gained focus. The responsive correction is checked separately from the earlier full journey artifact.

The final `9a0fef5` receipt also passed development gates, build, translation structure, Pages artifact auditing and Gitleaks history/current/artifact scans. A later label-only correction clarifies that the interim quote forecast includes the proposed commitment and excludes usage; final hosted checks regenerate acceptance for the final PR revision.

### Release gate

The final local `python3 scripts/verify.py release` returned exit 1: `Unreviewed research reference: REF-ac194430f67b3832`. Development source, coverage, mapping, catalogue, evidence, upstream and freshness checks passed. This expected separation is preserved; no readiness flag, research acceptance or exclusion was manufactured to get a release pass.

## Artifact policy and remaining boundaries

Raw screenshots, traces, logs, full saved games and browser installations are outside Git. Durable local artifacts are under `/home/zane-fountylabs/workspace/zefun/soc-runtime-artifacts/provider-rebuild/`; test drivers also print their exact external output paths. Key directories are `final-validation-8c6c281`, `provider-visible-8aed5b2`, `provider-hud-223730d`, `provider-quotes-169c702`, `final-checks-9a0fef5`, `aggregates` (Chromium/WebKit) and `aggregates-b1f30a8` (Firefox). The PR commits code, authored specification/accounting and this compact handoff only. Older committed receipts remain historical and must be regenerated for any new acceptance claim.

The 6–8-person counterbalanced pilot is prepared in the rebuild notes and awaits real participants. New Provider prose is currently English. All 3,454 original mappings, 51 actor records and canonical pending requirements remain preserved; representative family paths do not establish every distinctive feature. No research proposal became an owner-accepted review. Hosted adaptation remains disabled.

The currently published Pages site may precede this branch. Main requires owner review and required checks before merging. Publication of this candidate is a separate preview deployment; the full-release gate continues to enforce the broader source, research and readiness obligations.
