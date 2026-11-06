const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),fixture=require('../content/admission-security.json').reference_fixture;
const security=(s,command)=>SOC.dispatch(s,{type:'admission-security',command});
function setup(cap=1000){let s=security(SOC.create(),{action:'start'});for(const c of fixture.configures)s=security(s,c);s=security(s,{action:'configure',control:'destination',config:{windowSpendLimitCents:cap}});s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:2}});return SOC.dispatch(s,{type:'advance',minutes:1});}
function call(s,to='+61255500201',caseId='security-case'){return SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to,caseId});}
test('AC-SOC-197 independent abuse controls gate actual calls and usage reconciles once against the core ledger',()=>{
 let s=setup();s=security(s,fixture.packetBatch);for(const c of fixture.signallingSamples)s=security(s,c);
 s=call(s,'+61355500201','blocked-destination');assert.equal(s.interactions.at(-1).outcome,'DESTINATION_NOT_ALLOWED');
 s=call(s);const id=s.interactions.at(-1).id;assert.ok(s.interactions.at(-1).trace.some(t=>t.code==='SECURITY_CALL_ADMITTED'));
 s=SOC.dispatch(s,{type:'advance',minutes:5});assert.equal(s.interactions.find(i=>i.id===id).phase,'resolved');
 const settlement=s.admissionSecurity.settlements.find(x=>x.interactionId===id);assert.ok(settlement.cents>0);assert.equal(settlement.cents,s.ledger.filter(x=>x.voiceInteractions?.includes(id)).length*2);
 assert.equal(SOC.calculate(s).admissionSecurity.assessment.passed,true);
 const before=JSON.stringify(s);SOC.calculate(s);SOC.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(SOC.restore(before),s);
 const wrong=structuredClone(s);wrong.ledger.find(x=>x.voiceInteractions?.includes(id)).voiceInteractions=[];assert.throws(()=>SOC.validateState(wrong),/SECURITY|VOICE_LEDGER/);
 s=security(s,{action:'observe',control:'network',observed:{available:false,active:false}});assert.equal(SOC.calculate(s).admissionSecurity.assessment.passed,false);
});
test('AC-SOC-198 rolling spend includes a live calls previous minutes and a blocked call retains already billed costs',()=>{
 let s=setup(2);s=SOC.dispatch(s,{type:'configure',id:'people',config:{wrapMinutes:0}});s=SOC.dispatch(s,{type:'workforce',command:{action:'start'}});s=SOC.dispatch(s,{type:'advance',minutes:1});s=call(s);const id=s.interactions.at(-1).id;s=SOC.dispatch(s,{type:'advance',minutes:1});assert.equal(s.ledger.at(-1).usage,1);
 const context={};vm.createContext(context);vm.runInContext(SOC.workerSource()+';globalThis.engine=SOC;',context);const cmd={type:'advance',minutes:1},next=SOC.dispatch(s,cmd),worker=context.engine.dispatch(s,cmd);assert.equal(JSON.stringify(next),JSON.stringify(worker));
 assert.equal(next.interactions.find(i=>i.id===id).outcome,'DESTINATION_WINDOW_LIMIT');assert.equal(next.ledger.at(-1).usage,0);assert.equal(next.admissionSecurity.settlements.find(x=>x.interactionId===id).cents,2);assert.equal(next.admissionSecurity.reservations.length,0);assert.equal(next.workforceOps.assignments.filter(a=>['voice','digital','wrap'].includes(a.status)).length,0);
 assert.equal(SOC.calculate(next).admissionSecurity.assessment.passed,false);assert.deepEqual(SOC.restore(JSON.stringify(next)),next);
});

test('AC-SOC-773 secured endpoint calls retain live reservations, settle once and enforce spend before the next minute',()=>{
 const endpoint=cap=>{
  let s=setup(cap);
  s=SOC.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});
  s=SOC.dispatch(s,{type:'advance',minutes:1});
  return SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'secured-endpoint',durationMinutes:3});
 };
 const context={};vm.createContext(context);vm.runInContext(SOC.workerSource()+';globalThis.engine=SOC;',context);
 for(const cap of [1000,2]){
  let s=endpoint(cap);const id=s.interactions.at(-1).id;
  assert.equal(s.interactions.at(-1).phase,'connected');
  assert.equal(s.admissionSecurity.reservations.filter(x=>x.interactionId===id).length,1);
  assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
  const cmd={type:'advance',minutes:1},saved=JSON.stringify(s);
  s=SOC.dispatch(s,cmd);assert.equal(JSON.stringify(context.engine.dispatch(JSON.parse(saved),cmd)),JSON.stringify(s));
  assert.equal(s.admissionSecurity.reservations.find(x=>x.interactionId===id).usage.length,1);
  assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
  s=SOC.dispatch(s,{type:'advance',minutes:2});
  const call=s.interactions.find(x=>x.id===id),settlements=s.admissionSecurity.settlements.filter(x=>x.interactionId===id),units=cap===2?1:3;
  assert.equal(call.phase,cap===2?'failed':'resolved');
  assert.equal(call.outcome,cap===2?'DESTINATION_WINDOW_LIMIT':'CONNECTED');
  assert.equal(settlements.length,1);assert.equal(settlements[0].cents,units*2);
  assert.equal(s.ledger.filter(x=>x.voiceInteractions?.includes(id)).length,units);
  assert.equal(s.admissionSecurity.reservations.length,0);
  const old=structuredClone(settlements[0]);s=SOC.dispatch(s,{type:'advance',minutes:1});
  assert.deepEqual(s.admissionSecurity.settlements.filter(x=>x.interactionId===id),[old]);
  assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 }
});


test('AC-SOC-803 destination policy blocks an actual unroutable public call without granting reach or admitting allowed unroutable calls',()=>{
 let s=setup();const original=JSON.stringify(s),command={type:'interact',channel:'voice',from:'alex',to:'+18005550199',caseId:'unroutable-forbidden'};
 const context={};vm.createContext(context);vm.runInContext(SOC.workerSource()+';globalThis.engine=SOC;',context);
 s=SOC.dispatch(s,command);assert.equal(JSON.stringify(context.engine.dispatch(JSON.parse(original),command)),JSON.stringify(s));
 const denied=s.interactions.at(-1);assert.equal(denied.outcome,'DESTINATION_NOT_ALLOWED');
 assert.equal(denied.phase,'failed');assert.ok(denied.trace.some(t=>t.code==='SECURITY_CALL_BLOCKED'));
 const events=s.admissionSecurity.events.filter(e=>e.kind==='call-admission'&&e.detail.interactionId===denied.id);
 assert.equal(events.length,1);assert.equal(events[0].code,'SECURITY_CALL_BLOCKED');
 assert.equal(s.admissionSecurity.reservations.length,0);assert.equal(s.admissionSecurity.admissions.length,0);assert.equal(s.admissionSecurity.settlements.length,0);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=security(s,{action:'configure',control:'destination',config:{allowedPrefixes:['+61','+18']}});s=SOC.dispatch(s,{type:'advance',minutes:1});
 s=call(s,'+18005550199','allowed-without-reach');const unrouted=s.interactions.at(-1);assert.equal(unrouted.outcome,'NO_ROUTE');
 assert.equal(s.admissionSecurity.events.filter(e=>e.detail.interactionId===unrouted.id).length,0,'an allowed destination without a route creates no admission or reservation');
 s=call(s);const routed=s.interactions.at(-1);assert.equal(s.admissionSecurity.admissions.filter(a=>a.interactionId===routed.id).length,1);
 assert.equal(s.admissionSecurity.events.filter(e=>e.kind==='call-admission'&&e.detail.interactionId===routed.id).length,1,'ordinary routable calls still admit only once');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
