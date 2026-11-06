const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const P=require('../src/game/23-provider-scale-observation.js');
const O=require('../src/game/39-service-observation.js');
const CONTENT=require('../content/provider-scale-observation.v1.json');

function ready(){let s=SOC.create({scenario:'smb',mode:'assessed'});for(const c of SOC.reference(s))s=SOC.dispatch(s,c);return s;}
function tick(s,n=1){for(let i=0;i<n;i++)s=SOC.dispatch(s,{type:'advance',minutes:1});return s;}
function person(id,seat){return {id,employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:2,entitlements:[seat]};}
function staffed(){let s=ready();s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:2,entitlements:2,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:2}});s=SOC.dispatch(s,{type:'workforce',command:{action:'start'}});s=SOC.dispatch(s,{type:'workforce',command:{action:'roster',people:[person('agent-a','seat-01'),person('agent-b','seat-02')]}});s=SOC.dispatch(s,{type:'contact',command:{action:'start'}});return tick(s,1);}
function open(s){s=SOC.dispatch(s,{type:'service-observation',command:{action:'start'}});return SOC.dispatch(s,{type:'service-observation',command:{action:'open-window',goal:'tb'}});}
function fixtureHooks(holder,project){
 const postings=new Map();let postCalls=0;
 return {
  activeCustomer:(_s,id)=>id==='customer-a',paidBpoCapacity:()=>true,workloadReady:()=>true,staffAvailable:()=>true,
  earnedTbAt:()=>true,
  validatePaidProject:(_s,p,c,op,t)=>p?.customerId===c&&p.operationId===op&&p.setupCents===t.setupCents&&p.postingId===project.postingId,
  project:()=>project,projectAt:()=>true,clock:()=>holder.root.clock,
  openNativeWindow:()=>{holder.root=open(holder.root);return holder.root.serviceObservation.active;},
  nativeWindow:(_s,_c,id)=>holder.root.serviceObservation.windows.find(w=>w.id===id),
  interact:(_s,task)=>{holder.root=SOC.dispatch(holder.root,{type:'interact',channel:'voice',from:task.sequence%2?'bea':'alex',to:'+61255500201',caseId:task.id,language:'en',durationMinutes:task.durationMinutes});const i=holder.root.interactions.at(-1);return {accepted:i.caseId===task.id,interactionId:i.id,caseId:i.caseId,startedAt:i.startedAt};},
  interaction:(_s,_c,id)=>holder.root.interactions.find(i=>i.id===id),
  usage:(_s,_c,i)=>({minutes:i.usageMinutes||0,cents:(i.usageMinutes||0)*2}),
  postUsage:(_s,_r,job,_i,u)=>{postCalls++;if(!postings.has(job.id))postings.set(job.id,{postingId:'usage-'+job.id,cents:u.cents,units:u.minutes});return postings.get(job.id);},
  validateUsagePosting:(_s,_r,job,_i,posting)=>{const actual=postings.get(job.id);return !!actual&&JSON.stringify(actual)===JSON.stringify(posting);},
  get postCalls(){return postCalls;},get postings(){return postings;},
  attemptOrigin:(_s,_c,id,run)=>{const i=holder.root.interactions.find(x=>x.id===id);if(!i)return null;const paid=run.paidJobs.find(j=>j.interactionId===id);return {kind:paid?'paid-scale-job':'ordinary-job',jobId:paid?.id||'ordinary-job-'+id,caseId:i.caseId,interactionId:i.id,person:i.agent||null,workforceAssignment:i.workforceAssignment||null,startedAt:i.startedAt};}
 };
}

test('AC-SOC-850 paid offers expose distinct costs and block workflow capacity without a real paid BPO receipt',()=>{
 assert.deepEqual(P.terms(P.BASELINE),{setupCents:12000,periodCents:0,workMinutes:2,engineers:0,support:1,mode:'baseline',workflowMinutes:3,wrapMinutes:1,bpoRequired:false,earnedTbRequired:false});
 assert.equal(P.terms(P.WORKFLOW).setupCents,48000);assert.equal(P.terms(P.WORKFLOW).periodCents,10000);
 assert.deepEqual(P.terms(P.MANAGED),{setupCents:36000,periodCents:16000,workMinutes:12,engineers:0,support:1,mode:'workflow',workflowMinutes:1,wrapMinutes:0,bpoRequired:true,earnedTbRequired:true});
 const s=P.create(),base={activeCustomer:()=>true,paidBpoCapacity:()=>false,workloadReady:()=>true,staffAvailable:()=>true};
 assert.equal(P.orderPlan(s,{customerId:'customer-a',operationId:P.WORKFLOW},base).blockers.includes('SCALE_PAID_BPO_CAPACITY_REQUIRED'),true);
 assert.equal(P.orderPlan(s,{customerId:'customer-a',operationId:P.BASELINE},base).eligible,true);
 const managed={...base,paidBpoCapacity:()=>true,earnedTbAt:()=>false};assert.ok(P.orderPlan(s,{customerId:'customer-a',operationId:P.MANAGED},managed).blockers.includes('SCALE_TB_EARNED_REQUIRED'));managed.earnedTbAt=()=>true;assert.equal(P.orderPlan(s,{customerId:'customer-a',operationId:P.MANAGED},managed).eligible,true);
 assert.equal(CONTENT.contentVersion,P.CONTENT);assert.deepEqual(CONTENT.sourceIds,P.SOURCE_IDS);assert.deepEqual(Object.fromEntries(Object.entries(CONTENT.window).filter(([k])=>k!=='goal')),O.thresholds.tb);
 assert.deepEqual(CONTENT.paidLoadSchedule,P.SCHEDULE.map(x=>({offsetMinute:x.offsetMinute,tasks:x.tasks})));
 for(const operation of CONTENT.operations)assert.deepEqual(P.terms(operation.id),{setupCents:operation.setupCents,periodCents:operation.periodCents,workMinutes:operation.workMinutes,engineers:operation.engineers,support:operation.support,mode:operation.mode,workflowMinutes:operation.workflowMinutes,wrapMinutes:operation.wrapMinutes,bpoRequired:operation.bpoRequired,earnedTbRequired:operation.earnedTbRequired});
});

test('AC-SOC-851 baseline is a real paid failure window; native attempts, including ordinary-origin attempts, remain in the denominator',()=>{
 let root=ready();const side=P.create(),project={id:'project-1',postingId:'posting-1',customerId:'customer-a',operationId:P.BASELINE,setupCents:12000};
 const hooks=fixtureHooks({get root(){return root;},set root(v){root=v;}},project);
 const run=P.beginRun(side,{customerId:'customer-a',operationId:P.BASELINE},project,hooks);
 assert.deepEqual(P.emitDue(side,run.id,hooks),[]);
 root=SOC.dispatch(root,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'ordinary-case-1',language:'en'});
 root=tick(root,10);
 const ordinary=root.interactions.find(i=>i.caseId==='ordinary-case-1');
 const ordinaryHooks={...hooks,attemptOrigin:(_s,_c,id)=>id===ordinary?.id?{kind:'ordinary-job',jobId:'ordinary-job-1',caseId:ordinary.caseId,interactionId:ordinary.id,person:ordinary.agent||null,workforceAssignment:ordinary.workforceAssignment||null,startedAt:ordinary.startedAt}:null};
 const observed=P.advance(side,run.id,ordinaryHooks);
 assert.equal(observed.run.attempts.length,1);assert.equal(observed.run.attempts[0].origin,'ordinary-job');
 assert.equal(root.serviceObservation.windows[0].status,'failed');
 assert.equal(O.validate(root),true);
 assert.equal(root.serviceObservation.windows[0].attempts.length,1);
});

test('AC-SOC-852 paid short-task Lab interaction fixture can satisfy unchanged native TB thresholds and retention is explicit',()=>{
 let root=tick(staffed(),6);const holder={get root(){return root;},set root(v){root=v;}},side=P.create(),project={id:'project-2',postingId:'posting-1',customerId:'customer-a',operationId:P.WORKFLOW,setupCents:48000};
 const hooks=fixtureHooks(holder,project);const run=P.beginRun(side,{customerId:'customer-a',operationId:P.WORKFLOW},project,hooks);
 for(let minute=0;minute<10;minute++){
  if(minute>0)P.emitDue(side,run.id,hooks);
  if(minute===4)root=SOC.dispatch(root,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'ordinary-campaign-case',language:'en'});
  root=tick(root,1);P.advance(side,run.id,hooks);
 }
 const completed=P.finalize(side,run.id,hooks);
 assert.equal(root.serviceObservation.windows[0].status,'passed');
 assert.equal(completed.status,'passed');
 assert.ok(completed.result.counts.successful>=12);
 assert.ok(completed.result.counts.ordinary+completed.result.counts.paid===completed.result.counts.attempts);
 assert.ok(completed.result.counts.ordinary>=1);assert.equal(completed.run.paidJobs.length,12);assert.ok(completed.run.paidJobs.every(j=>j.status==='completed'&&j.usagePostingId));
 const calls=hooks.postCalls;P.advance(side,run.id,hooks);assert.equal(hooks.postCalls,calls,'reconciling the same minute must not post usage twice');
 assert.equal(P.validate(side,hooks),true);
 assert.equal(P.pins(side,'customer-a').nativeWindowIds.length,1);
 assert.equal(O.thresholds.tb.minutes,10);assert.equal(O.thresholds.tb.journeys,12);
 const context={};require('node:vm').createContext(context);require('node:vm').runInContext(P.source()+';globalThis.P=SOC_PROVIDER_SCALE_OBSERVATION;',context);assert.equal(context.P.VERSION,P.VERSION);assert.equal(context.P.validate(side,hooks),true);
});

test('AC-SOC-853 task emission and usage posting are idempotent; refused jobs stay visible and one paid project opens only one window',()=>{
 let root=tick(staffed(),6);const holder={get root(){return root;},set root(v){root=v;}},side=P.create(),project={id:'project-one-window',postingId:'posting-one-window',customerId:'customer-a',operationId:P.WORKFLOW,setupCents:48000};
 const base=fixtureHooks(holder,project),blocked={...base,interact:()=>({accepted:false,refusal:'BPO_CAPACITY_EXHAUSTED'})};
 const run=P.beginRun(side,{customerId:'customer-a',operationId:P.WORKFLOW},project,blocked);
 assert.equal(run.paidJobs.length,2);assert.ok(run.paidJobs.every(j=>j.status==='rejected'&&j.refusal==='BPO_CAPACITY_EXHAUSTED'));
 assert.deepEqual(P.emitDue(side,run.id,blocked),[],'same minute cannot emit or retry rejected tasks twice');
 assert.equal(P.validate(side,blocked),true);
 assert.deepEqual(P.pins(side,'customer-a').interactionIds,[]);
 for(let n=0;n<10;n++){P.emitDue(side,run.id,blocked);root=tick(root,1);P.advance(side,run.id,blocked);}
 assert.throws(()=>P.beginRun(side,{customerId:'customer-a',operationId:P.WORKFLOW},project,blocked),/PROVIDER_SCALE_PROJECT_ALREADY_USED/);
});

test('AC-SOC-854 an ordinary assigned human attempt with an unresolved customer need is retained as failed, not rejected for being human',()=>{
 let root=ready();root=SOC.dispatch(root,{type:'configure',id:'people',config:{people:2,entitlements:2,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:2}});root=SOC.dispatch(root,{type:'workforce',command:{action:'start'}});root=SOC.dispatch(root,{type:'workforce',command:{action:'roster',people:[person('agent-a','seat-01'),person('agent-b','seat-02')]}});root=SOC.dispatch(root,{type:'contact',command:{action:'start'}});root=SOC.dispatch(root,{type:'outcomes',command:{action:'start'}});root=SOC.dispatch(root,{type:'outcomes',command:{action:'need',tenant:'orchard-repairs',person:'alex',caseId:'reference-case',purpose:'service',intent:'unsupported-intent',permittedChannels:['voice']}});root=tick(root,1);
 const holder={get root(){return root;},set root(v){root=v;}},side=P.create(),project={id:'project-human-failure',postingId:'posting-human-failure',customerId:'customer-a',operationId:P.BASELINE,setupCents:12000},hooks=fixtureHooks(holder,project),run=P.beginRun(side,{customerId:'customer-a',operationId:P.BASELINE},project,hooks);
 root=SOC.dispatch(root,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'reference-case',needId:root.outcomes.needs[0].id,language:'en',durationMinutes:1});root=tick(root,4);P.advance(side,run.id,hooks);
 const attempt=side.runs[0].attempts.find(a=>a.caseId==='reference-case');assert.ok(attempt);assert.equal(attempt.success,false);assert.equal(attempt.journey.human,true);assert.equal(attempt.person,'agent-a');assert.ok(attempt.workforceAssignment);
 assert.equal(P.validate(side,hooks),true);
});

test('AC-SOC-855 an unfinished ordinary attempt may receive an assignment after the native window closes without rewriting its historical snapshot',()=>{
 let root=tick(staffed(),6);const holder={get root(){return root;},set root(v){root=v;}},side=P.create(),project={id:'project-postwindow',postingId:'posting-postwindow',customerId:'customer-a',operationId:P.BASELINE,setupCents:12000},hooks=fixtureHooks(holder,project),run=P.beginRun(side,{customerId:'customer-a',operationId:P.BASELINE},project,hooks);
 for(let n=0;n<9;n++){root=tick(root,1);P.advance(side,run.id,hooks);}
 root=SOC.dispatch(root,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'ordinary-at-close',language:'en'});root=tick(root,1);P.advance(side,run.id,hooks);
 const atClose=side.runs[0].attempts.find(a=>a.caseId==='ordinary-at-close');assert.ok(atClose);assert.equal(atClose.finished,false);assert.equal(atClose.person,null);assert.equal(atClose.workforceAssignment,null);assert.equal(side.runs[0].status,'failed');
 root=tick(root,3);const later=root.interactions.find(i=>i.caseId==='ordinary-at-close');assert.ok(later.agent);assert.ok(later.workforceAssignment);
 assert.equal(P.validate(side,hooks),true);const validated=side.runs[0].attempts.find(a=>a.caseId==='ordinary-at-close');assert.equal(validated.finished,false);assert.equal(validated.person,null);assert.equal(validated.workforceAssignment,null);
});

test('AC-SOC-856 a paid task with a failed customer outcome records its real human assignment and usage without counting as successful work',()=>{
 let root=tick(staffed(),6);root=SOC.dispatch(root,{type:'outcomes',command:{action:'start'}});root=SOC.dispatch(root,{type:'outcomes',command:{action:'need',tenant:'orchard-repairs',person:'alex',caseId:'reference-case',purpose:'service',intent:'unsupported-intent',permittedChannels:['voice']}});
 const holder={get root(){return root;},set root(v){root=v;}},side=P.create(),project={id:'project-paid-failure',postingId:'posting-paid-failure',customerId:'customer-a',operationId:P.WORKFLOW,setupCents:48000},base=fixtureHooks(holder,project),hooks={...base,interact:(_s,task)=>{if(task.sequence!==1)return base.interact(_s,task);root=SOC.dispatch(root,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'reference-case',needId:root.outcomes.needs[0].id,language:'en',durationMinutes:1});const i=root.interactions.at(-1);return {accepted:true,interactionId:i.id,caseId:i.caseId,startedAt:i.startedAt};}};
 const run=P.beginRun(side,{customerId:'customer-a',operationId:P.WORKFLOW},project,hooks);
 for(let minute=0;minute<3;minute++){if(minute>0)P.emitDue(side,run.id,hooks);root=tick(root,1);P.advance(side,run.id,hooks);}
 const failed=side.runs[0].paidJobs.find(j=>j.sequence===1);assert.equal(failed.status,'failed');assert.equal(failed.person,'agent-a');assert.ok(failed.workforceAssignment);assert.ok(failed.usagePostingId);
 const attempt=side.runs[0].attempts.find(a=>a.interactionId===failed.interactionId);assert.equal(attempt.success,false);assert.equal(attempt.journey.human,true);assert.equal(P.validate(side,hooks),true);
});

test('AC-SOC-857 open save validation is bound to its live native window and rejects altered paid task lineage or usage',()=>{
 let root=tick(staffed(),6);const holder={get root(){return root;},set root(v){root=v;}},side=P.create(),project={id:'project-open-validation',postingId:'posting-open-validation',customerId:'customer-a',operationId:P.WORKFLOW,setupCents:48000};
 const hooks=fixtureHooks(holder,project),run=P.beginRun(side,{customerId:'customer-a',operationId:P.WORKFLOW},project,hooks);
 assert.equal(P.pins(side,'customer-a').caseIds.length,2);assert.equal(P.pins(side,'customer-a').interactionIds.length,2);assert.equal(P.pins(side,'customer-a').jobIds.length,2,'paid jobs are pinned before the observer samples them');
 assert.equal(P.validate(side,hooks),true);
 const alteredJob=structuredClone(side);alteredJob.runs[0].paidJobs[0].caseId='forged-case';assert.throws(()=>P.validate(alteredJob,hooks),/INVALID_PROVIDER_SCALE_PAID_JOB_LINEAGE/);
 const alteredProject=structuredClone(side);alteredProject.runs[0].projectId='different-project';assert.throws(()=>P.validate(alteredProject,hooks),/INVALID_PROVIDER_SCALE_PAID_PROJECT/);
 P.emitDue(side,run.id,hooks);root=tick(root,1);P.advance(side,run.id,hooks);
 const started=side.runs[0].paidJobs.find(j=>j.status==='started');assert.ok(started);
 const alteredUsage=structuredClone(side);alteredUsage.runs[0].paidJobs.find(j=>j.id===started.id).usageCents=99;assert.throws(()=>P.validate(alteredUsage,hooks),/INVALID_PROVIDER_SCALE_PAID_(USAGE|JOB)/);
});

test('AC-SOC-858 save validation rejects missing lineage, fabricated successful attempts and over-retention',()=>{
 const s=P.create();s.runs.push({id:'provider-scale-1',version:1,customerId:'customer-a',operationId:P.WORKFLOW,status:'open',projectId:'project-2',postingId:'posting-1',startedAt:1,dueAt:11,nativeWindowId:'service-window-1',mode:'workflow',paidJobs:[],attempts:[{origin:'paid-scale-job',jobId:'job-1',caseId:'case-1',interactionId:'interaction-1',person:'agent-a',workforceAssignment:'assignment-1',startedAt:2,finished:true,success:true,journey:{success:false}}],result:null});s.nextId=2;
 assert.throws(()=>P.validate(s),/INVALID_PROVIDER_SCALE_ATTEMPT/);
 const many=P.create();many.runs=Array.from({length:P.MAX_RUNS+1},(_,i)=>({id:`provider-scale-${i+1}`}));many.nextId=P.MAX_RUNS+2;assert.throws(()=>P.validate(many),/INVALID_PROVIDER_SCALE_STATE/);
});
