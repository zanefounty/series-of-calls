'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const information=require('../src/game/52-information');

function ready(){
 const s={clock:1,scenario:'enterprise',jurisdiction:'AU',tenant:'tenant-host',connected:true,records:[],interactions:[],resources:{
  phone:{id:'phone',kind:'uc',generation:3,effective:{enabled:true,mediaIn:true,mediaOut:true}},
  room:{id:'room',kind:'room',generation:1,effective:{enabled:true,calendar:true,mode:'native'}},
  speech:{id:'speech',kind:'processor',generation:1,effective:{capacity:4,region:'AU'}},
  archive:{id:'archive',kind:'archive',generation:1,effective:{capacity:100,region:'AU',retentionDays:30,access:['supervisor']}},
  recorder:{id:'recorder',kind:'recorder',generation:1,effective:{consent:true,identityMapping:true,region:'AU',archive:'archive'}}
 }};
 s.information=information.create(s);for(const kind of Object.keys(information.schemas)){s.information[kind].effective=structuredClone(s.information[kind].desired);s.information[kind].provisioning={status:'ready',due:1,generation:1};}const meeting={...structuredClone(information.schemas.meeting),recording:true,platformDependency:{version:1,resourceId:'phone'}};
 s.information.meeting.desired=structuredClone(meeting);s.information.meeting.effective=structuredClone(meeting);s.information.meeting.generation=2;s.information.meeting.provisioning={status:'ready',due:1,generation:2};
 information.advance(s,{},()=>{},()=>{});
 return s;
}
const descriptor=(s,overrides={})=>({version:1,guestId:'partner-jules',guestTenant:'tenant-partner',hostTenant:s.tenant,...overrides});
function guestHooks({admitted=true,present=true,media={in:true,out:true},released=[],guestTenant='tenant-partner'}={}){
 const response=(s,booking)=>admitted?{admitted:true,admissionId:'guest-admission-'+booking.id,guestId:booking.externalGuest.guestId,guestTenant,hostTenant:s.tenant}:{admitted:false,reasons:['MEETING_EXTERNAL_GUEST_NOT_PRESENT']};
 const services={
  authorize:(_s,resourceId)=>resourceId==='phone',
  recorder:{ready:true},archive:{ready:true},speech:{ready:true},
  meetingSnapshot:(s,_booking,declared)=>({reasons:[],roomSlots:1,participantCapacity:8,media:{...media},platformDependency:{version:1,resourceId:declared.resourceId,generation:3,ready:true,reasons:[],media:{...media}}}),
  admitExternalGuest:(s,b)=>response(s,b),
  observeExternalGuest:(s,b)=>present?response(s,b):{admitted:false,reasons:['MEETING_EXTERNAL_GUEST_NOT_PRESENT']},
  reserveMeeting:(_s,q)=>({accepted:q.recording===true}),
  releaseMeeting:(_s,id)=>released.push(id),
  completeMeetingCapture:(s,session)=>{const record={id:'record-'+s.records.length,kind:'recording',interaction:session.bookingId,parents:[],region:'AU',retentionDays:30,access:['supervisor'],createdAt:s.clock,held:false,deleted:false};s.records.push(record);return {accepted:true,recordId:record.id};}
 };
 return {services,released};
}
function book(s,options={}){
 information.command(s,{action:'book',start:options.start??s.clock+1,end:options.end??s.clock+4,attendees:2,event:false,language:'en',externalGuest:descriptor(s,options.guest||{})},{});
 return s.information.bookings.at(-1);
}
function schedule(s,b,h){return information.command(s,{action:'schedule',booking:b.id},h.services,{reasons:[],media:{in:true,out:true}});}
function advance(s,h,minutes=1){for(let n=0;n<minutes;n++){s.clock++;information.advance(s,h.services,()=>{},()=>{});}return s;}

test('a foreign guest is admitted to a real native-platform meeting and remains present for its full duration',()=>{
 const s=ready(),h=guestHooks(),b=book(s),session=schedule(s,b,h);
 assert.equal(session.status,'scheduled',JSON.stringify(session.reasons));assert.equal(session.externalGuest.status,'scheduled');assert.equal(session.reservationHeld,true);
 advance(s,h,4);
 const completed=s.information.meetingSessions[0];
 assert.equal(completed.status,'completed');assert.equal(completed.platform,'grove');assert.equal(s.information.meeting.effective.platform,s.information.meeting.effective.nativePlatform);
 assert.deepEqual(completed.externalGuest,{version:1,admissionId:'guest-admission-'+b.id,guestId:'partner-jules',guestTenant:'tenant-partner',hostTenant:'tenant-host',admittedAt:b.start,lastPresentAt:b.end,observedMinutes:b.end-b.start,policyGeneration:2,platformResourceId:'phone',platformGeneration:3,media:{in:true,out:true},status:'completed',reason:null});
 assert.equal(completed.reservationHeld,false);assert.equal(completed.reservationReleased,true);assert.equal(h.released.length,1);
 assert.equal(completed.captureRecordId,'record-0');assert.equal(s.records[0].interaction,b.id);
 assert.doesNotThrow(()=>information.validate(s));
 const laterPolicy=guestHooks();information.command(s,{action:'configure',kind:'meeting',config:{guestJoin:false}},laterPolicy.services);
 s.clock++;information.advance(s,h.services,()=>{},()=>{});
 assert.equal(s.information.meeting.effective.guestJoin,false);
 assert.doesNotThrow(()=>information.validate(s),'later effective policy changes do not erase completed historical admission proof');
});

test('guestJoin permission applies on native joins and a denied guest creates no admission',()=>{
 const s=ready();s.information.meeting.effective.guestJoin=false;s.information.meeting.desired.guestJoin=false;
 const h=guestHooks(),b=book(s),session=schedule(s,b,h);
 assert.equal(s.information.meeting.effective.platform,s.information.meeting.effective.nativePlatform);
 assert.equal(session.status,'failed');assert.ok(session.reasons.includes('MEETING_GUEST_JOIN_DISABLED'));
 assert.equal(session.externalGuest.admissionId,null);assert.equal(session.reservationReleased,true);assert.deepEqual(h.released,[]);
 assert.doesNotThrow(()=>information.validate(s));
});

test('an external guest cannot join through a one-way platform media path',()=>{
 const s=ready(),h=guestHooks({media:{in:true,out:false}}),b=book(s),session=schedule(s,b,h);
 assert.equal(session.status,'failed');assert.ok(session.reasons.includes('MEETING_PLATFORM_MEDIA_UNAVAILABLE'));
 assert.equal(session.externalGuest.admissionId,null);assert.equal(session.reservationReleased,true);
 assert.doesNotThrow(()=>information.validate(s));
});

test('an active guest session fails when the effective meeting policy generation changes',()=>{
 const s=ready(),h=guestHooks(),b=book(s),session=schedule(s,b,h);advance(s,h,1);assert.equal(s.information.meetingSessions[0].status,'active');
 information.command(s,{action:'configure',kind:'meeting',config:{guestJoin:true}},{authorize:(_state,resourceId)=>resourceId==='phone'});
 advance(s,h,1);
 const failed=s.information.meetingSessions[0];assert.equal(failed.status,'failed');assert.ok(failed.reasons.includes('MEETING_EXTERNAL_GUEST_POLICY_CHANGED'));
 assert.equal(failed.externalGuest.status,'failed');assert.equal(failed.reservationReleased,true);assert.equal(h.released.length,1);
 assert.doesNotThrow(()=>information.validate(s));
});

test('live guest loss fails the actual meeting, releases reservation once and a fresh session recovers',()=>{
 const s=ready(),lost=guestHooks({present:true}),b=book(s),session=schedule(s,b,lost);
 advance(s,lost,1);assert.equal(s.information.meetingSessions[0].status,'active');
 lost.services.observeExternalGuest=(_s,_b)=>({admitted:false,reasons:['MEETING_EXTERNAL_GUEST_NOT_PRESENT']});
 advance(s,lost,1);
 const failed=s.information.meetingSessions[0];assert.equal(failed.status,'failed');assert.ok(failed.reasons.includes('MEETING_EXTERNAL_GUEST_NOT_PRESENT'));
 assert.equal(failed.externalGuest.status,'failed');assert.equal(failed.externalGuest.observedMinutes,0);assert.equal(failed.reservationHeld,false);assert.equal(failed.reservationReleased,true);
 const firstReleaseCount=lost.released.length;advance(s,lost,2);assert.equal(lost.released.length,firstReleaseCount);
 lost.services.observeExternalGuest=(state,booking)=>({admitted:true,admissionId:'guest-admission-'+booking.id,guestId:booking.externalGuest.guestId,guestTenant:booking.externalGuest.guestTenant,hostTenant:state.tenant});
 const fresh=book(s,{start:s.clock+1,end:s.clock+3}),recovered=schedule(s,fresh,lost);assert.equal(recovered.status,'scheduled');
 advance(s,lost,3);assert.equal(s.information.meetingSessions.at(-1).status,'completed');assert.equal(s.information.meetingSessions.at(-1).externalGuest.observedMinutes,2);
 assert.doesNotThrow(()=>information.validate(s));
});

test('booking and saved session validation reject invented or mismatched foreign guest evidence',()=>{
 const s=ready(),h=guestHooks(),b=book(s),session=schedule(s,b,h);advance(s,h,3);assert.doesNotThrow(()=>information.validate(s));
 for(const mutate of [
  bad=>{bad.information.bookings[0].externalGuest.guestTenant='tenant-host';},
  bad=>{bad.information.meetingSessions[0].externalGuest.guestTenant='tenant-forged';},
  bad=>{bad.information.meetingSessions[0].externalGuest.admissionId=null;},
  bad=>{bad.information.meetingSessions[0].externalGuest.observedMinutes--;},
  bad=>{delete bad.information.meetingSessions[0].externalGuest;}
 ]){
  const bad=structuredClone(s);mutate(bad);assert.throws(()=>information.validate(bad),/INVALID_(?:EXTERNAL_GUEST|MEETING_EXTERNAL_GUEST|MEETING_SESSION)/);
 }
 const malformed=ready();assert.throws(()=>book(malformed,{guest:{guestTenant:'tenant-host'}}),/INVALID_EXTERNAL_GUEST_BOOKING/);
});

test('the standalone information source serializes the guest lifecycle validator',()=>{
 const context={};vm.createContext(context);vm.runInContext(information.source()+';globalThis.externalInformation=SOC_INFORMATION;',context);
 assert.equal(context.externalInformation.PACK,information.PACK);
 assert.equal(typeof context.externalInformation.validate,'function');
});
