/* Optional, versioned service operations pack. Protocol events are synthetic state transitions. */
function socOperationsKernel(){
 'use strict';
 const PACK='soc-operations-1',copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=code=>{throw new Error(code);},id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x),number=x=>typeof x==='string'&&/^\+[1-9]\d{5,14}$/.test(x);
 const schemas={
  carrier:{mode:'managed',provider:'level-tree',planLicensed:true,operatorApproved:false,operatorContract:false,delegation:false,simAssigned:false,mobileEligible:false,sbcCertified:false,tlsTrusted:false,hostnameValid:false,peerAuthenticated:false,codec:'opus'},
  integration:{model:'connect',sbcLinked:true,apiAuthorised:false,appAssigned:false,embeddedToken:false,features:['transfer'],cloud:'public'},
  workflow:{authenticated:true,endpointAvailable:true,callbackVerified:true,transientFailures:0,retries:2,backoff:1,timeout:10,deliveryReceipts:true,consent:true,responseWindow:24}
 };
 const features={connect:['transfer','presence'],extend:['transfer','presence','context','supervision'],unify:['transfer','presence','context','supervision','embedded-client']};
 const numberPorting={legacyAction:'port',legacySchemaVersion:1,action:'portOrder',responseAction:'portResponse',schemaVersion:2,calendar:'scenario-minute-day0-monday-weekdays',minutesPerDay:1440,maxLeadBusinessDays:60};
 function config(kind,c){
  const defaults=schemas[kind];if(!defaults||!c||Object.keys(c).sort().join(',')!==Object.keys(defaults).sort().join(','))fail('INVALID_OPERATIONS_CONFIG');
  for(const [k,v] of Object.entries(c)){
   const d=defaults[k];if(Array.isArray(d)){if(!Array.isArray(v)||v.length>20||v.some(x=>typeof x!=='string')||new Set(v).size!==v.length)fail('INVALID_FEATURES');}
   else if(typeof d!==typeof v||typeof v==='number'&&(!Number.isInteger(v)||v<0||v>1000)||typeof v==='string'&&v.length>80)fail('INVALID_OPERATIONS_FIELD');
  }
  if(kind==='carrier'&&(!['managed','operator','mobile','gateway'].includes(c.mode)||!['opus','g711','g729'].includes(c.codec)))fail('INVALID_CARRIER_PROFILE');
  if(kind==='integration'&&(!own(features,c.model)||!['public','private'].includes(c.cloud)))fail('INVALID_INTEGRATION_PROFILE');
  if(kind==='workflow'&&(c.retries>8||c.backoff<1||c.timeout<1||c.responseWindow<1))fail('INVALID_RETRY_POLICY');
 }
 function node(s,c){return {desired:copy(c),effective:null,generation:1,provisioning:{status:'pending',due:s.clock+1,generation:1,errors:[]}};}
 function create(s){return {pack:PACK,carrier:node(s,{...schemas.carrier,mode:{managed:'managed',direct:'operator',mobile:'mobile',gateway:'gateway'}[s.resources.phone.desired.carrierModel]}),integration:node(s,schemas.integration),workflow:node(s,schemas.workflow),numbers:[
  {number:'+61255500101',holder:'alex',type:'user',provider:'level-tree',status:'active'},
  {number:'+61255500201',holder:'bea',type:'user',provider:'level-tree',status:'active'}],
  portingSchemaVersion:2,ports:[],portOrders:[],jobs:[],receipts:[],conversationWindows:{},policies:{alex:{allowInternational:false,allowedPrefixes:['+61'],callerId:'+61255500101'},bea:{allowInternational:false,allowedPrefixes:['+61'],callerId:'+61255500201'}},placements:{},migrations:[],nextId:1};}
 const MINUTES_PER_DAY=1440;
 function supplierDueAt(clock,leadBusinessDays){
  if(!Number.isSafeInteger(clock)||clock<0||!Number.isSafeInteger(leadBusinessDays)||leadBusinessDays<1||leadBusinessDays>60)fail('INVALID_SUPPLIER_LEAD_TIME');
  let day=Math.floor(clock/MINUTES_PER_DAY),remaining=leadBusinessDays;const minute=clock%MINUTES_PER_DAY;
  while(remaining>0){day++;if(day%7<5)remaining--;}
  return day*MINUTES_PER_DAY+minute;
 }
 function latestPortOrder(o,numberValue){
  return o.ports.concat(o.portOrders||[]).filter(p=>p.number===numberValue).reduce((latest,p)=>{
   const seq=Number(p.id?.split('-').at(-1));return !latest||seq>Number(latest.id.split('-').at(-1))?p:latest;
  },null);
 }
 function carrierReasons(c){
  if(!c)return ['CARRIER_NOT_PROVISIONED'];const errors=[];
  if(c.mode==='managed'&&!c.planLicensed)errors.push('CALLING_PLAN_ENTITLEMENT');
  if(c.mode==='operator'&&(!c.operatorApproved||!c.operatorContract||!c.delegation))errors.push('OPERATOR_ONBOARDING');
  if(c.mode==='mobile'&&(!c.operatorApproved||!c.operatorContract||!c.simAssigned||!c.mobileEligible))errors.push('MOBILE_ONBOARDING');
  if(c.mode==='gateway')for(const field of ['sbcCertified','tlsTrusted','hostnameValid','peerAuthenticated'])if(!c[field])errors.push('GATEWAY_'+field.toUpperCase());
  return errors;
 }
 function integrationReasons(c){
  if(!c)return ['INTEGRATION_NOT_PROVISIONED'];const errors=[];
  if(c.features.some(f=>!features[c.model].includes(f)))errors.push('INTEGRATION_FEATURE_UNSUPPORTED');
  if(c.model==='connect'&&!c.sbcLinked)errors.push('CONTACT_SBC_REQUIRED');
  if(c.model==='extend'&&(!c.apiAuthorised||!c.appAssigned))errors.push('CONTACT_APP_AUTH_REQUIRED');
  if(c.model==='unify'&&(!c.apiAuthorised||!c.embeddedToken))errors.push('EMBEDDED_CALLING_TOKEN');
  if(c.model!=='connect'&&c.cloud==='private')errors.push('INTEGRATION_CLOUD_UNSUPPORTED');
  return errors;
 }
 function inspect(s){const o=s.operations;if(!o)return null;return {pack:PACK,carrier:carrierReasons(o.carrier.effective),integration:integrationReasons(o.integration.effective),ports:o.ports.map(p=>({id:p.id,number:p.number,status:p.status,reason:p.reason})),portOrders:(o.portOrders||[]).map(p=>({id:p.id,number:p.number,status:p.status,leadBusinessDays:p.leadBusinessDays,responseDueAt:p.responseDueAt,cutoverAt:p.cutoverAt,response:p.response,reason:p.reason})),jobs:o.jobs.map(j=>({id:j.id,interaction:j.interaction,status:j.status,attempts:j.attempts,next:j.next,reason:j.reason})),migrations:o.migrations.map(m=>({id:m.id,status:m.status,reason:m.reason,cohort:m.identities}))};}
 function fingerprint(s){const o=s.operations;if(!o)return null;return [o.pack,...['carrier','integration','workflow'].map(k=>[k,o[k].generation,o[k].effective]),o.numbers,o.policies,o.placements];}
 function platform(s,identity){if(!s.operations)return 'phone';return s.operations.placements[identity]||'phone';}
 function normalise(s,raw){if(!s.operations)return raw;const cleaned=raw.replace(/[ ()-]/g,'');if(/^0\d{5,14}$/.test(cleaned))return (s.resources.phone.effective?.normalisation||'+61')+cleaned.slice(1);return cleaned;}
 function call(s,i,target,emit){
  const o=s.operations;if(!o)return null;
  if(/^\d{1,5}$/.test(i.to)){emit(s,i,'routing','INTERNAL_EXTENSION',{carrierRequired:false});return null;}
  const policy=o.policies[i.from];if(!policy)return 'DIALLING_POLICY_MISSING';
  if(!policy.allowInternational&&!policy.allowedPrefixes.some(p=>i.to.startsWith(p)))return 'DIALLING_PERMISSION';
  const caller=o.numbers.find(n=>n.number===policy.callerId&&n.holder===i.from&&n.status==='active');if(!caller)return 'CALLER_NUMBER_UNAVAILABLE';
  const reasons=carrierReasons(o.carrier.effective);if(reasons.length)return reasons[0];const c=o.carrier.effective;
  if(!s.connected&&c.mode!=='gateway')return 'EXTERNAL_CARRIER_CONTROL';
  if(caller.provider!==c.provider)return 'CALLER_CARRIER_MISMATCH';
  if(c.mode==='mobile'&&(caller.type!=='user'||s.resources[target]?.kind==='queue'))return 'MOBILE_SERVICE_NUMBER_UNSUPPORTED';
  emit(s,i,'carrier','CARRIER_MODEL_SELECTED',{model:c.mode,provider:c.provider,callerId:caller.number});
  if(s.resources[target]?.kind==='queue'){
   const integration=integrationReasons(o.integration.effective);if(integration.length)return integration[0];
   if(!s.connected&&o.integration.effective.cloud!=='private')return 'EXTERNAL_CONTACT_CONTROL';
   emit(s,i,'integration','CONTACT_MODEL_SELECTED',{model:o.integration.effective.model,features:o.integration.effective.features});
  }
  if(s.mediaNegotiation)return null;if(c.codec==='g729')return 'CODEC_NEGOTIATION';
  emit(s,i,'media','CODEC_NEGOTIATED',{codec:c.codec});return null;
 }
 function inboundCall(s,i,target,emit){
  const o=s.operations;if(!o)return 'INBOUND_OPERATIONS_REQUIRED';
  const assigned=o.numbers.find(n=>n.number===i.to&&n.status==='active');if(!assigned)return 'INBOUND_NUMBER_UNASSIGNED';
  const reasons=carrierReasons(o.carrier.effective);if(reasons.length)return reasons[0];const c=o.carrier.effective;
  if(assigned.provider!==c.provider)return 'INBOUND_CARRIER_MISMATCH';
  if(!s.connected&&c.mode!=='gateway')return 'EXTERNAL_CARRIER_CONTROL';
  if(c.mode==='mobile'&&(assigned.type!=='user'||s.resources[target]?.kind==='queue'))return 'MOBILE_SERVICE_NUMBER_UNSUPPORTED';
  emit(s,i,'carrier','CARRIER_MODEL_SELECTED',{direction:'inbound',model:c.mode,provider:c.provider,calledNumber:assigned.number,holder:assigned.holder});
  if(s.resources[target]?.kind==='queue'){
   const errors=integrationReasons(o.integration.effective);if(errors.length)return errors[0];
   if(!s.connected&&o.integration.effective.cloud!=='private')return 'EXTERNAL_CONTACT_CONTROL';
   emit(s,i,'integration','CONTACT_MODEL_SELECTED',{model:o.integration.effective.model,features:o.integration.effective.features});
  }
  if(s.mediaNegotiation)return null;if(c.codec==='g729')return 'CODEC_NEGOTIATION';emit(s,i,'media','CODEC_NEGOTIATED',{codec:c.codec});return null;
 }
 function enqueue(s,i,emit,hooks={},finish){
  const o=s.operations;if(!o)return false;const w=o.workflow.effective;
  if(s.channels&&(!hooks.beforeAccept||typeof finish!=='function'))fail('CHANNEL_ADMISSION_HOOK_REQUIRED');
  const admission=hooks.beforeAccept?.(s,i,null);if(admission&&admission.ok!==true&&!admission.retryable){finish(s,i,admission.reason||'CHANNEL_PERMISSION_REQUIRED');return true;}
  if(!w||!w.consent){finish?finish(s,i,w?'CHANNEL_CONSENT':'WORKFLOW_NOT_PROVISIONED'):(()=>{i.phase='failed';i.outcome=w?'CHANNEL_CONSENT':'WORKFLOW_NOT_PROVISIONED';i.finishedAt=s.clock;})();return true;}
  const recent=o.conversationWindows[i.caseId];
  if(!s.channels&&(recent===undefined||s.clock-recent>w.responseWindow)&&!s.resources.messages.effective?.templates.includes(s.resources.engage.effective?.template)){finish?finish(s,i,'RESPONSE_WINDOW_TEMPLATE'):(()=>{i.phase='failed';i.outcome='RESPONSE_WINDOW_TEMPLATE';i.finishedAt=s.clock;})();return true;}
  if(o.jobs.length>=200){const retired=o.jobs.findIndex(j=>['delivered','failed'].includes(j.status));if(retired<0)fail('WORKFLOW_CAPACITY');o.jobs.splice(retired,1);}
  const job={id:'delivery-'+o.nextId++,interaction:i.id,caseId:i.caseId,status:'pending',attempts:0,next:s.clock+1,reason:null,remainingFailures:w.transientFailures,acceptedAt:null,receiptAt:null};o.jobs.push(job);i.phase='delivery';emit(s,i,'workflow','DELIVERY_QUEUED',{job:job.id});return true;
 }
 function deliver(s,j,emit,finish,hooks={}){
  const o=s.operations,i=s.interactions.find(i=>i.id===j.interaction);if(!i){j.status='failed';j.reason='INTERACTION_EXPIRED';return;}
  if(j.status==='delivered')return;
  const w=s.resources.engage.effective;j.status='delivered';emit(s,i,'delivery','DELIVERY_CONFIRMED',{job:j.id});if(hooks.delivered)hooks.delivered(s,i,j);
  if(w?.botResolves){i.botAnswered=true;emit(s,i,'automation','BOT_RESOLVED');finish(s,i,'RESOLVED',true);}
  else if(!w?.handoff){finish(s,i,'HANDOFF_LOOP');}
  else{i.destination=w.queue;i.phase='queued';emit(s,i,'handoff','HUMAN_HANDOFF',{queue:w.queue,caseId:i.caseId});}
 }
 function advance(s,services,emit,finish,meter,authorise,hooks={}){
  const o=s.operations;if(!o)return;
  if(!Array.isArray(o.portOrders))o.portOrders=[];
  for(const kind of Object.keys(schemas)){
   const n=o[kind];if(n.provisioning.status==='pending'&&n.provisioning.due<=s.clock){
    const errors=kind==='integration'&&n.desired.features.some(f=>!features[n.desired.model].includes(f))?['INTEGRATION_FEATURE_UNSUPPORTED']:[];
    n.provisioning={...n.provisioning,status:errors.length?'failed':'ready',errors};if(!errors.length)n.effective=copy(n.desired);
   }
  }
  for(const p of o.ports){
   if(p.status==='submitted'&&s.clock>=p.validateAt){p.status=p.donorAccepted?'scheduled':'failed';p.reason=p.donorAccepted?null:'DONOR_REJECTED';}
   if(p.status==='scheduled'&&s.clock>=p.cutoverAt){const n=o.numbers.find(n=>n.number===p.number);n.provider=p.target;n.status='active';p.status='complete';p.completedAt=s.clock;}
   if(p.status==='recovering'&&s.clock>=p.recoveryAt){const n=o.numbers.find(n=>n.number===p.number);n.provider=p.previousProvider;n.status='active';p.status='recovered';}
  }
  for(const p of o.portOrders){
   if(p.status==='submitted'&&s.clock>=p.cutoverAt){p.status='failed';p.reason='SUPPLIER_RESPONSE_AFTER_CUTOVER';}
   if(p.status==='scheduled'&&s.clock>=p.cutoverAt){const n=o.numbers.find(n=>n.number===p.number);if(n){n.provider=p.target;n.status='active';}p.status='complete';p.completedAt=s.clock;}
   if(p.status==='recovering'&&s.clock>=p.recoveryAt){const n=o.numbers.find(n=>n.number===p.number);if(n){n.provider=p.previousProvider;n.status='active';}p.status='recovered';p.recoveredAt=s.clock;}
  }
  for(const j of o.jobs){
   const i=s.interactions.find(i=>i.id===j.interaction),w=o.workflow.effective;
   if(!i||!w||['delivered','failed'].includes(j.status))continue;
   if(j.status==='accepted'){
    if(w.deliveryReceipts&&w.callbackVerified&&s.clock>=j.receiptAt)deliver(s,j,emit,finish,hooks);
    else if(s.clock-j.acceptedAt>=w.timeout){j.status='failed';j.reason='DELIVERY_RECEIPT_TIMEOUT';finish(s,i,j.reason);}
    continue;
   }
   if(s.clock<j.next)continue;j.attempts++;
   let reason=null;const admission=hooks.beforeAccept?hooks.beforeAccept(s,i,j):null;
   if(admission&&admission.ok!==true)reason=admission.reason||'CHANNEL_PERMISSION';
   else if(!w.authenticated)reason='API_AUTHENTICATION';
   else if(!services.engage.ready||!w.endpointAvailable||!s.connected)reason='WEBHOOK_UNAVAILABLE';
   else if(j.remainingFailures>0){j.remainingFailures--;reason='HTTP_503';}
   else if(o.jobs.filter(x=>x!==j&&x.acceptedAt===s.clock).length>=(s.resources.messages.effective?.rateLimit||0))reason='HTTP_429';
   if(reason){
    emit(s,i,'workflow',reason,{attempt:j.attempts,job:j.id});
    if(reason==='API_AUTHENTICATION'||admission&&admission.ok!==true&&!admission.retryable||j.attempts>w.retries){j.status='failed';j.reason=reason;finish(s,i,reason);}
    else{j.status='retry';j.reason=reason;j.next=s.clock+w.backoff*2**(j.attempts-1);emit(s,i,'workflow','RETRY_SCHEDULED',{at:j.next});}
   }else{j.status='accepted';j.reason=null;j.acceptedAt=s.clock;j.receiptAt=s.clock+1;emit(s,i,'delivery','HTTP_202',{job:j.id});if(hooks.accepted)hooks.accepted(s,i,j);if(meter)meter(s,'message',1);}
  }
  for(const m of o.migrations){
   if(m.status==='scheduled'&&s.clock>=m.cutoverAt){
    if(!services[m.target]?.ready){m.status='failed';m.reason='TARGET_UNAVAILABLE';continue;}
    const scope=s.resources[m.target].effective.extensionScope;
    for(const [id,saved] of Object.entries(m.checkpoint)){
     if(authorise&&!authorise(s,id,'migrate')){m.status='failed';m.reason='DELEGATION_EXPIRED';break;}
     const r=s.resources[id];if(r.generation!==saved.generation){m.status='failed';m.reason='COHORT_CHANGED';break;}
    }
    if(m.status==='failed')continue;
    for(const id of Object.keys(m.checkpoint)){const r=s.resources[id];r.desired.scope=scope;r.generation++;r.provisioning={status:'pending',due:s.clock+1,generation:r.generation};}
    m.appliedGenerations=Object.fromEntries(Object.keys(m.checkpoint).map(id=>[id,s.resources[id].generation]));
    m.status='verifying';m.verifyAt=s.clock+1;
   }
   if(m.status==='verifying'&&s.clock>=m.verifyAt){
    if(!services[m.target]?.ready||Object.keys(m.checkpoint).some(id=>!services[id]?.ready)){m.status='failed';m.reason='CUTOVER_VALIDATION';continue;}
    for(const identity of m.identities)o.placements[identity]=m.target;m.status='complete';
   }
  }
 }
 const fields={start:[],configure:['kind','config'],reserve:['number','type'],assign:['number','holder'],port:['number','target','donorAccepted','cutoverAt'],portOrder:['number','target','leadBusinessDays','cutoverAt'],portResponse:['port','accepted','reason'],recoverPort:['port'],policy:['identity','allowInternational','allowedPrefixes','callerId'],receipt:['job','eventId','signature'],inbound:['caseId'],migration:['identities','target','cutoverAt'],rollback:['migration']};
 function command(s,c,services,emit,finish,hooks={}){
  if(!c||!own(fields,c.action)||Object.keys(c).some(k=>!['action',...fields[c.action]].includes(k)))fail('INVALID_OPERATIONS_COMMAND');
  if(c.action==='start'){if(s.operations)fail('OPERATIONS_ALREADY_STARTED');s.operations=create(s);return;}
  const o=s.operations;if(!o)fail('OPERATIONS_NOT_STARTED');
  if(!Array.isArray(o.portOrders))o.portOrders=[];
  if(c.action==='configure'){if(!own(schemas,c.kind)||!c.config||Array.isArray(c.config))fail('INVALID_OPERATIONS_CONFIG');const n=o[c.kind],desired={...n.desired,...copy(c.config)};config(c.kind,desired);n.desired=desired;n.generation++;n.provisioning={status:'pending',due:s.clock+1,generation:n.generation,errors:[]};
   if(c.kind==='carrier'){const r=s.resources.phone,model={managed:'managed',operator:'direct',mobile:'mobile',gateway:'gateway'}[desired.mode];if(r.desired.carrierModel!==model){r.desired.carrierModel=model;r.generation++;r.provisioning={status:'pending',due:s.clock+1,generation:r.generation};}}
  }
  else if(c.action==='reserve'){if(!number(c.number)||!['user','service'].includes(c.type)||o.numbers.some(n=>n.number===c.number)||o.numbers.length>=1000)fail('INVALID_NUMBER_RESERVATION');o.numbers.push({number:c.number,holder:null,type:c.type,provider:o.carrier.effective?.provider||'level-tree',status:'reserved'});}
  else if(c.action==='assign'){const n=o.numbers.find(n=>n.number===c.number),directory=s.resources.identity.effective;if(!n||!directory?.identities.includes(c.holder))fail('INVALID_NUMBER_ASSIGNMENT');n.holder=c.holder;n.status='active';}
  else if(c.action==='port'){
   const n=o.numbers.find(n=>n.number===c.number);if(!n||n.status!=='active'||!id(c.target)||typeof c.donorAccepted!=='boolean'||!Number.isSafeInteger(c.cutoverAt)||c.cutoverAt<s.clock+3||o.ports.some(p=>p.number===c.number&&['submitted','scheduled','recovering'].includes(p.status)))fail('INVALID_PORT_ORDER');
   o.ports.push({id:'port-'+o.nextId++,schemaVersion:1,number:c.number,previousProvider:n.provider,target:c.target,donorAccepted:c.donorAccepted,status:'submitted',validateAt:s.clock+2,cutoverAt:c.cutoverAt,reason:null});
  }else if(c.action==='portOrder'){
   const n=o.numbers.find(n=>n.number===c.number);
   if(!n||n.status!=='active'||!id(c.target)||c.target===n.provider||!Number.isSafeInteger(c.leadBusinessDays)||c.leadBusinessDays<1||c.leadBusinessDays>60||!Number.isSafeInteger(c.cutoverAt)||o.ports.some(p=>p.number===c.number&&['submitted','scheduled','recovering'].includes(p.status))||o.portOrders.some(p=>p.number===c.number&&['submitted','scheduled','recovering'].includes(p.status)))fail('INVALID_PORT_ORDER');
   const responseDueAt=supplierDueAt(s.clock,c.leadBusinessDays);if(c.cutoverAt<responseDueAt)fail('CUTOVER_BEFORE_SUPPLIER_RESPONSE');
   o.portOrders.push({id:'port-order-'+o.nextId++,schemaVersion:2,number:c.number,previousProvider:n.provider,target:c.target,status:'submitted',leadBusinessDays:c.leadBusinessDays,submittedAt:s.clock,responseDueAt,cutoverAt:c.cutoverAt,response:null,reason:null});
  }else if(c.action==='portResponse'){
   const p=o.portOrders.find(p=>p.id===c.port);if(!p||p.status!=='submitted'||s.clock<p.responseDueAt||s.clock>=p.cutoverAt||typeof c.accepted!=='boolean'||c.accepted&&c.reason!==undefined||!c.accepted&&(typeof c.reason!=='string'||!c.reason.trim()||c.reason.length>120))fail('INVALID_PORT_RESPONSE');
   p.response={accepted:c.accepted,at:s.clock,reason:c.accepted?null:c.reason.trim()};
   if(c.accepted)p.status='scheduled';else{p.status='failed';p.reason=c.reason.trim();}
  }else if(c.action==='recoverPort'){const p=o.ports.find(p=>p.id===c.port)||o.portOrders.find(p=>p.id===c.port);if(!p||!['failed','complete'].includes(p.status)||latestPortOrder(o,p.number)!==p||o.ports.concat(o.portOrders).some(other=>other!==p&&other.number===p.number&&['submitted','scheduled','recovering'].includes(other.status)))fail('PORT_RECOVERY_UNAVAILABLE');if(p.schemaVersion===2)p.recoveryFromProvider=o.numbers.find(n=>n.number===p.number)?.provider||null;p.status='recovering';p.recoveryAt=s.clock+2;}
  else if(c.action==='policy'){if(!s.resources.identity.effective?.identities.includes(c.identity)||typeof c.allowInternational!=='boolean'||!Array.isArray(c.allowedPrefixes)||c.allowedPrefixes.some(p=>typeof p!=='string'||!/^\+[1-9]\d{0,5}$/.test(p))||!number(c.callerId))fail('INVALID_DIALLING_POLICY');o.policies[c.identity]={allowInternational:c.allowInternational,allowedPrefixes:[...c.allowedPrefixes],callerId:c.callerId};}
  else if(c.action==='receipt'){
   if(!id(c.eventId)||c.signature!=='synthetic-valid'||!o.workflow.effective?.callbackVerified)fail('WEBHOOK_SIGNATURE');const j=o.jobs.find(j=>j.id===c.job);if(!j)fail('UNKNOWN_DELIVERY');
   const prior=o.receipts.find(r=>r.id===c.eventId);if(prior){if(prior.job!==j.id)fail('WEBHOOK_IDEMPOTENCY_CONFLICT');return;}
   if(!['accepted','delivered'].includes(j.status))fail('RECEIPT_OUT_OF_ORDER');o.receipts.push({id:c.eventId,job:j.id});if(o.receipts.length>1000)o.receipts.shift();deliver(s,j,emit,finish,hooks);
  }else if(c.action==='inbound'){if(!id(c.caseId))fail('INVALID_CONVERSATION');o.conversationWindows[c.caseId]=s.clock;}
  else if(c.action==='migration'){
   if(!Array.isArray(c.identities)||!c.identities.length||new Set(c.identities).size!==c.identities.length||c.identities.some(x=>!s.resources.identity.effective?.identities.includes(x))||!['uc','dedicated'].includes(s.resources[c.target]?.kind)||!services[c.target]?.ready||!Number.isSafeInteger(c.cutoverAt)||c.cutoverAt<s.clock+1)fail('INVALID_MIGRATION_PLAN');
   if(o.migrations.some(m=>['scheduled','verifying'].includes(m.status)&&m.identities.some(i=>c.identities.includes(i))))fail('COHORT_BUSY');
   const cohort=Object.values(s.resources).filter(r=>r.kind==='endpoint'&&c.identities.includes(r.desired.identity));if(!cohort.length)fail('COHORT_ENDPOINT_MISSING');
   o.migrations.push({id:'migration-'+o.nextId++,identities:[...c.identities],target:c.target,cutoverAt:c.cutoverAt,status:'scheduled',reason:null,checkpoint:Object.fromEntries(cohort.map(r=>[r.id,{generation:r.generation,desired:copy(r.desired)}])),previousPlacements:Object.fromEntries(c.identities.map(i=>[i,platform(s,i)]))});
  }else if(c.action==='rollback'){
   const m=o.migrations.find(m=>m.id===c.migration);if(!m||!['complete','failed'].includes(m.status))fail('MIGRATION_ROLLBACK_UNAVAILABLE');
   if(m.appliedGenerations){
    for(const [id,generation] of Object.entries(m.appliedGenerations)){const r=s.resources[id];if(!r||r.generation!==generation)fail('ROLLBACK_CONFLICT');}
    for(const [id,saved] of Object.entries(m.checkpoint)){const r=s.resources[id];r.desired=copy(saved.desired);r.generation++;r.provisioning={status:'pending',due:s.clock+1,generation:r.generation};}
    Object.assign(o.placements,m.previousPlacements);
   }
   m.status='rolled-back';
  }
  validate(s);
 }
 function validate(s){
  const o=s.operations;if(o===undefined||o===null)return;if(o.pack!==PACK||!Number.isSafeInteger(o.nextId)||o.nextId<1)fail('INVALID_OPERATIONS_SAVE');
  for(const kind of Object.keys(schemas)){const n=o[kind];if(!n||!Number.isSafeInteger(n.generation)||n.generation<1||!n.provisioning||n.provisioning.generation!==n.generation||!['pending','ready','failed'].includes(n.provisioning.status)||!Number.isSafeInteger(n.provisioning.due))fail('INVALID_OPERATIONS_PROVISIONING');config(kind,n.desired);if(n.effective)config(kind,n.effective);}
  if(o.portingSchemaVersion!==undefined&&o.portingSchemaVersion!==2)fail('INVALID_PORTING_SCHEMA_VERSION');
  if(o.portOrders!==undefined&&!Array.isArray(o.portOrders))fail('INVALID_OPERATIONS_COLLECTION');
  const portOrders=o.portOrders||[];
  for(const [key,max] of Object.entries({numbers:1000,ports:1000,jobs:200,receipts:1000,migrations:100}))if(!Array.isArray(o[key])||o[key].length>max)fail('INVALID_OPERATIONS_COLLECTION');
  if(portOrders.length>1000)fail('INVALID_OPERATIONS_COLLECTION');
  if(new Set(o.numbers.map(n=>n.number)).size!==o.numbers.length)fail('DUPLICATE_NUMBER');
  for(const n of o.numbers)if(!number(n.number)||!['user','service'].includes(n.type)||!['reserved','active'].includes(n.status)||!id(n.provider)||n.holder!==null&&!id(n.holder))fail('INVALID_NUMBER_STATE');
  for(const j of o.jobs)if(!id(j.id)||!id(j.interaction)||!['pending','retry','accepted','delivered','failed'].includes(j.status)||!Number.isSafeInteger(j.attempts)||!Number.isSafeInteger(j.next))fail('INVALID_DELIVERY_STATE');
  for(const p of o.ports)if(!id(p.id)||p.schemaVersion!==undefined&&p.schemaVersion!==1||!number(p.number)||!o.numbers.some(n=>n.number===p.number)||!id(p.target)||!id(p.previousProvider)||typeof p.donorAccepted!=='boolean'||!['submitted','scheduled','failed','complete','recovering','recovered'].includes(p.status)||!Number.isSafeInteger(p.validateAt)||!Number.isSafeInteger(p.cutoverAt))fail('INVALID_PORT_STATE');
  const activePortNumbers=new Set();
  for(const p of o.ports.concat(portOrders))if(['submitted','scheduled','recovering'].includes(p.status)){if(activePortNumbers.has(p.number))fail('DUPLICATE_ACTIVE_PORT_ORDER');activePortNumbers.add(p.number);}
  for(const p of portOrders){
   const n=o.numbers.find(n=>n.number===p.number),statuses=['submitted','scheduled','failed','complete','recovering','recovered'];
   const keys=['id','schemaVersion','number','previousProvider','target','status','leadBusinessDays','submittedAt','responseDueAt','cutoverAt','response','reason','completedAt','recoveryAt','recoveredAt','recoveryFromProvider'];
   const responseKeys=['accepted','at','reason'];
   const responseValid=p.response===null||p.response&&Object.keys(p.response).sort().join(',')===responseKeys.slice().sort().join(',')&&typeof p.response.accepted==='boolean'&&Number.isSafeInteger(p.response.at)&&p.response.at>=p.responseDueAt&&p.response.at<p.cutoverAt&&p.response.at<=s.clock&&(p.response.accepted?p.response.reason===null:typeof p.response.reason==='string'&&p.response.reason.trim().length>0&&p.response.reason.length<=120);
   const missedResponse=p.status==='failed'&&p.response===null&&p.reason==='SUPPLIER_RESPONSE_AFTER_CUTOVER'&&s.clock>=p.cutoverAt;
   const rejectedResponse=p.status==='failed'&&p.response?.accepted===false&&p.reason===p.response.reason;
   const recoveryValid=p.status==='recovering'?id(p.recoveryFromProvider)&&n.provider===p.recoveryFromProvider&&Number.isSafeInteger(p.recoveryAt)&&p.recoveryAt>s.clock:p.status==='recovered'?id(p.recoveryFromProvider)&&n.provider===p.previousProvider&&Number.isSafeInteger(p.recoveryAt)&&Number.isSafeInteger(p.recoveredAt)&&p.recoveredAt>=p.recoveryAt&&p.recoveredAt<=s.clock:p.recoveryFromProvider===undefined;
   const statusValid=p.status==='submitted'?p.response===null&&s.clock<p.cutoverAt:p.status==='scheduled'?p.response?.accepted===true&&s.clock<p.cutoverAt:p.status==='complete'?p.response?.accepted===true&&Number.isSafeInteger(p.completedAt)&&p.completedAt>=p.cutoverAt&&p.completedAt<=s.clock:p.status==='failed'?missedResponse||rejectedResponse:p.status==='recovering'?p.response===null||p.response?.accepted===true||p.response?.accepted===false:p.status==='recovered'?p.response===null||p.response?.accepted===true||p.response?.accepted===false:false;
   if(!id(p.id)||p.schemaVersion!==2||Object.keys(p).some(k=>!keys.includes(k))||!number(p.number)||!n||!id(p.target)||!id(p.previousProvider)||p.target===p.previousProvider||!statuses.includes(p.status)||!Number.isSafeInteger(p.submittedAt)||p.submittedAt<0||p.submittedAt>s.clock||!Number.isSafeInteger(p.leadBusinessDays)||p.leadBusinessDays<1||p.leadBusinessDays>60||p.responseDueAt!==supplierDueAt(p.submittedAt,p.leadBusinessDays)||!Number.isSafeInteger(p.cutoverAt)||p.cutoverAt<p.responseDueAt||!responseValid||!statusValid||!recoveryValid)fail('INVALID_PORT_ORDER_STATE');
  }
  const latestPort=new Map();
  for(const p of o.ports.concat(portOrders))if(p.number){const latest=latestPortOrder(o,p.number);latestPort.set(p.number,latest);}
  for(const p of latestPort.values())if(p.schemaVersion===2){const n=o.numbers.find(n=>n.number===p.number),expected={submitted:p.previousProvider,scheduled:p.previousProvider,failed:p.previousProvider,complete:p.target,recovering:p.recoveryFromProvider,recovered:p.previousProvider}[p.status];if(expected&&n?.provider!==expected)fail('PORT_NUMBER_PROVIDER_MISMATCH');}
  for(const p of Object.values(o.policies))if(!p||typeof p.allowInternational!=='boolean'||!number(p.callerId)||!Array.isArray(p.allowedPrefixes)||p.allowedPrefixes.some(x=>typeof x!=='string'||!/^\+[1-9]\d{0,5}$/.test(x)))fail('INVALID_SAVED_POLICY');
  for(const r of o.receipts)if(!id(r.id)||!id(r.job))fail('INVALID_WEBHOOK_RECEIPT');
  for(const m of o.migrations)if(!id(m.id)||!Array.isArray(m.identities)||!m.checkpoint||!own(s.resources,m.target)||!['scheduled','verifying','complete','failed','rolled-back'].includes(m.status))fail('INVALID_MIGRATION_STATE');
  if(!o.policies||!o.placements||!o.conversationWindows||Object.keys(o.conversationWindows).length>1000)fail('INVALID_OPERATIONS_INDEX');
  for(const [identity,target] of Object.entries(o.placements))if(!id(identity)||!['uc','dedicated'].includes(s.resources[target]?.kind))fail('INVALID_PLATFORM_PLACEMENT');
 }
 const source=()=>`const SOC_OPERATIONS=(${socOperationsKernel.toString()})();`;
 return {PACK,schemas,features,numberPorting,create,config,inspect,fingerprint,platform,normalise,call,inboundCall,enqueue,advance,command,validate,supplierDueAt,source};
}
const SOC_OPERATIONS=socOperationsKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_OPERATIONS;
