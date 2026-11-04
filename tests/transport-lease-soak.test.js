'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const SOC = require('../src/game/55-communications');
const { fixture, revoke } = require('./lib/transport-lease-fixture');
const { runLeaseSoak } = require('../scripts/lib/transport-lease-soak');

test('AC-SOC-600 seeded lease long play preserves independent faults, call paths, history and continued saves', t => {
  const { state, activeSave, summary } = runLeaseSoak({ seed: 0x51c0ffee, steps: 1120 });
  assert.ok(summary.accepted > 1000);
  assert.ok(summary.rejected > 0);
  assert.ok(summary.workerCommands > 0);
  assert.deepEqual(summary.checkpoints.map(row => row.label), ['mid', 'late']);
  assert.equal(SOC.validateState(state), state);

  // Corrupt copies only: no fabricated success/provisioning or padded command log.
  const invalid = [
    ['deleted old event', save => save.transport.leaseRevocations.shift()],
    ['deleted all events', save => { delete save.transport.leaseRevocations; }],
    ['duplicate event id', save => { save.transport.leaseRevocations.at(-1).id = save.transport.leaseRevocations[0].id; }],
    ['duplicate opening revision', save => { save.transport.leaseRevocations.at(-1).openedRevision = save.transport.leaseRevocations[0].openedRevision; }],
    ['forged early completion', save => { const event = save.transport.leaseRevocations.at(-1); event.status = 'renumbered'; event.completedAt = event.due; }],
    ['deleted retained root command', save => { const revision = save.transport.leaseRevocations.at(-1).openedRevision;
      save.commands = save.commands.filter(row => row.revision !== revision); }],
    ['changed durable count', save => { save.transport.leaseRevocationCount++; }],
  ];
  for (const [label, mutate] of invalid) {
    const corrupted = JSON.parse(activeSave);
    mutate(corrupted);
    assert.throws(() => SOC.restore(JSON.stringify(corrupted)), /TRANSPORT_LEASE/, label);
  }
  t.diagnostic(JSON.stringify(summary));
});

test('the incident count rejects deleted history after every opening command has actually pruned', () => {
  let state = SOC.dispatch(fixture().state, revoke);
  state = SOC.dispatch(state, { type: 'advance', minutes: 7 });
  const event = structuredClone(state.transport.leaseRevocations[0]);
  for (let index = 0; index < 1000; index++) state = SOC.dispatch(state, {
    type: 'transport', command: { action: 'observe', kind: 'link', id: 'leased-path',
      available: index % 2 === 0, power: true },
  });
  assert.equal(state.commands.length, 1000);
  assert.ok(state.commands[0].revision > event.openedRevision);
  assert.ok(state.commands.every(row => row.command.command?.action !== 'lease-revoke'));
  assert.deepEqual(state.transport.leaseRevocations, [event]);
  assert.equal(state.transport.leaseRevocationCount, 1);
  assert.deepEqual(SOC.restore(JSON.stringify(state)), state);
  for (const remove of [save => { save.transport.leaseRevocations = []; },
    save => { delete save.transport.leaseRevocations; }]) {
    const corrupted = structuredClone(state);
    remove(corrupted);
    assert.throws(() => SOC.restore(JSON.stringify(corrupted)), /TRANSPORT_LEASE/);
  }
  // Legacy packs can omit both fields. After every root receipt prunes, stripping
  // both the counter and event array cannot be distinguished from that schema;
  // this integrity check is not a cryptographic or replay-authenticated save.
});

test('the same seed and inputs replay to exactly the same lease state and command trace', () => {
  const first = runLeaseSoak({ seed: 707, steps: 48, worker: false });
  const second = runLeaseSoak({ seed: 707, steps: 48, worker: false });
  assert.deepEqual(second.summary, first.summary);
  assert.deepEqual(second.state, first.state);
});

test('a second fixed seed exercises an independently generated lease recovery sequence', () => {
  const result = runLeaseSoak({ seed: 20261104, steps: 64 });
  assert.ok(result.summary.incidents >= 3);
  assert.ok(result.summary.workerCommands > 0);
  assert.ok(result.summary.failedCalls > 0 && result.summary.admittedCalls > 0);
});

test('AC-SOC-613 campaign track round trips preserve scoped active and completed lease histories', () => {
  const f = fixture();
  const select = track => ({ type: 'campaign', command: { action: 'select-track', track } });
  for (const complete of [false, true]) {
    let state = SOC.create({ scenario: 'smb', mode: 'sandbox' });
    state = SOC.dispatch(state, { type: 'campaign', command: { action: 'start' } });
    state = SOC.dispatch(state, select('enterprise'));
    for (const command of f.commands) state = SOC.dispatch(state, command);
    state = SOC.dispatch(state, revoke);
    if (complete) state = SOC.dispatch(state, { type: 'advance', minutes: 7 });
    const enterpriseHistory = structuredClone(state.transport.leaseRevocations);
    const enterpriseClock = state.clock;
    const context = { postMessage: result => { context.result = result; } };
    vm.createContext(context);
    vm.runInContext(SOC.workerSource(), context);
    context.onmessage({ data: { id: 'leave-enterprise', state: structuredClone(state), command: select('smb') } });
    assert.equal(context.result.error, undefined);
    state = SOC.dispatch(state, select('smb'));
    assert.deepEqual(JSON.parse(JSON.stringify(context.result.state)), state);
    assert.equal(state.transport, undefined, 'SMB starts with its own optional packs');
    state = SOC.restore(JSON.stringify(state));
    // Reuse link and incident IDs under a second tenant through genuine commands.
    for (const command of f.commands.filter(command => command.type === 'transport'))
      state = SOC.dispatch(state, command);
    state = SOC.dispatch(state, { type: 'advance', minutes: 1 });
    state = SOC.dispatch(state, revoke);
    const smbHistory = structuredClone(state.transport.leaseRevocations);
    assert.equal(smbHistory[0].id, enterpriseHistory[0].id);
    assert.notEqual(smbHistory[0].scope, enterpriseHistory[0].scope);
    state = SOC.dispatch(state, select('enterprise'));
    assert.equal(state.clock, enterpriseClock);
    assert.deepEqual(state.transport.leaseRevocations, enterpriseHistory);
    assert.deepEqual(SOC.restore(JSON.stringify(state)), state);
    const localCorruption = structuredClone(state);
    localCorruption.transport.leaseRevocations = [];
    localCorruption.transport.leaseRevocationCount = 0;
    assert.throws(() => SOC.restore(JSON.stringify(localCorruption)), /TRANSPORT_LEASE_HISTORY_MISSING/,
      'foreign-scope exemption cannot erase current-tenant receipts');
    if (!complete) {
      state = SOC.dispatch(state, { type: 'advance', minutes: 7 });
      assert.equal(state.transport.leaseRevocations[0].status, 'renumbered');
    }
    state = SOC.dispatch(state, select('smb'));
    assert.deepEqual(state.transport.leaseRevocations, smbHistory, 'other track advancement cannot complete SMB incident');
    assert.deepEqual(SOC.restore(JSON.stringify(state)), state);
  }
});
