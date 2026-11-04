const test=require('node:test');
const assert=require('node:assert/strict');
const demand=require('../src/game/22-provider-demand');
const channels=require('../src/game/47-channels');

const request=(scenario='smb',seed=8123,periodIndex=0,eligible={socialMessaging:false,workplaceChat:false,video:false})=>({
 scenario,customerId:'customer-a',seed,periodIndex,
 voiceArrivals:[4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49],
 digitalArrivals:[5,11,17,23,29,35,41,47],
 caseIds:Array.from({length:24},(_,i)=>`case-${i+1}`),eligible
});

test('unconnected preference channels preserve all 24 authored case obligations and voice floor',()=>{
 const input=request(),before=JSON.stringify(input),plan=demand.plan(input);
 assert.equal(JSON.stringify(input),before,'planning is pure');
 assert.equal(plan.totalCases,24);
 assert.equal(plan.actualVoiceCount,16);
 assert.equal(plan.actualDigitalCount,8);
 assert.equal(plan.actualMeetingCount,0);
 assert.deepEqual(plan.substitutions,{socialMessaging:0,workplaceChat:0,video:0});
 assert.deepEqual(plan.jobs.map(x=>x.caseId).sort(),input.caseIds.slice().sort());
 assert.ok(plan.jobs.every(x=>x.sourceCaseIndex>=0&&x.sourceCaseIndex<24));
});

test('eligible authored SMB social preference converts four calls without crossing the compulsory voice floor',()=>{
 const plan=demand.plan(request('smb',2026,1,{socialMessaging:true,workplaceChat:true,video:true}));
 assert.equal(plan.totalCases,24);
 assert.equal(plan.substitutions.socialMessaging,4);
 assert.equal(plan.substitutions.workplaceChat,0,'SMB has no authored workplace-chat preference');
 assert.equal(plan.substitutions.video,0,'SMB has no authored video preference');
 assert.equal(plan.actualVoiceCount,12);
 assert.equal(plan.actualDigitalCount,12);
 assert.ok(plan.actualVoiceCount>=plan.voiceFloor);
 assert.ok(plan.jobs.filter(x=>x.preference==='socialMessaging').every(x=>x.channel==='message'&&x.account==='chatterleaf'&&x.operationId==='cisco-programmable-engagement'));
});

test('enterprise preferences use only ready purchased connectors and keep every original case ID',()=>{
 const input=request('enterprise',331,2,{socialMessaging:true,workplaceChat:true,video:true});
 const plan=demand.plan(input);
 assert.deepEqual(plan.substitutions,{socialMessaging:2,workplaceChat:2,video:2});
 assert.equal(plan.totalCases,24);
 assert.equal(plan.actualVoiceCount,10);
 assert.equal(plan.actualDigitalCount,12);
 assert.equal(plan.actualMeetingCount,2);
 assert.ok(plan.actualVoiceCount>=plan.voiceFloor);
 assert.deepEqual(plan.jobs.map(x=>x.caseId).sort(),input.caseIds.slice().sort());
 assert.ok(plan.jobs.filter(x=>x.preference==='workplaceChat').every(x=>x.channel==='message'&&x.account==='workplace'&&x.template==='case-update'&&x.operationId==='ms-communications-api'));
 assert.ok(plan.jobs.filter(x=>x.preference==='video').every(x=>x.channel==='meeting'&&x.account===null&&x.operationId==='cisco-meetings-interoperability'));
});

test('preference selection is reproducible for the same customer, seed and period, but seed/customer changes selected slots',()=>{
 const a=request('enterprise',811,3,{socialMessaging:true,workplaceChat:true,video:true});
 const b=request('enterprise',812,3,{socialMessaging:true,workplaceChat:true,video:true});
 const first=demand.plan(a),repeat=demand.plan(a),other=demand.plan(b),otherCustomer=demand.plan({...a,customerId:'customer-b'});
 assert.deepEqual(first,repeat);
 assert.notDeepEqual(first.jobs.filter(x=>x.preference).map(x=>x.sourceCaseIndex),other.jobs.filter(x=>x.preference).map(x=>x.sourceCaseIndex));
 assert.notDeepEqual(first.jobs.filter(x=>x.preference).map(x=>x.sourceCaseIndex),otherCustomer.jobs.filter(x=>x.preference).map(x=>x.sourceCaseIndex));
});

test('a channel connector cannot manufacture an unauthored preference or lower the scenario voice floor',()=>{
 const plan=demand.plan(request('defence',77,0,{socialMessaging:true,workplaceChat:true,video:true}));
 assert.deepEqual(plan.substitutions,{socialMessaging:0,workplaceChat:0,video:1});
 assert.equal(plan.actualVoiceCount,15);
 assert.equal(plan.totalCases,24);
 assert.ok(plan.actualVoiceCount>=15);
});

test('channel/account and costed operation mappings are explicit and unknown connectors do not resolve',()=>{
 assert.deepEqual(demand.connectorFor('social-messaging'),{preference:'socialMessaging',id:'social-messaging',operationId:'cisco-programmable-engagement',interactionChannel:'message',account:'chatterleaf',template:'service-outside-window',kind:'digital'});
 assert.deepEqual(demand.connectorFor('workplace-chat'),{preference:'workplaceChat',id:'workplace-chat',operationId:'ms-communications-api',interactionChannel:'message',account:'workplace',template:'case-update',kind:'digital'});
 assert.equal(demand.connectorFor('unfunded-social'),null);
 assert.throws(()=>demand.plan({...request(),eligible:{socialMessaging:true,workplaceChat:false,video:false,unfunded:true}}),/INVALID_PROVIDER_DEMAND_REQUEST/);
 assert.throws(()=>demand.plan({...request(),caseIds:['duplicate',...Array.from({length:23},()=> 'duplicate')]}),/INVALID_PROVIDER_DEMAND_REQUEST/);
});

test('Slackline workplace account is tenant-authenticated, case-bound and retention-limited',()=>{
 const s=channels.create({clock:0});
 assert.ok(channels.channels.includes('workplace'));
 assert.deepEqual(channels.profiles.workplace.sourceIds,['uc-new:actor:slack']);
 assert.equal(channels.profiles.workplace.fictionalAlias,'Slackline Collaboration');
 channels.command(s,{action:'observe',channel:'workplace',authenticated:true,providerAvailable:true,fault:null});
 channels.advance(s,1);
 channels.command(s,{action:'permission',channel:'workplace',tenant:'orchard',person:'alex',purpose:'service',granted:true,expiresAt:null});
 const context={tenant:'orchard',person:'alex',canonicalPerson:'alex',channel:'workplace',account:'workplace',purpose:'service',caseId:'case-1',caseIdentity:'alex',caseTenant:'orchard',authenticatedIdentity:'alex'};
 const conversation=channels.openConversation(s,{channel:'workplace',tenant:'orchard',person:'alex',purpose:'service',caseId:'case-1'},context);
 assert.equal(conversation.expiresAt,1+30*1440);
 const interaction={id:'interaction-1',caseId:'case-1'};
 assert.equal(channels.eligibility(s,interaction,{...context,template:'case-update'}).eligible,true);
 assert.equal(channels.eligibility(s,{id:'interaction-2'},{...context,tenant:'other',caseTenant:'other',caseId:'case-2',template:'case-update'}).reason,'CHANNEL_PERMISSION_REQUIRED');
 const unbound={...context,caseIdentity:'other'};
 assert.equal(channels.eligibility(s,interaction,{...unbound,template:'case-update'}).reason,'WORKPLACE_CASE_BINDING_REQUIRED');
 channels.advance(s,conversation.expiresAt);
 assert.equal(s.conversations[0].status,'expired');
 assert.equal(channels.eligibility(s,interaction,{...context,template:'case-update',at:s.clock}).reason,'CHANNEL_CONVERSATION_CLOSED');
 channels.validate(s);
});

test('legacy three-account saves validate and lazily migrate when workplace is explicitly configured',()=>{
 const s=channels.create({clock:0});delete s.accounts.workplace;
 const fingerprint=channels.fingerprint(s);assert.equal(channels.validate(s),true);assert.equal(channels.fingerprint(s),fingerprint);
 channels.advance(s,1);
 assert.equal(s.accounts.workplace,undefined,'unrelated tick leaves a legacy snapshot unmodified');
 channels.command(s,{action:'observe',channel:'workplace',authenticated:true,providerAvailable:true,fault:null});
 channels.advance(s,2);
 assert.ok(s.accounts.workplace);
 assert.equal(s.accounts.workplace.provisioning.status,'ready');
 assert.equal(channels.validate(s),true);
});

test('workplace account provisioning and provider outage require real recovery before acceptance',()=>{
 const s=channels.create({clock:0});
 channels.command(s,{action:'observe',channel:'workplace',authenticated:true,providerAvailable:true,fault:null});
 channels.command(s,{action:'configure',channel:'workplace',config:{...channels.defaults.workplace,localDependencyAvailable:false}});
 channels.advance(s,1);
 assert.equal(s.accounts.workplace.provisioning.status,'failed');
 assert.equal(s.accounts.workplace.effective,null);
 channels.command(s,{action:'configure',channel:'workplace',config:channels.defaults.workplace});
 channels.advance(s,2);
 assert.equal(s.accounts.workplace.provisioning.status,'ready');
 const context={tenant:'orchard',person:'alex',canonicalPerson:'alex',channel:'workplace',account:'workplace',purpose:'service',caseId:'case-1',caseIdentity:'alex',caseTenant:'orchard',authenticatedIdentity:'alex'};
 channels.command(s,{action:'permission',channel:'workplace',tenant:'orchard',person:'alex',purpose:'service',granted:true,expiresAt:null});
 channels.openConversation(s,{channel:'workplace',tenant:'orchard',person:'alex',purpose:'service',caseId:'case-1'},context);
 const interaction={id:'workplace-message-1',caseId:'case-1'},ctx={...context,template:'case-update'};
 assert.equal(channels.eligibility(s,interaction,ctx).eligible,true);
 channels.command(s,{action:'observe',channel:'workplace',authenticated:true,providerAvailable:false,fault:'OUTAGE'});
 assert.equal(channels.eligibility(s,interaction,ctx).reason,'CHANNEL_PROVIDER_UNAVAILABLE');
 channels.command(s,{action:'observe',channel:'workplace',authenticated:true,providerAvailable:true,fault:null});
 assert.equal(channels.eligibility(s,interaction,ctx).eligible,true);
});
