'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
function fixture(lang='en'){
 const dom=new JSDOM('<!doctype html><main></main>',{runScripts:'dangerously'}),w=dom.window;
 w.N_=x=>x;w.SOCProviderHud={esc:x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
 w.eval(fs.readFileSync(path.join(ROOT,lang==='en'?'src/i18n/en.js':`site/i18n/${lang}.js`),'utf8'));
 w.tr=(key,vars)=>String(w.I18N[lang][key]||key).replace(/\{(\w+)\}/g,(m,k)=>vars?.[k]??m);
 const source=fs.readFileSync(path.join(ROOT,'src/game/93-ui/78-provider-room-integration.js'),'utf8');w.eval(source);
 return {dom,w,source,host:w.document.querySelector('main')};
}
function model(){return {projects:[{projectId:'room-project-1',customerId:'customer-a',status:'commissioning',testAvailable:true,missing:['current-room-integration-test-required'],evidence:null,plan:{edgeId:'room-to-interop'}}]};}
test('AC-SOC-759 paid room panel explains the project and routes its test action through Provider dispatch',t=>{
 const f=fixture(),input=model(),before=JSON.stringify(input),html=f.w.SOCProviderRoomIntegrationUI.render(input,'customer-a','room-project-1');
 assert.equal(f.w.SOCProviderRoomIntegrationUI.render(input,'customer-a','room-project-1'),html);assert.equal(JSON.stringify(input),before);
 f.host.innerHTML=html;assert.match(f.host.textContent,/Grove and Disco room integration/);assert.match(f.host.textContent,/Paid 8-minute setup/);assert.match(f.host.textContent,/Commissioning/);assert.match(f.host.textContent,/Run or repeat the explicit room compatibility test/);assert.match(f.host.querySelector('details').textContent,/current-room-integration-test-required/);
 const button=f.host.querySelector('button');assert.ok(button);assert.equal(button.dataset.providerAction,'test-service-integration');assert.equal(button.dataset.id,'room-project-1');assert.equal(f.host.querySelector('section').dataset.customerId,'customer-a');
 input.projects[0].test={status:'scenario-verified'};f.host.innerHTML=f.w.SOCProviderRoomIntegrationUI.render(input,'customer-a','room-project-1');assert.match(f.host.textContent,/The integration test passed\. Complete a real bridge meeting with measurable duration\./);assert.ok(f.host.querySelector('button'),'a commissioning receipt can be explicitly retested while awaiting a meeting');
 input.projects[0].status='running';input.projects[0].testAvailable=false;input.projects[0].test=null;f.host.innerHTML=f.w.SOCProviderRoomIntegrationUI.render(input,'customer-a','room-project-1');assert.match(f.host.textContent,/Paid setup is in progress/);assert.doesNotMatch(f.host.textContent,/Repair it/);
 input.projects[0].status='cancelled';f.host.innerHTML=f.w.SOCProviderRoomIntegrationUI.render(input,'customer-a','room-project-1');assert.match(f.host.textContent,/cancelled before room configuration was submitted/i);
 input.projects[0].testAvailable=false;f.host.innerHTML=f.w.SOCProviderRoomIntegrationUI.render(input,'customer-a','room-project-1');assert.equal(f.host.querySelector('button'),null);
 assert.equal(f.w.SOCProviderRoomIntegrationUI.render(input,'customer-other','room-project-1'),'');assert.equal(f.w.SOCProviderRoomIntegrationUI.render({projects:[]},'customer-a'),'');
});
test('AC-SOC-760 completed room delivery renders actual meeting duration, observed path and escaped retained evidence',t=>{
 const f=fixture(),input={projects:[{projectId:'paid-room',customerId:'customer-a',status:'complete',testAvailable:false,missing:[],evidence:{completedAt:94,meeting:{sessionId:'session-7',startedAt:82,endedAt:87,acceptance:{path:{edges:['room-to-interop']}}},note:'<img src=x onerror=bad()>'}}]};
 f.host.innerHTML=f.w.SOCProviderRoomIntegrationUI.render(input,'customer-a','paid-room');assert.match(f.host.textContent,/Completed meeting minutes5/);assert.match(f.host.textContent,/Observed meeting pathroom-to-interop/);assert.match(f.host.textContent,/Complete/);assert.equal(f.host.querySelector('img'),null);assert.match(f.host.querySelector('pre').textContent,/<img src=x/);assert.equal(f.host.querySelector('details[open]'),null);assert.equal(f.host.querySelector('button'),null);
});
test('AC-SOC-761 paid room integration labels are translated in all six dictionaries',t=>{
 for(const lang of ['en','de','es','fr','it','pt']){const f=fixture(lang),labels=Object.keys(f.w.SOCProviderRoomIntegrationUI.labelFallbacks);for(const label of labels){assert.ok(f.w.I18N[lang][label],`${lang}: ${label}`);assert.ok(f.source.includes(`N_('${label}')`),label);}f.host.innerHTML=f.w.SOCProviderRoomIntegrationUI.render(model(),'customer-a','room-project-1');assert.doesNotMatch(f.host.textContent,/provider\.room_integration\./);f.dom.window.close();}
});
