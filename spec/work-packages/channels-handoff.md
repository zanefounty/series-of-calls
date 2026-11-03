# WP-CHANNELS module handoff

Module: `src/game/47-channels.js`; factory/export: `socChannelsKernel` / `SOC_CHANNELS`; pack version: `soc-channels-1`; optional save key: `s.channels`.

## Parent integration

- On `{type:'channels', command:{action:'start'}}`, parent dispatch starts operations if needed, then attaches `SOC_CHANNELS.create(s)`. Saves that do not contain `s.channels` remain valid and do not enable these rules implicitly.
- Parent dispatch synchronizes channel time each simulated minute and invokes validation, inspection, fingerprinting, and worker source generation. Reads remain pure; the parent `channels` command validates roles and derives trusted identity/case context.
- `SOC_CHANNELS.eligibility(s.channels, interaction, context)` and its alias `beforeAccept(...)` are pure. Parent supplies context `{account, tenant, person, caseId, purpose, template}`. `account` is the profile key `chatterleaf`, `letterbox`, or `casechat`; `person` is canonical. Optional fields are `conversationId`, `at`, and, for authenticated Casechat sessions, `authenticatedIdentity`, `caseIdentity`, and `caseTenant`.
- Build that context from trusted core state. Resolve the canonical person and tenant, bind the case to that person and tenant, and verify the current session. Do not copy arbitrary tenant/person/case/auth values from user command fields into the trusted context. Casechat requires `authenticatedIdentity === person`, `caseIdentity === person`, and `caseTenant === tenant`.
- Parent operations checks `beforeAccept` before queuing and before every retry/provider acceptance. A non-retryable denial settles through the normal interaction finish path. Provider outages can remain queued for bounded retry. Consent, sender status, account health, session/window state, pause state and template eligibility are current-state checks.
- Immediately after actual HTTP 202 acceptance, parent calls `recordAcceptance` with the accepted job. After an actual delivered job, it calls `recordDelivery` with the retained acceptance snapshot and parent job. Delivery after a later identity/permission change is preserved as an actual receipt; that snapshot cannot authorize a new acceptance. Usage meters only on accepted jobs.
- Read receipts go through parent dispatch as `{action:'read', conversation, interaction, eventId}`. Parent binds the event to stored acceptance/conversation, and the module requires a matching actual delivery receipt and de-duplicates event IDs. A read receipt does not resolve or close the interaction.
- Pause/resume changes only conversation state. It creates no voice session, queue assignment, or agent reservation. Resume requires the current permission, owner binding, account health and Casechat identity/session checks.
- Include `SOC_CHANNELS.source()` in worker source generation. The standalone module tests exercise the factory serialization; they do not establish parent-kernel dispatch, retry, metering, save/restore or worker integration.

## Implemented rules

- Chatterleaf Business requires an approved sender and per-person purpose grant. An inbound conversation opens a finite synthetic reply window. Outside that window, an explicitly approved template can be sent; a freeform message cannot. An approved template can also start an outbound-only thread without creating an inbound reply window.
- Letterbox Service requires a verified sender, purpose grant and configured template. It is asynchronous and has no universal reply-window rule. An outbound delivery may create a case thread for its distinct delivery/read receipts.
- Casechat Web requires an authenticated canonical identity and a case bound to the same person and tenant. Outbound sends require the active unexpired session and an approved template; the case ID alone cannot authorize a session.
- Account desired/effective/provisioning and observed authentication/provider status are separate. Failed configuration preserves the previous effective account. Provider faults do not alter stored permissions or move a message to another channel.
- Permissions are keyed by tenant, canonical person, channel, and purpose. Revocation is immediate for subsequent `beforeAccept` checks. Previously recorded delivery is not erased by later revocation.
- Conversations are keyed to tenant/person/channel/case, and pausing does not create parent resource allocations. Inspect reports account, consent, conversation, and receipt state without advancing any of them.
- Fingerprints include account policy/provisioning/observed state and permissions. They exclude conversation progression and delivery/read receipts so transient communication history does not invalidate configuration fingerprints.

The module uses fictional identities, channel names, approvals, windows and templates. The jokes compare channel behavior to a polite knock, a delayed letter, and a session key; they do not claim real-provider policy. AC-SOC-072–078 are exercised directly by `tests/channels.test.js`; AC-SOC-093 exercises parent acceptance, delivery, revocation and read-receipt wiring in `tests/journey-integration.test.js`. Broader source mapping and release dispositions remain parent-owned.
