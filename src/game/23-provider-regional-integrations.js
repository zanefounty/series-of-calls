/* Paid UC/CC edges for current and retained regional support samples. */
function socProviderRegionalIntegrationsKernel(){
 'use strict';
 const VERSION=1;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const integer=x=>Number.isSafeInteger(x)&&x>=0;
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const KEYS=['id','source','target','sourceVersion','targetVersion','sourceGeneration','targetGeneration','checkedAt','features'];
 function integrationApi(){return typeof SOC_PROVIDER_UC_CC_INTEGRATION!=='undefined'?SOC_PROVIDER_UC_CC_INTEGRATION:require('./23-provider-uc-cc-integration.js');}
 function historyApi(){return typeof SOC_PROVIDER_SUPPORT_HISTORY!=='undefined'?SOC_PROVIDER_SUPPORT_HISTORY:require('./23-provider-support-history.js');}
 function paid(s,p){
  if(!p||p.kind!=='operation'||!integer(p.setupCents)||p.setupCents<1||!integer(p.acceptedAt)||typeof p.postingId!=='string')return false;
  const row=s.business?.ledger?.find(x=>x.id===p.postingId);
  if(row)return row.category==='cost'&&row.reason==='provider-operation'&&row.providerCampaign===true&&row.customerId===p.customerId&&row.projectId===p.id&&row.cents===p.setupCents&&row.at===p.acceptedAt;
  const id=Number(/^entry-([1-9]\d*)$/.exec(p.postingId)?.[1]||0);return id>0&&id<=(s.business?.ledgerPrunedThrough||0);
 }
 function snapshot(p){const r=p.operationReceipt,plan=r.plan;return {id:plan.edge.id,source:plan.source.deploymentId,target:plan.target.deploymentId,sourceVersion:plan.source.productVersion,targetVersion:plan.target.productVersion,sourceGeneration:plan.source.generation,targetGeneration:plan.target.generation,checkedAt:r.test.at,features:copy(plan.edge.features)};}
 // This primitive is safe inside historical product observation: it reads
 // native timelines and paid order anchors only, never support reconstruction.
 function bindingAvailableAt(s,c,child,deploymentId,feature,at,expected){
  if(!s?.providerCampaign||!c||!child||child.providerCustomer?.id!==c.id||child.providerCustomer.version!==1||!integer(at)||at>s.clock)return false;
  const api=integrationApi(),projects=s.providerCampaign.projects||[];
  const histories=edge=>[...(edge.history||[]),...(edge.testHistory?.version===1&&Array.isArray(edge.testHistory.entries)?edge.testHistory.entries:[])];
  const scopeEqual=(a,b)=>a.sourceVersion===b.sourceVersion&&a.targetVersion===b.targetVersion&&a.sourceGeneration===b.sourceGeneration&&a.targetGeneration===b.targetGeneration;
  const planScope=plan=>({sourceVersion:plan.source.productVersion,targetVersion:plan.target.productVersion,sourceGeneration:plan.source.generation,targetGeneration:plan.target.generation});
  function endpoint(id){
   const d=child.products?.deployments?.find(row=>row.id===id);if(!d)return null;
   const past=(d.effectiveHistory||[]).find(row=>integer(row.at)&&at<=row.at);
   let value=past?{generation:past.generation,config:past.effective}:d.provisioning?.status==='ready'&&d.provisioning.generation===d.generation&&d.provisioning.due<=at&&d.effective?{generation:d.generation,config:d.effective}:null;
   if(!value)return null;
   const product=projects.filter(p=>p.customerId===c.id&&p.productId===id.slice(2)&&p.operationReceipt?.kind==='product'&&p.operationReceipt.recipeId===p.productId&&p.configSubmittedAt===p.operationReceipt.at+1&&p.operationReceipt.at<at&&integer(p.completedAt)&&p.completedAt<=at&&paid(s,p)).sort((a,b)=>a.operationReceipt.at-b.operationReceipt.at).at(-1);
   if(!product||(product.operationReceipt.reinstated===true?product.operationReceipt.generation:1)!==value.generation)return null;
   const retirement=[...(d.retirementHistory||[]),...(d.retirement?[d.retirement]:[])].filter(row=>row.effectiveAt<=at).sort((a,b)=>a.effectiveAt-b.effectiveAt).at(-1);
   if(retirement&&!(product.operationReceipt.reinstated===true&&product.operationReceipt.generation>retirement.generation&&product.operationReceipt.at+1<=at))return null;
   return value;
  }
  const relevant=(child.products?.integrations||[]).filter(edge=>edge.source===deploymentId&&edge.features?.some(pair=>pair.sourceFeature===feature)||edge.target===deploymentId&&edge.features?.some(pair=>pair.targetFeature===feature));
  for(const edge of relevant){
   const paidPlans=projects.filter(p=>p.customerId===c.id&&api.OPERATION_IDS.includes(p.operationId)&&paid(s,p)&&integer(p.configSubmittedAt)&&p.operationReceipt?.kind==='provider-uc-cc-integration'&&p.operationReceipt.version===1&&p.operationReceipt.projectId===p.id&&p.operationReceipt.postingId===p.postingId&&p.operationReceipt.submittedAt===p.configSubmittedAt&&api.validatePlanShape(p.operationReceipt.plan)&&p.operationReceipt.plan.customerId===c.id&&p.operationReceipt.plan.tenant===child.tenant&&p.operationReceipt.plan.edge.id===edge.id);
   // Paid partner connections share the native directional edge timeline,
   // while retaining their separate commissioning and delivery rules.
   for(const p of projects){
    const receipt=p.operationReceipt,partner=receipt?.partnerPath,plan=p.partnerPathPlan;
    if(p.customerId!==c.id||!paid(s,p)||!integer(p.configSubmittedAt)||receipt?.kind!=='provider-partner-path'||receipt.version!==1||receipt.projectId!==p.id||receipt.postingId!==p.postingId||receipt.submittedAt!==p.configSubmittedAt||!plan||!same(plan,partner?.plan)||plan.integrationId!==edge.id||plan.customerId!==c.id||partner.integrationId!==edge.id)continue;
    const api=typeof SOC_PROVIDER_PARTNER_PATHS!=='undefined'?SOC_PROVIDER_PARTNER_PATHS:require('./23-provider-partner-paths.js'),path=api.PATHS[plan.pathId];
    if(!path||![path.operationId,path.retestOperationId].includes(p.operationId)||plan.operationId!==p.operationId)continue;
    const terms=p.operationId===path.operationId?path.offer:path.retestOffer;
    if(['setupCents','periodCents','workMinutes','engineers','support'].some(k=>p[k]!==terms[k])||plan.source.deploymentId!==path.source.deploymentId||plan.target.deploymentId!==path.target.deploymentId||plan.source.feature!==path.source.feature||plan.target.feature!==path.target.feature)continue;
    const test=partner.test;
    paidPlans.push({...p,operationReceipt:{plan:{...plan,tenant:child.tenant,edge:{id:edge.id,features:[{sourceFeature:path.source.feature,targetFeature:path.target.feature}]}},test:test?{version:1,edgeId:edge.id,at:test.testAt,result:test.test.result}:null}});
   }
   const starts=paidPlans.filter(p=>['create','rebase'].includes(p.operationReceipt.plan.edgeAction)).sort((a,b)=>a.configSubmittedAt-b.configSubmittedAt);
   if(!starts.length)return false;
   const start=starts.filter(p=>p.configSubmittedAt<=at).at(-1);if(!start)continue;
   const plan=start.operationReceipt.plan,scope=planScope(plan),source=endpoint(edge.source),target=endpoint(edge.target);
   if(edge.source!==plan.source.deploymentId||edge.target!==plan.target.deploymentId||!same(edge.features,plan.edge.features)||!source||!target||source.generation!==scope.sourceGeneration||target.generation!==scope.targetGeneration||source.config.productVersion!==scope.sourceVersion||target.config.productVersion!==scope.targetVersion)return false;
   const own=deploymentId===edge.source?source:target;
   if(expected&&(expected.generation!==own.generation||expected.productVersion!==own.config.productVersion))return false;
   const tested=paidPlans.filter(p=>p.configSubmittedAt<=at&&scopeEqual(planScope(p.operationReceipt.plan),scope)&&integer(p.operationReceipt.test?.at)&&p.operationReceipt.test.at<at).sort((a,b)=>a.operationReceipt.test.at-b.operationReceipt.test.at).at(-1);
   const test=tested?.operationReceipt.test,result=test?.result;
   if(!test||test.version!==1||test.edgeId!==edge.id||!exact(result,['checkedAt','checks','externalSupportClaim','reasons','sourceGeneration','sourceVersion','status','synthetic','targetGeneration','targetVersion'])||result.checkedAt!==test.at||!scopeEqual(result,scope)||result.status!=='scenario-verified'||result.synthetic!==true||result.externalSupportClaim!==false||!Array.isArray(result.reasons)||result.reasons.length||!Array.isArray(result.checks)||result.checks.length!==edge.features.length||result.checks.some((row,index)=>row.sourceFeature!==edge.features[index].sourceFeature||row.targetFeature!==edge.features[index].targetFeature||row.source?.available!==true||row.target?.available!==true))return false;
   const nativeMatches=row=>scopeEqual(row,scope)&&same(row.result,result);
   if(!nativeMatches(edge)&&!histories(edge).some(row=>row.at>=at&&row.result?.checkedAt<=at&&nativeMatches(row)))return false;
  }
  return true;
 }
 function createReader(s,historyHooks={},integrationHooksForCustomer,historyReader){
  const api=integrationApi(),history=historyReader||historyApi().createReader(s,historyHooks),proofs=new Map(),participants=new Map(),features=new Map(),results=new Map();
  const customer=id=>s?.providerCampaign?.customers?.find(c=>c.id===id);
  const root=c=>s?.portfolio?.customers?.find(row=>row.id===c?.portfolioId)?.root;
  function validProof(p){
   if(proofs.has(p.id))return proofs.get(p.id);
   const r=p.operationReceipt,task=r?.task,quality=s.providerCampaign.projects.find(row=>row.id===task?.quality?.projectId);
   let valid=false;try{valid=paid(s,p)&&p.status==='complete'&&integer(p.completedAt)&&p.configSubmittedAt===r?.submittedAt&&r?.test?.result?.status==='scenario-verified'&&!!task&&task.quality.completedAt<=p.completedAt&&paid(s,quality)&&api.validateRetainedTaskEvidence(s,p.id,task);}catch{valid=false;}
   proofs.set(p.id,valid);return valid;
  }
  function participant(c,at){
   const key=c.id+'@'+at;if(!participants.has(key)){let result;try{result=history.participant(c.id,at);}catch{result=null;}participants.set(key,result?.status==='supported'?result.participant:null);}return participants.get(key);
  }
  function feature(c,id,name,at){
   const key=[c.id,id,name,at].join('@');if(!features.has(key)){let result;try{result=history.productFeature(c.id,id,name,at);}catch{result=null;}features.set(key,result);}return features.get(key);
  }
  function supports(c,p,at){
   const row=participant(c,at),scope=p.operationReceipt.test.supportScope,r=row?.responsibility;
   if(!r||r.customerId!==c.id||r.role!=='msp'||r.organisationId!=='orchard-msp'||r.effectiveAt>at||r.expiresAt!==null&&r.expiresAt<=at||r.sharedWorkforce?.support<1||r.sharedWorkforce?.billedMinutes<1||!same([...r.scope].sort(),scope.resources))return false;
   const stages=scope.projectIds.map(id=>s.providerCampaign.projects.find(x=>x.id===id));
   if(stages.length!==3||stages.some(x=>!x||x.customerId!==c.id||x.kind!=='stage'||x.status!=='complete'||x.completedAt>at)||!stages.some(x=>x.id===r.projectId&&x.postingId===r.postingId))return false;
   // A bound path must still have the tested boundary generation at this minute.
   for(const bound of p.operationReceipt.test.boundaryScope){if(!row.boundaries.some(b=>b.id===bound.contractId&&b.generation===bound.generation&&b.resources.includes(bound.resourceId)))return false;}
   return true;
  }
  function validAt(c,edge,at){
   if(!c||customer(c.id)!==c||!integer(at)||at>s.clock||!exact(edge,KEYS))return false;
   const key=[c.id,at,JSON.stringify(stable(edge))].join('@');if(results.has(key))return results.get(key);
   const child=root(c);let valid=false;
   if(child?.providerCustomer?.id===c.id&&child.providerCustomer.version===1&&child.tenant&&!child.providerCampaign&&child.mode!=='sandbox'&&child.experience?.kind!=='lab'){
    for(const p of s.providerCampaign.projects){
     if(p.customerId!==c.id||!api.OPERATION_IDS.includes(p.operationId)||!integer(p.completedAt)||p.completedAt>at||p.operationReceipt?.test?.at>=at||p.serviceRetirement?.effectiveAt<=at||!validProof(p)||!same(snapshot(p),edge))continue;
     const plan=p.operationReceipt.plan;if(plan.tenant!==child.tenant||!supports(c,p,at))continue;
     const source=feature(c,edge.source,plan.source.feature,at),target=feature(c,edge.target,plan.target.feature,at);
     if(!source?.ready||!target?.ready||source.generation!==edge.sourceGeneration||target.generation!==edge.targetGeneration||source.configuration.productVersion!==edge.sourceVersion||target.configuration.productVersion!==edge.targetVersion)continue;
     const native=child.products?.integrations?.find(x=>x.id===edge.id);
     if(!native||native.source!==edge.source||native.target!==edge.target||!same(native.features,edge.features))continue;
     const nativeMatches=x=>x?.sourceGeneration===edge.sourceGeneration&&x?.targetGeneration===edge.targetGeneration&&x?.sourceVersion===edge.sourceVersion&&x?.targetVersion===edge.targetVersion&&same(x.result,p.operationReceipt.test.result);
     const retainedTests=native.testHistory?.version===1&&Array.isArray(native.testHistory.entries)?native.testHistory.entries:[];
     if(!nativeMatches(native)&&![...(native.history||[]),...retainedTests].some(x=>x.at>=at&&x.result?.checkedAt<=at&&nativeMatches(x)))continue;
     // A later test on the same edge supersedes the prior observation only
     // from its next sampled minute; it cannot rewrite the old sample.
     const later=s.providerCampaign.projects.some(x=>x.customerId===c.id&&api.OPERATION_IDS.includes(x.operationId)&&x.operationReceipt?.test?.at>edge.checkedAt&&x.operationReceipt.test.at<at&&x.operationReceipt.plan?.edge?.id===edge.id);
     if(later)continue;
     valid=true;break;
    }
   }
   results.set(key,valid);return valid;
  }
  function current(customerId){
   const c=customer(customerId),child=root(c);if(!c||!['active','renewal'].includes(c.status)||!child||typeof integrationHooksForCustomer!=='function')return [];
   const out=[];for(const p of s.providerCampaign.projects){
    if(p.customerId!==c.id||!api.OPERATION_IDS.includes(p.operationId)||!validProof(p)||p.completedAt>s.clock||p.serviceRetirement?.effectiveAt<=s.clock)continue;
    let observation;try{observation=api.observe(s,p.id,integrationHooksForCustomer(c,child));}catch{continue;}
    if(observation?.status!=='ready')continue;
    const edge=snapshot(p);if(validAt(c,edge,s.clock)&&!out.some(row=>row.id===edge.id))out.push(edge);
   }
   return out.sort((a,b)=>a.id.localeCompare(b.id));
  }
  return {current,validAt};
 }
 function current(s,customerId,historyHooks={},integrationHooksForCustomer){return createReader(s,historyHooks,integrationHooksForCustomer).current(customerId);}
 function validAt(s,customer,edge,at,historyHooks={}){return createReader(s,historyHooks).validAt(customer,edge,at);}
 function source(){return `const SOC_PROVIDER_REGIONAL_INTEGRATIONS=(${socProviderRegionalIntegrationsKernel.toString()})();`;}
 return {VERSION,createReader,current,validAt,bindingAvailableAt,source};
}
const SOC_PROVIDER_REGIONAL_INTEGRATIONS=socProviderRegionalIntegrationsKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_REGIONAL_INTEGRATIONS;
