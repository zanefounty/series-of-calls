/* A bounded Customer IT opening with its own budget, estate and outage liability. */
function socCustomerItCareerKernel(){
 'use strict';
 const VERSION=1,PREVIOUS_LINKED_VERSION=2,SHARED_OUTAGE_VERSION=3,LINKED_VERSION=4,GRANT_MINUTES=180,OPENING_BUDGET=900000,PROTECT_COST=350000,MIGRATE_COST=500000,REPAIR_COST=200000;
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
 const exact=(value,fields)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===fields.slice().sort().join(',');
 const choices={protect:{costCents:PROTECT_COST,siteId:'north',workMinutes:3},migrate:{costCents:MIGRATE_COST,siteId:'south',workMinutes:4}};
 function create(s,options={}){
  const linked=options.linkedProvider===true,customer=linked?s.providerCampaign?.customers.find(row=>row.id==='starter-customer'):null,projects=linked?s.providerCampaign?.projects.filter(row=>row.customerId===customer?.id&&row.kind==='stage').sort((a,b)=>['base','carrier','partner'].indexOf(a.stage)-['base','carrier','partner'].indexOf(b.stage)):null;
  const migration=linked?s.providerCampaign?.projects.find(row=>row.customerId===customer?.id&&row.operationId==='migration'):null;
  if(linked&&(!customer||customer.name!=='Canopy Group'||customer.planId!=='steady'||projects.length!==3||projects.some((project,index)=>project.stage!==['base','carrier','partner'][index])||!migration||migration.acceptedAt!==s.clock))fail('CUSTOMER_IT_INHERITED_CONTRACT_UNAVAILABLE');
  const organisationId=linked?'customer':'cedar-customer';
  return {version:linked?LINKED_VERSION:VERSION,role:'customer-it',organisationId,...(linked?{organisationName:customer.name,providerLink:{version:1,contractId:'canopy-orchard-enterprise',customerId:customer.id,customerName:customer.name,buyerOrganisationId:'customer',sellerOrganisationId:'orchard-msp',operatorOrganisationId:'orchard-msp',supportOrganisationId:'orchard-msp',planId:customer.planId,acceptedAt:s.clock,retailCents:customer.retailCents,supplierPeriodCents:projects.reduce((sum,project)=>sum+project.periodCents,0)+migration.periodCents,stages:projects.map(project=>({stage:project.stage,projectId:project.id,postingId:project.postingId,setupCents:project.setupCents,periodCents:project.periodCents})),siteIds:['north','south']},grant:null,migration:{version:1,projectId:migration.id,postingId:migration.postingId,setupCents:migration.setupCents,periodCents:migration.periodCents,internalFunding:null,customerAcceptedAt:null,cutoverAt:null,mspAcceptedAt:null,migrationId:null,status:'offered'}}:{}),startedAt:s.clock,budgetOpeningCents:OPENING_BUDGET,budgetCents:OPENING_BUDGET,spentCents:0,opening:null,repair:null,sites:{north:{owner:organisationId,platform:'legacy',protected:false,status:'effective'},south:{owner:organisationId,platform:'legacy',protected:false,status:'effective'}},outage:{at:s.clock+(linked?12:8),status:'scheduled',affectedSiteId:'north',lostMinutes:0},ledger:[]};
 }
 function quote(s,request,providerQuote){
  if(!s.customerIt||!request||typeof request!=='object'||Array.isArray(request))fail('CUSTOMER_IT_CAREER_REQUIRED');
  const keys=Object.keys(request).sort().join(',');if(keys!=='action,choice'&&keys!=='action'&&keys!=='action,cutoverAt')fail('INVALID_CUSTOMER_IT_QUOTE');
  const c=s.customerIt,blockers=[];let costCents=0,siteId=null,workMinutes=0;
  if(request.action==='opening'){
   const choice=choices[request.choice];if(!choice)fail('INVALID_CUSTOMER_IT_CHOICE');
   ({costCents,siteId,workMinutes}=choice);
   if(c.opening)blockers.push('CUSTOMER_IT_OPENING_ALREADY_FUNDED');
   if(s.clock+workMinutes>c.outage.at)blockers.push('CUSTOMER_IT_OPENING_WINDOW_CLOSED');
  }else if(request.action==='repair'){
   if(request.choice!==undefined)fail('INVALID_CUSTOMER_IT_QUOTE');costCents=REPAIR_COST;siteId='north';workMinutes=2;
   if(c.outage.status!=='interrupted')blockers.push('CUSTOMER_IT_NO_INTERRUPTED_SITE');
   if(c.repair)blockers.push('CUSTOMER_IT_REPAIR_ALREADY_FUNDED');
  }else if(request.action==='accept-grant'){
   if(request.choice!==undefined)fail('INVALID_CUSTOMER_IT_QUOTE');
   if(c.version<PREVIOUS_LINKED_VERSION)blockers.push('CUSTOMER_IT_CONTRACT_UNAVAILABLE');
   if(c.providerLink&&['exited','default'].includes(s.providerCampaign.customers.find(row=>row.id===c.providerLink.customerId)?.status))blockers.push('CUSTOMER_IT_PROVIDER_CUSTOMER_INACTIVE');
   if(!c.opening)blockers.push('CUSTOMER_IT_OPENING_REQUIRED');
   if(c.grant)blockers.push('CUSTOMER_IT_GRANT_ALREADY_ACCEPTED');
  }else if(request.action==='revoke-grant'){
   if(request.choice!==undefined)fail('INVALID_CUSTOMER_IT_QUOTE');
   if(!c.grant)blockers.push('CUSTOMER_IT_GRANT_REQUIRED');
   else if(c.grant.revokedAt!==null)blockers.push('CUSTOMER_IT_GRANT_REVOKED');
   else if(c.grant.expiresAt<=s.clock)blockers.push('CUSTOMER_IT_GRANT_EXPIRED');
   else if(c.migration&&['scheduled','verifying'].includes(c.migration.status))blockers.push('CUSTOMER_IT_CHANGE_IN_FLIGHT');
  }else if(request.action==='fund-south'){
   if(request.choice!==undefined||request.cutoverAt!==undefined)fail('INVALID_CUSTOMER_IT_QUOTE');costCents=MIGRATE_COST;siteId='south';workMinutes=4;
   if(c.version!==LINKED_VERSION)blockers.push('CUSTOMER_IT_MIGRATION_UNAVAILABLE');
   if(c.opening?.choice!=='protect')blockers.push('CUSTOMER_IT_PROTECTION_REQUIRED');
   if(c.migration?.internalFunding)blockers.push('CUSTOMER_IT_SOUTH_ALREADY_FUNDED');
   if(c.providerLink&&['exited','default'].includes(s.providerCampaign.customers.find(row=>row.id===c.providerLink.customerId)?.status))blockers.push('CUSTOMER_IT_PROVIDER_CUSTOMER_INACTIVE');
  }else if(request.action==='approve-window'||request.action==='rehearse-window'){
   if(request.choice!==undefined||!integer(request.cutoverAt,s.clock+3)||request.cutoverAt>s.clock+12)fail('INVALID_CUSTOMER_IT_WINDOW');
   if(c.version!==LINKED_VERSION)blockers.push('CUSTOMER_IT_MIGRATION_UNAVAILABLE');
   if(!c.opening||c.opening.choice==='protect'&&!c.migration?.internalFunding)blockers.push('CUSTOMER_IT_SOUTH_FUNDING_REQUIRED');
   if(!c.grant||c.grant.revokedAt!==null||c.grant.expiresAt<=request.cutoverAt+1)blockers.push('CUSTOMER_IT_ACTIVE_GRANT_REQUIRED');
   if(c.migration?.customerAcceptedAt!==null)blockers.push('CUSTOMER_IT_WINDOW_ALREADY_ACCEPTED');
   if(s.customerIt?.outage.status==='interrupted')blockers.push('CUSTOMER_IT_OUTAGE_UNRESOLVED');
   const project=s.providerCampaign.projects.find(row=>row.id===c.migration?.projectId),child=s.portfolio.customers.find(row=>row.id===c.providerLink?.customerId)?.root;
   if(project?.status!=='commissioning'||!child?.providerTasks?.some(row=>row.projectId===project?.id&&row.status==='waiting'))blockers.push('CUSTOMER_IT_MSP_MIGRATION_NOT_READY');
   if(!blockers.length&&typeof providerQuote==='function')blockers.push(...providerQuote(s,{action:'migration-decision',projectId:project.id,decision:request.action==='rehearse-window'?'rehearse':'go',cohort:['bea'],cutoverAt:request.cutoverAt}).blockers);
  }else fail('INVALID_CUSTOMER_IT_ACTION');
  if(c.budgetCents<costCents)blockers.push('CUSTOMER_IT_BUDGET_EXCEEDED');
  return {request:copy(request),atRevision:s.revision,organisationId:c.organisationId,siteId,costCents,budgetCents:c.budgetCents,budgetAfterCents:c.budgetCents-costCents,workMinutes,...(request.action==='accept-grant'?{contract:c.providerLink?copy(c.providerLink):null,grant:{grantor:c.organisationId,grantee:'orchard-msp',scope:['north','south'],actions:['configure','migrate'],expiresAt:s.clock+GRANT_MINUTES,escalation:'customer-it'}}:{}),...(request.action==='approve-window'?{migration:{projectId:c.migration?.projectId||null,cohort:['bea'],siteId:'south',cutoverAt:request.cutoverAt,mspSetupCents:c.migration?.setupCents||0,mspPeriodCents:c.migration?.periodCents||0}}:{}),blockers};
 }
 function command(s,request,providerQuote,providerCommit){
  if(!request||typeof request!=='object'||Array.isArray(request)||!integer(request.quoteRevision)||Object.keys(request).some(k=>!['action','choice','cutoverAt','quoteRevision'].includes(k)))fail('INVALID_CUSTOMER_IT_COMMAND');
  if(request.quoteRevision!==s.revision)fail('STALE_CUSTOMER_IT_QUOTE');
  const q=quote(s,{action:request.action,...(request.choice!==undefined?{choice:request.choice}:{}),...(request.cutoverAt!==undefined?{cutoverAt:request.cutoverAt}:{})},providerQuote);if(q.blockers.length)fail(q.blockers[0]);
  if(request.action==='accept-grant'){s.customerIt.grant={version:1,contractId:s.customerIt.providerLink.contractId,grantor:s.customerIt.organisationId,grantee:'orchard-msp',scope:['north','south'],actions:['configure','migrate'],escalation:'customer-it',acceptedAt:s.clock,expiresAt:s.clock+GRANT_MINUTES,revokedAt:null};return;}
  if(request.action==='revoke-grant'){s.customerIt.grant.revokedAt=s.clock;return;}
  if(request.action==='rehearse-window'){
   if(typeof providerCommit!=='function')fail('CUSTOMER_IT_MSP_ACCEPTANCE_REQUIRED');
   providerCommit(s,{action:'migration-decision',projectId:s.customerIt.migration.projectId,decision:'rehearse',cohort:['bea'],cutoverAt:request.cutoverAt,quoteRevision:s.revision});return;
  }
  if(request.action==='approve-window'){
   if(typeof providerCommit!=='function')fail('CUSTOMER_IT_MSP_ACCEPTANCE_REQUIRED');
   providerCommit(s,{action:'migration-decision',projectId:s.customerIt.migration.projectId,decision:'go',cohort:['bea'],cutoverAt:request.cutoverAt,quoteRevision:s.revision});
   const child=s.portfolio.customers.find(row=>row.id===s.customerIt.providerLink.customerId)?.root,task=child?.providerTasks?.find(row=>row.projectId===s.customerIt.migration.projectId);
   if(!task?.migrationId)fail('CUSTOMER_IT_MSP_ACCEPTANCE_REQUIRED');
   Object.assign(s.customerIt.migration,{customerAcceptedAt:s.clock,cutoverAt:request.cutoverAt,mspAcceptedAt:s.clock,migrationId:task.migrationId,status:'scheduled'});return;
  }
  const c=s.customerIt,entry={id:`customer-it-entry-${c.ledger.length+1}`,at:s.clock,category:'cost',reason:request.action==='opening'?'customer-estate-opening':request.action==='fund-south'?'customer-south-migration':'customer-outage-repair',siteId:q.siteId,cents:q.costCents};
  c.budgetCents-=q.costCents;c.spentCents+=q.costCents;c.ledger.push(entry);
  if(request.action==='fund-south'){
   c.migration.internalFunding={acceptedAt:s.clock,effectiveAt:s.clock+q.workMinutes,costCents:q.costCents,entryId:entry.id};c.sites.south.status='provisioning';
  }else if(request.action==='opening'){
   c.opening={choice:request.choice,acceptedAt:s.clock,effectiveAt:s.clock+q.workMinutes,siteId:q.siteId,costCents:q.costCents,entryId:entry.id};
   c.sites[q.siteId].status='provisioning';
  }else{c.repair={acceptedAt:s.clock,effectiveAt:s.clock+q.workMinutes,siteId:q.siteId,costCents:q.costCents,entryId:entry.id};c.sites.north.status='provisioning';}
 }
 function afterMinute(s,setServiceFault){
  const c=s.customerIt;if(!c)return;
  if(c.opening&&s.clock>=c.opening.effectiveAt){const site=c.sites[c.opening.siteId];if(c.opening.choice==='protect')site.protected=true;else if(c.version<LINKED_VERSION)site.platform='managed';if(site.status==='provisioning'&&(c.opening.siteId!=='south'||c.version<LINKED_VERSION))site.status='effective';}
  if(s.clock===c.outage.at){c.outage.status=c.sites.north.protected?'protected':'interrupted';if(c.outage.status==='interrupted'){c.sites.north.status='interrupted';if(c.version>=SHARED_OUTAGE_VERSION)setServiceFault('OUTAGE');}}
  if(c.outage.status==='interrupted')c.outage.lostMinutes++;
  if(c.repair&&s.clock>=c.repair.effectiveAt&&c.outage.status==='interrupted'){c.sites.north.status='effective';c.outage.status='recovered';if(c.version>=SHARED_OUTAGE_VERSION)setServiceFault(null);}
 }
 function afterProviderMinute(s){
  const c=s.customerIt;if(c?.version!==LINKED_VERSION||!c.migration?.migrationId)return;
  const child=s.portfolio.customers.find(row=>row.id===c.providerLink.customerId)?.root,migration=child?.operations?.migrations.find(row=>row.id===c.migration.migrationId);
  if(!migration)fail('CUSTOMER_IT_MIGRATION_MISSING');
  c.migration.status=migration.status;
  if(migration.status==='complete'){c.sites.south.platform='managed';c.sites.south.status='effective';}
  else if(migration.status==='failed')c.sites.south.status='effective';
 }
 function inspect(s,providerQuote){if(!s.customerIt)return null;const c=s.customerIt,customer=c.providerLink&&s.providerCampaign.customers.find(row=>row.id===c.providerLink.customerId),child=customer&&s.portfolio.customers.find(row=>row.id===customer.portfolioId)?.root;return {...copy(c),clock:s.clock,revision:s.revision,openingQuotes:Object.keys(choices).map(choice=>quote(s,{action:'opening',choice})),repairQuote:quote(s,{action:'repair'}),...(c.version===LINKED_VERSION?{fundSouthQuote:quote(s,{action:'fund-south'},providerQuote),windowQuotes:[3,6,9,12].map(minutes=>quote(s,{action:'approve-window',cutoverAt:s.clock+minutes},providerQuote)),rehearsalQuotes:[3,6,9,12].map(minutes=>quote(s,{action:'rehearse-window',cutoverAt:s.clock+minutes},providerQuote)),migrationProjectStatus:s.providerCampaign.projects.find(row=>row.id===c.migration.projectId)?.status||null,childPlacement:child?.operations?.placements?.bea||'phone'}:{}),...(c.providerLink?{grantQuote:quote(s,{action:'accept-grant'}),revokeQuote:quote(s,{action:'revoke-grant'}),grantStatus:c.grant?(c.grant.revokedAt!==null?'revoked':c.grant.expiresAt>s.clock?'active':'expired'):'pending',providerService:{customerId:customer.id,status:customer.status,stages:Object.fromEntries(Object.entries(customer.stages).map(([key,stage])=>[key,stage?.status||null])),retailCents:customer.retailCents,accessFault:child.resources.access.fault,readyMinutes:customer.period.serviceReadyMinutes,offered:customer.metrics.offered,failed:customer.metrics.failed}}:{}),mspTreasuryCents:s.business?.balance?.cash??null};}
 function validate(s){
  const c=s.customerIt;if(!c)return true;
  const linked=c.version>=PREVIOUS_LINKED_VERSION;
  if(!s.providerCampaign||s.careerRole!=='customer-it'||s.experience?.kind!=='campaign'||s.scenario!=='enterprise'||!exact(c,['version','role','organisationId','startedAt','budgetOpeningCents','budgetCents','spentCents','opening','repair','sites','outage','ledger',...(linked?['organisationName','providerLink','grant',...(c.version===LINKED_VERSION?['migration']:[])]:[])])||![VERSION,PREVIOUS_LINKED_VERSION,SHARED_OUTAGE_VERSION,LINKED_VERSION].includes(c.version)||c.role!=='customer-it'||c.organisationId!==(linked?'customer':'cedar-customer')||!integer(c.startedAt)||c.startedAt>s.clock||c.budgetOpeningCents!==OPENING_BUDGET||!integer(c.budgetCents)||!integer(c.spentCents)||c.budgetCents+c.spentCents!==OPENING_BUDGET||!Array.isArray(c.ledger)||c.ledger.length>2)fail('INVALID_CUSTOMER_IT_CAREER');
  if(linked){
   const link=c.providerLink,customer=s.providerCampaign.customers.find(row=>row.id===link?.customerId),stages=['base','carrier','partner'],originalRetail=customer?.retailAgreementHistory?.entries?.[0]?.priceCents??customer?.retailAgreement?.priceCents;
   if(!exact(link,['version','contractId','customerId','customerName','buyerOrganisationId','sellerOrganisationId','operatorOrganisationId','supportOrganisationId','planId','acceptedAt','retailCents','supplierPeriodCents','stages','siteIds'])||link.version!==1||link.contractId!=='canopy-orchard-enterprise'||link.customerId!=='starter-customer'||customer?.name!=='Canopy Group'||link.customerName!==customer.name||link.buyerOrganisationId!=='customer'||link.sellerOrganisationId!=='orchard-msp'||link.operatorOrganisationId!=='orchard-msp'||link.supportOrganisationId!=='orchard-msp'||link.planId!=='steady'||customer.planId!==link.planId||link.acceptedAt!==c.startedAt||link.retailCents!==originalRetail||!Array.isArray(link.stages)||link.stages.length!==3||!Array.isArray(link.siteIds)||link.siteIds.join(',')!=='north,south'||c.organisationName!==customer.name||!s.business.organisations.customer?.roles.includes('customer')||!s.business.organisations['orchard-msp']?.roles.includes('msp'))fail('INVALID_CUSTOMER_IT_PROVIDER_LINK');
   let supplier=0;for(const [index,row] of link.stages.entries()){const project=s.providerCampaign.projects.find(p=>p.id===row?.projectId);if(!exact(row,['stage','projectId','postingId','setupCents','periodCents'])||row.stage!==stages[index]||!project||project.customerId!==customer.id||project.stage!==row.stage||project.kind!=='stage'||project.postingId!==row.postingId||project.setupCents!==row.setupCents||project.periodCents!==row.periodCents||project.acceptedAt!==link.acceptedAt)fail('INVALID_CUSTOMER_IT_PROVIDER_LINK');supplier+=row.periodCents;}if(supplier+(c.version===LINKED_VERSION?c.migration?.periodCents||0:0)!==link.supplierPeriodCents)fail('INVALID_CUSTOMER_IT_PROVIDER_LINK');
   const grant=c.grant;if(grant!==null&&(!exact(grant,['version','contractId','grantor','grantee','scope','actions','escalation','acceptedAt','expiresAt','revokedAt'])||grant.version!==1||grant.contractId!==link.contractId||grant.grantor!==c.organisationId||grant.grantee!=='orchard-msp'||grant.scope?.join(',')!=='north,south'||grant.actions?.join(',')!=='configure,migrate'||grant.escalation!=='customer-it'||!integer(grant.acceptedAt,c.startedAt)||grant.acceptedAt>s.clock||grant.expiresAt!==grant.acceptedAt+GRANT_MINUTES||grant.revokedAt!==null&&(!integer(grant.revokedAt,grant.acceptedAt)||grant.revokedAt>s.clock||grant.revokedAt>=grant.expiresAt)||!c.opening||grant.acceptedAt<c.opening.acceptedAt))fail('INVALID_CUSTOMER_IT_GRANT');
   if(c.version===LINKED_VERSION){
    const m=c.migration,project=s.providerCampaign.projects.find(row=>row.id===m?.projectId),posting=s.business.ledger.find(row=>row.id===m?.postingId),child=s.portfolio.customers.find(row=>row.id===customer.id)?.root,task=child?.providerTasks?.find(row=>row.projectId===m?.projectId),native=child?.operations?.migrations.find(row=>row.id===m?.migrationId);
    const prunedPosting=!posting&&/^entry-([1-9]\d*)$/.test(m?.postingId||'')&&Number(m.postingId.slice(6))<=(s.business.ledgerPrunedThrough||0);
    if(!exact(m,['version','projectId','postingId','setupCents','periodCents','internalFunding','customerAcceptedAt','cutoverAt','mspAcceptedAt','migrationId','status'])||m.version!==1||!project||project.customerId!==customer.id||project.kind!=='operation'||project.operationId!=='migration'||project.acceptedAt!==c.startedAt||project.postingId!==m.postingId||project.setupCents!==m.setupCents||project.periodCents!==m.periodCents||!prunedPosting&&(!posting||posting.category!=='cost'||posting.cents!==m.setupCents||posting.projectId!==m.projectId||posting.customerId!==customer.id)||s.migrationDecisionVersion!==1||s.migrationReservationVersion!==1||!['offered','scheduled','verifying','complete','failed'].includes(m.status))fail('INVALID_CUSTOMER_IT_MIGRATION');
    if(m.internalFunding!==null&&(c.opening?.choice!=='protect'||!exact(m.internalFunding,['acceptedAt','effectiveAt','costCents','entryId'])||m.internalFunding.costCents!==MIGRATE_COST||m.internalFunding.effectiveAt!==m.internalFunding.acceptedAt+4||m.internalFunding.acceptedAt<c.opening.acceptedAt||m.internalFunding.acceptedAt>s.clock))fail('INVALID_CUSTOMER_IT_MIGRATION');
    if(m.customerAcceptedAt===null){if(m.cutoverAt!==null||m.mspAcceptedAt!==null||m.migrationId!==null||m.status!=='offered'||native)fail('INVALID_CUSTOMER_IT_MIGRATION');}
    else if(!integer(m.customerAcceptedAt,c.startedAt)||m.customerAcceptedAt>s.clock||m.mspAcceptedAt!==m.customerAcceptedAt||!integer(m.cutoverAt,m.customerAcceptedAt+3)||m.cutoverAt>m.customerAcceptedAt+12||!grant||grant.acceptedAt>m.customerAcceptedAt||grant.revokedAt!==null&&grant.revokedAt<=m.customerAcceptedAt||grant.expiresAt<=m.cutoverAt+1||!c.opening||c.opening.choice==='protect'&&!m.internalFunding||!task||task.migrationId!==m.migrationId||!native||native.cutoverAt!==m.cutoverAt||native.target!=='migration-phone'||native.identities?.join(',')!=='bea'||m.status!==native.status||(child.operations.placements.bea||'phone')!==(m.status==='complete'?'migration-phone':'phone'))fail('INVALID_CUSTOMER_IT_MIGRATION');
   }
  }
  if(!exact(c.sites,['north','south'])||!exact(c.sites.north,['owner','platform','protected','status'])||!exact(c.sites.south,['owner','platform','protected','status'])||!exact(c.outage,['at','status','affectedSiteId','lostMinutes'])||c.outage.at!==c.startedAt+(c.version>=SHARED_OUTAGE_VERSION?12:8)||c.outage.affectedSiteId!=='north'||!integer(c.outage.lostMinutes))fail('INVALID_CUSTOMER_IT_ESTATE');
  const entries=[c.opening,c.migration?.internalFunding,c.repair].filter(Boolean);if(entries.length!==c.ledger.length||c.spentCents!==entries.reduce((n,x)=>n+x.costCents,0))fail('INVALID_CUSTOMER_IT_BUDGET');
  for(const [index,record] of entries.entries()){
   const isOpening=record===c.opening,isSouth=record===c.migration?.internalFunding,choice=isOpening?choices[record.choice]:null,cost=isOpening?choice?.costCents:isSouth?MIGRATE_COST:REPAIR_COST,duration=isOpening?choice?.workMinutes:isSouth?4:2,siteId=isOpening?choice?.siteId:isSouth?'south':'north',row=c.ledger[index];
   if(!exact(record,isOpening?['choice','acceptedAt','effectiveAt','siteId','costCents','entryId']:isSouth?['acceptedAt','effectiveAt','costCents','entryId']:['acceptedAt','effectiveAt','siteId','costCents','entryId'])||!exact(row,['id','at','category','reason','siteId','cents'])||!integer(record.acceptedAt,c.startedAt)||record.acceptedAt>s.clock||record.effectiveAt!==record.acceptedAt+duration||isOpening&&record.effectiveAt>c.outage.at||!isSouth&&record.siteId!==siteId||record.costCents!==cost||record.entryId!==row.id||row.id!==`customer-it-entry-${index+1}`||row.at!==record.acceptedAt||row.category!=='cost'||row.reason!==(isOpening?'customer-estate-opening':isSouth?'customer-south-migration':'customer-outage-repair')||row.siteId!==siteId||row.cents!==cost)fail('INVALID_CUSTOMER_IT_LEDGER');
  }
  if(s.commands.length<1000){const commands=s.commands.filter(row=>row.command?.type==='customer-it'&&['opening','fund-south','repair'].includes(row.command.command.action)),grants=s.commands.filter(row=>row.command?.type==='customer-it'&&row.command.command.action==='accept-grant'),revokes=s.commands.filter(row=>row.command?.type==='customer-it'&&row.command.command.action==='revoke-grant'),windows=s.commands.filter(row=>row.command?.type==='customer-it'&&row.command.command.action==='approve-window');if(commands.length!==entries.length||commands.some((row,index)=>row.at!==entries[index].acceptedAt||row.command.command.action!==(entries[index]===c.opening?'opening':entries[index]===c.migration?.internalFunding?'fund-south':'repair')||row.command.command.choice!==entries[index].choice)||grants.length!==(c.grant?1:0)||c.grant&&grants[0].at!==c.grant.acceptedAt||revokes.length!==(c.grant?.revokedAt!==null&&c.grant?.revokedAt!==undefined?1:0)||revokes.length&&revokes[0].at!==c.grant.revokedAt||windows.length!==(c.migration?.customerAcceptedAt!==null&&c.migration?.customerAcceptedAt!==undefined?1:0)||windows.length&&(windows[0].at!==c.migration.customerAcceptedAt||windows[0].command.command.cutoverAt!==c.migration.cutoverAt))fail('INVALID_CUSTOMER_IT_COMMAND_LINEAGE');}
  if(c.repair&&(c.repair.acceptedAt<c.outage.at||c.opening&&c.repair.acceptedAt<c.opening.acceptedAt))fail('INVALID_CUSTOMER_IT_REPAIR');
  const north=c.sites.north,south=c.sites.south,protectedSite=!!c.opening&&c.opening.choice==='protect'&&s.clock>=c.opening.effectiveAt,migrated=c.version===LINKED_VERSION?c.migration.status==='complete':!!c.opening&&c.opening.choice==='migrate'&&s.clock>=c.opening.effectiveAt,repaired=!!c.repair&&s.clock>=c.repair.effectiveAt,southFunded=c.opening?.choice==='migrate'||!!c.migration?.internalFunding;
  if(north.owner!==c.organisationId||south.owner!==c.organisationId||north.platform!=='legacy'||south.platform!==(migrated?'managed':'legacy')||north.protected!==protectedSite||south.protected!==false||north.status!==(s.clock<c.outage.at?c.opening?.choice==='protect'&&s.clock<c.opening.effectiveAt?'provisioning':'effective':protectedSite||repaired?'effective':c.repair?'provisioning':'interrupted')||south.status!==(c.version===LINKED_VERSION?southFunded&&c.migration.status!=='complete'&&c.migration.status!=='failed'?'provisioning':'effective':c.opening?.choice==='migrate'&&s.clock<c.opening.effectiveAt?'provisioning':'effective'))fail('INVALID_CUSTOMER_IT_ESTATE');
  const status=s.clock<c.outage.at?'scheduled':protectedSite?'protected':repaired?'recovered':'interrupted';if(c.outage.status!==status||c.outage.lostMinutes!==(status==='interrupted'?s.clock-c.outage.at+1:status==='recovered'?c.repair.effectiveAt-c.outage.at+1:0))fail('INVALID_CUSTOMER_IT_OUTAGE');
  if(c.version>=SHARED_OUTAGE_VERSION){
   const child=s.portfolio.customers.find(row=>row.id===c.providerLink.customerId)?.root,commands=child?.commands||[],faults=commands.filter(row=>row.command?.type==='fault'&&row.command.id==='access');
   if(!child||child.resources.access.fault!==(status==='interrupted'?'OUTAGE':null))fail('INVALID_CUSTOMER_IT_SERVICE_LINK');
   // The child keeps only its newest 128 commands. Once the fault command is
   // archived, the matching site and current child fault remain authoritative.
   const archivedFault=at=>child.providerArchive?.commands>0&&commands.length>0&&commands[0].at>at;
   if(s.clock>=c.outage.at&&s.clock-c.outage.at<1000&&!protectedSite&&!faults.some(row=>row.at===c.outage.at-1&&row.command.fault==='OUTAGE')&&!archivedFault(c.outage.at-1))fail('INVALID_CUSTOMER_IT_SERVICE_LINK');
   if(repaired&&s.clock-c.repair.effectiveAt<1000&&!faults.some(row=>row.at===c.repair.effectiveAt-1&&row.command.fault===null)&&!archivedFault(c.repair.effectiveAt-1))fail('INVALID_CUSTOMER_IT_SERVICE_LINK');
  }
  return true;
 }
 function source(){return `const SOC_CUSTOMER_IT_CAREER=(${socCustomerItCareerKernel.toString()})();`;}
 return {VERSION,create,quote,command,afterMinute,afterProviderMinute,inspect,validate,source};
}
const SOC_CUSTOMER_IT_CAREER=socCustomerItCareerKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_CUSTOMER_IT_CAREER;
