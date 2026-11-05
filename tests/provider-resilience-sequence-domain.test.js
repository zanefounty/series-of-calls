'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const sequence=require('../src/game/23-provider-resilience-sequence');
const customerId='starter-customer';
const child=s=>s.portfolio.customers.find(c=>c.id===customerId).root;
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id&&p.customerId===customerId);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
const request=operationId=>({action:'operation',operationId,customerId});
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,command,blockers:q.blockers}));return send(s,{...command,quoteRevision:q.atRevision});}
function op(s,id){return buy(s,request(id));}
function minute(s){const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status)&&i.kind!=='transport-domain');if(incident&&!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});const q=SOC.provider.quote(s,request('repair'));if(!q.blockers.length)s=buy(s,q.request);}for(const c of s.providerCampaign.customers.filter(c=>c.status==='renewal'))s=send(s,{action:'renew',customerId:c.id});return SOC.dispatch(s,{type:'advance',minutes:1});}
function until(s,predicate,limit=140){for(let n=0;n<limit&&!predicate(s);n++)s=minute(s);assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
function opening(){let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});return until(s,x=>x.providerCampaign.customers[0].status==='active',30);}
function prepare(){
 let s=send(opening(),{action:'staff',engineers:4,support:4});
 for(const id of ['bpo','carrier-headroom','after-call-assistance','primary-upstream','diverse-upstream']){s=op(s,id);s=until(s,x=>project(x,id).status==='complete',45);}
 return s;
}
const jobOf=s=>s.providerCampaign.jobs.find(j=>j.customerId===customerId&&j.resilienceSequence);
function activeTransportRepair(s){const incident=s.providerCampaign.incidents.find(i=>i.kind==='transport-domain'&&['active','acknowledged'].includes(i.status));assert.ok(incident);if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});return op(s,'transport-repair');}
function validate(s){const customer=s.providerCampaign.customers.find(c=>c.id===customerId),root=child(s),job=jobOf(s);return sequence.validateJob(s,customer,job,root);}

test('actual dispatched sequence proves primary, independent backup, recovery, and ten samples',()=>{
 let s=until(prepare(),x=>!!jobOf(x),150);
 for(let n=0;n<40;n++){const j=jobOf(s);if(j&&j.resilienceSequence.phases.length===2&&child(s).interactions.find(i=>i.id===j.resilienceSequence.phases[1].interactionId)?.phase==='resolved')break;s=minute(s);} {const j=jobOf(s);assert.ok(j&&j.resilienceSequence.phases.length===2&&child(s).interactions.find(i=>i.id===j.resilienceSequence.phases[1].interactionId)?.phase==='resolved',JSON.stringify({clock:s.clock,job:j&&{status:j.status,failure:j.failure,sequence:j.resilienceSequence},calls:j&&j.resilienceSequence.phases.map(p=>child(s).interactions.find(i=>i.id===p.interactionId))}));}
 s=activeTransportRepair(s);
 s=until(s,x=>jobOf(x)?.status!=='pending',35);
 assert.equal(validate(s),true);
 const proof=sequence.evaluate(s,customerId,jobOf(s),{child:child(s)});
 assert.equal(proof.eligible,true,JSON.stringify({missing:proof.missing,job:jobOf(s),incident:s.providerCampaign.incidents.filter(i=>i.kind==='transport-domain'),during:child(s).interactions.find(i=>i.id===jobOf(s).resilienceSequence.phases[1].interactionId)?.trace.filter(t=>['MEDIA_TRANSPORT_ADMITTED','MEDIA_TRANSPORT_OBSERVED'].includes(t.code))}));
 assert.equal(proof.evidence.phases.length,3);
 assert.equal(proof.evidence.samples.length,10);
 assert.deepEqual(proof.evidence.phases.map(x=>x.admission.selected.edges.map(e=>e.id)),[
  [customerId+'-a-primary'],[customerId+'-z-backup'],[customerId+'-a-primary']
 ]);
 const before=JSON.stringify(s);
 assert.deepEqual(sequence.evaluate(s,customerId,jobOf(s),{child:child(s)}),proof);
 assert.equal(JSON.stringify(s),before,'assessment is pure');
});

test('assessor rejects shortened phase, fabricated outage sample, and cross-case interaction links',()=>{
 let s=until(prepare(),x=>!!jobOf(x),150);
 for(let n=0;n<40;n++){const j=jobOf(s);if(j&&j.resilienceSequence.phases.length===2&&child(s).interactions.find(i=>i.id===j.resilienceSequence.phases[1].interactionId)?.phase==='resolved')break;s=minute(s);} {const j=jobOf(s);assert.ok(j&&j.resilienceSequence.phases.length===2&&child(s).interactions.find(i=>i.id===j.resilienceSequence.phases[1].interactionId)?.phase==='resolved',JSON.stringify({clock:s.clock,job:j&&{status:j.status,failure:j.failure,sequence:j.resilienceSequence},calls:j&&j.resilienceSequence.phases.map(p=>child(s).interactions.find(i=>i.id===p.interactionId))}));}
 s=activeTransportRepair(s);s=until(s,x=>jobOf(x)?.status!=='pending',35);
 assert.equal(validate(s),true);
 for(const [label,mutate] of [
  ['shortened followup',root=>{root.providerCampaign.jobs.find(j=>j.resilienceSequence).resilienceSequence.phases[1].requestedMinutes=1;}],
  ['forged outage sample',root=>{const job=root.providerCampaign.jobs.find(j=>j.resilienceSequence);job.resilienceSequence.samples[0].primaryFailed=false;}],
  ['cross-case interaction',root=>{const job=root.providerCampaign.jobs.find(j=>j.resilienceSequence);const customer=root.providerCampaign.customers.find(c=>c.id===customerId);const caseRow=child(root).cases[job.caseId];caseRow.interactions[2]='interaction-invented';}]
 ]){const forged=structuredClone(s);mutate(forged);const c=forged.providerCampaign.customers.find(x=>x.id===customerId);const j=forged.providerCampaign.jobs.find(x=>x.resilienceSequence);assert.throws(()=>sequence.validateJob(forged,c,j,c.root),/INVALID_PROVIDER_RESILIENCE/ ,label);}
});

test('primary-only failure remains a valid failed sequence but cannot earn resilience evidence',()=>{
 let s=send(opening(),{action:'staff',engineers:4,support:4});
 for(const id of ['bpo','carrier-headroom','after-call-assistance','primary-upstream']){s=op(s,id);s=until(s,x=>project(x,id).status==='complete',45);}
 s=until(s,x=>jobOf(x)?.status==='failed',160);
 const customer=s.providerCampaign.customers.find(c=>c.id===customerId),job=jobOf(s);
 assert.equal(sequence.validateJob(s,customer,job,child(s)),true);
 const result=sequence.evaluate(s,customerId,job,{child:child(s)});
 assert.equal(result.eligible,false);
 assert.ok(result.missing.length>0);
});
