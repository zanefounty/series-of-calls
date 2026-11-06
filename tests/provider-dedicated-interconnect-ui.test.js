"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
function fixture(language='en'){
 const dom=new JSDOM('<!doctype html><main></main>',{runScripts:'dangerously'}),w=dom.window;
 w.N_=x=>x;w.eval(fs.readFileSync(path.join(ROOT,language==='en'?'src/i18n/en.js':`site/i18n/${language}.js`),'utf8'));w.tr=(key,vars)=>String(w.I18N[language][key]||key).replace(/\{(\w+)\}/g,(x,k)=>vars?.[k]??x);
 w.SOCProviderCanvas={resourceStatus:()=> 'Ready'};
 for(const file of ['93-ui/70-provider-hud.js','93-ui/79-provider-context-actions.js','96-map/90-service-scene.js','93-ui/75-provider-panels.js'])w.eval(fs.readFileSync(path.join(ROOT,'src/game',file),'utf8'));
 return {dom,w,host:w.document.querySelector('main')};
}
const ops=[{id:'direct-dedicated-interconnect',setupCents:24000,periodCents:6000,workMinutes:6,engineers:1,support:1,resources:['phone','carrier']},{id:'managed-dedicated-interconnect',setupCents:12000,periodCents:9000,workMinutes:8,engineers:0,support:1,resources:['phone','carrier'],available:false,blockers:['PROVIDER_INTERCONNECT_EARNED_SCOPE_REQUIRED']}];
function model(){return {customers:[{id:'customer-a',name:'Actual scope',market:'au-sydney',scenario:'smb',status:'active',services:['phone','carrier','archive'].map(id=>({id,name:id,effective:{capacity:4},observed:{ready:true}}))}],operations:structuredClone(ops),projects:[],incidents:[]};}
function quote(operation=ops[0]){return {request:{action:'operation',operationId:operation.id,customerId:'customer-a'},...structuredClone(operation),blockers:operation.blockers||[],commercial:{dedicatedInterconnect:{version:1,totalLeadMinutes:operation.workMinutes+1,addedSessions:0,plan:operation.available===false?null:{previous:{trunk:{effective:{capacity:4}}}}}}};}
test('AC-SOC-695 PN contextual offers retain scoped quotes, capacity truth, blocked prerequisites and pure translated rendering',()=>{
 const f=fixture(),m=model(),before=JSON.stringify(m);
 for(const serviceId of ['phone','carrier']){
  f.host.innerHTML=f.w.SOCProviderPanels.inspector(m,{selection:{customerId:'customer-a',serviceId}});
  const section=f.host.querySelector('.provider-interconnect-choices');assert.ok(section);assert.equal(section.closest('details'),null);
  const buttons=[...section.querySelectorAll('button')];assert.equal(buttons.length,2);
  for(const [i,b] of buttons.entries()){assert.equal(b.dataset.providerAction,'operation');assert.equal(b.dataset.operation,ops[i].id);assert.equal(b.dataset.id,'customer-a');assert.equal(f.host.querySelectorAll(`[data-operation="${ops[i].id}"]`).length,1);}
  assert.match(section.textContent,/A\$240.*A\$60.*7 sim min.*1 engineers \+ 1 support × 6 sim min/s);
  assert.match(section.textContent,/A\$120.*A\$90.*9 sim min.*0 engineers \+ 1 support × 8 sim min/s);
  assert.match(section.textContent,/Claim dedicated interconnect evidence for this market/);
 }
 f.host.innerHTML=f.w.SOCProviderPanels.inspector(m,{selection:{customerId:'customer-a',serviceId:'archive'}});assert.equal(f.host.querySelector('.provider-interconnect-choices'),null);
 f.host.innerHTML=f.w.SOCProviderPanels.inspector(m,{selection:{customerId:'customer-a'}});assert.equal(f.host.querySelector('.provider-interconnect-choices'),null);assert.ok(f.host.querySelector('.provider-more-actions [data-operation="direct-dedicated-interconnect"]'));
 const other=model();other.customers[0].id='customer-b';other.customers[0].market='jp-tokyo';other.operations[1].blockers=['PROVIDER_INTERCONNECT_EARNED_SCOPE_REQUIRED'];f.host.innerHTML=f.w.SOCProviderPanels.inspector(other,{selection:{customerId:'customer-b',serviceId:'carrier'}});assert.equal(f.host.querySelector('.provider-interconnect-choices [data-operation="managed-dedicated-interconnect"]').dataset.id,'customer-b');assert.match(f.host.querySelector('.provider-interconnect-choices').textContent,/Claim dedicated interconnect evidence for this market/);
 assert.equal(JSON.stringify(m),before);
 const q=quote(),saved=JSON.stringify(q);f.host.innerHTML=f.w.SOCProviderPanels.quote(q,{});
 assert.equal(f.host.querySelector('#quote-title').textContent,'Direct dedicated interconnect');assert.match(f.host.textContent,/4 concurrent sessions.*adds no sessions/s);assert.match(f.host.textContent,/certified SBC, trusted TLS, valid hostname and authenticated peer/);assert.match(f.host.textContent,/settled, completed inbound and outbound/);assert.match(f.host.textContent,/independent media in both directions/);assert.match(f.host.textContent,/Existing supplier commitments and usage charges remain payable/);assert.match(f.host.textContent,/Delivery estimate7 sim min/);assert.equal(f.host.querySelector('[data-provider-action="confirm-quote"]').disabled,false);assert.equal(JSON.stringify(q),saved);
 for(const reason of ['VERSION_REQUIRED','CUSTOMER_REQUIRED','HISTORY_REQUIRED','SUPPORT_REQUIRED','SERVICE_REQUIRED','EARNED_SCOPE_REQUIRED','WORK_IN_PROGRESS','EXISTING_WORK_REQUIRED']){
  const blocked=quote(ops[1]);blocked.blockers=['PROVIDER_INTERCONNECT_'+reason];f.host.innerHTML=f.w.SOCProviderPanels.quote(blocked,{});assert.equal(f.host.querySelector('[data-provider-action="confirm-quote"]').disabled,true);assert.doesNotMatch(f.host.textContent,/PROVIDER_INTERCONNECT_|provider interconnect/);assert.match(f.host.textContent,/capacity is unavailable/);assert.doesNotMatch(f.host.textContent,/4 concurrent sessions/);assert.ok(f.host.querySelector('[data-provider-action="cancel-quote"]'));
 }
 f.dom.window.close();
 for(const lang of ['en','de','es','fr','it','pt']){const t=fixture(lang);for(const op of ops){t.host.innerHTML=t.w.SOCProviderPanels.quote(quote(op),{});assert.equal(t.host.querySelector('#quote-title').textContent,t.w.I18N[lang]['provider.interconnect.'+(op===ops[0]?'direct_name':'managed_name')]);assert.doesNotMatch(t.host.textContent,/provider\.interconnect\./);}const scene=t.w.SOCServiceScene.project({...model(),projects:[{id:'paid-project',customerId:'customer-a',kind:'operation',operationId:ops[0].id,status:'complete',resources:['phone','carrier']}]});assert.ok(scene.customers[0].projects[0].name.includes(t.w.I18N[lang]['provider.interconnect.direct_name']));t.dom.window.close();}
});
