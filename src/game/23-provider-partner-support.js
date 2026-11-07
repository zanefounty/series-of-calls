/* Stable, historical paid-stage support scope for partner commissioning. */
function socProviderPartnerSupportKernel(){
 'use strict';
 const VERSION=1,copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function history(){return typeof SOC_PROVIDER_SUPPORT_HISTORY!=='undefined'?SOC_PROVIDER_SUPPORT_HISTORY:require('./23-provider-support-history.js');}
 function ownerAt(s,customerId,at,hooks={}){
  if(!Number.isSafeInteger(at)||at<0||at>s?.clock||!s?.providerCampaign)return null;
  const api=history();if(!api.callingSupportAt(s,customerId,at,hooks))return null;
  const result=api.reconstructParticipantAt(s,customerId,at,hooks),r=result.participant?.responsibility;
  if(result.status!=='supported'||!r||r.customerId!==customerId||r.role!=='msp'||r.organisationId!=='orchard-msp'||!r.projectId||!r.postingId||!Array.isArray(r.scope))return null;
  // Payroll counters and the current staffing count change with time. Ownership
  // comes from the actual funded stages; current paid staffing is checked above.
  return {version:VERSION,role:r.role,organisationId:r.organisationId,customerId,scope:[...r.scope].sort(),acceptedAt:s.providerCampaign.projects.find(p=>p.id===r.projectId)?.acceptedAt,effectiveAt:r.effectiveAt,expiresAt:r.expiresAt,projectId:r.projectId,postingId:r.postingId};
 }
 function supportFor(s,customerId,resources,{at=s?.clock,hooks={}}={}){
  if(!Array.isArray(resources)||!resources.length||resources.some(x=>typeof x!=='string')||new Set(resources).size!==resources.length)throw new Error('INVALID_PARTNER_SUPPORT_SCOPE');
  const owner=ownerAt(s,customerId,at,hooks),missing=resources.filter(id=>!owner?.scope.includes(id));
  return {status:missing.length?'blocked':'ready',owners:owner?[copy(owner)]:[],missing:missing.map(id=>'PAID_STAGE_SUPPORT_REQUIRED:'+id)};
 }
 function validateOwner(s,owner,{at=s?.clock,hooks={}}={}){return !!owner&&same(ownerAt(s,owner.customerId,at,hooks),owner);}
 function source(){return `const SOC_PROVIDER_PARTNER_SUPPORT=(${socProviderPartnerSupportKernel.toString()})();`;}
 return {VERSION,ownerAt,supportFor,validateOwner,source};
}
const SOC_PROVIDER_PARTNER_SUPPORT=socProviderPartnerSupportKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_PARTNER_SUPPORT;
