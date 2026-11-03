const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
function boot(){const h=load();h.ev("SCT.state=SOC.create({jurisdiction:'JP'});SCT.locked=true;socRender();");h.submit=selector=>{const form=h.dom.window.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new h.dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(h.ev('SCT.error'),'');};return h;}
test('AC-SOC-450 customer planning UI submits editable independent needs and displays effective state',()=>{
 const h=boot();try{
  h.submit('[data-customer-needs-start]');let form=h.dom.window.document.querySelector('[data-customer-needs-select]');form.elements.segment.value='government';form.elements.id.value='public-profile';h.submit('[data-customer-needs-select]');
  assert.equal(h.ev('SCT.state.customerNeeds.profiles[0].effective'),null);h.ev("socApply({type:'advance',minutes:1})");
  form=h.dom.window.document.querySelector('[data-customer-needs-form][data-section="sector"]');form.elements.value.value='"commercial"';h.submit('[data-customer-needs-form][data-section="sector"]');
  assert.equal(h.ev('SCT.state.customerNeeds.profiles[0].sector'),'commercial');assert.equal(h.ev('SCT.state.customerNeeds.profiles[0].effective.sector'),'public-service');
  assert.equal(h.ev('SCT.state.business'),undefined);assert.match(h.dom.window.document.querySelector('#soc-customer-needs h2').textContent,/Customer needs/);
  h.ev('SCT.locked=false;socRender()');assert.ok([...h.dom.window.document.querySelectorAll('#soc-customer-needs button')].every(b=>b.disabled));
 }finally{h.dom.window.close();}
});
test('AC-SOC-451 attendance and webhook controls use real dispatch and translate their visible labels',()=>{
 const h=boot();try{
  h.ev("socApply({type:'configure',id:'people',config:{people:1}});socApply({type:'advance',minutes:1});socApply({type:'workforce',command:{action:'start'}});socApply({type:'advance',minutes:1});socApply({type:'channels',command:{action:'start'}});");
  let form=h.dom.window.document.querySelector('[data-attendance="presence"]');form.elements.person.value='agent-01';form.elements.state.value='away';h.submit('[data-attendance="presence"]');assert.equal(h.ev("SCT.state.workforceOps.actualPresence['agent-01']"),'away');
  form=h.dom.window.document.querySelector('[data-webhook="policy"]');form.elements.enabled.checked=true;h.submit('[data-webhook="policy"]');assert.equal(h.ev('SCT.state.channels.webhooks.effective.enabled'),false);
  h.ev("socApply({type:'advance',minutes:1})");assert.equal(h.ev('SCT.state.channels.webhooks.effective.enabled'),true);
  form=h.dom.window.document.querySelector('[data-webhook="observe"]');form.elements.applicationAvailable.checked=false;h.submit('[data-webhook="observe"]');assert.equal(h.ev('SCT.state.channels.webhooks.observed.applicationAvailable'),false);
  assert.match(h.dom.window.document.querySelector('#soc-webhook h2').textContent,/Delivery callbacks/);assert.equal(h.errors.length,0,h.errors.join('\n'));
 }finally{h.dom.window.close();}
});
test('AC-SOC-452 speech console renders translated text rather than source or compiled label identifiers',()=>{
 const h=boot();try{const panel=h.dom.window.document.querySelector('#soc-speech-models');assert.equal(panel.querySelector('h2').textContent,h.ev("tr(SOC_SPEECH_LABELS.title)"));assert.doesNotMatch(panel.textContent,/speech_models\./);}finally{h.dom.window.close();}
});
