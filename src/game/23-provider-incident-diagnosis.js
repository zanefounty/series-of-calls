/* Paid, bounded incident diagnosis. This module reads evidence and never repairs service. */
function socProviderIncidentDiagnosisKernel(){
 'use strict';
 const VERSION=1,OPERATION_ID='diagnose-incident',TERMS=Object.freeze({setupCents:6000,periodCents:0,workMinutes:6,engineers:1,support:1});
 const CAUSES=Object.freeze(['transport-domain','resource-outage','resource-capacity','external-disconnection','service-boundary','unconfirmed']);
 const DECISIONS=Object.freeze(['repair','mitigation','accepted-loss']);
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x);
 const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function validateObservation(o){
  if(!exact(o,['version','at','customerId','incidentId','resource','incidentKind','incidentStatus','incidentFault','receipt','serviceReady','serviceReasons','paths'])||o.version!==VERSION||!integer(o.at)||!id(o.customerId)||!id(o.incidentId)||!id(o.resource)||!['outage','capacity','disconnection','boundary','transport-domain'].includes(o.incidentKind)||!['active','acknowledged','resolved'].includes(o.incidentStatus)||!(o.incidentFault===null||typeof o.incidentFault==='string')||!(o.receipt===null||typeof o.receipt==='object'&&!Array.isArray(o.receipt))||JSON.stringify(o.receipt).length>16384||!(o.serviceReady===null||typeof o.serviceReady==='boolean')||!Array.isArray(o.serviceReasons)||o.serviceReasons.length>32||o.serviceReasons.some(x=>typeof x!=='string'||x.length>96)||!Array.isArray(o.paths)||o.paths.length>16)fail('INVALID_PROVIDER_DIAGNOSIS_OBSERVATION');
  const seen=new Set();for(const p of o.paths){if(!exact(p,['from','to','profile','ready','reason','edges'])||!id(p.from)||!id(p.to)||!['voice','message','meeting'].includes(p.profile)||typeof p.ready!=='boolean'||!(p.reason===null||typeof p.reason==='string'&&p.reason.length<=128)||!Array.isArray(p.edges)||p.edges.length>16||seen.has(`${p.from}|${p.to}|${p.profile}`))fail('INVALID_PROVIDER_DIAGNOSIS_OBSERVATION');const edgeIds=new Set();for(const e of p.edges){if(!exact(e,['id','desiredGeneration','effectiveGeneration','domain','ready'])||!id(e.id)||!integer(e.desiredGeneration,1)||!(e.effectiveGeneration===null||integer(e.effectiveGeneration,1))||!id(e.domain)||typeof e.ready!=='boolean'||edgeIds.has(e.id))fail('INVALID_PROVIDER_DIAGNOSIS_OBSERVATION');edgeIds.add(e.id);}seen.add(`${p.from}|${p.to}|${p.profile}`);}
  return true;
 }
 function incidentFor(provider,customerId,incidentId){const row=provider?.incidents?.find(x=>x.id===incidentId&&x.customerId===customerId);if(!row)fail('PROVIDER_DIAGNOSIS_INCIDENT_REQUIRED');return row;}
 function paidProject(provider,customer,project,hooks={}){
  if(!project||project.kind!=='operation'||project.operationId!==OPERATION_ID||project.customerId!==customer.id||!id(project.id)||!id(project.postingId)||!integer(project.acceptedAt)||project.setupCents!==TERMS.setupCents||project.periodCents!==TERMS.periodCents||project.workMinutes!==TERMS.workMinutes||project.engineers!==TERMS.engineers||project.support!==TERMS.support||['cancelled','blocked'].includes(project.status))fail('PROVIDER_DIAGNOSIS_PAID_PROJECT_REQUIRED');
  if(typeof hooks.validatePaidProject!=='function'||hooks.validatePaidProject(provider,customer,project)!==true)fail('PROVIDER_DIAGNOSIS_PAID_POSTING_REQUIRED');return project;
 }
 function currentObservation(provider,customer,child,incidentId,hooks){
  if(typeof hooks.observe!=='function')fail('PROVIDER_DIAGNOSIS_OBSERVER_REQUIRED');const raw=hooks.observe(provider,customer,child,incidentId);validateObservation(raw);
  if(raw.customerId!==customer.id||raw.incidentId!==incidentId||raw.at!==child.clock)fail('PROVIDER_DIAGNOSIS_OBSERVATION_SCOPE');const incident=incidentFor(provider,customer.id,incidentId);
  if(raw.resource!==incident.resource||raw.incidentKind!==incident.kind||raw.incidentStatus!==incident.status||raw.incidentFault!==(incident.fault??null)||!same(raw.receipt,incident.receipt??null))fail('PROVIDER_DIAGNOSIS_INCIDENT_OBSERVATION_MISMATCH');return copy(raw);
 }
 function publicInspection(provider,customer,child,incidentId,hooks={}){const observation=currentObservation(provider,customer,child,incidentId,hooks);return {version:VERSION,customerId:customer.id,incidentId,at:child.clock,chargeCents:0,observation,diagnosis:null,actions:[]};}
 function readiness(provider,customer,child,incidentId,hooks={}){
  const missing=[];try{const incident=incidentFor(provider,customer.id,incidentId);if(!['active','acknowledged'].includes(incident.status))missing.push('INCIDENT_NOT_ACTIVE');currentObservation(provider,customer,child,incidentId,hooks);}catch(error){missing.push(error.message);}
  if(provider?.projects?.some(p=>p.customerId===customer?.id&&p.operationId===OPERATION_ID&&p.config?.incidentId===incidentId&&['running','commissioning'].includes(p.status)))missing.push('DIAGNOSIS_ALREADY_PENDING');if(provider?.projects?.some(p=>p.customerId===customer?.id&&p.operationId===OPERATION_ID&&p.config?.incidentId===incidentId&&p.status==='complete'))missing.push('DIAGNOSIS_ALREADY_COMPLETE');
  return {eligible:missing.length===0,missing:[...new Set(missing)],operationId:OPERATION_ID,customerId:customer?.id||null,incidentId};
 }
 function plan(provider,customer,child,incidentId,hooks={}){const ready=readiness(provider,customer,child,incidentId,hooks);if(!ready.eligible)fail(`PROVIDER_DIAGNOSIS_ORDER_BLOCKED:${ready.missing.join(',')}`);return {version:VERSION,operationId:OPERATION_ID,customerId:customer.id,incidentId,terms:{...TERMS},config:{incidentId},observation:currentObservation(provider,customer,child,incidentId,hooks)};}
 function classify(o){
  if(o.incidentKind==='transport-domain'&&o.receipt?.domain&&o.paths.some(p=>!p.ready&&p.edges.some(e=>!e.ready&&e.domain===o.receipt.domain)))return {cause:'transport-domain',resource:o.resource,domain:o.receipt.domain,basis:'incident-receipt-and-failed-path'};
  const reasons=[...o.serviceReasons,...o.paths.filter(p=>!p.ready).map(p=>p.reason).filter(Boolean)];
  if(o.incidentKind==='outage'&&o.receipt?.resource===o.resource&&o.serviceReady===false&&reasons.some(x=>x===o.incidentFault||/(^|_)OUTAGE($|_)/i.test(x)))return {cause:'resource-outage',resource:o.resource,basis:'incident-receipt-and-current-service-observation'};
  if(o.incidentKind==='capacity'&&o.receipt?.resource===o.resource&&reasons.some(x=>/CAPACITY|SATURAT/i.test(x)))return {cause:'resource-capacity',resource:o.resource,basis:'incident-receipt-and-capacity-path-failure'};
  if(o.incidentKind==='disconnection'&&o.receipt?.resource===o.resource&&reasons.some(x=>/DISCONNECT|CONNECTION/i.test(x)))return {cause:'external-disconnection',resource:o.resource,basis:'incident-receipt-and-connection-path-failure'};
  if(o.incidentKind==='boundary'&&o.receipt?.resource===o.resource&&reasons.some(x=>/BOUNDARY|POLICY|JURISDICTION/i.test(x)))return {cause:'service-boundary',resource:o.resource,basis:'incident-receipt-and-boundary-path-failure'};
  return {cause:'unconfirmed',resource:o.resource,basis:'symptoms-do-not-isolate-a-cause'};
 }
 const conclusion=cause=>cause==='unconfirmed'?'accepted-loss':'likely-cause';
 function decision(cause){if(cause==='resource-capacity')return {kind:'mitigation',reason:'The measured failure is a capacity limit; compare a scoped mitigation before restoration.'};if(['transport-domain','resource-outage','external-disconnection'].includes(cause))return {kind:'repair',reason:'A retained incident and current failed path identify a repairable dependency.'};if(cause==='service-boundary')return {kind:'mitigation',reason:'The observed boundary is the blocker; review the authorized boundary before service repair.'};return {kind:'accepted-loss',reason:'The retained evidence does not isolate a safe repair or mitigation.'};}
 function complete(provider,customer,project,child,hooks={}){
  paidProject(provider,customer,project,hooks);const incidentId=project.config?.incidentId;if(!id(incidentId))fail('INVALID_PROVIDER_DIAGNOSIS_PROJECT_CONFIG');incidentFor(provider,customer.id,incidentId);
  if(project.status!=='complete'||!integer(project.completedAt)||project.completedAt>child.clock||project.acceptedAt>project.completedAt||project.completedAt-project.acceptedAt<TERMS.workMinutes)fail('PROVIDER_DIAGNOSIS_WORK_INCOMPLETE');const observation=currentObservation(provider,customer,child,incidentId,hooks),cause=classify(observation);
  return {kind:'provider-incident-diagnosis',version:VERSION,projectId:project.id,postingId:project.postingId,customerId:customer.id,incidentId,acceptedAt:project.acceptedAt,completedAt:project.completedAt,observation,cause,conclusion:conclusion(cause.cause),decision:decision(cause.cause),actions:{repair:'not-performed',mitigation:'not-performed'}};
 }
 function validateDiagnosis(provider,customer,child,evidence,hooks={},options={}){
  const causeKeys=['cause','resource','basis'],domainKeys=['cause','resource','domain','basis'];
  if(!exact(evidence,['kind','version','projectId','postingId','customerId','incidentId','acceptedAt','completedAt','observation','cause','conclusion','decision','actions'])||evidence.kind!=='provider-incident-diagnosis'||evidence.version!==VERSION||!id(evidence.projectId)||!id(evidence.postingId)||evidence.customerId!==customer.id||!id(evidence.incidentId)||!integer(evidence.acceptedAt)||!integer(evidence.completedAt)||evidence.completedAt-evidence.acceptedAt<TERMS.workMinutes||!(exact(evidence.cause,causeKeys)||exact(evidence.cause,domainKeys))||!CAUSES.includes(evidence.cause.cause)||evidence.cause.resource!==evidence.observation?.resource||!['incident-receipt-and-failed-path','incident-receipt-and-current-service-observation','incident-receipt-and-capacity-path-failure','incident-receipt-and-connection-path-failure','incident-receipt-and-boundary-path-failure','symptoms-do-not-isolate-a-cause'].includes(evidence.cause.basis)||evidence.conclusion!==conclusion(evidence.cause.cause)||!exact(evidence.decision,['kind','reason'])||!DECISIONS.includes(evidence.decision.kind)||!same(evidence.decision,decision(evidence.cause.cause))||!exact(evidence.actions,['repair','mitigation'])||evidence.actions.repair!=='not-performed'||evidence.actions.mitigation!=='not-performed')fail('INVALID_PROVIDER_DIAGNOSIS_EVIDENCE');
  validateObservation(evidence.observation);if(evidence.observation.incidentId!==evidence.incidentId||evidence.observation.customerId!==customer.id||evidence.observation.at!==evidence.completedAt||!same(classify(evidence.observation),evidence.cause))fail('INVALID_PROVIDER_DIAGNOSIS_EVIDENCE');const project=provider?.projects?.find(p=>p.id===evidence.projectId);paidProject(provider,customer,project,hooks);if(project.postingId!==evidence.postingId||project.operationId!==OPERATION_ID||project.config?.incidentId!==evidence.incidentId||project.acceptedAt!==evidence.acceptedAt||project.completedAt!==evidence.completedAt||project.status!=='complete')fail('INVALID_PROVIDER_DIAGNOSIS_PROJECT_LINK');
  const incident=incidentFor(provider,customer.id,evidence.incidentId);if(incident.resource!==evidence.observation.resource||incident.kind!==evidence.observation.incidentKind||!same(incident.receipt??null,evidence.observation.receipt))fail('INVALID_PROVIDER_DIAGNOSIS_OBSERVATION');
  const current=options.historical===true?evidence.observation:currentObservation(provider,customer,child,evidence.incidentId,hooks);if(!same(current,evidence.observation))fail('INVALID_PROVIDER_DIAGNOSIS_OBSERVATION');
  const receipt=project.operationReceipt;if(!receipt||receipt.kind!==OPERATION_ID||receipt.version!==VERSION||receipt.projectId!==project.id||receipt.postingId!==project.postingId||!same(receipt.evidence,evidence))fail('INVALID_PROVIDER_DIAGNOSIS_RECEIPT');
  if(typeof hooks.validateRecordedObservation!=='function'||hooks.validateRecordedObservation(provider,customer,project,evidence.observation)!==true)fail('PROVIDER_DIAGNOSIS_HISTORICAL_OBSERVATION_REQUIRED');return true;
 }
 function source(){return `const SOC_PROVIDER_INCIDENT_DIAGNOSIS=(${socProviderIncidentDiagnosisKernel.toString()})();`;}
 return {VERSION,OPERATION_ID,TERMS,CAUSES,DECISIONS,validateObservation,publicInspection,readiness,plan,complete,validateDiagnosis,source};
}
const SOC_PROVIDER_INCIDENT_DIAGNOSIS=socProviderIncidentDiagnosisKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_PROVIDER_INCIDENT_DIAGNOSIS=SOC_PROVIDER_INCIDENT_DIAGNOSIS;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_INCIDENT_DIAGNOSIS;
