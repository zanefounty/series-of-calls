/* Authored, paid fictional support-boundary workflow for commercial Provider customers. */
function socProviderServiceBoundaryKernel(){
 'use strict';
 const VERSION=1,CONTENT='provider-service-boundary-1',RESOURCES=Object.freeze(['identity','phone','engage']),REGIONS=Object.freeze(['AU','US','JP','EU']);
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function responsibilityApi(){return typeof SOC_PROVIDER_RESPONSIBILITY!=='undefined'?SOC_PROVIDER_RESPONSIBILITY:(typeof require==='function'?require('./23-provider-responsibility.js'):null);}
 function boundaryApi(){return typeof SOC_BOUNDARIES!=='undefined'?SOC_BOUNDARIES:(typeof require==='function'?require('./43-boundaries.js'):null);}
 function stateOf(s){const p=s?.providerCampaign;if(!s||s.experience?.version!==1||s.experience.kind!=='campaign'||s.experience.custom!==false||p?.pack!=='soc-provider-campaign-1'||p.version!==1||!['provider-campaigns-1','provider-campaigns-2','provider-campaigns-3','provider-campaigns-4'].includes(p.contentVersion))fail('PROVIDER_CAMPAIGN_REQUIRED');return p;}
 function customerRoot(s,c,hooks){return typeof hooks.customerRoot==='function'?hooks.customerRoot(s,c.portfolioId):s.portfolio?.customers?.find(x=>x.id===c.portfolioId)?.root||null;}
 function currentMsp(s,c,hooks,ownBoundaryId){const api=responsibilityApi();if(!api||s.providerCampaign.commercialResponsibilityVersion!==api.VERSION)return null;const scoped={...hooks,observeResource:(root,id)=>resourceReady(root,id,hooks,ownBoundaryId)};const result=api.responsibilities(s,c.id,scoped);return result.status==='available'?result.records.find(x=>x.role==='msp'&&x.customerId===c.id&&x.organisationId==='orchard-msp'&&x.version===1&&x.effectiveAt<=s.clock&&(x.expiresAt===null||x.expiresAt>s.clock))||null:null;}
 function resourceReady(root,id,hooks,ownBoundaryId){const r=root?.resources?.[id];if(!r||!r.effective||r.provisioning?.status!=='ready'||r.effective.enabled===false)return false;const observer=hooks.observeServiceResource||hooks.observeResource;if(typeof observer!=='function')return false;const v=observer(root,id,ownBoundaryId);return v===true||v?.ready===true;}
 function topologyOf(root){const placements=root?.operations?.placements||{};if(!placements||typeof placements!=='object'||Array.isArray(placements))fail('INVALID_PROVIDER_SERVICE_TOPOLOGY');const topology={};for(const key of Object.keys(placements).sort()){const resource=placements[key];if(!['alex','bea'].includes(key)||!['phone','migration-phone'].includes(resource)||!root.resources?.[resource])fail('INVALID_PROVIDER_SERVICE_TOPOLOGY');topology[key]=resource;}return topology;}
 function resourceIds(root){return [...new Set(['identity','phone',...Object.values(topologyOf(root)),'engage'])];}
 function flow(resource,region){return {id:`${resource}-service-flow`,resource,informationClass:'internal',processingRegions:[region],storageRegions:[region],backupRegions:[region],keyCustodyRegions:[region],adminLocations:[region],supportRegions:[region],adminAuthorization:'customer-approved',accessRoles:['operator','supervisor','auditor'],connectivity:'cloud',continuity:'cloud',licenceMode:'cloud',transfer:{parties:[],mechanism:null}};}
 function contractFor(customerId,region,resources=RESOURCES){
  const id=`provider-service-boundary-${customerId}`;
  return {id,workload:'managed-service',profile:region,sensitivity:'internal',edition:'standard',productVersion:`provider-boundary-${VERSION}`,offeringEvidence:'eligible',customerAuthorization:'approved',agencyAuthorizationRequired:false,agencyAuthorization:'not-required',serviceRegistration:'not-registered',serviceRegistrationId:null,usesAi:false,aiUseDecision:'not-required',language:'en',supportLanguage:'en',requirements:{processingRegions:[region],storageRegions:[region],backupRegions:[region],keyRegions:[region],adminRegions:[region],supportRegions:[region],allowedAccessRoles:['operator','supervisor','auditor'],adminAuthorization:'customer-approved',continuity:'cloud',allowedTransferMechanisms:[]},flows:resources.map(id=>flow(id,region))};
 }
 function validateContractInFixture(contract,dependencies,region){
  const api=boundaryApi();if(!api)fail('BOUNDARY_DOMAIN_REQUIRED');const fixture={clock:0,jurisdiction:region,resources:Object.fromEntries(dependencies.map(x=>[x.id,{generation:x.generation}])),boundaries:api.create({clock:0})};
  try{api.command(fixture,{action:'contract',contract:copy(contract)});for(const resource of dependencies.map(x=>x.id))api.command(fixture,{action:'bind',resource,contract:contract.id});api.validate(fixture);}catch{fail('INVALID_PROVIDER_SERVICE_BOUNDARY_CONTRACT');}
  return true;
 }
 function plan(s,customerId,hooks={}){
  const p=stateOf(s);if(s.providerCampaign.commercialResponsibilityVersion!==1)fail('CURRENT_PAID_MSP_REQUIRED');
  if(typeof customerId!=='string')fail('INVALID_PROVIDER_CUSTOMER');const c=p.customers.find(x=>x.id===customerId);if(!c)fail('PROVIDER_CUSTOMER_NOT_FOUND');
  if(!['smb','enterprise'].includes(c.scenario))fail('SERVICE_BOUNDARY_SCENARIO_UNSUPPORTED');if(!['active','renewal'].includes(c.status)||!c.retailAgreement||c.retailAgreement.at>s.clock||!Number.isSafeInteger(c.retailAgreement.priceCents)||c.retailAgreement.priceCents<=0)fail('ACCEPTED_RETAIL_AGREEMENT_REQUIRED');
  const root=customerRoot(s,c,hooks);if(!root||root.providerCustomer?.id!==c.id||root.providerCustomer?.version!==1||root.providerCampaign)fail('VALIDATED_CUSTOMER_ROOT_REQUIRED');
  const region=root.jurisdiction;if(!REGIONS.includes(region))fail('CUSTOMER_JURISDICTION_REQUIRED');if(region==='JP')fail('SERVICE_REGISTRATION_NOT_AUTHORED');const contractId=`provider-service-boundary-${c.id}`,topology=topologyOf(root),resources=resourceIds(root);
  for(const resource of resources){const owner=root.boundaries?.bindings?.[resource];if(owner&&owner!==contractId)fail(`SERVICE_RESOURCE_BOUNDARY_OWNED:${resource}`);}
  const msp=currentMsp(s,c,hooks,contractId);if(!msp)fail('CURRENT_PAID_MSP_REQUIRED');
  const dependencies=resources.map(id=>{const resource=root.resources?.[id];if(!resourceReady(root,id,hooks,contractId))fail(`SERVICE_RESOURCE_NOT_READY:${id}`);return {id,generation:resource.generation};});
  if(dependencies.some(x=>!Number.isSafeInteger(x.generation)||x.generation<1))fail('SERVICE_RESOURCE_GENERATION_REQUIRED');
  const boundaryContract=contractFor(c.id,region,resources);validateContractInFixture(boundaryContract,dependencies,region);
  const existing=root.boundaries?.contracts?.find(x=>x.id===boundaryContract.id),boundaryGeneration=(existing?.generation||0)+1;
  return {version:VERSION,contentVersion:CONTENT,customerId:c.id,portfolioId:c.portfolioId,tenant:root.tenant||c.portfolioId,jurisdiction:region,acceptedRetailAt:c.retailAgreement.at,retailPriceCents:c.retailAgreement.priceCents,responsibility:{id:msp.id,projectId:msp.projectId,postingId:msp.postingId,effectiveAt:msp.effectiveAt},topology,dependencies,boundaryGeneration,boundaryContract};
 }
 function validatePlan(p){
  if(!exact(p,['version','contentVersion','customerId','portfolioId','tenant','jurisdiction','acceptedRetailAt','retailPriceCents','responsibility','topology','dependencies','boundaryGeneration','boundaryContract'])||p.version!==VERSION||p.contentVersion!==CONTENT||typeof p.customerId!=='string'||typeof p.portfolioId!=='string'||typeof p.tenant!=='string'||!REGIONS.includes(p.jurisdiction)||p.jurisdiction==='JP'||!Number.isSafeInteger(p.acceptedRetailAt)||p.acceptedRetailAt<0||!Number.isSafeInteger(p.retailPriceCents)||p.retailPriceCents<1||!exact(p.responsibility,['id','projectId','postingId','effectiveAt'])||!['id','projectId','postingId'].every(k=>typeof p.responsibility[k]==='string')||!Number.isSafeInteger(p.responsibility.effectiveAt)||p.responsibility.effectiveAt<0||!p.topology||typeof p.topology!=='object'||Array.isArray(p.topology)||Object.keys(p.topology).some(k=>!['alex','bea'].includes(k))||Object.values(p.topology).some(v=>!['phone','migration-phone'].includes(v))||!Array.isArray(p.dependencies)||p.dependencies.length<RESOURCES.length||p.dependencies.some(x=>!exact(x,['id','generation'])||!Number.isSafeInteger(x.generation)||x.generation<1)||!Number.isSafeInteger(p.boundaryGeneration)||p.boundaryGeneration<1)fail('INVALID_PROVIDER_SERVICE_BOUNDARY_PLAN');
  const expectedIds=[...new Set(['identity','phone',...Object.values(p.topology),'engage'])];if(!same(p.dependencies.map(x=>x.id),expectedIds)||p.dependencies.some(x=>!expectedIds.includes(x.id))||!same(p.boundaryContract,contractFor(p.customerId,p.jurisdiction,expectedIds)))fail('INVALID_PROVIDER_SERVICE_BOUNDARY_PLAN');
  validateContractInFixture(p.boundaryContract,p.dependencies,p.jurisdiction);
  return true;
 }
 function startCommands(p){validatePlan(p);return [{type:'boundaries',command:{action:'contract',contract:copy(p.boundaryContract)}},...p.dependencies.map(({id})=>({type:'boundaries',command:{action:'bind',resource:id,contract:p.boundaryContract.id}}))];}
 function observe(s,p,hooks={}){
  validatePlan(p);const state=stateOf(s),c=state.customers.find(x=>x.id===p.customerId),root=c&&customerRoot(s,c,hooks),missing=[];
  if(!c||c.portfolioId!==p.portfolioId||!['smb','enterprise'].includes(c.scenario)||!['active','renewal'].includes(c.status)||!c.retailAgreement||c.retailAgreement.priceCents!==p.retailPriceCents||c.retailAgreement.at<p.acceptedRetailAt)missing.push('ACCEPTED_RETAIL_AGREEMENT_CHANGED');
  if(!root||root.providerCustomer?.id!==p.customerId||root.providerCustomer?.version!==1||root.tenant!==p.tenant||root.jurisdiction!==p.jurisdiction)missing.push('CUSTOMER_SCOPE_CHANGED');else if(!same(topologyOf(root),p.topology))missing.push('SERVICE_TOPOLOGY_CHANGED');
  const msp=c&&currentMsp(s,c,hooks,p.boundaryContract.id);if(!msp||msp.id!==p.responsibility.id||msp.projectId!==p.responsibility.projectId||msp.postingId!==p.responsibility.postingId||msp.effectiveAt!==p.responsibility.effectiveAt)missing.push('CURRENT_PAID_MSP_REQUIRED');
  for(const dependency of p.dependencies)if(!root||root.resources?.[dependency.id]?.generation!==dependency.generation||!resourceReady(root,dependency.id,hooks,p.boundaryContract.id))missing.push(`SERVICE_RESOURCE_NOT_READY:${dependency.id}`);
  const contract=root?.boundaries?.contracts?.find(x=>x.id===p.boundaryContract.id),boundary=contract&&boundaryApi()?.evaluate(root,contract.id),expectedEffective={...copy(p.boundaryContract),flows:p.boundaryContract.flows.map(f=>({...copy(f),resourceGeneration:p.dependencies.find(x=>x.id===f.resource)?.generation}))};if(!contract||contract.generation!==p.boundaryGeneration||contract.provisioning?.status!=='ready'||!contract.effective||!same(contract.effective,expectedEffective)||boundary?.resourceBindings?.length!==p.dependencies.length)missing.push('BOUNDARY_CONTRACT_NOT_CURRENT');
  const connected=root?.connected===true,resourcesCurrent=p.dependencies.every(x=>!missing.includes(`SERVICE_RESOURCE_NOT_READY:${x.id}`)),eligible=connected&&resourcesCurrent&&!!msp&&!missing.some(x=>x==='CUSTOMER_SCOPE_CHANGED'||x==='SERVICE_TOPOLOGY_CHANGED'||x==='ACCEPTED_RETAIL_AGREEMENT_CHANGED'||x==='CURRENT_PAID_MSP_REQUIRED'||x==='BOUNDARY_CONTRACT_NOT_CURRENT');
  const observed={connected,cloudLicenceAvailable:connected&&resourcesCurrent,localLicenceGraceActive:false,localLicenceGraceExpiresAt:null,localServicesAvailable:false,localKeyCustodyAvailable:false,adminPathAvailable:eligible,adminPathLocation:eligible?p.jurisdiction:null};
  const command={type:'boundaries',command:{action:'observe',contract:p.boundaryContract.id,observed}};
  return {status:eligible?'available':'incomplete',eligible,missing:[...new Set(missing)],at:s.clock,customerId:p.customerId,contractId:p.boundaryContract.id,resourceGenerations:copy(p.dependencies),observed,command};
 }
 const source=()=>`const SOC_PROVIDER_SERVICE_BOUNDARY=(${socProviderServiceBoundaryKernel.toString()})();`;
 return {VERSION,CONTENT,RESOURCES,plan,validatePlan,startCommands,observe,source};
}
const SOC_PROVIDER_SERVICE_BOUNDARY=socProviderServiceBoundaryKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_PROVIDER_SERVICE_BOUNDARY=SOC_PROVIDER_SERVICE_BOUNDARY;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_SERVICE_BOUNDARY;
