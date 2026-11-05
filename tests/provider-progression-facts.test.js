const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const SOC=require('../src/game/55-communications.js');
const FACTS=require('../src/game/23-provider-progression.js');
const CONTENT=require('../content/progression.json');

const buy=(s,request)=>{
 const quote=SOC.provider.quote(s,request);
 assert.deepEqual(quote.blockers,[],JSON.stringify({request,blockers:quote.blockers}));
 return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});
};
const minute=s=>SOC.dispatch(s,{type:'advance',minutes:1});
const hooks={customerRoot:(s,portfolioId)=>s.portfolio.customers.find(x=>x.id===portfolioId)?.root||null,observeResource:(root,id)=>SOC.observe(root,id)};
function paidOpening(advanceUntil=35){
 let s=SOC.create({experience:'campaign'});
 for(const stage of ['base','carrier','partner']){
  s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
  while(s.providerCampaign.customers[0].stages[stage].status!=='effective')s=minute(s);
 }
 s=buy(s,{action:'operation',operationId:'bpo',customerId:'starter-customer'});
 while(s.clock<advanceUntil){
  const incident=s.providerCampaign.incidents.find(x=>x.status==='active');
  if(incident){
   s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
   s=buy(s,{action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId});
  }
  s=minute(s);
 }
 return s;
}

test('AC-PROVIDER-PROGRESSION-FACTS-001 lists all canonical source IDs and exact fictional names',()=>{
 const records=CONTENT.records;
 const expectedLevels=records.filter(x=>x.sourceId.startsWith('progress.progression-level.')).map(x=>[x.sourceId,x.fictionalName]).sort((a,b)=>a[0].localeCompare(b[0]));
 const expectedGoals=records.filter(x=>x.sourceId.startsWith('progress.goal.')).map(x=>[x.sourceId,x.fictionalName]).sort((a,b)=>a[0].localeCompare(b[0]));
 assert.equal(FACTS.LEVELS.length,13);
 assert.equal(FACTS.GOALS.length,19);
 const empty=SOC.create({experience:'campaign'}),report=FACTS.evaluate(empty,hooks);
 assert.deepEqual(Object.values(report.levels).map(x=>[x.id,x.name]).sort((a,b)=>a[0].localeCompare(b[0])),expectedLevels);
 assert.deepEqual(Object.values(report.goals).map(x=>[x.id,x.name]).sort((a,b)=>a[0].localeCompare(b[0])),expectedGoals);
 assert.equal(Object.values(report.levels).filter(x=>x.status==='ready').length,0);
 assert.equal(Object.values(report.goals).filter(x=>x.status==='ready').length,0);
 assert.ok(report.levels['progress.progression-level.3'].missing.some(x=>x.includes('version-scoped')));
 assert.ok(report.goals['progress.goal.scrub'].missing.some(x=>x.includes('security operations')));
});

test('AC-PROVIDER-PROGRESSION-FACTS-002 rejects Training and roots without Provider campaign authority',()=>{
 const state=SOC.create({experience:'campaign'});
 assert.throws(()=>FACTS.evaluate({...state,experience:{version:1,kind:'training',custom:false}},hooks),/PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED/);
 const noProvider=structuredClone(state);delete noProvider.providerCampaign;
 assert.throws(()=>FACTS.evaluate(noProvider,hooks),/PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED/);
});

test('AC-PROVIDER-PROGRESSION-FACTS-003 paid Provider stages and resolved voice plus digital case lineage make first customer live',()=>{
 const state=paidOpening(),before=JSON.stringify(state),report=FACTS.inspect(state,hooks);
 assert.equal(report.facts.firstLiveCustomer.status,'ready');
 assert.equal(report.goals['progress.goal.bb'].status,'ready');
 assert.equal(report.facts.firstLiveCustomer.evidence.jobs.length,2);
 assert.deepEqual(new Set(report.facts.firstLiveCustomer.evidence.jobs.map(x=>x.channel)),new Set(['voice','message']));
 assert.equal(report.facts.firstLiveCustomer.evidence.projectIds.length,3);
 assert.ok(report.facts.firstLiveCustomer.evidence.postingIds.every(id=>state.business.ledger.some(x=>x.id===id&&x.category==='cost')));
 assert.equal(report.facts.billedNonstarter.status,'incomplete');
 assert.ok(report.facts.billedNonstarter.missing.some(x=>x.includes('named support-responsibility')));
 assert.equal(report.facts.twoSupportedCustomers.status,'incomplete');
 assert.equal(JSON.stringify(state),before,'evaluation must not mutate the campaign');
 const restored=SOC.restore(JSON.stringify(state));
 assert.deepEqual(FACTS.evaluate(restored,hooks),report);
});

test('AC-PROVIDER-PROGRESSION-FACTS-004 progress markers cannot replace resolved autonomous work and retained case context',()=>{
 const state=paidOpening();
 state.providerCampaign.goals.forEach(x=>{x.status='complete';});
 const noWork=structuredClone(state);noWork.providerCampaign.jobs=[];
 const report=FACTS.evaluate(noWork,hooks);
 assert.equal(report.goals['progress.goal.bb'].status,'incomplete');
 assert.ok(report.goals['progress.goal.bb'].missing.some(x=>x.includes('resolved autonomous')));
 const noContext=structuredClone(state),job=noContext.providerCampaign.jobs.find(x=>x.channel==='voice'&&['completed','late'].includes(x.status));
 noContext.portfolio.customers[0].root.interactions.find(x=>x.id===job.interactionId).context=false;
 const contextReport=FACTS.evaluate(noContext,hooks);
 assert.equal(contextReport.goals['progress.goal.bb'].status,'incomplete');
 assert.ok(contextReport.goals['progress.goal.bb'].missing.some(x=>x.includes('resolved autonomous')));
});

test('AC-PROVIDER-PROGRESSION-FACTS-005 sustainability requires a recent full settlement, positive consolidated result, and retained matching postings',()=>{
 const state=paidOpening(120),report=FACTS.evaluate(state,hooks),sustainable=report.facts.sustainable;
 assert.equal(sustainable.status,'ready');
 assert.equal(sustainable.evidence.interval.to-sustainable.evidence.interval.from,60);
 assert.ok(sustainable.evidence.globalOperatingResultCents>0);
 assert.ok(state.business.ledger.some(x=>x.id===sustainable.evidence.revenuePostingId&&x.reason==='provider-customer-period'));
 assert.ok(sustainable.evidence.costPostingIds.length>0);
 assert.equal(report.levels['progress.progression-level.1'].status,'incomplete','no named support responsibility or billed nonstarter contract exists');
 const missingPosting=structuredClone(state),proof=sustainable.evidence;
 missingPosting.business.ledger=missingPosting.business.ledger.filter(x=>x.id!==proof.revenuePostingId&&!proof.costPostingIds.includes(x.id));
 const missing=FACTS.evaluate(missingPosting,hooks);
 assert.equal(missing.facts.sustainable.status,'incomplete');
 assert.ok(missing.facts.sustainable.missing.some(x=>x.includes('no longer retained')));
});
