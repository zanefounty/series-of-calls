const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const SOC=require('../src/game/55-communications');

const enabled=process.env.SOC_PROVIDER_LONG_SOAK==='1';
function inputHashes(){
 const files=[...fs.readdirSync(path.join(__dirname,'../src/game')).filter(x=>x.endsWith('.js')).map(x=>`src/game/${x}`),'content/provider-campaigns.json','tests/provider-soak.test.js'].sort();
 const hash=crypto.createHash('sha256');
 for(const file of files){hash.update(file);hash.update('\0');hash.update(fs.readFileSync(path.join(__dirname,'..',file)));hash.update('\0');}
 return {fileCount:files.length,sha256:hash.digest('hex')};
}

test('provider career supports twenty active customers through 10,000 minutes of actual workload, renewal and deterministic save continuation',{skip:!enabled},t=>{
 const startedAt=new Date().toISOString(),hashes=inputHashes();
 let state=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',difficulty:'normal'});
 let requestSequence=0;
 const repairAttempts=[];
 const send=command=>{requestSequence=Math.max(requestSequence,state.providerRequestSequence||0)+1;state=SOC.dispatch(state,{type:'provider',requestId:`provider-${requestSequence}`,command});};
 const campaign=()=>state.providerCampaign;
 const advanceTo=target=>{
  let turns=0,noProgress=0;
  while(state.clock<target){
   const before=state.clock,minutes=Math.min(60,target-before);
   try{state=SOC.dispatch(state,{type:'advance',minutes});}catch(error){
    const p=campaign();throw new Error(`${error.message} at clock ${before}, campaign collection sizes ${JSON.stringify({customers:p.customers.length,projects:p.projects.length,jobs:p.jobs.length,incidents:p.incidents.length,meetings:p.meetings.length,events:p.events.length,periodHistory:p.periodHistory.length})}`);
   }
   settleDecisions();
   noProgress=state.clock===before?noProgress+1:0;
   assert.ok(noProgress<4,'a required provider decision must be handled before time can advance');
   assert.ok(++turns<Math.max(1000,target-state.clock+1000),'bounded public clock progress');
  }
 };
 const quoteAndSend=command=>{
  const quote=SOC.provider.quote(state,command);
  assert.deepEqual(quote.blockers,[],`${command.action}/${command.stage||command.operationId||command.offerId}: ${quote.blockers.join(',')}`);
  send({...command,quoteRevision:state.revision});
 };
 const settleDecisions=()=>{
  // Renewal and incident decisions are exposed by the campaign. Resolve them only through
  // the same public provider commands used by the player.
  for(const customer of campaign().customers){
   if(customer.status==='renewal'){
    assert.ok(customer.history.filter(x=>x.qualified).slice(-3).length>=2,`${customer.id} renewal must be earned by two qualified periods`);
    send({action:'renew',customerId:customer.id});
   }
  }
  for(const incident of campaign().incidents.filter(x=>['active','acknowledged'].includes(x.status))){
   if(incident.status==='active')send({action:'acknowledge-incident',incidentId:incident.id});
   if(campaign().projects.some(x=>x.customerId===incident.customerId&&x.operationId==='repair'&&['running','commissioning'].includes(x.status)))continue;
   const request={action:'operation',operationId:'repair',customerId:incident.customerId};
   const quote=SOC.provider.quote(state,request);
   if(repairAttempts.length<8)repairAttempts.push({at:state.clock,status:campaign().customers.find(x=>x.id===incident.customerId)?.status,blockers:quote.blockers});
   if(quote.blockers.length&&quote.blockers.every(x=>x==='ENGINEER_CAPACITY'||x==='SUPPORT_CAPACITY'))continue;
   const target=campaign().customers.find(x=>x.id===incident.customerId);
   const child=state.portfolio.customers.find(x=>x.id===incident.customerId)?.root;
   const failures=campaign().jobs.filter(x=>x.customerId===incident.customerId&&x.status==='failed').slice(0,5).map(x=>({channel:x.channel,at:x.arrivalAt,reason:x.failure,interaction:child?.interactions.find(i=>i.id===x.interactionId)?.outcome,phase:child?.interactions.find(i=>i.id===x.interactionId)?.phase}));
   const repairProjects=campaign().projects.filter(x=>x.customerId===incident.customerId&&x.operationId==='repair').map(x=>({id:x.id,status:x.status,acceptedAt:x.acceptedAt,dueAt:x.dueAt,configSubmittedAt:x.configSubmittedAt,completedAt:x.completedAt}));
   assert.deepEqual(quote.blockers,[],`repair ${incident.id}/${target?.status}@${state.clock} attempts=${JSON.stringify(repairAttempts)} projects=${JSON.stringify(repairProjects)} failures=${JSON.stringify(failures)} metrics=${JSON.stringify(target?.metrics)}: ${quote.blockers.join(',')}`);
   send({...request,quoteRevision:state.revision});
  }
 };
 const progressUntil=predicate=>{
  const limit=state.clock+1440;
  while(!predicate()){
   assert.ok(state.clock<limit,'campaign made no required progress within one day');
   advanceTo(state.clock+1);
  }
 };
 const buyStage=(offerId,stage,customerId)=>quoteAndSend({action:'purchase',offerId,planId:'swift',stage,...(customerId?{customerId}:{})});
 const serviceCustomer=(offerId,customerId)=>{
  buyStage(offerId,'carrier',customerId);
  buyStage(offerId,'partner',customerId);
  progressUntil(()=>{
   const customer=campaign().customers.find(x=>x.id===customerId);
   return customer?.status==='active'&&customer.metrics.completed>0;
  });
 };

 // Commission and repair the opening service using funded provider work and observed incidents.
 buyStage('starter','base');
 serviceCustomer('starter','starter-customer');
 progressUntil(()=>campaign().incidents.some(x=>x.customerId==='starter-customer'&&x.status==='resolved'));
 progressUntil(()=>campaign().mission.consecutiveQualifying>=2&&campaign().mission.nextOpportunityAvailable);
 buyStage('next-1','base');
 serviceCustomer('next-1','next-1-customer');
 send({action:'continue-career'});

 // Each new child is bought only after the focused customer's actual profitable service
 // evidence unlocks the next authored offer. Existing customers are renewed at real terms.
 for(let number=2;number<=19;number++){
  progressUntil(()=>campaign().mission.consecutiveQualifying>=2&&campaign().mission.nextOpportunityAvailable);
  const offerId=`next-${number}`,customerId=`${offerId}-customer`;
  buyStage(offerId,'base');
  serviceCustomer(offerId,customerId);
  send({action:'continue-career'});
 }

 assert.equal(campaign().customers.length,20);
 assert.ok(campaign().customers.every(x=>x.status==='active'), 'all twenty customers are active before the soak window');
 progressUntil(()=>campaign().incidents.length===20&&campaign().incidents.every(x=>x.status==='resolved'));
 const soakStart=state.clock,initialOffered=campaign().customers.reduce((n,x)=>n+x.metrics.offered,0),initialCompleted=campaign().customers.reduce((n,x)=>n+x.metrics.completed,0),initialFailed=campaign().customers.reduce((n,x)=>n+x.metrics.failed,0),initialOpenJobs=campaign().jobs.filter(x=>x.status==='pending'&&!x.settled).length,initialSettlements=campaign().historyCheckpoint.periods+campaign().periodHistory.length;
 const initialRevenue=state.business.balance.revenue,initialCost=state.business.balance.cost;
 const soakEnd=soakStart+10000;

 // Use bounded public advances. The engine can stop at a required decision before the
 // requested endpoint; settle it and continue until the exact elapsed time is reached.
 advanceTo(soakEnd);
 assert.equal(state.clock-soakStart,10000);
 assert.ok(campaign().customers.every(x=>x.status==='active'||x.status==='renewal'),'customers remain active or have an earned renewal decision');
 settleDecisions();
 assert.ok(campaign().customers.every(x=>x.status==='active'));
 const offered=campaign().customers.reduce((n,x)=>n+x.metrics.offered,0),completed=campaign().customers.reduce((n,x)=>n+x.metrics.completed,0),failed=campaign().customers.reduce((n,x)=>n+x.metrics.failed,0),openJobs=campaign().jobs.filter(x=>x.status==='pending'&&!x.settled).length;
 const offeredDelta=offered-initialOffered,completedDelta=completed-initialCompleted,failedDelta=failed-initialFailed;
 assert.ok(offeredDelta>=20*24*Math.floor(10000/60)-20*24,'each active customer received real recurring campaign demand');
 assert.ok(completedDelta>0,'actual customer interactions completed during the soak');
 assert.equal(offeredDelta,completedDelta+failedDelta+openJobs-initialOpenJobs,'every offered case is accounted as completed, failed or still open at both horizon boundaries');
 assert.ok(campaign().historyCheckpoint.periods+campaign().periodHistory.length-initialSettlements>=Math.floor(10000/60)-1,'provider periods settled repeatedly');
 assert.ok(state.business.balance.revenue>0&&state.business.balance.cost>0,'shared treasury records actual recurring revenue and cost');
 assert.equal(campaign().incidents.length,20);
 assert.ok(campaign().incidents.every(x=>x.status==='resolved'&&x.receipt),'each authored incident was observed and repaired');
 const saveClock=state.clock,report={startedAt,endedAt:null,inputHashes:hashes,soakStartClock:soakStart,soakEndClock:saveClock,elapsedMinutes:saveClock-soakStart,customers:campaign().customers.length,offeredDelta,completedDelta,failedDelta,openJobsAtStart:initialOpenJobs,openJobsAtEnd:openJobs,settlementsDelta:campaign().historyCheckpoint.periods+campaign().periodHistory.length-initialSettlements,revenueDelta:state.business.balance.revenue-initialRevenue,costDelta:state.business.balance.cost-initialCost,incidents:campaign().incidents.length,allIncidentsResolved:campaign().incidents.every(x=>x.status==='resolved')};

 // A real serialized save continues identically on both copies through a further settlement.
 const save=JSON.stringify(state),restored=SOC.restore(save),target=state.clock+60;
 assert.equal(JSON.stringify(restored),save);
 const control=state,controlSequence=requestSequence;
 advanceTo(target);
 const expected=state;
 state=restored;requestSequence=controlSequence;advanceTo(target);
 assert.equal(JSON.stringify(state),JSON.stringify(expected),'restored campaign has deterministic workload, renewals, incidents and ledger continuation');
 state=control;
 report.saveContinuationMinutes=target-saveClock;report.saveContinuationMatched=true;report.endedAt=new Date().toISOString();
 if(process.env.SOC_PROVIDER_SOAK_REPORT)fs.writeFileSync(process.env.SOC_PROVIDER_SOAK_REPORT,JSON.stringify(report,null,2)+'\n');
 t.diagnostic(`SOC_PROVIDER_SOAK_METADATA ${JSON.stringify(report)}`);
});
