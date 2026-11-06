'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),FACTS=require('../src/game/23-provider-progression');
const customerId='starter-customer',copy=value=>JSON.parse(JSON.stringify(value));

test('AC-SOC-755 paid boundary history survives renewal and event pressure, rejects altered agreements, and matches worker dispatch',()=>{
 let state=SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty:'easy'});
 const customer=()=>state.providerCampaign.customers.find(c=>c.id===customerId);
 const send=command=>{state=SOC.dispatch(state,{type:'provider',command});};
 const buy=command=>{const q=SOC.provider.quote(state,command);assert.deepEqual(q.blockers,[],JSON.stringify({clock:state.clock,command,blockers:q.blockers}));send({...command,quoteRevision:q.atRevision});};
 const tick=()=>{
  for(const incident of state.providerCampaign.incidents.filter(i=>i.status==='active'))send({action:'acknowledge-incident',incidentId:incident.id});
  for(const incident of state.providerCampaign.incidents.filter(i=>i.status==='acknowledged')){
   if(state.providerCampaign.projects.some(p=>p.customerId===incident.customerId&&['repair','service-repair'].includes(p.operationId)&&p.acceptedAt>=incident.acknowledgedAt&&p.status!=='cancelled'))continue;
   const command={action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId},q=SOC.provider.quote(state,command);if(!q.blockers.length)send({...command,quoteRevision:q.atRevision});
  }
  state=SOC.dispatch(state,{type:'advance',minutes:1});
 };
 const until=(predicate,label)=>{for(let n=0;n<360&&!predicate();n++)tick();assert.ok(predicate(),`${label} at ${state.clock}`);};
 send({action:'staff',engineers:2,support:2});
 for(const stage of ['base','carrier','partner']){buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});until(()=>customer().stages[stage]?.status==='effective',stage);}
 buy({action:'operation',operationId:'bpo',customerId});until(()=>state.providerCampaign.projects.some(p=>p.operationId==='bpo'&&p.status==='complete'),'paid cover');
 until(()=>customer().status==='renewal','first renewal');
 send({action:'renew',customerId});const previousAgreement=copy(customer().retailAgreement);
 buy({action:'operation',operationId:'service-boundary-review',customerId});until(()=>state.providerCampaign.projects.some(p=>p.operationId==='service-boundary-review'&&p.status==='complete'),'paid boundary');
 const boundary=state.providerCampaign.projects.findLast(p=>p.operationId==='service-boundary-review');assert.equal(boundary.operationReceipt.plan.acceptedRetailAt,previousAgreement.at);
 const pruned=state.providerCampaign.eventCheckpoint.count;
 for(let n=0;n<220;n++)send({action:'staff',engineers:2+n%2,support:2});
 send({action:'staff',engineers:2,support:2});
 assert.ok(state.providerCampaign.eventCheckpoint.count>pruned,'real validated commands caused bounded event eviction');
 until(()=>customer().status==='renewal','second renewal');
 const before=copy(state),samples=copy(state.providerCampaign.supportObservation),last=FACTS.decodeSupportObservation(samples).at(-1).participants.find(p=>p.customerId===customerId);
 assert.ok(last.boundaries.some(b=>b.id===boundary.operationReceipt.plan.boundaryContract.id),'the actual paid boundary was observed before renewal');
 const command={type:'provider',command:{action:'renew',customerId}},expected=SOC.dispatch(state,command),workerInput=copy(state);let reply;
 const worker={postMessage:value=>{reply=value;}};vm.createContext(worker);vm.runInContext(SOC.workerSource(),worker);worker.onmessage({data:{id:'retail-renewal-history',state:workerInput,command}});
 assert.equal(reply.error,undefined);assert.deepEqual(copy(reply.state),expected);assert.deepEqual(workerInput,before,'worker leaves supplied input unchanged');state=expected;
 assert.deepEqual(state.providerCampaign.supportObservation,samples,'same-minute renewal preserves the already observed support window');
 const history=customer().retailAgreementHistory;assert.equal(history.version,1);assert.ok(history.entries.some(row=>row.at===previousAgreement.at&&row.priceCents===previousAgreement.priceCents));assert.deepEqual(history.entries.at(-1),customer().retailAgreement);
 assert.deepEqual(SOC.restore(JSON.stringify(state)),state);
 for(const mutate of [
  h=>{h.version=2;},
  h=>{h.entries.reverse();},
  h=>{h.entries[1].at=h.entries[0].at;},
  h=>{h.entries.find(row=>row.at===previousAgreement.at).at++;},
  h=>{h.entries.splice(2,0,{...h.entries[1],at:h.entries[1].at+1});},
  h=>{h.entries.at(-1).at=state.clock+1;},
  h=>{h.entries.find(row=>row.at===previousAgreement.at).priceCents--;},
  h=>{h.entries[0].budgetCents++;},
  h=>{h.entries.at(-1).priceCents--;}
 ]){const forged=copy(state);mutate(forged.providerCampaign.customers[0].retailAgreementHistory);assert.throws(()=>SOC.restore(JSON.stringify(forged)));}
 const missing=copy(state);missing.providerCampaign.customers[0].retailAgreementHistory.entries=missing.providerCampaign.customers[0].retailAgreementHistory.entries.filter(row=>row.at!==previousAgreement.at);
 missing.providerCampaign.projects.find(p=>p.id===boundary.id).operationReceipt.plan.acceptedRetailAt=customer().startedAt;
 assert.throws(()=>SOC.restore(JSON.stringify(missing)),'an edited paid boundary cannot hide a missing actual renewal entry');
 tick();assert.deepEqual(SOC.restore(JSON.stringify(state)),state);
});
