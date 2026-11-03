# WP-CAMPAIGN — persistent contracts and progression

Status: specified, pending implementation and acceptance. The four existing compact exercises and initial business milestones remain useful fixtures; they do not satisfy this package. [campaign-obligations.json](campaign-obligations.json) retains all 13 progression levels and 19 goals, their exact source objects, hashes, proposed representation, behavioural contract and failing condition. Narrative adaptations are separate from earning a level.

## Campaign state and decisions

A campaign has an immutable content/rule version, deterministic clock, player group, customers, selected contracts, resource ownership, active scenario instances, incident schedule, evidence windows and reward journal. Each contract snapshots permitted jurisdictions, workload, service quality, ownership/delegation, support operator, information policy, cost limits and accepted alternatives. An update creates a new contract revision; it cannot silently alter a saved assessment.

Expose guided, assessed and sandbox modes. Guided play explains a failing dependency and suggests a next observation; assessed play exposes the obligation and diagnostic evidence without requiring a particular configuration sequence. Sandbox permits the same command paths but never awards assessed completion. Reference solutions are command sequences, not hidden mutations or desired-state equality checks.

Every scenario definition records stable source/requirement IDs, prerequisite capabilities, deterministic initial resources and faults, visible constraints, observation duration, success predicates, failure predicates and recovery steps. Record evidence by scenario revision and configuration generation. Provisioning success, a 202 response and a delivered message are observations, not customer outcomes. A mandatory recording failure remains a contract failure even when the task completes. Changes after acceptance make affected evidence stale and require a new observation window.

## Four cumulative tracks

| Track | Sequence | Required alternatives and isolated failures |
| --- | --- | --- |
| SMB | Buy connectivity; qualify a managed voice/digital offer; provision identities and numbers; handle enquiries; retain case context; reconcile a billing period; recover a supplier incident. | Managed carrier or supported gateway design can pass if within scope. Test unstaffed queue, missing purpose permission, bot containment without task completion and duplicate usage separately. |
| Enterprise | Discover installed cohorts; resolve inventory conflicts; qualify coexistence; stage migration; verify both calling directions and room calendars/peripherals; retain recording evidence; cut over and recover. | Accept eligible dedicated or multitenant components and supported native/interop room paths. Reject stale compatibility proof, cross-tenant alias ambiguity, unsupported firmware, partial cohort failure and rollback after an unrelated generation change. |
| Government | Evaluate a dated scenario boundary; establish eligible administration and support; operate voice/digital service; process and retain records; demonstrate access/export/backup controls and incident recovery. | Alternative in-boundary processing chains can pass. Separate permissions, storage, processing, backup and key custody. A public-cloud region name or price cannot satisfy eligibility. |
| Defence | Establish local support services and information policy; test connected baseline; deliberately disconnect; sustain permitted administrative communications; recover and reconcile delayed records. | Customer-operated and provider-supported local designs can pass where the scenario permits. Fail independently on licence, clock, identity, DNS, certificates, capacity and external control dependencies. No real tactical network or live lab is involved. |

Each track runs under AU, US, JP and EU-wide fictional rules, pinned to the exercise revision. Regional labels are not legal certification or member-state approval. Workloads can be unavailable in a profile; the learner must see the restriction and choose an allowed alternative or decline the bid. A forced universal pass is not an acceptable scenario.

## Evidence, incidents and rewards

Start an observation window only after prerequisites and provisioning complete. Aggregate workload deterministically and retain bounded representative traces plus counts/reasons sufficient to reconstruct grading. Track attempted, delivered, handled, task-resolved, repeated, abandoned and obligation-failed contacts separately. Available skilled people, entitlements, telecom sessions and transport throughput remain independent dimensions.

An incident names its failure domain, trigger clock, affected effective services, detection evidence, eligible mitigations and recovery obligation. The incident event must flow through validated commands. Shared-site risks must affect every dependent deployment; adding a second logical service on the same failed substrate is not diversity. Restores and retries retain lineage and cannot overwrite unrelated later changes.

Awards are immutable journal entries keyed by campaign, source goal and content revision. Post at most once after all predicates pass, using the versioned reward currency and amount. Rendering, replay, duplicate commands, import and stale worker results cannot credit again. Historical source rewards remain in the obligation appendix; no bandwidth-to-seat or source-currency-to-AUD conversion is implied. Loans and grants affect cash separately from operating profit, and internal transfers eliminate on consolidation.

The campaign win requires all four delivered tracks and the required portfolio window, not merely the highest title. Retain failed attempts and the evidence that justified later recovery. A title may remain in history while a current contract is degraded; current readiness is recalculated independently.

## Source goal contracts

### progress.goal.bb — First customer live

At least one non-sandbox customer has provisioned identities, assigned numbers and a successful required voice and message journey with case context.

Failure: Submitted configuration with no effective number assignment must fail.

### progress.goal.tr — External calling operational

Inbound and outbound synthetic external calls pass permissions, ordered routing, carrier admission, signalling and both media directions; an allowed external collaboration join also succeeds.

Failure: An internal extension call or one-way media cannot prove external reach.

### progress.goal.ix — First ecosystem integration

A scoped carrier or partner integration has compatible effective versions, an acceptance trace and an accountable support owner.

Failure: A marketplace listing or configured connector without a tested integration cannot count.

### progress.goal.p5 — Five working partner services

Five distinct service integrations satisfy their own scoped acceptance checks and support ownership; repeated tests of one integration count once.

Failure: Five aliases of one partner service or an unsupported direction cannot reach the target.

### progress.goal.ln — Second site connected

Two distinct customer sites have effective purchased or operated connectivity and a successful required inter-site journey.

Failure: Two endpoints on the same site or a purchased circuit still provisioning cannot count.

### progress.goal.bz — First managed business contract

A non-tutorial bid passes qualification, is accepted by a synthetic customer, and creates versioned obligations and a billing commitment.

Failure: A quote, declined offer or automatically seeded tutorial contract cannot count.

### progress.goal.rd — Continuity proven

Inject a named failure after a baseline observation; required journeys remain within explicit outage and quality budgets through recovery.

Failure: Repairing the primary after an unpermitted outage does not prove continuity, even if the final call succeeds.

### progress.goal.ca — Local media or speech service

A local media or speech deployment meets workload, capacity and location constraints; its licence, identity, time and control dependencies remain inspectable.

Failure: Local media with an external control dependency fails a disconnected-operation claim, while remaining eligible for a connected local-media goal.

### progress.goal.pn — Dedicated carrier interconnect

A dedicated interconnect completes provisioning and acceptance in both required directions, with independent session admission and media evidence.

Failure: An ordinary shared managed carrier offer or one successful signalling response is insufficient.

### progress.goal.scrub — Communications abuse defences

Independent synthetic DDoS, SIP admission and destination-spend controls reject applicable abuse fixtures while an allowed call still succeeds.

Failure: Blocking all calls, adding bandwidth alone or configuring only one protection class cannot pass all required controls.

### progress.goal.c3 — Three-region service footprint

Active eligible contracts serve three distinct geographic markets over the stated observation window, with local support coverage and information flows.

Failure: Three jurisdiction-profile labels on one deployment are not three served markets.

### progress.goal.t2 — Established communications MSP

Meet the pack-defined customer count, support coverage and accepted-integration targets together over a complete billing period.

Failure: Peak customer count before service activation or absence of skilled support invalidates the milestone.

### progress.goal.tb — First sustained service scale target

Maintain the scenario target for concurrent interactions and completion/quality over a full load window; sessions, message throughput and available people have separate units.

Failure: A momentary peak, a bandwidth purchase or technically delivered but unresolved tasks cannot satisfy sustained service quality.

### progress.goal.df — Own service infrastructure

Operate a player- or customer-controlled communications deployment with explicit administration, recovery resources, backup custody and a successful restore exercise.

Failure: A cloud subscription described as private does not establish control of the local operating dependencies.

### progress.goal.m2 — Independent operating sites

Two operating sites survive independent power/site failures and an evaluated shared-risk incident within the continuity budget.

Failure: Two sites behind the same unmitigated power, identity or carrier failure domain fail the independence claim.

### progress.goal.c5 — Five-region portfolio

Five distinct geographic service markets pass their applicable workload and carrier/data-handling constraints, independently of the four jurisdiction-pack labels.

Failure: Duplicating an AU/US/JP/EU label to invent a fifth approval or counting a map pin without active service fails.

### progress.goal.gi — Major enterprise or public-service contract

A complex multi-site enterprise or public-service contract passes the whole acceptance set, including migration recovery, evidence custody and operating support.

Failure: A signed large contract or one successful room join cannot substitute for delivered acceptance.

### progress.goal.t10 — High-volume customer-service target

Sustain the higher pack-defined workload across voice, messaging, meetings and staffed handling with independent capacities and task-resolution targets.

Failure: Increasing agent licences without people, or treating a bot reply as a completed task, fails the target.

### progress.goal.t1 — Sustainable ecosystem operator

Across all four tracks, retain eligible supported services, continuity evidence and positive consolidated operating profit for the declared window.

Failure: A grant, loan drawdown, internal subsidiary transfer or diagnostic-ledger balance cannot manufacture operating profit.

## Verification required before implementation credit

Execute a successful reference solution and a genuinely different valid solution wherever alternatives are permitted. Each important constraint gets an isolated failing fixture. Check reward once-only semantics across save/reload, replay, duplicate request IDs and worker fallback. Check multi-period economics, stale evidence after configuration change, simultaneous incidents, an unresolved bot repeat, recovery without hidden resets and all sixteen track/profile combinations. Browser acceptance must cover desktop/mobile, keyboard operation, diagnostics and offline saves. These are pending acceptance obligations, not test results.
