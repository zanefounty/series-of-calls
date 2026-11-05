/* Versioned, fictional Government mission architecture recipes. */
function socGovernmentArchitecturesKernel(){
 'use strict';
 const VERSION=1,REGIONS=['AU','US','JP','EU'];
 const SOURCE_IDS=Object.freeze([
  'uc-new:family:microsoft:government-clouds',
  'uc-new:family:cisco:government',
  'uc-new:family:microsoft:local',
  'uc-new:family:cisco:local-speech'
 ]);
 const recipes=Object.freeze({
  'regional-cloud':Object.freeze({id:'regional-cloud',name:'Regional cloud with workload-scoped service',productFamilies:['microsoft:government-clouds','cisco:government'],speechMode:'cloud',setupCents:120000,periodCents:16000,leadMinutes:14,engineers:1,support:1,workload:Object.freeze({captureSessionsPerPeriod:120,transcriptionMinutesPerPeriod:1200,localCapacityUnits:0,operatorHoursPerPeriod:2}),retentionDays:365,backupCopies:2}),
  'local-processing':Object.freeze({id:'local-processing',name:'Customer-operated local processing',productFamilies:['microsoft:local','cisco:local-speech'],speechMode:'local',setupCents:190000,periodCents:10000,leadMinutes:24,engineers:2,support:1,workload:Object.freeze({captureSessionsPerPeriod:120,transcriptionMinutesPerPeriod:1200,localCapacityUnits:2,operatorHoursPerPeriod:12}),retentionDays:365,backupCopies:2})
 });
 const copy=x=>JSON.parse(JSON.stringify(x)),fail=code=>{throw new Error(code);};
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
 const unique=(xs)=>Array.isArray(xs)&&new Set(xs).size===xs.length;
 const RESOURCE_IDS=['recorder','archive','speech','identity','local','phone','carrier','desk'];
 function ids(){return Object.keys(recipes);}
 function get(key){const r=recipes[key];if(!r)fail('UNKNOWN_GOVERNMENT_ARCHITECTURE');return copy(r);}
 function resourceConfigs(recipe,region){
  const local=recipe.speechMode==='local';
  return {
   recorder:{enabled:true,capacity:4,consent:true,identityMapping:true,archive:'archive',local,region},
   archive:{enabled:true,capacity:120,retentionDays:recipe.retentionDays,access:['supervisor','auditor'],local,region},
   speech:{enabled:true,capacity:12,language:'en',operation:'transcription',local,licenceLocal:local,region},
   identity:{enabled:true,local:true,identities:['alex','bea'],entitled:['alex','bea'],region},
   local:{enabled:true,identity:true,dns:true,time:true,certificates:true,licensing:true,backup:true,local:true,region}
  };
 }
 function flow(resource,recipe,region){
  const local=recipe.speechMode==='local';
  const scopedLocal=local||resource==='identity'||resource==='local';
  return {id:`${resource}-flow`,resource,informationClass:'restricted',processingRegions:[region],storageRegions:[region],backupRegions:[region],keyCustodyRegions:[region],adminLocations:[region],supportRegions:[region],adminAuthorization:'customer-approved',accessRoles:['operator','supervisor','auditor'],connectivity:scopedLocal?'local':'cloud',continuity:local?'local':'cloud',licenceMode:local?'local-grace':'cloud',transfer:{parties:[],mechanism:null}};
 }
 function plan(key,options={}){
  const recipe=recipes[key];if(!recipe)fail('UNKNOWN_GOVERNMENT_ARCHITECTURE');
  if(!options||typeof options!=='object'||Array.isArray(options))fail('INVALID_GOVERNMENT_ARCHITECTURE_OPTIONS');
  const region=options.jurisdiction||'AU',resources=options.resources||['recorder','archive','speech','identity','local'];
  if(!REGIONS.includes(region))fail('INVALID_GOVERNMENT_JURISDICTION');
  if(!unique(resources)||resources.length<1||resources.length>8||resources.some(x=>!RESOURCE_IDS.includes(x)))fail('INVALID_GOVERNMENT_RESOURCE_SET');
  const contractId=options.contractId||recipe.id;if(!id(contractId))fail('INVALID_GOVERNMENT_CONTRACT_ID');
  const local=recipe.speechMode==='local';
  const boundaryContract={
   id:contractId,workload:'public-service',profile:region,sensitivity:'restricted',edition:local?'local':'government',productVersion:`government-${VERSION}`,offeringEvidence:'eligible',customerAuthorization:'approved',agencyAuthorizationRequired:false,agencyAuthorization:'not-required',serviceRegistration:region==='JP'?'registered':'not-registered',serviceRegistrationId:region==='JP'?'civic-grove-service':null,usesAi:false,aiUseDecision:'not-required',language:region==='JP'?'ja':'en',supportLanguage:region==='JP'?'ja':'en',
   requirements:{processingRegions:[region],storageRegions:[region],backupRegions:[region],keyRegions:[region],adminRegions:[region],supportRegions:[region],allowedAccessRoles:['operator','supervisor','auditor'],adminAuthorization:'customer-approved',continuity:local?'local':'cloud',allowedTransferMechanisms:[]},
   flows:resources.map(resource=>flow(resource,recipe,region))
  };
  return {version:VERSION,id:recipe.id,name:recipe.name,sourceIds:[...SOURCE_IDS],productFamilies:[...recipe.productFamilies],setupCents:recipe.setupCents,periodCents:recipe.periodCents,leadMinutes:recipe.leadMinutes,engineers:recipe.engineers,support:recipe.support,speechMode:recipe.speechMode,workload:copy(recipe.workload),resourceConfigs:resourceConfigs(recipe,region),boundaryContract};
 }
 function stable(x){return Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;}
 function validatePlan(p){
  if(!p||typeof p!=='object'||p.version!==VERSION||!recipes[p.id]||!p.boundaryContract||!Array.isArray(p.boundaryContract.flows)||!id(p.boundaryContract.id))fail('INVALID_GOVERNMENT_ARCHITECTURE_PLAN');
  let canonical;try{canonical=plan(p.id,{jurisdiction:p.boundaryContract.profile,resources:p.boundaryContract.flows.map(f=>f.resource),contractId:p.boundaryContract.id});}catch{fail('INVALID_GOVERNMENT_ARCHITECTURE_PLAN');}
  if(JSON.stringify(stable(canonical))!==JSON.stringify(stable(p)))fail('INVALID_GOVERNMENT_ARCHITECTURE_PLAN');
  return true;
 }
 function boundaryChange(p,options={}){
  validatePlan(p);
  const resource=options.resourceId||'speech',field=options.field||'supportRegions',region=options.region||'US';
  if(!['supportRegions','backupRegions'].includes(field)||!REGIONS.includes(region))fail('INVALID_GOVERNMENT_BOUNDARY_CHANGE');
  const changed=copy(p),target=changed.boundaryContract.flows.find(f=>f.resource===resource);
  if(!target)fail('GOVERNMENT_BOUNDARY_RESOURCE_NOT_FOUND');
  target[field]=[region];
  return {version:VERSION,planId:p.id,resourceId:resource,field,from:copy(p.boundaryContract.flows.find(f=>f.resource===resource)[field]),to:[region],boundaryContract:changed.boundaryContract};
 }
 const source=()=>`const SOC_GOVERNMENT_ARCHITECTURES=(${socGovernmentArchitecturesKernel.toString()})();`;
 return {VERSION,sourceIds:SOURCE_IDS,ids,get,plan,validatePlan,boundaryChange,source};
}
const SOC_GOVERNMENT_ARCHITECTURES=socGovernmentArchitecturesKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_GOVERNMENT_ARCHITECTURES=SOC_GOVERNMENT_ARCHITECTURES;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_GOVERNMENT_ARCHITECTURES;
