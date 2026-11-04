# Historical defence browser matrices

All six compact/campaign × Chromium/Firefox/WebKit aggregates passed for frozen defence implementation `03bd1ecef81f30a66826f1c69564ad30433deda2`. Each aggregate covers 144 exact planned cases (864 browser executions total), using locked Playwright 1.56.0 and its official browser image. The independent audit verified 54 shard receipts, 1,728 artifact hashes and byte lengths, all 307 frozen source inputs, and a freshly reproduced build.

See [independent audit](verification/soc-defence-matrix-independent-audit.md), [machine receipt](verification/soc-defence-matrix-independent-audit.json), and the six [aggregate receipts](aggregates/). Phase-one interrupted attempts and the failed controller restart remain in their original directories and records. They are excluded from successful aggregates; no failed receipt was rewritten. Trace ZIPs remain local ignored artifacts; screenshots, manifests and receipts are versioned. The receipt records their original absolute paths and hashes.

This is historical defence evidence. The current workforce and managed-leaver source differs, so these runs do not establish current full browser acceptance or release readiness. All existing readiness flags retain their actual status. Verification scripts retain their original paths to reproduce against the frozen checkout and original artifact tree.

The GitHub PR #8 merge receipts record the later workforce merge after all twelve checks passed; they do not change the source revision exercised by these browser matrices.
