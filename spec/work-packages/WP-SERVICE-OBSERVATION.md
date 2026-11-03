# WP-SERVICE-OBSERVATION

## Status

The three service observation mechanics are implemented in `src/game/39-service-observation.js`, attached to shared `SOC.dispatch`, save validation, calculation and worker execution by the central kernel, and exercised by `tests/service-observation.test.js` (AC-SOC-177–184). The content contract, runtime metadata snapshot, and template commands live in `content/service-observation.json`. Their progression award links are a separate partial overlay. This work does not complete the three original goals or award their source cash.

The original source records are `progress.goal.rd`, `progress.goal.tb` and `progress.goal.t10`. `rd` retains its 12,500 source-game-cash reward. `tb` and `t10` preserve the `Serve 1 Tbps` and `Serve 10 Tbps` names and the original `R.served>=1000` and `R.served>=10000` predicates in Gbit/s, with source cash rewards retained separately. The selected thresholds below are fictional v1 balance choices; they are not validated balance and do not translate cash or bandwidth into seats, people, interactions, or completion.

## Runtime contract

The module exports `create(root)`, `command(root, command, hooks)`, `advance(root, hooks)`, `calculate(root, hooks)`, `inspect(root, hooks)`, `validate(root)`, `fingerprint(root)`, `source()`, and immutable threshold/resource metadata. State is stored at `root.serviceObservation` under pack `soc-service-observation-1`.

Commands use exact schemas:

```js
{ action: 'open-window', goal: 'tb' | 't10' | 'rd' }
{ action: 'inject-incident' } // active rd window only
{ action: 'recover-incident' } // active rd window, after a sampled fault minute
```

The parent must add a `service-observation` command to `SOC.dispatch`, create the pack only on its explicit `start` command, call `validate` from root save validation when present, add the pack to inspection/calculation and `workerSource()`, and preserve older saves with no pack. Call `advance(root, hooks)` once after each completed `advanceMinute`, after actual queue, interaction and task-outcome transitions have occurred. Calling it after a multi-minute jump records a sticky sample-gap failure; it never catches up with synthetic samples. A start command may be included in `content/service-observation.json` command templates for UI guidance.

Required trusted hooks:

| Hook | Signature | Required behavior |
| --- | --- | --- |
| `observeResource` | `(root, resourceId) -> {ready:boolean, ...}` | Return central kernel readiness, including configured product and boundary gates. |
| `dispatchRootCommand` | `(root, command) -> nextRoot` | Call the shared validated `SOC.dispatch`; return a new root with an increased revision and the exact command in its log. |
| `observeTransportPath` | `(root, {from,to,profile}) -> {ready,edges,domains,latencyMs}` | Use actual transport `resourcePath` evidence and resolve effective failure domains. |
| `transportDomainsForEdges` | `(root, edgeIds) -> domainIds` | Resolve domains for the original saved interaction trace, rather than trusting learner-supplied labels. |
| `transportDomainFailed` | `(root, domainId) -> boolean` | Read the live central transport fault state. |

`calculate`, `inspect` and `fingerprint` are pure. Configuration fingerprints include root resource and pack config generations while excluding transient transport fault state and observation progress. Open windows fail on configuration drift, missing required resource readiness, an observation gap, a continuity interruption, or evidence capacity overflow. Completed proofs retain bounded journey, meeting, sample and transport evidence so normal interaction-ring pruning does not erase a result. Save validation cross-checks retained journeys against their live interactions, canonical cases, and workforce assignments. It allows missing interaction or case-list links only when the bounded root and case rings show newer IDs that demonstrate eviction. These structural checks catch ordinary deleted or altered evidence but are not cryptographic tamper protection. Historical proof and current readiness are reported separately.

## Fictional v1 balance thresholds

| Goal | Observation | Positive evidence | Key rejection boundaries |
| --- | --- | --- | --- |
| `tb` | 10 consecutive minute samples | At least 12 successful human service journeys with retained case context; ≥90% completion; activity in ≥8 minute buckets; 2 distinct assigned people; at least 2 concurrent staffed service assignments in 3 samples | Licences without assigned people, a single burst, unresolved task outcomes, bots, resource/config gaps, or a failed journey ratio |
| `t10` | 15 consecutive minute samples | At least 30 successful human journeys; ≥90% completion; activity in ≥12 minute buckets; ≥8 voice and ≥8 digital journeys; 2 successful meeting dispatches; 4 distinct assigned people; 4 concurrent staffed assignments in 5 samples | The channels and meetings remain separate counters; purchased capacity cannot substitute for people; bot containment and unresolved needs do not count |
| `rd` | 10 consecutive minute samples | One real, case-bound, two-way human voice journey before, during and after a named transport-domain fault; same canonical caller, tenant and case; alternate route excludes the failed domain and uses a distinct domain; at least one full minute sampled under fault; measured path latency ≤500 ms; zero required path interruptions | Faulting an already failed domain, restoring before a sample, losing caller/case identity, a path that reuses the failed domain, lack of a second path, config drift, or any sampled interruption |

Thresholds count real, current root observations. `tb` and `t10` count finished journeys routed to the service queue and link them to actual completed workforce assignments. An interaction must be resolved, have no outstanding obligations, retain its case’s canonical identity and tenant, and settle any linked customer need as resolved. Attempts include unfinished work at the end of a window in the completion denominator. A person must have a valid current roster/seat assignment; headcount and licensed entitlements remain distinct.

The continuity incident chooses a domain from a previously completed successful service voice trace. It fails that domain only through the validated root transport command. The live route and interaction trace must prove that the alternate route uses other effective links and domains. Recovery is another validated command and is accepted only after a full sampled minute under fault. `rd` is unsupported when the root has no transport pack, bindings, baseline trace or independent alternate path.

## Guided reference plans

`content/service-observation.json` contains machine-readable command templates and a human-readable run order for each goal. The short forms are:

1. Provision a two-person roster with valid individual seat IDs, then set `people.handlingMinutes=1` and `wrapMinutes=0` before opening `tb`. Generate two actual case-bound service interactions on eight distinct minutes. Use two separate case IDs per journey or reuse a bounded same-case thread; check actual queue outcomes after each tick.
2. For `t10`, provision four named agents and all service, case, messaging, meeting and product dependencies before opening the window. Interleave actual voice and digital service outcomes across twelve minute buckets, sample four simultaneous workforce assignments in five minutes, and dispatch successful meetings in separate commands.
3. For `rd`, configure the content template's two parallel links with different failure domains, provision them, and bind the caller identity and service resources. Resolve a human voice baseline to the service queue, then open the window. Use `inject-incident`, hold one complete sample minute, resolve the same case and caller over the alternate route, use `recover-incident`, then resolve the same case and caller after recovery.

These are guided plans, not automatic evidence. A UI may explain the commands, but the module observes only actual root commands and outcomes.

## Acceptance cases

| ID | Scope |
| --- | --- |
| AC-SOC-177 | Source cash and Gbit/s units remain explicit and thresholds make no unsupported conversion. |
| AC-SOC-178 | Minute sampling, sticky sample gaps, deterministic inspection and pure calculations. |
| AC-SOC-179 | Real core root without enough human journeys fails sustained service. |
| AC-SOC-180 | Individual workforce assignments count; entitlements alone do not create people. |
| AC-SOC-181 | `t10` separately requires voice, digital, meetings, people and concurrency evidence. |
| AC-SOC-182 | `rd` requires an actual baseline route, validated fault/recovery and distinct failure domains. |
| AC-SOC-183 | A failed resource or configuration change during an open window cannot be repaired into a pass. |
| AC-SOC-184 | Forged pass states are rejected; worker source, save round-trip and pure inspection remain deterministic. |

The AC-SOC-177–184 module cases and shared-dispatch AC-SOC-190–193 playthroughs currently pass. The service observation goals remain partial source mechanics: source-specific `R.served` progression and the original source-cash awards are not implemented by these windows, and the balance thresholds remain fictional v1 choices pending gameplay review.
