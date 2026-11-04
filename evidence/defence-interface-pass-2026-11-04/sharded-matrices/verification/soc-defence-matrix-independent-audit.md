# Independent historical defence matrix audit

Passed read-only audit at 2026-11-04T01:43:33.706204+00:00 for frozen `/tmp/soc-interface-implementation` commit `03bd1ecef81f30a66826f1c69564ad30433deda2`.

- All six Chromium/Firefox/WebKit × compact/campaign aggregates contain exactly 144 unique planned cases: 48 scenario/jurisdiction/mode profiles × desktop, mobile and landscape. This is 864 browser executions, not 864 independent product requirements.
- All 54 successful shard receipts match their recorded hashes and exact planned partitions. The 51 phase-2 exit-zero jobs plus three retained phase-1 exit-zero jobs cover the required 54 shards exactly.
- Verified all 1,728 screenshots/trace artifacts: hashes and lengths match, totaling 21,391,290,955 bytes. All 864 trace ZIPs are ignored by Git.
- All successful receipts have empty errors, console errors and source drift; compact failure/recovery outcomes and campaign checkpoint sequences match the harness contract. The 20-minute shard deadlines and 60/240-second compact/campaign case deadlines remain unchanged.
- All 307 input hashes match the frozen checkout. A fresh isolated build reproduces the 47-file artifact hash `b340a37e47bd852de57ac4768a251ba0cf8b95123a4fc36cd8145c9ef96a869e`.
- Recorded browser versions match installed locked Playwright 1.56.0 pins: Chromium 141.0.7390.37, Firefox 142.0.1, WebKit 26.0. Node is v24.22.2; jsdom is 24.1.3. Execution commands retain the supported `mcr.microsoft.com/playwright:v1.56.0-noble` image and source/Node mounts.

The three incomplete first-phase shard-2 attempts remain excluded and preserved. Chromium and Firefox retain failed reports with `browser.newContext: Target page, context or browser has been closed` (four and two recorded cases respectively); WebKit retains a build manifest without a final report. The separate orchestration restart TypeError record remains preserved. The audit does not reinterpret these attempts as passes or independently establish their root cause.

This is historical defence-runtime evidence. Current WFM and managed-leaver source differs intentionally. No readiness flag, full-product acceptance or release approval follows. This audit verifies receipts/artifacts and reproduces the build; it does not replay every browser action, inspect every trace event, or independently attest the historical Docker image digest.

Reproduce artifact/receipt audit: `rtk python3 /tmp/soc-audit-defence-matrices.py` (uses `/tmp/soc-defence-matrix-fresh-inputs.json`, captured from the frozen harness and fresh isolated build). Detailed receipt: `/tmp/soc-defence-matrix-independent-audit.json`, SHA-256 `3aaa10f4757934061a4827f4b8186f955b002af851dc45e89de5511ffa3d7556`. No repository source or existing receipt was modified.
