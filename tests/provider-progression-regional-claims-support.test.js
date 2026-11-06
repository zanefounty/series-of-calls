'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SOC, FACTS, RECEIPTS, RESPONSIBILITY, REGIONAL, POLICY, UC_CC, C3, C5, L7, clone, hooks, mspFor, checkpoint, buy, dispatchWithCheckpoint, advance, until, safeCashWaitChunk, untilCash, compareCashWaitToMinuteSteps, startCustomer, operation, operationComplete, stableSupportWindowShape, createThreeMarketWindow, createFiveMarketWindow, createLevelSevenWindow, claim, claimSource, rehash, paidPurchaseWhenReady, addRegionalCustomer, ccChild, ccHasFullWork, installTestedUcCcPair, assuranceMinute, assuranceWaitChunk, runAssuranceWait, compareAssuranceWaitToMinuteSteps } = require('./provider-progression-regional-claims.helpers.js');

test('regional T2 and L7 paid unlocks stay explicitly locked until their earned receipts exist', () => {
  const state = SOC.create({ experience: 'campaign', seed: 73 });
  const before = JSON.stringify(state);
  const quoteHooks = { providerQuote: (current, request) => SOC.provider.quote(current, request) };
  for (const [sourceId, missing] of [[RECEIPTS.REGIONAL_T2, 'TIER_TWO_RECEIPT_REQUIRED'], [RECEIPTS.REGIONAL_L7, 'INTERNATIONAL_PROVIDER_RECEIPT_REQUIRED'], [RECEIPTS.DEDICATED_INTERCONNECT, 'DEDICATED_INTERCONNECT_RECEIPT_REQUIRED']]) {
    const proposal = RECEIPTS.unlockProposal(state, sourceId, quoteHooks);
    assert.equal(proposal.status, 'locked');
    assert.deepEqual(proposal.missing, [missing]);
  }
  assert.equal(JSON.stringify(state), before, 'inspection cannot grant an unlock or change campaign finances');
});

test('safe cash wait chunks preserve native results at settlement boundaries', () => {
  let state = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  state = startCustomer(state, 'starter-customer', 'starter', 'au-sydney');
  const startClock = state.clock;
  const target = Math.ceil((startClock + 1) / 60) * 60;
  const waited = compareCashWaitToMinuteSteps(state, target - startClock);
  assert.equal(waited.clock, target);
  assert.ok(waited.providerCampaign.periodHistory.some(row => row.settledAt === target),
    'the actual customer settlement survives the chunked command');
});

