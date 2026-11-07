'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer';
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
const project=(s,id)=>s.providerCampaign.projects.findLast(row=>row.operationId===id);
function buy(s,command){const quote=SOC.provider.quote(s,command);assert.deepEqual(quote.blockers,[],`${command.operationId||command.stage}: ${quote.blockers.join(',')}`);return send(s,{...command,quoteRevision:quote.atRevision});}
function tick(s){const incident=s.providerCampaign.incidents.find(row=>row.status==='active');if(incident){s=send(s,{action:'acknowledge-incident',incidentId:incident.id});const id=incident.kind==='transport-domain'?'transport-repair':incident.resource==='service'?'service-repair':'repair',request={action:'operation',operationId:id,customerId};if(!SOC.provider.quote(s,request).blockers.length)s=buy(s,request);}return SOC.dispatch(s,{type:'advance',minutes:1});}
function until(s,predicate,limit=180){for(let n=0;n<limit&&!predicate(s);n++)s=tick(s);assert.ok(predicate(s),`condition not reached at minute ${s.clock}`);return s;}
function opening(){let s=SOC.create({experience:'campaign',scenario:'smb',opening:'win',difficulty:'easy',seed:383});assert.deepEqual(s.providerCampaign.autoIntegrationChecks,{version:1,enabled:true,suspended:false});for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=until(s,row=>row.providerCampaign.customers[0].stages[stage].status==='effective');}return s;}
function room(s){for(const id of ['recording','ms-meetings-room','cisco-meetings-interoperability','primary-upstream']){s=buy(s,{action:'operation',operationId:id,customerId});s=until(s,row=>project(row,id)?.status==='complete');}s=buy(s,{action:'operation',operationId:'direct-room-integration',customerId});return until(s,row=>project(row,'direct-room-integration')?.status==='commissioning');}

test('included paid room check runs once through Provider dispatch and retains its real test without a second charge',()=>{
 let s=room(opening()),p=project(s,'direct-room-integration');assert.equal(p.operationReceipt.test?.status,'scenario-verified');const events=s.providerCampaign.events.filter(e=>e.code==='SERVICE_INTEGRATION_TESTED'&&e.projectId===p.id&&e.policyVersion===1);assert.equal(events.length,1);assert.equal(events[0].at,p.operationReceipt.test.checkedAt);const cash=s.business.balance.cash;
 s=tick(s);p=project(s,'direct-room-integration');assert.equal(s.business.balance.cash,cash,'the included check creates no second setup charge');assert.equal(s.providerCampaign.events.filter(e=>e.code==='SERVICE_INTEGRATION_TESTED'&&e.projectId===p.id).length,1);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=structuredClone(s);forged.providerCampaign.autoIntegrationChecks.version=2;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_AUTO_INTEGRATION_POLICY/);const falseLineage=structuredClone(s);falseLineage.providerCampaign.events.find(e=>e.code==='SERVICE_INTEGRATION_TESTED'&&e.policyVersion===1).projectId='provider-project-999';assert.throws(()=>SOC.restore(JSON.stringify(falseLineage)),/INVALID_PROVIDER_AUTO_INTEGRATION_TEST/);
});

test('suspension retains manual paid-project test and refuses a policy claim while suspended',()=>{
 let s=opening();s=send(s,{action:'configure-auto-integration-checks',enabled:true,suspended:true,quoteRevision:s.revision});assert.equal(s.providerCampaign.autoIntegrationChecks.suspended,true);s=room(s);const p=project(s,'direct-room-integration');assert.equal(p.operationReceipt.test,null);const command={action:'test-service-integration',projectId:p.id,quoteRevision:s.revision,policyVersion:1},before=JSON.stringify(s);assert.throws(()=>send(s,command),/PROVIDER_AUTO_INTEGRATION_POLICY_REFUSED/);assert.equal(JSON.stringify(s),before);s=send(s,{action:'test-service-integration',projectId:p.id,quoteRevision:s.revision});assert.equal(project(s,'direct-room-integration').operationReceipt.test.status,'scenario-verified');assert.equal(s.providerCampaign.events.filter(e=>e.code==='SERVICE_INTEGRATION_TESTED'&&e.projectId===p.id&&e.policyVersion===1).length,0);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('older campaign saves remain manual and policy changes require the current revision',()=>{
 const legacy=SOC.create({experience:'campaign',scenario:'smb',seed:383});assert.equal(legacy.providerCampaign.autoIntegrationChecks,undefined);assert.deepEqual(SOC.restore(JSON.stringify(legacy)),legacy);assert.throws(()=>send(legacy,{action:'configure-auto-integration-checks',enabled:true,suspended:false,quoteRevision:legacy.revision}),/PROVIDER_AUTO_INTEGRATION_POLICY_REQUIRED/);
 const current=opening(),before=JSON.stringify(current);assert.throws(()=>send(current,{action:'configure-auto-integration-checks',enabled:true,suspended:true,quoteRevision:current.revision-1}),/STALE_PROVIDER_QUOTE/);assert.equal(JSON.stringify(current),before);
});

test('new mission careers opt into included checks while historical mission saves keep manual control',()=>{
 for(const scenario of ['enterprise','government','defence']){
  const current=SOC.create({experience:'campaign',scenario,opening:'win',seed:383});
  assert.deepEqual(current.providerCampaign.autoIntegrationChecks,{version:1,enabled:true,suspended:false});
  assert.equal(current.providerCampaign.staffingCommitmentVersion,undefined);
  assert.equal(current.providerCampaign.autoReceiptPolicy,undefined);
  assert.deepEqual(SOC.restore(JSON.stringify(current)),current);
  const manual=SOC.create({experience:'campaign',scenario,seed:383});
  assert.equal(manual.providerCampaign.autoIntegrationChecks,undefined);
  assert.deepEqual(SOC.restore(JSON.stringify(manual)),manual);
  const suspended=send(current,{action:'configure-auto-integration-checks',enabled:true,suspended:true,quoteRevision:current.revision});
  assert.equal(suspended.providerCampaign.autoIntegrationChecks.suspended,true);
  assert.deepEqual(SOC.restore(JSON.stringify(suspended)),suspended);
  const forged=structuredClone(current);forged.providerCampaign.autoIntegrationChecks.version=2;
  assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_AUTO_INTEGRATION_POLICY/);
 }
});

test('automatic compatibility scan matches the generated worker on a funded commissioning minute',()=>{
 let s=opening();for(const id of ['recording','ms-meetings-room','cisco-meetings-interoperability','primary-upstream']){s=buy(s,{action:'operation',operationId:id,customerId});s=until(s,row=>project(row,id)?.status==='complete');}s=buy(s,{action:'operation',operationId:'direct-room-integration',customerId});const before=until(s,row=>project(row,'direct-room-integration')?.status==='running'&&row.clock===project(row,'direct-room-integration').dueAt-1),command={type:'advance',minutes:1},expected=SOC.dispatch(before,command),box={postMessage:reply=>{box.reply=reply;}};vm.createContext(box);vm.runInContext(SOC.workerSource(),box);box.onmessage({data:{id:'included-check',state:structuredClone(before),command}});assert.equal(box.reply.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(box.reply.state)),expected);assert.equal(project(expected,'direct-room-integration').operationReceipt.test.status,'scenario-verified');
});

test('included calling-to-contact check records the scoped supplier and boundary evidence without manual bookkeeping',()=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',opening:'win',difficulty:'easy',seed:73});s=send(s,{action:'staff',engineers:4,support:4});for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=until(s,row=>row.providerCampaign.customers[0].stages[stage].status==='effective');if(stage==='base'){s=buy(s,{action:'operation',operationId:'recording',customerId});s=until(s,row=>project(row,'recording')?.status==='complete');}}
 for(const id of ['bpo','ms-workplace-calling','cisco-contact-centre']){s=buy(s,{action:'operation',operationId:id,customerId});s=until(s,row=>project(row,id)?.status==='complete');}s=until(s,row=>row.clock>=60);s=buy(s,{action:'operation',operationId:'uc-cc-integration',customerId});s=until(s,row=>project(row,'uc-cc-integration')?.status==='commissioning');const p=project(s,'uc-cc-integration');assert.equal(p.operationReceipt.test?.result.status,'scenario-verified');assert.equal(p.operationReceipt.test?.at,s.clock);assert.equal(s.providerCampaign.events.filter(e=>e.code==='SERVICE_INTEGRATION_TESTED'&&e.projectId===p.id&&e.policyVersion===1).length,1);assert.equal(p.operationReceipt.task,null,'customer work and paid review are still needed for effective service');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
