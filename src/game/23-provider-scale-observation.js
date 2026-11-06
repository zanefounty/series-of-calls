/* Paid Provider workload windows. Evidence is read from the native service observer. */
function socProviderScaleObservationKernel(){
 'use strict';
 const VERSION=1,CONTENT='provider-scale-observation-1',SOURCE_IDS=['progress.goal.'+'tb','uc-new:domain:workforce','uc-new:domain:journey-testing'];
 const BASELINE='paid-scale-baseline',WORKFLOW='paid-scale-workflow',MANAGED='managed-scale-workflow',MAX_RUNS=20,MAX_ATTEMPTS=400;
 const SCHEDULE=[{offsetMinute:0,tasks:2},{offsetMinute:1,tasks:2},{offsetMinute:2,tasks:2},{offsetMinute:3,tasks:1},{offsetMinute:4,tasks:1},{offsetMinute:5,tasks:1},{offsetMinute:6,tasks:1},{offsetMinute:7,tasks:1},{offsetMinute:8,tasks:1}];
 const TERMS={
  [BASELINE]:{setupCents:12000,periodCents:0,workMinutes:2,engineers:0,support:1,mode:'baseline',workflowMinutes:3,wrapMinutes:1,bpoRequired:false,earnedTbRequired:false},
  [WORKFLOW]:{setupCents:48000,periodCents:10000,workMinutes:8,engineers:1,support:1,mode:'workflow',workflowMinutes:1,wrapMinutes:0,bpoRequired:true,earnedTbRequired:false},
  [MANAGED]:{setupCents:36000,periodCents:16000,workMinutes:12,engineers:0,support:1,mode:'workflow',workflowMinutes:1,wrapMinutes:0,bpoRequired:true,earnedTbRequired:true}
 };
 const copy=x=>JSON.parse(JSON.stringify(x)),int=(x,min=0)=>Number.isSafeInteger(x)&&x>=min,exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(','),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fail=code=>{throw Error(code);};
 const terms=id=>TERMS[id]?copy(TERMS[id]):null;
 function create(){return {version:VERSION,contentVersion:CONTENT,nextId:1,runs:[]};}
 function state(s){if(!s||s.version!==VERSION||s.contentVersion!==CONTENT||!int(s.nextId,1)||!Array.isArray(s.runs)||s.runs.length>MAX_RUNS)fail('INVALID_PROVIDER_SCALE_STATE');return s;}
 function need(h,k){if(typeof h?.[k]!=='function')fail('PROVIDER_SCALE_HOOK_REQUIRED:'+k);return h[k];}
 function orderPlan(s,request,h={}){
  const blockers=[],t=TERMS[request?.operationId],customerId=request?.customerId;
  if(!exact(request,['customerId','operationId'])||!t)blockers.push('SCALE_OPERATION_REQUIRED');
  if(typeof customerId!=='string'||!need(h,'activeCustomer')(s,customerId))blockers.push('SCALE_ACTIVE_CUSTOMER_REQUIRED');
  if(t){if(t.bpoRequired&&need(h,'paidBpoCapacity')(s,customerId)!==true)blockers.push('SCALE_PAID_BPO_CAPACITY_REQUIRED');if(t.earnedTbRequired&&need(h,'earnedTbAt')(s,customerId)!==true)blockers.push('SCALE_TB_EARNED_REQUIRED');if(need(h,'workloadReady')(s,customerId,t)!==true)blockers.push('SCALE_WORKLOAD_DEPENDENCIES_REQUIRED');if(need(h,'staffAvailable')(s,t)!==true)blockers.push('SCALE_PROVIDER_STAFF_REQUIRED');}
  if(state(s).runs.filter(r=>r.customerId===customerId&&r.status==='open').length)blockers.push('SCALE_WINDOW_ALREADY_OPEN');
  if(state(s).runs.length>=MAX_RUNS)blockers.push('SCALE_RUN_CAPACITY');
  return {eligible:!blockers.length,blockers,terms:t?copy(t):null,customerId,operationId:request?.operationId||null};
 }
 function runFor(s,id){return state(s).runs.find(r=>r.id===id)||null;}
 function beginRun(s,request,project,h={}){
  state(s);const q=orderPlan(s,request,h),t=TERMS[request?.operationId];
  if(!q.eligible)fail('PROVIDER_SCALE_ORDER_BLOCKED:'+q.blockers.join(','));
  if(s.runs.some(r=>r.customerId===request.customerId&&(r.projectId===project?.id||r.postingId===project?.postingId)))fail('PROVIDER_SCALE_PROJECT_ALREADY_USED');
  if(!project||need(h,'validatePaidProject')(s,project,request.customerId,request.operationId,t)!==true)fail('PROVIDER_SCALE_PAID_PROJECT_REQUIRED');
  const window=need(h,'openNativeWindow')(s,request.customerId,'tb');
  if(!window||window.goal!=='tb'||window.status!=='open'||window.startedAt!==need(h,'clock')(s)||window.dueAt!==window.startedAt+10)fail('PROVIDER_SCALE_NATIVE_WINDOW_REQUIRED');
  const run={id:'provider-scale-'+s.nextId++,version:VERSION,customerId:request.customerId,operationId:request.operationId,status:'open',projectId:project.id,postingId:project.postingId,startedAt:window.startedAt,dueAt:window.dueAt,nativeWindowId:window.id,mode:t.mode,paidJobs:[],attempts:[],result:null};
  s.runs.push(run);if(run.mode==='workflow')emitDue(s,run.id,h);return copy(run);
 }
 function emitDue(s,runId,h={}){
  const r=runFor(state(s),runId);if(!r||r.status!=='open')fail('PROVIDER_SCALE_RUN_REQUIRED');const now=need(h,'clock')(s),offset=now-r.startedAt;if(offset<0||offset>=10)return [];
  if(r.mode!=='workflow')return [];
  const target=SCHEDULE.find(x=>x.offsetMinute===offset)?.tasks||0,existing=r.paidJobs.filter(x=>x.offsetMinute===offset).length,count=Math.max(0,target-existing),out=[];
  for(let n=0;n<count;n++){
   const id=r.id+'-job-'+(r.paidJobs.length+1);if(r.paidJobs.some(j=>j.id===id))fail('PROVIDER_SCALE_DUPLICATE_TASK');
   const task={id,runId:r.id,customerId:r.customerId,scheduledAt:now,offsetMinute:offset,sequence:r.paidJobs.length+1,mode:r.mode,durationMinutes:1,status:'scheduled',caseId:null,interactionId:null,person:null,workforceAssignment:null,startedAt:null,finishedAt:null,usageMinutes:0,usageCents:0,usagePostingId:null};
   r.paidJobs.push(task);
   const emitted=need(h,'interact')(s,copy(task));
   if(!emitted||emitted.accepted!==true||typeof emitted.interactionId!=='string'||typeof emitted.caseId!=='string'||emitted.startedAt!==now) {task.status='rejected';task.refusal=typeof emitted?.refusal==='string'?emitted.refusal:'INTERACTION_NOT_ACCEPTED';out.push(copy(task));continue;}
   task.status='started';task.interactionId=emitted.interactionId;task.caseId=emitted.caseId;task.startedAt=emitted.startedAt;out.push(copy(task));
  }
  return out;
 }
 function reconcile(s,run,h={}){
  const w=need(h,'nativeWindow')(s,run.customerId,run.nativeWindowId);if(!w||w.id!==run.nativeWindowId||w.goal!=='tb'||w.startedAt!==run.startedAt||w.dueAt!==run.dueAt)fail('PROVIDER_SCALE_NATIVE_WINDOW_MISMATCH');
  if(!Array.isArray(w.attempts)||w.attempts.length>MAX_ATTEMPTS)fail('PROVIDER_SCALE_ATTEMPT_CAPACITY');
  const attempts=w.attempts.map(a=>{
   const origin=need(h,'attemptOrigin')(s,run.customerId,a.id,run);
   if(!origin||!['ordinary-job','paid-scale-job'].includes(origin.kind)||!origin.jobId||!origin.caseId||!origin.interactionId||origin.interactionId!==a.id||!(origin.person===null||typeof origin.person==='string'&&origin.person.length>0)||!(origin.workforceAssignment===null||typeof origin.workforceAssignment==='string'&&origin.workforceAssignment.length>0)||!int(origin.startedAt)||origin.startedAt!==a.startedAt)fail('PROVIDER_SCALE_ATTEMPT_LINEAGE_REQUIRED');
   const journey=w.journeys.find(j=>j.id===a.id)||null;
   if(a.finished===true&&!journey)fail('PROVIDER_SCALE_FINISHED_JOURNEY_REQUIRED');
   return {origin:origin.kind,jobId:origin.jobId,caseId:origin.caseId,interactionId:origin.interactionId,person:a.finished===true?(journey.person||journey.agent||null):null,workforceAssignment:a.finished===true?(journey.workforceAssignment||null):null,startedAt:origin.startedAt,finished:a.finished===true,success:a.success===true,journey:journey?copy(journey):null};
  });
  return {window:copy(w),attempts};
 }
 function advance(s,runId,h={}){
  const p=state(s),r=runFor(p,runId);if(!r)fail('PROVIDER_SCALE_RUN_REQUIRED');
  const snapshot=reconcile(p,r,h);r.attempts=snapshot.attempts;settlePaidJobs(p,r,h);
  if(snapshot.window.status!=='open')return finalize(p,runId,h);
  return {status:'open',run:copy(r),native:snapshot.window.result||null};
 }
 function settlePaidJobs(s,r,h={}){
  for(const job of r.paidJobs.filter(x=>x.status==='started')){
   const i=need(h,'interaction')(s,r.customerId,job.interactionId);if(!i||i.id!==job.interactionId||i.caseId!==job.caseId||i.startedAt!==job.startedAt)fail('PROVIDER_SCALE_INTERACTION_LINEAGE_REQUIRED');
   job.person=i.agent||null;job.workforceAssignment=i.workforceAssignment||null;
   if(!int(i.finishedAt))continue;
   const usage=need(h,'usage')(s,r.customerId,i);if(!usage||!int(usage.minutes)||!int(usage.cents)||usage.minutes!==(i.usageMinutes||0))fail('PROVIDER_SCALE_USAGE_EVIDENCE_REQUIRED');
   if(usage.minutes>0){const posting=need(h,'postUsage')(s,r,job,i,usage);if(!posting||typeof posting.postingId!=='string'||posting.cents!==usage.cents||posting.units!==usage.minutes)fail('PROVIDER_SCALE_CENTRAL_USAGE_POSTING_REQUIRED');job.usagePostingId=posting.postingId;job.usageCents=posting.cents;job.usageMinutes=posting.units;}
   job.finishedAt=i.finishedAt;const observed=r.attempts.find(a=>a.interactionId===job.interactionId);job.status=i.phase==='resolved'&&observed?.success===true&&observed?.journey?.human===true?'completed':'failed';
  }
 }
 function evaluateRun(s,r,h={}){
  const snapshot=reconcile(s,r,h),native=snapshot.window.result;
  const project=need(h,'project')(s,r.customerId,r.projectId),paid=need(h,'validatePaidProject')(s,project,r.customerId,r.operationId,TERMS[r.operationId])===true;
  const checks={nativeWindow:native?.checks||null,paidProject:paid,allAttemptsRetained:snapshot.attempts.length===snapshot.window.attempts.length,attemptsHaveLineage:snapshot.attempts.every(a=>a.jobId&&a.caseId&&a.interactionId),nativePassed:native?.status==='passed'};
  const paidUsageCents=r.paidJobs.reduce((n,j)=>n+j.usageCents,0),ordinaryCount=snapshot.attempts.filter(a=>a.origin==='ordinary-job').length,paidCount=snapshot.attempts.filter(a=>a.origin==='paid-scale-job').length;
  return {status:Object.values(checks).every(v=>v===true||v&&typeof v==='object'&&Object.values(v).every(Boolean))?'passed':'failed',checks,counts:{attempts:snapshot.attempts.length,completed:snapshot.attempts.filter(a=>a.finished).length,successful:snapshot.attempts.filter(a=>a.success).length,ordinary:ordinaryCount,paid:paidCount,paidJobs:r.paidJobs.length,paidUsageMinutes:r.paidJobs.reduce((n,j)=>n+j.usageMinutes,0),paidUsageCents,usagePostingIds:r.paidJobs.map(j=>j.usagePostingId).filter(Boolean)},commercial:{setupCents:project?.setupCents??TERMS[r.operationId].setupCents,periodCents:project?.periodCents??TERMS[r.operationId].periodCents,paidUsageCents}};
 }
 function finalize(s,runId,h={}){
  const r=runFor(state(s),runId);if(!r)fail('PROVIDER_SCALE_RUN_REQUIRED');const native=need(h,'nativeWindow')(s,r.customerId,r.nativeWindowId);if(!native||native.status==='open')return {status:'open',run:copy(r)};
  const result=evaluateRun(s,r,h);r.status=result.status;r.result=result;return {status:r.status,run:copy(r),result:copy(result)};
 }
 function validate(s,h={}){
  state(s);const ids=new Set(),projectIds=new Set(),postingIds=new Set();for(const r of s.runs){if(!exact(r,['id','version','customerId','operationId','status','projectId','postingId','startedAt','dueAt','nativeWindowId','mode','paidJobs','attempts','result'])||!/^provider-scale-[1-9][0-9]*$/.test(r.id)||ids.has(r.id)||r.version!==VERSION||!TERMS[r.operationId]||r.mode!==TERMS[r.operationId].mode||!int(r.startedAt)||r.dueAt!==r.startedAt+10||!int(r.dueAt)||!Array.isArray(r.attempts)||r.attempts.length>MAX_ATTEMPTS||!['open','passed','failed'].includes(r.status)||typeof r.projectId!=='string'||typeof r.postingId!=='string')fail('INVALID_PROVIDER_SCALE_RUN');ids.add(r.id);
   const projectKey=r.customerId+':'+r.projectId,postingKey=r.customerId+':'+r.postingId;if(projectIds.has(projectKey)||postingIds.has(postingKey))fail('PROVIDER_SCALE_PROJECT_ALREADY_USED');projectIds.add(projectKey);postingIds.add(postingKey);
   const prior=new Set();for(const a of r.attempts){if(!exact(a,['origin','jobId','caseId','interactionId','person','workforceAssignment','startedAt','finished','success','journey'])||!['ordinary-job','paid-scale-job'].includes(a.origin)||![a.jobId,a.caseId,a.interactionId].every(x=>typeof x==='string'&&x.length>0)||!(a.person===null||typeof a.person==='string'&&a.person.length>0)||!(a.workforceAssignment===null||typeof a.workforceAssignment==='string'&&a.workforceAssignment.length>0)||!int(a.startedAt,r.startedAt)||a.startedAt>r.dueAt||typeof a.finished!=='boolean'||typeof a.success!=='boolean'||prior.has(a.interactionId)||a.success&&!a.finished||a.finished&&(!a.journey||a.journey.id!==a.interactionId||a.journey.success!==a.success))fail('INVALID_PROVIDER_SCALE_ATTEMPT');prior.add(a.interactionId);}
   if(!Array.isArray(r.paidJobs)||r.paidJobs.length>MAX_ATTEMPTS||r.mode==='baseline'&&r.paidJobs.length>0)fail('INVALID_PROVIDER_SCALE_JOBS');const jobIds=new Set(),interactions=new Set(),byOffset={};for(const j of r.paidJobs){const nullableString=x=>x===null||typeof x==='string'&&x.length>0;if(!exact(j,['id','runId','customerId','scheduledAt','offsetMinute','sequence','mode','durationMinutes','status','caseId','interactionId','person','workforceAssignment','startedAt','finishedAt','usageMinutes','usageCents','usagePostingId',...(j.status==='rejected'?['refusal']:[])])||j.runId!==r.id||j.customerId!==r.customerId||j.id!==`${r.id}-job-${j.sequence}`||jobIds.has(j.id)||j.mode!==r.mode||j.durationMinutes!==1||!['scheduled','started','completed','failed','rejected'].includes(j.status)||!int(j.scheduledAt,r.startedAt)||j.offsetMinute!==j.scheduledAt-r.startedAt||j.offsetMinute<0||j.offsetMinute>8||!int(j.sequence,1)||j.sequence!==r.paidJobs.indexOf(j)+1||!int(j.usageMinutes)||!int(j.usageCents)||!nullableString(j.caseId)||!nullableString(j.interactionId)||!nullableString(j.person)||!nullableString(j.workforceAssignment)||j.status==='scheduled'&&(j.caseId!==null||j.interactionId!==null||j.person!==null||j.workforceAssignment!==null||j.startedAt!==null||j.finishedAt!==null||j.usageMinutes!==0||j.usageCents!==0||j.usagePostingId!==null)||['started','completed','failed'].includes(j.status)&&(!j.caseId||!j.interactionId)||j.status==='rejected'&&(j.caseId!==null||j.interactionId!==null||j.person!==null||j.workforceAssignment!==null||j.startedAt!==null||j.finishedAt!==null||j.usageMinutes!==0||j.usageCents!==0||j.usagePostingId!==null||typeof j.refusal!=='string'||j.refusal.length===0)||j.status==='started'&&(!int(j.startedAt)||j.finishedAt!==null||j.usageMinutes!==0||j.usageCents!==0||j.usagePostingId!==null)||['completed','failed'].includes(j.status)&&(!int(j.startedAt)||!int(j.finishedAt,j.startedAt)||!j.usagePostingId&&j.usageMinutes>0||j.usageMinutes===0&&j.usageCents!==0||j.usageMinutes===0&&j.usagePostingId!==null)||j.status==='completed'&&(!j.person||!j.workforceAssignment))fail('INVALID_PROVIDER_SCALE_PAID_JOB');byOffset[j.offsetMinute]=(byOffset[j.offsetMinute]||0)+1;const scheduled=SCHEDULE.find(x=>x.offsetMinute===j.offsetMinute)?.tasks||0;if(byOffset[j.offsetMinute]>scheduled)fail('INVALID_PROVIDER_SCALE_SCHEDULE');jobIds.add(j.id);if(j.interactionId){if(interactions.has(j.interactionId))fail('INVALID_PROVIDER_SCALE_PAID_JOB_DUPLICATE');interactions.add(j.interactionId);}}
   const live=reconcile(s,r,h);if(!same(r.attempts,live.attempts))fail('INVALID_PROVIDER_SCALE_ATTEMPT_HISTORY');validatePaidJobs(s,r,h,live);
   if(r.status==='open'&&r.result!==null||r.status!=='open'&&(!r.result||!['passed','failed'].includes(r.result.status)))fail('INVALID_PROVIDER_SCALE_RESULT');if(r.status!=='open'&&!same(r.result,evaluateRun(s,r,h)))fail('INVALID_PROVIDER_SCALE_RESULT');
   const paidProject=need(h,'project')(s,r.customerId,r.projectId);if(!paidProject||paidProject.id!==r.projectId||paidProject.postingId!==r.postingId||need(h,'validatePaidProject')(s,paidProject,r.customerId,r.operationId,TERMS[r.operationId])!==true||h.projectAt&&!h.projectAt(s,r.customerId,r.projectId,r.postingId,r.operationId))fail('INVALID_PROVIDER_SCALE_PAID_PROJECT');
  }
  if(s.nextId!==s.runs.length+1||s.runs.some((r,i)=>r.id!=='provider-scale-'+(i+1)))fail('INVALID_PROVIDER_SCALE_SEQUENCE');return true;
 }
 function validatePaidJobs(s,r,h,live){
  const paidAttempts=new Map(live.attempts.filter(a=>a.origin==='paid-scale-job').map(a=>[a.interactionId,a]));
  for(const job of r.paidJobs){if(!['started','completed','failed'].includes(job.status))continue;const interaction=need(h,'interaction')(s,r.customerId,job.interactionId);if(!interaction||interaction.id!==job.interactionId||interaction.caseId!==job.caseId||interaction.startedAt!==job.startedAt||job.startedAt!==job.scheduledAt||interaction.durationMinutes!==job.durationMinutes||(interaction.finishedAt??null)!==job.finishedAt||interaction.agent!==(job.person||undefined)||interaction.workforceAssignment!==(job.workforceAssignment||undefined))fail('INVALID_PROVIDER_SCALE_PAID_JOB_LINEAGE');
   const attempt=paidAttempts.get(job.interactionId);if(attempt&&(attempt.jobId!==job.id||attempt.caseId!==job.caseId)||['completed','failed'].includes(job.status)&&!attempt)fail('INVALID_PROVIDER_SCALE_PAID_JOB_ATTEMPT');
   if(job.status==='started'&&int(interaction.finishedAt)||['completed','failed'].includes(job.status)&&!int(interaction.finishedAt))fail('INVALID_PROVIDER_SCALE_PAID_JOB_STATUS');const attemptIsGood=attempt?.success===true&&attempt.journey?.human===true;if(job.status==='completed'&&(interaction.phase!=='resolved'||!attemptIsGood)||job.status==='failed'&&attemptIsGood&&interaction.phase==='resolved')fail('INVALID_PROVIDER_SCALE_PAID_JOB_OUTCOME');
   const usage=need(h,'usage')(s,r.customerId,interaction);if(!usage||!int(usage.minutes)||!int(usage.cents)||usage.minutes!==(interaction.usageMinutes||0)||job.status==='started'&&(job.usageMinutes!==0||job.usageCents!==0||job.usagePostingId!==null)||job.status!=='started'&&(job.usageMinutes!==usage.minutes||job.usageCents!==usage.cents))fail('INVALID_PROVIDER_SCALE_PAID_USAGE');
   if(job.status!=='started'&&usage.minutes>0&&need(h,'validateUsagePosting')(s,r,job,interaction,{postingId:job.usagePostingId,cents:job.usageCents,units:job.usageMinutes})!==true)fail('INVALID_PROVIDER_SCALE_USAGE_POSTING');
  }
 }
 function pins(s,customerId){const runs=state(s).runs.filter(r=>r.customerId===customerId);return {version:1,runIds:runs.map(r=>r.id),projectIds:[...new Set(runs.map(r=>r.projectId))],postingIds:[...new Set(runs.map(r=>r.postingId))],usagePostingIds:[...new Set(runs.flatMap(r=>r.paidJobs.map(j=>j.usagePostingId).filter(Boolean)))],nativeWindowIds:runs.map(r=>r.nativeWindowId),caseIds:[...new Set(runs.flatMap(r=>[...r.attempts.map(a=>a.caseId),...r.paidJobs.map(j=>j.caseId).filter(Boolean)]))],interactionIds:[...new Set(runs.flatMap(r=>[...r.attempts.map(a=>a.interactionId),...r.paidJobs.map(j=>j.interactionId).filter(Boolean)]))],jobIds:[...new Set(runs.flatMap(r=>[...r.attempts.map(a=>a.jobId),...r.paidJobs.map(j=>j.id)]))]};}
 const source=()=>`const SOC_PROVIDER_SCALE_OBSERVATION=(${socProviderScaleObservationKernel.toString()})();`;
 return {VERSION,CONTENT,SOURCE_IDS,BASELINE,WORKFLOW,MANAGED,MAX_RUNS,MAX_ATTEMPTS,SCHEDULE:copy(SCHEDULE),terms,create,orderPlan,beginRun,emitDue,advance,finalize,evaluateRun,validate,pins,source};
}
const SOC_PROVIDER_SCALE_OBSERVATION=socProviderScaleObservationKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_SCALE_OBSERVATION;
