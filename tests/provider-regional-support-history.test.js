"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),facts=require('../src/game/23-provider-progression');
const REGIONAL=require('../src/game/23-provider-regional-support');
const POLICY=require('../src/game/23-provider-policy');
const copy=value=>JSON.parse(JSON.stringify(value)),customerId='starter-customer';
const {startCustomer,operation,operationComplete,until,mspFor,stableSupportWindowShape,assuranceMinute,assuranceWaitChunk}=require('./provider-progression-regional-claims.helpers.js');
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
test('regional support verification keeps roster reuse local to one read and returns no mutable cached authority',()=>{
 const state=paidHistory(),rows=facts.decodeSupportObservation(state.providerCampaign.supportObservation),participant=rows.at(-1).participants[0],at=rows.at(-1).at;
 assert.equal(REGIONAL.validateNamedSupportSnapshot(state,participant,at),true);
 const observed=REGIONAL.sample(state,participant.customerId,at);assert.equal(observed.eligible,true);
 observed.namedSupport.usedSupportSlots=99;observed.capacity.personIds.push('forged-person');
 assert.equal(REGIONAL.validateNamedSupportSnapshot(state,participant,at),true,'mutating a public observation cannot alter saved or reused authority');
 const stale=copy(state),project=stale.providerCampaign.projects.find(row=>row.id===participant.namedSupport.projectId);
 project.setupCents+=1;
 assert.equal(REGIONAL.validateNamedSupportSnapshot(stale,participant,at),false,'a later validation rebuilds authority from the changed state instead of reusing a prior invocation cache');
 assert.equal(REGIONAL.validateNamedSupportSnapshot(state,participant,at),true,'the original state remains valid');
});
test('AC-SOC-835 same-minute paid automation work is retained while unanchored manual work stays after the sample',()=>{
 let state=paidHistory(),beforeActionTick=null;
 state=operation(state,'automation',customerId);state=operationComplete(state,'automation',customerId);
 const policy=state.providerAutomation.findLast(row=>row.customerId===customerId),policyProject=state.providerCampaign.projects.find(row=>row.id===policy.projectId);
 const config={...POLICY.create(),enabled:true,cashFloorCents:0,lifetimeBudgetCents:100000,budgetSpentCents:policy.spentCents,maxActions:1,actionsUsed:policy.actions.length,engineerCeiling:5,supportCeiling:6,customerIds:[customerId],rules:[{id:'repair-one-real-incident',kind:'assurance',enabled:true,customerIds:[customerId],operationId:'repair',stage:null,resourceId:null,thresholdPercent:null}]};
 state=SOC.dispatch(state,{type:'provider',command:{action:'configure-policy',customerId,config}});
 const waitStartedAt=state.clock,deadline=waitStartedAt+420;
 while(!state.providerAutomation.find(row=>row.projectId===policy.projectId)?.actions.length&&state.clock<deadline){
  const n=state.clock<360?Math.min(deadline-state.clock,360-state.clock,assuranceWaitChunk(state)):1;
  if(n===1){if(state.clock>=360&&!state.providerCampaign.customers.some(row=>row.status==='renewal'))beforeActionTick=copy(state);state=assuranceMinute(state);}else state=SOC.dispatch(state,{type:'advance',minutes:n});
 }
 const activePolicy=state.providerAutomation.find(row=>row.projectId===policy.projectId),action=activePolicy.actions[0],repair=action&&state.providerCampaign.projects.find(row=>row.id===action.projectId),sample=action&&facts.decodeSupportObservation(state.providerCampaign.supportObservation).find(row=>row.at===action.at),participant=sample?.participants.find(row=>row.customerId===repair?.customerId);
 assert.ok(action,'the live paid policy handles the next authored incident');assert.ok(repair);assert.equal(repair.operationId,'repair');assert.equal(repair.acceptedAt,action.at);assert.ok(policyProject.completedAt<=action.at);assert.ok(state.business.ledger.some(row=>row.id===repair.postingId&&row.projectId===repair.id&&row.cents===repair.setupCents));
 assert.ok(participant?.namedSupport,'the paid support payroll observation is retained at the repair minute');assert.equal(participant.namedSupport.implementationSupportSlots,1);assert.equal(REGIONAL.validateNamedSupportSnapshot(state,participant,action.at,{allowIneligible:true}),true,'the native policy action is ordered before this minute sample');
 assert.deepEqual(SOC.restore(JSON.stringify(state)),state,'the authentic paid repair and its same-minute support sample survive save validation');

 const unanchored=copy(state),unanchoredPolicy=unanchored.providerAutomation.find(row=>row.projectId===policy.projectId);unanchoredPolicy.actions=unanchoredPolicy.actions.filter(row=>row.projectId!==repair.id);
 assert.equal(REGIONAL.validateNamedSupportSnapshot(unanchored,participant,action.at,{allowIneligible:true}),false,'a same-minute project without its actual native policy action is treated as later manual work');
 for(const [label,mutate] of [
  ['wrong project',row=>{row.projectId='provider-project-999';}],
  ['wrong minute',row=>{row.at=action.at+1;}],
  ['wrong paid amount',row=>{row.cents++;}]
 ]){const forged=copy(state),row=forged.providerAutomation.find(x=>x.projectId===policy.projectId).actions.find(x=>x.projectId===repair.id);mutate(row);assert.equal(REGIONAL.validateNamedSupportSnapshot(forged,participant,action.at,{allowIneligible:true}),false,label);}
 const futurePolicy=copy(state),futureProject=futurePolicy.providerCampaign.projects.find(row=>row.id===policy.projectId);futureProject.completedAt=action.at+1;
 assert.equal(REGIONAL.validateNamedSupportSnapshot(futurePolicy,participant,action.at,{allowIneligible:true}),false,'a same-minute action cannot borrow a policy that completes afterward');

 assert.ok(beforeActionTick,'the fixture retained the pre-tick state for an independent manual-order control');
 let manual=copy(beforeActionTick);
 manual=SOC.dispatch(manual,{type:'provider',command:{action:'automation',customerId,enabled:false}});
 manual=SOC.dispatch(manual,{type:'advance',minutes:1});assert.equal(manual.clock,action.at);
 const manualSample=facts.decodeSupportObservation(manual.providerCampaign.supportObservation).find(row=>row.at===action.at),manualParticipant=manualSample?.participants.find(row=>row.customerId===customerId),manualIncident=manual.providerCampaign.incidents.find(row=>row.customerId===customerId&&['active','acknowledged'].includes(row.status));
 assert.ok(manualParticipant?.namedSupport);assert.equal(manualParticipant.namedSupport.implementationSupportSlots,0,'no native policy action preceded this sample');assert.ok(manualIncident,'the incident remains available for an explicit player repair');
 if(manualIncident.status==='active')manual=SOC.dispatch(manual,{type:'provider',command:{action:'acknowledge-incident',incidentId:manualIncident.id}});
 const manualQuote=SOC.provider.quote(manual,{action:'operation',operationId:'repair',customerId});assert.deepEqual(manualQuote.blockers,[]);
 manual=SOC.dispatch(manual,{type:'provider',command:{action:'operation',operationId:'repair',customerId,quoteRevision:manualQuote.atRevision}});
 const manualRepair=manual.providerCampaign.projects.at(-1);assert.equal(manualRepair.operationId,'repair');assert.equal(manualRepair.acceptedAt,action.at,'the player order follows the sample at the same displayed minute');assert.equal(REGIONAL.validateNamedSupportSnapshot(manual,manualParticipant,action.at,{allowIneligible:true}),true);assert.deepEqual(SOC.restore(JSON.stringify(manual)),manual);

 const command={type:'advance',minutes:1},expected=SOC.dispatch(state,command);let message;const context={postMessage:value=>{message=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:835,state:copy(state),command}});
 assert.ok(message,'serialized worker returned the tick');assert.equal(message.error,undefined);assert.deepEqual(copy(message.state),expected);assert.deepEqual(SOC.restore(JSON.stringify(message.state)),expected);
});

function stablePaidWindow(){
 let state=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',seed:73,difficulty:'easy'});
 state=startCustomer(state,customerId,'starter','au-sydney');
 state=operation(state,'bpo',customerId);state=operationComplete(state,'bpo',customerId);
 state=until(state,current=>!!mspFor(current,customerId),'regional test MSP',120);
 state=operation(state,'service-boundary-review',customerId);state=operationComplete(state,'service-boundary-review',customerId);
 state=operation(state,'provider-support-coverage',customerId,{market:'au-sydney',personId:'support-au-sydney-01',coverageId:'extended'});
 state=operationComplete(state,'provider-support-coverage',customerId);
 return until(state,current=>stableSupportWindowShape(current,[customerId]),'regional test support window',180);
}
test('regional evidence reuses only a private read roster and rechecks paid and saved support proof on each invocation',()=>{
 let state=stablePaidWindow();const original=JSON.stringify(state),first=REGIONAL.evaluate(state),goal=first.levels[REGIONAL.GOALS.C3];
 assert.equal(goal.status,'incomplete','the one-customer fixture remains below the C3 threshold');
 assert.ok(!goal.missing.some(reason=>reason.startsWith(`NAMED_SUPPORT_NOT_CURRENT:${customerId}:`)),'all sixty retained positive support observations are independently current');
 goal.missing.push('caller mutation');assert.equal(JSON.stringify(state),original,'evaluation and returned diagnostics do not mutate the input');
 const second=REGIONAL.evaluate(state).levels[REGIONAL.GOALS.C3];assert.ok(!second.missing.includes('caller mutation'));
 const rows=copy(facts.decodeSupportObservation(state.providerCampaign.supportObservation)),saved=copy(state.providerCampaign.supportObservation);
 rows.at(-1).participants[0].namedSupport.usedSupportSlots+=1;
 state.providerCampaign.supportObservation=facts.encodeSupportObservation(rows);
 const forged=REGIONAL.evaluate(state).levels[REGIONAL.GOALS.C3];
 assert.ok(forged.missing.some(reason=>reason.startsWith(`NAMED_SUPPORT_NOT_CURRENT:${customerId}:`))||forged.missing.some(reason=>reason.startsWith(`NAMED_SUPPORT_EVIDENCE_INVALID:${customerId}:`)),'a rehashed staff snapshot forgery is rejected');
 state.providerCampaign.supportObservation=saved;
 assert.equal(JSON.stringify(state),original,'decoded and encoded row edits cannot alias the original observation');
 const restored=REGIONAL.evaluate(state).levels[REGIONAL.GOALS.C3];assert.ok(!restored.missing.some(reason=>reason.startsWith(`NAMED_SUPPORT_NOT_CURRENT:${customerId}:`)),`the same state is freshly checked after restoration: ${restored.missing.join('|')}`);
 const support=state.providerCampaign.projects.find(project=>project.id===rows.at(-1).participants[0].namedSupport.projectId),posting=state.business.ledger.find(entry=>entry.id===support.postingId),cents=posting.cents;
 posting.cents++;
 assert.throws(()=>REGIONAL.evaluate(state),/INVALID_PROVIDER_SUPPORT_ASSIGNMENT/,'changed payment lineage cannot reuse a previously read paid roster');
 posting.cents=cents;
 assert.ok(!REGIONAL.evaluate(state).levels[REGIONAL.GOALS.C3].missing.some(reason=>reason.startsWith(`NAMED_SUPPORT_NOT_CURRENT:${customerId}:`)),'restoring the paid input starts a fresh valid read');
});
test('actual serialized SOC worker matches direct paid support history through resize, tick and restore',()=>{
 let state=paidHistory(),message;const context={postMessage:value=>{message=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);
 const commands=[{type:'provider',command:{action:'staff',engineers:2,support:0}},{type:'advance',minutes:1},{type:'provider',command:{action:'staff',engineers:2,support:1}},{type:'advance',minutes:1}];
 for(const [index,command] of commands.entries()){
  const original=JSON.stringify(state),expected=SOC.dispatch(state,command);message=undefined;context.onmessage({data:{id:index+1,state:copy(state),command}});assert.ok(message,'real worker emitted its dispatch result');assert.equal(message.error,undefined);assert.deepEqual(copy(message.state),expected);assert.equal(JSON.stringify(state),original);state=SOC.restore(JSON.stringify(message.state));assert.deepEqual(state,expected);
 }
 const samples=facts.decodeSupportObservation(state.providerCampaign.supportObservation);assert.equal(samples.at(-2).at,61);assert.equal(samples.at(-2).participants[0].namedSupport.paidSupportSlots,0);assert.equal(samples.at(-1).participants[0].namedSupport.paidSupportSlots,1);
});
