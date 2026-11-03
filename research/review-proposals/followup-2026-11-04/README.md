# Follow-up source checks — 4 November 2026

This bounded follow-up retrieved the three historical mailing-list pages that the 4 November review proposal had marked unresolved. It also followed adjacent archive messages where they clarify a reply or outcome. These are historical operator reports and participant suggestions, not current vendor guidance or verified general behavior. The records below are proposed owner-review material; canonical `research/reviews.json` is unchanged.

## Results

| Reference | Direct retrieval | Narrow result |
| --- | --- | --- |
| `REF-caf76921eb104f1f` | Primary report and prior reply retrieved | Reported one-way audio after blind transfer; a reply suggests a CUCM SIP-profile option explicitly limited to early-offer SIP trunks and no effect on SIP-line calls. Another participant describes a header-manipulation fix in a separate instance. No fix for the original report is recorded. |
| `REF-b975a5563a7e48f0` | Primary report, preceding suggestion and reporter follow-up retrieved | 9951/CKEM BLF speed-dial action during transfer created a new call on two reported systems; manual dialing worked. A responder attributes this to phone firmware 9.3.2, names CSCud07738 and says it was fixed in ES 5; another says ES 12 was the latest they knew. Reporter says a TAC case is open. The thread does not confirm installation or resolution. |
| `REF-5d951bf30e3c96d3` | Primary report and next reply retrieved | Trace shows a 200 OK and near-simultaneous CANCEL, with CUCM reportedly seeing 481. The responder offers a possible local-router/user-action or timeout explanation from cause code 16 and explicitly requests Cisco call-logic debug. The exchange does not confirm root cause, two-leg state, or resolution. The initial post date is 10 August 2010, 17:05 EDT; reply 001765 is 18:59 EDT. |

The exact wording recommendations and source URLs, including adjacent replies, are in [findings.json](findings.json). The review proposal should be amended only after the owner decides whether to accept the narrowed historical claims. Until then all three canonical references remain unaccepted.

## Comparison and humor

No source-specific witty product comparison appears in these three technical reports. The Warren Buffett quotation in the CUBE reporter's signature is an unrelated signature quote, not a comparison about the reported behavior. The existing fictional phrase “The Scenic Route to a Cancelled Call” is an authored gameplay comparison; retain it as fictional wording without attributing it to the mailing-list author. No source-pack or narrative text was changed.

## Retrieval limits

The source reader returned the archive pages directly during this check. Only the immediate adjacent messages needed to clarify the suggestions and follow-up were opened; the surrounding months, full mailing-list archives, linked Cisco documentation, and external TAC/bug records were not independently retrieved. Bug/fix statements remain participant-attributed. This check verifies what the archived thread says, not the underlying technical diagnosis, remedy, prevalence, or current product status.

The original proposal/index, canonical review register, source packs and gameplay registers were not edited. This follow-up does not promote the 75 archive-gameplay candidates or change implementation dispositions.

## Audit of existing revision proposals

The [40-reference amendment audit](revise-audit.md) and its [structured record](revise-audit.json) compare every existing `revise` recommendation with its linked primary source. Each row carries the linked claim and requirement IDs, proposed replacement wording, uncertainty, the source URL and retrieval result, and a concrete owner decision. The exact pinned GitHub tree URL, several Webex App Hub detail pages, and two supplemental EU pages had retrieval limits; the records state what was directly available. All 40 canonical `acceptedReview` values remain null.

## Audit of existing accept recommendations

The [48-reference accept audit](accept-audit.md) and its [structured records](accept-audit.json) check for compound-claim overreach. They propose 47 narrowly scoped accept dispositions and one bounded wording revision. Webex Wholesale and 3CX repeat fetches timed out and remain explicitly flagged. No owner acceptance is recorded; canonical reviews remain unchanged.
