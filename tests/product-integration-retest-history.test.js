'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');

const send=(s,command)=>SOC.dispatch(s,command);
const product=(s,command)=>send(s,{type:'products',command});
const tick=s=>send(s,{type:'advance',minutes:1});
const clone=x=>JSON.parse(JSON.stringify(x));
const edge=s=>s.products.integrations.find(x=>x.id==='bridge');

function readyIntegration(){
 // Product authoring in this fixture intentionally uses the explicit Lab path.
 let s=SOC.create({experience:'lab',mode:'sandbox'});
 s=tick(s);
 s=send(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});
 s=product(s,{action:'start'});
 for(const [id,family,feature,bindings,dependencies,mode] of [
  ['phone-offer','microsoft:workplace-phone','telephony',['phone'],{identity:'identity'},'multitenant'],
  ['suite-offer','cisco:suite-calling','multitenant-calling',['phone'],{identity:'identity',carrier:'carrier'},'multitenant']
 ]){
  s=product(s,{action:'offer',offer:{id,family,edition:'scenario-edition',unit:'seat',quantity:10,features:[feature],dependencies}});
  s=tick(s);
  s=product(s,{action:'deploy',id:id+'-deployment',offer:id,productVersion:'scenario-1',mode,region:'AU',bindings:[{feature,resources:bindings}]});
 }
 s=tick(s);
 s=product(s,{action:'integration',id:'bridge',source:'phone-offer-deployment',target:'suite-offer-deployment',features:[{sourceFeature:'telephony',targetFeature:'multitenant-calling'}]});
 return s;
}

test('AC-SOC-743 native integration retests retain prior result through failed recovery, rebase and public restore',()=>{
 let s=readyIntegration();
 s=product(s,{action:'test-integration',id:'bridge'});
 const first=clone(edge(s).result);
 assert.equal(first.status,'scenario-verified');
 assert.deepEqual(edge(s).testHistory,{version:1,entries:[]});
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);

 s=send(s,{type:'configure',id:'identity',config:{enabled:false}});s=tick(s);
 s=product(s,{action:'test-integration',id:'bridge'});
 const failed=clone(edge(s).result),archive1=edge(s).testHistory.entries[0];
 assert.equal(failed.status,'blocked');
 assert.ok(failed.reasons.some(x=>x.includes('UNAVAILABLE')));
 assert.deepEqual(archive1.result,first);
 assert.equal(archive1.at,failed.checkedAt,'at is the minute the previous result was superseded');
 assert.deepEqual([archive1.sourceGeneration,archive1.targetGeneration,archive1.sourceVersion,archive1.targetVersion],[first.sourceGeneration,first.targetGeneration,first.sourceVersion,first.targetVersion]);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'failed retest retains a valid earlier synthetic result');

 s=send(s,{type:'configure',id:'identity',config:{enabled:true}});s=tick(s);
 s=product(s,{action:'test-integration',id:'bridge'});
 const repaired=clone(edge(s).result),entries=edge(s).testHistory.entries;
 assert.equal(repaired.status,'scenario-verified');
 assert.equal(entries.length,2);
 assert.deepEqual(entries.map(x=>x.result.status),['scenario-verified','blocked']);
 assert.equal(entries[0].at,failed.checkedAt);
 assert.equal(entries[1].at,repaired.checkedAt);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'the actual repaired dispatch restores without losing the earlier result');

 const command={type:'products',command:{action:'test-integration',id:'bridge'}};
 let reply;const context={postMessage:value=>{reply=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);
 context.onmessage({data:{id:1,state:clone(s),command}});
 assert.equal(reply.error,undefined);
 assert.deepEqual(JSON.parse(JSON.stringify(reply.state)),send(s,command));

 const sameGenerationHistory=clone(edge(s).testHistory);
 s=product(s,{action:'configure',id:'phone-offer-deployment',config:{productVersion:'scenario-2'}});s=tick(s);
 s=product(s,{action:'rebase-integration',id:'bridge'});
 assert.equal(edge(s).result,null);
 assert.deepEqual(edge(s).testHistory,sameGenerationHistory,'rebase keeps separately retained same-generation tests');
 assert.deepEqual(edge(s).history[0].result,repaired);
 assert.notDeepEqual([edge(s).history[0].sourceGeneration,edge(s).history[0].targetGeneration],[edge(s).sourceGeneration,edge(s).targetGeneration],'rebase history still excludes the current generation pair');
 s=product(s,{action:'test-integration',id:'bridge'});
 assert.equal(edge(s).result.status,'scenario-verified');
 assert.equal(edge(s).result.sourceVersion,'scenario-2');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'prior same-generation entries coexist with a later rebase and current test');
});

test('AC-SOC-744 native integration test history rejects unknown versions, future supersession, altered results and capacity overflow atomically',()=>{
 let s=readyIntegration();
 for(const enabled of [true,false,true]){
  if(!enabled){s=send(s,{type:'configure',id:'identity',config:{enabled:false}});s=tick(s);}
  else if(s.resources.identity.effective.enabled!==true){s=send(s,{type:'configure',id:'identity',config:{enabled:true}});s=tick(s);}
  s=product(s,{action:'test-integration',id:'bridge'});
 }
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const mutations=[
  x=>{edge(x).testHistory.version=2;},
  x=>{edge(x).testHistory.entries[0].at=x.clock+1;},
  x=>{edge(x).testHistory.entries[0].targetGeneration++;},
  x=>{edge(x).testHistory.entries[0].result.reasons.push('fabricated');},
  x=>{edge(x).testHistory.entries[0].extra='unrecognized';}
 ];
 for(const mutate of mutations){const bad=clone(s);mutate(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PRODUCT_INTEGRATION/);}

 let full=readyIntegration();
 for(let i=0;i<=100;i++){full=product(full,{action:'test-integration',id:'bridge'});if(i<100)full=tick(full);}
 assert.equal(edge(full).testHistory.entries.length,100);
 full=tick(full);const before=JSON.stringify(full);
 assert.throws(()=>product(full,{action:'test-integration',id:'bridge'}),/INTEGRATION_TEST_HISTORY_CAPACITY/);
 assert.equal(JSON.stringify(full),before,'capacity refusal does not replace the latest pass or discard retained history');
});
