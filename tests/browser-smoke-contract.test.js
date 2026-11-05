'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness'),runner=require('../scripts/browser-smoke');
const {verifyCheckpoint}=require('../scripts/lib/campaign-journey');

test('canonical browser smoke Training lesson controls reach all ten real SMB checkpoints without raw authoring forms',()=>{
 const h=load(),{dom,ev}=h,d=dom.window.document;
 try{
  ev("SCT.state=SOC.create({experience:'training',scenario:'smb',jurisdiction:'AU',mode:'guided'});SCT.locked=true;SCT.error='';socRender();");
  const plan=runner.trainingSmokePlan(),checkpoints=[];
  for(const step of plan.steps){
   const state=JSON.parse(ev('JSON.stringify(SCT.state)'));
   if(step.checkpoint){checkpoints.push(verifyCheckpoint(state,step.checkpoint));continue;}
   const action=runner.trainingLessonAction(step.command,state);if(action.alreadyConfigured)continue;
   assert.ok(d.querySelector('#soc-training-map'));assert.equal(d.querySelector('#soc-config'),null);
   const control=d.querySelector(action.selector);assert.ok(control,action.selector);assert.equal(control.disabled,false);control.click();
   assert.equal(ev('SCT.error'),'');assert.ok(ev('SCT.state.revision')>state.revision);assert.equal(ev('SCT.state.experience.kind'),'training');assert.equal(ev('SCT.state.providerCampaign'),undefined);
  }
  assert.deepEqual(checkpoints.map(x=>x.kind),['window','window','incident','window','orders-pending','orders-active','window','award','renewal-due','renewed']);assert.ok(checkpoints.every(x=>x.passed));assert.equal(ev('SCT.state.business.contracts.every(c=>c.status==="active"&&c.billedPeriods===3)'),true);assert.deepEqual(h.errors,[]);
 }finally{dom.window.close();}
});

test('canonical Training smoke refuses an unmapped authoring action instead of dispatching it invisibly',()=>{
 const SOC=require('../src/game/55-communications'),state=SOC.create({experience:'training'}),before=JSON.stringify(state);
 assert.throws(()=>runner.trainingLessonAction({type:'fault',id:'carrier',fault:'OUTAGE'},state),/NO_VISIBLE_TRAINING_LESSON_MAPPING/);assert.equal(JSON.stringify(state),before);
});


test('canonical smoke covers required desktop and mobile sizes with landscape as an explicit extra',()=>{
 assert.deepEqual(runner.smokeViewports(),[{width:1366,height:768},{width:1440,height:900},{width:390,height:844}]);assert.deepEqual(runner.smokeViewports(true).at(-1),{width:844,height:390});
});

test('browser input finalization refuses source addition, removal, change and built artifact drift without erasing the original failure',()=>{
 const source={hashes:{'scripts/browser-smoke.js':'driver','package-lock.json':'lock'},errors:[]},artifact={hashes:{'index.html':'page','sw.js':'worker'},errors:[]},base=()=>({status:'passed',sourceBefore:structuredClone(source),artifactBefore:structuredClone(artifact)});
 const valid=runner.finishInputEvidence(base(),source,artifact,true);assert.equal(valid.status,'passed');assert.equal(valid.noSourceDrift,true);assert.equal(valid.inputs['_site/index.html'],'page');assert.equal(valid.inputs['package-lock.json'],'lock');
 for(const after of [{hashes:{...source.hashes,'new-input.js':'new'},errors:[]},{hashes:{'package-lock.json':'lock'},errors:[]},{hashes:{...source.hashes,'package-lock.json':'changed'},errors:[]},{hashes:{...source.hashes,'package-lock.json':null},errors:[{path:'package-lock.json',code:'ENOENT'}]}]){
  const result=runner.finishInputEvidence(base(),after,artifact,true);assert.equal(result.status,'failed');assert.equal(result.noSourceDrift,false);assert.ok(result.sourceDrift.length);
 }
 const changed=runner.finishInputEvidence(base(),source,{hashes:{...artifact.hashes,'sw.js':'changed'},errors:[]},true);assert.equal(changed.status,'failed');assert.equal(changed.artifactDrift[0].file,'sw.js');
 const failed={...base(),status:'failed',error:'ORIGINAL_VISIBLE_CONTROL_FAILURE'};runner.finishInputEvidence(failed,{hashes:{},errors:[]},artifact,true);assert.equal(failed.error,'ORIGINAL_VISIBLE_CONTROL_FAILURE');
 const temporary=runner.finishInputEvidence({...base(),status:'diagnostic-passed'},source,artifact,false);assert.equal(temporary.status,'diagnostic-passed');assert.equal(temporary.inputs['_site/index.html'],undefined,'a temporary artifact must not masquerade as canonical build evidence');
});

test('browser manifest includes lesson and driver inputs and records missing files instead of losing the report',t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),directory=fs.mkdtempSync(path.join(os.tmpdir(),'soc-smoke-manifest-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));fs.mkdirSync(path.join(directory,'src'));fs.writeFileSync(path.join(directory,'src','one.js'),'original');fs.writeFileSync(path.join(directory,'package-lock.json'),'locked');
 const before=runner.manifest(directory,['src'],['package-lock.json']);fs.writeFileSync(path.join(directory,'src','one.js'),'changed');fs.writeFileSync(path.join(directory,'src','two.js'),'new');fs.unlinkSync(path.join(directory,'package-lock.json'));const after=runner.manifest(directory,['src'],['package-lock.json']);assert.deepEqual(runner.inputDrift(before,after).map(x=>x.file),['package-lock.json','src/one.js','src/two.js']);assert.equal(after.hashes['package-lock.json'],null);assert.equal(after.errors[0].code,'ENOENT');
 const actual=runner.sourceInputs();for(const name of ['scripts/browser-smoke.js','scripts/lib/campaign-journey.js','src/game/23-training-lessons.js','package-lock.json','scripts/build.js'])assert.match(actual.hashes[name],/^[a-f0-9]{64}$/);assert.deepEqual(actual.errors,[]);
});


test('Training driver explicitly opens settings for setup and export, preserves simulation and closes before map use',async()=>{
 const h=load(),{dom,ev}=h,d=dom.window.document;
 try{
  ev("SCT.state=SOC.create({experience:'training',scenario:'smb',jurisdiction:'AU',mode:'guided'});SCT.locked=true;SCT.error='';socRender();");
  const before=ev('JSON.stringify(SCT.state)'),clicks=[];
  const page={locator:selector=>({isVisible:async()=>{const node=d.querySelector(selector);return !!node&&!node.hidden;},click:async()=>{const node=d.querySelector(selector);assert.ok(node,selector);clicks.push(selector);node.click();},waitFor:async({state})=>assert.equal(d.querySelector(selector).hidden,state==='hidden')})};
  assert.equal(d.querySelector('.soc-training-settings').hidden,true);
  await runner.trainingSettings(page,true);await runner.trainingSettings(page,true);
  for(const selector of ['#soc-scenario','#soc-jurisdiction','#soc-mode','[data-soc="new"]','[data-soc="export"]','#soc-import'])assert.ok(d.querySelector('.soc-training-settings').contains(d.querySelector(selector)),selector);
  d.querySelector('[data-soc="new"]').click();assert.equal(d.querySelector('.soc-training-settings').hidden,false,'new exercise retains the explicitly open setup sheet');
  await runner.trainingSettings(page,false);await runner.trainingSettings(page,false);
  assert.deepEqual(clicks,['[data-training="open-settings"]','[data-training="close-settings"]']);assert.equal(d.querySelector('.soc-training-settings').hidden,true);assert.equal(ev('JSON.stringify(SCT.state)'),before);assert.deepEqual(h.errors,[]);
 }finally{dom.window.close();}
});

test('first-screen geometry rejects below-fold maps, occluded nodes and open settings without auto scrolling',()=>{
 const fixture=()=>({viewport:{width:390,height:844},scroll:{x:0,y:0},world:{visibleHeight:748,visibleWidth:390},settingsOpen:false,nodes:[{id:'carrier',fullyVisible:true,hit:true}]});
 assert.equal(runner.assertTrainingFirstScreen(fixture()).primaryNodeId,'carrier');
 for(const visibleHeight of [0,299])assert.throws(()=>runner.assertTrainingFirstScreen({...fixture(),world:{visibleHeight,visibleWidth:390}}),/TRAINING_WORLD_BELOW_FIRST_SCREEN/);
 assert.throws(()=>runner.assertTrainingFirstScreen({...fixture(),nodes:[{id:'carrier',fullyVisible:true,hit:false}]}),/TRAINING_PRIMARY_NODE_NOT_REACHABLE_WITHOUT_SCROLL/);
 assert.throws(()=>runner.assertTrainingFirstScreen({...fixture(),nodes:[{id:'carrier',fullyVisible:false,hit:true}]}),/TRAINING_PRIMARY_NODE_NOT_REACHABLE_WITHOUT_SCROLL/);
 assert.throws(()=>runner.assertTrainingFirstScreen({...fixture(),settingsOpen:true}),/settings must be closed/);
});
