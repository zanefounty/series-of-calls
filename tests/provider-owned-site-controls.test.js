'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
test('visible owned-site response buttons preserve their selected response and funded project through the real shell',()=>{
 const dom=new JSDOM('<div id="app"></div>',{runScripts:'outside-only'}),w=dom.window,sent=[];
 w.SOCProviderHud={render:()=>'',esc:String,money:String};
 w.SOCProviderCanvas={render:()=>''};
 w.eval(fs.readFileSync(path.join(__dirname,'../src/game/93-ui/79-provider-owned-sites.js'),'utf8'));
 const customer={id:'starter-customer',ownedSiteActions:[{id:'site-recovery',request:{config:{kind:'power',targetSite:'provider-owned-head'}},available:true,quote:{setupCents:16000,periodCents:1000,workMinutes:6,engineers:1,support:1,blockers:[]}}],siteResponses:[]};
 w.SOCProviderPanels={rail:()=>'',launch:()=>'',inspector:()=>w.SOCProviderOwnedSitesUI.render(customer)};
 w.eval(fs.readFileSync(path.join(__dirname,'../src/game/97-provider-shell.js'),'utf8'));
 w.SOC_PROVIDER_UI.mount(w.document.getElementById('app'),{command:c=>{sent.push(c);return {ok:true};}});
 for(const [n,response] of ['recover','restore','abort','retry-migration'].entries()){
  customer.siteResponses=[{projectId:'provider-project-7',phase:response==='retry-migration'?'partial':'faulted',[response]:true}];
  w.SOC_PROVIDER_UI.render({revision:31+n},{customers:[customer]},{selection:{customerId:customer.id},inspectorOpen:true});
  const control=w.document.querySelector('[data-provider-action="site-response"]');assert.ok(control);assert.ok(control.textContent.trim());control.click();
  assert.deepEqual(JSON.parse(JSON.stringify(sent.at(-1))),{type:'provider',command:{action:'site-response',projectId:'provider-project-7',response,quoteRevision:31+n}});
 }
 dom.window.close();
});
