# Jurisdiction source review proposal — 2026-11-04

**Status:** independent, current-source review proposal for owner review. It does not edit or replace research/reviews.json, accept a claim, activate gameplay, or assert legal approval.

This check follows the prior [2026-11-03 jurisdiction review](../jurisdiction-review-2026-11-03.md), whose findings and the original source pack remain unchanged. All five registered source pages were accessible on 2026-11-04. The companion [JSON proposal](jurisdictions-2026-11-04.json) records stable IDs, requirements, acceptance links, checked URLs, dates, and proposed claim wording.

## Findings

### Australia — RES-AU-CLOUD-001

**IDs:** REF-01234d0db452b257 · CLAIM-4abda4d004716da6 · REQ-4abda4d004716da6 · AC-4abda4d004716da6  
**Recommendation: revise.**

The linked [Cloud assessment and authorisation](https://www.cyber.gov.au/publication/cloud-assessment-and-authorisation) page remains live. It was published 2020-07-27 and last reviewed 2024-01-18. It calls for assessing a provider/service against the consumer's requirements and risk tolerance, documenting shared security responsibilities, reviewing assessment reports before authorisation, and continuing to monitor the service and provider changes.

The more current [IRAP Consumer Guide](https://www.cyber.gov.au/irap/irap-consumer-guide) was last reviewed 2026-06-17. It says the assessment scope and deliverables should be defined and the report informs a system-specific risk decision. The current [IRAP resources page](https://www.cyber.gov.au/irap/irap-resources) lists 2026 program materials, including policy/procedure and assessment guidance; the [IRAP Policy and Procedures 2026](https://www.cyber.gov.au/sites/default/files/2026-05/IRAP%20Policy%20%26%20Procedures%202026.pdf) provides current program context.

**Proposed wording:** For an Australian government system, use assessment evidence for its stated service and scope, document shared responsibilities and consumer controls, and make and monitor a separate risk-based authorisation decision for the deployed system. IRAP evidence is not blanket approval of every configuration or customer system.

**Scope and uncertainty:** Australian government cloud-assessment and IRAP consumer guidance. Applicable PSPF/ISM controls, classification, entity policy, residual risk, assessment scope, and authorising decision remain deployment-specific. This does not establish universal IRAP accreditation or platform eligibility. Existing linked acceptance is partial (AC-SOC-119, 120, 122, 124).

### United States — RES-US-CLOUD-001

**IDs:** REF-d8e8c2b149f9b9ab · CLAIM-2314f315d795c6a6 · REQ-2314f315d795c6a6 · AC-2314f315d795c6a6  
**Recommendation: revise.**

The current [FedRAMP agency-use page](https://www.fedramp.gov/2026/agencies/use/) supports the original distinction: agencies reuse offering-level security evidence but authorize their own federal information systems and accept risk for their information, configuration, integrations, and agency-operated controls. The official [scope guidance](https://www.fedramp.gov/2026/scope/) makes scope a use-case determination that only the agency can make; FedRAMP does not apply to every internet-based service.

The official [2026 timeline](https://www.fedramp.gov/2026/timeline/) says optional early adoption began 2026-07-04 and mandatory adoption is scheduled for 2027-01-01, subject to specific overall applicability and effective dates. That transition is still future-dated at this review.

**Proposed wording:** For a federal use within FedRAMP scope, reuse applicable offering evidence but authorize the agency system and assess its information, certified offering version, configuration, integrations, and agency-operated controls. The agency decides scope. Apply the rules effective for the decision date; do not infer defense eligibility.

**Scope and uncertainty:** US federal systems and use cases within scope. Check the agency's actual use, offering/version, certification class, and controls. Revisit the transition as effective dates approach. This evidence does not establish DoD, classified, national-security-system, or other defense approval. Existing linked acceptance is partial (AC-SOC-119, 120, 121).

### Japan — RES-JP-CLOUD-001

**IDs:** REF-6d84d6a737cf7adf · CLAIM-7a874cbe68218153 · REQ-7a874cbe68218153 · AC-7a874cbe68218153  
**Recommendation: revise.**

The official Japanese [ISMAP overview](https://www.ismap.go.jp/csm?id=kb_article_view&sysparm_article=KB0010005) remains accessible. It describes service-level assessment and registration, the ISMAP-LIU scheme for SaaS used with lower-risk business/information, and procurement from the applicable lists as the general principle. Its page links a March 2026 program review and 2025 ISMAP-LIU information. The official [English overview](https://www.ismap.go.jp/csm?id=kb_article_view&sysparm_article=KB0010301) corroborates list-based procurement in principle.

**Proposed wording:** Japan's ISMAP program evaluates and registers cloud services on the applicable ISMAP or ISMAP-LIU list; official guidance describes list-based procurement as the general principle. Verify the exact service entry, scope, low-impact eligibility, and procurement instructions. A supplier listing does not approve every offering or deployment.

**Scope and uncertainty:** Japanese government information-system cloud procurement. Check the exact current list entry, version, scope, procuring body, workload, and integrations. ISMAP-LIU is a distinct lower-impact SaaS scope, not a general substitute for ISMAP. Existing linked acceptance is partial (AC-SOC-119, 120, 121, 123).

### Japan generative AI — RES-JP-AI-001

**IDs:** REF-807e645f0a490d75 · CLAIM-ed81e9aa7bb61a3d · REQ-ed81e9aa7bb61a3d · AC-ed81e9aa7bb61a3d  
**Recommendation: revise.**

The official [ISMAP notice about generative-AI services](https://www.ismap.go.jp/csm?id=kb_article_view&sysparm_article=KB0011070) remains live and includes a 2026-01-09 update. It calls for separate handling of AI-specific risks. It says a generative AI SaaS generally needs its own applicable registration, including when used through external integration; a service does not inherit ISMAP registration merely by running on registered IaaS/PaaS. It describes a narrower PaaS-like development-platform case whose platform is included in registered scope, while still requiring AI-specific measures.

The Digital Agency's current announcement records that government generative-AI procurement/use guideline version 2.0 was published 2026-06-12, after the ISMAP notice. This review checked the [official announcement](https://www.digital.go.jp/news/decb64eb-f26e-41cb-8d37-f3dd173108b8), not every operative clause in the full guideline and checklist.

**Proposed wording:** For Japanese government use, ISMAP registration does not remove separate handling of generative-AI risks. Determine whether the AI service is itself in scope; underlying registered IaaS/PaaS alone does not confer AI-service registration. The ISMAP notice describes a narrower registered AI development-platform case and still requires AI-specific measures. Apply current Digital Agency guidance to a specific use.

**Scope and uncertainty:** Japanese government procurement/use of generative AI and ISMAP service scopes. Verify the current list entry and exact SaaS, model, or development-platform scope. Review the complete 2026 Digital Agency guideline before a scenario-specific claim. No named model or deployment is approved. The linked requirement is pending and has no registered tests.

### EU/EEA transfers — RES-EU-TRANSFER-001

**IDs:** REF-9ad9e2087bdedc1b · CLAIM-ef7e6982b2ab8356 · REQ-ef7e6982b2ab8356 · AC-ef7e6982b2ab8356  
**Recommendation: revise.**

The [EDPB international-transfer guide](https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en) remains available; it shows no publication or last-review date. It gives three cumulative indicators: a controller or processor is subject to GDPR for the processing; it makes personal data available to another organisation; and the recipient is outside the EEA or an international organisation. It says Chapter V applies in addition to ordinary GDPR duties and distinguishes adequacy decisions, appropriate safeguards, and limited derogations.

The European Commission's [current transfer-rules overview](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/rules-international-data-transfers_en) says EU data-protection rules apply to the EEA, including Iceland, Liechtenstein, and Norway, and lists transfer tools including adequacy, standard contractual clauses, binding corporate rules, certification, codes of conduct, and derogations. The official [GDPR text on EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/) provides the Chapter V legal framework in Articles 44–49. EUR-Lex direct HTML opened behind an automated verification page during this check; its indexed official text was accessible.

**Proposed wording:** Where GDPR applies, determine whether a subject controller or processor makes personal data available to another organisation outside the EEA or to an international organisation. If so, apply Chapter V as well as ordinary GDPR duties, using the applicable adequacy decision, safeguard, or limited derogation. Residency alone does not resolve parties, access, recipient, or onward transfer.

**Scope and uncertainty:** GDPR personal-data transfers to third countries or international organisations. Determine GDPR applicability, parties, disclosure, recipient, onward flows, and current mechanism/safeguards. This is not a universal residency rule, member-state procurement approval, or defense accreditation. Existing linked acceptance is partial (AC-SOC-119, 120, 122, 123).

## Review boundaries

- Every recommendation above is for the owner to consider; none is an accepted review or gameplay rule.
- Preserve activeJurisdictionClaim false and the current fictional boundaries until the existing owner-review process is completed.
- No claim here approves the fictional AU, US, JP, or EU profiles; proves every member-state or subnational rule; or settles defence classification, emergency calling, interception, retention, sector obligations, or procurement.
- Keep the older review and source materials unchanged. The companion JSON contains structured claim, requirement, acceptance, date, and source URL traceability.
