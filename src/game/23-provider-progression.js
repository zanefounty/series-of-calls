/* Pure, evidence-backed Provider readiness facts for the canonical progression identities. */
function socProviderProgressionFactsKernel(){
 'use strict';
 const VERSION=1,CONTENT='provider-progression-facts-content-1',PACK='soc-provider-progression-facts-1';
 function responsibilityApi(){return typeof SOC_PROVIDER_RESPONSIBILITY!=='undefined'?SOC_PROVIDER_RESPONSIBILITY:require('./23-provider-responsibility.js');}
 const goalId=x=>`progress.goal.${x}`,levelId=x=>`progress.progression-level.${x}`;
 const LEVELS=[
  [levelId(1),'Local UC reseller','first-live','sustainable','support-responsibility'],
  [levelId(2),'Regional communications MSP','two-supported-customers'],
  [levelId(3),'UC and CC integrator','version-scoped-integration-test','linked-end-to-end-task'],
  [levelId(4),'Enterprise service provider','independent-sites','per-item-migration-receipts','backup-restore-continuity'],
  [levelId(5),'National communications SP','responsibility-contract-adapter','sustained-independent-tenants'],
  [levelId(6),'Public-service communications specialist','provider-public-service-acceptance','custody-support-backup-key-evidence','boundary-change-consequences'],
  [levelId(7),'International managed provider','qualified-support-coverage','distributor-responsibility','market-settlement-sample'],
  [levelId(8),'Omnichannel platform operator','same-case-cross-channel-demand','human-task-resolution'],
  [levelId(9),'Multi-region deployment specialist','four-scoped-integration-proofs','profile-operating-evidence'],
  [levelId(10),'Communications wholesaler','tenant-delegation','partner-responsibility','multi-tenant-invoice-reconciliation'],
  [levelId(11),'AI communications operator','evaluated-assistance-outcomes','human-fallback','sustained-mixed-workload'],
  [levelId(12),'Critical-service integrator','independent-site-failure-restore','custody-role-observations','bounded-continuity'],
  [levelId(13),'Communications ecosystem group','simultaneous-supported-segments','role-specific-responsibility','fresh-continuity-settlement']
 ];
 const GOALS=[
  [goalId('bb'),'First customer live','first-live'],
  [goalId('tr'),'External calling operational','inbound-demand','external-collaboration-acceptance'],
  [goalId('ix'),'First ecosystem integration','tested-integration-edge','support-agreement'],
  [goalId('p5'),'Five working partner services','five-distinct-tested-integrations','responsibility-records'],
  [goalId('ln'),'Second site connected','paid-site-infrastructure','inter-site-journey'],
  [goalId('bz'),'First managed business contract','billed-nonstarter','support-responsibility'],
  [goalId('rd'),'The scenic route has a backup','independent-path','same-case-continuity-sample'],
  [goalId('ca'),'Local media or speech service','typed-local-dependency-proof','connected-offline-scope'],
  [goalId('pn'),'Dedicated carrier interconnect','dedicated-carrier-topology','directional-acceptance'],
  [goalId('scrub'),'Communications abuse defences','paid-security-operations','attack-and-allowed-demand-proof'],
  [goalId('c3'),'Three-region service footprint','market-support-boundary-sample'],
  [goalId('t2'),'Established communications MSP','simultaneous-support-integration-sample'],
  [goalId('tb'),'A thousand requests, and the hold music still works','authored-scale-load','versioned-observation-thresholds','load-window-controls'],
  [goalId('df'),'Own service infrastructure','owned-site-backup-restore-operation','restore-receipts'],
  [goalId('m2'),'Independent operating sites','two-separately-scoped-paid-sites','independent-failures','surviving-workload'],
  [goalId('c5'),'Five-region portfolio','sustained-market-support-flow-evidence'],
  [goalId('gi'),'Major enterprise or public-service contract','multi-site-custody-proof','provider-acceptance-adapter'],
  [goalId('t10'),'The giants can wait on hold','eligible-high-load-scenario','high-load-observation-proof'],
  [goalId('t1'),'Sustainable ecosystem operator','four-supported-segments','fresh-bounded-continuity','fresh-external-profit']
 ];
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const ints=x=>Number.isSafeInteger(x)&&x>=0;
 const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 const MISSING={
  'first-live':'No customer has an accepted retail agreement, paid commissioned service, current ready resources, and resolved autonomous channel work with retained case context.',
  'billed-nonstarter':'No non-starter customer has a recent paid settlement, current delivered customer work, and current MSP responsibility for that same customer.',
  'sustainable':'No recent full customer settlement has positive consolidated operating result and matching central revenue and cost postings.',
  'settlement-lineage-retained':'The full-period record remains, but matching central settlement postings are unavailable or no longer retained.',
  'support-responsibility':'No current MSP responsibility proof links the customer to paid service stages and shared support payroll.',
  'two-supported-customers':'Two distinct active customers need sampled live support responsibility, ready service, human-resolved work, and central billing in a common 60-minute window.',
  'two-customer-support-window':'Current MSP responsibility records do not prove live support coverage for both customers throughout the same 60-minute settlement window.',
  'version-scoped-integration-test':'A current version-scoped integration test is not available to this facts adapter.',
  'linked-end-to-end-task':'A resolved task linked to that tested integration is not available to this facts adapter.',
  'independent-sites':'Two separately scoped paid operating sites are not represented by this adapter.',
  'per-item-migration-receipts':'Migration lineage receipts are not evaluated by this adapter.',
  'backup-restore-continuity':'A bounded backup and restore continuity exercise is not evaluated by this adapter.',
  'responsibility-contract-adapter':'Provider role-specific responsibility contracts are not authored.',
  'sustained-independent-tenants':'Sustained independently eligible tenant evidence is not evaluated by this adapter.',
  'provider-public-service-acceptance':'Provider public-service acceptance is not adapted; Training awards cannot substitute.',
  'custody-support-backup-key-evidence':'Typed custody, support, backup, and key evidence is not evaluated by this adapter.',
  'boundary-change-consequences':'Consequential information-boundary change evidence is not evaluated by this adapter.',
  'qualified-support-coverage':'Named qualified support coverage is not authored.',
  'distributor-responsibility':'Distributor responsibility records are not authored.',
  'market-settlement-sample':'Market-scoped central settlement sampling is not evaluated by this adapter.',
  'same-case-cross-channel-demand':'Authored same-case cross-channel customer demand is not evaluated by this adapter.',
  'human-task-resolution':'Human-resolution evidence across that same cross-channel case is not evaluated by this adapter.',
  'four-scoped-integration-proofs':'Four current scoped integration proofs are not evaluated by this adapter.',
  'profile-operating-evidence':'Operating evidence across four deployment profiles is not evaluated by this adapter.',
  'tenant-delegation':'Tenant-specific partner delegation is not authored.',
  'partner-responsibility':'Named partner responsibility is not authored.',
  'multi-tenant-invoice-reconciliation':'Measured multi-tenant invoice reconciliation is not evaluated by this adapter.',
  'evaluated-assistance-outcomes':'Evaluated assistance task outcomes are not evaluated by this adapter.',
  'human-fallback':'An explicit human fallback path is not evaluated by this adapter.',
  'sustained-mixed-workload':'Sustained mixed workload evidence is not evaluated by this adapter.',
  'independent-site-failure-restore':'Independent-site failure and restore receipts are not evaluated by this adapter.',
  'custody-role-observations':'Scoped custody-role observations are not evaluated by this adapter.',
  'bounded-continuity':'Fresh bounded continuity proof is not evaluated by this adapter.',
  'simultaneous-supported-segments':'Simultaneous eligible supported-segment evidence is not evaluated by this adapter.',
  'role-specific-responsibility':'Provider role-specific responsibility evidence is not authored.',
  'fresh-continuity-settlement':'Fresh continuity and central settlement proof is not evaluated by this adapter.',
  'inbound-demand':'Authored inbound customer demand is not evidenced.',
  'external-collaboration-acceptance':'External collaboration acceptance is not evidenced.',
  'tested-integration-edge':'A tested integration edge is not evaluated by this adapter.',
  'support-agreement':'An integration support agreement is not authored.',
  'five-distinct-tested-integrations':'Five distinct tested integration pairs are not evaluated by this adapter.',
  'responsibility-records':'Named responsibility records for integrations are not authored.',
  'paid-site-infrastructure':'Paid distinct site infrastructure is not evaluated by this adapter.',
  'inter-site-journey':'A domain-level inter-site journey is not evaluated by this adapter.',
  'independent-path':'An independently sampled service path is not evaluated by this adapter.',
  'same-case-continuity-sample':'Same-case continuity across an incident is not evaluated by this adapter.',
  'typed-local-dependency-proof':'Typed local processing dependencies are not evaluated by this adapter.',
  'connected-offline-scope':'Declared connected and offline operating scope is not evaluated by this adapter.',
  'dedicated-carrier-topology':'A dedicated carrier interconnect topology and offer are not evaluated by this adapter.',
  'directional-acceptance':'Directional carrier acceptance is not evaluated by this adapter.',
  'paid-security-operations':'Paid communications security operations are not evaluated by this adapter.',
  'attack-and-allowed-demand-proof':'Authored attack rejection and allowed-demand evidence are not evaluated by this adapter.',
  'market-support-boundary-sample':'A sampled market, support, and boundary proof is not evaluated by this adapter.',
  'simultaneous-support-integration-sample':'Simultaneous support and integration sampling is not evaluated by this adapter.',
  'authored-scale-load':'A versioned authored scale-load scenario is not available to this adapter.',
  'versioned-observation-thresholds':'Versioned scale observation thresholds are not evaluated by this adapter.',
  'load-window-controls':'Meaningful bounded load-window controls are not evaluated by this adapter.',
  'owned-site-backup-restore-operation':'An owned-site backup and restore operation is not evaluated by this adapter.',
  'restore-receipts':'Validated restore receipts are not evaluated by this adapter.',
  'two-separately-scoped-paid-sites':'Two independently scoped paid sites are not evaluated by this adapter.',
  'independent-failures':'Independent site failure domains are not evaluated by this adapter.',
  'surviving-workload':'Actual workload surviving a site failure is not evaluated by this adapter.',
  'sustained-market-support-flow-evidence':'Sustained market, support, and flow evidence is not evaluated by this adapter; no fifth regulatory profile is inferred.',
  'multi-site-custody-proof':'Full multi-site and custody proof is not evaluated by this adapter.',
  'provider-acceptance-adapter':'A Provider acceptance adapter is required; Training awards and snapshots cannot substitute.',
  'eligible-high-load-scenario':'An eligible paid high-load scenario is not available to this adapter.',
  'high-load-observation-proof':'Measured high-load human work is not evaluated by this adapter.',
  'four-supported-segments':'Simultaneous eligible service across four supported segments is not evaluated by this adapter.',
  'fresh-bounded-continuity':'Fresh bounded continuity is not evaluated by this adapter.',
  'fresh-external-profit':'Fresh consolidated external operating profit is not evaluated by this adapter.'
 };
 const rootFor=(s,c,h)=>typeof h.customerRoot==='function'?h.customerRoot(s,c.portfolioId):s.portfolio?.customers?.find(x=>x.id===c.portfolioId)?.root||null;
 const observedReady=(root,id,h)=>{if(typeof h.observeResource!=='function')return false;const v=h.observeResource(root,id);return v===true||v?.ready===true;};
 function postingFor(s,project){const e=s.business?.ledger?.find(x=>x.id===project.postingId);if(e)return e.category==='cost'&&e.cents===project.setupCents&&e.projectId===project.id&&e.customerId===project.customerId?e:null;const m=/^entry-([1-9]\d*)$/.exec(project?.postingId||'');return m&&Number(m[1])<=(s.business?.ledgerPrunedThrough||0)&&s.providerCampaign?.projects?.includes(project)?{id:project.postingId,retention:'validated-project-checkpoint',projectId:project.id}:null;}
 function stageProjects(s,c){const p=s.providerCampaign;const out=[];for(const stageId of ['base','carrier','partner']){const stage=c.stages?.[stageId],project=stage&&p.projects.find(x=>x.id===stage.projectId&&x.customerId===c.id&&x.kind==='stage'&&x.stage===stageId);if(!stage||stage.status!=='effective'||!project||project.status!=='complete'||!postingFor(s,project))return null;out.push({stageId,stage,project});}return out;}
 function customerReady(s,c,h){
  if(!['active','renewal'].includes(c.status))return {ok:false,missing:['customer-not-currently-active']};
  if(!c.retailAgreement||!ints(c.retailAgreement.at)||c.retailAgreement.at> s.clock||c.retailAgreement.priceCents!==c.retailCents)return {ok:false,missing:['accepted-retail-agreement']};
  const rows=stageProjects(s,c);if(!rows)return {ok:false,missing:['paid-commissioned-stage-lineage']};
  const root=rootFor(s,c,h);if(!root||root.providerCustomer?.id!==c.id||root.providerCustomer?.version!==1||root.providerCampaign)return {ok:false,missing:['validated-customer-root']};
  const missing=[];
  for(const {stageId,stage} of rows)for(const resourceId of stage.resources||[]){
   const resource=root.resources?.[resourceId],expected=stage.expectedGenerations?.[resourceId];
   if(!resource||!resource.effective||resource.provisioning?.status!=='ready'||!ints(resource.generation)||resource.generation<(expected||0)||!observedReady(root,resourceId,h))missing.push(`resource-not-current:${resourceId}`);
  }
  if(missing.length)return {ok:false,missing:[...new Set(missing)]};
  const expectedChannels=['voice','message'];
  const resolved=[];
  for(const channel of expectedChannels){
   const match=s.providerCampaign.jobs.filter(j=>j.customerId===c.id&&j.channel===channel&&['completed','late'].includes(j.status)&&j.interactionId&&j.caseId&&j.contextRetained===true).map(job=>({job,interaction:root.interactions?.find(i=>i.id===job.interactionId),linkedCase:root.cases?.[job.caseId]})).find(({job,interaction,linkedCase})=>interaction&&interaction.probe!==true&&interaction.phase==='resolved'&&interaction.caseId===job.caseId&&interaction.context===true&&(!interaction.needOutcome||interaction.needOutcome.outcome==='resolved')&&linkedCase?.interactions?.includes(interaction.id));
   if(match)resolved.push({job:match.job,interaction:match.interaction});
  }
  if(resolved.length!==expectedChannels.length){for(const channel of expectedChannels)if(!resolved.some(x=>x.job.channel===channel))missing.push(channel==='voice'?'resolved-voice-case-not-retained':'resolved-digital-case-not-retained');return {ok:false,missing};}
  return {ok:true,root,rows,resolved};
 }
 function customerBill(s,c,history){
  const ledger=s.business?.ledger||[];
  const rev=ledger.find(x=>x.reason==='provider-customer-period'&&x.customerId===c.id&&x.period===history.period&&x.category==='revenue'&&x.cents===history.grossRetail&&x.cents>0);
  const costs=ledger.filter(x=>x.customerId===c.id&&x.period===history.period&&['provider-wholesale-period','provider-operation-period','provider-voice-usage','provider-message-usage'].includes(x.reason)&&x.category==='cost'&&x.cents>0);
  return rev&&costs.length?{revenue:rev,costs}:null;
 }
 function sustainable(s,c){
  const p=s.providerCampaign,periods=c.history||[];
  for(const history of [...periods].reverse()){
   if(history.basis!=='provider-period-history-v1'||history.fullPeriod!==true||history.to-history.from!==60||history.qualified!==true||!ints(history.period)||!ints(history.to)||s.clock-history.to>60)continue;
   const global=p.periodHistory?.find(x=>x.period===history.period&&x.from===history.from&&x.to===history.to);
   const bill=customerBill(s,c,history);
   if(global&&global.settledAt===history.to&&ints(global.operatingResult)&&global.operatingResult>0&&bill)return {history,global,bill};
  }
  return null;
 }
 function currentMspResponsibility(s,c,hooks){
  if(!c)return null;
  const result=responsibilityApi().responsibilities(s,c.id,hooks);
  return result.status==='available'?result.records.find(r=>r.role==='msp'&&r.organisationId==='orchard-msp'&&r.customerId===c.id&&r.version===1&&r.effectiveAt<=s.clock&&(r.expiresAt===null||r.expiresAt>s.clock))||null:null;
 }
 function supportBoundary(root,resources,hooks){
  const api=typeof SOC_BOUNDARIES!=='undefined'?SOC_BOUNDARIES:(typeof require==='function'?require('./43-boundaries.js'):null);
  const contracts=root?.boundaries?.contracts||[],bindings=[];
  for(const c of contracts){
   if(!c.effective||!c.effective.flows?.some(f=>resources.includes(f.resource)))continue;
   let result;try{result=typeof hooks.boundaryAssessment==='function'?hooks.boundaryAssessment(root,c.id):api?.evaluate(root,c.id);}catch{continue;}
   const resourcesBound=result?.resourceBindings?.map(x=>typeof x==='string'?x:x.resource)||[];
   if(result?.eligible===true&&resources.every(id=>resourcesBound.includes(id)))bindings.push({id:c.id,generation:c.generation,profile:result.profile||c.effective.profile,resources:resourcesBound.filter(id=>resources.includes(id)).sort()});
  }
  return bindings.sort((a,b)=>a.id.localeCompare(b.id));
 }
 function servicePathResources(root){const selected=Object.values(root?.operations?.placements||{}).filter(id=>typeof id==='string');return [...new Set(['identity','phone',...selected,'engage'])];}
 function supportConfiguration(c,root,resources,responsibility,boundaries){
  return JSON.stringify(stable({customerId:c.id,tenant:root?.tenant||c.tenant||c.portfolioId,market:c.market,scenario:c.scenario,retailPriceCents:c.retailAgreement?.priceCents,stages:Object.fromEntries(['base','carrier','partner'].map(id=>{const stage=c.stages?.[id];return [id,stage?{status:stage.status,projectId:stage.projectId,resources:stage.resources,expectedGenerations:stage.expectedGenerations}:null];})),resources:resources.map(id=>({id,generation:root.resources?.[id]?.generation})),responsibility:{id:responsibility?.id,projectId:responsibility?.projectId,postingId:responsibility?.postingId,scope:responsibility?.scope,terms:responsibility?.terms,sharedWorkforce:responsibility?.evidence?.sharedWorkforce?{engineers:responsibility.evidence.sharedWorkforce.engineers,support:responsibility.evidence.sharedWorkforce.support}:null},boundaries}));
 }
 function freshHumanJobs(s,c,root,at){
  const out=[];for(const job of s.providerCampaign.jobs||[]){
   if(job.customerId!==c.id||!['completed','late'].includes(job.status)||job.completedAt!==at||!job.interactionId||!job.caseId)continue;
   const interaction=root.interactions?.find(x=>x.id===job.interactionId),caseRecord=root.cases?.[job.caseId],assignment=interaction&&root.workforceOps?.assignments?.find(x=>x.person===interaction.agent&&x.status==='complete'&&(x.id===interaction.workforceAssignment||x.interaction===interaction.workforceAssignment||x.interaction===interaction.id));
   if(!interaction||interaction.probe===true||interaction.phase!=='resolved'||interaction.startedAt>at||interaction.finishedAt!==at||interaction.botAnswered||!interaction.agent||!interaction.workforceAssignment||interaction.caseId!==job.caseId||interaction.context!==true||interaction.needOutcome&&interaction.needOutcome.outcome!=='resolved'||!caseRecord||caseRecord.tenant!==(root.tenant||c.tenant||c.portfolioId)||!caseRecord.interactions?.includes(interaction.id)||!assignment||assignment.personSnapshot?.id!==interaction.agent)continue;
   out.push({jobId:job.id,interactionId:interaction.id,caseId:job.caseId,channel:job.channel,startedAt:interaction.startedAt,finishedAt:interaction.finishedAt,person:interaction.agent,assignmentId:assignment.id});
  }
  return out.sort((a,b)=>a.jobId.localeCompare(b.jobId));
 }
 function settlementsAt(s,c,at){
  const p=s.providerCampaign,out=[];for(const h of c.history||[]){
   if(h.basis!=='provider-period-history-v1'||h.fullPeriod!==true||h.to!==at||h.settledAt!==at||h.to-h.from!==60||!ints(h.period))continue;
   const global=p.periodHistory?.find(x=>x.period===h.period&&x.from===h.from&&x.to===h.to&&x.settledAt===at),bill=customerBill(s,c,h);
   if(!global||!bill||!Number.isSafeInteger(global.operatingResult))continue;
   out.push({period:h.period,from:h.from,to:h.to,settledAt:at,qualified:h.qualified,operatingResultCents:global.operatingResult,revenuePostingId:bill.revenue.id,costPostingIds:bill.costs.map(x=>x.id).sort()});
  }
  return out.sort((a,b)=>a.period-b.period);
 }
 function sampleSupport(s,hooks={}){
  if(!s||s.experience?.version!==1||s.experience?.kind!=='campaign'||s.experience?.custom!==false)fail('PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED');
  const p=s.providerCampaign;if(!p||p.pack!=='soc-provider-campaign-1'||!Array.isArray(p.customers)||!Array.isArray(p.projects)||!Array.isArray(p.jobs)||!s.business||!Array.isArray(s.business.ledger)||!ints(s.clock))fail('INVALID_PROVIDER_PROGRESSION_FACTS_INPUT');
  const cohort=p.customers.filter(c=>['active','renewal'].includes(c.status)).map(c=>c.id).sort(),participants=[];
  for(const id of cohort){
   const c=p.customers.find(x=>x.id===id),ready=customerReady(s,c,hooks),root=ready.root||rootFor(s,c,hooks),stageResources=ready.ok?ready.rows.flatMap(x=>x.stage.resources||[]):[],pathResources=ready.ok&&root?servicePathResources(root):[],resources=[...new Set([...stageResources,...pathResources])],responsibility=currentMspResponsibility(s,c,hooks),boundaries=root?supportBoundary(root,pathResources,hooks):[],missing=[];
   if(!ready.ok)missing.push(...ready.missing);
   if(ready.ok&&root)for(const resourceId of pathResources)if(!observedReady(root,resourceId,hooks))missing.push(`resource-not-current:${resourceId}`);
   if(!responsibility)missing.push(MISSING['support-responsibility']);
   if(!boundaries.length)missing.push('An effective supported boundary on a paid service resource is required throughout the sample.');
   const generations=resources.map(resourceId=>({id:resourceId,generation:root?.resources?.[resourceId]?.generation??null})).sort((a,b)=>a.id.localeCompare(b.id));
   const responsible=responsibility?{id:responsibility.id,customerId:responsibility.customerId,role:responsibility.role,organisationId:responsibility.organisationId,projectId:responsibility.projectId,postingId:responsibility.postingId,effectiveAt:responsibility.effectiveAt,expiresAt:responsibility.expiresAt,scope:[...responsibility.scope].sort(),setupCents:responsibility.terms?.setupCents??null,periodCents:responsibility.terms?.periodCents??null,engineers:responsibility.terms?.engineers??null,support:responsibility.terms?.support??null,sharedWorkforce:responsibility.evidence?.sharedWorkforce?{engineers:responsibility.evidence.sharedWorkforce.engineers,support:responsibility.evidence.sharedWorkforce.support,personMinutes:responsibility.evidence.sharedWorkforce.personMinutes,billedMinutes:responsibility.evidence.sharedWorkforce.billedMinutes}:null}:null;
   participants.push({customerId:c.id,portfolioId:c.portfolioId,tenant:root?.tenant||c.tenant||c.portfolioId,market:c.market,scenario:c.scenario,configuration:supportConfiguration(c,root,resources,responsibility,boundaries),eligible:missing.length===0,missing:[...new Set(missing)],resources:generations,boundaries,responsibility:responsible,freshJobs:root?freshHumanJobs(s,c,root,s.clock):[],settlements:settlementsAt(s,c,s.clock)});
  }
  return {version:VERSION,contentVersion:CONTENT,at:s.clock,cohort,participants};
 }
 const SUPPORT_SAMPLE_KEYS=['version','contentVersion','at','cohort','participants'];
 const SUPPORT_PARTICIPANT_KEYS=['customerId','portfolioId','tenant','market','scenario','configuration','eligible','missing','resources','boundaries','responsibility','freshJobs','settlements'];
 function supportSampleValid(x){
  if(!exact(x,SUPPORT_SAMPLE_KEYS)||x.version!==VERSION||x.contentVersion!==CONTENT||!ints(x.at)||!Array.isArray(x.cohort)||!Array.isArray(x.participants)||x.cohort.length>20||new Set(x.cohort).size!==x.cohort.length||x.cohort.some(id=>typeof id!=='string')||!same(x.cohort,[...x.cohort].sort()))return false;
  if(x.participants.length!==x.cohort.length||!same(x.participants.map(y=>y?.customerId),x.cohort))return false;
  for(const p of x.participants){
   if(!exact(p,SUPPORT_PARTICIPANT_KEYS)||!['customerId','portfolioId','tenant','market','scenario','configuration'].every(k=>typeof p[k]==='string')||!['au-sydney','au-melbourne','us-seattle','jp-tokyo','eu-dublin'].includes(p.market)||!['smb','enterprise','government','defence'].includes(p.scenario)||typeof p.eligible!=='boolean'||!Array.isArray(p.missing)||p.missing.some(y=>typeof y!=='string')||!Array.isArray(p.resources)||!Array.isArray(p.boundaries)||!Array.isArray(p.freshJobs)||!Array.isArray(p.settlements))return false;
   if(p.resources.some(r=>!exact(r,['id','generation'])||typeof r.id!=='string'||r.generation!==null&&(!ints(r.generation)||r.generation<1))||p.boundaries.some(b=>!exact(b,['id','generation','profile','resources'])||typeof b.id!=='string'||!ints(b.generation)||b.generation<1||typeof b.profile!=='string'||!Array.isArray(b.resources)||!b.resources.length||b.resources.some(id=>typeof id!=='string'))||p.responsibility!==null&&(!exact(p.responsibility,['id','customerId','role','organisationId','projectId','postingId','effectiveAt','expiresAt','scope','setupCents','periodCents','engineers','support','sharedWorkforce'])||p.responsibility.customerId!==p.customerId||p.responsibility.role!=='msp'||p.responsibility.organisationId!=='orchard-msp'||!Array.isArray(p.responsibility.scope)||!ints(p.responsibility.effectiveAt)||p.responsibility.expiresAt!==null&&!ints(p.responsibility.expiresAt)||![p.responsibility.setupCents,p.responsibility.periodCents,p.responsibility.engineers,p.responsibility.support].every(ints)||p.responsibility.sharedWorkforce!==null&&(!exact(p.responsibility.sharedWorkforce,['engineers','support','personMinutes','billedMinutes'])||!Object.values(p.responsibility.sharedWorkforce).every(ints))))return false;
   if(p.freshJobs.some(j=>!exact(j,['jobId','interactionId','caseId','channel','startedAt','finishedAt','person','assignmentId'])||![j.jobId,j.interactionId,j.caseId,j.person,j.assignmentId].every(y=>typeof y==='string')||!['voice','message','meeting','recording','processing'].includes(j.channel)||!ints(j.startedAt)||!ints(j.finishedAt)||j.finishedAt!==x.at))return false;
   if(p.settlements.some(q=>!exact(q,['period','from','to','settledAt','qualified','operatingResultCents','revenuePostingId','costPostingIds'])||!ints(q.period)||!ints(q.from)||!ints(q.to)||q.to-q.from!==60||q.settledAt!==x.at||typeof q.qualified!=='boolean'||!Number.isSafeInteger(q.operatingResultCents)||typeof q.revenuePostingId!=='string'||!Array.isArray(q.costPostingIds)||!q.costPostingIds.length||q.costPostingIds.some(y=>typeof y!=='string')))return false;
  }
  return true;
 }
 function qualifySupportWindow(samples,requirements={}){
  if(!requirements||typeof requirements!=='object'||Array.isArray(requirements)||Object.keys(requirements).some(k=>!['minimumCustomers','minimumMarkets'].includes(k)))fail('INVALID_PROVIDER_SUPPORT_REQUIREMENTS');
  const minimumCustomers=requirements.minimumCustomers??2,minimumMarkets=requirements.minimumMarkets??1;
  if(!ints(minimumCustomers)||minimumCustomers<2||minimumCustomers>20||!ints(minimumMarkets)||minimumMarkets<1||minimumMarkets>5)fail('INVALID_PROVIDER_SUPPORT_REQUIREMENTS');
  const missing=[];if(!Array.isArray(samples)||samples.length!==60||samples.some(x=>!supportSampleValid(x)))missing.push('Exactly 60 structurally valid one-minute support samples are required.');
  if(missing.length)return {status:'incomplete',missing,evidence:null};
  const first=samples[0],cohort=first.cohort,markets=new Set(first.participants.map(x=>x.market));
  if(cohort.length<minimumCustomers)missing.push(`At least ${minimumCustomers} active Provider customers are required in the sampled cohort.`);
  if(markets.size<minimumMarkets)missing.push(`At least ${minimumMarkets} distinct configured markets are required in the sampled cohort.`);
  if(samples.some((x,i)=>x.at!==first.at+i||!same(x.cohort,cohort)||x.participants.some((p,j)=>p.configuration!==first.participants[j]?.configuration)))missing.push('The support samples contain a missing minute, changed active-customer cohort, or changed service configuration.');
  for(let i=0;i<samples.length;i++)for(const p of samples[i].participants){if(!p.eligible||p.missing.length)missing.push(`Customer ${p.customerId} was not currently eligible at minute ${samples[i].at}.`);if(!p.responsibility||p.responsibility.effectiveAt>samples[i].at||p.responsibility.expiresAt!==null&&p.responsibility.expiresAt<=samples[i].at)missing.push(`Customer ${p.customerId} lacked paid MSP support at minute ${samples[i].at}.`);if(!p.boundaries.length)missing.push(`Customer ${p.customerId} lacked an eligible supported boundary at minute ${samples[i].at}.`);}
  const last=samples.at(-1),from=first.at-1,to=last.at;
  for(const customerId of cohort){const rows=samples.flatMap(x=>x.participants.filter(y=>y.customerId===customerId));if(!rows.some(x=>x.freshJobs.some(j=>j.startedAt>=from&&j.finishedAt<=to)))missing.push(`Customer ${customerId} needs at least one fresh resolved human case during the sampled interval.`);if(!rows.some(x=>x.settlements.some(q=>q.settledAt>=from&&q.settledAt<=to)))missing.push(`Customer ${customerId} needs a matching central settlement during the sampled interval.`);}
  if(missing.length)return {status:'incomplete',missing:[...new Set(missing)],evidence:null};
  return {status:'ready',missing:[],evidence:{interval:{from,to},minutes:60,customerIds:[...cohort],markets:[...markets].sort(),humanJobIds:[...new Set(samples.flatMap(x=>x.participants.flatMap(p=>p.freshJobs.map(j=>j.jobId))))].sort(),settlements:samples.flatMap(x=>x.participants.flatMap(p=>p.settlements.map(q=>({customerId:p.customerId,period:q.period,at:q.settledAt,revenuePostingId:q.revenuePostingId,costPostingIds:[...q.costPostingIds]}))))}};
 }
 function validateSupportSamples(s,samples,hooks={},options={}){
  if(!Array.isArray(samples)||samples.some(x=>!supportSampleValid(x)))return false;
  if(options?.checkCurrent===true){const current=sampleSupport(s,hooks),last=samples.at(-1);if(last?.at===current.at&&!same(last,current))return false;}
  for(const sample of samples)for(const p of sample.participants){
   const c=s.providerCampaign.customers.find(x=>x.id===p.customerId);if(!c)return false;
   for(const j of p.freshJobs){const job=s.providerCampaign.jobs.find(x=>x.id===j.jobId&&x.customerId===c.id&&x.interactionId===j.interactionId&&x.caseId===j.caseId&&x.completedAt===j.finishedAt),root=rootFor(s,c,hooks),interaction=root?.interactions?.find(x=>x.id===j.interactionId),assignment=interaction&&root.workforceOps?.assignments?.find(x=>x.id===j.assignmentId&&[interaction.workforceAssignment,interaction.id].includes(x.interaction)&&x.person===j.person&&x.status==='complete');if(!job||!interaction||interaction.phase!=='resolved'||interaction.probe===true||interaction.botAnswered||interaction.caseId!==j.caseId||interaction.finishedAt!==j.finishedAt||!assignment||assignment.personSnapshot?.id!==j.person)return false;}
   for(const q of p.settlements){const h=c.history?.find(x=>x.period===q.period&&x.from===q.from&&x.to===q.to&&x.settledAt===q.settledAt&&x.qualified===q.qualified),g=s.providerCampaign.periodHistory?.find(x=>x.period===q.period&&x.from===q.from&&x.to===q.to&&x.settledAt===q.settledAt&&x.operatingResult===q.operatingResultCents),bill=h&&customerBill(s,c,h);if(!h||!g||!bill||bill.revenue.id!==q.revenuePostingId||!same(bill.costs.map(x=>x.id).sort(),q.costPostingIds))return false;}
   if(p.responsibility){const r=s.providerCampaign.projects.find(x=>x.id===p.responsibility.projectId&&x.postingId===p.responsibility.postingId&&x.customerId===c.id&&x.status==='complete');if(!r||r.kind!=='stage'&&!['complete','retired'].includes(r.status)||p.responsibility.effectiveAt>sample.at||p.responsibility.expiresAt!==null&&p.responsibility.expiresAt<=sample.at)return false;}
  }
  return true;
 }
 function supportCurrentEligibility(s,samples,hooks={}){
  const prior=samples?.at(-1);if(!prior)return false;const now=sampleSupport(s,hooks);
  return same(now.cohort,prior.cohort)&&now.participants.every((p,i)=>p.eligible&&p.configuration===prior.participants[i]?.configuration&&p.responsibility&&p.boundaries.length>0);
 }
 function fact(status,missing=[],evidence={}){return {status,missing:[...new Set(missing)],evidence:copy(evidence)};}
 function blockedRows(rows){return Object.fromEntries(rows.map(([id,name,...req])=>[id,{id,name,status:'incomplete',missing:req.map(k=>MISSING[k]||`Required evidence is not evaluated: ${k}.`)}]));}
 function evaluate(s,hooks={}){
  if(!s||s.experience?.version!==1||s.experience?.kind!=='campaign'||s.experience?.custom!==false)fail('PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED');
  const p=s.providerCampaign;if(!p||p.pack!=='soc-provider-campaign-1'||p.version!==1||!['provider-campaigns-1','provider-campaigns-2','provider-campaigns-3'].includes(p.contentVersion))fail('PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED');
  if(!Array.isArray(p.customers)||!Array.isArray(p.projects)||!Array.isArray(p.jobs)||!Array.isArray(p.periodHistory)||!s.business||!Array.isArray(s.business.ledger))fail('INVALID_PROVIDER_PROGRESSION_FACTS_INPUT');
  const fullLive=[];
  for(const c of p.customers){const ready=customerReady(s,c,hooks);if(ready.ok)fullLive.push({customer:c,ready});}
  const first=fullLive[0]||null;
  const liveEvidenceFor=entry=>entry?{customerId:entry.customer.id,portfolioId:entry.customer.portfolioId,from:Math.min(...entry.ready.resolved.map(x=>x.job.arrivalAt)),to:Math.max(...entry.ready.resolved.map(x=>x.interaction.finishedAt||x.job.completedAt)),agreementAt:entry.customer.retailAgreement.at,projectIds:entry.ready.rows.map(x=>x.project.id),postingIds:entry.ready.rows.map(x=>x.project.postingId),jobs:entry.ready.resolved.map(x=>({jobId:x.job.id,interactionId:x.interaction.id,caseId:x.job.caseId,channel:x.job.channel}))}:{};
  const recent=s.clock;
  const liveEvidence=liveEvidenceFor(first);
  const firstLive=fact(first?'ready':'incomplete',first?[]:[p.customers.length?MISSING['first-live']:'No Provider customer has been accepted yet.'],liveEvidence);
  const supportRecords=responsibilityApi().responsibilities(s,undefined,hooks),currentSupport= supportRecords.status==='available'?supportRecords.records.filter(r=>r.role==='msp'&&r.organisationId==='orchard-msp'&&r.version===1&&r.effectiveAt<=s.clock&&(r.expiresAt===null||r.expiresAt>s.clock)):[];
  const billedCandidates=[];
  for(const c of p.customers){if(c.id==='starter-customer'||!c.retailAgreement||!['active','renewal'].includes(c.status))continue;const ready=customerReady(s,c,hooks);if(!ready.ok)continue;const history=[...(c.history||[])].reverse().find(h=>h.basis==='provider-period-history-v1'&&h.fullPeriod===true&&h.to-h.from===60&&recent-h.to<=60&&customerBill(s,c,h));if(history){const bill=customerBill(s,c,history),support=currentSupport.find(r=>r.customerId===c.id)||null;billedCandidates.push({customer:c,ready,history,bill,support});}}
  const nonstarter=billedCandidates.find(x=>x.support)||billedCandidates[0]||null;
  const nonstarterHistoryOnly=!nonstarter&&p.customers.some(c=>c.id!=='starter-customer'&&c.retailAgreement&&(c.history||[]).some(h=>h.basis==='provider-period-history-v1'&&h.fullPeriod===true&&h.to-h.from===60&&recent-h.to<=60));
  const billedMissing=[];if(!nonstarter)billedMissing.push(nonstarterHistoryOnly?MISSING['settlement-lineage-retained']:MISSING['billed-nonstarter']);else if(!nonstarter.support)billedMissing.push(MISSING['support-responsibility']);
  const billed=fact(billedCandidates.some(x=>x.support)?'ready':'incomplete',billedCandidates.some(x=>x.support)?[]:billedMissing,nonstarter?{customerId:nonstarter.customer.id,agreementAt:nonstarter.customer.retailAgreement.at,settlementPeriod:nonstarter.history.period,settlementTo:nonstarter.history.to,revenuePostingId:nonstarter.bill.revenue.id,costPostingIds:nonstarter.bill.costs.map(x=>x.id),projectIds:nonstarter.ready.rows.map(x=>x.project.id),jobs:nonstarter.ready.resolved.map(x=>({jobId:x.job.id,interactionId:x.interaction.id,caseId:x.job.caseId,channel:x.job.channel})),supportResponsibility:nonstarter.support?copy(nonstarter.support):null}:{});
  const supported=[];
  for(const c of p.customers){if(!['active','renewal'].includes(c.status))continue;const ready=customerReady(s,c,hooks);if(!ready.ok)continue;const history=[...(c.history||[])].reverse().find(h=>h.fullPeriod===true&&h.to-h.from===60&&recent-h.to<=60&&customerBill(s,c,h));if(history)supported.push({customer:c,ready,history,bill:customerBill(s,c,history)});}
  let pair=null;for(let i=0;i<supported.length&&!pair;i++)for(let j=i+1;j<supported.length;j++){const a=supported[i],b=supported[j],from=Math.max(a.history.from,b.history.from),to=Math.min(a.history.to,b.history.to);if(to-from>=60){pair=[a,b];break;}}
  const supportSamples=Array.isArray(hooks.supportSamples)?hooks.supportSamples:hooks.supportSamples?.samples;
  const sampledWindow=supportSamples&&validateSupportSamples(s,supportSamples,hooks)?qualifySupportWindow(supportSamples):null;
  if(sampledWindow?.status==='ready'&&!supportCurrentEligibility(s,supportSamples,hooks)){sampledWindow.status='incomplete';sampledWindow.missing=['Current customer, paid MSP, resource and supported-boundary eligibility no longer matches the sampled window.'];sampledWindow.evidence=null;}
  const pairMissing=[];if(!pair)pairMissing.push(MISSING['two-supported-customers']);if(!sampledWindow||sampledWindow.status!=='ready')pairMissing.push(MISSING['two-customer-support-window'],...(sampledWindow?.missing||[]));
  const two=sampledWindow?.status==='ready'?fact('ready',[],sampledWindow.evidence):fact('incomplete',pairMissing,pair?{customerIds:pair.map(x=>x.customer.id),interval:{from:Math.max(pair[0].history.from,pair[1].history.from),to:Math.min(pair[0].history.to,pair[1].history.to)},settlementPeriods:pair.map(x=>x.history.period),postingIds:pair.flatMap(x=>[x.bill.revenue.id,...x.bill.costs.map(y=>y.id)])}:{});
  const sustainableCandidate=fullLive.map(x=>({...x,proof:sustainable(s,x.customer)})).find(x=>x.proof);
  const sustainableProof=sustainableCandidate?.proof||null;
  const sustainabilityHistoryOnly=fullLive.some(x=>(x.customer.history||[]).some(h=>h.basis==='provider-period-history-v1'&&h.fullPeriod===true&&h.to-h.from===60&&recent-h.to<=60&&p.periodHistory?.some(g=>g.period===h.period&&g.from===h.from&&g.to===h.to&&g.operatingResult>0)));
  const sustainability=fact(sustainableProof?'ready':'incomplete',sustainableProof?[]:[sustainabilityHistoryOnly?MISSING['settlement-lineage-retained']:MISSING.sustainable],sustainableProof?{customerId:sustainableCandidate.customer.id,interval:{from:sustainableProof.history.from,to:sustainableProof.history.to},period:sustainableProof.history.period,globalOperatingResultCents:sustainableProof.global.operatingResult,revenuePostingId:sustainableProof.bill.revenue.id,costPostingIds:sustainableProof.bill.costs.map(x=>x.id)}:{});
  const supportTarget=sustainableCandidate?.customer||first?.customer||null,supportRecord=currentMspResponsibility(s,supportTarget,hooks);
  const supportResponsibility=fact(supportRecord?'ready':'incomplete',supportRecord?[]:[MISSING['support-responsibility']],supportRecord?{customerId:supportTarget.id,role:supportRecord.role,organisationId:supportRecord.organisationId,projectId:supportRecord.projectId,postingId:supportRecord.postingId,effectiveAt:supportRecord.effectiveAt,scope:[...supportRecord.scope],record:copy(supportRecord)}:{});
  const levels=blockedRows(LEVELS),goals=blockedRows(GOALS);
  const proofRequirements={firstLiveCustomer:firstLive,billedNonstarter:billed,twoSupportedCustomers:two,sustainable:sustainability};
  const levelOneLive=sustainableCandidate?liveEvidenceFor(sustainableCandidate):null,l1=!!levelOneLive&&sustainability.status==='ready'&&supportResponsibility.status==='ready';
  levels[levelId(1)]={id:levelId(1),name:'Local UC reseller',status:l1?'ready':'incomplete',missing:l1?[]:[...(!levelOneLive?firstLive.missing:[]),...sustainability.missing,...supportResponsibility.missing],evidence:l1?{firstLive:levelOneLive,sustainable:sustainability.evidence,supportResponsibility:supportResponsibility.evidence}:null};
  levels[levelId(2)]={id:levelId(2),name:'Regional communications MSP',status:two.status,missing:[...two.missing],evidence:two.status==='ready'?two.evidence:null};
  goals[goalId('bb')]={id:goalId('bb'),name:'First customer live',status:firstLive.status,missing:[...firstLive.missing],evidence:firstLive.status==='ready'?liveEvidence:null};
  goals[goalId('bz')]={id:goalId('bz'),name:'First managed business contract',status:billed.status,missing:[...billed.missing],evidence:billed.status==='ready'?billed.evidence:null};
  proofRequirements.supportResponsibility=supportResponsibility;
  return {pack:PACK,version:VERSION,contentVersion:CONTENT,sourceContentVersion:p.contentVersion,experience:{...s.experience},asOf:s.clock,levels,goals,facts:proofRequirements};
 }
 return {PACK,VERSION,CONTENT,LEVELS:LEVELS.map(x=>x[0]),GOALS:GOALS.map(x=>x[0]),evaluate,inspect:evaluate,sampleSupport,qualifySupportWindow,validateSupportSamples,source:()=>`const SOC_PROVIDER_PROGRESSION_FACTS=(${socProviderProgressionFactsKernel.toString()})();`};
}
const SOC_PROVIDER_PROGRESSION_FACTS=socProviderProgressionFactsKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_PROGRESSION_FACTS;
