const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications'),W=require('../src/game/49-workforce');
const fixture=()=>{const s=E.create();s.clock=1;s.workforceOps=W.create(s);W.advance(s);return s;};
const cmd=(s,action,fields={})=>W.command(s,{action,...fields});
const person=(id,skills,languages,extra={})=>({id,employer:'orchard-msp',skills,languages,shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:2,entitlements:[id==='agent-b'?'seat-02':'seat-01'],...extra});
const roster=(s,people)=>{cmd(s,'roster',{people});s.clock++;W.advance(s);};

test('AC-SOC-053 skill and language must belong to one available person',()=>{
 const s=fixture();roster(s,[person('agent-a',['billing'],['en']),person('agent-b',['service'],['ja'])]);
 assert.deepEqual(W.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}),{people:[],capacity:0,throughput:0,reason:'NO_SINGLE_PERSON_MATCH'});
 roster(s,[person('agent-a',['billing','service'],['en'])]);
 assert.deepEqual(W.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).people,['agent-a']);
});
test('AC-SOC-054 one person cannot take concurrent voice or wrap work; digital concurrency is per person',()=>{
 const s=fixture();roster(s,[person('agent-a',['service'],['en'])]);
 cmd(s,'admit',{request:{interaction:'call-1',channel:'voice',skill:'service',language:'en'}});
 assert.equal(W.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).capacity,0);
 cmd(s,'finish',{interaction:'call-1',wrapMinutes:2});assert.equal(W.effectiveCapacity(s,{channel:'digital',skill:'service',language:'en'}).capacity,0);
 s.clock+=2;W.advance(s);assert.equal(W.effectiveCapacity(s,{channel:'digital',skill:'service',language:'en'}).capacity,2);
 cmd(s,'admit',{request:{interaction:'chat-1',channel:'digital',skill:'service',language:'en'}});
 cmd(s,'admit',{request:{interaction:'chat-2',channel:'digital',skill:'service',language:'en'}});
 assert.equal(W.effectiveCapacity(s,{channel:'digital',skill:'service',language:'en'}).capacity,0);
});
test('AC-SOC-055 customer rosters are externally controlled; BPO needs scoped delegation',()=>{
 const s=fixture();s.workforceOps.operator='customer';
 assert.throws(()=>cmd(s,'roster',{people:[]}),/WORKFORCE_CUSTOMER_CONTROLLED/);
 s.workforceOps.operator='player';assert.throws(()=>cmd(s,'roster',{people:[],operator:'bpo'}),/WORKFORCE_DELEGATION_REQUIRED/);
 cmd(s,'agreement',{id:'staffing-agreement',resources:['workforce'],actions:['configure'],expires:100});s.workforceOps.operator='bpo';
 assert.doesNotThrow(()=>cmd(s,'roster',{people:[person('agent-a',['service'],['en'])]}));
});
test('AC-SOC-056 desired roster provisions one minute later and does not erase active assignments',()=>{
 const s=fixture();roster(s,[person('agent-a',['service'],['en']),person('agent-b',['service'],['en'])]);
 cmd(s,'admit',{request:{interaction:'call-live',channel:'voice',skill:'service',language:'en'}});
 cmd(s,'roster',{people:[person('agent-b',['service'],['en'])]});
 assert.equal(W.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).people.length,1);
 assert.equal(s.workforceOps.assignments[0].person,'agent-a');s.clock++;W.advance(s);W.validate(s);
 assert.equal(s.workforceOps.assignments[0].status,'voice');assert.deepEqual(W.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).people,['agent-b']);
});
test('AC-SOC-057 forecasts snapshot history and coaching costs time before adding skill',()=>{
 const s=fixture();roster(s,[person('agent-a',['service'],['en'])]);
 cmd(s,'arrival',{channel:'voice',count:6});cmd(s,'arrival',{channel:'voice',count:8});cmd(s,'forecast',{channel:'voice',horizon:2,method:'mean'});
 assert.equal(W.inspect(s).forecasts[0].arrivals,7);s.clock+=3;W.advance(s);assert.equal(W.inspect(s).forecasts[0].stale,true);
 cmd(s,'coach',{person:'agent-a',skill:'billing',minutes:2,costCents:125});assert.ok(W.inspect(s).costEvents.some(e=>e.code==='COACHING_COST'&&e.cents===125));
 assert.deepEqual(W.effectiveCapacity(s,{channel:'voice',skill:'billing',language:'en'}).people,[]);s.clock+=2;W.advance(s);
 assert.deepEqual(W.effectiveCapacity(s,{channel:'voice',skill:'billing',language:'en'}).people,['agent-a']);
});
test('AC-SOC-058 save validation, deterministic worker source and repeated inspection are stable',()=>{
 const s=fixture();roster(s,[person('agent-a',['service'],['en'])]);const before=JSON.stringify(s.workforceOps);
 W.inspect(s);W.inspect(s);W.allocation(s,{channel:'voice',skill:'service',language:'en'});assert.equal(JSON.stringify(s.workforceOps),before);W.validate(s);
 const bad=structuredClone(s);bad.workforceOps.roster.desired[0].skills.push('not-valid!');assert.throws(()=>W.validate(bad),/INVALID_WORKFORCE_PERSON/);
 const assigned=structuredClone(s);W.admit(assigned,{interaction:'validation-call',channel:'voice',skill:'service',language:'en'});
 const missingPerson=structuredClone(assigned);missingPerson.workforceOps.assignments[0].person='intruder';missingPerson.workforceOps.assignments[0].personSnapshot.id='intruder';missingPerson.workforceOps.assignments[0].personSnapshot.entitlements=['seat-99'];missingPerson.workforceOps.assignments[0].entitlement='seat-99';assert.throws(()=>W.validate(missingPerson),/INVALID_WORKFORCE_ASSIGNMENT/);
 const missingSeat=structuredClone(assigned);missingSeat.workforceOps.assignments[0].entitlement='seat-99';assert.throws(()=>W.validate(missingSeat),/INVALID_WORKFORCE_ASSIGNMENT/);
 const context={};vm.createContext(context);vm.runInContext(W.source()+'globalThis.W=SOC_WORKFORCE;',context);assert.deepEqual(JSON.parse(JSON.stringify(context.W.inspect(s))),W.inspect(s));
 const replay=structuredClone(s);cmd(replay,'arrival',{channel:'digital',count:4});assert.deepEqual(replay.workforceOps.arrivals.at(-1),{minute:s.clock,channel:'digital',count:4});
});
