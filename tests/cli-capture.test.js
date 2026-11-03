'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cliCapture = require('./cli-capture');

test('CLI capture returns exact stdout and stderr from a real child', () => {
  const result = cliCapture(process.execPath, ['-e', "process.stdout.write('out');process.stderr.write('err')"]);
  assert.equal(result.stdout, 'out');
  assert.equal(result.stderr, 'err');
  assert.equal(result.status, 0);
});

test('CLI capture throws with status and both streams for a nonzero child', () => {
  assert.throws(
    () => cliCapture(process.execPath, ['-e', "process.stdout.write('before');process.stderr.write('problem');process.exitCode=7"]),
    (error) => error.status === 7 && error.stdout === 'before' && error.stderr === 'problem',
  );
});

test('CLI capture reports timeout and preserves output written before timeout', () => {
  assert.throws(
    () => cliCapture(process.execPath, ['-e', "process.stdout.write('started');setInterval(()=>{},1000)"], { timeout: 2000 }),
    (error) => error.code === 'ETIMEDOUT' && error.stdout === 'started',
  );
});
