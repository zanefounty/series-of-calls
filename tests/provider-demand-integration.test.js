const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');

const CUSTOMER='starter-customer';
let requestId=0;
const digitalWrapOverlaps=[];
const recoveredIncidentIds=[];

function start(scenario){
  requestId=0;
  digitalWrapOverlaps.length=0;
  recoveredIncidentIds.length=0;
  return SOC.create({experience:'campaign',scenario,market:'au-sydney',difficulty:'normal'});
}
function send(s,command){
  return SOC.dispatch(s,{type:'provider',requestId:`provider-${++requestId}`,command});
}
function tick(s){
  const next=SOC.dispatch(s,{type:'advance',minutes:1});
  const assignments=next.portfolio?.customers.find(x=>x.id===CUSTOMER)?.root.workforceOps?.assignments||[];
  const people=new Set(assignments.filter(x=>x.status==='wrap'&&x.channel==='digital').map(x=>x.person));
  for(const person of people)if(assignments.some(x=>x.person===person&&x.status==='digital'))digitalWrapOverlaps.push({at:next.clock,person});
  return next;
}
function buy(s,stage,planId='swift'){
  const command={action:'purchase',offerId:'starter',planId,stage,...(stage==='base'?{}:{customerId:CUSTOMER})};
  const quote=SOC.provider.quote(s,command);
  assert.deepEqual(quote.blockers,[],`fund ${stage}: ${quote.blockers.join(',')}`);
  return send(s,{...command,quoteRevision:s.revision});
}
function project(s,operationId){return s.providerCampaign.projects.find(x=>x.customerId===CUSTOMER&&x.operationId===operationId);}
function recover(s){
  for(let attempts=0;attempts<8;attempts++){
    const incident=s.providerCampaign.incidents.find(x=>x.customerId===CUSTOMER&&['active','acknowledged'].includes(x.status));
    if(!incident)return s;
    const existing=project(s,'repair');
    if(existing&&['running','commissioning'].includes(existing.status)){
      s=tick(s);
      continue;
    }
    if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
    const command={action:'operation',operationId:'repair',customerId:CUSTOMER};
    let quote=SOC.provider.quote(s,command);
    if(quote.blockers.some(x=>x==='ENGINEER_CAPACITY'||x==='SUPPORT_CAPACITY')){
      s=send(s,{action:'staff',engineers:Math.max(4,quote.commercial.staffing.currentEngineers),support:Math.max(4,quote.commercial.staffing.currentSupport)});
      quote=SOC.provider.quote(s,command);
    }
    assert.deepEqual(quote.blockers,[],`repair ${incident.id}: ${quote.blockers.join(',')}`);
    s=send(s,{...command,quoteRevision:s.revision});
    for(let n=0;n<20&&s.providerCampaign.incidents.some(x=>x.id===incident.id&&x.status!=='resolved');n++)s=tick(s);
    assert.equal(s.providerCampaign.incidents.find(x=>x.id===incident.id)?.status,'resolved',`incident recovery ${incident.id}`);
    recoveredIncidentIds.push(incident.id);
  }
  return s;
}
function advance(s,count){for(let i=0;i<count;i++){s=tick(s);s=recover(s);if(['failed','won'].includes(s.providerCampaign.status))break;}return s;}
function commissionSetup(s,scenario){
  s=buy(s,'base');
  if(scenario==='government')s=operation(s,'recording');
  s=buy(s,'carrier');s=buy(s,'partner');
  for(let n=0;n<240&&s.providerCampaign.customers[0].status!=='active';n++){s=tick(s);s=recover(s);}
  assert.equal(s.providerCampaign.customers[0].status,'active','base, carrier and partner must be observed before demand assertions');
  return s;
}
function operation(s,operationId){
  const command={action:'operation',operationId,customerId:CUSTOMER};
  for(let wait=0;wait<120;wait++){
    let quote=SOC.provider.quote(s,command);
    if(!quote.blockers.length){
      s=send(s,{...command,quoteRevision:s.revision});
      break;
    }
    if(quote.blockers.some(x=>x==='ENGINEER_CAPACITY'||x==='SUPPORT_CAPACITY'))
      s=send(s,{action:'staff',engineers:Math.max(4,quote.commercial.staffing.currentEngineers),support:Math.max(4,quote.commercial.staffing.currentSupport)});
    else if(quote.blockers.includes('CUSTOMER_NOT_ACTIVE'))s=tick(s);
    else assert.fail(`${operationId} blocked: ${quote.blockers.join(',')}`);
  }
  for(let n=0;n<160&&project(s,operationId)?.status!=='complete';n++){s=tick(s);s=recover(s);}
  assert.equal(project(s,operationId)?.status,'complete',`${operationId} must complete from actual readiness`);
  return s;
}
function nextPlan(s,periodIndex,maxMinutes=240){
  for(let n=0;n<maxMinutes;n++){
    const plan=s.providerCampaign.customers.find(x=>x.id===CUSTOMER)?.period?.demandPlan;
    if(plan?.request?.periodIndex===periodIndex)return {s,result:plan.result};
    s=tick(s);s=recover(s);
  }
  assert.fail(`period ${periodIndex} demand plan was not created`);
}
function child(s){return s.portfolio.customers.find(x=>x.id===CUSTOMER).root;}

test('SMB social connector substitutes three eligible calls and reserves one authored handoff choice and preserves 24 unique case obligations',()=>{
  let s=commissionSetup(start('smb'),'smb');
  s=operation(s,'cisco-programmable-engagement');
  const planned=nextPlan(s,Math.floor(s.clock/60)+1);s=planned.s;const result=planned.result;
  assert.equal(result.totalCases,24);
  assert.equal(result.handoffReservations,1);
  assert.equal(result.jobs.filter(j=>j.handoffPreference==='socialMessaging'&&j.channel==='voice').length,1);
  assert.equal(result.actualVoiceCount,13);
  assert.equal(result.actualDigitalCount,11);
  assert.equal(result.actualMeetingCount,0);
  assert.ok(result.actualVoiceCount>=result.voiceFloor);
  assert.equal(new Set(result.jobs.map(x=>x.caseId)).size,24);
  assert.equal(result.jobs.filter(x=>x.channel==='message').length,11);
  const converted=result.jobs.filter(x=>x.preference==='socialMessaging');
  assert.equal(converted.length,3);
  assert.ok(converted.every(x=>x.channel==='message'&&x.account==='chatterleaf'&&x.operationId==='cisco-programmable-engagement'));
  s=advance(s,(result.periodIndex+1)*60-s.clock);
  const periodJobs=s.providerCampaign.jobs.filter(x=>x.customerId===CUSTOMER&&x.periodIndex===result.periodIndex);
  assert.equal(periodJobs.length,24,'actual provider scheduler creates exactly the authored 24 cases');
  assert.equal(new Set(periodJobs.map(x=>x.caseId)).size,24);
  assert.equal(periodJobs.filter(x=>x.channel==='voice').length,13);
  assert.equal(periodJobs.filter(x=>x.channel==='message').length,11);
  assert.ok(periodJobs.filter(x=>x.preference==='socialMessaging').every(x=>x.interactionId&&x.channel==='message'));
  assert.ok(recoveredIncidentIds.length>0,'authored incident was repaired using public campaign commands');
});

test('enterprise workplace account and video meetings retain 24 distinct scheduled cases with real session lineage',()=>{
  let s=commissionSetup(start('enterprise'),'enterprise');
  s=operation(s,'ms-communications-api');
  s=operation(s,'recording');
  s=operation(s,'cisco-meetings-interoperability');
  const c=child(s);
  assert.ok(c.channels.accounts.workplace?.effective,'workplace account has effective configuration');
  assert.equal(c.channels.accounts.workplace.provisioning.status,'ready');
  assert.ok(c.channels.permissions.some(x=>x.channel==='workplace'&&x.tenant===c.tenant&&x.person==='alex'&&x.purpose==='service'&&x.granted));
  const planned=nextPlan(s,Math.floor(s.clock/60)+1);s=planned.s;const result=planned.result;
  assert.equal(result.totalCases,24);
  assert.equal(result.actualVoiceCount,12,JSON.stringify({request:s.providerCampaign.customers[0].period.demandPlan.request,accounts:c.channels.accounts,projects:s.providerCampaign.projects.filter(x=>x.kind==='operation').map(x=>[x.operationId,x.status])}));
  assert.equal(result.actualDigitalCount,10);
  assert.equal(result.actualMeetingCount,2);
  assert.ok(result.actualVoiceCount>=result.voiceFloor);
  assert.equal(new Set(result.jobs.map(x=>x.caseId)).size,24);
  assert.ok(result.jobs.filter(x=>x.account==='workplace').every(x=>x.channel==='message'&&x.operationId==='ms-communications-api'));
  assert.ok(result.jobs.filter(x=>x.channel==='meeting').every(x=>x.operationId==='cisco-meetings-interoperability'));
  const periodIndex=result.periodIndex;
  s=advance(s,(periodIndex+1)*60-s.clock);
  const periodJobs=s.providerCampaign.jobs.filter(x=>x.customerId===CUSTOMER&&x.periodIndex===periodIndex);
  assert.equal(periodJobs.length,24);
  assert.equal(new Set(periodJobs.map(x=>x.caseId)).size,24);
  const meetingJobs=periodJobs.filter(x=>x.channel==='meeting');
  assert.equal(meetingJobs.length,2);
  for(const job of meetingJobs){
    const finalChild=child(s),session=finalChild.information?.meetingSessions.find(x=>x.id===job.sessionId);
    const booking=finalChild.information?.bookings.find(x=>x.id===session?.bookingId);
    assert.ok(session&&booking,'meeting job links to actual session and booking');
    assert.equal(booking.caseId,job.caseId);
    assert.equal(session.status,'completed',JSON.stringify({job,session,booking,meetings:finalChild.information.meetingSessions}));
    assert.equal(session.endedAt-session.startedAt,3);
  }
  assert.ok(recoveredIncidentIds.length>0,'real authored incidents were acknowledged and repaired through campaign commands');
});

test('a message retry uses the same case context and its accepted usage is charged once',()=>{
  let s=commissionSetup(start('smb'),'smb');
  s=operation(s,'cisco-programmable-engagement');
  const plannedPlan=nextPlan(s,Math.floor(s.clock/60)+1);s=plannedPlan.s;const plan=plannedPlan.result;
  const planned=plan.jobs.find(x=>x.channel==='message');
  assert.ok(planned,'social preference creates real eligible digital work');
  const absoluteArrival=plan.periodIndex*60+planned.arrivalAt;
  s=advance(s,Math.max(0,absoluteArrival-s.clock+8));
  const c=child(s),campaignJob=s.providerCampaign.jobs.find(x=>x.customerId===CUSTOMER&&x.caseId===planned.caseId);
  assert.ok(campaignJob,'planned case reaches campaign job execution');
  assert.equal(campaignJob.channel,'message');
  assert.ok(campaignJob.interactionId);
  const interaction=c.interactions.find(x=>x.id===campaignJob.interactionId);
  assert.equal(interaction.caseId,planned.caseId);
  assert.ok(interaction.context,'actual message retains provider case context');
  const workflow=c.operations?.jobs?.find(x=>x.interaction===interaction.id||x.caseId===planned.caseId);
  assert.ok(workflow,'actual workflow delivery job is linked to the case interaction');
  assert.ok(['accepted','delivered'].includes(workflow.status),'retry path eventually records accepted delivery');
  assert.ok(workflow.attempts>=2,'authored transient failure caused a real retry');
  const receipt=(c.channels.webhooks.deliveries||[]).find(x=>x.caseId===planned.caseId||x.interactionId===interaction.id);
  assert.ok(receipt,'delivery receipt is retained against the same case');
  assert.equal(receipt.caseId,planned.caseId);
  assert.equal(campaignJob.messageCharged,true);
  s=advance(s,(plan.periodIndex+1)*60-s.clock);
  const messagePosts=s.business.ledger.filter(x=>x.customerId===CUSTOMER&&x.period===plan.periodIndex&&x.reason==='provider-message-usage');
  assert.equal(messagePosts.length,1,`period settlement posts message usage once; rows=${JSON.stringify(s.business.ledger.filter(x=>x.reason==='provider-message-usage'))}`);
  assert.equal(messagePosts[0].quantity,12,'one period ledger posting accounts for all twelve accepted digital messages without repeated retry charges');
  assert.ok(digitalWrapOverlaps.length>0,'an already in-flight digital assignment can overlap wrap without invalidating the bounded concurrency snapshot');
  assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'observed in-flight wrap state and campaign receipts survive validated restore');
  assert.ok(recoveredIncidentIds.length>0,'incident recovery ran through campaign commands while delivering the retry workload');
});
