# Cisco VoIP archive issue proposals

This is a research proposal pack, not an accepted requirements register, an implementation, or a claim about current Cisco product behavior. The primary source is the [Cisco VoIP mailing-list archive](https://puck.nether.net/pipermail/cisco-voip/). Twelve bounded historical threads are recorded in [cisco-voip-findings.json](../../research/community/cisco-voip-findings.json), each with a direct archive URL, visible date/version context, paraphrased issue, evidence type, uncertainty, current mechanic/gap, fictional scenario, dependencies, and positive/negative acceptance proposals.

## Retrieval and evidence limits

The archive root and month indexes could not be retrieved by the available web reader (cache/access errors). Archive posts were discovered through indexed search and opened as individual primary archive pages or original archive attachments. This was not a bulk crawl and is not an exhaustive survey. Mailing-list reports are anecdotes. Suggested diagnoses and fixes are attributed as participant reports, not treated as verified root cause or current support guidance. Each proposal preserves the version context available in the thread; absent versions are explicitly marked.

The sample covers mid-call SDP/hold interoperation, blind transfer media, BLF transfer behavior, cluster trunk ingress, SIP cutover dial-plan context, device configuration and firmware, room-endpoint provisioning, phone trust onboarding, edge clustering, partial device migration, and release compatibility. It includes both reports with participant-described outcomes and unresolved reports. No individual names, email addresses, organizations, addresses or real telephone numbers are needed to implement the scenarios; source URLs identify archived posts only.

## Proposals for review

| Stable ID | Historical pattern | Candidate gameplay distinction |
| --- | --- | --- |
| `RES-CISCO-VOIP-001` | Hold/resume offer-answer mismatch | Signalling can succeed while a resumed media leg stays inactive; endpoint profiles are version-specific. |
| `RES-CISCO-VOIP-002` | Blind transfer through trunk yields one-way audio | Transfer creates a fresh media leg with trunk-profile/SDP-direction dependencies. |
| `RES-CISCO-VOIP-003` | BLF key path fails while manual dialing works | Endpoint key sequence and firmware capability are separate from route reachability. |
| `RES-CISCO-VOIP-004` | SIP trunk request lands on a node outside its device-pool group | Ingress node membership can reject a valid number before dial-plan resolution. |
| `RES-CISCO-VOIP-005` | SIP cutover produces an IVR 404 | Search-space visibility and device-pool context are hypotheses to diagnose, not assumed root cause. |
| `RES-CISCO-VOIP-006` | Registered phone has stale config/time | Registration does not prove config parsing, timezone or observed settings are current. |
| `RES-CISCO-VOIP-007` | Phone registers but display/firmware upgrade fails | Active registration, staged image, hardware revision and UI capability have independent states. |
| `RES-CISCO-VOIP-008` | Room endpoint settings revert; SIP URI changes | Provisioning authority, endpoint family/software mode and canonical URI mapping must align. |
| `RES-CISCO-VOIP-009` | Phone onboarding TLS fails although desktop MRA works | Trust roots and enrollment must be checked per endpoint type. |
| `RES-CISCO-VOIP-010` | Edge cluster warns about an unseen local zone | Operational cluster status, hidden/inherited objects and peer control traffic can disagree. |
| `RES-CISCO-VOIP-011` | Device import partially fails during platform migration | Row-level field mapping, inactive records and uniqueness conflicts need separate retry evidence. |
| `RES-CISCO-VOIP-012` | Upgrade plan may strand older endpoint models | Target-release compatibility must be checked against inventory and host baseline before cutover. |

Candidate source links are listed per record using existing stable `uc-new:domain:*` and family IDs. They are discovery links only; they do not claim a source mapping was fully implemented. Current mechanics/gaps are recorded per finding, including overlap with the estate work package and the calling/media work package. The core acceptance contract should be considered only after maintainer review of each proposed behavior and its source linkage.

## Fictionalization

Use these reports to model dependencies and recoverable configuration mistakes, not to dramatize or mock real incidents. Preserve neutral synthetic diagnostics such as `TRUNK_INGRESS_NODE_MISMATCH`, `ENDPOINT_CONFIG_PARSE_FAILED`, `PHONE_TRUST_CHAIN_UNAVAILABLE`, and `MIGRATION_ROW_CONFLICT`. Any playful naming should apply only to fictional components and must leave the dependency and recovery step clear. The source archive remains unchanged.
