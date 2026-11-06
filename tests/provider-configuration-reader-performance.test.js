'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const AUTH=require('../src/game/23-provider-configuration-authority');

const CUSTOMER='starter-customer';
const child=s=>s.portfolio.customers.find(row=>row.id===CUSTOMER).root;
const customer=s=>s.providerCampaign.customers.find(row=>row.id===CUSTOMER);
function command(s,request){const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[]);return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});}
function until(s,predicate,limit=80){for(let n=0;n<limit&&!predicate(s);n++)s=SOC.dispatch(s,{type:'advance',minutes:1});assert.ok(predicate(s),`condition not reached at minute ${s.clock}`);return s;}
function opening(){
 let s=SOC.create({experience:'campaign',seed:73});
 for(const stage of ['base','carrier','partner'])s=command(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
 return until(s,state=>customer(state).status==='active');
}
function readProjection(s,c,root,at,memo){
 try{
  const reader=AUTH.configurationReaderAt(s.providerCampaign,c,root,at,{catalogue:SOC.catalogue,...(memo?{expectedModelMemo:memo}:{})});
  const rows=Object.fromEntries(Object.keys(root.resources).sort().map(id=>{
   try{return [id,{value:reader(id),provenance:reader.provenanceAt(id)}];}
   catch(error){return [id,{error:error.message}];}
  }));
  return {rows};
 }catch(error){return {error:error.message};}
}
function compareEveryHistoricalMinute(s){
 const memo=AUTH.createExpectedModelMemo(),before=JSON.stringify(s);
 deepFreeze(s);
 for(const c of s.providerCampaign.customers){
  const root=s.portfolio.customers.find(row=>row.id===c.portfolioId).root;
  for(let at=0;at<=root.clock;at++)assert.deepEqual(readProjection(s,c,root,at,memo),readProjection(s,c,root,at),`cached historical projection differs for ${c.id} at ${at}`);
 }
 assert.equal(JSON.stringify(s),before,'timeline caching cannot mutate the frozen source state');
 return memo;
}
function deepFreeze(value,seen=new Set()){
 if(!value||typeof value!=='object'||seen.has(value))return value;
 seen.add(value);for(const child of Object.values(value))deepFreeze(child,seen);return Object.freeze(value);
}

test('AC-SOC-771 historical configuration reads are pure on frozen inputs and return isolated values',()=>{
 const s=opening(),root=child(s),c=customer(s),before=JSON.stringify(s);
 deepFreeze(s);
 for(const at of [0,s.clock]){
  const read=AUTH.configurationReaderAt(s.providerCampaign,c,root,at,{catalogue:SOC.catalogue});
  const first=read('carrier');assert.ok(first);const original=structuredClone(first);
  assert.equal(typeof first.config.enabled,'boolean');first.config.enabled=!first.config.enabled;
  const provenance=read.provenanceAt('carrier'),originalProvenance=structuredClone(provenance);
  assert.ok(provenance);provenance.writes.push({projectId:'forged',at,generation:999});
  assert.deepEqual(read('carrier'),original,'mutating one returned projection must not alter future reads');
  assert.deepEqual(read.provenanceAt('carrier'),originalProvenance,'returned provenance must also be isolated');
  assert.equal(read('not-a-resource'),null);
 }
 assert.equal(JSON.stringify(s),before,'historical reads leave even frozen simulation inputs unchanged');
});

test('AC-SOC-772 the optimized reader still rejects forged paid-generation evidence',()=>{
 const s=opening(),root=child(s),project=s.providerCampaign.projects.find(row=>row.customerId===CUSTOMER&&row.configSubmittedAt!==null);
 assert.ok(project);
 const forged=structuredClone(s);forged.providerCampaign.projects.find(row=>row.id===project.id).expectedGenerations.phone=root.resources.phone.generation+10;
 const forgedCustomer=customer(forged),forgedRoot=child(forged);
 assert.throws(()=>AUTH.configurationReaderAt(forged.providerCampaign,forgedCustomer,forgedRoot,forgedRoot.clock,{catalogue:SOC.catalogue}).provenanceAt('phone'),/INVALID_PROVIDER_CONFIG_AUTHORITY:GENERATION/);
 assert.equal(SOC.restore(JSON.stringify(s)).revision,s.revision,'the unmodified dispatched save remains restorable');
});

test('AC-SOC-775 validator-scoped configuration epochs match uncached reads at every dispatched historical minute',()=>{
 let s=opening();
 s=command(s,{action:'operation',operationId:'recording',customerId:CUSTOMER});
 s=until(s,state=>state.providerCampaign.projects.findLast(row=>row.customerId===CUSTOMER&&row.operationId==='recording')?.status==='complete');
 assert.ok(s.clock>0,'the fixture has dispatched historical configuration boundaries');
 compareEveryHistoricalMinute(s);
});

test('AC-SOC-776 cached timeline respects product commissioning due and keeps forged generations rejected',()=>{
 let s=opening();
 s=command(s,{action:'operation',operationId:'ms-workplace-calling',customerId:CUSTOMER});
 s=until(s,state=>state.providerCampaign.projects.findLast(row=>row.customerId===CUSTOMER&&row.productId==='ms-workplace-calling')?.status==='complete');
 const deployment=child(s).products.deployments.find(row=>row.id==='d-ms-workplace-calling');
 assert.ok(deployment?.provisioning.due<=s.clock,'the queried history crosses the paid deployment due');
 const memo=compareEveryHistoricalMinute(s);
 const authenticRoot=child(s),authenticReader=AUTH.configurationReaderAt(s.providerCampaign,customer(s),authenticRoot,s.clock,{catalogue:SOC.catalogue,expectedModelMemo:memo}),authentic=authenticReader('phone');
 authentic.config.enabled=!authentic.config.enabled;assert.notEqual(authenticReader('phone').config.enabled,authentic.config.enabled,'cached configuration copies remain isolated');
 const authenticProvenance=authenticReader.provenanceAt('phone'),provenanceCopy=structuredClone(authenticProvenance);authenticProvenance.writes.push({projectId:'forged',at:s.clock,generation:999});assert.deepEqual(authenticReader.provenanceAt('phone'),provenanceCopy,'cached provenance copies remain isolated');
 const forged=structuredClone(s),root=child(forged),project=forged.providerCampaign.projects.find(row=>row.customerId===CUSTOMER&&row.productId==='ms-workplace-calling');
 project.expectedGenerations.phone=root.resources.phone.generation+10;
 const forgedCustomer=customer(forged);
 assert.throws(()=>AUTH.configurationReaderAt(forged.providerCampaign,forgedCustomer,root,root.clock,{catalogue:SOC.catalogue,expectedModelMemo:memo}).provenanceAt('phone'),/INVALID_PROVIDER_CONFIG_AUTHORITY:GENERATION/);
 assert.throws(()=>AUTH.configurationReaderAt(forged.providerCampaign,forgedCustomer,root,root.clock,{catalogue:SOC.catalogue,expectedModelMemo:JSON.parse(JSON.stringify(memo))}),/EXPECTED_MODEL_MEMO_SCOPE/,'serialized timeline caches are not accepted');
 assert.equal(SOC.restore(JSON.stringify(s)).revision,s.revision,'cache use leaves the authentic paid save restorable');

 // This deliberately minimal authority-model counterexample exercises nested
 // replay around a retirement threshold; it is not an accepted gameplay save.
 const scopeState=SOC.create({scenario:'smb',seed:81}),scopeChild=scopeState,scopeCustomer={id:CUSTOMER,portfolioId:CUSTOMER,scenario:'smb',planId:'swift'},recording={id:'recording-project',customerId:CUSTOMER,kind:'operation',operationId:'recording',configSubmittedAt:2,acceptedAt:1,status:'complete',expectedGenerations:{recorder:2},serviceRetirement:{resources:['recorder'],requestedAt:10,effectiveAt:11,expectedGenerations:{recorder:3}}},provider={contentVersion:'provider-campaigns-8',projects:[recording]},restores=[];
 scopeChild.clock=20;scopeChild.resources.recorder.generation=5;
 for(const [index,startedAt] of [9,11].entries()){
  const id=`restore-${index}`,restoreProject={id:`project-${id}`,customerId:CUSTOMER,kind:'operation',operationId:'site-recovery',configSubmittedAt:3,acceptedAt:2+index,status:'complete',config:{kind:'power',targetSite:'site-a'},operationReceipt:{projectId:`project-${id}`,exerciseId:id}};
  const prior=AUTH.configurationReaderAt(provider,scopeCustomer,scopeChild,startedAt,{catalogue:SOC.catalogue})('recorder').config;
  provider.projects.push(restoreProject);restores.push({id,startedAt,kind:'power',targetSite:'site-a',restoration:{requestedAt:12+index,due:13+index},backupSnapshot:{resources:[{id:'recorder',config:prior}]}});
 }
 scopeChild.siteOperations={exercises:restores};
 const plain=AUTH.configurationReaderAt(provider,scopeCustomer,scopeChild,20,{catalogue:SOC.catalogue})('recorder');
 const scoped=AUTH.configurationReaderAt(provider,scopeCustomer,scopeChild,20,{catalogue:SOC.catalogue,expectedModelMemo:AUTH.createExpectedModelMemo()})('recorder');
 assert.deepEqual(scoped,plain,'nested restore-start projections before and after a retirement must not share an epoch');
});
