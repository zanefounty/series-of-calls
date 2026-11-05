'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const SOC = require('../src/game/55-communications.js');
const FACTS = require('../src/game/23-provider-progression.js');
const RECEIPTS = require('../src/game/23-provider-progression-receipts.js');
const RESPONSIBILITY = require('../src/game/23-provider-responsibility.js');

const C3 = 'progress.goal.c3';
const clone = value => JSON.parse(JSON.stringify(value));
const hooks = {
  customerRoot: (state, portfolioId) => state.portfolio.customers.find(row => row.id === portfolioId)?.root || null,
  observeResource: (root, resourceId) => SOC.observe(root, resourceId)
};
const mspFor = (state, customerId) => RESPONSIBILITY.responsibilities(state, customerId, hooks).records.find(row => row.customerId === customerId && row.role === 'msp' && row.organisationId === 'orchard-msp') || null;

function buy(state, request) {
  const quote = SOC.provider.quote(state, request);
  assert.deepEqual(quote.blockers, [], `${request.operationId || request.stage}: ${quote.blockers.join(', ')}`);
  return SOC.dispatch(state, { type: 'provider', command: { ...request, quoteRevision: quote.atRevision } });
}

function advance(state) {
  for (const incident of state.providerCampaign.incidents.filter(row => row.status === 'active')) {
    state = SOC.dispatch(state, { type: 'provider', command: { action: 'acknowledge-incident', incidentId: incident.id } });
  }
  for (const incident of state.providerCampaign.incidents.filter(row => row.status === 'acknowledged')) {
    if (state.providerCampaign.projects.some(project => project.customerId === incident.customerId && ['repair', 'service-repair'].includes(project.operationId) && project.status !== 'cancelled' && project.acceptedAt >= incident.acknowledgedAt)) continue;
    const operationId = incident.resource === 'service' ? 'service-repair' : 'repair';
    const quote = SOC.provider.quote(state, { action: 'operation', operationId, customerId: incident.customerId });
    if (!quote.blockers.length) state = SOC.dispatch(state, { type: 'provider', command: { action: 'operation', operationId, customerId: incident.customerId, quoteRevision: quote.atRevision } });
  }
  for (const customer of state.providerCampaign.customers.filter(row => row.status === 'renewal')) {
    state = SOC.dispatch(state, { type: 'provider', command: { action: 'renew', customerId: customer.id } });
  }
  return SOC.dispatch(state, { type: 'advance', minutes: 1 });
}

function until(state, predicate, label, limit = 420) {
  for (let i = 0; i < limit && !predicate(state); i++) state = advance(state);
  assert.ok(predicate(state), `${label} not reached at minute ${state.clock}`);
  return state;
}

function startCustomer(state, customerId, offerId, market) {
  state = buy(state, { action: 'purchase', offerId, planId: 'swift', stage: 'base', market });
  state = until(state, s => s.providerCampaign.customers.find(row => row.id === customerId)?.stages.base?.status === 'effective', `${customerId} base`);
  for (const stage of ['carrier', 'partner']) {
    state = buy(state, { action: 'purchase', offerId, planId: 'swift', stage, customerId });
    state = until(state, s => s.providerCampaign.customers.find(row => row.id === customerId)?.stages[stage]?.status === 'effective', `${customerId} ${stage}`);
  }
  return state;
}

function operation(state, operationId, customerId, config) {
  let quote = SOC.provider.quote(state, { action: 'operation', operationId, customerId, ...(config ? { config } : {}) });
  for (let i = 0; quote.blockers.length && i < 120; i++) {
    if (!quote.blockers.every(reason => ['ENGINEER_CAPACITY', 'SUPPORT_CAPACITY', 'INSUFFICIENT_CASH'].includes(reason))) throw new Error(`${operationId} non-retry blocker: ${quote.blockers.join(', ')} customer=${JSON.stringify(state.providerCampaign.customers.find(row => row.id === customerId))} facts=${JSON.stringify(SOC.provider.inspect(state).progression?.facts)}`);
    state = advance(state);
    quote = SOC.provider.quote(state, { action: 'operation', operationId, customerId, ...(config ? { config } : {}) });
  }
  if (quote.blockers.length) throw new Error(`${operationId} blocked by ${quote.blockers.join(', ')}; customer=${JSON.stringify(state.providerCampaign.customers.find(row => row.id === customerId))}; responsibility=${JSON.stringify(SOC.provider.inspect(state).progression?.facts?.supportResponsibility)}; stages=${JSON.stringify(state.providerCampaign.projects.filter(project => project.customerId === customerId).map(project => [project.kind,project.stage,project.operationId,project.status,project.acceptedAt,project.completedAt]))}`);
  return SOC.dispatch(state, { type: 'provider', command: { action: 'operation', operationId, customerId, ...(config ? { config } : {}), quoteRevision: quote.atRevision } });
}

function operationComplete(state, operationId, customerId) {
  return until(state, s => s.providerCampaign.projects.some(project => project.customerId === customerId && project.operationId === operationId && project.status === 'complete'), `${customerId} ${operationId}`);
}

function supportConfig(market) {
  return { market, personId: `support-${market}-01`, coverageId: 'extended' };
}

function stableSupportWindowShape(state, customerIds) {
  const observation = state.providerCampaign.supportObservation;
  const samples = observation?.samples;
  if (!Array.isArray(samples) || samples.length !== 60) return false;
  const cohort = [...customerIds].sort();
  const first = samples[0];
  const from = first.at - 1;
  const to = samples.at(-1).at;
  if (JSON.stringify(first.cohort) !== JSON.stringify(cohort)) return false;
  const initial = new Map(first.participants.map(row => [row.customerId, row]));
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
    if (index && sample.at !== samples[index - 1].at + 1) return false;
    if (JSON.stringify(sample.cohort) !== JSON.stringify(cohort)) return false;
    for (const row of sample.participants) {
      const prior = initial.get(row.customerId);
      if (!prior || row.eligible !== true || !row.responsibility || !row.boundaries?.length ||
          row.configurationIndex !== prior.configurationIndex ||
          JSON.stringify(row.resources) !== JSON.stringify(prior.resources) ||
          JSON.stringify(row.boundaries) !== JSON.stringify(prior.boundaries) ||
          JSON.stringify(row.integrations ?? null) !== JSON.stringify(prior.integrations ?? null) ||
          row.namedSupport?.projectId !== prior.namedSupport?.projectId) return false;
    }
  }
  for (const customerId of cohort) {
    const participantRows = samples.flatMap(sample => sample.participants.filter(row => row.customerId === customerId));
    if (!participantRows.some(row => (row.settlements || []).some(item => item.settledAt >= from && item.settledAt <= to && item.revenuePostingId))) return false;
    if (!participantRows.some(row => (row.freshJobs || []).some(job => job.startedAt >= from && job.finishedAt <= to && job.finishedAt >= job.startedAt && job.jobId && job.interactionId && job.caseId && job.person && job.assignmentId))) return false;
  }
  return true;
}

function createThreeMarketWindow() {
  let state = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  const starter = 'starter-customer';
  state = startCustomer(state, starter, 'starter', 'au-sydney');
  state = operation(state, 'bpo', starter);
  state = operationComplete(state, 'bpo', starter);
  state = until(state, s => !!mspFor(s, starter), 'starter MSP responsibility', 120);
  const boundaryQuote = SOC.provider.quote(state, { action: 'operation', operationId: 'service-boundary-review', customerId: starter });
  if (boundaryQuote.blockers.length) {
    const child = state.portfolio.customers.find(row => row.id === starter).root;
    throw new Error(`boundary diagnostic ${JSON.stringify({clock:state.clock,commercialResponsibilityVersion:state.providerCampaign.commercialResponsibilityVersion,responsibility:mspFor(state,starter),resources:Object.fromEntries(['identity','phone','engage'].map(id=>[id,{generation:child.resources[id]?.generation,provisioning:child.resources[id]?.provisioning,effective:child.resources[id]?.effective,observed:SOC.observe(child,id)}])),blockers:boundaryQuote.blockers})}`);
  }
  state = operation(state, 'service-boundary-review', starter);
  state = operationComplete(state, 'service-boundary-review', starter);
  state = operation(state, 'provider-support-coverage', starter, supportConfig('au-sydney'));
  state = operationComplete(state, 'provider-support-coverage', starter);
  state = until(state, s => s.providerCampaign.mission.nextOpportunityAvailable, 'first qualifying period', 180);

  const second = 'next-1-customer';
  state = startCustomer(state, second, 'next-1', 'us-seattle');
  state = operation(state, 'bpo', second);
  state = operationComplete(state, 'bpo', second);
  state = until(state, s => !!mspFor(s, second), 'second MSP responsibility', 120);
  state = operation(state, 'service-boundary-review', second);
  state = operationComplete(state, 'service-boundary-review', second);
  if (state.business.workforce.support < 2) state = SOC.dispatch(state, { type: 'provider', command: { action: 'staff', engineers: state.business.workforce.engineers, support: 2 } });
  state = operation(state, 'provider-support-coverage', second, supportConfig('us-seattle'));
  state = operationComplete(state, 'provider-support-coverage', second);
  state = until(state, s => s.providerCampaign.mission.nextOpportunityAvailable || s.providerCampaign.status === 'won', 'second customer qualifying period', 180);
  if (state.providerCampaign.status === 'won') state = SOC.dispatch(state, { type: 'provider', command: { action: 'continue-career' } });
  if (!state.providerCampaign.mission.nextOpportunityAvailable) state = until(state, s => s.providerCampaign.mission.nextOpportunityAvailable, 'continued career opportunity', 120);

  const third = 'next-2-customer';
  state = startCustomer(state, third, 'next-2', 'eu-dublin');
  state = operation(state, 'bpo', third);
  state = operationComplete(state, 'bpo', third);
  state = until(state, s => !!mspFor(s, third), 'third MSP responsibility', 120);
  state = operation(state, 'service-boundary-review', third);
  state = operationComplete(state, 'service-boundary-review', third);
  if (state.business.workforce.support < 3) state = SOC.dispatch(state, { type: 'provider', command: { action: 'staff', engineers: state.business.workforce.engineers, support: 3 } });
  state = operation(state, 'provider-support-coverage', third, supportConfig('eu-dublin'));
  state = operationComplete(state, 'provider-support-coverage', third);
  state = until(state, s => stableSupportWindowShape(s, [starter, second, third]), 'stable three-region support sample window', 300);
  return state;
}

function claim(state) {
  return SOC.dispatch(state, { type: 'provider', command: { action: 'claim-progression', sourceId: C3, quoteRevision: state.revision } });
}

function rehash(receipt) {
  const unsigned = { ...receipt };
  delete unsigned.integrity;
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(unsigned)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  receipt.integrity = (hash >>> 0).toString(16).padStart(8, '0');
}

test('AC-SOC-640 public dispatch earns C3 from three paid markets and rejects rehashed market or support forgery', () => {
  let state = createThreeMarketWindow();
  const ready = SOC.provider.inspect(state).progression.goals[C3];
  assert.equal(ready.status, 'ready', JSON.stringify(ready.missing));
  assert.deepEqual(ready.evidence.markets, ['au-sydney', 'eu-dublin', 'us-seattle']);
  assert.equal(ready.evidence.customerIds.length, 3);
  const cash = state.business.balance.cash;
  state = claim(state);
  const receipt = state.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3);
  assert.ok(receipt);
  assert.deepEqual(receipt.unlock.allowedMarkets, ['au-sydney', 'eu-dublin', 'us-seattle']);
  assert.equal(receipt.unlock.operationId, 'regional-provisioning');
  assert.equal(state.business.balance.cash, cash, 'earning the evidence receipt does not award or spend cash');
  assert.equal(SOC.restore(JSON.stringify(state)).providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3).sourceId, C3);

  const badMarkets = clone(state);
  const badMarketReceipt = badMarkets.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3);
  badMarketReceipt.sourceEvidence.markets = ['au-sydney', 'au-melbourne', 'us-seattle'];
  badMarketReceipt.unlock.allowedMarkets = [...badMarketReceipt.sourceEvidence.markets];
  rehash(badMarketReceipt);
  assert.throws(() => SOC.restore(JSON.stringify(badMarkets)), /INVALID_PROVIDER_PROGRESSION_RECEIPT/);

  const badSupport = clone(state);
  const badSupportReceipt = badSupport.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3);
  const samples = FACTS.decodeSupportObservation(badSupportReceipt.sourceEvidence.supportSamples);
  samples[20].participants.find(row => row.market === 'us-seattle').namedSupport.market = 'au-sydney';
  badSupportReceipt.sourceEvidence.supportSamples = FACTS.encodeSupportObservation(samples);
  rehash(badSupportReceipt);
  assert.throws(() => SOC.restore(JSON.stringify(badSupport)), /INVALID_PROVIDER_PROGRESSION_RECEIPT/);

  const duplicate = claim(state);
  assert.equal(duplicate.providerCampaign.progressionReceipts.receipts.filter(row => row.sourceId === C3).length, 1);
  assert.equal(duplicate.business.balance.cash, cash, 'repeated claims remain idempotent');
});
