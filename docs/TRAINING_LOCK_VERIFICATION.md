# Training ownership and map verification

Verified 6 November 2026 against detached `43f918681f5d22f130c840f63b49da908e2af147`. This records synthetic browser evidence, not a human pilot, complete browser matrix or Provider campaign completion.

## Native ownership failure and repair

Actual Chromium reproduced the defect on frozen `1139239f4f5484042a152d1fe3a9a31e444dba98`. After a visible Training lesson started, the driver observed a native worker in flight and a second tab stole its Web Lock without writing game state. The revoked tab retained `locked=true`, committed the worker from minute 0 to 5, then accepted another visible Minute action and saved minute 6 while the competitor held the lock. The UI still said “Editing this slot.” The old Training source bytes also match inspected `ed6fc41`.

The same native test passes on `43f9186`: revocation clears ownership, terminates the pending worker, and preserves minute 0 / revision 1 / save sequence 1. A subsequent Minute action cannot mutate or save. Read-only export is exact; the successor acquires the save; reopening while occupied refuses; explicit reacquisition after release resumes successfully. No fake worker results, delayed-worker instrumentation or gameplay-state injection was used.

- Red receipt: `/tmp/soc-smb-visible-1139239-evidence/training-lock/report.json`, SHA-256 `79a63af5e13c3977413e777d98d253d3a48901f7ba4daf8cb0e2a1d86ad07a82`; trace SHA-256 `d94c9ce1c54c7d51965e809633e25334eff5c7991f5afc7e38eb0cb66b8485e0`.
- Green receipt: `/home/zane-fountylabs/soc-evidence-archive/training-43f9186-evidence/native/report.json`, SHA-256 `7c1118e341d8d1f97421ad824ff9ee6b0bded8beb79fc9d873aefe1876e929af`; trace SHA-256 `55abc4e1091c2fdc3007f939d84c0b5e5e98910ab8e8c0b301a2976ad064837d`.
- Green Training source SHA-256: `c18c4d5bd9bc69333c144b79dc54cdd0c2c06ff40a11eff98b07fca744aa8b75`; built HTML: `0345d6d5e06aa9763f135f01d141291b12a9cdf60dec11aa43f02369e6f8eda2`.

The repair uses a lease generation, cancellation and worker termination before dropping authority; stale lock callbacks cannot revoke a newer lease. See [Training controller](../src/game/97-training.js) and [registered regression](../tests/training-lock-revocation.test.js). The later strengthened regression/registry checks have their own receipts; this browser run remains scoped to the frozen runtime above.

## Four-track Chromium curriculum

Each selected [campaign driver](../scripts/browser-campaigns.js) shard uses visible map lesson-action buttons and traverses SMB, Enterprise, Government and Defence prerequisite tracks. Each passes 40 retained checkpoints covering service, incident/recovery, pending versus active contracts, three billed periods, assessment awards and renewal. Training remains separate from Provider; raw authoring forms are used only by the separate Lab path.

| Shard | AU profile | Viewport | Result | Seconds |
|---|---|---|---|---:|
| 109/144 | guided | 1440 × 1000 | shard-passed | 80.531 |
| 110/144 | guided | 390 × 844 | shard-passed | 80.040 |
| 112/144 | assessed | 1440 × 1000 | shard-passed | 115.781 |
| 113/144 | assessed | 390 × 844 | shard-passed | 111.099 |

Command for each row: `node scripts/browser-campaigns.js --journey campaign --browser chromium --shard <row>`, with `SOC_BROWSER_CAMPAIGN_EVIDENCE_DIR` outside Git. Chromium was `156.0.8078.80`; Playwright and lockfile both `1.64.1`. The pinned image was `mcr.microsoft.com/playwright:v1.64.1-noble@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f`. Package and lock bytes match the pinned dependency installation.

All 1,428 tracked inputs remained unchanged. Each run’s 47 built files, report, screenshot and trace were independently hashed. The stable four-case audit is `/home/zane-fountylabs/soc-evidence-archive/training-43f9186-evidence/chromium-independent-curriculum-audit.json`, SHA-256 `45a21784286ab2839bf871483747dcd2d6984588378039bed6eb7a311c108090`; it links exact reports and artifact manifests. This is four selected AU cases, not the entire 144-case matrix. Other jurisdictions, landscape, broader keyboard/accessibility, preferences and active-save equivalence remain separately scoped. Firefox/WebKit results, when available, require their own receipts.

## Visible assessment distinction

The final desktop screen shows “149 / 149 lesson actions completed” while the quick-exercise badge says “Evidence still required.” The course checkpoints retain earned curriculum awards; the badge uses the current exercise assessment after later reconnect/renewal actions. The driver proves the retained checkpoints, not a passing current badge. Do not interpret the action count as complete current assessment or commercial victory.

Record this as a UI wording follow-up: distinguish retained course completion from the current quick-exercise objective and explain any remaining current evidence. This note does not alter either predicate or close the broader Training owner addition.
