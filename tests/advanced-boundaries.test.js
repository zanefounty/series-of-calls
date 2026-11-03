const test=require('node:test');
const assert=require('node:assert/strict');
const O=require('../src/game/46-outcomes');
const C=require('../src/game/47-channels');
const P=require('../src/game/45-products');

const outcomeConfig={supportedIntents:['appointment-change'],taskIntegrations:[{intent:'appointment-change',integration:'calendar-task',evidence:['slot-updated']}],handoffDestination:'service-desk',maxAttempts:1,repeatInterval:1,repeatEffort:1,contextLossEffort:1,maxRepeatEmissionsPerAdvance:1};
function outcomes(){const s={clock:0,outcomes:O.create({clock:0})};O.command(s,{action:'configure',config:outcomeConfig});s.clock=1;O.advance(s);return s;}
function outcomeNeed(s){return O.command(s,{action:'need',tenant:'tenant-a',person:'person-a',caseId:'case-a',purpose:'Change appointment',intent:'appointment-change',permittedChannels:['voice','message']});}
function outcomeContext(overrides={}){return {actor:'bot',technicalSuccess:true,taskIntegrationReady:true,contextRetained:true,tenant:'tenant-a',person:'person-a',caseId:'case-a',purpose:'Change appointment',businessIntent:'appointment-change',identityVerified:true,...overrides};}
function channelFixture(){const s=C.create({clock:0});C.advance(s,1);for(const channel of C.channels)C.command(s,{action:'observe',channel,authenticated:true,providerAvailable:true,fault:null});return s;}
function grant(s,channel='casechat',expiresAt=null,purpose='service'){C.command(s,{action:'permission',tenant:'tenant-a',person:'person-a',channel,purpose,granted:true,expiresAt});}
function context(channel='casechat',caseId='case-a',person='person-a',purpose='service',extra={}){return {tenant:'tenant-a',canonicalPerson:person,account:channel,purpose,caseId,caseIdentity:person,caseTenant:'tenant-a',authenticatedIdentity:person,...extra};}
function open(s,channel='casechat',caseId='case-a',purpose='service'){return C.command(s,{action:'open',tenant:'tenant-a',person:'person-a',channel,purpose,caseId},context(channel,caseId,'person-a',purpose));}
const productHooks={authorize:()=>true,observeDependency:(s,kind,resource)=>({ready:resource!=='missing-resource',generation:1}),testDirectionalPath:()=>true};
function products(){const s={clock:0,products:P.create()};P.command(s,{action:'offer',offer:{id:'phone-offer',family:'microsoft:workplace-phone',edition:'scenario-edition',unit:'seat',quantity:10,features:['telephony'],dependencies:{identity:'identity'}}},productHooks);s.clock=1;P.advance(s,productHooks);P.command(s,{action:'deploy',id:'phone-live',offer:'phone-offer',productVersion:'scenario-1',mode:'multitenant'},productHooks);s.clock=2;P.advance(s,productHooks);return s;}

test('AC-SOC-099 outcomes preserve explicit task failure, case identity, and unresolved history',()=>{
 const s=outcomes(),need=outcomeNeed(s),interaction={id:'interaction-failed',needId:need.id,caseId:'case-a',channel:'voice'};
 assert.equal(O.evaluate(s,{id:'legacy-interaction'},{}),null);
 const task={action:'task-result',needId:need.id,interactionId:interaction.id,intent:need.intent,integration:'calendar-task',succeeded:false,botAnswered:true,evidence:[]};O.command(s,task);s.clock++;
 assert.equal(O.command(s,task).at,1);assert.throws(()=>O.command(s,{...task,succeeded:true}),/TASK_RESULT_CONFLICT/);
 const failed=O.evaluate(s,interaction,outcomeContext());assert.equal(failed.outcome,'unresolved');assert.equal(failed.reason,'BOT_CONTAINED_TASK_FAILED');O.settle(s,interaction,failed);assert.equal(s.outcomes.needs[0].status,'exhausted');assert.equal(O.inspect(s).needs[0].status,'exhausted');
 const pruned=structuredClone(s);pruned.outcomes.needs.pop();assert.throws(()=>O.validate(pruned),/INVALID_OUTCOMES_SAVE/);
 const stale=outcomes(),another=outcomeNeed(stale),wrongCase={id:'interaction-wrong-case',needId:another.id,caseId:'case-b',channel:'voice'},verdict=O.evaluate(stale,wrongCase,outcomeContext({caseId:'case-b'}));assert.equal(verdict.outcome,'escalate');assert.equal(verdict.reason,'CUSTOMER_CONTEXT_MISMATCH');
});

test('AC-SOC-100 outcomes reject a saved open need whose retry was silently removed',()=>{
 const s=outcomes(),need=outcomeNeed(s),interaction={id:'interaction-open',needId:need.id,caseId:'case-a',channel:'voice'};
 O.command(s,{action:'task-result',needId:need.id,interactionId:interaction.id,intent:need.intent,integration:'calendar-task',succeeded:false,botAnswered:true,evidence:[]});O.settle(s,interaction,O.evaluate(s,interaction,outcomeContext()));
 assert.equal(s.outcomes.needs[0].status,'exhausted');
 const malformed=structuredClone(s);malformed.outcomes.needs[0].status='open';malformed.outcomes.needs[0].repeat={...malformed.outcomes.needs[0].repeat,status:'none',dueAt:null,pendingInteractionId:null,pendingKey:null};
 assert.throws(()=>O.validate(malformed),/INVALID_NEED_STATUS/);
});

test('AC-SOC-101 channels require current permission before opening or retrying a new delivery',()=>{
 const s=channelFixture(),ctx=context('chatterleaf');
 assert.throws(()=>open(s,'chatterleaf'),/CHANNEL_PERMISSION_REQUIRED/);
 grant(s,'chatterleaf');C.command(s,{action:'open',tenant:'tenant-a',person:'person-a',channel:'chatterleaf',purpose:'service',caseId:'case-a'},ctx);
 const accepted={id:'accepted-before-revoke',tenant:'tenant-a',person:'person-a',channel:'chatterleaf',purpose:'service',caseId:'case-a'},job={id:'delivery-accepted',interaction:accepted.id,status:'accepted',acceptedAt:s.clock};C.recordAcceptance(s,accepted,ctx,job);
 C.command(s,{action:'permission',tenant:'tenant-a',person:'person-a',channel:'chatterleaf',purpose:'service',granted:false,expiresAt:null});C.advance(s,2);assert.equal(C.recordAcceptance(s,accepted,ctx,job).parentJob,job.id);
 const receipt=C.recordDelivery(s,accepted,ctx,{...job,status:'delivered',receiptAt:s.clock});assert.equal(receipt.kind,'delivery','an actual delivery after HTTP 202 is retained despite later revocation');
 const severed=structuredClone(s);severed.acceptances=[];assert.throws(()=>C.validate(severed),/INVALID_CHANNEL_DELIVERY_LINK/);
 const request={id:'new-retry',tenant:'tenant-a',person:'person-a',channel:'chatterleaf',purpose:'service',caseId:'case-a'};
 assert.throws(()=>C.recordAcceptance(s,request,ctx,{id:'delivery-retry',interaction:request.id,status:'accepted',acceptedAt:s.clock}),/CHANNEL_PERMISSION_REQUIRED/);
 assert.equal(C.beforeAccept(s,request,ctx).reason,'CHANNEL_PERMISSION_REQUIRED');
 const expiredWindow=channelFixture();grant(expiredWindow,'chatterleaf');C.command(expiredWindow,{action:'open',tenant:'tenant-a',person:'person-a',channel:'chatterleaf',purpose:'service',caseId:'case-a'},ctx);
 const delayed={id:'accepted-window-message',tenant:'tenant-a',person:'person-a',channel:'chatterleaf',purpose:'service',caseId:'case-a'},acceptedJob={id:'delivery-window',interaction:delayed.id,status:'accepted',acceptedAt:expiredWindow.clock};C.recordAcceptance(expiredWindow,delayed,ctx,acceptedJob);
 C.advance(expiredWindow,25);assert.equal(C.beforeAccept(expiredWindow,delayed,{...ctx,at:25}).reason,'CHATTERLEAF_REPLY_WINDOW_EXPIRED');
 const actual=C.recordDelivery(expiredWindow,delayed,ctx,{...acceptedJob,status:'delivered',receiptAt:acceptedJob.acceptedAt+1});assert.equal(actual.kind,'delivery');
});

test('AC-SOC-102 channels preserve purpose and case binding across pause, expiry, and resume',()=>{
 const s=channelFixture();grant(s);open(s);const conv=s.conversations[0];C.command(s,{action:'pause',conversation:conv.id});grant(s,'casechat',null,'transactional');
 assert.throws(()=>C.command(s,{action:'open',tenant:'tenant-a',person:'person-a',channel:'casechat',purpose:'transactional',caseId:'case-a'},context('casechat','case-a','person-a','transactional')),/CHANNEL_CONVERSATION_BINDING/);
 assert.throws(()=>C.command(s,{action:'resume',conversation:conv.id,person:'person-b'},context('casechat','case-a','person-b')),/CHANNEL_CONVERSATION_BINDING/);
 C.advance(s,31);assert.equal(conv.status,'expired');assert.throws(()=>C.command(s,{action:'resume',conversation:conv.id,person:'person-a'},context()),/CASECHAT_SESSION_EXPIRED/);
 const corrupt=structuredClone(s);corrupt.conversations[0].status='active';assert.throws(()=>C.validate(corrupt),/INVALID_CHANNEL_CONVERSATION_SAVE/);
});

test('AC-SOC-103 channel retry windows remain purpose and case specific after the first window closes',()=>{
 const s=channelFixture();grant(s,'chatterleaf');C.command(s,{action:'open',tenant:'tenant-a',person:'person-a',channel:'chatterleaf',purpose:'service',caseId:'case-a'},context('chatterleaf','case-a'));
 const expired={id:'queued-late',tenant:'tenant-a',person:'person-a',channel:'chatterleaf',purpose:'service',caseId:'case-a'},ctx=context('chatterleaf','case-a','person-a','service',{at:25});
 assert.equal(C.beforeAccept(s,expired,ctx).reason,'CHATTERLEAF_REPLY_WINDOW_EXPIRED');
 assert.equal(C.beforeAccept(s,{...expired,caseId:'case-b'},{...ctx,caseId:'case-b',conversationId:s.conversations[0].id}).reason,'CHANNEL_CONVERSATION_BINDING');
 assert.equal(C.validate(s),true);
});

test('AC-SOC-104 products separate lifecycle-effective existing service from new sale eligibility',()=>{
 const s=products();assert.equal(P.featureStatus(s,'phone-live','telephony',productHooks).available,true);
 P.command(s,{action:'lifecycle',offer:'phone-offer',sale:'ended',support:'supported'},productHooks);assert.equal(s.products.offers[0].effectiveLifecycle.sale,'available');
 s.clock=3;P.advance(s,productHooks);assert.equal(P.featureStatus(s,'phone-live','telephony',productHooks).available,true);
 assert.throws(()=>P.command(s,{action:'deploy',id:'new-phone',offer:'phone-offer',productVersion:'scenario-1',mode:'multitenant'},productHooks),/OFFER_NOT_FOR_SALE/);
 P.command(s,{action:'lifecycle',offer:'phone-offer',sale:'ended',support:'ended'},productHooks);s.clock=4;P.advance(s,productHooks);
 assert.equal(P.featureStatus(s,'phone-live','telephony',productHooks).code,'OFFER_UNSUPPORTED');assert.equal(s.products.deployments[0].effective.productVersion,'scenario-1');assert.equal(P.validate(s),true);
});

test('AC-SOC-105 product provisioning failures retain prior effective version and validators reject stale-ready saves',()=>{
 const s=products(),previous=structuredClone(s.products.deployments[0].effective);
 P.command(s,{action:'configure',id:'phone-live',config:{productVersion:'scenario-2',dependencies:{identity:'missing-resource'}}},productHooks);
 s.clock=3;P.advance(s,productHooks);assert.equal(s.products.deployments[0].provisioning.status,'failed');assert.deepEqual(s.products.deployments[0].effective,previous);
 const corrupt=structuredClone(s);corrupt.products.deployments[0].provisioning.status='ready';assert.throws(()=>P.validate(corrupt),/INVALID_PRODUCT_DEPLOYMENT/);
 assert.equal(P.featureStatus(s,'phone-live','telephony',productHooks).available,true);
});

test('AC-SOC-106 product save cannot retain a verified label after directional evidence is removed',()=>{
 const s=products();P.command(s,{action:'offer',offer:{id:'suite-offer',family:'cisco:suite-calling',edition:'scenario-edition',unit:'seat',quantity:10,features:['multitenant-calling'],dependencies:{identity:'identity',carrier:'carrier'}}},productHooks);s.clock=3;P.advance(s,productHooks);
 P.command(s,{action:'deploy',id:'suite-live',offer:'suite-offer',productVersion:'scenario-1',mode:'multitenant'},productHooks);s.clock=4;P.advance(s,productHooks);
 P.command(s,{action:'integration',id:'suite-to-phone',source:'suite-live',target:'phone-live',features:[{sourceFeature:'multitenant-calling',targetFeature:'telephony'}]},productHooks);
 assert.equal(P.command(s,{action:'test-integration',id:'suite-to-phone'},productHooks).status,'scenario-verified');
 const tampered=structuredClone(s);tampered.products.integrations[0].result.reasons=['DIRECTIONAL_PATH_NOT_OBSERVED'];tampered.products.integrations[0].result.checks[0].source={available:false};
 assert.throws(()=>P.validate(tampered),/INVALID_PRODUCT_INTEGRATION/);
});
