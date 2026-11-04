/* Synthetic information lifecycle and scheduled room services; no external APIs. */
function socInformationKernel(){
 'use strict';
 const PACK='soc-information-1',copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=code=>{throw new Error(code);},id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
 const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max,regions=['AU','US','JP','EU'];
 const classes=['public','internal','confidential','restricted'],classRank=Object.fromEntries(classes.map((x,i)=>[x,i]));
 const interfacePolicies=Object.freeze({
  'defence-admin-to-training-v1':Object.freeze({id:'defence-admin-to-training-v1',scenario:'defence',sourceWorkload:'administration',destinationWorkload:'training',maximumClassification:'internal',sameJurisdiction:true,distinctEnvironment:false,fictional:true}),
  'defence-restricted-handover-v1':Object.freeze({id:'defence-restricted-handover-v1',scenario:'defence',sourceWorkload:'restricted-operations',destinationWorkload:'restricted-operations',maximumClassification:'restricted',sameJurisdiction:true,distinctEnvironment:true,fictional:true})
 });
 function interfacePolicyValid(s,d){
  const policy=interfacePolicies[d?.policyId];
  return !!policy&&policy.scenario===s.scenario&&d.source?.workload===policy.sourceWorkload&&d.destination?.workload===policy.destinationWorkload&&d.source.profile===d.destination.profile&&(!policy.sameJurisdiction||d.source.profile===s.jurisdiction)&&classRank[d.source.informationClass]<=classRank[policy.maximumClassification]&&classRank[d.destination.informationClass]<=classRank[policy.maximumClassification]&&(!policy.distinctEnvironment||d.source.resourceId!==d.destination.resourceId&&d.source.boundaryContractId!==d.destination.boundaryContractId);
 }
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
  const result={pack:PACK,jobs:[],bookings:[],audit:[],interfaces:[],transfers:[],originReceipts:[],nextTransferId:1,nextId:1,jobPrunedThrough:0,nextAuditId:1,auditPrunedThrough:0};
  for(const [kind,defaults] of Object.entries(schemas)){const c=copy(defaults);if(kind==='boundary'){c.processRegions=[s.jurisdiction];c.storageRegions=[s.jurisdiction];}result[kind]={desired:c,effective:null,generation:1,provisioning:{status:'pending',due:s.clock+1,generation:1}};}
  return result;
 }
 function audit(s,code,detail={}){const info=s.information;info.nextAuditId=info.nextAuditId||info.audit.length+1;const entry={at:s.clock,code,synthetic:true,...detail,auditId:info.nextAuditId++};info.audit.push(entry);if(info.audit.length>500){const removed=info.audit.shift();if(removed.auditId)info.auditPrunedThrough=Math.max(info.auditPrunedThrough||0,removed.auditId);}return entry;}
 function transferReceipt(o,receipt){if(o.transfers.length>=200){const removed=o.transfers.shift();o.transferPrunedThrough=Math.max(o.transferPrunedThrough||0,Number(removed.id.slice('transfer-'.length)));}o.transfers.push(receipt);}
 function fingerprint(s){if(!s.information)return null;const o=s.information,base=Object.keys(schemas).map(k=>[k,o[k].generation,o[k].effective]);if(!o.interfaces?.length)return base;return [...base,['interfaces',o.interfaces.map(x=>[x.id,x.generation,x.desired,x.effective])]];}
 function inspect(s){if(!s.information)return null;return {pack:PACK,jobs:copy(s.information.jobs),bookings:copy(s.information.bookings),interfaces:copy(s.information.interfaces||[]),transfers:copy(s.information.transfers||[]),audit:copy(s.information.audit),records:s.records.map(r=>({id:r.id,kind:r.kind,parents:r.parents,region:r.region,processRegion:r.processRegion,expiresAt:r.expiresAt,held:!!r.held,deleted:!!r.deleted,quality:r.quality,...(r.origin?{origin:copy(r.origin),classification:r.classification,storage:copy(r.storage)}:{})}))};}
 function boundarySnapshot(s,resourceId,hooks){
  const resource=s.resources?.[resourceId],contractId=s.boundaries?.bindings?.[resourceId],contract=s.boundaries?.contracts?.find(x=>x.id===contractId),effective=contract?.effective;
  const flow=effective?.flows?.find(x=>x.resource===resourceId),result=typeof hooks?.boundaryCheck==='function'?hooks.boundaryCheck(s,resourceId):null;
  if(!resource||!effective||contract.provisioning.status!=='ready'||contract.provisioning.generation!==contract.generation||!flow||!integer(resource.generation,1)||!classes.includes(flow.informationClass)||typeof result?.eligible!=='boolean')return null;
  return {resourceId,resourceGeneration:resource.generation,boundaryContractId:contract.id,boundaryGeneration:contract.generation,flowId:flow.id,workload:effective.workload,profile:effective.profile,informationClass:flow.informationClass,accessRoles:copy(flow.accessRoles),eligible:result.eligible};
 }
 function captureOrigin(s,record,hooks){
  if(record.origin||record.parents?.length)return;
  const capture=boundarySnapshot(s,'recorder',hooks),storage=boundarySnapshot(s,'archive',hooks);
  if(!capture||!storage)return;
  const classification=classes[Math.max(classRank[capture.informationClass],classRank[storage.informationClass])];
  const origin={scenario:s.scenario,workload:capture.workload,capture,initialStorage:storage,classification,capturedAt:s.clock,complete:capture.eligible&&storage.eligible&&capture.workload===storage.workload&&capture.profile===storage.profile};
  record.origin=copy(origin);record.classification=classification;record.storage=copy(storage);
  const o=s.information;o.originReceipts=o.originReceipts||[];
  if(o.originReceipts.length>=500)fail('INFORMATION_ORIGIN_CAPACITY');
  o.originReceipts.push({recordId:record.id,at:s.clock,origin:copy(origin)});
 }
 function enqueue(s,record,speechModel=null,hooks={}){
  const info=s.information;if(!info)return;const p=info.pipeline.effective;
  if(!record.origin&&record.parents?.length){const parent=s.records.find(x=>x.id===record.parents[0]);if(parent?.origin){record.origin=copy(parent.origin);record.classification=parent.classification;record.storage=copy(parent.storage);}}
  else if(hooks.captureOrigin!==false)captureOrigin(s,record,hooks);
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
 function snapshotMatches(s,snapshot,hooks){
  if(!snapshot)return false;const current=boundarySnapshot(s,snapshot.resourceId,hooks),resource=s.resources?.[snapshot.resourceId];
  return !!current&&resource?.kind==='archive'&&current.eligible&&snapshot.eligible&&['resourceId','resourceGeneration','boundaryContractId','boundaryGeneration','flowId','workload','profile','informationClass'].every(k=>current[k]===snapshot[k])&&JSON.stringify(current.accessRoles)===JSON.stringify(snapshot.accessRoles);
 }
 function captureSnapshotMatches(s,snapshot,hooks){
  if(!snapshot)return false;const current=boundarySnapshot(s,snapshot.resourceId,hooks);
  return !!current&&current.eligible&&snapshot.eligible&&['resourceId','resourceGeneration','boundaryContractId','boundaryGeneration','flowId','workload','profile','informationClass'].every(k=>current[k]===snapshot[k])&&JSON.stringify(current.accessRoles)===JSON.stringify(snapshot.accessRoles);
 }
 function authorize(hooks,s,resourceId){return typeof hooks?.authorize==='function'&&hooks.authorize(s,resourceId,'configure')===true;}
 function provisionInterface(s,node,services){
  const d=node.desired;if(!d.enabled){node.effective=copy(d);node.provisioning={status:'ready',due:node.provisioning.due,generation:node.generation,errors:[]};return;}
  const errors=[];
  for(const [name,snapshot] of [['source',d.source],['destination',d.destination]]){
   const current=boundarySnapshot(s,snapshot.resourceId,services),resource=s.resources?.[snapshot.resourceId];
   if(!current)errors.push(`${name.toUpperCase()}_BOUNDARY_UNAVAILABLE`);
   else if(!current.eligible||!['resourceId','resourceGeneration','boundaryContractId','boundaryGeneration','flowId','workload','profile','informationClass'].every(k=>current[k]===snapshot[k]))errors.push(`${name.toUpperCase()}_BOUNDARY_STALE_OR_INELIGIBLE`);
   if(!resource||resource.kind!=='archive'||resource.generation!==snapshot.resourceGeneration)errors.push(`${name.toUpperCase()}_RESOURCE_GENERATION_STALE`);
   if(services?.[snapshot.resourceId]?.ready!==true)errors.push(`${name.toUpperCase()}_RESOURCE_UNAVAILABLE`);
  }
  const policy=interfacePolicies[d.policyId];
  if(policy?.distinctEnvironment&&(d.source.resourceId===d.destination.resourceId||d.source.boundaryContractId===d.destination.boundaryContractId))errors.push('DISTINCT_RESTRICTED_ENVIRONMENTS_REQUIRED');
  if(!interfacePolicyValid(s,d))errors.push('SCENARIO_INTERFACE_POLICY_MISMATCH');
  node.provisioning={status:errors.length?'blocked':'ready',due:node.provisioning.due,generation:node.generation,errors:[...new Set(errors)]};
  if(!errors.length)node.effective=copy(d);
 }
 function transfer(s,c,services){
  const o=s.information;o.interfaces=o.interfaces||[];o.transfers=o.transfers||[];o.nextTransferId=o.nextTransferId||1;const node=o.interfaces.find(x=>x.id===c.interfaceId),source=s.records.find(x=>x.id===c.recordId),idValue=`transfer-${o.nextTransferId++}`;
  const result={id:idValue,at:s.clock,interfaceId:c.interfaceId,recordId:c.recordId,status:'blocked',reason:'INTERFACE_NOT_EFFECTIVE'};
  const block=reason=>{result.reason=reason;transferReceipt(o,result);audit(s,'INFORMATION_TRANSFER_BLOCKED',{transfer:idValue,interfaceId:c.interfaceId,record:c.recordId,reason});return copy(result);};
  if(!node||node.provisioning.status!=='ready'||!node.effective)return block('INTERFACE_NOT_EFFECTIVE');
  const cfg=node.effective,policy=interfacePolicies[cfg.policyId];if(!cfg.enabled)return block('INTERFACE_REVOKED');
  if(!interfacePolicyValid(s,cfg))return block('SCENARIO_INTERFACE_POLICY_MISMATCH');
  if(!source||source.deleted||source.held||!integer(source.expiresAt)||source.expiresAt<=s.clock)return block('SOURCE_RECORD_UNAVAILABLE');
  if(!source.origin||!source.storage||!classes.includes(source.classification)||source.origin.complete!==true)return block('SOURCE_ORIGIN_UNPROVEN');
  if(source.classification!==source.origin.classification||source.origin.scenario!==s.scenario||source.origin.workload!==policy?.sourceWorkload||source.storage.workload!==policy?.sourceWorkload)return block('SOURCE_ORIGIN_POLICY_MISMATCH');
  if(!snapshotMatches(s,cfg.source,services)||source.storage.resourceId!==cfg.source.resourceId||source.storage.resourceGeneration!==cfg.source.resourceGeneration||source.storage.boundaryContractId!==cfg.source.boundaryContractId||source.storage.boundaryGeneration!==cfg.source.boundaryGeneration)return block('SOURCE_STORAGE_LINEAGE_STALE');
  // Historical capture snapshots remain importable after a boundary revision, but
  // cannot authorize a new transfer when the former effective capture contract is
  // no longer available to verify their classification and access scope.
  if(!captureSnapshotMatches(s,source.origin.capture,services))return block('SOURCE_CAPTURE_LINEAGE_STALE');
  if(!snapshotMatches(s,cfg.destination,services))return block('DESTINATION_BOUNDARY_STALE_OR_INELIGIBLE');
  if(cfg.source.resourceId===cfg.destination.resourceId||policy.distinctEnvironment&&cfg.source.boundaryContractId===cfg.destination.boundaryContractId)return block('DISTINCT_RESTRICTED_ENVIRONMENTS_REQUIRED');
  if(classRank[source.classification]>classRank[policy.maximumClassification])return block('POLICY_CLASSIFICATION_EXCEEDED');
  if(classRank[cfg.destination.informationClass]<classRank[source.classification])return block('DESTINATION_CLASSIFICATION_TOO_LOW');
  if(typeof services?.[cfg.source.resourceId]?.ready!=='boolean'||services[cfg.source.resourceId].ready!==true||services?.[cfg.destination.resourceId]?.ready!==true)return block('ARCHIVE_RESOURCE_UNAVAILABLE');
  if(!authorize(services,s,cfg.source.resourceId)||!authorize(services,s,cfg.destination.resourceId))return block('RESOURCE_AUTHORITY_UNAVAILABLE');
  const sourceArchive=s.resources[cfg.source.resourceId]?.effective,dest=s.resources[cfg.destination.resourceId]?.effective,flow=s.boundaries?.contracts?.find(x=>x.id===cfg.destination.boundaryContractId)?.effective?.flows?.find(x=>x.id===cfg.destination.flowId),role=c.role;
  if(!sourceArchive||source.region!==sourceArchive.region)return block('SOURCE_STORAGE_LOCATION_MISMATCH');
  if(!id(role)||!source.access?.includes(role)||!source.storage.accessRoles.includes(role)||!dest?.access?.includes(role)||!flow?.accessRoles.includes(role)||!canRead(s,source,role,source.region))return block('TRANSFER_ACCESS_DENIED');
  const classification=classes[Math.max(classRank[source.classification],classRank[cfg.destination.informationClass])];
  if(classRank[classification]>classRank[policy.maximumClassification])return block('DESTINATION_CLASSIFICATION_EXCEEDS_POLICY');
  if(s.records.length>=500)return block('RECORD_CAPACITY');
  if(!integer(dest.retentionDays,1)||!Number.isSafeInteger(source.expiresAt))return block('RETENTION_UNPROVEN');
  if(dest.capacity<Math.ceil((s.records.filter(x=>!x.deleted).length+1)/100))return block('DESTINATION_ARCHIVE_CAPACITY');
  const expiresAt=Math.min(source.expiresAt,s.clock+dest.retentionDays*1440);if(expiresAt<=s.clock)return block('RETENTION_EXPIRED');
  const access=source.access.filter(x=>source.storage.accessRoles.includes(x)&&dest.access.includes(x)&&flow.accessRoles.includes(x)&&s.information.boundary.effective?.readers.includes(x));
  if(!access.includes(role))return block('TRANSFER_ACCESS_DENIED');
  const outputId=`record-${s.nextId++}`,storage=copy(cfg.destination);
  const output={id:outputId,kind:source.kind,interaction:source.interaction,parents:[source.id],...(source.captureRegion!==undefined?{captureRegion:source.captureRegion}:{}),...(source.processRegion!==undefined?{processRegion:source.processRegion}:{}),region:dest.region,retentionDays:Math.max(1,Math.ceil((expiresAt-s.clock)/1440)),access,createdAt:s.clock,expiresAt,quality:source.quality,language:source.language,held:false,deleted:false,redacted:!!source.redacted,pack:PACK,origin:copy(source.origin),classification,storage,interfaceTransfer:{id:idValue,interfaceId:node.id,policyId:cfg.policyId,sourceRecord:source.id,at:s.clock,sourceStorage:copy(source.storage),destinationStorage:copy(cfg.destination),classification}};
  s.records.push(output);result.status='complete';result.reason=null;result.outputRecordId=outputId;result.sourceStorage=copy(source.storage);result.destinationStorage=copy(cfg.destination);result.classification=classification;transferReceipt(o,result);audit(s,'INFORMATION_TRANSFER_COMPLETED',{transfer:idValue,interfaceId:node.id,policyId:cfg.policyId,source:source.id,destination:outputId,classification});return copy(result);
 }
 function reason(s,j,services,speechGate){
  const p=j.plan,proc=s.resources[p.processor]?.effective,archive=s.resources[p.archive]?.effective,b=s.information.boundary.effective;
  const source=s.records.find(r=>r.id===j.parent),i=s.interactions.find(i=>i.id===j.interaction);
  if(!source||source.deleted)return 'PROCESSING_SOURCE_UNAVAILABLE';
  if(!b||!proc||!archive||!services[p.processor]?.ready||!services[p.archive]?.ready)return 'PROCESSING_DEPENDENCY';
  if(source.storage&&!(p.archive===source.storage.resourceId&&snapshotMatches(s,source.storage,services)))return 'PROCESSING_STORAGE_INTERFACE_REQUIRED';
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
  for(const node of o.interfaces||[])if(node.provisioning.status==='pending'&&node.provisioning.due<=s.clock)provisionInterface(s,node,services);
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
   const record={id:'record-'+s.nextId++,kind,interaction:j.interaction,parents:[parent.id],captureRegion:parent.captureRegion,processRegion:proc.region,region:archive.region,retentionDays:Math.min(p.retentionDays,archive.retentionDays,parent.retentionDays),access:p.access.filter(role=>parent.access.includes(role)&&archive.access.includes(role)&&o.boundary.effective.readers.includes(role)),createdAt:s.clock,expiresAt:Math.min(parent.expiresAt??Infinity,s.clock+Math.min(p.retentionDays,archive.retentionDays)*1440),quality,language:kind==='translation'?p.targetLanguage:parent.language||interaction?.language||'en',held:false,deleted:false,redacted:kind==='redaction'||!!parent.redacted,pack:PACK,...(parent.origin?{origin:copy(parent.origin),classification:parent.classification,storage:copy(parent.storage)}:{})};
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
   s.records.push(r);booking.record=r.id;enqueue(s,r,null,services);audit(s,'MEETING_RECORDED',{booking:booking.id,record:r.id});
  }
  const receipt=audit(s,result.success?'MEETING_JOINED':'MEETING_JOIN_FAILED',{booking:booking.id,reasons:result.reasons,features:copy(result.features),record:booking.record||null});result.auditId=receipt.auditId;booking.lastJoin=copy(result);return result;
 }
 const fields={start:[],configure:['kind','config'],interface:['id','policyId','sourceResource','destinationResource'], 'revoke-interface':['interfaceId'],transfer:['interfaceId','recordId','role'],process:['record'],read:['record','role','region'],hold:['record','role','held'],remove:['record','role'],book:['start','end','attendees','event','language'],cancel:['booking'],join:['booking']};
 function command(s,c,services,baseMeeting,emit){
  if(!c||!own(fields,c.action)||Object.keys(c).some(k=>!['action',...fields[c.action]].includes(k)))fail('INVALID_INFORMATION_COMMAND');
  if(c.action==='start'){if(s.information)fail('INFORMATION_ALREADY_STARTED');s.information=create(s);return;}
  const o=s.information;if(!o)fail('INFORMATION_NOT_STARTED');
  if(c.action==='configure'){
   if(!own(schemas,c.kind)||!c.config||Array.isArray(c.config))fail('INVALID_INFORMATION_CONFIG');const n=o[c.kind],desired={...n.desired,...copy(c.config)};config(c.kind,desired);
   if(c.kind==='pipeline'&&(s.resources[desired.processor]?.kind!=='processor'||s.resources[desired.archive]?.kind!=='archive'))fail('INVALID_PROCESSING_RESOURCE');
   n.desired=desired;n.generation++;n.provisioning={status:'pending',due:s.clock+1,generation:n.generation};
  }else if(c.action==='interface'){
   if(s.scenario!=='defence'||!id(c.id)||!own(interfacePolicies,c.policyId)||!id(c.sourceResource)||!id(c.destinationResource))fail('INVALID_SCENARIO_INTERFACE');
   const policy=interfacePolicies[c.policyId],source=boundarySnapshot(s,c.sourceResource,services),destination=boundarySnapshot(s,c.destinationResource,services);
  if(!source||!destination)fail('INTERFACE_ENDPOINT_BOUNDARY_REQUIRED');
   if(s.resources[c.sourceResource]?.kind!=='archive'||s.resources[c.destinationResource]?.kind!=='archive')fail('INTERFACE_ENDPOINT_MUST_BE_ARCHIVE');
   if(!authorize(services,s,c.sourceResource)||!authorize(services,s,c.destinationResource))fail('INTERFACE_RESOURCE_AUTHORITY');
   if(policy.distinctEnvironment&&(source.resourceId===destination.resourceId||source.boundaryContractId===destination.boundaryContractId))fail('DISTINCT_RESTRICTED_ENVIRONMENTS_REQUIRED');
   if(!interfacePolicyValid(s,{policyId:c.policyId,source,destination,sourceResource:c.sourceResource,destinationResource:c.destinationResource,enabled:true}))fail('SCENARIO_INTERFACE_POLICY_MISMATCH');
   const oInterfaces=o.interfaces||(o.interfaces=[]),prior=oInterfaces.find(x=>x.id===c.id);if(!prior&&oInterfaces.length>=50)fail('INTERFACE_CAPACITY');
   const generation=prior?prior.generation+1:1,desired={policyId:c.policyId,sourceResource:c.sourceResource,destinationResource:c.destinationResource,enabled:true,source,destination};
   if(prior){prior.generation=generation;prior.desired=desired;prior.provisioning={status:'pending',due:s.clock+1,generation,errors:[]};}
   else oInterfaces.push({id:c.id,generation,desired,effective:null,provisioning:{status:'pending',due:s.clock+1,generation,errors:[]}});
  }else if(c.action==='revoke-interface'){
   if(!id(c.interfaceId))fail('INVALID_INFORMATION_INTERFACE_ID');const node=o.interfaces?.find(x=>x.id===c.interfaceId);if(!node)fail('UNKNOWN_INFORMATION_INTERFACE');
   if(!authorize(services,s,node.desired.sourceResource)||!authorize(services,s,node.desired.destinationResource))fail('INTERFACE_RESOURCE_AUTHORITY');
   node.generation++;node.desired={...copy(node.desired),enabled:false};node.provisioning={status:'pending',due:s.clock+1,generation:node.generation,errors:[]};
  }else if(c.action==='transfer'){
   if(!id(c.interfaceId)||!id(c.recordId)||!id(c.role))fail('INVALID_INFORMATION_TRANSFER');return transfer(s,c,services);
  }else if(['process','read','hold','remove'].includes(c.action)){
   const r=s.records.find(r=>r.id===c.record);if(!r||r.deleted)fail('RECORD_UNAVAILABLE');
  if(c.action==='process'){if(r.kind!=='recording')fail('RECORDING_REQUIRED');if(o.jobs.some(j=>j.source===r.id))fail('RECORD_ALREADY_PROCESSING');enqueue(s,r,typeof services.speechModelContext==='function'?services.speechModelContext(s,r):null,{...services,captureOrigin:false});}
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
  const hasInterfaceState=['interfaces','transfers','originReceipts','nextTransferId'].some(k=>own(o,k));
  if(hasInterfaceState&&(!Array.isArray(o.interfaces)||!Array.isArray(o.transfers)||!Array.isArray(o.originReceipts)||!integer(o.nextTransferId,1)||o.interfaces.length>50||o.transfers.length>200||o.originReceipts.length>500||o.transferPrunedThrough!==undefined&&!integer(o.transferPrunedThrough,0,o.nextTransferId-1)))fail('INVALID_INFORMATION_INTERFACE_HISTORY');
  for(const kind of Object.keys(schemas)){const n=o[kind];if(!n||!integer(n.generation,1)||!n.provisioning||n.provisioning.generation!==n.generation||!integer(n.provisioning.due)||!['pending','ready'].includes(n.provisioning.status))fail('INVALID_INFORMATION_PROVISIONING');config(kind,n.desired);if(n.effective)config(kind,n.effective);}
  for(const [key,max] of Object.entries({jobs:200,bookings:200,audit:500}))if(!Array.isArray(o[key])||o[key].length>max)fail('INVALID_INFORMATION_COLLECTION');
  const validEndpoint=x=>!!x&&Object.keys(x).sort().join(',')==='accessRoles,boundaryContractId,boundaryGeneration,eligible,flowId,informationClass,profile,resourceGeneration,resourceId,workload'&&id(x.resourceId)&&id(x.boundaryContractId)&&integer(x.boundaryGeneration,1)&&integer(x.resourceGeneration,1)&&id(x.flowId)&&id(x.workload)&&regions.includes(x.profile)&&classes.includes(x.informationClass)&&typeof x.eligible==='boolean'&&Array.isArray(x.accessRoles)&&x.accessRoles.length>0&&x.accessRoles.every(id)&&new Set(x.accessRoles).size===x.accessRoles.length;
  const liveEndpointConsistent=(s,x)=>{
   if(!x?.eligible)return true;
   const contract=s.boundaries?.contracts?.find(c=>c.id===x.boundaryContractId);
   if(!contract)return false;
   if(x.boundaryGeneration>contract.generation)return false;
   if(contract.generation!==x.boundaryGeneration)return true;
   const effective=contract.effective,flow=effective?.flows?.find(f=>f.id===x.flowId);
   return !!flow&&effective.profile===x.profile&&effective.workload===x.workload&&flow.resource===x.resourceId&&flow.resourceGeneration===x.resourceGeneration&&flow.informationClass===x.informationClass&&JSON.stringify(flow.accessRoles)===JSON.stringify(x.accessRoles);
  };
  const validOrigin=x=>!!x&&Object.keys(x).sort().join(',')==='capture,capturedAt,classification,complete,initialStorage,scenario,workload'&&['smb','enterprise','government','defence'].includes(x.scenario)&&id(x.workload)&&integer(x.capturedAt)&&classes.includes(x.classification)&&typeof x.complete==='boolean'&&validEndpoint(x.capture)&&validEndpoint(x.initialStorage)&&x.capture.resourceId==='recorder'&&x.initialStorage.resourceId==='archive'&&x.workload===x.capture.workload&&(!x.complete||x.capture.workload===x.initialStorage.workload&&x.capture.profile===x.initialStorage.profile&&x.capture.eligible&&x.initialStorage.eligible)&&x.classification===classes[Math.max(classRank[x.capture.informationClass],classRank[x.initialStorage.informationClass])];
  const endpointsEqual=(a,b)=>!!a&&!!b&&['resourceId','resourceGeneration','boundaryContractId','boundaryGeneration','flowId','workload','profile','informationClass'].every(k=>a[k]===b[k])&&JSON.stringify(a.accessRoles)===JSON.stringify(b.accessRoles);
  const recordIds=new Set();for(const r of s.records){if(recordIds.has(r.id)||r.parents.some(p=>!recordIds.has(p)))fail('INFORMATION_LINEAGE');recordIds.add(r.id);if(r.expiresAt!==undefined&&(!integer(r.expiresAt,0,Number.MAX_SAFE_INTEGER)||typeof r.deleted!=='boolean'||typeof r.held!=='boolean'||!integer(r.quality,0,100)))fail('INVALID_INFORMATION_RECORD');if(r.origin!==undefined){if(!validOrigin(r.origin)||!classes.includes(r.classification)||!validEndpoint(r.storage)||classRank[r.classification]<classRank[r.origin.classification]||![r.origin.capture,r.origin.initialStorage,r.storage].every(x=>liveEndpointConsistent(s,x))||r.access.some(role=>!r.storage.accessRoles.includes(role)))fail('INVALID_INFORMATION_ORIGIN');if(r.parents.length){const parent=s.records.find(x=>x.id===r.parents[0]);if(!parent?.origin||JSON.stringify(r.origin)!==JSON.stringify(parent.origin)||classRank[r.classification]<classRank[parent.classification]||!integer(parent.expiresAt,0)||!integer(r.expiresAt,0,parent.expiresAt)||!Array.isArray(r.access)||r.access.some(role=>!parent.access.includes(role)))fail('INVALID_INFORMATION_ORIGIN_LINEAGE');if(r.interfaceTransfer){const x=r.interfaceTransfer;if(Object.keys(x).sort().join(',')!=='at,classification,destinationStorage,id,interfaceId,policyId,sourceRecord,sourceStorage'||!integer(x.at)||!id(x.id)||!id(x.interfaceId)||!own(interfacePolicies,x.policyId)||x.sourceRecord!==parent.id||!classes.includes(x.classification)||!validEndpoint(x.sourceStorage)||!validEndpoint(x.destinationStorage)||!interfacePolicyValid(s,{policyId:x.policyId,source:x.sourceStorage,destination:x.destinationStorage,sourceResource:x.sourceStorage.resourceId,destinationResource:x.destinationStorage.resourceId})||!endpointsEqual(parent.storage,x.sourceStorage)||!endpointsEqual(r.storage,x.destinationStorage)||x.classification!==r.classification||x.classification!==classes[Math.max(classRank[parent.classification],classRank[x.destinationStorage.informationClass])]||!integer(parent.expiresAt,0)||!integer(r.expiresAt,0,parent.expiresAt)||!Array.isArray(r.access)||r.access.some(role=>!parent.access.includes(role)||!x.sourceStorage.accessRoles.includes(role)||!x.destinationStorage.accessRoles.includes(role)))fail('INVALID_INFORMATION_TRANSFER_LINEAGE');}else if(!endpointsEqual(r.storage,parent.storage)||r.classification!==parent.classification)fail('INVALID_INFORMATION_DERIVED_LINEAGE');}else if(r.classification!==r.origin.classification||!endpointsEqual(r.storage,r.origin.initialStorage))fail('INVALID_INFORMATION_CAPTURE_LINEAGE');}}
  if(hasInterfaceState){
   const origins=new Map();for(const receipt of o.originReceipts){if(!receipt||Object.keys(receipt).sort().join(',')!=='at,origin,recordId'||!id(receipt.recordId)||!integer(receipt.at)||!validOrigin(receipt.origin)||receipt.origin.capturedAt!==receipt.at||origins.has(receipt.recordId))fail('INVALID_INFORMATION_ORIGIN_RECEIPT');origins.set(receipt.recordId,receipt.origin);}
   for(const [recordId,origin] of origins){const record=s.records.find(x=>x.id===recordId);if(!record||record.parents.length||!record.origin||JSON.stringify(origin)!==JSON.stringify(record.origin))fail('INVALID_INFORMATION_ORIGIN_RECEIPT');}
   for(const r of s.records)if(r.origin&&r.parents.length===0){const origin=origins.get(r.id);if(!origin||JSON.stringify(origin)!==JSON.stringify(r.origin))fail('INVALID_INFORMATION_ORIGIN_RECEIPT');}
   const ids=new Set();for(const node of o.interfaces){if(!node||Object.keys(node).sort().join(',')!=='desired,effective,generation,id,provisioning'||!id(node.id)||ids.has(node.id)||!integer(node.generation,1)||!node.provisioning||Object.keys(node.provisioning).sort().join(',')!=='due,errors,generation,status'||node.provisioning.generation!==node.generation||!integer(node.provisioning.due)||!['pending','ready','blocked'].includes(node.provisioning.status)||!Array.isArray(node.provisioning.errors)||node.provisioning.errors.some(x=>typeof x!=='string'))fail('INVALID_INFORMATION_INTERFACE');ids.add(node.id);
    const validConfig=d=>!!d&&Object.keys(d).sort().join(',')==='destination,destinationResource,enabled,policyId,source,sourceResource'&&own(interfacePolicies,d.policyId)&&id(d.sourceResource)&&id(d.destinationResource)&&typeof d.enabled==='boolean'&&validEndpoint(d.source)&&validEndpoint(d.destination)&&liveEndpointConsistent(s,d.source)&&liveEndpointConsistent(s,d.destination)&&d.source.resourceId===d.sourceResource&&d.destination.resourceId===d.destinationResource&&s.resources?.[d.sourceResource]?.kind==='archive'&&s.resources?.[d.destinationResource]?.kind==='archive'&&interfacePolicyValid(s,d);
    if(!validConfig(node.desired)||node.effective!==null&&!validConfig(node.effective)||node.provisioning.status==='ready'&&node.provisioning.generation===node.generation&&JSON.stringify(node.effective)!==JSON.stringify(node.desired))fail('INVALID_INFORMATION_INTERFACE_CONFIG');
   }
   let transferId=o.transferPrunedThrough||0;for(const receipt of o.transfers){if(!receipt||!['blocked','complete'].includes(receipt.status)||!integer(receipt.at,0,s.clock)||!id(receipt.id)||!/^transfer-[1-9]\d*$/.test(receipt.id)||Number(receipt.id.slice(9))<=transferId||Number(receipt.id.slice(9))>=o.nextTransferId||!id(receipt.interfaceId)||!id(receipt.recordId)||receipt.status==='blocked'&&typeof receipt.reason!=='string'||receipt.status==='complete'&&receipt.reason!==null)fail('INVALID_INFORMATION_TRANSFER_RECEIPT');transferId=Number(receipt.id.slice(9));
    if(receipt.status==='blocked'){if(Object.keys(receipt).sort().join(',')!=='at,id,interfaceId,reason,recordId,status'||!receipt.reason)fail('INVALID_INFORMATION_TRANSFER_RECEIPT');}
    else if(Object.keys(receipt).sort().join(',')!=='at,classification,destinationStorage,id,interfaceId,outputRecordId,reason,recordId,sourceStorage,status'||!id(receipt.outputRecordId)||!classes.includes(receipt.classification)||!validEndpoint(receipt.sourceStorage)||!validEndpoint(receipt.destinationStorage)||!liveEndpointConsistent(s,receipt.sourceStorage)||!liveEndpointConsistent(s,receipt.destinationStorage))fail('INVALID_INFORMATION_TRANSFER_RECEIPT');
    if(receipt.status==='complete'){const source=s.records.find(x=>x.id===receipt.recordId),output=s.records.find(x=>x.id===receipt.outputRecordId);if(!source||!output||output.interfaceTransfer?.id!==receipt.id||output.parents[0]!==source.id||!endpointsEqual(output.storage,receipt.destinationStorage)||!endpointsEqual(source.storage,receipt.sourceStorage)||output.classification!==receipt.classification)fail('INVALID_INFORMATION_TRANSFER_RECEIPT');}
   }
   for(const r of s.records.filter(x=>x.interfaceTransfer)){const receipt=o.transfers.find(x=>x.id===r.interfaceTransfer.id);if(receipt){if(receipt.status!=='complete'||receipt.outputRecordId!==r.id)fail('INVALID_INFORMATION_TRANSFER_LINEAGE');}else if(Number(r.interfaceTransfer.id.slice(9))>(o.transferPrunedThrough||0))fail('INVALID_INFORMATION_TRANSFER_LINEAGE');}
  }
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
 return {PACK,schemas,steps,interfacePolicies,config,create,fingerprint,inspect,enqueue,canRead,advance,command,validate,source};
}
const SOC_INFORMATION=socInformationKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_INFORMATION;
