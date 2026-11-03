const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
const boot=()=>{
 const {dom,ev,errors}=load(),w=dom.window;
 ev(`window.__error=null;window.__state=SOC.create();socApply=(command)=>{try{window.__state=SOC.dispatch(window.__state,command);}catch(e){window.__error=String(e.message||e);}};socError=(error)=>{window.__error=String(error?.message||error);};`);
 const dispatch=command=>{w.__state=ev(`SOC.dispatch(window.__state,${JSON.stringify(command)})`);return w.__state;};
 const render=()=>ev(`SCT.state=window.__state;SCT.locked=true;let mount=document.getElementById('bpo-ui-test-mount');if(!mount){mount=document.createElement('div');mount.id='bpo-ui-test-mount';document.body.appendChild(mount);}mount.innerHTML=socServiceAdminPanel(SCT.state,SOC.calculate(SCT.state));socBindServiceAdmin();`);
 const submit=selector=>{const form=w.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 return {dom,w,ev,dispatch,render,submit,errors};
};

test('AC-SOC-367 roster form submits structured breaks through dispatch and renders independent adherence fields',()=>{
 const h=boot();h.dispatch({type:'workforce',command:{action:'start'}});h.render();
 const form=h.w.document.querySelector('[data-sa-form=roster]');form.querySelector('[name=newPersonId]').value='agent-01';form.querySelector('[name=newEntitlements]').value='seat-01';form.querySelector('[name=newBreakStart]').value='1';form.querySelector('[name=newBreakEnd]').value='3';h.submit('[data-sa-form=roster]');
 assert.equal(h.w.__error,null);assert.deepEqual(JSON.parse(JSON.stringify(h.w.__state.workforceOps.roster.desired[0].breaks)),[{start:1,end:3}]);
 h.dispatch({type:'advance',minutes:1});h.render();
 const row=h.w.document.querySelector('[data-adherence-person="agent-01"]');assert.ok(row);assert.match(row.textContent,/Scheduled availability: Unavailable/);assert.match(row.textContent,/Actual attendance: Available/);assert.match(row.textContent,/On break: Yes/);
 assert.ok(h.w.document.querySelector('[data-sa-form=roster] fieldset[disabled]')===null,'player roster remains editable');
 h.dom.window.close();
});

test('AC-SOC-368 roster form rejects incomplete break intervals and customer operated staffing is read only',()=>{
 const h=boot();h.dispatch({type:'workforce',command:{action:'start'}});h.render();
 const form=h.w.document.querySelector('[data-sa-form=roster]');form.querySelector('[name=newPersonId]').value='agent-01';form.querySelector('[name=newEntitlements]').value='seat-01';form.querySelector('[name=newBreakStart]').value='10';h.submit('[data-sa-form=roster]');
 assert.match(h.w.__error,/INVALID_WORKFORCE_PERSON/);assert.equal(h.w.__state.workforceOps.roster.desired.length,0,'invalid desired profiles are not committed');
 h.dispatch({type:'workforce',command:{action:'roster',people:[{id:'agent-01',employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,breaks:[],available:true,digitalConcurrency:1,entitlements:['seat-01']}]}});h.dispatch({type:'advance',minutes:1});
 h.w.__state.workforceOps.operator='customer';h.render();
 const roster=h.w.document.querySelector('[data-sa-form=roster]');assert.equal(roster.querySelector('fieldset').disabled,true);assert.equal(roster.querySelector('button').disabled,true);
 assert.equal(h.w.document.querySelector('[data-sa-availability] button').disabled,true);assert.equal(h.w.document.querySelector('[data-sa-form=agreement] button').disabled,true);assert.equal(h.w.document.querySelector('[data-sa-form=coach] button').disabled,true);
 h.dom.window.close();
});
