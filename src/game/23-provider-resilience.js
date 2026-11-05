/* Paid, tenant-scoped two-site transport ownership for Provider campaigns. */
function socProviderResilienceKernel(){
 'use strict';
 const VERSION=1,PACK='provider-resilience-1',OPS=Object.freeze(['primary-upstream','diverse-upstream','managed-diverse-upstream','upstream-binding-extension']),REGIONS=Object.freeze(['AU','US','JP','EU']);
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x);
 const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function transportApi(){return typeof SOC_TRANSPORT!=='undefined'?SOC_TRANSPORT:(typeof require==='function'?require('./42-transport.js'):null);}
 function paidProject(provider,customer,project,hooks={}){
  if(!provider||!customer||!project||project.kind!=='operation'||project.customerId!==customer.id||!OPS.includes(project.operationId)||!id(project.id)||!id(project.postingId)||!integer(project.acceptedAt)||!integer(project.setupCents,1)||!integer(project.workMinutes,1)||['cancelled','blocked'].includes(project.status))fail('PROVIDER_RESILIENCE_PAID_PROJECT_REQUIRED');
  if(typeof hooks.validatePaidProject!=='function'||hooks.validatePaidProject(provider,customer,project)!==true)fail('PROVIDER_RESILIENCE_PAID_POSTING_REQUIRED');
  return project;
 }
 function customerScope(customer,child){
  if(!id(customer?.id)||!id(customer?.portfolioId)||!child||child.experience?.kind!=='campaign'||child.experience?.custom!==false||child.providerCustomer?.version!==1||child.providerCustomer?.id!==customer.id||child.providerCustomer?.portfolioId!==undefined&&child.providerCustomer.portfolioId!==customer.portfolioId||child.providerCampaign||!REGIONS.includes(child.jurisdiction)||typeof child.tenant!=='string'||!id(child.tenant))fail('PROVIDER_RESILIENCE_CUSTOMER_SCOPE_REQUIRED');
 }
 function ids(customerId){if(!id(customerId)||customerId.length>24)fail('PROVIDER_RESILIENCE_CUSTOMER_ID_TOO_LONG');return {head:`${customerId}-head`,branch:`${customerId}-branch`,primary:`${customerId}-a-primary`,backup:`${customerId}-z-backup`,headDomain:`${customerId}-head-domain`,branchDomain:`${customerId}-branch-domain`,primaryDomain:`${customerId}-primary-domain`,backupDomain:`${customerId}-backup-domain`};}
 function site(idValue,name,region,domain){return {id:idValue,config:{name,region,domain,powerDomain:`${idValue}-power`,backupPowerDomain:null}};}
 function link(idValue,from,to,domain,leadMinutes){return {id:idValue,config:{from,to,mode:'purchased',capacityMbps:20,latencyMs:18,domain,leadMinutes,setupCents:0,periodCents:0,contract:null}};}
 function coreBindings(child,siteIds){
  const rows=[{resource:'identity',site:siteIds.head},{resource:'carrier',site:siteIds.head},{resource:'service',site:siteIds.branch},{resource:'desk',site:siteIds.branch},{resource:'room',site:siteIds.branch}];
  for(const row of rows)if(!child.resources?.[row.resource])fail(`PROVIDER_RESILIENCE_RESOURCE_REQUIRED:${row.resource}`);
  if(child.resources.desk.kind!=='endpoint')fail('PROVIDER_RESILIENCE_ENDPOINT_REQUIRED');
  return rows;
 }
 function endpointResources(child,at,hooks){
  const result=[];for(const [resourceId,resource] of Object.entries(child.resources||{}).sort(([a],[b])=>a.localeCompare(b))){if(resource?.kind!=='endpoint'||resourceId==='desk')continue;if(typeof hooks.resourceOwnedAt!=='function'||hooks.resourceOwnedAt(child,resourceId,at)!==true)continue;result.push(resourceId);}return result;
 }
 function plan(operationId,customer,child,hooks={},at=child?.clock){
  if(!OPS.includes(operationId))fail('PROVIDER_RESILIENCE_OPERATION_UNKNOWN');customerScope(customer,child);const names=ids(customer.id),core=coreBindings(child,names);let bindings=[],sites=[],links=[];
  if(operationId==='primary-upstream'){bindings=[...core,...endpointResources(child,at,hooks).map(resource=>({resource,site:names.branch}))];sites=[site(names.head,'Customer head office',child.jurisdiction,names.headDomain),site(names.branch,'Customer service branch',child.jurisdiction,names.branchDomain)];links=[link(names.primary,names.head,names.branch,names.primaryDomain,8)];}
  else if(operationId==='diverse-upstream'||operationId==='managed-diverse-upstream'){links=[link(names.backup,names.head,names.branch,names.backupDomain,operationId==='managed-diverse-upstream'?10:8)];}
  else {if(typeof hooks.resourceOwnedAt!=='function')fail('PROVIDER_RESILIENCE_RESOURCE_OWNERSHIP_REQUIRED');const existing=new Set(Object.keys(child.transport?.bindings||{}));bindings=endpointResources(child,at,hooks).filter(resource=>!existing.has(resource)).map(resource=>({resource,site:names.branch}));if(!bindings.length)fail('NO_UNBOUND_PAID_ENDPOINT');}
  return {version:VERSION,operationId,customerId:customer.id,portfolioId:customer.portfolioId,tenant:child.tenant,jurisdiction:child.jurisdiction,sites,links,bindings};
 }
 function validatePlan(value){
  if(!exact(value,['version','operationId','customerId','portfolioId','tenant','jurisdiction','sites','links','bindings'])||value.version!==VERSION||!OPS.includes(value.operationId)||!id(value.customerId)||!id(value.portfolioId)||!id(value.tenant)||!REGIONS.includes(value.jurisdiction)||!Array.isArray(value.sites)||!Array.isArray(value.links)||!Array.isArray(value.bindings))fail('INVALID_PROVIDER_RESILIENCE_PLAN');
  const names=ids(value.customerId),primary=value.operationId==='primary-upstream',extension=value.operationId==='upstream-binding-extension',expectedSites=primary?[site(names.head,'Customer head office',value.jurisdiction,names.headDomain),site(names.branch,'Customer service branch',value.jurisdiction,names.branchDomain)]:[],expectedLinks=primary?[link(names.primary,names.head,names.branch,names.primaryDomain,8)]:['diverse-upstream','managed-diverse-upstream'].includes(value.operationId)?[link(names.backup,names.head,names.branch,names.backupDomain,value.operationId==='managed-diverse-upstream'?10:8)]:[];
  if(!same(value.sites,expectedSites)||!same(value.links,expectedLinks)||value.bindings.some(x=>!exact(x,['resource','site'])||!id(x.resource)||x.site!==names.head&&x.site!==names.branch)||new Set(value.bindings.map(x=>x.resource)).size!==value.bindings.length)fail('INVALID_PROVIDER_RESILIENCE_PLAN');
  if(primary){const expectedCore=[{resource:'identity',site:names.head},{resource:'carrier',site:names.head},{resource:'service',site:names.branch},{resource:'desk',site:names.branch},{resource:'room',site:names.branch}];if(!same(value.bindings.slice(0,5),expectedCore)||value.bindings.slice(5).some(x=>x.site!==names.branch||x.resource==='identity'||x.resource==='carrier'||x.resource==='service'||x.resource==='desk'||x.resource==='room')||!same(value.bindings.slice(5),value.bindings.slice(5).slice().sort((a,b)=>a.resource.localeCompare(b.resource))))fail('INVALID_PROVIDER_RESILIENCE_BINDINGS');}
  else if(extension){if(!value.bindings.length||value.bindings.some(x=>x.site!==names.branch||['identity','carrier','service','desk','room'].includes(x.resource)))fail('INVALID_PROVIDER_RESILIENCE_BINDINGS');}
  else if(value.bindings.length)fail('INVALID_PROVIDER_RESILIENCE_BINDINGS');
  return true;
 }
 function canOrder(provider,customer,operationId,child,hooks={},ignoreProjectId=null){
  const missing=[];
  try{customerScope(customer,child);if(!OPS.includes(operationId))missing.push('UNKNOWN_OPERATION');else plan(operationId,customer,child,hooks,child.clock);}catch(error){missing.push(error.message);}
  const prior=(provider?.projects||[]).filter(x=>x.id!==ignoreProjectId&&x.customerId===customer?.id&&OPS.includes(x.operationId)&&!['cancelled','blocked'].includes(x.status));
  const primary=prior.find(x=>x.operationId==='primary-upstream');
  if(operationId==='primary-upstream'&&primary)missing.push('PRIMARY_ALREADY_ORDERED');
  if(['diverse-upstream','managed-diverse-upstream'].includes(operationId)){
   if(!primary||!prior.some(x=>x.id===primary.id&&x.status==='complete'))missing.push('PAID_PRIMARY_REQUIRED');
   if(prior.some(x=>['diverse-upstream','managed-diverse-upstream'].includes(x.operationId)))missing.push('DIVERSE_PATH_ALREADY_FUNDED');
   if(operationId==='managed-diverse-upstream'&&(typeof hooks.managedEligibility!=='function'||hooks.managedEligibility(provider,customer)!==true))missing.push('EARNED_MANAGED_DIVERSE_REQUIRED');
  }
  if(operationId==='upstream-binding-extension'){
   if(!prior.some(x=>x.operationId==='primary-upstream'&&x.status==='complete'))missing.push('PAID_PRIMARY_REQUIRED');
   if(missing.includes('NO_UNBOUND_PAID_ENDPOINT'))missing.push('NO_UNBOUND_PAID_ENDPOINT');
  }
  if(prior.some(x=>x.status==='running'||x.status==='commissioning'))missing.push('RESILIENCE_PROJECT_PENDING');
  return {eligible:missing.length===0,missing:[...new Set(missing)],operationId,customerId:customer?.id||null};
 }
 function commands(provider,customer,project,child,hooks={}){
  paidProject(provider,customer,project,hooks);const result=canOrder(provider,customer,project.operationId,child,hooks,project.id);if(!result.eligible)fail(`PROVIDER_RESILIENCE_ORDER_BLOCKED:${result.missing.join(',')}`);const value=plan(project.operationId,customer,child,hooks,child.clock),out=[];
  for(const entry of value.sites)out.push({action:'site',id:entry.id,config:copy(entry.config)});
  for(const entry of value.links)out.push({action:'link',id:entry.id,config:copy(entry.config)});
  for(const entry of value.bindings)out.push({action:'bind',resource:entry.resource,site:entry.site});
  return {plan:value,commands:out};
 }
 function installation(provider,customer,project,child,hooks={}){
  paidProject(provider,customer,project,hooks);const names=ids(customer.id),transport=child.transport,existing=child.providerResilience?.installations||[],priorBindings=new Set(existing.flatMap(x=>x.bindings.map(y=>y.resource))),expectedSites=project.operationId==='primary-upstream'?[site(names.head,'Customer head office',child.jurisdiction,names.headDomain),site(names.branch,'Customer service branch',child.jurisdiction,names.branchDomain)]:[],expectedLinks=project.operationId==='primary-upstream'?[link(names.primary,names.head,names.branch,names.primaryDomain,8)]:['diverse-upstream','managed-diverse-upstream'].includes(project.operationId)?[link(names.backup,names.head,names.branch,names.backupDomain,project.operationId==='managed-diverse-upstream'?10:8)]:[];
  if(!transport||transport.totalCosts!==0||transport.ledger?.length!==0)fail('PROVIDER_RESILIENCE_TRANSPORT_COST_MUST_BE_ZERO');
  const expectedBindings=project.operationId==='primary-upstream'?[...coreBindings(child,names),...endpointResources(child,child.clock,hooks).map(resource=>({resource,site:names.branch}))]:project.operationId==='upstream-binding-extension'?endpointResources(child,child.clock,hooks).filter(resource=>!priorBindings.has(resource)).map(resource=>({resource,site:names.branch})):[];
  const sites=expectedSites.map(x=>({id:x.id,generation:transport.sites?.[x.id]?.generation})),links=expectedLinks.map(x=>({id:x.id,generation:transport.links?.[x.id]?.generation}));
  if([...sites,...links].some(x=>!integer(x.generation,1)))fail('PROVIDER_RESILIENCE_TRANSPORT_COMMANDS_NOT_APPLIED');
  const allowedBindings=expectedBindings.map(x=>copy(x));if(allowedBindings.some(x=>transport.bindings?.[x.resource]!==x.site))fail('PROVIDER_RESILIENCE_BINDINGS_NOT_APPLIED');
  if(project.operationId==='upstream-binding-extension'&&!allowedBindings.length)fail('NO_UNBOUND_PAID_ENDPOINT');
  return {projectId:project.id,postingId:project.postingId,operationId:project.operationId,installedAt:child.clock,sites,links,bindings:allowedBindings};
 }
 function validateInstallation(provider,customer,child,row,hooks={}){
  if(!exact(row,['projectId','postingId','operationId','installedAt','sites','links','bindings'])||!id(row.projectId)||!id(row.postingId)||!OPS.includes(row.operationId)||!integer(row.installedAt,0,child.clock)||!Array.isArray(row.sites)||!Array.isArray(row.links)||!Array.isArray(row.bindings))fail('INVALID_PROVIDER_RESILIENCE_INSTALLATION');
  const project=provider.projects?.find(x=>x.id===row.projectId);paidProject(provider,customer,project,hooks);
  const receipt=project.operationReceipt;if(project.postingId!==row.postingId||project.operationId!==row.operationId||!exact(receipt,['kind','projectId','postingId','installedAt'])||receipt.kind!==row.operationId||receipt.projectId!==project.id||receipt.postingId!==project.postingId||receipt.installedAt!==row.installedAt||!integer(project.configSubmittedAt)||!['commissioning','complete'].includes(project.status)||project.acceptedAt>row.installedAt+1||project.configSubmittedAt!==row.installedAt&&project.configSubmittedAt!==row.installedAt+1)fail('INVALID_PROVIDER_RESILIENCE_PROJECT_LINK');
  const names=ids(customer.id),t=child.transport;if(!t||t.totalCosts!==0||t.ledger?.length!==0)fail('PROVIDER_RESILIENCE_TRANSPORT_COST_MUST_BE_ZERO');
  const primary=row.operationId==='primary-upstream',extension=row.operationId==='upstream-binding-extension',expectedSites=primary?[site(names.head,'Customer head office',child.jurisdiction,names.headDomain) ,site(names.branch,'Customer service branch',child.jurisdiction,names.branchDomain)]:[],expectedLinks=primary?[link(names.primary,names.head,names.branch,names.primaryDomain,8)]:['diverse-upstream','managed-diverse-upstream'].includes(row.operationId)?[link(names.backup,names.head,names.branch,names.backupDomain,row.operationId==='managed-diverse-upstream'?10:8)]:[];
  if(!same(row.sites,expectedSites.map(x=>({id:x.id,generation:1})))||!same(row.links,expectedLinks.map(x=>({id:x.id,generation:1})))||!Array.isArray(row.bindings))fail('INVALID_PROVIDER_RESILIENCE_INSTALLATION');
  const core=coreBindings(child,names),expectedCore=primary?core:[],expectedBindingResources=row.bindings.map(x=>x?.resource),priorBindings=new Set((hooks.priorInstallations||[]).flatMap(x=>x.bindings.map(y=>y.resource)));
  if(row.bindings.some(x=>!exact(x,['resource','site'])||!id(x.resource)||x.site!==names.head&&x.site!==names.branch)||new Set(expectedBindingResources).size!==expectedBindingResources.length)fail('INVALID_PROVIDER_RESILIENCE_BINDINGS');
  const expectedPrimaryBindings=[...expectedCore,...endpointResources(child,row.installedAt,hooks).map(resource=>({resource,site:names.branch}))],expectedExtensionBindings=endpointResources(child,row.installedAt,hooks).filter(resource=>!priorBindings.has(resource)).map(resource=>({resource,site:names.branch}));
  if(primary&&!same(row.bindings,expectedPrimaryBindings))fail('INVALID_PROVIDER_RESILIENCE_BINDINGS');
  if(extension&&(!expectedExtensionBindings.length||!same(row.bindings,expectedExtensionBindings)))fail('INVALID_PROVIDER_RESILIENCE_BINDINGS');
  if(!primary&&!extension&&row.bindings.length)fail('INVALID_PROVIDER_RESILIENCE_BINDINGS');
  if(row.bindings.some(x=>t.bindings?.[x.resource]!==x.site))fail('PROVIDER_RESILIENCE_BINDINGS_NOT_APPLIED');
  for(const entry of expectedSites){const node=t.sites?.[entry.id];if(!node||!same(node.desired,entry.config)||node.generation!==1||node.provisioning?.generation!==1||node.provisioning.due!==row.installedAt+1||!['pending','ready'].includes(node.provisioning.status)||node.observed?.available!==true||node.observed?.power!==true)fail('INVALID_PROVIDER_RESILIENCE_SITE');if(node.effective&&(!same(node.effective,entry.config)||node.effectiveGeneration!==1||child.clock<node.provisioning.due))fail('INVALID_PROVIDER_RESILIENCE_EARLY_EFFECTIVE');if(node.provisioning.status==='ready'&&(!node.effective||node.effectiveGeneration!==1))fail('INVALID_PROVIDER_RESILIENCE_SITE_EFFECTIVE');if(node.provisioning.status==='pending'&&child.clock>=node.provisioning.due)fail('INVALID_PROVIDER_RESILIENCE_SITE_DUE');}
  for(const entry of expectedLinks){const node=t.links?.[entry.id];if(!node||!same(node.desired,entry.config)||node.generation!==1||node.provisioning?.generation!==1||node.provisioning.due!==row.installedAt+entry.config.leadMinutes||!['pending','ready'].includes(node.provisioning.status)||node.observed?.available!==true||node.observed?.power!==true)fail('INVALID_PROVIDER_RESILIENCE_LINK');if(node.effective&&(!same(node.effective,entry.config)||node.effectiveGeneration!==1||child.clock<node.provisioning.due))fail('INVALID_PROVIDER_RESILIENCE_EARLY_EFFECTIVE');if(node.provisioning.status==='ready'&&(!node.effective||node.effectiveGeneration!==1))fail('INVALID_PROVIDER_RESILIENCE_LINK_EFFECTIVE');if(node.provisioning.status==='pending'&&child.clock>=node.provisioning.due)fail('INVALID_PROVIDER_RESILIENCE_LINK_DUE');}
  return true;
 }
 function validateCustomer(provider,customer,child,hooks={}){
  const marker=child?.providerResilience,operations=(provider?.projects||[]).filter(x=>x.customerId===customer?.id&&OPS.includes(x.operationId)&&integer(x.configSubmittedAt)&&!['cancelled','blocked'].includes(x.status));
  const t=child?.transport,hasTransportState=!!t&&(Object.keys(t.sites||{}).length||Object.keys(t.links||{}).length||Object.keys(t.bindings||{}).length||Object.keys(t.domains||{}).length||(t.reservations||[]).length||t.totalCosts!==0||(t.ledger||[]).length);
  if(marker===undefined){if(operations.length||hasTransportState)fail('PROVIDER_RESILIENCE_MARKER_REQUIRED');return true;}
  if(!exact(marker,['version','installations'])||marker.version!==VERSION||!Array.isArray(marker.installations)||marker.installations.length>100||new Set(marker.installations.map(x=>x?.projectId)).size!==marker.installations.length)fail('INVALID_PROVIDER_RESILIENCE_MARKER');customerScope(customer,child);
  if(marker.installations.length!==operations.length)fail('INVALID_PROVIDER_RESILIENCE_PROJECT_COUNT');
  if(!operations.length&&marker.installations.length===0){if(hasTransportState)fail('UNFUNDED_PROVIDER_TRANSPORT_OBJECT');return true;}
  const byTime=[...marker.installations].sort((a,b)=>a.installedAt-b.installedAt||a.projectId.localeCompare(b.projectId));if(!same(byTime,marker.installations))fail('INVALID_PROVIDER_RESILIENCE_ORDER');
  let hasPrimary=false,hasDiversity=false;for(const row of marker.installations){validateInstallation(provider,customer,child,row,{...hooks,priorInstallations:marker.installations.filter(x=>x.installedAt<row.installedAt)});if(row.operationId==='primary-upstream'){if(hasPrimary||hasDiversity)fail('INVALID_PROVIDER_RESILIENCE_ORDER');hasPrimary=true;}else if(row.operationId==='diverse-upstream'||row.operationId==='managed-diverse-upstream'){if(!hasPrimary||hasDiversity)fail('INVALID_PROVIDER_RESILIENCE_ORDER');hasDiversity=true;}else if(row.operationId==='upstream-binding-extension'){if(!hasPrimary)fail('INVALID_PROVIDER_RESILIENCE_ORDER');} }
  const names=ids(customer.id),allSites=new Set(marker.installations.flatMap(x=>x.sites.map(y=>y.id))),allLinks=new Set(marker.installations.flatMap(x=>x.links.map(y=>y.id)));
  if(Object.keys(t.sites||{}).some(x=>!allSites.has(x))||Object.keys(t.links||{}).some(x=>!allLinks.has(x))||Object.entries(t.bindings||{}).some(([resource,siteId])=>!marker.installations.flatMap(x=>x.bindings).some(x=>x.resource===resource&&x.site===siteId)))fail('UNFUNDED_PROVIDER_TRANSPORT_OBJECT');
  const permittedDomains=new Set([names.headDomain,names.branchDomain,names.primaryDomain,names.backupDomain]);for(const domain of Object.keys(t.domains||{}))if(!permittedDomains.has(domain))fail('UNFUNDED_PROVIDER_TRANSPORT_DOMAIN');
  if(Object.keys(t.domains||{}).length&& (typeof hooks.validateDomainState!=='function'||hooks.validateDomainState(provider,customer,child)!==true))fail('INVALID_PROVIDER_RESILIENCE_DOMAIN_EVIDENCE');
  return true;
 }
 function inspect(provider,customer,child,hooks={}){
  customerScope(customer,child);const marker=child.providerResilience;if(!marker)return {version:VERSION,sites:[],links:[],bindings:[],domains:[],paths:{primary:{ready:false,edges:[],kbps:160,latencyMs:null},diverse:{ready:false,edges:[],kbps:160,latencyMs:null},selected:{ready:false,edges:[],kbps:160,latencyMs:null}}};
  const api=hooks.transport||transportApi();if(!api)fail('PROVIDER_RESILIENCE_TRANSPORT_REQUIRED');const p=api.inspect(child),names=ids(customer.id),linkIds=[names.primary,names.backup].filter(idValue=>p.links[idValue]),siteIds=[names.head,names.branch].filter(idValue=>p.sites[idValue]);
  const sites=siteIds.map(idValue=>{const n=p.sites[idValue],c=n.effective||n.desired;return {id:idValue,name:c.name,region:c.region,domain:c.domain,powerDomain:c.powerDomain||null,provisioning:copy(n.provisioning),desiredGeneration:n.generation,effective:{generation:n.effectiveGeneration??null,config:n.effective?copy(n.effective):null},observed:{available:n.observed.available,power:n.observed.power,domainFailed:p.domains[c.domain]===true,ready:p.siteStatus[idValue]===true}};});
  const usage=idValue=>{const n=p.links[idValue],c=n.effective||n.desired,occupiedKbps=p.reservations.filter(r=>r.edges.includes(idValue)).reduce((sum,r)=>sum+r.kbps,0);return {id:idValue,from:c.from,to:c.to,domain:c.domain,provisioning:copy(n.provisioning),desiredGeneration:n.generation,effective:{generation:n.effectiveGeneration??null,capacityMbps:n.effective?.capacityMbps??null,latencyMs:n.effective?.latencyMs??null},observed:{available:n.observed.available,power:n.observed.power,domainFailed:p.domains[c.domain]===true,ready:p.linkStatus[idValue]===true},usage:{occupiedKbps,remainingKbps:Math.max(0,(n.effective?.capacityMbps||c.capacityMbps)*1000-occupiedKbps)}};};
  const links=linkIds.map(usage),bindings=Object.entries(p.bindings).filter(([resource])=>['identity','carrier','service','room','desk'].includes(resource)).map(([resource,site])=>({resource,site})).sort((a,b)=>a.resource.localeCompare(b.resource)),domains=[...new Set([...sites.map(x=>x.domain),...links.map(x=>x.domain)])].sort().map(idValue=>({id:idValue,failed:p.domains[idValue]===true}));
  const primaryLink=links.find(x=>x.id===names.primary),fallbackLink=links.find(x=>x.id===names.backup),selected=api.resourcePath(child,'identity','service','voice'),directPath=item=>({ready:item?.observed.ready===true&&item.usage.remainingKbps>=160,edges:item?.observed.ready===true?[item.id]:[],kbps:160,latencyMs:item?.effective.latencyMs??null}),paths={primary:directPath(primaryLink),diverse:directPath(fallbackLink),selected:{ready:selected.ready===true,edges:[...(selected.edges||[])],kbps:160,latencyMs:selected.latencyMs??null}};
  return {version:VERSION,sites,links,bindings,domains,paths};
 }
 const source=()=>`const SOC_PROVIDER_RESILIENCE=(${socProviderResilienceKernel.toString()})();`;
 return {VERSION,PACK,OPS,plan,validatePlan,canOrder,commands,installation,validateCustomer,inspect,source};
}
const SOC_PROVIDER_RESILIENCE=socProviderResilienceKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_PROVIDER_RESILIENCE=SOC_PROVIDER_RESILIENCE;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_RESILIENCE;
