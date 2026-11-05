"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const BLOCK='EARNED_LOCAL_CONTINUITY_MARKET_REQUIRED',KEY='provider.managed_local_spares.qualification_required';
function setup({market='au-sydney',earnedMarket=null,local=true,blockers=earnedMarket===market?[]:[BLOCK],translated=false}={}){
 const dom=new JSDOM('<!doctype html><body></body>',{runScripts:'dangerously'}),w=dom.window;w.N_=x=>x;
 if(translated)w.tr=key=>key===KEY?'Translated local continuity prerequisite':key;
 for(const file of ['93-ui/70-provider-hud.js','93-ui/79-provider-context-actions.js','93-ui/75-provider-panels.js'])w.eval(fs.readFileSync(path.join(__dirname,'../src/game',file),'utf8'));
 const customer={id:'customer-a',name:'Field service',scenario:'defence',status:'active',market,stages:{},services:[],...(local?{continuity:{connected:true,autonomyMinutes:30}}:{})},model={customers:[customer],offers:[],projects:local?[{id:'paid-local',customerId:customer.id,operationId:'local-deployment',status:'complete'}]:[],incidents:[],contextualOperations:[{id:'managed-local-spares',setupCents:28000,resources:['local'],requirements:['local-deployment'],available:!blockers.length,blockers},{id:'unrelated-unavailable-product',kind:'product',resources:['room'],available:false,blockers:['UNRELATED']}],progression:{claims:{receipts:earnedMarket?[{sourceId:'progress.goal.ca',sourceEvidence:{market:earnedMarket},customerIds:['original-earner']}]:[]}}};
 const view={selection:{customerId:customer.id}},host=w.document.createElement('main');w.document.body.append(host);host.innerHTML=w.SOCProviderPanels.inspector(model,view);return {dom,w,model,view,host,button:host.querySelector('[data-operation="managed-local-spares"]')};
}
test('unearned local continuity offer remains visible in locked actions with translated prerequisite and disabled purchase',()=>{
 const f=setup({translated:true});assert.ok(f.button);assert.equal(f.button.disabled,true);assert.ok(f.button.closest('.provider-locked-actions'));assert.match(f.host.querySelector('[data-operation-blocker="managed-local-spares"]').textContent,/Translated local continuity prerequisite/);assert.equal(f.host.querySelector('[data-operation="unrelated-unavailable-product"]'),null);f.dom.window.close();
});
test('earned local continuity unlocks the same-market contextual offer for another customer without granting service',()=>{
 const f=setup({earnedMarket:'au-sydney'}),before=JSON.stringify(f.model);assert.ok(f.button);assert.equal(f.button.disabled,false);assert.equal(f.button.dataset.id,'customer-a');assert.equal(f.button.dataset.providerAction,'operation');assert.equal(f.host.querySelector('[data-operation-blocker="managed-local-spares"]'),null);assert.equal(f.w.SOCProviderPanels.inspector(f.model,f.view),f.w.SOCProviderPanels.inspector(f.model,f.view));assert.equal(JSON.stringify(f.model),before);f.dom.window.close();
});
test('a different-market receipt keeps managed autonomy spares visible but blocked',()=>{
 const f=setup({earnedMarket:'au-sydney',market:'nz-auckland'});assert.ok(f.button?.disabled);assert.match(f.host.textContent,/Claim local continuity for this market before buying managed autonomy spares/);f.dom.window.close();
});
test('same-market qualification does not hide a current cash refusal or enable an unfunded purchase',()=>{
 const f=setup({earnedMarket:'au-sydney',blockers:['INSUFFICIENT_CASH']});assert.ok(f.button?.disabled);assert.match(f.host.querySelector('[data-operation-blocker]').textContent,/insufficient cash/);f.dom.window.close();
});
test('managed autonomy prerequisite visibility does not expose an unrelated unavailable catalogue before local deployment',()=>{
 const f=setup({local:false});assert.equal(f.button,null);assert.equal(f.host.querySelector('[data-operation="unrelated-unavailable-product"]'),null);f.dom.window.close();
});
