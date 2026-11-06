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
function opening(withProduct=true){
 let s=SOC.create({experience:'campaign',scenario:'smb',seed:17});
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
function nextFollowup(s){for(const j of s.providerCampaign.jobs.filter(j=>j.followup&&j.status==='pending'&&!j.followup.attempts.length)){const request={action:'followup-case',customerId:CUSTOMER,jobId:j.id},q=SOC.provider.quote(s,request);if(!q.blockers.length)return {job:j,request,q};}return null;}
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
 assert.equal(done.messageUnits,1);assert.equal(done.voiceMinutes,source.usageMinutes);assert.ok(target.agent);assert.equal(target.caseId,source.caseId);assert.equal(target.from,source.from);assert.equal(target.phase,'resolved');assert.equal(s.providerCampaign.jobs.filter(j=>j.caseId===job.caseId).length,1);
 s=until(s,s=>s.clock>=(job.periodIndex+1)*60,60);assert.equal(s.providerCampaign.jobs.find(j=>j.id===job.id).settled,true);
 const rows=s.providerCampaign.jobs.filter(j=>j.customerId===CUSTOMER&&j.periodIndex===job.periodIndex),h=s.providerCampaign.customers[0].history.find(h=>h.period===job.periodIndex);
 assert.equal(rows.length,24);assert.equal(h.due,24);assert.equal(h.messages,rows.reduce((n,j)=>n+(j.followup?j.messageUnits:j.messageCharged?1:0),0));assert.equal(h.messageCost,h.messages*75);assert.equal(h.voiceCost,h.voiceMinutes*50);
 const facts=SOC.provider.inspect(s).progression,claimCash=s.business.balance.cash;
 const row=facts.claims.rows.find(x=>x.sourceId==='progress.progression-level.8');assert.equal(row.status,'ready',JSON.stringify(row));
 s=command(s,{action:'claim-progression',sourceId:'progress.progression-level.8',quoteRevision:s.revision});assert.equal(s.business.balance.cash,claimCash);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=clone(s);forged.providerCampaign.jobs.find(j=>j.id===job.id).messageUnits++;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/FOLLOWUP/);
 s=operation(s,'managed-case-followup');assert.equal(claimCash-s.business.balance.cash,9000);
 s=until(s,s=>s.providerCampaign.projects.some(p=>p.operationId==='managed-case-followup'&&p.status==='complete'),20);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);earnedFollowup=clone(s);
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
