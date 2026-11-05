/* Pure contextual Provider action grouping. Eligibility and dispatch remain authoritative elsewhere. */
function socProviderContextActionsKernel(){
 'use strict';
 const VERSION=1,transportOperations=new Set(['primary-upstream','diverse-upstream','managed-diverse-upstream','upstream-binding-extension','transport-repair']);
 const copy=x=>x==null?x:JSON.parse(JSON.stringify(x)),plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x),
  repeatablePrimary=new Set(['quality','coaching','repair','mitigate','service-repair','carrier-headroom','managed-carrier-headroom','capture-headroom','sync-records','sync-all','uc-cc-retest','managed-uc-cc-retest']),
  singlePurchase=new Set(['bpo','automation','local-spares','managed-local-spares','direct-external-reach','managed-external-reach']),
  integrationIds=new Set(['uc-cc-integration','managed-uc-cc-integration','uc-cc-retest','managed-uc-cc-retest']),
  integrationInitial=new Set(['uc-cc-integration','managed-uc-cc-integration']),integrationRetest=new Set(['uc-cc-retest','managed-uc-cc-retest']),
  incidentIds=new Set(['repair','mitigate','service-repair']),
  govIds=new Set(['compliance','compliance-local']),enterpriseIds=new Set(['migration','migration-consolidated','direct-external-reach','managed-external-reach']),defenceIds=new Set(['local-deployment','local-spares','managed-local-spares','sync-records','sync-all']);
 function activeProject(x){return x&&x.status!=='cancelled'&&x.status!=='blocked'&&!x.retirement&&!x.serviceRetirement;}
 function projectMatches(projects,customerId,id){return projects.some(x=>activeProject(x)&&x.customerId===customerId&&(x.operationId===id||x.productId===id));}
 function paidComplete(projects,customerId,id){return projects.some(x=>activeProject(x)&&x.customerId===customerId&&(x.operationId===id||x.productId===id)&&x.status==='complete');}
 function inProgress(projects,customerId,id){return projects.some(x=>activeProject(x)&&x.customerId===customerId&&(x.operationId===id||x.productId===id)&&x.status!=='complete');}
 function fundedOnce(projects,customerId,operation){if(['direct-external-reach','managed-external-reach'].includes(operation.id))return projects.some(p=>activeProject(p)&&p.customerId===customerId&&['direct-external-reach','managed-external-reach'].includes(p.operationId));if(operation.kind==='product')return projectMatches(projects,customerId,operation.id);if(operation.id==='migration'||operation.id==='migration-consolidated')return projects.some(x=>activeProject(x)&&x.customerId===customerId&&['migration','migration-consolidated'].includes(x.operationId));return singlePurchase.has(operation.id)&&projectMatches(projects,customerId,operation.id);}
 function edgeFor(customer){const edges=customer?.products?.integrations||customer?.serviceIntegration?.integrations||[];return edges.find(x=>x?.id==='workplace-to-contact-quality')||null;}
 function serviceIntegrationState(customer){const row=customer?.serviceIntegration;if(typeof row?.status==='string')return row.status;const edge=edgeFor(customer);if(!edge)return 'missing';if(edge.result?.status==='blocked')return 'blocked';if(edge.result?.status==='scenario-verified')return 'ready';return 'awaiting-test';}
 function paidProductPair(projects,customerId){return paidComplete(projects,customerId,'ms-workplace-calling')&&paidComplete(projects,customerId,'cisco-contact-centre');}
 function resourceRelevant(operation,resource){if(!resource)return false;const ids=new Set([resource.id,...(Array.isArray(resource.resources)?resource.resources:[]),...(Array.isArray(resource.dependencies)?resource.dependencies:[])]);return (operation.resources||[]).some(id=>ids.has(id));}
 function ownedResourceIds(customer){const rows=Array.isArray(customer?.services)?customer.services:[];return new Set(rows.flatMap(x=>[x?.id,...(Array.isArray(x?.resources)?x.resources:[]),...(Array.isArray(x?.dependencies)?x.dependencies:[])].filter(x=>typeof x==='string')));}
 function customerResourceRelevant(operation,customer){const ids=ownedResourceIds(customer);return (operation.resources||[]).some(id=>ids.has(id));}
 function pressureConstrained(resource){const p=resource?.pressure;if(!plain(p)||typeof p.used!=='number'||typeof p.limit!=='number'||!Number.isFinite(p.used)||!Number.isFinite(p.limit))return false;return p.limit>=0&&p.used>=p.limit;}
 function capacityOperationFor(op,resource){if(!op||!resource)return false;if(['carrier-headroom','managed-carrier-headroom'].includes(op.id))return resource.id==='carrier'||resource.kind==='carrier'||resource.kind==='trunk'||resource.kind==='carrier-session';if(op.id==='capture-headroom')return resource.id==='recorder'||resource.kind==='recorder'||resource.kind==='recording';return false;}
 function scenarioRelevant(operation,scenario){const id=operation.id;if(scenario==='government')return govIds.has(id)||['recording','transcription','service-boundary-review'].includes(id);if(scenario==='enterprise')return enterpriseIds.has(id)||['recording','transcription'].includes(id);if(scenario==='defence')return defenceIds.has(id)||['recording','transcription'].includes(id);return ['recording','transcription','quality','coaching'].includes(id);}
 function missingRequirements(operation,projects,customerId){return (Array.isArray(operation?.requirements)?operation.requirements:[]).filter(id=>!paidComplete(projects,customerId,id));}
 function eligible(operation,projects,customerId){return operation.available!==false&&!(Array.isArray(operation.blockers)&&operation.blockers.length>0)&&missingRequirements(operation,projects,customerId).length===0;}
 function grouped(key,operations){return operations.length?{key,operations:operations.map(copy)}:null;}
 function project(input){
  if(!plain(input))throw new Error('INVALID_PROVIDER_CONTEXT_ACTIONS_INPUT');
  const customer=input.customer,resource=input.resource||null,operations=Array.isArray(input.operations)?input.operations.filter(x=>plain(x)&&typeof x.id==='string'):[],projects=Array.isArray(input.projects)?input.projects:[],incidents=Array.isArray(input.incidents)?input.incidents:[],customerId=customer?.id,scenario=customer?.scenario;
  if(typeof customerId!=='string')throw new Error('PROVIDER_CONTEXT_CUSTOMER_REQUIRED');
  const byId=new Map();for(const op of operations)if(!byId.has(op.id))byId.set(op.id,op);
  const primary=new Map(),secondary=new Map(),locked=new Map(),placed=new Set();
  const add=(target,key,op)=>{if(!op||placed.has(op.id))return;placed.add(op.id);if(!target.has(key))target.set(key,[]);target.get(key).push(op);};
  const find=id=>byId.get(id)||null,canShow=op=>!!op&&!fundedOnce(projects,customerId,op)&&!inProgress(projects,customerId,op.id),canShowPrimary=op=>canShow(op)&&(!projectMatches(projects,customerId,op.id)||repeatablePrimary.has(op.id));
  const pushPrimary=(key,id)=>{const op=find(id);if(!canShowPrimary(op))return;if(eligible(op,projects,customerId))add(primary,key,op);else if(op.available===false||op.blockers?.length||missingRequirements(op,projects,customerId).length)add(locked,'scenario-prerequisites',op);};

  const ownedIds=ownedResourceIds(customer);
  const activeIncidents=incidents.filter(x=>x&&x.customerId===customerId&&['active','acknowledged'].includes(x.status));
  const relevantIncidents=activeIncidents.filter(i=>!resource?(ownedIds.size===0||ownedIds.has(i.resource)||i.resource==='service'):i.resource===resource.id||(resource.dependencies||[]).includes(i.resource)||(resource.resources||[]).includes(i.resource));
  if(relevantIncidents.length){
   const incidentResources=new Set(relevantIncidents.map(x=>x.resource));
   for(const op of operations.filter(x=>incidentIds.has(x.id)&&(!resource||resourceRelevant(x,resource)||x.resources?.includes('service')))){
    if(!canShowPrimary(op))continue;
    const supported=op.id==='service-repair'||op.id==='mitigate'||[...incidentResources].some(id=>op.resources?.includes(id));
    if(!supported)continue;
    if(eligible(op,projects,customerId))add(primary,'incident-response',op);else if(op.available===false||op.blockers?.length||missingRequirements(op,projects,customerId).length)add(locked,'incident-response',op);
   }
  }

  const required=customer.requirements||{},requiredServices=[['recording','recording','recorder'],['transcript','transcription','speech'],['meeting','room','room']];
  for(const [requirement,operationId,resourceId] of requiredServices)if(required[requirement]===true&&!customer.services?.some(s=>s.id===resourceId&&s.observed?.ready===true))pushPrimary('service-prerequisites',operationId);
  if(resource?.kind==='archive'&&(resource.storage?.pending>0||resource.storage?.queued>0))pushPrimary('service-growth','transcription');

  if(scenario==='enterprise'){
   if(!projects.some(p=>activeProject(p)&&p.customerId===customerId&&['direct-external-reach','managed-external-reach'].includes(p.operationId))&&(!resource||['carrier','phone','migration-phone'].includes(resource.id))){pushPrimary('scenario-alternatives','direct-external-reach');pushPrimary('scenario-alternatives','managed-external-reach');}
   if(!projectMatches(projects,customerId,'migration')&&!projectMatches(projects,customerId,'migration-consolidated')){
    pushPrimary('scenario-alternatives','migration');pushPrimary('scenario-alternatives','migration-consolidated');
   }
  }
  if(scenario==='government'){
   const architectureStarted=projectMatches(projects,customerId,'compliance')||projectMatches(projects,customerId,'compliance-local');
   if(!architectureStarted){
    const architectures=['compliance','compliance-local'].map(find).filter(Boolean),missing=new Set(architectures.flatMap(x=>Array.isArray(x.requirements)?x.requirements:[]).filter(id=>!paidComplete(projects,customerId,id)));
    for(const id of ['recording','transcription'])if(missing.has(id))pushPrimary('service-prerequisites',id);
    for(const op of architectures){if(!canShow(op))continue;if(eligible(op,projects,customerId))add(primary,'scenario-alternatives',op);else if(op.available===false||op.blockers?.length||missingRequirements(op,projects,customerId).length)add(locked,'scenario-alternatives',op);}
   }
  }
  if(scenario==='defence'){
   const continuity=customer.continuity||{},localPaid=paidComplete(projects,customerId,'local-deployment');
   if(!projectMatches(projects,customerId,'local-deployment'))pushPrimary('local-continuity','local-deployment');
   if(continuity.connected===false&&find('reconnect'))pushPrimary('local-continuity','reconnect');
   if(localPaid&&(continuity.outageActive||continuity.remainingMinutes===0||continuity.exhausted))pushPrimary('local-continuity','local-spares');
   if(localPaid&&continuity.connected===true&&Number(continuity.pendingCount||0)>0){pushPrimary('local-reconciliation','sync-records');pushPrimary('local-reconciliation','sync-all');}
  }

  const pair=paidProductPair(projects,customerId),edge=edgeFor(customer),integrationState=serviceIntegrationState(customer),hasIntegration=projects.some(x=>x.customerId===customerId&&integrationIds.has(x.operationId)&&activeProject(x));
  if(pair){
   if(!hasIntegration){const initial=operations.filter(x=>integrationInitial.has(x.id)),missing=new Set(initial.flatMap(x=>missingRequirements(x,projects,customerId)));for(const id of ['recording','transcription'])if(missing.has(id))pushPrimary('service-prerequisites',id);pushPrimary('integration','uc-cc-integration');pushPrimary('integration','managed-uc-cc-integration');}
   else if(edge&&(['stale','blocked'].includes(integrationState)||edge.result?.status==='blocked')){pushPrimary('integration-retest','uc-cc-retest');pushPrimary('integration-retest','managed-uc-cc-retest');}
  }

  const pressuredResources=resource?[resource]:Array.isArray(customer?.services)?customer.services:[];
  for(const pressured of pressuredResources){if(!pressureConstrained(pressured))continue;for(const op of operations.filter(x=>capacityOperationFor(x,pressured)&&resourceRelevant(x,pressured)))if(canShowPrimary(op)){if(eligible(op,projects,customerId))add(primary,'capacity',op);else if(op.available===false||op.blockers?.length||missingRequirements(op,projects,customerId).length)add(locked,'capacity',op);}}
  if(!resource){for(const id of ['recording','transcription','bpo']){const op=find(id);if(op&&customerResourceRelevant(op,customer)&&canShowPrimary(op)){if(eligible(op,projects,customerId))add(primary,'service-growth',op);else if(op.available===false||op.blockers?.length||missingRequirements(op,projects,customerId).length)add(locked,'scenario-prerequisites',op);}}}
  const quality=find('quality');if(quality&&quality.available===true&&canShowPrimary(quality)&&(!resource||resource.id==='recorder'||resource.id==='people'))add(primary,'quality-review',quality);
  const coaching=find('coaching');if(coaching&&coaching.available===true&&canShowPrimary(coaching)&&(!resource||resource.id==='people'))add(primary,'people',coaching);

  const isUsefulLocked=op=>resource
   ?scenarioRelevant(op,scenario)||resourceRelevant(op,resource)||integrationIds.has(op.id)||incidentIds.has(op.id)
   :scenarioRelevant(op,scenario)||customerResourceRelevant(op,customer)||integrationIds.has(op.id)||incidentIds.has(op.id);
  for(const op of operations){if(placed.has(op.id)||fundedOnce(projects,customerId,op)||inProgress(projects,customerId,op.id))continue;
   if(integrationIds.has(op.id)){
    if(!pair)continue;
    if(integrationInitial.has(op.id)&&hasIntegration)continue;
    if(integrationRetest.has(op.id)&&(!edge||!['stale','blocked'].includes(integrationState)&&edge.result?.status!=='blocked'))continue;
   }
   const relevant=resource?resourceRelevant(op,resource)||(scenarioRelevant(op,scenario)&&op.kind!=='product'):op.kind==='product'?customerResourceRelevant(op,customer):true;
   if(!relevant)continue;
   if(!eligible(op,projects,customerId)){if(isUsefulLocked(op))add(locked,scenarioRelevant(op,scenario)?'scenario-prerequisites':'resource-options',op);continue;}
   const key=op.kind==='product'?'resource-products':scenarioRelevant(op,scenario)?'scenario-options':'other-actions';add(secondary,key,op);
  }
  const groups=map=>[...map.entries()].map(([key,items])=>grouped(key,items)).filter(Boolean);
  return {version:VERSION,customerId,resourceId:resource?.id||null,primary:groups(primary),secondary:groups(secondary),locked:groups(locked)};
 }
 function transport(customer,actions=[]){
  if(!plain(customer)||typeof customer.id!=='string'||customer.transport?.version!==1)return null;
  const rows=(Array.isArray(actions)?actions:[]).filter(row=>plain(row)&&transportOperations.has(row.id||row.operationId)&&(!row.customerId||row.customerId===customer.id)).map(row=>({...copy(row),id:row.id||row.operationId,customerId:customer.id}));
  return {version:1,customerId:customer.id,choices:rows.filter(row=>row.id!=='transport-repair'),recovery:rows.filter(row=>row.id==='transport-repair')};
 }
 return {VERSION,project,transport,source:()=>`const SOC_PROVIDER_CONTEXT_ACTIONS=(${socProviderContextActionsKernel.toString()})();`};
}
const SOC_PROVIDER_CONTEXT_ACTIONS=socProviderContextActionsKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_PROVIDER_CONTEXT_ACTIONS=SOC_PROVIDER_CONTEXT_ACTIONS;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_CONTEXT_ACTIONS;
