# Revenue category

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| ledger:revenue.eyeballs | Managed UC subscriptions / uc.ledger.revenue.eyeballs | REQ-ea7a11efa0522fa8 | Use provisioned and billable seats, rooms and service plans. EYE_RATE=150 is original revenue per served Gbit/s, not a growth rate or UC seat price. |
| ledger:revenue.business | Enterprise and CC contracts / uc.ledger.revenue.business | REQ-c783e38b75adfa9c | Separate recurring seats, agent licences, usage, implementation, support and outcome terms; staff capacity and platform entitlements remain distinct. |
| ledger:revenue.ix | Wholesale partner services / uc.ledger.revenue.ix | REQ-c27b37e49d6be33a | Bill separately scoped interconnection, hosted platform and wholesale support services; never infer downstream application compatibility from membership. |
| ledger:revenue.grant | Contracted incentive or grant / uc.ledger.revenue.grant | REQ-8936c6e2b63c8350 | Retain eligibility and expiry as scenario terms. Grants do not confer service certification or procurement eligibility. |
