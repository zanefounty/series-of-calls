# Incident mechanic

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| progress.incident-mechanic.entry | DDoS entry point / ucc.incident-mechanic.entry | REQ-2acd052025b38553 | Map the attack to a carrier interconnect, SBC, API gateway, media relay or tenant endpoint. |
| progress.incident-mechanic.flowspec | Router filtering capability / ucc.incident-mechanic.flowspec | REQ-1ed89cc2880b4a60 | Retain network filtering in the underlay; model SIP/API authentication and application protections separately. |
| progress.incident-mechanic.scrub | Scrubbing placement and overflow / ucc.incident-mechanic.scrub | REQ-fde68e7a294f8106 | Retain network scrubbing and transport feasibility; do not treat a filtered IP flood as proof of application recovery. |
| progress.incident-mechanic.delay | Always-on versus on-demand protection / ucc.incident-mechanic.delay | REQ-bea708108573db82 | Give protection modes explicit activation delay and cost; rebalance simulated time for a communications incident. |
| progress.incident-mechanic.cleanpipe | Carrier clean-pipe option / ucc.incident-mechanic.cleanpipe | REQ-15d9ae55b4bd4e7f | Retain carrier protection as a scoped upstream service option. |
| progress.incident-mechanic.blackhole | Emergency target blackhole / ucc.incident-mechanic.blackhole | REQ-f5944af5423e9419 | Retain the consequence that blocking a target also blocks legitimate service; require an explicit affected-service view. |
| progress.incident-mechanic.ix-blackhole | Partially honoured exchange blackhole / ucc.incident-mechanic.ix-blackhole | REQ-e12f66a5f211ad01 | Model partial propagation of an emergency provider policy with stated dependencies. |
| progress.incident-mechanic.sacrificial | Sacrificial interconnect choke point / ucc.incident-mechanic.sacrificial | REQ-c707d15c53bcb4cc | Represent containment on a dedicated boundary with capacity and failover consequences. |
| progress.incident-mechanic.held | Attack-held outcome / ucc.incident-mechanic.held | REQ-4cef15dfd110d05d | Evaluate required customer journeys, information handling and legitimate demand through the entire attack. |
| progress.incident-mechanic.generation | Attack size and duration / ucc.incident-mechanic.generation | REQ-519813883b4bf3fd | Use distinct rates for call attempts, concurrent media and API requests; calibrate legitimate traffic independently. |
| progress.incident-mechanic.recovery | Incident overlap-safe recovery / ucc.incident-mechanic.recovery | REQ-f39afd5a667181de | Keep remaining failures active when one incident resolves; avoid false recovery from clearing an unrelated incident. |
