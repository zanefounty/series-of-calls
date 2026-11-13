'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SOC, FACTS, RECEIPTS, RESPONSIBILITY, REGIONAL, POLICY, UC_CC, C3, C5, T2, L7, clone, hooks, mspFor, checkpoint, buy, dispatchWithCheckpoint, advance, until, stageEffective, nextOpportunity, safeAdvanceChunk, untilCash, compareCashWaitToMinuteSteps, startCustomer, operation, operationComplete, stableSupportWindowShape, supportWindowBatchBoundary, createThreeMarketWindow, createFiveMarketWindow, createLevelSevenWindow, claim, claimSource, rehash, paidPurchaseWhenReady, addRegionalCustomer, ccChild, ccHasFullWork, ucCcCommissioning, installTestedUcCcPair, assuranceMinute, assuranceWaitChunk, runAssuranceWait, compareAssuranceWaitToMinuteSteps } = require('./provider-progression-regional-claims.helpers.js');

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

function comparableState(state) {
  const result = persistedState(state);
  delete result.commands;
  return result;
}

test('stage commissioning waits preserve each first effective minute and full persisted state', () => {
  let bounded = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  let reference = clone(bounded);
  for (const stage of ['base', 'carrier', 'partner']) {
    const request = { action: 'purchase', offerId: 'starter', planId: 'swift', stage,
      ...(stage === 'base' ? { market: 'au-sydney' } : { customerId: 'starter-customer' }) };
    bounded = buy(bounded, request);
    reference = buy(reference, request);
    const ready = state => state.providerCampaign.customers[0].stages[stage].status === 'effective';
    reference = minuteUntil(reference, ready, `${stage} reference`);
    bounded = stageEffective(bounded, 'starter-customer', stage);
    assert.equal(bounded.clock, reference.clock, `${stage} stops at the first observed effective minute`);
    assert.deepEqual(comparableState(bounded), comparableState(reference), `${stage} preserves all non-command/revision state`);
    assert.deepEqual(SOC.restore(JSON.stringify(bounded)), bounded, `${stage} result remains a valid native save`);
  }
  assert.ok(bounded.commands.filter(row => row.command.type === 'advance').length < reference.commands.filter(row => row.command.type === 'advance').length,
    'accepted work due boundaries reduce native advance dispatches');
});

test('opportunity settlement waits preserve first success, native incident interruption and paid repair', () => {
  let initial = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  initial = startCustomer(initial, 'starter-customer', 'starter', 'au-sydney');
  const before = JSON.stringify(initial);
  const requested = safeAdvanceChunk(initial);
  const interrupted = SOC.dispatch(initial, { type: 'advance', minutes: requested });
  assert.ok(interrupted.clock < initial.clock + requested, 'native advance stops before settlement when the authored incident activates');
  assert.ok(interrupted.providerCampaign.incidents.some(row => row.status === 'active'));
  const ready = state => state.providerCampaign.mission.nextOpportunityAvailable;
  const reference = minuteUntil(clone(initial), ready, 'reference opportunity', 180);
  const bounded = nextOpportunity(clone(initial), 'bounded opportunity', 180);
  assert.equal(bounded.clock, reference.clock, 'opportunity stops on the same first qualifying settlement');
  assert.equal(bounded.clock % 60, 0);
  assert.deepEqual(comparableState(bounded), comparableState(reference), 'jobs, billing, incident timing, paid repair and all other persisted state match');
  assert.ok(bounded.providerCampaign.incidents.some(row => row.status === 'resolved'));
  assert.ok(bounded.providerCampaign.projects.some(row => row.operationId === 'repair' && row.status === 'complete' && row.postingId));
  assert.ok(bounded.commands.filter(row => row.command.type === 'advance').length < reference.commands.filter(row => row.command.type === 'advance').length);
  assert.equal(JSON.stringify(initial), before, 'comparison and waiting do not edit the supplied paid fixture');
  assert.deepEqual(SOC.restore(JSON.stringify(bounded)), bounded);

  let won = until(bounded, state => state.providerCampaign.mission.consecutiveQualifying >= 2, 'two qualified periods');
  won = buy(won, { action: 'purchase', offerId: 'next-1', planId: 'swift', stage: 'base', market: 'us-seattle' });
  assert.equal(won.providerCampaign.status, 'operating', 'the second paid order is only a commitment');
  won = stageEffective(won, 'next-1-customer', 'base');
  for (const stage of ['carrier', 'partner']) { won = buy(won, { action: 'purchase', offerId: 'next-1', planId: 'swift', stage, customerId: 'next-1-customer' }); won = stageEffective(won, 'next-1-customer', stage); }
  won = until(won, state => state.providerCampaign.status === 'won', 'delivered expansion victory', 120);
  assert.equal(won.providerCampaign.status, 'won', 'effective expansion and observed work earn the mission win');
  assert.equal(nextOpportunity(won, 'already won opportunity', 180, { allowWon: true }), won,
    'the explicit won alternative returns immediately without continuing the career');
});

test('specialized waits keep simulation caps and generic transient predicates keep minute polling', () => {
  const initial = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  const funded = buy(initial, { action: 'purchase', offerId: 'starter', planId: 'swift', stage: 'base', market: 'au-sydney' });
  const before = JSON.stringify(funded);
  assert.throws(() => stageEffective(funded, 'starter-customer', 'base', 'capped stage', 1), /capped stage not reached at minute 1/);
  assert.throws(() => nextOpportunity(funded, 'capped opportunity', 1), /capped opportunity not reached at minute 1/);
  assert.equal(JSON.stringify(funded), before, 'failed waits retain the caller-owned state');
  const firstMinute = until(funded, state => state.clock === 1, 'transient first minute');
  assert.equal(firstMinute.clock, 1);
  assert.equal(firstMinute.commands.at(-1).command.minutes, 1, 'arbitrary predicates never opt into boundary batching');
});

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



test('paid UC/CC commissioning batches only pre-due work and preserves the first native state', () => {
  let state = SOC.create({ experience: 'campaign', scenario: 'smb', seed: 73, difficulty: 'easy' });
  state = SOC.dispatch(state, { type: 'provider', command: { action: 'staff', engineers: 4, support: 4 } });
  state = startCustomer(state, 'starter-customer', 'starter', 'au-sydney');
  for (const id of ['recording', 'ms-workplace-calling', 'cisco-contact-centre']) {
    state = operation(state, id, 'starter-customer');
    state = operationComplete(state, id, 'starter-customer');
  }
  state = until(state, current => current.clock >= 60, 'actual settled service before boundary review');
  state = operationComplete(operation(state, 'service-boundary-review', 'starter-customer'), 'service-boundary-review', 'starter-customer');
  const nextBoundary = (Math.floor(state.clock / 60) + 1) * 60;
  state = until(state, current => current.clock === nextBoundary - 2, 'commissioning crosses an actual settlement');
  const eligibleBeforePurchase = state;
  state = operation(state, 'uc-cc-integration', 'starter-customer');
  const project = state.providerCampaign.projects.findLast(row => row.operationId === 'uc-cc-integration');
  const initial = JSON.stringify(state);
  assert.equal(project.status, 'running');
  assert.ok(project.dueAt > nextBoundary);
  const bounded = ucCcCommissioning(state, project.id, 'paid commissioning');
  const reference = minuteUntil(clone(state), current => current.providerCampaign.projects.find(row => row.id === project.id).status === 'commissioning', 'reference commissioning', 600);
  assert.equal(bounded.clock, project.dueAt, 'submission first occurs at the accepted due minute');
  assert.equal(bounded.clock, reference.clock);
  assert.deepEqual(comparableState(bounded), comparableState(reference), 'work, settlement, reservations, incidents and all other simulation state match');
  assert.equal(bounded.providerCampaign.projects.find(row => row.id === project.id).operationReceipt.test, null, 'waiting does not perform the explicit paid test');
  assert.ok(bounded.providerCampaign.periodHistory.some(row => row.settledAt === nextBoundary));
  assert.ok(bounded.commands.length < reference.commands.length);
  assert.deepEqual(SOC.restore(JSON.stringify(bounded)), bounded);
  assert.throws(() => ucCcCommissioning(state, project.id, 'capped commissioning', 1), /capped commissioning not reached/);
  assert.throws(() => ucCcCommissioning(state, 'missing-project', 'invalid project'), /exact paid UC\/CC project/);
  assert.equal(JSON.stringify(state), initial, 'successful and refused waits preserve their caller');
  const command = { type: 'advance', minutes: Math.min(safeAdvanceChunk(state), project.dueAt - state.clock) };
  assert.ok(command.minutes > 1);
  const vm = require('node:vm'); let reply;
  const worker = { postMessage: value => { reply = value; } };
  vm.createContext(worker); vm.runInContext(SOC.workerSource(), worker);
  worker.onmessage({ data: { id: 'commissioning-boundary', state: JSON.parse(initial), command } });
  assert.equal(reply.error, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(reply.state)), SOC.dispatch(state, command), 'native batched advance remains worker equivalent');

  let scheduled = until(eligibleBeforePurchase, current => current.providerCampaign.incidents.some(row => row.status === 'scheduled'), 'native follow-up incident scheduled', 600);
  const incident = scheduled.providerCampaign.incidents.find(row => row.status === 'scheduled');
  scheduled = operation(scheduled, 'uc-cc-integration', 'starter-customer');
  const interruptedProject = scheduled.providerCampaign.projects.findLast(row => row.operationId === 'uc-cc-integration');
  assert.ok(incident.dueAt < interruptedProject.dueAt, 'native incident must interrupt the accepted work interval');
  const interrupted = SOC.dispatch(scheduled, { type: 'advance', minutes: interruptedProject.dueAt - scheduled.clock });
  assert.equal(interrupted.clock, incident.dueAt);
  assert.ok(interrupted.clock < interruptedProject.dueAt);
  const withIncident = ucCcCommissioning(scheduled, interruptedProject.id, 'interrupted paid commissioning');
  const incidentReference = minuteUntil(clone(scheduled), current => current.providerCampaign.projects.find(row => row.id === interruptedProject.id).status === 'commissioning', 'interrupted reference', 600);
  assert.equal(withIncident.clock, incidentReference.clock);
  assert.deepEqual(comparableState(withIncident), comparableState(incidentReference), 'incident acknowledgement, paid repair, affected work and first commissioning minute match');
  assert.ok(withIncident.providerCampaign.projects.some(row => row.operationId === 'repair' && row.acceptedAt >= incident.dueAt && row.postingId));
  assert.deepEqual(SOC.restore(JSON.stringify(withIncident)), withIncident);
});
