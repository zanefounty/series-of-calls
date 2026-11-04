# Upstream and fork research — 4 November 2026

The owner requested investigation of [SeriesOfTubesAU](https://github.com/thesysadmindev/SeriesOfTubesAU) and ten leading [Series of Tubes forks](https://github.com/fjaeckel/seriesoftubes/forks), followed by compatible implementation and gameplay verification. The complete GitHub fork-list snapshot contained 39 forks, all with zero stars; selection therefore uses latest push time, with name as a deterministic tie-break. The named Australian adaptation is included separately and is not in that GitHub fork list.

- [Pinned catalogue and ranking](catalogue.json)
- [Ten-fork branch, gameplay and test review](top-ten.md)
- [Australian adaptation and existing SOC overlap](australia.md)
- [Executed fork test slices](executed-tests.md)
- [Upstream testing techniques and executed upstream suite](testing.md)

Default-branch syncs are distinguished from original feature branches. A source test pass does not establish Series of Calls compatibility. The current source-pack bytes, canonical research acceptance and upstream dispositions remain unchanged. This survey is not an owner acceptance of the earlier 91 research references.

## Implementation contracts

| Candidate | Adaptation and scope | Verification required |
| --- | --- | --- |
| Leased-IP revocation | Explicit synthetic 7–60-minute withdrawal on an effective purchased transport link; independent faults remain; renumbering or an alternate path restores service. Lair-us retains its leased-address role. Fork random rarity/day gating remains a separate pending adaptation. | Actual failed/continued/recovered calls; concurrent outages; history, worker, replay, UI and seeded long-play checks. |
| PNI/IX headroom | Pure advice from actual reserved bandwidth, explicit validated upgrade, old effective capacity during provisioning, contract capacity and price bounds. Standing-order autonomous policy remains pending. | Thresholds, saturation, maximums, quote/charge, delayed cutover, rejected-order atomicity and visible control. |
| Australian NNI activation | Existing SOC access contracts already provide delayed capacity and allocation; add tests for upgrade continuity and refusal before effective capacity. | Real calls before/during/after upgrade; immutable failure and no extra charge on refusal. |
| Differential and long-play testing | Fixed-seed command traces with an independent small-graph oracle, mid-run saves, worker comparison and retained-history pruning. | Reproducible failures include seed and command context; raw output stays outside Git. |

The other inspected concepts remain visible in the source reviews: hosting and broadband geography, richer interconnection/world economics, optic selection, route-server/cache corrections, optimization prototypes, cloud synchronization and browser-agent transport. They are not claimed implemented by this stack. Changes to remote save services, authentication or hosted agent execution require their own architecture/governance review; no service or credential is enabled here.

MIT attribution remains with Frederic Jung and the named fork contributors. New SOC code is an independent adaptation; immutable source links identify the original concepts. Generated screenshots, traces, logs, copied builds and duplicate execution reports are excluded from Git.

## Comparison with the current optional SP implementation

Direct implementation inspection found that three surveyed fork concepts are already represented in the retained SP game: route-server peers stay on the route server (`src/game/70-rules/40-peering-desk.js`, `tests/route-server-peers.test.js`); cache sizing and standing orders use normalized per-city traffic through `cacheDem`, including local network exclusions (`src/game/70-rules/95-utilities.js`, `tests/utilities-caches.test.js`); and optic standing orders can select the largest affordable compatible optic (`src/game/60-features/95-standing-orders.js`, `tests/intern-optics.test.js`). The normalized cache implementation is more precise than copying the inspected fork's earlier unnormalized share formula.

These are existing implementation overlaps, not newly added functionality or approved upstream dispositions. Fork-only Git commit identity does not prove a concept is absent locally. The full SOC suite exercises the retained SP tests alongside communications tests. Existing SOC Web Locks and save ownership also address concurrent editing; foreign cloud sync and HTTP browser-agent services remain distinct pending proposals.
