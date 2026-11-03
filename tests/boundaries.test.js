const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const B=require('../src/game/43-boundaries');

const regions={AU:'AU',US:'US',JP:'JP',EU:'EU'};
function fixture(){const s={clock:0,resources:{identity:{generation:1},cases:{generation:1}}};s.boundaries=B.create(s);return s;}
function contract(profile,overrides={}){
 const region=regions[profile];
 return {
  id:`contract-${profile.toLowerCase()}`,workload:'service-records',profile,sensitivity:'confidential',edition:'standard',productVersion:'release-1',
  offeringEvidence:profile==='US'?'eligible':'pending',customerAuthorization:'approved',agencyAuthorizationRequired:profile==='US',agencyAuthorization:profile==='US'?'approved':'not-required',
  serviceRegistration:profile==='JP'?'registered':'not-registered',serviceRegistrationId:profile==='JP'?'jp-service-1':null,
  usesAi:false,aiUseDecision:'not-required',language:profile==='JP'?'ja':'en',supportLanguage:profile==='JP'?'ja':'en',
  requirements:{processingRegions:[region],storageRegions:[region],backupRegions:[region],keyRegions:[region],adminRegions:[region],supportRegions:[region],allowedAccessRoles:['agent'],adminAuthorization:'customer-approved',continuity:'cloud',allowedTransferMechanisms:[]},
  flows:[{id:'records',resource:'identity',informationClass:'confidential',processingRegions:[region],storageRegions:[region],backupRegions:[region],keyCustodyRegions:[region],adminLocations:[region],supportRegions:[region],adminAuthorization:'customer-approved',accessRoles:['agent'],connectivity:'cloud',continuity:'cloud',licenceMode:'cloud',transfer:{parties:[],mechanism:null}}],
  ...overrides
 };
}
function stage(s,input){B.command(s,{action:'contract',contract:input});}
function observe(s,id,overrides={}){const profile=s.boundaries.contracts.find(x=>x.id===id)?.desired.profile;B.command(s,{action:'observe',contract:id,observed:{connected:true,cloudLicenceAvailable:true,localLicenceGraceActive:false,localLicenceGraceExpiresAt:null,localServicesAvailable:false,localKeyCustodyAvailable:false,adminPathAvailable:true,adminPathLocation:regions[profile],...overrides}});}
function provision(s){B.advance(s,s.clock+1);}
function ready(profile,overrides={}){const s=fixture(),input=contract(profile,overrides);stage(s,input);observe(s,input.id);provision(s);return s;}
function codes(result){return result.blocking.map(x=>x.code);}

test('AC-SOC-119 contract staging keeps desired, effective, provisioning, and observed state independent',()=>{
 const s=fixture(),input=contract('AU');stage(s,input);let c=s.boundaries.contracts[0];
 assert.equal(c.provisioning.status,'pending');assert.equal(c.effective,null);assert.equal(c.desired.profile,'AU');assert.equal(c.observed.connected,true);
 observe(s,input.id,{cloudLicenceAvailable:true});assert.equal(c.provisioning.status,'pending');assert.equal(c.effective,null);
 provision(s);assert.equal(c.provisioning.status,'ready');assert.deepEqual(c.effective,c.desired);assert.equal(B.evaluate(s,input.id).eligible,true);assert.equal(B.validate(s),true);
 const old=structuredClone(c.effective);stage(s,{...input,productVersion:'release-2'});assert.equal(c.provisioning.status,'pending');assert.deepEqual(c.effective,old);assert.equal(c.desired.productVersion,'release-2');
 B.command(s,{action:'bind',resource:'identity',contract:input.id});assert.equal(B.contractForResource(s,'identity').id,input.id);assert.equal(B.inspect(s).bindings.identity,input.id);
 const forged=structuredClone(s);forged.boundaries.contracts[0].effective.id='unrelated';assert.throws(()=>B.validate(forged),/INVALID_BOUNDARY_EFFECTIVE/);
});

test('AC-SOC-120 four fictional profiles have distinct explicit runtime rules and useful valid examples',()=>{
 const expected={AU:'domestic-control',US:'eligible-administration',JP:'registered-service-language',EU:'union-region-transfer-path'};
 for(const profile of ['AU','US','JP','EU']){const s=ready(profile),result=B.evaluate(s,`contract-${profile.toLowerCase()}`);assert.equal(result.eligible,true,profile);assert.equal(result.profileRule,expected[profile]);assert.equal(result.legalApprovalClaim,false);assert.equal(result.synthetic,true);}
 assert.equal(new Set(Object.values(B.profiles).map(x=>x.fictionalRule)).size,4);
});

test('AC-SOC-121 US offering, customer, and agency authorization, and JP service and AI decisions, remain separate',()=>{
 const us=ready('US',{offeringEvidence:'pending',customerAuthorization:'pending',agencyAuthorization:'pending'});assert.deepEqual(codes(B.evaluate(us,'contract-us')),['US_OFFERING_EVIDENCE_REQUIRED','US_CUSTOMER_AUTHORIZATION_REQUIRED','US_AGENCY_AUTHORIZATION_REQUIRED']);
 const jp=ready('JP',{serviceRegistration:'not-registered',serviceRegistrationId:null,language:'en',supportLanguage:'en',usesAi:true,aiUseDecision:'pending'});assert.deepEqual(codes(B.evaluate(jp,'contract-jp')),['JP_SERVICE_REGISTRATION_REQUIRED','JP_LANGUAGE_SUPPORT_REQUIRED','JP_AI_USE_REVIEW_REQUIRED']);
 const ai=ready('JP',{usesAi:true,aiUseDecision:'denied'});assert.ok(codes(B.evaluate(ai,'contract-jp')).includes('JP_AI_USE_REVIEW_REQUIRED'));
});

test('AC-SOC-122 information flows bind declared classifications, locations, roles, and resource generations',()=>{
 const badFlow={...contract('AU').flows[0],informationClass:'public',processingRegions:['US'],storageRegions:['AU'],backupRegions:['AU'],keyCustodyRegions:['AU'],adminLocations:['AU'],supportRegions:['AU'],accessRoles:['provider'],resource:'cases'};
 const s=ready('AU',{flows:[badFlow]});const result=B.evaluate(s,'contract-au');
 for(const code of ['INFORMATION_CLASSIFICATION_TOO_LOW','PROCESSING_REGION_NOT_ALLOWED','ACCESS_ROLE_NOT_ALLOWED'])assert.ok(codes(result).includes(code),code);
 assert.deepEqual(result.resourceBindings,[{flowId:'records',resource:'cases',generation:1}]);
 s.resources.cases.generation=2;assert.ok(codes(B.evaluate(s,'contract-au')).includes('BOUND_RESOURCE_GENERATION_STALE'));
});

test('AC-SOC-123 key custody and administration are independently checked; EU transfer paths need declared parties and mechanism',()=>{
 const key=ready('AU',{flows:[{...contract('AU').flows[0],keyCustodyRegions:['US'],adminLocations:['US']} ]});
 assert.ok(codes(B.evaluate(key,'contract-au')).includes('KEY_CUSTODY_REGION_NOT_ALLOWED'));
 assert.ok(codes(B.evaluate(key,'contract-au')).includes('ADMIN_LOCATION_NOT_ALLOWED'));
 const eu=ready('EU',{requirements:{...contract('EU').requirements,processingRegions:['EU','US']},flows:[{...contract('EU').flows[0],processingRegions:['EU','US']}]});
 assert.ok(codes(B.evaluate(eu,'contract-eu')).includes('EU_PROFILE_IS_UNION_WIDE'));
 assert.ok(codes(B.evaluate(eu,'contract-eu')).includes('EU_TRANSFER_PATH_REQUIRED'));
 const transferred=ready('EU',{requirements:{...contract('EU').requirements,processingRegions:['EU','US'],allowedTransferMechanisms:['safeguards']},flows:[{...contract('EU').flows[0],processingRegions:['EU','US'],transfer:{parties:['fictional-processor'],mechanism:'safeguards'}}]});
 assert.ok(!codes(B.evaluate(transferred,'contract-eu')).includes('EU_TRANSFER_PATH_REQUIRED'));
 assert.equal(Object.hasOwn(contract('EU'),'memberStateApproval'),false);
 const admin=ready('AU');observe(admin,'contract-au',{adminPathAvailable:true,adminPathLocation:'US'});assert.ok(codes(B.evaluate(admin,'contract-au')).includes('ADMIN_PATH_LOCATION_NOT_ALLOWED'));
});

test('AC-SOC-124 disconnected local continuity requires local services, keys, unexpired local grace, and an admin path',()=>{
 const localFlow={...contract('AU').flows[0],connectivity:'local',continuity:'local',licenceMode:'local-grace'};
 const localReq={...contract('AU').requirements,continuity:'local'};
 const s=ready('AU',{requirements:localReq,flows:[localFlow]});
 observe(s,'contract-au',{connected:false,cloudLicenceAvailable:true,localLicenceGraceActive:true,localLicenceGraceExpiresAt:10,localServicesAvailable:true,localKeyCustodyAvailable:true,adminPathAvailable:true,adminPathLocation:'AU'});
 assert.equal(B.evaluate(s,'contract-au').eligible,true);
 observe(s,'contract-au',{connected:false,cloudLicenceAvailable:true,localLicenceGraceActive:false,localLicenceGraceExpiresAt:null,localServicesAvailable:false,localKeyCustodyAvailable:false,adminPathAvailable:false,adminPathLocation:null});
 const result=B.evaluate(s,'contract-au');for(const code of ['LOCAL_SERVICES_UNAVAILABLE','LOCAL_KEY_CUSTODY_UNAVAILABLE','DISCONNECTED_LICENSE_UNAVAILABLE','ADMIN_PATH_UNAVAILABLE'])assert.ok(codes(result).includes(code));
 const cloudOnly=ready('AU',{requirements:localReq,flows:[{...localFlow,licenceMode:'cloud'}]});observe(cloudOnly,'contract-au',{connected:false,cloudLicenceAvailable:true,localServicesAvailable:true,localKeyCustodyAvailable:true,adminPathAvailable:true,adminPathLocation:'AU'});assert.ok(codes(B.evaluate(cloudOnly,'contract-au')).includes('FLOW_REQUIRES_LOCAL_LICENSE_GRACE'));
});

test('AC-SOC-125 evaluation reports all blockers with precise paths and reads do not mutate state',()=>{
 const s=ready('JP',{usesAi:true,aiUseDecision:'pending',serviceRegistration:'not-registered',serviceRegistrationId:null,language:'en',supportLanguage:'en',flows:[{...contract('JP').flows[0],informationClass:'public',supportRegions:['US'],accessRoles:['provider'],keyCustodyRegions:['US']}]});
 const before=JSON.stringify(s),fingerprint=B.fingerprint(s),r=B.evaluate(s,'contract-jp');
 for(const code of ['JP_SERVICE_REGISTRATION_REQUIRED','JP_LANGUAGE_SUPPORT_REQUIRED','JP_AI_USE_REVIEW_REQUIRED','INFORMATION_CLASSIFICATION_TOO_LOW','SUPPORT_LOCATION_NOT_ALLOWED','ACCESS_ROLE_NOT_ALLOWED','KEY_CUSTODY_REGION_NOT_ALLOWED'])assert.ok(codes(r).includes(code),code);
 assert.ok(r.blocking.every(x=>typeof x.path==='string'&&x.path.length>0));assert.equal(JSON.stringify(s),before);assert.equal(B.fingerprint(s),fingerprint);
});

test('AC-SOC-126 saves validate, fingerprints track staged and observed policy, content matches source, and worker source is reproducible',()=>{
 const s=ready('US'),save=JSON.stringify(s),fp=B.fingerprint(s);assert.equal(B.validate(JSON.parse(save)),true);assert.equal(B.inspect(s).contracts[0].evaluation.eligible,true);
 observe(s,'contract-us',{cloudLicenceAvailable:false});assert.notEqual(B.fingerprint(s),fp);assert.equal(B.evaluate(s,'contract-us').eligible,false);
 const content=JSON.parse(fs.readFileSync(require.resolve('../content/boundaries.json'),'utf8'));
 assert.equal(content.pack,B.PACK);assert.equal(content.legalApprovalClaim,false);assert.equal(content.synthetic,true);
 for(const [id,profile] of Object.entries(content.profiles)){assert.equal(profile.fictionalRule,B.profiles[id].fictionalRule);assert.deepEqual(profile.sourceIds,B.profiles[id].sourceIds);}
 const context={};vm.createContext(context);vm.runInContext(B.source()+';globalThis.boundariesPack=SOC_BOUNDARIES;',context);const W=context.boundariesPack,workerState=structuredClone(s);
 assert.equal(JSON.stringify(W.inspect(workerState)),JSON.stringify(B.inspect(s)));assert.equal(W.fingerprint(workerState),B.fingerprint(s));assert.equal(W.validate(workerState),true);
 const stale=structuredClone(s);stale.resources.identity.generation=2;assert.equal(B.validate(stale),true);assert.ok(codes(B.evaluate(stale,'contract-us')).includes('BOUND_RESOURCE_GENERATION_STALE'));
});
