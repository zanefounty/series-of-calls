/* Pure Provider evidence adapters for national wholesale and public service. */
function socProviderCentralProgressionKernel(){
 'use strict';
 const VERSION=1,CONTENT='provider-central-progression-1';
 const LEVEL5='progress.progression-level.'+'5',LEVEL6='progress.progression-level.'+'6';
 const NAME5='National communications SP',NAME6='Public-service communications specialist';
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(x);
 function responsibilityApi(){return typeof SOC_PROVIDER_RESPONSIBILITY!=='undefined'?SOC_PROVIDER_RESPONSIBILITY:require('./23-provider-responsibility.js');}
 function governmentApi(){return typeof SOC_GOVERNMENT_ARCHITECTURES!=='undefined'?SOC_GOVERNMENT_ARCHITECTURES:require('./23-provider-government.js');}
 function boundaryApi(){return typeof SOC_BOUNDARIES!=='undefined'?SOC_BOUNDARIES:require('./43-boundaries.js');}
 function rulesApi(){return typeof SOC_PROVIDER_RULES!=='undefined'?SOC_PROVIDER_RULES:require('./24-provider-rules.js');}
 function customerRoot(s,c,hooks={}){return typeof hooks.customerRoot==='function'?hooks.customerRoot(s,c.portfolioId):s?.portfolio?.customers?.find(x=>x.id===c.portfolioId)?.root||null;}
 function postById(s,postingId){return s.business?.ledger?.find(x=>x.id===postingId)||null;}
 function prunedPosting(s,postingId){const n=Number(/^entry-([1-9][0-9]*)$/.exec(postingId||'')?.[1]||0);return n>0&&n<=(s.business?.ledgerPrunedThrough||0);}
 function paidPosting(s,p,reason){
  if(!p||p.status!=='complete'||!id(p.id)||!id(p.postingId)||!integer(p.setupCents,1)||!integer(p.acceptedAt)||!integer(p.completedAt))return false;
  const row=postById(s,p.postingId);
  if(row)return row.category==='cost'&&row.reason===reason&&row.cents===p.setupCents&&row.customerId===p.customerId&&row.projectId===p.id;
  return prunedPosting(s,p.postingId);
 }
 function stageProof(s,c){
  const stages=[];
  for(const stageId of ['base','carrier','partner']){
   const stage=c.stages?.[stageId],p=stage&&s.providerCampaign.projects.find(x=>x.id===stage.projectId&&x.customerId===c.id&&x.kind==='stage'&&x.stage===stageId&&x.status==='complete');
   if(!stage||stage.status!=='effective'||!p||!paidPosting(s,p,'provider-implementation'))return null;
   stages.push({stageId,projectId:p.id,postingId:p.postingId,acceptedAt:p.acceptedAt,completedAt:p.completedAt});
  }
  return stages;
 }
 function currentSupport(s,c,hooks){
  const api=responsibilityApi(),result=api.responsibilities(s,c.id,{customerRoot:(state,portfolioId)=>hooks.customerRoot?.(state,portfolioId)||s.portfolio?.customers?.find(x=>x.id===portfolioId)?.root,observeResource:(root,resourceId)=>hooks.observeResource?.(root,resourceId)});
  const record=result.records?.find(x=>x.customerId===c.id&&x.role==='msp'&&x.organisationId==='orchard-msp'&&(!x.expiresAt||x.expiresAt>s.clock));
  if(!record)return null;
  const project=s.providerCampaign.projects.find(x=>x.id===record.projectId&&x.customerId===c.id&&x.postingId===record.postingId&&x.status==='complete');
  if(!project||!paidPosting(s,project,project.kind==='stage'?'provider-implementation':'provider-operation'))return null;
  return record;
 }
 function supportedCustomer(s,c,hooks){
  if(!['active','renewal'].includes(c.status)||!c.retailAgreement||!integer(c.retailAgreement.at))return {missing:['ACTIVE_ACCEPTED_PROVIDER_CUSTOMER_REQUIRED']};
  const root=customerRoot(s,c,hooks);
  if(!root||root.providerCustomer?.id!==c.id||root.providerCustomer?.version!==1||root.providerCampaign)return {missing:['VALIDATED_PROVIDER_TENANT_REQUIRED']};
  const stages=stageProof(s,c);if(!stages)return {missing:['PAID_CURRENT_CUSTOMER_STAGES_REQUIRED']};
  const support=currentSupport(s,c,hooks);if(!support)return {missing:['CURRENT_PAID_CUSTOMER_SUPPORT_REQUIRED']};
  return {root,stages,support};
 }
 function voiceProof(s,c,root,period){
  const candidate=(s.providerCampaign.jobs||[]).filter(j=>j.customerId===c.id&&j.channel==='voice'&&j.periodIndex===period.period&&['completed','late'].includes(j.status)&&integer(j.completedAt)&&j.completedAt>=period.from&&j.completedAt<=period.to&&j.contextRetained===true).sort((a,b)=>a.completedAt-b.completedAt||a.id.localeCompare(b.id));
  for(const job of candidate){
   const interaction=root.interactions?.find(x=>x.id===job.interactionId),caseRow=interaction&&root.cases?.[interaction.caseId],assignment=interaction&&root.workforceOps?.assignments?.find(x=>x.interaction===(interaction.workforceAssignment||interaction.id)&&x.person===interaction.agent&&x.status==='complete');
   if(!interaction)continue;
   const carrierTrace=interaction.trace?.find(x=>x.code==='CARRIER_PATH_ADMITTED'&&x.direction==='outbound'),call=interaction.trace?.find(x=>x.code==='CALL_REQUEST'&&x.platform),route=interaction.trace?.find(x=>x.code==='ORDERED_ROUTE');
   if(interaction.probe===true||interaction.phase!=='resolved'||interaction.channel!=='voice'||interaction.direction==='inbound'||interaction.caseId!==job.caseId||!integer(interaction.startedAt)||!integer(interaction.finishedAt)||interaction.finishedAt!==job.completedAt||interaction.finishedAt<period.from||interaction.finishedAt>period.to||interaction.context!==true||interaction.obligations?.length||!interaction.agent||!assignment||assignment.personSnapshot?.id!==interaction.agent||!assignment.personSnapshot?.skills?.includes('service')||!caseRow||caseRow.tenant!==root.tenant||!caseRow.interactions?.includes(interaction.id)||interaction.media?.in!==true||interaction.media?.out!==true||!interaction.voicePath?.platform||interaction.voicePath.carrier!=='carrier'||!carrierTrace||!call||call.at!==interaction.startedAt||call.platform!==interaction.voicePath.platform||typeof call.from!=='string'||!call.from||typeof call.dialled!=='string'||!/^\+[1-9][0-9]{7,14}$/.test(call.dialled)||!route||route.at!==interaction.startedAt||route.normalised!==call.dialled||route.target!==interaction.destination||!root.resources[interaction.voicePath.platform]||!root.resources.carrier)continue;
   return {jobId:job.id,interactionId:interaction.id,caseId:caseRow.id||interaction.caseId,assignmentId:assignment.id,startedAt:interaction.startedAt,finishedAt:interaction.finishedAt,media:{in:true,out:true},platform:interaction.voicePath.platform,carrier:interaction.voicePath.carrier,carrierTrace:{code:carrierTrace.code,direction:carrierTrace.direction,carrier:carrierTrace.carrier},externalCall:{from:call.from,dialled:call.dialled,normalised:route.normalised,target:route.target,at:call.at,platform:{id:call.platform,generation:root.resources[call.platform].generation},carrier:{id:carrierTrace.carrier,generation:root.resources.carrier.generation},media:{in:true,out:true}}};
  }
  return null;
 }
 const COST_REASONS=['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'];
 function settlementRows(s,c,period){
  const history=(c.history||[]).find(x=>x.period===period&&x.basis==='provider-period-history-v1'&&x.fullPeriod===true&&x.qualified===true&&integer(x.from)&&integer(x.to)&&x.to-x.from===60&&x.settledAt===x.to);
  if(!history||history.from<c.retailAgreement.at||!integer(history.grossRetail,1)||!integer(history.netRetail,1)||!integer(history.voiceMinutes,1)||!integer(history.voiceCost,1)||!integer(history.wholesale,1))return null;
  const global=s.providerCampaign.periodHistory?.find(x=>x.period===period&&x.from===history.from&&x.to===history.to&&x.settledAt===history.to);
  const revenue=(s.business?.ledger||[]).find(x=>x.category==='revenue'&&x.reason==='provider-customer-period'&&x.customerId===c.id&&x.period===period&&x.at===history.to&&x.cents===history.grossRetail);
  const costs=(s.business?.ledger||[]).filter(x=>x.category==='cost'&&x.customerId===c.id&&x.period===period&&x.at===history.to&&COST_REASONS.includes(x.reason));
  if(!global||!revenue||!costs.length||!integer(history.messageCost)||costs.reduce((n,x)=>n+x.cents,0)!==history.wholesale+history.voiceCost+history.messageCost||!costs.some(x=>x.reason==='provider-wholesale-period'||x.reason==='provider-operation-period')||!costs.some(x=>x.reason==='provider-voice-usage'))return null;
  return {period,from:history.from,to:history.to,settledAt:history.settledAt,qualified:history.qualified,grossRetailCents:history.grossRetail,netRetailCents:history.netRetail,voiceMinutes:history.voiceMinutes,voiceCostCents:history.voiceCost,messageCostCents:history.messageCost,wholesaleCents:history.wholesale,globalOperatingResultCents:global.operatingResult,revenue:{id:revenue.id,cents:revenue.cents,customerId:revenue.customerId,period:revenue.period,at:revenue.at},costs:costs.map(x=>({id:x.id,cents:x.cents,reason:x.reason,customerId:x.customerId,period:x.period,at:x.at})).sort((a,b)=>a.id.localeCompare(b.id))};
 }
 function wholesaleFor(s,c,period,settlement,hooks,historical){
  const statement=!historical&&typeof hooks.wholesaleStatement==='function'?hooks.wholesaleStatement(s,c.id):null;
  const row=statement?.available===true&&Array.isArray(statement.rows)?statement.rows.find(x=>x.customerId===c.id&&x.period===period.period):null;
  if(!historical&&(!row||!id(statement.deploymentId)))return null;
  const productProject=(s.providerCampaign.projects||[]).findLast(x=>x.customerId===c.id&&(x.productId==='cisco-provider-operations'||x.operationId==='cisco-provider-operations')&&x.status==='complete'&&x.completedAt<=period.from&&paidPosting(s,x,'provider-operation'));
  if(!productProject)return null;
  const entries=settlement.costs.filter(x=>['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'].includes(x.reason));
  const postingIds=entries.map(x=>x.id).sort();
  if(row&&(row.totalCents!==settlement.wholesaleCents+settlement.voiceCostCents+((s.providerCampaign.customers.find(x=>x.id===c.id)?.history||[]).find(x=>x.period===period.period)?.messageCost||0)||!same(row.postingIds,postingIds)||row.wholesaleCents!==undefined&&row.fixedCents!==settlement.wholesaleCents||row.voiceCents!==settlement.voiceCostCents))return null;
  return {deploymentId:statement?.deploymentId||`d-cisco-provider-operations`,projectId:productProject.id,projectPostingId:productProject.postingId,period:period.period,totalCents:row?.totalCents??settlement.wholesaleCents+settlement.voiceCostCents+settlement.messageCostCents,postingIds};
 }
 function candidateCustomer(s,c,period,hooks,options={}){
  if(options.historical!==true){const supported=supportedCustomer(s,c,hooks);if(supported.missing)return null;
   const history=(c.history||[]).find(x=>x.period===period&&x.fullPeriod===true&&x.qualified===true);if(!history)return null;
   const settlement=settlementRows(s,c,period);if(!settlement)return null;
   const voice=voiceProof(s,c,supported.root,history);if(!voice)return null;
   if(supported.support.effectiveAt>history.from)return null;
   const wholesale=wholesaleFor(s,c,history,settlement,hooks,false);if(!wholesale)return null;
   const acceptedAt=c.customerAcceptedAt??c.retailAgreement.at,support=copy(supported.support);
   // The responsibility adapter reports the latest retail-agreement date.
   // The progression receipt records the durable opening date instead, so a
   // later ordinary renewal does not rewrite the historical support snapshot.
   support.acceptedAt=acceptedAt;
   return {customerId:c.id,portfolioId:c.portfolioId,tenant:supported.root.tenant,market:c.market,acceptedAt,serviceProjects:supported.stages,support,voice,settlement,wholesaleStatement:wholesale};
  }
  return null;
 }
 function level5(s,hooks={},options={}){
  const customers=(s.providerCampaign.customers||[]).filter(c=>['active','renewal'].includes(c.status)).sort((a,b)=>a.id.localeCompare(b.id));
  const periods=[...new Set(customers.flatMap(c=>(c.history||[]).filter(h=>h.fullPeriod&&h.qualified).map(h=>h.period)))].sort((a,b)=>b-a);
  for(const period of periods){
   const rows=customers.map(c=>candidateCustomer(s,c,period,hooks,options)).filter(Boolean);
   for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(rows[i].customerId!==rows[j].customerId&&rows[i].portfolioId!==rows[j].portfolioId&&rows[i].tenant!==rows[j].tenant){
    if(rows[i].settlement.period!==rows[j].settlement.period||rows[i].settlement.from!==rows[j].settlement.from||rows[i].settlement.to!==rows[j].settlement.to)continue;
    const evidence={kind:'provider-national-wholesale-v1',version:VERSION,sourceId:LEVEL5,interval:{from:rows[i].settlement.from,to:rows[i].settlement.to},customers:[rows[i],rows[j]].sort((a,b)=>a.customerId.localeCompare(b.customerId))};
    return {status:'ready',missing:[],evidence};
   }
  }
  const missing=['TWO_DISTINCT_CURRENTLY_SUPPORTED_TENANTS_REQUIRED','SAME_FULL_SETTLEMENT_PERIOD_REQUIRED','REAL_RESOLVED_VOICE_AND_WHOLESALE_POSTINGS_REQUIRED'];
  return {status:'incomplete',missing,evidence:null};
 }
 function localRecord(child,record,options){if(!record)return false;if(!record.deleted)return true;return options.historical===true&&integer(options.claimedAt)&&integer(record.expiresAt)&&integer(record.deletedAt)&&record.deletedAt>options.claimedAt&&record.deletedAt>=record.expiresAt;}
 function descendant(child,record,ancestor){let current=record,seen=new Set();for(let n=0;n<16&&current&&!seen.has(current.id);n++){if(current.id===ancestor)return true;seen.add(current.id);current=child.records?.find(x=>x.id===current.parents?.[0]);}return false;}
 function boundaryFlow(child,resourceId,hooks){
  if(typeof hooks.boundaryCheck==='function'){const result=hooks.boundaryCheck(child,resourceId);if(result?.eligible===true||result?.evaluation?.eligible===true)return result;return null;}
  const contractId=child.boundaries?.bindings?.[resourceId],contract=child.boundaries?.contracts?.find(x=>x.id===contractId),flow=contract?.effective?.flows?.find(x=>x.resource===resourceId),evaluation=contract&&boundaryApi().evaluate(child,contract.id);
  return contract?.provisioning?.status==='ready'&&contract.provisioning.generation===contract.generation&&flow&&evaluation?.eligible===true?{contract,flow,evaluation}:null;
 }
 function actualArtifact(child,recordId,period,jurisdiction,options){
  const transcript=child.records?.find(x=>x.id===recordId&&x.kind==='transcription'&&localRecord(child,x,options)&&x.interaction&&x.createdAt>=period.from&&x.createdAt<=period.to&&x.processRegion===jurisdiction&&x.region===jurisdiction&&x.archiveId==='archive');
  if(!transcript)return null;
  const source=child.records?.find(x=>x.kind==='recording'&&localRecord(child,x,options)&&x.interaction===transcript.interaction&&x.createdAt<=transcript.createdAt&&(x.captureScope??'complete')==='complete'&&descendant(child,transcript,x.id));
  if(!source||source.region!==jurisdiction||source.createdAt<period.from||source.createdAt>period.to)return null;
  const job=child.information?.jobs?.find(x=>x.source===source.id&&x.parent===transcript.id&&x.interaction===source.interaction&&x.status==='complete'&&x.stage===x.plan?.steps?.length&&x.plan.steps.includes('transcription')&&x.plan.processor==='speech'&&x.plan.archive==='archive');
  const interaction=child.interactions?.find(x=>x.id===source.interaction&&x.phase==='resolved'&&x.probe!==true);
  const caseRow=interaction&&child.cases?.[interaction.caseId];
  if(!job||!interaction||interaction.finishedAt<period.from||interaction.finishedAt>period.to||!caseRow||caseRow.tenant!==child.tenant||!caseRow.interactions?.includes(interaction.id))return null;
  return {transcriptRecordId:transcript.id,recordingRecordId:source.id,processingJobId:job.id,interactionId:interaction.id,caseId:interaction.caseId,recordingAt:source.createdAt,processedAt:job.createdAt,transcriptAt:transcript.createdAt,processRegion:transcript.processRegion,storageRegion:transcript.region,sourceArchiveId:source.archiveId||'archive',transcriptArchiveId:transcript.archiveId};
 }
 function architectureFor(s,c,child,hooks,options={}){
  const gov=child.providerGovernment;if(!gov||gov.version!==1||!['regional-cloud','local-processing'].includes(gov.architectureId))return null;
  const operationId=gov.architectureId==='local-processing'?'compliance-local':'compliance',project=s.providerCampaign.projects.find(x=>x.id===gov.projectId&&x.customerId===c.id&&x.operationId===operationId&&x.postingId===gov.postingId&&x.status==='complete'&&paidPosting(s,x,'provider-operation'));
  if(!project||project.configSubmittedAt!==gov.installedAt+1||project.completedAt> s.clock)return null;
  const api=governmentApi(),plan=api.plan(gov.architectureId,{jurisdiction:child.jurisdiction});
  const rows=[];
  for(const flow of plan.boundaryContract.flows){
   const proof=boundaryFlow(child,flow.resource,hooks);if(!proof)return null;
   const boundId=child.boundaries?.bindings?.[flow.resource],boundContract=child.boundaries?.contracts?.find(x=>x.id===boundId);
   const actual=proof.flow||proof.contract?.effective?.flows?.find(x=>x.resource===flow.resource)||boundContract?.effective?.flows?.find(x=>x.resource===flow.resource);
   if(!actual||actual.resource!==flow.resource||!['processingRegions','storageRegions','backupRegions','keyCustodyRegions','adminLocations','supportRegions'].every(k=>same(actual[k],flow[k])))return null;
   rows.push({resourceId:flow.resource,contractId:proof.contract?.id||proof.contractId||boundId,boundaryGeneration:proof.contract?.generation||boundContract?.generation||proof.generation||null,eligible:true,processingRegions:copy(actual.processingRegions),storageRegions:copy(actual.storageRegions),backupRegions:copy(actual.backupRegions),keyCustodyRegions:copy(actual.keyCustodyRegions),adminLocations:copy(actual.adminLocations),supportRegions:copy(actual.supportRegions)});
  }
  const generations={};for(const [resourceId,required] of Object.entries(plan.resourceConfigs)){const resource=child.resources?.[resourceId];if(!resource||resource.effective?.enabled!==true||resource.provisioning?.status!=='ready'||resource.provisioning?.generation!==resource.generation||typeof hooks.observeResource==='function'&&hooks.observeResource(child,resourceId)?.ready!==true||Object.entries(required).some(([key,value])=>key==='capacity'? !integer(resource.effective[key],value):!same(resource.effective[key],value)))return null;generations[resourceId]=resource.generation;}
  return {architectureId:gov.architectureId,projectId:project.id,postingId:project.postingId,installedAt:gov.installedAt,completedAt:project.completedAt,jurisdiction:child.jurisdiction,generations,boundaries:rows.sort((a,b)=>a.resourceId.localeCompare(b.resourceId))};
 }
 function governmentVictory(s,c){
  const p=s.providerCampaign,proof=p.scenario==='government'&&p.missionStatus==='won'?p.mission?.victoryProof:null;
  if(!proof||proof.version!==1||proof.scenario!=='government'||proof.focusCustomerId!==c.id||!integer(proof.at)||proof.at>s.clock||!integer(proof.qualifiedPeriods,2)||!Array.isArray(proof.periods)||proof.periods.length!==2)return null;
  const event=p.events?.find(x=>x.id===proof.eventId);
  if(!event||event.code!=='MISSION_WON'||event.customerId!==proof.winnerCustomerId||event.at!==proof.at||event.qualifiedPeriods!==proof.qualifiedPeriods)return null;
  const periods=proof.periods;
  if(periods.some((x,i)=>!integer(x.period)||!integer(x.from)||x.from!==x.period*60||x.to!==x.from+60||x.focusCustomerId!==c.id||x.due!==24||x.qualified!==true||!integer(x.completedOnTime,22)||x.operatingResult<=0||x.to>proof.at||i&&x.period!==periods[i-1].period+1))return null;
  for(const period of periods){const actual=p.periodHistory?.find(x=>x.period===period.period);if(!actual||actual.from!==period.from||actual.to!==period.to||actual.focusCustomerId!==c.id||actual.qualified!==true||actual.operatingResult!==period.operatingResult)return null;}
  return {eventId:proof.eventId,at:proof.at,focusCustomerId:proof.focusCustomerId,winnerCustomerId:proof.winnerCustomerId,qualifiedPeriods:proof.qualifiedPeriods,periods:copy(periods)};
 }
 function validateGovernmentVictory(s,c,v){
  if(!exact(v,['eventId','at','focusCustomerId','winnerCustomerId','qualifiedPeriods','periods'])||!id(v.eventId)||!integer(v.at)||v.at>s.clock||v.focusCustomerId!==c.id||!id(v.winnerCustomerId)||!integer(v.qualifiedPeriods,2)||!Array.isArray(v.periods)||v.periods.length!==2)return false;
  const p=s.providerCampaign,event=p.events?.find(x=>x.id===v.eventId),segment=p.segmentHistory?.find(x=>x.scenario==='government'&&x.at>=v.at&&x.focusCustomerId===c.id&&x.winnerCustomerId===v.winnerCustomerId&&x.qualifiedPeriods===v.qualifiedPeriods);
  if(event){if(event.code!=='MISSION_WON'||event.customerId!==v.winnerCustomerId||event.at!==v.at||event.qualifiedPeriods!==v.qualifiedPeriods)return false;}
  else if(!segment||!integer(p.eventCheckpoint?.codes?.MISSION_WON,1))return false;
  if(p.scenario==='government'&&p.missionStatus==='won'&&p.mission?.victoryProof?.eventId===v.eventId){if(!same(p.mission.victoryProof.periods,v.periods))return false;}
  else if(!segment)return false;
  for(let i=0;i<v.periods.length;i++){const row=v.periods[i];if(!exact(row,['period','from','to','focusCustomerId','due','completedOnTime','operatingResult','qualified','solvency'])||!integer(row.period)||!integer(row.from)||row.from!==row.period*60||row.to!==row.from+60||row.focusCustomerId!==c.id||row.due!==24||!integer(row.completedOnTime,22)||row.completedOnTime>24||!Number.isSafeInteger(row.operatingResult)||row.operatingResult<=0||row.qualified!==true||!['current','grace'].includes(row.solvency)||row.to>v.at||i&&row.period!==v.periods[i-1].period+1)return false;const actual=p.periodHistory?.find(x=>x.period===row.period);if(actual){if(!['period','from','to','focusCustomerId','due','completedOnTime','operatingResult','qualified','solvency'].every(k=>actual[k]===row[k]))return false;}else if(!(row.period<p.historyCheckpoint?.periods))return false;}
  return v.periods.at(-1).to===Math.floor(v.at/60)*60;
 }
 function boundaryRecovery(s,c,child,arch){
  const p=s.providerCampaign,mission=rulesApi().data.missions.government,variant=mission.incidentVariants?.[p.seed%mission.incidentVariants.length];
  if(!variant||variant.kind!=='boundary'||variant.resource!=='speech'||variant.field!=='supportRegions')return null;
  const incident=p.incidents?.find(x=>x.customerId===c.id&&x.kind==='boundary'&&x.resource==='speech'&&x.fault==='BOUNDARY_SUPPORT');
  if(!incident||incident.status!=='resolved'||!integer(incident.createdAt)||!integer(incident.dueAt)||!integer(incident.activatedAt)||!integer(incident.acknowledgedAt)||!integer(incident.resolvedAt)||incident.createdAt>incident.dueAt||incident.dueAt>incident.activatedAt||incident.activatedAt>incident.acknowledgedAt||incident.acknowledgedAt>incident.resolvedAt||!incident.receipt||incident.receipt.at!==incident.activatedAt-1||incident.receipt.resource!=='speech'||incident.receipt.field!=='supportRegions')return null;
  const repairs=p.projects?.filter(x=>x.customerId===c.id&&x.operationId==='repair'&&x.status==='complete'&&x.acceptedAt>=incident.acknowledgedAt&&x.configSubmittedAt===incident.resolvedAt&&x.completedAt>=incident.resolvedAt&&x.operationReceipt?.at===x.configSubmittedAt-1&&x.operationReceipt?.resources?.includes('speech')&&paidPosting(s,x,'provider-operation'))||[];
  if(repairs.length!==1)return null;const repair=repairs[0];
  const previous=incident.receipt.previousContract,priorFlow=previous?.flows?.find(x=>x.resource==='speech');
  const current=child.boundaries?.contracts?.find(x=>x.id===arch.boundaries.find(y=>y.resourceId==='speech')?.contractId),flow=current?.effective?.flows?.find(x=>x.resource==='speech');
  if(!priorFlow||!same(priorFlow.supportRegions,[child.jurisdiction])||!flow||!same(flow.supportRegions,[child.jurisdiction])||!boundaryFlow(child,'speech',{})||current.generation<=0)return null;
  const saved=arch.boundaries.find(x=>x.resourceId==='speech');
  if(!saved||saved.contractId!==current.id||saved.boundaryGeneration!==current.generation)return null;
  return {incidentId:incident.id,createdAt:incident.createdAt,activatedAt:incident.activatedAt,acknowledgedAt:incident.acknowledgedAt,resolvedAt:incident.resolvedAt,resource:'speech',field:'supportRegions',previousSupportRegions:copy(priorFlow.supportRegions),recoveredSupportRegions:copy(flow.supportRegions),contractId:current.id,boundaryGeneration:current.generation,repairProjectId:repair.id,repairPostingId:repair.postingId,repairSubmittedAt:repair.configSubmittedAt,repairCompletedAt:repair.completedAt};
 }
 function validateBoundaryRecovery(s,c,child,arch,b,options={}){
  if(!exact(b,['incidentId','createdAt','activatedAt','acknowledgedAt','resolvedAt','resource','field','previousSupportRegions','recoveredSupportRegions','contractId','boundaryGeneration','repairProjectId','repairPostingId','repairSubmittedAt','repairCompletedAt'])||b.resource!=='speech'||b.field!=='supportRegions'||!id(b.incidentId)||!id(b.contractId)||!id(b.repairProjectId)||!id(b.repairPostingId)||!integer(b.createdAt)||!integer(b.activatedAt)||!integer(b.acknowledgedAt)||!integer(b.resolvedAt)||!integer(b.boundaryGeneration,1)||!integer(b.repairSubmittedAt)||!integer(b.repairCompletedAt)||b.createdAt>b.activatedAt||b.activatedAt>b.acknowledgedAt||b.acknowledgedAt>b.resolvedAt||b.repairSubmittedAt!==b.resolvedAt||b.repairCompletedAt<b.resolvedAt||!same(b.previousSupportRegions,[child.jurisdiction])||!same(b.recoveredSupportRegions,[child.jurisdiction]))return false;
  const incident=s.providerCampaign.incidents?.find(x=>x.id===b.incidentId&&x.customerId===c.id),repairs=s.providerCampaign.projects?.filter(x=>x.customerId===c.id&&x.operationId==='repair'&&x.status==='complete'&&x.acceptedAt>=b.acknowledgedAt&&x.configSubmittedAt===b.resolvedAt&&x.completedAt>=b.resolvedAt&&x.operationReceipt?.at===x.configSubmittedAt-1&&x.operationReceipt?.resources?.includes('speech')&&paidPosting(s,x,'provider-operation'))||[];
  const repair=repairs.find(x=>x.id===b.repairProjectId);
  if(!incident||incident.kind!=='boundary'||incident.resource!=='speech'||incident.fault!=='BOUNDARY_SUPPORT'||incident.status!=='resolved'||incident.createdAt!==b.createdAt||incident.activatedAt!==b.activatedAt||incident.acknowledgedAt!==b.acknowledgedAt||incident.resolvedAt!==b.resolvedAt||repairs.length!==1||incident.receipt?.at!==b.activatedAt-1||incident.receipt?.resource!=='speech'||incident.receipt?.field!=='supportRegions'||incident.receipt?.contractId!==b.contractId||!same(incident.receipt.previousContract?.flows?.find(x=>x.resource==='speech')?.supportRegions,b.previousSupportRegions)||!repair||repair.postingId!==b.repairPostingId||repair.configSubmittedAt!==b.repairSubmittedAt||repair.completedAt!==b.repairCompletedAt||repair.operationReceipt?.at!==repair.configSubmittedAt-1||!repair.operationReceipt?.resources?.includes('speech')||!paidPosting(s,repair,'provider-operation'))return false;
  if(!['provider-campaigns-6'].includes(s.providerCampaign.contentVersion))return false;
  const contract=child.boundaries?.contracts?.find(x=>x.id===b.contractId),saved=arch.boundaries?.find(x=>x.resourceId==='speech');
  if(!contract||!saved||saved.contractId!==b.contractId||saved.boundaryGeneration!==b.boundaryGeneration||contract.generation<b.boundaryGeneration)return false;
  if(options.historical===true)return true;
  const flow=contract.effective?.flows?.find(x=>x.resource==='speech');
  return contract.provisioning?.status==='ready'&&flow&&same(flow.supportRegions,b.recoveredSupportRegions)&&boundaryFlow(child,'speech',{})!==null;
 }
 function level6Candidate(s,c,hooks,options={}){
  const blocked=reason=>({status:'incomplete',missing:[reason],evidence:null});
  if(c.scenario!=='government'||!['active','renewal'].includes(c.status)||!c.retailAgreement)return blocked('ACTIVE_ACCEPTED_GOVERNMENT_CUSTOMER_REQUIRED');
  const child=customerRoot(s,c,hooks);if(!child||child.providerCustomer?.id!==c.id||child.providerCustomer.version!==1||child.providerCampaign)return blocked('VALIDATED_GOVERNMENT_TENANT_REQUIRED');
  const arch=architectureFor(s,c,child,hooks,options);if(!arch)return blocked('PAID_ELIGIBLE_GOVERNMENT_ARCHITECTURE_REQUIRED');
  const victory=governmentVictory(s,c);if(!victory)return blocked('GOVERNMENT_MISSION_VICTORY_REQUIRED');
  const recovery=boundaryRecovery(s,c,child,arch);if(!recovery)return blocked('AUTHORED_BOUNDARY_INCIDENT_AND_PAID_SPEECH_RECOVERY_REQUIRED');
  const periods=(c.history||[]).filter(h=>h.fullPeriod===true&&h.qualified===true&&h.evidence?.passed===true&&h.evidence?.boundaryEligible===true&&h.evidence?.transcripts?.length&&h.from>=c.retailAgreement.at).sort((a,b)=>b.to-a.to);
  for(const history of periods){
   const settlement=settlementRows(s,c,history.period);if(!settlement)continue;
   const global=s.providerCampaign.periodHistory.find(x=>x.period===history.period&&x.qualified===true&&x.settledAt===history.to);if(!global)continue;
   const artifacts=history.evidence.transcripts.map(recordId=>actualArtifact(child,recordId,history,child.jurisdiction,options)).filter(Boolean);if(!artifacts.length)continue;
   const evidence={kind:'provider-public-service-v1',version:VERSION,sourceId:LEVEL6,customerId:c.id,portfolioId:c.portfolioId,market:c.market,jurisdiction:child.jurisdiction,architecture:arch,missionVictory:victory,boundaryRecovery:recovery,missionPeriod:{period:history.period,from:history.from,to:history.to,settledAt:history.settledAt,qualified:history.qualified,missionPassed:history.evidence.passed,boundaryEligible:history.evidence.boundaryEligible,transcriptIds:[...history.evidence.transcripts].sort()},artifacts:artifacts.sort((a,b)=>a.transcriptRecordId.localeCompare(b.transcriptRecordId)),settlement,interval:{from:history.from,to:history.to}};
   return {status:'ready',missing:[],evidence};
  }
  return blocked('QUALIFIED_PROVIDER_GOVERNMENT_HISTORY_WITH_ELIGIBLE_FLOWS_AND_PROCESSING_REQUIRED');
 }
 function evaluate(s,hooks={}){
  if(!s||s.experience?.version!==1||s.experience?.kind!=='campaign'||s.experience?.custom!==false||s.providerCampaign?.pack!=='soc-provider-campaign-1')fail('PROVIDER_CENTRAL_PROGRESSION_CAMPAIGN_REQUIRED');
  const five=level5(s,hooks),candidates=(s.providerCampaign.customers||[]).filter(c=>c.scenario==='government').map(c=>level6Candidate(s,c,hooks)).sort((a,b)=>(a.evidence?.interval.to??Number.MAX_SAFE_INTEGER)-(b.evidence?.interval.to??Number.MAX_SAFE_INTEGER));
  const six=candidates.find(x=>x.status==='ready')||candidates[0]||{status:'incomplete',missing:['QUALIFIED_PROVIDER_GOVERNMENT_HISTORY_WITH_ELIGIBLE_FLOWS_AND_PROCESSING_REQUIRED'],evidence:null};
  return {version:VERSION,contentVersion:CONTENT,asOf:s.clock,levels:{[LEVEL5]:{sourceId:LEVEL5,name:NAME5,...five},[LEVEL6]:{sourceId:LEVEL6,name:NAME6,...six}}};
 }
 function verifyLevel5(s,evidence,hooks,options){
  if(!exact(evidence,['kind','version','sourceId','interval','customers'])||evidence.kind!=='provider-national-wholesale-v1'||evidence.version!==VERSION||evidence.sourceId!==LEVEL5||!exact(evidence.interval,['from','to'])||!integer(evidence.interval.from)||!integer(evidence.interval.to)||evidence.interval.to-evidence.interval.from!==60||!Array.isArray(evidence.customers)||evidence.customers.length!==2)return false;
  const rows=evidence.customers;if(!same(rows,[...rows].sort((a,b)=>a.customerId.localeCompare(b.customerId)))||new Set(rows.map(x=>x.customerId)).size!==2||new Set(rows.map(x=>x.portfolioId)).size!==2||new Set(rows.map(x=>x.tenant)).size!==2)return false;
  const rebuilt=level5(s,hooks,{historical:options.historical===true,claimAt:options.claimedAt});
  if(rebuilt.status==='ready'&&same(rebuilt.evidence,evidence))return true;
  if(options.historical!==true)return false;
  return historicalLevel5(s,evidence,hooks,options);
 }
 function historicalLevel5(s,evidence,hooks,options){
  const retained=s.providerCampaign.centralSupportHistory,receipt=s.providerCampaign.progressionReceipts?.receipts?.find(x=>x.sourceId===LEVEL5);
  if(receipt){
   if(!integer(options.claimedAt)||receipt.at!==options.claimedAt||!exact(retained,['version','receiptId','at','participants'])||retained.version!==1||retained.receiptId!==receipt.id||retained.at!==receipt.at||!Array.isArray(retained.participants)||retained.participants.length!==receipt.customerIds.length||!same(retained.participants.map(x=>x?.customerId),receipt.customerIds))return false;
  }else if(options.claimedAt!==s.clock){return false;}
  for(const row of evidence.customers){
   if(!exact(row,['customerId','portfolioId','tenant','market','acceptedAt','serviceProjects','support','voice','settlement','wholesaleStatement'])||!id(row.customerId)||!integer(row.acceptedAt)||!Array.isArray(row.serviceProjects)||row.serviceProjects.length!==3)return false;
   const c=s.providerCampaign.customers.find(x=>x.id===row.customerId),root=c&&customerRoot(s,c,hooks);if(!c||c.portfolioId!==row.portfolioId||c.market!==row.market||!root||root.providerCustomer?.id!==c.id||root.tenant!==row.tenant||row.acceptedAt!==(c.customerAcceptedAt??c.retailAgreement?.at)||row.acceptedAt>evidence.interval.from||row.serviceProjects.some(x=>!exact(x,['stageId','projectId','postingId','acceptedAt','completedAt'])||!integer(x.acceptedAt)||!integer(x.completedAt)||x.completedAt<x.acceptedAt))return false;
   const projects=row.serviceProjects.map(x=>s.providerCampaign.projects.find(p=>p.id===x.projectId&&p.customerId===c.id&&p.postingId===x.postingId&&p.kind==='stage'&&p.stage===x.stageId&&p.status==='complete'));
   if(projects.some((p,i)=>!p||!paidPosting(s,p,'provider-implementation')||p.acceptedAt!==row.serviceProjects[i].acceptedAt||p.completedAt!==row.serviceProjects[i].completedAt))return false;
   const support=row.support,supportProject=s.providerCampaign.projects.find(x=>x.id===support?.projectId&&x.postingId===support?.postingId&&x.customerId===c.id&&x.kind==='stage'&&x.stage==='partner'&&x.status==='complete');
   const stageRows=row.serviceProjects.map(x=>s.providerCampaign.projects.find(p=>p.id===x.projectId&&p.customerId===c.id&&p.kind==='stage'&&p.stage===x.stageId&&p.status==='complete'));
   const expectedScope=[...new Set(stageRows.flatMap(p=>p?.resources||[]))],expectedStageProjects=row.serviceProjects.map(x=>({stageId:x.stageId,projectId:x.projectId,postingId:x.postingId}));
   const expectedSetup=stageRows.reduce((n,p)=>n+(p?.setupCents||0),0),expectedPeriod=stageRows.reduce((n,p)=>n+(p?.periodCents||0),0),expectedEffective=Math.max(0,...stageRows.map(p=>p?.completedAt||0));
   const terms=support?.terms,shared=support?.evidence?.sharedWorkforce;
   if(!exact(support,['version','id','role','organisationId','customerId','scope','acceptedAt','effectiveAt','expiresAt','projectId','postingId','terms','evidence'])||support.version!==1||support.id!==`provider-responsibility-msp-${c.id}`||support.role!=='msp'||support.organisationId!=='orchard-msp'||support.customerId!==c.id||support.acceptedAt!==row.acceptedAt||support.acceptedAt!==(c.customerAcceptedAt??c.retailAgreement?.at)||support.expiresAt!==null||support.effectiveAt!==expectedEffective||support.effectiveAt>evidence.interval.from||!supportProject||!paidPosting(s,supportProject,'provider-implementation')||support.projectId!==supportProject.id||support.postingId!==supportProject.postingId||!same(support.scope,expectedScope)||!exact(support.terms,['setupCents','periodCents','engineers','support'])||terms.setupCents!==expectedSetup||terms.periodCents!==expectedPeriod||!integer(terms.engineers,0)||terms.engineers>20||!integer(terms.support,1)||terms.support>20||!exact(support.evidence,['stageProjects','sharedWorkforce'])||!same(support.evidence.stageProjects,expectedStageProjects)||!exact(shared,['engineers','support','personMinutes','billedMinutes'])||shared.engineers!==terms.engineers||shared.support!==terms.support||!integer(shared.personMinutes,1)||!integer(shared.billedMinutes,1))return false;
   if(receipt){
    const participant=retained.participants.find(x=>x.customerId===c.id),responsibility=participant?.responsibility;
    if(!exact(participant,['customerId','responsibility'])||!exact(responsibility,['id','customerId','role','organisationId','projectId','postingId','effectiveAt','expiresAt','scope','setupCents','periodCents','engineers','support','sharedWorkforce'])||responsibility.id!==support.id||responsibility.customerId!==support.customerId||responsibility.role!==support.role||responsibility.organisationId!==support.organisationId||responsibility.projectId!==support.projectId||responsibility.postingId!==support.postingId||responsibility.effectiveAt!==support.effectiveAt||responsibility.expiresAt!==support.expiresAt||!same(responsibility.scope,[...support.scope].sort())||responsibility.setupCents!==terms.setupCents||responsibility.periodCents!==terms.periodCents||responsibility.engineers!==terms.engineers||responsibility.support!==terms.support||!same(responsibility.sharedWorkforce,shared))return false;
   }else{
    const rebuilt=level5(s,hooks);if(rebuilt.status!=='ready'||!same(rebuilt.evidence,evidence))return false;
   }
   const pwh=row.wholesaleStatement,product=s.providerCampaign.projects.find(x=>x.id===pwh.projectId&&x.postingId===pwh.projectPostingId&&x.customerId===c.id&&x.status==='complete'&&x.completedAt<=evidence.interval.from&&(x.productId==='cisco-provider-operations'||x.operationId==='cisco-provider-operations'));
   if(!exact(pwh,['deploymentId','projectId','projectPostingId','period','totalCents','postingIds'])||!product||!paidPosting(s,product,'provider-operation')||pwh.deploymentId!=='d-cisco-provider-operations'||pwh.period!==row.settlement.period||pwh.totalCents!==row.settlement.wholesaleCents+row.settlement.voiceCostCents+row.settlement.messageCostCents||!same(pwh.postingIds,row.settlement.costs.map(x=>x.id).sort()))return false;
   if(!verifySettlementSnapshot(s,c,row.settlement,evidence.interval,options))return false;
   if(!verifyVoiceSnapshot(s,c,root,row.voice,row.settlement.period,evidence.interval,true))return false;
  }
  return true;
 }
 function verifyVoiceSnapshot(s,c,root,v,period,interval,historical=false){
  if(!exact(v,['jobId','interactionId','caseId','assignmentId','startedAt','finishedAt','media','platform','carrier','carrierTrace','externalCall'])||!id(v.jobId)||!id(v.interactionId)||!id(v.caseId)||!integer(v.startedAt)||!integer(v.finishedAt)||v.startedAt<interval.from||v.finishedAt>interval.to||v.finishedAt<v.startedAt||!same(v.media,{in:true,out:true})||v.carrier!=='carrier'||!id(v.platform)||!exact(v.carrierTrace,['code','direction','carrier'])||v.carrierTrace.code!=='CARRIER_PATH_ADMITTED'||v.carrierTrace.direction!=='outbound'||v.carrierTrace.carrier!=='carrier')return false;
  const j=s.providerCampaign.jobs.find(x=>x.id===v.jobId&&x.customerId===c.id&&x.interactionId===v.interactionId&&x.caseId===v.caseId&&x.channel==='voice'&&x.periodIndex===period&&['completed','late'].includes(x.status)&&x.completedAt===v.finishedAt&&x.contextRetained===true);
  const i=root.interactions?.find(x=>x.id===v.interactionId),assignment=root.workforceOps?.assignments?.find(x=>x.id===v.assignmentId&&x.status==='complete'),caseRow=i&&root.cases?.[i.caseId];
  const call=i?.trace?.find(x=>x.code==='CALL_REQUEST'&&x.platform),route=i?.trace?.find(x=>x.code==='ORDERED_ROUTE'),carrier=i?.trace?.find(x=>x.code==='CARRIER_PATH_ADMITTED'&&x.direction==='outbound');
  const saved=v.externalCall;
  const platformGeneration=saved?.platform?.generation,carrierGeneration=saved?.carrier?.generation,currentPlatform=root.resources?.[v.platform]?.generation,currentCarrier=root.resources?.carrier?.generation;
  return !!j&&!!i&&i.phase==='resolved'&&i.probe!==true&&i.channel==='voice'&&i.caseId===v.caseId&&i.startedAt===v.startedAt&&i.finishedAt===v.finishedAt&&i.context===true&&!i.obligations?.length&&i.agent&&assignment&&assignment.person===i.agent&&assignment.personSnapshot?.id===i.agent&&assignment.personSnapshot?.skills?.includes('service')&&caseRow?.tenant===root.tenant&&caseRow.interactions?.includes(i.id)&&i.media?.in===true&&i.media?.out===true&&i.voicePath?.platform===v.platform&&i.voicePath?.carrier==='carrier'&&carrier?.carrier==='carrier'&&carrier?.direction==='outbound'&&!!call&&call.at===i.startedAt&&call.platform===v.platform&&typeof call.from==='string'&&typeof call.dialled==='string'&&/^\+[1-9][0-9]{7,14}$/.test(call.dialled)&&!!route&&route.at===i.startedAt&&route.normalised===call.dialled&&route.target===i.destination&&exact(saved,['from','dialled','normalised','target','at','platform','carrier','media'])&&saved.from===call.from&&saved.dialled===call.dialled&&saved.normalised===route.normalised&&saved.target===route.target&&saved.at===i.startedAt&&saved.platform?.id===v.platform&&saved.carrier?.id==='carrier'&&integer(platformGeneration,1)&&integer(carrierGeneration,1)&&(historical?platformGeneration<=currentPlatform&&carrierGeneration<=currentCarrier:platformGeneration===currentPlatform&&carrierGeneration===currentCarrier)&&same(saved.media,{in:true,out:true});
 }
 function verifySettlementSnapshot(s,c,q,interval,options){
  if(!exact(q,['period','from','to','settledAt','qualified','grossRetailCents','netRetailCents','voiceMinutes','voiceCostCents','messageCostCents','wholesaleCents','globalOperatingResultCents','revenue','costs'])||q.to-q.from!==60||q.settledAt!==q.to||q.qualified!==true||q.from!==interval.from||q.to!==interval.to||!integer(q.grossRetailCents,1)||!integer(q.netRetailCents,1)||!integer(q.voiceMinutes,1)||!integer(q.voiceCostCents,1)||!integer(q.messageCostCents)||!integer(q.wholesaleCents,1)||!Array.isArray(q.costs)||!q.costs.length)return false;
  const history=c.history?.find(x=>x.period===q.period&&x.from===q.from&&x.to===q.to),global=s.providerCampaign.periodHistory?.find(x=>x.period===q.period&&x.from===q.from&&x.to===q.to);
  if(history){if(history.qualified!==true||history.grossRetail!==q.grossRetailCents||history.netRetail!==q.netRetailCents||history.wholesale!==q.wholesaleCents||history.voiceMinutes!==q.voiceMinutes||history.voiceCost!==q.voiceCostCents||history.messageCost!==q.messageCostCents)return false;}else if(!(c.historyCheckpoint?.periods>q.period))return false;
  if(global){if(global.qualified!==true||global.operatingResult!==q.globalOperatingResultCents||global.settledAt!==q.settledAt)return false;}else if(!(s.providerCampaign.historyCheckpoint?.periods>q.period))return false;
  const revenue=q.revenue,ledgerRevenue=postById(s,revenue?.id);
  if(!exact(revenue,['id','cents','customerId','period','at'])||revenue.customerId!==c.id||revenue.cents!==q.grossRetailCents||revenue.period!==q.period||revenue.at!==q.settledAt||ledgerRevenue&&(ledgerRevenue.category!=='revenue'||ledgerRevenue.reason!=='provider-customer-period'||ledgerRevenue.customerId!==c.id||ledgerRevenue.period!==q.period||ledgerRevenue.at!==q.settledAt||ledgerRevenue.cents!==q.grossRetailCents)||!ledgerRevenue&&!prunedPosting(s,revenue.id))return false;
  for(const cost of q.costs){if(!exact(cost,['id','cents','reason','customerId','period','at'])||cost.customerId!==c.id||cost.period!==q.period||cost.at!==q.settledAt||!COST_REASONS.includes(cost.reason)||!integer(cost.cents,1))return false;const actual=postById(s,cost.id);if(actual&&(actual.category!=='cost'||actual.cents!==cost.cents||actual.reason!==cost.reason||actual.customerId!==c.id||actual.period!==q.period||actual.at!==q.settledAt)||!actual&&!prunedPosting(s,cost.id))return false;}
  if(q.costs.reduce((n,x)=>n+x.cents,0)!==q.wholesaleCents+q.voiceCostCents+q.messageCostCents)return false;
  return true;
 }
 function validateArchitectureSnapshot(root,a,plan){
  const fields=['processingRegions','storageRegions','backupRegions','keyCustodyRegions','adminLocations','supportRegions'];
  if(!Array.isArray(a.boundaries)||a.boundaries.length!==plan.boundaryContract.flows.length||!same(a.boundaries,[...a.boundaries].sort((x,y)=>String(x.resourceId).localeCompare(String(y.resourceId)))))return false;
  const expected=[...plan.boundaryContract.flows].sort((x,y)=>x.resource.localeCompare(y.resource));
  for(let n=0;n<expected.length;n++){
   const row=a.boundaries[n],flow=expected[n];
   if(!exact(row,['resourceId','contractId','boundaryGeneration','eligible',...fields])||row.resourceId!==flow.resource||!id(row.contractId)||!integer(row.boundaryGeneration,1)||row.eligible!==true||fields.some(k=>!same(row[k],flow[k])))return false;
   const contract=root.boundaries?.contracts?.find(x=>x.id===row.contractId);
   if(!contract||contract.generation<row.boundaryGeneration)return false;
  }
  return true;
 }
 function validateEvidence(s,sourceId,evidence,hooks={},options={}){
  if(sourceId===LEVEL5)return verifyLevel5(s,evidence,hooks,options);
  if(sourceId===LEVEL6)return verifyLevel6(s,evidence,hooks,options);
  return false;
 }
 function verifyLevel6(s,evidence,hooks,options){
  if(!exact(evidence,['kind','version','sourceId','customerId','portfolioId','market','jurisdiction','architecture','missionVictory','boundaryRecovery','missionPeriod','artifacts','settlement','interval'])||evidence.kind!=='provider-public-service-v1'||evidence.version!==VERSION||evidence.sourceId!==LEVEL6||!id(evidence.customerId)||!id(evidence.portfolioId)||!id(evidence.market)||!id(evidence.jurisdiction)||!exact(evidence.interval,['from','to'])||!integer(evidence.interval.from)||!integer(evidence.interval.to)||evidence.interval.to-evidence.interval.from!==60||!Array.isArray(evidence.artifacts)||!evidence.artifacts.length)return false;
  const c=s.providerCampaign.customers.find(x=>x.id===evidence.customerId),root=c&&customerRoot(s,c,hooks);if(!c||c.scenario!=='government'||c.portfolioId!==evidence.portfolioId||c.market!==evidence.market||!root||root.providerCustomer?.id!==c.id||root.jurisdiction!==evidence.jurisdiction||evidence.interval.to> (options.claimedAt??s.clock))return false;
  const a=evidence.architecture,g=root.providerGovernment,project=a&&s.providerCampaign.projects.find(x=>x.id===a.projectId&&x.customerId===c.id&&x.postingId===a.postingId&&x.status==='complete'&&x.operationId===(a.architectureId==='local-processing'?'compliance-local':'compliance'));
  if(!project||!paidPosting(s,project,'provider-operation')||!g||g.version!==1||g.projectId!==project.id||g.postingId!==project.postingId||g.architectureId!==a.architectureId||g.installedAt!==a.installedAt||project.completedAt!==a.completedAt)return false;
  if(!validateGovernmentVictory(s,c,evidence.missionVictory)||!validateBoundaryRecovery(s,c,root,a,evidence.boundaryRecovery,options))return false;
  if(options.historical!==true){const rebuilt=level6Candidate(s,c,hooks);return !!rebuilt&&same(rebuilt.evidence,evidence);}
  if(!exact(a,['architectureId','projectId','postingId','installedAt','completedAt','jurisdiction','generations','boundaries'])||a.jurisdiction!==evidence.jurisdiction||!integer(a.installedAt)||!integer(a.completedAt)||!same(a.boundaries,[...a.boundaries].sort((x,y)=>x.resourceId.localeCompare(y.resourceId))))return false;
  const api=governmentApi(),plan=api.plan(a.architectureId,{jurisdiction:a.jurisdiction});
  if(!exact(a.generations,Object.keys(plan.resourceConfigs))||!validateArchitectureSnapshot(root,a,plan))return false;
  for(const resourceId of Object.keys(plan.resourceConfigs)){const r=root.resources?.[resourceId];if(!r||!integer(a.generations[resourceId],1)||r.generation<a.generations[resourceId])return false;}
  if(!exact(evidence.missionPeriod,['period','from','to','settledAt','qualified','missionPassed','boundaryEligible','transcriptIds'])||!integer(evidence.missionPeriod.period)||evidence.missionPeriod.from!==evidence.interval.from||evidence.missionPeriod.to!==evidence.interval.to||evidence.missionPeriod.to-evidence.missionPeriod.from!==60||evidence.missionPeriod.settledAt!==evidence.missionPeriod.to||evidence.missionPeriod.qualified!==true||evidence.missionPeriod.missionPassed!==true||evidence.missionPeriod.boundaryEligible!==true||!Array.isArray(evidence.missionPeriod.transcriptIds)||!same(evidence.missionPeriod.transcriptIds,[...evidence.missionPeriod.transcriptIds].sort()))return false;
  const history=c.history?.find(x=>x.period===evidence.missionPeriod.period&&x.from===evidence.interval.from&&x.to===evidence.interval.to),global=s.providerCampaign.periodHistory?.find(x=>x.period===evidence.missionPeriod.period&&x.from===evidence.interval.from&&x.to===evidence.interval.to);
  if(history){if(!history.fullPeriod||!history.qualified||!history.evidence?.passed||!history.evidence?.boundaryEligible||!same([...(history.evidence.transcripts||[])].sort(),evidence.missionPeriod.transcriptIds))return false;}else if(!(c.historyCheckpoint?.periods>evidence.missionPeriod.period))return false;
  if(global&&!global.qualified)return false;if(!global&&!(s.providerCampaign.historyCheckpoint?.periods>evidence.missionPeriod.period))return false;
  if(!verifySettlementSnapshot(s,c,evidence.settlement,evidence.interval,options))return false;
  if(!same(evidence.artifacts.map(x=>x.transcriptRecordId).sort(),evidence.missionPeriod.transcriptIds))return false;
  for(const item of evidence.artifacts){if(!exact(item,['transcriptRecordId','recordingRecordId','processingJobId','interactionId','caseId','recordingAt','processedAt','transcriptAt','processRegion','storageRegion','sourceArchiveId','transcriptArchiveId'])||item.processRegion!==evidence.jurisdiction||item.storageRegion!==evidence.jurisdiction||!integer(item.recordingAt)||!integer(item.processedAt)||!integer(item.transcriptAt)||item.recordingAt<evidence.interval.from||item.transcriptAt>evidence.interval.to)return false;
   const transcript=root.records?.find(x=>x.id===item.transcriptRecordId&&x.kind==='transcription'&&localRecord(root,x,options)),source=root.records?.find(x=>x.id===item.recordingRecordId&&x.kind==='recording'&&localRecord(root,x,options));
   const job=root.information?.jobs?.find(x=>x.id===item.processingJobId&&x.status==='complete'&&x.source===item.recordingRecordId&&x.parent===item.transcriptRecordId&&x.interaction===item.interactionId);
   const interaction=root.interactions?.find(x=>x.id===item.interactionId&&x.phase==='resolved'&&x.caseId===item.caseId),caseRow=interaction&&root.cases?.[item.caseId];
   if(!transcript||!source||!job||!interaction||!caseRow||source.interaction!==interaction.id||transcript.interaction!==interaction.id||!descendant(root,transcript,source.id)||source.region!==evidence.jurisdiction||source.captureRegion!==evidence.jurisdiction||transcript.region!==evidence.jurisdiction||transcript.processRegion!==evidence.jurisdiction||transcript.archiveId!=='archive'||caseRow.tenant!==root.tenant||!caseRow.interactions?.includes(interaction.id)||job.createdAt!==item.processedAt||job.stage!==job.plan?.steps?.length||!job.plan?.steps?.includes('transcription')||job.plan.processor!=='speech'||job.plan.archive!=='archive'||source.createdAt!==item.recordingAt||transcript.createdAt!==item.transcriptAt||item.sourceArchiveId!==(source.archiveId||'archive')||item.transcriptArchiveId!==transcript.archiveId)return false;
  }
  return true;
 }
 function validateCustomer(s,customerId,child){
  if(!s?.providerCampaign||!child?.providerCustomer)return true;
  const c=s.providerCampaign.customers.find(x=>x.id===customerId);if(!c||c.portfolioId!==child.providerCustomer.id||child.providerCampaign)fail('INVALID_PROVIDER_CENTRAL_CUSTOMER_SCOPE');
  return true;
 }
 function retentionPins(evidence,customerId){
  const out={interactionIds:[],caseIds:[],jobIds:[],processingJobIds:[],recordIds:[],incidentIds:[],projectIds:[]};
  if(!evidence||!['provider-national-wholesale-v1','provider-public-service-v1'].includes(evidence.kind)||evidence.version!==VERSION||!id(customerId))return out;
  const uniq=xs=>[...new Set(xs.filter(x=>typeof x==='string'))].sort();
  if(evidence.kind==='provider-national-wholesale-v1'){
   const rows=(evidence.customers||[]).filter(x=>x.customerId===customerId);out.interactionIds=uniq(rows.map(x=>x.voice?.interactionId));out.caseIds=uniq(rows.map(x=>x.voice?.caseId));out.jobIds=uniq(rows.map(x=>x.voice?.jobId));out.projectIds=uniq(rows.flatMap(x=>[...(x.serviceProjects||[]).map(p=>p.projectId),x.support?.projectId,x.wholesaleStatement?.projectId]));
  }else{
   if(evidence.customerId!==customerId)return out;
   out.interactionIds=uniq(evidence.artifacts?.map(x=>x.interactionId)||[]);out.caseIds=uniq(evidence.artifacts?.map(x=>x.caseId)||[]);out.processingJobIds=uniq(evidence.artifacts?.map(x=>x.processingJobId)||[]);out.recordIds=uniq(evidence.artifacts?.flatMap(x=>[x.recordingRecordId,x.transcriptRecordId])||[]);out.incidentIds=uniq([evidence.boundaryRecovery?.incidentId]);out.projectIds=uniq([evidence.architecture?.projectId,evidence.boundaryRecovery?.repairProjectId]);
  }
  return out;
 }
 function source(){return `const SOC_PROVIDER_CENTRAL_PROGRESSION=(${socProviderCentralProgressionKernel.toString()})();`;}
 return {VERSION,CONTENT,LEVEL5,LEVEL6,evaluate,validateEvidence,validateCustomer,retentionPins,source};
}
const SOC_PROVIDER_CENTRAL_PROGRESSION=socProviderCentralProgressionKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_PROVIDER_CENTRAL_PROGRESSION=SOC_PROVIDER_CENTRAL_PROGRESSION;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_CENTRAL_PROGRESSION;
