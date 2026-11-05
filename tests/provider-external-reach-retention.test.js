'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer',sourceId='progress.goal.tr';
const child=s=>s.portfolio.customers.find(c=>c.id===customerId).root;
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,command){const quote=SOC.provider.quote(s,command);assert.deepEqual(quote.blockers,[],JSON.stringify({at:s.clock,command,blockers:quote.blockers}));return send(s,{...command,quoteRevision:quote.atRevision});}
function operation(s,operationId){return buy(s,{action:'operation',operationId,customerId});}
function minute(s){
 const incident=s.providerCampaign.incidents.find(row=>['active','acknowledged'].includes(row.status));
 if(incident&&!s.providerCampaign.projects.some(row=>row.operationId==='repair'&&['running','commissioning'].includes(row.status))){
  if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
  const command={action:'operation',operationId:'repair',customerId},quote=SOC.provider.quote(s,command);
  if(!quote.blockers.length)s=buy(s,command);
  else assert.ok(quote.blockers.every(code=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(code)),JSON.stringify(quote.blockers));
 }
 for(const customer of s.providerCampaign.customers.filter(row=>row.status==='renewal'))s=send(s,{action:'renew',customerId:customer.id});
 try{return SOC.dispatch(s,{type:'advance',minutes:1});}
 catch(error){throw new Error(`${error.message}; clock=${s.clock}; processing=${child(s).information?.jobs?.length||0}; activeProcessing=${child(s).information?.jobs?.filter(row=>!['complete','failed'].includes(row.status)).length||0}; providerJobs=${s.providerCampaign.jobs.length}; meetings=${child(s).information?.meetingSessions?.length||0}`);}
}
function until(s,predicate,limit=180){for(let count=0;count<limit&&!predicate(s);count++){try{s=minute(s);}catch(error){throw new Error(`${error.message}; until clock=${s.clock}; customers=${JSON.stringify(s.providerCampaign.customers.map(row=>({id:row.id,status:row.status})))}`);}}assert.ok(predicate(s),JSON.stringify({at:s.clock,customers:s.providerCampaign.customers.map(row=>({id:row.id,status:row.status})),projects:s.providerCampaign.projects.map(row=>({id:row.operationId,status:row.status})),meetings:s.providerCampaign.meetingCheckpoint}));return s;}
function opening(){
 let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73,market:'au-sydney'});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 s=until(s,state=>state.providerCampaign.customers[0].status==='active',30);
 for(const operationId of ['room','recording'])s=operation(s,operationId);
 s=until(s,state=>['room','recording'].every(id=>project(state,id)?.status==='complete'),30);
 s=operation(s,'bpo');
 s=until(s,state=>project(state,'bpo')?.status==='complete',30);
 s=buy(s,{action:'operation',operationId:'migration',customerId});
 s=until(s,state=>project(state,'migration')?.status==='complete',60);
 s=operation(s,'transcription');
 return until(s,state=>project(state,'transcription')?.status==='complete',60);
}

test('earned external reach receipt survives bounded history pruning, restore, and worker continuation',()=>{
 let s=opening();
 s=until(s,state=>SOC.provider.inspect(state).progression.goals[sourceId]?.status==='ready',180);
 s=until(s,state=>Number.isSafeInteger(state.providerCampaign.customers.find(row=>row.id===customerId)?.renewedAt)&&SOC.provider.inspect(state).progression.goals[sourceId]?.status==='ready',300);
 const customer=s.providerCampaign.customers.find(row=>row.id===customerId),readyEvidence=SOC.provider.inspect(s).progression.goals[sourceId].evidence;
 assert.ok(Number.isSafeInteger(customer.customerAcceptedAt)&&customer.retailAgreement.at>customer.customerAcceptedAt,`the claim is earned after a real retail renewal: ${JSON.stringify({clock:s.clock,acceptedAt:customer.customerAcceptedAt,agreementAt:customer.retailAgreement.at})}`);
 assert.equal(readyEvidence.agreementAt,customer.customerAcceptedAt,'the historical proof stays anchored to original accepted terms');
 assert.ok(Number.isSafeInteger(customer.renewedAt)&&customer.retailAgreement.at===customer.renewedAt,'the current agreement is the actual accepted renewal');
 assert.ok(s.clock>=customer.retailAgreement.at,'the proof is not claimed before the renewal takes effect');
 const originalClock=s.clock,originalCash=s.business.balance.cash;
 s=send(s,{action:'claim-progression',sourceId,quoteRevision:s.revision});
 const original=s.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===sourceId);
 assert.ok(original);
 assert.equal(original.at,originalClock);
 assert.equal(s.business.balance.cash,originalCash,'claim must not award cash');
 s=until(s,state=>state.clock>=originalClock+2001,2300);
 assert.ok(s.providerCampaign.jobCheckpoint.pruned>0,'real later periods should prune settled Provider jobs');
 assert.ok(child(s).tracePrunedThrough>0,'real later calls should prune child interaction traces');
 const retained=s.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===sourceId);
 assert.deepEqual(retained,original,'the earned proof remains unchanged after later history is pruned');
 const restored=SOC.restore(JSON.stringify(s));
 assert.deepEqual(restored,s,'restore revalidates the retained actual proof and checkpoints');
 const workerSOC=new Function(`${SOC.workerSource()}\nreturn SOC;`)();
 const command={type:'advance',minutes:1};
 assert.deepEqual(workerSOC.dispatch(restored,command),SOC.dispatch(restored,command),'worker and synchronous continuation stay equivalent');
});
