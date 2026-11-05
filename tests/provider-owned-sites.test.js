const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const OWN=require('../src/game/23-provider-owned-sites.js');
const SITE=require('../src/game/32-site-operations.js');
const RESILIENCE=require('../src/game/23-provider-resilience.js');
const {E,act,tick,siteFixture,exercise}=require('./helpers/site-fixture');

function providerState({siteRoot=null,projects=[]}={}){
 const customer={id:'acme',portfolioId:'portfolio-acme',status:'active',market:'melbourne'};
 const root=siteRoot||{experience:{version:1,kind:'campaign',custom:false},tenant:'tenant-acme',jurisdiction:'AU',providerCustomer:{version:1,id:customer.id,portfolioId:customer.portfolioId}};
 return {experience:{version:1,kind:'campaign',custom:false},clock:root.clock||0,providerCampaign:{pack:'soc-provider-campaign-1',customers:[customer],projects},portfolio:{customers:[{id:customer.portfolioId,root}]},business:{ledger:[],ledgerPrunedThrough:0}};
}

test('owned-site operations keep canonical IDs and quoted terms distinct by paid stage',()=>{
 assert.deepEqual(OWN.OPERATION_IDS,['owned-site-operations','site-recovery','site-resource-migration','custody-review']);
 assert.deepEqual(OWN.SITE_IDS,{head:'provider-owned-head',branch:'provider-owned-branch'});
 assert.equal(OWN.TERMS['owned-site-operations'].setupCents,42000);
 assert.equal(OWN.TERMS['owned-site-operations'].periodCents,4500);
 assert.equal(OWN.TERMS['site-recovery'].workMinutes,6);
 assert.equal(OWN.TERMS['site-resource-migration'].perItem,true);
 assert.equal(OWN.TERMS['custody-review'].engineers,0);
 assert.equal(OWN.SOURCE.DF,'progress.goal.df');
 assert.equal(OWN.SOURCE.M2,'progress.goal.m2');
 assert.equal(OWN.SOURCE.L4,'progress.progression-level.4');
 assert.equal(OWN.SOURCE.L12,'progress.progression-level.12');
 assert.equal(OWN.SOURCE.GI,'progress.goal.gi');
});

test('empty Provider history exposes missing evidence without creating site facts or mutating state',()=>{
 const state=providerState(),before=JSON.stringify(state),report=OWN.evaluate(state);
 for(const sourceId of Object.values(OWN.SOURCE)){assert.equal(report.goals[sourceId].status,'incomplete');assert.equal(report.goals[sourceId].evidence,null);}
 assert.equal(JSON.stringify(state),before);
 assert.throws(()=>OWN.evaluate({experience:{version:1,kind:'lab',custom:true},providerCampaign:{pack:'soc-provider-campaign-1'}}),/PROVIDER_OWNED_SITES_CAMPAIGN_REQUIRED/);
});

test('site setup plan requires a paid Provider project and rejects arbitrary project scope',()=>{
 const state=providerState();
 assert.throws(()=>OWN.operationPlan(state,'acme','owned-site-operations'),/PAID_PROVIDER_OPERATION_REQUIRED/);
 const fake={id:'project-1',customerId:'acme',kind:'operation',operationId:'owned-site-operations',status:'complete',acceptedAt:0,completedAt:10,setupCents:42000,workMinutes:10,postingId:'entry-1',config:{arbitraryResource:'free'}},unfunded=providerState({siteRoot:state.portfolio.customers[0].root,projects:[fake]});
 assert.throws(()=>OWN.operationPlan(unfunded,'acme','owned-site-operations'),/PAID_PROVIDER_OPERATION_REQUIRED/);
});

test('order descriptors expose paid blockers for each authored operation without changing Provider state',()=>{
 const state=providerState(),before=JSON.stringify(state);
 const rows=OWN.actionDescriptors(state,'acme');
 assert.deepEqual(rows.map(x=>x.id),OWN.OPERATION_IDS);
 assert.ok(rows.every(x=>x.available===false&&x.blockers.length>0));
 assert.equal(rows[0].terms.setupCents,42000);
 assert.equal(OWN.canOrder(state,'acme','site-recovery',{kind:'power',targetSite:OWN.SITE_IDS.head}).eligible,false);
 assert.equal(OWN.canOrder(state,'acme','site-resource-migration',{resourceId:'desk',fromSite:OWN.SITE_IDS.head,toSite:OWN.SITE_IDS.branch}).eligible,false);
 assert.equal(OWN.canOrder(state,'acme','custody-review',{}).eligible,false);
 assert.equal(JSON.stringify(state),before);
});

test('Provider save validation does not accept an unpriced site-operation tree',()=>{
 const child=exercise(siteFixture());
 child.experience={version:1,kind:'campaign',custom:false};
 child.providerCustomer={version:1,id:'acme',portfolioId:'portfolio-acme'};
 child.tenant='tenant-acme';
 const state=providerState({siteRoot:child});
 assert.throws(()=>OWN.validateCustomer(state,'acme',child),/UNFUNDED_PROVIDER_SITE_OPERATIONS/);
});

test('the underlying site domain records a real restore after an injected failure and fresh recovered journey',()=>{
 const initial=siteFixture(),state=exercise(initial,'power','site-a','owned-domain-power');
 const proof=state.siteOperations.exercises[0];
 assert.equal(proof.status,'complete');
 assert.equal(proof.backupSnapshot.site,'site-a');
 assert.equal(proof.restoration.status,'complete');
 assert.notEqual(proof.recoveredJourney.interactionId,proof.baseline.interactionId);
 assert.equal(SITE.assess(state).goals.df.status,'ready');
 assert.equal(SITE.validateEvidence(state,SITE.GOALS[1],SITE.goalEvidence(state,SITE.GOALS[1])),true);
 assert.deepEqual(E.restore(JSON.stringify(state)),state);
});

test('failed media prevents a site recovery claim and a later valid exercise can recover',()=>{
 let state=siteFixture();
 state=E.dispatch(state,{type:'configure',id:'phone',config:{mediaIn:false}});
 state=tick(state);
 state=act(state,'site-operations',{action:'exercise',id:'failed-media',kind:'power',sites:['site-a','site-b']});
 state=tick(state);
 assert.equal(state.siteOperations.exercises[0].status,'failed');
 assert.equal(SITE.assess(state).goals.df.status,'incomplete');
 state=E.dispatch(state,{type:'configure',id:'phone',config:{mediaIn:true}});
 state=tick(state);
 state=exercise(state,'power','site-a','recovered-after-media-repair');
 assert.equal(state.siteOperations.exercises.at(-1).status,'complete');
 assert.equal(SITE.assess(state).goals.df.status,'ready');
 assert.deepEqual(E.restore(JSON.stringify(state)),state);
});

test('worker source publishes the same pure Provider owned-site adapter without runtime Node imports',()=>{
 const box={};vm.createContext(box);
 vm.runInContext(`${SITE.source()}${RESILIENCE.source()}${OWN.source()}globalThis.result=SOC_PROVIDER_OWNED_SITES;`,box);
 assert.deepEqual(Array.from(box.result.OPERATION_IDS),OWN.OPERATION_IDS);
 assert.equal(box.result.VERSION,OWN.VERSION);
 assert.equal(typeof box.result.validateCustomer,'function');
});

test('inspection of a validated customer without paid site authority stays incomplete and read-only',()=>{
 const state=providerState(),before=JSON.stringify(state),view=OWN.inspect(state,'acme');
 assert.equal(view.status,'incomplete');
 assert.ok(view.missing.includes('PAID_PROVIDER_OWNED_SITE_OPERATIONS_REQUIRED'));
 assert.equal(JSON.stringify(state),before);
});
