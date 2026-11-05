'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const SOC = require('../src/game/55-communications');
const OWN = require('../src/game/23-provider-owned-sites');

const CUSTOMER = 'starter-customer';
const child = state => state.portfolio.customers.find(row => row.id === CUSTOMER).root;
const project = (state, operationId) => state.providerCampaign.projects.findLast(row => row.customerId === CUSTOMER && row.operationId === operationId);
const send = (state, command) => SOC.dispatch(state, { type: 'provider', command });

function advance(state) {
  for (const customer of state.providerCampaign.customers.filter(row => row.status === 'renewal')) {
    state = send(state, { action: 'renew', customerId: customer.id });
  }
  return SOC.dispatch(state, { type: 'advance', minutes: 1 });
}

function until(state, predicate, limit = 100) {
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

function buyStages() {
  let state = SOC.create({ experience: 'campaign', scenario: 'enterprise', difficulty: 'easy', seed: 73, market: 'au-sydney' });
  for (const stage of ['base', 'carrier', 'partner']) {
    state = commit(state, {
      action: 'purchase', offerId: 'starter', planId: 'swift', stage,
      ...(stage === 'base' ? {} : { customerId: CUSTOMER })
    });
  }
  return until(state, current => current.providerCampaign.customers.find(row => row.id === CUSTOMER)?.status === 'active', 30);
}

function repairActiveIncident(state) {
  const incident = state.providerCampaign.incidents.find(row => row.customerId === CUSTOMER && ['active', 'acknowledged'].includes(row.status));
  if (!incident) return state;
  if (incident.status === 'active') state = send(state, { action: 'acknowledge-incident', incidentId: incident.id });
  const repairId = incident.kind === 'transport-domain' ? 'transport-repair' : incident.resource === 'service' ? 'service-repair' : 'repair';
  state = operation(state, repairId);
  return until(state, current => project(current, repairId)?.status === 'complete', 60);
}

function migrateOwnedEndpoint(state, resourceId, fromSite, toSite) {
  state = operation(state, 'site-resource-migration', { resourceId, fromSite, toSite });
  const paidId = project(state, 'site-resource-migration').id;
  for (let minute = 0; minute < 35 && project(state, 'site-resource-migration')?.id === paidId && project(state, 'site-resource-migration')?.status !== 'complete'; minute++) {
    const paid = project(state, 'site-resource-migration');
    const root = child(state);
    const migration = root.siteOperations.migrations.find(row => row.id === paid?.operationReceipt?.migrationId);
    const identity = root.resources[resourceId]?.effective?.identity;
    const busy = root.transport.reservations.some(row => [row.from, row.to].includes(resourceId) || identity && [row.from, row.to].includes(identity));
    if (migration?.phase === 'partial' && !busy && !root.siteOperations.exercises.some(row => row.status === 'active')) {
      state = send(state, { action: 'site-response', projectId: paidId, response: 'retry-migration', quoteRevision: state.revision });
    }
    if (project(state, 'site-resource-migration')?.status !== 'complete') state = advance(state);
  }
  assert.equal(project(state, 'site-resource-migration')?.status, 'complete', `site migration did not complete by ${state.clock}`);
  return state;
}

function reverseOrderState(platformMigration = 'migration') {
  let state = buyStages();
  for (const operationId of ['room', 'recording', 'bpo']) {
    state = operation(state, operationId);
    state = until(state, current => project(current, operationId)?.status === 'complete', 35);
  }
  for (const [operationId, limit] of [
    ['cisco-dedicated-uc', 60],
    ['primary-upstream', 40],
    ['site-diverse-ingress', 40],
    ['owned-site-operations', 30]
  ]) {
    state = operation(state, operationId);
    state = until(state, current => project(current, operationId)?.status === 'complete', limit);
  }

  const before = child(state).resources.phone.effective.routes;
  state = operation(state, platformMigration);
  const migrationProjectId = project(state, platformMigration).id;
  let sawPendingTransition = false;
  const targetResources = platformMigration === 'migration-consolidated' ? ['desk', 'dedicated-endpoint'] : ['desk'];
  for (let minute = 0; minute < 40 && project(state, platformMigration)?.id === migrationProjectId && project(state, platformMigration)?.status !== 'complete'; minute++) {
    state = advance(state);
    const root = child(state), pending = targetResources.every(resource => root.resources[resource].provisioning?.status === 'pending') && root.operations?.migrations?.some(row => row.id === root.providerTasks?.find(task => task.createdAt === project(state, platformMigration)?.operationReceipt?.at)?.migrationId && row.status === 'verifying');
    if (pending) {
      sawPendingTransition = true;
      const beforeQuoteProjects = state.providerCampaign.projects.length;
      const quote = SOC.provider.quote(state, { action: 'operation', operationId: 'site-recovery', customerId: CUSTOMER, config: { kind: 'power', targetSite: OWN.SITE_IDS.head } });
      assert.ok(quote.blockers.length > 0, 'a site recovery quote stays blocked while desk is in platform provisioning');
      assert.equal(state.providerCampaign.projects.length, beforeQuoteProjects, 'quote refusal creates no paid work');
    }
  }
  assert.ok(sawPendingTransition, 'the fixture crossed the paid endpoint provisioning state');
  state = until(state, current => project(current, platformMigration)?.status === 'complete', 5);
  const platformProject = project(state, platformMigration);
  const descriptors = OWN.platformMigrationTransitions(state, CUSTOMER, platformProject.id);
  assert.ok(descriptors.length, 'helper exposes validated completed transitions for the runtime to reconcile');
  assert.ok(descriptors.every(row => row.phase === 'effective' && row.operationId === platformMigration));
  if (platformMigration === 'migration') assert.deepEqual(descriptors.map(row => ({ resource: row.resource, identity: row.identity, platform: row.platform, from: row.fromGeneration, to: row.toGeneration })), [{ resource: 'desk', identity: 'bea', platform: 'migration-phone', from: 2, to: 3 }]);
  else assert.deepEqual(descriptors.map(row => ({ resource: row.resource, identity: row.identity, platform: row.platform, from: row.fromGeneration, to: row.toGeneration })), [
    { resource: 'desk', identity: 'bea', platform: 'phone', from: 2, to: 3 },
    { resource: 'dedicated-endpoint', identity: 'alex', platform: 'phone', from: 2, to: 3 }
  ]);
  assert.deepEqual(child(state).resources[platformMigration === 'migration' ? 'migration-phone' : 'phone'].effective.routes, before, 'the paid migration copied the live phone route configuration');

  state = migrateOwnedEndpoint(state, 'desk', OWN.SITE_IDS.head, OWN.SITE_IDS.branch);
  state = migrateOwnedEndpoint(state, 'dedicated-endpoint', OWN.SITE_IDS.branch, OWN.SITE_IDS.head);
  return repairActiveIncident(state);
}

function assertPaidOwnedSiteAfterMigration(platformMigration) {
  let state = reverseOrderState(platformMigration);
  const root = child(state);
  const targetPlatform = platformMigration === 'migration' ? 'migration-phone' : 'phone';
  assert.equal(SOC.operations.platform(root, 'bea'), targetPlatform);
  const incoming = root.resources.desk.effective.number;
  state = until(state, current => current.providerCampaign.jobs.some(job => job.customerId === CUSTOMER && job.channel === 'voice' && job.arrivalAt >= project(current, platformMigration).completedAt && ['completed', 'late'].includes(job.status) && child(current).interactions.some(call => call.id === job.interactionId && call.phase === 'resolved' && !call.probe && call.to === incoming && call.destination === 'desk' && call.voicePath?.platform === targetPlatform)), 18);
  const job = state.providerCampaign.jobs.find(row => row.customerId === CUSTOMER && row.channel === 'voice' && row.arrivalAt >= project(state, platformMigration).completedAt && ['completed', 'late'].includes(row.status) && child(state).interactions.some(call => call.id === row.interactionId && call.phase === 'resolved' && !call.probe && call.to === incoming && call.destination === 'desk' && call.voicePath?.platform === targetPlatform));
  const call = child(state).interactions.find(row => row.id === job.interactionId);
  assert.ok(call.trace.some(row => row.code === 'ORDERED_INBOUND_ROUTE' && row.platform === targetPlatform && row.target === 'desk'));
  assert.equal(call.media.in, true);
  assert.equal(call.media.out, true);
  assert.ok(call.durationMinutes >= 1);
  assert.ok(call.usageMinutes >= 1);
  assert.deepEqual(SOC.restore(JSON.stringify(state)), state);

  const recoveryConfig = { kind: 'power', targetSite: OWN.SITE_IDS.head };
  state = operation(state, 'site-recovery', recoveryConfig);
  const recovery = project(state, 'site-recovery');
  state = until(state, current => {
    const paid = project(current, 'site-recovery');
    const exercise = child(current).siteOperations.exercises.find(row => row.id === paid?.operationReceipt?.exerciseId);
    return exercise?.phase === 'faulted' && exercise.continuity.length > 0 && exercise.continuity.every(row => row.success);
  }, 40);
  const activeRecovery = project(state, 'site-recovery');
  const exercise = child(state).siteOperations.exercises.find(row => row.id === activeRecovery.operationReceipt.exerciseId);
  const work = child(state).providerSiteWork.find(row => row.projectId === recovery.id && row.phase === 'faulted');
  const recoveredPathCall = child(state).interactions.find(row => row.id === work?.interactionId);
  assert.ok(work && recoveredPathCall, 'paid recovery records actual continuity work');
  assert.equal(recoveredPathCall.destination, 'desk');
  assert.equal(recoveredPathCall.voicePath.platform, targetPlatform);
  assert.equal(recoveredPathCall.phase, 'resolved');
  assert.equal(recoveredPathCall.probe, undefined);
  assert.equal(recoveredPathCall.media.in, true);
  assert.equal(recoveredPathCall.media.out, true);
  assert.ok(recoveredPathCall.durationMinutes >= 1);
  assert.equal(exercise.status, 'active');

  state = send(state, { action: 'site-response', projectId: activeRecovery.id, response: 'recover', quoteRevision: state.revision });
  state = until(state, current => child(current).siteOperations.exercises.find(row => row.id === activeRecovery.operationReceipt.exerciseId)?.phase === 'restoring', 30);
  state = send(state, { action: 'site-response', projectId: activeRecovery.id, response: 'restore', quoteRevision: state.revision });
  state = until(state, current => project(current, 'site-recovery')?.id === activeRecovery.id && project(current, 'site-recovery')?.status === 'complete', 40);
  const completedExercise = child(state).siteOperations.exercises.find(row => row.id === activeRecovery.operationReceipt.exerciseId);
  assert.equal(completedExercise.status, 'complete');
  assert.equal(completedExercise.restoration.status, 'complete');
  assert.deepEqual(SOC.restore(JSON.stringify(state)), state);

  const forged = structuredClone(state);
  const forgedCall = child(forged).interactions.find(row => row.id === recoveredPathCall.id);
  forgedCall.destination = 'service';
  assert.throws(() => SOC.restore(JSON.stringify(forged)), /INVALID_PROVIDER_SITE_DELIVERY|INVALID_PROVIDER_SITE_WORK|INVALID_SITE_OPERATIONS_JOURNEY_LINEAGE/);
}

test('AC-SOC-637 paid owned-site state validates coexistence migration and serves its real migrated inbound route', () => {
  assertPaidOwnedSiteAfterMigration('migration');
});

test('AC-SOC-638 paid owned-site state validates consolidated migration and serves its real migrated inbound route', () => {
  assertPaidOwnedSiteAfterMigration('migration-consolidated');
});
