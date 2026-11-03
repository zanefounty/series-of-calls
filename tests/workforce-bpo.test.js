const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/game/55-communications'),W=require('../src/game/49-workforce');
const person=(id,extra={})=>({id,employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,breaks:[],available:true,digitalConcurrency:2,entitlements:['seat-01'],...extra});
const fixture=()=>{const s=E.create();s.clock=600;s.workforceOps=W.create(s);W.advance(s);return s;};
const cmd=(s,action,fields={})=>W.command(s,{action,...fields});
const provision=(s,people)=>{cmd(s,'roster',{people});s.clock++;W.advance(s);};

test('AC-SOC-363 workforce breaks reduce scheduled availability while preserving actual attendance state',()=>{
 const s=fixture();provision(s,[person('agent-a',{shiftStart:540,shiftEnd:1020,breaks:[{start:600,end:630}]})]);
 const view=W.inspect(s).adherence[0];assert.deepEqual(view,{person:'agent-a',scheduled:false,actual:true,available:false,onBreak:true});
 assert.equal(W.allocation(s,{channel:'voice',skill:'service',language:'en'}).capacity,0);
 s.clock=630;W.advance(s);assert.equal(W.inspect(s).adherence[0].available,true);
 assert.deepEqual(W.allocation(s,{channel:'voice',skill:'service',language:'en'}).people,['agent-a']);
});

test('AC-SOC-364 operator BPO staffing authority is action and expiry scoped, with recovery after a valid grant',()=>{
 const s=fixture();cmd(s,'agreement',{id:'coach-only',resources:['workforce'],actions:['coach'],expires:700});s.workforceOps.operator='bpo';
 assert.throws(()=>cmd(s,'roster',{people:[person('agent-a')]}),/WORKFORCE_DELEGATION_REQUIRED/);
 assert.throws(()=>cmd(s,'coach',{person:'agent-a',skill:'billing',minutes:2,costCents:10}),/UNKNOWN_WORKFORCE_PERSON/);
 s.workforceOps.operator='player';cmd(s,'agreement',{id:'staffing',resources:['workforce'],actions:['configure'],expires:700});s.workforceOps.operator='bpo';
 assert.doesNotThrow(()=>cmd(s,'roster',{people:[person('agent-a')]}));
 s.clock=701;assert.throws(()=>cmd(s,'roster',{people:[]}),/WORKFORCE_DELEGATION_REQUIRED/);
});

test('AC-SOC-365 break schedules and adherence survive import validation and worker source execution',()=>{
 const s=fixture();provision(s,[person('agent-a',{breaks:[{start:720,end:750}]})]);W.validate(s);
 const bad=structuredClone(s);bad.workforceOps.roster.desired[0].breaks=[{start:740,end:730}];assert.throws(()=>W.validate(bad),/INVALID_WORKFORCE_PERSON/);
 const overlap=structuredClone(s);overlap.workforceOps.roster.desired[0].breaks=[{start:700,end:730},{start:720,end:750}];assert.throws(()=>W.validate(overlap),/INVALID_WORKFORCE_PERSON/);
 const offShift=structuredClone(s);offShift.workforceOps.roster.desired[0].shiftStart=540;offShift.workforceOps.roster.desired[0].shiftEnd=1020;offShift.workforceOps.roster.desired[0].breaks=[{start:1020,end:1080}];assert.throws(()=>W.validate(offShift),/INVALID_WORKFORCE_PERSON/);
 const copy=structuredClone(s);copy.clock=725;W.advance(copy);const worker={};require('node:vm').runInNewContext(W.source()+'globalThis.W=SOC_WORKFORCE',worker);
 assert.deepEqual(JSON.parse(JSON.stringify(worker.W.inspect(copy).adherence)),W.inspect(copy).adherence);
});
