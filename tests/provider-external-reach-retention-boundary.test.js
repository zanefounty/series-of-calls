'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const externalReach=require('../src/game/23-provider-external-reach');
const customerId='starter-customer',sourceId=externalReach.SOURCE_ID;
const child=s=>s.portfolio.customers.find(c=>c.id===customerId).root;
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,command){const quote=SOC.provider.quote(s,command);assert.deepEqual(quote.blockers,[],JSON.stringify({at:s.clock,command,blockers:quote.blockers}));return send(s,{...command,quoteRevision:quote.atRevision});}
function operation(s,operationId){return buy(s,{action:'operation',operationId,customerId});}
function minute(s){
 const incident=s.providerCampaign.incidents.find(row=>['active','acknowledged'].includes(row.status));
 if(incident&&!s.providerCampaign.projects.some(row=>row.operationId==='repair'&&['running','commissioning'].includes(row.status))){
  if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
  const command={action:'operation',operationId:'repair',customerId},quote=SOC.provider.quote(s,command);
  if(!quote.blockers.length)s=buy(s,command);
  else assert.ok(quote.blockers.every(code=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(code)),JSON.stringify(quote.blockers));
 }
 for(const customer of s.providerCampaign.customers.filter(row=>row.status==='renewal'))s=send(s,{action:'renew',customerId:customer.id});
 return SOC.dispatch(s,{type:'advance',minutes:1});
}
function until(s,predicate,limit=500){for(let count=0;count<limit&&!predicate(s);count++)s=minute(s);assert.ok(predicate(s),`predicate did not complete by ${s.clock}: ${JSON.stringify({status:SOC.provider.inspect(s).progression.goals[sourceId]?.status,missing:SOC.provider.inspect(s).progression.goals[sourceId]?.missing})}`);return s;}
function opening(){
 let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73,market:'au-sydney'});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 s=until(s,state=>state.providerCampaign.customers[0].status==='active',30);
 for(const operationId of ['room','recording'])s=operation(s,operationId);
 s=until(s,state=>['room','recording'].every(id=>project(state,id)?.status==='complete'),30);
 s=operation(s,'bpo');s=until(s,state=>project(state,'bpo')?.status==='complete',30);
 s=buy(s,{action:'operation',operationId:'migration',customerId});s=until(s,state=>project(state,'migration')?.status==='complete',60);
 s=operation(s,'transcription');return until(s,state=>project(state,'transcription')?.status==='complete',60);
}
function digest(value){const input=JSON.stringify(value);let hash=0x811c9dc5;for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,0x01000193);}return (hash>>>0).toString(16).padStart(8,'0');}

test('AC-SOC-751 earned external-reach proof stays native and valid through first pruning boundary, restore and worker continuation',()=>{
 let s=opening();
 s=until(s,state=>SOC.provider.inspect(state).progression.goals[sourceId]?.status==='ready',180);
 s=until(s,state=>Number.isSafeInteger(state.providerCampaign.customers.find(row=>row.id===customerId)?.renewedAt)&&SOC.provider.inspect(state).progression.goals[sourceId]?.status==='ready',500);
 const originalClock=s.clock,originalCash=s.business.balance.cash;
 s=send(s,{action:'claim-progression',sourceId,quoteRevision:s.revision});
 const receipt=s.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===sourceId);
 assert.ok(receipt);assert.equal(receipt.at,originalClock);assert.equal(s.business.balance.cash,originalCash);
 const pins=externalReach.retentionPins(receipt,customerId);
 assert.deepEqual(pins,{interactionIds:[receipt.sourceEvidence.inbound.interactionId,receipt.sourceEvidence.outbound.interactionId].sort(),caseIds:[receipt.sourceEvidence.inbound.caseId,receipt.sourceEvidence.outbound.caseId].sort(),jobIds:[receipt.sourceEvidence.inbound.jobId,receipt.sourceEvidence.outbound.jobId].sort(),eventIds:[receipt.sourceEvidence.inbound.arrivalEventId,receipt.sourceEvidence.outbound.arrivalEventId].sort()});
 const initialPruned=s.providerCampaign.jobCheckpoint.pruned;
 s=until(s,state=>state.clock>=originalClock+60,100);
 assert.ok(s.providerCampaign.jobCheckpoint.pruned>initialPruned,'the real campaign crossed its first ordinary job-pruning boundary');
 const retained=s.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===sourceId);
 assert.deepEqual(retained,receipt,'the earned proof is immutable');
 for(const id of pins.jobIds)assert.ok(s.providerCampaign.jobs.some(row=>row.id===id),`paid call job ${id} remains available for receipt validation`);
 for(const id of pins.eventIds)assert.ok(s.providerCampaign.events.some(row=>row.id===id),`actual arrival event ${id} remains available for receipt validation`);
 for(const id of pins.interactionIds)assert.ok(child(s).interactions.some(row=>row.id===id),`actual resolved interaction ${id} remains available for receipt validation`);
 for(const id of pins.caseIds)assert.ok(child(s).cases[id]?.interactions.some(interactionId=>pins.interactionIds.includes(interactionId)),`actual case ${id} remains linked to its retained call`);
 const meeting=receipt.sourceEvidence.meeting,providerMeeting=s.providerCampaign.meetings.find(row=>row.customerId===customerId&&row.bookingId===meeting.providerMeeting.bookingId&&row.sessionId===meeting.providerMeeting.sessionId);
 assert.ok(providerMeeting,'the paid external reach proof still links to its actual provider meeting');
 assert.ok(child(s).information.bookings.some(row=>row.id===meeting.booking.id&&row.start===meeting.booking.start&&row.end===meeting.booking.end),'the actual booked meeting remains available');
 assert.ok(child(s).information.meetingSessions.some(row=>row.id===meeting.session.id&&row.bookingId===meeting.booking.id&&row.externalGuest?.admissionId===meeting.session.externalGuest.admissionId),'the admitted external guest session remains available');
 const restored=SOC.restore(JSON.stringify(s));assert.deepEqual(restored,s);
 const legacy=JSON.parse(JSON.stringify(s));delete child(legacy).providerExternalReachPins;const legacyExport=JSON.stringify(legacy),legacyRestored=SOC.restore(legacyExport);
 assert.equal(JSON.stringify(legacy),legacyExport,'restore must not mutate the caller-owned legacy export');
 assert.deepEqual(legacyRestored,s,'owned restore installs the marker derived from its validated receipt');
 const malformed=JSON.parse(JSON.stringify(s));child(malformed).providerExternalReachPins={version:2};
 assert.throws(()=>SOC.restore(JSON.stringify(malformed)),/INVALID_PROVIDER_EXTERNAL_REACH_PINS/,'malformed optional markers are refused');
 const forgedMarker=JSON.parse(JSON.stringify(s));child(forgedMarker).providerExternalReachPins.pins.jobIds=['provider-job-1','provider-job-2'];
 assert.throws(()=>SOC.restore(JSON.stringify(forgedMarker)),/INVALID_PROVIDER_EXTERNAL_REACH_PINS/,'well-shaped pins cannot retain unrelated jobs');
 const workerSOC=new Function(`${SOC.workerSource()}\nreturn SOC;`)(),command={type:'advance',minutes:1};
 assert.deepEqual(workerSOC.dispatch(restored,command),SOC.dispatch(restored,command),'worker and synchronous continuation validate and preserve the earned lineage');
 const forged=JSON.parse(JSON.stringify(s)),bad=forged.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===sourceId);
 bad.sourceEvidence.inbound.jobId='provider-job-1';const unsigned={...bad};delete unsigned.integrity;bad.integrity=digest(unsigned);
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_PROGRESSION_RECEIPT/,'re-sealing a proof around an unrelated paid job cannot forge lineage');
});
