const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const Speech = require('../src/game/27-speech-models.js');

function fixture(){
 const root={clock:0};
 const ctx={integrationStatus:'scenario-verified'};
 const hooks={
  deployment:(_root,id)=>id==='local-deployment'?{id,family:'cisco:local-speech',mode:'customer-operated-local',status:'ready',generation:3,productVersion:'family-4.2.0',offerId:'speech-offer',region:'AU'}:null,
  resource:(_root,id)=>({
   compute:{ready:true,generation:5,region:'AU',localInference:true,capacity:8,offlineSupported:true,languages:['en','ja'],stages:['transcription','diarisation','translation']},
   permission:{ready:true,generation:2,deploymentId:'local-deployment',localSpeech:true},
   licensing:{ready:true,generation:4,deploymentId:'local-deployment',connected:true,offlineAuthorized:true}
  })[id]||null,
  integration:(_root,request)=>({status:ctx.integrationStatus,integrationId:request.integrationId,integrationVersion:request.integrationVersion,deploymentId:request.deploymentId,deploymentGeneration:request.deploymentGeneration,productVersion:request.productVersion,offerId:request.offerId,region:request.region}),
  authorize:()=>true
 };
 root.speechModels=Speech.create(root);
 return {root,hooks,ctx};
}
function install(root,hooks,id='install-a',extra={}){
 return Speech.command(root,{action:'install',id,deploymentId:'local-deployment',modelId:'scenario-local-speech',modelVersion:'scenario-1.2.0',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',computeResource:'compute',permissionResource:'permission',licensingResource:'licensing',region:'AU',languages:['en','ja'],stages:['transcription','diarisation','translation'],computeUnits:4,offlineRequired:false,operator:'speech-admin',...extra},hooks);
}
function tick(root,hooks,clock){root.clock=clock;Speech.advance(root,hooks);}
function testIntegration(root,hooks,id='integration-a'){
 return Speech.command(root,{action:'test-integration',id,installationId:'install-a',integrationId:'integration-live',integrationVersion:'scenario-2.0.0',operator:'speech-admin'},hooks);
}

test('AC-SOC-382 synthetic model and deployment-scoped integration provision before processor work is allowed',()=>{
 const {root,hooks}=fixture();install(root,hooks,'install-a',{offlineRequired:true});assert.equal(root.speechModels.installations[0].provisioning.status,'pending');tick(root,hooks,1);assert.equal(root.speechModels.installations[0].provisioning.status,'ready');
 testIntegration(root,hooks);tick(root,hooks,2);assert.equal(root.speechModels.integrationTests[0].provisioning.status,'ready');
 const result=Speech.processingGate(root,{deploymentId:'local-deployment',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',language:'en',stage:'transcription',computeUnits:3,region:'AU',offline:false},hooks);assert.equal(result.ready,true);assert.equal(result.modelVersion,'scenario-1.2.0');
 const otherDependencies=Speech.processingGate(root,{deploymentId:'local-deployment',modelResourceId:'other-model',integrationResourceId:'other-adapter',language:'en',stage:'transcription',computeUnits:3,region:'AU',offline:false},hooks);assert.equal(otherDependencies.ready,false);assert.ok(otherDependencies.reasons.includes('SPEECH_MODEL_NOT_READY'));
 const unscoped=Speech.processingGate(root,{deploymentId:'local-deployment',language:'en',stage:'transcription',computeUnits:3,region:'AU',offline:false},hooks);assert.deepEqual(unscoped.reasons,['SPEECH_PRODUCT_DEPENDENCY_SCOPE_MISSING']);
 assert.equal(Speech.availability(root,'language-model','speech-model-evidence',{deploymentId:'local-deployment'},hooks).ready,true);
 assert.equal(Speech.availability(root,'integration-version','speech-integration-evidence',{deploymentId:'local-deployment'},hooks).ready,true);
 assert.equal(Speech.processingGate(root,{deploymentId:'local-deployment',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',language:'fr',stage:'summary',computeUnits:3,region:'AU',offline:false},hooks).ready,false);
});

test('AC-SOC-383 permission, compute, location, licensing and disconnected-operation requirements block and can recover',()=>{
 const {root,hooks,ctx}=fixture();hooks.resource=(_r,id)=>({
  compute:{ready:true,generation:1,region:'AU',localInference:true,capacity:2,offlineSupported:true,languages:['en'],stages:['transcription']},
  permission:{ready:false,generation:1,deploymentId:'local-deployment',localSpeech:false},
  licensing:{ready:true,generation:1,deploymentId:'local-deployment',connected:true,offlineAuthorized:false}
 })[id]||null;
 install(root,hooks,'failed-install',{computeUnits:4,offlineRequired:true});tick(root,hooks,1);
 assert.equal(root.speechModels.installations[0].provisioning.status,'failed');
 assert.ok(root.speechModels.installations[0].provisioning.errors.includes('SPEECH_PERMISSION_REQUIRED'));
 assert.ok(root.speechModels.installations[0].provisioning.errors.includes('SPEECH_COMPUTE_UNAVAILABLE'));
 assert.ok(root.speechModels.installations[0].provisioning.errors.includes('SPEECH_OFFLINE_NOT_AUTHORIZED'));
 hooks.resource=(_r,id)=>({
  compute:{ready:true,generation:2,region:'AU',localInference:true,capacity:8,offlineSupported:true,languages:['en','ja'],stages:['transcription','diarisation','translation']},
  permission:{ready:true,generation:2,deploymentId:'local-deployment',localSpeech:true},
  licensing:{ready:true,generation:2,deploymentId:'local-deployment',connected:false,offlineAuthorized:true}
 })[id]||null;
 install(root,hooks,'install-a',{computeUnits:4,offlineRequired:true});tick(root,hooks,2);assert.equal(root.speechModels.installations[1].provisioning.status,'ready');
 testIntegration(root,hooks,'integration-fails');ctx.integrationStatus='unavailable';tick(root,hooks,3);assert.equal(root.speechModels.integrationTests[0].provisioning.status,'failed');
 ctx.integrationStatus='scenario-verified';testIntegration(root,hooks,'integration-a');tick(root,hooks,4);assert.equal(root.speechModels.integrationTests[1].provisioning.status,'ready');
 const offline=Speech.processingGate(root,{deploymentId:'local-deployment',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',language:'en',stage:'transcription',computeUnits:2,region:'AU',offline:true},hooks);assert.equal(offline.ready,true);
 hooks.resource=(_r,id)=>({
  compute:{ready:true,generation:2,region:'AU',localInference:true,capacity:8,offlineSupported:true,languages:['en','ja'],stages:['transcription','diarisation','translation']},
  permission:{ready:true,generation:2,deploymentId:'local-deployment',localSpeech:true},
  licensing:{ready:true,generation:2,deploymentId:'local-deployment',connected:true,offlineAuthorized:true}
 })[id]||null;
 const online=Speech.processingGate(root,{deploymentId:'local-deployment',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',language:'en',stage:'transcription',computeUnits:2,region:'AU',offline:false},hooks);assert.equal(online.ready,true,'offline-capable model remains usable while connected');
 const wrongRegion=Speech.processingGate(root,{deploymentId:'local-deployment',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',language:'en',stage:'transcription',computeUnits:2,region:'US',offline:true},hooks);assert.ok(wrongRegion.reasons.includes('SPEECH_PROCESSING_LOCATION'));
});

test('AC-SOC-384 save validation rejects tampered effective model and integration evidence',()=>{
 const {root,hooks}=fixture();install(root,hooks);tick(root,hooks,1);testIntegration(root,hooks);tick(root,hooks,2);assert.equal(Speech.validate(structuredClone(root)),true);
 const forged=structuredClone(root);forged.speechModels.installations[0].effective.modelVersion='scenario-9.9.9';assert.throws(()=>Speech.validate(forged),/INVALID_SPEECH_MODELS_SAVE/);
 const forgedEvidence=structuredClone(root);forgedEvidence.speechModels.integrationTests[0].effective.integrationVersion='scenario-9.9.9';assert.throws(()=>Speech.validate(forgedEvidence),/INVALID_SPEECH_INTEGRATION_SAVE/);
 const forgedStage=structuredClone(root);forgedStage.speechModels.installations[0].effective.stages=['summary'];assert.throws(()=>Speech.validate(forgedStage),/INVALID_SPEECH_MODELS_SAVE/);
 const forgedScope=structuredClone(root);forgedScope.speechModels.integrationTests[0].deploymentGeneration++;assert.throws(()=>Speech.validate(forgedScope),/INVALID_SPEECH_INTEGRATION_SAVE|INVALID_SPEECH_INTEGRATION_SCOPE/);
});

test('AC-SOC-385 a replacement installation supersedes stale prerequisite generations without losing old evidence',()=>{
 const {root,hooks}=fixture();install(root,hooks);tick(root,hooks,1);testIntegration(root,hooks);tick(root,hooks,2);
 hooks.resource=(_r,id)=>({
  compute:{ready:true,generation:6,region:'AU',localInference:true,capacity:8,offlineSupported:true,languages:['en','ja'],stages:['transcription','diarisation','translation']},
  permission:{ready:true,generation:3,deploymentId:'local-deployment',localSpeech:true},
  licensing:{ready:true,generation:5,deploymentId:'local-deployment',connected:true,offlineAuthorized:true}
 })[id]||null;
 const scope={deploymentId:'local-deployment',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',family:'cisco:local-speech',generation:3,productVersion:'family-4.2.0',mode:'customer-operated-local',offer:'speech-offer',region:'AU'};
 assert.equal(Speech.availability(root,'language-model','speech-model-evidence',scope,hooks).ready,false);
 Speech.command(root,{action:'install',id:'install-b',deploymentId:'local-deployment',modelId:'scenario-local-speech',modelVersion:'scenario-1.3.0',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',computeResource:'compute',permissionResource:'permission',licensingResource:'licensing',region:'AU',languages:['en','ja'],stages:['transcription','diarisation','translation'],computeUnits:4,offlineRequired:false,operator:'speech-admin'},hooks);
 Speech.command(root,{action:'test-integration',id:'integration-b',installationId:'install-b',integrationId:'integration-live',integrationVersion:'scenario-2.1.0',operator:'speech-admin'},hooks);tick(root,hooks,3);
 assert.equal(Speech.availability(root,'language-model','speech-model-evidence',scope,hooks).modelVersion,'scenario-1.3.0');assert.equal(root.speechModels.installations.length,2);
});

test('AC-SOC-386 worker source reproduces processing gates, inspections and state transitions',()=>{
 const {root,hooks}=fixture();install(root,hooks);tick(root,hooks,1);testIntegration(root,hooks);tick(root,hooks,2);
 const box={};vm.createContext(box);vm.runInContext(Speech.source()+';globalThis.pack=SOC_SPEECH_MODELS;',box);const Worker=box.pack,workerRoot=structuredClone(root);
 assert.equal(JSON.stringify(Worker.inspect(workerRoot,hooks)),JSON.stringify(Speech.inspect(root,hooks)));
 assert.deepEqual(JSON.parse(JSON.stringify(Worker.processingGate(workerRoot,{deploymentId:'local-deployment',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',language:'en',stage:'transcription',computeUnits:2,region:'AU',offline:false},hooks))),Speech.processingGate(root,{deploymentId:'local-deployment',modelResourceId:'speech-model-evidence',integrationResourceId:'speech-integration-evidence',language:'en',stage:'transcription',computeUnits:2,region:'AU',offline:false},hooks));
});

test('AC-SOC-410 save validation rejects mismatched event payloads and non-ready effective proofs',()=>{
 const {root,hooks}=fixture();install(root,hooks);tick(root,hooks,1);testIntegration(root,hooks);tick(root,hooks,2);
 const before=JSON.stringify(root),fingerprint=Speech.fingerprint(root),first=JSON.stringify(Speech.inspect(root,hooks)),second=JSON.stringify(Speech.inspect(root,hooks));assert.equal(first,second);assert.equal(JSON.stringify(root),before);assert.equal(Speech.fingerprint(root),fingerprint);
 const forgedEvent=structuredClone(root);forgedEvent.speechModels.events[0].externalApprovalClaim=true;assert.throws(()=>Speech.validate(forgedEvent),/INVALID_SPEECH_EVENT_HISTORY/);
 const wrongEventGeneration=structuredClone(root);wrongEventGeneration.speechModels.events[1].generation=99;assert.throws(()=>Speech.validate(wrongEventGeneration),/INVALID_SPEECH_EVENT_SCOPE/);
 const pendingProof=structuredClone(root);pendingProof.speechModels.installations[0].provisioning.status='pending';assert.throws(()=>Speech.validate(pendingProof),/INVALID_SPEECH_MODELS_SAVE/);
 const crossDeployment=structuredClone(root);crossDeployment.speechModels.integrationTests[0].deploymentId='other-deployment';assert.throws(()=>Speech.validate(crossDeployment),/INVALID_SPEECH_INTEGRATION_(SAVE|SCOPE)/);
});
