#!/usr/bin/env node
'use strict';
// Bounded visible-control proof for the paid workplace-to-suite calling path.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

async function runPartnerJourney({browser,baseUrl,report,OUT,click,snap,selectMapCustomer,quoteBase,openOperation,startNew},{mobile=false}={}){
 const cid='starter-customer',operationId='partner-workplace-suite-calling',id=`partner-paid-${mobile?'mobile':'desktop'}`;
 const row={id,viewport:mobile?{width:390,height:844}:{width:1366,height:768},status:'running',steps:[],errors:[],scope:'Visible funded calling products, paid connection, map test and real subsequent resolved customer call.'};
 report.journeys.push(row);fs.mkdirSync(path.join(OUT,id),{recursive:true});
 const context=await browser.newContext({viewport:row.viewport,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>row.errors.push(e.message));await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const state=()=>page.evaluate(()=>structuredClone(SCP.state));
 const step=async name=>{const s=await state();row.steps.push({name,clock:s.clock,revision:s.revision,cash:s.business.balance.cash});await snap(page,row,name);};
 const pause=async()=>{if(await page.evaluate(()=>!!SCP.speed))await click(page,'[data-provider-action="pause"]');await page.waitForFunction(()=>!SCP.busy&&!SCP.speed);assert.ok(!await page.evaluate(()=>SCP.error));};
 async function respond(){
  const incident=(await state()).providerCampaign.incidents.find(x=>x.status==='active');if(!incident)return;
  await pause();await click(page,'[data-provider-action="drawer"][data-provider-value="incidents"]');await click(page,`[data-provider-action="select-incident"][data-id="${incident.id}"]`);
  const action=page.locator(`.provider-inspector [data-provider-action="respond-incident"][data-operation="${incident.resource==='service'?'service-repair':'repair'}"]:visible`).first();
  if(await action.count()){await action.click();row.steps.push({name:'funded-incident-response',incidentId:incident.id,clock:(await state()).clock});}
  else{await click(page,`.provider-inspector [data-provider-action="ack-incident"][data-id="${incident.id}"]`);await openOperation(page,incident.resource==='service'?'service-repair':'repair',incident.customerId);await commit(incident.resource==='service'?'service-repair':'repair');}
 }
 async function until(predicate,arg,timeout=180000){
  const deadline=Date.now()+timeout;
  while(!await page.evaluate(predicate,arg)){
   assert.ok(Date.now()<deadline,'Timed out waiting for actual paid partner service');assert.ok(!await page.evaluate(()=>SCP.error));await respond();
   if(!await page.evaluate(()=>!!SCP.speed))await click(page,'[data-provider-action="speed"][data-provider-value="8"]');
   const at=await page.evaluate(()=>SCP.state.clock);await page.waitForFunction(t=>SCP.state.clock>t||!!SCP.error,at,{timeout:20000});
  }
  await pause();
 }
 async function commit(expected){
  const before=await state(),q=await page.evaluate(()=>structuredClone(SOC_PROVIDER_UI.view().quote));
  assert.deepEqual(q.blockers,[],JSON.stringify({expected,blockers:q.blockers}));assert.equal(q.request.operationId,expected);
  await click(page,'[data-provider-action="confirm-quote"]');await page.waitForFunction(()=>!SOC_PROVIDER_UI.view().quoteModal);
  const after=await state(),project=after.providerCampaign.projects.find(p=>!before.providerCampaign.projects.some(old=>old.id===p.id));
  assert.ok(project);assert.equal(project.operationId,expected);assert.equal(before.business.balance.cash-after.business.balance.cash,q.setupCents);
  row.steps.push({name:`paid-${expected}`,projectId:project.id,clock:after.clock,cashBefore:before.business.balance.cash,cashAfter:after.business.balance.cash,setupCents:q.setupCents,periodCents:q.periodCents});return project;
 }
 try{
  await page.goto(baseUrl);await startNew(page,{id,plan:'swift',scenario:'smb',difficulty:'easy',seed:73});await step('new-smb');
  await quoteBase(page,'swift','base',undefined,row);
  for(const stage of ['carrier','partner'])await quoteBase(page,'swift',stage,cid,row);
  await selectMapCustomer(page,cid);
  await until(()=>['base','carrier','partner'].every(stage=>SCP.state.providerCampaign.customers[0]?.stages[stage]?.status==='effective'));
  await step('complete-plan-delivered');await until(()=>SCP.state.clock>=60);await step('first-period-settled');
  for(const product of ['ms-workplace-calling','cisco-suite-calling']){
   await openOperation(page,product,cid);const project=await commit(product);
   await until(id=>SCP.state.providerCampaign.projects.find(p=>p.id===id)?.status==='complete',project.id);await step(`${product}-commissioned`);
  }
  await openOperation(page,operationId,cid);const connection=await commit(operationId);
  await until(id=>SCP.state.providerCampaign.projects.find(p=>p.id===id)?.status==='commissioning',connection.id);
  await selectMapCustomer(page,cid);const control=page.locator(`[data-provider-action="test-service-integration"][data-id="${connection.id}"]:visible`).first();
  await control.waitFor({state:'visible'});const target=await control.boundingBox();assert.ok(target&&target.height>=44&&target.width>=44,`map test target must be at least 44px: ${JSON.stringify(target)}`);await snap(page,row,'map-connection-test');await control.click();
  await page.waitForFunction(id=>!!SCP.state.providerCampaign.projects.find(p=>p.id===id)?.operationReceipt?.partnerPath?.testAt,connection.id);
  await step('native-connection-test');
  await until(id=>SCP.state.providerCampaign.projects.find(p=>p.id===id)?.status==='complete',connection.id);
  const final=await state(),receipt=final.providerCampaign.projects.find(p=>p.id===connection.id).operationReceipt;
  assert.equal(receipt.evidence.delivery.kind,'resolved-voice-call');assert.ok(receipt.evidence.delivery.deliveredAt>receipt.partnerPath.testAt);
  const call=final.portfolio.customers.find(c=>c.id===cid).root.interactions.find(x=>x.id===receipt.evidence.delivery.interactionId);
  assert.equal(call.phase,'resolved');assert.ok(call.trace.some(x=>x.code==='PRODUCT_INTEGRATION_ACCEPTED'));
  row.delivery={interactionId:call.id,caseId:call.caseId,deliveredAt:receipt.evidence.delivery.deliveredAt,connectionProjectId:connection.id};
  await step('real-customer-call-delivered');fs.writeFileSync(path.join(OUT,id,'final-save.json'),JSON.stringify(final));
  assert.deepEqual(row.errors,[]);row.status='passed';return row;
 }catch(error){row.status='failed';row.failure=String(error.stack||error);try{await pause();await step('failure');fs.writeFileSync(path.join(OUT,id,'failure-save.json'),JSON.stringify(await state()));}catch{}throw error;
 }finally{await context.tracing.stop({path:path.join(OUT,id,'trace.zip')});await context.close();}
}
module.exports={runPartnerJourney};

if(require.main===module){
 const Module=require('node:module'),crypto=require('node:crypto'),root=path.resolve(__dirname,'..'),base=path.join(root,'scripts/provider-browser.js'),original=fs.readFileSync(base,'utf8'),tail='main();';
 assert.ok(original.trimEnd().endsWith(tail));
 let code=original.trimEnd().slice(0,-tail.length).replace('const SOURCE_FIXED_INPUTS=[',"const SOURCE_FIXED_INPUTS=['scripts/provider-partner-paid-browser.js',");
 code+=`\nasync function partnerMain(){report.scope='Bounded paid partner calling connection through visible controls';report.source=sourceManifest();try{const baseUrl=await startServer();report.baseUrl=baseUrl;browser=await playwright[ENGINE].launch({headless:true,...(BROWSER?{executablePath:BROWSER}:{})});report.browser=browser.version();for(const mobile of [false,true])await require('./provider-partner-paid-browser.js').runPartnerJourney({browser,baseUrl,report,OUT,click,snap,selectMapCustomer,quoteBase,openOperation,startNew},{mobile});report.status='passed';}catch(e){report.status='failed';report.error=String(e.stack||e);}finally{if(browser)await browser.close();if(server?.listening)await new Promise(resolve=>server.close(resolve));writeFinalReport();}}\npartnerMain();\n`;
 const digest=crypto.createHash('sha256').update(code).digest('hex');code=code.replace('const report={',`const report={recorderTemplateSha256:${JSON.stringify(digest)},`);
 const mod=new Module(base,module);mod.filename=base;mod.paths=Module._nodeModulePaths(root);mod._compile(code,base);
}
