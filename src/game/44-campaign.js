/* Persistent, synthetic four-track campaign assessment. */
function socCampaignKernel(){
 'use strict';
 const PACK='soc-campaign-1',VERSION=1,CONTENT='soc-campaign-content-1';
 const copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=code=>{throw new Error(code);},id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x),integer=(x,min=0,max=1000000)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const jurisdictions=['AU','US','JP','EU'];
 const trackIds=['smb','enterprise','government','defence'];
 const tracks={
  smb:{sequence:1,predecessor:null,reward:1,resources:['identity','phone','carrier','people','service','engage','messages','cases'],windows:{baseline:1,service:5,recovery:8,economics:60},incident:{kind:'fault',resource:'carrier',fault:'OUTAGE',recover:null}},
  enterprise:{sequence:2,predecessor:'smb',reward:2,resources:['identity','phone','carrier','desk','room','recorder','archive','people','service'],windows:{baseline:1,service:10,recovery:8,economics:60},incident:{kind:'fault',resource:'phone',fault:'OUTAGE',recover:null}},
  government:{sequence:3,predecessor:'enterprise',reward:3,resources:['identity','phone','carrier','desk','people','service','recorder','archive','speech'],windows:{baseline:1,service:10,recovery:8,economics:60},incident:{kind:'fault',resource:'speech',fault:'OUTAGE',recover:null}},
  defence:{sequence:4,predecessor:'government',reward:4,resources:['identity','phone','carrier','desk','people','service','local','recorder','archive'],windows:{baseline:1,service:5,recovery:8,economics:60},incident:{kind:'connect',fault:false,recover:true}}
 };
 const windowKinds=['baseline','service','recovery','economics'],modes=['guided','assessed','sandbox'];
 function packOf(s){const p=s?.campaign;if(!p||p.pack!==PACK)fail('CAMPAIGN_NOT_STARTED');return p;}
 function create(s){
  if(!s||s.scenario!=='smb'||!jurisdictions.includes(s.jurisdiction)||!modes.includes(s.mode))fail('INVALID_CAMPAIGN_PROFILE');
  if(s.business&&s.business.pack!=='soc-business-1')fail('INVALID_CAMPAIGN_BUSINESS_STATE');
  const campaignId=`campaign-${s.seed||1}-${s.clock||0}`;
  const progress={};for(const track of trackIds)progress[track]={status:track==='smb'?'active':s.mode==='sandbox'?'available':'locked',windows:[],incidents:[],award:null};
  return {pack:PACK,version:VERSION,contentVersion:CONTENT,id:campaignId,startedAt:s.clock||0,jurisdiction:s.jurisdiction,mode:s.mode,selectedTrack:s.scenario,progress,snapshots:{},awards:[],journal:[],nextId:1};
 }
 function configGenerationMap(s,track){return Object.fromEntries(tracks[track].resources.map(key=>{const r=s.resources?.[key];return [key,{generation:r?.generation||0,desired:copy(r?.desired??null),effective:copy(r?.effective??null)}];}));}
 function currentGenerationMap(s,track){return configGenerationMap(s,track);}
 function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
 function configNodes(value,path='',out={}){
  if(!value||typeof value!=='object')return out;
  if(Array.isArray(value)){for(let i=0;i<value.length;i++)configNodes(value[i],`${path}[${i}]`,out);return out;}
  if(own(value,'generation')&&own(value,'desired')&&own(value,'effective')){out[path]={generation:value.generation,desired:copy(value.desired),effective:copy(value.effective)};return out;}
  for(const [key,child] of Object.entries(value))configNodes(child,path?`${path}.${key}`:key,out);
  return out;
 }
 function configurationFingerprint(s,hooks={}){
  if(typeof hooks.configurationFingerprint==='function'){
   const supplied=hooks.configurationFingerprint(s);
   if(typeof supplied==='string'&&supplied.length<=100000)return supplied;
   const serialized=JSON.stringify(supplied);if(!serialized||serialized.length>100000)fail('CAMPAIGN_CONFIGURATION_FINGERPRINT_INVALID');return serialized;
  }
  const resources=Object.fromEntries(Object.entries(s.resources||{}).map(([key,r])=>[key,{generation:r.generation,desired:copy(r.desired),effective:copy(r.effective)}]));
  const packs={};for(const key of ['operations','information','contact','estate','workforceOps','calling','products','channels','outcomes','transport','boundaries'])if(s[key])packs[key]=configNodes(s[key]);
  const serialized=JSON.stringify({resources,packs});if(serialized.length>100000)fail('CAMPAIGN_CONFIGURATION_FINGERPRINT_INVALID');return serialized;
 }
 function append(p,kind,details={}){
  if(p.journal.length>=4000)fail('CAMPAIGN_JOURNAL_CAPACITY');
  const row={id:`campaign-event-${p.nextId++}`,at:details.at??0,kind,...copy(details)};p.journal.push(row);return row;
 }
 function adoptRoot(s,next){
  if(!next||typeof next!=='object'||Array.isArray(next)||next===s)fail('CAMPAIGN_PARENT_HOOK_FAILED');
  const campaign=s.campaign;
  for(const key of Object.keys(s))delete s[key];
  Object.assign(s,copy(next));s.campaign=campaign;
 }
 function makeSnapshot(s,track){const root=copy(s);delete root.campaign;delete root.progression;delete root.portfolio;delete root.marketQualification;delete root.managedOperations;return {track,capturedAt:s.clock,scenario:s.scenario,jurisdiction:s.jurisdiction,mode:s.mode,root};}
 function invokeRoot(s,command,hooks){
  if(typeof hooks.dispatchRootCommand!=='function')fail('CAMPAIGN_VALIDATED_DISPATCH_REQUIRED');
  const p=s.campaign,oldRevision=s.revision,next=hooks.dispatchRootCommand(s,copy(command));
  if(!next||!Array.isArray(next.commands)||!integer(next.revision)||next.revision<=oldRevision)fail('CAMPAIGN_PARENT_COMMAND_NOT_RECORDED');
  const last=next.commands.at(-1)?.command;if(!same(last,command))fail('CAMPAIGN_PARENT_COMMAND_MISMATCH');
  adoptRoot(s,next);s.campaign=p;
 }
 function caseBound(s,i){
  const c=s.cases?.[i.caseId];
  return !!c&&c.interactions?.includes(i.id)&&(!i.tenant||!c.tenant||c.tenant===i.tenant)&&(!c.identity||c.identity===i.from);
 }
 function successful(i){return i?.phase==='resolved'&&!i.obligations?.length&&(!i.needId||i.needOutcome?.outcome==='resolved');}
 function migrationProof(s,windowStart=s.clock){
  for(const entry of (s.commands||[]).filter(x=>x.at<=windowStart).slice().reverse()){
   const c=entry.command;if(c?.type==='migrate'&&Array.isArray(c.identities)&&c.identities.length&&s.resources[c.target]&&['uc','dedicated'].includes(s.resources[c.target].kind)){
    const endpoints=Object.values(s.resources).filter(r=>r.kind==='endpoint'&&c.identities.includes(r.desired.identity));
    const targetScope=s.resources[c.target].effective?.extensionScope;
    if(endpoints.length&&endpoints.every(r=>r.effective?.scope===targetScope&&r.desired.scope===targetScope))return {kind:'core-migrate',revision:entry.revision,at:entry.at,target:c.target,identities:[...c.identities],endpointIds:endpoints.map(r=>r.id)};
   }
   if(c?.type==='operations'&&c.command?.action==='migration'){
    const m=s.operations?.migrations?.find(x=>x.status==='complete'&&x.target===c.command.target&&same(x.identities,c.command.identities));
    if(m)return {kind:'operations-migration',revision:entry.revision,at:entry.at,target:m.target,identities:[...m.identities],migrationId:m.id};
   }
  }
  return null;
 }
 function resourceState(s,key,hooks){
  const r=s.resources?.[key];if(!r)return {ready:false,reasons:['MISSING_RESOURCE']};
  if(typeof hooks.observeResource==='function'){
   const observed=hooks.observeResource(s,key);
   if(!observed||typeof observed.ready!=='boolean')return {ready:false,reasons:['OBSERVATION_UNAVAILABLE']};
   return observed;
  }
  const reasons=[];if(!r.effective)reasons.push('NOT_PROVISIONED');if(r.fault)reasons.push(r.fault);if(r.effective?.enabled===false)reasons.push('DISABLED');
  if(!s.connected&&!r.effective?.local)reasons.push('EXTERNAL_DEPENDENCY');
  return {ready:reasons.length===0,reasons};
 }
 function regionChecks(s,track){
  const bad=[];
  if(track==='government')for(const key of ['identity','phone','carrier','recorder','archive','speech'])if(s.resources?.[key]?.effective?.region!==s.jurisdiction)bad.push(`REGION:${key}`);
  if(track==='defence')for(const key of ['identity','phone','carrier','local','recorder','archive'])if(s.resources?.[key]?.effective?.local!==true)bad.push(`NOT_LOCAL:${key}`);
  return bad;
 }
 function distinctConfig(s,track){
  const r=s.resources||{},p=r.people?.effective,q=r.service?.effective,errors=[];
  if(track==='smb'){
   if(!p||p.people<1||p.entitlements<1)errors.push('STAFFING_OR_ENTITLEMENT');
   if(!p||!q||!p.skills.includes(q.skill)||!p.languages.includes(q.language))errors.push('QUEUE_SKILL_OR_LANGUAGE');
   if(!r.messages?.effective?.approved)errors.push('DIGITAL_SENDER_NOT_APPROVED');
  }else if(track==='enterprise'){
   if(r.room?.effective?.calendar!==true)errors.push('ROOM_CALENDAR');
   if(!r.recorder?.effective?.consent||!r.recorder?.effective?.identityMapping)errors.push('RECORDING_IDENTITY_MAPPING');
   if(!r.archive?.effective||r.archive.effective.retentionDays<30||!r.archive.effective.access?.includes('supervisor'))errors.push('RECORD_RETENTION_OR_ACCESS');
  }else if(track==='government'){
   const boundary=s.information?.boundary?.effective;
   if(!boundary)errors.push('INFORMATION_BOUNDARY_NOT_PROVISIONED');
   else if(!boundary.processRegions?.includes(s.jurisdiction)||!boundary.storageRegions?.includes(s.jurisdiction))errors.push('INFORMATION_OUTSIDE_JURISDICTION');
   if(r.speech?.effective?.region!==s.jurisdiction)errors.push('PROCESSOR_OUTSIDE_JURISDICTION');
  }else if(track==='defence'){
   const l=r.local?.effective;
   if(!l||!['identity','dns','time','certificates','licensing'].every(k=>l[k]))errors.push('LOCAL_SUPPORT_STACK_INCOMPLETE');
   if(!r.phone?.effective?.local||!r.identity?.effective?.local||!r.carrier?.effective?.local)errors.push('EXTERNAL_CONTROL_DEPENDENCY');
  }
  return errors;
 }
 function baselineChecks(s,track,hooks){
  const errors=[];for(const key of tracks[track].resources){if(!resourceState(s,key,hooks).ready)errors.push(`SERVICE_UNAVAILABLE:${key}`);}
  errors.push(...regionChecks(s,track),...distinctConfig(s,track));
  return errors;
 }
 function taskChecks(s,track,window,hooks){
  const interactions=(s.interactions||[]).filter(i=>i.startedAt>=window.startedAt&&i.startedAt<=window.dueAt&&!window.preexistingInteractions.includes(i.id));
  const resolved=interactions.filter(successful),errors=[];
  if(track==='smb'){
   if(!resolved.some(i=>caseBound(s,i)))errors.push('RESOLVED_CASE_CONTEXT_REQUIRED');
   if(resolved.some(i=>i.channel==='voice')&&!resourceState(s,'desk',hooks).ready)errors.push('VOICE_ENDPOINT_UNAVAILABLE');
  }else if(track==='enterprise'){
   const calls=resolved.filter(i=>i.channel==='voice');
   const callers=new Set(calls.map(i=>i.from));
   if(!callers.has('alex')||!callers.has('bea'))errors.push('BOTH_CALLER_DIRECTIONS_REQUIRED');
   if(!window.migrationProof)errors.push('MIGRATION_ACCEPTANCE_REQUIRED');
   if(!s.lastMeeting?.success||s.lastMeeting.at<window.startedAt)errors.push('MEETING_ACCEPTANCE_REQUIRED');
   if(!resolved.some(i=>i.records?.some(id=>s.records?.some(r=>r.id===id&&r.kind==='recording'&&!r.deleted))))errors.push('RETAINED_RECORDING_REQUIRED');
  }else if(track==='government'){
   if(!resolved.length)errors.push('RESOLVED_PUBLIC_SERVICE_TASK_REQUIRED');
   const records=(s.records||[]).filter(r=>resolved.some(i=>i.id===r.interaction||i.records?.includes(r.id))&&!r.deleted);
   if(!records.some(r=>r.kind==='transcription'||r.kind==='transcript'))errors.push('RETAINED_PROCESSING_OUTPUT_REQUIRED');
   if(records.some(r=>r.region!==s.jurisdiction||r.captureRegion&&r.captureRegion!==s.jurisdiction))errors.push('RECORD_OUTSIDE_JURISDICTION');
  }else if(track==='defence'){
   if(s.connected!==false)errors.push('DISCONNECTION_NOT_ACTIVE');
   if(!resolved.some(i=>i.channel==='voice'&&caseBound(s,i)))errors.push('LOCAL_DISCONNECTED_JOURNEY_REQUIRED');
   if(regionChecks(s,track).length)errors.push(...regionChecks(s,track));
  }
  return errors;
 }
 function recoveryChecks(s,track,window,hooks){
  const p=s.campaign,rec=p.progress[track],incident=rec.incidents.at(-1),errors=[];
  if(!incident||!incident.recoveredAt||incident.at>=incident.recoveredAt||incident.recoveredAt<window.startedAt||incident.recoveredAt>window.dueAt)errors.push('INJECTED_FAILURE_AND_RECOVERY_REQUIRED');
  if(track==='defence'){
   if(s.connected!==true)errors.push('RECONNECTION_REQUIRED');
  }else if(!resourceState(s,tracks[track].incident.resource,hooks).ready)errors.push('AFFECTED_SERVICE_NOT_RECOVERED');
  const after=(s.interactions||[]).filter(i=>i.startedAt>=incident?.recoveredAt&&i.startedAt<=window.dueAt&&successful(i));
  if(!after.length)errors.push('POST_RECOVERY_JOURNEY_REQUIRED');
  if(track==='defence'&&!((s.interactions||[]).some(i=>i.startedAt<incident.recoveredAt&&successful(i)&&caseBound(s,i))))errors.push('OFFLINE_CASE_LINEAGE_NOT_RETAINED');
  if(!Number.isInteger(incident?.recoveredCommandIndex)||incident.recoveredCommandIndex<0)errors.push('RECOVERY_COMMAND_LINEAGE_INVALID');
  return errors;
 }
 function economicsChecks(s,track,window){
  const b=s.business,errors=[];if(!b){return ['BUSINESS_CAMPAIGN_REQUIRED'];}
  const eligible=(b.contracts||[]).filter(c=>c.status==='active'&&c.sell&&c.customer==='customer'&&c.supportOwner&&b.organisations?.[c.supportOwner]?.roles?.some(r=>['msp','integrator','bpo'].includes(r))&&c.billedPeriods>0);
  const entries=(b.ledger||[]).filter(x=>!window.preexistingLedgerIds.includes(x.id));
  const contract=eligible.find(c=>entries.some(x=>x.contract===c.id&&x.category==='revenue'&&x.cents>0)&&entries.some(x=>x.contract===c.id&&x.category==='cost'&&x.cents>0));
  if(!contract)errors.push('SUPPORTED_BILLED_CONTRACT_REQUIRED');
  if(!b.metrics||b.metrics.periods<=window.preexistingBusinessPeriods)errors.push('BILLING_PERIOD_NOT_OBSERVED');
  if(b.balance?.cash<0)errors.push('CUSTOMER_CASH_NEGATIVE');
  if(track==='government'&&(b.qualifications?.[b.player]?.government||0)<=s.clock||track==='defence'&&(b.qualifications?.[b.player]?.defence||0)<=s.clock)errors.push('TRACK_QUALIFICATION_REQUIRED');
  return errors;
 }
 function checksFor(s,track,window,hooks){
  if(window.kind==='baseline')return baselineChecks(s,track,hooks);
  if(window.kind==='service')return taskChecks(s,track,window,hooks);
  if(window.kind==='recovery')return recoveryChecks(s,track,window,hooks);
  return economicsChecks(s,track,window);
 }
 function evidenceSnapshot(s,window,current){
  const commands=(s.commands||[]).filter(x=>x.at>=window.startedAt&&x.at<=window.dueAt&&!window.preexistingCommandRevisions.includes(x.revision)).slice(-10).map(x=>({at:x.at,revision:x.revision,type:x.command?.type,id:x.command?.id||null,fault:x.command?.fault??null,connected:x.command?.connected??null}));
  const interactions=(s.interactions||[]).filter(i=>i.startedAt>=window.startedAt&&i.startedAt<=window.dueAt&&!window.preexistingInteractions.includes(i.id)).slice(-10).map(i=>({id:i.id,channel:i.channel,from:i.from,to:i.to,caseId:i.caseId,phase:i.phase,outcome:i.outcome||null,context:!!i.context,obligations:copy(i.obligations||[]),needOutcome:copy(i.needOutcome||null)}));
  const records=(s.records||[]).filter(r=>!window.preexistingRecordIds.includes(r.id)).slice(-10).map(r=>({id:r.id,kind:r.kind,region:r.region,processRegion:r.processRegion||null,deleted:!!r.deleted,held:!!r.held}));
  const ledger=(s.business?.ledger||[]).filter(x=>!window.preexistingLedgerIds.includes(x.id)).slice(-10).map(x=>({id:x.id,contract:x.contract||null,category:x.category,cents:x.cents,unit:x.unit||null,usageUnit:x.usageUnit||null,quantity:x.quantity||null,usage:x.usage??null}));
  return {rootRevision:s.revision,configurationGenerations:copy(current),configurationFingerprint:window.configurationFingerprint,migrationProof:copy(window.migrationProof),commandCount:s.commands?.length||0,interactionCount:s.interactions?.length||0,recordCount:s.records?.length||0,ledgerCount:s.business?.ledger?.length||0,traces:{commands,interactions,records,ledger}};
 }
 function closeWindow(s,track,window,hooks){
  if(window.status!=='open'||s.clock<window.dueAt)return false;
  const current=currentGenerationMap(s,track),errors=[...window.stickyErrors];
  if(configurationFingerprint(s,hooks)!==window.configurationFingerprint)errors.push('PACK_CONFIGURATION_CHANGED');
  if(window.lastSampleAt<window.dueAt)errors.push('OBSERVATION_WINDOW_INCOMPLETE');
  if(!errors.length)errors.push(...checksFor(s,track,window,hooks));
  window.closedAt=s.clock;window.status=errors.length?'failed':'passed';window.errors=[...new Set(errors)];
  window.evidence=evidenceSnapshot(s,window,current);
  append(s.campaign,'window-closed',{at:s.clock,track,window:window.kind,status:window.status,errors:copy(window.errors)});
  return true;
 }
 function sampleWindow(s,track,window,hooks){
  if(window.status!=='open'||s.clock<=window.lastSampleAt)return;
  if(s.clock>window.lastSampleAt+1)window.stickyErrors.push('OBSERVATION_SAMPLE_GAP');
  const current=currentGenerationMap(s,track),changed=Object.keys(window.generations).filter(k=>!same(window.generations[k],current[k]));
  if(configurationFingerprint(s,hooks)!==window.configurationFingerprint)window.stickyErrors.push('PACK_CONFIGURATION_CHANGED');
  for(const key of changed)window.stickyErrors.push(`CONFIGURATION_CHANGED:${key}`);
  const services=Object.fromEntries(tracks[track].resources.map(key=>[key,!!resourceState(s,key,hooks).ready]));
  const incident=tracks[track].incident,expectedFault=track==='defence'?s.connected===false:s.resources?.[incident.resource]?.fault===incident.fault;
  for(const [key,ready] of Object.entries(services))if(!ready&&!(window.kind==='recovery'&&expectedFault&&key===incident.resource))window.stickyErrors.push(`WINDOW_SERVICE_INTERRUPTION:${key}`);
  window.stickyErrors=[...new Set(window.stickyErrors)];
  if(window.samples.length<60)window.samples.push({at:s.clock,connected:s.connected,services,faults:Object.fromEntries(tracks[track].resources.map(key=>[key,s.resources?.[key]?.fault||null])),generations:copy(current)});
  const seen=(target,values)=>{for(const value of values)if(!target.includes(value))target.push(value);};
  seen(window.seenInteractions,(s.interactions||[]).filter(i=>i.startedAt>=window.startedAt&&!window.preexistingInteractions.includes(i.id)).map(i=>i.id));
  seen(window.seenRecords,(s.records||[]).filter(r=>r.createdAt>=window.startedAt&&!window.preexistingRecordIds.includes(r.id)).map(r=>r.id));
  seen(window.seenLedger,(s.business?.ledger||[]).filter(x=>x.at>=window.startedAt&&!window.preexistingLedgerIds.includes(x.id)).map(x=>x.id));
  seen(window.seenCommands,(s.commands||[]).filter(x=>x.at>=window.startedAt&&!window.preexistingCommandRevisions.includes(x.revision)).map(x=>x.revision));
  if(window.seenInteractions.some(x=>!(s.interactions||[]).some(i=>i.id===x)))window.stickyErrors.push('INTERACTION_HISTORY_TRUNCATED');
  if(window.seenRecords.some(x=>!(s.records||[]).some(r=>r.id===x)))window.stickyErrors.push('RECORD_HISTORY_TRUNCATED');
  if(window.seenLedger.some(x=>!(s.business?.ledger||[]).some(r=>r.id===x)))window.stickyErrors.push('LEDGER_HISTORY_TRUNCATED');
  if(window.seenCommands.some(x=>!(s.commands||[]).some(r=>r.revision===x)))window.stickyErrors.push('COMMAND_HISTORY_TRUNCATED');
  for(const [arr,max,code] of [[window.seenInteractions,200,'INTERACTION_EVIDENCE_CAPACITY'],[window.seenRecords,500,'RECORD_EVIDENCE_CAPACITY'],[window.seenLedger,1000,'LEDGER_EVIDENCE_CAPACITY'],[window.seenCommands,1000,'COMMAND_EVIDENCE_CAPACITY']])if(arr.length>max){arr.splice(0,arr.length-max);window.stickyErrors.push(code);}
  window.stickyErrors=[...new Set(window.stickyErrors)];
  window.lastSampleAt=s.clock;
 }
 function evidenceStatus(s,track,kind,hooks={}){
  const entries=s.campaign.progress[track].windows.filter(w=>w.kind===kind&&w.status==='passed');
  for(const w of entries.slice().reverse())if(s.campaign.selectedTrack!==track||same(w.generations,currentGenerationMap(s,track))&&w.configurationFingerprint===configurationFingerprint(s,hooks))return {passed:true,windowId:w.id,errors:[]};
  return {passed:false,windowId:null,errors:entries.length?['EVIDENCE_STALE']:['WINDOW_NOT_PASSED']};
 }
 function progressAssessment(s,track,hooks={}){
  const checks={};for(const kind of windowKinds)checks[kind]=evidenceStatus(s,track,kind,hooks);
  const errors=Object.entries(checks).filter(([,x])=>!x.passed).flatMap(([k,x])=>x.errors.map(e=>`${k.toUpperCase()}:${e}`));
  const currentErrors=baselineChecks(s,track,hooks),allErrors=[...errors,...currentErrors.map(x=>`CURRENT_SERVICE:${x}`)];
  return {track,passed:allErrors.length===0,mode:s.campaign.mode,checks,errors:allErrors,currentReadiness:currentErrors.length===0,currentErrors,award:copy(s.campaign.progress[track].award)};
 }
 function assess(s,track,hooks={}){
  const report=progressAssessment(s,track,hooks),current=s.campaign.progress[track];
  const errors=report.errors;
  if(!errors.length&&report.currentReadiness&&s.campaign.mode!=='sandbox'&&!current.award){
   const key=`${s.campaign.id}:${track}:${s.campaign.contentVersion}`;
   if(s.campaign.awards.some(x=>x.key===key))fail('CAMPAIGN_AWARD_CONFLICT');
   const award={key,campaignId:s.campaign.id,track,contentVersion:s.campaign.contentVersion,unit:'training-credit',amount:tracks[track].reward,at:s.clock,evidenceIds:windowKinds.map(k=>report.checks[k].windowId)};
   s.campaign.awards.push(award);current.award=copy(award);current.status='complete';append(s.campaign,'track-awarded',{at:s.clock,track,key,unit:award.unit,amount:award.amount});
   const next=trackIds[tracks[track].sequence];if(next)s.campaign.progress[next].status='available';
  }
  return {...report,passed:errors.length===0&&report.currentReadiness,award:copy(current.award)};
 }
 function selectTrack(s,c,hooks){
  const p=s.campaign,track=c.track;if(!trackIds.includes(track))fail('UNKNOWN_CAMPAIGN_TRACK');
  const r=p.progress[track];if(track===p.selectedTrack)return {track,selected:true,alreadySelected:true};if(trackIds.some(t=>p.progress[t].windows.some(w=>w.status==='open')))fail('CAMPAIGN_WINDOW_OPEN');if(r.status==='locked')fail('CAMPAIGN_TRACK_LOCKED');if(p.mode!=='sandbox'&&tracks[track].predecessor&&!p.progress[tracks[track].predecessor]?.award)fail('CAMPAIGN_TRACK_LOCKED');
  if(typeof hooks.selectTrack!=='function')fail('CAMPAIGN_TRACK_SWITCH_HOOK_REQUIRED');
  const previous=p.selectedTrack;p.snapshots[previous]=makeSnapshot(s,previous);
  const next=hooks.selectTrack(s,track,{campaignId:p.id,contentVersion:p.contentVersion,preserveJournal:true,preserveEvidence:true,snapshots:copy(p.snapshots),targetSnapshot:copy(p.snapshots[track]||null)});
  if(!next||next.scenario!==track||next.jurisdiction!==p.jurisdiction||next.mode!==p.mode||!integer(next.clock))fail('CAMPAIGN_TRACK_SWITCH_REJECTED');
  adoptRoot(s,next);s.campaign=p;
  if(previous!==track&&p.progress[previous].status==='active')p.progress[previous].status='available';
  p.selectedTrack=track;if(r.status!=='complete')r.status='active';
  append(p,'track-selected',{at:s.clock,track,scenario:track,jurisdiction:p.jurisdiction});return {track,selected:true,preserveJournal:true};
 }
 function incidentCommand(s,track,recovery){
  const i=tracks[track].incident;
  return i.kind==='fault'?{type:'fault',id:i.resource,fault:recovery?i.recover:i.fault}:{type:'connect',connected:recovery?i.recover:i.fault};
 }
 function injectIncident(s,hooks){
  const p=s.campaign,track=p.selectedTrack,rec=p.progress[track];
  if(rec.status!=='active')fail('CAMPAIGN_TRACK_NOT_ACTIVE');
  const expectedWindow=track==='defence'?'service':'recovery';if(!rec.windows.some(w=>w.kind===expectedWindow&&w.status==='open')&&!rec.windows.some(w=>w.kind==='recovery'&&w.status==='open'))fail('CAMPAIGN_INCIDENT_WINDOW_REQUIRED');
  if(rec.incidents.some(i=>!i.recoveredAt))fail('CAMPAIGN_INCIDENT_ACTIVE');
  const def=tracks[track].incident,alreadyActive=def.kind==='fault'?s.resources[def.resource]?.fault===def.fault:s.connected===false;
  if(alreadyActive)fail('CAMPAIGN_INCIDENT_ALREADY_PRESENT');
  if(def.kind==='fault'&&!resourceState(s,def.resource,hooks).ready)fail('CAMPAIGN_INCIDENT_PRECONDITION_NOT_READY');
  const command=incidentCommand(s,track,false);invokeRoot(s,command,hooks);
  const active=def.kind==='fault'?s.resources[def.resource]?.fault===def.fault:s.connected===false;
  if(!active)fail('CAMPAIGN_INCIDENT_NOT_OBSERVED');
  const entry={id:`incident-${p.nextId++}`,track,at:s.clock,commandIndex:s.commands.length-1,command:copy(command),recoveredAt:null,recoveredCommandIndex:null};rec.incidents.push(entry);
  append(p,'incident-injected',{at:s.clock,track,incidentId:entry.id,commandIndex:entry.commandIndex});return copy(entry);
 }
 function recoverIncident(s,hooks){
  const p=s.campaign,track=p.selectedTrack,rec=p.progress[track],incident=rec.incidents.at(-1);
  if(!rec.windows.some(w=>w.kind==='recovery'&&w.status==='open'))fail('CAMPAIGN_RECOVERY_WINDOW_REQUIRED');
  if(!incident||incident.recoveredAt)fail('CAMPAIGN_INCIDENT_NOT_ACTIVE');
  if(s.clock<=incident.at)fail('CAMPAIGN_INCIDENT_MINIMUM_HOLD');
  const def=tracks[track].incident,stillActive=def.kind==='fault'?s.resources[def.resource]?.fault===def.fault:s.connected===false;
  if(!stillActive)fail('CAMPAIGN_INCIDENT_STATE_CHANGED');
  const command=incidentCommand(s,track,true);invokeRoot(s,command,hooks);
  const recovered=def.kind==='fault'?s.resources[def.resource]?.fault===null:s.connected===true;
  if(!recovered)fail('CAMPAIGN_RECOVERY_NOT_OBSERVED');
  incident.recoveredAt=s.clock;incident.recoveredCommandIndex=s.commands.length-1;
  append(p,'incident-recovered',{at:s.clock,track,incidentId:incident.id,commandIndex:incident.recoveredCommandIndex});return copy(incident);
 }
 function command(s,c,hooks={}){
  const p=packOf(s);if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.action!=='string')fail('INVALID_CAMPAIGN_COMMAND');
  const fields={'select-track':['action','track'],'open-window':['action','kind'],'inject-incident':['action'],'recover-incident':['action'],'assess':['action','track']};
  if(!own(fields,c.action)||Object.keys(c).some(k=>!fields[c.action].includes(k)))fail('INVALID_CAMPAIGN_COMMAND');
  if(c.action==='select-track')return selectTrack(s,c,hooks);
  const track=p.selectedTrack,record=p.progress[track];
  if(c.action==='open-window'){
   if(!windowKinds.includes(c.kind))fail('INVALID_CAMPAIGN_WINDOW');if(record.status!=='active')fail('CAMPAIGN_TRACK_NOT_ACTIVE');
   if(record.windows.some(w=>w.status==='open'))fail('CAMPAIGN_WINDOW_ALREADY_OPEN');
   const prior=record.windows.filter(w=>w.kind===c.kind).at(-1);if(prior?.status==='open')fail('CAMPAIGN_WINDOW_ALREADY_OPEN');
   const w={id:`window-${p.nextId++}`,kind:c.kind,track,startedAt:s.clock,dueAt:s.clock+tracks[track].windows[c.kind],lastSampleAt:s.clock,status:'open',generations:configGenerationMap(s,track),configurationFingerprint:configurationFingerprint(s,hooks),migrationProof:c.kind==='service'&&track==='enterprise'?migrationProof(s,s.clock):null,stickyErrors:[],samples:[],preexistingInteractions:(s.interactions||[]).map(i=>i.id),preexistingRecordIds:(s.records||[]).map(r=>r.id),preexistingLedgerIds:(s.business?.ledger||[]).map(x=>x.id),preexistingCommandRevisions:(s.commands||[]).map(x=>x.revision),preexistingBusinessPeriods:s.business?.metrics?.periods||0,seenInteractions:[],seenRecords:[],seenLedger:[],seenCommands:[],commandIndex:s.commands?.length||0,interactionIndex:s.interactions?.length||0,recordIndex:s.records?.length||0,ledgerIndex:s.business?.ledger?.length||0};
   record.windows.push(w);append(p,'window-opened',{at:s.clock,track,window:c.kind,windowId:w.id,dueAt:w.dueAt});return copy(w);
  }
  if(c.action==='inject-incident')return injectIncident(s,hooks);
  if(c.action==='recover-incident')return recoverIncident(s,hooks);
  if(c.action==='assess'){
   if(c.track&&c.track!==track)fail('CAMPAIGN_TRACK_NOT_SELECTED');
   return assess(s,track,hooks);
  }
 }
 function advance(s,hooks={}){
  const p=s?.campaign;if(!p)return 0;packOf(s);let closed=0;
  for(const track of trackIds)for(const w of p.progress[track].windows){sampleWindow(s,track,w,hooks);if(closeWindow(s,track,w,hooks))closed++;}
  return closed;
 }
 function validMigrationProof(x){
  if(x===null)return true;if(!x||typeof x!=='object')return false;
  if(x.kind==='core-migrate')return Object.keys(x).sort().join(',')==='at,endpointIds,identities,kind,revision,target'&&integer(x.at)&&integer(x.revision)&&id(x.target)&&Array.isArray(x.identities)&&x.identities.length>0&&new Set(x.identities).size===x.identities.length&&x.identities.every(id)&&Array.isArray(x.endpointIds)&&x.endpointIds.length>0&&new Set(x.endpointIds).size===x.endpointIds.length&&x.endpointIds.every(id);
  if(x.kind==='operations-migration')return Object.keys(x).sort().join(',')==='at,identities,kind,migrationId,revision,target'&&integer(x.at)&&integer(x.revision)&&id(x.target)&&id(x.migrationId)&&Array.isArray(x.identities)&&x.identities.length>0&&new Set(x.identities).size===x.identities.length&&x.identities.every(id);
  return false;
 }
 function validate(s){
  const p=s?.campaign;if(p===undefined||p===null)return true;
  if(Object.keys(p).sort().join(',')!=='awards,contentVersion,id,journal,jurisdiction,mode,nextId,pack,progress,selectedTrack,snapshots,startedAt,version'||p.pack!==PACK||p.version!==VERSION||p.contentVersion!==CONTENT||!id(p.id)||!integer(p.startedAt)||!jurisdictions.includes(p.jurisdiction)||!modes.includes(p.mode)||!own(tracks,p.selectedTrack)||p.jurisdiction!==s.jurisdiction||p.mode!==s.mode||p.selectedTrack!==s.scenario||!p.progress||!p.snapshots||typeof p.snapshots!=='object'||Array.isArray(p.snapshots)||Object.keys(p.snapshots).length>4||!Array.isArray(p.awards)||p.awards.length>4||!Array.isArray(p.journal)||p.journal.length>4000||!integer(p.nextId,1))fail('INVALID_CAMPAIGN_SAVE');
  if(Object.keys(p.progress).sort().join(',')!==trackIds.slice().sort().join(','))fail('INVALID_CAMPAIGN_PROGRESS');
  for(const [track,snap] of Object.entries(p.snapshots)){if(!trackIds.includes(track)||!snap||Object.keys(snap).sort().join(',')!=='capturedAt,jurisdiction,mode,root,scenario,track'||snap.track!==track||!integer(snap.capturedAt)||snap.scenario!==track||snap.jurisdiction!==p.jurisdiction||snap.mode!==p.mode||!snap.root||snap.root.campaign!==undefined||snap.root.progression!==undefined||snap.root.portfolio!==undefined||snap.root.marketQualification!==undefined||snap.root.scenario!==track||snap.root.jurisdiction!==p.jurisdiction||snap.root.mode!==p.mode||!snap.root.resources||JSON.stringify(snap).length>2000000)fail('INVALID_CAMPAIGN_SNAPSHOT');}
  const awarded=new Set();for(const track of trackIds){const r=p.progress[track];if(!r||Object.keys(r).sort().join(',')!=='award,incidents,status,windows'||!['locked','available','active','complete'].includes(r.status)||!Array.isArray(r.windows)||r.windows.length>500||!Array.isArray(r.incidents)||r.incidents.length>100||r.award!==null&&!r.award)fail('INVALID_CAMPAIGN_PROGRESS');
   if(r.status==='complete'&&!r.award||r.award&&r.status!=='complete')fail('INVALID_CAMPAIGN_AWARD_STATE');
   const windowIds=new Set();for(const w of r.windows){const keys=w&&Object.keys(w).sort().join(','),openKeys='commandIndex,configurationFingerprint,dueAt,generations,id,interactionIndex,kind,lastSampleAt,ledgerIndex,migrationProof,preexistingBusinessPeriods,preexistingCommandRevisions,preexistingInteractions,preexistingLedgerIds,preexistingRecordIds,recordIndex,samples,seenCommands,seenInteractions,seenLedger,seenRecords,startedAt,status,stickyErrors,track',closedKeys='closedAt,commandIndex,configurationFingerprint,dueAt,errors,evidence,generations,id,interactionIndex,kind,lastSampleAt,ledgerIndex,migrationProof,preexistingBusinessPeriods,preexistingCommandRevisions,preexistingInteractions,preexistingLedgerIds,preexistingRecordIds,recordIndex,samples,seenCommands,seenInteractions,seenLedger,seenRecords,startedAt,status,stickyErrors,track';if(!w||keys!==(w.status==='open'?openKeys:closedKeys)||!id(w.id)||windowIds.has(w.id)||w.track!==track||!windowKinds.includes(w.kind)||!integer(w.startedAt)||!integer(w.dueAt)||w.dueAt<=w.startedAt||w.dueAt-w.startedAt>60||!integer(w.lastSampleAt,w.startedAt)||typeof w.configurationFingerprint!=='string'||w.configurationFingerprint.length>100000||!Array.isArray(w.samples)||w.samples.length>60||!Array.isArray(w.stickyErrors)||w.stickyErrors.some(x=>typeof x!=='string'||!x)||!['open','passed','failed'].includes(w.status)||!w.generations||typeof w.generations!=='object'||!same(Object.keys(w.generations).sort(),tracks[track].resources.slice().sort())||!integer(w.commandIndex)||!integer(w.interactionIndex)||!integer(w.recordIndex)||!integer(w.ledgerIndex)||!integer(w.preexistingBusinessPeriods)||!validMigrationProof(w.migrationProof)||track!=='enterprise'&&w.migrationProof!==null||w.kind!=='service'&&w.migrationProof!==null||!Array.isArray(w.preexistingCommandRevisions)||!Array.isArray(w.preexistingInteractions)||!Array.isArray(w.preexistingLedgerIds)||!Array.isArray(w.preexistingRecordIds)||!Array.isArray(w.seenCommands)||!Array.isArray(w.seenInteractions)||!Array.isArray(w.seenLedger)||!Array.isArray(w.seenRecords)||[w.preexistingCommandRevisions,w.preexistingInteractions,w.preexistingLedgerIds,w.preexistingRecordIds,w.seenCommands,w.seenInteractions,w.seenLedger,w.seenRecords].some(a=>a.length>10000||a.some(x=>typeof x!=='string'&& !Number.isSafeInteger(x))))fail('INVALID_CAMPAIGN_WINDOW');windowIds.add(w.id);for(const snap of Object.values(w.generations))if(!snap||!integer(snap.generation)||snap.desired!==null&&(!snap.desired||typeof snap.desired!=='object')||snap.effective!==null&&(!snap.effective||typeof snap.effective!=='object'))fail('INVALID_CAMPAIGN_GENERATION');for(let si=0;si<w.samples.length;si++){const sample=w.samples[si];if(!sample||Object.keys(sample).sort().join(',')!=='at,connected,faults,generations,services'||!integer(sample.at,w.startedAt+1,w.lastSampleAt)||si&&sample.at<=w.samples[si-1].at||typeof sample.connected!=='boolean'||!sample.services||!sample.faults||!same(Object.keys(sample.services).sort(),tracks[track].resources.slice().sort())||!same(Object.keys(sample.faults).sort(),tracks[track].resources.slice().sort())||Object.values(sample.services).some(x=>typeof x!=='boolean')||Object.values(sample.faults).some(x=>x!==null&&typeof x!=='string')||!sample.generations||!same(Object.keys(sample.generations).sort(),tracks[track].resources.slice().sort()))fail('INVALID_CAMPAIGN_SAMPLE');}if(w.status==='passed'&&w.samples.some((sample,si)=>sample.at!==w.startedAt+si+1||Object.entries(sample.services).some(([key,ready])=>!ready&&!(w.kind==='recovery'&&key===tracks[track].incident.resource&&r.incidents.some(i=>i.at<sample.at&&i.recoveredAt>=sample.at)&&(tracks[track].incident.kind==='connect'?sample.connected===false:sample.faults[key]===tracks[track].incident.fault)))))fail('INVALID_CAMPAIGN_EVIDENCE');if(w.status!=='open'&&(!integer(w.closedAt)||w.closedAt<w.dueAt||!Array.isArray(w.errors)||w.status==='passed'&&(w.errors.length>0||w.stickyErrors.length>0||w.samples.length!==w.dueAt-w.startedAt||track==='enterprise'&&w.kind==='service'&&!w.migrationProof)||w.status==='failed'&&!w.errors.length||!w.evidence||Object.keys(w.evidence).sort().join(',')!=='commandCount,configurationFingerprint,configurationGenerations,interactionCount,ledgerCount,migrationProof,recordCount,rootRevision,traces'||!integer(w.evidence.rootRevision)||w.evidence.configurationFingerprint!==w.configurationFingerprint||!same(w.evidence.migrationProof,w.migrationProof)||!integer(w.evidence.commandCount)||!integer(w.evidence.interactionCount)||!integer(w.evidence.recordCount)||!integer(w.evidence.ledgerCount)||!w.evidence.configurationGenerations||!same(Object.keys(w.evidence.configurationGenerations).sort(),tracks[track].resources.slice().sort())||!w.evidence.traces||Object.keys(w.evidence.traces).sort().join(',')!=='commands,interactions,ledger,records'||Object.values(w.evidence.traces).some(x=>!Array.isArray(x)||x.length>10)))fail('INVALID_CAMPAIGN_EVIDENCE');}
   for(const i of r.incidents)if(!i||Object.keys(i).sort().join(',')!=='at,command,commandIndex,id,recoveredAt,recoveredCommandIndex,track'||!id(i.id)||i.track!==track||!integer(i.at)||!integer(i.commandIndex)||!i.command||!same(i.command,tracks[track].incident.kind==='fault'?{type:'fault',id:tracks[track].incident.resource,fault:tracks[track].incident.fault}:{type:'connect',connected:false})||i.recoveredAt!==null&&(!integer(i.recoveredAt,i.at+1)||i.recoveredAt===i.at)||i.recoveredCommandIndex!==null&&(!integer(i.recoveredCommandIndex)||i.recoveredCommandIndex<=i.commandIndex)||!!i.recoveredAt!==(i.recoveredCommandIndex!==null))fail('INVALID_CAMPAIGN_INCIDENT');
   if(r.award){const a=r.award,key=`${p.id}:${track}:${p.contentVersion}`;if(Object.keys(a).sort().join(',')!=='amount,at,campaignId,contentVersion,evidenceIds,key,track,unit'||awarded.has(track)||a.key!==key||a.campaignId!==p.id||a.track!==track||a.contentVersion!==p.contentVersion||a.unit!=='training-credit'||a.amount!==tracks[track].reward||!integer(a.at)||!Array.isArray(a.evidenceIds)||a.evidenceIds.length!==windowKinds.length||new Set(a.evidenceIds).size!==windowKinds.length||a.evidenceIds.some(x=>!windowIds.has(x)||!r.windows.some(w=>w.id===x&&w.status==='passed'))||windowKinds.some(k=>!a.evidenceIds.some(x=>r.windows.some(w=>w.id===x&&w.kind===k))))fail('INVALID_CAMPAIGN_AWARD');awarded.add(track);}
  }
  if(p.progress[p.selectedTrack].status!=='active'&&p.progress[p.selectedTrack].status!=='complete')fail('INVALID_CAMPAIGN_ACTIVE_TRACK');if(p.mode!=='sandbox')for(const track of trackIds.slice(1)){const predecessor=tracks[track].predecessor,unlocked=!!p.progress[predecessor]?.award;if(unlocked&&p.progress[track].status==='locked'||!unlocked&&p.progress[track].status!=='locked')fail('INVALID_CAMPAIGN_PROGRESSION');}
  if(p.awards.length!==awarded.size||p.awards.some(a=>!a||!trackIds.includes(a.track)||p.progress[a.track]?.award?.key!==a.key)||p.awards.some(a=>!p.journal.some(e=>e.kind==='track-awarded'&&e.key===a.key&&e.track===a.track)))fail('INVALID_CAMPAIGN_AWARD_JOURNAL');
  const eventIds=new Set();for(const e of p.journal)if(!e||!id(e.id)||eventIds.has(e.id)||!integer(e.at)||!['track-selected','window-opened','window-closed','incident-injected','incident-recovered','track-awarded'].includes(e.kind))fail('INVALID_CAMPAIGN_JOURNAL');else eventIds.add(e.id);
  return true;
 }
 function inspect(s,hooks={}){
  const p=packOf(s);validate(s);const current={};for(const track of trackIds){const r=p.progress[track];current[track]={status:r.status,windowCount:r.windows.length,openWindow:r.windows.find(w=>w.status==='open')?.kind||null,lastWindows:r.windows.slice(-4).map(w=>({id:w.id,kind:w.kind,status:w.status,errors:copy(w.errors||[])})),incidents:r.incidents.map(i=>({id:i.id,at:i.at,recoveredAt:i.recoveredAt})),award:copy(r.award)};}
  const assessment=progressAssessment(s,p.selectedTrack,hooks);
  return {pack:PACK,version:VERSION,contentVersion:p.contentVersion,id:p.id,mode:p.mode,jurisdiction:p.jurisdiction,selectedTrack:p.selectedTrack,tracks:current,snapshots:Object.fromEntries(Object.entries(p.snapshots).map(([k,v])=>[k,{capturedAt:v.capturedAt,scenario:v.scenario,resourceCount:Object.keys(v.root.resources||{}).length,hasBusiness:!!v.root.business}])),assessment,awards:copy(p.awards),journal:copy(p.journal),unimplementedSourceObligations:{status:'pending',progressionLevels:13,goals:19}};
 }
 function fingerprint(s){const p=packOf(s);validate(s);return JSON.stringify([p.pack,p.version,p.contentVersion,p.id,p.mode,p.jurisdiction,p.selectedTrack]);}
 const source=()=>`const SOC_CAMPAIGN=(${socCampaignKernel.toString()})();`;
 return {PACK,VERSION,CONTENT,tracks,create,command,advance,validate,inspect,fingerprint,source};
}
const SOC_CAMPAIGN=socCampaignKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_CAMPAIGN;
