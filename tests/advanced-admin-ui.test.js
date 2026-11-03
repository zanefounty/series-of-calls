const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');

function boot(){
 const {dom,ev,errors}=load(),w=dom.window;
 ev(`window.__commands=[];socApply=(command)=>window.__commands.push(JSON.parse(JSON.stringify(command)));`);
 const state=ev(`(()=>{const s=SOC.create();s.channels=SOC_CHANNELS.create(s);s.outcomes=SOC_OUTCOMES.create(s);s.products=SOC_PRODUCTS.create(s);return s;})()`);
 const render=(locked=true,renderState=state)=>{w.__state=renderState;w.__locked=locked;ev(`SCT.state=window.__state;SCT.locked=window.__locked;let m=document.getElementById('aa-test-mount');if(!m){m=document.createElement('div');m.id='aa-test-mount';document.body.appendChild(m);}m.innerHTML=socAdvancedAdminPanel(SCT.state,null);socBindAdvancedAdmin();`);};
 const submit=(selector)=>{const f=w.document.querySelector(selector);assert.ok(f,selector);f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 return {dom,w,ev,errors,state,render,submit,commands:()=>JSON.parse(JSON.stringify(w.__commands))};
}

test('advanced admin renders optional starters and disables every control in read-only mode',()=>{
 const h=boot(),s=h.ev('SOC.create()');h.render(false,s);
 for(const id of ['channels','outcomes','products'])assert.equal(h.w.document.querySelector(`#soc-advanced-${id} button`).disabled,true);
 h.render(false,s);
 for(const el of h.w.document.querySelectorAll('#soc-advanced-admin button,#soc-advanced-admin input,#soc-advanced-admin select'))assert.equal(el.disabled,true);
 assert.match(h.w.document.getElementById('soc-advanced-admin').textContent,/Fictional scenario controls only/);
 h.dom.window.close();
});

test('channel UI configures accounts and permissions without fabricating acceptance or receipt events',()=>{
 const h=boot();h.render(true);
 const cfg=h.w.document.querySelector('[data-aa-form="channel-config"][data-channel="chatterleaf"]');cfg.elements.sender.value='orchard-help';cfg.elements.responseWindowMinutes.value='45';h.submit('[data-aa-form="channel-config"][data-channel="chatterleaf"]');
 const command=h.commands().at(-1);assert.equal(command.type,'channels');assert.equal(command.command.action,'configure');assert.equal(command.command.config.responseWindowMinutes,45);assert.equal(command.command.config.approvedSender,true);
 h.submit('[data-aa-form="channel-observe"][data-channel="chatterleaf"]');assert.equal(h.commands().at(-1).command.action,'observe');
 h.submit('[data-aa-form="permission"]');assert.equal(h.commands().at(-1).command.action,'permission');assert.equal(h.commands().at(-1).command.expiresAt,null);
 assert.match(h.w.document.querySelector('#soc-advanced-channels').textContent,/trusted, bound interactions/);
 h.dom.window.close();
});

test('channel attempt form passes account, purpose, template, and selected need through the ordinary interaction command',()=>{
 const h=boot();h.render(true);h.ev(`SOC_OUTCOMES.command(SCT.state,{action:'need',tenant:'orchard-repairs',person:'alex',caseId:'case-1',purpose:'billing support',intent:'billing-question',permittedChannels:['message']});`);h.render(true);
 const form=h.w.document.querySelector('[data-aa-form="channel-interact"]');form.elements.caseId.value='case-1';form.elements.needId.value='need-1';form.elements.template.value='case-receipt';h.submit('[data-aa-form="channel-interact"]');
 assert.deepEqual(h.commands().at(-1),{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:'case-1',account:'chatterleaf',purpose:'service',template:'case-receipt',needId:'need-1'});
 h.dom.window.close();
});

test('outcomes UI configures policy and task evidence separately from a bot reply',()=>{
 const h=boot();h.render(true);
 h.submit('[data-aa-form="outcomes-config"]');let c=h.commands().at(-1);assert.equal(c.type,'outcomes');assert.equal(c.command.action,'configure');assert.deepEqual(c.command.config.supportedIntents,[]);
 h.submit('[data-aa-form="task-map"]');c=h.commands().at(-1);assert.deepEqual(c.command.config.supportedIntents,['billing-question']);assert.deepEqual(c.command.config.taskIntegrations,[{intent:'billing-question',integration:'cases',evidence:['case-updated']}]);
 h.state.cases['case-1']={identity:'alex'};h.render(true);h.submit('[data-aa-form="need"]');c=h.commands().at(-1);assert.equal(c.command.action,'need');assert.equal(c.command.person,'alex');assert.equal(c.command.tenant,'orchard-repairs');assert.equal(c.command.caseId,'case-1');assert.deepEqual(c.command.permittedChannels,['voice']);
 h.ev(`SOC_OUTCOMES.command(SCT.state,{action:'need',tenant:'orchard-repairs',person:'alex',caseId:'case-1',purpose:'billing support',intent:'billing-question',permittedChannels:['voice']});`);h.render(true);h.submit('[data-aa-form="task-result"]');c=h.commands().at(-1);assert.equal(c.command.action,'task-result');assert.equal(c.command.botAnswered,false);assert.equal(c.command.succeeded,false);
 h.dom.window.close();
});

test('product UI submits structured offers, lifecycle, and referenced deployment setup',()=>{
 const h=boot();h.state.resources={identity:{id:'identity'},phone:{id:'phone'}};h.render(true);
 const offer=h.w.document.querySelector('[data-aa-form="offer"]');offer.elements.id.value='offer-one';offer.elements.dependencies.value='identity=identity';h.submit('[data-aa-form="offer"]');
 let c=h.commands().at(-1);assert.equal(c.type,'products');assert.equal(c.command.action,'offer');assert.deepEqual(c.command.offer.dependencies,{identity:'identity'});assert.deepEqual(c.command.offer.features,['telephony']);
 h.ev(`SOC_PRODUCTS.command(SCT.state,{action:'offer',offer:{id:'offer-one',family:'microsoft:workplace-phone',edition:'standard',unit:'seat',quantity:1,features:['telephony'],dependencies:{identity:'identity'}}});SCT.state.clock=1;SOC_PRODUCTS.advance(SCT.state);`);h.render(true);
 const d=h.w.document.querySelector('[data-aa-form="deployment"]');d.elements.offerId.value='offer-one';d.elements.mode.value='multitenant';[...d.elements.bindingResources.options].find(o=>o.value==='phone').selected=true;h.submit('[data-aa-form="deployment"]');c=h.commands().at(-1);assert.equal(c.command.action,'deploy');assert.deepEqual(c.command.bindings,[{feature:'telephony',resources:['phone']}]);
 h.submit('[data-aa-form="lifecycle"]');c=h.commands().at(-1);assert.equal(c.command.action,'lifecycle');assert.equal(c.command.sale,'available');
 h.dom.window.close();
});

test('product integration setup and test are directional and visibly synthetic',()=>{
 const h=boot();h.render(true);h.ev(`(()=>{const offer={id:'offer-a',family:'microsoft:workplace-phone',edition:'standard',unit:'seat',quantity:1,features:['telephony'],dependencies:{identity:'identity'}};SOC_PRODUCTS.command(SCT.state,{action:'offer',offer});SCT.state.clock=1;SOC_PRODUCTS.advance(SCT.state);for(const id of ['deployment-a','deployment-b'])SOC_PRODUCTS.command(SCT.state,{action:'deploy',id,offer:'offer-a',productVersion:'v1',mode:'multitenant',features:['telephony'],dependencies:{identity:'identity'},bindings:[],region:'scenario-local'});})()`);h.render(true);
 const f=h.w.document.querySelector('[data-aa-form="integration"]');f.elements.sourceFeature.value='telephony';f.elements.targetFeature.value='telephony';h.submit('[data-aa-form="integration"]');let c=h.commands().at(-1);assert.deepEqual(c.command.features,[{sourceFeature:'telephony',targetFeature:'telephony'}]);
 h.ev(`SOC_PRODUCTS.command(SCT.state,{action:'integration',id:'integration-one',source:'deployment-a',target:'deployment-b',features:[{sourceFeature:'telephony',targetFeature:'telephony'}]});`);h.render(true);h.submit('[data-aa-form="integration-test"]');c=h.commands().at(-1);assert.deepEqual(c.command,{action:'test-integration',id:'integration-one'});assert.match(h.w.document.getElementById('soc-advanced-products').textContent,/never claim vendor support/);
 h.dom.window.close();
});
