'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SOC, FACTS, RECEIPTS, RESPONSIBILITY, REGIONAL, POLICY, UC_CC, C3, C5, T2, L7, clone, hooks, mspFor, checkpoint, buy, dispatchWithCheckpoint, advance, until, safeAdvanceChunk, untilCash, compareCashWaitToMinuteSteps, startCustomer, operation, operationComplete, stableSupportWindowShape, supportWindowBatchBoundary, createThreeMarketWindow, createFiveMarketWindow, createLevelSevenWindow, claim, claimSource, rehash, paidPurchaseWhenReady, addRegionalCustomer, ccChild, ccHasFullWork, installTestedUcCcPair, assuranceMinute, assuranceWaitChunk, runAssuranceWait, compareAssuranceWaitToMinuteSteps } = require('./provider-progression-regional-claims.helpers.js');

function minuteUntil(state, predicate, label, limit = 120) {
  const startedAt = state.clock;
  while (state.clock - startedAt < limit && !predicate(state)) state = advance(state);
  assert.ok(predicate(state), `${label} reached at minute ${state.clock}`);
  return state;
}

function startCustomerMinuteByMinute(state) {
  const customerId = 'starter-customer';
  state = buy(state, { action: 'purchase', offerId: 'starter', planId: 'swift', stage: 'base', market: 'au-sydney' });
  state = minuteUntil(state, s => s.providerCampaign.customers.find(row => row.id === customerId)?.stages.base?.status === 'effective', 'base stage');
  for (const stage of ['carrier', 'partner']) {
    state = buy(state, { action: 'purchase', offerId: 'starter', planId: 'swift', stage, customerId });
    state = minuteUntil(state, s => s.providerCampaign.customers.find(row => row.id === customerId)?.stages[stage]?.status === 'effective', `${stage} stage`);
  }
  return state;
}

function persistedState(state) {
  if (Array.isArray(state)) return state.map(persistedState);
  if (!state || typeof state !== 'object') return state;
  return Object.fromEntries(Object.entries(state)
    .filter(([key]) => key !== 'revision')
    .map(([key, value]) => [key, persistedState(value)]));
}

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
  let minuteSteps = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  state = startCustomer(state, 'starter-customer', 'starter', 'au-sydney');
  minuteSteps = startCustomerMinuteByMinute(minuteSteps);
  const normalized = value => {
    const result = persistedState(value);
    delete result.commands;
    return result;
  };
  assert.deepEqual(normalized(state), normalized(minuteSteps), 'project due-boundary waits match one-minute public dispatches');
  const startClock = state.clock;
  const target = Math.ceil((startClock + 1) / 60) * 60;
  const waited = compareCashWaitToMinuteSteps(state, target - startClock);
  assert.equal(waited.clock, target);
  assert.ok(waited.providerCampaign.periodHistory.some(row => row.settledAt === target),
    'the actual customer settlement survives the chunked command');
});

test('operation completion waits stop at the exact accepted project due boundary', () => {
  let bounded = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  let minuteSteps = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  const request = { action: 'purchase', offerId: 'starter', planId: 'swift', stage: 'base', market: 'au-sydney' };
  bounded = buy(bounded, request);
  minuteSteps = buy(minuteSteps, request);
  minuteSteps = minuteUntil(minuteSteps, state => state.providerCampaign.customers.find(row => row.id === 'starter-customer')?.stages.base?.status === 'effective', 'reference base stage');
  bounded = operationComplete(bounded, null, 'starter-customer');
  const normalized = value => {
    const result = persistedState(value);
    delete result.commands;
    return result;
  };
  assert.deepEqual(normalized(bounded), normalized(minuteSteps), 'due-boundary completion matches one-minute native dispatch outcomes');
});

test('cash and assurance comparison results retain commands and remain restorable and dispatchable', () => {
  const initial = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  for (const [label, compared] of [
    ['cash', compareCashWaitToMinuteSteps(initial, 6)],
    ['assurance', compareAssuranceWaitToMinuteSteps(initial, 6)]
  ]) {
    assert.ok(Array.isArray(compared.commands), `${label} comparison preserves the native command collection`);
    const restored = SOC.restore(JSON.stringify(compared));
    assert.ok(Array.isArray(restored.commands), `${label} comparison output restores without migration loss`);
    const next = SOC.dispatch(compared, { type: 'advance', minutes: 1 });
    assert.equal(next.clock, compared.clock + 1, `${label} comparison result accepts the next validated advance`);
  }
});

function windowSample(at, { configuration = 'configuration-a', eligible = true } = {}) {
  const customerId = 'sample-customer';
  return {
    version: 2,
    contentVersion: 'provider-progression-facts-content-1',
    at,
    cohort: [customerId],
    participants: [{
      customerId,
      portfolioId: customerId,
      tenant: customerId,
      market: 'au-sydney',
      scenario: 'smb',
      configuration,
      eligible,
      missing: [],
      resources: [{ id: 'phone', generation: 1 }],
      boundaries: [{ id: 'boundary', generation: 1, profile: 'calling', resources: ['phone'] }],
      responsibility: {
        id: 'msp-record', customerId, role: 'msp', organisationId: 'orchard-msp', projectId: 'msp-project',
        postingId: 'msp-posting', effectiveAt: 1, expiresAt: null, scope: ['phone'], setupCents: 100,
        periodCents: 10, engineers: 1, support: 1, sharedWorkforce: null
      },
      namedSupport: null,
      distributor: null,
      integrations: [],
      freshJobs: [],
      settlements: []
    }]
  };
}

function sampleWindow(samples) {
  return {
    clock: samples.at(-1).at,
    business: { workforce: { engineers: 1, support: 1 } },
    providerCampaign: { supportObservation: FACTS.encodeSupportObservation(samples) }
  };
}

test('stable-window batch waits only while witnessed incompatible rows make success impossible', () => {
  const oneContradiction = [windowSample(100, { configuration: 'old' }), ...Array.from({ length: 59 }, (_, index) => windowSample(101 + index))];
  assert.equal(FACTS.decodeSupportObservation(sampleWindow(oneContradiction).providerCampaign.supportObservation).length, 60);
  assert.equal(supportWindowBatchBoundary(sampleWindow(oneContradiction), ['sample-customer']), 160,
    'the older conflicting row must age out before any 60-sample window can match');

  const twoConfigurations = [
    ...Array.from({ length: 30 }, (_, index) => windowSample(100 + index, { configuration: 'old' })),
    ...Array.from({ length: 30 }, (_, index) => windowSample(130 + index, { configuration: 'new' }))
  ];
  assert.equal(supportWindowBatchBoundary(sampleWindow(twoConfigurations), ['sample-customer']), 189,
    'the earliest possible window starts only after the last old-configuration sample expires');

  const oneInvalidRow = [windowSample(100, { eligible: false }), ...Array.from({ length: 59 }, (_, index) => windowSample(101 + index))];
  assert.equal(supportWindowBatchBoundary(sampleWindow(oneInvalidRow), ['sample-customer']), 160,
    'a witnessed ineligible sample cannot later be repaired and must leave the ring');

  const alreadyConsistent = Array.from({ length: 60 }, (_, index) => windowSample(100 + index));
  assert.equal(supportWindowBatchBoundary(sampleWindow(alreadyConsistent), ['sample-customer']), null,
    'without a witnessed contradiction the waiter keeps checking one minute at a time');
});

