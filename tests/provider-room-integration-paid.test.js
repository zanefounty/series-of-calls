'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const ROOM=require('../src/game/23-provider-room-integration');
const customerId='starter-customer',operationId='direct-room-integration';
const child=s=>s.portfolio.customers.find(row=>row.id===customerId).root;
const project=(s,id)=>s.providerCampaign.projects.findLast(row=>row.customerId===customerId&&row.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function quoted(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],`${command.operationId||command.action}: ${q.blockers.join(',')}`);return send(s,{...command,quoteRevision:q.atRevision});}
function staff(s,engineers=8,support=8){return send(s,{action:'staff',engineers,support});}
function acknowledge(s,incident){return send(s,{action:'acknowledge-incident',incidentId:incident.id});}
function rawTick(s){return SOC.dispatch(s,{type:'advance',minutes:1});}
function recover(s){
 for(let n=0;n<4;n++){
  const incident=s.providerCampaign.incidents.find(row=>row.customerId===customerId&&['active','acknowledged'].includes(row.status));
  if(!incident)return s;
  if(incident.status==='active')s=acknowledge(s,incident);
  const operation=incident.kind==='transport-domain'?'transport-repair':incident.resource==='service'?'service-repair':'repair',request={action:'operation',operationId:operation,customerId},q=SOC.provider.quote(s,request);
  if(q.blockers.length===1&&q.blockers[0]==='TRANSPORT_REPAIR_PENDING')return s;
  if(q.blockers.length&&q.blockers.every(code=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(code))){s=staff(s,8,8);continue;}
  assert.deepEqual(q.blockers,[],`repair ${incident.id}: ${q.blockers.join(',')}`);s=send(s,{...request,quoteRevision:q.atRevision});return s;
 }
 return s;
}
function tick(s,repair=true){return repair?recover(rawTick(s)):rawTick(s);}
function until(s,predicate,limit=180,repair=true){for(let n=0;n<limit&&!predicate(s);n++)s=tick(s,repair);assert.ok(predicate(s),`condition not reached at minute ${s.clock}`);return s;}
function operation(s,id,repair=true){
 for(let n=0;n<20;n++){
  const request={action:'operation',operationId:id,customerId},q=SOC.provider.quote(s,request);
  if(!q.blockers.length){s=send(s,{...request,quoteRevision:q.atRevision});break;}
  if(q.blockers.every(code=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(code))){s=staff(s,8,8);continue;}
  assert.fail(`${id} blocked: ${q.blockers.join(',')}`);
 }
 return until(s,current=>project(current,id)?.status==='complete',180,repair);
}
let activeCustomerFixture,beforeRoomFixture,commissioningFixture;
function activeCustomer(){
 if(activeCustomerFixture)return structuredClone(activeCustomerFixture);
 let s=SOC.create({experience:'campaign',scenario:'enterprise',difficulty:'easy',seed:383});s=staff(s);
 for(const stage of ['base','carrier','partner']){
  s=quoted(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
  s=until(s,current=>current.providerCampaign.customers[0].stages[stage].status==='effective');
 }
 activeCustomerFixture=structuredClone(s);return s;
}
function beforeRoomProject(){
 if(beforeRoomFixture)return structuredClone(beforeRoomFixture);
 let s=activeCustomer();
 for(const id of ['recording','ms-meetings-room','cisco-meetings-interoperability'])s=operation(s,id);
 const beforeTransport=SOC.provider.quote(s,{action:'operation',operationId,customerId});
 assert.ok(beforeTransport.blockers.includes('current-room-transport-path-required'),'paid room integration requires a real identity-to-room transport path');
 s=operation(s,'primary-upstream');beforeRoomFixture=structuredClone(s);return s;
}
function commissioning(withoutRepair=false){
 if(!withoutRepair&&commissioningFixture)return structuredClone(commissioningFixture);
 let s=beforeRoomProject();
 const root=child(s),path=SOC.transport.resourcePath(root,'identity','room','meeting');
 assert.equal(path.ready,true);assert.equal(path.kbps,5000);assert.ok(path.edges.length>0);
 const quote=SOC.provider.quote(s,{action:'operation',operationId,customerId});assert.deepEqual(quote.blockers,[]);
 assert.deepEqual(quote.commercial.roomIntegration.plan.sourceIds,['uc-new:family:microsoft:meetings-rooms','uc-new:family:cisco:meetings-devices']);
 s=send(s,{action:'operation',operationId,customerId,quoteRevision:quote.atRevision});
 s=until(s,current=>project(current,operationId)?.status==='commissioning',180,!withoutRepair);
 const paid=project(s,operationId);assert.equal(paid.setupCents,50000);assert.equal(paid.periodCents,12000);assert.equal(paid.workMinutes,8);assert.deepEqual(paid.roomIntegrationPlan,quote.commercial.roomIntegration.plan);
 if(!withoutRepair)commissioningFixture=structuredClone(s);return s;
}
function operationQuoteStart(s,id){const request={action:'operation',operationId:id,customerId},q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],`${id}: ${q.blockers.join(',')}`);return send(s,{...request,quoteRevision:q.atRevision});}
function commissioningDuringIncident(){
 let s=activeCustomer();
 for(const id of ['recording','ms-meetings-room','primary-upstream'])s=operationQuoteStart(s,id);
 s=until(s,current=>['recording','ms-meetings-room','primary-upstream'].every(id=>project(current,id)?.status==='complete'),60,false);
 s=operationQuoteStart(s,'cisco-meetings-interoperability');
 s=until(s,current=>project(current,'cisco-meetings-interoperability')?.status==='complete',30,false);
 const quote=SOC.provider.quote(s,{action:'operation',operationId,customerId});assert.deepEqual(quote.blockers,[]);
 s=send(s,{action:'operation',operationId,customerId,quoteRevision:quote.atRevision});
 s=until(s,current=>project(current,operationId)?.status==='commissioning',12,false);
 s=until(s,current=>current.providerCampaign.incidents.some(row=>row.customerId===customerId&&row.resource==='room'&&['active','acknowledged'].includes(row.status)),16,false);
 const incident=s.providerCampaign.incidents.find(row=>row.customerId===customerId&&row.resource==='room'&&['active','acknowledged'].includes(row.status));assert.ok(incident);
 return {state:s,incidentId:incident.id};
}
function explicitTest(s){const p=project(s,operationId);return send(s,{action:'test-service-integration',projectId:p.id,quoteRevision:s.revision});}
function scheduledMeeting(s,period){return s.providerCampaign.meetings.find(row=>row.customerId===customerId&&row.periodIndex===period);}
function completedMeetingForProject(s){const p=project(s,operationId),id=p?.operationReceipt?.evidence?.meeting?.sessionId;return id&&child(s).information.meetingSessions.find(row=>row.id===id);}

test('AC-SOC-756 a funded room edge records its exact native test and completes only after a later real bridge meeting',()=>{
 let opening=SOC.create({experience:'campaign',scenario:'enterprise',difficulty:'easy',seed:73});opening=quoted(opening,{action:'purchase',offerId:'starter',planId:'steady',stage:'base'});assert.equal(child(opening).products,undefined);
 const openingBytes=JSON.stringify(opening),unavailable=SOC.provider.quote(opening,{action:'operation',operationId,customerId});assert.ok(unavailable.blockers.includes('deployment-missing:d-ms-meetings-room'));assert.ok(unavailable.blockers.includes('deployment-missing:d-cisco-meetings-interoperability'));assert.equal(JSON.stringify(opening),openingBytes);assert.doesNotThrow(()=>SOC.provider.inspect(opening));
 const pending=commissioning(),restored=SOC.restore(JSON.stringify(pending));assert.deepEqual(restored,pending);
 const command={type:'provider',command:{action:'test-service-integration',projectId:project(pending,operationId).id,quoteRevision:pending.revision}};let reply;const worker={postMessage:value=>{reply=value;}};vm.createContext(worker);vm.runInContext(SOC.workerSource(),worker);worker.onmessage({data:{id:'paid-room-test',state:restored,command}});assert.equal(reply.error,undefined);
 let s=explicitTest(pending),paid=project(s,operationId);assert.deepEqual(JSON.parse(JSON.stringify(reply.state)),s);assert.equal(paid.operationReceipt.test.status,'scenario-verified');assert.equal(paid.operationReceipt.test.checkedAt,paid.operationReceipt.submittedAt);assert.equal(paid.status,'commissioning');
 s=until(s,current=>project(current,operationId)?.status==='complete',110,true);paid=project(s,operationId);const meeting=completedMeetingForProject(s);
 assert.ok(meeting);assert.equal(meeting.status,'completed');assert.equal(meeting.joinMethod,'bridge');assert.ok(meeting.endedAt>meeting.startedAt);assert.ok(meeting.startedAt>paid.operationReceipt.test.checkedAt);assert.ok(meeting.startedAt>paid.operationReceipt.submittedAt);
 assert.equal(paid.operationReceipt.evidence.meeting.sessionId,meeting.id);assert.equal(paid.operationReceipt.evidence.meeting.acceptance.edgeId,'room-to-interop');assert.deepEqual(paid.operationReceipt.evidence.meeting.acceptance.path.edges,['starter-customer-a-primary']);
 assert.equal(SOC.provider.inspect(s).customers.find(row=>row.id===customerId).roomIntegration.projects.find(row=>row.projectId===paid.id).ready,true);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('AC-SOC-757 a room-capacity outage blocks delivery until repair, retest and a real bridge meeting',()=>{
 const fixture=commissioningDuringIncident();let s=fixture.state,paid=project(s,operationId),incident=s.providerCampaign.incidents.find(row=>row.id===fixture.incidentId);assert.ok(incident);
 if(incident.status==='scheduled')s=until(s,current=>current.providerCampaign.incidents.find(row=>row.id===incident.id)?.status==='active',8,false);incident=s.providerCampaign.incidents.find(row=>row.id===fixture.incidentId);
 incident=s.providerCampaign.incidents.find(row=>row.id===fixture.incidentId);assert.ok(['active','acknowledged'].includes(incident.status));
 s=explicitTest(s);paid=project(s,operationId);assert.equal(paid.operationReceipt.test.status,'scenario-verified','the native edge test is recorded truthfully while the separate room resource is down');
 const current=SOC.provider.inspect(s).customers.find(row=>row.id===customerId).roomIntegration.projects.find(row=>row.projectId===paid.id);assert.equal(current.ready,false);assert.ok(current.missing.includes('completed-duration-bearing-bridge-meeting-after-test-required'));
 s=until(s,currentState=>{const row=scheduledMeeting(currentState,1);return row&&child(currentState).information.meetingSessions.some(session=>session.id===row.sessionId&&session.status==='failed');},40,false);
 const failed=scheduledMeeting(s,1),session=child(s).information.meetingSessions.find(row=>row.id===failed.sessionId);assert.ok(session.reasons.includes('MEETING_CAPACITY'));assert.equal(project(s,operationId).status,'commissioning');assert.equal(project(s,operationId).operationReceipt.evidence,null);
 if(incident.status==='active')s=acknowledge(s,incident);
 const repair={action:'operation',operationId:'repair',customerId};s=quoted(s,repair);s=until(s,current=>project(current,'repair')?.status==='complete',30,false);
 s=explicitTest(s);paid=project(s,operationId);assert.equal(paid.operationReceipt.test.status,'scenario-verified');s=until(s,current=>project(current,operationId)?.status==='complete',85,true);paid=project(s,operationId);const meeting=completedMeetingForProject(s);assert.ok(meeting);assert.ok(meeting.startedAt>paid.operationReceipt.test.checkedAt);assert.ok(meeting.endedAt>meeting.startedAt);assert.equal(paid.operationReceipt.evidence.meeting.sessionId,meeting.id);assert.equal(project(s,'transport-repair')?.status,'complete','the later authored path fault is repaired through its paid transport operation');
});

test('AC-SOC-758 completed receipt survives endpoint retirement and rejects altered test or meeting-path authority',()=>{
 let s=explicitTest(commissioning());s=until(s,current=>project(current,operationId)?.status==='complete',110,true);const paid=project(s,operationId),receipt=structuredClone(paid.operationReceipt);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const sourceProject=project(s,'ms-meetings-room');s=quoted(s,{action:'retire-project',projectId:sourceProject.id});s=until(s,current=>child(current).products.deployments.find(row=>row.id==='d-ms-meetings-room')?.retirement?.status==='retired',8,true);
 assert.deepEqual(project(s,operationId).operationReceipt,receipt);assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'retirement retains the paid delivery receipt and native endpoint history');
 const meeting=completedMeetingForProject(s),auditId=meeting.productIntegrationAuditId,unpruned=structuredClone(s);child(unpruned).information.audit=child(unpruned).information.audit.filter(row=>row.auditId!==auditId);assert.throws(()=>SOC.restore(JSON.stringify(unpruned)),/INVALID_MEETING_SESSION/,'a missing start audit above the pruning checkpoint is not accepted');assert.equal(ROOM.validateProjectEvidence(unpruned,project(unpruned,operationId)).valid,false);
 const provenPruned=structuredClone(s),provenRoot=child(provenPruned);provenRoot.information.audit=provenRoot.information.audit.filter(row=>row.auditId!==auditId);provenRoot.information.auditPrunedThrough=Math.max(provenRoot.information.auditPrunedThrough||0,auditId);assert.equal(ROOM.validateProjectEvidence(provenPruned,project(provenPruned,operationId)).valid,true,'the helper accepts only a native-proven FIFO pruning checkpoint with the retained session, booking, test and path');
 for(const invalidId of [0,-1,provenRoot.information.nextAuditId]){const invalid=structuredClone(provenPruned),root=child(invalid);completedMeetingForProject(invalid).productIntegrationAuditId=invalidId;root.information.auditPrunedThrough=Math.max(root.information.auditPrunedThrough,invalidId);assert.equal(ROOM.validateProjectEvidence(invalid,project(invalid,operationId)).valid,false,`pruning cannot authorize audit ID ${invalidId} outside the issued range`);assert.throws(()=>SOC.restore(JSON.stringify(invalid)),/INVALID_MEETING_SESSION|INVALID_INFORMATION/);}
 let lab=SOC.dispatch(s,{type:'copy-to-lab',customerId});const record=lab.records.find(row=>row.kind==='recording'&&row.access.includes('supervisor'));assert.ok(record,'the actual recorded meeting is available in the isolated Lab copy');for(let n=0;n<520;n++)lab=SOC.dispatch(lab,{type:'information',command:{action:'read',record:record.id,role:'supervisor',region:record.region||lab.jurisdiction}});assert.ok(lab.information.auditPrunedThrough>=auditId);assert.deepEqual(SOC.restore(JSON.stringify(lab)),lab,'native bounded audit pressure accepts the genuine session after FIFO eviction');
 const forgedTest=structuredClone(s),testProject=project(forgedTest,operationId);testProject.operationReceipt.test.checkedAt++;
 assert.throws(()=>SOC.restore(JSON.stringify(forgedTest)),/INVALID_PROVIDER_ROOM_INTEGRATION_PROJECT/);
 const forgedPath=structuredClone(s),session=completedMeetingForProject(forgedPath);session.productIntegration.path.edges=['forged-route'];
 assert.throws(()=>SOC.restore(JSON.stringify(forgedPath)),/INVALID_MEETING_SESSION|INVALID_PROVIDER_ROOM_INTEGRATION_PROJECT/);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('AC-SOC-774 paid room delivery retains its authored job or mission origin and refuses missing or foreign lineage',()=>{
 const pending=commissioning();let s=explicitTest(pending);
 s=until(s,current=>project(current,operationId)?.status==='complete',110,true);
 const meeting=project(s,operationId).operationReceipt.evidence.meeting,origin=meeting.origin;
 assert.equal(origin.kind,'provider-job');
 const job=s.providerCampaign.jobs.find(row=>row.id===origin.id),arrival=s.providerCampaign.events.find(row=>row.id===origin.eventId),booking=child(s).information.bookings.find(row=>row.id===meeting.bookingId);
 assert.equal(job.sessionId,meeting.sessionId);assert.equal(job.caseId,booking.caseId);assert.equal(job.completedAt,meeting.endedAt);assert.equal(arrival.jobId,job.id);
 assert.equal(s.providerCampaign.meetings.some(row=>row.sessionId===meeting.sessionId),false,'this receipt is an authored demand job, not a mission row');
 for(const mutate of [
  state=>{state.providerCampaign.jobs=state.providerCampaign.jobs.filter(row=>row.id!==origin.id);},
  state=>{state.providerCampaign.events=state.providerCampaign.events.filter(row=>row.id!==origin.eventId);},
  state=>{project(state,operationId).operationReceipt.evidence.meeting.origin.id=state.providerCampaign.jobs.find(row=>row.id!==origin.id).id;},
  state=>{state.providerCampaign.events.find(row=>row.id===origin.eventId).customerId='foreign-customer';},
  state=>{project(state,operationId).operationReceipt.evidence.meeting.origin.extra=true;}
 ]){const forged=structuredClone(s);mutate(forged);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_ROOM_INTEGRATION_PROJECT/);}
 const receipt=structuredClone(project(s,operationId).operationReceipt);
 const eventNumber=id=>Number(/^provider-event-(\d+)$/.exec(id||'')?.[1]||0),originNumber=eventNumber(origin.eventId);
 for(let n=0;n<240&&eventNumber(s.providerCampaign.eventCheckpoint.lastId)<=originNumber;n++)s=staff(s);
 assert.ok(s.providerCampaign.eventCheckpoint.count>0,'actual public staffing commands evict ordinary events');
 assert.ok(eventNumber(s.providerCampaign.eventCheckpoint.lastId)>originNumber,'event eviction has passed the pinned arrival, not merely the first event');
 assert.ok(s.providerCampaign.events.some(row=>row.id===origin.eventId));
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=until(s,state=>state.clock>=180,180-s.clock,true);
 assert.ok(s.providerCampaign.jobCheckpoint.pruned>0,'ordinary settled jobs have actually pruned');
 assert.ok(s.providerCampaign.jobs.some(row=>row.id===origin.id&&row.settled));
 assert.ok(s.providerCampaign.events.some(row=>row.id===origin.eventId));
 assert.deepEqual(project(s,operationId).operationReceipt,receipt);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const context={};vm.createContext(context);vm.runInContext(SOC.workerSource()+';globalThis.engine=SOC;',context);
 const command={type:'advance',minutes:1};assert.deepEqual(JSON.parse(JSON.stringify(context.engine.dispatch(s,command))),SOC.dispatch(s,command));

 // Hold the explicit native test until just before an authored mission meeting.
 let mission=until(structuredClone(pending),state=>state.clock===139,139-pending.clock,true);
 mission=explicitTest(mission);mission=until(mission,state=>project(state,operationId)?.status==='complete',45,true);
 const missionMeeting=project(mission,operationId).operationReceipt.evidence.meeting,missionOrigin=missionMeeting.origin;
 assert.equal(missionOrigin.kind,'mission-meeting');assert.equal(missionOrigin.periodIndex,2);
 const row=mission.providerCampaign.meetings.find(row=>row.customerId===customerId&&row.sessionId===missionMeeting.sessionId);
 assert.equal(row.bookingId,missionMeeting.bookingId);assert.equal(row.attemptedAt,140);
 assert.ok(mission.providerCampaign.events.some(event=>event.id===missionOrigin.eventId&&event.code==='MISSION_MEETING_BOOKED'));
 assert.deepEqual(SOC.restore(JSON.stringify(mission)),mission);
 for(const mutate of [
  state=>{state.providerCampaign.meetings=state.providerCampaign.meetings.filter(row=>row.sessionId!==missionMeeting.sessionId);},
  state=>{state.providerCampaign.events=state.providerCampaign.events.filter(row=>row.id!==missionOrigin.eventId);},
  state=>{project(state,operationId).operationReceipt.evidence.meeting.origin.periodIndex=1;}
 ]){const forged=structuredClone(mission);mutate(forged);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_ROOM_INTEGRATION_PROJECT/);}
});
