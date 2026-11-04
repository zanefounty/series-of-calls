const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');

function start(scenario='smb'){
 let s=SOC.create({scenario});
 assert.equal(SOC.validateState(SOC.restore(JSON.stringify(s))).products,undefined);
 s=SOC.dispatch(s,{type:'products',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'advance',minutes:1});s=SOC.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});
 return SOC.dispatch(s,{type:'advance',minutes:1});
}
function products(s,command){return SOC.dispatch(s,{type:'products',command});}
function advance(s,minutes=1){return SOC.dispatch(s,{type:'advance',minutes});}
function offer(s,id,family,features,dependencies){return products(s,{action:'offer',offer:{id,family,edition:'scenario-edition',unit:'seat',quantity:20,features,dependencies}});}
function deploy(s,id,offerId,mode,version='scenario-1',region='AU',bindings=[]){return products(s,{action:'deploy',id,offer:offerId,productVersion:version,mode,region,bindings});}
function call(s,caseId='product-call'){return SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId});}
function completedCall(s,caseId='product-call'){s=call(s,caseId);const i=s.interactions.at(-1);return i.phase==='connected'?advance(s,i.durationMinutes):s;}

test('AC-SOC-091 shared dispatch, optional save compatibility and bound product features gate calling, meeting and processing',()=>{
 let legacy=SOC.create();assert.equal(SOC.validateState(SOC.restore(JSON.stringify(legacy))).products,undefined);
 let s=start('smb');
 s=offer(s,'phone-offer','microsoft:workplace-phone',['telephony'],{identity:'identity'});s=advance(s);
 s=deploy(s,'phone-deployment','phone-offer','multitenant','scenario-1','AU',[{feature:'telephony',resources:['phone']}]);s=advance(s);
 assert.equal(SOC.calculate(s).products.deployments[0].effective.features[0],'telephony');
 assert.equal(completedCall(s).interactions.at(-1).outcome,'CONNECTED');
 let blocked=SOC.dispatch(s,{type:'configure',id:'phone',config:{signalling:false}});blocked=advance(blocked);
 assert.equal(call(blocked,'catalogue-is-not-routing').interactions.at(-1).outcome,'SIGNALLING_FAILED');

 let room=start('smb');room=offer(room,'room-offer','microsoft:meetings-rooms',['meetings'],{identity:'identity'});room=advance(room);
 room=deploy(room,'room-deployment','room-offer','room-deployment','scenario-1','AU',[{feature:'meetings',resources:['room']}]);room=advance(room);
 assert.equal(SOC.dispatch(room,{type:'meeting'}).lastMeeting.success,true);
 room=products(room,{action:'lifecycle',offer:'room-offer',sale:'ended',support:'ended'});room=advance(room);
 const failedMeeting=SOC.dispatch(room,{type:'meeting'}).lastMeeting;
 assert.equal(failedMeeting.success,false);assert.ok(failedMeeting.reasons.some(x=>x.includes('PRODUCT_FEATURE_UNAVAILABLE')));

 let processing=start('government');processing=SOC.dispatch(processing,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});processing=SOC.dispatch(processing,{type:'configure',id:'speech',config:{region:'AU'}});processing=advance(processing);
 processing=offer(processing,'assist-offer','cisco:contact-center',['ai-assistance'],{identity:'identity',processing:'speech'});processing=advance(processing);
 processing=deploy(processing,'assist-deployment','assist-offer','multitenant','scenario-1','AU',[{feature:'ai-assistance',resources:['speech']}]);processing=advance(processing);
 const processed=completedCall(processing,'product-processing');assert.equal(processed.interactions.at(-1).outcome,'CONNECTED');assert.ok(processed.interactions.at(-1).records.some(id=>processed.records.find(r=>r.id===id)?.kind==='transcription'));
 processing=products(processing,{action:'lifecycle',offer:'assist-offer',sale:'ended',support:'ended'});processing=advance(processing);
 let stoppedState=call(processing,'product-processing-blocked');assert.equal(stoppedState.interactions.at(-1).phase,'connected');stoppedState=advance(stoppedState,stoppedState.interactions.at(-1).durationMinutes);const stopped=stoppedState.interactions.at(-1);
 assert.ok(stopped.obligations.includes('PRODUCT_PROCESSOR_UNAVAILABLE'));
 assert.ok(stopped.trace.some(x=>x.code==='PRODUCT_FEATURE_BLOCKED'));

 const worker={};vm.createContext(worker);vm.runInContext(SOC.workerSource()+';globalThis.SOC_WORKER=SOC;',worker);
 const cloned=structuredClone(s),response=worker.SOC_WORKER.dispatch(cloned,{type:'products',command:{action:'lifecycle',offer:'phone-offer',sale:'ended',support:'supported'}});
 assert.equal(response.products.offers[0].desiredLifecycle.sale,'ended');
});

test('AC-SOC-092 bindings reject wrong core kind and out-of-scope cloud modes; stale directional proof blocks a newly generated route',()=>{
 let s=start();s=offer(s,'phone-offer','microsoft:workplace-phone',['telephony'],{identity:'identity'});s=advance(s);
 assert.throws(()=>deploy(s,'wrong-kind','phone-offer','multitenant','scenario-1','AU',[{feature:'telephony',resources:['carrier']}]),/PRODUCT_BINDING_OUT_OF_SCOPE/);
 s=offer(s,'meetings-offer','microsoft:meetings-rooms',['meetings'],{identity:'identity'});s=advance(s);
 assert.throws(()=>deploy(s,'unsupported-cloud','meetings-offer','cloud','scenario-1','AU',[{feature:'meetings',resources:['room']}]),/PRODUCT_BINDING_OUT_OF_SCOPE/);
 assert.throws(()=>deploy(s,'wrong-region','phone-offer','multitenant','scenario-1','US',[{feature:'telephony',resources:['phone']}]),/PRODUCT_BINDING_OUT_OF_SCOPE/);
 s=deploy(s,'phone-deployment','phone-offer','multitenant','scenario-2','AU',[{feature:'telephony',resources:['phone']}]);
 s=offer(s,'suite-offer','cisco:suite-calling',['multitenant-calling'],{identity:'identity',carrier:'carrier'});s=advance(s);
 s=deploy(s,'suite-deployment','suite-offer','multitenant','scenario-1');s=advance(s);
 s=products(s,{action:'integration',id:'suite-to-phone',source:'suite-deployment',target:'phone-deployment',features:[{sourceFeature:'multitenant-calling',targetFeature:'telephony'}]});
 s=products(s,{action:'test-integration',id:'suite-to-phone'});
 assert.equal(SOC.products.compatibilityStatus(s,'suite-to-phone').status,'scenario-verified');
 assert.equal(completedCall(s,'valid-compatible-product').interactions.at(-1).outcome,'CONNECTED');
 s=products(s,{action:'configure',id:'phone-deployment',config:{productVersion:'scenario-3'}});
 assert.equal(SOC.products.compatibilityStatus(s,'suite-to-phone').status,'stale');
 const staleCall=call(s,'stale-product-proof').interactions.at(-1);assert.equal(staleCall.outcome,'PRODUCT_FEATURE_UNAVAILABLE');
 assert.ok(staleCall.trace.some(x=>x.code==='PRODUCT_FEATURE_UNAVAILABLE'),'the stale directional proof blocks the route before connection');
});
