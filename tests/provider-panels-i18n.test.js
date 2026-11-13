const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/game/93-ui/75-provider-panels.js'),'utf8');
const hud=fs.readFileSync(path.join(root,'src/game/93-ui/70-provider-hud.js'),'utf8');
const variants=fs.readFileSync(path.join(root,'src/game/23-provider-variants.js'),'utf8');
function ui({translate=false}={}){
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),w=dom.window,markers=[];
 w.N_=key=>{markers.push(key);return key;};
 if(translate)w.tr=(key,vars)=>`⟦${key}⟧`;
 w.eval(variants);w.eval(hud);w.eval(source);return {dom,w,markers};
}

test('provider panels retain exact English fallbacks when the translation runtime is absent',()=>{
 const {dom,w}=ui(),launch=w.SOCProviderPanels.launch({draft:{},newGameOpen:true}),rail=w.SOCProviderPanels.rail({customers:[],offers:[],goals:[],mission:{}},{drawer:'goals'}),quote=w.SOCProviderPanels.quote(null,{quoteRequest:{}});
 const host=w.document.createElement('main');host.innerHTML=launch+rail+quote;
 for(const label of ['Build a service people can rely on.','Choose a customer plan, commit cash and staff, then operate the service against real customer work.','Play / Continue','Starting capital: Easy A$25,000 · Normal A$20,000 · Hard A$16,000.','Start paused career','CURRENT OBJECTIVE','Choose your first customer','Launch a managed service','Connect external calling','Add a partner capability','Operate and respond','Expand a site or capability','Deliver the expanded service','Compare customer plans'])assert.ok(host.textContent.includes(label),`fallback label appears: ${label}`);
 assert.ok(host.querySelector('[data-provider-action="drawer"][data-provider-value="deals"]'));
 assert.ok(host.querySelector('[data-provider-form="new-game"]'));
 dom.window.close();
});

test('static provider panel labels use N_ keys and translated labels render without changing interaction attributes',()=>{
 const {dom,w,markers}=ui({translate:true}),html=w.SOCProviderPanels.launch({draft:{},newGameOpen:true}),host=w.document.createElement('div');host.innerHTML=html;
 assert.ok(markers.includes('provider.panels.launch_title'));
 assert.ok(host.textContent.includes('⟦provider.panels.launch_title⟧'));
 assert.equal(host.querySelector('[data-provider-action="open"]').textContent,'⟦provider.panels.play_continue⟧');
 assert.equal(host.querySelector('[data-provider-form="new-game"] input[name="providerName"]').value,'Busy Signal MSP');
 assert.ok(Object.keys(w.SOCProviderPanels.labelFallbacks).length>=150);
 assert.ok(Object.keys(w.SOCProviderPanels.labelFallbacks).every(key=>markers.includes(key)));
 dom.window.close();
});

test('rendered authored names and quote values remain escaped and panel handlers remain attached',()=>{
 const {dom,w}=ui(),model={customers:[{id:'c1',name:'Available',scenario:'smb',status:'active',market:'au-sydney',stages:{},services:[]}],offers:[],goals:[],mission:{}},rail=w.SOCProviderPanels.rail(model,{drawer:'deals'}),host=w.document.createElement('div');host.innerHTML=rail;
 assert.ok(host.querySelector('li b')?.textContent==='Available','authored customer names remain unchanged');
 assert.equal(host.querySelector('[data-provider-action="select-customer"]').dataset.id,'c1');
 const quote=w.SOCProviderPanels.quote({action:'exit',commercial:{openJobs:2,remainingMinimumSupplierCents:5000},blockers:[]},{});host.innerHTML=quote;
 assert.ok(host.querySelector('[data-provider-action="confirm-quote"]'));
 assert.ok(host.textContent.includes('2 open jobs still need settlement'));
 const malicious=w.SOCProviderPanels.quote({action:'credit',commercial:{principalCents:1,interestRateBpsPerPeriod:0,estimatedInterestCentsPerPeriod:0},cashAfter:1,blockers:[]},{});host.innerHTML=malicious;
 assert.equal(host.querySelector('script'),null);dom.window.close();
});

test('earned capacity quotes show constrained units and preserve a refused draft without enabling commitment',()=>{
 const SOC=require('../src/game/55-communications.js'),{dom,w}=ui();let state=SOC.create({experience:'campaign',scenario:'government'});
 const opening={action:'purchase',offerId:'starter',planId:'steady',stage:'base'},openingQuote=SOC.provider.quote(state,opening);
 state=SOC.dispatch(state,{type:'provider',command:{...opening,quoteRevision:openingQuote.atRevision}});
 const request={action:'operation',operationId:'public-service-capture-reserve',customerId:'starter-customer'};
 // The new customer has not earned the award; its refused quote still explains the proposal.
 const quote=SOC.provider.quote(state,request),before=JSON.stringify(quote),host=w.document.createElement('div');
 host.innerHTML=w.SOCProviderPanels.quote(quote,{quoteRequest:request,customers:[]});
 assert.ok(quote.blockers.length);assert.ok(host.querySelector('[data-provider-action="confirm-quote"]').disabled);
 assert.ok(host.querySelector('[data-provider-action="cancel-quote"]'));
 assert.match(host.textContent,/concurrent capture reservations/);assert.match(host.textContent,/retention, backup, key or access permissions/);
 assert.equal(JSON.stringify(quote),before);
 dom.window.close();
});
