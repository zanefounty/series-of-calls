'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const child=s=>s.portfolio.customers[0].root;
const tick=s=>SOC.dispatch(s,{type:'advance',minutes:1});
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify(q.blockers));return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
const operation=(s,id)=>buy(s,{action:'operation',operationId:id,customerId:'starter-customer'});
function advance(s,to){while(s.clock<to){const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status));if(incident){if(incident.status==='active')s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});if(!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status)))s=operation(s,'repair');}s=tick(s);}return s;}
function opening(){let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});s=advance(s,15);s=operation(s,'room');s=operation(s,'recording');return advance(s,30);}
for(const id of ['migration','migration-consolidated'])test(`funded ${id} has a distinct effect on the actual room platform during cutover`,()=>{
 let s=opening();const generation=child(s).resources.phone.generation;
 // Both paid changes submit at minute 81, during the actual minute-80 meeting.
 const start=id==='migration'?65:73;s=advance(s,start);s=operation(s,id);s=advance(s,80);
 const before=child(s).information.meetingSessions.find(m=>m.startedAt===80);assert.equal(before?.status,'active');assert.equal(before.platformDependency.resourceId,'phone');assert.equal(before.platformDependency.generation,generation);
 s=advance(s,85);const during=child(s).information.meetingSessions.find(m=>m.id===before.id);
 if(id==='migration'){assert.equal(during.status,'completed','coexistence must preserve the explicitly retained room platform');assert.equal(child(s).resources.phone.generation,generation);assert.equal(SOC.operations.platform(child(s),'bea'),'migration-phone');const platform=SOC.provider.inspect(s).customers[0].services.find(r=>r.id==='migration-phone');assert.equal(platform.name,'Canopy coexistence platform');assert.equal(platform.kind,'dedicated');assert.equal(platform.observed.ready,true);}
 else{assert.equal(during.status,'failed','replacing the declared platform must interrupt the real active meeting');assert.ok(during.reasons.includes('MEETING_PLATFORM_DEPENDENCY_CHANGED'));assert.ok(child(s).resources.phone.generation>generation);assert.equal(during.reservationHeld,false);assert.equal(child(s).captureReservations.some(r=>r.id===during.id),false);}
 s=advance(s,120);assert.equal(s.providerCampaign.customers[0].history.at(-1).evidence.migrationComplete,false,'a pre-cutover or interrupted room session cannot certify post-cutover continuity');
 s=advance(s,180);const h=s.providerCampaign.customers[0].history.at(-1);assert.equal(h.evidence.migrationComplete,true);assert.ok(h.evidence.meetingSessions.some(m=>m.startedAt===140&&m.platformDependency.resourceId==='phone'&&m.platformDependency.generation===child(s).resources.phone.generation));
 const room=SOC.provider.inspect(s).customers[0].services.find(r=>r.id==='room');assert.ok(room.resources.includes('phone'),'the selected room projects its actual platform dependency into the map');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('meeting dependency and commercial responsibility versions reject unknown imports and leave legacy profiles unchanged',()=>{
 const s=SOC.create({experience:'campaign'});for(const key of ['meetingDependencyVersion','commercialResponsibilityVersion']){assert.equal(s.providerCampaign[key],1);for(const version of [null,0,2,'1']){const bad=structuredClone(s);bad.providerCampaign[key]=version;assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_.*VERSION/);}delete s.providerCampaign[key];}
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
