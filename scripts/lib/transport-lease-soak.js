'use strict';

// The reference model knows only this fixture's two parallel links, independent
// physical faults and lease deadlines. It never calls transport eligibility or
// advancement code to decide an expected result.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const SOC = require('../../src/game/55-communications');
const { fixture, call } = require('../../tests/lib/transport-lease-fixture');

const transport = command => ({ type: 'transport', command });
const advance = minutes => ({ type: 'advance', minutes });
const observe = (kind, id, available = true, power = true) =>
  transport({ action: 'observe', kind, id, available, power });
const domain = (id, failed) => transport({ action: 'domain', id, failed });
const revoke = durationMinutes => transport({ action: 'lease-revoke', link: 'leased-path', durationMinutes });
const digest = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));

function firstDifference(actual, expected, path = '$') {
  if (Object.is(actual, expected)) return null;
  if (!actual || !expected || typeof actual !== 'object' || typeof expected !== 'object') return path;
  for (const key of new Set([...Object.keys(actual), ...Object.keys(expected)])) {
    if (Object.hasOwn(actual, key) !== Object.hasOwn(expected, key)) return path + '.' + key;
    const difference = firstDifference(actual[key], expected[key], path + '.' + key);
    if (difference) return difference;
  }
  return null;
}

function randomSource(seed) {
  let value = seed >>> 0;
  return limit => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value % limit;
  };
}

function initialModel(state) {
  return {
    clock: state.clock, revision: state.revision, startedAt: state.transport.startedAt,
    scope: state.tenant || state.scenario,
    observed: Object.fromEntries(['origin', 'destination', 'leased-path', 'owned-path']
      .map(id => [id, { available: true, power: true }])),
    domains: {}, events: [],
  };
}

function expectedLinks(model) {
  const online = id => model.observed[id].available && model.observed[id].power;
  const sites = online('origin') && online('destination') &&
    !model.domains['origin-site'] && !model.domains['destination-site'];
  return {
    'leased-path': sites && online('leased-path') && !model.domains['primary-trench'] &&
      !model.events.some(event => event.due > model.clock),
    'owned-path': sites && online('owned-path') && !model.domains['independent-trench'],
  };
}

function expectedPath(model) {
  const links = expectedLinks(model);
  return links['leased-path'] ? ['leased-path'] : links['owned-path'] ? ['owned-path'] : [];
}

function transition(model, command) {
  model.revision++;
  if (command.type === 'advance') {
    model.clock += command.minutes;
    for (const event of model.events) if (event.due <= model.clock) {
      event.status = 'renumbered';
      event.completedAt = event.due;
    }
  } else if (command.type === 'transport') {
    const q = command.command;
    if (q.action === 'observe') model.observed[q.id] = { available: q.available, power: q.power };
    if (q.action === 'domain') model.domains[q.id] = q.failed;
    if (q.action === 'lease-revoke') model.events.push({
      id: 'lease-revocation-' + (model.events.length + 1), scope: model.scope, link: 'leased-path', generation: 1,
      startedAt: model.clock, due: model.clock + q.durationMinutes,
      durationMinutes: q.durationMinutes, openedRevision: model.revision,
      status: 'active', completedAt: null,
    });
  }
}

function checkModel(state, model, immutableNodes) {
  assert.equal(state.clock, model.clock, 'root clock');
  assert.equal(state.transport.clock, model.clock, 'transport clock');
  assert.equal(state.revision, model.revision, 'root revision');
  assert.deepEqual(state.transport.leaseRevocations || [], model.events, 'exact lease history');
  if (state.transport.leaseRevocationCount !== undefined)
    assert.equal(state.transport.leaseRevocationCount, model.events.length, 'durable incident count');
  assert.deepEqual(state.transport.domains, model.domains, 'independent failure domains');
  for (const [id, observed] of Object.entries(model.observed)) {
    const node = state.transport.sites[id] || state.transport.links[id];
    assert.deepEqual(node.observed, observed, 'independent observations for ' + id);
    assert.deepEqual({ desired: node.desired, effective: node.effective, generation: node.generation,
      provisioning: node.provisioning }, immutableNodes[id], 'configuration remains distinct from incidents');
  }
  const links = expectedLinks(model), edges = expectedPath(model);
  const path = SOC.transport.resourcePath(state, 'identity', 'service', 'voice');
  assert.equal(path.ready, edges.length > 0, 'independent reachability');
  assert.deepEqual(path.edges, edges, 'shortest available parallel path');
  assert.deepEqual(SOC.transport.inspect(state).linkStatus, links, 'public per-link observation');
  assert.equal(state.transport.totalCosts, 200 + 60 * Math.floor((model.clock - model.startedAt) / 60),
    'only the two orders and elapsed transport periods are charged');
  assert.equal(new Set(model.events.map(event => event.id)).size, model.events.length);
  assert.equal(new Set(model.events.map(event => event.openedRevision)).size, model.events.length);
  for (const event of model.events) {
    const root = state.commands.find(row => row.revision === event.openedRevision);
    if (root) {
      assert.equal(root.at, event.startedAt);
      assert.equal(root.scope, model.scope);
      assert.equal(root.transportGeneration, 1);
      assert.deepEqual(root.command, revoke(event.durationMinutes), 'root command proves incident');
    } else {
      assert.equal(state.commands.length, 1000, 'lineage absence requires actual bounded history');
      assert.ok(event.openedRevision < state.commands[0].revision, 'only old lineage may be pruned');
    }
  }
}

/** Reproducible bounded long play. Optional local soak:
 * node -e 'console.log(require("./scripts/lib/transport-lease-soak").runLeaseSoak({seed:42,steps:2000}).summary)'
 * Steps count successful generated root commands, excluding the boundary probes.
 * Time and incident/call counts are bounded to keep this a lease test rather
 * than a delegation-expiry, ledger-capacity or case-capacity test.
 */
function runLeaseSoak({ seed = 0x51c0ffee, steps = 1120, worker = true } = {}) {
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff, 'seed must be uint32');
  assert.ok(Number.isInteger(steps) && steps >= 32 && steps <= 5000, 'steps must be 32..5000');
  let state = fixture({ alternate: true }).state;
  const model = initialModel(state), random = randomSource(seed), recent = [], trace = [];
  const immutableNodes = Object.fromEntries(Object.entries({ ...state.transport.sites, ...state.transport.links })
    .map(([id, node]) => [id, copy({ desired: node.desired, effective: node.effective,
      generation: node.generation, provisioning: node.provisioning })]));
  const shadows = [], checkpoints = [];
  const stats = { accepted: 0, rejected: 0, calls: 0, failedCalls: 0, admittedCalls: 0,
    primaryPaths: 0, alternativePaths: 0, unavailablePaths: 0, workerCommands: 0 };
  let workerContext = null, workerState = null, activeSave = null;

  function apply(command, reject = false) {
    recent.push(copy(command));
    if (recent.length > 12) recent.shift();
    trace.push({ command: copy(command), reject });
    const before = JSON.stringify(state);
    if (reject) {
      assert.throws(() => SOC.dispatch(state, command), /TRANSPORT_LEASE/);
      assert.equal(JSON.stringify(state), before, 'rejection must leave the input untouched');
      stats.rejected++;
      return;
    }
    const priorMoney = copy(state.business.balance), oldCosts = state.transport.totalCosts;
    const route = expectedPath(model);
    state = SOC.dispatch(state, command);
    transition(model, command);
    stats.accepted++;
    checkModel(state, model, immutableNodes);
    if (command.type === 'transport' && command.command.action === 'lease-revoke') {
      assert.deepEqual(state.business.balance, priorMoney, 'lease withdrawal cannot charge money');
      assert.equal(state.transport.totalCosts, oldCosts);
    }
    if (command.type === 'interact') {
      stats.calls++;
      const interaction = state.interactions.at(-1);
      if (!route.length) {
        assert.equal(interaction.phase, 'failed');
        assert.match(interaction.outcome, /^TRANSPORT_/);
        stats.failedCalls++;
      } else {
        assert.notEqual(interaction.phase, 'failed', 'a ready, uncongested route admits the call');
        assert.deepEqual(state.transport.reservations.find(row => row.id === interaction.id)?.edges, route);
        stats.admittedCalls++;
      }
    }
    if (command.type === 'advance') for (const reservation of state.transport.reservations)
      assert.deepEqual(reservation.edges, expectedPath(model), 'active calls reroute after time advancement');
    const edges = expectedPath(model);
    stats[edges[0] === 'leased-path' ? 'primaryPaths' : edges.length ? 'alternativePaths' : 'unavailablePaths']++;
    for (const shadow of shadows) {
      shadow.state = SOC.dispatch(shadow.state, command);
      assert.deepEqual(shadow.state, state, 'continued serialized save at ' + shadow.at);
    }
    if (workerState) {
      workerContext.result = null;
      workerContext.onmessage({ data: { id: 'soak-' + stats.accepted, state: workerState, command: copy(command) } });
      assert.ok(workerContext.result && !workerContext.result.error, workerContext.result?.error);
      workerState = copy(workerContext.result.state);
      assert.deepEqual(workerState, state, 'worker continuation');
      stats.workerCommands++;
    }
  }

  function checkpoint(label, startWorker = false) {
    const serialized = JSON.stringify(state);
    const restored = SOC.restore(serialized);
    assert.deepEqual(restored, state, 'serialized checkpoint ' + label);
    shadows.push({ at: label, state: restored });
    checkpoints.push({ label, revision: state.revision, clock: state.clock, hash: digest(serialized) });
    if (startWorker && worker) {
      workerContext = { postMessage: result => { workerContext.result = result; } };
      vm.createContext(workerContext);
      vm.runInContext(SOC.workerSource(), workerContext);
      workerState = SOC.restore(serialized);
    }
  }

  function clearFaults() {
    for (const id of ['origin', 'destination']) apply(observe('site', id));
    for (const id of ['leased-path', 'owned-path']) apply(observe('link', id));
    for (const id of ['origin-site', 'destination-site', 'primary-trench', 'independent-trench'])
      apply(domain(id, false));
  }

  try {
    checkModel(state, model, immutableNodes);
    // Known discriminators ensure a seed cannot accidentally omit the critical branches.
    apply(revoke(7));
    apply(revoke(7), true);
    apply(observe('link', 'owned-path', false));
    apply(call('soak-no-path'));
    apply(advance(6));
    assert.equal(model.events[0].status, 'active');
    apply(advance(1));
    apply(call('soak-recovered'));
    apply(advance(5));
    assert.equal(state.interactions.at(-1).outcome, 'RESOLVED');
    apply(observe('link', 'owned-path'));
    apply(call('soak-rerouted'));
    apply(revoke(60));
    apply(advance(1));
    assert.deepEqual(state.transport.reservations.at(-1).edges, ['owned-path']);
    apply(observe('link', 'leased-path', false, false));
    apply(domain('primary-trench', true));
    apply(advance(59));
    assert.equal(state.interactions.at(-1).outcome, 'RESOLVED');
    apply(observe('link', 'owned-path', false));
    apply(observe('link', 'leased-path', true, false));
    apply(domain('primary-trench', false));
    assert.deepEqual(expectedPath(model), []);
    apply(observe('link', 'leased-path'));
    clearFaults();

    for (let index = 0; index < steps; index++) {
      if (index === Math.floor(steps / 2)) checkpoint('mid');
      if (index === Math.floor(steps * 0.9)) checkpoint('late', true);
      const choice = random(100);
      if (choice < 12 && model.clock < 7900) {
        const active = model.events.find(event => event.due > model.clock);
        const minutes = active && random(2) === 0 ?
          Math.max(1, active.due - model.clock - random(2)) : 1 + random(60);
        apply(advance(minutes));
      } else if (choice < 25 && model.events.length < 70) {
        const command = revoke(7 + random(54));
        if (expectedLinks(model)['leased-path']) apply(command);
        else {
          apply(command, true);
          apply(observe('link', 'leased-path', true, true));
        }
      } else if (choice < 33 && stats.calls < 60 &&
        !state.interactions.some(row => !['failed', 'resolved'].includes(row.phase))) {
        apply(call('soak-generated'));
      } else if (choice < 70) {
        const ids = ['leased-path', 'owned-path', 'origin', 'destination'];
        const id = ids[random(ids.length)];
        apply(observe(id.endsWith('path') ? 'link' : 'site', id, random(5) !== 0, random(5) !== 0));
      } else {
        const ids = ['primary-trench', 'independent-trench', 'origin-site', 'destination-site'];
        apply(domain(ids[random(ids.length)], random(4) === 0));
      }
    }
    clearFaults();
    const active = model.events.find(event => event.due > model.clock);
    if (active) apply(advance(active.due - model.clock));
    apply(advance(5));
    apply(revoke(7));
    activeSave = JSON.stringify(state);
    apply(advance(6));
    apply(advance(1));
    apply(call('soak-final-recovery'));
    apply(advance(5));
    assert.equal(state.interactions.at(-1).outcome, 'RESOLVED');
    assert.ok(stats.failedCalls > 0 && stats.admittedCalls > 0);
    assert.ok(stats.primaryPaths > 0 && stats.alternativePaths > 0 && stats.unavailablePaths > 0);
    if (steps >= 1000) {
      assert.ok(state.revision > 1000, 'more than 1000 real root commands');
      assert.equal(state.commands.length, 1000);
      assert.ok(model.events[0].openedRevision < state.commands[0].revision, 'first incident command really pruned');
      assert.ok(state.transport.leaseRevocations.some(event => event.openedRevision === model.events[0].openedRevision),
        'old incident survives command pruning');
    }
    return { state, activeSave, summary: { seed, steps, ...stats, incidents: model.events.length,
      clock: state.clock, revision: state.revision, firstRetainedRevision: state.commands[0].revision,
      stateHash: digest(state), traceHash: digest(trace), checkpoints } };
  } catch (error) {
    // Compact diagnostics retain the seed, checkpoint hash and replay tail, never a huge save dump.
    throw new Error('Lease soak failed: ' + JSON.stringify({ seed, steps, accepted: stats.accepted,
      clock: model.clock, stateHash: digest(state), checkpoints, recent,
      firstDifference: firstDifference(error.actual, error.expected) }) + '\n' + error.message.slice(0, 1600));
  }
}

module.exports = { runLeaseSoak };
