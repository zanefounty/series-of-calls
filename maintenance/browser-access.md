# Browser access investigation — 2026-11-03

WSLg 1.0.73.2 and X11/Wayland display sockets are installed. The session exposes DISPLAY=:0 and WAYLAND_DISPLAY=wayland-0. Socket access to both displays returns EPERM. AF_INET creation is also denied by the execution sandbox.

Installed Chromium: `/home/zane-fountylabs/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`.
Separate headless shell: `/home/zane-fountylabs/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`.

Both were tried through Playwright. Full Chromium stopped in crashpad socket setup with EPERM/SIGTRAP. The headless shell stopped at `content/browser/sandbox_host_linux.cc:41` with `shutdown: Operation not permitted`. No screenshot or successful real-browser acceptance resulted. DOM tests are separately identified and cannot establish browser rendering, keyboard usability or offline operation.

Microsoft's [WSLg guide](https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps) describes X11/Wayland GUI support. Playwright's [browser documentation](https://playwright.dev/docs/browsers) distinguishes its full Chromium and separate headless shell. Installing WSLg again does not resolve the observed denied socket operations.

No supported local-browser connector was available. A cloud browser cannot inspect the unpublished local build without a reachable deployment. Windows browser execution was not used to circumvent the session restrictions.

Repeat `npm run build` and `CHROMIUM_PATH=<installed-browser> npm run test:browser` in a session that permits the browser's required sockets. Then separately verify service-worker offline operation on a served origin. Full desktop/mobile acceptance is still pending.

## Latest startup attempts

The final-polish pass tried `npm run dev` again with the server bound to `127.0.0.1:8080`. It exited with `EPERM`; the server now prints a concise explanation and exits instead of leaving an unhandled listener error. The browser smoke runner also stopped at its localhost listener (`127.0.0.1`, `EPERM`); `evidence/browser.json` records that attempt. Neither run establishes browser acceptance.

A locked `npm ci --ignore-scripts --no-audit --no-fund` attempt timed out after 30 seconds following `EAI_AGAIN registry.npmjs.org` for a locked dependency. Its partial `node_modules` directory was moved into `/tmp` so it cannot silently satisfy verification. The explicitly recorded external `NODE_PATH` remains a dependency override, not a verified locked installation.

The compiled preview uses the dependency-free `scripts/serve.js` server at `/series-of-calls/`. Request-handler checks cover base-path redirects, HEAD, notices and path traversal, without claiming a successful socket or browser run.

## Final backlog-pass startup check

2026-11-03T11:33:54.973632+00:00: after the current build and 360-test implementation run, `npm run dev` again failed to listen on `127.0.0.1:8080` with `EPERM`. `NODE_PATH=/home/zane-fountylabs/workspace/fountry/node_modules node scripts/browser-smoke.js` also stopped at its listen stage with `EPERM`; offline checks did not run. The latest `evidence/browser.json` records the blocked attempt. No browser result is inferred from the successful DOM tests or build.
