# Company data field

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| company-map:network-field:asn | Transport ASN and separate service-provider identity / provider-field:asn | REQ-5dc4612e0ee0533b | Retain ASN for underlying IP transport only; introduce organisation, tenant and service identifiers independently. |
| company-map:network-field:auIx | Regional interconnect participation override / provider-field:auIx | REQ-b1f0dbd29ebccce0 | Represent country/region-specific offer and interconnect participation without assuming service availability. |
| company-map:network-field:blurb | Fictional provider description / provider-field:blurb | REQ-3cb3c08b5390c2f4 | Rewrite descriptions around supported services and gameplay differences. Keep factual vendor evidence elsewhere. |
| company-map:network-field:cache | Edge media and information-processing capabilities / provider-field:cache | REQ-154bf90d165dbd20 | Separate event content distribution, live media relay, recording and local speech processing. |
| company-map:network-field:cn | Country-scoped scenario profile / provider-field:cn | REQ-244d32ce9e7e7f5c | Replace a single flag with explicit geography, availability and workload requirements. |
| company-map:network-field:col | Provider visual identity / provider-field:col | REQ-5e497c03b77fc963 | Retain a stable accessible colour independent of performance, sector or eligibility. |
| company-map:network-field:far | Regional cost and support adjustment / provider-field:far | REQ-906ee8c08388cb3c | Keep a regional pricing driver only where tied to a named supply or support cost. |
| company-map:network-field:freeLv | Commercial qualification or discount milestone / provider-field:freeLv | REQ-fab25235fe078ade | Remove universal level-based entitlement; use explicit partner agreement and offer scope. |
| company-map:network-field:id | Provider identity / provider-field:id | REQ-15786a7a4b365e7f | Retain stable provider IDs for save migration and relationship references. |
| company-map:network-field:ix | Transport exchange presence and application ecosystem memberships / provider-field:ix | REQ-6d1437f738c4caa1 | Keep transport connections where useful; represent application integration, certification and marketplace listing separately. |
| company-map:network-field:kr | Country-scoped charging profile / provider-field:kr | REQ-33c4ec176ba127f9 | Replace a country-wide shortcut with the actual fictional offer rules and unit costs. |
| company-map:network-field:minIx | Partner eligibility threshold / provider-field:minIx | REQ-b9d66c760a1f8857 | Use relevant service volume, support readiness or scoped programme prerequisites; re-author units. |
| company-map:network-field:minPni | Dedicated interconnect eligibility / provider-field:minPni | REQ-9d69c70d50719faf | Use concurrent sessions, capacity commitments and technical acceptance for a particular offer. |
| company-map:network-field:name | Provider display name / provider-field:name | REQ-6b71c768c3e539e8 | Keep the fictional company name, or use the explicit replacement in its company row. |
| company-map:network-field:paidFee | Fixed access or subscription fee / provider-field:paidFee | REQ-a6a508276ebe2ae1 | Charge the relevant tenant, licence, interconnect or support unit with explicit billing period. |
| company-map:network-field:perG | Metered communications charge / provider-field:perG | REQ-8296c99a40a7253c | Replace Gbps charging with the purchased service unit such as minutes, messages or processing. |
| company-map:network-field:pol | Partner onboarding and access policy / provider-field:pol | REQ-e18f93879351d7cc | Define self-service, qualified, negotiated or paid offer access; test service compatibility separately. |
| company-map:network-field:pops | Provider footprint and operating locations / provider-field:pops | REQ-0590168bc3874c62 | Retain map footprint as scenario geography; distinguish media, control, storage, processing and support locations. |
| company-map:network-field:premAt | Locations where a premium offer can be supplied / provider-field:premAt | REQ-bfadde13621b432a | Store offer and region availability separately from provider physical footprint. |
| company-map:network-field:premOnly | Locations restricted to a specific offer / provider-field:premOnly | REQ-0f9a4367781732e1 | Make each restriction a dated, scoped catalogue or scenario condition. |
| company-map:network-field:premium | Optional premium interconnect or service offer / provider-field:premium | REQ-135f21a7dd85df6e | Represent named service options with measurable performance and support obligations. |
| company-map:network-field:price | Offer pricing schedule / provider-field:price | REQ-7445740ba9cc947d | Define seat, session, minute, message, API, storage, support and project charges separately. |
| company-map:network-field:share | Workload-specific adoption and demand / provider-field:share | REQ-b61cd1c24c60c32e | Track customer needs and channel choices separately for voice, meetings, messaging and customer service. |
| company-map:network-field:tail | Small specialist-provider category / provider-field:tail | REQ-3bfc2fd6e1751631 | Retain a small-provider tag for discovery and scale; do not let size imply low capability or trust. |
| company-map:network-field:type | Commercial role and product-family roles / provider-field:type | REQ-7c58787fc1938c51 | Replace one exclusive network type with multiple roles and separate product offers. |
| company-map:network-field:up | Purchased services and supplier relationships / provider-field:up | REQ-09cefa82117e41a6 | Replace generic transit reach with explicit supply contracts and per-service entitlement. |
