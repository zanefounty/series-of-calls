# Work package: fictional boundary contracts

`src/game/43-boundaries.js` exports `SOC_BOUNDARIES` (`soc-boundaries-1`). The optional state lives at `s.boundaries`; the kernel itself does not start automatically or change core behavior.

## Parent integration API

- `SOC_BOUNDARIES.create(s)` creates the optional pack state.
- `SOC_BOUNDARIES.command(s, {action:'contract', contract})` stages or revises a contract's desired configuration and increments its generation. A new generation remains pending until `advance` succeeds; the prior effective configuration stays visible.
- `SOC_BOUNDARIES.command(s, {action:'observe', contract, observed})` changes observed connection, licence, local-service, key-custody, and administration-path facts only.
- `SOC_BOUNDARIES.command(s, {action:'bind', resource, contract})` permanently binds a real root resource to a contract whose desired flows reference it. A present root jurisdiction must match the contract profile. There is no unbind command. `SOC_BOUNDARIES.contractForResource(s, resource)` resolves the saved binding.
- `SOC_BOUNDARIES.advance(s, clock)` provisions due contracts. Missing or changed resource generations fail provisioning and do not replace effective configuration.
- `SOC_BOUNDARIES.evaluate(s, contractId)` is a pure eligibility check against effective configuration, current bound resource generations, and independent observed state. It returns every detected blocker as `{code,path,flowId?}`, the bound resource lineage, and explicit synthetic/no-legal-approval markers.
- `SOC_BOUNDARIES.inspect(s)`, `validate(s)`, and `fingerprint(s)` expose state and save integrity. `source()` emits the self-contained worker module.

Core enforcement should require a contract binding for relevant government/defence resources and call `evaluate` at the qualification/processing boundary, rejecting the relevant operation when `eligible` is false. Bind a contract flow to a real resource ID; its resource generation is captured at staging and checked at provisioning and evaluation. Resource names and observed facts are not accepted from an untrusted interaction payload. The administration path is required and location-checked while connected and disconnected; disconnected local operation requires active, unexpired local licence grace, not a cloud-only licence.

## Scenario model

The AU, US, JP, and EU entries are invented gameplay profiles, not legal determinations. Their fictional rules vary by domestic control, distinct US offering, customer, and any required agency authorization evidence, scoped Japanese service registration and language with a separate AI-use decision, and EU-wide region/transfer path. The EU profile has no member-state approval field. The research IDs in `content/boundaries.json` are context only and remain pending review.

Processing, storage, backups, key custody, administration, support, access roles, authorization, connectivity, continuity, and licence availability are separately represented. Local disconnection can qualify only when each local dependency, permitted admin path, and cloud or grace licence is present. The saved content file records the fictional rule IDs and is checked against the runtime profiles by the module test.

## Acceptance coverage

`tests/boundaries.test.js` covers AC-SOC-119 through AC-SOC-126: staged/effective state, four distinct profiles, separate evidence decisions, resource-bound flows, key/admin locations and EU transfer paths, disconnected operation, complete blocker paths and read purity, and save/content/worker-source parity. Core enforcement, UI, and evidence-registry integration are parent-owned and remain outside this package.
