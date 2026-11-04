# Queueberry recorded quality review

`BEH-SOC-380`, acceptance cases `AC-SOC-553`–`579`, remains a partial source-linked implementation.

## Contract

The optional synthetic Queueberry quality-review offer is a separate business offer from workforce planning. It licenses one typed `quality-review` usage per completed review. One immutable versioned rubric scores opening, verification, resolution and documentation (weights 20/30/30/20; each criterion is an integer from 0–5). The kernel computes the total and the 80-point threshold result. A low score creates a linked coaching recommendation only; it never changes a person's skills, availability, roster or routing entitlement.

Integration has desired, provisioning, effective, observed and tested stages. Reviews require a currently effective integration, current independent supplier/application observation and a passed integration test bound to the same tenant, contract and resource generations. Integration outages can be repaired through a new observation and test. Every completed review carries an exact paired synthetic AUD receipt. The business offer defines 100 cents per review and 50 cents synthetic cost; these are fixture values, not vendor prices or market claims.

A review must refer to an actual terminal voice interaction, its actual case, workforce assignment and linked recording. The caller supplies only the interaction ID, reviewer and criterion scores. Review evidence retains the distinct assignment row ID and interaction link. A superseding review appends a new result with a reason; earlier reviews and receipts remain immutable. Historical integrity validation permits genuine later trace/case pruning while preserving the recorded evidence lineage.

Recording access uses the information pack's actual read policy. A held recording may be reviewed when that policy authorizes the read; a hold blocks deletion but does not itself grant access. Expired-held evidence may remain available through the policy. Deleted, inaccessible or unlinked recordings cannot be reviewed. Failed calls captured after assigned voice handling are marked partial and their saved reviews retain that coverage label; a pre-answer failure does not create recording evidence.

The existing manual contact-review path remains available and is not billed by this offer. Quality review is an optional extra workflow and does not imply Genesys support, real vendor integration, legal approval, or a complete quality-management product.

## Source and limits

Source mapping: `uc-new:actor:genesys`, `uc-new:domain:workforce`, and `uc-new:domain:recording`. The fictional Queueberry alias remains proposed and owner review is pending. No original source joke was identified for this addition, so the package does not invent source attribution or attach a new joke. The existing source comparison remains in its current source-linked location.

The rubric is a bounded gameplay example, not an objective assessment standard. Supervisor and information-access authority are checked through the root SOC integration. Manual reviews, additional rubric versions, calibration, appeals, quality sampling, compliance certification and vendor-specific quality-management workflows remain outside this slice. Root dispatch, commercial ledger, save and worker integration acceptance is owned and verified separately from isolated kernel tests.

Separately initiated coaching retains its typed workforce cost event and timed unavailability. The separate [coaching accounting contract](WP-WORKFORCE-COACHING-COST.md) now reconciles an explicitly accepted coaching command into its own commercial cost receipt when business accounting is active. A quality recommendation does not start or bill that coaching; the quality-review receipt remains separate.
