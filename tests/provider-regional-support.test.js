const test=require('node:test');
const assert=require('node:assert/strict');
const SUPPORT=require('../src/game/23-provider-regional-support.js');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility.js');

const validateSamples=()=>true;
const hooks={
 customerRoot:(s,portfolioId)=>s.portfolio.customers.find(x=>x.id===portfolioId)?.root||null,
 responsibilities:()=>({status:'available',records:[]}),
 observeResource:()=>true,
 validateSupportSamples:validateSamples,
 integrationStatus:()=>({status:'scenario-verified'})
};
hooks.currentSample=(s,customerId,at)=>SUPPORT.sample(s,customerId,at,hooks);
const ids=Object.keys(SUPPORT.MARKETS);
function projectFor(customerId,market,index,coverageId='extended'){
 const plan=SUPPORT.operationPlan({customerId,market,personId:Object.keys(SUPPORT.PEOPLE).find(id=>SUPPORT.PEOPLE[id].market===market),coverageId});
 const projectId=`support-${customerId}`,postingId=`entry-${index}`;
 return {plan,project:{id:projectId,postingId,customerId,kind:'operation',operationId:SUPPORT.OPERATION_ID,status:'complete',acceptedAt:399,configSubmittedAt:399+plan.workMinutes,dueAt:399+plan.workMinutes,completedAt:410,setupCents:plan.setupCents,periodCents:plan.periodCents,workMinutes:plan.workMinutes,engineers:plan.engineers,support:plan.support,operationReceipt:{kind:SUPPORT.OPERATION_ID,version:1,projectId,postingId,customerId,installedAt:398+plan.workMinutes,supportAssignment:plan.supportAssignment}}};
}
function fixture(markets=ids.slice(0,3),{coverageId='extended',withIntegrations=false,withDistributor=false}={}){
 const customerIds=markets.map((_,i)=>`customer-${i+1}`),projects=[],customers=[],portfolioCustomers=[],ledger=[],roots={};
 for(let i=0;i<markets.length;i++){
  const customerId=customerIds[i],market=markets[i],portfolioId=`portfolio-${customerId}`,{plan,project}=projectFor(customerId,market,i+1,coverageId);projects.push(project);
  ledger.push({id:project.postingId,category:'cost',reason:'provider-operation',customerId,projectId:project.id,cents:plan.setupCents});
  const c={id:customerId,portfolioId,market,scenario:'smb',status:'active',stages:{}};customers.push(c);
  const root={tenant:`tenant-${customerId}`,providerCustomer:{id:customerId,version:1},resources:{carrier:{generation:1}},products:{integrations:[]}};roots[customerId]=root;
  portfolioCustomers.push({id:portfolioId,market,root});
  if(withIntegrations){
   const edgeId='workplace-to-contact-quality',edge={id:edgeId,source:'d-ms-workplace-calling',target:'d-cisco-contact-centre',sourceVersion:'1.0',targetVersion:'2.0',sourceGeneration:1,targetGeneration:1,checkedAt:479,features:[{sourceFeature:'telephony',targetFeature:'quality-review'}],result:{status:'scenario-verified',synthetic:true,externalSupportClaim:false,checkedAt:479}};
   root.products.integrations.push(edge);
  }
 }
 const business={organisations:{'orchard-msp':{roles:['msp','reseller']},'branch-distribution':{roles:['distributor']}},workforce:{engineers:1,support:markets.length},ledger};
 const state={clock:539,revision:1,experience:{version:1,kind:'campaign',custom:false},business,portfolio:{customers:portfolioCustomers},providerCampaign:{pack:'soc-provider-campaign-1',version:1,contentVersion:'provider-campaigns-8',commercialResponsibilityVersion:1,customers,projects,jobs:[],payroll:{personMinutes:10000,billedMinutes:10000,costCents:50000},periodHistory:[]}};
 const participants=customerIds.map((customerId,i)=>{
  const namedSupport=SUPPORT.sample(state,customerId,480,{...hooks,responsibilities:hooks.responsibilities}).namedSupport;
  const row={customerId,market:markets[i],eligible:true,missing:[],responsibility:{sharedWorkforce:{support:markets.length,personMinutes:10000,billedMinutes:10000}},boundaries:[{id:`boundary-${customerId}`,generation:1,profile:'regional',resources:['phone']}],resources:[{id:'carrier',generation:1}],namedSupport,distributor:null,settlements:[{settledAt:539,revenuePostingId:`revenue-${i+1}`}],freshJobs:[]};
  if(withIntegrations)row.integrations=[{id:'workplace-to-contact-quality',source:'d-ms-workplace-calling',target:'d-cisco-contact-centre',sourceVersion:'1.0',targetVersion:'2.0',sourceGeneration:1,targetGeneration:1,checkedAt:479,features:[{sourceFeature:'telephony',targetFeature:'quality-review'}]}];
  return row;
 });
 const supportSamples=Array.from({length:60},(_,i)=>({at:480+i,cohort:customerIds,participants:participants.map(p=>({...structuredClone(p),namedSupport:SUPPORT.sample(state,p.customerId,480+i,{...hooks,responsibilities:hooks.responsibilities}).namedSupport,freshJobs:i===59?[{jobId:`job-${p.customerId}`,interactionId:`interaction-${p.customerId}`,caseId:`case-${p.customerId}`,channel:'voice',startedAt:520,finishedAt:539,person:`agent-${p.customerId}`,assignmentId:`assignment-${p.customerId}`}]:[]}))}));
 state.providerCampaign.supportObservation=supportSamples;
 if(withDistributor){
  for(let i=0;i<markets.length;i++){
   const customerId=customerIds[i],qId=`qualification-${customerId}`,qPosting=`entry-${100+i*2}`,dId=`distribution-${customerId}`,dPosting=`entry-${101+i*2}`;
   const q={id:qId,postingId:qPosting,customerId,kind:'operation',operationId:'partner-qualification',status:'complete',acceptedAt:430,dueAt:440,completedAt:440,setupCents:1000,periodCents:0,resources:['identity','engage']};
   const d={id:dId,postingId:dPosting,customerId,kind:'operation',operationId:'distributor-room',status:'complete',acceptedAt:450,dueAt:460,completedAt:460,setupCents:2000,periodCents:0,resources:['room','recording']};
   projects.push(q,d);ledger.push({id:qPosting,category:'cost',reason:'provider-operation',customerId,projectId:qId,cents:1000},{id:dPosting,category:'cost',reason:'provider-operation',customerId,projectId:dId,cents:2000});
   const certificate={version:1,id:`provider-qualification-${qId}`,customerId,issuerOrganizationId:'branch-distribution',holderOrganizationId:'orchard-msp',scopes:[...RESPONSIBILITY.SCOPES].sort(),acceptedAt:q.acceptedAt,effectiveAt:q.completedAt,expiresAt:q.completedAt+RESPONSIBILITY.QUALIFICATION_MINUTES,projectId:qId,postingId:qPosting};
   for(const sample of supportSamples)sample.participants[i].distributor={id:`provider-responsibility-distributor-${dId}`,role:'distributor',organisationId:'branch-distribution',customerId,scope:[...d.resources].sort(),projectId:dId,postingId:dPosting,acceptedAt:d.acceptedAt,effectiveAt:d.completedAt,expiresAt:certificate.expiresAt,qualificationId:certificate.id,qualificationProjectId:qId,qualificationPostingId:qPosting,qualification:structuredClone(certificate)};
  }
  state.clock=539;
 }
 return {state,hooks,customerIds,participants,supportSamples,roots};
}

test('costed support coverage binds a named local-language person and respects shared slots',()=>{
 const business=fixture(['au-sydney']),state=business.state;
 const plan=SUPPORT.operationPlan({customerId:'customer-1',market:'au-sydney',personId:'support-au-sydney-01',coverageId:'business-hours'});
 assert.deepEqual([plan.setupCents,plan.periodCents,plan.workMinutes,plan.support],[9000,8000,4,1]);
 const extended=SUPPORT.operationPlan({customerId:'customer-1',market:'au-sydney',personId:'support-au-sydney-01',coverageId:'extended'});
 assert.deepEqual([extended.setupCents,extended.periodCents,extended.workMinutes,extended.support],[18000,16000,6,1]);
 assert.throws(()=>SUPPORT.operationPlan({customerId:'customer-1',market:'jp-tokyo',personId:'support-au-sydney-01',coverageId:'extended'}),/PROVIDER_SUPPORT_PERSON_MARKET_MISMATCH/);
 const daytime=fixture(['au-sydney'],{coverageId:'business-hours'});assert.equal(SUPPORT.sample(daytime.state,'customer-1',1200,{...daytime.hooks,currentSample:undefined}).missing.includes('NAMED_SUPPORT_OUT_OF_SHIFT'),true,'business-hours coverage stops at 20:00 simulation time');
 state.providerCampaign.projects=[];state.business.ledger=[];state.business.workforce.support=0;
 assert.equal(SUPPORT.canOrder(state,{customerId:'customer-1',market:'au-sydney',personId:'support-au-sydney-01',coverageId:'extended'}).eligible,false);
 state.business.workforce.support=1;
 assert.equal(SUPPORT.canOrder(state,{customerId:'customer-1',market:'au-sydney',personId:'support-au-sydney-01',coverageId:'extended'}).eligible,true);
 assert.equal(SUPPORT.capacity(state,{personId:'support-au-sydney-01',customerId:'customer-1'}).ready,true);
 const first=projectFor('customer-1','au-sydney',1),second=projectFor('customer-2','au-sydney',2);state.providerCampaign.customers.push({id:'customer-2',portfolioId:'portfolio-customer-2',market:'au-sydney',scenario:'smb',status:'active',stages:{}});state.portfolio.customers.push({id:'portfolio-customer-2',market:'au-sydney',root:{tenant:'tenant-customer-2',providerCustomer:{id:'customer-2',version:1},resources:{}}});state.providerCampaign.projects.push(first.project,second.project);state.business.ledger.push({id:first.project.postingId,category:'cost',reason:'provider-operation',customerId:'customer-1',projectId:first.project.id,cents:first.plan.setupCents},{id:second.project.postingId,category:'cost',reason:'provider-operation',customerId:'customer-2',projectId:second.project.id,cents:second.plan.setupCents});
 const third={id:'customer-3',portfolioId:'portfolio-customer-3',market:'au-sydney',scenario:'smb',status:'active',stages:{}};state.providerCampaign.customers.push(third);state.portfolio.customers.push({id:third.portfolioId,market:'au-sydney',root:{tenant:'tenant-customer-3',providerCustomer:{id:third.id,version:1},resources:{}}});
 assert.equal(SUPPORT.capacity(state,{personId:'support-au-sydney-01',customerId:third.id}).ready,false,'the authored person can cover at most two customers');
 assert.equal(SUPPORT.validate(state),true,'two same-market customers can share one named support person');
 const thirdProject=projectFor(third.id,'au-sydney',3);state.providerCampaign.projects.push(thirdProject.project);state.business.ledger.push({id:thirdProject.project.postingId,category:'cost',reason:'provider-operation',customerId:third.id,projectId:thirdProject.project.id,cents:thirdProject.plan.setupCents});
 assert.throws(()=>SUPPORT.validate(state),/INVALID_PROVIDER_SUPPORT_SCOPE_CAPACITY/,'a third paid-looking receipt cannot exceed the roster scope cap');
});

test('c3 needs three distinct markets and every participant gets a paid named support sample and a real settlement',()=>{
 const {state,hooks,supportSamples}=fixture(['au-sydney','us-seattle','jp-tokyo']);
 const result=SUPPORT.evaluate(state,{...hooks,supportSamples,validateSupportSamples:validateSamples});
 assert.equal(result.levels[SUPPORT.GOALS.C3].status,'ready');
 assert.deepEqual(result.levels[SUPPORT.GOALS.C3].evidence.markets,['au-sydney','jp-tokyo','us-seattle']);
 assert.equal(SUPPORT.validateEvidence(state,SUPPORT.GOALS.C3,result.levels[SUPPORT.GOALS.C3].evidence,{...hooks,validateSupportSamples:validateSamples},{historical:true}),true);
 const pins=SUPPORT.retentionPins(result.levels[SUPPORT.GOALS.C3].evidence,'customer-1');assert.deepEqual(pins.jobIds,['job-customer-1']);assert.deepEqual(pins.interactionIds,['interaction-customer-1']);assert.deepEqual(pins.projectIds,['support-customer-1']);assert.ok(pins.postingIds.includes('entry-1'));
 const tampered=structuredClone(result.levels[SUPPORT.GOALS.C3].evidence);tampered.samples[25].participants[0].namedSupport.personId='support-jp-tokyo-01';
 assert.equal(SUPPORT.validateEvidence(state,SUPPORT.GOALS.C3,tampered,{...hooks,validateSupportSamples:validateSamples},{historical:true}),false);
 const lostBill=structuredClone(supportSamples);lostBill.forEach(x=>x.participants[0].settlements=[]);
 assert.equal(SUPPORT.evaluate(state,{...hooks,supportSamples:lostBill,validateSupportSamples:validateSamples}).levels[SUPPORT.GOALS.C3].status,'incomplete');
 const lostWork=structuredClone(supportSamples);lostWork.forEach(x=>x.participants[0].freshJobs=[]);
 assert.equal(SUPPORT.evaluate(state,{...hooks,supportSamples:lostWork,validateSupportSamples:validateSamples}).levels[SUPPORT.GOALS.C3].status,'incomplete');
});

test('c5 and level 7 require all five markets, current carrier and a live scoped distributor qualification',()=>{
 const {state,hooks,supportSamples}=fixture(ids,{withDistributor:true});
 assert.equal(SUPPORT.validateDistributorSnapshot(state,supportSamples[0].participants[0],480),true,JSON.stringify(supportSamples[0].participants[0].distributor));
 const result=SUPPORT.evaluate(state,{...hooks,supportSamples,validateSupportSamples:validateSamples});
 assert.equal(result.levels[SUPPORT.GOALS.C5].status,'ready',JSON.stringify(result.levels[SUPPORT.GOALS.C5]));
 assert.equal(result.levels[SUPPORT.GOALS.LEVEL7].status,'ready',JSON.stringify(result.levels[SUPPORT.GOALS.LEVEL7].missing));
 const bad=structuredClone(result.levels[SUPPORT.GOALS.LEVEL7].evidence);bad.samples[4].participants[3].distributor.qualification.scopes=['identity'];
 assert.equal(SUPPORT.validateEvidence(state,SUPPORT.GOALS.LEVEL7,bad,{...hooks,validateSupportSamples:validateSamples},{historical:true}),false);
 const expired=structuredClone(supportSamples);expired.forEach(x=>x.participants[4].distributor.expiresAt=x.at);
 assert.equal(SUPPORT.evaluate(state,{...hooks,supportSamples:expired,validateSupportSamples:validateSamples}).levels[SUPPORT.GOALS.LEVEL7].status,'incomplete');
});

test('t2 counts distinct customer-edge pairs and refuses duplicate aliases and stale compatibility',()=>{
 const {state,hooks,supportSamples}=fixture(['au-sydney','au-melbourne','us-seattle'],{withIntegrations:true});
 let result=SUPPORT.evaluate(state,{...hooks,supportSamples,validateSupportSamples:validateSamples});
 assert.equal(result.levels[SUPPORT.GOALS.T2].status,'ready');
 const noDistinct=structuredClone(supportSamples);noDistinct.forEach(x=>{x.participants[1].integrations=[];x.participants[2].integrations=[];});
 result=SUPPORT.evaluate(state,{...hooks,supportSamples:noDistinct,validateSupportSamples:validateSamples});assert.equal(result.levels[SUPPORT.GOALS.T2].status,'incomplete');
 const stale=structuredClone(supportSamples);stale[20].participants[0].integrations[0].sourceGeneration=2;
 result=SUPPORT.evaluate(state,{...hooks,supportSamples:stale,validateSupportSamples:validateSamples});assert.equal(result.levels[SUPPORT.GOALS.T2].status,'incomplete');
});

test('an earned support window validates after a later shared-team reduction, while current eligibility fails',()=>{
 const {state,hooks,supportSamples}=fixture(['au-sydney','us-seattle','jp-tokyo']);
 const result=SUPPORT.evaluate(state,{...hooks,supportSamples,validateSupportSamples:validateSamples}).levels[SUPPORT.GOALS.C3];
 assert.equal(result.status,'ready');
 state.business.workforce.support=1;
 assert.equal(SUPPORT.validateEvidence(state,SUPPORT.GOALS.C3,result.evidence,{...hooks,validateSupportSamples:validateSamples},{historical:true}),true);
 assert.equal(SUPPORT.evaluate(state,{...hooks,supportSamples,validateSupportSamples:validateSamples}).levels[SUPPORT.GOALS.C3].status,'incomplete');
});


test('pending paid coverage reserves named capacity and scope before commissioning',()=>{
 const {state}=fixture(['au-sydney','us-seattle']);state.providerCampaign.projects=[];state.business.ledger=[];state.business.workforce.support=1;
 const request={customerId:'customer-1',market:'au-sydney',personId:'support-au-sydney-01',coverageId:'extended'},plan=SUPPORT.operationPlan(request);
 const pending={id:'support-pending',customerId:request.customerId,kind:'operation',operationId:SUPPORT.OPERATION_ID,postingId:'entry-7',status:'running',acceptedAt:539,dueAt:545,...Object.fromEntries(['setupCents','periodCents','workMinutes','engineers','support'].map(k=>[k,plan[k]])),supportRequest:request};
 state.providerCampaign.projects.push(pending);state.business.ledger.push({id:'entry-7',category:'cost',reason:'provider-operation',customerId:request.customerId,projectId:pending.id,cents:plan.setupCents});
 assert.equal(SUPPORT.validate(state),true);
 const second={customerId:'customer-2',market:'us-seattle',personId:'support-us-seattle-01',coverageId:'extended'};
 assert.ok(SUPPORT.canOrder(state,second).missing.includes('NAMED_SUPPORT_EXCEEDS_PAID_SHARED_SUPPORT_SLOTS'));
 assert.ok(SUPPORT.canOrder(state,request).missing.includes('SUPPORT_COVERAGE_ALREADY_PENDING'));
 assert.equal(SUPPORT.sample(state,request.customerId,539,hooks).namedSupport,null,'reserved staff is not delivered coverage');
 const forged=structuredClone(state);delete forged.providerCampaign.projects[0].supportRequest;assert.throws(()=>SUPPORT.validate(forged),/INVALID_PROVIDER_SUPPORT_RESERVATION/);
 pending.status='cancelled';pending.operationReceipt=null;
 // A cancelled unsubmitted order retains its cost but releases its reservation.
 assert.equal(SUPPORT.validate(state),true);assert.equal(SUPPORT.canOrder(state,second).eligible,true);
});

test('t2 cannot combine different one-edge minutes or repair a configuration gap into a pass',()=>{
 const {state,hooks,supportSamples}=fixture(['au-sydney','au-melbourne','us-seattle'],{withIntegrations:true});
 const alternating=structuredClone(supportSamples);alternating.forEach((sample,index)=>sample.participants.forEach((p,i)=>{if(i!==(index%2))p.integrations=[];}));
 const result=SUPPORT.evaluate(state,{...hooks,supportSamples:alternating}).levels[SUPPORT.GOALS.T2];assert.equal(result.status,'incomplete');assert.ok(result.missing.some(x=>x.startsWith('TWO_DISTINCT_CURRENT_INTEGRATIONS_REQUIRED:')));
 const changed=structuredClone(supportSamples);changed[10].participants[0].resources[0].generation=2;
 assert.ok(SUPPORT.evaluate(state,{...hooks,supportSamples:changed}).levels[SUPPORT.GOALS.C3].missing.some(x=>x.startsWith('SUPPORT_CONFIGURATION_CHANGED:')));
});

test('malformed samples, missing lineage validation and future commissioned coverage fail closed',()=>{
 const {state,hooks,supportSamples}=fixture(['au-sydney','us-seattle','jp-tokyo']);
 for(const malformed of [[null],[{at:480,cohort:[],participants:[null]}]])assert.equal(SUPPORT.evaluate(state,{...hooks,supportSamples:malformed}).levels[SUPPORT.GOALS.C3].status,'incomplete');
 assert.equal(SUPPORT.evaluate(state,{...hooks,supportSamples,validateSupportSamples:()=>false}).levels[SUPPORT.GOALS.C3].status,'incomplete','support labels cannot replace central paid job/bill validation');
 state.providerCampaign.projects[0].completedAt=540;assert.equal(SUPPORT.sample(state,'customer-1',539,hooks).eligible,false);
 state.providerCampaign.projects[0].completedAt=400;assert.throws(()=>SUPPORT.validate(state),/INVALID_PROVIDER_SUPPORT_PROJECT/);
});

test('regional inspect is deterministic and historical proof survives later distinct paid coverage',()=>{
 const {state,hooks,supportSamples}=fixture(['au-sydney','us-seattle','jp-tokyo']);const before=JSON.stringify(state);
 const first=SUPPORT.inspectCustomer(state,'customer-1',hooks);assert.deepEqual(SUPPORT.inspectCustomer(state,'customer-1',hooks),first);assert.equal(JSON.stringify(state),before);assert.equal(first.person.name,'Ari Chen');assert.equal(first.offers.length,2);assert.equal(first.current.eligible,true);
 const proof=SUPPORT.evaluate(state,{...hooks,supportSamples}).levels[SUPPORT.GOALS.C3].evidence;
 const later=projectFor('customer-4','eu-dublin',4);Object.assign(later.project,{acceptedAt:540,dueAt:546,configSubmittedAt:546,completedAt:547});later.project.operationReceipt.installedAt=545;
 state.providerCampaign.customers.push({id:'customer-4',portfolioId:'portfolio-customer-4',market:'eu-dublin',scenario:'smb',status:'active'});state.portfolio.customers.push({id:'portfolio-customer-4',market:'eu-dublin',root:{providerCustomer:{id:'customer-4',version:1},tenant:'tenant-customer-4'}});state.providerCampaign.projects.push(later.project);state.business.ledger.push({id:later.project.postingId,category:'cost',reason:'provider-operation',customerId:'customer-4',projectId:later.project.id,cents:later.plan.setupCents});state.clock=548;state.business.workforce.support=4;
 assert.equal(SUPPORT.validateEvidence(state,SUPPORT.GOALS.C3,proof,hooks,{historical:true}),true,'future assignments do not rewrite earlier sampled scopes');
 const altered=structuredClone(proof);altered.samples[12].participants[0].namedSupport.paidSupportSlots=99;
 assert.equal(SUPPORT.validateEvidence(state,SUPPORT.GOALS.C3,altered,hooks,{historical:true}),false);
});

test('worker source preserves regional planning evaluation and rejection deterministically',()=>{
 const vm=require('node:vm'),{state,hooks,supportSamples}=fixture(['au-sydney','us-seattle','jp-tokyo']);
 const sandbox={SOC_PROVIDER_RESPONSIBILITY:RESPONSIBILITY,SOC_PROVIDER_PROGRESSION_FACTS:require('../src/game/23-provider-progression.js')};vm.runInNewContext(SUPPORT.source()+';globalThis.api=SOC_PROVIDER_REGIONAL_SUPPORT;',sandbox);
 const worker=sandbox.api;
 assert.deepEqual(JSON.parse(JSON.stringify(worker.evaluate(state,{...hooks,supportSamples}))),SUPPORT.evaluate(state,{...hooks,supportSamples}));
 const request={customerId:'customer-1',market:'au-sydney',personId:'support-jp-tokyo-01',coverageId:'extended'};
 assert.deepEqual(JSON.parse(JSON.stringify(worker.canOrder(state,request))),SUPPORT.canOrder(state,request));
});


test('paid extended replacement preserves historical coverage and old charges without allocating another person',()=>{
 const {state,hooks,supportSamples}=fixture(['au-sydney','us-seattle','jp-tokyo'],{coverageId:'business-hours'});
 const proof=SUPPORT.evaluate(state,{...hooks,supportSamples}).levels[SUPPORT.GOALS.C3].evidence;assert.ok(proof);
 state.clock=1200;
 const request={customerId:'customer-1',market:'au-sydney',personId:'support-au-sydney-01',coverageId:'extended'},q=SUPPORT.canOrder(state,request);assert.equal(q.eligible,true);assert.equal(q.supportReplacesProjectId,'support-customer-1');
 const p={id:'support-upgrade',customerId:request.customerId,kind:'operation',operationId:SUPPORT.OPERATION_ID,postingId:'entry-90',supportRequest:request,supportReplacesProjectId:q.supportReplacesProjectId,status:'running',acceptedAt:1200,dueAt:1206,...Object.fromEntries(['setupCents','periodCents','workMinutes','engineers','support'].map(k=>[k,q.plan[k]]))};
 state.providerCampaign.projects.push(p);state.business.ledger.push({id:p.postingId,category:'cost',reason:'provider-operation',customerId:p.customerId,projectId:p.id,cents:p.setupCents});
 assert.equal(SUPPORT.validate(state),true);assert.equal(SUPPORT.capacity(state).used,3);assert.ok(SUPPORT.sample(state,p.customerId,1200,hooks).missing.includes('NAMED_SUPPORT_OUT_OF_SHIFT'));
 Object.assign(p,{status:'complete',completedAt:1207,configSubmittedAt:1206,operationReceipt:{kind:SUPPORT.OPERATION_ID,version:1,projectId:p.id,postingId:p.postingId,customerId:p.customerId,installedAt:1205,supportAssignment:q.plan.supportAssignment}});state.clock=1207;
 assert.equal(SUPPORT.validate(state),true);assert.equal(SUPPORT.sample(state,p.customerId,1207,hooks).eligible,true);assert.equal(SUPPORT.capacity(state).used,3);
 assert.equal(state.providerCampaign.projects[0].periodCents,8000,'replacement does not erase old supplier commitment');assert.ok(state.business.ledger.some(x=>x.id==='entry-1'));
 assert.equal(SUPPORT.validateEvidence(state,SUPPORT.GOALS.C3,proof,hooks,{historical:true}),true);
 const bad=structuredClone(state);bad.providerCampaign.projects.at(-1).supportReplacesProjectId='support-customer-2';assert.throws(()=>SUPPORT.validate(bad),/INVALID_PROVIDER_SUPPORT_REPLACEMENT/);
 const early=structuredClone(state);early.providerCampaign.projects.at(-1).completedAt=1205;assert.throws(()=>SUPPORT.validate(early),/INVALID_PROVIDER_SUPPORT_PROJECT/);
});


test('implementation uses actual shared support time and cannot simultaneously claim named coverage',()=>{
 const {state,hooks}=fixture(['au-sydney']);assert.equal(SUPPORT.sample(state,'customer-1',539,hooks).eligible,true);
 state.providerCampaign.projects.push({id:'other-installation',kind:'operation',operationId:'recording',customerId:'customer-1',status:'running',acceptedAt:539,dueAt:544,support:1});
 assert.ok(SUPPORT.sample(state,'customer-1',539,hooks).missing.includes('NAMED_SUPPORT_BUSY_WITH_IMPLEMENTATION'));
 state.clock=544;state.providerCampaign.projects.at(-1).status='commissioning';assert.equal(SUPPORT.sample(state,'customer-1',544,hooks).eligible,true,'evidence wait after quoted work does not hold staff indefinitely');
});
