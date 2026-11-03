const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');
const SOC=require('../src/game/55-communications.js');

function state(){
 const s=SOC.create();s.products={pack:'soc-products-1',version:1,deployments:[{id:'gov-profile',desired:{family:'microsoft:government-clouds',offer:'gov-offer',productVersion:'scenario-1',mode:'gcc-high',region:s.jurisdiction,features:['eligibility-evidence','regional-evidence'],dependencies:{'eligibility-evidence':'phone','jurisdiction-evidence':'access'},bindings:[]},effective:null,generation:1,provisioning:{status:'pending',due:1,generation:1,errors:[]}}]};
 s.productEvidence=SOC.productEvidence.create(s);return s;
}
function boot(){
 const {dom,ev,errors}=load(),w=dom.window,s=state();ev(`window.__commands=[];socApply=(command)=>window.__commands.push(JSON.parse(JSON.stringify(command)));`);
 const render=(locked=true,value=s,report=null)=>{w.__state=value;w.__locked=locked;w.__report=report;ev(`SCT.state=window.__state;SCT.locked=window.__locked;let m=document.getElementById('product-evidence-test-mount');if(!m){m=document.createElement('div');m.id='product-evidence-test-mount';document.body.appendChild(m);}const r=window.__report||{productEvidence:SOC.productEvidence.inspect(SCT.state)};m.innerHTML=socProductEvidencePanel(SCT.state,r);socBindProductEvidence();`);};
 const submit=selector=>{const f=w.document.querySelector(selector);assert.ok(f,selector);f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 return {dom,w,ev,errors,s,render,submit,commands:()=>JSON.parse(JSON.stringify(w.__commands))};
}

test('AC-SOC-296 evidence controls remain read only and clearly scope synthetic evidence',()=>{
 const h=boot();h.render(false);const p=h.w.document.getElementById('soc-product-evidence');assert.ok(p);assert.match(p.textContent,/fictional scenario evidence only/i);assert.match(p.textContent,/legal approval/i);for(const control of p.querySelectorAll('button,input,select'))assert.equal(control.disabled,true);assert.deepEqual(h.errors,[]);h.dom.window.close();
});

test('AC-SOC-297 evidence request derives resource from selected feature dependency and dispatches scoped command',()=>{
 const h=boot();h.render(true);const f=h.w.document.querySelector('[data-product-evidence-form="request"]');assert.ok(f);assert.equal(f.elements.dependency.value,'eligibility-evidence');assert.equal(f.querySelector('[data-product-evidence-resource] strong').textContent,'phone');f.elements.feature.value='regional-evidence';f.elements.feature.dispatchEvent(new h.w.Event('change',{bubbles:true}));assert.equal(f.elements.dependency.value,'jurisdiction-evidence');assert.equal(f.querySelector('[data-product-evidence-resource] strong').textContent,'access');f.elements.feature.value='eligibility-evidence';f.elements.feature.dispatchEvent(new h.w.Event('change',{bubbles:true}));f.elements.id.value='evidence-eligible-profile';h.submit('[data-product-evidence-form="request"]');assert.deepEqual(h.commands().at(-1),{type:'product-evidence',command:{action:'request',id:'evidence-eligible-profile',deploymentId:'gov-profile',feature:'eligibility-evidence',dependency:'eligibility-evidence',resourceId:'phone'}});assert.deepEqual(h.errors,[]);h.dom.window.close();
});

test('AC-SOC-298 evidence revocation offers only active effective proofs and uses an explicit reason',()=>{
 const h=boot(),row={id:'evidence-effective',desired:{deploymentId:'gov-profile',family:'microsoft:government-clouds',offerId:'gov-offer',productVersion:'scenario-1',mode:'gcc-high',region:'AU',feature:'eligibility-evidence',dependency:'eligibility-evidence',resourceId:'phone',deploymentGeneration:1,resourceGeneration:1,jurisdiction:'AU',scenario:'government'},generation:1,provisioning:{status:'ready',due:1,generation:1,errors:[]},observed:{at:1,eligible:true,reasons:[],source:null},effective:{generation:1,scope:{},issuedAt:1,expiresAt:10,source:{},synthetic:true,externalApprovalClaim:false},revokedAt:null,revocationReason:null};
 h.render(true,h.s,{productEvidence:{requests:[row]}});const f=h.w.document.querySelector('[data-product-evidence-form="revoke"]');f.elements.reason.value='evidence-withdrawn';h.submit('[data-product-evidence-form="revoke"]');assert.deepEqual(h.commands().at(-1),{type:'product-evidence',command:{action:'revoke',id:'evidence-effective',reason:'evidence-withdrawn'}});assert.deepEqual(h.errors,[]);h.dom.window.close();
});
