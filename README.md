# Series of Calls

A synthetic communications configuration training simulator, with an optional physical-network SP game inherited from [Series of Tubes](https://github.com/fjaeckel/seriesoftubes).

**Status: incomplete training and campaign preview.** Genuine upstream history is now attached and the independent public repository is [zanefounty/series-of-calls](https://github.com/zanefounty/series-of-calls). Clean locked dependencies and initial real-browser checks pass; complete source implementation, final browser matrices, reviewed governance, hosted protections and publication remain outstanding. The release gate deliberately refuses this build.

The preview provides configuration forms for identity, connectivity, calling, trunks, endpoints, workforce, queues, messaging, workflows, CRM, rooms, recording, archives, processing and local infrastructure. Desired configuration, provisioning, effective configuration and observed readiness are separate. Four small exercises introduce SMB digital service, enterprise calling and rooms, government information handling, and defence disconnection. AU/US/JP/EU selections are fictional exercise boundaries, **not compliance approvals** or complete jurisdiction campaigns.

Calls, messages, traces and records are synthetic. No live telephony or vendor credentials are used. Optional commercial, service-operations and information packs add delegated organisations, typed contracts, financing, carrier onboarding, number ports, delivery retries/receipts, migration cohorts, processing chains, information holds and scheduled rooms. Further optional consoles cover tenant calling policy, individual workforce assignments, discovery/device projects, distinct channel accounts, explicit customer-task outcomes, fourteen initial product-family profiles, two bounded operator-report issue exercises and concurrent customer portfolios, independent packet/signalling/spend controls, sampled service/continuity exercises and bounded candidate progression mechanics across the 13 levels and 19 goals. The assessed campaign sequence has shared-dispatch tests for all four tracks and fictional boundary profiles; the full 13-level/19-goal source progression, catalogue behaviours, richer specialist services, researched jurisdiction rules, full SP/commercial integration and upstream adaptations remain incomplete. See [specification status](spec/README.md) and [pending requirements](spec/generated/requirements.json).

New optional controls cover inbound calling, codec negotiation/transcoding, site continuity and restoration, scoped product evidence, and managed customer changes with typed per-operation billing. Configuration updates and successful submissions still require effective provisioning and observed readiness before they can satisfy service or delivery evidence.

The latest implementation adds scheduled breaks and attendance visibility, scoped shared allowances, resource-bound usage billing, local speech model/integration provisioning and six new illustrations. The [verification index](evidence/implementation-pass-2026-11-04/README.md) records the full 1,277-test JavaScript run and 50 actual stdio MCP cases, with dependency and browser limitations. The [delivery index](docs/DELIVERY_PLAN.md) keeps the remaining full-scope work visible.

## Run locally

Requires Node 24 and Python 3. Install locked dependencies in a network-enabled environment:

```sh
npm ci
npm run dev
```

The development server binds to loopback by default and prints its URL; open it and choose **Communications training**. Saves use separate Series of Calls identities. Original ISP saves are rejected. The console requires browser Web Locks to edit; it becomes read-only when another tab owns the exercise. Training currently has one slot, distinct from SP save slots.

To preview the compiled site at the same project path used for GitHub Pages, run `npm run serve`. It builds first, then serves `http://127.0.0.1:8080/series-of-calls/` by default. Set `PORT` to choose another port. This local server is for preview; it is not a deployed site.

```sh
npm run test:communications
npm run test:mcp
node --test --test-isolation=none tests/training-console.test.js
npm run evidence
npm run check:all
npm run test:gates
npm run i18n:check
npm run build
npm test
```

`check:all` checks development accountability while retaining pending work. `check:release` additionally requires complete acceptance, fresh reviews, upstream adoption and operational readiness. Passing development gates does not establish full semantic coverage.

For real-browser checks, supply an installed Chromium executable with `CHROMIUM_PATH` and run `npm run test:browser` after building. The script serves the compiled project path and exercises service-worker offline reload in desktop and mobile viewports; a successful recorded run is required. Access-restored checks now use locked jsdom 24.1.3 and Playwright 1.56.0. The initial real Chromium smoke passes, including offline reload. For all three engines on Ubuntu 26.04, use the matching Playwright Ubuntu 24.04 container with Node 24; the older pinned app Playwright does not support Ubuntu 26.04 directly. See [the access-restored evidence](evidence/access-restored-2026-11-04/README.md) for exact results and limitations.

The local stdio MCP interface is `npm run mcp:calls`. Its tools create, inspect, export/import and dispatch the same validated commands used by the console. The inherited SP interface remains `npm run mcp`. `npm run test:mcp` exercises both real stdio processes, including the 48 compact exercise/profile/mode combinations and an SP purchase/save/replay flow. See [MCP documentation](docs/MCP.md), the [full-suite review](evidence/deployment-review/FULL-SUITE-REVIEW.md) and [deployment review](docs/DEPLOYMENT_REVIEW.md) for current results and limitations.

## Specification and evidence

- [Specification index](spec/README.md): behaviour, configuration, scenarios and unresolved work.
- [Preserved source manifest](research/source-manifest.json): original bytes, hashes, paths and dates.
- [Complete mapping appendices](spec/appendices/index.md): all 3,454 mappings and original attributes.
- [Implementation evidence](spec/implementation.json): narrowly scoped, tested behaviours.
- [Upstream register](maintenance/upstream/register.json): pinned inventories and pending adoption.
- [Research register](research/generated/references.json): references remain unaccepted until reviewed; observation never automatically changes gameplay.

The imported design and JSON retain all 217 file mappings, review findings, limitations, predicates and references. Generated crosswalks account for 4,839 source items including paragraphs, decisions, 23 historical operator-report observations, 366 upstream commits and 461 historical file versions. A structural link is not a claim that a requirement is implemented.

## Project policies

The owner designated `zanefounty` as the accountable contact and selected GitHub as the contact route. Private security reporting is enabled; public issue intake remains disabled pending the separate governance review. The [contribution guide](CONTRIBUTING.md), [Code of Conduct](CODE_OF_CONDUCT.md), [security policy](SECURITY.md), [third-party notices](THIRD_PARTY_NOTICES.md), and [publishing audit](docs/PUBLISHING_AUDIT.md) document the current boundaries and the publication work still required. The upstream Series of Tubes issue tracker and Signal group are not contacts for this adaptation.

## Repository and maintenance setup

The snapshot was obtained from upstream `da1a4e2f3c9f7fac12c94eefb8d35bd6b1e4ae16` (main after v2.5.0; the release tag points to `15dc5741d4b40ae1517e84834f647ac3e5d1e025`). All 352 acquired text blobs were verified against their Git blob hashes before editing. The six original binary assets are now recovered from exact Git objects into a separate provenance archive, preserving current project artwork. Genuine history was attached using the hydration helper without overwriting the working tree. The subsequent v2.6.0/main reconciliation observes `b7e5f193b424689e3dbdf6e57639b5212e04d5c2` and preserves its complete 349-commit/368-file inventory; adoption and test status are recorded separately in the upstream register.

The history helper has run successfully. `upstream` points to the original repository and `origin` to `zanefounty/series-of-calls`; GitHub confirms the destination is public and has no fork relationship. The latest upstream observation is `b2366ed26018f957309292d04adf5d6e76a89c65`; its 17 additional commits remain pending adoption. Publication target: `https://zanefounty.github.io/series-of-calls/`.

Weekly upstream and monthly reference observation workflows are prepared. Separate trusted jobs validate observation-only artifacts and propose owner-reviewed persistence PRs; their hosted execution remains unverified. The Codex adaptation workflow is deliberately disabled. Its API project, enforced US$25 monthly limit, runtime/model pins, trusted limit attestation, owner review, required checks and release protection must be configured and verified before enabling it. Provider enforcement can slightly overshoot a monthly limit.

## Attribution

The inherited static build and physical-network game derive from Series of Tubes by Frederic Jung. Its [MIT license](LICENSE) is preserved byte-for-byte. Original upstream documentation and a pinned upstream snapshot are retained under `maintenance/upstream/`; genuine Git history has not been attached. This adaptation is independent and does not imply upstream endorsement.

The [third-party notices](THIRD_PARTY_NOTICES.md) explain the limits of the preserved attribution and research records. The application code is MIT licensed. Supplied research is retained as a source pack; citations and third-party excerpts preserve their source attribution and do not relicense the external works they reference.
