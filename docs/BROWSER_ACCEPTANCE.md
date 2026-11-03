# Browser and MCP acceptance

> Access-restored continuation: genuine history, independent repository and locked local dependencies are now established; real browser smoke and actual browser MCP runs have executed. The historical limitations below are superseded only where fresh receipts in [the continuation evidence](../evidence/access-restored-2026-11-04/README.md) demonstrate it. Full product/release readiness remains incomplete.

The access-restored environment supports listeners and actual browser MCP. Full release acceptance remains separate from the bounded browser receipts. A configuration example or DOM rehearsal is not a browser result.

## Three independent interfaces

1. `npm run test:mcp` drives the actual communications and SP stdio MCP servers. These are gameplay APIs; they do not render a real browser.
2. `npm run test:browser` checks the served artifact, including offline reload, tab ownership, keyboard input and administration surfaces.
3. `npm run test:browser:campaigns -- --browser chromium` exercises the 48 compact scenario/jurisdiction/mode reference paths at three viewport sizes, followed by outage and recovery. Add `--journey campaign` for the current longer campaign recipes: prerequisite tracks, observed service windows, injected incident and recovery, required offer orders, provisioning, three billing periods and renewal. Repeat both journeys with `firefox` and `webkit` once the matching browser binaries and locked Playwright are installed. `--list` is read-only; `--limit 1` is a diagnostic, never full acceptance. The longer recipes cover implemented campaigns; they do not satisfy the remaining source-specific gameplay obligations.

The campaign driver uses `scripts/lib/campaign-journey.js` for deterministic public commands and checkpoints and `scripts/lib/campaign-ui.js` to map commands to visible controls. It does not inject a completed state or invoke dispatch through page evaluation. Direct-kernel tests exercise all jurisdictions and modes; a DOM rehearsal follows the visible controls. Neither result is a real-browser execution. The same recipes can be checked through actual gameplay MCP with `python3 scripts/mcp-smoke.py --campaigns --output <receipt.json>`.

Run clean `npm ci` without external `NODE_PATH` before release checks. Capture installed dependency and browser versions. A runtime/lockfile mismatch, missing browser, denied listener or incomplete matrix cannot establish acceptance. The browser campaign runner retains timestamped reports, screenshots, traces, input hashes and an artifact manifest under `evidence/browser-campaigns/`; it does not replace the canonical release receipt.

## Browser MCP setup and exploration

The [MCP client example](../maintenance/mcp.example.json) expects the repository root as its working directory. It includes the two gameplay servers and a separately pinned browser server. The pin `@playwright/mcp@0.0.84` was read from the [official source package manifest](https://github.com/microsoft/playwright-mcp/blob/main/package.json) during this implementation session. Registry resolution, its independent Playwright 1.65.0-alpha-2026-10-30 dependency, actual startup and bounded browser exploration are now retained in the access-restored evidence. Native Codex also connects the configured server. Do not substitute a floating `latest` installation and report it as the pinned run.

The [official Playwright MCP documentation](https://github.com/microsoft/playwright-mcp) documents isolated profiles, session output and the opt-in network controls used by the example. Keep an isolated session open through save/reload and offline checks; closing it discards its in-memory profile. This example does not modify global client settings or make tools available to an already running session.

Start `npm run serve` in a permitted environment, connect the browser MCP client, and navigate to the printed origin at `/series-of-calls/`. Use visible links, buttons, fields and the accessibility tree. Inspect state only to corroborate observations; do not assign simulation state or invoke a reference solution through page evaluation to claim a UI playthrough.

For each full campaign, record new-game setup, procurement/eligibility, provisioning, observed service, a meaningful failure, diagnosis, repair, billing and renewal. Repeat jurisdiction-specific branches and alternative valid designs. Check compact reference exercises separately; they cannot satisfy missing full-campaign obligations. Review all six illustrations and every administration family at desktop, mobile portrait and landscape sizes. Check keyboard focus, screen-reader labels, visible errors, navigation, console/network failures, two competing tabs, worker fallback, save/import/reload and offline reload after cache installation.

Export screenshots and session traces with the tested source/artifact hashes. Record every failed or blocked step. Convert discovered defects into repeatable regression tests, fix them and rerun the affected paths. Required full-browser and full-campaign evidence remains pending until all those paths actually execute successfully.

## Complete matrices with bounded shards

The serial full-campaign attempts exceeded the unchanged 30-minute run deadline. The runner now supports deterministic `--shard i/n`; each shard is explicitly partial and can only report `shard-passed`. Case limits remain 240 seconds for campaigns and 60 seconds for compact paths. A default shard run has 20 minutes, with the original 30-minute maximum. No deadline or scenario is waived.

For each engine and journey, run every shard using the same source and locked browser build, then aggregate the exact report paths:

```bash
npm run test:browser:campaigns -- --browser chromium --journey campaign --shard 1/12
# Repeat through 12/12, then provide all twelve generated report paths:
node scripts/aggregate-browser-campaigns.js --output evidence/campaign-aggregate.json <shard-report-paths>
```

The aggregator requires all 144 distinct scenario/jurisdiction/mode/viewport cases, matching input/lock/browser/artifact hashes, exact shard assignment, successful checkpoints and zero errors or drift. It verifies retained screenshots/traces and hashes current inputs before emitting a full pass. Repeat independently for Chromium, Firefox and WebKit and both compact/campaign journeys. Failed attempts remain alongside any explicit rerun. Large traces are retained locally and hash-indexed in receipts; they are not silently discarded or committed as multi-gigabyte blobs. These matrices cover implemented recipes, not all remaining source-specific requirements.
