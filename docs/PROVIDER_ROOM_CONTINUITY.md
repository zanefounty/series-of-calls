# Declared meeting platforms and Enterprise cutover

Candidate gameplay engineering, 5 November 2026; PLAY-014, PLAY-033 and PLAY-041. These changes do not accept the complete room catalogue or source-specific interoperability obligations.

New Provider campaigns opt into `meetingDependencyVersion: 1`. Paid room and room-product operations configure a versioned `platformDependency` in the information meeting profile. An actual scheduled session records that resource, its generation, profile generation and bidirectional media observations. Losing or replacing the declared dependency fails the scheduled/active session and releases any held capture reservation. An unrelated platform outage does not fail an independent selected platform. Probes remain separate from delivered sessions.

For Enterprise, coexistence preserves the original room platform while migrating Bea to a separately purchased platform. It no longer needlessly reconfigures the original phone resource. Consolidated cutover replaces that platform generation, so a meeting running through the replacement can fail. Subsequent meetings must use the current generation. Migration settlement now requires an actual completed post-cutover room session on the declared current platform as well as the cohort's real inbound/outbound calling and number assignments. A pre-cutover meeting cannot satisfy that predicate.

The paid coexistence platform is visible in the same service map. Selecting the room exposes its platform dependency, capacity, media placement, actual sessions, reservations, capture and failure causes; a scoped button selects the platform.

Legacy saves retain their undeclared meeting contract. When an explicit dependency first becomes effective, `information.meetingDependencyEpoch` records which session number first requires dependency evidence. Earlier legacy sessions remain valid. Unknown versions, malformed references, deleted required proof and deleted epochs fail restore. This is structural lineage validation, not cryptographic authentication of exported JSON.

Verification is in `tests/information-platform-dependency.test.js`, `tests/provider-room-cutover.test.js`, `tests/provider-meeting-lifecycle.test.js` and `tests/provider-meetings-ui.test.js`. They include real dispatch, scheduled capture restore, worker/fallback equivalence, dependency loss, paid cutover alternatives and later recovery. Final frozen browser evidence remains required; independent supplier number-port, calendar-delegation and bridge-lifecycle behaviours remain separately tracked.
