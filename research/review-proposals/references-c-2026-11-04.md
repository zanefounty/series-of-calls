# Reference review proposal: batch C — 2026-11-04

**Status:** independent research proposal pending owner acceptance. It does not modify `research/reviews.json` or accept claims.

This check covers generated-reference indices 60–62 and 68–90: three pinned upstream project files and 23 historical Cisco VoIP or VoiceOps messages. The five jurisdiction observations at indices 63–67 are in the separate [jurisdiction review proposal](jurisdictions-2026-11-04.md). The companion [JSON proposal](references-c-2026-11-04.json) records exact IDs, source URLs, dates, claims, requirements, and uncertainty.

Mailing-list messages are historical operator reports and technical discussions. They do not establish current vendor behavior, support policy, carrier policy, fees, or legal advice. Earlier web-tool Cache misses are retained as access history; exact pinned upstream files were subsequently retrieved through the connected GitHub tool.

## Findings

### Upstream architecture — REF-01c1db3086024441

**IDs:** `CLAIM-a19ffea5ac479551` · `REQ-b8f252f0789bdaa8`  
**Recommendation: revise.**

The exact pinned docs/ARCHITECTURE.md was successfully retrieved through the connected GitHub file tool at commit 48e6200c532d486f79bc8376de0aecbf6169123b. The earlier web-tool and raw URL attempts returned Cache miss; those failures are retained in checkedSources. The pinned document confirms a static page assembled from ordered src files into one classic HTML page, with shared top-level script scope, a canvas/map layer, panel/UI layers, and an in-memory jsdom harness. It supports those architecture observations, but not every proposed behavior as an upstream guarantee.

**Source:** [Pinned upstream architecture](https://github.com/fjaeckel/seriesoftubes/blob/48e6200c532d486f79bc8376de0aecbf6169123b/docs/ARCHITECTURE.md) — Commit 48e6200c532d486f79bc8376de0aecbf6169123b; GitHub connector retrieved 2026-11-04.

**Proposed claim:** At commit 48e6200, Series of Tubes builds an assembled static HTML page from ordered source files into one classic script with shared scope, a canvas/map layer, and separate UI/panel layers. Use these as design references where they fit the expanded domain; keep browser smoke checks as independent acceptance requirements.

**Scope and uncertainty:** The pinned document describes the upstream architecture, not a requirement that the fork preserve every component or exact layout. The separate real-browser smoke-test criteria are fork acceptance requirements, not claims proven by this architecture file.

### Save implementation — REF-8af7f0c64e902296

**IDs:** `CLAIM-456d0885be38f7ff` · `REQ-090973d00531c506`  
**Recommendation: revise.**

The exact pinned `src/game/91-save.js` was successfully retrieved through the connected GitHub file tool at commit 48e6200c532d486f79bc8376de0aecbf6169123b. This file writes one `sot-save-v1` localStorage key, supports gzip storage for large saves, exports an object with `app: series-of-tubes` and `version`, and accepts `v===1` save data with basic day/cash/pops/links validation. Migration and sanitize are referenced as upstream functions elsewhere; this file does not establish an ISP-specific field inventory, slot scheme, version-stamped cache, or license terms. Earlier web and raw URL attempts returned Cache miss and are retained below.

**Source:** [Pinned upstream save implementation](https://github.com/fjaeckel/seriesoftubes/blob/48e6200c532d486f79bc8376de0aecbf6169123b/src/game/91-save.js) — Commit 48e6200c532d486f79bc8376de0aecbf6169123b; GitHub connector retrieved 2026-11-04.

**Proposed claim:** At commit 48e6200, the game stores a version-1 state in the `sot-save-v1` key, gzip-compresses large saves, and wraps exports with `series-of-tubes` app and version metadata. A fork should use an isolated namespace and define its own validation/migration needs. This save file does not establish the later slot system, an ISP-specific schema, or license terms.

**Scope and uncertainty:** The save implementation supports isolation and validation as fork design concerns, but this file alone does not define migration/sanitize internals, all saved fields, or legal notice requirements. Preserve applicable license terms based on the actual license text. Do not import details from later upstream versions into this pinned-source finding.

### Upstream test harness — REF-31e291b1eee75a7a

**IDs:** `CLAIM-e0ab5deab9125280` · `REQ-f9a2946baca6d3c9`  
**Recommendation: revise.**

The exact pinned tests/harness.js was successfully retrieved through the connected GitHub file tool at commit 48e6200c532d486f79bc8376de0aecbf6169123b. It assembles the page using scripts/lib/page, loads it in jsdom, seeds Math.random, stubs Path2D and provides a recording fake canvas context. It supports the deterministic headless harness claim. The proposed real-browser smoke checks remain separate fork acceptance work. Earlier web and raw URL attempts returned Cache miss and are retained.

**Source:** [Pinned upstream test harness](https://github.com/fjaeckel/seriesoftubes/blob/48e6200c532d486f79bc8376de0aecbf6169123b/tests/harness.js) — Commit 48e6200c532d486f79bc8376de0aecbf6169123b; GitHub connector retrieved 2026-11-04.

**Proposed claim:** At commit 48e6200, the upstream harness assembles the page in memory, runs it in jsdom with seeded randomness, and stubs canvas APIs for deterministic tests. Retain the headless pattern where useful and independently add real-browser checks for topology, inspector, mobile controls, and save/reload.

**Scope and uncertainty:** The exact source verifies the deterministic headless harness. Browser checks for topology, inspector, mobile controls and save/reload are proposed fork acceptance requirements and are not implemented or evidenced by this file.

### SIP Load and Re-Invite — REF-ce4e6c93d4f7f11d

**IDs:** `CLAIM-39b53c7bcd8fa320` · `REQ-39b53c7bcd8fa320`  
**Recommendation: accept.**

The archived thread was accessible. It explicitly discusses the pre-8.5 inactive SDP expectation and says 8.5 removed that requirement. This supports only the historical explanation and version boundary; it is not current endpoint behavior.

**Source:** [SIP Load and Re-Invite](https://puck.nether.net/pipermail/cisco-voip/2011-April/021307.html) — 2011-04-15.

**Proposed claim:** In a 2011 Cisco VoIP list discussion, a participant described a pre-CUCM-8.5 hold/resume interoperability case where an inactive SDP answer could leave media inactive, and said 8.5 changed that requirement. The thread does not confirm a particular customer's repair.

**Scope and uncertainty:** Technical discussion and cited release-note characterization, not controlled reproduction. Bound to the historical call flow and peer behavior; no current Cisco or SIP behavior is inferred.

### One-way audio after BLIND transfer to SIP Trunk — REF-caf76921eb104f1f

**IDs:** `CLAIM-2b2d832208d9f39c` · `REQ-2b2d832208d9f39c`  
**Recommendation: unresolved.**

The original URL and retry both returned web-tool Cache miss. The existing source record preserves the date, report and replies, but this pass could not independently inspect the archive page. Keep the proposed claim provisional until the page can be retrieved.

**Source:** [One-way audio after BLIND transfer to SIP Trunk](https://puck.nether.net/pipermail/cisco-voip/2014-April/035734.html) — 2014-04-30 per preserved source record.

**Proposed claim:** Pending direct archive recheck: a 2014 list report described one-way audio after a blind transfer through a CUBE/SIP trunk to a mobile, with replies discussing SDP direction and an early-offer-specific setting; a separate participant reported a fix in another case. The original reporter's outcome is not established by the preserved record.

**Scope and uncertainty:** The existing record describes a historical incident, but source retrieval was unavailable. The proposed profile remedy is conditional and reportedly from a separate instance; do not prescribe it as generally safe.

### Transfer using BLF Speed Dial on 9.1 — REF-b975a5563a7e48f0

**IDs:** `CLAIM-2f08185dc79f23ef` · `REQ-2f08185dc79f23ef`  
**Recommendation: unresolved.**

The exact archive URL and retry returned Cache miss. The existing dated source record supports the details but could not be verified against the live archive in this review.

**Source:** [Transfer using BLF Speed Dial on 9.1](https://puck.nether.net/pipermail/cisco-voip/2013-April/031722.html) — 2013-04-02 per preserved source record.

**Proposed claim:** Pending direct archive recheck: the preserved 2013 source record reports a BLF key starting a new call during transfer on a 9951 setup, while manual dialing worked; a reply suspected firmware and suggested an engineering special, with no recorded confirmation of the fix.

**Scope and uncertainty:** Firmware diagnosis and engineering-special remedy are participant-attributed and old. No present-day product behavior or fix is implied; source retrieval remains unresolved.

### quick question about sip and CUBE — REF-a40f3ce6a34d2530

**IDs:** `CLAIM-2af25b61b00d01cc` · `REQ-2af25b61b00d01cc`  
**Recommendation: accept.**

The archive page was accessible and includes the ingress node and peer preference discussion, the reporter's reported outcome, and later-version all-node setting. This is one cluster configuration report, not a general cause of 503 responses.

**Source:** [quick question about sip and CUBE](https://puck.nether.net/pipermail/cisco-voip/2013-April/031839.html) — 2013-04-10.

**Proposed claim:** In a 2013 report, an inbound SIP request reached a CUCM node outside the trunk's call-manager group and received 503. The reporter said reversing peer preference restored calls; a reply discussed all-node trunk operation in later releases.

**Scope and uncertainty:** The customer's exact CUCM version is not identified. Later-version option details and historical behavior should remain version-scoped; no universal 503 diagnosis is supported.

### UCCX not working after change to SIP — REF-0d42f4b3d7e3d297

**IDs:** `CLAIM-854083e86a66110b` · `REQ-854083e86a66110b`  
**Recommendation: accept.**

The archived thread was accessible. It confirms the reported transition and 404 and contains troubleshooting hypotheses without a confirmed resolution.

**Source:** [UCCX not working after change to SIP](https://puck.nether.net/pipermail/cisco-voip/2019-October/048395.html) — 2019-10-13.

**Proposed claim:** A 2019 Cisco VoIP list report described a UCCX IVR returning 404 after a move from ISDN/H.323 to central SIP despite a dial-peer match. Replies proposed CSS, partition or device-pool checks, but the thread has no confirmed fix.

**Scope and uncertainty:** Hypotheses in replies are not established causes. This is not a current UCCX migration rule or a general interpretation of SIP 404.

### 7945 phone has wrong time and can't verify config — REF-0bffb652b76883d9

**IDs:** `CLAIM-f913436cdd150d04` · `REQ-f913436cdd150d04`  
**Recommendation: accept.**

The archive was accessible and supports the symptom and multiple possible causes. The thread does not confirm which hypothesis applied or a resolution.

**Source:** [7945 phone has wrong time and can't verify config](https://puck.nether.net/pipermail/cisco-voip/2013-November/033901.html) — 2013-11-05.

**Proposed claim:** A 2013 report described a registered Cisco 7945 showing incorrect time and not receiving updated configuration. A reply listed device type, TFTP, firmware timezone and XML validity as possibilities; no cause or repair is confirmed in the thread.

**Scope and uncertainty:** Suggestions are troubleshooting possibilities for old endpoint/CUCM contexts, not a confirmed diagnosis or current device guidance.

### 8831 stuck on logo on keypad — REF-2985477e6ab52c6f

**IDs:** `CLAIM-2ca1de1ca67457cc` · `REQ-2ca1de1ca67457cc`  
**Recommendation: accept.**

The archive was accessible and supports the symptom and the reply's conditional firmware/hardware suggestion. The record does not establish that the reporter applied it or resolved the fault.

**Source:** [8831 stuck on logo on keypad](https://puck.nether.net/pipermail/cisco-voip/2015-October/041045.html) — 2015-10-28.

**Proposed claim:** In a 2015 thread, an 8831 was reported stuck at its logo/keypad while still reachable and registered. A reply suggested a hardware-revision-specific 10.3.1 load based on another case; the original report's resolution is not recorded.

**Scope and uncertainty:** Do not treat 10.3.1 as a current fix or as confirmed for the reported device; retain historical hardware and version context.

### webkit fun! — REF-03fc3d994c353069

**IDs:** `CLAIM-b63cdc1e4b48a423` · `REQ-b63cdc1e4b48a423`  
**Recommendation: accept.**

The archive was accessible, including log excerpts and the reply about managed provisioning. It supports a historical account of configuration reset and URI reachability symptoms, but not a general behavior for all endpoints or a confirmed fix for the URI issue.

**Source:** [webkit fun!](https://puck.nether.net/pipermail/cisco-voip/2018-September/046676.html) — 2018-09-17.

**Proposed claim:** A 2018 report describes CUCM resetting local settings on a room endpoint and a URI change affecting reachability. A reply says managed provisioning could sync supported settings over SIP. The thread does not confirm a fix for the URI issue.

**Scope and uncertainty:** Endpoint model and exact configuration scope matter. SIP provisioning and URI behavior are described by participants in a 2018 operational context, not as current vendor policy.

### MRA Onboarding via activation code... phone trust list? — REF-b807374341cb4592

**IDs:** `CLAIM-153588976b69210c` · `REQ-153588976b69210c`  
**Recommendation: revise.**

The initial archive page was accessible but the retrieved portion did not include the later reply said to contain the resolution. The connection failure is directly visible; the reported trust-path resolution remains unverified in this access pass.

**Source:** [MRA Onboarding via activation code... phone trust list?](https://puck.nether.net/pipermail/cisco-voip/2021-November/050355.html) — 2021-11 per archive path.

**Proposed claim:** A 2021 report describes an 8845 activation-code MRA flow reaching cloud handshake but failing TLS to Expressway-E. The source record attributes a subsequent successful registration to a trust-path change, but that reply was not independently retrieved in this review.

**Scope and uncertainty:** Keep the trust-list change attributed to the reported historical thread, but do not treat it as verified or as present-day MRA configuration guidance. The archive portion containing the reply was not captured.

### Expressway Clustering... — REF-66f30c9ce62710dc

**IDs:** `CLAIM-3a5b9328fd8234d7` · `REQ-3a5b9328fd8234d7`  
**Recommendation: accept.**

The attached HTML thread was accessible. It includes packet-capture observations, firewall change and a cleared warning, while describing the cluster as operational. This is a reported environment-specific resolution.

**Source:** [Expressway Clustering attached thread](https://puck.nether.net/pipermail/cisco-voip/attachments/20220514/1ee03a22/attachment-0001.htm) — 2022-05-14.

**Proposed claim:** In a May 2022 report, an Expressway cluster showed a LocalZone warning and RAS UDP/1719 probes received no response. The operator reported that allowing the firewall traffic cleared the warning while the cluster remained operational.

**Scope and uncertainty:** The thread supports this reported environment only. UDP/1719 and warning behavior should not be generalized to current Expressway versions or other cluster configurations.

### Import on CUCM Several Failed Devices — REF-5d4452fa6d915fc5

**IDs:** `CLAIM-4116975e2ef74f39` · `REQ-4116975e2ef74f39`  
**Recommendation: accept.**

The archive was accessible and supports the partial import outcome, inactive number explanation, and discussion of a duplicate constraint. The remaining pickup-group issue is not documented as resolved.

**Source:** [Import on CUCM Several Failed Devices](https://puck.nether.net/pipermail/cisco-voip/2013-October/033565.html) — 2013-10-09.

**Proposed claim:** A 2013 CUCM bulk import had partial failures: some inactive number entries explained rejected rows, while a duplicate pickup-group/line constraint was discussed without a confirmed resolution.

**Scope and uncertainty:** The constraints belong to the reported historical CUCM import workflow and should not be asserted for other provisioning interfaces or current releases.

### CUCM SU release cycle — REF-16fcbb5b2fd59e07

**IDs:** `CLAIM-572ffa82cf9601fe` · `REQ-572ffa82cf9601fe`  
**Recommendation: accept.**

The archived discussion was accessible and supports the stated planning concerns. It is a dated upgrade-planning exchange, not current version compatibility guidance or evidence a migration completed.

**Source:** [CUCM SU release cycle](https://puck.nether.net/pipermail/cisco-voip/2019-August/048059.html) — 2019-08-21.

**Proposed claim:** A 2019 list discussion considered a CUCM 11.0-to-12.5 upgrade, virtualization baselines, and older phone support. It records planning concerns, not a completed migration or current compatibility matrix.

**Scope and uncertainty:** All platform versions and compatibility details are historical. Do not reuse them as current upgrade advice; verify present compatibility from current vendor documentation.

### The peer of my peer is my peer? — REF-86107818a4d492f7

**IDs:** `CLAIM-2b57da9c60033cfd` · `REQ-2b57da9c60033cfd`  
**Recommendation: accept.**

The archived thread was accessible and supports the mismatch and participant suggestions. The proposed remedies are discussion, not a confirmed change or general provider rule.

**Source:** [The peer of my peer is my peer?](https://puck.nether.net/pipermail/voiceops/2010-August/001763.html) — 2010-08-10.

**Proposed claim:** In a 2010 VoiceOps thread, two customer trunks through one provider were reported with G.729-only and G.711-only codec profiles and no common codec. Participants suggested a shared codec or transcoding; no confirmed remediation is recorded.

**Scope and uncertainty:** Anecdotal two-trunk case in 2010. Codec availability and transcoding behavior are endpoint/provider-specific; nothing here establishes present-day provider capability.

### Ye ole Cisco Cube CM — REF-5d951bf30e3c96d3

**IDs:** `CLAIM-86b1025e597d449d` · `REQ-86b1025e597d449d`  
**Recommendation: unresolved.**

The original archive URL and retry returned Cache miss. Existing source metadata and claim capture the reported race, but this pass could not verify the thread or exact date directly.

**Source:** [Ye ole Cisco Cube CM](https://puck.nether.net/pipermail/voiceops/2010-August/001764.html) — August 2010 per archive path; exact message date not retrieved.

**Proposed claim:** Pending archive recheck: the preserved source record describes a CUBE call-race case where a 200 response and cancellation left call legs inconsistent. Exact date, sequence and outcome need direct source confirmation.

**Scope and uncertainty:** Unverified archive retrieval. Treat as an unresolved historical report only; do not infer current CUBE race behavior or general SIP transaction semantics from it.

### VoIP - complete outage at DASH Carrier Services — REF-f8221f4fdcb2415b

**IDs:** `CLAIM-ece39a4dede39c7d` · `REQ-ece39a4dede39c7d`  
**Recommendation: accept.**

The archive was accessible. It is an outage inquiry with a limited recollection of prior service, not a verified incident report or provider assessment.

**Source:** [VoIP - complete outage at DASH Carrier Services](https://puck.nether.net/pipermail/voiceops/2010-December/002106.html) — December 2010.

**Proposed claim:** A December 2010 VoiceOps post asked about a possible DASH Carrier Services outage. The thread offers no confirmed scope, cause or duration; a participant only recalled positive prior experience.

**Scope and uncertainty:** No outage details or causal evidence are established. Do not treat the post as proof of outage, provider reliability, or current service status.

### SBC's that drop traffic based on domain — REF-6e6184fda25bddb4

**IDs:** `CLAIM-c9a58510901736f8` · `REQ-c9a58510901736f8`  
**Recommendation: accept.**

The archive was accessible and includes the observed 404, filtering discussion and version-specific suggestions. The reply does not establish how current SBC versions behave.

**Source:** [SBC's that drop traffic based on domain](https://puck.nether.net/pipermail/voiceops/2011-June/002582.html) — June 2011.

**Proposed claim:** A 2011 VoiceOps case reports an SBC filter intended to drop traffic by domain while traffic matching behavior depended on destination IP, and observed 404 Registrar Not Found. Replies discuss packet captures and a reject action difference between the then-referenced 6.1 and 6.2 versions.

**Scope and uncertainty:** Vendor/version context is historical and incomplete. Keep the behavior and response code tied to the example; verify any real deployment against its current manual and capture.

### Allworx Followme - no audio issue — REF-3cc23cc2422be034

**IDs:** `CLAIM-a1e3ccd52cec0563` · `REQ-a1e3ccd52cec0563`  
**Recommendation: accept.**

The archive was accessible and preserves competing explanations and the reporter's later observation. It does not confirm the media-latch hypothesis.

**Source:** [Allworx Followme - no audio issue](https://puck.nether.net/pipermail/voiceops/2011-July/002645.html) — 2011-07-22.

**Proposed claim:** A 2011 follow-me report described answer confirmation followed by no audio. Replies proposed a re-INVITE/media-latching cause, but the reporter later supplied a TTL observation that did not confirm it; the thread leaves cause unresolved.

**Scope and uncertainty:** Cause remains unresolved. RTP counters or packets on unrelated legs do not establish that intended receiver media works; avoid encoding a vendor-specific root cause.

### Routing and translations contacts — REF-bcbd90c63b48817f

**IDs:** `CLAIM-80e3c074a4faa1eb` · `REQ-80e3c074a4faa1eb`  
**Recommendation: accept.**

The archive was accessible and confirms this is a routing/translation escalation question without a documented resolution.

**Source:** [Routing and translations contacts](https://puck.nether.net/pipermail/voiceops/2012-September/003540.html) — 2012-09-04.

**Proposed claim:** A September 2012 operator asked how to reach a carrier team that could inspect routing or translation data when an alternate route worked and the current carrier path failed. The thread does not provide a resolution.

**Scope and uncertainty:** The report demonstrates a process question, not a named carrier's support procedure or quality. No current contact or escalation path is supported.

### Canadian Toll Free — REF-3c35bbedeac1d5e8

**IDs:** `CLAIM-20db5406df6f89dd` · `REQ-20db5406df6f89dd`  
**Recommendation: accept.**

The archive was accessible and supports that participants proposed these explanations and a workaround. One participant expressly noted they were not logged into the relevant SMS source. It is not authoritative present-day routing or regulatory guidance.

**Source:** [Canadian Toll Free](https://puck.nether.net/pipermail/voiceops/2014-May/004724.html) — 2014-05-06.

**Proposed claim:** In a May 2014 VoiceOps thread, participants proposed origin geography, carrier identification, service-area or tandem differences as possible reasons Canadian toll-free calls failed from some origins; a workaround was suggested. The discussion was not authoritative or a confirmed current rule.

**Scope and uncertainty:** Terminology and route details belong to a historical participant discussion. Do not present as current Canadian toll-free policy, carrier requirement, or universal cause.

### Which Softswitch? — REF-92fc12a39434ac75

**IDs:** `CLAIM-ade44259370a7ba7` · `REQ-ade44259370a7ba7`  
**Recommendation: accept.**

The archive was accessible. The original asks about a class-4 softswitch design and support in Australian hours; one response recommends CSRPSwitch. The thread does not compare vendors systematically or establish current product quality.

**Source:** [Which Softswitch?](https://puck.nether.net/pipermail/voiceops/2015-June/005619.html) — 2015-06-20.

**Proposed claim:** A 2015 class-4 softswitch discussion raised support coverage, geographic redundancy, integrations, operational skills and lifecycle cost; a reply offered an individual recommendation. It is not a comparative vendor evaluation.

**Scope and uncertainty:** Individual preferences from 2015, not current procurement advice, an objective vendor comparison, or evidence a named platform is superior.

### Upcoming Fees for Text Enabled Telephone Numbers (Bandwidth.com) — REF-625698d2aa90d70c

**IDs:** `CLAIM-dcf9b1a68091ce19` · `REQ-dcf9b1a68091ce19`  
**Recommendation: accept.**

The archive was accessible. It records a question and a projected January 2016 monthly fee with expected registry participants, but no final fee, implementation or registry-completeness result.

**Source:** [Upcoming Fees for Text Enabled Telephone Numbers (Bandwidth.com)](https://puck.nether.net/pipermail/voiceops/2015-November/006074.html) — 2015-11-24.

**Proposed claim:** A November 2015 post asks about a proposed fee for text-enabled numbers and a portability-corrected messaging registry. A reply described a projected fee effective January 2016 and anticipated registry providers; the thread does not confirm the final fee or subsequent registry behavior.

**Scope and uncertainty:** A projected fee is not proof it took effect. Do not infer current registry providers, portability handling, fees or carrier routing from the thread.

### Perimeta SBC & TCP — REF-0fe3ded413d45133

**IDs:** `CLAIM-d59ddbd1b8c58937` · `REQ-d59ddbd1b8c58937`  
**Recommendation: revise.**

The archive was accessible and details the migration topology and idle-connection concern. The reply explicitly says its discussion is general rather than specific to Perimeta and BroadSoft; it describes possible keepalive layers and says OPTIONS polling had worked in the responder's experience.

**Source:** [Perimeta SBC & TCP](https://puck.nether.net/pipermail/voiceops/2015-December/006244.html) — 2015-12-17.

**Proposed claim:** A 2015 Perimeta/BroadSoft migration thread reports an idle TCP signaling path being closed by a firewall, leaving connectivity stale. A reply, explicitly speaking generally rather than specifically about those products, discusses TCP keepalive, TLS heartbeat and SIP OPTIONS as possible techniques based on its experience.

**Scope and uncertainty:** The advice is historical practitioner experience, not vendor-specific confirmation or current timer guidance. Keepalive availability and behavior vary with transport, endpoint, SBC and firewall configuration.

### Three Digit Numbers — REF-339fdf527eed6fc1

**IDs:** `CLAIM-71372a8a464b2598` · `REQ-71372a8a464b2598`  
**Recommendation: accept.**

The archive was accessible and shows a participant asking for a crowdsourced N11 list, an operator describing local/county variation, and another sharing a historical 711 translation list for some states while still requesting other providers' data. The thread presents incomplete operator-collected information, not a complete or authoritative mapping.

**Source:** [Three Digit Numbers](https://puck.nether.net/pipermail/voiceops/2020-March/008394.html) — 2020-03-26.

**Proposed claim:** A March 2020 VoiceOps discussion describes differing operator experience with N11 routing and calls for geographic mappings. It includes an incomplete operator-supplied 711 list and explicitly leaves other provider information outstanding; it is not authoritative or a validated emergency procedure.

**Scope and uncertainty:** This thread is not a current routing table, emergency-service validation, or legal guidance. Do not route any live emergency or public service call from these historical details; synthetic location tests must remain isolated.

## Limitations

- Earlier web/raw requests for the pinned upstream files returned Cache miss. The connected GitHub tool subsequently retrieved the exact architecture, save and harness files; findings above now use those files and retain the initial access history. No claim of a deleted or dead page is made.
- Cisco/VoiceOps list pages were accessed as historical archives. These discussions do not establish current vendor behavior, support policy, carrier policy, fee schedules, service routes, or regulatory advice.
- The two Cisco pages REF-caf76921eb104f1f and REF-b975a5563a7e48f0 and the CUBE race page REF-5d951bf30e3c96d3 remained unavailable after retry and are marked unresolved. The later MRA resolution reply was not retrieved and is marked as partially checked.
- Recommendations are proposals only. No records in research/reviews.json were changed or accepted.
