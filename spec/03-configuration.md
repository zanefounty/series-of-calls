# Configuration and administration contracts

Every configurable product has four independently inspectable layers. Desired configuration is the accepted user intent. Provisioning records its generation, queued steps, due time, dependencies, failures and retry status. Effective configuration is the last successfully applied generation. Observed state derives from effective configuration, current faults, connectivity, permissions and resource availability. A submitted order does not establish a ready deployment; a ready deployment does not establish a successful journey.

Commands validate types, units, identity scope and structural references before changing state. Invalid commands are atomic: they leave state and clock unchanged. A failed provisioning change preserves the old effective configuration and exposes the rejected generation and reason. Recovery is another change with its own provisioning progression, not an unlogged reset.

## Administration workflows

| Surface | Configuration sequence | Readiness and diagnosis |
| --- | --- | --- |
| Identity Grove | Create identity; establish membership and directory scope; assign entitlements; provision endpoint or shared account | Missing user, entitlement, delegation, external identity or stale mapping remain separate reasons |
| Workplace Phone | Select supported multitenant offer; connect directory; choose managed, direct-carrier or gateway connectivity; allocate numbers; normalise; order routes | Route decisions expose the first matching rule, scope, destination and exhausted resource |
| Disco Dedicated/Premises | Deploy supported version and local services; configure trunks and application links; register endpoints; establish survivability | Dedicated resources, version compatibility and local dependencies are separate from multitenant entitlement |
| Carrier console | Order numbers and coverage; configure interconnect; assign session limits and signalling/media parameters | Number ownership, porting progress, carrier support and each media direction are inspectable |
| Contact centre | Provision voice/digital entry; IVR; queue; skills/languages; callback/transfer; agent entitlement; workforce integration | Separate entry failure, queue policy, skill mismatch, shift availability, capacity and downstream application failure |
| People Orchard | Establish operator; define cohorts, skills, languages, shifts, handling and wrap-up; choose digital concurrency | Customer-operated staffing is read-only to a technology supplier; entitlement and people remain independent |
| Connective/channel console | Register synthetic channel account; approve templates; configure workflow, callbacks, retry/idempotency and human handoff | Show authentication, approval, rate-limit, delivery receipt, deduplication and case-context decisions |
| Room console | Provision room account/calendar; choose device mode; assign entitlement; update firmware/peripherals; select native/guest/bridge joining | Device health, booking, invitation parsing, joining and media placement are independent checks |
| Lifecycle console | Discover; resolve identities; propose plan; validate; cut over cohort; test; recover | Inventory confidence and stale identifiers are visible; failed cohort does not invalidate unrelated users |
| Recording/governance | Select capture policy and consent; map identities; route to archive; configure access, retention and legal hold | A successful call with missing mandatory evidence fails the contract |
| Processing console | Choose source artefact, operation, language, model/deployment, capacity, region, licence and destinations | Captions, persistent transcripts, translation, redaction, summaries and indexes have separate permissions and lineage |
| Infrastructure console | Define topology, physical units, shared risks, local DNS/time/PKI/licensing and maintenance resources | A local media node may remain dependent on cloud control; an alternate link may share the same failure domain |

The foundation exposes sixteen forms grouped by these console styles. It currently models only the explicit fields in `content/contracts.json`; advanced workflows in this table remain specification obligations. In particular, selecting a carrier model currently records configuration but does not yet implement every distinct onboarding workflow. It must not earn full carrier-model acceptance.

## Bulk changes, concurrency and recovery

Each accepted command carries an optional expected revision and request ID. A mismatched expected revision fails before mutation. Repeating the same request ID and payload returns the same state without a second charge or interaction. A request ID reused for another payload fails. The foundation retains a bounded receipt history; durable retry windows and expiry semantics must be specified before production-scale workflow acceptance.

Bulk provisioning needs per-item progress and an explicit all-or-nothing versus partial-success contract. A migration plan records the discovery snapshot and target compatibility. Preflight refuses an unready target. Cutover moves only the selected cohort; old routes and integrations remain until their replacements become effective. Rollback uses a versioned checkpoint, preserves intervening business records and identifies changes that cannot safely be reversed. The current checkpoint facility restores desired resource configuration; it is not a full transactional migration implementation.

## Diagnostic contract

Every failure includes the affected object, attempted operation, state generation, first blocking condition and supporting transitions. Warnings must distinguish an invalid configuration from valid but unavailable service. The inspector can show all downstream symptoms while identifying the earliest failed dependency. Synthetic protocol codes are generated from the transition path: a displayed `200_OK` requires simulated signalling success, and a one-way-media diagnosis requires independently evaluated media directions.

## Product family, offer, deployment and integration profiles

The initial `soc-products-1` pack represents fourteen researched families with fictional names. A family advertises possible capabilities and supported deployment modes; an offer selects an edition, typed charging unit, quantity, feature set, dependencies and lifecycle policy; a deployment snapshots effective configuration after provisioning. A source organisation is not itself a deployment. Local processing, local media and disconnected control remain distinct features.

Directional integration evidence binds both deployment IDs, effective generations, product versions, features and scope. A passing synthetic test says only that this scenario path was verified. It is not vendor certification. Changing a participating generation invalidates the proof; reversing the integration requires separate evidence. End of sale and end of support have separate effects and must not silently delete deployment history.

Bindings connect supported features to actual core resources. A failed or stale binding blocks the relevant call, room join or processing path while leaving its dependency explanation inspectable. An unbound catalogue profile is descriptive configuration, not an operating service. Current binding support is intentionally narrower than all fourteen family capability lists; unsupported bindings fail explicitly. AC-SOC-085–092 test this initial surface and AC-SOC-104–106 challenge imported compatibility evidence. Every distinctive source family and specialist workflow still requires its own reviewed implementation scope.

## Scoped product evidence and upgrades

The optional product-evidence console requests a proof for one desired deployment, declared feature, evidence dependency and actual resource. A qualification must have a retained fictional qualification event, current authority and unexpired scope. Jurisdiction evidence must pass the effective resource-bound flow contract; lifecycle evidence must match the actual offer, mode and version. Provisioning occurs on an explicit clock tick. A request is not effective evidence. Effective evidence expires after 60 simulation minutes, and configuration generation changes or explicit revocation withdraw availability. These are synthetic scenario facts; no external approval is asserted. The accepted research register remains independent.

A product integration keeps the deployment versions and generations it tested. Updating a deployment does not carry that result forward. The explicit integration scope-update command preserves the old result in bounded history, updates the desired scope and clears current verification. A fresh successful compatibility test is required before the feature can become available again. This allows recoverable upgrades without silently treating stale tests as current.

Historical milestone evidence must remain distinct from live readiness. Product deployments retain prior effective configuration generations for this purpose; an earned award can refer to an older proven generation while the current service is unavailable or being upgraded. History is bounded at 100 previous configurations and 100 integration scope updates. Reaching the limit rejects the next change explicitly rather than silently deleting evidence referenced by an award. Each historical configuration is checked against its own retained offer, family, mode, features and bindings.
