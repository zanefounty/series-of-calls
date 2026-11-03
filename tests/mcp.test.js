// The MCP server (scripts/mcp.js): an AI client plays, inspects and debugs the game through typed tools.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createSession, TOOLS } = require('../scripts/lib/mcp-game');

const tools = (s) => (name, args = {}) => TOOLS.find((t) => t.name === name).run(s, args);

test('speaks MCP over stdio: initialize, list tools, call one, and errors as errors', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tubes-mcp-stdio-'));
  const input = path.join(dir, 'requests.jsonl'), output = path.join(dir, 'replies.jsonl'), error = path.join(dir, 'stderr.log');
  const requests = [
    { id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } },
    { id: 9, method: 'initialize', params: { protocolVersion: '1999-01-01' } },
    { method: 'notifications/initialized' },
    { id: 2, method: 'tools/list' },
    { id: 3, method: 'tools/call', params: { name: 'status', arguments: {} } },
    { id: 4, method: 'tools/call', params: { name: 'network', arguments: { network: 'no such thing at all' } } },
    { id: 5, method: 'tools/call', params: { name: 'nope' } },
    { id: 6, method: 'resources/list' },
  ];
  fs.writeFileSync(input, requests.map((request) => JSON.stringify({ jsonrpc: '2.0', ...request })).join('\n') + '\n');
  const fds = [fs.openSync(input, 'r'), fs.openSync(output, 'w'), fs.openSync(error, 'w')];
  let child, spawnError = null, exitInfo = null, lines = [];
  try {
    child = spawn(process.execPath, [path.join(__dirname, '..', 'scripts', 'mcp.js')], { stdio: fds });
    const closed = new Promise((resolve) => child.once('close', (code, signal) => resolve({ code, signal })));
    child.on('error', (errorEvent) => { spawnError = errorEvent; });
    child.on('exit', (code, signal) => { exitInfo = { code, signal }; });
    const requiredIds = [1, 9, 2, 3, 4, 5, 6], deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const text = fs.readFileSync(output, 'utf8'), rows = text.split('\n').filter(Boolean);
      lines = rows.map((line) => JSON.parse(line));
      if (requiredIds.every((id) => lines.some((line) => line.id === id))) break;
      if (spawnError) throw new Error(`MCP child spawn/error: ${spawnError.message}`);
      if (exitInfo) throw new Error(`MCP child exited before all replies (code=${exitInfo.code}, signal=${exitInfo.signal}; stderr=${fs.readFileSync(error, 'utf8')})`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.ok(requiredIds.every((id) => lines.some((line) => line.id === id)), 'MCP reply timeout waiting for the full request batch');
    child.kill();
    const close = await Promise.race([closed, new Promise((_, reject) => setTimeout(() => reject(new Error('MCP child did not stop after test cleanup')), 1000))]);
    assert.ok(close.code !== null || close.signal, 'MCP child was not reaped after the test completed');
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) child.kill();
    for (const fd of fds) fs.closeSync(fd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const reply = (id) => lines.find((line) => line.id === id);
  const init = reply(1);
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.equal(init.result.serverInfo.name, 'series-of-calls-sp');
  assert.ok(init.result.capabilities.tools);
  assert.equal(reply(9).result.protocolVersion, '2025-11-25', 'an unknown version gets the newest');
  const list = reply(2), names = list.result.tools.map((t) => t.name);
  for (const n of ['new_game', 'load_save', 'export_save', 'status', 'advance', 'network', 'city', 'find', 'traceroute', 'peering_check', 'hot_spots', 'actions', 'act', 'screen', 'panel', 'click', 'open_link', 'schema', 'catalog', 'state', 'results', 'ui']) assert.ok(names.includes(n), n);
  assert.ok(list.result.tools.every((t) => t.description && t.inputSchema && t.inputSchema.type === 'object'));
  const st = reply(3);
  assert.equal(st.result.isError, undefined);
  assert.equal(JSON.parse(st.result.content[0].text).home, 'Frankfurt', 'a game is loaded from the start');
  const bad = reply(4);
  assert.equal(bad.result.isError, true);
  assert.match(bad.result.content[0].text, /No network matches/);
  assert.equal(reply(5).error.code, -32602);
  assert.equal(reply(6).error.code, -32601);
  assert.equal(lines.filter((line) => line.id === undefined).length, 0, 'notifications get no answer');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('plays like a player: buy, answer the quote by its button, and run time forward', () => {
  const s = createSession(), T = tools(s);
  T('new_game', { city: 'fra', name: 'Test Tubes', seed: 7 });
  T('act', { action: 'launchBB', args: { city: 'fra' } });
  const tr = T('act', { action: 'buyTransit', args: { city: 'fra', net: 'cog', tier: 1 } });
  assert.ok(tr.toasts.some((t) => /Cogentle transit is live/.test(t)));
  const ix = T('act', { action: 'buyIx', args: { city: 'fra', tier: 1 } });
  assert.equal(ix.screen.where, 'modal', 'the DE-KICKS quote opens');
  const sign = ix.screen.buttons.find((b) => b.act === 'dkAccept');
  assert.ok(sign, 'with a Sign button');
  assert.throws(() => T('advance', { days: 1 }), /window is open/, 'no days pass behind an open window');
  const signed = T('click', { button: sign.n });
  assert.ok(signed.toasts.some((t) => /Port up at DE-KICKS/.test(t)));
  assert.equal(T('city', { city: 'fra' }).exchanges.find((x) => x.id === 'fra').yourPort, true);
  const a = T('advance', { days: 30 });
  assert.equal(a.daysRun, 30);
  assert.equal(T('status').day, 30);
  assert.ok(a.log.length > 0 && a.timing.totalMs > 0);
  // links go through the game's own build window
  const w = T('open_link', { from: 'fra', to: 'Amsterdam' });
  const b100 = w.screen.buttons.find((b) => b.act === 'buildLink' && b.args.tier === 1);
  T('click', { button: b100.n });
  assert.ok(T('status').pops.includes('Amsterdam'));
  assert.deepEqual(s.errors(), []);
});

test('the same seed and the same moves give the same game', () => {
  const run = () => {
    const s = createSession(), T = tools(s);
    T('new_game', { city: 'sin', seed: 42, name: 'Twin' });
    T('act', { action: 'launchBB', args: { city: 'sin' } });
    T('act', { action: 'buyTransit', args: { city: 'sin', net: 'ntt', tier: 1 } });
    T('advance', { days: 90 });
    const st = T('status');
    return [st.cash, st.traffic.servedGbps, st.incidents.length];
  };
  assert.deepEqual(run(), run());
});

test('reads the world and the network: networks, cities, search, traceroute, peering and hot spots', () => {
  const s = createSession(), T = tools(s);
  T('act', { action: 'launchBB', args: { city: 'fra' } });
  T('act', { action: 'buyTransit', args: { city: 'fra', net: 'cog', tier: 1 } });
  const dt = T('network', { network: 'Doitsche' });
  assert.equal(dt.type, 'Tier 1');
  assert.equal(dt.neededForTier1, true);
  assert.match(dt.you.howToPeer, /Paid peering only/);
  assert.equal(T('network', { network: '3203' }).id, 'dtk', 'by ASN too');
  const ams = T('city', { city: 'Amsterdam' });
  assert.ok(ams.exchanges.length >= 2 && ams.transit.length > 3);
  assert.deepEqual(ams.transit.map((x) => x.perGbps), ams.transit.map((x) => x.perGbps).slice().sort((x, y) => x - y), 'cheapest transit first');
  assert.ok(T('find', { query: 'marea' }).cables.length >= 1);
  assert.ok(T('find', { query: 'kicks', kind: 'exchange' }).exchanges.some((x) => x.id === 'fra'));
  const t = T('traceroute', { from: 'Frankfurt', to: 'ggl' });
  assert.match(t.text, /traceroute to www\.goggle/);
  assert.equal(t.asPath[1], 714, 'out through Cogentle');
  assert.throws(() => T('traceroute', { from: 'Tokyo', to: 'ggl' }), /no POP in Tokyo/);
  const p = T('peering_check', { network: 'nfx' });
  assert.ok(p.checks.some((c) => c.via === 'pni' && c.ok === false && /Gbps/.test(c.why)));
  const h = T('hot_spots', { limit: 3 });
  assert.equal(h.transitPorts[0].carrier, 'Cogentle');
  assert.ok(h.biggestTrafficStillOnTransit.length > 0);
  const st = T('status');
  assert.match(st.whyNotTier1, /you buy transit/);
  assert.ok(st.monthly.costBy.transit > 0);
  assert.deepEqual(s.errors(), []);
});

test('panels and the network list read as text with buttons', () => {
  const s = createSession(), T = tools(s);
  const p = T('panel', { city: 'fra', tab: 'peer' });
  assert.equal(p.where, 'panel');
  assert.match(p.text, /DE-KICKS/);
  assert.ok(p.buttons.some((b) => b.act === 'tab'));
  const l = T('panel', { network: 'ggl' });
  assert.equal(l.where, 'left');
  assert.match(l.text, /Goggle/);
  assert.deepEqual(s.errors(), []);
});

test('saves go out and come back, and a bug report save loads as the game loads it', () => {
  const s = createSession(), T = tools(s);
  T('act', { action: 'launchBB', args: { city: 'fra' } });
  T('advance', { days: 12 });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tubes-mcp-')), 'save.json');
  const out = T('export_save', { path: file });
  assert.ok(out.bytes > 1000);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(j.app, 'series-of-calls-sp');
  assert.equal(j.version, require('../package.json').version, 'stamped with the Series of Calls package version');
  const cash = T('status').cash;
  T('new_game', { city: 'nyc' });
  const back = T('load_save', { path: file });
  assert.equal(back.day, 12);
  assert.equal(back.cash, cash);
  assert.throws(() => T('load_save', { json: '{"nope":1}' }), /incompatible with Series of Calls/);
  assert.throws(() => T('load_save', {}), /either path or json/);
  // The inherited benchmark save has the upstream app identity and must not cross this product boundary.
  assert.throws(() => T('load_save', { path: path.join(__dirname, 'fixtures', 'big-network.json') }), /incompatible with Series of Calls/);
  assert.deepEqual(s.errors(), []);
});

test('only game actions: files, slots, settings and the clock stay out of reach', () => {
  const s = createSession(), T = tools(s);
  const acts = T('actions');
  assert.ok(acts.includes('buyTransit(city,net,tier)'), 'with their arguments');
  assert.ok(acts.includes('pni(city,net,tier)'));
  for (const no of ['slotDel', 'exportSave', 'importPick', 'langSet', 'speed', 'resetAsk']) assert.ok(!acts.some((a) => a.split('(')[0] === no), no);
  assert.throws(() => T('act', { action: 'slotDelGo' }), /not available/);
  assert.throws(() => T('act', { action: 'speed', args: { s: 4 } }), /use advance/);
  assert.throws(() => T('act', { action: 'noSuchThing' }), /no action/);
  assert.throws(() => T('click', { button: 99 }), /No button 99/);
});
