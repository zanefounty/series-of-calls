# Meetings, contact centre, workforce and information

## Meetings, rooms and events

A scheduled meeting depends on an organiser, calendar permissions, room account, booking policy, invitation representation, join method, media resources and optional information features. A room device can be healthy while its calendar fails; a booking can succeed while native joining is unsupported. Native, guest/browser and bridge interoperability modes have different feature subsets, licences and residual dependencies. Firmware, cameras, microphones, displays and controllers affect supported operations rather than a single generic quality score.

Meeting placement separates signalling/control from media processing. A local relay can reduce transport demand while still requiring external identity or cloud management. Event/broadcast audiences have different interaction and concurrency requirements from meetings. Captions and playback require their own processing and retention permissions. Recording entitlement does not imply permission to retain transcripts or export summaries.

The core room test checks account, calendar, firmware, microphone, camera and interop prerequisites. The information pack adds authorised calendars, conflicting bookings, start/end windows, attendee capacity, event entitlement, native/guest/bridge prerequisites, cloud/local media placement, captions and meeting recording. Repeated joins retain one recording per booking. Whiteboards, polling, detailed calendar delegation and device lifecycle projects remain pending.

## Contact-centre state machine

Interactions move through arrival, eligibility, routing, self-service, queueing, handling, wrap-up and resolved/unresolved completion. Waiting and handling have distinct clocks. Transfers preserve the journey while adding another handling leg; callbacks preserve the unresolved need and schedule a new attempt. Supervisor intervention, recording, quality evaluation and customer resolution are separate dimensions.

Routing evaluates skill, language, policy, queue priority and availability. Voice consumes synchronous agent time and concurrent telecommunication resources. Digital work may use configured concurrency; that does not multiply a person's voice capacity. Wrap-up consumes worker time after media resources can be released. Agent named/concurrent licences are checked separately from physically available staff.

A technology-only supplier sees staffing as a customer constraint. A player operating the workforce, or purchasing a BPO service with staffing control, can schedule cohorts and buy capacity. The operator field cannot become a shortcut around delegated authority in assessed scenarios. Forecasting tools predict needs; stale forecasts do not change actual arrivals. Quality and coaching can affect future handling/quality parameters through explicit projects.

Measures include resolution, first-contact resolution, waiting, abandonment, callbacks, repeat contacts, effort, satisfaction and cost. A resolved conversation with failed mandatory recording remains an incomplete contracted journey. The core implements bounded queues with skills/languages, shifts, entitlements, digital concurrency and wrap-up. The optional contact pack adds scheduled callbacks, transfers, IVR and supervisor reviews as specified below.

## Information-processing chain

Capture, captions, durable recording, transcription, diarisation, translation, redaction, summary, action extraction, customer-record update, archive and index are distinct artefacts or operations. Each stage records source interaction, parent artefacts, processing service/version/location, storage/backups, access policy, capture permission, retention, export destinations, latency, quality and cost. Derived artefacts do not inherit unrestricted access merely because their source was permitted.

The processing graph must reject unsupported language or version combinations and prohibited boundary crossings before commercial scoring. Capacity is processor work, separate from call sessions and staff. Seeded synthetic accuracy may affect escalation or rework. The game needs no live model. Optional tutoring must explain recorded engine evidence rather than decide whether service works.

Retention and deletion walk the lineage graph according to explicit policy: deleting a source may require deletion of derived transcripts and indexes unless a valid hold applies. Access tests include the named persona, allowed operation and current delegation. A local processor still needs valid local licensing and supporting services during isolation. The information pack implements the versioned processing chain described below. Export policy, backups, search retrieval, synthetic textual content and detailed model-specific capabilities remain pending.

## Specialist applications

Discovery/provisioning tools act through the same validated command API as the console. Assurance tools read observations and representative traces. Room management configures booking and endpoint policies; an interoperability service offers only its declared feature subset. CRM/reception tools need identity mappings. Recording/governance tools add custody and policy dependencies. Workforce adapters can fail independently of agent login. Specialist sector integrations such as paging, fax, emergency notifications and legacy devices receive explicit schemas and acceptance journeys before they become sellable products.

## Information pack execution contract

`soc-information-1` is optional. Pipeline, information-boundary and meeting configurations each have desired, provisioning and effective states. A pipeline job snapshots its ordered plan when submitted, so later plan edits apply to new jobs. Current service availability, processing/storage regions and read policy are reevaluated while work runs. A blocked job retains its reason and can resume after its dependencies recover. A quality failure is terminal; it creates no misleading successful output.

Supported transitions are recording → transcription → optional diarisation/translation → summary → actions, with redaction allowed on text-bearing outputs and indexing requiring redacted input. A plan can omit optional stages if the resulting input type is supported. Work is measured in processor-minutes: transcription, translation and summary cost two; other stages cost one. Processing capacity is a per-minute budget and concurrency separately limits admitted jobs. A stage completes at most once per simulation minute. Usage goes through the commercial meter when that pack is active.

Each output records its parent, source interaction or booking, operation, pack version, language, quality, capture region, processing region, storage region, access and expiry. Output quality cannot exceed its parent's quality. Access intersects the plan, parent, archive and current reader policy; retention cannot outlive the parent. One fictional GB holds 100 record objects, an explicit balancing rule unrelated to bandwidth or seats. The 500-record evidence limit blocks new capture/outputs rather than discarding referenced ancestors.

Read requests check persona, current reader policy, record permissions and access location. Holds require a hold-authority persona. Removal includes descendants and atomically fails if any affected record is held. Expiry removes access to each expired unheld record. Deleted/expired records retain tombstone metadata and parent links for audit; they no longer satisfy assessment or serve as processing input. Releasing a hold permits expiry on the next time advance. No live personal information or model is processed.

The advanced government assessment requires a completed processing job as well as a retained transcript. Alternative valid processing chains are accepted; the grader does not compare against a reference configuration. Local processing and captions still require local licensing, identity, DNS, time and certificates. Configured region rules are fictional scenario boundaries and imply no governmental approval.

## Contact operations pack

`soc-contact-1` provisions its IVR menu independently. Each digit maps to a queue, skill and language. Missing queues fail provisioning and preserve the previous effective menu; omitted/unknown digits fail the synthetic call with an inspectable reason. Queue policies support insertion order, voice first and longest current queue wait. These policies never create agent entitlements or skilled people.

A callback request closes the original queued call, retaining its case and source identity. After a configured delay, a new synthetic call leg uses current routing and availability; bounded attempts retain the root journey link and explicit failure reasons. The contact's unresolved need survives the delay, while the original session is free. A completed callback can only follow a resolved attempt.

Cold transfers queue at the new destination; warm transfers require an additional available, entitled, skilled person immediately. Both preserve case context, record the old/new queues and reset the destination waiting clock. The source handler's wrap-up load remains reserved until its timer expires, independently of the destination handler. Transfers to the same queue are rejected as loops.

Supervisor personas can record a synthetic quality review after completion; the quality result remains distinct from technical delivery. A failing review prevents exercise completion, and revisions replace the previous current review while retaining trace events. Review scores are explicit simulated human input, not an inferred measurement of generated conversation text. Automated coaching, forecasting, detailed individual rosters, voicemail and shared reception services remain pending.
