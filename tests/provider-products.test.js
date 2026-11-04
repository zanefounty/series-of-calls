const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const P=require('../src/game/45-products.js');
const CONTENT=require('../src/game/23-provider-products.js');
const marketFixture=require('./helpers/market-fixture');

const market=(family)=>family.startsWith('microsoft:')?'ms':'cisco';
function fresh(){let s=SOC.create({scenario:'smb',mode:'sandbox'});for(const c of SOC.reference(s))s=SOC.dispatch(s,c);s=SOC.dispatch(s,{type:'products',command:{action:'start'}});return s;}
function tick(s,n=1){for(let i=0;i<n;i++)s=SOC.dispatch(s,{type:'advance',minutes:1});return s;}
function applyConfig(s,changes){for(const [id,patch] of Object.entries(changes||{})){assert.ok(s.resources[id],`unknown resource ${id}`);const config={...s.resources[id].desired,...patch};if(JSON.stringify(config)!==JSON.stringify(s.resources[id].desired))s=SOC.dispatch(s,{type:'configure',id,config});}return s;}
function runRecipe(recipe){let s=fresh();for(const command of recipe.preparation?.commands||[])s=SOC.dispatch(s,command);s=applyConfig(s,recipe.quote.config);s=tick(s);
 s=SOC.dispatch(s,{type:'products',command:{action:'offer',offer:{id:recipe.id, family:recipe.family,edition:recipe.edition,unit:recipe.unit,quantity:recipe.quantity,features:recipe.features,dependencies:recipe.dependencies}}});s=tick(s);
 s=SOC.dispatch(s,{type:'products',command:{action:'deploy',id:`d-${recipe.id}`,offer:recipe.id,productVersion:'scenario-1',mode:recipe.mode,region:s.jurisdiction,features:recipe.features,dependencies:recipe.dependencies,bindings:recipe.bindings}});s=tick(s);
 return {s,report:recipe.features.map(feature=>P.featureStatus(s,`d-${recipe.id}`,feature,SOC.productHooks?.(s)||{}))};
}

test('recipes are immutable, worker-serializable and cover each source-linked Microsoft and Cisco family',()=>{
 const keys=Object.keys(CONTENT.recipes);assert.equal(keys.length,14);assert.ok(Object.isFrozen(CONTENT.recipes));
 const source=CONTENT.source();const worker={};vm.createContext(worker);vm.runInContext(source+';globalThis.products=SOC_PROVIDER_PRODUCTS;',worker);
 assert.deepEqual(JSON.parse(JSON.stringify(worker.products.recipes)),CONTENT.recipes);
 const families=new Set(Object.values(CONTENT.recipes).map(x=>x.family));assert.equal(families.size,14);
 for(const [id,r] of Object.entries(CONTENT.recipes)){
  assert.equal(r.id,id);assert.ok(P.families[r.family],r.family);assert.deepEqual(r.sourceIds,[P.families[r.family].sourceID]);
  assert.ok(r.product.features.length&&r.product.dependencies.length&&r.product.mode&&r.product.bindings.length>=0);
  assert.deepEqual(r.product.features,r.features);assert.ok(r.quote.setupCents>0&&r.quote.workMinutes>0&&r.quote.engineers>0&&r.quote.sourceIds.length);
  assert.ok(r.features.every(feature=>r.bindings.some(binding=>binding.feature===feature)),`${id} must bind each offered feature`);
  assert.ok(Array.isArray(r.operations));
  for(const b of r.bindings)assert.ok(r.features.includes(b.feature),`${id} binding for unoffered ${b.feature}`);
  assert.equal(market(r.family),id.startsWith('ms-')?'ms':'cisco');
 }
});

test('all fourteen representative recipes apply validated quote configuration, then execute through shared SOC product dispatch',()=>{
 for(const [id,recipe] of Object.entries(CONTENT.recipes)){
  let result;try{result=runRecipe({...recipe,id});}catch(error){error.message=`${id}: ${error.message}`;throw error;}const {s,report}=result;
  if(id.includes('government-boundary'))assert.equal(s.products.deployments[0].provisioning.errors[0]?.code,'PRODUCT_EVIDENCE_UNAVAILABLE',`${id}: expected missing scoped evidence to block`);
  else if(id==='cisco-local-speech')assert.equal(s.products.deployments[0].provisioning.errors[0]?.code,'SPEECH_EVIDENCE_NOT_INSTALLED');
  else assert.equal(s.products.deployments[0].provisioning.status,'ready',`${id}: ${JSON.stringify(s.products.deployments[0].provisioning)}`);
  assert.equal(report.length,recipe.features.length,`${id}`);
  for(const b of recipe.bindings){
   if(id.includes('government-boundary')||id==='cisco-local-speech'){assert.ok(s.products.deployments[0].desired.bindings.some(x=>x.feature===b.feature&&x.resources[0]===b.resources[0]));continue;}
   assert.ok(P.bindingsForResource(s,b.resources[0]).some(x=>x.deploymentId===`d-${id}`&&x.feature===b.feature),`${id}/${b.feature}`);
  }
  for(const [resource,patch] of Object.entries(recipe.quote.config||{}))for(const [key,value] of Object.entries(patch))assert.deepEqual(s.resources[resource].desired[key],value,`${id}/${resource}.${key}`);
  assert.ok(SOC.validateState(SOC.restore(JSON.stringify(s))));
 }
});

test('paid product quotes carry validated configuration effects and authored prerequisites',()=>{
 const local=CONTENT.recipes['cisco-local-speech'];assert.ok(local.product.dependencies.includes('language-model'));assert.ok(local.product.dependencies.includes('information-policy'));assert.ok(local.product.bindings.includes('speech'));
 const cloud=CONTENT.recipes['ms-workplace-calling'];assert.equal(cloud.mode,'multitenant');
 const interop=CONTENT.recipes['cisco-meetings-interoperability'];assert.equal(interop.mode,'interop-bridge');
 const cpaas=CONTENT.recipes['cisco-programmable-engagement'];assert.ok(cpaas.features.includes('webhook-delivery'));assert.ok(cpaas.bindings.some(x=>x.feature==='webhook-delivery'&&x.resources.includes('engage')));
 for(const r of Object.values(CONTENT.recipes)){assert.ok(r.quote.setupCents>0&&r.quote.periodCents>=0);assert.ok(r.quote.requirements&&r.quote.resources.length);assert.deepEqual(r.product.features,r.features);assert.deepEqual(r.operations,[],'secondary offers are omitted until backed by typed SOC commands');}
});

test('local speech pathway provisions an authored model and versioned integration before its bound product is usable',()=>{
 const recipe=CONTENT.recipes['cisco-local-speech'];let s=SOC.create({scenario:'government'});
 s=SOC.dispatch(s,{type:'information',command:{action:'start'}});s=SOC.dispatch(s,{type:'information',command:{action:'configure',kind:'pipeline',config:{steps:['transcription','diarisation']}}});
 for(const c of SOC.reference(s))if(c.type==='configure')s=SOC.dispatch(s,c);s=tick(s);s=SOC.dispatch(s,{type:'products',command:{action:'start'}});s=tick(s);s=SOC.dispatch(s,{type:'speech-models',command:{action:'start'}});
 s=applyConfig(s,recipe.quote.config);s=SOC.dispatch(s,{type:'products',command:{action:'offer',offer:{id:recipe.id,family:recipe.family,edition:recipe.edition,unit:recipe.unit,quantity:recipe.quantity,features:recipe.features,dependencies:recipe.dependencies}}});s=tick(s);
 const deploymentId=`d-${recipe.id}`;s=SOC.dispatch(s,{type:'products',command:{action:'deploy',id:deploymentId,offer:recipe.id,productVersion:'scenario-1',mode:recipe.mode,region:s.jurisdiction,features:recipe.features,dependencies:recipe.dependencies,bindings:recipe.bindings}});
 const prep=recipe.preparation;s=SOC.dispatch(s,{type:'speech-models',command:{...prep.install,deploymentId,region:s.jurisdiction}});s=SOC.dispatch(s,{type:'speech-models',command:{...prep.integrationTest}});s=tick(s);
 assert.equal(s.speechModels.installations[0].provisioning.status,'ready');assert.equal(s.speechModels.integrationTests[0].provisioning.status,'ready');
 const deployed=s.products.deployments.find(d=>d.id===deploymentId);assert.equal(deployed.provisioning.status,'ready',JSON.stringify(deployed.provisioning));
 assert.ok(recipe.bindings.every(b=>P.bindingsForResource(s,b.resources[0]).some(x=>x.deploymentId===deploymentId&&x.feature===b.feature)));
 const incoming=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'authored-local-speech'});s=tick(incoming,8);
 assert.equal(s.information.jobs.at(-1).status,'complete');assert.ok(s.records.some(r=>r.kind==='transcription'));
});

test('government profile requires real boundary and qualification evidence requests before scoped product features become effective',()=>{
 const recipe=CONTENT.recipes['ms-government-boundary'],fixture=marketFixture.fixtures.find(x=>x.id==='cust-tokyo'),child=s=>marketFixture.child(s,fixture.id),send=(s,command)=>marketFixture.dispatchCustomer(s,fixture.id,command);
 let s=marketFixture.setup({customers:[fixture]});s=send(s,{type:'products',command:{action:'start'}});s=send(s,{type:'product-evidence',command:{action:'start'}});
 for(const [resource,patch] of Object.entries(recipe.quote.config)){const config={...child(s).resources[resource].desired,...patch};if(JSON.stringify(config)!==JSON.stringify(child(s).resources[resource].desired))s=send(s,{type:'configure',id:resource,config});}
 s=send(s,{type:'products',command:{action:'offer',offer:{id:recipe.id,family:recipe.family,edition:recipe.edition,unit:recipe.unit,quantity:recipe.quantity,features:recipe.features,dependencies:recipe.dependencies}}});s=marketFixture.dispatch(s,{type:'advance',minutes:1});
 const deploymentId=`d-${recipe.id}`;s=send(s,{type:'products',command:{action:'deploy',id:deploymentId,offer:recipe.id,productVersion:'scenario-1',mode:recipe.mode,region:child(s).jurisdiction,features:recipe.features,dependencies:recipe.dependencies,bindings:recipe.bindings}});
 for(const request of recipe.preparation.requests)s=send(s,{type:'product-evidence',command:{action:'request',id:`evidence-${request.feature}`,deploymentId,feature:request.feature,dependency:request.dependency,resourceId:request.resourceId}});
 s=marketFixture.dispatch(s,{type:'advance',minutes:1});const customer=child(s),deployment=customer.products.deployments.find(d=>d.id===deploymentId);
 assert.equal(deployment.provisioning.status,'ready',JSON.stringify({deployment:deployment.provisioning,proofs:customer.productEvidence.requests.map(x=>({id:x.id,status:x.provisioning.status,errors:x.provisioning.errors,desired:x.desired}))}));
 for(const request of recipe.preparation.requests){const proof=SOC.calculate(customer).productEvidence.requests.find(x=>x.id===`evidence-${request.feature}`);assert.equal(proof.availability.ready,true,JSON.stringify(proof.availability));assert.equal(proof.effective.externalApprovalClaim,false);}
 assert.ok(recipe.bindings.every(b=>P.bindingsForResource(customer,b.resources[0]).some(x=>x.deploymentId===deploymentId&&x.feature===b.feature)));
});

test('dedicated UC refuses an unprovisioned platform binding and recovers after a real dedicated resource is added',()=>{
 const recipe=CONTENT.recipes['cisco-dedicated-uc'];let s=fresh();
 s=SOC.dispatch(s,{type:'products',command:{action:'offer',offer:{id:recipe.id,family:recipe.family,edition:recipe.edition,unit:recipe.unit,quantity:recipe.quantity,features:recipe.features,dependencies:recipe.dependencies}}});s=tick(s);
 const deploy={type:'products',command:{action:'deploy',id:'d-dedicated-before',offer:recipe.id,productVersion:'scenario-1',mode:recipe.mode,region:s.jurisdiction,features:recipe.features,dependencies:recipe.dependencies,bindings:recipe.bindings}};
 assert.throws(()=>SOC.dispatch(s,deploy),/PRODUCT_BINDING_OUT_OF_SCOPE/);
 s=SOC.dispatch(s,recipe.preparation.commands[0]);s=tick(s);s=SOC.dispatch(s,{...deploy,command:{...deploy.command,id:'d-dedicated-after'}});s=tick(s);
 const d=s.products.deployments.find(x=>x.id==='d-dedicated-after');assert.equal(d.provisioning.status,'ready',JSON.stringify(d.provisioning));
 assert.ok(P.bindingsForResource(s,'dedicated-platform').some(x=>x.deploymentId===d.id&&x.feature==='unified-communications'));
});
