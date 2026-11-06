'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Worker}=require('node:worker_threads');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer',child=s=>s.portfolio.customers.find(c=>c.id===customerId).root;
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id&&p.customerId===customerId);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
const request=operationId=>({action:'operation',operationId,customerId});
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,command,blockers:q.blockers}));return send(s,{...command,quoteRevision:q.atRevision});}
const op=(s,id)=>buy(s,request(id));
function minute(s){
 // Only routine mission incidents are automatically repaired. The authored
 // transport incident is left for each test to observe and explicitly fund.
 const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status)&&i.kind!=='transport-domain');
 if(incident&&!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});const q=SOC.provider.quote(s,request('repair'));if(!q.blockers.length)s=buy(s,q.request);}
 for(const c of s.providerCampaign.customers.filter(c=>c.status==='renewal'))s=send(s,{action:'renew',customerId:c.id});
 return SOC.dispatch(s,{type:'advance',minutes:1});
}
function until(s,predicate,limit=120){for(let n=0;n<limit&&!predicate(s);n++)s=minute(s);assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
function opening(planId='swift',scenario='smb'){let s=SOC.create({experience:'campaign',scenario,difficulty:'easy',seed:73});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId,stage,...(stage==='base'?{}:{customerId})});return until(s,x=>x.providerCampaign.customers[0].status==='active',30);}
function paidPrimary(){const pending=op(opening(),'primary-upstream');return until(pending,s=>project(s,'primary-upstream').status==='complete',30);}
async function worker(state,command){return new Promise((resolve,reject)=>{const w=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.postMessage=x=>parentPort.postMessage(x);${SOC.workerSource()};parentPort.on('message',data=>globalThis.onmessage({data}));`,{eval:true}),timer=setTimeout(()=>{w.terminate();reject(Error('WORKER_TIMEOUT'));},30000);w.once('error',error=>{clearTimeout(timer);w.terminate();reject(error);});w.once('message',reply=>{clearTimeout(timer);w.terminate();resolve(reply);});w.postMessage({id:'provider-resilience-parity',state,command});});}

test('public paid primary and independent backup deliver typed paths without customer capital or duplicate transport charges',()=>{
 let s=opening();const before=s.business.balance.cash,owned=structuredClone(child(s).business),q=SOC.provider.quote(s,request('primary-upstream'));
 assert.deepEqual(q.blockers,[]);assert.equal(q.workMinutes,8);assert.equal(q.leadMinutes,15);assert.equal(q.commercial.transport.totalLeadMinutes,15);s=buy(s,request('primary-upstream'));assert.equal(before-s.business.balance.cash,48000);assert.notEqual(project(s,'primary-upstream').status,'complete');assert.deepEqual(child(s).business,owned);assert.equal(child(s).business,undefined);
 s=until(s,x=>project(x,'primary-upstream').status==='complete',30);
 assert.equal(project(s,'primary-upstream').completedAt,project(s,'primary-upstream').acceptedAt+q.leadMinutes);const primary=SOC.provider.inspect(s).customers[0].transport;assert.equal(primary.sites.length,2);assert.equal(primary.links.length,1);assert.equal(primary.links[0].effective.capacityMbps,20);assert.equal(primary.paths.primary.ready,true);assert.equal(primary.paths.diverse.ready,false);
 const capacity=child(s).resources.carrier.effective.capacity,people=child(s).resources.people.effective.people,cash=s.business.balance.cash;
 const diverseQuote=SOC.provider.quote(s,request('diverse-upstream'));assert.equal(diverseQuote.workMinutes,8);assert.equal(diverseQuote.leadMinutes,15);for(const [id,work,lead] of [['managed-diverse-upstream',10,19],['upstream-binding-extension',3,3],['transport-repair',2,2]]){const alternative=SOC.provider.quote(s,request(id));assert.equal(alternative.workMinutes,work);assert.equal(alternative.leadMinutes,lead);assert.equal(alternative.commercial.transport.totalLeadMinutes,lead);}s=op(s,'diverse-upstream');assert.equal(cash-s.business.balance.cash,32000);s=until(s,x=>project(x,'diverse-upstream').status==='complete',30);
 assert.equal(project(s,'diverse-upstream').completedAt,project(s,'diverse-upstream').acceptedAt+diverseQuote.leadMinutes);const raw=JSON.stringify(s),view=SOC.provider.inspect(s).customers[0].transport;assert.deepEqual(SOC.provider.inspect(s).customers[0].transport,view);assert.equal(JSON.stringify(s),raw);assert.equal(view.links.length,2);assert.equal(new Set(view.links.map(l=>l.domain)).size,2);assert.ok(view.links.every(l=>l.effective.capacityMbps===20));assert.equal(view.paths.diverse.ready,true);assert.equal(child(s).resources.carrier.effective.capacity,capacity);assert.equal(child(s).resources.people.effective.people,people);
 assert.equal(child(s).transport.totalCosts,0);assert.deepEqual(child(s).transport.ledger,[]);assert.equal(s.business.ledger.filter(e=>e.reason==='provider-operation'&&['primary-upstream','diverse-upstream'].includes(e.operationId)).length,2);assert.deepEqual(SOC.restore(raw),s);
});

test('public resilience quotes refuse unearned backup, unavailable staff and stale commitments atomically',()=>{
 let s=opening();assert.ok(SOC.provider.quote(s,request('diverse-upstream')).blockers.length);assert.ok(SOC.provider.quote(s,request('managed-diverse-upstream')).blockers.length);
 s=send(s,{action:'staff',engineers:0,support:0});const refused=SOC.provider.quote(s,request('primary-upstream')),before=JSON.stringify(s);assert.ok(refused.blockers.includes('ENGINEER_CAPACITY'));assert.ok(refused.blockers.includes('SUPPORT_CAPACITY'));assert.throws(()=>send(s,{...request('primary-upstream'),quoteRevision:refused.atRevision}),/PROVIDER_QUOTE_BLOCKED/);assert.equal(JSON.stringify(s),before);
 s=send(s,{action:'staff',engineers:2,support:2});const quoted=SOC.provider.quote(s,request('primary-upstream'));assert.deepEqual(quoted.blockers,[]);s=SOC.dispatch(s,{type:'advance',minutes:1});const current=JSON.stringify(s);assert.throws(()=>send(s,{...request('primary-upstream'),quoteRevision:quoted.atRevision}),/STALE/);assert.equal(JSON.stringify(s),current);
});

test('a real pending paid primary continues equally in direct, restored and worker simulation',async()=>{
 const pending=op(opening(),'primary-upstream'),snapshot=JSON.stringify(pending),command={type:'advance',minutes:1},expected=SOC.dispatch(pending,command);assert.deepEqual(SOC.dispatch(SOC.restore(snapshot),command),expected);const reply=await worker(pending,command);assert.equal(reply.error,undefined);assert.deepEqual(reply.state,JSON.parse(JSON.stringify(expected)));assert.equal(JSON.stringify(pending),snapshot);
});

test('public restore rejects unpaid topology, inflated Mbps and forged domain status on a legitimately funded primary',()=>{
 const original=paidPrimary();assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
 for(const [label,mutate] of [
  ['extra site',root=>{const id=Object.keys(root.transport.sites)[0];root.transport.sites['invented-site']={...structuredClone(root.transport.sites[id]),id:'invented-site'};}],
  ['unpaid Mbps',root=>{const link=Object.values(root.transport.links)[0];link.desired.capacityMbps+=20;link.effective.capacityMbps+=20;}],
  ['invented outage',root=>{root.transport.domains[Object.values(root.transport.links)[0].effective.domain]=true;}]
 ]){const forged=structuredClone(original);mutate(child(forged));assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_RESILIENCE|UNFUNDED_PROVIDER_TRANSPORT/,label);}
 assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
});

test('actual shared payroll commitments can make the primary unaffordable and its quote refuses a free site',()=>{
 let s=send(opening(),{action:'staff',engineers:20,support:20});
 s=until(s,x=>x.business.balance.cash<48000,360);
 const q=SOC.provider.quote(s,request('primary-upstream')),before=JSON.stringify(s);assert.ok(q.blockers.includes('INSUFFICIENT_CASH'),JSON.stringify(q.blockers));assert.ok(s.providerCampaign.payroll.costCents>0);assert.ok(s.providerCampaign.payroll.billedMinutes>0);assert.throws(()=>send(s,{...request('primary-upstream'),quoteRevision:q.atRevision}),/PROVIDER_QUOTE_BLOCKED/);assert.equal(JSON.stringify(s),before);assert.equal(project(s,'primary-upstream'),undefined);assert.equal(child(s).transport,undefined);
});

const sequenceJob=s=>s.providerCampaign.jobs.find(j=>j.customerId===customerId&&j.resilienceSequence);
function sequenceOpening({backup=true,scenario='smb'}={}){let s=opening('steady',scenario);for(const id of [...(scenario==='enterprise'?['room','recording']:[]),'bpo',...(scenario==='enterprise'?['migration']:[]),'carrier-headroom','after-call-assistance','primary-upstream',...(backup?['diverse-upstream']:[])]){s=until(s,x=>{const blockers=SOC.provider.quote(x,request(id)).blockers;assert.ok(blockers.every(b=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(b)),JSON.stringify({id,blockers}));return !blockers.length;},30);s=op(s,id);s=until(s,x=>project(x,id).status==='complete',45);}return s;}
const phaseInteraction=(s,n)=>{const id=sequenceJob(s)?.resilienceSequence.phases[n]?.interactionId;return child(s).interactions.find(i=>i.id===id);};
function repairTransport(s){const incident=s.providerCampaign.incidents.find(i=>i.kind==='transport-domain'&&['active','acknowledged'].includes(i.status));assert.ok(incident,'actual primary-domain failure exists');if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});return op(s,'transport-repair');}

test('one funded sequence retains 24 unique case obligations while all three actual conversations and usage settle once',t=>{
 let s=sequenceOpening();const primary=project(s,'primary-upstream');s=until(s,x=>!!sequenceJob(x),130);const started=sequenceJob(s),period=started.periodIndex;
 assert.equal(started.arrivalAt,period*60+4);assert.ok(period*60>=primary.completedAt);assert.equal(started.deadlineAt,started.arrivalAt+24);assert.equal(started.resilienceSequence.version,1);assert.equal(started.resilienceSequence.projectId,primary.id);assert.equal(started.resilienceSequence.postingId,primary.postingId);assert.equal(started.resilienceSequence.caller,'alex');assert.equal(started.resilienceSequence.tenant,child(s).tenant);assert.equal(started.status,'pending');assert.equal(started.resilienceSequence.phases[0].interactionId,started.interactionId);
 s=until(s,x=>phaseInteraction(x,1)?.phase==='resolved',40);assert.equal(sequenceJob(s).status,'pending','two successful conversations do not settle the unique case');const snapshot=JSON.stringify(s),restored=SOC.restore(snapshot);assert.deepEqual(restored,s);assert.deepEqual(SOC.dispatch(restored,{type:'advance',minutes:1}),SOC.dispatch(s,{type:'advance',minutes:1}));
 s=repairTransport(s);s=until(s,x=>sequenceJob(x).status!=='pending',30);const job=sequenceJob(s),seq=job.resilienceSequence,interactions=seq.phases.map((_,n)=>phaseInteraction(s,n));assert.equal(job.status,'completed',JSON.stringify({failure:job.failure,seq}));assert.equal(seq.phases.length,3);assert.equal(new Set(seq.phases.map(p=>p.interactionId)).size,3);assert.equal(job.completedAt,interactions[2].finishedAt);assert.equal(job.voiceMinutes,interactions.reduce((n,i)=>n+i.usageMinutes,0));assert.equal(job.voiceMinutes,seq.phases.reduce((n,p)=>n+p.observedUsageMinutes,0));assert.equal(seq.windowStart,interactions[0].finishedAt+1);assert.ok(interactions[2].finishedAt<=seq.windowStart+10,JSON.stringify({window:seq.windowStart,finished:interactions[2].finishedAt}));
 for(const [n,i] of interactions.entries()){assert.equal(i.phase,'resolved');assert.notEqual(i.probe,true);assert.equal(i.from,'alex');assert.equal(i.tenant,child(s).tenant);assert.equal(i.caseId,job.caseId);assert.ok(i.agent);assert.equal(i.durationMinutes,n?3:SOC.provider.rules.missions.smb.demand.voiceDuration);const assigned=i.trace.find(t=>t.code==='AGENT_ASSIGNED'),wrap=i.trace.find(t=>t.code==='WRAP_UP');assert.ok(assigned&&wrap);assert.ok(wrap.at-assigned.at>=i.durationMinutes);assert.deepEqual(i.media,{in:true,out:true});assert.deepEqual(i.obligations,[]);if(n)assert.ok(i.startedAt>=interactions[n-1].finishedAt);}
 assert.deepEqual(child(s).cases[job.caseId].interactions,interactions.map(i=>i.id));s=until(s,x=>x.clock===(period+1)*60,60);
 const jobs=s.providerCampaign.jobs.filter(j=>j.customerId===customerId&&j.periodIndex===period),history=s.providerCampaign.customers[0].history.find(h=>h.period===period),voiceUsage=jobs.reduce((n,j)=>n+j.voiceMinutes,0);assert.equal(jobs.length,24);assert.equal(new Set(jobs.map(j=>j.caseId)).size,24);assert.equal(jobs.filter(j=>j.resilienceSequence).length,1);const retainedSequence=jobs.find(j=>j.resilienceSequence).resilienceSequence;assert.deepEqual(retainedSequence.samples.map(row=>row.at),Array.from({length:10},(_,n)=>retainedSequence.windowStart+n+1));assert.ok(retainedSequence.samples.some(row=>row.primaryFailed));assert.equal(retainedSequence.samples.at(-1).primaryFailed,false);assert.equal(history.due,24);assert.equal(history.fullPeriod,true);assert.ok(history.completedOnTime>=22);assert.equal(history.qualified,true);const settledPeriod=s.providerCampaign.periodHistory.find(row=>row.period===period);assert.ok(settledPeriod.operatingResult>0,JSON.stringify(settledPeriod));t.diagnostic(JSON.stringify({plan:'steady',period,offered:history.due,onTime:history.completedOnTime,operatingResult:settledPeriod.operatingResult,revenue:settledPeriod.revenue,cost:settledPeriod.cost,sequenceUsage:job.voiceMinutes,windowStart:seq.windowStart,thirdFinishedAt:interactions[2].finishedAt,sampleCount:retainedSequence.samples.length}));assert.equal(history.completedOnTime+history.late+history.failed,24);assert.equal(history.voiceMinutes,voiceUsage);assert.equal(history.voiceCost,voiceUsage*SOC.provider.rules.plans.steady.voiceCents);assert.equal(s.business.ledger.filter(e=>e.reason==='provider-voice-usage'&&e.customerId===customerId&&e.period===period).reduce((n,e)=>n+e.cents,0),history.voiceCost);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('primary-only outage fails actual required work and paid repair restores future service without rewriting that failure',()=>{
 let s=sequenceOpening({backup:false});s=until(s,x=>sequenceJob(x)?.status==='failed',160);const failed=structuredClone(sequenceJob(s)),incident=s.providerCampaign.incidents.find(i=>i.id===failed.resilienceSequence.incidentId);assert.ok(incident);assert.equal(incident.kind,'transport-domain');assert.ok(failed.resilienceSequence.phases.some((_,n)=>phaseInteraction(s,n)?.phase==='failed'));assert.equal(SOC.provider.inspect(s).customers[0].transport.paths.selected.ready,false);assert.equal(child(s).transport.reservations.some(r=>failed.resilienceSequence.phases.some(p=>p.interactionId===r.id)),false);
 const before=s.business.balance.cash;s=repairTransport(s);assert.equal(before-s.business.balance.cash,12000);s=until(s,x=>project(x,'transport-repair').status==='complete',20);const repairedAt=s.clock;assert.equal(SOC.provider.inspect(s).customers[0].transport.paths.primary.ready,true);s=until(s,x=>x.providerCampaign.jobs.some(j=>j.customerId===customerId&&j.arrivalAt>repairedAt&&j.channel==='voice'&&j.status==='completed'),40);
 const retained=s.providerCampaign.jobs.find(j=>j.id===failed.id);assert.equal(retained.status,'failed');assert.equal(retained.failure,failed.failure);assert.equal(retained.completedAt,failed.completedAt);assert.equal(s.providerCampaign.jobs.filter(j=>j.resilienceSequence).length,1);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('a legitimate pending sequence cannot import invented phases, a free extended promise or misattributed usage',()=>{
 const original=until(sequenceOpening(),s=>!!sequenceJob(s),130);assert.deepEqual(SOC.restore(JSON.stringify(original)),original);const accepted=[];
 for(const [label,mutate] of [
  ['invented interaction',j=>{j.resilienceSequence.phases[0].interactionId='interaction-invented';}],
  ['unfunded source',j=>{j.resilienceSequence.projectId='provider-project-invented';}],
  ['shortened original conversation',j=>{j.resilienceSequence.phases[0].requestedMinutes=1;}],
  ['extended customer promise',j=>{j.deadlineAt++;}],
  ['invented usage',j=>{j.voiceMinutes++;j.resilienceSequence.phases[0].observedUsageMinutes++;}],
  ['unknown version',j=>{j.resilienceSequence.version=2;}]
 ]){const forged=structuredClone(original);mutate(sequenceJob(forged));try{SOC.restore(JSON.stringify(forged));accepted.push(label);}catch(error){assert.match(error.message,/INVALID_PROVIDER_|PROVIDER_RESILIENCE_/,label);}}
 assert.deepEqual(accepted,[],'each copied save forgery must be rejected');assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
});

test('a live funded followup retains its actual path and usage through worker and restore continuation',async()=>{
 const s=until(sequenceOpening(),state=>phaseInteraction(state,1)?.phase==='handling',140),command={type:'advance',minutes:1},snapshot=JSON.stringify(s),expected=SOC.dispatch(s,command),i=phaseInteraction(s,1);assert.ok(child(s).transport.reservations.some(r=>r.id===i.id));assert.ok(i.trace.some(t=>t.code==='MEDIA_TRANSPORT_ADMITTED'));assert.deepEqual(SOC.dispatch(SOC.restore(snapshot),command),expected);const reply=await worker(s,command);assert.equal(reply.error,undefined);assert.deepEqual(reply.state,JSON.parse(JSON.stringify(expected)));assert.equal(JSON.stringify(s),snapshot);
});

test('one settled resilience case and its billed usage survive ordinary trace pruning without scheduling another free exercise',()=>{
 let s=until(sequenceOpening(),state=>phaseInteraction(state,1)?.phase==='resolved',140);s=repairTransport(s);s=until(s,state=>sequenceJob(state)?.status==='completed',30);const period=sequenceJob(s).periodIndex;s=until(s,state=>state.clock===(period+1)*60,60);const original=structuredClone(sequenceJob(s)),history=structuredClone(s.providerCampaign.customers[0].history.find(h=>h.period===period)),firstOrdinary=child(s).interactions.find(i=>i.caseId!==original.caseId&&i.phase==='resolved');assert.ok(firstOrdinary);const target=s.clock+600;s=until(s,state=>state.clock===target,600);
 assert.equal(child(s).interactions.some(i=>i.id===firstOrdinary.id),false,'ordinary old terminal traces actually pruned');assert.equal(s.providerCampaign.jobs.filter(j=>j.resilienceSequence).length,1);assert.deepEqual(sequenceJob(s),original);assert.deepEqual(s.providerCampaign.customers[0].history.find(h=>h.period===period),history);for(const p of original.resilienceSequence.phases)assert.ok(child(s).interactions.some(i=>i.id===p.interactionId),'selected case proof remains retained');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);const restored=SOC.restore(JSON.stringify(s));assert.deepEqual(minute(restored),minute(s));
});

test('a funded Enterprise resilience case preserves its five-minute main conversation and required recordings before three-minute followups',()=>{
 let s=until(sequenceOpening({scenario:'enterprise'}),state=>phaseInteraction(state,1)?.phase==='resolved',160);const baseline=phaseInteraction(s,0),assigned=baseline.trace.find(t=>t.code==='AGENT_ASSIGNED'),wrap=baseline.trace.find(t=>t.code==='WRAP_UP');assert.equal(baseline.durationMinutes,5);assert.ok(wrap.at-assigned.at>=5);assert.equal(sequenceJob(s).status,'pending');assert.ok(baseline.records.some(id=>child(s).records.some(r=>r.id===id&&r.kind==='recording'&&!r.deleted)));
 s=repairTransport(s);s=until(s,state=>sequenceJob(state).status==='completed',30);const j=sequenceJob(s);assert.deepEqual(j.resilienceSequence.phases.map(p=>p.requestedMinutes),[5,3,3]);assert.ok(j.completedAt<=j.resilienceSequence.windowStart+10);for(let n=0;n<3;n++){const i=phaseInteraction(s,n);assert.equal(i.caseId,j.caseId);assert.equal(i.from,'alex');assert.equal(i.phase,'resolved');assert.ok(i.records.some(id=>child(s).records.some(r=>r.id===id&&r.kind==='recording'&&!r.deleted)));}assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('copying paid transport into Lab preserves topology with separate Lab finance and leaves Provider fault authority intact',()=>{
 const original=paidPrimary(),before=JSON.stringify(original),cash=original.business.balance.cash,domain=Object.values(child(original).transport.links)[0].effective.domain;
 assert.throws(()=>SOC.dispatch(original,{type:'transport',command:{action:'domain',id:domain,failed:true}}),/PROVIDER_|CAMPAIGN_/);assert.throws(()=>SOC.dispatch(original,{type:'portfolio',command:{action:'dispatchcustomer',customerId,command:{type:'transport',command:{action:'domain',id:domain,failed:true}}}}),/CAMPAIGN_AUTHORING_FORBIDDEN/);
 let lab=SOC.dispatch(original,{type:'copy-to-lab',customerId});assert.deepEqual(lab.experience,{version:1,kind:'lab',custom:true});assert.equal(lab.providerCampaign,undefined);assert.equal(lab.providerCustomer,undefined);assert.equal(lab.providerResilience,undefined);assert.equal(lab.providerResilienceCase,undefined);assert.ok(lab.business);assert.deepEqual(lab.transport,child(original).transport);assert.deepEqual(SOC.restore(JSON.stringify(lab)),lab);
 lab=SOC.dispatch(lab,{type:'transport',command:{action:'domain',id:domain,failed:true}});assert.equal(lab.transport.domains[domain],true);assert.equal(JSON.stringify(original),before);assert.equal(original.business.balance.cash,cash);assert.notEqual(child(original).transport.domains[domain],true);assert.deepEqual(SOC.restore(JSON.stringify(lab)),lab);
});

test('a legitimately late paid recovery can finish the customer case but cannot earn the ten-minute resilience assessment',()=>{
 let s=until(sequenceOpening(),state=>phaseInteraction(state,1)?.phase==='resolved',140);const delayedUntil=s.clock+3;s=until(s,state=>state.clock===delayedUntil,3);s=repairTransport(s);s=until(s,state=>sequenceJob(state).status==='completed',30);const j=sequenceJob(s);assert.ok(j.completedAt<=j.deadlineAt);assert.ok(j.completedAt>j.resilienceSequence.windowStart+10);const assessment=require('../src/game/23-provider-resilience-sequence').evaluate(s,customerId,j,{child:child(s)});assert.equal(assessment.eligible,false);assert.ok(assessment.missing.includes('SEQUENCE_EXCEEDED_TEN_MINUTE_WINDOW'));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});


test('AC-SOC-769 actual overdue primary-domain incident prevents funded SMB victory despite two qualifying periods until paid recovery',async()=>{
 let s=until(sequenceOpening(),state=>state.clock===180,150);
 assert.equal(s.providerCampaign.mission.consecutiveQualifying,2);
 assert.ok(s.providerCampaign.periodHistory.slice(-2).every(p=>p.due===24&&p.completedOnTime>=22&&p.operatingResult>0&&p.qualified));
 const incident=s.providerCampaign.incidents.find(i=>i.kind==='transport-domain'&&i.status==='active');assert.ok(incident);assert.ok(incident.dueAt<s.clock);
 assert.equal(SOC.provider.inspect(s).customers[0].transport.paths.diverse.ready,true,'the paid backup serves work while the primary incident remains unresolved');
 const expansion={action:'purchase',offerId:'next-1',planId:'steady',stage:'base'};
 for(const acknowledged of [false,true]){
  let before=SOC.restore(JSON.stringify(s));if(acknowledged)before=send(before,{action:'acknowledge-incident',incidentId:incident.id});
  const quote=SOC.provider.quote(before,expansion);assert.deepEqual(quote.blockers,[]);
  const command={type:'provider',command:{...expansion,quoteRevision:quote.atRevision}},cash=before.business.balance.cash,next=SOC.dispatch(before,command);
  assert.equal(next.business.balance.cash,cash-quote.setupCents);assert.ok(next.providerCampaign.projects.some(p=>p.customerId==='next-1-customer'&&p.stage==='base'));
  assert.equal(next.providerCampaign.missionStatus,'active');assert.equal(next.providerCampaign.status,'operating');assert.equal(next.providerCampaign.mission.victoryProof,null);assert.ok(!next.providerCampaign.events.some(e=>e.code==='MISSION_WON'));
  assert.deepEqual(SOC.restore(JSON.stringify(next)),next);
  if(acknowledged){const reply=await worker(before,command);assert.equal(reply.error,undefined);assert.deepEqual(reply.state,JSON.parse(JSON.stringify(next)));}
 }
 s=buy(s,expansion);s=repairTransport(s);s=until(s,state=>project(state,'transport-repair').status==='complete',20);
 assert.equal(s.providerCampaign.incidents.find(i=>i.id===incident.id).status,'resolved');assert.equal(s.providerCampaign.mission.consecutiveQualifying,2);
 s=buy(s,{action:'purchase',offerId:'next-1',planId:'steady',stage:'carrier',customerId:'next-1-customer'});
 assert.equal(s.providerCampaign.missionStatus,'won');assert.ok(s.providerCampaign.mission.victoryProof);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
