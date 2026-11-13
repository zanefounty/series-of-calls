const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const providerRules=require('../src/game/24-provider-rules').data;

function start(){return SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',difficulty:'normal'});}
function provider(s,command,sequence){return SOC.dispatch(s,{type:'provider',requestId:`provider-${sequence}`,command});}
function buy(s,stage,planId='swift',customerId,sequence=1){
 const request={action:'purchase',offerId:customerId?'starter':'starter',planId,stage,...(customerId?{customerId}:{})};
 const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[]);
 return provider(s,{...request,quoteRevision:s.revision},sequence);
}
function advance(s,minutes){for(let minute=0;minute<minutes;minute++)s=SOC.dispatch(s,{type:'advance',minutes:1});return s;}

test('PLAY-010/016 authored campaign content changes demand timing and usage exposure while version-one saves retain their opening recipe',()=>{
 const expected={smb:3000,enterprise:4600,government:3800,defence:3800};
 const profiles=Object.fromEntries(Object.entries(providerRules.missions).map(([id,mission])=>[id,mission.demand]));
 assert.ok(Object.values(profiles).every(d=>d.voiceMinutes.length===16&&d.digitalMinutes.length===8),'mission variants preserve the 24-case contract');
 for(const [scenario,usage] of Object.entries(expected)){
  const state=SOC.create({experience:'campaign',scenario}),quote=SOC.provider.quote(state,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});
  assert.equal(quote.forecast.conditionalFullPlan.usageForecast,usage,`${scenario} complete-plan usage forecast follows its authored call duration`);
 }
 assert.notDeepEqual(profiles.smb.voiceMinutes,profiles.enterprise.voiceMinutes,'enterprise arrival timing is distinct from the SMB service desk');
 assert.notDeepEqual(profiles.government.digitalMinutes,profiles.defence.digitalMinutes,'records and disconnected-site workload do not reuse the same digital schedule');
 const legacy=SOC.create({experience:'campaign',scenario:'enterprise'});legacy.providerCampaign.contentVersion='provider-campaigns-1';delete legacy.providerCampaign.incidentSequenceVersion;delete legacy.providerCampaign.caseHandoffVersion;delete legacy.providerCampaign.caseFollowupVersion;delete legacy.providerCampaign.dedicatedInterconnectVersion;delete legacy.providerCampaign.enterpriseContinuityVersion;delete legacy.providerCampaign.commercialResponsibilityVersion;delete legacy.providerCampaign.meetingDependencyVersion;delete legacy.providerCampaign.supportObservation;delete legacy.providerCampaign.supportWork;delete legacy.providerCampaign.workforceHistory;delete legacy.providerCampaign.serviceRetirementVersion;delete legacy.providerCampaign.externalCollaborationVersion;
 const restored=SOC.restore(JSON.stringify(legacy)),quote=SOC.provider.quote(restored,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});
 assert.equal(quote.forecast.conditionalFullPlan.usageForecast,3000,'a validated version-one save keeps its historical 16 three-minute calls and eight messages');
});

test('provider quotes expose complete authored commitment and reject stale or unaffordable acceptance atomically',()=>{
 let s=start();
 const swift=SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});
 const steady=SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'steady',stage:'base'});
 assert.equal(swift.commercial.fullPlanSetupCents,600000);
 assert.equal(swift.commercial.fullPlanFixedCentsPerPeriod,102000);
 assert.equal(swift.commercial.minimumTermPeriods,3);
 assert.equal(swift.commercial.variablePrices.voiceCentsPerMinute,50);
 assert.equal(swift.commercial.sla.workItemsPerPeriod,24);
 assert.equal(swift.forecast.revenue,0,'newly accepted customer is not booked revenue');
 assert.equal(swift.forecast.conditionalFullPlan.operatingResult,45000,'conditional margin includes all stages, staff and variable usage');
 assert.equal(steady.forecast.conditionalFullPlan.operatingResult,75000);
 assert.equal(steady.commercial.fullPlanSetupCents,1000000);
 assert.equal(steady.commercial.fullPlanFixedCentsPerPeriod,72000);

 SOC.business.postProvider(s,'cost',1900000,{reason:'test-authored-opening-obligation',unit:'AUD-cent'});
 const blocked=SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});
 assert.ok(blocked.blockers.includes('INSUFFICIENT_CASH'));
 const before=JSON.stringify(s);
 assert.throws(()=>provider(s,{action:'purchase',offerId:'starter',planId:'swift',stage:'base',quoteRevision:s.revision},1),/PROVIDER_QUOTE_BLOCKED:INSUFFICIENT_CASH/);
 assert.equal(JSON.stringify(s),before,'failed acceptance leaves the campaign and ledger unchanged');
});

test('SMB stages fund real service readiness, deliver actual work, and repair an observed carrier outage',()=>{
 let s=start(),seq=1;
 const blocked=SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'swift',stage:'carrier',customerId:'starter-customer'});
 assert.ok(blocked.blockers.includes('UNKNOWN_CUSTOMER'));

 s=buy(s,'base','swift',undefined,seq++);
 assert.equal(s.business.balance.cash,1620000);
 s=advance(s,3);
 s=buy(s,'carrier','swift','starter-customer',seq++);
 s=advance(s,2);
 s=buy(s,'partner','swift','starter-customer',seq++);
 s=advance(s,3);
 assert.equal(s.providerCampaign.customers[0].status,'active');
 assert.ok(s.providerCampaign.projects.every(x=>x.status==='complete'));
 assert.ok(Object.values(s.providerCampaign.customers[0].stages).every(x=>x.status==='effective'));

 while(!s.providerCampaign.incidents.some(x=>x.status==='active')&&s.clock<50)s=advance(s,1);
 const customer=s.providerCampaign.customers[0],incident=s.providerCampaign.incidents.find(x=>x.status==='active');
 assert.ok(customer.metrics.completed>=4,'incident timing follows observed completed interactions');
 assert.ok(s.providerCampaign.jobs.some(j=>j.status==='completed'&&j.interactionId&&j.voiceMinutes>0));
 assert.ok(incident,'the authored carrier fault activated');
 s=advance(s,10);
 assert.ok(s.providerCampaign.customers[0].metrics.failed>0,'unrepaired outage causes real missed customer work');
 const unchanged=JSON.stringify(s);
 assert.ok(SOC.provider.quote(s,{action:'operation',operationId:'repair',customerId:customer.id}).blockers.includes('INCIDENT_ACKNOWLEDGEMENT_REQUIRED'));
 s=provider(s,{action:'acknowledge-incident',incidentId:incident.id},seq++);
 const q=SOC.provider.quote(s,{action:'operation',operationId:'repair',customerId:customer.id});
 assert.deepEqual(q.blockers,[]);assert.equal(q.setupCents,8000);
 s=provider(s,{action:'operation',operationId:'repair',customerId:customer.id,quoteRevision:s.revision},seq++);
 assert.equal(s.business.balance.cash,Number(JSON.parse(unchanged).business.balance.cash)-8000);
 s=advance(s,4);
 assert.equal(s.providerCampaign.incidents.find(x=>x.id===incident.id).status,'resolved');
 assert.equal(s.providerCampaign.projects.at(-1).status,'complete');
 assert.ok(SOC.provider.inspect(s).customers[0].services.find(x=>x.id==='carrier').observed.ready);
});

test('both authored SMB opening plans reach effective service through real staged work',()=>{
 for(const planId of ['swift','steady']){
  let s=start(),sequence=1;
  s=buy(s,'base',planId,undefined,sequence++);
  s=advance(s,SOC.provider.rules.plans[planId].base.workMinutes);
  s=buy(s,'carrier',planId,'starter-customer',sequence++);
  s=advance(s,SOC.provider.rules.plans[planId].carrier.workMinutes);
  s=buy(s,'partner',planId,'starter-customer',sequence++);
  s=advance(s,SOC.provider.rules.plans[planId].partner.workMinutes+1);
  assert.equal(s.providerCampaign.customers[0].status,'active',planId);
  assert.ok(Object.values(s.providerCampaign.customers[0].stages).every(x=>x.status==='effective'),planId);
 }
});

test('PLAY-018 purchased project resources and period-denominated workload are visible in a pure campaign inspection',()=>{
 let s=start(),sequence=1;
 for(const stage of ['base','carrier','partner'])s=buy(s,stage,'swift',stage==='base'?undefined:'starter-customer',sequence++);
 for(let minute=0;minute<30&&s.providerCampaign.customers[0].status!=='active';minute++)s=advance(s,1);
 assert.equal(s.providerCampaign.customers[0].status,'active');
 const request={action:'operation',operationId:'room',customerId:'starter-customer'},quote=SOC.provider.quote(s,request);
 assert.deepEqual(quote.blockers,[]);s=provider(s,{...request,quoteRevision:s.revision},sequence++);
 const before=JSON.stringify(s),scene=SOC.provider.inspect(s),customer=scene.customers[0],room=customer.services.find(x=>x.id==='room');
 assert.equal(JSON.stringify(s),before,'scene projection does not change simulation state');
 assert.deepEqual({name:room.name,kind:room.kind},{name:SOC.catalogue.room.name,kind:'room'});
 assert.equal(customer.periodOutcome.periodIndex,s.providerCampaign.customers[0].period.index);
 assert.equal(customer.periodOutcome.due,s.providerCampaign.jobs.filter(x=>x.customerId===customer.id&&x.periodIndex===customer.periodOutcome.periodIndex).length);
 assert.equal(customer.periodOutcome.completedOnTime+customer.periodOutcome.late+customer.periodOutcome.failed+customer.periodOutcome.open,customer.periodOutcome.due);
});

test('enterprise meeting evidence comes from a scheduled and completed child session',()=>{
 let s=SOC.create({experience:'campaign',scenario:'enterprise',market:'au-sydney'}),sequence=1;
 const send=command=>{s=provider(s,command,sequence++);};
 const buy=(stage,customerId)=>{
  const request={action:'purchase',offerId:'starter',planId:'swift',stage,...(customerId?{customerId}:{})};
  const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[]);
  send({...request,quoteRevision:s.revision});
 };
 const operation=operationId=>{
  const request={action:'operation',operationId,customerId:'starter-customer'},quote=SOC.provider.quote(s,request);
  assert.deepEqual(quote.blockers,[]);
  send({...request,quoteRevision:s.revision});
 };
 buy('base');operation('room');
 s=advance(s,3);operation('recording');
 buy('carrier','starter-customer');buy('partner','starter-customer');
 s=advance(s,60-s.clock);
 const meeting=s.providerCampaign.meetings.find(x=>x.customerId==='starter-customer'&&x.periodIndex===0);
 assert.equal(meeting.status,'scheduled');
 const child=s.portfolio.customers[0].root;
 assert.equal(child.information.meetingSessions.find(x=>x.id===meeting.sessionId).status,'completed');
 assert.equal(s.providerCampaign.customers[0].history[0].evidence.meetingSessions[0].id,meeting.sessionId);
 assert.ok(s.providerCampaign.customers[0].history[0].evidence.passed===false,'other required period evidence remains a real gate');
});

test('enterprise, government and defence win only after their actual mission evidence and shared-cash expansion',()=>{
 const paths={
  enterprise:{early:['room'],later:['recording'],wait:3,final:['bpo','migration']},
  government:{early:['recording'],later:['transcription'],wait:3,final:['compliance']},
  defence:{early:[],later:['local-deployment'],wait:3,final:['bpo','room','recording']}
 };
 for(const [scenario,path] of Object.entries(paths)){
  let s=SOC.create({experience:'campaign',scenario,market:'au-sydney'}),sequence=1;
  const send=command=>{s=provider(s,command,sequence++);};
  const buy=(stage,customerId)=>{
   const request={action:'purchase',offerId:'starter',planId:'swift',stage,...(customerId?{customerId}:{})};
   const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],scenario+'/'+stage);
   send({...request,quoteRevision:s.revision});
  };
  const operation=operationId=>{
   for(let retry=0;retry<80;retry++){
    const request={action:'operation',operationId,customerId:'starter-customer'},q=SOC.provider.quote(s,request);
    if(!q.blockers.length){send({...request,quoteRevision:s.revision});return;}
    assert.ok(q.blockers.every(x=>x==='ENGINEER_CAPACITY'||x==='SUPPORT_CAPACITY'||x.startsWith('OPERATION_REQUIREMENT_')),scenario+'/'+operationId+': '+q.blockers.join(','));
    s=advance(s,1);
   }
   assert.fail(scenario+'/'+operationId+' did not become fundable');
  };
  buy('base');
  for(const operationId of path.early)operation(operationId);
  buy('carrier','starter-customer');buy('partner','starter-customer');
  s=advance(s,path.wait);
  for(const operationId of path.later)operation(operationId);
  for(const operationId of path.final)operation(operationId);
  while(!s.providerCampaign.customers[0].activatedAt&&s.clock<60)s=advance(s,1);
  assert.ok(s.providerCampaign.customers[0].activatedAt,scenario+' actual service activation');
  while(!s.providerCampaign.incidents.some(x=>x.status==='active')&&s.clock<90)s=advance(s,1);
  const incident=s.providerCampaign.incidents.find(x=>x.status==='active');assert.ok(incident,scenario+' authored incident');
  if(scenario==='defence'){
   while(!s.portfolio.customers[0].root.interactions.some(x=>x.providerContext?.connected===false&&x.phase==='resolved')&&s.clock<incident.activatedAt+25)s=advance(s,1);
   assert.ok(s.portfolio.customers[0].root.interactions.some(x=>x.providerContext?.connected===false&&x.phase==='resolved'),'real work completed during external disconnection');
  }
  send({action:'acknowledge-incident',incidentId:incident.id});
  operation('repair');
  if(scenario==='defence'){
   for(let minute=0;minute<12&&!s.portfolio.customers[0].root.connected;minute++)s=advance(s,1);
   assert.equal(s.portfolio.customers[0].root.connected,true,'funded repair reconnects before reconciliation');
   operation('sync-all');
  }
  s=advance(s,180-s.clock);
  const periods=s.providerCampaign.periodHistory.filter(x=>x.qualified).slice(-2);
  assert.equal(periods.length,2,scenario+' two complete qualifying periods');
  assert.ok(periods.every(x=>x.due===24&&x.completedOnTime>=22&&x.operatingResult>0),scenario+' actual SLA and operating result');
  assert.equal(s.providerCampaign.mission.consecutiveQualifying,2,scenario);
  const next={action:'purchase',offerId:'next-1',planId:'swift',stage:'base'},quote=SOC.provider.quote(s,next);
  assert.deepEqual(quote.blockers,[],scenario+' shared cash can fund expansion');
  assert.ok(quote.cashAfter>=0,scenario+' parent treasury remains solvent');
  send({...next,quoteRevision:s.revision});
  assert.equal(s.providerCampaign.missionStatus,'active',scenario+' funded expansion is not delivery');
  for(const stage of ['carrier','partner']){const request={...next,stage,customerId:'next-1-customer'},q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],scenario+'/'+stage);send({...request,quoteRevision:s.revision});}
  for(let minute=0;minute<90&&s.providerCampaign.missionStatus==='active';minute++){if(s.providerCampaign.customers[0].status==='renewal')send({action:'renew',customerId:'starter-customer'});s=advance(s,1);}
  assert.equal(s.providerCampaign.missionStatus,'won',scenario+' delivered expansion wins');
  assert.ok(s.providerCampaign.customers[1].metrics.completed>0);
  assert.equal(s.providerCampaign.mission.victoryProof.version,2);
  assert.equal(s.providerCampaign.mission.winnerCustomerId,'next-1-customer',scenario);
 }
});

test('SMB mission victory needs two profitable full periods and an actually funded second customer',()=>{
 for(const planId of ['swift','steady']){
  let s=start(),sequence=1;
  const fund=(stage,customerId)=>{
   const request={action:'purchase',offerId:'starter',planId,stage,...(customerId?{customerId}:{})};
   const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);
   s=provider(s,{...request,quoteRevision:s.revision},sequence++);
  };
  fund('base');s=advance(s,SOC.provider.rules.plans[planId].base.workMinutes);fund('carrier','starter-customer');s=advance(s,SOC.provider.rules.plans[planId].carrier.workMinutes);fund('partner','starter-customer');s=advance(s,SOC.provider.rules.plans[planId].partner.workMinutes+1);
  while(!s.providerCampaign.incidents.some(x=>x.status==='active')&&s.clock<50)s=advance(s,1);
  const incident=s.providerCampaign.incidents.find(x=>x.status==='active');
  s=provider(s,{action:'acknowledge-incident',incidentId:incident.id},sequence++);
  const repair={action:'operation',operationId:'repair',customerId:'starter-customer'};
  s=provider(s,{...repair,quoteRevision:s.revision},sequence++);
  s=advance(s,60-s.clock);
  assert.equal(s.providerCampaign.periodHistory.at(-1).qualified,false,'initial commissioning interval is not a full service period');
  s=advance(s,60);
  assert.equal(s.providerCampaign.periodHistory.at(-1).qualified,true,planId);
  assert.ok(s.providerCampaign.periodHistory.at(-1).operatingResult>0,planId);
  assert.equal(s.providerCampaign.mission.nextOpportunityAvailable,true,planId);
  s=advance(s,60);
  assert.equal(s.providerCampaign.periodHistory.at(-1).qualified,true,planId);
  assert.ok(s.providerCampaign.periodHistory.at(-1).operatingResult>0,planId);
  assert.equal(s.providerCampaign.mission.consecutiveQualifying,2,planId);
  const next={action:'purchase',offerId:'next-1',planId,stage:'base'};
  const q=SOC.provider.quote(s,next);assert.deepEqual(q.blockers,[]);assert.equal(q.cashAfter,s.business.balance.cash-q.setupCents);
  s=provider(s,{...next,quoteRevision:s.revision},sequence++);
  assert.equal(s.providerCampaign.missionStatus,'active',planId+' funded expansion is not delivery');
  assert.equal(s.providerCampaign.mission.winnerCustomerId,'next-1-customer',planId);
  assert.equal(s.providerCampaign.customers[1].status,'provisioning',planId);
  for(const stage of ['carrier','partner']){const request={...next,stage,customerId:'next-1-customer'},q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],planId+'/'+stage);s=provider(s,{...request,quoteRevision:s.revision},sequence++);}
  for(let minute=0;minute<90&&s.providerCampaign.missionStatus==='active';minute++){
   if(s.providerCampaign.customers[0].status==='renewal')s=provider(s,{action:'renew',customerId:'starter-customer'},sequence++);
   s=advance(s,1);
  }
  assert.equal(s.providerCampaign.missionStatus,'won',planId+' observed delivery wins');
  assert.ok(s.providerCampaign.customers[1].metrics.completed>0);
  assert.equal(s.providerCampaign.mission.victoryProof.version,2);
  const retainedHistory=s.providerCampaign.periodHistory.length,openingCash=s.business.balance.cash;
  s=provider(s,{action:'continue-career'},sequence++);
  assert.equal(s.providerCampaign.status,'operating',planId);
  assert.equal(s.providerCampaign.missionStatus,'won',planId+' earned mission status stays in retained history');
  assert.equal(SOC.provider.inspect(s).mission.status,'active',planId+' next operating chapter is active');
  assert.equal(s.providerCampaign.mission.focusCustomerId,'next-1-customer',planId);
  assert.equal(s.providerCampaign.periodHistory.length,retainedHistory,planId+' earned history retained');
  assert.equal(s.business.balance.cash,openingCash,planId+' shared treasury retained');
  assert.equal(SOC.provider.inspect(s).offers[1].id,'next-2',planId+' next authored offer');
  assert.equal(s.providerCampaign.customers[1].status,'active',planId+' actual second service');
  assert.ok(s.providerCampaign.customers[1].metrics.completed>0,planId+' actual second-customer delivery');
 }
});

test('provider save validation rejects forged authored pricing and customer links',()=>{
 let s=buy(start(),'base','swift',undefined,1);
 const forgedPrice=structuredClone(s);forgedPrice.providerCampaign.customers[0].stages.base.setupCents=1;
 assert.throws(()=>SOC.restore(JSON.stringify(forgedPrice)),/INVALID_PROVIDER_STAGE/);
 const forgedRetail=structuredClone(s);forgedRetail.providerCampaign.customers[0].retailCents=1;
 assert.throws(()=>SOC.restore(JSON.stringify(forgedRetail)),/INVALID_PROVIDER_CUSTOMER/);
 const forgedLink=structuredClone(s);forgedLink.portfolio.customers[0].root.providerCustomer.id='other-customer';
 assert.throws(()=>SOC.restore(JSON.stringify(forgedLink)),/INVALID_PROVIDER_CUSTOMER_LINK/);
 const forgedVersion=structuredClone(s);forgedVersion.providerCampaign.version=99;
 assert.throws(()=>SOC.restore(JSON.stringify(forgedVersion)),/INVALID_PROVIDER_CAMPAIGN/);
});

test('starter credit is an authored one-time loan with a revision-bound shared-business receipt',()=>{
 let s=start('smb');
 const request={action:'credit',offerId:'starter-credit'};
 const q=SOC.provider.quote(s,request);
 assert.deepEqual(q.blockers,[]);
 assert.equal(q.commercial.principalCents,100000);
 assert.equal(q.commercial.interestRateBpsPerPeriod,100);
 assert.equal(q.cashAfter,q.cash+100000);
 s=provider(s,{...request,quoteRevision:s.revision},8);
 assert.equal(s.business.balance.cash,q.cash+100000);
 assert.deepEqual(s.providerCampaign.credit.receipt,{id:'loan-1',principal:100000,rateBps:100});
 assert.ok(SOC.provider.quote(s,request).blockers.includes('CREDIT_ALREADY_USED'));
});
