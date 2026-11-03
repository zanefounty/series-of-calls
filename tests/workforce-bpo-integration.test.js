const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications'),W=require('../src/game/49-workforce');
const dispatch=(s,c)=>E.dispatch(s,c);

test('AC-SOC-366 dispatch provisioning pauses queued work during a break and resumes it after break end',()=>{
 let s=E.create();s=dispatch(s,{type:'workforce',command:{action:'start'}});
 s=dispatch(s,{type:'workforce',command:{action:'roster',people:[{id:'agent-a',employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,breaks:[{start:1,end:3}],available:true,digitalConcurrency:2,entitlements:['seat-01']}]}});
 s=dispatch(s,{type:'advance',minutes:1});assert.equal(s.clock,1);assert.equal(W.inspect(s).adherence[0].onBreak,true);
 s=dispatch(s,{type:'interact',channel:'message',from:'alex',to:'service',caseId:'break-queue',language:'en'});
 assert.equal(s.interactions[0].phase,'queued');s=dispatch(s,{type:'advance',minutes:1});
 assert.equal(s.interactions[0].phase,'queued');assert.equal(W.inspect(s).adherence[0].available,false);
 s=dispatch(s,{type:'advance',minutes:1});assert.equal(s.clock,3);assert.equal(s.interactions[0].phase,'handling');assert.equal(s.interactions[0].agent,'agent-a');
 const restored=E.restore(JSON.stringify(s));assert.deepEqual(restored,s);
 const worker={};vm.createContext(worker);vm.runInContext(W.source()+'globalThis.W=SOC_WORKFORCE;',worker);
 assert.deepEqual(JSON.parse(JSON.stringify(worker.W.inspect(restored))),W.inspect(restored));
});
