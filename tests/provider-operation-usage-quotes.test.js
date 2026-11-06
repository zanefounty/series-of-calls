"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications'),rules=require('../src/game/24-provider-rules'),campaign=require('../src/game/25-provider-campaign');
const products=require('../src/game/23-provider-products'),demand=require('../src/game/22-provider-demand'),variants=require('../src/game/23-provider-variants');
const regionalSupport=require('../src/game/23-provider-regional-support'),workforceHistory=require('../src/game/23-provider-workforce-history');

function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify(q.blockers));return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
function tick(s){return SOC.dispatch(s,{type:'advance',minutes:1});}
function until(s,predicate,limit=180){const end=s.clock+limit;while(!predicate(s)){assert.ok(s.clock<end,'public fixture did not reach its expected condition');s=tick(s);}return s;}
function stages(s,planId,offerId='starter'){
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId,planId,stage,...(stage==='base'?{}:{customerId:offerId+'-customer'})});
 return until(s,s=>s.providerCampaign.customers.find(c=>c.id===offerId+'-customer')?.status==='active');
}
function opening(planId,difficulty='easy'){return stages(SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty}),planId);}
const operation=(customerId='starter-customer',operationId='recording')=>({action:'operation',operationId,customerId});
const rates=plan=>({voiceCentsPerMinute:plan.voiceCents,messageCentsPerDelivery:plan.messageCents});
function render(q){
 const dom=new JSDOM('<main></main>',{runScripts:'dangerously'}),w=dom.window;w.N_=x=>x;
 for(const file of ['70-provider-hud.js','75-provider-panels.js'])w.eval(fs.readFileSync(path.join(__dirname,'../src/game/93-ui',file),'utf8'));
 const before=JSON.stringify(q);w.document.querySelector('main').innerHTML=w.SOCProviderPanels.quote(q,{});assert.equal(JSON.stringify(q),before);return dom;
}

for(const [planId,acceptanceId] of [['swift','AC-SOC-640'],['steady','AC-SOC-641']])test(`${acceptanceId} ${planId} paid operation quotes disclose the existing usage rates without changing purchase terms or billing`,()=>{
 const initial=SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty:'easy'}),plan=rules.data.plans[planId];
 const purchase=SOC.provider.quote(initial,{action:'purchase',offerId:'starter',planId,stage:'base'});
 assert.deepEqual(purchase.forecast.variableUsage,rates(plan));assert.deepEqual(purchase.commercial.variablePrices,rates(plan));
 assert.equal(purchase.commercial.fullPlanSetupCents,['base','carrier','partner'].reduce((n,k)=>n+plan[k].setupCents,0));
 assert.equal(purchase.commercial.stages.length,3);
 let s=opening(planId);const before=JSON.stringify(s),q=SOC.provider.quote(s,operation());
 assert.deepEqual(q.blockers,[]);assert.deepEqual(q.forecast.variableUsage,rates(plan));assert.deepEqual(q.commercial.variablePrices,rates(plan));
 assert.equal(q.commercial.fullPlanSetupCents,q.setupCents,'operation remains one priced operation, not a new full plan');
 assert.equal(q.commercial.fullPlanFixedCentsPerPeriod,q.periodCents);assert.equal(q.commercial.stages,undefined);assert.equal(q.commercial.capacity,undefined);
 assert.deepEqual(SOC.provider.quote(s,operation()),q);assert.equal(JSON.stringify(s),before,'quoting does not advance, spend, or alter customer configuration');
 const dom=render(q);try{assert.match(dom.window.document.body.textContent,/A\$0\.50\/voice min/);assert.match(dom.window.document.body.textContent,/A\$0\.75\/message/);assert.doesNotMatch(dom.window.document.body.textContent,/Not quoted/);assert.equal(dom.window.document.querySelector('[data-provider-action="confirm-quote"]').disabled,false);}finally{dom.window.close();}
 s=until(s,s=>s.business.ledger.some(p=>p.reason==='provider-voice-usage')&&s.business.ledger.some(p=>p.reason==='provider-message-usage'));
 for(const posting of s.business.ledger.filter(p=>['provider-voice-usage','provider-message-usage'].includes(p.reason))){
  assert.equal(posting.customerId,'starter-customer');assert.ok(posting.quantity>0);assert.equal(posting.cents,posting.quantity*(posting.reason==='provider-voice-usage'?plan.voiceCents:plan.messageCents),'disclosed customer-plan unit rate times actual settled units equals the existing usage charge');
 }
});

test('AC-SOC-642 an unaffordable paid operation still discloses rates and keeps an atomic refusal',()=>{
 let s=opening('steady','hard');s=buy(s,operation('starter-customer','cisco-dedicated-uc'));
 assert.equal(s.business.balance.cash,90000);const request=operation('starter-customer','ms-workplace-calling'),before=JSON.stringify(s),q=SOC.provider.quote(s,request);
 assert.ok(q.blockers.includes('INSUFFICIENT_CASH'));assert.deepEqual(q.forecast.variableUsage,rates(rules.data.plans.steady));assert.deepEqual(q.commercial.variablePrices,q.forecast.variableUsage);
 assert.throws(()=>SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}}),/PROVIDER_QUOTE_BLOCKED:.*INSUFFICIENT_CASH/);assert.equal(JSON.stringify(s),before);
 const dom=render(q);try{assert.match(dom.window.document.body.textContent,/A\$0\.50\/voice min/);assert.match(dom.window.document.body.textContent,/A\$0\.75\/message/);assert.doesNotMatch(dom.window.document.body.textContent,/Not quoted/);assert.equal(dom.window.document.querySelector('[data-provider-action="confirm-quote"]').disabled,true);}finally{dom.window.close();}
});

test('AC-SOC-643 operation quote selection is customer-scoped under explicitly distinct authored unit-rate fixtures',()=>{
 let s=opening('swift');s=until(s,s=>s.providerCampaign.incidents.some(i=>i.status==='active'));
 const incident=s.providerCampaign.incidents.find(i=>i.status==='active');s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=buy(s,operation('starter-customer','repair'));
 s=until(s,s=>s.providerCampaign.mission.nextOpportunityAvailable);s=stages(s,'steady','next-1');assert.deepEqual(s.providerCampaign.customers.map(c=>c.planId),['swift','steady']);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 // Published Swift/Steady both use 50/75. Distinct rates below are an isolated
 // pure-kernel content fixture to expose accidental reuse of the first plan;
 // they are never dispatched, imported, or presented as real campaign balance.
 const authored=structuredClone(rules.data);authored.plans.steady.voiceCents=125;authored.plans.steady.messageCents=225;
 const kernel=vm.runInNewContext(campaign.source()+';SOC_PROVIDER_CAMPAIGN',{SOC_PROVIDER_RULES:{...rules,data:authored},SOC_PROVIDER_PRODUCTS:products,SOC_PROVIDER_DEMAND:demand,SOC_PROVIDER_VARIANTS:variants,SOC_PROVIDER_REGIONAL_SUPPORT:regionalSupport,SOC_PROVIDER_WORKFORCE_HISTORY:workforceHistory});
 const before=JSON.stringify(s),first=kernel.quote(s,operation()),second=kernel.quote(s,operation('next-1-customer'));
 assert.deepEqual(JSON.parse(JSON.stringify(first.forecast.variableUsage)),rates(authored.plans.swift));assert.deepEqual(JSON.parse(JSON.stringify(second.forecast.variableUsage)),rates(authored.plans.steady));
 assert.notDeepEqual(second.forecast.variableUsage,first.forecast.variableUsage);assert.equal(JSON.stringify(s),before);
 assert.equal(kernel.quote(s,operation('missing-customer')).commercial.variablePrices,null,'an unknown customer cannot borrow the first customer\'s rate');
 const dom=render(second);try{assert.match(dom.window.document.body.textContent,/A\$1\.25\/voice min/);assert.match(dom.window.document.body.textContent,/A\$2\.25\/message/);}finally{dom.window.close();}
});
