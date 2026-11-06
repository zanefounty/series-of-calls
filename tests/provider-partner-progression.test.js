'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const P5=require('../src/game/23-provider-partner-progression');
const UC_CC=require('../src/game/23-provider-uc-cc-integration');
const ROOM=require('../src/game/23-provider-room-integration');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility');
const SUPPORT=require('../src/game/23-provider-integration-support');
const RECEIPTS=require('../src/game/23-provider-progression-receipts');
const PRODUCTS=require('../src/game/45-products');
const BOUNDARIES=require('../src/game/43-boundaries');
const PARTNER_FIXTURE=require('./provider-progression-receipts.helpers.js');
const roomCustomerId='starter-customer',roomOperationId=ROOM.OPERATION_ID;
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function quoted(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],`${command.operationId||command.action}: ${q.blockers.join(',')}`);return send(s,{...command,quoteRevision:q.atRevision});}
function advance(s){return SOC.dispatch(s,{type:'advance',minutes:1});}
function repair(s,customerId=roomCustomerId){for(let n=0;n<4;n++){const incident=s.providerCampaign.incidents.find(row=>row.customerId===customerId&&['active','acknowledged'].includes(row.status));if(!incident)return s;if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});const operation=incident.kind==='transport-domain'?'transport-repair':incident.resource==='service'?'service-repair':'repair',request={action:'operation',operationId:operation,customerId},q=SOC.provider.quote(s,request);if(q.blockers.length)return s;s=send(s,{...request,quoteRevision:q.atRevision});return s;}return s;}
function tick(s,customerId=roomCustomerId){s=repair(s,customerId);for(const customer of s.providerCampaign.customers.filter(row=>row.status==='renewal'))s=send(s,{action:'renew',customerId:customer.id});return advance(s);}
function until(s,predicate,limit=180,customerId=roomCustomerId){for(let n=0;n<limit&&!predicate(s);n++)s=tick(s,customerId);if(!predicate(s)){const root=s.portfolio.customers.find(c=>c.id===customerId)?.root,view=SOC.provider.inspect(s).customers.find(c=>c.id===customerId),edge=root?.products?.integrations?.find(x=>x.id===ROOM.EDGE_ID);assert.ok(false,`condition not reached at minute ${s.clock}: ${JSON.stringify({projects:s.providerCampaign.projects.filter(p=>p.customerId===customerId).map(p=>({operationId:p.operationId,status:p.status,error:p.error,acceptedAt:p.acceptedAt,configSubmittedAt:p.configSubmittedAt,expectedGenerations:p.expectedGenerations,operationReceipt:p.operationReceipt})),room:{resource:root?.resources.room,observed:SOC.observe(root,'room'),service:view?.services.find(x=>x.id==='room'),productGate:view?.products?.features?.filter(x=>x.resource==='room'),boundary:root?.boundaries?.bindings?.room?BOUNDARIES.evaluate(root,root.boundaries.bindings.room):null},products:{deployments:root?.products?.deployments?.filter(d=>['d-ms-meetings-room','d-cisco-meetings-interoperability'].includes(d.id)).map(d=>({id:d.id,generation:d.generation,provisioning:d.provisioning,effective:d.effective})),edge:edge?{source:edge.source,target:edge.target,sourceGeneration:edge.sourceGeneration,targetGeneration:edge.targetGeneration,result:edge.result,testHistory:edge.testHistory}:null,features:['d-ms-meetings-room','d-cisco-meetings-interoperability'].map(id=>({id,feature:id==='d-ms-meetings-room'?'room-devices':'interop-join',status:PRODUCTS.featureStatus(root,id,id==='d-ms-meetings-room'?'room-devices':'interop-join')}))},meeting:root?.information?.meeting,sessions:root?.information?.meetingSessions?.slice(-3),incidents:s.providerCampaign.incidents.filter(i=>i.customerId===customerId&&i.status!=='resolved')})}`);}return s;}
function operationProject(s,id,customerId=roomCustomerId){return s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId===id);}
function startOperation(s,id,customerId=roomCustomerId){if(id===roomOperationId){const q=SOC.provider.quote(s,{action:'operation',operationId:id,customerId}),view=SOC.provider.inspect(s).customers.find(x=>x.id===customerId),root=s.portfolio.customers.find(x=>x.id===customerId)?.root;assert.deepEqual(q.blockers,[],`${id}: ${q.blockers.join(',')} ${JSON.stringify({clock:s.clock,room:root?.resources.room,roomService:view?.services.find(x=>x.id==='room'),projects:s.providerCampaign.projects.filter(p=>p.customerId===customerId).map(p=>[p.operationId,p.status]),path:root&&SOC.transport.resourcePath(root,'identity','room','meeting')})}`);return send(s,{action:'operation',operationId:id,customerId,quoteRevision:q.atRevision});}if(id==='integrator-room')return quoted(s,{action:'operation',operationId:id,customerId,config:{version:1,roomMode:'bridge'}});return quoted(s,{action:'operation',operationId:id,customerId});}
function roomDeliveryJourney(){
 let s=SOC.create({experience:'campaign',scenario:'enterprise',difficulty:'easy',seed:383});
 s=send(s,{action:'staff',engineers:8,support:8});
 for(const stage of ['base','carrier','partner']){s=quoted(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:roomCustomerId})});s=until(s,x=>x.providerCampaign.customers[0].stages[stage].status==='effective');}
 for(const id of ['recording','ms-meetings-room','cisco-meetings-interoperability','primary-upstream']){s=startOperation(s,id);s=until(s,x=>operationProject(x,id)?.status==='complete');}
 s=startOperation(s,roomOperationId);s=until(s,x=>operationProject(x,roomOperationId)?.status==='commissioning');
 s=send(s,{action:'test-service-integration',projectId:operationProject(s,roomOperationId).id,quoteRevision:s.revision});
 s=until(s,x=>operationProject(x,roomOperationId)?.status==='complete');
 return s;
}
function roomHooks(){
 const resourceReady=(root,id)=>{const r=root?.resources?.[id];return !!r&&r.provisioning?.status==='ready'&&!!r.effective?.enabled;};
 return {room:{resourceReady,featureStatus:(root,id,feature)=>PRODUCTS.featureStatus(root,id,feature),meetingPath:root=>SOC.transport.resourcePath(root,'identity','room','meeting')},observeResource:resourceReady};
}
function ucHooks(){
 const resourceReady=(root,id)=>{const r=root?.resources?.[id];return !!r&&r.provisioning?.status==='ready'&&!!r.effective?.enabled;};
 return {observeResource:resourceReady,ucCc:{resourceReady,currentSupport:(state,customer,root)=>{const response=RESPONSIBILITY.responsibilities(state,customer.id,{observeResource:resourceReady}),record=response.records.find(x=>x.role==='msp'&&x.organisationId==='orchard-msp');return {ready:!!record,scope:record?{projectIds:record.evidence.stageProjects.map(x=>x.projectId),postingIds:record.evidence.stageProjects.map(x=>x.postingId),resources:[...record.scope].sort()}:null};},currentBoundary:(state,customer,root)=>{const scope=[];let ready=true;for(const resourceId of ['phone','recorder','archive','engage']){const contractId=root.boundaries?.bindings?.[resourceId];if(!contractId)continue;const contract=root.boundaries.contracts.find(x=>x.id===contractId);scope.push({resourceId,contractId,generation:contract?.generation||0});if(!BOUNDARIES.evaluate(root,contractId).eligible)ready=false;}return {ready,scope};}}};
}
function completedVoice(s,after){const root=s.portfolio.customers.find(x=>x.id===roomCustomerId)?.root;return s.providerCampaign.jobs.some(j=>j.customerId===roomCustomerId&&j.channel==='voice'&&['completed','late'].includes(j.status)&&j.arrivalAt>=after&&root?.interactions.some(i=>i.id===j.interactionId&&i.phase==='resolved'&&i.caseId===j.caseId&&i.context));}
function assertRetainedSingleP5(state,evidence,hooks){assert.deepEqual(P5.validateEvidence(state,evidence,hooks),{valid:false,missing:['five-distinct-current-tested-partner-integrations-required'],historical:true,count:1});}
function ucDeliveryJourney(){
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:771});s=send(s,{action:'staff',engineers:6,support:6});
 for(const stage of ['base','carrier','partner']){s=quoted(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:roomCustomerId})});s=until(s,x=>x.providerCampaign.customers[0].stages[stage].status==='effective');if(stage==='base'){s=startOperation(s,'recording');s=until(s,x=>operationProject(x,'recording')?.status==='complete');}}
 for(const id of ['bpo','ms-workplace-calling','cisco-contact-centre']){s=startOperation(s,id);s=until(s,x=>operationProject(x,id)?.status==='complete');}
 s=until(s,x=>x.clock>=60);
 s=startOperation(s,'uc-cc-integration');s=until(s,x=>operationProject(x,'uc-cc-integration')?.status==='commissioning');
 const at=s.clock;s=send(s,{action:'test-service-integration',projectId:operationProject(s,'uc-cc-integration').id,quoteRevision:s.revision});
 s=until(s,x=>completedVoice(x,at));
 s=startOperation(s,'quality');s=until(s,x=>operationProject(x,'quality')?.status==='complete');
 s=until(s,x=>operationProject(x,'uc-cc-integration')?.status==='complete');
 return s;
}
function paidRoomPartnerJourney(){
 let s=SOC.create({experience:'campaign',scenario:'smb',seed:911});
 for(const stage of ['base','carrier','partner']){const request={action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})};s=quoted(s,request);s=until(s,x=>x.providerCampaign.customers.find(c=>c.id==='starter-customer').stages[stage].status==='effective');}
 s=startOperation(s,'bpo');s=until(s,x=>operationProject(x,'bpo')?.status==='complete');while(s.clock<180)s=tick(s);
 const nextQuote=SOC.provider.quote(s,{action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});assert.deepEqual(nextQuote.blockers,[],`next opportunity at ${s.clock}: ${JSON.stringify({mission:s.providerCampaign.mission,history:s.providerCampaign.periodHistory,customers:s.providerCampaign.customers.map(c=>({id:c.id,status:c.status,history:c.history,failedStreak:c.failedStreak})),incidents:s.providerCampaign.incidents})}`);s=send(s,{action:'purchase',offerId:'next-1',planId:'swift',stage:'base',quoteRevision:nextQuote.atRevision});s=send(s,{action:'continue-career'});
 for(const stage of ['carrier','partner'])s=quoted(s,{action:'purchase',offerId:'next-1',planId:'swift',stage,customerId:'next-1-customer'});
 while(s.clock<360)s=tick(s,'next-1-customer');assert.equal(RECEIPTS.validate(s),true);s=send(s,{action:'claim-progression',sourceId:RECEIPTS.NONSTARTER,quoteRevision:s.revision});
 const customerId='next-1-customer';s=send(s,{action:'staff',engineers:8,support:8});for(const id of ['recording','ms-meetings-room','cisco-meetings-interoperability','primary-upstream']){s=startOperation(s,id,customerId);s=until(s,x=>operationProject(x,id,customerId)?.status==='complete',180,customerId);}
 // The paid integrator's quoted bridge configuration establishes the native
 // room generation first. The separately paid edge test then binds to that
 // generation instead of being invalidated by an untested mode change.
 s=startOperation(s,'integrator-room',customerId);s=until(s,x=>operationProject(x,'integrator-room',customerId)?.status==='complete',120,customerId);
 s=startOperation(s,roomOperationId,customerId);s=until(s,x=>operationProject(x,roomOperationId,customerId)?.status==='commissioning',60,customerId);
 const project=operationProject(s,roomOperationId,customerId);s=send(s,{action:'test-service-integration',projectId:project.id,quoteRevision:s.revision});
 s=until(s,x=>operationProject(x,roomOperationId,customerId)?.status==='complete',120,customerId);return s;
}

test('P5 stays incomplete until five exact paid tested service edges have current owners',()=>{
 const state=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:771});
 const result=P5.evaluate(state);
 assert.equal(result.status,'incomplete');
 assert.equal(result.count,0);
 assert.equal(result.target,5);
 assert.deepEqual(result.missing,[
  'provider-partner-integration-required:workplace-to-suite-calling',
  'provider-partner-integration-required:communications-api-to-engagement-workflow',
  'provider-partner-integration-required:local-speech-product-integration'
 ]);
 assert.equal(result.integrations.length,0);
 const customerId=state.providerCampaign.customers[0]?.id||'starter-customer';
 assert.equal(UC_CC.evaluate(state,customerId).status,'unavailable','the real UC/CC adapter has no funded project to report');
 assert.equal(ROOM.projectEvidence(state,'provider-project-absent').ready,false,'the real room adapter refuses an absent paid project');
});

test('caller-supplied aliases, generic rows, duplicate directions and unsupported edges cannot forge retained P5 evidence',()=>{
 const state=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:772});
 const fake={version:1,adapter:'provider-uc-cc',key:'workplace-to-contact-quality:d-ms-workplace-calling:telephony->d-cisco-contact-centre:quality-review',customerId:'starter-customer',projectId:'provider-project-1',postingId:'entry-1',completedAt:1,edgeId:'workplace-to-contact-quality',source:{deploymentId:'d-ms-workplace-calling',family:'microsoft:workplace-phone',feature:'telephony',resourceId:'phone',generation:1,productVersion:'v1'},target:{deploymentId:'d-cisco-contact-centre',family:'cisco:contact-center',feature:'quality-review',resourceId:'recorder',generation:1,productVersion:'v1'},testAt:1,test:{status:'scenario-verified'},delivery:{},support:{role:'msp'}};
 const submitted={pack:P5.PACK,version:P5.VERSION,count:5,target:5,integrations:[fake,{...fake,customerId:'other-customer',key:'other-customer-edge'}, {...fake,key:'alias-edge'}, {...fake,key:'unsupported-edge'}, {...fake,key:'duplicate-direction'}]};
 const result=P5.validateEvidence(state,submitted);
 assert.equal(result.valid,false);
 assert.match(result.missing.join(','),/retained-partner-integration-scope-invalid/);
 const repeated=P5.validateEvidence(state,{...submitted,count:2,integrations:[fake,{...fake}]});
 assert.deepEqual(repeated,{valid:false,missing:['duplicate-or-invalid-partner-edge']});
 assert.equal(P5.evaluate(state).count,0,'evaluation reads native Provider projects and never accepts submitted rows');
});

test('an empty or malformed save cannot turn a partial path list into a completed source goal',()=>{
 const state=SOC.create({experience:'campaign',scenario:'enterprise',difficulty:'easy',seed:773});
 const empty={pack:P5.PACK,version:P5.VERSION,count:0,target:5,integrations:[]};
 assert.deepEqual(P5.validateEvidence(state,empty),{valid:false,missing:['five-distinct-current-tested-partner-integrations-required'],historical:true,count:0});
 assert.equal(P5.validateEvidence(state,{...empty,target:6}).valid,false);
 assert.equal(P5.validateEvidence(state,{...empty,integrations:[null],count:1}).valid,false);
});

test('a real paid room delivery is excluded when the current support contract omits its tested binding',()=>{
 const state=roomDeliveryJourney(),project=operationProject(state,roomOperationId),roomEvidence=ROOM.projectEvidence(state,project.id,roomHooks().room);
 assert.equal(roomEvidence.ready,true,JSON.stringify(roomEvidence.missing));
 assert.equal(roomEvidence.evidence.meeting.acceptance.edgeId,ROOM.EDGE_ID);
 assert.ok(roomEvidence.evidence.meeting.endedAt>roomEvidence.evidence.meeting.startedAt);
 const result=P5.evaluate(state,roomHooks());
 assert.equal(result.target,5);
 assert.equal(result.count,0,'a delivered edge without a current scoped partner owner must not count');
 assert.ok(result.missing.includes('current-owner-scope-required:room-to-interop:room'));
 assert.equal(P5.validateEvidence(state,result.evidence,roomHooks()).valid,false);
 const owners=RESPONSIBILITY.responsibilities(state,roomCustomerId,{observeResource:roomHooks().observeResource});
 assert.ok(owners.records.some(x=>x.role==='msp'));
 assert.equal(owners.records.some(x=>['room'].every(id=>x.scope.includes(id))),false,'the live orchard-msp contract omits room; no integrator-room contract exists');
});

test('AC-SOC-816 a paid bridge owner and separately tested room edge rebase once and retain proof after retirement',()=>{
 let s=paidRoomPartnerJourney(),customerId='next-1-customer',hooks=roomHooks();
 const firstProject=operationProject(s,roomOperationId,customerId),first=P5.evaluate(s,hooks);
 const beforeProjection=JSON.stringify(s),visible=SOC.provider.inspect(s).progression.goals['progress.goal.p5'];assert.deepEqual(visible.progress,{count:1,target:5});assert.equal(visible.status,'incomplete');assert.equal(JSON.stringify(s),beforeProjection,'goal projection cannot change the delivered service');
 const vm=require('node:vm'),worker={input:structuredClone(s)};vm.createContext(worker);vm.runInContext(SOC.workerSource()+';globalThis.workerGoal=SOC.provider.inspect(input).progression.goals["progress.goal.p5"];',worker);assert.deepEqual(JSON.parse(JSON.stringify(worker.workerGoal)),visible,'serialized worker projects the same actual paid integration count');
 assert.equal(first.status,'incomplete');assert.equal(first.count,1,JSON.stringify({missing:first.missing,integrations:first.integrations,room:ROOM.projectEvidence(s,firstProject.id,roomHooks().room),support:SUPPORT.supportFor(s,customerId,['room'],{hooks}),responsibilities:RESPONSIBILITY.responsibilities(s,customerId,{observeResource:roomHooks().observeResource}),project:firstProject}));
 assert.deepEqual(first.evidence.integrations.map(x=>x.key),['room-to-interop:d-ms-meetings-room:room-devices->d-cisco-meetings-interoperability:interop-join']);
 assert.equal(first.evidence.integrations[0].projectId,firstProject.id);
 assert.equal(first.evidence.integrations[0].support.role,'integrator');assert.equal(first.evidence.integrations[0].support.projectId,operationProject(s,'integrator-room',customerId).id);
 assertRetainedSingleP5(s,first.evidence,hooks);
 const duplicated={...first.evidence,count:2,integrations:[...first.evidence.integrations,structuredClone(first.evidence.integrations[0])]};
 assert.deepEqual(P5.validateEvidence(s,duplicated,hooks),{valid:false,missing:['duplicate-or-invalid-partner-edge']},'repeating the actual paid edge cannot manufacture a second partner');
 const ownerProject=operationProject(s,'integrator-room',customerId),directRoomProject=operationProject(s,roomOperationId,customerId);
 assert.ok(ownerProject.expectedGenerations.room>operationProject(s,'cisco-meetings-interoperability',customerId).expectedGenerations.room,'paid bridge configuration advances the room generation after Cisco product setup');
 assert.equal(directRoomProject.expectedGenerations.room,ownerProject.expectedGenerations.room,'the separate paid edge operation is commissioned against the changed bridge generation');
 assert.equal(directRoomProject.operationReceipt.test.status,'scenario-verified','the edge test is accepted only after the paid bridge generation is effective');
 assert.equal(s.portfolio.customers.find(c=>c.id===customerId).root.information.meeting.effective.bridgeLicensed,true,'the paid bridge choice preserves the Cisco bridge license');
 assertRetainedSingleP5(s,first.evidence,hooks);

 const productProject=s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.productId==='cisco-meetings-interoperability');
 s=quoted(s,{action:'retire-project',projectId:productProject.id});
 s=until(s,x=>x.portfolio.customers.find(c=>c.id===customerId).root.products.deployments.find(d=>d.id==='d-cisco-meetings-interoperability')?.retirement?.status==='retired',60,customerId);
 assert.equal(P5.evaluate(s,hooks).count,0,'retiring the paid Cisco endpoint removes current edge readiness');
 assertRetainedSingleP5(s,first.evidence,hooks);

 // The public retirement/recommission route advances the endpoint generation.
 // Commission it through native hooks, then replace the paid room edge and test
 // that new generation explicitly before accepting another real meeting.
 s=startOperation(s,'cisco-meetings-interoperability',customerId);s=until(s,x=>operationProject(x,'cisco-meetings-interoperability',customerId)?.status==='complete',120,customerId);
 const newTarget=s.portfolio.customers.find(c=>c.id===customerId).root.products.deployments.find(d=>d.id==='d-cisco-meetings-interoperability');
 assert.ok(newTarget.generation>operationProject(s,'cisco-meetings-interoperability',customerId).retirement?.generation||newTarget.generation>1,'the paid endpoint is recommissioned on a new generation');
 assert.equal(P5.evaluate(s,hooks).count,0,'a fresh endpoint alone cannot reuse the retired-generation test');
 s=startOperation(s,'integrator-room',customerId);s=until(s,x=>operationProject(x,'integrator-room',customerId)?.status==='commissioning',120,customerId);
 assert.equal(s.portfolio.customers.find(c=>c.id===customerId).root.information.meeting.effective.bridgeLicensed,true,'the recommissioned paid bridge support leaves its licensed meeting profile enabled');
 s=startOperation(s,roomOperationId,customerId);s=until(s,x=>operationProject(x,roomOperationId,customerId)?.status==='commissioning',120,customerId);
 const currentProject=operationProject(s,roomOperationId,customerId);assert.equal(currentProject.operationReceipt.plan.edgeAction,'rebase');assert.equal(currentProject.operationReceipt.test,null);
 s=send(s,{action:'test-service-integration',projectId:currentProject.id,quoteRevision:s.revision});
 s=until(s,x=>operationProject(x,roomOperationId,customerId)?.status==='complete',120,customerId);
 s=until(s,x=>SUPPORT.supportFor(x,customerId,['room'],{hooks}).status==='ready',120,customerId);
 const current=P5.evaluate(s,hooks);assert.equal(current.count,1,'the paid new-generation rebase, explicit test, completed meeting, and current owner still represent one distinct edge');
 assert.equal(current.evidence.integrations[0].projectId,currentProject.id);assert.equal(current.evidence.integrations[0].target.generation,newTarget.generation);
 assertRetainedSingleP5(s,current.evidence,hooks);
 const latestProduct=s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.productId==='cisco-meetings-interoperability');
 s=quoted(s,{action:'retire-project',projectId:latestProduct.id});
 s=until(s,x=>x.portfolio.customers.find(c=>c.id===customerId).root.products.deployments.find(d=>d.id==='d-cisco-meetings-interoperability')?.retirement?.status==='retired',60,customerId);
 assert.equal(P5.evaluate(s,hooks).count,0,'retiring the recommissioned endpoint removes current edge readiness');
 assertRetainedSingleP5(s,current.evidence,hooks);
});

test('AC-SOC-817 bridge mode requires a paid Cisco interop product and restored configuration remains authoritative',()=>{
 let fresh=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:817});
 fresh=quoted(fresh,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});
 fresh=until(fresh,x=>x.providerCampaign.customers[0]?.stages.base.status==='effective');
 const customerId=fresh.providerCampaign.customers[0].id;
 const bridgeRequest={action:'operation',operationId:'integrator-room',customerId,config:{version:1,roomMode:'bridge'}};
 const quote=SOC.provider.quote(fresh,bridgeRequest);assert.ok(quote.blockers.includes('PAID_ROOM_BRIDGE_REQUIRED'),JSON.stringify(quote.blockers));
 assert.throws(()=>SOC.provider.quote(fresh,{...bridgeRequest,config:{version:1,roomMode:'native'}}),/INVALID_PROVIDER_INTEGRATOR_ROOM_SELECTION/);

 const paid=paidRoomPartnerJourney();assert.deepEqual(SOC.restore(JSON.stringify(paid)),paid,'the real paid bridge and test state restores unchanged');
 const malformed=structuredClone(paid),malformedProject=operationProject(malformed,roomOperationId,'next-1-customer');malformedProject.operationReceipt.evidence.meeting.acceptance.testAt++;
 assert.equal(ROOM.validateProjectEvidence(malformed,malformedProject).valid,false,'the native adapter rejects a mutated paid meeting receipt');
 assert.equal(P5.evaluate(malformed,roomHooks()).count,0,'an object-shaped invalid project result is never treated as a truthy accepted proof');
 const forged=structuredClone(paid),project=forged.providerCampaign.projects.findLast(p=>p.customerId==='next-1-customer'&&p.operationId==='integrator-room');
 project.config.version=2;
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_INTEGRATOR_ROOM_SELECTION/,'a save cannot upgrade bridge authority by editing its versioned configuration');
});

test('a real paid UC/CC delivery is excluded when its MSP scope omits the recorder binding',()=>{
 const state=ucDeliveryJourney(),project=operationProject(state,'uc-cc-integration'),inspection=SOC.provider.inspect(state).customers.find(x=>x.id===roomCustomerId).serviceIntegration;
 assert.equal(inspection.status,'ready');
 assert.equal(project.status,'complete');
 const result=P5.evaluate(state,ucHooks());assert.equal(result.count,0);assert.ok(result.missing.includes('current-owner-scope-required:workplace-to-contact-quality:recorder'));assert.equal(P5.validateEvidence(state,result.evidence,ucHooks()).valid,false);
 const owners=RESPONSIBILITY.responsibilities(state,roomCustomerId,{observeResource:ucHooks().observeResource});
 const owner=owners.records.find(x=>x.role==='msp'&&x.organisationId==='orchard-msp');assert.ok(owner);
 assert.ok(owner.scope.includes('phone'));assert.equal(owner.scope.includes('recorder'),false);
});

test('a paid Disco vendor UC/CC owner supplies the second distinct P5 edge without becoming the orchard MSP',()=>{
 let state=PARTNER_FIXTURE.regionalSupportReady();
 for(const sourceId of [RECEIPTS.FIRST_LIVE,RECEIPTS.SUSTAINABLE,RECEIPTS.LEVEL_TWO,RECEIPTS.NONSTARTER])state=PARTNER_FIXTURE.claimDispatched(state,sourceId);
 state=PARTNER_FIXTURE.ccUntilClock(state,500);
 state=PARTNER_FIXTURE.buy(state,{action:'purchase',offerId:'next-2',planId:'swift',stage:'base',market:'au-melbourne'});
 state=PARTNER_FIXTURE.ccUntil(state,x=>x.providerCampaign.customers.some(c=>c.id==='next-2-customer'&&c.stages.base?.status==='effective'),600,'next-2-customer');
 for(const stage of ['carrier','partner']){state=PARTNER_FIXTURE.buy(state,{action:'purchase',offerId:'next-2',planId:'swift',stage,customerId:'next-2-customer'});state=PARTNER_FIXTURE.ccUntil(state,x=>x.providerCampaign.customers.find(c=>c.id==='next-2-customer').stages[stage]?.status==='effective',600,'next-2-customer');}
 state=PARTNER_FIXTURE.ccOperation(state,'bpo','next-2-customer');
 state=PARTNER_FIXTURE.ccUntil(state,x=>PARTNER_FIXTURE.ccProject(x,'bpo','next-2-customer')?.status==='complete',600,'next-2-customer');
 state=PARTNER_FIXTURE.ccUntilClock(state,700);
 state=PARTNER_FIXTURE.ccInstallUcCcWithTargetSupport(state,'next-1-customer');
 state=PARTNER_FIXTURE.claimDispatched(state,RECEIPTS.IX);
 state=PARTNER_FIXTURE.ccDeliverRoom(state,'next-1-customer');
 state=PARTNER_FIXTURE.claimDispatched(state,RECEIPTS.LEVEL_THREE);

 const customerId='next-2-customer',hooks={...ucHooks(),customerRoot:PARTNER_FIXTURE.hooks.customerRoot,room:roomHooks().room};
 for(const id of ['recording',PARTNER_FIXTURE.UC_CC_SOURCE_OPERATION]){state=PARTNER_FIXTURE.ccOperationWhenReady(state,id,customerId);state=PARTNER_FIXTURE.ccUntil(state,x=>PARTNER_FIXTURE.ccProject(x,id,customerId)?.status==='complete',600,customerId);}
 if(state.business.workforce.support<2)state=send(state,{action:'staff',engineers:state.business.workforce.engineers,support:2});
 for(const id of [PARTNER_FIXTURE.UC_CC_TARGET_OPERATION,'service-boundary-review']){state=PARTNER_FIXTURE.ccOperationWhenReady(state,id,customerId);state=PARTNER_FIXTURE.ccUntil(state,x=>PARTNER_FIXTURE.ccProject(x,id,customerId)?.status==='complete',600,customerId);}
 const request={action:'operation',operationId:'managed-uc-cc-integration',customerId};
 const managedQuote=SOC.provider.quote(state,request);assert.deepEqual(managedQuote.blockers,[],JSON.stringify(managedQuote.blockers));
 const beforeCash=state.business.balance.cash;
 state=send(state,{...request,quoteRevision:managedQuote.atRevision});
 const project=operationProject(state,'managed-uc-cc-integration',customerId);
 assert.ok(project);assert.ok(state.business.balance.cash<beforeCash,'vendor support posts its own once-only paid operation');
 state=PARTNER_FIXTURE.ccUntil(state,x=>PARTNER_FIXTURE.ccProject(x,'managed-uc-cc-integration',customerId)?.status==='commissioning',600,customerId);
 state=PARTNER_FIXTURE.ccCompleteWithPaidReview(state,project.id,'managed-uc-cc-integration',customerId);

 const inspect=SUPPORT.supportFor(state,customerId,['phone','recorder'],{hooks});
 assert.equal(inspect.status,'ready',JSON.stringify(inspect.missing));
 const owner=inspect.owners.find(x=>x.adapter==='provider-uc-cc');
 assert.ok(owner,'a completed paid UC/CC operation creates the separately scoped vendor owner');
 assert.equal(owner.role,'vendor');assert.equal(owner.organisationId,'disco-vendor');
 assert.equal(owner.projectId,project.id);assert.equal(owner.postingId,project.postingId);
 assert.deepEqual(owner.scope,['archive','engage','phone','recorder']);
 assert.equal(SUPPORT.validateOwner(state,owner,{at:state.clock}),true);

 const evidence=P5.evaluate(state,hooks);
 assert.equal(evidence.count,1,'the paid vendor UC/CC edge is one of the five distinct routes');
 assert.equal(evidence.status,'incomplete');assert.equal(evidence.target,5);
 assert.deepEqual(evidence.evidence.integrations.map(x=>x.key),[
  'workplace-to-contact-quality:d-ms-workplace-calling:telephony->d-cisco-contact-centre:quality-review'
 ]);
 const row=evidence.evidence.integrations.find(x=>x.adapter==='provider-uc-cc');
 assert.ok(row);assert.equal(row.projectId,project.id);assert.equal(row.postingId,project.postingId);
 assert.notEqual(row.edgeId,ROOM.EDGE_ID,'the UC/CC route has a distinct identity from the existing room route');
 assert.equal(row.test.result.status,'scenario-verified');
 assert.equal(row.delivery.autonomousProvider,true);
 assert.equal(row.delivery.interaction.phase,'resolved');
 assert.equal(row.delivery.interaction.probe,false);
 assert.equal(row.delivery.recording.captureScope,'complete');
 assert.equal(row.support.role,'vendor');assert.equal(row.support.organisationId,'disco-vendor');
 assert.ok(row.support.scope.includes('recorder'));

 const owners=RESPONSIBILITY.responsibilities(state,customerId,{observeResource:hooks.observeResource});
 const msp=owners.records.find(x=>x.role==='msp'&&x.organisationId==='orchard-msp');
 assert.ok(msp);assert.equal(msp.scope.includes('recorder'),false,'the original provider-stage owner remains narrowly scoped');
 assert.notEqual(row.support.role,msp.role,'vendor support remains a distinct commercial responsibility');
 assert.equal(P5.validateEvidence(state,evidence.evidence,hooks).valid,false,'this one real managed edge still does not fulfill all five P5 paths');

 const forgedOwner={...owner,role:'msp',organisationId:'orchard-msp'};
 assert.equal(SUPPORT.validateOwner(state,forgedOwner,{at:state.clock,hooks}),false,'changing the vendor role cannot make its support an MSP contract');
 const forgedEvidence=structuredClone(evidence.evidence);
 forgedEvidence.integrations.find(x=>x.adapter==='provider-uc-cc').support=forgedOwner;
 assert.equal(P5.validateEvidence(state,forgedEvidence,hooks).valid,false,'retained P5 claims re-derive and reject forged support responsibility');

 const restored=SOC.restore(JSON.stringify(state));
 assert.deepEqual(SUPPORT.supportFor(restored,customerId,['phone','recorder'],{hooks}).owners.find(x=>x.adapter==='provider-uc-cc'),owner,'the paid vendor owner is reproducible after restore');
 assert.deepEqual(P5.evaluate(restored,hooks).evidence,evidence.evidence,'both eligible edges survive validated restore without changing their identities');
});
