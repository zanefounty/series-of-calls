'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const P5=require('../src/game/23-provider-partner-progression');
const ROOM=require('../src/game/23-provider-room-integration');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility');
const SUPPORT=require('../src/game/23-provider-integration-support');
const RECEIPTS=require('../src/game/23-provider-progression-receipts');
const PRODUCTS=require('../src/game/45-products');
const BOUNDARIES=require('../src/game/43-boundaries');
const PARTNER_FIXTURE=require('./provider-progression-receipts.helpers.js');
const roomCustomerId='starter-customer',roomOperationId=ROOM.OPERATION_ID;
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function operationProject(s,id,customerId=roomCustomerId){return s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId===id);}
function roomHooks(){
 const resourceReady=(root,id)=>{const r=root?.resources?.[id];return !!r&&r.provisioning?.status==='ready'&&!!r.effective?.enabled;};
 return {room:{resourceReady,featureStatus:(root,id,feature)=>PRODUCTS.featureStatus(root,id,feature),meetingPath:root=>SOC.transport.resourcePath(root,'identity','room','meeting')},observeResource:resourceReady};
}
function ucHooks(){
 const resourceReady=(root,id)=>{const r=root?.resources?.[id];return !!r&&r.provisioning?.status==='ready'&&!!r.effective?.enabled;};
 return {observeResource:resourceReady,ucCc:{resourceReady,currentSupport:(state,customer,root)=>{const response=RESPONSIBILITY.responsibilities(state,customer.id,{observeResource:resourceReady}),record=response.records.find(x=>x.role==='msp'&&x.organisationId==='orchard-msp');return {ready:!!record,scope:record?{projectIds:record.evidence.stageProjects.map(x=>x.projectId),postingIds:record.evidence.stageProjects.map(x=>x.postingId),resources:[...record.scope].sort()}:null};},currentBoundary:(state,customer,root)=>{const scope=[];let ready=true;for(const resourceId of ['phone','recorder','archive','engage']){const contractId=root.boundaries?.bindings?.[resourceId];if(!contractId)continue;const contract=root.boundaries.contracts.find(x=>x.id===contractId);scope.push({resourceId,contractId,generation:contract?.generation||0});if(!BOUNDARIES.evaluate(root,contractId).eligible)ready=false;}return {ready,scope};}}};
}

test('AC-SOC-847 paid UC/CC accepts exact orchard MSP scope or a separately paid Disco vendor owner',()=>{
 let state=PARTNER_FIXTURE.regionalSupportReady();
 for(const sourceId of [RECEIPTS.FIRST_LIVE,RECEIPTS.SUSTAINABLE,RECEIPTS.LEVEL_TWO,RECEIPTS.NONSTARTER])state=PARTNER_FIXTURE.claimDispatched(state,sourceId);
 state=PARTNER_FIXTURE.ccUntilClock(state,500);
 state=PARTNER_FIXTURE.buy(state,{action:'purchase',offerId:'next-2',planId:'swift',stage:'base',market:'au-melbourne'});
 state=PARTNER_FIXTURE.ccUntil(state,x=>x.providerCampaign.customers.some(c=>c.id==='next-2-customer'&&c.stages.base?.status==='effective'),600,'next-2-customer');
 for(const stage of ['carrier','partner']){state=PARTNER_FIXTURE.buy(state,{action:'purchase',offerId:'next-2',planId:'swift',stage,customerId:'next-2-customer'});state=PARTNER_FIXTURE.ccUntil(state,x=>x.providerCampaign.customers.find(c=>c.id==='next-2-customer').stages[stage]?.status==='effective',600,'next-2-customer');}
 state=PARTNER_FIXTURE.ccOperation(state,'bpo','next-2-customer');
 state=PARTNER_FIXTURE.ccUntil(state,x=>PARTNER_FIXTURE.ccProject(x,'bpo','next-2-customer')?.status==='complete',600,'next-2-customer');
 state=PARTNER_FIXTURE.ccUntilClock(state,700);
 state=PARTNER_FIXTURE.ccInstallUcCcWithTargetSupport(state,'next-1-customer');
 state=PARTNER_FIXTURE.claimDispatched(state,RECEIPTS.IX);
 state=PARTNER_FIXTURE.ccDeliverRoom(state,'next-1-customer');
 state=PARTNER_FIXTURE.claimDispatched(state,RECEIPTS.LEVEL_THREE);

 const customerId='next-2-customer',hooks={...ucHooks(),customerRoot:PARTNER_FIXTURE.hooks.customerRoot,room:roomHooks().room};
 const mspProof=PARTNER_FIXTURE.ccInstallUcCcWithTargetSupport(structuredClone(state),customerId);
 const mspEvidence=P5.evaluate(mspProof,hooks);
 assert.equal(mspEvidence.count,0,'the real direct integration remains excluded until its MSP scope covers both tested endpoints');
 assert.ok(mspEvidence.missing.includes('current-owner-scope-required:workplace-to-contact-quality:recorder'));
 const directProject=operationProject(mspProof,'uc-cc-integration',customerId),directTest=directProject.operationReceipt.test;
 const mspRecord=RESPONSIBILITY.responsibilities(mspProof,customerId,{observeResource:hooks.observeResource}).records.find(x=>x.role==='msp'&&x.organisationId==='orchard-msp');
 assert.ok(mspRecord);assert.ok(mspRecord.scope.includes('phone'));assert.equal(mspRecord.scope.includes('recorder'),false);
 assert.deepEqual(directTest.supportScope.projectIds,mspRecord.evidence.stageProjects.map(x=>x.projectId).sort(),'the native direct test retains the real paid MSP stage-project proof');
 assert.deepEqual(directTest.supportScope.postingIds,mspRecord.evidence.stageProjects.map(x=>x.postingId).sort());
 assert.deepEqual(directTest.supportScope.resources,[...mspRecord.scope].sort());

 for(const id of ['recording',PARTNER_FIXTURE.UC_CC_SOURCE_OPERATION]){state=PARTNER_FIXTURE.ccOperationWhenReady(state,id,customerId);state=PARTNER_FIXTURE.ccUntil(state,x=>PARTNER_FIXTURE.ccProject(x,id,customerId)?.status==='complete',600,customerId);}
 if(state.business.workforce.support<2)state=send(state,{action:'staff',engineers:state.business.workforce.engineers,support:2});
 for(const id of [PARTNER_FIXTURE.UC_CC_TARGET_OPERATION,'service-boundary-review']){state=PARTNER_FIXTURE.ccOperationWhenReady(state,id,customerId);state=PARTNER_FIXTURE.ccUntil(state,x=>PARTNER_FIXTURE.ccProject(x,id,customerId)?.status==='complete',600,customerId);}
 const request={action:'operation',operationId:'managed-uc-cc-integration',customerId};
 const managedQuote=SOC.provider.quote(state,request);assert.deepEqual(managedQuote.blockers,[],JSON.stringify(managedQuote.blockers));
 const beforeCash=state.business.balance.cash;
 state=send(state,{...request,quoteRevision:managedQuote.atRevision});
 const project=operationProject(state,'managed-uc-cc-integration',customerId);
 assert.ok(project);assert.ok(state.business.balance.cash<beforeCash,'vendor support posts its own once-only paid operation');
 state=PARTNER_FIXTURE.ccUntil(state,x=>PARTNER_FIXTURE.ccProject(x,'managed-uc-cc-integration',customerId)?.status==='commissioning',600,customerId);
 state=PARTNER_FIXTURE.ccCompleteWithPaidReview(state,project.id,'managed-uc-cc-integration',customerId);

 const orchard=RESPONSIBILITY.responsibilities(state,customerId,{observeResource:hooks.observeResource}).records.find(x=>x.role==='msp'&&x.organisationId==='orchard-msp');
 assert.ok(orchard,'the managed vendor route retains its independent orchard MSP authority');
 assert.equal(orchard.scope.includes('recorder'),false,'the vendor contract does not widen the orchard MSP stage scope');
 const inspect=SUPPORT.supportFor(state,customerId,['phone','recorder'],{hooks});
 assert.equal(inspect.status,'ready',JSON.stringify(inspect.missing));
 const owner=inspect.owners.find(x=>x.adapter==='provider-uc-cc');
 assert.ok(owner,'a completed paid UC/CC operation creates the separately scoped vendor owner');
 assert.equal(owner.role,'vendor');assert.equal(owner.organisationId,'disco-vendor');
 assert.equal(owner.projectId,project.id);assert.equal(owner.postingId,project.postingId);
 assert.deepEqual(owner.scope,['archive','engage','phone','recorder']);
 assert.equal(SUPPORT.validateOwner(state,owner,{at:state.clock}),true);

 const evidence=P5.evaluate(state,hooks);
 assert.equal(evidence.count,1,'the paid vendor UC/CC edge is one of the five distinct routes');
 assert.equal(evidence.status,'incomplete');assert.equal(evidence.target,5);
 assert.deepEqual(evidence.evidence.integrations.map(x=>x.key),[
  'workplace-to-contact-quality:d-ms-workplace-calling:telephony->d-cisco-contact-centre:quality-review'
 ]);
 const row=evidence.evidence.integrations.find(x=>x.adapter==='provider-uc-cc');
 assert.ok(row);assert.equal(row.projectId,project.id);assert.equal(row.postingId,project.postingId);
 assert.notEqual(row.edgeId,ROOM.EDGE_ID,'the UC/CC route has a distinct identity from the existing room route');
 assert.equal(row.test.result.status,'scenario-verified');
 assert.equal(row.delivery.autonomousProvider,true);
 assert.equal(row.delivery.interaction.phase,'resolved');
 assert.equal(row.delivery.interaction.probe,false);
 assert.equal(row.delivery.recording.captureScope,'complete');
 assert.equal(row.support.role,'vendor');assert.equal(row.support.organisationId,'disco-vendor');
 assert.ok(row.support.scope.includes('recorder'));

 const owners=RESPONSIBILITY.responsibilities(state,customerId,{observeResource:hooks.observeResource});
 const msp=owners.records.find(x=>x.role==='msp'&&x.organisationId==='orchard-msp');
 assert.ok(msp);assert.equal(msp.scope.includes('recorder'),false,'the original provider-stage owner remains narrowly scoped');
 assert.notEqual(row.support.role,msp.role,'vendor support remains a distinct commercial responsibility');
 assert.equal(P5.validateEvidence(state,evidence.evidence,hooks).valid,false,'this one real managed edge still does not fulfill all five P5 paths');

 const forgedOwner={...owner,role:'msp',organisationId:'orchard-msp'};
 assert.equal(SUPPORT.validateOwner(state,forgedOwner,{at:state.clock,hooks}),false,'changing the vendor role cannot make its support an MSP contract');
 const forgedEvidence=structuredClone(evidence.evidence);
 forgedEvidence.integrations.find(x=>x.adapter==='provider-uc-cc').support=forgedOwner;
 assert.equal(P5.validateEvidence(state,forgedEvidence,hooks).valid,false,'retained P5 claims re-derive and reject forged support responsibility');

 const restored=SOC.restore(JSON.stringify(state));
 assert.deepEqual(SUPPORT.supportFor(restored,customerId,['phone','recorder'],{hooks}).owners.find(x=>x.adapter==='provider-uc-cc'),owner,'the paid vendor owner is reproducible after restore');
 assert.deepEqual(P5.evaluate(restored,hooks).evidence,evidence.evidence,'the eligible UC/CC edge survives validated restore without changing its identity');
});
