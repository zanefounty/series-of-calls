'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),PREVIEW=require('../src/game/23-provider-change-preview'),RULES=require('../src/game/24-provider-rules');
const id='starter-customer',root=s=>s.portfolio.customers[0].root;
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[]);return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
const op=(s,operationId)=>buy(s,{action:'operation',operationId,customerId:id});
function advance(s,to){while(s.clock<to){const incident=s.providerCampaign.incidents.find(i=>i.status==='active');if(incident){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=op(s,'repair');}s=SOC.dispatch(s,{type:'advance',minutes:1});}return s;}
function opening(to=79){let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:id})});s=advance(s,15);s=op(s,'room');s=op(s,'recording');return advance(s,to);}
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}

test('migration comparison scopes actual live calls, identities and assigned numbers without mutating a funded campaign',()=>{
 const s=freeze(opening()),before=JSON.stringify(s),[staged,consolidated]=PREVIEW.comparison(s,id),r=root(s);
 assert.deepEqual(staged.cohort.map(i=>i.id),['bea']);assert.deepEqual(consolidated.cohort.map(i=>i.id),['alex','bea']);
 assert.equal(staged.target.id,'migration-phone');assert.equal(consolidated.target.id,'phone');
 assert.equal(staged.cohort[0].currentPlatform,SOC.operations.platform(r,'bea'));assert.equal(staged.cohort[0].present,true);assert.equal(staged.cohort[0].entitled,true);
 assert.deepEqual(staged.cohort[0].numbers,[{number:'+61255500201',status:'active',holder:'bea'}]);
 const bea=r.interactions.find(i=>i.channel==='voice'&&i.from==='bea'&&i.phase==='queued'),alex=r.interactions.find(i=>i.channel==='voice'&&i.from==='alex'&&['queued','handling'].includes(i.phase));assert.ok(bea&&alex);assert.ok(alex.voicePath&&alex.trace.some(t=>t.code==='CARRIER_PATH_ADMITTED'),'the unaffected path belongs to an actually admitted voice call, not a simultaneous digital case');
 assert.ok(staged.activeCalls.some(c=>c.id===bea.id&&c.reasons.includes('COHORT_PLACEMENT_CHANGE')));assert.ok(staged.unaffectedActiveCallIds.includes(alex.id));assert.ok(!staged.activeCalls.some(c=>c.id===alex.id));
 assert.ok(consolidated.activeCalls.some(c=>c.id===alex.id&&c.reasons.includes('DECLARED_PLATFORM_RECONFIGURED')));
 assert.ok(staged.activeCalls.every(c=>r.interactions.some(i=>i.id===c.id&&i.caseId===c.caseId)));assert.equal(staged.timing.guaranteedOutageMinutes,null);
 assert.equal(JSON.stringify(s),before);assert.equal(PREVIEW.preview(s,'other-customer','migration'),null);assert.equal(PREVIEW.preview(s,id,'repair'),null);
});

test('retained versus reconfigured room preview identifies the actual active session and its generation',()=>{
 const s=opening(80),[staged,consolidated]=PREVIEW.comparison(s,id),meeting=root(s).information.meetingSessions.find(m=>m.status==='active');assert.ok(meeting);
 assert.equal(staged.room.disposition,'retained');assert.equal(consolidated.room.disposition,'reconfigured');assert.equal(staged.room.currentGeneration,root(s).resources.phone.generation);
 assert.equal(staged.room.activeSessions[0].id,meeting.id);assert.deepEqual(staged.room.activeSessions[0].reasons,[]);assert.deepEqual(consolidated.room.activeSessions[0].reasons,['DECLARED_PLATFORM_RECONFIGURED']);
 assert.deepEqual(staged.room.activeSessions[0].platformDependency,meeting.platformDependency);assert.equal(staged.room.activeSessions[0].reservationHeld,meeting.reservationHeld);
 assert.ok(!staged.activeCalls.some(c=>root(s).interactions.find(i=>i.id===c.id).phase==='wrap'),'wrap work is not an active media call');
 assert.equal(staged.proofRequired.roomGeneration,true);assert.equal(staged.proofRequired.afterActualCutover,true);assert.deepEqual(consolidated.proofRequired.inboundCalls,['alex','bea']);
});

test('existing paid supplier terms remain exact and worker projection matches saved campaign projection',()=>{
 const s=opening(),before=JSON.stringify(s),preview=PREVIEW.preview(s,id,'migration');
 assert.equal(preview.obligations.unchanged,true);assert.equal(preview.obligations.projects.length,s.providerCampaign.projects.length);
 for(const row of preview.obligations.projects){const p=s.providerCampaign.projects.find(p=>p.id===row.id);assert.equal(row.setupCents,p.setupCents);assert.equal(row.periodCents,p.periodCents);assert.equal(row.postingId,p.postingId);assert.equal(row.minimumTermPeriods,p.kind==='stage'?RULES.data.plans[s.providerCampaign.customers[0].planId].minimumPeriods:p.minimumTermPeriods??null);if(p.kind==='stage'){assert.equal(row.commitmentEndsAt,p.acceptedAt+row.minimumTermPeriods*60);assert.equal(row.remainingMinimumCents,Math.ceil(p.periodCents*Math.max(0,row.commitmentEndsAt-s.clock)/60));}else if(p.minimumTermPeriods!==undefined)assert.equal(row.commitmentEndsAt,p.completedAt+p.minimumTermPeriods*60);}
 const restored=SOC.restore(before);assert.deepEqual(PREVIEW.preview(restored,id,'migration'),preview);
 const context={state:JSON.parse(before),id};vm.createContext(context);vm.runInContext(RULES.source()+PREVIEW.source()+';result=SOC_PROVIDER_CHANGE_PREVIEW.preview(state,id,"migration");',context);assert.deepEqual(JSON.parse(JSON.stringify(context.result)),preview);assert.equal(JSON.stringify(s),before);
});

test('legacy or different room dependencies cannot be described as a guaranteed phone replacement outage',()=>{
 const s=opening(80),legacy=structuredClone(s);delete legacy.providerCampaign.meetingDependencyVersion;delete root(legacy).information.meeting.effective.platformDependency;
 const p=PREVIEW.preview(legacy,id,'migration');assert.equal(p.room.disposition,'unproven');assert.deepEqual(p.replacedPlatforms,['phone']);assert.equal(p.proofRequired.roomGeneration,false);
 // Isolated projection counterexample: a room explicitly scoped elsewhere is
 // not affected merely because a phone platform is consolidated.
 const isolated=structuredClone(s),r=root(isolated);r.information.meeting.effective.platformDependency={version:1,resourceId:'other-platform'};r.information.meetingSessions.forEach(m=>{if(m.status==='active')m.platformDependency={...m.platformDependency,resourceId:'other-platform'};});
 const separate=PREVIEW.preview(isolated,id,'migration-consolidated');assert.equal(separate.room.disposition,'retained');assert.equal(separate.room.currentGeneration,null);assert.ok(separate.room.activeSessions.every(m=>m.reasons.length===0));
});


test('remaining stage and operation commitments reconcile exactly with the authoritative exit quote across fractional periods',()=>{
 let s=opening();
 for(const to of [79,80,81,97,120]){
  s=advance(s,to);const p=PREVIEW.preview(s,id,'migration'),q=SOC.provider.quote(s,{action:'exit',customerId:id});
  assert.equal(p.obligations.remainingMinimumCents,q.commercial.remainingMinimumSupplierCents,'remaining exposure at '+to);
  assert.equal(p.obligations.projects.reduce((n,row)=>n+row.remainingMinimumCents,0),q.commercial.remainingMinimumSupplierCents);
 }
 s=op(s,'carrier-headroom');
 for(let n=0;n<10;n++){
  const p=PREVIEW.preview(s,id,'migration'),q=SOC.provider.quote(s,{action:'exit',customerId:id});assert.equal(p.obligations.remainingMinimumCents,q.commercial.remainingMinimumSupplierCents,'pending/commissioning/complete exposure at '+s.clock);s=advance(s,s.clock+1);
 }
});
