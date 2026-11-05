'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const OWN=require('../src/game/23-provider-owned-sites');

const CUSTOMER='starter-customer';
const DF='progress.goal.df',M2='progress.goal.m2',L4='progress.progression-level.4';
const child=s=>s.portfolio.customers.find(row=>row.id===CUSTOMER).root;
const project=(s,operationId)=>s.providerCampaign.projects.findLast(row=>row.customerId===CUSTOMER&&row.operationId===operationId);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
const stageRequest=(stage,planId='swift')=>({action:'purchase',offerId:'starter',planId,stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
function commit(s,request){
 const quote=SOC.provider.quote(s,request);
 assert.deepEqual(quote.blockers,[],JSON.stringify({at:s.clock,request,blockers:quote.blockers,customer:s.providerCampaign.customers.find(row=>row.id===CUSTOMER),incidents:s.providerCampaign.incidents.filter(row=>row.customerId===CUSTOMER&&['active','acknowledged'].includes(row.status))}));
 return send(s,{...request,quoteRevision:quote.atRevision});
}
function operation(s,operationId,config){return commit(s,{action:'operation',operationId,customerId:CUSTOMER,...(config?{config}:{})});}
function repairActiveIncident(s){
 const incident=s.providerCampaign.incidents.find(row=>row.customerId===CUSTOMER&&['active','acknowledged'].includes(row.status));
 if(!incident)return s;
 if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
 const repairId=incident.kind==='transport-domain'?'transport-repair':incident.resource==='service'?'service-repair':'repair';
 s=operation(s,repairId);
 s=advanceUntil(s,state=>project(state,repairId)?.status==='complete',60);
 assert.equal(s.providerCampaign.incidents.find(row=>row.id===incident.id)?.status,'resolved');
 return s;
}
function claimProgression(s,sourceId){return send(s,{action:'claim-progression',sourceId,quoteRevision:s.revision});}
function completeOwnedRecovery(s,config,operationId='site-recovery'){
 s=repairActiveIncident(s);
 const quote=SOC.provider.quote(s,{action:'operation',operationId,customerId:CUSTOMER,config});
 assert.deepEqual(quote.blockers,[],JSON.stringify({clock:s.clock,config,blockers:quote.blockers}));
 if(operationId==='managed-site-recovery')assert.deepEqual({setupCents:quote.setupCents,periodCents:quote.periodCents,workMinutes:quote.workMinutes,engineers:quote.engineers,support:quote.support},{setupCents:10000,periodCents:2200,workMinutes:9,engineers:0,support:1});
 s=send(s,{action:'operation',operationId,customerId:CUSTOMER,config,quoteRevision:quote.atRevision});
 s=advanceUntil(s,state=>project(state,operationId)?.status==='commissioning',20);
 const recovery=project(s,operationId);
 s=advanceUntil(s,state=>{const row=project(state,operationId),exercise=child(state).siteOperations?.exercises.find(x=>x.id===row?.operationReceipt?.exerciseId);return exercise?.phase==='faulted'&&exercise.continuity.length>0&&exercise.continuity.every(item=>item.success);},40);
 s=send(s,{action:'site-response',projectId:recovery.id,response:'recover',quoteRevision:s.revision});
 s=advanceUntil(s,state=>child(state).siteOperations?.exercises.find(x=>x.id===recovery.operationReceipt.exerciseId)?.phase==='restoring',30);
 s=send(s,{action:'site-response',projectId:recovery.id,response:'restore',quoteRevision:s.revision});
 s=advanceUntil(s,state=>project(state,operationId)?.id===recovery.id&&project(state,operationId)?.status==='complete',40);
 const completed=project(s,operationId),exercise=child(s).siteOperations.exercises.find(x=>x.id===completed.operationReceipt.exerciseId);
 assert.equal(completed.operationReceipt.backupSnapshotId,exercise.backupSnapshot.snapshotId);
 assert.equal(completed.operationReceipt.restoreReceiptId,exercise.restoration.receiptId);
 return s;
}
function completeSiteMigration(s,config){
 const quote=SOC.provider.quote(s,{action:'operation',operationId:'site-resource-migration',customerId:CUSTOMER,config});
 assert.deepEqual(quote.blockers,[],JSON.stringify({clock:s.clock,config,blockers:quote.blockers}));
 s=send(s,{action:'operation',operationId:'site-resource-migration',customerId:CUSTOMER,config,quoteRevision:quote.atRevision});
 const submitted=project(s,'site-resource-migration');
 for(let n=0;n<20&&project(s,'site-resource-migration')?.id===submitted.id&&project(s,'site-resource-migration')?.status!=='complete';n++)s=advanceProviderMinute(s);
 assert.equal(project(s,'site-resource-migration')?.status,'complete',JSON.stringify({clock:s.clock,submitted,actual:project(s,'site-resource-migration'),customer:s.providerCampaign.customers.find(x=>x.id===CUSTOMER)?.status,incident:s.providerCampaign.incidents.filter(x=>x.customerId===CUSTOMER)}));
 return s;
}
function advanceUntil(s,predicate,limit=180){
 for(let n=0;n<limit&&!predicate(s);n++)s=advanceProviderMinute(s);
 assert.ok(predicate(s),`condition not reached at minute ${s.clock}`);
 return s;
}
function advanceProviderMinute(s){for(const c of s.providerCampaign.customers.filter(row=>row.status==='renewal'))s=send(s,{action:'renew',customerId:c.id});return SOC.dispatch(s,{type:'advance',minutes:1});}
function opening(planId='swift'){
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 for(const stage of ['base','carrier','partner'])s=commit(s,stageRequest(stage,planId));
 return advanceUntil(s,state=>state.providerCampaign.customers[0].status==='active',30);
}
function commissionedOwnedSites(s){
 s=operation(s,'cisco-dedicated-uc');s=advanceUntil(s,state=>project(state,'cisco-dedicated-uc')?.status==='complete',60);
 s=operation(s,'primary-upstream');s=advanceUntil(s,state=>project(state,'primary-upstream')?.status==='complete',40);
 s=operation(s,'site-diverse-ingress');s=advanceUntil(s,state=>project(state,'site-diverse-ingress')?.status==='complete',40);
 s=operation(s,'owned-site-operations');return advanceUntil(s,state=>project(state,'owned-site-operations')?.status==='complete',30);
}
function assertCustomerHasNoSeparateTreasury(s){
 assert.equal(child(s).business,undefined,'Provider customer must not receive a second treasury');
 assert.equal(child(s).transport.totalCosts,0,'transport commands themselves must not create duplicate customer charges');
 assert.deepEqual(child(s).transport.ledger,[]);
}

test('paid site ingress and owned-site setup bind purchased endpoints, then commission only from effective state',()=>{
 let s=opening();
 const openingCash=s.business.balance.cash,openingChild=structuredClone(child(s));
 const prematureIngress=SOC.provider.quote(s,{action:'operation',operationId:'site-diverse-ingress',customerId:CUSTOMER});
 assert.ok(prematureIngress.blockers.includes('OPERATION_REQUIREMENT_REQUIRED:primary-upstream'));
 assert.ok(SOC.provider.quote(s,{action:'operation',operationId:'owned-site-operations',customerId:CUSTOMER}).blockers.length>0);
 assert.equal(s.business.balance.cash,openingCash);
 assert.equal(JSON.stringify(child(s)),JSON.stringify(openingChild));

 // This paid recipe supplies Alex's real local endpoint. The owned-site path
 // must preserve its identity and bind it through the paid resilience record.
 s=operation(s,'cisco-dedicated-uc');
 s=advanceUntil(s,state=>project(state,'cisco-dedicated-uc')?.status==='complete',60);
 const endpoint=child(s).resources['dedicated-endpoint'];
 assert.equal(endpoint.kind,'endpoint');
 assert.equal(endpoint.effective.identity,'alex');
 assert.equal(endpoint.provisioning.status,'ready');

 s=operation(s,'primary-upstream');
 s=advanceUntil(s,state=>project(state,'primary-upstream')?.status==='complete',40);
 const primary=child(s).providerResilience.installations.find(row=>row.operationId==='primary-upstream');
 assert.ok(primary.bindings.some(row=>row.resource==='desk'));
 assert.ok(primary.bindings.some(row=>row.resource==='dedicated-endpoint'));
 assert.equal(child(s).transport.bindings.desk,`${CUSTOMER}-branch`);
 assert.equal(child(s).transport.bindings['dedicated-endpoint'],`${CUSTOMER}-branch`);

 const beforeIngress=s.business.balance.cash;
 s=operation(s,'site-diverse-ingress');
 assert.equal(beforeIngress-s.business.balance.cash,32000);
 assert.notEqual(project(s,'site-diverse-ingress').status,'complete');
 s=advanceUntil(s,state=>project(state,'site-diverse-ingress')?.status==='complete',40);
 const names=OWN.idsFor({id:CUSTOMER});
 assert.equal(child(s).transport.bindings.carrier,names.ingressTransport);
 assert.equal(child(s).transport.sites[names.ingressTransport].provisioning.status,'ready');
 assert.equal(child(s).transport.links[names.ingressHead].effective.capacityMbps,20);
 assert.equal(child(s).transport.links[names.ingressBranch].effective.capacityMbps,20);

 const beforeOwned=s.business.balance.cash,customerState=structuredClone(child(s));
 s=operation(s,'owned-site-operations');
 assert.equal(beforeOwned-s.business.balance.cash,42000);
 assert.equal(project(s,'owned-site-operations').status,'running');
 assert.equal(project(s,'owned-site-operations').operationReceipt,undefined);
 assert.equal(child(s).siteOperations,undefined);
 s=advanceUntil(s,state=>project(state,'owned-site-operations')?.status==='complete',30);
 const installation=project(s,'owned-site-operations').operationReceipt;
 assert.equal(installation.kind,'provider-owned-sites');
 assert.deepEqual(installation.transportBindings.map(row=>row.resource),['identity','desk','dedicated-endpoint','bea','alex']);
 assert.ok(child(s).siteOperations.sites[OWN.SITE_IDS.head].effective);
 assert.ok(child(s).siteOperations.sites[OWN.SITE_IDS.branch].effective);
 assert.equal(child(s).siteOperations.bindings.desk.site,OWN.SITE_IDS.head);
 assert.equal(child(s).siteOperations.bindings['dedicated-endpoint'].site,OWN.SITE_IDS.branch);
 assertCustomerHasNoSeparateTreasury(s);
 assert.notEqual(JSON.stringify(child(s)),JSON.stringify(customerState));
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forgedBinding=structuredClone(s),forgedInstall=project(forgedBinding,'owned-site-operations');
 forgedInstall.operationReceipt.transportBindings[0].to=OWN.SITE_IDS.branch;
 assert.throws(()=>SOC.restore(JSON.stringify(forgedBinding)),/OWNED_SITE|RESILIENCE|TRANSPORT|PAID_IDENTITY/);
});

test('a funded owned-site recovery records actual non-probe calls across fault, restoration and fresh service',()=>{
 let s=opening();
 s=operation(s,'cisco-dedicated-uc');
 s=advanceUntil(s,state=>project(state,'cisco-dedicated-uc')?.status==='complete',60);
 s=operation(s,'primary-upstream');
 s=advanceUntil(s,state=>project(state,'primary-upstream')?.status==='complete',40);
 s=operation(s,'site-diverse-ingress');
 s=advanceUntil(s,state=>project(state,'site-diverse-ingress')?.status==='complete',40);
 s=operation(s,'owned-site-operations');
 s=advanceUntil(s,state=>project(state,'owned-site-operations')?.status==='complete',30);
 s=repairActiveIncident(s);

 const config={kind:'power',targetSite:OWN.SITE_IDS.head};
 const quote=SOC.provider.quote(s,{action:'operation',operationId:'site-recovery',customerId:CUSTOMER,config});
 assert.deepEqual(quote.blockers,[],JSON.stringify(quote.blockers));
 const before=s.business.balance.cash;
 s=send(s,{action:'operation',operationId:'site-recovery',customerId:CUSTOMER,config,quoteRevision:quote.atRevision});
 assert.equal(before-s.business.balance.cash,16000);
 assert.equal(project(s,'site-recovery').status,'running');
 s=advanceUntil(s,state=>project(state,'site-recovery')?.status==='commissioning',20);
 const recovery=project(s,'site-recovery');
 assert.equal(recovery.status,'commissioning');
 assert.equal(recovery.config.targetSite,OWN.SITE_IDS.head);
 assert.ok(recovery.operationReceipt.backupSnapshotId);
 assert.equal(recovery.operationReceipt.restoreReceiptId,null);
 assertCustomerHasNoSeparateTreasury(s);
 s=advanceUntil(s,state=>{
  const row=project(state,'site-recovery'),x=child(state).siteOperations?.exercises.find(x=>x.id===row?.operationReceipt?.exerciseId);
  return x?.phase==='faulted'&&x.continuity.length>0&&x.continuity.every(item=>item.success);
 },40);
 s=send(s,{action:'site-response',projectId:recovery.id,response:'recover',quoteRevision:s.revision});
 s=advanceUntil(s,state=>child(state).siteOperations?.exercises.find(x=>x.id===recovery.operationReceipt.exerciseId)?.phase==='restoring',30);
 s=send(s,{action:'site-response',projectId:recovery.id,response:'restore',quoteRevision:s.revision});
 const restoreExercise=child(s).siteOperations.exercises.find(x=>x.id===recovery.operationReceipt.exerciseId);
 assert.equal(project(s,'site-recovery').operationReceipt.backupSnapshotId,restoreExercise.backupSnapshot.snapshotId);
 assert.equal(project(s,'site-recovery').operationReceipt.restoreReceiptId,restoreExercise.restoration.receiptId);
 s=advanceUntil(s,state=>project(state,'site-recovery')?.status==='complete',40);

 const completedRecovery=project(s,'site-recovery'),exercise=child(s).siteOperations.exercises.find(row=>row.id===recovery.operationReceipt.exerciseId);
 assert.equal(exercise.status,'complete');
 assert.equal(exercise.restoration.status,'complete');
 assert.ok(exercise.baseline?.success);
 assert.ok(exercise.continuity.length>0);
 assert.ok(exercise.continuity.every(row=>row.success));
 assert.ok(exercise.recoveredJourney?.success);
 const interactionIds=[exercise.baseline.interactionId,...exercise.continuity.map(row=>row.interactionId),exercise.recoveredJourney.interactionId];
 assert.equal(new Set(interactionIds).size,interactionIds.length);
 for(const id of interactionIds){
  const interaction=child(s).interactions.find(row=>row.id===id);
  assert.ok(interaction,`actual interaction ${id} is retained`);
  assert.notEqual(interaction.probe,true);
  assert.equal(interaction.channel,'voice');
  assert.equal(interaction.phase,'resolved');
  assert.equal(interaction.outcome,'CONNECTED');
  assert.ok(interaction.finishedAt>interaction.startedAt);
  assert.equal(interaction.media.in,true);
  assert.equal(interaction.media.out,true);
 }
 assert.ok(exercise.restoration.receiptId);
 assert.equal(completedRecovery.operationReceipt.backupSnapshotId,exercise.backupSnapshot.snapshotId);
 assert.equal(completedRecovery.operationReceipt.restoreReceiptId,exercise.restoration.receiptId);
 assert.equal(completedRecovery.operationReceipt.completedAt,completedRecovery.completedAt);
 assert.equal(s.business.ledger.find(row=>row.id===completedRecovery.postingId).cents,completedRecovery.setupCents);
 assertCustomerHasNoSeparateTreasury(s);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const cashBeforeClaim=s.business.balance.cash;
 const beforeClaimFacts=SOC.provider.inspect(s).progression.goals[DF];
 assert.equal(beforeClaimFacts.status,'ready',JSON.stringify(beforeClaimFacts));
 assert.equal(OWN.validateEvidence(s,DF,CUSTOMER,beforeClaimFacts.evidence),true,'the owned-site adapter accepts its current positive fact');
 assert.equal(OWN.validateEvidence(s,DF,CUSTOMER,beforeClaimFacts.evidence,{}, {historical:true}),true,'the same fact validates at its claim-time boundary');
 s=claimProgression(s,DF);
 const dfReceipt=s.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===DF);
 assert.ok(dfReceipt);
 assert.equal(s.business.balance.cash,cashBeforeClaim,'progress claims do not award Provider cash');
 const earnedEventCount=s.providerCampaign.events.filter(row=>row.code==='PROGRESSION_EARNED'&&row.details?.sourceId===DF).length;
 s=claimProgression(s,DF);
 assert.equal(s.business.balance.cash,cashBeforeClaim);
 assert.equal(s.providerCampaign.events.filter(row=>row.code==='PROGRESSION_EARNED'&&row.details?.sourceId===DF).length,earnedEventCount,'duplicate claim is idempotent');
 const laterRecoveries=[
  {kind:'power',targetSite:OWN.SITE_IDS.branch},
  {kind:'site-failure',targetSite:OWN.SITE_IDS.head},
  {kind:'site-failure',targetSite:OWN.SITE_IDS.branch},
  {kind:'shared-risk',targetSite:OWN.SITE_IDS.head}
 ];
 for(const config of laterRecoveries)s=completeOwnedRecovery(s,config);
 s=completeSiteMigration(s,{resourceId:'desk',fromSite:OWN.SITE_IDS.head,toSite:OWN.SITE_IDS.branch});
 s=completeSiteMigration(s,{resourceId:'dedicated-endpoint',fromSite:OWN.SITE_IDS.branch,toSite:OWN.SITE_IDS.head});
 const cashBeforePortfolioClaims=s.business.balance.cash;
 s=claimProgression(s,M2);
 s=claimProgression(s,L4);
 assert.equal(s.business.balance.cash,cashBeforePortfolioClaims,'additional owned-site progression claims do not award cash');
 const dfCurrent=s.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===DF);
 const m2Receipt=s.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===M2);
 const l4Receipt=s.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===L4);
 assert.ok(m2Receipt&&l4Receipt);
 assert.deepEqual(dfCurrent.sourceEvidence.recoveries.map(row=>row.projectId),[recovery.id],'the original DF receipt stays pinned to its claim-time recovery');
 assert.equal(OWN.validateEvidence(s,DF,CUSTOMER,dfCurrent.sourceEvidence,{}, {historical:true}),true);
 assert.equal(OWN.validateEvidence(s,M2,CUSTOMER,m2Receipt.sourceEvidence,{}, {historical:true}),true);
 assert.equal(OWN.validateEvidence(s,L4,CUSTOMER,l4Receipt.sourceEvidence,{}, {historical:true}),true);
 const forgedEvidence=structuredClone(dfCurrent.sourceEvidence);forgedEvidence.recoveries[0].restoreReceiptId='restore-receipt-forged';
 assert.equal(OWN.validateEvidence(s,DF,CUSTOMER,forgedEvidence,{}, {historical:true}),false);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forgedRestore=structuredClone(s),forgedExercise=child(forgedRestore).siteOperations.exercises.find(row=>row.id===completedRecovery.operationReceipt.exerciseId);
 forgedExercise.restoration.receiptId='restore-receipt-forged';
 assert.throws(()=>SOC.restore(JSON.stringify(forgedRestore)),/RESTORE|RECEIPT|LINEAGE|INVALID/);
});

test('earned DF enables the paid managed recovery alternative and its real workflow',()=>{
 let s=commissionedOwnedSites(opening());s=repairActiveIncident(s);
 const beforePrematureQuote=s.business.balance.cash,tooEarly=SOC.provider.quote(s,{action:'operation',operationId:'managed-site-recovery',customerId:CUSTOMER,config:{kind:'power',targetSite:OWN.SITE_IDS.head}});
 assert.ok(tooEarly.blockers.includes('EARNED_SITE_RECOVERY_MARKET_REQUIRED'),JSON.stringify(tooEarly.blockers));assert.equal(s.business.balance.cash,beforePrematureQuote);
 s=completeOwnedRecovery(s,{kind:'power',targetSite:OWN.SITE_IDS.head});
 const facts=SOC.provider.inspect(s).progression.goals[DF];
 assert.equal(facts.status,'ready',JSON.stringify(facts));
 const cashBeforeClaim=s.business.balance.cash;s=claimProgression(s,DF);
 assert.ok(s.providerCampaign.progressionReceipts.receipts.some(row=>row.sourceId===DF&&row.customerIds.includes(CUSTOMER)));
 assert.equal(s.business.balance.cash,cashBeforeClaim,'claiming DF awards no Provider cash');
 const config={kind:'power',targetSite:OWN.SITE_IDS.branch},request={action:'operation',operationId:'managed-site-recovery',customerId:CUSTOMER,config};
 const quote=SOC.provider.quote(s,request);
 assert.deepEqual(quote.blockers,[],JSON.stringify(quote.blockers));
 assert.deepEqual({setupCents:quote.setupCents,periodCents:quote.periodCents,workMinutes:quote.workMinutes,engineers:quote.engineers,support:quote.support},{setupCents:10000,periodCents:2200,workMinutes:9,engineers:0,support:1});
 const cashBeforeOrder=s.business.balance.cash;s=send(s,{...request,quoteRevision:quote.atRevision});
 const pending=project(s,'managed-site-recovery');assert.equal(pending.status,'running');assert.equal(pending.operationReceipt,undefined);assert.equal(cashBeforeOrder-s.business.balance.cash,10000);
 s=advanceUntil(s,state=>project(state,'managed-site-recovery')?.status==='commissioning',20);
 const managed=project(s,'managed-site-recovery'),exerciseId=managed.operationReceipt.exerciseId;
 s=advanceUntil(s,state=>{const exercise=child(state).siteOperations.exercises.find(row=>row.id===exerciseId);return exercise?.phase==='faulted'&&exercise.continuity.length>0&&exercise.continuity.every(row=>row.success);},40);
 s=send(s,{action:'site-response',projectId:managed.id,response:'recover',quoteRevision:s.revision});
 s=advanceUntil(s,state=>child(state).siteOperations.exercises.find(row=>row.id===exerciseId)?.phase==='restoring',30);
 s=send(s,{action:'site-response',projectId:managed.id,response:'restore',quoteRevision:s.revision});
 s=advanceUntil(s,state=>project(state,'managed-site-recovery')?.status==='complete',40);
 const delivered=project(s,'managed-site-recovery'),exercise=child(s).siteOperations.exercises.find(row=>row.id===exerciseId);
 assert.equal(delivered.operationReceipt.kind,'site-recovery');assert.equal(delivered.operationReceipt.backupSnapshotId,exercise.backupSnapshot.snapshotId);assert.equal(delivered.operationReceipt.restoreReceiptId,exercise.restoration.receiptId);
 assert.ok(exercise.continuity.length>0&&exercise.continuity.every(row=>row.success));assert.ok(exercise.recoveredJourney?.success);
 const duplicateDirect=SOC.provider.quote(s,{action:'operation',operationId:'site-recovery',customerId:CUSTOMER,config});
 assert.ok(duplicateDirect.blockers.includes('NEXT_AUTHORED_SITE_RECOVERY_CHOICE_REQUIRED'),JSON.stringify(duplicateDirect.blockers));
 assert.equal(OWN.validateEvidence(s,DF,CUSTOMER,s.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===DF).sourceEvidence,{}, {historical:true}),true);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('each owned endpoint migration is separately quoted, paid and retained against its exact source and target',()=>{
 let s=opening();
 s=operation(s,'cisco-dedicated-uc');
 s=advanceUntil(s,state=>project(state,'cisco-dedicated-uc')?.status==='complete',60);
 s=operation(s,'primary-upstream');
 s=advanceUntil(s,state=>project(state,'primary-upstream')?.status==='complete',40);
 s=operation(s,'site-diverse-ingress');
 s=advanceUntil(s,state=>project(state,'site-diverse-ingress')?.status==='complete',40);
 s=operation(s,'owned-site-operations');
 s=advanceUntil(s,state=>project(state,'owned-site-operations')?.status==='complete',30);

 const cases=[
  {resourceId:'desk',fromSite:OWN.SITE_IDS.head,toSite:OWN.SITE_IDS.branch},
  {resourceId:'dedicated-endpoint',fromSite:OWN.SITE_IDS.branch,toSite:OWN.SITE_IDS.head}
 ];
 for(const config of cases){
  const quote=SOC.provider.quote(s,{action:'operation',operationId:'site-resource-migration',customerId:CUSTOMER,config});
  assert.deepEqual(quote.blockers,[],JSON.stringify({config,blockers:quote.blockers}));
  const cash=s.business.balance.cash;
  s=send(s,{action:'operation',operationId:'site-resource-migration',customerId:CUSTOMER,config,quoteRevision:quote.atRevision});
  const submitted=project(s,'site-resource-migration');
  assert.equal(cash-s.business.balance.cash,12000);
  assert.equal(submitted.config.resourceId,config.resourceId);
  s=advanceUntil(s,state=>project(state,'site-resource-migration')?.id===submitted.id&&project(state,'site-resource-migration')?.status==='complete',20);
  const completed=s.providerCampaign.projects.find(row=>row.id===submitted.id);
  assert.equal(completed.status,'complete');
  assert.equal(completed.operationReceipt.kind,'site-resource-migration');
  assert.deepEqual(
   {resourceId:completed.operationReceipt.resourceId,fromSite:completed.operationReceipt.fromSite,toSite:completed.operationReceipt.toSite},
   config
  );
  assert.equal(child(s).siteOperations.bindings[config.resourceId].site,config.toSite);
  const retained=child(s).siteOperations.migrations.find(row=>row.id===completed.operationReceipt.migrationId);
  assert.equal(retained.phase,'complete');
  assert.deepEqual(retained.items.map(item=>item.resource),[config.resourceId]);
  assert.ok(retained.items[0].receiptId);
  assertCustomerHasNoSeparateTreasury(s);
  assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 }

 const malformed={resourceId:'identity',fromSite:OWN.SITE_IDS.head,toSite:OWN.SITE_IDS.branch,free:true};
 const before=JSON.stringify(s);
 assert.throws(()=>SOC.provider.quote(s,{action:'operation',operationId:'site-resource-migration',customerId:CUSTOMER,config:malformed}),/INVALID_PROVIDER_SITE_MIGRATION_SCOPE/);
 assert.equal(JSON.stringify(s),before);
});

