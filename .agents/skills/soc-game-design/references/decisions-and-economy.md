# Decisions, economy and objective integrity

Use this reference for a concrete design question. These are investigative methods, not new release gates or a claim that every existing mechanic is defective. Sources and dates are in [the research register](../../../../docs/GAME_DESIGN_RESEARCH.md).

## Make alternatives do different work

Describe an option by its action, information, timing, costs, risk, outcome and recovery. Two prices do not establish two strategies. Identify the intended advantage of each option and construct a legitimate situation where it matters. Examples include a cash shortage, a longer contract, a peak arrival window, no spare support worker, a larger meeting, a disconnected site or a different migration cohort.

An alternative may be for accessibility, expression or learning rather than economic optimization. State that purpose instead of inventing financial parity. Do not force every option to win every scenario. If a feasible option is worse on every relevant dimension across its intended contexts, consider removing it, changing its use case or changing the underlying constraint.

Compare choices in explicit decision families: service plan, migration architecture, meeting-capacity response, incident response or supplier. Give related choices stable family identities. Array position is not evidence that adjacent operations are comparable. Present shared units and horizons, then expose the meaningful differences.

## Trace resource flows

Write a small resource table before changing balance:

| Quantity | Questions |
| --- | --- |
| Cash and commitments | Who pays, when is cash spent, what recurring obligation survives, and what is refundable? |
| Operating result | Which delivered service earns revenue? Which setup, fixed, usage and remedy costs enter each measure? |
| Capacity | Is this licensed entitlement, concurrent session capacity, a staffed person, a reservation or observed use? |
| Time | Is this simulation time, a billing period, staff effort or measured wall-clock time? |
| Trust, adoption or qualification | Which observed event changes it, for which customer, and what later option changes? |

Keep currency units explicit, such as cents versus displayed dollars. Reconcile opening cash, all posted inflows/outflows and closing cash. Keep deposits, bookings, delivered revenue and operating margin distinct. If changing the accounting definition, inspect the current specification and report the proposed difference rather than silently relabelling a metric.

A nominal break-even calculation can frame a hypothesis: extra upfront cost divided by recurring savings. It does not prove the strategy works. Include provisioning delay, usage, failures, shared staffing, term length, affordability and the time until the campaign awards success. A long-term saving has little decision value when the chapter ends before that saving can matter.

Map reinforcing and limiting feedback. Growth can earn cash, but it also consumes support and exposes more customers to correlated failure. Inspect whether the constraints produce specialization and partner dependence or merely repetitive clicking. Check demand bounds before adding capacity-selling income.

## Challenge the objective

Test the intended promise as well as the predicate that currently awards it:

| Probe | Defect it can reveal |
| --- | --- |
| Accept an order with no delivered work yet | Purchase or provisioning mistaken for customer success |
| Act just before and just after settlement | Timing avoids a cost or operating interval without a meaningful tradeoff |
| Add a different customer's profit or receipt | A global aggregate satisfies a customer-scoped promise |
| Inspect, quote, save and reload repeatedly | A deadline slides or resets without an explicit event |
| Retire, cancel, repair or change chapter | Old evidence is reused incorrectly, or real outstanding obligations disappear |
| Start with inherited assets | Unearned starting state grants a completion reward |
| Repeat a request or cross a tick boundary | Double charging, duplicate reservation, free capacity or stale acceptance |

A correct dispatcher can still implement an unsatisfying win condition. Report those as different findings. A proposed objective based on delivery needs actual workload, a defined observation window and a visible explanation of remaining work. Preserve valid historical outcomes after recovery; do not erase losses to manufacture a clean story.

## Run a bounded counterfactual

Use `$soc-playtest` and its [experiment protocol](../../soc-playtest/references/experiments.md). Pin the starting state, workload, intervention and stopping rule before inspecting outcomes. Compare equal time and, where relevant, time/cost to equal delivered objectives. Include a plausible failure and recovery. Deliberately exercise the condition in which an expensive or slower alternative should pay off.

Report service completion, late/failed work, cash, committed costs, staff/capacity occupancy, effective readiness and future options separately. A transient queue improvement or more messages is not automatically a better customer outcome. State the tested range before using words such as dominant, balanced or equivalent.

## Current code entry points

Locate current symbols with `rg`; these paths were checked on 13 November 2026:

- Public create/dispatch/restore: `src/game/55-communications.js`.
- Objectives and campaign state: `src/game/25-provider-campaign.js`.
- Workload and rules: `src/game/22-provider-demand.js`, `src/game/24-provider-rules.js`.
- Existing behavioral examples: `tests/provider-campaign-kernel.test.js`, `tests/provider-strategy-options.test.js`, `tests/provider-playability-recovery.test.js`.

Route new implementation through the current command boundary and existing test factories. Do not add an alternative simulator, a fake billing ledger or a generic browser time hook merely to make a design experiment easy.
