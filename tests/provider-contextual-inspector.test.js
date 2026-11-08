'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
function fixture(){
 const dom=new JSDOM('<!doctype html><main></main>',{runScripts:'dangerously'}),w=dom.window;
 w.N_=x=>x;w.eval(fs.readFileSync(path.join(ROOT,'src/i18n/en.js'),'utf8'));
 w.tr=(key,vars)=>String(w.I18N.en[key]||key).replace(/\{(\w+)\}/g,(text,name)=>vars?.[name]??text);
 w.SOCProviderCanvas={resourceStatus:()=> 'Ready'};
 for(const file of ['93-ui/70-provider-hud.js','93-ui/79-provider-context-actions.js','93-ui/75-provider-panels.js'])w.eval(fs.readFileSync(path.join(ROOT,'src/game',file),'utf8'));
 return {dom,w};
}
test('non-SMB customer shows three ranked actions, keeps the migration comparison together, and starts technical detail closed',()=>{
 const {dom,w}=fixture(),operation=(id,resources)=>({id,name:id,kind:'operation',resources,setupCents:1000,periodCents:100,available:true,blockers:[]});
 const customer={id:'customer-one',name:'Canopy',scenario:'enterprise',market:'au-sydney',status:'active',requirements:{recording:true},services:[{id:'carrier',name:'Carrier',observed:{ready:true}},{id:'recorder',name:'Recorder',observed:{ready:false}}]};
 const model={customers:[customer],projects:[],incidents:[{id:'incident-one',customerId:customer.id,resource:'carrier',kind:'carrier',status:'active'}],operations:[operation('repair',['carrier']),operation('mitigate',['service']),operation('recording',['recorder']),operation('migration',['phone']),operation('migration-consolidated',['phone']),operation('bpo',['people'])]};
 const before=JSON.stringify(model),host=w.document.querySelector('main');
 host.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId:customer.id}});
 const top=[...host.querySelectorAll('.provider-action-group:not(details .provider-action-group) [data-provider-action="operation"]')].map(x=>x.dataset.operation);
 assert.deepEqual(top,['repair','mitigate','recording']);
 const more=host.querySelector('.provider-more-actions');assert.ok(more);assert.equal(more.open,false);
 assert.deepEqual([...more.querySelectorAll('[data-context-group="scenario-alternatives"] [data-provider-action="operation"]')].map(x=>x.dataset.operation),['migration','migration-consolidated']);
 assert.ok(more.querySelector('[data-operation="bpo"]'));
 const technical=host.querySelector('.provider-advanced-inspection');assert.ok(technical);assert.equal(technical.open,false);
 assert.equal(JSON.stringify(model),before);
 dom.window.close();
});
