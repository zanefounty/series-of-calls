'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),WORK=require('../src/game/23-provider-support-work');
const copy=x=>JSON.parse(JSON.stringify(x));
function opening(){
 let s=SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty:'easy'});
 for(const stage of ['base','carrier','partner']){const command={action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})},q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[]);s=SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
 while(s.providerCampaign.supportWork.origins.length<2){assert.ok(s.clock<20);s=SOC.dispatch(s,{type:'advance',minutes:1});}
 return s;
}
test('paid Provider work retains bounded exact origins through actual event eviction and restore',()=>{
 let s=opening();const initial=copy(s.providerCampaign.supportWork),cash=s.business.balance.cash,clock=s.clock;
 for(let n=0;n<205;n++)s=SOC.dispatch(s,{type:'provider',command:{action:'staff',engineers:n%2?2:3,support:1}});
 assert.equal(s.clock,clock);assert.equal(s.business.balance.cash,cash);assert.equal(s.providerCampaign.events.length,200);
 assert.deepEqual(s.providerCampaign.supportWork,initial);assert.equal(initial.origins.length,2);
 for(const row of initial.origins){assert.ok(!s.providerCampaign.events.some(e=>e.id===row.arrival.id));assert.ok(s.providerCampaign.jobs.some(j=>j.id===row.jobId));const child=s.portfolio.customers[0].root,i=child.interactions.find(i=>i.id===row.arrival.interactionId);assert.deepEqual(WORK.origin(s,row.customerId,i,s.clock),row.arrival);assert.equal(WORK.origin(s,row.customerId,i,row.completedAt-1),null);}
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const before=JSON.stringify(s);assert.equal(WORK.validate(s),true);assert.equal(JSON.stringify(s),before);
 const context={};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.postMessage=x=>context.result=x;context.onmessage({data:{id:1,state:copy(s),command:{type:'advance',minutes:1}}});assert.equal(context.result.error,undefined);assert.deepEqual(copy(context.result.state),SOC.dispatch(s,{type:'advance',minutes:1}));
});
test('support origins cannot be deleted, relabelled, future-dated or replaced by a different actual case',()=>{
 const good=opening();
 const changes=[s=>delete s.providerCampaign.supportWork,s=>{s.providerCampaign.supportWork.origins=[];delete s.portfolio.customers[0].root.providerSupportPins;},s=>s.providerCampaign.supportWork.version=99,s=>s.providerCampaign.supportWork.origins[0].customerId='foreign',s=>s.providerCampaign.supportWork.origins[0].completedAt=s.clock+1,s=>s.providerCampaign.supportWork.origins[0].arrival.id='provider-event-999999',s=>s.providerCampaign.supportWork.origins[0].arrival.interactionId=s.providerCampaign.supportWork.origins[1].arrival.interactionId,s=>s.portfolio.customers[0].root.providerSupportPins.interactionIds.pop()];
 for(const change of changes){const bad=copy(good);change(bad);const before=JSON.stringify(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_SUPPORT_WORK/);assert.equal(JSON.stringify(bad),before);}
});
test('settlement prunes old ordinary jobs while keeping the two actual support origins',()=>{
 let s=opening();const origins=copy(s.providerCampaign.supportWork.origins);
 while(s.clock<125){
  const incident=s.providerCampaign.incidents.find(i=>i.status==='active');
  if(incident){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});const command={action:'operation',operationId:'repair',customerId:incident.customerId},q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[]);s=SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
  s=SOC.dispatch(s,{type:'advance',minutes:1});
 }
 assert.ok(s.providerCampaign.jobCheckpoint.pruned>0);assert.deepEqual(s.providerCampaign.supportWork.origins,origins);
 for(const row of origins){const job=s.providerCampaign.jobs.find(j=>j.id===row.jobId);assert.ok(job?.settled);assert.ok(s.portfolio.customers[0].root.interactions.some(i=>i.id===row.arrival.interactionId));}
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
