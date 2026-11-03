# WP-VOICEOPS-ISSUES — candidate gameplay from operator reports

Status: research proposals only. These records do not adopt requirements, establish current product behavior, or make legal conclusions. No full-mapping or implementation status is changed.

## Method and limits

The VoiceOps Puck archive root is [https://puck.nether.net/pipermail/voiceops/](https://puck.nether.net/pipermail/voiceops/). The root and monthly index pages could not be retrieved with the available browser tool, so research used search-indexed primary Puck message pages and opened the individual threads. Eleven threads from 2010–2020 were sampled for routing/number portability, interop, emergency-location testability, outages/recovery, and support operations. This is a bounded representative sample, not a crawl or frequency study. Several posts are unanswered questions or single-operator reports. Product/version details are historical. The JSON stores paraphrases and URLs, not copied message text, author identities, contact details, addresses, subscriber identifiers, or destination-number examples.

`research/community/voiceops-findings.json` contains stable source IDs, source/date/evidence type, uncertainty, proposals, desired/effective/observed distinctions, acceptance pairs, existing mechanics, and gaps. All examples below are synthetic proposals. Legal and emergency behavior needs its own review; a test endpoint must never call a real dispatch service.

## Candidate issue seeds

| Source ID | Candidate gameplay | Existing mechanics and gap |
| --- | --- | --- |
| `voiceops-2010-08-peer-of-peer` | Two tenants can reach the public network but fail to interconnect because their codec offers do not overlap; add an explicit compatible transcoder path. | Directional media exists; peer codec intersection and transcoding are not modeled. |
| `voiceops-2010-08-cancel-after-ok` | A late cancellation races a successful answer; reconcile both call legs from an event trace. | Call traces/retries exist; cross-leg signaling races do not. |
| `voiceops-2010-12-dash-outage` | Decide whether evidence is strong enough to route around an outage and close only after verified recovery. | Fault injection and alternate carriers exist; incident timeline, evidence confidence, and support updates do not. |
| `voiceops-2011-06-sbc-domain-filter` | Filter a fictional SIP edge by domain/source and detect both unexpected responses and valid-traffic false positives. | Carrier configuration exists; SIP edge filtering and false-positive tests do not. |
| `voiceops-2011-07-followme-media` | An answered follow-me call loses media after a re-INVITE; inspect signaling and directional media rather than treating packet presence as success. | Directional media and forwarding exist; mid-call latching behavior does not. |
| `voiceops-2012-09-routing-escalation` | Build a minimal synthetic evidence bundle and escalate a known-good-via-control / failing-route case to the right support role. | Carrier models and traces exist; support-ticket lifecycle and escalation evidence do not. |
| `voiceops-2014-05-canadian-tollfree` | A cross-region destination resolves differently based on origin and carrier capability; trace the translation and eligible route. | Jurisdiction and route normalization exist; origin-aware toll-free translation does not. |
| `voiceops-2015-06-softswitch-support` | Select a fictional architecture against redundancy, support window, integration burden, and operating cost. | Product and commercial decisions exist; support coverage, skill burden, and failover independence are not graded. |
| `voiceops-2015-11-text-routing-registry` | Voice and message lookups diverge; detect stale messaging data and retain an unknown cost as unknown. | Channel accounts, receipts, and ledger exist; messaging portability lookup freshness and unresolved charge notices do not. |
| `voiceops-2015-12-sbc-tcp-keepalive` | An idle transport pinhole expires while registration looks healthy; compare keepalive layers and prove reconnection. | Registration/connectivity observations exist; transport expiry and reconnect delay do not. |
| `voiceops-2020-03-special-service-geography` | A dated synthetic service-code mapping varies by fictional region; an isolated emergency-location test returns only synthetic data. | Jurisdiction and initial emergency policy exist; dated service-code maps and a no-external-route location test do not. |

The humour is transposed to fictional situations such as a support queue with its own queue or a route taking the scenic path. It stays out of emergency messaging and does not mock outage victims. Real supplier names in source titles are attribution only; runtime proposals use fictional identities and make no claims about those suppliers.
