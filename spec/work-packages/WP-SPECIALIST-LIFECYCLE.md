# WP-SPECIALIST-LIFECYCLE — deployment-scoped lifecycle evidence

**Status:** module, kernel hooks and typed admin panel are implemented. Focused module/UI tests pass; parent end-to-end product/commercial acceptance and product-profile review remain. This is a narrow synthetic slice of [`uc-new:domain:product-evidence`](product-profile-obligations.json), not completion of the 94-row product-profile package.

## Contract

`src/game/34-specialist-lifecycle.js` exports `SOC_SPECIALIST_LIFECYCLE` with `create`, `command`, `advance`, `validate`, `inspect`, `deploymentStatus`, `fingerprint` and a serializable `source` factory. The root stores its optional state in `root.specialistLifecycle`; the kernel registers it through normal `specialist-lifecycle` dispatch and includes its validation, clock and worker paths.

Supported commands:

- `record`: requires exactly `action`, `deploymentId`, `supportOwnerId`, `evidenceType`, `evidenceDate`, `sale`, `renewal` and `support`. The evidence date is a validated ISO calendar date no later than the pack's fixed synthetic `AS_OF_DATE` (`2026-11-03`); this date is versioned training content, not a claim about the current review date. Evidence types are `operator-observation`, `internal-test` and `contract-record`; lifecycle axes are independent and limited to the values in [`content/specialist-lifecycle.json`](../../content/specialist-lifecycle.json).
- `renewal-check`: requires `action` and `deploymentId`; records a bounded timestamped readiness receipt and never changes a financial contract.

Hooks are required and fail closed:

```js
inspectDeployment(root, deploymentId) => {
  exists: true,
  effective: true,
  offerId: 'room-offer',
  version: 'scenario-1',
  generation: 2,
  features: ['room-devices'],
  dependenciesReady: true
}

authorizeSupportOwner(root, supportOwnerId, deploymentId, action) => true | false
```

The kernel derives deployment data from the actual effective product deployment and derives support-owner authority from current business organization/delegation state. A command cannot supply a positive authority or dependency boolean. An evidence record snapshots the exact offer, version, generation and feature subset. It becomes effective one synthetic minute later only if that same deployment remains effective, its dependencies remain ready, and the owner still has authority. Failure keeps the previous effective evidence pointer. Later configuration or authority changes make current `deploymentStatus` stale or blocked without deleting the historical record.

`deploymentStatus` returns current-record `evidenceReady`, `supportedEvidenceReady` and `renewalReadiness` separately. End-of-sale alone does not disable an installed product or block an otherwise eligible, supported renewal. Ended support leaves the historical record current but makes `supportedEvidenceReady` and renewal readiness false; it does not destroy the deployment. The parent must use the sale axis to block new orders and the support axis to gate supported configuration or integration claims. Renewal checks are observable snapshots and do not amend pricing, contract terms or revenue.

## Evidence boundary

This slice provides version-scoped support owner, evidence kind/date, exact deployment scope, independent sale/renewal/support axes, stale detection and renewal readiness. It does **not** model offer/instance ownership relationships, provider attestations, cloud or region availability, legal/procurement eligibility, security certification, real vendor lifecycle dates, price, contract renewal execution, or external compatibility. `available`, `eligible` and `supported` are synthetic scenario records only. A record cannot establish that a real product is currently available, certified, supported or orderable.

The existing `45-products.js` remains the authority for actual synthetic deployment configuration, provisioning and dependency checks. Parent integration should use its effective deployment and dependency observations. This module does not duplicate product provisioning or directional integration tests.

## Acceptance

Focused module tests are `tests/specialist-lifecycle.test.js` (AC-SOC-227–234); the typed admin-panel tests are `tests/specialist-lifecycle-ui.test.js` (AC-SOC-235–236). They cover independent axes, delayed evidence activation, prior-effective preservation, version/feature/generation staleness, support-owner revocation, fail-closed dependencies, renewal receipts without financial mutation, pure inspection, save validation, worker serialization and the lock-aware form. Parent-owned end-to-end acceptance remains necessary for product orders, renewals and integrations.
