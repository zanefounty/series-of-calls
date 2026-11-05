'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),ASSURANCE=require('../src/game/23-provider-integration-assurance'),POLICY=require('../src/game/23-provider-policy');
test('AC-SOC-646 integration assurance exposes paid terms but unearned public orders and worker orders refuse atomically',()=>{
 let state=SOC.create({experience:'campaign',seed:73});
 for(const stage of ['base','carrier','partner']){const request={action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})},q=SOC.provider.quote(state,request);assert.deepEqual(q.blockers,[]);state=SOC.dispatch(state,{type:'provider',command:{...request,quoteRevision:q.atRevision}});}
 for(let n=0;n<8;n++)state=SOC.dispatch(state,{type:'advance',minutes:1});
 const request={action:'operation',operationId:ASSURANCE.OPERATION_ID,customerId:'starter-customer'},before=JSON.stringify(state),quote=SOC.provider.quote(state,request);
 assert.equal(quote.setupCents,30000);assert.equal(quote.periodCents,9000);assert.equal(quote.workMinutes,6);assert.ok(quote.blockers.includes('EARNED_INTEGRATION_ASSURANCE_REQUIRED'));
 const command={type:'provider',command:{...request,quoteRevision:quote.atRevision}};assert.throws(()=>SOC.dispatch(state,command),/EARNED_INTEGRATION_ASSURANCE_REQUIRED/);assert.equal(JSON.stringify(state),before);
 let result;const context={postMessage:x=>result=x};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:1,state:JSON.parse(before),command}});assert.match(result.error,/EARNED_INTEGRATION_ASSURANCE_REQUIRED/);assert.equal(JSON.stringify(state),before);
});

test('AC-SOC-647 integration assurance retained actions stay inside funded scope after policy subset changes and cannot predate commissioning',()=>{
 const funded={status:'complete',completedAt:20,operationReceipt:{binding:{customerIds:['a','b']}}},action={kind:'incident'},work={operationId:'repair',customerId:'a',acceptedAt:20};
 assert.equal(ASSURANCE.validateAction(funded,action,work),true);
 for(const invalid of [{...work,customerId:'c'},{...work,operationId:'migration'},{...work,operationId:'carrier-headroom'},{...work,acceptedAt:19}])assert.throws(()=>ASSURANCE.validateAction(funded,action,invalid),/INVALID_PROVIDER_AUTOMATION_LINEAGE/);
 for(const kind of ['migration','headroom','missing-stage',undefined])assert.throws(()=>ASSURANCE.validateAction(funded,{kind},work),/INVALID_PROVIDER_AUTOMATION_LINEAGE/);
 for(const project of [{...funded,status:'provisioning'},{...funded,completedAt:null}])assert.throws(()=>ASSURANCE.validateAction(project,action,work),/INVALID_PROVIDER_AUTOMATION_LINEAGE/);
 // Current editable scope may narrow; lawful earlier work remains bound to the purchased scope.
 assert.equal(ASSURANCE.validateAction({...funded,config:{customerIds:['b']}},action,work),true);
 const context={};vm.createContext(context);vm.runInContext(ASSURANCE.source()+';globalThis.API=SOC_PROVIDER_INTEGRATION_ASSURANCE;',context);assert.throws(()=>context.API.validateAction(funded,action,{...work,customerId:'c'}),/INVALID_PROVIDER_AUTOMATION_LINEAGE/);
});

// Isolated planner fixture: this is not an earned Provider claim or campaign proof.
function fixture(){
 const customers=[{id:'a',market:'au-sydney'},{id:'b',market:'au-melbourne'},{id:'c',market:'au-sydney'}].map(c=>({...c,portfolioId:c.id,status:'active'}));
 const edge={id:'calling-to-quality',source:'calling',target:'contact',sourceVersion:'v1',targetVersion:'v1',sourceGeneration:1,targetGeneration:1,checkedAt:10,features:[{sourceFeature:'telephony',targetFeature:'quality-review'}]};
 const participants=customers.map((c,i)=>({customerId:c.id,integrations:i<2?[structuredClone(edge)]:[]})),receipt={id:'claim-t2',sourceId:ASSURANCE.SOURCE_ID,at:80,customerIds:['a','b','c'],sourceEvidence:{kind:'provider-regional-support-window-v1',interval:{from:20,to:80},markets:['au-sydney','au-melbourne'],samples:[{at:80,participants}]}};
 return {clock:90,providerCampaign:{contentVersion:'provider-campaigns-8',customers,progressionReceipts:{receipts:[receipt]}},portfolio:{customers:customers.map(c=>({id:c.id,root:{}}))}};
}
test('AC-SOC-648 integration assurance planner pins earned customer and integration versions and refuses changed boundaries without mutating state',()=>{
 const state=fixture(),hooks={boundaryCheck:()=>({eligible:true}),integrationValidAt:()=>true},before=JSON.stringify(state),eligibility=ASSURANCE.eligibility(state,'a',hooks);assert.equal(eligibility.eligible,true);assert.equal(eligibility.binding.edges.length,2);
 const project={id:'project-a',customerId:'a',acceptedAt:90};project.operationReceipt=ASSURANCE.createReceipt(state,project,hooks);assert.equal(ASSURANCE.validateReceipt(state,project),true);
 const config={...POLICY.create(),customerIds:['a','b'],rules:[{id:'repair',kind:'assurance',enabled:true,customerIds:['a'],operationId:'repair',stage:null,resourceId:null,thresholdPercent:null}]};assert.equal(ASSURANCE.validatePolicy(state,project,config),true);
 assert.throws(()=>ASSURANCE.validatePolicy(state,project,{...config,customerIds:['d']}),/EXPLICIT_SCOPE/);
 assert.throws(()=>ASSURANCE.validatePolicy(state,project,{...config,rules:[{...config.rules[0],kind:'provisioning'}]}),/EXPLICIT_SCOPE/);
 for(const mutate of [r=>r.binding.customerIds.push('d'),r=>r.binding.markets.push('jp-tokyo'),r=>r.binding.edges[0].edge.sourceGeneration++,r=>r.binding.receiptId='foreign']){const changed=structuredClone(project);mutate(changed.operationReceipt);assert.throws(()=>ASSURANCE.validateReceipt(state,changed),/INVALID_PROVIDER_INTEGRATION_ASSURANCE/);}
 assert.deepEqual(ASSURANCE.current(state,project.operationReceipt.binding,{...hooks,boundaryCheck:()=>({eligible:false})}).missing,['INTEGRATION_ASSURANCE_BOUNDARY_REQUIRED']);
 assert.deepEqual(ASSURANCE.current(state,project.operationReceipt.binding,{...hooks,integrationValidAt:()=>false}).missing,['INTEGRATION_ASSURANCE_EDGE_CHANGED']);
 assert.equal(ASSURANCE.current(state,project.operationReceipt.binding,hooks).eligible,true);assert.equal(JSON.stringify(state),before);
 const context={};vm.createContext(context);vm.runInContext(ASSURANCE.source()+';globalThis.API=SOC_PROVIDER_INTEGRATION_ASSURANCE;',context);assert.deepEqual(JSON.parse(JSON.stringify(context.API.scope(state,'a'))),ASSURANCE.scope(state,'a'));
});
