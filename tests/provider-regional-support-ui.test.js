const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(require.resolve('../src/game/93-ui/80-provider-regional-support.js'),'utf8');
const SUPPORT=require('../src/game/23-provider-regional-support.js');
function ui(t){const dom=new JSDOM('<!doctype html><body></body>',{runScripts:'dangerously'});t.after(()=>dom.window.close());dom.window.eval(source);return {api:dom.window.SOCProviderRegionalSupport,w:dom.window,host:dom.window.document.body};}
function model(){const customerId='customer-two',market='jp-tokyo',personId='support-jp-tokyo-01';return {version:1,customerId,market,asOf:1250,person:{...SUPPORT.PEOPLE[personId],name:'Ren Sato'},current:{eligible:false,missing:['NAMED_SUPPORT_OUT_OF_SHIFT'],capacity:{used:2,limit:2}},offers:['business-hours','extended'].map(coverageId=>{const request={customerId,market,personId,coverageId};return {request,eligible:coverageId==='extended',missing:coverageId==='extended'?[]:['CUSTOMER_ALREADY_HAS_NAMED_SUPPORT_COVERAGE'],terms:SUPPORT.operationPlan(request),supportReplacesProjectId:coverageId==='extended'?'old-project':null};})};}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
test('regional comparison explains costed named staff and emits only scoped quote controls',t=>{
 const {api,host}=ui(t),m=freeze(model()),before=JSON.stringify(m);const html=api.render(m);host.innerHTML=html;assert.equal(api.render(m),html);assert.equal(JSON.stringify(m),before);
 assert.match(host.textContent,/Ren Sato/);assert.match(host.textContent,/do not add customer agents, BPO staff or calling licences/);assert.match(host.textContent,/outside their paid coverage hours/);assert.match(host.textContent,/2 \/ 2/);
 const cards=[...host.querySelectorAll('.provider-support-offer')];assert.equal(cards.length,2);assert.match(cards[0].textContent,/A\$90.00/);assert.match(cards[0].textContent,/A\$80.00/);assert.match(cards[0].textContent,/4 minutes/);assert.match(cards[1].textContent,/A\$180.00/);assert.match(cards[1].textContent,/A\$160.00/);assert.match(cards[1].textContent,/6 minutes/);assert.match(cards[1].textContent,/minimum supplier charges remain due/);
 const buttons=[...host.querySelectorAll('button')];assert.equal(buttons[0].disabled,true);assert.equal(buttons[1].disabled,false);for(const b of buttons){assert.equal(b.dataset.customer,'customer-two');assert.equal(b.dataset.market,'jp-tokyo');assert.equal(b.dataset.person,'support-jp-tokyo-01');assert.equal(b.dataset.providerAction,'quote-regional-support');}
});
test('current coverage failure and retained historical qualification remain visibly separate',t=>{
 const {api,host}=ui(t),m=model();m.current.missing=['NAMED_SUPPORT_EXCEEDS_PAID_SHARED_SUPPORT_SLOTS'];m.retainedClaims=[{sourceId:'progress.goal.c3',receiptId:'receipt-3'}];host.innerHTML=api.render(m);assert.match(host.textContent,/Coverage unavailable/);assert.match(host.textContent,/Increase paid Provider support staffing/);assert.match(host.textContent,/Earned evidence retained; current readiness is assessed separately/);assert.match(host.textContent,/receipt-3/);assert.doesNotMatch(host.textContent,/Covered now/);
});
test('cross-scope descriptors are disabled and all evidence text is escaped',t=>{
 const {api,host}=ui(t),m=model();m.offers[1].request.customerId='another-customer';m.person.name='<img src=x onerror=bad()>';m.current.missing=['<script>bad</script>'];host.innerHTML=api.render(m);assert.equal(host.querySelectorAll('button:enabled').length,0);assert.equal(host.querySelector('script,img'),null);assert.match(host.textContent,/eligibility check prevents this order/);assert.equal(api.render(null),'');assert.equal(api.render({...m,version:99}),'');
});
test('all regional text has static translation keys and renderer accepts supplied translations',t=>{
 const {api,host,w}=ui(t);for(const [key,label] of Object.entries(api.labelFallbacks)){assert.ok(source.includes("N_('"+key+"')"),key);assert.ok(label.length);}
 w.tr=key=>key===api.keys.title?'Translated support':key;host.innerHTML=api.render(model());assert.match(host.textContent,/Translated support/);
});
