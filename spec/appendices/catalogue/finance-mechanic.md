# Finance mechanic

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| progress.finance-mechanic.annuity | Amortising loan / ucc.finance-mechanic.annuity | REQ-6b8da86b19841657 | Keep principal, rate, instalments and remaining term; rebalance game offers. |
| progress.finance-mechanic.equity | Revenue-share equity / ucc.finance-mechanic.equity | REQ-3fddd16f8da0c964 | Track continuing share of the explicitly defined revenue base and covenant dilution. |
| progress.finance-mechanic.transit | Transit-spend repayment / ucc.finance-mechanic.transit | REQ-ffcecda9d78585ee | Replace a transit-spend repayment base with an explicit wholesale revenue or spend base; avoid ambiguous double counting. |
| progress.finance-mechanic.balloon | Balloon loan / ucc.finance-mechanic.balloon | REQ-2e9e24c5e02f3189 | Retain maturity cash exposure for device and platform deployments. |
| progress.finance-mechanic.storm | Incident-sensitive interest / ucc.finance-mechanic.storm | REQ-e2d9f4a22daab28e | Retain as a fictional availability-linked financing offer, driven by specified incident severity. |
| progress.finance-mechanic.astro | Random monthly interest / ucc.finance-mechanic.astro | REQ-cf44bfc34792c4d5 | Retain only as an optional novelty finance challenge. |
| progress.finance-mechanic.bigloan | Oversized-loan revenue share / ucc.finance-mechanic.bigloan | REQ-c85eb9e2027bc1ea | Keep concentration and financing costs explicit for large rollout programmes. |
| progress.finance-mechanic.breach | Covenant enforcement / ucc.finance-mechanic.breach | REQ-c4e71bbc2a7447c8 | Evaluate exact contractual conditions independently from credit score. |
| progress.finance-mechanic.offers | Loan offer lifecycle / ucc.finance-mechanic.offers | REQ-9cdc1be4085224f9 | Retain expiry, distress offers and suppression when funding is unnecessary. |
| progress.finance-mechanic.collections | Distress service interruption / ucc.finance-mechanic.collections | REQ-966618ff9540ed24 | Replace threatening flavour with a fictional contracted equipment/service suspension event. |
