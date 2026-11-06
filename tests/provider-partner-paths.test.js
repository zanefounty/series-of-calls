'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const PRODUCTS=require('../src/game/45-products.js');
const RECIPES=require('../src/game/23-provider-products.js').recipes;
const PATHS=require('../src/game/23-provider-partner-paths.js');
const CONTENT=require('../content/provider-partner-paths.v1.json');

function tick(s,n=1){for(let i=0;i<n;i++)s=SOC.dispatch(s,{type:'advance',minutes:1});return s;}
function fresh(local=false){let s=SOC.create({scenario:local?'government':'smb',mode:'sandbox'});if(local){s=SOC.dispatch(s,{type:'information',command:{action:'start'}});s=SOC.dispatch(s,{type:'information',command:{action:'configure',kind:'pipeline',config:{steps:['transcription','diarisation']}}});}for(const command of SOC.reference(s))s=SOC.dispatch(s,command);s=tick(s);s=SOC.dispatch(s,{type:'products',command:{action:'start'}});if(local){s=tick(s);s=SOC.dispatch(s,{type:'speech-models',command:{action:'start'}});}return s;}
function configure(s,recipes){for(const recipe of recipes)for(const [id,patch] of Object.entries(recipe.quote.config||{})){const resource=s.resources[id];if(!resource)continue;const config={...resource.desired,...patch};if(JSON.stringify(config)!==JSON.stringify(resource.desired))s=SOC.dispatch(s,{type:'configure',id,config});}return s;}
function startOffer(s,recipe){const input={id:recipe.id,family:recipe.family,edition:recipe.edition,unit:recipe.unit,quantity:recipe.quantity,features:recipe.features,dependencies:recipe.dependencies};s=SOC.dispatch(s,{type:'products',command:{action:'offer',offer:input}});return s;}
function startDeployment(s,recipe){s=SOC.dispatch(s,{type:'products',command:{action:'deploy',id:`d-${recipe.id}`,offer:recipe.id,productVersion:'scenario-1',mode:recipe.mode,region:s.jurisdiction,features:recipe.features,dependencies:recipe.dependencies,bindings:recipe.bindings}});return s;}
function prepareLocal(s,recipe){const prep=recipe.preparation;const deploymentId=`d-${recipe.id}`;s=SOC.dispatch(s,{type:'speech-models',command:{...prep.install,deploymentId,region:s.jurisdiction}});s=SOC.dispatch(s,{type:'speech-models',command:{...prep.integrationTest}});return s;}
function labPair(path){
 const source=RECIPES[path.requiredProducts[0]],target=RECIPES[path.requiredProducts[1]];assert.ok(source&&target,`${path.id} source and target product recipes exist`);
 let s=fresh(source.id==='cisco-local-speech');s=configure(s,[source,target]);s=startOffer(s,source);s=startOffer(s,target);s=tick(s);s=startDeployment(s,source);s=startDeployment(s,target);
 if(source.id==='cisco-local-speech')s=prepareLocal(s,source);
 s=tick(s,2);
 const command={action:'integration',id:path.integrationId,source:path.source.deploymentId,target:path.target.deploymentId,features:[{sourceFeature:path.source.feature,targetFeature:path.target.feature}]};
 s=SOC.dispatch(s,{type:'products',command});
 return {state:s,path};
}

test('P5 path contract maps declared native product features and costed paid quotes',()=>{
 assert.deepEqual(PATHS.PATHS,Object.fromEntries(CONTENT.paths.map(row=>[row.id,row])));
 assert.equal(PATHS.PACK,CONTENT.id);assert.equal(PATHS.VERSION,CONTENT.version);assert.equal(PATHS.OFFERS.length,3);
 assert.ok(Object.isFrozen(PATHS.PATHS['local-speech-product-integration'].source));assert.ok(Object.isFrozen(PATHS.OFFERS[0].offer));
 for(const row of CONTENT.paths){
  assert.ok(row.sourceIds===undefined||Array.isArray(row.sourceIds));
  assert.ok(PRODUCTS.families[row.source.family]?.features[row.source.feature],`${row.id} source feature is natively declared`);
  assert.ok(PRODUCTS.families[row.target.family]?.features[row.target.feature],`${row.id} target feature is natively declared`);
  assert.ok(RECIPES[row.requiredProducts[0]]?.family===row.source.family,`${row.id} has a paid source recipe`);
  assert.ok(RECIPES[row.requiredProducts[1]]?.family===row.target.family,`${row.id} has a paid target recipe`);
  assert.ok(row.resourceIds.length>=2&&row.requiredProducts.length>=2&&row.supportedChoices.length);
  for(const terms of [row.offer,row.retestOffer])assert.ok(terms.setupCents>0&&terms.periodCents>0&&terms.workMinutes>0&&terms.engineers>=0&&terms.support>0);
 }
 const source={};vm.createContext(source);vm.runInContext(PATHS.source()+';globalThis.api=SOC_PROVIDER_PARTNER_PATHS;',source);
 assert.deepEqual(JSON.parse(JSON.stringify(source.api.OFFERS)),JSON.parse(JSON.stringify(PATHS.OFFERS)),'serialized worker uses the same versioned offer contract');
 const browser={};vm.createContext(browser);vm.runInContext(fs.readFileSync(require.resolve('../src/game/23-provider-partner-paths.js'),'utf8')+';globalThis.api=SOC_PROVIDER_PARTNER_PATHS;',browser);
 assert.deepEqual(JSON.parse(JSON.stringify(browser.api.PATHS)),JSON.parse(JSON.stringify(PATHS.PATHS)),'browser fallback is byte-for-byte equivalent to the versioned content');
});

test('P5 Lab paths pass native directional tests, fail after retirement, and recover only after rebase and retest',()=>{
 for(const path of CONTENT.paths){
  const {state:initial}=labPair(path);let s=initial;
  for(const endpoint of [path.source,path.target]){
   const deployment=s.products.deployments.find(x=>x.id===endpoint.deploymentId);assert.equal(deployment?.provisioning.status,'ready',`${path.id}/${endpoint.deploymentId}: ${JSON.stringify(deployment?.provisioning)}`);
   assert.ok(deployment.effective?.features.includes(endpoint.feature),`${path.id}/${endpoint.feature} was effective in the native product state`);
  }
  let edge=s.products.integrations.find(x=>x.id===path.integrationId);assert.ok(edge);assert.equal(edge.result,null);
  s=SOC.dispatch(s,{type:'products',command:{action:'test-integration',id:path.integrationId}});
  edge=s.products.integrations.find(x=>x.id===path.integrationId);assert.equal(edge.result.status,'scenario-verified',`${path.id}: ${JSON.stringify(edge.result)}`);
  const sourceGeneration=edge.sourceGeneration,targetGeneration=edge.targetGeneration;
  s=SOC.dispatch(s,{type:'products',command:{action:'retire',id:path.target.deploymentId}});s=tick(s,1);
  assert.equal(s.products.deployments.find(x=>x.id===path.target.deploymentId).retirement.status,'retired',`${path.id} endpoint retirement removes the effective product`);
  s=SOC.dispatch(s,{type:'products',command:{action:'reinstate',id:path.target.deploymentId}});s=tick(s,2);
  assert.ok(s.products.deployments.find(x=>x.id===path.target.deploymentId).generation>targetGeneration);
  s=SOC.dispatch(s,{type:'products',command:{action:'test-integration',id:path.integrationId}});edge=s.products.integrations.find(x=>x.id===path.integrationId);assert.equal(edge.result.status,'blocked','stale test is not silently reused after reinstallation');
  s=SOC.dispatch(s,{type:'products',command:{action:'rebase-integration',id:path.integrationId}});
  s=SOC.dispatch(s,{type:'products',command:{action:'test-integration',id:path.integrationId}});
  edge=s.products.integrations.find(x=>x.id===path.integrationId);assert.equal(edge.result.status,'scenario-verified',`${path.id} explicit rebase/test restores only the new generation`);
  assert.equal(edge.sourceGeneration,sourceGeneration);
  const unowned=PATHS.projectEvidence(SOC.create({experience:'campaign',scenario:'smb'}),'absent-provider-project');assert.deepEqual(unowned,{ready:false,missing:['PAID_PARTNER_PATH_PROJECT_REQUIRED'],evidence:null},'a Lab product test alone earns no Provider partner credit');
 }
});

test('Provider P5 credit fails closed until paid route receipts, causal delivery, and exact support owners exist',()=>{
 const state=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy'}),customerId=state.providerCampaign.customers[0]?.id||'starter-customer',result=PATHS.observe(state,customerId);
 assert.equal(result.status,'incomplete');assert.equal(result.count,0);assert.equal(result.target,3);
 assert.ok(result.missing.every(x=>x==='PROVIDER_CUSTOMER_REQUIRED'||x.startsWith('provider-partner-integration-required:')));
 assert.deepEqual(PATHS.validateEvidence(state,customerId,{version:1,pack:PATHS.PACK,customerId,paths:[]}),{valid:false,missing:['INVALID_PROVIDER_PARTNER_PATH_EVIDENCE']});
});


test('native workplace integration admits the actual voice path and records its tested scope, while untested and retired edges fail',()=>{
 const path=CONTENT.paths.find(p=>p.id==='workplace-to-suite-calling');let {state:s}=labPair(path);
 const call=(state,id)=>SOC.dispatch(state,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:id,durationMinutes:2});
 const blocked=call(s,'unverified-edge');assert.equal(blocked.interactions.at(-1).outcome,'PRODUCT_FEATURE_UNAVAILABLE');assert.ok(!blocked.interactions.at(-1).trace.some(t=>t.code==='PRODUCT_INTEGRATION_ACCEPTED'));
 s=SOC.dispatch(s,{type:'products',command:{action:'test-integration',id:path.integrationId}});const tested=s.products.integrations.find(e=>e.id===path.integrationId);
 s=call(s,'tested-edge');const id=s.interactions.at(-1).id;s=tick(s,6);const delivered=s.interactions.find(i=>i.id===id);assert.equal(delivered.phase,'resolved',JSON.stringify(delivered));assert.equal(delivered.probe,undefined);
 const gate=delivered.trace.find(t=>t.code==='PRODUCT_INTEGRATION_ACCEPTED'&&t.integrationId===path.integrationId);assert.ok(gate);
 assert.equal(gate.resource,'phone');assert.equal(gate.testAt,tested.result.checkedAt);assert.equal(gate.sourceDeploymentId,path.source.deploymentId);assert.equal(gate.targetDeploymentId,path.target.deploymentId);assert.equal(gate.sourceFeature,path.source.feature);assert.equal(gate.targetFeature,path.target.feature);assert.equal(gate.sourceGeneration,tested.sourceGeneration);assert.equal(gate.targetGeneration,tested.targetGeneration);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=SOC.dispatch(s,{type:'products',command:{action:'retire',id:path.target.deploymentId}});s=tick(s);s=call(s,'retired-edge');assert.equal(s.interactions.at(-1).outcome,'PRODUCT_FEATURE_UNAVAILABLE');assert.ok(!s.interactions.at(-1).trace.some(t=>t.code==='PRODUCT_INTEGRATION_ACCEPTED'));
 s=SOC.dispatch(s,{type:'products',command:{action:'reinstate',id:path.target.deploymentId}});s=tick(s,2);s=call(s,'stale-generation');assert.equal(s.interactions.at(-1).outcome,'PRODUCT_FEATURE_UNAVAILABLE');
 s=SOC.dispatch(s,{type:'products',command:{action:'rebase-integration',id:path.integrationId}});s=SOC.dispatch(s,{type:'products',command:{action:'test-integration',id:path.integrationId}});s=call(s,'recovered-edge');const recoveredId=s.interactions.at(-1).id;s=tick(s,6);const recovered=s.interactions.find(i=>i.id===recoveredId);assert.equal(recovered.phase,'resolved');assert.ok(recovered.trace.some(t=>t.code==='PRODUCT_INTEGRATION_ACCEPTED'&&t.targetGeneration>gate.targetGeneration));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
