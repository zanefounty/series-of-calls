# Unresolved historical source follow-up — 2026-11-04

Status: **three historical source retrievals verified; owner acceptance deferred; canonical reviews remain unchanged**. Scope is limited to `REF-caf76921eb104f1f`, `REF-b975a5563a7e48f0`, and `REF-5d951bf30e3c96d3`. This report is read-only review material. It does not add gameplay scope, promote archive candidates, or make current product claims.

Structured record and exact source hashes: [machine-readable retrieval receipt](unresolved-followup.json).

## REF-caf76921eb104f1f — 2014 blind-transfer one-way audio

**Established from the historical report.** The original post is dated 30 April 2014, 09:25:36 EDT. It describes IP-phone to IP-phone, blindly transferred via CUBE/SIP trunk to an off-net mobile; the remote party heard audio, while the IP phone did not, and its status showed `Stream = Not Ready`. The reporter said the SDP connection address looked correct but did not establish working RTP. There is no original reporter resolution.

The previous reply (30 April 2014, 08:37 EDT) quotes the setting “Send send-receive SDP in mid-call INVITE” and explicitly limits it to early-offer SIP trunks, with no effect on SIP-line calls. A Cisco CUCM 11.5(1)SU3 release note corroborates the scoped setting for early/best-effort early-offer trunks. Cisco’s MMoH/CUBE tech note covers related SDP settings, not this issue’s cause. Another participant mentions header manipulation fixing a separate instance; keep it separate.

**Suggested bounded owner wording:** “A 30 April 2014 Cisco VoIP list thread reports one-way audio after a blind transfer through a CUBE/SIP trunk to an off-net mobile; the remote party heard audio while the IP phone did not. A reply cites a SIP-profile send/receive SDP option limited to early-offer SIP trunks and not SIP-line calls. Another participant describes header manipulation fixing a separate case. The archive does not report a fix for the original incident.”

**Decision:** owner may accept this historical wording. Do not accept the profile change as a generally safe remedy or say it fixed the original case. Exact deployed versions were not stated; the 11.5 document is later context, not proof of 2014 product behavior.

Sources: [original report](https://puck.nether.net/pipermail/cisco-voip/2014-April/035734.html), [preceding reply](https://puck.nether.net/pipermail/cisco-voip/2014-April/035733.html), [Cisco CUCM 11.5(1)SU3 notes](https://www.cisco.com/c/en/us/td/docs/voice_ip_comm/cucm/rel_notes/11_5_1/SU3/cucm_b_release-notes-cucm-imp-1151su3.pdf), [Cisco MMoH/CUBE note](https://www.cisco.com/c/en/us/support/docs/unified-communications/unified-border-element/116392-technote-product-00.pdf).

## REF-b975a5563a7e48f0 — 2013 9951/CKEM BLF transfer

**Established from the report and direct follow-up.** On 2 April 2013, a 9951/CKEM BLF speed-dial action during transfer created a new call; manual dialing worked, and the original reporter said it reproduced on two systems. A participant attributed this to 9.3(2), identified `CSCud07738`, said fixed in ES5, and said ES12 was the latest they knew; the reporter later said a TAC case was open, not resolved.

An alternative retrieval route now succeeds for adjacent reply 031721: direct shell HTTPS returned HTTP 200 and SHA-256 below, although the web reader still reports it inaccessible. The reporter follow-up 031720 quotes that reply. Cisco Community’s public thread provides the defect title and 9-3-2-10 symptom/conditions. Cisco’s phone release notes for 9.3(2)SR1 list `CSCud07738` under resolved caveats, which corroborates defect tracking and inclusion in that release’s resolved list. The release-notes PDF was available from a third-party mirror; the direct Cisco Bug Search route returns 410, and the linked redirect is inaccessible. Therefore the precise ES5 statement remains participant-attributed; no installed fix or resolution for this reporter is established. Do not merge a separate 8961/KEM user’s 2014 9.4(1)-9 outcome into the 9951 report.

**Suggested bounded owner wording:** “A 2 April 2013 Cisco VoIP thread reports a 9951/CKEM transfer using BLF speed dial creating a new call while manual dialing worked. Participants attributed the behavior to firmware 9.3(2), identified CSCud07738, and stated it was fixed in ES5; the reporter later said TAC was involved, with no reported installation or resolution. Cisco Community published the same defect title/conditions, and Cisco-authored 9.3(2)SR1 release notes list CSCud07738 as a resolved caveat. This is a historical firmware incident; neither the ES5 statement nor resolution of the reporter’s system is independently established.”

**Decision:** owner may accept the revised scope with ES5 explicitly attributed and 9.3(2)SR1 source kept separate. No product implementation claim should assume a particular ES is a validated fix.

Sources: [original post](https://puck.nether.net/pipermail/cisco-voip/2013-April/031722.html), [adjacent reply](https://puck.nether.net/pipermail/cisco-voip/2013-April/031721.html), [reporter follow-up quoting it](https://puck.nether.net/pipermail/cisco-voip/2013-April/031720.html), [Cisco Community defect discussion](https://community.cisco.com/t5/ip-telephony-and-phones/blf-sd-button-cannot-be-used-to-transfer-calls/m-p/2310393/highlight/true), [Cisco-authored 9.3(2)SR1 notes mirrored at VoIPinfo](https://www.voipinfo.net/docs/cisco/P567_BK_R2E856AF_00_rn-9_3_2sr1-8961-9951-9971.pdf), [Cisco Bug Search route](https://bst.cloudapps.cisco.com/bugsearch/bug/CSCud07738) (HTTP 410 in direct fetch).

## REF-5d951bf30e3c96d3 — 2010 CUBE/CUCM CANCEL trace

**Established from the report and reply.** The 10 August 2010 17:05 EDT post shows an INVITE `200 OK` and near-simultaneous `CANCEL` with `Reason: Q.850;cause=16`; the operator says CCM reports SIP cause `481` and CC 16/SIP 481. The 18:59:52 EDT reply asks for Cisco call-logic debug and tentatively suggests local clearing before receipt/acknowledgement of the `200 OK`, perhaps from user action or timeout. It confirms neither cause nor resolution.

[RFC 3261 (July 2002), §§9.1–9.2](https://www.rfc-editor.org/rfc/rfc3261.txt) provides protocol context: a matched CANCEL after an INVITE final response has no effect on that original transaction/session and receives a 200 response to CANCEL; if no matching transaction exists, the UAS should respond 481. This does not say which hop/transaction produced the reporter’s 481, and the thread trace does not show a response to the CANCEL. It therefore cannot prove “two legs with different views” as an observed condition.

**Suggested bounded owner wording:** “A 10 August 2010 VoiceOps post shows an INVITE 200 OK and near-simultaneous CANCEL with Reason cause 16; the operator says CCM reported SIP cause 481. A responder requested Cisco call-logic debug and tentatively suggested local clearing before receipt/acknowledgement of the 200 OK, perhaps after user action or timeout. The post and reply confirm neither root cause nor resolution, and do not establish inconsistent state across two call legs.”

**Decision:** owner may accept the historical trace with that caveat. Keep any cross-leg race/state reconciliation as an explicitly invented gameplay abstraction, not a source finding. Preserve “The Scenic Route to a Cancelled Call” as authored comparison; the unrelated Warren Buffett email signature is not source-specific humor.

Sources: [original VoiceOps post](https://puck.nether.net/pipermail/voiceops/2010-August/001764.html), [reply](https://puck.nether.net/pipermail/voiceops/2010-August/001765.html), [RFC 3261](https://www.rfc-editor.org/rfc/rfc3261.txt).

## Retrieval receipt and hashes

The machine-readable receipt contains exact URLs, publication dates (or date limitations), direct retrieval statuses, byte counts and SHA-256 values. Historical page hashes are over the HTTP response bytes received 2026-11-04, not cryptographic claims about original posting files. The Cisco Community text was returned by browser retrieval; shell HTTP returned 403, so no raw-response hash. Cisco Bug Search direct fetch returned 410; the linked route redirected to a browser-inaccessible search URL. Both failures are retained.

The Cisco release note is a Cisco-authored PDF served by a third-party mirror, last-modified there 2017-02-14; that is not asserted as the release-note publication date. Official Cisco CUCM PDFs were browser-readable but shell requests returned HTTP 403, so no fetched-byte hash. Source-pack hashes for `research/community/cisco-voip-findings.json`, `research/community/voiceops-findings.json`, and `research/additions.json` are recorded in the receipt and were measured during this check; no such file was edited.

## Owner status

All three historical records have usable narrow source text now. One specific external gap remains: unrestricted Cisco Bug Search details for `CSCud07738` and the exact official publication/source URL for the mirrored 9.3(2)SR1 phone release notes. This does not prevent a decision on the historical claims if the ES5 statement stays explicitly attributed and bounded. No owner acceptance was recorded, canonical reviews remain unaccepted, and no source packs or gameplay records were changed.
