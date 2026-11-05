'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications'),P=require('../src/game/23-provider-policy');
const customerId='starter-customer',child=s=>s.portfolio.customers[0].root;
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
const deployment=(s,id)=>child(s).products.deployments.find(d=>d.id==='d-'+id);
const op=id=>({action:'operation',operationId:id,customerId});
function career(scenario='government'){
 let state=SOC.create({experience:'campaign',scenario,seed:73,market:'au-sydney'});
 const send=command=>{state=SOC.dispatch(state,{type:'provider',command});};
 const buy=command=>{let q=SOC.provider.quote(state,command);if(q.blockers.some(b=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(b))){send({action:'staff',engineers:4,support:4});q=SOC.provider.quote(state,command);}assert.deepEqual(q.blockers,[],JSON.stringify({command,clock:state.clock,blockers:q.blockers}));send({...command,quoteRevision:q.atRevision});};
 const tick=()=>{
  state=SOC.dispatch(state,{type:'advance',minutes:1});
  const incident=state.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status));
  if(incident&&!['running','commissioning'].includes(project(state,'repair')?.status)){if(incident.status==='active')send({action:'acknowledge-incident',incidentId:incident.id});buy(op('repair'));}
 };
 const until=(predicate,limit=100)=>{for(let n=0;n<limit&&!predicate(state);n++)tick();assert.ok(predicate(state),'condition not reached at '+state.clock+' '+JSON.stringify(state.providerCampaign.projects.slice(-2).map(p=>({operation:p.operationId,status:p.status,error:p.error}))));};
 const operation=id=>{buy(op(id));until(s=>project(s,id).status==='complete');};
 buy({action:'purchase',offerId:'starter',planId:'swift',stage:'base'});until(s=>s.providerCampaign.customers[0].stages.base.status==='effective');operation('recording');
 for(const stage of ['carrier','partner'])buy({action:'purchase',offerId:'starter',planId:'swift',stage,customerId});until(s=>s.providerCampaign.customers[0].status==='active');
 return {get state(){return state;},send,buy,tick,until,operation,restore(){state=SOC.restore(JSON.stringify(state));}};
}
function retire(c,id){const p=project(c.state,id),before=JSON.stringify(c.state),q=SOC.provider.quote(c.state,{action:'retire-project',projectId:p.id});assert.equal(JSON.stringify(c.state),before);assert.deepEqual(q.blockers,[]);c.buy(q.request);c.tick();assert.equal(deployment(c.state,id).retirement.status,'retired');return p.id;}

for(const id of ['ms-government-boundary','cisco-government-boundary'])test(`${id} paid recommissioning obtains fresh generation-scoped evidence and resumes actual autonomous voice`,()=>{
 const c=career();c.operation('transcription');c.operation('compliance');c.operation(id);
 const original=deployment(c.state,id),generation=original.generation,oldProofs=structuredClone(child(c.state).productEvidence.requests.filter(r=>r.desired.deploymentId===original.id));
 assert.equal(oldProofs.length,2);assert.ok(oldProofs.every(r=>r.effective));
 const retiredProjectId=retire(c,id);c.restore();const cash=c.state.business.balance.cash;c.buy(op(id));
 const replacement=project(c.state,id);assert.notEqual(replacement.id,retiredProjectId);assert.equal(c.state.business.balance.cash,cash-replacement.setupCents);
 c.until(s=>project(s,id).status==='complete',65);
 const current=deployment(c.state,id),proofs=child(c.state).productEvidence.requests.filter(r=>r.desired.deploymentId===current.id&&r.desired.deploymentGeneration===current.generation);
 assert.ok(current.generation>generation);assert.equal(proofs.length,2);assert.ok(proofs.every(r=>r.effective&&r.effective.scope.deploymentGeneration===current.generation));
 for(const old of oldProofs)assert.deepEqual(child(c.state).productEvidence.requests.find(r=>r.id===old.id),old,'re-review preserves original scoped proof history');
 const at=c.state.clock;c.until(s=>s.providerCampaign.jobs.some(j=>j.channel==='voice'&&j.status==='completed'&&j.arrivalAt>=at&&child(s).interactions.some(i=>i.id===j.interactionId&&i.trace.some(t=>t.code==='PRODUCT_FEATURE_ACCEPTED'&&t.bindings?.some(b=>b.deploymentId===current.id)))));
 assert.equal(c.state.business.ledger.filter(p=>p.reason==='provider-operation'&&p.operationId===id).length,2);assert.deepEqual(SOC.restore(JSON.stringify(c.state)),c.state);
});

test('local speech paid recommissioning installs fresh model and integration scope before accepting new transcript work',()=>{
 const id='cisco-local-speech',c=career('enterprise');c.operation('transcription');c.operation('local-deployment');c.operation(id);
 const old=structuredClone(child(c.state).speechModels),generation=deployment(c.state,id).generation;retire(c,id);c.restore();c.operation(id);
 const current=deployment(c.state,id),model=child(c.state).speechModels.installations.find(i=>i.effective?.deploymentGeneration===current.generation),integration=child(c.state).speechModels.integrationTests.find(i=>i.effective?.deploymentGeneration===current.generation);
 assert.ok(current.generation>generation);assert.ok(model,'new product generation needs an actual new eligible model installation');assert.ok(integration,'new product generation needs current versioned integration evidence');
 for(const historical of old.installations)assert.deepEqual(child(c.state).speechModels.installations.find(i=>i.id===historical.id),historical);
 const at=c.state.clock;c.until(s=>child(s).information.jobs.some(j=>j.createdAt>=at&&j.status==='complete'&&j.speechModel?.generation===current.generation&&j.speechModel?.modelResourceId===model.desired.modelResourceId&&child(s).records.some(r=>r.interaction===j.interaction&&r.kind==='transcription')));
 assert.deepEqual(SOC.restore(JSON.stringify(c.state)),c.state);
});

test('retiring paid Provider operations prevents standing orders and paid recommissioning preserves explicit suspension',()=>{
 const id='cisco-provider-operations',c=career('smb');c.operation(id);
 const config={...P.create(),enabled:true,cashFloorCents:10000,lifetimeBudgetCents:200000,maxActions:1,engineerCeiling:2,supportCeiling:1,customerIds:[customerId],rules:[{id:'migration',kind:'migration',enabled:true,customerIds:[],operationId:'migration',stage:null,resourceId:'platform-cutover',thresholdPercent:null}]};
 c.send({action:'configure-policy',customerId,config});const actions=c.state.providerAutomation[0].actions.length;retire(c,id);
 for(let n=0;n<8;n++)c.tick();assert.equal(c.state.providerAutomation[0].actions.length,actions,'retired product cannot fulfil a new order');
 assert.equal(c.state.providerCampaign.projects.some(p=>p.operationId==='migration'),false);c.restore();
 c.send({action:'automation',customerId,enabled:false});
 const suspended=structuredClone(c.state.providerAutomation[0]);c.operation(id);
 assert.equal(c.state.providerAutomation[0].status,'suspended','recommissioning does not implicitly resume a deliberately suspended policy');
 assert.equal(c.state.providerAutomation[0].actions.length,suspended.actions.length);
 c.send({action:'configure-policy',customerId,config});c.until(s=>s.providerAutomation[0].actions.length===actions+1);
 const action=c.state.providerAutomation[0].actions.at(-1),order=c.state.providerCampaign.projects.find(p=>p.id===action.projectId);assert.equal(order.operationId,'migration');assert.equal(action.cents,order.setupCents);
 c.until(s=>project(s,'migration').status==='complete');assert.equal(SOC.operations.platform(child(c.state),'bea'),'migration-phone');assert.deepEqual(SOC.restore(JSON.stringify(c.state)),c.state);
});
