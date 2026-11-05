'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const OWN=require('../src/game/23-provider-owned-sites');

const CUSTOMER='starter-customer';
const child=s=>s.portfolio.customers.find(row=>row.id===CUSTOMER).root;
const project=(s,operationId)=>s.providerCampaign.projects.findLast(row=>row.customerId===CUSTOMER&&row.operationId===operationId);
const send=(s,command,requestId)=>SOC.dispatch(s,{type:'provider',command,...(requestId?{requestId}:{})});
function advanceUntil(s,predicate,limit=180){
 for(let n=0;n<limit&&!predicate(s);n++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.ok(predicate(s),`target state not reached; clock=${s.clock}`);
 return s;
}
function commit(s,request){
 const quote=SOC.provider.quote(s,request);
 assert.deepEqual(quote.blockers,[],JSON.stringify({clock:s.clock,request,blockers:quote.blockers}));
 return send(s,{...request,quoteRevision:quote.atRevision});
}
function operation(s,operationId,config){return commit(s,{action:'operation',operationId,customerId:CUSTOMER,...(config?{config}:{})});}
function opening(){
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 for(const stage of ['base','carrier','partner'])s=commit(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
 return advanceUntil(s,state=>state.providerCampaign.customers[0].status==='active',30);
}
function siteReady(){
 let s=opening();
 for(const [id,limit] of [['cisco-dedicated-uc',60],['primary-upstream',40],['site-diverse-ingress',40],['owned-site-operations',30]]){
  s=operation(s,id);
  s=advanceUntil(s,state=>project(state,id)?.status==='complete',limit);
 }
 const incident=s.providerCampaign.incidents.find(row=>row.customerId===CUSTOMER&&['active','acknowledged'].includes(row.status));
 if(incident){
  if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
  const repairId=incident.resource==='service'?'service-repair':'repair';
  s=operation(s,repairId);
  s=advanceUntil(s,state=>project(state,repairId)?.status==='complete',60);
 }
 const config={kind:'power',targetSite:OWN.SITE_IDS.head};
 s=operation(s,'site-recovery',config);
 s=advanceUntil(s,state=>project(state,'site-recovery')?.status==='commissioning',20);
 const recovery=project(s,'site-recovery');
 s=advanceUntil(s,state=>{
  const exercise=child(state).siteOperations?.exercises.find(x=>x.id===recovery.operationReceipt?.exerciseId);
  return exercise?.phase==='faulted'&&exercise.continuity.length>0&&exercise.continuity.every(x=>x.success);
 },40);
 return s;
}
function usage(s){return s.business.ledger.filter(row=>row.reason==='provider-site-voice-usage');}

test('site responses reject stale and wrong-project commands, then bill actual journeys exactly once',()=>{
 let s=siteReady(),recovery=project(s,'site-recovery'),exercise=child(s).siteOperations.exercises.find(x=>x.id===recovery.operationReceipt.exerciseId);
 const before=JSON.stringify(s),stale={action:'site-response',projectId:recovery.id,response:'recover',quoteRevision:s.revision-1};
 assert.throws(()=>send(s,stale),/STALE_PROVIDER_QUOTE/);
 assert.equal(JSON.stringify(s),before,'stale response must not mutate the source save');
 assert.throws(()=>send(s,{action:'site-response',projectId:project(s,'owned-site-operations').id,response:'recover',quoteRevision:s.revision}),/SITE|RECOVERY|PROJECT|ACTIONABLE|INVALID/);
 assert.equal(JSON.stringify(s),before,'wrong-project response must be atomic');

 const recover={action:'site-response',projectId:recovery.id,response:'recover',quoteRevision:s.revision};
 s=send(s,recover,'provider-1');
 const afterRecover=JSON.stringify(s),countAfterRecover=child(s).interactions.length,ledgerAfterRecover=usage(s).length;
 assert.deepEqual(send(s,recover,'provider-1'),s,'an exact duplicate request is idempotent');
 assert.equal(child(s).interactions.length,countAfterRecover);
 assert.equal(usage(s).length,ledgerAfterRecover);
 assert.throws(()=>send(s,{...recover,response:'restore'},'provider-1'),/IDEMPOTENCY_CONFLICT/);
 assert.equal(JSON.stringify(s),afterRecover);

 s=advanceUntil(s,state=>child(state).siteOperations.exercises.find(x=>x.id===exercise.id)?.phase==='restoring',30);
 const staleRestore={action:'site-response',projectId:recovery.id,response:'restore',quoteRevision:s.revision-1};
 assert.throws(()=>send(s,staleRestore),/STALE_PROVIDER_QUOTE/);
 s=send(s,{...staleRestore,quoteRevision:s.revision},'provider-2');
 s=advanceUntil(s,state=>project(state,'site-recovery')?.status==='complete',40);
 const work=child(s).providerSiteWork.filter(row=>row.projectId===recovery.id);
 assert.deepEqual(work.map(row=>row.phase).sort(),['baseline','faulted','recovered']);
 assert.ok(work.every(row=>row.billedMinutes===child(s).interactions.find(i=>i.id===row.interactionId).usageMinutes&&row.postingIds.length>=1),JSON.stringify(work));
 const cents=work.reduce((sum,row)=>sum+row.postingIds.reduce((subtotal,id)=>subtotal+s.business.ledger.find(entry=>entry.id===id).cents,0),0);
 assert.equal(cents,work.reduce((sum,row)=>sum+child(s).interactions.find(i=>i.id===row.interactionId).usageMinutes*SOC.provider.rules.plans.swift.voiceCents,0));
 const usageRows=usage(s).filter(row=>row.projectId===recovery.id);
 assert.equal(usageRows.reduce((sum,row)=>sum+row.quantity,0),work.reduce((sum,row)=>sum+row.billedMinutes,0));
 assert.equal(new Set(usageRows.map(row=>row.id)).size,usageRows.length);
 assert.equal(child(s).business,undefined,'the child has no second treasury');
 assert.equal(child(s).transport.totalCosts,0,'transport replay does not post a second charge');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('provider-site controls are read-only and raw or nested authoring paths stay closed',()=>{
 const s=siteReady(),before=JSON.stringify(s),cash=s.business.balance.cash,revision=s.revision;
 const model=SOC.provider.inspect(s);
 assert.ok(model.customers.find(row=>row.id===CUSTOMER).ownedSites);
 assert.equal(JSON.stringify(s),before);
 assert.equal(s.business.balance.cash,cash);
 assert.equal(s.revision,revision);
 assert.throws(()=>SOC.dispatch(s,{type:'configure',id:'carrier',config:{capacity:999}}),/CAMPAIGN_AUTHORING_FORBIDDEN/);
 assert.throws(()=>SOC.dispatch(s,{type:'site-operations',command:{action:'configure-site',id:OWN.SITE_IDS.head,enabled:true}}),/CAMPAIGN_AUTHORING_FORBIDDEN|INVALID_COMMAND/);
 const quoteBefore=JSON.stringify(s);
 assert.throws(()=>SOC.provider.quote(s,{action:'operation',operationId:'site-recovery',customerId:CUSTOMER,config:{kind:'power',targetSite:'invented-site'}}),/INVALID_PROVIDER_SITE_RECOVERY_SCOPE/);
 assert.equal(JSON.stringify(s),quoteBefore,'quotes and rejected target previews do not alter state');
});

test('restore rejects altered work, duplicated usage and unfunded site resources; worker continuation matches dispatch',()=>{
 let s=siteReady(),recovery=project(s,'site-recovery');
 s=send(s,{action:'site-response',projectId:recovery.id,response:'recover',quoteRevision:s.revision});
 s=advanceUntil(s,state=>child(state).siteOperations.exercises.find(x=>x.id===recovery.operationReceipt.exerciseId)?.phase==='restoring',30);
 s=send(s,{action:'site-response',projectId:recovery.id,response:'restore',quoteRevision:s.revision});
 s=advanceUntil(s,state=>project(state,'site-recovery')?.status==='complete',40);

 const badWork=structuredClone(s),work=child(badWork).providerSiteWork.find(row=>row.projectId===recovery.id);
 work.billedMinutes++;
 assert.throws(()=>SOC.restore(JSON.stringify(badWork)),/PROVIDER_SITE_WORK|PROVIDER_SITE_USAGE|INVALID/);
 const duplicate=structuredClone(s),dup=child(duplicate).providerSiteWork.find(row=>row.projectId===recovery.id);
 dup.postingIds.push(dup.postingIds[0]);
 assert.throws(()=>SOC.restore(JSON.stringify(duplicate)),/DUPLICATE_PROVIDER_SITE_USAGE|INVALID_PROVIDER_SITE_USAGE|INVALID/);
 const freeSite=structuredClone(s),root=child(freeSite);
 root.transport.sites['starter-customer-unpaid-site']=structuredClone(root.transport.sites[OWN.idsFor({id:CUSTOMER}).headTransport]);
 assert.throws(()=>SOC.restore(JSON.stringify(freeSite)),/UNFUNDED_PROVIDER_TRANSPORT_OBJECT|PROVIDER_RESILIENCE|OWNED_SITE/);

 const restored=SOC.restore(JSON.stringify(s)),command={type:'advance',minutes:1},expected=SOC.dispatch(restored,command);
 const box={postMessage:value=>{box.result=value;}};
 vm.createContext(box);vm.runInContext(SOC.workerSource(),box);
 box.onmessage({data:{id:'owned-site-authority',state:restored,command}});
 assert.equal(box.result.error,undefined,box.result.error);
 assert.deepEqual(JSON.parse(JSON.stringify(box.result.state)),expected);
 assert.deepEqual(SOC.restore(JSON.stringify(expected)),expected);
});

