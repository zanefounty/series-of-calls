# Locked browser matrices — 4 November 2026

These are real visible-control browser executions of the current incomplete preview, using Playwright 1.56.0 in its supported Ubuntu 24.04 image and Node 24.22.2. The exact commands and outcomes for the original 54 jobs are in [execution.json](execution.json). Each job keeps the original case deadlines and records partial status; a partial shard cannot establish a full matrix pass.

All six completed aggregate receipts cover all 144 cases independently for Chromium, Firefox and WebKit, for both compact and campaign journeys. Each checks exact distinct case membership, profile/viewports, current source hashes, lock/browser identity, artifact manifest, retained screenshots/traces and required outcomes/checkpoints. Their input hash is `01e44ca1ac5cbbadc5dfcf130bc3ee11e99ae370bc531cffde0ff1a7c91f19b1`; application artifact hash is `adc6c072b77d38c747978d32b609f8d8ba3881608dc396436814b48d616f39fe`.

## Retained failure and explicit rerun

Original WebKit campaign shard 11 failed `smb-eu-sandbox-mobile` at its first Training click, before profile configuration. The page subsequently reported a crash. The other eleven cases passed and no source drift occurred. This is retained as a failed attempt; it is not excluded from coverage. The earlier serial WebKit attempt also crashed at training entry under a different case label.

A separate diagnostic repeated fresh mobile Training entry twenty times; all twenty succeeded with no source drift. The script, command and browser debug log are in [probe provenance](webkit-entry-probe-provenance/). Those passes do not establish the crash's root cause or a fix. The complete twelve-case shard passed unchanged in isolation after the original 54-job orchestration ended: 411.85 seconds, all checkpoints, no errors or drift. [Independent retry verification](webkit-campaign-11-of-12-retry-1-verification.json) checked all 24 artifacts. The final [WebKit campaign aggregate](webkit-campaign-aggregate.json) uses the eleven original passing shards plus this complete passing rerun. The crash root cause remains unresolved; the successful rerun is not represented as a fix.

[The trace inventory](retained-traces.json) hashes locally retained original-run and diagnostic trace zips. Large trace archives are ignored by Git; screenshots and JSON receipts are versioned. The records cover current campaign recipes and their failure/recovery behavior, not full source-specific product completion.
