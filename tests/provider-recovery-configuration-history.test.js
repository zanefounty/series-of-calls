'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const SOC = require('../src/game/55-communications');
const AUTH = require('../src/game/23-provider-configuration-authority');
const OWN = require('../src/game/23-provider-owned-sites');

const CUSTOMER = 'starter-customer';
const child = state => state.portfolio.customers.find(row => row.id === CUSTOMER).root;
const customer = state => state.providerCampaign.customers.find(row => row.id === CUSTOMER);
const project = (state, operationId) => state.providerCampaign.projects.findLast(row => row.customerId === CUSTOMER && row.operationId === operationId);
const send = (state, command) => SOC.dispatch(state, { type: 'provider', command });
function advance(state) { return SOC.dispatch(state, { type: 'advance', minutes: 1 }); }
function until(state, predicate, limit = 180) {
  for (let minute = 0; minute < limit && !predicate(state); minute++) state = advance(state);
  assert.ok(predicate(state), `condition not reached by minute ${state.clock}`);
  return state;
}
function commit(state, request) {
  const quote = SOC.provider.quote(state, request);
  assert.deepEqual(quote.blockers, [], JSON.stringify({ clock: state.clock, request, blockers: quote.blockers }));
  return send(state, { ...request, quoteRevision: quote.atRevision });
}
function operation(state, operationId, config) {
  return commit(state, { action: 'operation', operationId, customerId: CUSTOMER, ...(config ? { config } : {}) });
}
function configurationAt(state, resourceId, at) {
  return AUTH.configurationAt(state.providerCampaign, customer(state), child(state), resourceId, at, { catalogue: SOC.catalogue });
}
function preparedOwnedSites() {
  let state = SOC.create({ experience: 'campaign', scenario: 'smb', difficulty: 'easy', seed: 73 });
  for (const stage of ['base', 'carrier', 'partner']) {
    state = commit(state, { action: 'purchase', offerId: 'starter', planId: 'swift', stage, ...(stage === 'base' ? {} : { customerId: CUSTOMER }) });
  }
  state = until(state, current => current.providerCampaign.customers[0].status === 'active', 30);
  for (const [operationId, limit] of [['cisco-dedicated-uc', 60], ['primary-upstream', 40], ['site-diverse-ingress', 40], ['owned-site-operations', 30]]) {
    state = operation(state, operationId);
    state = until(state, current => project(current, operationId)?.status === 'complete', limit);
  }
  const incident = state.providerCampaign.incidents.find(row => row.customerId === CUSTOMER && ['active', 'acknowledged'].includes(row.status));
  if (incident) {
    if (incident.status === 'active') state = send(state, { action: 'acknowledge-incident', incidentId: incident.id });
    const repairId = incident.resource === 'service' ? 'service-repair' : 'repair';
    state = operation(state, repairId);
    state = until(state, current => project(current, repairId)?.status === 'complete', 60);
  }
  return state;
}
function readyForRestore() {
  let state = preparedOwnedSites();
  const config = { kind: 'power', targetSite: OWN.SITE_IDS.head };
  state = operation(state, 'site-recovery', config);
  state = until(state, current => project(current, 'site-recovery')?.status === 'commissioning', 20);
  const recovery = project(state, 'site-recovery');
  state = until(state, current => {
    const exercise = child(current).siteOperations.exercises.find(row => row.id === recovery.operationReceipt.exerciseId);
    return exercise?.phase === 'faulted' && exercise.continuity.length > 0 && exercise.continuity.every(row => row.success);
  }, 40);
  state = send(state, { action: 'site-response', projectId: recovery.id, response: 'recover', quoteRevision: state.revision });
  state = until(state, current => child(current).siteOperations.exercises.find(row => row.id === recovery.operationReceipt.exerciseId)?.phase === 'restoring', 30);
  return { state, recovery };
}

test('AC-SOC-750 paid native backup restore enters configuration history after its same-minute command sample', () => {
  let { state, recovery } = readyForRestore();
  const exerciseId = recovery.operationReceipt.exerciseId;
  const exercise = child(state).siteOperations.exercises.find(row => row.id === exerciseId);
  const backedUpDesk = exercise.backupSnapshot.resources.find(row => row.id === 'desk');
  assert.ok(backedUpDesk, 'the paid native backup scope includes the real desk endpoint');
  const restoreCommand = { action: 'site-response', projectId: recovery.id, response: 'restore', quoteRevision: state.revision };
  const sampleAt = state.clock;
  const before = configurationAt(state, 'desk', sampleAt);
  assert.equal(before.generation, backedUpDesk.generation, 'the sample before the explicit restore command retains the backup-scoped generation');

  state = send(state, restoreCommand);
  const sameMinute = configurationAt(state, 'desk', sampleAt);
  assert.deepEqual(sameMinute, before, 'the explicit command does not rewrite the already sampled minute');
  assert.equal(child(state).resources.desk.generation, before.generation + 1, 'the next-minute restore is pending in live state');

  const next = advance(state);
  const restored = configurationAt(next, 'desk', next.clock);
  assert.equal(restored.generation, before.generation + 1, 'the paid backup restore is a distinct historical configuration write');
  assert.deepEqual(restored.config, backedUpDesk.config, 'the write restores the configuration retained by the native backup scope');
  assert.equal(project(next, 'site-recovery').operationReceipt.backupSnapshotId, exercise.backupSnapshot.snapshotId);
  assert.deepEqual(SOC.restore(JSON.stringify(next)), next, 'the paid restoration history validates on import');

  const advanceCommand = { type: 'advance', minutes: 1 }, expected = SOC.dispatch(SOC.restore(JSON.stringify(state)), advanceCommand);
  const box = { postMessage: value => { box.result = value; } };
  vm.createContext(box);
  vm.runInContext(SOC.workerSource(), box);
  box.onmessage({ data: { id: 'provider-recovery-config-history', state: JSON.parse(JSON.stringify(state)), command: advanceCommand } });
  assert.equal(box.result.error, undefined, box.result.error);
  assert.deepEqual(JSON.parse(JSON.stringify(box.result.state)), expected, 'worker continuation matches dispatch across the restore generation event');

  const invalidGeneration = structuredClone(next);
  project(invalidGeneration, 'site-recovery').expectedGenerations.desk = before.generation;
  assert.throws(() => SOC.restore(JSON.stringify(invalidGeneration)), /INVALID_PROVIDER_CONFIG_AUTHORITY|INVALID_PROVIDER_PROJECT_GENERATION|INVALID_SITE_OPERATIONS|SITE_RESTORE/,
    'a paid restore cannot reuse the pre-restore endpoint generation');

  const futureRestore = structuredClone(next), futureExercise = child(futureRestore).siteOperations.exercises.find(row => row.id === exerciseId);
  futureExercise.restoration.requestedAt = futureRestore.clock + 1;
  futureExercise.restoration.due = futureRestore.clock + 2;
  assert.throws(() => SOC.restore(JSON.stringify(futureRestore)), /INVALID_PROVIDER_CONFIG_AUTHORITY|SITE_RESTORE|INVALID_SITE_OPERATIONS/,
    'a restore receipt cannot point beyond the current sampled clock');

  const unpaidRestore = structuredClone(next), unpaidRecovery = project(unpaidRestore, 'site-recovery');
  unpaidRecovery.operationReceipt.exerciseId = 'unpaid-native-backup-exercise';
  assert.throws(() => SOC.restore(JSON.stringify(unpaidRestore)), /UNFUNDED_SITE_RESTORE|INVALID_PROVIDER_CONFIG_AUTHORITY|SITE_RESTORE|INVALID_SITE_OPERATIONS/,
    'restoration history must resolve through the funded Provider operation to its actual backup exercise');
});
