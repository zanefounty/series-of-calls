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

function assuranceBoundaryRoot(customerId){
 const flow=resource=>({resource,processingRegions:['US'],storageRegions:['US'],accessRoles:['supervisor']}),contractId=`boundary-${customerId}`;
 return {tenant:customerId,resources:{carrier:{fault:null},phone:{generation:2,provisioning:{status:'ready',generation:2},effective:{}},recorder:{generation:2,provisioning:{status:'ready',generation:2},effective:{}},archive:{generation:2,provisioning:{status:'ready',generation:2},effective:{}},engage:{generation:2,provisioning:{status:'ready',generation:2},effective:{}}},boundaries:{bindings:{phone:contractId,engage:contractId},contracts:[{id:contractId,generation:2,desired:{flows:[flow('phone'),flow('engage')]},effective:{flows:[flow('phone'),flow('engage')]}}]},boundaryChecks:{identity:{eligible:true,blocking:[]},phone:{eligible:true,blocking:[]},engage:{eligible:true,blocking:[]}},products:{pack:'soc-products-1',deployments:[{id:'d-ms-workplace-calling',generation:1},{id:'d-cisco-contact-centre',generation:1}],integrations:[]},commands:[],interactions:[],cases:{},records:[],providerReviews:[]};
}
function attachRetainedTaskFixture(s,project,root){
 const p=project,r=project.operationReceipt,interactionId=`interaction-${p.customerId}`,caseId=`case-${p.customerId}`,jobId=`provider-job-${p.customerId}`,arrivalId=`provider-event-${p.customerId}`,recordingId=`recording-${p.customerId}`,qualityId=`quality-${p.customerId}`,qualityPosting=`entry-${p.customerId}-quality`,acceptedFeatures=[{resource:'phone',bindings:[{deploymentId:r.plan.source.deploymentId,feature:r.plan.source.feature,resourceId:'phone'}]},{resource:'recorder',bindings:[{deploymentId:r.plan.target.deploymentId,feature:r.plan.target.feature,resourceId:'recorder'}]}];
 const job={id:jobId,customerId:p.customerId,channel:'voice',status:'completed',arrivalAt:21,completedAt:24,interactionId,caseId},arrival={id:arrivalId,at:21,code:'CUSTOMER_WORK_ARRIVED',customerId:p.customerId,jobId,caseId,channel:'voice',interactionId},interaction={id:interactionId,channel:'voice',phase:'resolved',tenant:root.tenant,agent:'agent-1',caseId,startedAt:21,finishedAt:24,probe:false,obligations:[],trace:acceptedFeatures.map(row=>({code:'PRODUCT_FEATURE_ACCEPTED',resource:row.resource,bindings:structuredClone(row.bindings)}))},recording={id:recordingId,kind:'recording',interaction:interactionId,createdAt:24,expiresAt:null,held:false,deleted:false,captureScope:'complete',access:['supervisor']},criteria={completeCapture:true,caseContinuity:true,delivered:true,noOutstandingObligation:true},quality={projectId:qualityId,postingId:qualityPosting,acceptedAt:25,completedAt:28,reviewAt:26,reviewer:'supervisor',agent:'agent-1',interactionId,caseId,recordingId,criteria};
 root.interactions.push(interaction);root.cases[caseId]={id:caseId,tenant:root.tenant,interactions:[interactionId]};root.records.push(recording);root.providerReviews.push({projectId:qualityId,postingId:qualityPosting,at:quality.reviewAt,reviewer:'supervisor',interactionId,caseId,recordingId,agent:'agent-1',criteria});s.providerCampaign.jobs.push(job);s.providerCampaign.events.push(arrival);s.providerCampaign.projects.push({id:qualityId,customerId:p.customerId,kind:'operation',operationId:'quality',status:'complete',acceptedAt:quality.acceptedAt,completedAt:quality.completedAt,configSubmittedAt:quality.reviewAt+1,postingId:qualityPosting,setupCents:9000});
 r.task={version:1,projectId:p.id,postingId:p.postingId,customerId:p.customerId,tenant:root.tenant,edgeId:r.plan.edge.id,plan:structuredClone(r.plan),test:structuredClone(r.test),autonomousProvider:true,job:{id:job.id,channel:job.channel,status:job.status,arrivalAt:job.arrivalAt,completedAt:job.completedAt,interactionId:job.interactionId,caseId:job.caseId},arrival,interaction:{id:interaction.id,channel:interaction.channel,phase:interaction.phase,probe:false,tenant:interaction.tenant,agent:interaction.agent,caseId:interaction.caseId,startedAt:interaction.startedAt,finishedAt:interaction.finishedAt,obligations:[],acceptedFeatures},case:{id:caseId,tenant:root.tenant,interactions:[interactionId]},recording,quality};
}
function nativeAssuranceFixture(){
 const s=fixture(),nativeResult={checkedAt:20,checks:[{sourceFeature:'telephony',targetFeature:'quality-review',source:{available:true},target:{available:true}}],externalSupportClaim:false,reasons:[],sourceGeneration:1,sourceVersion:'scenario-1',status:'scenario-verified',synthetic:true,targetGeneration:1,targetVersion:'scenario-1'},edge={id:'workplace-to-contact-quality',source:'d-ms-workplace-calling',target:'d-cisco-contact-centre',sourceVersion:'scenario-1',targetVersion:'scenario-1',sourceGeneration:1,targetGeneration:1,checkedAt:20,features:[{sourceFeature:'telephony',targetFeature:'quality-review'}]},supportResources=['archive','engage','phone','recorder'];
 s.providerCampaign.incidents=[];s.providerCampaign.projects=[];s.providerCampaign.jobs=[];s.providerCampaign.events=[];s.business={ledger:[],organisations:{'orchard-msp':{roles:['msp','reseller']}}};s.portfolio.customers.forEach((portfolio,index)=>{portfolio.market=s.providerCampaign.customers[index].market;portfolio.root=assuranceBoundaryRoot(portfolio.id);});
 const participants=[];
 for(const customer of s.providerCampaign.customers.slice(0,2)){
  const customerId=customer.id,root=s.portfolio.customers.find(row=>row.id===customerId).root,scope=[{stage:'base',resources:['phone','engage']},{stage:'carrier',resources:['recorder']},{stage:'partner',resources:['archive']}].map((row,index)=>{const id=`${customerId}-stage-${row.stage}`,postingId=`entry-${customerId}-${index+1}`;s.providerCampaign.projects.push({id,customerId,kind:'stage',stage:row.stage,status:'complete',completedAt:15,postingId,setupCents:100,resources:row.resources});s.business.ledger.push({id:postingId,category:'cost',reason:'provider-implementation',providerCampaign:true,customerId,projectId:id,cents:100,at:10});return {id,postingId};});
  const projectId=`paid-${customerId}`,postingId=`entry-${customerId}-integration`,boundaryScope=['engage','phone'].map(resourceId=>({resourceId,contractId:`boundary-${customerId}`,generation:2})),testSnapshot={version:1,at:20,edgeId:edge.id,result:structuredClone(nativeResult),supportScope:{projectIds:scope.map(row=>row.id).sort(),postingIds:scope.map(row=>row.postingId).sort(),resources:supportResources},boundaryScope};
  const plan={version:1,projectId,postingId,customerId,tenant:customerId,source:{deploymentId:edge.source,family:'microsoft:workplace-phone',productVersion:edge.sourceVersion,generation:edge.sourceGeneration,feature:'telephony',resourceId:'phone',binding:{feature:'telephony',resources:['phone']}},target:{deploymentId:edge.target,family:'cisco:contact-center',productVersion:edge.targetVersion,generation:edge.targetGeneration,feature:'quality-review',resourceId:'recorder',binding:{feature:'quality-review',resources:['recorder']}},edge:{id:edge.id,source:edge.source,target:edge.target,features:structuredClone(edge.features)},edgeAction:'create',sourceIds:['uc-new:family:microsoft:workplace-phone','uc-new:family:cisco:contact-center']};
  const project={id:projectId,kind:'operation',operationId:'uc-cc-integration',customerId,status:'complete',acceptedAt:10,completedAt:30,configSubmittedAt:20,setupCents:500,postingId,expectedGenerations:{phone:2,recorder:2,archive:2,engage:2},operationReceipt:{kind:'provider-uc-cc-integration',version:1,projectId,postingId,submittedAt:20,plan,test:testSnapshot,task:null}};
  s.providerCampaign.projects.push(project);s.business.ledger.push({id:postingId,category:'cost',reason:'provider-operation',providerCampaign:true,customerId,projectId,cents:project.setupCents,at:project.acceptedAt});root.products.integrations=[{...structuredClone(edge),result:structuredClone(nativeResult)}];attachRetainedTaskFixture(s,project,root);participants.push({customerId,integrations:[structuredClone(edge)]});
 }
 s.providerCampaign.progressionReceipts.receipts[0].sourceEvidence.samples.at(-1).participants=participants;
 return {state:s,edge,boundaryCheck:(root,resource)=>structuredClone(root.boundaryChecks[resource]||{eligible:true,blocking:[]})};
}

test('AC-SOC-832 paid assurance policyCurrent allows only an earned native integration under an active carrier outage',()=>{
 const {state,boundaryCheck}=nativeAssuranceFixture(),binding=ASSURANCE.scope(state,'a'),hooks={boundaryCheck},strict=ASSURANCE.current(state,binding,hooks);assert.equal(require('../src/game/23-provider-uc-cc-integration').validateProject(state,'paid-b'),true);assert.equal(strict.eligible,true);assert.deepEqual(ASSURANCE.policyCurrent(state,binding,hooks),{eligible:true,missing:[],degraded:false,incidents:[]});
 const root=state.portfolio.customers.find(row=>row.id==='b').root,incident={id:'provider-incident-1',customerId:'b',resource:'carrier',kind:'outage',fault:'OUTAGE',status:'acknowledged',createdAt:25,dueAt:26,activatedAt:26,acknowledgedAt:27,resolvedAt:null,receipt:{resource:'carrier',revision:4}},before=JSON.stringify(state);
 state.providerCampaign.incidents.push(incident);root.resources.carrier.fault='OUTAGE';root.boundaryChecks.identity={eligible:false,blocking:[{code:'ADMIN_PATH_UNAVAILABLE'}]};root.boundaryChecks.phone={eligible:false,blocking:[{code:'ADMIN_PATH_UNAVAILABLE'},{code:'BOUNDARY_RESOURCE_UNAVAILABLE'}]};root.boundaryChecks.engage={eligible:false,blocking:[{code:'BOUNDARY_RESOURCE_UNAVAILABLE'}]};
 const policy=ASSURANCE.policyCurrent(state,binding,{boundaryCheck,integrationValidAt:(_s,c)=>c.id!=='b'});assert.deepEqual(policy,{eligible:true,missing:[],degraded:true,incidents:[incident.id]});assert.equal(ASSURANCE.current(state,binding,{boundaryCheck,integrationValidAt:(_s,c)=>c.id!=='b'}).eligible,false);assert.notEqual(JSON.stringify(state),before);const frozen=JSON.stringify(state);ASSURANCE.policyCurrent(state,binding,{boundaryCheck});assert.equal(JSON.stringify(state),frozen);
});

test('AC-SOC-833 paid policy outage recovery refuses unrelated blockers, false incidents and native task drift',()=>{
 const make=()=>{const value=nativeAssuranceFixture(),{state}=value,root=state.portfolio.customers.find(row=>row.id==='b').root,binding=ASSURANCE.scope(state,'a');state.providerCampaign.incidents=[{id:'provider-incident-1',customerId:'b',resource:'carrier',kind:'outage',fault:'OUTAGE',status:'active',createdAt:25,dueAt:26,activatedAt:26,acknowledgedAt:null,resolvedAt:null,receipt:{resource:'carrier',revision:4}}];root.resources.carrier.fault='OUTAGE';root.boundaryChecks.identity={eligible:false,blocking:[{code:'ADMIN_PATH_UNAVAILABLE'}]};return {...value,binding,root};};
 const positive=make();assert.equal(ASSURANCE.policyCurrent(positive.state,positive.binding,{boundaryCheck:positive.boundaryCheck}).eligible,true);
 const blocked=mutate=>{const value=make();mutate(value);assert.equal(ASSURANCE.policyCurrent(value.state,value.binding,{boundaryCheck:value.boundaryCheck}).eligible,false);};
 const noOutage=nativeAssuranceFixture();assert.equal(ASSURANCE.policyCurrent(noOutage.state,ASSURANCE.scope(noOutage.state,'a'),{boundaryCheck:noOutage.boundaryCheck,integrationValidAt:()=>false}).eligible,false);
 blocked(({state})=>{state.providerCampaign.incidents=[];});
 const outageHook=make();assert.equal(ASSURANCE.policyCurrent(outageHook.state,outageHook.binding,{boundaryCheck:outageHook.boundaryCheck,integrationValidAt:(_s,c)=>c.id!=='b'}).eligible,true);
 const unaffectedHook=make();assert.equal(ASSURANCE.policyCurrent(unaffectedHook.state,unaffectedHook.binding,{boundaryCheck:unaffectedHook.boundaryCheck,integrationValidAt:(_s,c)=>c.id!=='a'}).eligible,false);
 blocked(({state})=>{state.providerCampaign.incidents[0].customerId='c';});
 blocked(({state})=>{state.providerCampaign.incidents[0].resource='phone';});
 blocked(({state})=>{state.providerCampaign.incidents[0].fault='CAPACITY';});
 blocked(({state})=>{state.providerCampaign.incidents[0].status='resolved';state.providerCampaign.incidents[0].resolvedAt=28;});
 const unboundIncident=make(),unboundRoot=unboundIncident.state.portfolio.customers.find(row=>row.id==='c').root,previouslyAffected=unboundIncident.root;unboundIncident.state.providerCampaign.incidents[0].customerId='c';previouslyAffected.resources.carrier.fault=null;previouslyAffected.boundaryChecks.identity={eligible:true,blocking:[]};unboundRoot.resources.carrier.fault='OUTAGE';unboundRoot.boundaryChecks.identity={eligible:false,blocking:[{code:'ADMIN_PATH_UNAVAILABLE'}]};assert.equal(ASSURANCE.policyCurrent(unboundIncident.state,unboundIncident.binding,{boundaryCheck:unboundIncident.boundaryCheck}).eligible,false);
 blocked(({root})=>{root.boundaryChecks.phone={eligible:false,blocking:[]};});
 for(const code of ['BOUNDARY_CONTRACT_REQUIRED','BOUNDARY_ACTUAL_LOCATION_MISMATCH','BOUNDARY_LICENCE_UNAVAILABLE'])blocked(({root})=>{root.boundaryChecks.phone={eligible:false,blocking:[{code}]};});
 for(const id of ['phone','recorder'])blocked(({root})=>{root.resources[id].generation++;root.resources[id].provisioning.generation++;});
 blocked(({root})=>{root.boundaries.contracts[0].generation++;});
 blocked(({root})=>{root.boundaries.bindings.phone='foreign-boundary';});
 blocked(({state})=>{state.providerCampaign.projects.find(p=>p.customerId==='b'&&p.operationId==='uc-cc-integration').operationReceipt.test.boundaryScope=[];});
 blocked(({state})=>{state.providerCampaign.projects.find(p=>p.customerId==='b'&&p.operationId==='uc-cc-integration').operationReceipt.task=null;});
 const nullBoundary=make();assert.equal(ASSURANCE.policyCurrent(nullBoundary.state,nullBoundary.binding,{boundaryCheck:()=>null}).eligible,false);
 blocked(({state,edge,root})=>{root.products.deployments.find(d=>d.id===edge.source).generation++;});
 blocked(({root})=>{root.products.integrations[0].result.status='blocked';});
 blocked(({root})=>{root.resources.carrier.fault=null;});
});

test('AC-SOC-834 degraded paid assurance policyCurrent is worker-source compatible and input-pure',()=>{
 const {state,boundaryCheck}=nativeAssuranceFixture(),binding=ASSURANCE.scope(state,'a'),root=state.portfolio.customers.find(row=>row.id==='b').root;
 state.providerCampaign.incidents=[{id:'provider-incident-1',customerId:'b',resource:'carrier',kind:'outage',fault:'OUTAGE',status:'active',createdAt:25,dueAt:26,activatedAt:26,acknowledgedAt:null,resolvedAt:null,receipt:{resource:'carrier',revision:4}}];root.resources.carrier.fault='OUTAGE';root.boundaryChecks.identity={eligible:false,blocking:[{code:'ADMIN_PATH_UNAVAILABLE'}]};
 const before=JSON.stringify(state),context={};vm.createContext(context);vm.runInContext(require('../src/game/45-products').source()+require('../src/game/23-provider-regional-support').source()+require('../src/game/23-provider-uc-cc-integration').source()+ASSURANCE.source()+';globalThis.API=SOC_PROVIDER_INTEGRATION_ASSURANCE;',context);
 const result=context.API.policyCurrent(state,binding,{boundaryCheck});assert.equal(result.eligible,true);assert.equal(result.degraded,true);assert.equal(JSON.stringify(state),before);
});
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
