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
 return {plan,project:{id:projectId,postingId,customerId,kind:'operation',operationId:SUPPORT.OPERATION_ID,status:'complete',acceptedAt:399,configSubmittedAt:400,dueAt:410,completedAt:410,setupCents:plan.setupCents,periodCents:plan.periodCents,workMinutes:plan.workMinutes,engineers:plan.engineers,support:plan.support,operationReceipt:{kind:SUPPORT.OPERATION_ID,version:1,projectId,postingId,customerId,installedAt:399,supportAssignment:plan.supportAssignment}}};
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
