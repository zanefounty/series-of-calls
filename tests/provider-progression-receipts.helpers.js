const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const FACTS=require('../src/game/23-provider-progression.js');
const RECEIPTS=require('../src/game/23-provider-progression-receipts.js');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility.js');
const UC_CC=require('../src/game/23-provider-uc-cc-integration.js');
const SUPPORT_WORK=require('../src/game/23-provider-support-work.js');

const hooks={customerRoot:(s,portfolioId)=>s.portfolio.customers.find(x=>x.id===portfolioId)?.root||null,observeResource:(root,id)=>SOC.observe(root,id),supportWorkOrigin:SUPPORT_WORK.origin};
const buy=(s,request)=>{
 let quote=SOC.provider.quote(s,request);
 if(request.action==='purchase'&&request.stage==='base'&&request.offerId.startsWith('next-')&&quote.blockers.includes('CUSTOMER_OFFER_EXPIRED')){
  s=SOC.dispatch(s,{type:'provider',command:{action:'refresh-opportunity'}});
  request={...request,offerId:SOC.provider.inspect(s).offers.find(row=>row.id.startsWith('next-')).id};
  quote=SOC.provider.quote(s,request);
 }
 assert.deepEqual(quote.blockers,[],JSON.stringify({request,blockers:quote.blockers}));return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});
};
const claimDispatched=(s,sourceId)=>SOC.dispatch(s,{type:'provider',command:{action:'claim-progression',sourceId,quoteRevision:s.revision}});
const minute=s=>SOC.dispatch(s,{type:'advance',minutes:1});
const UC_CC_CUSTOMER='starter-customer',UC_CC_SOURCE='d-ms-workplace-calling',UC_CC_TARGET='d-cisco-contact-centre',UC_CC_SOURCE_OPERATION='ms-workplace-calling',UC_CC_TARGET_OPERATION='cisco-contact-centre',UC_CC_EDGE='workplace-to-contact-quality';
const ccProject=(s,id,customerId=UC_CC_CUSTOMER)=>s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId===id),ccChild=(s,customerId=UC_CC_CUSTOMER)=>s.portfolio.customers.find(x=>x.id===customerId).root;
function ccAdvance(s){const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status));if(incident&&!s.providerCampaign.projects.some(p=>p.customerId===incident.customerId&&['repair','service-repair'].includes(p.operationId)&&['running','commissioning'].includes(p.status))){if(incident.status==='active')s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});const operationId=incident.resource==='service'?'service-repair':'repair',quote=SOC.provider.quote(s,{action:'operation',operationId,customerId:incident.customerId});if(!quote.blockers.length)s=SOC.dispatch(s,{type:'provider',command:{action:'operation',operationId,customerId:incident.customerId,quoteRevision:quote.atRevision}});}for(const customer of s.providerCampaign.customers.filter(c=>c.status==='renewal'))s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId:customer.id}});return minute(s);}
// These waits have explicit time or project boundaries. Every native minute still
// executes; only repeated dispatch validation between impossible completions is avoided.
function ccQuietChunk(s,remaining){
 if(s.providerCampaign.status==='won'||s.providerCampaign.incidents.some(i=>['active','acknowledged'].includes(i.status))||s.providerCampaign.customers.some(c=>c.status==='renewal'))return 1;
 let boundary=Math.min(s.clock+remaining,(Math.floor(s.clock/60)+1)*60);
 for(const p of s.providerCampaign.projects)if(['running','commissioning'].includes(p.status)&&Number.isSafeInteger(p.dueAt)&&p.dueAt>s.clock)boundary=Math.min(boundary,p.dueAt);
 return Math.max(1,boundary-s.clock);
}
function ccAdvanceBounded(s,remaining){
 const chunk=ccQuietChunk(s,remaining),before=s.clock;
 s=chunk===1?ccAdvance(s):SOC.dispatch(s,{type:'advance',minutes:chunk});
 assert.ok(s.clock>before&&s.clock-before<=chunk,'bounded receipt wait advances within its native request');
 return s;
}
function ccUntilClock(s,target){
 assert.ok(Number.isSafeInteger(target)&&target>=0,'receipt wait requires an explicit simulation minute');
 while(s.clock<target)s=ccAdvanceBounded(s,target-s.clock);
 return s;
}
function ccWaitProject(s,select,ready,limit=600,customerId=UC_CC_CUSTOMER){
 const started=s.clock;
 while(!ready(s)&&s.clock-started<limit){
  const project=select(s),remaining=limit-(s.clock-started);
  // A running paid project cannot submit or commission before its authored dueAt.
  const due=project?.status==='running'&&Number.isSafeInteger(project.dueAt)&&project.dueAt>s.clock?project.dueAt-s.clock:1;
  s=ccAdvanceBounded(s,Math.min(remaining,due));
 }
 return ccUntil(s,ready,0,customerId);
}
function ccOperationComplete(s,id,customerId=UC_CC_CUSTOMER){return ccWaitProject(s,x=>ccProject(x,id,customerId),x=>ccProject(x,id,customerId)?.status==='complete',600,customerId);}
function ccStageComplete(s,stage,customerId=UC_CC_CUSTOMER){
 const row=x=>x.providerCampaign.customers.find(c=>c.id===customerId)?.stages[stage];
 return ccWaitProject(s,x=>x.providerCampaign.projects.find(p=>p.id===row(x)?.projectId),x=>row(x)?.status==='effective',600,customerId);
}
function ccUntil(s,predicate,limit=600,customerId=UC_CC_CUSTOMER){for(let i=0;i<limit&&!predicate(s);i++)s=ccAdvance(s);assert.ok(predicate(s),`UC/CC fixture stalled at ${s.clock}: ${JSON.stringify({projects:s.providerCampaign.projects.filter(p=>p.customerId===customerId).map(p=>[p.operationId,p.status,p.error]),integration:SOC.provider.inspect(s).customers.find(c=>c.id===customerId)?.serviceIntegration,jobs:s.providerCampaign.jobs.filter(j=>j.customerId===customerId&&j.channel==='voice').slice(-6),records:ccChild(s,customerId).records.filter(r=>r.kind==='recording').slice(-4).map(r=>[r.id,r.kind,r.captureScope,r.deleted]),incidents:s.providerCampaign.incidents.filter(i=>i.status!=='resolved')})}`);return s;}
const ccOperation=(s,operationId,customerId=UC_CC_CUSTOMER)=>buy(s,{action:'operation',operationId,customerId});
function ccOperationWhenReady(s,operationId,customerId=UC_CC_CUSTOMER){const request={action:'operation',operationId,customerId};let quote=SOC.provider.quote(s,request);for(let i=0;quote.blockers.length&&i<180;i++){assert.ok(quote.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY','INSUFFICIENT_CASH'].includes(x)),`${operationId} blocked: ${quote.blockers}`);s=ccAdvance(s);quote=SOC.provider.quote(s,request);}assert.deepEqual(quote.blockers,[],`${operationId} quote blocked: ${quote.blockers} staffing=${JSON.stringify(quote.commercial?.staffing)} workforce=${JSON.stringify(s.business.workforce)}`);return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});}
function ccFundedProducts(){let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});s=SOC.dispatch(s,{type:'provider',command:{action:'staff',engineers:4,support:4}});for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:UC_CC_CUSTOMER})});s=ccStageComplete(s,stage);if(stage==='base'){s=ccOperation(s,'recording');s=ccOperationComplete(s,'recording');}}for(const id of ['bpo',UC_CC_SOURCE_OPERATION,UC_CC_TARGET_OPERATION]){s=ccOperation(s,id);s=ccOperationComplete(s,id);}return ccUntilClock(s,60);}
function ccFullWork(s,after,customerId=UC_CC_CUSTOMER){const child=ccChild(s,customerId);return s.providerCampaign.jobs.find(j=>j.customerId===customerId&&j.channel==='voice'&&['completed','late'].includes(j.status)&&j.arrivalAt>=after&&child.interactions.some(i=>i.id===j.interactionId&&i.phase==='resolved'&&i.obligations.length===0&&i.context&&[[UC_CC_SOURCE,'telephony'],[UC_CC_TARGET,'quality-review']].every(([deploymentId,feature])=>i.trace.some(t=>t.code==='PRODUCT_FEATURE_ACCEPTED'&&t.bindings?.some(b=>b.deploymentId===deploymentId&&b.feature===feature))))&&child.records.some(r=>r.interaction===j.interactionId&&r.kind==='recording'&&(r.captureScope??'complete')==='complete'&&!r.deleted));}
function ccTest(s,projectId){return SOC.dispatch(s,{type:'provider',command:{action:'test-service-integration',projectId,quoteRevision:s.revision}});}
function ccCompleteWithPaidReview(s,projectId,operationId='uc-cc-integration',customerId=UC_CC_CUSTOMER){const at=s.clock;s=ccTest(s,projectId);s=ccUntil(s,x=>!!ccFullWork(x,at,customerId),600,customerId);s=ccOperationWhenReady(s,'quality',customerId);s=ccUntil(s,x=>ccProject(x,operationId,customerId)?.status==='complete',600,customerId);return s;}
function ccInstallUcCc(s,customerId){for(const id of ['recording',UC_CC_SOURCE_OPERATION,UC_CC_TARGET_OPERATION]){s=ccOperationWhenReady(s,id,customerId);s=ccOperationComplete(s,id,customerId);}s=ccOperationWhenReady(s,'service-boundary-review',customerId);s=ccOperationComplete(s,'service-boundary-review',customerId);s=ccOperationWhenReady(s,'uc-cc-integration',customerId);const integration=ccProject(s,'uc-cc-integration',customerId);s=ccUntil(s,x=>ccProject(x,'uc-cc-integration',customerId)?.status==='commissioning',600,customerId);return ccCompleteWithPaidReview(s,integration.id,'uc-cc-integration',customerId);}
function ccInstallUcCcWithTargetSupport(s,customerId){for(const id of ['recording',UC_CC_SOURCE_OPERATION]){s=ccOperationWhenReady(s,id,customerId);s=ccOperationComplete(s,id,customerId);}if(s.business.workforce.support<2)s=SOC.dispatch(s,{type:'provider',command:{action:'staff',engineers:s.business.workforce.engineers,support:2}});for(const id of [UC_CC_TARGET_OPERATION,'service-boundary-review']){s=ccOperationWhenReady(s,id,customerId);s=ccOperationComplete(s,id,customerId);}if(s.business.workforce.support>1)s=SOC.dispatch(s,{type:'provider',command:{action:'staff',engineers:s.business.workforce.engineers,support:1}});s=ccOperationWhenReady(s,'uc-cc-integration',customerId);const integration=ccProject(s,'uc-cc-integration',customerId);s=ccUntil(s,x=>ccProject(x,'uc-cc-integration',customerId)?.status==='commissioning',600,customerId);return ccCompleteWithPaidReview(s,integration.id,'uc-cc-integration',customerId);}
function ccInstallUcCcWithSupport(s,customerId){for(const id of ['recording',UC_CC_SOURCE_OPERATION]){s=ccOperationWhenReady(s,id,customerId);s=ccOperationComplete(s,id,customerId);}s=SOC.dispatch(s,{type:'provider',command:{action:'staff',engineers:s.business.workforce.engineers,support:4}});for(const id of [UC_CC_TARGET_OPERATION,'service-boundary-review']){s=ccOperationWhenReady(s,id,customerId);s=ccOperationComplete(s,id,customerId);}s=ccOperationWhenReady(s,'uc-cc-integration',customerId);const project=ccProject(s,'uc-cc-integration',customerId);s=ccUntil(s,x=>ccProject(x,'uc-cc-integration',customerId)?.status==='commissioning',600,customerId);return ccCompleteWithPaidReview(s,project.id,'uc-cc-integration',customerId);}
function ccDeliverRoom(s,customerId){s=ccOperationWhenReady(s,'integrator-room',customerId);s=ccOperationComplete(s,'integrator-room',customerId);const project=ccProject(s,'integrator-room',customerId);s=ccUntil(s,x=>ccChild(x,customerId).information.meetingSessions.some(m=>m.status==='completed'&&m.startedAt>=project.completedAt),600,customerId);return s;}
function rehash(receipt){const unsigned={...receipt};delete unsigned.integrity;let value=0x811c9dc5;for(const char of JSON.stringify(unsigned)){value^=char.charCodeAt(0);value=Math.imul(value,0x01000193);}receipt.integrity=(value>>>0).toString(16).padStart(8,'0');return receipt;}
function paidOpening(advanceUntil=35){
 let s=SOC.create({experience:'campaign'});
 for(const stage of ['base','carrier','partner']){
  s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
  while(s.providerCampaign.customers[0].stages[stage].status!=='effective')s=minute(s);
 }
 s=buy(s,{action:'operation',operationId:'bpo',customerId:'starter-customer'});
 while(s.clock<advanceUntil){
  const incident=s.providerCampaign.incidents.find(x=>x.status==='active');
  if(incident){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=buy(s,{action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId});}
  s=minute(s);
 }
 return s;
}
function paidNonstarter(advanceUntil=360){
 let s=paidOpening(180);
 s=buy(s,{action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});
 s=ccStageComplete(s,'base','next-1-customer');
 for(const stage of ['carrier','partner']){
  s=buy(s,{action:'purchase',offerId:'next-1',planId:'swift',stage,customerId:'next-1-customer'});
  s=ccStageComplete(s,stage,'next-1-customer');
 }
 s=ccUntil(s,x=>x.providerCampaign.status==='won',180,'next-1-customer');
 s=SOC.dispatch(s,{type:'provider',command:{action:'continue-career'}});
 while(s.clock<advanceUntil){
  const incident=s.providerCampaign.incidents.find(x=>x.status==='active');
  if(incident){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=buy(s,{action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId});}
  s=minute(s);
 }
 return s;
}
function regionalSupportReady(){
 const handleIncidents=state=>{
  for(const incident of state.providerCampaign.incidents.filter(x=>x.status==='active'))state=SOC.dispatch(state,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
  for(const incident of state.providerCampaign.incidents.filter(x=>x.status==='acknowledged')){
   const pending=state.providerCampaign.projects.some(p=>p.customerId===incident.customerId&&['repair','service-repair'].includes(p.operationId)&&p.status!=='cancelled'&&p.acceptedAt>=incident.acknowledgedAt);if(pending)continue;
   const operationId=incident.resource==='service'?'service-repair':'repair',quote=SOC.provider.quote(state,{action:'operation',operationId,customerId:incident.customerId});if(!quote.blockers.length)state=SOC.dispatch(state,{type:'provider',command:{action:'operation',operationId,customerId:incident.customerId,quoteRevision:quote.atRevision}});
  }
  return state;
 };
 const advance=state=>{state=handleIncidents(state);for(const customer of state.providerCampaign.customers.filter(c=>c.status==='renewal'))state=SOC.dispatch(state,{type:'provider',command:{action:'renew',customerId:customer.id}});return minute(state);};
 const until=(state,predicate,limit=420)=>{for(let i=0;i<limit&&!predicate(state);i++)state=advance(state);assert.ok(predicate(state),`regional fixture stalled at ${state.clock}: ${JSON.stringify(FACTS.evaluate(state,hooks).levels[RECEIPTS.LEVEL_TWO]?.missing)}`);return state;};
 const start=(state,customerId,offerId,market)=>{
  state=buy(state,{action:'purchase',offerId,planId:'swift',stage:'base',...(market?{market}:{})});state=until(state,x=>x.providerCampaign.customers.find(c=>c.id===customerId)?.stages.base?.status==='effective');
  for(const stage of ['carrier','partner']){state=buy(state,{action:'purchase',offerId,planId:'swift',stage,customerId});state=until(state,x=>x.providerCampaign.customers.find(c=>c.id===customerId)?.stages[stage]?.status==='effective');}
  return state;
 };
 const operation= (state,operationId,customerId)=>{
  let quote=SOC.provider.quote(state,{action:'operation',operationId,customerId});for(let i=0;quote.blockers.length&&i<60;i++){assert.ok(quote.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(x)),`${operationId} blocked: ${quote.blockers}`);state=advance(state);quote=SOC.provider.quote(state,{action:'operation',operationId,customerId});}
  assert.deepEqual(quote.blockers,[],`${operationId} quote blocked: ${quote.blockers} staffing=${JSON.stringify(quote.commercial?.staffing)} workforce=${JSON.stringify(s.business.workforce)}`);state=SOC.dispatch(state,{type:'provider',command:{action:'operation',operationId,customerId,quoteRevision:quote.atRevision}});
  return until(state,x=>x.providerCampaign.projects.some(p=>p.customerId===customerId&&p.operationId===operationId&&p.status==='complete'));
 };
 let s=start(SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',seed:73}),'starter-customer','starter','au-sydney');
 s=operation(s,'bpo','starter-customer');s=until(s,x=>FACTS.evaluate(x,hooks).facts.supportResponsibility.status==='ready',120);s=operation(s,'service-boundary-review','starter-customer');
 s=until(s,x=>x.providerCampaign.mission.nextOpportunityAvailable,180);
 s=start(s,'next-1-customer','next-1','au-melbourne');s=operation(s,'bpo','next-1-customer');s=operation(s,'service-boundary-review','next-1-customer');
 s=until(s,x=>FACTS.qualifySupportWindow(FACTS.decodeSupportObservation(x.providerCampaign.supportObservation)).status==='ready'||x.clock>=380,300);
 if(s.providerCampaign.status==='won')s=SOC.dispatch(s,{type:'provider',command:{action:'continue-career'}});
 return s;
}

module.exports={ccQuietChunk,ccAdvanceBounded,ccUntilClock,ccWaitProject,ccOperationComplete,ccStageComplete,assert,vm,SOC,FACTS,RECEIPTS,RESPONSIBILITY,UC_CC,SUPPORT_WORK,hooks,buy,claimDispatched,minute,UC_CC_CUSTOMER,UC_CC_SOURCE,UC_CC_TARGET,UC_CC_SOURCE_OPERATION,UC_CC_TARGET_OPERATION,UC_CC_EDGE,ccProject,ccChild,ccAdvance,ccUntil,ccOperation,ccOperationWhenReady,ccFundedProducts,ccFullWork,ccTest,ccCompleteWithPaidReview,ccInstallUcCc,ccInstallUcCcWithTargetSupport,ccInstallUcCcWithSupport,ccDeliverRoom,rehash,paidOpening,paidNonstarter,regionalSupportReady};
