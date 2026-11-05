const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const A=require('../src/game/93-ui/79-provider-context-actions.js');

const op=(id,resources=[],extra={})=>({id,kind:'operation',name:id,setupCents:1000,periodCents:0,workMinutes:2,resources,...extra});
const customer=(scenario='smb',extra={})=>({id:'customer-one',scenario,services:[],...extra});
const input=(c,operations,extra={})=>({customer:c,resource:null,operations,projects:[],incidents:[],...extra});
const ids=groups=>groups.flatMap(g=>g.operations.map(o=>o.id));
const group=(groups,key)=>groups.find(x=>x.key===key)?.operations.map(x=>x.id)||[];

test('an archive with pending processing exposes the paid processor action without inventing a storage upgrade',()=>{
 const model=input(customer('enterprise'),[op('transcription',['speech'])],{resource:{id:'archive',kind:'archive',storage:{pending:3,queued:200}}});
 const before=JSON.stringify(model),result=A.project(model);
 assert.deepEqual(group(result.primary,'service-growth'),['transcription']);
 assert.equal(JSON.stringify(model),before);
 model.projects=[{id:'processor-project',customerId:'customer-one',operationId:'transcription',status:'complete'}];
 assert.deepEqual(group(A.project(model).primary,'service-growth'),[],'a completed processor is not sold again as backlog recovery');
});

test('incident repair and typed measured carrier headroom are primary beside the affected resource',()=>{
 const operations=[op('repair',['carrier']),op('service-repair',['service']),op('carrier-headroom',['carrier']),op('managed-carrier-headroom',['carrier']),op('recording',['recorder'])];
 const model=input(customer('smb'),operations,{resource:{id:'carrier',kind:'trunk',pressure:{used:4,limit:4,unit:'concurrent sessions'}},incidents:[{id:'incident-one',customerId:'customer-one',resource:'carrier',status:'active'}]});
 const result=A.project(model);
 assert.deepEqual(group(result.primary,'incident-response'),['repair','service-repair']);
 assert.deepEqual(group(result.primary,'capacity'),['carrier-headroom','managed-carrier-headroom']);
 assert.deepEqual(ids(result.secondary),['recording']);
});

test('enterprise migration alternatives stay together until one is funded',()=>{
 const operations=[op('migration',['phone','desk']),op('migration-consolidated',['phone','desk']),op('quality',['recorder'])];
 const result=A.project(input(customer('enterprise'),operations));
 assert.deepEqual(group(result.primary,'scenario-alternatives'),['migration','migration-consolidated']);
 const started=A.project(input(customer('enterprise'),operations,{projects:[{id:'p1',customerId:'customer-one',kind:'operation',operationId:'migration',status:'running'}]}));
 assert.deepEqual(group(started.primary,'scenario-alternatives'),[]);
 assert.ok(ids(started.secondary).includes('quality'));
});

test('government architecture prerequisites and alternative plans use actual project states',()=>{
 const operations=[op('recording',['recorder','archive']),op('transcription',['speech','archive']),op('compliance',['archive','recorder','speech'],{requirements:['recording','transcription']}),op('compliance-local',['archive','recorder','speech'],{requirements:['recording','transcription']})];
 const blocked=operations.map(x=>x.id==='compliance'||x.id==='compliance-local'?{...x,available:false,blockers:['OPERATION_REQUIREMENT_REQUIRED:recording']}:x);
 const missing=A.project(input(customer('government'),blocked));
 assert.deepEqual(group(missing.primary,'service-prerequisites'),['recording','transcription']);
 assert.deepEqual(group(missing.locked,'scenario-alternatives'),['compliance','compliance-local']);
 const funded=[{id:'r',customerId:'customer-one',operationId:'recording',status:'complete'},{id:'t',customerId:'customer-one',operationId:'transcription',status:'complete'}];
 const ready=A.project(input(customer('government'),operations,{projects:funded}));
 assert.deepEqual(group(ready.primary,'scenario-alternatives'),['compliance','compliance-local']);
});

test('defence actions follow local deployment and measured continuity state',()=>{
 const operations=[op('local-deployment',['local','identity','phone']),op('local-spares',['local']),op('reconnect',['internet','phone']),op('sync-records',['local','archive']),op('sync-all',['local','archive'])];
 const absent=A.project(input(customer('defence'),operations));
 assert.deepEqual(group(absent.primary,'local-continuity'),['local-deployment']);
 const local={id:'local-project',customerId:'customer-one',operationId:'local-deployment',status:'complete'};
 const isolated=A.project(input(customer('defence',{continuity:{connected:false,outageActive:true,remainingMinutes:0,pendingCount:3}}),operations,{projects:[local]}));
 assert.deepEqual(group(isolated.primary,'local-continuity'),['reconnect','local-spares']);
 assert.deepEqual(group(isolated.primary,'local-reconciliation'),[]);
 const noReconnectAction=A.project(input(customer('defence',{continuity:{connected:false,outageActive:true,remainingMinutes:0,pendingCount:3}}),operations.filter(x=>x.id!=='reconnect'),{projects:[local]}));
 assert.ok(!ids(noReconnectAction.primary).includes('reconnect'),'the projection never invents an unsupported reconnect command');
 const spentSpare=A.project(input(customer('defence',{continuity:{connected:false,outageActive:true,remainingMinutes:0,pendingCount:3}}),operations,{projects:[local,{id:'spares-p',customerId:'customer-one',operationId:'local-spares',status:'complete'}]}));
 assert.ok(!ids(spentSpare.primary).includes('local-spares'),'one-off spares purchase does not repeat');
 const connected=A.project(input(customer('defence',{continuity:{connected:true,outageActive:false,pendingCount:3}}),operations,{projects:[local]}));
 assert.deepEqual(group(connected.primary,'local-reconciliation'),['sync-records','sync-all']);
});

test('UC/CC choices require the paid product pair and recording; retest also requires a stale existing edge',()=>{
 const operations=[op('recording',['recorder','archive']),op('uc-cc-integration',['phone','recorder','archive','engage'],{requirements:['ms-workplace-calling','cisco-contact-centre','recording']}),op('managed-uc-cc-integration',['phone','recorder','archive','engage'],{requirements:['ms-workplace-calling','cisco-contact-centre','recording']}),op('uc-cc-retest',['phone','recorder','archive','engage'],{requirements:['ms-workplace-calling','cisco-contact-centre','recording']}),op('managed-uc-cc-retest',['phone','recorder','archive','engage'],{requirements:['ms-workplace-calling','cisco-contact-centre','recording']})];
 const withoutPair=A.project(input(customer(),operations));assert.deepEqual(group(withoutPair.primary,'integration'),[]);assert.ok(!ids(withoutPair.primary).some(id=>id.includes('uc-cc')));assert.ok(!ids(withoutPair.secondary).some(id=>id.includes('uc-cc')));
 const pair=[{id:'a',customerId:'customer-one',operationId:'ms-workplace-calling',status:'complete'},{id:'b',customerId:'customer-one',operationId:'cisco-contact-centre',status:'complete'}];
 const needsRecording=A.project(input(customer(),operations,{projects:pair}));assert.deepEqual(group(needsRecording.primary,'service-prerequisites'),['recording']);assert.deepEqual(group(needsRecording.locked,'scenario-prerequisites'),['uc-cc-integration','managed-uc-cc-integration']);
 const initial=A.project(input(customer(),operations,{projects:[...pair,{id:'r',customerId:'customer-one',operationId:'recording',status:'complete'}]}));assert.deepEqual(group(initial.primary,'integration'),['uc-cc-integration','managed-uc-cc-integration']);assert.deepEqual(group(initial.primary,'integration-retest'),[]);
 const funded=[...pair,{id:'r',customerId:'customer-one',operationId:'recording',status:'complete'},{id:'i',customerId:'customer-one',operationId:'uc-cc-integration',status:'complete'}];
 const noEdge=A.project(input(customer(),operations,{projects:funded}));assert.deepEqual(group(noEdge.primary,'integration-retest'),[]);
 const stale=A.project(input(customer('smb',{serviceIntegration:{status:'stale'},products:{integrations:[{id:'workplace-to-contact-quality',result:{status:'scenario-verified'}}]}}),operations,{projects:funded}));
 assert.deepEqual(group(stale.primary,'integration-retest'),['uc-cc-retest','managed-uc-cc-retest']);
});

test('only currently available paid quality review is promoted, with resource-specific products',()=>{
 const operations=[op('quality',['recorder','people'],{available:true}),{...op('cisco-contact-centre',['recorder']),kind:'product'}, {...op('cisco-recording-archive',['archive']),kind:'product'}, {...op('unrelated-product',['room']),kind:'product'}];
 const model=input(customer(),operations,{resource:{id:'recorder',kind:'recorder'}}),result=A.project(model);
 assert.deepEqual(group(result.primary,'quality-review'),['quality']);
 assert.deepEqual(group(result.secondary,'resource-products'),['cisco-contact-centre']);
 assert.ok(!ids(result.secondary).includes('unrelated-product'),'a resource inspector does not show unrelated product offers');
 const unavailable=A.project(input(customer(),operations.map(x=>x.id==='quality'?{...x,available:false,blockers:['NO_REVIEWABLE_CALL']}:x),{resource:{id:'recorder',kind:'recorder'}}));
 assert.deepEqual(group(unavailable.primary,'quality-review'),[]);
});

test('engine-eligible rebuy actions stay secondary while a retired product may return as a paid replacement',()=>{
 const operations=[op('recording',['recorder']),{...op('cisco-contact-centre',['recorder']),kind:'product'}];
 const projects=[{id:'recording-project',customerId:'customer-one',operationId:'recording',status:'complete'},{id:'product-project',customerId:'customer-one',productId:'cisco-contact-centre',status:'complete'}];
 const funded=A.project(input(customer(),operations,{resource:{id:'recorder'},projects}));assert.deepEqual(ids(funded.primary),[]);assert.deepEqual(group(funded.secondary,'scenario-options'),['recording']);assert.ok(!ids(funded.secondary).includes('cisco-contact-centre'));
 const retired=A.project(input(customer(),operations,{resource:{id:'recorder'},projects:[...projects.slice(0,1),{...projects[1],retirement:{status:'retired'}}]}));
 assert.deepEqual(group(retired.secondary,'resource-products'),['cisco-contact-centre']);assert.deepEqual(group(retired.secondary,'scenario-options'),['recording']);
});

test('expired partner qualification and changed service boundary remain visible as secondary rebuy options',()=>{
 const operations=[op('partner-qualification',['identity'],{available:true}),op('service-boundary-review',['identity','phone','engage'],{available:true})];
 const projects=[{id:'qualification-old',customerId:'customer-one',operationId:'partner-qualification',status:'complete'},{id:'boundary-old',customerId:'customer-one',operationId:'service-boundary-review',status:'complete'}];
 const c=customer('smb',{responsibility:{qualification:{status:'expired'}},services:[{id:'identity'},{id:'phone'},{id:'engage'}]});
 const result=A.project(input(c,operations,{projects}));assert.deepEqual(group(result.secondary,'other-actions'),['partner-qualification','service-boundary-review']);assert.deepEqual(ids(result.primary),[]);
 const bpo=A.project(input(c,[op('bpo',['people','service'])],{projects:[{id:'bpo-old',customerId:'customer-one',operationId:'bpo',status:'complete'}]}));assert.ok(!ids(bpo.primary).includes('bpo'));assert.ok(!ids(bpo.secondary).includes('bpo'),'current campaign blocker is one funded BPO operation per customer');
});

test('projection is pure, unique and leaves every remaining eligible option in contextual secondary groups',()=>{
 const operations=[op('repair',['phone']),op('recording',['recorder']),op('transcription',['speech']),op('partner-qualification',['identity']),op('bpo',['people']),op('regional-provisioning',['engage'])];
 const model=input(customer(),operations,{incidents:[{id:'i',customerId:'customer-one',resource:'phone',status:'active'}]});
 const before=JSON.stringify(model),result=A.project(model),all=[...ids(result.primary),...ids(result.secondary),...ids(result.locked)];
 assert.equal(JSON.stringify(model),before);assert.equal(new Set(all).size,all.length);assert.deepEqual(all.sort(),operations.map(x=>x.id).sort());
 const context={};vm.createContext(context);vm.runInContext(A.source()+';globalThis.api=SOC_PROVIDER_CONTEXT_ACTIONS;',context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.api.project(model))),result);
});

test('customer-level service growth and recorder capacity use actual owned resources and pressure fields',()=>{
 const operations=[op('recording',['recorder']),op('transcription',['speech']),op('bpo',['people','service']),op('capture-headroom',['recorder'],{requirements:['recording']}),op('quality',['recorder','people'],{available:true})];
 const c=customer('smb',{services:[{id:'recorder',kind:'recorder',pressure:{used:4,limit:4,unit:'capture reservations'}},{id:'speech'},{id:'people'},{id:'service'}]});
 const projects=[{id:'recording-p',customerId:'customer-one',operationId:'recording',status:'complete'}];
 const result=A.project(input(c,operations,{projects}));
 assert.deepEqual(group(result.primary,'service-growth'),['transcription','bpo']);
 assert.deepEqual(group(result.primary,'capacity'),['capture-headroom']);
 assert.deepEqual(group(result.primary,'quality-review'),['quality']);
 const upgraded=A.project(input(c,operations,{projects:[...projects,{id:'capture-p',customerId:'customer-one',operationId:'capture-headroom',status:'complete'}]}));
 assert.deepEqual(group(upgraded.primary,'capacity'),['capture-headroom'],'headroom remains a repeatable upgrade');
});

test('resource scope limits secondary actions to the selected resource and its declared dependencies',()=>{
 const operations=[op('recording',['recorder']),op('partner-qualification',['identity']),{...op('cisco-contact-centre',['recorder']),kind:'product'},{...op('cisco-meeting-room',['room']),kind:'product'}];
 const c=customer('smb',{services:[{id:'recorder',dependencies:['archive']},{id:'speech'},{id:'room'}]});
 const selected=A.project(input(c,operations,{resource:{id:'recorder',kind:'recorder',dependencies:['archive']}}));
 assert.deepEqual(ids(selected.secondary),['recording','cisco-contact-centre']);
 assert.ok(!ids(selected.secondary).includes('partner-qualification'));
 assert.ok(!ids(selected.secondary).includes('cisco-meeting-room'));
});


test('scenario-owned requirements surface missing paid capture and rooms before advanced alternatives',()=>{
 const input={customer:{id:'c',scenario:'enterprise',requirements:{recording:true,meeting:true},services:[{id:'phone',observed:{ready:true}}]},operations:[{id:'recording',resources:['recorder','archive']},{id:'room',resources:['room']},{id:'migration',resources:['phone']}],projects:[],incidents:[]};
 const before=JSON.stringify(input),result=A.project(input);
 assert.deepEqual(result.primary.find(g=>g.key==='service-prerequisites').operations.map(o=>o.id),['recording','room']);assert.equal(JSON.stringify(input),before);
 input.customer.services.push({id:'room',observed:{ready:true}});assert.deepEqual(A.project(input).primary.find(g=>g.key==='service-prerequisites').operations.map(o=>o.id),['recording']);
});


test('external reach alternatives are offered on the Enterprise carrier and cease after either is funded',()=>{
 const operations=[op('direct-external-reach',['carrier']),op('managed-external-reach',['carrier'],{available:false,blockers:['EARNED_EXTERNAL_REACH_MARKET_REQUIRED']})];
 const model=input(customer('enterprise'),operations,{resource:{id:'carrier',kind:'trunk'}}),before=JSON.stringify(model),result=A.project(model);
 assert.deepEqual(group(result.primary,'scenario-alternatives'),['direct-external-reach']);
 assert.ok(ids(result.locked).includes('managed-external-reach'));
 assert.equal(JSON.stringify(model),before);
 const eligible=A.project({...model,operations:operations.map(o=>({...o,available:true,blockers:[]}))});
 assert.deepEqual(group(eligible.primary,'scenario-alternatives'),['direct-external-reach','managed-external-reach']);
 const funded=A.project({...model,projects:[{id:'funded-reach',customerId:'customer-one',operationId:'direct-external-reach',status:'complete'}]});
 assert.deepEqual([...ids(funded.primary),...ids(funded.secondary),...ids(funded.locked)],[]);
});
