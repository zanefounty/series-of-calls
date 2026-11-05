const test=require('node:test'),assert=require('node:assert/strict');
const {load,browser,flush}=require('./harness');
function tab(t,b){const x=load({browser:b});t.after(()=>{x.ev('socClose()');b.close(x.dom.window);x.dom.window.close();});return x;}
async function openLab(x){x.ev("SCT.slot='lab'");await x.ev('socOpen()');x.ev("SCT.state=SOC.create({mode:'sandbox'});SCT.selected='phone';socRender()");return x;}
test('compiled page retains training labels and opens the Lab configuration console',async t=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'soc-console-'));require('../scripts/build').build({out});
 const b=browser(),x=load({browser:b,file:path.join(out,'index.html')});t.after(()=>{x.ev('socClose()');b.close(x.dom.window);x.dom.window.close();fs.rmSync(out,{recursive:true,force:true});});
 await openLab(x);assert.equal(x.dom.window.document.querySelector('#soc-console h1').textContent,'Series of Calls');
 assert.ok(!x.dom.window.document.querySelector('#soc-console').textContent.includes('training.'));
 assert.equal(x.dom.window.document.querySelectorAll('#soc-config input').length>5,true);assert.deepEqual(x.errors,[]);
});
test('Lab console exposes the advanced channel and outcomes controls',async t=>{
 const x=await openLab(tab(t,browser()));const d=x.dom.window.document;
 assert.ok(d.querySelector('#soc-advanced-admin'));
 assert.ok(d.querySelector('#soc-advanced-channels [data-aa-start="channels"]'));
 assert.ok(d.querySelector('#soc-advanced-outcomes [data-aa-start="outcomes"]'));
 assert.deepEqual(x.errors,[]);
});
test('advanced Lab UI submissions reach the real dispatcher with core-bound channel and need context',async t=>{
 const x=await openLab(tab(t,browser()));const d=x.dom.window.document;
 for(const pack of ['channels','outcomes']){const form=d.querySelector(`#soc-advanced-${pack} [data-aa-start="${pack}"]`);form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));}
 let taskMap=d.querySelector('[data-aa-form="task-map"]');taskMap.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('!!SCT.state.channels'),true,x.ev('SCT.error'));assert.equal(x.ev('!!SCT.state.outcomes'),true,x.ev('SCT.error'));
 x.ev('socAdvance(1)');
 assert.equal(x.ev('!!SCT.state.outcomes'),true,x.ev('SCT.error'));
 const observed=d.querySelector('[data-aa-form="channel-observe"][data-channel="chatterleaf"]');observed.elements.authenticated.checked=true;observed.elements.providerAvailable.checked=true;observed.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 const permission=d.querySelector('[data-aa-form="permission"]');permission.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 let form=d.querySelector('[data-aa-form="channel-interact"]');form.elements.caseId.value='case-bound-1';form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.interactions.at(-1).account'),'chatterleaf');assert.equal(x.ev('SCT.state.interactions.at(-1).tenant'),'orchard-repairs');assert.ok(x.ev('SCT.state.cases["case-bound-1"]'));
 form=d.querySelector('[data-aa-form="need"]');assert.ok(form);form.elements.intent.value='billing-question';form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.outcomes.needs.at(-1)?.caseId'), 'case-bound-1', x.ev('JSON.stringify({error:SCT.error,outcomes:!!SCT.state.outcomes,command:SCT.state.commands.at(-1)})'));
 assert.equal(x.ev('SCT.state.outcomes.needs.at(-1)?.person'),'alex');assert.equal(x.ev('SCT.state.outcomes.needs.at(-1)?.resolutionCriteria.integration'),'cases');
 form=d.querySelector('[data-aa-form="channel-interact"]');form.elements.caseId.value='case-bound-1';form.elements.needId.value=x.ev('SCT.state.outcomes.needs.at(-1).id');form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.interactions.at(-1).needId'),x.ev('SCT.state.outcomes.needs.at(-1).id'));assert.deepEqual(x.errors,[]);
});
test('Lab product offer and deployment defaults use a viable real core binding through SOC.dispatch',async t=>{
 const x=await openLab(tab(t,browser()));const d=x.dom.window.document;
 d.querySelector('#soc-advanced-products [data-aa-start="products"]').dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 const offer=d.querySelector('[data-aa-form="offer"]');assert.equal(offer.elements.features.options[1].value,'telephony');assert.equal(offer.elements.features.options[1].selected,true);offer.elements.id.value='ui-phone-offer';offer.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.deepEqual(JSON.parse(x.ev('JSON.stringify(SCT.state.products.offers[0].features)')),['telephony']);assert.deepEqual(JSON.parse(x.ev('JSON.stringify(SCT.state.products.offers[0].dependencies)')),{identity:'identity'});
 x.ev(`SCT.state=SOC.dispatch(SCT.state,{type:'advance',minutes:1});socRender();`);
 const deploy=d.querySelector('[data-aa-form="deployment"]');deploy.elements.id.value='ui-phone-deployment';[...deploy.elements.bindingResources.options].find(o=>o.value==='phone').selected=true;deploy.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.deepEqual(JSON.parse(x.ev('JSON.stringify(SCT.state.products.deployments[0].desired.bindings)')),[{feature:'telephony',resources:['phone']}]);assert.deepEqual(x.errors,[]);
});
test('Lab product-evidence, media, and managed panels start through shared dispatch with correct root dependencies',async t=>{
 const x=await openLab(tab(t,browser()));let d=x.dom.window.document;
 const page=d.querySelector('#soc-console').textContent;
 for(const selector of ['#soc-product-evidence','#soc-media-negotiation','#soc-managed-operations'])assert.ok(d.querySelector(selector),selector);
 for(const prefix of ['product_evidence_ui.','media_admin.','managed_operations_ui.'])assert.ok(!page.includes(prefix),`untranslated label ${prefix}`);
 assert.equal(x.ev('SCT.state.products'),undefined);assert.equal(x.ev('SCT.state.productEvidence'),undefined);
 d.querySelector('#soc-advanced-products [data-aa-start="products"]').dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.products.pack'),'soc-products-1');
 d=x.dom.window.document;d.querySelector('#soc-product-evidence [data-product-evidence-start]').dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.productEvidence.pack'),'soc-product-evidence-1');
 d=x.dom.window.document;d.querySelector('#soc-media-negotiation [data-media-start]').dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.mediaNegotiation.pack'),'soc-media-negotiation-1');

 d=x.dom.window.document;d.querySelector('#soc-portfolio [data-portfolio-action="start"]').click();
 const add=d.querySelector('[data-portfolio-add]');add.elements.id.value='console-customer';add.elements.tenant.value='console-tenant';add.elements.name.value='Console Customer';add.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.portfolio.customers[0].id'),'console-customer');
 const select=d.querySelector('[data-portfolio-select]');select.elements.customerId.value='console-customer';select.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.portfolio.selectedCustomer'),'console-customer');
 d=x.dom.window.document;d.querySelector('#soc-managed-operations [data-managed-action="start"]').click();
 assert.equal(x.ev('SCT.state.managedOperations.pack'),'soc-managed-operations-1');
 assert.equal(x.ev('SCT.state.portfolio.customers[0].root.managedOperations'),undefined);
 assert.equal(x.ev('SCT.state.portfolio.selectedCustomer'),'console-customer');assert.deepEqual(x.errors,[]);
});
test('Lab specialist starters are read-only in a non-owning tab',async t=>{
 const x=tab(t,browser({locks:false}));await x.ev('socOpen()');x.ev("SCT.state=SOC.create({mode:'sandbox'});socRender()");const d=x.dom.window.document;assert.equal(x.ev('SCT.locked'),false);
 const button=d.querySelector('#soc-media-negotiation [data-media-start] button');assert.ok(button);assert.equal(button.disabled,true);button.click();
 assert.ok(d.querySelector('#soc-product-evidence')?.textContent);assert.equal(d.querySelector('#soc-product-evidence [data-product-evidence-start]'),null);
 assert.ok(d.querySelector('#soc-managed-operations')?.textContent);assert.equal(d.querySelector('#soc-managed-operations [data-managed-action="start"]'),null);
 assert.equal(x.ev('SCT.state.products'),undefined);assert.equal(x.ev('SCT.state.productEvidence'),undefined);assert.equal(x.ev('SCT.state.mediaNegotiation'),undefined);assert.equal(x.ev('SCT.state.managedOperations'),undefined);assert.deepEqual(x.errors,[]);
});
test('Lab form submits desired configuration, provisions and survives reload',async t=>{
 const b=browser(),x=await openLab(tab(t,b));
 x.ev("socClick('select','people')");
 x.dom.window.document.querySelector('[name=people]').value='2';
 x.dom.window.document.querySelector('#soc-config').dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.resources.people.desired.people'),2);
 assert.equal(x.ev('SCT.state.resources.people.effective'),null);
 x.ev("socAdvance(1);socClick('interaction');socAdvance(5)");
 assert.equal(x.ev('SOC.assess(SCT.state).passed'),true);
 const saved=x.ev('JSON.stringify(SCT.state)');x.ev('socClose()');await flush();
 const y=tab(t,b);y.ev("SCT.slot='lab'");await y.ev('socOpen()');assert.equal(y.ev('JSON.stringify(SCT.state)'),saved);
 assert.deepEqual(x.errors,[]);assert.deepEqual(y.errors,[]);
});
test('only one tab edits; reopening reads the save written by the next owner',async t=>{
 const b=browser(),a=tab(t,b),c=tab(t,b);await a.ev('socOpen()');await c.ev('socOpen()');
 assert.equal(c.ev('SCT.locked'),false);assert.throws(()=>c.ev('socApply({type:"advance",minutes:1})'));
 a.ev('socAdvance(1);socClose()');await flush();await c.ev('socOpen()');
 assert.equal(c.ev('SCT.locked'),true);c.ev('socAdvance(2);socClose()');await flush();await a.ev('socOpen()');
 assert.equal(a.ev('SCT.state.clock'),3);assert.equal(a.ev('SCT.locked'),true);
});
test('legacy sandbox save is copied to Lab before the Training slot resumes',async t=>{
 const b=browser(),x=tab(t,b);const legacy=x.ev("JSON.stringify(SOC.create({scenario:'smb',mode:'sandbox'}))");
 const original=JSON.stringify({app:x.ev('SOC.APP'),seq:7,state:JSON.parse(legacy)});
 x.ev(`localStorage.setItem(SCT_KEY+'main',${JSON.stringify(original)})`);
 await x.ev('socOpen()');
 assert.equal(x.ev('SCT.slot'),'lab');assert.equal(x.ev('SCT.state.experience.kind'),'lab');
 assert.equal(x.ev(`localStorage.getItem(SCT_KEY+'main')`),original,'the validated legacy source remains exportable');
 assert.equal(x.ev('localStorage.getItem(SCT_LEGACY_ARCHIVE)'),original);assert.ok(x.dom.window.document.querySelector('[data-soc="export-legacy"]'));
 const labEnvelope=JSON.parse(x.ev(`localStorage.getItem(SCT_KEY+'lab')`));
 assert.equal(labEnvelope.state.experience.kind,'lab');assert.deepEqual(labEnvelope.state,JSON.parse(legacy));
 assert.equal(x.ev("localStorage.getItem(SCT_LEGACY_MIGRATED+'main')"),'1');
 x.ev('socClose()');x.ev("SCT.slot='main';SCT.state=null");await x.ev('socOpen()');
 assert.equal(x.ev('SCT.state.experience.kind'),'training');assert.equal(x.ev('SCT.slot'),'main');
 x.ev('socAdvance(1)');
 assert.equal(x.ev('JSON.parse(localStorage.getItem(SCT_KEY+\'main\')).state.clock'),1);
 assert.deepEqual(JSON.parse(x.ev(`localStorage.getItem(SCT_KEY+'lab')`)).state,JSON.parse(legacy));
 assert.deepEqual(x.errors,[]);
});
test('stale worker result replays against current configuration; close cancels work',async t=>{
 const x=tab(t,browser());await x.ev('socOpen()');
 x.ev(`URL.createObjectURL=()=> 'blob:mock';URL.revokeObjectURL=()=>{};
 window.Worker=class {constructor(){window.worker=this;}terminate(){this.stopped=true;}postMessage(message){this.message=message;}};
 socAdvance(1);socApply({type:'configure',id:'people',config:{people:2}});
 worker.onmessage({data:{revision:worker.message.state.revision,state:SOC.dispatch(worker.message.state,worker.message.command)}});`);
 assert.equal(x.ev('SCT.state.clock'),1);assert.equal(x.ev('SCT.state.resources.people.effective.people'),2);
 x.ev('socAdvance(5);socClose();worker.onmessage({data:{revision:worker.message.state.revision,state:SOC.dispatch(worker.message.state,worker.message.command)}})');
 assert.equal(x.ev('SCT.state.clock'),1);assert.equal(x.ev('worker.stopped'),true);assert.equal(x.ev('SCT.busy'),false);
});
test('worker errors use the synchronous validated command; absent locks prevent writes',async t=>{
 const x=tab(t,browser());await x.ev('socOpen()');
 x.ev(`URL.createObjectURL=()=> 'blob:mock';URL.revokeObjectURL=()=>{};window.Worker=class {constructor(){window.worker=this;}terminate(){}postMessage(){}};socAdvance(2);worker.onerror();`);
 assert.equal(x.ev('SCT.state.clock'),2);
 const y=tab(t,browser({locks:false}));await y.ev('socOpen()');assert.equal(y.ev('SCT.locked'),false);
 assert.throws(()=>y.ev('socApply({type:"advance",minutes:1})'));assert.equal(y.ev('SCT.state.clock'),0);
});
test('Lab business forms provision required services and reconcile a billing period',async t=>{
 const x=await openLab(tab(t,browser()));const d=x.dom.window.document;
 d.querySelector('[data-biz=start]').click();assert.equal(x.ev('SCT.state.business.pack'),'soc-business-1');
 x.ev("socClick('select','people')");d.querySelector('#soc-config [name=people]').value='2';d.querySelector('#soc-config').dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 x.ev("socAdvance(1);socClick('interaction');socAdvance(5)");
 for(const offer of ['access','messaging','contact']){
  const form=d.querySelector('#soc-order');form.elements.offer.value=offer;form.elements.offer.dispatchEvent(new x.dom.window.Event('change'));
  form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 }
 assert.equal(x.ev('SCT.state.business.contracts.length'),3);
 d.querySelector('[data-biz=period]').click();assert.equal(x.ev('SOC.calculate(SCT.state).business.completion'),true);
 assert.match(d.querySelector('#soc-business').textContent,/milestone achieved/);assert.deepEqual(x.errors,[]);
 const raw=JSON.parse(x.ev("localStorage.getItem(SCT_KEY+SCT.slot)"));assert.equal(raw.state.business.metrics.periods,1);
});
test('Lab operations forms expose onboarding, porting and deployment changes through shared commands',async t=>{
 const x=await openLab(tab(t,browser()));const d=x.dom.window.document;
 d.querySelector('[data-ops=start]').click();x.ev('socAdvance(1)');
 let form=d.querySelector('[data-ops-config=carrier]');form.elements.mode.value='operator';form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.operations.carrier.desired.mode'),'operator');assert.equal(x.ev('SCT.state.operations.carrier.effective.mode'),'managed');
 x.ev('socAdvance(1)');assert.ok(x.ev('SOC.calculate(SCT.state).operations.carrier.includes("OPERATOR_ONBOARDING")'));
 form=d.querySelector('#soc-number-reserve');form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));assert.equal(x.ev('SCT.state.operations.numbers.length'),3);
 form=d.querySelector('#soc-number-port');form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));assert.equal(x.ev('SCT.state.operations.ports[0].status'),'submitted');
 form=d.querySelector('#soc-add-platform');form.elements.kind.value='dedicated';form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));assert.equal(x.ev('SCT.state.resources["second-phone"].kind'),'dedicated');
 assert.deepEqual(x.errors,[]);
});
test('Lab information forms provision processing policy and book a room through shared commands',async t=>{
 const x=await openLab(tab(t,browser()));const d=x.dom.window.document;
 d.querySelector('[data-info=start]').click();assert.equal(x.ev('SCT.state.information.pack'),'soc-information-1');x.ev('socAdvance(1)');
 let f=d.querySelector('[data-info-config=pipeline]');f.elements.steps.value='["transcription","redaction","index"]';f.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.information.pipeline.desired.steps.length'),3);assert.equal(x.ev('SCT.state.information.pipeline.effective.steps.length'),6);
 x.ev('socAdvance(1)');f=d.querySelector('#soc-information-book');f.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));assert.equal(x.ev('SCT.state.information.bookings.length'),1);
 d.querySelector('[data-info=join]').click();assert.equal(x.ev('SCT.state.lastMeeting.success'),false);x.ev('socAdvance(1)');d.querySelector('[data-info=join]').click();assert.equal(x.ev('SCT.state.lastMeeting.success'),true);
 assert.ok(!d.querySelector('#soc-information').textContent.includes('information.'));assert.deepEqual(x.errors,[]);
});
test('Lab contact forms provision IVR and schedule a callback without retaining the original session',async t=>{
 const x=await openLab(tab(t,browser()));const d=x.dom.window.document;
 d.querySelector('[data-contact=start]').click();x.ev('socAdvance(1)');let form=d.querySelector('#soc-contact-config');form.elements.ivr.checked=true;form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));
 assert.equal(x.ev('SCT.state.contact.desired.ivr'),true);assert.equal(x.ev('SCT.state.contact.effective.ivr'),false);x.ev('socAdvance(1)');
 form=d.querySelector('#soc-contact-call');form.dispatchEvent(new x.dom.window.Event('submit',{cancelable:true}));assert.equal(x.ev('SCT.state.interactions[0].phase'),'queued');
 d.querySelector('[data-contact=callback]').click();assert.equal(x.ev('SCT.state.contact.callbacks[0].status'),'scheduled');assert.equal(x.ev('SCT.state.interactions[0].phase'),'failed');
 assert.ok(!d.querySelector('#soc-contact').textContent.includes('contact.'));assert.deepEqual(x.errors,[]);
});
test('Lab topology supports keyboard navigation and scaled pointer selection',async t=>{
 const x=await openLab(tab(t,browser()));const d=x.dom.window.document;
 let canvas=d.querySelector('#soc-topology');canvas.focus();canvas.dispatchEvent(new x.dom.window.KeyboardEvent('keydown',{key:'End',cancelable:true}));assert.equal(x.ev('SCT.selected'),'people');assert.equal(d.activeElement.id,'soc-topology');
 canvas=d.querySelector('#soc-topology');canvas.getBoundingClientRect=()=>({left:0,top:0,width:340,height:90});canvas.dispatchEvent(new x.dom.window.MouseEvent('click',{clientX:100,clientY:32.5,bubbles:true}));assert.equal(x.ev('SCT.selected'),'phone');assert.equal(d.activeElement.id,'soc-topology');assert.deepEqual(x.errors,[]);
});
