const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');

function controller(initial,dispatch=SOC.dispatch){
 let state=initial;
 const send=command=>{state=dispatch(state,{type:'provider',command});};
 const buy=command=>{const q=SOC.provider.quote(state,command);assert.deepEqual(q.blockers,[],JSON.stringify({at:state.clock,command,blockers:q.blockers}));send({...command,quoteRevision:q.atRevision});};
 const decisions=()=>{
  for(const c of state.providerCampaign.customers.filter(c=>c.status==='renewal'))send({action:'renew',customerId:c.id});
  for(const i of state.providerCampaign.incidents.filter(i=>['active','acknowledged'].includes(i.status))){
   if(i.status==='active')send({action:'acknowledge-incident',incidentId:i.id});
   if(state.providerCampaign.projects.some(p=>p.customerId===i.customerId&&p.operationId==='repair'&&['running','commissioning'].includes(p.status)))continue;
   const request={action:'operation',customerId:i.customerId,operationId:'repair'},q=SOC.provider.quote(state,request);
   if(q.blockers.length)assert.ok(q.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(x)),q.blockers.join(','));else buy(request);
  }
 };
 const advanceTo=target=>{while(state.clock<target){state=dispatch(state,{type:'advance',minutes:Math.min(60,target-state.clock)});decisions();}return state;};
 const until=predicate=>{const deadline=state.clock+600;while(!predicate(state)){assert.ok(state.clock<deadline,'public campaign stalled');advanceTo(state.clock+1);}return state;};
 const customer=(offerId,id)=>{buy({action:'purchase',offerId,planId:'swift',stage:'base'});for(const stage of ['carrier','partner'])buy({action:'purchase',offerId,planId:'swift',stage,customerId:id});until(s=>s.providerCampaign.customers.find(c=>c.id===id).status==='active');};
 return {get state(){return state;},send,buy,advanceTo,until,customer};
}

test('a paid two-customer Provider career retains 2,001 minutes of demand, incident recovery and settlement with equal restored and worker continuation',()=>{
 const run=controller(SOC.create({experience:'campaign',scenario:'smb',seed:73}));run.customer('starter','starter-customer');
 run.until(s=>s.providerCampaign.mission.consecutiveQualifying>=2&&s.providerCampaign.mission.nextOpportunityAvailable);run.customer('next-1','next-1-customer');run.until(s=>s.providerCampaign.status==='won');run.send({action:'continue-career'});
 run.advanceTo(2001);const state=run.state,p=state.providerCampaign;
 assert.equal(state.clock,2001);assert.equal(p.customers.length,2);assert.ok(p.customers.every(c=>c.status==='active'));
 assert.ok(p.incidents.length>2&&p.incidents.length<=16,'each of two active customers can receive no more than the authored eight-incident sequence');
 for(const customer of p.customers){
  const rows=p.incidents.filter(i=>i.customerId===customer.id).sort((a,b)=>a.createdAt-b.createdAt);
  assert.ok(rows.length>=1&&rows.length<=8);
  assert.equal(rows[0].sequence,undefined,'the first incident retains its legacy shape');
  for(let index=0;index<rows.length;index++){
   const incident=rows[index];
   assert.ok(incident.status==='resolved'&&incident.receipt&&p.projects.some(w=>w.customerId===incident.customerId&&w.operationId==='repair'&&w.status==='complete'&&w.acceptedAt>=incident.acknowledgedAt&&w.completedAt<=incident.resolvedAt),`incident ${incident.id} has an observed, separately paid repair`);
   if(index){
    const prior=rows[index-1],proof=incident.sequence,event=p.events.find(row=>row.id===proof?.trigger.eventId),job=p.jobs.find(row=>row.id===proof?.trigger.jobId);
    assert.equal(proof?.ordinal,index+1);assert.equal(proof?.predecessorIncidentId,prior.id);assert.ok(incident.createdAt>=prior.resolvedAt+360);
    assert.ok(event&&event.code==='CUSTOMER_WORK_COMPLETED'&&event.customerId===customer.id&&event.jobId===job?.id,'the bounded follow-up retains its real work trigger');
    assert.ok(job&&['completed','late'].includes(job.status)&&job.completedAt===proof.trigger.completedAt,'the actual trigger job stays pinned with its incident proof');
   }
  }
 }
 assert.ok(p.customers.every(c=>c.metrics.offered>600&&c.metrics.completed>500));
 const offered=p.customers.reduce((n,c)=>n+c.metrics.offered,0),completed=p.customers.reduce((n,c)=>n+c.metrics.completed,0),failed=p.customers.reduce((n,c)=>n+c.metrics.failed,0),open=p.jobs.filter(j=>j.status==='pending'&&!j.settled).length;
 assert.equal(offered,completed+failed+open,'no offered case disappears across retained history');
 assert.ok(p.historyCheckpoint.periods>0);assert.equal(p.historyCheckpoint.periods+p.periodHistory.length,33);assert.ok(p.periodHistory.length<=24);
 const eventPins=new Set([...p.incidents.map(i=>i.sequence?.trigger?.eventId),...(p.supportWork?.origins||[]).map(row=>row.arrival?.id)].filter(Boolean));
 for(const receipt of p.progressionReceipts?.receipts||[])for(const proof of receipt.workProofs||[])if(proof.arrivalEventId)eventPins.add(proof.arrivalEventId);
 assert.ok(p.events.length<=200+eventPins.size,'campaign event history remains bounded except for its exact pinned evidence rows');assert.ok(p.jobs.length<=1200+p.incidents.filter(i=>i.sequence?.trigger?.jobId).length);
 assert.ok(state.portfolio.customers.every(c=>c.root.providerArchive.interactions>0&&c.root.interactions.length<=64&&c.root.commands.length<=128&&c.root.ledger.length<=120));
 assert.ok(state.business.balance.revenue>0&&state.business.balance.cost>0&&state.business.balance.cash>0);
 const restored=SOC.restore(JSON.stringify(state));assert.deepEqual(restored,state);const expected=controller(state).advanceTo(2061);assert.deepEqual(controller(restored).advanceTo(2061),expected);
 let response;const context={postMessage:value=>{response=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);
 const worker=(current,command)=>{response=null;context.onmessage({data:{id:'paid-2001',state:JSON.parse(JSON.stringify(current)),command}});assert.equal(response.error,undefined);return JSON.parse(JSON.stringify(response.state));};
 assert.deepEqual(controller(restored,worker).advanceTo(2061),expected,'actual serialized worker preserves long-lived paid campaign continuation');
});
