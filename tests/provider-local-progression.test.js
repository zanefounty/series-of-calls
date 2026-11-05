'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const localFacts=require('../src/game/23-provider-local-progression.js');
const cid='starter-customer';
const child=s=>s.portfolio.customers.find(x=>x.id===cid).root;
const tick=(s,n=1)=>SOC.dispatch(s,{type:'advance',minutes:n});
const request=operationId=>({action:'operation',operationId,customerId:cid});
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,command,blockers:q.blockers}));return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
function until(s,predicate,limit=160){for(let n=0;n<limit&&!predicate(s);n++)s=tick(s);assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
function project(s,operationId){return s.providerCampaign.projects.findLast(x=>x.customerId===cid&&x.operationId===operationId);}
function commission(){
 let s=SOC.create({experience:'campaign',scenario:'defence',seed:73,market:'au-sydney'});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:cid})});
 return until(s,x=>x.providerCampaign.customers[0].status==='active',30);
}
function fundedLocal(includeSpeech=true){
 let s=commission();
 for(const op of ['recording',...(includeSpeech?['transcription']:[]),'local-deployment']){
  s=buy(s,request(op));s=until(s,x=>project(x,op)?.status==='complete',100);
 }
 return s;
}
function activeIncident(s){return s.providerCampaign.incidents.find(x=>x.customerId===cid&&x.kind==='disconnection'&&['active','acknowledged'].includes(x.status));}
function localCall(s,after=0){return s.providerCampaign.jobs.find(j=>j.customerId===cid&&j.channel==='voice'&&j.completedAt>after&&['completed','late'].includes(j.status)&&child(s).interactions.some(i=>i.id===j.interactionId&&i.providerContext?.connected===false&&i.phase==='resolved'));}
function actualProofState(includeSpeech=true){
 let s=fundedLocal(includeSpeech);
 s=until(s,activeIncident,30);
 s=until(s,x=>SOC.observe(child(x),'local').reasons.includes('LOCAL_AUTONOMY_EXHAUSTED'),40);
 const failedAutonomy=x=>x.providerCampaign.jobs.some(j=>j.customerId===cid&&j.channel==='voice'&&j.status==='failed'&&child(x).interactions.some(i=>i.id===j.interactionId&&i.phase==='failed'&&i.providerContext?.connected===false&&i.finishedAt>=activeIncident(x).activatedAt+30));
 s=until(s,failedAutonomy,8);
 const failed=s.providerCampaign.jobs.find(j=>j.customerId===cid&&j.channel==='voice'&&j.status==='failed'&&child(s).interactions.some(i=>i.id===j.interactionId&&i.phase==='failed'&&i.providerContext?.connected===false&&i.finishedAt>=activeIncident(s).activatedAt+30));
 assert.ok(failed,'an actual offline call fails after local autonomy is exhausted');
 s=buy(s,request('local-spares'));s=until(s,x=>project(x,'local-spares')?.status==='complete',40);
 s=until(s,x=>localCall(x,project(x,'local-spares').completedAt),80);
 const incident=activeIncident(s);assert.ok(incident);
 s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
 s=buy(s,request('repair'));s=until(s,x=>project(x,'repair')?.status==='complete',40);
 s=until(s,x=>x.providerCampaign.jobs.some(j=>j.customerId===cid&&j.channel==='voice'&&['completed','late'].includes(j.status)&&child(x).interactions.some(i=>i.id===j.interactionId&&i.providerContext?.connected===true&&i.phase==='resolved')),40);
 s=buy(s,request('sync-all'));s=until(s,x=>project(x,'sync-all')?.status==='complete',40);
 return s;
}

test('campaign CA evidence stays incomplete before funded, observed local work and pure evaluation does not mutate the save',()=>{
 const s=commission(),before=JSON.stringify(s),result=localFacts.evaluate(s,cid);
 assert.equal(result.sourceId,'progress.goal.ca');assert.equal(result.status,'incomplete');
 assert.ok(result.missing.includes('PAID_LOCAL_DEPLOYMENT_REQUIRED'));
 assert.equal(JSON.stringify(s),before);
});

test('actual Defence local speech path requires funded controls, a real exhaustion failure, spares recovery and per-item paid reconciliation',()=>{
 const s=actualProofState(),before=JSON.stringify(s),result=localFacts.evaluate(s,cid);
 assert.equal(result.status,'ready',JSON.stringify(result.missing));
 assert.equal(result.evidence.kind,'provider-local-speech');
 assert.ok(result.evidence.offline.elapsedMinutes<result.evidence.offline.autonomyMinutes);
 assert.equal(result.evidence.projects.spares.operationId,'local-spares');
 assert.equal(result.evidence.reconciliation.item.interactionId,result.evidence.offline.interactionId);
 assert.equal(result.evidence.speech.processRegion,'AU');assert.equal(result.evidence.speech.storageRegion,'AU');
 assert.ok(result.evidence.speech.processingJobId);assert.equal(JSON.stringify(s),before,'facts are read only');
 assert.equal(localFacts.validateEvidence(s,cid,result.evidence),true);
 assert.equal(localFacts.validateEvidence(s,cid,result.evidence,{}, {historical:true}),true);
 const pins=localFacts.retentionPins(result.evidence);
 assert.deepEqual(Object.keys(pins).sort(),['caseIds','incidentIds','interactionIds','jobIds','processingJobIds','projectIds','recordIds'].sort());
 assert.ok(pins.interactionIds.includes(result.evidence.offline.interactionId));
 assert.ok(pins.processingJobIds.includes(result.evidence.speech.processingJobId));
 assert.equal(result.evidence.market,'au-sydney');
 const forged=structuredClone(result.evidence);forged.speech.processRegion='US';assert.equal(localFacts.validateEvidence(s,cid,forged),false);
 const forgedMarket=structuredClone(result.evidence);forgedMarket.market='eu-berlin';assert.equal(localFacts.validateEvidence(s,cid,forgedMarket),false);
 const missingItem=structuredClone(s);const receipt=project(missingItem,'sync-all').operationReceipt;receipt.items=receipt.items.filter(x=>x.interactionId!==result.evidence.offline.interactionId);
 assert.equal(localFacts.evaluate(missingItem,cid).status,'incomplete','aggregate sync counters cannot replace an item receipt');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 let upgraded=buy(s,request('local-deployment'));upgraded=until(upgraded,x=>project(x,'local-deployment')?.status==='complete'&&project(x,'local-deployment').id!==result.evidence.projects.localDeployment.projectId,40);
 assert.equal(localFacts.validateEvidence(upgraded,cid,result.evidence,{}, {historical:true}),true,'a later paid generation cannot erase actual earlier local evidence');
 const expired=structuredClone(s),expiredChild=child(expired),claimedAt=s.clock;
 const expiringIds=[result.evidence.offline.recordId,result.evidence.speech.recordingRecordId,result.evidence.speech.transcriptionRecordId].filter(Boolean);
 for(const recordId of expiringIds){const record=expiredChild.records.find(x=>x.id===recordId);assert.ok(record&&record.expiresAt>claimedAt);record.deleted=true;record.deletedAt=record.expiresAt;}
 assert.equal(localFacts.validateEvidence(expired,cid,result.evidence,{}, {historical:true,claimedAt}),true,'a post-claim retention tombstone preserves earned evidence');
 for(const recordId of expiringIds){const record=expiredChild.records.find(x=>x.id===recordId);record.deletedAt=claimedAt;}
 assert.equal(localFacts.validateEvidence(expired,cid,result.evidence,{}, {historical:true,claimedAt}),false,'a record deleted at or before claim time cannot support an award');
});

test('voice-only local media work remains partial and cannot earn the transcription achievement',()=>{
 const s=actualProofState(false),result=localFacts.evaluate(s,cid);
 assert.equal(result.status,'incomplete',JSON.stringify(result.missing));assert.equal(result.evidence,null);
 assert.ok(result.missing.includes('PAID_LOCAL_TRANSCRIPTION_OF_RETAINED_RECORDING_REQUIRED'));
 assert.equal(project(s,'transcription'),undefined);
 const speechEvidence={kind:'provider-local-voice',version:1,sourceId:'progress.goal.ca'};
 assert.equal(localFacts.validateEvidence(s,cid,speechEvidence),false);
});

test('helper source is self contained for the deterministic worker',()=>{
 const source=localFacts.source();assert.match(source,/SOC_PROVIDER_LOCAL_PROGRESSION/);
 const worker=new Function(`${source};return SOC_PROVIDER_LOCAL_PROGRESSION;`)();
 const s=commission();assert.deepEqual(worker.evaluate(s,cid),localFacts.evaluate(s,cid));
});
