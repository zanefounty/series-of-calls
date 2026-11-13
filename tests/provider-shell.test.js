const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications');
const root=path.join(__dirname,'..','src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function boot({map=false,quoteHandler=null}={}){
 const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{runScripts:'dangerously',pretendToBeVisual:true});const w=dom.window;
 if(map){w.W=2000;w.H=1000;w.COAST=[[[0,0],[100,0],[100,100],[0,100]]];w.CITY={syd:{x:1860,y:790}};}
 w.eval(read('game/93-ui/10-dom.js'));
 for(const file of ['game/23-provider-variants.js','game/93-ui/65-service-preferences.js','game/93-ui/70-provider-hud.js','game/93-ui/75-provider-panels.js','game/93-ui/78-provider-policy-controls.js','game/93-ui/79-provider-comparisons.js','game/93-ui/79-provider-context-actions.js','game/93-ui/79-provider-incidents.js','game/93-ui/79-provider-lifecycle.js','game/93-ui/79-provider-integration.js','game/93-ui/79-provider-progression.js','game/93-ui/79-provider-service-retirement.js','game/96-map/90-service-scene.js','game/96-map/95-provider-canvas.js','game/97-provider-shell.js'])w.eval(read(file));
 const calls={commands:[],quotes:[],other:[]};const callbacks={command:x=>{calls.commands.push(x);return {ok:true};},quote:x=>{calls.quotes.push(x);return quoteHandler?quoteHandler(x):{accepted:true,atRevision:44,name:'Swift starter service',setupCents:600000,periodCents:102000,variableUsageCents:3000,cashAfterCents:1400000,leadMinutes:7,workMinutes:7,minimumPeriods:3,forecastImpactCents:45000};},decision:x=>calls.other.push(['decision',x]),speed:x=>calls.other.push(['speed',x]),pause:()=>calls.other.push(['pause']),save:()=>calls.other.push(['save']),export:()=>calls.other.push(['export']),import:x=>calls.other.push(['import',x]),close:()=>calls.other.push(['close']),openExperience:x=>calls.other.push(['open',x]),newGame:x=>calls.other.push(['new',x])};
 w.SOC_PROVIDER_UI.mount(w.document.querySelector('#app'),callbacks);w.SOC_PROVIDER_UI.render(null,null);return {dom,w,calls};
}
function click(w,selector){const el=w.document.querySelector(selector);assert.ok(el,selector);el.click();return el;}

test('achievement controls preserve revision and source identity at the dispatch boundary',()=>{
 const {w,calls}=boot();try{
  const state=SOC.create({experience:'campaign'}),model=SOC.provider.inspect(state),sourceId='progress.goal.bb';
  model.progression.goals[sourceId]={...model.progression.goals[sourceId],status:'ready',evidence:{customerId:'starter-customer'}};
  model.progression.claims.rows.find(row=>row.sourceId===sourceId).status='ready';
  w.SOC_PROVIDER_UI.render(state,model);const before=JSON.stringify(state);
  click(w,'[data-provider-action="claim-progression"]');
  assert.equal(JSON.stringify(calls.commands.at(-1)),JSON.stringify({type:'provider',command:{action:'claim-progression',sourceId,quoteRevision:state.revision}}));
  assert.equal(JSON.stringify(state),before,'rendered eligibility cannot alter simulation evidence');
  assert.throws(()=>SOC.dispatch(state,JSON.parse(JSON.stringify(calls.commands.at(-1)))),/PROVIDER_PROGRESSION_EVIDENCE_REQUIRED/,'the engine refuses a falsely ready view');
 }finally{w.close();}
});

test('funded estate shortcut starts with the versioned sector handover',()=>{
 const {w,calls}=boot();click(w,'[data-provider-action="try-estate"]');assert.equal(JSON.stringify(calls.other.at(-1)),JSON.stringify(['new',{opening:'estate',openingVariant:'peak-window',sectorHandoverVersion:2}]));w.close();
});

test('provider shell launches through callbacks and does not write simulation state',()=>{
 const {w,calls}=boot();click(w,'[data-provider-action="show-new-game"]');const form=w.document.querySelector('[data-provider-form="new-game"]');assert.ok(form.classList.contains('is-open'));
 form.elements.providerName.value='Harbour Relay';form.elements.market.value='us-seattle';form.elements.scenario.value='enterprise';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(JSON.stringify(calls.other.at(-1)),JSON.stringify(['new',{providerName:'Harbour Relay',market:'us-seattle',difficulty:'normal',scenario:'enterprise',opening:'win',sectorHandoverVersion:2}]));
 click(w,'[data-provider-action="open"]');assert.deepEqual(calls.other.at(-1),['open','providerCampaign']);
 w.close();
});

test('new SMB form opts into the versioned staffing commitment for both opening prototypes',()=>{
 const {w,calls}=boot();try{
  click(w,'[data-provider-action="show-new-game"]');const form=w.document.querySelector('[data-provider-form="new-game"]');
  form.elements.scenario.value='smb';form.elements.opening.value='win';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(calls.other.at(-1)[1].opening,'win');
  form.elements.opening.value='estate';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(calls.other.at(-1)[1].opening,'estate');
 }finally{w.close();}
});

test('mission launch removes the SMB estate choice while keeping the visible mission selection',()=>{
 const {w,calls}=boot();try{
  click(w,'[data-provider-action="show-new-game"]');
  let form=w.document.querySelector('[data-provider-form="new-game"]');
  assert.ok(form.elements.opening,'the SMB opening comparison is available on the default mission');
  form.elements.scenario.value='government';form.elements.scenario.dispatchEvent(new w.Event('input',{bubbles:true}));
  form=w.document.querySelector('[data-provider-form="new-game"]');
  assert.equal(form.elements.scenario.value,'government');
  assert.equal(form.querySelector('[name="opening"]'),null,'a Government player cannot choose an ignored estate option');
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(calls.other.at(-1)[1].opening,'win');
  form.elements.scenario.value='smb';form.elements.scenario.dispatchEvent(new w.Event('input',{bubbles:true}));
  form=w.document.querySelector('[data-provider-form="new-game"]');
  assert.ok(form.elements.opening,'returning to SMB restores both prototype choices');
 }finally{w.close();}
});

test('renewal policy controls submit scoped limits through Provider dispatch',()=>{
 const {w,calls}=boot();try{
  const state=SOC.create({experience:'campaign',opening:'estate',seed:77}),model=SOC.provider.inspect(state);
  w.SOC_PROVIDER_UI.render(state,model);click(w,'[data-provider-action="drawer"][data-provider-value="automation"]');
  const form=w.document.querySelector('[data-provider-form="renewal-policy"]');assert.ok(form);
  form.elements.enabled.checked=true;form.elements.cashFloor.value='750';form.elements.minMargin.value='220';form.elements.cashFloor.focus();
  w.SOC_PROVIDER_UI.render(state,model);
  const preserved=w.document.querySelector('[data-provider-form="renewal-policy"]');assert.equal(preserved.elements.cashFloor.value,'750');assert.equal(w.document.activeElement,preserved.elements.cashFloor);
  preserved.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(JSON.stringify(calls.commands.at(-1)),JSON.stringify({type:'provider',command:{action:'configure-renewal-policy',customerId:'starter-customer',quoteRevision:state.revision,enabled:true,suspended:false,cashFloorCents:75000,minMarginCents:22000,maxSupplierExposureCents:150000,maxCreditCents:5000,maxRenewals:3}}));
  const configured=SOC.dispatch(state,calls.commands.at(-1));assert.equal(configured.providerCampaign.renewalPolicies[0].cashFloorCents,75000);
 }finally{w.close();}
});

test('automatic receipt policy is inspectable and suspendable from Automation',()=>{
 const {w,calls}=boot();try{
  const state=SOC.create({experience:'campaign',opening:'win',seed:77}),model=SOC.provider.inspect(state);
  w.SOC_PROVIDER_UI.render(state,model);click(w,'[data-provider-action="drawer"][data-provider-value="automation"]');
  assert.match(w.document.querySelector('.provider-auto-receipts').textContent,/Validated achievement receipts/);
  click(w,'[data-provider-action="auto-receipts-toggle"]');
  assert.equal(JSON.stringify(calls.commands.at(-1)),JSON.stringify({type:'provider',command:{action:'configure-auto-receipts',enabled:true,suspended:true,quoteRevision:state.revision}}));
  const suspended=SOC.dispatch(state,calls.commands.at(-1));assert.equal(suspended.providerCampaign.autoReceiptPolicy.suspended,true);
  w.SOC_PROVIDER_UI.render(suspended,SOC.provider.inspect(suspended));click(w,'[data-provider-action="auto-receipts-toggle"]');
  assert.equal(calls.commands.at(-1).command.suspended,false);
 }finally{w.close();}
});

test('included compatibility check policy is visible and suspendable from Automation',()=>{
 const {w,calls}=boot();try{
  const state=SOC.create({experience:'campaign',opening:'win',seed:77}),model=SOC.provider.inspect(state);
  w.SOC_PROVIDER_UI.render(state,model);click(w,'[data-provider-action="drawer"][data-provider-value="automation"]');
  assert.match(w.document.querySelector('.provider-auto-integration').textContent,/Included compatibility checks/);
  click(w,'[data-provider-action="auto-integration-toggle"]');
  assert.equal(JSON.stringify(calls.commands.at(-1)),JSON.stringify({type:'provider',command:{action:'configure-auto-integration-checks',enabled:true,suspended:true,quoteRevision:state.revision}}));
  const suspended=SOC.dispatch(state,calls.commands.at(-1));assert.equal(suspended.providerCampaign.autoIntegrationChecks.suspended,true);
  w.SOC_PROVIDER_UI.render(suspended,SOC.provider.inspect(suspended));click(w,'[data-provider-action="auto-integration-toggle"]');
  assert.equal(calls.commands.at(-1).command.suspended,false);
 }finally{w.close();}
});

test('provider plan requires an engine quote and explicit commit; map selection is local view state',()=>{
 const {w,calls}=boot();let state={revision:44,clock:0};let model={revision:44,providerName:'Harbour Relay',period:1,minute:0,cash:2000000,planComparisons:SOC.provider.inspect(SOC.create({experience:'campaign'})).planComparisons,forecast:{operatingResult:0,recurringRevenue:0,recurringCost:0,variableUsage:0},customers:[],offers:[],goals:[],mission:{name:'Orchard Repairs'},events:[]};
 w.SOC_PROVIDER_UI.render(state,model);click(w,'[data-provider-action="drawer"][data-provider-value="deals"]');click(w,'[data-provider-action="quote"][data-plan="swift"]');
 assert.equal(calls.quotes.length,1);assert.equal(JSON.stringify(calls.quotes[0]),JSON.stringify({action:'purchase',offerId:'starter',planId:'swift',stage:'base'}));assert.equal(calls.commands.length,0);assert.ok(calls.other.some(x=>x[0]==='decision'&&x[1]===true));
 click(w,'[data-provider-action="confirm-quote"]');assert.equal(JSON.stringify(calls.commands[0]),JSON.stringify({type:'provider',command:{action:'purchase',offerId:'starter',planId:'swift',stage:'base',quoteRevision:44}}));assert.equal(calls.other.at(-1)[1],false);
 model={...model,customers:[{id:'orchard',name:'Orchard Repairs',scenario:'smb',market:'au-sydney',status:'provisioning',services:[{id:'phone',provisioning:{status:'pending'}}]}]};w.SOC_PROVIDER_UI.render(state,model);
 click(w,'[data-provider-action="select-customer"]');assert.equal(w.SOC_PROVIDER_UI.view().selection.customerId,'orchard');assert.equal(calls.commands.length,1);
 assert.match(w.document.querySelector('.provider-inspector').textContent,/Provisioning/);assert.doesNotMatch(w.document.querySelector('.provider-inspector').textContent,/Due\s*0/);
 w.close();
});

test('selected customer previews a compatible connection with engine terms before commitment',()=>{
 let state=SOC.create({experience:'campaign',opening:'win',seed:71});
 const base=SOC.provider.quote(state,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});
 state=SOC.dispatch(state,{type:'provider',command:{...base.request,quoteRevision:base.atRevision}});
 const before=JSON.stringify(state),model=SOC.provider.inspect(state),{w,calls}=boot({quoteHandler:request=>SOC.provider.quote(state,request)});
 try{
  w.SOC_PROVIDER_UI.render(state,model,{selection:{customerId:'starter-customer'},layer:'services'});
  const preview=w.document.querySelector('.provider-connection-preview');
  assert.ok(preview,'funded base has a visible carrier connection preview');
  assert.equal(preview.tagName,'BUTTON','native button supplies the click, Enter and Space paths');
  assert.match(preview.textContent,/Connect external calling/);
  const terms=SOC.provider.quote(state,{action:'purchase',offerId:'starter',planId:'swift',stage:'carrier',customerId:'starter-customer'});
  assert.ok(preview.textContent.includes(w.SOCProviderHud.money(terms.setupCents)));
  assert.ok(preview.textContent.includes(w.SOCProviderHud.money(terms.periodCents)));
  assert.ok(w.document.querySelector('.provider-connection-path'));
  assert.equal(JSON.stringify(state),before,'preview is read only');
  preview.focus();preview.click();
  assert.equal(calls.quotes.at(-1).action,terms.request.action);
  assert.equal(calls.quotes.at(-1).customerId,terms.request.customerId);
  assert.equal(calls.quotes.at(-1).stage,terms.request.stage);
  assert.equal(calls.commands.length,0,'opening the quote does not fund a job');
  assert.equal(w.document.querySelector('[role="dialog"]')?.contains(w.document.activeElement),true);
  click(w,'[data-provider-action="cancel-quote"]');
  assert.equal(w.document.activeElement,preview,'the quote returns focus to the map connection');
 }finally{w.close();}
});

test('connection preview advances with funded stages and disappears after the complete plan',()=>{
 let state=SOC.create({experience:'campaign',opening:'win',seed:72});
 const purchase=(stage)=>{const quote=SOC.provider.quote(state,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});assert.deepEqual(quote.blockers,[]);state=SOC.dispatch(state,{type:'provider',command:{...quote.request,quoteRevision:quote.atRevision}});};
 const {w}=boot({quoteHandler:request=>SOC.provider.quote(state,request)});
 try{
  purchase('base');w.SOC_PROVIDER_UI.render(state,SOC.provider.inspect(state),{selection:{customerId:'starter-customer'},layer:'services'});
  assert.equal(w.document.querySelector('.provider-connection-preview')?.dataset.stage,'carrier');
  purchase('carrier');w.SOC_PROVIDER_UI.render(state,SOC.provider.inspect(state));
  assert.equal(w.document.querySelector('.provider-connection-preview')?.dataset.stage,'partner');
  purchase('partner');w.SOC_PROVIDER_UI.render(state,SOC.provider.inspect(state));
  assert.equal(w.document.querySelector('.provider-connection-preview'),null);
 }finally{w.close();}
});

test('visible plan and operation quotes disclose engine forecast scope and validated minimum term',()=>{
 const state=SOC.create({experience:'campaign'}),{w,calls}=boot({quoteHandler:request=>SOC.provider.quote(state,request)});try{
  w.SOC_PROVIDER_UI.render(state,SOC.provider.inspect(state));click(w,'[data-provider-action="drawer"][data-provider-value="deals"]');
  for(const [planId,expected] of [['swift',45000],['steady',75000]]){
   click(w,`[data-provider-action="quote"][data-offer="starter"][data-plan="${planId}"]`);const q=w.SOC_PROVIDER_UI.view().quote,text=w.document.querySelector('.provider-modal').textContent;
   assert.equal(q.forecast.conditionalFullPlan.operatingResult,expected);assert.match(text,/With this commitment · before usage/);assert.match(text,/Conditional full-plan forecast · not guaranteed/);
   assert.ok(text.includes(w.SOCProviderHud.money(q.forecast.operatingResult)),'quoted-commitment forecast is shown with its own label');assert.ok(text.includes(w.SOCProviderHud.money(expected)),'conditional full-plan value comes from the engine quote');assert.match(text,/Minimum term\s*3 periods/);assert.equal(calls.commands.length,0);
   click(w,'[data-provider-action="cancel-quote"]');
  }
 }finally{w.close();}

 const buy=(s,request)=>{const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);return SOC.dispatch(s,{type:'provider',command:{...q.request,quoteRevision:q.atRevision}});},advance=(s,minutes)=>SOC.dispatch(s,{type:'advance',minutes});let active=SOC.create({experience:'campaign'});
 for(const [stage,minutes] of [['base',3],['carrier',2],['partner',3]]){active=buy(active,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});active=advance(active,minutes);}
 const operationQuote=SOC.provider.quote(active,{action:'operation',operationId:'expand',customerId:'starter-customer'});assert.deepEqual(operationQuote.blockers,[]);assert.equal(operationQuote.minimumPeriods,undefined);assert.equal(operationQuote.commercial.minimumTermPeriods,3);
 const ui=boot({quoteHandler:request=>SOC.provider.quote(active,request)});try{
  ui.w.SOC_PROVIDER_UI.render(active,SOC.provider.inspect(active));click(ui.w,'[data-provider-action="drawer"][data-provider-value="operations"]');click(ui.w,'[data-provider-action="operation"][data-operation="expand"]');const text=ui.w.document.querySelector('.provider-modal').textContent;
  assert.match(text,/Minimum term\s*3 periods/);assert.match(text,/Conditional full-plan forecast · not guaranteed/);assert.ok(text.includes(ui.w.SOCProviderHud.money(operationQuote.forecast.conditionalFullPlan.operatingResult)));
 }finally{ui.w.close();}
});

test('starter staged quote keeps optional retail terms behind details while later quotes show them directly',()=>{
 const state=SOC.create({experience:'campaign',opening:'win'}),ui=boot();try{
  const first=SOC.provider.quote(state,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});
  const firstHtml=ui.w.SOCProviderPanels.quote(first,{quoteRequest:first.request});
  assert.match(firstHtml,/<details class="provider-starter-retail"><summary>Advanced retail terms<\/summary>/);
  assert.match(firstHtml, /provider-retail-retention/);
  assert.match(firstHtml, /reduces renewal evidence from two qualified full periods to one/);
  assert.match(firstHtml, /data-provider-form="retail-quote"/);
  const committed=SOC.dispatch(state,{type:'provider',command:{...SOC.provider.quote(state,{action:'plan',offerId:'starter',planId:'swift'}).request,quoteRevision:state.revision}});
  const later=SOC.provider.quote(committed,{action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});
  const laterHtml=ui.w.SOCProviderPanels.quote(later,{quoteRequest:later.request});
  assert.match(laterHtml,/data-provider-form="retail-quote"/);
  assert.doesNotMatch(laterHtml,/provider-starter-retail/);
 }finally{ui.w.close();}
});

test('idle inspector omits stale family-count claims and deals humanize eligibility blockers',()=>{
 const {w}=boot();try{const model={revision:1,clock:0,period:1,minute:0,cash:2000000,forecast:{},customers:[],offers:[{id:'next-1',name:'Next customer',available:false,blockers:['QUALIFYING_PERIODS_REQUIRED'],expiresAt:180}],events:[],unimplemented:{status:'pending',families:['representative-family']}};w.SOC_PROVIDER_UI.render({revision:1,clock:0},model);
  assert.doesNotMatch(w.document.querySelector('.provider-inspector').textContent,/family paths remain pending/);click(w,'[data-provider-action="drawer"][data-provider-value="deals"]');const text=w.document.querySelector('.provider-rail-body').textContent;assert.match(text,/qualifying periods required/);assert.doesNotMatch(text,/QUALIFYING_PERIODS_REQUIRED/);
 }finally{w.close();}
});

test('provider rerenders preserve launch draft focus and use compact responsive layout classes',()=>{
 const {w}=boot();const model={revision:1,clock:1,period:1,minute:1,cash:0,forecast:{},customers:[],offers:[],events:[],staff:{engineers:2,support:1}};w.SOC_PROVIDER_UI.render({revision:1,clock:1},model);click(w,'[data-provider-action="drawer"][data-provider-value="team"]');const input=w.document.querySelector('[name="engineers"]');input.focus();input.value='3';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 w.SOC_PROVIDER_UI.render({revision:2,clock:2},{...model,revision:2,clock:2,minute:2});
 assert.equal(w.document.activeElement,input);assert.equal(w.document.querySelector('[name="engineers"]').value,'3');
 assert.ok(w.document.querySelector('.provider-world'));w.close();
});

test('pause, speed and keyboard reachable controls stay on the callback boundary',()=>{
 const {w,calls}=boot();w.SOC_PROVIDER_UI.render({revision:1,clock:0},{revision:1,clock:0,period:0,minute:0,cash:100,forecast:{operatingResult:0},customers:[],offers:[],events:[]},{paused:true,speed:1});const doc=w.document;doc.body.addEventListener('click',()=>calls.other.push(['bubbled']));
 click(w,'[data-provider-action="speed"][data-provider-value="2"]');assert.deepEqual(calls.other.at(-1),['speed',2]);
 click(w,'[data-provider-action="pause"]');assert.equal(calls.other.at(-1)[0],'pause');assert.ok(!calls.other.some(x=>x[0]==='bubbled'));
 const pause=doc.querySelector('[data-provider-action="pause"]');assert.equal(pause.tagName,'BUTTON');assert.ok(pause.getAttribute('data-act'));assert.ok(pause.getAttribute('aria-pressed'));
 const css=fs.readFileSync(path.join(root,'styles/98-provider.css'),'utf8');assert.match(css,/@media\(max-width:680px\)/);assert.match(css,/\.provider-app button\{min-height:44px\}/);
 w.close();
});

test('provider map uses retained geography, customer coordinates and typed observed dependency paths',()=>{
 const {w}=boot({map:true});const state={revision:1,clock:3},model={revision:1,clock:3,period:1,minute:3,cash:1000,forecast:{operatingResult:0},offers:[],events:[],customers:[{id:'one',name:'Sydney client',scenario:'smb',market:'au-sydney',status:'active',outcome:{offered:4,completed:3,onTime:2,open:1},history:[],services:[{id:'phone',kind:'uc',desired:{directory:'identity',connectivity:'access'},provisioning:{status:'ready'},effective:{},observed:{ready:false,reasons:['CARRIER_NOT_READY']}},{id:'identity',kind:'directory',desired:{},provisioning:{status:'ready'},effective:{},observed:{ready:true,reasons:[]}},{id:'access',kind:'connectivity',desired:{},provisioning:{status:'ready'},effective:{},observed:{ready:false,reasons:['CAPACITY_EXHAUSTED']}}]}]};
 w.SOC_PROVIDER_UI.render(state,model);assert.ok(w.document.querySelector('.provider-coast path'));assert.ok(Number.parseFloat(w.document.querySelector('.provider-map-node').style.getPropertyValue('--x'))<=90,'customer hit target remains inside the world');
 const map=w.document.createElement('div');map.innerHTML=w.SOCProviderCanvas.render(model,{...w.SOC_PROVIDER_UI.view(),selection:{customerId:'one'}});assert.equal(map.querySelectorAll('.provider-dependency').length,2);assert.equal(map.querySelectorAll('.provider-containment').length,3);assert.match(map.querySelector('.provider-resource-node[data-id="phone"]').textContent,/Observed unavailable/);assert.match(map.querySelector('.provider-resource-node[data-id="phone"]').getAttribute('aria-label'),/carrier not ready/);
 w.close();
});

 test('quote keyboard focus is trapped and Escape resumes the previous decision state',()=>{const {w,calls}=boot();w.SOC_PROVIDER_UI.render({revision:44},{cash:2000000,planComparisons:SOC.provider.inspect(SOC.create({experience:'campaign'})).planComparisons,customers:[],offers:[],events:[],forecast:{}});click(w,'[data-provider-action="drawer"][data-provider-value="deals"]');const trigger=w.document.querySelector('[data-provider-action="quote"][data-plan="swift"]');trigger.focus();trigger.click();const dialog=w.document.querySelector('[role="dialog"]');assert.ok(dialog.contains(w.document.activeElement));const buttons=dialog.querySelectorAll('button:not([disabled])');buttons[buttons.length-1].focus();buttons[buttons.length-1].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(w.document.activeElement,buttons[0]);buttons[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(w.document.querySelector('[role="dialog"]'),null);assert.equal(w.document.activeElement,trigger);assert.deepEqual(calls.other.at(-1),['decision',false]);assert.equal(calls.commands.length,0);w.close();});

test('AC-SOC-897 coach distinguishes funded expansion from delivered work and keeps a won chapter coherent',()=>{
 const {w}=boot(),model={cash:1000,forecast:{},offers:[],events:[],projects:[],incidents:[{customerId:'starter-customer',status:'acknowledged'}],mission:{status:'active'},customers:[{id:'starter-customer',stages:{base:{status:'effective'},carrier:{status:'effective'},partner:{status:'effective'}},outcome:{offered:12},history:[]},{id:'next-1-customer',stages:{base:{status:'running'}}}]};
 w.SOC_PROVIDER_UI.render({revision:1},model);let steps=w.document.querySelectorAll('.provider-coach-list li');
 assert.equal(steps[3].classList.contains('is-done'),false);assert.equal(steps[4].classList.contains('is-done'),true,'funded next-customer base marks the funding step');assert.equal(steps[5].classList.contains('is-done'),false);
 model.incidents[0].status='resolved';model.customers[0].history=[{due:24}];model.customers[1].stages={base:{status:'effective'},carrier:{status:'effective'},partner:{status:'effective'}};
 w.SOC_PROVIDER_UI.render({revision:2},model);steps=w.document.querySelectorAll('.provider-coach-list li');assert.ok(steps[3].classList.contains('is-done'));assert.ok(steps[4].classList.contains('is-done'));assert.equal(steps[5].classList.contains('is-done'),false);
 model.mission.status='won';model.mission.nextSegment='enterprise';w.SOC_PROVIDER_UI.render({revision:3},model);
 steps=w.document.querySelectorAll('.provider-coach-list li');assert.equal([...steps].every(x=>x.classList.contains('is-done')),true);
 const goals=w.document.querySelector('.provider-rail-body');assert.equal(goals.querySelectorAll('h2').length,1);assert.equal(goals.querySelectorAll('[data-provider-action="resume"]').length,0);assert.equal(goals.querySelectorAll('[data-provider-action="continue-career"]').length,1);assert.equal(goals.querySelectorAll('[data-provider-action="advance-segment"]').length,1);assert.doesNotMatch(goals.textContent,/another full billing period qualifies/i);
 model.mission={status:'active',continuations:1,nextSegment:'enterprise'};w.SOC_PROVIDER_UI.render({revision:4},model);
 assert.equal([...w.document.querySelectorAll('.provider-coach-list li')].every(x=>x.classList.contains('is-done')),true);assert.equal(goals.querySelectorAll('[data-provider-action="continue-career"]').length,0);assert.equal(goals.querySelectorAll('[data-provider-action="advance-segment"]').length,1);
 model.customers[0].status='renewal';w.SOC_PROVIDER_UI.render({revision:5},model);assert.ok(goals.querySelector('[data-provider-action="select-customer"][data-id="starter-customer"]'),'the completed milestone links directly to a due renewal');
 w.close();
});

test('AC-SOC-898 renewal due takes the current objective and links directly to its customer even while other work commissions',()=>{
 const {w}=boot(),model={cash:1000,forecast:{},offers:[],events:[],projects:[{id:'work-one',customerId:'starter-customer',status:'running'}],incidents:[],mission:{status:'active'},customers:[{id:'starter-customer',status:'renewal',stages:{base:{status:'effective'},carrier:{status:'effective'},partner:{status:'effective'}},outcome:{completed:12},history:[{due:12}]}]};
 w.SOC_PROVIDER_UI.render({revision:1},model);const goals=w.document.querySelector('.provider-rail-body');assert.match(goals.textContent,/Renew or exit this customer/);assert.equal(goals.querySelectorAll('[data-provider-action="resume"]').length,1,'funded work may still resume separately');
 const renewal=goals.querySelector('[data-provider-action="select-customer"][data-id="starter-customer"]');assert.ok(renewal);renewal.click();assert.equal(w.SOC_PROVIDER_UI.view().selection.customerId,'starter-customer');w.close();
});


test('selecting an incident moves keyboard focus into its response inspector',()=>{
 const {w}=boot();try{
  let state=SOC.create({experience:'campaign',opening:'win',seed:77});
  const request={action:'plan',offerId:'starter',planId:'swift'},quote=SOC.provider.quote(state,request);
  state=SOC.dispatch(state,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});
  while(state.clock<50&&!state.providerCampaign.incidents.some(row=>row.status==='active'))state=SOC.dispatch(state,{type:'advance',minutes:1});
  const incident=state.providerCampaign.incidents.find(row=>row.status==='active');assert.ok(incident);
  w.SOC_PROVIDER_UI.render(state,SOC.provider.inspect(state));
  const trigger=w.document.querySelector(`[data-provider-action="select-incident"][data-id="${incident.id}"]`);assert.ok(trigger);
  trigger.focus();trigger.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));
  assert.notEqual(w.document.activeElement,w.document.querySelector('.provider-inspector [data-provider-action="close-inspector"]'),'pointer selection does not move keyboard focus');
  const keyboardTrigger=w.document.querySelector(`[data-provider-action="select-incident"][data-id="${incident.id}"]`);
  keyboardTrigger.focus();keyboardTrigger.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:0}));
  const close=w.document.querySelector('.provider-inspector [data-provider-action="close-inspector"]');
  assert.equal(w.document.activeElement,close,'keyboard selection begins inside the relevant inspector');
  assert.ok(w.document.querySelector('.provider-inspector .provider-incident'));
 }finally{w.close();}
});

test('mobile sheet remains explicitly open through focus changes, ticks and closes on request',()=>{
 const {w}=boot();try{Object.defineProperty(w,'innerWidth',{value:390});const model={cash:1000,customers:[],offers:[],events:[],forecast:{}};
  w.SOC_PROVIDER_UI.render({revision:1},model);
  click(w,'[data-provider-action="drawer"][data-provider-value="finance"]');
  assert.equal(w.SOC_PROVIDER_UI.view().sheetOpen,true);
  w.document.querySelector('[data-provider-action="pause"]').focus();
  w.SOC_PROVIDER_UI.render({revision:2},model);
  assert.ok(w.document.querySelector('.provider-shell').classList.contains('has-sheet'));
  click(w,'.provider-sheet-close');assert.equal(w.SOC_PROVIDER_UI.view().sheetOpen,false);
 }finally{w.close();}
});


test('provider preferences validate storage independently and rendering does not change simulation',()=>{
 const {w}=boot();try{
  const P=w.SOCServicePreferences,store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
  assert.equal(P.read(storage).sound,false);
  P.write(storage,{version:1,sound:true,animation:false,reducedMotion:true,alerts:false,inputHelp:false,language:'de',cash:999999});
  const saved=P.read(storage);assert.equal(saved.language,'de');assert.equal(saved.cash,undefined);assert.equal(saved.reducedMotion,true);
  const state={revision:8,clock:9},model={cash:1000,customers:[],offers:[],events:[],forecast:{}};const before=JSON.stringify(state);
  w.SOC_PROVIDER_UI.render(state,model,{preferences:saved});
  assert.ok(w.document.querySelector('.provider-shell.reduce-motion'));
  assert.equal(w.document.querySelector('.provider-event-strip').getAttribute('aria-live'),'off');
  assert.equal(JSON.stringify(state),before);
  store.set(P.KEY,'{broken');assert.equal(P.read(storage).sound,false);
 }finally{w.close();}
});

test('map pans on each pointer move, cancellation restores the original camera, and release commits the drag',()=>{
 const {w}=boot({map:true});try{
  const state={revision:1,clock:0},model={revision:1,clock:0,period:1,cash:2000000,customers:[],offers:[],events:[],goals:[],forecast:{}};
  w.SOC_PROVIDER_UI.render(state,model);const viewport=w.document.querySelector('.provider-world-viewport');assert.ok(viewport);
  const pointer=(type,x,y,id=7)=>{const event=new w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:id});viewport.dispatchEvent(event);};
  pointer('pointerdown',100,120);pointer('pointermove',130,160);assert.equal(w.SOC_PROVIDER_UI.view().camera.x,30);assert.equal(w.SOC_PROVIDER_UI.view().camera.y,40);
  pointer('pointermove',145,180);assert.equal(w.SOC_PROVIDER_UI.view().camera.x,45);assert.equal(w.SOC_PROVIDER_UI.view().camera.y,60);
  pointer('pointercancel',145,180);assert.equal(w.SOC_PROVIDER_UI.view().camera.x,0);assert.equal(w.SOC_PROVIDER_UI.view().camera.y,0);
  pointer('pointerup',145,180);assert.equal(w.SOC_PROVIDER_UI.view().camera.x,0,'a cancelled gesture cannot commit on a late release');
  const next=w.document.querySelector('.provider-world-viewport');const event=(type,x,y)=>{const e=new w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y});Object.defineProperty(e,'pointerId',{value:9});next.dispatchEvent(e);};
  event('pointerdown',100,120);event('pointermove',125,145);event('pointerup',125,145);assert.equal(w.SOC_PROVIDER_UI.view().camera.x,25);assert.equal(w.SOC_PROVIDER_UI.view().camera.y,25);
 }finally{w.close();}
});

test('new SMB opening discloses the real staffing hold and projected payroll before a resize',()=>{
 const {w}=boot();try{
  const state=SOC.create({experience:'campaign',opening:'win'}),model={...SOC.provider.inspect(state),team:{...state.business.workforce},revision:state.revision};
  w.SOC_PROVIDER_UI.render(state,model,{drawer:'team'});
  const panel=w.document.querySelector('[data-provider-form="staff"]')?.parentElement;assert.ok(panel);
  assert.match(panel.textContent,/committed through minute 180/);
  assert.match(panel.textContent,/A\$900/);
  assert.equal(SOC.provider.quote(state,{action:'staff',engineers:1,support:1}).blockers[0],'STAFF_COMMITMENT_ACTIVE');
 }finally{w.close();}
});


test('map product retirement preserves the project quote and submits only its revision-bound dispatch command',()=>{
 const project={id:'provider-project-4',customerId:'starter-customer',kind:'operation',productId:'ms-workplace-calling',operationId:'ms-workplace-calling',status:'complete',setupCents:210000,dueAt:25,resources:['phone']};
 const quote={action:'retire-project',atRevision:44,blockers:[],commercial:{retainedSetupCents:210000,effectiveAt:31,commitmentEndsAt:205,remainingMinimumSupplierCents:122500,recurringAfterTermCents:0,affectedWork:[{id:'interaction-4',kind:'voice',caseId:'case-4'}],resources:['phone']}};
 const {w,calls}=boot({quoteHandler:request=>({...quote,request})});try{
  const state={revision:44,clock:30},model={clock:30,revision:44,period:1,cash:1000000,forecast:{},goals:[],offers:[],events:[],projects:[project],customers:[{id:'starter-customer',name:'Orchard',status:'active',scenario:'smb',market:'au-sydney',services:[{id:'phone',kind:'uc',observed:{ready:true},effective:{}}]}]};
  w.SOC_PROVIDER_UI.render(state,model);click(w,'[data-provider-action="select-customer"][data-id="starter-customer"]');click(w,'[data-provider-action="select-service"][data-id="starter-customer:project:provider-project-4"]');click(w,'[data-provider-action="retire-project"]');
  assert.equal(JSON.stringify(calls.quotes.at(-1)),JSON.stringify({action:'retire-project',projectId:project.id}));assert.equal(calls.commands.length,0);assert.match(w.document.querySelector('.provider-modal').textContent,/interaction-4/);
  click(w,'[data-provider-action="confirm-quote"]');assert.equal(JSON.stringify(calls.commands.at(-1)),JSON.stringify({type:'provider',command:{action:'retire-project',projectId:project.id,quoteRevision:44}}));
 }finally{w.close();}
});


test('map integration test control sends only its funded project and current revision',()=>{
 const {w,calls}=boot({map:true});try{
  const state=SOC.create({experience:'campaign'}),model=SOC.provider.inspect(state),customerId='starter-customer',projectId='provider-project-9';
  model.customers=[{id:customerId,name:'Orchard',market:'au-sydney',stages:{},services:[],serviceIntegration:{projects:[{projectId,status:'commissioning',testAvailable:true,observation:{status:'awaiting-test',captureAvailable:false}}]}}];
  w.SOC_PROVIDER_UI.render(state,model);click(w,'[data-provider-action="select-customer"]');
  const before=JSON.stringify(state);click(w,'[data-provider-action="test-service-integration"]');
  const command=JSON.parse(JSON.stringify(calls.commands.at(-1)));
  assert.deepEqual(command,{type:'provider',command:{action:'test-service-integration',projectId,quoteRevision:state.revision}});
  assert.equal(JSON.stringify(state),before);assert.throws(()=>SOC.dispatch(state,command),/PAID_UC_CC_COMMISSIONING_PROJECT_REQUIRED/);
 }finally{w.close();}
});

test('expired prospect offers an explicit validated replacement action',()=>{const {w,calls}=boot();const model={cash:1000,forecast:{},offers:[{id:'next-1',name:'Expired prospect',expiresAt:300,available:false,blockers:['CUSTOMER_OFFER_EXPIRED']}],events:[],projects:[],incidents:[],goals:[],mission:{status:'active'},customers:[]};w.SOC_PROVIDER_UI.render({revision:1},model);click(w,'[data-provider-action="drawer"][data-provider-value="deals"]');click(w,'[data-provider-action="refresh-opportunity"]');assert.equal(JSON.stringify(calls.commands.at(-1)),JSON.stringify({type:'provider',command:{action:'refresh-opportunity'}}));w.close();});
