"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),facts=require('../src/game/23-provider-progression');
const copy=value=>JSON.parse(JSON.stringify(value)),customerId='starter-customer';
let original;
function paidHistory(){
 if(original)return copy(original);
 let state=SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty:'easy'});
 const send=command=>{state=SOC.dispatch(state,{type:'provider',command});};
 const buy=command=>{const quote=SOC.provider.quote(state,command);assert.deepEqual(quote.blockers,[]);send({...command,quoteRevision:quote.atRevision});};
 const tick=()=>{state=SOC.dispatch(state,{type:'advance',minutes:1});};
 for(const stage of ['base','carrier','partner'])buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 while(state.providerCampaign.customers[0].status!=='active')tick();
 buy({action:'operation',operationId:'provider-support-coverage',customerId,config:{market:'au-sydney',personId:'support-au-sydney-01',coverageId:'extended'}});
 while(state.clock<60){const incident=state.providerCampaign.incidents.find(i=>i.status==='active');if(incident&&!state.providerCampaign.projects.some(p=>p.operationId==='repair')){send({action:'acknowledge-incident',incidentId:incident.id});buy({action:'operation',operationId:'repair',customerId});}tick();}
 const last=facts.decodeSupportObservation(state.providerCampaign.supportObservation).at(-1);
 assert.equal(last.version,2);assert.ok(last.participants[0].namedSupport);assert.ok(last.participants[0].responsibility);
 assert.deepEqual(SOC.restore(JSON.stringify(state)),state);original=copy(state);return state;
}
function legacyRows(rows){return rows.map(row=>{const old=copy(row);old.version=1;for(const participant of old.participants)for(const key of ['namedSupport','distributor','integrations'])delete participant[key];return old;});}
test('regional history rejects copied participant identity, market and scenario edits against the actual paid tenant',()=>{
 const state=paidHistory(),unchanged=JSON.stringify(state);
 for(const [key,value] of [['portfolioId','invented-customer'],['tenant','invented-tenant'],['market','jp-tokyo'],['scenario','government']]){
  const forged=copy(state),rows=facts.decodeSupportObservation(forged.providerCampaign.supportObservation);rows.at(-1).participants[0][key]=value;forged.providerCampaign.supportObservation=facts.encodeSupportObservation(rows);
  assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_SUPPORT_OBSERVATION/,key);
 }
 assert.equal(JSON.stringify(state),unchanged);assert.deepEqual(SOC.restore(unchanged),state);
});
test('content8 cannot discard regional history through a valid legacy codec representation',()=>{
 const state=paidHistory(),forged=copy(state),rows=legacyRows(facts.decodeSupportObservation(state.providerCampaign.supportObservation));
 forged.providerCampaign.supportObservation=facts.encodeSupportObservation(rows);assert.equal(forged.providerCampaign.supportObservation.version,2);
 assert.deepEqual(facts.decodeSupportObservation(forged.providerCampaign.supportObservation),rows,'legacy codec remains readable independently of content8 authority');
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_SUPPORT_OBSERVATION/);
});
test('support codec rejects mixed row versions instead of producing an undecodable history',()=>{
 const state=paidHistory(),rows=facts.decodeSupportObservation(state.providerCampaign.supportObservation),mixed=copy(rows);mixed[0]=legacyRows([rows[0]])[0];
 assert.throws(()=>facts.encodeSupportObservation(mixed),/INVALID_PROVIDER_SUPPORT_OBSERVATION_ENCODING/);
 const encoded=copy(state.providerCampaign.supportObservation);encoded.samples[0].version=1;for(const participant of encoded.samples[0].participants)for(const key of ['namedSupport','distributor','integrations'])delete participant[key];
 assert.throws(()=>facts.decodeSupportObservation(encoded),/INVALID_PROVIDER_SUPPORT_OBSERVATION_ENCODING/);
 assert.deepEqual(facts.decodeSupportObservation(facts.encodeSupportObservation(rows)),rows);
});
test('same-minute lawful resizing preserves the already sampled regional support and restores both team states',()=>{
 let state=paidHistory();const prior=copy(state.providerCampaign.supportObservation),at=state.clock;
 for(const support of [0,1]){state=SOC.dispatch(state,{type:'provider',command:{action:'staff',engineers:2,support}});assert.equal(state.clock,at);assert.equal(state.business.workforce.support,support);assert.deepEqual(state.providerCampaign.supportObservation,prior);assert.deepEqual(SOC.restore(JSON.stringify(state)),state);}
 state=SOC.dispatch(state,{type:'advance',minutes:1});assert.equal(facts.decodeSupportObservation(state.providerCampaign.supportObservation).at(-1).at,at+1);assert.deepEqual(SOC.restore(JSON.stringify(state)),state);
});

test('paid regional history rejects coherent support-headcount edits in all saved sample copies',()=>{
 const state=paidHistory(),forged=copy(state),rows=facts.decodeSupportObservation(forged.providerCampaign.supportObservation),participant=rows.at(-1).participants[0];
 assert.equal(participant.namedSupport.paidSupportSlots,1);assert.equal(participant.responsibility.sharedWorkforce.support,1);
 participant.namedSupport.paidSupportSlots=20;participant.responsibility.sharedWorkforce.support=20;
 const configuration=JSON.parse(participant.configuration);assert.equal(configuration.responsibility.sharedWorkforce.support,1);configuration.responsibility.sharedWorkforce.support=20;participant.configuration=JSON.stringify(configuration);
 forged.providerCampaign.supportObservation=facts.encodeSupportObservation(rows);
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_SUPPORT_OBSERVATION/);
 assert.deepEqual(SOC.restore(JSON.stringify(state)),state);
});
test('public staff journal and retained resize events must agree even when same-minute payroll is unchanged',()=>{
 let state=paidHistory();for(const support of [0,1])state=SOC.dispatch(state,{type:'provider',command:{action:'staff',engineers:2,support}});
 assert.deepEqual(SOC.restore(JSON.stringify(state)),state);assert.equal(state.providerCampaign.workforceHistory.resizes.length,2);
 const eventForgery=copy(state),event=eventForgery.providerCampaign.events.find(e=>e.code==='TEAM_RESIZED');assert.equal(event.support,0);event.support=1;
 assert.throws(()=>SOC.restore(JSON.stringify(eventForgery)),/INVALID_PROVIDER_WORKFORCE_HISTORY_EVENTS/);
 const journalForgery=copy(state),changes=journalForgery.providerCampaign.workforceHistory.resizes;changes[0].to.support=1;changes[1].from.support=1;
 assert.equal(journalForgery.providerCampaign.payroll.personMinutes,state.providerCampaign.payroll.personMinutes);assert.equal(journalForgery.business.workforce.support,state.business.workforce.support);
 assert.throws(()=>SOC.restore(JSON.stringify(journalForgery)),/INVALID_PROVIDER_WORKFORCE_HISTORY_EVENTS/);
});
test('actual serialized SOC worker matches direct paid support history through resize, tick and restore',()=>{
 let state=paidHistory(),message;const context={postMessage:value=>{message=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);
 const commands=[{type:'provider',command:{action:'staff',engineers:2,support:0}},{type:'advance',minutes:1},{type:'provider',command:{action:'staff',engineers:2,support:1}},{type:'advance',minutes:1}];
 for(const [index,command] of commands.entries()){
  const original=JSON.stringify(state),expected=SOC.dispatch(state,command);message=undefined;context.onmessage({data:{id:index+1,state:copy(state),command}});assert.ok(message,'real worker emitted its dispatch result');assert.equal(message.error,undefined);assert.deepEqual(copy(message.state),expected);assert.equal(JSON.stringify(state),original);state=SOC.restore(JSON.stringify(message.state));assert.deepEqual(state,expected);
 }
 const samples=facts.decodeSupportObservation(state.providerCampaign.supportObservation);assert.equal(samples.at(-2).at,61);assert.equal(samples.at(-2).participants[0].namedSupport.paidSupportSlots,0);assert.equal(samples.at(-1).participants[0].namedSupport.paidSupportSlots,1);
});
