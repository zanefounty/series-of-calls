# Series of Calls specification — revision 1

This is a versioned specification and traceability package for the full requested product. The executable application is **0.1.0-preview.1, an incomplete training and campaign milestone**, not the completed conversion. Normative requirements below describe required final behaviour; they do not assert that it has been implemented. The machine-readable implementation register identifies the smaller tested surface precisely.

## Reading order

1. [Product, learning and campaign](01-product.md)
2. [Domain, ownership and ecosystem](02-domain.md)
3. [Configuration contracts and administration](03-configuration.md)
4. [Calling, messaging and interaction execution](04-interactions.md)
5. [Meetings, contact centre, workforce and information](05-workloads.md)
6. [Physical transport and SP expansion](06-infrastructure.md)
7. [Commercial operation and market dynamics](07-commercial.md)
8. [Jurisdiction and information boundaries](08-jurisdiction.md)
9. [State, interfaces, persistence and execution](09-architecture.md)
10. [Scenarios, incidents and acceptance](10-acceptance.md)
11. [Research, upstream and release governance](11-maintenance.md)

## Complete appendices and registers

- [Catalogue appendix index](appendices/index.md): every supplied mapping, grouped by category, retaining its existing ID.
- [Catalogue records](generated/catalogue.json): all 3,454 records with proposed representations, source attributes and behavioural obligations.
- [Source items](generated/source-items.json), [requirements](generated/requirements.json) and [acceptance obligations](generated/acceptance.json): 4,839 indexed items at this revision. These include 217 original repository file mappings, the design text, review findings, supplied plan decisions and 23 historical operator-report findings, plus 366 upstream commits and 461 historical file versions.
- [Preserved source context](generated/source-context.json): original metadata, counts, findings and limitations. The [unchanged source pack](../research/source/) is authoritative if an appendix conflicts with it.
- [Reference register](../research/generated/references.json): 91 unique URLs, including the 63 unchanged design-source URLs (72 citation occurrences), five jurisdiction observations and 23 historical operator reports; [claim register](../research/generated/claims.json) retains claim text, source location, historical date, applicability uncertainty and requirement links.
- [Upstream obligation appendix](appendices/upstream.md): stable source and requirement IDs for every observed commit and historical file version.
- [Implementation evidence](implementation.json), [acceptance execution](../evidence/acceptance.json), [full requirement dispositions](dispositions.json) and [upstream accounting](../maintenance/upstream/register.json).

Stable IDs beginning `company-map:`, `asset-map:`, `progress-map:`, `action:`, `view:` and `uc-new:` retain the source identifiers. `REQ-`, `DESIGN-`, `CLAIM-`, `REF-` and generated `AC-` IDs derive from stable source identity or exact source text. `DEC-` IDs record the supplied plan; `BEH-SOC-` and `AC-SOC-` identify implemented behaviours and executed tests. A changed substantive source passage becomes a new source item; it must not silently inherit old acceptance evidence.

The trace is source item → requirement → fictional representation → behaviour → acceptance execution. The first three links are generated completely. Pending implementation links are deliberately visible. No percentage of generated rows establishes semantic fidelity.

## Audit and delegated specifications

- [Mapping and design audit](audit/README.md): exhaustive structural accounting of 3,454 records and 932 distinct clauses, with semantic gaps explicitly retained.
- [Remaining work packages](work-packages/README.md) and [all 94 proposed addition profiles](work-packages/WP-PRODUCT-PROFILES.md).
- [Cisco VoIP issue proposals](work-packages/WP-CISCO-VOIP-ISSUES.md) and [VoiceOps issue proposals](work-packages/WP-VOICEOPS-ISSUES.md): 23 historical threads, documented retrieval limits and candidate acceptance cases.
- [119 source-linked humour adaptations](../content/narrative.json), including 48 company descriptions, with provenance and a separate test for text-only coverage.

## Current scope

The 4 November continuation adds editable customer requirements for all four source segments, separate observed attendance and duration-qualified workforce forecasts, and receipt-bound synthetic webhooks with provisioned policy and deterministic retry handling. Root dispatch, typed consoles, worker serialization, MCP and save validation share these mechanics. The current campaign acceptance recipes now traverse service/incident/procurement/activation/billing/renewal sequences; real-browser execution remains outstanding. See the [work-package index](work-packages/README.md) and [reference review proposals](../research/review-proposals/README.md). No full source disposition or canonical research acceptance follows from these additions.

The core provides desired/provisioning/effective/observed state, route/media resolution, workforce-limited queues, case continuity, recording boundaries, room dependencies, isolation checks and replay. Four compact exercises run against AU, US, JP and EU fictional boundary settings. Sixteen configurable product archetypes have console forms.

Optional versioned packs now add organisation/delegation and an initial typed commercial campaign; four carrier and three contact integration models, number-port lifecycle, delayed message delivery and migration cohorts; IVR, transfers, callbacks and supervisor reviews; and processing chains, access/holds/retention plus scheduled room/event dependencies. Each has administration forms and shared command/worker execution. The acceptance plan currently contains 408 registered behavioural cases, including MCP boundary/save checks and protected build output. Its links mark affected requirements partial, not complete.

Optional product, channel and customer-outcome packs add fourteen initial family profiles, directional compatibility evidence, three fictional channel policies, task-result assessment and bounded repeat enquiries. Their core integration, UI and worker paths have separate acceptance cases; isolated module results do not establish the integrated result. The issue-exercise and selected progression packs have shared-dispatch, worker, persistence, and learning-control cases for their bounded mechanics; the remaining source progression rows and archive proposals stay pending.

Optional calling, workforce and estate packs add tenant-aware aliases/federation, reception/voicemail, synthetic emergency tests, directional quality, individual roster assignment, forecasts/coaching, inventory reconciliation, staged connector authority and batch/device recovery. Estate leaver changes and native-meeting compatibility have bounded shared-dispatch tests through central resource/revocation and product/room compatibility hooks; these synthetic paths are not external certification. Campaign shared-dispatch tests exercise the assessed award sequence for all four tracks across AU/US/JP/EU fictional profiles. The progression module has bounded candidate mechanics across all 13 levels and 19 goals; full source fidelity remains pending review. Every distinctive source catalogue behaviour, full specialist/contact-centre workflows, legal/procurement packs and the complete SP-to-UC economy also remain pending. The four boundary profiles do not establish geographic-market count or legal approval. Locale dictionaries preserve the translation system; new strings use English fallback pending translation review.

Concurrent portfolio customers now use separate tenant roots and an independent shared portfolio clock that continues when campaign tracks change. Customer consoles submit the same validated commands, while opening capital stays separate from operating profit. Optional security controls admit actual calls and reconcile per-minute voice spend. Sampled workload and transport-continuity proofs support three additional progression goals, with historical evidence separated from current readiness. These are bounded mechanics; full source progression and source-specific infrastructure security remain pending; sustained market qualifications now have separate portfolio, boundary, support and external-billing proofs.

Additional optional consoles now provide actual inbound number routing, independent media offers and transcoder session capacity, two-site fault/backup/restore/migration exercises, scoped product-evidence requests and revocation, and provider-level joiner/entitlement-mover coordination across customer roots. Product upgrades have explicit integration-scope rebasing and retesting. The full progression overlay has positive capability fixtures including the combined four-track goal; source-specific fidelity and catalogue completion remain distinct outstanding obligations. [The 94-addition audit](audit/additions-behaviour-audit.md) names remaining behaviour per supplied addition.

Full Git history, public repository creation, locked-dependency baseline verification, branch protection, real-browser acceptance, production publication and enabled maintenance remain unverified. `python3 scripts/verify.py release` therefore fails by design.
