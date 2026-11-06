# Provider authority and settlement counterexamples

This bounded development verification adds AC-SOC-674–676 in `tests/provider-authority-counterexamples.test.js`. It does not change runtime rules, acceptance statuses or source dispositions.

| Assertion | Executed check | Evidence boundary |
|---|---|---|
| PLAY-009-A02 | Fund the three Swift stages through public Provider quotes/dispatch. Copy the customer through `copy-to-lab`, configure the custom Lab, and restore it normally. Changing its exported experience to an earned campaign, with either sandbox or guided mode, refuses with `CAMPAIGN_STATE_REQUIRED`. Both original Provider and authored Lab bytes remain unchanged. | Tests relabelling a genuine exported custom copy. Does not claim cryptographic authenticity against arbitrary fabrication of an entire save. |
| PLAY-046-A02 | Save actual paid service at minute59, after autonomous delivered work and a funded incident repair. Advance the original and restored states one minute to settlement. Compare the complete state and real serialized-worker result, customer/global history and new supplier-usage/retail postings. Advance again and retain each posting once. | Explicit pending-period-bill coverage supplements the existing call, project, coaching and incident cases in `provider-persistence.test.js`. No browser or long-play claim. |
| PLAY-008-A04 | An actual empty Provider period remains unqualified; an actual initial partial paid-service period remains unqualified. Separately, coherent isolated mission-proof fixtures reject zero due cases, a shortened interval,21 on-time cases, zero operating result, default, overdue active/acknowledged incidents, and cancelled expansion funding. Negative quotation copies in grace/default retain `INSOLVENT`. | The mission-proof and arrears quotation fixtures are explicitly isolated rule counterexamples, never dispatched/imported or presented as earned campaign outcomes. Existing public two-period/funded-expansion positives remain in `provider-campaign-kernel.test.js`. This is not a new public grace/default/rescue journey. |

Run:

```sh
rtk node --test --test-isolation=none tests/provider-authority-counterexamples.test.js
```

The final focused run is recorded outside Git at `/tmp/soc-authority-counterexamples-r3.log`. Earlier `/tmp/soc-authority-counterexamples.log` retains a test expectation failure: the test initially named the retail posting `provider-retail-period`; the runtime's actual posting is `provider-customer-period`. The corrected test still requires an actual new retail posting and exact supplier-usage cost. No simulation behavior was changed to pass it.

These are mutable-development checks. Candidate freeze, registry integration and required final checks belong to the coordinator. No human participation, full mission matrix, publication or general acceptance closure is asserted.
