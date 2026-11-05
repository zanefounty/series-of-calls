'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer',sourceId='progress.goal.tr';
const child=s=>s.portfolio.customers.find(c=>c.id===customerId).root,project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({at:s.clock,command,blockers:q.blockers}));return send(s,{...command,quoteRevision:q.atRevision});}
const op=(s,operationId)=>buy(s,{action:'operation',operationId,customerId});
function minute(s){const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status));if(incident&&!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});const request={action:'operation',operationId:'repair',customerId},q=SOC.provider.quote(s,request);if(!q.blockers.length)s=buy(s,request);else assert.ok(q.blockers.every(b=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(b)),JSON.stringify(q.blockers));}for(const c of s.providerCampaign.customers.filter(c=>c.status==='renewal'))s=send(s,{action:'renew',customerId:c.id});return SOC.dispatch(s,{type:'advance',minutes:1});}
function until(s,predicate,limit=150){for(let n=0;n<limit&&!predicate(s);n++)s=minute(s);assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
function opening(){let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73,market:'au-sydney'});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=until(s,x=>x.providerCampaign.customers[0].status==='active',30);s=op(s,'room');s=op(s,'recording');s=until(s,x=>['room','recording'].every(id=>project(x,id)?.status==='complete'),30);s=op(s,'bpo');s=until(s,x=>project(x,'bpo')?.status==='complete',30);s=op(s,'migration');return until(s,x=>project(x,'migration')?.status==='complete',60);}
function ready(){return until(opening(),s=>SOC.provider.inspect(s).progression.goals[sourceId].status==='ready');}
function earned(){const s=ready();return send(s,{action:'claim-progression',sourceId,quoteRevision:s.revision});}
const receipt=s=>s.providerCampaign.progressionReceipts.receipts.find(r=>r.sourceId===sourceId);
function rehash(r){const unsigned={...r};delete unsigned.integrity;let value=0x811c9dc5;for(const char of JSON.stringify(unsigned)){value^=char.charCodeAt(0);value=Math.imul(value,0x01000193);}r.integrity=(value>>>0).toString(16).padStart(8,'0');}

test('actual paid Enterprise queued calls retain their requested voice duration independently of waiting and wrap time',()=>{
 const s=until(opening(),x=>x.clock>=90),delivered=s.providerCampaign.jobs.filter(j=>j.customerId===customerId&&j.channel==='voice'&&j.status==='completed').map(job=>({job,call:child(s).interactions.find(i=>i.id===job.interactionId)})).filter(x=>x.call?.destination==='service');assert.ok(delivered.length>=4);
 for(const {job,call}of delivered){const assigned=call.trace.find(t=>t.code==='AGENT_ASSIGNED'),wrap=call.trace.find(t=>t.code==='WRAP_UP');assert.ok(assigned&&wrap);assert.equal(call.durationMinutes,5);assert.ok(wrap.at-assigned.at>=call.durationMinutes,`${call.id}: requested ${call.durationMinutes} voice minutes but handled ${wrap.at-assigned.at}`);assert.equal(job.voiceMinutes,call.usageMinutes);assert.equal(job.observedUsageMinutes,call.usageMinutes);assert.ok(call.usageMinutes>=call.durationMinutes);assert.equal(job.completedAt,call.finishedAt);assert.ok(call.finishedAt>=wrap.at);assert.equal(call.phase,'resolved');assert.deepEqual(call.obligations,[]);}
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('public restore refuses retained call facts that contradict an earned external-reach receipt even when observed usage is rehashed',()=>{
 const original=earned();assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
 for(const kind of ['outbound media','inbound media','unfulfilled obligation','inflated observed usage']){const bad=structuredClone(original),r=receipt(bad),direction=kind==='inbound media'?'inbound':'outbound',proof=r.sourceEvidence[direction],call=child(bad).interactions.find(i=>i.id===proof.interactionId);assert.ok(call);
  if(kind.endsWith('media'))call.media.in=false;else if(kind==='unfulfilled obligation')call.obligations.push('RECORDING_FAILED');else{proof.observedUsageMinutes+=10;bad.providerCampaign.jobs.find(j=>j.id===proof.jobId).observedUsageMinutes=proof.observedUsageMinutes;rehash(r);}
  assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_/,kind);
 }
 assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
});

test('an invented guest admission cannot be imported before claiming or hidden in a consistently rehashed earned receipt',()=>{
 const unclaimed=ready(),proof=SOC.provider.inspect(unclaimed).progression.goals[sourceId].evidence;assert.deepEqual(SOC.restore(JSON.stringify(unclaimed)),unclaimed);const originalSession=child(unclaimed).information.meetingSessions.find(m=>m.id===proof.meeting.session.id);assert.equal(originalSession.externalGuest.admissionId,`guest-${originalSession.bookingId}-${originalSession.id}`);
 const bad=structuredClone(unclaimed);child(bad).information.meetingSessions.find(m=>m.id===originalSession.id).externalGuest.admissionId='invented-admission';assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_/);
 const claimed=send(unclaimed,{action:'claim-progression',sourceId,quoteRevision:unclaimed.revision});assert.deepEqual(SOC.restore(JSON.stringify(claimed)),claimed);const forged=structuredClone(claimed),r=receipt(forged),session=r.sourceEvidence.meeting.session;session.externalGuest.admissionId='invented-admission';child(forged).information.meetingSessions.find(m=>m.id===session.id).externalGuest.admissionId='invented-admission';rehash(r);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_/);
 const room=project(claimed,'room'),q=SOC.provider.quote(claimed,{action:'retire-service-project',projectId:room.id});let retired=send(claimed,{...q.request,quoteRevision:q.atRevision});retired=minute(retired);assert.deepEqual(receipt(retired),receipt(claimed));assert.equal(SOC.provider.inspect(retired).progression.goals[sourceId].status,'incomplete');assert.deepEqual(SOC.restore(JSON.stringify(retired)),retired,'real later service loss does not erase or forge historical earned evidence');
});
