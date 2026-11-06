const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const customerId='starter-customer',operationId='partner-workplace-suite-calling';
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify(q.blockers));const before=s.business.balance.cash,next=send(s,{...request,quoteRevision:q.atRevision});assert.equal(next.business.balance.cash,before-q.setupCents);return next;}
function step(s){
 for(const i of s.providerCampaign.incidents.filter(x=>x.status==='active')){s=send(s,{action:'acknowledge-incident',incidentId:i.id});s=buy(s,{action:'operation',operationId:i.resource==='service'?'service-repair':'repair',customerId});}
 return SOC.dispatch(s,{type:'advance',minutes:1});
}
function until(s,predicate,limit=80){for(let i=0;i<limit&&!predicate(s);i++)s=step(s);assert.ok(predicate(s),'expected condition by '+s.clock);return s;}
function testFromMap(s,projectId){
 const dom=new JSDOM('<div id="app"></div>',{runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window;
 try{
  const files=['93-ui/10-dom.js','23-provider-variants.js','93-ui/65-service-preferences.js','93-ui/70-provider-hud.js','93-ui/75-provider-panels.js','93-ui/78-provider-partner-paths.js','93-ui/78-provider-policy-controls.js','93-ui/79-provider-comparisons.js','93-ui/79-provider-context-actions.js','93-ui/79-provider-lifecycle.js','93-ui/79-provider-integration.js','93-ui/79-provider-progression.js','93-ui/79-provider-service-retirement.js','96-map/90-service-scene.js','96-map/95-provider-canvas.js','97-provider-shell.js'];
  for(const file of files)w.eval(fs.readFileSync(path.join(__dirname,'../src/game',file),'utf8'));
  const before=JSON.stringify(s);let dispatched;
  w.SOC_PROVIDER_UI.mount(w.document.querySelector('#app'),{command:c=>{dispatched=JSON.parse(JSON.stringify(c));s=SOC.dispatch(s,dispatched);return {ok:true};},quote:r=>SOC.provider.quote(s,JSON.parse(JSON.stringify(r))),decision:()=>{}});
  w.SOC_PROVIDER_UI.render(s,SOC.provider.inspect(s));
  const select=w.document.querySelector(`[data-provider-action="select-customer"][data-id="${customerId}"]`);assert.ok(select);select.click();
  assert.equal(JSON.stringify(s),before,'map selection and rendering do not dispatch or bill');
  const button=w.document.querySelector(`[data-provider-action="test-service-integration"][data-id="${projectId}"]`);assert.ok(button);button.click();
  assert.deepEqual(dispatched,{type:'provider',command:{action:'test-service-integration',projectId,quoteRevision:JSON.parse(before).revision}});
  return s;
 }finally{w.close();}
}
test('AC-SOC-877 paid calling partner connection requires the funded products, explicit test and real subsequent customer call',()=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 s=until(s,s=>s.clock>=60);
 const request={action:'operation',operationId,customerId},early=SOC.provider.quote(s,request);assert.ok(early.blockers.some(x=>x.includes('OPERATION_REQUIREMENT_REQUIRED')),JSON.stringify(early));
 for(const product of ['ms-workplace-calling','cisco-suite-calling']){s=buy(s,{action:'operation',operationId:product,customerId});s=until(s,s=>s.providerCampaign.projects.some(p=>p.operationId===product&&p.status==='complete'));}
 const before=JSON.stringify(s),quote=SOC.provider.quote(s,request);assert.equal(JSON.stringify(s),before);assert.deepEqual(quote.blockers,[]);assert.equal(quote.commercial.partnerPath.requiresDeliveredWork,true);
 s=buy(s,request);const id=s.providerCampaign.projects.at(-1).id;
 for(const mutate of [p=>p.partnerPathPlan.paidPrerequisites[0].postingId='entry-3',p=>p.partnerPathPlan.source.generation++,p=>p.partnerPathPlan.support.scope.push('recorder')]){const bad=structuredClone(s);mutate(bad.providerCampaign.projects.find(p=>p.id===id));assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_PARTNER_PATH_PROJECT/);}
 const sourceDuringSetup=s.providerCampaign.projects.find(p=>p.productId==='ms-workplace-calling');assert.ok(SOC.provider.quote(s,{action:'retire-project',projectId:sourceDuringSetup.id}).blockers.includes('PARTNER_PATH_SETUP_PENDING'));
 s=until(s,s=>s.providerCampaign.projects.find(p=>p.id===id).status==='commissioning');
 assert.equal(s.providerCampaign.projects.find(p=>p.id===id).operationReceipt.evidence,null);
 s=testFromMap(s,id);
 assert.equal(s.providerCampaign.projects.find(p=>p.id===id).status,'commissioning');
 const unfoundedRetry={action:'operation',operationId:operationId+'-retest',customerId},retryQuote=SOC.provider.quote(s,unfoundedRetry),unchanged=JSON.stringify(s);
 assert.ok(retryQuote.blockers.includes('RETEST_REQUIRES_RECORDED_FAILURE_OR_SCOPE_CHANGE'));
 assert.throws(()=>send(s,{...unfoundedRetry,quoteRevision:retryQuote.atRevision}),/RETEST_REQUIRES_RECORDED_FAILURE_OR_SCOPE_CHANGE/);assert.equal(JSON.stringify(s),unchanged);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 let reply;const worker={postMessage:x=>{reply=x;}};vm.createContext(worker);vm.runInContext(SOC.workerSource(),worker);const command={type:'advance',minutes:6};worker.onmessage({data:{id:1,state:s,command}});assert.equal(reply.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(reply.state)),SOC.dispatch(SOC.restore(JSON.stringify(s)),command));
 s=until(s,s=>s.providerCampaign.projects.find(p=>p.id===id).status==='complete');
 const p=s.providerCampaign.projects.find(p=>p.id===id),delivery=p.operationReceipt.evidence.delivery;
 assert.ok(delivery.deliveredAt>p.operationReceipt.partnerPath.testAt);assert.equal(delivery.kind,'resolved-voice-call');
 const forged=structuredClone(s),deliveredCall=forged.portfolio.customers[0].root.interactions.find(i=>i.id===delivery.interactionId);deliveredCall.trace=deliveredCall.trace.filter(e=>e.code!=='PRODUCT_INTEGRATION_ACCEPTED');assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_PARTNER_PATH_PROJECT/);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const denied=SOC.provider.quote(s,request);assert.ok(denied.blockers.includes('PAID_INITIAL_PATH_ALREADY_ORDERED'));
 const retained=JSON.stringify(p.operationReceipt.evidence),source=s.providerCampaign.projects.find(x=>x.productId==='ms-workplace-calling');
 s=buy(s,{action:'retire-project',projectId:source.id});s=step(s);
 assert.equal(JSON.stringify(s.providerCampaign.projects.find(x=>x.id===id).operationReceipt.evidence),retained);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'later withdrawal preserves the earned delivery');
 s=buy(s,{action:'operation',operationId:'ms-workplace-calling',customerId});const replacement=s.providerCampaign.projects.at(-1).id;
 s=until(s,s=>s.providerCampaign.projects.find(x=>x.id===replacement).status==='complete');
 const retry={action:'operation',operationId:operationId+'-retest',customerId};s=buy(s,retry);const retryId=s.providerCampaign.projects.at(-1).id;
 s=until(s,s=>s.providerCampaign.projects.find(p=>p.id===retryId).status==='commissioning');
 s=send(s,{action:'test-service-integration',projectId:retryId,quoteRevision:s.revision});
 s=until(s,s=>s.providerCampaign.projects.find(p=>p.id===retryId).status==='complete');
 assert.equal(JSON.stringify(s.providerCampaign.projects.find(x=>x.id===id).operationReceipt.evidence),retained);
 assert.notEqual(s.providerCampaign.projects.find(x=>x.id===retryId).operationReceipt.evidence.integration.source.generation,p.operationReceipt.evidence.integration.source.generation);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
