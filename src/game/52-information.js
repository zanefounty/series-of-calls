/* Synthetic information lifecycle and scheduled room services; no external APIs. */
function socInformationKernel(){
 'use strict';
 const PACK='soc-information-1',copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=code=>{throw new Error(code);},id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
 const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max,regions=['AU','US','JP','EU'];
 const steps={transcription:{inputs:['recording'],work:2},diarisation:{inputs:['transcription'],work:1},translation:{inputs:['transcription','diarisation'],work:2},summary:{inputs:['transcription','diarisation','translation','redaction'],work:2},actions:{inputs:['summary'],work:1},redaction:{inputs:['transcription','diarisation','translation','summary','actions'],work:1},index:{inputs:['redaction'],work:1}};
 const schemas={
  pipeline:{enabled:true,steps:['transcription','diarisation','summary','actions','redaction','index'],languages:['en','ja'],targetLanguage:'en',quality:90,minimumQuality:70,concurrency:2,processor:'speech',archive:'archive',access:['supervisor'],retentionDays:30},
  boundary:{processRegions:['AU'],storageRegions:['AU'],administrators:['supervisor'],readers:['supervisor'],holdAuthority:['supervisor'],allowRemoteAdministration:false},
  meeting:{calendarAuthorised:true,bookingEnabled:true,platform:'grove',nativePlatform:'grove',guestJoin:true,bridgeLicensed:false,capacity:8,eventLicensed:false,eventCapacity:100,mediaPlacement:'cloud',captions:false,recording:false}
 };
 function config(kind,c){
  const d=schemas[kind];if(!d||!c||Array.isArray(c)||Object.keys(c).sort().join(',')!==Object.keys(d).sort().join(','))fail('INVALID_INFORMATION_CONFIG');
  for(const [k,v] of Object.entries(c)){
   if(Array.isArray(d[k])){if(!Array.isArray(v)||!v.length||v.length>30||v.some(x=>typeof x!=='string'||x.length>64)||new Set(v).size!==v.length)fail('INVALID_INFORMATION_LIST');}
   else if(typeof v!==typeof d[k]||typeof v==='number'&&!integer(v,0,100000)||typeof v==='string'&&v.length>64)fail('INVALID_INFORMATION_FIELD');
  }
  if(kind==='pipeline'){
   let parent='recording';for(const step of c.steps){if(!own(steps,step)||!steps[step].inputs.includes(parent))fail('INVALID_PROCESSING_CHAIN');parent=step;}
   if(c.quality>100||c.minimumQuality>100||c.concurrency<1||c.concurrency>20||c.retentionDays<1||!id(c.processor)||!id(c.archive)||!['en','ja','fr','de'].includes(c.targetLanguage)||c.languages.some(x=>!['en','ja','fr','de'].includes(x)))fail('INVALID_PIPELINE_POLICY');
  }
  if(kind==='boundary'&&[...c.processRegions,...c.storageRegions].some(r=>!regions.includes(r)))fail('INVALID_INFORMATION_REGION');
  if(kind==='meeting'&&(!['grove','disco'].includes(c.platform)||!['grove','disco'].includes(c.nativePlatform)||!['local','cloud'].includes(c.mediaPlacement)||c.capacity<1||c.eventCapacity<1))fail('INVALID_MEETING_PROFILE');
 }
 function create(s){
  const result={pack:PACK,jobs:[],bookings:[],audit:[],nextId:1,jobPrunedThrough:0,nextAuditId:1,auditPrunedThrough:0};
  for(const [kind,defaults] of Object.entries(schemas)){const c=copy(defaults);if(kind==='boundary'){c.processRegions=[s.jurisdiction];c.storageRegions=[s.jurisdiction];}result[kind]={desired:c,effective:null,generation:1,provisioning:{status:'pending',due:s.clock+1,generation:1}};}
  return result;
 }
 function audit(s,code,detail={}){const info=s.information;info.nextAuditId=info.nextAuditId||info.audit.length+1;const entry={at:s.clock,code,synthetic:true,...detail,auditId:info.nextAuditId++};info.audit.push(entry);if(info.audit.length>500){const removed=info.audit.shift();if(removed.auditId)info.auditPrunedThrough=Math.max(info.auditPrunedThrough||0,removed.auditId);}return entry;}
 function fingerprint(s){return s.information?Object.keys(schemas).map(k=>[k,s.information[k].generation,s.information[k].effective]):null;}
 function inspect(s){if(!s.information)return null;return {pack:PACK,jobs:copy(s.information.jobs),bookings:copy(s.information.bookings),audit:copy(s.information.audit),records:s.records.map(r=>({id:r.id,kind:r.kind,parents:r.parents,region:r.region,processRegion:r.processRegion,expiresAt:r.expiresAt,held:!!r.held,deleted:!!r.deleted,quality:r.quality}))};}
 function enqueue(s,record,speechModel=null){
  const info=s.information;if(!info)return;const p=info.pipeline.effective;
  if(record.expiresAt===undefined){record.expiresAt=record.createdAt+record.retentionDays*1440;record.held=false;record.deleted=false;record.quality=100;}
  if(!p?.enabled)return;if(info.jobs.some(j=>j.source===record.id))return;
  if(info.jobs.length>=200){const i=info.jobs.findIndex(j=>['complete','failed'].includes(j.status));if(i<0)fail('PROCESSING_JOB_CAPACITY');const removed=info.jobs.splice(i,1)[0];info.jobPrunedThrough=Math.max(info.jobPrunedThrough||0,Number(removed.id.slice('processing-'.length)));}
  info.jobs.push({id:'processing-'+info.nextId++,source:record.id,parent:record.id,interaction:record.interaction,status:'queued',stage:0,remaining:steps[p.steps[0]].work,plan:copy(p),...(speechModel?{speechModel:copy(speechModel)}:{}),reason:null,createdAt:s.clock});
  audit(s,'PROCESSING_QUEUED',{record:record.id});
 }
 function canRead(s,record,role,region){
  const b=s.information?.boundary.effective;
  return !!b&&!!record&&!record.deleted&&record.access.includes(role)&&b.readers.includes(role)&&b.storageRegions.includes(record.region)&&(region===record.region||b.allowRemoteAdministration);
 }
 function reason(s,j,services,speechGate){
  const p=j.plan,proc=s.resources[p.processor]?.effective,archive=s.resources[p.archive]?.effective,b=s.information.boundary.effective;
  const source=s.records.find(r=>r.id===j.parent),i=s.interactions.find(i=>i.id===j.interaction);
  if(!source||source.deleted)return 'PROCESSING_SOURCE_UNAVAILABLE';
  if(!b||!proc||!archive||!services[p.processor]?.ready||!services[p.archive]?.ready)return 'PROCESSING_DEPENDENCY';
  if(!b.processRegions.includes(proc.region)||!b.storageRegions.includes(archive.region))return 'PROCESSING_BOUNDARY';
  if(!p.languages.includes(source.language||i?.language||'en'))return 'PROCESSING_LANGUAGE';
  if(!p.access.some(role=>source.access.includes(role)&&archive.access.includes(role)&&b.readers.includes(role)))return 'PROCESSING_PERMISSION';
  if(archive.capacity<Math.ceil((s.records.filter(r=>!r.deleted).length+1)/100))return 'ARCHIVE_CAPACITY';
  if(j.speechModel){if(typeof speechGate!=='function')return 'SPEECH_MODEL_GATE_UNAVAILABLE';const gate=speechGate(j.speechModel,{language:source.language||i?.language||'en',stage:p.steps[j.stage],computeUnits:steps[p.steps[j.stage]]?.work||1,region:proc.region,offline:!s.connected});if(!gate?.ready)return gate?.reasons?.[0]||'SPEECH_MODEL_NOT_READY';}
  return null;
 }
 function advance(s,services,emit,meter,speechGate){
  const o=s.information;if(!o)return;
  for(const kind of Object.keys(schemas)){const n=o[kind];if(n.provisioning.status==='pending'&&n.provisioning.due<=s.clock){n.effective=copy(n.desired);n.provisioning.status='ready';}}
  for(const r of s.records)if(r.expiresAt!==undefined&&!r.held&&!r.deleted&&r.expiresAt<=s.clock){r.deleted=true;r.deletedAt=s.clock;audit(s,'RETENTION_EXPIRED',{record:r.id});}
  const budgets={},active={};
  for(const j of o.jobs){
   if(!['queued','processing','blocked'].includes(j.status))continue;
   const problem=reason(s,j,services,speechGate);if(problem){j.status='blocked';j.reason=problem;continue;}
   const p=j.plan,proc=s.resources[p.processor].effective,archive=s.resources[p.archive].effective;
   if((active[p.processor]||0)>=p.concurrency){j.status='queued';j.reason='PROCESSING_CONCURRENCY';continue;}
   if(budgets[p.processor]===undefined)budgets[p.processor]=proc.capacity;
   if(budgets[p.processor]<1){j.status='queued';j.reason='PROCESSOR_MINUTES';continue;}
   active[p.processor]=(active[p.processor]||0)+1;
   const used=Math.min(j.remaining,budgets[p.processor]);budgets[p.processor]-=used;j.remaining-=used;j.status='processing';j.reason=null;meter(s,'processor-minute',used,[p.processor]);
   if(j.remaining)continue;
   const parent=s.records.find(r=>r.id===j.parent),kind=p.steps[j.stage],interaction=s.interactions.find(i=>i.id===j.interaction);
   const quality=Math.min(parent.quality??100,p.quality);
   if(quality<p.minimumQuality){j.status='failed';j.reason='PROCESSING_QUALITY';audit(s,j.reason,{job:j.id,quality});if(interaction)emit(s,interaction,'processing',j.reason,{job:j.id,quality});continue;}
   if(s.records.length>=500){j.status='blocked';j.reason='RECORD_CAPACITY';continue;}
   const record={id:'record-'+s.nextId++,kind,interaction:j.interaction,parents:[parent.id],captureRegion:parent.captureRegion,processRegion:proc.region,region:archive.region,retentionDays:Math.min(p.retentionDays,archive.retentionDays,parent.retentionDays),access:p.access.filter(role=>parent.access.includes(role)&&archive.access.includes(role)&&o.boundary.effective.readers.includes(role)),createdAt:s.clock,expiresAt:Math.min(parent.expiresAt??Infinity,s.clock+Math.min(p.retentionDays,archive.retentionDays)*1440),quality,language:kind==='translation'?p.targetLanguage:parent.language||interaction?.language||'en',held:false,deleted:false,redacted:kind==='redaction'||!!parent.redacted,pack:PACK};
   s.records.push(record);j.parent=record.id;j.stage++;audit(s,'DERIVED_RECORD',{record:record.id,parent:parent.id,operation:kind});
   if(interaction){interaction.records.push(record.id);emit(s,interaction,'processing','ARTEFACT_CREATED',{record:record.id,operation:kind,processRegion:proc.region,storageRegion:archive.region,quality});}
   if(j.stage===p.steps.length)j.status='complete';else{j.remaining=steps[p.steps[j.stage]].work;j.status='queued';}
  }
 }
 function join(s,booking,baseMeeting,services,emit){
  const o=s.information,p=o.meeting.effective,c=s.resources.room.effective,errors=[...baseMeeting.reasons];
  if(!p||!c)errors.push('MEETING_NOT_PROVISIONED');
  else{
   if(!p.calendarAuthorised||!p.bookingEnabled)errors.push('CALENDAR_AUTHORISATION');
   if(s.clock<booking.start||s.clock>=booking.end)errors.push('BOOKING_WINDOW');
   if(booking.attendees>(booking.event?p.eventCapacity:p.capacity))errors.push('MEETING_CAPACITY');
   if(booking.event&&!p.eventLicensed)errors.push('EVENT_ENTITLEMENT');
   if(p.platform!==p.nativePlatform&&(c.mode==='native'||c.mode==='guest'&&!p.guestJoin||c.mode==='bridge'&&!p.bridgeLicensed))errors.push('JOIN_METHOD_UNSUPPORTED');
   if(!s.connected&&p.mediaPlacement==='cloud')errors.push('MEETING_CLOUD_MEDIA');
   const boundary=o.boundary.effective,speech=s.resources.speech.effective,archive=s.resources.archive.effective,recorder=s.resources.recorder.effective;
   if(p.captions&&(!services.speech?.ready||speech.capacity<1||!o.pipeline.effective?.languages.includes(booking.language)||!boundary?.processRegions.includes(speech.region)))errors.push('CAPTIONS_DEPENDENCY');
   if(p.recording&&(!services.recorder?.ready||!recorder.consent||!recorder.identityMapping||!services.archive?.ready||!boundary?.processRegions.includes(recorder.region)||!boundary?.storageRegions.includes(archive.region)||archive.capacity<Math.ceil((s.records.filter(r=>!r.deleted).length+1)/100)||s.records.length>=500))errors.push('MEETING_RECORDING_DEPENDENCY');
  }
  const result={...baseMeeting,at:s.clock,success:!errors.length,reasons:[...new Set(errors)],booking:booking.id,mediaPlacement:p?.mediaPlacement,features:{captions:!!p?.captions&&!errors.length,recording:!!p?.recording&&!errors.length}};
  if(result.success&&p.recording&&!booking.record){
   const recorder=s.resources.recorder.effective,archive=s.resources.archive.effective;
   const r={id:'record-'+s.nextId++,kind:'recording',interaction:booking.id,parents:[],captureRegion:recorder.region,region:archive.region,retentionDays:archive.retentionDays,access:[...archive.access],createdAt:s.clock,language:booking.language};
   s.records.push(r);booking.record=r.id;enqueue(s,r);audit(s,'MEETING_RECORDED',{booking:booking.id,record:r.id});
  }
  const receipt=audit(s,result.success?'MEETING_JOINED':'MEETING_JOIN_FAILED',{booking:booking.id,reasons:result.reasons,features:copy(result.features),record:booking.record||null});result.auditId=receipt.auditId;booking.lastJoin=copy(result);return result;
 }
 const fields={start:[],configure:['kind','config'],process:['record'],read:['record','role','region'],hold:['record','role','held'],remove:['record','role'],book:['start','end','attendees','event','language'],cancel:['booking'],join:['booking']};
 function command(s,c,services,baseMeeting,emit){
  if(!c||!own(fields,c.action)||Object.keys(c).some(k=>!['action',...fields[c.action]].includes(k)))fail('INVALID_INFORMATION_COMMAND');
  if(c.action==='start'){if(s.information)fail('INFORMATION_ALREADY_STARTED');s.information=create(s);return;}
  const o=s.information;if(!o)fail('INFORMATION_NOT_STARTED');
  if(c.action==='configure'){
   if(!own(schemas,c.kind)||!c.config||Array.isArray(c.config))fail('INVALID_INFORMATION_CONFIG');const n=o[c.kind],desired={...n.desired,...copy(c.config)};config(c.kind,desired);
   if(c.kind==='pipeline'&&(s.resources[desired.processor]?.kind!=='processor'||s.resources[desired.archive]?.kind!=='archive'))fail('INVALID_PROCESSING_RESOURCE');
   n.desired=desired;n.generation++;n.provisioning={status:'pending',due:s.clock+1,generation:n.generation};
  }else if(['process','read','hold','remove'].includes(c.action)){
   const r=s.records.find(r=>r.id===c.record);if(!r||r.deleted)fail('RECORD_UNAVAILABLE');
   if(c.action==='process'){if(r.kind!=='recording')fail('RECORDING_REQUIRED');if(o.jobs.some(j=>j.source===r.id))fail('RECORD_ALREADY_PROCESSING');enqueue(s,r,typeof services.speechModelContext==='function'?services.speechModelContext(s,r):null);}
   if(c.action==='read'){if(!regions.includes(c.region)||!canRead(s,r,c.role,c.region))fail('RECORD_ACCESS_DENIED');audit(s,'RECORD_READ',{record:r.id,role:c.role,region:c.region});}
   if(c.action==='hold'){if(!o.boundary.effective?.holdAuthority.includes(c.role)||typeof c.held!=='boolean')fail('HOLD_AUTHORITY');r.held=c.held;audit(s,c.held?'HOLD_APPLIED':'HOLD_RELEASED',{record:r.id,role:c.role});}
   if(c.action==='remove'){
    if(!o.boundary.effective?.administrators.includes(c.role))fail('RECORD_ADMINISTRATION');
    const descendants=new Set([r.id]);for(const item of s.records)if(item.parents.some(p=>descendants.has(p)))descendants.add(item.id);
    const affected=s.records.filter(x=>descendants.has(x.id));if(affected.some(x=>x.held))fail('RECORD_HELD');
    for(const item of affected){item.deleted=true;item.deletedAt=s.clock;audit(s,'RECORD_REMOVED',{record:item.id,role:c.role});}
   }
  }else if(c.action==='book'){
   if(!integer(c.start,s.clock)||!integer(c.end,c.start+1)||!integer(c.attendees,1,10000)||typeof c.event!=='boolean'||!['en','ja','fr','de'].includes(c.language))fail('INVALID_BOOKING');
   if(!o.meeting.effective?.calendarAuthorised||!o.meeting.effective.bookingEnabled||!s.resources.room.effective?.calendar)fail('CALENDAR_AUTHORISATION');
   if(o.bookings.some(b=>!b.cancelled&&b.start<c.end&&b.end>c.start))fail('ROOM_BOOKING_CONFLICT');
   if(o.bookings.length>=200)fail('BOOKING_CAPACITY');o.bookings.push({id:'booking-'+o.nextId++,start:c.start,end:c.end,attendees:c.attendees,event:c.event,language:c.language,cancelled:false,lastJoin:null});
  }else{
   const b=o.bookings.find(b=>b.id===c.booking);if(!b||b.cancelled)fail('BOOKING_UNAVAILABLE');
   if(c.action==='cancel')b.cancelled=true;else if(c.action==='join')s.lastMeeting=join(s,b,baseMeeting,services,emit);
  }
 }
 function validate(s){
  const o=s.information;if(o===undefined)return;
  if(!o||o.pack!==PACK||!integer(o.nextId,1))fail('INVALID_INFORMATION_SAVE');
  if(o.jobPrunedThrough!==undefined&&!integer(o.jobPrunedThrough,0,o.nextId-1)||o.nextAuditId!==undefined&&!integer(o.nextAuditId,1)||o.auditPrunedThrough!==undefined&&(!integer(o.auditPrunedThrough,0,(o.nextAuditId||1)-1)))fail('INVALID_INFORMATION_HISTORY');
  for(const kind of Object.keys(schemas)){const n=o[kind];if(!n||!integer(n.generation,1)||!n.provisioning||n.provisioning.generation!==n.generation||!integer(n.provisioning.due)||!['pending','ready'].includes(n.provisioning.status))fail('INVALID_INFORMATION_PROVISIONING');config(kind,n.desired);if(n.effective)config(kind,n.effective);}
  for(const [key,max] of Object.entries({jobs:200,bookings:200,audit:500}))if(!Array.isArray(o[key])||o[key].length>max)fail('INVALID_INFORMATION_COLLECTION');
  const recordIds=new Set();for(const r of s.records){if(recordIds.has(r.id)||r.parents.some(p=>!recordIds.has(p)))fail('INFORMATION_LINEAGE');recordIds.add(r.id);if(r.expiresAt!==undefined&&(!integer(r.expiresAt,0,Number.MAX_SAFE_INTEGER)||typeof r.deleted!=='boolean'||typeof r.held!=='boolean'||!integer(r.quality,0,100)))fail('INVALID_INFORMATION_RECORD');}
  for(const j of o.jobs){config('pipeline',j.plan);if(!id(j.id)||!recordIds.has(j.source)||!recordIds.has(j.parent)||!integer(j.stage,0,j.plan.steps.length)||!integer(j.remaining,0,2)||!['queued','processing','blocked','complete','failed'].includes(j.status)||j.speechModel!==undefined&&(!j.speechModel||Object.keys(j.speechModel).sort().join(',')!=='deploymentId,family,generation,integrationResourceId,mode,modelResourceId,offer,productVersion,region'||!id(j.speechModel.deploymentId)||!id(j.speechModel.modelResourceId)||!id(j.speechModel.integrationResourceId)||j.speechModel.family!=='cisco:local-speech'||!integer(j.speechModel.generation,1)||j.speechModel.mode!=='customer-operated-local'||!id(j.speechModel.offer)||typeof j.speechModel.productVersion!=='string'||!j.speechModel.productVersion||!regions.includes(j.speechModel.region)))fail('INVALID_PROCESSING_JOB');}
  for(const b of o.bookings){
   if(!id(b.id)||!integer(b.start)||!integer(b.end,b.start+1)||!integer(b.attendees,1,10000)||typeof b.event!=='boolean'||typeof b.cancelled!=='boolean')fail('INVALID_SAVED_BOOKING');
   const j=b.lastJoin;if(j&&(j.at!==undefined||j.auditId!==undefined)){
    if(!integer(j.at,0,s.clock)||!integer(j.auditId,1,(o.nextAuditId||1)-1)||typeof j.success!=='boolean'||!j.features||typeof j.features.captions!=='boolean'||typeof j.features.recording!=='boolean')fail('INVALID_MEETING_RECEIPT');
    const receipt=o.audit.find(a=>a.auditId===j.auditId);
    if(receipt?(receipt.at!==j.at||receipt.booking!==b.id||receipt.code!==(j.success?'MEETING_JOINED':'MEETING_JOIN_FAILED')||JSON.stringify(receipt.features)!==JSON.stringify(j.features)):j.auditId>(o.auditPrunedThrough||0))fail('INVALID_MEETING_RECEIPT');
   }
  }
  let auditId=0;for(const a of o.audit){if(!integer(a.at)||typeof a.code!=='string'||a.synthetic!==true||a.auditId!==undefined&&(!integer(a.auditId,auditId+1,(o.nextAuditId||1)-1)||a.auditId<=(o.auditPrunedThrough||0)))fail('INVALID_INFORMATION_AUDIT');if(a.auditId!==undefined)auditId=a.auditId;}
 }
 const source=()=>`const SOC_INFORMATION=(${socInformationKernel.toString()})();`;
 return {PACK,schemas,steps,config,create,fingerprint,inspect,enqueue,canRead,advance,command,validate,source};
}
const SOC_INFORMATION=socInformationKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_INFORMATION;
