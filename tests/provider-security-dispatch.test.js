'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const SECURITY=require('../src/game/23-provider-security.js');
const CUSTOMER='starter-customer';

const customer=s=>s.providerCampaign.customers.find(row=>row.id===CUSTOMER);
const child=s=>s.portfolio.customers.find(row=>row.id===CUSTOMER).root;
const project=(s,operationId)=>s.providerCampaign.projects.findLast(row=>row.customerId===CUSTOMER&&row.operationId===operationId);
const dispatch=(s,command)=>SOC.dispatch(s,{type:'provider',command});
const voiceBusy=s=>child(s).interactions.some(row=>row.channel==='voice'&&['arrival','delivery','queued','handling','connected','wrap'].includes(row.phase));
function quoted(s,command){
 const q=SOC.provider.quote(s,command);
 assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,command,blockers:q.blockers}));
 return dispatch(s,{...command,quoteRevision:q.atRevision});
}
function advance(s){return SOC.dispatch(s,{type:'advance',minutes:1});}
function assertRejectedQuote(s,command){
 const before=JSON.stringify(s);let quote=null;
 try{quote=SOC.provider.quote(s,command);}catch(error){assert.match(error.message,/PROVIDER|SECURITY|QUOTE|PLAN|SELECTION/);assert.equal(JSON.stringify(s),before);return;}
 assert.ok(Array.isArray(quote.blockers)&&quote.blockers.length>0,'unsupported security terms must return a visible quote refusal');
 assert.equal(JSON.stringify(s),before,'a refused security quote cannot mutate paid Provider state');
}
function until(s,predicate,limit=180){
 for(let n=0;n<limit&&!predicate(s);n++)s=advance(s);
 assert.ok(predicate(s),'condition not reached at minute '+s.clock);
 return s;
}
function finishStage(s,stage){
 s=quoted(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
 return until(s,x=>customer(x)?.stages?.[stage]?.status==='effective');
}
function freshCustomer(){
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:781});
 s=dispatch(s,{action:'staff',engineers:4,support:4});
 for(const stage of ['base','carrier','partner'])s=finishStage(s,stage);
 return s;
}
function repairAuthoredCarrierOutage(s){
 s=until(s,x=>x.providerCampaign.incidents.some(i=>i.customerId===CUSTOMER&&i.resource==='carrier'&&i.status==='active'),60);
 const incident=s.providerCampaign.incidents.find(i=>i.customerId===CUSTOMER&&i.resource==='carrier'&&i.status==='active');
 assert.ok(incident,'the scenario-owned carrier incident must be visible before recovery');
 s=dispatch(s,{action:'acknowledge-incident',incidentId:incident.id});
 const command={action:'operation',operationId:'repair',customerId:CUSTOMER},q=SOC.provider.quote(s,command);
 assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,command,blockers:q.blockers}));
 s=dispatch(s,{...command,quoteRevision:q.atRevision});
 s=until(s,x=>project(x,'repair')?.status==='complete'&&x.providerCampaign.incidents.find(i=>i.id===incident.id)?.status==='resolved',60);
 assert.equal(SOC.observe(child(s),'carrier').ready,true,'the paid repair must restore the authored carrier dependency');
 return s;
}
function orderControl(s,control,planId){
 const operationId=SECURITY.operationIds[control],command={action:'operation',operationId,customerId:CUSTOMER,config:{planId}};
 s=until(s,x=>!voiceBusy(x),120);
 let q=SOC.provider.quote(s,command);
 for(let wait=0;q.blockers.includes('SECURITY_ACTIVE_CALLS')&&wait<120;wait++){s=advance(s);s=until(s,x=>!voiceBusy(x),120);q=SOC.provider.quote(s,command);}
 assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,command,blockers:q.blockers}));
 s=dispatch(s,{...command,quoteRevision:q.atRevision});
 const funded=project(s,operationId);
 assert.ok(funded,operationId+' must exist as an actual Provider project');
 assert.equal(funded.status,'running');
 assert.equal(funded.securityPlan.planId,planId);
 if(control==='network'){
  assert.ok(child(s).admissionSecurity,'the paid Provider operation installs a disabled native security pack');
  for(const name of ['network','sip','destination'])assert.equal(child(s).admissionSecurity.controls[name].effective,null,'funding alone cannot activate an uncommissioned or unpaid control');
 }
 s=until(s,x=>project(x,operationId)?.status==='complete');
 const completed=project(s,operationId),binding=SECURITY.bindingForProject(s,completed,child(s));
 assert.ok(binding,operationId+' must bind its paid posting to the effective native generation');
 if(control==='network'){
  const interrupted=s.providerCampaign.jobs.find(job=>job.customerId===CUSTOMER&&job.channel==='voice'&&job.arrivalAt>funded.acceptedAt&&job.status==='failed'&&child(s).interactions.find(i=>i.id===job.interactionId)?.trace.some(t=>t.stage==='security'&&t.code==='SECURITY_CALL_BLOCKED'));
  assert.ok(interrupted,'an ordinary authored voice job during first-control provisioning must encounter the real native security gate');
  const trace=child(s).interactions.find(i=>i.id===interrupted.interactionId).trace.find(t=>t.stage==='security'&&t.code==='SECURITY_CALL_BLOCKED');
  assert.deepEqual(trace.reasons.map(x=>x.control).sort(),['destination','network','sip'],'partial paid deployment keeps the complete voice-service prerequisite enforced');
 }
 return s;
}

let cachedSecurityState=null,cachedFirstPaidSecurityState=null;
function commissionedSecurityFixture(){
 if(cachedSecurityState)return SOC.restore(JSON.stringify(cachedSecurityState));
 let s=repairAuthoredCarrierOutage(freshCustomer());
 const initial=SECURITY.currentStatus(s,CUSTOMER,child(s));
 assert.equal(initial.voiceAdmissionReady,false);
 assert.equal(initial.nativePackStarted,false);assert.equal(initial.voiceAdmissionBlocked,false,'uninstalled security must not claim ordinary calling is blocked');
 assert.equal(initial.effectiveControlCount,0);

 assertRejectedQuote(s,{action:'operation',operationId:SECURITY.operationIds.network,customerId:CUSTOMER,config:{planId:'edge-basic',capacityPps:100000000}});
 assertRejectedQuote(s,{action:'operation',operationId:SECURITY.operationIds.network,customerId:CUSTOMER,config:{planId:'unpriced-unlimited'}});
 const expensive=SOC.provider.quote(s,{action:'operation',operationId:SECURITY.operationIds.network,customerId:CUSTOMER,config:{planId:'edge-resilient'}});
 assert.equal(expensive.commercial.security.totalMinimumSetupCents,74000,'complete required cost includes the selected premium control rather than the cheapest alternative');
 assert.equal(expensive.commercial.security.totalMinimumPeriodCents,17500);

 for(const [control,planId] of [['network','edge-basic'],['sip','sip-standard'],['destination','australia-guard']]){
  s=orderControl(s,control,planId);
  if(control==='network')cachedFirstPaidSecurityState=structuredClone(s);
  const status=SECURITY.currentStatus(s,CUSTOMER,child(s));
  assert.equal(status.effectiveControlCount,['network','sip','destination'].filter(name=>status.controls[name].status==='effective').length);
  assert.equal(status.voiceAdmissionReady,control==='destination');
  for(const name of ['network','sip','destination']){
   const native=child(s).admissionSecurity.controls[name];
   assert.equal(!!native.effective,status.controls[name].status==='effective',name+' must be effective only after its own paid project completes');
  }
  assert.equal(s.providerCampaign.projects.filter(row=>row.customerId===CUSTOMER&&row.operationId===SECURITY.operationIds[control]&&row.status==='complete').length,1);
 }
 assert.equal(SECURITY.currentStatus(s,CUSTOMER,child(s)).voiceAdmissionReady,true);
 assert.equal(SECURITY.currentStatus(s,CUSTOMER,child(s)).effectiveControlCount,3);
 for(const control of ['network','sip','destination']){
  const p=project(s,SECURITY.operationIds[control]),posting=s.business.ledger.find(row=>row.id===p.postingId);
  assert.ok(posting,control+' setup must be posted to the actual business ledger');
  assert.equal(posting.category,'cost');assert.equal(posting.reason,'provider-operation');assert.equal(posting.projectId,p.id);assert.equal(posting.cents,p.setupCents);
 }
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 cachedSecurityState=structuredClone(s);
 return s;
}

test('AC-SOC-784 paid Provider security projects commission each native control separately and keep voice blocked until all three are effective',()=>{
 const s=commissionedSecurityFixture();
 assert.equal(SECURITY.currentStatus(s,CUSTOMER,child(s)).voiceAdmissionReady,true);
 assert.equal(SECURITY.currentStatus(s,CUSTOMER,child(s)).effectiveControlCount,3);
});

test('AC-SOC-785 SOC restore rejects forged paid security and native controls while worker dispatch preserves the paid result',()=>{
 const s=commissionedSecurityFixture();
 const firstPaid=SOC.restore(JSON.stringify(cachedFirstPaidSecurityState));
 for(const mutate of [
  state=>{child(state).admissionSecurity.controls.network.desired.capacityPps++;},
  state=>{child(state).admissionSecurity.controls.network.effective.mitigationPps--;},
  state=>{project(state,SECURITY.operationIds.network).securityPlan.nativeConfig.capacityPps++;}
 ]){const forged=structuredClone(firstPaid);mutate(forged);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER|INVALID_SECURITY/);}
 const mutations=[
  state=>{child(state).admissionSecurity.controls.network.desired.capacityPps++;},
  state=>{child(state).admissionSecurity.controls.network.effective.mitigationPps--;},
  state=>{child(state).admissionSecurity.peers['synthetic-carrier'].observed.authenticated=false;},
  state=>{project(state,SECURITY.operationIds.network).securityPlan.nativeConfig.capacityPps++;},
  state=>{project(state,SECURITY.operationIds.sip).securityPlan.planId='sip-restricted';}
 ];
 for(const mutate of mutations){const forged=structuredClone(s);mutate(forged);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER|INVALID_SECURITY/);}
 const source=JSON.stringify(s),input=structuredClone(s),command={type:'advance',minutes:1},expected=SOC.dispatch(SOC.restore(source),command);
 let reply;const box={require:require('node:module').createRequire(require('node:path').resolve(__dirname,'../src/game/55-communications.js')),postMessage:value=>{reply=value;}};
 vm.createContext(box);vm.runInContext(SOC.workerSource(),box);box.onmessage({data:{id:'provider-security-paid-worker',state:input,command}});
 assert.equal(reply?.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(reply.state)),expected);
 assert.equal(JSON.stringify(input),source,'worker dispatch leaves the supplied paid Provider save unchanged');
});


test('AC-SOC-786 ordinary Provider demand resolves through all three paid controls and native usage settles once',()=>{
 let s=commissionedSecurityFixture();const readyAt=s.clock;
 const delivered=state=>state.providerCampaign.jobs.find(j=>j.customerId===CUSTOMER&&j.channel==='voice'&&j.arrivalAt>=readyAt&&j.status==='completed'&&child(state).admissionSecurity.settlements.some(row=>row.interactionId===j.interactionId&&row.cents>0));
 s=until(s,delivered,90);const job=delivered(s),root=child(s),call=root.interactions.find(i=>i.id===job.interactionId),settlement=root.admissionSecurity.settlements.find(row=>row.interactionId===job.interactionId);
 assert.equal(call.phase,'resolved');assert.notEqual(call.probe,true);assert.equal(call.caseId,job.caseId);
 assert.ok(call.finishedAt>call.startedAt);assert.ok(settlement.usage.length>0);
 assert.equal(settlement.cents,settlement.usage.length*2,'native security reconciles its authored two-cent core usage separately from Provider wholesale');
 assert.ok(root.cases[job.caseId].interactions.includes(call.id));
 assert.equal(SECURITY.currentStatus(s,CUSTOMER,root).voiceAdmissionBlocked,false);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const saved=structuredClone(settlement);s=advance(s);const later=child(s).admissionSecurity.settlements.filter(row=>row.interactionId===job.interactionId);
 assert.equal(later.length,1);assert.deepEqual(later[0],saved,'later ticks cannot charge the completed call a second time');
});
