"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const authored=require('../content/provider-security.json'),recipeTerms=require('../content/provider-security-abuse.v2.json');
const security=require('../src/game/23-provider-security.js'),admission=require('../src/game/38-admission-security.js');
const scope={customerId:'starter-customer',portfolioId:'starter-customer',tenant:'starter-customer',market:'au-sydney'};

function paidFixture(networkPlan='edge-basic'){
 const child={clock:8,tenant:scope.tenant,interactions:[],cases:{}};child.admissionSecurity=admission.create(child);
 const s={clock:9,providerCampaign:{customers:[{id:scope.customerId,portfolioId:scope.portfolioId,market:scope.market}],projects:[],jobs:[]},portfolio:{customers:[{id:scope.portfolioId,market:scope.market,root:child}]},business:{ledger:[],ledgerPrunedThrough:0}};
 for(const [index,[control,planId]] of [['network',networkPlan],['sip','sip-standard'],['destination','australia-guard']].entries()){
  const plan=security.quotePlan(control,planId,scope,0);for(const command of security.nativeCommands(plan))admission.command(child,command);
  const projectId=`provider-security-paid-${index+1}`,postingId=`entry-${index+1}`,acceptedAt=8-plan.workMinutes;
  const project={id:projectId,kind:'operation',operationId:plan.operationId,customerId:scope.customerId,postingId,acceptedAt,dueAt:8,configSubmittedAt:8,completedAt:9,status:'complete',setupCents:plan.setupCents,periodCents:plan.periodCents,workMinutes:plan.workMinutes,engineers:plan.engineers,support:plan.support,resources:plan.resources,config:{planId},operationReceipt:{providerSecurity:security.planReceipt(plan)}};
  s.providerCampaign.projects.push(project);s.business.ledger.push({id:postingId,category:'cost',reason:'provider-operation',customerId:scope.customerId,projectId,cents:plan.setupCents});
 }
 child.clock=9;admission.advance(child);return {s,child};
}
function runRecipeNativeSteps(recipe,child){return recipe.steps.nativeCommands.map(command=>admission.command(child,command));}

test('AC-SOC-791 authored SCRUB recipe v2 binds fixed stress and native probes to the exact three paid generations',()=>{
 const {s,child}=paidFixture(),recipe=security.abuseRecipe(s,scope.customerId,child);
 assert.deepEqual(security.abuseTerms(),recipeTerms);assert.equal(recipeTerms.sourceTermsId,authored.id);assert.equal(recipe.kind,'provider-security-abuse-recipe-v2');assert.equal(recipe.version,2);assert.equal(recipe.recipeId,'provider-security-abuse-v2');
 assert.deepEqual(recipe.sourceIds,recipeTerms.sourceIds);
 assert.equal(recipe.controlBindings.length,3);assert.equal(recipe.controlBindings.find(x=>x.control==='network').nativeGeneration,1);assert.equal(recipe.steps.nativeCommands[0].packets,7500);assert.equal(recipe.steps.nativeCommands[0].packets>5000,true);assert.equal(recipe.steps.nativeCommands[0].packets<=50000,true);
 assert.deepEqual(recipe.steps.nativeCommands.map(x=>x.secondOffset),[1,1,2,3]);assert.equal(recipe.steps.blockedDestination.secondOffset,0);
 assert.equal(recipe.steps.nativeCommands[1].attempts,11);assert.equal(recipe.steps.nativeCommands[2].messageBytes,2049);assert.equal(recipe.steps.blockedDestination.to,recipeTerms.destination.to);
 assert.deepEqual(recipe.steps.ordinaryDelivery,{source:'autonomous-provider-demand',channel:'voice',to:'+61255500201',durationMinutes:3,eligibility:'completed-or-late-clean-voice-job-with-case-and-settlement',mustResolve:true,mustSettleCoreUsageOnce:true});
 assert.equal(security.validateAbuseRecipe(s,recipe,child),true);
 const forged=structuredClone(recipe);forged.steps.nativeCommands[0].packets=1250;assert.equal(security.validateAbuseRecipe(s,forged,child),false);
 const premium=paidFixture('edge-resilient'),premiumRecipe=security.abuseRecipe(premium.s,scope.customerId,premium.child),premiumResults=runRecipeNativeSteps(premiumRecipe,premium.child);
 assert.equal(premiumRecipe.steps.nativeCommands[0].packets,7500);assert.equal(premiumResults[0].code,'NETWORK_FLOOD_FILTERED');assert.equal(premium.child.admissionSecurity.events[0].detail.filteredPackets,2500);
 const busy=paidFixture(),filled=admission.command(busy.child,{action:'inject-signalling',peer:'synthetic-carrier',attempts:10,messageBytes:128,method:'INVITE',valid:true,secondOffset:0});assert.equal(filled.code,'SIP_ADMITTED');
 assert.throws(()=>security.abuseRecipe(busy.s,scope.customerId,busy.child),/PROVIDER_SECURITY_CORE_CALL_BUCKET_FULL/);
 busy.child.clock=10;busy.s.clock=10;admission.advance(busy.child);assert.equal(security.abuseRecipe(busy.s,scope.customerId,busy.child).steps.blockedDestination.secondOffset,0);
});

test('AC-SOC-792 native packet and SIP command results prove filtering, rate and size rejection, then an allowed carrier sample',()=>{
 const {s,child}=paidFixture(),recipe=security.abuseRecipe(s,scope.customerId,child),results=runRecipeNativeSteps(recipe,child);
 assert.deepEqual(results.map(x=>x.code),['NETWORK_FLOOD_FILTERED','SIP_RATE_EXCEEDED','SIP_MESSAGE_INVALID','SIP_ADMITTED']);
 const events=child.admissionSecurity.events,find=code=>events.find(x=>x.code===code);
 for(const [name,event] of [['network',find('NETWORK_FLOOD_FILTERED')],['sipRate',find('SIP_RATE_EXCEEDED')],['sipOversize',find('SIP_MESSAGE_INVALID')],['sipAllowed',find('SIP_ADMITTED')]])assert.equal(security.abuseEventMatchesV2(name,event,recipe,child),true,`${name} ${JSON.stringify(event)}`);
 const packet=find('NETWORK_FLOOD_FILTERED');assert.equal(packet.detail.filteredPackets,packet.detail.bucketPps-1000);assert.equal(packet.detail.protectedPathAvailable,true);
 const oversize=find('SIP_MESSAGE_INVALID');assert.equal(oversize.detail.messageBytes,2049);assert.equal(oversize.detail.valid,true);
 assert.equal(security.abuseEventMatchesV2('network',{...packet,detail:{...packet.detail,filteredPackets:1}},recipe,child),false);
 assert.equal(security.abuseEventMatchesV2('sipRate',{...find('SIP_RATE_EXCEEDED'),detail:{...find('SIP_RATE_EXCEEDED').detail,sipGeneration:99}},recipe,child),false);
});

test('AC-SOC-793 native blocked-destination events require the later SOC failed-call trace before they count as Provider proof',()=>{
 const {s,child}=paidFixture(),recipe=security.abuseRecipe(s,scope.customerId,child);runRecipeNativeSteps(recipe,child);
 const interaction={id:'security-blocked-call-1',channel:'voice',phase:'arrival',to:recipe.steps.blockedDestination.to};child.interactions.push(interaction);
 const result=admission.admit(child,interaction,{peerId:'synthetic-carrier',method:'INVITE',messageBytes:128,messageValid:true,destination:interaction.to,secondOffset:recipe.steps.blockedDestination.secondOffset});
 assert.equal(result.allowed,false);assert.ok(result.reasons.some(x=>x.control==='destination'&&x.code==='DESTINATION_NOT_ALLOWED'));
 const event=child.admissionSecurity.events.find(x=>x.id===result.eventId);assert.equal(security.abuseEventMatchesV2('destination',event,recipe,child),false,'a native event without the shared SOC trace cannot pass Provider evidence');
 interaction.phase='resolved';interaction.outcome='CONNECTED';assert.equal(security.abuseEventMatchesV2('destination',event,recipe,child),false,'a later successful interaction contradicts the blocked event');
 const altered={...interaction,to:'+61255500201'};child.interactions[0]=altered;assert.equal(security.abuseEventMatchesV2('destination',event,recipe,child),false,'the event reason alone cannot substitute for the actual interaction.to');
});

test('AC-SOC-794 retained v2 proof keeps paid v1 plans compatible, rejects current-generation substitution and serializes recipe rules to a worker',()=>{
 const {s,child}=paidFixture(),recipe=security.abuseRecipe(s,scope.customerId,child);assert.equal(security.validateAbuseRecipe(s,recipe,child,{historical:true}),true);
 const premature=structuredClone(recipe);premature.createdAt=recipe.controlBindings[0].completedAt-1;assert.equal(security.validateAbuseRecipe(s,premature,child,{historical:true}),false,'a recipe cannot predate paid control completion');
 const replacement=security.quotePlan('network','edge-resilient',scope,9);for(const command of security.nativeCommands(replacement))admission.command(child,command);child.clock=10;s.clock=10;admission.advance(child);
 assert.equal(security.validateAbuseRecipe(s,recipe,child),false);assert.equal(security.validateAbuseRecipe(s,recipe,child,{historical:true}),true);
 const fresh=paidFixture(),expected=security.abuseRecipe(fresh.s,scope.customerId,fresh.child),box={};vm.createContext(box);vm.runInContext(security.source()+';globalThis.workerSecurity=SOC_PROVIDER_SECURITY;',box);
 const actual=box.workerSecurity.abuseRecipe(fresh.s,scope.customerId,fresh.child);assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected);
 assert.deepEqual(JSON.parse(JSON.stringify(box.workerSecurity.abuseTerms())),recipeTerms);
});
