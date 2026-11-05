const test=require('node:test'),assert=require('node:assert/strict');
const GOV=require('../src/game/23-provider-government');
const BOUNDARY=require('../src/game/43-boundaries');
const SOC=require('../src/game/55-communications');

function fixture(plan){
 const resources=Object.fromEntries(plan.boundaryContract.flows.map(f=>[f.resource,{generation:1}]));
 const state={clock:0,jurisdiction:plan.boundaryContract.profile,resources,boundaries:BOUNDARY.create({clock:0})};
 const provision=(contract,connected=true)=>{
  BOUNDARY.command(state,{action:'contract',contract});state.clock+=1;BOUNDARY.advance(state,state.clock);
  const local=contract.requirements.continuity==='local';
  BOUNDARY.command(state,{action:'observe',contract:contract.id,observed:{connected,cloudLicenceAvailable:!local,localLicenceGraceActive:local,localLicenceGraceExpiresAt:local?100:null,localServicesAvailable:local,localKeyCustodyAvailable:local,adminPathAvailable:true,adminPathLocation:contract.profile}});
  return BOUNDARY.evaluate(state,contract.id);
 };
 return {state,provision};
}

test('PLAY-034/PLAY-042 Government architecture recipes are versioned, sourced, and materially distinct',()=>{
 assert.deepEqual(GOV.ids(),['regional-cloud','local-processing']);
 const cloud=GOV.plan('regional-cloud'),local=GOV.plan('local-processing');
 assert.equal(GOV.validatePlan(cloud),true);assert.equal(GOV.validatePlan(local),true);
 assert.deepEqual(cloud.sourceIds,GOV.sourceIds);assert.ok(cloud.sourceIds.includes('uc-new:family:cisco:local-speech'));
 assert.equal(cloud.speechMode,'cloud');assert.equal(local.speechMode,'local');
 assert.ok(cloud.setupCents<local.setupCents);assert.ok(cloud.leadMinutes<local.leadMinutes);
 assert.ok(cloud.periodCents>local.periodCents);assert.ok(cloud.engineers<local.engineers);
 assert.equal(cloud.workload.localCapacityUnits,0);assert.equal(local.workload.localCapacityUnits,2);
 assert.deepEqual([cloud.setupCents,cloud.periodCents,cloud.leadMinutes,cloud.engineers,cloud.support],[120000,16000,14,1,1]);
 assert.deepEqual([local.setupCents,local.periodCents,local.leadMinutes,local.engineers,local.support],[190000,10000,24,2,1]);
 const kinds={recorder:'recorder',archive:'archive',speech:'processor',identity:'directory',local:'infrastructure'};
 for(const plan of [cloud,local])for(const [id,config] of Object.entries(plan.resourceConfigs)){const kind=kinds[id],resource=SOC.resource(id,kind,{region:'AU'});SOC.validateConfig(kind,{...resource.desired,...config});}
 assert.deepEqual(cloud.boundaryContract.flows.map(f=>f.resource),['recorder','archive','speech','identity','local']);
 assert.ok(cloud.boundaryContract.flows.every(f=>f.processingRegions[0]==='AU'&&f.storageRegions[0]==='AU'&&f.backupRegions[0]==='AU'&&f.keyCustodyRegions[0]==='AU'&&f.adminLocations[0]==='AU'&&f.supportRegions[0]==='AU'));
 assert.equal(cloud.boundaryContract.agencyAuthorization,'not-required');
 assert.throws(()=>GOV.validatePlan({...cloud,version:2}),/INVALID_GOVERNMENT_ARCHITECTURE_PLAN/);
 assert.throws(()=>GOV.validatePlan({...cloud,setupCents:1}),/INVALID_GOVERNMENT_ARCHITECTURE_PLAN/);
});

test('PLAY-034/PLAY-042 cloud processing depends on connectivity while local processing remains eligible offline',()=>{
 const cloud=GOV.plan('regional-cloud'),cloudFixture=fixture(cloud),cloudConnected=cloudFixture.provision(cloud.boundaryContract,true);
 assert.equal(cloudConnected.eligible,true);
 const cloudOffline=cloudFixture.provision(cloud.boundaryContract,false);assert.equal(cloudOffline.eligible,false);
 assert.ok(cloudOffline.blocking.some(x=>x.code==='DISCONNECTED_CLOUD_ONLY'));
 const local=GOV.plan('local-processing'),localFixture=fixture(local),localOffline=localFixture.provision(local.boundaryContract,false);
 assert.equal(localOffline.eligible,true,JSON.stringify(localOffline.blocking));
});

test('PLAY-034/PLAY-042 both plans evaluate from actual configured paths and preserve separate boundary fields',()=>{
 for(const key of GOV.ids()){
  const plan=GOV.plan(key),{provision}=fixture(plan),eligible=provision(plan.boundaryContract);
  assert.equal(eligible.eligible,true,`${key}: ${JSON.stringify(eligible.blocking)}`);
  for(const field of ['processingRegions','storageRegions','backupRegions','keyCustodyRegions','adminLocations','supportRegions'])assert.ok(plan.boundaryContract.flows.every(f=>Array.isArray(f[field])&&f[field].length===1));
 }
});

test('PLAY-034 boundary changes create an ineligible path proposal and the paid blueprint restores service',()=>{
 const paid=GOV.plan('regional-cloud'),{provision}=fixture(paid);
 for(const field of ['supportRegions','backupRegions']){
  const changed=GOV.boundaryChange(paid,{resourceId:'speech',field,region:'US'});
  assert.deepEqual(changed.from,['AU']);assert.deepEqual(changed.to,['US']);
  const blocked=provision(changed.boundaryContract);
  assert.equal(blocked.eligible,false);assert.ok(blocked.blocking.some(x=>x.path===`flows.speech-flow.${field}`));
  const restored=provision(paid.boundaryContract);
  assert.equal(restored.eligible,true);assert.deepEqual(paid.boundaryContract.flows.find(f=>f.resource==='speech')[field],['AU']);
 }
});

test('PLAY-034 architecture factory rejects unknown recipes, resources and boundary paths',()=>{
 assert.throws(()=>GOV.get('unreviewed'),/UNKNOWN_GOVERNMENT_ARCHITECTURE/);
 assert.throws(()=>GOV.plan('local-processing',{resources:['speech','speech']}),/INVALID_GOVERNMENT_RESOURCE_SET/);
 const plan=GOV.plan('regional-cloud');
 assert.throws(()=>GOV.boundaryChange(plan,{resourceId:'unknown',field:'supportRegions',region:'US'}),/GOVERNMENT_BOUNDARY_RESOURCE_NOT_FOUND/);
 assert.throws(()=>GOV.boundaryChange(plan,{field:'processingRegions',region:'US'}),/INVALID_GOVERNMENT_BOUNDARY_CHANGE/);
});

test('Government architecture recipes serialize for workers and JP uses the registered Japanese path',()=>{
 const vm=require('node:vm');assert.equal(vm.runInNewContext(`${GOV.source()} SOC_GOVERNMENT_ARCHITECTURES.VERSION`),1);
 const jp=GOV.plan('regional-cloud',{jurisdiction:'JP'});
 assert.equal(jp.boundaryContract.serviceRegistration,'registered');assert.equal(jp.boundaryContract.serviceRegistrationId,'civic-grove-service');
 assert.equal(jp.boundaryContract.language,'ja');assert.equal(jp.boundaryContract.supportLanguage,'ja');
});
