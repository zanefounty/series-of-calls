const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const P=require('../src/game/45-products.js');
const profileRegistry=require('../spec/work-packages/product-profile-obligations.json');

const readyHooks={
 authorize:()=>true,
 observeDependency:(s,kind,resource)=>{
  if(kind.endsWith('-evidence')||['language-model','integration-version','operator'].includes(kind))return {ready:!!s.syntheticEvidence?.[resource],generation:1};
  const r=s.resources?.[resource];if(!r)return {ready:false,reason:'MISSING_DEPENDENCY'};
  if(kind==='calendar'&&!r.effective?.calendar)return {ready:false,reason:'CALENDAR_NOT_ENABLED'};
  if(kind==='capture-permission'&&(!r.effective?.consent||!r.effective?.identityMapping))return {ready:false,reason:'CAPTURE_PERMISSION_NOT_READY'};
  if(kind==='workforce'&&(!r.effective?.people||!r.effective?.entitlements))return {ready:false,reason:'WORKFORCE_NOT_STAFFED'};
  if(kind==='crm'&&!r.effective?.identityMapping)return {ready:false,reason:'CRM_IDENTITY_MAPPING_MISSING'};
  if(kind==='licensing-service'&&!r.effective?.licensing)return {ready:false,reason:'LOCAL_LICENCE_UNAVAILABLE'};
  if(kind==='channel-supplier'&&!r.effective?.approved)return {ready:false,reason:'CHANNEL_NOT_APPROVED'};
  const result=SOC.observe(s,resource);return {ready:result.ready,generation:r.generation,reason:result.reasons[0]||'DEPENDENCY_UNAVAILABLE'};
 },
 testDirectionalPath:()=>({ready:true})
};
function start(){let s=SOC.create({scenario:'smb'});s.products=P.create(s);s=SOC.dispatch(s,{type:'advance',minutes:1});s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:2}});s=SOC.dispatch(s,{type:'advance',minutes:1});s.syntheticEvidence={'evidence-region':true,'evidence-workload':true,'evidence-lifecycle':true,'evidence-language':true,'evidence-integration':true};return s;}
function refsFor(family,features){const out={};for(const feature of features)for(const dep of P.families[family].features[feature])out[dep]=({identity:'identity',carrier:'carrier',calendar:'room','capture-permission':'recorder',workforce:'people',crm:'cases','api-access':'engage',compute:'local','licensing-service':'local','network-edge':'access',recording:'recorder',processing:'speech','channel-supplier':'messages','interop-provider':'room',media:'phone','tenant-authority':'identity','contract-authority':'identity','billing-system':'service','order-system':'service','support-owner':'service','jurisdiction-evidence':'evidence-region','eligibility-evidence':'evidence-workload','lifecycle-evidence':'evidence-lifecycle','language-model':'evidence-language','integration-version':'evidence-integration',storage:'archive','information-policy':'archive',operator:'people'})[dep];return out;}
function command(s,action,body){return P.command(s,{action,...body},readyHooks);}
function offer(s,id,family,features){return command(s,'offer',{offer:{id,family,edition:'scenario-edition',unit:'seat',quantity:20,features,dependencies:refsFor(family,features)}});}
function tick(s,n=1){for(let i=0;i<n;i++){s.clock++;P.advance(s,readyHooks);}return s;}
function deploy(s,id,offerId,mode,version='scenario-1'){return command(s,'deploy',{id,offer:offerId,productVersion:version,mode});}

test('AC-SOC-085 each mapped product family has distinct scenario slots and modes; real target example strings do not become capabilities',()=>{
 const familyRows=profileRegistry.records.filter(r=>r.classification==='product-family');
 assert.equal(familyRows.length,14);assert.equal(Object.keys(P.families).length,14);
 for(const row of familyRows){
  const f=Object.entries(P.families).find(([,v])=>v.sourceID===row.sourceID);
  assert.ok(f,`missing ${row.sourceID}`);assert.equal(f[1].organization,row.sourceRecord.notes.includes('provider:msf')?'provider:msf':'actor:disco-collaboration');
  assert.ok(f[1].modes.length>0);assert.ok(Object.keys(f[1].features).length>0);
  const s=start();assert.throws(()=>P.command(s,{action:'offer',offer:{id:'bad-offer',family:f[0],edition:'scenario-edition',unit:'seat',quantity:1,features:['unsupported-real-feature'],dependencies:{}}},readyHooks),/UNSUPPORTED_SCENARIO_FEATURE/);
  const example=row.sourceRecord.target_examples[0].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  assert.throws(()=>P.command(s,{action:'offer',offer:{id:'example-is-not-a-feature',family:f[0],edition:'scenario-edition',unit:'seat',quantity:1,features:[example],dependencies:{}}},readyHooks),/UNSUPPORTED_SCENARIO_FEATURE/);
  const feature=Object.keys(f[1].features)[0];offer(s,'valid-offer',f[0],[feature]);tick(s);deploy(s,'valid-instance','valid-offer',f[1].modes[0]);tick(s);
  assert.equal(P.featureStatus(s,'valid-instance',feature,readyHooks).available,true,`${row.sourceID}/${feature}`);
 }
});

test('AC-SOC-086 offer sale and support lifecycle are independent and effective only after provisioning',()=>{
 const s=start();offer(s,'phone-offer','microsoft:workplace-phone',['telephony']);tick(s);
 assert.deepEqual(P.inspect(s).offers[0].effectiveLifecycle,{sale:'available',support:'supported',changedAt:2});
 deploy(s,'phone-live','phone-offer','multitenant');tick(s);
 assert.equal(P.featureStatus(s,'phone-live','telephony',readyHooks).available,true);
 command(s,'lifecycle',{offer:'phone-offer',sale:'ended',support:'supported'});assert.equal(P.inspect(s).offers[0].effectiveLifecycle.sale,'available');tick(s);
 assert.equal(P.inspect(s).offers[0].effectiveLifecycle.sale,'ended');assert.equal(P.featureStatus(s,'phone-live','telephony',readyHooks).available,true);
 assert.throws(()=>deploy(s,'new-phone','phone-offer','multitenant'),/OFFER_NOT_FOR_SALE/);
 command(s,'lifecycle',{offer:'phone-offer',sale:'ended',support:'ended'});tick(s);
 assert.equal(P.featureStatus(s,'phone-live','telephony',readyHooks).code,'OFFER_UNSUPPORTED');P.validate(s);
});

test('AC-SOC-087 deployment mode, feature subset and dependency gates preserve prior effective configuration',()=>{
 const s=start();offer(s,'room-offer','microsoft:meetings-rooms',['room-devices']);tick(s);
 assert.throws(()=>deploy(s,'bad-mode','room-offer','premises'),/PRODUCT_DEPLOYMENT_MODE_UNSUPPORTED/);
 assert.throws(()=>command(s,'deploy',{id:'bad-feature',offer:'room-offer',productVersion:'scenario-1',mode:'cloud',features:['events']}),/OFFER_FEATURE_NOT_INCLUDED/);
 deploy(s,'room-live','room-offer','room-deployment');tick(s);const original=structuredClone(s.products.deployments[0].effective);
 command(s,'configure',{id:'room-live',config:{dependencies:{identity:'missing-resource',calendar:'room'}}});tick(s);
 assert.equal(s.products.deployments[0].provisioning.status,'failed');assert.deepEqual(s.products.deployments[0].effective,original);
 assert.equal(P.featureStatus(s,'room-live','room-devices',readyHooks).available,true);
 const invalid=structuredClone(s);invalid.products.deployments[0].desired.features=['vendor-secret-feature'];assert.throws(()=>P.validate(invalid),/INVALID_PRODUCT_CONFIGURATION/);
});

test('AC-SOC-088 compatibility is directional, feature-scoped and bound to exact deployment generations and versions',()=>{
 const s=start();offer(s,'disco-suite-offer','cisco:suite-calling',['multitenant-calling']);offer(s,'microsnoft-phone-offer','microsoft:workplace-phone',['telephony']);tick(s);
 deploy(s,'disco-suite','disco-suite-offer','multitenant','scenario-1');deploy(s,'ms-phone','microsnoft-phone-offer','multitenant','scenario-2');tick(s);
 command(s,'integration',{id:'suite-to-phone',source:'disco-suite',target:'ms-phone',features:[{sourceFeature:'multitenant-calling',targetFeature:'telephony'}]});
 assert.equal(command(s,'test-integration',{id:'suite-to-phone'}).status,'scenario-verified');
 assert.throws(()=>command(s,'integration',{id:'reverse-unproved',source:'ms-phone',target:'disco-suite',features:[{sourceFeature:'unsupported','targetFeature':'multitenant-calling'}]}),/INTEGRATION_FEATURE_NOT_DECLARED/);
 command(s,'configure',{id:'disco-suite',config:{productVersion:'scenario-3'}});tick(s);
 assert.equal(command(s,'test-integration',{id:'suite-to-phone'}).reasons.includes('COMPATIBILITY_SCOPE_STALE'),true);assert.equal(P.compatibilityStatus(s,'suite-to-phone').status,'stale');P.validate(s);
});

test('AC-SOC-089 family-specific conflicts, jurisdiction evidence and local licensing remain explicit prerequisites',()=>{
 const conflict=start();assert.throws(()=>offer(conflict,'conflict-offer','microsoft:meetings-rooms',['meeting-intelligence','protected-meeting-mode']),/CONFLICTING_PRODUCT_FEATURES/);
 const gov=start();offer(gov,'gov-offer','microsoft:government-clouds',['eligibility-evidence']);tick(gov);deploy(gov,'gov-live','gov-offer','gcc');tick(gov);
 assert.equal(P.featureStatus(gov,'gov-live','eligibility-evidence',readyHooks).available,true);
 gov.syntheticEvidence['evidence-workload']=false;assert.equal(P.featureStatus(gov,'gov-live','eligibility-evidence',readyHooks).code,'FEATURE_DEPENDENCY_UNAVAILABLE');
 const local=start();offer(local,'local-speech-offer','cisco:local-speech',['local-inference','licensing-connectivity']);tick(local);deploy(local,'local-speech','local-speech-offer','customer-operated-local');tick(local);
 assert.equal(P.featureStatus(local,'local-speech','local-inference',readyHooks).available,true);
 assert.equal(P.featureStatus(local,'local-speech','licensing-connectivity',readyHooks).available,true);
 let unlicensed=SOC.dispatch(local,{type:'configure',id:'local',config:{licensing:false}});unlicensed=SOC.dispatch(unlicensed,{type:'advance',minutes:1});
 assert.equal(P.featureStatus(unlicensed,'local-speech','licensing-connectivity',readyHooks).code,'FEATURE_DEPENDENCY_UNAVAILABLE');
 assert.throws(()=>P.command(local,{action:'offer',offer:{id:'bad-local',family:'microsoft:local',edition:'scenario-edition',unit:'seat',quantity:1,features:['on-premises-teams'],dependencies:{}}},readyHooks),/UNSUPPORTED_SCENARIO_FEATURE/);
});

test('AC-SOC-090 save validation, deterministic inspection and source-serialized worker behavior match',()=>{
 const s=start();offer(s,'api-offer','microsoft:communication-apis',['embedded-communications']);tick(s);deploy(s,'api-instance','api-offer','embedded');tick(s);
 const before=P.fingerprint(s),first=JSON.stringify(P.inspect(s)),second=JSON.stringify(P.inspect(s));assert.equal(first,second);assert.equal(P.fingerprint(s),before);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(P.validate(restored),true);assert.equal(P.fingerprint(restored),before);
 const tampered=structuredClone(s);tampered.products.offers[0].unit='Mbps';assert.throws(()=>P.validate(tampered),/INVALID_PRODUCT_OFFER/);
 const worker={};vm.createContext(worker);vm.runInContext(P.source()+';globalThis.productsPack=SOC_PRODUCTS;',worker);const W=worker.productsPack,state=structuredClone(s);
 W.command(state,{action:'configure',id:'api-instance',config:{productVersion:'scenario-2'}},readyHooks);P.command(s,{action:'configure',id:'api-instance',config:{productVersion:'scenario-2'}},readyHooks);
 assert.equal(JSON.stringify(state.products),JSON.stringify(s.products));
});
