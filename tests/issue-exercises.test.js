const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const X=require('../src/game/40-issue-exercises');
const ready=()=>{let s=SOC.create();s=SOC.dispatch(s,{type:'advance',minutes:1});s.issueExercises=X.create(s);return s;};
const dispatch=(s,c)=>SOC.dispatch(s,c);
function runExercise(s,id){
 for(const c of X.referenceCommands(id))X.command(s,c,{dispatchRootCommand:dispatch});
 return s;
}

test('AC-SOC-149 retains source attribution, caveats and explicitly pending issue gaps',()=>{
 const s=ready(),result=X.inspect(s);
 assert.equal(result.exercises.length,2);
 assert.equal(result.exercises[0].source.id,'RES-CISCO-VOIP-002');
 assert.match(result.exercises[0].scope,/does not model blind transfer/);
 assert.equal(result.exercises[1].source.id,'voiceops-2010-12-dash-outage');
 assert.match(result.exercises[1].scope,/does not reproduce the archived provider event/);
 assert.ok(result.pending.some(x=>x.id==='RES-CISCO-VOIP-008'));
 assert.ok(result.pending.some(x=>x.id==='voiceops-2010-12-sbc-tcp-keepalive'));
});

test('AC-SOC-150 reference directional-media commands produce the modeled one-way media failure',()=>{
 const s=runExercise(ready(),'directional-media');
 const result=X.evaluate(s,'directional-media');
 const failure=s.interactions.find(i=>i.caseId==='issue-media-failure');
 assert.equal(failure.outcome,'ONE_WAY_MEDIA');
 assert.deepEqual(failure.media,{out:true,in:false});
 assert.equal(result.failureObserved,true);
});

test('AC-SOC-151 directional-media recovery requires a fresh bidirectional trace and assessment is pure',()=>{
 const s=runExercise(ready(),'directional-media'),before=JSON.stringify(s);
 assert.equal(X.evaluate(s,'directional-media').passed,true);
 assert.equal(JSON.stringify(s),before);
 const recovered=s.interactions.find(i=>i.caseId==='issue-media-recovery');
 assert.ok(recovered.trace.some(t=>t.code==='MEDIA_PATHS'&&t.out&&t.in));
 assert.equal(X.validate(s),true);
});

test('AC-SOC-152 unknown commands and out-of-order steps fail without state changes',()=>{
 const s=ready(),before=JSON.stringify(s);
 assert.throws(()=>X.command(s,{action:'step',exercise:'directional-media',step:'invent-a-fault'},{dispatchRootCommand:dispatch}),/ISSUE_EXERCISE_STEP_ORDER/);
 assert.equal(JSON.stringify(s),before);
 assert.throws(()=>X.command(s,{action:'dispatch',exercise:'directional-media',step:'disable-inbound-media',command:{type:'fault'}},{dispatchRootCommand:dispatch}),/INVALID_ISSUE_EXERCISE_COMMAND/);
 assert.equal(JSON.stringify(s),before);
 const incomplete=ready();X.command(incomplete,{action:'step',exercise:'directional-media',step:'provision-test-agents'},{dispatchRootCommand:dispatch});
 assert.throws(()=>X.command(incomplete,{action:'step',exercise:'carrier-outage-recovery',step:'provision-test-agents'},{dispatchRootCommand:dispatch}),/ISSUE_EXERCISE_RUN_INCOMPLETE/);
 X.command(incomplete,{action:'cancel',exercise:'directional-media'});
 X.command(incomplete,{action:'step',exercise:'carrier-outage-recovery',step:'provision-test-agents'},{dispatchRootCommand:dispatch});
 assert.deepEqual(incomplete.issueExercises.steps['directional-media'],['provision-test-agents']);
 const invalidHook=ready(),invalidBefore=JSON.stringify(invalidHook);
 assert.throws(()=>X.command(invalidHook,{action:'step',exercise:'directional-media',step:'provision-test-agents'},{dispatchRootCommand:root=>({...root,revision:root.revision+1,commands:[...(root.commands||[])]})}),/ISSUE_EXERCISE_PARENT_COMMAND/);
 assert.equal(JSON.stringify(invalidHook),invalidBefore);
});

test('AC-SOC-153 carrier-outage reference commands create an observed signalling failure',()=>{
 const s=ready();
 for(const c of X.referenceCommands('carrier-outage-recovery').slice(0,4))X.command(s,c,{dispatchRootCommand:dispatch});
 const assessment=X.evaluate(s,'carrier-outage-recovery');
 assert.equal(s.interactions.find(i=>i.caseId==='issue-outage-failure').outcome,'SIGNALLING_FAILED');
 assert.equal(assessment.failureObserved,true);
 assert.equal(assessment.passed,false);
});

test('AC-SOC-154 clearing the fault and making a fresh call proves carrier recovery',()=>{
 const s=runExercise(ready(),'carrier-outage-recovery');
 const result=X.evaluate(s,'carrier-outage-recovery');
 const recovered=s.interactions.find(i=>i.caseId==='issue-outage-recovery');
 assert.equal(result.passed,true);
 assert.ok(recovered.trace.some(t=>t.code==='200_OK'));
 assert.ok(recovered.trace.some(t=>t.code==='MEDIA_PATHS'&&t.out&&t.in));
 const media=runExercise(ready(),'directional-media');
 let m=dispatch(media,{type:'configure',id:'carrier',config:{mediaOut:false}});m=dispatch(m,{type:'advance',minutes:1});
 assert.equal(X.evaluate(m,'directional-media').passed,false,'current outbound-media configuration invalidates the old success');
 m=dispatch(m,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'issue-media-recovery'});
 m=dispatch(m,{type:'advance',minutes:5});
 assert.equal(m.interactions.at(-1).outcome,'ONE_WAY_MEDIA');
 assert.equal(m.interactions.at(-1).media.out,false);
 assert.equal(X.evaluate(m,'directional-media').passed,false);

 const outage=runExercise(ready(),'carrier-outage-recovery');
 let o=dispatch(outage,{type:'fault',id:'phone',fault:'OUTAGE'});
 assert.equal(X.evaluate(o,'carrier-outage-recovery').passed,false,'current endpoint fault invalidates an old recovery observation');
 o=dispatch(o,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'issue-outage-recovery'});
 assert.notEqual(o.interactions.at(-1).phase,'resolved');
 assert.ok(!o.interactions.at(-1).trace.some(t=>t.code==='200_OK'));
 assert.equal(X.evaluate(o,'carrier-outage-recovery').passed,false);
});

test('AC-SOC-155 exercise save state validates and progress fingerprint excludes root call evidence',()=>{
 const s=runExercise(ready(),'carrier-outage-recovery'),fp=X.fingerprint(s);
 const saved=structuredClone(s);assert.equal(X.validate(saved),true);
 const altered=structuredClone(s);altered.interactions[0].trace.push({at:altered.clock,stage:'test',code:'EXTRA',synthetic:true});
 assert.equal(X.fingerprint(altered),fp);
 const bad=structuredClone(s);bad.issueExercises.steps['carrier-outage-recovery'].push('invented');
 assert.throws(()=>X.validate(bad),/INVALID_ISSUE_EXERCISE_SAVE/);
 const future=structuredClone(s);future.issueExercises.startedAt=future.clock+1;
 assert.throws(()=>X.validate(future),/INVALID_ISSUE_EXERCISE_SAVE/);
 const extra=structuredClone(s);extra.issueExercises.untrusted=true;
 assert.throws(()=>X.validate(extra),/INVALID_ISSUE_EXERCISE_SAVE/);
 const playable=runExercise(ready(),'directional-media');
 for(const c of X.referenceCommands('carrier-outage-recovery'))X.command(playable,c,{dispatchRootCommand:dispatch});
 assert.equal(X.evaluate(playable,'directional-media').passed,true);
 assert.equal(X.evaluate(playable,'carrier-outage-recovery').passed,true);
 const historyCount=playable.interactions.length;
 X.command(playable,{action:'restart',exercise:'directional-media'});
 assert.equal(playable.interactions.length,historyCount);
 for(const c of X.referenceCommands('directional-media'))X.command(playable,c,{dispatchRootCommand:dispatch});
 assert.equal(X.evaluate(playable,'directional-media').passed,true);
 assert.ok(playable.interactions.length>historyCount);
});

test('AC-SOC-156 worker source serializes the same source-bounded command policy',()=>{
 const context={};vm.createContext(context);
 vm.runInContext(X.source()+'\nglobalThis.__PACK=SOC_ISSUE_EXERCISES;',context);
 assert.equal(context.__PACK.PACK,X.PACK);
 assert.deepEqual(JSON.parse(JSON.stringify(context.__PACK.referenceCommands('directional-media'))),X.referenceCommands('directional-media'));
 assert.throws(()=>context.__PACK.referenceCommands('unsupported-thread'),/ISSUE_EXERCISE_UNAVAILABLE/);
});
