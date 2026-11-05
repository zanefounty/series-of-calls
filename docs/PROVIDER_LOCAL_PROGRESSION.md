# Provider local progression evidence

This adapter evaluates source goal `progress.goal.ca` for the synthetic Provider campaign. It requires all of the following on one Defence customer:

- paid base, carrier, partner, local deployment, recording and transcription projects;
- effective jurisdiction-local identity, access, phone, carrier, messaging and engagement resources, plus the local site’s identity, DNS, time, certificate, licensing and backup controls;
- a real connected voice interaction and a real disconnected interaction during the authored outage, after local autonomy is exhausted, with the offline work inside the funded autonomy window;
- paid local spares and recovery, followed by a completed scoped reconciliation receipt that names the actual offline interaction and case;
- a complete retained recording, a completed local speech processing job derived from that recording, and a transcription artefact in the same jurisdiction.

Voice-only work is supporting evidence and remains incomplete for this goal. It cannot produce an awardable evidence object. The evaluator is pure; it grants no money, changes no customer state and makes no external approval claim.

Evidence includes the customer market, tenant, jurisdiction, paid project and posting IDs, resource generations, actual interaction/case/job IDs, outage timing, reconciliation item and speech lineage. `validateEvidence` rebuilds the evidence from current retained state. Historical validation uses the pinned original project IDs and dependency snapshots, so a later paid local deployment does not rewrite an already earned path. `retentionPins` returns the exact interaction, case, Provider job, processing job, record, incident and project IDs that a parent progression receipt must preserve. Parent save validation owns the versioned pin marker and its receipt binding.

The local autonomy failure and spares recovery use synthetic campaign incidents and paid Provider operations. This does not establish real-world service continuity, licensing, legal compliance or vendor acceptance.
