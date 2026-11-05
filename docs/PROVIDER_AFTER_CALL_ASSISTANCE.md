# Provider after-call assistance

Authored balance adjustment for `provider-campaigns-4`, 5 November 2026. This implements a bounded response to the truthful requested-conversation duration change; it does not change the SMB contract or certify gameplay acceptance.

New Provider voice conversations retain at least their requested duration. With four paid customer handlers, the peak-window variant consequently exposes separate staffing/wrap and carrier-session pressure. The `after-call-assistance` operation commissions CRM/workflow assistance for 24,000 setup cents, 6,000 cents per period, eight implementation minutes, one provider engineer and one provider support worker. It changes only the customer workforce's `wrapMinutes` to zero. Call duration, handling time, people, entitlements and carrier capacity remain separate. Its named source link is `uc-new:domain:journeys`; this authored cost choice does not claim an original product entitlement or research acceptance.

The operation requires effective customer people, records and engagement services. At the end of each actual conversation, zero wrap also requires retained case context and currently observed-ready records/engagement dependencies. The trace records `AFTER_CALL_ASSISTANCE_APPLIED` when those checks pass; otherwise `AFTER_CALL_ASSISTANCE_UNAVAILABLE` explains the fallback to one minute of wrap. Buying assistance does not bypass a failed CRM/workflow dependency. The dispatcher rejects repeat purchases when assistance is already funded or desired wrap is zero. Payment does not immediately change effective wrap. The existing commissioning, minimum-term exposure and resource-configuration replay apply.

The public peak-window reference strategies now fund these additional investments before their qualifying periods:

| Investment | Swift | Steady | Setup cents | Period cents |
| --- | --- | --- | ---: | ---: |
| BPO customer handling cover | Required | Required | 30,000 | 18,000 |
| After-call assistance | Required | Required | 24,000 | 6,000 |
| Four carrier sessions | Required | Existing plan headroom | 18,000 | 4,000 |

Swift commissions BPO, then carrier headroom, then assistance. That schedule completes the carrier upgrade before the authored carrier incident; the incident still requires acknowledgement and paid repair. Steady funds BPO then assistance. The short-promise reference fixtures retain BPO without these extra peak-window investments.

`tests/provider-after-call-assistance.test.js` verifies charged terms, delayed delivery, unchanged typed capacity, restore, real same-agent assignment to a waiting case in the previous call's wrap minute, and unchanged four-minute requested conversation duration. It compares actual settled peak periods with and without assistance under the same paid BPO/carrier capacity. `tests/provider-variant-campaign.test.js` preserves the no-BPO failure and the original 24-due/at-least-22-on-time, two consecutive profitable qualifying periods, real repair and funded shared-treasury expansion assertions.

Development verification: the two assistance tests and seven variant campaign tests passed. Real visible-control verification and frozen full-candidate checks remain coordinator work; these results do not close acceptance assertions.
