# Advanced pack boundary audit — 3 November 2026

This bounded audit exercises the outcomes, channel and product packs at save and lifecycle boundaries. It covers the synthetic model only; it makes no vendor, legal or real-world delivery claims.

## Findings and changes

| Area | Reproduction and result |
| --- | --- |
| Customer outcomes | A bot can answer while its explicit task result fails. Evaluation remains unresolved and exhaustion is retained. Saved need count and open/retry state are checked so deleting a need or clearing its required retry cannot masquerade as completion. Replaying an identical task result at a later clock is idempotent; a changed result conflicts. Missing `needId` on a legacy interaction is an untracked no-op. |
| Channel authorization | Opening a conversation now requires a current, purpose-specific permission. A pre-accept retry is rejected after revocation. `recordAcceptance(state, interaction, context, acceptedJob)` captures the permission, account generation, template/window decision, case binding and parent job at HTTP 202. `recordDelivery(..., deliveredJob)` accepts only the matching delivered parent job and records that actual result without rechecking permission or the expired reply window. New queued attempts still run current `beforeAccept` checks. |
| Channel identity and sessions | Conversation purpose cannot be changed by reopening the same tenant/person/channel/case tuple. A conversation cannot be resumed as another person or case. Expired Casechat sessions cannot resume, and saved active/paused sessions cannot outlive their expiry. Delivery receipts must link to an acceptance with matching tenant, person, channel and case. |
| Product lifecycle | Existing effective service remains available while a sale-end change is pending and remains usable after sale ends if support is still effective. New deployment is rejected after sale ends; ended support disables the effective feature. Failed deployment provisioning keeps the previous effective version. |
| Product compatibility save | The new negative case tampers a previously verified integration result by adding `DIRECTIONAL_PATH_NOT_OBSERVED` and marking a feature check unavailable. The workforce agent strengthened `validResult` to bind status, reasons, check results and endpoint scope; the regression now rejects the save. |

## Parent integration contract

The parent kernel must invoke the channel acceptance hook only from the operations `accepted` callback, after the corresponding job enters `accepted`, and must invoke delivery only from `delivered`, with the actual job object. Before the operations retry/acceptance pass, keep `state.channels.clock` synchronized with the parent clock. Do not expose UI or player commands that can fabricate parent acceptance or delivery receipts.

The outcomes repeat emitter must reserve/return the interaction ID and queue canonical interaction processing until after `SOC_OUTCOMES.advance` returns. It must not settle synchronously inside `emitRepeat`, before the module records its pending interaction key.

Acceptance and task/need history are synthetic and bounded. The channel pack caps acceptances and receipts at 4,000; at capacity the parent must surface the blocked event instead of dropping an unpaired receipt. Transient acceptance/delivery progress stays out of configuration fingerprints.

## Verification

`tests/advanced-boundaries.test.js` adds eight bounded cases (AC-SOC-099–106). Existing `tests/channels.test.js` now passes parent accepted/delivered job objects when recording receipts. The focused run covered `advanced-boundaries`, `channels`, `outcomes` and `products` tests. Parent callback wiring must be reviewed in the shared kernel integration.
