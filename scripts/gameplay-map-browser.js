#!/usr/bin/env node
'use strict';
/* Bounded real-browser map regression. Browser evaluation only reads state/DOM.
 * Run against a prepared server: SOC_MAP_BROWSER_URL=http://127.0.0.1:8093/ node scripts/gameplay-map-browser.js
 * Raw screenshots and traces stay outside Git. This is not a full mission matrix.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const playwright = require('playwright-core');
const root = path.resolve(__dirname, '..');
const stamp = new Date().toISOString().replace(/[^0-9]/g, '');
const output = path.resolve(process.env.SOC_MAP_BROWSER_OUT || `/tmp/soc-map-browser-${stamp}`);
if (!output.startsWith('/tmp/')) throw new Error('SOC_MAP_BROWSER_OUT must be under /tmp');
const url = process.env.SOC_MAP_BROWSER_URL || 'http://127.0.0.1:8093/';
const engines = (process.env.SOC_MAP_BROWSER_ENGINES || 'chromium').split(',');
const viewports = [{width:1366,height:768},{width:1440,height:900},{width:390,height:844}]
  .filter(v => !process.env.SOC_MAP_BROWSER_WIDTH || v.width === Number(process.env.SOC_MAP_BROWSER_WIDTH));
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function sourceManifest() {
  const files = [];
  const visit = relative => { for (const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})) {
    const file = path.posix.join(relative,entry.name);
    if (entry.isDirectory()) visit(file); else if (entry.isFile()) files.push(file);
  }};
  ['src','content','site'].forEach(visit);
  files.push('package.json','package-lock.json','scripts/gameplay-map-browser.js','scripts/lib/page.js');
  return Object.fromEntries(files.sort().map(file => [file,hash(fs.readFileSync(path.join(root,file)))]));
}
const report = {startedAt:new Date().toISOString(),scope:'Preliminary bounded map/quote browser regression. No state injection, clock injection, mission completion, full keyboard journey, stale-command reproduction or human playtest claim.',url,playwright:require('playwright-core/package.json').version,sourceBefore:sourceManifest(),runs:[],status:'running'};
fs.mkdirSync(output,{recursive:true});
function writeReport() { fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n'); }
const visible = (page, selector) => page.locator(`${selector}:visible`).first();
const click = (page, selector) => visible(page,selector).click();
async function observation(page) {
  return page.evaluate(() => {
    const state = SCP.state, model = providerModel(), view = SOC_PROVIDER_UI.view();
    return {clock:state.clock,revision:state.revision,cash:state.business.balance.cash,speed:SCP.speed,busy:SCP.busy,
      customers:state.providerCampaign.customers.map(c=>({id:c.id,planId:c.planId,status:c.status,stages:c.stages})),
      projects:state.providerCampaign.projects.map(p=>({id:p.id,operationId:p.operationId,status:p.status})),
      completed:state.providerCampaign.jobs.filter(j=>j.status==='completed').length,
      periodOutcome:model.outcomeAggregate||model.periodOutcome||model.outcome,
      selection:view.selection,camera:view.camera,sheetOpen:view.sheetOpen,quoteModal:view.quoteModal,
      legend:document.querySelector('.provider-world-legend')?.textContent,
      legendFontSize:getComputedStyle(document.querySelector('.provider-world-legend')).fontSize,
      pageWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
      hud:document.querySelector('.provider-hud')?.textContent,
      resources:[...document.querySelectorAll('.provider-resource-node')].map(n=>({id:n.dataset.id,text:n.textContent}))};
  });
}
async function projectionFixtures(context,directory,viewport) {
  const page=await context.newPage(),results=[];
  try {
    await page.setContent('<!doctype html><html><body><div class="provider-app"><div class="provider-shell"><main class="provider-main"><div data-provider-region="world"></div></main></div></div></body></html>');
    await page.addStyleTag({content:fs.readFileSync(path.join(root,'src/styles/98-provider.css'),'utf8')});
    for(const file of ['src/game/93-ui/70-provider-hud.js','src/game/96-map/90-service-scene.js','src/game/96-map/95-provider-canvas.js'])await page.addScriptTag({path:path.join(root,file)});
    for(const count of [1,2,20]) {
      // Deliberate presentation-only fixture: no SOC state, dispatcher, clock,
      // earned customers or campaign victory exist on this isolated page.
      const geometry=await page.evaluate(({count,viewport})=>{
        const fixture={customers:Array.from({length:count},(_,i)=>({id:`fixture-${i}`,name:`Layout customer ${i+1}`,market:'au-sydney',status:'layout fixture',services:[]})),offers:[],suppliers:[],events:[]};
        const source=JSON.stringify(fixture);
        document.querySelector('[data-provider-region="world"]').innerHTML=SOCProviderCanvas.render(fixture,{layer:'geography',camera:{x:0,y:0,zoom:1},viewport:{width:viewport.width-24,height:viewport.height-220}});
        return {unchanged:JSON.stringify(fixture)===source,rectangles:[...document.querySelectorAll('.provider-map-node')].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.id,x:r.x,y:r.y,width:r.width,height:r.height};})};
      },{count,viewport});
      assert.equal(geometry.unchanged,true,'fixture projection must not mutate its input');
      assert.equal(geometry.rectangles.length,count);
      const overlaps=[];
      for(let i=0;i<count;i++)for(let j=i+1;j<count;j++) {
        const a=geometry.rectangles[i],b=geometry.rectangles[j];
        if(a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height)overlaps.push([a.id,b.id]);
      }
      assert.deepEqual(overlaps,[],`${count} same-market customer hit targets overlap`);
      const reachable=[];
      for(let i=0;i<count;i++) {
        const target=page.locator(`.provider-map-node[data-id="fixture-${i}"]`);
        await target.scrollIntoViewIfNeeded();
        const hit=await target.evaluate(n=>{const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;const top=document.elementFromPoint(x,y);return {id:n.dataset.id,reachable:!!top&&(top===n||n.contains(top)),x,y,width:r.width,height:r.height};});
        assert.ok(hit.reachable,`${count} customer fixture cannot reach ${hit.id}`);assert.ok(hit.height>=44);
        reachable.push(hit);
      }
      await page.screenshot({path:path.join(directory,`fixture-${count}-customers.png`),fullPage:true});
      results.push({count,scope:'Pure presentation fixture only, not purchased campaign customers or long-play evidence',rectangles:geometry.rectangles,reachable,overlaps});
    }
  } finally {await page.close();}
  return results;
}
async function run(engine,browser,viewport) {
  const id = `${engine}-${viewport.width}x${viewport.height}`;
  const directory = path.join(output,id); fs.mkdirSync(directory,{recursive:true});
  const row = {id,engine,version:browser.version(),viewport,steps:[],errors:[],status:'running',startedAt:new Date().toISOString()}; report.runs.push(row); writeReport();
  const started = Date.now();
  const context = await browser.newContext({viewport,reducedMotion:'reduce'});
  await context.tracing.start({screenshots:true,snapshots:true});
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror',e=>row.errors.push(e.message));
  const step = async name => {
    const state = await observation(page);
    assert.ok(state.pageWidth<=state.viewportWidth,`${name}: horizontal page overflow`);
    assert.ok(!state.hud.includes('Capacity clear'),`${name}: unsupported capacity claim`);
    assert.ok(Number.parseFloat(state.legendFontSize)>=12,`${name}: map legend is too small to read`);
    if(name==='opening')assert.match(state.legend,/Customer locations.*Select one/);
    if(['base-map','carrier-map','partner-map'].includes(name))assert.match(state.legend,/green ready resources.*gold ready dependencies/);
    row.steps.push({name,...state});
    await page.screenshot({path:path.join(directory,`${name}.png`),fullPage:true}); writeReport();
  };
  const closeSheet = async () => { if (await page.evaluate(()=>SOC_PROVIDER_UI.view().sheetOpen)) await click(page,'[data-provider-action="drawer-close"]'); };
  const closeInspector = async () => { const close = visible(page,'[data-provider-action="close-inspector"]'); if (await close.isVisible()) await close.click(); };
  const pause = async () => { if (await page.evaluate(()=>SCP.speed>0)) await click(page,'[data-provider-action="pause"]'); };
  const deliverStage = async stage => {
    await closeSheet(); await closeInspector();
    await click(page,'[data-provider-action="speed"][data-provider-value="8"]');
    await page.waitForFunction(stage=>!SCP.busy&&SCP.state.providerCampaign.customers[0]?.stages[stage]?.status==='effective',stage,{timeout:45000});
    await pause();
  };
  try {
    const response=await page.goto(url);row.servedDocumentSha256=hash(await response.body());
    await visible(page,'[data-provider-action="show-new-game"]').waitFor();
    await click(page,'[data-provider-action="show-new-game"]');
    const form=page.locator('[data-provider-form="new-game"]');
    await form.locator('[name="providerName"]').fill(`Map acceptance ${id}`);
    await form.locator('[name="scenario"]').selectOption('smb');
    await form.locator('button[type="submit"]').click();
    await page.waitForFunction(()=>!!SCP.state?.providerCampaign&&SCP.locked);
    await step('opening');
    await click(page,'[data-provider-action="drawer"][data-provider-value="deals"]');
    // Moving focus out of an explicit sheet must not close it.
    await visible(page,'[data-provider-action="zoom"][data-provider-value="+"]').focus();
    assert.equal(await page.evaluate(()=>SOC_PROVIDER_UI.view().sheetOpen),true);
    assert.ok(await visible(page,'.provider-plan-pair').isVisible());
    await step('comparison-sheet');
    await click(page,'[data-provider-action="quote"][data-offer="starter"][data-plan="swift"]');
    await visible(page,'[data-provider-action="confirm-quote"]').waitFor();
    await click(page,'.provider-starter-retail summary');
    const original=await observation(page),retail=page.locator('[data-provider-form="retail-quote"] [name="retailPrice"]');
    const acceptedRetail=await retail.inputValue();
    await retail.fill('999999');
    await page.locator('[data-provider-form="retail-quote"] button').click();
    await page.waitForFunction(()=>SOC_PROVIDER_UI.view().quote?.blockers?.length>0);
    assert.ok(await visible(page,'[data-provider-action="confirm-quote"]').isDisabled());
    const refused=await observation(page);
    assert.equal(refused.cash,original.cash);assert.equal(refused.revision,original.revision);
    assert.equal(refused.quoteModal,true);assert.equal(refused.clock,original.clock);
    assert.equal(await retail.inputValue(),'999999','refused retail draft must remain visible for correction');
    await step('quote-refused-draft-preserved');
    await retail.fill(acceptedRetail);await page.locator('[data-provider-form="retail-quote"] button').click();
    await page.waitForFunction(()=>SOC_PROVIDER_UI.view().quote?.blockers?.length===0);
    // Keyboard activation of the same explicit commitment control.
    const commit=visible(page,'[data-provider-action="confirm-quote"]');await commit.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>SCP.state.providerCampaign.customers.length===1&&!SOC_PROVIDER_UI.view().quoteModal);
    row.firstConsequentialChoiceMs=Date.now()-started;
    assert.ok((await observation(page)).cash<original.cash);
    await deliverStage('base');
    await click(page,'.provider-map-node[data-id="starter-customer"]');await step('base-map');
    for (const stage of ['carrier','partner']) {
      await click(page,`.provider-inspector [data-provider-action="quote"][data-stage="${stage}"]`);
      await click(page,'[data-provider-action="confirm-quote"]');await deliverStage(stage);
      await click(page,'.provider-map-node[data-id="starter-customer"]');await step(`${stage}-map`);
    }
    const beforeSelection=await page.evaluate(()=>JSON.stringify(SCP.state));
    const resource=visible(page,'.provider-resource-node');await resource.focus();await page.keyboard.press('Enter');
    assert.ok(await page.evaluate(()=>!!SOC_PROVIDER_UI.view().selection?.serviceId));
    assert.equal(await page.evaluate(()=>JSON.stringify(SCP.state)),beforeSelection,'map selection must be pure');
    await step('resource-keyboard-inspection');
    const dependency=page.locator('.provider-dependency[data-provider-action="select-path"]').first();
    assert.ok(await dependency.count(),'purchased dependencies must be selectable');
    await dependency.focus();await page.keyboard.press('Enter');
    assert.ok(await page.evaluate(()=>!!SOC_PROVIDER_UI.view().selection?.pathId));
    assert.equal(await page.evaluate(()=>JSON.stringify(SCP.state)),beforeSelection,'path inspection must be pure');
    await step('path-keyboard-inspection');
    await closeInspector();
    await click(page,'[data-provider-action="speed"][data-provider-value="8"]');
    await page.waitForFunction(()=>SCP.state.providerCampaign.jobs.some(j=>j.status==='completed'),null,{timeout:45000});
    row.firstDeliveredServiceMs=Date.now()-started;
    await pause();await step('actual-delivery');
    const after=await observation(page);assert.ok(after.completed>0);
    assert.ok(after.periodOutcome?.offered>0,'displayed outcome denominator must come from actual period workload');
    await click(page,'.provider-map-node[data-id="starter-customer"]');
    await click(page,'[data-provider-action="drawer"][data-provider-value="operations"]');
    await click(page,'[data-provider-action="operation"][data-operation="recording"]');
    await click(page,'[data-provider-action="confirm-quote"]');
    const project=await page.evaluate(()=>SCP.state.providerCampaign.projects.findLast(p=>p.operationId==='recording'));
    assert.ok(project,'recording operation must have a funded project');
    const projectNode=page.locator(`.provider-resource-node[data-id="starter-customer:project:${project.id}"]`);
    await projectNode.focus();await page.keyboard.press('Enter');
    assert.ok((await visible(page,'.provider-inspector').innerText()).includes('Funded'),'project inspector must explain funded work');
    await step('operation-project-inspector');
    await click(page,'[data-provider-action="speed"][data-provider-value="8"]');
    await page.waitForFunction(id=>!SCP.busy&&SCP.state.providerCampaign.projects.find(p=>p.id===id)?.status==='complete',project.id,{timeout:45000});
    await pause();await click(page,'.provider-map-node[data-id="starter-customer"]');
    for(const id of ['recorder','archive'])assert.ok(await page.locator(`.provider-resource-node[data-id="${id}"]`).count(),`${id} operation resource must be visible in service map`);
    await step('operation-resources-effective');
    row.projectionFixtures=await projectionFixtures(context,directory,viewport);
    assert.equal(row.errors.length,0,row.errors.join('\n'));
    row.status='passed';
  } catch(error) {
    row.status='failed';row.failure=String(error.stack||error);
    try { await page.screenshot({path:path.join(directory,'failure.png'),fullPage:true});row.failureObservation=await observation(page); } catch {}
  } finally {
    await context.tracing.stop({path:path.join(directory,'trace.zip')});await context.close();writeReport();
  }
  console.log(`${id}: ${row.status}${row.failure?' · '+row.failure.split('\n')[0]:''}`);
}
(async()=>{
  try {
    for(const engine of engines) {
      if(!['chromium','firefox','webkit'].includes(engine))throw new Error(`Unknown engine ${engine}`);
      let browser;
      try {
        browser=await playwright[engine].launch({headless:true,...(process.env.SOC_MAP_BROWSER_EXECUTABLE?{executablePath:process.env.SOC_MAP_BROWSER_EXECUTABLE}:{})});
        for(const viewport of viewports)await run(engine,browser,viewport);
      } catch(error) {report.runs.push({engine,status:'environment-blocked',failure:String(error.stack||error)});}
      finally {await browser?.close();}
    }
  } finally {
    report.sourceAfter=sourceManifest();
    report.changedInputs=Object.keys(report.sourceBefore).filter(k=>report.sourceBefore[k]!==report.sourceAfter[k]);
    report.finishedAt=new Date().toISOString();
    report.status=report.runs.length&&report.runs.every(r=>r.status==='passed')?(report.changedInputs.length?'preliminary-input-drift':'passed'):'failed';
    writeReport();console.log(`Report: ${path.join(output,'report.json')}`);
    process.exitCode=report.status==='passed'?0:1;
  }
})().catch(error=>{report.fatal=String(error.stack||error);report.status='failed';writeReport();console.error(error);process.exitCode=1;});
