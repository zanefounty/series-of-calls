'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');

function workerDispatch(state,command){
 let result;
 const context={postMessage:value=>{result=value;}};
 vm.createContext(context);vm.runInContext(SOC.workerSource(),context);
 context.onmessage({data:{id:1,state,command}});
 assert.ok(result,'provider worker returns a command result');
 assert.equal(result.error,undefined,result.error||'worker command should succeed');
 return result.state;
}

function parityAndPersistence(state,label){
 const source=JSON.stringify(state),restored=SOC.restore(source);
 assert.equal(JSON.stringify(restored),source,`${label} restores byte-for-byte`);
 const command={type:'advance',minutes:1};
 const sync=SOC.dispatch(SOC.restore(source),command);
 const worker=workerDispatch(SOC.restore(source),command);
 assert.deepEqual(JSON.parse(JSON.stringify(worker)),JSON.parse(JSON.stringify(sync)),`${label} worker and synchronous continuation agree`);
 assert.equal(JSON.stringify(SOC.restore(JSON.stringify(sync))),JSON.stringify(sync),`${label} continuation remains save-valid`);
 assert.equal(JSON.stringify(state),source,`${label} parent state was not mutated`);
 return sync;
}

test('provider campaign saves and worker continuation preserve real projects, interactions, coaching and incident recovery',()=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',difficulty:'normal'});
 const baseQuote=SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'}),beforeQuote=JSON.stringify(s);
 assert.deepEqual(baseQuote.blockers,[]);assert.equal(JSON.stringify(s),beforeQuote,'quote does not mutate its input');
 const baseCommand={type:'provider',requestId:'provider-1',command:{...baseQuote.request,quoteRevision:s.revision}};
 s=SOC.dispatch(s,baseCommand);
 const afterFirst=JSON.stringify(s),duplicate=SOC.dispatch(s,baseCommand);
 assert.equal(JSON.stringify(duplicate),afterFirst,'exact request retry is idempotent');
 assert.throws(()=>SOC.dispatch(s,{...baseCommand,command:{...baseCommand.command,stage:'carrier'}}),/IDEMPOTENCY_CONFLICT/);
 assert.equal(JSON.stringify(s),afterFirst,'conflicting retry leaves the accepted order unchanged');
 assert.equal(s.providerRequestSequence,1);
 assert.equal(s.providerCampaign.projects[0].status,'running');
 s=parityAndPersistence(s,'funded base project');

 // The request sequence is monotonic even when a client jumps ahead. Unknown older ids
 // cannot be replayed to create new work after that watermark advances.
 const carrier={action:'purchase',offerId:'starter',planId:'swift',stage:'carrier',customerId:'starter-customer'},carrierQuote=SOC.provider.quote(s,carrier);
 assert.deepEqual(carrierQuote.blockers,[]);
 const carrierCommand={type:'provider',requestId:'provider-7',command:{...carrier,quoteRevision:s.revision}};
 s=SOC.dispatch(s,carrierCommand);assert.equal(s.providerRequestSequence,7);
 const beforeExpired=JSON.stringify(s);
 assert.throws(()=>SOC.dispatch(s,{type:'provider',requestId:'provider-2',command:{action:'continue-career'}}),/EXPIRED_PROVIDER_REQUEST/);
 assert.equal(JSON.stringify(s),beforeExpired,'expired request leaves current campaign untouched');
 const partner={action:'purchase',offerId:'starter',planId:'swift',stage:'partner',customerId:'starter-customer'},partnerQuote=SOC.provider.quote(s,partner);
 assert.deepEqual(partnerQuote.blockers,[]);
 s=SOC.dispatch(s,{type:'provider',requestId:'provider-8',command:{...partner,quoteRevision:s.revision}});
 assert.equal(s.providerRequestSequence,8);
 s=SOC.dispatch(s,{type:'advance',minutes:12});
 assert.equal(s.providerCampaign.customers[0].status,'active');
 assert.ok(s.providerCampaign.projects.every(x=>x.status==='complete'));

 // Pure inspection and save migration checks against a live campaign with actual work.
 const pure=JSON.stringify(s);
 SOC.provider.inspect(s);SOC.calculate(s);SOC.validateState(s);SOC.restore(pure);
 assert.equal(JSON.stringify(s),pure,'inspection, calculation, validation and restore do not mutate the supplied state');
 const child=()=>s.portfolio.customers[0].root;
 const deliver=()=>s.providerCampaign.jobs.some(j=>j.status==='completed'&&j.interactionId);
 for(let minute=0;minute<20&&!deliver();minute++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.ok(deliver(),'public campaign demand produced a real customer interaction');
 assert.ok(child().interactions.length>0,'delivered customer work is stored in its child root');
 const hasLiveCall=()=>child().interactions.some(i=>['connected','queued'].includes(i.phase));
 if(!hasLiveCall()){
  for(let minute=0;minute<8&&!hasLiveCall();minute++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 }
 assert.ok(hasLiveCall(),'campaign save includes an actual connected call or queued customer work');
 s=parityAndPersistence(s,'live call or queued customer work');

 const sendOperation=operationId=>{
  const request={action:'operation',operationId,customerId:'starter-customer'},quote=SOC.provider.quote(s,request);
  assert.deepEqual(quote.blockers,[],`${operationId}: ${quote.blockers.join(',')}`);
  s=SOC.dispatch(s,{type:'provider',requestId:`provider-${s.providerRequestSequence+1}`,command:{...request,quoteRevision:s.revision}});
 };
 const childRoot=()=>s.portfolio.customers[0].root;
 if(!childRoot().workforceOps?.providerCover){
  sendOperation('bpo');
  const bpoProject=s.providerCampaign.projects.findLast(x=>x.operationId==='bpo');
  assert.equal(bpoProject.status,'running');
  s=parityAndPersistence(s,'funded BPO project');
  for(let minute=0;minute<12&&s.providerCampaign.projects.find(x=>x.id===bpoProject.id).status!=='complete';minute++)s=SOC.dispatch(s,{type:'advance',minutes:1});
  assert.equal(s.providerCampaign.projects.find(x=>x.id===bpoProject.id).status,'complete');
 }
 // The scenario creates a real carrier incident after delivered work. Save both its active
 // state and an accepted repair project while the customer still has outstanding work.
 const activeIncident=()=>s.providerCampaign.incidents.find(x=>x.status==='active');
 for(let minute=0;minute<40&&!activeIncident();minute++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 const incident=activeIncident();assert.ok(incident,'actual demand activated the authored carrier incident');
 s=parityAndPersistence(s,'active carrier incident');
 s=SOC.dispatch(s,{type:'provider',requestId:`provider-${s.providerRequestSequence+1}`,command:{action:'acknowledge-incident',incidentId:incident.id}});
 const repair={action:'operation',operationId:'repair',customerId:incident.customerId},repairQuote=SOC.provider.quote(s,repair);
 assert.deepEqual(repairQuote.blockers,[]);
 s=SOC.dispatch(s,{type:'provider',requestId:`provider-${s.providerRequestSequence+1}`,command:{...repair,quoteRevision:s.revision}});
 const repairProject=s.providerCampaign.projects.findLast(x=>x.operationId==='repair');
 assert.equal(repairProject.status,'running');
 sendOperation('coaching');
 const coachingProject=s.providerCampaign.projects.findLast(x=>x.operationId==='coaching');
 assert.equal(coachingProject.status,'running');
 s=parityAndPersistence(s,'active coaching, repair and carrier incident projects');
 s=SOC.dispatch(s,{type:'advance',minutes:4});
 assert.equal(s.providerCampaign.projects.find(x=>x.id===coachingProject.id).status,'commissioning');
 assert.equal(childRoot().workforceOps.coaching.at(-1).status,'in-progress');
 s=parityAndPersistence(s,'coaching worker in progress after repair');
});
