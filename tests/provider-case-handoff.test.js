const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const demand=require('../src/game/22-provider-demand');
const handoff=require('../src/game/23-provider-case-handoff');
const copy=x=>JSON.parse(JSON.stringify(x));
// Isolated contract fixtures. Public dispatch, billing and actual workforce are coordinator tests.
function fixture(){
 const input={scenario:'smb',customerId:'customer-a',seed:73,periodIndex:0,voiceArrivals:[4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49],digitalArrivals:[5,11,17,23,29,35,41,47],caseIds:Array.from({length:24},(_,i)=>`case-${i+1}`),eligible:{socialMessaging:true,workplaceChat:false,video:false},handoffVersion:1};
 const slot=demand.plan(input).jobs.find(x=>x.handoffPreference),at=slot.arrivalAt+1;
 const i={id:'interaction-1',channel:'voice',scope:'tenant',from:'alex',tenant:'tenant-a',caseId:slot.caseId,context:true,phase:'queued',startedAt:slot.arrivalAt,usageMinutes:1,language:'en',trace:[{at:slot.arrivalAt,code:'CARRIER_PATH_ADMITTED',direction:'outbound'},{at:slot.arrivalAt,code:'ENQUEUED'}],obligations:[]};
 const child={tenant:'tenant-a',interactions:[i],cases:{[slot.caseId]:{identity:'alex',tenant:'tenant-a',interactions:[i.id]}}};
 const j={id:'job-1',customerId:'customer-a',caseId:slot.caseId,periodIndex:0,channel:'voice',arrivalAt:slot.arrivalAt,deadlineAt:slot.arrivalAt+8,interactionId:i.id,status:'pending',settled:false,voiceMinutes:0,messageCharged:false};
 const project={id:'project-1',customerId:'customer-a',productId:handoff.OPERATION_ID,operationId:handoff.OPERATION_ID,status:'complete',completedAt:1,postingId:'entry-1'};
 const s={clock:at,providerCampaign:{contentVersion:'provider-campaigns-8',caseHandoffVersion:1,seed:73,customers:[{id:'customer-a',scenario:'smb',status:'active'}],jobs:[j],projects:[project]},portfolio:{customers:[{id:'customer-a',root:child}]},business:{balance:{cash:500000}}};
 const request={action:'handoff-case',customerId:'customer-a',jobId:'job-1',connectorId:'social-messaging'};
 const hooks={customerRoot:(state,id)=>state.portfolio.customers.find(x=>x.id===id)?.root,demandPlan:()=>({at:1,request:copy(input)}),capabilityAt:(state,id,when)=>{const p=state.providerCampaign.projects[0];return {ready:when>=p.completedAt&&!(p.retirement?.effectiveAt<=when),projectId:p.id,postingId:p.postingId,deploymentId:'d-'+handoff.OPERATION_ID};},humanReady:()=>true,
 finish:(state,id,sourceId,code)=>{const i=hooks.customerRoot(state,id).interactions.find(x=>x.id===sourceId);i.phase='failed';i.outcome=code;i.finishedAt=state.clock;i.trace.push({at:state.clock,code});},
 start:(state,id,command)=>{const root=hooks.customerRoot(state,id),i={...command,id:'interaction-2',scope:'tenant',tenant:root.tenant,context:true,phase:'queued',startedAt:state.clock,trace:[],obligations:[]};root.interactions.push(i);root.cases[i.caseId].interactions.push(i.id);return i.id;},
 record:(state,id,from,to,detail)=>{for(const i of hooks.customerRoot(state,id).interactions.filter(i=>[from,to].includes(i.id)))i.trace.push({at:state.clock,code:handoff.CODE,detail:copy(detail)});}};
 return {s,request,hooks,input,j,child,project};
}

test('AC-SOC-661 isolated handoff contract produces two canonical legs on one pending case without changing money or totals',()=>{
 const {s,request,hooks}=fixture(),cash=s.business.balance.cash,receipt=handoff.commit(s,request,hooks),j=s.providerCampaign.jobs[0];
 assert.equal(s.providerCampaign.jobs.length,1);assert.equal(j.interactionId,'interaction-1');assert.equal(j.status,'pending');assert.equal(j.voiceMinutes,0,'coordinator meters observed usage once');assert.equal(j.messageCharged,false);assert.equal(s.business.balance.cash,cash);
 assert.equal(receipt.sourceUsageMinutes,1);assert.equal(receipt.targetInteractionId,'interaction-2');assert.equal(handoff.validate(s,hooks),true);assert.equal(hooks.customerRoot(s,'customer-a').cases[j.caseId].interactions.length,2);
 assert.ok(handoff.eligibility(s,request,hooks).blockers.includes('PROVIDER_CASE_HANDOFF_JOB_INELIGIBLE'));
});

test('AC-SOC-662 handoff eligibility and quoted details are pure and preserve actual original deadline and usage',()=>{
 const {s,request,hooks,j}=fixture(),before=JSON.stringify(s),q=handoff.quoteDetails(s,request,hooks);assert.equal(q.eligible,true);assert.equal(q.incrementalSetupCents,0);assert.equal(q.deadlineAt,j.deadlineAt);assert.equal(q.sourceUsageMinutes,1);assert.equal(q.paid.projectId,'project-1');assert.equal(JSON.stringify(s),before);
 q.plan.request.eligible.socialMessaging=false;assert.equal(handoff.eligibility(s,request,hooks).eligible,true);
});

test('AC-SOC-663 handoff requires actual authored queued admission and refuses talked, mandatory, duplicate and foreign cases',()=>{
 const changes=[f=>f.child.interactions[0].trace=[],f=>f.child.interactions[0].trace.push({at:f.s.clock,code:'AGENT_ASSIGNED'}),f=>f.child.interactions[0].phase='handling',f=>f.child.interactions[0].context=false,f=>f.child.interactions[0].tenant='foreign',f=>f.s.providerCampaign.customers[0].scenario='government',f=>f.j.resilienceSequence={},f=>f.j.status='completed',f=>f.s.clock=f.j.deadlineAt+1,f=>f.request.customerId='foreign',f=>f.request.connectorId='workplace-chat',f=>f.j.caseId='case-unknown',f=>f.child.interactions[0].emergency=true,f=>f.child.interactions[0].intent='test-emergency'];
 for(const change of changes){const f=fixture();change(f);assert.equal(handoff.eligibility(f.s,f.request,f.hooks).eligible,false);}
});

test('AC-SOC-664 missing hooks and unpaid or unavailable human/product capacity fail closed',()=>{
 for(const key of ['customerRoot','demandPlan','capabilityAt','humanReady']){const f=fixture();delete f.hooks[key];assert.throws(()=>handoff.eligibility(f.s,f.request,f.hooks),/PROVIDER_HANDOFF_HOOK_REQUIRED/);}
 for(const change of [f=>f.hooks.humanReady=()=>false,f=>f.hooks.capabilityAt=()=>({ready:false}),f=>f.project.completedAt=f.s.clock+1,f=>f.project.customerId='other',f=>f.project.status='commissioning',f=>f.project.retirement={effectiveAt:f.s.clock}]){const f=fixture();change(f);assert.equal(handoff.eligibility(f.s,f.request,f.hooks).eligible,false);}
});

test('AC-SOC-665 immediate target refusal throws on transaction copy and preserves caller original',()=>{
 const f=fixture(),before=JSON.stringify(f.s),owned=copy(f.s),start=f.hooks.start;f.hooks.start=(s,id,c)=>{const target=start(s,id,c);f.hooks.customerRoot(s,id).interactions.at(-1).phase='failed';return target;};
 assert.throws(()=>handoff.commit(owned,f.request,f.hooks),/PROVIDER_CASE_HANDOFF_TARGET_REFUSED/);assert.equal(JSON.stringify(f.s),before,'dispatcher must discard the owned copy on failure');assert.equal(owned.providerCampaign.jobs[0].handoff,undefined);
});

test('AC-SOC-666 historical handoff rejects coherent plan, paid project, timestamp and case forgeries',()=>{
 const f=fixture();handoff.commit(f.s,f.request,f.hooks);
 const mutations=[s=>s.providerCampaign.jobs[0].handoff.demandRequest.seed++,s=>s.providerCampaign.jobs[0].handoff.planAt++,s=>s.providerCampaign.jobs[0].handoff.sourceCaseIndex++,s=>s.providerCampaign.jobs[0].handoff.projectId='free-project',s=>s.providerCampaign.projects[0].completedAt=s.clock+1,s=>s.providerCampaign.projects[0].retirement={effectiveAt:s.clock},s=>s.providerCampaign.jobs[0].handoff.at++,s=>s.providerCampaign.jobs[0].handoff.tenant='foreign',s=>s.providerCampaign.caseHandoffVersion=2];
 for(const mutate of mutations){const forged=copy(f.s);mutate(forged);assert.throws(()=>handoff.validate(forged,f.hooks),/INVALID_PROVIDER_CASE_HANDOFF/);}
});

test('AC-SOC-667 retained legs require reciprocal exact provenance, non-human original and canonical case identity',()=>{
 const f=fixture();handoff.commit(f.s,f.request,f.hooks);
 const mutations=[r=>r.interactions.shift(),r=>r.interactions[0].usageMinutes++,r=>r.interactions[0].trace.push({at:r.interactions[0].finishedAt,code:'AGENT_ASSIGNED'}),r=>r.interactions[1].trace[0].detail.fromInteractionId='other',r=>r.interactions[1].trace.push(copy(r.interactions[1].trace[0])),r=>r.interactions[1].account='workplace',r=>r.interactions[1].context=false,r=>r.cases[Object.keys(r.cases)[0]].interactions.pop()];
 for(const mutate of mutations){const forged=copy(f.s);mutate(forged.portfolio.customers[0].root);assert.throws(()=>handoff.validate(forged,f.hooks),/INVALID_PROVIDER_CASE_HANDOFF/);}
});

test('AC-SOC-668 historical proof survives later retirement, pins only retained jobs and serializes identically for workers',()=>{
 const f=fixture();handoff.commit(f.s,f.request,f.hooks);const at=f.s.clock;f.s.clock+=20;f.project.retirement={effectiveAt:at+1};f.hooks.humanReady=()=>false;
 assert.equal(handoff.validate(f.s,f.hooks),true,'historical facts do not demand present readiness');assert.deepEqual(handoff.pins(f.s,'customer-a'),{interactionIds:['interaction-1','interaction-2'],caseIds:[f.j.caseId]});assert.deepEqual(handoff.pins(f.s,'foreign'),{interactionIds:[],caseIds:[]});
 const context={};vm.createContext(context);vm.runInContext(demand.source()+handoff.source()+';globalThis.api=SOC_PROVIDER_CASE_HANDOFF;',context);assert.equal(context.api.validate(f.s,f.hooks),true);assert.deepEqual(JSON.parse(JSON.stringify(context.api.pins(f.s,'customer-a'))),handoff.pins(f.s,'customer-a'));
 f.s.providerCampaign.jobs=[];assert.deepEqual(handoff.pins(f.s,'customer-a'),{interactionIds:[],caseIds:[]});assert.equal(handoff.validate(f.s,f.hooks),true);
});
