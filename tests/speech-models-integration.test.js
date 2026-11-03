const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const dispatch=(s,type,command)=>SOC.dispatch(s,{type,command});
const advance=(s,n=1)=>SOC.dispatch(s,{type:'advance',minutes:n});
function start(){let s=SOC.create({scenario:'government'});s=dispatch(s,'information',{action:'start'});s=dispatch(s,'information',{action:'configure',kind:'pipeline',config:{steps:['transcription','diarisation']}});s=advance(s);s=dispatch(s,'products',{action:'start'});s=advance(s);return s;}
function offer(s){return dispatch(s,'products',{action:'offer',offer:{id:'speech-offer',family:'cisco:local-speech',edition:'scenario-edition',unit:'seat',quantity:2,features:['local-inference','supported-language-stage','versioned-integration','stored-output','operating-effort','licensing-connectivity'],dependencies:{compute:'local','language-model':'language-model-evidence','integration-version':'integration-version-evidence',storage:'archive','information-policy':'archive',operator:'people','licensing-service':'local'}}});}
function deployment(s){return dispatch(s,'products',{action:'deploy',id:'speech-deployment',offer:'speech-offer',productVersion:'scenario-1',mode:'customer-operated-local',region:'AU',bindings:[{feature:'local-inference',resources:['speech']},{feature:'supported-language-stage',resources:['speech']},{feature:'versioned-integration',resources:['speech']},{feature:'stored-output',resources:['archive']},{feature:'operating-effort',resources:['people']},{feature:'licensing-connectivity',resources:['local']}]});}
function install(s,config={}){return dispatch(s,'speech-models',{action:'install',id:'speech-install',deploymentId:'speech-deployment',modelId:'scenario-local-speech',modelVersion:'scenario-1.2.0',modelResourceId:'language-model-evidence',integrationResourceId:'integration-version-evidence',computeResource:'local',permissionResource:'recorder',licensingResource:'local',region:'AU',languages:['en','ja'],stages:['transcription','diarisation','translation'],computeUnits:2,offlineRequired:false,operator:'speech-admin',...config});}
function running(){let s=start();for(const c of SOC.reference(s))if(c.type==='configure')s=SOC.dispatch(s,c);s=advance(s);s=offer(s);s=advance(s);s=dispatch(s,'speech-models',{action:'start'});s=deployment(s);s=install(s);s=dispatch(s,'speech-models',{action:'test-integration',id:'speech-integration-test',installationId:'speech-install',integrationId:'local-speech-adapter',integrationVersion:'scenario-2.0.0',operator:'speech-admin'});return advance(s);}
test('AC-SOC-387 shared dispatch binds model and integration evidence to product features and gates real information jobs',()=>{
 let s=running();assert.equal(s.speechModels.installations[0].provisioning.status,'ready');assert.equal(s.speechModels.integrationTests[0].provisioning.status,'ready');
 // Observe the product gate through the real recording and information pipeline.
 const unconfigured=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'speech-local-case'});s=advance(unconfigured,8);
 assert.equal(s.interactions.at(-1).outcome,'RESOLVED');assert.ok(s.records.some(r=>r.kind==='recording'));assert.equal(s.information.jobs[0].status,'complete',s.information.jobs[0].reason);assert.ok(s.information.jobs[0].speechModel);assert.ok(s.records.some(r=>r.kind==='transcription'));
 const restored=SOC.restore(JSON.stringify(s));assert.deepEqual(restored,s);
 const worker={};vm.createContext(worker);vm.runInContext(SOC.workerSource()+';globalThis.SOC_WORKER=SOC;',worker);const result=worker.SOC_WORKER.dispatch(structuredClone(s),{type:'advance',minutes:1});assert.deepEqual(JSON.parse(JSON.stringify(result)),SOC.dispatch(s,{type:'advance',minutes:1}));
 const tamper=structuredClone(s);tamper.speechModels.installations[0].effective.modelVersion='scenario-9.9.9';assert.throws(()=>SOC.restore(JSON.stringify(tamper)),/INVALID_SPEECH_MODELS_SAVE/);
});
test('AC-SOC-388 missing integration evidence blocks deployment and repaired generation is explicitly reprovisioned',()=>{
 let s=start();for(const c of SOC.reference(s))if(c.type==='configure')s=SOC.dispatch(s,c);s=advance(s);s=offer(s);s=advance(s);s=dispatch(s,'speech-models',{action:'start'});s=deployment(s);s=install(s);s=dispatch(s,'speech-models',{action:'test-integration',id:'speech-integration-bad',installationId:'speech-install',integrationId:'unsupported-adapter',integrationVersion:'scenario-2.0.0',operator:'speech-admin'});s=dispatch(s,'speech-models',{action:'test-integration',id:'speech-integration-repair',installationId:'speech-install',integrationId:'local-speech-adapter',integrationVersion:'scenario-2.0.0',operator:'speech-admin'});const speechGateBefore=SOC.calculate(s).products.deployments.find(d=>d.id==='speech-deployment');assert.ok(speechGateBefore);s=advance(s);assert.equal(s.speechModels.integrationTests[0].provisioning.status,'failed');assert.equal(s.speechModels.integrationTests[1].provisioning.status,'ready',s.speechModels.integrationTests[1].provisioning.errors.join(','));
 assert.ok(SOC.calculate(s).products.deployments.find(d=>d.id==='speech-deployment').effective);assert.equal(SOC.calculate(s).products.deployments.find(d=>d.id==='speech-deployment').effective.features.includes('versioned-integration'),true);
});
test('AC-SOC-389 legacy states stay optional and worker source includes the speech pack',()=>{const old=SOC.create();assert.equal(old.speechModels,undefined);assert.equal(SOC.restore(JSON.stringify(old)).speechModels,undefined);assert.match(SOC.workerSource(),/SOC_SPEECH_MODELS/);});

test('AC-SOC-411 a stale bound model blocks processor artefacts until deployment-scoped repair completes',()=>{
 let s=running();
 s=SOC.dispatch(s,{type:'configure',id:'local',config:{certificates:false}});s=advance(s);
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'speech-prerequisite-failure'});s=advance(s,8);
 assert.equal(s.interactions.at(-1).outcome,'RESOLVED');assert.equal(s.records.length,1,'a blocked model dependency must not fabricate a transcription');assert.equal(s.information.jobs.length,0);assert.ok(s.interactions.at(-1).obligations.includes('PRODUCT_PROCESSOR_UNAVAILABLE'));
 s=SOC.dispatch(s,{type:'configure',id:'local',config:{certificates:true}});s=advance(s);
 s=install(s,{id:'speech-install-repaired',modelVersion:'scenario-1.2.1'});
 s=dispatch(s,'speech-models',{action:'test-integration',id:'speech-integration-repaired',installationId:'speech-install-repaired',integrationId:'local-speech-adapter',integrationVersion:'scenario-2.0.0',operator:'speech-admin'});s=advance(s);
 assert.equal(s.speechModels.installations.at(-1).provisioning.status,'ready');assert.equal(s.speechModels.integrationTests.at(-1).provisioning.status,'ready');
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'speech-prerequisite-recovered'});s=advance(s,8);
 assert.equal(s.information.jobs.at(-1).status,'complete',s.information.jobs.at(-1).reason);assert.ok(s.records.some(r=>r.kind==='transcription'));
});
