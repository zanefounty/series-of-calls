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
