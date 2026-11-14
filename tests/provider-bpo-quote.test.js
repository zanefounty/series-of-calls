'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom'),SOC=require('../src/game/55-communications');

test('BPO purchase quotes the two commissioned agents beside the cost and retains the carrier limit',()=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 const buy=request=>{const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);s=SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});};
 for(const stage of ['base','carrier','partner'])buy({action:'purchase',offerId:'starter',planId:'steady',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
 while(s.providerCampaign.customers[0].status!=='active')s=SOC.dispatch(s,{type:'advance',minutes:1});
 const request={action:'operation',operationId:'bpo',customerId:'starter-customer'},before=JSON.stringify(s),q=SOC.provider.quote(s,request);
 assert.equal(JSON.stringify(s),before);assert.deepEqual(q.blockers,[]);assert.equal(q.setupCents,30000);assert.equal(q.periodCents,18000);
 assert.deepEqual(q.commercial.bpoCover,{additionalAgents:2,carrierSessionsAdded:0,availableAfter:'commissioning'});
 const dom=new JSDOM('<!doctype html>',{runScripts:'dangerously'}),w=dom.window;w.N_=x=>x;w.eval(fs.readFileSync(path.join(__dirname,'../src/i18n/en.js'),'utf8'));w.tr=(key,vars)=>String(w.I18N.en[key]||key).replace(/\{(\w+)\}/g,(_,name)=>vars?.[name]??_);w.SOCProviderCanvas={resourceStatus:()=> 'Ready'};w.eval(fs.readFileSync(path.join(__dirname,'../src/game/93-ui/70-provider-hud.js'),'utf8'));w.eval(fs.readFileSync(path.join(__dirname,'../src/game/93-ui/75-provider-panels.js'),'utf8'));
 const html=w.SOCProviderPanels.quote(q,{quoteRequest:request}),host=w.document.createElement('main');host.innerHTML=html;const text=host.querySelector('.provider-bpo-quote')?.textContent||'';
 assert.match(text,/A\$300/);assert.match(text,/A\$180/);assert.match(text,/2 available BPO agents/);assert.match(text,/0 carrier sessions/);dom.window.close();
 s=SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});const capacity=s.portfolio.customers[0].root.resources.carrier.effective.capacity;
 for(let n=0;n<30&&s.providerCampaign.projects.find(p=>p.operationId==='bpo')?.status!=='complete';n++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 const child=s.portfolio.customers[0].root;assert.equal(s.providerCampaign.projects.find(p=>p.operationId==='bpo')?.status,'complete');assert.equal(child.workforceOps.providerCover.people.length,2);assert.equal(child.resources.carrier.effective.capacity,capacity);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
