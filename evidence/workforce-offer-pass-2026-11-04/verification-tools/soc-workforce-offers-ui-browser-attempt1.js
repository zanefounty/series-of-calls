#!/usr/bin/env node
'use strict';

// Diagnostic visible-controls journey for Queueberry's synthetic WFM offer.
// It exercises actual browser controls and compares the resulting command log
// with a pure fixture replay; it does not create or inject application state.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const ROOT = path.resolve(process.env.SOC_WORKFORCE_ROOT || '/work');
const OUT_ROOT = process.env.SOC_WORKFORCE_OFFERS_EVIDENCE_DIR || '/out';
const SOC = require(path.join(ROOT, 'src/game/55-communications'));
const { journey } = require(path.join(ROOT, 'tests/lib/workforce-offer-fixture'));
const { referenceUiAction, advanceButtonPlan, sourceManifest, inputDrift } = require(path.join(ROOT, 'scripts/browser-campaigns'));
const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 1000 },
  { id: 'mobile', width: 390, height: 844 }
];
const ENGINES = ['chromium', 'firefox', 'webkit'];
const MODE = process.env.SOC_WORKFORCE_MODE || 'prototype';
assert.ok(['prototype', 'final'].includes(MODE), 'SOC_WORKFORCE_MODE_MUST_BE_PROTOTYPE_OR_FINAL');
const CONTINUE_CASES = MODE === 'final' || process.env.SOC_WORKFORCE_CONTINUE === '1';
const MATRIX = MODE === 'final'
  ? ENGINES.flatMap(engine => VIEWPORTS.map(viewport => ({ engine, viewport })))
  : [{ engine: 'chromium', viewport: VIEWPORTS[0] }];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const fileSha = file => sha(fs.readFileSync(file));
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
const OUT = path.join(OUT_ROOT, runId);
const caseLimitMs = Number(process.env.SOC_WORKFORCE_CASE_MS || 180000);
const totalLimitMs = Number(process.env.SOC_WORKFORCE_TOTAL_MS || 1200000);
assert.ok(Number.isSafeInteger(caseLimitMs) && caseLimitMs >= 1000, 'INVALID_CASE_LIMIT');
assert.ok(Number.isSafeInteger(totalLimitMs) && totalLimitMs >= caseLimitMs, 'INVALID_TOTAL_LIMIT');

function inputManifest() {
  const files = sourceManifest();
  const fixture = path.join(ROOT, 'tests/lib/workforce-offer-fixture.js');
  return { ...files, 'tests/lib/workforce-offer-fixture.js': fileSha(fixture), 'soc-workforce-offers-ui-browser.js': fileSha(__filename) };
}
function treeManifest(directory) {
  const entries = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else entries.push([path.relative(directory, file).split(path.sep).join('/'), fileSha(file)]);
    }
  };
  walk(directory);
  return { files: entries.length, sha256: sha(JSON.stringify(entries)), entries };
}
function interactionAssignments(state) {
  return state.interactions.filter(item => ['wfm-first', 'wfm-second'].includes(item.caseId))
    .map(item => ({ caseId: item.caseId, agent: item.agent, phase: item.phase, outcome: item.outcome }));
}
function assertOutcome(state) {
  assert.equal(state.scenario, 'enterprise');
  assert.equal(state.jurisdiction, 'AU');
  assert.equal(state.resources.people.desired.people, 2);
  assert.equal(state.resources.people.desired.entitlements, 2);
  assert.deepEqual(state.resources.phone.desired.routes, [{ prefix: '+61', target: 'service' }]);
  assert.deepEqual(interactionAssignments(state), [
    { caseId: 'wfm-first', agent: 'agent-01', phase: 'resolved', outcome: 'RESOLVED' },
    { caseId: 'wfm-second', agent: 'agent-02', phase: 'resolved', outcome: 'RESOLVED' }
  ]);
  assert.equal(new Set(interactionAssignments(state).map(item => item.agent)).size, 2);
  const wfm = state.workforceOffers;
  assert.equal(wfm.tenant, 'canopy-group');
  assert.equal(wfm.effective.units, 0);
  assert.equal(wfm.provisioning.status, 'ready');
  assert.equal(wfm.nextInvoiceAt, null);
  assert.equal(wfm.integration.tests.at(-1).status, 'passed');
  assert.equal(wfm.integration.tests[0].status, 'failed');
  assert.deepEqual(wfm.integration.bindings.map(binding => binding.person), ['agent-01']);
  const manual = state.workforceOps.forecasts.at(-1);
  const scoped = wfm.integration.forecasts.at(-1);
  assert.ok(manual && scoped, 'BOTH_FORECASTS_REQUIRED');
  assert.equal(manual.samples, 1);
  assert.equal(scoped.samples, 1);
  assert.deepEqual(scoped.coveredPeople, ['agent-01']);
  assert.equal(manual.arrivals, scoped.arrivals);
  assert.ok(manual.projectedCapacity > scoped.projectedCapacity, 'WFM_SCOPE_MUST_REFLECT_ONE_BOUND_AGENT');
  assert.equal(wfm.costRecords.length, 2);
  assert.deepEqual(wfm.costRecords.map(row => ({ units: row.units, periodMinutes: row.periodMinutes, unit: row.unit, cents: row.cents })), [
    { units: 1, periodMinutes: 60, unit: 'agent', cents: 4200 },
    { units: 1, periodMinutes: 60, unit: 'agent', cents: 4200 }
  ]);
  assert.equal(wfm.desired.units, 0);
  assert.equal(wfm.effective.units, 0);
  assert.equal(state.business.externalInvoices.filter(row => row.source === 'workforce-offers').length, 2);
  assert.deepEqual(state.business.externalInvoices.filter(row => row.source === 'workforce-offers').map(row => row.cents), [4200, 4200]);
}
function fixtureWithStaleCoverageRecovery(fixture) {
  const commands = structuredClone(fixture.commands);
  const forecastAt = commands.findIndex(item => item.type === 'workforce-offers' && item.command?.action === 'forecast');
  assert.notEqual(forecastAt, -1, 'FIXTURE_QUEUEBERRY_FORECAST_REQUIRED');
  const recovery = [
    { type: 'workforce-offers', command: { action: 'observe-integration', supplierAvailable: true, applicationAvailable: true } },
    { type: 'workforce-offers', command: { action: 'test-integration' } },
    { type: 'workforce-offers', command: { action: 'bind-person', person: 'agent-01' } },
    { type: 'workforce-offers', command: { action: 'forecast', channel: 'voice', skill: 'service', language: 'en', horizon: 60, method: 'mean' } }
  ];
  commands.splice(forecastAt + 1, 0, ...recovery);
  const expectedState = commands.reduce(SOC.dispatch, SOC.create(fixture.options));
  return { commands, recovery, expectedState };
}

async function waitIdle(page) {
  await page.waitForFunction(() => typeof SCT !== 'undefined' && !SCT.busy, null, { timeout: 15000 });
}
async function waitRevision(page, previous) {
  await page.waitForFunction(rev => SCT.state?.revision > rev, previous, { timeout: 15000 });
  await waitIdle(page);
  const error = await page.evaluate(() => SCT.error);
  if (error) throw new Error(`UI_ERROR:${error}`);
}
async function click(page, selector) {
  const previous = await page.evaluate(() => SCT.state.revision);
  await page.locator(selector).click({ timeout: 12000 });
  await waitRevision(page, previous);
}
async function fillField(form, name, value) {
  const control = form.locator(`[name="${name}"]`);
  await control.waitFor({ state: 'visible', timeout: 12000 });
  const kind = await control.evaluate(element => ({ tag: element.tagName.toLowerCase(), type: element.type }));
  if (kind.type === 'checkbox') await control.setChecked(Boolean(value));
  else if (kind.tag === 'select') await control.selectOption(String(value));
  else await control.fill(Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''));
}
async function submit(page, selector, fields = {}) {
  const form = page.locator(selector);
  for (const [name, value] of Object.entries(fields)) await fillField(form, name, value);
  await click(page, `${selector} button[type="submit"]`);
}
async function visibleAdvance(page, minutes) {
  let remaining = minutes;
  // The business period control is an explicit visible 60-minute advance.
  while (remaining >= 60 && await page.locator('[data-biz="period"]').count()) {
    await click(page, '[data-biz="period"]');
    remaining -= 60;
  }
  if (remaining === 0) return;
  const plan = advanceButtonPlan(remaining);
  for (let count = 0; count < plan.five; count++) await click(page, '[data-soc="five"]');
  for (let count = 0; count < plan.minute; count++) await click(page, '[data-soc="minute"]');
}
async function doReference(page, command) {
  const ui = referenceUiAction(command);
  if (ui.kind === 'resource-form') {
    await page.locator(ui.select).click();
    return submit(page, ui.form, ui.fields);
  }
  if (ui.kind === 'clock-buttons') return visibleAdvance(page, ui.minutes);
  if (ui.kind === 'interaction-form') return submit(page, ui.form, ui.fields);
  if (ui.kind === 'button') return click(page, ui.selector);
  throw new Error(`UNSUPPORTED_REFERENCE_MAPPING:${JSON.stringify(ui)}`);
}
async function doCommand(page, envelope) {
  if (envelope.type === 'configure' || envelope.type === 'interact' || envelope.type === 'meeting' || envelope.type === 'advance') {
    return doReference(page, envelope);
  }
  const command = envelope.command;
  if (envelope.type === 'business' && command.action === 'start') return click(page, '[data-biz="start"]');
  if (envelope.type === 'workforce') {
    if (command.action === 'start') return click(page, '[data-sa-start="workforce"] button[type="submit"]');
    if (command.action === 'arrival') return submit(page, '[data-attendance="arrival"]', {
      channel: command.channel, skill: command.skill, language: command.language,
      arrivals: command.count, sampleMinutes: command.sampleMinutes
    });
    if (command.action === 'staffing-forecast') return submit(page, '[data-attendance="staffing-forecast"]', {
      channel: command.channel, skill: command.skill, language: command.language, horizon: command.horizon
    });
  }
  if (envelope.type === 'workforce-offers') {
    if (command.action === 'start') return click(page, '[data-workforce-offers-action="start"]');
    if (command.action === 'order') return submit(page, '[data-workforce-offers="order"]', { units: command.units });
    if (command.action === 'integrate') return click(page, '[data-workforce-offers="integrate"] button[type="submit"]');
    if (command.action === 'observe-integration') return submit(page, '[data-workforce-offers="observe"]', {
      supplierAvailable: String(command.supplierAvailable), applicationAvailable: String(command.applicationAvailable)
    });
    if (command.action === 'test-integration') return click(page, '[data-workforce-offers-action="test"]');
    if (command.action === 'bind-person') return submit(page, '[data-workforce-offers="bind"]', { person: command.person });
    if (command.action === 'forecast') return submit(page, '[data-workforce-offers="forecast"]', {
      channel: command.channel, skill: command.skill, language: command.language,
      horizon: command.horizon, method: command.method
    });
  }
  throw new Error(`NO_VISIBLE_SOC_ACTION:${JSON.stringify(envelope)}`);
}

async function main() {
  const baseFixture = journey();
  const checkedFixture = fixtureWithStaleCoverageRecovery(baseFixture);
  assertOutcome(checkedFixture.expectedState);
  if (process.argv.includes('--preflight')) {
    console.log(JSON.stringify({ status: 'fixture-preflight-passed', baseCommands: baseFixture.commands.length, recoveryCommands: checkedFixture.recovery.length, finalClock: checkedFixture.expectedState.clock, invoiceCount: checkedFixture.expectedState.workforceOffers.costRecords.length, resolvedAssignments: interactionAssignments(checkedFixture.expectedState) }));
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const initialInputs = inputManifest();
  const report = {
    scope: 'Visible-controls diagnostic of the synthetic Queueberry WFM offer: delayed activation, observed integration failure and recovery, named-person coverage, scoped forecast comparison, independent voice routing, and prepaid 60-minute invoice/renewal/cancellation. Not full product or release acceptance.',
    status: 'running', startedAt: new Date().toISOString(), mode: MODE,
    caseLimitMs, totalLimitMs, node: process.version,
    playwright: require(path.join(ROOT, 'node_modules/playwright-core/package.json')).version,
    fixtureInputSha256: initialInputs['tests/lib/workforce-offer-fixture.js'], inputs: initialInputs,
    cases: [], errors: []
  };
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soc-wfm-ui-build-'));
  let server;
  const started = Date.now();
  try {
    require(path.join(ROOT, 'scripts/build')).build({ out: buildDir });
    const artifact = treeManifest(buildDir);
    report.artifact = { sha256: artifact.sha256, files: artifact.files, manifest: artifact.entries };
    server = http.createServer(require(path.join(ROOT, 'scripts/serve')).handler(buildDir));
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const playwright = require(path.join(ROOT, 'node_modules/playwright-core'));
    for (const engine of [...new Set(MATRIX.map(item => item.engine))]) {
      const browser = await playwright[engine].launch({ headless: true, ...(engine === 'chromium' ? { args: ['--no-sandbox'] } : {}) });
      report.browserVersions ||= {};
      report.browserVersions[engine] = browser.version();
      for (const { viewport } of MATRIX.filter(item => item.engine === engine)) {
        if (Date.now() - started > totalLimitMs) throw new Error('TOTAL_RUNTIME_LIMIT_EXCEEDED');
        const key = `${engine}-${viewport.id}`;
        const row = { key, engine, viewport, status: 'running', errors: [], steps: [] };
        report.cases.push(row);
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        const trace = path.join(OUT, `${key}.trace.zip`), screenshot = path.join(OUT, `${key}.png`);
        let page, timer;
        try {
          await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
          page = await context.newPage();
          page.setDefaultTimeout(12000);
          page.on('pageerror', error => row.errors.push(`pageerror:${error.message}`));
          page.on('console', message => { if (message.type() === 'error') row.errors.push(`console:${message.text()}`); });
          await Promise.race([
            (async () => {
              await page.goto(`http://127.0.0.1:${server.address().port}/series-of-calls/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
              await page.locator('[data-act="training"]').click();
              await page.waitForFunction(() => SCT.locked && document.querySelector('#soc-console:not([hidden])'), null, { timeout: 15000 });
              await page.locator('#soc-scenario').selectOption('enterprise');
              await page.locator('#soc-jurisdiction').selectOption('AU');
              await page.locator('#soc-mode').selectOption('guided');
              await page.locator('[data-soc="new"]').click();
              // A new root deliberately resets revision to zero, so wait for
              // the seeded empty command log instead of requiring revision > old.
              await page.waitForFunction(() => SCT.state.scenario === 'enterprise' && SCT.state.jurisdiction === 'AU' && SCT.state.mode === 'guided' && SCT.state.clock === 0 && SCT.state.revision === 0 && SCT.state.commands.length === 0, null, { timeout: 15000 });
              await waitIdle(page);
              const fixture = journey();
              const extended = fixtureWithStaleCoverageRecovery(fixture);
              row.fixtureOptions = fixture.fixtureOptions;
              row.fixtureCommandCount = fixture.commands.length;
              row.recoveryCommandCount = extended.recovery.length;
              row.tenant = extended.expectedState.workforceOffers.tenant;
              let sawFailedIntegrationTest = false;
              let savedRecoveryEvidence = false;
              let recoveryCommandsStarted = false;
              let recoveryScreenshotTaken = false;
              for (let index = 0; index < extended.commands.length; index++) {
                const envelope = extended.commands[index];
                if (index === fixture.commands.findIndex(item => item.type === 'workforce-offers' && item.command?.action === 'forecast') + 1) recoveryCommandsStarted = true;
                await doCommand(page, envelope);
                row.steps.push({ type: envelope.type, action: envelope.command?.action || null, expectedRevision: await page.evaluate(() => SCT.state.revision) });
                if (envelope.type === 'workforce-offers' && envelope.command.action === 'test-integration') {
                  const test = await page.evaluate(() => SCT.state.workforceOffers.integration.tests.at(-1));
                  if (test?.status === 'failed' && !sawFailedIntegrationTest) {
                    sawFailedIntegrationTest = true;
                    const shot = path.join(OUT, `${key}-integration-failed.png`);
                    await page.screenshot({ path: shot, fullPage: true });
                    row.failureScreenshot = path.basename(shot);
                  } else if (test?.status === 'passed') {
                    savedRecoveryEvidence = true;
                  }
                }
                if (envelope.type === 'workforce-offers' && envelope.command.action === 'forecast') {
                  const shotName = recoveryCommandsStarted && !recoveryScreenshotTaken ? `${key}-forecast-rebound.png` : `${key}-forecast-recovered.png`;
                  const shot = path.join(OUT, shotName);
                  await page.screenshot({ path: shot, fullPage: true });
                  if (shotName.endsWith('forecast-rebound.png')) { row.reboundScreenshot = path.basename(shot); recoveryScreenshotTaken = true; }
                  else row.recoveryScreenshot = path.basename(shot);
                }
              }
              const actual = await page.evaluate(() => JSON.parse(JSON.stringify(SCT.state)));
              row.visibleCommands = actual.commands.map(entry => structuredClone(entry.command));
              const replayed = row.visibleCommands.reduce(SOC.dispatch, SOC.create(fixture.options));
              row.commandSha256 = sha(JSON.stringify(row.visibleCommands));
              row.stateSha256 = sha(JSON.stringify(actual));
              row.replayStateSha256 = sha(JSON.stringify(replayed));
              row.fixtureStateSha256 = sha(JSON.stringify(extended.expectedState));
              row.actualStateFile = `${key}-actual-state.json`;
              row.replayStateFile = `${key}-replay-state.json`;
              row.fixtureStateFile = `${key}-fixture-state.json`;
              fs.writeFileSync(path.join(OUT, row.actualStateFile), JSON.stringify(actual, null, 2) + '\n');
              fs.writeFileSync(path.join(OUT, row.replayStateFile), JSON.stringify(replayed, null, 2) + '\n');
              fs.writeFileSync(path.join(OUT, row.fixtureStateFile), JSON.stringify(extended.expectedState, null, 2) + '\n');
              assert.deepEqual(actual, replayed, 'FULL_VISIBLE_COMMAND_REPLAY_MISMATCH');
              assert.ok(sawFailedIntegrationTest && savedRecoveryEvidence && recoveryScreenshotTaken, 'FAILURE_REPAIR_REBIND_EVIDENCE_REQUIRED');
              const semanticActual = structuredClone(actual), semanticFixture = structuredClone(extended.expectedState);
              delete semanticActual.commands; delete semanticFixture.commands;
              delete semanticActual.revision; delete semanticFixture.revision;
              assert.deepEqual(semanticActual, semanticFixture, 'VISIBLE_FIXTURE_OUTCOME_MISMATCH');
              assertOutcome(actual);
              row.comparison = 'Full visible-control command envelopes, including expectedRevision, replay to exact full root equality. Fixture semantic comparison uses the fixture plus the added same-clock stale-binding recovery sequence, omitting only revision and command history because visible controls split clock advances into separate commands.';
              row.workforceAssignments = actual.workforceOps.assignments.filter(assignment => ['complete', 'wrap'].includes(assignment.status));
              row.forecasts = { manual: actual.workforceOps.forecasts.at(-1), queueberry: actual.workforceOffers.integration.forecasts.at(-1) };
              row.invoiceRows = actual.workforceOffers.costRecords;
              row.externalInvoices = actual.business.externalInvoices.filter(invoice => invoice.source === 'workforce-offers');
              row.visibleEvidence = await page.evaluate(() => ({
                offerText: document.querySelector('#soc-workforce-offers')?.innerText,
                businessText: document.querySelector('#soc-business')?.innerText,
                attendanceText: document.querySelector('#soc-attendance')?.innerText
              }));
              assert.deepEqual(row.errors, []);
              row.status = 'diagnostic-passed';
            })(),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`CASE_RUNTIME_LIMIT:${caseLimitMs}`)), caseLimitMs); })
          ]);
        } catch (error) {
          row.status = 'failed'; row.error = String(error.stack || error); row.errors.push(String(error.message || error));
          if (page) try { await page.screenshot({ path: path.join(OUT, `${key}-failed.png`), fullPage: true, timeout: 5000 }); } catch (shotError) { row.errors.push(`failure-screenshot:${shotError.message}`); }
        } finally {
          clearTimeout(timer);
          if (page) try { await page.screenshot({ path: screenshot, fullPage: true, timeout: 10000 }); row.screenshot = screenshot; } catch (error) { row.errors.push(`screenshot:${error.message}`); }
          try { await context.tracing.stop({ path: trace }); row.trace = trace; } catch (error) { row.errors.push(`trace:${error.message}`); }
          await context.close();
          for (const file of [screenshot, trace, path.join(OUT, `${key}-failed.png`), path.join(OUT, `${key}-integration-failed.png`), path.join(OUT, `${key}-forecast-recovered.png`), path.join(OUT, `${key}-forecast-rebound.png`), path.join(OUT, `${key}-actual-state.json`), path.join(OUT, `${key}-replay-state.json`), path.join(OUT, `${key}-fixture-state.json`)]) if (fs.existsSync(file)) {
            row.artifacts ||= []; row.artifacts.push({ file: path.basename(file), bytes: fs.statSync(file).size, sha256: fileSha(file) });
          }
          if (row.status === 'diagnostic-passed' && row.errors.length) row.status = 'failed';
          fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
          console.log(`${key} ${row.status}`);
        }
        if (row.status === 'failed' && !CONTINUE_CASES) break;
      }
      await browser.close();
      if (report.cases.at(-1)?.status === 'failed' && !CONTINUE_CASES) break;
    }
    report.status = report.cases.length === MATRIX.length && report.cases.every(row => row.status === 'diagnostic-passed' && row.errors.length === 0) ? 'diagnostic-passed' : 'failed';
  } catch (error) {
    report.status = 'failed'; report.errors.push(String(error.stack || error));
  } finally {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    report.sourceDrift = inputDrift(initialInputs, inputManifest());
    if (report.sourceDrift.length) report.status = 'failed';
    report.finishedAt = new Date().toISOString(); report.elapsedMs = Date.now() - started;
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, report: path.join(OUT, 'report.json'), cases: report.cases.length, sourceDrift: report.sourceDrift }));
    if (report.status !== 'diagnostic-passed') process.exitCode = 1;
  }
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
