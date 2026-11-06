const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications.js');
const customerId='starter-customer';
function opening(){let s=SOC.create({experience:'campaign',seed:73,difficulty:'easy'});for(const stage of ['base','carrier','partner']){const r={action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})},q=SOC.provider.quote(s,r);s=SOC.dispatch(s,{type:'provider',command:{...r,quoteRevision:q.atRevision}});}return SOC.dispatch(s,{type:'advance',minutes:12});}
test('AC-SOC-849 paid scale map inspector quotes and commits a purchase, starts once through dispatch, and renders a real failed observation without mutation',()=>{
 const dom=new JSDOM('<!doctype html><body><main></main></body>',{runScripts:'dangerously',pretendToBeVisual:true}),w=dom.window;w.N_=x=>x;
 for(const file of ['93-ui/10-dom.js','23-provider-variants.js','93-ui/65-service-preferences.js','93-ui/70-provider-hud.js','93-ui/75-provider-panels.js','93-ui/79-provider-context-actions.js','93-ui/79-provider-scale.js','96-map/90-service-scene.js','96-map/95-provider-canvas.js','97-provider-shell.js'])w.eval(fs.readFileSync(path.join(__dirname,'../src/game',file),'utf8'));
 let s=opening();const calls=[];const render=()=>w.SOC_PROVIDER_UI.render(s,SOC.provider.inspect(s));
 w.SOC_PROVIDER_UI.mount(w.document.querySelector('main'),{quote:r=>SOC.provider.quote(s,JSON.parse(JSON.stringify(r))),command:command=>{command=JSON.parse(JSON.stringify(command));calls.push(command);s=SOC.dispatch(s,command);return {ok:true};},decision:()=>{}});render();
 const click=selector=>{const button=w.document.querySelector(selector);assert.ok(button,selector);button.click();};
 click('[data-provider-action="select-customer"]');
 const before=JSON.stringify(s);click('.provider-scale [data-operation="paid-scale-baseline"]');assert.equal(JSON.stringify(s),before);assert.equal(calls.length,0);
 click('[data-provider-action="confirm-quote"]');assert.equal(calls[0].command.action,'operation');assert.equal(calls[0].command.operationId,'paid-scale-baseline');
 s=SOC.dispatch(s,{type:'advance',minutes:3});render();const paid=s.providerCampaign.projects.at(-1);assert.equal(paid.status,'complete');
 click('.provider-scale [data-provider-action="start-scale-window"]');assert.equal(calls.at(-1).command.projectId,paid.id);assert.equal(s.providerCampaign.scaleObservation.runs.length,1);
 for(let n=0;n<10;n++)s=SOC.dispatch(s,{type:'advance',minutes:1});render();assert.match(w.document.querySelector('.provider-scale').textContent,/Measured workload target missed/);assert.equal(w.document.querySelector('.provider-scale [data-provider-action="start-scale-window"]'),null);
 const original=JSON.stringify(s),m=SOC.provider.inspect(s),modelBytes=JSON.stringify(m);for(let n=0;n<3;n++)w.SOCProviderScaleUI.render(m,customerId);assert.equal(JSON.stringify(s),original);assert.equal(JSON.stringify(m),modelBytes);
 for(const lang of ['en','de','es','fr','it','pt']){w.eval(fs.readFileSync(path.join(__dirname,'..',lang==='en'?'src/i18n/en.js':`site/i18n/${lang}.js`),'utf8'));for(const label of Object.keys(w.SOCProviderScaleUI.labelFallbacks))assert.ok(w.I18N[lang][label],lang+':'+label);}
 w.close();
});
