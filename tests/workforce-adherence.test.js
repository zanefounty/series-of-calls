const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications'),W=require('../src/game/49-workforce');
const person=(id,skills=['service'],languages=['en'],extra={})=>({id,employer:'orchard-msp',skills,languages,shiftStart:540,shiftEnd:1020,breaks:[{start:600,end:630}],available:true,digitalConcurrency:2,entitlements:['seat-01'],...extra});
const fixture=()=>{const s=E.create();s.clock=600;s.workforceOps=W.create(s);W.advance(s);W.command(s,{action:'roster',people:[person('agent-a')]});s.clock++;W.advance(s);return s;};
const cmd=(s,action,fields={})=>W.command(s,{action,...fields});
const lane={channel:'voice',skill:'service',language:'en'};

test('AC-SOC-425 actual availability is independent of scheduled shift and break state and drives queue capacity',()=>{
 const s=fixture();assert.equal(W.inspect(s).adherence[0].scheduled,false);assert.equal(W.inspect(s).presence[0].state,'available');assert.equal(W.effectiveCapacity(s,lane).capacity,0);
 s.clock=630;W.advance(s);assert.equal(W.inspect(s).adherence[0].available,true);assert.deepEqual(W.effectiveCapacity(s,lane).people,['agent-a']);
 cmd(s,'presence',{person:'agent-a',state:'away'});assert.equal(W.inspect(s).adherence[0].scheduled,true);assert.equal(W.inspect(s).adherence[0].actual,false);assert.equal(W.effectiveCapacity(s,lane).capacity,0);
 cmd(s,'presence',{person:'agent-a',state:'offline'});assert.equal(W.inspect(s).presence[0].state,'offline');cmd(s,'presence',{person:'agent-a',state:'available'});assert.equal(W.effectiveCapacity(s,lane).capacity,1);
});

test('AC-SOC-426 customer staffing is externally controlled and BPO attendance authority is separately scoped',()=>{
 const s=fixture();s.workforceOps.operator='customer';assert.throws(()=>cmd(s,'presence',{person:'agent-a',state:'offline'}),/WORKFORCE_CUSTOMER_CONTROLLED/);
 s.workforceOps.operator='player';cmd(s,'agreement',{id:'configure-only',resources:['workforce'],actions:['configure'],expires:900});s.workforceOps.operator='bpo';
 assert.throws(()=>cmd(s,'presence',{person:'agent-a',state:'away'}),/WORKFORCE_DELEGATION_REQUIRED/);
 s.workforceOps.operator='player';cmd(s,'agreement',{id:'attendance-grant',resources:['workforce'],actions:['attendance'],expires:900});s.workforceOps.operator='bpo';cmd(s,'presence',{person:'agent-a',state:'away'});
 s.clock=901;assert.throws(()=>cmd(s,'presence',{person:'agent-a',state:'available'}),/WORKFORCE_DELEGATION_REQUIRED/);
});

test('AC-SOC-427 skill and language staffing forecast reports a dimension-specific capacity gap',()=>{
 const s=fixture();s.clock=630;W.advance(s);cmd(s,'arrival',{channel:'voice',count:5,skill:'billing',language:'fr'});cmd(s,'arrival',{channel:'voice',count:3,skill:'billing',language:'fr'});
 cmd(s,'staffing-forecast',{channel:'voice',skill:'billing',language:'fr',horizon:60,method:'mean'});
 const f=W.inspect(s).forecasts.at(-1);assert.equal(f.samples,2);assert.equal(f.arrivals,4);assert.equal(f.projectedCapacity,0);assert.equal(f.projectedGap,4);
 cmd(s,'arrival',{channel:'voice',count:1,skill:'service',language:'en'});cmd(s,'staffing-forecast',{channel:'voice',skill:'service',language:'en',horizon:60,method:'last-period'});
 const matched=W.inspect(s).forecasts.at(-1);assert.equal(matched.arrivals,1);assert.ok(matched.projectedCapacity>0);assert.equal(matched.projectedGap,0);
});

test('AC-SOC-428 presence and forecast save validation rejects malformed observed state and dimensions',()=>{
 const s=fixture();cmd(s,'presence',{person:'agent-a',state:'away'});cmd(s,'arrival',{channel:'digital',count:2,skill:'service',language:'en'});cmd(s,'staffing-forecast',{channel:'digital',skill:'service',language:'en',horizon:15,method:'mean'});W.validate(s);
 const badState=structuredClone(s);badState.workforceOps.actualPresence['agent-a']='on-break';assert.throws(()=>W.validate(badState),/INVALID_WORKFORCE_PRESENCE/);
 const badForecast=structuredClone(s);badForecast.workforceOps.forecasts.at(-1).language='bad language';assert.throws(()=>W.validate(badForecast),/INVALID_WORKFORCE_FORECAST/);
 const badArrival=structuredClone(s);badArrival.workforceOps.arrivals[0].language='bad language';assert.throws(()=>W.validate(badArrival),/INVALID_ARRIVAL/);
 const badGrant=structuredClone(s);badGrant.workforceOps.agreements.push({id:'bad-grant',grantor:'customer',grantee:'orchard-msp',resources:['workforce'],actions:['attendance-admin'],expires:800});assert.throws(()=>W.validate(badGrant),/INVALID_WORKFORCE_AGREEMENT/);
});

test('AC-SOC-429 reads are pure and serialized worker preserves presence, capacity and forecast behavior',()=>{
 const s=fixture();s.clock=630;W.advance(s);cmd(s,'presence',{person:'agent-a',state:'away'});cmd(s,'arrival',{channel:'voice',count:2,skill:'service',language:'en'});cmd(s,'staffing-forecast',{channel:'voice',skill:'service',language:'en',horizon:30,method:'mean'});
 const before=JSON.stringify(s.workforceOps),fingerprint=W.fingerprint(s),inspection=W.inspect(s);assert.deepEqual(W.inspect(s),inspection);assert.equal(JSON.stringify(s.workforceOps),before);assert.deepEqual(W.fingerprint(s),fingerprint);
 assert.deepEqual(W.sourceIds,['uc-new:domain:workforce','uc-new:domain:journeys','uc-new:domain:pricing','uc-new:domain:commercial-roles']);
 const box={};vm.createContext(box);vm.runInContext(W.source()+';globalThis.W=SOC_WORKFORCE;',box);assert.deepEqual(JSON.parse(JSON.stringify(box.W.inspect(structuredClone(s)))),inspection);assert.equal(box.W.effectiveCapacity(structuredClone(s),lane).capacity,0);assert.doesNotThrow(()=>box.W.validate(structuredClone(s)));assert.deepEqual(JSON.parse(JSON.stringify(box.W.sourceIds)),W.sourceIds);
});

test('AC-SOC-430 pre-attendance saves keep their historical available flag as the fallback observation',()=>{
 const s=fixture();delete s.workforceOps.actualPresence;W.validate(s);assert.equal(W.inspect(s).presence[0].state,'available');assert.deepEqual(W.effectiveCapacity(s,lane).people,[]);
 s.clock=630;W.advance(s);assert.deepEqual(W.effectiveCapacity(s,lane).people,['agent-a']);
});
