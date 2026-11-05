/* Pure inspector for paid physical transport. All decisions are revalidated by Provider quote/dispatch. */
(function(g){
 'use strict';
 const N_=g.N_||(x=>x),esc=g.SOCProviderHud?.esc||String,money=g.SOCProviderHud?.money||((n)=>Number.isSafeInteger(n)?`A$${(n/100).toFixed(2)}`:'—');
 const COPY=Object.freeze({
  title:[N_('provider.resilience.title'),'Transport paths'],
  primary:[N_('provider.resilience.primary'),'Primary path'],
  diverse:[N_('provider.resilience.diverse'),'Independent backup'],
  primaryOffer:[N_('provider.resilience.primary_offer'),'Direct primary upstream'],
  diverseOffer:[N_('provider.resilience.diverse_offer'),'Independent backup upstream'],
  managedOffer:[N_('provider.resilience.managed_offer'),'Supplier-managed diverse upstream'],
  bindingOffer:[N_('provider.resilience.binding_offer'),'Add a site binding'],
  site:[N_('provider.resilience.site'),'Transport site'],
  link:[N_('provider.resilience.link'),'Transport link'],
  ready:[N_('provider.resilience.ready'),'Available'],
  unavailable:[N_('provider.resilience.unavailable'),'Unavailable'],
  provisioning:[N_('provider.resilience.provisioning'),'Provisioning'],
  effective:[N_('provider.resilience.effective'),'Effective'],
  effectivePresent:[N_('provider.resilience.effective_present'),'Present'],
  observed:[N_('provider.resilience.observed'),'Observed availability'],
  generation:[N_('provider.resilience.generation'),'Effective generation'],
  desiredGeneration:[N_('provider.resilience.desired_generation'),'Desired generation'],
  due:[N_('provider.resilience.due'),'Planned completion minute'],
  region:[N_('provider.resilience.region'),'Region'],
  domain:[N_('provider.resilience.domain'),'Failure domain'],
  shared:[N_('provider.resilience.shared_domain'),'Shared failure dependency'],
  noShared:[N_('provider.resilience.no_shared_domain'),'None'],
  sharedLinks:[N_('provider.resilience.shared_links'),'Other links in this domain'],
  bindingResource:[N_('provider.resilience.binding_resource'),'Bound customer resource'],
  bindingSite:[N_('provider.resilience.binding_site'),'Bound site'],
  capacity:[N_('provider.resilience.capacity'),'Link capacity'],
  required:[N_('provider.resilience.required'),'Path reservation'],
  occupied:[N_('provider.resilience.occupied'),'Reserved bandwidth'],
  remaining:[N_('provider.resilience.remaining'),'Remaining bandwidth'],
  latency:[N_('provider.resilience.latency'),'Measured path latency'],
  routeEdges:[N_('provider.resilience.route_edges'),'Selected link sequence'],
  choicesTitle:[N_('provider.resilience.choices_title'),'Path and binding choices'],
  recoveryTitle:[N_('provider.resilience.recovery_title'),'Failure response'],
  quoteButton:[N_('provider.resilience.quote_button'),'Review quote'],
  repair:[N_('provider.resilience.repair'),'Repair transport path'],
  workloadTitle:[N_('provider.resilience.workload_title'),'Authored continuity case'],
  workloadBrief:[N_('provider.resilience.workload_brief'),'Each full period contains {dueCases} due cases. Once the primary path is funded, the first authored case can test a three-call sequence. Other cases and the due count stay unchanged.'],
  workloadTerms:[N_('provider.resilience.workload_terms'),'Each sequence has a {deadlineMinutes}-minute due deadline, a {windowMinutes}-minute continuity window, a {followupDurationMinutes}-minute follow-up duration and a {maximumLatencyMs} ms maximum path latency.'],
  sequencesTitle:[N_('provider.resilience.sequences_title'),'Continuity sequences'],
  caseLabel:[N_('provider.resilience.case_label'),'Case'],
  phasesLabel:[N_('provider.resilience.phases_label'),'Calls completed'],
  windowStart:[N_('provider.resilience.window_start'),'Window started minute {minute}'],
  deadlineAt:[N_('provider.resilience.deadline_at'),'Due minute {minute}'],
  sequenceFailure:[N_('provider.resilience.sequence_failure'),'Response detail'],
  lead:[N_('provider.resilience.lead'),'Lead time'],
  implementation:[N_('provider.resilience.implementation_minutes'),'Implementation work'],
  commissioning:[N_('provider.resilience.commissioning_minutes'),'Commissioning lead'],
  staff:[N_('provider.resilience.staff'),'Engineers / support'],
  blockers:[N_('provider.resilience.blockers'),'Not currently eligible'],
  noPaths:[N_('provider.resilience.no_paths'),'No paid transport path is present for this customer.'],
  minute:[N_('provider.resilience.minute'),'Minute {minute}'],
  bandwidthMbps:[N_('provider.resilience.bandwidth_mbps'),'{value} Mbps'],
  bandwidthKbps:[N_('provider.resilience.bandwidth_kbps'),'{value} Kbps'],
  latencyMs:[N_('provider.resilience.latency_ms'),'{value} ms'],
  failed:[N_('provider.resilience.domain_failed'),'Failed'],
  healthy:[N_('provider.resilience.domain_healthy'),'Available']
 });
 const text=(key,vars={})=>{const [id,fallback]=COPY[key],value=typeof g.tr==='function'?g.tr(id,vars):id;return value&&value!==id?value:fallback.replace(/\{([^}]+)\}/g,(_,name)=>vars[name]??`{${name}}`);};
 const number=x=>Number.isFinite(x)?String(x):'—';
 const row=(name,value)=>`<div class="provider-resilience-row"><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`;
 function pathCard(key,summary,transport){
  if(!summary)return '';
  const pathLinks=new Map((transport.links||[]).map(x=>[x.id,x])),ids=Array.isArray(summary.edges)?summary.edges:[],domains=[...new Set(ids.map(id=>pathLinks.get(id)?.domain).filter(Boolean))],other=transport.paths?.[key==='primary'?'diverse':'primary'],otherDomains=new Set((other?.edges||[]).map(id=>pathLinks.get(id)?.domain).filter(Boolean)),shared=domains.filter(domain=>otherDomains.has(domain));
  return `<article class="provider-resilience-path ${summary.ready===true?'is-ready':'is-unavailable'}" data-path-kind="${esc(key)}"><h4>${esc(text(key))}</h4><p>${esc(summary.ready===true?text('ready'):text('unavailable'))}</p><dl>${row(text('latency'),summary.latencyMs===null||summary.latencyMs===undefined?'—':text('latencyMs',{value:summary.latencyMs}))}${row(text('required'),summary.kbps===null||summary.kbps===undefined?'—':text('bandwidthKbps',{value:summary.kbps}))}${row(text('routeEdges'),ids.join(' → ')||'—')}${row(text('domain'),domains.join(', ')||'—')}${row(text('shared'),shared.join(', ')||text('noShared'))}</dl></article>`;
 }
 function siteDetails(site,transport){
  const siteId=site.transportId||site.id,status=site.observed?.ready===true||site.ready===true?text('ready'):text('unavailable'),shared=(transport.links||[]).filter(link=>link.from===siteId||link.to===siteId).map(link=>link.domain).filter(Boolean);
  const bindings=(transport.bindings||[]).filter(x=>x.site===siteId).map(x=>x.resource);
  return `<section class="provider-resilience-object" data-transport-site="${esc(siteId)}"><h3>${esc(site.name||text('site'))}</h3><dl>${row(text('region'),site.region||'—')}${row(text('observed'),status)}${row(text('provisioning'),site.provisioning?.status||'—')}${row(text('effective'),site.effective?.ready===true?text('ready'):site.effective?text('effectivePresent'):'—')}${row(text('generation'),number(site.effective?.generation))}${row(text('desiredGeneration'),number(site.provisioning?.generation??site.desiredGeneration))}${row(text('due'),site.provisioning?.due===undefined?'—':text('minute',{minute:site.provisioning.due}))}${row(text('domain'),site.domain||'—')}${row(text('shared'),[site.powerDomain,site.domain].filter(Boolean).join(', ')||'—')}${row(text('sharedLinks'),[...new Set(shared)].join(', ')||'—')}${row(text('routeEdges'),bindings.join(', ')||'—')}</dl></section>`;
 }
 function linkDetails(link,transport){
  const linkId=link.transportId||link.id,shared=(transport.links||[]).filter(other=>(other.transportId||other.id)!==linkId&&other.domain&&other.domain===link.domain).map(other=>other.id),domain=transport.domains?.find(x=>x.id===link.domain);
  return `<section class="provider-resilience-object" data-transport-link="${esc(linkId)}"><h3>${esc(link.name||text('link'))}</h3><dl>${row(text('provisioning'),link.provisioning?.status||'—')}${row(text('effective'),link.effective?text('effectivePresent'):'—')}${row(text('generation'),number(link.effective?.generation))}${row(text('desiredGeneration'),number(link.provisioning?.generation??link.desiredGeneration))}${row(text('due'),link.provisioning?.due===undefined?'—':text('minute',{minute:link.provisioning.due}))}${row(text('observed'),link.observed?.ready===true||link.ready===true?text('ready'):text('unavailable'))}${row(text('capacity'),link.effective?.capacityMbps===undefined?'—':text('bandwidthMbps',{value:link.effective.capacityMbps}))}${row(text('occupied'),link.usage?.occupiedKbps===undefined?'—':text('bandwidthKbps',{value:link.usage.occupiedKbps}))}${row(text('remaining'),link.usage?.remainingKbps===undefined?'—':text('bandwidthKbps',{value:link.usage.remainingKbps}))}${row(text('latency'),link.effective?.latencyMs===undefined?'—':text('latencyMs',{value:link.effective.latencyMs}))}${row(text('domain'),`${link.domain||'—'} · ${domain?.failed===true?text('failed'):text('healthy')}`)}${row(text('shared'),shared.join(', ')||text('noShared'))}${row(text('region'),`${link.from||'—'} → ${link.to||'—'}`)}</dl></section>`;
 }
 function actionRows(actions,customerId){
  const allow=new Set(['primary-upstream','diverse-upstream','managed-diverse-upstream','upstream-binding-extension','transport-repair']);
  return (actions||[]).filter(action=>allow.has(action?.id||action?.operationId)).map(action=>{
   const id=action.id||action.operationId,quote=action.quote||{},definition=quote.definition||action.definition||{},blockers=quote.blockers||action.blockers||[],available=action.available===true&&blockers.length===0,details=[quote.setupCents??action.setupCents,quote.periodCents??action.periodCents],lead=quote.leadMinutes??quote.workMinutes??action.leadMinutes??action.workMinutes,engineers=quote.engineers??action.engineers,support=quote.support??action.support,labels={'primary-upstream':'primaryOffer','diverse-upstream':'diverseOffer','managed-diverse-upstream':'managedOffer','upstream-binding-extension':'bindingOffer','transport-repair':'repair'},name=action.name||definition.name||quote.name||g.SOCProviderPanels?.operationName?.({id})||text(labels[id]||'link'),description=action.description||definition.description||quote.description||g.SOCProviderPanels?.operationDescription?.({id})||'',capacity=quote.capacityKbps??quote.effect?.capacityKbps??action.capacityKbps,transportTerms=quote.commercial?.transport;
   const terms=`${money(details[0])} setup · ${money(details[1])} / period`;
   return `<li class="provider-resilience-offer ${available?'is-available':'is-blocked'}" data-operation="${esc(id)}"><div><strong>${esc(name)}</strong>${description?`<small>${esc(description)}</small>`:''}<small>${esc(terms)}</small>${lead!==undefined?`<small>${esc(text('lead'))}: ${esc(lead)} min</small>`:''}${engineers!==undefined||support!==undefined?`<small>${esc(text('staff'))}: ${esc(engineers??'—')} / ${esc(support??'—')}</small>`:''}${Number.isFinite(transportTerms?.implementationMinutes)?`<small>${esc(text('implementation'))}: ${esc(transportTerms.implementationMinutes)} min</small>`:''}${Number.isFinite(transportTerms?.commissioningMinutes)?`<small>${esc(text('commissioning'))}: ${esc(transportTerms.commissioningMinutes)} min</small>`:''}${capacity!==undefined?`<small>${esc(text('capacity'))}: ${esc(text('bandwidthKbps',{value:capacity}))}</small>`:''}${blockers.length?`<small class="provider-blocked">${esc(text('blockers'))}: ${esc(blockers.map(x=>String(x).replaceAll('_',' ').toLowerCase()).join(', '))}</small>`:''}</div><button type="button" data-provider-action="operation" data-operation="${esc(id)}" data-id="${esc(customerId)}" ${available?'':'disabled'}>${esc(text('quoteButton'))}</button></li>`;
  }).join('');
 }
 function workloadDetails(workload){if(!workload||workload.version!==1)return '';const brief=text('workloadBrief',{dueCases:number(workload.dueCases)}),terms=text('workloadTerms',{deadlineMinutes:number(workload.deadlineMinutes),windowMinutes:number(workload.windowMinutes),followupDurationMinutes:number(workload.followupDurationMinutes),maximumLatencyMs:number(workload.maximumLatencyMs)}),rows=(workload.sequences||[]).map(row=>`<li data-sequence-status="${esc(row.status||'unknown')}"><strong>${esc(text('caseLabel'))} ${esc(row.caseId||'—')}</strong><span>${esc(row.status||'—')} · ${esc(text('phasesLabel'))}: ${esc(number(row.phaseCount))}</span><span>${esc(text('windowStart',{minute:number(row.windowStart)}))} · ${esc(text('deadlineAt',{minute:number(row.deadlineAt)}))}</span>${row.failure?`<span class="provider-blocked">${esc(text('sequenceFailure'))}: ${esc(String(row.failure).replaceAll('_',' ').toLowerCase())}</span>`:''}</li>`).join('');return `<section class="provider-resilience-workload"><h3>${esc(text('workloadTitle'))}</h3><p>${esc(brief)}</p><p>${esc(terms)}</p>${rows?`<details><summary>${esc(text('sequencesTitle'))} · ${workload.sequences.length}</summary><ul>${rows}</ul></details>`:''}</section>`;}
 function render({transport,selection=null,actions=[],workload=null,customerId}={}){
  if(!transport||transport.version!==1||!customerId)return '';
  const selectedType=selection?.type||selection?.objectType,siteId=selection?.siteId||selection?.transportId,linkId=selection?.linkId||selection?.transportId,site=selectedType==='transport-site'?transport.sites?.find(x=>x.id===siteId):null,link=selectedType==='transport-path'||selectedType==='transport-link'?transport.links?.find(x=>x.id===linkId):null,binding=selectedType==='transport-binding'?transport.bindings?.find(x=>x.resource===selection.resourceId&&x.site===selection.siteId):null;
  const paths=transport.paths||{},actionModel=Array.isArray(actions)?{choices:actions,recovery:[]}:actions||{choices:[],recovery:[]},choices=actionRows(actionModel.choices||[],customerId),recovery=actionRows(actionModel.recovery||[],customerId),links=transport.links||[],sites=transport.sites||[];
  if(!sites.length&&!links.length&&!choices&&!recovery)return '';
  return `<section class="provider-resilience" aria-label="${esc(text('title'))}" data-customer="${esc(customerId)}"><h2>${esc(text('title'))}</h2>${workloadDetails(workload)}${links.length?`<div class="provider-resilience-paths">${pathCard('primary',paths.primary,transport)}${pathCard('diverse',paths.diverse,transport)}</div>`:`<p>${esc(text('noPaths'))}</p>`}${site?siteDetails(site,transport):link?linkDetails(link,transport):binding?`<section class="provider-resilience-object" data-transport-binding="${esc(binding.resource)}"><h3>${esc(text('bindingResource'))}</h3><dl>${row(text('bindingResource'),binding.resource)}${row(text('bindingSite'),binding.site)}</dl></section>`:''}${choices?`<section class="provider-resilience-quotes"><h3>${esc(text('choicesTitle'))}</h3><ul>${choices}</ul></section>`:''}${recovery?`<section class="provider-resilience-recovery"><h3>${esc(text('recoveryTitle'))}</h3><ul>${recovery}</ul></section>`:''}</section>`;
 }
 g.SOCProviderResilienceUI={render,labelFallbacks:Object.freeze(Object.fromEntries(Object.entries(COPY).map(([key,[id,fallback]])=>[id,fallback])))};
})(globalThis);
