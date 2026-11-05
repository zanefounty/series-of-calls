# UC/CC integration candidate checks — 5 November 2026

These are executed engineering checks of named local candidates, not acceptance of the full gameplay rebuild or source catalogue. The 52-requirement / 159-assertion accounting remains open. Large reports, screenshots, traces and saves remain outside Git.

| Candidate | Executed check | Result and boundary |
| --- | --- | --- |
| `25e9899` | Complete JavaScript suite | 1,927 tests: 1,923 passed, two failed, two opt-in skips. Both failures concerned a disabled Defence phone created after its initial commissioning deadline. Source hashes were unchanged during execution. |
| `e109e16` | Defence commissioning fix | 22 configuration, campaign and mission tests passed. A delayed customer starts with an unpaid disabled phone pending its next tick; supported older disabled pending saves remain restorable. This focused pass does not replace the final complete-suite rerun. |
| `25e9899` | Training/map browser check | Chromium passed at 1366×768, 1440×900 and 390×844, including offline reload. Source hashes were unchanged. |
| `25e9899` | Existing-cache upgrade | Actual service-worker update replaced the old same-version cache. Root and index reloads worked offline and existing paused Provider and Training saves were preserved. Source hashes were unchanged. |
| `25e9899` | Long-play and channel-history checks | Four tests passed, including 2,001-minute service continuation and twenty customers over a further 10,000 simulated minutes. Source hashes were unchanged. |
| `aa81a97` | Four product browser journeys | Microsoft contact centre, Cisco contact centre, Cisco meeting interoperability and Cisco dedicated UC passed. A fifth UC/CC journey exposed an inspector covering a map project. Source hashes were unchanged. |
| `a18f8e4` | Inspector fix and UC/CC browser journey | 21 focused UI tests passed. A fresh Chromium UC/CC journey passed, including explicit integration testing, recorded real work, a paid quality review, product replacement and a paid retest. Source hashes were unchanged. |

The twenty-customer window ran from minute 3,429 to 13,429. It offered 80,100 cases, completed 80,078, failed two, and increased open cases from 40 to 60. It recorded 166 further settlements, an incident activated inside the measured window and its funded repair. The resulting save occupied 6,547,940 characters; restored and actual worker continuations matched for 60 additional minutes. These results apply to `25e9899`, before the subsequent external-reach workload revision.

The inspector repair keeps the selected customer and camera when the panel closes. Project and path inspectors expose translated close controls. Browser drivers use ordinary visible summary and close controls; they do not force pointer events through panels or mutate simulation time.

Local report locations:

- `/tmp/soc-candidate-checks/full-js.json` and `long-soaks.json`
- `/tmp/soc-25e9899-canonical/browser.json`
- `/tmp/soc-25e9899-cache-upgrade/report.json`
- `/tmp/soc-aa81a97-family-browser-parent/provider-browser-20261105040253166.json`
- `/tmp/soc-inspector-fix-uc-cc/provider-browser-20261105041323635.json`

Fresh checks remain necessary for later candidates, including the external-reach revision, complete browser/transport matrices, registered acceptance and release gates. No human pilot, protected public deployment or research approval is claimed here.
