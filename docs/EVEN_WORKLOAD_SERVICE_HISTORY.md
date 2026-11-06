# Even-workload service-history counterexamples

AC-SOC-684–685 exercise the shared business/call engine through `SOC.dispatch` in an explicitly selected **Lab sandbox**. They are not Provider demand, Provider fault controls, a campaign victory or a human playthrough. The separate paid Provider lifecycle regression in `tests/provider-service-truth-regression.test.js` keeps its original authored 24-case arrival pattern and remains complementary evidence.

The fixture buys a real two-seat `workplace` retail contract with its wholesale obligation, configures endpoint routing through permitted Lab commands, and advances normally to minute 60. At that point the first actual retail/wholesale period has posted and the next bill is due at minute 120. No business meter, campaign state, job or clock is edited directly.

During the next period it dispatches exactly one ordinary, nonprobe, one-minute voice call at every integer minute 60 through 119, then advances one minute. All 60 cases and arrival timestamps are unique. This is duration-bearing endpoint service, not a diagnostic call. The tests inspect real call completion/failure, carrier admission and metered occupied minutes.

| Measured result | 57 unavailable minutes | Final-minute-only outage |
| --- | ---: | ---: |
| Calls offered | 60 | 60 |
| Completed calls | 3 | 59 |
| Failed calls | 57 | 1 |
| Healthy service samples | 3 | 59 |
| Unavailable service samples | 57 | 1 |
| Actual billable voice minutes | 3 | 59 |
| Base retail service credit, cents | 1710 | 30 |
| Retail overage units beyond 40 included | 0 | 19 |
| Net retail, cents | 90 | 1922 |
| Wholesale including actual usage, cents | 1012 | 1236 |

For AC-SOC-684, the first calls start at minutes 60 and 61 and complete normally. The Lab phone outage is submitted at minute 62, so service observations at minutes 63 through 119 record 57 unavailable minutes. Call attempts made at 62 through 118 fail. Clearing the fault at minute 119 permits one new real call that completes at minute 120. Final readiness is true, but the settled period still records only three healthy minutes and the full 57-minute credit. A further three healthy minutes cannot rewrite the earlier failures, settlement or postings.

For AC-SOC-685, calls at minutes 60 through 118 complete. The outage is submitted at minute 119 before the final call and minute-120 sample. The last call fails; the preceding 59 calls and their usage remain delivered. Retail credit reflects only one unavailable minute, retail overage uses the actual 59 minutes, and wholesale usage is still charged. Clearing the fault after settlement permits a new two-minute call to complete without changing the failed call or earlier bill.

Both tests save immediately before the minute-120 settlement. The next state is exactly equal for direct dispatch, restored dispatch and the actual serialized `SOC.workerSource()` message handler. Each period has precisely one retail and one wholesale posting, with usage, allowance, overage, credit and totals reconciled to the real calls and retained settlement. Inspection is pure, restore validates the resulting states, and post-period recovery does not duplicate billing.

Executed development command:

```sh
rtk node --test --test-isolation=none tests/even-workload-service-history.test.js
```

Result: **2 passed, 0 failed, 0 skipped**, about 0.30 seconds. Raw log: `/tmp/soc-even-workload-service-history-r1.log`. Inputs are the current integration worktree, not a frozen published candidate. No runtime or scenario rules changed. Full Provider equivalence, mission performance and browser controls remain outside this bounded shared-engine proof.
