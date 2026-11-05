'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const PRODUCT='cisco-provider-operations',STARTER='starter-customer';
const reasons=['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'];
function career(){
 let s=SOC.create({experience:'campaign',scenario:'smb',seed:73});
 const send=command=>{s=SOC.dispatch(s,{type:'provider',command});};
 const buy=command=>{const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({command,clock:s.clock}));send({...command,quoteRevision:q.atRevision});return q;};
 const tick=()=>{
  s=SOC.dispatch(s,{type:'advance',minutes:1});
  for(const incident of s.providerCampaign.incidents.filter(i=>['active','acknowledged'].includes(i.status))){
   if(incident.status==='active')send({action:'acknowledge-incident',incidentId:incident.id});
   if(s.providerCampaign.projects.some(p=>p.customerId===incident.customerId&&p.operationId==='repair'&&['running','commissioning'].includes(p.status)))continue;
   const command={action:'operation',operationId:'repair',customerId:incident.customerId},q=SOC.provider.quote(s,command);
   if(!q.blockers.length)send({...command,quoteRevision:q.atRevision});else assert.ok(q.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(x)),q.blockers.join(','));
  }
 };
 const until=(predicate,limit=300)=>{for(let n=0;n<limit&&!predicate(s);n++)tick();assert.ok(predicate(s),'condition not reached at '+s.clock);};
 const stages=(offerId,customerId)=>{for(const stage of ['base','carrier','partner'])buy({action:'purchase',offerId,planId:'swift',stage,...(stage==='base'?{}:{customerId})});};
 stages('starter',STARTER);until(s=>s.providerCampaign.customers[0].status==='active');
 return {get state(){return s;},send,buy,tick,until,stages};
}
const statement=(s,id=STARTER)=>SOC.provider.inspect(s).customers.find(c=>c.id===id).wholesaleStatement;
function assertReconciles(s,id){
 const before=JSON.stringify(s),shown=statement(s,id),customer=s.providerCampaign.customers.find(c=>c.id===id);
 assert.equal(JSON.stringify(s),before,'statement inspection is pure');assert.equal(shown.available,true);assert.equal(shown.retainedPeriods,customer.history.length);assert.equal(shown.archivedPeriods,customer.historyCheckpoint.periods);
 assert.equal(shown.rows.length,customer.history.length);
 for(let n=0;n<shown.rows.length;n++){
  const row=shown.rows[n],history=customer.history[n],postings=s.business.ledger.filter(e=>e.customerId===id&&e.period===history.period&&reasons.includes(e.reason));
  assert.equal(row.customerId,id);assert.equal(row.period,history.period);assert.equal(row.from,history.from);assert.equal(row.to,history.to);assert.equal(row.basis,history.basis);
  assert.equal(row.fixedCents,history.wholesale);assert.equal(row.voiceCents,history.voiceCost);assert.equal(row.messageCents,history.messageCost);
  assert.equal(row.voiceMinutes,history.voiceMinutes);assert.equal(row.messages,history.messages);
  assert.equal(row.totalCents,row.fixedCents+row.voiceCents+row.messageCents);
  assert.deepEqual(row.postingIds,postings.map(p=>p.id));assert.equal(new Set(row.postingIds).size,row.postingIds.length);
  assert.ok(postings.every(p=>p.category==='cost'&&p.unit==='AUD-cent'&&p.customerId===id));
  const sum=selected=>postings.filter(p=>selected.includes(p.reason)).reduce((n,p)=>n+p.cents,0);
  assert.equal(sum(['provider-wholesale-period','provider-operation-period']),row.fixedCents);
  assert.equal(sum(['provider-voice-usage']),row.voiceCents);assert.equal(sum(['provider-message-usage']),row.messageCents);assert.equal(sum(reasons),row.totalCents);
 }
 return shown;
}

test('paid wholesale statement reconciles retained fixed, voice and message costs to exact customer settlement postings',()=>{
 const c=career();assert.equal(statement(c.state),null,'no product means no wholesale statement');
 c.buy({action:'operation',operationId:PRODUCT,customerId:STARTER});assert.equal(statement(c.state),null,'paid order alone is not an effective billing feature');
 c.until(s=>s.clock===120);const shown=assertReconciles(c.state,STARTER);
 assert.equal(shown.rows.length,2);assert.ok(shown.rows.some(r=>r.voiceMinutes>0&&r.voiceCents>0));assert.ok(shown.rows.some(r=>r.messages>0&&r.messageCents>0));
 assert.ok(c.state.business.ledger.some(p=>p.reason==='provider-operation-period'&&shown.rows.some(r=>r.postingIds.includes(p.id))),'product recurring cost appears in the fixed statement');
 assert.deepEqual(statement(SOC.restore(JSON.stringify(c.state))),shown);
 const restored=SOC.restore(JSON.stringify(c.state));assert.deepEqual(SOC.dispatch(restored,{type:'advance',minutes:1}),SOC.dispatch(c.state,{type:'advance',minutes:1}));
});

test('a submitted wholesale deployment cannot expose statements until its feature is effective',()=>{
 const c=career();c.buy({action:'operation',operationId:PRODUCT,customerId:STARTER});
 c.until(s=>s.portfolio.customers[0].root.products?.deployments.some(d=>d.id==='d-'+PRODUCT));
 const deployment=c.state.portfolio.customers[0].root.products.deployments.find(d=>d.id==='d-'+PRODUCT);
 assert.equal(deployment.effective,null,'the real deployment submission remains distinct from effective readiness');
 const blocked=statement(c.state);assert.equal(blocked.available,false);assert.deepEqual(blocked.rows,[]);assert.equal(blocked.reason,'DEPLOYMENT_NOT_EFFECTIVE');
 c.until(s=>statement(s)?.available===true);assert.equal(statement(c.state).deploymentId,deployment.id);
 assert.deepEqual(statement(SOC.restore(JSON.stringify(c.state))),statement(c.state));
});

test('two paid customer billing features retain separate rows and posting IDs despite sharing a provider treasury',()=>{
 const c=career();c.buy({action:'operation',operationId:PRODUCT,customerId:STARTER});
 c.until(s=>s.providerCampaign.mission.nextOpportunityAvailable);c.buy({action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});
 if(c.state.providerCampaign.status==='won')c.send({action:'continue-career'});
 if(c.state.providerCampaign.customers[0].status==='renewal')c.send({action:'renew',customerId:STARTER});
 for(const stage of ['carrier','partner'])c.buy({action:'purchase',offerId:'next-1',planId:'swift',stage,customerId:'next-1-customer'});
 c.until(s=>s.providerCampaign.customers.find(c=>c.id==='next-1-customer').status==='active');
 assert.equal(statement(c.state,'next-1-customer'),null,'host product cannot authorize another tenant statement');
 c.buy({action:'operation',operationId:PRODUCT,customerId:'next-1-customer'});c.until(s=>s.clock>=300);
 const first=assertReconciles(c.state,STARTER),second=assertReconciles(c.state,'next-1-customer');
 assert.ok(first.rows.length>second.rows.length,'later tenant has its own shorter billing history');
 assert.ok(second.rows.some(r=>r.totalCents>0));assert.ok(first.rows.every(r=>r.customerId!==second.rows[0].customerId));
 const firstIds=new Set(first.rows.flatMap(r=>r.postingIds));assert.ok(second.rows.flatMap(r=>r.postingIds).every(id=>!firstIds.has(id)));
 assert.deepEqual(SOC.provider.inspect(SOC.restore(JSON.stringify(c.state))).customers.map(c=>c.wholesaleStatement),SOC.provider.inspect(c.state).customers.map(c=>c.wholesaleStatement));
});
