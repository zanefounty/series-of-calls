/* Reconstruct one retained Provider support participant at its recorded minute. */
function socProviderSupportHistoryKernel(){
 'use strict';
 const VERSION=1;
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const integer=x=>Number.isSafeInteger(x)&&x>=0;
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const unsupported=code=>({status:'unsupported',missing:[code],participant:null});
 function workforceApi(){return typeof SOC_PROVIDER_WORKFORCE_HISTORY!=='undefined'?SOC_PROVIDER_WORKFORCE_HISTORY:require('./23-provider-workforce-history.js');}
 function configurationApi(){return typeof SOC_PROVIDER_CONFIGURATION_AUTHORITY!=='undefined'?SOC_PROVIDER_CONFIGURATION_AUTHORITY:require('./23-provider-configuration-authority.js');}
 function customerRoot(s,c,hooks){return typeof hooks.customerRoot==='function'?hooks.customerRoot(s,c):s.portfolio?.customers?.find(row=>row.id===c.portfolioId)?.root||null;}
 function customerStatusAt(s,c,at){
  if(at<c.startedAt||c.activatedAt===null||at<c.activatedAt)return 'provisioning';
  let status='active';const events=(s.providerCampaign.events||[]).filter(event=>event.customerId===c.id&&event.at<=at).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
  for(const event of events){if(event.code==='CUSTOMER_SERVICE_ACTIVE')status='active';else if(event.code==='CUSTOMER_RENEWAL_OFFERED')status='renewal';else if(['CUSTOMER_RENEWED'].includes(event.code))status='active';else if(['CUSTOMER_RENEWAL_REFUSED','CUSTOMER_EXITED','CUSTOMER_FAILED_CONSECUTIVE_PERIODS'].includes(event.code))status='exited';}
  if(c.exitAt!==null&&c.exitAt!==undefined&&c.exitAt<=at)status='exited';return status;
 }
 function retailAgreementAt(s,c,at){
  const agreement=c.retailAgreement;if(!agreement||!integer(agreement.at)||!integer(agreement.priceCents))return null;
  if(agreement.at<=at)return {acceptedAt:agreement.at,priceCents:agreement.priceCents};
  const prior=(c.history||[]).filter(row=>integer(row.from)&&integer(row.to)&&row.from<=at&&at<row.to).at(-1);
  if(!prior||!Number.isSafeInteger(prior.activeMinutes)||prior.activeMinutes<1||!integer(prior.grossRetail))return null;
  let price=null;if(prior.fullPeriod===true)price=prior.grossRetail;else{const min=Math.ceil(prior.grossRetail*60/prior.activeMinutes),max=Math.ceil((prior.grossRetail+1)*60/prior.activeMinutes)-1;if(min===max)price=min;}
  if(!integer(price)||price<1)return null;
  const renewed=(s.providerCampaign.events||[]).filter(event=>event.customerId===c.id&&event.code==='CUSTOMER_RENEWED'&&event.at<=at).at(-1);
  return {acceptedAt:renewed?.at??c.customerAcceptedAt??c.startedAt,priceCents:price};
 }
 function paidStaffAt(s,at){
  const history=s.providerCampaign.workforceHistory;if(!history||!integer(history.startedAt))return false;
  const periodStart=Math.max(history.startedAt,Math.floor(at/60)*60),row=(s.business?.ledger||[]).find(entry=>entry.reason==='staff'&&entry.category==='cost'&&entry.at===periodStart&&entry.unit==='person-minute'&&integer(entry.quantity)&&entry.quantity>0&&entry.cents===Math.floor(entry.quantity*10000/60));
  return !!row;
 }
 function resourceObservationAt(s,c,root,resourceId,at,plan,hooks){
  if(!plan||!plan.config||!integer(plan.generation))return null;
  const projects=s.providerCampaign.projects.filter(p=>p.customerId===c.id&&p.status==='complete'&&p.completedAt<=at&&p.expectedGenerations?.[resourceId]===plan.generation),effective=plan.config.enabled===true&&projects.length>0;
  const disconnected=(s.providerCampaign.incidents||[]).filter(i=>i.customerId===c.id&&i.kind==='disconnection'&&i.activatedAt!==null).some(i=>i.activatedAt<=at&&(i.resolvedAt===null||at<i.resolvedAt));
  const linkFields={uc:{directory:'directory',connectivity:'connectivity'},dedicated:{directory:'directory',connectivity:'connectivity'},queue:{workforce:'workforce'},workflow:{channel:'channel',queue:'queue',crm:'crm'},room:{directory:'directory'},recorder:{archive:'archive'}};
  const observations=Object.create(null),visiting=new Set();
  function ready(id){
   if(observations[id]!==undefined)return observations[id];if(visiting.has(id))return false;visiting.add(id);
   let config,generation,paid=false;
   try{const value=id===resourceId?plan:hooks.configurationAt(s,c,root,id,at);config=value?.config;generation=value?.generation;paid=!!value&&projectsFor(id,generation).length>0;}catch{config=null;}
   const activeFault=incidentApplies(s,c,id,at),row=root.resources?.[id],kind=row?.kind;
   let value=!!config?.enabled&&paid&&!activeFault.invalid&&!activeFault.active;
   if(disconnected&&!config?.local)value=false;
   if(kind&&linkFields[kind])for(const [field] of Object.entries(linkFields[kind]))if(!config?.[field]||!ready(config[field]))value=false;
   // The authored SMB carrier-outage injects the shared inbound identity and
   // engagement paths as well as the carrier edge; replay that typed incident
   // scope at the historical minute, including after later paid repair.
   if(activeIncidentFor(s,c,'carrier',at)&&['carrier','identity','phone','engage'].includes(id))value=false;
   visiting.delete(id);observations[id]=value;return value;
  }
  function projectsFor(id,generation){return s.providerCampaign.projects.filter(p=>p.customerId===c.id&&p.status==='complete'&&p.completedAt<=at&&p.expectedGenerations?.[id]===generation);}
  const activeIncidentFor=(state,customer,res,minute)=>(state.providerCampaign.incidents||[]).some(i=>i.customerId===customer.id&&i.resource===res&&i.activatedAt!==null&&i.activatedAt<=minute&&(i.resolvedAt===null||minute<i.resolvedAt));
  const available=ready(resourceId),wasEffective=effective&&(!disconnected||plan.config.local);
  return {effective:wasEffective,generation:wasEffective?plan.generation:null,ready:available};
 }
 function boundaryEvaluationAt(s,c,root,project,at,pathResources,observations,hooks){
  const plan=project.operationReceipt?.plan,definition=plan?.boundaryContract,deps=plan?.dependencies;
  if(!definition||!Array.isArray(deps)||!integer(plan.boundaryGeneration))return {eligible:false,resources:[],profile:definition?.profile||''};
  const laterChanges=s.providerCampaign.projects.some(p=>p.customerId===c.id&&p.operationId==='service-boundary-review'&&p.completedAt>project.completedAt&&p.completedAt<=at)||s.providerCampaign.incidents.some(i=>i.customerId===c.id&&i.kind==='boundary'&&i.activatedAt!==null&&i.activatedAt<=at);
  const current=root.boundaries?.contracts?.find(item=>item.id===definition.id);
  if(!current)return {unsupported:true};
  if(laterChanges||current.generation!==plan.boundaryGeneration||current.provisioning?.status!=='ready')return {eligible:false,resources:[],profile:definition.profile};
  if(pathResources.some(id=>!deps.some(dep=>dep.id===id&&dep.generation===observations[id]?.generation)))return {eligible:false,resources:[],profile:definition.profile};
  let api;try{api=typeof SOC_BOUNDARIES!=='undefined'?SOC_BOUNDARIES:require('./43-boundaries.js');}catch{return {unsupported:true};}
  const child=copy(root);child.clock=at;child.boundaries=copy(root.boundaries);child.boundaries.clock=at;
  const historicalContract=copy(definition);for(const flow of historicalContract.flows||[]){const dep=deps.find(item=>item.id===flow.resource);if(dep)flow.resourceGeneration=dep.generation;}
  const historicalRow=child.boundaries.contracts.find(item=>item.id===definition.id);historicalRow.desired=copy(historicalContract);historicalRow.effective=copy(historicalContract);historicalRow.generation=plan.boundaryGeneration;historicalRow.provisioning={status:'ready',due:project.completedAt,generation:plan.boundaryGeneration,errors:[]};
  for(const dep of deps){const resource=child.resources?.[dep.id];if(!resource)continue;let config;try{config=hooks.configurationAt(s,c,root,dep.id,at);}catch{return {unsupported:true};}if(!config?.config)return {unsupported:true};resource.generation=observations[dep.id]?.generation??dep.generation;resource.desired=copy(config.config);resource.effective=copy(config.config);resource.provisioning={status:'ready',due:project.completedAt,generation:resource.generation,errors:[]};}
  const disconnected=(s.providerCampaign.incidents||[]).filter(i=>i.customerId===c.id&&i.kind==='disconnection'&&i.activatedAt!==null&&i.activatedAt<=at&&(i.resolvedAt===null||at<i.resolvedAt)).length>0;
  historicalRow.observed={...historicalRow.observed,connected:!disconnected};
  const evaluation=api.evaluate(child,definition.id),resources=evaluation.resourceBindings?.map(item=>typeof item==='string'?item:item.resource)||[];
  return {eligible:evaluation.eligible===true,resources,profile:evaluation.profile};
 }
 function withDefaults(s,hooks){
  const resolved={...hooks,
   customerRoot:hooks.customerRoot||((state,c)=>customerRoot(state,c,{})),
   customerStatusAt:hooks.customerStatusAt||customerStatusAt,
   retailAgreementAt:hooks.retailAgreementAt||retailAgreementAt,
   configurationAt:hooks.configurationAt||((state,c,root,id,at)=>configurationApi().configurationAt(state.providerCampaign,c,root,id,at,{catalogue:hooks.catalogue})),
   paidStaffAt:hooks.paidStaffAt||paidStaffAt
  };
  resolved.resourceObservationAt=hooks.resourceObservationAt||((state,c,root,id,at,plan)=>resourceObservationAt(state,c,root,id,at,plan,resolved));
  resolved.boundaryAt=hooks.boundaryAt||((state,c,root,project,at,paths,observations)=>boundaryEvaluationAt(state,c,root,project,at,paths,observations,resolved));
  return resolved;
 }
 function projectById(s,c,id){return s.providerCampaign.projects.find(p=>p.id===id&&p.customerId===c.id)||null;}
 function paidProject(s,p,hooks){
  if(!p||!['complete','retired'].includes(p.status)||!integer(p.completedAt))return false;
  if(typeof hooks.paidProjectAt==='function')return hooks.paidProjectAt(s,p,p.completedAt)===true;
  const row=s.business?.ledger?.find(x=>x.id===p.postingId);
  if(row)return row.category==='cost'&&row.projectId===p.id&&row.customerId===p.customerId&&row.cents===p.setupCents;
  const n=Number(/^entry-([1-9]\d*)$/.exec(p.postingId||'')?.[1]||0);
  return n>0&&n<=(s.business?.ledgerPrunedThrough||0)&&s.providerCampaign.projects.includes(p);
 }
 function incidentApplies(s,c,resourceId,at){
  const aliases={processor:'speech',connectivity:'access'};
  for(const incident of s.providerCampaign.incidents||[]){
   if(incident.customerId!==c.id)continue;
   if(!integer(incident.createdAt)||!integer(incident.dueAt)||incident.dueAt<incident.createdAt||incident.activatedAt!==null&&!integer(incident.activatedAt)||incident.acknowledgedAt!==null&&!integer(incident.acknowledgedAt)||incident.resolvedAt!==null&&!integer(incident.resolvedAt))return {invalid:true};
   if(incident.activatedAt!==null&&incident.resolvedAt!==null&&incident.resolvedAt<=incident.activatedAt)return {invalid:true};
   const affected=incident.resource===resourceId||aliases[incident.resource]===resourceId||incident.kind==='disconnection'&&['identity','access','phone','carrier','engage'].includes(resourceId);
   if(!affected||incident.activatedAt===null||incident.activatedAt>at||incident.resolvedAt!==null&&at>=incident.resolvedAt)continue;
   return {active:true,incidentId:incident.id};
  }
  return {active:false};
 }
 function freshJobsAt(s,c,root,at){
  const out=[];for(const job of s.providerCampaign.jobs||[]){
   if(job.customerId!==c.id||!['completed','late'].includes(job.status)||job.completedAt!==at||!job.interactionId||!job.caseId)continue;
   const interaction=root.interactions?.find(x=>x.id===job.interactionId),caseRecord=root.cases?.[job.caseId],assignment=interaction&&root.workforceOps?.assignments?.find(x=>x.person===interaction.agent&&x.status==='complete'&&(x.id===interaction.workforceAssignment||x.interaction===interaction.workforceAssignment||x.interaction===interaction.id));
   if(!interaction||interaction.probe===true||interaction.phase!=='resolved'||interaction.startedAt>at||interaction.finishedAt!==at||interaction.botAnswered||!interaction.agent||!interaction.workforceAssignment||interaction.caseId!==job.caseId||interaction.context!==true||interaction.needOutcome&&interaction.needOutcome.outcome!=='resolved'||!caseRecord||caseRecord.tenant!==(root.tenant||c.tenant||c.portfolioId)||!caseRecord.interactions?.includes(interaction.id)||!assignment||assignment.personSnapshot?.id!==interaction.agent)continue;
   out.push({jobId:job.id,interactionId:interaction.id,caseId:job.caseId,channel:job.channel,startedAt:interaction.startedAt,finishedAt:interaction.finishedAt,person:interaction.agent,assignmentId:assignment.id});
  }
  return out.sort((a,b)=>a.jobId.localeCompare(b.jobId));
 }
 function resolvedWorkMissingAt(s,c,root,at){
  const missing=[];
  for(const channel of ['voice','message']){
   const match=s.providerCampaign.jobs.filter(job=>job.customerId===c.id&&!job.resilienceSequence&&job.channel===channel&&['completed','late'].includes(job.status)&&job.interactionId&&job.caseId&&job.contextRetained===true&&job.completedAt<=at)
    .map(job=>({job,interaction:root.interactions?.find(i=>i.id===job.interactionId),linkedCase:root.cases?.[job.caseId]}))
    .find(({job,interaction,linkedCase})=>interaction&&interaction.probe!==true&&interaction.phase==='resolved'&&interaction.caseId===job.caseId&&interaction.finishedAt===job.completedAt&&interaction.context===true&&(!interaction.needOutcome||interaction.needOutcome.outcome==='resolved')&&linkedCase?.interactions?.includes(interaction.id));
   if(!match)missing.push(channel==='voice'?'resolved-voice-case-not-retained':'resolved-digital-case-not-retained');
  }
  return missing;
 }
 function activeMspAt(s,c,root,stageRows,stageResources,readyByResource,at,hooks){
  if(!['active','renewal'].includes(hooks.customerStatusAt(s,c,at)))return null;
  const terms=hooks.retailAgreementAt(s,c,at);if(!terms||terms.acceptedAt>at||!integer(terms.priceCents))return null;
  let team,billed;try{team=workforceApi().at(s.providerCampaign.workforceHistory,at);const periodStart=Math.max(s.providerCampaign.workforceHistory.startedAt,Math.floor(at/60)*60);billed=workforceApi().at(s.providerCampaign.workforceHistory,periodStart).personMinutes;}catch{return null;}
  if(!team||team.support<1||team.personMinutes<1||billed<1)return null;
  if(typeof hooks.paidStaffAt!=='function'||hooks.paidStaffAt(s,at)!==true)return null;
  const org=s.business?.organisations?.['orchard-msp'];if(!org?.roles?.includes('msp')||!org?.roles?.includes('reseller'))return null;
  if(stageResources.some(id=>readyByResource[id]?.ready!==true))return null;
  const scope=[...new Set(stageRows.flatMap(row=>row.project.resources||[]))],projects=stageRows.map(row=>row.project);
  const latest=projects.at(-1),effectiveAt=Math.max(...projects.map(p=>p.completedAt));
  const sharedWorkforce={engineers:team.engineers,support:team.support,personMinutes:team.personMinutes,billedMinutes:billed};
  return {id:`provider-responsibility-msp-${c.id}`,customerId:c.id,role:'msp',organisationId:'orchard-msp',projectId:latest.id,postingId:latest.postingId,effectiveAt,expiresAt:null,scope,setupCents:projects.reduce((n,p)=>n+p.setupCents,0),periodCents:projects.reduce((n,p)=>n+p.periodCents,0),engineers:team.engineers,support:team.support,sharedWorkforce};
 }
 function reconstructParticipantAt(s,customerId,at,hooks={}){
  if(!s?.providerCampaign||s.providerCampaign.contentVersion!=='provider-campaigns-8'||!integer(at)||at>s.clock)return unsupported('SUPPORT_HISTORY_CONTENT_OR_CLOCK_UNSUPPORTED');
  hooks=withDefaults(s,hooks);
  const c=s.providerCampaign.customers.find(x=>x.id===customerId);if(!c)return {status:'invalid',missing:['customer-not-found'],participant:null};
  const root=customerRoot(s,c,hooks);if(!root||root.providerCustomer?.id!==c.id||root.providerCustomer?.version!==1||root.providerCampaign||root.mode==='sandbox'||root.experience?.kind==='lab')return {status:'invalid',missing:['validated-customer-root'],participant:null};
  let terms;try{terms=hooks.retailAgreementAt(s,c,at);}catch{return unsupported('SUPPORT_HISTORY_RETAIL_TIMELINE_UNAVAILABLE');}if(!terms||!integer(terms.acceptedAt)||terms.acceptedAt>at||!integer(terms.priceCents))return {status:'invalid',missing:['accepted-retail-agreement'],participant:null};
  const stageRows=[],missing=[];
  for(const stageId of ['base','carrier','partner']){
   const stage=c.stages?.[stageId],project=stage&&projectById(s,c,stage.projectId);
   if(!stage||stage.status!=='effective'||!project||project.kind!=='stage'||project.stage!==stageId||!paidProject(s,project,hooks)||project.completedAt>at){missing.push('paid-commissioned-stage-lineage');break;}
   stageRows.push({stageId,stage,project});
  }
  if(missing.length)return {status:'invalid',missing:[...new Set(missing)],participant:null};
  const hasMigration=s.providerCampaign.projects.some(p=>p.customerId===c.id&&['migration','migration-consolidated','site-resource-migration'].includes(p.operationId)&&p.configSubmittedAt!==null);
  const hasRetirement=s.providerCampaign.projects.some(p=>p.customerId===c.id&&p.serviceRetirement);
  const hasOwnedFault=(s.providerCampaign.incidents||[]).some(i=>i.customerId===c.id&&(i.siteId||i.ownedSiteId||i.domain?.includes('site')));
  if((hasMigration||hasRetirement||hasOwnedFault)&&typeof hooks.pathResourcesAt!=='function')return unsupported('SUPPORT_HISTORY_PATH_TIMELINE_HOOK_REQUIRED');
  let paths;
  try{paths=typeof hooks.pathResourcesAt==='function'?hooks.pathResourcesAt(s,c,root,at):Object.values(root.operations?.placements||{});}catch{return unsupported('SUPPORT_HISTORY_PATH_TIMELINE_UNAVAILABLE');}
  if(!Array.isArray(paths)||paths.some(x=>typeof x!=='string'))return {status:'invalid',missing:['invalid-path-resource-history'],participant:null};
  const stageResources=[...new Set(stageRows.flatMap(x=>x.project.resources||[]))],pathResources=[...new Set(['identity','phone',...paths,'engage'])],resourceIds=[...new Set([...stageResources,...pathResources])];
  const observations=Object.create(null),resourceMissing=[];
  for(const resourceId of resourceIds){
   let plan,observation;try{plan=hooks.configurationAt(s,c,root,resourceId,at);observation=hooks.resourceObservationAt(s,c,root,resourceId,at,plan);}catch{return unsupported(`SUPPORT_HISTORY_RESOURCE_TIMELINE_UNAVAILABLE:${resourceId}`);}
   if(!plan||!integer(plan.generation)||!plan.config||!observation||!exact(observation,['effective','generation','ready'])||typeof observation.effective!=='boolean'||typeof observation.ready!=='boolean'||observation.generation!==null&&!integer(observation.generation))return unsupported(`SUPPORT_HISTORY_RESOURCE_OBSERVATION_UNAVAILABLE:${resourceId}`);
   const fault=incidentApplies(s,c,resourceId,at);if(fault.invalid)return {status:'invalid',missing:['invalid-incident-interval'],participant:null};
   const effective=observation.effective&&observation.generation===plan.generation;
   const ready=observation.ready&&effective&&!fault.active;
   observations[resourceId]={effective,generation:observation.generation,ready};
  }
  const expectedByResource=Object.create(null);for(const {stage} of stageRows)for(const resourceId of stage.resources||[])expectedByResource[resourceId]=stage.expectedGenerations?.[resourceId];
  for(const resourceId of stageResources){const r=observations[resourceId],expected=expectedByResource[resourceId];if(!r?.ready||!integer(expected)||r.generation<expected)resourceMissing.push(`resource-not-current:${resourceId}`);}
  if(resourceMissing.length)missing.push(...resourceMissing);
  if(!missing.length)missing.push(...resolvedWorkMissingAt(s,c,root,at));
  const ready=missing.length===0;
  const resources=ready?[...new Set([...stageResources,...pathResources])]:[];
  const readyByResource=observations;
  if(ready)for(const resourceId of pathResources)if(!readyByResource[resourceId]?.ready)missing.push(`resource-not-current:${resourceId}`);
  let responsibility;try{responsibility=activeMspAt(s,c,root,stageRows,stageResources,readyByResource,at,hooks);}catch{return unsupported('SUPPORT_HISTORY_RESPONSIBILITY_TIMELINE_UNAVAILABLE');}
  if(!responsibility)missing.push('No current MSP responsibility proof links the customer to paid service stages and shared support payroll.');
  let boundaries=[];
  if(ready){
   const candidates=s.providerCampaign.projects.filter(p=>p.customerId===c.id&&p.operationId==='service-boundary-review'&&p.kind==='operation'&&p.status==='complete'&&integer(p.completedAt)&&p.completedAt<=at&&p.operationReceipt?.kind==='service-boundary');
   for(const project of candidates){
    const receipt=project.operationReceipt,plan=receipt.plan,contract=plan?.boundaryContract,deps=plan?.dependencies;
    if(!plan||plan.customerId!==c.id||!contract?.id||!integer(plan.boundaryGeneration)||!Array.isArray(deps)||!paidProject(s,project,hooks))continue;
    if(!pathResources.every(id=>deps.some(d=>d.id===id&&d.generation===observations[id]?.generation)))continue;
    let evaluation;try{evaluation=hooks.boundaryAt(s,c,root,project,at,pathResources,observations);}catch{return unsupported('SUPPORT_HISTORY_BOUNDARY_TIMELINE_UNAVAILABLE');}
    if(evaluation?.unsupported)return unsupported('SUPPORT_HISTORY_BOUNDARY_TIMELINE_UNAVAILABLE');
    if(!evaluation||typeof evaluation.eligible!=='boolean'||!Array.isArray(evaluation.resources)||typeof evaluation.profile!=='string')return unsupported('SUPPORT_HISTORY_BOUNDARY_TIMELINE_UNAVAILABLE');
    if(evaluation.eligible&&pathResources.every(id=>evaluation.resources.includes(id)))boundaries.push({id:contract.id,generation:plan.boundaryGeneration,profile:evaluation.profile,resources:[...evaluation.resources].filter(id=>pathResources.includes(id)).sort()});
   }
  }
  boundaries.sort((a,b)=>a.id.localeCompare(b.id));
  if(!boundaries.length)missing.push('An effective supported boundary on a paid service resource is required throughout the sample.');
  const team=workforceApi().at(s.providerCampaign.workforceHistory,at),responsibilityProjection=responsibility?copy(responsibility):null;if(responsibilityProjection)responsibilityProjection.scope.sort();
  const generations=resources.map(id=>({id,generation:observations[id]?.generation??null})).sort((a,b)=>a.id.localeCompare(b.id));
  const configuration=JSON.stringify(stable({customerId:c.id,tenant:root.tenant||c.tenant||c.portfolioId,market:c.market,scenario:c.scenario,retailPriceCents:terms.priceCents,stages:Object.fromEntries(['base','carrier','partner'].map(id=>{const stage=c.stages?.[id];return [id,stage?{status:stage.status,projectId:stage.projectId,resources:stage.resources,expectedGenerations:stage.expectedGenerations}:null];})),resources:resources.map(id=>({id,generation:observations[id]?.generation})),responsibility:{id:responsibility?.id,projectId:responsibility?.projectId,postingId:responsibility?.postingId,scope:responsibility?.scope,terms:responsibility?{setupCents:responsibility.setupCents,periodCents:responsibility.periodCents,engineers:responsibility.engineers,support:responsibility.support}:undefined,sharedWorkforce:responsibility?{engineers:responsibility.sharedWorkforce.engineers,support:responsibility.sharedWorkforce.support}:null},boundaries}));
  const participant={customerId:c.id,portfolioId:c.portfolioId,tenant:root.tenant||c.tenant||c.portfolioId,market:c.market,scenario:c.scenario,configuration,eligible:missing.length===0,missing:[...new Set(missing)],resources:generations,boundaries,responsibility:responsibilityProjection};
  participant.freshJobs=freshJobsAt(s,c,root,at);
  if(typeof hooks.namedSupportAt==='function')participant.namedSupport=hooks.namedSupportAt(s,c,root,at);
  return {status:'supported',missing:[],participant};
 }
 function validateParticipantAt(s,participant,at,hooks={}){
  const result=reconstructParticipantAt(s,participant?.customerId,at,hooks);if(result.status!=='supported')return result;
  const expected=result.participant,keys=['customerId','portfolioId','tenant','market','scenario','configuration','eligible','missing','resources','boundaries','responsibility'];
  const allowed=new Set([...keys,'freshJobs','settlements','namedSupport','distributor','integrations']);
  const sameSample=participant&&typeof participant==='object'&&!Array.isArray(participant)&&Object.keys(participant).every(key=>allowed.has(key))&&keys.every(key=>Object.hasOwn(participant,key)&&same(participant[key]??null,expected[key]??null))&&(!Object.hasOwn(participant,'freshJobs')||same(participant.freshJobs,expected.freshJobs));
  return {status:sameSample?'valid':'invalid',missing:sameSample?[]:['HISTORICAL_SUPPORT_PARTICIPANT_MISMATCH'],participant:expected};
 }
 function source(){return `const SOC_PROVIDER_SUPPORT_HISTORY=(${socProviderSupportHistoryKernel.toString()})();`;}
 return {version:VERSION,reconstructParticipantAt,validateParticipantAt,source};
}
const SOC_PROVIDER_SUPPORT_HISTORY=socProviderSupportHistoryKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_SUPPORT_HISTORY;
