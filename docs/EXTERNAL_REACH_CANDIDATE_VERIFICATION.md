# External reach candidate checks — 5 November 2026

These results apply to frozen commit `bbcdce7`, before the later storage and transport-observation changes. They do not close the 52 requirements / 159 gameplay assertions or the complete source catalogue.

| Check | Executed result |
| --- | --- |
| Complete JavaScript suite, repository runner with four isolated workers | 1,972 tests: 1,967 passed, three failed, two opt-in skips; 497.2 seconds. No source drift. |
| Registered acceptance recorder | 603 cases passed with unchanged recorded inputs. This registered domain suite is separate from the Provider gameplay assertion ledger. |
| Six affected Chromium journeys | Peak-window Swift and Steady, Enterprise, Defence, external reach desktop and mobile all passed, with no source drift. |
| Actual Provider stdio MCP | Both SMB strategies plus Enterprise, Government and Defence passed, including dispatch refusal and save roundtrip; no source drift. |
| Complete stdio MCP smoke matrix | 94 cases passed, including the extended campaign matrix; no source drift. |
| Gate mutation suite after evidence regeneration | 98 tests ran, with one configured skip and no failures; no source drift. The first run correctly failed while the previous receipt had an outdated input inventory. |
| Dependency audit | Zero reported vulnerabilities for the locked dependencies. |
| Full Git history secret scan | Gitleaks scanned 682 commits and returned 136 findings. Review identified 134 source-input SHA-256 values and two explicitly public IndexNow keys. The raw scanner exit remains 1; no rules, exclusions or history were changed. |

The first attempt to run the entire JavaScript suite in one Node process exhausted its default heap. The result above comes from the repository's normal per-file runner, not a larger-heap relabelling of that failure.

The three complete-suite failures were investigated from actual saved state. The migration preview fixture accidentally selected a digital case as an unaffected voice call. The interoperability fixture allowed its customer to exit before checking the next paid bridge meeting. The autonomy fixture's twelve-minute wait ended in the authored quiet interval before the next actual arrival. The subsequent development slice selects an admitted voice call, funds customer handling cover and renewal, and waits for a real post-exhaustion arrival. The original preview, failed bridge/recovery and failed offline-work assertions remain intact. Twelve affected tests passed; a fresh complete suite remains required for that changed candidate.

The acceptance input inventory is also extended in the following slice to hash the recently introduced runtime helpers and inspectors. A regenerated receipt alone does not prove a previously omitted helper was tested, and the 603 registered cases are not presented as Provider assertion closure.

Large reports remain outside Git:

- `/tmp/soc-external-candidate-checks/full-js-isolated.json`
- `/tmp/soc-external-candidate-checks/registered-acceptance.json`
- `/tmp/soc-external-candidate-checks/gate-mutations-regenerated.json`
- `/tmp/soc-bbcdce7-affected-browser/provider-browser-20261105045218051.json`
- `/tmp/soc-bbcdce7-stdio.json`
- `/tmp/soc-external-dependency-audit.json`
- `/tmp/soc-bbcdce7-gitleaks-review.json`

Full browser matrices, current-candidate long play, deployed behavior, the human pilot and the remaining progression/mission engineering remain outstanding. No public publication or research approval is claimed.
