/* Pure, opt-in Provider qualification and responsibility evidence. */
function socProviderResponsibilityKernel(){
 'use strict';
 const PACK='soc-provider-responsibility-1',VERSION=1,QUALIFICATION_MINUTES=180,QUALIFICATION_OPERATION='partner-qualification';
 const SCOPES=Object.freeze(['distributor-room','recording']);
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=x=>Number.isSafeInteger(x)&&x>=0;
 const records=s=>s?.providerCampaign?.projects;
 function optedIn(s){const value=s?.providerCampaign?.commercialResponsibilityVersion;if(value===undefined)return false;if(value!==VERSION)fail('INVALID_PROVIDER_RESPONSIBILITY_VERSION');return true;}
 function validate(s){optedIn(s);const p=s?.providerCampaign;if(!p)return true;if(p.commercialResponsibilityVersion!==undefined&&p.commercialResponsibilityVersion!==VERSION)fail('INVALID_PROVIDER_RESPONSIBILITY_VERSION');return true;}
 function rootFor(s,customer,hooks){if(typeof hooks.customerRoot==='function')return hooks.customerRoot(s,customer);return s?.portfolio?.customers?.find(x=>x.id===customer)?.root||null;}
 function observe(root,id,hooks){if(typeof hooks.observeResource!=='function')return false;const value=hooks.observeResource(root,id);return value===true||value?.ready===true;}
 function actors(s){const orgs=s?.business?.organisations||{};return {msp:orgs['orchard-msp'],distributor:orgs['branch-distribution'],integrator:orgs['twig-integrations'],bpo:orgs['people-orchard']};}
 function postingFor(s,p){
  const row=s?.business?.ledger?.find(x=>x.id===p?.postingId),expectedReason=p?.kind==='stage'?'provider-implementation':'provider-operation';
  if(row)return row.category==='cost'&&row.cents===p.setupCents&&row.customerId===p.customerId&&row.projectId===p.id&&row.providerCampaign===true&&row.reason===expectedReason&&row.operationId===p.operationId?row:null;
  // Dispatch/save validation retains each authored project after its setup entry
  // crosses the bounded ledger checkpoint. This references retained proof; it
  // does not reconstruct a ledger entry or invent historical service evidence.
  const number=/^entry-([1-9]\d*)$/.exec(p?.postingId||'');
  return number&&Number.isSafeInteger(Number(number[1]))&&Number(number[1])<=(s?.business?.ledgerPrunedThrough||0)&&records(s)?.includes(p)?{id:p.postingId,retention:'validated-project-checkpoint',projectId:p.id}:null;
 }
 function qualifiedSettlement(s,c,acceptedAt){
  const p=s.providerCampaign,ledger=s.business?.ledger||[];
  const candidates=[...(c.history||[])].filter(h=>h.basis==='provider-period-history-v1'&&h.fullPeriod===true&&h.qualified===true&&integer(h.period)&&integer(h.from)&&integer(h.to)&&h.to-h.from===60&&h.settledAt===h.to&&h.to<=acceptedAt&&acceptedAt-h.to<=60&&integer(h.grossRetail)&&h.grossRetail>0&&integer(h.netRetail)&&h.netRetail>0).sort((a,b)=>b.to-a.to);
  for(const h of candidates){
   const revenue=ledger.find(x=>x.category==='revenue'&&x.reason==='provider-customer-period'&&x.customerId===c.id&&x.period===h.period&&x.at===h.to&&x.cents===h.grossRetail);
   const costs=ledger.filter(x=>x.category==='cost'&&x.customerId===c.id&&x.period===h.period&&x.at===h.to&&['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'].includes(x.reason));
   const global=p.periodHistory?.find(x=>x.period===h.period&&x.from===h.from&&x.to===h.to&&x.settledAt===h.to);
   if(revenue&&costs.length&&global)return {history:h,revenue,costs,global};
  }
  return null;
 }
 function qualificationReadiness(s,customerId,hooks={}){
  if(!optedIn(s))return {status:'unavailable',missing:['COMMERCIAL_RESPONSIBILITY_VERSION_NOT_ENABLED'],evidence:null};
  if(!s?.providerCampaign||!Array.isArray(s.providerCampaign.customers)||!Array.isArray(records(s)))fail('INVALID_PROVIDER_RESPONSIBILITY_STATE');
  const c=s.providerCampaign.customers.find(x=>x.id===customerId);
  if(!c)return {status:'incomplete',missing:['CUSTOMER_NOT_FOUND'],evidence:null};
  const missing=[],org=actors(s),issuerRoles=org.distributor?.roles||[],holderRoles=org.msp?.roles||[];
  if(!issuerRoles.includes('distributor')||!holderRoles.includes('msp')||!holderRoles.includes('reseller'))missing.push('NAMED_PARTNER_ROLE_UNAVAILABLE');
  if(!['active','renewal'].includes(c.status))missing.push('CUSTOMER_NOT_ACTIVE');
  const root=rootFor(s,c.id,hooks);
  if(!root||root.providerCustomer?.id!==c.id||root.providerCustomer?.version!==1||root.providerCampaign)missing.push('VALIDATED_CUSTOMER_ROOT_REQUIRED');
  const dependencies=['identity','engage'];
  if(root&&dependencies.some(id=>!observe(root,id,hooks)))missing.push('QUALIFICATION_DEPENDENCY_NOT_READY');
  const settlement=qualifiedSettlement(s,c,s.clock);
  if(!settlement)missing.push('RECENT_FULL_QUALIFIED_SETTLEMENT_REQUIRED');
  const evidence=settlement?{
   customerId:c.id,issuerOrganizationId:'branch-distribution',holderOrganizationId:'orchard-msp',scopes:[...SCOPES],checkedAt:s.clock,
   period:settlement.history.period,interval:{from:settlement.history.from,to:settlement.history.to},
   netRetailCents:settlement.history.netRetail,revenuePostingId:settlement.revenue.id,
   costPostingIds:settlement.costs.map(x=>x.id),globalSettlementAt:settlement.global.settledAt
  }:null;
  return {status:missing.length?'incomplete':'ready',missing:[...new Set(missing)],evidence:evidence?copy(evidence):null};
 }
 function qualificationCandidate(s,c,project,hooks){
  const missing=[];
  if(!c||c.id!==project.customerId)missing.push('CUSTOMER_SCOPE_MISMATCH');
  if(!['active','renewal'].includes(c?.status))missing.push('CUSTOMER_NOT_ACTIVE');
  if(project.kind!=='operation'||project.operationId!==QUALIFICATION_OPERATION||project.status!=='complete')missing.push('QUALIFICATION_PROJECT_NOT_COMPLETE');
  if(!integer(project.acceptedAt)||!integer(project.completedAt)||project.completedAt<project.acceptedAt||project.completedAt>s.clock)missing.push('INVALID_PROJECT_TIMELINE');
  const org=actors(s),partnerRoles=org.distributor?.roles||[],holderRoles=org.msp?.roles||[];
  if(!partnerRoles.includes('distributor')||!holderRoles.includes('msp')||!holderRoles.includes('reseller'))missing.push('NAMED_PARTNER_ROLE_UNAVAILABLE');
  const scopes=['identity','engage'];if(scopes.some(id=>!(project.resources||[]).includes(id)))missing.push('QUALIFICATION_DEPENDENCY_SCOPE_MISMATCH');
  const root=c&&rootFor(s,c.id,hooks);if(!root||root.providerCustomer?.id!==c.id||root.providerCustomer?.version!==1||root.providerCampaign)missing.push('VALIDATED_CUSTOMER_ROOT_REQUIRED');
  if(root&&scopes.some(id=>!observe(root,id,hooks)))missing.push('QUALIFICATION_DEPENDENCY_NOT_READY');
  const posting=postingFor(s,project);if(!posting)missing.push('PAID_PROJECT_POSTING_REQUIRED');
  const settlement=c&&qualifiedSettlement(s,c,project.acceptedAt);if(!settlement)missing.push('RECENT_FULL_QUALIFIED_SETTLEMENT_REQUIRED');
  if(missing.length)return {status:'ineligible',missing:[...new Set(missing)]};
  const id=`provider-qualification-${project.id}`;
  const certificate={version:1,id,customerId:c.id,issuerOrganizationId:'branch-distribution',holderOrganizationId:'orchard-msp',scopes:[...SCOPES],acceptedAt:project.acceptedAt,effectiveAt:project.completedAt,expiresAt:project.completedAt+QUALIFICATION_MINUTES,projectId:project.id,postingId:posting.id,evidence:{period:settlement.history.period,from:settlement.history.from,to:settlement.history.to,qualified:settlement.history.qualified,netRetailCents:settlement.history.netRetail,revenuePostingId:settlement.revenue.id,costPostingIds:settlement.costs.map(x=>x.id),globalSettlementAt:settlement.global.settledAt}};
  return {status:s.clock<certificate.expiresAt?'active':'expired',missing:[],certificate};
 }
 function qualification(s,customerId,operationId=QUALIFICATION_OPERATION,hooks={}){
  if(!optedIn(s))return {status:'unavailable',missing:['COMMERCIAL_RESPONSIBILITY_VERSION_NOT_ENABLED'],certificate:null};
  if(!s?.providerCampaign||!Array.isArray(s.providerCampaign.customers)||!Array.isArray(records(s)))fail('INVALID_PROVIDER_RESPONSIBILITY_STATE');
  if(operationId!==QUALIFICATION_OPERATION)return {status:'unavailable',missing:['QUALIFICATION_OPERATION_UNSUPPORTED'],certificate:null};
  const c=s.providerCampaign.customers.find(x=>x.id===customerId);if(!c)return {status:'unavailable',missing:['CUSTOMER_NOT_FOUND'],certificate:null};
  const projects=records(s).filter(x=>x.customerId===customerId&&x.operationId===operationId).sort((a,b)=>(b.completedAt??b.acceptedAt??-1)-(a.completedAt??a.acceptedAt??-1));
  if(!projects.length)return {status:'incomplete',missing:['QUALIFICATION_PROJECT_NOT_COMPLETE'],certificate:null};
  const examined=projects.map(project=>qualificationCandidate(s,c,project,hooks)),valid=examined.find(x=>x.certificate);
  if(valid)return {...valid,certificate:copy(valid.certificate)};
  return {status:examined[0].status,missing:examined[0].missing,certificate:null};
 }
 // Historical purchase permission is derived from an independently paid review
 // at the order time. A later renewal never backdates its own certificate.
 function purchaseQualification(s,customerId,at){
  if(s?.providerCampaign?.contentVersion!=='provider-campaigns-8'||!integer(at)||at>s.clock)return null;
  const projects=(records(s)||[]).filter(p=>p.customerId===customerId&&p.kind==='operation'&&p.operationId===QUALIFICATION_OPERATION&&p.status==='complete'&&integer(p.acceptedAt)&&integer(p.completedAt)&&p.acceptedAt<=p.completedAt&&p.completedAt<=at&&at<p.completedAt+QUALIFICATION_MINUTES&&['identity','engage'].every(id=>p.resources?.includes(id))&&postingFor(s,p)).sort((a,b)=>b.completedAt-a.completedAt||a.id.localeCompare(b.id));
  const p=projects[0];return p?{version:1,id:`provider-qualification-${p.id}`,customerId,issuerOrganizationId:'branch-distribution',holderOrganizationId:'orchard-msp',scopes:[...SCOPES],acceptedAt:p.acceptedAt,effectiveAt:p.completedAt,expiresAt:p.completedAt+QUALIFICATION_MINUTES,projectId:p.id,postingId:p.postingId}:null;
 }
 function permits(certificate,customerId,scope,at){return !!certificate&&certificate.version===1&&certificate.customerId===customerId&&SCOPES.includes(scope)&&certificate.scopes.includes(scope)&&integer(at)&&certificate.effectiveAt<=at&&at<certificate.expiresAt;}
 function stageEvidence(s,c,hooks){
  const root=rootFor(s,c.id,hooks),out=[];
  if(!root||root.providerCustomer?.id!==c.id||root.providerCampaign)return {root:null,missing:['VALIDATED_CUSTOMER_ROOT_REQUIRED'],resources:[]};
  const missing=[],resources=[];
  for(const stageId of ['base','carrier','partner']){
   const stage=c.stages?.[stageId],project=stage&&records(s).find(x=>x.id===stage.projectId&&x.customerId===c.id&&x.kind==='stage'&&x.stage===stageId);
   if(!stage||stage.status!=='effective'||!project||project.status!=='complete'||!postingFor(s,project)){missing.push(`PAID_${stageId.toUpperCase()}_STAGE_REQUIRED`);continue;}
   for(const id of stage.resources||[]){if(!observe(root,id,hooks)){missing.push(`RESOURCE_NOT_READY:${id}`);continue;}resources.push(id);}
   out.push({stageId,projectId:project.id,postingId:project.postingId});
  }
  return {root,missing:[...new Set(missing)],resources:[...new Set(resources)],stages:out};
 }
 function operationEvidence(s,c,project,hooks){
  const missing=[],posting=postingFor(s,project),root=rootFor(s,c.id,hooks);
  if(project.kind!=='operation'||project.status!=='complete'||!integer(project.completedAt)||project.completedAt>s.clock)missing.push('PAID_OPERATION_NOT_COMPLETE');
  if(!posting)missing.push('PAID_PROJECT_POSTING_REQUIRED');
  if(!root||root.providerCustomer?.id!==c.id||root.providerCampaign)missing.push('VALIDATED_CUSTOMER_ROOT_REQUIRED');
  const resources=[];for(const id of project.resources||[]){if(!observe(root,id,hooks))missing.push(`RESOURCE_NOT_READY:${id}`);else resources.push(id);}
  return {missing:[...new Set(missing)],posting,root,resources};
 }
 function mspResponsibility(s,c,hooks){
  const org=actors(s).msp,rows=stageEvidence(s,c,hooks),workforce=s.business?.workforce,payroll=s.providerCampaign?.payroll;
  const eligible=['active','renewal'].includes(c.status)&&org?.roles.includes('msp')&&org?.roles.includes('reseller')&&rows.root&&!rows.missing.length&&workforce&&workforce.support>0&&payroll?.personMinutes>0&&payroll?.billedMinutes>0;
  if(!eligible)return {status:'incomplete',missing:[...(!org?.roles.includes('msp')||!org?.roles.includes('reseller')?['MSP_RESELLER_ROLE_REQUIRED']:[]),...rows.missing,...(!workforce||workforce.support<=0?['CURRENT_SHARED_SUPPORT_STAFF_REQUIRED']:[]),...(!payroll||payroll.personMinutes<=0||payroll.billedMinutes<=0?['PAID_SHARED_PAYROLL_REQUIRED']:[])]};
  const last=rows.stages.at(-1),project=records(s).find(p=>p.id===last.projectId),posting=postingFor(s,project);
  return {status:'active',missing:[],record:{version:1,id:`provider-responsibility-msp-${c.id}`,role:'msp',organisationId:'orchard-msp',customerId:c.id,scope:rows.resources,acceptedAt:c.retailAgreement?.at??c.startedAt,effectiveAt:Math.max(...rows.stages.map(x=>records(s).find(p=>p.id===x.projectId)?.completedAt||0)),expiresAt:null,projectId:project.id,postingId:posting.id,terms:{setupCents:rows.stages.reduce((n,x)=>n+(records(s).find(p=>p.id===x.projectId)?.setupCents||0),0),periodCents:rows.stages.reduce((n,x)=>n+(records(s).find(p=>p.id===x.projectId)?.periodCents||0),0),engineers:workforce.engineers,support:workforce.support},evidence:{stageProjects:rows.stages,sharedWorkforce:{engineers:workforce.engineers,support:workforce.support,personMinutes:payroll.personMinutes,billedMinutes:payroll.billedMinutes}}}};
 }
 function bpoResponsibility(s,c,hooks){
  const candidates=records(s).filter(p=>p.customerId===c.id&&p.kind==='operation'&&p.operationId==='bpo'&&p.status==='complete').sort((a,b)=>(b.completedAt||0)-(a.completedAt||0));
  const missing=[];
  if(!candidates.length)return {status:'incomplete',missing:['PAID_BPO_COVER_REQUIRED']};
  const p=candidates[0],e=operationEvidence(s,c,p,hooks),root=e.root,w=root?.workforceOps,cover=w?.providerCover;
  missing.push(...e.missing);
  if(!cover||cover.projectId!==p.id||cover.postingId!==p.postingId||!Array.isArray(cover.people)||cover.people.length!==2)missing.push('BPO_COVER_RECEIPT_MISMATCH');
  const ids=cover?.people||[],people=ids.map(id=>w?.roster?.effective?.find(x=>x.id===id));
  if(people.length!==2||people.some(x=>!x||x.employer!=='people-orchard'||!x.skills?.includes('service')||!x.available))missing.push('TWO_EFFECTIVE_BPO_PEOPLE_REQUIRED');
  if(ids.some(id=>w?.actualPresence?.[id]!=='available'))missing.push('BPO_PEOPLE_NOT_PRESENT');
  const minuteOfDay=s.clock%1440;
  if(people.some(x=>!x||!(x.shiftStart<=minuteOfDay&&x.shiftEnd>minuteOfDay)||(x.breaks||[]).some(b=>minuteOfDay>=b.start&&minuteOfDay<b.end)))missing.push('BPO_PEOPLE_OUT_OF_SHIFT');
  const org=actors(s).bpo;if(!org?.roles.includes('bpo'))missing.push('NAMED_BPO_ROLE_UNAVAILABLE');
  const resources=['people','service'];if(root&&resources.some(id=>!observe(root,id,hooks)))missing.push('BPO_RESOURCE_NOT_READY');
  if(missing.length)return {status:'incomplete',missing:[...new Set(missing)]};
  return {status:'active',missing:[],record:{version:1,id:`provider-responsibility-bpo-${p.id}`,role:'bpo',organisationId:'people-orchard',customerId:c.id,scope:[...resources],acceptedAt:p.acceptedAt,effectiveAt:p.completedAt,expiresAt:null,projectId:p.id,postingId:p.postingId,terms:{setupCents:p.setupCents,periodCents:p.periodCents,engineers:p.engineers,support:p.support},evidence:{people:people.map(x=>({id:x.id,employer:x.employer,skills:copy(x.skills),languages:copy(x.languages),shiftStart:x.shiftStart,shiftEnd:x.shiftEnd,presence:w.actualPresence[x.id]})),coverProjectId:cover.projectId,coverPostingId:cover.postingId}}};
 }
 function distributorResponsibility(s,c,hooks){
  const qualificationInfo=qualification(s,c.id,QUALIFICATION_OPERATION,hooks),projects=records(s).filter(p=>p.customerId===c.id&&p.operationId==='distributor-room'&&p.status==='complete').sort((a,b)=>(b.completedAt||0)-(a.completedAt||0));
  if(!projects.length)return {status:'incomplete',missing:['COMPLETED_DISTRIBUTOR_BUNDLE_REQUIRED'],qualification:qualificationInfo};
  const p=projects[0],e=operationEvidence(s,c,p,hooks),missing=[...e.missing];
  if(qualificationInfo.status!=='active'||!permits(s.providerCampaign.contentVersion==='provider-campaigns-8'?purchaseQualification(s,c.id,p.acceptedAt):qualificationInfo.certificate,c.id,'distributor-room',p.acceptedAt)||!permits(qualificationInfo.certificate,c.id,'distributor-room',s.clock))missing.push('CURRENT_SCOPED_DISTRIBUTOR_QUALIFICATION_REQUIRED');
  if(!actors(s).distributor?.roles.includes('distributor'))missing.push('NAMED_DISTRIBUTOR_ROLE_UNAVAILABLE');
  if(missing.length)return {status:'incomplete',missing:[...new Set(missing)],qualification:qualificationInfo};
  return {status:'active',missing:[],qualification:qualificationInfo,record:{version:1,id:`provider-responsibility-distributor-${p.id}`,role:'distributor',organisationId:'branch-distribution',customerId:c.id,scope:e.resources,acceptedAt:p.acceptedAt,effectiveAt:p.completedAt,expiresAt:qualificationInfo.certificate.expiresAt,projectId:p.id,postingId:e.posting.id,terms:{setupCents:p.setupCents,periodCents:p.periodCents,engineers:p.engineers,support:p.support},evidence:{qualificationId:qualificationInfo.certificate.id,qualificationProjectId:qualificationInfo.certificate.projectId,qualificationPostingId:qualificationInfo.certificate.postingId}}};
 }
 function integratorResponsibility(s,c,hooks){
  const p=records(s).findLast(p=>p.customerId===c.id&&p.operationId==='integrator-room'&&p.status==='complete'&&!p.serviceRetirement);
  if(!p)return {status:'incomplete',missing:['PAID_INTEGRATOR_ROOM_REQUIRED']};
  const e=operationEvidence(s,c,p,hooks),root=e.root,missing=[...e.missing],room=root?.resources?.room;
  if(!actors(s).integrator?.roles.includes('integrator'))missing.push('NAMED_INTEGRATOR_ROLE_UNAVAILABLE');
  if(!['active','renewal'].includes(c.status)||room?.generation!==p.expectedGenerations?.room||!room?.effective?.calendar)missing.push('CURRENT_INTEGRATED_ROOM_REQUIRED');
  const sessions=(root?.information?.meetingSessions||[]).filter(m=>m.status==='completed'&&m.startedAt>=p.completedAt&&m.roomId==='room'&&m.platformDependency?.generation===root.resources[m.platformDependency.resourceId]?.generation);
  if(!sessions.length)missing.push('DELIVERED_INTEGRATED_MEETING_REQUIRED');
  if(missing.length)return {status:'incomplete',missing:[...new Set(missing)]};
  return {status:'active',missing:[],record:{version:1,id:`provider-responsibility-integrator-${p.id}`,role:'integrator',organisationId:'twig-integrations',customerId:c.id,scope:['room'],acceptedAt:p.acceptedAt,effectiveAt:p.completedAt,expiresAt:null,projectId:p.id,postingId:e.posting.id,terms:{setupCents:p.setupCents,periodCents:p.periodCents,engineers:p.engineers,support:p.support},evidence:{resourceGeneration:room.generation,meetingIds:sessions.map(m=>m.id),platformDependency:copy(sessions.at(-1).platformDependency)}}};
 }
 function responsibilities(s,customerId,hooks={}){
  if(!optedIn(s))return {status:'unavailable',missing:['COMMERCIAL_RESPONSIBILITY_VERSION_NOT_ENABLED'],records:[]};
  const customers=customerId===undefined?s.providerCampaign?.customers||[]:(s.providerCampaign?.customers||[]).filter(c=>c.id===customerId);
  if(!Array.isArray(customers))fail('INVALID_PROVIDER_RESPONSIBILITY_STATE');
  return {status:'available',missing:[],records:customers.flatMap(c=>[mspResponsibility(s,c,hooks),bpoResponsibility(s,c,hooks),distributorResponsibility(s,c,hooks),integratorResponsibility(s,c,hooks)].filter(x=>x.status==='active').map(x=>copy(x.record)))};
 }
 function comparison(quoteRows,termPeriods=3){
  if(!Array.isArray(quoteRows)||!integer(termPeriods)||termPeriods<1||termPeriods>120)fail('INVALID_PROVIDER_RESPONSIBILITY_COMPARISON');
  const byId=Object.fromEntries(quoteRows.map(x=>[x?.id,x?.quote]));
  const rows=['room','partner-qualification','distributor-room'].map(id=>({id,quote:byId[id]||null}));
  const [direct,qualifier,distributed]=rows.map(x=>x.quote);
  const valid=q=>q&&Number.isSafeInteger(q.setupCents)&&q.setupCents>=0&&Number.isSafeInteger(q.periodCents)&&q.periodCents>=0&&Number.isSafeInteger(q.workMinutes)&&q.workMinutes>=0;
  const estimate=(qs)=>({setupCents:qs.reduce((n,q)=>n+q.setupCents,0),recurringCentsPerPeriod:qs.reduce((n,q)=>n+q.periodCents,0),termPeriods,quotedTermCents:qs.reduce((n,q)=>n+q.setupCents+q.periodCents*termPeriods,0),workMinutes:qs.reduce((n,q)=>n+q.workMinutes,0),engineers:Math.max(0,...qs.map(q=>q.engineers||0)),support:Math.max(0,...qs.map(q=>q.support||0)),engineerMinutes:qs.reduce((n,q)=>n+(q.engineers||0)*q.workMinutes,0),supportMinutes:qs.reduce((n,q)=>n+(q.support||0)*q.workMinutes,0),blockers:qs.flatMap(q=>q.blockers||[])});
  return {termPeriods,integrator:valid(byId['integrator-room'])?estimate([byId['integrator-room']]):null,direct:valid(direct)?estimate([direct]):null,qualification:valid(qualifier)?estimate([qualifier]):null,distributor:valid(distributed)&&valid(qualifier)?estimate([qualifier,distributed]):valid(distributed)?estimate([distributed]):null,source:'SOC.provider.quote'};
 }
 function inspect(s,hooks={}){
  if(!s?.providerCampaign)return {status:'unavailable',missing:['PROVIDER_CAMPAIGN_REQUIRED'],qualifications:[],responsibilities:[],comparison:null};
  if(!optedIn(s))return {status:'unavailable',version:null,missing:['COMMERCIAL_RESPONSIBILITY_VERSION_NOT_ENABLED'],qualifications:[],responsibilities:[],comparison:null};
  const qualifications=s.providerCampaign.customers.map(c=>({customerId:c.id,...qualification(s,c.id,QUALIFICATION_OPERATION,hooks)}));
  const evaluated=responsibilities(s,undefined,hooks);
  return {pack:PACK,version:VERSION,status:'available',asOf:s.clock,qualifications,responsibilities:evaluated.records,missing:[],comparison:null};
 }
 function source(){return `const SOC_PROVIDER_RESPONSIBILITY=(${socProviderResponsibilityKernel.toString()})();`;}
 return {PACK,VERSION,QUALIFICATION_MINUTES,SCOPES:copy(SCOPES),validate,qualification,qualificationReadiness,purchaseQualification,permits,responsibilities,comparison,inspect,source};
}
const SOC_PROVIDER_RESPONSIBILITY=socProviderResponsibilityKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_RESPONSIBILITY;
