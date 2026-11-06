const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..','src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function boot(){const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),w=dom.window;w.N_=x=>x;w.eval(read('game/23-provider-policy.js'));w.eval(read('game/93-ui/78-provider-policy-controls.js'));return {dom,w};}
const oldPolicy=()=>({projectId:'project-policy',customerId:'orchard-customer',status:'active',budgetCents:40000,spentCents:3000,actions:[{projectId:'project-repair'}],config:{version:2,enabled:true,suspended:false,cashFloorCents:500,lifetimeBudgetCents:40000,budgetSpentCents:3000,maxActions:6,actionsUsed:1,engineerCeiling:2,supportCeiling:1,customerIds:['orchard-customer'],rules:[]}});
const fields=(template='assurance',overrides={})=>({customerId:'orchard-customer',template,cashFloor:'1250.50',lifetimeBudget:'2500.75',maxActions:'8',maxEngineers:'2',maxSupport:'1',...overrides});

test('policy form renderer stays pure and shows an explicitly scoped paid policy',()=>{
 const {w}=boot(),policy=oldPolicy(),before=JSON.stringify(policy),html=w.SOCProviderPolicyControls.render(policy,{customerId:'orchard-customer',customerName:'Orchard <Repairs>'}),host=w.document.createElement('div');host.innerHTML=html;
 assert.equal(JSON.stringify(policy),before);assert.equal(host.querySelector('form[data-provider-form="policy"]').dataset.customer,'orchard-customer');assert.equal(host.querySelector('[name="customerId"]').value,'orchard-customer');assert.match(host.textContent,/Orchard <Repairs>/);assert.match(host.textContent,/Each eligible action uses a fresh quote/);assert.match(host.textContent,/places no order and charges nothing immediately/);assert.match(host.textContent,/Already funded work remains in progress/);assert.doesNotMatch(host.textContent,/"version"|"rules"|\{"version"/);w.close();
});

test('template helper returns validated v2 assurance, provisioning, migration and headroom rules',()=>{
 const {w}=boot(),policy=oldPolicy();
 const assurance=w.SOCProviderPolicyControls.configFromForm(policy,fields());assert.equal(assurance.cashFloorCents,125050);assert.equal(assurance.lifetimeBudgetCents,250075);assert.equal(assurance.budgetSpentCents,3000);assert.equal(assurance.actionsUsed,1);assert.equal(assurance.suspended,false);assert.equal(assurance.customerIds[0],'orchard-customer');assert.equal(assurance.rules[0].operationId,'repair');
 const provisioning=w.SOCProviderPolicyControls.configFromForm(policy,fields('provisioning'));assert.deepEqual(JSON.parse(JSON.stringify(provisioning.rules.map(r=>r.stage))),['carrier','partner']);
 const migration=w.SOCProviderPolicyControls.configFromForm(policy,fields('migration'));assert.equal(migration.rules[0].operationId,'migration');assert.equal(migration.rules[0].resourceId,'platform-cutover');
 const consolidated=w.SOCProviderPolicyControls.configFromForm(policy,fields('migration-consolidated'));assert.equal(consolidated.rules[0].operationId,'migration-consolidated');
 const headroom=w.SOCProviderPolicyControls.configFromForm(policy,fields('headroom'));assert.equal(headroom.rules[0].operationId,'carrier-headroom');assert.equal(headroom.rules[0].resourceId,'carrier');assert.equal(headroom.rules[0].thresholdPercent,75);
 for(const config of [assurance,provisioning,migration,consolidated,headroom])assert.equal(w.SOCProviderPolicy.validate(config),true);
 w.close();
});

test('regional provisioning policy presents and submits an explicit owned-customer market scope',()=>{
 const {w}=boot(),policy=oldPolicy(),context={regionalProvisioning:true,eligibleMarkets:['au-sydney','au-melbourne'],eligibleCustomers:[{id:'orchard-customer',name:'Orchard Repairs',market:'au-sydney'},{id:'harbor-customer',name:'Harbor Repairs',market:'au-melbourne'}]},html=w.SOCProviderPolicyControls.render(policy,{...context,customerId:'orchard-customer',customerName:'Orchard Repairs'}),host=w.document.createElement('div');host.innerHTML=html;
 assert.equal(host.querySelector('[name="template"]'),null,'regional paid policy cannot select unrelated templates');
 assert.deepEqual([...host.querySelectorAll('[name="scopeCustomerId"]')].map(x=>x.value),['orchard-customer','harbor-customer']);
 assert.equal(host.querySelector('[name="scopeCustomerId"][value="orchard-customer"]').checked,true);
 assert.equal(host.querySelector('[name="scopeCustomerId"][value="harbor-customer"]').checked,false);
 assert.match(host.textContent,/Only markets retained by this funded policy/);
 host.querySelector('[name="scopeCustomerId"][value="harbor-customer"]').checked=true;
 const config=w.SOCProviderPolicyControls.configFromForm(policy,new w.FormData(host.querySelector('form[data-provider-form="policy"]')),context);
 assert.deepEqual(JSON.parse(JSON.stringify(config.customerIds)),['orchard-customer','harbor-customer']);
 assert.deepEqual(JSON.parse(JSON.stringify(config.rules.map(r=>r.customerIds))),[['orchard-customer','harbor-customer'],['orchard-customer','harbor-customer']]);
 assert.deepEqual(JSON.parse(JSON.stringify(config.rules.map(r=>r.kind))),['provisioning','provisioning']);
 assert.equal(w.SOCProviderPolicy.validate(config),true);
 w.close();
});

test('regional scope keeps empty drafts empty and accepts eligible customers other than the purchase customer',()=>{
 const {w}=boot(),policy=oldPolicy(),context={regionalProvisioning:true,eligibleCustomers:[{id:'orchard-customer',name:'Orchard Repairs',market:'au-sydney'},{id:'harbor-customer',name:'Harbor Repairs',market:'au-melbourne'}]},empty=w.SOCProviderPolicyControls.render(policy,{...context,customerId:'orchard-customer',draft:{scopeCustomerId:[]}}),host=w.document.createElement('div');host.innerHTML=empty;
 assert.equal(host.querySelectorAll('[name="scopeCustomerId"]:checked').length,0);
 assert.throws(()=>w.SOCProviderPolicyControls.configFromForm(policy,fields('provisioning',{scopeCustomerId:[]}),context),/REGIONAL_SCOPE_REQUIRED/);
 assert.throws(()=>w.SOCProviderPolicyControls.configFromForm(policy,fields('provisioning',{scopeCustomerId:['orchard-customer','unowned-customer']}),context),/REGIONAL_SCOPE_INVALID/);
 const crossCustomer=w.SOCProviderPolicyControls.configFromForm(policy,fields('provisioning',{scopeCustomerId:['harbor-customer']}),context);assert.deepEqual(JSON.parse(JSON.stringify(crossCustomer.customerIds)),['harbor-customer']);
 host.innerHTML=w.SOCProviderPolicyControls.render(policy,{customerId:'orchard-customer',customerName:'Orchard Repairs'});
 assert.equal(host.querySelector('[name="scopeCustomerId"]'),null,'generic paid policies keep their existing scope controls');
 assert.ok(host.querySelector('[name="template"]'),'generic policy templates remain available');
 w.close();
});

test('form helper rejects malformed money, unknown templates and reductions below existing counters',()=>{
 const {w}=boot(),policy=oldPolicy();
 assert.throws(()=>w.SOCProviderPolicyControls.configFromForm(policy,fields('assurance',{cashFloor:'1,000'})),/INVALID_POLICY_AMOUNT/);
 assert.throws(()=>w.SOCProviderPolicyControls.configFromForm(policy,fields('unknown')),/INVALID_POLICY_TEMPLATE/);
 assert.throws(()=>w.SOCProviderPolicyControls.configFromForm(policy,fields('assurance',{customerId:'another-customer'})),/POLICY_CUSTOMER_SCOPE_MISMATCH/);
 assert.throws(()=>w.SOCProviderPolicyControls.configFromForm(policy,fields('assurance',{lifetimeBudget:'20.00'})),/INVALID_PROVIDER_POLICY/);
 assert.throws(()=>w.SOCProviderPolicyControls.configFromForm(policy,fields('assurance',{maxActions:'0'})),/INVALID_POLICY_LIMIT/);
 w.close();
});

test('review panel shows quoted recurring exposure and enables standing policy without an immediate charge',()=>{
 const {w}=boot(),policy=oldPolicy(),review={customerId:'orchard-customer',preview:{status:'ready',customerId:'orchard-customer',preview:{costCents:80000,recurringCents:1234,cashAfterCents:120000,lifetimeBudgetRemainingCents:320000,actionsRemaining:3,engineers:1,support:1,workMinutes:12}}},holder=w.document.createElement('div');holder.innerHTML=w.SOCProviderPolicyControls.render(policy,{customerId:review.customerId,customerName:'Orchard Repairs',review});
 assert.match(holder.textContent,/A\$800\.00/);assert.match(holder.textContent,/A\$12\.34/);assert.match(holder.textContent,/A\$1,?200\.00/);assert.match(holder.textContent,/Lifetime budget remaining/);assert.match(holder.textContent,/Enabling this policy places no order and charges nothing immediately/);assert.equal(holder.querySelector('[data-provider-action="policy-confirm"]').dataset.id,'orchard-customer');assert.match(holder.querySelector('[data-provider-action="policy-confirm"]').textContent,/Enable reviewed policy/);
 for(const status of ['idle','blocked','limited']){holder.innerHTML=w.SOCProviderPolicyControls.render(policy,{customerId:review.customerId,review:{...review,preview:{status,reason:'QUOTE_BLOCKED',blockers:['STAFFING_UNAVAILABLE']}}});assert.equal(holder.querySelector('[data-provider-action="policy-confirm"]').dataset.id,'orchard-customer',`${status} policies can be enabled to wait`);assert.match(holder.textContent,/wait/);assert.match(holder.textContent,/charges nothing immediately/);}
 holder.innerHTML=w.SOCProviderPolicyControls.render(policy,{customerId:review.customerId,review:{...review,error:'POLICY_CUSTOMER_SCOPE_REQUIRED'}});assert.match(holder.textContent,/policy customer scope required/);assert.equal(holder.querySelector('[data-provider-action="policy-confirm"]'),null);w.close();
});

test('review preserves uncommitted form drafts and all static N_ markers use dictionary keys',()=>{
 const {w}=boot(),policy=oldPolicy(),draft={template:'headroom',cashFloor:'234.56',lifetimeBudget:'7890.12',maxActions:'5',maxEngineers:'1',maxSupport:'0'},host=w.document.createElement('div');host.innerHTML=w.SOCProviderPolicyControls.render(policy,{customerId:'orchard-customer',draft,review:{customerId:'orchard-customer',preview:{status:'idle'}}});
 assert.equal(host.querySelector('[name="template"]').value,'headroom');for(const [name,value] of Object.entries({cashFloor:'234.56',lifetimeBudget:'7890.12',maxActions:'5',maxEngineers:'1',maxSupport:'0'}))assert.equal(host.querySelector(`[name="${name}"]`).value,value);
 const markers=[],other=w.document.createElement('iframe');w.document.body.append(other);other.contentWindow.N_=s=>{markers.push(s);return s;};other.contentWindow.eval(read('game/93-ui/78-provider-policy-controls.js'));assert.ok(markers.length>20);assert.ok(markers.every(x=>x.startsWith('provider.policy.')));other.remove();w.close();
});


test('funded regional context uses C3/C5 receipt scope before legacy L2 evidence and remains pure',()=>{
 const {w}=boot();w.eval(read('game/93-ui/70-provider-hud.js'));w.eval(read('game/93-ui/75-provider-panels.js'));
 const model={projects:[{id:'project-policy',operationId:'regional-provisioning',operationReceipt:{sourceId:'progress.goal.c5',allowedMarkets:['jp-tokyo']}}],progression:{claims:{receipts:[{sourceId:'progress.progression-level.2',sourceEvidence:{markets:['au-sydney']}}]}},customers:[{id:'orchard-customer',market:'au-sydney',status:'active'},{id:'tokyo-customer',market:'jp-tokyo',status:'active'}]},before=JSON.stringify(model);
 let context=w.SOCProviderPanels.policyContext(model,oldPolicy());assert.equal(context.sourceId,'progress.goal.c5');assert.deepEqual(Array.from(context.eligibleCustomers,c=>c.id),['tokyo-customer']);assert.equal(JSON.stringify(model),before);
 model.projects[0].operationReceipt={sourceId:'progress.goal.c3',allowedMarkets:[]};context=w.SOCProviderPanels.policyContext(model,oldPolicy());assert.equal(context.eligibleCustomers.length,0,'explicit empty funded scope cannot fall back to another achievement');
 delete model.projects[0].operationReceipt;context=w.SOCProviderPanels.policyContext(model,oldPolicy());assert.deepEqual(Array.from(context.eligibleCustomers,c=>c.id),['orchard-customer'],'legacy L2 fallback remains available');w.close();
});

test('integration policy form locks assurance and submits only an explicit funded subset without requiring the purchase anchor',()=>{
 const {w}=boot();w.eval(read('game/93-ui/70-provider-hud.js'));w.eval(read('game/93-ui/75-provider-panels.js'));
 // Projection fixtures test presentation, not an earned T2 claim or paid dispatch.
 const policy=oldPolicy(),model={projects:[{id:'project-policy',operationId:'integration-assurance',operationReceipt:{binding:{sourceId:'progress.goal.t2',customerIds:['orchard-customer','harbor-customer'],markets:['au-sydney','au-melbourne']}}}],customers:[{id:'orchard-customer',name:'Orchard',market:'au-sydney',status:'active'},{id:'harbor-customer',name:'Harbor',market:'au-melbourne',status:'active'},{id:'other-customer',market:'au-melbourne',status:'active'}]},before=JSON.stringify({policy,model}),context=w.SOCProviderPanels.policyContext(model,policy),host=w.document.createElement('div');
 host.innerHTML=w.SOCProviderPolicyControls.render(policy,{...context,draft:{template:'migration',scopeCustomerId:['harbor-customer'],cashFloor:'42.00',lifetimeBudget:'0.00'}});
 assert.equal(host.querySelector('[name="template"]'),null);assert.match(host.textContent,/Incident assurance/);assert.match(host.textContent,/Changed tested connections or unavailable boundaries suspend/);assert.deepEqual([...host.querySelectorAll('[name="scopeCustomerId"]')].map(x=>x.value),['orchard-customer','harbor-customer']);
 const config=w.SOCProviderPolicyControls.configFromForm(policy,fields('migration',{scopeCustomerId:['harbor-customer']}),context);
 assert.deepEqual(Array.from(config.customerIds),['harbor-customer']);assert.deepEqual(Array.from(config.rules,r=>r.kind),['assurance']);assert.deepEqual(Array.from(config.rules[0].customerIds),['harbor-customer']);assert.equal(config.rules[0].operationId,'repair');
 for(const scope of [[],['other-customer'],['harbor-customer','harbor-customer']])assert.throws(()=>w.SOCProviderPolicyControls.configFromForm(policy,fields('assurance',{scopeCustomerId:scope}),context),/INTEGRATION_ASSURANCE_SCOPE_(REQUIRED|INVALID)/);
 assert.equal(JSON.stringify({policy,model}),before);w.close();
});

test('suspended integration review preserves customer and budget drafts without offering activation',()=>{
 const {w}=boot(),policy=oldPolicy(),view={integrationAssurance:true,customerId:'orchard-customer',eligibleCustomers:[{id:'harbor-customer',name:'Harbor'}],draft:{scopeCustomerId:['harbor-customer'],cashFloor:'42.00',lifetimeBudget:'99.00'},review:{customerId:'orchard-customer',preview:{status:'suspended',reason:'INTEGRATION_ASSURANCE_EDGE_CHANGED',blockers:['INTEGRATION_ASSURANCE_BOUNDARY_REQUIRED']}}},before=JSON.stringify({policy,view}),host=w.document.createElement('div');
 host.innerHTML=w.SOCProviderPolicyControls.render(policy,view);assert.equal(host.querySelector('[data-provider-action="policy-confirm"]'),null);assert.match(host.textContent,/policy is suspended/);assert.match(host.textContent,/integration assurance edge changed/);assert.match(host.textContent,/integration assurance boundary required/);assert.equal(host.querySelector('[name="scopeCustomerId"]').checked,true);assert.equal(host.querySelector('[name="cashFloor"]').value,'42.00');assert.equal(host.querySelector('[name="lifetimeBudget"]').value,'99.00');
 host.innerHTML=w.SOCProviderPolicyControls.render(policy,{...view,review:{customerId:'orchard-customer',error:'INTEGRATION_ASSURANCE_EDGE_CHANGED'}});assert.equal(host.querySelector('[data-provider-action="policy-confirm"]'),null);assert.equal(host.querySelector('[name="scopeCustomerId"]').checked,true);assert.equal(JSON.stringify({policy,view}),before);w.close();
});
