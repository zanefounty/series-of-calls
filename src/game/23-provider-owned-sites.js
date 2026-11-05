/* Paid Provider adapter for the canonical customer site-operations domain. */
function socProviderOwnedSitesKernel(){
 'use strict';
 const VERSION=1,PACK='provider-owned-sites-1';
 const SOURCE={DF:['progress','goal','df'].join('.'),M2:['progress','goal','m2'].join('.'),L4:['progress','progression-level','4'].join('.'),L12:['progress','progression-level','12'].join('.'),GI:['progress','goal','gi'].join('.')};
 const RECOVERY_IDS=Object.freeze(['site-recovery','managed-site-recovery']);
 const isRecoveryOperation=operationId=>RECOVERY_IDS.includes(operationId);
 const OPERATION_IDS=Object.freeze(['site-diverse-ingress','owned-site-operations',...RECOVERY_IDS,'site-resource-migration','custody-review']);
 const TERMS=Object.freeze({
  'site-diverse-ingress':Object.freeze({setupCents:32000,periodCents:7000,workMinutes:8,engineers:1,support:1,commissioningMinutes:8}),
  'owned-site-operations':Object.freeze({setupCents:42000,periodCents:4500,workMinutes:10,engineers:1,support:1}),
  'site-recovery':Object.freeze({setupCents:16000,periodCents:1000,workMinutes:6,engineers:1,support:1}),
  'managed-site-recovery':Object.freeze({setupCents:10000,periodCents:2200,workMinutes:9,engineers:0,support:1}),
  'site-resource-migration':Object.freeze({setupCents:12000,periodCents:0,workMinutes:4,engineers:1,support:1,perItem:true}),
  'custody-review':Object.freeze({setupCents:5500,periodCents:0,workMinutes:3,engineers:0,support:1})
 });
 const SITE_IDS=Object.freeze({head:'provider-owned-head',branch:'provider-owned-branch'});
 const RESOURCE_IDS=Object.freeze({head:Object.freeze({admin:'owned-head-admin',backup:'owned-head-backup',restore:'owned-head-restore'}),branch:Object.freeze({admin:'owned-branch-admin',backup:'owned-branch-backup',restore:'owned-branch-restore'})});
 const ENDPOINTS=Object.freeze([{resource:'desk',person:'bea',site:'head'},{resource:'dedicated-endpoint',person:'alex',site:'branch'}]);
 const OWNER='orchard-msp';
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x)),own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x);
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function siteApi(){return typeof SOC_SITE_OPERATIONS!=='undefined'?SOC_SITE_OPERATIONS:(typeof require==='function'?require('./32-site-operations.js'):null);}
 function custodyApi(){return typeof SOC_PROVIDER_OWNED_SITE_CUSTODY!=='undefined'?SOC_PROVIDER_OWNED_SITE_CUSTODY:(typeof require==='function'?require('./23-provider-owned-site-custody.js'):null);}
 function resilienceApi(){return typeof SOC_PROVIDER_RESILIENCE!=='undefined'?SOC_PROVIDER_RESILIENCE:(typeof require==='function'?require('./23-provider-resilience.js'):null);}
 function transportApi(){return typeof SOC_TRANSPORT!=='undefined'?SOC_TRANSPORT:(typeof require==='function'?require('./42-transport.js'):null);}
 function customerRow(s,customerId){return s?.providerCampaign?.customers?.find(c=>c.id===customerId)||null;}
 function childRoot(s,c,hooks={}){return typeof hooks.customerRoot==='function'?hooks.customerRoot(s,c.portfolioId):s?.portfolio?.customers?.find(x=>x.id===c.portfolioId)?.root||c.root||null;}
 function projectRows(s,c,operationId){return (s?.providerCampaign?.projects||[]).filter(p=>p&&p.customerId===c?.id&&p.operationId===operationId&&p.kind==='operation');}
 function paidProject(s,c,p,options={}){
  if(!p||!s?.providerCampaign?.projects?.includes(p)||p.customerId!==c?.id||p.kind!=='operation'||!OPERATION_IDS.includes(p.operationId)||!id(p.id)||!id(p.postingId)||!integer(p.acceptedAt)||!integer(p.setupCents,1)||!integer(p.workMinutes,1)||!['running','commissioning','complete'].includes(p.status))return false;
  if(options.complete===true&&(p.status!=='complete'||!integer(p.completedAt)||p.completedAt>s.clock))return false;
  const ledger=s.business?.ledger?.find(x=>x.id===p.postingId);
  if(ledger)return ledger.category==='cost'&&ledger.reason==='provider-operation'&&ledger.customerId===c.id&&ledger.projectId===p.id&&ledger.cents===p.setupCents;
  const pruned=/^entry-([1-9]\d*)$/.exec(p.postingId);return !!pruned&&Number(pruned[1])<=(s.business?.ledgerPrunedThrough||0);
 }
 function providerScope(s,c,child){const owner=s?.portfolio?.customers?.find(row=>row.id===c?.portfolioId);return !!(s?.experience?.version===1&&s.experience.kind==='campaign'&&s.experience.custom===false&&s.providerCampaign?.pack==='soc-provider-campaign-1'&&c&&owner?.root===child&&owner.tenant===child?.tenant&&child?.experience?.version===1&&child.experience.kind==='campaign'&&child.experience.custom===false&&child.providerCustomer?.version===1&&child.providerCustomer.id===c.id&&child.tenant&&child.jurisdiction);}
 function operationPaid(s,c,operationId,options={}){return projectRows(s,c,operationId).filter(p=>paidProject(s,c,p,{complete:options.complete!==false})).sort((a,b)=>(a.completedAt||a.acceptedAt)-(b.completedAt||b.acceptedAt)||a.id.localeCompare(b.id));}
 function idsFor(c){if(!c||!id(c.id))fail('PROVIDER_OWNED_SITES_CUSTOMER_REQUIRED');const suffix=c.id.length>18?c.id.slice(0,18):c.id;return {headTransport:`${c.id}-head`,branchTransport:`${c.id}-branch`,ingressTransport:`${c.id}-ingress`,head:SITE_IDS.head,branch:SITE_IDS.branch,headDomain:`${c.id}-head-domain`,branchDomain:`${c.id}-branch-domain`,ingressDomain:`${c.id}-ingress-domain`,ingressHead:`${c.id}-ingress-head`,ingressBranch:`${c.id}-ingress-branch`,ingressHeadDomain:`${c.id}-ingress-head-domain`,ingressBranchDomain:`${c.id}-ingress-branch-domain`,primaryDomain:`${c.id}-primary-domain`,backupDomain:`${c.id}-backup-domain`,suffix};}
 function resourceConfig(kind,region){
  if(kind==='infrastructure')return {enabled:true,identity:true,dns:true,time:true,certificates:true,licensing:true,backup:true,local:true,region};
  if(kind==='archive')return {enabled:true,capacity:20,retentionDays:30,access:['supervisor'],local:true,region};
  fail('PROVIDER_OWNED_SITE_RESOURCE_KIND_UNKNOWN');
 }
 function expectedConfigs(s,c,child,options={}){
  const names=idsFor(c),transport=child?.transport;if(!transport)fail('PAID_TWO_SITE_TRANSPORT_REQUIRED');
  const head=transport.sites?.[names.headTransport],branch=transport.sites?.[names.branchTransport];
  if(!head?.effective||!branch?.effective||head.provisioning?.status!=='ready'||branch.provisioning?.status!=='ready'||head.effectiveGeneration!==head.generation||branch.effectiveGeneration!==branch.generation)fail('PAID_TWO_EFFECTIVE_TRANSPORT_SITES_REQUIRED');
  const primary=child.providerResilience?.installations?.find(x=>x.operationId==='primary-upstream');
  if(!primary)fail('PAID_RESILIENCE_ENDPOINT_BINDINGS_REQUIRED');
  const endpoints=paidEndpointBindings(s,c,child,{installation:primary});if(!endpoints.ok)fail(endpoints.missing[0]);
  const ingress=ingressEvidence(s,c,child);if(!ingress.ok)fail(ingress.missing[0]);
  const sourceFor=resource=>endpoints.rows.find(x=>x.resource===resource)?.binding.site;
  const fromDesk=sourceFor('desk'),fromAlex=sourceFor('dedicated-endpoint'),fromIdentity=primary.bindings.find(x=>x.resource==='identity')?.site;
  if(!fromDesk||!fromAlex||!fromIdentity)fail('PAID_RESILIENCE_ENDPOINT_BINDINGS_REQUIRED');
  const expectedBindings=[{resource:'identity',from:fromIdentity,to:names.ingressTransport,at:child.clock},{resource:'desk',from:fromDesk,to:names.headTransport,at:child.clock},{resource:'dedicated-endpoint',from:fromAlex,to:names.branchTransport,at:child.clock},{resource:'bea',from:transport.bindings.bea??null,to:names.headTransport,at:child.clock},{resource:'alex',from:transport.bindings.alex??null,to:names.branchTransport,at:child.clock}];
  if(options.installed===true){if(expectedBindings.some(x=>transport.bindings[x.resource]!==x.to)||transport.bindings.carrier!==names.ingressTransport)fail('PAID_OWNED_ENDPOINT_TRANSPORT_BINDINGS_REQUIRED');}
  else if(options.planned===true){if(expectedBindings.some(x=>!([x.from,x.to,null].includes(transport.bindings[x.resource]??null)))||transport.bindings.carrier!==names.ingressTransport)fail('PAID_RESILIENCE_ENDPOINT_BINDINGS_REQUIRED');}
  else if(transport.bindings.identity!==fromIdentity||transport.bindings.carrier!==names.ingressTransport||transport.bindings.desk!==fromDesk||transport.bindings['dedicated-endpoint']!==fromAlex||![null,names.headTransport].includes(transport.bindings.bea??null)||![null,names.branchTransport].includes(transport.bindings.alex??null))fail('PAID_RESILIENCE_ENDPOINT_BINDINGS_REQUIRED');
  const domainsAt=siteId=>[...new Set(Object.values(transport.links||{}).filter(l=>l.effective&&[l.effective.from,l.effective.to].includes(siteId)).map(l=>l.effective.domain))];
  const shared=[...new Set(domainsAt(names.headTransport).filter(domain=>domainsAt(names.branchTransport).includes(domain)))].sort();
  if(!shared.length)fail('OWNED_SITE_SHARED_RISK_REQUIRED');
  const sharedFor=()=>shared;
  const mk=(short,transportSite,node)=>{const r=RESOURCE_IDS[short],region=node.effective.region;return {id:SITE_IDS[short],config:{name:short==='head'?'Provider-owned head office':'Provider-owned service branch',region,transportSite,ownership:'provider',owner:OWNER,powerDomain:node.effective.powerDomain||node.effective.domain,failureDomain:node.effective.domain,sharedDomains:sharedFor(transportSite),adminResource:r.admin,endpointResources:['dedicated-endpoint','desk'],backupResource:r.backup,restoreResource:r.restore}};};
  return {head:mk('head',names.headTransport,head),branch:mk('branch',names.branchTransport,branch),resourcePlans:[
   {id:RESOURCE_IDS.head.admin,kind:'infrastructure',config:resourceConfig('infrastructure',head.effective.region),role:'administration',site:SITE_IDS.head},
   {id:RESOURCE_IDS.head.backup,kind:'archive',config:resourceConfig('archive',head.effective.region),role:'backup',site:SITE_IDS.head},
   {id:RESOURCE_IDS.head.restore,kind:'infrastructure',config:resourceConfig('infrastructure',head.effective.region),role:'restore',site:SITE_IDS.head},
   {id:RESOURCE_IDS.branch.admin,kind:'infrastructure',config:resourceConfig('infrastructure',branch.effective.region),role:'administration',site:SITE_IDS.branch},
   {id:RESOURCE_IDS.branch.backup,kind:'archive',config:resourceConfig('archive',branch.effective.region),role:'backup',site:SITE_IDS.branch},
   {id:RESOURCE_IDS.branch.restore,kind:'infrastructure',config:resourceConfig('infrastructure',branch.effective.region),role:'restore',site:SITE_IDS.branch}
  ],transportBindings:expectedBindings};
 }
 function resilienceInstallation(s,c,child,hooks={}){
  const marker=child.providerResilience,primary=marker?.installations?.find(row=>row.operationId==='primary-upstream'),project=primary&&s.providerCampaign.projects.find(p=>p.id===primary.projectId&&p.customerId===c.id&&p.operationId==='primary-upstream'&&p.status==='complete'&&p.postingId===primary.postingId);
  if(marker?.version!==1||!primary||!project||!paidGenericProject(s,c,project,'provider-operation'))return {ok:false,missing:['PAID_VALIDATED_RESILIENCE_INSTALLATION_REQUIRED']};
  const names=idsFor(c),transport=child.transport;
  const receipt=project.operationReceipt,expectedBindings=[['identity',names.headTransport],['carrier',names.headTransport],['service',names.branchTransport],['desk',names.branchTransport],['room',names.branchTransport]].map(([resource,site])=>({resource,site}));
  if(!exact(primary,['projectId','postingId','operationId','installedAt','sites','links','bindings'])||primary.projectId!==project.id||primary.postingId!==project.postingId||primary.operationId!=='primary-upstream'||!integer(primary.installedAt,0,child.clock)||!Array.isArray(primary.sites)||!Array.isArray(primary.links)||!Array.isArray(primary.bindings)||!exact(receipt,['kind','projectId','postingId','installedAt'])||receipt.kind!=='primary-upstream'||receipt.projectId!==project.id||receipt.postingId!==project.postingId||receipt.installedAt!==primary.installedAt||!same(primary.sites,[{id:names.headTransport,generation:1},{id:names.branchTransport,generation:1}])||!same(primary.links,[{id:`${c.id}-a-primary`,generation:1}])||!same(primary.bindings.slice(0,5),expectedBindings)||!transport?.sites?.[names.headTransport]?.effective||!transport?.sites?.[names.branchTransport]?.effective||!transport?.links?.[`${c.id}-a-primary`]?.effective||transport.sites[names.headTransport].effectiveGeneration!==1||transport.sites[names.branchTransport].effectiveGeneration!==1||transport.links[`${c.id}-a-primary`].effectiveGeneration!==1)return {ok:false,missing:['CANONICAL_HEAD_AND_BRANCH_REQUIRED']};
  return {ok:true,project,installation:primary};
 }
 function pendingEndpointRestoration(s,c,child,resource,endpoint,expectedIdentity){
  return RECOVERY_IDS.some(operationId=>projectRows(s,c,operationId).some(project=>{
   if(!paidProject(s,c,project,{complete:false})||project.status!=='commissioning'||!integer(project.configSubmittedAt)||project.operationReceipt?.kind!=='site-recovery')return false;
   const exercise=child.siteOperations?.exercises?.find(row=>row.id===project.operationReceipt.exerciseId),snapshot=exercise?.backupSnapshot?.resources?.find(row=>row.id===resource);
   return !!exercise&&exercise.phase==='restoring'&&exercise.restoration?.status==='pending'&&integer(exercise.restoration.due,child.clock+1)&&snapshot?.config?.identity===expectedIdentity&&same(endpoint.desired,snapshot.config)&&endpoint.effective?.identity===expectedIdentity&&endpoint.provisioning?.status==='pending'&&endpoint.provisioning.generation===endpoint.generation&&endpoint.generation===snapshot.generation+1&&endpoint.provisioning.due===exercise.restoration.due;
  }));
 }
 function platformMigrationEvidence(s,c,child,project,resource,allowPending=false){
  const operationId=project?.operationId,consolidated=operationId==='migration-consolidated',mode=consolidated?'consolidated':undefined,identities=consolidated?['alex','bea']:['bea'],target=consolidated?'phone':'migration-phone',affected=consolidated?['desk','dedicated-endpoint']:['desk'],identity=resource==='desk'?'bea':'alex',endpoint=child.resources?.[resource];
  if(!affected.includes(resource)||endpoint?.kind!=='endpoint'||endpoint?.effective?.identity!==identity||endpoint?.desired?.identity!==identity||!['pending','ready'].includes(endpoint?.provisioning?.status)||endpoint.provisioning.generation!==endpoint.generation||endpoint.provisioning.status==='pending'&&endpoint.provisioning.due<=child.clock||endpoint.provisioning.status==='ready'&&(!same(endpoint.desired,endpoint.effective)||endpoint.provisioning.due>child.clock))return null;
  if(!s.providerCampaign.projects.includes(project)||project.customerId!==c.id||project.kind!=='operation'||project.productId!==null||!['commissioning','complete'].includes(project.status)||!integer(project.setupCents,1)||!id(project.postingId)||!integer(project.configSubmittedAt,project.acceptedAt,s.clock)||project.configSubmittedAt!==project.dueAt||!same([...project.resources].sort(),['desk','phone'])||!exact(project.expectedGenerations,['phone','desk'])||!integer(project.expectedGenerations.phone,1)||!integer(project.expectedGenerations.desk,1))return null;
  const posting=s.business?.ledger?.find(row=>row.id===project.postingId);
  if(posting?posting.category!=='cost'||posting.reason!=='provider-operation'||posting.customerId!==c.id||posting.projectId!==project.id||posting.cents!==project.setupCents:!/^entry-([1-9]\d*)$/.test(project.postingId)||Number(project.postingId.slice(6))>(s.business?.ledgerPrunedThrough||0))return null;
  const receipt=project.operationReceipt;
  if(!exact(receipt,['kind','operationId','at','revision'])||receipt.kind!=='operation'||receipt.operationId!==operationId||!integer(receipt.at,project.acceptedAt,project.configSubmittedAt)||receipt.at+1!==project.configSubmittedAt||!integer(receipt.revision))return null;
  const tasks=(child.providerTasks||[]).filter(row=>row.kind==='migration'&&row.mode===mode&&['submitted','complete','completed'].includes(row.status)&&row.createdAt===receipt.at),task=tasks.length===1?tasks[0]:null;
  const migration=(child.operations?.migrations||[]).find(row=>row.id===task?.migrationId),checkpoint=migration?.checkpoint?.[resource];
  if(!task||!migration||!same(migration.identities,identities)||migration.target!==target||migration.reason!==null||!same(Object.keys(migration.checkpoint||{}).sort(),affected.slice().sort())||!same(Object.keys(migration.appliedGenerations||{}).sort(),affected.slice().sort())||!checkpoint||!integer(checkpoint.generation,1)||checkpoint.generation+1!==endpoint.generation||checkpoint.desired?.identity!==identity||migration.appliedGenerations?.[resource]!==endpoint.generation||endpoint.provisioning.generation!==migration.appliedGenerations[resource])return null;
  const expected=copy(checkpoint.desired);expected.scope='site';if(!same(endpoint.desired,expected))return null;
  if(!integer(migration.cutoverAt,receipt.at+1)||!integer(migration.verifyAt,migration.cutoverAt+1)||migration.verifyAt!==endpoint.provisioning.due)return null;
  let phase;
  if(migration.status==='verifying'&&allowPending&&project.status==='commissioning'&&['pending','ready'].includes(endpoint.provisioning.status)&&(endpoint.provisioning.status==='pending'?endpoint.provisioning.due>child.clock&&same(endpoint.effective,checkpoint.desired):same(endpoint.effective,endpoint.desired)&&endpoint.provisioning.due<=child.clock))phase='provisioning';
  else if(migration.status==='complete'&&project.status==='complete'&&integer(project.completedAt,project.configSubmittedAt,s.clock)&&endpoint.provisioning.status==='ready'&&same(endpoint.effective,endpoint.desired))phase='effective';
  else return null;
  return {phase,operationId,project,task,migration,endpoint,resource,identity,checkpoint,affected};
 }
 function paidEndpointPlatformMigration(s,c,child,endpoint,expectedIdentity,allowPending=false){
  const resource=expectedIdentity==='bea'?'desk':expectedIdentity==='alex'?'dedicated-endpoint':null;if(!resource||endpoint!==child.resources?.[resource])return false;
  const matches=projectRows(s,c,'migration').concat(projectRows(s,c,'migration-consolidated')).map(project=>platformMigrationEvidence(s,c,child,project,resource,allowPending)).filter(Boolean);
  return matches.sort((a,b)=>b.project.completedAt-a.project.completedAt||b.project.id.localeCompare(a.project.id))[0]||null;
 }
 function platformMigrationTransitions(s,customerId,projectId,hooks={}){
  const c=customerRow(s,customerId),child=c&&childRoot(s,c,hooks),project=c&&['migration','migration-consolidated'].flatMap(operationId=>projectRows(s,c,operationId)).find(row=>row.id===projectId);
  if(!c||!child||!project)return [];
  const rows=(project.operationId==='migration-consolidated'?['desk','dedicated-endpoint']:['desk']).map(resource=>platformMigrationEvidence(s,c,child,project,resource,project.status==='commissioning')).filter(Boolean);
  return rows.flatMap(evidence=>{const binding=child.siteOperations?.bindings?.[evidence.resource],site=binding&&child.siteOperations?.sites?.[binding.site];if(!site?.effective||!site.effective.endpointResources.includes(evidence.resource)||binding.generation!==site.effectiveGeneration||child.transport?.bindings?.[evidence.resource]!==site.effective.transportSite)return [];return [{version:1,phase:evidence.phase,customerId,projectId:project.id,postingId:project.postingId,operationId:project.operationId,migrationId:evidence.migration.id,taskCreatedAt:evidence.task.createdAt,resource:evidence.resource,identity:evidence.identity,platform:evidence.migration.target,fromGeneration:evidence.checkpoint.generation,toGeneration:evidence.migration.appliedGenerations[evidence.resource],effectiveAt:evidence.migration.verifyAt,siteId:binding.site,siteGeneration:site.effectiveGeneration,priorResourceGeneration:site.resourceGenerations?.[evidence.resource],currentResourceGeneration:evidence.endpoint.generation}];});
 }
 function platformMigrationTransition(s,customerId,projectId,hooks={}){return platformMigrationTransitions(s,customerId,projectId,hooks).find(row=>row.resource==='desk')||null;}
 function paidEndpointBindings(s,c,child,resilience,options={}){
  const rows=[];for(const resource of ['desk','dedicated-endpoint']){
   const endpoint=child.resources?.[resource],identity=resource==='desk'?'bea':'alex',ready=endpoint?.provisioning?.status==='ready'&&endpoint?.effective?.identity===identity,pending=options.allowPendingRestore===true&&endpoint&&pendingEndpointRestoration(s,c,child,resource,endpoint,identity),migrating=options.allowPendingPlatformMigration===true&&endpoint&&endpoint.provisioning?.status!=='ready'&&paidEndpointPlatformMigration(s,c,child,endpoint,identity,true);if(endpoint?.kind!=='endpoint'||!endpoint.effective||endpoint.effective.identity!==identity||!ready&&!pending&&!migrating)return {ok:false,missing:[`OWNED_SITE_ENDPOINT_IDENTITY_MISMATCH:${resource}`]};
   const installation=(child.providerResilience?.installations||[]).find(row=>row.bindings?.some(binding=>binding.resource===resource));
   const project=installation&&s.providerCampaign.projects.find(p=>p.id===installation.projectId&&p.customerId===c.id&&p.operationId===installation.operationId&&p.postingId===installation.postingId&&p.status==='complete');
   if(!installation||!project||!paidGenericProject(s,c,project,'provider-operation'))return {ok:false,missing:[`PAID_ENDPOINT_BINDING_REQUIRED:${resource}`]};
   const binding=installation.bindings.find(row=>row.resource===resource),expectedSite=idsFor(c).branchTransport;
   if(!exact(installation,['projectId','postingId','operationId','installedAt','sites','links','bindings'])||!exact(binding,['resource','site'])||binding.site!==expectedSite)return {ok:false,missing:[`PAID_ENDPOINT_BINDING_INVALID:${resource}`]};
   if(resource==='desk'&&installation.operationId!=='primary-upstream'||resource==='dedicated-endpoint'&&!['primary-upstream','upstream-binding-extension'].includes(installation.operationId))return {ok:false,missing:[`PAID_ENDPOINT_BINDING_INVALID:${resource}`]};
   rows.push({resource,project,installation,binding});
  }
  return {ok:true,rows};
 }
 function ingressEvidence(s,c,child){
  const project=projectRows(s,c,'site-diverse-ingress').filter(p=>paidProject(s,c,p,{complete:true})).find(p=>validateIngressProject(s,c,child,p).ok);
  return project?validateIngressProject(s,c,child,project):{ok:false,missing:['PAID_DIVERSE_CALL_INGRESS_REQUIRED']};
 }
 function validateIngressProject(s,c,child,project){
  const names=idsFor(c),r=project?.operationReceipt,keys=['kind','version','projectId','postingId','customerId','installedAt','siteId','siteGeneration','links','carrierBinding'];
  if(!paidProject(s,c,project,{complete:false})||project.operationId!=='site-diverse-ingress'||!exact(r,keys)||r.kind!=='site-diverse-ingress'||r.version!==VERSION||r.projectId!==project.id||r.postingId!==project.postingId||r.customerId!==c.id||!integer(r.installedAt,project.acceptedAt,s.clock)||r.siteId!==names.ingressTransport||r.siteGeneration!==1||!Array.isArray(r.links)||r.links.length!==2||!exact(r.carrierBinding,['resource','from','to','at'])||r.carrierBinding.resource!=='carrier'||r.carrierBinding.from!==names.headTransport||r.carrierBinding.to!==names.ingressTransport||r.carrierBinding.at!==r.installedAt)return {ok:false,missing:['INVALID_PAID_CALL_INGRESS_RECEIPT']};
  const site=child.transport?.sites?.[names.ingressTransport],expectedSite={name:'Provider call ingress',region:child.jurisdiction,domain:names.ingressDomain,powerDomain:`${names.ingressTransport}-power`,backupPowerDomain:null};
  const validNode=(node,config,due,isSite)=>!!node&&same(node.desired,config)&&node.generation===1&&node.provisioning?.generation===1&&node.provisioning?.due===due&&['pending','ready','failed'].includes(node.provisioning.status)&&node.observed?.available===true&&node.observed?.power===true&&(!node.effective||same(node.effective,config)&&node.effectiveGeneration===1&&s.clock>=due)&&(node.provisioning.status!=='ready'||!!node.effective&&node.effectiveGeneration===1&&s.clock>=due)&&(node.provisioning.status!=='pending'||s.clock<due);
  if(!validNode(site,expectedSite,r.installedAt+1,true))return {ok:false,missing:['INVALID_PAID_CALL_INGRESS_SITE']};
  const expected=[{id:names.ingressHead,from:names.ingressTransport,to:names.headTransport,domain:names.ingressHeadDomain},{id:names.ingressBranch,from:names.ingressTransport,to:names.branchTransport,domain:names.ingressBranchDomain}];
  if(!same(r.links,expected.map(x=>({id:x.id,generation:1}))))return {ok:false,missing:['INVALID_PAID_CALL_INGRESS_LINK_RECEIPT']};
  const headDomain=child.transport?.sites?.[names.headTransport]?.effective?.domain,branchDomain=child.transport?.sites?.[names.branchTransport]?.effective?.domain,primaryDomain=child.transport?.links?.[`${c.id}-a-primary`]?.effective?.domain;
  if(new Set([names.ingressDomain,names.ingressHeadDomain,names.ingressBranchDomain,headDomain,branchDomain,primaryDomain]).size!==6)return {ok:false,missing:['CALL_INGRESS_FAILURE_DOMAINS_NOT_INDEPENDENT']};
  if(expected.some(x=>{const node=child.transport?.links?.[x.id],config={from:x.from,to:x.to,mode:'purchased',capacityMbps:20,latencyMs:18,domain:x.domain,leadMinutes:8,setupCents:0,periodCents:0,contract:null};return !validNode(node,config,r.installedAt+8,false);}))return {ok:false,missing:['INVALID_PAID_CALL_INGRESS_LINK']};
  if(child.transport.bindings?.carrier!==names.ingressTransport)return {ok:false,missing:['PAID_CALL_INGRESS_BINDING_REQUIRED']};
  const primary=child.providerResilience?.installations?.find(row=>row.operationId==='primary-upstream');
  const identityMove=projectRows(s,c,'owned-site-operations').some(owned=>{
   const receipt=owned.operationReceipt,move=receipt?.transportBindings?.find(row=>row?.resource==='identity');
   return paidProject(s,c,owned,{complete:false})&&receipt?.kind==='provider-owned-sites'&&receipt?.version===VERSION&&receipt.projectId===owned.id&&receipt.postingId===owned.postingId&&receipt.customerId===c.id&&move?.from===names.headTransport&&move.to===names.ingressTransport&&move.at===receipt.installedAt&&child.transport.bindings.identity===names.ingressTransport;
  });
  if((child.transport.bindings?.identity!==names.headTransport&&!identityMove)||primary?.bindings?.find(x=>x.resource==='identity')?.site!==names.headTransport)return {ok:false,missing:['PAID_IDENTITY_BINDING_REQUIRED']};
  if(project.status==='complete'&&(!integer(project.completedAt,r.installedAt+8,s.clock)||site.provisioning.status!=='ready'||expected.some(x=>child.transport.links[x.id].provisioning.status!=='ready')))return {ok:false,missing:['PAID_CALL_INGRESS_NOT_EFFECTIVE']};
  return {ok:true,project,receipt:r,site,links:expected.map(x=>child.transport.links[x.id])};
 }
 function paidGenericProject(s,c,p,reason){
  if(!p||!s?.providerCampaign?.projects?.includes(p)||p.customerId!==c.id||p.kind!=='operation'||!id(p.id)||!id(p.postingId)||p.status!=='complete'||!integer(p.setupCents,1)||!integer(p.completedAt))return false;
  const row=s.business?.ledger?.find(x=>x.id===p.postingId);if(row)return row.category==='cost'&&row.reason===reason&&row.customerId===c.id&&row.projectId===p.id&&row.cents===p.setupCents;
  const pruned=/^entry-([1-9]\d*)$/.exec(p.postingId);return !!pruned&&Number(pruned[1])<=(s.business?.ledgerPrunedThrough||0);
 }
 function expectedInstallReceipt(s,c,child,project,hooks={},options={}){
  const resilience=resilienceInstallation(s,c,child,hooks);if(!resilience.ok)fail(resilience.missing[0]);const ingress=ingressEvidence(s,c,child);if(!ingress.ok)fail(ingress.missing[0]);const endpoints=paidEndpointBindings(s,c,child,resilience,{allowPendingRestore:true,allowPendingPlatformMigration:options.allowPaidPlatformMigrationTransition===true});if(!endpoints.ok)fail(endpoints.missing[0]);
  const raw=project.operationReceipt,keys=['kind','version','projectId','postingId','customerId','installedAt','siteIds','resourceIds','siteConfigs','transportBindings'];
  if(!exact(raw,keys)||raw.kind!=='provider-owned-sites'||raw.version!==VERSION||raw.projectId!==project.id||raw.postingId!==project.postingId||raw.customerId!==c.id||!integer(raw.installedAt,project.acceptedAt,project.completedAt)||!same(raw.siteIds,[SITE_IDS.head,SITE_IDS.branch])||!same(raw.resourceIds,RESOURCE_IDS)||!exact(raw.siteConfigs,['head','branch'])||!Array.isArray(raw.transportBindings)||raw.transportBindings.length!==5)fail('OWNED_SITE_INSTALLATION_RECEIPT_INVALID');
  const names=idsFor(c),sourceFor=resource=>endpoints.rows.find(x=>x.resource===resource)?.binding.site,fromIdentity=resilience.installation.bindings.find(x=>x.resource==='identity')?.site;
  const allowedPersonSource=value=>value===null||value===names.headTransport||value===names.branchTransport;
  const expectedBindings=[{resource:'identity',from:fromIdentity,to:names.ingressTransport,at:raw.installedAt},{resource:'desk',from:sourceFor('desk'),to:names.headTransport,at:raw.installedAt},{resource:'dedicated-endpoint',from:sourceFor('dedicated-endpoint'),to:names.branchTransport,at:raw.installedAt}];
  const aliases=raw.transportBindings.slice(3);
  if(!same(raw.transportBindings.slice(0,3),expectedBindings)||!same(aliases.map(x=>({resource:x.resource,to:x.to,at:x.at})),[{resource:'bea',to:names.headTransport,at:raw.installedAt},{resource:'alex',to:names.branchTransport,at:raw.installedAt}])||aliases.some(x=>!exact(x,['resource','from','to','at'])||!allowedPersonSource(x.from)))fail('OWNED_SITE_TRANSPORT_BINDING_RECEIPT_INVALID');
  const completeBindings=[...expectedBindings,...aliases],currentBindings=Object.fromEntries(completeBindings.map(row=>[row.resource,row.to]));
  const physicalSite=site=>site===SITE_IDS.head||site===names.headTransport?names.headTransport:site===SITE_IDS.branch||site===names.branchTransport?names.branchTransport:site===names.ingressTransport?names.ingressTransport:null;
  const logicalSite=site=>site===names.headTransport?SITE_IDS.head:site===names.branchTransport?SITE_IDS.branch:null;
  for(const migration of migrationProjects(s,c,child).sort((a,b)=>a.completedAt-b.completedAt||a.projectId.localeCompare(b.projectId))){
   const from=physicalSite(migration.fromSite),to=physicalSite(migration.toSite);
   if(!Object.hasOwn(currentBindings,migration.resourceId)||!from||!to||currentBindings[migration.resourceId]!==from)fail('OWNED_SITE_MIGRATION_BINDING_HISTORY_INVALID');
   currentBindings[migration.resourceId]=to;
   const endpoint=ENDPOINTS.find(row=>row.resource===migration.resourceId);
   if(endpoint){if(!Object.hasOwn(currentBindings,endpoint.person)||currentBindings[endpoint.person]!==from)fail('OWNED_SITE_MIGRATION_BINDING_HISTORY_INVALID');currentBindings[endpoint.person]=to;}
  }
  const bindingMismatch=Object.entries(currentBindings).find(([resource,site])=>child.transport.bindings?.[resource]!==site);
  if(bindingMismatch)fail(`OWNED_SITE_TRANSPORT_BINDING_NOT_APPLIED:${bindingMismatch[0]}`);
  if(child.transport.bindings.identity!==names.ingressTransport||child.transport.bindings.carrier!==names.ingressTransport)fail('OWNED_SITE_TRANSPORT_BINDING_NOT_APPLIED:core');
  for(const resource of ['desk','dedicated-endpoint'])if(child.siteOperations?.bindings?.[resource]?.site!==logicalSite(currentBindings[resource]))fail('OWNED_SITE_MIGRATION_BINDING_HISTORY_INVALID');
  const configs={};for(const short of ['head','branch']){
   const actual=raw.siteConfigs[short],transportId=short==='head'?names.headTransport:names.branchTransport,node=child.transport?.sites?.[transportId]?.effective;
   if(!actual||!node||actual.name!==(short==='head'?'Provider-owned head office':'Provider-owned service branch')||actual.region!==node.region||actual.transportSite!==transportId||actual.ownership!=='provider'||actual.owner!==OWNER||actual.powerDomain!==(node.powerDomain||node.domain)||actual.failureDomain!==node.domain||!same(actual.endpointResources,['dedicated-endpoint','desk'])||actual.adminResource!==RESOURCE_IDS[short].admin||actual.backupResource!==RESOURCE_IDS[short].backup||actual.restoreResource!==RESOURCE_IDS[short].restore||!Array.isArray(actual.sharedDomains)||new Set(actual.sharedDomains).size!==actual.sharedDomains.length||!actual.sharedDomains.length)fail('OWNED_SITE_CONFIGURATION_RECEIPT_INVALID');
   const canonical=[...new Set(Object.values(child.transport.links||{}).filter(l=>l.effective&&[l.effective.from,l.effective.to].includes(transportId)).map(l=>l.effective.domain))];
   if(actual.sharedDomains.some(domain=>!canonical.includes(domain)))fail('OWNED_SITE_SHARED_DOMAIN_RECEIPT_INVALID');
   configs[short]={id:SITE_IDS[short],config:copy(actual)};
  }
  if(!same(raw.siteConfigs.head.sharedDomains,raw.siteConfigs.branch.sharedDomains)||!raw.siteConfigs.head.sharedDomains.length)fail('OWNED_SITE_SHARED_RISK_REQUIRED');
  return {receipt:raw,configs};
 }
 function validateOwnedInstall(s,c,child,project,hooks={},options={}){
  if(!paidProject(s,c,project,{complete:true})||project.operationId!=='owned-site-operations')return {ok:false,missing:['PAID_PROVIDER_OWNED_SITE_OPERATIONS_REQUIRED']};
  let expected;try{expected=expectedInstallReceipt(s,c,child,project,hooks,options);}catch(e){return {ok:false,missing:[String(e.message||'OWNED_SITE_INSTALLATION_INVALID')]};}
  if(!same(project.operationReceipt,expected.receipt))return {ok:false,missing:['OWNED_SITE_PROJECT_RECEIPT_MISMATCH']};
  const api=siteApi();if(!api||!child.siteOperations)return {ok:false,missing:['CANONICAL_SITE_OPERATIONS_REQUIRED']};
  try{api.validate(child);}catch{return {ok:false,missing:['CANONICAL_SITE_OPERATIONS_INVALID']};}
  const p=child.siteOperations;
  for(const short of ['head','branch']){
   const site=expected.configs[short],node=p.sites?.[site.id];
   if(!node||!same(node.desired,site.config)||node.effective&&!same(node.effective,site.config))return {ok:false,missing:[`OWNED_SITE_CONFIGURATION_MISMATCH:${site.id}`]};
   if(node.effective&&(!node.effectiveOwnership||node.effectiveOwnership.owner!==OWNER||node.effectiveOwnership.ownership!=='provider'||node.effectiveOwnership.controlled!==true||node.effectiveOwnership.local!==true))return {ok:false,missing:[`OWNED_SITE_CUSTODY_NOT_CONTROLLED:${site.id}`]};
   const region=site.config.region;
   for(const [resource,kind] of [[site.config.adminResource,'infrastructure'],[site.config.backupResource,'archive'],[site.config.restoreResource,'infrastructure']]){const r=child.resources?.[resource],config=r?.effective;if(r?.kind!==kind||!config||config.local!==true||config.region!==region||resource===site.config.restoreResource&&config.backup!==true||resource===site.config.backupResource&&kind==='archive'&&!Array.isArray(config.access))return {ok:false,missing:[`PAID_OWNED_SITE_RESOURCE_MISSING:${resource}`]};}
   if(node.effective&&Object.entries(node.resourceGenerations||{}).some(([resource,generation])=>{
    const r=child.resources?.[resource],endpoint=ENDPOINTS.find(row=>row.resource===resource),migration=endpoint&&r&&paidEndpointPlatformMigration(s,c,child,r,endpoint.person,options.allowPaidPlatformMigrationTransition===true);
    if(!r||r.generation<generation)return true;
    if(!migration)return r.generation>generation&&r.provisioning?.status==='ready';
    const checkpoint=migration.checkpoint.generation,to=migration.endpoint.generation,binding=child.siteOperations?.bindings?.[resource];
    if(![checkpoint,to].includes(generation))return true;
    if(generation!==(migration.phase==='provisioning'?checkpoint:to))return true;
    if(binding?.site===site.id&&binding.resourceGeneration!==generation)return true;
    return false;
   }))return {ok:false,missing:[`OWNED_SITE_RESOURCE_GENERATION_STALE:${site.id}`]};
   for(const [resource,binding] of Object.entries(child.siteOperations.bindings||{}))if(binding.site===site.id&&binding.resourceGeneration!==node.resourceGenerations?.[resource])return {ok:false,missing:[`OWNED_SITE_RESOURCE_BINDING_GENERATION_INVALID:${resource}`]};
   for(const resource of site.config.endpointResources){const r=child.resources?.[resource],endpoint=ENDPOINTS.find(row=>row.resource===resource),pending=endpoint&&r&&pendingEndpointRestoration(s,c,child,resource,r,endpoint.person),migrating=endpoint&&r&&paidEndpointPlatformMigration(s,c,child,r,endpoint.person,options.allowPaidPlatformMigrationTransition===true);if(r?.kind!=='endpoint'||!r.effective||r.provisioning?.status!=='ready'&&!pending&&!migrating)return {ok:false,missing:[`OWNED_SITE_ENDPOINT_UNAVAILABLE:${resource}`]};}
   const domains=site.config.sharedDomains;if(domains.some(domain=>!Object.values(child.transport.links||{}).some(link=>link.effective?.domain===domain)))return {ok:false,missing:[`OWNED_SITE_SHARED_DOMAIN_UNAVAILABLE:${site.id}`]};
   const physical=child.transport.sites?.[site.config.transportSite];if(physical?.effective&&(physical.effective.region!==region||physical.effective.domain!==site.config.failureDomain||physical.effective.powerDomain!==site.config.powerDomain))return {ok:false,missing:[`OWNED_SITE_TRANSPORT_SCOPE_MISMATCH:${site.id}`]};
   if(node.effective&&['administration','backup','restore'].some(key=>typeof node.observed?.[key]!=='boolean'))return {ok:false,missing:[`OWNED_SITE_OBSERVATION_INVALID:${site.id}`]};
  }
  const bindings=p.bindings||{};for(const row of ENDPOINTS){const binding=bindings[row.resource],siteNode=binding&&p.sites?.[binding.site];if(!binding||!siteNode?.effective||!siteNode.effective.endpointResources.includes(row.resource)||child.transport.bindings[row.resource]!==siteNode.effective.transportSite)return {ok:false,missing:[`OWNED_SITE_ENDPOINT_BINDING_REQUIRED:${row.resource}`]};}
  return {ok:true,project,configs:expected.configs,receipt:expected.receipt,assessment:api.assess(child,hooks.siteOperationsHooks||{})};
 }
 function recoveryChoice(s,c,child,hooks={}){
  const install=operationPaid(s,c,'owned-site-operations').find(p=>p.status==='complete'&&validateOwnedInstall(s,c,child,p,hooks).ok);if(!install)return null;
  const completed=new Set(recoveryRows(s,c,child).map(x=>`${x.kind}:${x.targetSite}`)),required=[['power',SITE_IDS.head],['power',SITE_IDS.branch],['site-failure',SITE_IDS.head],['site-failure',SITE_IDS.branch],['shared-risk',SITE_IDS.head]];
  return required.find(([kind,target])=>!completed.has(`${kind}:${target}`))||null;
 }
 function canOrder(s,customerId,operationId,request={},hooks={},ignoreProjectId=null){
  const missing=[];if(!OPERATION_IDS.includes(operationId))return {eligible:false,missing:['UNKNOWN_OWNED_SITE_OPERATION'],operationId,customerId};
  const c=customerRow(s,customerId),child=c&&childRoot(s,c,hooks);if(!c||!providerScope(s,c,child))return {eligible:false,missing:['VALIDATED_PROVIDER_CUSTOMER_ROOT_REQUIRED'],operationId,customerId};
  if(!['active','renewal'].includes(c.status))missing.push('PROVIDER_CUSTOMER_NOT_ACTIVE');
  const active=(isRecoveryOperation(operationId)?RECOVERY_IDS.flatMap(op=>projectRows(s,c,op)):projectRows(s,c,operationId)).filter(p=>p.id!==ignoreProjectId&&!['cancelled','blocked'].includes(p.status));
  if(active.some(p=>p.status!=='complete'))missing.push('OWNED_SITE_OPERATION_ALREADY_IN_PROGRESS');
  if(operationId==='owned-site-operations'){
   if(operationPaid(s,c,operationId).some(p=>p.id!==ignoreProjectId))missing.push('OWNED_SITE_OPERATIONS_ALREADY_FUNDED');
   const resilience=resilienceInstallation(s,c,child,hooks);if(!resilience.ok)missing.push(...resilience.missing);
   const paidPlan=ignoreProjectId&&projectRows(s,c,operationId).find(p=>p.id===ignoreProjectId);
   try{expectedConfigs(s,c,child,{planned:!!paidPlan});}catch(error){missing.push(String(error.message||'OWNED_SITE_PLAN_UNAVAILABLE'));}
  }else if(operationId==='site-diverse-ingress'){
   const resilience=resilienceInstallation(s,c,child,hooks);if(!resilience.ok)missing.push(...resilience.missing);
   const endpoints=paidEndpointBindings(s,c,child,resilience.ok?resilience:null);if(!endpoints.ok)missing.push(...endpoints.missing);
   if(operationPaid(s,c,operationId).some(p=>p.id!==ignoreProjectId))missing.push('PAID_CALL_INGRESS_ALREADY_FUNDED');
   const names=idsFor(c),transport=child.transport,site=transport?.sites?.[names.ingressTransport];
   if(site&&site.provisioning?.status!=='failed'&&!projectRows(s,c,operationId).some(p=>p.id===ignoreProjectId))missing.push('CALL_INGRESS_ALREADY_CONFIGURED');
  }else{
   const install=operationPaid(s,c,'owned-site-operations').find(p=>p.status==='complete');
   const checked=install&&validateOwnedInstall(s,c,child,install,hooks);if(!checked?.ok)missing.push(...(checked?.missing||['PAID_PROVIDER_OWNED_SITE_OPERATIONS_REQUIRED']));
   if(isRecoveryOperation(operationId)){
    const choice=recoveryChoice(s,c,child,hooks);if(!choice)missing.push('ALL_AUTHORED_SITE_RECOVERIES_COMPLETE');
    if(!exact(request,['kind','targetSite'])||!choice||request.kind!==choice[0]||request.targetSite!==choice[1])missing.push('NEXT_AUTHORED_SITE_RECOVERY_CHOICE_REQUIRED');
    if(child.siteOperations?.exercises?.some(x=>x.status==='active'))missing.push('SITE_RECOVERY_ALREADY_IN_PROGRESS');
    if(Object.values(SITE_IDS).some(siteId=>!ENDPOINTS.some(endpoint=>child.siteOperations?.bindings?.[endpoint.resource]?.site===siteId)))missing.push('SITE_RECOVERY_ENDPOINT_ON_EACH_SITE_REQUIRED');
   }else if(operationId==='site-resource-migration'){
    if(!exact(request,['resourceId','fromSite','toSite'])||!['desk','dedicated-endpoint'].includes(request.resourceId)||!Object.values(SITE_IDS).includes(request.fromSite)||!Object.values(SITE_IDS).includes(request.toSite)||request.fromSite===request.toSite)missing.push('SITE_MIGRATION_SCOPE_REQUIRED');
    else{
     const current=child.siteOperations?.bindings?.[request.resourceId]?.site,to=child.siteOperations?.sites?.[request.toSite];
     if(current!==request.fromSite)missing.push('SITE_MIGRATION_SOURCE_BINDING_MISMATCH');
     if(!to?.effective||!to.effective.endpointResources.includes(request.resourceId))missing.push('SITE_MIGRATION_TARGET_NOT_AUTHORIZED');
     if(projectRows(s,c,operationId).some(p=>p.id!==ignoreProjectId&&p.status==='complete'&&p.config?.resourceId===request.resourceId&&p.config?.fromSite===request.fromSite&&p.config?.toSite===request.toSite))missing.push('SITE_MIGRATION_ITEM_ALREADY_PAID');
    }
   }else if(operationId==='custody-review'){
    if(projectRows(s,c,operationId).some(p=>p.id!==ignoreProjectId&&p.configSubmittedAt!==null&&!['cancelled','blocked'].includes(p.status)))missing.push('OWNED_SITE_CUSTODY_ALREADY_FUNDED');
    const readiness=typeof hooks.custodyReadiness==='function'?hooks.custodyReadiness(s,c,child,request):null;
    if(!readiness||readiness.status!=='ready')missing.push(...(readiness?.missing||['AUTHORIZED_PROCESSED_RECORD_CUSTODY_REQUIRED']));
   }
  }
  return {eligible:missing.length===0,missing:[...new Set(missing)],operationId,customerId};
 }
 function operationPlan(s,customerId,operationId,hooks={}){
  if(!OPERATION_IDS.includes(operationId))fail('PROVIDER_OWNED_SITE_OPERATION_UNKNOWN');
  const c=customerRow(s,customerId);if(!c)fail('PROVIDER_OWNED_SITE_CUSTOMER_MISSING');const child=childRoot(s,c,hooks);if(!providerScope(s,c,child))fail('PROVIDER_OWNED_SITE_SCOPE_REQUIRED');
  const candidates=operationPaid(s,c,operationId,{complete:false}).filter(p=>['running','complete','commissioning'].includes(p.status)),project=candidates.filter(p=>['running','commissioning'].includes(p.status)).at(-1)||candidates.at(-1);if(!project)fail(`PAID_PROVIDER_OPERATION_REQUIRED:${operationId}`);
  const eligibility=canOrder(s,customerId,operationId,project.config||{},hooks,project.id);if(!eligibility.eligible)fail(`PROVIDER_OWNED_SITE_ORDER_BLOCKED:${eligibility.missing.join(',')}`);
  if(['site-diverse-ingress','owned-site-operations'].includes(operationId)&&integer(project.configSubmittedAt))fail('PROVIDER_OWNED_SITE_SETUP_ALREADY_SUBMITTED');
  if(operationId==='site-diverse-ingress'){
   const resilience=resilienceInstallation(s,c,child,hooks);if(!resilience.ok)fail(resilience.missing[0]);const endpoints=paidEndpointBindings(s,c,child,resilience);if(!endpoints.ok)fail(endpoints.missing[0]);
   const names=idsFor(c),site={name:'Provider call ingress',region:child.jurisdiction,domain:names.ingressDomain,powerDomain:`${names.ingressTransport}-power`,backupPowerDomain:null};
   const links=[{id:names.ingressHead,config:{from:names.ingressTransport,to:names.headTransport,mode:'purchased',capacityMbps:20,latencyMs:18,domain:names.ingressHeadDomain,leadMinutes:8,setupCents:0,periodCents:0,contract:null}},{id:names.ingressBranch,config:{from:names.ingressTransport,to:names.branchTransport,mode:'purchased',capacityMbps:20,latencyMs:18,domain:names.ingressBranchDomain,leadMinutes:8,setupCents:0,periodCents:0,contract:null}}];
   const from=resilience.installation.bindings.find(x=>x.resource==='carrier')?.site;if(from!==names.headTransport)fail('PAID_PRIMARY_CARRIER_BINDING_REQUIRED');
   const installedAt=child.clock;
   return {version:VERSION,operationId,projectId:project.id,postingId:project.postingId,customerId,commands:[{type:'transport',command:{action:'site',id:names.ingressTransport,config:site}},...links.map(row=>({type:'transport',command:{action:'link',id:row.id,config:copy(row.config)}})),{type:'transport',command:{action:'bind',resource:'carrier',site:names.ingressTransport}}],provisioningDelayMinutes:8,ingress:{siteId:names.ingressTransport,siteConfig:copy(site),links:copy(links),carrierBinding:{resource:'carrier',from,to:names.ingressTransport}},receiptContract:{kind:'site-diverse-ingress',version:VERSION,projectId:project.id,postingId:project.postingId,customerId,installedAt,siteId:names.ingressTransport,siteGeneration:1,links:links.map(x=>({id:x.id,generation:1})),carrierBinding:{resource:'carrier',from,to:names.ingressTransport,at:installedAt}}};
  }
  if(operationId==='owned-site-operations'){
   const resilience=resilienceInstallation(s,c,child,hooks);if(!resilience.ok)fail(resilience.missing[0]);const cfg=expectedConfigs(s,c,child,{planned:true});
   const commands=cfg.transportBindings.map(row=>({type:'transport',command:{action:'bind',resource:row.resource,site:row.to}})).concat(child.siteOperations?[]:[{type:'site-operations',command:{action:'start'}}],
    ...cfg.resourcePlans.map(row=>({type:'add',id:row.id,kind:row.kind,config:copy(row.config)})),
    {type:'site-operations',command:{action:'site',id:SITE_IDS.head,config:copy(cfg.head.config)}},{type:'site-operations',command:{action:'site',id:SITE_IDS.branch,config:copy(cfg.branch.config)}});
   const activationCommands=[{type:'site-operations',command:{action:'bind',resource:'desk',site:SITE_IDS.head}},{type:'site-operations',command:{action:'bind',resource:'dedicated-endpoint',site:SITE_IDS.branch}}];
   return {version:VERSION,operationId,projectId:project.id,postingId:project.postingId,customerId,commands,activationCommands,provisioningDelayMinutes:1,siteConfigs:{head:copy(cfg.head.config),branch:copy(cfg.branch.config)},resourcePlans:copy(cfg.resourcePlans),transportBindings:copy(cfg.transportBindings),receiptContract:{kind:'provider-owned-sites',version:1,projectId:project.id,postingId:project.postingId,customerId,installedAt:child.clock,siteIds:[SITE_IDS.head,SITE_IDS.branch],resourceIds:copy(RESOURCE_IDS),siteConfigs:{head:copy(cfg.head.config),branch:copy(cfg.branch.config)},transportBindings:copy(cfg.transportBindings)}};
  }
  if(operationId==='site-resource-migration'){
   const cfg=validateOwnedInstall(s,c,child,operationPaid(s,c,'owned-site-operations').find(p=>p.status==='complete'),hooks);if(!cfg.ok)fail(cfg.missing[0]);
   const request=project.config||{};if(!exact(request,['resourceId','fromSite','toSite'])||!['desk','dedicated-endpoint'].includes(request.resourceId)||!Object.values(SITE_IDS).includes(request.fromSite)||!Object.values(SITE_IDS).includes(request.toSite)||request.fromSite===request.toSite)fail('SITE_MIGRATION_SCOPE_REQUIRED');
   const current=child.siteOperations.bindings?.[request.resourceId]?.site;if(current!==request.fromSite)fail('SITE_MIGRATION_SOURCE_BINDING_MISMATCH');
   const migrationId=`migration-${project.id}`;return {version:VERSION,operationId,projectId:project.id,postingId:project.postingId,customerId,commands:[{type:'site-operations',command:{action:'plan',id:migrationId,fromSite:request.fromSite,toSite:request.toSite,resources:[request.resourceId]}},{type:'site-operations',command:{action:'cutover',id:migrationId}}],migration:{id:migrationId,resourceId:request.resourceId,fromSite:request.fromSite,toSite:request.toSite}};
  }
  if(isRecoveryOperation(operationId)){
   const cfg=validateOwnedInstall(s,c,child,operationPaid(s,c,'owned-site-operations').find(p=>p.status==='complete'),hooks);if(!cfg.ok)fail(cfg.missing[0]);
   const request=project.config||{};if(!exact(request,['kind','targetSite'])||!['power','site-failure','shared-risk'].includes(request.kind)||!Object.values(SITE_IDS).includes(request.targetSite))fail('SITE_RECOVERY_SCOPE_REQUIRED');
   const sites=[SITE_IDS.head,SITE_IDS.branch],idValue=`site-exercise-${project.id}`;
   return {version:VERSION,operationId,projectId:project.id,postingId:project.postingId,customerId,commands:[{type:'site-operations',command:{action:'exercise',id:idValue,kind:request.kind,sites,targetSite:request.targetSite}}],workflow:{exerciseId:idValue,steps:['baseline-and-fault','surviving-work','recover-fault','restore-backup','verify-effective-restore','fresh-recovered-work']}};
  }
  if(operationId==='custody-review'){
   const cfg=validateOwnedInstall(s,c,child,operationPaid(s,c,'owned-site-operations').find(p=>p.status==='complete'),hooks);if(!cfg.ok)fail(cfg.missing[0]);
   const readiness=typeof hooks.custodyReadiness==='function'?hooks.custodyReadiness(s,c,child,project):null,evidence=readiness?.candidate;
   if(!readiness||readiness.status!=='ready'||!evidence||!exact(evidence,['version','customerId','recordId','processingJobId','recordProjectId','reviewProjectId','permissionSnapshot','siteId','region','reviewedAt'])||evidence.version!==1||evidence.customerId!==customerId||!Object.values(SITE_IDS).includes(evidence.siteId)||!id(evidence.recordId)||!id(evidence.processingJobId)||!id(evidence.recordProjectId)||!id(evidence.reviewProjectId)||!integer(evidence.reviewedAt)||!['AU','US','JP','EU'].includes(evidence.region))fail('AUTHORIZED_PROCESSED_RECORD_CUSTODY_REQUIRED');
   return {version:VERSION,operationId,projectId:project.id,postingId:project.postingId,customerId,custodyCandidate:copy(evidence),commands:[{type:'information',command:{action:'read',record:evidence.recordId,role:'supervisor',region:evidence.region}}]};
  }
  fail('PROVIDER_OWNED_SITE_OPERATION_UNIMPLEMENTED');
 }
 function migrationProjects(s,c,child,at=s.clock){
  const rows=projectRows(s,c,'site-resource-migration').filter(p=>paidProject(s,c,p,{complete:true})&&p.completedAt<=at);
  return rows.map(project=>{const plan=project.operationReceipt;if(!plan||!exact(plan,['kind','version','projectId','postingId','customerId','migrationId','resourceId','fromSite','toSite','completedAt'])||plan.kind!=='site-resource-migration'||plan.version!==1||plan.projectId!==project.id||plan.postingId!==project.postingId||plan.customerId!==c.id||!integer(plan.completedAt)||plan.completedAt>Math.min(project.completedAt,at)||!exact(project.config,['resourceId','fromSite','toSite'])||project.config.resourceId!==plan.resourceId||project.config.fromSite!==plan.fromSite||project.config.toSite!==plan.toSite)return null;const migration=child.siteOperations?.migrations?.find(m=>m.id===plan.migrationId&&m.phase==='complete'&&m.fromSite===plan.fromSite&&m.toSite===plan.toSite),item=migration?.items?.find(i=>i.resource===plan.resourceId&&i.status==='complete'&&integer(i.at)&&i.at<=at);return migration&&item?{projectId:project.id,postingId:project.postingId,migrationId:migration.id,resourceId:item.resource,fromSite:migration.fromSite,toSite:migration.toSite,completedAt:plan.completedAt,receiptId:item.receiptId}:null;}).filter(Boolean);
 }
 function endpointBindingsAt(s,customerId,child,at){
  const c=customerRow(s,customerId);if(!c||!integer(at,0,s.clock))return null;
  const install=projectRows(s,c,'owned-site-operations').find(p=>paidProject(s,c,p,{complete:true})&&p.completedAt<=at);if(!install)return null;
  const names=idsFor(c),physical=site=>site===SITE_IDS.head?names.headTransport:site===SITE_IDS.branch?names.branchTransport:null;
  const bindings={desk:names.headTransport,'dedicated-endpoint':names.branchTransport};
  for(const migration of migrationProjects(s,c,child,at).sort((a,b)=>a.completedAt-b.completedAt||a.projectId.localeCompare(b.projectId))){
   const from=physical(migration.fromSite),to=physical(migration.toSite);
   if(!from||!to||bindings[migration.resourceId]!==from)return null;
   bindings[migration.resourceId]=to;
  }
  return bindings;
 }
 function pendingMigration(s,c,child,project){
  if(!paidProject(s,c,project,{complete:false})||!['running','commissioning'].includes(project.status)||!integer(project.configSubmittedAt,project.acceptedAt,s.clock)||!exact(project.config,['resourceId','fromSite','toSite'])||!['desk','dedicated-endpoint'].includes(project.config.resourceId)||!Object.values(SITE_IDS).includes(project.config.fromSite)||!Object.values(SITE_IDS).includes(project.config.toSite)||project.config.fromSite===project.config.toSite)return false;
  const receipt=project.operationReceipt;if(!exact(receipt,['kind','version','projectId','postingId','customerId','migrationId','resourceId','fromSite','toSite','completedAt'])||receipt.kind!=='site-resource-migration'||receipt.version!==VERSION||receipt.projectId!==project.id||receipt.postingId!==project.postingId||receipt.customerId!==c.id||receipt.migrationId!==`migration-${project.id}`||receipt.resourceId!==project.config.resourceId||receipt.fromSite!==project.config.fromSite||receipt.toSite!==project.config.toSite||receipt.completedAt!==null)return false;
  const migration=child.siteOperations?.migrations?.find(row=>row.id===receipt.migrationId&&row.fromSite===receipt.fromSite&&row.toSite===receipt.toSite&&['planned','partial','complete'].includes(row.phase));
  const item=migration?.items?.find(row=>row.resource===receipt.resourceId);
  return !!migration&&migration.resources.length===1&&migration.resources[0]===receipt.resourceId&&!!item&&['pending','blocked','complete'].includes(item.status)&&(item.status!=='complete'||id(item.receiptId)&&integer(item.at));
 }
 function recoveryRows(s,c,child,at=s.clock){
  return RECOVERY_IDS.flatMap(operationId=>projectRows(s,c,operationId)).filter(p=>paidProject(s,c,p,{complete:true})&&p.completedAt<=at).map(project=>{const r=project.operationReceipt;if(!r||!exact(r,['kind','version','projectId','postingId','customerId','exerciseId','backupSnapshotId','restoreReceiptId','completedAt'])||r.kind!=='site-recovery'||r.version!==1||r.projectId!==project.id||r.postingId!==project.postingId||r.customerId!==c.id||!integer(r.completedAt)||r.completedAt>Math.min(project.completedAt,at)||!exact(project.config,['kind','targetSite']))return null;const x=child.siteOperations?.exercises?.find(e=>e.id===r.exerciseId&&e.status==='complete'&&e.restoration?.status==='complete'&&e.completion?.ownershipControlled===true&&e.completion?.backup===true&&e.completion?.restore===true&&e.kind===project.config.kind&&e.targetSite===project.config.targetSite);if(!x||r.backupSnapshotId!==x.backupSnapshot.snapshotId||r.restoreReceiptId!==x.restoration.receiptId)return null;return {projectId:project.id,postingId:project.postingId,exerciseId:x.id,kind:x.kind,targetSite:x.targetSite,sites:copy(x.sites),backupSnapshotId:x.backupSnapshot.snapshotId,restoreReceiptId:x.restoration.receiptId,recoveredInteractionId:x.recoveredJourney.interactionId,completedAt:r.completedAt};}).filter(Boolean);
 }
 function pendingRecovery(s,c,child,project){
  if(!paidProject(s,c,project,{complete:false})||!['running','commissioning'].includes(project.status)||!integer(project.configSubmittedAt,project.acceptedAt,s.clock)||!exact(project.config,['kind','targetSite'])||!['power','site-failure','shared-risk'].includes(project.config.kind)||!Object.values(SITE_IDS).includes(project.config.targetSite))return false;
  const receipt=project.operationReceipt;if(!exact(receipt,['kind','version','projectId','postingId','customerId','exerciseId','backupSnapshotId','restoreReceiptId','completedAt'])||receipt.kind!=='site-recovery'||receipt.version!==VERSION||receipt.projectId!==project.id||receipt.postingId!==project.postingId||receipt.customerId!==c.id||receipt.exerciseId!==`site-exercise-${project.id}`||!id(receipt.backupSnapshotId)||receipt.restoreReceiptId!==null&&!id(receipt.restoreReceiptId)||receipt.completedAt!==null)return false;
  const exercise=child.siteOperations?.exercises?.find(row=>row.id===receipt.exerciseId&&row.kind===project.config.kind&&row.targetSite===project.config.targetSite&&row.sites.length===2&&same(row.sites,[SITE_IDS.head,SITE_IDS.branch]));
  if(!exercise||!exercise.backupSnapshot?.snapshotId||receipt.backupSnapshotId!==exercise.backupSnapshot.snapshotId||!['baseline','faulted','restoring','recovered'].includes(exercise.phase))return false;
  if(exercise.restoration===null&&receipt.restoreReceiptId!==null||exercise.restoration&&receipt.restoreReceiptId!==exercise.restoration.receiptId)return false;
  if(exercise.status==='active')return true;
  const hasRealFailure=exercise.baseline?.success===false||exercise.continuity?.some(row=>row.success===false)===true||exercise.recoveredJourney?.success===false;
  return exercise.status==='failed'&&hasRealFailure;
 }
 function validateOwnedInstallPending(s,c,child,project,hooks={}){
  if(!paidProject(s,c,project,{complete:false})||project.operationId!=='owned-site-operations'||!['running','commissioning'].includes(project.status)||!integer(project.configSubmittedAt,project.acceptedAt,s.clock))return {ok:false,missing:['PAID_PROVIDER_OWNED_SITE_OPERATIONS_REQUIRED']};
  const ingress=ingressEvidence(s,c,child);if(!ingress.ok)return ingress;
  const raw=project.operationReceipt,keys=['kind','version','projectId','postingId','customerId','installedAt','siteIds','resourceIds','siteConfigs','transportBindings'];
  if(!exact(raw,keys)||raw.kind!=='provider-owned-sites'||raw.version!==VERSION||raw.projectId!==project.id||raw.postingId!==project.postingId||raw.customerId!==c.id||!integer(raw.installedAt,project.acceptedAt,s.clock)||!same(raw.siteIds,[SITE_IDS.head,SITE_IDS.branch])||!same(raw.resourceIds,RESOURCE_IDS)||!exact(raw.siteConfigs,['head','branch'])||!Array.isArray(raw.transportBindings)||raw.transportBindings.length!==5)return {ok:false,missing:['OWNED_SITE_PENDING_RECEIPT_INVALID']};
  let expected;try{expected=expectedConfigs(s,c,child,{planned:true});}catch(error){return {ok:false,missing:[String(error.message||'OWNED_SITE_PLAN_UNAVAILABLE')]};}
  if(!same(raw.siteConfigs,{head:expected.head.config,branch:expected.branch.config})||raw.transportBindings.some((row,index)=>!exact(row,['resource','from','to','at'])||row.resource!==expected.transportBindings[index]?.resource||row.to!==expected.transportBindings[index]?.to||row.at!==raw.installedAt))return {ok:false,missing:['OWNED_SITE_PENDING_PLAN_MISMATCH']};
  const targets=Object.fromEntries(raw.transportBindings.map(x=>[x.resource,x.to]));if(Object.entries(targets).some(([resource,site])=>child.transport.bindings?.[resource]!==site))return {ok:false,missing:['OWNED_SITE_PENDING_TRANSPORT_BINDING_MISSING']};
  const api=siteApi();if(!child.siteOperations||!api)return {ok:false,missing:['CANONICAL_SITE_OPERATIONS_REQUIRED']};
  try{api.validate(child);}catch{return {ok:false,missing:['CANONICAL_SITE_OPERATIONS_INVALID']};}
  for(const short of ['head','branch']){
   const site=expected[short],node=child.siteOperations.sites?.[site.id];if(!node||!same(node.desired,site.config)||node.effective&&!same(node.effective,site.config)||!['pending','ready','failed'].includes(node.provisioning?.status)||node.provisioning?.generation!==node.generation||node.provisioning.status==='pending'&&node.provisioning.due<=s.clock||node.provisioning.status!=='pending'&&node.provisioning.due>s.clock)return {ok:false,missing:[`OWNED_SITE_PENDING_CONFIGURATION_INVALID:${site.id}`]};
  }
  for(const row of expected.resourcePlans){const resource=child.resources?.[row.id];if(resource?.kind!==row.kind||!same(resource.desired,row.config)||resource.effective&&!same(resource.effective,row.config)||!['pending','ready','failed'].includes(resource.provisioning?.status))return {ok:false,missing:[`OWNED_SITE_PENDING_RESOURCE_INVALID:${row.id}`]};}
  return {ok:true,project,receipt:raw,configs:{head:expected.head,branch:expected.branch},resourcePlans:expected.resourcePlans};
 }
 function ingressReady(s,customerId,projectId,hooks={}){
  const c=customerRow(s,customerId),child=c&&childRoot(s,c,hooks),project=c&&projectRows(s,c,'site-diverse-ingress').find(p=>p.id===projectId);if(!c||!child||!project)return {ready:false,missing:['PAID_DIVERSE_CALL_INGRESS_REQUIRED']};
  const checked=validateIngressProject(s,c,child,project);if(!checked.ok)return {ready:false,missing:copy(checked.missing)};
  const nodes=[checked.site,...checked.links],ready=nodes.every(node=>node.provisioning?.status==='ready'&&node.effective&&node.effectiveGeneration===node.generation);
  const siteId=checked.receipt.siteId,linkIds=checked.receipt.links.map(row=>row.id),graph=transportApi()?.inspect(child),pathReady=!!graph?.siteStatus?.[siteId]&&linkIds.every(idValue=>graph.linkStatus?.[idValue]===true);
  return {ready:ready&&pathReady,missing:!ready?['CALL_INGRESS_PROVISIONING_PENDING']:pathReady?[]:['CALL_INGRESS_PATH_UNAVAILABLE'],siteId,linkIds};
 }
 function activationCommands(customerId){if(!id(customerId))fail('PROVIDER_OWNED_SITES_CUSTOMER_REQUIRED');return [{type:'site-operations',command:{action:'bind',resource:'desk',site:SITE_IDS.head}},{type:'site-operations',command:{action:'bind',resource:'dedicated-endpoint',site:SITE_IDS.branch}}];}
 function ownedSiteReady(s,customerId,projectId,hooks={}){
  const c=customerRow(s,customerId),child=c&&childRoot(s,c,hooks),project=c&&projectRows(s,c,'owned-site-operations').find(p=>p.id===projectId);if(!c||!child||!project)return {ready:false,missing:['PAID_PROVIDER_OWNED_SITE_OPERATIONS_REQUIRED'],activationCommands:[]};
  const checked=validateOwnedInstallPending(s,c,child,project,hooks);if(!checked.ok)return {ready:false,missing:copy(checked.missing),activationCommands:[]};
  const missing=[];for(const short of ['head','branch']){const site=checked.configs[short],node=child.siteOperations.sites?.[site.id];if(!node?.effective||node.provisioning?.status!=='ready'||node.effectiveGeneration!==node.generation||node.observed?.administration!==true||node.observed?.backup!==true||node.observed?.restore!==true)missing.push(`OWNED_SITE_DEPENDENCY_NOT_READY:${site.id}`);}
  for(const row of checked.resourcePlans){const resource=child.resources?.[row.id];if(!resource?.effective||resource.provisioning?.status!=='ready'||!same(resource.effective,row.config))missing.push(`OWNED_SITE_RESOURCE_NOT_READY:${row.id}`);}
  const transport=transportApi(),headPath=transport?.resourcePath(child,'carrier','desk','voice'),branchPath=transport?.resourcePath(child,'carrier','dedicated-endpoint','voice'),names=idsFor(c);
  if(!headPath?.ready||!headPath.edges?.includes(names.ingressHead))missing.push('OWNED_HEAD_CALL_PATH_UNAVAILABLE');
  if(!branchPath?.ready||!branchPath.edges?.includes(names.ingressBranch))missing.push('OWNED_BRANCH_CALL_PATH_UNAVAILABLE');
  return {ready:missing.length===0,missing:[...new Set(missing)],activationCommands:missing.length?[]:activationCommands(customerId)};
 }
 function custodyEvidence(s,c,child,hooks,options={}){
  const api=custodyApi(),projects=projectRows(s,c,'custody-review').filter(p=>paidProject(s,c,p,{complete:true}));for(const project of projects){const r=project.operationReceipt;if(!r||!exact(r,['kind','version','projectId','postingId','customerId','custody','completedAt'])||r.kind!=='custody-review'||r.version!==VERSION||r.projectId!==project.id||r.postingId!==project.postingId||r.customerId!==c.id||!integer(r.completedAt)||r.completedAt>Math.min(project.completedAt,options.at??s.clock)||!api?.validateRead(s,c.id,child,project,r.custody,hooks,{historical:options.historical===true}))continue;return {projectId:project.id,postingId:project.postingId,...copy(r.custody)};}
  return null;
 }
 function missionEvidence(s,c,child,hooks,options={}){
  if(typeof hooks.missionEvidence!=='function')return null;
  const context={historical:options.historical===true,at:options.at??s.clock,evidence:options.evidence?.missions||null},value=hooks.missionEvidence(s,c,child,context);
  if(!value||!exact(value,['version','at','missions','support'])||value.version!==1||!integer(value.at,0,options.at??s.clock)||!Array.isArray(value.missions)||value.missions.length!==4||value.support?.customerId!==c.id)return null;
  const rows=value.missions.slice().sort((a,b)=>String(a?.victory?.scenario).localeCompare(String(b?.victory?.scenario)));
  const expected=['defence','enterprise','government','smb'],proofKeys=['version','eventId','scenario','at','focusCustomerId','winnerCustomerId','qualifiedPeriods','nextStage','periods'];
  if(!same(rows.map(x=>x?.victory?.scenario),expected)||rows.some(x=>{
   if(!exact(x,['customerId','tenant','victory','projectId','postingId'])||!id(x.customerId)||!id(x.tenant)||!id(x.projectId)||!id(x.postingId)||!exact(x.victory,proofKeys))return true;
   const v=x.victory;if(v.version!==1||v.winnerCustomerId!==x.customerId||!['smb','enterprise','government','defence'].includes(v.scenario)||!integer(v.at,0,value.at)||!integer(v.qualifiedPeriods,1)||!Array.isArray(v.periods)||!v.periods.length)return true;
   const owner=customerRow(s,x.customerId),portfolioCustomer=owner&&s.portfolio?.customers?.find(row=>row.id===owner.portfolioId);
   return !portfolioCustomer?.root||portfolioCustomer.root.tenant!==x.tenant||portfolioCustomer.root.providerCustomer?.id!==x.customerId;
  }))return null;
  if(typeof hooks.validateMissionEvidence!=='function'||hooks.validateMissionEvidence(s,c,child,value,context)!==true)return null;
  return copy(value);
 }
 function evaluateCustomer(s,c,hooks={},options={}){
  const child=childRoot(s,c,hooks);if(!providerScope(s,c,child))return {missing:['VALIDATED_PROVIDER_CUSTOMER_ROOT_REQUIRED'],evidence:null};
  const install=operationPaid(s,c,'owned-site-operations').find(p=>p.status==='complete'&&validateOwnedInstall(s,c,child,p,hooks).ok);if(!install)return {missing:['PAID_PROVIDER_OWNED_SITE_OPERATIONS_REQUIRED'],evidence:null};
  const site=siteApi();if(!site)return {missing:['CANONICAL_SITE_OPERATIONS_API_REQUIRED'],evidence:null};
  let assessment;try{assessment=options.historical===true&&options.evidence?.installation?.siteEvidence?null:site.assess(child,hooks.siteOperationsHooks||{});}catch{return {missing:['CANONICAL_SITE_OPERATIONS_EVIDENCE_REQUIRED'],evidence:null};}
  const siteEvidence=options.historical===true&&options.evidence?.installation?.siteEvidence?copy(options.evidence.installation.siteEvidence):{df:copy(assessment?.goals?.df?.evidence||[]),m2:copy(assessment?.goals?.m2?.evidence||[])};
  if(options.historical===true&&options.evidence?.installation?.siteEvidence){for(const [key,sourceId] of [['df',SOURCE.DF],['m2',SOURCE.M2]])if(siteEvidence[key].length&&!site.validateEvidence(child,sourceId,siteEvidence[key]))return {missing:['RETAINED_SITE_OPERATIONS_EVIDENCE_INVALID'],evidence:null};}
  const evidenceAt=options.at??s.clock,recoveries=recoveryRows(s,c,child,evidenceAt),migrations=migrationProjects(s,c,child,evidenceAt),missing=[];
  const recoveryFor=(kind,siteId)=>recoveries.some(x=>x.kind===kind&&x.targetSite===siteId);
  const df=siteEvidence.df.length>0&&recoveries.some(x=>siteEvidence.df.some(e=>e.exercise===x.exerciseId));
  if(!df)missing.push('PAID_ADMINISTRATION_BACKUP_RESTORE_EXERCISE_REQUIRED');
  const m2Evidence=siteEvidence.m2.find(row=>Array.isArray(row.sites)&&same(row.sites.slice().sort(),[SITE_IDS.head,SITE_IDS.branch].slice().sort()));
  const exercises=m2Evidence?.exercises||[];
  const m2=!!m2Evidence&&['head','branch'].every(short=>recoveryFor('power',SITE_IDS[short])&&recoveryFor('site-failure',SITE_IDS[short]))&&recoveryFor('shared-risk',SITE_IDS.head)&&exercises.every(row=>recoveries.some(x=>x.exerciseId===row.id));
  if(!m2)missing.push('INDEPENDENT_POWER_SITE_AND_SHARED_RISK_RECOVERY_REQUIRED');
  const l4=df&&m2&&migrations.length>=2&&migrations.some(x=>x.resourceId==='desk')&&migrations.some(x=>x.resourceId==='dedicated-endpoint');
  if(!l4)missing.push('TWO_ENDPOINT_PER_ITEM_MIGRATIONS_AND_SITE_CONTINUITY_REQUIRED');
  const custody=custodyEvidence(s,c,child,hooks,options),l12=l4&&!!custody&&!!operationPaid(s,c,'custody-review').find(p=>p.id===custody.projectId);
  if(!l12)missing.push('PAID_AUTHORIZED_PROCESSED_RECORD_CUSTODY_READ_REQUIRED');
  const missions=l12?missionEvidence(s,c,child,hooks,options):null,gi=l12&&!!missions;
  if(!gi)missing.push('FOUR_VALIDATED_PROVIDER_SCENARIO_VICTORIES_AND_PAID_SUPPORT_REQUIRED');
  const facts={kind:'provider-owned-sites',version:VERSION,customerId:c.id,portfolioId:c.portfolioId,tenant:child.tenant,market:c.market||null,asOf:options.at??s.clock,installation:{projectId:install.id,postingId:install.postingId,siteIds:[SITE_IDS.head,SITE_IDS.branch],siteEvidence},recoveries,migrations,custody:custody?copy(custody):null,missions:missions?copy(missions):null};
  const goals={df:!!df,m2:!!m2,l4:!!l4,l12:!!l12,gi:!!gi};
  return {missing:[...new Set(missing)],facts,goals,status:!missing.length?'ready':'incomplete'};
 }
 function evaluate(s,hooks={}){
  if(!s||s.experience?.version!==1||s.experience.kind!=='campaign'||s.experience.custom!==false||s.providerCampaign?.pack!=='soc-provider-campaign-1')fail('PROVIDER_OWNED_SITES_CAMPAIGN_REQUIRED');
  const goals={};for(const [sourceId,key] of [[SOURCE.DF,'df'],[SOURCE.M2,'m2'],[SOURCE.L4,'l4'],[SOURCE.L12,'l12'],[SOURCE.GI,'gi']]){
   const rows=[];const missing=[];for(const c of s.providerCampaign.customers||[]){if(!['active','renewal'].includes(c.status))continue;const result=evaluateCustomer(s,c,hooks);if(result.facts&&result.goals?.[key])rows.push(result);missing.push(...result.missing);}
   const picked=rows.sort((a,b)=>a.facts.asOf-b.facts.asOf||a.facts.customerId.localeCompare(b.facts.customerId))[0]||null;
   const positive=!!picked&&picked.goals[key]===true;
   goals[sourceId]={id:sourceId,status:positive?'ready':'incomplete',missing:positive?[]:[...new Set(missing.length?missing:['PAID_PROVIDER_OWNED_SITE_OPERATIONS_REQUIRED'])],evidence:positive?copy(picked.facts):null};
  }
  return {pack:PACK,version:VERSION,asOf:s.clock,goals};
 }
 function validateEvidence(s,sourceId,customerId,evidence,hooks={},options={}){
  if(!Object.values(SOURCE).includes(sourceId)||!id(customerId)||!evidence||evidence.kind!=='provider-owned-sites'||evidence.version!==VERSION||evidence.customerId!==customerId)return false;
  const c=customerRow(s,customerId);if(!c||evidence.portfolioId!==c.portfolioId||evidence.tenant!==childRoot(s,c,hooks)?.tenant)return false;
  const at=options.historical===true?evidence.asOf:(options.at??s.clock);
  const current=evaluateCustomer(s,c,hooks,{historical:options.historical===true,at,evidence:options.historical===true?evidence:null});if(!current.facts)return false;
  if(!same(current.facts,evidence))return false;
  const key=sourceId===SOURCE.DF?'df':sourceId===SOURCE.M2?'m2':sourceId===SOURCE.L4?'l4':sourceId===SOURCE.L12?'l12':'gi';
  const required=current.facts.asOf===evidence.asOf&&current.goals?.[key]===true;
  return required;
 }
 function validateCustomer(s,customerId,child,hooks={}){
  const c=customerRow(s,customerId);if(!c||!providerScope(s,c,child))fail('PROVIDER_OWNED_SITES_CUSTOMER_SCOPE_REQUIRED');
  const ingressProjects=projectRows(s,c,'site-diverse-ingress').filter(p=>integer(p.configSubmittedAt)&&!['cancelled','blocked'].includes(p.status));
  if(ingressProjects.length>1)fail('DUPLICATE_PROVIDER_CALL_INGRESS_PROJECT');
  if(ingressProjects.length){const project=ingressProjects[0],checked=validateIngressProject(s,c,child,project);if(!checked.ok)fail(checked.missing[0]);}
  const siteOperationsIds=OPERATION_IDS.filter(op=>op!=='site-diverse-ingress'),projects=siteOperationsIds.flatMap(op=>projectRows(s,c,op).filter(p=>integer(p.configSubmittedAt)&&!['cancelled','blocked'].includes(p.status)));
  if(!child.siteOperations){if(projects.length)fail('PROVIDER_SITE_OPERATIONS_MARKER_REQUIRED');return true;}
  const install=operationPaid(s,c,'owned-site-operations').find(p=>p.status==='complete');
  if(!install){const pending=operationPaid(s,c,'owned-site-operations',{complete:false}).find(p=>['running','commissioning'].includes(p.status));if(pending){const result=validateOwnedInstallPending(s,c,child,pending,hooks);if(result.ok)return true;fail(result.missing[0]);}fail('UNFUNDED_PROVIDER_SITE_OPERATIONS');}
  const checked=validateOwnedInstall(s,c,child,install,hooks,{allowPaidPlatformMigrationTransition:true});if(!checked.ok)fail(checked.missing[0]);
  for(const p of projectRows(s,c,'site-resource-migration').filter(x=>x.configSubmittedAt!==null&&!['cancelled','blocked'].includes(x.status)))if(p.status==='complete'?!migrationProjects(s,c,child).some(row=>row.projectId===p.id):!pendingMigration(s,c,child,p))fail('INVALID_PROVIDER_SITE_MIGRATION_LINEAGE');
  for(const p of RECOVERY_IDS.flatMap(op=>projectRows(s,c,op)).filter(x=>x.configSubmittedAt!==null&&!['cancelled','blocked'].includes(x.status)))if(p.status==='complete'?!recoveryRows(s,c,child).some(row=>row.projectId===p.id):!pendingRecovery(s,c,child,p))fail('INVALID_PROVIDER_SITE_RECOVERY_LINEAGE');
  for(const p of projectRows(s,c,'custody-review').filter(x=>x.configSubmittedAt!==null&&!['cancelled','blocked'].includes(x.status))){
   const r=p.operationReceipt,api=custodyApi();
   if(!['running','commissioning','complete'].includes(p.status)||!exact(r,['kind','version','projectId','postingId','customerId','custody','completedAt'])||r.kind!=='custody-review'||r.version!==VERSION||r.projectId!==p.id||r.postingId!==p.postingId||r.customerId!==c.id||!integer(r.completedAt,p.acceptedAt,s.clock)||p.status==='complete'&&r.completedAt>p.completedAt||!api?.validateRead(s,c.id,child,p,r.custody,hooks,{historical:p.status==='complete'}))fail('INVALID_PROVIDER_CUSTODY_LINEAGE');
  }
  return true;
 }
 function inspect(s,customerId,hooks={}){
  const c=customerRow(s,customerId);if(!c)return null;const child=childRoot(s,c,hooks);if(!providerScope(s,c,child))return {version:VERSION,customerId,status:'unavailable',missing:['VALIDATED_PROVIDER_CUSTOMER_ROOT_REQUIRED'],sites:[],goals:{}};
  const api=siteApi(),assessment=child.siteOperations&&api?.inspect(child,hooks.siteOperationsHooks||{}),result=evaluateCustomer(s,c,hooks);
  return {version:VERSION,customerId,status:result.status||'incomplete',missing:copy(result.missing||[]),sites:assessment?.sites||[],bindings:assessment?.bindings||{},migrations:assessment?.migrations||[],exercises:assessment?.exercises||[],goals:assessment?.goals||{},evidence:result.facts?copy(result.facts):null};
 }
 function actionDescriptors(s,customerId,requests={},hooks={}){
  return OPERATION_IDS.map(idValue=>{const request=requests[idValue]||{},eligibility=canOrder(s,customerId,idValue,request,hooks);return {id:idValue,available:eligibility.eligible,blockers:copy(eligibility.missing),terms:copy(TERMS[idValue]),request:copy(request)};});
 }
 function installCommands(s,customerId,hooks={}){return operationPlan(s,customerId,'owned-site-operations',hooks);}
 function source(){return 'const SOC_PROVIDER_OWNED_SITES=('+socProviderOwnedSitesKernel.toString()+')();'}
 const api={PACK,VERSION,SOURCE,OPERATION_IDS,RECOVERY_IDS,isRecoveryOperation,TERMS,SITE_IDS,RESOURCE_IDS,ENDPOINTS,idsFor,expectedConfigs,canOrder,operationPlan,plan:operationPlan,installCommands,actionDescriptors,ingressReady,ownedSiteReady,activationCommands,endpointBindingsAt,platformMigrationTransition,platformMigrationTransitions,evaluate,validateEvidence,validateCustomer,inspect,source};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 return api;
}
const SOC_PROVIDER_OWNED_SITES=socProviderOwnedSitesKernel();
