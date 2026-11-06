'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const RULES=require('../src/game/24-provider-rules');
const customerId='starter-customer';
function opening(version='provider-campaigns-6'){
 let s=SOC.create({experience:'campaign',scenario:'enterprise',difficulty:'easy',seed:73});
 // Model the actual pre-purchase legacy shape, without v8-only lineage journals.
 s.providerCampaign.contentVersion=version;delete s.providerCampaign.caseHandoffVersion;delete s.providerCampaign.caseFollowupVersion;delete s.providerCampaign.dedicatedInterconnectVersion;delete s.providerCampaign.supportWork;delete s.providerCampaign.workforceHistory;
 s.providerCampaign.supportObservation={version:2,configurations:[],samples:[]};s=SOC.restore(JSON.stringify(s));
 for(const stage of ['base','carrier','partner']){
  const request={action:'purchase',offerId:'starter',planId:'steady',stage,...(stage==='base'?{}:{customerId})},q=SOC.provider.quote(s,request);
  assert.deepEqual(q.blockers,[]);s=SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});
 }
 for(let n=0;n<30&&s.providerCampaign.customers[0].status!=='active';n++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.equal(s.providerCampaign.customers[0].status,'active');return s;
}
test('content six offers preserve authored runtime parity and refuse unearned customer capacity atomically',()=>{
 assert.deepEqual(RULES.data,require('../content/provider-campaigns.json'));
 const s=opening(),before=JSON.stringify(s);
 for(const [operationId,setup,period,added,unit] of [['national-wholesale-headroom',26000,6000,8,'concurrent sessions'],['managed-national-wholesale-headroom',14000,9000,8,'concurrent sessions'],['public-service-capture-reserve',38000,6000,8,'concurrent capture reservations']]){
  const request={action:'operation',operationId,customerId},q=SOC.provider.quote(s,request);
  assert.equal(q.setupCents,setup);assert.equal(q.periodCents,period);assert.equal(q.commercial.capacity[0].added,added);assert.equal(q.commercial.capacity[0].unit,unit);
  assert.ok(q.blockers.includes('EARNED_CENTRAL_SERVICE_CUSTOMER_REQUIRED'));
  assert.throws(()=>SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}}),/PROVIDER_QUOTE_BLOCKED/);
 }
 assert.equal(JSON.stringify(s),before);assert.deepEqual(SOC.restore(before),s);
});
test('version five restores and delivers its paid guest room while refusing version six offers',()=>{
 let s=opening('provider-campaigns-5');
 const request={action:'operation',operationId:'browser-guest-room',customerId},q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);
 s=SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});
 s=SOC.dispatch(s,{type:'advance',minutes:4});
 assert.equal(s.providerCampaign.projects.find(p=>p.operationId==='browser-guest-room').status,'complete');
 assert.equal(s.portfolio.customers[0].root.information.meeting.effective.capacity,2);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 for(const operationId of ['national-wholesale-headroom','managed-national-wholesale-headroom','public-service-capture-reserve'])assert.ok(SOC.provider.quote(s,{action:'operation',operationId,customerId}).blockers.includes('PROVIDER_CONTENT_SIX_REQUIRED'));
 const future=structuredClone(s);future.providerCampaign.contentVersion='provider-campaigns-9';assert.throws(()=>SOC.restore(JSON.stringify(future)),/INVALID_PROVIDER_CAMPAIGN/);
});
