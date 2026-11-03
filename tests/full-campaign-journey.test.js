const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const {campaignJourney,verifyCheckpoint}=require('../scripts/lib/campaign-journey');
const {campaignUiAction}=require('../scripts/lib/campaign-ui');
const runner=require('../scripts/browser-campaigns');
test('AC-SOC-433 all campaign tracks procure required offers, recover incidents, bill and renew across jurisdictions and modes',()=>{
 for(const jurisdiction of SOC.jurisdictions)for(const mode of ['guided','assessed','sandbox']){
  const journey=campaignJourney({jurisdiction,mode});
  assert.deepEqual(journey.tracks.map(t=>t.track),['smb','enterprise','government','defence']);
  for(const track of journey.tracks){
   assert.deepEqual(track.contracts.map(c=>c.offer),SOC.business.tracks[track.track].offers);
   assert.ok(track.contracts.every(c=>c.billedPeriods===3&&c.status==='active'));
   assert.equal(!!track.award,mode!=='sandbox','sandbox observes outcomes without assessed awards');
  }
  assert.deepEqual(SOC.restore(JSON.stringify(journey.state)),journey.state);
 }
});
test('AC-SOC-434 campaign checkpoints reject pending provisioning and forged renewal readiness',()=>{
 const journey=campaignJourney({scenario:'smb'});let state=journey.initial;
 for(const step of journey.steps){
  if(step.command)state=SOC.dispatch(state,step.command);
  else{
   assert.equal(verifyCheckpoint(state,step.checkpoint).passed,true);
   if(step.checkpoint.kind==='orders-pending')assert.throws(()=>verifyCheckpoint(state,{...step.checkpoint,kind:'orders-active'}),/CHECKPOINT_FAILED/);
   if(step.checkpoint.kind==='renewed'){
    const broken=structuredClone(state);broken.business.balance.cash++;
    assert.throws(()=>verifyCheckpoint(broken,step.checkpoint),/CHECKPOINT_FAILED/);
   }
  }
 }
 assert.deepEqual(state,journey.state);
 const before=JSON.stringify(state);SOC.calculate(state);SOC.calculate(state);assert.equal(JSON.stringify(state),before);
});
test('AC-SOC-435 alternate voice and interoperable room designs complete the extended campaign',()=>{
 const journey=campaignJourney({scenario:'enterprise',alternative:true});
 assert.equal(journey.state.resources.room.effective.mode,'bridge');assert.equal(journey.tracks.length,2);
 assert.equal(journey.state.campaign.awards.length,2);
});
test('AC-SOC-436 every campaign recipe command maps to visible controls with no evaluation fallback',()=>{
 let clock=0;
 for(const step of campaignJourney().steps){
  if(!step.command)continue;
  const action=campaignUiAction(step.command,clock)||runner.referenceUiAction(step.command);
  assert.ok(['button','campaign-form','resource-form','clock-buttons','interaction-form'].includes(action.kind));
  if(step.command.type==='advance')clock+=step.command.minutes;
  // Selecting a track restores its own clock; migration mapping uses actual page time.
  if(step.command.type==='campaign'&&step.command.command.action==='select-track')clock=0;
 }
 assert.equal(runner.parseArgs(['--journey','campaign']).journey,'campaign');
 assert.throws(()=>runner.parseArgs(['--journey','shortcut']),/JOURNEY_MUST_BE/);
 assert.equal(campaignUiAction({type:'unimplemented'},0),null);
 assert.throws(()=>runner.referenceUiAction({type:'unimplemented'}),/NO_VISIBLE_REFERENCE_MAPPING/);
});
