# Playability recovery: candidate and evidence

This document records the recovery slice against the 7 November 2026 review pack. It is a development record, not a release approval. The reviewed baseline was `a4e7e54b5010b2625c2c982607faa279ab9e5524`; the implementation branch starts from that revision. The complete review ZIP was read and its member hashes checked before implementation.

The initial implementation and browser driver are in revision `b1401768a84bb293620b75f3699c41d1da4fda7b`, with the opening viewport correction in `1af63d58f1304b25b33990f0aa05fad4cfd186d4` and the presentation event rules fix in `f45175ab3d376f63e4af49d075b0a260b29ebb68`. The staffing follow-on source revision is `af28b38`; its verification is recorded separately below. Later evidence-only commits must cite the applicable source revision when attributing behavior.

## Implemented in this candidate

| Brief requirement | Implementation | Evidence |
| --- | --- | --- |
| Compare two openings | `SOC.create({experience:'campaign',opening:'win'|'estate'})`; estate purchases Swift through the dispatcher, runs real commissioning, records funded project and posting lineage, and opens with a real queue. The default remains the win opening pending human comparison. | `tests/provider-playability-recovery.test.js`; browser opening controls |
| One complete paid plan | `SOC.provider.quote({action:'plan',…})` quotes all three native stages; one Provider dispatch funds all three on its transaction copy. Stage prices, postings, reservations and delivery remain separate. | Atomicity, duplicate request, stale quote, restore and delivery tests in `tests/provider-playability-recovery.test.js` |
| Persistent recovery objective | A resolved historical incident no longer reopens the completed recovery goal. The current objective distinguishes delivery, active failure, first bill countdown and next customer affordability. | `tests/provider-playability-recovery.test.js`; visible SMB browser journey |
| Contextual response | The incident offers priced repair and mitigation directly. One dispatch acknowledges and funds the chosen operation. Accepting exposure resumes time without declaring service restored. | Scoped response test; visible browser incident journey |
| Responsive controls | Provider owns Space and speed keys while active; the SP handler does not change the other clock. Pointer movement pans continuously, cancellation reverts the drag, wheel zoom anchors to the pointer, and rerender restores focus to the same action. | Browser checks and Provider shell tests |
| Outcome reactions | Authored Orchard reactions are triggered once by retained job, incident or settlement IDs and saved with view preferences. They describe observed outcomes without changing simulation authority. | Browser save/reload inspection; Provider engine tests |

New text was registered in the translation dictionaries. Non-English entries added for this slice are English placeholders awaiting translation review.

## Staffing follow-on candidate

Explicit new SMB openings now opt into a versioned three-period provider-team commitment. Downsizing before the commitment ends is refused by Provider dispatch; increasing the team starts a new 180-minute hold. The team panel shows the release minute and estimated remaining payroll at the current team size. The starting three-person team costs A$900 over its first 180 simulated minutes, so an immediate hire/fire toggle cannot avoid that payroll. Legacy saves without this policy continue under their validated existing rule, and the commitment persists when a new opening advances into later segments.

At source revision `af28b38`, focused engine/shell tests passed 24/24; the uncontended full JavaScript suite passed 2,422, failed zero and skipped two. `npm run evidence` regenerated 857 acceptance cases with zero failures and no changed inputs, and `npm run check:evidence` passed. Source, coverage, translation, build and gate mutation checks passed. Swift desktop/keyboard and Steady mobile/HUD browser journeys passed without source drift (reports `/tmp/soc-provider-gameplay-browser/provider-browser-20261107031818586.json` and `/tmp/soc-provider-gameplay-browser/provider-browser-20261107031945165.json`). The actual stdio Provider MCP smoke passed five journeys (`/tmp/soc-provider-stdio.json`), and pinned browser MCP passed with no source drift (`/tmp/soc-playability-mcp-browser-staff.json/2026-11-07T03-50-11-092235Z/report.json`). A prior browser attempt at `/tmp/soc-provider-gameplay-browser/provider-browser-20261107031612266.json` is invalid evidence because source changed during the run; it also exposed and led to the segment-validation fix. These results do not cover the full Firefox/WebKit journey matrix or the human pilot.

## Verification commands

Run from the exact candidate revision after freezing code:

```text
npm run i18n:check
npm run build
node --test tests/provider-playability-recovery.test.js tests/provider-rules.test.js
npm run test:provider
SOC_PROVIDER_BROWSER_JOURNEYS=swift-desktop,steady-mobile,keyboard-smb-opening,mobile-hud-opening npm run test:provider:browser
npm run evidence
npm run check:source
npm run check:coverage
npm run check:evidence
npm run test:gates
npm run test:provider:stdio
npm run test:provider:mcp-browser -- --mcp-dir /home/zane-fountylabs/.npm/_npx/314abffa6aaf2cd1/node_modules/@playwright/mcp --executable /home/zane-fountylabs/.cache/ms-playwright/chromium-1252/chrome-linux64/chrome --output /tmp/soc-playability-mcp-browser.json
npm audit --omit=dev --audit-level=high
```

Browser recordings, saves and large receipts belong under `/tmp`, outside Git. Scripted timings are automated observations and cannot answer whether first-time players understood the tradeoff.

## Observed candidate run

The scripted Chromium session at source revision `f45175ab3d376f63e4af49d075b0a260b29ebb68` is inspectable in `/tmp/soc-playability-session/transcript.json`, with screenshots in the same directory. It records ten visible activations: Play, Deploy, speed, accept incident exposure, Pause, repair, speed, Pause, Deals, Deploy. The complete Swift plan spent A$6,000 from A$20,000 at minute 0. The first real voice work was delivered at minute 9. A carrier incident paused the clock at minute 19; accepting exposure led to three failed cases by minute 24. The player funded the A$80 repair at minute 24; the incident was observed resolved at minute 27, after four failed cases. The first settlement at minute 60 left A$13,822, and a later plan was purchased at minute 120 with A$8,268 remaining. This records a deliberately delayed response and recovery; it does not show that a novice would make or understand those choices.

The selected Chromium journeys (`swift-desktop`, `steady-mobile`, `keyboard-smb-opening`, `mobile-hud-opening`) passed at that source revision; their report is `/tmp/soc-provider-gameplay-browser/provider-browser-20261107010814767.json`. Scripted Swift reached first real work in 3.48 wall-clock seconds; Steady mobile did so in 5.35 seconds. These timings exclude human reading and decision time. A separate estate-opening browser run recorded three funded, completed Swift stages, a real three-case queue at minute 5, A$14,000 remaining, and no player-earned first-live receipt (`/tmp/soc-estate-opening.json`). Firefox and WebKit mobile purchase smokes each committed the complete paid plan with no page error; WebKit ran in the lockfile-matched Playwright container because host libraries were missing. The actual stdio Provider MCP smoke passed five journeys (`/tmp/soc-provider-stdio.json`).
The pinned `@playwright/mcp` 0.0.84 browser diagnostic passed with no source drift; its report is under `/tmp/soc-playability-mcp-browser.json/`.

`npm run evidence` regenerated 857 acceptance cases with zero failures; its 984 underlying JavaScript tests passed. `npm run check:evidence` then passed against the recorded inputs. `npm run test:gates` passed 125 tests with one skip. `npm run check:source`, `npm run check:coverage`, `npm run i18n:check` and `npm run build` passed. `npm audit --omit=dev --audit-level=high` found zero vulnerabilities. An uncontended `npm test` rerun passed 2,418 tests, failed none and skipped two.

An initial `npm test` run overlapped `npm run check:evidence` and failed only the five-second stdio reply deadline in `tests/mcp.test.js:42` under that concurrent CPU load. The same MCP file passed 7/7 in isolation immediately afterward, and the independent Provider stdio smoke passed. The complete suite then passed without the competing evidence replay; the initial failure remains part of this record.

## Requirement accounting

| Review-pack item | Current disposition | Evidence or remaining check |
| --- | --- | --- |
| Funded estate and first-customer alternatives | Implemented as isolated opening parameter | Recovery tests; estate browser snapshot; Swift and Steady browser journeys |
| Human choice of default opening | Pending external participants | Counterbalanced protocol below; default B is provisional |
| Named objective, progress and next action | Implemented for opening, delivery, recovery, bill and expansion | Recovery tests; scripted transcript |
| Whole-plan order with atomic funding, deduplication and restore | Implemented | Recovery tests and acceptance regeneration |
| Strategy balance across authored variants | Partly evidenced | Swift and Steady complete visible SMB runs; first-time comprehension and broader variant comparison remain |
| Contextual customer board and smaller first decision | Implemented for opening and incident | Desktop/mobile browser journeys; further workload-specific filtering remains |
| Relevant rooms, boundaries, recording, sites and programmes | Existing map paths retained; not newly verified in this slice | Full mission and family visible-control evidence remains in campaign backlog |
| One priced scoped incident response | Implemented | Recovery test and scripted delayed-repair transcript |
| Speed restoration, pointer pan/zoom, focus | Implemented | Shell tests and selected browser journeys; continuous pointer movement, cancellation and late release now have focused assertions in `tests/provider-shell.test.js`. Cross-engine full journeys remain |
| Contract renewal policy | Pending | Requires versioned limits, exception path and suspension |
| Automatic non-choice progression receipts | Pending | Must issue through validated receipt path exactly once |
| Included compatibility checks | Pending | Must preserve validated evidence and manual diagnosis value |
| Outcome callback from durable events | Implemented for Orchard examples | Saved presentation IDs and transcript; human comprehension untested |
| Staffing commitment and hire/fire arbitrage | Implemented for explicit new SMB openings; comparative balance remains pending | Three-period dispatcher refusal, payroll, save/restore and visible team terms in focused tests; Swift/Steady browser journeys |
| Starter price and paid diagnosis relevance | Pending design/behavioural comparison | Must demonstrate useful consequence or remove from primary choice |
| Post-repair fifteen-minute chapter | Pending | Needs two viable strategies and observed fulfilled-promise callback |
| Compatible connection preview and keyboard equivalent | Pending | New preview action and keyboard control tests required |
| Complete browser and deployment matrix | Partial | Chromium selected journeys, Firefox/WebKit purchase smoke; deployment intentionally untouched |
| Human playability and abandonment | Pending external participants | No automated run is counted as human evidence |

## Remaining work and current limits

- Run the first-time-player comparison with real participants. The owner reported on 7 November 2026 that no participants are available yet. Ask each person, without prompting, what they bought, what can fail and what to do next; record confusion, abandonment, activations and elapsed time. Select the default from those results. No human result is claimed here.
- Complete a 15-minute post-repair opportunity with two viable investments and an observed customer callback. The current bill countdown and optional operations do not yet meet this chapter requirement.
- Compare committed staffing and eligible outsourcing against the same authored workload and settlement history; rebalance the term if the first-time-player sessions expose an unhelpful choice.
- Add bounded renewal and receipt policies, including explicit exception handling and inspectable suspension; automate only included compatibility checks whose results are still validated.
- Add compatible connection previews and keyboard equivalent, plus focused mobile and pointer-cancel assertions.
- Re-run all required gates on a frozen revision; preserve any failures. Deployment and externally controlled acceptance changes require their own authorization.
- Review the new English placeholder text in non-English dictionaries before a localized release.

## First-time-player comparison protocol

Use the same scenario seed, costs, workload and settlement contract for both openings, counterbalancing order across 6–8 first-time players. Give only the goal of running a reliable service. Observe the first three choices and first delivered case. After each opening ask, without hints: “What did you buy?”, “What might fail?”, and “What would you do next?” Record answers verbatim, time to first consequential choice and first delivered work, compulsory pauses, detours, confusion and abandonment. Do not treat an automated browser run as a participant.

The facilitator script and row-level recording sheet are in `docs/PLAYABILITY_PILOT.md`. It contains no participant result.
