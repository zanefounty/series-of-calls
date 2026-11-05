# Provider ownership and storage verification

Runtime candidate: `c0568a081f6237ffd175a64d98589c6b605e3d0a`. This repair closes only PLAY-046-A03. The gameplay ledger records 106 verified, 49 pending and four owner-parked assertions; the whole rebuild and catalogue release remain incomplete.

A second tab can revoke a native Web Lock. Before this repair, the rejected lock request left the original Provider tab running at 8×, still reporting ownership. The current acquisition token now rejects stale callbacks, handles revocation, pauses and cancels any pending worker result, and keeps the live state available for export. Explicit reopening is required to acquire ownership again.

The actual browser journey `runtime-storage-lock-safety` commits a quoted A$3,800 base order while the storage API throws a quota error. The purchase remains one running project, the disk save stays unchanged, and the visible export downloads the exact paid in-memory state. Restoring storage then taking the native lock from a second tab pauses the owner at minute 3. Reopening explicitly resumes at minute 4 without another purchase. Environment faults are injected through browser storage and Web Locks APIs; the driver never writes simulation state or its clock.

Executed verification:

- Full JavaScript suite: 2,113 passed, two skipped, zero failures (`/tmp/soc-lock-full-final.log`). The earlier run caught translation ordering; canonical ordering was repaired before this complete rerun.
- Registered acceptance: 635 passed, zero changed inputs (`/tmp/soc-lock-evidence-final.log`). AC-SOC-677–678 include a delayed worker and obsolete lock acquisition/rejection races.
- Seven development gates passed (`/tmp/soc-lock-development-gates-final.log`). Python gate/mutation checks: 98 passed, one skipped (`/tmp/soc-lock-gate-mutations-r3.log`).
- All 6,984 translation labels passed; compiled build passed. Dependency audit found zero vulnerabilities; pinned Gitleaks 8.30.1 passed history, current source and the built artifact.
- Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2 each passed the visible storage/lock/recovery journey at 1366×768 with Playwright 1.64.1, no page errors and no source drift. The ledger records the exact report and review hashes. Browser directories are `/tmp/soc-lock-final-{chromium,firefox,webkit}`.
- Independent runtime review: `/tmp/soc-lock-review-map_scene.json`. Independent source/artifact/accounting review: `/tmp/soc-lock-accounting-review.json`; all 159 assertion identities/text and source/closure policies remain unchanged.

This is desktop evidence for the bounded ownership/storage failure. It does not claim the complete mobile, mission, Training or publication matrix. Earlier dependency-misconfigured or superseded verification attempts remain outside Git alongside the final logs. Source/research release gates are unchanged.
