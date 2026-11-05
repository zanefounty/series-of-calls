# Gameplay acceptance reconciliation — 5 November 2026

The [159-assertion ledger](GAMEPLAY_REBUILD_ACCEPTANCE.json) now records **86 exact assertions verified, 69 pending and four parked**. These are assertion-level results, not certification of the whole gameplay rebuild or source catalogue. The original assertion text, source hashes and `statusPolicy` remain unchanged.

| Phase | Verified | Pending | Parked |
| --- | ---: | ---: | ---: |
| 1 — authority and foundations | 21 | 7 | 0 |
| 2 — service truth and SMB | 11 | 10 | 0 |
| 3 — map and interaction | 8 | 16 | 0 |
| 4 — strategy and growth | 14 | 7 | 0 |
| 5 — missions and ecosystem | 27 | 13 | 0 |
| 6 — compatibility and delivery | 5 | 16 | 4 |

The [hosted test run](https://github.com/zanefounty/series-of-calls/actions/runs/42001530928) executed 2,044 tests: 2,042 passed, none failed and two opt-in long-play tests skipped. It checked GitHub merge commit `cd97b30e42303e680661065d474efb877538b6fa`, whose tree is exactly the candidate `e49234902abb3f273aad8645baad1ef0766389d1` tree (`0026236cfc04e506b6c56da8dffb3520149b6dcf`). Each current test reference identifies its exact name, source file, hosted job and log line; the run records source-file and raw-log hashes. A passing test may support an open assertion without satisfying all its clauses.

Fresh Chromium, Firefox and WebKit receipts each passed four journeys on `e941945`: Cisco interoperability, Government Level 6 on desktop/mobile, and two-customer Level 5. All 363 recorded application/browser input hashes match `e492349`; only the publication workflow and its test changed. This is scoped reuse of exact tested inputs, not a claim of a fresh browser run on the later commit. The receipts preserve source manifests, screenshots and actual steps outside Git. Independent review confirmed the mobile quote heading now wraps without clipping.

The [protected preview publication](https://github.com/zanefounty/series-of-calls/actions/runs/41996975908) deployed **eb0e88**, an earlier application candidate. Public-origin verification matched the downloaded artifact's HTML, worker and version hashes; upgraded an actual persistent old cache; loaded both root and `index.html` offline; preserved separate paused Training and funded Provider saves; and delivered actual paid Provider work. This does not establish deployment or offline upgrade of the later `e492349` application bytes. The full product release gate remains separate and unchanged.

The earlier 78-closure proposal was reviewed rather than copied. Several entries remain open because the linked proof was narrower than the assertion—for example, a mandatory voice floor does not establish preservation of every emergency or information-boundary requirement. New exact closures use executed state transitions, quote comparisons, scope validation, and applicable visible steps. Lab-only failure probes are labelled by their named tests and do not establish Provider fault-authoring controls.

Remaining work includes 20 of the 32 canonical Provider progression adapters and their useful earned choices; complete current mission/family/Training and accessibility evidence; visible bill reconciliation; save/ownership corner cases; and source-specific mapping obligations. An identified presentation gap remains: unearned managed local spares are hidden from contextual actions instead of showing a prerequisite explanation. Actual human participation remains pending under the prepared [pilot protocol](GAMEPLAY_PILOT_PROTOCOL.md). The four long-play assertions remain parked at the owner's request, with no new run or exclusion inferred.

Raw local evidence includes `/tmp/soc-e492349-hosted-logs/`, `/tmp/soc-e941945-{chromium,firefox,webkit}/`, `/tmp/soc-e492349-browser-input-equivalence.json`, and `/tmp/soc-public-main5d9f6c0-connected2/verify-report.json`. The ledger records hashes and durable hosted-run URLs; large logs, saves, traces and screenshots are not committed. Subsequent source changes require affected verification and a new reconciliation. No research acceptance, source exclusion, legal approval or complete-conversion claim is made here.
