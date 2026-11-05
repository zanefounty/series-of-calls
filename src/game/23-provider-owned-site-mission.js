/* Paid MSP support evidence for the Provider-owned-sites GI acceptance adapter. */
function socProviderOwnedSiteMissionKernel(){
 'use strict';
 const PACK='soc-provider-owned-site-mission-1',VERSION=1,KIND='provider-owned-site-mission-support';
 const SCENARIOS=['defence','enterprise','government','smb'];
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(x);
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
 function factsApi(){return typeof SOC_PROVIDER_PROGRESSION_FACTS!=='undefined'?SOC_PROVIDER_PROGRESSION_FACTS:require('./23-provider-progression.js');}
 function customer(s,customerId){return s?.providerCampaign?.customers?.find(x=>x.id===customerId)||null;}
 function project(s,customerId,projectId,stage){return s?.providerCampaign?.projects?.find(x=>x.id===projectId&&x.customerId===customerId&&x.kind==='stage'&&x.stage===stage)||null;}
 function paidStage(s,p){
  if(!p||p.status!=='complete'||!integer(p.acceptedAt)||!integer(p.completedAt)||p.completedAt<p.acceptedAt||!integer(p.setupCents)||!integer(p.periodCents))return false;
  const posting=s.business?.ledger?.find(x=>x.id===p.postingId);
  if(posting)return posting.category==='cost'&&posting.reason==='provider-implementation'&&posting.customerId===p.customerId&&posting.projectId===p.id&&posting.cents===p.setupCents;
  const match=/^entry-([1-9]\d*)$/.exec(p.postingId||'');
  return !!match&&Number(match[1])<=(s.business?.ledgerPrunedThrough||0)&&s.providerCampaign.projects.includes(p);
 }
 function missionReferences(summary,at){
  if(!summary||!exact(summary,['version','at','missions'])||summary.version!==1||!integer(summary.at,0,at)||!Array.isArray(summary.missions)||summary.missions.length!==4)return null;
  const rows=summary.missions.slice().sort((a,b)=>String(a?.victory?.scenario).localeCompare(String(b?.victory?.scenario)));
  if(!same(rows.map(x=>x?.victory?.scenario),SCENARIOS))return null;
  const references=[];
  for(const row of rows){
   if(!exact(row,['customerId','tenant','victory','projectId','postingId'])||!id(row.customerId)||!id(row.tenant)||!id(row.projectId)||!id(row.postingId))return null;
   const proof=row.victory,proofKeys=['version','eventId','scenario','at','focusCustomerId','winnerCustomerId','qualifiedPeriods','nextStage','periods'];
   if(!exact(proof,proofKeys)||proof.version!==1||proof.scenario!==row.victory.scenario||proof.winnerCustomerId!==row.customerId||!id(proof.eventId)||!integer(proof.at,0,summary.at)||!id(proof.focusCustomerId)||!integer(proof.qualifiedPeriods,1)||typeof proof.nextStage!=='string'||!Array.isArray(proof.periods)||!proof.periods.length)return null;
   references.push({scenario:proof.scenario,customerId:row.customerId,tenant:row.tenant,eventId:proof.eventId,at:proof.at,projectId:row.projectId,postingId:row.postingId});
  }
  if(new Set(references.map(x=>x.customerId)).size!==4)return null;
  return {missionAt:summary.at,references};
 }
 function normalizeResponsibility(record){return record?{...copy(record),scope:Array.isArray(record.scope)?[...record.scope].sort():record.scope}:null;}
 function currentRecord(s,customerId,hooks){
  if(typeof hooks.currentResponsibility!=='function')return null;
  const value=hooks.currentResponsibility(s,customerId);
  if(value?.status==='active')return normalizeResponsibility(value.record||null);
  return normalizeResponsibility(value?.record||value||null);
 }
 function validResponsibility(s,customerId,record,{historical=false,sample=null}={}){
  const keys=['version','id','role','organisationId','customerId','scope','acceptedAt','effectiveAt','expiresAt','projectId','postingId','terms','evidence'];
  if(!exact(record,keys)||record.version!==1||record.id!==`provider-responsibility-msp-${customerId}`||record.role!=='msp'||record.organisationId!=='orchard-msp'||record.customerId!==customerId||!Array.isArray(record.scope)||!integer(record.acceptedAt)||!integer(record.effectiveAt)||record.expiresAt!==null||!id(record.projectId)||!id(record.postingId))return false;
  const c=customer(s,customerId),rows=record.evidence?.stageProjects,workforce=record.evidence?.sharedWorkforce;
  if(!c||!Array.isArray(rows)||rows.length!==3||!exact(workforce,['engineers','support','personMinutes','billedMinutes'])||!Object.values(workforce).every(x=>integer(x))||workforce.support<1||workforce.personMinutes<1||workforce.billedMinutes<1)return false;
  const stageIds=['base','carrier','partner'],projects=stageIds.map((stage,index)=>{
   const state=c.stages?.[stage],p=state&&project(s,customerId,state.projectId,stage),row=rows[index];
   if(!state||state.status!=='effective'||!p||!paidStage(s,p)||!exact(row,['stageId','projectId','postingId'])||row.stageId!==stage||row.projectId!==p.id||row.postingId!==p.postingId)return null;
   return p;
  });
  if(projects.some(x=>!x))return false;
  const expectedScope=[...new Set(projects.flatMap(p=>p.resources||[]))].sort();
  if(!same(record.scope,[...record.scope].sort())||!same(record.scope,expectedScope)||record.projectId!==projects[2].id||record.postingId!==projects[2].postingId)return false;
  if(!exact(record.terms,['setupCents','periodCents','engineers','support'])||!['setupCents','periodCents','engineers','support'].every(k=>integer(record.terms[k]))||record.terms.setupCents!==projects.reduce((n,p)=>n+p.setupCents,0)||record.terms.periodCents!==projects.reduce((n,p)=>n+p.periodCents,0)||record.terms.support<1||record.effectiveAt!==Math.max(...projects.map(p=>p.completedAt)))return false;
  const agreementAt=c.retailAgreement?.at??c.startedAt;
  if(historical?record.acceptedAt<c.startedAt||record.acceptedAt>agreementAt:record.acceptedAt!==agreementAt)return false;
  if(sample){
   const p=sample.participants?.[0],r=p?.responsibility,shared=record.evidence.sharedWorkforce;
   if(!p||p.customerId!==customerId||!Array.isArray(p.missing)||!r||r.id!==record.id||r.customerId!==customerId||r.role!=='msp'||r.organisationId!=='orchard-msp'||r.projectId!==record.projectId||r.postingId!==record.postingId||r.effectiveAt!==record.effectiveAt||r.expiresAt!==record.expiresAt||!same(r.scope,record.scope)||r.setupCents!==record.terms.setupCents||r.periodCents!==record.terms.periodCents||r.engineers!==record.terms.engineers||r.support!==record.terms.support||!r.sharedWorkforce||!same(r.sharedWorkforce,shared)||p.resources.some(resource=>resource.generation===null))return false;
  }
  if(!historical){
   if(!['active','renewal'].includes(c.status))return false;
   const team=s.business?.workforce;if(!team||team.support<1||record.terms.engineers!==team.engineers||record.terms.support!==team.support||record.evidence.sharedWorkforce.engineers!==team.engineers||record.evidence.sharedWorkforce.support!==team.support||s.providerCampaign.payroll.personMinutes<workforce.personMinutes||s.providerCampaign.payroll.billedMinutes<workforce.billedMinutes)return false;
  }
  return true;
 }
 function oneCustomerSample(s,customerId,hooks){
  if(typeof hooks.currentSupportSample!=='function')return null;
  const value=hooks.currentSupportSample(s,customerId);
  if(!value||!integer(value.at)||value.at!==s.clock||!Array.isArray(value.participants))return null;
  const participant=value.participants.find(x=>x.customerId===customerId);if(!participant)return null;
  return {version:value.version,contentVersion:value.contentVersion,at:value.at,cohort:[customerId],participants:[copy(participant)]};
 }
 function staffPayrollPosting(s,at){
  const rows=s.business?.ledger||[];
  return copy(rows.filter(x=>x?.reason==='staff'&&x.category==='cost'&&x.unit==='person-minute'&&integer(x.at,0,at)&&integer(x.quantity,1)&&x.cents===Math.floor(x.quantity*10000/60)).at(-1)||null);
 }
 function validStaffPayrollPosting(s,posting,at,record,{historical=false}={}){
  if(!exact(posting,['id','at','category','cents','currency','reason','unit','quantity'])||!/^entry-[1-9]\d*$/.test(posting.id)||!integer(posting.at,0,at)||posting.category!=='cost'||posting.currency!=='AUD'||posting.reason!=='staff'||posting.unit!=='person-minute'||!integer(posting.quantity,1)||posting.cents!==Math.floor(posting.quantity*10000/60))return false;
  const workforce=record?.evidence?.sharedWorkforce;
  if(!workforce||!integer(workforce.billedMinutes,1)||!integer(workforce.personMinutes,workforce.billedMinutes)||posting.quantity>workforce.billedMinutes||posting.quantity>workforce.personMinutes)return false;
  const paid=s.business?.ledger?.find(x=>x.id===posting.id);
  if(paid)return same(paid,posting);
  const number=Number(posting.id.slice(6));
  if(!historical||!Number.isSafeInteger(number)||number>(s.business?.ledgerPrunedThrough||0))return false;
  return true;
 }
 function evaluate(s,customerId,missionSummary,hooks={}){
  if(!s?.providerCampaign||s.providerCampaign.pack!=='soc-provider-campaign-1'||!['provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)||!id(customerId)||!integer(s.clock))fail('PROVIDER_OWNED_SITE_MISSION_CAMPAIGN_REQUIRED');
  const references=missionReferences(missionSummary,s.clock);if(!references)return {status:'incomplete',missing:['FOUR_RETAINED_PROVIDER_MISSION_VICTORIES_REQUIRED'],evidence:null};
  if(typeof hooks.validateMissionEvidence!=='function'||hooks.validateMissionEvidence(s,customerId,missionSummary)!==true)return {status:'incomplete',missing:['FOUR_RETAINED_PROVIDER_MISSION_VICTORIES_REQUIRED'],evidence:null};
  const record=currentRecord(s,customerId,hooks);if(!record)return {status:'incomplete',missing:['CURRENT_PAID_NAMED_MSP_RESPONSIBILITY_REQUIRED'],evidence:null};
  const sample=oneCustomerSample(s,customerId,hooks);if(!sample)return {status:'incomplete',missing:['CURRENT_PROVIDER_SUPPORT_SAMPLE_REQUIRED'],evidence:null};
  if(!validResponsibility(s,customerId,record,{sample}))return {status:'incomplete',missing:['CURRENT_PAID_NAMED_MSP_RESPONSIBILITY_REQUIRED'],evidence:null};
  const payrollPosting=staffPayrollPosting(s,s.clock);if(!payrollPosting||!validStaffPayrollPosting(s,payrollPosting,s.clock,record))return {status:'incomplete',missing:['CURRENT_PAID_SHARED_PAYROLL_POSTING_REQUIRED'],evidence:null};
  let samplesValid=false;try{samplesValid=factsApi().validateSupportSamples(s,[sample],hooks.factHooks||hooks,{checkCurrent:false})===true;}catch{}
  if(!samplesValid)return {status:'incomplete',missing:['CURRENT_PROVIDER_SUPPORT_SAMPLE_INVALID'],evidence:null};
  return {status:'ready',missing:[],evidence:{kind:KIND,version:VERSION,customerId,at:s.clock,missionAt:references.missionAt,missionReferences:references.references,responsibility:copy(record),supportSample:sample,payrollPosting}};
 }
 function validateEvidence(s,customerId,evidence,missionSummary,hooks={},options={}){
  if(!s?.providerCampaign||s.providerCampaign.pack!=='soc-provider-campaign-1'||!['provider-campaigns-7','provider-campaigns-8'].includes(s.providerCampaign.contentVersion)||!id(customerId)||!evidence||!exact(evidence,['kind','version','customerId','at','missionAt','missionReferences','responsibility','supportSample','payrollPosting'])||evidence.kind!==KIND||evidence.version!==VERSION||evidence.customerId!==customerId||!integer(evidence.at)||!integer(evidence.missionAt,0,evidence.at)||!integer(options.claimedAt??evidence.at,evidence.at,evidence.at))return false;
  const references=missionReferences(missionSummary,s.clock);if(!references||references.missionAt!==evidence.missionAt||!same(references.references,evidence.missionReferences))return false;
  if(typeof hooks.validateMissionEvidence!=='function'||hooks.validateMissionEvidence(s,customerId,missionSummary)!==true)return false;
  if(!validResponsibility(s,customerId,evidence.responsibility,{historical:options.historical===true,sample:evidence.supportSample}))return false;
  const sample=evidence.supportSample;if(!exact(sample,['version','contentVersion','at','cohort','participants'])||sample.version!==1||sample.contentVersion!==factsApi().CONTENT||sample.at!==evidence.at||!same(sample.cohort,[customerId])||sample.participants.length!==1)return false;
  if(!validStaffPayrollPosting(s,evidence.payrollPosting,evidence.at,evidence.responsibility,{historical:options.historical===true}))return false;
  let lineage=false;try{lineage=factsApi().validateSupportSamples(s,[sample],hooks.factHooks||hooks,{checkCurrent:false})===true;}catch{}
  if(!lineage)return false;
  if(options.historical===true){
   if(typeof hooks.validateHistoricalSupportSnapshot!=='function'||hooks.validateHistoricalSupportSnapshot(s,customerId,evidence.at,copy(evidence))!==true)return false;
   const retained=Array.isArray(hooks.supportSamples)?hooks.supportSamples:[];
   const actual=retained.find(x=>x.at===sample.at);
   if(actual){const participant=actual.participants?.find(x=>x.customerId===customerId);if(!participant||!same(sample.participants[0],participant))return false;}
   else if(!retained.length||retained.length<60||retained[0].at<=sample.at)return false;
   return true;
  }
  const current=evaluate(s,customerId,missionSummary,hooks);
  return current.status==='ready'&&same(current.evidence,evidence);
 }
 function source(){return `const SOC_PROVIDER_OWNED_SITE_MISSION=(${socProviderOwnedSiteMissionKernel.toString()})();`;}
 return {PACK,VERSION,KIND,evaluate,validateEvidence,source};
}
const SOC_PROVIDER_OWNED_SITE_MISSION=socProviderOwnedSiteMissionKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_OWNED_SITE_MISSION;
