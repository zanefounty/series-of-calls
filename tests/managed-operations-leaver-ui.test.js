const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('./harness');
const {SOC,defaultCustomers,setup,dispatch,dispatchChild,advance}=require('./helpers/managed-fixture');
const ui=fs.readFileSync(path.join(__dirname,'..','src','game','76-managed-operations-ui.js'),'utf8');

function rootWithManagedPack(){
 let root=setup([defaultCustomers[0]]);
 root=dispatch(root,{type:'managed-operations',command:{action:'start'}});
 return dispatch(root,{type:'portfolio',command:{action:'selectcustomer',customerId:defaultCustomers[0].id}});
}
function leaverParticipant(root){
 const customerId=defaultCustomers[0].id,child=root.portfolio.customers.find(x=>x.id===customerId).root,contract=child.business.contracts.find(x=>x.offer==='managed-operations'&&x.status==='active'),config=structuredClone(child.resources.identity.desired);
 config.identities=config.identities.filter(x=>x!=='alex');config.entitled=config.entitled.filter(x=>x!=='alex');
 return {customerId,contractId:contract.id,connector:'orchard-sync',operation:'leaver',items:[{resource:'identity',config,revocations:['identity']}]};
}
function boot(state){
 const h=load(),w=h.dom.window;h.ev(ui);
 h.ev(`window.__commands=[];window.socApply=command=>{window.__commands.push(JSON.parse(JSON.stringify(command)));SCT.state=SOC.dispatch(SCT.state,{...command,expectedRevision:SCT.state.revision});window.__uiError=null;window.__renderManaged();};window.socError=error=>{window.__uiError=String(error?.message||error);};window.__renderManaged=()=>{let mount=document.getElementById('managed-ui-test-mount');if(!mount){mount=document.createElement('div');mount.id='managed-ui-test-mount';document.body.appendChild(mount);}mount.innerHTML=socManagedOperationsPanel(SCT.state,SOC.calculate(SCT.state));socBindManagedOperations();};`);
 h.ev(`SCT.state=JSON.parse(${JSON.stringify(JSON.stringify(state))});SCT.locked=true;SCT.busy=false;window.__renderManaged();`);
 const submit=selector=>{const form=w.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 return {...h,w,submit,state:()=>JSON.parse(JSON.stringify(h.ev('SCT.state'))),commands:()=>JSON.parse(JSON.stringify(w.__commands))};
}
function submitPageForm(h){h.submit('[data-managed-submit]');if(h.w.__uiError)throw Error(h.w.__uiError);}

test('AC-SOC-314 managed leaver UI requires explicit identity revocation and submits only the captured identity retirement',()=>{
 const root=rootWithManagedPack(),before=root.portfolio.customers.find(x=>x.id==='managed-sydney').root.resources.identity.desired,h=boot(root),w=h.w,card=w.document.querySelector('[data-managed-customer="managed-sydney"]');
 assert.ok(card);assert.equal(card.querySelector('[data-managed-include]').disabled,false);
 const operation=card.querySelector('[data-managed-operation]');assert.deepEqual(Array.from(operation.options,x=>x.value),['joiner','mover','leaver']);operation.value='leaver';operation.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(card.querySelector('[data-managed-resource]').value,'identity');assert.equal(card.querySelector('[data-managed-resource]').selectedOptions[0].disabled,false);assert.equal(card.querySelector('[data-managed-connector]').value,'orchard-sync');assert.equal(card.querySelector('[data-managed-principal]').required,false);assert.equal(card.querySelector('[data-managed-leaver-fields]').hidden,false);assert.equal(card.querySelector('[data-managed-leaver-scope]').hidden,false);
 const principal=card.querySelector('[data-managed-leaver-existing]');assert.deepEqual(Array.from(principal.options,x=>x.value),before.identities);principal.value='alex';
 card.querySelector('[data-managed-include]').checked=true;assert.equal(card.querySelector('[data-managed-revocation]').checked,false);
 h.submit('[data-managed-submit]');assert.equal(w.__uiError,'MANAGED_IDENTITY_REVOCATION_REQUIRED');assert.equal(h.commands().length,0);
 card.querySelector('[data-managed-revocation]').checked=true;w.__uiError=null;submitPageForm(h);
 const dispatched=h.commands().at(-1);assert.equal(dispatched.type,'managed-operations');assert.equal(dispatched.command.action,'submit');assert.equal(dispatched.command.participants.length,1);
 const part=dispatched.command.participants[0],expected=structuredClone(before);expected.identities=expected.identities.filter(x=>x!=='alex');expected.entitled=expected.entitled.filter(x=>x!=='alex');
 assert.equal(part.customerId,'managed-sydney');assert.equal(part.operation,'leaver');assert.equal(part.contractId,root.portfolio.customers[0].root.business.contracts.find(x=>x.offer==='managed-operations').id);assert.equal(part.connector,'orchard-sync');assert.deepEqual(part.items,[{resource:'identity',config:expected,revocations:['identity']}]);
 assert.equal(h.state().managedOperations.jobs[0].participants[0].operation,'leaver');assert.equal(w.__uiError,null);assert.deepEqual(h.errors,[]);w.close();
});

test('AC-SOC-315 managed leaver UI retries only a blocked unfinished item through the root dispatcher',()=>{
 let root=rootWithManagedPack();root=dispatch(root,{type:'managed-operations',command:{action:'submit',id:'managed-leaver-ui-retry',participants:[leaverParticipant(root)]}});
 root=dispatchChild(root,'managed-sydney',{type:'estate',command:{action:'fault',connector:'orchard-sync',fault:'OUTAGE'}});root=advance(root,1);root=dispatchChild(root,'managed-sydney',{type:'estate',command:{action:'fault',connector:'orchard-sync',fault:null}});
 const h=boot(root),w=h.w,job=w.document.querySelector('[data-managed-job="managed-leaver-ui-retry"]'),part=job.querySelector('[data-managed-participant="managed-sydney"]'),retry=part.querySelector('[data-managed-action="retry"]');
 assert.match(part.textContent,/blocked/i);assert.ok(retry);assert.equal(retry.disabled,false);
 h.ev('SCT.locked=false;window.__renderManaged();');assert.equal(w.document.querySelector('[data-managed-action="retry"]').disabled,true);const before=JSON.stringify(h.state());w.document.querySelector('[data-managed-action="retry"]').click();assert.equal(JSON.stringify(h.state()),before);assert.equal(h.commands().length,0);
 h.ev('SCT.locked=true;window.__renderManaged();');w.document.querySelector('[data-managed-action="retry"]').click();const command=h.commands().at(-1);assert.deepEqual(command,{type:'managed-operations',command:{action:'retry',job:'managed-leaver-ui-retry',customerId:'managed-sydney'}});assert.equal(h.state().managedOperations.jobs[0].participants[0].retryCount,1);
 const after=w.document.querySelector('[data-managed-participant="managed-sydney"]');assert.ok(after);const retryAfter=after.querySelector('[data-managed-action="retry"]');assert.equal(retryAfter?.disabled??true,true);assert.equal(w.__uiError,null);assert.deepEqual(h.errors,[]);w.close();
});
