'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SOC, FACTS, RECEIPTS, RESPONSIBILITY, REGIONAL, POLICY, UC_CC, C3, C5, L7, clone, hooks, mspFor, checkpoint, buy, dispatchWithCheckpoint, advance, until, safeCashWaitChunk, untilCash, compareCashWaitToMinuteSteps, startCustomer, operation, operationComplete, stableSupportWindowShape, createThreeMarketWindow, createFiveMarketWindow, createLevelSevenWindow, claim, claimSource, rehash, paidPurchaseWhenReady, addRegionalCustomer, ccChild, ccHasFullWork, installTestedUcCcPair, assuranceMinute, assuranceWaitChunk, runAssuranceWait, compareAssuranceWaitToMinuteSteps } = require('./provider-progression-regional-claims.helpers.js');

test('AC-SOC-656 L7 unlock quotes and funds the real scoped distributor support tariff', () => {
  let state = createLevelSevenWindow();
  const ready = SOC.provider.inspect(state).progression.levels[L7];
  checkpoint('l7-before-claim', state, { sourceId: L7, status: ready.status, missing: ready.missing });
  assert.equal(ready.status, 'ready', JSON.stringify(ready.missing));
  assert.deepEqual(ready.evidence.markets, ['au-melbourne', 'au-sydney', 'eu-dublin', 'jp-tokyo', 'us-seattle']);
  assert.equal(ready.evidence.customerIds.length, 5);
  const cash = state.business.balance.cash;
  state = claimSource(state, L7);
  const receipt = state.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === L7);
  checkpoint('l7-earned-window', state, { sourceId: L7, customerIds: receipt?.sourceEvidence?.customerIds || [] });
  assert.ok(receipt);
  assert.equal(state.business.balance.cash, cash);
  assert.equal(receipt.unlock.operationId, REGIONAL.OPERATION_ID);
  assert.equal(receipt.unlock.coverageId, 'distributor-extended');
  assert.deepEqual(receipt.unlock.allowedMarkets, ready.evidence.markets);

  const target = state.providerCampaign.customers.find(row => row.market === 'au-sydney');
  const beforeProposal = JSON.stringify(state);
  const proposal = RECEIPTS.unlockProposal(state, L7, { ...hooks, customerId: target.id, providerQuote: (current, request) => SOC.provider.quote(current, request) });
  assert.equal(JSON.stringify(state), beforeProposal, 'the earned offer preview is read-only');
  assert.equal(proposal.status, 'available', JSON.stringify(proposal.missing));
  assert.equal(proposal.request.operationId, REGIONAL.OPERATION_ID);
  assert.deepEqual(proposal.request.config, { market: 'au-sydney', personId: 'support-au-sydney-01', coverageId: 'distributor-extended' });
  assert.deepEqual([proposal.quote.setupCents, proposal.quote.periodCents, proposal.quote.workMinutes, proposal.quote.engineers, proposal.quote.support], [24000, 12000, 8, 0, 1]);

  state = SOC.dispatch(state, { type: 'provider', command: { ...proposal.request, quoteRevision: proposal.quote.atRevision } });
  const project = state.providerCampaign.projects.findLast(row => row.customerId === target.id && row.operationId === REGIONAL.OPERATION_ID && row.config?.coverageId === 'distributor-extended');
  assert.ok(project);
  state = until(state, current => current.providerCampaign.projects.find(row => row.id === project.id)?.status === 'complete', 'L7 distributor tariff delivery');
  const completed = state.providerCampaign.projects.find(row => row.id === project.id);
  assert.equal(completed.status, 'complete');
  assert.equal(completed.supportCommercialEvidence.sourceId, L7);
  assert.equal(completed.supportCommercialEvidence.receiptId, receipt.id);
  assert.deepEqual(completed.supportCommercialEvidence.allowedMarkets, receipt.unlock.allowedMarkets);
  assert.ok(state.business.ledger.some(row => row.id === completed.postingId && row.projectId === completed.id && row.cents === completed.setupCents));
  assert.equal(state.business.balance.cash, cash - completed.setupCents);
  assert.equal(SOC.restore(JSON.stringify(state)).providerCampaign.projects.find(row => row.id === project.id).status, 'complete');
});

