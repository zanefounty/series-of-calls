const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
const SOC=require('../src/game/55-communications');
const send=(s,type,command)=>SOC.dispatch(s,{type,command});
const tick=(s,minutes=1)=>SOC.dispatch(s,{type:'advance',minutes});
function prepared({business=true}={}){
 let s=SOC.create({scenario:'enterprise'});
 if(business)s=send(s,'business',{action:'start'});
 s=send(s,'workforce',{action:'start'});return tick(s);
}
function boot(initialState){
 const h=load(),w=h.dom.window;
 h.ev(`SCT.state=JSON.parse(${JSON.stringify(JSON.stringify(initialState))});SCT.locked=true;SCT.busy=false;window.__coachCommands=[];window.__coachError=null;window.__renderAdmin=()=>{let mount=document.getElementById('coach-admin-ui-test');if(!mount){mount=document.createElement('div');mount.id='coach-admin-ui-test';document.body.appendChild(mount);}mount.innerHTML=socServiceAdminPanel(SCT.state,SOC.calculate(SCT.state));socBindServiceAdmin();};window.socApply=command=>{try{const applied={...command,expectedRevision:SCT.state.revision};window.__coachCommands.push(JSON.parse(JSON.stringify(command)));SCT.state=SOC.dispatch(SCT.state,applied);window.__coachError=null;window.__renderAdmin();}catch(error){window.__coachError=String(error?.message||error);}};window.__renderAdmin();`);
 const submit=selector=>{const form=w.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 const advance=minutes=>{const next=SOC.dispatch(h.ev('SCT.state'),{type:'advance',minutes,expectedRevision:h.ev('SCT.state.revision')});h.ev(`SCT.state=JSON.parse(${JSON.stringify(JSON.stringify(next))});window.__renderAdmin();`);};
 const render=locked=>h.ev(`SCT.locked=${Boolean(locked)};window.__renderAdmin();`);
 const currentState=()=>JSON.parse(h.ev('JSON.stringify(SCT.state)'));
 return {h,w,submit,advance,render,state:currentState,commands:()=>JSON.parse(JSON.stringify(w.__coachCommands)),error:()=>w.__coachError,close:()=>w.close()};
}
function coach(h,{costCents,skill='billing',minutes=2}={}){
 const form=h.w.document.querySelector('[data-sa-form="coach"]');assert.ok(form);
 form.elements.person.value='agent-01';form.elements.skill.value=skill;form.elements.minutes.value=String(minutes);form.elements.costCents.value=String(costCents);
 h.submit('[data-sa-form="coach"]');
}
function jobRow(h,id){const row=h.w.document.querySelector(`[data-coaching-job="${id}"]`);assert.ok(row,`missing coaching row ${id}`);return row;}

test('AC-SOC-590 coaching admin history shows typed posted charge and one ledger receipt through delayed completion',()=>{
 const h=boot(prepared()),beforeBalance=h.state().business.balance.cash;
 const addPerson=[...h.w.document.querySelectorAll('[data-sa-form="roster"] fieldset fieldset')].find(x=>x.querySelector('legend')?.textContent==='Add person');assert.ok(addPerson,'add-person editor should be visible');
 const addPersonLabels={newPersonId:'Person ID',newEmployer:'Employer organisation',newSkills:'Skills (comma separated)',newLanguages:'Languages (comma separated)',newShiftStart:'Shift start minute of day',newShiftEnd:'Shift end minute of day',newBreakStart:'Break start minute of day',newBreakEnd:'Break end minute of day',newConcurrency:'Digital concurrency',newEntitlements:'Named seat entitlements (comma separated)',newAvailable:'Available for assignment'};
 for(const [name,labelText] of Object.entries(addPersonLabels)){const input=addPerson.querySelector(`[name="${name}"]`),label=input?.closest('label')?.textContent||'';assert.ok(label.includes(labelText),`${name} should display its localized human label`);assert.ok(!label.includes(name),`${name} must not be shown as an implementation field name`);}
 coach(h,{costCents:125});
 let s=h.state(),job=s.workforceOps.coaching.at(-1),rows=s.business.ledger.filter(x=>x.reason==='workforce-coaching');
 assert.deepEqual(h.commands(),[{type:'workforce',command:{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents:125}}]);
 assert.equal(h.error(),null);assert.equal(job.status,'in-progress');assert.equal(job.due,s.clock+2);assert.equal(job.commercialReceipt.status,'posted');assert.equal(job.commercialReceipt.cents,125);assert.equal(job.commercialReceipt.unit,'AUD-cent');assert.equal(rows.length,1);assert.equal(rows[0].id,job.commercialReceipt.entryId);assert.equal(s.business.balance.cash,beforeBalance-125);
 let row=jobRow(h,job.id);assert.match(row.textContent,/agent-01/);assert.match(row.textContent,/billing/);assert.match(row.textContent,/In progress/);assert.match(row.textContent,/Due at minute 3/);assert.match(row.textContent,/Posted charge: 125 AUD-cent/);assert.match(row.textContent,new RegExp(job.commercialReceipt.entryId));assert.doesNotMatch(row.textContent,/\[object Object\]/);
 const beforeCalculation=JSON.stringify(h.state());SOC.calculate(h.state());SOC.calculate(h.state());assert.equal(JSON.stringify(h.state()),beforeCalculation);assert.equal(h.state().business.ledger.filter(x=>x.reason==='workforce-coaching').length,1);
 h.advance(1);s=h.state();assert.equal(s.workforceOps.coaching.at(-1).status,'in-progress');assert.equal(s.business.ledger.filter(x=>x.reason==='workforce-coaching').length,1);assert.equal(jobRow(h,job.id).textContent.includes(job.commercialReceipt.entryId),true);
 h.advance(1);s=h.state();job=s.workforceOps.coaching.at(-1);rows=s.business.ledger.filter(x=>x.reason==='workforce-coaching');assert.equal(job.status,'complete');assert.equal(job.completedAt,job.due);assert.equal(rows.length,1);assert.equal(rows[0].id,job.commercialReceipt.entryId);assert.equal(s.business.balance.cost,125);row=jobRow(h,job.id);assert.match(row.textContent,/Complete/);assert.match(row.textContent,/Completed at clock minute 3/);assert.match(row.textContent,new RegExp(job.commercialReceipt.entryId));assert.deepEqual(h.h.errors,[]);h.close();
});

test('AC-SOC-591 zero receipts are explicit while standalone coaching stays visibly unbilled after business starts',()=>{
 const charged=boot(prepared());coach(charged,{costCents:0,minutes:1});
 let s=charged.state(),zero=s.workforceOps.coaching.at(-1),row=jobRow(charged,zero.id);
 assert.equal(zero.commercialReceipt.status,'zero');assert.equal(zero.commercialReceipt.cents,0);assert.equal(zero.commercialReceipt.entryId,null);assert.equal(s.business.ledger.filter(x=>x.reason==='workforce-coaching').length,0);assert.match(row.textContent,/Explicit zero charge: 0 AUD-cent/);assert.match(row.textContent,/Business cost ledger entry: None/);assert.deepEqual(charged.h.errors,[]);charged.close();

 const standalone=boot(prepared({business:false}));standalone.render(false);const before=JSON.stringify(standalone.state());assert.equal(standalone.w.document.querySelector('[data-sa-form="coach"] button').disabled,true);assert.equal(JSON.stringify(standalone.state()),before);standalone.render(true);
 coach(standalone,{costCents:900,minutes:2});
 s=standalone.state();let legacy=s.workforceOps.coaching.at(-1);assert.equal(legacy.commercialReceipt,undefined);assert.equal(s.business,undefined);row=jobRow(standalone,legacy.id);assert.match(row.textContent,/No commercial receipt \(legacy or standalone; no charge recorded\)/);
 s=send(s,'business',{action:'start'});s=tick(s,2);standalone.h.ev(`SCT.state=JSON.parse(${JSON.stringify(JSON.stringify(s))});window.__renderAdmin();`);legacy=standalone.state().workforceOps.coaching.at(-1);assert.equal(legacy.status,'complete');assert.equal(legacy.commercialReceipt,undefined);assert.equal(standalone.state().business.ledger.filter(x=>x.reason==='workforce-coaching').length,0);assert.match(jobRow(standalone,legacy.id).textContent,/Complete/);assert.match(jobRow(standalone,legacy.id).textContent,/No commercial receipt \(legacy or standalone; no charge recorded\)/);assert.doesNotMatch(jobRow(standalone,legacy.id).textContent,/AUD-cent|ledger entry/i);assert.deepEqual(standalone.h.errors,[]);standalone.close();
});
