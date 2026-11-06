const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),PN=require('../src/game/23-provider-dedicated-interconnect');
const ID='starter-customer',copy=x=>JSON.parse(JSON.stringify(x)),child=s=>s.portfolio.customers.find(c=>c.id===ID).root;
const send=(s,command,requestId)=>SOC.dispatch(s,{type:'provider',command,...(requestId?{requestId}:{})});
function buy(s,c){const q=SOC.provider.quote(s,c);assert.deepEqual(q.blockers,[],JSON.stringify({at:s.clock,c,blockers:q.blockers}));return send(s,{...c,quoteRevision:q.atRevision});}
const op=(s,id)=>buy(s,{action:'operation',customerId:ID,operationId:id}),project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
function tick(s){
 const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status));
 if(incident&&!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});const c={action:'operation',customerId:ID,operationId:'repair'};if(!SOC.provider.quote(s,c).blockers.length)s=buy(s,c);}
 for(const c of s.providerCampaign.customers.filter(c=>c.status==='renewal'))s=send(s,{action:'renew',customerId:c.id});
 return SOC.dispatch(s,{type:'advance',minutes:1});
}
function until(s,predicate,limit=150){for(let n=0;n<limit&&!predicate(s);n++)s=tick(s);assert.ok(predicate(s),JSON.stringify({at:s.clock,projects:s.providerCampaign.projects.map(p=>({id:p.operationId,status:p.status})),goal:SOC.provider.inspect(s).progression.goals[PN.SOURCE_ID]}));return s;}
let foundation;
function opening(){if(foundation)return copy(foundation);let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73,market:'au-sydney'});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:ID})});
 s=until(s,s=>s.providerCampaign.customers[0].status==='active',30);s=op(s,'room');s=op(s,'recording');s=until(s,s=>['room','recording'].every(id=>project(s,id)?.status==='complete'),30);s=op(s,'bpo');s=until(s,s=>project(s,'bpo')?.status==='complete',30);s=op(s,'migration');s=until(s,s=>project(s,'migration')?.status==='complete',60);s=until(s,s=>!s.providerCampaign.projects.some(p=>['running','commissioning'].includes(p.status))&&!s.providerCampaign.incidents.some(i=>['active','acknowledged'].includes(i.status)),30);foundation=copy(s);return s;
}
let earned;
test('AC-SOC-696 actual paid Provider gateway proves settled inbound and outbound service before a cash-neutral PN claim and paid managed delivery',()=>{
 let s=opening();const c={action:'operation',customerId:ID,operationId:PN.DIRECT},q=SOC.provider.quote(s,c),before=copy(s);
 assert.deepEqual(q.blockers,[]);assert.equal(q.setupCents,24000);assert.equal(q.commercial.dedicatedInterconnect.totalLeadMinutes,7);assert.equal(q.commercial.dedicatedInterconnect.addedSessions,0);
 s=send(s,{...c,quoteRevision:q.atRevision},'provider-1');assert.equal(s.business.balance.cash,before.business.balance.cash-24000);assert.deepEqual(send(s,{...c,quoteRevision:q.atRevision},'provider-1'),s);assert.equal(child(s).resources.carrier.effective.capacity,child(before).resources.carrier.effective.capacity);
 const paid=project(s,PN.DIRECT);assert.equal(paid.status,'running');assert.equal(child(s).operations.carrier.effective.mode,'managed');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=until(s,s=>project(s,PN.DIRECT)?.status==='complete',20);assert.equal(project(s,PN.DIRECT).completedAt,paid.dueAt+1);assert.equal(child(s).operations.carrier.effective.mode,'gateway');assert.equal(child(s).resources.carrier.effective.capacity,child(before).resources.carrier.effective.capacity);
 s=until(s,s=>SOC.provider.inspect(s).progression.goals[PN.SOURCE_ID]?.status==='ready',150);
 const cash=s.business.balance.cash,resources=copy(child(s).resources);s=send(s,{action:'claim-progression',sourceId:PN.SOURCE_ID,quoteRevision:s.revision});assert.equal(s.business.balance.cash,cash);assert.deepEqual(child(s).resources,resources);
 const r=s.providerCampaign.progressionReceipts.receipts.find(r=>r.sourceId===PN.SOURCE_ID);for(const direction of ['outbound','inbound']){const leg=r.sourceEvidence[direction];assert.equal(leg.job.settled,true);assert.equal(leg.interaction.direction,direction);assert.equal(leg.interaction.phase,'resolved');assert.equal(leg.interaction.probe,false);assert.ok(leg.interaction.usageMinutes>0);assert.equal(leg.interaction.caseId,leg.job.caseId);assert.ok(leg.interaction.trace.some(t=>t.code==='CARRIER_MODEL_SELECTED'&&t.model==='gateway'));}
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);earned=copy(s);
 const managed={action:'operation',customerId:ID,operationId:PN.MANAGED},mq=SOC.provider.quote(s,managed);assert.deepEqual(mq.blockers,[]);assert.equal(mq.setupCents,12000);assert.equal(mq.periodCents,9000);s=buy(s,managed);assert.equal(s.business.balance.cash,cash-12000);s=until(s,s=>project(s,PN.MANAGED).status==='complete',20);assert.equal(project(s,PN.MANAGED).operationReceipt.plan.earnedReceiptId,r.id);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('AC-SOC-697 actual Provider refuses unpaid managed gateway, stale quotes, free profile edits and forged paid lineage atomically',()=>{
 const s=opening(),before=JSON.stringify(s),c={action:'operation',customerId:ID,operationId:PN.DIRECT},q=SOC.provider.quote(s,c);
 assert.ok(SOC.provider.quote(s,{...c,operationId:PN.MANAGED}).blockers.includes('PROVIDER_INTERCONNECT_EARNED_SCOPE_REQUIRED'));
 const later=tick(s);assert.throws(()=>send(later,{...c,quoteRevision:q.atRevision}),/STALE_PROVIDER_QUOTE/);assert.equal(JSON.stringify(s),before);
 const paid=buy(s,c),forged=copy(paid);project(forged,PN.DIRECT).interconnectPlan.carrierProfile.peerAuthenticated=false;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INTERCONNECT/);
 const author=copy(s);child(author).operations.carrier.desired.peerAuthenticated=true;assert.throws(()=>SOC.restore(JSON.stringify(author)),/CARRIER|CONFIG_AUTHORITY|INTERCONNECT/);
 const unknown=copy(s);unknown.providerCampaign.dedicatedInterconnectVersion=2;assert.throws(()=>SOC.restore(JSON.stringify(unknown)),/INVALID_PROVIDER_INTERCONNECT_VERSION/);
});

test('AC-SOC-698 PN paid saved project and earned call lineage remain equal through real worker continuation and bounded event retention',()=>{
 assert.ok(earned,'earlier actual paid claim required');let s=copy(earned),reply;const context={postMessage:r=>reply=r,setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);const command={type:'advance',minutes:1};context.onmessage({data:{id:1,state:copy(s),command}});assert.equal(reply.error,undefined);assert.deepEqual(copy(reply.state),SOC.dispatch(SOC.restore(JSON.stringify(s)),command));
 const r=s.providerCampaign.progressionReceipts.receipts.find(r=>r.sourceId===PN.SOURCE_ID),first=r.sourceEvidence.outbound.arrival.id;
 s=until(s,s=>s.providerCampaign.eventCheckpoint.count>Number(first.slice('provider-event-'.length)),240);
 assert.ok(s.providerCampaign.events.some(e=>e.id===first));assert.ok(s.providerCampaign.events.length<=200);assert.ok(child(s).interactions.some(i=>i.id===r.sourceEvidence.outbound.interaction.id));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=copy(s);child(forged).providerInterconnectPins.pins.interactionIds=[];assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INTERCONNECT_PINS/);
});
