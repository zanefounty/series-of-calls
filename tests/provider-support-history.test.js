"use strict";
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const FACTS=require('../src/game/23-provider-progression.js');
const HISTORY=require('../src/game/23-provider-support-history.js');
const SUPPORT_WORK=require('../src/game/23-provider-support-work.js');

const CUSTOMER='next-1-customer';
const clone=value=>JSON.parse(JSON.stringify(value));
function deepFreeze(value,seen=new Set()){
 if(!value||typeof value!=='object'||seen.has(value))return value;
 seen.add(value);for(const child of Object.values(value))deepFreeze(child,seen);return Object.freeze(value);
}
const samples=state=>FACTS.decodeSupportObservation(state.providerCampaign.supportObservation);
let cachedFixture;
function buy(state,request){
 const quote=SOC.provider.quote(state,request);
 assert.deepEqual(quote.blockers,[],`${request.operationId||request.stage}: ${quote.blockers.join(',')}`);
 return SOC.dispatch(state,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});
}
function operation(state,operationId,customerId){return buy(state,{action:'operation',operationId,customerId});}
function project(state,operationId,customerId){return state.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId===operationId&&p.status!=='cancelled');}
function advance(state){
 for(const incident of state.providerCampaign.incidents.filter(item=>item.status==='active'))state=SOC.dispatch(state,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
 for(const incident of state.providerCampaign.incidents.filter(item=>item.status==='acknowledged')){
  if(state.providerCampaign.projects.some(p=>p.customerId===incident.customerId&&['repair','service-repair'].includes(p.operationId)&&p.status!=='cancelled'&&p.acceptedAt>=incident.acknowledgedAt))continue;
  const operationId=incident.resource==='service'?'service-repair':'repair',quote=SOC.provider.quote(state,{action:'operation',operationId,customerId:incident.customerId});
  if(!quote.blockers.length)state=SOC.dispatch(state,{type:'provider',command:{action:'operation',operationId,customerId:incident.customerId,quoteRevision:quote.atRevision}});
 }
 for(const customer of state.providerCampaign.customers.filter(c=>c.status==='renewal'))state=SOC.dispatch(state,{type:'provider',command:{action:'renew',customerId:customer.id}});
 return SOC.dispatch(state,{type:'advance',minutes:1});
}
function until(state,predicate,limit=420){for(let i=0;i<limit&&!predicate(state);i++)state=advance(state);assert.ok(predicate(state),`condition not reached at ${state.clock}`);return state;}
function startCustomer(state,customerId,offerId,market){
 state=buy(state,{action:'purchase',offerId,planId:'swift',stage:'base',market});
 state=until(state,s=>s.providerCampaign.customers.find(c=>c.id===customerId)?.stages.base?.status==='effective');
 for(const stage of ['carrier','partner']){
  state=buy(state,{action:'purchase',offerId,planId:'swift',stage,customerId});
  state=until(state,s=>s.providerCampaign.customers.find(c=>c.id===customerId)?.stages[stage]?.status==='effective');
 }
 return until(state,s=>s.providerCampaign.customers.find(c=>c.id===customerId)?.status==='active');
}
function completeOperation(state,operationId,customerId){
 let quote=SOC.provider.quote(state,{action:'operation',operationId,customerId});
 for(let retry=0;quote.blockers.length&&retry<60;retry++){
  assert.ok(quote.blockers.every(reason=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(reason)),`${operationId}: ${quote.blockers.join(',')}`);
  state=advance(state);quote=SOC.provider.quote(state,{action:'operation',operationId,customerId});
 }
 assert.deepEqual(quote.blockers,[],`${operationId}: ${quote.blockers.join(',')}`);
 state=SOC.dispatch(state,{type:'provider',command:{action:'operation',operationId,customerId,quoteRevision:quote.atRevision}});
 return until(state,s=>project(s,operationId,customerId)?.status==='complete');
}
function fixture(){
 if(cachedFixture)return clone(cachedFixture);
 let state=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',seed:73,difficulty:'easy'});
 state=startCustomer(state,'starter-customer','starter','au-sydney');
 state=completeOperation(state,'bpo','starter-customer');
 state=until(state,s=>SOC.provider.inspect(s).progression.facts.supportResponsibility.status==='ready',120);
 state=completeOperation(state,'service-boundary-review','starter-customer');
 state=until(state,s=>s.providerCampaign.mission.nextOpportunityAvailable,180);
 state=startCustomer(state,CUSTOMER,'next-1','au-sydney');
 state=completeOperation(state,'service-boundary-review',CUSTOMER);
 state=until(state,s=>s.providerCampaign.incidents.some(i=>i.customerId===CUSTOMER&&i.resource==='carrier'&&i.activatedAt!==null),80);
 state=until(state,s=>s.providerCampaign.incidents.some(i=>i.customerId===CUSTOMER&&i.resource==='carrier'&&i.resolvedAt!==null),30);
 state=until(state,s=>s.clock>=252,80);
 cachedFixture=clone(state);
 return state;
}
const hooksFor=()=>({catalogue:SOC.catalogue,supportWorkOrigin:SUPPORT_WORK.origin});
function coreParticipant(participant){return Object.fromEntries(['customerId','portfolioId','tenant','market','scenario','configuration','eligible','missing','resources','boundaries','responsibility'].map(key=>[key,participant[key]??null]));}

test('historical eligibility is reconstructed at the sampled minute across paid carrier outage and repair',()=>{
 const state=fixture(),rows=samples(state),hook=hooksFor(state),participantAt=at=>rows.find(row=>row.at===at).participants.find(p=>p.customerId===CUSTOMER);
 const incident=state.providerCampaign.incidents.find(i=>i.customerId===CUSTOMER&&i.resource==='carrier'&&i.activatedAt!==null),goodRow=rows.find(row=>row.at<incident.activatedAt&&row.participants.find(p=>p.customerId===CUSTOMER)?.eligible===true&&row.participants.find(p=>p.customerId===CUSTOMER)?.boundaries?.length),goodAt=goodRow.at,badAt=incident.activatedAt,recoveredAt=incident.resolvedAt;
 const good=HISTORY.reconstructParticipantAt(state,CUSTOMER,goodAt,hook),bad=HISTORY.reconstructParticipantAt(state,CUSTOMER,badAt,hook),recovered=HISTORY.reconstructParticipantAt(state,CUSTOMER,recoveredAt,hook);
 assert.equal(good.status,'supported',JSON.stringify(good));assert.deepEqual(coreParticipant(good.participant),coreParticipant(participantAt(goodAt)));
 assert.equal(good.participant.eligible,true);assert.equal(HISTORY.validateParticipantAt(state,participantAt(goodAt),goodAt,hook).status,'valid');
 assert.equal(bad.status,'supported',JSON.stringify(bad.missing));assert.deepEqual(coreParticipant(bad.participant),coreParticipant(participantAt(badAt)));
 assert.equal(bad.participant.eligible,false);assert.ok(bad.participant.missing.includes('resource-not-current:carrier'));
 assert.equal(HISTORY.validateParticipantAt(state,participantAt(badAt),badAt,hook).status,'valid');
 assert.equal(recovered.status,'supported',JSON.stringify(recovered.missing));assert.deepEqual(coreParticipant(recovered.participant),coreParticipant(participantAt(recoveredAt)));
 assert.equal(recovered.participant.eligible,true);assert.equal(HISTORY.validateParticipantAt(state,participantAt(recoveredAt),recoveredAt,hook).status,'valid');
});

test('AC-SOC-780 private history caches preserve frozen saves and isolate returned boundary projections',()=>{
 const state=fixture(),before=JSON.stringify(state),incident=state.providerCampaign.incidents.find(i=>i.customerId===CUSTOMER&&i.resource==='carrier'&&i.activatedAt!==null),at=incident.resolvedAt;
 deepFreeze(state);
 const first=HISTORY.reconstructParticipantAt(state,CUSTOMER,at,hooksFor());
 assert.equal(first.status,'supported');assert.ok(first.participant.boundaries.length>0,'the real dispatched service-boundary path is present');
 const expected=clone(first);first.participant.boundaries[0].resources.push('forged');first.participant.resources[0].generation=999;first.participant.responsibility.scope.push('forged');
 const second=HISTORY.reconstructParticipantAt(state,CUSTOMER,at,hooksFor());
 assert.deepEqual(second,expected,'mutating one public reconstruction cannot alter the private cached inputs or a later result');
 assert.equal(JSON.stringify(state),before,'boundary projections leave the frozen dispatched save unchanged');
 assert.equal(SOC.restore(JSON.stringify(state)).revision,state.revision,'the exact unmodified save remains restorable');
});

test('sample eligibility flags cannot replace historical paid configuration, fault or boundary reconstruction',()=>{
 const state=fixture(),rows=samples(state),hook=hooksFor(state),incident=state.providerCampaign.incidents.find(i=>i.customerId===CUSTOMER&&i.resource==='carrier'&&i.activatedAt!==null),good=rows.find(row=>row.at<incident.activatedAt&&row.participants.find(p=>p.customerId===CUSTOMER)?.eligible===true),bad=clone(rows.find(row=>row.at===incident.activatedAt).participants.find(p=>p.customerId===CUSTOMER));
 const reconstructed=HISTORY.reconstructParticipantAt(state,CUSTOMER,incident.activatedAt,hook);
 assert.equal(reconstructed.status,'supported');
 assert.ok(reconstructed.participant.missing.includes('resource-not-current:carrier'));
 for(const bound of ['identity','phone','engage'])assert.ok(reconstructed.participant.missing.includes(`resource-not-current:${bound}`),`a carrier outage invalidates the active shared boundary across ${bound}`);
 bad.eligible=true;bad.missing=[];bad.resources=clone(good.participants.find(p=>p.customerId===CUSTOMER).resources);bad.boundaries=clone(good.participants.find(p=>p.customerId===CUSTOMER).boundaries);bad.responsibility=clone(good.participants.find(p=>p.customerId===CUSTOMER).responsibility);
 assert.equal(HISTORY.validateParticipantAt(state,bad,incident.activatedAt,hook).status,'invalid');
 const missingTimeline=HISTORY.reconstructParticipantAt(state,CUSTOMER,incident.activatedAt,{});
 assert.equal(missingTimeline.status,'unsupported');assert.match(missingTimeline.missing[0],/^SUPPORT_HISTORY_RESOURCE_(?:TIMELINE|OBSERVATION)_UNAVAILABLE:/);
 const wrongMinute=HISTORY.reconstructParticipantAt(state,CUSTOMER,253,hook);assert.equal(wrongMinute.status,'unsupported');
});

test('pruned arrival event uses only the validated retained Provider origin',()=>{
 const state=fixture(),root=state.portfolio.customers.find(row=>row.id===CUSTOMER).root;
 const arrival=state.providerCampaign.events.find(event=>event.code==='CUSTOMER_WORK_ARRIVED'&&event.customerId===CUSTOMER&&event.channel==='message'),message=arrival&&root.interactions.find(interaction=>interaction.id===arrival.interactionId),at=message?.finishedAt;
 assert.ok(message&&Number.isSafeInteger(at),'fixture retains an authored digital arrival and resolved interaction');
 const altered=clone(state);altered.providerCampaign.events=altered.providerCampaign.events.filter(event=>event.interactionId!==message.id);
 const pinned=HISTORY.reconstructParticipantAt(altered,CUSTOMER,at,hooksFor());
 assert.equal(pinned.status,'supported');
 assert.ok(!pinned.participant.missing.includes('resolved-digital-case-not-retained'),'the exact retained arrival origin can survive event pruning');
 const unanchored=HISTORY.reconstructParticipantAt(altered,CUSTOMER,at,{catalogue:SOC.catalogue});
 assert.equal(unanchored.status,'supported');
 assert.ok(unanchored.participant.missing.includes('resolved-digital-case-not-retained'),'same-tenant work without a retained Provider origin cannot substitute');
 assert.ok(!unanchored.participant.eligible,'unrelated retained interaction cannot qualify Provider delivery');
});

test('historical reconstruction is pure, survives validated restore, and serializes as a standalone worker adapter',()=>{
 const state=fixture(),rows=samples(state),hook=hooksFor(state),good=rows.find(row=>row.participants.some(p=>p.customerId===CUSTOMER&&p.eligible)),before=JSON.stringify(state);
 const result=HISTORY.reconstructParticipantAt(state,CUSTOMER,good.at,hook);
 assert.equal(result.status,'supported');assert.deepEqual(JSON.parse(JSON.stringify(state)),JSON.parse(before),'reconstruction does not mutate campaign, child root, resource or boundary state');
 const validator=HISTORY.createValidator(state,hook),participant=good.participants.find(p=>p.customerId===CUSTOMER);
 assert.equal(validator(participant,good.at).status,'valid','one call-local validator shares only its own reconstruction caches');
 assert.deepEqual(JSON.parse(JSON.stringify(state)),JSON.parse(before),'cached validation remains read-only');
 const restored=SOC.restore(before);assert.deepEqual(restored,state,'the actual saved state remains accepted by normal restore');
 const workerContext=vm.createContext({});
 assert.doesNotThrow(()=>vm.runInContext(`${HISTORY.source()};globalThis.adapter=SOC_PROVIDER_SUPPORT_HISTORY;`,workerContext));
 assert.equal(workerContext.adapter.version,HISTORY.version);
 assert.equal(typeof workerContext.adapter.reconstructParticipantAt,'function');
});


test('AC-SOC-781 custom observation hooks cannot retain and poison a validator configuration cache',()=>{
 const state=fixture(),before=JSON.stringify(state),good=samples(state).find(row=>row.participants.some(p=>p.customerId===CUSTOMER&&p.eligible));
 assert.ok(good);let captured;
 const hook={catalogue:SOC.catalogue,resourceObservationAt:(s,c,root,id,at,plan)=>{if(id==='phone')captured??=plan;return {effective:plan.config.enabled===true,generation:plan.generation,ready:plan.config.enabled===true};}};
 const validator=HISTORY.createValidator(state,hook),claim={customerId:CUSTOMER},first=validator(claim,good.at);
 assert.ok(captured?.config.enabled,'the hook receives an actual paid enabled phone projection');
 captured.config.enabled=false;
 const second=validator(claim,good.at),fresh=HISTORY.createValidator(state,hook)(claim,good.at);
 assert.deepEqual(second,first,'mutating a retained external hook argument cannot poison subsequent validation');
 assert.deepEqual(second,fresh,'the shared validator matches a fresh validation after external argument mutation');
 assert.equal(JSON.stringify(state),before,'neither external projection mutation nor reconstruction changes the source save');
});
