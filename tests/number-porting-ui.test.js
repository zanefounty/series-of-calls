const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');

const boot=()=>{
 const {dom,ev}=load(),w=dom.window;
 ev(`window.__commands=[];socApply=(command)=>window.__commands.push(JSON.parse(JSON.stringify(command)));`);
 const render=(state,locked=true)=>{w.__state=state;w.__locked=locked;ev(`SCT.state=window.__state;SCT.locked=window.__locked;let mount=document.getElementById('number-port-test');if(!mount){mount=document.createElement('div');mount.id='number-port-test';document.body.appendChild(mount);}mount.innerHTML=socOperationsPanel(SCT.state,SOC.calculate(SCT.state));socBindOperations();`);};
 const submit=selector=>{const form=w.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 const run=src=>ev(src);
 const commands=()=>JSON.parse(JSON.stringify(w.__commands));
 const close=()=>dom.window.close();
 return {w,render,submit,run,commands,close};
};
const started=()=>`(()=>{let s=SOC.create();s=SOC.dispatch(s,{type:'operations',command:{action:'start'}});return SOC.dispatch(s,{type:'advance',minutes:1});})()`;

test('AC-SOC-247 port order form sends the typed version 2 supplier lead and synthetic cutover',()=>{
 const h=boot(),s=h.run(started());h.render(s,true);
 const form=h.w.document.querySelector('#soc-number-port-order');assert.ok(form.elements.leadBusinessDays);assert.ok(form.elements.cutoverDelay);
 form.elements.leadBusinessDays.value='3';form.elements.cutoverDelay.value='6000';h.submit('#soc-number-port-order');
 assert.deepEqual(h.commands().at(-1),{type:'operations',command:{action:'portOrder',number:'+61255500101',target:'next-wave',leadBusinessDays:3,cutoverAt:s.clock+6000}});
 const locked=boot();locked.render(locked.run(started()),false);
 assert.equal(locked.w.document.querySelector('#soc-number-port-order button').disabled,true);
 h.close();locked.close();
});

test('AC-SOC-248 supplier response form sends explicit accept or rejection details',()=>{
 const h=boot();
 const s=h.run(`(()=>{let s=SOC.create();s=SOC.dispatch(s,{type:'operations',command:{action:'start'}});s=SOC.dispatch(s,{type:'advance',minutes:1});s=SOC.dispatch(s,{type:'operations',command:{action:'portOrder',number:'+61255500101',target:'next-wave',leadBusinessDays:1,cutoverAt:s.clock+3000}});while(s.clock<s.operations.portOrders[0].responseDueAt)s=SOC.dispatch(s,{type:'advance',minutes:60});return s;})()`);
 h.render(s,true);const form=h.w.document.querySelector('#soc-number-port-response');assert.ok(form);
 form.elements.accepted.value='false';form.elements.reason.value='DONOR_RECORD_MISMATCH';h.submit('#soc-number-port-response');
 assert.deepEqual(h.commands().at(-1),{type:'operations',command:{action:'portResponse',port:s.operations.portOrders[0].id,accepted:false,reason:'DONOR_RECORD_MISMATCH'}});
 h.close();
});
