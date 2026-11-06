/* Earned, paid standing assurance bound to actual tested product integrations. */
function socProviderIntegrationAssuranceKernel(){
 'use strict';
 const VERSION=1,OPERATION_ID='integration-assurance',SOURCE_ID='progress.goal.'+'t2';
 const copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const fail=()=>{throw new Error('INVALID_PROVIDER_INTEGRATION_ASSURANCE');};
 const facts=()=>typeof SOC_PROVIDER_PROGRESSION_FACTS!=='undefined'?SOC_PROVIDER_PROGRESSION_FACTS:require('./23-provider-progression.js');
 const regional=()=>typeof SOC_PROVIDER_REGIONAL_SUPPORT!=='undefined'?SOC_PROVIDER_REGIONAL_SUPPORT:require('./23-provider-regional-support.js');
 const ucCc=()=>typeof SOC_PROVIDER_UC_CC_INTEGRATION!=='undefined'?SOC_PROVIDER_UC_CC_INTEGRATION:require('./23-provider-uc-cc-integration.js');
 function scope(s,customerId,at=s.clock){
  if(s.providerCampaign?.contentVersion!=='provider-campaigns-8')return null;
  const receipt=s.providerCampaign.progressionReceipts?.receipts?.find(r=>r.sourceId===SOURCE_ID&&r.at<=at&&r.customerIds.includes(customerId));
  if(!receipt||receipt.sourceEvidence?.kind!=='provider-regional-support-window-v1')return null;
  const raw=receipt.sourceEvidence.samples,samples=Array.isArray(raw)?raw:facts().decodeSupportObservation(raw),last=samples.at(-1);
  if(!last||last.at!==receipt.sourceEvidence.interval?.to)return null;
  const customerIds=[...receipt.customerIds].sort(),markets=[...receipt.sourceEvidence.markets].sort();
  const edges=last.participants.filter(p=>customerIds.includes(p.customerId)).flatMap(p=>(p.integrations||[]).map(edge=>({customerId:p.customerId,edge:copy(edge)}))).sort((a,b)=>a.customerId.localeCompare(b.customerId)||a.edge.id.localeCompare(b.edge.id));
  if(customerIds.length<3||markets.length<2||edges.length<2||new Set(edges.map(x=>x.customerId+'\0'+x.edge.id)).size!==edges.length)return null;
  return {version:VERSION,sourceId:SOURCE_ID,receiptId:receipt.id,customerIds,markets,edges};
 }
 function current(s,binding,hooks={}){
  if(!binding)return {eligible:false,missing:['EARNED_INTEGRATION_ASSURANCE_REQUIRED']};
  const missing=[];
  for(const id of binding.customerIds){
   const customer=s.providerCampaign.customers.find(c=>c.id===id),root=customer&&s.portfolio.customers.find(c=>c.id===customer.portfolioId)?.root;
   if(!customer||!root||!['active','renewal'].includes(customer.status)||!binding.markets.includes(customer.market)){missing.push('INTEGRATION_ASSURANCE_CUSTOMER_SCOPE_CHANGED');continue;}
   const paths=[...new Set(['identity','phone',...Object.values(root.operations?.placements||{}),'engage'])];
   if(paths.some(resource=>hooks.boundaryCheck?.(root,resource)?.eligible!==true))missing.push('INTEGRATION_ASSURANCE_BOUNDARY_REQUIRED');
  }
  for(const item of binding.edges)if(!regional().validateIntegrationSnapshot(s,{customerId:item.customerId},item.edge,s.clock,hooks))missing.push('INTEGRATION_ASSURANCE_EDGE_CHANGED');
  return {eligible:!missing.length,missing:[...new Set(missing)]};
 }
 function activeCarrierOutage(s,customerId,root){
  const incident=s?.providerCampaign?.incidents?.find(row=>row?.customerId===customerId&&row.resource==='carrier'&&row.kind==='outage'&&row.fault==='OUTAGE'&&['active','acknowledged'].includes(row.status)&&Number.isSafeInteger(row.activatedAt)&&row.activatedAt<=s.clock&&row.resolvedAt===null&&row.receipt?.resource==='carrier'&&Number.isSafeInteger(row.receipt.revision));
  if(!incident||root?.resources?.carrier?.fault!=='OUTAGE')return null;
  if(incident.status==='active'&&incident.acknowledgedAt!==null)return null;
  if(incident.status==='acknowledged'&&(!Number.isSafeInteger(incident.acknowledgedAt)||incident.acknowledgedAt<incident.activatedAt||incident.acknowledgedAt>s.clock))return null;
  return incident;
 }
 function paidTaskBindingCurrent(s,customerId,edge,root){
  const native=root?.products?.integrations?.find(row=>row?.id===edge.id);
  if(!native||native.source!==edge.source||native.target!==edge.target||native.sourceVersion!==edge.sourceVersion||native.targetVersion!==edge.targetVersion||native.sourceGeneration!==edge.sourceGeneration||native.targetGeneration!==edge.targetGeneration||native.result?.status!=='scenario-verified'||native.result.synthetic!==true||native.result.externalSupportClaim!==false||native.result.checkedAt!==edge.checkedAt||JSON.stringify(native.features)!==JSON.stringify(edge.features))return false;
  const operationIds=ucCc().OPERATION_IDS,projects=s.providerCampaign?.projects||[];
  return projects.some(project=>{
   if(project?.customerId!==customerId||project.kind!=='operation'||!operationIds.includes(project.operationId)||project.status!=='complete'||!Number.isSafeInteger(project.completedAt)||project.completedAt>s.clock)return false;
   const receipt=project.operationReceipt,plan=receipt?.plan,test=receipt?.test;
   if(!plan||plan.edge?.id!==edge.id||plan.edge.source!==edge.source||plan.edge.target!==edge.target||JSON.stringify(plan.edge.features)!==JSON.stringify(edge.features)||plan.source?.productVersion!==edge.sourceVersion||plan.target?.productVersion!==edge.targetVersion||plan.source?.generation!==edge.sourceGeneration||plan.target?.generation!==edge.targetGeneration||!test||test.edgeId!==edge.id||test.at!==edge.checkedAt||JSON.stringify(test.result)!==JSON.stringify(native.result)||test.result?.status!=='scenario-verified')return false;
   let validProject=false;try{validProject=ucCc().validateProject(s,project.id)===true;}catch{validProject=false;}
   if(!validProject||!receipt.task)return false;
   let validTask=false;try{validTask=ucCc().validateRetainedTaskEvidence(s,project.id,receipt.task)===true;}catch{validTask=false;}
   if(!validTask)return false;
   const generations=project.expectedGenerations,resourceIds=generations&&typeof generations==='object'&&!Array.isArray(generations)?Object.keys(generations):[],requiredResources=[plan.source.resourceId,plan.target.resourceId];
   if(!resourceIds.length||requiredResources.some(id=>!resourceIds.includes(id))||resourceIds.some(id=>{
    const resource=root.resources?.[id],generation=generations[id];
    return !Number.isSafeInteger(generation)||generation<1||resource?.generation!==generation||resource.provisioning?.status!=='ready'||resource.provisioning.generation!==generation||!resource.effective;
   }))return false;
   const boundaryScope=test.boundaryScope;
   if(!Array.isArray(boundaryScope)||boundaryScope.length===0||boundaryScope.some(row=>{
    const contract=root.boundaries?.contracts?.find(candidate=>candidate.id===row.contractId);
    return !contract||root.boundaries?.bindings?.[row.resourceId]!==row.contractId||contract.generation!==row.generation;
   }))return false;
   return true;
  });
 }
 function policyCurrent(s,binding,hooks={}){
  const strict=current(s,binding,hooks);
  if(strict.eligible)return {...strict,degraded:false,incidents:[]};
  if(!binding)return {...strict,degraded:false,incidents:[]};
  const missing=[],incidents=[],degradedCustomers=new Set(),availabilityCodes=new Set(['ADMIN_PATH_UNAVAILABLE','BOUNDARY_RESOURCE_UNAVAILABLE']);
  if(!Array.isArray(binding.customerIds)||binding.customerIds.length===0||!Array.isArray(binding.edges)||binding.edges.length<2||binding.edges.some(item=>!binding.customerIds.includes(item?.customerId)||!item?.edge))return {...strict,eligible:false,missing:[...new Set([...strict.missing,'INTEGRATION_ASSURANCE_EDGE_CHANGED'])],degraded:false,incidents:[]};
  for(const customerId of binding.customerIds||[]){
   const customer=s?.providerCampaign?.customers?.find(row=>row.id===customerId),root=customer&&s.portfolio?.customers?.find(row=>row.id===customer.portfolioId)?.root;
   if(!customer||!root||!['active','renewal'].includes(customer.status)||!binding.markets?.includes(customer.market)){missing.push('INTEGRATION_ASSURANCE_CUSTOMER_SCOPE_CHANGED');continue;}
   const paths=[...new Set(['identity','phone',...Object.values(root.operations?.placements||{}),'engage'])];
   let unavailable=false,boundaryInvalid=false;
   for(const resource of paths){
    let check;try{check=hooks.boundaryCheck?.(root,resource);}catch{check=null;}
    if(check?.eligible===true)continue;
    const blockers=check?.blocking;
    if(check?.eligible!==false||!Array.isArray(blockers)||blockers.length===0||blockers.some(row=>!availabilityCodes.has(row?.code))){boundaryInvalid=true;break;}
    unavailable=true;
   }
   if(boundaryInvalid){missing.push('INTEGRATION_ASSURANCE_BOUNDARY_REQUIRED');continue;}
   if(unavailable){
    const incident=activeCarrierOutage(s,customerId,root);
    if(!incident){missing.push('INTEGRATION_ASSURANCE_OUTAGE_RECOVERY_REQUIRED');continue;}
    incidents.push(incident.id);degradedCustomers.add(customerId);
   }
  }
  if(!degradedCustomers.size)return {...strict,degraded:false,incidents:[]};
  for(const customerId of degradedCustomers)if(!binding.edges.some(item=>item.customerId===customerId))missing.push('INTEGRATION_ASSURANCE_NATIVE_TASK_CHANGED');
  for(const item of binding.edges||[]){
   const participant={customerId:item.customerId},affected=degradedCustomers.has(item.customerId),edgeHooks=affected?{}:hooks;
   if(!regional().validateIntegrationSnapshot(s,participant,item.edge,s.clock,edgeHooks)){
    missing.push('INTEGRATION_ASSURANCE_EDGE_CHANGED');continue;
   }
   if(!affected)continue;
   const customer=s?.providerCampaign?.customers?.find(row=>row.id===item.customerId),root=customer&&s.portfolio?.customers?.find(row=>row.id===customer.portfolioId)?.root;
   if(!root||!paidTaskBindingCurrent(s,item.customerId,item.edge,root))missing.push('INTEGRATION_ASSURANCE_NATIVE_TASK_CHANGED');
  }
  return {eligible:missing.length===0,missing:[...new Set(missing)],degraded:missing.length===0&&incidents.length>0,incidents:[...new Set(incidents)]};
 }
 function eligibility(s,customerId,hooks={}){const binding=scope(s,customerId);return {...current(s,binding,hooks),binding};}
 function createReceipt(s,project,hooks={}){
  const binding=scope(s,project.customerId,project.acceptedAt);
  if(!binding)throw new Error('EARNED_INTEGRATION_ASSURANCE_REQUIRED');
  return {kind:OPERATION_ID,projectId:project.id,binding};
 }
 function validateReceipt(s,project){
  const r=project.operationReceipt,expected=scope(s,project.customerId,project.acceptedAt);
  if(!r||Object.keys(r).sort().join(',')!=='binding,kind,projectId'||r.kind!==OPERATION_ID||r.projectId!==project.id||!expected||!same(r.binding,expected))fail();
  return true;
 }
 function validatePolicy(s,project,config){
  validateReceipt(s,project);const scope=project.operationReceipt.binding;
  if(!config.customerIds.length||[...config.customerIds,...config.rules.flatMap(r=>r.customerIds)].some(id=>!scope.customerIds.includes(id))||config.rules.some(r=>r.kind!=='assurance'))throw new Error('INTEGRATION_ASSURANCE_EXPLICIT_SCOPE_REQUIRED');
  return true;
 }
 function validateAction(project,action,work){
  if(!work||action.kind!=='incident'||work.operationId!=='repair'||!project.operationReceipt?.binding?.customerIds.includes(work.customerId)||project.status!=='complete'||!Number.isSafeInteger(project.completedAt)||work.acceptedAt<project.completedAt)throw new Error('INVALID_PROVIDER_AUTOMATION_LINEAGE');
  return true;
 }
 const source=()=>`const SOC_PROVIDER_INTEGRATION_ASSURANCE=(${socProviderIntegrationAssuranceKernel.toString()})();`;
 return {VERSION,OPERATION_ID,SOURCE_ID,scope,current,policyCurrent,eligibility,createReceipt,validateReceipt,validatePolicy,validateAction,source};
}
const SOC_PROVIDER_INTEGRATION_ASSURANCE=socProviderIntegrationAssuranceKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_INTEGRATION_ASSURANCE;
