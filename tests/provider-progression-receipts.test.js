const test=require('node:test');
const {assert,vm,SOC,FACTS,RECEIPTS,RESPONSIBILITY,UC_CC,SUPPORT_WORK,hooks,buy,claimDispatched,minute,UC_CC_CUSTOMER,UC_CC_SOURCE,UC_CC_TARGET,UC_CC_SOURCE_OPERATION,UC_CC_TARGET_OPERATION,UC_CC_EDGE,ccProject,ccChild,ccAdvance,ccUntil,ccOperation,ccOperationWhenReady,ccFundedProducts,ccFullWork,ccTest,ccCompleteWithPaidReview,ccInstallUcCc,ccInstallUcCcWithTargetSupport,ccInstallUcCcWithSupport,ccDeliverRoom,rehash,paidOpening,paidNonstarter,regionalSupportReady}=require('./provider-progression-receipts.helpers.js');

test('legacy saves without receipt state remain valid; unknown receipt versions and identities reject',()=>{
 const legacy=SOC.create({experience:'campaign'});assert.equal(RECEIPTS.validate(legacy),true);assert.equal(RECEIPTS.inspect(legacy,hooks).receipts.length,0);
 const wrongVersion=structuredClone(legacy);wrongVersion.providerCampaign.progressionReceipts={pack:RECEIPTS.PACK,version:2,contentVersion:RECEIPTS.CONTENT,receipts:[]};assert.throws(()=>RECEIPTS.validate(wrongVersion),/INVALID_PROVIDER_PROGRESSION_RECEIPTS/);
 assert.throws(()=>RECEIPTS.eligibility(legacy,'progress.progression-level.999',hooks),/UNKNOWN_PROVIDER_PROGRESSION_SOURCE/);
});

test('real dispatched UC/CC evidence earns IX, refuses early retest, then permits and funds a scoped managed retest',()=>{
 let s=ccFundedProducts(),before=s.business.balance.cash;
 s=ccOperation(s,'uc-cc-integration');let firstProject=ccProject(s,'uc-cc-integration');assert.equal(firstProject.setupCents,40000);s=ccUntil(s,x=>ccProject(x,'uc-cc-integration').status==='commissioning');s=ccCompleteWithPaidReview(s,firstProject.id);
 const ready=SOC.provider.inspect(s).progression;assert.equal(ready.goals[RECEIPTS.IX].status,'ready');assert.equal(ready.levels[RECEIPTS.LEVEL_THREE].status,'incomplete','same-customer resolved call alone does not prove a real paid room meeting');assert.ok(ready.levels[RECEIPTS.LEVEL_THREE].missing.some(x=>x.toLowerCase().includes('meeting')));
 const blocked=SOC.provider.quote(s,{action:'operation',operationId:'managed-uc-cc-retest',customerId:UC_CC_CUSTOMER});assert.ok(blocked.blockers.includes('EARNED_UC_CC_INTEGRATION_REQUIRED'));
 const cash=s.business.balance.cash,claimCommand={type:'provider',command:{action:'claim-progression',sourceId:RECEIPTS.IX,quoteRevision:s.revision}},expected=SOC.dispatch(structuredClone(s),claimCommand),workerContext={postMessage:value=>{workerContext.reply=value;}};vm.createContext(workerContext);vm.runInContext(SOC.workerSource(),workerContext);workerContext.onmessage({data:{id:'provider-uc-cc-progression-claim',state:JSON.parse(JSON.stringify(s)),command:claimCommand}});assert.equal(workerContext.reply.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(workerContext.reply.state)),expected,'worker and synchronous dispatch issue the same receipt');s=expected;const receipt=s.providerCampaign.progressionReceipts.receipts.find(x=>x.sourceId===RECEIPTS.IX);assert.equal(receipt.customerIds[0],UC_CC_CUSTOMER);assert.ok(receipt.sourceEvidence.task.job.id);assert.equal(s.business.balance.cash,cash,'claiming does not create cash');assert.equal(RECEIPTS.validate(s,hooks),true);assert.equal(s.providerCampaign.progressionReceipts.receipts.length,1);
 const noRetest=SOC.provider.quote(s,{action:'operation',operationId:'managed-uc-cc-retest',customerId:UC_CC_CUSTOMER});assert.ok(noRetest.blockers.some(x=>x.includes('integration-retest-not-required')));
 s=buy(s,{action:'retire-project',projectId:ccProject(s,UC_CC_SOURCE_OPERATION).id});s=ccAdvance(s);s=ccOperation(s,UC_CC_SOURCE_OPERATION);s=ccUntil(s,x=>ccProject(x,UC_CC_SOURCE_OPERATION).status==='complete');
 const direct=SOC.provider.quote(s,{action:'operation',operationId:'uc-cc-retest',customerId:UC_CC_CUSTOMER}),managed=SOC.provider.quote(s,{action:'operation',operationId:'managed-uc-cc-retest',customerId:UC_CC_CUSTOMER});assert.deepEqual(managed.blockers,[],JSON.stringify(managed.blockers));assert.equal(direct.setupCents,9000);assert.equal(managed.setupCents,4000);assert.equal(managed.periodCents,0);assert.equal(managed.workMinutes,6);assert.equal(managed.engineers,0);assert.equal(managed.support,1);
 const proposal=RECEIPTS.unlockProposal(s,RECEIPTS.IX,{...hooks,providerQuote:(state,request)=>SOC.provider.quote(state,request)});assert.equal(proposal.status,'available');assert.deepEqual(proposal.offers.map(x=>x.operationId),['uc-cc-retest','managed-uc-cc-retest']);assert.deepEqual(proposal.offers.map(x=>x.quote.setupCents),[9000,4000]);assert.deepEqual(proposal.offers.map(x=>x.quote.workMinutes),[3,6]);assert.deepEqual(proposal.offers.map(x=>x.quote.engineers),[1,0]);
 const beforeManaged=s.business.balance.cash;s=buy(s,{action:'operation',operationId:'managed-uc-cc-retest',customerId:UC_CC_CUSTOMER});assert.equal(beforeManaged-s.business.balance.cash,4000);const retest=ccProject(s,'managed-uc-cc-retest');s=ccUntil(s,x=>ccProject(x,'managed-uc-cc-retest').status==='commissioning');s=ccCompleteWithPaidReview(s,retest.id,'managed-uc-cc-retest');assert.equal(ccProject(s,'managed-uc-cc-retest').status,'complete');assert.equal(s.business.balance.cash<beforeManaged,true);assert.equal(RECEIPTS.validate(s,hooks),true,'the first earned proof remains valid after edge rebase and a paid managed retest');
 const forged=structuredClone(s),earned=forged.providerCampaign.progressionReceipts.receipts.find(x=>x.sourceId===RECEIPTS.IX);earned.sourceEvidence.task.recording.captureScope='partial';rehash(earned);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_PROGRESSION_RECEIPT/,'a recomputed digest cannot replace the retained operation proof');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const repeat=claimDispatched(s,RECEIPTS.IX);assert.equal(repeat.providerCampaign.progressionReceipts.receipts.length,1,'repeated claim stays once-only');assert.ok(before>s.business.balance.cash,'the actual initial and managed retest purchases were funded through quotes');
});

test('first-live claim requires evaluator lineage, records compact tenant and generation proof, and is atomic/idempotent',()=>{
 const s=paidOpening(),before=JSON.stringify(s),eligibility=RECEIPTS.eligibility(s,'progress.goal.bb',hooks);
 assert.equal(eligibility.status,'ready');assert.equal(eligibility.name,'First customer live');
 const issued=RECEIPTS.claim(s,'progress.goal.bb',hooks);assert.equal(issued.idempotent,false);assert.equal(JSON.stringify(s),before,'claiming returns a copied state');
 assert.equal(issued.receipt.sourceId,'progress.goal.bb');assert.deepEqual(issued.receipt.customerIds,['starter-customer']);assert.equal(issued.receipt.projectIds.length,3);assert.equal(issued.receipt.jobIds.length,2);assert.equal(issued.receipt.interactionIds.length,2);assert.equal(issued.receipt.caseIds.length,2);assert.ok(issued.receipt.postingIds.length>=3);assert.ok(issued.receipt.resourceGenerations.length>0);
 assert.ok(issued.receipt.evidenceInterval.from>=0);assert.ok(issued.receipt.evidenceInterval.to>issued.receipt.evidenceInterval.from);assert.equal(issued.receipt.unlock,null);assert.equal(RECEIPTS.validate(issued.state,hooks),true);
 const again=RECEIPTS.claim(issued.state,'progress.goal.bb',hooks);assert.equal(again.idempotent,true);assert.deepEqual(again.receipt,issued.receipt);assert.deepEqual(again.state,issued.state);assert.equal(again.state.providerCampaign.progressionReceipts.receipts.length,1);
});

test('sustainable claim requires the prior same-customer first-live receipt and exposes an actual costed carrier alternative',()=>{
 const s=paidOpening(120),facts=FACTS.evaluate(s,hooks);assert.equal(facts.levels['progress.progression-level.1'].status,'ready');assert.equal(facts.levels['progress.progression-level.1'].evidence.sustainable.customerId,'starter-customer');
 assert.throws(()=>RECEIPTS.claim(s,RECEIPTS.SUSTAINABLE,hooks),/First customer live receipt must be earned first/);
 const first=RECEIPTS.claim(s,RECEIPTS.FIRST_LIVE,hooks),earned=RECEIPTS.claim(first.state,RECEIPTS.SUSTAINABLE,hooks);
 assert.equal(earned.idempotent,false);assert.deepEqual(earned.receipt.customerIds,['starter-customer']);assert.equal(earned.receipt.unlock.id,'provider-managed-carrier-headroom-v1');assert.equal(earned.receipt.unlock.operationId,'managed-carrier-headroom');assert.equal(earned.receipt.unlock.customerId,'starter-customer');
 assert.ok(earned.receipt.settlementPeriods.includes(1));assert.ok(earned.receipt.projectIds.length>=3);assert.ok(earned.receipt.postingIds.some(id=>s.business.ledger.some(row=>row.id===id&&row.reason==='provider-customer-period')));
 const before=JSON.stringify(earned.state),proposal=RECEIPTS.unlockProposal(earned.state,RECEIPTS.SUSTAINABLE,{...hooks,providerQuote:(state,request)=>SOC.provider.quote(state,request)});
 assert.equal(proposal.status,'available');assert.deepEqual(proposal.request,{action:'operation',operationId:'managed-carrier-headroom',customerId:'starter-customer'});assert.equal(proposal.quote.setupCents,8000);assert.equal(proposal.quote.periodCents,6000);assert.equal(proposal.quote.workMinutes,6);assert.equal(proposal.quote.engineers,0);assert.equal(proposal.quote.support,1);assert.deepEqual(proposal.quote.blockers,[]);assert.equal(JSON.stringify(earned.state),before,'unlock quote preview is pure');
 assert.equal(RECEIPTS.validate(earned.state,hooks),true);
});

test('managed-business claim binds a qualified nonstarter settlement, accepted paid stages, current human work and same-customer MSP payroll',()=>{
 const early=paidNonstarter(250),blocked=RECEIPTS.eligibility(early,RECEIPTS.NONSTARTER,hooks);
 assert.equal(blocked.status,'incomplete');assert.ok(blocked.missing.some(x=>x.includes('settlement')));
 assert.throws(()=>RECEIPTS.claim(early,RECEIPTS.NONSTARTER,hooks),/PROVIDER_PROGRESSION_EVIDENCE_REQUIRED/);
 const s=paidNonstarter(),facts=FACTS.evaluate(s,hooks),row=facts.goals[RECEIPTS.NONSTARTER];assert.equal(row.status,'ready');assert.equal(row.evidence.customerId,'next-1-customer');assert.equal(row.evidence.supportResponsibility.customerId,row.evidence.customerId);
 const cash=s.business.balance.cash,before=JSON.stringify(s),earned=RECEIPTS.claim(s,RECEIPTS.NONSTARTER,hooks);assert.equal(JSON.stringify(s),before);assert.equal(earned.state.business.balance.cash,cash);assert.equal(earned.receipt.sourceId,RECEIPTS.NONSTARTER);assert.deepEqual(earned.receipt.customerIds,['next-1-customer']);assert.equal(earned.receipt.projectIds.length,3);assert.deepEqual(earned.receipt.settlementPeriods,[facts.goals[RECEIPTS.NONSTARTER].evidence.settlementPeriod]);assert.equal(earned.receipt.settlementProof.qualified,true);assert.equal(earned.receipt.settlementProof.to,360);assert.ok(earned.receipt.workProofs.every(x=>x.customerId==='next-1-customer'));
 assert.equal(earned.receipt.unlock.operationId,'integrator-room');assert.equal(earned.receipt.unlock.customerId,'next-1-customer');assert.equal(earned.receipt.unlock.quoteRequired,true);assert.equal(earned.receipt.unlock.quoteSource,'SOC.provider.quote');assert.equal(RECEIPTS.validate(earned.state,hooks),true);
 const again=RECEIPTS.claim(earned.state,RECEIPTS.NONSTARTER,hooks);assert.equal(again.idempotent,true);assert.deepEqual(again.receipt,earned.receipt);
 const proposal=RECEIPTS.unlockProposal(earned.state,RECEIPTS.NONSTARTER,{...hooks,providerQuote:(state,request)=>SOC.provider.quote(state,request)});assert.equal(proposal.unlock.operationId,'integrator-room');assert.deepEqual(proposal.request,{action:'operation',operationId:'integrator-room',customerId:'next-1-customer'});assert.equal(proposal.quoteSource,'SOC.provider.quote');assert.ok(['available','blocked','unavailable'].includes(proposal.status),'quotes are only accepted from the real engine hook; the parent operation may still be pending');
});

test('managed-business proof rejects rehashed settlement, customer-work and responsibility forgeries and survives later support loss and pruning',()=>{
 const earned=RECEIPTS.claim(paidNonstarter(),RECEIPTS.NONSTARTER,hooks).state;
 const cases=[
  s=>{const r=s.providerCampaign.progressionReceipts.receipts[0];r.sourceEvidence.business.settlement.qualified=false;r.settlementProof.qualified=false;},
  s=>{const r=s.providerCampaign.progressionReceipts.receipts[0];r.sourceEvidence.business.settlement.grossRetailCents+=1;r.settlementProof.grossRetailCents+=1;},
  s=>{const r=s.providerCampaign.progressionReceipts.receipts[0];r.sourceEvidence.business.jobs[0].channel='message';},
  s=>{const r=s.providerCampaign.progressionReceipts.receipts[0];r.sourceEvidence.business.supportResponsibility.organisationId='unrelated';},
  s=>{const r=s.providerCampaign.progressionReceipts.receipts[0];r.sourceEvidence.business.customerId='starter-customer';}
 ];
 for(const change of cases){const forged=structuredClone(earned);change(forged);rehash(forged.providerCampaign.progressionReceipts.receipts[0]);assert.throws(()=>RECEIPTS.validate(forged,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);}
 const supported=SOC.dispatch(earned,{type:'provider',command:{action:'staff',engineers:earned.business.workforce.engineers,support:0}});assert.equal(RECEIPTS.validate(supported,hooks),true,'later support loss does not erase a valid historical claim');
 const pruned=SOC.dispatch(earned,{type:'advance',minutes:85});assert.ok(pruned.providerCampaign.jobCheckpoint.pruned>0);assert.equal(RECEIPTS.validate(pruned,hooks),true,'compact referenced proof remains valid after routine work pruning');
});

test('managed-business receipt funds an integrated room and the campaign delivers its scheduled meeting',()=>{
 let s=claimDispatched(paidNonstarter(),RECEIPTS.NONSTARTER),customerId='next-1-customer';
 const row=s.providerCampaign.customers.find(x=>x.id===customerId);if(row.status==='renewal')s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId}});
 const proposal=RECEIPTS.unlockProposal(s,RECEIPTS.NONSTARTER,{...hooks,providerQuote:(state,request)=>SOC.provider.quote(state,request)});assert.equal(proposal.status,'available',JSON.stringify(proposal.missing));
 assert.equal(proposal.quote.setupCents,65000);assert.equal(proposal.quote.periodCents,10000);assert.equal(proposal.quote.workMinutes,8);assert.equal(proposal.quote.engineers,1);assert.equal(proposal.quote.support,1);
 s=buy(s,proposal.request);while(!s.providerCampaign.projects.some(p=>p.customerId===customerId&&p.operationId==='integrator-room'&&p.status==='complete'))s=minute(s);
 const project=s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId==='integrator-room');assert.equal(project.setupCents,65000);assert.equal(project.periodCents,10000);
 const advanceAndRecover=state=>{
  for(const incident of state.providerCampaign.incidents.filter(x=>x.status==='active'))state=SOC.dispatch(state,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
  for(const incident of state.providerCampaign.incidents.filter(x=>x.status==='acknowledged')){
   const pending=state.providerCampaign.projects.some(p=>p.customerId===incident.customerId&&['repair','service-repair'].includes(p.operationId)&&p.status!=='cancelled'&&p.acceptedAt>=incident.acknowledgedAt);if(pending)continue;
   const operationId=incident.resource==='service'?'service-repair':'repair',quote=SOC.provider.quote(state,{action:'operation',operationId,customerId:incident.customerId});if(!quote.blockers.length)state=SOC.dispatch(state,{type:'provider',command:{action:'operation',operationId,customerId:incident.customerId,quoteRevision:quote.atRevision}});
  }
  for(const c of state.providerCampaign.customers.filter(x=>x.status==='renewal'))state=SOC.dispatch(state,{type:'provider',command:{action:'renew',customerId:c.id}});
  return minute(state);
 };
 for(let i=0;i<36&&!s.portfolio.customers.find(x=>x.id===customerId).root.information.meetingSessions.some(m=>m.status==='completed'&&m.startedAt>=project.completedAt);i++)s=advanceAndRecover(s);
 const child=s.portfolio.customers.find(x=>x.id===customerId).root,meeting=child.information.meetingSessions.find(m=>m.status==='completed'&&m.startedAt>=project.completedAt);assert.ok(meeting,'funded room demand must book and deliver a real meeting');
 const records=RESPONSIBILITY.responsibilities(s,customerId,{...hooks,customerRoot:(state,id)=>state.portfolio.customers.find(x=>x.id===id)?.root||null,observeResource:(root,id)=>SOC.observe(root,id)}).records;
 const integrated=records.find(x=>x.role==='integrator'&&x.organisationId==='twig-integrations'&&x.projectId===project.id);assert.ok(integrated);assert.ok(integrated.evidence.meetingIds.includes(meeting.id));assert.equal(integrated.evidence.resourceGeneration,child.resources.room.generation);
 assert.equal(RECEIPTS.validate(s,hooks),true,'earned compact business proof remains valid through the room purchase and meeting delivery');
});

test('Level 2 claim snapshots a common eligible 60-minute support cohort and unlocks the quoted paid regional policy',()=>{
 const s=regionalSupportReady(),rawSamples=FACTS.decodeSupportObservation(s.providerCampaign.supportObservation),facts=FACTS.evaluate(s,{...hooks,supportSamples:rawSamples});assert.equal(facts.levels[RECEIPTS.LEVEL_TWO].status,'ready');
 const first=claimDispatched(s,RECEIPTS.FIRST_LIVE),local=claimDispatched(first,RECEIPTS.SUSTAINABLE);assert.ok(local.providerCampaign.progressionReceipts.receipts[1].customerIds[0]);
 const eligibility=RECEIPTS.eligibility(local,RECEIPTS.LEVEL_TWO,hooks);assert.equal(eligibility.status,'ready');assert.equal(eligibility.evidence.minutes,60);assert.deepEqual(eligibility.evidence.customerIds,['next-1-customer','starter-customer']);assert.deepEqual(eligibility.evidence.markets,['au-melbourne','au-sydney']);
 const before=local.business.balance.cash,earned=claimDispatched(local,RECEIPTS.LEVEL_TWO),earnedReceipt=earned.providerCampaign.progressionReceipts.receipts.find(x=>x.sourceId===RECEIPTS.LEVEL_TWO);assert.equal(earned.business.balance.cash,before);assert.equal(earnedReceipt.customerIds.length,2);assert.equal(earnedReceipt.workProofs.length,earnedReceipt.jobIds.length);assert.equal(earnedReceipt.unlock.operationId,'regional-provisioning');assert.deepEqual(earnedReceipt.unlock.allowedMarkets,['au-melbourne','au-sydney']);assert.equal(RECEIPTS.validate(earned,hooks),true);
 const proposal=RECEIPTS.unlockProposal(earned,RECEIPTS.LEVEL_TWO,{...hooks,providerQuote:(state,request)=>SOC.provider.quote(state,request)});assert.equal(proposal.status,'available',JSON.stringify(proposal.missing));assert.deepEqual(proposal.request,{action:'operation',operationId:'regional-provisioning',customerId:'next-1-customer'});assert.equal(proposal.quote.setupCents,15000);assert.equal(proposal.quote.periodCents,8000);assert.equal(proposal.quote.workMinutes,4);assert.equal(proposal.quote.engineers,0);assert.equal(proposal.quote.support,1);
 assert.equal(RECEIPTS.unlockProposal(earned,RECEIPTS.LEVEL_TWO,{...hooks,customerId:'outside-customer',providerQuote:(state,request)=>SOC.provider.quote(state,request)}).status,'blocked');
 let paid=buy(earned,proposal.request);while(!paid.providerCampaign.projects.some(p=>p.operationId==='regional-provisioning'&&p.status==='complete'))paid=minute(paid);
 const project=paid.providerCampaign.projects.findLast(p=>p.operationId==='regional-provisioning'),policy=paid.providerAutomation.find(x=>x.projectId===project.id);assert.ok(policy);assert.equal(project.setupCents,15000);assert.equal(project.periodCents,8000);assert.equal(project.workMinutes,4);
 const ids=[...earnedReceipt.customerIds],config={version:2,enabled:true,suspended:false,cashFloorCents:10000,lifetimeBudgetCents:50000,budgetSpentCents:0,maxActions:3,actionsUsed:0,engineerCeiling:0,supportCeiling:1,customerIds:ids,rules:[{id:'provision-carrier',kind:'provisioning',enabled:true,customerIds:ids,operationId:null,stage:'carrier',resourceId:null,thresholdPercent:null}]};
 paid=SOC.dispatch(paid,{type:'provider',command:{action:'configure-policy',customerId:project.customerId,config}});assert.equal(paid.providerAutomation.find(x=>x.projectId===project.id).status,'active');assert.deepEqual(paid.providerAutomation.find(x=>x.projectId===project.id).config.customerIds,ids);assert.equal(RECEIPTS.validate(paid,hooks),true);
});

test('Level 2 evidence rejects rehashed cohort and support-sample substitutions and remains historical after the window moves',()=>{
 const s=regionalSupportReady(),first=RECEIPTS.claim(s,RECEIPTS.FIRST_LIVE,hooks),local=RECEIPTS.claim(first.state,RECEIPTS.SUSTAINABLE,hooks),earned=claimDispatched(local.state,RECEIPTS.LEVEL_TWO);assert.equal(first.receipt.sourceEvidence.agreementAt,s.providerCampaign.customers.find(c=>c.id==='starter-customer').customerAcceptedAt,'first-live proof uses the durable accepted retail agreement start rather than the replaceable latest renewal');assert.equal(RECEIPTS.validate(earned,hooks),true,'the untouched dispatched claim validates before any forgery');
 for(const mutate of [r=>{r.sourceEvidence.markets=['au-sydney'];},r=>{const samples=FACTS.decodeSupportObservation(r.sourceEvidence.supportSamples);samples[12].participants[0].eligible=false;r.sourceEvidence.supportSamples=FACTS.encodeSupportObservation(samples);},r=>{r.sourceEvidence.supportSamples.samples[13].participants[0].customerId='starter-customer';},r=>{r.sourceEvidence.supportSamples.version=9;},r=>{r.sourceEvidence.supportSamples.samples[0].participants[0].configurationIndex=999;}]){const forged=structuredClone(earned),receipt=forged.providerCampaign.progressionReceipts.receipts.find(x=>x.sourceId===RECEIPTS.LEVEL_TWO);mutate(receipt);rehash(receipt);assert.throws(()=>RECEIPTS.validate(forged,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);}
 const legacyReceipt=structuredClone(earned),legacyRow=legacyReceipt.providerCampaign.progressionReceipts.receipts.find(x=>x.sourceId===RECEIPTS.LEVEL_TWO);legacyRow.sourceEvidence.supportSamples=FACTS.decodeSupportObservation(legacyRow.sourceEvidence.supportSamples);rehash(legacyRow);assert.equal(RECEIPTS.validate(legacyReceipt,hooks),true,'legacy Level 2 receipts with raw supportSamples remain valid');
 const moved=SOC.dispatch(earned,{type:'advance',minutes:85});assert.ok(earned.providerCampaign.progressionReceipts.receipts.find(x=>x.sourceId===RECEIPTS.LEVEL_TWO).jobIds.some(id=>!moved.providerCampaign.jobs.some(job=>job.id===id)),'ordinary campaign retention prunes sampled jobs after the earned claim');assert.equal(RECEIPTS.validate(moved,hooks),true);assert.equal(RECEIPTS.eligibility(moved,RECEIPTS.LEVEL_TWO,hooks).status,'earned');
});

test('blocked canonical facts stay claim-blocked with their measured missing evidence',()=>{
 const s=paidOpening(),other='progress.progression-level.4',state=structuredClone(s),report=RECEIPTS.eligibility(state,other,hooks);
 assert.equal(report.status,'incomplete');assert.ok(report.missing.includes('PAID_PROVIDER_OWNED_SITE_OPERATIONS_REQUIRED'));
 assert.throws(()=>RECEIPTS.claim(state,other,hooks),/PROVIDER_PROGRESSION_EVIDENCE_REQUIRED/);assert.equal(state.providerCampaign.progressionReceipts,undefined);
 const training=SOC.create();assert.throws(()=>RECEIPTS.eligibility(training,'progress.goal.bb',hooks),/PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED/);
});

test('receipt restore validation rejects rehashed forged work, source, tenant and settlement evidence while retaining proof after service loss',()=>{
 const state=RECEIPTS.claim(paidOpening(),'progress.goal.bb',hooks).state;
 const duplicate=structuredClone(state);duplicate.providerCampaign.progressionReceipts.receipts.push(structuredClone(duplicate.providerCampaign.progressionReceipts.receipts[0]));assert.throws(()=>RECEIPTS.validate(duplicate,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 const altered=structuredClone(state),alteredReceipt=altered.providerCampaign.progressionReceipts.receipts[0];alteredReceipt.sourceEvidence.jobs[0].channel='meeting';rehash(alteredReceipt);assert.throws(()=>RECEIPTS.validate(altered,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 const forgedJob=structuredClone(state),jobReceipt=forgedJob.providerCampaign.progressionReceipts.receipts[0];jobReceipt.sourceEvidence.jobs[0].jobId='provider-job-999999';jobReceipt.workProofs[0].jobId='provider-job-999999';rehash(jobReceipt);assert.throws(()=>RECEIPTS.validate(forgedJob,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 const unknown=structuredClone(state);unknown.providerCampaign.progressionReceipts.receipts[0].sourceId='progress.goal.not-real';rehash(unknown.providerCampaign.progressionReceipts.receipts[0]);assert.throws(()=>RECEIPTS.validate(unknown,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 const changedSource=structuredClone(state),changedReceipt=changedSource.providerCampaign.progressionReceipts.receipts[0];changedReceipt.sourceId=RECEIPTS.SUSTAINABLE;rehash(changedReceipt);assert.throws(()=>RECEIPTS.validate(changedSource,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 const cross=structuredClone(state);cross.providerCampaign.progressionReceipts.receipts[0].customerIds=['other-customer'];rehash(cross.providerCampaign.progressionReceipts.receipts[0]);assert.throws(()=>RECEIPTS.validate(cross,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 const level=RECEIPTS.claim(paidOpening(120),'progress.goal.bb',hooks),sustainable=RECEIPTS.claim(level.state,RECEIPTS.SUSTAINABLE,hooks).state;
 const money=structuredClone(sustainable),moneyReceipt=money.providerCampaign.progressionReceipts.receipts.find(x=>x.sourceId===RECEIPTS.SUSTAINABLE);moneyReceipt.sourceEvidence.sustainable.globalOperatingResultCents+=1;moneyReceipt.settlementProof.globalOperatingResultCents+=1;rehash(moneyReceipt);assert.throws(()=>RECEIPTS.validate(money,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 const outage=SOC.dispatch(state,{type:'provider',command:{action:'staff',engineers:state.business.workforce.engineers,support:0}});assert.equal(RECEIPTS.validate(outage,hooks),true);assert.equal(RECEIPTS.eligibility(outage,'progress.goal.bb',hooks).status,'earned');
 const retained=SOC.dispatch(state,{type:'advance',minutes:85});assert.ok(retained.providerCampaign.jobCheckpoint.pruned>0);assert.equal(RECEIPTS.validate(retained,hooks),true,'the compact receipt survives normal settled-job pruning with bounded evidence references');
});

test('worker source serializes the same receipt validation and does not create cash rewards',()=>{
 const s=paidOpening(),issued=RECEIPTS.claim(s,RECEIPTS.FIRST_LIVE,hooks),context={input:issued.state,hooks};vm.createContext(context);vm.runInContext(FACTS.source()+RECEIPTS.source(),context);
 const worker=vm.runInContext('SOC_PROVIDER_PROGRESSION_RECEIPTS.validate(input,hooks)',context);assert.equal(worker,true);assert.equal(issued.receipt.unlock,null);assert.equal(issued.receipt.sourceEvidence.sourceCashConversion,undefined);assert.equal(issued.state.business.balance.cash,s.business.balance.cash);
});

test('AC-SOC-810 a real customer exit preserves the earned Level2 window but cannot backdate eligibility',()=>{
 let s=regionalSupportReady();s=claimDispatched(s,RECEIPTS.FIRST_LIVE);s=claimDispatched(s,RECEIPTS.SUSTAINABLE);s=claimDispatched(s,RECEIPTS.LEVEL_TWO);
 const original=structuredClone(s.providerCampaign.progressionReceipts.receipts.find(r=>r.sourceId===RECEIPTS.LEVEL_TWO)),customerId='next-1-customer';
 const q=SOC.provider.quote(s,{action:'exit',customerId});assert.deepEqual(q.blockers,[]);
 s=SOC.dispatch(s,{type:'provider',command:{action:'exit',customerId,quoteRevision:q.atRevision}});
 assert.equal(s.providerCampaign.customers.find(c=>c.id===customerId).status,'exited');assert.deepEqual(s.providerCampaign.progressionReceipts.receipts.find(r=>r.sourceId===RECEIPTS.LEVEL_TWO),original);
 assert.equal(RECEIPTS.validate(s,hooks),true);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=SOC.dispatch(s,{type:'advance',minutes:1});assert.equal(RECEIPTS.eligibility(s,RECEIPTS.LEVEL_TWO,hooks).status,'earned');
 for(const change of [c=>{c.exitAt=original.at-1;},c=>{c.activatedAt=original.at+1;}]){const forged=structuredClone(s);change(forged.providerCampaign.customers.find(c=>c.id===customerId));assert.throws(()=>RECEIPTS.validate(forged,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);}
});
