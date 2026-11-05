const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');

function begin(scenario='smb',planId='swift'){
 let state=SOC.create({experience:'campaign',scenario,market:'au-sydney',difficulty:'normal'}),sequence=1;
 const send=command=>{state=SOC.dispatch(state,{type:'provider',requestId:`provider-${sequence++}`,command});return state;};
 const advance=minutes=>{for(let n=0;n<minutes;n++)state=SOC.dispatch(state,{type:'advance',minutes:1});return state;};
 const purchase=(offerId,stage,customerId)=>{
  const request={action:'purchase',offerId,planId,stage,...(customerId?{customerId}:{})},quote=SOC.provider.quote(state,request);
  assert.deepEqual(quote.blockers,[],`${state.providerCampaign.scenario}/${offerId}/${stage}: ${quote.blockers.join(',')}`);
  return send({...request,quoteRevision:state.revision});
 };
 const operation=(operationId,customerId='starter-customer')=>{
  const request={action:'operation',operationId,customerId},quote=SOC.provider.quote(state,request);
  assert.deepEqual(quote.blockers,[],`${state.providerCampaign.scenario}/${operationId}: ${quote.blockers.join(',')}`);
  return send({...request,quoteRevision:state.revision});
 };
 const operationEventually=(operationId,customerId)=>{
  for(let n=0;n<80;n++){
   const request={action:'operation',operationId,customerId},quote=SOC.provider.quote(state,request);
   if(!quote.blockers.length)return send({...request,quoteRevision:state.revision});
   assert.ok(quote.blockers.every(x=>x==='ENGINEER_CAPACITY'||x==='SUPPORT_CAPACITY'||x.startsWith('OPERATION_REQUIREMENT_')),`${state.providerCampaign.scenario}/${operationId}: ${quote.blockers.join(',')}`);
   advance(1);
  }
  assert.fail(`${state.providerCampaign.scenario}/${operationId} did not become fundable`);
 };
 return {get state(){return state;},send,advance,purchase,operation,operationEventually,planId};
}

test('earned SMB victory unlocks enterprise in the same shared career and the next segment requires its own earned win',t=>{
 const c=begin();
 c.purchase('starter','base');c.advance(SOC.provider.rules.plans.swift.base.workMinutes);
 c.purchase('starter','carrier','starter-customer');c.advance(SOC.provider.rules.plans.swift.carrier.workMinutes);
 c.purchase('starter','partner','starter-customer');c.advance(SOC.provider.rules.plans.swift.partner.workMinutes+1);
 while(!c.state.providerCampaign.incidents.some(x=>x.status==='active'))c.advance(1);
 const incident=c.state.providerCampaign.incidents.find(x=>x.status==='active');
 c.send({action:'acknowledge-incident',incidentId:incident.id});c.operation('repair');
 c.advance(60-c.state.clock);
 assert.equal(c.state.providerCampaign.periodHistory.at(-1).qualified,false,'commissioning interval cannot qualify');
 c.advance(60);assert.equal(c.state.providerCampaign.periodHistory.at(-1).qualified,true);
 c.advance(60);assert.equal(c.state.providerCampaign.periodHistory.at(-1).qualified,true);
 const next={action:'purchase',offerId:'next-1',planId:'swift',stage:'base'},q=SOC.provider.quote(c.state,next);
 assert.deepEqual(q.blockers,[]);c.send({...next,quoteRevision:c.state.revision});
 assert.equal(c.state.providerCampaign.missionStatus,'won');

 const before={cash:c.state.business.balance.cash,staff:structuredClone(c.state.business.workforce),customers:c.state.providerCampaign.customers.map(x=>x.id),clock:c.state.clock};
 c.send({action:'advance-segment'});
 assert.equal(c.state.providerCampaign.scenario,'enterprise');
 assert.deepEqual(c.state.providerCampaign.segmentHistory,[{scenario:'smb',at:before.clock,focusCustomerId:'starter-customer',qualifiedPeriods:2,winnerCustomerId:'next-1-customer'}]);
 assert.equal(c.state.business.balance.cash,before.cash,'segment transition retains the shared treasury');
 assert.deepEqual(c.state.business.workforce,before.staff,'segment transition retains provider staff');
 assert.deepEqual(c.state.providerCampaign.customers.map(x=>x.id),before.customers,'segment transition retains customer portfolio');
 assert.equal(c.state.providerCampaign.missionStatus,'active');
 assert.equal(SOC.provider.inspect(c.state).offers[1].id,'next-2');

 const unchanged=JSON.stringify(c.state);
 assert.throws(()=>c.send({action:'advance-segment'}),/NEXT_SEGMENT_UNAVAILABLE/,'enterprise cannot be skipped before its own mission is won');
 assert.equal(JSON.stringify(c.state),unchanged,'rejected segment advance is atomic');

 c.purchase('next-2','base');
 assert.equal(c.state.providerCampaign.customers.at(-1).scenario,'enterprise');
 assert.equal(c.state.providerCampaign.customers.at(-1).status,'provisioning');
 c.advance(SOC.provider.rules.plans.swift.base.workMinutes);
 // Reserve both available engineers so capture is effective before the first recorded meeting.
 c.operation('recording','next-2-customer');
 c.operation('room','next-2-customer');
 c.advance(SOC.provider.rules.operations.find(x=>x.id==='room').workMinutes);
 c.purchase('next-2','carrier','next-2-customer');
 c.purchase('next-2','partner','next-2-customer');
 c.advance(60-c.state.clock%60);
 const enterprise=c.state.providerCampaign.customers.at(-1);
 assert.equal(enterprise.status,'active');
 const session=c.state.portfolio.customers.find(x=>x.id==='next-2-customer').root.information.meetingSessions.find(x=>x.status==='completed');
 assert.ok(session,'enterprise service completes an actual scheduled child meeting');
 assert.ok(session.captureRecordId,'the recorded Enterprise requirement has actual capture evidence');
 const evidence=enterprise.history[0]?.evidence?.meetingSessions||[];
 assert.ok(evidence.some(x=>x.id===session.id),'settlement links the real meeting session as mission evidence');
 assert.equal(c.state.providerCampaign.mission.consecutiveQualifying,0,'enterprise activation interval cannot inherit SMB qualification');

 // Enterprise needs its authored migration outcome and a fresh two-period record.
 if(c.state.providerCampaign.incidents.some(x=>x.customerId===enterprise.id&&x.status==='active')){
  const fault=c.state.providerCampaign.incidents.find(x=>x.customerId===enterprise.id&&x.status==='active');
  c.send({action:'acknowledge-incident',incidentId:fault.id});c.operation('repair',enterprise.id);
  c.advance(SOC.provider.rules.operations.find(x=>x.id==='repair').workMinutes);
 }
 // Five-minute conversations require funded customer handling cover at this peak.
 c.operationEventually('bpo',enterprise.id);
 c.operationEventually('migration',enterprise.id);
 if(c.state.providerCampaign.customers[0].status==='renewal')c.send({action:'renew',customerId:'starter-customer'});
 c.advance(60-c.state.clock%60);
 assert.equal(c.state.providerCampaign.mission.consecutiveQualifying,0,'a meeting begun before migration cutover cannot certify room continuity after it');
 assert.equal(c.state.providerCampaign.customers.find(x=>x.id===enterprise.id).history.at(-1).evidence.migrationComplete,false);
 c.advance(60);
 assert.equal(c.state.providerCampaign.mission.consecutiveQualifying,1,'enterprise migration and actual meeting evidence earn its first period');
 c.advance(60);
 assert.equal(c.state.providerCampaign.mission.consecutiveQualifying,2,'enterprise earns a second fresh qualifying period');
 const nextEnterprise={action:'purchase',offerId:'next-3',planId:'swift',stage:'base'},enterpriseQuote=SOC.provider.quote(c.state,nextEnterprise);
 assert.deepEqual(enterpriseQuote.blockers,[]);c.send({...nextEnterprise,quoteRevision:c.state.revision});
 c.advance(60);
 assert.equal(c.state.providerCampaign.missionStatus,'won','enterprise victory requires its own settled periods, incident recovery and funded expansion');
 assert.equal(c.state.providerCampaign.segmentHistory.length,1);
 if(c.state.providerCampaign.customers[0].status==='renewal')c.send({action:'renew',customerId:'starter-customer'});
 if(c.state.providerCampaign.customers.find(x=>x.id===enterprise.id).status==='renewal')c.send({action:'renew',customerId:enterprise.id});
 c.send({action:'advance-segment'});
 assert.equal(c.state.providerCampaign.scenario,'government');
 assert.deepEqual(c.state.providerCampaign.segmentHistory.map(x=>x.scenario),['smb','enterprise']);
 assert.equal(c.state.providerCampaign.mission.focusCustomerId,null,'new segment starts with no borrowed focus customer');

 // Government commissions its own evidence path and uses the shared cash earned by prior missions.
 c.purchase('next-4','base');
 c.advance(SOC.provider.rules.plans.swift.base.workMinutes);
 c.operationEventually('recording','next-4-customer');
 c.purchase('next-4','carrier','next-4-customer');c.purchase('next-4','partner','next-4-customer');
 c.advance(3);
 c.operationEventually('transcription','next-4-customer');c.operationEventually('compliance','next-4-customer');
 const governmentStart=c.state.clock;
 while(!c.state.providerCampaign.customers.find(x=>x.id==='next-4-customer').activatedAt&&c.state.clock<governmentStart+60)c.advance(1);
 assert.ok(c.state.providerCampaign.customers.find(x=>x.id==='next-4-customer').activatedAt,'government child service actually activates');
 while(!c.state.providerCampaign.incidents.some(x=>x.customerId==='next-4-customer'&&x.status==='active')&&c.state.clock<governmentStart+90)c.advance(1);
 const governmentIncident=c.state.providerCampaign.incidents.find(x=>x.customerId==='next-4-customer'&&x.status==='active');
 assert.ok(governmentIncident,'government capacity incident follows delivered workload');
 c.send({action:'acknowledge-incident',incidentId:governmentIncident.id});c.operationEventually('repair','next-4-customer');
 const governmentFinish=Math.ceil(governmentStart/60)*60+180;
 c.advance(governmentFinish-c.state.clock);
 const governmentHistory=c.state.providerCampaign.customers.find(x=>x.id==='next-4-customer').history.slice(-2);
 assert.ok(governmentHistory.length===2&&governmentHistory.every(x=>x.evidence.passed&&x.evidence.boundaryEligible&&x.evidence.transcripts.length>0),'government earns its own scoped transcript and boundary evidence');
 const nextGovernment={action:'purchase',offerId:'next-5',planId:'swift',stage:'base'},governmentQuote=SOC.provider.quote(c.state,nextGovernment);
 assert.deepEqual(governmentQuote.blockers,[]);c.send({...nextGovernment,quoteRevision:c.state.revision});
 assert.equal(c.state.providerCampaign.missionStatus,'won','government victory follows two actual qualifying periods and funded expansion');
 for(const customer of c.state.providerCampaign.customers.filter(x=>x.status==='renewal'))c.send({action:'renew',customerId:customer.id});
 c.send({action:'advance-segment'});
 assert.equal(c.state.providerCampaign.scenario,'defence');
 assert.deepEqual(c.state.providerCampaign.segmentHistory.map(x=>x.scenario),['smb','enterprise','government']);
 assert.equal(c.state.providerCampaign.mission.focusCustomerId,null,'defence does not inherit another segment focus');
 const defenceOffer=SOC.provider.inspect(c.state).offers.find(x=>x.id==='next-6');
 assert.ok(defenceOffer?.available,'earned government victory unlocks the authored defence opportunity');
 const defenceOrder={action:'purchase',offerId:'next-6',planId:'swift',stage:'base'},defenceQuote=SOC.provider.quote(c.state,defenceOrder);
 if(!defenceQuote.blockers.length){c.send({...defenceOrder,quoteRevision:c.state.revision});assert.equal(c.state.providerCampaign.customers.at(-1).scenario,'defence','defence opens when earned shared cash covers the authored base order');t.diagnostic('Defence next-6 base order funded from shared career cash.');}
 else {assert.ok(defenceQuote.blockers.every(x=>x==='INSUFFICIENT_CASH'||x==='ENGINEER_CAPACITY'||x==='SUPPORT_CAPACITY'),`defence affordability is explained: ${defenceQuote.blockers.join(',')}`);t.diagnostic(`Defence base order not affordable after earned segments: ${defenceQuote.blockers.join(',')}.`);}
});

test('government mission earns two real qualifying periods with either authored opening plan',()=>{
 for(const planId of ['swift','steady']){
  const c=begin('government',planId);
  const operationEventually=(operationId)=>{
   for(let n=0;n<80;n++){
    const request={action:'operation',operationId,customerId:'starter-customer'},quote=SOC.provider.quote(c.state,request);
    if(!quote.blockers.length){c.send({...request,quoteRevision:c.state.revision});return;}
    assert.ok(quote.blockers.every(x=>x==='ENGINEER_CAPACITY'||x==='SUPPORT_CAPACITY'||x.startsWith('OPERATION_REQUIREMENT_')),`${planId}/${operationId} unexpected blockers: ${quote.blockers.join(',')}`);
    c.advance(1);
   }
   assert.fail(`${planId}/${operationId} did not become fundable`);
  };
  c.purchase('starter','base');operationEventually('recording');
  c.purchase('starter','carrier','starter-customer');c.purchase('starter','partner','starter-customer');
  c.advance(3);operationEventually('transcription');operationEventually('compliance');
  while(!c.state.providerCampaign.customers[0].activatedAt&&c.state.clock<60)c.advance(1);
  assert.ok(c.state.providerCampaign.customers[0].activatedAt,`${planId} service activated`);
  while(!c.state.providerCampaign.incidents.some(x=>x.status==='active')&&c.state.clock<90)c.advance(1);
  const incident=c.state.providerCampaign.incidents.find(x=>x.status==='active');assert.ok(incident,`${planId} authored capacity incident activated`);
  c.send({action:'acknowledge-incident',incidentId:incident.id});operationEventually('repair');
  c.advance(180-c.state.clock);
  const settled=c.state.providerCampaign.periodHistory.filter(x=>x.qualified).slice(-2);
  assert.equal(settled.length,2,`${planId} earns two full qualifying periods`);
  assert.ok(settled.every(x=>x.due===24&&x.completedOnTime>=22&&x.operatingResult>0),`${planId} actual SLA and positive settlement`);
  assert.ok(c.state.providerCampaign.customers[0].history.slice(-2).every(x=>x.evidence.passed&&x.evidence.boundaryEligible&&x.evidence.transcripts.length>0),`${planId} actual scoped transcript and boundary evidence`);
  const expansion={action:'purchase',offerId:'next-1',planId,stage:'base'},quote=SOC.provider.quote(c.state,expansion);
  assert.deepEqual(quote.blockers,[],`${planId} funded expansion: ${quote.blockers.join(',')}`);
  c.send({...expansion,quoteRevision:c.state.revision});
  assert.equal(c.state.providerCampaign.missionStatus,'won',`${planId} mission victory derives from earned history and funded next contract`);
 }
});
