# Later SMB prospect choice — bounded gameplay audit

Reviewed 14 November 2026 against the 13 November gameplay worklist, using `$soc-game-design` and `$soc-playtest`. This is a partial SOC-08 improvement, not a finding that the full game is balanced or intuitive.

## Player decision

After winning the first SMB expansion and continuing the career, the player reaches the next lead at minute 300. The existing later cycle presented one offer, so there was no choice about its response promise. Fresh prospect-choice saves now present two leads through the existing offer inspector and validated plan command:

| Choice | Promise and retail revenue | Sensible when | Commitment |
| --- | --- | --- | --- |
| Regular | Eight-minute response; A$2,600 per period before market pressure | Preserve cash and use existing capacity | Lower revenue ceiling |
| Short response | Five-minute response; A$3,000 per period before market pressure; expires 30 minutes sooner | Fund a stronger handling plan and operations | Up-front supplier and operation costs; greater service failure exposure |

The hypothesis is that a later portfolio decision becomes meaningful when the higher contract price can only be earned reliably through a visible cash and capacity commitment. A disconfirming result would be the premium plan dominating without extra investment, or being unable to qualify even when funded. The player can inspect the workload, deadline, price, quote, cash cost and later delivered work through the existing UI. The next cycle also receives an alternate workload; this is a deterministic prospect policy, not a market simulation.

## Matched execution evidence

The acceptance case `AC-SOC-910` starts from a legitimate default-seed SMB career with the standard opening, a commissioned starter, the first regular lead won, and `continue-career` dispatched. All branches fork at simulation minute 300, use the same market and workload seed, and run to minute 420. Incidents are acknowledged and repaired when available; renewals use the same policy. This is a simulation comparison, not a browser or human result.

| Branch | Minute-300 decision and later operations | Second customer's period-6 on-time work | Period-6 qualification | Overall period-6 operating result | Minute-420 cash |
| --- | --- | ---: | --- | ---: | ---: |
| Lean | Regular, Swift | 24/24 | Yes | A$3,390.50 | A$12,670.56 |
| Unfunded premium | Short response, Swift | 9/24 | No | A$1,915.50 | A$10,042.09 |
| Funded premium | Short response, Steady; BPO and after-call assistance | 24/24 | Yes | A$3,854.50 | A$7,995.65 |

The funded premium earns A$464 more in this settled period than the lean route, while holding A$4,674.91 less cash at minute 420. Its initial commissioning period does not qualify. Period result, cash, service and future supplier exposure are distinct; this one period does not prove long-run superiority. The test also restores a version-1 save with its previous single later lead, rejects forged saved demand, and replays a subsequent command in the Worker.

## Remaining playability questions

- A real visible-control browser journey still needs to show whether a player can find and compare the two leads within the expiry window, on desktop and phone. The generated offer names may need a clearer distinction after that review.
- Run a longer paired portfolio horizon, including renewal and churn, to see whether the premium's period benefit repays its cash commitment and whether service failure changes the next opportunity.
- Run the uncoached human pilot in `docs/GAMEPLAY_PILOT_PROTOCOL.md`. No human participants contributed to this audit, and the comparison does not establish comprehension or enjoyment.

Older version-1 saves keep their previous later offer shape. This change does not alter governance or the full release gate.
