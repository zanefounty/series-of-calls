/* Read-only evidence adapter for paid Provider processed-record custody. */
function socProviderOwnedSiteCustodyKernel(){
 'use strict';
 const VERSION=1,PACK='provider-owned-site-custody-1';
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(x);
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function informationApi(){return typeof SOC_INFORMATION!=='undefined'?SOC_INFORMATION:(typeof require==='function'?require('./52-information.js'):null);}
 function customer(s,idValue){return s?.providerCampaign?.customers?.find(x=>x.id===idValue)||null;}
 function rootFor(s,c,child,hooks={}){return child||hooks.customerRoot?.(s,c?.portfolioId)||s?.portfolio?.customers?.find(x=>x.id===c?.portfolioId)?.root||null;}
 function project(s,c,idValue){return (s?.providerCampaign?.projects||[]).findLast(x=>x.customerId===c.id&&x.operationId===idValue&&x.kind==='operation'&&x.status==='complete'&&integer(x.completedAt))||null;}
 function retainedProject(s,c,projectId,operationId,at=Number.MAX_SAFE_INTEGER){return (s?.providerCampaign?.projects||[]).find(x=>x.id===projectId&&x.customerId===c.id&&x.operationId===operationId&&x.kind==='operation'&&x.status==='complete'&&integer(x.completedAt)&&x.completedAt<=at&&paid(s,c,x))||null;}
 function recordDescendsFrom(child,recordId,ancestorId){const byId=new Map((child.records||[]).map(row=>[row.id,row])),seen=new Set(),queue=[recordId];while(queue.length){const idValue=queue.pop();if(idValue===ancestorId)return true;if(seen.has(idValue))continue;seen.add(idValue);const row=byId.get(idValue);for(const parentId of row?.parents||[])queue.push(parentId);}return false;}
 function paid(s,c,p){if(!p||p.customerId!==c.id||p.kind!=='operation'||p.status!=='complete'||!integer(p.completedAt)||!integer(p.setupCents)||p.setupCents<1)return false;const row=s.business?.ledger?.find(x=>x.id===p.postingId);return !!row&&row.category==='cost'&&row.customerId===c.id&&row.projectId===p.id&&row.cents===p.setupCents&&row.reason==='provider-operation';}
 function infoBoundarySnapshot(child){
  const b=child.information?.boundary,r=child.resources?.archive;
  if(!b||!b.effective||b.provisioning?.status!=='ready'||b.provisioning.generation!==b.generation||!same(b.desired,b.effective)||!r||!r.effective||r.provisioning?.status!=='ready'||r.provisioning.generation!==r.generation||!same(r.desired,r.effective)||r.effective.enabled!==true)return null;
  const contractId=child.boundaries?.bindings?.archive||null,contract=contractId&&child.boundaries?.contracts?.find(x=>x.id===contractId),flow=contract?.effective?.flows?.find(x=>x.resource==='archive');
  if(contractId&&(!contract||contract.provisioning?.status!=='ready'||contract.provisioning.generation!==contract.generation||!contract.effective||!flow))return null;
  return {version:1,informationGeneration:b.generation,informationDesired:copy(b.desired),informationEffective:copy(b.effective),archive:{id:'archive',generation:r.generation,effective:copy(r.effective)},serviceBoundary:{contractId, generation:contract?.generation??null,flowId:flow?.id??null,effective:contract?.effective?copy(contract.effective):null}};
 }
 function paidLineage(s,c,child,options={}){
  const historical=options.historical===true,saved=options.permissionSnapshot,at=options.at??s.clock,acceptedAt=options.acceptedAt??at,limit=Math.min(at,acceptedAt);
  const trans=historical&&saved?.recordProjectId?retainedProject(s,c,saved.recordProjectId,'transcription',limit):project(s,c,'transcription');
  const quality=historical&&saved?.reviewProjectId?retainedProject(s,c,saved.reviewProjectId,'quality',limit):project(s,c,'quality');
  if(!paid(s,c,trans)||!paid(s,c,quality)||trans.completedAt>limit||quality.completedAt>limit||!child.information||!child.records||!Array.isArray(child.information.jobs))return null;
  const I=informationApi();if(!I)return null;
  const candidates=[];
  for(const transcript of child.records.filter(r=>r.kind==='transcription'&&integer(r.createdAt)&&r.createdAt<=limit&&(options.historical===true?(!integer(r.deletedAt)||r.deletedAt>at):!r.deleted)&&r.held!==true&&(!integer(r.expiresAt)||r.expiresAt>at))){
   const recordingId=transcript.parents?.length===1?transcript.parents[0]:null,recording=recordingId&&child.records.find(r=>r.id===recordingId&&r.kind==='recording'&&integer(r.createdAt)&&r.createdAt<=limit&&(options.historical===true?(!integer(r.deletedAt)||r.deletedAt>at):!r.deleted)&&r.held!==true&&(!integer(r.expiresAt)||r.expiresAt>at));
   if(!recording||recording.interaction!==transcript.interaction||recording.captureScope==='partial'||!recording.access?.includes('supervisor')||!transcript.access?.includes('supervisor'))continue;
   const infoJob=child.information.jobs.find(j=>j.status==='complete'&&integer(j.createdAt)&&j.createdAt<=limit&&j.source===recording.id&&j.interaction===recording.interaction&&j.stage===j.plan?.steps?.length&&j.plan?.steps?.includes('transcription')&&recordDescendsFrom(child,j.parent,transcript.id)&&integer(child.records.find(row=>row.id===j.parent)?.createdAt)&&child.records.find(row=>row.id===j.parent).createdAt<=limit);
   if(!infoJob||!integer(transcript.createdAt,trans.completedAt))continue;
   const interaction=child.interactions.find(i=>i.id===recording.interaction&&i.channel==='voice'&&i.caseId&&i.phase==='resolved'&&i.outcome==='RESOLVED'&&i.probe!==true&&i.obligations?.length===0&&i.media?.in===true&&i.media?.out===true&&i.records?.includes(recording.id)&&i.records.includes(transcript.id));
   const caseRow=interaction&&child.cases?.[interaction.caseId];if(!interaction||!caseRow?.interactions?.includes(interaction.id))continue;
   const review=(child.providerReviews||[]).find(r=>r.interactionId===interaction.id&&r.recordingId===recording.id&&r.caseId===interaction.caseId&&r.reviewer==='supervisor'&&r.basis==='observed-service-review-v1'&&r.criteria?.completeCapture===true&&r.criteria?.caseContinuity===true&&r.criteria?.delivered===true&&r.criteria?.noOutstandingObligation===true&&integer(r.at));
   const reviewProject=review&&s.providerCampaign.projects.find(p=>p.id===review.projectId&&p.postingId===review.postingId&&p.customerId===c.id&&p.operationId==='quality'&&p.kind==='operation'&&p.status==='complete'&&p.completedAt<=limit&&p.completedAt>=review.at);
   if(!reviewProject||!paid(s,c,reviewProject))continue;
   const siteRows=Object.entries(child.siteOperations?.sites||{}).filter(([,site])=>site.effective?.owner==='orchard-msp'&&site.effective.region===transcript.region&&site.provisioning?.status==='ready').map(([siteId])=>siteId).sort();
   let siteId=siteRows.find(site=>{const row=child.siteOperations.sites[site],admin=child.resources?.[row.effective.adminResource],backup=child.resources?.[row.effective.backupResource];return admin?.effective&&admin.provisioning?.status==='ready'&&backup?.effective&&backup.provisioning?.status==='ready';});
   if(historical&&saved?.siteId){
    const install=project(s,c,'owned-site-operations'),receipt=install?.operationReceipt,index=receipt?.siteIds?.indexOf(saved.siteId),logical=index===0?'head':index===1?'branch':null,site=logical&&child.siteOperations?.sites?.[saved.siteId];
    const paidOwnedInstall=!!install&&integer(install.completedAt)&&install.completedAt<=limit&&paid(s,c,install)&&receipt?.kind==='provider-owned-sites'&&receipt.version===1&&receipt.projectId===install.id&&receipt.postingId===install.postingId&&receipt.customerId===c.id&&Array.isArray(receipt.siteIds)&&receipt.siteIds.length===2&&receipt.siteIds.includes(saved.siteId)&&same(site?.effective,receipt.siteConfigs?.[logical])&&site?.effective?.owner==='orchard-msp'&&site.effective.region===transcript.region;
    siteId=paidOwnedInstall?saved.siteId:null;
   }
   const currentSnapshot=infoBoundarySnapshot(child),snapshot=historical&&saved?{informationGeneration:saved.informationGeneration,informationDesired:copy(saved.informationDesired),informationEffective:copy(saved.informationEffective),archive:copy(saved.archive),serviceBoundary:copy(saved.serviceBoundary)}:currentSnapshot;
   if(!siteId||!snapshot||snapshot.archive?.effective?.enabled!==true||!snapshot.archive.effective.access?.includes('supervisor')||snapshot.archive.effective.region!==transcript.region||snapshot.informationEffective?.storageRegions?.includes(transcript.region)!==true||snapshot.informationEffective?.readers?.includes('supervisor')!==true||options.historical!==true&&!I.canRead(child,transcript,'supervisor',transcript.region))continue;
   candidates.push({record:transcript,recording,interaction,caseRow,job:infoJob,transProject:trans,review,reviewProject,siteId,permissionBase:{version:VERSION,role:'supervisor',recordId:transcript.id,region:transcript.region,access:[...transcript.access].sort(),sourceRecordingId:recording.id,interactionId:interaction.id,caseId:interaction.caseId,processingJobId:infoJob.id,recordProjectId:trans.id,reviewProjectId:reviewProject.id,reviewedAt:review.at,siteId,...snapshot}});
  }
  return candidates.sort((a,b)=>a.review.at-b.review.at||a.record.id.localeCompare(b.record.id))[0]||null;
 }
 function readiness(s,customerId,childValue,hooks={},options={}){
  const c=customer(s,customerId),child=c&&rootFor(s,c,childValue,hooks);
  if(!c||!child||child.providerCustomer?.id!==c.id||child.providerCustomer?.version!==1||!child.siteOperations)return {status:'incomplete',missing:['VALIDATED_PROVIDER_SITE_CUSTOMER_REQUIRED'],candidate:null};
  const row=paidLineage(s,c,child,options);if(!row)return {status:'incomplete',missing:['PAID_TRANSCRIPT_QUALITY_REVIEW_AND_SITE_RECORD_REQUIRED'],candidate:null};
  return {status:'ready',missing:[],candidate:{version:VERSION,customerId:c.id,recordId:row.record.id,processingJobId:row.job.id,recordProjectId:row.transProject.id,reviewProjectId:row.reviewProject.id,permissionSnapshot:copy(row.permissionBase),siteId:row.siteId,region:row.record.region,reviewedAt:row.review.at}};
 }
 function readAuditId(value){const match=/^information-read-([1-9]\d*)$/.exec(value||'');return match?Number(match[1]):null;}
 function historicalPermissionMatches(s,customerId,child,evidence,hooks){
  if(typeof hooks?.permissionSnapshotAt!=='function')return false;
  const expected=hooks.permissionSnapshotAt(s,customerId,child,evidence.readAt,{recordId:evidence.recordId,role:'supervisor',region:evidence.region,access:evidence.permissionSnapshot?.access,siteId:evidence.siteId,recordProjectId:evidence.recordProjectId,reviewProjectId:evidence.reviewProjectId});
  if(!exact(expected,['informationGeneration','informationDesired','informationEffective','archive','serviceBoundary','canRead'])||expected.canRead!==true||!integer(expected.informationGeneration,1)||!expected.informationDesired||!expected.informationEffective||!exact(expected.archive,['id','generation','effective'])||expected.archive.id!=='archive'||!integer(expected.archive.generation,1)||!expected.archive.effective||expected.serviceBoundary!==null&&!exact(expected.serviceBoundary,['contractId','generation','flowId','effective']))return false;
  const snapshot=evidence.permissionSnapshot,base={informationGeneration:snapshot.informationGeneration,informationDesired:snapshot.informationDesired,informationEffective:snapshot.informationEffective,archive:snapshot.archive,serviceBoundary:snapshot.serviceBoundary};
  const {canRead,...expectedSnapshot}=expected;
  return same(base,expectedSnapshot);
 }
 function completeRead(s,customerId,childValue,paidProject,candidate,hooks={}){
  const c=customer(s,customerId),child=c&&rootFor(s,c,childValue,hooks),ready=readiness(s,customerId,child,hooks);
  if(!ready.candidate||!same(ready.candidate,candidate)||!paidProject||paidProject.customerId!==customerId||paidProject.operationId!=='custody-review'||paidProject.kind!=='operation'||!['running','commissioning','complete'].includes(paidProject.status))return null;
  const expected={action:'read',record:candidate.recordId,role:'supervisor',region:candidate.region};
  const audit=child.information?.audit?.findLast(a=>a.code==='RECORD_READ'&&a.record===expected.record&&a.role===expected.role&&integer(a.at)&&a.at>=Math.max(candidate.reviewedAt,paidProject.acceptedAt)&&a.at<=s.clock&&a.permissionSnapshot);
  if(!audit)return null;
  const receiptId=`information-read-${audit.auditId}`;
  const permissionSnapshot={...copy(audit.permissionSnapshot),readAt:audit.at,permissionReceiptId:receiptId};
  if(!same(audit.permissionSnapshot,{...candidate.permissionSnapshot,readAt:audit.at,permissionReceiptId:receiptId}))return null;
  const receipt={status:'ready',customerId,recordId:candidate.recordId,processingJobId:candidate.processingJobId,recordProjectId:candidate.recordProjectId,reviewProjectId:candidate.reviewProjectId,permissionReceiptId:receiptId,readReceiptId:receiptId,reviewedAt:candidate.reviewedAt,readAt:audit.at,readAudit:copy(audit),siteId:candidate.siteId,region:candidate.region,permissionSnapshot};
  return validateRead(s,customerId,child,paidProject,receipt,hooks,{historical:false})?receipt:null;
 }
 function validateRead(s,customerId,childValue,paidProject,evidence,hooks={},options={}){
  const historical=options.historical===true,c=customer(s,customerId),child=c&&rootFor(s,c,childValue,hooks),lineage=c&&child&&paidLineage(s,c,child,{historical,at:evidence?.readAt,acceptedAt:paidProject?.acceptedAt,permissionSnapshot:evidence?.permissionSnapshot}),candidateResult=readiness(s,customerId,child,hooks,{historical,at:evidence?.readAt,acceptedAt:paidProject?.acceptedAt,permissionSnapshot:evidence?.permissionSnapshot}),candidate=candidateResult.candidate;
  const keys=['status','customerId','recordId','processingJobId','recordProjectId','reviewProjectId','permissionReceiptId','readReceiptId','reviewedAt','readAt','readAudit','siteId','region','permissionSnapshot'];
  if(!c||!child||!exact(evidence,keys)||evidence.status!=='ready'||evidence.customerId!==customerId||!candidate||evidence.recordId!==candidate.recordId||evidence.processingJobId!==candidate.processingJobId||evidence.recordProjectId!==candidate.recordProjectId||evidence.reviewProjectId!==candidate.reviewProjectId||evidence.reviewedAt!==candidate.reviewedAt||evidence.siteId!==candidate.siteId||evidence.region!==candidate.region||!integer(evidence.readAt,evidence.reviewedAt)||evidence.readAt>s.clock||evidence.readReceiptId!==evidence.permissionReceiptId||!paidProject||paidProject.customerId!==customerId||paidProject.operationId!=='custody-review'||!['running','commissioning','complete'].includes(paidProject.status)||evidence.readAt<paidProject.acceptedAt)return false;
  const snapshot=evidence.permissionSnapshot;if(!lineage||!exact(snapshot,['version','role','recordId','region','access','sourceRecordingId','interactionId','caseId','processingJobId','recordProjectId','reviewProjectId','reviewedAt','siteId','informationGeneration','informationDesired','informationEffective','archive','serviceBoundary','readAt','permissionReceiptId'])||snapshot.version!==VERSION||snapshot.role!=='supervisor'||snapshot.recordId!==candidate.recordId||snapshot.region!==evidence.region||!same(snapshot.access,[...lineage.record.access].sort())||snapshot.sourceRecordingId!==lineage.recording.id||snapshot.interactionId!==lineage.interaction.id||snapshot.caseId!==lineage.interaction.caseId||snapshot.processingJobId!==lineage.job.id||snapshot.recordProjectId!==lineage.transProject.id||snapshot.reviewProjectId!==lineage.reviewProject.id||snapshot.reviewedAt!==lineage.review.at||snapshot.siteId!==candidate.siteId||snapshot.readAt!==evidence.readAt||snapshot.permissionReceiptId!==evidence.permissionReceiptId)return false;
  const base={...snapshot};delete base.readAt;delete base.permissionReceiptId;
  if(historical){if(!historicalPermissionMatches(s,customerId,child,evidence,hooks))return false;}
  else {const expected=candidate.permissionSnapshot;if(!same(base,expected))return false;}
  const auditId=readAuditId(evidence.readReceiptId),audit=child.information?.audit?.find(a=>a.auditId===auditId);
  if(!exact(evidence.readAudit,['at','auditId','code','permissionSnapshot','record','role','region','synthetic'])||evidence.readAudit.auditId!==auditId||evidence.readAudit.code!=='RECORD_READ'||evidence.readAudit.record!==evidence.recordId||evidence.readAudit.role!=='supervisor'||evidence.readAudit.region!==evidence.region||evidence.readAudit.synthetic!==true||evidence.readAudit.at!==evidence.readAt||!same(evidence.readAudit.permissionSnapshot,snapshot))return false;
  if(audit?!same(audit,evidence.readAudit):auditId>(child.information.auditPrunedThrough||0))return false;
  if(!historical){const I=informationApi(),record=child.records?.find(r=>r.id===evidence.recordId);if(!I?.canRead(child,record,'supervisor',evidence.region))return false;}
  return true;
 }
 function validateCustomer(s,customerId,child,hooks={}){
  const c=customer(s,customerId);if(!c||rootFor(s,c,child,hooks)!==child||child.providerCustomer?.id!==customerId)return false;
  const rows=(s.providerCampaign.projects||[]).filter(p=>p.customerId===customerId&&p.operationId==='custody-review'&&p.configSubmittedAt!==null&&!['cancelled','blocked'].includes(p.status));
  return rows.every(p=>{
   const r=p.operationReceipt,complete=p.status==='complete';
   return ['running','commissioning','complete'].includes(p.status)&&r?.kind==='custody-review'&&exact(r,['kind','version','projectId','postingId','customerId','custody','completedAt'])&&r.version===VERSION&&r.projectId===p.id&&r.postingId===p.postingId&&r.customerId===customerId&&integer(r.completedAt,p.acceptedAt,s.clock)&&(!complete||r.completedAt<=p.completedAt)&&validateRead(s,customerId,child,p,r.custody,hooks,{historical:complete});
  });
 }
 function retentionPins(evidence){
  const s=evidence?.permissionSnapshot;if(!s)return {interactionIds:[],caseIds:[],processingJobIds:[],recordIds:[],auditIds:[],projectIds:[]};
  return {interactionIds:[s.interactionId],caseIds:[s.caseId],processingJobIds:[s.processingJobId],recordIds:[s.recordId,s.sourceRecordingId],projectIds:[evidence.recordProjectId,evidence.reviewProjectId].filter(Boolean)};
 }
 function source(){return `const SOC_PROVIDER_OWNED_SITE_CUSTODY=(${socProviderOwnedSiteCustodyKernel.toString()})();`;}
 return {PACK,VERSION,readiness,completeRead,validateRead,validateCustomer,retentionPins,source};
}
const SOC_PROVIDER_OWNED_SITE_CUSTODY=socProviderOwnedSiteCustodyKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_OWNED_SITE_CUSTODY;
