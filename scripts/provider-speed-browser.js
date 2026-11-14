#!/usr/bin/env node
'use strict';
// Measures the actual Provider requestAnimationFrame/Worker/save/render loop on
// dispatched saves. The benchmark imports each save under a real Web Lock.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');
const output=path.resolve(process.argv[2]||'/tmp/soc-provider-speed-report.json');
if(!output.startsWith('/tmp/'))throw Error('output must be under /tmp');
const profile=process.env.SOC_PROVIDER_SPEED_PROFILE||'desktop';
if(!['desktop','phone'].includes(profile))throw Error('SOC_PROVIDER_SPEED_PROFILE must be desktop or phone');
const selection=process.env.SOC_PROVIDER_SPEED_SELECTION||'none';
if(!['none','last'].includes(selection))throw Error('SOC_PROVIDER_SPEED_SELECTION must be none or last');
const viewport=profile==='phone'?{width:390,height:844}:{width:1366,height:768};
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const pageFile=path.join(root,'_site/index.html');
const fixtures=[1,3,5].map(count=>{const file=path.join(root,`evidence/gameplay-audit-2026-11-13/provider-benchmark/fixtures/${count}.json.gz`),text=zlib.gunzipSync(fs.readFileSync(file)).toString('utf8');return {count,text,sha256:hash(text)};});
async function run(browser,fixture,speed){
 const context=await browser.newContext({viewport,...(profile==='phone'?{deviceScaleFactor:3,isMobile:true,hasTouch:true}:{})}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(30000);
 if(profile==='phone'){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
 await page.addInitScript(()=>{window.__TUBES_TEST__=true;});
 try{
  await page.goto(pathToFileURL(pageFile).href);
  const initial=await page.evaluate(async({text,selection})=>{
   SCP.atHome=false;providerEnsureMount();if(!await providerAcquire())throw Error('Provider Web Lock not acquired');providerImport(text);
   if(SCP.error||!SCP.locked)throw Error(SCP.error||'Provider import lost lock');
   if(selection==='last')SOC_PROVIDER_UI.render(SCP.state,providerCachedModel(),{selection:{customerId:SCP.state.providerCampaign.customers.at(-1).id},layer:'services'});
   window.__speedBatches=[];const tick=providerTick;providerTick=function(minutes){window.__speedBatches.push({at:SCP.state.clock,requested:minutes});return tick(minutes);};
   requestAnimationFrame(providerFrame);
   return {clock:SCP.state.clock,revision:SCP.state.revision,customers:SCP.state.providerCampaign.customers.length,seq:SCP.seq};
  },{text:fixture.text,selection});
  assert.equal(initial.customers,fixture.count);
  const target=initial.clock+(speed===8?16:2);
  await page.evaluate(speed=>{window.__speedStarted=performance.now();providerSpeed(speed);},speed);
  let timedOut=false;
  try{await page.waitForFunction(target=>SCP.state.clock>=target||SCP.speed===0,target,{timeout:90000,polling:50});}
  catch(error){if(!/Timeout/.test(String(error)))throw error;timedOut=true;}
  const result=await page.evaluate(({target,timedOut})=>{
   const elapsedMs=performance.now()-window.__speedStarted,clock=SCP.state.clock,batches=window.__speedBatches.slice(),pauseReason=SCP.pauseReason,error=SCP.error,busy=SCP.busy,speed=SCP.speed;
   providerSpeed(0);
   const state=SOC.restore(JSON.stringify(SCP.state)),stored=JSON.parse(localStorage.getItem(SCP_KEY));
   if(JSON.stringify(SOC.restore(JSON.stringify(stored.state)))!==JSON.stringify(state))throw Error('persisted state differs from displayed state');
   const projectionFromWorker=SCP.modelCache?.fromWorker===true,projectionMatches=JSON.stringify(SCP.modelCache?.model)===JSON.stringify(providerModel());
   return {target,clock,elapsedMs,requestedBatches:batches,pauseReason,error,busy,speed,timedOut,storedSequence:stored.seq,revision:state.revision,restored:true,projectionFromWorker,projectionMatches};
  },{target,timedOut});
  result.advanced=result.clock-initial.clock;
  result.expectedWallMs=result.advanced*2000/speed;
  result.speedRatio=+(result.expectedWallMs/result.elapsedMs).toFixed(3);
  result.initial=initial;result.errors=errors;
  assert.deepEqual(errors,[],'page errors');assert.equal(result.error,'','Provider runtime error');assert.ok(result.advanced>0,'no simulated time advanced');assert.equal(result.projectionFromWorker,true,'Provider projection must come from the validated Worker reply');assert.equal(result.projectionMatches,true,'Worker projection must match direct inspection');
  return result;
 }finally{await context.close();}
}
async function cancelInFlight(browser,fixture){
 const context=await browser.newContext({viewport,...(profile==='phone'?{deviceScaleFactor:3,isMobile:true,hasTouch:true}:{})}),page=await context.newPage();page.setDefaultTimeout(30000);
 if(profile==='phone'){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
 await page.addInitScript(()=>{window.__TUBES_TEST__=true;});
 try{
  await page.goto(pathToFileURL(pageFile).href);
  await page.evaluate(async text=>{SCP.atHome=false;providerEnsureMount();if(!await providerAcquire())throw Error('Provider Web Lock not acquired');providerImport(text);if(SCP.error)throw Error(SCP.error);requestAnimationFrame(providerFrame);providerSpeed(8);},fixture.text);
  await page.waitForFunction(()=>SCP.busy,null,{timeout:10000,polling:20});
  const result=await page.evaluate(async()=>{const before=JSON.stringify(SCP.state),seq=SCP.seq;providerSpeed(0);await new Promise(resolve=>setTimeout(resolve,1000));const stored=JSON.parse(localStorage.getItem(SCP_KEY));return {unchanged:JSON.stringify(SCP.state)===before,storedUnchanged:JSON.stringify(stored.state)===before,sequenceUnchanged:SCP.seq===seq&&stored.seq===seq,busy:SCP.busy,worker:SCP.worker===null,speed:SCP.speed,error:SCP.error};});
  assert.deepEqual(result,{unchanged:true,storedUnchanged:true,sequenceUnchanged:true,busy:false,worker:true,speed:0,error:''},'a paused batch must not publish its stale Worker reply');
  return result;
 }finally{await context.close();}
}
async function commandInFlight(browser,fixture){
 const context=await browser.newContext({viewport,...(profile==='phone'?{deviceScaleFactor:3,isMobile:true,hasTouch:true}:{})}),page=await context.newPage();page.setDefaultTimeout(30000);
 if(profile==='phone'){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
 await page.addInitScript(()=>{window.__TUBES_TEST__=true;});
 try{
  await page.goto(pathToFileURL(pageFile).href);
  await page.evaluate(async text=>{SCP.atHome=false;providerEnsureMount();if(!await providerAcquire())throw Error('Provider Web Lock not acquired');providerImport(text);if(SCP.error)throw Error(SCP.error);requestAnimationFrame(providerFrame);providerSpeed(8);},fixture.text);
  await page.waitForFunction(()=>SCP.busy,null,{timeout:10000,polling:20});
  const result=await page.evaluate(async()=>{const before=SCP.state,incident=before.providerCampaign.incidents.find(row=>row.status==='active');if(!incident)throw Error('No actual active incident for the in-flight command');const receipt=providerCommand({type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});providerSpeed(0);await new Promise(resolve=>setTimeout(resolve,1000));const stored=JSON.parse(localStorage.getItem(SCP_KEY));return {ok:receipt.ok,revisionAdvanced:SCP.state.revision>before.revision,incidentAcknowledged:SCP.state.providerCampaign.incidents.find(row=>row.id===incident.id)?.status==='acknowledged',storedMatches:JSON.stringify(stored.state)===JSON.stringify(SCP.state),clockUnchanged:SCP.state.clock===before.clock,busy:SCP.busy,worker:SCP.worker===null,error:SCP.error};});
  assert.deepEqual(result,{ok:true,revisionAdvanced:true,incidentAcknowledged:true,storedMatches:true,clockUnchanged:true,busy:false,worker:true,error:''},'a command during a batch must cancel its stale Worker result');
  return result;
 }finally{await context.close();}
}
async function main(){const browser=await chromium.launch({headless:true,...(process.env.SOC_PROVIDER_PERF_CHROME?{executablePath:process.env.SOC_PROVIDER_PERF_CHROME}:{})});const report={scope:'Actual Provider frame pacing at 1x and 8x on retained dispatched saves, with real Chromium Workers, Web Lock, import, render and persistence.',runAt:new Date().toISOString(),chromium:browser.version(),profile,selection,viewport,cpuThrottling:profile==='phone'?4:1,inputs:{page:hash(fs.readFileSync(pageFile)),script:hash(fs.readFileSync(__filename))},results:{}};
 try{for(const fixture of fixtures){report.results[fixture.count]={fixtureSha256:fixture.sha256};for(const speed of [1,8]){const row=await run(browser,fixture,speed);report.results[fixture.count][`${speed}x`]=row;console.log(`${fixture.count} customers ${speed}x: ${row.advanced} minutes in ${row.elapsedMs.toFixed(0)} ms (${row.speedRatio} target speed), batches ${row.requestedBatches.map(x=>x.requested).join(',')}${row.pauseReason?' · '+row.pauseReason:''}`);}if(fixture.count===5){report.results[fixture.count].cancelInFlight=await cancelInFlight(browser,fixture);report.results[fixture.count].commandInFlight=await commandInFlight(browser,fixture);}}}
 finally{await browser.close();}
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(`Report: ${output}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
