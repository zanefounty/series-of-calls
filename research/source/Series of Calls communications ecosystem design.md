Build a browser management game about delivering communications services across unified communications, contact centres, meetings, CPaaS and the partner ecosystem. The player starts as a communications MSP, assembles services from vendors and specialists, and expands into service-provider and programmable-communications offerings.

The core loop is **win a contract → discover requirements → assemble an eligible service → deploy or migrate → prove outcomes → operate → renew and expand**. A successful service must satisfy its technical, operational, information-handling and commercial requirements.

This design extends the Series of Tubes fork concept across SMB, enterprise, government and defence customers. Product references are dated to **29 October 2026**. Scenario sizes, demand curves, prices, quality parameters and market effects are game-design assumptions; real product capabilities and lifecycle facts are identified through their linked sources.

# Product structure and player experience

Keep four dimensions separate.

| Dimension | Values and purpose |
| - | - |
| Customer profile | SMB, enterprise, government and defence campaign archetypes, with separate size, sector, jurisdiction, sensitivity and user-persona fields |
| Workload | Employee calling, collaboration, meetings, events, customer service, outbound engagement, embedded communications and critical notifications |
| Delivery | Shared public cloud, dedicated hosted service, partner-operated private cloud, on-premises, hybrid and explicitly disconnected deployments |
| Commercial role | Vendor, distributor, reseller, integrator, MSP, carrier or service provider, CPaaS supplier or application builder, and contact-centre operator or BPO |

An organisation can have several roles. A carrier can also provide managed services; an MSP can resell a platform and subcontract contact-centre operations. SMB and enterprise describe scale, while government and defence describe sector and workload requirements. Preserve those distinctions underneath the four campaign choices.

The player initially controls a single MSP. Vendors, carriers, integrators, developers and BPOs are commercial counterparts. Wholesale operations, CPaaS products and staffed contact-centre operations unlock later. Staffing controls should only become available when the player or its subcontractor is responsible for that workforce.

Use four principal views:

1. **Customer and contracts:** needs, budget, procurement, obligations, renewals and satisfaction.

2. **Service topology:** sites, platforms, rooms, carriers, integrations, storage and trust boundaries.

3. **Operations:** incidents, service journeys, workforce bottlenecks, changes and test evidence.

4. **Business:** recurring and project income, upstream costs, staffing, usage and margin.

The signature diagnostic tool is the **interaction inspector**. It follows a customer need through channel choice, service dependencies, human or AI handling, generated information, resolution and cost. Voice interactions retain separate signalling and bidirectional media traces. Meeting interactions expose identity, calendar, room mode, joining, media and artefact dependencies. Messaging interactions expose channel eligibility, delivery, routing, context and human handoff.

# Capability scope

The engine should understand these capability families independently of vendor names.

| Family | Capabilities to represent |
| - | - |
| Enterprise voice | Users, extensions, public numbers, endpoints, dial plans, call permissions, trunks, admission, caller identity, voicemail, transfers, shared lines, reception and survivability |
| Collaboration | Chat, channels, presence, federation, guests, external organisations, files, calendars, identity and mobile use |
| Meetings and events | Interactive meetings, rooms, webinars, broadcasts, scheduling, join methods, media capacity, content sharing, whiteboards, polling, captions and playback |
| Contact centre | Voice and digital entry points, IVR, queues, skills, languages, routing, callback, agent desktop, CRM context, supervisors, recording and customer resolution |
| Workforce and quality | Shifts, staffing, availability, after-contact work, digital concurrency, forecasting, adherence, evaluation, coaching and repeat-contact analysis |
| CPaaS | Voice and messaging APIs, numbers, channel accounts, webhooks, workflow orchestration, templates, rate limits, retries, idempotency, delivery evidence and usage billing |
| Speech and AI | Transcription, captions, diarisation, translation, summaries, actions, search, virtual agents, agent assistance and quality evaluation |
| Devices and spaces | Phones, headsets, DECT and analog adapters, cameras, microphones, displays, room controllers, room accounts, firmware and management |
| UC lifecycle | Discovery, inventory, number management, provisioning, JML, delegation, templates, bulk changes, coexistence, migration, validation and rollback or recovery |
| Assurance | Health, call and media quality, synthetic tests, traces, incident correlation, experience metrics, capacity and change evidence |
| Information governance | Capture policies, retention, deletion, archive, access, redaction, export, legal hold, audit and derived-information lineage |
| Security and continuity | Identity, permissions, tenant isolation, certificates, encryption, fraud controls, backup, recovery and dependency failures |
| Sector integrations | Emergency location and notification, paging, radio or push-to-talk, reception, hospitality, healthcare workflows, fax and other legacy interfaces |
| Commercial operations | Partner qualifications, offers, wholesale supply, order fulfilment, provisioning lead times, support ownership, billing, tenders and renewal |

These capabilities are unlocked progressively. Every implemented capability should affect an inspectable decision, dependency, outcome, cost or obligation.

# Microsoft reference pack

Microsoft should be represented as several connected product families. Features need edition, deployment, region, lifecycle and prerequisite records.

| Family | Products and relationships | Gameplay |
| - | - | - |
| Employee collaboration | Teams chat, channels, calling, meetings, files and application integrations | Adoption, external collaboration, identity and content dependencies |
| Telephony | Teams Phone, Calling Plans, Operator Connect, Teams Phone Mobile and Direct Routing | Carrier selection, number coverage, operating responsibility and route design |
| Basic customer handling | Auto attendants, call queues and Queues app | An entry point for small service teams, with a progression to fuller contact-centre workflows |
| Meetings and spaces | Teams meetings and events, Teams Rooms, Panels, Places and room calendars | Room planning, licences, booking, interop, accessibility and utilisation |
| Advanced experience and AI | Teams Premium and Microsoft 365 Copilot capabilities | Entitlements, protection, intelligence and packaging changes |
| Contact centre | Dynamics 365 Contact Center, with Dynamics 365 Customer Service or another CRM | Voice and digital routing, self-service, agent assistance, customer records and resolution |
| Partner contact centres | Teams Connect, Extend and Unify integration models | Different call-control and application dependencies; partners can compete and integrate simultaneously |
| Embedded communication | ACS services and Teams-aligned communication integrations | APIs, developer products, provider dependence and lifecycle migration |
| Administration and governance | Teams administration, Entra, Exchange, SharePoint, OneDrive and Purview dependencies | Provisioning, access, calendar, recordings, retention and incident ownership |
| Government | Commercial, GCC, GCC High and DoD profiles as distinct environments | Feature availability and workload eligibility must match the selected environment |
| Local and disconnected | Skype for Business Server Subscription Edition and Microsoft 365 Local on Azure Local | Local operating responsibility, infrastructure and restricted-connectivity service options |

The [Teams service description](https://learn.microsoft.com/en-us/office365/servicedescriptions/teams-service-description) identifies major feature families and cloud differences. [PSTN connectivity documentation](https://learn.microsoft.com/en-us/microsoftteams/pstn-connectivity) distinguishes the operating models. [Rooms licensing](https://learn.microsoft.com/en-us/microsoftteams/rooms/rooms-licensing) and [meetings and events documentation](https://learn.microsoft.com/en-us/microsoftteams/overview-meetings-events) support separate room and event capabilities.

[Dynamics 365 Contact Center](https://learn.microsoft.com/en-us/dynamics365/contact-center/implement/overview-contact-center) supplies an omnichannel and AI-assisted customer-service reference. [Teams contact-centre integration documentation](https://learn.microsoft.com/en-us/microsoftteams/teams-contact-center) distinguishes Connect, Extend and Unify and lists participating solutions, including Cisco. Teams basic queues and a full contact-centre product should have different capability profiles.

[Microsoft 365 Local](https://learn.microsoft.com/en-us/azure/azure-sovereign-clouds/private/m365-local/microsoft-365-local-overview) runs Exchange Server, SharePoint Server and Skype for Business Server on customer-owned Azure Local infrastructure, with hybrid and disconnected deployment options. It should have its own product profile; it does not provide an on-premises Teams edition.

The [GCC High and DoD service description](https://learn.microsoft.com/en-us/office365/servicedescriptions/office-365-platform-service-description/office-365-us-government/gcc-high-and-dod) is specific to defined US environments and eligibility. Country packs must establish their own requirements.

## Microsoft lifecycle and feature constraints

The [ACS retirement and breaking-changes guide](https://learn.microsoft.com/en-us/azure/communication-services/acs-retirement-and-breaking-changes-guide) sets **30 September 2028** as the transition date for standalone ACS retirement and related SDK changes. Some services retire; certain calling and automation capabilities continue in supported Teams-aligned scenarios with changes. The game should distinguish retiring offers, supported existing deployments and permitted successor architectures.

[Copilot in Teams documentation](https://learn.microsoft.com/en-us/microsoftteams/copilot-teams-transcription) distinguishes temporary speech processing from saved transcription and states that Copilot is unavailable in end-to-end encrypted meetings. Model that conflict for the relevant profile. Do not make it a universal rule covering every vendor or future version.

The documented [Teams Rooms Pro integration with ServiceNow](https://learn.microsoft.com/en-us/microsoftteams/rooms/microsoft-teams-rooms-configure-servicenow) is Commercial-cloud-only. This is an example of an operational integration whose availability differs from that of the underlying room device.

# Cisco reference pack

Cisco should have separate profiles for cloud UC, dedicated UC, premises UC, contact centre, programmable customer engagement and conferencing infrastructure.

| Family | Products and relationships | Gameplay |
| - | - | - |
| Collaboration suite | Webex Suite and Webex App, meetings, messaging, webinars, events, whiteboarding, polling and video messaging | Workload adoption, bundles and collaboration requirements |
| Cloud calling | Webex Calling and its PSTN choices | Numbers, seats, policies, carrier supply and service availability |
| Smaller service teams | Customer Assist and AI Receptionist | Reception, queueing, supervisor workflows and an upgrade path |
| Dedicated UC | Webex Calling Dedicated Instance, based on Unified CM with associated UC applications | Legacy integrations, endpoint reuse, dedicated resources and coexistence |
| Premises UC | Unified CM, Unity Connection, IM and Presence, Jabber, Expressway, CUBE and survivability components | Local control, maintenance, interworking and lifecycle responsibilities |
| Contact centre | Webex Contact Center, Webex Contact Center Enterprise, UCCE, PCCE and UCCX | Distinct cloud, hosted and premises capabilities and migration paths |
| Contact-centre AI | Webex AI Agent, AI Assistant and Quality Management offers | Automation quality, handoff, analysis, entitlements and capacity |
| CPaaS and digital | Webex Connect and the relevant Webex Engage integrations | Channel orchestration, APIs, digital interactions and CRM handoff |
| Rooms and devices | Cisco Room, Desk and Board systems, phones, headsets and supported platform modes | Hardware reuse, room design, device licences, firmware and supported joining |
| Meeting interoperability | Native room modes, VIMT/CVI and WebRTC joining where supported | Different joining paths and feature sets |
| Hybrid and premises meetings | Video Mesh, Cisco Meeting Server and management partners | Media placement, concurrency, local services and residual cloud dependencies |
| Management and provider services | Control Hub, Partner Hub, Webex Wholesale, Webex for BroadWorks and BroadWorks | Multi-customer operations, templates, wholesale contracts and reseller chains |
| Government and sovereign services | Webex for Government and applicable premises or sovereign infrastructure profiles | Workload boundaries, operating control and evidence requirements |
| Local transcription | AI PODs for Collaboration with version-specific integrations | Local inference capacity, licence dependencies and supported application versions |

Sources: [Webex Suite](https://www.webex.com/us/en/products/suite.html), [Flex and Suite offers](https://www.cisco.com/c/en/us/products/collateral/unified-communications/cisco-collaboration-flex-plan/collaboration-flex-plan3-data-sheet.html), [Dedicated Instance](https://help.webex.com/article/dk3o5r), [contact-centre product families](https://www.cisco.com/c/en/us/products/collateral/customer-collaboration/collab-flex-3-contact-center-ds.html), [Webex Connect](https://help.webexconnect.io/docs/welcome), [device interoperability](https://www.webex.com/us/en/solutions/interoperability.html) and [Wholesale Route to Market](https://help.webex.com/article/nwwg3w6).

Webex Connect's documented channels include voice, SMS, RCS, email, WhatsApp, Messenger and others. This directly supports a game in which a competing messaging channel becomes an input to a managed customer-engagement service.

Dedicated Instance preserves a Unified CM-based architecture and associated integrations. Represent it separately from Webex Calling multitenant. Likewise, a Video Mesh node processing local media does not establish independence from its cloud management or control dependencies.

## Cisco lifecycle and local AI constraints

The [AI PODs datasheet](https://www.cisco.com/c/en/us/products/collateral/conferencing/ai-pods-collaboration/ai-pods-collaboration-ds.html) describes local transcription, but qualifies isolated operation with a licensing exception and documents direct Smart Licensing. Its integration table is version-specific. Treat local processing, disconnected licensing and supported application integrations as independent attributes.

The [UCM Cloud for Government lifecycle notice](https://www.cisco.com/c/en/us/products/collateral/unified-communications/cisco-collaboration-flex-plan/unified-communication-manager-cloud-gov-eol.html) gives **6 January 2027** as end of sale and **31 January 2028** as last support. Its transition options include Webex for Government Calling and on-premises UCM.

The [Webex WFO notice](https://www.cisco.com/c/en/us/products/collateral/unified-communications/cisco-collaboration-flex-plan/webex-wfo-eol.html) applies to specific offers with end of sale in July 2026. Preserve separate dates for sale, renewal and support; an offer retirement does not delete the entire workforce-management capability family.

# Third party ecosystem

The catalogue should cover the complete service lifecycle. The examples below establish relevant product families or documented relationships; each deployed integration still needs its own scope, version and support record.

| Ecosystem layer | Representative suppliers or products | Role in the game |
| - | - | - |
| Alternative UC and collaboration | Zoom, 8x8, RingCentral, Slack, Google Meet and Chat, plus enterprise and SMB PBX families | Customer choice, installed-base constraints, coexistence and migration destinations |
| Independent contact centres | Genesys, NICE, Five9, Talkdesk, 8x8 and Zoom | Different customer-service offers, routing, channel and integration choices |
| Teams-focused contact centres | Anywhere365 or Anywhere Now, Luware, Landis, Tendfor and AudioCodes | Different certified integration models and operating dependencies |
| CPaaS and channel suppliers | Twilio, Sinch, Infobip, 8x8 APIs and Webex Connect | Usage supply, channel accounts, webhooks, workflows and embedded communications |
| Operators and carriers | Telstra, NTT DATA and regional carrier profiles | Numbers, PSTN connectivity, coverage, porting, wholesale commitments and support |
| SBCs and gateways | AudioCodes, Ribbon, Oracle and Cisco CUBE | Interworking, session capacity, compatibility, firmware and resilience |
| Room and endpoint suppliers | Logitech, HP Poly, Yealink, Neat and Cisco | Room suitability, hardware, peripherals, device lifecycle and platform modes |
| Meeting interoperability | Pexip and Synergy SKY | Cross-platform joining, feature constraints and extra dependencies |
| Meeting and endpoint management | VQ Conference Manager and Mividas | Scheduling, CMS or Pexip management, endpoint operations and sovereign hosting options |
| Provisioning and migration | Kurmi, VOSS and Akkadian | Discovery, inventory, JML, numbers, templates, delegation, bulk changes and migration |
| Service assurance | IR Collaborate or Prognosis and VOSS assurance capabilities | Earlier detection, diagnosis, synthetic validation and service reporting |
| Reception and specialist UC apps | Imagicle and similar application profiles | Attendant console, directories, recording, fax and customer-specific workflows |
| Recording and governance | Theta Lake, ASC, Dubber, Verint and relevant platform-native options | Capture, archive, retention, access, review and support ownership |
| Workforce and quality | Genesys WEM, Verint and Calabrio product families; WFM adapters such as TTEC Digital's | Forecasting, staffing, quality, analytics and integration health |
| CRM and service workflows | Salesforce, Dynamics 365, ServiceNow, Zendesk and platform connectors | Customer context, case records, provisioning triggers, incidents and fulfilment |
| Meeting assistants | Otter, Fireflies and Read AI | Cross-platform capture, summaries, search, extra data processors and policy choices |
| Speech and local AI | Deepgram, supported Azure speech containers and Cisco local transcription profiles | Languages, processing location, capacity, licensing and model maintenance |
| Emergency and notification | RedSky, Singlewire InformaCast and region-specific alternatives | Location, routing, notifications, paging and sector requirements |
| Identity and supporting services | Directories, identity providers, calendars, PKI, DNS, time, storage and backup | Dependencies that may fail independently of calling |
| CX operations and implementation | BPOs, systems integrators, managed-service specialists and AV installers | Workforce, deployment expertise, project capacity and operational accountability |
| Open communications building blocks | Asterisk and FreeSWITCH | Custom service creation, operating skills, maintenance and integration responsibility |

[Microsoft's contact-centre catalogue](https://learn.microsoft.com/en-us/microsoftteams/teams-contact-center) verifies a range of independent and Teams-oriented integrations. [SBC certification](https://learn.microsoft.com/en-us/microsoftteams/direct-routing-border-controllers), [Rooms hardware certification](https://learn.microsoft.com/en-us/microsoftteams/rooms/certified-hardware) and [compliance recording](https://learn.microsoft.com/en-us/microsoftteams/teams-recording-compliance) are separate programmes. Device certification explicitly does not establish feature-level or cloud-environment support.

[Webex App Hub](https://apphub.webex.com/partner-solutions) supplies another ecosystem reference. Specific examples include [Imagicle](https://apphub.webex.com/applications/imagicle-uc-suite), [Theta Lake](https://apphub.webex.com/applications/theta-lake-for-webex-calling-theta-lake) and the [TTEC Digital WFM adapter](https://apphub.webex.com/applications/wfm-adapter-by-ttec-digital-ttec-digital-inc). Marketplace presence is a distinct evidence type from formal certification.

Lifecycle-management examples are grounded in [Kurmi](https://kurmi-software.com/), [VOSS](https://www.voss-solutions.com/tech-solutions/cisco/) and [Akkadian](https://www.akkadianlabs.com/akkadian-platform/). Conferencing examples are grounded in [VQ](https://www.vqcomms.com/products/vq-conference-manager/), [Mividas](https://docs.mividas.com/docs/documentation/mividas-core/), [Pexip](https://www.pexip.com/products/connect/microsoft-interoperability) and [Synergy SKY](https://www.synergysky.com/service-description). Assurance is represented by [IR Collaborate](https://www.ir.com/products/collaborate).

[Twilio](https://www.twilio.com/en-us/products), [Sinch](https://sinch.com/products/), [Infobip Conversations](https://www.infobip.com/docs/conversations) and [8x8 documentation](https://help.8x8.com/documentation) show the overlap between programmable communications and customer-service applications. [Genesys WEM](https://help.genesys.cloud/articles/about-workforce-engagement-management-wem/) supports the workforce and quality family.

[Otter](https://help.otter.ai/hc/en-us/articles/4425393298327-Otter-Notetaker-Overview), [Fireflies](https://guide.fireflies.ai/articles/5365127863-web-conference-platforms-supported) and [Read AI](https://support.read.ai/hc/en-us/articles/44022838331667-Connecting-Read-AI-to-Microsoft-Teams) demonstrate meeting-assistant integrations. Their data access and processing are distinct dependencies.

[Deepgram deployment options](https://developers.deepgram.com/docs/deployment-options), [Microsoft disconnected containers](https://learn.microsoft.com/en-us/azure/ai-services/containers/disconnected-containers), [RedSky and InformaCast integration](https://www.singlewire.com/integrations/redsky), [Asterisk](https://www.asterisk.org/get-started/) and [FreeSWITCH](https://developer.signalwire.com/freeswitch/foundations/introduction/) support the remaining specialist families.

Company ownership and product identity need separate records. For example, [Verint's Calabrio page](https://www.verint.com/calabrio/) describes their combined organisation; that does not make all product capabilities interchangeable.

Additional installed-base and competitive profiles should include [RingCentral RingEX](https://www.ringcentral.com/au/en/office/product-overview.html) and [RingCX](https://www.ringcentral.com/au/en/ringcx.html), [Avaya Aura](https://www.avaya.com/en/products/aura/) and [Infinity](https://www.avaya.com/en/products/infinity-platform/), [Mitel communications platforms](https://www.mitel.com/products/business-phone-systems), [ALE's UC portfolio](https://www.al-enterprise.com/en/solutions/unified-communications), and [3CX](https://www.3cx.com/phone-system/). Their existing deployments create upgrade, support, interworking and migration choices. An older deployed version does not make its entire supplier obsolete.

# Partners and commercial operations

Represent commercial relationships explicitly.

| Role | What it provides | Decisions and constraints |
| - | - | - |
| Vendor | Product capabilities, subscriptions, roadmap and support | Availability, lifecycle, bundles and supported integrations |
| Distributor or reseller | Offer access, subscriptions and hardware | Qualifications, inventory, terms and renewals |
| Integrator | Design, deployment, migration and workflow integration | Skilled effort, project capacity, testing and delivery quality |
| MSP | Ongoing lifecycle changes, monitoring, service desk and reporting | Automation, privileged access, tenant separation and support capacity |
| Carrier or SP | Numbers, connectivity, trunks, hosted or wholesale services | Coverage, routes, lead time, capacity and upstream obligations |
| CPaaS supplier or builder | APIs, channel orchestration and customer applications | Usage costs, channel rules, reliability and maintenance |
| BPO or CC operator | Human customer-service delivery | Skills, languages, shifts, training and quality |
| Customer | Requirements, service consumption and payment | Procurement, user adoption, business outcomes and renewal |

A contract records seller, buyer, offer, unit of charge, included allowance, overage, minimum commitment, service obligations, support owner, renewal and exit terms. Track seat, room, named agent, concurrent agent, session, minute, message, API transaction and project fees as distinct units.

For a player-owned MSP, retail customer payments are income; wholesale, licence, channel, staff and support payments are costs. Eliminate internal transfers when consolidating player-owned subsidiaries. A bundled allowance must be consumed before overage is added.

Partner qualifications unlock defined offers or responsibilities. A qualification does not confer every integration or government approval. Cisco's [wholesale guide](https://help.webex.com/article/nwwg3w6) provides a concrete example of parent partners, subpartners, customer onboarding and billing responsibilities.

Commercial events include renewal pressure, minimum-commitment exposure, vendor-direct sales, partner acquisition, API changes, supply shortages and product retirement. Each event changes an identifiable offer, relationship or dependency, with visible lead times and available responses.

# Customer segments and procurement

Use these four campaign archetypes while retaining their underlying dimensions.

| Segment | Typical goals | Possible mandatory requirements | Example contract |
| - | - | - | - |
| SMB | Fast setup, predictable cost, limited administration, familiar customer channels | Required coverage, existing workflows, business hours and essential devices | A service business needs phones, a small queue, WhatsApp enquiries and reminders |
| Enterprise | Multi-site integration, continuity, user adoption, automation and operating cost | Required journeys, identity, recording, geography and support terms | An acquisition introduces another UC and room estate |
| Government | Accessible public services, records, controlled access, procurement and continuity | Specified environment, data handling, administrative boundaries and evidence | A citizen contact service spanning phone, web and digital channels |
| Defence | Workload suitability, controlled information flows, resilient operation and assured support | Scenario-defined sensitivity boundary, authorised components and disconnected operation where required | Separate administrative collaboration and a locally operated training environment |

Apply industry overlays such as healthcare, financial services, education, retail, hospitality and critical infrastructure. A small regulated business can have stronger handling requirements than a large ordinary enterprise.

The bid evaluator first checks mandatory requirements. It then compares eligible designs on price, usability, resilience, integration, implementation effort and supportability. Show the player which requirement blocks a design and which alternatives are available.

Government and defence contracts need jurisdiction-specific content packs. US cloud labels are not universal approvals for Australia, Europe or other regions. Public-service external channels and restricted internal workloads may belong in different service environments within the same organisation.

A defence scenario should distinguish administrative and training workloads from more restricted services. Restricted information should only traverse explicit, scenario-permitted interfaces. The game can explore continuity, access and approved workflows without modelling real operational secrets.

# Competition and channel substitution

Model the underlying need before the chosen channel: reach a colleague, resolve a billing issue, attend a meeting, receive a notification or complete an application workflow. The same need can be served through several eligible channels.

| Pressure | Demand that may change | Opportunity for the player |
| - | - | - |
| WhatsApp and Messenger | Customer enquiries, confirmations and routine notifications | Channel integration, automated journeys, CRM context and human handoff |
| Slack and persistent collaboration | Internal calls, short meetings and email exchanges | Governance, identity, external collaboration, archives and integrations |
| Zoom, Google Meet and bundled conferencing | Meetings, room-platform preference and associated seats | Interoperability, room deployment, adoption and managed operations |
| CPaaS and embedded experiences | Communications move inside booking, commerce or support applications | APIs, workflow development, testing and service assurance |
| AI self-service | Some routine human handling | Reliable automation, escalation, evaluation and new customer-service offers |
| Vendor bundles and direct sales | Standalone features lose their separate commercial premium | Specialisation, integration, operating service and portfolio adjustment |

These effects are scenario parameters, not current market-share claims. Allow customers to use several platforms simultaneously. Switching has contract, migration, training, integration and data costs. Retention and adoption change with experienced outcomes over time.

[WhatsApp's pricing documentation](https://business.whatsapp.com/products/platform-pricing) distinguishes delivered-message categories and free service responses within its customer-service rules. The game should account for the relevant channel economics rather than assuming every message has the same cost. [Webex Connect](https://help.webexconnect.io/docs/welcome) demonstrates that WhatsApp and Messenger can also be components of a commercial engagement platform.

Slack provides huddles and meeting-note capabilities, while [Zoom's portfolio](https://www.zoom.com/en/products/) spans several collaboration and customer-service products. Treat substitution by job and capability; a competing meeting product need not replace PSTN or specialised customer-service requirements.

Examples of market events:

- Messaging adoption shifts routine enquiries away from voice and creates a digital backlog.

- A messaging outage redirects unresolved cases into the voice queue.

- A suite adds an included feature, reducing the price customers will pay for a separate add-on.

- A customer standardises employee collaboration but retains a specialist contact centre.

- A platform retirement creates a migration programme across application workflows and numbers.

Competition should offer choices to integrate, rebundle, specialise, improve service or accept reduced demand. Avoid unexplained percentage losses that the player cannot investigate.

# Contact centre and customer journey simulation

Contact-centre success depends on both technical service and available human or automated work.

Track arrival profiles by channel, skills and languages, agent shifts, availability, handling time, after-contact work, queue policy, callbacks, transfers, escalation and repeat contacts. Model digital concurrency separately from synchronous voice handling.

Keep these capacities independent:

- Human agent time and relevant skills.

- Concurrent-agent or named-agent entitlements.

- Trunk and SBC sessions.

- IVR and media resources.

- Network bandwidth and quality.

- Bot or transcription compute.

- API throughput and downstream application availability.

More trunks do not solve a shortage of trained staff. Additional staff do not repair an unavailable CRM connector or media path. If the player only supplies technology, staff capacity is a customer constraint; if it contracts a BPO or operates the centre, staffing becomes a direct decision.

Use an interaction state machine with arrival, eligibility, routing, self-service, queueing, handling, wrap-up and resolved or unresolved outcomes. Asynchronous conversations can pause and resume without occupying a voice session throughout.

Customer-facing metrics should include resolution, first-contact resolution, waiting, abandonment, repeat contact, customer effort and satisfaction, alongside cost and handling time. A bot that avoids a human transfer but fails the task should create dissatisfaction or repeat demand. A resolved issue with a failed mandatory recording is still an incomplete contracted service.

Preserve journey identity across channels. A customer moving from WhatsApp to voice should retain its case context when the configured integration supports that path. If context is lost, handling time and customer effort rise.

Useful incidents include broken CRM screen-pop, stale workforce forecasts, bot handoff loops, missing language skills, callback failures, inaccessible recordings and faulty identity mapping after migration. [Genesys WEM](https://help.genesys.cloud/articles/about-workforce-engagement-management-wem/) illustrates the separate workforce, quality and recording functions around the core contact-centre platform.

# Transcription AI and information handling

Treat recording, captions, durable transcripts, translations, summaries, action items and search indexes as different artefacts.

For each artefact, track the source interaction, participants, capture permission, processing service and location, storage and backup locations, access policy, retention, export destinations and links to derived artefacts. The availability of a transcription capability does not establish that the customer permits its use.

The processing chain can include capture, speech recognition, speaker attribution, translation, redaction, summarisation, customer-record update, archive and search. Each stage has capacity, cost, latency, quality and handling requirements.

Provide both platform-native and specialist integrations. Hosted speech services and local inference have different operating obligations. [Deepgram's deployment documentation](https://developers.deepgram.com/docs/deployment-options) distinguishes hosted and customer-operated deployment; [Microsoft's disconnected container documentation](https://learn.microsoft.com/en-us/azure/ai-services/containers/disconnected-containers) identifies supported services and access requirements.

A third-party meeting assistant can offer cross-platform value while adding another processor, identity and export path. [Fireflies](https://guide.fireflies.ai/articles/5365127863-web-conference-platforms-supported) and [Read AI's Teams integration](https://support.read.ai/hc/en-us/articles/44022838331667-Connecting-Read-AI-to-Microsoft-Teams) provide concrete reference examples.

The initial engine can simulate accuracy, language support, processing capacity and escalation through explicit parameters and seeded outcomes. A live model is unnecessary for the game loop. If an optional tutor is added later, it should explain engine evidence rather than decide whether a service works.

# Sovereignty and disconnected operation

Evaluate each relevant dependency against the customer's requirements.

| Dimension | What to inspect |
| - | - |
| Storage | Media, messages, recordings, transcripts, logs, metadata, backups and indexes |
| Processing | Media relays, transcription, translation, AI inference, analytics and support processing |
| Keys | Custody, access to plaintext, recovery and dependent services |
| Administration | Who operates the service and who can receive privileged access |
| Jurisdiction | The scenario's contractual and workload applicability |
| Connectivity | Identity, licensing, management, DNS, time, certificate, update and telemetry dependencies |
| Information flow | Permitted data, destinations, interfaces and boundary crossings |
| Availability | Behaviour during isolation, failure, maintenance and recovery |
| Evidence | Product, edition, version, deployment, region and dated supporting information |

Local media, local storage, local AI and disconnected operation are distinct properties. A platform may satisfy one and fail another. The [Cisco AI PODs licensing qualification](https://www.cisco.com/c/en/us/products/collateral/conferencing/ai-pods-collaboration/ai-pods-collaboration-ds.html) is a useful example of why the entire service chain must be checked.

Some requirements should block a bid or feature activation. Price or a generic security score cannot compensate for a prohibited processing destination. Other requirements may be preferences with explicit trade-offs.

Give the player meaningful alternatives: select another processor, change the workflow, provide an approved local capability, reduce the promised feature set or decline the contract. The customer should not be forced onto a universal cloud progression.

# Engine and content architecture

Retain the static browser shell, canvas interaction, panel infrastructure, persistence patterns and useful tests from [Series of Tubes at commit 48e6200](https://github.com/fjaeckel/seriesoftubes/tree/48e6200c532d486f79bc8376de0aecbf6169123b). The source uses shared state and derived results in an assembled classic script; the expanded domain should have clear function boundaries within that initial architecture. [Upstream architecture](https://github.com/fjaeckel/seriesoftubes/blob/48e6200c532d486f79bc8376de0aecbf6169123b/docs/ARCHITECTURE.md).

Keep company ownership, product family, commercial offer and deployed instance distinct. They change for different reasons.

| Entity | Responsibility |
| - | - |
| Organisation | Ownership, commercial roles, customer or provider relationships |
| Customer profile | Scale, sector, jurisdiction, personas, workloads and requirements |
| Product and offer | Capabilities, commercial units, included allowances and lifecycle |
| Deployment instance | Hosting, version, tenant, resources, region and operating boundaries |
| Compatibility edge | Supported interaction or feature, mechanism, prerequisites and limitations |
| Contract | Buyer, seller, price, support owner, obligations, renewal and exit |
| Service journey | Intended outcome and required interaction and artefact steps |
| Interaction | Channel, participants, routing, media, handling and outcome |
| Workforce cohort | Skills, schedules, work capacity and operator ownership |
| Information artefact | Source, processing, storage, access, retention and derived lineage |
| Market event | Changes to demand, products, offers, relationships or availability |
| Test evidence | Scenario, journey, observed result, explanation and model version |

A compatibility record should include source and target profiles, direction, feature subset, versions, cloud and region, authentication, licences, support owner, evidence URL and checked date. Evidence status can be certified, officially documented, marketplace-listed, vendor-claimed, scenario-tested or unknown. Preserve unknown as unknown.

Product capabilities should distinguish available, preview, retiring, retired and unsupported states. Keep dates for new sales, renewals, support and technical compatibility separately. Real vendor reference packs should be pinned to a checked date; fictional campaign packs can use stable balancing assumptions.

Suggested engine boundaries are requirements evaluation, dependency resolution, demand generation, interaction routing, call and media calculation, meeting calculation, messaging workflows, contact-centre queues, AI and artefact processing, economics, incident effects and explanation generation.

Use aggregate demand for most users and representative interactions for diagnosis. A management tick can advance business time while shorter deterministic event steps handle demand and queues. Preserve scenario seed, clock and stable IDs for reproducibility.

The original call resolver remains a specialised part of the interaction engine. Resolve numbers and permissions before call admission, then evaluate signalling and each media direction. Use graph routing only for transport problems where that abstraction is appropriate.

Give the fork a new application ID, local-storage namespace, service-worker cache and versioned save schema. Upstream saves have ISP-specific fields and validation. Preserve the original MIT notice and attribution, and update domain, release and analytics assumptions. [Save implementation](https://github.com/fjaeckel/seriesoftubes/blob/48e6200c532d486f79bc8376de0aecbf6169123b/src/game/91-save.js).

The initial deployment remains a static build. Real tenant provisioning, real PSTN calls and live customer information are outside the simulation. All services and interactions are synthetic.

# First campaign

Use one fictional regional communications MSP, two platform families, two carriers and a compact specialist-app catalogue. The four customer contracts remain active as the business grows, so earlier decisions continue to generate costs and support obligations.

## Contract one SMB digital service

A small service business needs business calling, a shared number, a modest customer queue, appointment reminders and WhatsApp enquiries.

The player chooses a bundle, provisions users and numbers, connects a CPaaS workflow and customer-record integration, and defines human handoff. A demand shift creates more messaging work while the same trained people are occupied with calls.

Success requires correctly routed interactions, a functioning customer record, resolved enquiries and sustainable operating cost. The incident teaches the difference between workforce capacity and telecommunications capacity.

## Contract two Enterprise acquisition

An enterprise adds sites using another UC platform, legacy devices and meeting rooms. It needs coexistence, a staged migration, reception features and recorded customer interactions.

The player chooses which components to retain, integrates meeting rooms, maps identities and numbers, and moves one cohort at a time. During cutover, voice succeeds while the recorder and room-calendar connector still reference old identities.

Success requires complete service journeys, working rooms, preserved evidence and continuity for users on both platforms. This introduces migration, specialists, feature compatibility and operational testing.

## Contract three Government citizen service

A public agency needs phone, web and digital contact, language support, accessibility, defined record handling and a support chain appropriate to the contract.

The player builds an eligible service and plans agent skills, permitted processing, recording and retention. A proposed transcription feature would improve wrap-up time but uses a processing location excluded by the contract.

Success requires an eligible architecture, usable service, correctly handled artefacts and maintained response targets. The player can choose a different processor, an eligible local service or an agreed reduced feature set.

## Contract four Defence continuity

An administrative and training facility needs a defined collaboration service to continue during external disconnection, with controlled recording or transcription where permitted.

The player supplies local communications and meetings, checks identity, time, licensing, certificates and maintenance dependencies, and separates permitted external services. A continuity exercise reveals an overlooked external dependency.

Success requires the specified local journeys to continue and information boundaries to hold. The scenario concerns administrative service continuity and contains synthetic information.

## Compact initial catalogue

Implement two UC platform archetypes, one contact-centre module, two carrier profiles, one CPaaS orchestrator, two digital channels, one room-interoperability service, one recorder or archive, one CRM connector, one lifecycle and testing tool, and one local transcription option.

Map real Microsoft, Cisco and third-party products into versioned reference packs as feature evidence is established. The initial catalogue should be small enough that each choice has a visible gameplay consequence.

# Delivery phases and acceptance

| Phase | Deliverable | Acceptance |
| - | - | - |
| Foundation | Fork baseline, schema, namespaces, capability and evidence model | The renamed shell loads and saves; invalid catalogue relationships are rejected |
| Core service | Voice, media, identity, numbers, contracts and inspector | Calls have correct and explainable setup and media outcomes |
| Digital customer service | Messaging, CPaaS workflows, queues, human or bot handling and CRM context | The SMB contract is playable, including a workforce bottleneck |
| Enterprise change | Coexistence, migration, room joining, recording and specialist apps | The enterprise contract preserves required journeys through change |
| Information boundaries | Artefacts, policy checks, local processing and dependency evaluation | Government and defence contracts enforce their explicit requirements |
| Market operations | Demand shifts, partner offers, renewals, lifecycle events and balancing | Choices affect sustainable service outcomes and explainable economics |

Use behavioural fixtures covering:

1. Valid internal and external calls.

2. Number interpretation and ambiguous extensions.

3. Signalling success with a failed media direction.

4. Session exhaustion and configured fallback.

5. A contact-centre staffing bottleneck that remains after a trunk upgrade.

6. An asynchronous message returning to the right customer case.

7. A bot failure that causes repeat demand or escalation.

8. A migration that preserves old-to-new and new-to-old journeys.

9. Successful voice with failed mandatory recording.

10. A healthy room device with broken scheduling or joining dependencies.

11. A third-party integration unavailable in the selected cloud.

12. A transcript processor outside the permitted boundary.

13. A local service with an unsatisfied external dependency.

14. A retiring offer that supports existing service but cannot be newly sold.

15. Included usage and wholesale costs that reconcile without double counting.

16. A competitor-channel demand shift that preserves the underlying customer needs.

17. Reproducible state and outcomes after save, reload and replay.

Keep the existing headless harness where useful, with a small real-browser smoke test for topology selection, the inspector, mobile controls and save/reload. [Upstream test harness](https://github.com/fjaeckel/seriesoftubes/blob/48e6200c532d486f79bc8376de0aecbf6169123b/tests/harness.js).

For parallel implementation, assign separate ownership of the domain engine, UI, content catalogue and scenario verification. Agree state and result contracts before parallel edits; keep changes to shared schemas coordinated through one integration owner.

# Implementation brief

Build Series of Calls as a communications-ecosystem management-game fork of fjaeckel/seriesoftubes, starting from the inspected 48e6200 baseline. Preserve MIT attribution and the static browser build. Record the baseline build and test results before domain changes.

The player begins as a communications MSP and can expand into wholesale/SP and CPaaS services. Model vendor, distributor, reseller, integrator, MSP, carrier, CPaaS and BPO roles separately from customer segments. Provide SMB, enterprise, government and defence campaign profiles with explicit size, sector, jurisdiction, workload and information-handling requirements.

Create a capability catalogue, deployment profiles, scoped compatibility edges and contracts. Keep real vendor facts in dated reference packs and gameplay prices and performance assumptions in separate balancing data. Distinguish certification, documentation, listing, vendor claims and scenario evidence.

Implement one shared interaction model across voice, meetings and messaging. Preserve separate call signalling and directional media calculations. Add queue and workforce capacity, asynchronous conversations, CRM context, bot handoff, recording and transcript artefacts. Use structured reason chains for the interaction inspector.

Mandatory eligibility checks precede commercial scoring. Evaluate processing and storage, support and administrative access, key custody, external dependencies and permitted information flows independently. A vendor brand, local device or marketplace listing cannot satisfy these checks by itself.

Provide a consolidated economic ledger with recurring, project, seat, concurrent-agent, session, minute, message and other applicable units. Account for bundle allowances, wholesale costs, staffing and support. Avoid counting the same payment as multiple sources of player profit.

Build the four-contract campaign progressively: SMB digital service, enterprise acquisition and migration, government citizen service, and defence administrative continuity. Use a small fictional catalogue first, with Microsoft, Cisco and third-party reference mappings that demonstrate the relevant capabilities.

Make market events modify a specific demand profile, offer, contract or dependency. WhatsApp, Messenger, Slack, conferencing and AI can be substitutes and useful components of the solution. Preserve customer journeys and multi-platform adoption.

Use deterministic seeds, simulation time and stable IDs. Keep all calls, messages, customers and telemetry synthetic. Implement behavioural fixtures for failure, recovery, eligibility, economic reconciliation and reproducible save/load. Deliver the browser build, source changes, architecture notes, catalogue schema, scenario guide and verification results.
