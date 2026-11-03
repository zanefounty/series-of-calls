const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const C=require('../src/game/47-channels');

const tenant='orchard-repairs',otherTenant='canopy-group',person='alex',otherPerson='bea';
function fixture(){
 const world={clock:0,cases:{'case-1':{identity:person},'case-2':{identity:otherPerson}}};
 const s=C.create(world);C.advance(s,1);
 for(const channel of C.channels)C.command(s,{action:'observe',channel,authenticated:true,providerAvailable:true,fault:null});
 grant(s,tenant,person,'chatterleaf','service',1000);grant(s,tenant,person,'letterbox','transactional',1000);grant(s,tenant,person,'casechat','service',1000);
 return {s,world};
}
function grant(s,t,p,ch,purpose,expiresAt=null){C.command(s,{action:'permission',tenant:t,person:p,channel:ch,purpose,granted:true,expiresAt});}
function revoke(s,t,p,ch,purpose){C.command(s,{action:'permission',tenant:t,person:p,channel:ch,purpose,granted:false,expiresAt:null});}
function bind(t,p,ch,purpose,caseId,extra={}){return {tenant:t,canonicalPerson:p,account:ch,purpose,caseId,...extra};}
function openCasechat(s,caseId='case-1',p=person,t=tenant){return C.command(s,{action:'open',tenant:t,person:p,channel:'casechat',purpose:'service',caseId},bind(t,p,'casechat','service',caseId,{caseIdentity:p,caseTenant:t,authenticatedIdentity:p}));}
function openChatterleaf(s,caseId='case-1',p=person,t=tenant){return C.command(s,{action:'open',tenant:t,person:p,channel:'chatterleaf',purpose:'service',caseId},bind(t,p,'chatterleaf','service',caseId));}
function caseContext(caseId='case-1',p=person,t=tenant){return bind(t,p,'casechat','service',caseId,{template:'case-update',caseIdentity:p,caseTenant:t,authenticatedIdentity:p});}

test('AC-SOC-072 three fictional channels have distinct account and eligibility rules',()=>{
 const {s}=fixture();
 openChatterleaf(s);
 assert.equal(C.beforeAccept(s,{tenant,person,channel:'chatterleaf',purpose:'service',caseId:'case-1'},bind(tenant,person,'chatterleaf','service','case-1')).eligible,true);
 const letterbox=C.beforeAccept(s,{tenant,person,channel:'letterbox',purpose:'transactional',caseId:'case-2',template:'transaction-update'},bind(tenant,person,'letterbox','transactional','case-2',{template:'transaction-update',at:90}));
 assert.equal(letterbox.eligible,true);assert.equal(s.accounts.letterbox.effective.asynchronous,true);assert.equal(letterbox.window.required,false);
 const missingSession=C.beforeAccept(s,{tenant,person,channel:'casechat',purpose:'service',caseId:'case-1',template:'case-update',authenticatedIdentity:person},caseContext());
 assert.equal(missingSession.reason,'CASECHAT_SESSION_REQUIRED');
 openCasechat(s);const active=C.beforeAccept(s,{tenant,person,channel:'casechat',purpose:'service',caseId:'case-1',template:'case-update',authenticatedIdentity:person},caseContext());assert.equal(active.eligible,true);
 const consentBefore=structuredClone(s.permissions.find(x=>x.channel==='chatterleaf'));C.command(s,{action:'observe',channel:'chatterleaf',authenticated:true,providerAvailable:false,fault:'OUTAGE'});
 assert.equal(C.beforeAccept(s,{tenant,person,channel:'chatterleaf',purpose:'service',caseId:'case-1'},bind(tenant,person,'chatterleaf','service','case-1')).reason,'CHANNEL_PROVIDER_UNAVAILABLE');assert.deepEqual(s.permissions.find(x=>x.channel==='chatterleaf'),consentBefore);
 C.command(s,{action:'observe',channel:'chatterleaf',authenticated:true,providerAvailable:true,fault:null});
 const unverified=fixture().s,letterboxConfig={...unverified.accounts.letterbox.desired,verifiedSender:false};C.command(unverified,{action:'configure',channel:'letterbox',config:letterboxConfig});C.advance(unverified,2);
 assert.equal(C.beforeAccept(unverified,{tenant,person,channel:'letterbox',purpose:'transactional',caseId:'case-2',template:'transaction-update'},bind(tenant,person,'letterbox','transactional','case-2',{template:'transaction-update'})).reason,'LETTERBOX_SENDER_UNVERIFIED');
 assert.match(C.witty.chatterleaf,/polite knock/);assert.match(C.witty.letterbox,/read receipt/);assert.match(C.witty.casechat,/case number/);
});

test('AC-SOC-073 permissions are per tenant, canonical person, channel and purpose; revoked queued sends fail fresh checks',()=>{
 const {s}=fixture();openChatterleaf(s);
 const request={tenant,person,channel:'chatterleaf',purpose:'service',caseId:'case-1'},context=bind(tenant,person,'chatterleaf','service','case-1');
 assert.equal(C.beforeAccept(s,request,context).eligible,true);
 grant(s,tenant,person,'chatterleaf','transactional',100);
 assert.equal(C.beforeAccept(s,{...request,purpose:'transactional',template:'service-outside-window'},bind(tenant,person,'chatterleaf','transactional','case-1',{template:'service-outside-window'})).eligible,true);
 assert.equal(C.beforeAccept(s,{...request,person:otherPerson},bind(tenant,otherPerson,'chatterleaf','service','case-1')).reason,'CHANNEL_PERMISSION_REQUIRED');
 assert.equal(C.beforeAccept(s,{...request,tenant:otherTenant},bind(otherTenant,person,'chatterleaf','service','case-1')).reason,'CHANNEL_PERMISSION_REQUIRED');
 revoke(s,tenant,person,'chatterleaf','service');
 const afterRevoke=C.beforeAccept(s,request,context);assert.equal(afterRevoke.eligible,false);assert.equal(afterRevoke.reason,'CHANNEL_PERMISSION_REQUIRED');
 assert.equal(s.permissions.find(x=>x.tenant===tenant&&x.person===person&&x.channel==='chatterleaf'&&x.purpose==='transactional').granted,true);
 const expiring=fixture().s;grant(expiring,tenant,person,'chatterleaf','service',2);openChatterleaf(expiring);C.advance(expiring,2);
 assert.equal(C.beforeAccept(expiring,request,context).reason,'CHANNEL_PERMISSION_REQUIRED');
});

test('AC-SOC-074 Chatterleaf has finite reply windows and approved outside-window templates; Letterbox has no universal window',()=>{
 const {s}=fixture();openChatterleaf(s);
 const request={tenant,person,channel:'chatterleaf',purpose:'service',caseId:'case-1'};
 const base=bind(tenant,person,'chatterleaf','service','case-1');
 assert.equal(C.beforeAccept(s,request,{...base,at:25}).reason,'CHATTERLEAF_REPLY_WINDOW_EXPIRED');
 const templated=C.beforeAccept(s,{...request,template:'service-outside-window'},{...base,template:'service-outside-window',at:25});assert.equal(templated.eligible,true);assert.equal(templated.window.open,false);
 assert.equal(C.beforeAccept(s,{...request,template:'unapproved-template'},{...base,template:'unapproved-template',at:25}).eligible,false);
 const noInbound=fixture().s,noWindowRequest={tenant,person,channel:'chatterleaf',purpose:'service',caseId:'case-2',template:'appointment-reminder'},noWindowContext=bind(tenant,person,'chatterleaf','service','case-2',{template:'appointment-reminder'});
 assert.equal(C.beforeAccept(noInbound,{...noWindowRequest,template:undefined},{...noWindowContext,template:undefined}).reason,'CHATTERLEAF_INBOUND_WINDOW_REQUIRED');assert.equal(C.beforeAccept(noInbound,noWindowRequest,noWindowContext).eligible,true);
 const email=C.beforeAccept(s,{tenant,person,channel:'letterbox',purpose:'transactional',caseId:'case-1',template:'transaction-update'},bind(tenant,person,'letterbox','transactional','case-1',{template:'transaction-update',at:500}));assert.equal(email.eligible,true);assert.equal(email.window.required,false);
});

test('AC-SOC-075 Casechat requires an authenticated case owner session with tenant and expiry binding',()=>{
 const {s}=fixture();
 assert.throws(()=>C.command(s,{action:'open',tenant,person,channel:'casechat',purpose:'service',caseId:'case-1'},bind(tenant,person,'casechat','service','case-1',{authenticatedIdentity:person})),/CASECHAT_CASE_BINDING_REQUIRED/);
 openCasechat(s);
 const request={tenant,person,channel:'casechat',purpose:'service',caseId:'case-1',template:'case-update',authenticatedIdentity:person};
 assert.equal(C.beforeAccept(s,request,{...caseContext(),at:30}).eligible,true);
 assert.equal(C.beforeAccept(s,{...request,authenticatedIdentity:otherPerson},{...caseContext(),authenticatedIdentity:otherPerson}).reason,'CASECHAT_IDENTITY_MISMATCH');
 assert.equal(C.beforeAccept(s,{...request,caseId:'case-2',conversationId:s.conversations[0].id},{...caseContext('case-2',person,tenant),conversationId:s.conversations[0].id}).reason,'CHANNEL_CONVERSATION_BINDING');
 const foreign=caseContext('case-1',person,otherTenant);assert.equal(C.beforeAccept(s,{...request,tenant:otherTenant},foreign).reason,'CHANNEL_PERMISSION_REQUIRED');
 assert.equal(C.beforeAccept(s,request,{...caseContext(),at:31}).reason,'CASECHAT_SESSION_EXPIRED');
 C.advance(s,31);assert.equal(s.conversations[0].status,'expired');
 const unauth=fixture().s;openCasechat(unauth);const config={...unauth.accounts.casechat.desired,authenticated:false};C.command(unauth,{action:'configure',channel:'casechat',config});C.advance(unauth,2);
 assert.equal(C.beforeAccept(unauth,request,caseContext()).reason,'CASECHAT_ACCOUNT_UNAUTHENTICATED');
});

test('AC-SOC-076 paused conversations allocate no work and resume rechecks current permission and identity',()=>{
 const {s}=fixture();openCasechat(s);const conv=s.conversations[0],context=caseContext();
 C.command(s,{action:'pause',conversation:conv.id});
 const request={tenant,person,channel:'casechat',purpose:'service',caseId:'case-1',template:'case-update',authenticatedIdentity:person};
 assert.equal(C.beforeAccept(s,request,context).reason,'CHANNEL_CONVERSATION_PAUSED');
 assert.equal('assignments' in s,false);assert.equal('workforceOps' in s,false);
 const resumeContext=caseContext();
 assert.throws(()=>C.command(s,{action:'resume',conversation:conv.id,person:otherPerson},{...resumeContext,canonicalPerson:otherPerson}),/CHANNEL_CONVERSATION_BINDING/);
 revoke(s,tenant,person,'casechat','service');assert.throws(()=>C.command(s,{action:'resume',conversation:conv.id,person},resumeContext),/CHANNEL_PERMISSION_REQUIRED/);assert.equal(conv.status,'paused');
 grant(s,tenant,person,'casechat','service',100);C.command(s,{action:'resume',conversation:conv.id,person},resumeContext);assert.equal(conv.status,'active');assert.equal(C.beforeAccept(s,request,context).eligible,true);
});

test('AC-SOC-077 delivery and read receipts are distinct, ordered, idempotent, and do not resolve a conversation',()=>{
 const {s}=fixture();openCasechat(s);const request={id:'message-1',tenant,person,channel:'casechat',purpose:'service',caseId:'case-1',template:'case-update',authenticatedIdentity:person};
 const conv=s.conversations[0],context={...caseContext(),conversationId:conv.id};
 const read={action:'read',conversation:conv.id,interaction:'message-1',eventId:'read-event-1'},readContext=caseContext();
 assert.throws(()=>C.command(s,read,readContext),/MESSAGE_NOT_DELIVERED/);
 const acceptedJob={id:'delivery-job-1',interaction:request.id,status:'accepted',acceptedAt:s.clock};C.recordAcceptance(s,request,context,acceptedJob);revoke(s,tenant,person,'casechat','service');C.advance(s,s.clock+1);
 const deliveredJob={...acceptedJob,status:'delivered',receiptAt:s.clock};const delivered=C.recordDelivery(s,request,context,deliveredJob);assert.equal(delivered.kind,'delivery');
 assert.equal(C.recordDelivery(s,request,context,deliveredJob).id,delivered.id);
 const receipt=C.command(s,read,readContext);assert.equal(s.receipts.at(-1).kind,'read');C.command(s,read,readContext);assert.equal(s.receipts.filter(x=>x.kind==='read').length,1);
 assert.equal(conv.status,'active');assert.equal(C.inspect(s).receipts.filter(x=>x.kind==='delivery').length,1);assert.equal(C.inspect(s).receipts.filter(x=>x.kind==='read').length,1);
 assert.equal(C.recordDelivery(s,request,context,deliveredJob).id,delivered.id);assert.equal(receipt,null);
});

test('AC-SOC-078 failed provisioning preserves effective accounts; validation, purity and worker source are deterministic',()=>{
 const {s}=fixture(),old=structuredClone(s.accounts.chatterleaf.effective);
 const next={...old,sender:'new-chatterleaf-sender',localDependencyAvailable:false};C.command(s,{action:'configure',channel:'chatterleaf',config:next});
 assert.deepEqual(s.accounts.chatterleaf.effective,old);assert.equal(s.accounts.chatterleaf.provisioning.status,'pending');C.advance(s,2);
 assert.equal(s.accounts.chatterleaf.provisioning.status,'failed');assert.deepEqual(s.accounts.chatterleaf.effective,old);
 openChatterleaf(s);assert.equal(C.beforeAccept(s,{tenant,person,channel:'chatterleaf',purpose:'service',caseId:'case-1'},bind(tenant,person,'chatterleaf','service','case-1')).eligible,true);
 const before=JSON.stringify(s),fp=C.fingerprint(s);assert.deepEqual(C.inspect(s),C.inspect(s));assert.equal(C.fingerprint(s),fp);assert.equal(JSON.stringify(s),before);
 const letterboxMessage={id:'msg-2',tenant,person,channel:'letterbox',purpose:'transactional',caseId:'case-2',template:'transaction-update'},letterboxContext=bind(tenant,person,'letterbox','transactional','case-2',{template:'transaction-update'}),letterboxAccepted={id:'delivery-job-2',interaction:'msg-2',status:'accepted',acceptedAt:s.clock};C.recordAcceptance(s,letterboxMessage,letterboxContext,letterboxAccepted);C.advance(s,s.clock+1);C.recordDelivery(s,letterboxMessage,letterboxContext,{...letterboxAccepted,status:'delivered',receiptAt:s.clock});
 const afterDelivery=C.fingerprint(s),letterboxConversation=s.conversations.find(x=>x.channel==='letterbox');C.command(s,{action:'read',conversation:letterboxConversation.id,interaction:'msg-2',eventId:'read-2'},{tenant,canonicalPerson:person,account:'letterbox',caseId:'case-2'});assert.equal(C.fingerprint(s),afterDelivery);
 assert.equal(C.validate(s),true);
 const bad=structuredClone(s);bad.permissions[0].channel='unknown';assert.throws(()=>C.validate(bad),/INVALID_CHANNEL_PERMISSION_SAVE/);
 assert.throws(()=>C.command(s,{action:'observe',channel:'casechat',authenticated:true,providerAvailable:true,fault:null,extra:true}),/INVALID_CHANNEL_OBSERVATION/);
 const context={};vm.createContext(context);vm.runInContext(C.source()+';globalThis.exportedChannels=SOC_CHANNELS;',context);assert.equal(context.exportedChannels.PACK,C.PACK);assert.deepEqual(JSON.parse(JSON.stringify(context.exportedChannels.inspect(s))),C.inspect(s));
});
