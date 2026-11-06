const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const I=require('../src/game/23-provider-uc-cc-integration.js');

function root(){
 const resources={
  phone:{generation:1,provisioning:{status:'ready'},effective:{enabled:true,signalling:true,mediaIn:true,mediaOut:true,routes:[{prefix:'+61',target:'desk'}]}},
  recorder:{generation:1,provisioning:{status:'ready'},effective:{enabled:true,consent:true,identityMapping:true,archive:'archive'}},
  archive:{generation:1,provisioning:{status:'ready'},effective:{enabled:true,access:['supervisor']}},
  engage:{generation:1,provisioning:{status:'ready'},effective:{enabled:true}}
 };
 const products={pack:'soc-products-1',deployments:[
  {id:I.SOURCE_ID,generation:2,provisioning:{status:'ready',generation:2},effective:{family:'microsoft:workplace-phone',productVersion:'scenario-1',features:['telephony'],bindings:[{feature:'telephony',resources:['phone']}]}},
  {id:I.TARGET_ID,generation:3,provisioning:{status:'ready',generation:3},effective:{family:'cisco:contact-center',productVersion:'scenario-2',features:['quality-review'],bindings:[{feature:'quality-review',resources:['recorder']}]}}
 ],integrations:[]};
 return {tenant:'orchard-tenant',jurisdiction:'AU',mode:'guided',experience:{kind:'provider'},resources,products,commands:[],interactions:[],cases:{},records:[],providerReviews:[]};
}
function state(withProject=true){
 const child=root(),customer={id:'orchard-customer',portfolioId:'orchard-customer',status:'active'},project={id:'provider-project-41',customerId:customer.id,kind:'operation',operationId:'uc-cc-integration',acceptedAt:10,postingId:'posting-41',setupCents:40000,status:'commissioning',completedAt:null};
 const stages=[['base','phone'],['carrier','archive'],['partner','recorder','engage']],stageProjects=stages.map(([stage,...resources],index)=>({id:`msp-${stage}`,customerId:customer.id,kind:'stage',stage,postingId:`posting-msp-${stage}`,setupCents:1000+index,status:'complete',completedAt:3+index,resources}));
 return {clock:10,business:{organisations:{'orchard-msp':{roles:['msp','reseller']}},ledger:stageProjects.map(p=>({id:p.postingId,category:'cost',cents:p.setupCents,customerId:customer.id,projectId:p.id,providerCampaign:true,reason:'provider-implementation'})),ledgerPrunedThrough:0},providerCampaign:{customers:[customer],projects:[...(withProject?[project]:[]),...stageProjects],jobs:[],events:[],nextJob:1,eventCheckpoint:{count:0,lastId:null}},portfolio:{customers:[{id:customer.id,root:child}]}};
}
const hooks={resourceReady:()=>({ready:true}),currentSupport:()=>({ready:true,scope:{projectIds:['msp-base','msp-carrier','msp-partner'],postingIds:['posting-msp-base','posting-msp-carrier','posting-msp-partner'],resources:['archive','engage','phone','recorder']}}),currentBoundary:()=>({ready:true,scope:[]})};
function verifiedEdge(s,projectId='provider-project-41',includeTest=true){
 const p=s.providerCampaign.projects.find(x=>x.id===projectId),child=s.portfolio.customers[0].root,planned=I.plan(s,p.id,hooks).plan;
 child.products.integrations=[{id:I.EDGE_ID,source:I.SOURCE_ID,target:I.TARGET_ID,sourceVersion:planned.source.productVersion,targetVersion:planned.target.productVersion,sourceGeneration:planned.source.generation,targetGeneration:planned.target.generation,features:[{sourceFeature:I.SOURCE_FEATURE,targetFeature:I.TARGET_FEATURE}],result:{status:'scenario-verified',checkedAt:11,sourceVersion:planned.source.productVersion,targetVersion:planned.target.productVersion,sourceGeneration:planned.source.generation,targetGeneration:planned.target.generation,checks:[{sourceFeature:I.SOURCE_FEATURE,targetFeature:I.TARGET_FEATURE,source:{available:true},target:{available:true}}],reasons:[],synthetic:true,externalSupportClaim:false}}];
 if(includeTest)child.commands.push({at:11,revision:1,command:{type:'products',command:{action:'test-integration',id:I.EDGE_ID}}});
 p.operationReceipt=I.createReceipt(s,p.id,hooks);if(includeTest)I.attachTestSnapshot(s,p.id,hooks);return p;
}
function voiceAndCapture(s,suffix='8',arrivalAt=12,completedAt=16){
 const p=s.providerCampaign.projects[0],child=s.portfolio.customers[0].root,job={id:`provider-job-${suffix}`,customerId:p.customerId,channel:'voice',status:'completed',arrivalAt,completedAt,interactionId:`interaction-${suffix}`,caseId:`case-${suffix}`};
 const interaction={id:job.interactionId,channel:'voice',phase:'resolved',tenant:child.tenant,agent:'agent-1',caseId:job.caseId,startedAt:arrivalAt,finishedAt:completedAt,probe:false,obligations:[],trace:[{code:'PRODUCT_FEATURE_ACCEPTED',resource:'phone',bindings:[{deploymentId:I.SOURCE_ID,feature:I.SOURCE_FEATURE}]},{code:'PRODUCT_FEATURE_ACCEPTED',resource:'recorder',bindings:[{deploymentId:I.TARGET_ID,feature:I.TARGET_FEATURE}]}]};
 child.cases[job.caseId]={id:job.caseId,tenant:child.tenant,interactions:[interaction.id]};child.interactions.push(interaction);child.records.push({id:`recording-${suffix}`,kind:'recording',interaction:interaction.id,createdAt:completedAt,expiresAt:null,held:false,deleted:false,captureScope:'complete',access:['supervisor']});
 s.providerCampaign.jobs.push(job);s.providerCampaign.events.push({id:`provider-event-${suffix}`,at:arrivalAt,code:'CUSTOMER_WORK_ARRIVED',customerId:p.customerId,jobId:job.id,caseId:job.caseId,channel:'voice',interactionId:job.interactionId});return job;
}
function qualityReview(s,job){
 const p=s.providerCampaign.projects[0],reviewAt=job.completedAt+4,reviewProject={id:`provider-project-quality-${job.id}`,customerId:p.customerId,kind:'operation',operationId:'quality',acceptedAt:job.completedAt+1,configSubmittedAt:reviewAt+1,completedAt:reviewAt+2,postingId:`posting-quality-${job.id}`,setupCents:9000,status:'complete'};
 s.providerCampaign.projects.push(reviewProject);s.portfolio.customers[0].root.providerReviews.push({projectId:reviewProject.id,postingId:reviewProject.postingId,at:reviewAt,reviewer:'supervisor',interactionId:job.interactionId,caseId:job.caseId,recordingId:`recording-${job.id.slice('provider-job-'.length)}`,agent:'agent-1',criteria:{completeCapture:true,caseContinuity:true,delivered:true,noOutstandingObligation:true}});
}

test('paid planner is pure, source-linked, version-scoped and emits validated product commands',()=>{
 const s=state(),before=JSON.stringify(s),result=I.plan(s,'provider-project-41',hooks);
 assert.equal(result.status,'ready');assert.deepEqual(result.missing,[]);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(result.plan.sourceIds,['uc-new:family:microsoft:workplace-phone','uc-new:family:cisco:contact-center']);
 assert.deepEqual(result.plan.edge.features,[{sourceFeature:'telephony',targetFeature:'quality-review'}]);
 assert.deepEqual(I.startCommands(result.plan),[{type:'products',command:{action:'integration',id:I.EDGE_ID,source:I.SOURCE_ID,target:I.TARGET_ID,features:[{sourceFeature:'telephony',targetFeature:'quality-review'}]}}]);
 assert.deepEqual(I.testCommands(result.plan),[{type:'products',command:{action:'test-integration',id:I.EDGE_ID}}]);
 assert.equal(I.validatePlanShape(result.plan),true);
 const box={};vm.createContext(box);vm.runInContext(I.source()+';globalThis.api=SOC_PROVIDER_UC_CC_INTEGRATION;',box);assert.deepEqual(JSON.parse(JSON.stringify(box.api.plan(s,'provider-project-41',hooks))),result);
});

test('quote preflight requires actual paid scope prerequisites and does not create projects',()=>{
 const s=state(false),before=JSON.stringify(s);assert.deepEqual(I.canOrder(s,'orchard-customer','uc-cc-integration',hooks),{eligible:true,missing:[]});assert.equal(JSON.stringify(s),before);
 const missing=structuredClone(s);delete missing.portfolio.customers[0].root.resources.archive;assert.equal(I.canOrder(missing,'orchard-customer','uc-cc-integration',hooks).eligible,false);
 assert.match(I.canOrder(missing,'orchard-customer','uc-cc-integration',hooks).missing.join(','),/archive/);
 assert.equal(I.canOrder(s,'orchard-customer','uc-cc-retest',hooks).eligible,false);
});

test('quote preflight refuses incompatible bindings and unsupported current scope before payment',()=>{
 const wrong=state(false);wrong.portfolio.customers[0].root.products.deployments[1].effective.bindings[0].resources=['phone'];
 assert.match(I.canOrder(wrong,'orchard-customer','uc-cc-integration',hooks).missing.join(','),/deployment-not-ready:d-cisco-contact-centre/);
 const support=I.canOrder(state(false),'orchard-customer','uc-cc-integration',{...hooks,currentSupport:()=>({ready:false,reason:'current-paid-MSP-required'})});
 assert.deepEqual(support,{eligible:false,missing:['current-paid-MSP-required','current-paid-support-scope-required']});
 const boundary=I.canOrder(state(false),'orchard-customer','uc-cc-integration',{...hooks,currentBoundary:()=>({ready:false,reason:'bound-recording-path-unobserved'})});
 assert.deepEqual(boundary,{eligible:false,missing:['bound-recording-path-unobserved','current-boundary-scope-required']});
});

test('capture gate stages explicit paid test, actual complete provider call, then a later funded same-case review',()=>{
 const s=state(),p=s.providerCampaign.projects[0],created=I.createReceipt(s,p.id,hooks);p.operationReceipt=created;
 let status=I.observe(s,p.id,hooks);assert.equal(status.status,'awaiting-edge');assert.equal(status.captureAvailable,false);
 verifiedEdge(s,p.id,false);status=I.observe(s,p.id,hooks);assert.equal(status.status,'awaiting-test');assert.equal(status.captureAvailable,false);
 s.portfolio.customers[0].root.commands.push({at:11,revision:1,command:{type:'products',command:{action:'test-integration',id:I.EDGE_ID}}});I.attachTestSnapshot(s,p.id,hooks);status=I.observe(s,p.id,hooks);assert.equal(status.status,'awaiting-work');assert.equal(status.captureAvailable,true);
 const job=voiceAndCapture(s);status=I.observe(s,p.id,hooks);assert.equal(status.status,'awaiting-review');assert.equal(status.captureAvailable,true);
 qualityReview(s,job);status=I.observe(s,p.id,hooks);assert.equal(status.status,'ready');assert.equal(status.captureAvailable,true);assert.equal(I.validateTaskEvidence(s,p.id,status.evidence,hooks),true);
 assert.equal(status.evidence.autonomousProvider,true);assert.equal(status.evidence.quality.projectId,'provider-project-quality-provider-job-8');assert.equal(status.evidence.interaction.caseId,status.evidence.case.id);
 const forged=structuredClone(status.evidence);forged.quality.projectId='invented-project';assert.equal(I.validateTaskEvidence(s,p.id,forged,hooks),false);
 I.attachTaskEvidence(s,p.id,hooks);assert.equal(I.validateProject(s,p.id),true);assert.equal(I.validateRetainedTaskEvidence(s,p.id,p.operationReceipt.task),true);
});

test('failed, stale, partial, probe, wrong-case and unsupported reviews cannot satisfy the integration',()=>{
 const s=state(),p=s.providerCampaign.projects[0];verifiedEdge(s);const child=s.portfolio.customers[0].root;
 child.products.deployments[0].generation++;assert.equal(I.observe(s,p.id,hooks).status,'stale');
 const b=state();verifiedEdge(b);const job=voiceAndCapture(b),interaction=b.portfolio.customers[0].root.interactions[0];interaction.probe=true;qualityReview(b,job);assert.equal(I.observe(b,p.id,hooks).status,'awaiting-work');
 const c=state();verifiedEdge(c);const cjob=voiceAndCapture(c);c.portfolio.customers[0].root.records[0].captureScope='partial';qualityReview(c,cjob);assert.equal(I.observe(c,c.providerCampaign.projects[0].id,hooks).status,'awaiting-work');
 const d=state();verifiedEdge(d);const djob=voiceAndCapture(d);qualityReview(d,djob);d.providerCampaign.projects.find(x=>x.operationId==='quality').operationId='coaching';assert.equal(I.observe(d,d.providerCampaign.projects[0].id,hooks).status,'awaiting-review');
 const e=state();verifiedEdge(e);const supportLapsed=I.observe(e,e.providerCampaign.projects[0].id,{...hooks,currentSupport:()=>({ready:false,reason:'support-lapsed'})});assert.equal(supportLapsed.status,'blocked');assert.equal(supportLapsed.captureAvailable,true,'MSP scope does not fabricate hardware outage');
 assert.equal(I.observe(e,e.providerCampaign.projects[0].id,{...hooks,currentBoundary:()=>({ready:false,reason:'bound-path-down',scope:[]})}).captureAvailable,false);
});

test('paid retest becomes available only for an existing stale or blocked edge',()=>{
 const s=state(false),row={id:'provider-project-prior',customerId:'orchard-customer',kind:'operation',operationId:'uc-cc-integration',acceptedAt:1,postingId:'posting-prior',setupCents:40000,status:'complete',completedAt:9};s.providerCampaign.projects.push(row);
 assert.ok(I.canOrder(s,'orchard-customer','uc-cc-retest',hooks).missing.includes('paid-integration-receipt-required'));
 const active=state(),prior=active.providerCampaign.projects[0];verifiedEdge(active);active.portfolio.customers[0].root.products.deployments[0].generation++;
 assert.equal(I.canOrder(active,'orchard-customer','uc-cc-retest',hooks).eligible,false,'changed generation is still pending until commissioned');
 active.portfolio.customers[0].root.products.deployments[0].provisioning={status:'ready',generation:3};
 assert.equal(I.canOrder(active,'orchard-customer','uc-cc-retest',hooks).eligible,true);
});

test('managed operation family pairs correctly and support or bound-path scope changes require a paid retest',()=>{
 const fresh=state(false);assert.equal(I.canOrder(fresh,'orchard-customer','managed-uc-cc-integration',hooks).eligible,true);
 const mismatched=state(false);mismatched.providerCampaign.projects.push({id:'provider-project-prior',customerId:'orchard-customer',kind:'operation',operationId:'uc-cc-integration',acceptedAt:1,postingId:'posting-prior',setupCents:40000,status:'complete',completedAt:9,operationReceipt:{}});
 assert.ok(I.canOrder(mismatched,'orchard-customer','managed-uc-cc-retest',hooks).missing.includes('paid-integration-receipt-required'));
 const active=state();verifiedEdge(active);const changedHooks={...hooks,currentBoundary:()=>({ready:true,scope:[{resourceId:'recorder',contractId:'contract-recording-1',generation:1}]})};
 assert.equal(I.observe(active,'provider-project-41',changedHooks).captureAvailable,true,'scope change blocks assessment while actual resources remain ready');
 assert.equal(I.canOrder(active,'orchard-customer','uc-cc-retest',changedHooks).eligible,true);
 const restored=I.observe(active,'provider-project-41',hooks);assert.equal(restored.captureAvailable,true,'returning to the exact tested scope restores current eligibility');
});

test('a later reviewed job can satisfy the proof when an earlier eligible call is still unreviewed',()=>{
 const s=state();verifiedEdge(s);voiceAndCapture(s,'8',12,16);const reviewed=voiceAndCapture(s,'9',17,21);qualityReview(s,reviewed);
 const result=I.taskEvidence(s,'provider-project-41',hooks);assert.equal(result.status,'ready');assert.equal(result.evidence.job.id,reviewed.id);
});

test('funded task receipt remains historically valid after edge rebase while current service is stale',()=>{
 const s=state();verifiedEdge(s);const job=voiceAndCapture(s);qualityReview(s,job);I.attachTaskEvidence(s,'provider-project-41',hooks);
 const edge=s.portfolio.customers[0].root.products.integrations[0];edge.history=[{at:22,sourceVersion:edge.sourceVersion,targetVersion:edge.targetVersion,sourceGeneration:edge.sourceGeneration,targetGeneration:edge.targetGeneration,result:structuredClone(edge.result)}];
 s.portfolio.customers[0].root.products.deployments[0].generation=4;s.portfolio.customers[0].root.products.deployments[0].provisioning={status:'ready',generation:4};edge.sourceGeneration=4;edge.result=null;
 assert.equal(I.validateRetainedTaskEvidence(s,'provider-project-41',s.providerCampaign.projects[0].operationReceipt.task),true);
 assert.equal(I.validateTaskEvidence(s,'provider-project-41',s.providerCampaign.projects[0].operationReceipt.task,{}, {historical:true}),true);
 assert.equal(I.validateProject(s,'provider-project-41'),true);
 assert.equal(I.observe(s,'provider-project-41',hooks).status,'stale');
 const forged=structuredClone(s.providerCampaign.projects[0].operationReceipt.task);forged.recording.captureScope='partial';assert.equal(I.validateRetainedTaskEvidence(s,'provider-project-41',forged),false);
});

test('archived paid task proof survives workload-history pruning but rejects altered proof fields',()=>{
 const s=state();verifiedEdge(s);const job=voiceAndCapture(s);qualityReview(s,job);I.attachTaskEvidence(s,'provider-project-41',hooks);
 s.providerCampaign.nextJob=9;s.providerCampaign.jobCheckpoint={pruned:8,completed:8,late:0,failed:0,voiceMinutes:0,messages:0};s.providerCampaign.eventCheckpoint={count:8,lastId:'provider-event-8',codes:{CUSTOMER_WORK_ARRIVED:8}};s.providerCampaign.jobs=[];s.providerCampaign.events=[];
 const archived=s.providerCampaign.projects[0].operationReceipt.task;
 assert.equal(I.validateRetainedTaskEvidence(s,'provider-project-41',archived),true);
 const codes=s.providerCampaign.eventCheckpoint.codes;s.providerCampaign.eventCheckpoint.codes={CUSTOMER_RENEWED:8};assert.equal(I.validateRetainedTaskEvidence(s,'provider-project-41',archived),false,'an archive with no arrivals cannot supply an evicted arrival');s.providerCampaign.eventCheckpoint.codes=codes;
 const changed=structuredClone(archived);changed.arrival.jobId='fabricated-job';assert.equal(I.validateRetainedTaskEvidence(s,'provider-project-41',changed),false);
 const project=s.providerCampaign.projects[0],saved=structuredClone(project.operationReceipt.test);project.operationReceipt.test.supportScope.projectIds=['foreign-base','foreign-carrier','foreign-partner'];project.operationReceipt.task.test.supportScope.projectIds=['foreign-base','foreign-carrier','foreign-partner'];assert.equal(I.validateProject(s,project.id),false,'same-customer paid stage lineage rejects fabricated or cross-customer support IDs');project.operationReceipt.test=saved;project.operationReceipt.task.test=structuredClone(saved);
});

test('AC-SOC-845 retained same-job arrival cannot be replaced by an unrelated archived event ID',()=>{
 const s=state();verifiedEdge(s);const job=voiceAndCapture(s);qualityReview(s,job);I.attachTaskEvidence(s,'provider-project-41',hooks);
 s.providerCampaign.eventCheckpoint={count:7,lastId:'provider-event-7',codes:{CUSTOMER_WORK_ARRIVED:7}};
 const task=s.providerCampaign.projects[0].operationReceipt.task;
 assert.equal(I.validateRetainedTaskEvidence(s,'provider-project-41',task),true);
 task.arrival.id='provider-event-1';
 assert.equal(I.validateRetainedTaskEvidence(s,'provider-project-41',task),false,'the actual same-job event is still retained and contradicts the claimed archived ID');
 task.arrival.id='provider-event-8';
 for(const field of ['customerId','caseId','interactionId']){const original=s.providerCampaign.events[0][field];s.providerCampaign.events[0][field]='foreign';assert.equal(I.validateRetainedTaskEvidence(s,'provider-project-41',task),false,field);s.providerCampaign.events[0][field]=original;}
 assert.equal(I.validateRetainedTaskEvidence(s,'provider-project-41',task),true);
});
