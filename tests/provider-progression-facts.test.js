const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const FACTS=require('../src/game/23-provider-progression.js');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility.js');
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
 assert.ok(report.facts.billedNonstarter.missing.some(x=>x.includes('non-starter customer')));
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
 assert.equal(contextReport.goals['progress.goal.bb'].status,'ready','a failed earlier voice job does not hide later valid delivered work');
 const noValidContext=structuredClone(state);for(const job of noValidContext.providerCampaign.jobs.filter(x=>['voice','message'].includes(x.channel)&&['completed','late'].includes(x.status)&&x.contextRetained))noValidContext.portfolio.customers[0].root.interactions.find(x=>x.id===job.interactionId).context=false;
 const invalidReport=FACTS.evaluate(noValidContext,hooks);assert.equal(invalidReport.goals['progress.goal.bb'].status,'incomplete');assert.ok(invalidReport.goals['progress.goal.bb'].missing.some(x=>x.includes('resolved autonomous')));
});

test('AC-PROVIDER-PROGRESSION-FACTS-005 sustainability requires a recent full settlement, positive consolidated result, and retained matching postings',()=>{
 const state=paidOpening(120),before=JSON.stringify(state),report=FACTS.evaluate(state,hooks),sustainable=report.facts.sustainable;
 assert.equal(sustainable.status,'ready');
 assert.equal(sustainable.evidence.interval.to-sustainable.evidence.interval.from,60);
 assert.ok(sustainable.evidence.globalOperatingResultCents>0);
 assert.ok(state.business.ledger.some(x=>x.id===sustainable.evidence.revenuePostingId&&x.reason==='provider-customer-period'));
 assert.ok(sustainable.evidence.costPostingIds.length>0);
 assert.equal(report.levels['progress.progression-level.1'].status,'ready','the first sustainable live customer does not require a second nonstarter customer');
 assert.equal(report.facts.supportResponsibility.status,'ready');
 assert.equal(report.facts.supportResponsibility.evidence.customerId,sustainable.evidence.customerId,'MSP responsibility must belong to the sustainable customer');
 assert.equal(report.levels['progress.progression-level.1'].evidence.supportResponsibility.record.customerId,sustainable.evidence.customerId);
 assert.equal(report.facts.billedNonstarter.status,'incomplete');assert.equal(report.goals['progress.goal.bz'].status,'incomplete','the separate business-contract goal still excludes the seeded starter customer');
 assert.equal(JSON.stringify(state),before,'current readiness inspection is pure');
 const missingPosting=structuredClone(state),proof=sustainable.evidence;
 missingPosting.business.ledger=missingPosting.business.ledger.filter(x=>x.id!==proof.revenuePostingId&&!proof.costPostingIds.includes(x.id));
 const missing=FACTS.evaluate(missingPosting,hooks);
 assert.equal(missing.facts.sustainable.status,'incomplete');
 assert.ok(missing.facts.sustainable.missing.some(x=>x.includes('no longer retained')));
});

test('current MSP responsibility is same-customer paid evidence and fails at zero support',()=>{
 const state=paidOpening(120),report=FACTS.evaluate(state,hooks),fact=report.facts.supportResponsibility,record=fact.evidence.record;
 assert.equal(fact.status,'ready');assert.equal(record.role,'msp');assert.equal(record.customerId,report.facts.sustainable.evidence.customerId);assert.equal(report.facts.firstLiveCustomer.evidence.customerId,record.customerId);
 assert.ok(record.evidence.stageProjects.length===3);assert.ok(record.evidence.sharedWorkforce.billedMinutes>0);assert.ok(state.business.ledger.some(x=>x.id===record.postingId&&x.reason==='provider-implementation'&&x.projectId===record.projectId&&x.customerId===record.customerId));
 const noSupport=SOC.dispatch(state,{type:'provider',command:{action:'staff',engineers:state.business.workforce.engineers,support:0}}),refused=FACTS.evaluate(noSupport,hooks);
 assert.equal(noSupport.business.workforce.support,0);assert.equal(refused.facts.supportResponsibility.status,'incomplete');assert.ok(refused.facts.supportResponsibility.missing.some(x=>x.includes('current MSP responsibility')));assert.equal(refused.levels['progress.progression-level.1'].status,'incomplete');
});

test('legacy responsibility version is unavailable and worker facts match host evaluation',()=>{
 const state=paidOpening(120),legacy=structuredClone(state);delete legacy.providerCampaign.commercialResponsibilityVersion;legacy.providerCampaign.contentVersion='provider-campaigns-2';
 const legacyReport=FACTS.evaluate(legacy,hooks);assert.equal(RESPONSIBILITY.responsibilities(legacy,'starter-customer',hooks).status,'unavailable');assert.equal(legacyReport.facts.supportResponsibility.status,'incomplete');assert.equal(legacyReport.levels['progress.progression-level.1'].status,'incomplete');
 const context={input:state,helpers:hooks};vm.createContext(context);vm.runInContext(RESPONSIBILITY.source()+FACTS.source(),context);
 const worker=vm.runInContext('SOC_PROVIDER_PROGRESSION_FACTS.evaluate(input,helpers)',context);
 assert.deepEqual(JSON.parse(JSON.stringify(worker)),FACTS.evaluate(state,hooks),'worker and main facts derive the same current support proof');
});

function syntheticSupportSample(at,options={}){
 const cohort=options.cohort||['customer-a','customer-b'];
 const participants=cohort.map((customerId,index)=>({customerId,portfolioId:`portfolio-${customerId}`,tenant:`tenant-${customerId}`,market:index===0?'au-sydney':'au-melbourne',scenario:'smb',configuration:`configuration-${customerId}`,eligible:options.ineligibleAt===at&&options.ineligibleCustomer===customerId?false:true,missing:options.ineligibleAt===at&&options.ineligibleCustomer===customerId?['resource outage']:[],resources:[{id:'identity',generation:1}],boundaries:[{id:`boundary-${customerId}`,generation:1,profile:'AU',resources:['identity']}],responsibility:{id:`msp-${customerId}`,customerId,role:'msp',organisationId:'orchard-msp',projectId:`stage-${customerId}`,postingId:`entry-${index+1}`,effectiveAt:0,expiresAt:null,scope:['identity'],setupCents:100,periodCents:20,engineers:1,support:1,sharedWorkforce:{engineers:1,support:1,personMinutes:10,billedMinutes:10}},freshJobs:options.jobAt===at?[{jobId:`job-${customerId}`,interactionId:`interaction-${customerId}`,caseId:`case-${customerId}`,channel:'voice',startedAt:at-2,finishedAt:at,person:`person-${customerId}`,assignmentId:`assignment-${customerId}`}]:[],settlements:options.settlementAt===at?[{period:1,from:0,to:60,settledAt:at,qualified:true,operatingResultCents:20,revenuePostingId:`revenue-${customerId}`,costPostingIds:[`cost-${customerId}`]}]:[]}));
 return {version:FACTS.VERSION,contentVersion:FACTS.CONTENT,at,cohort:[...cohort],participants};
}
function syntheticSupportWindow(options={}){return Array.from({length:60},(_,i)=>syntheticSupportSample(i+1,{...options,...(i===29?{jobAt:30}:{}),...(i===59?{settlementAt:60}:{})}));}

test('AC-PROVIDER-PROGRESSION-FACTS-006 support qualification needs 60 consecutive eligible samples, paid MSP, boundaries, human work and central settlement',()=>{
 const samples=syntheticSupportWindow(),result=FACTS.qualifySupportWindow(samples);
 assert.equal(result.status,'ready');assert.deepEqual(result.evidence.interval,{from:0,to:60});assert.equal(result.evidence.minutes,60);assert.equal(result.evidence.customerIds.length,2);assert.equal(result.evidence.humanJobIds.length,2);assert.equal(result.evidence.settlements.length,2);
 const gap=samples.filter((_,i)=>i!==20);assert.equal(FACTS.qualifySupportWindow(gap).status,'incomplete','a missing minute cannot be skipped');
 const outage=syntheticSupportWindow({ineligibleAt:31,ineligibleCustomer:'customer-a'});assert.equal(FACTS.qualifySupportWindow(outage).status,'incomplete','an ineligible minute breaks continuous support');
 const noHuman=syntheticSupportWindow();noHuman[29].participants.forEach(p=>{p.freshJobs=[];});assert.ok(FACTS.qualifySupportWindow(noHuman).missing.some(x=>x.includes('fresh resolved human case')));
 const noSettlement=syntheticSupportWindow();noSettlement[59].participants.forEach(p=>{p.settlements=[];});assert.ok(FACTS.qualifySupportWindow(noSettlement).missing.some(x=>x.includes('central settlement')));
 const lossPeriod=syntheticSupportWindow();lossPeriod[59].participants.forEach(p=>p.settlements[0].operatingResultCents=-5);assert.equal(FACTS.qualifySupportWindow(lossPeriod).status,'ready','a loss settlement is still a real settlement; operating profit is a separate progression predicate');
 const noMsp=syntheticSupportWindow();noMsp[15].participants[0].responsibility=null;assert.ok(FACTS.qualifySupportWindow(noMsp).missing.some(x=>x.includes('paid MSP support')));
 const noBoundary=syntheticSupportWindow();noBoundary[16].participants[1].boundaries=[];assert.ok(FACTS.qualifySupportWindow(noBoundary).missing.some(x=>x.includes('supported boundary')));
 const changedConfig=syntheticSupportWindow();changedConfig[17].participants[0].configuration='new-generation';assert.ok(FACTS.qualifySupportWindow(changedConfig).missing.some(x=>x.includes('changed service configuration')));
});

test('sampled support remains absent from legacy facts and sampler reports current boundary/support gaps',()=>{
 const legacy=paidOpening(120),before=JSON.stringify(legacy),report=FACTS.evaluate(legacy,hooks);
 assert.equal(report.facts.twoSupportedCustomers.status,'incomplete');assert.equal(FACTS.qualifySupportWindow([]).status,'incomplete');
 const sample=FACTS.sampleSupport(legacy,hooks);assert.equal(sample.at,legacy.clock);assert.deepEqual(sample.cohort,['starter-customer']);assert.equal(sample.participants.length,1);assert.equal(sample.participants[0].tenant,legacy.portfolio.customers[0].root.tenant);assert.equal(sample.participants[0].eligible,false);assert.ok(sample.participants[0].missing.some(x=>x.includes('supported boundary')));assert.ok(sample.participants[0].responsibility);assert.equal(FACTS.validateSupportSamples(legacy,[sample],hooks),true);assert.deepEqual(FACTS.sampleSupport(legacy,hooks),sample);assert.equal(JSON.stringify(legacy),before,'sampling is pure');
 const withoutSampling=FACTS.evaluate(legacy,{...hooks,supportSamples:[]});assert.equal(withoutSampling.levels['progress.progression-level.2'].status,'incomplete','old saves never gain historical sampled support');
});
