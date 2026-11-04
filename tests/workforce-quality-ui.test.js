const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
const fixture=require('./lib/workforce-quality-fixture');
const {SOC,base,record,failedRecord,recording,send,pending,quality,tick,ready,review,journey}=fixture;

function boot(state){
 const h=load(),w=h.dom.window;
 h.ev(`SCT.state=JSON.parse(${JSON.stringify(JSON.stringify(state))});SCT.locked=true;SCT.busy=false;window.__qualityCommands=[];window.__qualityError=null;window.socApply=command=>{window.__qualityCommands.push(JSON.parse(JSON.stringify(command)));SCT.state=SOC.dispatch(SCT.state,{...command,expectedRevision:SCT.state.revision});window.__qualityError=null;window.__renderQualityPanel();};window.socError=error=>{window.__qualityError=String(error?.message||error);};window.__renderQualityPanel=(override)=>{let mount=document.getElementById('quality-ui-test-mount');if(!mount){mount=document.createElement('div');mount.id='quality-ui-test-mount';document.body.appendChild(mount);}const state=SCT.viewState||SCT.state;mount.innerHTML=socWorkforceQualityPanel(state,override||SOC.calculate(state));socBindWorkforceQuality(state);};window.__renderQualityPanel();`);
 const submit=selector=>{const form=w.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 const advance=(minutes=1)=>h.ev(`SCT.state=SOC.dispatch(SCT.state,{type:'advance',minutes,expectedRevision:SCT.state.revision});window.__renderQualityPanel();`);
 return {h,w,submit,advance,state:()=>JSON.parse(JSON.stringify(h.ev('SCT.state'))),commands:()=>JSON.parse(JSON.stringify(w.__qualityCommands)),error:()=>w.__qualityError,render:(locked=true,override)=>{h.ev(`SCT.locked=${locked};`);if(override)h.ev(`window.__renderQualityPanel(JSON.parse(${JSON.stringify(JSON.stringify(override))}));`);else h.ev('window.__renderQualityPanel();');},close:()=>w.close()};
}
function pendingIntegration(){return tick(pending(record(base())));}

test('AC-SOC-575 quality console starts through SOC dispatch and renders as an optional separate offer',()=>{
 const h=boot(base()),w=h.w,section=()=>w.document.querySelector('#soc-workforce-quality');
 assert.ok(section());assert.match(section().textContent,/Queueberry/);assert.equal(section().querySelector('[data-workforce-quality="start"] button').disabled,false);
 h.submit('[data-workforce-quality="start"]');
 assert.ok(h.state().workforceQuality);assert.deepEqual(h.commands().map(x=>[x.type,x.command.action]),[['workforce-quality','start']]);
 assert.match(section().textContent,/quality-review/);assert.equal(h.error(),null);assert.deepEqual(h.h.errors,[]);h.close();
});

test('AC-SOC-576 quality console repairs an observed integration failure then submits criterion scores for a real recorded call',()=>{
 const h=boot(pendingIntegration()),w=h.w,section=()=>w.document.querySelector('#soc-workforce-quality'),s0=h.state(),i=s0.interactions.at(-1),recording=s0.records.find(r=>r.kind==='recording'&&r.interaction===i.id);
 assert.ok(recording);assert.equal(i.phase,'resolved');assert.equal(section().querySelector('[data-workforce-quality="review"] fieldset').disabled,true);
 let observe=w.document.querySelector('[data-workforce-quality="observe"]');observe.elements.supplierAvailable.value='false';observe.elements.applicationAvailable.value='true';h.submit('[data-workforce-quality="observe"]');section().querySelector('[data-workforce-quality-action="test"]').click();
 assert.equal(h.state().workforceQuality.integration.tests.at(-1).status,'failed');assert.match(section().textContent,/Failed/);
 observe=w.document.querySelector('[data-workforce-quality="observe"]');observe.elements.supplierAvailable.value='true';observe.elements.applicationAvailable.value='true';h.submit('[data-workforce-quality="observe"]');section().querySelector('[data-workforce-quality-action="test"]').click();
 assert.equal(h.state().workforceQuality.integration.tests.at(-1).status,'passed');const form=w.document.querySelector('[data-workforce-quality="review"]');assert.equal(form.querySelector('fieldset').disabled,false);
 for(const input of form.querySelectorAll('[name^="score-"]'))input.value='4';h.submit('[data-workforce-quality="review"]');
 const review=h.state().workforceQuality.reviews.at(-1);assert.equal(review.interactionId,i.id);assert.equal(review.caseId,i.caseId);assert.equal(review.recording.id,recording.id);assert.equal(review.total,80);assert.equal(review.passed,true);assert.ok(review.billingReceipt);assert.deepEqual(Object.keys(h.commands().at(-1).command).sort(),['action','interactionId','reviewer','scores']);
 assert.match(section().textContent,/80 \/ 100/);assert.deepEqual(h.h.errors,[]);h.close();
});

test('AC-SOC-577 low score recommendation is shown without starting coaching or changing the workforce roster',()=>{
 const state=journey({variant:'low-score'}).expectedState,h=boot(state),w=h.w,roster=structuredClone(state.workforceOps.roster),section=w.document.querySelector('#soc-workforce-quality');
 assert.equal(state.workforceQuality.reviews.at(-1).passed,false);assert.ok(SOC.calculate(state).workforceQuality.recommendations.length);
 assert.match(section.textContent,/coaching recommendation only/i);assert.match(section.textContent,/agent-01/);assert.deepEqual(h.state().workforceOps.roster,roster);assert.equal(h.commands().length,0);assert.deepEqual(h.h.errors,[]);h.close();
});

test('AC-SOC-578 quality history labels partial-call coverage and held recordings from captured evidence',()=>{
 let partial=review(ready(failedRecord()));assert.equal(partial.workforceQuality.reviews[0].recording.captureScope,'partial');
 let held=ready(record(base())),recordId=recording(held).id;held=send(held,'information',{action:'hold',record:recordId,role:'supervisor',held:true});held=review(held);assert.equal(held.workforceQuality.reviews[0].recording.heldAtReview,true);
 const a=boot(partial),b=boot(held);assert.match(a.w.document.querySelector('#soc-workforce-quality').textContent,/Partial recording coverage/);assert.match(b.w.document.querySelector('#soc-workforce-quality').textContent,/Recording was held during review/);assert.deepEqual(a.h.errors,[]);assert.deepEqual(b.h.errors,[]);a.close();b.close();
});

test('AC-SOC-579 quality UI is read-only without the save lock, escapes evidence text and leaves state untouched while rendering',()=>{
 const state=journey().expectedState,h=boot(state),w=h.w,before=JSON.stringify(h.state()),results=SOC.calculate(state);results.workforceQuality.eligibleInteractions[0].caseId='<img src=x onerror=alert(1)>';
 h.render(false,results);const section=w.document.querySelector('#soc-workforce-quality');assert.equal(JSON.stringify(h.state()),before);for(const control of section.querySelectorAll('button,input,select,textarea'))assert.equal(control.disabled,true);assert.equal(section.querySelector('img'),null);assert.match(section.textContent,/<img src=x onerror=alert\(1\)>/);h.submit('[data-workforce-quality="review"]');assert.equal(JSON.stringify(h.state()),before);assert.equal(h.commands().length,0);assert.deepEqual(h.h.errors,[]);h.close();
});
