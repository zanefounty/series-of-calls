# Campaign module handoff

## Delivered scope

`SOC_CAMPAIGN` is an optional, persistent four-track campaign pack (`soc-campaign-1`, content `soc-campaign-content-1`). It stores progress under `s.campaign`. It starts from the SMB scenario and tracks SMB, enterprise, government, and defence service work in order. A track award unlocks the next track. Sandbox mode opens all tracks for exploration and never grants awards.

The API is `create(rootState)`, `command(rootState, command, hooks)`, `advance(rootState, hooks)`, `validate(rootState)`, `inspect(rootState, hooks)`, `fingerprint(rootState)`, and `source()`. Root dispatch commands are:

```js
{ action: 'open-window', kind: 'baseline' | 'service' | 'recovery' | 'economics' }
{ action: 'inject-incident' }
{ action: 'recover-incident' }
{ action: 'assess' }
{ action: 'select-track', track: 'smb' | 'enterprise' | 'government' | 'defence' }
```

The shared kernel supplies `observeResource(state, resourceId)`, `configurationFingerprint(state)`, `dispatchRootCommand(state, command)`, and `selectTrack(state, track, context)`. The configuration fingerprint covers effective and desired resource configuration plus optional-pack configuration, excluding clock, interactions, faults, and campaign progress. It is captured at window start, checked at every sample and close, and used to mark closed evidence stale after a later configuration change. The dispatch hook must return a new root state with a higher revision and the exact command at the end of its command log. The track hook receives the saved per-track root snapshot, if any, and must return a validated root for the requested scenario, jurisdiction, and mode. Track clocks pause while that track is inactive; the campaign does not represent simultaneous operations. The parent kernel owns these trusted hooks and performs root-state validation.

## Guided playthrough commands

Run the scenario's ordinary reference setup first. For enterprise, perform and provision the core migration before opening the baseline window; the campaign binds the completed migration command and endpoint scope to the service-window evidence. For government, start the information pack and configure its complete pipeline object with `steps: ['transcription']`; keep its processor, archive, jurisdiction, language, quality, retention, and access fields valid. For defence, reconnect after reference setup, pass the connected baseline, and disconnect only by injecting the campaign incident during the service window. Do not mark a window complete manually. Open each window through the campaign command and let normal root `advance` commands drive its samples.

| Stage | Real action to perform while the window is open |
| --- | --- |
| Baseline | Open `baseline`; advance one minute at a time while the target resources remain ready and in the selected fictional boundary. |
| Service | SMB: send a new message or voice journey with a new case. Enterprise: place voice calls from Alex and Bea and run a meeting after the pre-window migration. Government: place a new voice journey and let the in-boundary transcription pipeline finish. Defence: open the window, use the campaign disconnect incident, then complete a local voice journey with a fresh case. |
| Recovery | Open `recovery`; inject the campaign's real fault/disconnection, advance at least one minute, issue `recover-incident`, then complete a new post-recovery interaction before the 8-minute window closes. Defence also needs the offline case journey retained before reconnection. |
| Economics | Start the business pack, order a supported contract for the active fictional customer with a named accountable support owner, wait for provisioning, then open `economics` and advance through the next full 60-minute bill. The saved ledger must contain new positive revenue and wholesale cost for that contract. Government and defence must also hold their real, current qualification. |

Example SMB contract command, after `business:start`:

```js
{
  action: 'order', offer: 'contact', quantity: 1, unit: 'agent', currency: 'AUD',
  resources: ['people', 'service'], customer: 'customer',
  supportOwner: 'orchard-msp', sell: true
}
```

## Evidence and awards

Each selected track has separate baseline, service, recovery, and economics observation windows. Every elapsed minute must be sampled through the kernel advance hook. A time gap, an effective or desired resource configuration change, or an unapproved service interruption makes the window fail. Campaign command and interaction evidence is captured by ID and timestamp, so ring-buffer pruning cannot silently convert missing evidence into success.

Track requirements are derived from core state:

| Track | Service objective | Boundary and configuration checks |
| --- | --- | --- |
| SMB · Orchard Repairs | Resolve a new voice or digital journey with a retained case/person context. | Queue skill and language must match configured workforce capabilities, approved digital sender, and effective services. |
| Enterprise · Canopy Group Migration | Resolve voice journeys from Alex and Bea after a completed migration, hold a successful meeting, and retain a recording. | Meeting calendar, identity-mapped recording consent, archive retention, supervisor access, and the desk endpoint. |
| Government · Civic Grove Public Service | Resolve a new task and retain its in-boundary transcript or transcription output. | Effective information process and storage boundary plus relevant service resources and desk endpoint match the selected jurisdiction. |
| Defence · Wattle Disconnected Continuity | Resolve a new local voice journey while disconnected and retain its case context. | Local identity, carrier, phone, desk endpoint, licensing, DNS, time, and certificate dependencies remain effective. |

Recovery windows require an actual core fault or disconnect command, time under the fault, a real recovery command, and a new successful post-recovery interaction. Economics windows require a supported active customer contract and newly observed positive posted revenue and wholesale cost for that contract, a new billing period, and nonnegative customer cash. Government and defence also require their current core qualification.

Assessing a track awards its once-only integer `training-credit` reward only when all four windows pass and the current effective services are ready. Training credits are not money. The source progression levels and source goals remain explicitly pending; these four tracks do not infer those predicates.

## Review and coverage

`tests/campaign.test.js` covers AC-SOC-107–114 using real `SOC.create`, `SOC.reference`, `SOC.dispatch`, resource observation, business billing, and per-minute campaign advancement. The eight cases cover save/source parity, sticky observation failures, validated incidents, case context, paused snapshots, pending source obligations, jurisdiction-specific constraints, and the SMB award conditions.

`tests/campaign-integration.test.js` covers AC-SOC-137–140 through real shared dispatch. Four integration cases exercise an assessed award sequence for all four tracks in each AU/US/JP/EU fictional profile, an alternate voice and bridge-meeting solution, stale and interrupted evidence, forged-save rejection, and worker/save/replay/pure-calculation equivalence. Together the campaign module and integration suites contain twelve passing test cases. The separate progression module has candidate mechanics for the first level and goals `bb`, `bz`, and `ix`, with eight module-level cases AC-SOC-141–148. AC-SOC-157–160 add selected dispatch, worker, persistence and UI coverage for progression and issue exercises. These tests do not establish that all 13 levels/19 goals or the complete progression lifecycle are implemented. All 32 source obligations remain pending in `campaign-obligations.json`.
