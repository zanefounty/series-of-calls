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
async function runCorruptSaveRecovery({browser,baseUrl,report,OUT,click,snap,startNew}){
 const row={id:'corrupt-save-two-tab-recovery',status:'running',steps:[],errors:[]};report.journeys.push(row);
 fs.mkdirSync(path.join(OUT,row.id),{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:768}});
 let owner=await context.newPage(),competitor=null;
 const key='series-of-calls:provider:v1',broken='{"app":"series-of-calls","state":';
 const step=async(page,name)=>{row.steps.push({name,...await page.evaluate(()=>({locked:SCP.locked,career:SCP.state?.providerCampaign?.providerName||null,error:SCP.error,activeSave:localStorage.getItem('series-of-calls:provider:v1'),quarantine:localStorage.getItem('series-of-calls:provider:v1:corrupt')}))});await snap(page,row,name);};
 try{
  owner.on('pageerror',error=>row.errors.push(error.message));
  await owner.goto(baseUrl);await startNew(owner,{plan:'swift',id:row.id});
  const original=await owner.evaluate(key=>localStorage.getItem(key),key);assert.ok(original);
  await owner.close();
  owner=await context.newPage();owner.on('pageerror',error=>row.errors.push(error.message));await owner.goto(baseUrl);
  // Corruption is a storage fault, injected before either tab owns a career.
  await owner.evaluate(({key,broken})=>localStorage.setItem(key,broken),{key,broken});
  await click(owner,'[data-provider-action="open"]');
  await owner.waitForFunction(()=>SCP.locked&&SCP.state===null&&SCP.error.includes('unreadable'));
  assert.equal(await owner.evaluate(key=>localStorage.getItem(key),key),broken);
  assert.equal(await owner.evaluate(key=>localStorage.getItem(key+':corrupt'),key),null);
  assert.match(await owner.locator('[data-provider-error]').innerText(),/unreadable/i);
  await step(owner,'corrupt-bytes-retained-until-owner-chooses-recovery');
  competitor=await context.newPage();competitor.on('pageerror',error=>row.errors.push(error.message));await competitor.goto(baseUrl);
  await click(competitor,'[data-provider-action="open"]');
  await competitor.waitForFunction(()=>!SCP.locked);
  const secondTab=await competitor.evaluate(()=>({locked:SCP.locked,error:SCP.error,atHome:SCP.atHome,career:SCP.state?.providerCampaign?.providerName||null}));
  assert.match(secondTab.error,/read-only|another tab/i,JSON.stringify(secondTab));
  assert.equal(await competitor.evaluate(key=>localStorage.getItem(key),key),broken);
  await step(competitor,'second-tab-cannot-own-corrupt-slot');
  await startNew(owner,{plan:'swift',id:'recovered'});
  const recovered=await owner.evaluate(key=>({save:JSON.parse(localStorage.getItem(key)),quarantine:localStorage.getItem(key+':corrupt')}),key);
  assert.equal(recovered.quarantine,broken,'quarantine keeps exact input bytes');
  assert.equal(recovered.save.state.providerCampaign.providerName,'Orchard swift recovered');
  assert.equal(recovered.save.seq,1,'replacement starts a fresh sequence');
  await step(owner,'visible-new-career-quarantines-and-replaces');
  assert.equal(await competitor.evaluate(()=>SCP.locked),false);
  await owner.reload();await click(owner,'[data-provider-action="open"]');await owner.waitForFunction(()=>SCP.state?.providerCampaign?.providerName==='Orchard swift recovered'&&SCP.locked);
  assert.equal(await owner.evaluate(key=>localStorage.getItem(key+':corrupt'),key),broken);
  await step(owner,'owner-reload-restores-replacement');
  await owner.close();owner=null;
  await competitor.reload();await click(competitor,'[data-provider-action="open"]');
  await competitor.waitForFunction(()=>SCP.locked&&SCP.state?.providerCampaign?.providerName==='Orchard swift recovered');
  assert.equal(await competitor.evaluate(key=>localStorage.getItem(key+':corrupt'),key),broken);
  await step(competitor,'second-tab-reopens-only-after-owner-closes');
  assert.deepEqual(row.errors,[]);row.status='passed';
 }catch(error){row.status='failed';row.failure=String(error.stack||error);throw error;}
 finally{if(owner&&!owner.isClosed())await owner.close();if(competitor&&!competitor.isClosed())await competitor.close();await context.close();}
}
module.exports={runRuntimeSafety,runCorruptSaveRecovery};
