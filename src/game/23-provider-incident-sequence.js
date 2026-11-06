/* Bounded, versioned synthetic follow-up incidents; callers supply native receipts. */
function socProviderIncidentSequenceKernel(){
 'use strict';
 const VERSION=1,INTERVAL_MINUTES=360,MAX_TOTAL=8;
 const fail=code=>{throw new Error(code);};
 const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
 const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 const copy=x=>JSON.parse(JSON.stringify(x));
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const faultFor=kind=>kind==='boundary'?'BOUNDARY_SUPPORT':kind==='outage'?'OUTAGE':kind==='disconnection'?'DISCONNECTED':kind==='transport-domain'?'TRANSPORT_DOMAIN':'CAPACITY';
 const incidentStatuses=new Set(['scheduled','active','acknowledged','resolved']);
 function definitionFor(definition){
  if(!definition||typeof definition!=='object'||Array.isArray(definition)||Object.keys(definition).some(key=>!['afterDelivered','delayMinutes','resource','kind','field','fault'].includes(key))||!integer(definition.afterDelivered,1)||!integer(definition.delayMinutes,1,120)||!id(definition.resource)||!['boundary','outage','disconnection','capacity'].includes(definition.kind)||definition.fault!==undefined&&definition.fault!==faultFor(definition.kind))return null;
  const out={afterDelivered:definition.afterDelivered,delayMinutes:definition.delayMinutes,resource:definition.resource,kind:definition.kind,fault:faultFor(definition.kind)};
  if(definition.field!==undefined){if(typeof definition.field!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(definition.field))return null;out.field=definition.field;}
  return out;
 }
 function sameIncidentDefinition(incident,definition){return !!incident&&incident.resource===definition.resource&&incident.kind===definition.kind&&incident.fault===definition.fault&&incident.dueAt===incident.createdAt+definition.delayMinutes;}
 function sequenceRows(incidents,customerId){
  if(!Array.isArray(incidents)||incidents.length>MAX_TOTAL||incidents.some(row=>!row||row.customerId!==customerId))return null;
  const rows=[...incidents];
  const ids=new Set();for(let index=0;index<rows.length;index++){const row=rows[index];if(!id(row.id)||ids.has(row.id)||!integer(row.createdAt)||!integer(row.dueAt)||!incidentStatuses.has(row.status)||index>0&&row.createdAt<=rows[index-1].createdAt)return null;ids.add(row.id);}
  return rows;
 }
 function validWorkEvent(event,customerId,scheduledAt,afterAt=-1){
  return !!event&&exact(event,['id','at','code','customerId','jobId','completedAt','status'])&&id(event.id)&&event.code==='CUSTOMER_WORK_COMPLETED'&&event.customerId===customerId&&id(event.jobId)&&integer(event.at)&&integer(event.completedAt)&&event.at===scheduledAt&&event.completedAt>afterAt&&event.completedAt<=event.at&&['completed','late'].includes(event.status);
 }
 function recoveryFor(predecessor,customerId,repairProjects){
  if(repairProjects===undefined)return null;
  if(!Array.isArray(repairProjects))return false;
  const related=repairProjects.filter(project=>project?.customerId===customerId&&(project?.recoveryIncidentId??project?.config?.incidentId??project?.operationReceipt?.incidentId)===predecessor.id&&project.status!=='cancelled'&&project.status!=='blocked');
  if(!related.length)return null;
  const complete=related.filter(project=>project.kind==='operation'&&id(project.operationId)&&project.status==='complete'&&id(project.id)&&id(project.postingId)&&integer(project.acceptedAt)&&integer(project.completedAt,project.acceptedAt,predecessor.resolvedAt)&&integer(project.setupCents,1));
  if(!complete.length)return null;
  complete.sort((a,b)=>b.completedAt-a.completedAt||a.id.localeCompare(b.id));
  const project=complete[0];
  return {projectId:project.id,postingId:project.postingId,operationId:project.operationId,acceptedAt:project.acceptedAt,completedAt:project.completedAt,setupCents:project.setupCents};
 }
 function expectedProof({ordinal,predecessor,definition,workEvent,recovery}){
  return {version:VERSION,ordinal,predecessorIncidentId:predecessor.id,predecessorResolvedAt:predecessor.resolvedAt,eligibleAt:predecessor.resolvedAt+INTERVAL_MINUTES,scheduledAt:workEvent.at,dueAt:workEvent.at+definition.delayMinutes,definition:copy(definition),recovery:recovery===false?null:copy(recovery),trigger:{eventId:workEvent.id,jobId:workEvent.jobId,customerId:workEvent.customerId,at:workEvent.at,completedAt:workEvent.completedAt,status:workEvent.status}};
 }
 function incidentStatusValid(incident){return incident?.status==='resolved'?integer(incident.resolvedAt,incident.createdAt):incident?.resolvedAt===null;}
 function validatePrefix({version,customerId,definition,incidents,completedWorkEvents,repairProjects}){
  if(!Array.isArray(incidents)||incidents.length>MAX_TOTAL)return false;
  if(!incidents.length)return true;
  if(incidents[0].sequence!==undefined||!incidentStatusValid(incidents[0])||!sameIncidentDefinition(incidents[0],definition))return false;
  for(let index=1;index<incidents.length;index++)if(!validateProof({version,customerId,definition,incident:incidents[index],priorIncidents:incidents.slice(0,index),completedWorkEvents,repairProjects}))return false;
  return true;
 }
 function validateProof({version,customerId,definition:rawDefinition,incident,priorIncidents,completedWorkEvents,repairProjects}){
  try{
   if(version!==VERSION||!id(customerId)||!Array.isArray(completedWorkEvents)||!Array.isArray(priorIncidents))return false;
   const definition=definitionFor(rawDefinition),priors=sequenceRows(priorIncidents,customerId);
   if(!definition||!priors||priors.length<1||priors.length>=MAX_TOTAL||!exact(incident?.sequence,['version','ordinal','predecessorIncidentId','predecessorResolvedAt','eligibleAt','scheduledAt','dueAt','definition','recovery','trigger']))return false;
   if(!sameIncidentDefinition(incident,definition)||incident.customerId!==customerId||!integer(incident.createdAt)||!incidentStatusValid(incident))return false;
   if(!validatePrefix({version,customerId,definition,incidents:priors,completedWorkEvents,repairProjects}))return false;
   const predecessor=priors.at(-1),ordinal=priors.length+1;
   if(predecessor.status!=='resolved'||!integer(predecessor.resolvedAt,predecessor.createdAt)||incident.createdAt<predecessor.resolvedAt+INTERVAL_MINUTES)return false;
   const proof=incident.sequence;
   const recovery=recoveryFor(predecessor,customerId,repairProjects);
   if(recovery===false||!exact(proof,['version','ordinal','predecessorIncidentId','predecessorResolvedAt','eligibleAt','scheduledAt','dueAt','definition','recovery','trigger'])||proof.version!==VERSION||proof.ordinal!==ordinal||proof.predecessorIncidentId!==predecessor.id||proof.predecessorResolvedAt!==predecessor.resolvedAt||proof.eligibleAt!==predecessor.resolvedAt+INTERVAL_MINUTES||proof.scheduledAt!==incident.createdAt||proof.dueAt!==incident.dueAt||!same(proof.definition,definition)||!same(proof.recovery,recovery))return false;
   const trigger=proof.trigger;if(!exact(trigger,['eventId','jobId','customerId','at','completedAt','status'])||!id(trigger.eventId)||!id(trigger.jobId)||trigger.customerId!==customerId||trigger.at!==incident.createdAt||!integer(trigger.completedAt,predecessor.resolvedAt+1,incident.createdAt)||!['completed','late'].includes(trigger.status))return false;
   const event=completedWorkEvents.find(row=>row?.id===trigger.eventId);
   return validWorkEvent(event,customerId,incident.createdAt,predecessor.resolvedAt)&&same(trigger,{eventId:event.id,jobId:event.jobId,customerId:event.customerId,at:event.at,completedAt:event.completedAt,status:event.status});
  }catch{return false;}
 }
 function validateHistory({version,customerId,definition:rawDefinition,incidents,completedWorkEvents,repairProjects}){
  try{
   if(!id(customerId)||!Array.isArray(incidents)||!Array.isArray(completedWorkEvents))return false;
   if(version===undefined){return incidents.length<=1&&incidents.every(row=>row?.customerId===customerId&&row.sequence===undefined);}
   if(version!==VERSION||incidents.length>MAX_TOTAL)return false;
   const definition=definitionFor(rawDefinition);if(!definition)return false;
   const rows=sequenceRows(incidents,customerId);if(!rows)return false;
   return validatePrefix({version,customerId,definition,incidents:rows,completedWorkEvents,repairProjects});
  }catch{return false;}
 }
 function candidate({version,customerId,at,definition:rawDefinition,incidents,completedWorkEvents,repairProjects}){
  if(version===undefined)return null;
  if(version!==VERSION)fail('UNSUPPORTED_PROVIDER_INCIDENT_SEQUENCE_VERSION');
  const definition=definitionFor(rawDefinition),rows=sequenceRows(incidents,customerId);
  if(!definition||!rows||!Array.isArray(completedWorkEvents)||!integer(at)||rows.length<1||rows.length>=MAX_TOTAL||!validateHistory({version,customerId,definition,incidents:rows,completedWorkEvents,repairProjects}))return null;
  const predecessor=rows.at(-1),eligibleAt=predecessor.resolvedAt+INTERVAL_MINUTES;
  if(predecessor.status!=='resolved'||!integer(predecessor.resolvedAt,predecessor.createdAt)||at<eligibleAt)return null;
  const workEvent=completedWorkEvents.filter(row=>validWorkEvent(row,customerId,at,predecessor.resolvedAt)).sort((a,b)=>a.id.localeCompare(b.id))[0];
  if(!workEvent)return null;
  const recovery=recoveryFor(predecessor,customerId,repairProjects);if(recovery===false)return null;
  return expectedProof({ordinal:rows.length+1,predecessor,definition,workEvent,recovery});
 }
 function source(){return `const SOC_PROVIDER_INCIDENT_SEQUENCE=((${socProviderIncidentSequenceKernel.toString()}))();`;}
 return {VERSION,INTERVAL_MINUTES,MAX_TOTAL,candidate,validateProof,validateHistory,source};
}
const SOC_PROVIDER_INCIDENT_SEQUENCE=socProviderIncidentSequenceKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_INCIDENT_SEQUENCE;
