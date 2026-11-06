"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const authored=require('../content/provider-security.json');
const security=require('../src/game/23-provider-security.js');
const admission=require('../src/game/38-admission-security.js');
const scope={customerId:'starter-customer',portfolioId:'starter-customer',tenant:'starter-customer',market:'au-sydney'};

test('AC-SOC-777 Provider security helper offers are versioned fictional terms with separate prices and source provenance',()=>{
 assert.equal(security.CONTENT_ID,'provider-security-1');assert.deepEqual(security.terms(),authored);
 assert.deepEqual(security.sourceIds,authored.sourceIds);assert.equal(authored.sourceContext.sourceReward,20000);assert.equal(authored.sourceContext.sourceRewardUnit,'source-game currency, provenance only');
 assert.deepEqual(security.voiceServicePrerequisites,['provider-security-network','provider-security-sip','provider-security-destination']);
 for(const [control,row] of Object.entries(authored.controls)){
  assert.ok(security.operationDefinition(row.operationId));assert.ok(Object.keys(row.offers).length>=1);
  for(const [planId,offer] of Object.entries(row.offers)){
   const plan=security.quotePlan(control,planId,scope,12);assert.equal(plan.setupCents,offer.setupCents);assert.equal(plan.periodCents,offer.periodCents);assert.equal(plan.workMinutes,offer.workMinutes);assert.equal(plan.control,control);assert.equal(plan.termsId,authored.id);assert.equal(security.validatePlan(plan),true);
  }
 }
 assert.equal(authored.sourceContext.comparison.includes('paying callers'),true);
});

test('AC-SOC-778 security quotes reject arbitrary native configs, unsupported offers and inflated PPS',()=>{
 assert.throws(()=>security.quotePlan('network','invented-tier',scope,0),/INVALID_PROVIDER_SECURITY_PLAN/);
 assert.throws(()=>security.operationPlan('provider-security-network',{capacityPps:100000000,mitigationPps:100000000,enabled:true,activationMode:'always'},scope,0),/INVALID_PROVIDER_SECURITY_SELECTION/);
 const plan=security.quotePlan('network','edge-basic',scope,0);plan.nativeConfig.capacityPps=100000000;plan.nativeConfig.mitigationPps=100000000;assert.equal(security.validatePlan(plan),false);
 assert.throws(()=>security.quotePlan('sip','sip-standard',{...scope,tenant:'../foreign'},0),/INVALID_PROVIDER_SECURITY_PLAN/);
 const peerMutation=security.quotePlan('sip','sip-standard',scope,0);peerMutation.supplierPeer.authenticated=false;assert.equal(security.validatePlan(peerMutation),false);
});

test('AC-SOC-779 independently bought native controls leave voice blocked until all three are effective',()=>{
 const root={clock:0};root.admissionSecurity=admission.create(root);
 const call={id:'security-smoke-call',channel:'voice',to:'+61255500201'};
 const context={peerId:'synthetic-carrier',destination:'+61255500201'};
 const initially=admission.preflight(root,call,context);assert.ok(initially.reasons.some(x=>x.control==='network'));assert.ok(initially.reasons.some(x=>x.control==='sip'));assert.ok(initially.reasons.some(x=>x.control==='destination'));
 const network=security.quotePlan('network','edge-basic',scope,0);for(const command of security.nativeCommands(network))admission.command(root,command);root.clock=1;admission.advance(root);
 assert.equal(root.admissionSecurity.controls.network.effective.enabled,true);assert.equal(root.admissionSecurity.controls.sip.effective,null);assert.equal(root.admissionSecurity.controls.destination.effective,null);
 let partial=admission.preflight(root,call,context);assert.ok(partial.reasons.some(x=>x.control==='sip'));assert.ok(partial.reasons.some(x=>x.control==='destination'));
 const sip=security.quotePlan('sip','sip-standard',scope,1);for(const command of security.nativeCommands(sip))admission.command(root,command);root.clock=2;admission.advance(root);
 partial=admission.preflight(root,call,context);assert.ok(partial.reasons.some(x=>x.control==='destination'));
 const destination=security.quotePlan('destination','australia-guard',scope,2);for(const command of security.nativeCommands(destination))admission.command(root,command);root.clock=3;admission.advance(root);
 assert.deepEqual(admission.preflight(root,call,context).reasons,[]);
 assert.deepEqual(root.admissionSecurity.controls.network.effective,network.nativeConfig);assert.deepEqual(root.admissionSecurity.controls.sip.effective,sip.nativeConfig);assert.deepEqual(root.admissionSecurity.controls.destination.effective,destination.nativeConfig);
 assert.deepEqual(root.admissionSecurity.peers['synthetic-carrier'].observed,{authenticated:true,available:true,methods:['INVITE'],at:1});
});

test('Provider security helper serializes the same authored plan rules into a worker kernel',()=>{
 const context={};vm.createContext(context);vm.runInContext(security.source()+';globalThis.security=SOC_PROVIDER_SECURITY;',context);
 const expected=security.quotePlan('destination','australia-guard',scope,7),actual=context.security.quotePlan('destination','australia-guard',scope,7);
 assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected);assert.equal(context.security.validatePlan(actual),true);
});

function commissionedFixture(){
 const child={clock:8,tenant:'starter-customer'};child.admissionSecurity=admission.create(child);
 const s={clock:9,providerCampaign:{customers:[{id:'starter-customer',portfolioId:'starter-customer',market:'au-sydney'}],projects:[],jobs:[]},portfolio:{customers:[{id:'starter-customer',market:'au-sydney',root:child}]},business:{ledger:[],ledgerPrunedThrough:0}};
 for(const [index,[control,planId]] of [['network','edge-basic'],['sip','sip-standard'],['destination','australia-guard']].entries()){
  const plan=security.quotePlan(control,planId,scope,0);for(const command of security.nativeCommands(plan))admission.command(child,command);
  const acceptedAt=8-plan.workMinutes,projectId=`provider-security-project-${index+1}`,postingId=`entry-${index+1}`;
  const project={id:projectId,kind:'operation',operationId:plan.operationId,customerId:scope.customerId,acceptedAt,dueAt:8,configSubmittedAt:8,completedAt:9,status:'complete',setupCents:plan.setupCents,periodCents:plan.periodCents,workMinutes:plan.workMinutes,engineers:plan.engineers,support:plan.support,resources:plan.resources,config:{planId},postingId,operationReceipt:{providerSecurity:security.planReceipt(plan)}};
  s.providerCampaign.projects.push(project);s.business.ledger.push({id:postingId,category:'cost',reason:'provider-operation',customerId:scope.customerId,projectId,cents:plan.setupCents});
 }
 child.clock=9;admission.advance(child);return {s,child};
}

test('historical plan bindings retain the originally paid offer but current readiness follows effective generations',()=>{
 const {s,child}=commissionedFixture();
 const bindings=s.providerCampaign.projects.map(project=>security.bindingForProject(s,project,child));assert.ok(bindings.every(Boolean));
 assert.equal(security.currentStatus(s,scope.customerId,child).voiceAdmissionReady,true);
 const networkProject=s.providerCampaign.projects[0],prior=bindings[0];assert.equal(security.validateHistoricalBinding(s,networkProject,prior),true);assert.equal(security.validateCurrentBinding(s,networkProject,prior,child),true);
 const replacement=security.quotePlan('network','edge-resilient',scope,9);for(const command of security.nativeCommands(replacement))admission.command(child,command);child.clock=10;admission.advance(child);
 assert.equal(security.validateHistoricalBinding(s,networkProject,prior),true,'a later native generation cannot rewrite the original paid plan');
 assert.equal(security.validateCurrentBinding(s,networkProject,prior,child),false);
 const current=security.currentStatus(s,scope.customerId,child);assert.equal(current.voiceAdmissionReady,false);assert.equal(current.controls.network.status,'stale');
 const changedTenant={...prior,tenant:'another-tenant'};assert.equal(security.validateHistoricalBinding(s,networkProject,changedTenant),false);
});

test('paid binding rejects wrong scope, missing posting and a caller-added native config',()=>{
 const {s,child}=commissionedFixture(),project=s.providerCampaign.projects[0],binding=security.bindingForProject(s,project,child);assert.ok(binding);
 const foreign=structuredClone(s);foreign.providerCampaign.projects[0].operationReceipt.providerSecurity.plan.tenant='foreign-tenant';assert.equal(security.bindingForProject(foreign,foreign.providerCampaign.projects[0],child),null);
 const missingPosting=structuredClone(s);missingPosting.business.ledger=[];assert.equal(security.bindingForProject(missingPosting,missingPosting.providerCampaign.projects[0],child),null);
 const forged=structuredClone(s);forged.providerCampaign.projects[0].config.extraPps=100000000;assert.equal(security.bindingForProject(forged,forged.providerCampaign.projects[0],child),null);
});

test('security abuse evidence matches authored attack parameters, paid generations and protected path',()=>{
 const network=security.quotePlan('network','edge-basic',scope,0),sip=security.quotePlan('sip','sip-standard',scope,0),destination=security.quotePlan('destination','australia-guard',scope,0);
 const bindings=[network,sip,destination].map((p,i)=>({control:p.control,nativeGeneration:i+1,nativeConfig:p.nativeConfig}));
 const policyGenerations={network:{desired:1,effective:1},sip:{desired:2,effective:2},destination:{desired:3,effective:3}};
 const networkEvent={synthetic:true,at:3,kind:'packet-batch',code:'NETWORK_FLOOD_FILTERED',detail:{peer:'synthetic-flood-origin',packets:1250,secondOffset:0,bucketPps:1250,filteredPackets:250,protectedPathAvailable:true,networkGeneration:1}};
 const sipEvent={synthetic:true,at:3,kind:'signalling-batch',code:'SIP_AUTH_REQUIRED',detail:{peer:'synthetic-unauthenticated-origin',attempts:1,bucketAttempts:1,method:'INVITE',messageBytes:128,valid:true,secondOffset:0,sipGeneration:2}};
 const validNetwork=security.abuseEventMatches('network',networkEvent,bindings,policyGenerations,3),validSip=security.abuseEventMatches('sipBlocked',sipEvent,bindings,policyGenerations,3);
 assert.equal(validNetwork,true);assert.equal(validSip,true);
 assert.equal(security.abuseEventMatches('network',{...networkEvent,detail:{...networkEvent.detail,protectedPathAvailable:false}},bindings,policyGenerations,3),false);
 assert.equal(security.abuseEventMatches('network',{...networkEvent,detail:{...networkEvent.detail,peer:'ordinary-customer'}},bindings,policyGenerations,3),false);
 assert.equal(security.abuseEventMatches('sipBlocked',{...sipEvent,detail:{...sipEvent.detail,sipGeneration:9}},bindings,policyGenerations,3),false);
 assert.equal(security.abuseEventMatches('sipBlocked',{...sipEvent,detail:{...sipEvent.detail,authenticated:true}},bindings,policyGenerations,3),false);
 assert.equal(security.abuseEventMatches('network',networkEvent,bindings,policyGenerations,2),false);
});
