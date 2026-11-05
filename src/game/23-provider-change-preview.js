/* Read-only migration consequences. Quotes and dispatch remain authoritative. */
function socProviderChangePreviewKernel(){
 'use strict';
 const VERSION=1,OPERATIONS=['migration','migration-consolidated'];
 const copy=x=>JSON.parse(JSON.stringify(x));
 const currentPlatform=(root,id)=>root.operations?.placements?.[id]||'phone';
 function rulesFor(hooks){return hooks.rules?.data||hooks.rules||(typeof SOC_PROVIDER_RULES!=='undefined'?SOC_PROVIDER_RULES.data:typeof require==='function'?require('./24-provider-rules.js').data:null);}
 function operationRemaining(project,from,to){
  let cents=0;
  // Match the campaign settlement's cumulative-cent allocation, including its
  // legacy per-period truncation; do not round every remaining minute upward.
  for(let at=from;at<to;){const boundary=Math.min(to,(Math.floor(at/60)+1)*60),started=project.completedAt??boundary,end=Math.max(started,Math.min(boundary,to)),begin=Math.max(started,Math.min(at,end));cents+=project.minimumTermPeriods!==undefined?Math.floor(project.periodCents*(end-started)/60)-Math.floor(project.periodCents*(begin-started)/60):Math.floor(project.periodCents*(end-begin)/60);at=boundary;}
  return cents;
 }
 function terms(parent,customer,project,rules){
  const stage=project.kind==='stage'?customer.stages[project.stage]:null,minimumTermPeriods=stage?rules?.plans?.[customer.planId]?.minimumPeriods??null:project.minimumTermPeriods??null;
  const commitmentEndsAt=stage&&minimumTermPeriods!==null?stage.acceptedAt+minimumTermPeriods*60:project.retirement?.commitmentEndsAt??(minimumTermPeriods!==null?(project.completedAt??Math.max(parent.clock,project.dueAt))+minimumTermPeriods*60:null);
  const remainingMinimumCents=stage?(commitmentEndsAt===null?null:Math.ceil(stage.periodCents*Math.max(0,commitmentEndsAt-parent.clock)/60)):project.configSubmittedAt===null||commitmentEndsAt===null?0:project.status==='complete'?operationRemaining(project,parent.clock,commitmentEndsAt):project.periodCents*(minimumTermPeriods||0);
  return {id:project.id,kind:project.kind,operationId:project.operationId,stage:project.stage,status:project.status,setupCents:project.setupCents,periodCents:project.periodCents,postingId:project.postingId,minimumTermPeriods,commitmentEndsAt,remainingMinimumCents,retirement:project.retirement?copy(project.retirement):null};
 }
 function preview(parent,customerId,operationId,hooks={}){
  if(!OPERATIONS.includes(operationId))return null;
  const campaign=parent?.providerCampaign,customer=campaign?.customers?.find(c=>c.id===customerId),root=parent?.portfolio?.customers?.find(c=>c.id===customerId)?.root;
  if(!customer||!root)return null;
  const consolidated=operationId==='migration-consolidated',cohort=consolidated?['alex','bea']:['bea'],target=consolidated?'phone':'migration-phone';
  // Legacy operations also refreshed phone configuration. Do not present that
  // as the opt-in retained-platform coexistence contract.
  const replacedPlatforms=consolidated||campaign.meetingDependencyVersion!==1?['phone']:[];
  const identity=root.resources.identity?.effective;
  const identities=cohort.map(id=>({id,present:identity?.identities?.includes(id)===true,entitled:identity?.entitled?.includes(id)===true,currentPlatform:currentPlatform(root,id),targetPlatform:target,numbers:(root.operations?.numbers||[]).filter(n=>n.holder===id).map(n=>({number:n.number,status:n.status,holder:n.holder}))}));
  const calls=(root.interactions||[]).filter(i=>i.channel==='voice'&&!i.probe&&['queued','handling','connected','shared-active'].includes(i.phase)).map(i=>{
   const traces=i.trace||[],holder=[...traces].reverse().find(t=>t.code==='INBOUND_NUMBER_ACCEPTED')?.holder,platform=i.voicePath?.platform||[...traces].reverse().find(t=>typeof t.platform==='string')?.platform||null;
   const affectedIdentities=cohort.filter(id=>id===i.from||id===i.to||id===holder),reasons=[];
   if(affectedIdentities.length)reasons.push('COHORT_PLACEMENT_CHANGE');
   if(replacedPlatforms.includes(platform))reasons.push('DECLARED_PLATFORM_RECONFIGURED');
   return {id:i.id,caseId:i.caseId||null,phase:i.phase,direction:i.direction||'outbound',from:i.from,to:i.to,platform,affectedIdentities,reasons,reservationHeld:i.capture?.status==='reserved'&&(root.captureReservations||[]).some(r=>r.id===i.id)};
  });
  const profile=root.information?.meeting?.effective,dependency=profile?.platformDependency||null,resource=dependency?root.resources[dependency.resourceId]:null;
  const roomSessions=(root.information?.meetingSessions||[]).filter(m=>m.status==='active'&&!m.probe&&!m.nonCommercial).map(m=>({id:m.id,bookingId:m.bookingId||null,startedAt:m.startedAt,endsAt:m.endsAt,platformDependency:m.platformDependency?copy(m.platformDependency):null,reservationHeld:m.reservationHeld===true,reasons:m.platformDependency&&replacedPlatforms.includes(m.platformDependency.resourceId)?['DECLARED_PLATFORM_RECONFIGURED']:[]}));
  const rules=rulesFor(hooks),projects=(campaign.projects||[]).filter(p=>p.customerId===customerId&&p.status!=='cancelled').map(p=>terms(parent,customer,p,rules));
  return {version:VERSION,customerId,operationId,asOf:parent.clock,revision:parent.revision,mode:consolidated?'consolidated':'coexistence',target:{id:target,kind:'dedicated',generation:root.resources[target]?.generation??null},cohort:identities,replacedPlatforms,activeCalls:calls.filter(c=>c.reasons.length),unaffectedActiveCallIds:calls.filter(c=>!c.reasons.length).map(c=>c.id),room:{profilePresent:!!profile,dependency:dependency?copy(dependency):null,currentGeneration:resource?.generation??null,disposition:!dependency?'unproven':replacedPlatforms.includes(dependency.resourceId)?'reconfigured':'retained',activeSessions:roomSessions},obligations:{unchanged:true,projects,remainingMinimumCents:projects.some(p=>p.remainingMinimumCents===null)?null:projects.reduce((n,p)=>n+p.remainingMinimumCents,0)},proofRequired:{commissionedTarget:true,cohortPlacements:cohort,assignedNumbers:cohort,outboundCalls:campaign.contentVersion!=='provider-campaigns-1'?cohort:[],inboundCalls:campaign.enterpriseContinuityVersion===1?cohort:[],contactContext:true,roomGeneration:campaign.meetingDependencyVersion===1,afterActualCutover:true},timing:{snapshotOnly:true,guaranteedOutageMinutes:null}};
 }
 function comparison(parent,customerId,hooks={}){return OPERATIONS.map(id=>preview(parent,customerId,id,hooks)).filter(Boolean);}
 function source(){return `const SOC_PROVIDER_CHANGE_PREVIEW=(${socProviderChangePreviewKernel.toString()})();`;}
 return {VERSION,preview,comparison,source};
}
const SOC_PROVIDER_CHANGE_PREVIEW=socProviderChangePreviewKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_CHANGE_PREVIEW;
