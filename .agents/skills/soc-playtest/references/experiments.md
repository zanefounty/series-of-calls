# Paired simulation experiments

Use the existing simulation and typed dispatcher. This procedure measures behavior under stated conditions; it does not measure enjoyment. See [the research register](../../../../docs/GAME_DESIGN_RESEARCH.md) for the underlying methods.

## Pin inputs and the question

Record date, repository commit, dirty diff or input hashes, Node/dependency versions, seed, scenario, market, opening, difficulty, initial clock and the exact commands that produced the starting state. Record any inherited assets and commitments. Use the existing source-manifest facilities when producing formal evidence; never recalculate an old receipt around new inputs.

Write the hypothesis, competing explanation and stopping rule first. Examples: a capacity option should reduce missed work under a specified peak, or a cheaper setup should preserve enough cash for expansion. Choose a horizon that includes provisioning, the promised workload and relevant settlement. Stop on the same simulation minute for equal-exposure comparison. If comparing equal completed objectives, also report elapsed time and all costs for each branch. Report a branch that never reaches the objective as censored or failed, not as missing data.

## Reuse the public boundary

Current examples use `src/game/55-communications.js` and `tests/provider-playability-recovery.test.js`. Inspect the current interface before running. A small standalone probe can follow this pattern from the repository root:

```javascript
const SOC = require('./src/game/55-communications');
let state = SOC.create({
  experience: 'campaign', scenario: 'smb', market: 'au-sydney',
  difficulty: 'normal', seed: 73, opening: 'win'
});
const request = {action: 'plan', offerId: 'starter', planId: 'swift'};
const quote = SOC.provider.quote(state, request);
if (quote.blockers.length) throw new Error(quote.blockers.join(','));
state = SOC.dispatch(state, {
  type: 'provider',
  command: {...request, quoteRevision: quote.atRevision}
});
state = SOC.dispatch(state, {type: 'advance', minutes: 1});
const checkpoint = JSON.stringify(state);
const left = SOC.restore(checkpoint);
const right = SOC.restore(checkpoint);
```

The example establishes a real paid checkpoint. It is not a complete strategy or a UI journey. Reach the decision being studied through valid commands, then fork both branches from that checkpoint. Keep separate fresh quote revisions after each state change. Preserve request IDs when studying retries. Do not patch cash, time, queues, demand, receipts or eligibility to make a preferred branch work. Clearly labelled fixture-only experiments can test isolated rules, but they cannot prove campaign reachability.

## Design the comparison

Compare the existing route, the proposed route and the most relevant no-action or failure/recovery route. Keep background policy identical where possible and list every intervention. For strategies chosen at game start, use matching creation inputs and explain why their intentional starting commitments differ.

Choose a small sensitivity set that could reverse the conclusion: short/long term, cash-rich/cash-poor, spare/busy support, small/large meeting, ordinary/peak workload, healthy/failed supplier. Do not run a huge grid without a question. If different provisioning produces different offered workload, report denominators and exposure. Do not equate fewer arrivals with better reliability or hide failed starts.

| Measure | Record |
| --- | --- |
| Work | Offered, admitted, on time, late, failed and unfinished; case/job lineage |
| Readiness | Order acceptance, effective provisioning and first actual delivered result |
| Money | Initial/closing cash, upfront/recurring/usage/remedy costs, revenue and continuing commitments |
| Resources | Staff effort and occupancy, entitled capacity, reserved capacity and actual use |
| Progression | Predicate, trigger time, customer scope, evidence and unresolved obligations |
| Future | Renewal, retained customer, next feasible opportunity and different story state |

Report raw measures before conclusions. Define units and denominators. Do not collapse everything into an arbitrary engagement score. A nominal break-even or a temporary queue benefit is a hypothesis to test over the declared horizon.

## Inspect boundary cases

Target only relevant risks: just-before/after expiry or settlement, stale quote, duplicate acceptance, busy staff, missing permission, another tenant, cancellation, partial delivery and restore. If introducing a policy, test conflicting triggers, no funds, unavailable capacity, deadlock and visible fallback. If introducing an objective, test purchase without delivery and unrelated customer evidence.

For changed state, use existing save/replay and worker-equivalence paths. Confirm the negative case reaches the branch of interest. Keep a meaningful recovery that preserves previous losses rather than resetting them away.

## Retain a reproducible result

Write raw commands, checkpoints where useful, input identities, outcomes, errors and the exact stopping rule to the assigned output directory. Follow the repo's evidence retention rules; do not commit generated browser traces or new receipts outside the existing allowlist. Keep probes separate from application code during independent review.

A result should state: under these inputs, strategy A did X and B did Y; this supports the hypothesis within this range; this plausible counterexample remains untested. Preserve failures and timeouts. Proposed tests, completed tests and formal registered acceptance are different states.
