'use strict';

const { performance } = require('node:perf_hooks');

// Calendar-clock corrections must not change an elapsed gameplay measurement.
module.exports = function elapsedClock(now = () => performance.now()) {
  const start = now();
  if (!Number.isFinite(start)) throw new Error('Invalid elapsed clock start');
  return () => {
    const elapsed = now() - start;
    if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('Invalid elapsed gameplay duration');
    return elapsed;
  };
};
