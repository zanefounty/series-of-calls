# Customer requirement

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| requirement:lat | Media and interaction latency / uc.requirement.lat | REQ-b97f0583790aa326 | Retain one-way path budgeting for transport; add workload-specific media, response and processing budgets. |
| requirement:nni | Required operator or platform interconnect / uc.requirement.nni | REQ-af6096409dd9b816 | Validate the specified carrier/integration plus its transport and application capacity. An NNI alone does not prove Teams or Webex feature support. |
| requirement:diverse | Independent service failure domains / uc.requirement.diverse | REQ-3159a31f130a26b5 | Evaluate carrier, site, identity, SBC, application, storage and power dependencies. Two logical connections can share one failure. |
| requirement:sharks | Required terrestrial route / uc.requirement.sharks | REQ-8db57f4c0250611c | Keep as an explicit physical-path contract condition when feasible. Do not reinterpret it as sovereignty or deployment eligibility. |
| requirement:nocog | Excluded supplier or processor / uc.requirement.nocog | REQ-4435bf0f66622abf | Use a contract-specific supplier exclusion with rationale and scope; keep the original anti-Cogentle rule as fictional source behaviour. |
| requirement:ipv6 | IPv6 support across the service path / uc.requirement.ipv6 | REQ-8e588a024faa90c6 | Evaluate IPv6 support at endpoints and dependencies. The original predicate only checks connectivity to Drizzle Electric and is not an IPv6 capability test. |
| requirement:netchill | Required meeting or media integration / uc.requirement.netchill | REQ-559c9fba36600a27 | Check required meeting/joining features and supported deployment. A content cache or PNI is not a conferencing integration. |
| requirement:gen | Backup power for required sites / uc.requirement.gen | REQ-e95b5f886afdcf69 | Apply to physical service dependencies and required operating duration. Cloud service availability is a separate dependency. |
| requirement:routers | Redundant gateways or media nodes / uc.requirement.routers | REQ-fe6f0451a4762f4d | Retain router resilience for underlay and independently evaluate SBC, call-control and meeting-node resilience. |
| requirement:local | Local calling or media breakout / uc.requirement.local | REQ-fabe101edf30bef1 | Verify local egress and emergency/service routing where required; local media does not imply local processing or storage. |
| requirement:metro | Independent facilities per required region / uc.requirement.metro | REQ-237a6f5d94abc8a5 | Check actual facility separation and dependent services; add a recovery objective. |
| requirement:twoup | Independent upstream providers / uc.requirement.twoup | REQ-981d6ef3229a8461 | Count providers and underlying dependencies. Do not treat having zero upstream providers as satisfying resilience. |
| requirement:china | Required regional service availability / uc.requirement.china | REQ-b2d1a95733c1d919 | Use named regions, carriers, service availability and workload handling conditions. Replace a generic premium-route test. |
| requirement:scrubbed | Required managed protection / uc.requirement.scrubbed | REQ-40b07688e5d6cfa4 | Evaluate network DDoS, signalling abuse, account controls and fraud controls separately. |
| requirement:scrubnear | Protection processing in permitted regions / uc.requirement.scrubnear | REQ-e8e81c318513bc8e | Check both latency and permitted processing geography for the selected protection capability. |
| requirement:puns | Customer branding preference / uc.requirement.puns | REQ-fb036142cb466478 | Keep as optional humour and preference. It must not satisfy a technical or information-handling requirement. |
