/* Evidence-only adapters for the preserved calling-related progression goals. */
function socCallingAchievementsKernel(){
 'use strict';
 const PACK='soc-calling-achievements-1',VERSION=1;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const goalId=x=>`progress.goal.${x}`;
 const goalIds=['tr','p5','ca','pn','scrub'].map(goalId);
 const sourceIds=[...goalIds];
 const fail=code=>{throw new Error(code);},int=x=>Number.isSafeInteger(x)&&x>=0;
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const securityApi=()=>typeof SOC_ADMISSION_SECURITY!=='undefined'?SOC_ADMISSION_SECURITY:(typeof require==='function'?require('./38-admission-security.js'):null);
 const productsApi=()=>typeof SOC_PRODUCTS!=='undefined'?SOC_PRODUCTS:(typeof require==='function'?require('./45-products.js'):null);
 const informationApi=()=>typeof SOC_INFORMATION!=='undefined'?SOC_INFORMATION:(typeof require==='function'?require('./52-information.js'):null);
 const boundariesApi=()=>typeof SOC_BOUNDARIES!=='undefined'?SOC_BOUNDARIES:(typeof require==='function'?require('./43-boundaries.js'):null);
 function validRoot(s){return !!s&&s.app==='series-of-calls'&&s.pack==='soc-foundation-1'&&int(s.clock)&&Array.isArray(s.interactions)&&Array.isArray(s.commands);}
 function successfulVoice(i){return !!i&&i.channel==='voice'&&i.phase==='resolved'&&['CONNECTED','RESOLVED'].includes(i.outcome)&&Array.isArray(i.obligations)&&i.obligations.length===0&&i.trace.some(t=>t.code==='INVITE')&&i.trace.some(t=>t.code==='200_OK')&&i.trace.some(t=>t.code==='MEDIA_PATHS'&&t.out===true&&t.in===true);}
 function supportContract(s,edge){
  const b=s.business,a=s.products?.deployments?.find(x=>x.id===edge.source),z=s.products?.deployments?.find(x=>x.id===edge.target);if(!b||!a||!z)return null;
  const resources=new Set([...(a.effective?.bindings||[]),...(z.effective?.bindings||[])].flatMap(x=>x.resources||[]));
  return (b.contracts||[]).find(c=>c.status==='active'&&c.customer==='customer'&&c.sell===true&&c.supportOwner&&b.organisations?.[c.supportOwner]?.roles?.some(r=>['msp','integrator'].includes(r))&&(c.resources||[]).some(x=>resources.has(x)))||null;
 }
 function bindingReady(s,d,feature,resource,hooks){
  if(typeof hooks.productBindingAvailable==='function')return hooks.productBindingAvailable(s,d.id,feature,resource)===true;
  const P=productsApi();if(!P||typeof P.bindingStatus!=='function')return false;
  const result=P.bindingStatus(s,d.id,feature,resource,hooks.productHooks||{});
  return result.available===true&&(!s.resources?.[resource]||!s.resources[resource].fault)&&(!s.resources?.[resource]?.effective||s.resources[resource].provisioning?.status==='ready');
 }
 function productEvidence(s,hooks){
  const P=productsApi(),p=s.products;if(!P||p?.pack!=='soc-products-1')return null;
  try{P.validate(s);}catch{return null;}
  const rows=[];
  for(const edge of p.integrations||[]){
   const a=p.deployments.find(d=>d.id===edge.source),b=p.deployments.find(d=>d.id===edge.target),contract=supportContract(s,edge);
   if(!a?.effective||!b?.effective||!contract||edge.result?.status!=='scenario-verified'||edge.result.synthetic!==true||edge.result.externalSupportClaim!==false||edge.sourceGeneration!==a.generation||edge.targetGeneration!==b.generation||edge.sourceVersion!==a.effective.productVersion||edge.targetVersion!==b.effective.productVersion||edge.result.sourceGeneration!==a.generation||edge.result.targetGeneration!==b.generation||edge.result.sourceVersion!==a.effective.productVersion||edge.result.targetVersion!==b.effective.productVersion)continue;
   if(!Array.isArray(edge.features)||!edge.features.length||!edge.result.checks?.length||edge.result.checks.some(c=>c.source?.available!==true||c.target?.available!==true))continue;
   let bound=true;for(const pair of edge.features){const sb=a.effective.bindings.find(x=>x.feature===pair.sourceFeature),tb=b.effective.bindings.find(x=>x.feature===pair.targetFeature);if(!sb||!tb||!sb.resources.length||!tb.resources.length||sb.resources.some(r=>!bindingReady(s,a,pair.sourceFeature,r,hooks))||tb.resources.some(r=>!bindingReady(s,b,pair.targetFeature,r,hooks)))bound=false;}
   const tested=s.commands.slice().reverse().find(c=>c.command?.type==='products'&&c.command?.command?.action==='test-integration'&&c.command.command.id===edge.id);
   if(!bound||!tested||tested.at!==edge.result.checkedAt)continue;
   rows.push({id:edge.id,source:edge.source,target:edge.target,sourceGeneration:a.generation,targetGeneration:b.generation,sourceVersion:a.effective.productVersion,targetVersion:b.effective.productVersion,features:copy(edge.features),result:copy(edge.result),testRevision:tested.revision,sourceBindings:copy(a.effective.bindings),targetBindings:copy(b.effective.bindings),supportContract:{id:contract.id,status:contract.status,customer:contract.customer,sell:contract.sell,supportOwner:contract.supportOwner,resources:copy(contract.resources),ownerRoles:copy(s.business.organisations[contract.supportOwner].roles)}});
  }
  // Count distinct target services and edges; duplicate tests never add capacity.
  const distinct=new Map();for(const x of rows)distinct.set(`${x.source}\0${x.target}`,x);
  const selected=[...distinct.values()].sort((a,b)=>a.id.localeCompare(b.id)).slice(0,5);
  return selected.length===5?{kind:'five-current-supported-integrations',at:s.clock,integrations:selected}:null;
 }
 function localProcessingEvidence(s){
  const I=informationApi(),info=s.information,pipe=info?.pipeline?.effective,proc=pipe&&s.resources?.[pipe.processor],archive=pipe&&s.resources?.[pipe.archive],local=s.resources?.local;
  if(!I||!info||!pipe||!proc?.effective||!archive?.effective||!local?.effective)return null;
  try{I.validate(s);}catch{return null;}
  if(proc.kind!=='processor'||!proc.effective.local||!proc.effective.licenceLocal||proc.effective.region!==s.jurisdiction||archive.effective.region!==s.jurisdiction||pipe.processor!=='speech')return null;
  const jobs=info.jobs.filter(j=>j.status==='complete'&&j.plan?.processor==='speech').filter(j=>{
   const source=s.records.find(r=>r.id===j.source),out=s.records.find(r=>r.id===j.parent),interaction=s.interactions.find(i=>i.id===j.interaction);
   if(!source||source.kind!=='recording'||source.interaction!==j.interaction||source.deleted||!out||out.kind!=='index'||out.deleted||!interaction||!successfulVoice(interaction))return false;
   return j.plan.steps.every(kind=>s.records.some(r=>r.kind===kind&&r.interaction===j.interaction))&&s.records.filter(r=>r.interaction===j.interaction&&r.parents.length===1).every(r=>s.records.some(parent=>parent.id===r.parents[0]&&parent.interaction===j.interaction));
  });
  if(!jobs.length)return null;
  if(!local.effective.enabled||local.fault||local.provisioning.status!=='ready'||!local.effective.identity||!local.effective.dns||!local.effective.time||!local.effective.certificates||!local.effective.licensing)return null;
  if(proc.provisioning.status!=='ready'||archive.provisioning.status!=='ready'||proc.fault||archive.fault)return null;
  if(!s.connected&&(!local.effective.backup||!local.effective.licensing||!proc.effective.licenceLocal))return null;
  if(info.pipeline.provisioning.status!=='ready'||info.boundary.provisioning.status!=='ready'||info.pipeline.generation!==info.pipeline.provisioning.generation)return null;
  if(s.boundaries){const B=boundariesApi();if(!B)return null;for(const resource of [pipe.processor,pipe.archive,'local']){if(!s.boundaries.bindings[resource])return null;const result=B.evaluate(s,resource);if(!result.eligible)return null;}}
  const job=jobs.at(-1),recordChain=s.records.filter(r=>r.interaction===job.interaction).map(r=>({id:r.id,kind:r.kind,parents:copy(r.parents),region:r.region,processRegion:r.processRegion,deleted:r.deleted}));
  const boundaryEvidence=s.boundaries?[pipe.processor,pipe.archive,'local'].map(resource=>({resource,evaluation:copy(boundariesApi().evaluate(s,resource))})):[];
  return {kind:'completed-local-speech-processing',at:s.clock,scenario:s.scenario,jurisdiction:s.jurisdiction,jobId:job.id,job:copy(job),recordingId:job.source,outputId:job.parent,recordChain,pipeline:copy(info.pipeline.effective),informationBoundary:copy(info.boundary.effective),processor:pipe.processor,processorConfig:copy(proc.effective),processorGeneration:proc.generation,archive:pipe.archive,archiveConfig:copy(archive.effective),archiveGeneration:archive.generation,localConfig:copy(local.effective),localGeneration:local.generation,boundaryEvidence,connected:s.connected};
 }
 function carrierEvidence(s){
  const carrier=s.operations?.carrier?.effective,trunk=s.resources?.carrier?.effective;if(!carrier||carrier.mode!=='gateway'||!['sbcCertified','tlsTrusted','hostnameValid','peerAuthenticated'].every(k=>carrier[k]===true)||!trunk||!trunk.enabled||!trunk.signalling||!trunk.mediaOut||!trunk.mediaIn)return null;
  if(s.operations.carrier.provisioning?.status!=='ready'||s.resources.carrier.provisioning?.status!=='ready')return null;
  const rows=s.interactions.filter(i=>successfulVoice(i)&&i.trace.some(t=>t.code==='CARRIER_MODEL_SELECTED'&&t.model==='gateway')&&i.trace.some(t=>t.code==='INVITE')&&i.trace.some(t=>t.code==='200_OK'));
  const outbound=rows.filter(i=>i.direction==='outbound').at(-1),inbound=rows.filter(i=>i.direction==='inbound').at(-1);
  if(!outbound||!inbound)return null;
  return {kind:'dedicated-gateway-bidirectional-acceptance',at:s.clock,carrierGeneration:s.operations.carrier.generation,carrier:copy(carrier),trunkGeneration:s.resources.carrier.generation,trunk:copy(trunk),interactions:[outbound,inbound].map(i=>({id:i.id,direction:i.direction,phase:i.phase,outcome:i.outcome,obligations:copy(i.obligations),trace:copy(i.trace)}))};
 }
 function externalReachEvidence(s){
  const calls=s.interactions.filter(i=>successfulVoice(i)&&i.direction==='outbound'&&(/^\+[1-9]\d{5,14}$/.test(i.to)||/^\+[1-9]\d{5,14}$/.test(i.dialled||'')));
  const inbound=s.interactions.filter(i=>successfulVoice(i)&&i.direction==='inbound'&&i.trace.some(t=>t.code==='INBOUND_NUMBER_ACCEPTED'&&t.number===i.to&&t.holder)&&i.trace.some(t=>t.code==='ORDERED_INBOUND_ROUTE'&&t.normalised===i.to&&t.target)&&i.trace.some(t=>t.code==='INBOUND_PERMISSION_ACCEPTED'&&t.holder)&&i.trace.some(t=>t.code==='CARRIER_MODEL_SELECTED'&&t.direction==='inbound'));
  const booking=s.information?.bookings?.filter(b=>!b.cancelled&&b.attendees>=2&&b.lastJoin?.success===true&&b.lastJoin?.reasons?.length===0).sort((a,b)=>(b.lastJoin.at||0)-(a.lastJoin.at||0))[0];
  if(!calls.length||!inbound.length||!booking)return null;
  const currentMeeting=s.information?.meeting?.effective;if(!currentMeeting?.guestJoin||s.lastMeeting?.success!==true||!booking.lastJoin?.fingerprint||booking.lastJoin.fingerprint!==s.lastMeeting.fingerprint)return null;
  return {kind:'external-calling-and-collaboration-reach',at:s.clock,outboundProof:interactionProof(calls.at(-1)),inboundProof:interactionProof(inbound.at(-1)),outboundInteraction:calls.at(-1).id,inboundInteraction:inbound.at(-1).id,bookingId:booking.id,booking:{id:booking.id,start:booking.start,end:booking.end,attendees:booking.attendees,event:booking.event,cancelled:booking.cancelled,lastJoin:copy(booking.lastJoin)},meetingConfig:copy(currentMeeting),meetingProof:{success:s.lastMeeting.success,reasons:copy(s.lastMeeting.reasons),fingerprint:s.lastMeeting.fingerprint},join:copy(booking.lastJoin),meetingFingerprint:s.lastMeeting.fingerprint};
 }
 function interactionProof(i){return {id:i.id,direction:i.direction,channel:i.channel,phase:i.phase,outcome:i.outcome,obligations:copy(i.obligations),trace:copy(i.trace),from:i.from,to:i.to,tenant:i.tenant||null};}
 function goalEvidence(s,sourceId,hooks={}){
  if(sourceId===goalId('tr'))return externalReachEvidence(s);
  if(sourceId===goalId('p5'))return productEvidence(s,hooks);
  if(sourceId===goalId('ca'))return localProcessingEvidence(s);
  if(sourceId===goalId('pn'))return carrierEvidence(s);
  if(sourceId===goalId('scrub')){
   const A=securityApi();if(!A||!s.admissionSecurity)return null;try{A.validate(s);const assessment=A.evaluate(s);if(assessment.passed!==true)return null;const settlement=s.admissionSecurity.settlements.filter(x=>x.phase==='resolved'&&['RESOLVED','CONNECTED'].includes(x.outcome)&&!x.obligations.length).at(-1),interaction=s.interactions.find(i=>i.id===settlement?.interactionId);if(!interaction)return null;return {kind:'independent-admission-security-controls',at:s.clock,assessment:copy(assessment),securityFingerprint:A.fingerprint(s),securityPack:copy(s.admissionSecurity),ledger:copy(s.ledger),interactions:copy(s.interactions),interactionProof:interactionProof(interaction),settlement:copy(settlement)};}catch{return null;}
  }
  return null;
 }
 function evaluate(s,hooks={}){
  if(!validRoot(s))return {pack:PACK,version:VERSION,goals:Object.fromEntries(goalIds.map(id=>[id,{sourceId:id,status:'incomplete',evidence:null,blockers:['VALIDATED_CORE_STATE_REQUIRED']}]))};
  const goals={};for(const sourceId of goalIds){let evidence=null;try{evidence=goalEvidence(s,sourceId,hooks);}catch{}goals[sourceId]={sourceId,status:evidence?'ready':'incomplete',evidence:evidence?copy(evidence):null,blockers:evidence?[]:[...blockersFor(s,sourceId)]};}
  return {pack:PACK,version:VERSION,goals};
 }
 function blockersFor(s,sourceId){
  if(sourceId===goalId('tr'))return ['RETAINED_EXTERNAL_INBOUND_VOICE_AND_SUCCESSFUL_GUEST_JOIN_REQUIRED'];
  if(sourceId===goalId('p5'))return ['FIVE_DISTINCT_CURRENT_TESTED_SUPPORTED_INTEGRATIONS_REQUIRED'];
  if(sourceId===goalId('ca'))return ['COMPLETED_LOCAL_RECORDING_PROCESSING_LINEAGE_AND_CONTROL_DEPENDENCIES_REQUIRED'];
  if(sourceId===goalId('pn'))return ['AUTHENTICATED_GATEWAY_AND_BIDIRECTIONAL_ACCEPTANCE_CALLS_REQUIRED'];
  if(sourceId===goalId('scrub'))return ['ALL_ADMISSION_CONTROLS_AND_RECONCILED_REAL_CALL_REQUIRED'];
  return ['UNKNOWN_SOURCE_GOAL'];
 }
 function evidence(s,sourceId,hooks={}){const report=evaluate(s,hooks).goals[sourceId];return report?.evidence?copy(report.evidence):null;}
 function validateEvidence(s,sourceId,proof,hooks={}){
  if(!goalIds.includes(sourceId)||!proof||typeof proof!=='object'||Array.isArray(proof)||!int(proof.at)||proof.at>s.clock)return false;
  const current=goalEvidence(s,sourceId,hooks);if(current&&same(current,proof))return true;
  return archivedShape(sourceId,proof)&&retainedProofMatches(s,sourceId,proof);
 }
 function interactionPruned(s,id){const match=/^interaction-([1-9][0-9]*)$/.exec(id||'');if(!match)return false;const serial=Number(match[1]);if(Number.isSafeInteger(s.tracePrunedThrough))return serial<=s.tracePrunedThrough;const first=/^interaction-([1-9][0-9]*)$/.exec(s.interactions?.[0]?.id||'');return s.interactions?.length===200&&!!first&&serial<Number(first[1]);}
 function retainedProofMatches(s,sourceId,e){
  if(sourceId===goalId('tr')){
   for(const proof of [e.outboundProof,e.inboundProof]){const actual=s.interactions.find(i=>i.id===proof?.id);if(actual?!same(interactionProof(actual),proof):!interactionPruned(s,proof?.id))return false;}
   const booking=s.information?.bookings?.find(x=>x.id===e.bookingId);if(!booking||!same(booking.lastJoin,e.booking?.lastJoin)||booking.cancelled!==e.booking.cancelled)return false;
   return true;
  }
  if(sourceId===goalId('p5')){
   const p=s.products;if(!p)return false;
   return e.integrations.every(proof=>{const edge=p.integrations?.find(x=>x.id===proof.id);if(!edge)return false;const command=s.commands?.find(x=>x.revision===proof.testRevision&&x.command?.type==='products'&&x.command.command?.action==='test-integration'&&x.command.command.id===proof.id),pruned=s.commands?.length===1000&&s.commands[0]?.revision>proof.testRevision;return edge.source===proof.source&&edge.target===proof.target&&same(edge.features,proof.features)&&edge.sourceGeneration===proof.sourceGeneration&&edge.targetGeneration===proof.targetGeneration&&edge.sourceVersion===proof.sourceVersion&&edge.targetVersion===proof.targetVersion&&same(edge.result,proof.result)&&!!command||edge.source===proof.source&&edge.target===proof.target&&same(edge.features,proof.features)&&same(edge.result,proof.result)&&pruned;});
  }
  if(sourceId===goalId('ca')){
   const job=s.information?.jobs?.find(x=>x.id===e.jobId);if(job&&!same(job,e.job))return false;
   const rows=s.records||[];for(const proof of e.recordChain||[]){const actual=rows.find(x=>x.id===proof.id);if(actual&&(!same({id:actual.id,kind:actual.kind,parents:actual.parents,region:actual.region,processRegion:actual.processRegion,deleted:actual.deleted},proof)))return false;}
   return !!job;
  }
  if(sourceId===goalId('pn')){
   for(const proof of e.interactions||[]){const actual=s.interactions.find(i=>i.id===proof.id);if(actual?(actual.direction!==proof.direction||actual.phase!==proof.phase||actual.outcome!==proof.outcome||!same(actual.obligations,proof.obligations)||!same(actual.trace,proof.trace)):!interactionPruned(s,proof.id))return false;}
   return true;
  }
  if(sourceId===goalId('scrub')){
   const pack=s.admissionSecurity,settlement=pack?.settlements?.find(x=>x.interactionId===e.settlement?.interactionId),admission=pack?.admissions?.find(x=>x.interactionId===e.settlement?.interactionId);
   if(!pack||!settlement||!same(settlement,e.settlement)||!admission||!same(admission,e.securityPack.admissions?.find(x=>x.interactionId===admission.interactionId)))return false;
   const actual=s.interactions.find(i=>i.id===settlement.interactionId);
   return actual?same(interactionProof(actual),e.interactionProof):interactionPruned(s,settlement.interactionId);
  }
  return false;
 }
 function archivedShape(sourceId,e){
  if(sourceId===goalId('p5'))return validProductProof(e);
  if(sourceId===goalId('ca'))return validProcessingProof(e);
  if(sourceId===goalId('pn'))return validCarrierProof(e);
  if(sourceId===goalId('tr'))return validReachProof(e);
  if(sourceId===goalId('scrub')){
   const A=securityApi();if(e.kind!=='independent-admission-security-controls'||e.assessment?.passed!==true||e.assessment?.allowedVoiceResolved!==true||typeof e.securityFingerprint!=='string'||!e.securityPack||!e.settlement||!Array.isArray(e.interactions))return false;
   try{const root={clock:e.at,admissionSecurity:copy(e.securityPack),ledger:copy(e.ledger),interactions:copy(e.interactions)};A.validate(root);const saved=root.interactions.find(i=>i.id===e.settlement.interactionId);return !!saved&&same(interactionProof(saved),e.interactionProof)&&same(A.evaluate(root),e.assessment)&&same(A.fingerprint(root),e.securityFingerprint);}catch{return false;}
  }
  return false;
 }
 function validProductProof(e){
  if(e.kind!=='five-current-supported-integrations'||!Array.isArray(e.integrations)||e.integrations.length!==5||new Set(e.integrations.map(x=>x.id)).size!==5||new Set(e.integrations.map(x=>x.target)).size!==5)return false;
  return e.integrations.every(x=>{const c=x.supportContract;return typeof x.id==='string'&&typeof x.source==='string'&&typeof x.target==='string'&&x.result?.status==='scenario-verified'&&x.result.synthetic===true&&x.result.externalSupportClaim===false&&x.result.sourceGeneration===x.sourceGeneration&&x.result.targetGeneration===x.targetGeneration&&x.result.sourceVersion===x.sourceVersion&&x.result.targetVersion===x.targetVersion&&Array.isArray(x.features)&&x.features.length>0&&Array.isArray(x.sourceBindings)&&Array.isArray(x.targetBindings)&&x.features.every(f=>x.sourceBindings.some(b=>b.feature===f.sourceFeature&&Array.isArray(b.resources)&&b.resources.length>0)&&x.targetBindings.some(b=>b.feature===f.targetFeature&&Array.isArray(b.resources)&&b.resources.length>0))&&c?.status==='active'&&c.customer==='customer'&&c.sell===true&&typeof c.supportOwner==='string'&&['msp','integrator'].some(r=>c.ownerRoles?.includes(r))&&Array.isArray(c.resources)&&c.resources.some(r=>[...x.sourceBindings,...x.targetBindings].some(b=>b.resources.includes(r)));});
 }
 function validProcessingProof(e){
  const chain=e.recordChain,steps=e.job?.plan?.steps;
  return e.kind==='completed-local-speech-processing'&&typeof e.connected==='boolean'&&int(e.processorGeneration)&&e.processorGeneration>0&&int(e.archiveGeneration)&&e.archiveGeneration>0&&int(e.localGeneration)&&e.localGeneration>0&&typeof e.jobId==='string'&&typeof e.recordingId==='string'&&typeof e.outputId==='string'&&e.job?.status==='complete'&&e.job.source===e.recordingId&&e.job.parent===e.outputId&&Array.isArray(steps)&&steps.length>0&&Array.isArray(chain)&&chain.length===steps.length+1&&chain[0]?.id===e.recordingId&&chain[0]?.kind==='recording'&&!chain[0].deleted&&chain.slice(1).every((r,i)=>r.kind===steps[i]&&!r.deleted&&r.parents?.length===1&&r.parents[0]===chain[i].id&&r.region===e.jurisdiction&&r.processRegion===e.jurisdiction)&&chain.at(-1)?.id===e.outputId&&chain.at(-1)?.kind==='index'&&e.pipeline?.processor===e.processor&&e.pipeline?.archive===e.archive&&e.processorConfig?.local===true&&e.processorConfig?.licenceLocal===true&&e.processorConfig?.region===e.jurisdiction&&e.archiveConfig?.region===e.jurisdiction&&e.informationBoundary?.processRegions?.includes(e.jurisdiction)&&e.informationBoundary?.storageRegions?.includes(e.jurisdiction)&&e.localConfig?.identity===true&&e.localConfig?.dns===true&&e.localConfig?.time===true&&e.localConfig?.certificates===true&&e.localConfig?.licensing===true&&Array.isArray(e.boundaryEvidence)&&e.boundaryEvidence.every(x=>x.evaluation?.eligible===true&&x.evaluation.legalApprovalClaim===false);
 }
 function validCarrierCall(x){return x?.phase==='resolved'&&['CONNECTED','RESOLVED'].includes(x.outcome)&&x.obligations?.length===0&&x.trace?.some(t=>t.code==='CARRIER_MODEL_SELECTED'&&t.model==='gateway')&&x.trace.some(t=>t.code==='INVITE')&&x.trace.some(t=>t.code==='200_OK')&&x.trace.some(t=>t.code==='MEDIA_PATHS'&&t.out===true&&t.in===true);}
 function validCarrierProof(e){return e.kind==='dedicated-gateway-bidirectional-acceptance'&&e.carrier?.mode==='gateway'&&['sbcCertified','tlsTrusted','hostnameValid','peerAuthenticated'].every(k=>e.carrier[k]===true)&&e.trunk?.enabled===true&&e.trunk?.signalling===true&&e.trunk?.mediaOut===true&&e.trunk?.mediaIn===true&&Array.isArray(e.interactions)&&e.interactions.some(x=>x.direction==='inbound'&&validCarrierCall(x))&&e.interactions.some(x=>x.direction==='outbound'&&validCarrierCall(x));}
 function validReachProof(e){
  const outbound=e.outboundProof,inbound=e.inboundProof,b=e.booking;
  return e.kind==='external-calling-and-collaboration-reach'&&typeof e.outboundInteraction==='string'&&typeof e.inboundInteraction==='string'&&e.outboundInteraction!==e.inboundInteraction&&typeof e.bookingId==='string'&&outbound?.id===e.outboundInteraction&&inbound?.id===e.inboundInteraction&&outbound.direction==='outbound'&&inbound.direction==='inbound'&&/^\+[1-9]\d{5,14}$/.test(outbound.to||'')&&/^\+[1-9]\d{5,14}$/.test(inbound.from||'')&&/^\+[1-9]\d{5,14}$/.test(inbound.to||'')&&inbound.trace?.some(t=>t.code==='INBOUND_NUMBER_ACCEPTED'&&t.number===inbound.to&&t.holder)&&inbound.trace?.some(t=>t.code==='ORDERED_INBOUND_ROUTE'&&t.normalised===inbound.to&&t.target)&&inbound.trace?.some(t=>t.code==='INBOUND_PERMISSION_ACCEPTED'&&t.holder)&&inbound.trace?.some(t=>t.code==='CARRIER_MODEL_SELECTED'&&t.direction==='inbound')&&outbound.trace?.some(t=>t.code==='ORDERED_ROUTE')&&successfulProof(outbound)&&successfulProof(inbound)&&b?.id===e.bookingId&&!b.cancelled&&int(b.attendees)&&b.attendees>=2&&b.lastJoin?.success===true&&b.lastJoin.fingerprint===e.meetingFingerprint&&e.join?.success===true&&e.join.fingerprint===e.meetingFingerprint&&e.meetingProof?.success===true&&e.meetingProof.fingerprint===e.meetingFingerprint&&e.meetingConfig?.guestJoin===true;
 }
 function successfulProof(i){return i?.channel==='voice'&&i.phase==='resolved'&&['CONNECTED','RESOLVED'].includes(i.outcome)&&Array.isArray(i.obligations)&&i.obligations.length===0&&i.trace?.some(t=>t.code==='INVITE')&&i.trace?.some(t=>t.code==='200_OK')&&i.trace?.some(t=>t.code==='MEDIA_PATHS'&&t.out===true&&t.in===true);}
 function validate(s){if(!validRoot(s))fail('CALLING_ACHIEVEMENTS_CORE_STATE_REQUIRED');if(s.clock<0)fail('INVALID_CALLING_ACHIEVEMENTS_ROOT');for(const sourceId of goalIds){const e=goalEvidence(s,sourceId,{});if(e&&(!int(e.at)||e.at>s.clock))fail('INVALID_CALLING_ACHIEVEMENT_EVIDENCE');}return true;}
 function fingerprint(s){if(!validRoot(s))return null;return JSON.stringify([s.scenario,s.jurisdiction,s.clock,s.calling?{nodes:s.calling.nodes}:null,s.operations?{carrier:s.operations.carrier,integration:s.operations.integration}:null,s.information?{pipeline:s.information.pipeline,meeting:s.information.meeting,boundary:s.information.boundary,jobs:s.information.jobs}:null,s.products?{deployments:s.products.deployments,integrations:s.products.integrations}:null,s.admissionSecurity?securityApi()?.fingerprint(s):null]);}
 function create(s){if(!validRoot(s))fail('CALLING_ACHIEVEMENTS_CORE_STATE_REQUIRED');return {pack:PACK,version:VERSION,sourceIds:[...sourceIds],createdAt:s.clock};}
 function validatePack(s,p){if(!validRoot(s)||!p||p.pack!==PACK||p.version!==VERSION||!same(p.sourceIds,sourceIds)||!int(p.createdAt)||p.createdAt>s.clock)fail('INVALID_CALLING_ACHIEVEMENTS_PACK');return true;}
 const source=()=>`const SOC_CALLING_ACHIEVEMENTS=(${socCallingAchievementsKernel.toString()})();`;
 return {PACK,VERSION,goalIds,sourceIds,create,evaluate,evidence,goalEvidence,validateEvidence,validate,validatePack,fingerprint,source};
}
const SOC_CALLING_ACHIEVEMENTS=socCallingAchievementsKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_CALLING_ACHIEVEMENTS;
