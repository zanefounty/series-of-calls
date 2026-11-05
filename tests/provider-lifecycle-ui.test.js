const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../src/game/93-ui/79-provider-lifecycle.js'),'utf8');
function ui(){const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),w=dom.window,markers=[];w.N_=key=>{markers.push(key);return key;};w.tr=key=>key;w.eval(source);return {dom,w,markers};}

test('AC-PROVIDER-LIFECYCLE-UI-001 offers retirement only for completed product projects and scopes the action to its project',()=>{
 const {dom,w}=ui(),host=w.document.createElement('div');
 const pending=w.SOCProviderLifecycle.actions({id:'project-pending',customerId:'starter-customer',kind:'operation',productId:'ms-workplace-phone',status:'commissioning'});
 const stage=w.SOCProviderLifecycle.actions({id:'project-stage',customerId:'starter-customer',kind:'stage',productId:null,status:'complete'});
 const complete=w.SOCProviderLifecycle.actions({id:'project-product',customerId:'starter-customer',kind:'operation',productId:'ms-workplace-phone',status:'complete'});
 host.innerHTML=pending+stage+complete;
 const button=host.querySelector('[data-provider-action="retire-project"]');assert.ok(button);assert.equal(button.dataset.id,'project-product');assert.match(button.textContent,/Review retirement terms/);assert.equal(host.querySelectorAll('[data-provider-action="retire-project"]').length,1);
 dom.window.close();
});

test('AC-PROVIDER-LIFECYCLE-UI-002 scheduled retirement shows effective and commitment dates with a scoped paid recommission action',()=>{
 const {dom,w}=ui(),host=w.document.createElement('div');host.innerHTML=w.SOCProviderLifecycle.actions({id:'project-product',customerId:'orchard-customer',kind:'operation',productId:'cisco-meetings',status:'complete',retirement:{effectiveAt:81,commitmentEndsAt:240}});
 const section=host.querySelector('.provider-product-retirement'),button=section.querySelector('[data-provider-action="operation"]');assert.match(section.textContent,/Product retirement/);assert.match(section.textContent,/Effective at minute\s*81/);assert.match(section.textContent,/Supplier commitment ends at minute\s*240/);
 assert.equal(button.dataset.operation,'cisco-meetings');assert.equal(button.dataset.id,'orchard-customer');assert.match(button.textContent,/Review paid recommissioning/);assert.equal(section.querySelector('[data-provider-action="retire-project"]'),null);
 dom.window.close();
});

test('AC-PROVIDER-LIFECYCLE-UI-003 retirement quote explains retained costs, affected work, dependencies and preserves confirmation blockers',()=>{
 const {dom,w,markers}=ui(),host=w.document.createElement('div'),q={action:'retire-project',request:{action:'retire-project',projectId:'project-product'},commercial:{retainedSetupCents:123456,effectiveAt:81,commitmentEndsAt:240,remainingMinimumSupplierCents:50000,recurringAfterTermCents:0,resources:['phone','carrier'],affectedWork:[{id:'interaction-4',kind:'voice',caseId:'case-5'},{id:'meeting-2',kind:'meeting'},{id:'processing-1',kind:'processing'}]},blockers:[]};
 host.innerHTML=w.SOCProviderLifecycle.quote(q);
 for(const phrase of ['Retire service','A$1,234.56','not refunded','Effective at minute 81','Supplier commitment ends at minute 240','A$500.00','Recurring cost after the minimum term','A$0.00','Affected active work','voice call · interaction-4 · case case-5','meeting · meeting-2','processing job · processing-1','Calling platform','Carrier connection','may fail','not deleted','separate paid order'])assert.ok(host.textContent.includes(phrase),`quote includes ${phrase}`);
 assert.equal(host.querySelector('[data-provider-action="confirm-quote"]').disabled,false);assert.ok(host.querySelector('[data-provider-action="cancel-quote"]'));
 q.blockers=['PRODUCT_RETIREMENT_UNAVAILABLE'];host.innerHTML=w.SOCProviderLifecycle.quote(q);assert.equal(host.querySelector('[data-provider-action="confirm-quote"]').disabled,true);assert.match(host.textContent,/Resolve the retirement quote blockers/);
 const markersUsed=Object.values(w.SOCProviderLifecycle.keys);assert.ok(markersUsed.length>=35);assert.ok(markersUsed.every(x=>markers.includes(x)));assert.ok(Object.keys(w.SOCProviderLifecycle.labelFallbacks).every(x=>x.startsWith('provider.lifecycle.')));
 const forged={...q,blockers:[],commercial:{...q.commercial,affectedWork:[{id:'<img src=x onerror=alert(1)>',kind:'voice',caseId:'<svg onload=alert(1)>'}],resources:['<script>alert(1)</script>']}};
 host.innerHTML=w.SOCProviderLifecycle.quote(forged);assert.equal(host.querySelector('img,svg,script'),null);assert.ok(host.textContent.includes('<img src=x onerror=alert(1)>'));
 dom.window.close();
});
