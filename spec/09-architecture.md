# State, execution, interfaces and persistence

Retain the static build, canvas, responsive controls and label-based translation mechanism. The upstream assembler combines ordered source files into one inline game script. No real service tenant or backend is needed. The physical engine keeps its saved `S`, derived `R` and action map; the communications kernel has independent state, derived observations and validated `SOC.dispatch` commands.

## Communications state contract

The save envelope identifies application, schema, content pack, jurisdiction rules, scenario, mode, seed, simulation clock, revision and next deterministic ID. Resources contain desired/effective configuration, generation, provisioning and injected fault. Interactions, cases, records, command receipts and the operating ledger are separately bounded. Unknown application/schema/pack is rejected clearly; original ISP saves cannot load as communications exercises.

`SOC.calculate` and `SOC.observe` are repeatable reads. They cannot advance provisioning, queues, billing, randomness or IDs. `advance` alone moves time. `interact` creates an explicit synthetic interaction. `configure`, `add`, `fault`, `connect`, `meeting`, `migrate` and `restore` enter through the same validation boundary. Rejected commands return no mutated state. The UI and local automation use these commands rather than direct field writes.

Resource fields are typed and bounded. Dependency references are checked against compatible product kinds. Accepted configuration can remain pending or fail provisioning while prior effective service continues. Runtime availability derives from effective dependencies and faults. Rendering cannot mark a provisioning job successful.

## Workers and stale results

The communications worker is generated from the same kernel factory as synchronous execution. Messages contain job identity, state revision and command. Results are validated on receipt. A configuration change while an advance is in flight invalidates the old result; the advance is executed once against current state. Time is never applied twice. Worker startup/error/timeout uses the synchronous path. Pending partial results are not saved.

The original SP route worker remains intact, including its lazy result serialization and generation rejection. Integration of aggregate communications demand into the physical worker is pending and must receive equivalence tests before the engines share workloads.

## Storage and concurrency

The application, service-worker cache, communications storage, SP storage, save slots, Web Locks and broadcasts have independent Series of Calls identities. The foundation communications slot uses a Web Lock and monotonic save sequence; a second tab opens read-only, and a newer storage event invalidates editing. Unsupported lock APIs use read-only mode rather than silently risk overwriting another tab. SP slot machinery retains its existing lock/heartbeat/broadcast behaviour under a new namespace.

A storage failure must leave in-memory state recoverable by export and report the failure. Import validates the envelope and schema before replacing a slot. Recovered or imported state preserves deterministic clock/seed/IDs. A full release additionally needs multi-slot communications UI, robust corrupted-save recovery, concurrent worker/import tests and browser-tested background/tab lifecycle handling.

## Static hosting and offline

The target is `https://zanefounty.github.io/series-of-calls/`. Asset URLs, manifest scope/start URL, update checks and service-worker cache entries resolve beneath that project path. Upstream custom-domain, telemetry, social-image, analytics and publication assumptions must be removed or adapted. The service worker must only purge its own application caches.

The preview build uses a new SVG icon, relative application assets and disabled analytics. New training labels remain in the existing dictionary mechanism and are kept stable through label compilation. They currently have English fallback across locales; translation completeness requires semantic review beyond key coverage.

## Local MCP and automation

MCP operates locally over standard input/output and never provisions a real tenant. Communications tools create an exercise, inspect status/catalogue, submit a validated command and export/import the same save schema. The SP toolset remains separate. No tool may bypass expected revisions, unit checks, entitlement rules or information boundaries. Automation plans store content-pack identity and command receipts, and report failed steps without marking downstream objectives complete.

The implemented MCP adapters validate protocol envelopes and tool argument schemas before dispatch. Id-less tool messages never execute mutations; malformed imports leave the previous state intact. AC-SOC-353–361 exercise protocol negotiation, malformed requests, validated command replay, import atomicity and consistent SP save/status reporting. `npm run test:mcp` additionally runs both actual stdio servers across the 48 compact scenario/profile/mode combinations and an SP purchase/save/replay flow. That transport evidence does not complete the full campaign or source-specific catalogue.

Build output is validated before recursive cleanup. The normal `_site` destination and explicit external temporary directories are allowed; repository source paths, ancestors containing the repository and symlink aliases are rejected. AC-SOC-362 exercises the actual build entry point against isolated source sentinels as well as destination validation.

## Bounded histories and earned evidence

Detailed interaction traces remain limited to 200 rows. The root records the highest interaction ID actually evicted from that ring in `tracePrunedThrough`; an older active call may remain while later terminal calls are evicted. The watermark changes only on actual eviction, never on reads. Saved historical proofs distinguish a legitimately aged-out row from deletion of a recent source row. Older saves without the field retain their conservative legacy ring check.

Information processing similarly records the highest evicted processing-job ID and assigns stable audit IDs with an audit eviction watermark. The processing queue and audit log remain bounded at 200 and 500 rows respectively. These metadata do not advance the clock, change billing or waive source-record lineage checks. Record tombstones preserve lineage after legitimate retention or deletion. Earned capability evidence describes the acceptance-time facts separately from current configuration and readiness; it is structurally validated simulation evidence, not a cryptographic defence against rewriting an entire save.
