const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),E=require('../src/game/55-communications');
const contact=(s,command)=>E.dispatch(s,{type:'contact',command}),tick=(s,minutes=1)=>E.dispatch(s,{type:'advance',minutes});
const cfg=(s,config)=>tick(contact(s,{action:'configure',config})),res=(s,id,config)=>tick(E.dispatch(s,{type:'configure',id,config}));
const start=()=>tick(contact(E.create(),{action:'start'}));
const call=(s,extra={})=>E.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'case-one',...extra});
test('AC-SOC-039 IVR choices select language and skill while provisioning preserves prior effective menus',()=>{
 let s=cfg(start(),{ivr:true});assert.equal(call(s).interactions[0].outcome,'IVR_CHOICE_REQUIRED');
 s=res(s,'people',{people:2});s=call(s,{choice:'2'});s=tick(s);assert.equal(s.interactions[0].phase,'queued');assert.ok(s.interactions[0].trace.some(t=>t.code==='SKILL_OR_SHIFT'));
 s=res(s,'people',{languages:['en','ja']});assert.equal(s.interactions[0].phase,'handling');s=tick(s,4);assert.equal(s.interactions[0].phase,'resolved');
 const menu=[{digit:'1',queue:'missing',skill:'service',language:'en'}];s=cfg(s,{menu});assert.equal(s.contact.provisioning.status,'failed');assert.equal(s.contact.effective.menu[0].queue,'service');
 assert.throws(()=>cfg(s,{menu:[menu[0],menu[0]]}),/DUPLICATE_IVR_CHOICE/);
});
test('AC-SOC-040 callbacks release the original session and preserve identity with bounded retries',()=>{
 let s=call(start());const root=s.interactions[0].id;s=contact(s,{action:'callback',interaction:root});assert.equal(s.interactions[0].outcome,'CALLBACK_SCHEDULED');
 assert.throws(()=>contact(s,{action:'callback',interaction:root}),/CALLBACK_UNAVAILABLE|CALLBACK_ALREADY_REQUESTED/);
 s=res(s,'people',{people:2});s=tick(s,8);assert.equal(s.contact.callbacks[0].status,'complete');assert.equal(s.contact.callbacks[0].attempts,1);
 const latest=s.interactions.at(-1);assert.equal(latest.callbackOf,root);assert.equal(latest.caseId,'case-one');assert.equal(latest.context,true);
 let fail=cfg(start(),{callbackAttempts:2,callbackDelay:1});fail=res(fail,'service',{maxWait:1});fail=call(fail);fail=contact(fail,{action:'callback',interaction:fail.interactions[0].id});fail=tick(fail,10);assert.equal(fail.contact.callbacks[0].status,'failed');assert.equal(fail.contact.callbacks[0].attempts,2);
});
test('AC-SOC-041 warm transfers require another agent and preserve source wrap-up load',()=>{
 let s=res(start(),'people',{people:1,entitlements:2,wrapMinutes:3});s=E.dispatch(s,{type:'add',id:'other-queue',kind:'queue'});s=tick(s);s=call(s);s=tick(s);const interaction=s.interactions[0].id;
 assert.throws(()=>contact(s,{action:'transfer',interaction,target:'other-queue',mode:'warm'}),/WARM_TRANSFER_NO_AGENT/);
 s=res(s,'people',{people:2});s=contact(s,{action:'transfer',interaction,target:'other-queue',mode:'warm'});assert.equal(s.interactions[0].phase,'handling');assert.equal(s.interactions[0].destination,'other-queue');assert.equal(s.contact.wraps.length,1);assert.equal(s.interactions[0].context,true);
 s=call(s,{caseId:'case-two'});s=tick(s);assert.equal(s.interactions[1].phase,'queued','transferring agent still wraps while recipient handles');
 s=tick(s,2);assert.equal(s.interactions[1].phase,'handling');assert.equal(s.contact.wraps.length,0);
});
test('AC-SOC-042 cold transfers reset queue waiting, retain the journey and change required skill',()=>{
 let s=res(start(),'people',{people:1});s=E.dispatch(s,{type:'add',id:'special-queue',kind:'queue',config:{skill:'specialist',maxWait:2}});s=tick(s);s=call(s);s=tick(s);const interaction=s.interactions[0].id;
 s=contact(s,{action:'transfer',interaction,target:'special-queue',mode:'cold'});assert.equal(s.interactions[0].requiredSkill,'specialist');assert.equal(s.interactions[0].phase,'queued');assert.equal(s.interactions[0].caseId,'case-one');
 s=res(s,'people',{skills:['service','specialist']});assert.equal(s.interactions[0].phase,'handling');assert.ok(s.interactions[0].trace.some(t=>t.code==='TRANSFER'));
 assert.throws(()=>contact(s,{action:'transfer',interaction,target:'special-queue',mode:'cold'}),/TRANSFER_LOOP/);
});
test('AC-SOC-043 queue priority and quality assessment remain independent of delivery success',()=>{
 let s=res(start(),'people',{people:1,digitalConcurrency:1});s=cfg(s,{priority:'voice-first'});s=call(s,{channel:'message'});s=call(s,{caseId:'case-two'});s=tick(s);assert.equal(s.interactions[1].phase,'handling');assert.equal(s.interactions[0].phase,'queued');
 s=tick(s,4);const interaction=s.interactions[1].id;assert.equal(s.interactions[1].phase,'resolved');
 assert.throws(()=>contact(s,{action:'review',interaction,role:'unqualified',score:100,resolved:true}),/INVALID_QUALITY_REVIEW/);
 s=contact(s,{action:'review',interaction,role:'supervisor',score:60,resolved:true});assert.equal(E.assess(s).checks.quality,false);assert.equal(s.interactions[1].phase,'resolved');
 s=contact(s,{action:'review',interaction,role:'supervisor',score:90,resolved:true});assert.equal(E.assess(s).checks.quality,true);assert.equal(s.contact.reviews.length,1);
});
test('AC-SOC-044 scheduled contact work survives reload and agrees with worker execution',()=>{
 let s=call(start());s=contact(s,{action:'callback',interaction:s.interactions[0].id});s=res(s,'people',{people:2});s=E.restore(JSON.stringify(s));
 const before=JSON.stringify(s);E.calculate(s);assert.equal(JSON.stringify(s),before);let result;const ctx={postMessage:r=>result=r};vm.createContext(ctx);vm.runInContext(E.workerSource(),ctx);ctx.onmessage({data:{id:8,state:s,command:{type:'advance',minutes:9}}});assert.deepEqual(JSON.parse(JSON.stringify(result.state)),tick(s,9));
 const bad=structuredClone(s);bad.contact.callbacks[0].limit=99;assert.throws(()=>E.restore(JSON.stringify(bad)),/INVALID_CALLBACK_STATE/);
});
