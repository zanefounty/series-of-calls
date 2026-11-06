const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications.js');

const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
function boot(locks){
 const dom=new JSDOM('<!doctype html><html><body><div id="app"></div><div id="modal" hidden></div></body></html>',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'}),w=dom.window;
 w.__TUBES_TEST__=true;w.SOC=SOC;w.SOCProviderPolicy=require('../src/game/23-provider-policy');w.ACT={};w.UI={speed:0};w.SCT={};w.socClose=()=>{};
 let acquired=0;Object.defineProperty(w.navigator,'locks',{value:locks||{request:async(_name,_options,callback)=>{acquired++;await callback({name:'provider'});}}});
 w.eval(read('src/game/93-ui/10-dom.js'));
 for(const file of ['src/game/23-provider-variants.js','src/game/93-ui/65-service-preferences.js','src/game/93-ui/70-provider-hud.js','src/game/93-ui/75-provider-panels.js','src/game/93-ui/78-provider-policy-controls.js','src/game/93-ui/79-provider-comparisons.js','src/game/96-map/90-service-scene.js','src/game/96-map/95-provider-canvas.js','src/game/97-provider-shell.js'])w.eval(read(file));
 w.eval(read('src/game/98-provider-runtime.js')+';globalThis.__SCP=SCP;');
 return {dom,w,acquired:()=>acquired};
}

test('AC-SOC-677 native career lock revocation pauses, cancels delayed work and preserves the exportable state',async()=>{
 const requests=[],locks={request:(_name,_options,callback)=>new Promise((resolve,reject)=>{requests.push({reject});Promise.resolve(callback({name:'provider'})).then(resolve,reject);})};
 const {dom,w}=boot(locks);try{
  w.providerHome();await w.providerNew({providerName:'Revocation MSP'});
  const state=JSON.stringify(w.__SCP.state),disk=w.localStorage.getItem('series-of-calls:provider:v1');
  let pending;w.URL.createObjectURL=()=> 'blob:delayed-worker';w.URL.revokeObjectURL=()=>{};
  w.Worker=class{postMessage(message){this.message=message;pending=this;}terminate(){this.terminated=true;}};
  w.providerSpeed(8);w.providerTick();assert.equal(w.__SCP.busy,true);
  requests[0].reject(new w.DOMException('Native lock stolen','AbortError'));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(w.__SCP.locked,false);assert.equal(w.__SCP.speed,0);assert.equal(w.__SCP.busy,false);assert.equal(pending.terminated,true);
  assert.match(w.document.querySelector('[data-provider-error]').textContent,/read-only.*paused/i);
  pending.onmessage({data:{id:pending.message.id,revision:pending.message.state.revision,state:SOC.dispatch(pending.message.state,pending.message.command)}});
  w.providerTick();w.providerSpeed(8);
  assert.equal(JSON.stringify(w.__SCP.state),state);assert.equal(w.localStorage.getItem('series-of-calls:provider:v1'),disk);
  assert.equal(w.__SCP.speed,0);assert.deepEqual(SOC.restore(state),w.__SCP.state);
  await w.providerOpen();assert.equal(w.__SCP.locked,true);assert.equal(JSON.stringify(w.__SCP.state),state);
 }finally{w.providerRelease();dom.window.close();}
});

test('AC-SOC-678 obsolete lock acquisition and rejection cannot overwrite a later owner',async()=>{
 const requests=[],locks={request:(_name,_options,callback)=>new Promise((resolve,reject)=>requests.push({callback,resolve,reject}))};
 const {dom,w}=boot(locks);try{
  const old=w.providerAcquire();w.providerRelease();const current=w.providerAcquire();
  const held=requests[1].callback({name:'current'});assert.equal(await current,true);
  await requests[0].callback({name:'obsolete'});assert.equal(await old,false);assert.equal(w.__SCP.locked,true);
  requests[0].reject(new Error('Obsolete native request rejected'));await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(w.__SCP.locked,true);assert.equal(w.__SCP.error,'');
  w.providerRelease();await held;assert.equal(w.__SCP.locked,false);
 }finally{w.providerRelease();dom.window.close();}
});

test('provider runtime creates campaigns through visible new-game controls and stores an owned save',async()=>{
 const {dom,w}=boot();try{
  const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();
  w.document.querySelector('[data-provider-action="show-new-game"]').click();const form=w.document.querySelector('[data-provider-form="new-game"]');
  form.elements.providerName.value='Runtime Test MSP';form.elements.market.value='us-seattle';form.elements.difficulty.value='normal';form.elements.scenario.value='smb';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,10));const state=()=>w.__SCP;assert.equal(state().state.providerCampaign.providerName,'Runtime Test MSP');assert.equal(state().state.providerCampaign.market,'us-seattle');assert.equal(state().state.clock,0);assert.equal(state().locked,true);
  w.document.querySelector('[data-provider-action="drawer"][data-provider-value="finance"]').click();w.document.querySelector('[data-provider-action="save"]').click();
  const envelope=JSON.parse(w.localStorage.getItem('series-of-calls:provider:v1'));assert.equal(envelope.version,1);assert.equal(envelope.seq,2);assert.equal(envelope.state.providerCampaign.providerName,'Runtime Test MSP');
 }finally{dom.window.close();}
});

test('provider worker failure uses the deterministic synchronous advance fallback and save restore',async()=>{
 const {dom,w}=boot();try{
  const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();await w.providerNew({providerName:'Fallback MSP',scenario:'smb',market:'au-sydney',difficulty:'normal'});const state=()=>w.__SCP;
  assert.equal(state().locked,true);assert.equal(state().state.clock,0);w.Worker=undefined;
  w.providerTick();assert.equal(state().busy,false);assert.equal(state().state.clock,1);assert.equal(state().seq,2);
  const before=JSON.stringify(state().state);w.providerHome();assert.equal(state().locked,false);await new Promise(r=>setTimeout(r,5));await w.providerOpen();assert.equal(state().locked,true);assert.equal(JSON.stringify(state().state),before);
  assert.equal(state().state.providerCampaign.providerName,'Fallback MSP');
 }finally{dom.window.close();}
});

test('opening a costed quote invalidates a delayed worker tick and still permits a current quote commit',async()=>{
 const {dom,w}=boot();try{
  const delayed=[];w.URL.createObjectURL=()=> 'blob:delayed-worker';w.URL.revokeObjectURL=()=>{};w.Worker=class {postMessage(message){this.message=message;this.state=SOC.dispatch(message.state,message.command);delayed.push(this);}terminate(){this.terminated=true;}reply(){this.onmessage?.({data:{id:this.message.id,revision:this.message.command.expectedRevision,state:this.state}});}};
  const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();
  w.document.querySelector('[data-provider-action="show-new-game"]').click();const form=w.document.querySelector('[data-provider-form="new-game"]');form.elements.providerName.value='Delayed Worker MSP';form.elements.market.value='au-sydney';form.elements.difficulty.value='normal';form.elements.scenario.value='smb';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,10));
  assert.equal(w.__SCP.locked,true);const before={clock:w.__SCP.state.clock,revision:w.__SCP.state.revision,seq:w.__SCP.seq};w.providerTick();assert.equal(w.__SCP.busy,true,`provider tick should remain pending (${typeof w.Worker}, ${typeof w.eval('Worker')}, ${delayed.length})`);assert.equal(delayed.length,1);
  w.document.querySelector('[data-provider-action="drawer"][data-provider-value="deals"]').click();w.document.querySelector('[data-provider-action="quote"][data-offer="starter"][data-plan="swift"]').click();assert.equal(w.__SCP.busy,false,'opening a decision must cancel pending work');assert.equal(delayed[0].terminated,true);
  delayed[0].reply();await new Promise(r=>setTimeout(r,10));assert.deepEqual({clock:w.__SCP.state.clock,revision:w.__SCP.state.revision,seq:w.__SCP.seq},before,'a delayed worker result cannot advance or persist after a quote opens');
  const retail=w.document.querySelector('[data-provider-form="retail-quote"]');assert.ok(retail,'base quote should show customer retail acceptance');retail.elements.retailPrice.value='1800';retail.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  w.document.querySelector('[data-provider-action="confirm-quote"]').click();assert.ok(w.__SCP.state.providerCampaign.projects.some(x=>x.kind==='stage'&&x.stage==='base'));assert.equal(w.__SCP.state.clock,0);assert.equal(JSON.parse(w.localStorage.getItem('series-of-calls:provider:v1')).state.revision,w.__SCP.state.revision);
 }finally{dom.window.close();}
});

test('providerFrame keeps canonical paid opening economics and demand equal at every advertised speed',()=>{
 let state=SOC.create({experience:'campaign',providerName:'Speed Equivalence MSP',scenario:'smb',market:'au-sydney',difficulty:'normal'}),sequence=1;
 const command=cmd=>{state=SOC.dispatch(state,{type:'provider',requestId:`provider-${sequence++}`,command:{...cmd,quoteRevision:state.revision}});};
 const purchase=(stage,customerId)=>{const request={action:'purchase',offerId:'starter',planId:'swift',stage,...(customerId?{customerId}:{})},quote=SOC.provider.quote(state,request);assert.deepEqual(quote.blockers,[]);command(request);};
 purchase('base');while(state.providerCampaign.customers[0].stages.base?.status!=='effective')state=SOC.dispatch(state,{type:'advance',minutes:1});
 purchase('carrier','starter-customer');while(state.providerCampaign.customers[0].stages.carrier?.status!=='effective')state=SOC.dispatch(state,{type:'advance',minutes:1});
 purchase('partner','starter-customer');while(state.providerCampaign.customers[0].stages.partner?.status!=='effective')state=SOC.dispatch(state,{type:'advance',minutes:1});
 const seed=structuredClone(state),canonical=[];
 for(const speed of [.5,1,2,4,8]){
  const {dom,w}=boot();try{
   w.requestAnimationFrame=()=>0;w.Worker=undefined;const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();const runtime=w.__SCP;runtime.state=structuredClone(seed);runtime.seq=1;runtime.locked=true;runtime.atHome=false;runtime.speed=0;w.providerRender();
   const control=w.document.querySelector(`[data-provider-action="speed"][data-provider-value="${speed}"]`);assert.ok(control,`${speed}× control should be visible`);control.click();let now=Math.ceil(w.performance.now());runtime.last=now;let frames=0;
   while(runtime.state.clock<120&&frames<20000){now+=250;w.providerFrame(now);frames++;if(runtime.speed===0&&runtime.state.clock<120){w.document.querySelector(`[data-provider-action="speed"][data-provider-value="${speed}"]`).click();runtime.last=now;}}
   assert.equal(runtime.state.clock,120,`${speed}× reached the same canonical clock`);assert.ok(runtime.state.providerCampaign.periodHistory.some(x=>x.to===120),'a full actual customer work period settled');canonical.push({speed,state:JSON.parse(JSON.stringify(runtime.state)),frames});
  }finally{dom.window.close();}
 }
 const expected=JSON.stringify(canonical[0].state);for(const result of canonical.slice(1)){assert.equal(JSON.stringify(result.state),expected,`${result.speed}× must preserve identical dispatch, demand, cash and settlement state`);}
 assert.ok(canonical[0].state.business.balance.cash<seed.business.balance.cash,'the comparison includes actual period cash reconciliation');assert.equal(canonical[0].state.providerCampaign.periodHistory.find(x=>x.to===120).due,24,'the comparison includes authored full-period customer demand');
});


test('stale quote preserves draft, refuses duplicate commitment and requires fresh explicit review',async()=>{
 const {dom,w}=boot();try{
  w.providerHome();await w.providerNew({providerName:'Quote Recovery MSP'});
  w.document.querySelector('[data-provider-action="drawer"][data-provider-value="deals"]').click();
  w.document.querySelector('[data-provider-action="quote"][data-plan="steady"]').click();
  const draft=JSON.stringify(w.SOC_PROVIDER_UI.view().quoteRequest),before=w.__SCP.state.business.balance.cash;
  // An independently accepted command changes the revision while this quote is open.
  w.__SCP.state=SOC.dispatch(w.__SCP.state,{type:'advance',minutes:1});
  w.document.querySelector('[data-provider-action="confirm-quote"]').click();
  assert.ok(w.document.querySelector('[role="dialog"]'));
  assert.equal(JSON.stringify(w.SOC_PROVIDER_UI.view().quoteRequest),draft);
  assert.equal(w.__SCP.state.business.balance.cash,before);
  assert.equal(w.__SCP.state.providerCampaign.customers.length,0);
  assert.equal(w.document.querySelector('[data-provider-action="confirm-quote"]').disabled,true);
  assert.match(w.document.querySelector('[role="dialog"] [role="alert"]').textContent,/world changed|review current/i);
  assert.equal(w.__SCP.decision,true);
  w.document.querySelector('[data-provider-action="refresh-quote"]').click();
  assert.equal(w.__SCP.state.providerCampaign.customers.length,0,'review must not recommit');
  assert.equal(w.SOC_PROVIDER_UI.view().quote.atRevision,w.__SCP.state.revision);
  w.document.querySelector('[data-provider-action="confirm-quote"]').click();
  assert.equal(w.__SCP.state.providerCampaign.customers.length,1);
  assert.equal(w.SOC_PROVIDER_UI.view().quoteModal,false);
  assert.equal(w.__SCP.decision,false);
 }finally{dom.window.close();}
});

test('standing policy review preserves drafts through ticks and stale refusal, then enables through dispatch without immediate purchase',async()=>{
 const {dom,w}=boot();try{
  const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();await w.providerNew({scenario:'smb'});
  const buy=command=>{const q=SOC.provider.quote(w.__SCP.state,command);assert.deepEqual(q.blockers,[]);assert.equal(w.providerCommand({type:'provider',command:{...command,quoteRevision:q.atRevision}}).ok,true);};
  buy({action:'purchase',offerId:'starter',planId:'swift',stage:'base'});for(let n=0;n<4;n++)w.providerTick();buy({action:'operation',operationId:'automation',customerId:'starter-customer'});for(let n=0;n<6;n++)w.providerTick();
  w.document.querySelector('[data-provider-action="drawer"][data-provider-value="automation"]').click();
  const form=()=>w.document.querySelector('[data-provider-form=policy]');const fill=(key,value)=>{form().elements[key].value=value;form().elements[key].dispatchEvent(new w.Event('input',{bubbles:true}));};fill('template','provisioning');fill('lifetimeBudget','3000');fill('cashFloor','100');
  w.providerTick();assert.equal(form().elements.lifetimeBudget.value,'3000');assert.equal(form().elements.template.value,'provisioning');
  const submit=()=>form().dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));submit();assert.equal(w.SOC_PROVIDER_UI.view().policyReview.preview.status,'ready');const cash=w.__SCP.state.business.balance.cash;
  w.providerTick();w.document.querySelector('[data-provider-action=policy-confirm]').click();assert.match(w.SOC_PROVIDER_UI.view().policyReview.error,/world changed/i);assert.equal(w.__SCP.state.providerAutomation[0].config,undefined);assert.equal(form().elements.lifetimeBudget.value,'3000');
  submit();w.document.querySelector('[data-provider-action=policy-confirm]').click();assert.equal(w.__SCP.state.providerAutomation[0].config.rules[0].kind,'provisioning');assert.equal(w.__SCP.state.business.balance.cash,cash);assert.equal(w.__SCP.state.providerCampaign.customers[0].stages.carrier,null);
  w.providerTick();assert.ok(w.__SCP.state.providerCampaign.customers[0].stages.carrier);assert.equal(w.__SCP.state.providerAutomation[0].actions.length,1);assert.deepEqual(SOC.restore(JSON.stringify(w.__SCP.state)),w.__SCP.state);
 }finally{dom.window.close();}
});


test('map actions retain a blocked costed quote while shared engineers are occupied',async()=>{
 const {dom,w}=boot();try{
  const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();await w.providerNew({scenario:'enterprise'});
  const buy=command=>{const q=SOC.provider.quote(w.__SCP.state,command);assert.deepEqual(q.blockers,[]);assert.equal(w.providerCommand({type:'provider',command:{...command,quoteRevision:q.atRevision}}).ok,true);};
  for(const stage of ['base','carrier','partner'])buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
  for(let n=0;n<5;n++)w.providerTick();buy({action:'operation',operationId:'migration-consolidated',customerId:'starter-customer'});
  w.SOC_PROVIDER_UI.render(w.__SCP.state,w.providerModel(),{selection:{kind:'service',customerId:'starter-customer',serviceId:'carrier'}});
  const button=w.document.querySelector('.provider-inspector [data-provider-action=operation][data-operation=carrier-headroom]');assert.ok(button,'the costed response remains reachable while staff are busy');const cash=w.__SCP.state.business.balance.cash;button.click();assert.ok(w.SOC_PROVIDER_UI.view().quote.blockers.includes('ENGINEER_CAPACITY'));assert.equal(w.document.querySelector('[data-provider-action=confirm-quote]').disabled,true);assert.equal(w.__SCP.state.business.balance.cash,cash);assert.equal(w.__SCP.state.providerCampaign.projects.some(p=>p.operationId==='carrier-headroom'),false);
 }finally{dom.window.close();}
});


test('AC-SOC-725 selecting a real newly funded customer quotes contextual operations without inventing a retry case',async()=>{
 const {dom,w}=boot();try{
  w.providerHome();await w.providerNew({providerName:'Contextual quote MSP',scenario:'enterprise'});
  const request={action:'purchase',offerId:'starter',planId:'swift',stage:'base'},q=SOC.provider.quote(w.__SCP.state,request);
  await w.providerCommand({type:'provider',command:{...request,quoteRevision:q.atRevision}});
  const node=w.document.querySelector('[data-provider-action="select-customer"][data-id="starter-customer"]');assert.ok(node);node.click();
  assert.equal(w.__SCP.error,'');assert.equal(w.SOC_PROVIDER_UI.view().inspectorOpen,true);assert.equal(w.document.querySelector('[data-provider-region=inspector]').hidden,false);
  assert.ok(w.document.querySelector('.provider-inspector'));
  assert.equal(w.document.querySelector('[data-provider-action="operation"][data-operation="retry-case-followup"]'),null);
  assert.equal(w.document.querySelector('[data-provider-action="quote-case-followup"]'),null);
 }finally{w.providerRelease();dom.window.close();}
});


test('AC-SOC-829 paid mission failure pauses once and visible Resume operations continues the same live business',()=>{
 // Every positive gameplay state below comes from the public dispatcher.
 let state=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 const customerId='starter-customer',P=require('../src/game/23-provider-policy');
 const buy=request=>{const q=SOC.provider.quote(state,request);assert.deepEqual(q.blockers,[],JSON.stringify({clock:state.clock,request,blockers:q.blockers}));state=SOC.dispatch(state,{type:'provider',command:{...request,quoteRevision:q.atRevision}});};
 const tick=()=>{for(const c of state.providerCampaign.customers.filter(c=>c.status==='renewal'))state=SOC.dispatch(state,{type:'provider',command:{action:'renew',customerId:c.id}});state=SOC.dispatch(state,{type:'advance',minutes:1});};
 const until=predicate=>{for(let n=0;n<300&&!predicate();n++)tick();assert.ok(predicate(),'paid fixture stalled at '+state.clock);};
 for(const stage of ['base','carrier','partner']){buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});until(()=>state.providerCampaign.customers[0].stages[stage].status==='effective');}
 const op=id=>{buy({action:'operation',operationId:id,customerId});until(()=>state.providerCampaign.projects.findLast(p=>p.operationId===id).status==='complete');};
 op('automation');
 const policy=state.providerAutomation[0],config={...P.create(),enabled:true,cashFloorCents:10000,lifetimeBudgetCents:300000,budgetSpentCents:policy.spentCents,maxActions:6,actionsUsed:policy.actions.length,engineerCeiling:2,supportCeiling:1,customerIds:[customerId],rules:[{id:'assurance',kind:'assurance',enabled:true,customerIds:[customerId],operationId:'repair',stage:null,resourceId:null,thresholdPercent:null}]};
 state=SOC.dispatch(state,{type:'provider',command:{action:'configure-policy',customerId,config}});
 op('recording');op('bpo');state=SOC.dispatch(state,{type:'provider',command:{action:'staff',engineers:4,support:4}});op('ms-workplace-calling');until(()=>state.clock===239);
 assert.equal(state.providerCampaign.status,'operating');assert.equal(state.providerCampaign.mission.consecutiveFailures,2);
 const {dom,w}=boot();try{
  w.Worker=undefined;w.providerHome();const runtime=w.__SCP;runtime.state=SOC.restore(JSON.stringify(state));runtime.atHome=false;runtime.locked=true;w.providerRender();w.providerSpeed(8);assert.equal(runtime.speed,8);
  w.providerTick();assert.equal(runtime.state.clock,240);assert.equal(runtime.state.providerCampaign.status,'failed');assert.equal(runtime.state.providerCampaign.missionStatus,'failed');assert.equal(runtime.state.providerCampaign.customers[0].status,'active');assert.equal(runtime.state.business.solvency.status,'current');assert.equal(runtime.speed,0,'new mission failure pauses once');
  assert.ok(runtime.state.providerCampaign.customers[0].history.slice(-3).every(h=>h.qualified));assert.ok(runtime.state.providerCampaign.periodHistory.slice(-3).every(h=>h.operatingResult<0),'mission failure is actual operating loss, not fabricated customer failure');
  const before=JSON.stringify(runtime.state),failure=runtime.state.providerCampaign.mission.consecutiveFailures;
  w.requestAnimationFrame=()=>0;for(let n=0;n<20;n++)w.providerFrame(w.performance.now()+250*n);assert.equal(JSON.stringify(runtime.state),before,'the paused failure screen cannot advance simulation time');
  w.providerRender();assert.equal(JSON.stringify(runtime.state),before,'rendering the explanation does not change state');
  const notice=w.document.querySelector('.provider-mission-failure');assert.match(notice.textContent,/failed result remains recorded/);
  const resume=notice.querySelector('[data-provider-action="resume"]');assert.equal(resume.textContent,'Resume operations');assert.equal(resume.disabled,false);resume.click();assert.equal(runtime.speed,1);assert.equal(JSON.stringify(runtime.state),before,'resume changes only the runtime clock control');
  for(let n=0;n<2;n++){const expected=SOC.dispatch(runtime.state,{type:'advance',minutes:1,expectedRevision:runtime.state.revision});w.providerTick();assert.deepEqual(runtime.state,expected);assert.equal(runtime.speed,1,'failed status must not pause every subsequent tick');}
  assert.equal(runtime.state.clock,242);assert.equal(runtime.state.providerCampaign.missionStatus,'failed');assert.equal(runtime.state.providerCampaign.mission.consecutiveFailures,failure);assert.equal(runtime.state.providerCampaign.mission.victoryProof,null);assert.deepEqual(SOC.restore(JSON.stringify(runtime.state)),runtime.state);
 }finally{dom.window.close();}
});

test('AC-SOC-830 runtime stop guards refuse winning, defaulted, customerless failed, hidden and unowned clocks',()=>{
 // Isolated runtime boundary models: these are not earned gameplay fixtures.
 const {dom,w}=boot();try{
  w.providerRender=()=>{};const r=w.__SCP;
  for(const [status,solvency,customers,locked,hidden] of [
   ['won','current',[{status:'active'}],true,false],['operating','default',[{status:'active'}],true,false],['failed','default',[{status:'active'}],true,false],['failed','current',[{status:'exited'}],true,false],['failed','current',[],true,false],['failed','current',[{status:'active'}],false,false],['failed','current',[{status:'active'}],true,true]
  ]){
   r.state={revision:0,providerCampaign:{status,customers},business:{solvency:{status:solvency}}};r.locked=locked;r.speed=0;r.busy=false;Object.defineProperty(w.document,'hidden',{configurable:true,value:hidden});
   const before=JSON.stringify(r.state);w.providerSpeed(8);assert.equal(r.speed,0,JSON.stringify({status,solvency,customers,locked,hidden}));
   if(!hidden)w.providerTick();assert.equal(r.busy,false);assert.equal(JSON.stringify(r.state),before,'refused clock does not mutate the state');
  }
 }finally{dom.window.close();}
});

test('AC-SOC-831 mission failure panel explains default and missing customers with pure translated actions',()=>{
 const {dom,w}=boot();try{
  const base=SOC.provider.inspect(SOC.create({experience:'campaign'}));
  for(const [solvency,customers,reason,action] of [
   ['default',[{id:'c',status:'active'}],/business is in default/,'finance'],['current',[],/No live customer remains/,'deals']
  ]){
   const model={...base,mission:{...base.mission,status:'failed'},solvency:{status:solvency},customers,locked:true},before=JSON.stringify(model),holder=w.document.createElement('div');holder.innerHTML=w.SOCProviderPanels.rail(model,{drawer:'goals'});const notice=holder.querySelector('.provider-mission-failure');assert.match(notice.textContent,reason);assert.equal(notice.querySelector('[data-provider-action="resume"]'),null);assert.ok(notice.querySelector(`[data-provider-action="drawer"][data-provider-value="${action}"]`));assert.equal(JSON.stringify(model),before);
  }
  w.tr=key=>'translated:'+key;const model={...base,mission:{...base.mission,status:'failed'},customers:[{id:'c',status:'active'}],locked:false},holder=w.document.createElement('div');holder.innerHTML=w.SOCProviderPanels.rail(model,{drawer:'goals'});const notice=holder.querySelector('.provider-mission-failure');assert.match(notice.textContent,/translated:provider.panels.mission_failed_explanation/);assert.equal(notice.querySelector('[data-provider-action="resume"]').disabled,true);
 }finally{dom.window.close();}
});

test('PLAY-004-A03 Provider decision modal and hidden visibility event pause without catch-up',async()=>{
 const {dom,w}=boot();try{
  w.requestAnimationFrame=()=>0;w.Worker=undefined;const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();
  await w.providerNew({providerName:'Pause Boundary MSP',scenario:'smb'});const runtime=w.__SCP;assert.equal(runtime.state.clock,0);
  w.providerSpeed(4);assert.equal(runtime.speed,4);w.providerDecision(true);assert.equal(runtime.decision,true);assert.equal(runtime.speed,0,'opening a decision modal pauses the active campaign');
  const beforeModal=JSON.stringify(runtime.state);for(let n=0;n<8;n++)w.providerFrame(w.performance.now()+250*n);assert.equal(JSON.stringify(runtime.state),beforeModal,'modal time does not advance simulation state');
  w.providerDecision(false);assert.equal(runtime.decision,false);assert.equal(runtime.speed,4,'closing the decision restores the prior selected speed');
  runtime.acc=1700;Object.defineProperty(w.document,'hidden',{configurable:true,value:true});w.document.dispatchEvent(new w.Event('visibilitychange'));
  assert.equal(runtime.speed,0,'the visibilitychange event pauses a running campaign');assert.equal(runtime.acc,0,'partial elapsed-frame time is discarded');
  const hiddenState=JSON.stringify(runtime.state);for(let n=1;n<=80;n++)w.providerFrame(w.performance.now()+250*n);assert.equal(JSON.stringify(runtime.state),hiddenState,'the hidden period produces no background simulation ticks');
  Object.defineProperty(w.document,'hidden',{configurable:true,value:false});w.document.dispatchEvent(new w.Event('visibilitychange'));for(let n=81;n<=120;n++)w.providerFrame(w.performance.now()+250*n);
  assert.equal(runtime.speed,0,'returning to the foreground does not silently resume');assert.equal(JSON.stringify(runtime.state),hiddenState,'foreground return does not catch up elapsed hidden time');
 }finally{w.providerRelease();dom.window.close();}
});

test('PLAY-004-A03 an earned Provider mission victory leaves no runnable campaign clock',()=>{
 const customerId='starter-customer';let state=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',difficulty:'normal'});
 const send=command=>{state=SOC.dispatch(state,{type:'provider',command});};
 const buy=command=>{const quote=SOC.provider.quote(state,command);assert.deepEqual(quote.blockers,[],JSON.stringify({clock:state.clock,command,blockers:quote.blockers}));send({...command,quoteRevision:quote.atRevision});};
 const minute=()=>{state=SOC.dispatch(state,{type:'advance',minutes:1});};
 for(const stage of ['base','carrier','partner']){buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});while(state.providerCampaign.customers[0].stages[stage].status!=='effective')minute();}
 while(!state.providerCampaign.incidents.some(i=>i.status==='active'))minute();
 const incident=state.providerCampaign.incidents.find(i=>i.status==='active');send({action:'acknowledge-incident',incidentId:incident.id});buy({action:'operation',operationId:'repair',customerId});
 while(state.clock<180){if(state.providerCampaign.customers.some(c=>c.status==='renewal'))for(const c of state.providerCampaign.customers.filter(c=>c.status==='renewal'))send({action:'renew',customerId:c.id});minute();}
 assert.ok(state.providerCampaign.periodHistory.slice(-2).every(p=>p.qualified),'the mission win follows two measured qualifying periods');
 buy({action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});assert.equal(state.providerCampaign.missionStatus,'won');assert.equal(state.providerCampaign.status,'won');assert.ok(state.providerCampaign.events.some(e=>e.code==='MISSION_WON'));assert.deepEqual(SOC.restore(JSON.stringify(state)),state);
 const {dom,w}=boot();try{w.providerHome();const runtime=w.__SCP;runtime.state=SOC.restore(JSON.stringify(state));runtime.atHome=false;runtime.locked=true;runtime.speed=0;w.providerRender();w.providerSpeed(8);assert.equal(runtime.speed,0,'a terminal victory cannot start the clock');const before=JSON.stringify(runtime.state);w.providerTick();assert.equal(runtime.busy,false);assert.equal(JSON.stringify(runtime.state),before,'terminal victory cannot advance or be rewritten by the runtime');}finally{dom.window.close();}
});
