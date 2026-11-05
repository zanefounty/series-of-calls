const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications');
const moduleSource=fs.readFileSync(path.join(__dirname,'../src/game/93-ui/79-provider-comparisons.js'),'utf8');

function ui(){const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),w=dom.window;w.N_=x=>x;w.tr=key=>key;w.eval(moduleSource);return {dom,w};}
function buyOpeningBase(state){const quote=SOC.provider.quote(state,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});return SOC.dispatch(state,{type:'provider',requestId:'provider-1',command:{action:'purchase',offerId:'starter',planId:'swift',stage:'base',quoteRevision:quote.atRevision}});}

test('comparison renderer uses real engine quotes and exposes the complete Swift and Steady tradeoff without changing state',()=>{
 const {dom,w}=ui(),state=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney'}),before=JSON.stringify(state),plans=SOC.provider.inspect(state).planComparisons;
 const html=w.SOCProviderComparisons.render(plans,{open:true}),host=w.document.createElement('div');host.innerHTML=html;
 assert.equal(JSON.stringify(state),before,'rendering and quoting leave the simulation root unchanged');assert.equal(host.querySelectorAll('.provider-comparison-option').length,2);assert.ok(host.querySelector('details[open]'));
 const text=host.textContent;for(const required of ['Setup commitment','Recurring cost / period','Complete plan setup','Complete supplier cost / period','Minimum supplier commitment','Minimum term','Variable usage rates','Forecast usage cost','Provider work required','Delivery lead time','Typed capacity','concurrent sessions','Expected consequences','Full delivery and staffing by stage','Base','Carrier','Partner'])assert.ok(text.includes(required),`comparison visibly includes ${required}`);
 assert.match(text,/A\$6,000\.00/);assert.match(text,/A\$10,000\.00/);assert.match(text,/A\$1,020\.00/);assert.match(text,/A\$720\.00/);assert.match(text,/A\$30\.00/);assert.match(text,/A\$450\.00/);
 assert.match(text,/Voice: A\$0\.50 \/ minute/);assert.match(text,/Messages: A\$0\.75 \/ delivery/);
 assert.deepEqual([...host.querySelectorAll('[data-provider-action="quote"]')].map(b=>[b.dataset.kind,b.dataset.offer,b.dataset.plan,b.dataset.stage]),[['purchase','starter','swift','base'],['purchase','starter','steady','base']]);
 assert.deepEqual([...host.querySelectorAll('.provider-comparison-option')].map(x=>x.querySelector('.provider-comparison-consequences').textContent.includes('Expected consequences')), [true,true]);dom.window.close();
});

test('operation alternatives route to the existing scoped operation quote action and show real blockers',()=>{
 const {dom,w}=ui();let state=buyOpeningBase(SOC.create({experience:'campaign',scenario:'smb'}));const quote=SOC.provider.quote(state,{action:'operation',operationId:'repair',customerId:'starter-customer'});assert.ok(quote.blockers.includes('NO_ACTIVE_INCIDENT'));
 const html=w.SOCProviderComparisons.render([{id:'repair',name:'Repair observed service',description:'Restore the affected customer dependency.',action:'operation',operationId:'repair',customerId:'starter-customer',quote,capacity:{sessions:{name:'Repair sessions',limit:4,unit:'concurrent sessions'}},consequences:['Requires an acknowledged, supported incident.']}]),host=w.document.createElement('div');host.innerHTML=html;
 const button=host.querySelector('[data-provider-action="operation"]');assert.equal(button.dataset.operation,'repair');assert.equal(button.dataset.id,'starter-customer');assert.match(host.textContent,/No active incident/i);assert.match(host.textContent,/Requires an acknowledged, supported incident/);assert.match(host.textContent,/A\$80\.00/);assert.match(host.textContent,/concurrent sessions/);
 assert.equal(state.providerCampaign.customers[0].status,'provisioning','the comparison does not advance delivery or mutate the customer');dom.window.close();
});

test('missing quote fields remain explicit and never render NaN as a cost or capacity',()=>{
 const {dom,w}=ui(),host=w.document.createElement('div');host.innerHTML=w.SOCProviderComparisons.render([{id:'unknown',name:'Unquoted alternative',action:'purchase',quote:{blockers:['INSUFFICIENT_CASH']}}],{offerId:'next-1',planId:'swift'});
 assert.match(host.textContent,/Not included in this quote/);assert.match(host.textContent,/Insufficient Cash/);assert.match(host.textContent,/No additional consequence details were supplied/);assert.doesNotMatch(host.textContent,/NaN|\$0\.00/);assert.equal(host.querySelector('[data-provider-action="quote"]').dataset.offer,'next-1');dom.window.close();
});

test('all comparison labels are registered through static provider.comparison N_ markers',()=>{
 const {dom,w}=ui(),iframe=w.document.createElement('iframe');w.document.body.append(iframe);const markers=[];iframe.contentWindow.N_=key=>{markers.push(key);return key;};iframe.contentWindow.eval(moduleSource);
 assert.ok(markers.length>=25);assert.ok(markers.every(key=>key.startsWith('provider.comparison.')));assert.ok(Object.values(iframe.contentWindow.SOCProviderComparisons.keys).every(key=>markers.includes(key)));iframe.remove();dom.window.close();
});
