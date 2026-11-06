'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SOC, FACTS, RECEIPTS, RESPONSIBILITY, REGIONAL, POLICY, UC_CC, C3, C5, L7, clone, hooks, mspFor, checkpoint, buy, dispatchWithCheckpoint, advance, until, safeCashWaitChunk, untilCash, compareCashWaitToMinuteSteps, startCustomer, operation, operationComplete, stableSupportWindowShape, createThreeMarketWindow, createFiveMarketWindow, createLevelSevenWindow, claim, claimSource, rehash, paidPurchaseWhenReady, addRegionalCustomer, ccChild, ccHasFullWork, installTestedUcCcPair, assuranceMinute, assuranceWaitChunk, runAssuranceWait, compareAssuranceWaitToMinuteSteps } = require('./provider-progression-regional-claims.helpers.js');

test('AC-SOC-655 public dispatch earns T2 from three paid UC/CC integrations and funds bounded automatic repair', () => {
  let state = createThreeMarketWindow();
  // The three quoted recipes total 1,902,000 setup cents and 357,000 cents per period.
  // Include three settlement cycles during 165 serial work minutes, actual payroll,
  // the measured pre-integration operating surplus, and the bounded repair budget.
  checkpoint('t2-before-funding-wait', state, { targetCashCents: 2_500_000 });
  state = untilCash(state, 2_500_000, 'fund the costed T2 and response reserve from actual settlements', 600);
  checkpoint('t2-funded-reserve', state, { targetCashCents: 2_500_000 });
  const customerIds = ['starter-customer', 'next-1-customer', 'next-2-customer'];
  for (const customerId of customerIds) {
    state = installTestedUcCcPair(state, customerId);
    checkpoint(`t2-integration-${customerId}`, state, { customerId });
  }
  state = until(state, current => stableSupportWindowShape(current, customerIds), 'stable three-market support and tested integration window', 180);

  const ready = SOC.provider.inspect(state).progression.goals[T2];
  assert.equal(ready.status, 'ready', JSON.stringify(ready.missing));
  assert.deepEqual(ready.evidence.customerIds, [...customerIds].sort());
  assert.deepEqual(ready.evidence.markets, ['au-sydney', 'eu-dublin', 'us-seattle']);
  assert.ok(Array.isArray(ready.evidence.samples), 'live regional-window evidence exposes decoded samples');
  for (const customerId of customerIds) {
    const participantRows = ready.evidence.samples.map(sample => sample.participants.find(row => row.customerId === customerId));
    assert.ok(participantRows.every(row => row.integrations?.some(edge => edge.id === 'workplace-to-contact-quality')),
      `${customerId} has a current paid and tested integration in every retained sample`);
  }
  checkpoint('t2-assurance-ready', state, { customerIds });

  const cashBeforeClaim = state.business.balance.cash;
  checkpoint('t2-ready-window', state, { sourceId: T2, customerIds });
  state = claimSource(state, T2);
  const receipt = state.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === T2);
  checkpoint('t2-earned-window', state, { sourceId: T2, customerIds: receipt?.sourceEvidence?.customerIds || [] });
  assert.ok(receipt);
  assert.ok(receipt.evidenceInterval.from <= receipt.sourceEvidence.interval.from,
    'receipt interval aggregates nested settlement and support-window intervals');
  assert.ok(receipt.evidenceInterval.to >= receipt.sourceEvidence.interval.to,
    'receipt interval covers the complete support window');
  assert.deepEqual(receipt.unlock.allowedCustomerIds, [...customerIds].sort());
  assert.deepEqual(receipt.unlock.allowedMarkets, ready.evidence.markets);
  assert.equal(state.business.balance.cash, cashBeforeClaim, 'claiming the measured tier grants no cash');
  assert.equal(SOC.restore(JSON.stringify(state)).providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === T2).id, receipt.id);

  const alteredAggregate = clone(state);
  const aggregateReceipt = alteredAggregate.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === T2);
  aggregateReceipt.evidenceInterval.from++;
  rehash(aggregateReceipt);
  assert.throws(() => SOC.restore(JSON.stringify(alteredAggregate)), /INVALID_PROVIDER_PROGRESSION_RECEIPT_EVIDENCE/,
    'rehashed aggregate interval edits fail the recomputed source summary');

  const alteredWindow = clone(state);
  const windowReceipt = alteredWindow.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === T2);
  windowReceipt.sourceEvidence.interval.from++;
  rehash(windowReceipt);
  assert.throws(() => SOC.restore(JSON.stringify(alteredWindow)), /INVALID_PROVIDER_PROGRESSION_RECEIPT/,
    'rehashed support-window interval edits fail against the retained samples');

  const forged = clone(state);
  const forgedReceipt = forged.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === T2);
  const samples = FACTS.decodeSupportObservation(forgedReceipt.sourceEvidence.samples);
  samples[12].participants.find(row => row.customerId === customerIds[2]).integrations = [];
  forgedReceipt.sourceEvidence.samples = FACTS.encodeSupportObservation(samples);
  rehash(forgedReceipt);
  assert.throws(() => SOC.restore(JSON.stringify(forged)), /INVALID_PROVIDER_PROGRESSION_RECEIPT/);

  const anchor = customerIds[0];
  const quoteHooks = { ...hooks, customerId: anchor, providerQuote: (current, request) => SOC.provider.quote(current, request) };
  const beforePreview = JSON.stringify(state);
  const proposal = RECEIPTS.unlockProposal(state, T2, quoteHooks);
  assert.equal(JSON.stringify(state), beforePreview, 'assurance preview is pure');
  assert.equal(proposal.status, 'available', JSON.stringify(proposal.missing));
  assert.equal(proposal.request.operationId, 'integration-assurance');
  assert.deepEqual(proposal.unlock.allowedCustomerIds, [...customerIds].sort());
  assert.deepEqual([proposal.quote.setupCents, proposal.quote.periodCents, proposal.quote.workMinutes, proposal.quote.engineers, proposal.quote.support], [30000, 9000, 6, 0, 1]);

  const paidAssurance = proposal.request;
  state = SOC.dispatch(state, { type: 'provider', command: { ...paidAssurance, quoteRevision: proposal.quote.atRevision } });
  const assuranceProject = state.providerCampaign.projects.findLast(row => row.customerId === anchor && row.operationId === 'integration-assurance');
  assert.ok(assuranceProject);
  state = operationComplete(state, 'integration-assurance', anchor);
  const completedAssurance = state.providerCampaign.projects.find(row => row.id === assuranceProject.id);
  assert.equal(completedAssurance.status, 'complete');
  assert.ok(state.business.ledger.some(row => row.id === completedAssurance.postingId && row.projectId === completedAssurance.id && row.cents === completedAssurance.setupCents));

  const existingPolicy = state.providerAutomation.find(row => row.projectId === completedAssurance.id);
  assert.ok(existingPolicy);
  assert.equal(existingPolicy.status, 'suspended', 'a paid assurance product does not enable itself');
  const config = POLICY.create({
    ...existingPolicy.config,
    enabled: true,
    suspended: false,
    cashFloorCents: 0,
    lifetimeBudgetCents: 50000,
    maxActions: 1,
    engineerCeiling: 5,
    supportCeiling: 6,
    customerIds,
    rules: [{ id: 'repair-one-real-incident', kind: 'assurance', enabled: true, customerIds, operationId: 'repair', stage: null, resourceId: null, thresholdPercent: null }]
  });
  const beforeConfigure = JSON.stringify(state);
  const idle = SOC.provider.policyPreview(state, config, anchor);
  assert.notEqual(idle.status, 'ready', 'without a measured incident the configured policy has no action');
  assert.equal(JSON.stringify(state), beforeConfigure);
  state = SOC.dispatch(state, { type: 'provider', command: { action: 'configure-policy', customerId: anchor, config, quoteRevision: state.revision } });
  const activePolicy = state.providerAutomation.find(row => row.projectId === completedAssurance.id);
  assert.equal(activePolicy.status, 'active');
  assert.equal(activePolicy.config.lifetimeBudgetCents, 50000);
  assert.equal(activePolicy.config.maxActions, 1);

  const assuranceWaitStartedAt = state.clock;
  state = compareAssuranceWaitToMinuteSteps(state, 6);
  checkpoint('t2-assurance-boundary-equivalence', state, { elapsedMinutes: state.clock - assuranceWaitStartedAt });
  state = runAssuranceWait(state, completedAssurance.id, 240 - (state.clock - assuranceWaitStartedAt));
  const fundedPolicy = state.providerAutomation.find(row => row.projectId === completedAssurance.id);
  assert.equal(fundedPolicy.actions.length, 1, `one actual incident should use the bounded policy; clock ${state.clock}`);
  const action = fundedPolicy.actions[0];
  const repair = state.providerCampaign.projects.find(row => row.id === action.projectId);
  assert.equal(repair.operationId, 'repair');
  assert.ok(customerIds.includes(repair.customerId));
  assert.equal(repair.status === 'running' || repair.status === 'commissioning' || repair.status === 'complete', true);
  assert.equal(action.incidentId && state.providerCampaign.incidents.some(row => row.id === action.incidentId && row.customerId === repair.customerId), true);
  assert.ok(state.business.ledger.some(row => row.id === repair.postingId && row.projectId === repair.id && row.cents === repair.setupCents));
  assert.equal(fundedPolicy.spentCents, repair.setupCents);
  assert.equal(fundedPolicy.config.actionsUsed, 1);
  assert.ok(fundedPolicy.spentCents <= fundedPolicy.config.lifetimeBudgetCents);
  state = until(state, current => current.providerCampaign.projects.find(row => row.id === repair.id)?.status === 'complete', 'policy-submitted incident repair', 120);
  assert.equal(SOC.restore(JSON.stringify(state)).providerAutomation.find(row => row.projectId === completedAssurance.id).actions.length, 1);
});

