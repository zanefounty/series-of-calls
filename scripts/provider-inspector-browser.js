#!/usr/bin/env node
'use strict';
// Actual Chromium inspector actions on validated, dispatched Provider saves.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright-core'),SOC=require('../src/game/55-communications');
const root=path.resolve(__dirname,'..'),pageFile=path.join(root,'_site/index.html'),output=path.resolve(process.argv[2]||'/tmp/soc-provider-inspector-report.json');
if(!output.startsWith('/tmp/'))throw Error('Report must be under /tmp');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const send=(state,command)=>SOC.dispatch(state,{type:'provider',command});
function buy(state,request){const quote=SOC.provider.quote(state,request);assert.deepEqual(quote.blockers,[]);return send(state,{...request,quoteRevision:quote.atRevision});}
function saves(){let state=SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty:'easy'});for(const stage of ['base','carrier','partner'])state=buy(state,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});const beforeWork=state;while(!state.providerCampaign.incidents.some(i=>i.status==='active')&&state.clock<40)state=SOC.dispatch(state,{type:'advance',minutes:1});assert.ok(state.providerCampaign.incidents.some(i=>i.status==='active'&&i.resource==='carrier'));return {beforeWork,carrierIncident:state};}
async function run(browser,profile,name,state){
 const viewport=profile==='phone'?{width:390,height:844}:{width:1366,height:768},context=await browser.newContext({viewport,...(profile==='phone'?{deviceScaleFactor:3,isMobile:true,hasTouch:true}:{})}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));page.setDefaultTimeout(15000);
 try{
  await page.addInitScript(()=>{window.__TUBES_TEST__=true;});await page.goto(pathToFileURL(pageFile).href);
  const input=JSON.stringify(state);await page.evaluate(async text=>{SCP.atHome=false;providerEnsureMount();if(!await providerAcquire())throw Error('Provider lock unavailable');providerImport(text);if(SCP.error)throw Error(SCP.error);},input);
  if(name==='beforeWork'){
   const customer=page.locator('.provider-map-node[data-provider-action="select-customer"][data-id="starter-customer"]');if(!await customer.isVisible())await page.locator('[data-provider-layer]').selectOption('geography');await customer.click();
   await page.locator('.provider-inspector.has-selection').waitFor({state:'visible'});
   assert.equal(await page.locator('.provider-inspector .provider-scale').count(),0,'paid scale offers wait for delivered work');
  }else{
   await page.locator('[data-provider-action="drawer"][data-provider-value="incidents"]').first().click();await page.locator('[data-provider-action="select-incident"]').first().click();
   const panel=page.locator('.provider-inspector .provider-incident');await panel.waitFor({state:'visible'});
   const actions=await page.locator('.provider-inspector').evaluate(el=>[...el.querySelectorAll('[data-provider-action="operation"],[data-provider-action="respond-incident"],[data-provider-action="accept-incident-risk"]')].filter(button=>!button.closest('details')).map(button=>button.dataset.operation||button.dataset.providerAction));
   assert.deepEqual(actions,['repair','mitigate','accept-incident-risk']);
   assert.equal(await page.locator('.provider-inspector [data-operation="repair"]').count(),1);
   assert.equal(await page.locator('.provider-inspector [data-operation="service-repair"]').count(),0);
   assert.equal(await page.locator('.provider-inspector [data-operation="restore-queue"]').count(),0);
   assert.equal(await page.locator('.provider-inspector [data-provider-detail="incident-other-actions"]').count(),1);
  }
  assert.equal(await page.evaluate(()=>JSON.stringify(SCP.state)),input,'inspection does not mutate the save');assert.deepEqual(errors,[]);
  return {profile,name,clock:state.clock,revision:state.revision,selection:await page.evaluate(()=>structuredClone(SOC_PROVIDER_UI.view().selection)),screenshot:await page.screenshot({path:`/tmp/soc-provider-inspector-${profile}-${name}.png`,fullPage:true}).then(()=>`/tmp/soc-provider-inspector-${profile}-${name}.png`),errors};
 }finally{await context.close();}
}
async function main(){const browser=await chromium.launch({headless:true,...(process.env.SOC_PROVIDER_PERF_CHROME?{executablePath:process.env.SOC_PROVIDER_PERF_CHROME}:{})}),states=saves(),report={scope:'SOC-04 actual Chromium customer and carrier incident inspector on dispatched saves; no uncoached comprehension claim.',runAt:new Date().toISOString(),browser:browser.version(),inputs:{page:hash(fs.readFileSync(pageFile)),script:hash(fs.readFileSync(__filename))},runs:[]};try{for(const profile of ['desktop','phone'])for(const [name,state] of Object.entries(states))report.runs.push(await run(browser,profile,name,state));report.status='passed';}catch(error){report.status='failed';report.failure=String(error.stack||error);process.exitCode=1;}finally{await browser.close();fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,report:output,runs:report.runs.length,...(report.failure?{failure:report.failure}:{})}));}}
main();
