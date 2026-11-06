/* Pure earned receipts for measured Provider progression facts. */
function socProviderProgressionReceiptsKernel(){
 'use strict';
 const PACK='soc-provider-progression-receipts-1',VERSION=1,CONTENT='provider-progression-receipts-content-1',FIELD='progressionReceipts';
 const FIRST_LIVE=['progress','goal','bb'].join('.'),SUSTAINABLE=['progress','progression-level','1'].join('.');
 const NONSTARTER=['progress','goal','bz'].join('.');
 const EXTERNAL_REACH=['progress','goal','tr'].join('.');
 const LEVEL_TWO=['progress','progression-level','2'].join('.');
 const IX=['progress','goal','ix'].join('.'),LEVEL_THREE=['progress','progression-level','3'].join('.');
 const RESILIENCE_LN=['progress','goal','ln'].join('.'),RESILIENCE_RD=['progress','goal','rd'].join('.');
 const LOCAL_CONTINUITY=['progress','goal','ca'].join('.');
 const SECURITY=['progress','goal','scrub'].join('.');
 const CASE_FOLLOWUP=['progress','progression-level','8'].join('.');
 const DEDICATED_INTERCONNECT=['progress','goal','pn'].join('.');
 const LEVEL_FIVE=['progress','progression-level','5'].join('.'),LEVEL_SIX=['progress','progression-level','6'].join('.');
 const REGIONAL_C3=['progress','goal','c3'].join('.'),REGIONAL_C5=['progress','goal','c5'].join('.'),REGIONAL_T2=['progress','goal','t2'].join('.'),REGIONAL_L7=['progress','progression-level','7'].join('.');
 const REGIONAL_SOURCES=[REGIONAL_C3,REGIONAL_C5,REGIONAL_T2,REGIONAL_L7];
 const OWNED_SOURCES=['progress.goal.'+'df','progress.goal.'+'m2','progress.progression-level.'+'4','progress.progression-level.'+'12','progress.goal.'+'gi'];
 const OWNED_NAMES=['Own service infrastructure','Independent operating sites','Enterprise service provider','Critical-service integrator','Major enterprise or public-service contract'];
 const NAMES=Object.freeze({[SECURITY]:'Communications abuse defences',[FIRST_LIVE]:'First customer live',[SUSTAINABLE]:'Local UC reseller',[NONSTARTER]:'First managed business contract',[LEVEL_TWO]:'Regional communications MSP',[IX]:'First ecosystem integration',[LEVEL_THREE]:'UC and CC integrator',[EXTERNAL_REACH]:'External calling operational',[DEDICATED_INTERCONNECT]:'Dedicated carrier interconnect',[CASE_FOLLOWUP]:'Omnichannel platform operator',[RESILIENCE_LN]:'Second site connected',[RESILIENCE_RD]:'The scenic route has a backup',[LOCAL_CONTINUITY]:'Local media or speech service',[LEVEL_FIVE]:'National communications SP',[LEVEL_SIX]:'Public-service communications specialist',[REGIONAL_C3]:'Three-region service footprint',[REGIONAL_C5]:'Five-region portfolio',[REGIONAL_T2]:'Established communications MSP',[REGIONAL_L7]:'International managed provider'});
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x)),own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x,same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max,id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(x);
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
 function securityApi(){return typeof SOC_PROVIDER_SECURITY!=='undefined'?SOC_PROVIDER_SECURITY:require('./23-provider-security.js');}
 function factsApi(){return typeof SOC_PROVIDER_PROGRESSION_FACTS!=='undefined'?SOC_PROVIDER_PROGRESSION_FACTS:require('./23-provider-progression.js');}
 function regionalSupportApi(){return typeof SOC_PROVIDER_REGIONAL_SUPPORT!=='undefined'?SOC_PROVIDER_REGIONAL_SUPPORT:require('./23-provider-regional-support.js');}
 function ucCcApi(){return typeof SOC_PROVIDER_UC_CC_INTEGRATION!=='undefined'?SOC_PROVIDER_UC_CC_INTEGRATION:(typeof SOCProviderUcCcIntegration!=='undefined'?SOCProviderUcCcIntegration:require('./23-provider-uc-cc-integration.js'));}
 function externalReachApi(){return typeof SOC_PROVIDER_EXTERNAL_REACH!=='undefined'?SOC_PROVIDER_EXTERNAL_REACH:require('./23-provider-external-reach.js');}
 function resilienceProgressionApi(){return typeof SOC_PROVIDER_RESILIENCE_PROGRESSION!=='undefined'?SOC_PROVIDER_RESILIENCE_PROGRESSION:require('./23-provider-resilience-progression.js');}
 function centralProgressionApi(){return typeof SOC_PROVIDER_CENTRAL_PROGRESSION!=='undefined'?SOC_PROVIDER_CENTRAL_PROGRESSION:require('./23-provider-central-progression.js');}
 function localProgressionApi(){return typeof SOC_PROVIDER_LOCAL_PROGRESSION!=='undefined'?SOC_PROVIDER_LOCAL_PROGRESSION:require('./23-provider-local-progression.js');}
 function ownedSitesApi(){return typeof SOC_PROVIDER_OWNED_SITES!=='undefined'?SOC_PROVIDER_OWNED_SITES:require('./23-provider-owned-sites.js');}
 function caseFollowupApi(){return typeof SOC_PROVIDER_CASE_FOLLOWUP!=='undefined'?SOC_PROVIDER_CASE_FOLLOWUP:require('./23-provider-case-followup.js');}
 function caseFollowupHooks(s,hooks){return typeof hooks.caseFollowupHooks==='function'?hooks.caseFollowupHooks(s):hooks.caseFollowupHooks||hooks;}
 function dedicatedInterconnectApi(){return typeof SOC_PROVIDER_DEDICATED_INTERCONNECT!=='undefined'?SOC_PROVIDER_DEDICATED_INTERCONNECT:require('./23-provider-dedicated-interconnect.js');}
 function dedicatedInterconnectHooks(s,hooks={}){return typeof hooks.dedicatedInterconnectHooks==='function'?hooks.dedicatedInterconnectHooks(s):hooks.dedicatedInterconnectHooks||hooks;}
 function factsHooks(hooks,s){const base=hooks.factsHooks||hooks;if(Array.isArray(base.supportSamples))return base;if(base.supportSamples)return {...base,supportSamples:factsApi().decodeSupportObservation(base.supportSamples)};return {...base,supportSamples:factsApi().decodeSupportObservation(s?.providerCampaign?.supportObservation)};}
 function regionalSamples(value){const A=factsApi();if(Array.isArray(value))return copy(value);if(value&&typeof value==='object'&&Array.isArray(value.configurations))return A.decodeSupportObservation(value);if(Array.isArray(value?.samples))return copy(value.samples);return A.decodeSupportObservation(value);}
 function decodeRegionalEvidence(evidence){
  if(!exact(evidence,['kind','version','sourceId','interval','customerIds','markets','samples'])||evidence.kind!=='provider-regional-support-window-v1'||evidence.version!==1||!REGIONAL_SOURCES.includes(evidence.sourceId))return null;
  let samples;try{samples=Array.isArray(evidence.samples)?copy(evidence.samples):factsApi().decodeSupportObservation(evidence.samples);}catch{return null;}
  return {...copy(evidence),samples};
 }
 function compactRegionalEvidence(evidence){
  const decoded=decodeRegionalEvidence(evidence);if(!decoded)return null;
  return {...copy(evidence),samples:factsApi().encodeSupportObservation(decoded.samples)};
 }
 function paidPosting(s,project,reason){if(!project||!s.providerCampaign.projects.includes(project))return false;const row=s.business?.ledger?.find(x=>x.id===project.postingId);if(row)return row.category==='cost'&&row.reason===reason&&row.customerId===project.customerId&&row.projectId===project.id&&row.cents===project.setupCents;const match=/^entry-([1-9]\d*)$/.exec(project.postingId||'');return !!match&&Number(match[1])<=(s.business?.ledgerPrunedThrough||0);}
 function receiptStore(s){return s?.providerCampaign?.[FIELD];}
 function empty(){return {pack:PACK,version:VERSION,contentVersion:CONTENT,receipts:[]};}
 function digest(value){
  const input=JSON.stringify(value);let hash=0x811c9dc5;
  for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,0x01000193);}
  return (hash>>>0).toString(16).padStart(8,'0');
 }
 function withoutDigest(receipt){const out={...receipt};delete out.integrity;return out;}
 function seal(receipt){return {...receipt,integrity:digest(withoutDigest(receipt))};}
 function knownIds(){const A=factsApi();return [...A.LEVELS,...A.GOALS];}
 function rowFor(report,sourceId){return report.levels?.[sourceId]||report.goals?.[sourceId]||null;}
 function supportedPredicate(sourceId){return [SECURITY,...OWNED_SOURCES,FIRST_LIVE,SUSTAINABLE,NONSTARTER,LEVEL_TWO,...REGIONAL_SOURCES,IX,LEVEL_THREE,EXTERNAL_REACH,DEDICATED_INTERCONNECT,CASE_FOLLOWUP,RESILIENCE_LN,RESILIENCE_RD,LOCAL_CONTINUITY,LEVEL_FIVE,LEVEL_SIX].includes(sourceId);}
 function regionalEvidenceFor(s,evidence,hooks){
  const A=factsApi(),samples=Array.isArray(hooks.supportSamples)?copy(hooks.supportSamples):hooks.supportSamples?A.decodeSupportObservation(hooks.supportSamples):A.decodeSupportObservation(s.providerCampaign.supportObservation),window=A.qualifySupportWindow(samples),facts=A.evaluate(s,factsHooks(hooks,s));
  if(window.status!=='ready'||!A.validateSupportSamples(s,samples,factsHooks(hooks,s)))return {missing:window.missing?.length?window.missing:['VALIDATED_CURRENT_SUPPORT_SAMPLES_REQUIRED']};
  if(samples.length!==60||samples.at(-1)?.at!==s.clock)return {missing:['EXACT_CURRENT_60_MINUTE_SUPPORT_WINDOW_REQUIRED']};
  const expected=facts.levels[LEVEL_TWO];if(expected?.status!=='ready'||!expected.evidence)return {missing:copy(expected?.missing||['CURRENT_LEVEL_TWO_FACTS_REQUIRED'])};
  const rows=[];for(const customerId of window.evidence.customerIds){const customer=s.providerCampaign.customers.find(x=>x.id===customerId);if(!customer||!['active','renewal'].includes(customer.status))return {missing:['ACTIVE_SUPPORT_WINDOW_CUSTOMER_REQUIRED']};for(const stageId of ['base','carrier','partner']){const stage=customer.stages?.[stageId],project=stage&&s.providerCampaign.projects.find(x=>x.id===stage.projectId&&x.customerId===customerId&&x.kind==='stage'&&x.stage===stageId&&x.status==='complete'&&stage.status==='effective');if(!project)return {missing:['PAID_SUPPORT_WINDOW_STAGES_REQUIRED']};rows.push({customerId,stageId,projectId:project.id,postingId:project.postingId});}}
  return {evidence:{customerIds:[...window.evidence.customerIds],markets:[...window.evidence.markets],interval:copy(window.evidence.interval),minutes:window.evidence.minutes,humanJobIds:[...window.evidence.humanJobIds],settlements:copy(window.evidence.settlements),supportSamples:A.encodeSupportObservation(samples),stageProjects:rows}};
 }
 function billedEvidenceFor(s,evidence){
  const customer=s.providerCampaign.customers.find(c=>c.id===evidence?.customerId);
  if(!customer||customer.id==='starter-customer'||!['active','renewal'].includes(customer.status)||!customer.retailAgreement||customer.retailAgreement.at!==evidence.agreementAt)return {missing:['NONSTARTER_ACCEPTED_AGREEMENT_REQUIRED']};
  const history=customer.history?.find(h=>h.period===evidence.settlementPeriod&&h.to===evidence.settlementTo);
  if(!history||history.basis!=='provider-period-history-v1'||history.fullPeriod!==true||history.qualified!==true||history.to-history.from!==60||history.settledAt!==history.to||history.to>s.clock||history.to-customer.retailAgreement.at<0||s.clock-history.to>60)return {missing:['RECENT_QUALIFIED_NONSTARTER_SETTLEMENT_REQUIRED']};
  const jobs=(evidence.jobs||[]).map(x=>s.providerCampaign.jobs.find(j=>j.id===x.jobId&&j.customerId===customer.id&&j.interactionId===x.interactionId&&j.caseId===x.caseId&&j.channel===x.channel&&['completed','late'].includes(j.status)&&j.contextRetained===true));
  if(jobs.length!==2||jobs.some(x=>!x)||new Set(jobs.map(x=>x.channel)).size!==2||!jobs.some(x=>x.channel==='voice')||!jobs.some(x=>x.channel==='message'))return {missing:['SAME_CUSTOMER_RESOLVED_VOICE_AND_MESSAGE_WORK_REQUIRED']};
  if((customer.customerAcceptedAt??customer.retailAgreement.at)>history.from)return {missing:['AGREEMENT_MUST_PRECEDE_QUALIFIED_SETTLEMENT']};
  const support=evidence.supportResponsibility;
  if(!support||support.customerId!==customer.id||support.role!=='msp'||support.organisationId!=='orchard-msp'||support.effectiveAt>history.to||support.expiresAt!==null&&support.expiresAt<=history.to||support.evidence?.sharedWorkforce?.support<1||support.evidence?.sharedWorkforce?.personMinutes<1||support.evidence?.sharedWorkforce?.billedMinutes<1)return {missing:['SAME_CUSTOMER_PAID_MSP_SUPPORT_REQUIRED']};
  const revenue=s.business.ledger.find(x=>x.id===evidence.revenuePostingId),costs=(evidence.costPostingIds||[]).map(id=>s.business.ledger.find(x=>x.id===id));
  const global=s.providerCampaign.periodHistory.find(x=>x.period===history.period&&x.from===history.from&&x.to===history.to&&x.settledAt===history.to);
  if(!revenue||costs.some(x=>!x)||!global||revenue.reason!=='provider-customer-period'||revenue.category!=='revenue'||revenue.customerId!==customer.id||revenue.period!==history.period||revenue.at!==history.to||revenue.cents!==history.grossRetail||costs.some(x=>x.category!=='cost'||x.customerId!==customer.id||x.period!==history.period||x.at!==history.to||!['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'].includes(x.reason)))return {missing:['QUALIFIED_SETTLEMENT_POSTING_LINEAGE_REQUIRED']};
  const projects=['base','carrier','partner'].map(stageId=>{const stage=customer.stages?.[stageId];return stage&&s.providerCampaign.projects.find(x=>x.id===stage.projectId&&x.customerId===customer.id&&x.kind==='stage'&&x.stage===stageId&&x.status==='complete'&&stage.status==='effective');});
  if(projects.some(x=>!x)||projects.some(x=>!s.business.ledger.some(e=>e.id===x.postingId&&e.category==='cost'&&e.cents===x.setupCents&&e.customerId===customer.id&&e.projectId===x.id&&e.reason==='provider-implementation')))return {missing:['PAID_NONSTARTER_STAGE_OBLIGATIONS_REQUIRED']};
  const from=Math.min(...jobs.map(x=>x.arrivalAt)),to=Math.max(...jobs.map(x=>x.completedAt));
  return {evidence:{business:{customerId:customer.id,portfolioId:customer.portfolioId,from,to,agreementAt:customer.retailAgreement.at,projectIds:projects.map(x=>x.id),postingIds:projects.map(x=>x.postingId),jobs:evidence.jobs.map(x=>({...x})),settlement:{customerId:customer.id,period:history.period,from:history.from,to:history.to,settledAt:history.settledAt,qualified:history.qualified,grossRetailCents:history.grossRetail,netRetailCents:history.netRetail,globalOperatingResultCents:global.operatingResult,revenuePostingId:revenue.id,costPostingIds:costs.map(x=>x.id).sort()},supportResponsibility:copy(support)}}};
 }
 function integrationHooks(s,customer,hooks={}){
  const root=hooks.customerRoot?.(s,customer.portfolioId)||s.portfolio?.customers?.find(x=>x.id===customer.portfolioId)?.root||null;
  if(typeof hooks.integrationHooks==='function')return hooks.integrationHooks(s,customer.id,root);
  return hooks.integrationHooks||hooks;
 }
 function providerIntegrationEvidenceFor(s,sourceId,evidence,hooks={}){
  const keys=sourceId===IX?['kind','version','customerId','portfolioId','market','markets','task','interval']:['kind','version','customerId','portfolioId','market','markets','task','capability','interval'];
  if(!exact(evidence,keys)||evidence.version!==1||evidence.kind!==(sourceId===IX?'provider-uc-cc-first-integration':'provider-uc-cc-integrator')||!id(evidence.customerId)||!id(evidence.portfolioId)||!id(evidence.market)||!exact(evidence.interval,['from','to'])||!integer(evidence.interval.from)||!integer(evidence.interval.to)||evidence.interval.to<evidence.interval.from)return {missing:['INVALID_UC_CC_PROGRESSION_EVIDENCE']};
  const customer=s.providerCampaign.customers.find(x=>x.id===evidence.customerId);if(!customer||customer.portfolioId!==evidence.portfolioId||customer.market!==evidence.market||!['active','renewal'].includes(customer.status))return {missing:['UC_CC_CUSTOMER_SCOPE_OR_STATUS_MISMATCH']};
  const api=ucCcApi(),projectId=evidence.task?.projectId,project=s.providerCampaign.projects.find(x=>x.id===projectId&&x.customerId===customer.id&&x.kind==='operation'&&api.OPERATION_IDS.includes(x.operationId)&&x.status==='complete');
  if(!project||project.postingId!==evidence.task?.postingId)return {missing:['PAID_UC_CC_INTEGRATION_PROJECT_REQUIRED']};
  const taskHooks=integrationHooks(s,customer,hooks),task=api.taskEvidence(s,project.id,taskHooks);
  if(task.status!=='ready'||!same(task.evidence,evidence.task)||!api.validateTaskEvidence(s,project.id,evidence.task,taskHooks))return {missing:task.missing?.length?copy(task.missing):['CURRENT_UC_CC_TASK_EVIDENCE_REQUIRED']};
  if(evidence.interval.from!==task.evidence.test.at||sourceId===IX&&evidence.interval.to!==task.evidence.quality.completedAt||sourceId===LEVEL_THREE&&evidence.interval.to!==evidence.capability?.interval?.to)return {missing:['UC_CC_EVIDENCE_INTERVAL_MISMATCH']};
  if(sourceId===LEVEL_THREE){
   if(!factsApi().validateUcCcCapabilityEvidence(s,customer.id,evidence.task,evidence.capability,hooks))return {missing:['SAME_CUSTOMER_RESOLVED_PROVIDER_CASE_AND_REAL_MEETING_REQUIRED']};
  }
  if(sourceId===EXTERNAL_REACH){if(row.status!=='ready'||!row.evidence)return {sourceId,name:row.name,status:'incomplete',missing:copy(row.missing||['PROVIDER_EXTERNAL_REACH_EVIDENCE_REQUIRED']),evidence:null};if(!externalReachApi().validateEvidence(s,row.evidence.customerId,row.evidence,hooks,{current:true,at:s.clock}))return {sourceId,name:row.name,status:'incomplete',missing:['RETAINED_EXTERNAL_REACH_LINEAGE_REQUIRED'],evidence:null};return {sourceId,name:row.name,status:'ready',missing:[],evidence:copy(row.evidence)};}
  if(sourceId===DEDICATED_INTERCONNECT){if(row.status!=='ready'||!row.evidence)return {sourceId,name:row.name,status:'incomplete',missing:copy(row.missing||['PAID_CURRENT_GATEWAY_AND_TWO_REAL_DIRECTIONS_REQUIRED']),evidence:null};const api=dedicatedInterconnectApi(),domainHooks=dedicatedInterconnectHooks(s,hooks);if(!api.validateEvidence(s,row.evidence.customerId,row.evidence,domainHooks,{historical:false}))return {sourceId,name:row.name,status:'incomplete',missing:['RETAINED_DEDICATED_INTERCONNECT_LINEAGE_REQUIRED'],evidence:null};return {sourceId,name:row.name,status:'ready',missing:[],evidence:copy(row.evidence)};}
  if([RESILIENCE_LN,RESILIENCE_RD].includes(sourceId)){
   if(row.status!=='ready'||!row.evidence)return {sourceId,name:row.name,status:'incomplete',missing:copy(row.missing||['PROVIDER_RESILIENCE_EVIDENCE_REQUIRED']),evidence:null};
   if(!resilienceProgressionApi().validateEvidence(s,sourceId,row.evidence.customerId,row.evidence,hooks,{historical:false}))return {sourceId,name:row.name,status:'incomplete',missing:['RETAINED_PROVIDER_RESILIENCE_LINEAGE_REQUIRED'],evidence:null};
   return {sourceId,name:row.name,status:'ready',missing:[],evidence:copy(row.evidence)};
  }
  if(sourceId===LOCAL_CONTINUITY){
   if(row.status!=='ready'||!row.evidence||row.evidence.kind!=='provider-local-speech')return {sourceId,name:row.name,status:'incomplete',missing:copy(row.missing||['PAID_LOCAL_SPEECH_AND_TRANSCRIPTION_REQUIRED']),evidence:null};
   if(!localProgressionApi().validateEvidence(s,row.evidence.customerId,row.evidence,hooks))return {sourceId,name:row.name,status:'incomplete',missing:['RETAINED_LOCAL_SPEECH_LINEAGE_REQUIRED'],evidence:null};
   return {sourceId,name:row.name,status:'ready',missing:[],evidence:copy(row.evidence)};
  }
  return {evidence:copy(evidence)};
 }
 function eligibility(s,sourceId,hooks={},preparedReport=null,stateValidated=false){
  if(!stateValidated)validate(s,hooks);
  if(!knownIds().includes(sourceId))fail('UNKNOWN_PROVIDER_PROGRESSION_SOURCE');
  const report=preparedReport||factsApi().evaluate(s,factsHooks(hooks,s)),row=rowFor(report,sourceId);
  if(!row)return {sourceId,status:'pending',missing:['PROVIDER_PROGRESSION_FACT_UNAVAILABLE'],evidence:null};
  if(!supportedPredicate(sourceId))return {sourceId,name:row.name,status:'incomplete',missing:['A retained proof adapter is not implemented for this canonical identity.'],evidence:null};
  if([LEVEL_FIVE,LEVEL_SIX].includes(sourceId)&&!['provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion))return {sourceId,name:row.name,status:'incomplete',missing:['PROVIDER_CONTENT_SIX_REQUIRED'],evidence:null};
  const existing=receiptStore(s)?.receipts?.find(x=>x.sourceId===sourceId);
  if(existing)return {sourceId,name:row.name,status:'earned',missing:[],evidence:copy(existing.sourceEvidence),receipt:copy(existing)};
  if(sourceId===LEVEL_THREE){
   const level2=receiptStore(s)?.receipts?.find(x=>x.sourceId===LEVEL_TWO),ix=receiptStore(s)?.receipts?.find(x=>x.sourceId===IX);
   if(!level2)return {sourceId,name:row.name,status:'incomplete',missing:['REGIONAL_MSP_LEVEL_TWO_RECEIPT_REQUIRED'],evidence:null};
   if(!ix)return {sourceId,name:row.name,status:'incomplete',missing:['FIRST_ECOSYSTEM_INTEGRATION_RECEIPT_REQUIRED'],evidence:null};
  }
  if(row.status!=='ready'||!row.evidence)return {sourceId,name:row.name,status:'incomplete',missing:copy(row.missing||['PROVIDER_PROGRESSION_EVIDENCE_REQUIRED']),evidence:null};
  if([LEVEL_FIVE,LEVEL_SIX].includes(sourceId)&&!centralProgressionApi().validateEvidence(s,sourceId,row.evidence,hooks,{historical:false}))return {sourceId,name:row.name,status:'incomplete',missing:['VALIDATED_CENTRAL_SERVICE_LINEAGE_REQUIRED'],evidence:null};
  if(OWNED_SOURCES.includes(sourceId)&&(!['provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)||!ownedSitesApi().validateEvidence(s,sourceId,row.evidence?.customerId,row.evidence,hooks.ownedSiteHooks||hooks)))return {sourceId,name:row.name,status:'incomplete',missing:['VALIDATED_PAID_SITE_WORK_REQUIRED'],evidence:null};
  if(sourceId===SECURITY&&!securityApi().validateProgressionEvidence(s,row.evidence,{observeResource:hooks.observeResource}))return {sourceId,name:row.name,status:'incomplete',missing:['VALIDATED_PAID_SECURITY_DELIVERY_REQUIRED'],evidence:null};
  if(sourceId===CASE_FOLLOWUP&&!caseFollowupApi().validateEvidence(s,row.evidence,caseFollowupHooks(s,hooks)))return {sourceId,name:row.name,status:'incomplete',missing:['VALIDATED_PAID_FOLLOWUP_HISTORY_REQUIRED'],evidence:null};
  if(sourceId===NONSTARTER){const normalized=billedEvidenceFor(s,row.evidence);if(normalized.missing)return {sourceId,name:row.name,status:'incomplete',missing:normalized.missing,evidence:null};return {sourceId,name:row.name,status:'ready',missing:[],evidence:normalized.evidence};}
  if(sourceId===LEVEL_TWO){const prior=receiptStore(s)?.receipts?.find(x=>x.sourceId===SUSTAINABLE);if(!prior)return {sourceId,name:row.name,status:'incomplete',missing:['SUSTAINABLE_LOCAL_RESELLER_RECEIPT_REQUIRED'],evidence:null};const normalized=regionalEvidenceFor(s,row.evidence,factsHooks(hooks,s));if(normalized.missing)return {sourceId,name:row.name,status:'incomplete',missing:normalized.missing,evidence:null};return {sourceId,name:row.name,status:'ready',missing:[],evidence:normalized.evidence};}
  if(REGIONAL_SOURCES.includes(sourceId)){
   if(s.providerCampaign.contentVersion!=='provider-campaigns-8')return {sourceId,name:row.name,status:'incomplete',missing:['PROVIDER_CAMPAIGNS_EIGHT_REQUIRED'],evidence:null};
   const sourceEvidence=row.evidence;
   if(row.status!=='ready'||!sourceEvidence||sourceEvidence.sourceId!==sourceId||!exact(sourceEvidence,['kind','version','sourceId','interval','customerIds','markets','samples']))return {sourceId,name:row.name,status:'incomplete',missing:copy(row.missing||['VALIDATED_REGIONAL_SUPPORT_WINDOW_REQUIRED']),evidence:null};
   return {sourceId,name:row.name,status:'ready',missing:[],evidence:copy(sourceEvidence)};
  }
  if(sourceId===IX||sourceId===LEVEL_THREE){const normalized=providerIntegrationEvidenceFor(s,sourceId,row.evidence,hooks);if(normalized.missing)return {sourceId,name:row.name,status:'incomplete',missing:normalized.missing,evidence:null};return {sourceId,name:row.name,status:'ready',missing:[],evidence:normalized.evidence};}
  if(sourceId===SUSTAINABLE){
   const first=receiptStore(s)?.receipts?.find(x=>x.sourceId===FIRST_LIVE);
   const sustainableCustomer=row.evidence?.sustainable?.customerId||row.evidence?.firstLive?.customerId;
   if(!first) return {sourceId,name:row.name,status:'incomplete',missing:['First customer live receipt must be earned first.'],evidence:null};
   if(!first.customerIds.includes(sustainableCustomer))return {sourceId,name:row.name,status:'incomplete',missing:['Sustainable evidence must belong to the customer in the first-live receipt.'],evidence:null};
  }
  return {sourceId,name:row.name,status:'ready',missing:[],evidence:copy(row.evidence)};
 }
 function collect(evidence){
  const acc={customerIds:new Set(),projectIds:new Set(),postingIds:new Set(),jobIds:new Set(),interactionIds:new Set(),caseIds:new Set(),periods:new Set(),intervals:[]};
  function visit(value){
   if(!value||typeof value!=='object')return;
   if(Array.isArray(value)){for(const item of value)visit(item);return;}
   if(typeof value.customerId==='string')acc.customerIds.add(value.customerId);
   for(const [key,target] of [['customerIds','customerIds'],['projectIds','projectIds'],['postingIds','postingIds'],['jobIds','jobIds'],['interactionIds','interactionIds'],['caseIds','caseIds']])if(Array.isArray(value[key]))for(const item of value[key])if(typeof item==='string')acc[target].add(item);
   for(const key of ['projectId','qualificationProjectId'])if(typeof value[key]==='string')acc.projectIds.add(value[key]);
   for(const key of ['postingId','revenuePostingId'])if(typeof value[key]==='string')acc.postingIds.add(value[key]);
   if(value.reason==='staff'&&value.category==='cost'&&typeof value.id==='string')acc.postingIds.add(value.id);
   if(Array.isArray(value.costPostingIds))for(const item of value.costPostingIds)if(typeof item==='string')acc.postingIds.add(item);
   if(typeof value.jobId==='string')acc.jobIds.add(value.jobId);
   if(typeof value.interactionId==='string')acc.interactionIds.add(value.interactionId);
   if(typeof value.caseId==='string')acc.caseIds.add(value.caseId);
   if(Number.isSafeInteger(value.period)&&value.period>=0)acc.periods.add(value.period);
   if(Number.isSafeInteger(value.from)&&Number.isSafeInteger(value.to)&&value.from>=0&&value.to>=value.from)acc.intervals.push({from:value.from,to:value.to});
   for(const [key,item] of Object.entries(value))if(!['customerIds','projectIds','postingIds','jobIds','interactionIds','caseIds','costPostingIds'].includes(key)&&item&&typeof item==='object')visit(item);
  }
  visit(evidence);
  const intervals=acc.intervals;
  return {customerIds:[...acc.customerIds].sort(),projectIds:[...acc.projectIds].sort(),postingIds:[...acc.postingIds].sort(),jobIds:[...acc.jobIds].sort(),interactionIds:[...acc.interactionIds].sort(),caseIds:[...acc.caseIds].sort(),settlementPeriods:[...acc.periods].sort((a,b)=>a-b),evidenceInterval:intervals.length?{from:Math.min(...intervals.map(x=>x.from)),to:Math.max(...intervals.map(x=>x.to))}:null};
 }
 function rootFor(s,customer,hooks){
  const portfolioId=customer?.portfolioId||customer?.id;
  if(typeof hooks.customerRoot==='function')return hooks.customerRoot(s,portfolioId);
  return s?.portfolio?.customers?.find(x=>x.id===portfolioId)?.root||null;
 }
 function generationsFor(s,customerIds,hooks){
  const out=[];
  for(const customerId of customerIds){
   const customer=s.providerCampaign.customers.find(x=>x.id===customerId);if(!customer)continue;
   const root=rootFor(s,customer,hooks);if(!root||root.providerCustomer?.id!==customer.id)continue;
   for(const stageId of ['base','carrier','partner'])for(const resourceId of customer.stages?.[stageId]?.resources||[]){
    const resource=root.resources?.[resourceId];if(integer(resource?.generation))out.push({customerId,resourceId,generation:resource.generation});
   }
  }
  return out.sort((a,b)=>a.customerId.localeCompare(b.customerId)||a.resourceId.localeCompare(b.resourceId));
 }
 function liveEvidence(evidence){return evidence?.firstLive||evidence?.business||evidence;}
 function regionalWorkItems(evidence){return [...new Map(regionalSamples(evidence?.samples??evidence?.supportSamples).flatMap(sample=>sample.participants.flatMap(participant=>participant.freshJobs.map(job=>[job.jobId,{...job,customerId:participant.customerId}])))).values()];}
 function retainedWorkArrival(s,customer,job,interaction,hooks,at=s.clock){
  const matches=event=>event?.code==='CUSTOMER_WORK_ARRIVED'&&event.customerId===customer.id&&event.jobId===job.id&&event.interactionId===interaction.id&&event.caseId===job.caseId&&event.channel===job.channel&&event.at===job.arrivalAt&&event.deadlineAt===job.deadlineAt;
  const event=(s.providerCampaign.events||[]).find(matches);if(event)return event;
  if(typeof hooks.supportWorkOrigin!=='function')return null;
  const pinned=hooks.supportWorkOrigin(s,customer.id,interaction,at);return matches(pinned)?pinned:null;
 }
 function workProofsFor(s,evidence,hooks){
  const live=liveEvidence(evidence),regional=evidence?.supportSamples||evidence?.kind==='provider-regional-support-window-v1'?evidence:null;
  const items=regional?regionalWorkItems(regional):Array.isArray(live?.jobs)?live.jobs.map(item=>({...item,customerId:live.customerId})):[];
  const customerIds=regional?.customerIds||[live?.customerId];
  if(!items.length||!regional&&items.length!==2||customerIds.some(customerId=>!s.providerCampaign.customers.some(x=>x.id===customerId)))fail('PROVIDER_PROGRESSION_WORK_LINEAGE_REQUIRED');
  return items.map(item=>{
   const customer=s.providerCampaign.customers.find(x=>x.id===item.customerId),root=customer&&rootFor(s,customer,hooks),job=s.providerCampaign.jobs.find(x=>x.id===item.jobId&&x.customerId===customer.id),interaction=root?.interactions?.find(x=>x.id===item.interactionId),caseRecord=root?.cases?.[item.caseId],assignment=interaction&&root.workforceOps?.assignments?.find(x=>x.person===interaction.agent&&x.status==='complete'&&(x.id===interaction.workforceAssignment||x.interaction===interaction.workforceAssignment||x.interaction===interaction.id)),arrivalEvent=job&&interaction&&retainedWorkArrival(s,customer,job,interaction,hooks);
   if(!job||!interaction||!caseRecord||!assignment||!arrivalEvent||!['completed','late'].includes(job.status)||job.contextRetained!==true||job.interactionId!==item.interactionId||job.caseId!==item.caseId||job.channel!==item.channel||interaction.phase!=='resolved'||interaction.probe===true||interaction.botAnswered===true||!interaction.agent||!interaction.workforceAssignment||interaction.channel!==job.channel||interaction.caseId!==job.caseId||interaction.context!==true||interaction.needOutcome&&interaction.needOutcome.outcome!=='resolved'||interaction.finishedAt!==job.completedAt||caseRecord.tenant!==root.tenant||!caseRecord.interactions?.includes(interaction.id)||assignment.personSnapshot?.id!==interaction.agent||!assignment.personSnapshot?.skills?.includes('service'))fail('PROVIDER_PROGRESSION_WORK_LINEAGE_REQUIRED');
   return {customerId:customer.id,jobId:job.id,arrivalEventId:arrivalEvent.id,periodIndex:job.periodIndex,channel:job.channel,arrivalAt:job.arrivalAt,completedAt:job.completedAt,deadlineAt:job.deadlineAt,status:job.status,contextRetained:job.contextRetained,interactionId:interaction.id,caseId:caseRecord.id||item.caseId,interaction:{phase:interaction.phase,probe:interaction.probe===true,botAnswered:interaction.botAnswered===true,startedAt:interaction.startedAt,finishedAt:interaction.finishedAt,channel:interaction.channel,caseId:interaction.caseId,context:interaction.context,agent:interaction.agent,assignmentId:interaction.workforceAssignment},assignment:{id:assignment.id,interaction:assignment.interaction,person:assignment.person,status:assignment.status,skill:assignment.skill,language:assignment.language,startedAt:assignment.startedAt,wrapUntil:assignment.wrapUntil,personSnapshot:{id:assignment.personSnapshot.id,employer:assignment.personSnapshot.employer,skills:copy(assignment.personSnapshot.skills)}},case:{tenant:caseRecord.tenant,interactions:[...caseRecord.interactions]}};
  }).sort((a,b)=>a.customerId.localeCompare(b.customerId)||a.jobId.localeCompare(b.jobId));
 }
 function settlementProofFor(s,evidence){
  if(evidence?.sustainable||evidence?.business?.settlement){
   const proof=evidence.sustainable?evidence.sustainable:evidence.business.settlement,c=s.providerCampaign.customers.find(x=>x.id===proof.customerId),from=proof.interval?.from??proof.from,to=proof.interval?.to??proof.to,history=c?.history?.find(x=>x.period===proof.period&&x.to===to&&x.from===from),global=s.providerCampaign.periodHistory?.find(x=>x.period===proof.period&&x.from===from&&x.to===to),ledger=s.business?.ledger||[];
   const revenue=ledger.find(x=>x.id===proof.revenuePostingId),costs=(proof.costPostingIds||[]).map(id=>ledger.find(x=>x.id===id));
   const sustainable=!!evidence.sustainable;
   if(!history||!global||!revenue||costs.some(x=>!x)||history.fullPeriod!==true||history.qualified!==true||history.to-history.from!==60||global.operatingResult!==proof.globalOperatingResultCents||sustainable&&global.operatingResult<=0||global.settledAt!==history.to||revenue.customerId!==c.id||revenue.period!==history.period||revenue.at!==history.to||revenue.category!=='revenue'||revenue.reason!=='provider-customer-period'||revenue.cents!==history.grossRetail||costs.some(x=>x.category!=='cost'||x.customerId!==c.id||x.period!==history.period||x.at!==history.to||!['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'].includes(x.reason)))fail('PROVIDER_PROGRESSION_SETTLEMENT_LINEAGE_REQUIRED');
   return {customerId:c.id,period:history.period,from:history.from,to:history.to,settledAt:global.settledAt,qualified:history.qualified,grossRetailCents:history.grossRetail,netRetailCents:history.netRetail,globalOperatingResultCents:global.operatingResult,revenuePostingId:revenue.id,costPostingIds:costs.map(x=>x.id).sort()};
  }
  return null;
 }
 function portfolioIdsFor(s,customerIds){return [...new Set(customerIds.map(id=>s.providerCampaign.customers.find(c=>c.id===id)?.portfolioId).filter(x=>typeof x==='string'))].sort();}
 function agreementWasAccepted(s,customer,at){return at===customer?.customerAcceptedAt||at===customer?.retailAgreement?.at||(s.providerCampaign.events||[]).some(event=>event.customerId===customer?.id&&event.code==='CUSTOMER_RENEWED'&&event.at===at);}
 function unlockFor(sourceId,customerId,evidence){
  if(sourceId===SECURITY)return {id:'provider-managed-security-v1',kind:'paid-operation',action:'operation',operationId:securityApi().operationIds.network,config:{planId:securityApi().managedTerms().planId},customerId,allowedMarkets:[evidence.market],scope:'another-customer-in-earned-market',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===OWNED_SOURCES[0])return {id:'provider-managed-site-recovery-v1',kind:'paid-operation',action:'operation',operationId:'managed-site-recovery',customerId,allowedMarkets:[evidence.market],scope:'same-market',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if([LEVEL_FIVE,LEVEL_SIX].includes(sourceId))return {id:sourceId===LEVEL_FIVE?'provider-national-headroom-v1':'provider-public-service-archive-v1',kind:'paid-operation-alternatives',action:'operation',operationIds:sourceId===LEVEL_FIVE?['national-wholesale-headroom','managed-national-wholesale-headroom']:['public-service-capture-reserve'],customerId,customerIds:collect(evidence).customerIds,scope:'evidenced-customers',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===SUSTAINABLE)return {id:'provider-managed-carrier-headroom-v1',kind:'paid-operation',action:'operation',operationId:'managed-carrier-headroom',customerId,quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===NONSTARTER)return {id:'provider-integrator-room-v1',kind:'paid-operation',action:'operation',operationId:'integrator-room',customerId,quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===LEVEL_TWO)return {id:'provider-regional-provisioning-v1',kind:'paid-operation',action:'operation',operationId:'regional-provisioning',customerId,allowedMarkets:[...(evidence?.markets||[])].sort(),scope:'provisioning',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===REGIONAL_C3||sourceId===REGIONAL_C5)return {id:sourceId===REGIONAL_C3?'provider-regional-provisioning-c3-v1':'provider-regional-provisioning-c5-v1',kind:'paid-operation',action:'operation',operationId:'regional-provisioning',customerId,allowedMarkets:[...(evidence?.markets||[])].sort(),scope:'provisioning',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===REGIONAL_T2)return {id:'provider-integration-assurance-t2-v1',kind:'paid-operation',action:'operation',operationId:'integration-assurance',customerId,allowedCustomerIds:[...(evidence?.customerIds||[])].sort(),allowedMarkets:[...(evidence?.markets||[])].sort(),scope:'assurance',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===REGIONAL_L7)return {id:'provider-distributor-support-l7-v1',kind:'paid-operation',action:'operation',operationId:'provider-support-coverage',coverageId:'distributor-extended',customerId,allowedMarkets:[...(evidence?.markets||[])].sort(),scope:'evidenced-markets',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===CASE_FOLLOWUP)return {id:'provider-managed-case-followup-l8-v1',kind:'paid-operation',action:'operation',operationId:caseFollowupApi().MANAGED,customerId,allowedMarkets:[evidence.market],scope:'same-market',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===DEDICATED_INTERCONNECT)return {id:'provider-managed-dedicated-interconnect-pn-v1',kind:'paid-operation',action:'operation',operationId:dedicatedInterconnectApi().MANAGED,customerId,allowedMarkets:[evidence.market],scope:'same-market',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===IX)return {id:'provider-uc-cc-retest-options-v1',kind:'paid-operation-alternatives',action:'operation',operationIds:['uc-cc-retest','managed-uc-cc-retest'],customerId,requiresCurrentEdgeToBeStale:true,requiresFreshTestAndQualityReview:true,quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===LEVEL_THREE)return {id:'provider-managed-uc-cc-integration-v1',kind:'paid-operation-alternatives',action:'operation',operationIds:['uc-cc-integration','managed-uc-cc-integration'],customerId,allowedMarkets:[...(evidence?.markets||[])].sort(),sameProductPair:['d-ms-workplace-calling','d-cisco-contact-centre'],quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===EXTERNAL_REACH)return {id:'provider-managed-external-reach-v1',kind:'paid-operation',action:'operation',operationId:'managed-external-reach',customerId,allowedMarkets:[evidence.market],scope:'same-market',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===RESILIENCE_RD)return {id:'provider-managed-diverse-upstream-v1',kind:'paid-operation',action:'operation',operationId:'managed-diverse-upstream',customerId,allowedMarkets:[evidence.market],scope:'same-market',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  if(sourceId===LOCAL_CONTINUITY)return {id:'provider-managed-local-spares-v1',kind:'paid-operation',action:'operation',operationId:'managed-local-spares',customerId,allowedMarkets:[evidence.market],scope:'same-market',quoteRequired:true,quoteSource:'SOC.provider.quote'};
  return null;
 }
 function makeReceipt(s,sourceId,name,evidence,hooks){
  if(REGIONAL_SOURCES.includes(sourceId)){evidence=compactRegionalEvidence(evidence);if(!evidence)fail('INVALID_PROVIDER_REGIONAL_EVIDENCE');}
  const summary=collect(evidence),customerIds=summary.customerIds;
  if(!customerIds.length)fail('PROVIDER_PROGRESSION_CUSTOMER_SCOPE_REQUIRED');
  if([IX,LEVEL_THREE].includes(sourceId)&&(!exact(evidence,sourceId===IX?['kind','version','customerId','portfolioId','market','markets','task','interval']:['kind','version','customerId','portfolioId','market','markets','task','capability','interval'])||customerIds.length!==1||customerIds[0]!==evidence.customerId||!Array.isArray(evidence.markets)||!evidence.markets.includes(evidence.market)||!summary.projectIds.length||!summary.postingIds.length))fail('INVALID_UC_CC_PROGRESSION_SOURCE_EVIDENCE');
  if(sourceId===DEDICATED_INTERCONNECT&&(!exact(evidence,['kind','version','sourceId','customerId','portfolioId','tenant','market','projectId','postingId','receipt','from','to','outbound','inbound'])||evidence.kind!=='provider-dedicated-interconnect-proof'||evidence.sourceId!==sourceId||customerIds.length!==1||customerIds[0]!==evidence.customerId||!summary.projectIds.includes(evidence.projectId)||!summary.postingIds.includes(evidence.postingId)||evidence.to>s.clock))fail('INVALID_PROVIDER_DEDICATED_INTERCONNECT_SOURCE_EVIDENCE');
  if(sourceId===CASE_FOLLOWUP&&(!caseFollowupApi().validateEvidence(s,evidence,caseFollowupHooks(s,hooks))||customerIds.length!==1||!summary.jobIds.includes(evidence.jobId)||evidence.interval.to>s.clock))fail('INVALID_PROVIDER_CASE_FOLLOWUP_SOURCE_EVIDENCE');
  if(sourceId===SECURITY&&!securityApi().validateProgressionEvidence(s,evidence,{observeResource:hooks.observeResource}))fail('INVALID_PROVIDER_SECURITY_GOAL_EVIDENCE');
  const bySourceCustomer=new Set();
  for(const value of [evidence.customerId,evidence.sustainable?.customerId,evidence.firstLive?.customerId,evidence.business?.customerId,evidence.business?.supportResponsibility?.customerId,evidence.supportResponsibility?.customerId,...(evidence.customerIds||[])])if(typeof value==='string')bySourceCustomer.add(value);
  if(bySourceCustomer.size>1&&![LEVEL_TWO,LEVEL_FIVE,...REGIONAL_SOURCES].includes(sourceId))fail('PROVIDER_PROGRESSION_CUSTOMER_SCOPE_MISMATCH');
  if(sourceId===FIRST_LIVE&&!exact(evidence,['customerId','portfolioId','from','to','agreementAt','projectIds','postingIds','jobs']))fail('INVALID_PROVIDER_PROGRESSION_SOURCE_EVIDENCE');
  if(sourceId===SUSTAINABLE&&(!exact(evidence,['firstLive','sustainable','supportResponsibility'])||!exact(evidence.firstLive,['customerId','portfolioId','from','to','agreementAt','projectIds','postingIds','jobs'])||!exact(evidence.sustainable,['customerId','interval','period','globalOperatingResultCents','revenuePostingId','costPostingIds'])||!exact(evidence.supportResponsibility,['customerId','role','organisationId','projectId','postingId','effectiveAt','scope','record'])))fail('INVALID_PROVIDER_PROGRESSION_SOURCE_EVIDENCE');
  if(sourceId===NONSTARTER&&(!exact(evidence,['business'])||!exact(evidence.business,['customerId','portfolioId','from','to','agreementAt','projectIds','postingIds','jobs','settlement','supportResponsibility'])||!exact(evidence.business.settlement,['customerId','period','from','to','settledAt','qualified','grossRetailCents','netRetailCents','globalOperatingResultCents','revenuePostingId','costPostingIds'])))fail('INVALID_PROVIDER_PROGRESSION_SOURCE_EVIDENCE');
  if(sourceId===LEVEL_TWO&&(!exact(evidence,['customerIds','markets','interval','minutes','humanJobIds','settlements','supportSamples','stageProjects'])||!(Array.isArray(evidence.supportSamples)||evidence.supportSamples&&typeof evidence.supportSamples==='object')||!Array.isArray(evidence.stageProjects)))fail('INVALID_PROVIDER_PROGRESSION_SOURCE_EVIDENCE');
  if(REGIONAL_SOURCES.includes(sourceId)){const decoded=decodeRegionalEvidence(evidence);if(!decoded||evidence.sourceId!==sourceId||decoded.samples.length!==60||!Array.isArray(evidence.customerIds)||!Array.isArray(evidence.markets))fail('INVALID_PROVIDER_PROGRESSION_SOURCE_EVIDENCE');}
  if(sourceId===EXTERNAL_REACH&&!exact(evidence,['kind','version','customerId','portfolioId','tenant','market','agreementAt','from','to','scenarioVersion','paidProjects','outbound','inbound','meeting','interval']))fail('INVALID_PROVIDER_PROGRESSION_SOURCE_EVIDENCE');
  if(sourceId===RESILIENCE_LN&&!exact(evidence,['kind','version','customerId','portfolioId','market','projectId','postingId','installation','jobId','caseId','phase','interval','basis']))fail('INVALID_PROVIDER_PROGRESSION_SOURCE_EVIDENCE');
  if(sourceId===RESILIENCE_RD&&!exact(evidence,['kind','version','customerId','portfolioId','market','projectId','postingId','jobId','caseId','sequence','settlement','criticalAtClaim','claimedAt','interval','basis']))fail('INVALID_PROVIDER_PROGRESSION_SOURCE_EVIDENCE');
  const customer=s.providerCampaign.customers.find(c=>c.id===customerIds[0]);if([SECURITY,IX,LEVEL_THREE,DEDICATED_INTERCONNECT,CASE_FOLLOWUP,RESILIENCE_LN,RESILIENCE_RD,LOCAL_CONTINUITY].includes(sourceId)){if(!customer||customer.portfolioId!==evidence.portfolioId||customer.market!==evidence.market||!['active','renewal'].includes(customer.status))fail('PROVIDER_PROGRESSION_CUSTOMER_SCOPE_MISMATCH');}else if(![...OWNED_SOURCES,LEVEL_TWO,LEVEL_FIVE,LEVEL_SIX,...REGIONAL_SOURCES].includes(sourceId)&&(customerIds.length!==1||!customer||!customer.retailAgreement||!agreementWasAccepted(s,customer,liveEvidence(evidence).agreementAt)||liveEvidence(evidence).portfolioId!==customer.portfolioId))fail('PROVIDER_PROGRESSION_CUSTOMER_SCOPE_MISMATCH');
  if([...REGIONAL_SOURCES,LEVEL_TWO].includes(sourceId)&&(!customerIds.length||customerIds.some(id=>!s.providerCampaign.customers.some(c=>c.id===id))))fail('PROVIDER_PROGRESSION_CUSTOMER_SCOPE_MISMATCH');
  if([LEVEL_FIVE,LEVEL_SIX].includes(sourceId)&&!centralProgressionApi().validateEvidence(s,sourceId,evidence,hooks,{historical:false}))fail('INVALID_PROVIDER_CENTRAL_SOURCE_EVIDENCE');
  if(OWNED_SOURCES.includes(sourceId)&&!ownedSitesApi().validateEvidence(s,sourceId,evidence.customerId,evidence,hooks.ownedSiteHooks||hooks))fail('INVALID_PROVIDER_OWNED_SITE_EVIDENCE');
  const workProofs=[SECURITY,...OWNED_SOURCES,IX,LEVEL_THREE,EXTERNAL_REACH,DEDICATED_INTERCONNECT,CASE_FOLLOWUP,RESILIENCE_LN,RESILIENCE_RD,LOCAL_CONTINUITY,LEVEL_FIVE,LEVEL_SIX].includes(sourceId)?[]:workProofsFor(s,evidence,hooks),settlementProof=[...OWNED_SOURCES,LEVEL_FIVE,LEVEL_SIX].includes(sourceId)||[SECURITY,DEDICATED_INTERCONNECT,CASE_FOLLOWUP].includes(sourceId)?null:settlementProofFor(s,evidence);
  const record={
   id:`provider-progression-receipt:${sourceId}`,contentVersion:CONTENT,sourceId,name,at:s.clock,
   customerIds,portfolioIds:portfolioIdsFor(s,customerIds),evidenceInterval:summary.evidenceInterval,
   projectIds:summary.projectIds,postingIds:summary.postingIds,jobIds:summary.jobIds,interactionIds:summary.interactionIds,caseIds:summary.caseIds,settlementPeriods:summary.settlementPeriods,
   resourceGenerations:generationsFor(s,customerIds,hooks),workProofs,settlementProof,sourceEvidence:copy(evidence),unlock:unlockFor(sourceId,evidence.customerId||customerIds[0],evidence)
  };
  return seal(record);
 }
 function claim(s,sourceId,hooks={}){
  validate(s,hooks);
  const receiptList=receiptStore(s)?.receipts||[],existing=receiptList.find(x=>x.sourceId===sourceId);
  if(existing)return {state:copy(s),receipt:copy(existing),idempotent:true};
  const eligible=eligibility(s,sourceId,hooks,null,true);if(eligible.status!=='ready')fail(`PROVIDER_PROGRESSION_EVIDENCE_REQUIRED:${(eligible.missing||[]).join('|')}`);
  const next=copy(s),store=next.providerCampaign[FIELD]||empty(),receipt=makeReceipt(next,sourceId,eligible.name,eligible.evidence,hooks);
  store.receipts.push(receipt);next.providerCampaign[FIELD]=store;
  if(sourceId===LEVEL_FIVE){
   const sample=factsApi().sampleSupport(next,hooks);
   next.providerCampaign.centralSupportHistory={version:1,receiptId:receipt.id,at:sample.at,participants:receipt.customerIds.map(customerId=>{const participant=sample.participants.find(p=>p.customerId===customerId);if(!participant?.responsibility)fail('INVALID_PROVIDER_CENTRAL_SUPPORT_HISTORY');return {customerId,responsibility:copy(participant.responsibility)};})};
  }
  validate(next,hooks);
  return {state:next,receipt:copy(receipt),idempotent:false};
 }
 function validWorkProof(s,receipt,proof,item,hooks){
  if(!exact(proof,['customerId','jobId','arrivalEventId','periodIndex','channel','arrivalAt','completedAt','deadlineAt','status','contextRetained','interactionId','caseId','interaction','assignment','case'])||!receipt.customerIds.includes(proof.customerId)||proof.customerId!==item.customerId||proof.jobId!==item.jobId||proof.interactionId!==item.interactionId||proof.caseId!==item.caseId||proof.channel!==item.channel||!/^provider-job-[1-9]\d*$/.test(proof.jobId)||!/^provider-event-[1-9]\d*$/.test(proof.arrivalEventId)||!/^interaction-[1-9]\d*$/.test(proof.interactionId)||!id(proof.caseId)||!integer(proof.periodIndex)||!integer(proof.arrivalAt)||!integer(proof.completedAt)||!integer(proof.deadlineAt)||proof.completedAt<proof.arrivalAt||proof.completedAt>receipt.at||!['completed','late'].includes(proof.status)||proof.contextRetained!==true)return false;
  const customer=s.providerCampaign.customers.find(x=>x.id===proof.customerId),root=customer&&rootFor(s,customer,hooks),job=s.providerCampaign.jobs.find(x=>x.id===proof.jobId),interaction=root?.interactions?.find(x=>x.id===proof.interactionId),caseRecord=root?.cases?.[proof.caseId],assignment=interaction&&root.workforceOps?.assignments?.find(x=>x.interaction===proof.interactionId&&x.person===proof.assignment?.person&&x.status==='complete');
  if(job){if(job.customerId!==proof.customerId||job.periodIndex!==proof.periodIndex||job.channel!==proof.channel||job.arrivalAt!==proof.arrivalAt||job.completedAt!==proof.completedAt||job.deadlineAt!==proof.deadlineAt||job.status!==proof.status||job.interactionId!==proof.interactionId||job.caseId!==proof.caseId||job.contextRetained!==true)return false;}
  else{const n=Number(proof.jobId.slice('provider-job-'.length));if(!integer(n,1)||n>=s.providerCampaign.nextJob||!integer(s.providerCampaign.jobCheckpoint?.pruned,1)||proof.periodIndex>=Math.floor(s.clock/60))return false;}
  if(!exact(proof.interaction,['phase','probe','botAnswered','startedAt','finishedAt','channel','caseId','context','agent','assignmentId'])||proof.interaction.phase!=='resolved'||proof.interaction.probe!==false||proof.interaction.botAnswered!==false||!id(proof.interaction.agent)||proof.interaction.channel!==proof.channel||proof.interaction.caseId!==proof.caseId||proof.interaction.context!==true||proof.interaction.finishedAt!==proof.completedAt||!integer(proof.interaction.startedAt)||proof.interaction.startedAt>proof.interaction.finishedAt||!id(proof.interaction.assignmentId))return false;
  if(interaction){if(interaction.phase!==proof.interaction.phase||interaction.probe===true||interaction.botAnswered===true||interaction.channel!==proof.channel||interaction.caseId!==proof.caseId||interaction.context!==true||interaction.finishedAt!==proof.completedAt||interaction.startedAt!==proof.interaction.startedAt||interaction.agent!==proof.interaction.agent||interaction.workforceAssignment!==proof.interaction.assignmentId)return false;}
  else{const n=Number(proof.interactionId.slice('interaction-'.length));if(!integer(n,1)||n>(root?.tracePrunedThrough||0)||n>(root?.providerArchive?.throughInteractionId||0)||!integer(root?.providerArchive?.interactions,1))return false;}
  const event=s.providerCampaign.events.find(x=>x.id===proof.arrivalEventId),origin=event?null:typeof hooks.supportWorkOrigin==='function'?hooks.supportWorkOrigin(s,proof.customerId,interaction||proof.interaction,receipt.at):null;
  if(event){if(event.code!=='CUSTOMER_WORK_ARRIVED'||event.customerId!==proof.customerId||event.jobId!==proof.jobId||event.interactionId!==proof.interactionId||event.caseId!==proof.caseId||event.channel!==proof.channel||event.at!==proof.arrivalAt||event.deadlineAt!==proof.deadlineAt)return false;}
  else if(origin){if(origin.id!==proof.arrivalEventId||origin.code!=='CUSTOMER_WORK_ARRIVED'||origin.customerId!==proof.customerId||origin.jobId!==proof.jobId||origin.interactionId!==proof.interactionId||origin.caseId!==proof.caseId||origin.channel!==proof.channel||origin.at!==proof.arrivalAt||origin.deadlineAt!==proof.deadlineAt)return false;}
  else return false; // An eviction counter cannot prove the identity or contents of a missing arrival.
  if(caseRecord){if(caseRecord.tenant!==root.tenant||!caseRecord.interactions?.includes(proof.interactionId)||!proof.case.interactions?.includes(proof.interactionId)||proof.case.tenant!==caseRecord.tenant)return false;}else{const n=Number(proof.interactionId.slice('interaction-'.length));if(!integer(n,1)||n>(root?.tracePrunedThrough||0)||n>(root?.providerArchive?.throughInteractionId||0)||!integer(root?.providerArchive?.cases,1)||proof.case.tenant!==root.tenant||!proof.case.interactions?.includes(proof.interactionId))return false;}
  if(!exact(proof.assignment,['id','interaction','person','status','skill','language','startedAt','wrapUntil','personSnapshot'])||proof.assignment.interaction!==proof.interaction.assignmentId||proof.assignment.interaction!==proof.interactionId||proof.assignment.person!==proof.interaction.agent||proof.assignment.status!=='complete'||!proof.assignment.personSnapshot?.skills?.includes('service'))return false;
  if(assignment){if(assignment.id!==proof.assignment.id||assignment.status!=='complete'||assignment.person!==proof.assignment.person||assignment.personSnapshot?.id!==proof.assignment.person||!assignment.personSnapshot?.skills?.includes('service'))return false;}
  else if(interaction&&(!root.providerArchive||!integer(root.providerArchive.assignments,1)||proof.assignment.personSnapshot?.id!==proof.assignment.person||!proof.assignment.personSnapshot.skills?.includes('service')))return false;
  return true;
 }
 function regionalSettlementValid(s,customer,q){
  if(!exact(q,['period','from','to','settledAt','qualified','operatingResultCents','revenuePostingId','costPostingIds'])||!integer(q.period)||!integer(q.from)||!integer(q.to)||q.to-q.from!==60||q.settledAt!==q.to||typeof q.qualified!=='boolean'||!Number.isSafeInteger(q.operatingResultCents)||!id(q.revenuePostingId)||!Array.isArray(q.costPostingIds)||!q.costPostingIds.length||q.costPostingIds.some(x=>!id(x)))return false;
  const history=customer.history?.find(x=>x.period===q.period&&x.from===q.from&&x.to===q.to&&x.settledAt===q.settledAt),global=s.providerCampaign.periodHistory?.find(x=>x.period===q.period&&x.from===q.from&&x.to===q.to&&x.settledAt===q.settledAt),revenue=s.business?.ledger?.find(x=>x.id===q.revenuePostingId),costs=q.costPostingIds.map(id=>s.business?.ledger?.find(x=>x.id===id));
  if(history&&(history.basis!=='provider-period-history-v1'||history.fullPeriod!==true||history.qualified!==q.qualified||history.grossRetail!==revenue?.cents||history.to-history.from!==60))return false;
  if(!history&&!(customer.historyCheckpoint?.periods>q.period))return false;
  if(global&&global.operatingResult!==q.operatingResultCents)return false;
  if(!global&&!(s.providerCampaign.historyCheckpoint?.periods>q.period))return false;
  if(revenue&&(revenue.category!=='revenue'||revenue.reason!=='provider-customer-period'||revenue.customerId!==customer.id||revenue.period!==q.period||revenue.at!==q.settledAt||!integer(revenue.cents,1)))return false;
  if(!revenue&&Number(q.revenuePostingId.slice('entry-'.length))>(s.business?.ledgerPrunedThrough||0))return false;
  for(const row of costs)if(row&&(row.category!=='cost'||row.customerId!==customer.id||row.period!==q.period||row.at!==q.settledAt||!['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'].includes(row.reason)))return false;
  return !costs.some((x,i)=>!x&&Number(q.costPostingIds[i].slice('entry-'.length))>(s.business?.ledgerPrunedThrough||0));
 }
 function verifyRegionalReferences(s,receipt,hooks={}){
  const evidence=receipt.sourceEvidence,A=factsApi();let samples;try{samples=regionalSamples(evidence?.supportSamples);}catch{return false;}const window=A.qualifySupportWindow(samples);
  if(!exact(evidence,['customerIds','markets','interval','minutes','humanJobIds','settlements','supportSamples','stageProjects'])||window.status!=='ready'||receipt.at!==samples.at(-1)?.at||!same(evidence.customerIds,window.evidence.customerIds)||!same(evidence.markets,window.evidence.markets)||!same(evidence.interval,window.evidence.interval)||evidence.minutes!==60||!same(evidence.humanJobIds,window.evidence.humanJobIds)||!same(evidence.settlements,window.evidence.settlements)||!same(receipt.customerIds,evidence.customerIds)||!same(receipt.unlock,unlockFor(LEVEL_TWO,receipt.customerIds[0],evidence))||receipt.settlementProof!==null)return false;
  const prior=receiptStore(s)?.receipts?.find(x=>x.sourceId===SUSTAINABLE);if(!prior||!receipt.customerIds.includes(prior.customerIds[0]))return false;
  if(!same(receipt.portfolioIds,portfolioIdsFor(s,receipt.customerIds)))return false;
  const expectedStages=[];
  for(const customerId of receipt.customerIds){
   const customer=s.providerCampaign.customers.find(x=>x.id===customerId),root=customer&&rootFor(s,customer,hooks);if(!customer||!root||root.providerCustomer?.id!==customer.id||root.providerCampaign||!integer(customer.activatedAt)||customer.activatedAt>samples[0].at||customer.exitAt!==null&&customer.exitAt!==undefined&&(!integer(customer.exitAt)||customer.exitAt<receipt.at))return false;
   for(const stageId of ['base','carrier','partner']){const stage=customer.stages?.[stageId],project=stage&&s.providerCampaign.projects.find(x=>x.id===stage.projectId&&x.customerId===customer.id&&x.kind==='stage'&&x.stage===stageId&&x.status==='complete'&&stage.status==='effective');if(!project||project.completedAt>samples[0].at)return false;expectedStages.push({customerId,stageId,projectId:project.id,postingId:project.postingId});const posting=s.business?.ledger?.find(x=>x.id===project.postingId);if(posting&&(posting.category!=='cost'||posting.cents!==project.setupCents||posting.customerId!==customer.id||posting.projectId!==project.id||posting.reason!=='provider-implementation'))return false;if(!posting&&Number(project.postingId.slice('entry-'.length))>(s.business?.ledgerPrunedThrough||0))return false;}
   const expectedResources=['base','carrier','partner'].flatMap(id=>customer.stages[id].resources||[]).sort(),saved=receipt.resourceGenerations.filter(x=>x.customerId===customer.id).sort((a,b)=>a.resourceId.localeCompare(b.resourceId));if(!same(saved.map(x=>x.resourceId),expectedResources)||saved.some(x=>!integer(x.generation,1)||!integer(root.resources?.[x.resourceId]?.generation,1)||root.resources[x.resourceId].generation<x.generation))return false;
  }
  if(!same(evidence.stageProjects,expectedStages))return false;
  for(const sample of samples)for(const participant of sample.participants){
   const customer=s.providerCampaign.customers.find(x=>x.id===participant.customerId),root=customer&&rootFor(s,customer,hooks);if(!customer||!root||customer.market!==participant.market||root.tenant!==participant.tenant||!participant.eligible||participant.missing.length||participant.responsibility?.role!=='msp'||participant.responsibility?.organisationId!=='orchard-msp'||participant.responsibility.customerId!==customer.id)return false;
   const responsibilityProject=s.providerCampaign.projects.find(x=>x.id===participant.responsibility.projectId&&x.postingId===participant.responsibility.postingId&&x.customerId===customer.id&&x.kind==='stage'&&x.stage==='partner'&&x.status==='complete'&&x.completedAt<=sample.at);if(!responsibilityProject)return false;
   for(const boundary of participant.boundaries){const review=s.providerCampaign.projects.find(x=>x.customerId===customer.id&&x.operationId==='service-boundary-review'&&x.status==='complete'&&x.operationReceipt?.kind==='service-boundary'&&x.operationReceipt.plan?.boundaryContract?.id===boundary.id&&x.operationReceipt.plan?.boundaryGeneration===boundary.generation&&x.completedAt<=sample.at);if(!review)return false;}
   for(const q of participant.settlements)if(!regionalSettlementValid(s,customer,q))return false;
  }
  const items=regionalWorkItems(evidence),ids=[...new Set(items.map(x=>x.jobId))].sort();if(!same(ids,evidence.humanJobIds)||receipt.workProofs.length!==items.length)return false;
  for(const item of items){const proof=receipt.workProofs.find(x=>x.jobId===item.jobId&&x.customerId===item.customerId);if(!proof||!validWorkProof(s,receipt,proof,item,hooks))return false;}
  return true;
 }
 function verifyUcCcReferences(s,receipt,hooks={}){
  const sourceId=receipt.sourceId,e=receipt.sourceEvidence,api=ucCcApi(),c=s.providerCampaign.customers.find(x=>x.id===receipt.customerIds[0]);
  const evidenceKeys=sourceId===IX?['kind','version','customerId','portfolioId','market','markets','task','interval']:['kind','version','customerId','portfolioId','market','markets','task','capability','interval'];
  if(!exact(e,evidenceKeys)||!c||receipt.customerIds.length!==1||receipt.name!==NAMES[sourceId]||!receipt.portfolioIds.includes(c.portfolioId)||e.customerId!==c.id||e.portfolioId!==c.portfolioId||!Array.isArray(e.markets)||!e.markets.includes(e.market)||e.interval?.from!==e.task?.test?.at||sourceId===IX&&e.interval?.to!==e.task?.quality?.completedAt||sourceId===LEVEL_THREE&&e.interval?.to!==e.capability?.interval?.to||e.interval?.to>receipt.at)return false;
  const project=s.providerCampaign.projects.find(x=>x.id===e.task?.projectId&&x.customerId===c.id&&x.kind==='operation'&&api.OPERATION_IDS.includes(x.operationId)&&x.status==='complete');
  if(!project||project.postingId!==e.task.postingId||e.task.version!==api.VERSION||e.task.customerId!==c.id||e.task.projectId!==project.id||e.task.postingId!==project.postingId||e.task.tenant!==e.task.interaction?.tenant||e.task.job?.channel!=='voice'||e.task.interaction?.phase!=='resolved'||e.task.interaction?.caseId!==e.task.job?.caseId||e.task.case?.id!==e.task.job?.caseId||e.task.recording?.interaction!==e.task.interaction.id||e.task.quality?.interactionId!==e.task.interaction.id||e.task.quality?.caseId!==e.task.case.id||e.task.quality?.recordingId!==e.task.recording.id||e.task.quality?.completedAt>receipt.at||e.task.quality?.reviewAt>receipt.at||e.task.job?.completedAt>receipt.at)return false;
  if(!paidPosting(s,project,'provider-operation'))return false;
  const quality=s.providerCampaign.projects.find(x=>x.id===e.task.quality?.projectId&&x.postingId===e.task.quality?.postingId&&x.customerId===c.id&&x.kind==='operation'&&x.operationId==='quality'&&x.status==='complete'&&x.acceptedAt===e.task.quality.acceptedAt&&x.completedAt===e.task.quality.completedAt);
  if(!quality||!paidPosting(s,quality,'provider-operation'))return false;
  const taskHooks=integrationHooks(s,c,hooks);
  if(!api.validateRetainedTaskEvidence(s,project.id,e.task))return false;
  if(sourceId===LEVEL_THREE){
   if(!factsApi().validateUcCcCapabilityEvidence(s,c.id,e.task,e.capability,hooks,{historical:true,at:receipt.at}))return false;
  }
  return true;
 }
 function verifyReferences(s,receipt,hooks={}){
  if(receipt.sourceId===SECURITY){const e=receipt.sourceEvidence;return receipt.name===NAMES[SECURITY]&&receipt.customerIds.length===1&&same(receipt.customerIds,[e.customerId])&&same(receipt.portfolioIds,[e.portfolioId])&&receipt.workProofs.length===0&&receipt.settlementProof===null&&securityApi().validateProgressionEvidence(s,e,{historical:true,claimedAt:receipt.at});}
  if(OWNED_SOURCES.includes(receipt.sourceId)){const e=receipt.sourceEvidence;return ['provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)&&receipt.name===OWNED_NAMES[OWNED_SOURCES.indexOf(receipt.sourceId)]&&receipt.workProofs.length===0&&receipt.settlementProof===null&&e.asOf===receipt.at&&same(receipt.portfolioIds,portfolioIdsFor(s,receipt.customerIds))&&ownedSitesApi().validateEvidence(s,receipt.sourceId,e.customerId,e,hooks.ownedSiteHooks||hooks,{historical:true});}
  if([LEVEL_FIVE,LEVEL_SIX].includes(receipt.sourceId)){const e=receipt.sourceEvidence;return ['provider-campaigns-6','provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)&&receipt.name===NAMES[receipt.sourceId]&&receipt.workProofs.length===0&&receipt.settlementProof===null&&e.interval?.to<=receipt.at&&receipt.at<=s.clock&&same(receipt.portfolioIds,portfolioIdsFor(s,receipt.customerIds))&&centralProgressionApi().validateEvidence(s,receipt.sourceId,e,hooks,{historical:true,claimedAt:receipt.at});}
  if(receipt.sourceId===CASE_FOLLOWUP){const e=receipt.sourceEvidence,c=s.providerCampaign.customers.find(row=>row.id===receipt.customerIds[0]);return !!c&&receipt.name===NAMES[CASE_FOLLOWUP]&&receipt.customerIds.length===1&&same(receipt.portfolioIds,[c.portfolioId])&&e.customerId===c.id&&e.portfolioId===c.portfolioId&&e.market===c.market&&e.interval?.to<=receipt.at&&receipt.workProofs.length===0&&receipt.settlementProof===null&&caseFollowupApi().validateEvidence(s,e,caseFollowupHooks(s,hooks));}
  if(receipt.sourceId===DEDICATED_INTERCONNECT){const e=receipt.sourceEvidence,customer=s.providerCampaign.customers.find(row=>row.id===receipt.customerIds[0]),api=dedicatedInterconnectApi();return !!customer&&receipt.name===NAMES[DEDICATED_INTERCONNECT]&&receipt.customerIds.length===1&&receipt.portfolioIds.length===1&&receipt.portfolioIds[0]===customer.portfolioId&&e.customerId===customer.id&&e.portfolioId===customer.portfolioId&&e.market===customer.market&&e.to<=receipt.at&&receipt.workProofs.length===0&&receipt.settlementProof===null&&api.validateEvidence(s,customer.id,e,dedicatedInterconnectHooks(s,hooks),{historical:true});}
  if(receipt.sourceId===IX||receipt.sourceId===LEVEL_THREE)return verifyUcCcReferences(s,receipt,hooks);
  if(receipt.sourceId===LEVEL_TWO)return verifyRegionalReferences(s,receipt,hooks);
  if(REGIONAL_SOURCES.includes(receipt.sourceId)){
   const evidence=receipt.sourceEvidence,decoded=decodeRegionalEvidence(evidence),support=regionalSupportApi();
   if(!decoded||s.providerCampaign.contentVersion!=='provider-campaigns-8'||receipt.name!==NAMES[receipt.sourceId]||receipt.customerIds.length!==evidence.customerIds?.length||!same(receipt.customerIds,evidence.customerIds)||!same(receipt.portfolioIds,portfolioIdsFor(s,receipt.customerIds))||receipt.evidenceInterval?.from!==evidence.interval?.from||receipt.evidenceInterval?.to!==evidence.interval?.to||receipt.workProofs.length===0||receipt.settlementProof!==null||!support.validateEvidence(s,receipt.sourceId,decoded,hooks,{historical:true}))return false;
   const items=regionalWorkItems(decoded);
   if(!items.length||receipt.workProofs.length!==items.length)return false;
   for(const item of items){const proof=receipt.workProofs.find(x=>x.jobId===item.jobId&&x.customerId===item.customerId);if(!proof||!validWorkProof(s,receipt,proof,item,hooks))return false;}
   return true;
  }
  if(receipt.sourceId===EXTERNAL_REACH){const e=receipt.sourceEvidence,customer=s.providerCampaign.customers.find(row=>row.id===receipt.customerIds[0]);return !!customer&&receipt.name===NAMES[EXTERNAL_REACH]&&receipt.customerIds.length===1&&receipt.portfolioIds.length===1&&receipt.portfolioIds[0]===customer.portfolioId&&e.customerId===customer.id&&e.portfolioId===customer.portfolioId&&e.market===customer.market&&e.agreementAt<=e.from&&e.to<=receipt.at&&receipt.at<=s.clock&&receipt.workProofs.length===0&&receipt.settlementProof===null&&externalReachApi().validateEvidence(s,customer.id,e,hooks,{historical:true,at:receipt.at});}
  if(receipt.sourceId===RESILIENCE_LN||receipt.sourceId===RESILIENCE_RD){const e=receipt.sourceEvidence,customer=s.providerCampaign.customers.find(row=>row.id===receipt.customerIds[0]);return !!customer&&receipt.name===NAMES[receipt.sourceId]&&receipt.customerIds.length===1&&receipt.portfolioIds.length===1&&receipt.portfolioIds[0]===customer.portfolioId&&e.customerId===customer.id&&e.portfolioId===customer.portfolioId&&e.market===customer.market&&e.interval?.to<=receipt.at&&receipt.workProofs.length===0&&receipt.settlementProof===null&&resilienceProgressionApi().validateEvidence(s,receipt.sourceId,customer.id,e,hooks,{historical:true,at:receipt.at});}
  if(receipt.sourceId===LOCAL_CONTINUITY){const e=receipt.sourceEvidence,customer=s.providerCampaign.customers.find(row=>row.id===receipt.customerIds[0]);return !!customer&&receipt.name===NAMES[LOCAL_CONTINUITY]&&receipt.customerIds.length===1&&receipt.portfolioIds.length===1&&receipt.portfolioIds[0]===customer.portfolioId&&e.customerId===customer.id&&e.portfolioId===customer.portfolioId&&e.market===customer.market&&e.kind==='provider-local-speech'&&e.interval?.to<=receipt.at&&receipt.workProofs.length===0&&receipt.settlementProof===null&&localProgressionApi().validateEvidence(s,customer.id,e,hooks,{historical:true,claimedAt:receipt.at});}
  const customers=s.providerCampaign.customers||[],customerIds=receipt.customerIds,customer=customers.find(c=>c.id===customerIds[0]),live=liveEvidence(receipt.sourceEvidence);
  if(!supportedPredicate(receipt.sourceId)||receipt.name!==NAMES[receipt.sourceId]||customerIds.length!==1||!customer||!receipt.portfolioIds.includes(customer.portfolioId)||live.customerId!==customer.id||live.portfolioId!==customer.portfolioId||!agreementWasAccepted(s,customer,live.agreementAt)||live.agreementAt>live.from||live.from>live.to||live.to>receipt.at||!Array.isArray(live.jobs)||live.jobs.length!==2||new Set(live.jobs.map(x=>x.channel)).size!==2||!live.jobs.some(x=>x.channel==='voice')||!live.jobs.some(x=>x.channel==='message'))return false;
  if(!Array.isArray(live.projectIds)||live.projectIds.length!==3||!Array.isArray(live.postingIds)||live.postingIds.length!==3)return false;
  const expectedProjects=[],expectedResourceIds=[];
  for(const stageId of ['base','carrier','partner']){
   const stage=customer.stages?.[stageId],project=stage&&s.providerCampaign.projects.find(x=>x.id===stage.projectId&&x.customerId===customer.id&&x.kind==='stage'&&x.stage===stageId);
   if(!stage||stage.status!=='effective'||!project||project.status!=='complete'||!integer(project.completedAt)||project.completedAt>receipt.at||!live.projectIds.includes(project.id)||!live.postingIds.includes(project.postingId))return false;
   expectedProjects.push(project.id);expectedResourceIds.push(...(stage.resources||[]));
   const posting=s.business?.ledger?.find(x=>x.id===project.postingId);
   if(posting&&(posting.category!=='cost'||posting.cents!==project.setupCents||posting.customerId!==customer.id||posting.projectId!==project.id||posting.reason!=='provider-implementation'))return false;
   if(!posting&&Number(project.postingId.slice('entry-'.length))>(s.business?.ledgerPrunedThrough||0))return false;
  }
  if(JSON.stringify(expectedProjects.sort())!==JSON.stringify([...live.projectIds].sort()))return false;
  const expectedGenerations=expectedResourceIds.sort(),savedGenerations=receipt.resourceGenerations.filter(x=>x.customerId===customer.id).map(x=>x.resourceId).sort();
  if(JSON.stringify(expectedGenerations)!==JSON.stringify(savedGenerations))return false;
  const root=rootFor(s,customer,hooks);if(!root||root.providerCustomer?.id!==customer.id||root.providerCustomer?.version!==1||root.providerCampaign)return false;
  for(const generation of receipt.resourceGenerations){const resource=root.resources?.[generation.resourceId];if(!resource||!integer(generation.generation,1)||!integer(resource.generation,1)||resource.generation<generation.generation)return false;}
  if(!Array.isArray(receipt.workProofs)||receipt.workProofs.length!==live.jobs.length)return false;
  for(const item of live.jobs){const scoped={...item,customerId:customer.id},proof=receipt.workProofs.find(x=>x.jobId===item.jobId);if(!proof||!validWorkProof(s,receipt,proof,scoped,hooks))return false;}
  const times=receipt.workProofs;
  if(Math.min(...times.map(x=>x.arrivalAt))!==live.from||Math.max(...times.map(x=>x.completedAt))!==live.to)return false;
  for(const postingId of receipt.postingIds){const posting=s.business?.ledger?.find(x=>x.id===postingId);if(posting&&posting.customerId&&!customerIds.includes(posting.customerId))return false;if(!posting&&Number(postingId.slice('entry-'.length))>(s.business?.ledgerPrunedThrough||0))return false;}
  if(receipt.sourceId===SUSTAINABLE||receipt.sourceId===NONSTARTER){
   const business=receipt.sourceId===NONSTARTER?receipt.sourceEvidence.business:null;
   const proof=receipt.settlementProof,sustain=receipt.sourceEvidence.sustainable;
   const expected=receipt.sourceId===SUSTAINABLE?sustain:business?.settlement,expectedFrom=expected?.interval?.from??expected?.from,expectedTo=expected?.interval?.to??expected?.to;
   if(!proof||!exact(proof,['customerId','period','from','to','settledAt','qualified','grossRetailCents','netRetailCents','globalOperatingResultCents','revenuePostingId','costPostingIds'])||proof.customerId!==customer.id||proof.period!==expected?.period||proof.from!==expectedFrom||proof.to!==expectedTo||proof.settledAt!==proof.to||proof.qualified!==true||receipt.sourceId===SUSTAINABLE&&proof.globalOperatingResultCents<=0||proof.globalOperatingResultCents!==expected.globalOperatingResultCents||proof.revenuePostingId!==expected.revenuePostingId||JSON.stringify(proof.costPostingIds)!==JSON.stringify([...expected.costPostingIds].sort())||receipt.sourceId===NONSTARTER&&(proof.to>receipt.at||receipt.at-proof.to>60))return false;
   const history=customer.history?.find(x=>x.period===proof.period&&x.from===proof.from&&x.to===proof.to),global=s.providerCampaign.periodHistory?.find(x=>x.period===proof.period&&x.from===proof.from&&x.to===proof.to),revenue=s.business?.ledger?.find(x=>x.id===proof.revenuePostingId),costs=proof.costPostingIds.map(x=>s.business?.ledger?.find(y=>y.id===x));
   if(history&&(history.fullPeriod!==true||history.qualified!==true||history.to-history.from!==60||history.settledAt!==proof.settledAt||history.grossRetail!==proof.grossRetailCents||history.netRetail!==proof.netRetailCents))return false;
   if(!history&&!(customer.historyCheckpoint?.periods>proof.period))return false;
   if(global&&(global.operatingResult!==proof.globalOperatingResultCents||global.settledAt!==proof.settledAt))return false;
   if(!global&&!(s.providerCampaign.historyCheckpoint?.periods>proof.period))return false;
   if(revenue&&(revenue.customerId!==customer.id||revenue.period!==proof.period||revenue.at!==proof.settledAt||revenue.category!=='revenue'||revenue.reason!=='provider-customer-period'||revenue.cents!==proof.grossRetailCents))return false;
   if(!revenue&&Number(proof.revenuePostingId.slice('entry-'.length))>(s.business?.ledgerPrunedThrough||0))return false;
   for(const cost of costs)if(cost&&(cost.customerId!==customer.id||cost.period!==proof.period||cost.at!==proof.settledAt||cost.category!=='cost'||!['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'].includes(cost.reason)))return false;
   if(costs.some((x,index)=>!x&&Number(proof.costPostingIds[index].slice('entry-'.length))>(s.business?.ledgerPrunedThrough||0)))return false;
   if(receipt.sourceId===NONSTARTER){
    const support=business.supportResponsibility,record=support,rows=record?.evidence?.stageProjects,workforce=record?.evidence?.sharedWorkforce;
    if(!exact(support,['version','id','role','organisationId','customerId','scope','acceptedAt','effectiveAt','expiresAt','projectId','postingId','terms','evidence'])||support.version!==1||support.role!=='msp'||support.organisationId!=='orchard-msp'||support.customerId!==customer.id||support.acceptedAt!==(customer.customerAcceptedAt??customer.retailAgreement.at)||support.effectiveAt>proof.to||support.expiresAt!==null||!id(support.projectId)||!id(support.postingId)||!Array.isArray(support.scope)||!exact(support.terms,['setupCents','periodCents','engineers','support'])||!['setupCents','periodCents','engineers','support'].every(k=>integer(support.terms[k]))||support.terms.support<1||!Array.isArray(rows)||rows.length!==3||!exact(workforce,['engineers','support','personMinutes','billedMinutes'])||!['engineers','support','personMinutes','billedMinutes'].every(k=>integer(workforce[k]))||workforce.support<1||workforce.personMinutes<1||workforce.billedMinutes<1||s.providerCampaign.payroll.personMinutes<workforce.personMinutes||s.providerCampaign.payroll.billedMinutes<workforce.billedMinutes)return false;
    const projects=['base','carrier','partner'].map(stageId=>customer.stages?.[stageId]&&s.providerCampaign.projects.find(x=>x.id===customer.stages[stageId].projectId&&x.customerId===customer.id&&x.kind==='stage'&&x.stage===stageId&&x.status==='complete'));
    if(projects.some(x=>!x)||support.projectId!==projects[2].id||support.postingId!==projects[2].postingId||JSON.stringify(rows)!==JSON.stringify(projects.map((x,i)=>({stageId:['base','carrier','partner'][i],projectId:x.id,postingId:x.postingId})))||support.terms.setupCents!==projects.reduce((n,x)=>n+x.setupCents,0)||support.terms.periodCents!==projects.reduce((n,x)=>n+x.periodCents,0)||support.effectiveAt!==Math.max(...projects.map(x=>x.completedAt))||!support.scope.length||support.scope.some(x=>!root.resources?.[x]))return false;
   }
  }else if(receipt.settlementProof!==null)return false;
  return true;
 }
 function exactReceipt(r){return r&&Object.keys(r).sort().join(',')==='at,caseIds,contentVersion,customerIds,evidenceInterval,id,integrity,interactionIds,jobIds,name,portfolioIds,postingIds,projectIds,resourceGenerations,settlementPeriods,settlementProof,sourceEvidence,sourceId,unlock,workProofs';}
 function validate(s,hooks={}){
  if(!s?.providerCampaign)fail('PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED');
  const store=receiptStore(s),supportHistory=s.providerCampaign.centralSupportHistory;
  if(store===undefined){if(supportHistory!==undefined)fail('INVALID_PROVIDER_CENTRAL_SUPPORT_HISTORY');return true;}
  if(!store||Object.keys(store).sort().join(',')!=='contentVersion,pack,receipts,version'||store.pack!==PACK||store.version!==VERSION||store.contentVersion!==CONTENT||!Array.isArray(store.receipts)||store.receipts.length>32)fail('INVALID_PROVIDER_PROGRESSION_RECEIPTS');
  const centralReceipt=store.receipts.find(r=>r?.sourceId===LEVEL_FIVE);
  if(centralReceipt){
   if(!exact(supportHistory,['version','receiptId','at','participants'])||supportHistory.version!==1||supportHistory.receiptId!==centralReceipt.id||supportHistory.at!==centralReceipt.at||!Array.isArray(supportHistory.participants)||!same(supportHistory.participants.map(p=>p?.customerId),centralReceipt.customerIds)||supportHistory.participants.some(p=>!exact(p,['customerId','responsibility'])||!p.responsibility))fail('INVALID_PROVIDER_CENTRAL_SUPPORT_HISTORY');
  }else if(supportHistory!==undefined)fail('INVALID_PROVIDER_CENTRAL_SUPPORT_HISTORY');
  const seen=new Set(),ids=new Set();
  for(const receipt of store.receipts){
   if(!exactReceipt(receipt)||!knownIds().includes(receipt.sourceId)||seen.has(receipt.sourceId)||ids.has(receipt.id)||receipt.id!==`provider-progression-receipt:${receipt.sourceId}`||receipt.contentVersion!==CONTENT||!integer(receipt.at)||receipt.at>s.clock||typeof receipt.name!=='string'||!receipt.name||!Array.isArray(receipt.customerIds)||!receipt.customerIds.length||receipt.customerIds.some(x=>!id(x))||JSON.stringify([...new Set(receipt.customerIds)].sort())!==JSON.stringify(receipt.customerIds)||!Array.isArray(receipt.portfolioIds)||receipt.portfolioIds.some(x=>!id(x))||JSON.stringify([...new Set(receipt.portfolioIds)].sort())!==JSON.stringify(receipt.portfolioIds)||!Array.isArray(receipt.projectIds)||receipt.projectIds.some(x=>!id(x))||!Array.isArray(receipt.postingIds)||receipt.postingIds.some(x=>!id(x))||!Array.isArray(receipt.jobIds)||receipt.jobIds.some(x=>!id(x))||!Array.isArray(receipt.interactionIds)||receipt.interactionIds.some(x=>!id(x))||!Array.isArray(receipt.caseIds)||receipt.caseIds.some(x=>!id(x))||!Array.isArray(receipt.settlementPeriods)||receipt.settlementPeriods.some(x=>!integer(x))||!Array.isArray(receipt.resourceGenerations)||!receipt.sourceEvidence||JSON.stringify(receipt.unlock)!==JSON.stringify(unlockFor(receipt.sourceId,receipt.sourceEvidence.customerId||receipt.customerIds[0],receipt.sourceEvidence))||!receipt.evidenceInterval&&receipt.sourceId===FIRST_LIVE||receipt.evidenceInterval&&(!integer(receipt.evidenceInterval.from)||!integer(receipt.evidenceInterval.to)||receipt.evidenceInterval.to<receipt.evidenceInterval.from)||receipt.integrity!==digest(withoutDigest(receipt))||!verifyReferences(s,receipt,hooks))fail('INVALID_PROVIDER_PROGRESSION_RECEIPT');
   const summary=collect(receipt.sourceEvidence);
   if(JSON.stringify(summary.customerIds)!==JSON.stringify(receipt.customerIds)||JSON.stringify(summary.projectIds)!==JSON.stringify(receipt.projectIds)||JSON.stringify(summary.postingIds)!==JSON.stringify(receipt.postingIds)||JSON.stringify(summary.jobIds)!==JSON.stringify(receipt.jobIds)||JSON.stringify(summary.interactionIds)!==JSON.stringify(receipt.interactionIds)||JSON.stringify(summary.caseIds)!==JSON.stringify(receipt.caseIds)||JSON.stringify(summary.settlementPeriods)!==JSON.stringify(receipt.settlementPeriods)||JSON.stringify(summary.evidenceInterval)!==JSON.stringify(receipt.evidenceInterval))fail('INVALID_PROVIDER_PROGRESSION_RECEIPT_EVIDENCE');
   seen.add(receipt.sourceId);ids.add(receipt.id);
  }
  if((seen.has(SUSTAINABLE)||seen.has(LEVEL_TWO))&&!seen.has(FIRST_LIVE))fail('INVALID_PROVIDER_PROGRESSION_RECEIPT_ORDER');
  if(seen.has(LEVEL_TWO)&&!seen.has(SUSTAINABLE))fail('INVALID_PROVIDER_PROGRESSION_RECEIPT_ORDER');
  if(seen.has(LEVEL_THREE)&&(!seen.has(LEVEL_TWO)||!seen.has(IX)))fail('INVALID_PROVIDER_PROGRESSION_RECEIPT_ORDER');
  return true;
 }
 function unlockProposal(s,sourceId,hooks={}){validate(s,hooks);return unlockProposalValidated(s,sourceId,hooks);}
 function unlockProposalValidated(s,sourceId,hooks){
  if(![SECURITY,SUSTAINABLE,NONSTARTER,LEVEL_TWO,REGIONAL_C3,REGIONAL_C5,REGIONAL_T2,REGIONAL_L7,IX,LEVEL_THREE,EXTERNAL_REACH,DEDICATED_INTERCONNECT,CASE_FOLLOWUP,RESILIENCE_RD,LOCAL_CONTINUITY,LEVEL_FIVE,LEVEL_SIX].includes(sourceId))return {sourceId,status:'unavailable',missing:['NO_COSTED_UNLOCK_AUTHORED_FOR_SOURCE'],quotes:[]};
  const receipt=receiptStore(s)?.receipts?.find(x=>x.sourceId===sourceId);
  if(sourceId===SECURITY){
   if(!receipt)return {sourceId,status:'locked',missing:['SECURITY_PROTECTION_RECEIPT_REQUIRED'],quotes:[]};
   const customerId=hooks.customerId||s.providerCampaign.customers.find(c=>c.id!==receipt.unlock.customerId&&c.market===receipt.sourceEvidence.market&&['active','renewal'].includes(c.status))?.id;
   if(!customerId)return {sourceId,status:'awaiting-customer',missing:['SECURITY_MANAGED_REQUIRES_ANOTHER_CUSTOMER'],unlock:copy(receipt.unlock),quotes:[]};
   const request={action:'operation',operationId:receipt.unlock.operationId,customerId,config:copy(receipt.unlock.config)};
   if(typeof hooks.providerQuote!=='function')return {sourceId,status:'unavailable',missing:['PROVIDER_QUOTE_REQUIRED'],quotes:[]};
   const quote=copy(hooks.providerQuote(s,request));return {sourceId,status:quote.blockers.length?'blocked':'available',missing:copy(quote.blockers),unlock:copy(receipt.unlock),request,quote,quoteSource:'SOC.provider.quote'};
  }
  if(!receipt)return {sourceId,status:'locked',missing:[sourceId===SUSTAINABLE?'SUSTAINABLE_PROVIDER_RECEIPT_REQUIRED':sourceId===NONSTARTER?'MANAGED_BUSINESS_RECEIPT_REQUIRED':sourceId===LEVEL_TWO?'REGIONAL_MSP_RECEIPT_REQUIRED':sourceId===REGIONAL_C3?'THREE_REGION_RECEIPT_REQUIRED':sourceId===REGIONAL_C5?'FIVE_REGION_RECEIPT_REQUIRED':sourceId===REGIONAL_T2?'TIER_TWO_RECEIPT_REQUIRED':sourceId===REGIONAL_L7?'INTERNATIONAL_PROVIDER_RECEIPT_REQUIRED':sourceId===IX?'FIRST_INTEGRATION_RECEIPT_REQUIRED':sourceId===LEVEL_THREE?'UC_CC_INTEGRATOR_RECEIPT_REQUIRED':sourceId===RESILIENCE_RD?'PROVIDER_RESILIENCE_RECEIPT_REQUIRED':sourceId===LOCAL_CONTINUITY?'LOCAL_SPEECH_RECEIPT_REQUIRED':sourceId===CASE_FOLLOWUP?'CASE_FOLLOWUP_RECEIPT_REQUIRED':sourceId===DEDICATED_INTERCONNECT?'DEDICATED_INTERCONNECT_RECEIPT_REQUIRED':'EXTERNAL_REACH_RECEIPT_REQUIRED'],quotes:[]};
  if(typeof hooks.providerQuote!=='function')return {sourceId,status:'unavailable',missing:['SOC_PROVIDER_QUOTE_HOOK_REQUIRED'],quotes:[]};
  if([LEVEL_FIVE,LEVEL_SIX].includes(sourceId)){
   const customerId=hooks.customerId||receipt.unlock.customerId;
   if(!receipt.unlock.customerIds.includes(customerId))return {sourceId,status:'blocked',missing:['EARNED_CENTRAL_SERVICE_CUSTOMER_REQUIRED'],unlock:copy(receipt.unlock),quotes:[]};
   const offers=receipt.unlock.operationIds.map(operationId=>{const request={action:'operation',operationId,customerId};try{const quote=copy(hooks.providerQuote(s,request));return {operationId,request,status:quote.blockers.length?'blocked':'available',missing:[...quote.blockers],quote,quoteSource:'SOC.provider.quote'};}catch(error){return {operationId,request,status:'unavailable',missing:[String(error.message)],quote:null,quoteSource:'SOC.provider.quote'};}});
   return {sourceId,status:offers.some(x=>x.status==='available')?'available':'blocked',missing:offers.flatMap(x=>x.missing),unlock:copy(receipt.unlock),offers,quotes:offers};
  }
  if(sourceId===EXTERNAL_REACH||sourceId===DEDICATED_INTERCONNECT||sourceId===CASE_FOLLOWUP||sourceId===RESILIENCE_RD||sourceId===LOCAL_CONTINUITY){const customerId=hooks.customerId||receipt.unlock.customerId,target=s.providerCampaign.customers.find(x=>x.id===customerId);if(!target)return {sourceId,status:'awaiting-customer',missing:[sourceId===RESILIENCE_RD?'RESILIENCE_UNLOCK_CUSTOMER_REQUIRED':sourceId===LOCAL_CONTINUITY?'LOCAL_CONTINUITY_UNLOCK_CUSTOMER_REQUIRED':sourceId===CASE_FOLLOWUP?'CASE_FOLLOWUP_UNLOCK_CUSTOMER_REQUIRED':sourceId===DEDICATED_INTERCONNECT?'DEDICATED_INTERCONNECT_UNLOCK_CUSTOMER_REQUIRED':'EXTERNAL_REACH_UNLOCK_CUSTOMER_REQUIRED'],unlock:copy(receipt.unlock),quotes:[]};if(!receipt.unlock.allowedMarkets.includes(target.market))return {sourceId,status:'blocked',missing:[sourceId===RESILIENCE_RD?'RESILIENCE_UNLOCK_MARKET_OUT_OF_SCOPE':sourceId===LOCAL_CONTINUITY?'LOCAL_CONTINUITY_UNLOCK_MARKET_OUT_OF_SCOPE':sourceId===CASE_FOLLOWUP?'CASE_FOLLOWUP_UNLOCK_MARKET_OUT_OF_SCOPE':sourceId===DEDICATED_INTERCONNECT?'DEDICATED_INTERCONNECT_UNLOCK_MARKET_OUT_OF_SCOPE':'EXTERNAL_REACH_UNLOCK_MARKET_OUT_OF_SCOPE'],unlock:copy(receipt.unlock),quotes:[]};const request={action:'operation',operationId:receipt.unlock.operationId,customerId};let quote;try{quote=copy(hooks.providerQuote(s,request));}catch(error){return {sourceId,status:'unavailable',missing:[`UNLOCK_OPERATION_NOT_AUTHORED:${String(error?.message||error)}`],unlock:copy(receipt.unlock),request,quotes:[]};}const available=Array.isArray(quote?.blockers)&&quote.blockers.length===0;return {sourceId,status:available?'available':'blocked',missing:available?[]:[...(quote?.blockers||['PROVIDER_QUOTE_UNAVAILABLE'])],unlock:copy(receipt.unlock),request,quote,quoteSource:'SOC.provider.quote'};}
  if(sourceId===IX||sourceId===LEVEL_THREE){
   const customerId=sourceId===IX?receipt.unlock.customerId:hooks.customerId,target=s.providerCampaign.customers.find(x=>x.id===customerId);
   if(!customerId||sourceId===LEVEL_THREE&&!target)return {sourceId,status:'awaiting-customer',missing:['UC_CC_UNLOCK_TARGET_CUSTOMER_REQUIRED'],unlock:copy(receipt.unlock),quotes:[]};
   if(sourceId===LEVEL_THREE&&(!target||target.id===receipt.unlock.customerId||!receipt.unlock.allowedMarkets.includes(target.market)))return {sourceId,status:'blocked',missing:[!target?'UC_CC_UNLOCK_TARGET_CUSTOMER_REQUIRED':target.id===receipt.unlock.customerId?'UC_CC_UNLOCK_REQUIRES_ANOTHER_CUSTOMER':'UC_CC_UNLOCK_MARKET_OUT_OF_SCOPE'],unlock:copy(receipt.unlock),quotes:[]};
   const offers=receipt.unlock.operationIds.map(operationId=>{const request={action:'operation',operationId,customerId};try{const quote=copy(hooks.providerQuote(s,request));return {operationId,request,status:Array.isArray(quote?.blockers)&&quote.blockers.length===0?'available':'blocked',missing:[...(quote?.blockers||[])],quote,quoteSource:'SOC.provider.quote'};}catch(error){return {operationId,request,status:'unavailable',missing:[`UNLOCK_OPERATION_NOT_AUTHORED:${String(error?.message||error)}`],quote:null,quoteSource:'SOC.provider.quote'};}});
   return {sourceId,status:offers.some(x=>x.status==='available')?'available':offers.every(x=>x.status==='unavailable')?'unavailable':'blocked',missing:offers.flatMap(x=>x.missing),unlock:copy(receipt.unlock),offers,quotes:offers};
  }
  if(sourceId===REGIONAL_T2){
   const customerId=hooks.customerId||receipt.unlock.customerId,target=s.providerCampaign.customers.find(x=>x.id===customerId);
   if(!target)return {sourceId,status:'awaiting-customer',missing:['INTEGRATION_ASSURANCE_TARGET_CUSTOMER_REQUIRED'],unlock:copy(receipt.unlock),quotes:[]};
   if(!receipt.unlock.allowedCustomerIds.includes(customerId)||!receipt.unlock.allowedMarkets.includes(target.market))return {sourceId,status:'blocked',missing:['INTEGRATION_ASSURANCE_TARGET_OUT_OF_SCOPE'],unlock:copy(receipt.unlock),quotes:[]};
   const request={action:'operation',operationId:receipt.unlock.operationId,customerId};let quote;
   try{quote=copy(hooks.providerQuote(s,request));}catch(error){return {sourceId,status:'unavailable',missing:[`UNLOCK_OPERATION_NOT_AUTHORED:${String(error?.message||error)}`],unlock:copy(receipt.unlock),request,quotes:[]};}
   const available=Array.isArray(quote?.blockers)&&quote.blockers.length===0;
   return {sourceId,status:available?'available':'blocked',missing:available?[]:[...(quote?.blockers||['PROVIDER_QUOTE_UNAVAILABLE'])],unlock:copy(receipt.unlock),request,quote,quoteSource:'SOC.provider.quote'};
  }
  if(sourceId===REGIONAL_L7){
   const customerId=hooks.customerId||receipt.unlock.customerId,target=s.providerCampaign.customers.find(x=>x.id===customerId);
   if(!target)return {sourceId,status:'awaiting-customer',missing:['DISTRIBUTOR_SUPPORT_TARGET_CUSTOMER_REQUIRED'],unlock:copy(receipt.unlock),quotes:[]};
   if(!receipt.unlock.allowedMarkets.includes(target.market))return {sourceId,status:'blocked',missing:['DISTRIBUTOR_SUPPORT_MARKET_OUT_OF_SCOPE'],unlock:copy(receipt.unlock),quotes:[]};
   const support=regionalSupportApi(),personId=Object.keys(support.PEOPLE).find(id=>support.PEOPLE[id].market===target.market),request={action:'operation',operationId:receipt.unlock.operationId,customerId,config:{market:target.market,personId,coverageId:receipt.unlock.coverageId}};let quote;
   try{quote=copy(hooks.providerQuote(s,request));}catch(error){return {sourceId,status:'unavailable',missing:[`UNLOCK_OPERATION_NOT_AUTHORED:${String(error?.message||error)}`],unlock:copy(receipt.unlock),request,quotes:[]};}
   const available=!!personId&&Array.isArray(quote?.blockers)&&quote.blockers.length===0;
   return {sourceId,status:available?'available':'blocked',missing:available?[]:[...(quote?.blockers||['PROVIDER_QUOTE_UNAVAILABLE'])],unlock:copy(receipt.unlock),request,quote,quoteSource:'SOC.provider.quote'};
  }
  const regionalScope=[LEVEL_TWO,REGIONAL_C3,REGIONAL_C5].includes(sourceId);
  const customerId=regionalScope?(hooks.customerId||receipt.unlock.customerId):receipt.unlock.customerId;
  const target=s.providerCampaign.customers.find(x=>x.id===customerId);
  if(regionalScope&&(!target||!receipt.unlock.allowedMarkets.includes(target.market)))return {sourceId,status:'blocked',missing:[sourceId===LEVEL_TWO?'REGIONAL_PROVISIONING_MARKET_OUT_OF_SCOPE':'REGIONAL_PROVISIONING_EARNED_MARKET_OUT_OF_SCOPE'],unlock:copy(receipt.unlock),request:{action:'operation',operationId:receipt.unlock.operationId,customerId},quotes:[]};
  const request={action:'operation',operationId:receipt.unlock.operationId,customerId};let quote;
  try{quote=copy(hooks.providerQuote(s,request));}catch(error){return {sourceId,status:'unavailable',missing:[`UNLOCK_OPERATION_NOT_AUTHORED:${String(error?.message||error)}`],unlock:copy(receipt.unlock),request,quotes:[]};}
  const available=Array.isArray(quote?.blockers)&&quote.blockers.length===0;
  return {sourceId,status:available?'available':'blocked',missing:available?[]:[...(quote?.blockers||['PROVIDER_QUOTE_UNAVAILABLE'])],unlock:copy(receipt.unlock),request,quote,quoteSource:'SOC.provider.quote'};
 }
 function inspect(s,hooks={}){
  if(!s?.providerCampaign)fail('PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED');validate(s,hooks);
  const A=factsApi(),facts=A.evaluate(s,factsHooks(hooks,s)),receipts=copy(receiptStore(s)?.receipts||[]);
  const rows=[...A.LEVELS,...A.GOALS].map(sourceId=>{
   const result=eligibility(s,sourceId,hooks,facts,true);return {...result,receipt:result.receipt||null};
  });
  const unlockProposals=[SECURITY,SUSTAINABLE,NONSTARTER,LEVEL_TWO,REGIONAL_C3,REGIONAL_C5,REGIONAL_T2,REGIONAL_L7,IX,LEVEL_THREE,EXTERNAL_REACH,DEDICATED_INTERCONNECT,CASE_FOLLOWUP,RESILIENCE_RD,LOCAL_CONTINUITY,LEVEL_FIVE,LEVEL_SIX].map(sourceId=>unlockProposalValidated(s,sourceId,hooks));
  return {pack:PACK,version:VERSION,contentVersion:CONTENT,asOf:s.clock,receipts,rows,unlockProposal:unlockProposals.find(x=>x.sourceId===SUSTAINABLE),unlockProposals};
 }
 function regionalRetentionPins(receipt,customerId){
  const support=regionalSupportApi(),emptyPins=support.retentionPins(null);
  if(!receipt||!REGIONAL_SOURCES.includes(receipt.sourceId)||receipt.id!==`provider-progression-receipt:${receipt.sourceId}`)return emptyPins;
  const evidence=decodeRegionalEvidence(receipt.sourceEvidence);if(!evidence||evidence.sourceId!==receipt.sourceId)return emptyPins;
  return support.retentionPins(evidence,customerId,receipt.workProofs);
 }
 function caseFollowupRetentionPins(receipt,customerId){const e=receipt?.sourceEvidence,emptyPins={interactionIds:[],jobIds:[],caseIds:[],eventIds:[]};if(receipt?.sourceId!==CASE_FOLLOWUP||receipt.id!==`provider-progression-receipt:${CASE_FOLLOWUP}`||e?.kind!=='provider-case-followup-proof'||!Array.isArray(e.interactionIds)||!id(e.jobId)||!id(e.job?.caseId)||customerId&&e.customerId!==customerId)return emptyPins;return {interactionIds:[...e.interactionIds],jobIds:[e.jobId],caseIds:[e.job.caseId],eventIds:[]};}
 function dedicatedInterconnectRetentionPins(receipt,customerId){
  const emptyPins={interactionIds:[],jobIds:[],caseIds:[],eventIds:[]};
  if(!receipt||receipt.sourceId!==DEDICATED_INTERCONNECT||receipt.id!==`provider-progression-receipt:${DEDICATED_INTERCONNECT}`||!receipt.sourceEvidence||customerId&&receipt.sourceEvidence.customerId!==customerId)return emptyPins;
  try{return dedicatedInterconnectApi().pins(receipt.sourceEvidence);}catch{return emptyPins;}
 }
 function source(){return `const SOC_PROVIDER_PROGRESSION_RECEIPTS=(${socProviderProgressionReceiptsKernel.toString()})();`;}
 return {PACK,VERSION,CONTENT,FIELD,SECURITY,FIRST_LIVE,SUSTAINABLE,NONSTARTER,LEVEL_TWO,REGIONAL_C3,REGIONAL_C5,REGIONAL_T2,REGIONAL_L7,IX,LEVEL_THREE,EXTERNAL_REACH,DEDICATED_INTERCONNECT,CASE_FOLLOWUP,RESILIENCE_LN,RESILIENCE_RD,LOCAL_CONTINUITY,LEVEL_FIVE,LEVEL_SIX,empty,eligibility,claim,unlockProposal,inspect,validate,regionalRetentionPins,dedicatedInterconnectRetentionPins,caseFollowupRetentionPins,source};
}
const SOC_PROVIDER_PROGRESSION_RECEIPTS=socProviderProgressionReceiptsKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_PROGRESSION_RECEIPTS;
