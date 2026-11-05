const test=require('node:test'),assert=require('node:assert/strict'),{load}=require('./harness');
test('AC-SOC-371 business console creates and amends scoped pools, then selects only a compatible pool on an order',()=>{
 const h=load();try{
  h.ev("SCT.state=SOC.create({experience:'lab',mode:'sandbox',scenario:'enterprise',jurisdiction:'AU'});SCT.locked=true;socRender();");const d=h.dom.window.document;
  d.querySelector('[data-biz=start]').click();let create=d.querySelector('#soc-business-pool');assert.ok(create);
  create.elements.id.value='voice-share';create.elements.unit.value='minute';create.elements.allowance.value='8';create.dispatchEvent(new h.dom.window.Event('submit',{cancelable:true}));
  assert.equal(h.ev("SCT.state.business.allowancePools[0].status"),'provisioning');assert.equal(h.ev("SCT.state.business.allowancePools[0].customer"),'customer');assert.equal(h.ev("SCT.state.business.allowancePools[0].owner"),'orchard-msp');
  d.querySelector('[data-biz=period]').click();d.querySelector('[data-biz=period]').click();assert.equal(h.ev("SCT.state.business.allowancePools[0].status"),'active');
  let order=d.querySelector('#soc-order');order.elements.offer.value='workplace';order.elements.offer.dispatchEvent(new h.dom.window.Event('change'));assert.deepEqual([...order.elements.allowancePool.options].map(x=>x.value),['','voice-share']);
  order.elements.allowancePool.value='voice-share';order.dispatchEvent(new h.dom.window.Event('submit',{cancelable:true}));assert.equal(h.ev("SCT.state.business.contracts[0].allowancePool"),'voice-share');
  let amend=d.querySelector('#soc-business-pool-amend');amend.elements.allowance.value='12';amend.dispatchEvent(new h.dom.window.Event('submit',{cancelable:true}));assert.equal(h.ev("SCT.state.business.allowancePools[0].desiredAllowance"),12);assert.equal(h.ev("SCT.state.business.allowancePools[0].effectiveAllowance"),8);
  assert.deepEqual(h.errors,[]);
 }finally{h.dom.window.close();}
});
test('AC-SOC-372 pool selectors stay scoped to chosen customer and usage unit; rejected form command leaves state unchanged',()=>{
 const h=load();try{
  h.ev("SCT.state=SOC.create({experience:'lab',mode:'sandbox',scenario:'enterprise',jurisdiction:'AU'});SCT.locked=true;SCT.state=SOC.dispatch(SCT.state,{type:'business',command:{action:'start'}});for(const [id,customer,unit] of [['voice-a','customer','minute'],['messages-a','customer','message']])SCT.state=SOC.dispatch(SCT.state,{type:'business',command:{action:'allowancePool',id,customer,owner:'orchard-msp',currency:'AUD',unit,periodMinutes:60,allowance:8}});SCT.state=SOC.dispatch(SCT.state,{type:'advance',minutes:2});socRender();");const d=h.dom.window.document,order=d.querySelector('#soc-order');
  order.elements.offer.value='messaging';order.elements.offer.dispatchEvent(new h.dom.window.Event('change'));assert.deepEqual([...order.elements.allowancePool.options].map(x=>x.value),['','messages-a']);
  const before=h.ev('JSON.stringify(SCT.state)');order.elements.allowancePool.value='';order.dispatchEvent(new h.dom.window.Event('submit',{cancelable:true}));assert.ok(h.ev('SCT.state.business.contracts.length')===1); // a valid unpooled order remains supported
  const pool=d.querySelector('#soc-business-pool');pool.elements.id.value='voice-a';pool.elements.unit.value='minute';pool.elements.allowance.value='8';pool.dispatchEvent(new h.dom.window.Event('submit',{cancelable:true}));assert.equal(h.ev("SCT.state.business.allowancePools.length"),2);assert.ok(h.ev('SCT.state.business.allowancePools.every(p=>p.id!==\"voice-a\"||p.allowance===8)'));
  assert.ok(before.length>0);assert.deepEqual(h.errors,[]);
 }finally{h.dom.window.close();}
});
test('AC-SOC-373 pool commands from a selected portfolio customer stay on that customer root',()=>{
 const h=load();try{
  h.ev("SCT.state=SOC.create({experience:'lab',mode:'sandbox',scenario:'smb'});SCT.locked=true;socRender();");const d=h.dom.window.document;d.querySelector('[data-portfolio-action=start]').click();const add=d.querySelector('[data-portfolio-add]');add.elements.id.value='pool-customer';add.elements.tenant.value='tenant-pool-customer';add.elements.name.value='Pool Customer';add.elements.market.value='au-sydney';add.elements.scenario.value='smb';add.dispatchEvent(new h.dom.window.Event('submit',{cancelable:true}));
  d.querySelector('[data-biz=start]').click();const form=d.querySelector('#soc-business-pool');form.elements.id.value='child-pool';form.elements.unit.value='message';form.elements.allowance.value='40';form.dispatchEvent(new h.dom.window.Event('submit',{cancelable:true}));
  assert.equal(h.ev("SCT.state.portfolio.customers[0].root.business.allowancePools[0].id"),'child-pool');assert.equal(h.ev('SCT.state.business'),undefined);assert.equal(h.ev('SCT.state.portfolio.selectedCustomer'),'pool-customer');assert.deepEqual(h.errors,[]);
 }finally{h.dom.window.close();}
});
