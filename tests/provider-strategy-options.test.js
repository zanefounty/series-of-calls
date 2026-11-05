'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');

function start(scenario){
 let state=SOC.create({experience:'campaign',scenario,market:'au-sydney',difficulty:'normal'}),sequence=1;
 const send=command=>{state=SOC.dispatch(state,{type:'provider',requestId:`provider-${sequence++}`,command});return state;};
 const advance=minutes=>{for(let n=0;n<minutes;n++)state=SOC.dispatch(state,{type:'advance',minutes:1});return state;};
 const purchase=(offerId,planId,stage,customerId)=>{
  const request={action:'purchase',offerId,planId,stage,...(customerId?{customerId}:{})},quote=SOC.provider.quote(state,request);
  assert.deepEqual(quote.blockers,[],`${scenario}/${offerId}/${stage}: ${quote.blockers.join(',')}`);
  return send({...request,quoteRevision:state.revision});
 };
 const operationQuote=(operationId,customerId='starter-customer')=>SOC.provider.quote(state,{action:'operation',operationId,customerId});
 const operation=(operationId,customerId='starter-customer')=>{
  const request={action:'operation',operationId,customerId},quote=SOC.provider.quote(state,request);
  assert.deepEqual(quote.blockers,[],`${scenario}/${operationId}: ${quote.blockers.join(',')}`);
  return send({...request,quoteRevision:state.revision});
 };
 const operationEventually=(operationId,customerId='starter-customer')=>{
  for(let n=0;n<90;n++){
   const quote=operationQuote(operationId,customerId),request=quote.request;
   if(!quote.blockers.length){send({...request,quoteRevision:state.revision});return;}
   assert.ok(quote.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(x)),`${scenario}/${operationId}: ${quote.blockers.join(',')}`);
   advance(1);
  }
  assert.fail(`${scenario}/${operationId} never became fundable`);
 };
 const until=(predicate,limit=180)=>{
  for(let n=0;n<limit&&!predicate();n++)advance(1);
  assert.ok(predicate(),`${scenario} state did not reach its actual-work condition by minute ${state.clock}; projects=${JSON.stringify(state.providerCampaign.projects.slice(-4).map(x=>({operationId:x.operationId,status:x.status,completedAt:x.completedAt,dueAt:x.dueAt})))}; incidents=${JSON.stringify(state.providerCampaign.incidents.filter(x=>x.status==='active').map(x=>x.id))}`);
 };
 return {get state(){return state;},send,advance,purchase,operation,operationQuote,operationEventually,until};
}

function commission(scenario){
 const c=start(scenario);
 for(const stage of ['base','carrier','partner'])c.purchase('starter','swift',stage,stage==='base'?undefined:'starter-customer');
 c.until(()=>c.state.providerCampaign.customers[0].status==='active',60);
 return c;
}

test('enterprise coexistence and consolidated migration quotes trade staffing, cutover time and recurring commitment, then move actual identities',()=>{
 const coexist=commission('enterprise'),consolidated=commission('enterprise');
 for(const c of [coexist,consolidated]){
  c.operationEventually('room');c.operationEventually('recording');
  c.until(()=>['room','recording'].every(id=>c.state.providerCampaign.projects.findLast(x=>x.operationId===id)?.status==='complete'),30);
 }
 const coexistRequest={action:'operation',operationId:'migration',customerId:'starter-customer'};
 const consolidatedRequest={action:'operation',operationId:'migration-consolidated',customerId:'starter-customer'};
 const coexistQuote=SOC.provider.quote(coexist.state,coexistRequest),consolidatedQuote=SOC.provider.quote(consolidated.state,consolidatedRequest);
 assert.deepEqual(coexistQuote.blockers,[]);assert.deepEqual(consolidatedQuote.blockers,[]);
 assert.ok(consolidatedQuote.setupCents>coexistQuote.setupCents,'the consolidated cutover commits more up front');
 assert.ok(consolidatedQuote.periodCents<coexistQuote.periodCents,'consolidation lowers recurring support');
 assert.ok(consolidatedQuote.workMinutes<coexistQuote.workMinutes,'consolidation uses a shorter wave');
 assert.ok(consolidatedQuote.engineers>coexistQuote.engineers,'consolidation reserves more engineers at once');
 assert.ok(consolidatedQuote.support>coexistQuote.support,'consolidation also reserves support');
 const consolidatedPhoneGeneration=consolidated.state.portfolio.customers[0].root.resources.phone.generation;
 coexist.send({...coexistRequest,quoteRevision:coexist.state.revision});
 consolidated.send({...consolidatedRequest,quoteRevision:consolidated.state.revision});
 coexist.until(()=>coexist.state.portfolio.customers[0].root.operations?.migrations.some(x=>x.status==='complete'),90);
 consolidated.until(()=>consolidated.state.portfolio.customers[0].root.operations?.migrations.some(x=>x.status==='complete'),90);
 const old=coexist.state.portfolio.customers[0].root,cutover=consolidated.state.portfolio.customers[0].root;
 const coexistMigration=old.operations.migrations.find(x=>x.status==='complete'),consolidatedMigration=cutover.operations.migrations.find(x=>x.status==='complete');
 assert.deepEqual(coexistMigration.identities,['bea']);
 assert.equal(coexistMigration.target,'migration-phone');
 assert.equal(old.operations.placements.bea,'migration-phone');
 assert.notEqual(old.operations.placements.alex,'migration-phone','coexistence leaves Alex on the original phone platform');
 assert.equal(old.resources.phone.id,'phone');
 assert.equal(old.resources['migration-phone'].effective.deployment,'dedicated');
 assert.equal(old.resources.phone.effective.deployment,'multitenant','coexistence keeps the original phone service effective');
 assert.deepEqual(consolidatedMigration.identities,['alex','bea']);
 assert.equal(consolidatedMigration.target,'phone');
 assert.equal(cutover.operations.placements.alex,'phone');assert.equal(cutover.operations.placements.bea,'phone');
 assert.ok(cutover.resources.phone.generation>consolidatedPhoneGeneration,'cutover retires the old phone generation');
 assert.equal(cutover.resources.phone.effective.deployment,'dedicated');
 assert.equal(cutover.resources['migration-phone'],undefined,'consolidated cutover does not retain a parallel migration platform');
});

test('a paid distributor qualification requires actual qualified service history before unlocking its room offer',()=>{
 const c=commission('smb');
 const initialRoom={action:'operation',operationId:'distributor-room',customerId:'starter-customer'};
 assert.ok(SOC.provider.quote(c.state,initialRoom).blockers.includes('OPERATION_REQUIREMENT_REQUIRED:partner-qualification'));
 const blocked=c.operationQuote('partner-qualification');
 assert.ok(blocked.blockers.includes('RECENT_FULL_QUALIFIED_SETTLEMENT_REQUIRED'));
 while(!c.state.providerCampaign.incidents.some(x=>x.status==='active'))c.advance(1);
 const incident=c.state.providerCampaign.incidents.find(x=>x.status==='active');
 c.send({action:'acknowledge-incident',incidentId:incident.id});c.operation('repair');
 c.until(()=>c.state.providerCampaign.incidents.find(x=>x.id===incident.id).status==='resolved',10);
 c.advance(60-c.state.clock%60);c.advance(60);
 assert.ok(c.state.providerCampaign.customers[0].history.some(x=>x.qualified),'the customer earned a real qualified service period');
 const partner=c.operationQuote('partner-qualification');assert.deepEqual(partner.blockers,[]);
 c.send({...partner.request,quoteRevision:c.state.revision});
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='partner-qualification')?.status==='complete',12);
 const standard=SOC.provider.quote(c.state,{action:'operation',operationId:'room',customerId:'starter-customer'});
 const distributor=SOC.provider.quote(c.state,{action:'operation',operationId:'distributor-room',customerId:'starter-customer'});
 assert.deepEqual(distributor.blockers,[]);
 assert.ok(distributor.setupCents<standard.setupCents,'qualified distributor terms reduce setup cost');
 assert.ok(distributor.periodCents>standard.periodCents,'qualified distributor terms increase recurring support');
 c.send({...distributor.request,quoteRevision:c.state.revision});
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='distributor-room')?.status==='complete',20);
 assert.equal(c.state.portfolio.customers[0].root.resources.room.effective.calendar,true,'the procured room bundle changes an effective service capability');
});

test('ordering an optional operation during renewal preserves the renewal decision until a valid renewal is accepted',()=>{
 const c=commission('smb');
 for(let minute=0;minute<240&&c.state.providerCampaign.customers[0].status!=='renewal';minute++){
  const incident=c.state.providerCampaign.incidents.find(x=>x.status==='active');
  if(incident){c.send({action:'acknowledge-incident',incidentId:incident.id});c.operationEventually('repair',incident.customerId);}
  c.advance(1);
 }
 const customer=c.state.providerCampaign.customers[0];
 assert.equal(customer.status,'renewal','renewal is reached through actual qualified service periods');
 assert.ok(customer.history.filter(x=>x.qualified).slice(-3).length>=2);
 c.operationEventually('room');
 assert.equal(c.state.providerCampaign.customers[0].status,'renewal','an optional project purchase cannot turn a renewal offer into active service');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='room')?.status==='complete',20);
 assert.equal(c.state.providerCampaign.customers[0].status,'renewal','finishing the project still requires the explicit renewal decision');
 c.send({action:'renew',customerId:'starter-customer'});
 assert.equal(c.state.providerCampaign.customers[0].status,'active','only the valid renewal command restores active service');
});

function workerDispatch(state,command){
 let result;const context={postMessage:value=>{result=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);
 context.onmessage({data:{id:1,state,command}});assert.ok(result);assert.equal(result.error,undefined,result.error||'worker continuation succeeds');return result.state;
}

test('defence continuity preserves real offline work, paid autonomy lineage and scoped reconciliation across saves and workers',()=>{
 const c=commission('defence');
 c.operationEventually('recording');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='recording')?.status==='complete',20);
 c.operationEventually('local-deployment');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='local-deployment')?.status==='complete',30);
 assert.equal(c.state.portfolio.customers[0].root.providerContinuity.autonomyMinutes,30,'local deployment begins with the authored 30 minute autonomy');
 c.operationEventually('local-spares');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='local-spares')?.status==='complete',15);
 const child=()=>c.state.portfolio.customers[0].root;
 assert.equal(child().providerContinuity.autonomyMinutes,60,'only the funded and completed spares operation extends local autonomy');
 c.until(()=>child().providerContinuity.pending.length>0&&child().providerContinuity.outageStartedAt!==null,90);
 const before=JSON.stringify(c.state),command={type:'advance',minutes:1};
 const sync=SOC.dispatch(SOC.restore(before),command),worker=workerDispatch(SOC.restore(before),command);
 assert.deepEqual(JSON.parse(JSON.stringify(worker)),JSON.parse(JSON.stringify(sync)),'worker continuation preserves pending offline work and its outage');
 const restored=SOC.restore(before);
 assert.deepEqual(restored.portfolio.customers[0].root.providerContinuity,child().providerContinuity,'save restore preserves continuity state');
 const malformed=[];
 const noPaidSpares=structuredClone(restored);noPaidSpares.portfolio.customers[0].root.providerContinuity.autonomyMinutes=60;noPaidSpares.portfolio.customers[0].root.providerContinuity.sparesReceipt=null;malformed.push(noPaidSpares);
 const falseSyncTotal=structuredClone(restored);falseSyncTotal.portfolio.customers[0].root.providerContinuity.syncedCheckpoint.total++;malformed.push(falseSyncTotal);
 for(const state of malformed)assert.throws(()=>SOC.restore(JSON.stringify(state)),/INVALID_PROVIDER_(?:CONTINUITY|SPARES|SYNC)/,'import rejects unsupported autonomy or forged synced totals');
 assert.equal(JSON.stringify(c.state),before,'worker, restore and negative import checks do not mutate the accepted parent campaign');

 const incident=c.state.providerCampaign.incidents.find(x=>x.status==='active');assert.ok(incident,'the real defence outage raises an actionable incident');
 c.send({action:'acknowledge-incident',incidentId:incident.id});c.operationEventually('repair',incident.customerId);
 c.until(()=>c.state.providerCampaign.incidents.find(x=>x.id===incident.id)?.status==='resolved',20);
 c.until(()=>child().connected===true,10);
 const revenueBeforeSync=c.state.business.balance.revenue;
 c.operationEventually('sync-records');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='sync-records')?.status==='complete',15);
 assert.equal(child().providerContinuity.lastSyncReceipt.scope,'records');
 assert.ok(child().providerContinuity.lastSyncReceipt.recorded>0,'records-only reconciliation consumes actual recorded offline interactions');
 assert.equal(c.state.business.balance.revenue,revenueBeforeSync,'reconciliation does not bill customer revenue a second time');
 const syncedSave=structuredClone(c.state),syncProject=syncedSave.providerCampaign.projects.findLast(x=>x.operationId==='sync-records');
 const badScope=structuredClone(syncedSave);badScope.providerCampaign.projects.find(x=>x.id===syncProject.id).operationReceipt.scope='all';
 const badPosting=structuredClone(syncedSave);badPosting.providerCampaign.projects.find(x=>x.id===syncProject.id).operationReceipt.postingId='forged-posting';
 assert.throws(()=>SOC.restore(JSON.stringify(badScope)),/INVALID_PROVIDER_SYNC_LINEAGE/,'save validation binds sync scope to the paid operation');
 assert.throws(()=>SOC.restore(JSON.stringify(badPosting)),/INVALID_PROVIDER_SYNC_LINEAGE/,'save validation binds sync receipt to its actual project posting');
});

test('paid sync-all clears real unrecorded offline work without manufacturing a recording',()=>{
 const c=commission('defence');
 c.operationEventually('local-deployment');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='local-deployment')?.status==='complete',30);
 const child=()=>c.state.portfolio.customers[0].root;
 c.until(()=>child().providerContinuity.pending.some(x=>x.recordId===null),90);
 const offlineItems=child().providerContinuity.pending.filter(x=>x.recordId===null).map(x=>x.interactionId);
 assert.ok(offlineItems.length>0,'the fixture contains actual resolved local work with no recording');
 const incident=c.state.providerCampaign.incidents.find(x=>x.status==='active');assert.ok(incident);
 c.send({action:'acknowledge-incident',incidentId:incident.id});c.operationEventually('repair',incident.customerId);
 c.until(()=>c.state.providerCampaign.incidents.find(x=>x.id===incident.id)?.status==='resolved',20);
 c.until(()=>child().connected===true,10);
 c.operationEventually('recording');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='recording')?.status==='complete',20);
 c.operationEventually('sync-all');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='sync-all')?.status==='complete',30);
 assert.equal(child().providerContinuity.lastSyncReceipt.scope,'all');
 assert.ok(child().providerContinuity.lastSyncReceipt.unrecorded>0,'all-scope sync reconciles deferred interactions without records');
 assert.equal(child().providerContinuity.pending.length+child().providerContinuity.pendingCheckpoint.total,0);
 for(const interactionId of offlineItems){
  const interaction=child().interactions.find(x=>x.id===interactionId);
  assert.ok(interaction,'the synced obligation remains the actual interaction');
  assert.equal(interaction.records.length,0,'sync-all does not manufacture a recording');
 }
});

test('30 minute local autonomy exhaustion fails real customer jobs and paid spares restores offline service',()=>{
 const c=commission('defence');
 c.operationEventually('local-deployment');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='local-deployment')?.status==='complete',30);
 const child=()=>c.state.portfolio.customers[0].root;
 c.until(()=>child().providerContinuity.outageStartedAt!==null,90);
 const expiresAt=child().providerContinuity.outageStartedAt+30;
 c.until(()=>SOC.observe(child(),'local').ready===false,35);
 const observation=SOC.observe(child(),'local');
 assert.ok(observation.reasons.includes('LOCAL_AUTONOMY_EXHAUSTED'));
 assert.ok(c.state.clock>=expiresAt,'the default local runtime has actually reached its expiry');
 // Expiry can fall in the authored quiet interval; wait for the next real arrival.
 c.until(()=>c.state.providerCampaign.jobs.some(j=>j.status==='failed'&&j.arrivalAt>=expiresAt&&j.completedAt!==null),SOC.provider.rules.periodMinutes);
 const losses=c.state.providerCampaign.jobs.filter(j=>j.status==='failed'&&j.arrivalAt>=expiresAt&&j.completedAt!==null).map(j=>j.id);
 assert.ok(losses.length>0,'actual work submitted after the local expiry fails instead of being credited as delivered');
 const failedCount=c.state.providerCampaign.customers[0].metrics.failed;
 assert.ok(SOC.provider.quote(c.state,{action:'operation',operationId:'local-spares',customerId:'starter-customer'}).blockers.length===0,'the paid recovery option remains fundable during the real outage');
 c.operationEventually('local-spares');
 c.until(()=>c.state.providerCampaign.projects.findLast(x=>x.operationId==='local-spares')?.status==='complete',12);
 assert.equal(child().connected,false,'spares restore local readiness while the external connection remains down');
 assert.equal(child().providerContinuity.autonomyMinutes,60);
 assert.equal(SOC.observe(child(),'local').ready,true,'the completed paid recovery restores effective local service before the 60 minute extension expires');
 assert.ok(c.state.providerCampaign.customers[0].metrics.failed>=failedCount,'recovery does not erase real customer losses');
 for(const id of losses)assert.equal(c.state.providerCampaign.jobs.find(j=>j.id===id)?.status,'failed','failed customer jobs remain in the campaign record');
 const saved=JSON.stringify(c.state),restored=SOC.restore(saved),command={type:'advance',minutes:1};
 assert.equal(JSON.stringify(restored),saved,'the recovered campaign remains save-valid');
 assert.deepEqual(JSON.parse(JSON.stringify(workerDispatch(SOC.restore(saved),command))),JSON.parse(JSON.stringify(SOC.dispatch(SOC.restore(saved),command))),'worker and synchronous recovery continuation agree');
 assert.equal(JSON.stringify(c.state),saved,'save and worker checks do not mutate the accepted recovery state');
});
