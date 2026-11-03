'use strict';
// Acceptance recipe only. Every transition uses the public dispatcher; the browser
// runner maps these commands to controls rather than installing the planned state.
const SOC=require('../../src/game/55-communications');
const TRACKS=['smb','enterprise','government','defence'];
function campaignJourney({scenario='defence',jurisdiction='AU',mode='assessed',alternative=false}={}){
 if(!TRACKS.includes(scenario)||!SOC.jurisdictions.includes(jurisdiction)||!['guided','assessed','sandbox'].includes(mode))throw new Error('INVALID_CAMPAIGN_JOURNEY_PROFILE');
 let state=SOC.create({scenario:'smb',jurisdiction,mode});const initial=state,steps=[],tracks=[];
 const send=command=>{state=SOC.dispatch(state,command);steps.push({command});};
 const tick=minutes=>send({type:'advance',minutes});
 const pack=(type,action,fields={})=>send({type,command:{action,...fields}});
 const checkpoint=(kind,details={})=>steps.push({checkpoint:{kind,track:state.scenario,...details}});
 const checkWindow=kind=>{const row=state.campaign.progress[state.scenario].windows.filter(x=>x.kind===kind).at(-1);if(row?.status!=='passed')throw new Error(`CAMPAIGN_WINDOW_FAILED:${state.scenario}:${kind}:${row?.errors}`);checkpoint('window',{window:kind});};
 const interact=label=>send({type:'interact',channel:state.scenario==='smb'&&!alternative?'message':'voice',from:'alex',to:'+61255500201',caseId:label});
 pack('campaign','start');
 for(const track of TRACKS.slice(0,TRACKS.indexOf(scenario)+1)){
  if(track!=='smb')pack('campaign','select-track',{track});
  if(track==='government'){
   pack('information','start');pack('information','configure',{kind:'pipeline',config:{...SOC.information.schemas.pipeline,steps:['transcription']}});
  }
  send({type:'configure',id:'speech',config:{capacity:20}});
  for(const command of SOC.reference(state))send(command);
  if(track==='enterprise'){
   pack('operations','start');tick(1);
   pack('operations','migration',{identities:['bea'],target:'phone',cutoverAt:state.clock+2});tick(3);
   if(alternative){send({type:'configure',id:'room',config:{mode:'bridge',interop:true}});tick(1);}
  }
  if(!state.connected){send({type:'connect',connected:true});tick(1);}
  pack('campaign','open-window',{kind:'baseline'});tick(1);checkWindow('baseline');
  pack('campaign','open-window',{kind:'service'});
  if(track==='defence')pack('campaign','inject-incident');
  interact('service-'+track);
  if(track==='enterprise'){
   send({type:'interact',channel:'voice',from:'bea',to:'+61255500124',caseId:'cohort-service'});send({type:'meeting'});
  }
  tick(SOC.campaign.tracks[track].windows.service);checkWindow('service');
  pack('campaign','open-window',{kind:'recovery'});
  if(track!=='defence')pack('campaign','inject-incident');
  tick(1);checkpoint('incident');pack('campaign','recover-incident');interact('recovery-'+track);tick(7);checkWindow('recovery');
  pack('business','start');
  if(track==='defence'){
   send({type:'connect',connected:false});interact('qualification-defence');tick(5);send({type:'meeting'});
  }
  if(['government','defence'].includes(track))pack('business','qualify',{sector:track});
  if(!state.connected)send({type:'connect',connected:true});
  for(const offer of SOC.business.tracks[track].offers){
   const definition=SOC.business.offers[offer];
   pack('business','order',{offer,quantity:definition.minimum,unit:definition.unit,currency:'AUD',resources:Object.values(state.resources).filter(r=>definition.kinds.includes(r.kind)).map(r=>r.id),sell:true,customer:'customer'});
  }
  checkpoint('orders-pending');tick(2);checkpoint('orders-active');
  pack('campaign','open-window',{kind:'economics'});tick(60);checkWindow('economics');pack('campaign','assess');
  if(mode!=='sandbox'&&!state.campaign.progress[track].award)throw new Error('CAMPAIGN_AWARD_MISSING:'+track);
  checkpoint('award');
  const due=Math.max(...state.business.contracts.map(c=>c.renewAt));if(due>state.clock)tick(due-state.clock);
  checkpoint('renewal-due');
  for(const contract of state.business.contracts)pack('business','renew',{contract:contract.id});
  tick(1);checkpoint('renewed');
  const balance=state.business.balance;
  if(balance.cash!==balance.opening+balance.revenue-balance.cost+balance.funding-balance.repaid)throw new Error('CAMPAIGN_LEDGER_UNRECONCILED');
  if(!state.business.contracts.every(c=>c.status==='active'&&c.termBilled===0&&c.billedPeriods===3))throw new Error('CAMPAIGN_RENEWAL_FAILED:'+track);
  tracks.push({track,contracts:state.business.contracts.map(c=>({id:c.id,offer:c.offer,unit:c.unit,billedPeriods:c.billedPeriods,status:c.status})),award:state.campaign.progress[track].award,clock:state.clock,balance:{...balance}});
 }
 return {initial,steps,state,tracks};
}
function verifyCheckpoint(state,checkpoint){
 const track=checkpoint.track;if(state.scenario!==track)throw new Error('CAMPAIGN_CHECKPOINT_TRACK');
 const progress=state.campaign?.progress[track],contracts=state.business?.contracts;
 let passed=false;
 if(checkpoint.kind==='window')passed=progress?.windows.filter(w=>w.kind===checkpoint.window).at(-1)?.status==='passed';
 else if(checkpoint.kind==='incident')passed=progress?.incidents.at(-1)?.recoveredAt===null;
 else if(checkpoint.kind==='orders-pending')passed=contracts?.length===SOC.business.tracks[track].offers.length&&contracts.every(c=>c.status==='provisioning');
 else if(checkpoint.kind==='orders-active')passed=contracts?.every(c=>c.status==='active'&&!c.reasons.length);
 else if(checkpoint.kind==='award')passed=state.mode==='sandbox'?SOC.calculate(state).campaign.assessment.passed&&!progress?.award:!!progress?.award;
 else if(checkpoint.kind==='renewal-due')passed=contracts?.every(c=>c.status==='renewal'&&c.billedPeriods===3);
 else if(checkpoint.kind==='renewed'){
  const b=state.business?.balance;
  passed=contracts?.every(c=>c.status==='active'&&c.termBilled===0&&c.billedPeriods===3)&&b.cash===b.opening+b.revenue-b.cost+b.funding-b.repaid;
 }
 if(!passed)throw new Error(`CAMPAIGN_CHECKPOINT_FAILED:${track}:${checkpoint.kind}`);
 return {track,kind:checkpoint.kind,clock:state.clock,passed:true};
}
module.exports={TRACKS,campaignJourney,verifyCheckpoint};
