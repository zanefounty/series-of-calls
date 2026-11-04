/* Optional fictional digital-channel policies. Messages, receipts and cases are synthetic. */
function socChannelsKernel(){
 'use strict';
 const PACK='soc-channels-1',copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=code=>{throw new Error(code);},id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x),integer=(x,min=0,max=100000000)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 const legacyChannels=['chatterleaf','letterbox','casechat'],channels=[...legacyChannels,'workplace'],purposes=['service','transactional','promotional','appointment'];
 const profiles={workplace:{sourceIds:['uc-new:actor:slack'],fictionalAlias:'Slackline Collaboration',role:'Persistent collaboration and communication-channel alternative',evidence:'Fictional profile only; it does not assert real-world feature, licence, region, support or certification.'}};
 const witty={chatterleaf:'Chatterleaf Business — the reply window is a polite knock, not a battering ram.',letterbox:'Letterbox Service — the letter can arrive later; it does not become a read receipt by optimism.',casechat:'Casechat Web — a session key matters; a familiar case number is not one.'};
 const defaults={
  chatterleaf:{sender:'orchard-business',approvedSender:true,purposes:['service','transactional','promotional','appointment'],approvedTemplates:['service-outside-window','appointment-reminder'],responseWindowMinutes:24,localDependencyAvailable:true},
  letterbox:{sender:'orchard-support',verifiedSender:true,purposes:['service','transactional','promotional','appointment'],templates:['transaction-update','case-receipt','appointment-confirmation'],asynchronous:true,localDependencyAvailable:true},
  casechat:{origin:'https://support.orchard.example',authenticated:true,purposes:['service','transactional'],templates:['case-update','handoff-note'],sessionMinutes:30,localDependencyAvailable:true},
  workplace:{workspace:'orchard-collaboration',authenticated:true,reachScope:'same-tenant',purposes:['service','transactional'],templates:['case-update','handoff-note'],retentionDays:30,localDependencyAvailable:true}
 };
 const purposeId=x=>id(x)&&purposes.includes(x),list=(x,max=200)=>Array.isArray(x)&&x.length<=max;
 function validateConfig(channel,c){
  const d=defaults[channel];if(!d||!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).sort().join(',')!==Object.keys(d).sort().join(','))fail('INVALID_CHANNEL_CONFIG');
  if(channel==='chatterleaf'){
   if(!id(c.sender)||typeof c.approvedSender!=='boolean'||!list(c.purposes,10)||!c.purposes.length||c.purposes.some(x=>!purposeId(x))||new Set(c.purposes).size!==c.purposes.length||!list(c.approvedTemplates,50)||c.approvedTemplates.some(x=>!id(x))||new Set(c.approvedTemplates).size!==c.approvedTemplates.length||!integer(c.responseWindowMinutes,1,10080)||typeof c.localDependencyAvailable!=='boolean')fail('INVALID_CHATTERLEAF_CONFIG');
  }else if(channel==='letterbox'){
   if(!id(c.sender)||typeof c.verifiedSender!=='boolean'||!list(c.purposes,10)||!c.purposes.length||c.purposes.some(x=>!purposeId(x))||new Set(c.purposes).size!==c.purposes.length||!list(c.templates,50)||!c.templates.length||c.templates.some(x=>!id(x))||new Set(c.templates).size!==c.templates.length||c.asynchronous!==true||typeof c.localDependencyAvailable!=='boolean')fail('INVALID_LETTERBOX_CONFIG');
  }else if(channel==='casechat'){
   if(typeof c.origin!=='string'||c.origin.length>120||!/^https:\/\/[a-z0-9.-]+\.example(?:\/[a-z0-9/_-]*)?$/.test(c.origin)||typeof c.authenticated!=='boolean'||!list(c.purposes,10)||!c.purposes.length||c.purposes.some(x=>!purposeId(x))||new Set(c.purposes).size!==c.purposes.length||!list(c.templates,50)||!c.templates.length||c.templates.some(x=>!id(x))||new Set(c.templates).size!==c.templates.length||!integer(c.sessionMinutes,1,1440)||typeof c.localDependencyAvailable!=='boolean')fail('INVALID_CASECHAT_CONFIG');
  }else if(channel==='workplace'){
   if(c.workspace!=='orchard-collaboration'||typeof c.authenticated!=='boolean'||c.reachScope!=='same-tenant'||!list(c.purposes,10)||!c.purposes.length||c.purposes.some(x=>!purposeId(x))||new Set(c.purposes).size!==c.purposes.length||!list(c.templates,50)||!c.templates.length||c.templates.some(x=>!id(x))||new Set(c.templates).size!==c.templates.length||!integer(c.retentionDays,1,365)||typeof c.localDependencyAvailable!=='boolean')fail('INVALID_WORKPLACE_CONFIG');
  }
 }
 function newAccount(s,channel){return {desired:copy(defaults[channel]),effective:null,generation:0,provisioning:{status:'pending',due:s.clock+1,generation:0,errors:[]},observed:{authenticated:false,providerAvailable:false,fault:null}};}
 const webhookDefaults={enabled:false,rateLimit:5,retries:3,backoff:1},webhookObservations={authenticated:true,applicationAvailable:true,supplierAvailable:true};
 function newWebhookPolicy(clock){return {desired:copy(webhookDefaults),effective:copy(webhookDefaults),generation:0,provisioning:{status:'ready',due:clock,generation:0,errors:[]},observed:copy(webhookObservations),deliveries:[]};}
 function create(s){if(!s||!Number.isSafeInteger(s.clock)||s.clock<0)fail('INVALID_CHANNEL_STATE');return {pack:PACK,version:1,accounts:Object.fromEntries(channels.map(channel=>[channel,newAccount(s,channel)])),permissions:[],conversations:[],acceptances:[],receipts:[],webhooks:newWebhookPolicy(s.clock),nextId:1,clock:s.clock};}
 function ensureAccounts(s){if(!s.accounts.workplace)s.accounts.workplace=newAccount(s,'workplace');return s.accounts;}
 function account(s,channel){return s.accounts[channel]||newAccount(s,channel);}
 function ensureWebhooks(s){if(!s.webhooks)s.webhooks=newWebhookPolicy(s.clock);return s.webhooks;}
 function webhookDelivery(s,receipt){const w=ensureWebhooks(s);if(!w.effective.enabled)return null;const key=`channel-delivery-${receipt.id}`;let item=w.deliveries.find(x=>x.idempotencyKey===key);if(item)return item;if(w.deliveries.length>=2000)fail('WEBHOOK_CAPACITY');const accepted=s.acceptances.find(x=>x.interaction===receipt.interaction);if(!accepted)fail('CHANNEL_ACCEPTANCE_REQUIRED');item={id:`webhook-${s.nextId++}`,idempotencyKey:key,receipt:receipt.id,interaction:receipt.interaction,tenant:receipt.tenant,person:receipt.person,channel:receipt.channel,caseId:accepted.caseId,status:'pending',attempts:[],attemptCount:0,nextAttemptAt:s.clock+1,reason:null,createdAt:s.clock,deliveredAt:null};w.deliveries.push(item);return item;}
 function validateWebhookConfig(c){if(!exact(c,Object.keys(webhookDefaults))||typeof c.enabled!=='boolean'||!integer(c.rateLimit,1,100)||!integer(c.retries,0,8)||!integer(c.backoff,1,60))fail('INVALID_WEBHOOK_CONFIG');}
 function validatePermission(p){return exact(p,['tenant','person','channel','purpose','granted','expiresAt','updatedAt'])&&id(p.tenant)&&id(p.person)&&channels.includes(p.channel)&&purposeId(p.purpose)&&typeof p.granted==='boolean'&&(p.expiresAt===null||integer(p.expiresAt))&&integer(p.updatedAt)&&(!p.granted||p.expiresAt===null||p.expiresAt>p.updatedAt)&& (p.granted||p.expiresAt===null);}
 function permission(s,tenant,person,channel,purpose,at){const p=s.permissions.find(x=>x.tenant===tenant&&x.person===person&&x.channel===channel&&x.purpose===purpose);return p&&p.granted&&(p.expiresAt===null||p.expiresAt>at)?p:null;}
 function conversation(s,context){
  if(context.conversationId!==undefined)return s.conversations.find(x=>x.id===context.conversationId)||null;
  return s.conversations.find(x=>x.tenant===context.tenant&&x.person===context.person&&x.channel===context.channel&&x.caseId===context.caseId)||null;
 }
 function caseBinding(context){const person=context?.canonicalPerson??context?.person;return !!context&&id(context.tenant)&&id(person)&&context.caseIdentity===person&&context.caseTenant===context.tenant;}
 function accountFailure(s,channel){const a=s.accounts[channel];if(!a||!a.effective)return 'CHANNEL_ACCOUNT_NOT_EFFECTIVE';if(!a.observed.authenticated)return 'CHANNEL_AUTHENTICATION_REQUIRED';if(!a.observed.providerAvailable)return 'CHANNEL_PROVIDER_UNAVAILABLE';if(a.observed.fault)return 'CHANNEL_PROVIDER_FAULT';return null;}
 function eligibility(s,interaction,context={}){
  const i=interaction&&typeof interaction==='object'?interaction:{};
  const c={tenant:context.tenant,person:context.canonicalPerson??context.person,channel:context.account??context.channel,purpose:context.purpose,caseId:context.caseId,template:context.template,conversationId:context.conversationId,at:context.at??s?.clock,caseIdentity:context.caseIdentity,caseTenant:context.caseTenant,authenticatedIdentity:context.authenticatedIdentity};
  const result={eligible:false,reason:null,channel:c.channel,tenant:c.tenant,person:c.person,purpose:c.purpose,caseId:c.caseId,template:c.template,account:{effective:false,authenticated:false,providerAvailable:false},permission:{granted:false,expiresAt:null},window:{required:false,open:false,expiresAt:null},conversation:null};
  const reject=reason=>{result.reason=reason;return result;};
  if(!s||s.pack!==PACK||!interaction||typeof interaction!=='object'||Array.isArray(interaction)||!channels.includes(c.channel)||!id(c.tenant)||!id(c.person)||!purposeId(c.purpose)||!id(c.caseId)||!integer(c.at))return reject('INVALID_CHANNEL_CONTEXT');
  if(i.caseId!==undefined&&i.caseId!==c.caseId)return reject('CHANNEL_CONTEXT_BINDING');
  const a=s.accounts[c.channel],cfg=a?.effective;
  result.account={effective:!!cfg,authenticated:!!a?.observed.authenticated,providerAvailable:!!a?.observed.providerAvailable,fault:a?.observed.fault||null};
  const accountError=accountFailure(s,c.channel);if(accountError)return reject(accountError);
  if(!cfg.purposes.includes(c.purpose))return reject('CHANNEL_PURPOSE_UNSUPPORTED');
  const grant=permission(s,c.tenant,c.person,c.channel,c.purpose,c.at);result.permission={granted:!!grant,expiresAt:grant?.expiresAt??null};if(!grant)return reject('CHANNEL_PERMISSION_REQUIRED');
  const conv=conversation(s,c);if(c.conversationId!==undefined&&!conv)return reject('CHANNEL_CONVERSATION_BINDING');if(conv){result.conversation={id:conv.id,status:conv.status,caseId:conv.caseId};if(conv.tenant!==c.tenant||conv.person!==c.person||conv.channel!==c.channel||conv.caseId!==c.caseId)return reject('CHANNEL_CONVERSATION_BINDING');if(conv.status==='paused')return reject('CHANNEL_CONVERSATION_PAUSED');if(conv.status!=='active')return reject('CHANNEL_CONVERSATION_CLOSED');}
  if(c.channel==='chatterleaf'){
   if(!cfg.approvedSender)return reject('CHATTERLEAF_SENDER_UNAPPROVED');
   const windowEnds=conv?.expiresAt??null;const inWindow=!!conv&&windowEnds!==null&&c.at<windowEnds;result.window={required:true,open:inWindow,expiresAt:windowEnds};
   if(!inWindow&&(!id(c.template)||!cfg.approvedTemplates.includes(c.template)))return reject(conv?'CHATTERLEAF_REPLY_WINDOW_EXPIRED':'CHATTERLEAF_INBOUND_WINDOW_REQUIRED');
   if(!inWindow)result.window.templateAccepted=true;
  }else if(c.channel==='letterbox'){
   if(!cfg.verifiedSender)return reject('LETTERBOX_SENDER_UNVERIFIED');
   if(!id(c.template)||!cfg.templates.includes(c.template))return reject('LETTERBOX_TEMPLATE_UNAVAILABLE');
  }else if(c.channel==='workplace'){
   if(!cfg.authenticated)return reject('WORKPLACE_ACCOUNT_UNAUTHENTICATED');if(!conv)return reject('WORKPLACE_THREAD_REQUIRED');
   if(conv.authenticatedIdentity!==c.person||c.authenticatedIdentity!==c.person)return reject('WORKPLACE_IDENTITY_MISMATCH');
   if(conv.expiresAt===null||c.at>=conv.expiresAt)return reject('WORKPLACE_RETENTION_EXPIRED');
   if(!id(c.template)||!cfg.templates.includes(c.template))return reject('WORKPLACE_TEMPLATE_UNAVAILABLE');
   result.window={required:true,open:true,expiresAt:conv.expiresAt};if(!caseBinding(c))return reject('WORKPLACE_CASE_BINDING_REQUIRED');
  }else{
   if(!cfg.authenticated)return reject('CASECHAT_ACCOUNT_UNAUTHENTICATED');
   if(!conv)return reject('CASECHAT_SESSION_REQUIRED');
   if(conv.authenticatedIdentity!==c.person||c.authenticatedIdentity!==c.person)return reject('CASECHAT_IDENTITY_MISMATCH');
   if(conv.expiresAt===null||c.at>=conv.expiresAt)return reject('CASECHAT_SESSION_EXPIRED');
   if(!id(c.template)||!cfg.templates.includes(c.template))return reject('CASECHAT_TEMPLATE_UNAVAILABLE');
   result.window={required:true,open:true,expiresAt:conv.expiresAt};
   if(!caseBinding(c))return reject('CASECHAT_CASE_BINDING_REQUIRED');
  }
  result.eligible=true;return result;
 }
 function beforeAccept(s,interaction,context={}){return eligibility(s,interaction,context);}
 function recordAcceptance(s,interaction,context={},parentJob){
  if(!s||s.pack!==PACK||!interaction||typeof interaction!=='object'||!id(interaction.id)||!parentJob||!id(parentJob.id)||parentJob.status!=='accepted'||parentJob.interaction!==interaction.id||!integer(parentJob.acceptedAt))fail('INVALID_CHANNEL_ACCEPTANCE');
  const tenant=context.tenant,person=context.canonicalPerson??context.person,channel=context.account??context.channel,purpose=context.purpose,caseId=context.caseId,template=context.template||null;
  const prior=s.acceptances.find(x=>x.interaction===interaction.id);if(prior){if(parentJob.acceptedAt!==prior.authorizedAt||prior.parentJob!==parentJob.id||prior.caseId!==caseId||prior.tenant!==tenant||prior.person!==person||prior.channel!==channel||prior.purpose!==purpose||prior.template!==template||interaction.caseId!==undefined&&interaction.caseId!==caseId)fail('CHANNEL_ACCEPTANCE_CONFLICT');return copy(prior);}
  if(parentJob.acceptedAt!==s.clock)fail('INVALID_CHANNEL_ACCEPTANCE');const check=beforeAccept(s,interaction,context);if(!check.eligible)fail(check.reason);
  if(s.acceptances.length>=4000)fail('CHANNEL_ACCEPTANCE_CAPACITY');const grant=permission(s,check.tenant,check.person,check.channel,check.purpose,s.clock),account=s.accounts[check.channel];
  const acceptance={id:`acceptance-${s.nextId++}`,interaction:interaction.id,parentJob:parentJob.id,conversation:check.conversation?.id||null,tenant:check.tenant,person:check.person,channel:check.channel,purpose:check.purpose,caseId:check.caseId,template:check.template||null,authorizedAt:s.clock,permissionUpdatedAt:grant.updatedAt,permissionExpiresAt:grant.expiresAt,permissionGranted:true,accountGeneration:account.generation};
  s.acceptances.push(acceptance);validate(s);return copy(acceptance);
 }
 function openConversation(s,c,context={}){
  const channel=c.channel;if(!channels.includes(channel)||!id(c.tenant)||!id(c.person)||!purposeId(c.purpose)||!id(c.caseId))fail('INVALID_CHANNEL_CONVERSATION');
  if(context.tenant!==c.tenant||(context.canonicalPerson??context.person)!==c.person||(context.account??context.channel)!==channel||context.purpose!==c.purpose||context.caseId!==c.caseId)fail('CHANNEL_CONVERSATION_BINDING');
  if(!permission(s,c.tenant,c.person,channel,c.purpose,s.clock))fail('CHANNEL_PERMISSION_REQUIRED');
  const a=s.accounts[channel],error=accountFailure(s,channel);if(error)fail(error);
  if(!a.effective.purposes.includes(c.purpose))fail('CHANNEL_PURPOSE_UNSUPPORTED');
  let authenticatedIdentity=null,expiresAt=null;
  if(channel==='casechat'){
   authenticatedIdentity=context.authenticatedIdentity;
   const binding={tenant:c.tenant,person:c.person,caseIdentity:context.caseIdentity,caseTenant:context.caseTenant};
   if(!a.effective.authenticated||authenticatedIdentity!==c.person)fail('CASECHAT_IDENTITY_MISMATCH');
   if(!caseBinding(binding))fail('CASECHAT_CASE_BINDING_REQUIRED');
   expiresAt=s.clock+a.effective.sessionMinutes;
  }else if(channel==='workplace'){
   authenticatedIdentity=context.authenticatedIdentity;const binding={tenant:c.tenant,person:c.person,caseIdentity:context.caseIdentity,caseTenant:context.caseTenant};
   if(!a.effective.authenticated||authenticatedIdentity!==c.person)fail('WORKPLACE_IDENTITY_MISMATCH');if(!caseBinding(binding))fail('WORKPLACE_CASE_BINDING_REQUIRED');
   expiresAt=s.clock+a.effective.retentionDays*1440;
  }else if(channel==='chatterleaf')expiresAt=s.clock+a.effective.responseWindowMinutes;
  const duplicate=s.conversations.find(x=>x.tenant===c.tenant&&x.person===c.person&&x.channel===channel&&x.caseId===c.caseId);if(duplicate&&duplicate.purpose!==c.purpose)fail('CHANNEL_CONVERSATION_BINDING');if(duplicate&&duplicate.status==='paused')fail('CHANNEL_CONVERSATION_PAUSED');if(duplicate&&duplicate.status==='active'&&channel==='casechat')fail('CHANNEL_CONVERSATION_EXISTS');
  if(!duplicate&&s.conversations.length>=2000)fail('CHANNEL_CONVERSATION_CAPACITY');
  const item=duplicate||{id:`conversation-${s.nextId++}`,tenant:c.tenant,person:c.person,channel,purpose:c.purpose,caseId:c.caseId,status:'active',openedAt:s.clock,expiresAt,authenticatedIdentity};item.purpose=c.purpose;item.status='active';item.openedAt=s.clock;item.expiresAt=expiresAt;item.authenticatedIdentity=authenticatedIdentity;if(!duplicate)s.conversations.push(item);return copy(item);
 }
 function resumeConversation(s,c,context={}){
  const conv=s.conversations.find(x=>x.id===c.conversation);if(conv?.status==='expired'&&conv.channel==='casechat')fail('CASECHAT_SESSION_EXPIRED');if(conv?.status==='expired'&&conv.channel==='workplace')fail('WORKPLACE_RETENTION_EXPIRED');if(!conv||conv.status!=='paused')fail('CHANNEL_CONVERSATION_NOT_PAUSED');
  if(c.person!==conv.person||(context.canonicalPerson??context.person)!==conv.person||context.tenant!==conv.tenant||(context.account??context.channel)!==conv.channel||context.caseId!==conv.caseId)fail('CHANNEL_CONVERSATION_BINDING');
  if(!permission(s,conv.tenant,conv.person,conv.channel,conv.purpose,s.clock))fail('CHANNEL_PERMISSION_REQUIRED');
  const accountError=accountFailure(s,conv.channel);if(accountError)fail(accountError);
  if(conv.channel==='casechat'&&(!caseBinding(context)||context.authenticatedIdentity!==conv.person))fail('CASECHAT_IDENTITY_MISMATCH');
  if(conv.channel==='casechat'&&s.clock>=conv.expiresAt)fail('CASECHAT_SESSION_EXPIRED');
  if(conv.channel==='workplace'&&(!caseBinding(context)||context.authenticatedIdentity!==conv.person))fail('WORKPLACE_IDENTITY_MISMATCH');
  if(conv.channel==='workplace'&&s.clock>=conv.expiresAt)fail('WORKPLACE_RETENTION_EXPIRED');
  conv.status='active';return copy(conv);
 }
 function recordDelivery(s,interaction,context={},parentJob){
  const interactionId=interaction?.id;if(!id(interactionId))fail('INVALID_CHANNEL_INTERACTION');
  const accepted=s.acceptances.find(x=>x.interaction===interactionId);if(!accepted)fail('CHANNEL_ACCEPTANCE_REQUIRED');
  if(!parentJob||parentJob.status!=='delivered'||parentJob.id!==accepted.parentJob||parentJob.interaction!==interactionId||parentJob.acceptedAt!==accepted.authorizedAt||!integer(parentJob.receiptAt,parentJob.acceptedAt)||parentJob.receiptAt>s.clock)fail('CHANNEL_PARENT_DELIVERY_REQUIRED');
  if((interaction.caseId!==undefined&&interaction.caseId!==accepted.caseId)||context.tenant!==accepted.tenant||(context.canonicalPerson??context.person)!==accepted.person||(context.account??context.channel)!==accepted.channel||context.purpose!==accepted.purpose||context.caseId!==accepted.caseId)fail('CHANNEL_CONTEXT_BINDING');
  let conv=accepted.conversation?s.conversations.find(x=>x.id===accepted.conversation):conversation(s,{tenant:accepted.tenant,person:accepted.person,channel:accepted.channel,caseId:accepted.caseId});
  const interactionReceipt=s.receipts.find(x=>x.kind==='delivery'&&x.interaction===interactionId);if(interactionReceipt&&(!conv||interactionReceipt.conversation!==conv.id))fail('CHANNEL_RECEIPT_CONFLICT');
  if(conv){if(conv.tenant!==accepted.tenant||conv.person!==accepted.person||conv.channel!==accepted.channel||conv.caseId!==accepted.caseId||conv.purpose!==accepted.purpose)fail('CHANNEL_CONVERSATION_BINDING');const prior=s.receipts.find(x=>x.kind==='delivery'&&x.interaction===interactionId&&x.conversation===conv.id);if(prior)return copy(prior);}
  if(!conv&&['letterbox','chatterleaf'].includes(accepted.channel)){
   if(s.conversations.length>=2000)fail('CHANNEL_CONVERSATION_CAPACITY');conv={id:`conversation-${s.nextId++}`,tenant:accepted.tenant,person:accepted.person,channel:accepted.channel,purpose:accepted.purpose,caseId:accepted.caseId,status:'active',openedAt:s.clock,expiresAt:null,authenticatedIdentity:null};s.conversations.push(conv);
  }
  if(!conv)fail('CHANNEL_CONVERSATION_REQUIRED');
  const prior=s.receipts.find(x=>x.kind==='delivery'&&x.interaction===interactionId&&x.conversation===conv.id);if(prior)return copy(prior);
  if(s.receipts.length>=4000)fail('CHANNEL_RECEIPT_CAPACITY');const r={id:`receipt-${s.nextId++}`,kind:'delivery',interaction:interactionId,conversation:conv.id,tenant:conv.tenant,person:conv.person,channel:conv.channel,at:s.clock};s.receipts.push(r);webhookDelivery(s,r);validate(s);return copy(r);
 }
 function recordRead(s,c,context={}){
  const conv=s.conversations.find(x=>x.id===c.conversation),person=context.canonicalPerson??context.person;if(!conv||person!==conv.person||context.tenant!==conv.tenant||(context.account??context.channel)!==conv.channel||context.caseId!==conv.caseId)fail('CHANNEL_CONVERSATION_BINDING');
  if(!id(c.eventId)||!id(c.interaction))fail('INVALID_CHANNEL_RECEIPT');
  const previous=s.receipts.find(x=>x.id===c.eventId);if(previous){if(previous.kind!=='read'||previous.conversation!==conv.id||previous.interaction!==c.interaction||previous.person!==person)fail('CHANNEL_RECEIPT_CONFLICT');return copy(previous);}
  if(!s.receipts.some(x=>x.kind==='delivery'&&x.conversation===conv.id&&x.interaction===c.interaction))fail('MESSAGE_NOT_DELIVERED');
  if(s.receipts.length>=4000)fail('CHANNEL_RECEIPT_CAPACITY');const r={id:c.eventId,kind:'read',interaction:c.interaction,conversation:conv.id,tenant:conv.tenant,person:conv.person,channel:conv.channel,at:s.clock};s.receipts.push(r);validate(s);return copy(r);
 }
 function validateWebhooks(s,w){
  if(!exact(w,['desired','effective','generation','provisioning','observed','deliveries'])||!Number.isSafeInteger(w.generation)||w.generation<0||!exact(w.provisioning,['status','due','generation','errors'])||w.provisioning.generation!==w.generation||!['pending','ready','failed'].includes(w.provisioning.status)||!integer(w.provisioning.due)||!list(w.provisioning.errors,20)||w.provisioning.errors.some(x=>typeof x!=='string')||w.provisioning.status==='ready'&&JSON.stringify(w.desired)!==JSON.stringify(w.effective)||!exact(w.observed,Object.keys(webhookObservations))||Object.values(w.observed).some(x=>typeof x!=='boolean'))fail('INVALID_WEBHOOK_SAVE');
  validateWebhookConfig(w.desired);if(w.effective!==null)validateWebhookConfig(w.effective);if(!list(w.deliveries,2000))fail('INVALID_WEBHOOK_SAVE');
  const ids=new Set(),keys=new Set();for(const d of w.deliveries){const receipt=s.receipts.find(r=>r.id===d.receipt&&r.kind==='delivery'),accepted=s.acceptances.find(a=>a.interaction===d.interaction);if(!exact(d,['id','idempotencyKey','receipt','interaction','tenant','person','channel','caseId','status','attempts','attemptCount','nextAttemptAt','reason','createdAt','deliveredAt'])||!id(d.id)||ids.has(d.id)||!id(d.idempotencyKey)||keys.has(d.idempotencyKey)||!receipt||!accepted||d.idempotencyKey!==`channel-delivery-${receipt.id}`||!id(d.interaction)||receipt.interaction!==d.interaction||!id(d.tenant)||d.tenant!==receipt.tenant||d.tenant!==accepted.tenant||!id(d.person)||d.person!==receipt.person||d.person!==accepted.person||!channels.includes(d.channel)||d.channel!==receipt.channel||d.channel!==accepted.channel||!id(d.caseId)||d.caseId!==accepted.caseId||!['pending','retry','delivered','failed'].includes(d.status)||!list(d.attempts,9)||!integer(d.attemptCount)||d.attemptCount!==d.attempts.length||!integer(d.nextAttemptAt)||d.nextAttemptAt<d.createdAt||d.reason!==null&&!['APP_AUTH_REJECTED','APP_UNAVAILABLE','SUPPLIER_UNAVAILABLE','RATE_LIMITED'].includes(d.reason)||!integer(d.createdAt)||d.createdAt!==receipt.at||d.createdAt>s.clock||d.deliveredAt!==null&&(!integer(d.deliveredAt)||d.deliveredAt>s.clock)||d.status==='delivered'&&d.deliveredAt===null||d.status!=='delivered'&&d.deliveredAt!==null)fail('INVALID_WEBHOOK_SAVE');
   ids.add(d.id);keys.add(d.idempotencyKey);let previousAt=d.createdAt;for(let i=0;i<d.attempts.length;i++){const a=d.attempts[i];if(!exact(a,['number','at','outcome','retryAt'])||a.number!==i+1||!integer(a.at)||a.at<previousAt||a.at>s.clock||!['DELIVERED','APP_AUTH_REJECTED','APP_UNAVAILABLE','SUPPLIER_UNAVAILABLE','RATE_LIMITED'].includes(a.outcome)||a.retryAt!==null&&(!integer(a.retryAt)||a.retryAt<=a.at)||i<d.attempts.length-1&&a.retryAt===null||a.outcome==='DELIVERED'&&i!==d.attempts.length-1)fail('INVALID_WEBHOOK_ATTEMPT');previousAt=a.at;}
   const last=d.attempts.at(-1);if(d.status==='pending'&&(last||d.reason!==null||d.nextAttemptAt!==d.createdAt+1)||d.status==='retry'&&(!last||last.retryAt!==d.nextAttemptAt||d.reason!==last.outcome||last.outcome==='DELIVERED')||d.status==='delivered'&&(!last||last.outcome!=='DELIVERED'||d.deliveredAt!==last.at||d.reason!==null)||d.status==='failed'&&(!last||last.retryAt!==null||d.reason!==last.outcome))fail('INVALID_WEBHOOK_SAVE');
  }
 }
 function command(s,c,context={}){
  if(!s||s.pack!==PACK||!c||typeof c!=='object'||Array.isArray(c)||typeof c.action!=='string')fail('CHANNELS_NOT_STARTED');if(c.channel==='workplace')ensureAccounts(s);
  if(c.action==='configure'){
   if(Object.keys(c).sort().join(',')!=='action,channel,config'||!channels.includes(c.channel))fail('INVALID_CHANNEL_COMMAND');validateConfig(c.channel,c.config);const a=s.accounts[c.channel];a.desired=copy(c.config);a.generation++;a.provisioning={status:'pending',due:s.clock+1,generation:a.generation,errors:[]};
  }else if(c.action==='observe'){
   if(Object.keys(c).sort().join(',')!=='action,authenticated,channel,fault,providerAvailable'||!channels.includes(c.channel)||typeof c.authenticated!=='boolean'||typeof c.providerAvailable!=='boolean'||c.fault!==null&&!['OUTAGE','AUTHENTICATION_REQUIRED','PROVIDER_REJECTED'].includes(c.fault))fail('INVALID_CHANNEL_OBSERVATION');s.accounts[c.channel].observed={authenticated:c.authenticated,providerAvailable:c.providerAvailable,fault:c.fault};
  }else if(c.action==='permission'){
   if(Object.keys(c).sort().join(',')!=='action,channel,expiresAt,granted,person,purpose,tenant'||!id(c.tenant)||!id(c.person)||!channels.includes(c.channel)||!purposeId(c.purpose)||typeof c.granted!=='boolean'||(c.expiresAt!==null&&!integer(c.expiresAt,s.clock+1))||!c.granted&&c.expiresAt!==null)fail('INVALID_CHANNEL_PERMISSION');
   const i=s.permissions.findIndex(x=>x.tenant===c.tenant&&x.person===c.person&&x.channel===c.channel&&x.purpose===c.purpose),p={tenant:c.tenant,person:c.person,channel:c.channel,purpose:c.purpose,granted:c.granted,expiresAt:c.expiresAt,updatedAt:s.clock};if(i<0){if(s.permissions.length>=2000)fail('CHANNEL_PERMISSION_CAPACITY');s.permissions.push(p);}else s.permissions[i]=p;
  }else if(c.action==='webhook-configure'){
   if(Object.keys(c).sort().join(',')!=='action,config')fail('INVALID_CHANNEL_COMMAND');validateWebhookConfig(c.config);const w=ensureWebhooks(s);w.desired=copy(c.config);w.generation++;w.provisioning={status:'pending',due:s.clock+1,generation:w.generation,errors:[]};
  }else if(c.action==='webhook-observe'){
   if(Object.keys(c).sort().join(',')!=='action,applicationAvailable,authenticated,supplierAvailable'||typeof c.applicationAvailable!=='boolean'||typeof c.authenticated!=='boolean'||typeof c.supplierAvailable!=='boolean')fail('INVALID_CHANNEL_COMMAND');const w=ensureWebhooks(s);w.observed={authenticated:c.authenticated,applicationAvailable:c.applicationAvailable,supplierAvailable:c.supplierAvailable};
  }else if(c.action==='open'){
   const keys=Object.keys(c).sort().join(',');if(keys!=='action,caseId,channel,person,purpose,tenant')fail('INVALID_CHANNEL_COMMAND');if(context.tenant!==c.tenant||(context.canonicalPerson??context.person)!==c.person||(context.account??context.channel)!==c.channel||context.purpose!==c.purpose||context.caseId!==c.caseId)fail('CHANNEL_CONVERSATION_BINDING');openConversation(s,c,context);
  }
  else if(c.action==='pause'){
   if(Object.keys(c).sort().join(',')!=='action,conversation')fail('INVALID_CHANNEL_COMMAND');const x=s.conversations.find(x=>x.id===c.conversation);if(!x||x.status!=='active')fail('CHANNEL_CONVERSATION_NOT_ACTIVE');x.status='paused';
  }else if(c.action==='resume'){
   if(Object.keys(c).sort().join(',')!=='action,conversation,person')fail('INVALID_CHANNEL_COMMAND');resumeConversation(s,c,context);
  }else if(c.action==='read'){
   if(Object.keys(c).sort().join(',')!=='action,conversation,eventId,interaction')fail('INVALID_CHANNEL_COMMAND');recordRead(s,c,context);
  }else if(c.action==='delivery'){
   if(Object.keys(c).sort().join(',')!=='action,interaction,parentJob'||!c.interaction||typeof c.interaction!=='object')fail('INVALID_CHANNEL_COMMAND');recordDelivery(s,c.interaction,context,c.parentJob);
  }else fail('INVALID_CHANNEL_COMMAND');
  validate(s);return null;
 }
 function advance(s,clock){if(!Number.isSafeInteger(clock)||clock<s.clock)fail('INVALID_CHANNEL_CLOCK');ensureWebhooks(s);s.clock=clock;for(const channel of channels){const a=s.accounts[channel];if(!a||a.provisioning.status!=='pending'||a.provisioning.due>clock)continue;a.provisioning.errors=[];if(a.desired.localDependencyAvailable){a.effective=copy(a.desired);a.provisioning.status='ready';}else{a.provisioning.status='failed';a.provisioning.errors.push('CHANNEL_LOCAL_DEPENDENCY_UNAVAILABLE');}}const w=s.webhooks;if(w.provisioning.status==='pending'&&w.provisioning.due<=clock){w.effective=copy(w.desired);w.provisioning={status:'ready',due:w.provisioning.due,generation:w.generation,errors:[]};}for(const c of s.conversations)if(['casechat','workplace'].includes(c.channel)&&['active','paused'].includes(c.status)&&c.expiresAt!==null&&c.expiresAt<=clock)c.status='expired';let attempted=w.deliveries.reduce((n,d)=>n+d.attempts.filter(a=>a.at===clock).length,0);for(const d of w.deliveries){if(!['pending','retry'].includes(d.status)||d.nextAttemptAt>clock)continue;d.attemptCount++;let outcome=null;if(!w.observed.authenticated)outcome='APP_AUTH_REJECTED';else if(!w.observed.applicationAvailable)outcome='APP_UNAVAILABLE';else if(!w.observed.supplierAvailable)outcome='SUPPLIER_UNAVAILABLE';else if(attempted>=w.effective.rateLimit)outcome='RATE_LIMITED';attempted++;const attempt={number:d.attemptCount,at:clock,outcome:outcome||'DELIVERED',retryAt:null};d.attempts.push(attempt);if(!outcome){d.status='delivered';d.reason=null;d.deliveredAt=clock;}else{d.reason=outcome;const retryable=outcome!=='APP_AUTH_REJECTED'&&d.attemptCount<=w.effective.retries;if(retryable){d.status='retry';d.nextAttemptAt=clock+Math.min(64,w.effective.backoff*2**(d.attemptCount-1));attempt.retryAt=d.nextAttemptAt;}else d.status='failed';}}return s;}
 function validate(s){
  const baseKeys=['pack','version','accounts','permissions','conversations','acceptances','receipts','nextId','clock'],accountKeys=Object.keys(s?.accounts||{}).sort().join(','),legacyKeys=legacyChannels.slice().sort().join(','),currentKeys=channels.slice().sort().join(',');if(!s||!([baseKeys, [...baseKeys,'webhooks']].some(keys=>exact(s,keys)))||s.pack!==PACK||s.version!==1||!Number.isSafeInteger(s.clock)||s.clock<0||!Number.isSafeInteger(s.nextId)||s.nextId<1||![legacyKeys,currentKeys].includes(accountKeys))fail('INVALID_CHANNEL_SAVE');
  for(const channel of channels){const a=s.accounts[channel];if(!a&&channel==='workplace')continue;if(!exact(a,['desired','effective','generation','provisioning','observed'])||!Number.isSafeInteger(a.generation)||a.generation<0||!exact(a.provisioning,['status','due','generation','errors'])||a.provisioning.generation!==a.generation||!['pending','ready','failed'].includes(a.provisioning.status)||!integer(a.provisioning.due)||!list(a.provisioning.errors,50)||a.provisioning.errors.some(x=>typeof x!=='string')||!exact(a.observed,['authenticated','providerAvailable','fault'])||typeof a.observed.authenticated!=='boolean'||typeof a.observed.providerAvailable!=='boolean'||a.observed.fault!==null&&!['OUTAGE','AUTHENTICATION_REQUIRED','PROVIDER_REJECTED'].includes(a.observed.fault)||a.provisioning.status==='ready'&&(!a.effective||JSON.stringify(a.desired)!==JSON.stringify(a.effective)))fail('INVALID_CHANNEL_ACCOUNT');validateConfig(channel,a.desired);if(a.effective)validateConfig(channel,a.effective);}
  if(!list(s.permissions,2000)||!list(s.conversations,2000)||!list(s.acceptances,4000)||!list(s.receipts,4000))fail('INVALID_CHANNEL_COLLECTION');
  const permissionKeys=new Set();for(const p of s.permissions){if(!validatePermission(p)||p.updatedAt>s.clock)fail('INVALID_CHANNEL_PERMISSION_SAVE');const k=[p.tenant,p.person,p.channel,p.purpose].join('|');if(permissionKeys.has(k))fail('DUPLICATE_CHANNEL_PERMISSION');permissionKeys.add(k);}
  const conversationIds=new Set(),conversationKeys=new Set();for(const c of s.conversations){if(!exact(c,['id','tenant','person','channel','purpose','caseId','status','openedAt','expiresAt','authenticatedIdentity'])||!id(c.id)||conversationIds.has(c.id)||!id(c.tenant)||!id(c.person)||!channels.includes(c.channel)||!purposeId(c.purpose)||!id(c.caseId)||!['active','paused','expired','closed'].includes(c.status)||!integer(c.openedAt)||c.openedAt>s.clock||c.expiresAt!==null&&(!integer(c.expiresAt)||c.expiresAt<c.openedAt)||['casechat','workplace'].includes(c.channel)&&c.expiresAt===null||c.channel==='letterbox'&&c.expiresAt!==null||c.authenticatedIdentity!==null&&(!id(c.authenticatedIdentity)||!['casechat','workplace'].includes(c.channel)||c.authenticatedIdentity!==c.person)||['casechat','workplace'].includes(c.channel)&&c.authenticatedIdentity!==c.person||['casechat','workplace'].includes(c.channel)&&c.status==='expired'&&c.expiresAt>s.clock||['casechat','workplace'].includes(c.channel)&&['active','paused'].includes(c.status)&&c.expiresAt<=s.clock)fail('INVALID_CHANNEL_CONVERSATION_SAVE');conversationIds.add(c.id);const k=[c.tenant,c.person,c.channel,c.caseId].join('|');if(conversationKeys.has(k))fail('DUPLICATE_CHANNEL_CONVERSATION');conversationKeys.add(k);}
  const acceptanceIds=new Set(),acceptedInteractions=new Set(),parentJobs=new Set();for(const a of s.acceptances){if(!exact(a,['id','interaction','parentJob','conversation','tenant','person','channel','purpose','caseId','template','authorizedAt','permissionUpdatedAt','permissionExpiresAt','permissionGranted','accountGeneration'])||!id(a.id)||acceptanceIds.has(a.id)||!id(a.interaction)||acceptedInteractions.has(a.interaction)||!id(a.parentJob)||parentJobs.has(a.parentJob)||a.conversation!==null&&!conversationIds.has(a.conversation)||!id(a.tenant)||!id(a.person)||!channels.includes(a.channel)||!purposeId(a.purpose)||!id(a.caseId)||a.template!==null&&!id(a.template)||!integer(a.authorizedAt)||a.authorizedAt>s.clock||!integer(a.permissionUpdatedAt)||a.permissionUpdatedAt>a.authorizedAt||a.permissionExpiresAt!==null&&(!integer(a.permissionExpiresAt)||a.permissionExpiresAt<=a.authorizedAt)||a.permissionGranted!==true||!integer(a.accountGeneration,0))fail('INVALID_CHANNEL_ACCEPTANCE_SAVE');if(a.conversation&&!s.conversations.some(c=>c.id===a.conversation&&c.tenant===a.tenant&&c.person===a.person&&c.channel===a.channel&&c.caseId===a.caseId&&c.purpose===a.purpose))fail('INVALID_CHANNEL_ACCEPTANCE_SAVE');acceptanceIds.add(a.id);acceptedInteractions.add(a.interaction);parentJobs.add(a.parentJob);}
  const receiptIds=new Set(),deliveryKeys=new Set(),deliveredInteractions=new Set();for(const r of s.receipts){if(!exact(r,['id','kind','interaction','conversation','tenant','person','channel','at'])||!id(r.id)||receiptIds.has(r.id)||!['delivery','read'].includes(r.kind)||!id(r.interaction)||!conversationIds.has(r.conversation)||!id(r.tenant)||!id(r.person)||!channels.includes(r.channel)||!integer(r.at)||r.at>s.clock||!s.conversations.some(c=>c.id===r.conversation&&c.tenant===r.tenant&&c.person===r.person&&c.channel===r.channel))fail('INVALID_CHANNEL_RECEIPT_SAVE');receiptIds.add(r.id);if(r.kind==='delivery'){const key=[r.conversation,r.interaction].join('|');if(deliveryKeys.has(key)||deliveredInteractions.has(r.interaction)||!s.acceptances.some(a=>a.interaction===r.interaction&&a.tenant===r.tenant&&a.person===r.person&&a.channel===r.channel&&a.purpose===s.conversations.find(c=>c.id===r.conversation)?.purpose&&a.caseId===s.conversations.find(c=>c.id===r.conversation)?.caseId))fail('INVALID_CHANNEL_DELIVERY_LINK');deliveryKeys.add(key);deliveredInteractions.add(r.interaction);}if(r.kind==='read'){const delivery=s.receipts.find(x=>x.kind==='delivery'&&x.conversation===r.conversation&&x.interaction===r.interaction);if(!delivery||delivery.at>r.at)fail('READ_WITHOUT_DELIVERY');}}
  if(s.webhooks)validateWebhooks(s,s.webhooks);
  return true;
 }
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const fingerprint=s=>{const w=s.webhooks||newWebhookPolicy(s.clock);return JSON.stringify(stable([s.pack,s.version,Object.keys(s.accounts).sort().map(channel=>{const a=s.accounts[channel];return [channel,a.desired,a.effective,a.generation,a.provisioning,a.observed];}),s.permissions,{desired:w.desired,effective:w.effective,generation:w.generation,provisioning:{status:w.provisioning.status,generation:w.provisioning.generation,errors:w.provisioning.errors},observed:w.observed}]));};
 function inspect(s){return {pack:PACK,profiles:copy(profiles),accounts:Object.fromEntries(channels.map(channel=>{const a=account(s,channel);return [channel,{desired:copy(a.desired),effective:a.effective?copy(a.effective):null,generation:a.generation,provisioning:copy(a.provisioning),observed:copy(a.observed)}];})),permissions:s.permissions.map(copy),conversations:s.conversations.map(c=>({id:c.id,tenant:c.tenant,person:c.person,channel:c.channel,purpose:c.purpose,caseId:c.caseId,status:c.status,openedAt:c.openedAt,expiresAt:c.expiresAt})),acceptances:s.acceptances.map(copy),receipts:s.receipts.map(copy),webhooks:{desired:copy(s.webhooks?.desired||webhookDefaults),effective:s.webhooks?.effective?copy(s.webhooks.effective):null,generation:s.webhooks?.generation||0,provisioning:copy(s.webhooks?.provisioning||newWebhookPolicy(s.clock).provisioning),observed:copy(s.webhooks?.observed||webhookObservations),deliveries:(s.webhooks?.deliveries||[]).map(copy)}};}
 const source=()=>`const SOC_CHANNELS=(${socChannelsKernel.toString()})();`;
 return {PACK,channels,defaults,witty,profiles,create,command,advance,validate,inspect,fingerprint,eligibility,beforeAccept,recordAcceptance,openConversation,resumeConversation,recordDelivery,recordRead,source};
}
const SOC_CHANNELS=socChannelsKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_CHANNELS;
