# WP-PRODUCT-PROFILES — organization, product and deployment catalogues

**Status as of 2026-11-03: specification only; all 94 mapped additions remain pending full implementation and dated evidence.** This package does not mark an item complete because a shared mechanic or a similar foundation archetype exists. The row-level obligations are in [`product-profile-obligations.json`](product-profile-obligations.json); each record retains the full source row, stable `sourceID`, original notes and proposed implementation text.

## Scope and accounting

The preserved source is `research/source/series-of-calls-full-mapping.json`, SHA-256 `a971dd4fca10b44d258288b790631a963987999a272d1b5bc1780f31550c18af`. This package selects all 94 rows whose ID begins `uc-new:`: 51 ecosystem actors, 14 product families, 4 customer-segment profiles and 25 domain capabilities. The source row is retained without field/value changes in the registry as parsed JSON under `sourceRecord`; the original source pack remains authoritative.

Every row receives an individual fictional representation, configuration surface, dependencies, capability/delivery rule, typed units where applicable, positive and negative acceptance obligations, current mechanic links and explicit gaps. Family rows reuse the mapped playful names (including Microsnoft and Disco). Actor aliases and their role-specific satire are proposed synthetic text, not claims about real organizations; owner review is still required. The original names, examples and implementation notes remain source context, not assertions made by the game.

## Modeling boundaries

Keep these objects separately addressable and independently versioned:

- **Organization and role:** who owns, sells, distributes, integrates, operates or supports a service, with scope and authority. A supplier or role row does not own every associated product and does not itself operate a service.
- **Product family and offer:** what capability is defined and what edition, entitlement, usage rule and sale condition is selected. A family name is not an orderable offer.
- **Deployment:** where and how a particular product version is instantiated, including tenancy, location, dependencies, operator and lifecycle. Multitenant, dedicated, hosted, premises, government and local/disconnected modes are not aliases.
- **Integration:** a scoped, directional, versioned relationship with explicit feature subset, prerequisites, authentication, support owner and evidence. A marketplace listing, certification label or vendor assertion does not prove all features work.
- **Customer segment:** a synthetic set of needs and constraints. Scale, sector, geography, sensitivity, personas and workloads remain separate fields. A sector name never grants eligibility.
- **Domain capability:** an operational object or behavior. Configuration and entitlement establish possible capability; only a valid path and observed synthetic execution establish delivery.

Product and delivery acceptance must be separate. A feature may be configured or licensed while the path fails due to identity, carrier, session admission, media, channel permission, staff, information boundary or another named dependency. Tests must retain the specific result and failure reason, not award delivery from a catalogue label.

## Grouped implementation contracts

The JSON registry is the canonical source-by-source acceptance checklist. These groups explain shared contracts without treating shared mechanics as implementation of every row.

| Source group | Required distinct behavior | Units and important negative cases |
| --- | --- | --- |
| 51 `uc-new:actor:*` organization profiles | Synthetic organization identity and role relationships; separately linked families/offers, contract parties, operator, support owner, authority, and evidence. The source roles cover UC/CC, workforce, provisioning, rooms/interop, assurance, recording/information processing, programmable communications, devices, SBCs and carriers. Each actor has an individual fictional alias and role-specific flavour in the registry. | Role-sensitive measures may include named seats, agents, sessions, numbers, messages, API calls, rooms, support hours or GB, but no unit is implied by the organization name. No real-world feature, region, price, version, certification, eligibility or integration is inferred. Disco Collaboration remains separate from the Disco 8K hardware rows; Verint/Calabrio family rows stay independently versioned. |
| 14 `uc-new:family:*` product families | Preserve each mapped family as a child of its fictional organization. Select an offer/version, deployment model, entitlement, prerequisite set and scoped integration before claiming capability. The rows distinguish workplace phone, meetings/rooms, CC, communication APIs, government/local modes, dedicated/premises UC, programmable engagement and provider operations. | Seats, sessions, rooms, storage and versions are not interchangeable. No family label implies current availability, supported version, procurement eligibility, feature parity or successful delivery. |
| 4 `uc-new:segment:*` customer profiles | SMB, enterprise, government and defence seed editable synthetic needs. Keep employee scale, sector, geography, workload sensitivity, personas, workload mix, administration, support and outcomes independent. | Employees, sites, seats, agents, rooms and workloads retain distinct dimensions. Government/defence labels confer no approval or permission and cannot bypass an eligibility check. |
| 25 `uc-new:domain:*` capabilities | Implement the source-specific state and dependency graph as a separate subsystem or explicit kernel capability. The domain rows cover commercial roles, workforce, journeys, messaging, CPaaS workflows, signalling, media, directory/dialplan, number porting, emergency routing, room joining, identity, recording, speech processing, information lineage, sovereignty, eligibility, product evidence, discovery, provisioning, migration, journey testing, pricing, substitution and continuity. | Use the row's `typedUnits`; never convert seats to people, bandwidth to sessions, sessions to minutes or processor capacity to staff. Reject missing, stale, unsupported and unauthorized dependencies; inspection is pure; failures and recovery remain observable. |

The mapped role-level distinctions for the 51 ecosystem actors are individual rows, not a single generic vendor template: contact-centre and workforce suppliers; Teams-oriented CC applications; UC lifecycle/provisioning and assurance; conference/room management and interop; monitoring and recording; meeting assistants and speech processing; CPaaS/channel suppliers; collaboration and UC/CC portfolios; SBC/gateway suppliers; personal and room devices; carriers. The registry records each row's source `uc_role`, its own implementation text and unique acceptance anchors.

## Existing mechanics and evidence boundary

The row records link to the current implementation register by behavior ID where a related mechanic exists. A link labelled **shared mechanic analogue** means only that the cited behavior is relevant infrastructure or a narrow adjacent mechanic. **Closest archetype only** means the product catalogue row itself is not modeled. These do not close the source-specific gap. Current examples include:

- Workforce, journey and commercial-role rows point to mechanics for queues, case handling, contracts, campaign progression or outcomes. They do not establish the complete roster, workforce authority, forecasting, typed economics or role-specific supplier catalogues.
- Product-evidence and substitution rows point to commercial/catalogue mechanics; these do not establish all 14 new family rows, current versions, support lifecycle or per-offer evidence.
- Room joining, recording, speech processing, information lineage and sovereignty rows point to narrow meeting or information-chain mechanics; these do not complete all interop modes, assistant products, retention/export paths or regional rules.
- Provisioning, migration and continuity rows point to service-operation and migration mechanics; discovery, connector coverage, full cohort recovery and disconnected survival remain independently required.
- Media, emergency and discovery now have partial source-linked mechanics through the integrated packs. Messaging and journey-testing still lack exact source links. None of these links establishes a complete domain.
- Segment rows link to the campaign archetype mechanic only; an archetype is not a complete segment profile. Actor rows have no exact organization-profile behavior link. Family rows are at most analogous to limited existing product archetypes.

The exact per-row `currentMechanicLinks` and `remainingGaps` are machine-readable. Behavior/test IDs are copied from `spec/implementation.json`; they identify the currently registered evidence scope only. Any local tests or unregistered work do not count as accepted coverage until the implementation and evidence registers are updated and reviewed. A row becomes complete only after its distinct positive and negative obligations pass, the dated evidence is recorded, and the owner accepts the representation. No feature, joke, or inferred percentage substitutes for that review.

## Acceptance and humour

Acceptance follows the common atomic-configuration and state-layer contract: invalid changes leave state unchanged; failed provisioning preserves the prior effective generation; inspection does not advance time or mutate state; and delivery checks traverse the configured dependencies. Each registry entry provides at least two positive and two negative obligations grounded in its original mapped implementation. Add scenario fixtures and dated evidence per source identity as work is implemented; do not merge rows solely to reduce test count.

Satirical wording belongs only in `fictionalRepresentation.roleSpecificSatiricalFlavour`. It should clarify the mapped role (for example, a headset licence cannot answer a call for an unavailable person, and an API acknowledgement is not channel delivery) while leaving diagnostics literal. Do not attribute satire, prices, outages, capabilities or approval to a real supplier or customer. Keep emergency, government eligibility and protected groups free of jokes.

## Dependencies and ownership

This package refines the existing domain, configuration, workload, infrastructure, commercial, jurisdiction and architecture contracts; see `spec/02-domain.md` through `spec/10-acceptance.md` and the complete catalogue appendix. Kernel, business, UI, register, translations and governance edits are outside this package. The implementation owner should expose optional capabilities through validated shared commands and worker execution, preserve saves without optional packs, record evidence dates, and update generated trace/evidence registers only through the project-owned workflow.
