# Regional acceptance result — 6 November 2026

The original acceptance producer on frozen `7e6ca4725dcc942884bcf1a8450920e1eaa1222a` is terminal. Its TAP records 800 tests: 796 passed and four failed. AC-SOC-653, 654, 655 and 656 each failed with `INVALID_PROVIDER_SUPPORT_WORK` while the shared three-market fixture advanced through arrival-event pruning. All recorded input hashes remained unchanged.

The recorder reported zero recognized cases because the otherwise passing AC-SOC-751 title attached a colon to its acceptance ID. The title is corrected to use whitespace. The strict parser remains unchanged and continues to reject malformed IDs. This correction does not convert the old failed receipt into a pass.

The four runtime failures occurred before the support-origin pin repair in `1a8a70d`. That newer repair passed the actual captured minute-345 transition, restored/worker continuation and bounded support regressions. These checks do not establish fresh passes of all four complete progression paths; those paths and the registered producer still require execution against the integrated candidate.

Preserved artifacts:

- `/tmp/soc-acceptance-verification-7e6ca47/evidence/acceptance.json`, SHA-256 `f5c6783613b48d1e97f168e816d1076c7ff779b18630073d59c9fcbe8e1a220e`.
- `/tmp/soc-acceptance-verification-7e6ca47/evidence/communications.tap`, SHA-256 `76b62a76249d411807b3a383db3432faf0c7b5933d2d5b0c4519ef70b0650482`.
- `/tmp/soc-acceptance-7e6ca47.log`, SHA-256 `b0295421d1bc361959e2a5ef75c7ea553adaa95272b063c079969d96bdaaabe7`.

The separately running full JavaScript suite has its own result and must not inherit this producer's counts. CI deadlines, mutation checks and release gates remain unchanged.
