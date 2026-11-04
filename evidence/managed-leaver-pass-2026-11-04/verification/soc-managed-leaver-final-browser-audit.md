# Managed-leaver final browser independent audit

Passed six retained feature cases on frozen commit `4c437917a1e09447299a6bdafe7ede5ea2244fa2`: Chromium, Firefox and WebKit, each desktop 1440×1000 and mobile 390×844. Scope is **AU enterprise connector recovery**, not full-product or release acceptance.

- All three Docker jobs exited zero using the prepared official Playwright 1.56.0 noble commands. Recorded image digest matches the installed image. Browser versions match installed pins: Chromium 141.0.7390.37, Firefox 142.0.1, WebKit 26.0; Node v24.22.2, jsdom 24.1.3.
- All six cases passed full raw-command replay and independently derived fixture replay: 44 UI commands from 39 fixture commands, without dropping exported state fields. Seven malformed adapter payload probes reject.
- All require blocked clocks 6 and 8, unchanged effective identity and zero charges before explicit retry. Historic case, channel acceptance and receipt remain exact; customer B identity, contracts, charges and ledger remain unchanged.
- Explicit retry completes the leaver at clock 9, once: one 50-cent revenue/25-cent cost charge. New Alex interaction fails UNKNOWN_CALLER without creating a new case; Bea remains effective.
- Verified all 18 artifact hashes and lengths (122,469,309 bytes). Every trace contains actual controls (47 clicks, 36 fills, 41 selects); all page-evaluation expressions are read-only. No direct dispatch/state injection appears in the browser evaluation calls.
- All 310 source/helper input hashes match; errors and source drift are empty. A fresh isolated 47-file build reproduces `4e32d5e39a9e854e42e013d2357ca599bc2b88aba20fceb066de0b37a3ebb96c`.

Detailed audit: `/tmp/soc-managed-leaver-final-browser-audit.json`, SHA-256 `55481bca3e73b563c2176141fbf61029319ea0b7c47af5fae2833b5cfcc56134`. Original reports, traces, driver and runtime were not modified. Prototype failures and corrections remain separate. This audit replays retained commands and reviews retained traces; it does not claim additional browser executions or acceptance of other jurisdictions/product scope.
