const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');const E=require('../src/game/55-communications');
const act=(s,command)=>E.dispatch(s,{type:'products',command}),tick=s=>E.dispatch(s,{type:'advance',minutes:1});
function setup(){let s=E.create();s=tick(s);s=E.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});s=act(s,{action:'start'});for(const [id,family,feature,bindings,dependencies,mode] of [['phone-offer','microsoft:workplace-phone','telephony',['phone'],{identity:'identity'},'multitenant'],['suite-offer','cisco:suite-calling','multitenant-calling',['phone'],{identity:'identity',carrier:'carrier'},'multitenant']]){s=act(s,{action:'offer',offer:{id,family,edition:'standard',unit:'seat',quantity:10,features:[feature],dependencies}});s=tick(s);s=act(s,{action:'deploy',id:id+'-deployment',offer:id,productVersion:'v1',mode,region:'AU',bindings:[{feature,resources:bindings}]});}s=tick(s);s=act(s,{action:'integration',id:'bridge',source:'phone-offer-deployment',target:'suite-offer-deployment',features:[{sourceFeature:'telephony',targetFeature:'multitenant-calling'}]});return act(s,{action:'test-integration',id:'bridge'});}
const call=s=>E.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'rebase-case'});
test('AC-SOC-332 explicit integration scope updates preserve historical results and require a fresh successful test',()=>{
 let s=setup();assert.equal(call(s).interactions.at(-1).outcome,'CONNECTED');const old=structuredClone(s.products.integrations[0]);s=act(s,{action:'configure',id:'phone-offer-deployment',config:{productVersion:'v2'}});assert.throws(()=>act(s,{action:'rebase-integration',id:'bridge'}),/ENDPOINT_NOT_READY/);s=tick(s);assert.equal(E.products.compatibilityStatus(s,'bridge').status,'stale');assert.notEqual(call(s).interactions.at(-1).outcome,'CONNECTED');s=act(s,{action:'rebase-integration',id:'bridge'});assert.equal(s.products.integrations[0].result,null);assert.deepEqual(s.products.integrations[0].history[0].result,old.result);assert.notEqual(call(s).interactions.at(-1).outcome,'CONNECTED');s=act(s,{action:'test-integration',id:'bridge'});assert.equal(call(s).interactions.at(-1).outcome,'CONNECTED');assert.equal(E.products.compatibilityStatus(s,'bridge').sourceVersion,'v2');assert.deepEqual(E.restore(JSON.stringify(s)),s);assert.throws(()=>act(s,{action:'rebase-integration',id:'bridge'}),/SCOPE_UNCHANGED/);
 const bad=structuredClone(s);bad.products.integrations[0].history[0].sourceGeneration=999;assert.throws(()=>E.restore(JSON.stringify(bad)),/INTEGRATION_HISTORY/);
 let result;const box={postMessage:x=>result=x};vm.createContext(box);vm.runInContext(E.workerSource(),box);const command={type:'products',command:{action:'test-integration',id:'bridge'}};box.onmessage({data:{id:1,state:s,command}});assert.deepEqual(JSON.parse(JSON.stringify(result.state)),E.dispatch(s,command));
});
test('AC-SOC-333 product console exposes explicit integration scope update through the same validated command',()=>{
 const h=require('./harness').load(),w=h.dom.window;try{let s=setup();s=act(s,{action:'configure',id:'phone-offer-deployment',config:{productVersion:'v2'}});s=tick(s);w.fixture=s;h.ev('SCT.state=fixture;SCT.locked=true;socRender();');const f=w.document.querySelector('[data-aa-form="integration-rebase"]');assert.ok(f);f.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(h.ev('SCT.state.products.integrations[0].sourceVersion'),'v2');assert.equal(h.ev('SCT.state.products.integrations[0].result'),null);assert.equal(h.ev('SCT.state.commands.at(-1).command.command.action'),'rebase-integration');assert.deepEqual(h.errors,[]);}finally{w.close();}
});
test('AC-SOC-352 historical deployment generations retain their own offer scope through pending and completed offer switches',()=>{
 let s=setup();
 s=act(s,{action:'offer',offer:{id:'phone-offer-next',family:'microsoft:workplace-phone',edition:'next-scenario',unit:'seat',quantity:10,features:['telephony'],dependencies:{identity:'identity'}}});
 s=tick(s);
 s=act(s,{action:'configure',id:'phone-offer-deployment',config:{offer:'phone-offer-next',productVersion:'v2'}});
 assert.equal(s.products.deployments.find(d=>d.id==='phone-offer-deployment').effective.offer,'phone-offer');
 assert.deepEqual(E.restore(JSON.stringify(s)),s,'pending desired offer can coexist with the old effective offer');
 s=tick(s);
 const d=s.products.deployments.find(x=>x.id==='phone-offer-deployment');
 assert.equal(d.effective.offer,'phone-offer-next');
 assert.equal(d.effectiveHistory[0].effective.offer,'phone-offer');
 assert.deepEqual(E.restore(JSON.stringify(s)),s,'each retained generation validates against its own offer');
 const tampered=structuredClone(s);tampered.products.deployments.find(x=>x.id==='phone-offer-deployment').effectiveHistory[0].effective.family='cisco:suite-calling';
 assert.throws(()=>E.restore(JSON.stringify(tampered)),/INVALID_PRODUCT/);
});
