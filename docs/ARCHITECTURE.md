# Series of Calls architecture

Reviewed against the local runtime on 4 November 2026. See [the documentation index](README.md) for implementation, research and verification workflows.

Series of Calls is a browser based communications configuration training preview. The executable application is an incomplete foundation, not the complete conversion described by the [versioned specification](../spec/README.md). Runtime behavior, source mappings, and acceptance records have different scopes; a passing test for a bounded mechanic does not complete its source requirement.

The page also retains an optional physical network sandbox adapted from Series of Tubes. It is a separate game mode with its own state and save format. Communications training is the primary application surface and uses the SOC runtime described below.

## Communications runtime

The training console is assembled into the same static page as the optional sandbox. Its implementation is divided between the browser renderer, a root simulation kernel, and optional domain packs. The pack modules are plain JavaScript factories whose exported `source()` functions serialize the same implementation into the worker; browser, direct module tests, and worker execution therefore share the same rules.

| File or directory | Role |
| --- | --- |
| `src/game/55-communications.js` | Root SOC kernel: state creation, validation, shared command dispatch, minute advancement, calculations, restore and worker source. |
| `src/game/26-*.js` to `54-*.js` | Versioned domain packs and the root of the pack dependency graph (see the module map below). Each exposes its implemented API and content version. |
| `src/game/70-*.js` to `96-*.js` | Administration and training panels. Controls submit typed commands through the shared SOC dispatcher. Rendering and inspection are read-only. |
| `src/game/97-training.js` | Training console, browser persistence, worker advancement, resource panels and interactions between the optional packs. |
| `src/index.html`, `scripts/lib/page.js`, `scripts/build.js` | Static page shell, include assembler and build. The build produces the page in `_site/`. |
| `scripts/calls-mcp.js` | Local MCP server for communications exercises. See [MCP.md](MCP.md). |
| `spec/`, `research/`, `content/`, `evidence/` | Versioned requirements and source records, content snapshots, and acceptance evidence. These are not all runtime features. |

### State and commands

`SOC.create()` creates a root state identified by `app: "series-of-calls"`, `pack: "soc-foundation-1"`, and `v: 1` (the root schema version). The initial profiles are the fictional scenarios `smb`, `enterprise`, `government`, and `defence`; jurisdiction profiles are `AU`, `US`, `JP`, and `EU`. These profiles are simulation inputs, not statements of legal approval or vendor certification.

The root state owns a synthetic clock, configuration resources, interactions, cases, records, accounting ledgers and optional pack state. Resource configurations distinguish desired values, provisioning state, effective values and observations. Pack-specific state is attached only when the pack is started or used. `SOC.calculate(state)` derives read-only observations; it does not advance the clock or mutate the supplied state.

All mutations go through `SOC.dispatch(state, command)`. The dispatcher validates the existing state and the command shape, applies the command to a copy, checks the resulting state, and returns a new state. Core command types include `configure`, `add`, `advance`, `interact`, `fault`, `connect`, `meeting`, `migrate`, and pack commands such as `calling`, `operations`, `channels`, `boundaries`, `campaign`, and `portfolio`. Inspect the dispatcher and owning pack for exact command fields; MCP inspection exposes selected schemas and summaries, not a complete command-schema endpoint. A pack command is not supported merely because a requirement mentions it.

`expectedRevision` rejects stale updates. `requestId` supports idempotent command replay. Commands and bounded receipts are recorded in the root so that replay and evidence checks can bind to the state change that occurred. Validation is applied on dispatch, import and worker results. Synthetic event traces record modeled decisions and outcomes; they are not real network traffic or external service confirmations.

### Runtime pack map and ownership

The first digit ranges reflect the current file organization, not a promise that every specification area is complete. Packs are opt-in state machines unless the root explicitly installs or invokes them. A pack's `PACK`/version, `validate`, `inspect` or `calculate`, `fingerprint`, and `source` exports describe its implemented contract; not every pack uses every method.

| Module | Runtime responsibility |
| --- | --- |
| `26-customer-needs.js`, `27-speech-models.js` | Editable customer requirements with delayed effective profiles; deployment-scoped local speech installations and integration evidence. |
| `28-product-evidence.js`, `29-managed-operations.js`, `30-media-negotiation.js`, `31-capability-progression.js`, `32-site-operations.js`, `33-calling-achievements.js`, `34-specialist-lifecycle.js`, `35-shared-services.js`, `36-market-qualification.js`, `37-portfolio.js`, `38-admission-security.js`, `39-service-observation.js`, `40-issue-exercises.js`, `41-progression.js`, `42-transport.js`, `43-boundaries.js`, `44-campaign.js` | Optional evidence, management, media, progression, sites, shared calling, market, portfolio, security, transport, boundary and exercise packs. Their outputs are scoped to stored synthetic state and retained evidence. |
| `45-products.js`, `46-outcomes.js`, `47-channels.js`, `48-estate.js`, `49-workforce.js`, `50-calling.js` | Product offers/deployments, customer needs and task results, channel accounts/permission, estate inventory/connectors, roster/coaching, and tenant-aware calling directory/services. |
| `51-contact.js`, `52-information.js`, `53-service-operations.js`, `54-business.js` | Core contact handling, information processing, supplier/carrier/workflow operations, and commercial ownership/qualification. |
| `55-communications.js` | Root state and command boundary, effective resource observation, call/message routing and execution, cross-pack hooks, validation, calculations and minute transitions. |
| `70-webhook-ui.js` through `96-*.js`; `97-training.js` | Typed domain panels and the browser console. UI actions submit commands; they do not write pack state directly. |

The root owns shared resources, clock, interactions, cases, records, traces and operating ledgers. Domain packs keep their own configuration and event/evidence records attached to that root. Core routing calls trusted pack hooks at the decision point: for example, it checks effective carrier and directory state, validates boundary bindings against actual root resources, reserves media and transport paths, and settles security usage against core voice ledger rows. A pack's standalone positive result is not a substitute for the corresponding core integration path.

The portfolio is a separate optional container. It can hold up to twenty independently validated customer roots, each bound to a scenario, jurisdiction, market and tenant. The portfolio has its own clock and journals. A portfolio tick advances each active child root by one synthetic minute. Customer-scoped configuration and workload commands are recorded through `portfolio.dispatchcustomer`; nested portfolio, campaign, progression, market qualification and managed-operations containers are prohibited in child roots. The browser routes most commands to the selected customer while keeping portfolio management, clock advancement, market qualification and managed operations at the portfolio root. Selecting a customer changes which root is rendered; it does not merge tenant state.

### Evidence, current state and saved history

Desired configuration, provisioning, effective configuration and observed availability are separate values. A submitted change may remain pending or fail while the previous effective configuration continues to operate. Root calculations and pack inspections report current readiness and blockers; they do not mutate state.

Evidence is scoped to its producing mechanism. For example, declared boundary flows are evaluated separately from the central runtime's enforcement against actual resource location and availability. Media offers, directional codec agreement and transcoder session capacity are separate from link bandwidth and agent seats. Site continuity evidence must link to actual transport paths, core interactions, faults, backup snapshots and restore receipts. Product-evidence records are fictional availability evidence, not vendor certifications. Progression awards retain historical proof and validate it against saved source records; they remain distinct from current readiness after later configuration changes. Missing, pruned, or incomplete lineage is not reconstructed from a caller-supplied success flag.

### Time and worker execution

`advance` moves the synthetic minute clock and applies due provisioning, workload, delivery, callback, continuity and assessment transitions. Calls, messages, capacity, media, workforce, transport and security checks use modeled state. A blocked or failed interaction remains distinguishable from an accepted, connected, delivered or resolved one.

The training console serializes `SOC.workerSource()` into a worker for clock advancement where supported. The worker executes the same kernel and receives a snapshot plus a command. The UI discards replies from cancelled jobs, closed or unlocked consoles, and replies whose revision no longer matches the current root; a revision mismatch is re-executed once against the current state. Worker creation failure, a browser worker error event or a five-second timeout falls back to synchronous dispatch. A domain error returned in a worker message is surfaced without applying a result. The result is validated before it can replace the browser state. Calculations and panel rendering remain read-only.

### Workforce, allowances and local speech integration

The workforce roster accepts optional non-overlapping break intervals within each person's shift. Effective capacity excludes a scheduled break independently from entitlement, skill and actual availability. Observed presence is a separate available/away/offline value. Roster availability edits provision before changing effective eligibility and cannot overwrite presence. Customer-operated staffing rejects attendance commands; BPO attendance requires its own scoped grant. Public commands cannot call the internal admission/finish hooks, and imported active assignments must match real handling interactions. The attendance panel also estimates skill/language demand from duration-qualified samples and capacity across future shifts/breaks. It assumes current presence and assignments persist; it does not advance a queue or certify a workforce plan. These remain bounded BPO mechanics.

`26-customer-needs.js` holds editable SMB, enterprise, government and defence requirements in the optional `customerNeeds` pack. Employee, seat, agent and room counts are independent. Each revision provisions for one synthetic minute before becoming effective. Segment/source identity is immutable, and observed profile application does not establish measured service, procurement eligibility or capacity. `72-customer-needs-ui.js` exposes the same typed commands as MCP.

`47-channels.js` can create synthetic webhook jobs from actual accepted channel deliveries. The disabled-by-default policy provisions before use; application authentication, application availability and supplier availability are independent observations. Jobs preserve receipt/case lineage and idempotency, use deterministic bounded retries and rate limits, and run only on clock advancement. Terminal failures remain terminal after observation repair. `70-webhook-ui.js` submits policy and observation commands through normal dispatch. No real network request is made.

Business contracts can share a scoped usage allowance in minutes, messages or processor-minutes. Pools provision before use; amendments take effect at the next aligned billing boundary without refilling the current period. The dispatcher meters voice against the recorded route platform, messages at accepted delivery, and processing against the job's actual processor. Supplied resource priority chooses the eligible contract; a missing match never bills an unrelated one. Included retail usage still incurs wholesale cost. Legacy pool fields migrate only on an owned dispatch/restore copy, including portfolio children and campaign snapshots; validation does not mutate caller state.

`27-speech-models.js` is the optional `soc-speech-models-1` pack. The `speech-models` command provisions synthetic versioned model installations and integration-test evidence. Both bind to a product deployment generation, offer, region and exact dependency resources. Compute, permission and licensing resources must be effective; disconnected execution also requires local support and authorization. Product availability and information jobs use those same bindings, so a model for another deployment or dependency cannot satisfy a job. `74-speech-models-ui.js` exposes installation and integration forms through normal dispatch. No external model executes and no real provider support is asserted.

`73-artwork-ui.js` renders the six project illustrations using responsive WebP sources and translated alternative text. Title and campaign panels share this renderer. `artwork/manifest.json` preserves generation provenance and export hashes; the service worker includes the shipped variants. The title's training action is allowed before the optional SP state exists.

### Browser persistence

The training console stores its slot at `series-of-calls:training:<slot>` in local storage. The stored envelope contains `app`, a monotonically increasing `seq`, and the SOC `state`. The console requires the browser's `navigator.locks` API and requests `series-of-calls:training-lock:<slot>`; when that API is unavailable or the slot is already held, editing is refused. A later sequence also prevents a stale writer from overwriting a newer save. There is no heartbeat fallback for the training console. The normal training slot is `main`.

Training exports are JSON states and restore through `SOC.restore`, which validates the application schema. They are separate from optional Series of Tubes saves, which use `soc-sp-save-v1:<slot>` (with `soc-sp-save-v1` as the legacy single-slot migration key) and the older `S` state. One format is not a migration path for the other.

## Optional physical network sandbox

The retained sandbox keeps the original map game and its own state model. It remains available from the page's SP entry point and through the separate legacy MCP server `scripts/mcp.js`; the communications MCP server is `scripts/calls-mcp.js`.

The page assembler concatenates the classic scripts in path order. The optional sandbox's `S` is the network save, `R` is the last traffic computation, and `UI` is view state. Its routing model builds a graph from live links, chooses exits among caches, PNIs, exchanges and transit, applies capacity and preference rules, and derives costs and revenue. Its `compute()` path and worker preserve that game's deterministic traffic calculation. The map, weekly puzzle, weekly scenario, network actions, and their established save migration remain optional SP features; they are not the communications training state or acceptance evidence.

### Existing SP save and translation boundaries

The sandbox's save slots use `soc-sp-save-v1:<slot>` in local storage and retain their existing migration/sanitization path. Its index is `soc-sp-slots`, current tab slot is in `sessionStorage['soc-sp-slot']`, and it maintains a cross-tab heartbeat at `soc-sp-open:<slot>` (used as the lock fallback when Web Locks are unavailable). Its preferences and progress use separate `soc-sp-*` keys, including `soc-sp-prefs`, `soc-sp-weekly`, `soc-sp-scn` and `soc-sp-wkscn`. Do not rename those keys as part of SOC training storage work. Training uses the `series-of-calls:training:` prefix described above.

Both modes use the shared label-based translation system: English labels are in `src/i18n/en.js`, and the five dictionaries are in `site/i18n/`. The communications panels use the same translation lookup but their labels do not establish runtime coverage of incomplete mechanics.

## Build, tests and maintenance gates

`npm test` runs the JavaScript suites. `npm run test:communications` runs the selected communications and integration suites. `npm run build` assembles the static page. `npm run i18n:check` checks label coverage. The Python verification commands are scoped gates for source accounting, catalogue parity, coverage, recorded evidence, upstream accounting, freshness and release readiness; a release gate may remain red while required deliverables are pending.

The repository contains an upstream adaptation workflow, but its generation job currently has `if: ${{ false }}`. It is therefore disabled in workflow code. `scripts/check-agent-ready.py` also fails closed unless the required owner-reviewed setup, credential and current provider-enforced limit receipt are present. Do not describe the workflow as active or infer that the required provider controls have been verified from a workflow file or secret name.

The optional SP workflow and release details remain in `.github/workflows/`; those workflows do not establish that the communications product is complete, that a hosted release has passed its gates, or that real-browser acceptance has run.
