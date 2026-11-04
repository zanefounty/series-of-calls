# Bounded workforce-offer verification — 4 November 2026

This is an incomplete-preview implementation checkpoint. It adds one proposed fictional Queueberry WFM offer, scoped integration and named forecast coverage. It does not complete the actor portfolio or release the full application. The source inventory remains 4,839 requirements: 215 partial, 4,624 pending, zero final dispositions. Canonical research acceptance remains deferred.

The [work package](../../spec/work-packages/WP-WORKFORCE-OFFER.md) explains the source obligation, synthetic training prices, actual routing independence, failure/retest/rebind recovery, prepaid activation/renewal/cancellation and remaining scope. All gameplay mutations use SOC dispatch. No real vendor capability or price is asserted.

## Executed results

- [Integrated checks](integrated-checks/results.json): 1,396 JavaScript tests and 520 registered acceptance cases passed, with no input drift. Delivery inventory, translation structure and build passed using Node 24.22.2, locked jsdom 24.1.3 and no external NODE_PATH.
- The initial Python/development/release checks rejected a stale generated mapping audit after the new actor behaviour was registered. Those failed logs remain in the integrated directory. Regenerating the structural audit changed no runtime input. [Recovery checks](mapping-audit-recovery/results.json) passed all 83 Python gate/mutation tests and development gates with no input drift. Release still rejects `REF-ac194430f67b3832` as unreviewed; no release or deployment is claimed.
- [Actual stdio MCP](mcp-final.json): 80 cases passed, preserving the previous 76 and adding four jurisdiction workforce journeys through the real server process. The pre-fix/pre-freeze receipt is retained separately.
- [Browser MCP](browser-mcp/2026-11-04T01-00-09-127168Z/report.json): 22 bounded checks passed with pinned MCP 0.0.84 and its separate Chromium dependency. Worker fallback, tab locking, save/import/replay, offline reload and three viewport checks passed without source drift.
- [Feature browser receipt](feature-browser/2026-11-04T01-04-16-351Z-d969b7/report.json): all six AU enterprise cases passed across Chromium 141.0.7390.37, Firefox 142.0.1 and WebKit 26.0, on desktop and mobile, using app Playwright 1.56.0. These exercise actual visible controls, supplier failure/recovery, stale-binding rebind, one-person forecast coverage versus two-person real routing, and prepaid renewal/cancellation. Full UI command replay matches exactly; independent fixture comparison includes explicit UI call defaults and omits only command history/revision. No console errors or source drift occurred. [Independent audit](independent-browser-audit.json) verifies all 48 retained artifact hashes and outcomes.

Counts overlap. Six bounded feature cases do not replace complete compact/campaign matrices for this runtime. Full-browser readiness remains false. The ongoing defence-runtime matrices are separate, earlier inputs.

## Preserved findings and provenance

[Independent save audit](independent-audit.md) records reproduced invoice, timeline, scope and ledger defects and their corrections. [Final lifecycle probes](soc-workforce-lifecycle-final.json) accepted nine actual valid lifecycle states and rejected eight malformed timestamp cases. Valid cancellation before activation incurs no invoice; cancelling a pending restart preserves its prior invoice.

The first six-case browser attempt remains failed in `feature-browser-attempt-1`: its expected fixture omitted the UI’s explicit outbound/encrypted defaults, while exact UI-command replay matched. Three earlier prototype driver failures remain in `prototype-browser`. Original and corrected drivers are retained in `verification-tools`. No receipt was edited to manufacture a pass.

[Launch parameters](browser-execution.json) record the official Playwright 1.56.0 noble image, mounted Node binary and read-only source. [Relocation index](browser-relocation.json) verifies copied artifact bytes; original `/out` paths are container paths. Trace archives are retained locally and ignored by Git; screenshots, states, manifests and receipts are versioned.

[PR #7 receipts](github/pr7-merged.json) show the prior defence/keyboard implementation merged only after all 12 exact-head hosted checks succeeded. The ordinary implementation used the existing owner-only PR review exception; required status checks were not bypassed. Hosted adaptation remains disabled without its dedicated credential and provider-enforced budget.
