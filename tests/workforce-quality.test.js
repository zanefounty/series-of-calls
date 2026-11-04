const test = require('node:test');
const assert = require('node:assert/strict');
const quality = require('../src/game/38-workforce-quality');

function harness() {
  const root = { clock: 0 };
  const contract = { id: 'contract-1', status: 'active', offer: 'queueberry-quality', unit: 'quality-review', currency: 'AUD', customer: 'customer', supportOwner: 'operator', resources: ['service', 'recorder', 'archive'] };
  const context = () => ({
    tenant: 'tenant-1', clock: root.clock, contract,
    contact: { generation: 1, ready: true, serviceResource: 'service', serviceGeneration: 1, serviceReady: true, supervisors: ['supervisor'] },
    recorder: { generation: 1, ready: true }, archive: { generation: 1, ready: true }
  });
  const interaction = { id: 'interaction-1', tenant: 'tenant-1', phase: 'resolved', outcome: 'resolved', caseId: 'case-1', agent: 'agent-1', workforceAssignment: 'interaction-1', records: ['record-1'] };
  const assignment = { id: 'assignment-1', interaction: 'interaction-1', person: 'agent-1', personSnapshot: { id: 'agent-1', skills: ['service'] }, entitlement: 'entitlement-1', channel: 'voice', status: 'complete', skill: 'service', language: 'en', startedAt: 1, wrapUntil: null };
  const record = { id: 'record-1', kind: 'recording', interaction: 'interaction-1', createdAt: 2, expiresAt: 100, held: false, deleted: false, region: 'AU', captureRegion: 'AU', captureScope: 'complete', access: ['supervisor'], pack: null, classification: null, storage: null };
  const hooks = {
    integrationContext: context,
    reviewCandidates: () => ['interaction-1'],
    reviewContext: (_root, q) => ({ tenant: 'tenant-1', clock: root.clock, contract, reviewer: { id: q.reviewer, supervisor: true, authorized: true }, interaction, case: { id: 'case-1', tenant: 'tenant-1', identity: 'caller-1', interactions: ['interaction-1'] }, assignment, recordings: [{ record, reviewAllowed: true, reasons: [] }] }),
    settleReview: (_root, q, pending) => ({ status: 'posted', usageId: q.usageId, reviewId: q.reviewId, tenant: q.tenant, contractId: q.contractId, reviewer: q.reviewer, interactionId: q.interactionId, recordingId: q.recordingId, offerGeneration: 1, integrationGeneration: q.integrationGeneration, unit: 'quality-review', quantity: 1, at: q.at, currency: 'AUD', cents: 100, costCents: 50, entryId: `ledger-${pending.id}`, costEntryId: `cost-${pending.id}`, costCategory: 'cost' }),
    validateReceipt: () => true
  };
  return { root, hooks };
}

const scores = { opening: 5, verification: 5, resolution: 5, documentation: 5 };
function ready() {
  const h = harness();
  let state = quality.create({ tenant: 'tenant-1', clock: 0 });
  quality.command(state, { action: 'integrate', contractId: 'contract-1' }, h.root, h.hooks);
  h.root.clock = 1;
  quality.advance(state, 1, h.root, h.hooks);
  quality.command(state, { action: 'observe-integration', supplierAvailable: true, applicationAvailable: true }, h.root, h.hooks);
  quality.command(state, { action: 'test-integration' }, h.root, h.hooks);
  return { ...h, state };
}

test('AC-SOC-553 quality integration has desired, pending and effective stages and requires a current observation test', () => {
  const { root, hooks } = harness();
  const state = quality.create({ tenant: 'tenant-1', clock: 0 });
  quality.command(state, { action: 'integrate', contractId: 'contract-1' }, root, hooks);
  assert.equal(state.integration.provisioning.status, 'pending');
  assert.equal(state.integration.effective, null);
  root.clock = 1;
  quality.advance(state, 1, root, hooks);
  assert.equal(state.integration.provisioning.status, 'ready');
  assert.equal(state.integration.effective.activatedAt, 1);
  quality.command(state, { action: 'observe-integration', supplierAvailable: true, applicationAvailable: true }, root, hooks);
  quality.command(state, { action: 'test-integration' }, root, hooks);
  assert.equal(state.integration.tests.at(-1).status, 'passed');
  quality.validate(state, root, hooks);
});

test('AC-SOC-554 review computes rubric score, records a typed receipt and recommends without changing workforce state', () => {
  const { root, hooks, state } = ready();
  const before = JSON.stringify({ integration: state.integration, reviews: state.reviews });
  const review = quality.command(state, { action: 'review', interactionId: 'interaction-1', reviewer: 'supervisor', scores }, root, hooks);
  assert.equal(review.total, 100);
  assert.equal(review.passed, true);
  assert.equal(review.agent.assignmentId, 'assignment-1');
  assert.equal(review.interactionSnapshot.workforceAssignment, 'interaction-1');
  assert.equal(review.billingReceipt.unit, 'quality-review');
  assert.equal(review.billingReceipt.cents, 100);
  assert.equal(review.recommendation, null);
  assert.notEqual(JSON.stringify({ integration: state.integration, reviews: state.reviews }), before);
  assert.equal(quality.inspect(state, root, hooks).eligibleInteractions[0].captureScope, 'complete');
});

test('AC-SOC-555 low scores add a linked recommendation and supersession keeps the first review immutable', () => {
  const { root, hooks, state } = ready();
  const first = quality.command(state, { action: 'review', interactionId: 'interaction-1', reviewer: 'supervisor', scores: { opening: 2, verification: 2, resolution: 3, documentation: 3 } }, root, hooks);
  assert.equal(first.total, 50);
  assert.equal(first.passed, false);
  assert.equal(first.recommendation.agentId, 'agent-1');
  const original = JSON.stringify(first);
  assert.throws(() => quality.command(state, { action: 'review', interactionId: 'interaction-1', reviewer: 'supervisor', scores }, root, hooks), /QUALITY_SUPERSEDE_REASON_REQUIRED/);
  quality.command(state, { action: 'review', interactionId: 'interaction-1', reviewer: 'supervisor', scores, supersedeReason: 'Supervisor review of evidence' }, root, hooks);
  assert.equal(JSON.stringify(state.reviews[0]), original);
  assert.equal(state.reviews.length, 2);
  assert.equal(state.reviews[1].supersedesReviewId, first.id);
});

test('AC-SOC-556 commands reject caller totals and inspection remains pure', () => {
  const { root, hooks, state } = ready();
  assert.throws(() => quality.command(state, { action: 'review', interactionId: 'interaction-1', reviewer: 'supervisor', scores, total: 100 }, root, hooks), /INVALID_QUALITY_REVIEW_COMMAND/);
  const before = JSON.stringify(state);
  quality.inspect(state, root, hooks);
  quality.inspect(state, root, hooks);
  assert.equal(JSON.stringify(state), before);
  assert.ok(quality.source().includes('socWorkforceQualityKernel'));
});
