"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
// Isolated campaign checkpoint fixture. Expose the real private event appender without
// changing its implementation; this is not a dispatched paid PN claim or SOC.restore test.
function campaignWithEventAppender(){
 const file=path.join(__dirname,'../src/game/25-provider-campaign.js'),source=fs.readFileSync(file,'utf8'),seam='return {ordinaryVoiceDemand,validateRetainedSettlement';
 assert.ok(source.includes(seam),'campaign export seam');const sandbox={module:{exports:{}},require:createRequire(file)};vm.createContext(sandbox);
 vm.runInContext(source.replace(seam,'return {appendFixtureEvent:addEvent,ordinaryVoiceDemand,validateRetainedSettlement'),sandbox);return sandbox.module.exports;
}
function fixture(){
 const focusCustomerId='starter-customer',winnerCustomerId='next-1-customer',periods=[1,2].map(period=>({period,from:period*60,to:(period+1)*60,focusCustomerId,due:24,completedOnTime:24,operatingResult:10000,qualified:true,solvency:'current'}));
 const victory={id:'provider-event-3',at:180,code:'MISSION_WON',customerId:winnerCustomerId,qualifiedPeriods:2,nextStage:'funded'},proof={version:1,eventId:victory.id,scenario:'smb',at:180,focusCustomerId,winnerCustomerId,qualifiedPeriods:2,nextStage:'funded',periods};
 const events=[{id:'provider-event-1',at:70,code:'CUSTOMER_WORK_ARRIVED'},{id:'provider-event-2',at:71,code:'CUSTOMER_WORK_ARRIVED'},victory,...Array.from({length:197},(_,n)=>({id:`provider-event-${n+4}`,at:181,code:'CUSTOMER_WORK_ARRIVED'}))];
 return {clock:181,providerCampaign:{events,nextEventId:201,eventCheckpoint:{count:0,lastId:null,codes:{}},progressionReceipts:{receipts:[{sourceId:'progress.goal.pn',sourceEvidence:{outbound:{arrival:events[0]},inbound:{arrival:events[1]}}}]},customers:[{id:focusCustomerId,scenario:'smb'},{id:winnerCustomerId,scenario:'smb',stages:{base:{projectId:'provider-project-4'}}}],projects:[{id:'provider-project-4',customerId:winnerCustomerId,kind:'stage',stage:'base',acceptedAt:180,status:'running'}],incidents:[{customerId:focusCustomerId,status:'resolved',createdAt:30,resolvedAt:40}],periodHistory:structuredClone(periods),historyCheckpoint:{periods:0},mission:{victoryProof:proof}}};
}
test('AC-SOC-699 isolated PN event pins preserve a saved mission victory at the first noncontiguous eviction boundary',()=>{
 const api=campaignWithEventAppender(),s=fixture(),p=s.providerCampaign,proof=structuredClone(p.mission.victoryProof);
 assert.equal(api.retainedMissionVictory(s,proof),true,'complete qualifying settlements and funded expansion are present before eviction');
 api.appendFixtureEvent(p,181,'INCIDENT_ACKNOWLEDGED',{incidentId:'incident-later',customerId:'starter-customer'});
 assert.equal(p.events.length,200);assert.ok(p.events.some(e=>e.id==='provider-event-1'));assert.ok(p.events.some(e=>e.id==='provider-event-2'));assert.equal(p.events.some(e=>e.id===proof.eventId),false);
 assert.equal(p.eventCheckpoint.count,1,'only one row was removed, despite its sequence number being three');assert.equal(p.eventCheckpoint.lastId,proof.eventId);assert.equal(p.eventCheckpoint.codes.MISSION_WON,1);
 assert.equal(api.retainedMissionVictory(s,proof),true,'historical mission validation must not fail during the two-event count/high-water gap');
 // Previously pinned older rows can become evictable later. Their removal must
 // not move the pruning boundary behind the already evicted victory event.
 p.progressionReceipts.receipts=[];
 api.appendFixtureEvent(p,182,'INCIDENT_ACKNOWLEDGED',{incidentId:'incident-later',customerId:'starter-customer'});
 assert.equal(p.events.some(event=>event.id==='provider-event-1'),false);
 assert.equal(p.eventCheckpoint.lastId,proof.eventId,'evicting an older released pin preserves the high-water mark');
 assert.equal(api.retainedMissionVictory(s,proof),true,'historical victory survives a later out-of-order eviction');
 const restored=JSON.parse(JSON.stringify(s));assert.equal(api.retainedMissionVictory(restored,restored.providerCampaign.mission.victoryProof),true,'the serialized checkpoint/proof retain identical meaning');
 const beyond=structuredClone(proof);beyond.eventId='provider-event-201';assert.equal(api.retainedMissionVictory(s,beyond),false,'a retained unrelated event cannot impersonate the victory');beyond.eventId='provider-event-202';assert.equal(api.retainedMissionVictory(s,beyond),false,'a missing future event is not covered by the checkpoint');
 const missing=structuredClone(restored);delete missing.providerCampaign.eventCheckpoint.codes.MISSION_WON;assert.equal(api.retainedMissionVictory(missing,proof),false,'the high-water mark alone is insufficient');
 const fake=structuredClone(proof);fake.periods[0].operatingResult++;assert.equal(api.retainedMissionVictory(restored,fake),false,'retained settlements remain authoritative');
});

test('AC-SOC-790 retained work arrivals from multiple earned windows leave room for subsequent live events',()=>{
 const api=campaignWithEventAppender(),s=fixture(),p=s.providerCampaign;
 // Isolated appender capacity fixture, not proof that these synthetic claims can be earned.
 p.progressionReceipts.receipts.push(...['c3','c5','t2','l7'].map((source,n)=>({sourceId:'progress.goal.'+source,workProofs:Array.from({length:60},(_,i)=>({arrivalEventId:'provider-event-'+(n*60+i+1)}))})));
 for(let i=0;i<600;i++)api.appendFixtureEvent(p,181,'INCIDENT_ACKNOWLEDGED',{incidentId:'incident-later',customerId:'starter-customer'});
 for(let i=1;i<=240;i++)assert.ok(p.events.some(event=>event.id==='provider-event-'+i));
 assert.equal(p.events.length,440);
 assert.equal(p.events.filter(event=>Number(event.id.slice(15))>240).length,200);
 assert.equal(p.events.at(-1).id,'provider-event-800');
 assert.equal(p.eventCheckpoint.count+p.events.length,800);
});
