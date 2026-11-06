/* P5 facts from the two Provider integrations with paid, scoped delivery adapters. */
function socProviderPartnerProgressionKernel(){
 'use strict';
 const VERSION=1,TARGET=5,PACK='soc-provider-partner-progression-1';
 const IDS=Object.freeze({ucCc:'workplace-to-contact-quality',room:'room-to-interop'});
 const MISSING=Object.freeze([
  'provider-partner-integration-required:workplace-to-suite-calling',
  'provider-partner-integration-required:communications-api-to-engagement-workflow',
  'provider-partner-integration-required:local-speech-product-integration'
 ]);
 const copy=x=>x==null?x:JSON.parse(JSON.stringify(x)),plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x),int=x=>Number.isSafeInteger(x)&&x>=0,
  exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(','),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function ucApi(){return typeof SOC_PROVIDER_UC_CC_INTEGRATION!=='undefined'?SOC_PROVIDER_UC_CC_INTEGRATION:require('./23-provider-uc-cc-integration.js');}
 function roomApi(){return typeof SOC_PROVIDER_ROOM_INTEGRATION!=='undefined'?SOC_PROVIDER_ROOM_INTEGRATION:require('./23-provider-room-integration.js');}
 function supportApi(){return typeof SOC_PROVIDER_INTEGRATION_SUPPORT!=='undefined'?SOC_PROVIDER_INTEGRATION_SUPPORT:require('./23-provider-integration-support.js');}
 function responsibilityApi(){return typeof SOC_PROVIDER_RESPONSIBILITY!=='undefined'?SOC_PROVIDER_RESPONSIBILITY:require('./23-provider-responsibility.js');}
 function customers(s){return Array.isArray(s?.providerCampaign?.customers)?s.providerCampaign.customers:[];}
 function rootFor(s,c){return s?.portfolio?.customers?.find(x=>x.id===c?.portfolioId||x.id===c?.id)?.root||null;}
 function operationProjects(s,c,ids){return (s.providerCampaign?.projects||[]).filter(p=>p.customerId===c.id&&ids.includes(p.operationId)&&p.kind==='operation'&&p.status==='complete'&&int(p.completedAt)&&p.completedAt<=s.clock).sort((a,b)=>(b.completedAt-a.completedAt)||a.id.localeCompare(b.id));}
 function customerAt(c,at){if(!c||!int(c.startedAt)||c.startedAt>at)return false;if(c.status==='active'||c.status==='renewal')return true;if(c.status==='exited'||c.status==='default'){const endedAt=c.status==='exited'?c.exitAt:c.defaultAt;return int(endedAt)&&at<endedAt;}return false;}
 function hooksFor(hooks,state,customer,root,adapter){const selected=typeof hooks.forAdapter==='function'?(hooks.forAdapter(state,customer,root,adapter)||{}):(hooks[adapter]||hooks);return typeof selected.observeResource==='function'||typeof hooks.observeResource!=='function'?selected:{...selected,observeResource:hooks.observeResource};}
 function scopeRecord(s,c,resourceIds,hooks,at=s.clock){
  let result;try{result=responsibilityApi().responsibilities(s,c.id,hooks);}catch{return null;}
  return (result?.records||[]).filter(r=>r.customerId===c.id&&['msp','integrator'].includes(r.role)&&int(r.effectiveAt)&&r.effectiveAt<=at&&(r.expiresAt===null||int(r.expiresAt)&&at<r.expiresAt)&&resourceIds.every(id=>(r.scope||[]).includes(id)))
   .sort((a,b)=>a.role.localeCompare(b.role)||a.organisationId.localeCompare(b.organisationId)||a.id.localeCompare(b.id))[0]||null;
 }
 function postingMatches(s,p){const row=s.business?.ledger?.find(x=>x.id===p.postingId);if(row)return row.category==='cost'&&row.customerId===p.customerId&&row.projectId===p.id&&row.cents===p.setupCents;const n=Number(/^entry-([1-9]\d*)$/.exec(p.postingId||'')?.[1]||0);return n>0&&n<=(s.business?.ledgerPrunedThrough||0);}
 function ucRow(s,c,p,hooks,historical=false,diagnostics=[]){
  const api=ucApi(),root=rootFor(s,c);if(!root||root.providerCustomer?.id!==c.id||root.providerCampaign)return null;
  if(!customerAt(c,p.completedAt))return null;
  const observed=historical?{status:p.operationReceipt?.task?'ready':'incomplete',evidence:p.operationReceipt?.task||null}:api.observe(s,p.id,hooks);
  if(observed.status!=='ready'||!observed.evidence)return null;
  const proof=observed.evidence,plan=proof.plan,test=proof.test,edge=plan?.edge;
  if(!postingMatches(s,p)||!api.validateProject(s,p.id,hooks)||!api.validateTaskEvidence(s,p.id,proof,hooks,{historical:true})||
     edge?.id!==IDS.ucCc||!test||test.result?.status!=='scenario-verified'||test.result?.checkedAt!==test.at||
     plan.source?.deploymentId!=='d-ms-workplace-calling'||plan.target?.deploymentId!=='d-cisco-contact-centre'||
     plan.source?.feature!=='telephony'||plan.target?.feature!=='quality-review'||
     test.result?.sourceGeneration!==plan.source.generation||test.result?.targetGeneration!==plan.target.generation||
     test.result?.sourceVersion!==plan.source.productVersion||test.result?.targetVersion!==plan.target.productVersion)return null;
  const resourceIds=[plan.source.resourceId,plan.target.resourceId];
  const supportRecord=scopeRecord(s,c,resourceIds,hooks,historical?test.at:s.clock);
  // At claim time the native test retains the exact paid support boundary and
  // provider-stage sources. Historical validation relies on that native receipt.
  if(!test.supportScope?.resources)return null;
  const testScopeMissing=resourceIds.filter(id=>!test.supportScope.resources.includes(id));if(testScopeMissing.length){for(const resource of testScopeMissing)diagnostics.push(`current-owner-scope-required:${IDS.ucCc}:${resource}`);return null;}
  if(!historical){const actualScope=supportRecord&&{projectIds:[...(supportRecord.evidence?.stageProjects||[]).map(x=>x.projectId)].sort(),postingIds:[...(supportRecord.evidence?.stageProjects||[]).map(x=>x.postingId)].sort(),resources:[...(supportRecord.scope||[])].sort()};if(!supportRecord||supportRecord.role!=='msp'||supportRecord.organisationId!=='orchard-msp'||!same(actualScope,test.supportScope)){for(const resource of resourceIds.filter(id=>!supportRecord?.scope?.includes(id)))diagnostics.push(`current-owner-scope-required:${IDS.ucCc}:${resource}`);return null;}}
  const support={role:'msp',organisationId:'orchard-msp',scope:copy(test.supportScope)};
  return {version:VERSION,adapter:'provider-uc-cc',key:`${edge.id}:${edge.source}:${edge.features[0].sourceFeature}->${edge.target}:${edge.features[0].targetFeature}`,
   customerId:c.id,projectId:p.id,postingId:p.postingId,completedAt:p.completedAt,edgeId:edge.id,
   source:{deploymentId:plan.source.deploymentId,family:plan.source.family,feature:plan.source.feature,resourceId:plan.source.resourceId,generation:plan.source.generation,productVersion:plan.source.productVersion},
   target:{deploymentId:plan.target.deploymentId,family:plan.target.family,feature:plan.target.feature,resourceId:plan.target.resourceId,generation:plan.target.generation,productVersion:plan.target.productVersion},
   testAt:test.at,test:copy(test),delivery:copy(proof),support};
 }
 function roomRow(s,c,p,hooks,historical=false,diagnostics=[],retainedOwner=null){
  const api=roomApi(),root=rootFor(s,c);if(!root||root.providerCustomer?.id!==c.id||root.providerCampaign)return null;
  if(!customerAt(c,p.completedAt))return null;
  const observed=api.projectEvidence(s,p.id,hooks);if(observed.ready!==true||!observed.evidence||!postingMatches(s,p))return null;
  const proof=observed.evidence,receipt=p.operationReceipt,plan=receipt?.plan,acceptance=proof.meeting?.acceptance,edge=plan?.edge;
  if(api.validateProjectEvidence(s,p,hooks).valid!==true||edge?.id!==IDS.room||!receipt?.test||receipt.test.status!=='scenario-verified'||
     plan.source?.deploymentId!=='d-ms-meetings-room'||plan.target?.deploymentId!=='d-cisco-meetings-interoperability'||
     plan.source?.feature!=='room-devices'||plan.target?.feature!=='interop-join'||
     acceptance?.edgeId!==IDS.room||acceptance.testAt!==receipt.test.checkedAt||
     acceptance.source?.generation!==plan.source.generation||acceptance.target?.generation!==plan.target.generation||
     acceptance.source?.productVersion!==plan.source.productVersion||acceptance.target?.productVersion!==plan.target.productVersion)return null;
  if(!historical){const current=root.products?.integrations?.find(x=>x.id===IDS.room)?.result,source=root.products?.deployments?.find(x=>x.id===plan.source.deploymentId),target=root.products?.deployments?.find(x=>x.id===plan.target.deploymentId);if(current?.status!=='scenario-verified'||current.checkedAt!==acceptance.testAt||current.sourceGeneration!==plan.source.generation||current.targetGeneration!==plan.target.generation||current.sourceVersion!==plan.source.productVersion||current.targetVersion!==plan.target.productVersion||source?.provisioning?.status!=='ready'||source.provisioning.generation!==source.generation||source.generation!==plan.source.generation||source.effective?.productVersion!==plan.source.productVersion||target?.provisioning?.status!=='ready'||target.provisioning.generation!==target.generation||target.generation!==plan.target.generation||target.effective?.productVersion!==plan.target.productVersion)return null;}
  const resourceIds=[plan.source.binding?.resources?.[0],plan.target.binding?.resources?.[0]].filter(Boolean);
  const supportOwner=historical?(retainedOwner&&supportApi().validateOwner(s,retainedOwner,{at:proof.completedAt,hooks})?retainedOwner:null):supportApi().supportFor(s,c.id,['room'],{at:s.clock,hooks}).owners.find(x=>x.adapter==='provider-room'&&x.role==='integrator')||null;
  const support=supportOwner&&supportOwner.role==='integrator'&&supportOwner.organisationId==='twig-integrations'&&supportOwner.scope.includes('room')&&supportOwner.effectiveAt<=proof.completedAt&&(supportOwner.expiresAt===null||proof.completedAt<supportOwner.expiresAt)?supportOwner:null;
  if(!support){for(const resource of resourceIds)diagnostics.push(`current-owner-scope-required:${IDS.room}:${resource}`);return null;}
  const key=`${edge.id}:${edge.source}:${edge.features[0].sourceFeature}->${edge.target}:${edge.features[0].targetFeature}`;
  return {version:VERSION,adapter:'provider-room',key,customerId:c.id,projectId:p.id,postingId:p.postingId,completedAt:p.completedAt,edgeId:edge.id,
   source:{deploymentId:plan.source.deploymentId,family:plan.source.family,feature:plan.source.feature,resourceId:resourceIds[0],generation:plan.source.generation,productVersion:plan.source.productVersion},
   target:{deploymentId:plan.target.deploymentId,family:plan.target.family,feature:plan.target.feature,resourceId:resourceIds[1],generation:plan.target.generation,productVersion:plan.target.productVersion},
   testAt:receipt.test.checkedAt,test:copy(receipt.test),delivery:copy(proof),support:copy(support)};
 }
 function candidateRows(s,hooks={},historical=false,diagnostics=[],retainedEvidence=[]){
  const out=[];
  for(const c of customers(s)){
   if(!historical&&!['active','renewal'].includes(c.status))continue;
   const uc=operationProjects(s,c,ucApi().OPERATION_IDS);
   for(const p of uc){const row=ucRow(s,c,p,hooksFor(hooks,s,c,rootFor(s,c),'ucCc'),historical,diagnostics);if(row)out.push(row);}
   const room=operationProjects(s,c,[roomApi().OPERATION_ID]);
   for(const p of room){const retained=retainedEvidence.find(x=>x?.adapter==='provider-room'&&x.customerId===c.id&&x.projectId===p.id);const row=roomRow(s,c,p,hooksFor(hooks,s,c,rootFor(s,c),'room'),historical,diagnostics,retained?.support);if(row)out.push(row);}
  }
  const distinct=new Map();for(const row of out.sort((a,b)=>a.key.localeCompare(b.key)||a.testAt-b.testAt||a.customerId.localeCompare(b.customerId)))if(!distinct.has(row.key))distinct.set(row.key,row);
  return [...distinct.values()];
 }
 function evaluate(s,hooks={}){
  if(!s?.providerCampaign||!Array.isArray(s.providerCampaign.customers)||!Array.isArray(s.providerCampaign.projects)){const evidence={pack:PACK,version:VERSION,count:0,target:TARGET,integrations:[]};return {...evidence,status:'incomplete',evidence,missing:['provider-campaign-required']};}
  const diagnostics=[],integrations=candidateRows(s,hooks,false,diagnostics),missing=[...new Set([...diagnostics,...MISSING])];
  const evidence={pack:PACK,version:VERSION,count:integrations.length,target:TARGET,integrations:copy(integrations)};
  return {...evidence,status:integrations.length>=TARGET?'ready':'incomplete',evidence,missing:integrations.length>=TARGET?[]:missing};
 }
 function validateEvidence(s,evidence,hooks={}){
  if(!exact(evidence,['pack','version','count','target','integrations'])||evidence.pack!==PACK||evidence.version!==VERSION||evidence.target!==TARGET||!Array.isArray(evidence.integrations)||evidence.count!==evidence.integrations.length)return {valid:false,missing:['invalid-provider-partner-progression-evidence']};
  const seen=new Set();for(const row of evidence.integrations){if(!plain(row)||row.version!==VERSION||typeof row.key!=='string'||seen.has(row.key))return {valid:false,missing:['duplicate-or-invalid-partner-edge']};seen.add(row.key);}
  const available=candidateRows(s,hooks,true,[],evidence.integrations),validated=[];
  for(const row of evidence.integrations){const actual=available.find(x=>x.key===row.key&&x.customerId===row.customerId&&x.projectId===row.projectId&&x.testAt===row.testAt);if(!actual||!same(actual,row))return {valid:false,missing:['retained-partner-integration-scope-invalid']};validated.push(actual);}
  return {valid:evidence.count>=TARGET,missing:evidence.count>=TARGET?[]:['five-distinct-current-tested-partner-integrations-required'],historical:true,count:validated.length};
 }
 function source(){return `const SOC_PROVIDER_PARTNER_PROGRESSION=(${socProviderPartnerProgressionKernel.toString()})();`;}
 return {PACK,VERSION,TARGET,IDS,MISSING,evaluate,validateEvidence,source};
}
const SOC_PROVIDER_PARTNER_PROGRESSION=socProviderPartnerProgressionKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_PARTNER_PROGRESSION;
