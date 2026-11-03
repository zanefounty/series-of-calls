const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');

function boot(){
 const {dom,ev,errors}=load(),w=dom.window;
 ev(`window.__commands=[];window.__uiError=null;window.__uiState=null;window.__uiResults=null;socApply=(command)=>window.__commands.push(JSON.parse(JSON.stringify(command)));socError=(error)=>{window.__uiError=String(error?.message||error);};`);
 const render=(state,results={},locked=true)=>{w.__uiState=state;w.__uiResults=results;w.__locked=locked;ev(`SCT.state=window.__uiState;SCT.viewState=window.__uiState;SCT.locked=window.__locked;SCT.busy=false;let mount=document.getElementById('lifecycle-test-mount');if(!mount){mount=document.createElement('div');mount.id='lifecycle-test-mount';document.body.appendChild(mount);}mount.innerHTML=socSpecialistLifecyclePanel(SCT.state,window.__uiResults);socBindSpecialistLifecycle();`);};
 const submit=selector=>{const form=w.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));if(w.__uiError)throw Error(w.__uiError);};
 const commands=()=>JSON.parse(JSON.stringify(w.__commands));
 return {dom,w,ev,errors,render,submit,commands};
}
function state(started=false){return {clock:2,products:{deployments:[{id:'room-suite',generation:3,effective:{productVersion:'scenario-2'},provisioning:{status:'ready'}},{id:'pending-room',generation:1,effective:null,provisioning:{status:'pending'}}]},business:{organisations:{'orchard-msp':{name:'Orchard MSP',roles:['msp']},'customer':{name:'Customer',roles:['customer']}}},specialistLifecycle:started?{pack:'soc-specialist-lifecycle-1',version:1,nextId:1,records:[],effectiveRecords:[],renewalChecks:[]}:null};}

test('AC-SOC-235 lifecycle admin starts through dispatch and records typed axes for an effective deployment',()=>{
 const h=boot(),s=state(false);h.render(s,{},true);
 const panel=h.w.document.getElementById('soc-specialist-lifecycle');assert.match(panel.textContent,/Specialist product lifecycle evidence/);assert.doesNotMatch(panel.textContent,/pending-room/);
 h.w.document.querySelector('[data-lifecycle-action="start"]').click();assert.deepEqual(h.commands().at(-1),{type:'specialist-lifecycle',command:{action:'start'}});
 const started=state(true);h.render(started,{},true);const form=h.w.document.querySelector('[data-lifecycle-record-form]');
 form.elements.deploymentId.value='room-suite';form.elements.supportOwnerId.value='orchard-msp';form.elements.evidenceType.value='internal-test';form.elements.evidenceDate.value='2026-10-30';form.elements.sale.value='ended';form.elements.renewal.value='eligible';form.elements.support.value='supported';h.submit('[data-lifecycle-record-form]');
 assert.deepEqual(h.commands().at(-1),{type:'specialist-lifecycle',command:{action:'record',deploymentId:'room-suite',supportOwnerId:'orchard-msp',evidenceType:'internal-test',evidenceDate:'2026-10-30',sale:'ended',renewal:'eligible',support:'supported'}});
 assert.match(panel.textContent,/does not establish real product availability/);assert.deepEqual(h.errors,[]);h.dom.window.close();
});

test('AC-SOC-236 renewal controls require current evidence and show independent readiness without a raw command terminal',()=>{
 const h=boot(),s=state(true),results={specialistLifecycle:{deployments:[{deploymentId:'room-suite',status:'ready',evidenceReady:true,supportedEvidenceReady:true,renewalReadiness:true,renewalReasons:[],axes:{sale:'ended',renewal:'eligible',support:'supported'}}]}};
 const rec={id:'lifecycle-evidence-1',deploymentId:'room-suite',supportOwnerId:'orchard-msp',evidenceType:'internal-test',evidenceDate:'2026-10-30',sale:'ended',renewal:'eligible',support:'supported',scope:{version:'scenario-2',generation:3,features:['room-devices']},status:'ready',failureCode:null};s.specialistLifecycle.records=[rec];s.specialistLifecycle.effectiveRecords=[{deploymentId:'room-suite',evidenceId:rec.id}];s.specialistLifecycle.nextId=2;
 h.render(s,results,true);const row=h.w.document.querySelector('[data-lifecycle-deployment="room-suite"]');assert.match(row.textContent,/Current evidence ready: ✓/);assert.match(row.textContent,/Renewal readiness: ✓/);assert.equal(row.querySelector('[data-lifecycle-action="renewal-check"]').disabled,false);
 row.querySelector('[data-lifecycle-action="renewal-check"]').click();assert.deepEqual(h.commands().at(-1),{type:'specialist-lifecycle',command:{action:'renewal-check',deploymentId:'room-suite'}});
 results.specialistLifecycle.deployments[0].renewalReadiness=false;results.specialistLifecycle.deployments[0].renewalReasons=['SUPPORT_ENDED'];h.render(s,results,true);assert.equal(h.w.document.querySelector('[data-lifecycle-deployment="room-suite"] [data-lifecycle-action="renewal-check"]').disabled,false);assert.match(h.w.document.querySelector('#soc-specialist-lifecycle').textContent,/SUPPORT_ENDED/);
 h.render(state(true),{},false);assert.equal([...h.w.document.querySelectorAll('#soc-specialist-lifecycle button')].every(b=>b.disabled),true);assert.doesNotMatch(h.w.document.querySelector('#soc-specialist-lifecycle').textContent,/\{\s*"/);
 assert.deepEqual(h.errors,[]);h.dom.window.close();
});
