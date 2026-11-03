const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('./harness');
const {setup,participant,submit,dispatchChild,advance}=require('./helpers/managed-fixture');
const ui=fs.readFileSync(path.join(__dirname,'..','src','game','76-managed-operations-ui.js'),'utf8');

function boot(state){
 const h=load(),w=h.dom.window;h.ev(ui);
 h.ev(`window.__commands=[];window.socApply=command=>{window.__commands.push(JSON.parse(JSON.stringify(command)));const selected=SCT.state.portfolio?.selectedCustomer;if(selected&&!['portfolio','advance','managed-operations'].includes(command.type))command={type:'portfolio',command:{action:'dispatchcustomer',customerId:selected,command}};SCT.state=SOC.dispatch(SCT.state,{...command,expectedRevision:SCT.state.revision});window.__renderManaged();};window.socError=error=>{window.__uiError=String(error?.message||error);};window.__renderManaged=()=>{let mount=document.getElementById('managed-ui-test-mount');if(!mount){mount=document.createElement('div');mount.id='managed-ui-test-mount';document.body.appendChild(mount);}mount.innerHTML=socManagedOperationsPanel(SCT.state,SOC.calculate(SCT.state));socBindManagedOperations();};`);
 const render=value=>{h.ev(`SCT.state=JSON.parse(${JSON.stringify(JSON.stringify(value))});SCT.locked=true;window.__uiError=null;window.__renderManaged();`);};render(state);
 const commands=()=>JSON.parse(JSON.stringify(w.__commands));return {...h,w,render,state:()=>h.ev('SCT.state'),commands};
}
function submitForm(h){const form=h.w.document.querySelector('[data-managed-submit]');assert.ok(form);form.dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));if(h.w.__uiError)throw Error(h.w.__uiError);}

test('AC-SOC-311 managed operations UI is a typed root-scoped form and forwards full selected desired configurations',()=>{
 let root=setup();root=require('../src/game/55-communications').dispatch(root,{type:'portfolio',command:{action:'selectcustomer',customerId:'managed-sydney'}});const h=boot(root),w=h.w;assert.ok(w.document.querySelector('#soc-managed-operations'));assert.ok(w.document.querySelector('[data-managed-action=start]'));
 h.ev("SCT.locked=false;window.__renderManaged();");assert.equal(w.document.querySelector('[data-managed-action=start]').disabled,true);
 h.ev("SCT.locked=true;window.__renderManaged();");w.document.querySelector('[data-managed-action=start]').click();assert.equal(h.commands().at(-1).type,'managed-operations');assert.equal(h.state().managedOperations.pack,'soc-managed-operations-1');
 h.render(h.state());for(const id of ['managed-sydney','managed-melbourne']){w.document.querySelector(`[data-managed-include="${id}"]`).checked=true;w.document.querySelector(`[data-managed-principal="${id}"]`).value=`jules-${id.slice(-2)}`;w.document.querySelector(`[data-managed-entitlement="${id}"]`).checked=true;}
 const form=w.document.querySelector('[data-managed-submit]');assert.equal(form.querySelectorAll('input[type=text],textarea').length,0,'the panel has no raw command or JSON editor');submitForm(h);
 const command=h.commands().at(-1);assert.equal(command.type,'managed-operations');assert.equal(command.command.action,'submit');assert.equal(command.command.participants.length,2);for(const p of command.command.participants){const child=h.state().portfolio.customers.find(x=>x.id===p.customerId).root,expected=JSON.parse(JSON.stringify(child.resources.identity.desired)),principal=`jules-${p.customerId.slice(-2)}`;expected.identities.push(principal);expected.entitled.push(principal);assert.equal(p.contractId,child.business.contracts.find(x=>x.offer==='managed-operations').id);assert.equal(p.connector,'orchard-sync');assert.equal(p.items[0].resource,'identity');assert.equal(JSON.stringify(p.items[0].config),JSON.stringify(expected));}
 assert.equal(h.state().managedOperations.jobs[0].participants.length,2);assert.equal(w.__uiError,null);assert.deepEqual(h.errors,[]);w.close();
});

test('AC-SOC-312 managed operations retry control targets one blocked customer and disabled/read-only controls do not dispatch',()=>{
 let root=setup();root=require('../src/game/55-communications').dispatch(root,{type:'managed-operations',command:{action:'start'}});root=submit(root,[participant(root,'managed-melbourne')],'ui-retry-job');root=dispatchChild(root,'managed-melbourne',{type:'estate',command:{action:'fault',connector:'orchard-sync',fault:'OUTAGE'}});root=advance(root,1);root=dispatchChild(root,'managed-melbourne',{type:'estate',command:{action:'fault',connector:'orchard-sync',fault:null}});
 const h=boot(root),w=h.w;const retry=w.document.querySelector('[data-managed-action=retry]');assert.ok(retry);assert.equal(retry.dataset.customer,'managed-melbourne');assert.equal(retry.disabled,false);
 h.ev('SCT.locked=false;window.__renderManaged();');assert.equal(w.document.querySelector('[data-managed-action=retry]').disabled,true);const before=JSON.stringify(h.state());w.document.querySelector('[data-managed-action=retry]').click();assert.equal(JSON.stringify(h.state()),before);assert.equal(h.commands().length,0);
 h.ev('SCT.locked=true;window.__renderManaged();');w.document.querySelector('[data-managed-action=retry]').click();const cmd=h.commands().at(-1);assert.deepEqual(cmd,{type:'managed-operations',command:{action:'retry',job:'ui-retry-job',customerId:'managed-melbourne'}});assert.equal(h.state().managedOperations.jobs[0].participants[0].retryCount,1);assert.equal(w.__uiError,null);w.close();
});

test('AC-SOC-313 mover UI changes one existing calling entitlement without changing canonical identity',()=>{
 let root=setup();root=require('../src/game/55-communications').dispatch(root,{type:'managed-operations',command:{action:'start'}});root=require('../src/game/55-communications').dispatch(root,{type:'portfolio',command:{action:'selectcustomer',customerId:'managed-sydney'}});
 const h=boot(root),w=h.w,operation=w.document.querySelector('[data-managed-operation="managed-sydney"]'),include=w.document.querySelector('[data-managed-include="managed-sydney"]');operation.value='mover';operation.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelector('[data-managed-joiner-fields="managed-sydney"]').hidden,true);assert.equal(w.document.querySelector('[data-managed-mover-fields="managed-sydney"]').hidden,false);
 include.checked=true;const entitlement=w.document.querySelector('[data-managed-entitlement="managed-sydney"]');assert.equal(entitlement.checked,true);entitlement.checked=false;submitForm(h);
 const part=h.commands().at(-1).command.participants[0],child=h.state().portfolio.customers.find(x=>x.id==='managed-sydney').root;assert.equal(part.operation,'mover');assert.equal(JSON.stringify(part.items[0].config.identities),JSON.stringify(child.resources.identity.desired.identities));assert.equal(JSON.stringify(part.items[0].config.entitled),JSON.stringify(child.resources.identity.desired.entitled.filter(x=>x!=='alex')));assert.equal(h.state().managedOperations.jobs[0].participants[0].items[0].status,'submitted');assert.equal(w.__uiError,null);w.close();
});
