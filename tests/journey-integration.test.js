const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');

const dispatch=(s,type,payload={})=>SOC.dispatch(s,{type,...payload});
function setup(integration='cases'){
 let s=SOC.create();
 s=dispatch(s,'channels',{command:{action:'start'}});
 s=dispatch(s,'configure',{id:'engage',config:{template:'service-outside-window',botResolves:true}});
 s=dispatch(s,'advance',{minutes:2});
 for(const channel of SOC.channels.channels)s=dispatch(s,'channels',{command:{action:'observe',channel,authenticated:true,providerAvailable:true,fault:null}});
 s=dispatch(s,'channels',{command:{action:'permission',tenant:'orchard-repairs',person:'alex',channel:'chatterleaf',purpose:'service',granted:true,expiresAt:null}});
 s=dispatch(s,'interact',{channel:'message',from:'alex',to:'service',caseId:'case-a',account:'chatterleaf',purpose:'service',template:'service-outside-window'});
 s=dispatch(s,'advance',{minutes:2});
 assert.equal(s.interactions.at(-1).phase,'resolved');
 s=dispatch(s,'outcomes',{command:{action:'start'}});
 s=dispatch(s,'outcomes',{command:{action:'configure',config:{supportedIntents:['billing-question'],taskIntegrations:[{intent:'billing-question',integration,evidence:['case-updated']}],handoffDestination:'service',maxAttempts:3,repeatInterval:1,repeatEffort:1,contextLossEffort:2,maxRepeatEmissionsPerAdvance:2}}});
 s=dispatch(s,'advance',{minutes:1});
 s=dispatch(s,'outcomes',{command:{action:'need',tenant:'orchard-repairs',person:'alex',caseId:'case-a',purpose:'billing support',intent:'billing-question',permittedChannels:['message']}});
 return s;
}
function beginAttempt(s,needId='need-1',caseId='case-a',extra={}){
 return dispatch(s,'interact',{channel:'message',from:'alex',to:'service',caseId,account:'chatterleaf',purpose:'service',template:'service-outside-window',needId,...extra});
}
function task(s,interactionId,values={}){
 return dispatch(s,'outcomes',{command:{action:'task-result',needId:'need-1',interactionId,intent:'billing-question',integration:'cases',succeeded:false,botAnswered:true,evidence:[],...values}});
}

test('AC-SOC-093 consent is checked before each acceptance and an accepted send keeps its delivery receipt after revocation',()=>{
 let queued=setup();queued=beginAttempt(queued);const blocked=queued.interactions.at(-1).id;
 queued=dispatch(queued,'channels',{command:{action:'permission',tenant:'orchard-repairs',person:'alex',channel:'chatterleaf',purpose:'service',granted:false,expiresAt:null}});
 queued=dispatch(queued,'advance',{minutes:1});assert.equal(queued.operations.jobs.find(j=>j.interaction===blocked).status,'failed');assert.equal(queued.channels.acceptances.some(a=>a.interaction===blocked),false);assert.equal(queued.outcomes.needs[0].attempts.length,1);assert.equal(queued.outcomes.needs[0].repeat.status,'pending');
 let s=setup();s=beginAttempt(s);const id=s.interactions.at(-1).id;
 s=dispatch(s,'advance',{minutes:1});assert.equal(s.operations.jobs.find(j=>j.interaction===id).status,'accepted');
 s=dispatch(s,'channels',{command:{action:'permission',tenant:'orchard-repairs',person:'alex',channel:'chatterleaf',purpose:'service',granted:false,expiresAt:null}});
 s=dispatch(s,'configure',{id:'identity',config:{identities:['bea'],entitled:['bea']}});
 s=dispatch(s,'advance',{minutes:1});assert.equal(s.operations.jobs.find(j=>j.interaction===id).status,'delivered');
 assert.equal(s.channels.receipts.find(r=>r.interaction===id).kind,'delivery');assert.equal(s.interactions.find(i=>i.id===id).needOutcome.reason,'IDENTITY_NOT_VERIFIED');
 s=dispatch(s,'channels',{command:{action:'read',conversation:s.channels.receipts.at(-1).conversation,interaction:id,eventId:'read-event-1'}});
 assert.equal(s.channels.receipts.filter(r=>r.kind==='read'&&r.interaction===id).length,1);
});

test('AC-SOC-094 business purpose stays separate from channel purpose; bot containment is unresolved and repeat reserves a new usage token',()=>{
 let s=setup();s=dispatch(s,'business',{command:{action:'start'}});s=dispatch(s,'business',{command:{action:'order',offer:'messaging',quantity:100,unit:'message',currency:'AUD',resources:['messages','engage','cases'],sell:true}});s=dispatch(s,'advance',{minutes:2});
 let initialUsage=s.business.contracts[0].usage;s=beginAttempt(s);let i=s.interactions.at(-1);s=task(s,i.id);s=dispatch(s,'advance',{minutes:2});
 i=s.interactions.find(x=>x.id===i.id);assert.equal(i.phase,'resolved');assert.equal(i.needOutcome.reason,'BOT_CONTAINED_TASK_FAILED');assert.ok(i.trace.some(t=>t.stage==='customer-need'&&t.code==='BOT_CONTAINED_TASK_FAILED'&&t.customerOutcome==='unresolved'&&t.technicalSuccess===true&&t.synthetic===true));
 assert.equal(i.purpose,'service');assert.equal(s.outcomes.needs[0].purpose,'billing support');assert.equal(SOC.calculate(s).resolved,1); // the seed interaction is resolved; this attempt is not a customer resolution.
 assert.equal(s.outcomes.needs[0].status,'open');
 s=dispatch(s,'advance',{minutes:1});const repeat=s.interactions.find(x=>x.id!==i.id&&x.needId===i.needId);
 assert.ok(repeat);assert.equal(repeat.caseId,i.caseId);assert.equal(repeat.from,i.from);assert.equal(repeat.purpose,'service');assert.match(repeat.usageToken,/^[a-z][a-z0-9-]{0,63}$/);assert.notEqual(repeat.usageToken,i.usageToken);
 s=dispatch(s,'advance',{minutes:1});assert.equal(s.business.contracts[0].usage-initialUsage,2);assert.equal(s.operations.jobs.filter(j=>j.status==='accepted'||j.status==='delivered').length,3);
});

test('AC-SOC-095 bot-resolved transport is not task success; supported task evidence can resolve the need',()=>{
 let s=setup();s=beginAttempt(s);let i=s.interactions.at(-1);s=task(s,i.id,{succeeded:true,evidence:['case-updated']});s=dispatch(s,'advance',{minutes:2});
 i=s.interactions.find(x=>x.id===i.id);assert.equal(i.needOutcome.outcome,'resolved');assert.equal(s.outcomes.needs[0].status,'resolved');
 assert.equal(SOC.calculate(s).outcomes.metrics.pending,0);
});

test('AC-SOC-096 outcomes reject forged case, tenant, person and non-live task result bindings',()=>{
 let s=setup();
 assert.throws(()=>beginAttempt(s,'need-1','case-a',{from:'bea'}),/CASE_IDENTITY_MISMATCH|OUTCOMES_NEED_IDENTITY_MISMATCH/);
 assert.throws(()=>beginAttempt(s,'need-1','case-a',{from:'intruder'}),/OUTCOMES_NEED_IDENTITY_MISMATCH/);
 assert.throws(()=>SOC.dispatch(s,{type:'outcomes',command:{action:'need',tenant:'canopy-group',person:'alex',caseId:'case-a',purpose:'billing support',intent:'billing-question',permittedChannels:['message']}}),/OUTCOMES_CASE_IDENTITY_MISMATCH/);
 assert.throws(()=>task(s,'untracked-interaction'),/OUTCOMES_LIVE_INTERACTION_REQUIRED/);
 s=beginAttempt(s);assert.throws(()=>beginAttempt(s),/OUTCOMES_NEED_BUSY/);
});

test('AC-SOC-097 a successful result cannot resolve when its configured task resource is unavailable',()=>{
 let s=setup();s=beginAttempt(s);const i=s.interactions.at(-1);s=task(s,i.id,{succeeded:true,evidence:['case-updated']});s=dispatch(s,'advance',{minutes:1});
 assert.equal(s.operations.jobs.find(j=>j.interaction===i.id).status,'accepted');s=dispatch(s,'configure',{id:'cases',config:{enabled:false}});s=dispatch(s,'advance',{minutes:1});
 const done=s.interactions.find(x=>x.id===i.id);assert.equal(done.needOutcome.reason,'TASK_INTEGRATION_UNAVAILABLE');assert.equal(s.outcomes.needs[0].status,'open');assert.equal(s.outcomes.taskResults.length,1);
 let wrongKind=setup('carrier');wrongKind=beginAttempt(wrongKind);const j=wrongKind.interactions.at(-1);wrongKind=task(wrongKind,j.id,{integration:'carrier',succeeded:true,evidence:['case-updated']});wrongKind=dispatch(wrongKind,'advance',{minutes:2});
 assert.equal(wrongKind.interactions.find(x=>x.id===j.id).needOutcome.reason,'TASK_INTEGRATION_UNAVAILABLE');
 let unknown=setup('not-a-resource');unknown=beginAttempt(unknown);const k=unknown.interactions.at(-1);unknown=task(unknown,k.id,{integration:'not-a-resource',succeeded:true,evidence:['case-updated']});unknown=dispatch(unknown,'advance',{minutes:2});
 assert.equal(unknown.interactions.find(x=>x.id===k.id).needOutcome.reason,'TASK_INTEGRATION_UNAVAILABLE');
});

test('AC-SOC-098 worker, save validation, and pure calculations preserve outcome and channel state',()=>{
 let s=setup();s=beginAttempt(s);const before=JSON.stringify(s);SOC.calculate(s);assert.equal(JSON.stringify(s),before);
 const restored=SOC.restore(JSON.stringify(s));assert.deepEqual(restored.outcomes.needs,s.outcomes.needs);
 const tampered=structuredClone(s);tampered.interactions.at(-1).needOutcome={outcome:'resolved',reason:'TASK_SUCCESS_CONFIRMED',attemptId:'made-up'};
 assert.throws(()=>SOC.validateState(tampered),/INVALID_INTERACTION_NEED_OUTCOME/);
 const clock=structuredClone(s);clock.channels.clock++;
 assert.throws(()=>SOC.validateState(clock),/CHANNEL_OPERATIONS_REQUIRED/);
 const worker={};vm.createContext(worker);vm.runInContext(SOC.workerSource()+';globalThis.SOC_WORKER=SOC;',worker);
 const result=worker.SOC_WORKER.calculate(structuredClone(s));assert.equal(result.outcomes.needs[0].id,'need-1');
 const workerNext=worker.SOC_WORKER.dispatch(structuredClone(s),{type:'advance',minutes:1}),mainNext=SOC.dispatch(structuredClone(s),{type:'advance',minutes:1});assert.equal(JSON.stringify(workerNext),JSON.stringify(mainNext));
});
