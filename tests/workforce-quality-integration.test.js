const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {SOC,apply,send,quality,tick,base,record,failedRecord,interaction,recording,order,pending,ready,review,high,low,journey}=require('./lib/workforce-quality-fixture');
// REQ-98ba1bedb8589fa1 / REQ-ef684c98bb36340a / REQ-5a5e46aedc11c26c.
// Positive histories are exclusively public SOC.dispatch commands. Cloned saves below are negative import probes.
function rejects(s,command,pattern=/QUALITY|RECORD|REVIEW|AUTHOR|DELEGATION|CONTRACT/){const before=JSON.stringify(s);assert.throws(()=>SOC.dispatch(s,command),pattern);assert.equal(JSON.stringify(s),before,'rejection is atomic');}
const reviewCommand=(s,fields={})=>({type:'workforce-quality',command:{action:'review',interactionId:interaction(s).id,reviewer:'supervisor',scores:{...high},...fields}});
const charges=s=>s.business.qualityCharges||[];
const worker=(s,command)=>{let result;const ctx={postMessage:x=>result=x};vm.createContext(ctx);vm.runInContext(SOC.workerSource(),ctx);ctx.onmessage({data:{id:731,state:s,command}});assert.equal(result.error,undefined);return JSON.parse(JSON.stringify(result.state));};

test('recorded quality review uses actual call case agent and recording evidence with one typed paired charge',()=>{
 let s=ready();const call=structuredClone(interaction(s)),media=structuredClone(recording(s)),assignment=s.workforceOps.assignments.find(a=>a.interaction===call.id);assert.equal(call.phase,'resolved');assert.equal(call.agent,'agent-01');assert.equal(assignment.status,'complete');assert.ok(call.records.includes(media.id));
 const before=JSON.stringify({interaction:call,record:media,roster:s.workforceOps.roster});s=review(s);assert.equal(s.workforceQuality.reviews.length,1);const reviewed=s.workforceQuality.reviews[0];assert.equal(reviewed.total,100);assert.equal(reviewed.passed,true);assert.equal(reviewed.caseId,call.caseId);assert.equal(reviewed.interactionId,call.id);assert.equal(reviewed.agent.id,assignment.person);assert.equal(reviewed.agent.assignmentId,assignment.id);assert.equal(reviewed.recording.id,media.id);assert.equal(charges(s).length,1);assert.equal(charges(s)[0].cents,100);assert.equal(charges(s)[0].costCents,50);assert.equal(charges(s)[0].unit,'quality-review');
 assert.equal(JSON.stringify({interaction:interaction(s),record:recording(s),roster:s.workforceOps.roster}),before);assert.equal(s.workforceOffers,undefined,'quality offer does not imply WFM');assert.ok(s.information.audit.some(e=>e.code==='RECORD_READ'&&e.record===media.id));
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('manual contact quality remains a valid uncharged alternative without recording or the optional offer',()=>{
 let s=record(base({recording:false}));assert.equal(s.records.length,0);assert.ok(['resolved','failed'].includes(interaction(s).phase));
 s=send(s,'contact',{action:'review',interaction:interaction(s).id,role:'supervisor',score:100,resolved:true});assert.equal(s.contact.reviews.length,1);assert.equal(s.workforceQuality,undefined);assert.equal(charges(s).length,0);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('review rejects caller totals, unknown evidence and unauthorized reviewer without charges or mutation',()=>{
 const s=ready();for(const fields of [{total:100},{passed:true},{recordingId:recording(s).id},{caseId:'pretend'},{agent:'agent-02'},{reviewer:'outsider'},{interactionId:'foreign-interaction'},{scores:{...high,opening:6}},{scores:{...high,extra:5}}])rejects(s,reviewCommand(s,fields));assert.equal(charges(s).length,0);
 const unrecorded=ready(tick(apply(record(base({recording:false})),{type:'configure',id:'recorder',config:{enabled:true}})));
 assert.equal(recording(unrecorded),undefined);rejects(unrecorded,reviewCommand(unrecorded));
});

test('integration must be effective observed tested and current before review and supports explicit recovery',()=>{
 let s=pending();rejects(s,reviewCommand(s));s=tick(s);s=quality(s,'observe-integration',{supplierAvailable:false,applicationAvailable:true});s=quality(s,'test-integration');rejects(s,reviewCommand(s));
 s=quality(s,'observe-integration',{supplierAvailable:true,applicationAvailable:true});s=quality(s,'test-integration');s=review(s);assert.equal(charges(s).length,1);
 let other=ready();const observedClock=other.clock;other=quality(other,'observe-integration',{supplierAvailable:true,applicationAvailable:true});assert.equal(other.clock,observedClock);rejects(other,reviewCommand(other));other=quality(other,'test-integration');other=review(other);assert.equal(charges(other).length,1);
});

test('current recording readers and customer authority gate review while authorized held reads preserve hold',()=>{
 let s=ready(),id=recording(s).id;s=send(s,'information',{action:'hold',record:id,role:'supervisor',held:true});const held=structuredClone(recording(s));rejects(s,reviewCommand(s,{reviewer:'outsider'}));s=review(s);assert.deepEqual(recording(s),held);assert.equal(recording(s).held,true);assert.equal(charges(s).length,1);
 let denied=ready();denied=tick(send(denied,'information',{action:'configure',kind:'boundary',config:{readers:['auditor']}}));rejects(denied,reviewCommand(denied));assert.equal(charges(denied).length,0);denied=tick(send(denied,'information',{action:'configure',kind:'boundary',config:{readers:['supervisor']}}));denied=quality(denied,'test-integration');denied=review(denied);assert.equal(charges(denied).length,1);
 const revoked=send(ready(),'business',{action:'revoke',grant:'customer-service'});rejects(revoked,reviewCommand(revoked));assert.equal(charges(revoked).length,0);
});

test('deleted source cannot be reviewed while completed review remains historical after source removal and contract cancellation',()=>{
 let deleted=ready();deleted=send(deleted,'information',{action:'remove',record:recording(deleted).id,role:'supervisor'});assert.equal(recording(deleted).deleted,true);rejects(deleted,reviewCommand(deleted));assert.equal(charges(deleted).length,0);
 let completed=review(ready());const history=structuredClone(completed.workforceQuality.reviews),bill=structuredClone(charges(completed));completed=send(completed,'information',{action:'remove',record:recording(completed).id,role:'supervisor'});completed=send(completed,'business',{action:'cancel',contract:completed.business.contracts.find(c=>c.offer==='queueberry-quality').id});assert.deepEqual(completed.workforceQuality.reviews,history);assert.deepEqual(charges(completed),bill);assert.deepEqual(SOC.restore(JSON.stringify(completed)),completed);
});

test('low score recommends coaching only and explicit supersession preserves prior review and charges each completed review once',()=>{
 let s=ready();const before=structuredClone(s.workforceOps);s=review(s,{scores:{...low}});assert.deepEqual(s.workforceOps,before,'quality cannot train, staff or change availability');assert.equal(s.workforceQuality.reviews.length,1);assert.equal(charges(s).length,1);
 const first=structuredClone(s.workforceQuality.reviews[0]);assert.equal(first.total,50);assert.equal(first.passed,false);assert.equal(first.recommendation.agentId,'agent-01');rejects(s,reviewCommand(s,{scores:{...low}}));assert.equal(s.workforceQuality.reviews.length,1);assert.equal(charges(s).length,1);
 rejects(s,reviewCommand(s,{scores:{...high}}));s=review(s,{scores:{...high},supersedeReason:'Supervisor checked the original rubric evidence again'});assert.equal(s.workforceQuality.reviews.length,2);assert.deepEqual(s.workforceQuality.reviews[0],first);assert.equal(charges(s).length,2);
 s=send(s,'workforce',{action:'coach',person:'agent-01',skill:'quality-practice',minutes:3,costCents:120});assert.equal(s.workforceOps.coaching.at(-1).status,'in-progress');assert.ok(!s.workforceOps.roster.effective.find(p=>p.id==='agent-01').skills.includes('quality-practice'));s=tick(s,3);assert.equal(s.workforceOps.coaching.at(-1).status,'complete');assert.ok(s.workforceOps.roster.effective.find(p=>p.id==='agent-01').skills.includes('quality-practice'));assert.deepEqual(s.workforceQuality.reviews[0],first);
});

test('quality review worker state and pure inspection agree and public fixture replays without state injection',()=>{
 let s=ready(),command=reviewCommand(s);assert.deepEqual(worker(s,command),SOC.dispatch(s,command));s=review(s);const before=JSON.stringify(s);SOC.calculate(s);SOC.workforceQuality.inspect(s.workforceQuality,s);SOC.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 for(const variant of ['success','low-score','integration-recovery']){const f=journey({variant});assert.deepEqual(f.commands.reduce(SOC.dispatch,SOC.create(f.options)),f.expectedState);}
});

test('import rejects forged quality lineage computed totals and missing or contradictory charge ledger proof',()=>{
 const complete=review(ready());assert.deepEqual(SOC.restore(JSON.stringify(complete)),complete);
 const mutations=[
  s=>{s.workforceQuality.reviews[0].interactionId='foreign-call';},
  s=>{s.workforceQuality.reviews[0].caseId='foreign-case';},
  s=>{s.workforceQuality.reviews[0].recording.id='foreign-record';},
  s=>{s.workforceQuality.reviews[0].total=0;},
  s=>{s.workforceQuality.reviews[0].scores.opening=0;},
  s=>{s.workforceQuality.reviews[0].agent.personSnapshot.skills=['invented-skill'];},
  s=>{s.workforceQuality.reviews[0].testId='quality-test-999';},
  s=>{s.workforceQuality.reviews[0].observationId='quality-observation-999';},
  s=>{s.workforceQuality.integration.observations[0].supplierAvailable=false;},
  s=>{s.workforceQuality.integration.tests[0].testedAt=s.clock+1;},
  s=>{s.business.qualityCharges[0].cents=1;},
  s=>{s.business.ledger.find(x=>x.id===s.business.qualityCharges[0].entryId).cents=1;},
  s=>{s.business.ledger=s.business.ledger.filter(x=>x.id!==s.business.qualityCharges[0].costEntryId);},
  s=>{s.business.ledgerPrunedThrough=Number(s.business.qualityCharges[0].costEntryId.slice(6));s.business.ledger=s.business.ledger.filter(x=>x.id!==s.business.qualityCharges[0].costEntryId);},
  s=>{delete s.workforceQuality;},
  s=>{s.business.contracts.find(c=>c.offer==='queueberry-quality').price=1;},
  s=>{s.business.contracts.find(c=>c.offer==='queueberry-quality').quantity=2;},
  s=>{s.business.contracts.find(c=>c.offer==='queueberry-quality').sell=false;},
  s=>{delete s.workforceQuality;delete s.business.qualityCharges;}
 ];
 for(const [index,mutate] of mutations.entries()){const bad=structuredClone(complete);mutate(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_|QUALITY|REVIEW/,'tamper index '+index);}
});

test('completed quality charge remains valid after genuine public business ledger pruning',()=>{
 let s=review(ready());const history=structuredClone(s.workforceQuality.reviews),receipt=structuredClone(charges(s)[0]);
 s=send(s,'business',{action:'loan',cents:1001});const loan=s.business.loans.at(-1).id;for(let n=0;n<1001;n++)s=send(s,'business',{action:'repay',loan,cents:1});
 assert.equal(s.business.ledger.length,1000);assert.ok(s.business.ledgerPrunedThrough>=Number(receipt.costEntryId.slice(6)));assert.ok(!s.business.ledger.some(x=>x.id===receipt.entryId));assert.deepEqual(charges(s),[receipt]);assert.deepEqual(s.workforceQuality.reviews,history);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('ordinary retention deletes an unheld recording while authorized held expired recording remains reviewable',()=>{
 let s=record(base({business:false})),heldId=recording(s).id;s=send(s,'information',{action:'hold',record:heldId,role:'supervisor',held:true});s=record(s,'quality-unheld');const unheldId=recording(s).id,expires=s.records.find(r=>r.id===unheldId).expiresAt;
 s=tick(s,expires-s.clock+1);const held=s.records.find(r=>r.id===heldId),unheld=s.records.find(r=>r.id===unheldId);assert.ok(s.clock>held.expiresAt);assert.equal(held.held,true);assert.equal(held.deleted,false);assert.equal(unheld.deleted,true);
 s=ready(s);const heldInteraction=s.records.find(r=>r.id===heldId).interaction;rejects(s,reviewCommand(s));s=review(s,{interactionId:heldInteraction});assert.equal(charges(s).length,1);assert.equal(s.records.find(r=>r.id===heldId).held,true);assert.equal(s.records.find(r=>r.id===heldId).deleted,false);assert.ok(s.information.audit.some(e=>e.code==='RECORD_READ'&&e.record===heldId));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('genuinely pruned interaction preserves historical quality receipt but cannot be newly reviewed from saved snapshots',()=>{
 let s=review(ready());const id=interaction(s).id,history=structuredClone(s.workforceQuality.reviews),bill=structuredClone(charges(s));
 for(let n=0;n<200;n++)s=apply(s,{type:'interact',channel:'voice',from:'unknown-caller',to:'+61255500201',caseId:'prune-'+n});
 assert.equal(s.interactions.length,200);assert.ok(!s.interactions.some(i=>i.id===id));assert.ok(s.tracePrunedThrough>=Number(id.slice('interaction-'.length)));assert.deepEqual(s.workforceQuality.reviews,history);assert.deepEqual(charges(s),bill);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);rejects(s,reviewCommand(s,{interactionId:id,supersedeReason:'A snapshot is not a new observed call'}));
 const forged=structuredClone(s);forged.tracePrunedThrough=0;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/QUALITY|REVIEW|INVALID_/);
});


test('failed assigned voice call exposes only partial captured evidence and denied consent cannot create substitute media',()=>{
 let s=failedRecord();assert.equal(interaction(s).phase,'failed');assert.equal(recording(s).captureScope,'partial');assert.ok(s.workforceOps.assignments.some(a=>a.interaction===interaction(s).id&&a.person==='agent-01'));
 s=ready(s);s=review(s);assert.equal(charges(s).length,1);assert.equal(s.workforceQuality.reviews[0].recording.captureScope,'partial');assert.equal(interaction(s).outcome,'DESTINATION_WINDOW_LIMIT');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const denied=ready(tick(apply(failedRecord(base(),{consent:false}),{type:'configure',id:'recorder',config:{consent:true}})));assert.equal(recording(denied),undefined);rejects(denied,reviewCommand(denied));assert.equal(charges(denied).length,0);
});

test('effective service generation stales quality binding and explicit reprovision preserves prior review evidence',()=>{
 let s=review(ready());const history=structuredClone(s.workforceQuality.reviews[0]),bill=structuredClone(charges(s)[0]);
 s=tick(apply(s,{type:'configure',id:'service',config:{capacity:8}}));s=record(s,'quality-after-resource-change');rejects(s,reviewCommand(s));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=quality(s,'test-integration');rejects(s,reviewCommand(s));s=quality(s,'integrate',{contractId:s.business.contracts.find(c=>c.offer==='queueberry-quality').id});s=tick(s);s=quality(s,'observe-integration',{supplierAvailable:true,applicationAvailable:true});s=quality(s,'test-integration');s=review(s);assert.equal(charges(s).length,2);assert.deepEqual(s.workforceQuality.reviews[0],history);assert.deepEqual(charges(s)[0],bill);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});


test('quality history survives real bounded same-case conversation pruning',()=>{
 let s=review(ready());const first=interaction(s).id,history=structuredClone(s.workforceQuality.reviews[0]),bill=structuredClone(charges(s)[0]);
 for(let n=0;n<30;n++)s=record(s,'quality-first');
 assert.equal(s.cases['quality-first'].interactions.length,30);assert.ok(!s.cases['quality-first'].interactions.includes(first));assert.ok(s.interactions.some(i=>i.id===first));assert.deepEqual(s.workforceQuality.reviews[0],history);assert.deepEqual(charges(s)[0],bill);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});


test('failed-call partial media cannot be imported as complete evidence by changing record and review together',()=>{
 const complete=review(ready(failedRecord()));assert.deepEqual(SOC.restore(JSON.stringify(complete)),complete);
 for(const mutate of [s=>{delete recording(s).captureScope;},s=>{delete s.workforceQuality.reviews[0].recording.captureScope;},s=>{recording(s).captureScope='complete';s.workforceQuality.reviews[0].recording.captureScope='complete';},s=>{delete recording(s).captureScope;delete s.workforceQuality.reviews[0].recording.captureScope;}]){
  const bad=structuredClone(complete);mutate(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_|QUALITY|RECORD/);
 }
});

test('four jurisdiction public quality recovery journeys retain a rejected attempt and calculate the same manual rubric',()=>{
 for(const jurisdiction of ['AU','US','JP','EU']){const f=journey({jurisdiction,variant:'integration-recovery'});assert.equal(f.rejectedAttempts.length,1);let s=SOC.create(f.options);for(let n=0;n<f.commands.length;n++){s=SOC.dispatch(s,f.commands[n]);for(const attempt of f.rejectedAttempts.filter(x=>x.afterCommandCount===n+1))rejects(s,attempt.command,new RegExp(attempt.expectedError));}assert.deepEqual(s,f.expectedState);assert.equal(s.workforceQuality.reviews[0].total,50);assert.equal(s.workforceQuality.reviews[0].passed,false);assert.equal(s.workforceOps.coaching.length,0);assert.equal(charges(s).length,1);}
});

test('quality recommendation requires separate timed coaching cost and a later manually scored recorded call',()=>{
 let s=review(ready(),{scores:{...low}});const prior=structuredClone(s.workforceQuality.reviews[0]),recommendation=prior.recommendation,skills=structuredClone(s.workforceOps.roster.effective.find(p=>p.id===recommendation.agentId).skills);
 s=send(s,'workforce',{action:'coach',person:recommendation.agentId,skill:recommendation.skill,minutes:2,costCents:100});const job=s.workforceOps.coaching.at(-1);assert.equal(job.status,'in-progress');assert.equal(job.person,recommendation.agentId);assert.equal(job.skill,recommendation.skill);assert.equal(job.due,s.clock+2);assert.ok(s.workforceOps.costEvents.some(e=>e.code==='COACHING_COST'&&e.job===job.id&&e.cents===100&&e.unit==='AUD-cent'));
 s=apply(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'quality-during-coaching'});s=tick(s);assert.equal(s.workforceOps.coaching.at(-1).status,'in-progress');assert.equal(interaction(s).agent,'agent-02','other staffed person remains eligible while recommended agent trains');assert.notEqual(interaction(s).agent,recommendation.agentId);
 s=tick(s);assert.equal(s.workforceOps.coaching.at(-1).status,'complete');assert.deepEqual(s.workforceOps.roster.effective.find(p=>p.id===recommendation.agentId).skills,skills,'known service skill does not become an invented qualification');assert.deepEqual(s.workforceQuality.reviews,[prior]);
 s=record(s,'quality-after-coaching');assert.equal(interaction(s).agent,recommendation.agentId);assert.ok(recording(s));assert.equal(s.workforceQuality.reviews.length,1,'new call does not automatically gain a quality score');s=review(s,{scores:{...high}});assert.equal(s.workforceQuality.reviews.at(-1).total,100,'new score comes from explicit manual criterion inputs');assert.equal(s.workforceQuality.reviews.at(-1).interactionId,interaction(s).id);assert.deepEqual(s.workforceQuality.reviews[0],prior);assert.equal(charges(s).length,2);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
