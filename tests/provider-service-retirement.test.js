'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),RETIRE=require('../src/game/23-provider-service-retirement'),RULES=require('../src/game/24-provider-rules'),CAMPAIGN=require('../src/game/25-provider-campaign');
const customerId='starter-customer',child=s=>s.portfolio.customers[0].root;
const op=(s,operationId)=>buy(s,{action:'operation',operationId,customerId});
function buy(s,command){const quote=SOC.provider.quote(s,command);assert.deepEqual(quote.blockers,[],JSON.stringify({command,blockers:quote.blockers}));return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:quote.atRevision}});}
function advance(s,to){while(s.clock<to){const incident=s.providerCampaign.incidents.find(i=>i.status==='active');if(incident){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=op(s,'repair');}s=SOC.dispatch(s,{type:'advance',minutes:1});}return s;}
function opening(to=80){let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=advance(s,15);s=op(s,'room');s=op(s,'recording');s=advance(s,30);s=op(s,'transcription');return advance(s,to);}
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
function enabled(s){assert.equal(s.providerCampaign.serviceRetirementVersion,1,'fresh campaign must opt into the implemented service contract');return structuredClone(s);}
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}

test('funded recording retirement plans only capture withdrawal and retains archive, records and actual capture reservations',()=>{
 const s=freeze(enabled(opening())),p=project(s,'recording'),before=JSON.stringify(s),view=RETIRE.preview(s,p.id),plan=RETIRE.plan(s,p.id);
 assert.deepEqual(view.blockers,[]);assert.deepEqual(plan.configs,{recorder:{enabled:false}});assert.deepEqual(plan.receipt.resources,['recorder']);assert.deepEqual(plan.receipt.retainedResources,['archive']);assert.equal(plan.receipt.effectiveAt,s.clock+1);assert.equal(plan.receipt.expectedGenerations.recorder,child(s).resources.recorder.generation+1);
 assert.equal(view.retainedRecords.length,child(s).records.filter(r=>!r.deleted).length);assert.ok(view.retainedRecords.length>0);assert.equal(view.retainedPeriodCents,3000);assert.equal(view.retainedStorage.basis,'retained-record-storage-v1');assert.equal(view.retainedStorage.condition,'WHILE_STORED_RECORDS_REMAIN');assert.equal(view.retainedStorage.startsAt,view.commitmentEndsAt);
 assert.deepEqual(view.reservations,child(s).captureReservations);assert.ok(view.reservations.length>0);assert.ok(view.activeCalls.length>0);assert.ok(view.activeCalls.every(c=>c.effect==='CAPTURE_WITHDRAWN'&&c.conversationFailureGuaranteed===false));assert.equal(view.workflows.existingInputPreserved,true);assert.ok(!view.affectedWork.some(w=>w.kind==='processing'),'existing captured input is not withdrawn with recorder');
 assert.equal(JSON.stringify(s),before,'preview/plan never mutate frozen state or advance time');
});

test('room and processing retirement scopes actual sessions/jobs and keeps unrelated platform and archive configuration untouched',()=>{
 const s=enabled(opening()),room=RETIRE.preview(s,project(s,'room').id),later=enabled(opening(44)),speech=RETIRE.preview(later,project(later,'transcription').id);
 assert.deepEqual(room.configs,{room:{enabled:false}});assert.ok(room.meetings.some(m=>child(s).information.meetingSessions.some(actual=>actual.id===m.id&&actual.status==='active')));assert.ok(room.meetings.every(m=>m.effect==='ROOM_WITHDRAWN'));
 assert.deepEqual(speech.configs,{speech:{enabled:false}});assert.deepEqual(speech.retainedResources,['archive']);assert.equal(speech.retainedPeriodCents,0,'retained recording storage has its own explicit supplier descriptor');
 assert.ok(speech.processing.length>0,'a real queued processing job must exercise the affected path');for(const row of speech.processing){const actual=child(later).information.jobs.find(j=>j.id===row.id);assert.ok(actual);assert.equal(row.affected,actual.plan.processor==='speech');assert.equal(row.sourceRecordId,actual.source);}
 assert.ok(!Object.hasOwn(room.configs,'phone'));assert.ok(!Object.hasOwn(speech.configs,'identity'));assert.ok(!Object.hasOwn(speech.configs,'archive'));
});

test('remaining supplier cost matches authoritative cumulative-cent exposure and a copied no-record fixture has no retained storage charge',()=>{
 const s=enabled(opening()),p=project(s,'recording'),calls=[],hook=(project,customer,from,to)=>{calls.push({from,to});return CAMPAIGN.operationExposure(project,customer,from,to);},view=RETIRE.preview(s,p.id,{operationExposure:hook});
 assert.ok(calls.length>1);assert.equal(calls[0].from,s.clock);assert.equal(calls.at(-1).to,view.commitmentEndsAt);
 const expected=p.periodCents*p.minimumTermPeriods-Math.floor(p.periodCents*(s.clock-p.completedAt)/60);assert.equal(view.remainingMinimumSupplierCents,expected);assert.deepEqual(RETIRE.preview(s,p.id),view);
 const noRecords=structuredClone(s);child(noRecords).records=[];const empty=RETIRE.preview(noRecords,p.id);assert.equal(empty.retainedStorage.charged,false);assert.equal(empty.retainedPeriodCents,0);assert.deepEqual(empty.retainedResources,['archive']);
});

test('active paid product dependencies and overlapping funded room services are named and refuse retirement before any configuration changes',()=>{
 let s=opening();s=op(s,'ms-meetings-room');s=advance(s,s.clock+12);s=enabled(s);const p=project(s,'room'),before=JSON.stringify(s),view=RETIRE.preview(s,p.id);
 assert.ok(view.blockers.includes('SERVICE_DEPENDENT_PAID_PRODUCT'));assert.ok(view.dependentProducts.some(d=>d.operationId==='ms-meetings-room'&&d.deploymentId==='d-ms-meetings-room'&&d.dependencies.some(x=>x.kind==='calendar'&&x.resourceId==='room')));assert.throws(()=>RETIRE.plan(s,p.id),/SERVICE_DEPENDENT_PAID_PRODUCT/);assert.equal(JSON.stringify(s),before);
 // An explicit projection counterexample represents a second still-funded room
 // agreement; it is not claimed as an authorized duplicate campaign purchase.
 const overlap=enabled(opening()),other={...structuredClone(project(overlap,'room')),id:'provider-project-overlap',operationId:'distributor-room'};overlap.providerCampaign.projects.push(other);const blocked=RETIRE.preview(overlap,project(overlap,'room').id);assert.ok(blocked.blockers.includes('SERVICE_DEPENDENT_FUNDED_PROJECT'));assert.ok(blocked.dependentProjects.some(p=>p.projectId===other.id));
});

test('legacy, unknown versions, pending projects, cross-customer scope and missing paid lineage fail safely',()=>{
 const base=opening(),p=project(base,'recording'),legacy=structuredClone(base);delete legacy.providerCampaign.serviceRetirementVersion;assert.equal(RETIRE.preview(legacy,p.id).status,'unavailable');assert.throws(()=>RETIRE.plan(legacy,p.id),/VERSION_NOT_ENABLED/);
 for(const version of [null,0,2,'1']){const bad=enabled(base);bad.providerCampaign.serviceRetirementVersion=version;assert.throws(()=>RETIRE.preview(bad,p.id),/INVALID_PROVIDER_SERVICE_RETIREMENT_VERSION/);}
 const s=enabled(base);assert.deepEqual(RETIRE.preview(s,'missing-project').blockers,['SERVICE_PROJECT_NOT_FOUND']);assert.throws(()=>RETIRE.preview(s,{}),/INVALID_PROVIDER_SERVICE_PROJECT_ID/);
 const pending=structuredClone(s);project(pending,'recording').status='commissioning';assert.ok(RETIRE.preview(pending,p.id).blockers.includes('SERVICE_PROJECT_NOT_COMPLETE'));
 const crossed=structuredClone(s);child(crossed).providerCustomer.id='other-customer';assert.ok(RETIRE.preview(crossed,p.id).blockers.includes('SERVICE_CUSTOMER_SCOPE_MISMATCH'));
 const missing=structuredClone(s);missing.business.ledger=missing.business.ledger.filter(e=>e.id!==p.postingId);assert.ok(RETIRE.preview(missing,p.id).blockers.includes('SERVICE_PAID_PROJECT_REQUIRED'));
 const already=structuredClone(s);project(already,'recording').serviceRetirement=RETIRE.plan(s,p.id).receipt;assert.ok(RETIRE.preview(already,p.id).blockers.includes('SERVICE_ALREADY_RETIRING'));project(already,'recording').serviceRetirement.version=2;assert.throws(()=>RETIRE.preview(already,p.id),/RECEIPT_VERSION/);
});

test('worker projection produces identical deterministic configs and receipt facts',()=>{
 const s=enabled(opening()),id=project(s,'recording').id,context={state:structuredClone(s),id};vm.createContext(context);vm.runInContext(RULES.source()+RETIRE.source()+';result=SOC_PROVIDER_SERVICE_RETIREMENT.plan(state,id);',context);assert.deepEqual(JSON.parse(JSON.stringify(context.result)),RETIRE.plan(s,id));
});
