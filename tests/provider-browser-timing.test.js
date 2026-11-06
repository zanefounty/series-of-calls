'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const elapsedClock = require('../scripts/lib/elapsed-clock.js');

test('elapsed gameplay timing works when the calendar clock is unavailable', () => {
  const calendarNow = Date.now;
  try {
    Date.now = () => { throw new Error('calendar clock changed'); };
    const elapsed = elapsedClock();
    const first = elapsed(), second = elapsed();
    assert.ok(Number.isFinite(first) && first >= 0);
    assert.ok(second >= first);
  } finally { Date.now = calendarNow; }
});

test('elapsed gameplay duration preserves milliseconds and refuses invalid clocks', () => {
  let now = 100;
  const elapsed = elapsedClock(() => now);
  now = 160;
  assert.equal(elapsed(), 60);
  for (const invalid of [99, NaN, Infinity]) {
    now = invalid;
    assert.throws(elapsed, /Invalid elapsed gameplay duration/);
  }
  assert.throws(() => elapsedClock(() => NaN), /Invalid elapsed clock start/);
});
