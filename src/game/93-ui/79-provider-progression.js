/* Pure, compact Provider progression readiness overlay. It never claims or unlocks anything. */
(function(g){
 'use strict';
 const N_=g.N_||(x=>x);
 const KEYS=Object.freeze({
  title:N_('learning.progression'),intro:N_('provider.progression.readiness_only'),summary:N_('provider.progression.summary'),
  levels:N_('provider.progression.levels'),goals:N_('provider.progression.goals'),ready:N_('learning.ready'),incomplete:N_('learning.incomplete'),
  evidence:N_('learning.evidence'),missing:N_('provider.progression.missing_evidence'),noMissing:N_('provider.progression.no_missing_detail'),
  noEvidence:N_('provider.progression.no_evidence_detail'),customer:N_('provider.progression.customer'),interval:N_('provider.progression.interval'),
  jobs:N_('provider.progression.resolved_jobs'),paidStages:N_('provider.progression.paid_stages'),postings:N_('provider.progression.postings'),
  job:N_('provider.progression.job'),resource:N_('provider.progression.resource'),channelVoice:N_('provider.progression.channel.voice'),channelDigital:N_('provider.progression.channel.digital'),unavailable:N_('provider.progression.unavailable'),
  missingNoCustomer:N_('provider.progression.missing.no_customer'),missingFirstLive:N_('provider.progression.missing.first_live'),
  missingBilledNonstarter:N_('provider.progression.missing.billed_nonstarter'),missingSustainable:N_('provider.progression.missing.sustainable'),
  missingSettlementLineage:N_('provider.progression.missing.settlement_lineage'),missingSupport:N_('provider.progression.missing.support_responsibility'),
  missingTwoCustomers:N_('provider.progression.missing.two_supported_customers'),missingResource:N_('provider.progression.missing.resource_not_current'),
  missingIntegrationTest:N_('provider.progression.missing.version_scoped_integration_test'),missingLinkedTask:N_('provider.progression.missing.linked_end_to_end_task'),
  missingIndependentSites:N_('provider.progression.missing.independent_sites'),missingMigrationReceipts:N_('provider.progression.missing.migration_receipts'),
  missingBackupRestore:N_('provider.progression.missing.backup_restore_continuity'),missingResponsibilityContract:N_('provider.progression.missing.responsibility_contract'),
  missingIndependentTenants:N_('provider.progression.missing.independent_tenants'),missingPublicService:N_('provider.progression.missing.public_service_acceptance'),
  missingCustodyEvidence:N_('provider.progression.missing.custody_evidence'),missingBoundaryConsequences:N_('provider.progression.missing.boundary_consequences'),
  missingQualifiedSupport:N_('provider.progression.missing.qualified_support'),missingDistributorResponsibility:N_('provider.progression.missing.distributor_responsibility'),
  missingMarketSettlement:N_('provider.progression.missing.market_settlement'),missingCrossChannel:N_('provider.progression.missing.cross_channel_demand'),
  missingHumanResolution:N_('provider.progression.missing.human_resolution'),missingFourIntegrations:N_('provider.progression.missing.four_integrations'),
  missingProfileEvidence:N_('provider.progression.missing.profile_evidence'),missingTenantDelegation:N_('provider.progression.missing.tenant_delegation'),
  missingPartnerResponsibility:N_('provider.progression.missing.partner_responsibility'),missingInvoiceReconciliation:N_('provider.progression.missing.invoice_reconciliation'),
  missingAssistanceOutcomes:N_('provider.progression.missing.assistance_outcomes'),missingHumanFallback:N_('provider.progression.missing.human_fallback'),
  missingMixedWorkload:N_('provider.progression.missing.mixed_workload'),missingSiteFailureRestore:N_('provider.progression.missing.site_failure_restore'),
  missingCustodyRoles:N_('provider.progression.missing.custody_roles'),missingBoundedContinuity:N_('provider.progression.missing.bounded_continuity'),
  missingSupportedSegments:N_('provider.progression.missing.supported_segments'),missingRoleResponsibility:N_('provider.progression.missing.role_responsibility'),
  missingFreshContinuity:N_('provider.progression.missing.fresh_continuity'),missingInbound:N_('provider.progression.missing.inbound_demand'),
  missingExternalCollaboration:N_('provider.progression.missing.external_collaboration'),missingIntegrationEdge:N_('provider.progression.missing.integration_edge'),
  missingSupportAgreement:N_('provider.progression.missing.support_agreement'),missingFiveIntegrations:N_('provider.progression.missing.five_integrations'),
  missingResponsibilityRecords:N_('provider.progression.missing.responsibility_records'),missingPaidSite:N_('provider.progression.missing.paid_site'),
  missingInterSiteJourney:N_('provider.progression.missing.inter_site_journey'),missingIndependentPath:N_('provider.progression.missing.independent_path'),
  missingSameCaseContinuity:N_('provider.progression.missing.same_case_continuity'),missingLocalDependencies:N_('provider.progression.missing.local_dependencies'),
  missingOfflineScope:N_('provider.progression.missing.offline_scope'),missingDedicatedCarrier:N_('provider.progression.missing.dedicated_carrier'),
  missingDirectionalAcceptance:N_('provider.progression.missing.directional_acceptance'),missingSecurityOperations:N_('provider.progression.missing.security_operations'),
  missingAttackEvidence:N_('provider.progression.missing.attack_evidence'),missingMarketSample:N_('provider.progression.missing.market_sample'),
  missingSupportIntegrationSample:N_('provider.progression.missing.support_integration_sample'),missingScaleScenario:N_('provider.progression.missing.scale_scenario'),
  missingScaleThreshold:N_('provider.progression.missing.scale_threshold'),missingLoadControls:N_('provider.progression.missing.load_controls'),
  missingOwnedRestore:N_('provider.progression.missing.owned_restore'),missingRestoreReceipts:N_('provider.progression.missing.restore_receipts'),
  missingTwoPaidSites:N_('provider.progression.missing.two_paid_sites'),missingIndependentFailures:N_('provider.progression.missing.independent_failures'),
  missingSurvivingWorkload:N_('provider.progression.missing.surviving_workload'),missingMarketFlow:N_('provider.progression.missing.market_flow'),
  missingMultiSiteCustody:N_('provider.progression.missing.multi_site_custody'),missingProviderAcceptance:N_('provider.progression.missing.provider_acceptance'),
  missingHighLoadScenario:N_('provider.progression.missing.high_load_scenario'),missingHighLoadProof:N_('provider.progression.missing.high_load_proof'),
  missingFourSegments:N_('provider.progression.missing.four_segments'),missingExternalProfit:N_('provider.progression.missing.external_profit')
 });
 const levelId=n=>`progress.progression-level.${n}`,goalId=x=>`progress.goal.${x}`;
 const SOURCE_NAMES=Object.freeze({
  [levelId(1)]:N_('learning.level1'),[levelId(2)]:N_('learning.level2'),[levelId(3)]:N_('learning.level3'),
  [levelId(4)]:N_('learning.level4'),[levelId(5)]:N_('learning.level5'),[levelId(6)]:N_('learning.level6'),
  [levelId(7)]:N_('learning.level7'),[levelId(8)]:N_('learning.level8'),[levelId(9)]:N_('learning.level9'),
  [levelId(10)]:N_('learning.level10'),[levelId(11)]:N_('learning.level11'),[levelId(12)]:N_('learning.level12'),
  [levelId(13)]:N_('learning.level13'),[goalId('bb')]:N_('learning.bb'),[goalId('tr')]:N_('learning.tr'),
  [goalId('ix')]:N_('learning.ix'),[goalId('p5')]:N_('learning.p5'),[goalId('ln')]:N_('learning.ln'),[goalId('bz')]:N_('learning.bz'),
  [goalId('rd')]:N_('learning.rd'),[goalId('ca')]:N_('learning.ca'),[goalId('pn')]:N_('learning.pn'),[goalId('scrub')]:N_('learning.scrub'),
  [goalId('c3')]:N_('learning.c3'),[goalId('t2')]:N_('learning.t2'),[goalId('tb')]:N_('learning.tb'),[goalId('df')]:N_('learning.df'),
  [goalId('m2')]:N_('learning.m2'),[goalId('c5')]:N_('learning.c5'),[goalId('gi')]:N_('learning.gi'),[goalId('t10')]:N_('learning.t10'),
  [goalId('t1')]:N_('learning.t1')
 });
 const RESOURCE_NAMES=Object.freeze({identity:N_('provider.progression.resource.identity'),access:N_('provider.progression.resource.access'),phone:N_('provider.progression.resource.phone'),desk:N_('provider.progression.resource.desk'),people:N_('provider.progression.resource.people'),local:N_('provider.progression.resource.local'),carrier:N_('provider.progression.resource.carrier'),service:N_('provider.progression.resource.service'),messages:N_('provider.progression.resource.messages'),cases:N_('provider.progression.resource.cases'),engage:N_('provider.progression.resource.engage'),room:N_('provider.progression.resource.room'),recorder:N_('provider.progression.resource.recorder'),archive:N_('provider.progression.resource.archive'),speech:N_('provider.progression.resource.speech')});
 const REASONS=Object.freeze([
  ['A Provider acceptance adapter is required; Training awards and snapshots cannot substitute.',KEYS.missingProviderAcceptance],
  ['A bounded backup and restore continuity exercise is not evaluated by this adapter.',KEYS.missingBackupRestore],
  ['A current version-scoped integration test is not available to this facts adapter.',KEYS.missingIntegrationTest],
  ['A dedicated carrier interconnect topology and offer are not evaluated by this adapter.',KEYS.missingDedicatedCarrier],
  ['A domain-level inter-site journey is not evaluated by this adapter.',KEYS.missingInterSiteJourney],
  ['A resolved task linked to that tested integration is not available to this facts adapter.',KEYS.missingLinkedTask],
  ['A sampled market, support, and boundary proof is not evaluated by this adapter.',KEYS.missingMarketSample],
  ['A tested integration edge is not evaluated by this adapter.',KEYS.missingIntegrationEdge],
  ['A versioned authored scale-load scenario is not available to this adapter.',KEYS.missingScaleScenario],
  ['Actual workload surviving a site failure is not evaluated by this adapter.',KEYS.missingSurvivingWorkload],
  ['An eligible paid high-load scenario is not available to this adapter.',KEYS.missingHighLoadScenario],
  ['An explicit human fallback path is not evaluated by this adapter.',KEYS.missingHumanFallback],
  ['An independently sampled service path is not evaluated by this adapter.',KEYS.missingIndependentPath],
  ['An integration support agreement is not authored.',KEYS.missingSupportAgreement],
  ['An owned-site backup and restore operation is not evaluated by this adapter.',KEYS.missingOwnedRestore],
  ['Authored attack rejection and allowed-demand evidence are not evaluated by this adapter.',KEYS.missingAttackEvidence],
  ['Authored inbound customer demand is not evidenced.',KEYS.missingInbound],
  ['Authored same-case cross-channel customer demand is not evaluated by this adapter.',KEYS.missingCrossChannel],
  ['Consequential information-boundary change evidence is not evaluated by this adapter.',KEYS.missingBoundaryConsequences],
  ['Declared connected and offline operating scope is not evaluated by this adapter.',KEYS.missingOfflineScope],
  ['Directional carrier acceptance is not evaluated by this adapter.',KEYS.missingDirectionalAcceptance],
  ['Distributor responsibility records are not authored.',KEYS.missingDistributorResponsibility],
  ['Evaluated assistance task outcomes are not evaluated by this adapter.',KEYS.missingAssistanceOutcomes],
  ['External collaboration acceptance is not evidenced.',KEYS.missingExternalCollaboration],
  ['Five distinct tested integration pairs are not evaluated by this adapter.',KEYS.missingFiveIntegrations],
  ['Four current scoped integration proofs are not evaluated by this adapter.',KEYS.missingFourIntegrations],
  ['Fresh bounded continuity is not evaluated by this adapter.',KEYS.missingBoundedContinuity],
  ['Fresh bounded continuity proof is not evaluated by this adapter.',KEYS.missingBoundedContinuity],
  ['Fresh consolidated external operating profit is not evaluated by this adapter.',KEYS.missingExternalProfit],
  ['Fresh continuity and central settlement proof is not evaluated by this adapter.',KEYS.missingFreshContinuity],
  ['Full multi-site and custody proof is not evaluated by this adapter.',KEYS.missingMultiSiteCustody],
  ['Human-resolution evidence across that same cross-channel case is not evaluated by this adapter.',KEYS.missingHumanResolution],
  ['Independent site failure domains are not evaluated by this adapter.',KEYS.missingIndependentFailures],
  ['Independent-site failure and restore receipts are not evaluated by this adapter.',KEYS.missingSiteFailureRestore],
  ['Market-scoped central settlement sampling is not evaluated by this adapter.',KEYS.missingMarketSettlement],
  ['Meaningful bounded load-window controls are not evaluated by this adapter.',KEYS.missingLoadControls],
  ['Measured high-load human work is not evaluated by this adapter.',KEYS.missingHighLoadProof],
  ['Measured multi-tenant invoice reconciliation is not evaluated by this adapter.',KEYS.missingInvoiceReconciliation],
  ['Migration lineage receipts are not evaluated by this adapter.',KEYS.missingMigrationReceipts],
  ['Named partner responsibility is not authored.',KEYS.missingPartnerResponsibility],
  ['Named qualified support coverage is not authored.',KEYS.missingQualifiedSupport],
  ['Named responsibility records for integrations are not authored.',KEYS.missingResponsibilityRecords],
  ['No Provider customer has been accepted yet.',KEYS.missingNoCustomer],
  ['The full-period record remains, but matching central settlement postings are unavailable or no longer retained.',KEYS.missingSettlementLineage],
  ['No named support-responsibility record is authored for Provider customers.',KEYS.missingSupport],
  ['No non-starter customer has an accepted paid agreement and a recent central customer settlement.',KEYS.missingBilledNonstarter],
  ['No recent full customer settlement has positive consolidated operating result and matching central revenue and cost postings.',KEYS.missingSustainable],
  ['Operating evidence across four deployment profiles is not evaluated by this adapter.',KEYS.missingProfileEvidence],
  ['Paid communications security operations are not evaluated by this adapter.',KEYS.missingSecurityOperations],
  ['Paid distinct site infrastructure is not evaluated by this adapter.',KEYS.missingPaidSite],
  ['Provider public-service acceptance is not adapted; Training awards cannot substitute.',KEYS.missingPublicService],
  ['Provider role-specific responsibility contracts are not authored.',KEYS.missingResponsibilityContract],
  ['Provider role-specific responsibility evidence is not authored.',KEYS.missingRoleResponsibility],
  ['Same-case continuity across an incident is not evaluated by this adapter.',KEYS.missingSameCaseContinuity],
  ['Scoped custody-role observations are not evaluated by this adapter.',KEYS.missingCustodyRoles],
  ['Simultaneous eligible service across four supported segments is not evaluated by this adapter.',KEYS.missingFourSegments],
  ['Simultaneous eligible supported-segment evidence is not evaluated by this adapter.',KEYS.missingSupportedSegments],
  ['Simultaneous support and integration sampling is not evaluated by this adapter.',KEYS.missingSupportIntegrationSample],
  ['Sustained independently eligible tenant evidence is not evaluated by this adapter.',KEYS.missingIndependentTenants],
  ['Sustained market, support, and flow evidence is not evaluated by this adapter; no fifth regulatory profile is inferred.',KEYS.missingMarketFlow],
  ['Sustained mixed workload evidence is not evaluated by this adapter.',KEYS.missingMixedWorkload],
  ['Tenant-specific partner delegation is not authored.',KEYS.missingTenantDelegation],
  ['Two distinct active customers need sampled live support responsibility, ready service, human-resolved work, and central billing in a common 60-minute window.',KEYS.missingTwoCustomers],
  ['Two independently scoped paid sites are not evaluated by this adapter.',KEYS.missingTwoPaidSites],
  ['Two separately scoped paid operating sites are not represented by this adapter.',KEYS.missingIndependentSites],
  ['Typed custody, support, backup, and key evidence is not evaluated by this adapter.',KEYS.missingCustodyEvidence],
  ['Typed local processing dependencies are not evaluated by this adapter.',KEYS.missingLocalDependencies],
  ['Validated restore receipts are not evaluated by this adapter.',KEYS.missingRestoreReceipts],
  ['Versioned scale observation thresholds are not evaluated by this adapter.',KEYS.missingScaleThreshold],
  ['No customer has an accepted retail agreement, paid commissioned service, current ready resources, and resolved autonomous channel work with retained case context.',KEYS.missingFirstLive]
 ]);
 const FALLBACK=Object.freeze({
  title:'Service achievements',ready:'Ready',incomplete:'Incomplete',intro:'Readiness is based on current Provider evidence. A ready row is not claimed and unlocks nothing.',summary:'{ready} of {total} rows currently have evaluated evidence',
  levels:'Progression levels ({ready} of {total} ready)',goals:'Progression goals ({ready} of {total} ready)',evidence:'Observed evidence',missing:'Evidence still needed',noMissing:'The report did not include a specific missing-evidence reason.',noEvidence:'No evidence detail is available.',
  customer:'Customer {id}',interval:'Evidence period {from}–{to}',jobs:'Resolved autonomous journeys',paidStages:'Paid commissioned stages: {count}',postings:'Matching central postings: {count}',job:'{channel} case {caseId}',resource:'{resource}',channelVoice:'voice',channelDigital:'digital',unavailable:'Provider progression evidence is unavailable.',
  missingNoCustomer:'No Provider customer has been accepted yet.',missingFirstLive:'No customer has an accepted retail agreement, paid commissioned service, current ready resources, and resolved autonomous channel work with retained case context.',
  missingBilledNonstarter:'No non-starter customer has an accepted paid agreement and a recent central customer settlement.',missingSustainable:'No recent full customer settlement has positive consolidated operating result and matching central revenue and cost postings.',
  missingSettlementLineage:'The full-period record remains, but matching central settlement postings are unavailable or no longer retained.',missingSupport:'No named support-responsibility record is authored for Provider customers.',
  missingTwoCustomers:'Two distinct active customers need sampled live support responsibility, ready service, human-resolved work, and central billing in a common 60-minute window.',missingResource:'Current observed resource is not ready: {resource}.'
 });
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function text(key,vars){const label=KEYS[key]||key,translated=typeof g.tr==='function'?g.tr(label,vars):label;if(translated&&translated!==label)return translated;let out=FALLBACK[key]||label;if(vars)out=out.replace(/\{(\w+)\}/g,(m,k)=>vars[k]??m);return out;}
 function rowStatus(row){return row?.status==='ready'?'ready':'incomplete';}
 function translatedName(id,fallback){const key=SOURCE_NAMES[id];if(!key)return String(fallback||id);const out=typeof g.tr==='function'?g.tr(key):key;return out&&out!==key?out:String(fallback||id);}
 function translatedResource(id){const key=RESOURCE_NAMES[id];if(!key)return String(id||'');const out=typeof g.tr==='function'?g.tr(key):key;return out&&out!==key?out:String(id).replaceAll('-',' ');}
 function translatedChannel(id){return text(id==='voice'?'channelVoice':'channelDigital');}
 function translateMissing(message){if(typeof message!=='string')return text('noMissing');if(message.startsWith('resource-not-current:'))return text('missingResource',{resource:translatedResource(message.slice('resource-not-current:'.length))});const match=REASONS.find(x=>x[0]===message);if(!match)return text('noMissing');const key=match[1],out=typeof g.tr==='function'?g.tr(key):key;if(out&&out!==key)return out;const fallbackKey=Object.keys(KEYS).find(k=>KEYS[k]===key);return FALLBACK[fallbackKey]||message;}
 function evidenceRows(row){const e=row?.evidence;if(!e||typeof e!=='object')return [];const out=[];if(e.customerId)out.push(text('customer',{id:e.customerId}));if(e.interval&&Number.isFinite(e.interval.from)&&Number.isFinite(e.interval.to))out.push(text('interval',{from:e.interval.from,to:e.interval.to}));if(Array.isArray(e.projectIds)&&e.projectIds.length)out.push(text('paidStages',{count:e.projectIds.length}));if(Array.isArray(e.postingIds)&&e.postingIds.length)out.push(text('postings',{count:e.postingIds.length}));if(Array.isArray(e.jobs)&&e.jobs.length){out.push(text('jobs'));for(const job of e.jobs)if(job&&typeof job.channel==='string'&&typeof job.caseId==='string')out.push(text('job',{channel:translatedChannel(job.channel),caseId:job.caseId}));}return out;}
 function countReady(rows){const list=Object.values(rows||{});return {ready:list.filter(x=>x?.status==='ready').length,total:list.length};}
 function listRows(rows){return Object.entries(rows||{}).map(([id,row])=>{
  const status=rowStatus(row),name=translatedName(id,row?.name||id),missing=Array.isArray(row?.missing)?row.missing:[],evidence=evidenceRows(row);
  const detail=status==='ready'?`<details class="provider-progression-evidence"><summary>${esc(text('evidence'))}</summary>${evidence.length?`<ul>${evidence.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p>${esc(text('noEvidence'))}</p>`}</details>`:`<div class="provider-progression-missing"><strong>${esc(text('missing'))}</strong>${missing.length?`<ul>${missing.map(x=>`<li>${esc(translateMissing(x))}</li>`).join('')}</ul>`:`<p>${esc(text('noMissing'))}</p>`}</div>`;
  return `<li class="provider-progression-row is-${status}" data-progression-id="${esc(id)}"><div class="provider-progression-row-heading"><strong>${esc(name)}</strong><span class="provider-progression-status">${esc(text(status))}</span></div>${detail}</li>`;
 }).join('');}
 function render(model){
  const report=model?.progression||model;
  if(!report||report.pack!=='soc-provider-progression-facts-1'||report.version!==1||!report.levels||!report.goals)return `<section class="provider-progression" aria-label="${esc(text('title'))}"><p>${esc(text('unavailable'))}</p></section>`;
  const levels=countReady(report.levels),goals=countReady(report.goals),total=levels.total+goals.total,ready=levels.ready+goals.ready;
  return `<section class="provider-progression" aria-label="${esc(text('title'))}"><details class="provider-progression-details"><summary><span>${esc(text('title'))}</span><small>${esc(text('summary',{ready,total}))}</small></summary><p class="provider-progression-intro">${esc(text('intro'))}</p><details class="provider-progression-group"><summary>${esc(text('levels',levels))}</summary><ol>${listRows(report.levels)}</ol></details><details class="provider-progression-group"><summary>${esc(text('goals',goals))}</summary><ol>${listRows(report.goals)}</ol></details></details></section>`;
 }
 const LABEL_FALLBACKS={};for(const [internal,key] of Object.entries(KEYS))if(key.startsWith('provider.progression.'))LABEL_FALLBACKS[key]=FALLBACK[internal]||key;for(const [resource,key] of Object.entries(RESOURCE_NAMES))LABEL_FALLBACKS[key]=resource.replaceAll('-',' ');for(const [sentence,key] of REASONS)LABEL_FALLBACKS[key]=sentence;
 g.SOCProviderProgression={render,keys:KEYS,sourceNames:SOURCE_NAMES,resourceNames:RESOURCE_NAMES,labelFallbacks:Object.freeze(LABEL_FALLBACKS)};
})(globalThis);
