/* Pure, evidence-backed Provider readiness facts for the canonical progression identities. */
function socProviderProgressionFactsKernel(){
 'use strict';
 const VERSION=1,CONTENT='provider-progression-facts-content-1',PACK='soc-provider-progression-facts-1';
 const goalId=x=>`progress.goal.${x}`,levelId=x=>`progress.progression-level.${x}`;
 const LEVELS=[
  [levelId(1),'Local UC reseller','first-live','billed-nonstarter','sustainable','support-responsibility'],
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
 const MISSING={
  'first-live':'No customer has an accepted retail agreement, paid commissioned service, current ready resources, and resolved autonomous channel work with retained case context.',
  'billed-nonstarter':'No non-starter customer has an accepted paid agreement and a recent central customer settlement.',
  'sustainable':'No recent full customer settlement has positive consolidated operating result and matching central revenue and cost postings.',
  'settlement-lineage-retained':'The full-period record remains, but matching central settlement postings are unavailable or no longer retained.',
  'support-responsibility':'No named support-responsibility record is authored for Provider customers.',
  'two-supported-customers':'Two distinct active customers need sampled live support responsibility, ready service, human-resolved work, and central billing in a common 60-minute window.',
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
 function postingFor(s,project){const e=s.business?.ledger?.find(x=>x.id===project.postingId);return e&&e.category==='cost'&&e.cents===project.setupCents&&e.projectId===project.id&&e.customerId===project.customerId?e:null;}
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
   const job=s.providerCampaign.jobs.find(j=>j.customerId===c.id&&j.channel===channel&&['completed','late'].includes(j.status)&&j.interactionId&&j.caseId&&j.contextRetained===true);
   const interaction=job&&root.interactions?.find(i=>i.id===job.interactionId);
   const linkedCase=job&&root.cases?.[job.caseId];
   if(!job||!interaction||interaction.probe===true||interaction.phase!=='resolved'||interaction.caseId!==job.caseId||interaction.context!==true||interaction.needOutcome&&interaction.needOutcome.outcome!=='resolved'||!linkedCase?.interactions?.includes(interaction.id))continue;
   resolved.push({job,interaction});
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
 function fact(status,missing=[],evidence={}){return {status,missing:[...new Set(missing)],evidence:copy(evidence)};}
 function blockedRows(rows){return Object.fromEntries(rows.map(([id,name,...req])=>[id,{id,name,status:'incomplete',missing:req.map(k=>MISSING[k]||`Required evidence is not evaluated: ${k}.`)}]));}
 function evaluate(s,hooks={}){
  if(!s||s.experience?.version!==1||s.experience?.kind!=='campaign'||s.experience?.custom!==false)fail('PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED');
  const p=s.providerCampaign;if(!p||p.pack!=='soc-provider-campaign-1'||p.version!==1||!['provider-campaigns-1','provider-campaigns-2','provider-campaigns-3'].includes(p.contentVersion))fail('PROVIDER_PROGRESSION_CAMPAIGN_REQUIRED');
  if(!Array.isArray(p.customers)||!Array.isArray(p.projects)||!Array.isArray(p.jobs)||!Array.isArray(p.periodHistory)||!s.business||!Array.isArray(s.business.ledger))fail('INVALID_PROVIDER_PROGRESSION_FACTS_INPUT');
  const fullLive=[];
  for(const c of p.customers){const ready=customerReady(s,c,hooks);if(ready.ok)fullLive.push({customer:c,ready});}
  const first=fullLive[0]||null;
  const recent=s.clock;
  const liveEvidence=first?{customerId:first.customer.id,portfolioId:first.customer.portfolioId,from:Math.min(...first.ready.resolved.map(x=>x.job.arrivalAt)),to:Math.max(...first.ready.resolved.map(x=>x.interaction.finishedAt||x.job.completedAt)),agreementAt:first.customer.retailAgreement.at,projectIds:first.ready.rows.map(x=>x.project.id),postingIds:first.ready.rows.map(x=>x.project.postingId),jobs:first.ready.resolved.map(x=>({jobId:x.job.id,interactionId:x.interaction.id,caseId:x.job.caseId,channel:x.job.channel}))}:{};
  const firstLive=fact(first?'ready':'incomplete',first?[]:[p.customers.length?MISSING['first-live']:'No Provider customer has been accepted yet.'],liveEvidence);
  const billedCandidates=[];
  for(const c of p.customers){if(c.id==='starter-customer'||!c.retailAgreement||!['active','renewal'].includes(c.status))continue;const hist=[...(c.history||[])].reverse().find(h=>h.basis==='provider-period-history-v1'&&h.fullPeriod===true&&h.to-h.from===60&&recent-h.to<=60&&customerBill(s,c,h));if(hist)billedCandidates.push({customer:c,history:hist,bill:customerBill(s,c,hist)});}
  const nonstarter=billedCandidates[0]||null;
  const nonstarterHistoryOnly=!nonstarter&&p.customers.some(c=>c.id!=='starter-customer'&&c.retailAgreement&&(c.history||[]).some(h=>h.basis==='provider-period-history-v1'&&h.fullPeriod===true&&h.to-h.from===60&&recent-h.to<=60));
  const billedMissing=[];if(!nonstarter)billedMissing.push(nonstarterHistoryOnly?MISSING['settlement-lineage-retained']:MISSING['billed-nonstarter']);billedMissing.push(MISSING['support-responsibility']);
  const billed=fact('incomplete',billedMissing,nonstarter?{customerId:nonstarter.customer.id,agreementAt:nonstarter.customer.retailAgreement.at,settlementPeriod:nonstarter.history.period,settlementTo:nonstarter.history.to,revenuePostingId:nonstarter.bill.revenue.id,costPostingIds:nonstarter.bill.costs.map(x=>x.id)}:{});
  const supported=[];
  for(const c of p.customers){if(!['active','renewal'].includes(c.status))continue;const ready=customerReady(s,c,hooks);if(!ready.ok)continue;const history=[...(c.history||[])].reverse().find(h=>h.fullPeriod===true&&h.to-h.from===60&&recent-h.to<=60&&customerBill(s,c,h));if(history)supported.push({customer:c,ready,history,bill:customerBill(s,c,history)});}
  let pair=null;for(let i=0;i<supported.length&&!pair;i++)for(let j=i+1;j<supported.length;j++){const a=supported[i],b=supported[j],from=Math.max(a.history.from,b.history.from),to=Math.min(a.history.to,b.history.to);if(to-from>=60){pair=[a,b];break;}}
  const pairMissing=[];if(!pair)pairMissing.push(MISSING['two-supported-customers']);pairMissing.push(MISSING['support-responsibility']);
  const two=fact('incomplete',pairMissing,pair?{customerIds:pair.map(x=>x.customer.id),interval:{from:Math.max(pair[0].history.from,pair[1].history.from),to:Math.min(pair[0].history.to,pair[1].history.to)},settlementPeriods:pair.map(x=>x.history.period),postingIds:pair.flatMap(x=>[x.bill.revenue.id,...x.bill.costs.map(y=>y.id)])}:{});
  const sustainableCandidate=fullLive.map(x=>({customer:x.customer,proof:sustainable(s,x.customer)})).find(x=>x.proof);
  const sustainableProof=sustainableCandidate?.proof||null;
  const sustainabilityHistoryOnly=fullLive.some(x=>(x.customer.history||[]).some(h=>h.basis==='provider-period-history-v1'&&h.fullPeriod===true&&h.to-h.from===60&&recent-h.to<=60&&p.periodHistory?.some(g=>g.period===h.period&&g.from===h.from&&g.to===h.to&&g.operatingResult>0)));
  const sustainability=fact(sustainableProof?'ready':'incomplete',sustainableProof?[]:[sustainabilityHistoryOnly?MISSING['settlement-lineage-retained']:MISSING.sustainable],sustainableProof?{customerId:sustainableCandidate.customer.id,interval:{from:sustainableProof.history.from,to:sustainableProof.history.to},period:sustainableProof.history.period,globalOperatingResultCents:sustainableProof.global.operatingResult,revenuePostingId:sustainableProof.bill.revenue.id,costPostingIds:sustainableProof.bill.costs.map(x=>x.id)}:{});
  const supportResponsibility=fact('incomplete',[MISSING['support-responsibility']]);
  const levels=blockedRows(LEVELS),goals=blockedRows(GOALS);
  const proofRequirements={firstLiveCustomer:firstLive,billedNonstarter:billed,twoSupportedCustomers:two,sustainable:sustainability};
  const l1=firstLive.status==='ready'&&sustainability.status==='ready'&&billed.status==='ready'&&supportResponsibility.status==='ready';
  levels[levelId(1)]={id:levelId(1),name:'Local UC reseller',status:l1?'ready':'incomplete',missing:l1?[]:[...firstLive.missing,...sustainability.missing,...billed.missing,...supportResponsibility.missing],evidence:l1?{firstLive:liveEvidence,sustainable:sustainability.evidence,billedNonstarter:billed.evidence}:null};
  levels[levelId(2)]={id:levelId(2),name:'Regional communications MSP',status:two.status,missing:[...two.missing],evidence:two.status==='ready'?two.evidence:null};
  goals[goalId('bb')]={id:goalId('bb'),name:'First customer live',status:firstLive.status,missing:[...firstLive.missing],evidence:firstLive.status==='ready'?liveEvidence:null};
  goals[goalId('bz')]={id:goalId('bz'),name:'First managed business contract',status:billed.status,missing:[...billed.missing],evidence:billed.status==='ready'?billed.evidence:null};
  proofRequirements.supportResponsibility=supportResponsibility;
  return {pack:PACK,version:VERSION,contentVersion:CONTENT,sourceContentVersion:p.contentVersion,experience:{...s.experience},asOf:s.clock,levels,goals,facts:proofRequirements};
 }
 return {PACK,VERSION,CONTENT,LEVELS:LEVELS.map(x=>x[0]),GOALS:GOALS.map(x=>x[0]),evaluate,inspect:evaluate,source:()=>`const SOC_PROVIDER_PROGRESSION_FACTS=(${socProviderProgressionFactsKernel.toString()})();`};
}
const SOC_PROVIDER_PROGRESSION_FACTS=socProviderProgressionFactsKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_PROGRESSION_FACTS;
