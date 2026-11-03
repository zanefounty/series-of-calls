const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
const SOC=require('../src/game/55-communications');
const {send,info,tick,contract,bind,ready,record,interfaceCommand,transfer}=require('./lib/information-interface-fixture');
const plain=value=>JSON.parse(JSON.stringify(value));
function boot(s){
 const h=load(),w=h.dom.window;w.__state=s;
 h.ev("SCT.state=window.__state;SCT.locked=true;SCT.slot='interface-test';window.__commands=[];window.__originalApply=socApply;socApply=command=>{window.__commands.push(JSON.parse(JSON.stringify(command)));return window.__originalApply(command)};socStore=()=>{};socRender();");
 return {...h,w,state:()=>h.ev('SCT.state'),commands:()=>plain(w.__commands),submit:(id)=>w.document.getElementById(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true})),set:(id,key,value)=>{w.document.getElementById(id).elements.namedItem(key).value=value;}};
}
test('actual information console provisions a typed archive interface, transfers a real meeting record and revokes it',()=>{
 const h=boot(record(ready()));try{
  const panel=h.w.document.querySelector('#soc-information-interfaces');assert.ok(panel);assert.match(panel.textContent,/scenario|fictional|synthetic/i);
  h.set('soc-information-interface','id','ui-handover');h.set('soc-information-interface','policyId','defence-restricted-handover-v1');h.set('soc-information-interface','destinationResource','handover-archive');h.submit('soc-information-interface');
  assert.deepEqual(h.commands().at(-1),{type:'information',command:{action:'interface',id:'ui-handover',policyId:'defence-restricted-handover-v1',sourceResource:'archive',destinationResource:'handover-archive'}});
  assert.equal(h.state().information.interfaces[0].effective,null);h.ev("socApply({type:'advance',minutes:1})");assert.equal(h.state().information.interfaces[0].provisioning.status,'ready');
  h.submit('soc-information-transfer');assert.equal(h.state().information.transfers.at(-1).status,'complete');assert.equal(h.state().records.at(-1).interfaceTransfer.interfaceId,'ui-handover');
  h.w.document.querySelector('[data-info="revoke-interface"]').click();assert.deepEqual(h.commands().at(-1),{type:'information',command:{action:'revoke-interface',interfaceId:'ui-handover'}});h.ev("socApply({type:'advance',minutes:1})");
  h.submit('soc-information-transfer');assert.equal(h.state().information.transfers.at(-1).reason,'INTERFACE_REVOKED');assert.equal(h.errors.length,0);
 }finally{h.dom.window.close();}
});
test('read-only information controls cannot mutate through click or programmatic form submission',()=>{
 const h=boot(tick(info(record(ready()),interfaceCommand())));try{
  h.ev('SCT.locked=false;socRender()');const before=JSON.stringify(h.state());
  const section=h.w.document.querySelector('#soc-information-interfaces');assert.ok([...section.querySelectorAll('button,input,select')].every(x=>x.disabled));
  section.querySelector('[data-info="revoke-interface"]').click();h.submit('soc-information-interface');h.submit('soc-information-transfer');
  assert.equal(JSON.stringify(h.state()),before);assert.equal(h.state().information.transfers.length,0);assert.match(h.ev('SCT.error'),/read.only/i);
 }finally{h.dom.window.close();}
});
test('interface display and transfer history escape untrusted text without presenting it as executable markup',()=>{
 const h=boot(tick(info(record(ready()),interfaceCommand())));try{
  // Rendering-only hostile data: deliberately not dispatched or represented as a valid save.
  const display=structuredClone(plain(h.state())),hostile='<img src=x onerror="window.__interfaceXss=1">';
  display.information.interfaces[0].id=hostile;display.information.interfaces[0].desired.destinationResource=hostile;
  display.information.transfers.push({id:hostile,interfaceId:hostile,recordId:hostile,status:hostile,reason:hostile,outputRecordId:hostile});h.w.__display=display;
  h.ev("document.getElementById('soc-information-interfaces').outerHTML=socInformationInterfacesPanel(window.__display)");
  const section=h.w.document.querySelector('#soc-information-interfaces');assert.equal(section.querySelector('img'),null);assert.equal(h.w.__interfaceXss,undefined);assert.ok(section.textContent.includes(hostile));
  assert.equal(section.querySelector('[data-info="revoke-interface"]').dataset.id,hostile);
 }finally{h.dom.window.close();}
});
