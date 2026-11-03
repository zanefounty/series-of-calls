/* Synthetic, deployment-scoped product lifecycle evidence. */
function socSpecialistLifecycleKernel(){
 'use strict';
 const PACK='soc-specialist-lifecycle-1',VERSION=1,AS_OF_DATE='2026-11-03';
 const copy=x=>JSON.parse(JSON.stringify(x)), own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=code=>{throw new Error(code);}, int=x=>Number.isSafeInteger(x)&&x>=0;
 const validId=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x), validVersion=x=>typeof x==='string'&&/^[a-z][a-z0-9.-]{0,31}$/.test(x);
 const types=['operator-observation','internal-test','contract-record'];
 const sales=['available','ended'], renewals=['eligible','ineligible'], supports=['supported','ended'];
 const packOf=s=>{const p=s?.specialistLifecycle||s;if(!p||p.pack!==PACK)fail('SPECIALIST_LIFECYCLE_NOT_STARTED');return p;};
 const clock=s=>Number.isSafeInteger(s?.clock)?s.clock:0;
 function create(){return {pack:PACK,version:VERSION,nextId:1,records:[],effectiveRecords:[],renewalChecks:[],commercialBindings:[]};}
 function boundDeployments(root,resources){return (root.products?.deployments||[]).filter(d=>d.effective&&d.provisioning?.status==='ready'&&d.effective.bindings?.some(b=>b.resources.some(resource=>resources.includes(resource)))).map(d=>d.id).sort();}
 function bindContract(root,contract,deploymentIds){
  const p=packOf(root);if(!root.business||!Array.isArray(root.business.contracts)||!root.products||!Array.isArray(root.products.deployments)||!contract||!validId(contract.id)||!Array.isArray(contract.resources)||!Array.isArray(deploymentIds))fail('INVALID_SPECIALIST_LIFECYCLE_LINEAGE');
  const stored=root.business.contracts.find(x=>x.id===contract.id);if(!stored||stored!==contract)fail('UNKNOWN_SPECIALIST_LIFECYCLE_CONTRACT');
  const expected=boundDeployments(root,stored.resources),ids=[...new Set(deploymentIds)].sort();if(ids.length!==deploymentIds.length||!ids.every(validId)||JSON.stringify(ids)!==JSON.stringify(expected))fail('SPECIALIST_LIFECYCLE_BINDING_SNAPSHOT_MISMATCH');
  const prior=p.commercialBindings.find(x=>x.contractId===stored.id);if(prior)fail('SPECIALIST_LIFECYCLE_LINEAGE_ALREADY_RECORDED');
  const supportOwner=stored.supportOwner||root.business.player;if(!validId(supportOwner)||stored.resources.some(x=>!validId(x)))fail('INVALID_SPECIALIST_LIFECYCLE_LINEAGE');
  const record={contractId:stored.id,at:clock(root),deploymentIds:ids,resources:[...stored.resources],supportOwner};p.commercialBindings.push(record);stored.lifecycleDeployments=[...ids];return copy(record);
 }
 function inspectDeployment(root,id,hooks={}){
  if(typeof hooks.inspectDeployment!=='function')return {ok:false,reason:'DEPLOYMENT_INSPECTION_UNAVAILABLE'};
  let d;try{d=hooks.inspectDeployment(root,id);}catch(_){return {ok:false,reason:'DEPLOYMENT_INSPECTION_FAILED'};}
  if(!d||d.exists!==true)return {ok:false,reason:'DEPLOYMENT_NOT_FOUND'};
  if(d.effective!==true)return {ok:false,reason:'DEPLOYMENT_NOT_EFFECTIVE'};
  if(!validId(d.offerId)||typeof d.version!=='string'||!d.version||!Number.isSafeInteger(d.generation)||d.generation<1||!Array.isArray(d.features)||!d.features.length||d.features.some(x=>!validId(x))||new Set(d.features).size!==d.features.length)return {ok:false,reason:'DEPLOYMENT_SCOPE_INVALID'};
  if(d.dependenciesReady!==true)return {ok:false,reason:'DEPLOYMENT_DEPENDENCIES_UNAVAILABLE'};
  return {ok:true,scope:{offerId:d.offerId,version:d.version,generation:d.generation,features:[...d.features].sort()}};
 }
 function authorized(root,ownerId,deploymentId,action,hooks={}){
  if(typeof hooks.authorizeSupportOwner!=='function')return false;
  try{return hooks.authorizeSupportOwner(root,ownerId,deploymentId,action)===true;}catch(_){return false;}
 }
 function sameScope(a,b){return a&&b&&a.offerId===b.offerId&&a.version===b.version&&a.generation===b.generation&&JSON.stringify(a.features)===JSON.stringify(b.features);}
 function validateInput(c){
  if(!c||Object.keys(c).sort().join(',')!=='action, deploymentId, evidenceDate, evidenceType, renewal, sale, support, supportOwnerId'.replaceAll(' ',''))fail('INVALID_SPECIALIST_LIFECYCLE_COMMAND');
  if(c.action!=='record'||!validId(c.deploymentId)||!validId(c.supportOwnerId)||!types.includes(c.evidenceType)||!sales.includes(c.sale)||!renewals.includes(c.renewal)||!supports.includes(c.support)||typeof c.evidenceDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(c.evidenceDate)||!Number.isFinite(Date.parse(c.evidenceDate+'T00:00:00Z'))||new Date(c.evidenceDate+'T00:00:00Z').toISOString().slice(0,10)!==c.evidenceDate||c.evidenceDate>AS_OF_DATE)fail('INVALID_SPECIALIST_LIFECYCLE_COMMAND');
 }
 function command(root,c,hooks={}){
  const p=packOf(root);validate(root);if(!c||typeof c.action!=='string')fail('INVALID_SPECIALIST_LIFECYCLE_COMMAND');
  if(c.action==='record'){
   validateInput(c);
   const d=inspectDeployment(root,c.deploymentId,hooks);if(!d.ok)fail(d.reason);
   if(!authorized(root,c.supportOwnerId,c.deploymentId,'record-evidence',hooks))fail('SUPPORT_OWNER_AUTHORITY_DENIED');
   if(p.nextId>10000||p.records.length>=5000)fail('SPECIALIST_LIFECYCLE_LIMIT');
   const id='lifecycle-evidence-'+p.nextId++;
   const r={id,deploymentId:c.deploymentId,supportOwnerId:c.supportOwnerId,evidenceType:c.evidenceType,evidenceDate:c.evidenceDate,sale:c.sale,renewal:c.renewal,support:c.support,scope:d.scope,recordedAt:clock(root),due:clock(root)+1,status:'pending',failureCode:null};
   p.records.push(r);return copy(r);
  }
  if(c.action==='renewal-check'){
   if(Object.keys(c).sort().join(',')!=='action,deploymentId'||!validId(c.deploymentId))fail('INVALID_SPECIALIST_LIFECYCLE_COMMAND');
   if(p.renewalChecks.length>=5000)fail('SPECIALIST_LIFECYCLE_LIMIT');
   const result=deploymentStatus(root,c.deploymentId,hooks);const current=p.effectiveRecords.find(x=>x.deploymentId===c.deploymentId),evidence=current&&p.records.find(x=>x.id===current.evidenceId);
   if(evidence&&!authorized(root,evidence.supportOwnerId,c.deploymentId,'check-renewal',hooks)){result.renewalReadiness=false;result.renewalReasons=[...new Set([...result.renewalReasons,'SUPPORT_OWNER_RENEWAL_AUTHORITY_DENIED'])];}
   const id='lifecycle-renewal-'+p.nextId++;
   const receipt={id,deploymentId:c.deploymentId,checkedAt:clock(root),status:result.renewalReadiness?'ready':'blocked',reasons:[...result.renewalReasons],evidenceId:result.evidenceId||null,scope:result.scope||null,synthetic:true,financialContractChanged:false};
   p.renewalChecks.push(receipt);return copy(receipt);
  }
  fail('INVALID_SPECIALIST_LIFECYCLE_COMMAND');
 }
 function advance(root,hooks={}){
  const p=packOf(root);validate(root,{allowMaturedPending:true});const at=clock(root);
  for(const r of p.records){if(r.status!=='pending'||r.due>at)continue;
   const d=inspectDeployment(root,r.deploymentId,hooks);
   if(!d.ok){r.status='failed';r.failureCode=d.reason;continue;}
   if(!sameScope(r.scope,d.scope)){r.status='failed';r.failureCode='DEPLOYMENT_SCOPE_STALE';continue;}
   if(!authorized(root,r.supportOwnerId,r.deploymentId,'record-evidence',hooks)){r.status='failed';r.failureCode='SUPPORT_OWNER_AUTHORITY_DENIED';continue;}
   r.status='ready';r.failureCode=null;
   let current=p.effectiveRecords.find(x=>x.deploymentId===r.deploymentId);
   if(!current){current={deploymentId:r.deploymentId,evidenceId:r.id};p.effectiveRecords.push(current);}else current.evidenceId=r.id;
  }
  return root;
 }
 function deploymentStatus(root,deploymentId,hooks={}){
  const p=packOf(root);validate(root);const current=p.effectiveRecords.find(x=>x.deploymentId===deploymentId),record=current&&p.records.find(r=>r.id===current.evidenceId);
  const d=inspectDeployment(root,deploymentId,hooks),reasons=[];
  if(!record||record.status!=='ready')reasons.push('LIFECYCLE_EVIDENCE_NOT_EFFECTIVE');
  if(!d.ok)reasons.push(d.reason);else if(record&&!sameScope(record.scope,d.scope))reasons.push('LIFECYCLE_EVIDENCE_STALE');
  if(record&&d.ok&&!authorized(root,record.supportOwnerId,deploymentId,'record-evidence',hooks))reasons.push('SUPPORT_OWNER_AUTHORITY_DENIED');
  const evidenceReady=reasons.length===0;
  const renewalReasons=[...reasons];
  if(record){if(record.renewal!=='eligible')renewalReasons.push('RENEWAL_INELIGIBLE');if(record.support!=='supported')renewalReasons.push('SUPPORT_ENDED');if(d.ok&&!authorized(root,record.supportOwnerId,deploymentId,'check-renewal',hooks))renewalReasons.push('SUPPORT_OWNER_RENEWAL_AUTHORITY_DENIED');}
  const axes=record?{sale:record.sale,renewal:record.renewal,support:record.support}:null;
  return {deploymentId,status:evidenceReady?'ready':(record?'blocked':'unverified'),evidenceReady,supportedEvidenceReady:evidenceReady&&record?.support==='supported',renewalReadiness:evidenceReady&&renewalReasons.length===0,renewalReasons:[...new Set(renewalReasons)],evidenceId:record?.id||null,scope:d.ok?copy(d.scope):(record?copy(record.scope):null),axes,synthetic:true,externalLifecycleClaim:false};
 }
 function validate(root,options={}){
  const p=packOf(root),rootClock=clock(root),keys=Object.keys(p).sort().join(',');if(keys!=='commercialBindings,effectiveRecords,nextId,pack,records,renewalChecks,version'||p.version!==VERSION||!Number.isSafeInteger(p.nextId)||p.nextId<1||p.nextId>20000||!Array.isArray(p.records)||p.records.length>5000||!Array.isArray(p.effectiveRecords)||p.effectiveRecords.length>5000||!Array.isArray(p.renewalChecks)||p.renewalChecks.length>5000||!Array.isArray(p.commercialBindings)||p.commercialBindings.length>2000||!Array.isArray(root.business?.contracts)||!Array.isArray(root.products?.deployments))fail('INVALID_SPECIALIST_LIFECYCLE_SAVE');
  const ids=new Set();let max=0;
  for(const r of p.records){if(!r||Object.keys(r).sort().join(',')!=='deploymentId,due,evidenceDate,evidenceType,failureCode,id,recordedAt,renewal,sale,scope,status,support,supportOwnerId'||!/^lifecycle-evidence-[1-9]\d*$/.test(r.id)||ids.has(r.id)||!validId(r.deploymentId)||!validId(r.supportOwnerId)||!types.includes(r.evidenceType)||!sales.includes(r.sale)||!renewals.includes(r.renewal)||!supports.includes(r.support)||typeof r.evidenceDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.evidenceDate)||!Number.isFinite(Date.parse(r.evidenceDate+'T00:00:00Z'))||new Date(r.evidenceDate+'T00:00:00Z').toISOString().slice(0,10)!==r.evidenceDate||r.evidenceDate>AS_OF_DATE||!int(r.recordedAt)||r.recordedAt>rootClock||!int(r.due)||r.due!==r.recordedAt+1||r.status==='pending'&&r.due<=rootClock&&!options.allowMaturedPending||['ready','failed'].includes(r.status)&&r.due>rootClock||!['pending','ready','failed'].includes(r.status)||r.status==='failed'&&typeof r.failureCode!=='string'||r.status!=='failed'&&r.failureCode!==null||!r.scope||Object.keys(r.scope).sort().join(',')!=='features,generation,offerId,version'||!validId(r.scope.offerId)||!validVersion(r.scope.version)||!Number.isSafeInteger(r.scope.generation)||r.scope.generation<1||!Array.isArray(r.scope.features)||!r.scope.features.length||r.scope.features.some(x=>!validId(x))||new Set(r.scope.features).size!==r.scope.features.length||JSON.stringify(r.scope.features)!==JSON.stringify([...r.scope.features].sort()))fail('INVALID_SPECIALIST_LIFECYCLE_SAVE');ids.add(r.id);max=Math.max(max,Number(r.id.slice('lifecycle-evidence-'.length)));}
  const latestReadyByDeployment=new Map();for(const r of p.records)if(r.status==='ready')latestReadyByDeployment.set(r.deploymentId,r);
  const current=new Set();for(const x of p.effectiveRecords){const r=p.records.find(y=>y.id===x?.evidenceId),latest=latestReadyByDeployment.get(x?.deploymentId);if(!x||Object.keys(x).sort().join(',')!=='deploymentId,evidenceId'||!validId(x.deploymentId)||current.has(x.deploymentId)||!r||r.status!=='ready'||r.deploymentId!==x.deploymentId||latest?.id!==r.id)fail('INVALID_SPECIALIST_LIFECYCLE_SAVE');current.add(x.deploymentId);}
  if(current.size!==latestReadyByDeployment.size)fail('INVALID_SPECIALIST_LIFECYCLE_SAVE');
  const checkIds=new Set();for(const x of p.renewalChecks){const r=x?.evidenceId&&p.records.find(y=>y.id===x.evidenceId);const expected=p.records.filter(y=>y.deploymentId===x?.deploymentId&&y.status==='ready'&&y.due<=x?.checkedAt).at(-1)||null;if(!x||Object.keys(x).sort().join(',')!=='checkedAt,deploymentId,evidenceId,financialContractChanged,id,reasons,scope,status,synthetic'||!/^lifecycle-renewal-[1-9]\d*$/.test(x.id)||checkIds.has(x.id)||!validId(x.deploymentId)||!int(x.checkedAt)||x.checkedAt>rootClock||!['ready','blocked'].includes(x.status)||!Array.isArray(x.reasons)||x.reasons.some(y=>typeof y!=='string')||x.status==='ready'&&x.reasons.length||x.status==='blocked'&&!x.reasons.length||x.evidenceId!==(expected?.id||null)||x.evidenceId!==null&&(!r||r.deploymentId!==x.deploymentId||r.status!=='ready')||x.status==='ready'&&(!r||r.renewal!=='eligible'||r.support!=='supported'||!sameScope(x.scope,r.scope))||x.evidenceId!==null&&x.scope!==null&&!sameScope(x.scope,r.scope)||x.synthetic!==true||x.financialContractChanged!==false)fail('INVALID_SPECIALIST_LIFECYCLE_SAVE');checkIds.add(x.id);max=Math.max(max,Number(x.id.slice('lifecycle-renewal-'.length)));}
  const commercialIds=new Set();for(const row of p.commercialBindings){const c=root.business.contracts.find(x=>x.id===row?.contractId),deploymentIds=row?.deploymentIds;if(!row||Object.keys(row).sort().join(',')!=='at,contractId,deploymentIds,resources,supportOwner'||!validId(row.contractId)||commercialIds.has(row.contractId)||!c||!int(row.at)||row.at>rootClock||!Array.isArray(deploymentIds)||new Set(deploymentIds).size!==deploymentIds.length||deploymentIds.some(id=>!validId(id)||!root.products.deployments.some(d=>d.id===id))||JSON.stringify(deploymentIds)!==JSON.stringify([...deploymentIds].sort())||!Array.isArray(row.resources)||!sameArray(row.resources,c.resources)||!validId(row.supportOwner)||row.supportOwner!==(c.supportOwner||root.business.player)||!sameArray(deploymentIds,c.lifecycleDeployments))fail('INVALID_SPECIALIST_LIFECYCLE_LINEAGE');commercialIds.add(row.contractId);}
  if(commercialIds.size!==root.business.contracts.length||root.business.contracts.some(c=>!commercialIds.has(c.id)||!Array.isArray(c.lifecycleDeployments)))fail('INVALID_SPECIALIST_LIFECYCLE_LINEAGE');
  if(p.nextId<=max)fail('INVALID_SPECIALIST_LIFECYCLE_SAVE');return true;
 }
 function sameArray(a,b){return Array.isArray(a)&&Array.isArray(b)&&JSON.stringify(a)===JSON.stringify(b);}
 function inspect(root,hooks={}){const p=packOf(root);validate(root);return {pack:PACK,records:copy(p.records),effectiveRecords:copy(p.effectiveRecords),renewalChecks:copy(p.renewalChecks),commercialBindings:copy(p.commercialBindings),deployments:[...new Set(p.records.map(r=>r.deploymentId))].map(id=>deploymentStatus(root,id,hooks))};}
 function fingerprint(root){const p=packOf(root);validate(root);return JSON.stringify([p.pack,p.version,p.nextId,p.records,p.effectiveRecords,p.renewalChecks,p.commercialBindings]);}
 const source=()=>`const SOC_SPECIALIST_LIFECYCLE=(${socSpecialistLifecycleKernel.toString()})();`;
 return {PACK,VERSION,AS_OF_DATE,evidenceTypes:types,saleStates:sales,renewalStates:renewals,supportStates:supports,create,bindContract,command,advance,validate,inspect,deploymentStatus,fingerprint,source};
}
const SOC_SPECIALIST_LIFECYCLE=socSpecialistLifecycleKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_SPECIALIST_LIFECYCLE;
