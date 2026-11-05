/* Bounded derivation of Provider customer resource capacities from paid campaign work. */
function socProviderCapacityAuthorityKernel(rules,products,government){
 'use strict';
 const data=rules?.data||rules;
 const fail=detail=>{throw new Error(`INVALID_PROVIDER_CAPACITY_AUTHORITY${detail?':'+detail:''}`);};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const idNumber=value=>Number(String(value||'').replace(/^provider-project-/,''));
 const baseFields={
  phone:{capacity:10}, carrier:{capacity:4}, people:{people:2,entitlements:2,handlingMinutes:3,digitalConcurrency:2},
  service:{capacity:4,maxWait:8}, queue:{capacity:4,maxWait:8}, messages:{rateLimit:10}, recorder:{capacity:4},
  archive:{capacity:20,retentionDays:30}, speech:{capacity:10}
 };
 const fieldsByResource={
  phone:['capacity'],carrier:['capacity'],people:['people','entitlements','handlingMinutes','digitalConcurrency'],
  service:['capacity','maxWait'],queue:['capacity','maxWait'],messages:['rateLimit'],recorder:['capacity'],archive:['capacity','retentionDays'],speech:['capacity']
 };
 const integer=(x)=>Number.isSafeInteger(x)&&x>=0;
 const planFor=c=>data?.plans?.[c?.planId];
 function authorizedProjectSequence(provider,customer){
  const projects=(provider?.projects||[]).filter(p=>p?.customerId===customer?.id&&p.configSubmittedAt!==null&&p.configSubmittedAt!==undefined&&p.status!=='cancelled');
  if(projects.length>2000)fail();
  return projects.sort((a,b)=>a.configSubmittedAt-b.configSubmittedAt||a.acceptedAt-b.acceptedAt||idNumber(a.id)-idNumber(b.id));
 }
 function mergePatch(target,patch){for(const [resource,config] of Object.entries(patch||{})){if(!config||typeof config!=='object')continue;target[resource]??={};for(const [field,value] of Object.entries(config))if(fieldsByResource[resource]?.includes(field))target[resource][field]=clone(value);}}
 function authoredStagePatch(customer,stage){const def=planFor(customer)?.[stage];return def?.config||{};}
 function operationPatch(provider,project,child,target){
  const op=data?.operations?.find(x=>x.id===project.operationId);
  if(project.productId){
   const recipe=products?.recipes?.[project.productId];if(!recipe||![1,2].includes(project.recipeVersion??1))fail();
   const patch=clone(recipe.quote?.config||{});
   // The paid CPaaS/API fulfilment paths set a stricter five-message delivery limit.
   // This side effect is authored by Provider product commissioning, outside quote.config.
   if(['ms-communications-api','cisco-programmable-engagement'].includes(project.productId)||project.productId==='cisco-provider-operations'&&(project.recipeVersion??1)===1){
    patch.messages={...(patch.messages||{}),rateLimit:5};
   }
   return patch;
  }
  if(!op)fail();
  const patch={};
  for(const resource of op.resources||[])patch[resource]={enabled:true,...clone(op.config?.[resource]||{})};
  for(const [resource,config] of Object.entries(op.config||{}))patch[resource]={...(patch[resource]||{}),...clone(config)};
  if(['carrier-headroom','managed-carrier-headroom'].includes(op.id)){
   const previous=target.carrier?.capacity??4;
   const receipt=project.operationReceipt;
   if(!receipt||receipt.kind!==op.id||receipt.resource!=='carrier'||receipt.previousCapacity!==previous||receipt.capacity!==previous+4||receipt.unit!=='concurrent sessions')fail();
   patch.carrier={...(patch.carrier||{}),capacity:previous+4};
  }
  if(['direct-external-reach','managed-external-reach'].includes(op.id)){
   const previous=target.carrier?.capacity??4,receipt=project.operationReceipt;
   const aliases=[{number:'+6125550191',holder:'alex'},{number:'+6125550192',holder:'bea'}];
   if(!receipt||receipt.kind!==op.id||receipt.resource!=='carrier'||receipt.previousCapacity!==previous||receipt.capacity!==previous+2||receipt.unit!=='concurrent sessions'||receipt.at!==project.configSubmittedAt-1||receipt.allowedPrefix!=='+44'||JSON.stringify(receipt.aliases)!==JSON.stringify(aliases))fail('EXTERNAL_REACH_RECEIPT');
   patch.carrier={...(patch.carrier||{}),capacity:previous+2};
  }
  if(['national-wholesale-headroom','managed-national-wholesale-headroom','public-service-capture-reserve'].includes(op.id)){
   if(!['provider-campaigns-6','provider-campaigns-7'].includes(provider.contentVersion))fail('CENTRAL_CONTENT');
   const capture=op.id==='public-service-capture-reserve',resource=capture?'recorder':'carrier',previous=target[resource]?.capacity??4,added=8,receipt=project.operationReceipt;
   if(!receipt||Object.keys(receipt).sort().join(',')!==(capture?'at,boundaryRefresh,capacity,kind,previousCapacity,resource,unit':'at,capacity,kind,previousCapacity,resource,unit')||receipt.kind!==op.id||receipt.resource!==resource||receipt.previousCapacity!==previous||receipt.capacity!==previous+added||receipt.unit!==(capture?'concurrent capture reservations':'concurrent sessions')||receipt.at!==project.configSubmittedAt-1)fail('CENTRAL_RECEIPT');
   if(capture){const b=receipt.boundaryRefresh,contract=child.boundaries?.contracts?.find(c=>c.id===b?.contractId);if(!b||Object.keys(b).sort().join(',')!=='contractId,generation,previousGeneration'||!Number.isSafeInteger(b.previousGeneration)||b.previousGeneration<1||b.generation!==b.previousGeneration+1||!contract||contract.generation<b.generation||child.boundaries.bindings.recorder!==b.contractId)fail('CENTRAL_BOUNDARY_REFRESH');}
   patch[resource]={...(patch[resource]||{}),capacity:previous+added};
  }
  if(op.id==='capture-headroom'){
   const previous=target.recorder?.capacity??4,receipt=project.operationReceipt;
   if(!receipt||receipt.kind!=='capture-headroom'||receipt.resource!=='recorder'||receipt.previousCapacity!==previous||receipt.capacity!==previous+4||receipt.unit!=='concurrent capture reservations')fail();
   patch.recorder={...(patch.recorder||{}),capacity:previous+4};
  }
  if(op.id==='recording')patch.recorder={...(patch.recorder||{}),capacity:4};
  if(op.id==='transcription')patch.speech={...(patch.speech||{}),capacity:10};
  if(op.id==='mitigate'){
   const receipt=project.operationReceipt;
   if(!receipt||receipt.kind!=='mitigate'||receipt.at!==project.configSubmittedAt-1||!Array.isArray(receipt.resources))fail();
   const caused=(provider.incidents||[]).filter(i=>i.customerId===project.customerId&&i.createdAt<=receipt.at&&i.acknowledgedAt!==null&&i.acknowledgedAt<=receipt.at&&(i.resolvedAt===null||i.resolvedAt>=receipt.at)).map(i=>({processor:'speech',connectivity:'access'})[i.resource]||i.resource);
   if(JSON.stringify(receipt.resources)!==JSON.stringify(caused))fail();
   for(const resource of receipt.resources){if(!fieldsByResource[resource]?.includes('capacity'))continue;const before=patch[resource]?.capacity??target[resource]?.capacity;if(!integer(before))fail();patch[resource]={...(patch[resource]||{}),capacity:before+1};}
  }
  if(op.id==='bpo'){
   const receipt=child?.workforceOps?.providerCover;
   if(!receipt||receipt.projectId!==project.id||receipt.postingId!==project.postingId||JSON.stringify(receipt.people)!=='["provider-bpo-1","provider-bpo-2"]')fail();
   const fundedPeople=(target.people.people||2)+2;
   patch.people={...(patch.people||{}),people:fundedPeople,entitlements:Math.max(target.people.entitlements||2,fundedPeople)};
  }
  if(['compliance','compliance-local'].includes(op.id)&&provider.contentVersion!=='provider-campaigns-1'&&government?.plan){
   const architecture=government.plan(op.id==='compliance-local'?'local-processing':'regional-cloud',{
    jurisdiction:child.jurisdiction,resources:['recorder','archive','speech'],contractId:'provider-public-service-processing'
   });
   Object.assign(patch,clone(architecture.resourceConfigs));
  }
  return patch;
 }
 function expectedModel(provider,customer,child){
  const plan=planFor(customer);if(!plan)fail();
  const target={};for(const [resource,fields] of Object.entries(baseFields))target[resource]=clone(fields);
  if(customer.scenario==='smb')target.people.people=0;
  const accepted={};for(const [resource,fields] of Object.entries(target)){accepted[resource]={};for(const [field,value] of Object.entries(fields))accepted[resource][field]=new Set([value]);}
  const projects=authorizedProjectSequence(provider,customer);
  for(const project of projects){
   let patch;
   if(project.kind==='stage'){
    if(!['base','carrier','partner'].includes(project.stage))fail();
    patch=authoredStagePatch(customer,project.stage);
   }else if(project.kind==='operation')patch=operationPatch(provider,project,child,target);
   else fail();
   const before=Object.fromEntries(Object.entries(fieldsByResource).map(([resource,fields])=>[resource,Object.fromEntries(fields.map(field=>[field,target[resource]?.[field]]))]));
   mergePatch(target,patch);
   for(const [resource,fields] of Object.entries(fieldsByResource))for(const field of fields){const value=target[resource]?.[field];if(integer(value)&&value!==before[resource]?.[field])accepted[resource][field]=new Set([before[resource]?.[field],value].filter(integer));}
  }
  if(child?.workforceOps?.providerCover){
   const cover=child.workforceOps.providerCover;
   if(!projects.some(p=>p.id===cover.projectId&&p.operationId==='bpo'&&p.postingId===cover.postingId))fail();
   if((child.workforceOps.roster?.desired||[]).length>target.people.people)fail();
  }
  return {target,accepted};
 }
 function expectedFields(provider,customer,child){return expectedModel(provider,customer,child).target;}
 function validateCustomer(provider,customer,child){
  if(!provider||!customer||!child?.resources||typeof child.resources!=='object')fail();
  const {target:expected,accepted}=expectedModel(provider,customer,child);
  for(const [resource,fields] of Object.entries(fieldsByResource)){
   const actual=child.resources[resource];if(!actual)continue;
   for(const field of fields){
    const authorized=expected[resource]?.[field];
    if(!integer(authorized)||!integer(actual.desired?.[field])||actual.desired[field]!==authorized)fail(`${resource}.${field}:${String(actual.desired?.[field])}!=${String(authorized)}`);
    const effective=actual.effective?.[field];
    if(effective!==undefined&&effective!==null&&(!integer(effective)||!accepted[resource]?.[field]?.has(effective)))fail();
    if(actual.provisioning?.status==='ready'&&actual.effective&&actual.effective[field]!==authorized)fail();
   }
  }
  return true;
 }
 function source(){return `const SOC_PROVIDER_CAPACITY_AUTHORITY=(()=>{let api;const load=()=>api||(api=(${socProviderCapacityAuthorityKernel.toString()})(SOC_PROVIDER_RULES,SOC_PROVIDER_PRODUCTS,SOC_GOVERNMENT_ARCHITECTURES));return {version:1,fieldsByResource:${JSON.stringify(fieldsByResource)},validateCustomer:(...args)=>load().validateCustomer(...args),expectedFields:(...args)=>load().expectedFields(...args),source:()=>load().source()};})();`;}
 return {version:1,fieldsByResource:clone(fieldsByResource),validateCustomer,expectedFields,source};
}
function socProviderCapacityAuthorityDependencies(){
 if(typeof module!=='undefined'&&module.exports)return [require('./24-provider-rules.js'),require('./23-provider-products.js'),require('./23-provider-government.js')];
 return [SOC_PROVIDER_RULES,SOC_PROVIDER_PRODUCTS,SOC_GOVERNMENT_ARCHITECTURES];
}
const SOC_PROVIDER_CAPACITY_AUTHORITY=(()=>{let api;const load=()=>api||(api=socProviderCapacityAuthorityKernel(...socProviderCapacityAuthorityDependencies()));return {version:1,fieldsByResource:{phone:['capacity'],carrier:['capacity'],people:['people','entitlements','handlingMinutes','digitalConcurrency'],service:['capacity','maxWait'],queue:['capacity','maxWait'],messages:['rateLimit'],recorder:['capacity'],archive:['capacity','retentionDays'],speech:['capacity']},validateCustomer:(...args)=>load().validateCustomer(...args),expectedFields:(...args)=>load().expectedFields(...args),source:()=>load().source()};})();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_CAPACITY_AUTHORITY;
