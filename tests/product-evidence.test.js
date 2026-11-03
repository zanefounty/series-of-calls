const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const Products=require('../src/game/45-products');
const Evidence=require('../src/game/28-product-evidence');

function fixture(dependency,feature,family='cisco:government',mode='jurisdiction-scoped-cloud'){
 const s={clock:0,scenario:'government',jurisdiction:'AU',resources:{phone:{generation:1,kind:'uc'}},products:Products.create()};
 const modes=Products.families[family].modes;if(!modes.includes(mode))mode=modes[0];
 Products.command(s,{action:'offer',offer:{id:'scenario-offer',family,edition:'standard',unit:'seat',quantity:1,features:[feature],dependencies:{[dependency]:'phone'}}});
 s.clock=1;Products.advance(s);
 Products.command(s,{action:'deploy',id:'scenario-deployment',offer:'scenario-offer',productVersion:'scenario-1',mode,features:[feature],dependencies:{[dependency]:'phone'},bindings:[],region:'AU'});
 s.productEvidence=Evidence.create(s);return s;
}
function req(s,id,dependency,feature='eligibility-evidence'){return Evidence.command(s,{action:'request',id,deploymentId:'scenario-deployment',feature,dependency,resourceId:'phone'});}
function businessQualification(s){s.business={player:'orchard-msp',qualifications:{'orchard-msp':{government:600}},events:[{id:'event-1',clock:0,code:'QUALIFICATION_RECORDED',sector:'government',fictional:true}]};}
function qualificationHooks(s){return {qualification:(root,resourceId)=>({eligible:true,authorised:true,organisation:root.business.player,scenario:root.scenario,expires:root.business.qualifications[root.business.player][root.scenario],resourceId})};}
function boundaryFixture(s){s.boundaries={bindings:{phone:'government-contract'},contracts:[{id:'government-contract',generation:2,provisioning:{status:'ready'},effective:{profile:'AU',flows:[{resource:'phone',resourceGeneration:1}]}}]};return {boundaryAssessment:(root,resourceId)=>({eligible:root.boundaries.bindings[resourceId]==='government-contract',contract:'government-contract',profile:'AU',resourceBindings:['phone']})};}
function lifecycleHooks(s){return {lifecycle:(root,resourceId,context)=>{const d=root.products.deployments.find(x=>x.id===context.deploymentId),o=root.products.offers.find(x=>x.id===context.offer);const life=o?.effectiveLifecycle;return {eligible:!!life&&life.sale==='available'&&life.support==='supported',offerId:o?.id,offerGeneration:o?.lifecycleGeneration,axes:life?{sale:life.sale,support:life.support}:null,deploymentId:d?.id,productVersion:d?.desired.productVersion,family:d?.desired.family,mode:d?.desired.mode,synthetic:true,externalApprovalClaim:false};}};}
function tick(s,hooks={}){s.clock++;Evidence.advance(s,hooks);}

test('AC-SOC-288 eligibility evidence requires a real retained qualification event, authorization, current expiry, and explicit effective tick',()=>{
 const s=fixture('eligibility-evidence','eligibility-evidence','microsoft:government-clouds','gcc');businessQualification(s);req(s,'evidence-eligibility-1','eligibility-evidence');
 const context={deploymentId:'scenario-deployment',feature:'eligibility-evidence',family:'microsoft:government-clouds',productVersion:'scenario-1',mode:'gcc',offer:'scenario-offer',generation:1,region:'AU'};
 assert.equal(Evidence.availability(s,'eligibility-evidence','phone',context,qualificationHooks(s)).ready,false);
 tick(s,qualificationHooks(s));assert.equal(Evidence.availability(s,'eligibility-evidence','phone',context,qualificationHooks(s)).ready,true);
 s.business.qualifications['orchard-msp'].government=s.clock;assert.equal(Evidence.availability(s,'eligibility-evidence','phone',context,qualificationHooks(s)).ready,false);
 const forged=fixture('eligibility-evidence','eligibility-evidence','microsoft:government-clouds','gcc');forged.business={player:'orchard-msp',qualifications:{'orchard-msp':{government:600}},events:[]};req(forged,'evidence-eligibility-forged','eligibility-evidence');tick(forged,qualificationHooks(forged));assert.equal(forged.productEvidence.requests[0].provisioning.status,'failed');assert.ok(forged.productEvidence.requests[0].provisioning.errors.includes('BUSINESS_QUALIFICATION_EXPIRED_OR_UNVERIFIED'));
});

test('AC-SOC-289 jurisdiction evidence needs an effective current boundary contract and trusted resource enforcement',()=>{
 const s=fixture('jurisdiction-evidence','workload-scoped-availability');const hooks=boundaryFixture(s);req(s,'evidence-boundary-1','jurisdiction-evidence','workload-scoped-availability');tick(s,hooks);
 const context={deploymentId:'scenario-deployment',feature:'workload-scoped-availability',family:'cisco:government',productVersion:'scenario-1',mode:'jurisdiction-scoped-cloud',offer:'scenario-offer',generation:1,region:'AU'};
 assert.equal(Evidence.availability(s,'jurisdiction-evidence','phone',context,hooks).ready,true);
 s.resources.phone.generation++;assert.equal(Evidence.availability(s,'jurisdiction-evidence','phone',context,hooks).ready,false);
 const blocked=fixture('jurisdiction-evidence','workload-scoped-availability');req(blocked,'evidence-boundary-blocked','jurisdiction-evidence','workload-scoped-availability');tick(blocked);assert.equal(blocked.productEvidence.requests[0].provisioning.status,'failed');
});

test('AC-SOC-290 lifecycle evidence is scoped to the actual offer lifecycle and deployment version/mode',()=>{
 const s=fixture('lifecycle-evidence','lifecycle-evidence','cisco:government','sovereign-infrastructure');req(s,'evidence-lifecycle-1','lifecycle-evidence','lifecycle-evidence');const hooks=lifecycleHooks(s);tick(s,hooks);
 const context={deploymentId:'scenario-deployment',feature:'lifecycle-evidence',family:'cisco:government',productVersion:'scenario-1',mode:'sovereign-infrastructure',offer:'scenario-offer',generation:1,region:'AU'};
 assert.equal(Evidence.availability(s,'lifecycle-evidence','phone',context,hooks).ready,true);
 s.products.offers[0].effectiveLifecycle.support='ended';assert.equal(Evidence.availability(s,'lifecycle-evidence','phone',context,hooks).ready,false);
});

test('AC-SOC-291 explicit revocation, stale deployment scope, and forged approvals cannot satisfy dependencies',()=>{
 const s=fixture('eligibility-evidence','eligibility-evidence','microsoft:government-clouds','gcc');businessQualification(s);req(s,'evidence-revoked-1','eligibility-evidence');const hooks=qualificationHooks(s);tick(s,hooks);
 const context={deploymentId:'scenario-deployment',feature:'eligibility-evidence',family:'microsoft:government-clouds',productVersion:'scenario-1',mode:'gcc',offer:'scenario-offer',generation:1,region:'AU'};
 assert.equal(Evidence.availability(s,'eligibility-evidence','phone',context,hooks).ready,true);Evidence.command(s,{action:'revoke',id:'evidence-revoked-1',reason:'evidence-withdrawn'},{authorize:()=>true});assert.equal(Evidence.availability(s,'eligibility-evidence','phone',context,hooks).reason,'PRODUCT_EVIDENCE_REVOKED');assert.equal(Evidence.validate(s),true);
 const stale=fixture('eligibility-evidence','eligibility-evidence','microsoft:government-clouds','gcc');businessQualification(stale);req(stale,'evidence-stale-1','eligibility-evidence');tick(stale,qualificationHooks(stale));stale.products.deployments[0].generation++;assert.equal(Evidence.availability(stale,'eligibility-evidence','phone',context,qualificationHooks(stale)).ready,false);
 const corrupt=structuredClone(s);corrupt.productEvidence.requests[0].effective.externalApprovalClaim=true;assert.throws(()=>Evidence.validate(corrupt),/INVALID_PRODUCT_EVIDENCE_(SAVE|PROOF)/);
 assert.throws(()=>Evidence.command(fixture('eligibility-evidence','eligibility-evidence','microsoft:government-clouds','gcc'),{action:'approve',id:'x',success:true}),/INVALID_PRODUCT_EVIDENCE_COMMAND/);
});

test('AC-SOC-292 requests reject undeclared dependencies, wrong features, and nonexistent resource references',()=>{
 const s=fixture('eligibility-evidence','eligibility-evidence','microsoft:government-clouds','gcc');
 assert.throws(()=>req(s,'bad-feature-1','eligibility-evidence','workload-scoped-availability'),/PRODUCT_EVIDENCE_DEPENDENCY_SCOPE_MISMATCH/);
 assert.throws(()=>Evidence.command(s,{action:'request',id:'bad-resource-1',deploymentId:'scenario-deployment',feature:'eligibility-evidence',dependency:'eligibility-evidence',resourceId:'missing'}),/PRODUCT_EVIDENCE_DEPENDENCY_SCOPE_MISMATCH/);
});

test('AC-SOC-293 save validation and worker source preserve scoped evidence while inspection stays pure',()=>{
 const s=fixture('eligibility-evidence','eligibility-evidence','microsoft:government-clouds','gcc');businessQualification(s);req(s,'evidence-worker-1','eligibility-evidence');const hooks=qualificationHooks(s);tick(s,hooks);const before=JSON.stringify(s);Evidence.inspect(s,hooks);Evidence.availability(s,'eligibility-evidence','phone',{deploymentId:'scenario-deployment',feature:'eligibility-evidence',family:'microsoft:government-clouds',productVersion:'scenario-1',mode:'gcc',offer:'scenario-offer',generation:1,region:'AU'},hooks);assert.equal(JSON.stringify(s),before);assert.equal(Evidence.validate(structuredClone(s)),true);
 const box={};vm.createContext(box);vm.runInContext(Evidence.source()+';globalThis.API=SOC_PRODUCT_EVIDENCE;',box);assert.deepEqual(JSON.parse(JSON.stringify(box.API.inspect(structuredClone(s),hooks))),Evidence.inspect(s,hooks));
 const content=require('../content/product-evidence.json');assert.deepEqual(content.runtime,{PACK:Evidence.PACK,VERSION:Evidence.VERSION,TTL:Evidence.TTL,evidenceTypes:Evidence.evidenceTypes,sourceIds:Evidence.sourceIds});
 const corrupt=structuredClone(s);corrupt.productEvidence.requests[0].effective.source.qualification.authorized=false;assert.throws(()=>Evidence.validate(corrupt),/INVALID_PRODUCT_EVIDENCE_PROOF/);
});
