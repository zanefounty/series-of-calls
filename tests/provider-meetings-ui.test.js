'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../src/game/93-ui/79-provider-meetings.js'),'utf8');
function ui(t){const dom=new JSDOM('<!doctype html><body></body>',{runScripts:'dangerously'});t.after(()=>dom.window.close());const w=dom.window;w.N_=x=>x;w.eval(source);return {w,host:w.document.body,api:w.SOCProviderMeetings};}
function fixture(){return {id:'room',scope:'customer-two',meetingService:{profile:{capacity:8,mediaPlacement:'local',platformDependency:{version:1,resourceId:'migration-phone'}},platform:{id:'migration-phone',name:'Canopy coexistence platform',generation:3,ready:true,reasons:[]},sessions:[{id:'meeting-1',bookingId:'booking-1',status:'active',scheduledAt:10,startedAt:10,endsAt:14,endedAt:null,reservationHeld:true,reservationReleased:false,captureRecordId:null},{id:'meeting-2',bookingId:'booking-2',status:'failed',scheduledAt:20,startedAt:20,endsAt:24,endedAt:21,reasons:['MEETING_PLATFORM_DEPENDENCY_CHANGED'],reservationHeld:false,reservationReleased:true,captureRecordId:null},{id:'meeting-3',bookingId:'booking-3',status:'completed',scheduledAt:30,startedAt:30,endsAt:34,endedAt:34,reservationHeld:false,reservationReleased:true,captureRecordId:'record-3'}]}};}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}

test('room inspector is pure and links its declared platform within the selected customer scope',t=>{
 const {api,host}=ui(t),r=freeze(fixture()),before=JSON.stringify(r);const html=api.render(r);assert.equal(api.render(r),html);assert.equal(JSON.stringify(r),before);host.innerHTML=html;
 assert.match(host.textContent,/8 participants/);assert.match(host.textContent,/Media locationLocal/);assert.match(host.textContent,/Platform available/);assert.match(host.textContent,/Generation 3/);
 const action=host.querySelector('[data-provider-action="select-service"]');assert.equal(action.dataset.id,'migration-phone');assert.equal(action.dataset.customer,'customer-two');assert.match(action.textContent,/Canopy coexistence/);
 host.innerHTML=api.render(r,'explicit-customer');assert.equal(host.querySelector('button').dataset.customer,'explicit-customer');assert.equal(host.querySelectorAll('[data-provider-action]').length,1,'presentation only exposes navigation, not a mutation');
});

test('actual active failed and completed meetings retain distinct duration reservation capture and readable failure evidence',t=>{
 const {api,host}=ui(t);host.innerHTML=api.render(fixture());const rows=[...host.querySelectorAll('.provider-meeting-session')];assert.equal(rows.length,3);
 assert.match(rows[0].textContent,/In progress/);assert.match(rows[0].textContent,/delivery is not complete/);assert.match(rows[0].textContent,/Capture reservationHeld/);assert.doesNotMatch(rows[0].querySelector('dl').textContent,/Observed duration/);
 assert.match(rows[1].textContent,/did not complete successfully/);assert.match(rows[1].textContent,/Observed duration1 minutes/);assert.match(rows[1].textContent,/Capture reservationReleased/);assert.match(rows[1].textContent,/platform or its service generation changed/);assert.ok(rows[1].innerHTML.indexOf('platform or its service generation changed')<rows[1].innerHTML.indexOf('<details>'),'plain failure precedes technical evidence');
 assert.match(rows[2].textContent,/Completed/);assert.match(rows[2].textContent,/Observed duration4 minutes/);assert.match(rows[2].textContent,/Retained capturerecord-3/);assert.match(rows[2].textContent,/Capture reservationReleased/);
});

test('missing unavailable and legacy platform dependencies never become delivered meeting proof',t=>{
 const {api,host}=ui(t),r=fixture();r.meetingService.platform=null;r.meetingService.sessions=[];r.meetingService.lastMeeting={success:true,probe:true};host.innerHTML=api.render(r);
 assert.match(host.textContent,/Platform unavailable/);assert.match(host.textContent,/no current observation/);assert.match(host.textContent,/No actual meeting sessions/);assert.equal(host.querySelector('button').dataset.id,'migration-phone');
 r.meetingService.platform={id:'migration-phone',ready:false,reasons:['OUTAGE']};host.innerHTML=api.render(r);assert.match(host.textContent,/required service dependency is unavailable/);
 delete r.meetingService.profile.platformDependency;host.innerHTML=api.render(r);assert.match(host.textContent,/no explicit platform dependency/);assert.match(host.textContent,/continuity has not been established/);assert.equal(host.querySelector('button'),null);assert.doesNotMatch(host.textContent,/Platform available/);
 r.meetingService.profile=null;host.innerHTML=api.render(r);assert.match(host.textContent,/No effective meeting profile/);assert.equal(api.render({id:'room'}),'');
});

test('room session list excludes probes bounds actual history and escapes evidence while all labels use static translation keys',t=>{
 const {api,host,w}=ui(t),r=fixture();r.meetingService.sessions=[{id:'probe-only',status:'completed',probe:true},...Array.from({length:10},(_,i)=>({...r.meetingService.sessions[2],id:'actual-'+i}))];host.innerHTML=api.render(r);assert.equal(host.querySelectorAll('.provider-meeting-session').length,8);assert.equal(host.querySelector('[data-session-id="actual-0"]'),null);assert.equal(host.querySelector('[data-session-id="probe-only"]'),null);assert.match(host.textContent,/Join probes do not count/);
 r.meetingService.platform.name='<img src=x onerror=alert(1)>';r.meetingService.sessions=[{...fixture().meetingService.sessions[1],id:'<script>bad</script>',reasons:['<svg onload=alert(1)>']}];host.innerHTML=api.render(r);assert.equal(host.querySelector('script,img,svg'),null);assert.match(host.textContent,/A required service check failed/);
 assert.ok(Object.keys(api.labelFallbacks).length>=40);assert.ok(Object.keys(api.labelFallbacks).every(k=>source.includes("N_('"+k+"')")));assert.ok(Object.values(api.labelFallbacks).every(v=>typeof v==='string'&&v.length));
 w.tr=(key,vars)=>key===api.keys.title?'Translated room':key;host.innerHTML=api.render(r);assert.match(host.textContent,/Translated room/);
});

test('actual room rows expose the observed joining method and foreign guest presence before technical evidence',t=>{
 const {api,host}=ui(t),r=fixture(),session=r.meetingService.sessions[2];Object.assign(session,{joinMethod:'browser',joinRoomGeneration:2,joinProfileGeneration:3,externalGuest:{guestId:'partner-jules',observedMinutes:4},captureRecordId:null,reservationReleased:false});const before=JSON.stringify(r);host.innerHTML=api.render(r);const row=host.querySelector('[data-session-id="meeting-3"]'),visible=row.querySelector('dl').textContent;assert.match(visible,/Joining methodBrowser guest/);assert.match(visible,/Observed external guestpartner-jules: 4 minutes/);assert.match(visible,/Observed duration4 minutes/);assert.match(visible,/No capture record/);const evidence=JSON.parse(row.querySelector('pre').textContent);assert.equal(evidence.joinRoomGeneration,2);assert.equal(evidence.joinProfileGeneration,3);assert.equal(evidence.externalGuest.observedMinutes,4);assert.equal(JSON.stringify(r),before);
});
