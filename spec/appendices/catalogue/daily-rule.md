# Daily rule

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| progress.daily-rule.clock | Daily simulation tick / ucc.daily-rule.clock | REQ-833ea207effa9175 | Use coarse business time and shorter deterministic interaction/workforce steps. |
| progress.daily-rule.partner | Partner lifecycle updates / ucc.daily-rule.partner | REQ-e897d05761d61c46 | Order partner, pricing, provisioning and ownership updates explicitly before demand evaluation. |
| progress.daily-rule.attack | Active attack tracking / ucc.daily-rule.attack | REQ-33abf92ba440bad7 | Record worst required-journey outcome and unmet legitimate demand through the event. |
| progress.daily-rule.clean | Clean-service streak / ucc.daily-rule.clean | REQ-4eba88d86a343e5f | Use a clearly named service-completion metric and explicit measurement window. |
| progress.daily-rule.licence | Pending licence approval / ucc.daily-rule.licence | REQ-76b1463fc68607e8 | Approve only the specific offer/deployment evidence represented by the scenario. |
| progress.daily-rule.recovery | Timed incident recovery / ucc.daily-rule.recovery | REQ-04a7628f32e7e654 | Re-evaluate all dependencies after recovery and preserve overlapping failures. |
| progress.daily-rule.adoption | Customer growth and churn / ucc.daily-rule.adoption | REQ-1e69104925107564 | Model adoption by job and persona, alternatives, quality, migration friction and contract commitments. |
| progress.daily-rule.cash | Daily cash accrual / ucc.daily-rule.cash | REQ-95dee667112522eb | Keep a consolidated ledger with allowances, usage, staff, wholesale costs and payment timing. |
| progress.daily-rule.history | Operating history / ucc.daily-rule.history | REQ-d979e61b0ad519e2 | Store comparable service, quality, outcome, volume, finance and incident measures in bounded history. |
| progress.daily-rule.progression | Level advancement / ucc.daily-rule.progression | REQ-8d0f000296560077 | Advance when scoped operational milestones and accepted contracts meet the new criteria. |
| progress.daily-rule.construction | Infrastructure delivery and delays / ucc.daily-rule.construction | REQ-ae50bfefeb8188ad | Apply delays to equipment delivery, number porting, customer readiness and integration acceptance. |
| progress.daily-rule.sla | Protection SLA penalty / ucc.daily-rule.sla | REQ-6d08360654b4fe33 | Use explicit contract service/artefact requirements and charge each distinct breach according to its terms. |
| progress.daily-rule.mood | Business satisfaction and churn / ucc.daily-rule.mood | REQ-951008decb386486 | Track resolution, continuity, missing records and customer effort; preserve a useful grace period and actionable warnings. |
| progress.daily-rule.members | Own-exchange membership growth / ucc.daily-rule.members | REQ-756715e75362bf7e | Grow a wholesale partner programme after evidence-backed onboarding and successful tenant delivery. |
| progress.daily-rule.loan | Loan daily/monthly processing / ucc.daily-rule.loan | REQ-eaf9425650b7d2f3 | Run finance only after consistent service revenue/cost updates and contractual breach calculation. |
| progress.daily-rule.offers | Customer offer generation / ucc.daily-rule.offers | REQ-03f4ff46478d1afc | Generate requirements-based contracts by segment, geography, workload and player capabilities. |
| progress.daily-rule.failures | Failure schedule / ucc.daily-rule.failures | REQ-852fef77e024152a | Scale incident exposure by actual dependency and change complexity, with deterministic replay. |
| progress.daily-rule.events | Market-event schedule / ucc.daily-rule.events | REQ-75d70824ab5382e6 | Schedule visible product, demand, partner and jurisdiction changes with scoped impact. |
| progress.daily-rule.payday | Monthly income visualisation / ucc.daily-rule.payday | REQ-262ae2feef351cba | Show revenue by customer/service and distinguish revenue from operating margin. |
| progress.daily-rule.bankruptcy | Cash failure state / ucc.daily-rule.bankruptcy | REQ-58046620cc6edbab | Retain a visible game solvency boundary and funded recovery options. |
| progress.daily-rule.autosave | Daily autosave cadence / ucc.daily-rule.autosave | REQ-b749dae3c8d34885 | Retain autosave while versioning the UC state and deterministic seed. |
