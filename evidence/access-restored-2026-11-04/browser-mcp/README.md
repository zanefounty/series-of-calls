# Actual browser MCP diagnostics — 4 November 2026

The executable runner is `scripts/browser-mcp-smoke.py`. It launches an actual pinned `@playwright/mcp@0.0.84` stdio process, negotiates MCP, retains its tool schemas, and drives the served application through browser click, form, keyboard, tab, file-upload and network-state tools. `browser_evaluate` assertions inspect state; the only browser-global changes instrument Worker messages and inject a Worker-construction fault. No simulation state is injected and no SOC dispatcher/reference solution is called by evaluation. The export tool uses Playwright through the MCP code tool to click the visible export button and retain its actual download.

The server's own dependency is `playwright-core@1.65.0-alpha-2026-10-30`; Chromium is revision 1252, version 157.0.8103.15. This is separate from app `playwright-core@1.56.0`. MCP launch uses the matching explicit executable path because the default Chrome channel is not assumed installed. The runtime tool schema includes `browser_network_state_set` when `--caps network` is supplied even though the CLI help's capabilities summary omits `network`.

The diagnostic builds a separate temporary artifact and serves `/series-of-calls/` on an ephemeral loopback port. Each receipt records exact source and artifact hashes, actual transport calls/results, browser screenshot/session files, timestamps and source drift. It never writes the canonical release browser receipt or sets readiness. A pass is bounded SMB UI acceptance, not the full campaign matrix, source conversion, publication acceptance or a native-client `/mcp` connection claim.

Run from the repository root with the resolved pinned installation and its own browser binary:

```sh
rtk python3 scripts/browser-mcp-smoke.py \
  --mcp-dir /home/zane-fountylabs/.npm/_npx/314abffa6aaf2cd1/node_modules/@playwright/mcp \
  --executable /home/zane-fountylabs/.cache/ms-playwright/chromium-1252/chrome-linux64/chrome
```

## Retained attempts

- `2026-11-03T21-34-55-540451Z`: runner transport failure before checks. MCP sends legitimate notifications; the initial client inherited a stricter gameplay-only assumption. The runner was corrected to retain notifications.
- `2026-11-03T21-35-20-581508Z`: 15 checks passed with no source drift. Includes initial Training entry, invalid configuration rejection/repair, provisioning, assessment, keyboard topology, Worker-construction fallback, competing tab, exact save/reload, offline reload and three viewport widths. No console errors were observed. This earlier script did not yet instrument successful Worker messages or assert export/import/replay.
- `2026-11-03T21-36-34-233507Z`: reproduced a product defect after 10 checks. A valid import following an invalid one retained `SCT.error`, leaving the old failure visible. The coordinator repaired the successful-import handler; this failing receipt remains unchanged.

The mobile screenshot from the 15-check run was visually inspected: title, illustration, exercise controls and import/export fit the 390-pixel viewport. Other consoles and all six illustrations require their separate broader acceptance.

- `2026-11-03T21-37-42-957927Z`: all 22 expanded checks passed after the import handler repair, including actual Worker message observation, export/import, invalid-import preservation/recovery and deterministic visible-control replay. Receipt is correctly `diagnostic-source-drift`: `55-communications.js` and `72-customer-needs-ui.js` changed during the run. The built artifact hashes remain recorded; rerun against frozen source for a current no-drift result.
