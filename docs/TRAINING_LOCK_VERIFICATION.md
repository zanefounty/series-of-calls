# Training ownership and map verification

Verified 6 November 2026 against detached `43f918681f5d22f130c840f63b49da908e2af147`. This records synthetic browser evidence, not a human pilot, complete browser matrix or Provider campaign completion.

## Native ownership failure and repair

Actual Chromium reproduced the defect on frozen `1139239f4f5484042a152d1fe3a9a31e444dba98`. After a visible Training lesson started, the driver observed a native worker in flight and a second tab stole its Web Lock without writing game state. The revoked tab retained `locked=true`, committed the worker from minute 0 to 5, then accepted another visible Minute action and saved minute 6 while the competitor held the lock. The UI still said “Editing this slot.” The old Training source bytes also match inspected `ed6fc41`.

The same native test passes on `43f9186`: revocation clears ownership, terminates the pending worker, and preserves minute 0 / revision 1 / save sequence 1. A subsequent Minute action cannot mutate or save. Read-only export is exact; the successor acquires the save; reopening while occupied refuses; explicit reacquisition after release resumes successfully. No fake worker results, delayed-worker instrumentation or gameplay-state injection was used.

- Red receipt: `/tmp/soc-smb-visible-1139239-evidence/training-lock/report.json`, SHA-256 `79a63af5e13c3977413e777d98d253d3a48901f7ba4daf8cb0e2a1d86ad07a82`; trace SHA-256 `d94c9ce1c54c7d51965e809633e25334eff5c7991f5afc7e38eb0cb66b8485e0`.
- Green receipt: `/home/zane-fountylabs/soc-evidence-archive/training-43f9186-evidence/native/report.json`, SHA-256 `7c1118e341d8d1f97421ad824ff9ee6b0bded8beb79fc9d873aefe1876e929af`; trace SHA-256 `55abc4e1091c2fdc3007f939d84c0b5e5e98910ab8e8c0b301a2976ad064837d`.
- Green Training source SHA-256: `c18c4d5bd9bc69333c144b79dc54cdd0c2c06ff40a11eff98b07fca744aa8b75`; built HTML: `0345d6d5e06aa9763f135f01d141291b12a9cdf60dec11aa43f02369e6f8eda2`.

The repair uses a lease generation, cancellation and worker termination before dropping authority; stale lock callbacks cannot revoke a newer lease. See [Training controller](../src/game/97-training.js) and [registered regression](../tests/training-lock-revocation.test.js). The later strengthened regression/registry checks have their own receipts; this browser run remains scoped to the frozen runtime above.

## Four-track curriculum across three engines

Each selected [campaign driver](../scripts/browser-campaigns.js) shard uses visible map lesson-action buttons and traverses SMB, Enterprise, Government and Defence prerequisite tracks. Each passes 40 retained checkpoints covering service, incident/recovery, pending versus active contracts, three billed periods, assessment awards and renewal. Training remains separate from Provider; raw authoring forms are used only by the separate Lab path.

| Shard | AU profile | Viewport | Result | Seconds |
|---|---|---|---|---:|
| 109/144 | guided | 1440 × 1000 | shard-passed | 80.531 |
| 110/144 | guided | 390 × 844 | shard-passed | 80.040 |
| 112/144 | assessed | 1440 × 1000 | shard-passed | 115.781 |
| 113/144 | assessed | 390 × 844 | shard-passed | 111.099 |

Command for each row: `node scripts/browser-campaigns.js --journey campaign --browser chromium --shard <row>`, with `SOC_BROWSER_CAMPAIGN_EVIDENCE_DIR` outside Git. Chromium was `156.0.8078.80`; Playwright and lockfile both `1.64.1`. The pinned image was `mcr.microsoft.com/playwright:v1.64.1-noble@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f`. Package and lock bytes match the pinned dependency installation.

All 1,428 tracked inputs remained unchanged. Each run’s 47 built files, report, screenshot and trace were independently hashed. The stable four-case audit is `/home/zane-fountylabs/soc-evidence-archive/training-43f9186-evidence/chromium-independent-curriculum-audit.json`, SHA-256 `45a21784286ab2839bf871483747dcd2d6984588378039bed6eb7a311c108090`; it links exact reports and artifact manifests. This is four selected AU cases, not the entire 144-case matrix. Other jurisdictions, landscape, broader keyboard/accessibility, preferences and active-save equivalence remain separately scoped. The subsequent Firefox and WebKit runs below are separately recorded on the same frozen candidate.

## Final selected-case verification

All 12 selected cases passed: the same four AU guided/assessed desktop/mobile shards in Chromium, Firefox and WebKit. Each case retains 40 passing curriculum checkpoints; this does not expand the scope to all jurisdictions or the entire 144-case matrix. The native midflight lock-revocation probe remains Chromium-specific.

| Engine | Version | Shards 109 / 110 / 112 / 113, seconds | Result |
|---|---|---|---|
| Chromium | 156.0.8078.80 | 80.531 / 80.040 / 115.781 / 111.099 | 4 shard passes |
| Firefox | 157.0 | 182.709 / 174.743 / 170.364 / 125.530 | 4 shard passes |
| WebKit | 27.2 | 114.073 / 103.701 / 107.345 / 102.490 | 4 shard passes |

All runner processes exited zero. Independent final comparison again found no changes to the 1,428 tracked inputs; all 47 built files per case matched their manifests. Report, screenshot and trace hashes are retained for every case in `/home/zane-fountylabs/soc-evidence-archive/training-43f9186-evidence/independent-curriculum-audit.json`, SHA-256 `5a20d79d2177dfe666d4b35a3fa059e7d984a181c9bb2f6725977e56bda51d2d`. The Chromium-only audit above remains unchanged as an earlier scoped receipt.

## Visible assessment distinction

The final desktop screen shows “149 / 149 lesson actions completed” while the quick-exercise badge says “Evidence still required.” The course checkpoints retain earned curriculum awards; the badge uses the current exercise assessment after later reconnect/renewal actions. The driver proves the retained checkpoints, not a passing current badge. Do not interpret the action count as complete current assessment or commercial victory.

Record this as a UI wording follow-up: distinguish retained course completion from the current quick-exercise objective and explain any remaining current evidence. This note does not alter either predicate or close the broader Training owner addition.

## Scoped Provider prerequisite checks

These additional Provider checks do not expand the Training results above. The Training controller and curriculum-driver bytes still match frozen `43f9186`; the twelve curriculum receipts retain their original candidate and hashes.

On frozen `b072564`, the actual earned local-continuity follow-on driver passed in Chromium on desktop and mobile. Both journeys visibly refused unearned managed spares with the scoped prerequisite and a way forward, recovered actual local-autonomy exhaustion, claimed `progress.goal.ca`, compared direct and managed costs, funded the managed option for a second customer, delivered ordinary disconnected work and preserved the paid project and earned receipt through reload. The refusal text and disabled control were independently inspected together below the sticky inspector heading. All 1,430 tracked inputs remained unchanged. Receipt: `/home/zane-fountylabs/soc-evidence-archive/spares-b072564-evidence/provider-browser-20261106064742491.json`, SHA-256 `32ff559d09563fba4e71f7b25f358897bcf442a9fd634aa5f828e49c09d22683`; independent audit SHA-256 `fb091c60bafe8382eaec7a74f72d9443e558499b5d8f5c52950be8b8d3a0691b` in that directory.

A separate actual fresh-career check found that Operations and Suppliers displayed 71 and 17 disabled quote controls without an explicit customer prerequisite or next step. Frozen `b4912340d6f99de35861d7fdf1a99a2ebcd74d13` repairs these two empty sheets: they explain that a funded customer is required and offer “Compare starter plans in Deals.” Existing customer-scoped actions remain available. [AC-SOC-800–802](../tests/provider-empty-customer-actions-ui.test.js) cover the empty guidance, publicly funded customer controls, translation and rendering purity.

Four pinned Chromium `156.0.8078.80` cases passed: Operations and Suppliers at 1366 × 768 and 390 × 844. Desktop Tab/Enter and mobile clicks reached the actual starter base quote; after a real purchase, each sheet opened its existing customer-scoped repair or partner-qualification quote. Opening sheets and quotes preserved the exact campaign state. The pinned dependency/container baseline is the same image specified above. Twelve focused UI cases, all six dictionaries with 7,207 labels, and the actual build passed; all 1,431 tracked inputs remained unchanged. Screenshots and native traces are retained beside `/home/zane-fountylabs/soc-evidence-archive/empty-customer-b491234-evidence/report.json`, SHA-256 `2b3cba3ee541639040763250dd6f14a037a6f774a8581534547efca16b86e1d0`; `independent-audit.json` SHA-256 `c87d5a15c6e21b4588aedfe91774af5e54e3f35a3cb50d338726ede486cf108e`. The initial external harness attempt stopped before browser launch because its output directory did not yet exist; `container-r1.log` preserves that failure.

This resolves the two observed prerequisite presentation gaps. It does not establish that every blocked action in every campaign state provides adequate guidance, and does not independently close PLAY-019-A03 or any broader accessibility, save, preference or family-completion assertion.

## Refused credit and exited-customer reviews

A subsequent category audit found two actual remaining gaps: repeated starter borrowing displayed only `CREDIT_ALREADY_USED` with an ineligible cash-after forecast, and reviewing Exit again for an exited customer displayed `CUSTOMER_NOT_EXITABLE` with “Keep customer.” Native desktop/mobile reproductions are retained in `/home/zane-fountylabs/soc-evidence-archive/empty-customer-b491234-evidence/blocked-audit-report.json`; its artifact runtime matches audited `bf81af8`. The adjacent `blocked-action-category-audit.json` distinguishes actual browser coverage, code-level explanations, unverified paths and hypotheses that still need a reachable example.

Frozen `909985a` fixes those two reviews without changing economic or customer authority. Refused borrowing shows the requested terms and actual current cash, explains the existing credit record, and offers “Close review.” Repayment does not unlock another starter loan: the existing authority retains the loan record. The exited-customer review explains the terminal/unavailable status and retained obligations, with a truthful close action. New keys are present in all six dictionaries; non-English copies currently use the documented English fallback pending translation review. [AC-SOC-806–808](../tests/provider-refused-quotes-ui.test.js) preserve eligible quote behavior and verify refusal, actual repayment, translation and rendering purity.

Two pinned Chromium journeys passed, one desktop and one mobile; each checked repeated credit before and after actual repayment and a repeated exit. Desktop Tab/Enter and mobile activation closed the review without changing state. Ten focused UI tests, the six-dictionary check with 7,213 labels, and build passed. All 1,432 tracked inputs remained unchanged. Final receipt: `/home/zane-fountylabs/soc-evidence-archive/refused-quotes-909985a-evidence/blocked-audit-report.json`, SHA-256 `7d0590ecec6b120eb82fd25d72dfeb283150052c7f7367cf63830722e7a9a00f`; `independent-audit.json` SHA-256 `6a7e551b0b4fbf70d3f0e1e0f70e5ff9be84cb17104a9f76ce33b9988dc848e9`. Native traces and screenshots are retained alongside. Earlier `3027ab8` observations exposed misleading inherited principal wording after repayment; they remain separate diagnostic evidence and were not relabelled as final verification.

PLAY-019-A03 still needs the remaining category audit: unavailable offers, exhausted policies, general quote fallbacks, cancellation/retirement, handoff, regional support and other scope-dependent controls are not all established by these narrow journeys. A generic message found in code is not automatically a reachable defect; a few passing browser paths are not proof of every blocked state.
