'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const SOC = require('../src/game/55-communications.js');
const FACTS = require('../src/game/23-provider-progression.js');
const RECEIPTS = require('../src/game/23-provider-progression-receipts.js');
const RESPONSIBILITY = require('../src/game/23-provider-responsibility.js');
const REGIONAL = require('../src/game/23-provider-regional-support.js');
const POLICY = require('../src/game/23-provider-policy.js');
const UC_CC = require('../src/game/23-provider-uc-cc-integration.js');

const C3 = 'progress.goal.c3';
const C5 = 'progress.goal.c5';
const L7 = RECEIPTS.REGIONAL_L7;
const clone = value => JSON.parse(JSON.stringify(value));
const hooks = {
  customerRoot: (state, portfolioId) => state.portfolio.customers.find(row => row.id === portfolioId)?.root || null,
  observeResource: (root, resourceId) => SOC.observe(root, resourceId)
};
const mspFor = (state, customerId) => RESPONSIBILITY.responsibilities(state, customerId, hooks).records.find(row => row.customerId === customerId && row.role === 'msp' && row.organisationId === 'orchard-msp') || null;
let threeMarketWindow = null;
let fiveMarketWindow = null;

function checkpoint(label, state, detail = {}) {
  const prefix = process.env.SOC_REGIONAL_CLAIM_CHECKPOINT_PREFIX;
  if (!prefix) return;
  const safe = String(label).replace(/[^a-z0-9-]/gi, '-');
  const target = `${prefix}-${safe}-clock-${state.clock}.json`;
  const temporary = `${target}.tmp`;
  const contents = JSON.stringify(state);
  fs.writeFileSync(temporary, contents);
  fs.renameSync(temporary, target);
  const metadata = {
    label: safe,
    clock: state.clock,
    campaignStatus: state.providerCampaign?.status ?? null,
    sourceHash: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
    stateHash: crypto.createHash('sha256').update(contents).digest('hex'),
    ...detail
  };
  fs.writeFileSync(`${target}.meta.json.tmp`, JSON.stringify(metadata, null, 2));
  fs.renameSync(`${target}.meta.json.tmp`, `${target}.meta.json`);
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

function buy(state, request) {
  const quote = SOC.provider.quote(state, request);
  assert.deepEqual(quote.blockers, [], `${request.operationId || request.stage}: ${quote.blockers.join(', ')}`);
  return SOC.dispatch(state, { type: 'provider', command: { ...request, quoteRevision: quote.atRevision } });
}

function dispatchWithCheckpoint(state, command, label) {
  const before = process.env.SOC_REGIONAL_CLAIM_CHECKPOINT_PREFIX ? clone(state) : state;
  try {
    return SOC.dispatch(state, command);
  } catch (error) {
    checkpoint(`prefailure-${label}`, before, { command, error: String(error?.message || error) });
    throw error;
  }
}

function advance(state) {
  if (state.providerCampaign.status === 'won') {
    state = dispatchWithCheckpoint(state, { type: 'provider', command: { action: 'continue-career' } }, 'continue-career');
  }
  for (const incident of state.providerCampaign.incidents.filter(row => row.status === 'active')) {
    state = dispatchWithCheckpoint(state, { type: 'provider', command: { action: 'acknowledge-incident', incidentId: incident.id } }, 'acknowledge-incident');
  }
  for (const incident of state.providerCampaign.incidents.filter(row => row.status === 'acknowledged')) {
    if (state.providerCampaign.projects.some(project => project.customerId === incident.customerId && ['repair', 'service-repair'].includes(project.operationId) && project.status !== 'cancelled' && project.acceptedAt >= incident.acknowledgedAt)) continue;
    const operationId = incident.resource === 'service' ? 'service-repair' : 'repair';
    const quote = SOC.provider.quote(state, { action: 'operation', operationId, customerId: incident.customerId });
    if (!quote.blockers.length) state = dispatchWithCheckpoint(state, { type: 'provider', command: { action: 'operation', operationId, customerId: incident.customerId, quoteRevision: quote.atRevision } }, 'incident-repair');
  }
  for (const customer of state.providerCampaign.customers.filter(row => row.status === 'renewal')) {
    state = dispatchWithCheckpoint(state, { type: 'provider', command: { action: 'renew', customerId: customer.id } }, 'renew');
  }
  return dispatchWithCheckpoint(state, { type: 'advance', minutes: 1 }, 'advance');
}

function until(state, predicate, label, limit = 420) {
  for (let i = 0; i < limit && !predicate(state); i++) state = advance(state);
  const reached = predicate(state);
  if (!reached) checkpoint('condition-not-reached', state, { condition: label });
  assert.ok(reached, `${label} not reached at minute ${state.clock}`);
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
  if (threeMarketWindow) return clone(threeMarketWindow);
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
  threeMarketWindow = clone(state);
  return state;
}

function claim(state) {
  return SOC.dispatch(state, { type: 'provider', command: { action: 'claim-progression', sourceId: C3, quoteRevision: state.revision } });
}

function claimSource(state, sourceId) {
  return SOC.dispatch(state, { type: 'provider', command: { action: 'claim-progression', sourceId, quoteRevision: state.revision } });
}

function paidPurchaseWhenReady(state, request, label, limit = 180) {
  let quote = SOC.provider.quote(state, request);
  for (let minute = 0; quote.blockers.length && minute < limit; minute++) {
    if (!quote.blockers.every(reason => ['ENGINEER_CAPACITY', 'SUPPORT_CAPACITY', 'INSUFFICIENT_CASH'].includes(reason))) {
      throw new Error(`${label} non-retry blocker: ${quote.blockers.join(', ')} at ${state.clock}`);
    }
    state = advance(state);
    quote = SOC.provider.quote(state, request);
  }
  assert.deepEqual(quote.blockers, [], `${label}: ${quote.blockers.join(', ')} at ${state.clock}`);
  return SOC.dispatch(state, { type: 'provider', command: { ...request, quoteRevision: quote.atRevision } });
}

function addRegionalCustomer(state, customerId, offerId, market) {
  state = until(state, s => s.providerCampaign.mission.nextOpportunityAvailable, `${customerId} opportunity`, 180);
  state = paidPurchaseWhenReady(state, { action: 'purchase', offerId, planId: 'swift', stage: 'base', market }, `${customerId} base`);
  state = until(state, s => s.providerCampaign.customers.find(row => row.id === customerId)?.stages.base?.status === 'effective', `${customerId} base`, 120);
  for (const stage of ['carrier', 'partner']) {
    state = paidPurchaseWhenReady(state, { action: 'purchase', offerId, planId: 'swift', stage, customerId }, `${customerId} ${stage}`);
    state = until(state, s => s.providerCampaign.customers.find(row => row.id === customerId)?.stages[stage]?.status === 'effective', `${customerId} ${stage}`, 120);
  }
  if (state.business.workforce.support < 5) state = SOC.dispatch(state, { type: 'provider', command: { action: 'staff', engineers: state.business.workforce.engineers, support: 5 } });
  state = operation(state, 'bpo', customerId);
  state = operationComplete(state, 'bpo', customerId);
  state = until(state, s => !!mspFor(s, customerId), `${customerId} MSP responsibility`, 120);
  state = operation(state, 'service-boundary-review', customerId);
  state = operationComplete(state, 'service-boundary-review', customerId);
  const personId = Object.keys(REGIONAL.PEOPLE).find(id => REGIONAL.PEOPLE[id].market === market);
  state = operation(state, 'provider-support-coverage', customerId, { market, personId, coverageId: 'extended' });
  return operationComplete(state, 'provider-support-coverage', customerId);
}

function createFiveMarketWindow() {
  if (fiveMarketWindow) return clone(fiveMarketWindow);
  let state = createThreeMarketWindow();
  state = claimSource(state, C3);
  state = addRegionalCustomer(state, 'next-3-customer', 'next-3', 'au-melbourne');
  state = addRegionalCustomer(state, 'next-4-customer', 'next-4', 'jp-tokyo');
  const customerIds = state.providerCampaign.customers.map(row => row.id).sort();
  state = until(state, s => stableSupportWindowShape(s, customerIds), 'stable five-market support sample window', 180);
  fiveMarketWindow = clone(state);
  return state;
}

function addDistributorResponsibility(state, customerId) {
  for (const operationId of ['room', 'partner-qualification', 'distributor-room']) {
    state = operation(state, operationId, customerId);
    state = operationComplete(state, operationId, customerId);
  }
  const record = RESPONSIBILITY.responsibilities(state, customerId, hooks).records.find(row => row.customerId === customerId && row.role === 'distributor' && row.organisationId === 'branch-distribution');
  assert.ok(record, `${customerId} has a live paid distributor responsibility`);
  return state;
}

function stableDistributorSupportWindow(state, customerIds) {
  if (!stableSupportWindowShape(state, customerIds)) return false;
  const samples = FACTS.decodeSupportObservation(state.providerCampaign.supportObservation);
  const team = state.business.workforce;
  if (samples.at(-1)?.at !== state.clock) return false;
  for (const sample of samples) for (const participant of sample.participants) {
    const workforce = participant.responsibility?.sharedWorkforce;
    if (participant.namedSupport?.paidSupportSlots !== team.support || workforce?.support !== team.support || workforce?.engineers !== team.engineers) return false;
    if (!REGIONAL.validateNamedSupportSnapshot(state, participant, sample.at) || !REGIONAL.validateDistributorSnapshot(state, participant, sample.at)) return false;
  }
  // The cheap window checks avoid a full progression inspection until all
  // sixty minutes have actual distributor scope and the current paid team.
  // The public evaluator also checks today's configuration against that window.
  return SOC.provider.inspect(state).progression.levels[L7].status === 'ready';
}

function createLevelSevenWindow() {
  let state = createFiveMarketWindow();
  state = claimSource(state, C5);
  checkpoint('l7-earned-c5-window', state, { sourceId: C5, customerIds: state.providerCampaign.progressionReceipts?.receipts?.find(row => row.sourceId === C5)?.sourceEvidence?.customerIds || [] });
  if (state.business.workforce.support < 6) state = SOC.dispatch(state, { type: 'provider', command: { action: 'staff', engineers: state.business.workforce.engineers, support: 6 } });
  const customerIds = state.providerCampaign.customers.map(row => row.id).sort();
  for (const customerId of customerIds) state = addDistributorResponsibility(state, customerId);
  if (state.business.workforce.support > 5) state = SOC.dispatch(state, { type: 'provider', command: { action: 'staff', engineers: state.business.workforce.engineers, support: 5 } });
  state = until(state, s => stableDistributorSupportWindow(s, customerIds), 'stable five-market distributor support sample window', 180);
  return state;
}

const T2 = RECEIPTS.REGIONAL_T2;
const UC_CC_SOURCE = 'd-ms-workplace-calling';
const UC_CC_TARGET = 'd-cisco-contact-centre';

function ccChild(state, customerId) {
  return state.portfolio.customers.find(row => row.id === customerId)?.root || null;
}

function ccHasFullWork(state, customerId, after) {
  const child = ccChild(state, customerId);
  return state.providerCampaign.jobs.some(job => job.customerId === customerId && job.channel === 'voice' &&
    ['completed', 'late'].includes(job.status) && job.arrivalAt >= after &&
    child?.interactions.some(interaction => interaction.id === job.interactionId && interaction.phase === 'resolved' &&
      interaction.obligations.length === 0 && interaction.context &&
      [[UC_CC_SOURCE, 'telephony'], [UC_CC_TARGET, 'quality-review']].every(([deploymentId, feature]) =>
        interaction.trace.some(trace => trace.code === 'PRODUCT_FEATURE_ACCEPTED' &&
          trace.bindings?.some(binding => binding.deploymentId === deploymentId && binding.feature === feature)))) &&
    child?.records.some(record => record.interaction === job.interactionId && record.kind === 'recording' &&
      (record.captureScope ?? 'complete') === 'complete' && !record.deleted));
}

function installTestedUcCcPair(state, customerId) {
  for (const operationId of ['recording', 'ms-workplace-calling', 'cisco-contact-centre']) {
    state = operation(state, operationId, customerId);
    state = operationComplete(state, operationId, customerId);
  }
  state = operation(state, 'service-boundary-review', customerId);
  state = operationComplete(state, 'service-boundary-review', customerId);
  state = operation(state, 'uc-cc-integration', customerId);
  const integration = state.providerCampaign.projects.findLast(row => row.customerId === customerId && row.operationId === 'uc-cc-integration');
  const integrationId = integration.id;
  state = until(state, current => current.providerCampaign.projects.find(row => row.id === integrationId)?.status === 'commissioning', `${customerId} integration commissioning`, 600);
  const testedAt = state.clock;
  state = SOC.dispatch(state, { type: 'provider', command: { action: 'test-service-integration', projectId: integrationId, quoteRevision: state.revision } });
  state = until(state, current => ccHasFullWork(current, customerId, testedAt), `${customerId} tested voice and capture`, 600);
  state = operation(state, 'quality', customerId);
  state = operationComplete(state, 'quality', customerId);
  state = until(state, current => current.providerCampaign.projects.find(row => row.id === integrationId)?.status === 'complete', `${customerId} paid reviewed integration`, 600);
  const project = state.providerCampaign.projects.find(row => row.id === integrationId);
  assert.ok(project.postingId && state.business.ledger.some(row => row.id === project.postingId && row.projectId === project.id && row.cents === project.setupCents), `${customerId} integration has its paid posting`);
  assert.ok(UC_CC.OPERATION_IDS.includes(project.operationId));
  assert.ok(integration);
  return state;
}

function assuranceMinute(state) {
  if (state.providerCampaign.status === 'won') state = SOC.dispatch(state, { type: 'provider', command: { action: 'continue-career' } });
  for (const customer of state.providerCampaign.customers.filter(row => row.status === 'renewal')) {
    state = SOC.dispatch(state, { type: 'provider', command: { action: 'renew', customerId: customer.id } });
  }
  return SOC.dispatch(state, { type: 'advance', minutes: 1 });
}

function rehash(receipt) {
  const unsigned = { ...receipt };
  delete unsigned.integrity;
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(unsigned)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  receipt.integrity = (hash >>> 0).toString(16).padStart(8, '0');
}

test('AC-SOC-653 public dispatch earns C3 from three paid markets and rejects rehashed market or support forgery', () => {
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
  if (process.env.SOC_C3_EARNED_STATE) fs.writeFileSync(process.env.SOC_C3_EARNED_STATE, JSON.stringify(state));

  const badMarkets = clone(state);
  const badMarketReceipt = badMarkets.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3);
  badMarketReceipt.sourceEvidence.markets = ['au-sydney', 'au-melbourne', 'us-seattle'];
  badMarketReceipt.unlock.allowedMarkets = [...badMarketReceipt.sourceEvidence.markets];
  rehash(badMarketReceipt);
  assert.throws(() => SOC.restore(JSON.stringify(badMarkets)), /INVALID_PROVIDER_PROGRESSION_RECEIPT/);

  const badSupport = clone(state);
  const badSupportReceipt = badSupport.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3);
  const samples = FACTS.decodeSupportObservation(badSupportReceipt.sourceEvidence.samples);
  const usParticipant = samples[20].participants.find(row => row.customerId === 'next-1-customer');
  assert.ok(usParticipant?.namedSupport);
  usParticipant.namedSupport.market = 'au-sydney';
  badSupportReceipt.sourceEvidence.samples = FACTS.encodeSupportObservation(samples);
  rehash(badSupportReceipt);
  assert.throws(() => SOC.restore(JSON.stringify(badSupport)), /INVALID_PROVIDER_PROGRESSION_RECEIPT/);

  const duplicate = claim(state);
  assert.equal(duplicate.providerCampaign.progressionReceipts.receipts.filter(row => row.sourceId === C3).length, 1);
  assert.equal(duplicate.business.balance.cash, cash, 'repeated claims remain idempotent');

  const anchor = 'next-1-customer';
  const followRequest = { action: 'operation', operationId: 'regional-provisioning', customerId: anchor };
  const followQuote = SOC.provider.quote(state, followRequest);
  assert.deepEqual(followQuote.blockers, []);
  assert.deepEqual([followQuote.setupCents, followQuote.periodCents, followQuote.workMinutes, followQuote.engineers, followQuote.support], [15000, 8000, 4, 0, 1]);
  const cashBeforeFollowOn = state.business.balance.cash;
  state = SOC.dispatch(state, { type: 'provider', command: { ...followRequest, quoteRevision: followQuote.atRevision } });
  const followProject = state.providerCampaign.projects.findLast(row => row.customerId === anchor && row.operationId === 'regional-provisioning');
  state = operationComplete(state, 'regional-provisioning', anchor);
  const paidFollowProject = state.providerCampaign.projects.find(row => row.id === followProject.id);
  assert.equal(paidFollowProject.status, 'complete');
  assert.equal(state.business.balance.cash, cashBeforeFollowOn - paidFollowProject.setupCents);
  assert.ok(state.business.ledger.some(row => row.id === paidFollowProject.postingId && row.customerId === anchor && row.projectId === paidFollowProject.id && row.cents === paidFollowProject.setupCents));
  assert.equal(paidFollowProject.operationReceipt.sourceId, C3);
  assert.equal(paidFollowProject.operationReceipt.receiptId, receipt.id);
  const policy = state.providerAutomation.find(row => row.projectId === paidFollowProject.id);
  assert.ok(policy);
  assert.equal(policy.status, 'suspended', 'the paid recipe is not enabled by purchase');
  assert.equal(policy.config.lifetimeBudgetCents, 0);
  assert.deepEqual(policy.config.customerIds, [anchor]);

  const newCustomer = 'next-3-customer';
  const baseRequest = { action: 'purchase', offerId: 'next-3', planId: 'swift', stage: 'base', market: 'au-sydney' };
  const baseQuote = SOC.provider.quote(state, baseRequest);
  assert.deepEqual(baseQuote.blockers, []);
  state = SOC.dispatch(state, { type: 'provider', command: { ...baseRequest, quoteRevision: baseQuote.atRevision } });
  state = until(state, s => s.providerCampaign.customers.find(row => row.id === newCustomer)?.stages.base?.status === 'effective', `${newCustomer} base`);
  const activeRecipe = POLICY.create({
    ...policy.config,
    enabled: true,
    suspended: false,
    lifetimeBudgetCents: 100000,
    maxActions: 1,
    engineerCeiling: 1,
    supportCeiling: 1,
    customerIds: [newCustomer],
    rules: [{ id: 'carrier-for-next-customer', kind: 'provisioning', enabled: true, customerIds: [newCustomer], operationId: null, stage: 'carrier', resourceId: null, thresholdPercent: null }]
  });
  state = SOC.dispatch(state, { type: 'provider', command: { action: 'configure-policy', customerId: anchor, config: activeRecipe, quoteRevision: state.revision } });
  const preview = SOC.provider.policyPreview(state, activeRecipe, anchor);
  assert.equal(preview.status, 'ready');
  assert.equal(preview.customerId, newCustomer);
  const cashBeforeAutomaticOrder = state.business.balance.cash;
  state = advance(state);
  const automatedStage = state.providerCampaign.projects.findLast(row => row.customerId === newCustomer && row.kind === 'stage' && row.stage === 'carrier');
  assert.ok(automatedStage, 'the explicit paid policy submits an eligible carrier order');
  assert.ok(state.business.ledger.some(row => row.id === automatedStage.postingId && row.projectId === automatedStage.id && row.cents === automatedStage.setupCents));
  assert.equal(state.business.balance.cash, cashBeforeAutomaticOrder - automatedStage.setupCents);
  const enabledPolicy = state.providerAutomation.find(row => row.projectId === paidFollowProject.id);
  assert.equal(enabledPolicy.actions.length, 1);
  assert.equal(enabledPolicy.actions[0].projectId, automatedStage.id);
  assert.equal(enabledPolicy.spentCents, automatedStage.setupCents);
  state = until(state, s => s.providerCampaign.customers.find(row => row.id === newCustomer)?.stages.carrier?.status === 'effective', `${newCustomer} carrier`);
  assert.equal(state.providerCampaign.projects.find(row => row.id === automatedStage.id).status, 'complete');
  assert.deepEqual(SOC.restore(JSON.stringify(state)), state);
});

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

test('AC-SOC-655 public dispatch earns T2 from three paid UC/CC integrations and funds bounded automatic repair', () => {
  let state = createThreeMarketWindow();
  const customerIds = ['starter-customer', 'next-1-customer', 'next-2-customer'];
  for (const customerId of customerIds) state = installTestedUcCcPair(state, customerId);
  state = until(state, current => stableSupportWindowShape(current, customerIds), 'stable three-market support and tested integration window', 180);

  const ready = SOC.provider.inspect(state).progression.goals[T2];
  assert.equal(ready.status, 'ready', JSON.stringify(ready.missing));
  assert.deepEqual(ready.evidence.customerIds, [...customerIds].sort());
  assert.deepEqual(ready.evidence.markets, ['au-sydney', 'eu-dublin', 'us-seattle']);
  for (const customerId of customerIds) {
    const participantRows = FACTS.decodeSupportObservation(ready.evidence.samples).map(sample => sample.participants.find(row => row.customerId === customerId));
    assert.ok(participantRows.every(row => row.integrations?.some(edge => edge.id === 'workplace-to-contact-quality')),
      `${customerId} has a current paid and tested integration in every retained sample`);
  }

  const cashBeforeClaim = state.business.balance.cash;
  checkpoint('t2-ready-window', state, { sourceId: T2, customerIds });
  state = claimSource(state, T2);
  const receipt = state.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === T2);
  checkpoint('t2-earned-window', state, { sourceId: T2, customerIds: receipt?.sourceEvidence?.customerIds || [] });
  assert.ok(receipt);
  assert.deepEqual(receipt.unlock.allowedCustomerIds, [...customerIds].sort());
  assert.deepEqual(receipt.unlock.allowedMarkets, ready.evidence.markets);
  assert.equal(state.business.balance.cash, cashBeforeClaim, 'claiming the measured tier grants no cash');
  assert.equal(SOC.restore(JSON.stringify(state)).providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === T2).id, receipt.id);

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

  for (let minute = 0; minute < 240 && state.providerAutomation.find(row => row.projectId === completedAssurance.id).actions.length === 0; minute++) state = assuranceMinute(state);
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
