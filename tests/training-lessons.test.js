const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const LESSONS=require('../src/game/23-training-lessons');
const {campaignJourney}=require('../scripts/lib/campaign-journey');

test('curated Training descriptors retain every authored full-course action and checkpoint',()=>{
 for(const track of LESSONS.tracks()){
  const journey=campaignJourney({scenario:track,mode:'assessed'}),descriptor=LESSONS.get(track);
  assert.equal(LESSONS.validateDescriptor(descriptor),true);assert.deepEqual(descriptor.sourceIds,LESSONS.sourceIds);
  assert.equal(descriptor.steps.length,journey.steps.length,`${track} step count`);
  for(const [index,row] of journey.steps.entries()){
   const actual=descriptor.steps[index];
   if(row.command){assert.equal(actual.kind,'action');assert.deepEqual(LESSONS.command(track,actual.id),row.command,`${track} command ${index}`);assert.equal('command' in actual,false,'raw commands stay behind the dispatcher API');}
   else{assert.equal(actual.kind,'checkpoint');assert.deepEqual(actual.checkpoint,row.checkpoint,`${track} checkpoint ${index}`);}
  }
  assert.ok(descriptor.steps.filter(x=>x.kind==='checkpoint').some(x=>x.checkpoint.kind==='award'),`${track} retains its assessment milestone`);
 }
});

test('Training offers only a small set of dispatch-valid lesson actions without advancing or mutating the world',()=>{
 const state=SOC.create({scenario:'smb',jurisdiction:'AU',mode:'assessed'}),before=JSON.stringify(state);
 const actions=LESSONS.available('smb',state,SOC);
 assert.equal(JSON.stringify(state),before,'render-time availability is pure');
 assert.ok(actions.length>0&&actions.length<=2);assert.equal(actions[0].labelKey,'training.lesson_action.start_campaign');
 assert.equal(actions[0].objectId,'mission');
 assert.equal('command' in actions[0],false,'lesson cards do not expose serialized commands');
 const command=LESSONS.command('smb',actions[0].id,state);assert.deepEqual(command,{type:'campaign',command:{action:'start'}});
 const next=SOC.dispatch(state,command);assert.ok(next.campaign);assert.equal(state.campaign,undefined);
 const afterStart=LESSONS.available('smb',next,SOC);assert.ok(afterStart.some(a=>LESSONS.command('smb',a.id,next).type==='configure'));
});

test('out-of-order completed configuration is recognized from measured state and later lesson actions remain available',()=>{
 let state=SOC.create({scenario:'smb',jurisdiction:'AU',mode:'guided'});
 const start=LESSONS.available('smb',state,SOC)[0];state=SOC.dispatch(state,LESSONS.command('smb',start.id,state));
 const offered=LESSONS.available('smb',state,SOC);const people=offered.find(x=>{const c=LESSONS.command('smb',x.id,state);return c.type==='configure'&&c.id==='people';});assert.ok(people);
 state=SOC.dispatch(state,LESSONS.command('smb',people.id,state));
 const progress=LESSONS.progress('smb',state,SOC);assert.equal(progress.completedActions,2);
 const next=LESSONS.available('smb',state,SOC);assert.ok(next.length>0);assert.ok(next.every(x=>{const c=LESSONS.command('smb',x.id,state);return c.type!=='configure'||c.id!=='people';}));
});

test('all four assessed Training journeys expose measured checkpoints and awards without Provider campaign state',()=>{
 for(const track of LESSONS.tracks()){
  const journey=campaignJourney({scenario:track,mode:'assessed'}),progress=LESSONS.progress(track,journey.state,SOC);
  assert.equal(journey.state.experience.kind,'training');assert.equal(journey.state.providerCampaign,undefined);
  assert.equal(progress.completedActions,progress.totalActions,track);
  assert.ok(progress.checkpoints.length>0&&progress.checkpoints.every(x=>x.passed),`${track}: ${JSON.stringify(progress.checkpoints.filter(x=>!x.passed))}`);
  assert.ok(journey.state.campaign.awards.some(x=>x.track===track),`${track} training award came from the existing curriculum`);
 }
});

test('each available lesson action drives the authored full course in AU, US, and JP at every checkpoint',()=>{
 const {verifyCheckpoint}=require('../scripts/lib/campaign-journey');
 for(const jurisdiction of ['AU','US','JP']){
  const journey=campaignJourney({scenario:'defence',jurisdiction,mode:'assessed'});let state=journey.initial;
  for(const row of journey.steps){
   if(row.checkpoint){verifyCheckpoint(state,row.checkpoint);const p=LESSONS.progress('defence',state,SOC);assert.ok(p.checkpoints.find(x=>x.track===row.checkpoint.track&&x.kind===row.checkpoint.kind&&x.window===(row.checkpoint.window||null))?.passed,`${jurisdiction} ${JSON.stringify(row.checkpoint)}`);continue;}
   const actionId=LESSONS.findAction('defence',row.command,state);assert.ok(actionId,`${jurisdiction} ${JSON.stringify(row.command)}`);
   if(LESSONS.completed('defence',actionId,state))continue;
   const offered=LESSONS.available('defence',state,SOC);const visible=offered.find(x=>JSON.stringify(LESSONS.command('defence',x.id,state))===JSON.stringify(row.command));assert.ok(visible,`${jurisdiction} default map controls offer ${actionId} at ${state.scenario}/${state.clock}; command=${JSON.stringify(row.command)}; visible=${JSON.stringify(offered.map(x=>x.id))}`);
   state=SOC.dispatch(state,LESSONS.command('defence',visible.id,state));assert.equal(LESSONS.completed('defence',actionId,state),true);
  }
  assert.equal(state.campaign.awards.length,4);assert.equal(state.providerCampaign,undefined);
 }
});

test('lesson data is worker-serializable and rejects unknown tracks or versions',()=>{
 const vm=require('node:vm');assert.equal(vm.runInNewContext(`${LESSONS.source()} SOC_TRAINING_LESSONS.VERSION`),1);
 assert.throws(()=>LESSONS.get('unreviewed'),/UNKNOWN_TRAINING_LESSON/);
 assert.throws(()=>LESSONS.validateDescriptor({...LESSONS.get('smb'),version:2}),/INVALID_TRAINING_LESSON_DESCRIPTOR/);
});
