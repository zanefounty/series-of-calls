/* Replays paid Provider configuration against authored defaults and recipes. */
function socProviderConfigurationAuthorityKernel(rules,products,government){
 'use strict';
 const data=rules?.data||rules,clone=x=>JSON.parse(JSON.stringify(x));
 const fail=detail=>{throw new Error(`INVALID_PROVIDER_CONFIG_AUTHORITY${detail?':'+detail:''}`);};
 const resourceKinds={identity:'directory',access:'connectivity',phone:'uc',carrier:'trunk',desk:'endpoint',people:'workforce',service:'queue',messages:'channel',cases:'crm',engage:'workflow',room:'room',recorder:'recorder',archive:'archive',speech:'processor',local:'infrastructure'};
 const numericFields={phone:['capacity'],carrier:['capacity'],people:['people','entitlements','handlingMinutes','digitalConcurrency'],service:['capacity','maxWait'],messages:['rateLimit'],recorder:['capacity'],archive:['capacity','retentionDays'],speech:['capacity']};
 const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(key=>[key,normalize(x[key])])):x;
 const stable=x=>JSON.stringify(normalize(x));
 function merge(target,patch){for(const [key,value] of Object.entries(patch||{})){target[key]=clone(value);}}
 function defaultsFor(id,child,catalogue){const kind=resourceKinds[id];const definition=catalogue?.[kind];if(!definition?.defaults)fail(`CATALOGUE:${id}`);return {...clone(definition.defaults),enabled:false,region:child.jurisdiction};}
 function authorizedProjects(provider,customer){const list=(provider.projects||[]).map((project,index)=>({project,index})).filter(x=>x.project.customerId===customer.id&&x.project.configSubmittedAt!==null&&x.project.configSubmittedAt!==undefined&&x.project.status!=='cancelled');if(list.length>2000)fail('PROJECT_LIMIT');return list.sort((a,b)=>a.project.configSubmittedAt-b.project.configSubmittedAt||a.project.acceptedAt-b.project.acceptedAt||a.index-b.index).map(x=>x.project);}
 function initialConfigs(customer,child,catalogue){
  const out=Object.create(null);for(const id of Object.keys(resourceKinds))out[id]=defaultsFor(id,child,catalogue);
  if(!out.phone||!out.identity||!out.access)fail('INITIAL_INVENTORY');
  merge(out.phone,{routes:[{prefix:'+61',target:'service'}]});
  if(child.scenario==='smb'&&out.people)out.people.people=0;
  if(child.scenario==='enterprise'){if(out.recorder)out.recorder.identityMapping=false;if(out.room)out.room.calendar=false;}
  if(child.scenario==='government'&&out.speech)out.speech.region=child.jurisdiction==='AU'?'US':'AU';
  if(child.scenario==='defence'){for(const id of ['identity','access','carrier'])if(out[id])out[id].local=true;if(out.local)out.local.licensing=false;}
  return out;
 }
 function addResources(configs,project,definition,catalogue,child){
  const recipe=project.productId?products?.recipes?.[project.productId]:null;
  const commands=recipe?.preparation?.commands||[];
  for(const command of commands)if(command.type==='add'&&typeof command.id==='string'&&!configs[command.id]){
   const kind=command.kind,base=catalogue?.[kind]?.defaults;if(!base)fail(`ADD_KIND:${command.id}`);configs[command.id]={...clone(base),enabled:false,region:child.jurisdiction};merge(configs[command.id],command.config||{});
  }
  if(project.operationId==='migration'&&!configs['migration-phone']){const base=catalogue?.dedicated?.defaults;if(!base)fail('MIGRATION_KIND');configs['migration-phone']={...clone(base),enabled:false,region:child.jurisdiction,routes:[{prefix:'+61',target:'service'},...(configs.phone?.routes?.some(route=>route.prefix==='+44'&&route.target==='service')?[{prefix:'+44',target:'service'}]:[])]};}
  if(project.operationId==='migration'&&configs['migration-phone'])configs['migration-phone'].enabled=true;
 }
 function operationPatch(provider,project,definition,configs,child){
  const id=project.operationId;
  if(['direct-external-reach','managed-external-reach'].includes(id)){
   const receipt=project.operationReceipt;
   validateReachReceipt(project);
   const patch={carrier:{capacity:receipt.capacity}};
   for(const resource of ['phone','migration-phone'])if(configs[resource])patch[resource]={routes:[...clone(configs[resource].routes).filter(route=>route.prefix!=='+44'),{prefix:'+44',target:'service'}]};
   return patch;
  }
  // These handlers return before the generic configure call in 55. Their capacity
  // deltas and incident effects have separate paid validators.
  if(['repair','mitigate','carrier-headroom','managed-carrier-headroom','capture-headroom','local-spares','managed-local-spares','sync-records','sync-all','quality','coaching','automation','regional-provisioning','partner-qualification','service-boundary-review','managed-uc-cc-integration','managed-uc-cc-retest','bpo'].includes(id)){
   if(id==='bpo')return {people:{enabled:true}};
   return {};
  }
  const patch=Object.create(null);for(const id of definition?.resources||[])patch[id]={enabled:true,...clone(definition.config?.[id]||{})};
  for(const [id,value] of Object.entries(definition?.config||{}))patch[id]={...(patch[id]||{}),...clone(value)};
  if(project.productId){
   const recipe=products?.recipes?.[project.productId];if(!recipe||![1,2].includes(project.recipeVersion??1))fail(`RECIPE:${project.id}`);
   for(const id of recipe.quote?.resources||[])patch[id]={enabled:true,...clone(recipe.quote?.config?.[id]||{})};
   if(['ms-communications-api','cisco-programmable-engagement'].includes(project.productId)||(project.productId==='cisco-provider-operations'&&(project.recipeVersion??1)===1))patch.messages={...(patch.messages||{}),rateLimit:5};
   if(['ms-meetings-room','cisco-meetings-interoperability'].includes(project.productId)){
    const current=child.information?.meeting?.desired||{};
    patch.__meeting={...clone(current),...(child.providerCampaign?.meetingDependencyVersion===1?{platformDependency:{version:1,resourceId:'phone'}}:{}),bridgeLicensed:project.productId==='cisco-meetings-interoperability',...(project.productId==='cisco-meetings-interoperability'?{platform:'grove',nativePlatform:'disco'}:{})};
   }
   if(project.productId==='cisco-contact-centre')patch.speech={...(patch.speech||{}),region:child.jurisdiction};
   return patch;
  }
  if(provider.contentVersion==='provider-campaigns-5'&&['room','distributor-room','integrator-room'].includes(id))patch.room={...(patch.room||{}),mode:'native',interop:false};
  if(project.operationId==='recording')patch.recorder={...(patch.recorder||{}),identityMapping:true};
  if(project.operationId==='transcription')patch.speech={...(patch.speech||{}),region:child.jurisdiction,local:true,licenceLocal:true};
  if(project.operationId==='local-deployment'){
   patch.phone={...(patch.phone||{}),deployment:'dedicated',local:true};
   for(const resource of ['identity','access','carrier','messages','engage'])patch[resource]={...(patch[resource]||{}),local:true};
  }
  if(['migration','migration-consolidated'].includes(project.operationId)&&child.providerCampaign?.meetingDependencyVersion===1){delete patch.phone;delete patch.desk;}
  if(project.operationId==='compliance'||project.operationId==='compliance-local'){
   if(provider.contentVersion!=='provider-campaigns-1'&&government?.plan){
    const architecture=government.plan(project.operationId==='compliance-local'?'local-processing':'regional-cloud',{jurisdiction:child.jurisdiction,resources:['recorder','archive','speech'],contractId:'provider-public-service-processing'});
    for(const [resource,config] of Object.entries(architecture.resourceConfigs))patch[resource]={...(patch[resource]||{}),...clone(config)};
   }
  }
  return patch;
 }
 function expectedModel(provider,customer,child,catalogue){
  const plan=data?.plans?.[customer.planId];if(!plan)fail('PLAN');
  const configs=initialConfigs(customer,child,catalogue),known=new Set(Object.keys(configs)),accepted=Object.create(null),transitional=Object.create(null),latestWriteAt=Object.create(null),skipTiming=new Set();
  for(const id of Object.keys(configs))latestWriteAt[id]=0;
  for(const [id,config] of Object.entries(configs))accepted[id]=[clone(config)];
  const projects=authorizedProjects(provider,customer);
  const retirements=[];
  const retirementResources={'browser-guest-room':['room'],room:['room'],'distributor-room':['room'],'integrator-room':['room'],recording:['recorder'],transcription:['speech']};
  for(const project of projects){const retirement=project.serviceRetirement;if(!retirement)continue;const authorized=retirementResources[project.operationId];if(!authorized||stable(retirement.resources)!==stable(authorized))throw new Error(`INVALID_PROVIDER_SERVICE_RETIREMENT_RESOURCE_SCOPE:${project.id}`);if(!Number.isSafeInteger(retirement.requestedAt)||!Number.isSafeInteger(retirement.effectiveAt)||retirement.effectiveAt!==retirement.requestedAt+1)throw new Error(`INVALID_PROVIDER_SERVICE_RETIREMENT_RECEIPT:${project.id}`);retirements.push({at:retirement.requestedAt,resources:authorized});}
  retirements.sort((a,b)=>a.at-b.at);let retirementIndex=0;
  const applyRetirement=retirement=>{for(const id of retirement.resources){if(!configs[id])fail(`RETIREMENT_RESOURCE:${id}`);const previous=clone(configs[id]);configs[id].enabled=false;accepted[id]=[previous,clone(configs[id])];latestWriteAt[id]=retirement.at;}};
  for(const project of projects){
   const writeAt=Math.max(0,project.configSubmittedAt-1);
   while(retirementIndex<retirements.length&&retirements[retirementIndex].at<writeAt)applyRetirement(retirements[retirementIndex++]);
   const before=clone(configs),written=new Set();
   let definition=null;
   if(project.kind==='stage'){
    if(!['base','carrier','partner'].includes(project.stage))fail(`STAGE:${project.id}`);
    definition=plan[project.stage];if(!definition)fail(`STAGE_PLAN:${project.id}`);
    addResources(configs,project,definition,catalogue,child);
    for(const id of definition.resources||[]){if(!configs[id])fail(`RESOURCE:${id}`);configs[id].enabled=true;written.add(id);}
    for(const [id,config] of Object.entries(definition.config||{})){if(!configs[id])fail(`RESOURCE:${id}`);merge(configs[id],config);written.add(id);}
   }else if(project.kind==='operation'){
    definition=data.operations.find(op=>op.id===project.operationId);
    if(project.productId){const recipe=products?.recipes?.[project.productId];if(!recipe)fail(`RECIPE:${project.id}`);definition={resources:recipe.quote.resources,config:recipe.quote.config};}
    addResources(configs,project,definition,catalogue,child);
    const patch=operationPatch(provider,project,definition,configs,child);
    if(project.operationId==='migration-consolidated')patch.phone={...(configs.phone||{}),...(patch.phone||{}),deployment:'dedicated',local:true,extensionScope:'site'};
   for(const [id,config] of Object.entries(patch)){if(id==='__meeting')continue;if(!configs[id])fail(`RESOURCE:${id}`);merge(configs[id],config);written.add(id);}
   }else fail(`PROJECT_KIND:${project.id}`);
   for(const id of Object.keys(configs)){
    known.add(id);accepted[id]??=[];
    const previous=before[id];
    if(previous&&stable(previous)!==stable(configs[id])){accepted[id]=[clone(previous),clone(configs[id])];if(written.has(id))latestWriteAt[id]=writeAt;}
    else if(!accepted[id].some(item=>stable(item)===stable(configs[id])))accepted[id].push(clone(configs[id]));
    if(!previous&&written.has(id))latestWriteAt[id]=writeAt;
   }
   while(retirementIndex<retirements.length&&retirements[retirementIndex].at<=writeAt)applyRetirement(retirements[retirementIndex++]);
  }
  while(retirementIndex<retirements.length&&retirements[retirementIndex].at<=child.clock)applyRetirement(retirements[retirementIndex++]);
  for(const task of child.providerTasks||[]){
   if(task.kind!=='migration'||task.status!=='submitted')continue;
   const project=task.mode==='product-dedicated'?projects.find(item=>item.productId==='cisco-dedicated-uc'):projects.find(item=>item.operationId===(task.mode==='consolidated'?'migration-consolidated':'migration'));
   const migration=child.operations?.migrations?.find(item=>item.id===task.migrationId);if(!project||!migration||migration.status==='cancelled')continue;
   const targetId=migration.target,target=configs[targetId]?.extensionScope;if(typeof target!=='string')continue;
    for(const resource of Object.values(child.resources)){
    if(resource.kind!=='endpoint'||!migration.identities?.includes(resource.desired.identity)||!configs[resource.id])continue;
    const previous=clone(configs[resource.id]);configs[resource.id].scope=target;accepted[resource.id]=[previous,clone(configs[resource.id])];transitional[resource.id]=migration.status!=='complete';skipTiming.add(resource.id);
   }
  }
  return {configs,known,projects,accepted,transitional,latestWriteAt,skipTiming};
 }
 function validateProducts(provider,customer,child,projects){
  const deployments=child.products?.deployments||[],offers=child.products?.offers||[];if(!deployments.length&&!offers.length)return true;
  const paid=new Map(projects.filter(p=>p.productId).map(p=>[p.productId,p]));
  for(const offer of offers){
   const recipe=products?.recipes?.[offer.id],project=paid.get(offer.id);
   if(!recipe||!project||offer.family!==recipe.family||offer.edition!==recipe.edition||offer.unit!==recipe.unit||offer.quantity!==recipe.quantity||stable(offer.features)!==stable(recipe.features)||stable(offer.dependencies)!==stable(recipe.dependencies))throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${offer.id}:OFFER`);
  }
  for(const deployment of deployments){
   const recipe=products?.recipes?.[deployment.id?.replace(/^d-/,'')],project=paid.get(deployment.id?.replace(/^d-/,''));
   if(!recipe||!project)throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}`);
   const config=deployment.desired,recipeVersion=project.recipeVersion??1;
   if(project.kind!=='operation'||project.configSubmittedAt===null||!deployment.id.startsWith('d-')||deployment.generation<1||!config||config.offer!==recipe.id||config.family!==recipe.family||config.mode!==recipe.mode||config.productVersion!=='scenario-1'||stable(config.features)!==stable(recipe.features)||stable(config.dependencies)!==stable(recipe.dependencies)||stable(config.bindings)!==stable(recipe.bindings)||config.region!==child.jurisdiction)throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}`);
   const tasks=(child.providerProductTasks||[]).filter(task=>task.recipeId===recipe.id&&task.deploymentId===deployment.id),task=tasks[0],receipt=project.operationReceipt;
   if(tasks.length!==1||!task||task.status!=='submitted'||!receipt||receipt.kind!=='product'||receipt.recipeId!==recipe.id||task.createdAt!==receipt.at||!Number.isSafeInteger(project.configSubmittedAt))throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}:TASK`);
   if(deployment.retirement)continue;
   const retired=(deployment.retirementHistory||[]).at(-1),reinstated=receipt.reinstated===true;
   if(reinstated){
    if(!retired||retired.generation!==deployment.generation-1||receipt.generation!==deployment.generation||project.configSubmittedAt!==receipt.at+1||task.createdAt<retired.effectiveAt)throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}:REINSTATE`);
   }else if(retired)throw new Error(`INVALID_PROVIDER_RECOMMISSION_LINEAGE`);
   const history=(deployment.effectiveHistory||[]).filter(item=>item.generation<deployment.generation),lastHistory=history.at(-1);
   let expectedDue;
   if(reinstated)expectedDue=project.configSubmittedAt;
   else if(lastHistory&&lastHistory.generation===deployment.generation-1){
    expectedDue=lastHistory.at+1;
    if(deployment.effective&&stable(deployment.effective)!==stable(lastHistory.effective))throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}:PREVIOUS_EFFECTIVE`);
   }else expectedDue=project.configSubmittedAt+1;
   const retryAt=deployment.provisioning.due-1,retryDue=deployment.provisioning.due>expectedDue&&retryAt>=expectedDue&&(retryAt-task.createdAt)%5===0;
   const reinstatementDue=reinstated&&deployment.provisioning.due===project.configSubmittedAt+1;
   if(deployment.provisioning.due!==expectedDue&&!retryDue&&!reinstatementDue)throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}:DUE`);
   if(deployment.provisioning.status==='ready'&&(child.clock<deployment.provisioning.due||deployment.provisioning.generation!==deployment.generation||!deployment.effective||stable(deployment.effective)!==stable(deployment.desired)))throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}:EARLY_EFFECTIVE`);
   if(deployment.provisioning.status==='pending'&&deployment.provisioning.due<=child.clock)throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}:OVERDUE_PENDING`);
   if(deployment.effective&&stable(deployment.effective)!==stable(deployment.desired)&&deployment.provisioning.status!=='pending')throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}:EFFECTIVE`);
   if(recipeVersion===1&&project.productId==='cisco-dedicated-uc'&&recipe.quote.resources.includes('dedicated-endpoint')&&project.resources.includes('dedicated-endpoint'))throw new Error(`INVALID_PROVIDER_PRODUCT_AUTHORITY:${deployment.id}:VERSION`);
  }
  return true;
 }
 const reachOperations=['direct-external-reach','managed-external-reach'];
 const reachAliases=[{number:'+6125550191',holder:'alex'},{number:'+6125550192',holder:'bea'}];
 function validateReachReceipt(project){
  const receipt=project.operationReceipt;
  if(!receipt||stable(Object.keys(receipt).sort())!==stable(['kind','resource','previousCapacity','capacity','unit','at','aliases','allowedPrefix'].sort())||receipt.kind!==project.operationId||receipt.resource!=='carrier'||!Number.isSafeInteger(receipt.previousCapacity)||receipt.previousCapacity<0||receipt.capacity!==receipt.previousCapacity+2||receipt.unit!=='concurrent sessions'||receipt.at!==project.configSubmittedAt-1||stable(receipt.aliases)!==stable(reachAliases)||receipt.allowedPrefix!=='+44')fail('EXTERNAL_REACH_RECEIPT');
 }
 function validateCallingOperations(provider,customer,child,projects){
  const funded=projects.filter(project=>reachOperations.includes(project.operationId));
  if(funded.length>1)fail('DUPLICATE_EXTERNAL_REACH');
  if(funded.length&&(customer.scenario!=='enterprise'||provider.externalCollaborationVersion!==1||child.providerCustomer?.externalCollaborationVersion!==1))fail('EXTERNAL_REACH_SCOPE');
  for(const project of funded)validateReachReceipt(project);
  for(const project of provider.projects||[])if(project.customerId===customer.id&&reachOperations.includes(project.operationId)&&project.configSubmittedAt==null&&project.operationReceipt!=null)fail('UNSUBMITTED_EXTERNAL_REACH_RECEIPT');
  const operations=child.operations;
  if(!operations){if(funded.length)fail('EXTERNAL_REACH_OPERATIONS_REQUIRED');return;}
  // Provider purchases do not author arbitrary port orders or replace caller IDs.
  // Dedicated and staged migrations move identity placement, keeping these numbers.
  const numbers=[{number:'+61255500101',holder:'alex',type:'user',provider:'level-tree',status:'active'},{number:'+61255500201',holder:'bea',type:'user',provider:'level-tree',status:'active'}];
  if(funded.length)for(const alias of reachAliases)numbers.push({...alias,type:'user',provider:'level-tree',status:'active'});
  if(stable(operations.numbers)!==stable(numbers))fail('NUMBER_OWNERSHIP');
  const policies=Object.fromEntries(numbers.slice(0,2).map(number=>[number.holder,{allowInternational:false,allowedPrefixes:funded.length?['+61','+44']:['+61'],callerId:number.number}]));
  if(stable(operations.policies)!==stable(policies))fail('DIALLING_POLICY');
  if(operations.ports?.length||operations.portOrders?.length)fail('UNPAID_NUMBER_PORT');
 }
 function validateCustomer(provider,customer,child,hooks={}){
  if(!provider||!customer||!child?.resources||!hooks.catalogue)fail('INPUT');
  const expected=expectedModel(provider,customer,child,hooks.catalogue);
  for(const [id,resource] of Object.entries(child.resources)){
   if(!expected.known.has(id))fail(`UNPAID_RESOURCE:${id}`);
   const target=expected.configs[id];if(!target)fail(`RESOURCE:${id}`);
   const nonnumeric=config=>Object.fromEntries(Object.entries(config||{}).filter(([field])=>!numericFields[id]?.includes(field)));
   const desiredPending=expected.transitional[id]&&expected.accepted[id]?.some(item=>stable(nonnumeric(item))===stable(nonnumeric(resource.desired)));
   if(!resource?.desired||stable(nonnumeric(resource.desired))!==stable(nonnumeric(target))&&!desiredPending)fail(`DESIRED:${id}:${JSON.stringify({actual:resource?.desired,expected:target,provisioning:resource?.provisioning,accepted:expected.accepted[id]})}`);
   if(resource.effective!==null&&resource.effective!==undefined&&!expected.accepted[id]?.some(item=>stable(nonnumeric(item))===stable(nonnumeric(resource.effective))))fail(`EFFECTIVE:${id}`);
   if(resource.effective!==null&&stable(nonnumeric(resource.effective))!==stable(nonnumeric(target))&&resource.provisioning?.status!=='pending'&&!expected.transitional[id])fail(`EFFECTIVE_PENDING:${id}`);
   const writeAt=expected.latestWriteAt[id];
   if(expected.skipTiming.has(id))continue;
   if(Number.isSafeInteger(writeAt)){
    const expectedDue=writeAt+1;
    if(resource.provisioning?.due<expectedDue)fail(`PROVISIONING_DUE:${id}`);
    if(resource.provisioning?.status==='ready'&&child.clock<resource.provisioning.due)fail(`EARLY_EFFECTIVE:${id}`);
    // A pending resource may await the next tick (including legacy disabled
    // Defence bootstrap resources). Pending state grants no new effective service.
   }
  }
  validateProducts(provider,customer,child,expected.projects);
  validateCallingOperations(provider,customer,child,expected.projects);
  return true;
 }
 function source(){return `const SOC_PROVIDER_CONFIGURATION_AUTHORITY=(()=>{let api;const load=()=>api||(api=(${socProviderConfigurationAuthorityKernel.toString()})(SOC_PROVIDER_RULES,SOC_PROVIDER_PRODUCTS,SOC_GOVERNMENT_ARCHITECTURES));return {version:1,validateCustomer:(...args)=>load().validateCustomer(...args),source:()=>load().source()};})();`;}
 return {version:1,validateCustomer,source};
}
function socProviderConfigurationAuthorityDependencies(){if(typeof module!=='undefined'&&module.exports)return [require('./24-provider-rules.js'),require('./23-provider-products.js'),require('./23-provider-government.js')];return [SOC_PROVIDER_RULES,SOC_PROVIDER_PRODUCTS,SOC_GOVERNMENT_ARCHITECTURES];}
const SOC_PROVIDER_CONFIGURATION_AUTHORITY=(()=>{let api;const load=()=>api||(api=socProviderConfigurationAuthorityKernel(...socProviderConfigurationAuthorityDependencies()));return {version:1,validateCustomer:(...args)=>load().validateCustomer(...args),source:()=>load().source()};})();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_CONFIGURATION_AUTHORITY;
