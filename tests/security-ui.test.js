const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');

function boot(){
 const {dom,ev,errors}=load(),w=dom.window;
 ev(`window.__commands=[];window.__uiState=SOC.create();window.__uiError=null;socApply=(command)=>{window.__commands.push(JSON.parse(JSON.stringify(command)));window.__uiState=SOC.dispatch(window.__uiState,command);SCT.state=window.__uiState;};socError=(error)=>{window.__uiError=String(error?.message||error);};`);
 const render=(locked=true)=>{w.__locked=locked;ev(`SCT.state=window.__uiState;SCT.locked=window.__locked;let m=document.getElementById('security-test-mount');if(!m){m=document.createElement('div');m.id='security-test-mount';document.body.appendChild(m);}m.innerHTML=socSecurityPanel(SCT.state,SOC.calculate(SCT.state));socBindSecurity();`);};
 const submit=selector=>{const f=w.document.querySelector(selector);assert.ok(f,selector);f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));if(w.__uiError)throw Error(w.__uiError);};
 return {dom,w,ev,errors,render,submit,commands:()=>JSON.parse(JSON.stringify(w.__commands))};
}

test('AC-SOC-199 optional security controls start through shared dispatch and stay locked in read-only mode',()=>{
 const h=boot();h.render(false);const start=h.w.document.querySelector('[data-security-start] button');assert.ok(start);assert.equal(start.disabled,true);assert.match(h.w.document.querySelector('#soc-security-admin').textContent,/Read only/);
 h.render(true);h.submit('[data-security-start]');assert.equal(h.w.__uiState.admissionSecurity.pack,'soc-admission-security-1');assert.deepEqual(h.commands(),[{type:'admission-security',command:{action:'start'}}]);
 h.render(false);for(const el of h.w.document.querySelectorAll('#soc-security-admin button,#soc-security-admin input,#soc-security-admin select'))assert.equal(el.disabled,true);h.dom.window.close();
});

test('AC-SOC-200 typed controls, observations and synthetic diagnostics dispatch accurately; real calls use ordinary core interaction',()=>{
 const h=boot();h.render(true);h.submit('[data-security-start]');
 h.render(true);let f=h.w.document.querySelector('[data-security-form="configure-network"]');f.elements.enabled.checked=true;f.elements.capacityPps.value='100';f.elements.mitigationPps.value='1000';h.submit('[data-security-form="configure-network"]');
 h.render(true);f=h.w.document.querySelector('[data-security-form="configure-sip"]');f.elements.enabled.checked=true;h.submit('[data-security-form="configure-sip"]');
 h.render(true);f=h.w.document.querySelector('[data-security-form="configure-destination"]');f.elements.enabled.checked=true;f.elements.allowedPrefixes.value='+612';f.elements.perCallMaxCents.value='500';f.elements.windowSpendLimitCents.value='1000';f.elements.windowMinutes.value='60';h.submit('[data-security-form="configure-destination"]');
 h.render(true);h.submit('[data-security-form="peer"]');h.submit('[data-security-form="packets"]');h.submit('[data-security-form="signalling"]');
 h.ev(`window.__uiState=SOC.dispatch(window.__uiState,{type:'advance',minutes:1});`);h.render(true);h.submit('[data-security-form="call"]');
 const commands=h.commands();assert.equal(commands.find(x=>x.command?.action==='configure'&&x.command.control==='network').command.config.mitigationPps,1000);assert.equal(commands.find(x=>x.command?.action==='peer').command.id,'synthetic-carrier');assert.equal(commands.find(x=>x.command?.action==='inject-packets').command.secondOffset,0);assert.equal(commands.find(x=>x.command?.action==='inject-signalling').command.method,'INVITE');
 assert.deepEqual(commands.at(-1),{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'security-call-1'});assert.ok(h.w.__uiState.interactions.some(i=>i.caseId==='security-call-1'));
 assert.match(h.w.document.querySelector('#soc-security-admin').textContent,/synthetic/i);assert.equal(h.w.__uiError,null);h.dom.window.close();
});
