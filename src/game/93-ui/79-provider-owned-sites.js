/* Contextual paid site construction and recovery. Rendering never advances work. */
(function(g){
 'use strict';
 const N_=g.N_||(x=>x),esc=g.SOCProviderHud?.esc||String,money=g.SOCProviderHud?.money||(x=>String(x));
 const labels={title:[N_('provider.owned_sites.title'),'Owned sites and recovery'],purpose:[N_('provider.owned_sites.purpose'),'Fund independent call ingress and local administration, backup and restoration. Recovery work uses real calls and shared staff.'],quote:[N_('provider.owned_sites.quote'),'Review site quote'],terms:[N_('provider.owned_sites.terms'),'{setup} upfront; {recurring} each period; {minutes} implementation minutes; {engineers} engineers and {support} support staff.'],recover:[N_('provider.owned_sites.recover'),'Recover failed dependency'],restore:[N_('provider.owned_sites.restore'),'Restore retained backup'],'retry-migration':[N_('provider.owned_sites.retry_migration'),'Retry incomplete endpoint move'],abort:[N_('provider.owned_sites.abort'),'End failed exercise; retain paid costs'],failed:[N_('provider.owned_sites.failed'),'This exercise failed. End it to release staff and clear its remaining fault, then review a new paid recovery quote.'],waiting:[N_('provider.owned_sites.waiting'),'Resume time to observe the next call and its outcome.'],scope:[N_('provider.owned_sites.scope'),'Selected work: {scope}'],
 'site-diverse-ingress':[N_('provider.operation.site_diverse_ingress.name'),'Independent call ingress'],
 'owned-site-operations':[N_('provider.operation.owned_site_operations.name'),'Owned-site operations'],
 'managed-site-recovery':[N_('provider.operation.managed_site_recovery.name'),'Managed site recovery'],
 'site-recovery':[N_('provider.operation.site_recovery.name'),'Site recovery service'],
 'site-resource-migration':[N_('provider.operation.site_resource_migration.name'),'Move a paid endpoint'],
 'custody-review':[N_('provider.operation.custody_review.name'),'Local custody review']};
 function text(key,vars={}){const [id,fallback]=labels[key],translated=typeof g.tr==='function'?g.tr(id,vars):id;return translated&&translated!==id?translated:fallback.replace(/\{([^}]+)\}/g,(_,k)=>vars[k]??'');}
 function render(customer){
  const actions=customer?.ownedSiteActions||[];if(!actions.length)return '';
  const cards=actions.map(a=>{const q=a.quote,c=a.request.config,scope=c?.resourceId?`${c.resourceId}: ${c.fromSite} → ${c.toSite}`:c?`${c.kind}: ${c.targetSite}`:'';return `<article data-owned-site-offer="${esc(a.id)}"><h4>${esc(text(a.id))}</h4>${scope?`<p>${esc(text('scope',{scope}))}</p>`:''}<p>${esc(text('terms',{setup:money(q.setupCents),recurring:money(q.periodCents),minutes:q.workMinutes,engineers:q.engineers,support:q.support}))}</p>${q.blockers.length?`<p class="provider-blocked">${esc(q.blockers.join('; ').replaceAll('_',' ').toLowerCase())}</p>`:''}<button type="button" data-provider-action="operation" data-operation="${esc(a.id)}" data-operation-config="${esc(JSON.stringify(c||null))}" data-id="${esc(customer.id)}"${a.available?'':' disabled'}>${esc(text('quote'))}</button></article>`;}).join('');
  const responses=(customer.siteResponses||[]).map(r=>`<article data-site-response="${esc(r.projectId)}"><p>${esc(text(r.abort?'failed':'waiting'))}</p>${['recover','restore','abort','retry-migration'].filter(key=>r[key]).map(key=>`<button type="button" class="primary" data-provider-action="site-response" data-id="${esc(r.projectId)}" data-provider-value="${key}">${esc(text(key))}</button>`).join('')}</article>`).join('');
  return `<section class="provider-owned-sites"><h3>${esc(text('title'))}</h3><p>${esc(text('purpose'))}</p>${responses}${cards}</section>`;
 }
 g.SOCProviderOwnedSitesUI={render};
})(typeof globalThis==='object'?globalThis:window);
