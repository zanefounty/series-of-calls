const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const runner=require('../scripts/browser-campaigns');
const {load}=require('./harness');

test('AC-SOC-395 compact browser matrix includes every scenario, jurisdiction and mode exactly once',()=>{
 const rows=runner.matrix();assert.equal(rows.length,4*4*3);
 assert.equal(new Set(rows.map(x=>`${x.scenario}/${x.jurisdiction}/${x.mode}`)).size,48);
 for(const scenario of Object.keys(SOC.scenarios))for(const jurisdiction of SOC.jurisdictions)for(const mode of ['guided','assessed','sandbox'])assert.ok(rows.some(x=>x.scenario===scenario&&x.jurisdiction===jurisdiction&&x.mode===mode));
 assert.match(runner.SCOPE,/does not run the four-window campaign/i);
});

test('AC-SOC-396 each SOC.reference command has a visible browser action mapping for all 48 profiles',()=>{
 for(const profile of runner.matrix()){
  const state=SOC.create(profile),mapped=runner.mappedReference(state);
  assert.deepEqual(mapped.map(x=>x.command),SOC.reference(state));
  for(const {command,ui} of mapped){
   if(command.type==='configure'){assert.equal(ui.kind,'resource-form');assert.equal(ui.fields,command.config);assert.match(ui.select,/data-soc="select"/);assert.equal(ui.form,'#soc-config');}
   else if(command.type==='advance'){assert.equal(ui.kind,'clock-buttons');assert.ok(ui.buttons.every(x=>x.startsWith('[data-soc=')));}
   else if(command.type==='interact'){assert.equal(ui.kind,'interaction-form');assert.equal(ui.form,'#soc-journey-controls form');assert.equal(ui.fields.caseId,command.caseId);}
   else if(command.type==='meeting'||command.type==='connect'){assert.equal(ui.kind,'button');assert.match(ui.selector,/data-soc/);}
   else assert.fail(`unmapped reference command ${command.type}`);
  }
  assert.ok(mapped.some(x=>x.command.type==='interact'));assert.ok(mapped.some(x=>x.command.type==='meeting'));
 }
});

test('AC-SOC-397 core reference paths satisfy SOC.assess across the full profile matrix without hidden pack setup',()=>{
 for(const profile of runner.matrix()){
  let state=SOC.create(profile);for(const command of SOC.reference(state))state=SOC.dispatch(state,command);
  assert.equal(state.information,undefined,`${profile.scenario}/${profile.jurisdiction}/${profile.mode} uses the core reference path`);
  const result=SOC.assess(state);assert.equal(result.passed,true,`${profile.scenario}/${profile.jurisdiction}/${profile.mode}: ${result.missing.join(',')}`);
 }
});

test('AC-SOC-398 browser selection and diagnostic limit are configurable but bounded',()=>{
 assert.deepEqual(runner.parseArgs(['--browser','firefox','--limit','2']),{list:false,browser:'firefox',limit:2});
 assert.deepEqual(runner.parseArgs(['--browser=webkit','--limit=48']),{list:false,browser:'webkit',limit:48});
 assert.throws(()=>runner.parseArgs(['--browser','edge']),/BROWSER_MUST_BE/);
 assert.throws(()=>runner.parseArgs(['--limit','49']),/LIMIT_MUST_BE/);
 assert.equal(runner.matrix().slice(0,runner.parseArgs(['--limit=1']).limit).length,1);
});

test('AC-SOC-399 reference clock mapping preserves every minute for 1 through 1440 minute advances',()=>{
 for(const minutes of [1,2,4,5,6,9,10,59,60,1440]){
  const plan=runner.advanceButtonPlan(minutes);assert.equal(plan.five*5+plan.minute,minutes);assert.ok(plan.minute>=0&&plan.minute<=4);
 }
 assert.throws(()=>runner.advanceButtonPlan(0),/INVALID_ADVANCE_MINUTES/);assert.throws(()=>runner.advanceButtonPlan(1441),/INVALID_ADVANCE_MINUTES/);
});

test('AC-SOC-399a interaction form commits its last field before the visible enabled pointer submit',async()=>{
 const order=[],submit={waitFor:async options=>{order.push(`wait:${options.state}`);},isEnabled:async()=>{order.push('enabled');return true;},click:async options=>{order.push(`pointer:${options.timeout}`);}};
 const form={locator:selector=>selector==='button[type="submit"]'?submit:{press:async(key,options)=>{order.push(`key:${key}:${options.timeout}`);}}};
 const ready=await runner.prepareJourneySubmit(form,{channel:'voice',from:'alex',to:'+61255500201',caseId:'browser-case'});
 assert.equal(ready,submit);await ready.click({timeout:10000});
 assert.deepEqual(order,['key:Escape:10000','key:Tab:10000','wait:visible','enabled','pointer:10000']);
 const disabled={...submit,isEnabled:async()=>false};
 await assert.rejects(()=>runner.prepareJourneySubmit({locator:selector=>selector==='button[type="submit"]'?disabled:{press:async()=>{}}},{caseId:'browser-case'}),/JOURNEY_FORM_SUBMIT_DISABLED/);
});

test('AC-SOC-400 only a complete error-free locked-version browser matrix can report passed',()=>{
 const all=Array.from({length:48*runner.VIEWPORTS.length},()=>({status:'passed',errors:[]}));
 const complete={status:'running',profileCount:48,results:all,versions:{source:'1.0.0',lockfile:'1.0.0'},browser:{playwright:'1.56.0',playwrightLockfile:'1.56.0',version:'Chromium 140'}};
 assert.equal(runner.classifyReport(complete),'passed');
 assert.equal(runner.classifyReport({...complete,profileCount:1,results:all.slice(0,3)}),'diagnostic');
 assert.equal(runner.classifyReport({...complete,browser:{...complete.browser,playwright:'1.62.1'}}),'diagnostic');
 assert.equal(runner.classifyReport({...complete,versions:{source:'1.0.1',lockfile:'1.0.0'}}),'diagnostic');
 assert.equal(runner.classifyReport({...complete,results:[...all.slice(0,-1),{status:'failed',errors:['trace:write failed']}]}),'failed');
 assert.equal(runner.classifyReport({...complete,status:'blocked'}),'blocked');
 assert.deepEqual(runner.inputDrift({a:'one',b:'same'},{a:'two',c:'new'}),[{file:'a',before:'one',after:'two'},{file:'b',before:'same',after:null},{file:'c',before:null,after:'new'}]);
});

test('AC-SOC-401 page wait predicates use the lexical SCT binding and the mapped config submits through real UI dispatch',()=>{
 const h=load(),{dom,ev}=h,w=dom.window;
 try{
  ev(`SCT.state=SOC.create({scenario:'smb',jurisdiction:'AU',mode:'guided'});SCT.locked=true;socRender();`);
  assert.equal(ev('typeof window.SCT'),'undefined');assert.equal(ev('('+runner.pageIsIdle.toString()+')()'),true);
  assert.equal(ev('('+runner.pageRevisionPast.toString()+')(-1)'),true);assert.equal(ev('('+runner.pageRevisionPast.toString()+')(0)'),false);
  ev('SCT.busy=true');assert.equal(ev('('+runner.pageIsIdle.toString()+')()'),false);ev('SCT.busy=false');
  const state=SOC.create({scenario:'smb',jurisdiction:'AU',mode:'guided'}),command=SOC.reference(state).find(x=>x.type==='configure'),ui=runner.referenceUiAction(command);
  ev(`SCT.state=SOC.create({scenario:'smb',jurisdiction:'AU',mode:'guided'});SCT.locked=true;socRender();`);
  w.document.querySelector(ui.select).click();const form=w.document.querySelector(ui.form);
  for(const [name,value] of Object.entries(ui.fields)){const control=form.elements[name];assert.ok(control,`missing visible field ${name}`);control.value=String(value);}
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const submitted=JSON.parse(ev('JSON.stringify(SCT.state.commands.at(-1).command)'));
  assert.equal(submitted.type,command.type);assert.equal(submitted.id,command.id);assert.equal(submitted.config.people,command.config.people);assert.equal(submitted.config.operator,'player');assert.ok(submitted.config.enabled,'UI submits the visible full desired configuration through the shared dispatcher');
 }finally{dom.window.close();}
});
