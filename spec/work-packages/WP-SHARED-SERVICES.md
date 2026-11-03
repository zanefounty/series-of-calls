# WP-SHARED-SERVICES — shared lines, presence, and call control

Status: proposed implementation slice. These controls are fictional training mechanics and are not a vendor feature matrix or a claim that a specific provider implements each behavior.

## Source linkage and scope

The preserved communications design lists shared lines within enterprise voice and separately calls out presence, call permissions, caller identity, transfers, reception, and survivability. Those design statements are in `research/source/Series of Calls communications ecosystem design.md`, section “Capability scope”; that document does not assign a dedicated source-row ID to shared-line pickup, parking, or presence.

The source mapping obligations that support this slice are:

| Source ID | Mapped obligation | Use in this pack |
|---|---|---|
| `uc-new:domain:directory-dialplan` | Canonical users, extensions, public numbers, aliases, caller identity, permissions, and explicit routing across tenants and sites | Bind a shared line to an existing tenant and canonical identities; never infer a member from an untrusted alias. |
| `uc-new:domain:signalling` | Resolve identity and number policy; model admission, transfer, forwarding, fallback, and release independently of media | Track ringing, answer, hold, park, retrieve, and release as explicit call-control states while keeping the parent interaction authoritative. |
| `uc-new:domain:identity` | Provision identities, federation, authentication, roles, delegated administration, and tenant boundaries | Give each member and delegate scoped permissions and reject cross-tenant control. |
| `uc-new:domain:media` | Evaluate each media direction and distinguish a connected session from failed audio, video, or content | Shared-line actions do not imply that media is healthy or that a call resolved. |
| `uc-new:domain:continuity` | Test promised local/restricted-connectivity journeys against dependencies and records | Observed endpoint presence and effective local service determine whether a line can ring; disconnected state is not an automatic success. |
| `progress.progression-level.10` | Communications wholesaler supplies partner tenants, delegated administration, and auditable billing | Use delegation as a scoped permission; do not claim the level or source progression goal is complete. |
| `company-map:player-name:16` | “Shared Line Huggers” cosmetic naming row | Optional flavor only. It does not establish an operational requirement. |

The source-row mapping does not contain a dedicated obligation for call park, group pickup, busy-lamp presence, or shared-line occupancy. These are clearly labeled gameplay decompositions of the broader signaling, identity, and directory obligations above, and of the preserved design's enterprise-voice capability list. Do not manufacture `uc-new:*shared-line*` source IDs or represent these mechanics as completed source coverage.

## Behaviors

1. A shared line is configured for one existing tenant, one canonical owner, and a bounded list of existing canonical members. Provisioning keeps `desired`, `provisioning`, and `effective` separate. A failed generation preserves the previous effective membership and permissions.
2. Member permissions are distinct: observe presence, answer a ringing call, control the line's DND setting, park an active call, and retrieve a parked call. Owner and delegate rights are explicit, scoped to the same tenant, and checked on every action. Being a member does not silently grant every control.
3. Presence and line DND are separate. Presence is observed state (`available`, `busy`, `do-not-disturb`, or `offline`) bound to a canonical identity and effective endpoint. DND is desired/effective line policy. An unavailable endpoint cannot become answerable because its user has an “available” observation.
4. Ringing occupancy is derived from the exact parent voice interaction. In the integrated core, the saved phase pairs are `ringing`/`ringing`, `active`/`shared-active`, and `parked`/`parked`. Answer, park, retrieve, and release pass through trusted parent hooks. The module never fabricates an interaction, media path, successful call, or customer resolution.
5. A call can occupy one shared line at a time. Configured line capacity bounds the number of simultaneous ringing/active/parked interactions; multiple device appearances do not multiply capacity. A parked call continues to occupy a park slot until retrieved or the parent interaction terminates.
6. Pickup resolves an actual ringing interaction and an authorized member endpoint. Park and retrieve require explicit permission and tenant identity; retrieve additionally requires a matching parked interaction, live parent call, and valid slot. Stale, terminal, ambiguous, or foreign-tenant interactions fail with traceable reasons.
7. Every accepted or rejected action records a deterministic synthetic trace tied to the actual interaction ID and configuration generation. Read-only inspection is pure. Fingerprints include effective configuration, observations, and state that changes call eligibility, but exclude transient diagnostic counters.

## API and parent integration

`src/game/35-shared-services.js` exports the self-contained `SOC_SHARED_SERVICES` module with `PACK='soc-shared-services-1'`, versioned `create`, `command`, `advance`, `validate`, `fingerprint`, `inspect`, and `source` APIs. Parent dispatch owns `{type:'shared-services', command}` and invokes the call hooks at the corresponding core transitions.

The module API must expose these explicit hooks:

- `command(root, {action:'configure',id,config}, hooks)` stages a complete line config. Each line references canonical directory members and an existing tenant. Provisioning promotes only when every configured member has an effective endpoint and the parent dependency checks pass.
- `command(root, {action:'presence',person,state}, hooks)` records observed presence after resolving the canonical person and effective endpoint. The command accepts no caller-supplied tenant or endpoint.
- `ringing(root, interaction, lineId, context, hooks)` accepts only the exact parent voice interaction with validated caller identity and matching line. It returns an explicit decision and synthetic trace.
- `command(root, {action:'answer'|'park'|'retrieve',...}, hooks)` requires the trusted parent live-interaction and actor hooks. The parent changes actual call phases, media, billing, and completion; this module stores matching occupancy only after the core transition hook accepts.
- `release(root, interactionId, reason, hooks)` clears occupancy only after the parent reports a terminal interaction. It cannot delete a live or parked call.

Command schemas must be exact, bounded, and save-safe. `advance(root, clock, hooks)` is called once per shared root minute. Occupancy validation cross-checks the actual interaction ID, caller, shared line, core phase, actor action permissions, deadline, and slot. A person cannot answer/retrieve a second simultaneous active call. Historical configuration is validated structurally even when a member has since left. Pure inspection and configuration fingerprints exclude transient occupancy. Source serialization must be deterministic.

## Acceptance scope

AC-SOC-201–208 cover tenant/member validation and staged configuration; presence and DND independence; ringing and occupancy limits; per-action permission boundaries; pickup of one live eligible interaction; park/retrieve authorization, slot occupancy, and timeout/termination handling; pure assessment and strict restore/worker validation. AC-SOC-209–210 cover the optional typed UI, real shared-dispatch hooks, and read-only locking. Integration tests must include an allowed member action and negative cross-tenant, unavailable-endpoint, DND, unauthorized pickup, duplicate park, and stale/terminal retrieval cases.

Passing these tests establishes only this fictional module's documented behaviors. It does not establish complete implementation of the mapped directory, signaling, identity, media, continuity, or progression source obligations.
