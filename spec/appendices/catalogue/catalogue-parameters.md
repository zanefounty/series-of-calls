# Catalogue parameters

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| asset:W: | Map width / parameter:w | REQ-5cdcc484d3f318f8 | Retain map-coordinate extent; independent of service metrics. |
| asset:H: | Map height / parameter:h | REQ-c74aa65743577784 | Retain map-coordinate extent; independent of service metrics. |
| asset:KM: | Geodesic transport distance / parameter:km | REQ-e131f2c4712fa9a4 | Prefer retained geographic route distances; do not infer communications latency from pixels. |
| asset:POP_COST: | Service-site activation cost / parameter:pop_cost | REQ-99e7e9f7ccd2a0e0 | Split carrier/hosting activation, application deployment, implementation and acceptance costs. |
| asset:POP_MO: | Service-site operating cost / parameter:pop_mo | REQ-1242fcda17e01016 | Separate hosting, power, staff and platform subscription costs. |
| asset:EYE_RATE: | Contract revenue by billable service unit / parameter:eye_rate | REQ-d77d2a1ee7411054 | Replace bandwidth-derived retail revenue with explicit seat, room, agent, session, usage and managed-service prices. |
| asset:CACHE_CAP: | Local media/content cache capacity / parameter:cache_cap | REQ-6d003812f5867f46 | Keep transport cache where relevant; model meeting media, recordings, transcript storage and AI compute independently. |
| asset:CACHE_MO: | Local media/storage operating charge / parameter:cache_mo | REQ-0d446b04ab60cc82 | Separate storage, hosting, processing and support charges. |
| asset:DAY_MS: | Business-time simulation speed / parameter:day_ms | REQ-82df929fd3a0a188 | Retain accelerated game clock; use finer interaction-event steps for calls and queues. |
| asset:ROUTER_COST: | Network/SBC/host purchase base / parameter:router_cost | REQ-126ad07728d49823 | Keep underlay router purchase separate from UC appliance activation. |
| asset:ROUTER_MO: | Network/SBC/host operating base / parameter:router_mo | REQ-341f524d2ac89bee | Separate physical-router rent/support from UC runtime cost. |
| asset:GEN_COST: | Site continuity investment / parameter:gen_cost | REQ-55b89a13c75c55fd | Retain power resilience and add UPS/failover design and maintenance. |
| asset:GEN_MO: | Continuity operating cost / parameter:gen_mo | REQ-4290a6b7a346f0d5 | Retain power-resilience maintenance as a service cost. |
| asset:DIVERSE: | Diverse carrier path cost / parameter:diverse | REQ-8f497be48f9a4cd5 | Retain separate-route premium; verify shared physical risks and application failover. |
| asset:RU_BOX: | Scenario-specific local compliance component cost / parameter:ru_box | REQ-74ce096055762170 | Replace the source-country caricature with a dated requirement profile for a defined workload and jurisdiction. |
| asset:RU_BOX_MO: | Scenario-specific local compliance operating cost / parameter:ru_box_mo | REQ-a5490e2cc937a1c1 | Use explicit contract and deployment requirements; no universal per-country compliance device. |
| asset:UAE_LIC: | Country/offer access cost profile / parameter:uae_lic | REQ-41b29143065d362c | Model actual service scope and dated country rules in separate content; do not inherit this source value as real law. |
| asset:KSA_LIC: | Country/offer access cost profile / parameter:ksa_lic | REQ-a91587c983f11fd4 | Model actual service scope and dated country rules in separate content; do not inherit this source value as real law. |
| asset:KR_TRANSIT: | Regional carrier offer cost / parameter:kr_transit | REQ-29938413e3937703 | Use a provider/route/offer price record; preserve the original only as a fictional scenario modifier. |
| asset:AU_TRANSIT: | Regional carrier offer cost / parameter:au_transit | REQ-a2da658d427603ec | Scope transport cost to actual selected carrier routes and campaign balancing. |
| asset:AU_WAVE: | Domestic/international transport cost profile / parameter:au_wave | REQ-78f01227c3643e51 | Keep distinct domestic/subsea/cross-country transport costs; do not apply them to all UC subscription charges. |
| asset:AU_IX: | Regional interconnection cost / parameter:au_ix | REQ-f0372124e9b4a0b2 | Keep a source-game underlay price modifier separately from UC/CC licensing. |
| asset:AU_ARPU: | Segment-specific contract revenue / parameter:au_arpu | REQ-69b93fdaa9a88cf2 | Model seat, room, agent, usage and management revenue by the selected customer contract. |
| asset:AU_WHOLESALE: | Upstream carrier cost ledger / parameter:au_wholesale | REQ-2ceb8aa3659306fa | Use explicit wholesale offers and committed/usage charges rather than a universal revenue percentage. |
| asset:AU_LEVY: | Applicable transport levy/fee record / parameter:au_levy | REQ-2198586b751afea7 | Retain only as a dated applicable transport fee in a country pack, not a blanket UC levy. |
| asset:SITE2_COST: | Second-site deployment cost / parameter:site2_cost | REQ-3617df761f4e0d96 | Split physical site, application replication and commissioning costs. |
| asset:SITE2_MO: | Second-site recurring cost / parameter:site2_mo | REQ-d65746bdc92d0573 | Keep duplicated hosting, connectivity and operating charges visible. |
| asset:TE_COST: | Service optimisation/orchestration activation / parameter:te_cost | REQ-c5cc94d110dd5807 | Retain automated transport optimisation and add independently scoped calling, queue and workflow policy tools. |
| asset:TE_MO: | Service optimisation/orchestration subscription / parameter:te_mo | REQ-993ae092669c1500 | Account for automated transport operations separately from application and customer-service policy tools. |
| asset:BE_TAPE: | Procurement/permit lead-time and cost profile / parameter:be_tape | REQ-923b8c84c5ae98e7 | Replace national joke with explicit per-project permits, approvals and delivery requirements. |
| asset:CN_LIC: | Local market and service eligibility profile / parameter:cn_lic | REQ-568122016e5f433b | Use workload-, offer- and region-specific eligibility; do not turn source mechanics into real legal advice. |
| asset:CN_JV_MO: | Local operating partner contract / parameter:cn_jv_mo | REQ-b3442a22c5b02688 | Represent an explicit partner relationship with defined responsibilities and applicable fees. |
| asset:SCRUB_DELAY: | Protection activation lead time / parameter:scrub_delay | REQ-fcff11b9689de6a2 | Keep activation delay and continuity impact; independently define UC protection controls. |
| asset:SLA_PEN: | Contract-specific service credits / parameter:sla_pen | REQ-fe937f1c4b3fb5a0 | Calculate credits from the failed contracted journey and actual terms, separately from incident recovery cost. |
| asset:SCRUB_FAR_MS: | Protection path latency budget / parameter:scrub_far_ms | REQ-f0e07020459d82ed | Use media and application performance budgets for each workload rather than one universal threshold. |
| asset:MYIX_COST: | Provider hub setup cost / parameter:myix_cost | REQ-6ed39543e15727be | Retain optional physical exchange capex and separately price partner/multi-tenant UC platform setup. |
| asset:MYIX_MO: | Provider hub operating cost / parameter:myix_mo | REQ-c97b3ce81f8d3f64 | Separate switching, hosting, service licences and support staff. |
| asset:MYIX_FEE: | Partner/wholesale offer price / parameter:myix_fee | REQ-db8b49804338cc25 | Price subscriptions, sessions, usage and management by explicit offer rather than uniform member fee. |
| asset:START_CASH: | Starting MSP capital / parameter:start_cash | REQ-6ec5e263c5b9f1b5 | Keep configurable starting capital as campaign balancing in one stated game currency. |
| asset:HW_YR: | Hardware price trend / parameter:hw_yr | REQ-6012118f24acc803 | Apply only to new purchases in affected hardware classes. |
| asset:HW_CAP: | Campaign hardware-price cap / parameter:hw_cap | REQ-fc7dc818ba5e5df8 | Preserve as explicit fictional balancing. |
| asset:HW_FREE: | Campaign price-stability period / parameter:hw_free | REQ-1759fb6694575010 | Preserve as campaign tuning, not market forecast. |
| asset:HW_LOCK_DAYS: | Supplier price-lock term / parameter:hw_lock_days | REQ-324360a1e7c0c19e | Retain the commercial term, price protection scope and expiry. |
| asset:RCAGE: | Physical site density threshold / parameter:rcage | REQ-e3fa65bf1233272c | Use racks, power, ports and room limits for actual selected hardware. |
| asset:CAGE_MUL: | Facility expansion cost / parameter:cage_mul | REQ-1634f16f7e2dcebc | Separate installation effort, power, cooling and rack costs. |
| asset:CAGE_MO: | Facility expansion operating cost / parameter:cage_mo | REQ-aded158d6da08efc | Retain extra facility capacity and recurring charge. |
| asset:ROUTER_RESALE: | Hardware resale and reuse value / parameter:router_resale | REQ-05eed6708829eaf5 | Scope to owned physical assets; subscriptions and non-transferable licences need separate exit rules. |
| asset:RMAX: | Per-site physical capacity bound / parameter:rmax | REQ-7822ad97260a0293 | Set hardware-specific site limits independently from tenant, user, agent and session limits. |
| asset:AMP_EVERY: | Optical amplifier spacing / parameter:amp_every | REQ-7e0372b6e074d865 | Keep only in the physical transport model. |
| asset:AMP_COST: | Optical amplifier purchase cost / parameter:amp_cost | REQ-1b7c8d607db88e5a | Keep as optional SP transport cost. |
| asset:AMP_MO: | Optical amplifier operating cost / parameter:amp_mo | REQ-6137ce6494f24b08 | Keep as optional SP transport cost. |
| asset:PAIRS_MAX: | Physical fibre-pair limit / parameter:pairs_max | REQ-366ae1e7873d5ded | Keep optional owned-transport expansion constraint. |
| asset:PAIRS_BIG: | Expanded physical fibre-pair limit / parameter:pairs_big | REQ-d5d45955f41213e5 | Keep provider infrastructure progression separately from UC scale. |
| asset:PAIRS_LV: | Advanced transport unlock / parameter:pairs_lv | REQ-478d81e642f2b739 | Gate by provider capability and project readiness instead of total customer count alone. |
| asset:SUB_PAIRS_MAX: | Subsea fibre-pair limit / parameter:sub_pairs_max | REQ-05aa16756f76032d | Keep optional advanced-provider infrastructure limit. |
| asset:SUB_PAIR_UP: | Subsea capacity commissioning cost / parameter:sub_pair_up | REQ-7a76eafe86942537 | Keep optional SP transport cost and work dependencies. |
| asset:REGEN_COST: | Optical regeneration setup cost / parameter:regen_cost | REQ-32cbf3bce6117c72 | Keep in optional physical underlay; no direct UC counterpart. |
| asset:REGEN_MO: | Optical regeneration operating cost / parameter:regen_mo | REQ-4cae6c94af0b4ba7 | Keep in optional physical underlay. |
| asset:REGEN_CH: | Per-channel optical regeneration cost / parameter:regen_ch | REQ-17de952391db48c4 | Keep physical optical-unit cost, not a voice or AI licence. |
| asset:REGEN_MAX: | Optical route engineering bound / parameter:regen_max | REQ-91269d68bc7f1619 | Keep source-game optional underlay bound. |
| asset:SUB_REACH: | Subsea optical reach model / parameter:sub_reach | REQ-3fae6de5e36a954c | Keep as a fictional optical transport assumption, independent of codec and meeting behaviour. |
| asset:OWNCAB_LAND: | Owned transport landing cost / parameter:owncab_land | REQ-70ad7a581f52b539 | Keep optional SP physical landing investment; no direct UC application equivalent. |
| asset:OWNCAB_KM: | Owned transport build cost per km / parameter:owncab_km | REQ-9c469cb8eafd08ad | Keep optional SP construction cost; treat as fictional balancing. |
| asset:OWNCAB_OM: | Owned transport operating cost per km / parameter:owncab_om | REQ-e31890395bd1cb15 | Keep optional SP operating cost and separate service/application charges. |
