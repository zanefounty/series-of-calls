/* Earned, paid standing assurance bound to actual tested product integrations. */
function socProviderIntegrationAssuranceKernel(){
 'use strict';
 const VERSION=1,OPERATION_ID='integration-assurance',SOURCE_ID='progress.goal.'+'t2';
 const copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const fail=()=>{throw new Error('INVALID_PROVIDER_INTEGRATION_ASSURANCE');};
 const facts=()=>typeof SOC_PROVIDER_PROGRESSION_FACTS!=='undefined'?SOC_PROVIDER_PROGRESSION_FACTS:require('./23-provider-progression.js');
 const regional=()=>typeof SOC_PROVIDER_REGIONAL_SUPPORT!=='undefined'?SOC_PROVIDER_REGIONAL_SUPPORT:require('./23-provider-regional-support.js');
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
 return {VERSION,OPERATION_ID,SOURCE_ID,scope,current,eligibility,createReceipt,validateReceipt,validatePolicy,validateAction,source};
}
const SOC_PROVIDER_INTEGRATION_ASSURANCE=socProviderIntegrationAssuranceKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_INTEGRATION_ASSURANCE;
