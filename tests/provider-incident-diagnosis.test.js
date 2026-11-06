const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../src/game/23-provider-incident-diagnosis.js');

// These are pure-helper fixture seams. The production paid dispatcher and
// source-of-truth observation hooks are owned by the campaign integration.
const customer={id:'starter-customer'};
function fixture(kind='transport-domain'){
 const incident={id:'incident-1',customerId:customer.id,resource:'access',kind,fault:kind==='capacity'?'CAPACITY':kind==='outage'?'OUTAGE':kind==='disconnection'?'DISCONNECTED':kind==='boundary'?'BOUNDARY':'TRANSPORT_DOMAIN',status:'acknowledged',receipt:kind==='transport-domain'?{at:10,resource:'access',domain:'domain-a'}:{at:10,resource:'access'}};
 const provider={incidents:[incident],projects:[]},child={clock:20};
 let observation={version:1,at:20,customerId:customer.id,incidentId:incident.id,resource:incident.resource,incidentKind:incident.kind,incidentStatus:incident.status,incidentFault:incident.fault,receipt:structuredClone(incident.receipt),serviceReady:false,serviceReasons:['DEPENDENCY_UNAVAILABLE'],paths:[{from:'identity',to:'service',profile:'voice',ready:false,reason:'TRANSPORT_DOMAIN_FAILED',edges:[{id:'link-a',desiredGeneration:1,effectiveGeneration:1,domain:'domain-a',ready:false}]}]};
 const hooks={observe:()=>structuredClone(observation),validatePaidProject:(_p,_c,project)=>project.status!=='cancelled'&&project.setupCents===D.TERMS.setupCents,validateRecordedObservation:(_p,_c,_project,snapshot)=>JSON.stringify(snapshot)===JSON.stringify(observation)};
 return {incident,provider,child,hooks,get observation(){return observation;},set observation(value){observation=structuredClone(value);}};
}
function project(f){return {id:'diagnosis-1',postingId:'posting-1',kind:'operation',operationId:D.OPERATION_ID,customerId:customer.id,acceptedAt:20,completedAt:26,status:'complete',setupCents:D.TERMS.setupCents,periodCents:0,workMinutes:D.TERMS.workMinutes,engineers:D.TERMS.engineers,support:D.TERMS.support,config:{incidentId:f.incident.id}};}
function finish(f){f.child.clock=26;f.observation={...f.observation,at:26};}

test('AC-SOC-715 free incident inspection exposes measured paths without authorizing a paid action',()=>{
 const f=fixture(),before=JSON.stringify(f),view=D.publicInspection(f.provider,customer,f.child,f.incident.id,f.hooks);
 assert.equal(view.chargeCents,0);assert.equal(view.diagnosis,null);assert.deepEqual(view.actions,[]);assert.equal(view.observation.paths[0].edges[0].id,'link-a');assert.equal(JSON.stringify(f),before);
 const plan=D.plan(f.provider,customer,f.child,f.incident.id,f.hooks);assert.equal(plan.terms.setupCents,6000);assert.equal(plan.terms.periodCents,0);assert.equal(plan.terms.workMinutes,6);assert.equal(plan.terms.engineers,1);assert.equal(plan.terms.support,1);assert.deepEqual(plan.config,{incidentId:f.incident.id});assert.equal(JSON.stringify(f),before);
});

test('AC-SOC-716 paid diagnosis binds a transport-domain finding to the actual failed path and recommends repair without performing it',()=>{
 const f=fixture(),p=project(f);f.provider.projects.push(p);finish(f);const evidence=D.complete(f.provider,customer,p,f.child,f.hooks);
 assert.equal(evidence.cause.cause,'transport-domain');assert.equal(evidence.cause.domain,'domain-a');assert.equal(evidence.cause.basis,'incident-receipt-and-failed-path');assert.equal(evidence.decision.kind,'repair');assert.equal(evidence.actions.repair,'not-performed');assert.equal(evidence.actions.mitigation,'not-performed');
 p.operationReceipt={kind:D.OPERATION_ID,version:1,projectId:p.id,postingId:p.postingId,evidence:structuredClone(evidence)};
 assert.equal(D.validateDiagnosis(f.provider,customer,f.child,evidence,f.hooks,{historical:true}),true);

 const c=fixture('capacity'),cp=project(c);cp.id='diagnosis-capacity';cp.postingId='posting-capacity';c.provider.projects.push(cp);c.observation={...c.observation,paths:[{from:'identity',to:'service',profile:'meeting',ready:false,reason:'MEETING_CAPACITY_EXCEEDED',edges:[{id:'link-a',desiredGeneration:1,effectiveGeneration:1,domain:'domain-a',ready:true}]}]};finish(c);const mitigation=D.complete(c.provider,customer,cp,c.child,c.hooks);assert.equal(mitigation.cause.cause,'resource-capacity');assert.equal(mitigation.decision.kind,'mitigation');assert.equal(mitigation.actions.mitigation,'not-performed');
});

test('AC-SOC-717 symptoms alone produce an explicit accepted-loss conclusion rather than an invented cause',()=>{
 const f=fixture('outage');f.incident.receipt={at:10,resource:'other-resource'};f.observation={...f.observation,receipt:structuredClone(f.incident.receipt),serviceReady:null,serviceReasons:[],paths:[{from:'identity',to:'service',profile:'voice',ready:false,reason:'DEPENDENCY_UNAVAILABLE',edges:[]}]};
 const p=project(f);f.provider.projects.push(p);finish(f);const evidence=D.complete(f.provider,customer,p,f.child,f.hooks);
 assert.deepEqual(evidence.cause,{cause:'unconfirmed',resource:'access',basis:'symptoms-do-not-isolate-a-cause'});assert.equal(evidence.conclusion,'accepted-loss');assert.equal(evidence.decision.kind,'accepted-loss');assert.equal(evidence.actions.repair,'not-performed');
 p.operationReceipt={kind:D.OPERATION_ID,version:1,projectId:p.id,postingId:p.postingId,evidence:structuredClone(evidence)};assert.equal(D.validateDiagnosis(f.provider,customer,f.child,evidence,f.hooks,{historical:true}),true);
});

test('AC-SOC-718 stale symptoms, forged project scope, receipt edits and malformed observations fail closed',()=>{
 const f=fixture(),beforeReadiness=JSON.stringify(f);assert.equal(D.readiness(f.provider,customer,f.child,f.incident.id,f.hooks).eligible,true);assert.equal(JSON.stringify(f),beforeReadiness,'readiness is pure');
 const p=project(f);f.provider.projects.push(p);finish(f);const evidence=D.complete(f.provider,customer,p,f.child,f.hooks);p.operationReceipt={kind:D.OPERATION_ID,version:1,projectId:p.id,postingId:p.postingId,evidence:structuredClone(evidence)};
 f.observation={...evidence.observation,serviceReady:true,serviceReasons:[],paths:evidence.observation.paths.map(row=>({...row,ready:true,reason:null,edges:row.edges.map(edge=>({...edge,ready:true}))}))};assert.throws(()=>D.validateDiagnosis(f.provider,customer,f.child,evidence,f.hooks),/INVALID_PROVIDER_DIAGNOSIS_OBSERVATION/,'current validation refuses stale symptoms');f.observation=structuredClone(evidence.observation);
 const forged=structuredClone(evidence);forged.cause.domain='other-domain';p.operationReceipt.evidence=structuredClone(forged);assert.throws(()=>D.validateDiagnosis(f.provider,customer,f.child,forged,f.hooks,{historical:true}),/INVALID_PROVIDER_DIAGNOSIS/);
 p.operationReceipt.evidence=structuredClone(evidence);f.incident.receipt={...f.incident.receipt,domain:'other-domain'};assert.throws(()=>D.validateDiagnosis(f.provider,customer,f.child,evidence,f.hooks,{historical:true}),/INVALID_PROVIDER_DIAGNOSIS/);
 assert.throws(()=>D.validateObservation({...f.observation,version:2}),/INVALID_PROVIDER_DIAGNOSIS_OBSERVATION/);assert.throws(()=>D.validateObservation({...f.observation,paths:[{...f.observation.paths[0],edges:[{id:'invented-link',desiredGeneration:1,effectiveGeneration:1,domain:'domain-a',ready:false}]},{...f.observation.paths[0]}]}),/INVALID_PROVIDER_DIAGNOSIS_OBSERVATION/);
});

test('AC-SOC-719 generated worker source preserves pure diagnosis behavior',()=>{
 const worker=new Function(`${D.source()}\nreturn SOC_PROVIDER_INCIDENT_DIAGNOSIS;`)(),f=fixture(),main=D.publicInspection(f.provider,customer,f.child,f.incident.id,f.hooks),copy=worker.publicInspection(f.provider,customer,f.child,f.incident.id,f.hooks);
 assert.deepEqual(copy,main);assert.equal(worker.OPERATION_ID,'diagnose-incident');
});

test('diagnosis source is limited to the source assertion and does not alter other work',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/game/23-provider-incident-diagnosis.js'),'utf8');assert.match(source,/Paid, bounded incident diagnosis/);assert.doesNotMatch(source,/SOC\.dispatch\s*\(/);
});
