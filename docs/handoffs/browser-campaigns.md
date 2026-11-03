# Browser campaign matrix handoff

## Coverage boundary

`scripts/browser-campaigns.js` is a bounded Playwright runner for the compact `SOC.reference` journey. It covers four scenarios × four jurisdictions × three modes × three viewport sizes (144 browser cases by default), using real toolbar selections, console forms, clock controls, journey submission, and resource fault/repair buttons. A row passes only when the reference journey passes `SOC.assess`, a synthetic outage makes the next assessment fail, and repair plus a new journey makes `SOC.assess` pass again. It does **not** open and assess all four campaign windows, complete the campaign award chain, or establish full campaign acceptance.

The runner reads `SOC.reference(state)` only to obtain the command sequence. It maps `configure` to the selected resource form, `advance` to visible minute/five-minute clock buttons (including every 1–4 minute remainder click), `interact` to the typed journey form, and `meeting` / `connect` to their visible controls. It replays the reference sequence without adding setup commands, then requires `SOC.assess` to pass; the contract test checks this for all 48 profiles and verifies Government does not need an Information pack. It does not assign simulation state from page code. The browser status and report distinguish blocked prerequisites, failed rows, diagnostic partial or dependency-mismatched runs, and fully passed compact coverage.

## Run and diagnose

Parent integration should add `test:browser:campaigns` with the command below. Playwright uses the locked `playwright-core` dependency. Chromium is the default; Firefox and WebKit can be selected, and `SOC_BROWSER_PATH` can point to an installed executable.

```sh
rtk node scripts/browser-campaigns.js --list
rtk node scripts/browser-campaigns.js --browser chromium
rtk node scripts/browser-campaigns.js --browser firefox --limit 2
```

`--list` is read-only and prints the requested profile matrix without building, launching, or listening. A full execution defaults to the 48 profile combinations and is capped at 30 minutes (20 minutes by default). `--limit 1..48` supports bounded diagnosis; a limited run cannot be interpreted as full matrix coverage.

The runner builds into a unique temporary directory, serves that build on a loopback ephemeral port, then writes one report under `evidence/browser-campaigns/<run-id>/`. It records source-input hashes, package-lock hash, built artifact hash/version, a separately hashed artifact manifest, Node and Playwright versions, browser version, per-case result, screenshots, traces, page/console errors, and exact blocked/failed stage. It re-hashes source inputs after the run and fails if they drift. A limited run is explicitly marked partial, and a runtime Playwright version different from the lockfile is diagnostic rather than passed. Any failed screenshot, trace, page error or console error fails that browser row. It never edits `evidence/browser.json`. If socket policy, executable availability, or another prerequisite blocks execution, the command exits 1 and records `status: blocked`; that is not browser acceptance. No browser-MCP capability was available for this run.

## Verification

The contract suite checks all 48 profile combinations, derives every reference command from the real module, verifies clock decomposition and result rules, and rehearses a real console form submission through the assembled UI handler and `SOC.dispatch`:

```sh
NODE_PATH=/home/zane-fountylabs/workspace/fountry/node_modules rtk node --test --test-isolation=none tests/browser-campaigns-contract.test.js
```

Run a real browser pass only in an environment that permits local loopback serving and has the selected browser installed. Review the generated screenshots, traces and page errors before drawing conclusions. The suite is a compact browser exercise and must not be reported as full campaign completion.

The current managed session denied loopback bind with `listen EPERM` before a browser launched. Its latest blocked diagnostic is `evidence/browser-campaigns/2026-11-03T19-27-00-008Z-0a47a3/browser-campaigns.json`; it records source hashes, partial `--limit 1` scope, both workspace Playwright 1.62.1 and locked 1.56.0 versions, and the built artifact plus separately hashed manifest. No browser was launched, screenshots/traces were not produced, and no browser pass is claimed. This also leaves `evidence/browser.json` untouched.
