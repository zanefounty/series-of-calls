# UC/CC roles and remembered consequences

Use these tables as design candidates, not a statement that six careers or every ecosystem product already exists. Verify the current implementation and canonical source mappings. The methods draw on asymmetric economic roles and systemic narrative; see [the research register](../../../../docs/GAME_DESIGN_RESEARCH.md).

## Keep the design axes separate

Business model determines authority, incentives and useful actions. Scale changes geography and coordination. Sector changes the customer's constraints. Workload supplies the problem being solved. A global MSP serving government is a combination of these axes, not an unrelated seventh career.

| Proposed role | Decisions and scarce resources | Observable success and exposure |
| --- | --- | --- |
| Customer IT | Allocate a budget, choose suppliers, schedule migration, manage adoption and acceptance | Staff can call, meet and resolve cases within the promise; disruption and unmet requirements matter |
| MSP | Package and operate services, allocate shared support, automate routine care, retain customers | Recurring margin after actual service and support costs; churn and correlated incidents constrain growth |
| Global SI | Design the architecture, stage cohorts, coordinate suppliers, accept milestones, hand over operations | Usable delivery accepted at milestones; scope, rework and handover obligations consume engineering time |
| RSP/reseller | Choose wholesale terms, package retail offers, manage acquisition, support and renewal | Retail margin and retained service within wholesale commitments; supplier dependence is visible |
| SP | Reserve carrier/interconnect capacity, manage numbering, route traffic and recover failure domains | Delivered wholesale obligations within physical and commercial capacity; congestion and remedies matter |
| Global SP | Place regional capacity, arrange interconnects, diversify suppliers and coordinate cross-region recovery | Regional promises and consolidated margin; correlated failures and boundary constraints matter |

Resolve RSP's intended meaning in the existing spec before implementation. If it means regional service provider, represent regional scale explicitly rather than silently inventing a new legal/business category. Use fictional boundaries and suppliers; these are game mechanics, not real compliance claims.

Start with two roles on the same regional problem and one shared contract. Show how different authority, information, scarce resources and losses lead to different sensible decisions. A role dropdown, shared wallet and identical operation menu do not establish asymmetry. Add further roles only when their different decisions can be demonstrated.

## Make convergence an actual exchange

For a customer/MSP or SI/SP handoff, name the shared contract, parties, scope and lifecycle:

1. Offer with price, duration, scope, available capacity and conditions.
2. Independent acceptance with the correct actor authority and budget.
3. Reservation or provisioning that consumes the supplier's actual resources.
4. Delivered work and acceptance by the party whose promise was made.
5. Settlement, renewal, handover, breach, recovery or cancellation.

Specify who owns each wallet, staff pool, capacity reservation, customer record and responsibility. Paired internal transfers must reconcile once; external costs remain external. Prevent two actors from selling the same reserved capacity. Define partial failure, stale acceptance and idempotent retry. Retain outstanding obligations across career or sector transitions. Test restored saves and worker execution for new shared references.

A single-player game can simulate counterparties. They still need explicit budgets, capacity, willingness and acceptance rules if their decisions are part of the strategy. Label prescribed narrative choices separately from autonomous economic behavior.

## Turn ecosystem breadth into decisions

| Dimension | Candidate consequence to test |
| --- | --- |
| SMB | Limited cash and support; a small complete service and understandable renewal |
| Enterprise | Cohorts, interoperability, adoption and business continuity during migration |
| Government | Procurement and auditable processing boundaries, named acceptance evidence and recovery |
| Defence | Disconnected operation, controlled synchronization and retained losses during autonomy exhaustion |
| Contact centre/BPO/WFM | Staffing, queue promises, context continuity, callbacks, quality and actual resolved cases |
| Calling and collaboration | External reach, federation, guest access, meeting capacity and meaningful follow-up |
| CPaaS and channel partners | Reach and workflow flexibility against delivery failures, retries, permissions and usage cost |
| WhatsApp/Messenger/Slack-like competition | Customer channel preference, substitution, reach, context loss and opportunity cost |
| Video and room ecosystems | Required participants, room/device compatibility, bandwidth and actual completed sessions |
| On-premises/sovereign/hybrid | Ownership, operational responsibility, local processing and continuity tradeoffs |
| Transcription/AI/recording | Capture authority, processing delay, access, quality uncertainty and a later task that uses the result |
| Third parties and distribution | SBCs/carriers, CRM, workforce, recording, endpoints, monitoring and billing create dependencies or recoveries |

Treat Microsoft and Cisco as source-mapped portfolio families with distinctive constraints. Reuse canonical product/source IDs and fictional representations; check current first-party documentation when making product capability claims. Do not add a button for every SKU, assume brand equivalence or declare parity because a generic mechanic exists. Preserve domain depth through situational choices and optional specialist play.

## Write story through state

For each story beat, define the customer/person and their need, the promise the player can make, the command and observed result that establish it, and the later behavior that changes. Reference actual customer, case, meeting, contract and migration IDs.

A compact event contract can contain eligibility, priority, exclusions, expiry, repeat/cooldown rules, displayed choice, state effects and follow-up options. Use deterministic selection where replay requires it. Test unreachable content, empty eligible pools, repetitive events, starvation by high-priority events, contradictory simultaneous beats and save/reload duplicates.

Keep state changes in commands or explicit time advancement; narrative rendering observes them. A completion line must not congratulate an unprovisioned service. A transcript should affect a follow-up, action owner, dispute or quality decision, not merely increment a badge. A customer can remember late delivery even after technical recovery.

Before a chapter transition, show what the player achieved, which responsibilities remain and why the next opportunity exists. Preserve a clear next action. Use new options and changed relationships where they communicate consequence better than extra prose. Keep source-linked humor recognizable and appropriately placed, without turning an actual failure explanation into a joke the player cannot understand.

Useful current entry points: `src/game/23-provider-partner-paths.js`, `src/game/23-provider-responsibility.js`, `src/game/23-provider-policy.js`, `src/game/23-provider-case-handoff.js`, `src/game/23-provider-case-followup.js`, `src/game/88-narrative.js` and `content/narrative.json`. Locate the relevant current symbols before editing.
