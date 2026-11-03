# Incident type

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| progress.incident-type.ring | Shared metro path outage / ucc.incident-type.ring | REQ-aaff5208f88ae0d1 | Keep the shared path failure; prove secondary services are independently reachable. |
| progress.incident-type.site | Customer or hosting site outage / ucc.incident-type.site | REQ-4eb1859cacc2f640 | Remove only affected site resources and test local survivability and alternate service paths. |
| progress.incident-type.cut | Carrier fibre cut / ucc.incident-type.cut | REQ-ba8f134ae37e5960 | Retain underlay outage and common-trench correlation; inspect affected UC/CC journeys. |
| progress.incident-type.crash | SBC or communications node crash / ucc.incident-type.crash | REQ-eeefb3cd77dec0ab | Separate call control, active sessions, media and reboot/failover effects. |
| progress.incident-type.power | Site power loss / ucc.incident-type.power | REQ-6c1246cb91bd5e3a | Model phones, LAN, room devices, local servers and backup power separately. |
| progress.incident-type.transit | PSTN or upstream platform outage / ucc.incident-type.transit | REQ-7e6a513b4d5ca2f1 | Affect the specific carrier, region or service rather than every communication channel. |
| progress.incident-type.ixloop | Partner interconnect outage / ucc.incident-type.ixloop | REQ-0a9747553b5f17eb | Invalidate the specific interconnect and test alternate routes and dependencies. |
| progress.incident-type.leak | Dial-plan or federation route leak / ucc.incident-type.leak | REQ-345813b36a165d92 | Incorrect scope or routing can send interactions to the wrong destination; explain and roll back. |
| progress.incident-type.ddos | Communication service denial / ucc.incident-type.ddos | REQ-b38eed7e333d2031 | Model signalling, API and media resource exhaustion with legitimate demand separated. |
| progress.incident-type.fabric | Shared integration platform outage / ucc.incident-type.fabric | REQ-5077a24dc303e210 | Expose common middleware, CPaaS or hosting dependencies across otherwise different services. |
| progress.incident-type.depeer | Partner service relationship suspended / ucc.incident-type.depeer | REQ-8d1bc14512f98afb | Apply to the specific contract/integration, preserve customer context and provide a migration option. |
| progress.incident-type.fatwave | Carrier provisioning error / ucc.incident-type.fatwave | REQ-51927b5aaa66c236 | A wrong carrier change disables an assigned trunk or media path; restore the correct order state. |
| progress.incident-type.label | Identity, number or port mapping error / ucc.incident-type.label | REQ-e23f4dcfe86e0d3f | A labelled physical patch, tenant or number maps to the wrong destination; reconcile inventory. |
| progress.incident-type.mtu | Media path MTU mismatch / ucc.incident-type.mtu | REQ-e677e2575eb0703b | Retain an underlay transport fault and show affected media or signalling independently. |
| progress.incident-type.krroute | Unexpected media-region detour / ucc.incident-type.krroute | REQ-9c9d49d340d6c54d | A provider reroute changes latency or processing location; evaluate contract consequences. |
| progress.incident-type.ctrlplane | Common platform control-plane failure / ucc.incident-type.ctrlplane | REQ-fd539c15718fce22 | A shared bad update affects several tenants; diversify and validate failure domains. |
| progress.incident-type.lacp | Aggregated-link or resource member failure / ucc.incident-type.lacp | REQ-c517b32c6ef8e0c3 | Retain real underlay member failure; treat app resource pools separately. |
| progress.incident-type.loss | Media packet loss / ucc.incident-type.loss | REQ-cdf573dd95c0f7bb | Measure intelligibility, meeting quality and retry load; do not equate throughput to quality. |
| progress.incident-type.pmtud | Signalling or media path black hole / ucc.incident-type.pmtud | REQ-0d5055d4617d5ddf | Diagnose blocked path-MTU discovery and differentiate setup from one-way/failed media. |
| progress.incident-type.oops | Automation or configuration change failure / ucc.incident-type.oops | REQ-5ec5d8ecbacc94f1 | Record change scope and blast radius, retain rollback and test required journeys. |
| progress.incident-type.cleaner | Endpoint or local appliance unplugged / ucc.incident-type.cleaner | REQ-e6aa95c8419cb366 | Retain physical mishaps and prove local redundancy where applicable. |
| progress.incident-type.maxpfx | Admission or integration quota exceeded / ucc.incident-type.maxpfx | REQ-61aaf4bb04e2fb49 | Separate legitimate volume growth from an unsafe configuration or privilege anomaly. |
| progress.incident-type.prepend | Carrier routing policy mistake / ucc.incident-type.prepend | REQ-59f527cfaf19e925 | An upstream routing change breaks or degrades a supported calling path. |
| progress.incident-type.rpki | Certificate or trust record invalid / ucc.incident-type.rpki | REQ-24d370ad973f9b9a | Use the actual identity/trust prerequisite for the mapped UC integration; retain RPKI only in the IP underlay. |
| progress.incident-type.amp | Transport or local appliance hardware failure / ucc.incident-type.amp | REQ-b53438eb0f061e27 | Retain owned underlay hardware where present; model customer-service restoration as dependent on repair. |
| progress.incident-type.roadmff | Service infrastructure configuration error / ucc.incident-type.roadmff | REQ-2c4b49f3c3f41744 | Wrong local processing or transport allocation disables service resources; test and roll back. |
| progress.incident-type.optic | Optic or endpoint component failure / ucc.incident-type.optic | REQ-76b6be5ba29dcaa3 | Retain component/spares mechanics with the correct physical resource type. |
| progress.incident-type.maint | Planned communications maintenance / ucc.incident-type.maint | REQ-bd20dbb6d1084092 | Represent approved change windows, draining, failover and post-change acceptance. |
| progress.incident-type.ac | Local service cooling failure / ucc.incident-type.ac | REQ-302f3289de910d43 | Derate or stop the affected site appliances with recovery and spare-capacity effects. |
| progress.incident-type.hijack | Number, identity or route takeover scenario / ucc.incident-type.hijack | REQ-c14313b1f6a967b5 | Use synthetic misrouting or account compromise to exercise detection, revocation and recovery. |
| progress.incident-type.shutdown | Mandated service suspension / ucc.incident-type.shutdown | REQ-b10828c9e4fba868 | Apply an explicit scenario jurisdiction restriction to an identified workload or service. |
| progress.incident-type.redsea | Correlated regional transport outage / ucc.incident-type.redsea | REQ-3a096ab779995ee4 | Retain affected physical corridors; test continuity, latency and allowed fallback geography. |
