/* Paid Provider adapter for native synthetic network, SIP and destination controls. */
function socProviderSecurityKernel(terms){
 'use strict';
 const VERSION=1, PACK='soc-provider-security-1', BINDING='provider-security-control-binding-v1';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
 const fail=code=>{throw new Error(code);};
 const controlNames=['network','sip','destination'];
 const controlIds=Object.fromEntries(controlNames.map(name=>[name,terms.controls[name].operationId]));
 const allRequired=[...terms.voiceServicePrerequisites];
 function controlForOperation(operationId){return controlNames.find(name=>controlIds[name]===operationId)||null;}
 function controlRow(control){return controlNames.includes(control)?terms.controls[control]:null;}
 function offerRow(control,planId){const row=controlRow(control);return row&&typeof planId==='string'?row.offers[planId]||null:null;}
 function validateNativeConfig(control,c){
  if(control==='network')return exact(c,['activationMode','capacityPps','enabled','mitigationPps'])&&c.enabled===true&&integer(c.capacityPps,1,100000000)&&integer(c.mitigationPps,c.capacityPps,100000000)&&['always','on-demand'].includes(c.activationMode);
  if(control==='sip')return exact(c,['allowedMethods','attemptsPerSecond','enabled','maxMessageBytes','requireAuthenticatedPeer'])&&c.enabled===true&&integer(c.attemptsPerSecond,1,100000)&&Array.isArray(c.allowedMethods)&&c.allowedMethods.length>0&&c.allowedMethods.every(x=>terms.controls.sip.limits.methods.includes(x))&&new Set(c.allowedMethods).size===c.allowedMethods.length&&integer(c.maxMessageBytes,64,65535)&&c.requireAuthenticatedPeer===true;
  if(control==='destination')return exact(c,['allowedPrefixes','enabled','perCallMaxCents','windowMinutes','windowSpendLimitCents'])&&c.enabled===true&&Array.isArray(c.allowedPrefixes)&&c.allowedPrefixes.length>0&&c.allowedPrefixes.length<=50&&c.allowedPrefixes.every(x=>typeof x==='string'&&/^\+[1-9][0-9]{1,14}$/.test(x))&&new Set(c.allowedPrefixes).size===c.allowedPrefixes.length&&integer(c.perCallMaxCents,1,100000000)&&integer(c.windowSpendLimitCents,1,1000000000)&&integer(c.windowMinutes,1,1440);
  return false;
 }
 function validateScope(scope){return exact(scope,['customerId','portfolioId','tenant','market'])&&id(scope.customerId)&&id(scope.portfolioId)&&id(scope.tenant)&&typeof scope.market==='string'&&/^[a-z][a-z0-9-]{1,47}$/.test(scope.market);}
 function quotePlan(control,planId,scope,quotedAt){
  const row=controlRow(control),offer=offerRow(control,planId);
  if(!row||!offer||!validateScope(scope)||!integer(quotedAt))fail('INVALID_PROVIDER_SECURITY_PLAN');
  if(!validateNativeConfig(control,offer.config))fail('INVALID_PROVIDER_SECURITY_TERMS');
  const plan={version:VERSION,termsId:terms.id,termsVersion:terms.version,control,operationId:row.operationId,planId,customerId:scope.customerId,portfolioId:scope.portfolioId,tenant:scope.tenant,market:scope.market,quotedAt,setupCents:offer.setupCents,periodCents:offer.periodCents,workMinutes:offer.workMinutes,engineers:offer.engineers,support:offer.support,resources:copy(row.resources),requirements:copy(row.requirements),voiceServicePrerequisites:copy(allRequired),nativeConfig:copy(offer.config),supplierPeer:control==='sip'?copy(row.supplierPeer):null};
  if(!validatePlan(plan))fail('INVALID_PROVIDER_SECURITY_PLAN');return plan;
 }
 function termsForPlan(plan){
  if(!plan||typeof plan!=='object')return null;
  if(plan.termsId===terms.id&&plan.termsVersion===terms.version)return terms;
  return (terms.historicalVersions||[]).find(old=>old.id===plan.termsId&&old.version===plan.termsVersion)||null;
 }
 function validatePlan(plan){
  const keys=['control','customerId','engineers','market','nativeConfig','operationId','periodCents','planId','portfolioId','quotedAt','requirements','resources','setupCents','support','supplierPeer','tenant','termsId','termsVersion','version','voiceServicePrerequisites','workMinutes'];
  if(!exact(plan,keys)||plan.version!==VERSION||!validateScope({customerId:plan.customerId,portfolioId:plan.portfolioId,tenant:plan.tenant,market:plan.market})||!integer(plan.quotedAt))return false;
  const archived=termsForPlan(plan),row=archived?.controls?.[plan.control],offer=row?.offers?.[plan.planId];
  if(!archived||!row||row.operationId!==plan.operationId||!offer||!validateNativeConfig(plan.control,offer.config))return false;
  const expected={version:VERSION,termsId:archived.id,termsVersion:archived.version,control:plan.control,operationId:row.operationId,planId:plan.planId,customerId:plan.customerId,portfolioId:plan.portfolioId,tenant:plan.tenant,market:plan.market,quotedAt:plan.quotedAt,setupCents:offer.setupCents,periodCents:offer.periodCents,workMinutes:offer.workMinutes,engineers:offer.engineers,support:offer.support,resources:row.resources,requirements:row.requirements,voiceServicePrerequisites:archived.voiceServicePrerequisites,nativeConfig:offer.config,supplierPeer:plan.control==='sip'?row.supplierPeer:null};
  return same(plan,expected);
 }
 function operationDefinition(operationId){
  const control=controlForOperation(operationId),row=control&&controlRow(control);if(!row)return null;
  return {id:row.operationId,name:row.name,description:row.description,kind:'operation',sourceIds:copy(terms.sourceIds),offers:Object.fromEntries(Object.entries(row.offers).map(([planId,offer])=>[planId,{name:offer.name,setupCents:offer.setupCents,periodCents:offer.periodCents,workMinutes:offer.workMinutes,engineers:offer.engineers,support:offer.support,config:{planId}}])),resources:copy(row.resources),requirements:copy(row.requirements),voiceServicePrerequisites:copy(allRequired),control};
 }
 function operationPlan(operationId,config,scope,quotedAt){
  const control=controlForOperation(operationId);if(!control||!exact(config,['planId']))fail('INVALID_PROVIDER_SECURITY_SELECTION');
  return quotePlan(control,config.planId,scope,quotedAt);
 }
 function planReceipt(plan){if(!validatePlan(plan))fail('INVALID_PROVIDER_SECURITY_PLAN');return {kind:'provider-security-operation-plan-v1',version:VERSION,plan:copy(plan)};}
 function projectPlan(project){const receipt=project?.operationReceipt?.providerSecurity;return exact(receipt,['kind','plan','version'])&&receipt.kind==='provider-security-operation-plan-v1'&&receipt.version===VERSION&&validatePlan(receipt.plan)?receipt.plan:null;}
 function nativeCommands(plan){
  if(!validatePlan(plan))fail('INVALID_PROVIDER_SECURITY_PLAN');
  const commands=[{action:'configure',control:plan.control,config:copy(plan.nativeConfig)}];
  if(plan.control==='sip')commands.push({action:'peer',id:plan.supplierPeer.id,authenticated:plan.supplierPeer.authenticated,available:plan.supplierPeer.available,methods:copy(plan.supplierPeer.methods)});
  return commands;
 }
 function paidProjectValid(s,project,plan=projectPlan(project)){
  if(!plan||!s?.providerCampaign||project?.kind!=='operation'||project.operationId!==plan.operationId||project.customerId!==plan.customerId||project.configSubmittedAt===null||!integer(project.acceptedAt)||!integer(project.configSubmittedAt,project.acceptedAt,s.clock)||project.dueAt!==project.acceptedAt+plan.workMinutes||project.setupCents!==plan.setupCents||project.periodCents!==plan.periodCents||project.workMinutes!==plan.workMinutes||project.engineers!==plan.engineers||project.support!==plan.support||!same(project.resources,plan.resources)||!same(project.config,{planId:plan.planId})||plan.quotedAt>project.acceptedAt)return false;
  const original=s.providerCampaign.projects?.find(x=>x.id===project.id);
  if(!original||original.customerId!==project.customerId||original.operationId!==project.operationId||original.postingId!==project.postingId)return false;
  const row=s.business?.ledger?.find(x=>x.id===project.postingId);
  if(row)return row.category==='cost'&&row.reason==='provider-operation'&&row.customerId===project.customerId&&row.projectId===project.id&&row.cents===project.setupCents;
  const n=Number(/^entry-([1-9][0-9]*)$/.exec(project.postingId||'')?.[1]||0);
  return n>0&&n<=(s.business?.ledgerPrunedThrough||0);
 }
 function scopeFor(s,project,childRoot){
  const customer=s?.providerCampaign?.customers?.find(x=>x.id===project?.customerId),portfolio=s?.portfolio?.customers?.find(x=>x.id===customer?.portfolioId);
  if(!customer||!portfolio||portfolio.id!==customer.portfolioId||portfolio.market!==customer.market||childRoot?.tenant!==portfolio.root?.tenant)return null;
  return {customerId:customer.id,portfolioId:customer.portfolioId,tenant:childRoot.tenant,market:customer.market};
 }
 function bindingForProject(s,project,childRoot){
  const plan=projectPlan(project),scope=scopeFor(s,project,childRoot),native=childRoot?.admissionSecurity,control=plan&&native?.controls?.[plan.control];
  if(!plan||!scope||!same(scope,{customerId:plan.customerId,portfolioId:plan.portfolioId,tenant:plan.tenant,market:plan.market})||!paidProjectValid(s,project,plan)||project.status!=='complete'||!integer(project.completedAt,project.configSubmittedAt,s.clock)||!native||native.pack!=='soc-admission-security-1'||!control||control.provisioning?.status!=='ready'||control.effectiveGeneration<1||!same(control.effective,plan.nativeConfig))return null;
  if(plan.control==='sip'&&!same(native.peers?.[plan.supplierPeer.id],{id:plan.supplierPeer.id,observed:{authenticated:true,available:true,methods:plan.supplierPeer.methods,at:native.peers?.[plan.supplierPeer.id]?.observed?.at}}))return null;
  return {kind:BINDING,version:VERSION,termsId:plan.termsId,termsVersion:plan.termsVersion,planId:plan.planId,control:plan.control,operationId:plan.operationId,customerId:plan.customerId,portfolioId:plan.portfolioId,tenant:plan.tenant,market:plan.market,projectId:project.id,postingId:project.postingId,quotedAt:plan.quotedAt,acceptedAt:project.acceptedAt,submittedAt:project.configSubmittedAt,completedAt:project.completedAt,nativeGeneration:control.effectiveGeneration,nativeConfig:copy(control.effective),supplierPeer:plan.control==='sip'?copy(plan.supplierPeer):null};
 }
 function validateHistoricalBinding(s,project,binding){
  const keys=['acceptedAt','completedAt','control','customerId','kind','market','nativeConfig','nativeGeneration','operationId','planId','portfolioId','postingId','projectId','quotedAt','submittedAt','supplierPeer','tenant','termsId','termsVersion','version'];
  const plan=projectPlan(project),scope=plan&&scopeFor(s,project,{tenant:plan.tenant});
  if(!exact(binding,keys)||binding.kind!==BINDING||binding.version!==VERSION||!plan||!scope||!paidProjectValid(s,project,plan)||project.status!=='complete'||!integer(project.completedAt,project.configSubmittedAt,s.clock))return false;
  const expected={kind:BINDING,version:VERSION,termsId:plan.termsId,termsVersion:plan.termsVersion,planId:plan.planId,control:plan.control,operationId:plan.operationId,customerId:plan.customerId,portfolioId:plan.portfolioId,tenant:plan.tenant,market:plan.market,projectId:project.id,postingId:project.postingId,quotedAt:plan.quotedAt,acceptedAt:project.acceptedAt,submittedAt:project.configSubmittedAt,completedAt:project.completedAt,nativeGeneration:binding.nativeGeneration,nativeConfig:plan.nativeConfig,supplierPeer:plan.control==='sip'?plan.supplierPeer:null};
  return integer(binding.nativeGeneration,1)&&same(binding,expected);
 }
 function validateCurrentBinding(s,project,binding,childRoot){
  if(!validateHistoricalBinding(s,project,binding)||!childRoot||childRoot.tenant!==binding.tenant)return false;
  const node=childRoot.admissionSecurity?.controls?.[binding.control];if(!node||node.effectiveGeneration!==binding.nativeGeneration||!same(node.effective,binding.nativeConfig)||node.provisioning.status==='failed')return false;
  if(binding.control==='sip'){const peer=childRoot.admissionSecurity.peers?.[binding.supplierPeer.id];if(!peer||!peer.observed.available||!peer.observed.authenticated||!same(peer.observed.methods,binding.supplierPeer.methods))return false;}
  return true;
 }
 function currentStatus(s,customerId,childRoot){
  const customer=s?.providerCampaign?.customers?.find(x=>x.id===customerId),perControl={};
  for(const control of controlNames){
   const projects=(s?.providerCampaign?.projects||[]).filter(p=>p.customerId===customerId&&p.operationId===controlIds[control]).reverse();
   let found=null;
   for(const project of projects){const plan=projectPlan(project);if(!plan)continue;if(project.status!=='complete'){if(!found)found={status:project.status==='commissioning'||project.status==='running'?'provisioning':'failed',projectId:project.id,planId:plan.planId};continue;}const binding=bindingForProject(s,project,childRoot);if(binding&&validateCurrentBinding(s,project,binding,childRoot)){found={status:'effective',projectId:project.id,planId:plan.planId,binding};break;}if(!found)found={status:'stale',projectId:project.id,planId:plan.planId};}
   perControl[control]=found||{status:'not-purchased',operationId:controlIds[control]};
  }
  const effective=controlNames.filter(name=>perControl[name].status==='effective');
  const all=!!customer&&effective.length===controlNames.length;
  return {version:VERSION,customerId,tenant:childRoot?.tenant||null,controls:perControl,requiredOperationIds:copy(allRequired),effectiveControlCount:effective.length,requiredControlCount:controlNames.length,voiceAdmissionReady:all,blockers:all?[]:['ALL_THREE_PAID_SECURITY_CONTROLS_REQUIRED'],consequence:all?'Current native controls are effective for this Provider customer.':'Native voice admission remains blocked until all three controls are separately purchased and effective.'};
 }
 function nativeApi(){return typeof SOC_ADMISSION_SECURITY!=='undefined'?SOC_ADMISSION_SECURITY:require('./38-admission-security.js');}
 function evaluateProviderEvidence(s,customerId,childRoot,jobId){
  const ready=currentStatus(s,customerId,childRoot);if(!ready.voiceAdmissionReady)fail('PROVIDER_SECURITY_CONTROLS_INCOMPLETE');
  const c=s.providerCampaign.customers.find(x=>x.id===customerId),job=s.providerCampaign.jobs.find(x=>x.id===jobId&&x.customerId===customerId),portfolio=s.portfolio.customers.find(x=>x.id===c.portfolioId),root=childRoot,interaction=job&&root.interactions?.find(x=>x.id===job.interactionId),caseRecord=job&&root.cases?.[job.caseId],security=root.admissionSecurity,api=nativeApi();
  if(!job||!['voice'].includes(job.channel)||!['completed','late'].includes(job.status)||job.resilienceSequence||job.contextRetained!==true||!integer(job.completedAt)||!interaction||interaction.probe===true||interaction.botAnswered===true||interaction.phase!=='resolved'||interaction.channel!=='voice'||interaction.caseId!==job.caseId||interaction.startedAt!==job.arrivalAt||interaction.finishedAt!==job.completedAt||interaction.context!==true||!caseRecord||caseRecord.tenant!==root.tenant||!caseRecord.interactions?.includes(interaction.id))fail('PROVIDER_SECURITY_ORDINARY_CALL_REQUIRED');
  const assessment=api.evaluate(root),settlement=security.settlements.find(x=>x.interactionId===interaction.id),generations=api.inspect(root).controls;
  if(!assessment.passed||!settlement||settlement.phase!=='resolved'||!['RESOLVED','CONNECTED'].includes(settlement.outcome)||settlement.obligations.length||!same(settlement.policyGenerations,api.inspect(root).assessment?generationSnapshot(security):null))fail('PROVIDER_SECURITY_ATTACK_AND_CALL_EVIDENCE_REQUIRED');
  const current=controlNames.map(control=>ready.controls[control].binding),events=security.events,policyGenerations=settlement?.policyGenerations||{};
  const selected=Object.fromEntries(['network','sipBlocked','sipAllowed','destination'].map(name=>[name,events.find(x=>abuseEventMatches(name,x,current,policyGenerations,s.clock))]));
  if(Object.values(selected).some(x=>!x))fail('PROVIDER_SECURITY_ATTACK_AND_CALL_EVIDENCE_REQUIRED');
  const evidence={kind:'provider-security-evidence-v1',version:VERSION,termsId:terms.id,termsVersion:terms.version,customerId,portfolioId:c.portfolioId,tenant:root.tenant,market:c.market,at:s.clock,controlBindings:current,policyGenerations:copy(settlement.policyGenerations),abuseEventIds:Object.fromEntries(Object.entries(selected).map(([key,event])=>[key,event.id])),jobId:job.id,caseId:job.caseId,interactionId:interaction.id,settlementAt:settlement.settledAt};
  return evidence;
 }
 function generationSnapshot(security){return Object.fromEntries(controlNames.map(k=>[k,{desired:security.controls[k].generation,effective:security.controls[k].effectiveGeneration}]));}
 function eventById(root,eventId){return root?.admissionSecurity?.events?.find(x=>x.id===eventId)||null;}
 function abuseEventMatches(name,event,bindings,policyGenerations,at){
  if(!event||event.synthetic!==true||!integer(event.at)||event.at>at||!event.detail)return false;
  const binding=bindings.find(x=>x.control===({network:'network',sipBlocked:'sip',sipAllowed:'sip',destination:'destination'})[name]);
  if(!binding)return false;
  const expectedGeneration=binding.nativeGeneration;
  if(name==='network'){
   const a=terms.authoredAbuseCases.network,d=event.detail;
   return exact(d,['bucketPps','filteredPackets','networkGeneration','packets','peer','protectedPathAvailable','secondOffset'])&&event.kind==='packet-batch'&&event.code===a.expectedCode&&d.peer===a.peer&&d.packets===a.packets&&d.secondOffset===a.secondOffset&&d.networkGeneration===expectedGeneration&&d.bucketPps>binding.nativeConfig.capacityPps&&d.bucketPps<=binding.nativeConfig.mitigationPps&&d.protectedPathAvailable===a.mustKeepProtectedPath;
  }
  if(name==='sipBlocked'){
   const a=terms.authoredAbuseCases.sip,d=event.detail;
   return exact(d,['attempts','bucketAttempts','method','messageBytes','peer','secondOffset','sipGeneration','valid'])&&event.kind==='signalling-batch'&&event.code===a.expectedCode&&d.peer===a.peer&&d.attempts===a.attempts&&d.method===a.method&&d.messageBytes===a.messageBytes&&d.valid===a.valid&&d.secondOffset===a.secondOffset&&d.sipGeneration===expectedGeneration;
  }
  if(name==='sipAllowed'){
   const d=event.detail,peer=terms.controls.sip.supplierPeer;
   return exact(d,['attempts','bucketAttempts','method','messageBytes','peer','secondOffset','sipGeneration','valid'])&&event.kind==='signalling-batch'&&event.code==='SIP_ADMITTED'&&d.peer===peer.id&&d.method==='INVITE'&&d.attempts===1&&d.messageBytes<=binding.nativeConfig.maxMessageBytes&&d.valid===true&&d.sipGeneration===expectedGeneration;
  }
  if(name==='destination'){
   const a=terms.authoredAbuseCases.destination,d=event.detail;
   return exact(d,['interactionId','policyGenerations','reasons'])&&event.kind==='call-admission'&&event.code==='SECURITY_CALL_BLOCKED'&&id(d.interactionId)&&d.reasons?.some(x=>x.control==='destination'&&x.code===a.expectedCode)&&d.policyGenerations?.destination?.effective===expectedGeneration&&same(d.policyGenerations,policyGenerations);
  }
  return false;
 }
 function validateEvidence(s,evidence,childRoot,{historical=false}={}){
  const keys=['abuseEventIds','at','caseId','controlBindings','customerId','interactionId','jobId','kind','market','policyGenerations','portfolioId','tenant','termsId','termsVersion','version','settlementAt'];
  if(!exact(evidence,keys)||evidence.kind!=='provider-security-evidence-v1'||evidence.version!==VERSION||evidence.termsId!==terms.id||evidence.termsVersion!==terms.version||!integer(evidence.at)||!integer(evidence.settlementAt)||evidence.settlementAt>evidence.at||!validateScope({customerId:evidence.customerId,portfolioId:evidence.portfolioId,tenant:evidence.tenant,market:evidence.market})||!Array.isArray(evidence.controlBindings)||evidence.controlBindings.length!==3||!exact(evidence.abuseEventIds,['destination','network','sipAllowed','sipBlocked']))return false;
  const c=s?.providerCampaign?.customers?.find(x=>x.id===evidence.customerId),portfolio=s?.portfolio?.customers?.find(x=>x.id===evidence.portfolioId);if(!c||c.portfolioId!==evidence.portfolioId||c.market!==evidence.market||!portfolio||portfolio.market!==evidence.market||childRoot?.tenant!==evidence.tenant)return false;
  const projects=[];for(const binding of evidence.controlBindings){const project=s.providerCampaign.projects.find(x=>x.id===binding.projectId&&x.customerId===evidence.customerId);if(!project||!validateHistoricalBinding(s,project,binding)||!historical&&!validateCurrentBinding(s,project,binding,childRoot))return false;projects.push(project);}
  if(new Set(evidence.controlBindings.map(x=>x.control)).size!==3||!controlNames.every(name=>evidence.controlBindings.some(b=>b.control===name)))return false;
  const job=s.providerCampaign.jobs.find(x=>x.id===evidence.jobId&&x.customerId===evidence.customerId),interaction=childRoot.interactions?.find(x=>x.id===evidence.interactionId),caseRecord=childRoot.cases?.[evidence.caseId],settlement=childRoot.admissionSecurity?.settlements?.find(x=>x.interactionId===evidence.interactionId);
  if(!job||job.caseId!==evidence.caseId||job.interactionId!==evidence.interactionId||job.channel!=='voice'||job.status!=='completed'&&job.status!=='late'||job.resilienceSequence||job.contextRetained!==true||job.completedAt!==evidence.settlementAt||!interaction||interaction.phase!=='resolved'||interaction.channel!=='voice'||interaction.caseId!==evidence.caseId||interaction.startedAt!==job.arrivalAt||interaction.finishedAt!==job.completedAt||interaction.context!==true||interaction.probe===true||interaction.botAnswered===true||!caseRecord||caseRecord.tenant!==evidence.tenant||!caseRecord.interactions?.includes(interaction.id)||!settlement||settlement.phase!=='resolved'||!['RESOLVED','CONNECTED'].includes(settlement.outcome)||settlement.obligations.length||settlement.settledAt!==evidence.settlementAt||!same(settlement.policyGenerations,evidence.policyGenerations))return false;
  const expectedGenerations=Object.fromEntries(controlNames.map(name=>[name,{desired:evidence.controlBindings.find(b=>b.control===name).nativeGeneration,effective:evidence.controlBindings.find(b=>b.control===name).nativeGeneration}]));
  if(!same(evidence.policyGenerations,expectedGenerations))return false;
  for(const [name,eventId] of Object.entries(evidence.abuseEventIds)){const event=eventById(childRoot,eventId);if(!abuseEventMatches(name,event,evidence.controlBindings,evidence.policyGenerations,evidence.at))return false;}
  if(!historical&&(!currentStatus(s,evidence.customerId,childRoot).voiceAdmissionReady||!nativeApi().evaluate(childRoot).passed))return false;
  return true;
 }
 function pinnedEventIds(evidence){if(!evidence||evidence.kind!=='provider-security-evidence-v1')return [];return [...new Set(Object.values(evidence.abuseEventIds||{}))].sort();}
 function source(){return `const SOC_PROVIDER_SECURITY=(${socProviderSecurityKernel.toString()})(${JSON.stringify(terms)});`;}
 return {PACK,VERSION,CONTENT_ID:terms.id,sourceIds:copy(terms.sourceIds),controlNames:copy(controlNames),operationIds:copy(controlIds),voiceServicePrerequisites:copy(allRequired),terms:()=>copy(terms),operationDefinition,operationPlan,quotePlan,validatePlan,planReceipt,projectPlan,nativeCommands,paidProjectValid,bindingForProject,validateHistoricalBinding,validateCurrentBinding,currentStatus,evaluateProviderEvidence,validateEvidence,abuseEventMatches,pinnedEventIds,source};
}
const SOC_PROVIDER_SECURITY_CONTENT={
  "version": 1,
  "id": "provider-security-1",
  "currency": "AUD cents",
  "billingIntervalMinutes": 60,
  "sourceIds": [
    "progress.goal.scrub",
    "progress.incident-mechanic.scrub",
    "action:scrubUp",
    "action:scrubMode",
    "state:S.scrubMode",
    "state:S.scrubs",
    "requirement:scrubbed",
    "requirement:scrubnear",
    "asset:scrubMo1/scrubMo/cleanMo:",
    "asset:SCRUB_TIERS:0",
    "asset:SCRUB_TIERS:1",
    "asset:SCRUB_TIERS:2",
    "asset:SCRUB_TIERS:3"
  ],
  "sourceContext": {
    "goal": "Stand up DDoS defences by building a scrubbing center, filtering attacks up to capacity and selling protection.",
    "requirement": "The customer prefers a network that scrubs DDoS traffic without hauling it across an ocean.",
    "comparison": "A packet bouncer should turn away the flood without ejecting the paying callers with it; an overworked filter can mistake clean traffic for the troublemakers.",
    "sourceReward": 20000,
    "sourceRewardUnit": "source-game currency, provenance only",
    "sourceCapacityTiers": [
      "100G",
      "1T",
      "10T",
      "100T"
    ],
    "capacityNote": "Original bandwidth labels remain source provenance; Provider plans price fictional PPS controls and never convert those labels or the source reward to AUD."
  },
  "voiceServicePrerequisites": [
    "provider-security-network",
    "provider-security-sip",
    "provider-security-destination"
  ],
  "controls": {
    "network": {
      "operationId": "provider-security-network",
      "name": "Edge packet scrubbing",
      "description": "Fund a bounded packet-per-second filter. Capacity is measured in simulated packets per second, not in the source game's bandwidth tiers.",
      "resources": [
        "carrier"
      ],
      "requirements": [
        "active-customer",
        "effective-carrier-stage"
      ],
      "offers": {
        "edge-basic": {
          "name": "Edge Basic · 1,000 PPS clean / 10,000 PPS filtered",
          "setupCents": 26000,
          "periodCents": 6000,
          "workMinutes": 6,
          "engineers": 1,
          "support": 1,
          "config": {
            "enabled": true,
            "capacityPps": 1000,
            "mitigationPps": 10000,
            "activationMode": "always"
          }
        },
        "edge-resilient": {
          "name": "Edge Resilient · 5,000 PPS clean / 50,000 PPS filtered",
          "setupCents": 42000,
          "periodCents": 9500,
          "workMinutes": 8,
          "engineers": 1,
          "support": 1,
          "config": {
            "enabled": true,
            "capacityPps": 5000,
            "mitigationPps": 50000,
            "activationMode": "always"
          }
        }
      },
      "limits": {
        "capacityPps": [
          100,
          100000000
        ],
        "mitigationPps": [
          100,
          100000000
        ],
        "activationModes": [
          "always",
          "on-demand"
        ]
      }
    },
    "sip": {
      "operationId": "provider-security-sip",
      "name": "Authenticated SIP admission",
      "description": "Fund separate peer authentication, allowed methods and a per-peer signalling rate. The authenticated synthetic carrier peer is part of this paid configuration.",
      "resources": [
        "carrier",
        "phone"
      ],
      "requirements": [
        "active-customer",
        "effective-carrier-stage",
        "effective-phone-route"
      ],
      "offers": {
        "sip-standard": {
          "name": "Authenticated Invite · 10 attempts/sec · 2,048 bytes",
          "setupCents": 18000,
          "periodCents": 4500,
          "workMinutes": 5,
          "engineers": 1,
          "support": 1,
          "config": {
            "enabled": true,
            "attemptsPerSecond": 10,
            "allowedMethods": [
              "INVITE"
            ],
            "maxMessageBytes": 2048,
            "requireAuthenticatedPeer": true
          }
        },
        "sip-restricted": {
          "name": "Restricted Invite · 5 attempts/sec · 1,024 bytes",
          "setupCents": 26000,
          "periodCents": 6500,
          "workMinutes": 7,
          "engineers": 1,
          "support": 1,
          "config": {
            "enabled": true,
            "attemptsPerSecond": 5,
            "allowedMethods": [
              "INVITE"
            ],
            "maxMessageBytes": 1024,
            "requireAuthenticatedPeer": true
          }
        }
      },
      "supplierPeer": {
        "id": "provider-carrier-peer",
        "authenticated": true,
        "available": true,
        "methods": [
          "INVITE"
        ]
      },
      "limits": {
        "attemptsPerSecond": [
          1,
          100000
        ],
        "messageBytes": [
          64,
          65535
        ],
        "methods": [
          "INVITE",
          "REGISTER",
          "OPTIONS",
          "MESSAGE",
          "ACK",
          "CANCEL",
          "BYE"
        ]
      }
    },
    "destination": {
      "operationId": "provider-security-destination",
      "name": "Destination and spend guard",
      "description": "Fund explicit destination prefixes, a per-call cap and a rolling spend cap. Blocked calls preserve already billed core usage.",
      "resources": [
        "carrier",
        "phone"
      ],
      "requirements": [
        "active-customer",
        "effective-carrier-stage",
        "effective-phone-route"
      ],
      "offers": {
        "australia-guard": {
          "name": "Australia Destination Guard · A$1.00/call · A$1.20/60 min",
          "setupCents": 14000,
          "periodCents": 3500,
          "workMinutes": 4,
          "engineers": 0,
          "support": 1,
          "config": {
            "enabled": true,
            "allowedPrefixes": [
              "+61"
            ],
            "perCallMaxCents": 100,
            "windowSpendLimitCents": 120,
            "windowMinutes": 60
          }
        },
        "australia-tight-guard": {
          "name": "Australia Tight Guard · A$0.20/call · A$0.30/60 min",
          "setupCents": 22000,
          "periodCents": 6000,
          "workMinutes": 6,
          "engineers": 0,
          "support": 1,
          "config": {
            "enabled": true,
            "allowedPrefixes": [
              "+61"
            ],
            "perCallMaxCents": 20,
            "windowSpendLimitCents": 30,
            "windowMinutes": 60
          }
        }
      },
      "limits": {
        "prefixCount": [
          1,
          50
        ],
        "perCallCents": [
          1,
          100000000
        ],
        "windowSpendCents": [
          1,
          1000000000
        ],
        "windowMinutes": [
          1,
          1440
        ]
      }
    }
  },
  "authoredAbuseCases": {
    "network": {
      "peer": "synthetic-flood-origin",
      "packets": 1250,
      "secondOffset": 0,
      "expectedCode": "NETWORK_FLOOD_FILTERED",
      "mustKeepProtectedPath": true
    },
    "sip": {
      "peer": "synthetic-unauthenticated-origin",
      "authenticated": false,
      "available": true,
      "methods": [
        "INVITE",
        "REGISTER"
      ],
      "attempts": 1,
      "method": "INVITE",
      "messageBytes": 128,
      "valid": true,
      "secondOffset": 0,
      "expectedCode": "SIP_AUTH_REQUIRED"
    },
    "destination": {
      "to": "+18005550199",
      "expectedCode": "DESTINATION_NOT_ALLOWED"
    },
    "ordinaryCall": {
      "peer": "provider-carrier-peer",
      "to": "+61255500201",
      "method": "INVITE",
      "durationMinutes": 3,
      "mustResolve": true,
      "mustSettleCoreUsageOnce": true
    }
  }
};
const SOC_PROVIDER_SECURITY=socProviderSecurityKernel(SOC_PROVIDER_SECURITY_CONTENT);
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_SECURITY;
