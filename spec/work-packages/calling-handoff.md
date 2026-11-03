# WP-CALLING handoff

Implementation is an opt-in `soc-calling-1` factory in `src/game/50-calling.js`; it never adds state to old saves by itself. `create()` returns the pack state. The parent can attach it as `s.calling`, route `{type:'calling', command}` to `command(s.calling, command)`, then replace that state on its normal clone/dispatch boundary. `validate(s.calling)`, `inspect(s.calling)` and `fingerprint(s.calling)` provide save and diagnostic checks. `source()` emits the self-contained factory declaration for worker serialization.

## Hooks

- `configure(pack, {node, config, at})` validates a whole desired policy and queues it for `at + 1`. `advance(pack, clock, dependencies)` completes due nodes; `dependencies(node, desired, pack)` must return true for success. Failure retains the previous effective policy. The parent supplies its clock; the pack does not advance or store a clock.
- `normalise(pack, dialled, caller)` returns `{ok, target, kind, tenant}` or `{ok:false, code}`. `extensionCandidates(pack, caller, endpointResources)` returns only caller-tenant candidates.
- `resolve(pack, interaction, target, endpointStatus, emit)` returns a resolved `{target, endpoint, tenant}` or `{terminal:true, outcome}`. `endpointStatus` is keyed by endpoint and can declare `registered`, `available`, or `capacity` false. `emit` receives synthetic trace events. It performs federation checks on every destination, follows trigger-matched forwarding/fallback only, and caps traversal at 16 hops.
- `reception(pack, groupId, endpointStatus)` returns deterministic `ANSWERED`, `VOICEMAIL`, or `NO_ANSWER`. A `VOICEMAIL` result is only a routing result: the parent creates the interaction and then calls `voicemail(pack, {mailbox, owner, sourceInteraction, content, at})` once. Store outcomes are `STORED`, `MAILBOX_FULL`, `ARCHIVE_UNAVAILABLE`, or `MAILBOX_UNAVAILABLE`; a stored item does not resolve the human conversation. Message lineage is retained; the pack does not prune messages.
- `readVoicemail(pack, messageId, reader)` permits only the configured owner or delegate. The parent should present its result as mailbox access, never customer resolution.
- `media(pack, interaction, emit)` returns separate signalling, codec, encryption, inbound/outbound NAT, latency, jitter, loss and direction results; it does not change call admission.
- `emergency(pack, interaction, serviceStatus, emit)` returns `null` unless `interaction.intent === 'test-emergency'`; otherwise it returns an explicit synthetic outcome. It requires known identity, eligibility, site/location in the policy jurisdiction, an eligible route, reachable carrier/local dependency and available notifications. The result explicitly does not claim legal compliance.

## Schema and names

The four versioned nodes are `directory`, `services`, `media` and `emergency`; full replacement configs are available at `SOC_CALLING.defaults`. Directory identities declare tenant, endpoint, aliases, public number, known status, site/location, jurisdiction and emergency eligibility. Federation is directional. Public-number reach is configured separately. Reception member count is not a capacity unit. Media thresholds are fictional scenario values and no bandwidth-to-seat conversion exists.

Humour transposition: the preserved source identity `Microsnoft` names the identity grove; `Disco` carries into the synthetic switchboard; `Scenic Route` labels forwarding; and `Jitterbug` labels directional media diagnostics. Those names retain their joke without asserting anything about real vendors. Emergency names stay neutral and synthetic. The original source pack and catalogue mappings remain authoritative; this small module does not assert full source-mapping completion.

## Evidence

`tests/calling-policy.test.js` covers AC-SOC-045–052, including tenant scoping/federation, loop/trigger policy, deterministic reception, mailbox ownership/capacity/archive failure, media failure after signalling, synthetic emergency gates, old-effective preservation, save validation, serialization and pure inspection.
