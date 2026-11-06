/* Versioned Provider L8 adapter. Pure plans/receipts; paid dispatch and billing belong to the coordinator. */
function socProviderCaseFollowupKernel(){
 'use strict';
 const VERSION=1,SOURCE_ID='progress.progression-level.8',DIRECT='direct-case-followup',MANAGED='managed-case-followup',RETRY='retry-case-followup',CONNECTOR='cisco-programmable-engagement',CODE='PROVIDER_CASE_FOLLOWUP';
 const TERMS={ [DIRECT]:{setupCents:18000,periodCents:4000,workMinutes:5,engineers:1,support:1},[MANAGED]:{setupCents:9000,periodCents:6500,workMinutes:7,engineers:0,support:1},[RETRY]:{setupCents:4000,periodCents:0,workMinutes:2,engineers:0,support:1}};
 const copy=x=>JSON.parse(JSON.stringify(x)),fail=()=>{throw Error('INVALID_PROVIDER_CASE_FOLLOWUP');},int=(x,min=0)=>Number.isSafeInteger(x)&&x>=min,id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(x),exact=(x,ks)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...ks].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x,same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function need(h,key){if(typeof h[key]!=='function')throw Error('PROVIDER_FOLLOWUP_HOOK_REQUIRED:'+key);return h[key];}
 const terms=id=>TERMS[id]?copy(TERMS[id]):null;
 const customer=(s,id)=>s.providerCampaign?.customers?.find(c=>c.id===id),job=(s,r)=>s.providerCampaign?.jobs?.find(j=>j.id===r.jobId&&j.customerId===r.customerId);
 function version(s){return s.providerCampaign?.contentVersion==='provider-campaigns-8'&&s.providerCampaign.caseFollowupVersion===VERSION;}
 function paid(s,c,at,h,kind){
  const f=need(h,kind==='workflow'?'workflowAt':'connectorAt')(s,c,at),p=f&&s.providerCampaign.projects.find(p=>p.id===f.projectId),allowed=kind==='workflow'?[DIRECT,MANAGED]:[CONNECTOR];
  if(!f||f.ready!==true||!p||!allowed.includes(p.operationId)||p.customerId!==c||p.postingId!==f.postingId||p.status!=='complete'||!int(p.completedAt)||p.completedAt>at||p.retirement?.effectiveAt<=at||need(h,'paidProject')(s,p,at)!==true)return null;
  if(kind==='workflow'&&(!Object.keys(TERMS[p.operationId]).every(k=>p[k]===TERMS[p.operationId][k])||!int(p.acceptedAt)||p.completedAt<p.acceptedAt+p.workMinutes||p.operationId===MANAGED&&need(h,'earnedAt')(s,c,SOURCE_ID,p.acceptedAt)!==true))return null;
  if(kind==='connector'&&(!int(f.generation,1)||!f.configuration||typeof f.configuration!=='object'||Array.isArray(f.configuration)))return null;
  return {projectId:p.id,postingId:p.postingId,operationId:p.operationId,completedAt:p.completedAt,...(kind==='connector'?{generation:f.generation,configuration:copy(f.configuration)}:{})};
 }
 function canOrder(s,r,h={}){
  const blockers=[],c=customer(s,r.customerId),t=terms(r.operationId);
  if(!version(s))blockers.push('FOLLOWUP_VERSION_REQUIRED');
  if(!exact(r,['customerId','operationId'])||![DIRECT,MANAGED].includes(r.operationId)||!t)blockers.push('FOLLOWUP_OPERATION_REQUIRED');
  if(!c||c.scenario!=='smb'||c.status!=='active')blockers.push('FOLLOWUP_CUSTOMER_REQUIRED');
  if(c){if(!paid(s,c.id,s.clock,h,'connector'))blockers.push('FOLLOWUP_PAID_CONNECTOR_REQUIRED');if(need(h,'boundaryAt')(s,c.id,s.clock)!==true)blockers.push('FOLLOWUP_BOUNDARY_REQUIRED');if(need(h,'humanReady')(s,c.id)!==true)blockers.push('FOLLOWUP_HUMAN_REQUIRED');if(r.operationId===MANAGED&&need(h,'earnedAt')(s,c.id,SOURCE_ID,s.clock)!==true)blockers.push('FOLLOWUP_EARNED_MARKET_REQUIRED');}
  return {eligible:!blockers.length,blockers,terms:t};
 }
 function operationPlan(s,r,h={}){const q=canOrder(s,r,h);if(!q.eligible)fail();const c=customer(s,r.customerId);return {version:VERSION,customerId:c.id,market:c.market,operationId:r.operationId,acceptedAt:s.clock,terms:q.terms,connector:paid(s,c.id,s.clock,h,'connector'),sourceId:r.operationId===MANAGED?SOURCE_ID:null};}
 const authoredKeys=['version','planAt','caseIndex','caseId','person','consented','connectorId','account','template','to','deadlineAt'];
 function authored(s,j,h){
  const a=need(h,'authoredCase')(s,j.customerId,j);
  if(!exact(a,authoredKeys)||a.version!==1||!int(a.planAt)||a.planAt>j.arrivalAt||a.planAt<j.periodIndex*60||!int(a.caseIndex)||a.caseIndex>=24||a.caseId!==j.caseId||!id(a.person)||a.consented!==true||a.connectorId!=='social-messaging'||a.account!=='chatterleaf'||a.template!=='service-outside-window'||a.to!=='+61255500201'||a.deadlineAt!==j.deadlineAt||!int(j.arrivalAt)||!int(j.deadlineAt,j.arrivalAt+1)||j.deadlineAt>(j.periodIndex+1)*60)fail();
  return copy(a);
 }
 function reserve(s,j,h={}){
  const c=customer(s,j.customerId),root=need(h,'customerRoot')(s,j.customerId),i=root?.interactions?.find(i=>i.id===j.interactionId),a=authored(s,j,h),workflow=paid(s,j.customerId,j.arrivalAt,h,'workflow');
  if(!version(s)||!c||c.scenario!=='smb'||!['active','renewal'].includes(c.status)||s.clock!==j.arrivalAt||j.channel!=='voice'||j.handoff||j.handoffPlan||j.resilienceSequence||j.followup||j.status!=='pending'||j.settled||!workflow||!root||!i||i.from!==a.person||i.caseId!==j.caseId||i.tenant!==root.tenant||i.startedAt!==j.arrivalAt||i.probe===true||i.intent==='test-emergency'||i.emergency===true||i.scope!=='tenant'||i.obligations?.length||root.providerCustomer?.recording===true||s.providerCampaign.jobs.some(x=>x!==j&&x.customerId===j.customerId&&x.periodIndex===j.periodIndex&&x.followup))fail();
  return {version:VERSION,customerId:j.customerId,jobId:j.id,caseId:j.caseId,tenant:root.tenant,person:a.person,periodIndex:j.periodIndex,arrivalAt:j.arrivalAt,deadlineAt:j.deadlineAt,sourceInteractionId:j.interactionId,workflow,authored:a,attempts:[]};
 }
 const receiptKeys=['version','customerId','jobId','caseId','tenant','person','periodIndex','arrivalAt','deadlineAt','sourceInteractionId','workflow','authored','attempts'];
 function trace(i,code){return (i.trace||[]).filter(t=>t.code===code&&int(t.at)&&t.at>=i.startedAt&&t.at<=i.finishedAt);}
 function human(i,voice){
  if(!i||i.probe===true||i.phase!=='resolved'||i.outcome!=='RESOLVED'||!i.agent||i.context!==true||i.obligations?.length!==0||!int(i.startedAt)||!int(i.finishedAt,i.startedAt+1))return false;
  const assigned=trace(i,'AGENT_ASSIGNED').find(t=>t.agent===i.agent),wrap=trace(i,'WRAP_UP').find(t=>t.agent===i.agent);
  if(!assigned||!wrap||wrap.at<assigned.at||!trace(i,'RESOLVED').length)return false;
  return voice?i.channel==='voice'&&i.intent!=='test-emergency'&&i.emergency!==true&&i.media?.in===true&&i.media?.out===true&&int(i.durationMinutes,1)&&wrap.at-assigned.at>=i.durationMinutes&&int(i.usageMinutes,i.durationMinutes)&&trace(i,'CARRIER_PATH_ADMITTED').length>0&&trace(i,'MEDIA_PATHS').some(t=>t.in===true&&t.out===true):i.channel==='message'&&trace(i,'HUMAN_HANDOFF').length>0&&trace(i,'DELIVERY_CONFIRMED').length>0&&trace(i,'CHANNEL_DELIVERY_RECORDED').length>0;
 }
 function retry(s,j,r,at,h){
  const x=need(h,'retryAt')(s,j.customerId,j.id,at),p=x&&s.providerCampaign.projects.find(p=>p.id===x.projectId),previous=r.attempts.at(-1),root=need(h,'customerRoot')(s,j.customerId),i=root.interactions.find(i=>i.id===previous?.interactionId);
  if(!x||!p||p.operationId!==RETRY||p.customerId!==j.customerId||p.postingId!==x.postingId||p.config?.jobId!==j.id||p.status!=='complete'||!int(p.completedAt)||p.completedAt>at||!i||i.phase!=='failed'||!int(i.finishedAt)||!int(p.acceptedAt)||p.acceptedAt<i.finishedAt||p.completedAt<p.acceptedAt+TERMS[RETRY].workMinutes||!Object.keys(TERMS[RETRY]).every(k=>p[k]===TERMS[RETRY][k])||need(h,'paidProject')(s,p,at)!==true)return null;
  return {projectId:p.id,postingId:p.postingId};
 }
 function validateJob(s,j,h={}){
  const r=j.followup,root=need(h,'customerRoot')(s,j.customerId),c=customer(s,j.customerId),source=root?.interactions?.find(i=>i.id===j.interactionId),bound=root?.cases?.[j.caseId];
  if(!version(s)||!exact(r,receiptKeys)||r.version!==1||!c||c.scenario!=='smb'||j.channel!=='voice'||j.handoff||j.handoffPlan||j.resilienceSequence||!source||j.id!==r.jobId||j.customerId!==r.customerId||j.caseId!==r.caseId||j.periodIndex!==r.periodIndex||j.arrivalAt!==r.arrivalAt||j.deadlineAt!==r.deadlineAt||j.interactionId!==r.sourceInteractionId||r.tenant!==root.tenant||r.person!==source.from||source.caseId!==r.caseId||source.tenant!==r.tenant||source.startedAt!==r.arrivalAt||source.channel!=='voice'||source.probe===true||source.scope!=='tenant'||source.intent==='test-emergency'||source.emergency===true||!same(r.authored,authored(s,j,h))||!same(r.workflow,paid(s,j.customerId,j.arrivalAt,h,'workflow'))||bound?.identity!==r.person||bound?.tenant!==r.tenant||!bound.interactions.includes(source.id)||!Array.isArray(r.attempts)||r.attempts.length>2)fail();
  let prior=source;const ids=new Set([source.id]);
  for(let n=0;n<r.attempts.length;n++){
   const a=r.attempts[n],target=root.interactions.find(i=>i.id===a.interactionId);
   if(!exact(a,['interactionId','at','connector','retry'])||!id(a.interactionId)||ids.has(a.interactionId)||!int(a.at)||a.at>s.clock||a.at>=r.deadlineAt||!human(source,true)||a.at<source.finishedAt||!target||target.channel!=='message'||target.from!==r.person||target.caseId!==r.caseId||target.tenant!==r.tenant||target.scope!=='tenant'||target.probe===true||target.startedAt!==a.at||target.to!==r.authored.to||target.account!==r.authored.account||target.template!==r.authored.template||target.purpose!=='service'||!bound.interactions.includes(target.id)||!same(a.connector,paid(s,j.customerId,a.at,h,'connector'))||!a.connector||need(h,'consentAt')(s,j.customerId,r.person,r.caseId,a.at)!==true||need(h,'boundaryAt')(s,j.customerId,a.at)!==true)fail();
   if(n===0?a.retry!==null:!a.retry||prior.phase!=='failed'||!int(prior.finishedAt)||a.at<prior.finishedAt||!same(a.retry,retry(s,j,{...r,attempts:r.attempts.slice(0,n)},a.at,h)))fail();
   const details={version:1,jobId:j.id,caseId:j.caseId,sourceInteractionId:source.id,attempt:n+1};
   if(target.trace?.filter(t=>t.code===CODE&&t.at===a.at&&same(t.detail,details)).length!==1)fail();ids.add(a.interactionId);prior=target;
  }
  return true;
 }
 function observe(s,j,h={}){
  validateJob(s,j,h);const r=j.followup,root=need(h,'customerRoot')(s,j.customerId),source=root.interactions.find(i=>i.id===j.interactionId),targets=r.attempts.map(a=>root.interactions.find(i=>i.id===a.interactionId)),last=targets.at(-1),accepted=targets.filter(i=>i.trace?.some(t=>t.code==='CHANNEL_ACCEPTED')).map(i=>i.id),completed=human(source,true)&&human(last,false);
  if(completed&&need(h,'connectorAccepted')(s,j.customerId,last,r.attempts.at(-1).connector)!==true)fail();
  const status=completed?(last.finishedAt<=j.deadlineAt?'completed':'late'):s.clock>j.deadlineAt||source.phase==='failed'?'failed':'pending';
  return {status,phase:completed?'complete':!human(source,true)?'voice':!last?'awaiting-followup':last.phase==='failed'?'retry-required':'digital',completedAt:completed?last.finishedAt:null,voiceMinutes:source.usageMinutes||0,acceptedMessageIds:accepted,messageUnits:accepted.length,obligationCount:1,deadlineAt:j.deadlineAt};
 }
 function eligibility(s,r,h={}){
  if(!exact(r,['action','customerId','jobId'])||!['followup-case','retry-case-followup'].includes(r.action))return {eligible:false,blockers:['FOLLOWUP_REQUEST_REQUIRED']};
  const j=job(s,r);if(!j?.followup)return {eligible:false,blockers:['FOLLOWUP_RESERVED_CASE_REQUIRED']};
  validateJob(s,j,h);const o=observe(s,j,h),root=need(h,'customerRoot')(s,r.customerId),source=root.interactions.find(i=>i.id===j.interactionId),blockers=[],second=r.action==='retry-case-followup';
  if(j.settled||j.status!=='pending'||s.clock>=j.deadlineAt||!human(source,true)||(!second&&j.followup.attempts.length!==0)||(second&&(j.followup.attempts.length!==1||o.phase!=='retry-required')))blockers.push('FOLLOWUP_PHASE_REQUIRED');
  const connector=paid(s,r.customerId,s.clock,h,'connector');if(!connector)blockers.push('FOLLOWUP_PAID_CONNECTOR_REQUIRED');
  if(need(h,'consentAt')(s,r.customerId,j.followup.person,j.caseId,s.clock)!==true)blockers.push('FOLLOWUP_CONSENT_REQUIRED');if(need(h,'boundaryAt')(s,r.customerId,s.clock)!==true)blockers.push('FOLLOWUP_BOUNDARY_REQUIRED');if(need(h,'humanReady')(s,r.customerId)!==true)blockers.push('FOLLOWUP_HUMAN_REQUIRED');
  const retryReceipt=second?retry(s,j,j.followup,s.clock,h):null;if(second&&!retryReceipt)blockers.push('FOLLOWUP_PAID_RETRY_REQUIRED');
  return {eligible:!blockers.length,blockers,connector,retry:retryReceipt,observation:o};
 }
 function quoteDetails(s,r,h={}){const q=eligibility(s,r,h),j=job(s,r),fundingRequired=r.action==='retry-case-followup'&&q.blockers.includes('FOLLOWUP_PAID_RETRY_REQUIRED'),canFundRetry=!!j&&s.clock+TERMS[RETRY].workMinutes<j.deadlineAt,blockers=q.blockers.filter(x=>!fundingRequired||x!=='FOLLOWUP_PAID_RETRY_REQUIRED');if(fundingRequired&&!canFundRetry)blockers.push('FOLLOWUP_RETRY_DEADLINE_REQUIRED');return {...q,eligible:blockers.length===0,blockers,fundingRequired,caseId:j?.caseId||null,deadlineAt:j?.deadlineAt??null,person:j?.followup?.person||null,incrementalSetupCents:fundingRequired?TERMS[RETRY].setupCents:0,retryWorkMinutes:fundingRequired?TERMS[RETRY].workMinutes:0,deadlineExtensionMinutes:0,billing:'actual-voice-usage-and-each-accepted-message-attempt',canFundRetry};}
 function startPlan(s,r,h={}){const q=eligibility(s,r,h);if(!q.eligible)fail();const j=job(s,r),f=j.followup;return {version:1,at:s.clock,customerId:j.customerId,jobId:j.id,connector:q.connector,retry:q.retry,interaction:{channel:'message',from:f.person,to:f.authored.to,caseId:j.caseId,account:f.authored.account,template:f.authored.template,purpose:'service'},trace:{code:CODE,at:s.clock,detail:{version:1,jobId:j.id,caseId:j.caseId,sourceInteractionId:j.interactionId,attempt:f.attempts.length+1}}};}
 function recordAttempt(s,r,plan,interactionId,h={}){if(!same(plan,startPlan(s,r,h)))fail();const j=job(s,r),next=copy(j.followup);next.attempts.push({interactionId,at:plan.at,connector:copy(plan.connector),retry:plan.retry?copy(plan.retry):null});validateJob(s,{...j,followup:next},h);return next;}
 function validate(s,h={}){if(!s.providerCampaign)return true;if(s.providerCampaign.caseFollowupVersion!==undefined&&!version(s))fail();const ids=new Set();for(const j of s.providerCampaign.jobs||[])if(j.followup){validateJob(s,j,h);const o=observe(s,j,h);if(j.status!==o.status||j.completedAt!==o.completedAt||j.voiceMinutes!==o.voiceMinutes||j.messageUnits!==o.messageUnits)fail();for(const i of [j.interactionId,...j.followup.attempts.map(a=>a.interactionId)]){const k=j.customerId+'\0'+i;if(ids.has(k))fail();ids.add(k);}}return true;}
 function evidence(s,customerId,h={}){for(const j of s.providerCampaign?.jobs||[]){if(j.customerId!==customerId||!j.followup||j.settled!==true)continue;const o=observe(s,j,h);if(!['completed','late'].includes(o.status)||j.status!==o.status||j.completedAt!==o.completedAt||j.voiceMinutes!==o.voiceMinutes||j.messageUnits!==o.messageUnits)continue;const root=need(h,'customerRoot')(s,customerId);const c=customer(s,customerId);if(!c?.portfolioId||!c.market)continue;return {kind:'provider-case-followup-proof',version:1,sourceId:SOURCE_ID,customerId,portfolioId:c.portfolioId,market:c.market,jobId:j.id,interactionIds:[j.interactionId,...j.followup.attempts.map(a=>a.interactionId)],period:j.periodIndex,interval:{from:j.arrivalAt,to:j.completedAt},job:copy(j),voice:copy(root.interactions.find(i=>i.id===j.interactionId)),digital:copy(root.interactions.find(i=>i.id===j.followup.attempts.at(-1).interactionId)),observation:o};}return null;}
 function evaluate(s,customerId,h={}){try{const e=version(s)?evidence(s,customerId,h):null;return {status:e?'ready':'incomplete',missing:e?[]:['SETTLED_SAME_CASE_HUMAN_VOICE_AND_DIGITAL_REQUIRED'],evidence:e};}catch{return {status:'incomplete',missing:['VALIDATED_PAID_FOLLOWUP_HISTORY_REQUIRED'],evidence:null};}}
 function validateEvidence(s,e,h={}){try{return !!e&&same(e,evidence({...s,providerCampaign:{...s.providerCampaign,jobs:(s.providerCampaign.jobs||[]).filter(j=>j.id===e.job?.id)}},e.customerId,h));}catch{return false;}}
 function pins(s,customerId){const jobs=(s.providerCampaign?.jobs||[]).filter(j=>j.customerId===customerId&&j.followup);return {jobIds:jobs.map(j=>j.id),caseIds:[...new Set(jobs.map(j=>j.caseId))],interactionIds:[...new Set(jobs.flatMap(j=>[j.interactionId,...j.followup.attempts.map(a=>a.interactionId)]))]};}
 const source=()=>`const SOC_PROVIDER_CASE_FOLLOWUP=(${socProviderCaseFollowupKernel.toString()})();`;
 return {VERSION,SOURCE_ID,DIRECT,MANAGED,RETRY,CONNECTOR,CODE,terms,canOrder,operationPlan,reserve,eligibility,quoteDetails,startPlan,recordAttempt,observe,validate,validateJob,evaluate,evidence,validateEvidence,pins,source};
}
const SOC_PROVIDER_CASE_FOLLOWUP=socProviderCaseFollowupKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_CASE_FOLLOWUP;
