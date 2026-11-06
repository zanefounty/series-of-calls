'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const SOC = require('../src/game/55-communications.js');
const FACTS = require('../src/game/23-provider-progression.js');
const WORKFORCE = require('../src/game/23-provider-workforce-history.js');

const CUSTOMER = 'next-1-customer';
const clone = value => JSON.parse(JSON.stringify(value));
const rows = state => FACTS.decodeSupportObservation(state.providerCampaign.supportObservation);
let cachedFixture;

function buy(state, request) {
  const quote = SOC.provider.quote(state, request);
  assert.deepEqual(quote.blockers, [], `${request.operationId || request.stage}: ${quote.blockers.join(',')}`);
  return SOC.dispatch(state, { type: 'provider', command: { ...request, quoteRevision: quote.atRevision } });
}

function operation(state, operationId, customerId) {
  return buy(state, { action: 'operation', operationId, customerId });
}

function project(state, operationId, customerId) {
  return state.providerCampaign.projects.findLast(p => p.customerId === customerId && p.operationId === operationId && p.status !== 'cancelled');
}

function advance(state) {
  for (const incident of state.providerCampaign.incidents.filter(item => item.status === 'active')) {
    state = SOC.dispatch(state, { type: 'provider', command: { action: 'acknowledge-incident', incidentId: incident.id } });
  }
  for (const incident of state.providerCampaign.incidents.filter(item => item.status === 'acknowledged')) {
    if (state.providerCampaign.projects.some(p => p.customerId === incident.customerId && ['repair', 'service-repair'].includes(p.operationId) && p.status !== 'cancelled' && p.acceptedAt >= incident.acknowledgedAt)) continue;
    const operationId = incident.resource === 'service' ? 'service-repair' : 'repair';
    const quote = SOC.provider.quote(state, { action: 'operation', operationId, customerId: incident.customerId });
    if (!quote.blockers.length) state = SOC.dispatch(state, { type: 'provider', command: { action: 'operation', operationId, customerId: incident.customerId, quoteRevision: quote.atRevision } });
  }
  for (const customer of state.providerCampaign.customers.filter(c => c.status === 'renewal')) {
    state = SOC.dispatch(state, { type: 'provider', command: { action: 'renew', customerId: customer.id } });
  }
  try {
    return SOC.dispatch(state, { type: 'advance', minutes: 1 });
  } catch (error) {
    throw new Error(`advance from minute ${state.clock} failed: ${error.message}`, { cause: error });
  }
}

function until(state, predicate, limit = 420) {
  for (let i = 0; i < limit && !predicate(state); i++) state = advance(state);
  assert.ok(predicate(state), `condition not reached at ${state.clock}`);
  return state;
}

function startCustomer(state, customerId, offerId, market) {
  state = buy(state, { action: 'purchase', offerId, planId: 'swift', stage: 'base', market });
  state = until(state, s => s.providerCampaign.customers.find(c => c.id === customerId)?.stages.base?.status === 'effective');
  for (const stage of ['carrier', 'partner']) {
    state = buy(state, { action: 'purchase', offerId, planId: 'swift', stage, customerId });
    state = until(state, s => s.providerCampaign.customers.find(c => c.id === customerId)?.stages[stage]?.status === 'effective');
  }
  return until(state, s => s.providerCampaign.customers.find(c => c.id === customerId)?.status === 'active');
}

function completeOperation(state, operationId, customerId) {
  let quote = SOC.provider.quote(state, { action: 'operation', operationId, customerId });
  for (let retry = 0; quote.blockers.length && retry < 60; retry++) {
    assert.ok(quote.blockers.every(reason => ['ENGINEER_CAPACITY', 'SUPPORT_CAPACITY'].includes(reason)), `${operationId}: ${quote.blockers.join(',')}`);
    state = advance(state);
    quote = SOC.provider.quote(state, { action: 'operation', operationId, customerId });
  }
  assert.deepEqual(quote.blockers, [], `${operationId}: ${quote.blockers.join(',')}`);
  state = SOC.dispatch(state, { type: 'provider', command: { action: 'operation', operationId, customerId, quoteRevision: quote.atRevision } });
  return until(state, s => project(s, operationId, customerId)?.status === 'complete');
}

function fixture() {
  if (cachedFixture) return clone(cachedFixture);
  let state = SOC.create({ experience: 'campaign', scenario: 'smb', market: 'au-sydney', seed: 73, difficulty: 'easy' });
  state = startCustomer(state, 'starter-customer', 'starter', 'au-sydney');
  state = completeOperation(state, 'bpo', 'starter-customer');
  state = until(state, s => SOC.provider.inspect(s).progression.facts.supportResponsibility.status === 'ready', 120);
  state = completeOperation(state, 'service-boundary-review', 'starter-customer');
  state = until(state, s => s.providerCampaign.mission.nextOpportunityAvailable, 180);
  state = startCustomer(state, CUSTOMER, 'next-1', 'au-melbourne');
  state = completeOperation(state, 'service-boundary-review', CUSTOMER);
  state = until(state, s => s.providerCampaign.incidents.some(i => i.customerId === CUSTOMER && i.resource === 'carrier' && i.activatedAt !== null), 180);
  state = until(state, s => s.providerCampaign.incidents.some(i => i.customerId === CUSTOMER && i.resource === 'carrier' && i.resolvedAt !== null), 40);
  state = until(state, s => s.clock >= 252, 100);
  cachedFixture = clone(state);
  return state;
}

function customerSampleAt(state, at) {
  return rows(state).find(row => row.at === at)?.participants.find(participant => participant.customerId === CUSTOMER);
}

function restoreError(state) {
  try {
    SOC.restore(JSON.stringify(state));
    return null;
  } catch (error) {
    return error;
  }
}

test('public restore rejects a copied-good support snapshot at a paid carrier outage minute', () => {
  const state = fixture();
  const incident = state.providerCampaign.incidents.find(i => i.customerId === CUSTOMER && i.resource === 'carrier' && i.activatedAt !== null);
  assert.ok(incident?.resolvedAt, 'the fixture includes a paid carrier repair');
  const sampleRows = rows(state);
  assert.equal(sampleRows.length, 60);
  const goodRow = sampleRows.find(row => row.at < incident.activatedAt && row.participants.find(p => p.customerId === CUSTOMER)?.eligible === true && row.participants.find(p => p.customerId === CUSTOMER)?.boundaries?.length);
  assert.ok(goodRow, 'the customer had a genuinely supported pre-outage minute');
  const bad = customerSampleAt(state, incident.activatedAt);
  assert.ok(bad, 'the actual outage activation minute is retained');
  assert.equal(bad.eligible, false);
  assert.ok(bad.missing.includes('resource-not-current:carrier'));
  assert.equal(restoreError(state), null, 'the unmodified dispatch-produced save restores');

  const forged = clone(state);
  const forgedRows = rows(forged);
  const good = forgedRows.find(row => row.at === goodRow.at).participants.find(p => p.customerId === CUSTOMER);
  const outage = forgedRows.find(row => row.at === incident.activatedAt).participants.find(p => p.customerId === CUSTOMER);
  for (const key of ['eligible', 'missing', 'boundaries', 'configuration', 'resources', 'responsibility', 'namedSupport']) outage[key] = clone(good[key]);
  // Make the forged snapshot internally consistent with the real payroll
  // timeline too. This rules out rejecting it only because the copied good
  // row carried a different minute's staffing counters.
  const teamAtMinute = WORKFORCE.at(forged.providerCampaign.workforceHistory, incident.activatedAt);
  const billingMinute = Math.max(forged.providerCampaign.workforceHistory.startedAt, Math.floor(incident.activatedAt / 60) * 60);
  const billedAtMinute = WORKFORCE.at(forged.providerCampaign.workforceHistory, billingMinute).personMinutes;
  outage.responsibility.sharedWorkforce = {
    ...outage.responsibility.sharedWorkforce,
    engineers: teamAtMinute.engineers,
    support: teamAtMinute.support,
    personMinutes: teamAtMinute.personMinutes,
    billedMinutes: billedAtMinute
  };
  forged.providerCampaign.supportObservation = FACTS.encodeSupportObservation(forgedRows);

  const error = restoreError(forged);
  assert.ok(error, 'restore must reconstruct the outage-minute service state instead of trusting the copied snapshot fields');
  assert.match(error.message, /INVALID_PROVIDER_SUPPORT_OBSERVATION|INVALID_PROVIDER_SUPPORT_HISTORY/);
  assert.equal(JSON.stringify(state), JSON.stringify(cachedFixture), 'forging a clone never mutates the original paid history');
});

test('same-clock staff changes do not rewrite the support sample already taken at that minute', () => {
  const state = fixture();
  const clock = state.clock;
  const observationBefore = state.providerCampaign.supportObservation;
  const lastBefore = clone(rows(state).at(-1));
  assert.equal(lastBefore.at, clock);
  const team = state.business.workforce;
  const nextSupport = team.support > 0 ? team.support - 1 : team.support + 1;
  const quote = SOC.provider.quote(state, { action: 'staff', engineers: team.engineers, support: nextSupport });
  assert.deepEqual(quote.blockers, []);
  const resized = SOC.dispatch(state, { type: 'provider', command: { action: 'staff', engineers: team.engineers, support: nextSupport } });

  assert.equal(resized.clock, clock, 'a staffing command does not advance simulation time');
  assert.equal(JSON.stringify(resized.providerCampaign.supportObservation), JSON.stringify(observationBefore), 'the command cannot alter the sample taken at the same clock value');
  assert.deepEqual(rows(resized).at(-1), lastBefore);
  assert.deepEqual(SOC.restore(JSON.stringify(resized)), resized, 'sample-before-command ordering is a valid save boundary');
});

