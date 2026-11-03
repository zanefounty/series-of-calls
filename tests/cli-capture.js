'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Capture CLI output through regular files. Captured child-process pipes are
// denied in some restricted runners, while inherited regular-file descriptors
// still execute the real command and preserve both output streams.
function cliCapture(file, args = [], options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-capture-'));
  const stdoutPath = path.join(dir, 'stdout');
  const stderrPath = path.join(dir, 'stderr');
  let stdoutFd;
  let stderrFd;
  let result;
  let stdout = '';
  let stderr = '';
  let failure;

  try {
    stdoutFd = fs.openSync(stdoutPath, 'w+');
    stderrFd = fs.openSync(stderrPath, 'w+');
    const { encoding = 'utf8', timeout, cwd, env, windowsHide, argv0 } = options;
    result = spawnSync(file, args, {
      cwd,
      env,
      timeout,
      windowsHide,
      argv0,
      stdio: ['ignore', stdoutFd, stderrFd],
    });
  } catch (error) {
    failure = error;
  } finally {
    if (stdoutFd !== undefined) {
      try { fs.closeSync(stdoutFd); } catch (error) { failure ||= error; }
    }
    if (stderrFd !== undefined) {
      try { fs.closeSync(stderrFd); } catch (error) { failure ||= error; }
    }
    try {
      if (fs.existsSync(stdoutPath)) stdout = fs.readFileSync(stdoutPath, encodingFor(options.encoding));
      if (fs.existsSync(stderrPath)) stderr = fs.readFileSync(stderrPath, encodingFor(options.encoding));
    } catch (error) {
      failure ||= error;
    }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (error) { failure ||= error; }
  }

  if (failure) {
    failure.stdout = stdout;
    failure.stderr = stderr;
    throw failure;
  }
  if (result.error || result.status !== 0) {
    const error = new Error(result.error
      ? `Command failed: ${result.error.message}`
      : `Command exited with status ${result.status}${result.signal ? ` (${result.signal})` : ''}`);
    error.cause = result.error;
    error.code = result.error && result.error.code;
    error.status = result.status;
    error.signal = result.signal;
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  }
  return { stdout, stderr, status: result.status, signal: result.signal };
}

function encodingFor(encoding) {
  return encoding === 'buffer' ? null : (encoding || 'utf8');
}

module.exports = cliCapture;
