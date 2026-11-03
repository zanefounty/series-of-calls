# Customer segment editable needs package

**Status:** bounded implementation integrated through SOC dispatch, worker serialization, save validation, MCP inspection and the customer-needs console. Acceptance links are registered in `spec/implementation.json`; actual execution is recorded separately. This document does not close the source obligation. The four source additions need dated full-source review before any disposition beyond this synthetic slice.

## Source rows and intent

This slice uses exactly the four customer-profile rows in [`product-profile-obligations.json`](product-profile-obligations.json): `uc-new:segment:smb`, `uc-new:segment:enterprise`, `uc-new:segment:government`, and `uc-new:segment:defence`.

Each preset is a convenient starting point. Employee count, sites, named seats, agents, rooms, geography, jurisdiction, sector, workload sensitivity, personas, workloads, administration, support, and target outcomes are independently represented. Government and defence names are scenario labels; they create no certification, eligibility, permission, provider capability, or procurement approval. The synthetic defence profile explicitly distinguishes administrative, training, and restricted workloads and marks disconnected operation as a workload requirement only for the restricted-operations row.

## Runtime contract

`src/game/26-customer-needs.js` exports `SOC_CUSTOMER_NEEDS` with `create(root)`, `command(root, command)`, `advance(root)`, `validate(root)`, `inspect(root)`, `fingerprint(root)`, and `source()`. The optional save field is `root.customerNeeds`; old roots without it remain valid. `start` creates the empty pack, `select` seeds one of the four presets, and `configure` replaces one typed section (`name`, `sector`, `sensitivity`, `scale`, `geography`, `personas`, `workloads`, `administration`, `support`, or `outcomes`). A change stays desired/pending until the next synthetic minute. A successful minute copies the revision into `effective` and records a bounded `observed` profile-application result. Persona totals that exceed the employee count create a non-blocking planning note because personas may overlap. Employee, site, seat, agent and room counts otherwise remain independent; they are not universal provisioning gates. These observations describe the profile application only; they do not measure deployed service.

All commands are atomic: edits are validated on an owned copy before replacing the attached pack. `inspect` and `fingerprint` validate and do not mutate. The factory is self-contained and serializes for worker execution.

## Root integration contract (implemented)

The implementation in `src/game/55-communications.js` follows this contract. Root acceptance cases also reject a changed segment/source binding, future observations and invalid provisioning dates; segment identity cannot be rewritten by a profile edit.

1. Resolve the pack as `typeof SOC_CUSTOMER_NEEDS !== 'undefined' ? SOC_CUSTOMER_NEEDS : require('./26-customer-needs.js')` inside the root kernel factory.
2. Add an optional `customerNeeds: null` result to the root calculation/inspection object; when present, use `customerNeeds.inspect(state)`.
3. In root validation, call `customerNeeds.validate(state)` only when `state.customerNeeds !== undefined`; do not add a government/defence eligibility shortcut.
4. Dispatch only `type: 'customer-needs'` through the common command allowlist, including explicit `start`; use the same `socApply`/shared dispatcher path as other panels. `start` calls the pack command; subsequent actions call `customerNeeds.command(state, command)`.
5. Call `customerNeeds.advance(state)` from root minute advancement after the root clock changes.
6. Include `customerNeeds.fingerprint(state)` in root fingerprints and `customerNeeds.source()` in worker source. Preserve old saves that omit the optional field.
7. Add `socCustomerNeedsPanel(state, report)` and `socBindCustomerNeeds()` to the training panel composition. Keep all fields editable through the controls and localize the `customer_needs.*` labels in the established dictionaries.
8. Extend the relevant module-boundary, save/replay, worker, shared-dispatch and UI integration checks, and register source/requirement/test links only after those checks run.

## Remaining limits

The module does not connect profile values to campaign selection, offer eligibility, product deployment, workforce capacity, qualification, procurement or measured service outcomes. Those consequences remain implementation work. The synthetic target-cost and service goals are editable requirements, not prices, SLAs or legal commitments. No external source was consulted for this bounded implementation; accepted source review remains open.
