'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications'),FACTS=require('../src/game/23-provider-progression'),REGIONAL=require('../src/game/23-provider-regional-support');

test('AC-SOC-753 settlement exit removes named support slots while preserving prior samples and later explicit exits',()=>{
 let state=SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty:'easy'});
 const send=command=>{state=SOC.dispatch(state,{type:'provider',command});};
 const buy=command=>{const quote=SOC.provider.quote(state,command);assert.deepEqual(quote.blockers,[],JSON.stringify(command));send({...command,quoteRevision:quote.atRevision});};
 const tick=()=>{
  if(state.providerCampaign.status==='won')send({action:'continue-career'});
  for(const incident of state.providerCampaign.incidents.filter(x=>x.status==='active')){
   send({action:'acknowledge-incident',incidentId:incident.id});
   const command={action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId},quote=SOC.provider.quote(state,command);
   if(!quote.blockers.length)send({...command,quoteRevision:quote.atRevision});
  }
  state=SOC.dispatch(state,{type:'advance',minutes:1});
 };
 const until=(condition,label)=>{for(let i=0;i<360&&!condition();i++)tick();assert.ok(condition(),label);};
 const start=(customerId,offerId,market)=>{
  for(const stage of ['base','carrier','partner']){buy({action:'purchase',offerId,planId:'swift',stage,...(stage==='base'?{market}:{customerId})});until(()=>state.providerCampaign.customers.find(c=>c.id===customerId)?.stages[stage]?.status==='effective',stage);}
  buy({action:'operation',operationId:'bpo',customerId});until(()=>state.providerCampaign.projects.some(p=>p.customerId===customerId&&p.operationId==='bpo'&&p.status==='complete'),'bpo');
  buy({action:'operation',operationId:'provider-support-coverage',customerId,config:{market,personId:`support-${market}-01`,coverageId:'extended'}});
  until(()=>!!REGIONAL.assignment(state,customerId),'named support');
 };
 start('starter-customer','starter','au-sydney');
 until(()=>state.providerCampaign.mission.nextOpportunityAvailable,'next customer opportunity');
 send({action:'staff',engineers:3,support:4});
 start('next-1-customer','next-1','us-seattle');
 let previous;
 for(let i=0;i<360&&state.providerCampaign.customers[0].status!=='exited';i++){
  previous=FACTS.decodeSupportObservation(state.providerCampaign.supportObservation).at(-1);tick();
 }
 const exited=state.providerCampaign.customers[0],survivor=state.providerCampaign.customers[1];
 assert.equal(exited.status,'exited');assert.ok(['active','renewal'].includes(survivor.status));
 const rows=FACTS.decodeSupportObservation(state.providerCampaign.supportObservation),last=rows.at(-1),prior=rows.find(x=>x.at===previous.at),participant=last.participants.find(x=>x.customerId===survivor.id);
 assert.equal(last.at,exited.exitAt);assert.equal(previous.at,last.at-1);assert.deepEqual(prior,previous);
 assert.equal(previous.participants.find(x=>x.customerId===survivor.id).namedSupport.usedSupportSlots,2);
 assert.equal(participant.namedSupport.usedSupportSlots,1);
 for(const sample of [prior,last])for(const row of sample.participants)if(row.namedSupport)assert.equal(REGIONAL.validateNamedSupportSnapshot(state,row,sample.at,{allowIneligible:true}),true);
 const forged=structuredClone(participant);forged.namedSupport.usedSupportSlots=2;assert.equal(REGIONAL.validateNamedSupportSnapshot(state,forged,last.at,{allowIneligible:true}),false);
 const legacy=structuredClone(state);legacy.providerCampaign.events=legacy.providerCampaign.events.filter(e=>!(e.customerId===exited.id&&e.at===exited.exitAt));
 assert.equal(REGIONAL.validateNamedSupportSnapshot(legacy,participant,last.at,{allowIneligible:true}),true,'legacy saves with a pruned exit event retain the post-settlement cohort ordering');
 assert.deepEqual(SOC.restore(JSON.stringify(state)),state);
 buy({action:'exit',customerId:survivor.id});
 assert.deepEqual(FACTS.decodeSupportObservation(state.providerCampaign.supportObservation).at(-1),last);
 assert.equal(REGIONAL.validateNamedSupportSnapshot(state,participant,last.at,{allowIneligible:true}),true);
 const legacyExplicit=structuredClone(state);legacyExplicit.providerCampaign.events=legacyExplicit.providerCampaign.events.filter(e=>!(e.customerId===survivor.id&&e.at===last.at));
 assert.equal(REGIONAL.validateNamedSupportSnapshot(legacyExplicit,participant,last.at,{allowIneligible:true}),true,'legacy retained cohort preserves a later explicit exit');
 assert.deepEqual(SOC.restore(JSON.stringify(state)),state);
});
