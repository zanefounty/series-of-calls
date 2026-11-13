'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
function fixture(){
 const dom=new JSDOM('<!doctype html><main></main>',{runScripts:'dangerously'}),w=dom.window;
 w.N_=x=>x;w.eval(fs.readFileSync(path.join(ROOT,'src/i18n/en.js'),'utf8'));
 w.tr=(key,vars)=>String(w.I18N.en[key]||key).replace(/\{(\w+)\}/g,(text,name)=>vars?.[name]??text);
 w.SOCProviderCanvas={resourceStatus:()=> 'Ready'};
 for(const file of ['93-ui/70-provider-hud.js','93-ui/79-provider-context-actions.js','93-ui/79-provider-incidents.js','93-ui/79-provider-comparisons.js','93-ui/79-provider-scale.js','93-ui/75-provider-panels.js'])w.eval(fs.readFileSync(path.join(ROOT,'src/game',file),'utf8'));
 return {dom,w};
}
test('non-SMB customer shows three ranked actions, keeps the migration comparison together, and starts technical detail closed',()=>{
 const {dom,w}=fixture(),operation=(id,resources)=>({id,name:id,kind:'operation',resources,setupCents:1000,periodCents:100,available:true,blockers:[]});
 const customer={id:'customer-one',name:'Canopy',scenario:'enterprise',market:'au-sydney',status:'active',requirements:{recording:true},services:[{id:'carrier',name:'Carrier',observed:{ready:true}},{id:'recorder',name:'Recorder',observed:{ready:false}}]};
 const model={customers:[customer],projects:[],incidents:[],operations:[operation('recording',['recorder']),operation('migration',['phone']),operation('migration-consolidated',['phone']),operation('bpo',['people'])]};
 const before=JSON.stringify(model),host=w.document.querySelector('main');
 host.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId:customer.id}});
 const top=[...host.querySelectorAll('.provider-action-group:not(details .provider-action-group) [data-provider-action="operation"]')].map(x=>x.dataset.operation);
 assert.deepEqual(top,['recording','migration','migration-consolidated']);
 const more=host.querySelector('.provider-more-actions');assert.ok(more);assert.equal(more.open,false);
 assert.ok(more.querySelector('[data-operation="bpo"]'));
 const technical=host.querySelector('.provider-advanced-inspection');assert.ok(technical);assert.equal(technical.open,false);
 assert.equal(JSON.stringify(model),before);
 dom.window.close();
});
test('enterprise inspector retains a locked managed external calling alternative with its prerequisite',()=>{
 const {dom,w}=fixture(),customer={id:'customer-one',name:'Canopy',scenario:'enterprise',market:'au-sydney',status:'active',requirements:{},services:[{id:'carrier',name:'Carrier',observed:{ready:true}}]};
 const operation=(id,available=true)=>({id,name:id,kind:'operation',resources:['carrier'],setupCents:1000,periodCents:100,available,blockers:available?[]:['EARNED_SCOPE_REQUIRED']});
 const model={customers:[customer],projects:[],incidents:[],operations:[operation('migration'),operation('migration-consolidated'),operation('direct-external-reach'),operation('managed-external-reach',false)]};
 const host=w.document.querySelector('main'),before=JSON.stringify(model);host.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId:customer.id}});
 assert.deepEqual([...host.querySelectorAll('[data-context-group="migration-options"] [data-provider-action="operation"]')].map(x=>x.dataset.operation),['migration','migration-consolidated']);
 const migrationComparison=host.querySelector('[data-context-group="migration-options"] .provider-comparison-details');assert.ok(migrationComparison?.open);assert.match(migrationComparison.querySelector('summary').textContent,/migration/i);
 assert.ok(host.querySelector('[data-context-group="external-reach-options"] [data-operation="direct-external-reach"]'));
 assert.ok(host.querySelector('[data-context-group="scenario-prerequisites"] [data-operation="managed-external-reach"]'));
 assert.equal(JSON.stringify(model),before);dom.window.close();
});
test('active incident keeps one scoped response surface and moves other customer actions behind a deliberate control',()=>{
 const {dom,w}=fixture(),customer={id:'customer-one',name:'Canopy',scenario:'enterprise',market:'au-sydney',status:'active',services:[{id:'carrier',name:'Carrier',observed:{ready:false}}],journeys:[]};
 const operation=id=>({id,name:id,kind:'operation',resources:id==='mitigate'?['service']:['carrier'],setupCents:8000,periodCents:0,available:true,blockers:[]});
 const model={customers:[customer],projects:[],incidents:[{id:'incident-one',customerId:customer.id,resource:'carrier',kind:'outage',status:'active',activatedAt:8}],operations:[operation('repair'),operation('mitigate'),operation('migration'),operation('migration-consolidated')]};
 const before=JSON.stringify(model),host=w.document.querySelector('main');host.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId:customer.id,incidentId:'incident-one'}});
 const immediate=[...host.querySelectorAll('[data-provider-action="operation"],[data-provider-action="respond-incident"],[data-provider-action="accept-incident-risk"]')].filter(x=>!x.closest('details'));
 assert.deepEqual(immediate.map(x=>x.dataset.operation||x.dataset.providerAction),['repair','mitigate','accept-incident-risk']);
 const other=host.querySelector('[data-provider-detail="incident-other-actions"]');assert.ok(other);assert.equal(other.open,false);
 assert.ok(other.querySelector('[data-operation="migration"]'));assert.ok(other.querySelector('[data-operation="migration-consolidated"]'));
 assert.equal(JSON.stringify(model),before);dom.window.close();
});
test('AC-SOC-895 selected carrier incident renders one repair, keeps unrelated offers behind the incident decision, and does not duplicate responses',()=>{
 const {dom,w}=fixture(),customer={id:'customer-one',name:'Canopy',scenario:'enterprise',market:'au-sydney',status:'active',services:[{id:'carrier',name:'Carrier',observed:{ready:false}}],journeys:[]};
 const operation=(id,resources)=>({id,name:id,kind:'operation',resources,setupCents:8000,periodCents:0,available:true,blockers:[]});
 const model={customers:[customer],projects:[],incidents:[{id:'incident-one',customerId:customer.id,resource:'carrier',kind:'outage',status:'active',activatedAt:8}],operations:[operation('repair',['carrier']),operation('mitigate',['service']),operation('service-repair',['service']),operation('restore-queue',['engage']),operation('direct-dedicated-interconnect',['carrier'])]};
 const before=JSON.stringify(model),host=w.document.querySelector('main');host.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId:customer.id,serviceId:'carrier',incidentId:'incident-one'}});
 const immediate=[...host.querySelectorAll('[data-provider-action="operation"],[data-provider-action="accept-incident-risk"]')].filter(x=>!x.closest('details'));
 assert.deepEqual(immediate.map(x=>x.dataset.operation||x.dataset.providerAction),['repair','mitigate','accept-incident-risk']);
 assert.equal(host.querySelectorAll('[data-operation="repair"]').length,1);
 assert.equal(host.querySelectorAll('[data-operation="service-repair"]').length,0);
 assert.equal(host.querySelectorAll('[data-operation="restore-queue"]').length,0);
 assert.equal(host.querySelectorAll('[data-operation="direct-dedicated-interconnect"]:not(details *)').length,0);
 assert.equal(host.querySelector('[data-provider-detail="incident-other-actions"]').open,false);
 assert.equal(JSON.stringify(model),before);dom.window.close();
});
test('AC-SOC-896 paid scale offers wait for delivered customer work while previously funded measurements remain inspectable',()=>{
 const {dom,w}=fixture(),customer={id:'customer-one',name:'Canopy',scenario:'smb',market:'au-sydney',status:'active',metrics:{completed:0},services:[],journeys:[]};
 const operation={id:'paid-scale-baseline',name:'Measure scale',kind:'operation',resources:['people'],setupCents:1000,periodCents:0,available:true,blockers:[]};
 const model={customers:[customer],projects:[],incidents:[],operations:[operation]},host=w.document.querySelector('main');
 host.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId:customer.id}});
 assert.equal(host.querySelectorAll('.provider-scale').length,0);
 customer.metrics.completed=1;host.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId:customer.id}});
 assert.ok(host.querySelector('.provider-scale [data-operation="paid-scale-baseline"]'));
 customer.metrics.completed=0;model.projects.push({id:'project-scale',customerId:customer.id,operationId:'paid-scale-baseline',status:'complete'});host.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId:customer.id}});
 assert.ok(host.querySelector('.provider-scale [data-provider-view-key="scale:project-scale"]'));
 dom.window.close();
});
test('unfinished paid stages reserve an immediate choice without splitting the next mission comparison',()=>{
 const {dom,w}=fixture(),customer={id:'customer-one',name:'Canopy',scenario:'enterprise',market:'au-sydney',status:'provisioning',planId:'swift',stages:{base:{status:'effective'}},requirements:{recording:true},services:[{id:'recorder',name:'Recorder',observed:{ready:false}}]};
 const operation=id=>({id,name:id,kind:'operation',resources:['recorder'],setupCents:1000,periodCents:100,available:true,blockers:[]});
 const host=w.document.querySelector('main');host.innerHTML=w.SOCProviderPanels.inspector({customers:[customer],projects:[],incidents:[],operations:[operation('recording'),operation('migration'),operation('migration-consolidated')]},{selection:{customerId:customer.id}});
 assert.ok(host.querySelector('[data-provider-action="quote"][data-stage="carrier"]'));
 const immediate=[...host.querySelectorAll('.provider-action-group [data-provider-action="operation"]')].filter(x=>!x.closest('details'));
 assert.deepEqual(immediate.map(x=>x.dataset.operation),['recording']);
 assert.deepEqual([...host.querySelectorAll('.provider-more-actions [data-context-group="migration-options"] [data-provider-action="operation"]')].map(x=>x.dataset.operation),['migration','migration-consolidated']);
 dom.window.close();
});
