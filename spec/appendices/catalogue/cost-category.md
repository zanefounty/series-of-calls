# Cost category

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| ledger:cost.pops | Service sites and appliances / uc.ledger.cost.pops | REQ-c1f752e25047668d | Retain real facility and underlay costs; add separately priced gateways, room systems, local call-control and media appliances. |
| ledger:cost.optical | Dedicated transport operations / uc.ledger.cost.optical | REQ-02b2e8ad3d9a5570 | Keep in the optional SP underlay module; do not apply optical cost formulas to platform licences or agent capacity. |
| ledger:cost.links | Connectivity subscriptions / uc.ledger.cost.links | REQ-fda595cc920a635e | Retain contracted transport charges and account for physical path commitments independently of application subscriptions. |
| ledger:cost.nni | Partner handoff charges / uc.ledger.cost.nni | REQ-8e7ae338369d840c | Separate transport handoff, SBC interconnect and platform integration charges; no implicit entitlement follows from a port. |
| ledger:cost.transit | Upstream carrier and transport usage / uc.ledger.cost.transit | REQ-4f463b37c26d3f09 | Preserve percentile IP transit billing only where contracted; add PSTN minutes, carrier session pools, number rentals and termination charges. |
| ledger:cost.ix | Shared interconnect membership / uc.ledger.cost.ix | REQ-43bb0138af6b6f93 | Charge for the selected transport or service interconnect. Partner accreditation, licence and feature eligibility are separate. |
| ledger:cost.pni | Dedicated interconnect commitments / uc.ledger.cost.pni | REQ-5a758cb0c74e71ce | Keep physical PNI economics and add separately scoped platform/operator interconnect commitments. |
| ledger:cost.caches | Local service resource operations / uc.ledger.cost.caches | REQ-d64703cc672ae8c5 | Retain content cache costs only for underlay content; separately bill media nodes, transcript processing, local recording and storage. |
| ledger:cost.loans | Financing payments / uc.ledger.cost.loans | REQ-7f795adba72e409a | Preserve debt and fee mechanics; distinguish cash-flow repayments, interest and economic margin to avoid double counting. |
| ledger:cost.extras | Protection and service operations / uc.ledger.cost.extras | REQ-b8b9a7e4418dcee5 | Replace bundled extras with scoped protection, redundancy, provisioning, support and regional obligations. Payment alone does not establish approval. |
| ledger:cost.wholesale | Upstream wholesale charges / uc.ledger.cost.wholesale | REQ-9d689f08b4f7b540 | Use per-contract platform, carrier and partner commercial models. Original Australia-specific charge remains a scenario rule rather than a universal UC tax. |
| ledger:cost.levy | Scenario-specific assessments / uc.ledger.cost.levy | REQ-6ec380b6b6743177 | Retain only an explicitly declared fictional scenario charge; use dated primary evidence if modelling a real requirement. |
| ledger:cost.revshare | Partner and investor revenue share / uc.ledger.cost.revshare | REQ-4333c9327f39df32 | Apply each agreement to an explicit revenue base; prevent counting the same obligation twice. |
