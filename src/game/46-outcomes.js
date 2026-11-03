/* Optional customer-need outcomes. All task evidence and repeat arrivals are synthetic. */
function socOutcomesKernel(){
 'use strict';
 const PACK='soc-outcomes-1',copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=code=>{throw new Error(code);},id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x),integer=(x,min=0,max=100000)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const defaults={supportedIntents:[],taskIntegrations:[],handoffDestination:'service',maxAttempts:3,repeatInterval:5,repeatEffort:1,contextLossEffort:2,maxRepeatEmissionsPerAdvance:2};
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function validateConfig(c){
  if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).sort().join(',')!==Object.keys(defaults).sort().join(','))fail('INVALID_OUTCOMES_CONFIG');
  if(!Array.isArray(c.supportedIntents)||c.supportedIntents.length>50||c.supportedIntents.some(x=>!id(x))||new Set(c.supportedIntents).size!==c.supportedIntents.length)fail('INVALID_SUPPORTED_INTENTS');
  if(!Array.isArray(c.taskIntegrations)||c.taskIntegrations.length>50)fail('INVALID_TASK_INTEGRATIONS');
  const intents=new Set();for(const x of c.taskIntegrations)if(!x||Object.keys(x).sort().join(',')!=='evidence,integration,intent'||!id(x.intent)||!id(x.integration)||!Array.isArray(x.evidence)||x.evidence.length>20||x.evidence.some(y=>!id(y))||new Set(x.evidence).size!==x.evidence.length||intents.has(x.intent)||!c.supportedIntents.includes(x.intent))fail('INVALID_TASK_INTEGRATION');else intents.add(x.intent);
  if(!id(c.handoffDestination)||!integer(c.maxAttempts,1,8)||!integer(c.repeatInterval,1,1440)||!integer(c.repeatEffort,0,100)||!integer(c.contextLossEffort,0,100)||!integer(c.maxRepeatEmissionsPerAdvance,1,10))fail('INVALID_OUTCOMES_POLICY');
 }
 function create(s){const config=copy(defaults);return {pack:PACK,version:1,config:{desired:config,effective:copy(config),generation:1,provisioning:{status:'ready',due:s.clock,generation:1,errors:[]}},needs:[],createdNeedCount:0,taskResults:[],nextId:1};}
 function findNeed(s,key){return s?.outcomes?.needs?.find(n=>n.id===key)||null;}
 function needCommand(s,c){
  if(!s.outcomes.config.effective)fail('OUTCOMES_NOT_PROVISIONED');
  if(!id(c.tenant)||!id(c.person)||!id(c.caseId)||typeof c.purpose!=='string'||!c.purpose.trim()||c.purpose.length>200||!id(c.intent)||!Array.isArray(c.permittedChannels)||!c.permittedChannels.length||c.permittedChannels.length>2||c.permittedChannels.some(x=>!['voice','message'].includes(x))||new Set(c.permittedChannels).size!==c.permittedChannels.length)fail('INVALID_CUSTOMER_NEED');
  if(s.outcomes.needs.length>=1000)fail('OUTCOMES_NEED_CAPACITY');
  const route=s.outcomes.config.effective.taskIntegrations.find(x=>x.intent===c.intent);
  const c0=s.outcomes.config.effective,n={id:`need-${s.outcomes.nextId++}`,tenant:c.tenant,person:c.person,caseId:c.caseId,purpose:c.purpose.trim(),intent:c.intent,permittedChannels:[...c.permittedChannels],supportedIntent:c0.supportedIntents.includes(c.intent),resolutionCriteria:route?copy(route):null,contract:{generation:s.outcomes.config.generation,handoffDestination:c0.handoffDestination,maxAttempts:c0.maxAttempts,repeatInterval:c0.repeatInterval,repeatEffort:c0.repeatEffort,contextLossEffort:c0.contextLossEffort},createdAt:s.clock,attempts:[],effort:0,firstContactOutcome:null,status:'open',resolution:null,repeat:{status:'none',dueAt:null,repeatCount:0,pendingInteractionId:null,pendingKey:null,nextChannelIndex:0,lastDelay:null}};
  s.outcomes.needs.push(n);s.outcomes.createdNeedCount++;return copy(n);
 }
 function taskResultCommand(s,c){
  if(!id(c.needId)||!id(c.interactionId)||!id(c.intent)||c.integration!==null&&!id(c.integration)||typeof c.succeeded!=='boolean'||typeof c.botAnswered!=='boolean'||!Array.isArray(c.evidence)||c.evidence.length>20||c.evidence.some(x=>!id(x))||new Set(c.evidence).size!==c.evidence.length)fail('INVALID_TASK_RESULT');
  const n=findNeed(s,c.needId);if(!n)fail('OUTCOMES_NEED_UNAVAILABLE');
  const result={needId:c.needId,interactionId:c.interactionId,intent:c.intent,integration:c.integration,succeeded:c.succeeded,botAnswered:c.botAnswered,evidence:[...c.evidence],at:s.clock};
  const old=s.outcomes.taskResults.find(x=>x.interactionId===result.interactionId);if(old){const oldData={...old},newData={...result};delete oldData.at;delete newData.at;if(!same(oldData,newData))fail('TASK_RESULT_CONFLICT');return copy(old);}
  if(n.status!=='open')fail('OUTCOMES_NEED_CLOSED');
  if(s.outcomes.taskResults.length>=2000)fail('OUTCOMES_TASK_RESULT_CAPACITY');s.outcomes.taskResults.push(result);return copy(result);
 }
 function configure(s,c){
  const n=s.outcomes.config;if(!c.config||typeof c.config!=='object'||Array.isArray(c.config)||Object.keys(c.config).some(k=>!own(defaults,k)))fail('INVALID_OUTCOMES_CONFIG');
  const desired={...copy(n.desired),...copy(c.config)};validateConfig(desired);n.desired=desired;n.generation++;n.provisioning={status:'pending',due:s.clock+1,generation:n.generation,errors:[]};return copy(n.provisioning);
 }
 function command(s,c){
  if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.action!=='string')fail('INVALID_OUTCOMES_COMMAND');
  if(!s?.outcomes||s.outcomes.pack!==PACK)fail('OUTCOMES_NOT_STARTED');
  if(c.action==='configure'){if(Object.keys(c).sort().join(',')!=='action,config')fail('INVALID_OUTCOMES_COMMAND');return configure(s,c);}
  if(c.action==='need'){if(Object.keys(c).sort().join(',')!=='action,caseId,intent,permittedChannels,person,purpose,tenant')fail('INVALID_OUTCOMES_COMMAND');return needCommand(s,c);}
  if(c.action==='task-result'){if(Object.keys(c).sort().join(',')!=='action,botAnswered,evidence,integration,intent,interactionId,needId,succeeded')fail('INVALID_OUTCOMES_COMMAND');return taskResultCommand(s,c);}
  fail('INVALID_OUTCOMES_COMMAND');
 }
 function evaluate(s,interaction,context={}){
  if(!s?.outcomes||s.outcomes.pack!==PACK)fail('OUTCOMES_NOT_STARTED');
  if(!interaction||typeof interaction!=='object'||!id(interaction.id))fail('INVALID_OUTCOMES_EVALUATION_INPUT');if(!id(interaction.needId))return null;
  const need=findNeed(s,interaction.needId);if(!need)return null;
  if(!['voice','message'].includes(interaction.channel)||!id(interaction.caseId)||!context||typeof context!=='object'||Array.isArray(context)||!['bot','human'].includes(context.actor)||typeof context.technicalSuccess!=='boolean'||typeof context.taskIntegrationReady!=='boolean'||typeof context.contextRetained!=='boolean'||typeof context.identityVerified!=='boolean'||!id(context.tenant)||!id(context.person)||!id(context.caseId)||typeof context.purpose!=='string'||!context.purpose.trim()||!id(context.businessIntent))fail('INVALID_OUTCOMES_EVALUATION_INPUT');
  const result=s.outcomes.taskResults.find(x=>x.interactionId===interaction.id&&x.needId===need.id);
  const base={needId:need.id,interactionId:interaction.id,caseId:interaction.caseId,channel:interaction.channel,configGeneration:need.contract.generation,technicalSuccess:context.technicalSuccess,context:{actor:context.actor,technicalSuccess:context.technicalSuccess,taskIntegrationReady:context.taskIntegrationReady,contextRetained:context.contextRetained,tenant:context.tenant,person:context.person,caseId:context.caseId,purpose:context.purpose,businessIntent:context.businessIntent,identityVerified:context.identityVerified}};
  const out=(outcome,reason,extra={})=>({...base,outcome,reason,...extra,...(outcome==='escalate'?{handoffDestination:need.contract.handoffDestination}:{})});
  if(need.status==='resolved'||need.status==='exhausted'||need.status==='escalated')return out('escalate','NEED_CLOSED');
  if(interaction.caseId!==need.caseId||context.caseId!==need.caseId||context.tenant!==need.tenant||context.person!==need.person||context.purpose!==need.purpose)return out('escalate','CUSTOMER_CONTEXT_MISMATCH');
  if(context.identityVerified!==true)return out('escalate','IDENTITY_NOT_VERIFIED');
  if(context.contextRetained!==true)return out('escalate','STALE_CUSTOMER_CONTEXT');
  if(context.businessIntent!==need.intent||!need.supportedIntent)return out('escalate','UNSUPPORTED_INTENT');
  if(!need.permittedChannels.includes(interaction.channel))return out('escalate','CHANNEL_NOT_PERMITTED');
  if(!result)return out('unresolved','TASK_RESULT_MISSING');
  if(result.intent!==need.intent)return out('escalate','UNSUPPORTED_INTENT');
  const route=need.resolutionCriteria;
  if(!route)return out('escalate','TASK_INTEGRATION_MISSING',{intent:result.intent});
  if(context.taskIntegrationReady!==true)return out('unresolved','TASK_INTEGRATION_UNAVAILABLE',{intent:result.intent,integration:route.integration});
  if(result.integration!==route.integration)return out('unresolved','TASK_INTEGRATION_MISMATCH',{intent:result.intent,integration:route.integration});
  if(!result.succeeded)return out('unresolved',context.actor==='bot'&&result.botAnswered?'BOT_CONTAINED_TASK_FAILED':'TASK_FAILED',{intent:result.intent,integration:result.integration});
  const satisfied=route.evidence.filter(x=>result.evidence.includes(x));if(satisfied.length!==route.evidence.length)return out('unresolved',context.actor==='bot'&&result.botAnswered?'BOT_CONTAINED_TASK_CRITERIA_UNMET':'TASK_CRITERIA_UNMET',{intent:result.intent,integration:result.integration,satisfiedEvidence:satisfied});
  return out('resolved','TASK_SUCCESS_CONFIRMED',{intent:result.intent,integration:result.integration,satisfiedEvidence:satisfied});
 }
 function attemptKey(interaction){return interaction.idempotencyKey||interaction.id;}
 function settle(s,interaction,evaluation){
  if(!s?.outcomes||s.outcomes.pack!==PACK)fail('OUTCOMES_NOT_STARTED');
  const need=findNeed(s,interaction?.needId);if(!need)return null;if(!evaluation||evaluation.needId!==need.id||evaluation.interactionId!==interaction.id)fail('INVALID_OUTCOMES_SETTLEMENT');
  const key=attemptKey(interaction);if(!id(key))fail('INVALID_OUTCOMES_IDEMPOTENCY_KEY');const prior=need.attempts.find(x=>x.idempotencyKey===key);if(prior)return copy(prior);if(['resolved','escalated','exhausted'].includes(need.status))return null;
  if(need.repeat.status==='emitted'&&(need.repeat.pendingInteractionId!==interaction.id||need.repeat.pendingKey!==key))fail('REPEAT_SETTLEMENT_MISMATCH');
  const fresh=evaluate(s,interaction,evaluation.context);if(!same(fresh,evaluation))fail('STALE_OUTCOMES_EVALUATION');
  const previous=need.attempts.at(-1),isRepeat=need.repeat.status==='emitted'&&need.repeat.pendingInteractionId===interaction.id;
  const crossChannelContextLoss=!!previous&&previous.channel!==interaction.channel&&fresh.context.contextRetained!==true;
  const effort=1+(isRepeat?need.contract.repeatEffort:0)+(crossChannelContextLoss?need.contract.contextLossEffort:0);
  const attempt={id:`outcome-attempt-${s.outcomes.nextId++}`,idempotencyKey:key,interactionId:interaction.id,channel:interaction.channel,at:s.clock,outcome:fresh.outcome,reason:fresh.reason,effort,isRepeat,actor:fresh.context.actor,technicalSuccess:fresh.technicalSuccess,...(fresh.outcome==='escalate'?{handoffDestination:fresh.handoffDestination}:{})};
  need.attempts.push(attempt);need.effort+=effort;if(need.firstContactOutcome===null)need.firstContactOutcome=fresh.outcome;
  if(isRepeat){need.repeat.status='none';need.repeat.dueAt=null;need.repeat.pendingInteractionId=null;need.repeat.pendingKey=null;need.repeat.lastDelay=null;}
  if(fresh.outcome==='resolved'){need.status='resolved';need.repeat.status='none';need.resolution={interactionId:interaction.id,at:s.clock,intent:fresh.intent,integration:fresh.integration,evidence:[...(fresh.satisfiedEvidence||[])]};}
  else if(fresh.outcome==='escalate'){need.status='escalated';need.repeat.status='none';need.resolution=null;}
  else if(need.attempts.length>=need.contract.maxAttempts){need.status='exhausted';need.repeat.status='exhausted';need.repeat.dueAt=null;need.resolution=null;}
  else{need.status='open';need.resolution=null;need.repeat.status='pending';need.repeat.dueAt=s.clock+need.contract.repeatInterval;const last=need.attempts.at(-1).channel,index=need.permittedChannels.indexOf(last);need.repeat.nextChannelIndex=index<0?0:(index+1)%need.permittedChannels.length;}
  return copy(attempt);
 }
 function advance(s,hooks={}){
  const o=s?.outcomes;if(!o)return 0;const n=o.config;if(n.provisioning.status==='pending'&&n.provisioning.due<=s.clock){const ready=typeof hooks.configReady==='function'?hooks.configReady(s,n.desired)===true:true;n.provisioning.errors=ready?[]:['OUTCOMES_PREREQUISITE_UNAVAILABLE'];if(ready){n.effective=copy(n.desired);n.provisioning.status='ready';}else n.provisioning.status='failed';}
  const c=n.effective;if(!c)return 0;let emitted=0;const due=o.needs.filter(x=>x.status==='open'&&x.repeat.status==='pending'&&x.repeat.dueAt<=s.clock).sort((a,b)=>a.repeat.dueAt-b.repeat.dueAt||a.id.localeCompare(b.id));
  for(const need of due){if(emitted>=c.maxRepeatEmissionsPerAdvance)break;if(need.attempts.length>=need.contract.maxAttempts){need.status='exhausted';need.repeat.status='exhausted';need.repeat.dueAt=null;continue;}
   let chosen=-1;for(let offset=0;offset<need.permittedChannels.length;offset++){const ix=(need.repeat.nextChannelIndex+offset)%need.permittedChannels.length,channel=need.permittedChannels[ix];if(typeof hooks.channelAvailable==='function'&&hooks.channelAvailable(s,copy(need),channel)===true){chosen=ix;break;}}
   if(chosen<0){need.repeat.dueAt=s.clock+1;need.repeat.lastDelay=typeof hooks.channelAvailable==='function'?'CHANNEL_UNAVAILABLE':'CHANNEL_AVAILABILITY_UNKNOWN';continue;}
   if(typeof hooks.emitRepeat!=='function'){need.repeat.dueAt=s.clock+1;need.repeat.lastDelay='REPEAT_EMITTER_UNAVAILABLE';continue;}
   const channel=need.permittedChannels[chosen],repeatNumber=need.repeat.repeatCount+1,idempotencyKey=`${need.id}-repeat-${repeatNumber}`;
   const original=need.attempts.at(-1),request={idempotencyKey,usageToken:idempotencyKey,needId:need.id,tenant:need.tenant,person:need.person,caseId:need.caseId,purpose:need.purpose,intent:need.intent,channel,repeatOfInteraction:original?.interactionId||null,originalAttemptIdempotencyKey:original?.idempotencyKey||null,attemptIndex:need.attempts.length+1,newContact:true,noDuplicateOriginalCharge:true,source:'soc-outcomes-repeat'};
   const receipt=hooks.emitRepeat(s,copy(request)),interactionId=typeof receipt==='string'?receipt:receipt?.interactionId;if(!id(interactionId))fail('INVALID_REPEAT_EMISSION');
   need.repeat.status='emitted';need.repeat.pendingInteractionId=interactionId;need.repeat.pendingKey=idempotencyKey;need.repeat.repeatCount=repeatNumber;need.repeat.nextChannelIndex=(chosen+1)%need.permittedChannels.length;need.repeat.dueAt=null;need.repeat.lastDelay=null;emitted++;
  }
  return emitted;
 }
 function validate(s){
  const o=s?.outcomes;if(o===undefined||o===null)return true;if(o.pack!==PACK||o.version!==1||!Number.isSafeInteger(o.nextId)||o.nextId<1||!Number.isSafeInteger(o.createdNeedCount)||o.createdNeedCount<0||!o.config||!Array.isArray(o.needs)||o.needs.length>1000||o.createdNeedCount!==o.needs.length||!Array.isArray(o.taskResults)||o.taskResults.length>2000)fail('INVALID_OUTCOMES_SAVE');
  const n=o.config;if(!Number.isSafeInteger(n.generation)||n.generation<1||n.provisioning?.generation!==n.generation||!['pending','ready','failed'].includes(n.provisioning.status)||!Number.isSafeInteger(n.provisioning.due)||n.provisioning.due<0||!Array.isArray(n.provisioning.errors)||n.provisioning.errors.length>10||n.provisioning.errors.some(x=>typeof x!=='string')||!n.desired)fail('INVALID_OUTCOMES_CONFIG_STATE');validateConfig(n.desired);if(n.effective)validateConfig(n.effective);if(n.provisioning.status==='ready'&&(!n.effective||!same(n.desired,n.effective)))fail('INVALID_OUTCOMES_CONFIG_STATE');
  const needIds=new Set(),attemptIds=new Set(),idempotencyKeys=new Set();for(const x of o.needs){if(!id(x.id)||needIds.has(x.id)||!id(x.tenant)||!id(x.person)||!id(x.caseId)||typeof x.purpose!=='string'||!x.purpose.trim()||x.purpose.length>200||!id(x.intent)||!Array.isArray(x.permittedChannels)||!x.permittedChannels.length||x.permittedChannels.length>2||x.permittedChannels.some(v=>!['voice','message'].includes(v))||new Set(x.permittedChannels).size!==x.permittedChannels.length||typeof x.supportedIntent!=='boolean'||x.resolutionCriteria!==null&&(!x.resolutionCriteria||x.resolutionCriteria.intent!==x.intent||!id(x.resolutionCriteria.integration)||!Array.isArray(x.resolutionCriteria.evidence)||x.resolutionCriteria.evidence.length>20||x.resolutionCriteria.evidence.some(v=>!id(v))||new Set(x.resolutionCriteria.evidence).size!==x.resolutionCriteria.evidence.length)||!x.contract||!integer(x.contract.generation,1)||x.contract.generation>n.generation||!id(x.contract.handoffDestination)||!integer(x.contract.maxAttempts,1,8)||!integer(x.contract.repeatInterval,1,1440)||!integer(x.contract.repeatEffort,0,100)||!integer(x.contract.contextLossEffort,0,100)||!Number.isSafeInteger(x.createdAt)||x.createdAt<0||!Array.isArray(x.attempts)||x.attempts.length>8||!integer(x.effort)||!['open','resolved','escalated','exhausted'].includes(x.status)||x.firstContactOutcome!==null&&!['resolved','unresolved','escalate'].includes(x.firstContactOutcome)||!x.repeat||!['none','pending','emitted','exhausted'].includes(x.repeat.status)||x.repeat.dueAt!==null&&!integer(x.repeat.dueAt)||!integer(x.repeat.repeatCount,0,8)||x.repeat.pendingInteractionId!==null&&!id(x.repeat.pendingInteractionId)||x.repeat.pendingKey!==null&&!id(x.repeat.pendingKey)||!integer(x.repeat.nextChannelIndex,0,x.permittedChannels.length-1)||x.repeat.lastDelay!==null&&typeof x.repeat.lastDelay!=='string')fail('INVALID_CUSTOMER_NEED_SAVE');needIds.add(x.id);
   let effort=0;for(const a of x.attempts){if(!id(a.id)||attemptIds.has(a.id)||!id(a.idempotencyKey)||idempotencyKeys.has(a.idempotencyKey)||!id(a.interactionId)||!x.permittedChannels.includes(a.channel)||!integer(a.at)||!['resolved','unresolved','escalate'].includes(a.outcome)||typeof a.reason!=='string'||!integer(a.effort,1)||typeof a.isRepeat!=='boolean'||!['bot','human'].includes(a.actor)||typeof a.technicalSuccess!=='boolean'||a.handoffDestination!==undefined&&!id(a.handoffDestination))fail('INVALID_OUTCOME_ATTEMPT');attemptIds.add(a.id);idempotencyKeys.add(a.idempotencyKey);effort+=a.effort;}
   if(x.effort!==effort||x.firstContactOutcome!==(x.attempts[0]?.outcome??null)||x.repeat.repeatCount<x.attempts.filter(a=>a.isRepeat).length)fail('INVALID_OUTCOME_ATTEMPT');if(x.status==='resolved'&&(!x.resolution||!id(x.resolution.interactionId)||!integer(x.resolution.at)||!id(x.resolution.intent)||!id(x.resolution.integration)||!Array.isArray(x.resolution.evidence)||x.resolution.evidence.some(v=>!id(v))||x.attempts.at(-1)?.interactionId!==x.resolution.interactionId||x.attempts.at(-1)?.outcome!=='resolved'||x.repeat.status!=='none'))fail('INVALID_OUTCOME_RESOLUTION');if(x.status!=='resolved'&&x.resolution!==null)fail('INVALID_OUTCOME_RESOLUTION');if(x.status==='exhausted'&&(x.repeat.status!=='exhausted'||x.attempts.length<x.contract.maxAttempts)||x.status==='escalated'&&(x.repeat.status!=='none'||x.attempts.at(-1)?.outcome!=='escalate')||x.status==='resolved'&&x.attempts.at(-1)?.outcome!=='resolved'||x.status==='open'&&(x.attempts.length>=x.contract.maxAttempts||x.attempts.length===0&&x.repeat.status!=='none'||x.attempts.length>0&&!['pending','emitted'].includes(x.repeat.status))||x.status!=='open'&&x.status!=='resolved'&&x.status!=='escalated'&&x.status!=='exhausted')fail('INVALID_NEED_STATUS');if(x.repeat.status==='emitted'&&(!x.repeat.pendingInteractionId||!x.repeat.pendingKey)||x.repeat.status==='pending'&&(!integer(x.repeat.dueAt)||x.repeat.pendingInteractionId!==null||x.repeat.pendingKey!==null)||x.repeat.status==='none'&&(x.repeat.dueAt!==null||x.repeat.pendingInteractionId!==null||x.repeat.pendingKey!==null))fail('INVALID_REPEAT_STATE');
  }
  const resultIds=new Set();for(const r of o.taskResults)if(!needIds.has(r.needId)||!id(r.interactionId)||!id(r.intent)||r.integration!==null&&!id(r.integration)||typeof r.succeeded!=='boolean'||typeof r.botAnswered!=='boolean'||!Array.isArray(r.evidence)||r.evidence.length>20||r.evidence.some(x=>!id(x))||new Set(r.evidence).size!==r.evidence.length||!integer(r.at)||resultIds.has(r.interactionId))fail('INVALID_TASK_RESULT_SAVE');else resultIds.add(r.interactionId);
  return true;
 }
 function inspect(s){const o=s.outcomes;if(!o)return null;const done=o.needs.filter(n=>n.status==='resolved').length;return {pack:PACK,config:{generation:o.config.generation,status:o.config.provisioning.status},metrics:{needs:o.needs.length,firstContactResolved:o.needs.filter(n=>n.firstContactOutcome==='resolved').length,firstContactResolutionRate:o.needs.length?done?o.needs.filter(n=>n.firstContactOutcome==='resolved').length/o.needs.length:0:0,repeatContacts:o.needs.reduce((v,n)=>v+n.repeat.repeatCount,0),effort:o.needs.reduce((v,n)=>v+n.effort,0),pending:o.needs.filter(n=>n.status==='open').length,escalated:o.needs.filter(n=>n.status==='escalated').length,exhausted:o.needs.filter(n=>n.status==='exhausted').length},needs:o.needs.map(n=>({id:n.id,tenant:n.tenant,person:n.person,caseId:n.caseId,purpose:n.purpose,status:n.status,attempts:n.attempts.length,effort:n.effort,firstContactOutcome:n.firstContactOutcome,repeat:{status:n.repeat.status,dueAt:n.repeat.dueAt,repeatCount:n.repeat.repeatCount}}))};}
 function fingerprint(s){const o=s.outcomes;if(!o)return null;const c=o.config;return JSON.stringify([o.pack,c.generation,c.desired,c.effective]);}
 const source=()=>`const SOC_OUTCOMES=(${socOutcomesKernel.toString()})();`;
 return {PACK,defaults,create,command,configure,needCommand,taskResultCommand,evaluate,settle,advance,validate,inspect,fingerprint,source};
}
const SOC_OUTCOMES=socOutcomesKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_OUTCOMES;
