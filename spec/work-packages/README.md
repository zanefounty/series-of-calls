# Remaining gameplay implementation contracts

These contracts refine the full specification into independently reviewable work. They do not approve exclusions or declare source fidelity complete. Every supplied mapping ID remains authoritative. Parent integration owns the central kernel, generated registers, translations, CI and governance.

| Package | Behaviour and acceptance | Initial assignment |
| --- | --- | --- |
| [Customer needs](WP-CUSTOMER-NEEDS.md) | Independently editable segment requirements, delayed effective profiles and immutable source identity | AC-SOC-438–446, 450, 453, 455; procurement/service-fit consequences remain open |
| [Observed attendance and forecasts](WP-WORKFORCE-ADHERENCE.md) | Separate actual presence/roster eligibility, BPO attendance authority and duration-qualified demand/capacity estimates | AC-SOC-425–430, 447–448, 451, 454; complete specialist workforce planning remains open |
| [Synthetic channel webhooks](WP-CHANNEL-WEBHOOKS.md) | Receipt-bound callbacks, independent observations, provisioned policy, idempotency and deterministic retries | AC-SOC-417–424, 449, 451; full provider API/workflow distinctions remain open |
| Current campaign acceptance | Public-command and visible-control recipes for implemented service/incident/procurement/renewal sequences | AC-SOC-433–437; real-browser execution and remaining source-specific campaigns remain open |
| WP-CALLING | Tenant identities, explicit federation, alias/extension resolution, forwarding/fallback, reception, voicemail, directional quality and synthetic emergency policy | Delegated, AC-SOC-045–052 |
| WP-WORKFORCE | Individual rosters, shift/skill/language availability, entitlements, BPO/customer control, forecasting, coaching and effective service capacity | Delegated, AC-SOC-053–058 |
| WP-ESTATE | Synthetic discovery, mismatch evidence, connector capabilities, joiner/mover/leaver jobs, partial failure/retry, device lifecycle and information export boundaries | Module AC-SOC-059–064 and shared-dispatch integration AC-SOC-115–118 |
| [WP-CHANNELS](WP-CHANNELS.md) | Distinct fictional channel accounts, per-contact permissions, sender eligibility, templates/windows, paused conversations, cross-channel identity and supplier outages | Module AC-SOC-072–078 and central integration AC-SOC-093–098 |
| [WP-PRODUCTS](WP-PRODUCT-COMPATIBILITY.md) | Company/product/offer/instance separation; distinct multitenant/dedicated/premises and specialist capabilities; supported integration features and lifecycle | Fourteen initial family profiles, AC-SOC-085–092; full catalogue fidelity pending |
| [WP-CAMPAIGN](WP-CAMPAIGN.md) | SMB/enterprise/government/defence service tracks, incident recovery, outcome/constraint grading, alternative valid solutions and retained achievement evidence | AC-SOC-107–114 and shared-dispatch AC-SOC-137–140; source level/goal obligations remain pending |
| [Progression implementation proposal](WP-PROGRESSION-IMPLEMENTATION.md) | Candidate evidence contracts for the 13 source levels and 19 goals, with missing runtime evidence called out | The source rows have bounded candidate module mechanics (AC-SOC-141–148, AC-SOC-190–193 and AC-SOC-219–222); selected shared-dispatch/worker/UI paths are covered by AC-SOC-157–160; full source obligations remain pending |
| [WP-ISSUE-EXERCISES](WP-ISSUE-EXERCISES.md) | Bounded synthetic directional-media and carrier-outage exercises based on two historical operator reports | Module AC-SOC-149–156 and selected shared-dispatch/worker coverage in AC-SOC-157 and 159; unsupported report mechanisms remain pending |
| [WP-PORTFOLIO](WP-PORTFOLIO.md) | Concurrent tenant roots in distinct geographic markets, independent contracts and ledger aggregation, shared advancement and selected customer consoles | AC-SOC-161–168, 185–189 and 194; sampled market qualification is covered separately below |
| [WP-ADMISSION-SECURITY](WP-ADMISSION-SECURITY.md) | Independent packet, signalling and destination-spend controls, actual call admission and reconciled usage | AC-SOC-169–176 and 197–200; source infrastructure tiers remain pending |
| [WP-SERVICE-OBSERVATION](WP-SERVICE-OBSERVATION.md) | Consecutive sampled human workloads and transport continuity with retained evidence | AC-SOC-177–184, 190–193, 195–196; explicit fictional thresholds |
| [WP-SHARED-SERVICES](WP-SHARED-SERVICES.md) | Canonical shared-line membership, independent permissions/presence, actual ringing/pickup/park/retrieve and timeout recovery | AC-SOC-201–210, 223–224; no claim of complete vendor-specific calling parity |
| [WP-MARKET-QUALIFICATION](WP-MARKET-QUALIFICATION.md) | Consecutive portfolio samples, distinct markets, actual new external billing, current integration/boundary/support evidence | AC-SOC-211–218, 225–226; further progression proof integration is tracked separately |
| [WP-SPECIALIST-LIFECYCLE](WP-SPECIALIST-LIFECYCLE.md) | Independent sale/renewal/support evidence, exact deployment version, delegated support owner and actual commercial gates | AC-SOC-227–238; synthetic lifecycle records do not establish external support status |
| [Number-porting remainder](WP-NUMBER-PORTING-REMAINDER.md) | Supplier order lead times and response timing beyond the existing single-number cutover/recovery model | AC-SOC-239–249; legacy orders retained separately |
| [Site operations](WP-SITE-OPERATIONS.md) | Actual site ownership, separate failure domains, backup/restore, continuity calls and endpoint migration | Shared dispatcher, UI, restore and historical-evidence tests; bounded scope |
| [Calling achievements](WP-CALLING-ACHIEVEMENTS.md) | Five calling milestone predicates with retained interaction evidence | Original source obligations remain partial |
| [Capability progression](WP-CAPABILITY-PROGRESSION.md) | Nine additional level predicates and combined campaign goal | Positive fixtures and retained-proof validation tracked in acceptance plan |
| [Media negotiation](WP-MEDIA-NEGOTIATION.md) | Independent offers, directional media, typed transcoder sessions and live rerouting | Module, real calling integration and console cases |
| [Product evidence](WP-PRODUCT-EVIDENCE.md) | Delayed, scoped, expiring qualification, boundary and lifecycle evidence | Synthetic eligibility only; research acceptance remains separate |
| [Managed operations](WP-MANAGED-OPERATIONS.md) | Cross-customer meaningful identity changes, partial outcomes, provisioning and actual typed billing | Module, portfolio integration and console cases |
| [Recorded quality review](WP-WORKFORCE-QUALITY.md) | Current recorded voice/case/agent evidence, versioned manual rubric, integration failure/retest and separate per-review billing | AC-SOC-553–579; bounded proposed Queueberry offer, not full actor quality management |
| WP-BOUNDARIES | Dated AU/US/JP/EU rule packs; processing/storage/backup/key/admin/export boundaries; eligibility independent of feature availability | Research plus implementation; no invented approval |
| WP-SP-COMMERCE | Purchased connectivity versus operated infrastructure; explicit capacity/failure dependencies; consolidated external costs and owned-group elimination | Preserve optional SP simulation and typed units |
| WP-CATALOGUE | Every original row/file, distinct proposed identity, narrative treatment, relationships, source parameters and new-upstream additions accounted for | Parent mapping review |

[Journey outcome contract](WP-JOURNEY-OUTCOMES.md) adds explicit task evidence, unresolved customer needs and bounded repeat demand; AC-SOC-079–084 test its isolated engine. End-to-end paths are separately checked by AC-SOC-093–098; isolated tests alone are insufficient.

## Shared implementation contract

Use a self-contained classic-JavaScript factory compatible with Node exports and `source()` worker serialization. All mutations occur on the clone passed by `SOC.dispatch`; clock advancement belongs to the parent kernel. Expose create, command, advance, validate, inspect and fingerprint operations with documented signatures. Optional packs must leave saves without that pack valid. Separate desired, provisioning, effective and observed state. Repeated inspection must not sample randomness, bill or change progress.

Each agent owns only its named module, module tests, optional UI file and handoff notes. Do not change `55-communications.js`, `97-training.js`, generated JSON, translations, source pack, evidence gates or workflows. Document required hooks for the parent. No network, real vendors, credentials, external messages or repository changes. Shell commands start with `rtk`. Tests must prove both success and relevant failure, save validation and deterministic worker serialization. A test receipt is never a substitute for semantic review.

## Humour and fictionalisation

The user's explicit direction is to transpose the original witty comparisons, not flatten them into generic enterprise labels. Retain original fictional identities where their joke still fits. Adapt physical-network comparisons to the actual communications role: queues can have hold-music jokes, a misrouted call can take a scenic route, and a local licence that phones home should be identified as such. Keep the underlying distinction correct. Never convert a carrier's source satire into a factual statement about its real-world analogue.

Names, incident flavour, offers and descriptions may be witty; diagnostics must still expose the exact synthetic dependency, decision, unit and recovery option. Avoid jokes about real customers, protected groups, government eligibility or actual emergencies. Preserve original prose in the source pack and register new wording alongside its source, rationale and review status. Do not mark every joke transposed merely because the source text is present in an appendix.

Research additions: [Cisco VoIP issues](WP-CISCO-VOIP-ISSUES.md), [VoiceOps issues](WP-VOICEOPS-ISSUES.md), [all 94 proposed product/actor/domain profiles](WP-PRODUCT-PROFILES.md). These are specified proposals and obligations, not completion dispositions.

The [fork-inspired transport contract](WP-FORK-TRANSPORT.md) adds explicit leased-IP recovery and measured capacity upgrades with independent seeded gameplay and campaign-scope checks. Pinned fork concepts and pending adaptations are indexed in [the fork research](../../research/forks/README.md).
