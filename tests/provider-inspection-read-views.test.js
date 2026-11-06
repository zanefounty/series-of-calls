'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const H = require('./provider-progression-regional-claims.helpers.js');
const { SOC } = H;
const customerId = 'starter-customer';
const child = state => state.portfolio.customers.find(row => row.id === customerId).root;
const project = (state, operationId) => state.providerCampaign.projects.findLast(row => row.operationId === operationId);
const integration = state => SOC.provider.inspect(state).customers.find(row => row.id === customerId).serviceIntegration;
const send = (state, command) => SOC.dispatch(state, { type: 'provider', command });
const operation = (state, id) => H.operation(state, id, customerId);
const complete = (state, id) => H.operationComplete(state, id, customerId);

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) freeze(nested);
    Object.freeze(value);
  }
  return value;
}

let pendingFixture;
function pending() {
  if (!pendingFixture) {
    let state = SOC.create({ experience: 'campaign', scenario: 'smb', difficulty: 'easy', seed: 73 });
    state = send(state, { action: 'staff', engineers: 4, support: 4 });
    state = H.startCustomer(state, customerId, 'starter', 'au-sydney');
    for (const id of ['recording', 'bpo', 'ms-workplace-calling', 'cisco-contact-centre']) state = complete(operation(state, id), id);
    state = H.until(state, current => current.clock >= 60, 'paid boundary history');
    state = complete(operation(state, 'service-boundary-review'), 'service-boundary-review');
    state = operation(state, 'uc-cc-integration');
    state = H.until(state, current => project(current, 'uc-cc-integration').status === 'commissioning', 'native integration commissioning');
    assert.equal(project(state, 'uc-cc-integration').operationReceipt.test, null);
    pendingFixture = freeze(state);
  }
  return structuredClone(pendingFixture);
}

let readyFixture;
function ready() {
  if (!readyFixture) {
    let state = pending();
    const paid = project(state, 'uc-cc-integration');
    const at = state.clock;
    state = send(state, { action: 'test-service-integration', projectId: paid.id, quoteRevision: state.revision });
    state = H.until(state, current => H.ccHasFullWork(current, customerId, at), 'actual tested voice with stored capture');
    state = complete(operation(state, 'quality'), 'quality');
    state = H.until(state, current => project(current, 'uc-cc-integration').status === 'complete', 'paid same-call quality review');
    assert.equal(integration(state).status, 'ready');
    readyFixture = freeze(state);
  }
  return structuredClone(readyFixture);
}

test('AC-SOC-839 paid integration inspection reads frozen state and returns isolated views', () => {
  const state = freeze(pending());
  const before = JSON.stringify(state);
  const view = SOC.provider.inspect(state);
  const expected = structuredClone(view);
  const visible = view.customers.find(row => row.id === customerId).serviceIntegration;
  assert.equal(visible.captureAvailable, false);
  assert.ok(visible.missing.includes('paid-integration-test-required'));
  visible.missing.push('caller-mutated');
  visible.projects[0].plan.source.generation = 999;
  visible.projects[0].observation.missing.push('caller-mutated');
  view.progression.claims.receipts?.push({ sourceId: 'caller-mutated' });
  assert.equal(JSON.stringify(state), before, 'nested observation/plan changes cannot write into paid source records');
  assert.deepEqual(SOC.provider.inspect(state), expected, 'a later read reconstructs its own diagnostics');
  assert.deepEqual(SOC.restore(before), state, 'reading a frozen paid save preserves native restore');
});

test('AC-SOC-840 native paid test/apply observes fresh edge results with worker and restore parity', () => {
  const state = freeze(pending());
  const before = JSON.stringify(state);
  const id = project(state, 'uc-cc-integration').id;
  assert.equal(integration(state).captureAvailable, false);
  const command = { type: 'provider', command: { action: 'test-service-integration', projectId: id, quoteRevision: state.revision } };
  const tested = SOC.dispatch(state, command);
  assert.equal(project(tested, 'uc-cc-integration').operationReceipt.test.result.status, 'scenario-verified');
  assert.equal(integration(tested).captureAvailable, true, 'post-apply observers see the newly tested native edge');
  assert.equal(integration(state).captureAvailable, false, 'a different state at the same testing boundary cannot borrow the result');
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(SOC.dispatch(SOC.restore(before), command), tested);
  let reply;
  const worker = { postMessage: value => { reply = value; } };
  vm.createContext(worker);
  vm.runInContext(SOC.workerSource(), worker);
  worker.onmessage({ data: { id: 'inspection-read-view-test', state: JSON.parse(before), command } });
  assert.equal(reply.error, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(reply.state)), tested);
  const delivered = freeze(ready());
  const deliveredBefore = JSON.stringify(delivered);
  const report = integration(delivered);
  const pristineReport = structuredClone(report);
  const proof = report.evidence;
  assert.ok(proof.job.id && proof.arrival.id && proof.recording.id && proof.quality.postingId);
  proof.job.caseId = 'caller-mutated-case';
  proof.test.result.checks[0].source.available = false;
  assert.deepEqual(integration(delivered), pristineReport, 'returned retained proof is not shared mutable reader authority');
  assert.equal(JSON.stringify(delivered), deliveredBefore);
  assert.deepEqual(SOC.restore(JSON.stringify(delivered)), delivered);
});

test('AC-SOC-841 prior inspection cannot hide later same-object fault, generation or payment forgery', () => {
  const authentic = ready();
  const before = JSON.stringify(authentic);
  const mutations = [
    ['physical resource fault', state => { child(state).resources.carrier.fault = 'FORGED_CARRIER_FAULT'; }],
    ['deployment generation', state => { child(state).products.deployments.find(row => row.id === 'd-ms-workplace-calling').generation++; }],
    ['paid integration posting', state => { const paid = project(state, 'uc-cc-integration'); state.business.ledger.find(row => row.id === paid.postingId).cents++; }]
  ];
  for (const [label, mutate] of mutations) {
    const altered = structuredClone(authentic);
    assert.equal(integration(altered).status, 'ready');
    mutate(altered);
    let refused = false;
    try { const report = integration(altered); refused = report.status !== 'ready' || report.captureAvailable !== true; }
    catch (error) { assert.match(error.message, /INVALID|PROVIDER/); refused = true; }
    assert.ok(refused, label + ' must change a new read on the same object');
    assert.throws(() => SOC.restore(JSON.stringify(altered)), undefined, label + ' is not native saved authority');
    assert.equal(integration(authentic).status, 'ready', label + ' cannot contaminate another state');
  }
  assert.equal(JSON.stringify(authentic), before);
});
