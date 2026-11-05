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


function descendants(s,source){const children=new Map();for(const r of child(s).records)for(const p of r.parents){if(!children.has(p))children.set(p,[]);children.get(p).push(r);}const result=[],queue=[source];while(queue.length){for(const r of children.get(queue.shift())||[]){result.push(r);queue.push(r.id);}}return result;}
function bytes(s){return {save:Buffer.byteLength(JSON.stringify(s)),portfolio:Buffer.byteLength(JSON.stringify(s.portfolio))};}
function storageTruth(s){
 const before=JSON.stringify(s),first=SOC.provider.inspect(s),second=SOC.provider.inspect(s);assert.deepEqual(second,first,'repeated read-only inspection is deterministic');assert.equal(JSON.stringify(s),before,'archive inspection cannot advance or rewrite state');const c=child(s),archive=first.customers.find(c=>c.id===CUSTOMER).services.find(r=>r.id==='archive');assert.ok(archive?.storage);const records=c.records.filter(r=>r.kind!=='meeting-probe'&&Number.isSafeInteger(r.expiresAt)&&!r.deleted&&(r.archiveId||r.storage?.resourceId||r.origin?.initialStorage?.resourceId||'archive')==='archive'&&r.region===c.resources.archive.effective.region),pending=c.records.filter(r=>!r.deleted&&r.processingAdmission?.plan.archive==='archive'),jobs=c.information.jobs.filter(j=>!['complete','failed'].includes(j.status)&&j.plan.archive==='archive');
 assert.equal(archive.storage.used,records.length);assert.equal(archive.storage.held,records.filter(r=>r.held).length);assert.equal(archive.storage.limit,c.resources.archive.effective.capacity*100);assert.equal(archive.storage.pending,pending.length);assert.equal(archive.storage.queued,jobs.length);assert.equal(archive.storage.remainingOutputs,jobs.reduce((n,j)=>n+j.plan.steps.length-j.stage,0)+pending.reduce((n,r)=>n+r.processingAdmission.plan.steps.length,0));assert.equal(archive.pressure.used,records.length/100);assert.equal(archive.pressure.limit,c.resources.archive.effective.capacity);assert.equal(archive.pressure.constrained,archive.pressure.used>=archive.pressure.limit);assert.equal(archive.pressure.at,s.clock);
}


test('owned archive capacity lets paid transcription finish the original full backlog and oldest refusal beyond500 records',t=>{
 let s=opening();s=until(s,x=>child(x).information.jobs.length===200&&child(x).information.jobs.every(j=>!['complete','failed'].includes(j.status))&&child(x).records.some(r=>r.processingAdmission),1150,'full lawful processing backlog');
 const originalJobs=structuredClone(child(s).information.jobs),originalRecords=originalJobs.map(j=>structuredClone(child(s).records.find(r=>r.id===j.source))),oldest=structuredClone(child(s).records.filter(r=>r.processingAdmission).sort((a,b)=>a.processingAdmission.refusedAt-b.processingAdmission.refusedAt||a.processingAdmission.refusalAuditId-b.processingAdmission.refusalAuditId)[0]);
 assert.equal(child(s).resources.archive.effective.capacity,20);assert.equal(originalJobs.length,200);assert.equal(originalRecords.length,200);assert.ok(oldest?.processingAdmission);storageTruth(s);
 const request={action:'operation',operationId:'transcription',customerId:CUSTOMER},q=SOC.provider.quote(s,request),cash=s.business.balance.cash;assert.deepEqual(q.blockers,[]);s=buy(s,request);assert.equal(cash-s.business.balance.cash,85000);s=until(s,x=>operationProject(x,'transcription')?.status==='complete',80,'funded processor');
 s=until(s,x=>child(x).records.length>=500,300,'initial500records');for(let n=0;n<10;n++)s=advanceOne(s);assert.ok(child(s).records.length>500,'500 representation rows cannot block already-owned20-unit archive');assert.equal(child(s).resources.archive.effective.capacity,20,'repair must not invent purchased storage');storageTruth(s);
 const complete=(state,job)=>{const outputs=descendants(state,job.source);return job.plan.steps.every((kind,index)=>outputs.some(r=>r.kind===kind&&r.parents.length===1&&(index===0?r.parents[0]===job.source:outputs.some(p=>p.id===r.parents[0]&&p.kind===job.plan.steps[index-1]))));};
 s=until(s,x=>originalJobs.every(j=>complete(x,j))&&complete(x,{source:oldest.id,plan:oldest.processingAdmission.plan}),1400,'all200originalplans and oldestrefusal actually complete');
 for(const record of originalRecords)assert.deepEqual(child(s).records.find(r=>r.id===record.id),record,'original capture remains exact; no expired/held/origin shortcut');const retained=child(s).records.find(r=>r.id===oldest.id);const {processingAdmission,...originalRefusalCapture}=oldest;assert.deepEqual(retained,originalRefusalCapture,'only the completed admission marker is removed');
 assert.equal(retained.processingAdmission,undefined);assert.ok(child(s).records.every(r=>!r.deleted&&!r.held&&r.expiresAt>s.clock));assert.ok(child(s).records.length<=20*100);assert.ok(child(s).records.some(r=>!child(s).interactions.some(i=>i.id===r.interaction)),'processing must support legitimate evicted terminal traces');
 storageTruth(s);const footprint=bytes(s);t.diagnostic(JSON.stringify({clock:s.clock,records:child(s).records.length,live:child(s).records.filter(r=>!r.deleted).length,originReceipts:child(s).information.originReceipts?.length||0,capacityUnits:child(s).resources.archive.effective.capacity,bytes:footprint}));assert.ok(footprint.save<8e6,JSON.stringify(footprint));assert.ok(footprint.portfolio<6e6,JSON.stringify(footprint));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);const command={type:'advance',minutes:1},worker=new Function(`${SOC.workerSource()}\nreturn SOC;`)();assert.deepEqual(worker.dispatch(SOC.restore(JSON.stringify(s)),command),SOC.dispatch(s,command));
});

test('paid Government retained storage keeps canonical capture origins and exact parent lineage beyond500 rows',t=>{
 let s=SOC.create({experience:'campaign',scenario:'government',market:'au-sydney',seed:2});for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});s=until(s,x=>x.providerCampaign.customers[0].stages[stage]?.status==='effective',60,stage);}
 for(const operationId of ['recording','transcription','compliance']){const request={action:'operation',operationId,customerId:CUSTOMER};s=until(s,x=>SOC.provider.quote(x,request).blockers.length===0,100,operationId+'eligible');s=buy(s,request);s=until(s,x=>operationProject(x,operationId)?.status==='complete',120,operationId+'delivered');}
 s=until(s,x=>child(x).records.some(r=>r.origin?.complete),120,'canonicalorigin');const original=structuredClone(child(s).records.find(r=>r.origin?.complete&&r.parents.length===0)),receipt=structuredClone(child(s).information.originReceipts.find(r=>r.recordId===original.id)),archive=structuredClone(child(s).resources.archive.effective);
 assert.deepEqual(child(s).information.pipeline.effective.steps,['transcription'],'paid government policy produces one derived transcript per capture, so500records require sustained lawful demand');
 s=until(s,x=>child(x).records.length>500,1000,'governmentrecords beyond500');assert.deepEqual(child(s).resources.archive.effective,archive);assert.deepEqual(child(s).records.find(r=>r.id===original.id),original);assert.deepEqual(child(s).information.originReceipts.find(r=>r.recordId===original.id),receipt);assert.equal(original.retentionDays,365);assert.ok(child(s).records.every(r=>!r.deleted&&r.expiresAt>s.clock));
 for(const r of descendants(s,original.id)){assert.deepEqual(r.origin,original.origin);assert.ok(r.expiresAt<=original.expiresAt);assert.ok(r.parents.every(id=>child(s).records.some(p=>p.id===id)));}assert.ok(descendants(s,original.id).length>0);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);storageTruth(s);const footprint=bytes(s);t.diagnostic(JSON.stringify({clock:s.clock,records:child(s).records.length,live:child(s).records.filter(r=>!r.deleted).length,originReceipts:child(s).information.originReceipts?.length||0,capacityUnits:child(s).resources.archive.effective.capacity,bytes:footprint}));assert.ok(footprint.save<8e6&&footprint.portfolio<6e6,JSON.stringify(footprint));
});
