const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const E=require('../src/game/55-communications');
const run=(s,cs)=>cs.reduce(E.dispatch,s);
const ready=(scenario='smb')=>E.dispatch(E.create({scenario}),{type:'advance',minutes:1});
const cfg=(s,id,config)=>run(s,[{type:'configure',id,config},{type:'advance',minutes:1}]);
const call=(s,extra={})=>E.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'case-one',...extra});

test('AC-SOC-001 desired, provisioning, effective and observed state remain distinct',()=>{
 let s=E.create();assert.equal(s.resources.phone.effective,null);
 s=E.dispatch(s,{type:'advance',minutes:1});const old=structuredClone(s.resources.phone.effective);
 s=E.dispatch(s,{type:'configure',id:'phone',config:{signalling:false}});
 assert.deepEqual(s.resources.phone.effective,old);assert.equal(s.resources.phone.provisioning.status,'pending');
 s=E.dispatch(s,{type:'advance',minutes:1});assert.equal(s.resources.phone.effective.signalling,false);
 s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});assert.equal(s.resources.phone.provisioning.status,'ready');assert.equal(E.observe(s,'phone').ready,false);
});
test('AC-SOC-002 ordered routes, scoped extensions, identity and directional media',()=>{
 let s=ready();s=cfg(s,'phone',{routes:[{prefix:'+61',target:'desk'}]});
 assert.equal(call(s).interactions.at(-1).outcome,'CONNECTED');
 assert.equal(call(s,{to:'201'}).interactions.at(-1).outcome,'CONNECTED');
 assert.equal(call(s,{from:'intruder'}).interactions.at(-1).outcome,'IDENTITY_OR_ENTITLEMENT');
 s=cfg(s,'carrier',{mediaIn:false});let i=call(s).interactions.at(-1);
 assert.equal(i.outcome,'ONE_WAY_MEDIA');assert.ok(i.trace.some(t=>t.code==='200_OK'));assert.deepEqual(i.media,{out:true,in:false});
 s=E.dispatch(s,{type:'add',id:'duplicate',kind:'endpoint'});s=E.dispatch(s,{type:'advance',minutes:1});
 assert.equal(call(s,{to:'201'}).interactions.at(-1).outcome,'AMBIGUOUS_EXTENSION');
});
test('AC-SOC-003 more trunks do not create skilled people or agent entitlements',()=>{
 let s=ready();s=cfg(s,'carrier',{capacity:100});s=call(s);s=E.dispatch(s,{type:'advance',minutes:3});
 assert.equal(s.interactions[0].phase,'queued');assert.ok(s.interactions[0].trace.some(t=>t.code==='PEOPLE_OR_ENTITLEMENTS'));
 s=cfg(s,'people',{people:4,entitlements:0});s=E.dispatch(s,{type:'advance',minutes:1});assert.equal(s.interactions[0].phase,'queued');
 s=cfg(s,'people',{entitlements:4});s=E.dispatch(s,{type:'advance',minutes:5});assert.equal(s.interactions[0].phase,'resolved');
 const external=cfg(ready(),'people',{operator:'customer'});
 assert.throws(()=>cfg(external,'people',{people:100}),/WORKFORCE_CUSTOMER_CONTROLLED/);
 assert.throws(()=>E.dispatch(external,{type:'restore',resources:{people:{...external.resources.people.desired,people:100}}}),/WORKFORCE_CUSTOMER_CONTROLLED/);
});
test('AC-SOC-004 session admission is independent of queue staffing',()=>{
 let s=cfg(ready(),'carrier',{capacity:1});s=call(s);s=call(s,{caseId:'case-two'});assert.equal(s.interactions.at(-1).outcome,'SESSION_CAPACITY');
});
test('AC-SOC-005 messaging preserves case identity across channels and retries are idempotent',()=>{
 let s=cfg(ready(),'people',{people:2});
 const c={type:'interact',channel:'message',from:'alex',to:'service',caseId:'case-one',requestId:'retry-one',expectedRevision:s.revision};
 s=E.dispatch(s,c);const copy=E.dispatch(s,c);assert.deepEqual(copy,s);
 assert.throws(()=>E.dispatch(s,{...c,to:'changed'}),/IDEMPOTENCY_CONFLICT/);
 s=call(s);assert.equal(s.cases['case-one'].interactions.length,2);assert.ok(s.interactions.every(i=>i.context));
 assert.throws(()=>call(s,{from:'bea'}),/CASE_IDENTITY_MISMATCH/);
});
test('AC-SOC-006 successful voice can fail mandatory recording',()=>{
 let s=ready('enterprise');s=call(s);s=E.dispatch(s,{type:'advance',minutes:5});
 assert.equal(s.interactions[0].phase,'resolved');assert.deepEqual(s.interactions[0].obligations,['RECORDING_FAILED']);assert.equal(E.assess(s).passed,false);
});
test('AC-SOC-007 healthy room device does not establish calendar or interop readiness',()=>{
 let s=ready('enterprise');assert.equal(E.observe(s,'room').ready,true);assert.ok(E.meeting(s).reasons.includes('CALENDAR'));
 s=cfg(s,'room',{calendar:true,mode:'bridge'});assert.ok(E.meeting(s).reasons.includes('INTEROPERABILITY'));
 s=cfg(s,'room',{interop:true});assert.equal(E.meeting(s).success,true);
});
test('AC-SOC-008 information lineage and forbidden processing boundary',()=>{
 let s=ready('government');s=call(s);s=E.dispatch(s,{type:'advance',minutes:5});
 assert.ok(s.interactions[0].obligations.includes('PROCESSING_BOUNDARY'));assert.equal(s.records.length,1);
 s=cfg(s,'speech',{region:'AU'});s=call(s,{caseId:'case-two'});s=E.dispatch(s,{type:'advance',minutes:5});
 const transcript=s.records.find(r=>r.kind==='transcription');assert.ok(transcript);assert.equal(s.records.find(r=>r.id===transcript.parents[0]).kind,'recording');
});
test('AC-SOC-009 local devices still depend on identity, time and licensing during isolation',()=>{
 let s=ready('defence');s=E.dispatch(s,{type:'connect',connected:false});assert.equal(E.observe(s,'phone').ready,false);
 s=cfg(s,'local',{licensing:true});assert.equal(E.observe(s,'phone').ready,true);
 s=cfg(s,'local',{time:false});assert.equal(E.observe(s,'phone').ready,false);
});
test('AC-SOC-010 all foundation exercises have reference and meaningful failing solutions in every region',()=>{
 for(const scenario of Object.keys(E.scenarios))for(const jurisdiction of E.jurisdictions){
  const start=E.create({scenario,jurisdiction,mode:'assessed'});assert.equal(E.assess(start).passed,false);
  const solved=run(start,E.reference(start));assert.equal(E.assess(solved).passed,true,scenario+'/'+jurisdiction);
  const broken=E.dispatch(solved,{type:'fault',id:'phone',fault:'OUTAGE'});assert.equal(E.assess(broken).passed,false,'stale success cannot pass');
 }
});
test('AC-SOC-011 repeatable calculation, integer economic reconciliation, save and deterministic replay',()=>{
 const initial=E.create(),commands=E.reference(initial);const s=run(initial,commands),before=JSON.stringify(s);
 assert.deepEqual(E.calculate(s),E.calculate(s));assert.equal(JSON.stringify(s),before);
 assert.deepEqual(E.restore(before),s);assert.deepEqual(run(initial,commands),s);
 assert.equal(s.totals.cost,s.ledger.reduce((a,l)=>a+l.cost,0));assert.equal(s.totals.revenue,s.ledger.reduce((a,l)=>a+l.revenue,0));
 assert.throws(()=>E.restore(JSON.stringify({v:1,day:4,cash:50,pops:{},links:[]})),/INCOMPATIBLE_SAVE/);
 assert.throws(()=>E.restore(JSON.stringify({...s,pack:'future-pack'})),/CONTENT_PACK_UNAVAILABLE/);
 for(const mutate of [x=>delete x.resources.phone,x=>x.ledger.push({minute:1,cost:-10}),x=>x.records.push({id:'fake'}),x=>x.receipts.push(null),x=>x.interactions[0].trace.push(null)]){
  const bad=structuredClone(s);mutate(bad);assert.throws(()=>E.restore(JSON.stringify(bad)));
 }
});
test('AC-SOC-012 worker serialization produces the synchronous command result',()=>{
 const s=ready(),command={type:'advance',minutes:10};let result;
 const context={postMessage:r=>result=r};vm.createContext(context);vm.runInContext(E.workerSource(),context);
 context.onmessage({data:{id:1,state:s,command}});
 assert.deepEqual(JSON.parse(JSON.stringify(result.state)),E.dispatch(s,command));assert.equal(result.revision,s.revision);
});
test('AC-SOC-013 invalid references fail provisioning and command validation is atomic',()=>{
 let s=ready();const before=JSON.stringify(s);
 assert.throws(()=>E.dispatch(s,{type:'configure',id:'carrier',config:{capacity:'100Mbps'}}),/INVALID_FIELD/);assert.equal(JSON.stringify(s),before);
 s=cfg(s,'phone',{directory:'carrier'});assert.equal(s.resources.phone.provisioning.status,'failed');assert.equal(s.resources.phone.effective.directory,'identity');
 assert.throws(()=>E.dispatch(s,{type:'advance',minutes:1,expectedRevision:0}),/STALE_COMMAND/);
 assert.throws(()=>E.dispatch(s,{type:'add',id:'__proto__',kind:'endpoint'}),/INVALID_RESOURCE|DUPLICATE/);
});
test('AC-SOC-014 cohort migration requires ready target and supports configuration recovery',()=>{
 let s=ready();const checkpoint={desk:structuredClone(s.resources.desk.desired)};
 s=E.dispatch(s,{type:'add',id:'new-phone',kind:'dedicated'});
 assert.throws(()=>E.dispatch(s,{type:'migrate',identities:['bea'],target:'new-phone'}),/TARGET_NOT_READY/);
 s=E.dispatch(s,{type:'advance',minutes:1});s=E.dispatch(s,{type:'migrate',identities:['bea'],target:'new-phone'});
 assert.equal(s.resources.desk.effective.scope,'tenant');s=E.dispatch(s,{type:'advance',minutes:1});assert.equal(s.resources.desk.effective.scope,'site');
 s=run(s,[{type:'restore',resources:checkpoint},{type:'advance',minutes:1}]);assert.equal(s.resources.desk.effective.scope,'tenant');
});
