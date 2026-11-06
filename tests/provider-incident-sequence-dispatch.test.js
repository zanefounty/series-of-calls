'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const period=SOC.provider.rules.periodMinutes;

function harness({legacy=false}={}){
 let sequence=1;
 const send=(state,command)=>SOC.dispatch(state,{type:'provider',requestId:`provider-${sequence++}`,command});
 let state=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',difficulty:'normal',seed:73});
 if(legacy)delete state.providerCampaign.incidentSequenceVersion;
 state=SOC.restore(JSON.stringify(state));
 return {get state(){return state;},set state(value){state=value;},send};
}
function buy(h,stage,customerId){
 const request={action:'purchase',offerId:'starter',planId:'swift',stage,...(customerId?{customerId}:{})};
 const quote=SOC.provider.quote(h.state,request);assert.deepEqual(quote.blockers,[],`${stage}: ${quote.blockers.join(', ')}`);
 h.state=h.send(h.state,{...request,quoteRevision:quote.atRevision});
}
function operation(h,operationId,customerId){
 const request={action:'operation',operationId,customerId},quote=SOC.provider.quote(h.state,request);
 assert.deepEqual(quote.blockers,[],`${operationId}: ${quote.blockers.join(', ')}`);
 h.state=h.send(h.state,{...request,quoteRevision:quote.atRevision});
 return h.state.providerCampaign.projects.at(-1);
}
function campaignControl(h){
 let s=h.state,acted=false,minuteRequired=false,p=s.providerCampaign;
 if(p.status==='won'){s=h.send(s,{action:'continue-career'});acted=true;p=s.providerCampaign;}
 for(const customer of p.customers.filter(row=>row.status==='renewal')){s=h.send(s,{action:'renew',customerId:customer.id});acted=true;}
 p=s.providerCampaign;
 for(const incident of p.incidents.filter(row=>row.status==='active')){s=h.send(s,{action:'acknowledge-incident',incidentId:incident.id});acted=true;minuteRequired=true;}
 p=s.providerCampaign;
 for(const incident of p.incidents.filter(row=>row.status==='acknowledged')){
  const pending=p.projects.some(project=>project.customerId===incident.customerId&&['repair','service-repair'].includes(project.operationId)&&project.status!=='cancelled'&&project.acceptedAt>=incident.acknowledgedAt);
  if(!pending){
   const operationId=incident.resource==='service'?'service-repair':'repair',request={action:'operation',operationId,customerId:incident.customerId},quote=SOC.provider.quote(s,request);
   if(!quote.blockers.length){s=h.send(s,{...request,quoteRevision:quote.atRevision});acted=true;}
   else minuteRequired=true;
  }else minuteRequired=true;
 }
 h.state=s;
 return {acted,minuteRequired};
}
function advanceUntil(h,predicate,limit,label){
 const start=h.state.clock;
 for(let turns=0;turns<limit+100&&!predicate(h.state);turns++){
  const elapsed=h.state.clock-start,remaining=limit-elapsed;
  if(remaining<=0)break;
  const work=campaignControl(h);
  if(work.minuteRequired){h.state=SOC.dispatch(h.state,{type:'advance',minutes:1});continue;}
  const toBoundary=period-(h.state.clock%period),minutes=Math.min(remaining,toBoundary);
  const before=h.state.clock;h.state=SOC.dispatch(h.state,{type:'advance',minutes});
  assert.ok(h.state.clock>before&&h.state.clock-before<=minutes,`${label} respects native incident/renewal pauses`);
 }
 assert.ok(predicate(h.state),`${label} not reached within ${limit} simulated minutes (clock ${h.state.clock})`);
 assert.ok(h.state.clock-start<=limit,`${label} stays inside its simulated-minute bound`);
 return h.state;
}
function provisionStarter(h){
 buy(h,'base');
 advanceUntil(h,s=>s.providerCampaign.customers.some(row=>row.id==='starter-customer'&&row.stages.base.status==='effective'),8,'base service');
 buy(h,'carrier','starter-customer');
 advanceUntil(h,s=>s.providerCampaign.customers.find(row=>row.id==='starter-customer').stages.carrier.status==='effective',8,'carrier service');
 buy(h,'partner','starter-customer');
 advanceUntil(h,s=>s.providerCampaign.customers.find(row=>row.id==='starter-customer').status==='active',8,'active customer');
}
function firstActiveIncident(h,afterCount=0){
 return advanceUntil(h,s=>s.providerCampaign.incidents.some(row=>row.customerId==='starter-customer'&&row.status==='active'&&s.providerCampaign.incidents.filter(x=>x.customerId==='starter-customer').length>afterCount),120,'authored SMB incident');
}
function settleFirstOutageWithPaidRepair(h){
 h.state=firstActiveIncident(h);
 const first=h.state.providerCampaign.incidents.find(row=>row.customerId==='starter-customer'&&row.status==='active');
 const beforeFailure=h.state.providerCampaign.customers.find(row=>row.id==='starter-customer').metrics.failed;
 h.state=SOC.dispatch(h.state,{type:'advance',minutes:6});
 assert.ok(h.state.providerCampaign.customers.find(row=>row.id==='starter-customer').metrics.failed>beforeFailure,'the actual carrier outage misses work before response');
 const blocked=SOC.provider.quote(h.state,{action:'operation',operationId:'repair',customerId:first.customerId});
 assert.ok(blocked.blockers.includes('INCIDENT_ACKNOWLEDGEMENT_REQUIRED'));
 const beforeCash=h.state.business.balance.cash;
 h.state=h.send(h.state,{action:'acknowledge-incident',incidentId:first.id});
 const quote=SOC.provider.quote(h.state,{action:'operation',operationId:'repair',customerId:first.customerId});
 assert.deepEqual(quote.blockers,[]);assert.equal(quote.setupCents,8000);
 h.state=h.send(h.state,{action:'operation',operationId:'repair',customerId:first.customerId,quoteRevision:quote.atRevision});
 const repair=h.state.providerCampaign.projects.findLast(project=>project.customerId===first.customerId&&project.operationId==='repair');
 assert.ok(repair.postingId);assert.equal(h.state.business.balance.cash,beforeCash-8000);
 assert.equal(h.state.providerCampaign.incidents.find(row=>row.id===first.id).status,'acknowledged');
 assert.equal(h.state.providerCampaign.incidents.find(row=>row.id===first.id).resolvedAt,null,'a paid order does not itself restore service');
 const command={type:'advance',minutes:1},expected=SOC.dispatch(h.state,command);
 let reply;const context={postMessage:value=>{reply=value;},setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:'incident-repair-worker-parity',state:clone(h.state),command}});
 assert.equal(reply.error,undefined);assert.deepEqual(clone(reply.state),expected,'worker and synchronous recovery tick are equivalent');
 h.state=expected;
 advanceUntil(h,s=>s.providerCampaign.projects.find(row=>row.id===repair.id)?.status==='complete',12,'paid carrier repair');
 const resolved=h.state.providerCampaign.incidents.find(row=>row.id===first.id);
 assert.equal(resolved.status,'resolved');assert.ok(resolved.resolvedAt>=repair.configSubmittedAt);
 assert.ok(h.state.business.ledger.some(row=>row.id===repair.postingId&&row.projectId===repair.id&&row.reason==='provider-operation'));
 return {firstId:first.id,repairId:repair.id,resolvedAt:resolved.resolvedAt};
}

test('AC-SOC-822 a paid SMB repair and renewal history lead only through actual demand to a second authored incident',()=>{
 const h=harness();assert.equal(h.state.providerCampaign.incidentSequenceVersion,1);
 provisionStarter(h);
 const first=settleFirstOutageWithPaidRepair(h),firstRow=h.state.providerCampaign.incidents.find(row=>row.id===first.firstId);
 assert.equal(firstRow.sequence,undefined,'the original first incident shape is unchanged');
 const secondStart=h.state.clock;
 h.state=advanceUntil(h,s=>s.providerCampaign.incidents.some(row=>row.customerId==='starter-customer'&&row.sequence?.ordinal===2&&row.status==='active'),480,'second native incident after paid recovery');
 const second=h.state.providerCampaign.incidents.find(row=>row.customerId==='starter-customer'&&row.sequence?.ordinal===2);
 assert.ok(second.createdAt>=first.resolvedAt+SOC.provider.rules.periodMinutes*6,'the authored recurrence waits 360 minutes after observed recovery');
 assert.equal(second.sequence.predecessorIncidentId,first.firstId);
 assert.equal(second.sequence.predecessorResolvedAt,first.resolvedAt);
 assert.equal(second.sequence.definition.resource,firstRow.resource);
 assert.equal(second.sequence.definition.kind,firstRow.kind);
 assert.equal(second.dueAt,second.createdAt+second.sequence.definition.delayMinutes);
 const ui={N_:key=>key,tr:()=>''};vm.createContext(ui);vm.runInContext(fs.readFileSync(require.resolve('../src/game/93-ui/79-provider-incidents.js'),'utf8'),ui);
 const inspected=SOC.provider.inspect(h.state),visibleIncident=inspected.incidents.find(row=>row.id===second.id),visibleCustomer=inspected.customers.find(row=>row.id==='starter-customer');
 const rendered=ui.SOCProviderIncidents.render(visibleIncident,visibleCustomer,[],{});
 assert.match(rendered,/Follow-up incident 2: scheduled after recovery and more delivered customer work, with at least 360 minutes between incidents\./,'the actual repeat is explained in the incident inspector');
 const trigger=h.state.providerCampaign.events.find(event=>event.id===second.sequence.trigger.eventId);
 assert.ok(trigger);assert.equal(trigger.code,'CUSTOMER_WORK_COMPLETED');assert.equal(trigger.customerId,'starter-customer');assert.ok(trigger.completedAt>first.resolvedAt);assert.ok(trigger.completedAt<=trigger.at);assert.equal(trigger.at,second.createdAt);
 assert.ok(h.state.providerCampaign.events.some(event=>event.code==='CUSTOMER_RENEWED'&&event.customerId==='starter-customer'),'the service remained active through paid renewals');
 assert.ok(h.state.providerCampaign.customers.find(row=>row.id==='starter-customer').metrics.completed>0,'real provider demand continued while waiting');
 const badVersion=clone(h.state);badVersion.providerCampaign.incidentSequenceVersion=2;
 assert.throws(()=>SOC.restore(JSON.stringify(badVersion)),/INVALID_PROVIDER_INCIDENT_SEQUENCE_VERSION/);
 const badOrdinal=clone(h.state);badOrdinal.providerCampaign.incidents.find(row=>row.id===second.id).sequence.ordinal++;
 assert.throws(()=>SOC.restore(JSON.stringify(badOrdinal)),/INVALID_PROVIDER_INCIDENT_SEQUENCE/);
 const badTriggerTime=clone(h.state);badTriggerTime.providerCampaign.events.find(event=>event.id===second.sequence.trigger.eventId).completedAt++;
 assert.throws(()=>SOC.restore(JSON.stringify(badTriggerTime)),/INVALID_PROVIDER_INCIDENT_SEQUENCE|INVALID_PROVIDER_COMPLETED_WORK_EVENT/);
 const missingPinnedTrigger=clone(h.state);missingPinnedTrigger.providerCampaign.events=missingPinnedTrigger.providerCampaign.events.filter(event=>event.id!==second.sequence.trigger.eventId);
 assert.throws(()=>SOC.restore(JSON.stringify(missingPinnedTrigger)),/INVALID_PROVIDER_INCIDENT_SEQUENCE/,'a missing pinned work event cannot validate the incident');
 const previousTriggerId=second.sequence.trigger.eventId;
 h.state=advanceUntil(h,s=>s.clock>=secondStart+period*3,period*3+10,'bounded event-pruning pressure');
 assert.ok(h.state.providerCampaign.eventCheckpoint.count>0,'ordinary campaign events were pruned under bounded retention');
 assert.ok(h.state.providerCampaign.events.some(event=>event.id===previousTriggerId),'the actual second-incident trigger remains pinned after event pruning');
 assert.deepEqual(SOC.restore(JSON.stringify(h.state)),clone(h.state),'the recovered and pruned sequence remains restorable');
});

test('AC-SOC-823 a marker-absent legacy SMB save retains its original one-shot incident behavior',()=>{
 const h=harness({legacy:true});assert.equal(h.state.providerCampaign.incidentSequenceVersion,undefined);assert.deepEqual(SOC.restore(JSON.stringify(h.state)),h.state);
 provisionStarter(h);
 const first=settleFirstOutageWithPaidRepair(h),firstIncident=h.state.providerCampaign.incidents.find(row=>row.id===first.firstId);
 assert.equal(firstIncident.sequence,undefined);
 h.state=advanceUntil(h,s=>s.clock>=first.resolvedAt+SOC.provider.rules.periodMinutes*7,520,'legacy post-recovery demand and renewal');
 assert.equal(h.state.providerCampaign.incidents.filter(row=>row.customerId==='starter-customer').length,1,'legacy save remains one-shot after ongoing dispatched customer work');
 assert.ok(h.state.providerCampaign.customers.find(row=>row.id==='starter-customer').metrics.completed>0);
 assert.equal(h.state.providerCampaign.events.some(event=>event.code==='CUSTOMER_WORK_COMPLETED'),false,'legacy saves do not gain the versioned trigger journal');
 assert.deepEqual(SOC.restore(JSON.stringify(h.state)),h.state);
});
