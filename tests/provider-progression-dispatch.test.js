'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const first='progress.goal.bb',level='progress.progression-level.1',customerId='starter-customer';
const claim=(s,sourceId)=>SOC.dispatch(s,{type:'provider',command:{action:'claim-progression',sourceId,quoteRevision:s.revision}});
const request=operationId=>({action:'operation',operationId,customerId});
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[]);return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
function opening(){
 let s=SOC.create({experience:'campaign'});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 while(s.clock<120){const fault=s.providerCampaign.incidents.find(i=>i.status==='active');if(fault){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:fault.id}});s=buy(s,request('repair'));}s=SOC.dispatch(s,{type:'advance',minutes:1});}
 return s;
}
test('earned dispatch claims unlock a paid supplier alternative with real staffing, delayed capacity and no free money',()=>{
 let s=opening();const locked=SOC.provider.quote(s,request('managed-carrier-headroom'));
 assert.ok(locked.blockers.includes('EARNED_LOCAL_RESELLER_REQUIRED'));
 const before=JSON.stringify(s),money=structuredClone(s.business.balance);
 assert.throws(()=>claim(s,level),/First customer live/);assert.equal(JSON.stringify(s),before);
 s=claim(s,first);s=claim(s,level);assert.deepEqual(s.business.balance,money,'claiming neither charges nor grants money');
 assert.equal(s.providerCampaign.progressionReceipts.receipts.length,2);
 const stale=s.revision;s=claim(s,level);assert.equal(s.providerCampaign.progressionReceipts.receipts.length,2);
 assert.equal(s.providerCampaign.events.filter(e=>e.code==='PROGRESSION_EARNED').length,2);
 assert.throws(()=>SOC.dispatch(s,{type:'provider',command:{action:'claim-progression',sourceId:level,quoteRevision:stale}}),/STALE_PROVIDER_QUOTE/);
 const direct=SOC.provider.quote(s,request('carrier-headroom')),managed=SOC.provider.quote(s,request('managed-carrier-headroom'));
 assert.deepEqual(managed.blockers,[]);assert.ok(managed.setupCents<direct.setupCents&&managed.periodCents>direct.periodCents&&managed.engineers<direct.engineers&&managed.support>direct.support);
 const root=()=>s.portfolio.customers[0].root,capacity=root().resources.carrier.effective.capacity,seats=root().resources.people.effective.entitlements,cash=s.business.balance.cash;
 s=buy(s,request('managed-carrier-headroom'));assert.equal(s.business.balance.cash,cash-8000);assert.equal(root().resources.carrier.effective.capacity,capacity);
 assert.ok(SOC.provider.quote(s,request('carrier-headroom')).blockers.includes('CARRIER_UPGRADE_PENDING'),'both alternatives reserve the same upgrade scope');
 while(!s.providerCampaign.projects.some(p=>p.operationId==='managed-carrier-headroom'&&p.status==='complete'))s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.equal(root().resources.carrier.effective.capacity,capacity+4);assert.equal(root().resources.people.effective.entitlements,seats);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const withoutAchievement=structuredClone(s);delete withoutAchievement.providerCampaign.progressionReceipts;assert.throws(()=>SOC.restore(JSON.stringify(withoutAchievement)),/INVALID_PROVIDER_EARNED_OPERATION/,'a paid unlocked operation still needs its earned authority on restore');
 const noSupport=SOC.dispatch(s,{type:'provider',command:{action:'staff',engineers:2,support:0}});
 assert.ok(SOC.provider.quote(noSupport,request('managed-carrier-headroom')).blockers.includes('SUPPORT_CAPACITY'));
});
test('worker claim parity and support-observation restore validation use the same authority boundary',()=>{
 const s=opening(),command={type:'provider',command:{action:'claim-progression',sourceId:first,quoteRevision:s.revision}};
 let response;const context={postMessage:value=>response=value};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:'claim',state:s,command}});
 assert.equal(response.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(response.state)),SOC.dispatch(s,command));
 assert.equal(s.providerCampaign.supportObservation.samples.length,60);
 for(const change of [o=>o.version=2,o=>o.samples.push(o.samples.at(-1)),o=>o.samples[0].at++,o=>o.samples.at(-1).at--]){const bad=structuredClone(s);change(bad.providerCampaign.supportObservation);assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_SUPPORT_OBSERVATION/);}
 const legacy=structuredClone(s);delete legacy.providerCampaign.supportObservation;assert.deepEqual(SOC.restore(JSON.stringify(legacy)),legacy,'old saves acquire no invented minute samples');
});
