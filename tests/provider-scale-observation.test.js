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
 const attempts=()=>holder.root.serviceObservation.windows[0]?.attempts||[];
 return {
  activeCustomer:(_s,id)=>id==='customer-a',paidBpoCapacity:()=>true,workloadReady:()=>true,staffAvailable:()=>true,
  validatePaidProject:(_s,p,c,op,t)=>p?.customerId===c&&p.operationId===op&&p.setupCents===t.setupCents&&p.postingId==='posting-1',
  project:()=>project,projectAt:()=>true,clock:()=>holder.root.clock,
  openNativeWindow:()=>{holder.root=open(holder.root);return holder.root.serviceObservation.active;},
  nativeWindow:(_s,_c,id)=>holder.root.serviceObservation.windows.find(w=>w.id===id),
  interact:(_s,task)=>{holder.root=SOC.dispatch(holder.root,{type:'interact',channel:'voice',from:task.sequence%2?'bea':'alex',to:'+61255500201',caseId:task.id,language:'en',durationMinutes:task.durationMinutes});const i=holder.root.interactions.at(-1);return {accepted:i.caseId===task.id,interactionId:i.id,caseId:i.caseId,startedAt:i.startedAt};},
  interaction:(_s,_c,id)=>holder.root.interactions.find(i=>i.id===id),
  usage:(_s,_c,i)=>({minutes:i.usageMinutes||0,cents:(i.usageMinutes||0)*2}),
  postUsage:(_s,_r,job,_i,u)=>({postingId:'usage-'+job.id,cents:u.cents,units:u.minutes}),
  attemptOrigin:(_s,_c,id,run)=>{const i=holder.root.interactions.find(x=>x.id===id);if(!i)return null;const paid=run.paidJobs.find(j=>j.interactionId===id);return {kind:paid?'paid-scale-job':'ordinary-job',jobId:paid?.id||'ordinary-job-'+id,caseId:i.caseId,interactionId:i.id,person:i.agent||null,workforceAssignment:i.workforceAssignment||null,startedAt:i.startedAt};}
 };
}

test('paid offers expose distinct costs and block workflow capacity without a real paid BPO receipt',()=>{
 assert.deepEqual(P.terms(P.BASELINE),{setupCents:12000,periodCents:0,workMinutes:2,engineers:0,support:1,mode:'baseline',workflowMinutes:3,wrapMinutes:1,bpoRequired:false});
 assert.equal(P.terms(P.WORKFLOW).setupCents,48000);assert.equal(P.terms(P.WORKFLOW).periodCents,10000);
 const s=P.create(),base={activeCustomer:()=>true,paidBpoCapacity:()=>false,workloadReady:()=>true,staffAvailable:()=>true};
 assert.equal(P.orderPlan(s,{customerId:'customer-a',operationId:P.WORKFLOW},base).blockers.includes('SCALE_PAID_BPO_CAPACITY_REQUIRED'),true);
 assert.equal(P.orderPlan(s,{customerId:'customer-a',operationId:P.BASELINE},base).eligible,true);
 assert.equal(CONTENT.contentVersion,P.CONTENT);assert.deepEqual(CONTENT.sourceIds,P.SOURCE_IDS);assert.deepEqual(Object.fromEntries(Object.entries(CONTENT.window).filter(([k])=>k!=='goal')),O.thresholds.tb);
 assert.deepEqual(CONTENT.paidLoadSchedule,P.SCHEDULE.map(x=>({offsetMinute:x.offsetMinute,tasks:x.tasks})));
 for(const operation of CONTENT.operations)assert.deepEqual(P.terms(operation.id),{setupCents:operation.setupCents,periodCents:operation.periodCents,workMinutes:operation.workMinutes,engineers:operation.engineers,support:operation.support,mode:operation.mode,workflowMinutes:operation.workflowMinutes,wrapMinutes:operation.wrapMinutes,bpoRequired:operation.bpoRequired});
});

test('baseline is a real paid failure window; native attempts, including ordinary-origin attempts, remain in the denominator',()=>{
 let root=ready();const side=P.create(),project={id:'project-1',postingId:'posting-1',customerId:'customer-a',operationId:P.BASELINE,setupCents:12000};
 const hooks=fixtureHooks({get root(){return root;},set root(v){root=v;}},project);
 const run=P.beginRun(side,{customerId:'customer-a',operationId:P.BASELINE},project,hooks);
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

test('paid short-task Lab interaction fixture can satisfy unchanged native TB thresholds and retention is explicit',()=>{
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
 assert.equal(P.validate(side,hooks),true);
 assert.equal(P.pins(side,'customer-a').nativeWindowIds.length,1);
 assert.equal(O.thresholds.tb.minutes,10);assert.equal(O.thresholds.tb.journeys,12);
 const context={};require('node:vm').createContext(context);require('node:vm').runInContext(P.source()+';globalThis.P=SOC_PROVIDER_SCALE_OBSERVATION;',context);assert.equal(context.P.VERSION,P.VERSION);assert.equal(context.P.validate(side,hooks),true);
});

test('save validation rejects missing lineage, fabricated successful attempts and over-retention',()=>{
 const s=P.create();s.runs.push({id:'provider-scale-1',version:1,customerId:'customer-a',operationId:P.WORKFLOW,status:'open',projectId:'project-2',postingId:'posting-1',startedAt:1,dueAt:11,nativeWindowId:'service-window-1',mode:'workflow',paidJobs:[],attempts:[{origin:'paid-scale-job',jobId:'job-1',caseId:'case-1',interactionId:'interaction-1',person:'agent-a',workforceAssignment:'assignment-1',startedAt:2,finished:true,success:true,journey:{success:false}}],result:null});s.nextId=2;
 assert.throws(()=>P.validate(s),/INVALID_PROVIDER_SCALE_ATTEMPT/);
 const many=P.create();many.runs=Array.from({length:P.MAX_RUNS+1},(_,i)=>({id:`provider-scale-${i+1}`}));many.nextId=P.MAX_RUNS+2;assert.throws(()=>P.validate(many),/INVALID_PROVIDER_SCALE_STATE/);
});
