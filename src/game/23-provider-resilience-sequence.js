/* Provider-specific paid transport resilience sequence evidence. */
function socProviderResilienceSequenceKernel(){
 'use strict';
 const VERSION=1,copy=x=>JSON.parse(JSON.stringify(x)),integer=x=>Number.isSafeInteger(x)&&x>=0;
 const fail=code=>{throw new Error(code);};
 function rulesApi(){return typeof SOC_PROVIDER_RULES!=='undefined'?SOC_PROVIDER_RULES:(typeof require==='function'?require('./24-provider-rules.js'):null);}
 function missionDemand(parent,customer){
  const rules=rulesApi(),base=rules?.data?.missions?.[customer?.scenario]?.demand;if(!base)fail('PROVIDER_RESILIENCE_MISSION_DURATION_UNAVAILABLE');
  if(customer.scenario==='smb'&&(customer.prospectDemandId||parent.providerCampaign.openingVariant)){const api=typeof SOC_PROVIDER_VARIANTS!=='undefined'?SOC_PROVIDER_VARIANTS:(typeof require==='function'?require('./23-provider-variants.js'):null);if(!api)fail('PROVIDER_RESILIENCE_VARIANT_UNAVAILABLE');return api.demand(customer.prospectDemandId||parent.providerCampaign.openingVariant.id,base);}
  return base;
 }
 function missionMinutes(parent,customer){const value=missionDemand(parent,customer).voiceDuration;if(!Number.isSafeInteger(value)||value<1)fail('PROVIDER_RESILIENCE_MISSION_DURATION_UNAVAILABLE');return value;}
 function recordingRequired(customer){const rules=rulesApi();return rules?.data?.missions?.[customer?.scenario]?.requirements?.recording===true;}
 function ids(customerId){return {primary:`${customerId}-a-primary`,backup:`${customerId}-z-backup`,primaryDomain:`${customerId}-primary-domain`,backupDomain:`${customerId}-backup-domain`};}
 function exact(o,keys){return !!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');}
 function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
 function incidentFor(parent,customer,sequence,job){
  if(sequence.windowStart===null){
   if(sequence.incidentId!==null||parent.providerCampaign.incidents.some(i=>i.jobId===job.id&&i.kind==='transport-domain'))fail('INVALID_PROVIDER_RESILIENCE_INCIDENT_LINK');
   return null;
  }
  if(!integer(sequence.windowStart)||sequence.windowStart<job.arrivalAt||typeof sequence.incidentId!=='string')fail('INVALID_PROVIDER_RESILIENCE_WINDOW');
  const rows=parent.providerCampaign.incidents.filter(i=>i.id===sequence.incidentId);
  if(rows.length!==1)fail('INVALID_PROVIDER_RESILIENCE_INCIDENT_LINK');
  const incident=rows[0],domain=customer.id+'-primary-domain';
  if(incident.customerId!==customer.id||incident.jobId!==job.id||incident.kind!=='transport-domain'||incident.resource!=='access'||incident.fault!=='TRANSPORT_DOMAIN'||incident.domain!==domain||incident.createdAt!==sequence.windowStart||incident.dueAt!==sequence.windowStart||incident.activatedAt!==sequence.windowStart||!['active','acknowledged','resolved'].includes(incident.status)||!exact(incident.receipt,['at','domain'])||incident.receipt.at!==sequence.windowStart||incident.receipt.domain!==domain||incident.resolvedAt!==null&&(!integer(incident.resolvedAt)||incident.resolvedAt<sequence.windowStart||incident.resolvedAt>parent.clock)||incident.status==='resolved'!==Number.isSafeInteger(incident.resolvedAt))fail('INVALID_PROVIDER_RESILIENCE_INCIDENT');
  return incident;
 }
 function routeObservation(interaction,code){
  return (interaction?.trace||[]).filter(row=>row.code===code&&row.observation).map(row=>({row,observation:row.observation}));
 }
 function routeEdges(observation){return observation?.selected?.edges?.map(edge=>edge.id)||[];}
 function validAdmission(interaction,edgeId,domainId,failedDomainId,requiredAt){
  const rows=routeObservation(interaction,'MEDIA_TRANSPORT_ADMITTED');
  return rows.some(({row,observation:o})=>row.at>=requiredAt&&o.phase==='admitted'&&o.ready===true&&o.selected?.ready===true&&o.selected?.latencyMs<=500&&equal(routeEdges(o),[edgeId])&&o.selected.edges[0]?.domain===domainId&&o.failedDomains.includes(failedDomainId)===!!failedDomainId);
 }
 function validObservedInterval(interaction,edgeId,domainId,failedDomainId,from,to){
  return routeObservation(interaction,'MEDIA_TRANSPORT_OBSERVED').some(({row,observation:o})=>{
   const start=row.observedFrom,end=row.observedTo,overlap=Math.max(start,from)<=Math.min(end,to);
   return overlap&&o.ready===true&&o.selected?.ready===true&&o.selected?.latencyMs<=500&&equal(routeEdges(o),[edgeId])&&o.selected.edges[0]?.domain===domainId&&o.failedDomains.includes(failedDomainId)===!!failedDomainId;
  });
 }
 function validateJob(parent,customer,job,child){
  const sequence=job?.resilienceSequence;
  if(!parent?.providerCampaign||!customer||!job||!child||!sequence||!exact(sequence,['version','projectId','postingId','caller','tenant','windowStart','incidentId','phases','samples'])||sequence.version!==VERSION||typeof sequence.projectId!=='string'||typeof sequence.postingId!=='string'||sequence.caller!=='alex'||sequence.tenant!==child.tenant||!Array.isArray(sequence.phases)||sequence.phases.length<1||sequence.phases.length>3||!Array.isArray(sequence.samples)||sequence.samples.length>10)fail('INVALID_PROVIDER_RESILIENCE_SEQUENCE');
  const p=parent.providerCampaign,primary=p.projects.find(project=>project.id===sequence.projectId);
  if(!['provider-campaigns-5','provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(p.contentVersion)||job.customerId!==customer.id||job.channel!=='voice'||job.periodIndex<0||!integer(job.periodIndex)||job.caseId!==`pc-${customer.id}-${job.periodIndex}-0`||job.arrivalAt!==job.periodIndex*60+4||job.deadlineAt!==job.arrivalAt+24||!primary||primary.customerId!==customer.id||primary.kind!=='operation'||primary.operationId!=='primary-upstream'||primary.status!=='complete'||primary.postingId!==sequence.postingId||!Number.isSafeInteger(primary.completedAt)||primary.completedAt>job.periodIndex*60)fail('INVALID_PROVIDER_RESILIENCE_AUTHORITY');
  const projectId=sequence.projectId,postingId=sequence.postingId;
  if(!/^[a-z][a-z0-9-]{0,47}$/.test(projectId)||!/^entry-[1-9][0-9]*$/.test(postingId)||job.interactionId!==sequence.phases[0].interactionId||job.deadlineAt!==job.arrivalAt+24)fail('INVALID_PROVIDER_RESILIENCE_AUTHORITY');
  const marker=child.providerResilienceCase,caseRow=child.cases?.[job.caseId];
  if(!marker||!exact(marker,['version','jobId','caseId','interactionIds'])||marker.version!==1||marker.jobId!==job.id||marker.caseId!==job.caseId||!Array.isArray(marker.interactionIds)||!equal(marker.interactionIds,sequence.phases.map(x=>x?.interactionId))||!caseRow||caseRow.identity!=='alex'||caseRow.tenant!==child.tenant||!equal(caseRow.interactions,sequence.phases.map(x=>x?.interactionId)))fail('INVALID_PROVIDER_RESILIENCE_CASE');
  const expectedMain=missionMinutes(parent,customer),interactions=[];
  for(let n=0;n<sequence.phases.length;n++){
   const phase=sequence.phases[n],requested=n===0?expectedMain:3;
   if(!exact(phase,['interactionId','requestedMinutes','observedUsageMinutes'])||typeof phase.interactionId!=='string'||phase.requestedMinutes!==requested||!integer(phase.observedUsageMinutes))fail('INVALID_PROVIDER_RESILIENCE_PHASE');
   const interaction=child.interactions.find(i=>i.id===phase.interactionId);
   if(!interaction||interaction.id!==phase.interactionId||interaction.caseId!==job.caseId||interaction.channel!=='voice'||interaction.from!=='alex'||interaction.tenant!==child.tenant||interaction.direction!=='outbound'||interaction.durationMinutes!==requested||!Number.isSafeInteger(interaction.startedAt)||interaction.startedAt<job.arrivalAt||!Number.isSafeInteger(interaction.usageMinutes??0)||(interaction.usageMinutes??0)!==phase.observedUsageMinutes||interaction.phase==='resolved'&&(interaction.usageMinutes??0)<requested)fail('INVALID_PROVIDER_RESILIENCE_INTERACTION');
   if(n===0&&interaction.startedAt!==job.arrivalAt||n>0&&(!interactions[n-1]||!Number.isSafeInteger(interactions[n-1].finishedAt)||interaction.startedAt<interactions[n-1].finishedAt))fail('INVALID_PROVIDER_RESILIENCE_PHASE_ORDER');
   if(interaction.phase==='resolved'&&(!Number.isSafeInteger(interaction.finishedAt)||interaction.finishedAt<interaction.startedAt)||interaction.phase==='failed'&&(!Number.isSafeInteger(interaction.finishedAt)||interaction.finishedAt<interaction.startedAt))fail('INVALID_PROVIDER_RESILIENCE_INTERACTION');
   if(interaction.probe===true||interaction.media!==undefined&&(interaction.media.in!==true||interaction.media.out!==true)||interaction.phase==='resolved'&&(!interaction.media||interaction.media.in!==true||interaction.media.out!==true||interaction.context!==true)||interaction.obligations?.length)fail('INVALID_PROVIDER_RESILIENCE_MEDIA');
   const assignments=child.workforceOps?.assignments||[],hasAssignment=interaction.agent!==undefined||interaction.workforceAssignment!==undefined;
   if(hasAssignment&&(!interaction.agent||!interaction.workforceAssignment||!assignments.some(a=>a.interaction===interaction.workforceAssignment&&a.person===interaction.agent&&a.channel==='voice'&&['voice','wrap','complete'].includes(a.status)&&a.startedAt>=interaction.startedAt&&a.startedAt<=child.clock&&(!['resolved','failed'].includes(interaction.phase)||a.status==='complete'&&a.startedAt<=interaction.finishedAt))))fail('INVALID_PROVIDER_RESILIENCE_HUMAN_ASSIGNMENT');
   if(customer.recording&&(!Array.isArray(interaction.records)||!interaction.records.some(recordId=>child.records?.some(r=>r.id===recordId&&r.kind==='recording'&&!r.deleted&&(r.captureScope||'complete')==='complete'))))fail('INVALID_PROVIDER_RESILIENCE_RECORDING');
   interactions.push(interaction);
  }
  const usage=sequence.phases.reduce((sum,phase)=>sum+phase.observedUsageMinutes,0);
  if(job.voiceMinutes!==usage)fail('INVALID_PROVIDER_RESILIENCE_USAGE');
  const incident=incidentFor(parent,{...customer,root:child},sequence,job);
  if(sequence.windowStart===null){
   if(sequence.phases.length!==1||sequence.samples.length)fail('INVALID_PROVIDER_RESILIENCE_PREWINDOW');
  }else{
   const W=sequence.windowStart,elapsed=Math.max(0,Math.min(10,child.clock-W)),expectedCount=Math.max(0,elapsed);
   if(sequence.phases.length<2||sequence.phases[1].requestedMinutes!==3||sequence.phases.length===3&&(!Number.isSafeInteger(incident.resolvedAt)||interactions[2].startedAt<incident.resolvedAt)||sequence.samples.length!==expectedCount)fail('INVALID_PROVIDER_RESILIENCE_WINDOW');
   for(let n=0;n<sequence.samples.length;n++){const sample=sequence.samples[n],at=W+n+1,failed=incident.resolvedAt===null||at<incident.resolvedAt;if(!exact(sample,['at','primaryFailed'])||sample.at!==at||sample.primaryFailed!==failed)fail('INVALID_PROVIDER_RESILIENCE_SAMPLE');}
  }
  if(job.status==='completed'||job.status==='late'){
   if(sequence.phases.length!==3||interactions.some(i=>i.phase!=='resolved')||job.completedAt!==interactions[2].finishedAt||job.status!==(job.completedAt<=job.deadlineAt?'completed':'late'))fail('INVALID_PROVIDER_RESILIENCE_TERMINAL');
  }
  if(job.status==='failed'&&job.failure==='DEADLINE_EXPIRED'&&job.completedAt!==null&&job.completedAt<=job.deadlineAt)fail('INVALID_PROVIDER_RESILIENCE_TERMINAL');
  return true;
 }
 function assessPaths(customer,job,child,incident){
  const sequence=job.resilienceSequence,items=sequence.phases.map(phase=>child.interactions.find(i=>i.id===phase.interactionId)),names=ids(customer.id),missing=[];
  if(items.some(i=>i?.phase==='resolved'&&(!i.agent||!i.workforceAssignment)))missing.push('HUMAN_HANDLED_SEQUENCE_REQUIRED');
  if(!incident||sequence.windowStart===null)return {missing:[...missing,'SEQUENCE_WINDOW_NOT_STARTED']};
  const W=sequence.windowStart,resolved=incident.resolvedAt,failedUntil=resolved===null?child.clock:resolved;
  if(!validAdmission(items[0],names.primary,names.primaryDomain,null,items[0].startedAt))missing.push('BASELINE_PRIMARY_PATH_NOT_USED');
  if(items[0].phase!=='resolved'||items[0].finishedAt>=W)missing.push('BASELINE_NOT_COMPLETED_BEFORE_FAILURE');
  if(items.length<2)missing.push('DURING_INTERACTION_NOT_STARTED');
  if(items[1]){
   const duringAdmission=validAdmission(items[1],names.backup,names.backupDomain,null,W);
   const duringEnd=Math.max(W,Math.min(failedUntil,items[1].finishedAt??child.clock));
   const observed=duringEnd>=items[1].startedAt&&validObservedInterval(items[1],names.backup,names.backupDomain,null,Math.max(W,items[1].startedAt),duringEnd);
   const failedPathSample=sequence.samples.some(sample=>sample.primaryFailed&&sample.at>=Math.max(W,items[1].startedAt)&&sample.at<failedUntil&&sample.at<=duringEnd);
   if(!duringAdmission||!observed||!failedPathSample)missing.push('INDEPENDENT_BACKUP_NOT_OBSERVED');
   if(items[1].phase!=='resolved')missing.push('DURING_INTERACTION_INCOMPLETE');
  }
  if(items.length<3)missing.push('RECOVERY_INTERACTION_NOT_STARTED');
  if(items[2]){
   const recoveredAdmission=Number.isSafeInteger(resolved)&&validAdmission(items[2],names.primary,names.primaryDomain,null,resolved);
   const recoveredObserved=Number.isSafeInteger(resolved)&&items[2].finishedAt!==undefined&&validObservedInterval(items[2],names.primary,names.primaryDomain,null,Math.max(resolved,items[2].startedAt),items[2].finishedAt);
   if(!recoveredAdmission||!recoveredObserved)missing.push('PRIMARY_RECOVERY_NOT_OBSERVED');
   if(items[2].phase!=='resolved')missing.push('RECOVERY_INTERACTION_INCOMPLETE');
  }
  if(sequence.samples.length!==10)missing.push('TEN_MINUTE_WINDOW_INCOMPLETE');
  else if(!sequence.samples.some(x=>x.primaryFailed)&&!missing.includes('TEN_MINUTE_WINDOW_INCOMPLETE'))missing.push('PRIMARY_FAILURE_NOT_SAMPLED');
  if(job.status!=='completed'||job.completedAt>job.deadlineAt)missing.push('SEQUENCE_NOT_COMPLETED_ON_TIME');
  if(job.completedAt>W+10||items[2]?.finishedAt>W+10)missing.push('SEQUENCE_EXCEEDED_TEN_MINUTE_WINDOW');
  return {missing:[...new Set(missing)]};
 }
 function evaluate(parent,customerId,job,options={}){
  const customer=parent?.providerCampaign?.customers?.find(x=>x.id===customerId),child=options.child||customer?.root;
  if(!customer||!child||job?.customerId!==customerId)return {eligible:false,missing:['PROVIDER_CUSTOMER_UNAVAILABLE'],evidence:null};
  try{validateJob(parent,customer,job,child);}catch(error){return {eligible:false,missing:[String(error?.message||'INVALID_PROVIDER_RESILIENCE_SEQUENCE')],evidence:null};}
  let incident;try{incident=incidentFor(parent,{...customer,root:child},job.resilienceSequence,job);}catch(error){return {eligible:false,missing:[String(error?.message||'INVALID_PROVIDER_RESILIENCE_INCIDENT')],evidence:null};}
  const result=assessPaths(customer,job,child,incident),missing=result.missing;
  if(missing.length)return {eligible:false,missing,evidence:null};
  const sequence=job.resilienceSequence,interactions=sequence.phases.map(phase=>child.interactions.find(i=>i.id===phase.interactionId));
  const evidence={version:VERSION,customerId,jobId:job.id,caseId:job.caseId,projectId:sequence.projectId,postingId:sequence.postingId,incidentId:sequence.incidentId,windowStart:sequence.windowStart,samples:copy(sequence.samples),phases:sequence.phases.map((phase,index)=>({interactionId:phase.interactionId,startedAt:interactions[index].startedAt,finishedAt:interactions[index].finishedAt,requestedMinutes:phase.requestedMinutes,observedUsageMinutes:phase.observedUsageMinutes,assignedPerson:interactions[index].agent,admission:copy(routeObservation(interactions[index],'MEDIA_TRANSPORT_ADMITTED').find(row=>row.observation?.ready)?.observation||null)})),basis:'provider-resilience-sequence-v1'};
  return {eligible:true,missing:[],evidence};
 }
 const source=()=>`const SOC_PROVIDER_RESILIENCE_SEQUENCE=(${socProviderResilienceSequenceKernel.toString()})();`;
 return {VERSION,validateJob,evaluate,source};
}
const SOC_PROVIDER_RESILIENCE_SEQUENCE=socProviderResilienceSequenceKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_PROVIDER_RESILIENCE_SEQUENCE=SOC_PROVIDER_RESILIENCE_SEQUENCE;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_RESILIENCE_SEQUENCE;
