const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');

const boot=()=>{
 const {dom,ev,errors}=load();const w=dom.window;
 ev(`window.__commands=[];socApply=(command)=>window.__commands.push(JSON.parse(JSON.stringify(command)));`);
 const render=(state,locked=true)=>{w.__state=state;w.__locked=locked;ev(`SCT.state=window.__state;SCT.locked=window.__locked;let mount=document.getElementById('sa-test-mount');if(!mount){mount=document.createElement('div');mount.id='sa-test-mount';document.body.appendChild(mount);}mount.innerHTML=socServiceAdminPanel(SCT.state,SOC.calculate(SCT.state));socBindServiceAdmin();`);};
 const startAll=()=>ev(`(()=>{let s=SOC.create();s=SOC.dispatch(s,{type:'calling',command:{action:'start'}});s=SOC.dispatch(s,{type:'workforce',command:{action:'start'}});s=SOC.dispatch(s,{type:'estate',command:{action:'start'}});return s;})()`);
 const submit=selector=>{const form=w.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 const click=selector=>{const button=w.document.querySelector(selector);assert.ok(button,selector);button.click();};
 return {dom,w,ev,errors,render,startAll,submit,click,commands:()=>JSON.parse(JSON.stringify(w.__commands))};
};
test('service administration renders all optional pack starters and respects read-only mode',()=>{
 const h=boot(),s=h.ev('SOC.create()');h.render(s,false);
 for(const id of ['calling','workforce','estate']){const button=h.w.document.querySelector(`#soc-service-${id} button[type=submit]`);assert.ok(button);assert.equal(button.disabled,true);}
 assert.match(h.w.document.getElementById('soc-service-admin').textContent,/Read-only/);
 h.render(s,true);h.click('#soc-service-calling form[data-sa-start] button');
 assert.deepEqual(h.commands().at(-1),{type:'calling',command:{action:'start'}});
 h.click('#soc-service-workforce form[data-sa-start] button');assert.deepEqual(h.commands().at(-1),{type:'workforce',command:{action:'start'}});
 h.click('#soc-service-estate form[data-sa-start] button');assert.deepEqual(h.commands().at(-1),{type:'estate',command:{action:'start'}});
 h.dom.window.close();
});
test('calling UI gives guided directory, media, routing, reception and synthetic emergency forms',()=>{
 const h=boot(),s=h.startAll();h.render(s,true);
 const panel=h.w.document.getElementById('soc-service-calling');assert.match(panel.textContent,/Synthetic exercise only/);assert.match(panel.textContent,/Desired configuration/);assert.match(panel.textContent,/Effective configuration/);
 h.submit('[data-sa-form=tenant]');assert.equal(h.commands().at(-1).type,'calling');assert.equal(h.commands().at(-1).command.type,'configure');assert.equal(h.commands().at(-1).command.node,'directory');
 const media=h.w.document.querySelector('[data-sa-form=media]');media.elements.maxLatencyMs.value='120';h.submit('[data-sa-form=media]');assert.equal(h.commands().at(-1).command.node,'media');assert.equal(h.commands().at(-1).command.config.maxLatencyMs,120);assert.deepEqual(h.commands().at(-1).command.config.codecs,['opus','g711']);
 h.submit('[data-sa-form=route]');assert.equal(h.commands().at(-1).command.node,'services');
 h.submit('[data-sa-form=test-emergency]');assert.deepEqual(h.commands().at(-1),{type:'interact',channel:'voice',from:'',to:'+61000000000',caseId:'emergency-test',intent:'test-emergency'});
 h.dom.window.close();
});
test('workforce UI captures person rows, operator agreements, arrivals, forecasts and coaching',()=>{
 const h=boot(),s=h.startAll();h.render(s,true);
 const roster=h.w.document.querySelector('[data-sa-form=roster]');roster.querySelector('[name=newPersonId]').value='agent-extra';roster.querySelector('[name=newEntitlements]').value='seat-extra';h.submit('[data-sa-form=roster]');
 const rosterCommand=h.commands().at(-1).command;assert.equal(rosterCommand.action,'roster');assert.equal(rosterCommand.people.length,1);assert.equal(rosterCommand.people.at(-1).id,'agent-extra');assert.deepEqual(rosterCommand.people.at(-1).entitlements,['seat-extra']);
 h.submit('[data-sa-form=agreement]');assert.equal(h.commands().at(-1).command.action,'agreement');assert.deepEqual(h.commands().at(-1).command.actions,['configure','coach']);
 h.submit('[data-sa-form=arrival]');assert.deepEqual(h.commands().at(-1).command,{action:'arrival',channel:'voice',count:8});
 h.submit('[data-sa-form=forecast]');assert.deepEqual(h.commands().at(-1).command,{action:'forecast',channel:'voice',horizon:60,method:'mean'});
 h.submit('[data-sa-form=coach]');assert.equal(h.commands().at(-1).command.action,'coach');assert.equal(h.commands().at(-1).command.costCents,5000);
 h.dom.window.close();
});
test('estate UI guides inventory, connectors, lifecycle revocations, device projects and transfers',()=>{
 const h=boot(),s=h.startAll();h.render(s,true);
 const panel=h.w.document.getElementById('soc-service-estate');assert.match(panel.textContent,/Observed state and results/);assert.match(panel.textContent,/LEAVER_REVOCATION_UNSUPPORTED/);
 h.submit('[data-sa-form=discover]');assert.deepEqual(h.commands().at(-1).command.action,'discover');assert.equal(h.commands().at(-1).command.items[0].sourceKey,'source-phone-01');
 const connector=h.w.document.querySelector('[data-sa-form=connector]');connector.elements.connectorId.value='sync-one';h.submit('[data-sa-form=connector]');assert.equal(h.commands().at(-1).command.connector.id,'sync-one');assert.ok(h.commands().at(-1).command.connector.actions.includes('firmware'));assert.equal(h.commands().at(-1).command.connector.localDependency,true);assert.equal('authenticated' in h.commands().at(-1).command.connector,false);
 const staged=h.ev(`(()=>{let x=SOC.dispatch(window.__state,{type:'estate',command:{action:'connector',connector:{id:'sync-one',actions:['provision','firmware'],resourceKinds:['device'],version:2,localDependency:false}}});return x;})()`);h.render(staged,true);assert.match(h.w.document.querySelector('#soc-service-estate').textContent,/Pending/);assert.match(h.w.document.querySelector('#soc-service-estate').textContent,/Generation 1/);assert.match(h.w.document.querySelector('#soc-service-estate').textContent,/Desired configuration:/);assert.match(h.w.document.querySelector('#soc-service-estate').textContent,/Effective configuration:/);assert.match(h.w.document.querySelector('#soc-service-estate').textContent,/Observed state and results:/);
 const recover=h.w.document.querySelector('[data-sa-form=recover]');h.submit('[data-sa-form=recover]');assert.deepEqual(h.commands().at(-1).command,{action:'recover',connector:'sync-one',authenticated:true,delegated:true,reachable:true});
 const fault=h.w.document.querySelector('[data-sa-form=fault]');fault.elements.connector.value='sync-one';fault.elements.fault.value='OUTAGE';h.submit('[data-sa-form=fault]');assert.deepEqual(h.commands().at(-1).command,{action:'fault',connector:'sync-one',fault:'OUTAGE'});
 const jml=h.w.document.querySelector('[data-sa-form=jml]');jml.elements.operation.value='leaver';jml.elements.operation.dispatchEvent(new h.w.Event('change',{bubbles:true}));assert.equal(h.w.document.getElementById('sa-jml-revocations').hidden,false);h.submit('[data-sa-form=jml]');assert.equal(h.commands().at(-1).command.action,'jml');assert.deepEqual(h.commands().at(-1).command.items[0].revocations,['identity','number','device']);
 h.submit('[data-sa-form=device]');assert.equal(h.commands().at(-1).command.action,'device');assert.equal(h.commands().at(-1).command.maintenanceAt,1);
 h.submit('[data-sa-form=transfer]');assert.equal(h.commands().at(-1).command.action,'transfer');assert.equal(h.commands().at(-1).command.operation,'export');
 h.dom.window.close();
});
