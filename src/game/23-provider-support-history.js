/* Reconstruct one retained Provider support participant at its recorded minute. */
function socProviderSupportHistoryKernel(){
 'use strict';
 const VERSION=1;
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const integer=x=>Number.isSafeInteger(x)&&x>=0;
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const unsupported=code=>({status:'unsupported',missing:[code],participant:null});
 function workforceApi(){return typeof SOC_PROVIDER_WORKFORCE_HISTORY!=='undefined'?SOC_PROVIDER_WORKFORCE_HISTORY:require('./23-provider-workforce-history.js');}
 function configurationApi(){return typeof SOC_PROVIDER_CONFIGURATION_AUTHORITY!=='undefined'?SOC_PROVIDER_CONFIGURATION_AUTHORITY:require('./23-provider-configuration-authority.js');}
 function governmentApi(){return typeof SOC_GOVERNMENT_ARCHITECTURES!=='undefined'?SOC_GOVERNMENT_ARCHITECTURES:(typeof require==='function'?require('./23-provider-government.js'):null);}
 function productsApi(){return typeof SOC_PRODUCTS!=='undefined'?SOC_PRODUCTS:(typeof require==='function'?require('./45-products.js'):null);}
 function integrationHistoryApi(){return typeof SOC_PROVIDER_REGIONAL_INTEGRATIONS!=='undefined'?SOC_PROVIDER_REGIONAL_INTEGRATIONS:require('./23-provider-regional-integrations.js');}
 function ownedSiteApi(){return typeof SOC_PROVIDER_OWNED_SITES!=='undefined'?SOC_PROVIDER_OWNED_SITES:(typeof require==='function'?require('./23-provider-owned-sites.js'):null);}
 function customerRoot(s,c,hooks){return typeof hooks.customerRoot==='function'?hooks.customerRoot(s,c):s.portfolio?.customers?.find(row=>row.id===c.portfolioId)?.root||null;}
 function customerStatusAt(s,c,at){
  if(at<c.startedAt||c.activatedAt===null||at<c.activatedAt)return 'provisioning';
  let status='active';const events=(s.providerCampaign.events||[]).filter(event=>event.customerId===c.id&&event.at<=at).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
  for(const event of events){if(event.code==='CUSTOMER_SERVICE_ACTIVE')status='active';else if(event.code==='CUSTOMER_RENEWAL_OFFERED')status='renewal';else if(event.code==='CUSTOMER_RENEWED'&&event.at<at)status='active';else if(['CUSTOMER_RENEWAL_REFUSED','CUSTOMER_EXITED','CUSTOMER_FAILED_CONSECUTIVE_PERIODS'].includes(event.code)&&event.at<at)status='exited';}
  // Samples are produced at the end of a clock advance; player commands at
  // that same displayed minute happen afterward and belong to the next sample.
  if(c.exitAt!==null&&c.exitAt!==undefined&&c.exitAt<at)status='exited';return status;
 }
 function retailAgreementAt(s,c,at){
  const agreement=c.retailAgreement;if(!agreement||!integer(agreement.at)||!integer(agreement.priceCents))return null;
  if(agreement.at<at)return {acceptedAt:agreement.at,priceCents:agreement.priceCents};
  const prior=(c.history||[]).filter(row=>integer(row.from)&&integer(row.to)&&row.from<at&&at<=row.to).at(-1);
  if(!prior||!Number.isSafeInteger(prior.activeMinutes)||prior.activeMinutes<1||!integer(prior.grossRetail))return null;
  let price=null;if(prior.fullPeriod===true)price=prior.grossRetail;else{const min=Math.ceil(prior.grossRetail*60/prior.activeMinutes),max=Math.ceil((prior.grossRetail+1)*60/prior.activeMinutes)-1;if(min===max)price=min;}
  if(!integer(price)||price<1)return null;
  const renewed=(s.providerCampaign.events||[]).filter(event=>event.customerId===c.id&&event.code==='CUSTOMER_RENEWED'&&event.at<at).at(-1);
  return {acceptedAt:renewed?.at??c.customerAcceptedAt??c.startedAt,priceCents:price};
 }
 function paidStaffAt(s,at){
  const history=s.providerCampaign.workforceHistory;if(!history||!integer(history.startedAt))return false;
  const periodStart=Math.max(history.startedAt,Math.floor(at/60)*60),previousStart=Math.max(history.startedAt,periodStart-60),hourlyCents=s.business?.workforce?.hourlyCents;
  let before,after;try{before=workforceApi().at(history,previousStart);after=workforceApi().at(history,periodStart);}catch{return false;}
  const quantity=after.personMinutes-before.personMinutes,cents=Math.floor(after.personMinutes*hourlyCents/60)-Math.floor(before.personMinutes*hourlyCents/60),row=(s.business?.ledger||[]).find(entry=>entry.reason==='staff'&&entry.category==='cost'&&entry.at===periodStart&&entry.unit==='person-minute'&&integer(entry.quantity)&&entry.quantity>0&&entry.quantity===quantity&&integer(hourlyCents)&&entry.cents===cents);
  return !!row&&quantity>0&&cents>0;
 }
 function logicalPlacementStateAt(s,c,root,at,hooks){
  const operations=root.operations;if(!operations)return {topology:{},resources:[]};
  const migrations=operations.migrations||[],tasks=root.providerTasks||[];
  if(!Array.isArray(migrations)||!Array.isArray(tasks))return null;
  if(!migrations.length){const placements=operations.placements||{};if(!placements||typeof placements!=='object'||Array.isArray(placements)||Object.keys(placements).some(identity=>!['alex','bea'].includes(identity))||Object.values(placements).some(resource=>resource!=='phone'))return null;return {topology:{},resources:[]};}
  const identities=new Set(['alex','bea']),replayed=Object.create(null),sampled=Object.create(null);
  for(const identity of identities){replayed[identity]='phone';sampled[identity]='phone';}
  for(const migration of migrations)for(const identity of migration.identities||[])if(!identities.has(identity))return null;
  const entries=[];
  for(const migration of migrations){
   // Scheduled and verifying migrations are present/future operations. They
   // do not alter the placement represented by an earlier sample; Provider
   // root validation separately checks their live task lineage.
   if(migration?.status!=='complete')continue;
   if(!integer(migration.cutoverAt)||!integer(migration.verifyAt)||!Array.isArray(migration.identities)||!migration.identities.length||new Set(migration.identities).size!==migration.identities.length)return null;
   const task=tasks.find(row=>row.migrationId===migration.id&&row.kind==='migration'&&row.status==='submitted');if(!task||!integer(task.createdAt))return null;
   const operationId=task.mode==='consolidated'?'migration-consolidated':task.mode==='product-dedicated'?'cisco-dedicated-uc':task.mode===undefined?'migration':null;
   const project=s.providerCampaign.projects.find(row=>row.customerId===c.id&&row.operationId===operationId&&row.configSubmittedAt===task.createdAt+1&&row.kind==='operation');if(!project||project.configSubmittedAt===null||project.status==='complete'&&!paidProject(s,project,hooks))return null;
   const expected=task.mode==='consolidated'?{identities:['alex','bea'],target:'phone'}:task.mode==='product-dedicated'?{identities:['alex'],target:'dedicated-platform'}:{identities:['bea'],target:'migration-phone'};
   if(migration.target!==expected.target||!same(migration.identities,expected.identities)||task.createdAt<migration.cutoverAt-1440||task.createdAt>migration.cutoverAt)return null;
   const previous=migration.previousPlacements;
   if(!previous||typeof previous!=='object'||Array.isArray(previous)||Object.keys(previous).sort().join(',')!==expected.identities.slice().sort().join(','))return null;
   const endpointRows=Object.values(root.resources||{}).filter(resource=>resource.kind==='endpoint'&&expected.identities.includes(resource.desired?.identity));
   if(!endpointRows.length||!migration.checkpoint||typeof migration.checkpoint!=='object'||Array.isArray(migration.checkpoint)||Object.keys(migration.checkpoint).sort().join(',')!==endpointRows.map(row=>row.id).sort().join(',')||endpointRows.some(resource=>{const saved=migration.checkpoint[resource.id];return !saved||!integer(saved.generation)||saved.generation<1||saved.generation>resource.generation||saved.desired?.identity!==resource.desired.identity;}))return null;
   if(migration.status==='rolled-back')return null;
   if(migration.status==='complete'){
    if(project.status!=='complete'||!integer(project.completedAt)||project.completedAt<migration.verifyAt||migration.verifyAt!==migration.cutoverAt+1)return null;
   }else if(migration.status==='verifying'&&migration.verifyAt<=root.clock)return null;
   entries.push({migration,task,project,expected});
  }
  entries.sort((a,b)=>a.task.createdAt-b.task.createdAt||a.migration.cutoverAt-b.migration.cutoverAt||a.migration.id.localeCompare(b.migration.id));
  for(const row of entries){
   const {migration,task,expected}=row;
   if(expected.identities.some(identity=>migration.previousPlacements[identity]!==replayed[identity]))return null;
   if(migration.status==='complete'&&migration.verifyAt<=root.clock)for(const identity of expected.identities)replayed[identity]=expected.target;
   if(migration.status==='complete'&&migration.verifyAt<=at)for(const identity of expected.identities)sampled[identity]=expected.target;
  }
  const placements=operations.placements||{};
  if(Object.keys(placements).some(identity=>!identities.has(identity))||[...identities].some(identity=>(placements[identity]||'phone')!==replayed[identity]))return null;
  const topology=Object.fromEntries(Object.entries(sampled).filter(([,resource])=>resource!=='phone'));
  return {topology,resources:Object.values(topology)};
 }
 function logicalPlacementsAt(s,c,root,at,hooks){const result=logicalPlacementStateAt(s,c,root,at,hooks);return result?.resources??null;}
 function baseResourceObservationAt(s,c,root,resourceId,at,plan,hooks){
  if(!plan||!plan.config||!integer(plan.generation))return null;
  const provenanceFor=(id,generation)=>{
   let value;try{value=hooks.configurationProvenanceAt(s,c,root,id,at);}catch{return false;}
   return !!value&&value.version===1&&value.resourceId===id&&value.at===at&&value.generation===generation&&Array.isArray(value.writes)&&value.writes.every(write=>write&&typeof write.projectId==='string'&&integer(write.at)&&integer(write.generation)&&write.at<=at);
  };
  if(!provenanceFor(resourceId,plan.generation))return null;
  const migrationOwnsGeneration=(p,id,generation)=>{
   if(p.customerId!==c.id||p.status!=='complete'||p.completedAt>at)return false;
   if(id==='migration-phone'&&p.operationId==='migration'&&generation===1)return (root.operations?.migrations||[]).some(m=>m.status==='complete'&&m.verifyAt<=at&&m.target==='migration-phone'&&(root.providerTasks||[]).some(task=>task.kind==='migration'&&task.status==='submitted'&&task.migrationId===m.id&&task.mode===undefined&&task.createdAt+1===p.configSubmittedAt));
   return (root.operations?.migrations||[]).some(m=>m.status==='complete'&&m.verifyAt<=at&&m.appliedGenerations?.[id]===generation&&(root.providerTasks||[]).some(task=>task.kind==='migration'&&task.status==='submitted'&&task.migrationId===m.id&&task.createdAt+1===p.configSubmittedAt));
  };
  const provenanceOwnsGeneration=(p,id,generation)=>{let value;try{value=hooks.configurationProvenanceAt(s,c,root,id,at);}catch{return false;}return value?.writes?.some(write=>write.projectId===p.id&&write.generation===generation&&write.at<=at)===true;};
  const migrationPending=(id,generation)=>(root.operations?.migrations||[]).some(migration=>['verifying','complete'].includes(migration.status)&&integer(migration.cutoverAt)&&integer(migration.verifyAt)&&migration.cutoverAt<=at&&migration.verifyAt>at&&migration.appliedGenerations?.[id]===generation&&(root.providerTasks||[]).some(task=>{
   const operation=task?.mode==='consolidated'?'migration-consolidated':task?.mode==='product-dedicated'?'cisco-dedicated-uc':'migration',project=s.providerCampaign.projects.find(row=>row.customerId===c.id&&row.operationId===operation&&row.configSubmittedAt===task.createdAt+1);
   return task?.kind==='migration'&&task.status==='submitted'&&task.migrationId===migration.id&&!!project;
  }));
  const ownsGeneration=(p,id,generation)=>p.customerId===c.id&&p.configSubmittedAt!==null&&p.configSubmittedAt!==undefined&&p.configSubmittedAt<=at&&!['cancelled','blocked'].includes(p.status)&&(p.expectedGenerations?.[id]===generation||p.serviceRetirement?.effectiveAt<=at&&p.serviceRetirement.expectedGenerations?.[id]===generation||migrationOwnsGeneration(p,id,generation)||provenanceOwnsGeneration(p,id,generation));
  const projectOwnsGeneration=p=>ownsGeneration(p,resourceId,plan.generation);
  const projects=s.providerCampaign.projects.filter(projectOwnsGeneration),effective=plan.config.enabled===true&&projects.length>0;
  const timeline=serviceFaultTimelineAt(s,c,root,at);if(!timeline.valid)return null;
  const disconnected=!timeline.connected;
  const linkFields={uc:{directory:'directory',connectivity:'connectivity'},dedicated:{directory:'directory',connectivity:'connectivity'},queue:{workforce:'workforce'},workflow:{channel:'channel',queue:'queue',crm:'crm'},room:{directory:'directory'},recorder:{archive:'archive'}};
  const observations=Object.create(null),visiting=new Set();
  function ready(id){
   if(observations[id]!==undefined)return observations[id];if(visiting.has(id))return false;visiting.add(id);
   let config,generation,paid=false;
   try{const value=id===resourceId?plan:hooks.configurationAt(s,c,root,id,at);config=value?.config;generation=value?.generation;paid=!!value&&projectsFor(id,generation).length>0;}catch{config=null;}
   const row=root.resources?.[id],kind=row?.kind,activeFault=timeline.faults[id]!==null;
   let value=!!config?.enabled&&paid&&!activeFault&&!(hooks._allowPendingMigration!==true&&migrationPending(id,generation));
   if(disconnected&&!config?.local)value=false;
   if(id==='local'&&disconnected&&root.providerContinuity){
    const deployment=s.providerCampaign.projects.find(p=>p.customerId===c.id&&p.operationId==='local-deployment'&&p.configSubmittedAt<=at&&p.operationReceipt?.at===root.providerContinuity.installedAt),spares=s.providerCampaign.projects.find(p=>p.customerId===c.id&&['local-spares','managed-local-spares'].includes(p.operationId)&&p.configSubmittedAt!==null&&p.configSubmittedAt<=at&&p.operationReceipt?.projectId===p.id&&p.operationReceipt?.postingId===p.postingId);
    const start=deployment&&integer(timeline.outageStartedAt)?Math.max(timeline.outageStartedAt,deployment.operationReceipt.at):null;
    if(start!==null&&at-start>=(spares?60:30))value=false;
   }
   if(disconnected&&['uc','dedicated','directory','room','processor','trunk'].includes(kind)){
    const local=hooks.configurationAt(s,c,root,'local',at)?.config;
    if(!local||!['identity','dns','time','certificates','licensing'].every(k=>local[k])||!ready('local'))value=false;
    if(kind==='processor'&&!config?.licenceLocal)value=false;
   }
   if(kind&&linkFields[kind])for(const [field] of Object.entries(linkFields[kind]))if(!config?.[field]||!ready(config[field]))value=false;
   visiting.delete(id);observations[id]=value;return value;
  }
  function projectsFor(id,generation){return s.providerCampaign.projects.filter(p=>ownsGeneration(p,id,generation));}
  const available=ready(resourceId),wasEffective=effective&&(!disconnected||plan.config.local);
  const productReady=hooks._skipProductGate===true?true:providerProductFeatureReadyAt(s,c,root,resourceId,at,hooks);
  return {effective:wasEffective,generation:wasEffective?plan.generation:null,ready:available&&productReady};
 }
 function providerProductFeatureReadyAt(s,c,root,resourceId,at,hooks,target=null){
  const pack=root.products;if(!pack)return target?{ready:false}:true;
  const api=productsApi();if(!api||pack.pack!==api.PACK||!Array.isArray(pack.deployments)||!Array.isArray(pack.offers))return false;
  const recipeId=id=>typeof id==='string'&&id.startsWith('d-')?id.slice(2):'';
  const providerProject=deployment=>{
   const rid=recipeId(deployment.id);if(!rid)return null;
   // Recommission replaces the single live task row, while paid operation
   // receipts retain each earlier deployment generation. Rebuild from those
   // paid order anchors, not today's mutable task timestamp.
   const project=s.providerCampaign.projects.filter(row=>row.customerId===c.id&&row.productId===rid&&row.kind==='operation'&&row.operationReceipt?.kind==='product'&&row.operationReceipt.recipeId===rid&&integer(row.operationReceipt.at)&&row.configSubmittedAt===row.operationReceipt.at+1&&row.operationReceipt.at<at&&paidProductProject(s,row)).sort((a,b)=>a.operationReceipt.at-b.operationReceipt.at||a.id.localeCompare(b.id)).at(-1);
   return project||null;
  };
  const snapshotAt=(deployment,project,commissionedAt)=>{
   if(commissionedAt===null)return null;
   const receipt=project.operationReceipt,reinstate=receipt.reinstated===true;
   let firstAt=commissionedAt??project.configSubmittedAt+1;
   const firstGeneration=reinstate?receipt.generation:1;
   if(reinstate){if(!integer(receipt.at)||!integer(receipt.generation,1)||!integer(project.configSubmittedAt)||project.configSubmittedAt!==receipt.at+1)return null;firstAt=Math.max(firstAt,receipt.at+1);}
   const history=(deployment.effectiveHistory||[]).filter(row=>row.generation>=firstGeneration);
   if(!Array.isArray(history))return null;
   const rows=[];let previousAt=firstAt-1;
   for(const h of history){
    if(!h||!integer(h.at)||!integer(h.generation)||!h.effective||h.at<previousAt)return null;
    const start=rows.length?previousAt+1:firstAt;rows.push({config:h.effective,generation:h.generation,from:start,through:h.at});previousAt=h.at;
   }
   const sameCurrent=deployment.effective&&deployment.provisioning?.status==='ready'&&deployment.provisioning.generation===deployment.generation&&same(deployment.effective,deployment.desired);
   if(sameCurrent){
    const from=rows.length?previousAt+1:firstAt;
    rows.push({config:deployment.effective,generation:deployment.generation,from:Math.max(from,deployment.provisioning.due),through:Number.MAX_SAFE_INTEGER});
   }
   return rows.find(row=>row.from<=at&&at<=row.through)||null;
  };
  const rawDependencyReady=(name,id,when=at,context={})=>{
   if(typeof id!=='string')return false;
   if(name==='language-model'||name==='integration-version'){
    const speech=root.speechModels;
    if(speech?.pack!=='soc-speech-models-1'||!Array.isArray(speech.installations)||!Array.isArray(speech.integrationTests)||context.family!=='cisco:local-speech')return false;
    const installations=speech.installations.filter(row=>row?.provisioning?.status==='ready'&&row.effective&&row.desired?.deploymentId===context.deploymentId&&row.desired?.deploymentGeneration===context.generation&&row.desired?.productVersion===context.productVersion&&row.desired?.offerId===context.offer&&row.desired?.mode===context.mode&&row.desired?.region===context.region&&(name!=='language-model'||row.desired?.modelResourceId===id)&&(name!=='integration-version'||row.desired?.integrationResourceId===id)&&row.effective.deploymentId===context.deploymentId&&row.effective.deploymentGeneration===context.generation&&row.effective.productVersion===context.productVersion&&row.effective.offerId===context.offer&&row.effective.mode===context.mode&&row.effective.region===context.region&&integer(row.effective.installedAt)&&row.effective.installedAt<=when&&integer(row.provisioning.due)&&row.provisioning.due<=when&&row.effective.modelId===row.desired.modelId&&row.effective.modelVersion===row.desired.modelVersion);
    if(name==='language-model')return installations.length>0;
    return installations.some(install=>speech.integrationTests.some(test=>test?.installationId===install.id&&test.provisioning?.status==='ready'&&test.effective&&test.deploymentId===context.deploymentId&&test.deploymentGeneration===context.generation&&test.productVersion===context.productVersion&&test.offerId===context.offer&&test.region===context.region&&test.effective.installationId===install.id&&test.effective.deploymentId===context.deploymentId&&test.effective.deploymentGeneration===context.generation&&test.effective.productVersion===context.productVersion&&test.effective.offerId===context.offer&&test.effective.region===context.region&&test.effective.integrationId===test.integrationId&&test.effective.integrationVersion===test.integrationVersion&&integer(test.effective.verifiedAt)&&test.effective.verifiedAt<=when&&integer(test.provisioning.due)&&test.provisioning.due<=when));
   }
   if(name.endsWith('-evidence')){
    const evidence=root.productEvidence;if(!evidence)return false;
    return (evidence.requests||[]).some(row=>{
     const scope=row?.desired,proof=row?.effective;
     if(!scope||scope.dependency!==name||scope.resourceId!==id||scope.deploymentId!==context.deploymentId||scope.feature!==context.feature||scope.family!==context.family||scope.productVersion!==context.productVersion||scope.mode!==context.mode||scope.region!==context.region||scope.deploymentGeneration!==context.generation||row.provisioning?.status!=='ready'||!proof||proof.generation!==row.generation||proof.issuedAt>when||proof.expiresAt<=when||row.revokedAt!==null&&row.revokedAt<=when)return false;
     const resource=hooks.configurationAt(s,c,root,id,when);return resource?.generation===scope.resourceGeneration;
    });
   }
   if(!root.resources?.[id])return false;
   const resource=root.resources[id];
   const config=hooks.configurationAt(s,c,root,id,when);if(!config?.config)return false;
   if(name==='calendar'&&!config.config.calendar)return false;
   if(name==='capture-permission'&&(!config.config.consent||!config.config.identityMapping))return false;
   if(name==='workforce'&&(!config.config.people||!config.config.entitlements))return false;
   if(name==='crm'&&!config.config.identityMapping)return false;
   if(name==='licensing-service'&&!config.config.licensing)return false;
   if(name==='channel-supplier'&&!config.config.approved)return false;
   // Match the Provider observer: product dependencies use the underlying
   // resource observation and feature-specific checks, not another product gate.
   const dependencyPlan=hooks.configurationAt(s,c,root,id,when),observed=baseResourceObservationAt(s,c,root,id,when,dependencyPlan,{...hooks,_skipProductGate:true});
   return observed?.ready===true;
  };
  const historicalPack=copy(pack);
  for(const offer of historicalPack.offers){
   const changedAt=offer.effectiveLifecycle?.changedAt;
   // Offer support is an effective dependency, while sale lifecycle only
   // controls whether a new deployment can be ordered. Since support cannot
   // be restored after it ends, a later lifecycle change implies the authored
   // initial supported/available state for earlier samples.
   if(integer(changedAt)&&changedAt>at)offer.effectiveLifecycle={sale:'available',support:'supported',changedAt:0};
  }
  const lifecycleAt=(offer,when)=>{const life=offer?.effectiveLifecycle;if(!life)return null;return integer(life.changedAt)&&life.changedAt>when?{sale:'available',support:'supported',changedAt:0}:life;};
  const firstCommissionedAt=(deployment,project,config)=>{
   const taskCreatedAt=project.operationReceipt.at;
   if(!integer(taskCreatedAt)||taskCreatedAt>=at)return null;
   const firstGeneration=project.operationReceipt.reinstated===true?project.operationReceipt.generation:1;
   const origin=project.operationReceipt.reinstated===true?Math.max(taskCreatedAt,project.operationReceipt.at):taskCreatedAt;
   let due=origin+(project.operationReceipt.reinstated===true?1:2);
   const attemptPack=copy(historicalPack),attempt=attemptPack.deployments.find(row=>row.id===deployment.id),attemptOffer=attemptPack.offers.find(row=>row.id===config.offer);
   if(!attempt||!attemptOffer)return null;
   attempt.desired=copy(config);attempt.effective=copy(config);attempt.retirement=null;attempt.provisioning={status:'ready',due,generation:firstGeneration,errors:[]};
   for(let tries=0;tries<100&&due<=at;tries++){
    const lifecycle=lifecycleAt(attemptOffer,due);attemptOffer.effectiveLifecycle=copy(lifecycle);
    let ready=!!lifecycle&&lifecycle.sale==='available'&&lifecycle.support==='supported';
    if(ready)for(const feature of config.features){const result=api.featureStatus(attemptPack,deployment.id,feature,{observeDependency:(_state,name,ref,context)=>rawDependencyReady(name,ref,due,context)?{ready:true}:false});if(!result.available){ready=false;break;}}
    if(ready)return due;
    const retryAt=taskCreatedAt+(Math.floor((due-taskCreatedAt)/5)+1)*5;
    due=retryAt+1;
   }
   return null;
  };
  let requested=null;
  for(const deployment of pack.deployments){
   if(target&&deployment.id!==target.deploymentId)continue;
   const project=providerProject(deployment);if(!project)continue;
   const historical=historicalPack.deployments.find(row=>row.id===deployment.id),offer=historicalPack.offers.find(row=>row.id===deployment.desired?.offer);if(!historical||!offer)return false;
   // A deployment's live provisioning status may now be ready even though a
   // retained sample predates its due minute. For an initial deployment with
   // no effective history, the paid task and authored due time reconstruct
   // that pending interval independently of today's status.
   const targetGeneration=project.operationReceipt.reinstated===true?project.operationReceipt.generation:1;
   const firstEffective=firstCommissionedAt(deployment,project,(deployment.effectiveHistory||[]).find(row=>row.generation===targetGeneration)?.effective||deployment.desired);
   let current=snapshotAt(deployment,project,firstEffective);
   // A paid initial product task can become effective at its authored due
   // minute before the enclosing Provider project is marked complete. Rebuild
   // that transition from the task, dependency observations and due minute;
   // the current mutable deployment row may still say pending at this point
   // in the parent/child minute ordering.
   if(!current&&firstEffective!==null&&firstEffective<=at){
    const initial=(deployment.effectiveHistory||[]).find(row=>row.generation===targetGeneration)?.effective||
      (deployment.generation===targetGeneration?deployment.desired:null);
    if(initial)current={config:copy(initial),generation:targetGeneration,from:firstEffective,through:Number.MAX_SAFE_INTEGER};
   }
   const pending=!current&&at>project.operationReceipt.at?((deployment.effectiveHistory||[]).find(row=>row.generation<deployment.generation)?.effective||deployment.desired):null;
   const config=current?.config||pending;
   if(!config)continue;
   const bindings=(config.bindings||[]).filter(row=>target?.deploymentId===deployment.id?row.feature===target.feature:row.resources?.includes(resourceId));
   if(!bindings.length)continue;
   historical.desired=copy(config);
   historical.effective=current?copy(current.config):null;
   historical.generation=current?.generation??(pending?((deployment.effectiveHistory||[]).find(row=>same(row.effective,config))?.generation||deployment.generation):deployment.generation);
   historical.provisioning=current?{status:'ready',due:current.from,generation:current.generation,errors:[]}:{status:'pending',due:deployment.provisioning?.due??project.operationReceipt.at+1,generation:deployment.generation,errors:[]};
   const lastRetirement=[...(deployment.retirementHistory||[]),...(deployment.retirement?[deployment.retirement]:[])].filter(row=>row.effectiveAt<=at).sort((a,b)=>a.effectiveAt-b.effectiveAt).at(-1)||null;
   const reinstatement=s.providerCampaign.projects.filter(row=>row.customerId===c.id&&row.productId===recipeId(deployment.id)&&row.operationReceipt?.reinstated===true&&row.operationReceipt.at+1<=at&&row.operationReceipt.generation===lastRetirement?.generation+1&&paidProductProject(s,row)).sort((a,b)=>a.operationReceipt.at-b.operationReceipt.at).at(-1);
   historical.retirement=lastRetirement&&!reinstatement?{status:'retired',effectiveAt:lastRetirement.effectiveAt}:null;
   for(const binding of bindings){
    const status=api.featureStatus(historicalPack,deployment.id,binding.feature,{observeDependency:(_state,name,ref,context)=>rawDependencyReady(name,ref,at,context)?{ready:true}:false});
    if(!status.available||hooks._skipIntegrationGate!==true&&!integrationHistoryApi().bindingAvailableAt(s,c,root,deployment.id,binding.feature,at,{generation:historical.generation,productVersion:config.productVersion}))return false;
   }
   if(target?.deploymentId===deployment.id){
    const featureBindings=(config.bindings||[]).filter(binding=>binding.feature===target.feature&&Array.isArray(binding.resources)&&binding.resources.length);
    let available=!!current&&config.features?.includes(target.feature)&&featureBindings.length>0;
    for(const binding of featureBindings){
     const status=api.featureStatus(historicalPack,deployment.id,target.feature,{observeDependency:(_state,name,ref,context)=>rawDependencyReady(name,ref,at,context)?{ready:true}:false});
     if(!status.available||hooks._skipIntegrationGate!==true&&!integrationHistoryApi().bindingAvailableAt(s,c,root,deployment.id,target.feature,at,{generation:historical.generation,productVersion:config.productVersion})){available=false;break;}
     for(const boundResource of binding.resources){const plan=hooks.configurationAt(s,c,root,boundResource,at);if(!plan||baseResourceObservationAt(s,c,root,boundResource,at,plan,{...hooks,_skipProductGate:true})?.ready!==true){available=false;break;}}
     if(!available)break;
    }
    requested=available?{ready:true,projectId:project.id,postingId:project.postingId,deploymentId:deployment.id,generation:historical.generation,configuration:copy(config)}: {ready:false};
   }
  }
  return target?requested||{ready:false}:true;
 }
 function productFeatureAt(s,customerId,deploymentId,feature,at,hooks={}){
  if(!s?.providerCampaign||!integer(at)||at>s.clock||typeof customerId!=='string'||typeof deploymentId!=='string'||typeof feature!=='string')return {ready:false};
  const c=s.providerCampaign.customers.find(row=>row.id===customerId);if(!c)return {ready:false};
  const resolved=withDefaults(s,hooks),root=resolved.customerRoot(s,c);if(!root||root.providerCustomer?.id!==c.id||root.providerCustomer?.version!==1||root.providerCampaign||root.mode==='sandbox'||root.experience?.kind==='lab')return {ready:false};
  return providerProductFeatureReadyAt(s,c,root,null,at,resolved,{deploymentId,feature});
 }
 function boundaryEvaluationAt(s,c,root,project,at,pathResources,observations,hooks,context={}){
  const plan=project.operationReceipt?.plan,definition=plan?.boundaryContract,deps=plan?.dependencies;
  if(!definition||!Array.isArray(deps)||!integer(plan.boundaryGeneration))return {eligible:false,resources:[],profile:definition?.profile||''};
  const retail=hooks.retailAgreementAt(s,c,at);
  if(!retail||!integer(plan.acceptedRetailAt)||!integer(plan.retailPriceCents)||retail.acceptedAt<plan.acceptedRetailAt||retail.priceCents!==plan.retailPriceCents)return {eligible:false,resources:[],profile:definition.profile};
  const latest=s.providerCampaign.projects.filter(p=>p.customerId===c.id&&p.operationId==='service-boundary-review'&&p.kind==='operation'&&!['cancelled','blocked'].includes(p.status)&&integer(p.configSubmittedAt)&&p.configSubmittedAt<=at&&p.operationReceipt?.kind==='service-boundary').sort((a,b)=>a.configSubmittedAt-b.configSubmittedAt||a.id.localeCompare(b.id)).at(-1);
  const faultTimeline=serviceFaultTimelineAt(s,c,root,at),activeBoundaryIncident=!faultTimeline.valid||faultTimeline.boundaryActive;
  if(!latest||latest.id!==project.id||activeBoundaryIncident)return {eligible:false,resources:[],profile:definition.profile};
  const stageRows=context.stageRows,stageResources=context.stageResources;
  if(!Array.isArray(stageRows)||!Array.isArray(stageResources))return {unsupported:true};
  // The live service-boundary observer requires the same paid MSP and all
  // commissioned stage resources as support sampling. An outage in an
  // unbound stage dependency (for example the carrier behind phone) therefore
  // suspends every resource bound by this service boundary.
  const msp=activeMspAt(s,c,root,stageRows,stageResources,observations,at,hooks),responsibility=plan.responsibility;
  if(!msp||!responsibility||msp.id!==responsibility.id||msp.projectId!==responsibility.projectId||msp.postingId!==responsibility.postingId||msp.effectiveAt!==responsibility.effectiveAt)return {eligible:false,resources:[],profile:definition.profile};
  let placements;try{placements=logicalPlacementStateAt(s,c,root,at,hooks);}catch{return {unsupported:true};}
  if(!placements||!same(placements.topology,plan.topology||{}))return {eligible:false,resources:[],profile:definition.profile};
  if(pathResources.some(id=>!deps.some(dep=>dep.id===id&&dep.generation===observations[id]?.generation)))return {eligible:false,resources:[],profile:definition.profile};
  let api;try{api=typeof SOC_BOUNDARIES!=='undefined'?SOC_BOUNDARIES:require('./43-boundaries.js');}catch{return {unsupported:true};}
   const child={clock:at,boundaries:copy(root.boundaries),resources:copy(root.resources)};child.boundaries.clock=at;
  const historicalContract=copy(definition);for(const flow of historicalContract.flows||[]){const dep=deps.find(item=>item.id===flow.resource);if(dep)flow.resourceGeneration=dep.generation;}
  const historicalRow=child.boundaries.contracts.find(item=>item.id===definition.id);historicalRow.desired=copy(historicalContract);historicalRow.effective=copy(historicalContract);historicalRow.generation=plan.boundaryGeneration;historicalRow.provisioning={status:'ready',due:project.configSubmittedAt,generation:plan.boundaryGeneration,errors:[]};
  for(const resourceId of Object.keys(observations)){const resource=child.resources?.[resourceId];if(!resource)continue;let config;try{config=hooks.configurationAt(s,c,root,resourceId,at);}catch{return {unsupported:true};}if(!config?.config)return {unsupported:true};resource.generation=observations[resourceId]?.generation??config.generation;resource.desired=copy(config.config);resource.effective=copy(config.config);resource.provisioning={status:'ready',due:project.configSubmittedAt,generation:resource.generation,errors:[]};}
  const timeline=serviceFaultTimelineAt(s,c,root,at);if(!timeline.valid)return {eligible:false,resources:[],profile:definition.profile};
  child.connected=timeline.connected;for(const [resourceId,resource] of Object.entries(child.resources||{}))resource.fault=timeline.faults[resourceId]??null;
  const disconnected=!timeline.connected;
  const resourcesCurrent=deps.every(dep=>observations[dep.id]?.ready===true&&observations[dep.id]?.generation===dep.generation),flowResources=(definition.flows||[]).map(flow=>flow.resource),flowsReady=flowResources.every(id=>observations[id]?.ready===true),localConfig=hooks.configurationAt(s,c,root,'local',at)?.config,localReady=observations.local?.ready===true&&!!localConfig?.licensing,identityReady=observations.identity?.ready===true;
  historicalRow.observed={...historicalRow.observed,connected:!disconnected,cloudLicenceAvailable:!disconnected&&localReady,localLicenceGraceActive:false,localLicenceGraceExpiresAt:null,localServicesAvailable:localReady,localKeyCustodyAvailable:localReady&&!!localConfig?.certificates,adminPathAvailable:identityReady,adminPathLocation:identityReady?root.jurisdiction:null};
  const evaluation=api.evaluate(child,definition.id),resources=evaluation.resourceBindings?.map(item=>typeof item==='string'?item:item.resource)||[];
  return {eligible:evaluation.eligible===true&&resourcesCurrent&&flowsReady,resources,profile:evaluation.profile};
 }
 function publicServiceCallingContract(region,resources){
  return {id:'provider-public-service',workload:'public-service-records',profile:region,sensitivity:'internal',edition:'standard',productVersion:'provider-1',offeringEvidence:region==='US'?'eligible':'pending',customerAuthorization:'approved',agencyAuthorizationRequired:region==='US',agencyAuthorization:region==='US'?'approved':'not-required',serviceRegistration:region==='JP'?'registered':'not-registered',serviceRegistrationId:region==='JP'?'scenario-jp-public-service':null,usesAi:false,aiUseDecision:'not-required',language:region==='JP'?'ja':'en',supportLanguage:region==='JP'?'ja':'en',requirements:{processingRegions:[region],storageRegions:[region],backupRegions:[region],keyRegions:[region],adminRegions:[region],supportRegions:[region],allowedAccessRoles:['supervisor'],adminAuthorization:'customer-approved',continuity:'cloud',allowedTransferMechanisms:[]},flows:resources.map(resource=>({id:resource+'-flow',resource,informationClass:'internal',processingRegions:[region],storageRegions:[region],backupRegions:[region],keyCustodyRegions:[region],adminLocations:[region],supportRegions:[region],adminAuthorization:'customer-approved',accessRoles:['supervisor'],connectivity:'cloud',continuity:'cloud',licenceMode:'cloud',transfer:{parties:[],mechanism:null}}))};
 }
 function governmentCallingAt(s,c,root,at,hooks){
  if(c.scenario!=='government'||!root.providerGovernment)return null;
  const marker=root.providerGovernment,operation=marker.architectureId==='local-processing'?'compliance-local':'compliance',project=s.providerCampaign.projects.find(p=>p.id===marker.projectId&&p.postingId===marker.postingId&&p.customerId===c.id&&p.operationId===operation&&p.kind==='operation');
  const posting=s.business?.ledger?.find(row=>row.id===project?.postingId),prunedNumber=Number(/^entry-([1-9]\d*)$/.exec(project?.postingId||'')?.[1]||0),funded=posting?posting.category==='cost'&&posting.projectId===project.id&&posting.customerId===c.id&&posting.cents===project.setupCents:prunedNumber>0&&prunedNumber<=(s.business?.ledgerPrunedThrough||0);
  if(!project||!integer(project.configSubmittedAt)||project.configSubmittedAt!==marker.installedAt+1||project.configSubmittedAt>at||['cancelled','blocked'].includes(project.status)||!funded)return null;
  let api,architecture;try{api=governmentApi();architecture=api?.plan(marker.architectureId,{jurisdiction:root.jurisdiction,resources:['recorder','archive','speech'],contractId:'provider-public-service-processing'});if(!architecture||!api.validatePlan(architecture))return null;}catch{return null;}
  const configAt=project.configSubmittedAt,resources=[];
  for(const id of Object.keys(root.resources||{})){let value;try{value=hooks.configurationAt(s,c,root,id,configAt);}catch{return null;}if(value?.config?.enabled===true)resources.push(id);}
  const callingResources=resources.filter(id=>!['archive','recorder','speech'].includes(id));
  if(!callingResources.includes('identity')||!callingResources.includes('phone')||!callingResources.includes('engage'))return null;
  const base=publicServiceCallingContract(root.jurisdiction,callingResources),scoped={...copy(base),id:base.id+'-calling',flows:base.flows};
  const flowGenerations=[];for(const flow of scoped.flows){let value;try{value=hooks.configurationAt(s,c,root,flow.resource,configAt);}catch{return null;}if(!value||!integer(value.generation)||value.generation<1)return null;flowGenerations.push({id:flow.id,resource:flow.resource,generation:value.generation});}
  const projectRow={project,architecture,contract:scoped,flowGenerations,resources:callingResources.slice().sort(),installedAt:marker.installedAt};
  return projectRow;
 }
 function governmentObservationsAt(s,c,root,gov,at,hooks){
  const out=Object.create(null),ids=[...new Set([...gov.resources,...(gov.architecture.id==='local-processing'?['local']:[])])];
  for(const id of ids){let plan;try{plan=hooks.configurationAt(s,c,root,id,at);}catch{return null;}out[id]=baseResourceObservationAt(s,c,root,id,at,plan,{...hooks,_skipProductGate:true});if(!out[id])return null;}
  return out;
 }
 function governmentCallingEvaluationAt(s,c,root,gov,at,observations,hooks){
  if(!gov||!Array.isArray(gov.resources))return null;
  const original=root.boundaries?.contracts?.find(row=>row.id==='provider-public-service-calling');
  const bindings=root.boundaries?.bindings||{},expectedFlows=gov.contract.flows.map((flow,index)=>({...copy(flow),resourceGeneration:gov.flowGenerations[index].generation})),expected={...copy(gov.contract),flows:expectedFlows};
  const clean=value=>{if(!value)return null;const out=copy(value);for(const flow of out.flows||[])delete flow.resourceGeneration;return out;};
  if(!original||original.id!==expected.id||original.generation!==1||!integer(original.provisioning?.due)||original.provisioning.due!==gov.project.configSubmittedAt||original.provisioning.generation!==1||!same(clean(original.desired),gov.contract)||!gov.contract.flows.every(flow=>bindings[flow.resource]===expected.id))return {eligible:false,resources:[],profile:root.jurisdiction};
  if(at<original.provisioning.due||original.provisioning.status!=='ready'||!same(clean(original.effective),gov.contract)||!same(original.effective,expected))return {eligible:false,resources:[],profile:root.jurisdiction};
  for(const flow of expected.flows)if(observations[flow.resource]?.ready!==true||observations[flow.resource]?.generation!==flow.resourceGeneration)return {eligible:false,resources:[],profile:root.jurisdiction};
  const api=typeof SOC_BOUNDARIES!=='undefined'?SOC_BOUNDARIES:(typeof require==='function'?require('./43-boundaries.js'):null);if(!api)return {unsupported:true};
  const child={clock:at,boundaries:copy(root.boundaries),resources:copy(root.resources)};child.boundaries.clock=at;const row=child.boundaries.contracts.find(item=>item.id===expected.id);row.desired=copy(expected);row.effective=copy(expected);row.generation=1;row.provisioning={status:'ready',due:gov.project.configSubmittedAt,generation:1,errors:[]};
  const timeline=serviceFaultTimelineAt(s,c,root,at);if(!timeline.valid)return {eligible:false,resources:[],profile:root.jurisdiction};child.connected=timeline.connected;
  for(const [id,resource] of Object.entries(child.resources||{})){
   const plan=hooks.configurationAt(s,c,root,id,at);if(!plan?.config||!integer(plan.generation))return {unsupported:true};resource.generation=plan.generation;resource.desired=copy(plan.config);resource.effective=copy(plan.config);resource.provisioning={status:'ready',due:at,generation:plan.generation,errors:[]};resource.fault=timeline.faults[id]??null;
  }
  const localConfig=hooks.configurationAt(s,c,root,'local',at)?.config,localReady=observations.local?.ready===true&&!!localConfig?.licensing,identityReady=observations.identity?.ready===true;
  const lastDisconnect=(s.providerCampaign.incidents||[]).filter(item=>item.customerId===c.id&&item.kind==='disconnection'&&integer(item.activatedAt)&&item.activatedAt<=at&&(item.resolvedAt===null||integer(item.resolvedAt)&&item.resolvedAt>at)).sort((a,b)=>b.activatedAt-a.activatedAt)[0];
  const lastConnectedAt=timeline.connected?at:lastDisconnect?lastDisconnect.activatedAt-1:at;
  row.observed={connected:timeline.connected,cloudLicenceAvailable:timeline.connected&&localReady,localLicenceGraceActive:gov.architecture.id==='local-processing'&&localReady,localLicenceGraceExpiresAt:gov.architecture.id==='local-processing'?lastConnectedAt+30:null,localServicesAvailable:localReady,localKeyCustodyAvailable:localReady&&!!localConfig?.certificates,adminPathAvailable:localReady&&identityReady,adminPathLocation:localReady&&identityReady?root.jurisdiction:null};
  const result=api.evaluate(child,expected.id),resources=result.resourceBindings?.map(item=>typeof item==='string'?item:item.resource)||[];
  return {eligible:result.eligible===true,resources,profile:result.profile};
 }
 function withDefaults(s,hooks){
  const configMemo=new Map(),readerMemo=new Map(),provenanceMemo=new Map(),observationMemo=new Map(),boundaryMemo=new Map(),governmentBoundaryMemo=new Map();
  const readerFor=(state,c,root,at)=>{
   const readerKey=`${c.id}\u0000${at}`;
   if(!readerMemo.has(readerKey)){
    const api=configurationApi();
    readerMemo.set(readerKey,typeof api.configurationReaderAt==='function'?api.configurationReaderAt(state.providerCampaign,c,root,at,{catalogue:hooks.catalogue}):null);
   }
   return readerMemo.get(readerKey);
  };
  const configurationAt=hooks.configurationAt||((state,c,root,id,at)=>{
   const key=`${c.id}\u0000${id}\u0000${at}`;
   if(!configMemo.has(key)){
    const reader=readerFor(state,c,root,at),api=configurationApi();
    configMemo.set(key,typeof reader==='function'?reader(id):api.configurationAt(state.providerCampaign,c,root,id,at,{catalogue:hooks.catalogue}));
   }
   return copy(configMemo.get(key));
  });
  const configurationProvenanceAt=hooks.configurationProvenanceAt||((state,c,root,id,at)=>{
   const key=`${c.id}\u0000${id}\u0000${at}`;
   if(!provenanceMemo.has(key)){
    const reader=readerFor(state,c,root,at),api=configurationApi();
    provenanceMemo.set(key,typeof reader==='function'&&typeof reader.provenanceAt==='function'?reader.provenanceAt(id):api.configurationProvenanceAt?.(state.providerCampaign,c,root,id,at,{catalogue:hooks.catalogue})||null);
   }
   return copy(provenanceMemo.get(key));
  });
  const resolved={...hooks,
   customerRoot:hooks.customerRoot||((state,c)=>customerRoot(state,c,{})),
   customerStatusAt:hooks.customerStatusAt||customerStatusAt,
   retailAgreementAt:hooks.retailAgreementAt||retailAgreementAt,
   configurationAt,
   configurationProvenanceAt,
   pathResourcesAt:hooks.pathResourcesAt||((state,c,root,at)=>logicalPlacementsAt(state,c,root,at,resolved)),
   paidStaffAt:hooks.paidStaffAt||paidStaffAt
  };
  resolved.resourceObservationAt=hooks.resourceObservationAt||((state,c,root,id,at,plan)=>{
   const key=`${c.id}\u0000${id}\u0000${at}\u0000${plan?.generation}`;
   if(observationMemo.has(key))return copy(observationMemo.get(key));
   const base=baseResourceObservationAt(state,c,root,id,at,plan,resolved);
   if(!base){observationMemo.set(key,base);return copy(base);}
   const activeBoundary=state.providerCampaign.projects.filter(project=>project.customerId===c.id&&project.operationId==='service-boundary-review'&&project.kind==='operation'&&!['cancelled','blocked'].includes(project.status)&&integer(project.configSubmittedAt)&&project.configSubmittedAt<=at&&project.operationReceipt?.kind==='service-boundary').sort((a,b)=>a.configSubmittedAt-b.configSubmittedAt||a.id.localeCompare(b.id)).at(-1);
   if(activeBoundary?.operationReceipt?.plan?.boundaryContract?.flows?.some(flow=>flow.resource===id)){
    const contractId=activeBoundary.operationReceipt.plan.boundaryContract.id,boundaryKey=`${c.id}\u0000${contractId}\u0000${at}`;
    if(!boundaryMemo.has(boundaryKey)){
     const stageRows=[];
     for(const stageId of ['base','carrier','partner']){const stage=c.stages?.[stageId],project=stage&&projectById(state,c,stage.projectId);if(!stage||!project||project.kind!=='stage'||project.stage!==stageId||!paidProject(state,project,resolved)||project.completedAt>at){stageRows.length=0;break;}stageRows.push({stageId,stage,project});}
     if(!stageRows.length){boundaryMemo.set(boundaryKey,false);}
     else{
      const contract=root.boundaries?.contracts?.find(row=>row.id===contractId),boundaryPlan=activeBoundary.operationReceipt.plan,flows=boundaryPlan?.boundaryContract?.flows;
      if(!contract||!Array.isArray(flows)||!flows.some(flow=>flow.resource===id))boundaryMemo.set(boundaryKey,false);
      else{
       const deps=boundaryPlan.dependencies||[],observations=Object.create(null),stageResources=[...new Set(stageRows.flatMap(row=>row.project.resources||[]))],observationIds=[...new Set([...deps.map(dep=>dep.id),...stageResources])];
       for(const resourceId of observationIds){let config;try{config=resolved.configurationAt(state,c,root,resourceId,at);}catch{config=null;}observations[resourceId]=baseResourceObservationAt(state,c,root,resourceId,at,config,{...resolved,_skipIntegrationGate:true,_allowPendingMigration:true});}
       const paths=[...new Set(flows.map(flow=>flow.resource))];
       let evaluation;try{evaluation=boundaryEvaluationAt(state,c,root,activeBoundary,at,paths,observations,resolved,{stageRows,stageResources});}catch{evaluation=null;}
       boundaryMemo.set(boundaryKey,!!evaluation?.eligible&&evaluation.resources.includes(id));
      }
     }
    }
    if(!boundaryMemo.get(boundaryKey))base.ready=false;
   }
   if(state.providerCampaign.customers.find(customer=>customer.id===c.id)?.scenario==='government'){
    let gov;try{gov=governmentCallingAt(state,c,root,at,resolved);}catch{gov=null;}
    if(gov?.resources.includes(id)){
     const boundaryKey=`${c.id}\u0000${gov.project.id}\u0000${at}`;
     if(!governmentBoundaryMemo.has(boundaryKey)){
      const observed=governmentObservationsAt(state,c,root,gov,at,resolved);
      let evaluation;try{evaluation=observed?governmentCallingEvaluationAt(state,c,root,gov,at,observed,resolved):null;}catch{evaluation=null;}
      governmentBoundaryMemo.set(boundaryKey,evaluation&&!evaluation.unsupported?evaluation:null);
     }
     const evaluation=governmentBoundaryMemo.get(boundaryKey);if(!evaluation?.eligible||!evaluation.resources.includes(id))base.ready=false;
    }
   }
   observationMemo.set(key,base);
   return copy(observationMemo.get(key));
  });
  resolved.boundaryAt=hooks.boundaryAt||((state,c,root,project,at,paths,observations,context)=>boundaryEvaluationAt(state,c,root,project,at,paths,observations,resolved,context));
  return resolved;
 }
 function projectById(s,c,id){return s.providerCampaign.projects.find(p=>p.id===id&&p.customerId===c.id)||null;}
 function paidProject(s,p,hooks){
  if(!p||!['complete','retired'].includes(p.status)||!integer(p.completedAt))return false;
  if(typeof hooks.paidProjectAt==='function')return hooks.paidProjectAt(s,p,p.completedAt)===true;
  const row=s.business?.ledger?.find(x=>x.id===p.postingId);
  if(row)return row.category==='cost'&&row.projectId===p.id&&row.customerId===p.customerId&&row.cents===p.setupCents;
  const n=Number(/^entry-([1-9]\d*)$/.exec(p.postingId||'')?.[1]||0);
  return n>0&&n<=(s.business?.ledgerPrunedThrough||0)&&s.providerCampaign.projects.includes(p);
 }
 function paidProductProject(s,p){
  if(!p||p.kind!=='operation'||typeof p.productId!=='string'||!integer(p.setupCents)||!integer(p.acceptedAt)||!integer(p.configSubmittedAt))return false;
  const row=s.business?.ledger?.find(x=>x.id===p.postingId);
  if(row)return row.category==='cost'&&row.projectId===p.id&&row.customerId===p.customerId&&row.cents===p.setupCents;
  const number=Number(/^entry-([1-9]\d*)$/.exec(p.postingId||'')?.[1]||0);
  return number>0&&number<=(s.business?.ledgerPrunedThrough||0)&&s.providerCampaign.projects.includes(p);
 }
 function serviceFaultTimelineAt(s,c,root,at){
  const aliases={processor:'speech',connectivity:'access'},faults=Object.fromEntries(Object.keys(root.resources||{}).map(id=>[id,null])),events=[];let connected=true,boundaryActive=false,outageStartedAt=null;
  for(const incident of s.providerCampaign.incidents||[]){
   if(incident.customerId!==c.id||incident.kind==='transport-domain')continue;
   if(!integer(incident.createdAt)||!integer(incident.dueAt)||incident.dueAt<incident.createdAt||incident.activatedAt!==null&&!integer(incident.activatedAt)||incident.acknowledgedAt!==null&&!integer(incident.acknowledgedAt)||incident.resolvedAt!==null&&!integer(incident.resolvedAt)||incident.activatedAt!==null&&incident.resolvedAt!==null&&incident.resolvedAt<=incident.activatedAt)return {valid:false};
   if(incident.activatedAt!==null&&incident.activatedAt<=at)events.push({at:incident.activatedAt,order:1,incident});
  }
  for(const project of s.providerCampaign.projects.filter(p=>p.customerId===c.id&&p.configSubmittedAt!==null&&['repair','mitigate','service-repair'].includes(p.operationId)&&p.configSubmittedAt<=at))events.push({at:project.configSubmittedAt,order:0,project});
  events.sort((a,b)=>a.at-b.at||a.order-b.order);
  for(const event of events){
   if(event.incident){const incident=event.incident,id=aliases[incident.resource]||incident.resource;if(incident.kind==='disconnection'){if(connected)outageStartedAt=incident.receipt?.at??incident.activatedAt-1;connected=false;}else if(incident.kind==='boundary')boundaryActive=true;else if(!(id==='room'&&incident.fault==='CAPACITY')){if(!Object.hasOwn(faults,id))return {valid:false};faults[id]='OUTAGE';}}
   else{
    const project=event.project,incidents=(s.providerCampaign.incidents||[]).filter(i=>i.customerId===c.id&&i.kind!=='transport-domain'&&i.activatedAt!==null&&i.activatedAt<event.at&&i.acknowledgedAt!==null&&i.acknowledgedAt<event.at&&(i.resolvedAt===null||i.resolvedAt>=event.at)),resources=incidents.map(i=>aliases[i.resource]||i.resource);
    if(project.operationReceipt?.at!==event.at-1||!Array.isArray(project.operationReceipt?.resources)||!same(project.operationReceipt.resources,resources))return {valid:false};
    for(const incident of incidents){const id=aliases[incident.resource]||incident.resource;if(incident.kind==='disconnection'){connected=true;outageStartedAt=null;}else if(incident.kind==='boundary')boundaryActive=false;else if(!(id==='room'&&incident.fault==='CAPACITY'))faults[id]=null;}
   }
  }
  return {valid:true,connected,faults,boundaryActive,outageStartedAt};
 }
 function ownedSiteTimelineAt(s,c,root,at,hooks){
  const projects=(s.providerCampaign.projects||[]).filter(p=>p.customerId===c.id&&['site-diverse-ingress','owned-site-operations','site-recovery','managed-site-recovery','site-resource-migration','custody-review'].includes(p.operationId)&&p.configSubmittedAt!==null&&!['cancelled','blocked'].includes(p.status));
  if(!root.siteOperations&&!root.providerSiteWork&&!projects.length)return {valid:true,bindings:null,domains:{}};
  const api=ownedSiteApi();if(!api||!hooks.ownedSiteHooks)return {unsupported:true};
  try{api.validateCustomer(s,c.id,root,hooks.ownedSiteHooks);}catch{return {valid:false};}
  const install=(s.providerCampaign.projects||[]).find(p=>p.customerId===c.id&&p.operationId==='owned-site-operations'&&p.status==='complete'&&integer(p.completedAt));
  let bindings=null;
  if(install&&install.completedAt<=at){try{bindings=api.endpointBindingsAt(s,c.id,root,at);}catch{return {valid:false};}if(!bindings)return {valid:false};}
  const currentDomains=root.transport?.domains||{},domains=Object.fromEntries(Object.keys(currentDomains).map(id=>[id,false])),events=[];
  for(const incident of s.providerCampaign.incidents||[])if(incident.customerId===c.id&&incident.kind==='transport-domain'){
   if(!root.transport||!Object.hasOwn(domains,incident.domain)||incident.resource!=='access'||incident.fault!=='TRANSPORT_DOMAIN'||!integer(incident.activatedAt)||incident.receipt?.at!==incident.activatedAt||incident.receipt?.domain!==incident.domain)return {valid:false};
   const job=(s.providerCampaign.jobs||[]).find(j=>j.id===incident.jobId),sequence=job?.resilienceSequence;
   if(!sequence||sequence.incidentId!==incident.id||sequence.windowStart!==incident.activatedAt)return {valid:false};
   events.push({at:incident.activatedAt,order:2,domain:incident.domain,value:true});
   if(incident.status==='resolved'){
    const repair=(s.providerCampaign.projects||[]).find(p=>p.id===incident.repairProjectId&&p.customerId===c.id&&p.operationId==='transport-repair'&&p.configSubmittedAt===incident.resolvedAt);
    if(!repair||repair.operationReceipt?.incidentId!==incident.id||repair.operationReceipt?.domain!==incident.domain||repair.operationReceipt?.at!==incident.resolvedAt)return {valid:false};
    events.push({at:incident.resolvedAt,order:0,domain:incident.domain,value:false});
   }else if(!['active','acknowledged'].includes(incident.status))return {valid:false};
  }
  for(const exercise of root.siteOperations?.exercises||[]){
   if(!exercise.fault)continue;
   if(!Object.hasOwn(domains,exercise.fault.id)||exercise.failedDomain!==exercise.fault.id||!exercise.baseline?.success||!integer(exercise.baseline.at))return {valid:false};
   const project=(s.providerCampaign.projects||[]).find(p=>p.customerId===c.id&&['site-recovery','managed-site-recovery'].includes(p.operationId)&&p.operationReceipt?.exerciseId===exercise.id);
   if(!project||project.config?.kind!==exercise.kind||project.config?.targetSite!==exercise.targetSite||exercise.id!=='site-exercise-'+project.id)return {valid:false};
   events.push({at:exercise.baseline.at,order:2,domain:exercise.fault.id,value:true});
   const abort=project.siteAbort;
   if(abort){if(abort.exerciseId!==exercise.id||abort.clearedDomain!==exercise.fault.id||!integer(abort.at))return {valid:false};events.push({at:abort.at,order:0,domain:exercise.fault.id,value:false,strictAfter:true});}
   else if(integer(exercise.recoveredAt))events.push({at:exercise.recoveredAt,order:0,domain:exercise.fault.id,value:false,strictAfter:true});
  }
  events.sort((a,b)=>a.at-b.at||a.order-b.order);
  for(const event of events){if(event.at<at||event.at===at&&!event.strictAfter)domains[event.domain]=event.value;}
  return {valid:true,bindings,domains};
 }
 function freshJobsAt(s,c,root,at){
  const out=[];for(const job of s.providerCampaign.jobs||[]){
   if(job.customerId!==c.id||!['completed','late'].includes(job.status)||job.completedAt!==at||!job.interactionId||!job.caseId)continue;
   const interaction=root.interactions?.find(x=>x.id===job.interactionId),caseRecord=root.cases?.[job.caseId],assignment=interaction&&root.workforceOps?.assignments?.find(x=>x.person===interaction.agent&&x.status==='complete'&&(x.id===interaction.workforceAssignment||x.interaction===interaction.workforceAssignment||x.interaction===interaction.id));
   if(!interaction||interaction.probe===true||interaction.phase!=='resolved'||interaction.startedAt>at||interaction.finishedAt!==at||interaction.botAnswered||!interaction.agent||!interaction.workforceAssignment||interaction.caseId!==job.caseId||interaction.context!==true||interaction.needOutcome&&interaction.needOutcome.outcome!=='resolved'||!caseRecord||caseRecord.tenant!==(root.tenant||c.tenant||c.portfolioId)||!caseRecord.interactions?.includes(interaction.id)||!assignment||assignment.personSnapshot?.id!==interaction.agent)continue;
   out.push({jobId:job.id,interactionId:interaction.id,caseId:job.caseId,channel:job.channel,startedAt:interaction.startedAt,finishedAt:interaction.finishedAt,person:interaction.agent,assignmentId:assignment.id});
  }
  return out.sort((a,b)=>a.jobId.localeCompare(b.jobId));
 }
 function resolvedWorkMissingAt(s,c,root,at,hooks){
  const missing=[],tenant=root.tenant||c.tenant||c.portfolioId;
  for(const channel of ['voice','message']){
   const match=(root.interactions||[]).filter(interaction=>interaction.channel===channel&&interaction.probe!==true&&interaction.phase==='resolved'&&integer(interaction.finishedAt)&&interaction.finishedAt<=at&&interaction.context===true&&(!interaction.needOutcome||interaction.needOutcome.outcome==='resolved')&&typeof interaction.caseId==='string')
    .find(interaction=>{
     const linkedCase=root.cases?.[interaction.caseId],job=(s.providerCampaign.jobs||[]).find(row=>row.customerId===c.id&&row.interactionId===interaction.id&&row.caseId===interaction.caseId&&row.channel===channel&&['completed','late'].includes(row.status)&&row.contextRetained===true&&integer(row.completedAt)&&row.completedAt===interaction.finishedAt&&row.completedAt<=at),matches=event=>event?.code==='CUSTOMER_WORK_ARRIVED'&&event.customerId===c.id&&event.interactionId===interaction.id&&event.caseId===interaction.caseId&&event.channel===channel&&integer(event.at)&&event.at<=interaction.startedAt&&typeof event.jobId==='string'&&/^provider-job-[1-9]\d*$/.test(event.jobId),arrival=(s.providerCampaign.events||[]).find(event=>matches(event)&&event.jobId===job?.id),pinned=arrival?null:(typeof hooks.supportWorkOrigin==='function'?hooks.supportWorkOrigin(s,c.id,interaction,at):null);
     return !!job&&(matches(arrival)||matches(pinned)&&pinned.jobId===job.id)&&linkedCase?.tenant===tenant&&linkedCase.interactions?.includes(interaction.id);
    });
   if(!match)missing.push(channel==='voice'?'resolved-voice-case-not-retained':'resolved-digital-case-not-retained');
  }
  return missing;
 }
 function activeMspAt(s,c,root,stageRows,stageResources,readyByResource,at,hooks){
  if(!['active','renewal'].includes(hooks.customerStatusAt(s,c,at)))return null;
  const terms=hooks.retailAgreementAt(s,c,at);if(!terms||terms.acceptedAt>at||!integer(terms.priceCents))return null;
  let team,billed;try{team=workforceApi().at(s.providerCampaign.workforceHistory,at);const periodStart=Math.max(s.providerCampaign.workforceHistory.startedAt,Math.floor(at/60)*60);billed=workforceApi().at(s.providerCampaign.workforceHistory,periodStart).personMinutes;}catch{return null;}
  if(!team||team.support<1||team.personMinutes<1||billed<1)return null;
  if(typeof hooks.paidStaffAt!=='function'||hooks.paidStaffAt(s,at)!==true)return null;
  const org=s.business?.organisations?.['orchard-msp'];if(!org?.roles?.includes('msp')||!org?.roles?.includes('reseller'))return null;
  if(stageResources.some(id=>{
   if(readyByResource[id]?.ready===true)return false;
   const migration=(root.operations?.migrations||[]).find(row=>['verifying','complete'].includes(row.status)&&row.cutoverAt<=at&&row.verifyAt>at&&row.appliedGenerations?.[id]);
   if(!migration)return true;
   // A cutover leaves the previous effective endpoint available until its
   // queued configuration becomes effective. Current service qualification
   // still rejects that generation gap, while the paid MSP remains present.
   let plan;try{plan=hooks.configurationAt(s,c,root,id,at);}catch{return true;}
   return baseResourceObservationAt(s,c,root,id,at,plan,{...hooks,_allowPendingMigration:true})?.ready!==true;
  }))return null;
  const scope=[...new Set(stageRows.flatMap(row=>row.project.resources||[]))],projects=stageRows.map(row=>row.project);
  const latest=projects.at(-1),effectiveAt=Math.max(...projects.map(p=>p.completedAt));
  const sharedWorkforce={engineers:team.engineers,support:team.support,personMinutes:team.personMinutes,billedMinutes:billed};
  return {id:`provider-responsibility-msp-${c.id}`,customerId:c.id,role:'msp',organisationId:'orchard-msp',projectId:latest.id,postingId:latest.postingId,effectiveAt,expiresAt:null,scope,setupCents:projects.reduce((n,p)=>n+p.setupCents,0),periodCents:projects.reduce((n,p)=>n+p.periodCents,0),engineers:team.engineers,support:team.support,sharedWorkforce};
 }
 function reconstructParticipantAtResolved(s,customerId,at,hooks){
  if(!s?.providerCampaign||s.providerCampaign.contentVersion!=='provider-campaigns-8'||!integer(at)||at>s.clock)return unsupported('SUPPORT_HISTORY_CONTENT_OR_CLOCK_UNSUPPORTED');
  const c=s.providerCampaign.customers.find(x=>x.id===customerId);if(!c)return {status:'invalid',missing:['customer-not-found'],participant:null};
  const root=customerRoot(s,c,hooks);if(!root||root.providerCustomer?.id!==c.id||root.providerCustomer?.version!==1||root.providerCampaign||root.mode==='sandbox'||root.experience?.kind==='lab')return {status:'invalid',missing:['validated-customer-root'],participant:null};
  let ownedTimeline;try{ownedTimeline=ownedSiteTimelineAt(s,c,root,at,hooks);}catch{return unsupported('SUPPORT_HISTORY_OWNED_SITE_TIMELINE_UNAVAILABLE');}
  if(ownedTimeline?.unsupported)return unsupported('SUPPORT_HISTORY_OWNED_SITE_TIMELINE_HOOK_REQUIRED');
  if(!ownedTimeline?.valid)return {status:'invalid',missing:['owned-site-transport-timeline-invalid'],participant:null};
  let terms;try{terms=hooks.retailAgreementAt(s,c,at);}catch{return unsupported('SUPPORT_HISTORY_RETAIL_TIMELINE_UNAVAILABLE');}if(!terms||!integer(terms.acceptedAt)||terms.acceptedAt>at||!integer(terms.priceCents))return {status:'invalid',missing:['accepted-retail-agreement'],participant:null};
  const stageRows=[],missing=[];let stageLineageReady=true;
  for(const stageId of ['base','carrier','partner']){
   const stage=c.stages?.[stageId],project=stage&&projectById(s,c,stage.projectId);
   if(!stage||stage.status!=='effective'||!project||project.kind!=='stage'||project.stage!==stageId||!paidProject(s,project,hooks)||project.completedAt>at){stageLineageReady=false;missing.push('paid-commissioned-stage-lineage');break;}
   stageRows.push({stageId,stage,project});
  }
  if(!stageLineageReady)stageRows.length=0;
  const stageResources=stageLineageReady?[...new Set(stageRows.flatMap(x=>x.project.resources||[]))]:[],observations=Object.create(null),resourceMissing=[];
  const readResource=resourceId=>{
   if(Object.hasOwn(observations,resourceId))return true;
   let plan,observation;try{plan=hooks.configurationAt(s,c,root,resourceId,at);observation=hooks.resourceObservationAt(s,c,root,resourceId,at,plan);}catch{return false;}
   if(!plan||!integer(plan.generation)||!plan.config||!observation||!exact(observation,['effective','generation','ready'])||typeof observation.effective!=='boolean'||typeof observation.ready!=='boolean'||observation.generation!==null&&!integer(observation.generation))return false;
   observations[resourceId]={effective:observation.effective&&observation.generation===plan.generation,generation:observation.generation,ready:observation.ready&&observation.effective&&observation.generation===plan.generation};return true;
  };
  for(const resourceId of stageResources)if(!readResource(resourceId))return unsupported(`SUPPORT_HISTORY_RESOURCE_OBSERVATION_UNAVAILABLE:${resourceId}`);
  const expectedByResource=Object.create(null);for(const {stage} of stageRows)for(const resourceId of stage.resources||[])expectedByResource[resourceId]=stage.expectedGenerations?.[resourceId];
  for(const resourceId of stageResources){const r=observations[resourceId],expected=expectedByResource[resourceId];if(!r?.ready||!integer(expected)||r.generation<expected)resourceMissing.push(`resource-not-current:${resourceId}`);}
  const stagesReady=stageLineageReady&&resourceMissing.length===0;
  if(resourceMissing.length)missing.push(...resourceMissing);
  const workMissing=stagesReady?resolvedWorkMissingAt(s,c,root,at,hooks):[];missing.push(...workMissing);
  const customerReady=stagesReady&&workMissing.length===0;
  let pathResources=[];
  if(customerReady){
   let paths;try{paths=hooks.pathResourcesAt(s,c,root,at);}catch{return unsupported('SUPPORT_HISTORY_PATH_TIMELINE_UNAVAILABLE');}
   if(paths===null)return unsupported('SUPPORT_HISTORY_PATH_TIMELINE_UNAVAILABLE');
   if(!Array.isArray(paths)||paths.some(x=>typeof x!=='string'))return {status:'invalid',missing:['invalid-path-resource-history'],participant:null};
   pathResources=[...new Set(['identity','phone',...paths,'engage'])];
   for(const resourceId of pathResources)if(!readResource(resourceId))return unsupported(`SUPPORT_HISTORY_RESOURCE_OBSERVATION_UNAVAILABLE:${resourceId}`);
  }
  const govCalling=customerReady?governmentCallingAt(s,c,root,at,hooks):null;
  if(govCalling)for(const resourceId of govCalling.resources)if(!readResource(resourceId))return unsupported(`SUPPORT_HISTORY_RESOURCE_OBSERVATION_UNAVAILABLE:${resourceId}`);
  const resources=customerReady?[...new Set([...stageResources,...pathResources])]:[];
  const readyByResource=observations;
  if(customerReady)for(const resourceId of pathResources)if(!readyByResource[resourceId]?.ready)missing.push(`resource-not-current:${resourceId}`);
  let responsibility;try{responsibility=activeMspAt(s,c,root,stageRows,stageResources,readyByResource,at,hooks);}catch{return unsupported('SUPPORT_HISTORY_RESPONSIBILITY_TIMELINE_UNAVAILABLE');}
  if(!responsibility)missing.push('No current MSP responsibility proof links the customer to paid service stages and shared support payroll.');
  let boundaries=[];
  {
   const candidates=s.providerCampaign.projects.filter(p=>p.customerId===c.id&&p.operationId==='service-boundary-review'&&p.kind==='operation'&&p.status==='complete'&&integer(p.completedAt)&&p.completedAt<=at&&p.operationReceipt?.kind==='service-boundary');
   if(customerReady)for(const project of candidates){
    const receipt=project.operationReceipt,plan=receipt.plan,contract=plan?.boundaryContract,deps=plan?.dependencies;
    if(!plan||plan.customerId!==c.id||!contract?.id||!integer(plan.boundaryGeneration)||!Array.isArray(deps)||!paidProject(s,project,hooks))continue;
    if(!pathResources.every(id=>deps.some(d=>d.id===id&&d.generation===observations[id]?.generation)))continue;
    const boundaryObservations=Object.create(null),boundaryIds=[...new Set([...stageResources,...pathResources,...deps.map(dep=>dep.id)])];
    for(const resourceId of boundaryIds){let plan;try{plan=hooks.configurationAt(s,c,root,resourceId,at);}catch{return unsupported('SUPPORT_HISTORY_BOUNDARY_TIMELINE_UNAVAILABLE');}boundaryObservations[resourceId]=baseResourceObservationAt(s,c,root,resourceId,at,plan,{...hooks,_skipIntegrationGate:true,_allowPendingMigration:true});if(!boundaryObservations[resourceId])return unsupported('SUPPORT_HISTORY_BOUNDARY_TIMELINE_UNAVAILABLE');}
    let evaluation;try{evaluation=hooks.boundaryAt(s,c,root,project,at,pathResources,boundaryObservations,{stageRows,stageResources});}catch{return unsupported('SUPPORT_HISTORY_BOUNDARY_TIMELINE_UNAVAILABLE');}
    if(evaluation?.unsupported)return unsupported('SUPPORT_HISTORY_BOUNDARY_TIMELINE_UNAVAILABLE');
    if(!evaluation||typeof evaluation.eligible!=='boolean'||!Array.isArray(evaluation.resources)||typeof evaluation.profile!=='string')return unsupported('SUPPORT_HISTORY_BOUNDARY_TIMELINE_UNAVAILABLE');
    if(evaluation.eligible&&pathResources.every(id=>evaluation.resources.includes(id)))boundaries.push({id:contract.id,generation:plan.boundaryGeneration,profile:evaluation.profile,resources:[...evaluation.resources].filter(id=>pathResources.includes(id)).sort()});
   }
  }
  if(govCalling){
    const govObservations=governmentObservationsAt(s,c,root,govCalling,at,hooks),evaluation=govObservations?governmentCallingEvaluationAt(s,c,root,govCalling,at,govObservations,hooks):null;
   if(evaluation?.unsupported)return unsupported('SUPPORT_HISTORY_GOVERNMENT_BOUNDARY_TIMELINE_UNAVAILABLE');
   if(evaluation?.eligible&&pathResources.every(id=>evaluation.resources.includes(id)))boundaries.push({id:govCalling.contract.id,generation:1,profile:evaluation.profile,resources:[...pathResources].sort()});
  }
  boundaries.sort((a,b)=>a.id.localeCompare(b.id));
  if(!boundaries.length)missing.push('An effective supported boundary on a paid service resource is required throughout the sample.');
  const team=workforceApi().at(s.providerCampaign.workforceHistory,at),responsibilityProjection=responsibility?copy(responsibility):null;if(responsibilityProjection)responsibilityProjection.scope.sort();
  const generations=resources.map(id=>({id,generation:observations[id]?.generation??null})).sort((a,b)=>a.id.localeCompare(b.id));
  const configuration=JSON.stringify(stable({customerId:c.id,tenant:root.tenant||c.tenant||c.portfolioId,market:c.market,scenario:c.scenario,retailPriceCents:terms.priceCents,stages:Object.fromEntries(['base','carrier','partner'].map(id=>{const stage=c.stages?.[id];return [id,stage?{status:stage.status,projectId:stage.projectId,resources:stage.resources,expectedGenerations:stage.expectedGenerations}:null];})),resources:resources.map(id=>({id,generation:observations[id]?.generation})),responsibility:{id:responsibility?.id,projectId:responsibility?.projectId,postingId:responsibility?.postingId,scope:responsibility?.scope,terms:responsibility?{setupCents:responsibility.setupCents,periodCents:responsibility.periodCents,engineers:responsibility.engineers,support:responsibility.support}:undefined,sharedWorkforce:responsibility?{engineers:responsibility.sharedWorkforce.engineers,support:responsibility.sharedWorkforce.support}:null},boundaries}));
  const participant={customerId:c.id,portfolioId:c.portfolioId,tenant:root.tenant||c.tenant||c.portfolioId,market:c.market,scenario:c.scenario,configuration,eligible:missing.length===0,missing:[...new Set(missing)],resources:generations,boundaries,responsibility:responsibilityProjection};
  participant.freshJobs=freshJobsAt(s,c,root,at);
  if(typeof hooks.namedSupportAt==='function')participant.namedSupport=hooks.namedSupportAt(s,c,root,at);
  return {status:'supported',missing:[],participant};
 }
 function reconstructParticipantAt(s,customerId,at,hooks={}){return reconstructParticipantAtResolved(s,customerId,at,withDefaults(s,hooks));}
 function callingSupportAt(s,customerId,at,hooks={}){
  const result=reconstructParticipantAt(s,customerId,at,hooks);if(result.status!=='supported'||!result.participant)return false;
  const participant=result.participant,optionalBoundary='An effective supported boundary on a paid service resource is required throughout the sample.',optionalResponsibility='No current MSP responsibility proof links the customer to paid service stages and shared support payroll.';
  if(participant.missing.some(reason=>reason!==optionalBoundary&&reason!==optionalResponsibility)||!participant.responsibility||!paidStaffAt(s,at))return false;
  const shared=participant.responsibility.sharedWorkforce;return !!shared&&integer(shared.support)&&shared.support>0&&integer(shared.personMinutes)&&shared.personMinutes>0&&integer(shared.billedMinutes)&&shared.billedMinutes>0;
 }
 function validateParticipantAt(s,participant,at,hooks={}){
  const result=reconstructParticipantAt(s,participant?.customerId,at,hooks);if(result.status!=='supported')return result;
  const expected=result.participant,keys=['customerId','portfolioId','tenant','market','scenario','configuration','eligible','missing','resources','boundaries','responsibility'];
  const allowed=new Set([...keys,'freshJobs','settlements','namedSupport','distributor','integrations']);
  const sameSample=participant&&typeof participant==='object'&&!Array.isArray(participant)&&Object.keys(participant).every(key=>allowed.has(key))&&keys.every(key=>Object.hasOwn(participant,key)&&same(participant[key]??null,expected[key]??null))&&(!Object.hasOwn(participant,'freshJobs')||same(participant.freshJobs,expected.freshJobs));
  return {status:sameSample?'valid':'invalid',missing:sameSample?[]:['HISTORICAL_SUPPORT_PARTICIPANT_MISMATCH'],participant:expected};
 }
 function createValidator(s,hooks={}){
  const resolved=withDefaults(s,hooks);
  return (participant,at)=>{
   const result=reconstructParticipantAtResolved(s,participant?.customerId,at,resolved);if(result.status!=='supported')return result;
   const expected=result.participant,keys=['customerId','portfolioId','tenant','market','scenario','configuration','eligible','missing','resources','boundaries','responsibility'];
   const allowed=new Set([...keys,'freshJobs','settlements','namedSupport','distributor','integrations']);
   const sameSample=participant&&typeof participant==='object'&&!Array.isArray(participant)&&Object.keys(participant).every(key=>allowed.has(key))&&keys.every(key=>Object.hasOwn(participant,key)&&same(participant[key]??null,expected[key]??null))&&(!Object.hasOwn(participant,'freshJobs')||same(participant.freshJobs,expected.freshJobs));
   return {status:sameSample?'valid':'invalid',missing:sameSample?[]:['HISTORICAL_SUPPORT_PARTICIPANT_MISMATCH'],participant:expected};
  };
 }
 function source(){return `const SOC_PROVIDER_SUPPORT_HISTORY=(${socProviderSupportHistoryKernel.toString()})();`;}
 return {version:VERSION,reconstructParticipantAt,callingSupportAt,validateParticipantAt,createValidator,productFeatureAt,source};
}
const SOC_PROVIDER_SUPPORT_HISTORY=socProviderSupportHistoryKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_SUPPORT_HISTORY;
