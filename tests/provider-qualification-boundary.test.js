'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility.js');

const CUSTOMER='starter-customer';
const root=s=>s.portfolio.customers.find(x=>x.id===CUSTOMER).root;
const hooks={customerRoot:(s,id)=>s.portfolio.customers.find(x=>x.id===id)?.root||null,observeResource:(r,id)=>SOC.observe(r,id)};
const project=(s,id)=>s.providerCampaign.projects.findLast(x=>x.customerId===CUSTOMER&&x.operationId===id);
const minute=s=>SOC.dispatch(s,{type:'advance',minutes:1});
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,request){const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[],JSON.stringify({request,blockers:quote.blockers}));return send(s,{...request,quoteRevision:quote.atRevision});}
function until(s,predicate,limit=80){for(let i=0;i<limit&&!predicate(s);i++)s=minute(s);assert.ok(predicate(s),`condition not reached at minute ${s.clock}`);return s;}
function paidOpening(){
 let s=SOC.create({experience:'campaign'});
 for(const stage of ['base','carrier','partner']){
  s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
  s=until(s,x=>x.providerCampaign.customers[0].stages[stage].status==='effective');
 }
 s=buy(s,{action:'operation',operationId:'bpo',customerId:CUSTOMER});
 while(s.clock<120){
  const incident=s.providerCampaign.incidents.find(x=>x.status==='active');
  if(incident){s=send(s,{action:'acknowledge-incident',incidentId:incident.id});s=buy(s,{action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:CUSTOMER});}
  s=minute(s);
 }
 return s;
}

test('AC-SOC-752 paid partner qualification preserves service-boundary dependency generations and delivers the distributor room',()=>{
 let s=paidOpening();
 s=buy(s,{action:'operation',operationId:'service-boundary-review',customerId:CUSTOMER});
 s=until(s,x=>project(x,'service-boundary-review')?.status==='complete');
 const boundary=project(s,'service-boundary-review'),boundaryDependencies=boundary.operationReceipt.plan.dependencies;
 const before=Object.fromEntries(['identity','engage'].map(id=>[id,root(s).resources[id].generation]));
 assert.ok(boundaryDependencies.some(x=>x.id==='identity'&&x.generation===before.identity));
 assert.ok(boundaryDependencies.some(x=>x.id==='engage'&&x.generation===before.engage));

 s=buy(s,{action:'operation',operationId:'partner-qualification',customerId:CUSTOMER});
 const qualification=project(s,'partner-qualification');
 assert.equal(qualification.status,'running');
 s=until(s,x=>project(x,'partner-qualification')?.status==='complete',15);
 const completedQualification=project(s,'partner-qualification');
 assert.equal(completedQualification.operationReceipt.kind,'operation');
 assert.deepEqual(completedQualification.resources,['identity','engage']);
 assert.deepEqual({identity:root(s).resources.identity.generation,engage:root(s).resources.engage.generation},before,
  'qualification records paid work without authoring generic enabled writes to its dependencies');
 assert.equal(RESPONSIBILITY.qualification(s,CUSTOMER,undefined,hooks).status,'active');
 assert.equal(SOC.restore(JSON.stringify(s)).revision,s.revision,'the boundary and its unchanged dependency generations remain valid on import');

 s=buy(s,{action:'operation',operationId:'distributor-room',customerId:CUSTOMER});
 s=until(s,x=>project(x,'distributor-room')?.status==='complete',20);
 const distributor=project(s,'distributor-room');
 assert.ok(s.business.ledger.some(x=>x.id===distributor.postingId&&x.projectId===distributor.id&&x.category==='cost'));
 assert.equal(root(s).resources.room.effective.calendar,true,'the commissioned distributor project delivers an effective room capability');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);

 const badDependency=structuredClone(s),badQualification=project(badDependency,'partner-qualification');
 badQualification.resources=['identity'];
 assert.throws(()=>SOC.restore(JSON.stringify(badDependency)),/INVALID_PROVIDER|QUALIFICATION|RESPONSIBILITY/,
  'a paid posting alone cannot authorize a qualification missing its engage dependency');
 assert.notEqual(RESPONSIBILITY.qualification(badDependency,CUSTOMER,undefined,hooks).status,'active');

 const unpaid=structuredClone(s),unpaidQualification=project(unpaid,'partner-qualification');
 unpaid.business.ledger=unpaid.business.ledger.filter(x=>x.id!==unpaidQualification.postingId);
 assert.throws(()=>SOC.restore(JSON.stringify(unpaid)),/INVALID_PROVIDER|QUALIFICATION|RESPONSIBILITY|LEDGER/,
  'a qualification without its actual paid posting cannot authorize the distributor room');
 assert.ok(RESPONSIBILITY.qualification(unpaid,CUSTOMER,undefined,hooks).missing.includes('PAID_PROJECT_POSTING_REQUIRED'));
});
