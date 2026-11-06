'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');

function campaign(){
 let state=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',difficulty:'normal'}),sequence=1;
 const send=command=>{state=SOC.dispatch(state,{type:'provider',requestId:`provider-${sequence++}`,command});return state;};
 const advance=minutes=>{for(let n=0;n<minutes;n++)state=SOC.dispatch(state,{type:'advance',minutes:1});return state;};
 const purchase=(offerId,stage,customerId)=>{const request={action:'purchase',offerId,planId:'swift',stage,...(customerId?{customerId}:{})},quote=SOC.provider.quote(state,request);assert.deepEqual(quote.blockers,[]);return send({...request,quoteRevision:state.revision});};
 const operation=operationId=>{const request={action:'operation',operationId,customerId:'starter-customer'},quote=SOC.provider.quote(state,request);assert.deepEqual(quote.blockers,[]);return send({...request,quoteRevision:state.revision});};
 return {get state(){return state;},send,advance,purchase,operation};
}

function winSmb(){
 const c=campaign();
 c.purchase('starter','base');c.advance(SOC.provider.rules.plans.swift.base.workMinutes);
 c.purchase('starter','carrier','starter-customer');c.advance(SOC.provider.rules.plans.swift.carrier.workMinutes);
 c.purchase('starter','partner','starter-customer');c.advance(SOC.provider.rules.plans.swift.partner.workMinutes+1);
 while(!c.state.providerCampaign.incidents.some(row=>row.status==='active'))c.advance(1);
 const incident=c.state.providerCampaign.incidents.find(row=>row.status==='active');
 c.send({action:'acknowledge-incident',incidentId:incident.id});c.operation('repair');
 c.advance(60-c.state.clock);
 assert.equal(c.state.providerCampaign.periodHistory.at(-1).qualified,false);
 c.advance(60);assert.equal(c.state.providerCampaign.periodHistory.at(-1).qualified,true);
 c.advance(60);assert.equal(c.state.providerCampaign.periodHistory.at(-1).qualified,true);
 const next={action:'purchase',offerId:'next-1',planId:'swift',stage:'base'},quote=SOC.provider.quote(c.state,next);
 assert.deepEqual(quote.blockers,[]);c.send({...next,quoteRevision:c.state.revision});
 assert.equal(c.state.providerCampaign.missionStatus,'won');
 assert.equal(c.state.providerCampaign.mission.victoryProof?.qualifiedPeriods,2);
 return c;
}

test('earned mission victory survives a later poor period and remains sufficient for segment transition',()=>{
 const c=winSmb(),p=c.state.providerCampaign,proof=structuredClone(p.mission.victoryProof);
 assert.ok(proof,'the victory records its earned settlement proof');
 assert.deepEqual(SOC.restore(JSON.stringify(c.state)),c.state);
 const forged=structuredClone(c.state);forged.providerCampaign.mission.victoryProof.periods[0].operatingResult+=1;
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_MISSION_VICTORY/,'a forged victory snapshot must not restore');

 if(c.state.providerCampaign.customers.find(row=>row.id==='starter-customer').status==='renewal')c.send({action:'renew',customerId:'starter-customer'});
 const expansionBase=SOC.provider.rules.plans.swift.base;
 c.advance(expansionBase.workMinutes);
 c.send({action:'staff',engineers:0,support:0});
 c.advance(60-c.state.clock%60);
 assert.equal(c.state.providerCampaign.periodHistory.at(-1).qualified,false,'actual unstaffed demand makes a later period fail');
 assert.equal(c.state.providerCampaign.mission.consecutiveQualifying,0,'the current streak resets truthfully');
 assert.equal(c.state.providerCampaign.missionStatus,'won','the earned mission outcome is historical');
 assert.deepEqual(SOC.restore(JSON.stringify(c.state)),c.state);

 c.send({action:'advance-segment'});
 assert.equal(c.state.providerCampaign.scenario,'enterprise');
 assert.deepEqual(c.state.providerCampaign.segmentHistory,[{scenario:'smb',at:c.state.clock,focusCustomerId:proof.focusCustomerId,qualifiedPeriods:proof.qualifiedPeriods,winnerCustomerId:proof.winnerCustomerId,victoryProof:proof}]);
 assert.deepEqual(SOC.restore(JSON.stringify(c.state)),c.state,'segment transition retains the full earned proof');
 const forgedHistory=structuredClone(c.state);forgedHistory.providerCampaign.segmentHistory[0].victoryProof.periods[0].operatingResult++;
 assert.throws(()=>SOC.restore(JSON.stringify(forgedHistory)),/INVALID_PROVIDER_SEGMENT_VICTORY/);
 const missingHistory=structuredClone(c.state);delete missingHistory.providerCampaign.segmentHistory[0].victoryProof;
 assert.throws(()=>SOC.restore(JSON.stringify(missingHistory)),/INVALID_PROVIDER_SEGMENTS/);
 assert.equal(c.state.providerCampaign.mission.consecutiveQualifying,0,'the next mission starts with a fresh qualification streak');
});

test('legacy win state reconstructs a missing optional proof from the retained event and qualifying settlements',()=>{
 const c=winSmb(),legacy=structuredClone(c.state);
 legacy.providerCampaign.contentVersion='provider-campaigns-6';delete legacy.providerCampaign.caseHandoffVersion;delete legacy.providerCampaign.dedicatedInterconnectVersion;for(const c of legacy.providerCampaign.customers)if(c.period.demandPlan){delete c.period.demandPlan.request.handoffVersion;delete c.period.demandPlan.result.handoffVersion;delete c.period.demandPlan.result.handoffReservations;}
 delete legacy.providerCampaign.supportWork;delete legacy.providerCampaign.workforceHistory;for(const row of legacy.portfolio.customers)delete row.root.providerSupportPins;
 const facts=require('../src/game/23-provider-progression');legacy.providerCampaign.supportObservation=facts.encodeSupportObservation(facts.decodeSupportObservation(legacy.providerCampaign.supportObservation).map(sample=>{sample.version=1;for(const row of sample.participants)for(const key of ['namedSupport','distributor','integrations'])delete row[key];return sample;}));
 delete legacy.providerCampaign.mission.victoryProof;
 let restored=SOC.restore(JSON.stringify(legacy));
 assert.deepEqual(restored,legacy,'legacy state without the new proof remains restorable');
 restored=SOC.dispatch(restored,{type:'provider',command:{action:'advance-segment'}});
 assert.equal(restored.providerCampaign.scenario,'enterprise');
 assert.deepEqual(restored.providerCampaign.segmentHistory,[{scenario:'smb',at:restored.clock,focusCustomerId:'starter-customer',qualifiedPeriods:2,winnerCustomerId:'next-1-customer'}]);
});

test('the funded expansion cancellation path stays closed and continuation changes focus without rewriting the earned win',()=>{
 const c=winSmb(),proof=structuredClone(c.state.providerCampaign.mission.victoryProof);
 const project=c.state.providerCampaign.projects.find(row=>row.customerId==='next-1-customer'&&row.kind==='stage'&&row.stage==='base');
 const request={action:'cancel-project',projectId:project.id},quote=SOC.provider.quote(c.state,request);
 assert.ok(quote.blockers.includes('PROJECT_NOT_CANCELLABLE'),'the shared dispatcher does not allow expansion-stage cancellation');
 const before=JSON.stringify(c.state);
 assert.throws(()=>c.send({...request,quoteRevision:c.state.revision}),/PROJECT_NOT_CANCELLABLE/);
 assert.equal(JSON.stringify(c.state),before,'a refused cancellation preserves the earned milestone and state');
 assert.deepEqual(c.state.providerCampaign.mission.victoryProof,proof);
 assert.deepEqual(SOC.restore(JSON.stringify(c.state)),c.state);

 const win=winSmb();
 let state=win.state;const priorProof=structuredClone(state.providerCampaign.mission.victoryProof);
 state=SOC.dispatch(state,{type:'provider',command:{action:'continue-career'}});
 assert.equal(state.providerCampaign.mission.focusCustomerId,priorProof.winnerCustomerId);
 assert.notEqual(state.providerCampaign.mission.focusCustomerId,priorProof.focusCustomerId);
 assert.deepEqual(state.providerCampaign.mission.victoryProof,priorProof,'continuation keeps the earlier mission proof separate from its new focus');
 assert.deepEqual(SOC.restore(JSON.stringify(state)),state);
});
