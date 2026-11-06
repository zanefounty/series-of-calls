const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const CUSTOMER='starter-customer';
const clone=x=>JSON.parse(JSON.stringify(x));
const child=s=>s.portfolio.customers.find(c=>c.id===CUSTOMER).root;
function command(s,c,requestId){return SOC.dispatch(s,{type:'provider',...(requestId?{requestId}:{}),command:c});}
function buy(s,c){const q=SOC.provider.quote(s,c);assert.deepEqual(q.blockers,[],JSON.stringify(c));return command(s,{...c,quoteRevision:q.atRevision});}
function tick(s){
 s=SOC.dispatch(s,{type:'advance',minutes:1});
 const incident=s.providerCampaign.incidents.find(i=>i.customerId===CUSTOMER&&['active','acknowledged'].includes(i.status));
 if(incident&&!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){
  if(incident.status==='active')s=command(s,{action:'acknowledge-incident',incidentId:incident.id});
  const c={action:'operation',operationId:'repair',customerId:CUSTOMER};
  if(!SOC.provider.quote(s,c).blockers.length)s=buy(s,c);
 }
 return s;
}
function until(s,predicate,limit=180){for(let n=0;n<limit&&!predicate(s);n++)s=tick(s);assert.ok(predicate(s),'bounded actual delivery');return s;}
function opening(withProduct=true,options={}){
 let s=SOC.create({experience:'campaign',scenario:'smb',seed:17,...options});
 s=command(s,{action:'staff',engineers:4,support:4});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
 s=until(s,s=>s.providerCampaign.customers[0].status==='active');
 if(!withProduct)return s;
 s=buy(s,{action:'operation',operationId:'cisco-programmable-engagement',customerId:CUSTOMER});
 return until(s,s=>s.providerCampaign.projects.some(p=>p.operationId==='cisco-programmable-engagement'&&p.status==='complete'));
}
function handoffOffer(s){for(const j of s.providerCampaign.jobs.filter(j=>j.handoffPlan&&!j.handoff&&j.status==='pending')){const request={action:'handoff-case',customerId:CUSTOMER,jobId:j.id,connectorId:'social-messaging'},q=SOC.provider.quote(s,request);if(!q.blockers.length)return {job:j,request,q};}return null;}
function worker(s,c){let result;const context={postMessage:r=>{result=r;},setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:1,state:clone(s),command:c}});assert.equal(result.error,undefined);return clone(result.state);}


let earnedFollowup;
function operation(s,operationId,config){return buy(s,{action:'operation',customerId:CUSTOMER,operationId,...(config?{config}:{})});}
function nextFollowup(s,predicate=()=>true){for(const j of s.providerCampaign.jobs.filter(j=>j.followup&&j.status==='pending'&&!j.followup.attempts.length&&predicate(j))){const request={action:'followup-case',customerId:CUSTOMER,jobId:j.id},q=SOC.provider.quote(s,request);if(!q.blockers.length)return {job:j,request,q};}return null;}
test('AC-SOC-710 actual paid Provider voice and human digital follow-up conserve one case and settle both metered legs before L8 claim and managed delivery',()=>{
 let s=opening(),request={action:'operation',customerId:CUSTOMER,operationId:'managed-case-followup'};
 assert.ok(SOC.provider.quote(s,request).blockers.includes('FOLLOWUP_EARNED_MARKET_REQUIRED'));
 const startCash=s.business.balance.cash;s=operation(s,'direct-case-followup');assert.equal(startCash-s.business.balance.cash,18000);
 s=until(s,s=>s.providerCampaign.projects.some(p=>p.operationId==='direct-case-followup'&&p.status==='complete'));
 s=until(s,s=>!!nextFollowup(s),150);const {job,request:follow,q}=nextFollowup(s),source=child(s).interactions.find(i=>i.id===job.interactionId),cash=s.business.balance.cash;
 assert.equal(source.phase,'resolved');assert.ok(source.agent);assert.equal(job.status,'pending');assert.equal(job.deadlineAt,job.arrivalAt+20);assert.equal(s.providerCampaign.customers[0].period.demandPlan.result.totalCases,24);
 assert.ok(s.providerCampaign.customers[0].period.demandPlan.result.actualVoiceCount>=12);
 assert.throws(()=>command(SOC.dispatch(s,{type:'advance',minutes:1}),{...follow,quoteRevision:q.atRevision}),/STALE_PROVIDER_QUOTE/);
 s=command(s,{...follow,quoteRevision:q.atRevision},'provider-1');assert.equal(s.business.balance.cash,cash);
 assert.deepEqual(command(s,{...follow,quoteRevision:q.atRevision},'provider-1'),s);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 assert.deepEqual(worker(s,{type:'advance',minutes:1}),SOC.dispatch(s,{type:'advance',minutes:1}));
 s=until(s,s=>s.providerCampaign.jobs.find(j=>j.id===job.id).status==='completed',20);
 const done=s.providerCampaign.jobs.find(j=>j.id===job.id),target=child(s).interactions.find(i=>i.id===done.followup.attempts[0].interactionId);
 assert.ok(SOC.provider.inspect(s).customers.find(c=>c.id===CUSTOMER).journeys.some(j=>j.id===done.id&&j.status==='completed'),'completed follow-up remains visible after newer cases arrive');assert.equal(done.messageUnits,1);assert.equal(done.voiceMinutes,source.usageMinutes);assert.ok(target.agent);assert.equal(target.caseId,source.caseId);assert.equal(target.from,source.from);assert.equal(target.phase,'resolved');assert.equal(s.providerCampaign.jobs.filter(j=>j.caseId===job.caseId).length,1);
 s=until(s,s=>s.clock>=(job.periodIndex+1)*60,60);assert.equal(s.providerCampaign.jobs.find(j=>j.id===job.id).settled,true);
 const rows=s.providerCampaign.jobs.filter(j=>j.customerId===CUSTOMER&&j.periodIndex===job.periodIndex),h=s.providerCampaign.customers[0].history.find(h=>h.period===job.periodIndex);
 assert.equal(rows.length,24);assert.equal(h.due,24);assert.equal(h.messages,rows.reduce((n,j)=>n+(j.followup?j.messageUnits:j.messageCharged?1:0),0));assert.equal(h.messageCost,h.messages*75);assert.equal(h.voiceCost,h.voiceMinutes*50);
 const facts=SOC.provider.inspect(s).progression,claimCash=s.business.balance.cash;
 const row=facts.claims.rows.find(x=>x.sourceId==='progress.progression-level.8');assert.equal(row.status,'ready',JSON.stringify(row));
 s=command(s,{action:'claim-progression',sourceId:'progress.progression-level.8',quoteRevision:s.revision});assert.equal(s.business.balance.cash,claimCash);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=clone(s);forged.providerCampaign.jobs.find(j=>j.id===job.id).messageUnits++;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/FOLLOWUP/);
 s=operation(s,'managed-case-followup');assert.equal(claimCash-s.business.balance.cash,9000);
 s=until(s,s=>s.providerCampaign.projects.some(p=>p.operationId==='managed-case-followup'&&p.status==='complete'),20);const managed=s.providerCampaign.projects.find(p=>p.operationId==='managed-case-followup'&&p.status==='complete');assert.ok(managed.completedAt>=managed.acceptedAt+managed.workMinutes);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);earnedFollowup=clone(s);
 // A new authored period must capture the completed managed workflow at its own
 // arrival. The older direct workflow remains pinned to the already-earned case.
 s=until(s,s=>s.clock>=120,120);s=until(s,s=>!!nextFollowup(s,j=>j.periodIndex>=2&&j.followup.workflow.projectId===managed.id),100);
 const fresh=nextFollowup(s,j=>j.periodIndex>=2&&j.followup.workflow.projectId===managed.id),freshJob=fresh.job,freshSource=child(s).interactions.find(i=>i.id===freshJob.interactionId),freshWorkflow=freshJob.followup.workflow;
 assert.ok(freshJob.arrivalAt>managed.completedAt);assert.equal(freshWorkflow.projectId,managed.id);assert.equal(freshWorkflow.operationId,'managed-case-followup');assert.equal(freshWorkflow.completedAt,managed.completedAt);assert.equal(freshJob.deadlineAt,freshJob.arrivalAt+20);assert.equal(freshSource.phase,'resolved');assert.ok(freshSource.agent);assert.equal(s.providerCampaign.jobs.filter(j=>j.caseId===freshJob.caseId).length,1);
 const freshCash=s.business.balance.cash,freshRequestId=`provider-${s.providerRequestSequence+1}`;s=command(s,{...fresh.request,quoteRevision:fresh.q.atRevision},freshRequestId);assert.equal(s.business.balance.cash,freshCash);assert.deepEqual(command(s,{...fresh.request,quoteRevision:fresh.q.atRevision},freshRequestId),s);
 s=until(s,s=>s.providerCampaign.jobs.find(j=>j.id===freshJob.id).status==='completed',20);const freshDone=s.providerCampaign.jobs.find(j=>j.id===freshJob.id),freshDigital=child(s).interactions.find(i=>i.id===freshDone.followup.attempts[0].interactionId);
 assert.equal(freshDone.followup.workflow.projectId,managed.id);assert.equal(freshDone.followup.workflow.operationId,'managed-case-followup');assert.equal(freshDone.caseId,freshSource.caseId);assert.equal(freshDigital.caseId,freshSource.caseId);assert.equal(freshDigital.from,freshSource.from);assert.equal(freshDigital.phase,'resolved');assert.ok(freshDigital.agent);assert.equal(freshDone.deadlineAt,freshJob.deadlineAt);assert.equal(freshDone.messageUnits,1);assert.ok(freshDigital.trace.some(t=>t.code==='PRODUCT_FEATURE_ACCEPTED'&&t.resource==='messages'&&t.bindings?.some(b=>b.deploymentId==='d-cisco-programmable-engagement'&&b.feature==='channel-accounts')));assert.equal(s.providerCampaign.jobs.filter(j=>j.caseId===freshJob.caseId).length,1);
 s=until(s,s=>s.clock>=(freshJob.periodIndex+1)*60,60);const freshPeriod=s.providerCampaign.customers[0].history.find(h=>h.period===freshJob.periodIndex),freshRows=s.providerCampaign.jobs.filter(j=>j.customerId===CUSTOMER&&j.periodIndex===freshJob.periodIndex);
 assert.equal(s.providerCampaign.jobs.find(j=>j.id===freshJob.id).settled,true);assert.equal(freshPeriod.due,24);assert.equal(freshRows.length,24);assert.equal(new Set(freshRows.map(j=>j.caseId)).size,24);assert.equal(freshPeriod.messages,freshRows.reduce((n,j)=>n+(j.followup?j.messageUnits:j.messageCharged?1:0),0));assert.equal(freshPeriod.voiceMinutes,freshRows.reduce((n,j)=>n+j.voiceMinutes,0));assert.equal(freshPeriod.voiceCost,freshPeriod.voiceMinutes*50);assert.equal(freshPeriod.messageCost,freshPeriod.messages*75);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('AC-SOC-714 actual L8 history rejects missing paid product-path evidence, altered case deadlines and unpaid or unknown-version workflow state',()=>{
 assert.ok(earnedFollowup,'actual paid preceding flow must complete');
 const mutations=[
  s=>{const j=s.providerCampaign.jobs.find(j=>j.followup?.attempts.length),i=child(s).interactions.find(i=>i.id===j.followup.attempts[0].interactionId);i.trace=i.trace.filter(t=>!(t.code==='PRODUCT_FEATURE_ACCEPTED'&&t.resource==='messages'));},
  s=>{const j=s.providerCampaign.jobs.find(j=>j.followup);j.deadlineAt++;j.followup.deadlineAt++;j.followup.authored.deadlineAt++;},
  s=>{s.providerCampaign.caseFollowupVersion=2;},
  s=>{const p=s.providerCampaign.projects.find(p=>p.operationId==='direct-case-followup');s.business.ledger.find(e=>e.id===p.postingId).cents--;},
  s=>{const p=s.providerCampaign.projects.find(p=>p.operationId==='managed-case-followup');s.providerCampaign.progressionReceipts.receipts=s.providerCampaign.progressionReceipts.receipts.filter(r=>r.sourceId!=='progress.progression-level.8');}
 ];
 for(const mutate of mutations){const forged=clone(earnedFollowup);mutate(forged);assert.throws(()=>SOC.restore(JSON.stringify(forged)));}
 assert.deepEqual(SOC.restore(JSON.stringify(earnedFollowup)),earnedFollowup);
});

let paidRetrySettled;
test('AC-SOC-735 peak demand causes a real accepted follow-up failure and one paid scoped retry recovers before the original deadline',()=>{
 let s=opening(true,{seed:3,openingVariant:'peak-window'});s=operation(s,'direct-case-followup');s=until(s,s=>s.providerCampaign.projects.some(p=>p.operationId==='direct-case-followup'&&p.status==='complete'));s=until(s,s=>!!nextFollowup(s),100);
 const first=nextFollowup(s),id=first.job.id,deadline=first.job.deadlineAt;assert.equal(deadline,first.job.arrivalAt+30);s=buy(s,first.request);
 s=until(s,s=>{const j=s.providerCampaign.jobs.find(j=>j.id===id);return child(s).interactions.find(i=>i.id===j.followup.attempts[0].interactionId).phase==='failed';},20);
 let j=s.providerCampaign.jobs.find(j=>j.id===id);const failed=child(s).interactions.find(i=>i.id===j.followup.attempts[0].interactionId);
 assert.equal(failed.outcome,'CALLBACK_REQUIRED');assert.ok(failed.trace.some(t=>t.code==='CHANNEL_ACCEPTED'));assert.equal(j.messageUnits,1);assert.equal(j.status,'pending');assert.equal(j.followup.attempts.length,1);
 const retry={action:'retry-case-followup',customerId:CUSTOMER,jobId:id},before=JSON.stringify(s);assert.throws(()=>command(s,{action:'followup-case',customerId:CUSTOMER,jobId:id,quoteRevision:s.revision}),/FOLLOWUP_PHASE_REQUIRED/);assert.equal(JSON.stringify(s),before);
 const rq=SOC.provider.quote(s,retry);assert.deepEqual(rq.blockers,[]);assert.equal(rq.setupCents,4000);assert.equal(rq.workMinutes,2);assert.equal(rq.support,1);assert.equal(rq.commercial.caseFollowup.deadlineAt,deadline);const retryCash=s.business.balance.cash;s=buy(s,retry);assert.equal(retryCash-s.business.balance.cash,4000);
 assert.throws(()=>command(s,{...retry,quoteRevision:s.revision}),/FOLLOWUP_RETRY_ALREADY_FUNDED/);
 s=until(s,s=>s.providerCampaign.projects.some(p=>p.operationId==='retry-case-followup'&&p.status==='complete'),5);const ready=SOC.provider.quote(s,retry);assert.equal(ready.setupCents,0);assert.equal(ready.commercial.caseFollowup.fundingRequired,false);const paidCash=s.business.balance.cash;s=buy(s,retry);assert.equal(s.business.balance.cash,paidCash);
 assert.deepEqual(worker(s,{type:'advance',minutes:1}),SOC.dispatch(SOC.restore(JSON.stringify(s)),{type:'advance',minutes:1}));
 s=until(s,s=>s.providerCampaign.jobs.find(j=>j.id===id).status==='completed',12);j=s.providerCampaign.jobs.find(j=>j.id===id);assert.ok(j.completedAt<=deadline);assert.equal(j.deadlineAt,deadline);assert.equal(j.messageUnits,2);assert.equal(j.followup.attempts.length,2);assert.equal(s.providerCampaign.jobs.filter(x=>x.caseId===j.caseId).length,1);
 const last=child(s).interactions.find(i=>i.id===j.followup.attempts[1].interactionId);assert.equal(last.phase,'resolved');assert.ok(last.agent);assert.ok(last.trace.some(t=>t.code==='HUMAN_HANDOFF'));
 s=until(s,s=>s.clock>=(j.periodIndex+1)*60,60);const h=s.providerCampaign.customers[0].history.find(h=>h.period===j.periodIndex),rows=s.providerCampaign.jobs.filter(x=>x.periodIndex===j.periodIndex);assert.equal(h.due,24);assert.equal(rows.length,24);assert.equal(h.messages,rows.reduce((n,x)=>n+(x.followup?x.messageUnits:x.messageCharged?1:0),0));assert.equal(h.messageCost,h.messages*75);assert.equal(s.business.ledger.filter(e=>e.reason==='provider-message-usage'&&e.period===j.periodIndex).length,1);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);paidRetrySettled=clone(s);
});

test('AC-SOC-736 actual paid retry keeps channel evidence until ordinary job pruning then restores a bounded authorization archive and equal worker continuation',()=>{
 assert.ok(paidRetrySettled,'actual paid retry must settle first');let s=clone(paidRetrySettled),project=s.providerCampaign.projects.find(p=>p.operationId==='retry-case-followup'),job=s.providerCampaign.jobs.find(j=>j.id===project.config.jobId),ids=job.followup.attempts.map(a=>a.interactionId);
 for(const value of [null,{version:999}]){const forged=clone(s);forged.providerCampaign.projects.find(p=>p.id===project.id).followupSettlementProof=value;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/FOLLOWUP_RETRY_ARCHIVE/);}
 s=until(s,s=>s.clock>=150,31);assert.ok(s.providerCampaign.jobs.some(j=>j.id===job.id));for(const id of ids)assert.ok(child(s).channels.acceptances.some(a=>a.interaction===id),'pinned case keeps actual channel acceptance beyond ordinary sixty-minute age');
 s=until(s,s=>s.clock>=180,31);project=s.providerCampaign.projects.find(p=>p.id===project.id);const archive=project.followupRetryArchive;assert.ok(archive);assert.ok(!s.providerCampaign.jobs.some(j=>j.id===job.id));assert.equal(archive.job.messageUnits,2);assert.equal(archive.acceptances.length,2);assert.ok(archive.pruneOrdinal<=s.providerCampaign.jobCheckpoint.pruned);assert.ok(!child(s).providerCaseFollowupPins?.interactionIds.some(id=>archive.interactions.some(i=>i.id===id)));
 assert.ok(Buffer.byteLength(JSON.stringify(archive))<=65536);assert.ok(Buffer.byteLength(JSON.stringify(s.portfolio))<6000000);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const step={type:'advance',minutes:1};assert.deepEqual(worker(s,step),SOC.dispatch(SOC.restore(JSON.stringify(s)),step));
 const after=SOC.dispatch(s,step);assert.deepEqual(after.providerCampaign.projects.find(p=>p.id===project.id).followupRetryArchive,archive);assert.equal(after.providerCampaign.jobCheckpoint.messages,s.providerCampaign.jobCheckpoint.messages);assert.equal(after.providerCampaign.jobCheckpoint.pruned,s.providerCampaign.jobCheckpoint.pruned);
 const mutations=[p=>delete p.followupRetryArchive,p=>delete p.followupSettlementProof,p=>p.followupRetryArchive.pruneOrdinal=999999,p=>p.followupRetryArchive.acceptances[0].permissionUpdatedAt++,p=>p.followupRetryArchive.interactions[1].outcome='RESOLVED',p=>p.followupSettlementProof.customer.messageCost++];
 for(const mutate of mutations){const forged=clone(s);mutate(forged.providerCampaign.projects.find(p=>p.id===project.id));assert.throws(()=>SOC.restore(JSON.stringify(forged)));}
 const q=SOC.provider.quote(s,{action:'operation',customerId:CUSTOMER,operationId:'managed-case-followup'});assert.ok(q.blockers.includes('FOLLOWUP_EARNED_MARKET_REQUIRED'),'archived authorization is not an L8 award');
});
