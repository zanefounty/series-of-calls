'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SOC, FACTS, RECEIPTS, RESPONSIBILITY, REGIONAL, POLICY, UC_CC, C3, C5, L7, clone, hooks, mspFor, checkpoint, buy, dispatchWithCheckpoint, advance, until, safeCashWaitChunk, untilCash, compareCashWaitToMinuteSteps, startCustomer, operation, operationComplete, stableSupportWindowShape, createThreeMarketWindow, createFiveMarketWindow, createLevelSevenWindow, claim, claimSource, rehash, paidPurchaseWhenReady, addRegionalCustomer, ccChild, ccHasFullWork, installTestedUcCcPair, assuranceMinute, assuranceWaitChunk, runAssuranceWait, compareAssuranceWaitToMinuteSteps } = require('./provider-progression-regional-claims.helpers.js');

test('AC-SOC-654 public dispatch earns C5 only after five distinct paid customer markets and a full support window', () => {
  let state = createFiveMarketWindow();
  const ready = SOC.provider.inspect(state).progression.goals[C5];
  assert.equal(ready.status, 'ready', JSON.stringify(ready.missing));
  assert.deepEqual(ready.evidence.markets, ['au-melbourne', 'au-sydney', 'eu-dublin', 'jp-tokyo', 'us-seattle']);
  assert.equal(ready.evidence.customerIds.length, 5);
  const cash = state.business.balance.cash;
  state = claimSource(state, C5);
  const receipt = state.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C5);
  checkpoint('c5-earned-window', state, { sourceId: C5, customerIds: receipt?.sourceEvidence?.customerIds || [] });
  assert.ok(receipt);
  assert.deepEqual(receipt.unlock.allowedMarkets, ready.evidence.markets);
  assert.equal(receipt.unlock.operationId, 'regional-provisioning');
  assert.equal(state.business.balance.cash, cash, 'earning C5 does not award or spend cash');
  assert.equal(SOC.restore(JSON.stringify(state)).providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C5).sourceId, C5);
});

