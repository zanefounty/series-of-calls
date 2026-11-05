/* Pure evidence adapter for the fictional local media/speech progression goal. */
function socProviderLocalProgressionKernel(){
 'use strict';
 const VERSION=1,CONTENT='provider-local-progression-1',SOURCE='progress.goal.'+'ca';
 const NAME='Local media or speech service',PACK='provider-local-progression';
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(x);
 const REQUIRED_LOCAL=['identity','access','phone','carrier','messages','engage'];
 const ROOT_LOCAL=['local','identity','access','phone','carrier','messages','engage'];
 const OPS=['local-spares','managed-local-spares'];
 function continuityApi(){return typeof SOC_PROVIDER_CONTINUITY!=='undefined'?SOC_PROVIDER_CONTINUITY:(typeof require==='function'?require('./23-provider-continuity.js'):null);}
 function customerRoot(s,c,hooks={}){return typeof hooks.customerRoot==='function'?hooks.customerRoot(s,c.portfolioId):s?.portfolio?.customers?.find(x=>x.id===c.portfolioId)?.root||c.root||null;}
 function postingFor(s,c,p){
  if(!p||p.kind!=='operation'||p.customerId!==c.id||p.status!=='complete'||!id(p.id)||!id(p.postingId)||!integer(p.completedAt)||!integer(p.configSubmittedAt)||!integer(p.setupCents,1)||p.completedAt<p.configSubmittedAt)return false;
  const row=s.business?.ledger?.find(x=>x.id===p.postingId);
  if(row)return row.category==='cost'&&row.reason==='provider-operation'&&row.cents===p.setupCents&&row.customerId===c.id&&row.projectId===p.id;
  const n=Number(/^entry-([1-9][0-9]*)$/.exec(p.postingId)?.[1]||0);
  return n>0&&n<=(s.business?.ledgerPrunedThrough||0);
 }
 function paidOperation(s,c,operationId,at=Number.MAX_SAFE_INTEGER){
  const p=(s.providerCampaign?.projects||[]).filter(x=>x.customerId===c.id&&x.operationId===operationId&&x.completedAt<=at&&postingFor(s,c,x)).sort((a,b)=>b.completedAt-a.completedAt)[0];
  if(!p)return null;
  const r=p.operationReceipt;
  if(operationId==='local-spares'||operationId==='managed-local-spares'){
   if(!exact(r,['kind','projectId','postingId','at'])||r.kind!==operationId||r.projectId!==p.id||r.postingId!==p.postingId||!integer(r.at)||r.at+1!==p.configSubmittedAt)return null;
  }else if(!exact(r,['at','kind','operationId','revision'])||r.kind!=='operation'||r.operationId!==operationId||!integer(r.at)||r.at+1!==p.configSubmittedAt||!integer(r.revision))return null;
  return p;
 }
 function paidOperationById(s,c,projectId,operationId,at=Number.MAX_SAFE_INTEGER){
  const p=(s.providerCampaign?.projects||[]).find(x=>x.id===projectId&&x.customerId===c.id&&x.operationId===operationId&&x.completedAt<=at&&postingFor(s,c,x));
  if(!p)return null;const r=p.operationReceipt;
  if(operationId==='local-spares'||operationId==='managed-local-spares')return exact(r,['kind','projectId','postingId','at'])&&r.kind===operationId&&r.projectId===p.id&&r.postingId===p.postingId&&integer(r.at)&&r.at+1===p.configSubmittedAt?p:null;
  return exact(r,['at','kind','operationId','revision'])&&r.kind==='operation'&&r.operationId===operationId&&integer(r.at)&&r.at+1===p.configSubmittedAt&&integer(r.revision)?p:null;
 }
 function paidStages(s,c){
  const missing=[];
  for(const stageId of ['base','carrier','partner']){
   const stage=c.stages?.[stageId],project=stage&&s.providerCampaign.projects.find(x=>x.id===stage.projectId&&x.customerId===c.id&&x.kind==='stage'&&x.stage===stageId&&x.status==='complete');
   const posting=project&&s.business?.ledger?.find(x=>x.id===project.postingId),n=Number(/^entry-([1-9][0-9]*)$/.exec(project?.postingId||'')?.[1]||0),paid=project&&project.kind==='stage'&&project.stage===stageId&&project.customerId===c.id&&project.status==='complete'&&Number.isSafeInteger(project.setupCents)&&project.setupCents>0&&(posting?posting.category==='cost'&&posting.reason==='provider-implementation'&&posting.cents===project.setupCents&&posting.customerId===c.id&&posting.projectId===project.id:n>0&&n<=(s.business?.ledgerPrunedThrough||0));
   if(!stage||stage.status!=='effective'||!paid)missing.push(`PAID_CUSTOMER_STAGE_REQUIRED:${stageId}`);
  }
  return missing;
 }
 function ready(hooks,child,resourceId){
  if(typeof hooks.observe==='function')return hooks.observe(child,resourceId)?.ready===true;
  const r=child.resources?.[resourceId];return !!r?.effective?.enabled&&r.provisioning?.status==='ready'&&r.provisioning?.generation===r.generation&&!r.fault;
 }
 function retainedRecord(child,record,options={}){
  if(!record)return false;
  if(!record.deleted)return true;
  if(options.historical!==true||!integer(options.claimedAt)||!integer(record.expiresAt)||!integer(record.deletedAt)||record.deletedAt<=options.claimedAt||record.deletedAt<record.expiresAt)return false;
  const expiryAudit=(child.information?.audit||[]).find(x=>x.code==='RETENTION_EXPIRED'&&x.record===record.id);
  return !expiryAudit||expiryAudit.at===record.deletedAt;
 }
 function localDependencies(child,hooks,options={}){
  const rows=[],missing=[],jurisdiction=child?.jurisdiction,local=child?.resources?.local;
  if(!['AU','US','JP','EU'].includes(jurisdiction))missing.push('LOCAL_JURISDICTION_REQUIRED');
  for(const resourceId of ROOT_LOCAL){
   const prior=options.dependencySnapshot?.find(x=>x.resourceId===resourceId);
   if(options.historical===true&&prior){
    const fields=resourceId==='local'?['controls','generation','kind','local','ready','region','resourceId']:['generation','kind','local','ready','region','resourceId'];
    const kinds={local:'infrastructure',identity:'directory',access:'connectivity',phone:'dedicated',carrier:'trunk',messages:'channel',engage:'workflow'};
    if(!exact(prior,fields)||prior.kind!==kinds[resourceId]||!integer(prior.generation,1)||prior.region!==jurisdiction||prior.local!==true||prior.ready!==true||resourceId==='local'&&(!exact(prior.controls,['backup','certificates','dns','identity','licensing','time'])||Object.values(prior.controls).some(x=>x!==true)))missing.push(`INVALID_RETAINED_LOCAL_DEPENDENCY:${resourceId}`);
    else if(options.install?.expectedGenerations?.[resourceId]!==undefined&&prior.generation!==options.install.expectedGenerations[resourceId])missing.push(`RETAINED_DEPENDENCY_NOT_ANCHORED_TO_LOCAL_DEPLOYMENT:${resourceId}`);
    else rows.push(copy(prior));
    continue;
   }
   const r=child.resources?.[resourceId],cfg=r?.effective;
   const expectedLocal=resourceId==='local'||resourceId==='phone'||REQUIRED_LOCAL.includes(resourceId);
   if(!r||!cfg||r.provisioning?.status!=='ready'||r.provisioning?.generation!==r.generation||cfg.enabled!==true){missing.push(`LOCAL_RESOURCE_NOT_EFFECTIVE:${resourceId}`);continue;}
   if(cfg.region!==jurisdiction||expectedLocal&&cfg.local!==true){missing.push(`LOCAL_RESOURCE_SCOPE_MISMATCH:${resourceId}`);continue;}
   if(resourceId==='local'&&['identity','dns','time','certificates','licensing','backup'].some(k=>cfg[k]!==true))missing.push('TYPED_LOCAL_CONTROL_DEPENDENCIES_REQUIRED');
   const isReady=options.historical===true?true:ready(hooks,child,resourceId);
   if(!isReady)missing.push(`LOCAL_RESOURCE_UNAVAILABLE:${resourceId}`);
   rows.push({resourceId,kind:r.kind,generation:r.generation,region:cfg.region,local:cfg.local===true,ready:isReady,...(resourceId==='local'?{controls:{identity:cfg.identity,dns:cfg.dns,time:cfg.time,certificates:cfg.certificates,licensing:cfg.licensing,backup:cfg.backup}}:{})});
  }
  return {rows,missing:[...new Set(missing)],local};
 }
 function voiceJob(s,c,child,job,connected){
  if(!job||job.customerId!==c.id||job.channel!=='voice'||!['completed','late'].includes(job.status)||job.contextRetained!==true||!id(job.interactionId)||!id(job.caseId)||!integer(job.completedAt)||!integer(job.arrivalAt))return null;
  const i=child.interactions?.find(x=>x.id===job.interactionId);
  const linked=i&&child.cases?.[i.caseId],assignment=i&&child.workforceOps?.assignments?.find(a=>a.interaction===(i.workforceAssignment||i.id)&&a.person===i.agent&&a.status==='complete');
  if(!i||i.probe===true||i.phase!=='resolved'||i.channel!=='voice'||i.caseId!==job.caseId||i.providerContext?.connected!==connected||i.context!==true||i.agent===undefined||!assignment||assignment.personSnapshot?.id!==i.agent||!assignment.personSnapshot?.skills?.includes('service')||!linked||linked.tenant!==child.tenant||!linked.interactions?.includes(i.id)||i.obligations?.length||!integer(i.startedAt)||!integer(i.finishedAt)||i.finishedAt!==job.completedAt||i.finishedAt<i.startedAt||!integer(i.usageMinutes,1)||i.media?.in!==true||i.media?.out!==true||i.voicePath?.platform!=='phone'||i.voicePath?.carrier!=='carrier'||!Array.isArray(i.trace)||!i.trace.some(x=>x.code==='CARRIER_PATH_ADMITTED'))return null;
  return {job,interaction:i};
 }
 function outageFor(s,c,interaction,continuity,sparesProjectId){
  const incident=(s.providerCampaign.incidents||[]).find(x=>x.customerId===c.id&&x.kind==='disconnection'&&x.connected===false&&x.resource==='connectivity'&&integer(x.activatedAt)&&interaction.startedAt>=x.activatedAt&&(x.resolvedAt===null||integer(x.resolvedAt)&&interaction.finishedAt<=x.resolvedAt));
  if(!incident)return null;
  const receipt=continuity.sparesReceipt,sparesId=sparesProjectId||receipt?.projectId;
  const spares=sparesId&&s.providerCampaign.projects.find(x=>x.id===sparesId&&x.customerId===c.id&&OPS.includes(x.operationId)&&postingFor(s,c,x)&&exact(x.operationReceipt,['kind','projectId','postingId','at'])&&x.operationReceipt.kind===x.operationId&&x.operationReceipt.projectId===x.id&&x.operationReceipt.postingId===x.postingId&&integer(x.operationReceipt.at)&&x.configSubmittedAt===x.operationReceipt.at+1);
  const autonomy=spares&&spares.completedAt<=interaction.startedAt?60:30,elapsed=interaction.finishedAt-incident.activatedAt;
  if(elapsed<0||elapsed>=autonomy)return null;
  return {incident,autonomy,elapsed,spares};
 }
 function recordingFor(child,interaction){
  return child.records?.find(r=>r.kind==='recording'&&!r.deleted&&r.interaction===interaction.id&&r.captureScope==='complete'&&r.createdAt>=interaction.startedAt&&Array.isArray(interaction.records)&&interaction.records.includes(r.id))||null;
 }
 function speechWork(child,interaction,jurisdiction,hooks,options={}){
  const info=child.information,pipeline=info?.pipeline?.effective,speech=child.resources?.speech,archive=child.resources?.archive,recorder=child.resources?.recorder,boundary=info?.boundary?.effective;
  const prior=options.speechSnapshot;
  if(options.historical===true&&prior){if(!exact(prior,['archive','boundaryGeneration','pipelineGeneration','processRegion','recorder','speech','storageRegion'])||!exact(prior.speech,['generation','licenceLocal','local','region'])||!exact(prior.archive,['generation','region'])||!exact(prior.recorder,['generation','region'])||!integer(prior.speech.generation,1)||!integer(prior.pipelineGeneration,1)||!integer(prior.boundaryGeneration,1)||!integer(prior.archive.generation,1)||!integer(prior.recorder.generation,1)||prior.speech.region!==jurisdiction||prior.speech.local!==true||prior.speech.licenceLocal!==true||prior.archive.region!==jurisdiction||prior.recorder.region!==jurisdiction||prior.processRegion!==jurisdiction||prior.storageRegion!==jurisdiction)return null;}
  else if(!pipeline?.enabled||!pipeline.steps.includes('transcription')||pipeline.processor!=='speech'||pipeline.archive!=='archive'||!speech?.effective?.enabled||speech.effective.region!==jurisdiction||speech.effective.local!==true||speech.effective.licenceLocal!==true||!archive?.effective?.enabled||archive.effective.region!==jurisdiction||!recorder?.effective?.enabled||recorder.effective.region!==jurisdiction||!boundary?.processRegions?.includes(jurisdiction)||!boundary?.storageRegions?.includes(jurisdiction))return null;
  if(options.historical!==true&&(!ready(hooks,child,'speech')||!ready(hooks,child,'archive')||!ready(hooks,child,'recorder')))return null;
  const recordings=(child.records||[]).filter(r=>r.kind==='recording'&&retainedRecord(child,r,options)&&r.interaction===interaction.id&&(r.captureScope??'complete')==='complete'&&interaction.records?.includes(r.id));
  for(const source of recordings){
   const job=(info.jobs||[]).find(x=>x.source===source.id&&x.interaction===interaction.id&&x.status==='complete'&&x.stage===x.plan?.steps?.length&&x.plan?.steps?.includes('transcription')&&x.plan.processor==='speech'&&x.plan.archive==='archive');
   if(!job)continue;
   const transcript=(child.records||[]).find(r=>r.kind==='transcription'&&retainedRecord(child,r,options)&&r.interaction===interaction.id&&r.processRegion===jurisdiction&&r.region===jurisdiction&&r.archiveId==='archive'&&interaction.records?.includes(r.id)&&isDescendant(child,r,source.id));
   if(!transcript||source.region!==jurisdiction||source.archiveId!==undefined&&source.archiveId!=='archive')continue;
   return {interactionId:interaction.id,recording:source,job,transcript,dependencies:options.historical===true&&prior?copy(prior):{speech:{generation:speech.generation,region:speech.effective.region,local:speech.effective.local,licenceLocal:speech.effective.licenceLocal},pipelineGeneration:info.pipeline.generation,boundaryGeneration:info.boundary.generation,archive:{generation:archive.generation,region:archive.effective.region},recorder:{generation:recorder.generation,region:recorder.effective.region},processRegion:transcript.processRegion,storageRegion:transcript.region}};
  }
  return null;
 }
 function isDescendant(child,record,ancestorId){
  let current=record,seen=new Set();for(let depth=0;depth<16&&current&&!seen.has(current.id);depth++){if(current.id===ancestorId)return true;seen.add(current.id);const parent=current.parents?.[0];if(!parent)return false;current=child.records?.find(x=>x.id===parent);}return false;
 }
 function syncFor(s,c,child,interaction,options={},projectId){
  const continuity=child.providerContinuity;if(!continuity||continuity.version!==1||options.historical!==true&&continuity.connected!==true||continuity.pending.some(x=>x.interactionId===interaction.id))return null;
  for(const p of s.providerCampaign.projects.filter(x=>x.customerId===c.id&&['sync-records','sync-all'].includes(x.operationId)&&x.status==='complete'&&(!projectId||x.id===projectId)).sort((a,b)=>a.completedAt-b.completedAt)){
   const r=p.operationReceipt,cp=r?.checkpoint;if(!postingFor(s,c,p)||!exact(r,['at','checkpoint','items','kind','projectId','postingId','reconciliationVersion','scope','total','recorded','unrecorded'])||r.kind!==p.operationId||r.projectId!==p.id||r.postingId!==p.postingId||r.reconciliationVersion!==1||!integer(r.at)||r.at+1!==p.configSubmittedAt||!['records','all'].includes(r.scope)||!Array.isArray(r.items)||r.items.length>128||!integer(r.total)||!integer(r.recorded)||!integer(r.unrecorded)||r.total!==r.recorded+r.unrecorded||!exact(cp,['recorded','throughAt','total','unrecorded'])||!integer(cp.total)||!integer(cp.recorded)||!integer(cp.unrecorded)||cp.total!==cp.recorded+cp.unrecorded||r.total!==r.items.length+cp.total)continue;
   const item=r.items.find(x=>x.interactionId===interaction.id&&x.caseId===interaction.caseId&&x.finishedAt===interaction.finishedAt);
   if(!item||!exact(item,['caseId','finishedAt','interactionId','recordId'])||item.recordId!==null&&!id(item.recordId)||item.recordId===null&&r.scope!=='all')continue;
   const actual=continuity.pending.find(x=>x.interactionId===item.interactionId);
   if(actual)return null;
   if(item.finishedAt>r.at||item.recordId!==null&&!interaction.records?.includes(item.recordId))continue;
   if(item.recordId!==null){const record=child.records?.find(x=>x.id===item.recordId);if(!retainedRecord(child,record,options)||record.interaction!==interaction.id||record.kind!=='recording'||(record.captureScope??'complete')!=='complete')continue;}
   return {projectId:p.id,postingId:p.postingId,operationId:p.operationId,at:r.at,scope:r.scope,item:copy(item),receipt:{total:r.items.length,checkpoint:copy(r.checkpoint)}};
  }
  return null;
 }
 function connectedCandidates(s,c,child,install){
  return (s.providerCampaign.jobs||[]).map(j=>voiceJob(s,c,child,j,true)).filter(x=>x&&x.interaction.finishedAt>=install.completedAt);
 }
 function offlineCandidates(s,c,child,install,continuity,sparesProjectId){
  return (s.providerCampaign.jobs||[]).map(j=>voiceJob(s,c,child,j,false)).filter(x=>x&&x.interaction.finishedAt>=install.completedAt).map(x=>({...x,outage:outageFor(s,c,x.interaction,continuity,sparesProjectId)})).filter(x=>x.outage);
 }
 function build(s,c,child,kind,selectors={},options={}){
  const missing=[...paidStages(s,c)],install=selectors.localDeploymentProjectId?paidOperationById(s,c,selectors.localDeploymentProjectId,'local-deployment',options.at??s.clock):paidOperation(s,c,'local-deployment',options.at??s.clock),continuity=child.providerContinuity;
  if(c.scenario!=='defence'||child.scenario!=='defence')missing.push('DEFENCE_LOCAL_SERVICE_SCOPE_REQUIRED');
  if(!install)missing.push('PAID_LOCAL_DEPLOYMENT_REQUIRED');
  if(!continuity||continuity.pack!=='soc-provider-continuity-1'||continuity.version!==1)missing.push('VERSIONED_PROVIDER_CONTINUITY_REQUIRED');
  if(continuity){try{continuityApi().validate(child);}catch{missing.push('VALID_PROVIDER_CONTINUITY_LINEAGE_REQUIRED');}}
  const deps=localDependencies(child,selectors.hooks||{},{...options,dependencySnapshot:selectors.dependencySnapshot,install});missing.push(...deps.missing);
  const connected=connectedCandidates(s,c,child,install||{completedAt:Number.MAX_SAFE_INTEGER}).find(x=>!selectors.connected||x.interaction.id===selectors.connected);
  const offline=offlineCandidates(s,c,child,install||{completedAt:Number.MAX_SAFE_INTEGER},continuity||{},selectors.sparesProjectId).find(x=>!selectors.offline||x.interaction.id===selectors.offline);
  if(!connected)missing.push('CONNECTED_LOCAL_VOICE_WORK_REQUIRED');
  if(!offline)missing.push('AUTHORED_OFFLINE_LOCAL_VOICE_WORK_WITHIN_AUTONOMY_REQUIRED');
  let reconciliation=null;
  if(offline){reconciliation=syncFor(s,c,child,offline.interaction,options,selectors.reconciliationProjectId);if(!reconciliation)missing.push('PAID_SCOPED_RECONCILIATION_OF_OFFLINE_WORK_REQUIRED');}
  let speech=null;
  if(kind==='local-speech'){
   const speechOptions={...options,speechSnapshot:selectors.speechSnapshot},targets=[offline?.interaction,connected?.interaction].filter(Boolean),target=selectors.speechInteraction?targets.find(x=>x.id===selectors.speechInteraction):targets.find(x=>speechWork(child,x,child.jurisdiction,selectors.hooks||{},speechOptions));
   speech=target&&speechWork(child,target,child.jurisdiction,selectors.hooks||{},speechOptions);
   const operation=selectors.transcriptionProjectId?paidOperationById(s,c,selectors.transcriptionProjectId,'transcription',options.at??s.clock):paidOperation(s,c,'transcription',options.at??s.clock),recording=selectors.recordingProjectId?paidOperationById(s,c,selectors.recordingProjectId,'recording',options.at??s.clock):paidOperation(s,c,'recording',options.at??s.clock);
   if(!operation||!recording||!speech)missing.push('PAID_LOCAL_TRANSCRIPTION_OF_RETAINED_RECORDING_REQUIRED');
   if(speech&&operation&&recording&&options.historical===true){const snap=speech.dependencies;if(snap.speech.generation!==operation.expectedGenerations?.speech||snap.archive.generation!==operation.expectedGenerations?.archive||snap.recorder.generation!==recording.expectedGenerations?.recorder)missing.push('RETAINED_SPEECH_DEPENDENCY_NOT_ANCHORED_TO_PAID_PROJECTS');}
  }
  const sparesReceipt=continuity?.sparesReceipt,sparesProjectId=selectors.sparesProjectId||sparesReceipt?.projectId;
  const localSpare=sparesProjectId?paidOperationById(s,c,sparesProjectId,s.providerCampaign.projects.find(x=>x.id===sparesProjectId)?.operationId,options.at??s.clock):null;
  if(sparesProjectId&&!localSpare)missing.push('PAID_LOCAL_SPARES_LINEAGE_REQUIRED');
  if(!connected||!offline||!install||!continuity||deps.missing.length||kind==='local-speech'&&!speech||missing.length)return {status:'incomplete',missing:[...new Set(missing)],evidence:null};
  const projectGenerations={};for(const resourceId of ['local','identity','phone'])projectGenerations[resourceId]=install.expectedGenerations?.[resourceId]||null;
  const evidence={kind:`provider-${kind}`,version:VERSION,sourceId:SOURCE,customerId:c.id,portfolioId:c.portfolioId,market:c.market,tenant:child.tenant,jurisdiction:child.jurisdiction,interval:{from:Math.min(connected.interaction.startedAt,offline.interaction.startedAt),to:Math.max(reconciliation.at,connected.interaction.finishedAt,offline.interaction.finishedAt,speech?.job?.completedAt||0,speech?.transcript?.createdAt||0)},projects:{localDeployment:{projectId:install.id,postingId:install.postingId,acceptedAt:install.acceptedAt,completedAt:install.completedAt,generations:projectGenerations},...(kind==='local-speech'?{recording:{projectId:paidOperation(s,c,'recording',options.at??s.clock).id,postingId:paidOperation(s,c,'recording',options.at??s.clock).postingId},transcription:{projectId:paidOperation(s,c,'transcription',options.at??s.clock).id,postingId:paidOperation(s,c,'transcription',options.at??s.clock).postingId}}:{}),...(localSpare?{spares:{projectId:localSpare.id,postingId:localSpare.postingId,operationId:localSpare.operationId,at:localSpare.operationReceipt.at}}:{})},dependencies:deps.rows,connected:{jobId:connected.job.id,interactionId:connected.interaction.id,caseId:connected.interaction.caseId,startedAt:connected.interaction.startedAt,finishedAt:connected.interaction.finishedAt,media:{in:true,out:true},platform:connected.interaction.voicePath.platform,carrier:connected.interaction.voicePath.carrier},offline:{incidentId:offline.outage.incident.id,jobId:offline.job.id,interactionId:offline.interaction.id,caseId:offline.interaction.caseId,startedAt:offline.interaction.startedAt,finishedAt:offline.interaction.finishedAt,outageStartedAt:offline.outage.incident.activatedAt,autonomyMinutes:offline.outage.autonomy,elapsedMinutes:offline.outage.elapsed,recordId:reconciliation.item.recordId},reconciliation,...(speech?{speech:{interactionId:speech.interactionId,recordingRecordId:speech.recording.id,processingJobId:speech.job.id,transcriptionRecordId:speech.transcript.id,processRegion:speech.dependencies.processRegion,storageRegion:speech.dependencies.storageRegion,dependencies:speech.dependencies}}:{})};
  return {status:'ready',missing:[],evidence};
 }
 function evaluate(s,customerId,hooks={}){
  if(!s||s.experience?.version!==1||s.experience?.kind!=='campaign'||s.experience?.custom!==false||s.providerCampaign?.pack!=='soc-provider-campaign-1')fail('PROVIDER_LOCAL_PROGRESSION_CAMPAIGN_REQUIRED');
  const c=s.providerCampaign.customers?.find(x=>x.id===customerId);if(!c)return {sourceId:SOURCE,name:NAME,status:'incomplete',missing:['PROVIDER_CUSTOMER_NOT_FOUND'],evidence:null};
  const child=customerRoot(s,c,hooks);if(!child||child.providerCustomer?.id!==c.id)return {sourceId:SOURCE,name:NAME,status:'incomplete',missing:['VALID_PROVIDER_CUSTOMER_ROOT_REQUIRED'],evidence:null};
  // The source contract for CA is completed local processing from a retained
  // recording. Voice continuity is useful supporting evidence, but voice-only
  // work cannot earn this goal.
  const speech=build(s,c,child,'local-speech',{hooks});
  return {sourceId:SOURCE,name:NAME,status:speech.status,missing:speech.missing,evidence:speech.evidence};
 }
 function validateEvidence(s,customerId,evidence,hooks={},options={}){
  if(evidence?.kind!=='provider-local-speech'||!exact(evidence,['kind','version','sourceId','customerId','portfolioId','market','tenant','jurisdiction','interval','projects','dependencies','connected','offline','reconciliation','speech'])||evidence.version!==VERSION||evidence.sourceId!==SOURCE||evidence.customerId!==customerId||!integer(evidence.interval?.from)||!integer(evidence.interval?.to)||evidence.interval.to<evidence.interval.from||options.historical===true&&options.claimedAt!==undefined&&(!integer(options.claimedAt)||evidence.interval.to>options.claimedAt))return false;
  const c=s.providerCampaign?.customers?.find(x=>x.id===customerId),child=c&&customerRoot(s,c,hooks);if(!c||!child||child.providerCustomer?.id!==customerId||c.portfolioId!==evidence.portfolioId||c.market!==evidence.market||child.tenant!==evidence.tenant||child.jurisdiction!==evidence.jurisdiction)return false;
  const selectors={hooks,connected:evidence.connected?.interactionId,offline:evidence.offline?.interactionId,speechInteraction:evidence.speech?.interactionId,dependencySnapshot:evidence.dependencies,speechSnapshot:evidence.speech?.dependencies,localDeploymentProjectId:evidence.projects?.localDeployment?.projectId,recordingProjectId:evidence.projects?.recording?.projectId,transcriptionProjectId:evidence.projects?.transcription?.projectId,sparesProjectId:evidence.projects?.spares?.projectId,reconciliationProjectId:evidence.reconciliation?.projectId};
  // The speech interaction is derived from the retained processing job rather than a caller field.
  if(evidence.kind==='provider-local-speech'){
   const job=child.information?.jobs?.find(x=>x.id===evidence.speech.processingJobId);if(!job||job.interaction!==evidence.speech.interactionId)return false;
  }
  const result=build(s,c,child,'local-speech',selectors,{historical:options.historical===true,claimedAt:options.claimedAt,at:options.historical===true?Number.MAX_SAFE_INTEGER:s.clock});
  return result.status==='ready'&&same(result.evidence,evidence)&&(options.historical===true||evidence.interval.to<=s.clock);
 }
 function validateCustomer(s,customerId,child){
  if(!child?.providerContinuity)return true;
  const c=s.providerCampaign?.customers?.find(x=>x.id===customerId);if(!c||c.scenario!=='defence'||child.scenario!=='defence')fail('INVALID_PROVIDER_LOCAL_CONTINUITY_OWNER');
  try{continuityApi().validate(child);}catch{fail('INVALID_PROVIDER_LOCAL_CONTINUITY_LINEAGE');}
  const state=child.providerContinuity,spares=state.sparesReceipt;
  if(spares){const project=s.providerCampaign.projects.find(x=>x.id===spares.projectId&&x.customerId===customerId&&OPS.includes(x.operationId));if(!project||project.postingId!==spares.postingId||project.configSubmittedAt!==spares.at+1||project.status!=='complete'||!postingFor(s,c,project))fail('INVALID_PROVIDER_LOCAL_SPARES_LINEAGE');}
  return true;
 }
 function retentionPins(evidence){
  const empty={interactionIds:[],caseIds:[],jobIds:[],processingJobIds:[],recordIds:[],incidentIds:[],projectIds:[]};
  if(!evidence||evidence.kind!=='provider-local-speech'||evidence.version!==VERSION)return empty;
  const interactionIds=[evidence.connected?.interactionId,evidence.offline?.interactionId,evidence.speech?.interactionId].filter(Boolean),caseIds=[evidence.connected?.caseId,evidence.offline?.caseId].filter(Boolean),recordIds=[evidence.offline?.recordId,evidence.speech?.recordingRecordId,evidence.speech?.transcriptionRecordId].filter(Boolean),processingJobIds=[evidence.speech?.processingJobId].filter(Boolean),jobIds=[evidence.connected?.jobId,evidence.offline?.jobId].filter(Boolean),projectIds=[evidence.projects?.localDeployment?.projectId,evidence.projects?.recording?.projectId,evidence.projects?.transcription?.projectId,evidence.projects?.spares?.projectId,evidence.reconciliation?.projectId].filter(Boolean),incidentIds=[evidence.offline?.incidentId].filter(Boolean);
  const unique=xs=>[...new Set(xs)].sort();
  return {interactionIds:unique(interactionIds),caseIds:unique(caseIds),jobIds:unique(jobIds),processingJobIds:unique(processingJobIds),recordIds:unique(recordIds),incidentIds:unique(incidentIds),projectIds:unique(projectIds)};
 }
 function source(){return `const SOC_PROVIDER_LOCAL_PROGRESSION=(${socProviderLocalProgressionKernel.toString()})();`;}
 return {VERSION,CONTENT,SOURCE,NAME,evaluate,validateEvidence,validateCustomer,retentionPins,source};
}
const SOC_PROVIDER_LOCAL_PROGRESSION=socProviderLocalProgressionKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_PROVIDER_LOCAL_PROGRESSION=SOC_PROVIDER_LOCAL_PROGRESSION;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_LOCAL_PROGRESSION;
