"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const CID='starter-customer',root=s=>s.portfolio.customers[0].root;
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.customerId===CID&&p.operationId===id);
function command(s,c){return SOC.dispatch(s,{type:'provider',command:c});}
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,request,blockers:q.blockers}));return command(s,{...request,quoteRevision:q.atRevision});}
const operation=(s,id)=>buy(s,{action:'operation',operationId:id,customerId:CID});
function to(s,at){while(s.clock<at)s=SOC.dispatch(s,{type:'advance',minutes:1});return s;}
function pendingCoexistence(){
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 for(const [stage,at] of [['base',3],['carrier',5],['partner',7]]){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CID})});s=to(s,at);}
 s=operation(s,'cisco-dedicated-uc');s=to(s,37);
 const incident=s.providerCampaign.incidents.find(i=>i.customerId===CID&&i.status==='active');assert.ok(incident);s=command(s,{action:'acknowledge-incident',incidentId:incident.id});s=operation(s,'repair');s=to(s,41);assert.equal(project(s,'cisco-dedicated-uc').status,'complete');assert.equal(SOC.operations.platform(root(s),'alex'),'dedicated-platform');
 s=operation(s,'primary-upstream');s=to(s,56);assert.equal(project(s,'primary-upstream').status,'complete');s=operation(s,'site-diverse-ingress');return to(s,66);
}
function sequence(s){return s.providerCampaign.jobs.find(j=>j.resilienceSequence);}
test('legitimate paid dedicated endpoint delivery does not freeze a concurrent resilience sequence or invent human assessment',()=>{
 let s=pendingCoexistence(),j=sequence(s),i=root(s).interactions.find(i=>i.id===j.interactionId);assert.equal(s.clock,66);assert.equal(i.phase,'connected');assert.equal(i.agent,undefined);assert.ok(i.trace.some(t=>t.code==='ORDERED_ROUTE'&&t.target==='desk'));const before=JSON.stringify(s);
 s=SOC.dispatch(s,{type:'advance',minutes:1});assert.equal(s.clock,67);assert.equal(JSON.stringify(SOC.restore(before)),before);j=sequence(s);i=root(s).interactions.find(i=>i.id===j.interactionId);assert.equal(i.phase,'resolved');assert.equal(i.agent,undefined,'ordinary endpoint delivery must not fabricate a contact-centre handler');assert.equal(i.outcome,'CONNECTED');assert.equal(i.usageMinutes,3);assert.notEqual(SOC.provider.inspect(s).progression.goals['progress.goal.rd'].status,'ready','endpoint delivery alone cannot earn the required human-handled resilience assessment');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=to(s,75);assert.equal(s.clock,75);assert.equal(project(s,'site-diverse-ingress').status,'complete');assert.ok(!s.providerCampaign.progressionReceipts?.receipts.some(r=>r.sourceId==='progress.goal.rd'));
});
test('a paid pending dedicated/resilience save cannot forge a human assignment to manufacture assessment evidence',()=>{
 const s=pendingCoexistence(),copy=structuredClone(s),j=sequence(copy),i=root(copy).interactions.find(i=>i.id===j.interactionId);i.agent='invented-human';i.workforceAssignment=i.id;assert.throws(()=>SOC.restore(JSON.stringify(copy)),/INVALID_PROVIDER_RESILIENCE_HUMAN_ASSIGNMENT|WORKFORCE|ASSIGNMENT/);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
