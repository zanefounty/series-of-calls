'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const externalReach=require('../src/game/23-provider-external-reach');
const receipts=require('../src/game/23-provider-progression-receipts');

test('external reach readiness is a pure fail-closed adapter on an uncommissioned Enterprise campaign',()=>{
 const state=SOC.create({experience:'campaign',scenario:'enterprise',seed:41}),before=JSON.stringify(state);
 const result=externalReach.evaluate(state,'starter-customer',{
  missionRules:SOC.provider.rules.missions,
  customerRoot:(current,portfolioId)=>current.portfolio.customers.find(row=>row.id===portfolioId)?.root||null,
  observeResource:(root,resourceId)=>SOC.observe(root,resourceId)
 });
 assert.equal(result.status,'incomplete');
 assert.equal(result.evidence,null);
 assert.ok(result.missing.includes('provider-customer-required'));
 assert.equal(JSON.stringify(state),before,'evaluation must not create a customer, advance time, or mutate evidence');
 assert.equal(externalReach.validateEvidence(state,'starter-customer',{kind:'provider-external-reach'},{}),false);
});

test('external reach worker source is self-contained and preserves the same source identity',()=>{
 const worker=new Function(`${externalReach.source()}\nreturn SOC_PROVIDER_EXTERNAL_REACH;`)();
 assert.equal(worker.SOURCE_ID,'progress.goal.tr');
 assert.equal(worker.VERSION,externalReach.VERSION);
 assert.equal(typeof worker.evaluate,'function');
 assert.equal(typeof worker.validateEvidence,'function');
});

test('earned TR receipts stay locked until the measured predicate is ready',()=>{
 const state=SOC.create({experience:'campaign',scenario:'enterprise',seed:42}),before=JSON.stringify(state),sourceId=receipts.EXTERNAL_REACH;
 const hooks={missionRules:SOC.provider.rules.missions,customerRoot:(current,portfolioId)=>current.portfolio.customers.find(row=>row.id===portfolioId)?.root||null,observeResource:(root,resourceId)=>SOC.observe(root,resourceId)};
 const eligible=receipts.eligibility(state,sourceId,hooks);
 assert.equal(eligible.status,'incomplete');
 assert.equal(receipts.unlockProposal(state,sourceId,hooks).status,'locked');
 assert.throws(()=>receipts.claim(state,sourceId,hooks),/PROVIDER_PROGRESSION_EVIDENCE_REQUIRED/);
 assert.equal(JSON.stringify(state),before);
});
