'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const R=require('../src/game/23-provider-regional-integrations.js');
const I=require('../src/game/23-provider-uc-cc-integration.js');
const H=require('../src/game/23-provider-support-history.js');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility.js');
const historyHooks={catalogue:SOC.catalogue,supportWorkOrigin:require('../src/game/23-provider-support-work.js').origin};
const customerId='starter-customer';
const child=s=>s.portfolio.customers.find(row=>row.id===customerId).root;
const customer=s=>s.providerCampaign.customers.find(row=>row.id===customerId);
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,command,blockers:q.blockers}));return send(s,{...command,quoteRevision:q.atRevision});}
const op=(s,id)=>buy(s,{action:'operation',operationId:id,customerId});
function minute(s){
 for(const c of s.providerCampaign.customers.filter(c=>c.status==='renewal'))s=send(s,{action:'renew',customerId:c.id});
 for(const incident of s.providerCampaign.incidents.filter(i=>i.status==='active'))s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
 for(const incident of s.providerCampaign.incidents.filter(i=>i.status==='acknowledged')){
  if(s.providerCampaign.projects.some(p=>p.customerId===incident.customerId&&['repair','service-repair'].includes(p.operationId)&&p.acceptedAt>=incident.acknowledgedAt&&p.status!=='cancelled'))continue;
  const command={action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId},q=SOC.provider.quote(s,command);if(!q.blockers.length)s=buy(s,command);
 }
 try{return SOC.dispatch(s,{type:'advance',minutes:1});}catch(error){if(process.env.SOC_REGIONAL_INTEGRATIONS_FAILURE)require('node:fs').writeFileSync(process.env.SOC_REGIONAL_INTEGRATIONS_FAILURE,JSON.stringify(s));throw error;}
}
function until(s,predicate,limit=180){for(let n=0;n<limit&&!predicate(s);n++)s=minute(s);assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
const complete=(s,id)=>until(s,x=>project(x,id)?.status==='complete');
function integrationHooks(s){return (_customer,root)=>({
 resourceReady:(r,id)=>SOC.observe(r,id),
 currentSupport:()=>{const record=RESPONSIBILITY.responsibilities(s,customerId,{observeResource:(r,id)=>SOC.observe(r,id)}).records.find(r=>r.role==='msp'&&r.organisationId==='orchard-msp');return {ready:!!record,scope:record?{projectIds:record.evidence.stageProjects.map(p=>p.projectId),postingIds:record.evidence.stageProjects.map(p=>p.postingId),resources:[...record.scope].sort()}:null};},
 currentBoundary:()=>{const scope=['phone','recorder','archive','engage'].filter(id=>root.boundaries?.bindings[id]).map(resourceId=>{const contractId=root.boundaries.bindings[resourceId];return {resourceId,contractId,generation:root.boundaries.contracts.find(c=>c.id===contractId).generation};});return {ready:scope.every(row=>require('../src/game/43-boundaries.js').evaluate(root,row.contractId).eligible&&SOC.observe(root,row.resourceId).ready),scope};}
 });}
function finishIntegration(s,integrationId){
 const testedAt=s.clock;
 s=send(s,{action:'test-service-integration',projectId:integrationId,quoteRevision:s.revision});
 s=until(s,x=>x.providerCampaign.jobs.some(j=>j.customerId===customerId&&j.channel==='voice'&&j.arrivalAt>=testedAt&&['completed','late'].includes(j.status)&&child(x).interactions.some(i=>i.id===j.interactionId&&i.phase==='resolved'&&!i.obligations.length&&[[I.SOURCE_ID,I.SOURCE_FEATURE],[I.TARGET_ID,I.TARGET_FEATURE]].every(([deploymentId,feature])=>i.trace.some(trace=>trace.code==='PRODUCT_FEATURE_ACCEPTED'&&trace.bindings?.some(binding=>binding.deploymentId===deploymentId&&binding.feature===feature))))&&child(x).records.some(r=>r.interaction===j.interactionId&&r.kind==='recording'&&(r.captureScope??'complete')==='complete'&&!r.deleted)));
 s=complete(op(s,'quality'),'quality');s=until(s,x=>x.providerCampaign.projects.find(p=>p.id===integrationId).status==='complete');
 return s;
}
let cached;
function fixture(){
 if(cached)return structuredClone(cached);
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});s=send(s,{action:'staff',engineers:4,support:4});
 for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=until(s,x=>customer(x).stages[stage].status==='effective');}
 for(const id of ['recording','bpo','ms-workplace-calling','cisco-contact-centre'])s=complete(op(s,id),id);
 s=until(s,x=>x.clock>=60);s=complete(op(s,'service-boundary-review'),'service-boundary-review');
 const phoneBefore=structuredClone(child(s).resources.phone);
 s=op(s,'uc-cc-integration');s=until(s,x=>project(x,'uc-cc-integration').status==='commissioning');
 assert.deepEqual(child(s).resources.phone,phoneBefore,'native integration commissioning does not rewrite phone configuration, generation or due time');
 const forgedPhone=structuredClone(s);child(forgedPhone).resources.phone.desired.signalling=false;assert.throws(()=>SOC.restore(JSON.stringify(forgedPhone)),/INVALID_PROVIDER_CONFIG_AUTHORITY/);
 s=finishIntegration(s,project(s,'uc-cc-integration').id);
 if(process.env.SOC_REGIONAL_INTEGRATIONS_STATE)require('node:fs').writeFileSync(process.env.SOC_REGIONAL_INTEGRATIONS_STATE,JSON.stringify(s));
 cached=structuredClone(s);return s;
}

test('AC-SOC-745 paid public UC/CC delivery yields a pure exact regional snapshot only after the reviewed task completes',()=>{
 const s=fixture(),before=JSON.stringify(s),reader=R.createReader(s,historyHooks,integrationHooks(s)),rows=reader.current(customerId),p=project(s,'uc-cc-integration');
 assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]).sort(),['id','source','target','sourceVersion','targetVersion','sourceGeneration','targetGeneration','checkedAt','features'].sort());
 assert.equal(R.bindingAvailableAt(s,customer(s),child(s),I.SOURCE_ID,I.SOURCE_FEATURE,p.configSubmittedAt-1),true);
 assert.equal(R.bindingAvailableAt(s,customer(s),child(s),I.SOURCE_ID,I.SOURCE_FEATURE,p.configSubmittedAt),false);
 assert.equal(R.bindingAvailableAt(s,customer(s),child(s),I.SOURCE_ID,I.SOURCE_FEATURE,p.operationReceipt.test.at),false,'same-clock explicit test cannot rewrite its existing support sample');
 assert.equal(R.bindingAvailableAt(s,customer(s),child(s),I.SOURCE_ID,I.SOURCE_FEATURE,p.operationReceipt.test.at+1),true);
 assert.equal(rows[0].id,I.EDGE_ID);assert.equal(rows[0].checkedAt,p.operationReceipt.test.at);assert.equal(reader.validAt(customer(s),rows[0],s.clock),true);
 assert.equal(reader.validAt(customer(s),rows[0],p.completedAt-1),false,'later reviewed completion cannot backfill an earlier minute');
 assert.equal(JSON.stringify(s),before);assert.deepEqual(SOC.restore(before),s);
});

test('AC-SOC-746 regional integration snapshots reject coherent foreign scope, unpaid proof, versions, test times and native-history deletion',()=>{
 const s=fixture(),edge=R.current(s,customerId,historyHooks,integrationHooks(s))[0];assert.ok(edge);
 for(const mutate of [
  (state,row)=>{row.sourceGeneration++;},
  (state,row)=>{row.checkedAt--;},
  (state,row)=>{row.features[0].targetFeature='transcription';},
  state=>{state.business.ledger.find(e=>e.id===project(state,'uc-cc-integration').postingId).cents++;},
  state=>{project(state,'uc-cc-integration').operationReceipt.task.quality.recordingId='unrelated';},
  state=>{project(state,'uc-cc-integration').operationReceipt.test.supportScope.projectIds[0]='foreign-project';},
  state=>{child(state).products.integrations[0].result=null;}
 ]){const forged=structuredClone(s),row=structuredClone(edge);mutate(forged,row);assert.equal(R.validAt(forged,customer(forged),row,s.clock,historyHooks),false);}
 assert.equal(R.validAt(s,{...customer(s),id:'foreign-customer'},edge,s.clock,historyHooks),false);
 assert.equal(R.validAt(s,customer(s),edge,s.clock,{}),false,'missing historical configuration input must fail closed');
 assert.deepEqual(R.current(s,customerId,historyHooks),[],'current service needs the real support and boundary observer hooks');
});

test('AC-SOC-747 historical regional proof survives a paid product retirement while current generation cannot reuse the old test',()=>{
 let s=fixture();const at=s.clock,edge=R.current(s,customerId,historyHooks,integrationHooks(s))[0];assert.ok(edge);
 s=buy(s,{action:'retire-project',projectId:project(s,'ms-workplace-calling').id});s=minute(s);
 assert.equal(R.validAt(s,customer(s),edge,at,historyHooks),true,'retirement does not rewrite the previously sampled service');
 assert.deepEqual(R.current(s,customerId,historyHooks,integrationHooks(s)),[]);
 s=complete(op(s,'ms-workplace-calling'),'ms-workplace-calling');
 assert.ok(child(s).products.deployments.find(d=>d.id===I.SOURCE_ID).generation>edge.sourceGeneration);
 assert.equal(R.validAt(s,customer(s),edge,at,historyHooks),true);
 assert.equal(R.validAt(s,customer(s),edge,s.clock,historyHooks),false,'new generation requires its own paid and reviewed integration');
 assert.deepEqual(R.current(s,customerId,historyHooks,integrationHooks(s)),[]);
 s=op(s,'uc-cc-retest');s=until(s,x=>project(x,'uc-cc-retest').status==='commissioning');s=finishIntegration(s,project(s,'uc-cc-retest').id);
 assert.equal(R.validAt(s,customer(s),edge,at,historyHooks),true,'native rebase history preserves the prior paid snapshot');
 const repaired=R.current(s,customerId,historyHooks,integrationHooks(s));assert.equal(repaired.length,1);assert.ok(repaired[0].sourceGeneration>edge.sourceGeneration);
 const missing=structuredClone(s);child(missing).products.integrations.find(e=>e.id===I.EDGE_ID).history=[];
 assert.equal(R.validAt(missing,customer(missing),edge,at,historyHooks),false,'the old paid task needs its native tested scope history');
});

test('AC-SOC-748 a same-generation paid boundary-scope retest retains the old regional minute without making the new scope retrospectively ready',()=>{
 let s=fixture();const at=s.clock,edge=R.current(s,customerId,historyHooks,integrationHooks(s))[0];assert.ok(edge);
 s=complete(op(s,'service-boundary-review'),'service-boundary-review');
 assert.equal(R.validAt(s,customer(s),edge,at,historyHooks),true);assert.deepEqual(R.current(s,customerId,historyHooks,integrationHooks(s)),[]);
 s=op(s,'uc-cc-retest');s=until(s,x=>project(x,'uc-cc-retest').status==='commissioning');const beforeTest=s.clock;
 s=finishIntegration(s,project(s,'uc-cc-retest').id);
 const current=R.current(s,customerId,historyHooks,integrationHooks(s));assert.equal(current.length,1);assert.equal(current[0].sourceGeneration,edge.sourceGeneration);assert.equal(current[0].targetGeneration,edge.targetGeneration);assert.ok(current[0].checkedAt>edge.checkedAt);
 assert.equal(R.validAt(s,customer(s),edge,at,historyHooks),true);
 assert.equal(R.validAt(s,customer(s),current[0],beforeTest,historyHooks),false);
 const native=child(s).products.integrations.find(row=>row.id===I.EDGE_ID);assert.equal(native.testHistory.version,1);assert.ok(native.testHistory.entries.some(row=>row.result.checkedAt===edge.checkedAt));
 const missing=structuredClone(s);delete child(missing).products.integrations.find(row=>row.id===I.EDGE_ID).testHistory;
 assert.equal(R.validAt(missing,customer(missing),edge,at,historyHooks),false);
});

test('AC-SOC-749 regional reader source serializes with the canonical history and integration kernels',()=>{
 const s=fixture(),box={require:require("node:module").createRequire(require("node:path").resolve(__dirname,"../src/game/23-provider-regional-integrations.js"))};vm.createContext(box);vm.runInContext(I.source()+H.source()+R.source()+';globalThis.reader=SOC_PROVIDER_REGIONAL_INTEGRATIONS;',box);
 const before=JSON.stringify(s),edge=R.current(s,customerId,historyHooks,integrationHooks(s))[0];
 assert.equal(box.reader.validAt(s,customer(s),edge,s.clock,historyHooks),true);
 assert.equal(box.reader.bindingAvailableAt(s,customer(s),child(s),edge.source,I.SOURCE_FEATURE,s.clock,{generation:edge.sourceGeneration,productVersion:edge.sourceVersion}),true);
 assert.equal(JSON.stringify(s),before,'serialized history inspection leaves every supplied state byte unchanged');
 const input=structuredClone(s),command={type:'advance',minutes:1},expected=SOC.dispatch(s,command);let reply;const worker={postMessage:value=>{reply=value;}};vm.createContext(worker);vm.runInContext(SOC.workerSource(),worker);worker.onmessage({data:{id:'regional-integration-history',state:input,command}});
 assert.equal(reply.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(reply.state)),expected);assert.equal(JSON.stringify(input),before,'worker dispatch leaves its supplied snapshot untouched');
});
