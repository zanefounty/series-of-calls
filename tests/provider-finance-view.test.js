"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications'),finance=require('../src/game/23-provider-finance-view');
function fixture(){
 let s=SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty:'easy'});
 const buy=c=>{const q=SOC.provider.quote(s,c);assert.deepEqual(q.blockers,[]);s=SOC.dispatch(s,{type:'provider',command:{...c,quoteRevision:q.atRevision}});};
 buy({action:'credit',offerId:'starter-credit'});
 for(const stage of ['base','carrier','partner'])buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
 const tick=()=>{s=SOC.dispatch(s,{type:'advance',minutes:1});};
 while(s.clock<60)tick();
 return {get state(){return s;},buy,tick,send:command=>{s=SOC.dispatch(s,{type:'provider',command});}};
}
let paid;const original=()=>paid??(paid=fixture().state);
test('AC-SOC-623 Finance reconciles real paid setup, service credits, usage, shared payroll and borrowing without changing operating profit',()=>{
 const s=original(),before=JSON.stringify(s),model=finance.inspect(s),r=model.rows[0],h=s.providerCampaign.periodHistory[0];
 assert.equal(JSON.stringify(s),before);assert.equal(r.unavailable,null);assert.ok(r.customers[0].credit>0,'unrepaired real incident produces a credit');
 assert.ok(r.postings.some(p=>p.group==='setup'));assert.ok(r.postings.some(p=>p.group==='voice'));assert.ok(r.postings.some(p=>p.group==='messages'));assert.ok(r.postings.some(p=>p.group==='payroll'));assert.ok(r.postings.some(p=>p.group==='interest'));assert.ok(r.postings.some(p=>p.group==='supplier'));
 assert.equal(r.bridge.funding,100000);assert.equal(r.bridge.operatingResult,h.revenue-h.cost);assert.ok(r.bridge.operatingResult<0,'setup period loses money even after borrowing');
 assert.equal(r.bridge.openingCash,s.business.balance.opening);assert.equal(r.bridge.closingCash,s.business.balance.cash);assert.equal(r.bridge.cashChange,r.bridge.operatingResult+100000);
 assert.deepEqual(r.postings.map(p=>p.id),s.business.ledger.map(p=>p.id));assert.deepEqual(finance.inspect(SOC.restore(before)),model);
});
test('AC-SOC-624 same-minute debt repayment and paid repair belong to the next bill while the earlier cash bridge remains fixed',()=>{
 const c=fixture(),before=finance.inspect(c.state).rows[0];c.buy({action:'repay-credit'});c.send({action:'acknowledge-incident',incidentId:c.state.providerCampaign.incidents.find(i=>i.status==='active').id});c.buy({action:'operation',operationId:'repair',customerId:'starter-customer'});
 assert.deepEqual(finance.inspect(c.state).rows[0],before,'minute60 post-settlement orders must not leak into prior bill');
 while(c.state.clock<120)c.tick();
 const r=finance.inspect(c.state).rows[1];assert.equal(r.unavailable,null);assert.equal(r.bridge.openingCash,before.bridge.closingCash);assert.equal(r.bridge.repayment,100000);assert.equal(r.bridge.funding,0);assert.equal(r.bridge.cashChange,r.bridge.operatingResult-100000);assert.equal(r.bridge.closingCash,c.state.business.balance.cash);
 assert.equal(r.postings.filter(p=>p.group==='repayment').length,1);assert.ok(r.postings.some(p=>p.group==='setup'&&p.operationId==='repair'));assert.ok(r.customers[0].credit<before.customers[0].credit,'actual paid repair reduces settlement credit');
});
test('AC-SOC-625 Finance retains authoritative summary but refuses invented cash history when required postings are missing',()=>{
 const s=JSON.parse(JSON.stringify(original())),h=s.providerCampaign.periodHistory[0];s.business.ledger.shift();s.business.ledgerPrunedThrough=1;
 const r=finance.inspect(s).rows[0];assert.equal(r.bridge,null);assert.equal(r.unavailable,'postings-unavailable');assert.equal(r.operatingResult,h.operatingResult);assert.deepEqual(r.postings,[]);
 const missing=JSON.parse(JSON.stringify(original()));missing.business.ledger=missing.business.ledger.filter(p=>p.reason!=='provider-voice-usage');assert.equal(finance.inspect(missing).rows[0].unavailable,'postings-unreconciled');
});

test('AC-SOC-626 shared payroll appears once while two real customer settlements retain their own posting and service credit lineage',()=>{
 const c=fixture();c.send({action:'acknowledge-incident',incidentId:c.state.providerCampaign.incidents.find(i=>i.status==='active').id});c.buy({action:'operation',operationId:'repair',customerId:'starter-customer'});while(c.state.clock<120)c.tick();
 assert.equal(c.state.providerCampaign.mission.nextOpportunityAvailable,true);
 for(const stage of ['base','carrier','partner'])c.buy({action:'purchase',offerId:'next-1',planId:'swift',stage,...(stage==='base'?{}:{customerId:'next-1-customer'})});
 while(c.state.clock<180)c.tick();const r=finance.inspect(c.state).rows.at(-1);assert.equal(r.unavailable,null);assert.equal(r.customers.length,2);assert.equal(r.postings.filter(p=>p.group==='payroll').length,1);
 for(const customer of r.customers){const entries=r.postings.filter(p=>p.customerId===customer.customerId);assert.equal(entries.filter(p=>p.group==='retail').reduce((n,p)=>n+p.cents,0),customer.grossRetail);assert.equal(entries.filter(p=>p.group==='credits').reduce((n,p)=>n+p.cents,0),customer.credit);assert.ok(entries.every(p=>p.customerName===customer.name));}
 assert.equal(r.bridge.closingCash,c.state.business.balance.cash);assert.equal(new Set(r.postings.map(p=>p.id)).size,r.postings.length);
});
