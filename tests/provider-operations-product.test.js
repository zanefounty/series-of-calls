'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications'),P=require('../src/game/23-provider-policy');
const customerId='starter-customer',operationId='cisco-provider-operations';
const tick=(s,n=1)=>SOC.dispatch(s,{type:'advance',minutes:n});
const child=s=>s.portfolio.customers[0].root;
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify(command));return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
function setup(){
 let s=SOC.create({experience:'campaign',scenario:'smb',seed:73});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 s=tick(s,4);const cash=s.business.balance.cash;
 s=buy(s,{action:'operation',operationId,customerId});assert.equal(s.business.balance.cash,cash-175000);
 for(let n=0;n<30&&!s.providerCampaign.projects.some(p=>p.operationId===operationId&&p.status==='complete');n++)s=tick(s);
 assert.ok(s.providerCampaign.projects.some(p=>p.operationId===operationId&&p.status==='complete'));
 assert.equal(s.providerAutomation[0].status,'suspended');assert.equal(s.providerAutomation[0].actions.length,0);
 assert.equal(child(s).channels?.accounts?.chatterleaf,undefined,'provider operations does not install unrelated social CPaaS');
 return s;
}
function recoverCarrier(s){
 const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status));if(!incident)return s;
 if(incident.status==='active')s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
 s=buy(s,{action:'operation',operationId:'repair',customerId});
 for(let n=0;n<15&&s.providerCampaign.incidents.some(i=>i.id===incident.id&&i.status!=='resolved');n++)s=tick(s);
 assert.equal(s.providerCampaign.incidents.find(i=>i.id===incident.id).status,'resolved');return s;
}
function policy(s,kind){return {...P.create(),enabled:true,cashFloorCents:10000,lifetimeBudgetCents:300000,budgetSpentCents:0,maxActions:1,actionsUsed:0,engineerCeiling:2,supportCeiling:1,customerIds:[customerId],rules:[{id:kind,kind,enabled:true,customerIds:[customerId],operationId:kind==='headroom'?'carrier-headroom':'migration',stage:null,resourceId:kind==='headroom'?'carrier':null,thresholdPercent:kind==='headroom'?1:null}]};}
const configure=(s,config)=>SOC.dispatch(s,{type:'provider',command:{action:'configure-policy',customerId,config}});

test('paid provider operations fulfils a measured capacity order with its actual shared-cash receipt and delayed capacity',()=>{
 let s=recoverCarrier(setup()),config=policy(s,'headroom');const before=JSON.stringify(s);SOC.provider.policyPreview(s,config);assert.equal(JSON.stringify(s),before,'preview cannot buy capacity');
 s=configure(s,config);const capacity=child(s).resources.carrier.effective.capacity,seats=child(s).resources.phone.effective.capacity,cash=s.business.balance.cash;
 for(let n=0;n<20&&!s.providerAutomation[0].actions.length;n++)s=tick(s);
 const action=s.providerAutomation[0].actions[0];assert.ok(action,'actual concurrent-session pressure must trigger a paid order');assert.equal(action.kind,'headroom');
 const project=s.providerCampaign.projects.find(p=>p.id===action.projectId);assert.equal(project.operationId,'carrier-headroom');assert.equal(project.customerId,customerId);
 assert.equal(action.cents,project.setupCents);assert.equal(s.business.balance.cash,cash-action.cents);assert.equal(child(s).resources.carrier.effective.capacity,capacity);
 const posting=s.business.ledger.find(p=>p.id===project.postingId);assert.equal(posting.cents,action.cents);assert.equal(posting.projectId,project.id);
 s=tick(s,6);assert.equal(child(s).resources.carrier.effective.capacity,capacity+4);assert.equal(child(s).resources.phone.effective.capacity,seats);assert.equal(s.providerAutomation[0].actions.length,1);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=structuredClone(s);forged.providerAutomation[0].actions[0].cents=0;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_AUTOMATION/);
});

test('paid provider tenant policy requires explicit valid authority and migrates the selected tenant through a paid order',()=>{
 let s=setup(),config=policy(s,'migration');const before=JSON.stringify(s);
 assert.throws(()=>configure(s,{...config,customerIds:['unowned-customer']}),/POLICY_EXPLICIT_SCOPE_REQUIRED/);assert.equal(JSON.stringify(s),before);
 const preview=SOC.provider.policyPreview(s,config);assert.equal(preview.status,'ready');assert.equal(preview.intent.command.customerId,customerId);
 s=configure(s,config);s=tick(s);assert.equal(s.providerAutomation[0].actions[0].kind,'migration');
 for(let n=0;n<30&&SOC.operations.platform(child(s),'bea')!=='migration-phone';n++)s=tick(s);
 assert.equal(SOC.operations.platform(child(s),'bea'),'migration-phone');assert.equal(SOC.operations.platform(child(s),'alex'),'phone');
 assert.equal(s.providerCampaign.projects.filter(p=>p.operationId==='migration').length,1);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('provider operations copied to Lab loses billing and fulfilment features when their dependency fails and recovers without mutating campaign',()=>{
 const campaign=setup(),before=JSON.stringify(campaign);let lab=SOC.dispatch(campaign,{type:'copy-to-lab',customerId});
 const feature=name=>SOC.products.featureStatus(lab,'d-'+operationId,name,{observeDependency:(state,kind,id)=>SOC.observe(state,id)});
 assert.equal(lab.providerAutomation,undefined,'Lab never owns campaign standing orders');assert.equal(feature('order-fulfilment').available,true);
 lab=SOC.dispatch(lab,{type:'fault',id:'engage',fault:'OUTAGE'});
 for(const name of ['wholesale-billing','order-fulfilment'])assert.equal(feature(name).available,false,name+' requires the actual workflow dependency');
 assert.equal(feature('tenant-administration').available,true,'identity authority has its own dependency');
 lab=SOC.dispatch(lab,{type:'fault',id:'engage',fault:null});for(const name of ['wholesale-billing','order-fulfilment'])assert.equal(feature(name).available,true);
 assert.equal(JSON.stringify(campaign),before);assert.deepEqual(SOC.restore(JSON.stringify(lab)),lab);
 // This Lab probe proves product dependency gating, not a campaign policy outage.
});
