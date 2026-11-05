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
  const request = { action: 'operation', operationId: 'site-resource-migration', customerId: CUSTOMER, config: { resourceId, fromSite, toSite } };
  state = commit(state, request);
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
  const finalProject = project(state, 'site-resource-migration');
  assert.equal(finalProject?.status, 'complete', JSON.stringify({ resourceId, at: state.clock, project: finalProject, migration: child(state).siteOperations.migrations.find(row => row.id === finalProject?.operationReceipt?.migrationId), reservations: child(state).transport.reservations }));
  return state;
}

function migratedOwnedSiteState({ legacyOwnedSiteSetup = false } = {}) {
  let state = buyStages();
  for (const operationId of ['room', 'recording', 'bpo']) {
    state = operation(state, operationId);
    state = until(state, current => project(current, operationId)?.status === 'complete', 35);
  }

  state = operation(state, 'migration');
  state = until(state, current => project(current, 'migration')?.status === 'complete', 60);

  for (const [operationId, limit] of [
    ['cisco-dedicated-uc', 60],
    ['primary-upstream', 40],
    ['site-diverse-ingress', 40],
    ['owned-site-operations', 30]
  ]) {
    state = operation(state, operationId);
    if (legacyOwnedSiteSetup && operationId === 'owned-site-operations') {
      // Model the pre-routingVersion2 saved-project shape. Older paid setup
      // configured phone and dedicated-platform, but not migration-phone.
      delete project(state, operationId).ownedSiteRoutingVersion;
      state = SOC.restore(JSON.stringify(state));
    }
    state = until(state, current => project(current, operationId)?.status === 'complete', limit);
  }
  // The paid endpoint moves put Bea's desk on the surviving branch while her
  // number stays on migration-phone; the outage must still deliver to desk.
  state = migrateOwnedEndpoint(state, 'desk', OWN.SITE_IDS.head, OWN.SITE_IDS.branch);
  state = migrateOwnedEndpoint(state, 'dedicated-endpoint', OWN.SITE_IDS.branch, OWN.SITE_IDS.head);
  return repairActiveIncident(state);
}

test('AC-SOC-631 paid owned-site maintenance follows the migrated platform to the requested endpoint and rejects service-target substitution', () => {
  let state = migratedOwnedSiteState();
  const root = child(state);
  assert.equal(SOC.operations.platform(root, 'bea'), 'migration-phone', 'the fixture has completed a real coexistence migration');
  assert.deepEqual(root.resources['migration-phone'].effective.routes.find(row => row.prefix === '+61'), { prefix: '+61', target: 'service' }, 'the bought migration platform starts with its own effective routes');

  const config = { kind: 'power', targetSite: OWN.SITE_IDS.head };
  state = operation(state, 'site-recovery', config);
  const recovery = project(state, 'site-recovery');
  state = until(state, current => {
    const paid = project(current, 'site-recovery');
    const exercise = child(current).siteOperations?.exercises.find(row => row.id === paid?.operationReceipt?.exerciseId);
    return exercise?.phase === 'faulted' && exercise.continuity.length > 0 && exercise.continuity.every(row => row.success);
  }, 40);

  const paid = project(state, 'site-recovery');
  const exercise = child(state).siteOperations.exercises.find(row => row.id === paid.operationReceipt.exerciseId);
  const work = child(state).providerSiteWork.find(row => row.projectId === recovery.id && row.phase === 'faulted');
  const interaction = child(state).interactions.find(row => row.id === work?.interactionId);
  assert.ok(work && interaction, 'the faulted continuity phase records the actual paid work call');
  assert.equal(interaction.phase, 'resolved');
  assert.equal(interaction.outcome, 'CONNECTED');
  assert.equal(interaction.destination, work.targetResource, 'a successful phase must terminate at its scoped endpoint');
  assert.equal(work.targetResource, 'desk');
  assert.equal(interaction.to, child(state).resources.desk.effective.number);
  assert.equal(interaction.voicePath.platform, 'migration-phone', 'routing uses Bea’s effective migrated platform');
  assert.ok(interaction.trace.some(row => row.code === 'ORDERED_INBOUND_ROUTE' && row.platform === 'migration-phone' && row.target === 'desk'),
    'the current migrated platform routes Bea’s paid number to the endpoint bound at the surviving site');
  assert.notEqual(interaction.probe, true);
  assert.equal(interaction.durationMinutes, 2);
  assert.equal(interaction.usageMinutes, 2);
  assert.equal(interaction.finishedAt - interaction.startedAt, 2);
  assert.equal(interaction.media.in, true);
  assert.equal(interaction.media.out, true);
  assert.ok(interaction.trace.some(row => row.code === 'MEDIA_TRANSPORT_ADMITTED'));
  assert.equal(exercise.continuity.find(row => row.interactionId === interaction.id)?.success, true);
  assert.deepEqual(SOC.restore(JSON.stringify(state)), state);

  const forged = structuredClone(state);
  const forgedInteraction = child(forged).interactions.find(row => row.id === interaction.id);
  forgedInteraction.destination = 'service';
  assert.throws(() => SOC.restore(JSON.stringify(forged)), /INVALID_PROVIDER_SITE_DELIVERY|INVALID_PROVIDER_SITE_WORK|INVALID_SITE_OPERATIONS_JOURNEY_LINEAGE/,
    'a resolved service-handled call cannot be substituted for endpoint delivery evidence');

  const unknownRoutingVersion = structuredClone(state);
  project(unknownRoutingVersion, 'site-recovery').ownedSiteRoutingVersion = 99;
  assert.throws(() => SOC.restore(JSON.stringify(unknownRoutingVersion)), /INVALID_PROVIDER_OWNED_SITE_ROUTING_VERSION/,
    'unknown routing authority versions are rejected on restore');
});

test('AC-SOC-632 legacy wrong-target delivery can be aborted and retried as a newly paid routed recovery', () => {
  let state = migratedOwnedSiteState({ legacyOwnedSiteSetup: true });
  const root = child(state);
  assert.deepEqual(root.resources['migration-phone'].effective.routes.find(row => row.prefix === '+61'), { prefix: '+61', target: 'service' },
    'the restored legacy paid setup retains its prior migration-platform routing');

  const config = { kind: 'power', targetSite: OWN.SITE_IDS.head };
  state = operation(state, 'site-recovery', config);
  const legacyRecovery = project(state, 'site-recovery');
  delete legacyRecovery.ownedSiteRoutingVersion;
  state = SOC.restore(JSON.stringify(state));
  state = until(state, current => {
    const paid = project(current, 'site-recovery');
    const exercise = child(current).siteOperations?.exercises.find(row => row.id === paid?.operationReceipt?.exerciseId);
    return exercise?.status === 'failed';
  }, 40);

  const failedProject = project(state, 'site-recovery');
  const failedExercise = child(state).siteOperations.exercises.find(row => row.id === failedProject.operationReceipt.exerciseId);
  const failedWork = child(state).providerSiteWork.find(row => row.projectId === failedProject.id && row.phase === 'faulted');
  const failedCall = child(state).interactions.find(row => row.id === failedWork?.interactionId);
  assert.equal(failedProject.status, 'commissioning');
  assert.equal(failedCall.phase, 'resolved');
  assert.equal(failedCall.destination, 'service');
  assert.ok(failedWork.deliveredAt >= failedCall.finishedAt);
  assert.equal(failedExercise.status, 'failed');
  assert.deepEqual(SOC.restore(JSON.stringify(state)), state, 'legacy wrong-target work is retained as a failed exercise without freezing the campaign');

  state = send(state, { action: 'site-response', projectId: failedProject.id, response: 'abort', quoteRevision: state.revision });
  assert.equal(project(state, 'site-recovery').status, 'blocked');
  assert.equal(project(state, 'site-recovery').siteAbort.exerciseId, failedExercise.id);
  const retainedLegacyPosting = state.business.ledger.find(row => row.id === failedProject.postingId);
  assert.equal(retainedLegacyPosting.cents, failedProject.setupCents, 'aborting the failed legacy exercise does not refund its paid setup');

  // A fresh, separately funded recovery opts in to routingVersion2 and routes
  // the migrated platform to the real endpoint before accepting delivery.
  const retry = operation(state, 'site-recovery', config);
  const retryProject = project(retry, 'site-recovery');
  assert.equal(retryProject.ownedSiteRoutingVersion, 2);
  state = until(retry, current => {
    const paid = project(current, 'site-recovery');
    const exercise = child(current).siteOperations?.exercises.find(row => row.id === paid?.operationReceipt?.exerciseId);
    return exercise?.phase === 'faulted' && exercise.continuity.length > 0 && exercise.continuity.every(row => row.success);
  }, 40);
  const installed = project(state, 'site-recovery');
  assert.deepEqual(child(state).resources['migration-phone'].effective.routes.find(row => row.prefix === '+61255500201'), { prefix: '+61255500201', target: 'desk' });
  const retryExercise = child(state).siteOperations.exercises.find(row => row.id === installed.operationReceipt.exerciseId);
  assert.equal(retryExercise.status, 'active');
  const delivered = child(state).providerSiteWork.find(row => row.projectId === installed.id && row.phase === 'faulted');
  const deliveredCall = child(state).interactions.find(row => row.id === delivered?.interactionId);
  assert.equal(deliveredCall.phase, 'resolved');
  assert.equal(deliveredCall.destination, 'desk');
  assert.equal(deliveredCall.voicePath.platform, 'migration-phone');
  assert.equal(deliveredCall.durationMinutes, 2);
  assert.equal(deliveredCall.usageMinutes, 2);
  assert.equal(deliveredCall.media.in, true);
  assert.equal(deliveredCall.media.out, true);

  state = send(state, { action: 'site-response', projectId: installed.id, response: 'recover', quoteRevision: state.revision });
  state = until(state, current => child(current).siteOperations.exercises.find(row => row.id === installed.operationReceipt.exerciseId)?.phase === 'restoring', 30);
  state = send(state, { action: 'site-response', projectId: installed.id, response: 'restore', quoteRevision: state.revision });
  state = until(state, current => project(current, 'site-recovery')?.id === installed.id && project(current, 'site-recovery')?.status === 'complete', 40);
  const completedRetry = project(state, 'site-recovery');
  const completedExercise = child(state).siteOperations.exercises.find(row => row.id === installed.operationReceipt.exerciseId);
  const recoveredWork = child(state).providerSiteWork.find(row => row.projectId === installed.id && row.phase === 'recovered');
  const recoveredCall = child(state).interactions.find(row => row.id === recoveredWork?.interactionId);
  assert.equal(completedExercise.status, 'complete');
  assert.equal(completedExercise.restoration.status, 'complete');
  assert.equal(completedRetry.operationReceipt.restoreReceiptId, completedExercise.restoration.receiptId);
  assert.equal(recoveredCall.phase, 'resolved');
  assert.equal(recoveredCall.destination, 'desk');
  assert.equal(recoveredCall.voicePath.platform, 'migration-phone');
  assert.equal(recoveredCall.durationMinutes, 2);
  assert.equal(recoveredCall.usageMinutes, 2);
  assert.equal(recoveredCall.media.in, true);
  assert.equal(recoveredCall.media.out, true);
  const paidRecoveries = state.providerCampaign.projects.filter(row => row.customerId === CUSTOMER && row.operationId === 'site-recovery');
  assert.equal(paidRecoveries.length, 2);
  assert.deepEqual(paidRecoveries.map(row => row.setupCents), [16000, 16000]);
  assert.notEqual(paidRecoveries[0].postingId, paidRecoveries[1].postingId);
  assert.equal(state.business.ledger.find(row => row.id === paidRecoveries[0].postingId).cents, 16000);
  assert.equal(state.business.ledger.find(row => row.id === paidRecoveries[1].postingId).cents, 16000);
  assert.deepEqual(SOC.restore(JSON.stringify(state)), state);
});
