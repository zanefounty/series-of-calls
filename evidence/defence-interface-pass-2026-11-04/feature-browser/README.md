# Bounded interface and keyboard browser evidence

Final frozen feature run: 24 visible interface cases per engine across Chromium, Firefox and WebKit, plus two title keyboard viewports per engine. `verification.json` records 72 interface cases, six keyboard checks, matching source/build hashes and 156 verified screenshot/trace files. This is bounded feature evidence, not full application or release acceptance.

`execution.json` retains the exact commands, image identity, frozen commit and timings. Driver sources and independent verification tooling are adjacent. `soc-interface-save-audit.md` records the independent save-integrity defects and regressions without claiming cryptographic authentication.

`pre-fix/` retains the initial successful Chromium feature matrix and keyboard attempt(s) before the additional policy hardening. `prototypes/` retains earlier exploration, including failed harness comparisons. These are historical evidence, not replacements for the final run.

All copied receipt, log, script and binary bytes are unchanged. Existing absolute `/tmp/...` and container paths inside receipts were not rewritten. Use `relocation-index.json` to locate their copied files here; `delivery-index.json` retains the original handoff index. Historical driver sources referenced outside the original output directories are also preserved in `historical-drivers/`.

Trace archives and screenshots are local evidence artifacts. No files were staged by the verifier; the coordinator owns the final evidence index and publication selection.
