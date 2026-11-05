const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../src/game/23-provider-policy.js'),'utf8');
const SOC=require('../src/game/55-communications');
function boot(){const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'});dom.window.eval(source);return {dom,w:dom.window};}
const base=()=>({version:2,enabled:true,suspended:false,cashFloorCents:1000,lifetimeBudgetCents:50000,budgetSpentCents:0,maxActions:4,actionsUsed:0,engineerCeiling:2,supportCeiling:2,customerIds:[],rules:[]});
const customer=(extra={})=>({id:'orchard-customer',planId:'swift',status:'active',stages:{base:{status:'effective'},carrier:null,partner:null},services:[],...extra});
const quote=(request,extra={})=>({request,atRevision:7,setupCents:9000,engineers:1,support:1,workMinutes:5,blockers:[],...extra});

test('version 2 policy accepts scoped recipe configuration and rejects unknown or malformed fields',()=>{
 const {w}=boot(),p=base();p.rules=[{id:'assure-outage',kind:'assurance',enabled:true,customerIds:['orchard-customer'],operationId:'repair',stage:null,resourceId:'access',thresholdPercent:null}];
 assert.equal(w.SOCProviderPolicy.validate(w.SOCProviderPolicy.create(p)),true);
 assert.throws(()=>w.SOCProviderPolicy.create({...p,freeCash:true}),/INVALID_PROVIDER_POLICY/);
 assert.throws(()=>w.SOCProviderPolicy.create({...p,rules:[{...p.rules[0],operationId:'arbitrary-command'}]}),/INVALID_PROVIDER_POLICY_RULE/);
 assert.throws(()=>w.SOCProviderPolicy.create({...p,rules:[p.rules[0],p.rules[0]]}),/INVALID_PROVIDER_POLICY_RULE/);
 w.close();
});

test('disabled, suspended and no-trigger policies are pure no-ops',()=>{
 const {w}=boot(),p=base(),model={revision:7,cash:50000,customers:[customer()],incidents:[],projects:[]};p.enabled=false;
 const before=JSON.stringify([p,model]);assert.equal(w.SOCProviderPolicy.plan(p,model,[]).status,'disabled');
 p.enabled=true;p.suspended=true;assert.equal(w.SOCProviderPolicy.plan(p,model,[]).reason,'POLICY_SUSPENDED');
 p.suspended=false;assert.equal(w.SOCProviderPolicy.plan(p,model,[]).reason,'NO_ELIGIBLE_WORK');
 assert.notEqual(JSON.stringify([p,model]),before);assert.equal(JSON.stringify(model),JSON.stringify({revision:7,cash:50000,customers:[customer()],incidents:[],projects:[]}),'planner leaves observed model unchanged');
 w.close();
});

test('provisioning policy previews a missing paid stage only after its prerequisite is effective',()=>{
 const {w}=boot(),p=base();p.lifetimeBudgetCents=100000;p.rules=[{id:'finish-carrier',kind:'provisioning',enabled:true,customerIds:[],operationId:null,stage:'carrier',resourceId:null,thresholdPercent:null}];
 const model={revision:7,cash:50000,customers:[customer()],projects:[]},q=quote({action:'purchase',offerId:'orchard',planId:'swift',stage:'carrier',customerId:'orchard-customer'});
 const plan=w.SOCProviderPolicy.plan(p,model,[q]);assert.equal(plan.status,'ready');assert.deepEqual(JSON.parse(JSON.stringify(plan.intent.command)),{...q.request,quoteRevision:7});assert.equal(plan.preview.costCents,9000);assert.equal(plan.preview.cashAfterCents,41000);
 model.customers[0].stages.base=null;assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).status,'idle');
 w.close();
});

test('provisioning planner accepts only a fresh quote from the real campaign quotation engine',()=>{
 const {w}=boot(),p=base();p.lifetimeBudgetCents=100000;p.rules=[{id:'finish-carrier',kind:'provisioning',enabled:true,customerIds:[],operationId:null,stage:'carrier',resourceId:null,thresholdPercent:null}];
 let state=SOC.create({experience:'campaign'});
 const buy=(s,request)=>{const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);return SOC.dispatch(s,{type:'provider',command:{...q.request,quoteRevision:q.atRevision}});};
 state=buy(state,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});state=SOC.dispatch(state,{type:'advance',minutes:3});
 const model={...SOC.provider.inspect(state),revision:state.revision},q=SOC.provider.quote(state,{action:'purchase',offerId:'starter',planId:'swift',stage:'carrier',customerId:'starter-customer'});
 const preview=w.SOCProviderPolicy.plan(p,model,[q]);assert.equal(preview.status,'ready',JSON.stringify({preview,quote:q}));assert.equal(preview.intent.command.quoteRevision,state.revision);assert.equal(preview.intent.command.stage,'carrier');assert.equal(preview.preview.recurringCents,q.periodCents);
 const stale=w.SOCProviderPolicy.plan(p,model,[{...q,atRevision:state.revision-1}]);assert.equal(stale.reason,'STALE_QUOTE');w.close();
});

test('assurance policy handles an actual incident and refuses blocked, stale, duplicate or unaffordable quotes',()=>{
 const {w}=boot(),p=base();p.rules=[{id:'repair-outage',kind:'assurance',enabled:true,customerIds:[],operationId:'repair',stage:null,resourceId:'access',thresholdPercent:null}];
 const incident={id:'incident-1',customerId:'orchard-customer',resource:'access',status:'active'},model={revision:7,cash:50000,customers:[customer()],incidents:[incident],projects:[]},q=quote({action:'operation',operationId:'repair',customerId:'orchard-customer'});
 assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).status,'ready');
 assert.equal(w.SOCProviderPolicy.plan(p,model,[{...q,atRevision:6}]).reason,'STALE_QUOTE');
 assert.equal(w.SOCProviderPolicy.plan(p,model,[{...q,blockers:['STAFFING_UNAVAILABLE']}]).reason,'QUOTE_BLOCKED');
 model.projects=[{customerId:'orchard-customer',kind:'operation',operationId:'repair',status:'running'}];assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).reason,'ACTION_ALREADY_ORDERED');
 model.projects=[{customerId:'orchard-customer',kind:'operation',operationId:'repair',status:'complete'}];model.incidents=[{...incident,id:'incident-2'}];assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).status,'ready','a later independent incident can use assurance again');
 model.projects=[];model.cash=2000;assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).reason,'CASH_FLOOR');
 w.close();
});

test('headroom uses measured concurrent-session pressure and obeys lifetime, action and staffing limits',()=>{
 const {w}=boot(),p=base();p.rules=[{id:'add-carrier-headroom',kind:'headroom',enabled:true,customerIds:[],operationId:'carrier-headroom',stage:null,resourceId:'trunk',thresholdPercent:80}];
 const service={id:'trunk',pressure:{used:9,limit:10,unit:'concurrent sessions',at:60,constrained:false}},model={revision:7,cash:50000,customers:[customer({services:[service]})],projects:[]},q=quote({action:'operation',operationId:'carrier-headroom',customerId:'orchard-customer'});
 assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).status,'ready');
 service.pressure={...service.pressure,unit:'GB'};assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).status,'idle');
 service.pressure={...service.pressure,unit:'concurrent sessions'};p.budgetSpentCents=45000;assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).reason,'BUDGET_LIMIT');
 p.budgetSpentCents=0;p.actionsUsed=4;assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).reason,'ACTION_LIMIT');
 p.actionsUsed=0;p.engineerCeiling=0;assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).reason,'STAFFING_CEILING');
 w.close();
});

test('migration policy waits for an explicit eligible migration window and emits its authored quote',()=>{
 const {w}=boot(),p=base();p.rules=[{id:'coexistence-cutover',kind:'migration',enabled:true,customerIds:['orchard-customer'],operationId:'migration',stage:null,resourceId:'platform-cutover',thresholdPercent:null}];
 const model={revision:7,cash:50000,customers:[customer()],migrations:[{id:'platform-cutover',customerId:'orchard-customer',eligible:false}],projects:[]},q=quote({action:'operation',operationId:'migration',customerId:'orchard-customer'});
 assert.equal(w.SOCProviderPolicy.plan(p,model,[q]).status,'idle');model.migrations[0].eligible=true;const result=w.SOCProviderPolicy.plan(p,model,[q]);assert.equal(result.status,'ready');assert.equal(result.trigger.id,'platform-cutover');
 w.close();
});

test('serialized policy kernel reproduces validation and deterministic previews',()=>{
 const {w}=boot(),p=base();p.rules=[{id:'repair-outage',kind:'assurance',enabled:true,customerIds:[],operationId:'repair',stage:null,resourceId:null,thresholdPercent:null}];const model={revision:7,cash:50000,customers:[customer()],incidents:[{id:'incident-1',customerId:'orchard-customer',resource:'access',status:'active'}],projects:[]},q=quote({action:'operation',operationId:'repair',customerId:'orchard-customer'});
 const expected=w.SOCProviderPolicy.plan(p,model,[q]),runtime=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),serialized=runtime.window.eval(`${w.SOCProviderPolicy.source()}\nSOC_PROVIDER_POLICY`);
 assert.deepEqual(JSON.parse(JSON.stringify(serialized.plan(p,model,[q]))),JSON.parse(JSON.stringify(expected)));w.close();runtime.window.close();
});
