/* Environment failures around real visible purchases; no simulation-state injection. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function runRuntimeSafety({browser,baseUrl,report,OUT,click,snap,startNew}){
 const row={id:'runtime-storage-lock-safety',status:'running',steps:[],errors:[]};report.journeys.push(row);
 fs.mkdirSync(path.join(OUT,row.id),{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true}),page=await context.newPage();
 page.setDefaultTimeout(15000);page.on('pageerror',error=>row.errors.push(error.message));
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state=()=>page.evaluate(()=>JSON.stringify(SCP.state));
 const step=async name=>{row.steps.push({name,...await page.evaluate(()=>({clock:SCP.state.clock,revision:SCP.state.revision,locked:SCP.locked,speed:SCP.speed,busy:SCP.busy,error:SCP.error}))});await snap(page,row,name);};
 try{
  await page.goto(baseUrl);await startNew(page,{plan:'swift',id:row.id});
  const disk=await page.evaluate(()=>localStorage.getItem('series-of-calls:provider:v1'));
  await click(page,'[data-provider-action="drawer"][data-provider-value="deals"]');
  await click(page,'[data-provider-action="quote"][data-offer="starter"][data-plan="swift"]');
  const quote=await page.evaluate(()=>structuredClone(SOC_PROVIDER_UI.view().quote));assert.deepEqual(quote.blockers,[]);
  // Fault injection affects the storage API only, after the current quote exists.
  await page.evaluate(()=>{globalThis.__storageSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='series-of-calls:provider:v1')throw new DOMException('Test storage quota exhausted','QuotaExceededError');return globalThis.__storageSetItem.call(this,key,value);};});
  const before=JSON.parse(await state());await click(page,'[data-provider-action="confirm-quote"]');
  await page.waitForFunction(()=>SCP.error.includes('quota'));
  const committed=await state(),paid=JSON.parse(committed);
  assert.equal(paid.business.balance.cash,before.business.balance.cash-quote.setupCents);
  assert.equal(paid.providerCampaign.projects.length,1);assert.equal(paid.providerCampaign.projects[0].status,'running');
  assert.equal(await page.evaluate(()=>SOC_PROVIDER_UI.view().quoteModal),false);
  assert.equal(await page.evaluate(()=>SCP.speed),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('series-of-calls:provider:v1')),disk);
  assert.match(await page.locator('[data-provider-error]').innerText(),/quota/i);await step('storage-failed-paid-result-retained');
  await click(page,'[data-provider-action="drawer"][data-provider-value="finance"]');
  const downloadPromise=page.waitForEvent('download');await click(page,'[data-provider-action="export"]');
  const download=await downloadPromise,exported=fs.readFileSync(await download.path(),'utf8');
  assert.equal(exported,committed);fs.writeFileSync(path.join(OUT,row.id,'storage-failure-export.json'),exported);
  await step('visible-export-preserves-paid-run');
  await page.evaluate(()=>{Storage.prototype.setItem=globalThis.__storageSetItem;delete globalThis.__storageSetItem;});
  await click(page,'[data-provider-action="save"]');
  assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('series-of-calls:provider:v1'))).state,paid);
  await click(page,'[data-provider-action="speed"][data-provider-value="8"]');
  await page.waitForFunction(()=>SCP.state.clock>0);
  const competitor=await context.newPage();await competitor.goto(baseUrl);
  // Native Web Locks revocation is an environment event. The competitor never
  // writes the career save or calls SOC; the owner must drop its stale authority.
  await competitor.evaluate(()=>new Promise((resolve,reject)=>{navigator.locks.request('series-of-calls:provider-lock:v1',{steal:true},async lock=>{if(!lock)throw Error('Fixture lock missing');resolve(true);await new Promise(done=>globalThis.__releaseFixtureLock=done);}).catch(reject);}));
  await page.waitForFunction(()=>!SCP.locked&&SCP.speed===0&&!SCP.busy,{},{timeout:3000});
  const stopped=await state();assert.match(await page.locator('[data-provider-error]').innerText(),/lock|ownership|read.only|reopen/i);
  await step('native-lock-loss-pauses-owner');await page.waitForTimeout(1000);assert.equal(await state(),stopped);
  await click(page,'[data-provider-action="speed"][data-provider-value="8"]');await page.waitForTimeout(500);assert.equal(await state(),stopped);
  await competitor.evaluate(()=>globalThis.__releaseFixtureLock());await competitor.close();
  await click(page,'[data-provider-action="drawer"][data-provider-value="menu"]');await click(page,'[data-provider-action="close"]');await click(page,'[data-provider-action="open"]');
  await page.waitForFunction(()=>SCP.locked&&SCP.speed===0);assert.equal(await state(),stopped);
  await click(page,'[data-provider-action="speed"][data-provider-value="8"]');
  await page.waitForFunction(at=>SCP.state.clock>at,JSON.parse(stopped).clock);await click(page,'[data-provider-action="pause"]');
  assert.equal((JSON.parse(await state())).providerCampaign.projects.length,1,'storage retry did not duplicate the purchase');
  await step('explicit-reopen-resume-recovers');assert.deepEqual(row.errors,[]);row.status='passed';
 }catch(error){row.status='failed';row.failure=String(error.stack||error);try{await step('failure');}catch{}throw error;}
 finally{await context.tracing.stop({path:path.join(OUT,row.id,'trace.zip')});await context.close();}
}
module.exports={runRuntimeSafety};
