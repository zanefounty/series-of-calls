const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications');
const info=(s,command)=>E.dispatch(s,{type:'information',command}),tick=(s,minutes=1)=>E.dispatch(s,{type:'advance',minutes});
const cfg=(s,kind,config)=>tick(info(s,{action:'configure',kind,config}));
const res=(s,id,config)=>tick(E.dispatch(s,{type:'configure',id,config}));
function ready(scenario='government'){
 let s=E.create({scenario});for(const c of E.reference(s).filter(c=>c.type==='configure'))s=E.dispatch(s,c);
 s=info(s,{action:'start'});s=tick(s);return res(s,'phone',{routes:[{prefix:'+61',target:'desk'}]});
}
const call=(s,caseId='case-one')=>E.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId});
test('AC-SOC-031 information work is delayed, capacity typed, lineage retained and reads pure',()=>{
 let s=res(ready(),'speech',{capacity:1});s=call(s);assert.equal(s.records.length,1);assert.equal(E.assess(s).passed,false);
 const before=JSON.stringify(s);E.calculate(s);E.calculate(s);assert.equal(JSON.stringify(s),before);
 s=tick(s);assert.equal(s.records.length,1);s=tick(s);assert.equal(s.records[1].kind,'transcription');
 s=tick(s,6);assert.equal(s.information.jobs[0].status,'complete');assert.deepEqual(s.records.map(r=>r.kind),['recording','transcription','diarisation','summary','actions','redaction','index']);
 for(let n=1;n<s.records.length;n++)assert.deepEqual(s.records[n].parents,[s.records[n-1].id]);
 assert.equal(s.records.at(-1).redacted,true);assert.equal(E.assess(s).passed,true);
});
test('AC-SOC-032 processing boundaries, language and quality fail independently of calling',()=>{
 let s=res(ready(),'speech',{region:'US'});s=call(s);s=tick(s);assert.equal(s.interactions[0].outcome,'CONNECTED');assert.equal(s.information.jobs[0].reason,'PROCESSING_BOUNDARY');
 assert.equal(s.records.length,1);s=res(s,'speech',{region:'AU'});s=tick(s,6);assert.equal(s.information.jobs[0].status,'complete');
 let low=cfg(ready(),'pipeline',{quality:50});low=tick(call(low));assert.equal(low.information.jobs[0].reason,'PROCESSING_QUALITY');assert.equal(low.records.length,1);assert.equal(E.assess(low).passed,false);
 let language=cfg(ready(),'pipeline',{languages:['ja']});language=tick(call(language));assert.equal(language.information.jobs[0].reason,'PROCESSING_LANGUAGE');
 assert.throws(()=>info(s,{action:'configure',kind:'pipeline',config:{steps:['summary','index']}}),/INVALID_PROCESSING_CHAIN/);
 assert.throws(()=>info(s,{action:'configure',kind:'pipeline',config:{processor:'access'}}),/INVALID_PROCESSING_RESOURCE/);
});
test('AC-SOC-033 permissions narrow along lineage and held descendants prevent deletion',()=>{
 let s=ready();s=res(s,'archive',{access:['supervisor','auditor']});s=tick(call(s),6);const root=s.records[0].id,derived=s.records.at(-1).id;
 assert.deepEqual(s.records.at(-1).access,['supervisor']);assert.throws(()=>info(s,{action:'read',record:derived,role:'auditor',region:'AU'}),/RECORD_ACCESS_DENIED/);
 assert.throws(()=>info(s,{action:'read',record:root,role:'supervisor',region:'US'}),/RECORD_ACCESS_DENIED/);
 s=info(s,{action:'read',record:derived,role:'supervisor',region:'AU'});assert.equal(s.information.audit.at(-1).code,'RECORD_READ');
 assert.throws(()=>info(s,{action:'hold',record:derived,role:'auditor',held:true}),/HOLD_AUTHORITY/);
 s=info(s,{action:'hold',record:derived,role:'supervisor',held:true});assert.throws(()=>info(s,{action:'remove',record:root,role:'supervisor'}),/RECORD_HELD/);
 s=info(s,{action:'hold',record:derived,role:'supervisor',held:false});s=info(s,{action:'remove',record:root,role:'supervisor'});assert.ok(s.records.every(r=>r.deleted));assert.equal(E.assess(s).passed,false);assert.equal(s.records[1].parents[0],root);
});
test('AC-SOC-034 retention expiry, hold release and replay preserve tombstones',()=>{
 let s=cfg(ready(),'pipeline',{retentionDays:1,steps:['transcription']});s=tick(call(s));const record=s.records[1];assert.ok(record.expiresAt<s.records[0].expiresAt);
 s=info(s,{action:'hold',record:record.id,role:'supervisor',held:true});s=tick(s,1440);assert.equal(s.records[1].deleted,false);
 s=info(s,{action:'hold',record:record.id,role:'supervisor',held:false});s=tick(s);assert.equal(s.records[1].deleted,true);assert.equal(s.records[0].deleted,false);
 const restored=E.restore(JSON.stringify(s));assert.deepEqual(restored,s);assert.throws(()=>info(s,{action:'read',record:record.id,role:'supervisor',region:'AU'}),/RECORD_UNAVAILABLE/);
});
test('AC-SOC-035 bookings, native and interop joins, events and recording dependencies differ',()=>{
 let s=ready('enterprise');s=info(s,{action:'book',start:s.clock+1,end:s.clock+10,attendees:4,event:false,language:'en'});const booking=s.information.bookings[0].id;
 assert.throws(()=>info(s,{action:'book',start:s.clock+2,end:s.clock+4,attendees:2,event:false,language:'en'}),/ROOM_BOOKING_CONFLICT/);
 s=info(s,{action:'join',booking});assert.ok(s.lastMeeting.reasons.includes('BOOKING_WINDOW'));s=tick(s);s=info(s,{action:'join',booking});assert.equal(s.lastMeeting.success,true);assert.equal(s.lastMeeting.at,s.clock);assert.equal(s.information.audit.find(a=>a.auditId===s.lastMeeting.auditId).booking,booking);const badJoin=structuredClone(s);badJoin.information.audit=badJoin.information.audit.filter(a=>a.auditId!==s.lastMeeting.auditId);assert.throws(()=>E.restore(JSON.stringify(badJoin)),/INVALID_MEETING_RECEIPT/);
 s=cfg(s,'meeting',{platform:'disco'});s=info(s,{action:'join',booking});assert.ok(s.lastMeeting.reasons.includes('JOIN_METHOD_UNSUPPORTED'));
 s=res(s,'room',{mode:'bridge',interop:true});s=info(s,{action:'join',booking});assert.equal(s.lastMeeting.success,false);
 s=cfg(s,'meeting',{bridgeLicensed:true,recording:true,captions:true});s=info(s,{action:'join',booking});assert.equal(s.lastMeeting.success,true);assert.equal(s.records.length,1);s=info(s,{action:'join',booking});assert.equal(s.records.length,1,'repeat join must not duplicate capture');
 s=info(s,{action:'cancel',booking});s=info(s,{action:'book',start:s.clock,end:s.clock+10,attendees:40,event:true,language:'en'});const event=s.information.bookings.at(-1).id;s=info(s,{action:'join',booking:event});assert.ok(s.lastMeeting.reasons.includes('EVENT_ENTITLEMENT'));
 s=cfg(s,'meeting',{eventLicensed:true});s=info(s,{action:'join',booking:event});assert.equal(s.lastMeeting.success,true);
});
test('AC-SOC-036 disconnected local processing and meeting media require local licences and services',()=>{
 let s=ready('defence');s=cfg(s,'meeting',{captions:true});s=info(s,{action:'book',start:s.clock,end:s.clock+20,attendees:2,event:false,language:'en'});const booking=s.information.bookings[0].id;
 s=E.dispatch(s,{type:'connect',connected:false});s=info(s,{action:'join',booking});assert.ok(s.lastMeeting.reasons.includes('MEETING_CLOUD_MEDIA'));assert.ok(s.lastMeeting.reasons.includes('CAPTIONS_DEPENDENCY'));
 s=cfg(s,'meeting',{mediaPlacement:'local'});s=res(s,'speech',{licenceLocal:true});s=info(s,{action:'join',booking});assert.equal(s.lastMeeting.success,true);
 s=res(s,'local',{dns:false});s=info(s,{action:'join',booking});assert.equal(s.lastMeeting.success,false);
});
test('AC-SOC-037 pipeline plans persist across configuration changes and worker execution matches',()=>{
 let s=call(ready());s=info(s,{action:'configure',kind:'pipeline',config:{steps:['transcription','redaction','index']}});s=tick(s);assert.deepEqual(s.information.jobs[0].plan.steps,['transcription','diarisation','summary','actions','redaction','index']);
 let result;const context={postMessage:r=>result=r};vm.createContext(context);vm.runInContext(E.workerSource(),context);context.onmessage({data:{id:1,state:s,command:{type:'advance',minutes:6}}});assert.deepEqual(JSON.parse(JSON.stringify(result.state)),tick(s,6));
 const bad=structuredClone(tick(s,6));bad.records[1].parents=['missing-parent'];assert.throws(()=>E.restore(JSON.stringify(bad)),/INFORMATION_LINEAGE/);
});

test('AC-SOC-349 information history records actual bounded evictions without changing lineage or read purity',()=>{
 let s=cfg(ready(),'pipeline',{steps:['transcription']});s=tick(call(s,'history-first'),2);
 const record=s.records.at(-1).id,job=s.information.jobs[0].id;s=info(s,{action:'read',record,role:'supervisor',region:'AU'});const custody=s.information.audit.at(-1);
 assert.ok(custody.auditId>0);assert.equal(s.information.jobPrunedThrough,0);
 for(let n=0;n<201;n++)s=tick(call(s,'history-'+n),2);
 assert.equal(s.information.jobs.length,200);assert.equal(s.information.jobs.some(x=>x.id===job),false);assert.ok(s.information.jobPrunedThrough>=Number(job.slice(11)));
 for(let n=0;n<150;n++)s=info(s,{action:'read',record,role:'supervisor',region:'AU'});
 assert.equal(s.information.audit.length,500);assert.ok(s.information.auditPrunedThrough>=custody.auditId);assert.ok(s.records.some(x=>x.id===record));
 const before=JSON.stringify(s);E.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(E.restore(before),s);
 const invalid=structuredClone(s);invalid.information.jobPrunedThrough=invalid.information.nextId;assert.throws(()=>E.restore(JSON.stringify(invalid)),/INVALID_INFORMATION_HISTORY/);
 const duplicate=structuredClone(s);duplicate.information.audit[1].auditId=duplicate.information.audit[0].auditId;assert.throws(()=>E.restore(JSON.stringify(duplicate)),/INVALID_INFORMATION_AUDIT/);
 const legacy=structuredClone(s);for(const k of ['jobPrunedThrough','nextAuditId','auditPrunedThrough'])delete legacy.information[k];for(const a of legacy.information.audit)delete a.auditId;assert.equal(E.validateState(legacy),legacy);
});
