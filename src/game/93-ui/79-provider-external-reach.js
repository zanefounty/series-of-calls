/* Read-only external calling and guest collaboration evidence on the customer map. */
(function(g){
 'use strict';
 const N_=g.N_||(value=>value),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={title:N_('provider.external_reach.title'),intro:N_('provider.external_reach.intro'),outbound:N_('provider.external_reach.outbound'),inbound:N_('provider.external_reach.inbound'),guests:N_('provider.external_reach.guests'),ready:N_('provider.external_reach.ready'),pending:N_('provider.external_reach.pending'),session:N_('provider.external_reach.session')};
 const text=(key,vars)=>typeof g.tr==='function'?g.tr(labels[key],vars):labels[key];
 function render(report){
  if(!report)return '';
  return `<details class="provider-external-reach"><summary>${esc(text('title'))}</summary><p>${esc(text('intro'))}</p><ul>${['outbound','inbound','guests'].map(key=>`<li>${esc(text(key,{count:report[key]}))}</li>`).join('')}</ul><p>${esc(text(report.status==='ready'?'ready':'pending'))}</p>${(report.sessions||[]).map(session=>`<p>${esc(text('session',{id:session.id,minutes:session.observedMinutes}))}</p>`).join('')}</details>`;
 }
 g.SOCProviderExternalReachUI={render};
})(globalThis);
