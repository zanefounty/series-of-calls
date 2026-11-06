'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),CAMPAIGN=require('../src/game/25-provider-campaign');
const customerId='starter-customer',copy=x=>JSON.parse(JSON.stringify(x));
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify(q.blockers));return send(s,{...request,quoteRevision:q.atRevision});}
function paidOpening(){let s=SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty:'easy'});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});return s;}
function advance(s){for(const i of s.providerCampaign.incidents.filter(i=>i.status==='active')){s=send(s,{action:'acknowledge-incident',incidentId:i.id});s=buy(s,{action:'operation',operationId:i.resource==='service'?'service-repair':'repair',customerId:i.customerId});}return SOC.dispatch(s,{type:'advance',minutes:1});}
let settlementFixture;
function pendingBill(){if(!settlementFixture){let s=paidOpening();while(s.clock<59)s=advance(s);settlementFixture=s;}return copy(settlementFixture);}

test('AC-SOC-846 Provider restore conserves emitted events across retained rows and archive counters',()=>{
 const state=paidOpening(),original=JSON.stringify(state);
 assert.ok(state.providerCampaign.events.length>1);
 const mutations=[
  ['deleted event',p=>p.events.pop()],
  ['duplicate event ID',p=>{p.events[1].id=p.events[0].id;}],
  ['future event ID',p=>{p.events[0].id=`provider-event-${p.nextEventId}`;}],
  ['future event time',p=>{p.events[0].at=state.clock+1;}],
  ['unaccounted archived event',p=>{p.eventCheckpoint.count++;p.eventCheckpoint.lastId=p.events[0].id;}],
  ['invented archive code count',p=>{p.eventCheckpoint.codes.CUSTOMER_WORK_ARRIVED=1;}],
  ['invalid archive code count',p=>{p.eventCheckpoint.codes.CUSTOMER_WORK_ARRIVED=-1;}],
  ['invented next event',p=>{p.nextEventId++;}]
 ];
 for(const [name,mutate] of mutations){const forged=copy(state);mutate(forged.providerCampaign);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_(EVENT|WORKFORCE)/,name);assert.equal(JSON.stringify(state),original);}
 assert.deepEqual(SOC.restore(original),state);
 // Structural legacy-buffer fixture: an older pinned row was removed after a
 // newer row. This models the former last-removed checkpoint, not a maximum ID.
 const older=copy(state),rows=older.providerCampaign.events.splice(0,2),checkpoint=older.providerCampaign.eventCheckpoint;
 checkpoint.count=rows.length;checkpoint.lastId=rows[0].id;for(const row of rows)checkpoint.codes[row.code]=(checkpoint.codes[row.code]||0)+1;
 assert.deepEqual(SOC.restore(JSON.stringify(older)),older,'legacy last-removed checkpoints can precede the archived count');
 const command={type:'advance',minutes:1},expected=SOC.dispatch(state,command);let result;
 const context={postMessage:value=>{result=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:'event-accounting',state,command}});
 assert.equal(result.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(result.state)),expected);assert.deepEqual(SOC.dispatch(SOC.restore(original),command),expected);
});

test('AC-SOC-674 paid Provider copy remains a separate custom Lab and relabelling its exported copy cannot restore earned authority',()=>{
 let s=paidOpening();s=SOC.dispatch(s,{type:'advance',minutes:10});const original=JSON.stringify(s),lab=SOC.dispatch(s,{type:'copy-to-lab',customerId});
 assert.deepEqual(lab.experience,{version:1,kind:'lab',custom:true});assert.equal(lab.providerCampaign,undefined);assert.equal(lab.providerCustomer,undefined);assert.equal(lab.labSource.customerId,customerId);assert.equal(JSON.stringify(s),original);
 const authored=SOC.dispatch(lab,{type:'configure',id:'carrier',config:{capacity:9}}),labBytes=JSON.stringify(authored);assert.deepEqual(SOC.restore(labBytes),authored);
 for(const mode of [authored.mode,'guided']){const forged=copy(authored);forged.experience={version:1,kind:'campaign',custom:false};forged.mode=mode;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/^Error: CAMPAIGN_STATE_REQUIRED$/,'changing labels does not recreate treasury, paid ownership and campaign authority');}
 assert.equal(JSON.stringify(authored),labBytes);assert.equal(JSON.stringify(s),original);assert.deepEqual(SOC.restore(original),s);
});

test('AC-SOC-675 save one minute before actual Provider settlement yields identical next ledger, outcomes and worker continuation',()=>{
 const s=pendingBill(),bytes=JSON.stringify(s),customer=s.providerCampaign.customers[0];assert.equal(s.clock,59);assert.equal(customer.history.length,0);assert.equal(s.providerCampaign.periodHistory.length,0);assert.ok(customer.period.voiceMinutes>0);assert.ok(s.providerCampaign.jobs.some(j=>j.status==='completed'));assert.ok(s.providerCampaign.incidents.some(i=>i.status==='resolved'));
 const command={type:'advance',minutes:1},direct=SOC.dispatch(s,command),restored=SOC.dispatch(SOC.restore(bytes),command);assert.deepEqual(restored,direct);assert.equal(JSON.stringify(s),bytes);
 let response;const worker={postMessage:r=>{response=r;}};vm.createContext(worker);vm.runInContext(SOC.workerSource(),worker);worker.onmessage({data:{id:675,state:SOC.restore(bytes),command}});assert.equal(response.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(response.state)),direct);
 assert.equal(direct.clock,60);assert.equal(direct.providerCampaign.periodHistory.length,1);const h=direct.providerCampaign.customers[0].history[0];assert.equal(h.settledAt,60);assert.equal(h.fullPeriod,false);assert.equal(h.qualified,false);assert.equal(direct.providerCampaign.missionStatus,'active');
 const oldIds=new Set(s.business.ledger.map(e=>e.id)),postings=direct.business.ledger.filter(e=>!oldIds.has(e.id));assert.ok(postings.some(e=>e.reason==='provider-voice-usage'));assert.ok(postings.some(e=>e.reason==='provider-customer-period'));assert.equal(new Set(postings.map(e=>e.id)).size,postings.length);assert.equal(postings.filter(e=>e.reason==='provider-voice-usage').reduce((n,e)=>n+e.cents,0),h.voiceCost);
 const after=SOC.dispatch(SOC.restore(JSON.stringify(direct)),command);for(const entry of postings)assert.equal(after.business.ledger.filter(e=>e.id===entry.id).length,1);assert.equal(after.providerCampaign.periodHistory.length,1);assert.deepEqual(SOC.restore(JSON.stringify(direct)),direct);
});

function missionRuleFixture(){
 // Isolated predicate fixture, never dispatched/imported or represented as an earned win.
 const periods=[1,2].map(period=>({period,from:period*60,to:(period+1)*60,focusCustomerId:'focus',due:24,completedOnTime:22,operatingResult:10000,qualified:true,solvency:'current'}));
 const event={id:'provider-event-1',code:'MISSION_WON',at:180,customerId:'next',qualifiedPeriods:2,nextStage:'base'},proof={version:1,eventId:event.id,scenario:'smb',at:180,focusCustomerId:'focus',winnerCustomerId:'next',qualifiedPeriods:2,nextStage:'base',periods:copy(periods)};
 return {s:{clock:180,providerCampaign:{customers:[{id:'focus',scenario:'smb'},{id:'next',scenario:'smb',stages:{base:{projectId:'funded-base'}}}],projects:[{id:'funded-base',customerId:'next',kind:'stage',stage:'base',status:'running',acceptedAt:180}],events:[event],incidents:[{customerId:'focus',status:'resolved',createdAt:25,resolvedAt:30}],periodHistory:periods,historyCheckpoint:{periods:0},eventCheckpoint:{count:0,codes:{}}}},proof};
}
test('AC-SOC-676 quiet and partial public periods cannot win; isolated mission-rule counterexamples reject underfilled periods and overdue incidents',()=>{
 let quiet=SOC.create({experience:'campaign',difficulty:'easy'});quiet=SOC.dispatch(quiet,{type:'advance',minutes:60});assert.equal(quiet.providerCampaign.missionStatus,'active');assert.equal(quiet.providerCampaign.mission.consecutiveQualifying,0);assert.equal(quiet.providerCampaign.periodHistory.length,1);assert.ok(quiet.providerCampaign.periodHistory.every(p=>p.due===0&&!p.qualified));
 const partial=SOC.dispatch(pendingBill(),{type:'advance',minutes:1});assert.equal(partial.providerCampaign.periodHistory[0].qualified,false);assert.equal(partial.providerCampaign.missionStatus,'active');
 const {s,proof}=missionRuleFixture();assert.equal(CAMPAIGN.retainedMissionVictory(s,proof),true,'isolated rule baseline, not public earned evidence');
 for(const mutate of [
  (s,p)=>{s.providerCampaign.periodHistory[0].due=p.periods[0].due=0;s.providerCampaign.periodHistory[0].completedOnTime=p.periods[0].completedOnTime=0;},
  (s,p)=>{s.providerCampaign.periodHistory[0].from=p.periods[0].from=65;},
  (s,p)=>{s.providerCampaign.periodHistory[0].completedOnTime=p.periods[0].completedOnTime=21;},
  (s,p)=>{s.providerCampaign.periodHistory[0].operatingResult=p.periods[0].operatingResult=0;},
  (s,p)=>{s.providerCampaign.periodHistory[0].solvency=p.periods[0].solvency='default';},
  s=>{s.providerCampaign.incidents.push({customerId:'focus',status:'active',createdAt:100,dueAt:110,resolvedAt:null});},
  s=>{s.providerCampaign.incidents.push({customerId:'focus',status:'acknowledged',createdAt:100,dueAt:110,resolvedAt:null});},
  s=>{s.providerCampaign.projects[0].status='cancelled';}
 ]){const a=copy(s),b=copy(proof);mutate(a,b);assert.equal(CAMPAIGN.retainedMissionVictory(a,b),false);}
 // Pure quotation predicate on an isolated negative copy: arrears cannot fund expansion.
 for(const status of ['grace','default']){const debt=copy(partial);debt.business.solvency.status=status;const q=SOC.provider.quote(debt,{action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});assert.ok(q.blockers.includes('INSOLVENT'));}
});
