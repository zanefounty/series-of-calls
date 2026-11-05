const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
const {campaignJourney,verifyCheckpoint}=require('../scripts/lib/campaign-journey');
const LESSONS=require('../src/game/23-training-lessons');
test('AC-SOC-437 visible campaign controls execute procurement through renewal for all four tracks',()=>{
 const {dom,ev,errors}=load(),window=dom.window,document=window.document;
 try{
  ev("SCT.state=SOC.create({scenario:'smb',jurisdiction:'US',experience:'training',mode:'assessed'});SCT.locked=true;socRender();");
  const journey=campaignJourney({jurisdiction:'US'}),descriptor=LESSONS.get('defence');
  assert.ok(document.querySelector('#soc-training-map'));
  assert.equal(document.querySelector('#soc-resource-form'),null,'raw authoring stays in Lab');
  for(const [index,step] of journey.steps.entries()){
   const state=JSON.parse(ev('JSON.stringify(SCT.state)'));
   if(step.checkpoint){verifyCheckpoint(state,step.checkpoint);continue;}
   const action=descriptor.steps[index];
   assert.deepEqual(LESSONS.command('defence',action.id,state),step.command,'curated action preserves original journey command');
   if(step.command.type==='configure'&&LESSONS.completed('defence',action.id,state))continue;
   const node=document.querySelector(`[data-training="lesson-action"][data-id="${action.id}"]`);
   assert.ok(node,'missing lesson control '+action.id+' '+JSON.stringify(step.command));assert.equal(node.disabled,false);
   node.click();assert.equal(ev('SCT.error'),'');
   assert.ok(document.querySelector('#soc-training-map'),'map persists during the course');
  }
  assert.equal(ev('SCT.state.campaign.awards.length'),4);assert.equal(errors.length,0,errors.join('\n'));
 }finally{dom.window.close();}
});
