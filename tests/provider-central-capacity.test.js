"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const cid='starter-customer',sourceId='progress.progression-level.6';
const child=s=>s.portfolio.customers.find(c=>c.id===cid).root;
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify(q.blockers));return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});}
function until(s,condition,max=240){for(let n=0;n<max&&!condition(s);n++){const previous=s.clock;s=SOC.dispatch(s,{type:'advance',minutes:1});assert.ok(s.clock>previous,'fixture must keep advancing');}assert.ok(condition(s),'timed out at '+s.clock);return s;}
function operation(s,operationId){s=buy(s,{action:'operation',operationId,customerId:cid});const id=s.providerCampaign.projects.at(-1).id;return until(s,x=>x.providerCampaign.projects.find(p=>p.id===id).status==='complete');}
function governmentWin(){
 let s=SOC.create({experience:'campaign',scenario:'government',market:'au-sydney',difficulty:'easy',seed:2});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:cid})});
 s=until(s,x=>x.providerCampaign.customers[0].status==='active');
 for(const id of ['recording','transcription','compliance'])s=operation(s,id);
 s=until(s,x=>x.providerCampaign.incidents.some(i=>i.customerId===cid&&i.status==='active'));
 const incident=s.providerCampaign.incidents.find(i=>i.customerId===cid&&i.status==='active');assert.equal(incident.kind,'boundary');
 s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=operation(s,'repair');
 s=until(s,x=>x.providerCampaign.mission.consecutiveQualifying>=2);
 s=buy(s,{action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});assert.equal(s.providerCampaign.missionStatus,'active');for(const stage of ['carrier','partner'])s=buy(s,{action:'purchase',offerId:'next-1',planId:'swift',stage,customerId:'next-1-customer'});s=until(s,x=>x.providerCampaign.missionStatus==='won');return s;
}
function worker(s,command){let reply;const context={postMessage:value=>{reply=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:'central-capacity',state:JSON.parse(JSON.stringify(s)),command}});assert.equal(reply.error,undefined);return JSON.parse(JSON.stringify(reply.state));}

test('earned Government recording reserve charges once, refreshes only its existing boundary and delivers actual captured work',()=>{
 let s=governmentWin();const command={type:'provider',command:{action:'claim-progression',sourceId,quoteRevision:s.revision}},claimed=SOC.dispatch(s,command);
 assert.deepEqual(worker(s,command),claimed);s=claimed;
 const receipt=structuredClone(s.providerCampaign.progressionReceipts.receipts.find(r=>r.sourceId===sourceId));
 s=SOC.dispatch(s,{type:'provider',command:{action:'continue-career'}});
 const request={action:'operation',operationId:'public-service-capture-reserve',customerId:cid},q=SOC.provider.quote(s,request),ordinary=SOC.provider.quote(s,{action:'operation',operationId:'capture-headroom',customerId:cid});
 assert.deepEqual(q.blockers,[]);assert.equal(q.commercial.capacity[0].capacity,12);assert.equal(q.commercial.capacity[0].unit,'concurrent capture reservations');
 assert.equal(q.setupCents-2*ordinary.setupCents,2000);assert.equal(2*ordinary.periodCents-q.periodCents,4000);
 const contractId=child(s).boundaries.bindings.recorder,policy=structuredClone(child(s).boundaries.contracts.find(c=>c.id===contractId).desired),cash=s.business.balance.cash;
 const commit={type:'provider',requestId:'provider-'+(s.providerRequestSequence+1),command:{...request,quoteRevision:q.atRevision}};s=SOC.dispatch(s,commit);const projectId=s.providerCampaign.projects.at(-1).id;
 assert.equal(cash-s.business.balance.cash,38000);assert.deepEqual(SOC.dispatch(s,commit),s);assert.equal(child(s).resources.recorder.effective.capacity,4);
 s=until(s,x=>x.providerCampaign.projects.find(p=>p.id===projectId).status==='complete');const project=s.providerCampaign.projects.find(p=>p.id===projectId);
 assert.equal(child(s).resources.recorder.effective.capacity,12);assert.equal(project.operationReceipt.boundaryRefresh.contractId,contractId);
 const strip=p=>({...p,flows:p.flows.map(({resourceGeneration,...f})=>f)});
 assert.deepEqual(strip(child(s).boundaries.contracts.find(c=>c.id===contractId).desired),strip(policy));
 assert.equal(SOC.boundaries.evaluate(child(s),contractId).eligible,true);
 assert.deepEqual(s.providerCampaign.progressionReceipts.receipts.find(r=>r.sourceId===sourceId),receipt,'a legitimate new generation preserves the earned proof');
 s=until(s,x=>child(x).records.some(r=>r.kind==='recording'&&r.createdAt>project.completedAt&&child(x).interactions.some(i=>i.id===r.interaction&&i.phase==='resolved')));
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);assert.deepEqual(worker(s,{type:'advance',minutes:1}),SOC.dispatch(s,{type:'advance',minutes:1}));
 const forged=structuredClone(s);child(forged).resources.recorder.desired.capacity+=8;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_CAPACITY_AUTHORITY/);
 const invalidRefresh=structuredClone(s);invalidRefresh.providerCampaign.projects.find(p=>p.id===projectId).operationReceipt.boundaryRefresh.generation+=10;assert.throws(()=>SOC.restore(JSON.stringify(invalidRefresh)),/INVALID_PROVIDER_CAPACITY_AUTHORITY/);
});
