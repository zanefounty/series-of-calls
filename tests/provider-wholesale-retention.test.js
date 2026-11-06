'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');

test('wholesale history and ledger pruning preserve bounded statements and restored continuation',()=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',seed:73});
 const send=command=>{s=SOC.dispatch(s,{type:'provider',command});};
 const buy=command=>{const quote=SOC.provider.quote(s,command);assert.deepEqual(quote.blockers,[],JSON.stringify({command,clock:s.clock}));send({...command,quoteRevision:quote.atRevision});};
 const settle=()=>{
  for(const incident of s.providerCampaign.incidents.filter(i=>['active','acknowledged'].includes(i.status))){
   if(incident.status==='active')send({action:'acknowledge-incident',incidentId:incident.id});
   if(!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){const command={action:'operation',operationId:'repair',customerId:incident.customerId},q=SOC.provider.quote(s,command);if(!q.blockers.length)send({...command,quoteRevision:q.atRevision});else assert.ok(q.blockers.every(b=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(b)));}
  }
  for(const customer of s.providerCampaign.customers.filter(c=>c.status==='renewal'))send({action:'renew',customerId:customer.id});
 };
 const tick=minutes=>{s=SOC.dispatch(s,{type:'advance',minutes});settle();};
 for(const stage of ['base','carrier','partner'])buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
 while(s.providerCampaign.customers[0].status!=='active')tick(1);
 buy({action:'operation',operationId:'cisco-provider-operations',customerId:'starter-customer'});
 while(s.clock<60)tick(1);
 const early=SOC.provider.inspect(s).customers[0].wholesaleStatement,earlyPeriod=early.rows[0].period,earlyPostingIds=[...early.rows[0].postingIds];assert.ok(earlyPostingIds.length>0);
 let settled=1;
 while((settled<=24||!earlyPostingIds.every(id=>Number(id.slice(6))<=(s.business.ledgerPrunedThrough||0)))&&s.clock<18000){const beforeClock=s.clock;tick(60);assert.ok(s.clock>beforeClock&&s.clock<=beforeClock+60,'native advance may pause at an actual incident');settled=s.providerCampaign.historyCheckpoint.periods+s.providerCampaign.periodHistory.length;assert.equal(s.providerCampaign.status,'operating');}
 assert.ok(s.business.ledgerPrunedThrough>0,'real repeated settlement must cross the ledger retention bound');
 const customer=s.providerCampaign.customers[0],before=JSON.stringify(s),shown=SOC.provider.inspect(s).customers[0].wholesaleStatement;
 assert.equal(JSON.stringify(s),before);assert.equal(shown.available,true);assert.equal(shown.retainedPeriods,24);assert.equal(shown.archivedPeriods,settled-24);assert.equal(shown.rows.length+shown.archivedPeriods,settled);
 assert.equal(shown.ledgerPrunedThrough,s.business.ledgerPrunedThrough);assert.equal(s.business.ledger.length,1000);assert.equal(shown.rows.some(r=>r.period===earlyPeriod),false);
 assert.ok(earlyPostingIds.some(id=>Number(id.slice(6))<=shown.ledgerPrunedThrough));assert.ok(earlyPostingIds.some(id=>!s.business.ledger.some(p=>p.id===id)));
 const reasons=['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'];
 const responsibility=SOC.provider.inspect(s).responsibility.responsibilities.find(r=>r.role==='msp'&&r.customerId===customer.id);
 assert.ok(responsibility,'retaining a validated paid project preserves current MSP responsibility after setup postings are pruned');
 assert.ok(responsibility.evidence.stageProjects.every(p=>!s.business.ledger.some(row=>row.id===p.postingId)&&Number(p.postingId.slice(6))<=s.business.ledgerPrunedThrough));
 for(const row of shown.rows){
  const history=customer.history.find(h=>h.period===row.period),postings=s.business.ledger.filter(p=>p.customerId===customer.id&&p.period===row.period&&reasons.includes(p.reason));
  assert.ok(history);assert.equal(row.fixedCents,history.wholesale);assert.equal(row.voiceCents,history.voiceCost);assert.equal(row.messageCents,history.messageCost);
  assert.equal(row.totalCents,history.wholesale+history.voiceCost+history.messageCost);assert.deepEqual(row.postingIds,postings.map(p=>p.id));assert.equal(postings.reduce((n,p)=>n+p.cents,0),row.totalCents,'recent statement retains all its posting receipts');
  assert.ok(row.postingIds.every(id=>Number(id.slice(6))>shown.ledgerPrunedThrough));
 }
 const restored=SOC.restore(JSON.stringify(s));assert.deepEqual(SOC.provider.inspect(restored).customers[0].wholesaleStatement,shown);
 assert.deepEqual(SOC.provider.inspect(restored).responsibility.responsibilities.find(r=>r.id===responsibility.id),responsibility);
 assert.deepEqual(SOC.dispatch(restored,{type:'advance',minutes:1}),SOC.dispatch(s,{type:'advance',minutes:1}));
});
