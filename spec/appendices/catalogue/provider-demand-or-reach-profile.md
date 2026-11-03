# Provider demand or reach profile

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| company-map:traffic-profile:NSH | Workload and channel adoption by customer cohort / demand-profile:NSH | REQ-fef9462a1cfe8568 | Replace one global traffic share with several workload-specific preference and demand distributions. |
| company-map:traffic-profile:NSH_KRX | Region-scoped channel withdrawal event / demand-profile:NSH_KRX | REQ-f692463b2ececdc6 | Apply a fictional offer withdrawal to eligible customers and redistribute the underlying customer needs across remaining channels. |
| company-map:traffic-profile:CN_W | Country scenario demand seed / demand-profile:CN_W | REQ-96015fff373afe7a | Use explicit scenario channel preferences without treating the values as current real market shares. |
| company-map:traffic-profile:RU_W | Country scenario demand seed / demand-profile:RU_W | REQ-9bfea0d0fb024620 | Use explicit scenario channel preferences without treating the values as current real market shares. |
| company-map:traffic-profile:NSH_CN | Country workload adoption profile / demand-profile:NSH_CN | REQ-341a47be8238b899 | Normalise only within eligible channels for the relevant customer and workload; demand and access requirements remain separate. |
| company-map:traffic-profile:NSH_RU | Country workload adoption profile / demand-profile:NSH_RU | REQ-054d4ed5e5d6c6a3 | Normalise only within eligible channels for the relevant customer and workload; demand and access requirements remain separate. |
| company-map:traffic-profile:CN_BLOCKED | Scenario-specific unavailable services / demand-profile:CN_BLOCKED | REQ-3f57e56cfd38d09b | Replace a blanket country/platform switch with dated offer, channel and workload eligibility rules. |
| company-map:traffic-profile:PNI_NETS | Scoped service-chain reachability / demand-profile:PNI_NETS | REQ-b2614456d9583e23 | Traverse explicit supplier agreements and supported interfaces; network reach alone cannot establish application or contract eligibility. |
