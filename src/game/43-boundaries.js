/* Optional fictional workload-boundary contracts. Research IDs are context, never legal claims. */
function socBoundariesKernel(){
 'use strict';
 const PACK='soc-boundaries-1',VERSION=1,regions=['AU','US','JP','EU'],classes=['public','internal','confidential','restricted'],editions=['standard','government','local'],authorizations=['customer-approved','joint-approved','provider-scoped'],licences=['cloud','local-grace','none'],continuities=['cloud','local'],transferMechanisms=['adequacy','safeguards','derogation'];
 const copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),fail=code=>{throw new Error(code);};
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x),list=(x,max=32)=>Array.isArray(x)&&x.length>0&&x.length<=max&&x.every(y=>typeof y==='string'&&y.length<=80)&&new Set(x).size===x.length,arr=(x,max=32)=>Array.isArray(x)&&x.length<=max&&x.every(y=>typeof y==='string'&&y.length<=80)&&new Set(x).size===x.length;
 const profileSources={AU:['RES-AU-CLOUD-001'],US:['RES-US-CLOUD-001'],JP:['RES-JP-CLOUD-001','RES-JP-AI-001'],EU:['RES-EU-TRANSFER-001']};
 const profiles={
  AU:{id:'AU',fictionalRule:'domestic-control',sourceIds:profileSources.AU,requirements:{processingRegions:['AU'],storageRegions:['AU'],backupRegions:['AU'],keyRegions:['AU'],adminRegions:['AU'],supportRegions:['AU'],adminAuthorization:'customer-approved',allowedTransferMechanisms:[]}},
  US:{id:'US',fictionalRule:'eligible-administration',sourceIds:profileSources.US,requirements:{processingRegions:regions,storageRegions:regions,backupRegions:regions,keyRegions:regions,adminRegions:regions,supportRegions:regions,adminAuthorization:'customer-approved',allowedTransferMechanisms:transferMechanisms}},
  JP:{id:'JP',fictionalRule:'registered-service-language',sourceIds:profileSources.JP,requirements:{processingRegions:['JP'],storageRegions:regions,backupRegions:regions,keyRegions:regions,adminRegions:regions,supportRegions:['JP'],adminAuthorization:'customer-approved',allowedTransferMechanisms:transferMechanisms}},
  EU:{id:'EU',fictionalRule:'union-region-transfer-path',sourceIds:profileSources.EU,requirements:{processingRegions:['EU'],storageRegions:['EU'],backupRegions:['EU'],keyRegions:['EU'],adminRegions:regions,supportRegions:regions,adminAuthorization:'customer-approved',allowedTransferMechanisms:transferMechanisms}}
 };
 const profileKeys=['AU','US','JP','EU'];
 const topKeys=['id','workload','profile','sensitivity','edition','productVersion','offeringEvidence','customerAuthorization','agencyAuthorizationRequired','agencyAuthorization','serviceRegistration','serviceRegistrationId','usesAi','aiUseDecision','language','supportLanguage','requirements','flows'];
 const requirementKeys=['processingRegions','storageRegions','backupRegions','keyRegions','adminRegions','supportRegions','allowedAccessRoles','adminAuthorization','continuity','allowedTransferMechanisms'];
 const flowKeys=['id','resource','informationClass','processingRegions','storageRegions','backupRegions','keyCustodyRegions','adminLocations','supportRegions','adminAuthorization','accessRoles','connectivity','continuity','licenceMode','transfer'];
 const observedKeys=['connected','cloudLicenceAvailable','localLicenceGraceActive','localLicenceGraceExpiresAt','localServicesAvailable','localKeyCustodyAvailable','adminPathAvailable','adminPathLocation'];
 const sorted=o=>Object.keys(o||{}).sort().join(',');
 const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&sorted(o)===[...keys].sort().join(',');
 function validateRequirements(r){
  if(!exact(r,requirementKeys))fail('INVALID_BOUNDARY_REQUIREMENTS');
  for(const k of ['processingRegions','storageRegions','backupRegions','keyRegions','adminRegions','supportRegions','allowedAccessRoles'])if(!list(r[k],16))fail('INVALID_BOUNDARY_REQUIREMENT_LIST');
  if(!arr(r.allowedTransferMechanisms,16))fail('INVALID_BOUNDARY_REQUIREMENT_LIST');
  for(const k of ['processingRegions','storageRegions','backupRegions','keyRegions','adminRegions','supportRegions'])if(r[k].some(x=>!regions.includes(x)))fail('INVALID_BOUNDARY_REGION');
  if(!authorizations.includes(r.adminAuthorization)||!continuities.includes(r.continuity)||r.allowedTransferMechanisms.some(x=>!transferMechanisms.includes(x)))fail('INVALID_BOUNDARY_REQUIREMENTS');
 }
 function validateFlow(f,resources,stored=false){
  if(!f||!exact(f,stored?[...flowKeys,'resourceGeneration']:flowKeys)||!id(f.id)||!id(f.resource)||!classes.includes(f.informationClass))fail('INVALID_BOUNDARY_FLOW');
  for(const k of ['processingRegions','storageRegions','backupRegions','keyCustodyRegions','adminLocations','supportRegions','accessRoles'])if(!list(f[k],16))fail('INVALID_BOUNDARY_FLOW_LIST');
  for(const k of ['processingRegions','storageRegions','backupRegions','keyCustodyRegions','adminLocations','supportRegions'])if(f[k].some(x=>!regions.includes(x)))fail('INVALID_BOUNDARY_REGION');
  if(!authorizations.includes(f.adminAuthorization)||!['cloud','local','hybrid'].includes(f.connectivity)||!continuities.includes(f.continuity)||!licences.includes(f.licenceMode))fail('INVALID_BOUNDARY_FLOW');
  if(!exact(f.transfer,['parties','mechanism'])||!arr(f.transfer.parties,16)||f.transfer.mechanism!==null&&!transferMechanisms.includes(f.transfer.mechanism))fail('INVALID_BOUNDARY_TRANSFER');
  if(resources){const r=resources[f.resource];if(!r||!Number.isSafeInteger(r.generation)||stored&&r.generation!==f.resourceGeneration)fail(stored?'BOUND_RESOURCE_GENERATION_STALE':'BOUND_RESOURCE_UNAVAILABLE');}
  if(stored&&(!Number.isSafeInteger(f.resourceGeneration)||f.resourceGeneration<1))fail('INVALID_BOUNDARY_FLOW');
 }
 function validateContractInput(c,s){
  if(!exact(c,topKeys)||!id(c.workload)||!profileKeys.includes(c.profile)||!classes.includes(c.sensitivity)||!editions.includes(c.edition)||typeof c.productVersion!=='string'||!/^[a-z][a-z0-9.-]{0,31}$/.test(c.productVersion)||!['pending','eligible','ineligible'].includes(c.offeringEvidence)||!['pending','approved','denied'].includes(c.customerAuthorization)||typeof c.agencyAuthorizationRequired!=='boolean'||!['not-required','pending','approved','denied'].includes(c.agencyAuthorization)||!['not-registered','registered'].includes(c.serviceRegistration)||c.serviceRegistrationId!==null&&!id(c.serviceRegistrationId)||typeof c.usesAi!=='boolean'||!['not-required','pending','approved','denied'].includes(c.aiUseDecision)||!['en','ja','fr','de'].includes(c.language)||!['en','ja','fr','de'].includes(c.supportLanguage)||!Array.isArray(c.flows)||c.flows.length<1||c.flows.length>50)fail('INVALID_BOUNDARY_CONTRACT');
  if(!c.agencyAuthorizationRequired&&c.agencyAuthorization!=='not-required'||c.agencyAuthorizationRequired&&c.agencyAuthorization==='not-required')fail('INVALID_AGENCY_AUTHORIZATION');
  if(c.serviceRegistration==='registered'&&!c.serviceRegistrationId||c.serviceRegistration==='not-registered'&&c.serviceRegistrationId!==null)fail('INVALID_SERVICE_REGISTRATION');
  if(!c.usesAi&&c.aiUseDecision!=='not-required')fail('INVALID_AI_USE_DECISION');if(c.usesAi&&c.aiUseDecision==='not-required')fail('INVALID_AI_USE_DECISION');
  validateRequirements(c.requirements);const flowIds=new Set();for(const f of c.flows){validateFlow(f,s?.resources);if(flowIds.has(f.id))fail('DUPLICATE_BOUNDARY_FLOW');flowIds.add(f.id);}
 }
 function storedConfig(c,s){validateContractInput(c,s);return {...copy(c),flows:c.flows.map(f=>({...copy(f),resourceGeneration:s.resources[f.resource].generation}))};}
 function create(s){if(!s||!Number.isSafeInteger(s.clock)||s.clock<0)fail('INVALID_BOUNDARY_STATE');return {pack:PACK,version:VERSION,clock:s.clock,nextId:1,contracts:[],bindings:{}};}
 function command(s,c){const b=s?.boundaries||s;if(!b||b.pack!==PACK||!c||typeof c!=='object'||Array.isArray(c)||typeof c.action!=='string')fail('BOUNDARIES_NOT_STARTED');
  if(c.action==='contract'){
   if(!exact(c,['action','contract']))fail('INVALID_BOUNDARY_COMMAND');const input=c.contract;if(!input||!id(input.id))fail('INVALID_BOUNDARY_CONTRACT');const old=b.contracts.find(x=>x.id===input.id);if(!old&&b.contracts.length>=500)fail('BOUNDARY_CONTRACT_CAPACITY');const desired=storedConfig(input,s);const now=Math.max(Number.isSafeInteger(s.clock)?s.clock:0,b.clock);if(!old){b.contracts.push({id:input.id,desired,effective:null,generation:1,provisioning:{status:'pending',due:now+1,generation:1,errors:[]},observed:{connected:true,cloudLicenceAvailable:false,localLicenceGraceActive:false,localLicenceGraceExpiresAt:null,localServicesAvailable:false,localKeyCustodyAvailable:false,adminPathAvailable:false,adminPathLocation:null}});}else{old.desired=desired;old.generation++;old.provisioning={status:'pending',due:now+1,generation:old.generation,errors:[]};}return null;
  }
  if(c.action==='observe'){
   if(!exact(c,['action','contract','observed'])||!id(c.contract))fail('INVALID_BOUNDARY_COMMAND');const item=b.contracts.find(x=>x.id===c.contract);if(!item)fail('UNKNOWN_BOUNDARY_CONTRACT');const o=c.observed;if(!exact(o,observedKeys)||['connected','cloudLicenceAvailable','localLicenceGraceActive','localServicesAvailable','localKeyCustodyAvailable','adminPathAvailable'].some(k=>typeof o[k]!=='boolean')||o.localLicenceGraceExpiresAt!==null&&!Number.isSafeInteger(o.localLicenceGraceExpiresAt)||o.adminPathLocation!==null&&!regions.includes(o.adminPathLocation))fail('INVALID_BOUNDARY_OBSERVATION');item.observed=copy(o);return null;
  }
  if(c.action==='bind'){
   if(!exact(c,['action','resource','contract'])||!id(c.resource)||!id(c.contract))fail('INVALID_BOUNDARY_BINDING');const cfg=b.contracts.find(x=>x.id===c.contract);if(!s.resources?.[c.resource]||!cfg||!cfg.desired.flows.some(f=>f.resource===c.resource))fail('INVALID_BOUNDARY_BINDING');if(s.jurisdiction&&s.jurisdiction!==cfg.desired.profile)fail('BOUNDARY_PROFILE_JURISDICTION_MISMATCH');b.bindings[c.resource]=c.contract;return {resource:c.resource,contract:c.contract};
  }
  fail('INVALID_BOUNDARY_COMMAND');
 }
 function advance(s,clock){const b=s?.boundaries||s;if(!b||b.pack!==PACK)return 0;const now=Math.max(Number.isSafeInteger(s.clock)?s.clock:0,b.clock);if(!Number.isSafeInteger(clock)||clock<now)fail('INVALID_BOUNDARY_CLOCK');b.clock=clock;for(const c of b.contracts){if(c.provisioning.status!=='pending'||c.provisioning.due>clock)continue;const errors=[];for(const f of c.desired.flows){const r=s.resources?.[f.resource];if(!r)errors.push(`RESOURCE_MISSING:${f.id}:${f.resource}`);else if(r.generation!==f.resourceGeneration)errors.push(`RESOURCE_GENERATION_STALE:${f.id}:${f.resource}`);}c.provisioning.errors=errors;c.provisioning.status=errors.length?'failed':'ready';if(!errors.length)c.effective=copy(c.desired);}return b;}
 const classRank=Object.fromEntries(classes.map((x,i)=>[x,i]));
 function evaluate(s,key){const b=s?.boundaries||s,c=b?.contracts?.find(x=>x.id===key);if(!c)fail('UNKNOWN_BOUNDARY_CONTRACT');const reasons=[],add=(code,path,flowId)=>reasons.push({code,path,...(flowId?{flowId}:{})});
  if(!c.effective){add('CONTRACT_NOT_EFFECTIVE','contract.effective');return {contract:c.id,profile:c.desired.profile,workload:c.desired.workload,eligible:false,blocking:reasons,resourceBindings:[],synthetic:true,legalApprovalClaim:false};}
  const d=c.effective,p=profiles[d.profile],r=d.requirements;
  if(c.provisioning.status!=='ready')add('CONTRACT_PROVISIONING_FAILED','contract.provisioning');
  if(d.profile==='US'){if(d.offeringEvidence!=='eligible')add('US_OFFERING_EVIDENCE_REQUIRED','contract.offeringEvidence');if(d.customerAuthorization!=='approved')add('US_CUSTOMER_AUTHORIZATION_REQUIRED','contract.customerAuthorization');if(d.agencyAuthorizationRequired&&d.agencyAuthorization!=='approved')add('US_AGENCY_AUTHORIZATION_REQUIRED','contract.agencyAuthorization');}
  if(d.profile==='JP'){if(d.serviceRegistration!=='registered')add('JP_SERVICE_REGISTRATION_REQUIRED','contract.serviceRegistration');if(d.language!=='ja'||d.supportLanguage!=='ja')add('JP_LANGUAGE_SUPPORT_REQUIRED','contract.language');if(d.usesAi&&d.aiUseDecision!=='approved')add('JP_AI_USE_REVIEW_REQUIRED','contract.aiUseDecision');}
  if(d.profile==='AU'&&r.adminAuthorization!=='customer-approved')add('AU_CUSTOMER_CONTROL_REQUIRED','contract.requirements.adminAuthorization');
  if(d.profile==='EU'&&r.processingRegions.some(x=>x!=='EU'))add('EU_PROFILE_IS_UNION_WIDE','contract.requirements.processingRegions');
  const bindings=[];for(const f of d.flows){bindings.push({flowId:f.id,resource:f.resource,generation:f.resourceGeneration});const path=`flows.${f.id}`;
   const compare=(field,actual,allowed,code)=>{for(const value of actual)if(!allowed.includes(value))add(code,`${path}.${field}`,f.id);};
   if(classRank[f.informationClass]<classRank[d.sensitivity])add('INFORMATION_CLASSIFICATION_TOO_LOW',`${path}.informationClass`,f.id);
   compare('processingRegions',f.processingRegions,r.processingRegions,'PROCESSING_REGION_NOT_ALLOWED');compare('storageRegions',f.storageRegions,r.storageRegions,'STORAGE_REGION_NOT_ALLOWED');compare('backupRegions',f.backupRegions,r.backupRegions,'BACKUP_REGION_NOT_ALLOWED');compare('keyCustodyRegions',f.keyCustodyRegions,r.keyRegions,'KEY_CUSTODY_REGION_NOT_ALLOWED');compare('adminLocations',f.adminLocations,r.adminRegions,'ADMIN_LOCATION_NOT_ALLOWED');compare('supportRegions',f.supportRegions,r.supportRegions,'SUPPORT_LOCATION_NOT_ALLOWED');
   for(const role of f.accessRoles)if(!r.allowedAccessRoles.includes(role))add('ACCESS_ROLE_NOT_ALLOWED',`${path}.accessRoles`,f.id);
   if(f.adminAuthorization!==r.adminAuthorization)add('ADMIN_AUTHORIZATION_MISMATCH',`${path}.adminAuthorization`,f.id);
   if(f.continuity!==r.continuity)add('CONTINUITY_REQUIREMENT_MISMATCH',`${path}.continuity`,f.id);
   for(const region of [...f.processingRegions,...f.storageRegions,...f.backupRegions,...f.keyCustodyRegions,...f.adminLocations,...f.supportRegions])if(!p.requirements.processingRegions.includes(region)&&d.profile==='AU')add('AU_DOMESTIC_CONTROL_REGION',`${path}.regions`,f.id);
   if(d.profile==='JP'&&f.supportRegions.some(x=>x!=='JP'))add('JP_SUPPORT_REGION_NOT_PERMITTED',`${path}.supportRegions`,f.id);
   if(d.profile==='EU'){
    const transferRegions=[...f.processingRegions,...f.storageRegions,...f.backupRegions,...f.keyCustodyRegions,...f.adminLocations,...f.supportRegions].filter(x=>x!=='EU');
    if(transferRegions.length&&(!f.transfer.parties.length||!f.transfer.mechanism||!r.allowedTransferMechanisms.includes(f.transfer.mechanism)))add('EU_TRANSFER_PATH_REQUIRED',`${path}.transfer`,f.id);
   }
   if(f.licenceMode==='cloud'&&!c.observed.cloudLicenceAvailable)add('CLOUD_LICENCE_UNAVAILABLE',`${path}.licenceMode`,f.id);
   if(f.licenceMode==='local-grace'&&(!c.observed.localLicenceGraceActive||!Number.isSafeInteger(c.observed.localLicenceGraceExpiresAt)||c.observed.localLicenceGraceExpiresAt<=(Number.isSafeInteger(s.clock)?s.clock:b.clock)))add('LOCAL_LICENCE_GRACE_UNAVAILABLE',`${path}.licenceMode`,f.id);
   if(!s.resources?.[f.resource]||s.resources[f.resource].generation!==f.resourceGeneration)add('BOUND_RESOURCE_GENERATION_STALE',`${path}.resource`,f.id);
  }
  if(!c.observed.adminPathAvailable)add('ADMIN_PATH_UNAVAILABLE','observed.adminPathAvailable');
  else if(!c.observed.adminPathLocation)add('ADMIN_PATH_LOCATION_UNDECLARED','observed.adminPathLocation');
  else if(!r.adminRegions.includes(c.observed.adminPathLocation))add('ADMIN_PATH_LOCATION_NOT_ALLOWED','observed.adminPathLocation');
  if(!c.observed.connected){
   if(r.continuity!=='local')add('DISCONNECTED_CLOUD_ONLY','requirements.continuity');
   if(!c.observed.localServicesAvailable)add('LOCAL_SERVICES_UNAVAILABLE','observed.localServicesAvailable');
   if(!c.observed.localKeyCustodyAvailable)add('LOCAL_KEY_CUSTODY_UNAVAILABLE','observed.localKeyCustodyAvailable');
   if(!d.flows.some(f=>f.licenceMode==='local-grace'&&c.observed.localLicenceGraceActive&&Number.isSafeInteger(c.observed.localLicenceGraceExpiresAt)&&c.observed.localLicenceGraceExpiresAt>(Number.isSafeInteger(s.clock)?s.clock:b.clock)))add('DISCONNECTED_LICENSE_UNAVAILABLE','observed.localLicenceGraceExpiresAt');
   for(const f of d.flows){if(f.continuity!=='local')add('FLOW_HAS_NO_LOCAL_CONTINUITY',`flows.${f.id}.continuity`,f.id);if(f.connectivity==='cloud')add('FLOW_REQUIRES_CLOUD_CONNECTIVITY',`flows.${f.id}.connectivity`,f.id);if(f.licenceMode!=='local-grace')add('FLOW_REQUIRES_LOCAL_LICENSE_GRACE',`flows.${f.id}.licenceMode`,f.id);}
  }
  return {contract:c.id,profile:d.profile,workload:d.workload,eligible:reasons.length===0,blocking:reasons,resourceBindings:bindings,profileRule:p.fictionalRule,sourceIds:[...p.sourceIds],synthetic:true,legalApprovalClaim:false};
 }
 function validate(s){const b=s?.boundaries||s;if(!b||b.pack!==PACK||b.version!==VERSION||!Number.isSafeInteger(b.clock)||b.clock<0||!Number.isSafeInteger(b.nextId)||b.nextId<1||!Array.isArray(b.contracts)||b.contracts.length>500||!b.bindings||Array.isArray(b.bindings)||Object.keys(b.bindings).length>500)fail('INVALID_BOUNDARY_SAVE');const ids=new Set();for(const c of b.contracts){if(!c||!id(c.id)||ids.has(c.id)||!Number.isSafeInteger(c.generation)||c.generation<1||!exact(c.provisioning,['status','due','generation','errors'])||!['pending','ready','failed'].includes(c.provisioning.status)||c.provisioning.generation!==c.generation||!Number.isSafeInteger(c.provisioning.due)||c.provisioning.due<0||!Array.isArray(c.provisioning.errors)||c.provisioning.errors.length>50||c.provisioning.errors.some(x=>typeof x!=='string')||!exact(c.observed,observedKeys)||['connected','cloudLicenceAvailable','localLicenceGraceActive','localServicesAvailable','localKeyCustodyAvailable','adminPathAvailable'].some(k=>typeof c.observed[k]!=='boolean')||c.observed.localLicenceGraceExpiresAt!==null&&!Number.isSafeInteger(c.observed.localLicenceGraceExpiresAt)||c.observed.adminPathLocation!==null&&!regions.includes(c.observed.adminPathLocation)||!c.desired||c.desired.id!==c.id)fail('INVALID_BOUNDARY_SAVE');ids.add(c.id);const res=(cfg)=>Object.fromEntries(cfg.flows.map(f=>[f.resource,{generation:f.resourceGeneration}]));const clean=cfg=>({...cfg,flows:cfg.flows.map(({resourceGeneration,...f})=>f)});validateContractInput(clean(c.desired),{resources:res(c.desired)});if(c.effective){if(c.effective.id!==c.id)fail('INVALID_BOUNDARY_EFFECTIVE');validateContractInput(clean(c.effective),{resources:res(c.effective)});}if(c.provisioning.status==='ready'&&(!c.effective||!same(c.desired,c.effective)))fail('INVALID_BOUNDARY_EFFECTIVE');}for(const [resource,key] of Object.entries(b.bindings)){const cfg=b.contracts.find(x=>x.id===key);if(!id(resource)||!s.resources?.[resource]||!cfg||!cfg.desired.flows.some(f=>f.resource===resource)||s.jurisdiction&&s.jurisdiction!==cfg.desired.profile)fail('INVALID_BOUNDARY_BINDING');}return true;}
 function inspect(s){const b=s?.boundaries||s;validate(s);return {pack:PACK,version:VERSION,profiles:copy(profiles),bindings:copy(b.bindings),contracts:b.contracts.map(c=>({id:c.id,generation:c.generation,desired:copy(c.desired),effective:c.effective?copy(c.effective):null,provisioning:copy(c.provisioning),observed:copy(c.observed),evaluation:evaluate(s,c.id)}))};}
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function fingerprint(s){const b=s?.boundaries||s;validate(s);return JSON.stringify(stable([b.pack,b.version,b.bindings,b.contracts.map(c=>[c.id,c.generation,c.desired,c.effective,c.provisioning,c.observed])]));}
 const source=()=>`const SOC_BOUNDARIES=(${socBoundariesKernel.toString()})();`;
 function contractForResource(s,resource){const b=s?.boundaries||s,key=b?.bindings?.[resource];return key?b.contracts.find(c=>c.id===key)||null:null;}
 return {PACK,VERSION,profiles,create,command,advance,validate,inspect,evaluate,contractForResource,fingerprint,source};
}
const SOC_BOUNDARIES=socBoundariesKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_BOUNDARIES;
