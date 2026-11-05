'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const CUSTODY=require('../src/game/23-provider-owned-site-custody');
const C='starter-customer';
const child=s=>s.portfolio.customers.find(x=>x.id===C).root;
const project=(s,id)=>s.providerCampaign.projects.findLast(x=>x.customerId===C&&x.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function mutateCustodySnapshots(s,mutate){
 const receipt=project(s,'custody-review')?.operationReceipt?.custody;if(!receipt)return 0;
 let count=0;const visit=value=>{if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(key==='permissionSnapshot'&&item?.recordId===receipt.recordId){mutate(item);count++;}else visit(item);}};visit(s);return count;
}
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify({at:s.clock,request,blockers:q.blockers}));return send(s,{...request,quoteRevision:q.atRevision});}
function one(s){for(const c of s.providerCampaign.customers.filter(x=>x.status==='renewal'))s=send(s,{action:'renew',customerId:c.id});return SOC.dispatch(s,{type:'advance',minutes:1});}
function until(s,predicate,limit=300){for(let n=0;n<limit&&!predicate(s);n++){try{s=one(s);}catch(error){const j=s.providerCampaign.jobs.find(x=>x.resilienceSequence),work=child(s);error.message+=` [clock=${s.clock}, seq=${JSON.stringify(j&&{id:j.id,status:j.status,sequence:j.resilienceSequence,interactions:j.resilienceSequence.phases.map(p=>work.interactions.find(i=>i.id===p.interactionId)).map(i=>i&&{id:i.id,phase:i.phase,agent:i.agent,assignment:i.workforceAssignment,media:i.media,obligations:i.obligations,startedAt:i.startedAt,finishedAt:i.finishedAt})})}, jobs=${JSON.stringify(s.providerCampaign.jobs.filter(x=>x.customerId===C&&x.channel==='voice').slice(-4).map(x=>({id:x.id,status:x.status,arrivalAt:x.arrivalAt,assigned:x.assignedPersonId,interactionId:x.interactionId})))}, incidents=${JSON.stringify(s.providerCampaign.incidents.filter(x=>x.customerId===C).slice(-3).map(x=>({id:x.id,status:x.status,kind:x.kind,resource:x.resource})))}, ops=${JSON.stringify(s.providerCampaign.projects.filter(x=>x.customerId===C).slice(-6).map(x=>({op:x.operationId,status:x.status,at:x.configSubmittedAt}))) }]`;throw error;}}assert.ok(predicate(s),`not reached by ${s.clock}; transcription=${JSON.stringify(project(s,'transcription'))}; processing=${JSON.stringify(child(s).information?.jobs.slice(-5))}; records=${JSON.stringify(child(s).records.slice(-6).map(x=>({id:x.id,kind:x.kind,parents:x.parents,interaction:x.interaction,deleted:x.deleted}))) }; incidents=${JSON.stringify(s.providerCampaign.incidents.filter(x=>x.customerId===C))}; latest=${JSON.stringify(child(s).interactions.slice(-4).map(x=>({id:x.id,phase:x.phase,capture:x.capture,obligations:x.obligations,records:x.records})))}`);return s;}
function op(s,id,config){return buy(s,{action:'operation',operationId:id,customerId:C,...(config?{config}:{})});}
function repairCarrier(s){const incident=s.providerCampaign.incidents.find(i=>i.customerId===C&&i.resource==='carrier'&&['active','acknowledged'].includes(i.status));if(!incident)return s;if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});s=op(s,'repair');return until(s,x=>project(x,'repair')?.status==='complete',40);}
function opening(){let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:C})});return until(s,x=>x.providerCampaign.customers.find(c=>c.id===C).status==='active',40);}
function ownedSites(s){s=op(s,'cisco-dedicated-uc');s=until(s,x=>project(x,'cisco-dedicated-uc')?.status==='complete',80);s=op(s,'primary-upstream');s=until(s,x=>project(x,'primary-upstream')?.status==='complete',50);s=op(s,'site-diverse-ingress');s=until(s,x=>project(x,'site-diverse-ingress')?.status==='complete',50);s=op(s,'owned-site-operations');return until(s,x=>project(x,'owned-site-operations')?.status==='complete',50);}

test('AC-SOC-621 custody review performs and retains one actual paid authorized read of a processed, reviewed customer recording',()=>{
 let s=opening();
 const blocked=SOC.provider.quote(s,{action:'operation',operationId:'custody-review',customerId:C});
 assert.ok(blocked.blockers.length>0,'custody is unavailable before an actual processed, reviewed record exists');
 s=op(s,'recording');s=until(s,x=>project(x,'recording')?.status==='complete',30);s=until(s,x=>child(x).records.some(r=>r.kind==='recording'&&!r.deleted),50);s=repairCarrier(s);
 s=op(s,'transcription');s=until(s,x=>child(x).information.jobs.some(j=>j.status==='complete'&&child(x).records.some(r=>r.id===j.source&&r.kind==='recording'&&!r.deleted)&&child(x).records.some(r=>r.id===j.parent&&r.kind==='transcription'&&!r.deleted)),300);
 s=op(s,'quality');s=until(s,x=>project(x,'quality')?.status==='complete',60);
 const review=child(s).providerReviews.findLast(r=>r.projectId===project(s,'quality').id);
 assert.ok(review&&review.criteria.completeCapture&&review.criteria.caseContinuity&&review.criteria.delivered&&review.criteria.noOutstandingObligation);
 s=until(s,x=>child(x).information.jobs.some(j=>j.status==='complete'&&j.source===review.recordingId&&child(x).records.some(r=>r.id===j.parent&&r.kind==='transcription'&&!r.deleted)),300);
 const processing=child(s).information.jobs.find(j=>j.status==='complete'&&j.source===review.recordingId&&child(s).records.some(r=>r.id===j.parent&&r.kind==='transcription'&&!r.deleted)),transcript=child(s).records.find(r=>r.id===processing.parent),recording=child(s).records.find(r=>r.id===review.recordingId);
 assert.ok(recording&&recording.kind==='recording'&&transcript.interaction===review.interactionId);
 assert.ok(child(s).interactions.some(i=>i.id===review.interactionId&&i.phase==='resolved'&&i.probe!==true&&i.obligations.length===0&&i.media.in&&i.media.out));
 s=ownedSites(s);
 const direct=CUSTODY.readiness(s,C,child(s));
 const currentChild=child(s),reviewProject=s.providerCampaign.projects.find(p=>p.id===review.projectId),transProject=project(s,'transcription'),readCandidate={review,reviewProject,transProject,transcript,recording,job:processing,interaction:currentChild.interactions.find(i=>i.id===review.interactionId),caseRow:currentChild.cases[review.caseId],infoBoundary:currentChild.information?.boundary,archive:currentChild.resources?.archive,sites:currentChild.siteOperations?.sites};
 assert.equal(direct.status,'ready',JSON.stringify(readCandidate));
 const readiness=SOC.provider.quote(s,{action:'operation',operationId:'custody-review',customerId:C});
 assert.deepEqual(readiness.blockers,[],JSON.stringify({blockers:readiness.blockers,direct}));
 const before=s.business.balance.cash;
 s=send(s,{action:'operation',operationId:'custody-review',customerId:C,quoteRevision:readiness.atRevision});
 let paid=project(s,'custody-review');
 assert.ok(paid&&s.business.balance.cash<before);
 assert.equal(paid.status,'running','paid custody work has a real lead time before the read');
 assert.equal(paid.operationReceipt,undefined,'the read evidence is not minted at purchase');
 s=until(s,x=>project(x,'custody-review')?.configSubmittedAt!==null,8);
 paid=project(s,'custody-review');
 assert.ok(['commissioning','complete'].includes(paid.status),JSON.stringify(paid));
 assert.equal(paid.operationReceipt.kind,'custody-review');
 const custody=paid.operationReceipt.custody;
 assert.equal(custody.status,'ready');
 assert.equal(custody.recordId,transcript.id);
 assert.equal(custody.permissionReceiptId,custody.readReceiptId);
 assert.equal(custody.readAudit.code,'RECORD_READ');
 assert.equal(custody.readAudit.record,transcript.id);
 assert.equal(custody.readAudit.role,'supervisor');
 assert.equal(custody.readAudit.synthetic,true);
 assert.equal(custody.readAudit.at,custody.readAt);
 assert.equal(custody.readAudit.permissionSnapshot.readAt,custody.readAt);
 assert.equal(custody.readAudit.permissionSnapshot.permissionReceiptId,custody.readReceiptId);
 assert.equal(child(s).providerCustodyPins.projectId,paid.id);
 assert.deepEqual(child(s).providerCustodyPins.pins.interactionIds,[transcript.interaction]);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'the paid in-flight/complete read is validated on restore');
 s=until(s,x=>project(x,'custody-review')?.status==='complete',30);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const duplicate=SOC.provider.quote(s,{action:'operation',operationId:'custody-review',customerId:C});
 assert.ok(duplicate.blockers.includes('OWNED_SITE_CUSTODY_ALREADY_FUNDED')||duplicate.blockers.includes('OPERATION_ALREADY_FUNDED')||duplicate.blockers.includes('CUSTODY_REVIEW_ALREADY_FUNDED'),JSON.stringify(duplicate.blockers));
 const badAudit=structuredClone(s);child(badAudit).providerCustodyPins.pins.interactionIds[0]='interaction-forged';
 assert.throws(()=>SOC.restore(JSON.stringify(badAudit)),/CUSTODY_PINS|INVALID_PROVIDER_CUSTODY/);
 const badPermission=structuredClone(s);project(badPermission,'custody-review').operationReceipt.custody.readAudit.permissionSnapshot.informationEffective.region='EU';
 assert.throws(()=>SOC.restore(JSON.stringify(badPermission)),/CUSTODY|OWNED_SITE/);
 const badRead=structuredClone(s);project(badRead,'custody-review').operationReceipt.custody.readReceiptId='information-read-999999';
 assert.throws(()=>SOC.restore(JSON.stringify(badRead)),/CUSTODY|OWNED_SITE/);
 const coherentForgeries=[
  ['future information generation',snapshot=>{snapshot.informationGeneration=999;}],
  ['future archive generation',snapshot=>{snapshot.archive.generation=999;}],
  ['denied reader and foreign storage',snapshot=>{snapshot.informationDesired.readers=[];snapshot.informationEffective.readers=[];snapshot.informationDesired.storageRegions=['EU'];snapshot.informationEffective.storageRegions=['EU'];snapshot.archive.effective.access=[];snapshot.archive.effective.region='EU';}],
  ['forged recording region and access',snapshot=>{snapshot.region='EU';snapshot.access=[];}],
  ['invented service boundary',snapshot=>{snapshot.serviceBoundary={contractId:'made-up-boundary',generation:999,flowId:'made-up-flow',effective:{madeUp:true}};}]
 ];
 for(const [label,mutate] of coherentForgeries){const forged=structuredClone(s),copies=mutateCustodySnapshots(forged,mutate);assert.equal(copies,3,`${label} changes every receipt/audit copy`);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/CUSTODY|OWNED_SITE/,label);}
 const beforeUnownedDelete=JSON.stringify(s);
 assert.throws(()=>SOC.dispatch(s,{type:'information',command:{action:'remove',record:transcript.id,role:'supervisor'}}),/CAMPAIGN_AUTHORING_FORBIDDEN/);
 assert.equal(JSON.stringify(s),beforeUnownedDelete,'the Provider campaign cannot bypass its paid authority boundary with a raw record deletion');
});
