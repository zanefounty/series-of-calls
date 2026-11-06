/* One authored Provider case may change channel; its workload and bill remain singular.
 * Required hooks resolve trusted runtime facts. This module does not grant product access.
 */
function socProviderCaseHandoffKernel(){
 'use strict';
 const VERSION=1,OPERATION_ID='cisco-programmable-engagement',CONNECTOR_ID='social-messaging',CODE='PROVIDER_CASE_HANDOFF';
 const copy=x=>JSON.parse(JSON.stringify(x)),integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}):x;
 const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 const fail=code=>{throw new Error(code||'INVALID_PROVIDER_CASE_HANDOFF');};
 const demand=()=>typeof SOC_PROVIDER_DEMAND!=='undefined'?SOC_PROVIDER_DEMAND:require('./22-provider-demand.js');
 const need=(hooks,key)=>{if(typeof hooks[key]!=='function')fail('PROVIDER_HANDOFF_HOOK_REQUIRED');return hooks[key];};
 const jobFor=(s,r)=>s.providerCampaign?.jobs?.find(j=>j.id===r.jobId&&j.customerId===r.customerId);
 const customerFor=(s,id)=>s.providerCampaign?.customers?.find(c=>c.id===id);
 const sourceFor=(root,j)=>root?.interactions?.find(i=>i.id===j.interactionId);
 const talking=i=>!!i.agent||i.trace?.some(t=>['AGENT_ASSIGNED','CONVERSATION_STARTED','WRAP_UP'].includes(t.code));
 const admitted=i=>i.trace?.some(t=>t.code==='CARRIER_PATH_ADMITTED'&&['inbound','outbound'].includes(t.direction));
 function canonicalPlan(s,customerId,j,hooks){
  const plan=need(hooks,'demandPlan')(s,customerId,j);
  if(!plan||!integer(plan.at,j.periodIndex*60,j.arrivalAt)||plan.request?.handoffVersion!==1||plan.request.customerId!==customerId||plan.request.periodIndex!==j.periodIndex||plan.request.scenario!=='smb'||plan.request.seed!==s.providerCampaign.seed)fail();
  const selected=demand().handoffFor(plan.request,j.caseId);
  if(!selected||selected.handoffPreference!=='socialMessaging'||selected.channel!=='voice'||selected.connectorId!==CONNECTOR_ID||selected.operationId!==OPERATION_ID||j.arrivalAt!==j.periodIndex*60+selected.arrivalAt)fail();
  return {plan,selected};
 }
 function capability(s,customerId,at,hooks){
  const fact=need(hooks,'capabilityAt')(s,customerId,at);
  if(!fact||fact.ready!==true)return null;
  const project=s.providerCampaign.projects.find(p=>p.id===fact.projectId);
  if(!project||project.customerId!==customerId||project.productId!==OPERATION_ID||project.operationId!==OPERATION_ID||project.status!=='complete'||!integer(project.completedAt,0,at)||project.postingId!==fact.postingId||fact.deploymentId!=='d-'+OPERATION_ID||project.retirement?.effectiveAt<=at)return null;
  return {projectId:project.id,postingId:project.postingId,deploymentId:fact.deploymentId};
 }
 function eligibility(s,request,hooks={}){
  const blockers=[],p=s.providerCampaign,j=jobFor(s,request),customer=customerFor(s,request.customerId);
  if(!p||p.caseHandoffVersion!==VERSION||p.contentVersion!=='provider-campaigns-8')blockers.push('PROVIDER_CASE_HANDOFF_UNAVAILABLE');
  if(!exact(request,['action','customerId','jobId','connectorId'])||request.action!=='handoff-case'||request.connectorId!==CONNECTOR_ID)blockers.push('PROVIDER_CASE_HANDOFF_REQUEST');
  if(!j||!customer)return {eligible:false,blockers:[...blockers,'PROVIDER_CASE_HANDOFF_JOB_REQUIRED']};
  if(customer.scenario!=='smb'||!['active','renewal'].includes(customer.status)||j.channel!=='voice'||j.resilienceSequence||j.handoff||j.status!=='pending'||j.settled||s.clock>j.deadlineAt)blockers.push('PROVIDER_CASE_HANDOFF_JOB_INELIGIBLE');
  const root=need(hooks,'customerRoot')(s,customer.id),source=sourceFor(root,j),bound=root?.cases?.[j.caseId];
  if(!source||source.channel!=='voice'||source.phase!=='queued'||source.probe===true||source.scope!=='tenant'||!admitted(source)||talking(source)||source.caseId!==j.caseId||source.tenant!==root?.tenant||bound?.identity!==source.from||bound?.tenant!==source.tenant||!bound?.interactions?.includes(source.id)||source.context!==true||source.obligations?.length||source.emergency===true||source.intent==='test-emergency')blockers.push('PROVIDER_CASE_HANDOFF_QUEUED_VOICE_REQUIRED');
  let authored=null;try{authored=canonicalPlan(s,customer.id,j,hooks);}catch(e){if(e.message==='PROVIDER_HANDOFF_HOOK_REQUIRED')throw e;blockers.push('PROVIDER_CASE_HANDOFF_AUTHORED_PREFERENCE_REQUIRED');}
  const paid=capability(s,customer.id,s.clock,hooks);if(!paid)blockers.push('PROVIDER_CASE_HANDOFF_PAID_CHANNEL_REQUIRED');
  if(need(hooks,'humanReady')(s,customer.id)!==true)blockers.push('PROVIDER_CASE_HANDOFF_HUMAN_CAPACITY_REQUIRED');
  return {eligible:blockers.length===0,blockers:[...new Set(blockers)],...(authored?{plan:copy(authored.plan),selected:copy(authored.selected)}:{}),paid};
 }
 function quoteDetails(s,request,hooks={}){
  const result=eligibility(s,request,hooks),j=jobFor(s,request),root=j&&need(hooks,'customerRoot')(s,request.customerId),i=j&&sourceFor(root,j);
  return {...result,caseId:j?.caseId||null,deadlineAt:j?.deadlineAt??null,sourceInteractionId:i?.id||null,sourceUsageMinutes:i?.usageMinutes||0,incrementalSetupCents:0,billing:'existing-plan-metered-voice-and-one-accepted-message'};
 }
 const receiptKeys=['version','customerId','jobId','caseId','tenant','person','at','planAt','demandRequest','sourceCaseIndex','connectorId','operationId','projectId','postingId','deploymentId','sourceInteractionId','targetInteractionId','sourceUsageMinutes'];
 const detail=r=>({version:VERSION,jobId:r.jobId,caseId:r.caseId,fromInteractionId:r.sourceInteractionId,toInteractionId:r.targetInteractionId,at:r.at});
 function commit(s,request,hooks={}){
  const q=eligibility(s,request,hooks);if(!q.eligible)fail(q.blockers[0]);
  const j=jobFor(s,request),root=need(hooks,'customerRoot')(s,request.customerId),source=sourceFor(root,j);
  // The dispatcher owns the transaction copy. Any thrown hook/target failure discards it.
  for(const key of ['finish','start','record'])need(hooks,key);
  const receipt={version:VERSION,customerId:request.customerId,jobId:j.id,caseId:j.caseId,tenant:source.tenant,person:source.from,at:s.clock,planAt:q.plan.at,demandRequest:copy(q.plan.request),sourceCaseIndex:q.selected.sourceCaseIndex,connectorId:CONNECTOR_ID,operationId:OPERATION_ID,...q.paid,sourceInteractionId:source.id,targetInteractionId:null,sourceUsageMinutes:source.usageMinutes||0};
  hooks.finish(s,request.customerId,source.id,'CHANNEL_HANDOFF');
  receipt.targetInteractionId=hooks.start(s,request.customerId,{channel:'message',from:source.from,to:'+61255500201',caseId:j.caseId,language:source.language||'en',purpose:'service',account:q.selected.account,template:q.selected.template});
  const currentRoot=hooks.customerRoot(s,request.customerId),target=currentRoot.interactions.find(i=>i.id===receipt.targetInteractionId);
  if(!target||target.id===source.id||target.phase==='failed'||target.channel!=='message'||target.caseId!==j.caseId||target.from!==source.from||target.tenant!==source.tenant)fail('PROVIDER_CASE_HANDOFF_TARGET_REFUSED');
  hooks.record(s,request.customerId,source.id,target.id,detail(receipt));j.handoff=receipt;
  validateJob(s,j,hooks);return copy(receipt);
 }
 function validateJob(s,j,hooks){
  const r=j.handoff,p=s.providerCampaign,customer=customerFor(s,j.customerId);
  if(p.caseHandoffVersion!==VERSION||p.contentVersion!=='provider-campaigns-8'||!exact(r,receiptKeys)||r.version!==VERSION||!customer||customer.scenario!=='smb'||j.channel!=='voice'||j.resilienceSequence||r.customerId!==j.customerId||r.jobId!==j.id||r.caseId!==j.caseId||r.sourceInteractionId!==j.interactionId||r.sourceInteractionId===r.targetInteractionId||r.connectorId!==CONNECTOR_ID||r.operationId!==OPERATION_ID||!integer(r.at,j.arrivalAt,Math.min(s.clock,j.deadlineAt))||!integer(r.sourceUsageMinutes,0,r.at-j.arrivalAt))fail();
  const {plan,selected}=canonicalPlan(s,j.customerId,j,hooks),paid=capability(s,j.customerId,r.at,hooks);
  if(plan.at!==r.planAt||!same(plan.request,r.demandRequest)||selected.sourceCaseIndex!==r.sourceCaseIndex||!paid||!same(paid,{projectId:r.projectId,postingId:r.postingId,deploymentId:r.deploymentId}))fail();
  const root=need(hooks,'customerRoot')(s,j.customerId),source=sourceFor(root,j),target=root?.interactions?.find(i=>i.id===r.targetInteractionId),bound=root?.cases?.[r.caseId];
  if(!source||!target||source.channel!=='voice'||source.phase!=='failed'||source.outcome!=='CHANNEL_HANDOFF'||source.finishedAt!==r.at||source.startedAt!==j.arrivalAt||talking(source)||source.emergency===true||source.intent==='test-emergency'||!admitted(source)||(source.usageMinutes||0)!==r.sourceUsageMinutes||target.channel!=='message'||target.startedAt!==r.at||target.account!==selected.account||target.template!==selected.template||target.purpose!=='service'||source.context!==true||target.context!==true||bound?.identity!==r.person||bound?.tenant!==r.tenant||r.tenant!==root.tenant)fail();
  for(const leg of [source,target])if(leg.probe===true||leg.scope!=='tenant'||leg.from!==r.person||leg.tenant!==r.tenant||leg.caseId!==r.caseId||!bound.interactions.includes(leg.id)||leg.trace.filter(t=>t.code===CODE&&t.at===r.at&&same(t.detail,detail(r))).length!==1)fail();
  if(!source.trace.some(t=>t.code==='ENQUEUED'&&t.at<=r.at)||source.trace.some(t=>t.at>r.at)||!source.trace.some(t=>t.code==='CHANNEL_HANDOFF'&&t.at===r.at))fail();
  if(['completed','late'].includes(j.status)&&!(target.phase==='resolved'&&target.agent&&target.trace.some(t=>t.code==='HUMAN_HANDOFF')&&target.trace.some(t=>t.code==='AGENT_ASSIGNED')&&j.completedAt===target.finishedAt&&(j.status==='completed'?target.finishedAt<=j.deadlineAt:target.finishedAt>j.deadlineAt)))fail();
  return true;
 }
 function validate(s,hooks={}){
  const p=s.providerCampaign;if(!p)return true;
  if(p.caseHandoffVersion!==undefined&&(p.caseHandoffVersion!==VERSION||p.contentVersion!=='provider-campaigns-8'))fail('INVALID_PROVIDER_CASE_HANDOFF_VERSION');
  const ids=new Set();for(const j of p.jobs||[])if(j.handoff!==undefined){validateJob(s,j,hooks);for(const id of [j.handoff.sourceInteractionId,j.handoff.targetInteractionId]){const key=j.customerId+'\0'+id;if(ids.has(key))fail();ids.add(key);}}
  return true;
 }
 function pins(s,customerId){const jobs=(s.providerCampaign?.jobs||[]).filter(j=>j.customerId===customerId&&j.handoff);return {interactionIds:[...new Set(jobs.flatMap(j=>[j.handoff.sourceInteractionId,j.handoff.targetInteractionId]))].sort(),caseIds:[...new Set(jobs.map(j=>j.caseId))].sort()};}
 const source=()=>`const SOC_PROVIDER_CASE_HANDOFF=(${socProviderCaseHandoffKernel.toString()})();`;
 return {VERSION,OPERATION_ID,CONNECTOR_ID,CODE,eligibility,quoteDetails,commit,validate,pins,source};
}
const SOC_PROVIDER_CASE_HANDOFF=socProviderCaseHandoffKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_CASE_HANDOFF;
