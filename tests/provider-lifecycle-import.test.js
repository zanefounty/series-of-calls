'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications'),CAMPAIGN=require('../src/game/25-provider-campaign');
const customerId='starter-customer',child=s=>s.portfolio.customers[0].root,project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,command,blockers:q.blockers}));return send(s,{...command,quoteRevision:q.atRevision});}
const op=(s,operationId)=>buy(s,{action:'operation',operationId,customerId});
function advance(s,to){while(s.clock<to){const incident=s.providerCampaign.incidents.find(i=>i.status==='active');if(incident){s=send(s,{action:'acknowledge-incident',incidentId:incident.id});s=op(s,incident.resource==='service'?'service-repair':'repair');}s=SOC.dispatch(s,{type:'advance',minutes:1});}return s;}
function until(s,predicate,limit=200){for(let n=0;n<limit&&!predicate(s);n++)s=advance(s,s.clock+1);assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
function opening(scenario='enterprise'){if(scenario==='smb'){let s=SOC.create({experience:'campaign'});for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});while(s.providerCampaign.customers[0].stages[stage].status!=='effective')s=SOC.dispatch(s,{type:'advance',minutes:1});}s=op(s,'bpo');while(project(s,'bpo').status!=='complete')s=SOC.dispatch(s,{type:'advance',minutes:1});return advance(s,120);}let s=SOC.create({experience:'campaign',scenario,seed:73});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=advance(s,15);if(scenario==='enterprise'){s=op(s,'room');s=op(s,'recording');s=advance(s,30);s=op(s,'transcription');return advance(s,80);}s=op(s,'bpo');return advance(s,120);}
const retire=(s,id)=>buy(s,{action:'retire-service-project',projectId:project(s,id).id});
let boundaryFixture;
function reviewed(){if(!boundaryFixture){let s=op(opening('smb'),'service-boundary-review');boundaryFixture=until(s,x=>project(x,'service-boundary-review').status==='complete');}return structuredClone(boundaryFixture);}

test('an unrelated funded project cannot authorize a forged retired-room generation',()=>{
 let s=advance(retire(opening(),'room'),81);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const bad=structuredClone(s),room=child(bad).resources.room;room.generation++;room.desired.enabled=true;room.effective.enabled=true;room.provisioning.generation=room.generation;
 const unrelated=project(bad,'recording');assert.ok(!unrelated.resources.includes('room'));unrelated.configSubmittedAt=bad.clock;unrelated.expectedGenerations.room=room.generation;
 assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_|UNFUNDED_SERVICE_RECOMMISSION/);
});

test('a new paid room generation can itself retire without invalidating its older retirement receipt',()=>{
 let s=advance(retire(opening(),'room'),81);const old=structuredClone(project(s,'room').serviceRetirement);s=op(s,'room');s=until(s,x=>project(x,'room').status==='complete');const paidGeneration=child(s).resources.room.generation;
 s=retire(s,'room');s=advance(s,s.clock+1);assert.equal(child(s).resources.room.effective.enabled,false);assert.equal(project(s,'room').serviceRetirement.expectedGenerations.room,paidGeneration+1);assert.deepEqual(s.providerCampaign.projects.find(p=>p.serviceRetirement?.expectedGenerations.room===old.expectedGenerations.room).serviceRetirement,old);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('exit quotes disclose retained archive charges and exit cannot erase them after the minimum term',()=>{
 let s=retire(opening(),'recording');const p=project(s,'recording');assert.ok(child(s).records.some(r=>!r.deleted));
 const q=SOC.provider.quote(s,{action:'exit',customerId});assert.deepEqual(q.blockers,[]);assert.ok(q.commercial.remainingMinimumSupplierCents>0);assert.equal(q.commercial.retainedStoragePeriodCents,3000);assert.ok(q.commercial.retainedStorage.some(r=>r.projectId===p.id&&r.periodCents===3000&&r.retainedResources.includes('archive')));
 s=buy(s,{action:'exit',customerId});s=advance(s,480);const posting=s.business.ledger.find(e=>e.reason==='provider-operation-period'&&e.customerId===customerId&&e.period===7);assert.equal(posting.cents,3000,'exit cannot erase retained archive storage');assert.equal(CAMPAIGN.operationExposure(project(s,'recording'),s.providerCampaign.customers[0],420,480),3000);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const after=SOC.provider.quote(s,{action:'exit',customerId});assert.equal(after.commercial.remainingMinimumSupplierCents,0);assert.equal(after.commercial.retainedStoragePeriodCents,3000);
});

test('paid recording replacement transfers retained storage instead of duplicating the charge across retirement generations',()=>{
 let s=advance(retire(opening(),'recording'),81);const firstId=project(s,'recording').id;s=op(s,'recording');s=until(s,x=>project(x,'recording').status==='complete');const replacement=project(s,'recording'),first=s.providerCampaign.projects.find(p=>p.id===firstId);assert.equal(first.serviceRetirement.storageTransferredAt,replacement.completedAt);assert.equal(first.serviceRetirement.storageTransferProjectId,replacement.id);assert.equal(first.serviceRetirement.storageReleasedAt,undefined,'the retained records have not been deleted');
 s=retire(s,'recording');s=advance(s,s.clock+1);const from=Math.ceil(Math.max(...s.providerCampaign.projects.filter(p=>p.serviceRetirement).map(p=>p.serviceRetirement.commitmentEndsAt))/60)*60;const rows=s.providerCampaign.projects.filter(p=>p.operationId==='recording');assert.equal(rows.reduce((n,p)=>n+CAMPAIGN.operationExposure(p,s.providerCampaign.customers[0],from,from+60),0),3000);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=buy(s,{action:'exit',customerId});s=advance(s,from+60);const posting=s.business.ledger.find(e=>e.reason==='provider-operation-period'&&e.customerId===customerId&&e.period===from/60);assert.equal(posting.cents,3000);assert.ok(child(s).records.some(r=>!r.deleted));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

for(const [label,mutate] of [
 ['portfolio scope',p=>{p.portfolioId='other-customer';}],
 ['tenant scope',p=>{p.tenant='forged-tenant';}],
 ['future accepted-retail timestamp',p=>{p.acceptedRetailAt=99999;}],
 ['unpaid responsibility IDs',p=>{p.responsibility={id:'fake',projectId:'fake',postingId:'fake',effectiveAt:0};}],
 ['future responsibility timestamp',p=>{p.responsibility.effectiveAt=99999;}]
])test('boundary-review import rejects forged '+label,()=>{
 const s=reviewed();assert.deepEqual(SOC.restore(JSON.stringify(s)),s);const bad=structuredClone(s);mutate(project(bad,'service-boundary-review').operationReceipt.plan);assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_SERVICE_BOUNDARY/);
});

test('legitimate same-price renewal and a second funded boundary review retain valid historical receipts',()=>{
 let s=reviewed();const first=structuredClone(project(s,'service-boundary-review'));s=until(s,x=>x.providerCampaign.customers[0].status==='renewal');const price=s.providerCampaign.customers[0].retailCents;s=send(s,{action:'renew',customerId});assert.equal(s.providerCampaign.customers[0].retailCents,price);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=op(s,'service-boundary-review');s=until(s,x=>project(x,'service-boundary-review').status==='complete');const second=project(s,'service-boundary-review');assert.notEqual(second.id,first.id);assert.equal(s.business.ledger.find(e=>e.id===second.postingId).cents,second.setupCents);assert.deepEqual(s.providerCampaign.projects.find(p=>p.id===first.id).operationReceipt,first.operationReceipt);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('a legitimate revised renewal price preserves historical review evidence and requires a current paid review',()=>{
 let s=reviewed();s=until(s,x=>x.providerCampaign.customers[0].status==='renewal');const old=structuredClone(project(s,'service-boundary-review')),price=s.providerCampaign.customers[0].retailCents;
 s=send(s,{action:'renew',customerId,retailCents:price-100});assert.deepEqual(SOC.restore(JSON.stringify(s)),s);s=advance(s,s.clock+1);
 assert.equal(SOC.provider.inspect(s).customers[0].services.find(r=>r.id==='phone').observed.ready,false);
 s=op(s,'service-boundary-review');s=until(s,x=>project(x,'service-boundary-review').status==='complete');assert.equal(SOC.provider.inspect(s).customers[0].services.find(r=>r.id==='phone').observed.ready,true);assert.deepEqual(s.providerCampaign.projects.find(p=>p.id===old.id).operationReceipt,old.operationReceipt);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

for(const replacement of [false,true])test((replacement?'recommissioned':'initial paid')+' recording keeps one archive obligation after customer exit without service retirement',()=>{
 let s=opening();if(replacement){s=advance(retire(s,'recording'),s.clock+1);s=op(s,'recording');s=until(s,x=>project(x,'recording').status==='complete');}
 const recording=project(s,'recording'),retainedIds=child(s).records.filter(r=>!r.deleted).map(r=>r.id);assert.ok(retainedIds.length);assert.equal(recording.serviceRetirement,undefined,'the player exits without retiring the active replacement');
 const quote=SOC.provider.quote(s,{action:'exit',customerId});assert.deepEqual(quote.blockers,[]);assert.equal(quote.commercial.retainedStoragePeriodCents,3000);assert.equal(quote.commercial.retainedStorage.length,1);assert.equal(quote.commercial.retainedStorage[0].projectId,recording.id);
 s=buy(s,{action:'exit',customerId});assert.deepEqual(SOC.restore(JSON.stringify(s)),s);const erased=structuredClone(s);delete project(erased,'recording').exitStorage;assert.throws(()=>SOC.restore(JSON.stringify(erased)),/INVALID_PROVIDER_EXIT_STORAGE_MISSING/);
 const from=Math.ceil(Math.max(...s.providerCampaign.projects.filter(p=>p.kind==='operation'&&p.status==='complete').map(p=>p.completedAt+p.minimumTermPeriods*60))/60)*60;s=advance(s,from+60);
 assert.ok(retainedIds.every(id=>child(s).records.some(r=>r.id===id&&!r.deleted)));const recordings=s.providerCampaign.projects.filter(p=>p.operationId==='recording');assert.equal(recordings.reduce((n,p)=>n+CAMPAIGN.operationExposure(p,s.providerCampaign.customers[0],from,from+60),0),3000,'exactly one archive charge survives exit and prior storage transfer');
 const posting=s.business.ledger.find(e=>e.reason==='provider-operation-period'&&e.customerId===customerId&&e.period===from/60);assert.equal(posting.cents,3000);const after=SOC.provider.quote(s,{action:'exit',customerId});assert.equal(after.commercial.remainingMinimumSupplierCents,0);assert.equal(after.commercial.retainedStoragePeriodCents,3000);assert.equal(after.commercial.retainedStorage.length,1);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
