# Historical telecom incidents: 75 possible gameplay use cases

These are **research proposals**, not implemented missions or accepted requirements. Archive reports are historical and anecdotal. The evidence line paraphrases the cited message; the gameplay line is a fictional adaptation for the synthetic Series of Calls simulator. “Confirmed” means the archive participant reported a diagnosis or fix, not independent verification. “Proposed” and “Unknown” must stay open until a scenario designer chooses a synthetic cause.

Each case can become an exercise that separates desired configuration, provisioning, effective state and observed service. Before adoption, define a reference solution, a plausible alternate where appropriate, a failing configuration and a repeatable synthetic observation.

**Count:** 75 distinct archive links. **Sources:** Cisco VoIP and VoiceOps mailing-list posts. **Period:** 2005–2022.

## Contact centre and workflows (10)

### ARCH-UC-017 — Inbound FXO calls ring but never reach the attendant DN

- **Archive:** Cisco VoIP, 2008-06-19. [Original message](https://puck.nether.net/pipermail/cisco-voip/2008-June/034984.html).
- **Reported evidence:** Calls arrive through an MGCP-controlled FXO port from a GSM-to-analog gateway; outbound calls work, but inbound signaling progresses through ring states and then hangs up.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Follow ring supervision, answer supervision, and MGCP call setup from the analog device to the configured attendant DN.

### ARCH-UC-026 — UCCX inbound calls fail while script appears to continue

- **Archive:** Cisco VoIP, 2012-08-10 (analysis posted 2012-08-13). [Original message](https://puck.nether.net/pipermail/cisco-voip/2012-August/029363.html).
- **Reported evidence:** UCCX 7 logs show inbound calls failing with cause 107 during CTI Port answer; Cisco responder identifies media negotiation failure with the CTI Port and notes the script may appear to continue despite the failed call.
- **Cause status in thread:** Confirmed (media negotiation failure identified).
- **Gameplay proposal:** Compare CTI Port media/resource negotiation with a successful call and determine whether script handling masks the failed call leg.

### ARCH-UC-039 — UCCX HA upgrade degrades into fast busy

- **Archive:** Cisco VoIP, 2016-11-14. [Original message](https://puck.nether.net/pipermail/cisco-voip/2016-November/043324.html).
- **Reported evidence:** After UCCX 10.5-to-11.5 upgrade, calls initially work then both HA nodes begin returning fast busy; failover restores service only briefly; rollback works, roll-forward reproduces after four hours.
- **Cause status in thread:** unknown.
- **Gameplay proposal:** Compare license, Live Data/ECDSA prerequisites, and time-to-failure telemetry before choosing rollback or further upgrade.

### ARCH-UC-044 — CUCM/CUC/UCCX upgrade risk from replication drift

- **Archive:** Cisco VoIP, 2019-01-17. [Original message](https://puck.nether.net/pipermail/cisco-voip/2019-January/047279.html).
- **Reported evidence:** In upgrade planning, a CUC subscriber reported healthy replication from publisher but failed when checked locally; historical hostname change left subscriber tables stale and required rebuild.
- **Cause status in thread:** confirmed (reported historical cause).
- **Gameplay proposal:** Choose go/no-go based on replication checks performed independently on publisher and subscriber.

### ARCH-UC-047 — UCCX IVR fails after migration from ISDN to SIP

- **Archive:** Cisco VoIP, 2019-10-13. [Original message](https://puck.nether.net/pipermail/cisco-voip/2019-October/048395.html).
- **Reported evidence:** Inbound IVR calls get 404 although outbound works and dial-peer matching appears correct; reply proposes CSS/partition or trunk device-pool context.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Trace called number through ingress trunk CSS, partitions, device pool, and routing context.

### ARCH-UC-050 — UCCX upgrade rejects CUCM AXL authentication

- **Archive:** Cisco VoIP, 2020-12-22. [Original message](https://puck.nether.net/pipermail/cisco-voip/2020-December/049937.html).
- **Reported evidence:** During UCCX 10.6-to-12.5 build, Service Provider setup returns CCMAXL authentication exception despite existing AXL user/roles; incorrect password produces a visible credential failure.
- **Cause status in thread:** unknown.
- **Gameplay proposal:** Check AXL API access, publisher/subscriber target, certificate trust, and logs before rebuilding.

### ARCH-UC-059 — SBC blocks registrations with IP Request-URI

- **Archive:** VoiceOps, 2011-06. [Original message](https://puck.nether.net/pipermail/voiceops/2011-June/002582.html).
- **Reported evidence:** Post describes SBC rejecting registrations when Request-URI uses an IP address and suggests a dummy-agent pattern.
- **Cause status in thread:** Confirmed behavior described.
- **Gameplay proposal:** Normalize, sink, or reject such requests deliberately.

### ARCH-UC-062 — Invalid numbers return 503 and are retried

- **Archive:** VoiceOps, 2015-10-13. [Original message](https://puck.nether.net/pipermail/voiceops/2015-October/005925.html).
- **Reported evidence:** Call-center dialer treats 503 as transient, repeatedly redialing invalid numbers; carriers map causes as 503/404/604/CANCEL/487.
- **Cause status in thread:** Confirmed ambiguity and retry behavior.
- **Gameplay proposal:** Set retry classes without suppressing valid calls.

### ARCH-UC-071 — Asterisk runs out of RTP ports under call-center load

- **Archive:** VoiceOps, 2011-09-16. [Original message](https://puck.nether.net/pipermail/voiceops/2011-September/002775.html).
- **Reported evidence:** Asterisk acting as SIP/media proxy for about 30 agents is reported unable to allocate RTP ports; config shows a bounded RTP range.
- **Cause status in thread:** Proposed (port capacity is a lead, not proven).
- **Gameplay proposal:** Compare concurrent calls/conferences to allocated ports and decide whether to expand range or capacity.

### ARCH-UC-073 — IVR fails when caller sends in-band DTMF

- **Archive:** VoiceOps, 2019-05-14. [Original message](https://puck.nether.net/pipermail/voiceops/2019-May/008033.html).
- **Reported evidence:** School IVR accepts RFC2833 only; some callers support in-band DTMF and the SBC/softswitch path cannot transcode.
- **Cause status in thread:** Confirmed codec/interworking gap.
- **Gameplay proposal:** Choose a DSP-capable SBC or adjust endpoint/media path and test digit recognition.

## Fax and analog (3)

### ARCH-UC-005 — VG224 analog calls drop and DTMF/hookflash features fail

- **Archive:** Cisco VoIP, 2007-01-23. [Original message](https://puck.nether.net/pipermail/cisco-voip/2007-January/018793.html).
- **Reported evidence:** Report includes analog-to-analog calls disconnecting when caller hangs up, delayed dial tone after on-hook, hookflash failing for fax forwarding, and users unable to enter banking PINs.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Separate disconnect supervision, hookflash detection, and DTMF relay into independent test cases across the analog call path.

### ARCH-UC-054 — T.38 renegotiation yields malformed UDPTL

- **Archive:** VoiceOps, 2016-10-01. [Original message](https://puck.nether.net/pipermail/voiceops/2016-October/006847.html).
- **Reported evidence:** Grandstream GXW-4248 fax audio cuts at T.38 renegotiation; re-INVITE appears successful, first UDPTL packet is flagged malformed.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Compare IFP payload and negotiation with working ATA; isolate firmware vs interop.

### ARCH-UC-055 — Dynamic T1 fax works for some customers only

- **Archive:** VoiceOps, 2010-12-15. [Original message](https://puck.nether.net/pipermail/voiceops/2010-December/002108.html).
- **Reported evidence:** Adtran TA900/Cisco IAD2400 faxing is inconsistent despite T.38 preference, G.711 fallback, QoS, clean circuits, and no observed loss/jitter.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Build controlled tests across gateway, fax speed, and analog path.

## Identity and security (6)

### ARCH-UC-020 — VG224 SCCP gateway intermittently fails to register

- **Archive:** Cisco VoIP, 2009-09-29. [Original message](https://puck.nether.net/pipermail/cisco-voip/2009-September/005576.html).
- **Reported evidence:** A gateway port is sometimes unregistered; the eventual follow-up reveals the investigated identifier belonged to an unused, unconfigured FXS port, while the original intermittent fault was no longer reproducible. The thread also considers mixed-mode security and transient unregister defects.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Establish a reproducible failure and compare successful/failed SCCP registration traces while verifying each virtual port’s CUCM configuration.

### ARCH-UC-040 — Inbound caller ID displays “Unknown Caller ID.”

- **Archive:** Cisco VoIP, 2016-11-28. [Original message](https://puck.nether.net/pipermail/cisco-voip/2016-November/043351.html).
- **Reported evidence:** New SIP trunk omits quoted calling number in From field; older trunk included it, and 6921 phones show unknown label with number hidden on the single-line display.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Compare inbound From/identity headers and determine whether to normalize presentation or preserve privacy behavior.

### ARCH-UC-069 — Verifier rejects locally signed PASSporTs

- **Archive:** VoiceOps, 2022-06-28. [Original message](https://puck.nether.net/pipermail/voiceops/attachments/20220628/d235ffe6/attachment.htm).
- **Reported evidence:** Calls with customer Identity header fail validation while calls without it pass using carrier-generated PASSporT, across two carriers.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Compare TN, certificate chain, header preservation, and signing claims per hop.

### ARCH-UC-070 — Identity headers disappear on toll-free paths

- **Archive:** VoiceOps, 2022-07-03. [Original message](https://puck.nether.net/pipermail/voiceops/2022-July/009633.html).
- **Reported evidence:** Test tool reports limited success receiving Identity headers on toll-free numbers from multiple providers.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Compare geographic DID and toll-free call paths to locate header loss.

### ARCH-UC-074 — Public SBC answers unsolicited SIP probes

- **Archive:** VoiceOps, 2014-09-03. [Original message](https://puck.nether.net/pipermail/voiceops/2014-September/005076.html).
- **Reported evidence:** Internet-visible SBC responds to INVITE and REGISTER probes with 403 despite the trunk use case not requiring remote registrations; security policy is under review.
- **Cause status in thread:** Confirmed exposure; abuse impact unknown.
- **Gameplay proposal:** Decide source filtering and allowed methods while preserving legitimate carrier interconnect.

### ARCH-UC-075 — Caller ID differs between From and P-Asserted-Identity

- **Archive:** VoiceOps, 2012-07. [Original message](https://puck.nether.net/pipermail/voiceops/2012-July/003435.html).
- **Reported evidence:** Operators discuss which SIP identity header governs caller ID and interconnect behavior.
- **Cause status in thread:** Unknown (configuration/interoperability question).
- **Gameplay proposal:** Trace header values across trusted boundaries and choose canonical identity handling.

## Media and interoperation (9)

### ARCH-UC-022 — SIP trunk call has one-way audio after blind transfer

- **Archive:** Cisco VoIP, 2010-11-12. [Original message](https://puck.nether.net/pipermail/cisco-voip/2010-November/018198.html).
- **Reported evidence:** Incoming trunk calls work directly, but an IP phone transferring to an off-net party without consultation leaves the remote party hearing audio while the phone hears none; thread debates SDP/RTP path and MTP behavior.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Compare pre-transfer and post-transfer SDP, RTP addresses/counters, and media flow-through/flow-around behavior.

### ARCH-UC-025 — H.323 call connects with audio, then drops after five seconds

- **Archive:** Cisco VoIP, 2011-11-11. [Original message](https://puck.nether.net/pipermail/cisco-voip/2011-November/025086.html).
- **Reported evidence:** Calls between PBXs through two gatekeeper-controlled routers connect with two-way audio for five seconds and then disconnect; responder points to gatekeeper monitoring/disconnect behavior as a possibility.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Correlate gatekeeper RAS messages, H.225/H.245 teardown, and disconnect cause at the five-second mark.

### ARCH-UC-027 — CUCM calls to selected PSTN prefixes have no audio

- **Archive:** Cisco VoIP, 2013-02-15. [Original message](https://puck.nether.net/pipermail/cisco-voip/2013-February/031324.html).
- **Reported evidence:** CUCM-registered phone calls to specific prefixes/toll-free numbers connect without either party hearing audio; same destinations work from gateway FXS and CME phones.
- **Cause status in thread:** unknown.
- **Gameplay proposal:** Compare RTP paths and SDP across caller types; decide whether CUCM media anchoring differs.

### ARCH-UC-028 — CCD-over-SAF inbound calls stall in dead air

- **Archive:** Cisco VoIP, 2013-02-28. [Original message](https://puck.nether.net/pipermail/cisco-voip/2013-February/031456.html).
- **Reported evidence:** Calls from CUCM clusters to remote CME phones produce no progress tones and no ring, while reverse direction works; responders ask whether call is incomplete versus connected without audio and recommend DNA.
- **Cause status in thread:** unknown.
- **Gameplay proposal:** Trace digit analysis and SAF route match, choose between call-routing and media paths.

### ARCH-UC-029 — Outbound DTMF is not relayed through CUBE

- **Archive:** Cisco VoIP, 2013-09-28. [Original message](https://puck.nether.net/pipermail/cisco-voip/2013-September/033441.html).
- **Reported evidence:** Inbound provider-to-phone DTMF works, but phone-to-provider DTMF does not on an outbound CUBE SIP call.
- **Cause status in thread:** unknown.
- **Gameplay proposal:** Compare negotiated DTMF relay modes and codec path by direction.

### ARCH-UC-048 — CUCM rejects inbound SIP call with 404

- **Archive:** Cisco VoIP, 2020-04-30. [Original message](https://puck.nether.net/pipermail/cisco-voip/2020-April/049416.html).
- **Reported evidence:** CUCM 12.0 receives INVITE but responds 404; outgoing works and caller has checked CSS and direct phone targeting. Reply raises MTP allocation/DTMF and trunk configuration questions, not a confirmed diagnosis.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Inspect inbound called-number normalization, CSS access, MTP allocation and dial-peer signaling.

### ARCH-UC-060 — Follow-me call loses audio after acceptance

- **Archive:** VoiceOps, 2011-07-19. [Original message](https://puck.nether.net/pipermail/voiceops/2011-July/002640.html).
- **Reported evidence:** Allworx forwards an inbound call back out; after mobile presses 1, audio disappears both ways although RTP is seen on multiple legs.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Trace SDP/RTP tuples across re-INVITE and find first unusable leg.

### ARCH-UC-064 — Intermittent silent calls to mobile network

- **Archive:** VoiceOps, 2015-06-22. [Original message](https://puck.nether.net/pipermail/voiceops/2015-June/005645.html).
- **Reported evidence:** Calls to Rogers connect but lack far-end audio across wholesale carriers/interconnects; SS7 traces show little inbound media after ringing.
- **Cause status in thread:** Proposed — destination network suspected, not confirmed.
- **Gameplay proposal:** Correlate by destination, route, time; escalate with traces.

### ARCH-UC-072 — SIP reachability checks miss failed call completion

- **Archive:** VoiceOps, 2010-06-09. [Original message](https://puck.nether.net/pipermail/voiceops/2010-June/001579.html).
- **Reported evidence:** Operator asks for automated end-to-end tests beyond ping/SIP gateway availability, covering legacy numbers, multiple routes, and actual media.
- **Cause status in thread:** Confirmed monitoring gap.
- **Gameplay proposal:** Design synthetic calls that verify both signaling and recorded tones/media.

## Messaging and media resources (11)

### ARCH-UC-003 — Unity hears prompts but cannot hear recorded message audio

- **Archive:** Cisco VoIP, 2006-01-04. [Original message](https://puck.nether.net/pipermail/cisco-voip/2006-January/009016.html).
- **Reported evidence:** PSTN callers reach Unity and hear greetings, but Unity hears silence during recording; internal-originated calls can record. Follow-up reports that changing policy routing from source-based to destination-based solved it.
- **Cause status in thread:** Confirmed.
- **Gameplay proposal:** Compare RTP return paths for internal versus PSTN calls and isolate policy/VPN routing asymmetry.

### ARCH-UC-006 — Repeated nuisance caller consumes attendant-console lines

- **Archive:** Cisco VoIP, 2007-01-30. [Original message](https://puck.nether.net/pipermail/cisco-voip/2007-January/019012.html).
- **Reported evidence:** Incoming calls from one source repeatedly occupy multiple attendant-console lines; request is to block or send the caller to voicemail. A response describes an inbound calling-number reject translation as an option.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Decide between gateway-level reject and controlled voicemail diversion; verify caller-ID normalization and avoid blocking legitimate shared numbers.

### ARCH-UC-007 — After-hours calls do not route directly to voicemail

- **Archive:** Cisco VoIP, 2007-03-01. [Original message](https://puck.nether.net/pipermail/cisco-voip/2007-March/020164.html).
- **Reported evidence:** A CCM 4.1(3) administrator says time schedules and partitions are configured but calls outside office hours do not reach voicemail. Reply explains time-of-day partition filtering and gives a routing pattern.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Walk through time zone, schedule periods, partition order, CSS, and voicemail route point using an after-hours test call.

### ARCH-UC-012 — Distinguish internal and external call ringing

- **Archive:** Cisco VoIP, 2007-10-18. [Original message](https://puck.nether.net/pipermail/cisco-voip/2007-October/026943.html).
- **Reported evidence:** A CCM 4.2 administrator wants different ring patterns for internal and external calls; response says feasibility depends on whether calls are handled by a CTI-based auto attendant or Unity transfer path.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Trace the call’s redirect/transfer method and determine where external-call identity survives to the phone.

### ARCH-UC-013 — Music on hold becomes dead air after several seconds

- **Archive:** Cisco VoIP, 2008-01-17. [Original message](https://puck.nether.net/pipermail/cisco-voip/2008-January/029632.html).
- **Reported evidence:** CCM 6 callers hear MOH for a few seconds, then silence; resetting the media application restores it temporarily. Packet counters and stream direction are suggested diagnostics.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Compare RTP packet flow at the phone and media resource before and after the five-second boundary.

### ARCH-UC-014 — Unity voicemail is not delivered and MWI stays off

- **Archive:** Cisco VoIP, 2008-02-22. [Original message](https://puck.nether.net/pipermail/cisco-voip/2008-February/030907.html).
- **Reported evidence:** Unity 5.01 with Domino integration accepts messages, but subscribers see no new message and receive neither email nor MWI; event log reports UMR delivery failure due to configuration/connectivity with partner mail server.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Verify Unity message repository delivery, partner mail connectivity, subscriber mailbox state, and MWI signaling independently.

### ARCH-UC-023 — UC540 calls work one direction between SCCP and SIP phones

- **Archive:** Cisco VoIP, 2010-12-14. [Original message](https://puck.nether.net/pipermail/cisco-voip/2010-December/018710.html).
- **Reported evidence:** SIP phones can call Cisco phones and voicemail, but Cisco-to-SIP calls do not ring; SIP calls to outside destinations report busy while Cisco outbound works. Registration counters show SIP phones registered.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Compare dial-peer matching and SIP response behavior in both directions, then inspect the external route’s called-number format.

### ARCH-UC-024 — ITSP calls ring through instead of forwarding to CUE voicemail

- **Archive:** Cisco VoIP, 2011-08-13. [Original message](https://puck.nether.net/pipermail/cisco-voip/2011-August/023392.html).
- **Reported evidence:** External calls through an ITSP SIP trunk keep ringing instead of forwarding to CUE; voicemail works when dialed directly. A reply proposes adding B2BUA on the voicemail dial peer.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Check forwarded-call signaling and whether the provider/CUE call leg preserves the redirect semantics expected by the voicemail peer.

### ARCH-UC-035 — Music on hold disappears across CUBE

- **Archive:** Cisco VoIP, 2016-02-08. [Original message](https://puck.nether.net/pipermail/cisco-voip/2016-February/041685.html).
- **Reported evidence:** Basic SIP calls work; on hold, CUCM emits MOH packets but they do not pass CUBE to provider, and audio returns after unhold.
- **Cause status in thread:** proposed (media port/stream translation investigated).
- **Gameplay proposal:** Compare packet capture and SDP port negotiation across CUBE; decide whether duplex streaming workaround is appropriate.

### ARCH-UC-045 — Forwarded caller reaches the wrong voicemail greeting

- **Archive:** Cisco VoIP, 2019-07-26. [Original message](https://puck.nether.net/pipermail/cisco-voip/2019-July/047932.html).
- **Reported evidence:** PSTN caller reaches Diane, who forwards all calls to Bobbie; question is whether caller can hear Bobbie’s greeting. Discussion identifies global “Last Redirecting Number” behavior and concern over caller experience.
- **Cause status in thread:** confirmed (configuration behavior reported working globally).
- **Gameplay proposal:** Decide voicemail mailbox selection policy and test redirecting-number handling.

### ARCH-UC-053 — External voicemail messages cut off at 49 seconds

- **Archive:** Cisco VoIP, 2022-02-03. [Original message](https://puck.nether.net/pipermail/cisco-voip/2022-February/050485.html).
- **Reported evidence:** Unity 12.5 SU4 messages from external callers truncate at 49 seconds despite a 300-second limit; internal voicemail calls work, and two sites report it.
- **Cause status in thread:** unknown.
- **Gameplay proposal:** Compare SIP/RTP and gateway timers for external versus internal message sessions.

## Operations and observability (8)

### ARCH-UC-002 — FXS module repeatedly dies after weeks

- **Archive:** Cisco VoIP, 2005-03-22. [Original message](https://puck.nether.net/pipermail/cisco-voip/2005-March/003765.html).
- **Reported evidence:** A remote PBX extension crosses a leased-line VoIP path and exits an FXS port into a local PBX; replacement FXS cards reportedly fail after about two weeks. No root cause is stated.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Inspect physical interface conditions, electrical compatibility, call/load patterns, and whether the failure follows the module or chassis.

### ARCH-UC-004 — New analog gateway ports unexpectedly use translation patterns

- **Archive:** Cisco VoIP, 2006-01-30. [Original message](https://puck.nether.net/pipermail/cisco-voip/2006-February/009819.html).
- **Reported evidence:** A newly installed analog interface is intended to behave like existing POTS lines, but its calls are affected by translation patterns; the administrator asks how to exempt those ports.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Trace CSS/partition selection per gateway port and decide where digit normalization belongs.

### ARCH-UC-008 — Some PRI outbound calls hang while others connect

- **Archive:** Cisco VoIP, 2007-03-07. [Original message](https://puck.nether.net/pipermail/cisco-voip/2007-March/020438.html).
- **Reported evidence:** `show voice call summary` shows many channels in setup-fail/release states alongside a few connected or waiting channels; the operator asks whether DSP capacity is implicated.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Correlate channel state, Q.931 cause codes, DSP resources, and call concurrency before changing gateway configuration.

### ARCH-UC-031 — Mixed SIP/SCCP endpoints fail hold/resume

- **Archive:** Cisco VoIP, 2013-11-30. [Original message](https://puck.nether.net/pipermail/cisco-voip/2013-November/034197.html).
- **Reported evidence:** A CUCM 8.6 remote site mixes SCCP with third-party SIP phones; thread concerns hold/resume behavior.
- **Cause status in thread:** unknown.
- **Gameplay proposal:** Reproduce hold/resume by protocol pair and inspect re-INVITE/REFER signaling.

### ARCH-UC-032 — Ringing continues after caller abandons inbound call

- **Archive:** Cisco VoIP, 2014-01-06. [Original message](https://puck.nether.net/pipermail/cisco-voip/2014-January/034372.html).
- **Reported evidence:** Caller disconnects while destination phone is ringing; phone keeps ringing and answering produces silence.
- **Cause status in thread:** unknown.
- **Gameplay proposal:** Follow CANCEL/BYE handling across provider, CUBE, and CUCM; identify which leg fails to clear.

### ARCH-UC-043 — Endpoint-local changes revert or fail to sync with CUCM

- **Archive:** Cisco VoIP, 2018-09-17. [Original message](https://puck.nether.net/pipermail/cisco-voip/2018-September/046676.html).
- **Reported evidence:** CE endpoint settings appear to revert after reset; thread explains that CUCM provisioning can overwrite endpoint values, while supported local changes should synchronize back when provisioned and registered.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Check provisioning state and registration, then compare endpoint and CUCM configuration ownership.

### ARCH-UC-056 — H.323 compromise triggers satellite toll calls

- **Archive:** VoiceOps, 2011-02-08. [Original message](https://puck.nether.net/pipermail/voiceops/2011-February/002293.html).
- **Reported evidence:** A related customer system reportedly placed concurrent expensive satellite calls, yielding a large bill.
- **Cause status in thread:** Confirmed unauthorized calling; precise exploit path unknown.
- **Gameplay proposal:** Contain access, preserve CDRs, identify exposed ingress/authentication.

### ARCH-UC-065 — NATed endpoint becomes unreachable

- **Archive:** VoiceOps, 2015-12-17. [Original message](https://puck.nether.net/pipermail/voiceops/2015-December/006244.html).
- **Reported evidence:** Post discusses TCP keepalive, TLS heartbeat, or SIP OPTIONS to maintain reachability; OPTIONS timeouts can tear down registration.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Balance detection time against signaling load.

## Provisioning and migration (11)

### ARCH-UC-010 — New CME phones register only after regenerating configuration files

- **Archive:** Cisco VoIP, 2007-10-10. [Original message](https://puck.nether.net/pipermail/cisco-voip/2007-October/026688.html).
- **Reported evidence:** On CME 4.1 with per-phone configuration and French/English locales, newly added phones fail to register until `create cnf` is run each time.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Compare generated per-phone XML and TFTP behavior before and after config regeneration; assess template/locale changes.

### ARCH-UC-018 — Migrated phones cannot find CME firmware/configuration

- **Archive:** Cisco VoIP, 2008-09-03. [Original message](https://puck.nether.net/pipermail/cisco-voip/2008-September/037760.html).
- **Reported evidence:** During a move from CallManager to CME, phones report hostname lookup failure, no DNS server, and file-not-found messages; router TFTP/SCCP debug shows no matching requests.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Verify DHCP option 150, phone-stored server settings, DNS, TFTP file inventory, and whether phones are contacting the expected host.

### ARCH-UC-021 — CUCM 6.1 to 7.0 upgrade fails with generic file-access error

- **Archive:** Cisco VoIP, 2009-11-09 (resolved 2009-11-16). [Original message](https://puck.nether.net/pipermail/cisco-voip/2009-November/007285.html).
- **Reported evidence:** Upgrade fails after about 45 minutes from DVD and FTP with an unknown upgrade-file error; follow-up says the restored lab system lacked a Nokia S60 device option package present in production, and installing it allowed the upgrade.
- **Cause status in thread:** Confirmed.
- **Gameplay proposal:** Compare device-option packages and locale inventories between the source and restored lab before retrying an upgrade.

### ARCH-UC-030 — Phone configuration parses incorrectly despite downloading

- **Archive:** Cisco VoIP, 2013-11-05. [Original message](https://puck.nether.net/pipermail/cisco-voip/2013-November/033901.html).
- **Reported evidence:** 7945 receives and authenticates signed config, then XML parsing fails; other models also report verify/config issues. Suggestions include wrong device type, outdated load, or corrupted XML.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Validate TFTP payload, phone model provisioning, and firmware/time-zone compatibility before changing trust lists.

### ARCH-UC-033 — Intermittent phone resets drop active calls

- **Archive:** Cisco VoIP, 2014-06-05. [Original message](https://puck.nether.net/pipermail/cisco-voip/2014-June/036128.html).
- **Reported evidence:** Phones unregister with connectivity error, TCP timeouts and fallback to another CUCM node; seen during network upgrades.
- **Cause status in thread:** proposed (network suspected, not proven).
- **Gameplay proposal:** Correlate keepalive loss, switch changes, and cluster-node transitions.

### ARCH-UC-034 — CUCM refresh upgrade stalls at publisher

- **Archive:** Cisco VoIP, 2015-11-17. [Original message](https://puck.nether.net/pipermail/cisco-voip/2015-November/041211.html).
- **Reported evidence:** Upgrade process times out at publisher despite services appearing up; a reply identifies NTP FQHN beginning with a digit as a known upgrade failure trigger, while another reports CPCD reboot helped a prior stage.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Examine upgrade stage, NTP configured hostname versus resolved status, and publisher reachability.

### ARCH-UC-046 — Hunt pilot alerting name missing on phones

- **Archive:** Cisco VoIP, 2019-08-01. [Original message](https://puck.nether.net/pipermail/cisco-voip/attachments/20190801/c3521011/attachment-0001.htm).
- **Reported evidence:** 7800/8800 phones fail to display hunt pilot alerting name after CUCM 11.5(1)SU5+ changed Call-Info formatting; post attributes it to phone firmware defect and shares normalization workaround.
- **Cause status in thread:** confirmed (defect cited in post).
- **Gameplay proposal:** Compare firmware and Call-Info header before changing SIP normalization.

### ARCH-UC-049 — 7945/7965 firmware upgrade authentication loop

- **Archive:** Cisco VoIP, 2020-10-14. [Original message](https://puck.nether.net/pipermail/cisco-voip/2020-October/049918.html).
- **Reported evidence:** After CUCM 10.5(2)SU10, replacement phones repeatedly fail load authentication for a firmware image; installing intermediate and then target COP loads succeeded. Poster suspects bad bundled firmware copy.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Separate trust-list diagnosis from image integrity and test staged firmware installation.

### ARCH-UC-051 — CUCM bulk device reports truncate on large clusters

- **Archive:** Cisco VoIP, 2021-02-18. [Original message](https://puck.nether.net/pipermail/cisco-voip/attachments/20210218/fad5abe6/attachment.htm).
- **Reported evidence:** After CUCM 12.5 SU3, export and UDP/phone reports fail around 700–800 devices in clusters with thousands of users and tens of thousands of endpoints; TAC identified two bugs, further rollouts were held.
- **Cause status in thread:** confirmed (TAC identified defects; IDs not given in excerpt).
- **Gameplay proposal:** Test report size boundaries and weigh API/CLI extraction against upgrade rollout.

### ARCH-UC-052 — CUCM reports near-full active partition after migration

- **Archive:** Cisco VoIP, 2021-09-29. [Original message](https://puck.nether.net/pipermail/cisco-voip/2021-September/050292.html).
- **Reported evidence:** Fresh PCD migration install shows active partition at 98%; reports suggest standard partition threshold may be noisy, while older OVA sizing can make later upgrade/redeployment difficult.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Compare disk usage and OVA sizing; decide whether alert threshold or capacity migration is warranted.

### ARCH-UC-066 — SPA1x2 locks up or stops registering

- **Archive:** VoiceOps, 2013-01-17. [Original message](https://puck.nether.net/pipermail/voiceops/2013-January/003861.html).
- **Reported evidence:** Ports randomly show off-hook, reject calls, fail registration, or web portal hangs across firmware versions.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Gather firmware/hardware cohort and port telemetry before replacement.

## Routing and numbering (17)

### ARCH-UC-001 — H.323 gateway cannot establish call to CallManager

- **Archive:** Cisco VoIP, 2005-09-14. [Original message](https://puck.nether.net/pipermail/cisco-voip/2005-September/007061.html).
- **Reported evidence:** Calls disconnect with cause 38 after the gateway attempts two dial peers; responder notes TCP connection to CallManager is likely failing, potentially due to source binding or name resolution.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Compare the gateway’s configured H.323 source address and CM name/IP resolution against the packet path; determine which side fails to establish TCP.

### ARCH-UC-009 — PSTN callers hear “No circuit/channel available.”

- **Archive:** Cisco VoIP, 2007-05-10. [Original message](https://puck.nether.net/pipermail/cisco-voip/2007-May/022846.html).
- **Reported evidence:** The incident includes Q.931 DISCONNECT signaling with cause 0x8036 for inbound PSTN traffic.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Determine whether the carrier, PRI channel allocation, or gateway capacity is returning the unavailable-channel condition by comparing both sides’ signaling.

### ARCH-UC-011 — SRST fallback restores a phone’s old extension

- **Archive:** Cisco VoIP, 2007-10-15. [Original message](https://puck.nether.net/pipermail/cisco-voip/2007-October/026810.html).
- **Reported evidence:** Extension Mobility changes a phone’s DN, but during fallback it returns to an earlier number; resetting the phone and gateway did not clear the behavior.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Check fallback configuration and persisted learned DN state; determine whether the stale number is stored on the gateway or provisioned from another source.

### ARCH-UC-015 — Emergency-call alerting and location monitoring requirements

- **Archive:** Cisco VoIP, 2008-03-12. [Original message](https://puck.nether.net/pipermail/cisco-voip/2008-March/031711.html).
- **Reported evidence:** Administrators discuss how to alert staff when a 911 call is placed and whether the system can expose location/callback information or enable monitoring. This is a design gap, not a reported malfunction.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Define the operational response and validate that emergency call location, callback number, and alert reach the right staff.

### ARCH-UC-016 — CME outbound route sends access digit to the PSTN

- **Archive:** Cisco VoIP, 2008-04-22. [Original message](https://puck.nether.net/pipermail/cisco-voip/2008-April/033279.html).
- **Reported evidence:** Internal callers dial 9 for an outside call, and the outbound POTS dial peer forwards all digits without stripping the access digit.
- **Cause status in thread:** Confirmed.
- **Gameplay proposal:** Trace digit transformations from phone to dial peer and choose where the outside-line prefix is removed.

### ARCH-UC-019 — Internal call abruptly plays “cannot be completed as dialed.”

- **Archive:** Cisco VoIP, 2009-05-05. [Original message](https://puck.nether.net/pipermail/cisco-voip/2009-May/000984.html).
- **Reported evidence:** After a year of working, two registered phones at different sites cannot call each other; the prompt is identified as CallManager annunciator, and the call is not routed to a voice gateway.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Inspect CUCM call routing, line state, CSS/partition visibility, and bandwidth/location admission for a local intersite call.

### ARCH-UC-036 — VCS route returns 503 before reaching VCS

- **Archive:** Cisco VoIP, 2016-02-26. [Original message](https://puck.nether.net/pipermail/cisco-voip/2016-February/041842.html).
- **Reported evidence:** CUCM logs 503 for calls routed to VCS; poster later finds the configured port changed and says this explained why calls did not reach VCS, though the overall issue remained partly unresolved.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Verify route-pattern target port and confirm arrival in VCS search history.

### ARCH-UC-037 — Authenticated ITSP registration uses private HA address

- **Archive:** Cisco VoIP, 2016-05-04. [Original message](https://puck.nether.net/pipermail/cisco-voip/2016-May/042220.html).
- **Reported evidence:** ITSP reports CUBE REGISTER requests sourced from inside VIP rather than public interface; existing unauthenticated trunks continue working.
- **Cause status in thread:** proposed (global binding/config scope discussed).
- **Gameplay proposal:** Trace registration source interface and compare global versus tenant-specific bind behavior.

### ARCH-UC-038 — Call recorder receives external mask instead of extension

- **Archive:** Cisco VoIP, 2016-07-01. [Original message](https://puck.nether.net/pipermail/cisco-voip/2016-July/042593.html).
- **Reported evidence:** CUCM SIP INVITEs to a built-in-bridge recorder include external phone number mask on PSTN calls, while recorder expects four-digit extension.
- **Cause status in thread:** proposed.
- **Gameplay proposal:** Inspect trunk classification and calling-party transformation context; choose which identity recorder should consume.

### ARCH-UC-041 — Phone call-history browsing sends presence SUBSCRIBE to PSTN trunk

- **Archive:** Cisco VoIP, 2016-12-22. [Original message](https://puck.nether.net/pipermail/cisco-voip/2016-December/043472.html).
- **Reported evidence:** Opening placed-calls list triggers CUCM presence subscriptions for numbers routed through CUBE; blocking presence in both directions on the trunk stopped the messages.
- **Cause status in thread:** confirmed by poster’s reported result.
- **Gameplay proposal:** Reproduce with BLF call lists, then scope a presence group policy to the carrier trunk.

### ARCH-UC-042 — CUBE binding change blocked by lingering call legs

- **Archive:** Cisco VoIP, 2017-09-05. [Original message](https://puck.nether.net/pipermail/cisco-voip/2017-September/044893.html).
- **Reported evidence:** Adding a new dial-peer/control bind fails while active SIP legs remain; forced shutdown leaves some legs until SIP call service is stopped.
- **Cause status in thread:** confirmed (active legs prevent bind change, per observed sequence).
- **Gameplay proposal:** Decide between a drain window and disruptive call clearing; inspect residual legs before reapplying bind.

### ARCH-UC-057 — Known-working number fails on another carrier

- **Archive:** VoiceOps, 2012-09-04. [Original message](https://puck.nether.net/pipermail/voiceops/2012-September/003540.html).
- **Reported evidence:** Carrier asks how to resolve subscribers unable to dial a known-working number on another network.
- **Cause status in thread:** Unknown.
- **Gameplay proposal:** Define ownership of trace and collect origin, destination, route, translation evidence.

### ARCH-UC-058 — No simple nationwide N11 routing map

- **Archive:** VoiceOps, 2020-03-26. [Original message](https://puck.nether.net/pipermail/voiceops/2020-March/008394.html).
- **Reported evidence:** Carrier describes maintaining its own geography-sensitive 211/311/511/711/811 translations and asks for machine-readable data.
- **Cause status in thread:** Confirmed operational data gap.
- **Gameplay proposal:** Choose routing key, exception handling, and validation source.

### ARCH-UC-061 — Ported calls arrive at carrier's own LRN

- **Archive:** VoiceOps, 2010-11-09. [Original message](https://puck.nether.net/pipermail/voiceops/2010-November/002027.html).
- **Reported evidence:** Some LNP calls arrive without GAP and route to company PBX because main number equals LRN.
- **Cause status in thread:** Proposed upstream GAP stripping.
- **Gameplay proposal:** Compare successful/failed ISUP IAMs; route LRN to monitored sink while tracing.

### ARCH-UC-063 — Canadian-origin calls to toll-free numbers blocked

- **Archive:** VoiceOps, 2014-05-06. [Original message](https://puck.nether.net/pipermail/voiceops/2014-May/004720.html).
- **Reported evidence:** Canadian DIDs fail to reach some toll-free numbers via several US SIP carriers; US origins work.
- **Cause status in thread:** Proposed origin/LATA or provider policy.
- **Gameplay proposal:** Compare ANI, geography, path, and toll-free translation.

### ARCH-UC-067 — Text-enabled number routing needs portability data

- **Archive:** VoiceOps, 2015-11. [Original message](https://puck.nether.net/pipermail/voiceops/2015-November/006074.html).
- **Reported evidence:** Discussion notes accurate routing for voice and text and portability-corrected NNID identifiers.
- **Cause status in thread:** Proposed design risk.
- **Gameplay proposal:** Define inventory checks before porting text-enabled numbers.

### ARCH-UC-068 — LNP numbers may hit wrong tandem

- **Archive:** VoiceOps, 2018-08-29. [Original message](https://puck.nether.net/pipermail/voiceops/attachments/20180829/5d30796e/attachment-0001.html).
- **Reported evidence:** Discussion describes ported blocks that should route by LRN but may follow thousand-block/tandem homing.
- **Cause status in thread:** Proposed.
- **Gameplay proposal:** Determine whether failed calls track LRN or legacy rate-center route.

