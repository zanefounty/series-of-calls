/* Bounded local-service autonomy and deferred interaction reconciliation. */
function socProviderContinuityKernel(){
 'use strict';
 const PACK='soc-provider-continuity-1',VERSION=1,MAX_PENDING=128;
 const fail=code=>{throw new Error(code);};
 const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const exact=(x,fields)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...fields].sort().join(',');
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
 function create(clock){
  if(!integer(clock))fail('INVALID_PROVIDER_CONTINUITY_CLOCK');
  return {pack:PACK,version:VERSION,installedAt:clock,autonomyMinutes:30,sparesReceipt:null,connected:true,outageStartedAt:null,outageExpiredAt:null,lastObservedAt:clock,observedInteractionIds:[],pending:[],pendingCheckpoint:{total:0,recorded:0,unrecorded:0,firstAt:null,lastAt:null,firstRecordedAt:null,lastRecordedAt:null,firstUnrecordedAt:null,lastUnrecordedAt:null},syncedCheckpoint:{total:0,recorded:0,unrecorded:0,throughAt:null},lastSyncAt:null,lastSyncReceipt:null};
 }
 function validReceipt(receipt,clock){
  return exact(receipt,['projectId','postingId','at'])&&id(receipt.projectId)&&id(receipt.postingId)&&integer(receipt.at)&&receipt.at<=clock;
 }
 function installSpares(state,clock,receipt){
  validateState(state,clock);
  if(state.sparesReceipt)fail('PROVIDER_SPARES_ALREADY_INSTALLED');
  if(!validReceipt(receipt,clock))fail('PROVIDER_SPARES_RECEIPT_REQUIRED');
  state.sparesReceipt=copy(receipt);
  state.autonomyMinutes=60;
  if(state.outageStartedAt!==null)state.outageExpiredAt=clock>=state.outageStartedAt+60?state.outageStartedAt+60:null;
  return state;
 }
 function observe(state,clock,connected){
  validateState(state,clock);
  if(typeof connected!=='boolean')fail('INVALID_PROVIDER_CONTINUITY_CONNECTION');
  const start=connected?null:(state.connected===false?state.outageStartedAt:clock);
  const elapsed=start===null?0:Math.max(0,clock-start),remaining=start===null?state.autonomyMinutes:Math.max(0,state.autonomyMinutes-elapsed);
  return {installed:state.autonomyMinutes>=30,outageActive:start!==null,outageStartedAt:start,elapsedMinutes:elapsed,autonomyMinutes:state.autonomyMinutes,remainingMinutes:remaining,expired:start!==null&&elapsed>=state.autonomyMinutes,expiredAt:start===null?null:start+state.autonomyMinutes,sparesInstalled:!!state.sparesReceipt,pendingCount:state.pendingCheckpoint.total+state.pending.length,pendingRecorded:state.pendingCheckpoint.recorded+state.pending.filter(x=>x.recordId!==null).length,pendingUnrecorded:state.pendingCheckpoint.unrecorded+state.pending.filter(x=>x.recordId===null).length};
 }
 function recordFor(child,interaction){
  const candidates=Array.isArray(interaction.records)?interaction.records:[];
  for(const rid of candidates){const r=(child.records||[]).find(x=>x.id===rid);if(r&&r.deleted!==true&&r.interaction===interaction.id)return r.id;}
  return null;
 }
 function interactionIdNumber(value){const m=/^interaction-([1-9][0-9]*)$/.exec(value||'');return m?Number(m[1]):0;}
 function archivedInteraction(child,idValue){const n=interactionIdNumber(idValue);return n>0&&Number.isSafeInteger(child.providerArchive?.throughInteractionId)&&n<=child.providerArchive.throughInteractionId;}
 function appendCheckpoint(cp,item){cp.total++;if(item.recordId!==null){cp.recorded++;if(cp.firstRecordedAt===null)cp.firstRecordedAt=item.finishedAt;cp.lastRecordedAt=item.finishedAt;}else{cp.unrecorded++;if(cp.firstUnrecordedAt===null)cp.firstUnrecordedAt=item.finishedAt;cp.lastUnrecordedAt=item.finishedAt;}cp.firstAt=cp.firstRecordedAt===null?cp.firstUnrecordedAt:cp.firstUnrecordedAt===null?cp.firstRecordedAt:Math.min(cp.firstRecordedAt,cp.firstUnrecordedAt);cp.lastAt=Math.max(cp.lastRecordedAt??0,cp.lastUnrecordedAt??0);}
 function advance(child){
  if(!child||typeof child!=='object'||!child.providerContinuity||!integer(child.clock)||typeof child.connected!=='boolean')fail('INVALID_PROVIDER_CONTINUITY_CHILD');
  const state=child.providerContinuity;validateState(state,child.clock);
  if(child.clock<state.lastObservedAt)fail('PROVIDER_CONTINUITY_CLOCK_REWIND');
  if(state.connected&&child.connected===false)state.outageStartedAt=child.clock;
  if(!state.connected&&child.connected===true){state.outageStartedAt=null;state.outageExpiredAt=null;}
  state.connected=child.connected;
  if(!child.connected&&state.outageStartedAt!==null&&child.clock>=state.outageStartedAt+state.autonomyMinutes&&state.outageExpiredAt===null)state.outageExpiredAt=state.outageStartedAt+state.autonomyMinutes;
  const known=new Set([...state.pending.map(x=>x.interactionId),...state.observedInteractionIds]);
  for(const interaction of child.interactions||[]){
   if(!interaction||interaction.probe===true||interaction.phase!=='resolved'||interaction.providerContext?.connected!==false||!integer(interaction.finishedAt,state.installedAt)||interaction.finishedAt>child.clock||known.has(interaction.id)||archivedInteraction(child,interaction.id))continue;
   if(!id(interaction.id)||!id(interaction.caseId))continue;
   const recordId=recordFor(child,interaction),entry={interactionId:interaction.id,caseId:interaction.caseId,finishedAt:interaction.finishedAt,recordId};
   state.pending.push(entry);known.add(interaction.id);
   state.observedInteractionIds.push(interaction.id);
  }
  state.pending.sort((a,b)=>a.finishedAt-b.finishedAt||interactionIdNumber(a.interactionId)-interactionIdNumber(b.interactionId));
  while(state.pending.length>MAX_PENDING)appendCheckpoint(state.pendingCheckpoint,state.pending.shift());
  state.observedInteractionIds=state.observedInteractionIds.filter(idValue=>!archivedInteraction(child,idValue));
  state.lastObservedAt=child.clock;
  return state;
 }
 function synchronise(child,scope,receipt){
  if(!child||typeof child!=='object'||!child.providerContinuity||!integer(child.clock))fail('INVALID_PROVIDER_CONTINUITY_CHILD');
  const state=child.providerContinuity;validateState(state,child.clock);
  if(child.connected!==true)fail('PROVIDER_CONTINUITY_REQUIRES_CONNECTION');
  if(!['records','all'].includes(scope))fail('INVALID_PROVIDER_SYNC_SCOPE');
  if(!validReceipt(receipt,child.clock))fail('PROVIDER_SYNC_RECEIPT_REQUIRED');
  const fromCheckpoint=state.pendingCheckpoint,summary={total:0,recorded:0,unrecorded:0,throughAt:null};
  if(scope==='all'){
   summary.total=fromCheckpoint.total;summary.recorded=fromCheckpoint.recorded;summary.unrecorded=fromCheckpoint.unrecorded;summary.throughAt=fromCheckpoint.lastAt;
   state.pendingCheckpoint={total:0,recorded:0,unrecorded:0,firstAt:null,lastAt:null,firstRecordedAt:null,lastRecordedAt:null,firstUnrecordedAt:null,lastUnrecordedAt:null};
  } else {
   summary.total=fromCheckpoint.recorded;summary.recorded=fromCheckpoint.recorded;summary.unrecorded=0;summary.throughAt=fromCheckpoint.recorded?fromCheckpoint.lastRecordedAt:null;
   fromCheckpoint.total-=fromCheckpoint.recorded;fromCheckpoint.recorded=0;fromCheckpoint.firstRecordedAt=null;fromCheckpoint.lastRecordedAt=null;fromCheckpoint.firstAt=fromCheckpoint.firstUnrecordedAt;fromCheckpoint.lastAt=fromCheckpoint.lastUnrecordedAt;if(fromCheckpoint.total===0){fromCheckpoint.firstAt=null;fromCheckpoint.lastAt=null;fromCheckpoint.firstUnrecordedAt=null;fromCheckpoint.lastUnrecordedAt=null;}
  }
  const keep=[];
  for(const item of state.pending){
   if(scope==='all'||item.recordId!==null){summary.total++;if(item.recordId!==null)summary.recorded++;else summary.unrecorded++;summary.throughAt=Math.max(summary.throughAt??0,item.finishedAt);}
   else keep.push(item);
  }
  state.pending=keep;
  const synced=state.syncedCheckpoint;synced.total+=summary.total;synced.recorded+=summary.recorded;synced.unrecorded+=summary.unrecorded;if(summary.throughAt!==null)synced.throughAt=Math.max(synced.throughAt??0,summary.throughAt);
  state.lastSyncAt=child.clock;
  state.lastSyncReceipt={projectId:receipt.projectId,postingId:receipt.postingId,at:receipt.at,scope,total:summary.total,recorded:summary.recorded,unrecorded:summary.unrecorded};
  return copy(state.lastSyncReceipt);
 }
 function validateState(state,clock=Number.MAX_SAFE_INTEGER){
  const fields=['autonomyMinutes','connected','installedAt','lastObservedAt','lastSyncAt','lastSyncReceipt','observedInteractionIds','outageExpiredAt','outageStartedAt','pack','pending','pendingCheckpoint','sparesReceipt','syncedCheckpoint','version'];
  if(!exact(state,fields)||state.pack!==PACK||state.version!==VERSION||!integer(state.installedAt)||!integer(state.lastObservedAt,state.installedAt)||state.lastObservedAt>clock||![30,60].includes(state.autonomyMinutes)||typeof state.connected!=='boolean'||state.outageStartedAt!==null&&!integer(state.outageStartedAt,state.installedAt)||state.outageStartedAt!==null&&state.outageStartedAt>state.lastObservedAt||state.outageExpiredAt!==null&&(!integer(state.outageExpiredAt,state.installedAt)||state.outageStartedAt===null||state.outageExpiredAt!==state.outageStartedAt+state.autonomyMinutes)||state.lastSyncAt!==null&&(!integer(state.lastSyncAt,state.installedAt)||state.lastSyncAt>state.lastObservedAt)||!Array.isArray(state.pending)||state.pending.length>MAX_PENDING||!Array.isArray(state.observedInteractionIds)||state.observedInteractionIds.length>256||new Set(state.observedInteractionIds).size!==state.observedInteractionIds.length||state.observedInteractionIds.some(x=>!id(x)))fail('INVALID_PROVIDER_CONTINUITY');
  if((state.autonomyMinutes===30)!==(state.sparesReceipt===null)||state.sparesReceipt!==null&&!validReceipt(state.sparesReceipt,clock))fail('INVALID_PROVIDER_SPARES_RECEIPT');
  for(const [key,shape] of [['pendingCheckpoint',['firstAt','lastAt','firstRecordedAt','lastRecordedAt','firstUnrecordedAt','lastUnrecordedAt','recorded','total','unrecorded']],['syncedCheckpoint',['recorded','throughAt','total','unrecorded']]]){const x=state[key];if(!exact(x,shape)||!integer(x.total)||!integer(x.recorded)||!integer(x.unrecorded)||x.total!==x.recorded+x.unrecorded||key==='pendingCheckpoint'&&(x.firstAt!==null&&!integer(x.firstAt,state.installedAt)||x.lastAt!==null&&!integer(x.lastAt,x.firstAt??state.installedAt)||x.total===0&&(x.firstAt!==null||x.lastAt!==null||x.firstRecordedAt!==null||x.lastRecordedAt!==null||x.firstUnrecordedAt!==null||x.lastUnrecordedAt!==null)||x.total>0&&(x.firstAt===null||x.lastAt===null)||x.recorded===0&&(x.firstRecordedAt!==null||x.lastRecordedAt!==null)||x.recorded>0&&(x.firstRecordedAt===null||x.lastRecordedAt===null)||x.unrecorded===0&&(x.firstUnrecordedAt!==null||x.lastUnrecordedAt!==null)||x.unrecorded>0&&(x.firstUnrecordedAt===null||x.lastUnrecordedAt===null))||key==='syncedCheckpoint'&&x.throughAt!==null&&!integer(x.throughAt,state.installedAt))fail('INVALID_PROVIDER_CONTINUITY_CHECKPOINT');}
  if(state.lastSyncReceipt!==null&&(!exact(state.lastSyncReceipt,['projectId','postingId','at','scope','total','recorded','unrecorded'])||!validReceipt({projectId:state.lastSyncReceipt.projectId,postingId:state.lastSyncReceipt.postingId,at:state.lastSyncReceipt.at},clock)||!['records','all'].includes(state.lastSyncReceipt.scope)||!integer(state.lastSyncReceipt.total)||!integer(state.lastSyncReceipt.recorded)||!integer(state.lastSyncReceipt.unrecorded)||state.lastSyncReceipt.total!==state.lastSyncReceipt.recorded+state.lastSyncReceipt.unrecorded))fail('INVALID_PROVIDER_SYNC_RECEIPT');
  const seen=new Set();for(const x of state.pending){if(!exact(x,['caseId','finishedAt','interactionId','recordId'])||!id(x.interactionId)||!id(x.caseId)||!integer(x.finishedAt,state.installedAt)||x.finishedAt>clock||x.recordId!==null&&!id(x.recordId)||seen.has(x.interactionId))fail('INVALID_PROVIDER_CONTINUITY_PENDING');seen.add(x.interactionId);}
  if(state.pendingCheckpoint.lastAt!==null&&state.pending.length&&state.pendingCheckpoint.lastAt>state.pending[0].finishedAt)fail('INVALID_PROVIDER_CONTINUITY_ORDER');
  return true;
 }
 function validate(child){
  if(!child||typeof child!=='object'||child.providerContinuity===undefined)return true;
  if(!child.providerCustomer||child.providerCustomer.version!==1||!integer(child.clock))fail('INVALID_PROVIDER_CONTINUITY_OWNER');
  const state=child.providerContinuity;validateState(state,child.clock);
  for(const interactionId of state.observedInteractionIds){const found=(child.interactions||[]).find(x=>x.id===interactionId);if(found){if(found.phase!=='resolved'||found.probe===true||found.providerContext?.connected!==false)fail('INVALID_PROVIDER_CONTINUITY_OBSERVED');}else if(!archivedInteraction(child,interactionId))fail('INVALID_PROVIDER_CONTINUITY_OBSERVED');}
  for(const item of state.pending){const found=(child.interactions||[]).find(x=>x.id===item.interactionId);if(found){if(found.phase!=='resolved'||found.probe===true||found.providerContext?.connected!==false||found.caseId!==item.caseId||found.finishedAt!==item.finishedAt)fail('INVALID_PROVIDER_CONTINUITY_LINEAGE');if(item.recordId!==null){const record=(child.records||[]).find(x=>x.id===item.recordId);if(!found.records?.includes(item.recordId)||!record||record.interaction!==item.interactionId)fail('INVALID_PROVIDER_CONTINUITY_RECORD');}}else if(!archivedInteraction(child,item.interactionId))fail('INVALID_PROVIDER_CONTINUITY_LINEAGE');}
  return true;
 }
 const source=()=>`const SOC_PROVIDER_CONTINUITY=(${socProviderContinuityKernel.toString()})();`;
 return {PACK,VERSION,MAX_PENDING,create,installSpares,observe,advance,synchronise,validate,source};
}
const SOC_PROVIDER_CONTINUITY=socProviderContinuityKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_CONTINUITY;
