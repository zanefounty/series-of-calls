'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const info=(s,command)=>SOC.dispatch(s,{type:'information',command});
const tick=(s,minutes=1)=>SOC.dispatch(s,{type:'advance',minutes});
function ready(){
 let s=SOC.create({scenario:'enterprise'});
 for(const c of SOC.reference(s).filter(c=>c.type==='configure'))s=SOC.dispatch(s,c);
 s=info(s,{action:'start'});s=tick(s);return s;
}
function book(s,{start=s.clock+2,end=s.clock+5,attendees=4,event=false}={}){
 const state=info(s,{action:'book',start,end,attendees,event,language:'en'});return {state,booking:state.information.bookings.at(-1)};
}

test('PLAY-014/041 scheduled meetings occupy a room for their booked duration and complete only after live delivery',()=>{
 let {state:s,booking}=book(ready());s=info(s,{action:'schedule',booking:booking.id});
 let session=s.information.meetingSessions[0];assert.equal(session.status,'scheduled');assert.equal(session.scheduledAt,booking.start);assert.equal(session.endsAt,booking.end);
 s=tick(s,2);session=s.information.meetingSessions[0];assert.equal(session.status,'active');assert.equal(session.startedAt,booking.start);assert.equal(session.captureRecordId,null);
 assert.equal(SOC.restore(JSON.stringify(s)).information.meetingSessions[0].status,'active','active occupancy survives save/restore');
 s=tick(s,2);assert.equal(s.information.meetingSessions[0].status,'active');
 const expected=tick(s);let workerResult;const context={postMessage:r=>workerResult=r};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:1,state:s,command:{type:'advance',minutes:1}}});s=expected;assert.deepEqual(JSON.parse(JSON.stringify(workerResult.state)),s,'worker advancement must complete the same meeting session');
 session=s.information.meetingSessions[0];assert.equal(session.status,'completed');assert.equal(session.endedAt,booking.end);assert.equal(session.features.recording,false);assert.equal(s.records.length,0);
 assert.equal(SOC.restore(JSON.stringify(s)).information.meetingSessions[0].status,'completed');
 const legacy=structuredClone(s);delete legacy.information.meetingSessions;delete legacy.information.nextMeetingSessionId;for(const row of legacy.information.bookings)delete row.sessionId;assert.equal(SOC.validateState(legacy),legacy,'legacy information saves without meeting sessions remain valid');
});

test('PLAY-014 no effective participant capacity fails admission and cancellation is terminal once',()=>{
 let s=ready();s=info(s,{action:'configure',kind:'meeting',config:{capacity:0}});s=tick(s);let booking;s=book(s,{start:s.clock,end:s.clock+4,attendees:1}).state;booking=s.information.bookings.at(-1);
 s=info(s,{action:'schedule',booking:booking.id});let session=s.information.meetingSessions[0];assert.equal(session.status,'failed');assert.ok(session.reasons.includes('MEETING_CAPACITY_ZERO'));
 let roomDown=ready();roomDown=SOC.dispatch(roomDown,{type:'configure',id:'room',config:{...roomDown.resources.room.effective,enabled:false}});roomDown=tick(roomDown);roomDown=book(roomDown,{start:roomDown.clock,end:roomDown.clock+4}).state;booking=roomDown.information.bookings.at(-1);roomDown=info(roomDown,{action:'schedule',booking:booking.id});assert.equal(roomDown.information.meetingSessions[0].status,'failed');assert.ok(roomDown.information.meetingSessions[0].reasons.includes('MEETING_ROOM_UNAVAILABLE'));
 s=ready();s=book(s,{start:s.clock,end:s.clock+4}).state;const next=s.information.bookings.at(-1);s=info(s,{action:'schedule',booking:next.id});session=s.information.meetingSessions[0];assert.equal(session.status,'active');
 s=info(s,{action:'cancel-session',sessionId:session.id});assert.equal(s.information.meetingSessions[0].status,'cancelled');
 assert.throws(()=>info(s,{action:'cancel-session',sessionId:session.id}),/MEETING_SESSION_UNAVAILABLE/);
});

test('recording meetings use the shared capture reservation through actual completion and failure release',()=>{
 let s=ready();s=info(s,{action:'configure',kind:'meeting',config:{recording:true}});s=tick(s);
 s=book(s,{start:s.clock,end:s.clock+3}).state;let booking=s.information.bookings.at(-1);s=info(s,{action:'schedule',booking:booking.id});
 let session=s.information.meetingSessions[0];assert.equal(session.status,'active');assert.ok(s.captureReservations.some(r=>r.id===session.id&&r.kind==='meeting'));
 s=tick(s,2);assert.equal(s.information.meetingSessions[0].status,'active');s=tick(s);
 session=s.information.meetingSessions[0];assert.equal(session.status,'completed');assert.ok(session.captureRecordId);assert.equal(s.records.find(r=>r.id===session.captureRecordId).kind,'recording');assert.equal(s.captureReservations.some(r=>r.id===session.id),false);

 let failed=ready();failed=info(failed,{action:'configure',kind:'meeting',config:{recording:true}});failed=tick(failed);failed=book(failed,{start:failed.clock,end:failed.clock+4}).state;booking=failed.information.bookings.at(-1);failed=info(failed,{action:'schedule',booking:booking.id});session=failed.information.meetingSessions[0];
 failed=SOC.dispatch(failed,{type:'connect',connected:false});failed=tick(failed);session=failed.information.meetingSessions[0];assert.equal(session.status,'failed');assert.ok(session.reasons.includes('MEETING_CLOUD_MEDIA'));assert.equal(failed.captureReservations.some(r=>r.id===session.id),false);
 const failedReceipts=failed.information.audit.filter(x=>x.code==='MEETING_SESSION_FAILED'&&x.session===session.id).length;failed=tick(failed,2);assert.equal(failed.information.audit.filter(x=>x.code==='MEETING_SESSION_FAILED'&&x.session===session.id).length,failedReceipts);assert.equal(failed.captureReservations.some(r=>r.id===session.id),false);

 let cancelled=ready();cancelled=info(cancelled,{action:'configure',kind:'meeting',config:{recording:true}});cancelled=tick(cancelled);cancelled=book(cancelled,{start:cancelled.clock,end:cancelled.clock+4}).state;booking=cancelled.information.bookings.at(-1);cancelled=info(cancelled,{action:'schedule',booking:booking.id});session=cancelled.information.meetingSessions[0];assert.ok(cancelled.captureReservations.some(r=>r.id===session.id));
 cancelled=info(cancelled,{action:'cancel',booking:booking.id});assert.equal(cancelled.information.meetingSessions[0].status,'cancelled');assert.equal(cancelled.captureReservations.some(r=>r.id===session.id),false);const cancellationReceipts=cancelled.information.audit.filter(x=>x.code==='MEETING_SESSION_CANCELLED'&&x.session===session.id).length;cancelled=tick(cancelled,2);assert.equal(cancelled.information.audit.filter(x=>x.code==='MEETING_SESSION_CANCELLED'&&x.session===session.id).length,cancellationReceipts);
});

test('legacy join remains an explicit training probe and cannot earn delivered meeting evidence',()=>{
 let s=ready();s=book(s,{start:s.clock,end:s.clock+4}).state;const booking=s.information.bookings.at(-1);s=info(s,{action:'join',booking:booking.id});
 assert.equal(s.lastMeeting.probe,true);assert.equal(s.lastMeeting.nonCommercial,true);assert.equal(s.lastMeeting.recordingObserved,false);
 assert.equal(s.information.meetingSessions.length,0);assert.equal(s.records.length,0);
});
