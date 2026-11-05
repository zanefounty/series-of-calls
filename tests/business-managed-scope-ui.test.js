const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');

function boot({locked=true}={}){
 const h=load();
 h.ev(`SCT.state=SOC.create({experience:'lab',mode:'sandbox',scenario:'enterprise',jurisdiction:'AU'});SCT.state=SOC.dispatch(SCT.state,{type:'business',command:{action:'start'}});SCT.locked=${locked};socRender();socBindBusiness();`);
 return h;
}
function chooseOffer(form,value){form.elements.offer.value=value;form.elements.offer.dispatchEvent(new form.ownerDocument.defaultView.Event('change',{bubbles:true}));}

test('AC-SOC-550 managed-operations order requires explicit resource scope and submits selected IDs through business dispatch',()=>{
 const h=boot();try{
  const d=h.dom.window.document,form=d.querySelector('#soc-order'),scope=form.querySelector('[data-managed-resource-scope]');assert.ok(scope);chooseOffer(form,'managed-operations');assert.equal(scope.hidden,false);
  chooseOffer(form,'workplace');assert.equal(scope.hidden,true);chooseOffer(form,'managed-operations');assert.equal(scope.hidden,false);assert.equal(form.elements.managedResources.required,true);
  const before=h.ev('JSON.stringify(SCT.state)');form.dispatchEvent(new h.dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(h.ev('SCT.state.business.contracts.length'),0);assert.equal(h.ev('SCT.state.revision'),JSON.parse(before).revision);assert.equal(h.ev('SCT.error'),'MANAGED_CONTRACT_RESOURCE_REQUIRED');
  h.ev("SCT.error=''");form.elements.managedResources.options[Array.from(form.elements.managedResources.options).findIndex(x=>x.value==='identity')].selected=true;form.dispatchEvent(new h.dom.window.Event('submit',{bubbles:true,cancelable:true}));
  const contract=h.ev('SCT.state.business.contracts.at(-1)');assert.equal(contract.offer,'managed-operations');assert.deepEqual(Array.from(contract.resources),['identity']);assert.equal(contract.sell,true);assert.equal(h.ev('SCT.error'),'');assert.deepEqual(h.errors,[]);
 }finally{h.dom.window.close();}
});

test('AC-SOC-551 existing offers keep kind-derived resource defaults and hide managed scope',()=>{
 const h=boot();try{
  const d=h.dom.window.document,form=d.querySelector('#soc-order');chooseOffer(form,'workplace');assert.equal(form.querySelector('[data-managed-resource-scope]').hidden,true);
  const expected=Array.from(Object.values(h.ev('SCT.state.resources')).filter(r=>Array.from(h.ev('SOC.business.offers.workplace.kinds')).includes(r.kind)).map(r=>r.id));
  form.dispatchEvent(new h.dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.deepEqual(Array.from(h.ev('SCT.state.business.contracts.at(-1).resources')),expected);assert.equal(h.ev('SCT.error'),'');assert.deepEqual(h.errors,[]);
 }finally{h.dom.window.close();}
});

test('AC-SOC-552 managed resource scope controls are locked in read-only mode',()=>{
 const h=boot({locked:false});try{
  const form=h.dom.window.document.querySelector('#soc-order');chooseOffer(form,'managed-operations');assert.equal(form.elements.managedResources.disabled,true);assert.equal(form.querySelector('button[type="submit"]').disabled,true);const before=h.ev('JSON.stringify(SCT.state)');form.dispatchEvent(new h.dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(h.ev('JSON.stringify(SCT.state)'),before);assert.deepEqual(h.errors,[]);
 }finally{h.dom.window.close();}
});
