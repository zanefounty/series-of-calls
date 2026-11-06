'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const RECEIPTS=require('../src/game/23-provider-progression-receipts');
const SUPPORT=require('../src/game/23-provider-integration-support');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility');

const hooks={customerRoot:(s,id)=>s.portfolio.customers.find(x=>x.id===id)?.root||null,observeResource:(root,id)=>SOC.observe(root,id)};
const minute=s=>SOC.dispatch(s,{type:'advance',minutes:1});
const buy=(s,request)=>{const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],`${request.operationId||request.stage}: ${q.blockers}`);return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});};
function quoteAndBuy(s,request){let q=SOC.provider.quote(s,request);for(let n=0;q.blockers.length&&n<80;n++){assert.ok(q.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY','INSUFFICIENT_CASH'].includes(x)),`${request.operationId}: ${q.blockers}`);s=minute(s);q=SOC.provider.quote(s,request);}assert.deepEqual(q.blockers,[],`${request.operationId}: ${q.blockers}`);return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});}
function recoverAndTick(s){const row=s.providerCampaign.incidents.find(x=>x.status==='active');if(row&&!s.providerCampaign.projects.some(p=>p.customerId===row.customerId&&['repair','service-repair'].includes(p.operationId)&&['running','commissioning'].includes(p.status))){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:row.id}});const operationId=row.resource==='service'?'service-repair':'repair',q=SOC.provider.quote(s,{action:'operation',operationId,customerId:row.customerId});if(!q.blockers.length)s=SOC.dispatch(s,{type:'provider',command:{action:'operation',operationId,customerId:row.customerId,quoteRevision:q.atRevision}});}for(const c of s.providerCampaign.customers.filter(x=>x.status==='renewal'))s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId:c.id}});return minute(s);}
function until(s,predicate,limit=600){for(let n=0;n<limit&&!predicate(s);n++)s=recoverAndTick(s);assert.ok(predicate(s),`fixture stalled at ${s.clock}`);return s;}
function paidNonstarter(endAt=360){
 let s=SOC.create({experience:'campaign',scenario:'smb',seed:911});
 for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});s=until(s,x=>x.providerCampaign.customers[0].stages[stage].status==='effective');}
 s=quoteAndBuy(s,{action:'operation',operationId:'bpo',customerId:'starter-customer'});s=until(s,x=>x.providerCampaign.projects.some(p=>p.operationId==='bpo'&&p.status==='complete'));
 while(s.clock<180)s=recoverAndTick(s);
 s=buy(s,{action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});s=SOC.dispatch(s,{type:'provider',command:{action:'continue-career'}});
 for(const stage of ['carrier','partner'])s=buy(s,{action:'purchase',offerId:'next-1',planId:'swift',stage,customerId:'next-1-customer'});
 while(s.clock<endAt)s=recoverAndTick(s);
 return s;
}
function roomOwnerJourney(){
 let s=paidNonstarter();
 assert.equal(RECEIPTS.validate(s,hooks),true);
 s=SOC.dispatch(s,{type:'provider',command:{action:'claim-progression',sourceId:RECEIPTS.NONSTARTER,quoteRevision:s.revision}});
 const customerId='next-1-customer';
 s=until(s,x=>['active','renewal'].includes(x.providerCampaign.customers.find(c=>c.id===customerId)?.status),120);
 const request={action:'operation',operationId:'integrator-room',customerId};
 s=quoteAndBuy(s,request);
 s=until(s,x=>x.providerCampaign.projects.some(p=>p.customerId===customerId&&p.operationId==='integrator-room'&&p.status==='complete'));
 const project=s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId==='integrator-room');
 s=until(s,x=>x.portfolio.customers.find(c=>c.id===customerId).root.information.meetingSessions.some(m=>m.status==='completed'&&m.startedAt>=project.completedAt));
 return s;
}
function realCallAfterTest(s,customerId,at){const child=s.portfolio.customers.find(c=>c.id===customerId)?.root;return s.providerCampaign.jobs.some(j=>j.customerId===customerId&&j.channel==='voice'&&['completed','late'].includes(j.status)&&j.arrivalAt>=at&&child?.interactions.some(i=>i.id===j.interactionId&&i.phase==='resolved'&&!i.obligations.length&&i.context&&i.trace.some(t=>t.code==='PRODUCT_FEATURE_ACCEPTED'&&t.bindings?.some(b=>b.deploymentId==='d-ms-workplace-calling'&&b.feature==='telephony'))&&i.trace.some(t=>t.code==='PRODUCT_FEATURE_ACCEPTED'&&t.bindings?.some(b=>b.deploymentId==='d-cisco-contact-centre'&&b.feature==='quality-review')))&&child.records.some(r=>r.interaction===j.interactionId&&r.kind==='recording'&&(r.captureScope??'complete')==='complete'&&!r.deleted));}
function ucDirectDeliveryJourney(){
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:918});s=SOC.dispatch(s,{type:'provider',command:{action:'staff',engineers:6,support:6}});
 for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});s=until(s,x=>x.providerCampaign.customers[0].stages[stage].status==='effective');if(stage==='base'){s=quoteAndBuy(s,{action:'operation',operationId:'recording',customerId:'starter-customer'});s=until(s,x=>x.providerCampaign.projects.some(p=>p.operationId==='recording'&&p.status==='complete'));}}
 for(const id of ['bpo','ms-workplace-calling','cisco-contact-centre']){s=quoteAndBuy(s,{action:'operation',operationId:id,customerId:'starter-customer'});s=until(s,x=>x.providerCampaign.projects.some(p=>p.operationId===id&&p.status==='complete'));}
 while(s.clock<60)s=recoverAndTick(s);
 s=quoteAndBuy(s,{action:'operation',operationId:'uc-cc-integration',customerId:'starter-customer'});const project=s.providerCampaign.projects.findLast(p=>p.operationId==='uc-cc-integration');s=until(s,x=>x.providerCampaign.projects.some(p=>p.id===project.id&&p.status==='commissioning'));
 const testedAt=s.clock;s=SOC.dispatch(s,{type:'provider',command:{action:'test-service-integration',projectId:project.id,quoteRevision:s.revision}});s=until(s,x=>realCallAfterTest(x,'starter-customer',testedAt));
 s=quoteAndBuy(s,{action:'operation',operationId:'quality',customerId:'starter-customer'});s=until(s,x=>x.providerCampaign.projects.some(p=>p.operationId==='uc-cc-integration'&&p.status==='complete'));return s;
}

test('unpaid or direct integration delivery cannot claim recorder or room support ownership',()=>{
 const state=SOC.create({experience:'campaign',scenario:'enterprise',seed:914});
 assert.equal(SUPPORT.supportFor(state,'starter-customer',['recorder']).status,'blocked');
 assert.deepEqual(SUPPORT.supportFor(state,'starter-customer',['recorder']).missing,['PROVIDER_CUSTOMER_REQUIRED']);
 assert.equal(SUPPORT.supportFor(state,'starter-customer',['room']).status,'blocked');
 assert.throws(()=>SUPPORT.supportFor(state,'starter-customer',['room','room']),/INVALID_PROVIDER_INTEGRATION_SUPPORT_SCOPE/);
 assert.equal(SUPPORT.validateOwner(state,{version:1,adapter:'provider-room',customerId:'starter-customer',projectId:'provider-project-1'}),false);
});

test('a paid integrator-room contract covers only the room after its real meeting is delivered and retains that historical proof',()=>{
 const state=roomOwnerJourney(),customerId='next-1-customer',project=state.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId==='integrator-room');
 const current=SUPPORT.supportFor(state,customerId,['room'],{hooks});assert.equal(current.status,'ready',JSON.stringify({missing:current.missing,owners:RESPONSIBILITY.responsibilities(state,customerId,hooks),project,state:state.providerCampaign.projects.filter(p=>p.customerId===customerId&&p.operationId==='integrator-room')}));
 const owner=current.owners[0];assert.equal(owner.role,'integrator');assert.equal(owner.organisationId,'twig-integrations');assert.deepEqual(owner.scope,['room']);
 assert.deepEqual([owner.terms.setupCents,owner.terms.periodCents,owner.terms.workMinutes,owner.terms.engineers,owner.terms.support],[65000,10000,8,1,1]);
 assert.equal(owner.projectId,project.id);assert.equal(SUPPORT.validateOwner(state,owner,{hooks}),true);
 const meeting=state.portfolio.customers.find(c=>c.id===customerId).root.information.meetingSessions.find(m=>m.id===owner.evidence.meetingId);
 assert.ok(meeting&&meeting.status==='completed'&&meeting.endedAt>meeting.startedAt);
 const historicalAt=meeting.endedAt,persisted=minute(state),failedNow=structuredClone(persisted);failedNow.portfolio.customers.find(c=>c.id===customerId).root.resources.room.effective.enabled=false;
 const historical=SUPPORT.supportFor(failedNow,customerId,['room'],{at:historicalAt,hooks});assert.equal(historical.status,'ready',JSON.stringify(historical.missing));
 assert.equal(SUPPORT.validateOwner(failedNow,historical.owners[0],{at:historicalAt,hooks}),true,'a later outage does not rewrite the delivered owner period');
 assert.equal(SUPPORT.validateOwner(failedNow,owner,{at:failedNow.clock+1,hooks}),false,'future owner validation is outside the sampled state');
 const exited=structuredClone(persisted),exitedCustomer=exited.providerCampaign.customers.find(c=>c.id===customerId);exitedCustomer.status='exited';exitedCustomer.exitAt=exited.clock;
 assert.equal(SUPPORT.supportFor(exited,customerId,['room'],{at:historicalAt,hooks}).status,'ready','the real pre-exit support interval remains historically valid');
 assert.equal(SUPPORT.supportFor(exited,customerId,['room'],{hooks}).status,'blocked','an exited customer is not currently support eligible');
 const missingEnd=structuredClone(exited);delete missingEnd.providerCampaign.customers.find(c=>c.id===customerId).exitAt;
 assert.equal(SUPPORT.supportFor(missingEnd,customerId,['room'],{at:historicalAt,hooks}).status,'blocked','an exited customer without a validated end timestamp cannot supply historical eligibility');
 const forged=structuredClone(owner);forged.postingId='entry-999999';assert.equal(SUPPORT.validateOwner(state,forged),false);
 const retirement={action:'retire-service-project',projectId:project.id},retirementQuote=SOC.provider.quote(persisted,retirement);assert.deepEqual(retirementQuote.blockers,[]);
 let retired=SOC.dispatch(persisted,{type:'provider',command:{...retirement,quoteRevision:retirementQuote.atRevision}});while(retired.clock<retired.providerCampaign.projects.find(p=>p.id===project.id).serviceRetirement.effectiveAt)retired=minute(retired);
 assert.equal(SUPPORT.supportFor(retired,customerId,['room'],{hooks}).status,'blocked','actual paid service retirement ends current owner eligibility');
 assert.equal(SUPPORT.supportFor(retired,customerId,['room'],{at:historicalAt,hooks}).status,'ready','the same native retirement preserves support proof before its effective minute');
});

test('direct UC/CC delivery does not imply the separate paid vendor recorder-support route',()=>{
 const state=ucDirectDeliveryJourney();
 assert.deepEqual(SUPPORT.UC_TERMS,{setupCents:25000,periodCents:11000,workMinutes:6,engineers:0,support:2,resources:['archive','engage','phone','recorder']});
 const project=state.providerCampaign.projects.findLast(p=>p.operationId==='uc-cc-integration');assert.equal(project.status,'complete');
 const result=SUPPORT.supportFor(state,'starter-customer',['recorder'],{hooks});assert.equal(result.status,'blocked',JSON.stringify(result.missing));
 assert.deepEqual(result.missing,['PAID_SCOPED_INTEGRATION_OWNER_REQUIRED:recorder']);
 const managed=SOC.provider.quote(state,{action:'operation',operationId:'managed-uc-cc-integration',customerId:'starter-customer'});
 assert.ok(managed.blockers.includes('EARNED_UC_CC_MARKET_REQUIRED'),'the paid supplier-managed support route remains behind its earned market gate');
});
