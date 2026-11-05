'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const OWN=require('../src/game/23-provider-owned-sites');

const CUSTOMER='starter-customer';
const child=s=>s.portfolio.customers.find(row=>row.id===CUSTOMER).root;
const project=(s,id)=>s.providerCampaign.projects.findLast(row=>row.customerId===CUSTOMER&&row.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function until(s,predicate,limit=180){for(let n=0;n<limit&&!predicate(s);n++)s=SOC.dispatch(s,{type:'advance',minutes:1});assert.ok(predicate(s),`target not reached at ${s.clock}`);return s;}
function commit(s,request){const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[],JSON.stringify({clock:s.clock,request,blockers:quote.blockers}));return send(s,{...request,quoteRevision:quote.atRevision});}
function operation(s,id,config){return commit(s,{action:'operation',operationId:id,customerId:CUSTOMER,...(config?{config}:{})});}
function preparedOwnedSites(){
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 for(const stage of ['base','carrier','partner'])s=commit(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
 s=until(s,x=>x.providerCampaign.customers[0].status==='active',30);
 for(const [id,limit] of [['cisco-dedicated-uc',60],['primary-upstream',40],['site-diverse-ingress',40],['owned-site-operations',30]]){
  s=operation(s,id);
  s=until(s,x=>project(x,id)?.status==='complete',limit);
 }
 const incident=s.providerCampaign.incidents.find(row=>row.customerId===CUSTOMER&&['active','acknowledged'].includes(row.status));
 if(incident){
  if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
  const repair=incident.resource==='service'?'service-repair':'repair';
  s=operation(s,repair);
  s=until(s,x=>project(x,repair)?.status==='complete',60);
 }
 return s;
}

test('paid migration blocked by an active site fault retries after recovery without a second setup charge',()=>{
 let s=preparedOwnedSites();
 // The recovery occupies one support slot while commissioning. Add a second
 // shared support slot before buying the independently quoted migration.
 s=send(s,{action:'staff',engineers:s.business.workforce.engineers,support:2});
 const recoveryConfig={kind:'power',targetSite:OWN.SITE_IDS.head};
 s=operation(s,'site-recovery',recoveryConfig);
 s=until(s,x=>project(x,'site-recovery')?.status==='commissioning',20);
 const recovery=project(s,'site-recovery');
 s=until(s,x=>child(x).siteOperations.exercises.find(e=>e.id===recovery.operationReceipt.exerciseId)?.phase==='baseline',5);
 const exercise=child(s).siteOperations.exercises.find(e=>e.id===recovery.operationReceipt.exerciseId);
 const names=OWN.idsFor({id:CUSTOMER});
 assert.equal(exercise.status,'active');
 assert.equal(child(s).transport.sites[names.headTransport].provisioning.status,'ready');

 const migrationConfig={resourceId:'dedicated-endpoint',fromSite:OWN.SITE_IDS.branch,toSite:OWN.SITE_IDS.head};
 s=operation(s,'site-resource-migration',migrationConfig);
 const migration=project(s,'site-resource-migration');
 const paidPosting=migration.postingId;
 const paidRows=s.business.ledger.filter(row=>row.projectId===migration.id&&row.reason==='provider-operation');
 assert.equal(paidRows.length,1);
 assert.equal(paidRows[0].cents,migration.setupCents);

 s=until(s,x=>{
  const paid=project(x,'site-resource-migration');
  return paid?.status==='commissioning'&&paid.operationReceipt?.migrationId&&child(x).siteOperations.migrations.find(m=>m.id===paid.operationReceipt.migrationId)?.items[0]?.status==='blocked';
 },20);
 const commissionedMigration=project(s,'site-resource-migration');
 const blockedMigration=child(s).siteOperations.migrations.find(m=>m.id===commissionedMigration.operationReceipt.migrationId);
 assert.equal(blockedMigration.phase,'partial');
 assert.equal(blockedMigration.items[0].receiptId,null);
 assert.equal(project(s,'site-resource-migration').status,'commissioning');

 s=until(s,x=>{
  const row=child(x).siteOperations.exercises.find(e=>e.id===recovery.operationReceipt.exerciseId);
  return row?.phase==='faulted'&&row.continuity.length>0&&row.continuity.every(item=>item.success);
 },40);
 const recoveredContinuity=child(s).siteOperations.exercises.find(e=>e.id===recovery.operationReceipt.exerciseId);
 assert.equal(recoveredContinuity.status,'active');
 assert.equal(project(s,'site-resource-migration').status,'commissioning');

 // The migration's first cutover was blocked because the target was faulted.
 // Complete the legal recovery, including restore and post-restore work, first.
 s=send(s,{action:'site-response',projectId:recovery.id,response:'recover',quoteRevision:s.revision});
 s=until(s,x=>child(x).siteOperations.exercises.find(e=>e.id===recovery.operationReceipt.exerciseId)?.phase==='restoring',30);
 s=send(s,{action:'site-response',projectId:recovery.id,response:'restore',quoteRevision:s.revision});
 s=until(s,x=>project(x,'site-recovery')?.status==='complete',40);
 assert.equal(child(s).siteOperations.exercises.find(e=>e.id===recovery.operationReceipt.exerciseId)?.status,'complete');
 assert.equal(project(s,'site-resource-migration').status,'commissioning');

 for(let n=0;n<20&&!child(s).transport.reservations.length;n++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.ok(child(s).transport.reservations.length,JSON.stringify({clock:s.clock,jobs:s.providerCampaign.jobs.filter(j=>j.customerId===CUSTOMER).slice(-8),interactions:child(s).interactions.slice(-8).map(i=>({id:i.id,from:i.from,to:i.to,phase:i.phase,startedAt:i.startedAt,duration:i.durationMinutes,usage:i.usageMinutes})),reservations:child(s).transport.reservations}));
 const activeBefore=child(s).transport.reservations.filter(r=>[r.from,r.to].some(resource=>['dedicated-endpoint','alex'].includes(resource))).map(r=>r.id);
 assert.ok(activeBefore.length,'exercise the already-admitted dedicated endpoint path during the paid binding move');
 const beforeRetryCash=s.business.balance.cash;
 const beforeRefusal=JSON.stringify(s);
 assert.throws(()=>send(s,{action:'site-response',projectId:migration.id,response:'retry-migration',quoteRevision:s.revision}),/SITE_MIGRATION_ACTIVE_WORK/);
 assert.equal(JSON.stringify(s),beforeRefusal,'active-work refusal must leave the saved path and project unchanged');
 assert.equal(s.business.balance.cash,beforeRetryCash);
 assert.equal(project(s,'site-resource-migration').status,'commissioning');
 s=until(s,x=>!child(x).transport.reservations.some(r=>[r.from,r.to].some(resource=>['dedicated-endpoint','alex'].includes(resource))),30);
 const cashAtRetry=s.business.balance.cash;
 s=send(s,{action:'site-response',projectId:migration.id,response:'retry-migration',quoteRevision:s.revision});
 assert.equal(cashAtRetry-s.business.balance.cash,0,'retry reuses the already-paid migration project');
 s=until(s,x=>project(x,'site-resource-migration')?.status==='complete',10);
 const completed=project(s,'site-resource-migration');
 const applied=child(s).siteOperations.migrations.find(m=>m.id===completed.operationReceipt.migrationId);
 assert.equal(completed.id,migration.id);
 assert.equal(completed.postingId,paidPosting);
 assert.equal(applied.phase,'complete');
 assert.equal(applied.items[0].status,'complete');
 assert.ok(applied.items[0].receiptId);
 assert.equal(child(s).siteOperations.bindings['dedicated-endpoint'].site,OWN.SITE_IDS.head);
 assert.equal(s.business.ledger.filter(row=>row.projectId===migration.id&&row.reason==='provider-operation').length,1);

 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);

 const restored=SOC.restore(JSON.stringify(s)),command={type:'advance',minutes:1},expected=SOC.dispatch(restored,command);
 const box={postMessage:value=>{box.result=value;}};
 vm.createContext(box);vm.runInContext(SOC.workerSource(),box);
 box.onmessage({data:{id:'owned-site-migration-retry',state:restored,command}});
 assert.equal(box.result.error,undefined,box.result.error);
 assert.deepEqual(JSON.parse(JSON.stringify(box.result.state)),expected);
});
