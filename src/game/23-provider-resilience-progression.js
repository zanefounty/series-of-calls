/* Pure Provider facts and retained receipt validation for the LN/RD resilience goals. */
function socProviderResilienceProgressionKernel(){
 'use strict';
 const VERSION=1,CONTENT='provider-resilience-progression-1';
 const LN=['progress','goal','ln'].join('.'),RD=['progress','goal','rd'].join('.');
 const NAMES=Object.freeze({[LN]:'Second site connected',[RD]:'The scenic route has a backup'});
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(x);
 const goalId=id=>`progress.goal.${id}`;
 function sequenceApi(){return typeof SOC_PROVIDER_RESILIENCE_SEQUENCE!=='undefined'?SOC_PROVIDER_RESILIENCE_SEQUENCE:(typeof require==='function'?require('./23-provider-resilience-sequence.js'):null);}
 function customerRoot(s,c,hooks={}){return typeof hooks.customerRoot==='function'?hooks.customerRoot(s,c.portfolioId):s.portfolio?.customers?.find(x=>x.id===c.portfolioId)?.root||c.root||null;}
 function paidOperation(s,c,operationId,at){
  const rows=(s.providerCampaign.projects||[]).filter(x=>x.customerId===c.id&&x.kind==='operation'&&x.operationId===operationId&&x.status==='complete'&&integer(x.completedAt)&&x.completedAt<=at);
  return rows.find(project=>{
   if(!id(project.id)||!id(project.postingId)||!integer(project.acceptedAt)||!integer(project.setupCents,1))return false;
   const posting=s.business?.ledger?.find(x=>x.id===project.postingId);
   if(posting)return posting.category==='cost'&&posting.reason==='provider-operation'&&posting.cents===project.setupCents&&posting.customerId===c.id&&posting.projectId===project.id;
   const sequence=/^entry-([1-9]\d*)$/.exec(project.postingId);
   return !!sequence&&Number(sequence[1])<=(s.business?.ledgerPrunedThrough||0);
  })||null;
 }
 function installations(s,c,child,at,options={}){
  const marker=child?.providerResilience;
  if(!marker||marker.version!==1||!Array.isArray(marker.installations))return {rows:[],missing:['PAID_TWO_SITE_TRANSPORT_REQUIRED']};
  const projects=Array.isArray(s.providerCampaign?.projects)?s.providerCampaign.projects:[];
  const operations=['primary-upstream','diverse-upstream','managed-diverse-upstream'];
  const rows=marker.installations.filter(row=>row&&typeof row.projectId==='string'&&operations.includes(projects.find(p=>p?.id===row.projectId)?.operationId));
  const primaryRow=rows.find(row=>projects.find(p=>p?.id===row.projectId)?.operationId==='primary-upstream');
  const primary=primaryRow&&paidOperation(s,c,'primary-upstream',at);
  const missing=[];
  if(!primaryRow||!primary||primaryRow.projectId!==primary.id||primaryRow.postingId!==primary.postingId)missing.push('PAID_PRIMARY_SITE_PROJECT_REQUIRED');
  const names={head:`${c.id}-head`,branch:`${c.id}-branch`,link:`${c.id}-a-primary`};
  const siteRows=primaryRow?.sites||[],linkRows=primaryRow?.links||[];
  if(siteRows.length!==2||!siteRows.some(x=>x.id===names.head)||!siteRows.some(x=>x.id===names.branch)||new Set(siteRows.map(x=>x.id)).size!==2)missing.push('TWO_DISTINCT_PAID_SITES_REQUIRED');
  if(linkRows.length!==1||linkRows[0]?.id!==names.link)missing.push('PAID_INTER_SITE_LINK_REQUIRED');
  const transport=child?.transport,installedSites=[],installedLinks=[];
  for(const row of siteRows){
   const node=transport?.sites?.[row.id];
   if(!node||node.generation!==row.generation||node.provisioning?.status!=='ready'||node.provisioning?.generation!==row.generation||node.effectiveGeneration!==row.generation||!node.effective||options.historical!==true&&(node.observed?.available!==true||node.observed?.power!==true||transport.domains?.[node.effective.domain]===true))missing.push(`SITE_NOT_EFFECTIVE:${row.id}`);
   else installedSites.push({id:row.id,generation:row.generation,domain:node.effective.domain});
  }
  for(const row of linkRows){
   const node=transport?.links?.[row.id];
   if(!node||node.generation!==row.generation||node.provisioning?.status!=='ready'||node.provisioning?.generation!==row.generation||node.effectiveGeneration!==row.generation||!node.effective||options.historical!==true&&(node.observed?.available!==true||node.observed?.power!==true||transport.domains?.[node.effective.domain]===true))missing.push(`LINK_NOT_EFFECTIVE:${row.id}`);
   else installedLinks.push({id:row.id,generation:row.generation,domain:node.effective.domain,from:node.effective.from,to:node.effective.to,capacityMbps:node.effective.capacityMbps,latencyMs:node.effective.latencyMs});
  }
  const expectedBindings=[['carrier',names.head],['desk',names.branch],['identity',names.head],['room',names.branch],['service',names.branch]];
  if(expectedBindings.some(([resource,site])=>transport?.bindings?.[resource]!==site))missing.push('PAID_SERVICE_RESOURCES_MUST_SPAN_BOTH_SITES');
  return {rows:primaryRow&&primary?[{projectId:primary.id,postingId:primary.postingId,completedAt:primary.completedAt,sites:installedSites,links:installedLinks,bindings:expectedBindings.map(([resource,site])=>({resource,site}))}]:[],primary,primaryRow,missing:[...new Set(missing)]};
 }
 function sequenceRows(s,c,child){return (s.providerCampaign.jobs||[]).filter(job=>job.customerId===c.id&&job.resilienceSequence).map(job=>({job,result:sequenceApi().evaluate(s,c.id,job,{child})}));}
 function baselineProof(s,c,child,install,options={}){
  const missing=[...install.missing],candidates=[];
  if(!install.primary){missing.push('PAID_PRIMARY_SITE_PROJECT_REQUIRED');return {chosen:null,missing:[...new Set(missing)]};}
  for(const {job} of sequenceRows(s,c,child)){
   try{sequenceApi().validateJob(s,c,job,child);}catch{continue;}
   const seq=job.resilienceSequence,phase=seq.phases?.[0],interaction=phase&&child.interactions?.find(x=>x.id===phase.interactionId);
   if(!phase||!interaction||interaction.phase!=='resolved'||!integer(interaction.startedAt)||!integer(interaction.finishedAt)||interaction.finishedAt> (options.at??s.clock)||interaction.startedAt<install.primary?.completedAt||interaction.from!=='alex'||interaction.tenant!==child.tenant||interaction.caseId!==job.caseId||interaction.channel!=='voice'||interaction.probe===true||interaction.agent===undefined||interaction.media?.in!==true||interaction.media?.out!==true||interaction.context!==true||!Array.isArray(interaction.obligations)||interaction.obligations.length)continue;
   const admitted=(interaction.trace||[]).find(row=>row.code==='MEDIA_TRANSPORT_ADMITTED'&&row.observation?.phase==='admitted'&&row.observation.ready===true&&row.observation.selected?.ready===true&&row.observation.selected?.latencyMs<=500&&row.observation.selected?.edges?.length===1&&row.observation.selected.edges[0].id===`${c.id}-a-primary`&&row.observation.selected.edges[0].domain===`${c.id}-primary-domain`&&row.at===interaction.startedAt);
   if(!admitted)continue;
   candidates.push({job,sequence:seq,phase,interaction,admitted:admitted.observation});
  }
  if(!candidates.length)missing.push('SUCCESSFUL_INTER_SITE_HUMAN_JOURNEY_REQUIRED');
  const chosen=candidates.sort((a,b)=>a.interaction.finishedAt-b.interaction.finishedAt||a.job.id.localeCompare(b.job.id))[0];
  return {chosen,missing:[...new Set(missing)]};
 }
 function globalPeriod(s,period){return s.providerCampaign.periodHistory?.find(row=>row.period===period&&row.from===period*60&&row.to===(period+1)*60&&row.settledAt===(period+1)*60)||null;}
 function periodProof(s,c,sequenceResult){
  const missing=[],job=sequenceResult.job,period=job.periodIndex,history=c.history?.find(row=>row.period===period),global=globalPeriod(s,period),retained=job.resilienceSettlement;
  if(!retained||retained.version!==1||!retained.customer||!retained.provider){missing.push('RETAINED_SEQUENCE_PERIOD_SETTLEMENT_REQUIRED');return {missing,proof:null};}
  const settledCustomer=retained.customer,settledProvider=retained.provider;
  if(!same(settledCustomer,history||settledCustomer)||!same(settledProvider,global||settledProvider)||settledCustomer.period!==period||settledProvider.period!==period){missing.push('RETAINED_SEQUENCE_PERIOD_SETTLEMENT_MISMATCH');}
  const revenue=s.business.ledger.find(row=>row.id===retained.revenuePostingId),costs=(retained.costPostingIds||[]).map(id=>s.business.ledger.find(row=>row.id===id));
  if(settledCustomer.basis!=='provider-period-history-v1'||settledCustomer.fullPeriod!==true||settledCustomer.from!==period*60||settledCustomer.to!==(period+1)*60||settledCustomer.settledAt!==settledCustomer.to||settledCustomer.due!==24||settledCustomer.completedOnTime<22||settledCustomer.qualified!==true)missing.push('QUALIFIED_24_CASE_PERIOD_WITH_22_ON_TIME_REQUIRED');
  if(settledProvider.qualified!==true||settledProvider.due!==24||settledProvider.completedOnTime<22||settledProvider.solvency!=='current'||!Number.isSafeInteger(settledProvider.operatingResult)||settledProvider.operatingResult<=0||!retained.revenuePostingId||!Array.isArray(retained.costPostingIds)||!retained.costPostingIds.length||costs.some((row,index)=>!row&&Number(retained.costPostingIds[index]?.slice('entry-'.length))>(s.business.ledgerPrunedThrough||0)))missing.push('POSITIVE_CENTRAL_PERIOD_SETTLEMENT_REQUIRED');
  if(s.business.solvency?.status!=='current'||s.business.solvency?.payable!==0)missing.push('CURRENT_TREASURY_WITH_NO_ARREARS_REQUIRED');
  const obligations=(s.providerCampaign.incidents||[]).filter(row=>row.customerId===c.id&&row.createdAt<=s.clock&&['active','acknowledged'].includes(row.status)&&row.dueAt<=s.clock);
  if(obligations.length)missing.push('NO_OVERDUE_CRITICAL_CUSTOMER_OBLIGATIONS_REQUIRED');
  return {missing:[...new Set(missing)],proof:{version:1,core:copy(retained),criticalAtSettlement:(s.providerCampaign.incidents||[]).filter(row=>row.customerId===c.id&&row.createdAt<=settledCustomer.to&&(['active','acknowledged'].includes(row.status)||row.resolvedAt>settledCustomer.to)&&row.dueAt<=settledCustomer.to).map(row=>row.id).sort(),criticalAtClaim:obligations.map(row=>row.id).sort()}};
 }
 function evaluateCustomer(s,c,hooks={}){
  const child=customerRoot(s,c,hooks),at=s.clock;
  if(!child||child.providerCustomer?.id!==c.id||child.providerCampaign)return {ln:{missing:['VALIDATED_PROVIDER_CUSTOMER_ROOT_REQUIRED']},rd:{missing:['VALIDATED_PROVIDER_CUSTOMER_ROOT_REQUIRED']}};
  const install=installations(s,c,child,at),baseline=baselineProof(s,c,child,install,{at});
  const base=baseline.chosen,lnMissing=[...baseline.missing];
  const lnEvidence=base?{kind:'provider-resilience-ln',version:1,customerId:c.id,portfolioId:c.portfolioId,market:c.market,projectId:install.primary.id,postingId:install.primary.postingId,installation:copy(install.rows[0]),jobId:base.job.id,caseId:base.job.caseId,phase:{interactionId:base.interaction.id,startedAt:base.interaction.startedAt,finishedAt:base.interaction.finishedAt,requestedMinutes:base.phase.requestedMinutes,observedUsageMinutes:base.phase.observedUsageMinutes,assignedPerson:base.interaction.agent,admission:copy(base.admitted)},interval:{from:base.interaction.startedAt,to:base.interaction.finishedAt},basis:'provider-resilience-ln-v1'}:null;
  if(!lnEvidence)lnMissing.push('SUCCESSFUL_INTER_SITE_HUMAN_JOURNEY_REQUIRED');
  const seqResults=sequenceRows(s,c,child).filter(row=>row.result.eligible).sort((a,b)=>a.job.completedAt-b.job.completedAt||a.job.id.localeCompare(b.job.id));
  const full=seqResults.map(row=>({job:row.job,evidence:row.result.evidence,...periodProof(s,c,row)})).find(row=>row.missing.length===0)||null;
  let rdEvidence=null,rdMissing=[];
  if(!install.primary||install.missing.length)rdMissing.push(...install.missing);
  if(!seqResults.length)rdMissing.push('COMPLETE_THREE_PHASE_FAILED_PATH_SEQUENCE_REQUIRED');
  if(!full){
   if(seqResults.length){for(const candidate of seqResults){const result=periodProof(s,c,candidate);rdMissing.push(...result.missing);}}
   else rdMissing.push('QUALIFIED_24_CASE_PERIOD_WITH_22_ON_TIME_REQUIRED','POSITIVE_CENTRAL_PERIOD_SETTLEMENT_REQUIRED');
  }
  if(full){rdEvidence={kind:'provider-resilience-rd',version:1,customerId:c.id,portfolioId:c.portfolioId,market:c.market,projectId:full.evidence.projectId,postingId:full.evidence.postingId,jobId:full.job.id,caseId:full.job.caseId,sequence:copy(full.evidence),settlement:copy(full.proof),criticalAtClaim:copy(full.proof.criticalAtClaim),claimedAt:s.clock,interval:{from:full.evidence.phases[0].startedAt,to:full.proof.core.customer.to},basis:'provider-resilience-rd-v1'};}
  return {ln:{status:lnEvidence&&!lnMissing.length?'ready':'incomplete',missing:[...new Set(lnMissing)],evidence:lnEvidence},rd:{status:rdEvidence?'ready':'incomplete',missing:[...new Set(rdMissing)],evidence:rdEvidence}};
 }
 function evaluate(s,hooks={}){
  if(!s||s.experience?.version!==1||s.experience?.kind!=='campaign'||s.experience?.custom!==false||s.providerCampaign?.pack!=='soc-provider-campaign-1')fail('PROVIDER_RESILIENCE_PROGRESSION_CAMPAIGN_REQUIRED');
  const ln=[],rd=[];
  for(const c of s.providerCampaign.customers||[]){if(!['active','renewal'].includes(c.status))continue;const result=evaluateCustomer(s,c,hooks);if(result.ln.status==='ready')ln.push(result.ln.evidence);if(result.rd.status==='ready')rd.push(result.rd.evidence);}
  const byTime=(a,b)=>a.interval.to-b.interval.to||a.customerId.localeCompare(b.customerId),chosenLn=ln.sort(byTime)[0]||null,chosenRd=rd.sort(byTime)[0]||null;
  const all=(s.providerCampaign.customers||[]).filter(c=>['active','renewal'].includes(c.status)).map(c=>({customer:c,...evaluateCustomer(s,c,hooks)}));
  const missingFor=key=>all.flatMap(x=>x[key].missing);
  return {pack:'provider-resilience-progression',version:VERSION,contentVersion:CONTENT,asOf:s.clock,goals:{[LN]:{id:LN,name:NAMES[LN],status:chosenLn?'ready':'incomplete',missing:chosenLn?[]:[...new Set(missingFor('ln'))],evidence:chosenLn},[RD]:{id:RD,name:NAMES[RD],status:chosenRd?'ready':'incomplete',missing:chosenRd?[]:[...new Set(missingFor('rd'))],evidence:chosenRd}}};
 }
 function validateEvidence(s,sourceId,customerId,evidence,hooks={},options={}){
  if(![LN,RD].includes(sourceId)||!id(customerId)||!evidence||evidence.customerId!==customerId)return false;
  const customer=s.providerCampaign?.customers?.find(row=>row.id===customerId);if(!customer||evidence.portfolioId!==customer.portfolioId||evidence.market!==customer.market||!integer(evidence.interval?.from)||!integer(evidence.interval?.to)||evidence.interval.to<evidence.interval.from)return false;
  const child=customerRoot(s,customer,hooks);if(!child||child.providerCustomer?.id!==customerId)return false;
  const install=installations(s,customer,child,evidence.interval.to,{historical:options.historical===true});if(install.missing.length||!install.primary)return false;
  const expectedKind=sourceId===LN?'provider-resilience-ln':'provider-resilience-rd';if(evidence.kind!==expectedKind||evidence.version!==1||evidence.basis!==`${expectedKind}-v1`||evidence.projectId!==install.primary.id||evidence.postingId!==install.primary.postingId)return false;
  const job=(s.providerCampaign.jobs||[]).find(row=>row.id===evidence.jobId&&row.customerId===customerId&&row.caseId===evidence.caseId&&row.resilienceSequence);if(!job)return false;
  try{sequenceApi().validateJob(s,customer,job,child);}catch{return false;}
  if(sourceId===LN){
   if(!exact(evidence,['kind','version','customerId','portfolioId','market','projectId','postingId','installation','jobId','caseId','phase','interval','basis'])||!same(evidence.installation,install.rows[0]))return false;
   const phase=job.resilienceSequence.phases?.[0],interaction=phase&&child.interactions?.find(x=>x.id===phase.interactionId),saved=evidence.phase;
   if(!exact(saved,['interactionId','startedAt','finishedAt','requestedMinutes','observedUsageMinutes','assignedPerson','admission'])||!phase||phase.interactionId!==saved.interactionId||phase.requestedMinutes!==saved.requestedMinutes||phase.observedUsageMinutes!==saved.observedUsageMinutes||!interaction||interaction.phase!=='resolved'||interaction.id!==saved.interactionId||interaction.startedAt!==saved.startedAt||interaction.finishedAt!==saved.finishedAt||interaction.agent!==saved.assignedPerson||!interaction.media||interaction.media.in!==true||interaction.media.out!==true||interaction.context!==true||!same(evidence.interval,{from:saved.startedAt,to:saved.finishedAt})||saved.admission?.phase!=='admitted'||saved.admission.ready!==true||saved.admission.selected?.edges?.[0]?.id!==`${customerId}-a-primary`||saved.admission.selected?.edges?.[0]?.domain!==`${customerId}-primary-domain`||saved.admission.selected?.latencyMs>500)return false;
   if(options.historical!==true&&saved.finishedAt>s.clock)return false;
   return true;
  }
  if(!exact(evidence,['kind','version','customerId','portfolioId','market','projectId','postingId','jobId','caseId','sequence','settlement','criticalAtClaim','claimedAt','interval','basis'])||!same(evidence.sequence.samples.map(x=>x.at),Array.from({length:10},(_,n)=>evidence.sequence.windowStart+n+1))||evidence.sequence.phases.length!==3||evidence.sequence.samples.length!==10||evidence.sequence.projectId!==install.primary.id||evidence.sequence.postingId!==install.primary.postingId||!integer(evidence.claimedAt)||evidence.claimedAt>s.clock)return false;
  const result=sequenceApi().evaluate(s,customerId,job,{child});if(!result.eligible||!same(result.evidence,evidence.sequence))return false;
  const settlement=evidence.settlement,core=job.resilienceSettlement;
  if(!exact(settlement,['version','core','criticalAtSettlement','criticalAtClaim'])||settlement.version!==1||!same(settlement.core,core)||!exact(core,['version','customer','provider','revenuePostingId','costPostingIds'])||core.version!==1||!Array.isArray(core.costPostingIds)||!core.costPostingIds.length||!Array.isArray(settlement.criticalAtClaim)||!Array.isArray(settlement.criticalAtSettlement)||!same(evidence.criticalAtClaim,settlement.criticalAtClaim)||settlement.criticalAtClaim.length!==0)return false;
  const customerPeriod=core.customer,providerPeriod=core.provider,periodNumber=job.periodIndex,period=customer.history?.find(row=>row.period===periodNumber),global=globalPeriod(s,periodNumber);
  if(!exact(customerPeriod,['period','from','to','fullPeriod','activeMinutes','serviceReadyMinutes','due','completedOnTime','late','failed','grossRetail','credit','netRetail','wholesale','voiceMinutes','messages','voiceCost','messageCost','evidence','qualified','settledAt','basis'])||!exact(providerPeriod,['period','from','to','revenue','cost','operatingResult','focusCustomerId','due','completedOnTime','qualified','solvency','settledAt'])||customerPeriod.period!==periodNumber||providerPeriod.period!==periodNumber||customerPeriod.from!==periodNumber*60||customerPeriod.to!==(periodNumber+1)*60||customerPeriod.settledAt!==customerPeriod.to||customerPeriod.fullPeriod!==true||customerPeriod.basis!=='provider-period-history-v1'||customerPeriod.due!==24||customerPeriod.completedOnTime<22||customerPeriod.completedOnTime>24||customerPeriod.qualified!==true||providerPeriod.from!==customerPeriod.from||providerPeriod.to!==customerPeriod.to||providerPeriod.settledAt!==customerPeriod.settledAt||providerPeriod.due!==24||providerPeriod.completedOnTime<22||providerPeriod.completedOnTime>24||providerPeriod.qualified!==true||providerPeriod.solvency!=='current'||!Number.isSafeInteger(providerPeriod.operatingResult)||providerPeriod.operatingResult<=0||!same(evidence.interval,{from:result.evidence.phases[0].startedAt,to:customerPeriod.to}))return false;
  if(period&&!same(period,customerPeriod)||global&&!same(global,providerPeriod))return false;
  if(!period&&!(customer.historyCheckpoint?.periods>periodNumber)||!global&&!(s.providerCampaign.historyCheckpoint?.periods>periodNumber))return false;
  const revenue=s.business?.ledger?.find(row=>row.id===core.revenuePostingId);if(revenue&&(revenue.category!=='revenue'||revenue.reason!=='provider-customer-period'||revenue.customerId!==customerId||revenue.period!==periodNumber||revenue.at!==customerPeriod.to||revenue.cents!==customerPeriod.grossRetail))return false;if(!revenue&&Number(core.revenuePostingId?.slice('entry-'.length))>(s.business?.ledgerPrunedThrough||0))return false;
  for(const postingId of core.costPostingIds){const row=s.business.ledger.find(x=>x.id===postingId);if(row&&(row.category!=='cost'||row.customerId!==customerId||row.period!==periodNumber||row.at!==customerPeriod.to))return false;if(!row&&Number(postingId.slice('entry-'.length))>(s.business?.ledgerPrunedThrough||0))return false;}
  const overdue=(s.providerCampaign.incidents||[]).filter(row=>row.customerId===customerId&&row.createdAt<=customerPeriod.to&&row.dueAt<=customerPeriod.to&&(['active','acknowledged'].includes(row.status)||row.resolvedAt>customerPeriod.to));
  const claimOverdue=(s.providerCampaign.incidents||[]).filter(row=>row.customerId===customerId&&row.createdAt<=evidence.claimedAt&&row.dueAt<=evidence.claimedAt&&(['active','acknowledged'].includes(row.status)||row.resolvedAt>evidence.claimedAt));
  if(!same(overdue.map(row=>row.id).sort(),settlement.criticalAtSettlement)||!same(claimOverdue.map(row=>row.id).sort(),settlement.criticalAtClaim))return false;
  if(options.historical!==true&&(s.clock!==evidence.claimedAt||s.business.solvency?.status!=='current'||s.business.solvency?.payable!==0))return false;
  return true;
 }
 function source(){return `const SOC_PROVIDER_RESILIENCE_PROGRESSION=(${socProviderResilienceProgressionKernel.toString()})();`;}
 return {VERSION,CONTENT,LN,RD,evaluate,validateEvidence,source};
}
const SOC_PROVIDER_RESILIENCE_PROGRESSION=socProviderResilienceProgressionKernel();
if(typeof globalThis!=='undefined')globalThis.SOC_PROVIDER_RESILIENCE_PROGRESSION=SOC_PROVIDER_RESILIENCE_PROGRESSION;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_RESILIENCE_PROGRESSION;
