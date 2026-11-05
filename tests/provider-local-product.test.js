'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer',productId='ms-local-deployment';
const child=s=>s.portfolio.customers[0].root;
const tick=(s,n=1)=>SOC.dispatch(s,{type:'advance',minutes:n});
const request=operationId=>({action:'operation',operationId,customerId});
function buy(s,command){
 const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({command,clock:s.clock,blockers:q.blockers}));
 return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});
}
function until(s,predicate,limit=100){for(let n=0;n<limit&&!predicate(s);n++)s=tick(s);assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
function commission(){
 let s=SOC.create({experience:'campaign',scenario:'defence',seed:73,market:'au-sydney'});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 return until(s,x=>x.providerCampaign.customers[0].status==='active',30);
}
function paidLocal(){
 let s=commission();s=buy(s,request('recording'));s=until(s,x=>project(x,'recording').status==='complete');
 s=buy(s,request('local-deployment'));s=until(s,x=>project(x,'local-deployment').status==='complete');
 s=buy(s,request('local-spares'));s=until(s,x=>project(x,'local-spares').status==='complete');
 const cash=s.business.balance.cash;s=buy(s,request(productId));assert.equal(s.business.balance.cash,cash-380000);
 s=until(s,x=>project(x,productId).status==='complete');
 const p=project(s,productId),posting=s.business.ledger.find(r=>r.id===p.postingId);
 assert.equal(posting.cents,p.setupCents);assert.equal(posting.projectId,p.id);
 assert.equal(child(s).resources.phone.effective.local,true);assert.equal(child(s).resources.identity.effective.local,true);
 assert.ok(child(s).products.deployments.find(d=>d.id==='d-'+productId)?.effective);
 return s;
}
function call(s,id){return tick(SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:id}),8);}
const last=s=>s.interactions.at(-1);
const feature=s=>SOC.products.featureStatus(s,'d-'+productId,'licensing-connectivity',{observeDependency:(state,kind,id)=>({ready:SOC.observe(state,id).ready&&state.resources[id].effective.licensing,reason:'LOCAL_LICENCE_UNAVAILABLE'})});
function replaceEndedOffer(lab){
 const original=lab.products.offers.find(o=>o.id===productId),offer=Object.fromEntries(['family','edition','unit','quantity','features','dependencies'].map(k=>[k,original[k]]));
 assert.throws(()=>SOC.dispatch(lab,{type:'products',command:{action:'lifecycle',offer:productId,sale:'available',support:'supported'}}),/INVALID_PRODUCT_LIFECYCLE/,'ended support cannot be silently resurrected');
 lab=SOC.dispatch(lab,{type:'products',command:{action:'offer',offer:{...offer,id:'local-replacement'}}});lab=tick(lab);
 lab=SOC.dispatch(lab,{type:'products',command:{action:'configure',id:'d-'+productId,config:{offer:'local-replacement'}}});lab=tick(lab);
 assert.equal(lab.products.offers.find(o=>o.id===productId).effectiveLifecycle.support,'ended');
 assert.equal(feature(lab).available,true);return lab;
}

test('paid Microsoft local product refuses missing and commissioning prerequisites without charging',()=>{
 let s=commission();
 for(const expected of ['PRODUCT_REQUIREMENT_REQUIRED:local-deployment','PRODUCT_REQUIREMENT_INCOMPLETE:local-deployment']){
  const q=SOC.provider.quote(s,request(productId)),before=JSON.stringify(s);
  assert.ok(q.blockers.includes(expected));
  assert.throws(()=>SOC.dispatch(s,{type:'provider',command:{...request(productId),quoteRevision:q.atRevision}}));
  assert.equal(JSON.stringify(s),before,'refused product cannot alter cash, projects or autonomous work');
  if(expected.includes('REQUIRED:'))s=buy(s,request('local-deployment'));
 }
 s=until(s,x=>project(x,'local-deployment').status==='complete');
 assert.deepEqual(SOC.provider.quote(s,request(productId)).blockers,[]);
});

test('funded Microsoft local product carries actual autonomous Defence voice during authored isolation and restores exactly',()=>{
 let s=paidLocal();const completedAt=project(s,productId).completedAt;
 const delivered=x=>x.providerCampaign.jobs.find(j=>j.customerId===customerId&&j.channel==='voice'&&j.status==='completed'&&j.arrivalAt>=completedAt&&child(x).interactions.some(i=>i.id===j.interactionId&&i.trace.some(t=>t.code==='CALL_REQUEST'&&t.platform==='phone')));
 s=until(s,x=>!child(x).connected&&!!delivered(x),25);
 const incident=s.providerCampaign.incidents.find(i=>i.customerId===customerId&&i.kind==='disconnection');
 assert.ok(incident,'isolation comes from the authored campaign incident');
 assert.ok(child(s).providerContinuity.outageStartedAt!==null);
 assert.ok(delivered(s).arrivalAt>=child(s).providerContinuity.outageStartedAt,'delivered case actually arrived offline');
 const interaction=child(s).interactions.find(i=>i.id===delivered(s).interactionId);
 assert.equal(interaction.providerContext.connected,false);assert.ok(interaction.usageMinutes>0);
 assert.ok(child(s).providerContinuity.pending.some(p=>p.interactionId===interaction.id),'offline delivery creates retained work for later reconciliation');
 assert.equal(feature(child(s)).available,true);assert.equal(SOC.observe(child(s),'phone').ready,true);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 assert.deepEqual(tick(SOC.restore(JSON.stringify(s))),tick(s),'restore continues the real pending workload deterministically');
});

test('copied paid local service fails when local licensing is lost and recovers without rewriting campaign',()=>{
 const campaign=paidLocal(),before=JSON.stringify(campaign);let lab=SOC.dispatch(campaign,{type:'copy-to-lab',customerId});
 lab=SOC.dispatch(lab,{type:'connect',connected:false});
 lab=call(lab,'local-before');assert.equal(last(lab).phase,'resolved');
 lab=SOC.dispatch(lab,{type:'configure',id:'local',config:{licensing:false}});lab=tick(lab);
 assert.equal(feature(lab).available,false);lab=call(lab,'local-licence-lost');assert.equal(last(lab).phase,'failed');
 lab=SOC.dispatch(lab,{type:'configure',id:'local',config:{licensing:true}});lab=tick(lab);
 lab=call(lab,'local-recovered');assert.equal(last(lab).phase,'resolved');assert.equal(feature(lab).available,true);
 assert.deepEqual(SOC.restore(JSON.stringify(lab)),lab);assert.equal(JSON.stringify(campaign),before);
});

test('unsupported local product blocks its dependent offline calls despite healthy infrastructure, then a supported replacement recovers',()=>{
 const campaign=paidLocal(),before=JSON.stringify(campaign);let lab=SOC.dispatch(campaign,{type:'copy-to-lab',customerId});
 lab=SOC.dispatch(lab,{type:'connect',connected:false});
 lab=call(lab,'local-supported');assert.equal(last(lab).phase,'resolved');
 lab=SOC.dispatch(lab,{type:'products',command:{action:'lifecycle',offer:productId,sale:'available',support:'ended'}});lab=tick(lab);
 assert.equal(feature(lab).available,false);assert.equal(feature(lab).code,'OFFER_UNSUPPORTED');assert.equal(SOC.observe(lab,'local').ready,true,'physical infrastructure alone stays healthy');
 lab=call(lab,'local-unsupported');assert.equal(last(lab).phase,'failed','bound local product availability must govern actual dependent calls');
 assert.equal(last(lab).outcome,'PRODUCT_FEATURE_UNAVAILABLE');
 lab=replaceEndedOffer(lab);
 lab=call(lab,'local-support-restored');assert.equal(last(lab).phase,'resolved');assert.equal(JSON.stringify(campaign),before);
});

test('local product support loss ends an admitted conversation, releases capture and preserves failure after restore and replacement',()=>{
 let campaign=paidLocal();const completedAt=project(campaign,productId).completedAt;
 const admitted=s=>child(s).interactions.find(i=>i.channel==='voice'&&i.startedAt>=completedAt&&i.voicePath&&i.capture?.status==='reserved'&&!['resolved','failed'].includes(i.phase));
 campaign=until(campaign,s=>!!admitted(s),15);const id=admitted(campaign).id,source=JSON.stringify(campaign);
 let lab=SOC.dispatch(campaign,{type:'copy-to-lab',customerId});const live=s=>s.interactions.find(i=>i.id===id);
 assert.equal(lab.connected,false);assert.equal(live(lab).voicePath.platform,'phone');
 assert.ok(live(lab).trace.some(t=>t.code==='PRODUCT_FEATURE_ACCEPTED'&&t.resource==='local'&&t.bindings.some(b=>b.deploymentId==='d-'+productId)));
 assert.ok(lab.captureReservations.some(r=>r.id===id));assert.ok(campaign.providerCampaign.jobs.some(j=>j.interactionId===id&&j.status==='pending'));
 lab=SOC.dispatch(lab,{type:'products',command:{action:'lifecycle',offer:productId,sale:'available',support:'ended'}});
 const pending=JSON.stringify(lab),direct=tick(lab);lab=tick(SOC.restore(pending));assert.deepEqual(lab,direct);
 assert.equal(live(lab).phase,'failed');assert.equal(live(lab).outcome,'PRODUCT_FEATURE_UNAVAILABLE');
 assert.equal(lab.captureReservations.some(r=>r.id===id),false);
 assert.equal(lab.records.some(r=>r.interaction===id&&r.kind==='recording'&&r.captureScope==='complete'),false,'interrupted conversation cannot invent complete capture');
 const ended=structuredClone(live(lab));lab=replaceEndedOffer(lab);
 // Explicit Lab route makes occupancy release observable through a fresh,
 // duration-bearing endpoint call; campaign configuration/history stay owned.
 lab=SOC.dispatch(lab,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});
 lab=SOC.dispatch(lab,{type:'configure',id:'carrier',config:{capacity:1}});lab=tick(lab);
 lab=SOC.dispatch(lab,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'local-live-replacement',durationMinutes:4});
 assert.equal(last(lab).phase,'connected','replacement admits a new conversation after occupancy release');
 lab=tick(lab,4);assert.equal(last(lab).phase,'resolved');assert.equal(last(lab).usageMinutes,4);
 assert.deepEqual(live(lab),ended,'later recovery does not rewrite the failed call');
 assert.deepEqual(SOC.restore(JSON.stringify(lab)),lab);assert.equal(JSON.stringify(campaign),source);
});
