const test = require('node:test');
const assert = require('node:assert/strict');
const { createSession, TOOLS } = require('../scripts/lib/mcp-game');

test('AC-SOC-361 SP MCP reports the same initial customer level before and after save restoration', () => {
  const session = createSession();
  const call = (name, args = {}) => TOOLS.find(tool => tool.name === name).run(session, args);
  call('new_game', { city: 'fra', seed: 7 });
  for (const days of [0, 30]) {
    if (days) call('advance', { days });
    const before = call('status');
    assert.equal(before.level, 1, 'the first customer level is one even before a promotion');
    const save = call('export_save');
    call('new_game', { city: 'nyc', seed: 99 });
    call('load_save', { json: JSON.stringify(save) });
    assert.deepEqual(call('status'), before, 'restoring a save must not appear to promote the player');
  }
});
