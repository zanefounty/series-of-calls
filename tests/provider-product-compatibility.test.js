'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');

// Small deterministic fixture instead of a large committed save. The funded
// project has not submitted any resources yet; map only its receipt to the
// documented v1 shape. Historical 60f009d saves were separately generated via
// that runtime's public commands and restored without rewriting their bytes.
function pendingProduct(){
 let s=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',seed:73});
 const commit=command=>{const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[]);s=SOC.dispatch(s,{type:'provider',requestId:`provider-${s.providerRequestSequence+1}`,command:{...command,quoteRevision:q.atRevision}});};
 for(const stage of ['base','carrier','partner'])commit({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
 for(let n=0;n<30&&s.providerCampaign.customers[0].status!=='active';n++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 commit({action:'operation',operationId:'cisco-dedicated-uc',customerId:'starter-customer'});
 return s;
}
const product=s=>s.providerCampaign.projects.find(p=>p.productId==='cisco-dedicated-uc');
const customer=s=>s.portfolio.customers[0].root;
function legacyPending(explicit=false){
 const s=pendingProduct(),p=product(s);assert.equal(p.status,'running');assert.equal(p.configSubmittedAt,null);
 assert.equal(p.recipeVersion,2);assert.ok(p.resources.includes('dedicated-endpoint'));
 p.resources=p.resources.filter(id=>id!=='dedicated-endpoint');
 if(explicit)p.recipeVersion=1;else delete p.recipeVersion;
 return s;
}
function complete(s){
 for(let n=0;n<80&&product(s).status!=='complete';n++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.equal(product(s).status,'complete');return s;
}

for(const explicit of [false,true])test(`legacy dedicated project ${explicit?'explicit v1':'without recipeVersion'} restores and completes without fabricated caller migration`,()=>{
 const original=legacyPending(explicit),source=JSON.stringify(original);let restored=SOC.restore(source);
 assert.equal(JSON.stringify(original),source);assert.equal(JSON.stringify(restored),source);
 assert.equal(customer(restored).resources['dedicated-endpoint'],undefined);
 restored=complete(restored);
 assert.equal(customer(restored).resources['dedicated-endpoint'],undefined,'old quoted resources do not acquire a new free endpoint');
 assert.equal(SOC.operations.platform(customer(restored),'alex'),'phone','historical orders do not invent migration evidence');
 assert.equal(customer(restored).providerTasks?.some(t=>t.mode==='product-dedicated')||false,false);
 assert.ok(customer(restored).products.deployments.find(d=>d.id==='d-cisco-dedicated-uc')?.effective);
 assert.equal(restored.business.ledger.filter(row=>row.projectId===product(restored).id&&row.reason==='provider-operation').length,1);
 assert.deepEqual(SOC.restore(JSON.stringify(restored)),restored);
 const continuation=SOC.dispatch(restored,{type:'advance',minutes:1});
 assert.equal(SOC.operations.platform(customer(continuation),'alex'),'phone');
});

test('dedicated recipe versions reject unknown versions and resource-list relabelling before migration',()=>{
 const old=legacyPending(),before=JSON.stringify(old);
 for(const recipeVersion of [0,3,999,'2',null]){
  const unknown=structuredClone(old);product(unknown).recipeVersion=recipeVersion;
  assert.throws(()=>SOC.restore(JSON.stringify(unknown)),/INVALID_PROVIDER_RECIPE_VERSION/,'unsupported recipeVersion '+String(recipeVersion));
 }
 const relabelled=structuredClone(old);product(relabelled).recipeVersion=2;
 assert.throws(()=>SOC.restore(JSON.stringify(relabelled)),/INVALID_PROVIDER_PROJECT_LINK/,'v1 resource receipt cannot claim v2 delivery');
 assert.equal(JSON.stringify(old),before);
});

test('new dedicated v2 project funds its endpoint and waits for actual caller migration after restore',()=>{
 let s=SOC.restore(JSON.stringify(pendingProduct()));const charged=s.business.balance.cost;
 assert.equal(product(s).recipeVersion,2);s=complete(s);
 assert.ok(customer(s).resources['dedicated-endpoint']?.effective);
 assert.equal(SOC.operations.platform(customer(s),'alex'),'dedicated-platform');
 const task=customer(s).providerTasks.find(t=>t.mode==='product-dedicated');
 assert.ok(customer(s).operations.migrations.some(m=>m.id===task.migrationId&&m.status==='complete'));
 assert.equal(s.business.balance.cost,charged,'within the first period restore/commissioning does not charge the paid setup again');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
