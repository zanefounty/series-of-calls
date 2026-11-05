# Authored SMB opening variants

Candidate content `SOC_PROVIDER_VARIANTS` version 1, 2026-11-05. This is new synthetic campaign content; it does not alter source-pack bytes or certify the full gameplay release.

The default opening and old saves retain the original schedule, three-minute voice duration, eight-minute response promise, 24 due cases per full period, and the existing victory requirements. New careers may choose a finite authored variant. Customer requirements are not editable. Saves record the chosen `{version:1,id}`; unknown versions and arbitrary fields are refused.

| Choice | Work and deadline | Consequential response demonstrated |
| --- | --- | --- |
| Standard | Existing 16 voice and eight digital arrivals; eight-minute deadline | Both original plans can qualify with the opening customer workforce and paid carrier repair. |
| Peak Window | 16 four-minute voice calls arrive in minutes 1–16; eight digital cases arrive in minutes 20–55; eight-minute deadline | The opening workforce misses the service target. Paid BPO cover changes actual staffing and restores 24 on-time cases in full periods for either plan. |
| Short Promise | Standard arrivals and durations; five-minute deadline; customer queue capacity incident | The opening workforce completes only nine of 24 cases on time in a settled full period. Paid BPO cover removes the queue delay and restores 24 on-time cases. The queue requires its own paid `service-repair`; a carrier repair quote is refused for that domain. |

The initial experimental Short Promise deadline was four minutes. Real routed work takes at least five minutes with eligible staff, so that draft was impossible to satisfy. Version 1 therefore authors five minutes. The original eight-minute SMB contract remains unchanged.

`tests/provider-variant-campaign.test.js` executes both plans for each new variant through real purchases, autonomous demand, domain-specific incident repair, two consecutive qualifying periods, positive operating result and funded shared-treasury expansion. It also demonstrates the unstaffed failure, strict choice validation, unchanged old-save restoration, pending burst work and equal worker/restore continuation. The two variant test files passed 14 tests in the current diagnostic run (`/tmp/soc-variants-current2.log`). Final candidate verification must rerun them.

In the tested normal-difficulty Sydney opening, full staffed periods produced A$270 operating result for Swift and A$570 for Steady under both new variants. Swift retained its lower initial setup requirement; Steady retained its lower recurring supplier exposure. These are simulation observations for the tested terms, not guaranteed profits or human playability evidence. Additional market, seed and commercial conditions still require their own verification.

## Enterprise continuity demand version 1

New careers additionally record `enterpriseContinuityVersion: 1`. In Enterprise, the sixteen due voice cases alternate two outbound and two inbound calls, covering both Alex and Bea. The existing total of 24 due cases, duration, deadlines and usage rates are unchanged. Purchased carrier commissioning initializes actual number assignments and carrier rules before any inbound call can succeed. Staged and consolidated migration qualification requires both directions on each migrated person's actual platform, with retained case context.

Saves without this optional version retain their original demand direction; restore does not add the field or invent past inbound evidence. Unknown versions and combining this contract with the legacy `provider-campaigns-1` content are rejected. The paid Enterprise continuity and campaign kernel suites passed 16 tests in `/tmp/soc-enterprise-inbound-versioned.log`. This proves actual inbound routing and retained assignments, not a supplier number port or room migration. Those distinct obligations remain outstanding.
