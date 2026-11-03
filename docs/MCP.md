# MCP interfaces

Reviewed against the local implementations on 4 November 2026. See [the architecture](ARCHITECTURE.md) for state and persistence boundaries.

Series of Calls has two separate local MCP servers. Use the communications server for the current synthetic training application. The older Series of Tubes server remains available for the optional physical-network sandbox. They have different tools, state, save formats and storage identities.

## Communications training server

The communications server is `scripts/calls-mcp.js`. It runs over MCP stdio in the local Node.js process and imports the same validated SOC kernel used by the browser. It does not start a browser, access tenant credentials, send vendor requests, or write save files. Its state is held in process memory until exported or the process exits.

Run it directly:

```sh
node /path/to/series-of-calls/scripts/calls-mcp.js
```

For example, a client that accepts a command and arguments can register:

```sh
claude mcp add series-of-calls -- node /path/to/series-of-calls/scripts/calls-mcp.js
```

The package script `npm run mcp:calls` is useful for manual use; MCP clients should launch the Node command directly so npm's status text cannot be mistaken for protocol output.

### Tools

| Tool | Input | Behavior |
| --- | --- | --- |
| `new_exercise` | Optional `scenario`, `jurisdiction`, `mode` | Replace the session state with `SOC.create(...)`, then return calculated observations. Scenarios: `smb`, `enterprise`, `government`, `defence`; jurisdictions: `AU`, `US`, `JP`, `EU`; modes: `guided`, `assessed`, `sandbox`. These are fictional training profiles. |
| `inspect` | None | Return the current state, read-only calculated observations, catalogue and selected optional pack/profile summaries. Some pack schemas are included, but this is not a complete schema for every root or pack command. It does not advance time. |
| `command` | Required `command` object | Apply a command through `SOC.dispatch`, then return the resulting state and observations. The command uses the same validated interface as the browser console. |
| `export_exercise` | None | Return the current root state as JSON data. It does not write a file. |
| `import_exercise` | Required JSON string `json` (up to 8 MB) | Restore through `SOC.restore`; invalid or unrelated saves are rejected. |

The initial session contains a fresh `smb` / `AU` / `guided` SOC root. `new_exercise` replaces it. The MCP server does not expose `eval`, filesystem paths, direct DOM access, browser storage, or direct mutations that bypass the dispatcher.

### Commands

Pass an ordinary SOC command object to the `command` tool. The root dispatcher validates command keys and state before applying the operation. Supported root types include `configure`, `add`, `advance`, `interact`, `fault`, `connect`, `meeting`, `migrate`, `restore`, and domain pack commands. Domain commands use a nested `command` object, for example:

```json
{"type":"advance","minutes":1,"expectedRevision":0}
```

```json
{"type":"calling","command":{"action":"start"}}
```

Use `inspect` to read state, observations, catalogue entries and the pack summaries it exposes. It does not publish a complete command schema; consult the versioned specification and the current module command validators for exact supported fields. `expectedRevision` protects against stale commands; `requestId` can make a command retry idempotently. A rejected command returns an MCP tool error with the validation or domain reason. `advance` moves the synthetic minute clock; it does not wait in real time.

The command surface is bounded by the currently implemented runtime packs. A pack named in the specification but absent from the current SOC dispatcher is not available through MCP. The AU/US/JP/EU profiles and any modeled supplier, product or service evidence are synthetic and do not assert legal approval, vendor certification, or a real external service response.

### Save handling

`export_exercise` returns the validated SOC root state, not a browser training-slot envelope. Copy that JSON if it needs to survive the MCP process. Pass the JSON string to `import_exercise` in a later process. Import validates the state using `SOC.restore`; it is not the legacy ISP save importer.

The browser training console stores its slots separately at `series-of-calls:training:<slot>` in local storage. MCP does not read or write those slots. The optional SP game uses a different older save format and key.

### Implementation and checks

Run `npm run test:mcp` to exercise both actual Node MCP processes over stdio. The Python driver runs the 48 combinations of four compact scenarios, four jurisdiction profiles and three modes, comparing each reference solution against direct dispatch and checking initial failure, invalid-command atomicity, pure inspection, export/import, foreign-save rejection and replay. It also buys connectivity through the SP game's quote buttons, advances time and checks save restoration. Two further cases check speech-pack discovery/prerequisites and shared-allowance usage, then customer profiles, observed attendance and webhook policy provisioning. The default is therefore 51 cases. Results and input hashes are written to `evidence/deployment-review/mcp-smoke.json` unless `--output` selects another path.

`python3 scripts/mcp-smoke.py --campaigns --output <receipt.json>` adds twelve sequences spanning all four implemented campaign tracks for each jurisdiction/mode combination (63 cases total). These sequences use actual stdio commands for service evidence, incident recovery, procurement, activation, three billing periods and renewal, comparing final state with direct dispatch and testing save restoration. They remain bounded implementation evidence; source-specific campaign fidelity and real-browser acceptance are separate obligations.

Both servers validate their JSON-RPC envelopes and published tool-argument shapes. Invalid requests receive protocol errors; domain/tool failures are returned as tool errors. An id-less message never executes a mutating tool. Supported protocol versions are negotiated during initialization. The SP adapter reports the initial customer level consistently before and after a save round trip.

- `scripts/calls-mcp.js` implements the five-tool JSON-RPC stdio server and calls `55-communications.js`.
- `src/game/55-communications.js` owns SOC creation, validation, dispatch, restore and observation; domain packs are implemented in neighboring `src/game/` modules.
- `tests/calls-mcp.test.js` exercises the communications MCP handler, shared dispatch, protocol validation and save atomicity (AC-SOC-353–357).
- `tests/sp-mcp-protocol.test.js` and `tests/mcp-state-roundtrip.test.js` cover SP request validation and save/status consistency (AC-SOC-358–361). The inherited `tests/mcp.test.js` retains its actual stdio and gameplay assertions.
- `tests/calls-offline.test.js` separately checks the project-scoped service-worker cache in a simulated environment; it is not MCP or real-browser offline acceptance.
- `tests/communications.test.js` and the selected suites in `npm run test:communications` exercise the shared dispatcher and communications behavior.

## Optional Series of Tubes sandbox server

The older optional physical-network game still has a separate server at `scripts/mcp.js` and package command `npm run mcp`. Register it with a distinct client name if needed:

```sh
claude mcp add series-of-calls-sp -- node /path/to/series-of-calls/scripts/mcp.js
```

This server starts the network game and offers its own tools: `new_game`, `load_save`, `export_save`, `status`, `advance`, `network`, `city`, `find`, `traceroute`, `peering_check`, `hot_spots`, `schema`, `catalog`, `state`, `results`, `ui`, `actions`, `act`, `screen`, `panel`, `click`, and `open_link`. Its `load_save` and `export_save` tools can read or write paths supplied to that optional server. It is not the communications MCP API.

SP saves use `soc-sp-save-v1:<slot>` and their existing migration path; the SOC browser console uses `series-of-calls:training:<slot>`, while the communications MCP process exports and imports validated SOC state explicitly. Do not interchange these data formats or refer to either server by the old upstream-only `seriesoftubes` identity.

## Browser MCP and new pack verification

Use the separate [browser acceptance workflow](BROWSER_ACCEPTANCE.md) for browser MCP, the served-origin smoke runner and the full exercise matrix. [The client configuration example](../maintenance/mcp.example.json) describes the two gameplay stdio servers and a separate Playwright MCP server. It is a configuration example, not evidence that a browser connection is installed or active.

The communications `command` tool accepts the same `business` allowance, `workforce` roster and `speech-models` commands as the UI. A speech pack requires Products and Information to be started first. Desired submission, effective installation and observed processing remain separate. Save import applies explicit legacy business migration on its owned parsed copy; rejected imports/commands retain the running session.

`inspect.packs.customerNeeds` exposes the customer-profile pack version and four source rows. The `customer-needs` command starts, selects and edits profiles; it does not purchase services. Workforce inspection lists observed presence states, while attendance mutations require the same operating authority as the UI. Internal workforce admission/finish operations are unavailable as public commands. Channel webhook policy is configured through `channels`, and its observations remain synthetic.

`npm run test:browser:campaigns -- --list` lists 48 exercise/profile/mode cases. A complete run visits all three viewport sizes with the selected browser; run each of Chromium, Firefox and WebKit where available. The driver records browser errors, traces, screenshots and hashes, and distinguishes limited or mismatched-dependency diagnostics from complete execution. Contract tests prove runner behavior only. Neither gameplay MCP nor a DOM test proves real browser/offline acceptance.
