"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),SOC=require('../src/game/55-communications'),F=require('../src/game/23-provider-case-followup'),A=require('../src/game/23-provider-followup-retry-archive');
const copy=x=>JSON.parse(JSON.stringify(x)),ID='customer-a';
// Real Lab interactions with isolated Provider adapter contracts. Paid hook facts below
// are fixtures, not a claim that Provider dispatch or earned L8 integration is implemented.
function fixture(){
 let lab=SOC.create({experience:'lab',mode:'sandbox',scenario:'smb',tenant:'orchard-repairs'});
 for(const c of SOC.reference(lab).filter(c=>c.type==='configure'))lab=SOC.dispatch(lab,c);
 lab=SOC.dispatch(lab,{type:'advance',minutes:1});
 for(const type of ['workforce','operations','channels'])lab=SOC.dispatch(lab,{type,command:{action:'start'}});
 for(const c of [{action:'observe',channel:'chatterleaf',authenticated:true,providerAvailable:true,fault:null},{action:'permission',tenant:'orchard-repairs',person:'alex',channel:'chatterleaf',purpose:'service',granted:true,expiresAt:null}])lab=SOC.dispatch(lab,{type:'channels',command:c});
 lab=SOC.dispatch(lab,{type:'configure',id:'recorder',config:{enabled:false}});lab=SOC.dispatch(lab,{type:'advance',minutes:9});lab=SOC.dispatch(lab,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'followup-case',durationMinutes:3});
 const voice=lab.interactions.at(-1),j={preference:null,messageCharged:false,lastUsageAt:null,failure:null,followupPlan:{at:7,request:{scenario:'smb',seed:17}},id:'job-1',customerId:ID,caseId:voice.caseId,periodIndex:0,channel:'voice',arrivalAt:lab.clock,deadlineAt:45,interactionId:voice.id,status:'pending',settled:false,completedAt:null,voiceMinutes:0,messageUnits:0};
 const workflow={id:'workflow-1',customerId:ID,operationId:F.DIRECT,postingId:'entry-1',acceptedAt:0,completedAt:5,status:'complete',...F.terms(F.DIRECT)},connector={id:'connector-1',customerId:ID,operationId:F.CONNECTOR,postingId:'entry-2',acceptedAt:0,completedAt:6,status:'complete'};
 const s={clock:lab.clock,providerCampaign:{contentVersion:'provider-campaigns-8',caseFollowupVersion:1,customers:[{id:ID,portfolioId:ID,scenario:'smb',market:'au-sydney',status:'active'}],projects:[workflow,connector],jobs:[j,...Array.from({length:23},(_,n)=>({id:`other-job-${n}`,caseId:`other-case-${n}`,customerId:ID,periodIndex:0,status:'pending'}))]},portfolio:{customers:[{id:ID,root:lab}]},business:{balance:{cash:100000}}};
 const auth={version:1,planAt:7,caseIndex:12,caseId:j.caseId,person:'alex',consented:true,connectorId:'social-messaging',account:'chatterleaf',template:'service-outside-window',to:'+61255500201',deadlineAt:45};
 const hooks={customerRoot:(s,id)=>s.portfolio.customers.find(c=>c.id===id)?.root,authoredCase:()=>copy(auth),workflowAt:(s,id,at)=>({ready:true,projectId:'workflow-1',postingId:'entry-1'}),connectorAt:(s,id,at)=>({ready:true,projectId:'connector-1',postingId:'entry-2',generation:1,configuration:{account:'chatterleaf',generation:1}}),connectorAccepted:()=>true,paidProject:()=>true,earnedAt:()=>false,consentAt:()=>true,boundaryAt:()=>true,humanReady:()=>true,retryAt:(s,id,jobId,at)=>{const p=s.providerCampaign.projects.find(p=>p.operationId===F.RETRY&&p.config.jobId===jobId);return p?{projectId:p.id,postingId:p.postingId}:null;}};
 j.followup=F.reserve(s,j,hooks);return {s,j,hooks,auth,workflow,connector};
}
const root=f=>f.s.portfolio.customers[0].root;
function reconcile(f){const o=F.observe(f.s,f.j,f.hooks);for(const k of ['status','completedAt','voiceMinutes','messageUnits'])f.j[k]=o[k];return o;}
function send(f,c){f.s.portfolio.customers[0].root=SOC.dispatch(root(f),c);f.s.clock=root(f).clock;return reconcile(f);}
function until(f,fn,limit=35){for(let n=0;n<limit&&!fn();n++)send(f,{type:'advance',minutes:1});assert.ok(fn(),'actual Lab service completes within bounded ticks');}
const req=(retry=false)=>({action:retry?'retry-case-followup':'followup-case',customerId:ID,jobId:'job-1'});
function voiceDone(f){until(f,()=>root(f).interactions.find(i=>i.id===f.j.interactionId).phase==='resolved');assert.equal(F.observe(f.s,f.j,f.hooks).phase,'awaiting-followup');return f;}
function start(f,retry=false){const r=req(retry),plan=F.startPlan(f.s,r,f.hooks);f.s.portfolio.customers[0].root=SOC.dispatch(root(f),{type:'interact',...plan.interaction});const target=root(f).interactions.at(-1);target.trace.push({...copy(plan.trace),stage:'provider-followup',synthetic:true});f.j.followup=F.recordAttempt(f.s,r,plan,target.id,f.hooks);reconcile(f);return target.id;}
function complete(f){voiceDone(f);const id=start(f);until(f,()=>root(f).interactions.find(i=>i.id===id).phase==='resolved');f.j.settled=true;return f;}


// The service interactions above are dispatched in Lab. Provider paid projects,
// canonical demand and retained settlement anchors below are isolated integration
// contracts, not a public Provider archive/retention acceptance claim.
function finishedRetry(){
 const f=voiceDone(fixture()),first=start(f);until(f,()=>root(f).interactions.find(i=>i.id===first).trace.some(t=>t.code==='CHANNEL_ACCEPTED'));
 send(f,{type:'workforce',command:{action:'roster',people:root(f).workforceOps.roster.desired.map(p=>({...p,available:false}))}});until(f,()=>root(f).interactions.find(i=>i.id===first).phase==='failed');
 const at=f.s.clock,p={id:'retry-1',customerId:ID,operationId:F.RETRY,postingId:'entry-3',config:{jobId:f.j.id},acceptedAt:at,dueAt:at+2,completedAt:at+2,status:'complete',...F.terms(F.RETRY)};f.s.providerCampaign.projects.push(p);send(f,{type:'workforce',command:{action:'roster',people:root(f).workforceOps.roster.desired.map(p=>({...p,available:true}))}});send(f,{type:'advance',minutes:2});const target=start(f,true);until(f,()=>root(f).interactions.find(i=>i.id===target).phase==='resolved');send(f,{type:'advance',minutes:60-f.s.clock});f.j.settled=true;f.j.messageCharged=f.j.messageUnits>0;
 f.s.providerCampaign.jobCheckpoint={pruned:0,completed:0,late:0,failed:0,voiceMinutes:0,messages:0};
 f.s.business.ledger=f.s.providerCampaign.projects.map((p,n)=>({id:p.postingId,projectId:p.id,customerId:ID,category:'cost',reason:'provider-operation',cents:p.setupCents??10000}));
 const settlement={basis:'provider-period-history-v1',period:0,from:0,to:60,settledAt:60,due:24,completedOnTime:24,late:0,failed:0,voiceMinutes:f.j.voiceMinutes,messages:f.j.messageUnits,voiceCost:f.j.voiceMinutes*50,messageCost:f.j.messageUnits*75};f.s.providerCampaign.customers[0].history=[copy(settlement)];
 const accepted=copy(root(f).channels.acceptances),originalPlan=copy(f.j.followupPlan);f.hooks={...f.hooks,authoredCase:(s,id,j)=>{assert.deepEqual(copy(j.followupPlan),originalPlan);return copy(f.auth);},paidProject:(s,p)=>s.providerCampaign.projects.includes(p)&&s.business.ledger.some(e=>e.id===p.postingId&&e.projectId===p.id&&e.customerId===p.customerId&&e.category==='cost'&&e.cents===(p.setupCents??10000))};
 f.archiveHooks={followup:F,followupHooks:()=>f.hooks,settlement:(s,j)=>s.providerCampaign.customers.find(c=>c.id===j.customerId).history.find(h=>h.period===j.periodIndex),validateSettlement:(s,id,row,j)=>s.providerCampaign.customers.find(c=>c.id===id)?.history.some(h=>JSON.stringify(h)===JSON.stringify(row))===true&&row.voiceMinutes>=j.voiceMinutes&&row.messages>=j.messageUnits,validateAcceptance:(s,id,a,i,attempt)=>id===ID&&accepted.some(v=>JSON.stringify(v)===JSON.stringify(a))&&s.providerCampaign.projects.some(p=>p.id===attempt.connector.projectId)&&a.interaction===i.id};
 f.project=p;f.archive=A.create(f.s,p.id,1,f.archiveHooks);return f;
}
let cached;
function ready(){if(!cached)cached=finishedRetry();const s=copy(cached.s);return {...cached,s,j:s.providerCampaign.jobs[0],project:s.providerCampaign.projects.find(p=>p.id==='retry-1'),archive:copy(cached.archive)};}
function pruned(f){const j=f.j,ids=[j.interactionId,...j.followup.attempts.map(a=>a.interactionId)];f.s.providerCampaign.jobs=f.s.providerCampaign.jobs.filter(x=>x.id!==j.id);const r=root(f);r.interactions=r.interactions.filter(i=>!ids.includes(i.id));delete r.cases[j.caseId];r.channels.acceptances=r.channels.acceptances.filter(a=>!ids.includes(a.interaction));f.s.providerCampaign.jobCheckpoint={pruned:1,completed:1,late:0,failed:0,voiceMinutes:j.voiceMinutes,messages:j.messageUnits};f.project[A.FIELD]=copy(f.archive);return f;}
const rejects=(f,mutate)=>{const s=copy(f.s),a=copy(f.archive);mutate(s,a);assert.throws(()=>A.validate(s,f.project.id,a,f.archiveHooks));};

test('AC-SOC-726 terminal settled retry archive preserves actual Lab voice, failed accepted attempt and recovered human message without mutation',()=>{
 const f=ready(),before=JSON.stringify(f.s),a=A.create(f.s,f.project.id,1,f.archiveHooks);assert.equal(JSON.stringify(f.s),before);assert.equal(a.interactions.length,3);assert.equal(a.acceptances.length,2);assert.equal(a.interactions[0].phase,'resolved');assert.equal(a.interactions[1].phase,'failed');assert.equal(a.interactions[2].phase,'resolved');assert.equal(a.job.voiceMinutes,3);assert.equal(a.job.messageUnits,2);assert.ok(A.serializedBytes(a)<A.MAX_BYTES);assert.equal(A.validate(f.s,f.project.id,a,f.archiveHooks),true);
});
test('AC-SOC-727 live or unsettled retry work and unfinished paid delivery cannot be archived',()=>{
 const f=ready();for(const mutate of [s=>s.providerCampaign.jobs[0].settled=false,s=>s.providerCampaign.jobs[0].status='pending',s=>s.providerCampaign.projects.find(p=>p.id==='retry-1').status='commissioning',s=>s.portfolio.customers[0].root.interactions.at(-1).phase='handling',s=>s.providerCampaign.customers[0].history=[]]){const s=copy(f.s);mutate(s);assert.throws(()=>A.create(s,f.project.id,1,f.archiveHooks));}assert.throws(()=>A.create(f.s,f.project.id,2,f.archiveHooks));
});
test('AC-SOC-728 recorded pruning replays archived retry authority on an owned shadow without restoring an L8 award source',()=>{
 const f=pruned(ready()),before=JSON.stringify(f.s);assert.equal(A.validateAll(f.s,f.archiveHooks),true);assert.equal(JSON.stringify(f.s),before);assert.equal(F.evidence(f.s,ID,f.hooks),null);assert.deepEqual(F.pins(f.s,ID),{jobIds:[],caseIds:[],interactionIds:[]});const restored=JSON.parse(before);assert.equal(A.validateAll(restored,f.archiveHooks),true);assert.deepEqual(restored.business,f.s.business);assert.deepEqual(restored.providerCampaign.jobCheckpoint,f.s.providerCampaign.jobCheckpoint);
});
test('AC-SOC-729 archive schema, size, trace and recursive-object bounds fail closed',()=>{
 const f=ready();for(const mutate of [(s,a)=>a.version=2,(s,a)=>a.extra=true,(s,a)=>a.project.extra=true,(s,a)=>a.job.extra=true,(s,a)=>a.acceptances[0].extra=true,(s,a)=>a.interactions[0].trace=Array.from({length:A.MAX_TRACE_ROWS+1},()=>a.interactions[0].trace[0]),(s,a)=>a.interactions[0].huge='x'.repeat(A.MAX_BYTES),(s,a)=>a.interactions.push(copy(a.interactions[0]))])rejects(f,mutate);const cycle={};cycle.self=cycle;assert.throws(()=>A.serializedBytes(cycle),/INVALID_PROVIDER_FOLLOWUP_RETRY_ARCHIVE/);assert.throws(()=>A.serializedBytes({n:NaN}));
});
test('AC-SOC-730 paid retry project, scoped job, setup posting and immutable terms remain causal after pruning',()=>{
 const f=pruned(ready());for(const mutate of [(s,a)=>s.business.ledger=s.business.ledger.filter(e=>e.id!=='entry-3'),(s,a)=>{s.providerCampaign.projects.find(p=>p.id==='retry-1').setupCents=0;a.project.setupCents=0;},(s,a)=>a.project.config.jobId='unrelated-job',(s,a)=>{s.providerCampaign.projects.find(p=>p.id==='retry-1').acceptedAt=1;a.project.acceptedAt=1;},(s,a)=>a.project.postingId='entry-foreign'])rejects(f,mutate);assert.equal(A.validateAll(f.s,f.archiveHooks),true);
});
test('AC-SOC-731 coordinated archived case or consent edits cannot replace canonical demand and historical paid acceptance anchors',()=>{
 const f=pruned(ready());for(const mutate of [(s,a)=>{a.job.followup.person='bea';a.job.followup.authored.person='bea';a.case.identity='bea';for(const i of a.interactions)i.from='bea';for(const x of a.acceptances)x.person='bea';},(s,a)=>{a.case.tenant='foreign';a.job.followup.tenant='foreign';for(const i of a.interactions)i.tenant='foreign';for(const x of a.acceptances)x.tenant='foreign';},(s,a)=>a.job.followupPlan.request.seed++,(s,a)=>a.acceptances[0].permissionUpdatedAt++,(s,a)=>{s.providerCampaign.projects=s.providerCampaign.projects.filter(p=>p.id!=='connector-1');}])rejects(f,mutate);assert.throws(()=>A.validate(f.s,f.project.id,f.archive,{...f.archiveHooks,validateAcceptance:()=>false}));
});
test('AC-SOC-732 retry authorization requires the actual failed first leg and conserved observed usage, not signalling-only success',()=>{
 const f=pruned(ready());for(const mutate of [(s,a)=>a.interactions[1].phase='resolved',(s,a)=>a.interactions[0].media.in=false,(s,a)=>{a.interactions[0].usageMinutes++;a.job.voiceMinutes++;},(s,a)=>a.interactions[2].trace=a.interactions[2].trace.filter(t=>t.code!=='HUMAN_HANDOFF'),(s,a)=>a.job.messageUnits=1,(s,a)=>a.acceptances.pop()])rejects(f,mutate);assert.equal(A.validateAll(f.s,f.archiveHooks),true);
});
test('AC-SOC-733 missing live rows require a recorded prune ordinal and independently validated settlement anchor',()=>{
 const f=pruned(ready());for(const mutate of [(s,a)=>s.providerCampaign.jobCheckpoint.pruned=0,(s,a)=>a.pruneOrdinal=2,(s,a)=>a.archivedAt=59,(s,a)=>a.archivedAt=s.clock+1,(s,a)=>a.settlement.period++,(s,a)=>s.providerCampaign.customers[0].history=[]])rejects(f,mutate);for(const key of ['completed','voiceMinutes','messages']){const bad=copy(f.s);bad.providerCampaign.jobCheckpoint[key]=0;assert.throws(()=>A.validateAll(bad,f.archiveHooks));}for(const key of ['validateSettlement','validateAcceptance','followupHooks']){const h={...f.archiveHooks};delete h[key];assert.throws(()=>A.validate(f.s,f.project.id,f.archive,h));}assert.equal(A.validateAll(f.s,f.archiveHooks),true);
});
test('AC-SOC-734 archived retry source serialization and lawful later retirement preserve history while retained live disagreements reject',()=>{
 const f=pruned(ready());f.s.clock=65;f.s.providerCampaign.projects.find(p=>p.id==='connector-1').retirement={effectiveAt:61};f.s.providerCampaign.projects.find(p=>p.id==='workflow-1').retirement={effectiveAt:61};assert.equal(A.validateAll(f.s,f.archiveHooks),true);const ctx={};vm.createContext(ctx);vm.runInContext(A.source()+';globalThis.api=SOC_PROVIDER_FOLLOWUP_RETRY_ARCHIVE;',ctx);assert.equal(ctx.api.validateAll(f.s,f.archiveHooks),true);assert.equal(ctx.api.serializedBytes(f.archive),A.serializedBytes(f.archive));const live=ready();rejects(live,(s,a)=>s.portfolio.customers[0].root.interactions.find(i=>i.id===a.interactions[0].id).usageMinutes++);assert.equal(A.validateAll(f.s,f.archiveHooks),true);
});
