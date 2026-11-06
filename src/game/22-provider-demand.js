/* Seeded, authored customer channel preferences for provider campaign demand.
 * This planner chooses among eligible paths; it never creates, resolves or scores work.
 */
function socProviderDemandKernel(){
 'use strict';
 const PACK='soc-provider-demand-1',VERSION=1,PERIOD=60,VOICE_COUNT=16,DIGITAL_COUNT=8;
 const CHANNELS={
  socialMessaging:{id:'social-messaging',operationId:'cisco-programmable-engagement',interactionChannel:'message',account:'chatterleaf',template:'service-outside-window',kind:'digital'},
  workplaceChat:{id:'workplace-chat',operationId:'ms-communications-api',interactionChannel:'message',account:'workplace',template:'case-update',kind:'digital'},
  video:{id:'video',operationId:'cisco-meetings-interoperability',interactionChannel:'meeting',account:null,template:null,kind:'meeting'}
 };
 const RULES={
  smb:{voiceFloor:12,preferences:{socialMessaging:4,workplaceChat:0,video:0}},
  enterprise:{voiceFloor:10,preferences:{socialMessaging:2,workplaceChat:2,video:2}},
  government:{voiceFloor:14,preferences:{socialMessaging:0,workplaceChat:1,video:1}},
  defence:{voiceFloor:15,preferences:{socialMessaging:0,workplaceChat:0,video:1}}
 };
 const fail=code=>{throw new Error(code);},integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x),copy=x=>JSON.parse(JSON.stringify(x));
 const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0;}
 function validateInput(request){
  const handoffVersion=!!request&&Object.prototype.hasOwnProperty.call(request,'handoffVersion');
  if(handoffVersion&&request.handoffVersion!==1)fail('INVALID_PROVIDER_HANDOFF_VERSION');
  if(!exact(request,['scenario','customerId','periodIndex','seed','voiceArrivals','digitalArrivals','caseIds','eligible',...(handoffVersion?['handoffVersion']:[])])||!RULES[request.scenario]||!id(request.customerId)||!integer(request.periodIndex)||!integer(request.seed,1,2147483646)||!Array.isArray(request.voiceArrivals)||request.voiceArrivals.length!==VOICE_COUNT||!Array.isArray(request.digitalArrivals)||request.digitalArrivals.length!==DIGITAL_COUNT||!Array.isArray(request.caseIds)||request.caseIds.length!==VOICE_COUNT+DIGITAL_COUNT||!exact(request.eligible,Object.keys(CHANNELS)))fail('INVALID_PROVIDER_DEMAND_REQUEST');
  if(request.voiceArrivals.some(x=>!integer(x,1,PERIOD))||new Set(request.voiceArrivals).size!==VOICE_COUNT||request.digitalArrivals.some(x=>!integer(x,1,PERIOD))||new Set(request.digitalArrivals).size!==DIGITAL_COUNT||request.caseIds.some(x=>!id(x))||new Set(request.caseIds).size!==request.caseIds.length||Object.values(request.eligible).some(x=>typeof x!=='boolean'))fail('INVALID_PROVIDER_DEMAND_REQUEST');
  const allTimes=[...request.voiceArrivals,...request.digitalArrivals];if(new Set(allTimes).size!==allTimes.length)fail('INVALID_PROVIDER_DEMAND_SCHEDULE');
 }
 function plan(request){
  validateInput(request);const rule=RULES[request.scenario],voiceSlots=request.voiceArrivals.map((arrivalAt,index)=>({index,arrivalAt,channel:'voice',sourceChannel:'voice'}));
  const order=voiceSlots.map(x=>({slot:x,rank:hash(`${request.seed}|${request.scenario}|${request.customerId}|${request.periodIndex}|${x.index}`)})).sort((a,b)=>a.rank-b.rank||a.slot.index-b.slot.index).map(x=>x.slot);
  const chosen=new Map();let cursor=0,substitutionBudget=Math.max(0,VOICE_COUNT-rule.voiceFloor);
  for(const key of Object.keys(CHANNELS)){
   if(!request.eligible[key])continue;const count=Math.min(rule.preferences[key],substitutionBudget);for(let n=0;n<count&&cursor<order.length;n++,cursor++)chosen.set(order[cursor].index,key);substitutionBudget-=count;
  }
  // Reserve an existing optional slot, never an additional voice-floor obligation.
  const handoffIndex=request.handoffVersion===1&&request.scenario==='smb'&&request.eligible.socialMessaging?[...chosen].filter(([,key])=>key==='socialMessaging').at(-1)?.[0]:undefined;
  const voice=voiceSlots.map(slot=>{const key=chosen.get(slot.index);if(!key)return {...slot,sourceCaseIndex:slot.index};const def=CHANNELS[key];if(slot.index===handoffIndex)return {...slot,handoffPreference:key,connectorId:def.id,operationId:def.operationId,account:def.account,template:def.template,workloadKind:def.kind,sourceCaseIndex:slot.index};return {...slot,channel:def.interactionChannel,sourceChannel:'voice',preference:key,connectorId:def.id,operationId:def.operationId,account:def.account,template:def.template,workloadKind:def.kind,sourceCaseIndex:slot.index};});
  const digital=request.digitalArrivals.map((arrivalAt,index)=>({index,arrivalAt,channel:'message',sourceChannel:'message',preference:null,connectorId:null,operationId:null,account:'chatterleaf',template:'service-outside-window',workloadKind:'digital',sourceCaseIndex:VOICE_COUNT+index}));
  const jobs=[...voice,...digital].sort((a,b)=>a.arrivalAt-b.arrivalAt||a.sourceCaseIndex-b.sourceCaseIndex).map(x=>({...x,caseId:request.caseIds[x.sourceCaseIndex]}));
  return {pack:PACK,version:VERSION,scenario:request.scenario,customerId:request.customerId,periodIndex:request.periodIndex,totalCases:jobs.length,baselineVoiceCount:VOICE_COUNT,voiceFloor:rule.voiceFloor,actualVoiceCount:jobs.filter(x=>x.channel==='voice').length,actualDigitalCount:jobs.filter(x=>x.channel==='message').length,actualMeetingCount:jobs.filter(x=>x.channel==='meeting').length,substitutions:Object.keys(CHANNELS).reduce((o,k)=>(o[k]=jobs.filter(x=>x.preference===k).length,o),{}),jobs,...(request.handoffVersion===1?{handoffVersion:1,handoffReservations:handoffIndex===undefined?0:1}:{})};
 }
 // Reconstruct from the canonical request; caller-supplied job flags are not authority.
 function handoffFor(request,caseId){const result=plan(request);return copy(result.jobs.find(job=>job.caseId===caseId&&job.handoffPreference)||null);}
 function connectorFor(id){for(const [key,value] of Object.entries(CHANNELS))if(value.id===id)return {preference:key,...copy(value)};return null;}
 const source=()=>`const SOC_PROVIDER_DEMAND=((${socProviderDemandKernel.toString()})());`;
 return {PACK,VERSION,PERIOD,RULES:copy(RULES),CHANNELS:copy(CHANNELS),plan,handoffFor,connectorFor,source};
}
const SOC_PROVIDER_DEMAND=socProviderDemandKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_DEMAND;
