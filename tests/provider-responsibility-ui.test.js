const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications.js');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility.js');
const source=fs.readFileSync(path.join(__dirname,'../src/game/93-ui/79-provider-responsibility.js'),'utf8');
function ui(){const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),w=dom.window;w.N_=x=>x;w.tr=x=>x;w.eval(source);return {dom,w};}
function paidBase(){let s=SOC.create({experience:'campaign'});const request={action:'purchase',offerId:'starter',planId:'swift',stage:'base'},q=SOC.provider.quote(s,request);s=SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});return s;}
function quoteModel(s){const rows=['room','partner-qualification','distributor-room'].map(id=>({id,quote:SOC.provider.quote(s,{action:'operation',operationId:id,customerId:'starter-customer'})}));return RESPONSIBILITY.comparison(rows,3);}

test('no opted-in responsibility model renders no extra inspector',()=>{
 const {dom,w}=ui();assert.equal(w.SOCProviderResponsibilityUI.render(null,'starter-customer'),'');dom.window.close();
});

test('blocked qualification shows readable reasons and actual quote totals with scoped action targets',()=>{
 const {dom,w}=ui(),state=paidBase(),comparison=quoteModel(state),before=JSON.stringify(state),model={
  qualification:{status:'incomplete',missing:['QUALIFICATION_PROJECT_NOT_COMPLETE']},
  readiness:{status:'incomplete',missing:['NAMED_PARTNER_ROLE_UNAVAILABLE','RECENT_FULL_QUALIFIED_SETTLEMENT_REQUIRED']},
  records:[],comparison
 },host=w.document.createElement('div');host.innerHTML=w.SOCProviderResponsibilityUI.render(model,'starter-customer');
 assert.equal(JSON.stringify(state),before,'rendering and quote comparison are read-only');
 assert.ok(host.querySelector('.provider-responsibility-inspector'));assert.equal(host.querySelector('.provider-responsibility-inspector').open,false);assert.equal(host.querySelector('.provider-responsibility-comparison').open,false);
 assert.match(host.textContent,/Incomplete/);assert.match(host.textContent,/Named issuer or holder roles are unavailable/);assert.match(host.textContent,/A recent full qualified settlement is required/);
 assert.match(host.textContent,/A\$750\.00/);assert.match(host.textContent,/A\$90\.00/);assert.match(host.textContent,/A\$1,020\.00/);assert.match(host.textContent,/A\$650\.00/);assert.match(host.textContent,/A\$130\.00/);assert.match(host.textContent,/A\$1,040\.00/);
 assert.match(host.textContent,/Qualification prerequisite/);assert.match(host.textContent,/Included in the distributor total above/);assert.match(host.textContent,/14 simulation minutes/);assert.match(host.textContent,/Engineer-minutes across stages\s*14/);assert.match(host.textContent,/Support-minutes across stages\s*6/);
 assert.equal(host.querySelector('[data-provider-action="operation"][data-operation="partner-qualification"]'),null);
 assert.deepEqual([...host.querySelectorAll('[data-provider-action="operation"]')].map(x=>[x.dataset.operation,x.dataset.id]),[['room','starter-customer'],['distributor-room','starter-customer']]);
 dom.window.close();
});

test('ready expired certificate offers scoped requalification and lists only this customer evidence',()=>{
 const {dom,w}=ui(),state=paidBase(),comparison=quoteModel(state),model={qualification:{status:'expired',missing:[],certificate:{issuerOrganizationId:'branch-distribution',holderOrganizationId:'orchard-msp',scopes:['distributor-room','recording'],expiresAt:180}},readiness:{status:'ready',missing:[],evidence:{customerId:'starter-customer',period:1,globalSettlementAt:120,revenuePostingId:'entry-12',costPostingIds:['entry-13']}},comparison,records:[{role:'msp',organisationId:'orchard-msp',customerId:'starter-customer',projectId:'provider-project-1',postingId:'entry-1',acceptedAt:0,effectiveAt:20,scope:['voice'],evidence:{sharedWorkforce:{personMinutes:60,billedMinutes:60},stageProjects:[{id:'base'}]}},{role:'bpo',organisationId:'people-orchard',customerId:'other-customer',projectId:'unrelated-project',postingId:'unrelated-posting',scope:['people']}]},host=w.document.createElement('div');
 host.innerHTML=w.SOCProviderResponsibilityUI.render(model,'starter-customer');
 const action=host.querySelector('[data-provider-action="operation"][data-operation="partner-qualification"]');assert.ok(action);assert.equal(action.dataset.id,'starter-customer');assert.match(action.textContent,/Review requalification quote/);
 assert.match(host.textContent,/Branch Distribution/);assert.match(host.textContent,/Orchard MSP/);assert.match(host.textContent,/Minute 180/);assert.match(host.textContent,/Distributor room/);assert.match(host.textContent,/Recording/);
 const records=host.querySelector('.provider-responsibility-history');assert.match(records.textContent,/Managed service provider/);assert.match(records.textContent,/provider-project-1/);assert.match(records.textContent,/60/);assert.doesNotMatch(records.textContent,/unrelated-project|unrelated-posting/);
 assert.deepEqual([...host.querySelectorAll('[data-provider-action="operation"]')].map(x=>x.dataset.operation),['partner-qualification','room','distributor-room']);
 dom.window.close();
});

test('active certificate suppresses qualification spending and static labels use provider.responsibility keys',()=>{
 const {dom,w}=ui(),markers=[],iframe=w.document.createElement('iframe');w.document.body.append(iframe);iframe.contentWindow.N_=key=>{markers.push(key);return key;};iframe.contentWindow.eval(source);
 const values=Object.values(iframe.contentWindow.SOCProviderResponsibilityUI.keys);assert.ok(markers.length>=40);assert.ok(values.every(key=>key.startsWith('provider.responsibility.')));assert.ok(values.every(key=>markers.includes(key)));
 const html=w.SOCProviderResponsibilityUI.render({qualification:{status:'active',missing:[],certificate:{issuerOrganizationId:'branch-distribution',holderOrganizationId:'orchard-msp',scopes:['recording'],expiresAt:300}},readiness:{status:'ready',missing:[]},records:[],comparison:{}},'starter-customer');
 const host=w.document.createElement('div');host.innerHTML=html;assert.equal(host.querySelector('[data-operation="partner-qualification"]'),null);assert.equal(host.querySelectorAll('.provider-responsibility-quote').length,2);dom.window.close();
});
