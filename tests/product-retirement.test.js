const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../src/game/45-products.js');

const hooks={authorize:()=>true,observeDependency:()=>({ready:true,generation:1}),validateBinding:()=>true};
function setup(){
 const s={clock:0,products:P.create()};
 P.command(s,{action:'offer',offer:{id:'phone-offer',family:'microsoft:workplace-phone',edition:'scenario-edition',unit:'seat',quantity:10,features:['telephony'],dependencies:{identity:'identity'}}},hooks);
 s.clock=1;P.advance(s,hooks);
 P.command(s,{action:'deploy',id:'phone-live',offer:'phone-offer',productVersion:'scenario-1',mode:'multitenant',bindings:[{feature:'telephony',resources:['phone']}]},hooks);
 s.clock=2;P.advance(s,hooks);
 assert.equal(P.featureStatus(s,'phone-live','telephony',hooks).available,true);assert.equal(P.bindingStatus(s,'phone-live','telephony','phone',hooks).available,true);
 return s;
}
const retire=(s)=>P.command(s,{action:'retire',id:'phone-live'},hooks);
const reinstate=(s)=>P.command(s,{action:'reinstate',id:'phone-live'},hooks);

test('retirement takes effect next tick, stops feature use and retains a validated paid-generation receipt',()=>{
 const s=setup(),legacy=structuredClone(s);assert.equal(P.validate(legacy),true,'old product records without retirement fields remain valid');
 const before=structuredClone(s.products.deployments[0].effective);
 const pending=retire(s);assert.equal(pending.retirement.status,'pending');assert.deepEqual(pending.retirement,{version:1,requestedAt:2,effectiveAt:3,generation:2,status:'pending'});
 assert.equal(pending.generation,2);assert.equal(P.featureStatus(s,'phone-live','telephony',hooks).available,true,'service stays available until the effective time');assert.equal(P.bindingsForResource(s,'phone').length,1);assert.equal(P.validate(s),true);
 s.clock=3;P.advance(s,hooks);const d=s.products.deployments[0];
 assert.equal(d.retirement.status,'retired');assert.equal(d.retirementHistory.length,1);assert.equal(d.retirementHistory[0].configurationGeneration,1);assert.deepEqual(d.retirementHistory[0].configuration,before);
 assert.equal(P.featureStatus(s,'phone-live','telephony',hooks).code,'PRODUCT_DEPLOYMENT_RETIRED');assert.equal(P.bindingStatus(s,'phone-live','telephony','phone',hooks).code,'PRODUCT_DEPLOYMENT_RETIRED');assert.equal(P.bindingsForResource(s,'phone').length,1,'retired binding remains reserved; the core base service cannot take over for free');assert.equal(P.validate(s),true);
 assert.throws(()=>P.command(s,{action:'configure',id:'phone-live',config:{productVersion:'scenario-2'}},hooks),/PRODUCT_DEPLOYMENT_RETIRED/);
 assert.throws(()=>P.command(s,{action:'deploy',id:'phone-live',offer:'phone-offer',productVersion:'scenario-2',mode:'multitenant'},hooks),/INVALID_PRODUCT_DEPLOYMENT/);
});

test('only explicit reinstatement provisions a new generation and keeps the exact retirement receipt',()=>{
 const s=setup();retire(s);s.clock=3;P.advance(s,hooks);const receipt=structuredClone(s.products.deployments[0].retirementHistory[0]);
 assert.throws(()=>reinstate({...s,products:{...s.products,deployments:s.products.deployments.map(d=>({...d,retirement:{...d.retirement,status:'pending'}}))}}),/PRODUCT_DEPLOYMENT_NOT_RETIRED/);
 const d=reinstate(s);assert.equal(d.retirement,null);assert.equal(d.generation,3);assert.equal(d.provisioning.status,'pending');assert.equal(d.provisioning.due,4);assert.equal(d.effective,null);
 assert.equal(P.featureStatus(s,'phone-live','telephony',hooks).code,'DEPLOYMENT_NOT_EFFECTIVE');assert.equal(P.bindingsForResource(s,'phone').length,1,'recommissioning retains the original binding while provisioning');assert.deepEqual(s.products.deployments[0].retirementHistory[0],receipt);assert.equal(P.validate(s),true);
 s.clock=4;P.advance(s,hooks);assert.equal(P.featureStatus(s,'phone-live','telephony',hooks).available,true);assert.deepEqual(s.products.deployments[0].retirementHistory[0],receipt);assert.equal(P.validate(s),true);
});

test('historical bindings remain reserved while reinstatement provisions and release only after an effective rebind',()=>{
 const s=setup();retire(s);s.clock=3;P.advance(s,hooks);reinstate(s);
 assert.equal(P.bindingsForResource(s,'phone').length,1,'retired binding remains reserved through reinstatement');
 P.command(s,{action:'configure',id:'phone-live',config:{bindings:[{feature:'telephony',resources:['new-phone']}]}},hooks);
 assert.equal(P.bindingsForResource(s,'phone').length,1,'changing desired configuration does not release the previous binding early');assert.equal(P.bindingsForResource(s,'new-phone').length,1);
 s.clock=4;P.advance(s,hooks);assert.equal(P.bindingsForResource(s,'phone').length,0,'the effective new generation replaces its old resource binding');assert.equal(P.bindingsForResource(s,'new-phone').length,1);assert.equal(P.validate(s),true);
});

test('reinstatement requires the current offer lifecycle and restored features still require live dependencies',()=>{
 const s=setup();retire(s);s.clock=3;P.advance(s,hooks);
 P.command(s,{action:'lifecycle',offer:'phone-offer',sale:'ended',support:'supported'},hooks);s.clock=4;P.advance(s,hooks);
 assert.throws(()=>reinstate(s),/OFFER_NOT_FOR_SALE/);assert.equal(P.validate(s),true);

 const failed=setup();retire(failed);failed.clock=3;P.advance(failed,hooks);reinstate(failed);
 failed.clock=4;P.advance(failed,{...hooks,observeDependency:()=>({ready:false,reason:'IDENTITY_UNAVAILABLE'})});
 assert.equal(failed.products.deployments[0].provisioning.status,'failed');assert.equal(P.featureStatus(failed,'phone-live','telephony',hooks).available,false);assert.equal(failed.products.deployments[0].effective,null);assert.equal(P.validate(failed),true);
});

test('failed commissioning can retry the same immutable generation and keeps its resource binding reserved',()=>{
 const s={clock:0,products:P.create()};P.command(s,{action:'offer',offer:{id:'phone-offer',family:'microsoft:workplace-phone',edition:'scenario-edition',unit:'seat',quantity:10,features:['telephony'],dependencies:{identity:'identity'}}},hooks);s.clock=1;P.advance(s,hooks);
 P.command(s,{action:'deploy',id:'phone-live',offer:'phone-offer',productVersion:'scenario-1',mode:'multitenant',bindings:[{feature:'telephony',resources:['phone']}]},hooks);
 s.clock=2;P.advance(s,{...hooks,observeDependency:()=>({ready:false,reason:'IDENTITY_UNAVAILABLE'})});const d=s.products.deployments[0],generation=d.generation;
 assert.equal(d.provisioning.status,'failed');assert.equal(P.bindingStatus(s,'phone-live','telephony','phone',hooks).code,'DEPLOYMENT_NOT_EFFECTIVE');assert.equal(P.bindingsForResource(s,'phone').length,1);
 assert.throws(()=>P.command(s,{action:'retry',id:'phone-live'},{...hooks,authorize:()=>false}),/PRODUCT_AUTHORIZATION_DENIED/);
 P.command(s,{action:'retry',id:'phone-live'},hooks);assert.equal(d.generation,generation);assert.equal(d.provisioning.status,'pending');assert.equal(d.provisioning.due,3);assert.equal(P.bindingsForResource(s,'phone').length,1);assert.equal(P.validate(s),true);
 assert.throws(()=>P.command(s,{action:'retry',id:'phone-live'},hooks),/PRODUCT_DEPLOYMENT_NOT_FAILED/);
 s.clock=3;P.advance(s,hooks);assert.equal(P.featureStatus(s,'phone-live','telephony',hooks).available,true);assert.equal(d.generation,generation);assert.equal(P.validate(s),true);
});

test('retirement records reject unknown schemas and history no longer bound to the original effective generation',()=>{
 const s=setup();retire(s);s.clock=3;P.advance(s,hooks);const unknown=structuredClone(s);unknown.products.deployments[0].retirementHistory[0].version=2;assert.throws(()=>P.validate(unknown),/INVALID_PRODUCT_RETIREMENT_HISTORY/);
 const relabelled=structuredClone(s);relabelled.products.deployments[0].retirementHistory[0].configuration.dependencies.identity='other-identity';assert.throws(()=>P.validate(relabelled),/INVALID_PRODUCT_RETIREMENT_HISTORY/);
 const altered=structuredClone(s);altered.products.deployments[0].retirementHistory[0].configurationGeneration=0;assert.throws(()=>P.validate(altered),/INVALID_PRODUCT_RETIREMENT_HISTORY/);
});

test('an effective retirement cannot be erased while its current generation still points at the retired receipt',()=>{
 const s=setup();retire(s);s.clock=3;P.advance(s,hooks);
 const erased=structuredClone(s);erased.products.deployments[0].retirement=null;
 assert.throws(()=>P.validate(erased),/INVALID_PRODUCT_RETIREMENT_HISTORY/,'otherwise the retained effective configuration would become available again');
 const omitted=structuredClone(s);delete omitted.products.deployments[0].retirement;
 assert.throws(()=>P.validate(omitted),/INVALID_PRODUCT_RETIREMENT_HISTORY/);
 assert.equal(P.featureStatus(s,'phone-live','telephony',hooks).code,'PRODUCT_DEPLOYMENT_RETIRED');
});
