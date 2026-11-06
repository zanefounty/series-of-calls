/* Paid, resource-scoped support responsibility derived from native Provider deliveries. */
function socProviderIntegrationSupportKernel(){
 'use strict';
 const PACK='soc-provider-integration-support-1',VERSION=1;
 const UC_OPERATION='managed-uc-cc-integration',ROOM_OPERATION='integrator-room';
 const UC_TERMS=Object.freeze({setupCents:25000,periodCents:11000,workMinutes:6,engineers:0,support:2,resources:Object.freeze(['archive','engage','phone','recorder'])});
 const ROOM_TERMS=Object.freeze({setupCents:65000,periodCents:10000,workMinutes:8,engineers:1,support:1,resources:Object.freeze(['room'])});
 const UC_SCOPE=Object.freeze(['archive','engage','phone','recorder']);
 const copy=x=>x==null?x:JSON.parse(JSON.stringify(x)),plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x),int=x=>Number.isSafeInteger(x)&&x>=0;
 const exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(','),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const fail=code=>{throw new Error(code);};
 function ucApi(){return typeof SOC_PROVIDER_UC_CC_INTEGRATION!=='undefined'?SOC_PROVIDER_UC_CC_INTEGRATION:require('./23-provider-uc-cc-integration.js');}
 function responsibilityApi(){return typeof SOC_PROVIDER_RESPONSIBILITY!=='undefined'?SOC_PROVIDER_RESPONSIBILITY:require('./23-provider-responsibility.js');}
 function customer(s,customerId){return s?.providerCampaign?.customers?.find(c=>c.id===customerId)||null;}
 function rootFor(s,c,hooks={}){return typeof hooks.customerRoot==='function'?hooks.customerRoot(s,c.portfolioId):s?.portfolio?.customers?.find(x=>x.id===c.portfolioId)?.root||null;}
 function postingValid(s,p){
  const row=s.business?.ledger?.find(x=>x.id===p?.postingId);
  if(row)return row.category==='cost'&&row.providerCampaign===true&&row.reason==='provider-operation'&&row.customerId===p.customerId&&row.projectId===p.id&&row.operationId===p.operationId&&row.cents===p.setupCents;
  const n=Number(/^entry-([1-9][0-9]*)$/.exec(p?.postingId||'')?.[1]||0);return n>0&&n<=(s.business?.ledgerPrunedThrough||0);
 }
 function paidOperation(s,c,p,id,terms){
  return !!p&&p.customerId===c.id&&p.kind==='operation'&&p.operationId===id&&p.status==='complete'&&int(p.acceptedAt)&&int(p.completedAt)&&p.acceptedAt<=p.completedAt&&p.completedAt<=s.clock&&p.setupCents===terms.setupCents&&p.periodCents===terms.periodCents&&p.workMinutes===terms.workMinutes&&p.engineers===terms.engineers&&p.support===terms.support&&same([...(p.resources||[])].sort(),terms.resources)&&postingValid(s,p);
 }
 function retiredBy(p,at){return !!p?.serviceRetirement&&int(p.serviceRetirement.effectiveAt)&&p.serviceRetirement.effectiveAt<=at;}
 function activeCustomer(c,at){if(!c||!int(c.startedAt)||c.startedAt>at)return false;if(['exited','default'].includes(c.status)){const endedAt=c.status==='exited'?c.exitAt:c.defaultAt;return int(endedAt)&&at<endedAt;}return ['active','renewal'].includes(c.status);}
 function validUcDelivery(s,c,p,at,hooks){
  if(!paidOperation(s,c,p,UC_OPERATION,UC_TERMS)||p.completedAt>at||retiredBy(p,at))return null;
  const api=ucApi(),receipt=p.operationReceipt,task=receipt?.task;
  if(!task||!api.validateProject(s,p.id,hooks)||!api.validateRetainedTaskEvidence(s,p.id,task))return null;
  const edge=task.edgeId,plan=task.plan,test=task.test,quality=task.quality,delivery=task.job;
  if(edge!=='workplace-to-contact-quality'||plan?.source?.deploymentId!=='d-ms-workplace-calling'||plan?.target?.deploymentId!=='d-cisco-contact-centre'||plan?.target?.resourceId!=='recorder'||test?.result?.status!=='scenario-verified'||test.at>at||quality?.completedAt>at||delivery?.completedAt>at)return null;
  const org=s.business?.organisations?.['disco-vendor'];
  if(!org?.roles?.includes('vendor'))return null;
  const child=rootFor(s,c,hooks);
  if(at===s.clock&&UC_SCOPE.some(id=>{const r=child?.resources?.[id];return !r?.effective?.enabled||r.provisioning?.status!=='ready';}))return null;
  return {version:VERSION,adapter:'provider-uc-cc',role:'vendor',organisationId:'disco-vendor',customerId:c.id,projectId:p.id,postingId:p.postingId,acceptedAt:p.acceptedAt,effectiveAt:p.completedAt,expiresAt:null,scope:[...UC_SCOPE],terms:{setupCents:p.setupCents,periodCents:p.periodCents,workMinutes:p.workMinutes,engineers:p.engineers,support:p.support},evidence:{supplierSourceId:'uc-new:family:cisco:contact-center',supplierProductId:'d-cisco-contact-centre',testAt:test.at,sourceGeneration:test.result.sourceGeneration,targetGeneration:test.result.targetGeneration,sourceVersion:test.result.sourceVersion,targetVersion:test.result.targetVersion,jobId:delivery.id,interactionId:task.interaction.id,caseId:task.case.id,recordingId:task.recording.id,qualityProjectId:quality.projectId,qualityPostingId:quality.postingId}};
 }
 function validRoomDelivery(s,c,p,at,hooks){
  if(!paidOperation(s,c,p,ROOM_OPERATION,ROOM_TERMS)||p.completedAt>at||retiredBy(p,at))return null;
  const root=rootFor(s,c,hooks),org=s.business?.organisations?.['twig-integrations'];
  if(!root||!org?.roles?.includes('integrator')||p.expectedGenerations?.room===undefined)return null;
  const sessions=(root.information?.meetingSessions||[]).filter(m=>m.status==='completed'&&int(m.startedAt)&&int(m.endedAt)&&m.startedAt>=p.completedAt&&m.endedAt<=at&&m.roomId==='room'&&m.joinRoomGeneration===p.expectedGenerations.room);
  const meeting=sessions.at(-1);if(!meeting)return null;
  const dependency=meeting.platformDependency;if(!dependency||!int(dependency.generation)||typeof dependency.resourceId!=='string')return null;
  const owners=responsibilityApi().responsibilities(s,c.id,hooks.responsibility||hooks).records||[];
  if(at===s.clock&&!owners.some(r=>r.role==='integrator'&&r.organisationId==='twig-integrations'&&r.projectId===p.id&&r.customerId===c.id&&same(r.scope,['room'])&&r.evidence?.meetingIds?.includes(meeting.id)))return null;
  const room=root.resources?.room;
  if(at===s.clock&&(!room?.effective?.enabled||room.provisioning?.status!=='ready'))return null;
  return {version:VERSION,adapter:'provider-room',role:'integrator',organisationId:'twig-integrations',customerId:c.id,projectId:p.id,postingId:p.postingId,acceptedAt:p.acceptedAt,effectiveAt:p.completedAt,expiresAt:null,scope:['room'],terms:{setupCents:p.setupCents,periodCents:p.periodCents,workMinutes:p.workMinutes,engineers:p.engineers,support:p.support},evidence:{sourceId:'uc-new:domain:commercial-roles',resourceGeneration:p.expectedGenerations.room,meetingId:meeting.id,meetingStartedAt:meeting.startedAt,meetingEndedAt:meeting.endedAt,platformDependency:copy(dependency)}};
 }
 function derive(s,c,at,hooks={}){
  if(!activeCustomer(c,at))return [];
  const rows=[],projects=(s.providerCampaign?.projects||[]).filter(p=>p.customerId===c.id&&p.kind==='operation');
  for(const p of projects){
   if(p.operationId===UC_OPERATION){const row=validUcDelivery(s,c,p,at,hooks);if(row)rows.push(row);}
   if(p.operationId===ROOM_OPERATION){const row=validRoomDelivery(s,c,p,at,hooks);if(row)rows.push(row);}
  }
  return rows;
 }
 function supportFor(s,customerId,resourceIds,options={}){
  if(!Array.isArray(resourceIds)||resourceIds.length===0||resourceIds.some(x=>typeof x!=='string')||new Set(resourceIds).size!==resourceIds.length)fail('INVALID_PROVIDER_INTEGRATION_SUPPORT_SCOPE');
  const at=options.at??s?.clock,hooks=options.hooks||{};if(!int(at)||at>s?.clock)fail('INVALID_PROVIDER_INTEGRATION_SUPPORT_TIME');
  const c=customer(s,customerId);if(!s?.providerCampaign||!c)return {status:'blocked',at,customerId,scope:[...resourceIds],owners:[],missing:['PROVIDER_CUSTOMER_REQUIRED']};
  const rows=derive(s,c,at,hooks).filter(owner=>resourceIds.some(id=>owner.scope.includes(id)));
  const covered=new Set(rows.flatMap(x=>x.scope)),missing=resourceIds.filter(id=>!covered.has(id));
  return {pack:PACK,version:VERSION,status:missing.length?'blocked':'ready',at,customerId,scope:[...resourceIds],owners:copy(rows),missing:missing.map(id=>`PAID_SCOPED_INTEGRATION_OWNER_REQUIRED:${id}`)};
 }
 function validateOwner(s,owner,options={}){
  const at=options.at??s?.clock;if(!plain(owner)||owner.version!==VERSION||!int(at)||at>s?.clock)return false;
  const expected=derive(s,customer(s,owner.customerId),at,options.hooks||{}).find(row=>row.adapter===owner.adapter&&row.projectId===owner.projectId);
  return !!expected&&same(expected,owner);
 }
 function source(){return `const SOC_PROVIDER_INTEGRATION_SUPPORT=(${socProviderIntegrationSupportKernel.toString()})();`;}
 return {PACK,VERSION,UC_OPERATION,ROOM_OPERATION,UC_TERMS:copy(UC_TERMS),ROOM_TERMS:copy(ROOM_TERMS),supportFor,validateOwner,source};
}
const SOC_PROVIDER_INTEGRATION_SUPPORT=socProviderIntegrationSupportKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_INTEGRATION_SUPPORT;
