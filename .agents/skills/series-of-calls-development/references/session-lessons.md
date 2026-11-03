# Implementation-session decisions and regression traps

Updated 4 November 2026. This is a continuation aid derived from the supplied session and current repository, not a verbatim transcript or another requirements register. Preserve the original source pack and use `spec/README.md` to locate authoritative mappings. Paths below are relative to the repository root.

## Product and scope

- The product is a synthetic configuration trainer and communications-business campaign. Guided lessons, outcome-assessed challenges and sandbox play share simulated state. All four customer tracks and AU/US/JP/EU variants belong to the full plan; existing bounded award paths do not establish complete campaign coverage.
- Distinct vendor-style fictional consoles must retain real domain distinctions: multitenant/dedicated UC, carrier connectivity and contact integrations, local/cloud processing, operator-controlled staffing and independent resource units. Renaming a generic item does not implement its distinctive contract.
- Preserve the original witty comparisons. `scripts/generate-narrative.py`, `src/game/88-narrative.js`, `tests/narrative.test.js` and the mapping/design audit are the entry points. Test where adapted text is actually displayed; text-only work never substitutes for mechanic evidence.
- The preserved mapping has 3,454 records and 217 file records; the separate archive-gameplay catalogue has 75 proposals from 83 raw notes. Those counts are dated inventories, not caps. Do not import all archive proposals into accepted requirements merely to increase coverage.
- Preserve genuine upstream history, MIT bytes and attribution in an independent repository. The local snapshot previously lacked `.git`; inspect before doing history work. Never use `git init` to manufacture the promised upstream history. `scripts/hydrate-history.py` is the prepared recovery route.

## State and diagnostics

- Configuration submission is not readiness. Resource generation, effective settings and observed results have different meanings; the core and optional packs do not all use the same generation fields. Inspect each schema before adding a generic assertion.
- Inbound calling must resolve a real assigned number, entitlement, ordered route, carrier/security admission, signalling and directional media to a real endpoint/queue. A fabricated success label is not a journey.
- Media codecs belong independently to endpoints and carriers. Transcoding consumes its own capacity. Live renegotiation and transfer reroute actual legs. Only interactions with actual carrier-route evidence consume carrier sessions; internal calls and finished wrap-up do not.
- Workforce licensing, telecommunication capacity and available skilled people stay independent. Test the workforce operator's authority before exposing staffing controls.
- Portfolio, market qualification, progression and managed operations are global aggregates. Selected-child UI routing must not wrap those commands as tenant-local actions. Campaign snapshots omit global aggregates; child clocks and portfolio advancement need explicit coordination.
- Managed customer changes bill only after actual effective delivery and observation, once per typed operation. A submitted connector/job is not delivery. Reject no-op movers and retain posted delivery evidence after a customer is paused or a track changes.
- Product upgrades preserve old effective/history scopes until the new deployment is ready. Explicit integration rebasing requires a new test. Delayed, expiring/revoked product evidence is scoped to the actual deployment and dependencies; synthetic evidence is not provider certification.

## Historical evidence

- Earned historical awards must survive later faults, cancellation, upgrade, retention and recovery. Also reject forged evidence. Do not validate historical claims only against today's configuration.
- Bounded logs need evidence of actual eviction. Interaction `tracePrunedThrough`, processing `jobPrunedThrough` and audit `auditPrunedThrough` markers distinguish a legitimately pruned receipt from a deleted row. Old active interactions may remain below a higher pruned ID; a monotonic ID alone is not proof of eviction.
- Meeting results reference actual audit IDs/times and feature outcomes. Preserve retained audit correspondence; only accept missing old evidence through validated pruning rules. For product/integration histories, enforce bounded capacity instead of silently evicting history needed by valid claims.
- Test positive reference paths for every progression change, including combined multi-track goals, and retain negative cases against manually forged awards. Unit tests that only validate object shape miss these failures.

## Verification and continuation

The previous implementation run recorded 466 selected tests, 352 registered acceptance cases and 61 gate mutation tests. These results used jsdom 30.0.1 from another workspace because locked jsdom 24.1.3 could not be installed in that environment. They are not locked-dependency or full-browser acceptance. Read the actual receipt and dependency tree before quoting results.

Browser and TCP sockets were blocked; GitHub shell DNS failed. These are recorded environmental observations, not permanent platform facts. Avoid repeatedly retrying an unchanged denied operation, and never turn a blocked test into a pass. Continue independent implementation/spec work while retaining the blocker.

The release check intentionally remained blocked on unreviewed research and other readiness requirements. A developer-accounting pass does not establish release eligibility. Do not set completion flags, synthesize evidence logs or weaken gates to satisfy the plan. Preserve the pending work so a later agent can resume without repeating discovery.

## Allowance, speech and first-entry regressions

- Legacy business saves may omit allowance pool fields. Validation runs before dispatch clones the root, so applying migration defaults inside validation violates rejected-command atomicity. Normalize a read-only local view for validation and migrate only owned dispatch/restore copies, including nested portfolio roots and campaign snapshots.
- Meter actual resource usage: voice uses its recorded platform route, delivery bills message acceptance once, and each processing job uses its planned processor. An unrelated contract with the same unit must never receive fallback charges when runtime resource context exists. Included retail allowance does not waive wholesale cost.
- A speech job must retain the exact language-model and integration dependency IDs validated by its product deployment. Deployment ID alone allows an unrelated ready installation to satisfy it. Preserve generation/resource scope through save, worker and failure/repair paths.
- Exercise the actual title action before any SP state exists. Calling `socOpen` directly missed an allowlist that prevented the first visible training button from opening the console.
- `npm test` in the sandbox can report file-level counts. Retain per-file TAP counts when reporting individual assertions. Validate the test-file inventory before invoking Node: an unmatched explicit filename can disappear from a mixed invocation without proving it ran.
- Freeze source, acceptance registration and generated records before recording evidence. A mid-run source or plan change requires a fresh producer run; post-run hashes do not prove the tests ran those bytes. Keep failed/time-limited attempts separately instead of overwriting their history.
