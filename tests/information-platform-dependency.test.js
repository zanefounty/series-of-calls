const test=require('node:test'),assert=require('node:assert/strict');
const information=require('../src/game/52-information');
const SOC=require('../src/game/55-communications'),vm=require('node:vm');

function state(){
 const s={clock:0,scenario:'government',jurisdiction:'AU',connected:true,records:[],interactions:[],resources:{
  phone:{kind:'uc',generation:3,effective:{mediaIn:true,mediaOut:true}},
  room:{effective:{calendar:true,mode:'native',enabled:true}},
  speech:{effective:{capacity:4,region:'AU'}},
  archive:{effective:{capacity:100,region:'AU',retentionDays:30}},
  recorder:{effective:{consent:true,identityMapping:true,region:'AU',archive:'archive'}}
 }};
 s.information=information.create(s);s.information.boundary.effective=structuredClone(s.information.boundary.desired);
 return s;
}
function snapshot(generation=3,overrides={}){
 return {reasons:[],roomSlots:1,participantCapacity:8,media:{in:true,out:true},platformDependency:{version:1,resourceId:'phone',generation,ready:true,reasons:[],media:{in:true,out:true}},...overrides};
}
function hooks(current){
 const released=[];return {released,services:{recorder:{ready:true},archive:{ready:true},speech:{ready:true},meetingSnapshot:(_s,_booking,declared)=>{
  if(declared)assert.deepEqual(declared,{version:1,resourceId:'phone'});return typeof current==='function'?current():current;
 },reserveMeeting:(_s,request)=>({accepted:request.recording===true}),releaseMeeting:(_s,id)=>released.push(id)}};
}
function prepare(){
 const s=state();information.command(s,{action:'configure',kind:'meeting',config:{recording:true,platformDependency:{version:1,resourceId:'phone'}}},{authorize:()=>true});
 s.clock=1;information.advance(s,{},()=>{},()=>{});
 s.information.meeting.effective.recording=true;
 return s;
}
function book(s){
 information.command(s,{action:'book',start:s.clock+1,end:s.clock+6,attendees:3,event:false,language:'en'},{});
 return s.information.bookings[0];
}

test('legacy meeting config and old session shapes remain valid without inferred platform dependencies',()=>{
 const s=state();assert.doesNotThrow(()=>information.config('meeting',information.schemas.meeting));
 const node=s.information.meeting;node.effective=structuredClone(node.desired);node.provisioning={status:'ready',due:1,generation:1};
 s.resources.room.effective.calendar=true;s.resources.room.effective.enabled=true;
 const b=book(s);const h=hooks({reasons:[],roomSlots:1,participantCapacity:8,media:{in:true,out:true}});
 const session=information.command(s,{action:'schedule',booking:b.id},h.services,{reasons:[]});
 assert.equal(session.status,'scheduled');assert.equal('platformDependency' in session,false);
 for(const kind of Object.keys(information.schemas)){assert.doesNotThrow(()=>information.config(kind,s.information[kind].desired),kind+' desired');if(s.information[kind].effective)assert.doesNotThrow(()=>information.config(kind,s.information[kind].effective),kind+' effective');}
 assert.doesNotThrow(()=>information.validate(s));
});

test('meeting dependency config accepts only the versioned reference shape',()=>{
 const valid={...information.schemas.meeting,platformDependency:{version:1,resourceId:'phone'}};
 assert.doesNotThrow(()=>information.config('meeting',valid));
 for(const dependency of [{version:2,resourceId:'phone'},{version:1},{version:1,resourceId:'Room'},{version:1,resourceId:'phone',extra:true}])
  assert.throws(()=>information.config('meeting',{...information.schemas.meeting,platformDependency:dependency}),/INVALID_MEETING_PLATFORM_DEPENDENCY/);
 const s=state(),generation=s.information.meeting.generation;
 assert.throws(()=>information.command(s,{action:'configure',kind:'meeting',config:{platformDependency:{version:1,resourceId:'missing'}}},{}),/MEETING_PLATFORM_RESOURCE_UNKNOWN/);
 assert.throws(()=>information.command(s,{action:'configure',kind:'meeting',config:{platformDependency:{version:1,resourceId:'room'}}},{}),/MEETING_PLATFORM_RESOURCE_KIND/);
 assert.equal(s.information.meeting.generation,generation,'refusals leave desired state unchanged');
});

test('a declared meeting platform records selected generation and fails active work on dependency loss with reservation release',()=>{
 const s=prepare(),b=book(s),h=hooks(snapshot());
 const scheduled=information.command(s,{action:'schedule',booking:b.id},h.services,{reasons:[]});
 assert.equal(scheduled.platformDependency.resourceId,'phone');assert.equal(scheduled.platformDependency.generation,3);assert.equal(scheduled.platformDependency.profileGeneration,s.information.meeting.generation);
 s.clock=2;information.advance(s,h.services,()=>{},()=>{});
 assert.equal(s.information.meetingSessions[0].status,'active');
 h.services.meetingSnapshot=()=>snapshot(3,{platformDependency:{version:1,resourceId:'phone',generation:3,ready:false,reasons:['PHONE_OFFLINE'],media:{in:false,out:false}}});
 s.clock=3;information.advance(s,h.services,()=>{},()=>{});
 const ended=s.information.meetingSessions[0];assert.equal(ended.status,'failed');assert.ok(ended.reasons.includes('PHONE_OFFLINE'));assert.deepEqual(h.released,[ended.id]);
 assert.equal(ended.reservationHeld,false);assert.equal(ended.reservationReleased,true);assert.doesNotThrow(()=>information.validate(s));
});

test('scheduled work fails closed when dependency identity or generation changes before start',()=>{
 for(const current of [snapshot(4),snapshot(3,{platformDependency:{version:1,resourceId:'room',generation:3,ready:true,reasons:[],media:{in:true,out:true}}})]){
  const s=prepare(),b=book(s),h=hooks(snapshot());
  information.command(s,{action:'schedule',booking:b.id},h.services,{reasons:[]});
  h.services.meetingSnapshot=()=>current;s.clock=2;information.advance(s,h.services,()=>{},()=>{});
  const session=s.information.meetingSessions[0];assert.equal(session.status,'failed');assert.ok(session.reasons.some(x=>x.includes('DEPENDENCY')));assert.deepEqual(h.released,[session.id]);assert.doesNotThrow(()=>information.validate(s));
 }
});

test('restoration rejects malformed or wrong-resource dependency proof',()=>{
 const s=prepare(),b=book(s),h=hooks(snapshot());information.command(s,{action:'schedule',booking:b.id},h.services,{reasons:[]});
 assert.doesNotThrow(()=>information.validate(s));
 const wrong=structuredClone(s);wrong.information.meetingSessions[0].platformDependency.resourceId='room';
 assert.throws(()=>information.validate(wrong),/INVALID_MEETING_SESSION_DEPENDENCY|INVALID_MEETING_SESSION/);
 const unknown=structuredClone(s);unknown.information.meetingSessions[0].platformDependency.version=9;
 assert.throws(()=>information.validate(unknown),/INVALID_MEETING_SESSION/);
 const missing=structuredClone(s);delete missing.information.meetingSessions[0].platformDependency.generation;
 assert.throws(()=>information.validate(missing),/INVALID_MEETING_SESSION/);
});

test('missing or malformed hook evidence fails closed and leaves a valid diagnostic save',()=>{
 const s=prepare(),b=book(s),h=hooks({reasons:[],roomSlots:1,participantCapacity:8,media:{in:true,out:true},platformDependency:{version:1,resourceId:'room',generation:2,ready:true,reasons:[],media:{in:true,out:true}}});
 const session=information.command(s,{action:'schedule',booking:b.id},h.services,{reasons:[]});
 assert.equal(session.status,'failed');assert.ok(session.reasons.includes('MEETING_PLATFORM_DEPENDENCY_EVIDENCE_INVALID'));
 assert.equal(session.platformDependency.resourceId,'phone');assert.equal(session.platformDependency.generation,null);
 assert.deepEqual(h.released,[],'capture was never reserved for invalid dependency evidence');
 assert.doesNotThrow(()=>information.validate(s));
});

test('SOC dispatch binds actual meetings to the selected platform, scopes loss, releases capture and recovers',()=>{
 const infoCommand=(s,command)=>SOC.dispatch(s,{type:'information',command}),tick=(s,minutes=1)=>SOC.dispatch(s,{type:'advance',minutes});
 let s=SOC.create({scenario:'enterprise'});for(const command of SOC.reference(s).filter(x=>x.type==='configure'))s=SOC.dispatch(s,command);
 s=infoCommand(s,{action:'start'});s=tick(s);s=SOC.dispatch(s,{type:'add',id:'meeting-backup',kind:'dedicated'});s=tick(s);
 s=infoCommand(s,{action:'configure',kind:'meeting',config:{recording:true,platformDependency:{version:1,resourceId:'meeting-backup'}}});assert.equal(s.information.meetingDependencyEpoch,undefined,'a pending first dependency has no effective epoch yet');assert.doesNotThrow(()=>SOC.restore(JSON.stringify(s)));s=tick(s);
 const book=(state,start,end)=>{const next=infoCommand(state,{action:'book',start,end,attendees:4,event:false,language:'en'});return {state:next,booking:next.information.bookings.at(-1)};};
 let booked=book(s,s.clock+1,s.clock+5),booking=booked.booking;s=infoCommand(booked.state,{action:'schedule',booking:booking.id});
 let session=s.information.meetingSessions.at(-1);assert.equal(session.status,'scheduled');assert.equal(session.platformDependency.resourceId,'meeting-backup');assert.equal(session.platformDependency.generation,s.resources['meeting-backup'].generation);assert.ok(s.captureReservations.some(x=>x.id===session.id&&x.kind==='meeting'));
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'scheduled dependency evidence and reservation survive restore');
 const fallback=tick(s);let workerResult;const context={postMessage:result=>workerResult=result};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:1,state:s,command:{type:'advance',minutes:1}}});assert.deepEqual(JSON.parse(JSON.stringify(workerResult.state)),fallback,'worker and fallback start the dependency-scoped session identically');s=fallback;session=s.information.meetingSessions.at(-1);assert.equal(session.status,'active');
 s=SOC.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});s=tick(s);session=s.information.meetingSessions.at(-1);assert.equal(session.status,'active','an unrelated phone outage does not affect the selected platform');
 s=SOC.dispatch(s,{type:'fault',id:'meeting-backup',fault:'OUTAGE'});s=tick(s);session=s.information.meetingSessions.at(-1);assert.equal(session.status,'failed');assert.ok(session.reasons.some(x=>x.includes('DEPENDENCY')));assert.equal(s.captureReservations.some(x=>x.id===session.id),false,'selected-platform failure releases the recording reservation');assert.equal(session.reservationReleased,true);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);

 s=SOC.dispatch(s,{type:'fault',id:'meeting-backup',fault:null});s=tick(s,Math.max(1,booking.end-s.clock));
 booked=book(s,s.clock,s.clock+3);booking=booked.booking;s=infoCommand(booked.state,{action:'schedule',booking:booking.id});session=s.information.meetingSessions.at(-1);assert.equal(session.status,'active','a fresh booking recovers after the selected platform returns');
 const priorGeneration=s.resources['meeting-backup'].generation;s=SOC.dispatch(s,{type:'configure',id:'meeting-backup',config:{...s.resources['meeting-backup'].desired}});assert.equal(s.resources['meeting-backup'].generation,priorGeneration+1);s=tick(s);
 session=s.information.meetingSessions.at(-1);assert.equal(session.status,'failed','a platform generation change invalidates the active session proof');assert.ok(session.reasons.includes('MEETING_PLATFORM_DEPENDENCY_CHANGED'));assert.equal(s.captureReservations.some(x=>x.id===session.id),false);
 s=tick(s,Math.max(1,booking.end-s.clock));
 booked=book(s,s.clock,s.clock+3);booking=booked.booking;s=infoCommand(booked.state,{action:'schedule',booking:booking.id});session=s.information.meetingSessions.at(-1);assert.equal(session.status,'active','a new session can use the provisioned generation');assert.equal(session.platformDependency.generation,s.resources['meeting-backup'].generation);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);const expected=tick(s);workerResult=null;context.onmessage({data:{id:2,state:s,command:{type:'advance',minutes:1}}});assert.deepEqual(JSON.parse(JSON.stringify(workerResult.state)),expected,'restored-generation session remains deterministic in the worker');
});

test('dependency epoch preserves legacy sessions and rejects stripped post-epoch proof or epoch',()=>{
 const infoCommand=(s,command)=>SOC.dispatch(s,{type:'information',command}),tick=(s,minutes=1)=>SOC.dispatch(s,{type:'advance',minutes});
 let s=SOC.create({scenario:'enterprise'});for(const command of SOC.reference(s).filter(x=>x.type==='configure'))s=SOC.dispatch(s,command);
 s=infoCommand(s,{action:'start'});s=tick(s);s=SOC.dispatch(s,{type:'add',id:'meeting-backup',kind:'dedicated'});s=tick(s);
 let next=infoCommand(s,{action:'book',start:s.clock,end:s.clock+1,attendees:3,event:false,language:'en'});s=infoCommand(next,{action:'schedule',booking:next.information.bookings.at(-1).id});s=tick(s);
 const legacySession=s.information.meetingSessions[0];assert.equal(legacySession.id,'meeting-session-1');assert.equal('platformDependency' in legacySession,false);
 s=infoCommand(s,{action:'configure',kind:'meeting',config:{recording:true,platformDependency:{version:1,resourceId:'meeting-backup'}}});s=tick(s);
 assert.deepEqual(s.information.meetingDependencyEpoch,{version:1,firstSessionNumber:2,profileGeneration:s.information.meeting.generation,at:s.clock});
 next=infoCommand(s,{action:'book',start:s.clock,end:s.clock+3,attendees:3,event:false,language:'en'});s=infoCommand(next,{action:'schedule',booking:next.information.bookings.at(-1).id});
 assert.equal(s.information.meetingSessions[1].platformDependency.resourceId,'meeting-backup');assert.doesNotThrow(()=>SOC.restore(JSON.stringify(s)),'old legacy session and new proof-bearing session coexist');
 const proofRemoved=structuredClone(s);delete proofRemoved.information.meetingSessions[1].platformDependency;assert.throws(()=>SOC.restore(JSON.stringify(proofRemoved)),/INVALID_MEETING_SESSION_DEPENDENCY_EPOCH/);
 const epochRemoved=structuredClone(s);delete epochRemoved.information.meetingDependencyEpoch;assert.throws(()=>SOC.restore(JSON.stringify(epochRemoved)),/MISSING_MEETING_DEPENDENCY_EPOCH/);
 const unknown=structuredClone(s);unknown.information.meetingDependencyEpoch.version=2;assert.throws(()=>SOC.restore(JSON.stringify(unknown)),/INVALID_MEETING_DEPENDENCY_EPOCH/);
 const oldStillLegacy=structuredClone(s);assert.equal('platformDependency' in oldStillLegacy.information.meetingSessions[0],false);assert.doesNotThrow(()=>SOC.restore(JSON.stringify(oldStillLegacy)));
});
