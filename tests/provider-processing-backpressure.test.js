'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');

const CUSTOMER='starter-customer';
const child=s=>s.portfolio.customers.find(c=>c.id===CUSTOMER).root;
const operationProject=(s,id)=>s.providerCampaign.projects.findLast(p=>p.customerId===CUSTOMER&&p.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});

function buy(s,request){
 const quote=SOC.provider.quote(s,request);
 assert.deepEqual(quote.blockers,[],JSON.stringify({clock:s.clock,request,blockers:quote.blockers}));
 return send(s,{...request,quoteRevision:quote.atRevision});
}

function advanceOne(s){
 for(const customer of s.providerCampaign.customers.filter(c=>c.status==='renewal'))
  s=send(s,{action:'renew',customerId:customer.id});
 for(const incident of s.providerCampaign.incidents.filter(i=>['active','acknowledged'].includes(i.status))){
  const repairId=incident.resource==='service'?'service-repair':'repair';
  const inFlight=s.providerCampaign.projects.some(p=>p.customerId===incident.customerId&&p.operationId===repairId&&['running','commissioning'].includes(p.status));
  if(inFlight)continue;
  if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
  const request={action:'operation',operationId:repairId,customerId:incident.customerId};
  const quote=SOC.provider.quote(s,request);
  if(!quote.blockers.length)s=send(s,{...request,quoteRevision:quote.atRevision});
  else assert.ok(quote.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(x)),JSON.stringify({clock:s.clock,incident:incident.id,blockers:quote.blockers}));
 }
 return SOC.dispatch(s,{type:'advance',minutes:1});
}

function until(s,predicate,limit,message){
 for(let n=0;n<limit&&!predicate(s);n++){
  try{s=advanceOne(s);}catch(error){
   throw new Error(`${message||'provider advance'} failed at clock ${s.clock}: ${error.message}; processing=${child(s).information?.jobs?.length}; refusals=${child(s).information?.audit?.filter(x=>x.code==='PROCESSING_ADMISSION_REFUSED').length}`);
  }
 }
 assert.ok(predicate(s),`${message||'condition'} not reached by clock ${s.clock}`);
 return s;
}

function opening(){
 let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73,market:'au-sydney'});
 for(const stage of ['base','carrier','partner']){
  const request={action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})};
  s=buy(s,request);
 }
 s=until(s,x=>x.providerCampaign.customers.find(c=>c.id===CUSTOMER)?.status==='active',50,'Enterprise Swift customer activation');
 for(const operationId of ['room','recording','bpo','migration']){
  const request={action:'operation',operationId,customerId:CUSTOMER};
  s=until(s,x=>SOC.provider.quote(x,request).blockers.length===0,180,`${operationId} quote eligibility`);
  s=buy(s,request);
  s=until(s,x=>operationProject(x,operationId)?.status==='complete',180,`${operationId} delivery`);
 }
 assert.equal(operationProject(s,'transcription'),undefined,'the pipeline stays unfunded until the queue is full');
 assert.equal(child(s).resources.speech.effective.enabled,false,'speech processing is not provisioned before the paid operation');
 return s;
}

test('Enterprise recording backpressure retains captures, then paid transcription admits pending recordings and resumes processing',()=>{
 let s=opening();
 s=until(s,x=>{
  const info=child(x).information;
  return info?.jobs.length===200&&info.jobs.every(j=>!['complete','failed'].includes(j.status))&&info.audit.some(a=>a.code==='PROCESSING_ADMISSION_REFUSED');
 },1150,'200 nonterminal processing jobs and an automatic refusal');
 const captured=child(s),fullJobs=structuredClone(captured.information.jobs),refusals=captured.information.audit.filter(a=>a.code==='PROCESSING_ADMISSION_REFUSED');
 const originalSources=new Set(fullJobs.map(j=>j.source));
 assert.ok(s.clock>=600&&s.clock<=1100,`expected the long Enterprise backlog near the authored ~871-minute pressure point; observed ${s.clock}`);
 assert.ok(refusals.length>0);
 assert.equal(operationProject(s,'transcription'),undefined);
 for(const refusal of refusals){
  const record=captured.records.find(r=>r.id===refusal.record);
  assert.ok(record&&record.kind==='recording',`refused processing still retains capture ${refusal.record}`);
  assert.equal(record.processingAdmission?.version,1,'the refused capture retains its pending processing admission');
  assert.deepEqual(record.processingAdmission?.plan,captured.information.pipeline.effective,'the admission stores the pipeline that applied at capture time');
  const interaction=captured.interactions.find(i=>i.id===record.interaction);
  assert.ok(interaction?.trace.some(t=>t.code==='PROCESSING_ADMISSION_REFUSED'&&t.record===record.id));
  assert.equal(captured.information.jobs.some(j=>j.source===record.id),false,'a refusal creates no ghost job');
 }
 const refusalRecords=refusals.map(r=>r.record),activeIds=fullJobs.map(j=>j.id);
 for(let n=0;n<8;n++)s=advanceOne(s);
 assert.deepEqual(child(s).information.jobs,fullJobs,'the unfunded speech path cannot make progress by dropping or rewriting active jobs');
 assert.ok(refusalRecords.every(id=>child(s).records.some(r=>r.id===id&&r.kind==='recording')));
 assert.ok(activeIds.every(id=>child(s).information.jobs.some(j=>j.id===id)));
 assert.ok(child(s).information.audit.filter(a=>a.code==='PROCESSING_ADMISSION_REFUSED').length>=refusals.length);

 const request={action:'operation',operationId:'transcription',customerId:CUSTOMER};
 const quote=SOC.provider.quote(s,request);
 assert.deepEqual(quote.blockers,[],JSON.stringify({clock:s.clock,blockers:quote.blockers}));
 assert.equal(quote.setupCents,85000);
 assert.equal(quote.periodCents,14000);
 assert.equal(quote.workMinutes,12);
 assert.equal(quote.engineers,1);
 assert.equal(quote.support,0);
 const cash=s.business.balance.cash;
 s=send(s,{...request,quoteRevision:quote.atRevision});
 const funded=operationProject(s,'transcription');
 assert.equal(cash-s.business.balance.cash,85000,'one real shared-treasury setup charge');
 s=until(s,x=>operationProject(x,'transcription')?.status==='complete',80,'paid transcription delivery');
 const readyAt=operationProject(s,'transcription').completedAt;
 assert.ok(child(s).resources.speech.effective.enabled);
 s=until(s,x=>child(x).information.jobs.some(j=>j.status==='complete'&&originalSources.has(j.source)),120,'first original backlog job completion after speech commissioning');

 // The oldest retained refusal is automatically admitted once the original
 // backlog yields one terminal row. The older backlog itself is also required
 // to have made real progress; bounded storage is tested separately below.
 const oldestRefused=refusalRecords[0];
 s=until(s,x=>child(x).information.jobs.some(j=>j.source===oldestRefused),180,'oldest refused capture automatic admission');
 const resumedJob=child(s).information.jobs.find(j=>j.source===oldestRefused);
 assert.ok(resumedJob);
 assert.equal(child(s).records.find(r=>r.id===oldestRefused).processingAdmission,undefined,'pending state clears after the real job is admitted');
 assert.ok(originalSources.size>0&&child(s).information.jobs.some(j=>originalSources.has(j.source)&&j.status==='complete'),'pre-existing backlog jobs actually process after paid transcription');
 assert.ok(refusalRecords.every(id=>child(s).records.some(r=>r.id===id&&r.kind==='recording')),'refused earlier captures remain stored');
 assert.ok(refusalRecords.some(id=>child(s).records.some(r=>r.id===id&&r.processingAdmission?.version===1)||child(s).information.jobs.some(j=>j.source===id)),'remaining refusals stay pending or are admitted; none are silently lost');

 /* A terminal completed job is the only bounded history row that may be
    evicted when new automatic work is admitted. */
 const completedJob=child(s).information.jobs.find(j=>j.status==='complete');
 assert.ok(completedJob);
 assert.ok(child(s).information.jobPrunedThrough>0);
 assert.equal(child(s).information.jobs.length,200);
 const restored=SOC.restore(JSON.stringify(s));
 assert.deepEqual(restored,s,'restore validates the paid recovery and retained refused records');
 const direct=SOC.dispatch(restored,{type:'advance',minutes:1});
 const workerSOC=new Function(`${SOC.workerSource()}\nreturn SOC;`)();
 const worker=workerSOC.dispatch(SOC.restore(JSON.stringify(s)),{type:'advance',minutes:1});
 assert.deepEqual(worker,direct,'worker and restored synchronous continuation preserve the recovered processing queue');
 assert.ok(s.business.ledger.some(e=>e.id===funded.postingId&&e.cents===85000));
});
