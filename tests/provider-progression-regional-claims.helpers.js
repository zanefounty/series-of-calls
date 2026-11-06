'use strict';

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
const T2 = RECEIPTS.REGIONAL_T2;
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

function safeAdvanceChunk(state) {
  const campaign = state.providerCampaign;
  if (campaign.status === 'won') return 1;
  const retryableIncident = campaign.incidents.some(row => ['active', 'acknowledged'].includes(row.status));
  const retryableRenewal = campaign.customers.some(row => row.status === 'renewal');
  if (retryableIncident || retryableRenewal) return 1;

  // Campaign settlements occur on period boundaries. Stop at the next one,
  // or at any accepted project's due boundary, so callers can inspect the
  // persisted result before moving on. Native advance still stops early when
  // a new incident, renewal, or campaign transition occurs.
  let boundary = (Math.floor(state.clock / 60) + 1) * 60;
  for (const project of campaign.projects) {
    if (['running', 'commissioning'].includes(project.status) && Number.isSafeInteger(project.dueAt) && project.dueAt > state.clock) {
      boundary = Math.min(boundary, project.dueAt);
    }
  }
  return Math.max(1, boundary - state.clock);
}

function untilCash(state, targetCents, label, limit = 600) {
  const startedAt = state.clock, startedWall = process.hrtime.bigint();
  let dispatches = 0, chunkedDispatches = 0;
  while (state.clock - startedAt < limit && state.business.balance.cash < targetCents) {
    const before = state.clock;
    const requested = Math.min(limit - (state.clock - startedAt), safeAdvanceChunk(state));
    state = requested === 1 ? advance(state) : dispatchWithCheckpoint(state, { type: 'advance', minutes: requested }, 'cash-wait');
    dispatches++;
    if (requested > 1) chunkedDispatches++;
    assert.ok(state.clock > before, `${label} wait advances at least one minute`);
  }
  const waitProfile = {
    targetCashCents: targetCents,
    elapsedMinutes: state.clock - startedAt,
    advanceDispatches: dispatches,
    multiMinuteDispatches: chunkedDispatches,
    wallTimeMs: Number(process.hrtime.bigint() - startedWall) / 1e6
  };
  if (state.business.balance.cash < targetCents) checkpoint('condition-not-reached', state, { condition: label, ...waitProfile });
  else checkpoint('t2-cash-wait-profile', state, waitProfile);
  assert.ok(state.business.balance.cash >= targetCents, `${label} not reached at minute ${state.clock}`);
  return state;
}

function compareCashWaitToMinuteSteps(state, minutes) {
  let minuteSteps = clone(state);
  for (let n = 0; n < minutes; n++) minuteSteps = advance(minuteSteps);
  let chunked = clone(state), remaining = minutes, chunkedAdvanceDispatches = 0;
  while (remaining > 0) {
    const chunk = Math.min(remaining, safeAdvanceChunk(chunked));
    const before = chunked.clock;
    chunked = chunk === 1 ? advance(chunked) : dispatchWithCheckpoint(chunked, { type: 'advance', minutes: chunk }, 'cash-wait-equivalence');
    chunkedAdvanceDispatches++;
    const elapsed = chunked.clock - before;
    assert.ok(elapsed > 0 && elapsed <= chunk, `native advance pauses only on persisted boundary: requested ${chunk}, elapsed ${elapsed}`);
    remaining -= elapsed;
  }
  // A single multi-minute advance has one command/revision row while repeated
  // one-minute commands have one per command. Exclude only those audit fields;
  // all simulation, settlement, work and incident outcomes must match.
  const persisted = value => {
    if (Array.isArray(value)) return value.map(persisted);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => key !== 'revision')
      .map(([key, item]) => [key, persisted(item)]));
  };
  const comparable = value => {
    const result = persisted(value);
    delete result.commands;
    return result;
  };
  assert.deepEqual(comparable(chunked), comparable(minuteSteps), 'boundary-chunked advance matches one-minute dispatches across persisted outcomes');
  assert.ok(chunkedAdvanceDispatches < minutes, 'quiet periods use fewer native advance dispatches than one-minute waits');
  return chunked;
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
  const label = `${customerId} ${operationId}`;
  const startedAt = state.clock;
  while (state.clock - startedAt < 420 && !state.providerCampaign.projects.some(project => project.customerId === customerId && project.operationId === operationId && project.status === 'complete')) {
    const project = state.providerCampaign.projects.findLast(row => row.customerId === customerId && row.operationId === operationId);
    const interrupted = state.providerCampaign.status === 'won'
      || state.providerCampaign.incidents.some(row => ['active', 'acknowledged'].includes(row.status))
      || state.providerCampaign.customers.some(row => row.status === 'renewal');
    const remaining = 420 - (state.clock - startedAt);
    const due = project && ['running', 'commissioning'].includes(project.status) && Number.isSafeInteger(project.dueAt) && project.dueAt > state.clock
      ? project.dueAt - state.clock
      : 1;
    const requested = interrupted ? 1 : Math.min(remaining, due);
    const before = state.clock;
    state = requested === 1
      ? advance(state)
      : dispatchWithCheckpoint(state, { type: 'advance', minutes: requested }, 'operation-due-boundary');
    assert.ok(state.clock > before, `${label} completion wait advances at least one minute`);
    assert.ok(state.clock - before <= requested, `${label} completion wait does not exceed its requested native advance`);
    assert.ok(state.clock - startedAt <= 420, `${label} completion wait stays within its 420-minute simulation cap`);
  }
  const complete = state.providerCampaign.projects.some(project => project.customerId === customerId && project.operationId === operationId && project.status === 'complete');
  if (!complete) checkpoint('condition-not-reached', state, { condition: `${label} completion` });
  assert.ok(complete, `${label} not reached at minute ${state.clock}`);
  return state;
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

function supportWindowBatchBoundary(state, customerIds, { distributor = false } = {}) {
  const observation = state.providerCampaign.supportObservation;
  if (!observation) return null;
  let samples;
  try { samples = FACTS.decodeSupportObservation(observation); } catch { return null; }
  if (samples.length !== 60 || samples.at(-1)?.at !== state.clock) return null;
  const cohort = [...customerIds].sort();
  const team = state.business.workforce;
  const signatureFor = sample => JSON.stringify({
    cohort: sample.cohort,
    participants: [...(Array.isArray(sample.participants) ? sample.participants : [])].sort((a, b) => a.customerId.localeCompare(b.customerId)).map(row => ({
      customerId: row.customerId,
      configuration: row.configuration,
      resources: row.resources,
      boundaries: row.boundaries,
      integrations: row.integrations ?? null,
      namedSupportProjectId: row.namedSupport?.projectId ?? null
    }))
  });
  const classified = samples.map((sample, index) => {
    let impossible = !Array.isArray(sample.cohort) || JSON.stringify(sample.cohort) !== JSON.stringify(cohort)
      || !Array.isArray(sample.participants) || new Set(sample.participants.map(row => row.customerId)).size !== cohort.length
      || cohort.some(id => !sample.participants.some(row => row.customerId === id));
    if (index && sample.at !== samples[index - 1].at + 1) impossible = true;
    for (const customerId of cohort) {
      const participant = sample.participants.find(row => row.customerId === customerId);
      if (!participant || participant.eligible !== true || !participant.responsibility || !participant.boundaries?.length) {
        impossible = true;
        continue;
      }
      if (distributor) {
        const workforce = participant.responsibility.sharedWorkforce;
        if (participant.namedSupport?.projectId == null || participant.namedSupport.paidSupportSlots !== team.support
            || workforce?.support !== team.support || workforce?.engineers !== team.engineers) impossible = true;
      }
    }
    return { at: sample.at, impossible, signature: signatureFor(sample) };
  });

  const signatures = [...new Set(classified.filter(row => !row.impossible).map(row => row.signature))];
  if (!signatures.length) return Math.max(...classified.map(row => row.at + 60));
  let earliest = Infinity;
  for (const signature of signatures) {
    const incompatible = classified.filter(row => row.impossible || row.signature !== signature);
    if (!incompatible.length) return null;
    earliest = Math.min(earliest, Math.max(...incompatible.map(row => row.at + 60)));
  }
  return earliest > state.clock ? earliest : null;
}

function waitForStableSupportWindow(state, predicate, customerIds, label, limit, options = {}) {
  const startedAt = state.clock;
  let advanceDispatches = 0, boundedDispatches = 0;
  while (state.clock - startedAt < limit && !predicate(state)) {
    const earliest = supportWindowBatchBoundary(state, customerIds, options);
    const remaining = limit - (state.clock - startedAt);
    const chunk = earliest === null ? 1 : Math.min(remaining, safeAdvanceChunk(state), earliest - state.clock);
    const before = state.clock;
    const workforceBefore = options.distributor ? JSON.stringify({ engineers: state.business.workforce.engineers, support: state.business.workforce.support }) : null;
    state = chunk <= 1
      ? advance(state)
      : dispatchWithCheckpoint(state, { type: 'advance', minutes: chunk }, 'support-window-boundary');
    advanceDispatches++;
    if (chunk > 1) boundedDispatches++;
    assert.ok(state.clock > before, `${label} wait advances at least one minute`);
    assert.ok(state.clock - before <= chunk, `${label} wait does not exceed its requested native advance`);
    assert.ok(state.clock - startedAt <= limit, `${label} wait stays within its ${limit}-minute simulation cap`);
    if (workforceBefore !== null) assert.equal(JSON.stringify({ engineers: state.business.workforce.engineers, support: state.business.workforce.support }), workforceBefore, `${label} batching assumes no staffing command or automatic team change during native advance`);
  }
  const reached = predicate(state);
  if (!reached) checkpoint('condition-not-reached', state, { condition: label });
  checkpoint('support-window-wait-profile', state, {
    condition: label,
    elapsedMinutes: state.clock - startedAt,
    advanceDispatches,
    boundedDispatches,
    reached
  });
  assert.ok(reached, `${label} not reached at minute ${state.clock}`);
  return state;
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
  state = waitForStableSupportWindow(state, s => stableSupportWindowShape(s, [starter, second, third]), [starter, second, third], 'stable three-region support sample window', 300);
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
  state = waitForStableSupportWindow(state, s => stableSupportWindowShape(s, customerIds), customerIds, 'stable five-market support sample window', 180);
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
  state = waitForStableSupportWindow(state, s => stableDistributorSupportWindow(s, customerIds), customerIds, 'stable five-market distributor support sample window', 180, { distributor: true });
  return state;
}

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

function assuranceWaitChunk(state) {
  if (state.providerCampaign.status === 'won' || state.providerCampaign.customers.some(row => row.status === 'renewal')) return 1;
  let boundary = (Math.floor(state.clock / 60) + 1) * 60;
  for (const project of state.providerCampaign.projects) {
    if (['running', 'commissioning'].includes(project.status) && Number.isSafeInteger(project.dueAt) && project.dueAt > state.clock) {
      boundary = Math.min(boundary, project.dueAt);
    }
  }
  return Math.max(1, boundary - state.clock);
}

function runAssuranceWait(state, projectId, limit = 240) {
  const startedAt = state.clock;
  let dispatches = 0, chunkedDispatches = 0;
  while (state.clock - startedAt < limit && !state.providerAutomation.find(row => row.projectId === projectId)?.actions.length) {
    const requested = Math.min(limit - (state.clock - startedAt), assuranceWaitChunk(state));
    const before = state.clock;
    state = requested === 1
      ? assuranceMinute(state)
      : dispatchWithCheckpoint(state, { type: 'advance', minutes: requested }, 'assurance-wait');
    dispatches++;
    if (requested > 1) chunkedDispatches++;
    assertAssuranceProgress(state, before, requested);
  }
  checkpoint('t2-assurance-wait-profile', state, {
    projectId,
    elapsedMinutes: state.clock - startedAt,
    dispatches,
    multiMinuteDispatches: chunkedDispatches,
    actionCount: state.providerAutomation.find(row => row.projectId === projectId)?.actions.length || 0
  });
  return state;
}

function assertAssuranceProgress(state, before, requested) {
  if (state.clock <= before || state.clock - before > requested) throw new Error(`assurance wait advanced ${state.clock - before} minutes for a ${requested}-minute request`);
}

function compareAssuranceWaitToMinuteSteps(state, minutes) {
  let minuteSteps = clone(state);
  for (let n = 0; n < minutes; n++) minuteSteps = assuranceMinute(minuteSteps);
  let chunked = clone(state), remaining = minutes;
  while (remaining > 0) {
    const requested = Math.min(remaining, assuranceWaitChunk(chunked));
    const before = chunked.clock;
    chunked = requested === 1
      ? assuranceMinute(chunked)
      : dispatchWithCheckpoint(chunked, { type: 'advance', minutes: requested }, 'assurance-wait-equivalence');
    const elapsed = chunked.clock - before;
    assertAssuranceProgress(chunked, before, requested);
    remaining -= elapsed;
  }
  const persisted = value => {
    if (Array.isArray(value)) return value.map(persisted);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => key !== 'revision')
      .map(([key, item]) => [key, persisted(item)]));
  };
  const comparable = value => {
    const result = persisted(value);
    delete result.commands;
    return result;
  };
  if (JSON.stringify(comparable(chunked)) !== JSON.stringify(comparable(minuteSteps))) {
    throw new Error('boundary-chunked assurance wait diverges from one-minute persisted outcomes');
  }
  return chunked;
}

function rehash(receipt) {
  const unsigned = { ...receipt };
  delete unsigned.integrity;
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(unsigned)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  receipt.integrity = (hash >>> 0).toString(16).padStart(8, '0');
}





module.exports = {
  SOC, FACTS, RECEIPTS, RESPONSIBILITY, REGIONAL, POLICY, UC_CC,
  C3, C5, T2, L7, clone, hooks, mspFor, checkpoint, buy, dispatchWithCheckpoint,
  advance, until, safeAdvanceChunk, untilCash, compareCashWaitToMinuteSteps,
  startCustomer, operation, operationComplete, stableSupportWindowShape,
  createThreeMarketWindow, createFiveMarketWindow, createLevelSevenWindow,
  supportWindowBatchBoundary, waitForStableSupportWindow, stableDistributorSupportWindow,
  claim, claimSource, rehash, paidPurchaseWhenReady, addRegionalCustomer,
  ccChild, ccHasFullWork, installTestedUcCcPair, assuranceMinute, assuranceWaitChunk,
  runAssuranceWait, compareAssuranceWaitToMinuteSteps
};
