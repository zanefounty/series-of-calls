"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),SERVICE=require('../src/game/23-provider-service-boundary'),BOUNDARY=require('../src/game/43-boundaries');
const customerId='starter-customer',request={action:'operation',operationId:'service-boundary-review',customerId};
function fixture(market='jp-tokyo'){
 let s=SOC.create({experience:'campaign',scenario:'smb',market,seed:73,difficulty:'easy'});
 const quote=c=>SOC.provider.quote(s,c),send=c=>{s=SOC.dispatch(s,{type:'provider',command:c});},buy=c=>{const q=quote(c);assert.deepEqual(q.blockers,[],JSON.stringify(q.blockers));send({...c,quoteRevision:q.atRevision});return s.providerCampaign.projects.at(-1).id;};
 const tick=()=>{s=SOC.dispatch(s,{type:'advance',minutes:1});};
 const repair=()=>{const i=s.providerCampaign.incidents.find(i=>i.status==='active');if(i){send({action:'acknowledge-incident',incidentId:i.id});buy({action:'operation',operationId:i.resource==='service'?'service-repair':'repair',customerId});}};
 const until=(check,limit=45)=>{for(let n=0;n<limit&&!check(s);n++){repair();tick();}assert.ok(check(s),'Public fixture did not reach requested state at '+s.clock);};
 for(const stage of ['base','carrier','partner'])buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});until(s=>s.providerCampaign.customers[0].status==='active');
 const early=quote(request);assert.ok(early.blockers.includes('CURRENT_PAID_MSP_REQUIRED'),'Unpaid shared support cannot obtain the registration review');
 const bpo=buy({action:'operation',operationId:'bpo',customerId});until(s=>s.providerCampaign.projects.find(p=>p.id===bpo).status==='complete');until(s=>s.clock>=60,65);
 return {get state(){return s;},quote,send,buy,tick,until};
}
const child=s=>s.portfolio.customers[0].root;
const review=(f)=>{const q=f.quote(request),before=JSON.stringify(f.state),cash=f.state.business.balance.cash;assert.deepEqual(q.blockers,[]);assert.equal(q.setupCents,40000);assert.equal(q.workMinutes,6);assert.equal(JSON.stringify(f.state),before);const id=f.buy(request);assert.equal(f.state.business.balance.cash,cash-40000);assert.notEqual(f.state.providerCampaign.projects.find(p=>p.id===id).status,'complete');f.until(s=>s.providerCampaign.projects.find(p=>p.id===id).status==='complete');return f.state.providerCampaign.projects.find(p=>p.id===id);};
const observation=s=>BOUNDARY.evaluate(child(s),'provider-service-boundary-'+customerId);

test('v8 Tokyo paid service review installs only the authored Japanese service scope and permits actual work',()=>{
 const f=fixture(),p=review(f),plan=p.operationReceipt.plan;
 assert.equal(plan.version,2);assert.equal(plan.contentVersion,SERVICE.JP_CONTENT);assert.equal(plan.jurisdiction,'JP');assert.equal(plan.boundaryContract.serviceRegistration,'registered');assert.equal(plan.boundaryContract.serviceRegistrationId,'fictional-jp-managed-service-v2');assert.equal(plan.boundaryContract.language,'ja');assert.equal(plan.boundaryContract.supportLanguage,'ja');assert.equal(plan.boundaryContract.usesAi,false);
 for(const flow of plan.boundaryContract.flows)for(const key of ['processingRegions','storageRegions','backupRegions','keyCustodyRegions','adminLocations','supportRegions'])assert.deepEqual(flow[key],['JP']);
 const partner=f.state.providerCampaign.projects.find(p=>p.id===plan.responsibility.projectId);assert.equal(partner.stage,'partner');assert.equal(plan.responsibility.postingId,partner.postingId);assert.ok(f.state.business.ledger.some(e=>e.id===p.postingId&&e.cents===40000));
 assert.equal(observation(f.state).eligible,true);assert.equal(observation(f.state).legalApprovalClaim,false);
 f.until(s=>s.providerCampaign.jobs.some(j=>j.status==='completed'&&j.channel==='voice'&&j.arrivalAt>=p.completedAt));
 const job=f.state.providerCampaign.jobs.find(j=>j.status==='completed'&&j.channel==='voice'&&j.arrivalAt>=p.completedAt),call=child(f.state).interactions.find(i=>i.id===job.interactionId);assert.equal(call.caseId,job.caseId);assert.ok(call.usageMinutes>0&&call.media.in&&call.media.out);assert.deepEqual(SOC.restore(JSON.stringify(f.state)),f.state);
});

test('Japanese review becomes stale after a real funded topology change and requires a new paid scoped review',()=>{
 const f=fixture(),first=review(f),firstPlan=structuredClone(first.operationReceipt.plan),migration=f.buy({action:'operation',operationId:'migration',customerId});
 f.until(s=>s.providerCampaign.projects.find(p=>p.id===migration).status==='complete');f.tick();assert.equal(observation(f.state).eligible,false);assert.equal(SOC.operations.platform(child(f.state),'bea'),'migration-phone');
 const second=review(f);assert.notEqual(second.id,first.id);assert.ok(second.operationReceipt.plan.dependencies.some(d=>d.id==='migration-phone'));assert.equal(second.operationReceipt.plan.boundaryGeneration,firstPlan.boundaryGeneration+1);assert.deepEqual(f.state.providerCampaign.projects.find(p=>p.id===first.id).operationReceipt.plan,firstPlan);assert.equal(observation(f.state).eligible,true);
 f.until(s=>s.providerCampaign.jobs.some(j=>j.status==='completed'&&j.channel==='voice'&&j.arrivalAt>=second.completedAt));assert.deepEqual(SOC.restore(JSON.stringify(f.state)),f.state);
});

test('JP registration, language, flow and version forgeries fail public restore; legacy and wrong-market plans remain unavailable',()=>{
 const f=fixture(),p=review(f),original=JSON.stringify(f.state),plan=p.operationReceipt.plan;
 for(const mutate of [c=>{c.serviceRegistration='not-registered';c.serviceRegistrationId=null;},c=>{c.language='en';c.supportLanguage='en';},c=>{c.flows[0].supportRegions=['US'];},c=>{c.usesAi=true;c.aiUseDecision='approved';}]){
  const forged=JSON.parse(original),project=forged.providerCampaign.projects.find(x=>x.id===p.id),contract=child(forged).boundaries.contracts.find(c=>c.id===plan.boundaryContract.id);mutate(project.operationReceipt.plan.boundaryContract);mutate(contract.desired);mutate(contract.effective);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_SERVICE_BOUNDARY|INVALID_BOUNDARY/);
 }
 for(const version of [1,3]){const forged=JSON.parse(original);forged.providerCampaign.projects.find(x=>x.id===p.id).operationReceipt.plan.version=version;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_SERVICE_BOUNDARY_PLAN/);}
 const legacy=structuredClone(f.state);legacy.providerCampaign.contentVersion='provider-campaigns-7';assert.throws(()=>SERVICE.plan(legacy,customerId),/SERVICE_REGISTRATION_NOT_AUTHORED/);assert.throws(()=>SERVICE.validatePlan(plan,legacy),/INVALID_PROVIDER_SERVICE_BOUNDARY_SCOPE/);
 const wrongMarket=structuredClone(f.state);wrongMarket.providerCampaign.customers[0].market='au-sydney';assert.throws(()=>SERVICE.plan(wrongMarket,customerId),/SERVICE_REGISTRATION_NOT_AUTHORED/);assert.throws(()=>SERVICE.validatePlan(plan,wrongMarket),/INVALID_PROVIDER_SERVICE_BOUNDARY_SCOPE/);
 assert.deepEqual(SOC.restore(original),f.state);
});

test('Tokyo pending review continues identically in the actual worker; existing non-JP version-one review remains exact',()=>{
 const f=fixture(),id=f.buy(request);let output;const context={postMessage:value=>output=value};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);const command={type:'advance',minutes:1};context.onmessage({data:{id:1,state:JSON.parse(JSON.stringify(f.state)),command}});assert.equal(output.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(output.state)),SOC.dispatch(f.state,command));f.until(s=>s.providerCampaign.projects.find(p=>p.id===id).status==='complete');assert.deepEqual(SOC.restore(JSON.stringify(f.state)),f.state);
 const au=fixture('au-sydney'),old=review(au);assert.equal(old.operationReceipt.plan.version,1);assert.equal(old.operationReceipt.plan.contentVersion,SERVICE.CONTENT);assert.equal(old.operationReceipt.plan.boundaryContract.serviceRegistration,'not-registered');assert.equal(old.operationReceipt.plan.boundaryContract.language,'en');assert.deepEqual(SOC.restore(JSON.stringify(au.state)),au.state);
});
