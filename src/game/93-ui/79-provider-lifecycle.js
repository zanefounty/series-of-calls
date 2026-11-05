/* Pure Provider product retirement preview and action controls. */
(function(g){
 'use strict';
 const N_=g.N_||(x=>x);
 const KEYS=Object.freeze({
  retireService:N_('provider.lifecycle.retire_service'),retirementPending:N_('provider.lifecycle.retirement_pending'),
  effectiveAt:N_('provider.lifecycle.effective_at'),commitmentEnds:N_('provider.lifecycle.commitment_ends'),
  reviewRetirement:N_('provider.lifecycle.review_retirement'),recommission:N_('provider.lifecycle.recommission'),
  retainedSetup:N_('provider.lifecycle.retained_setup'),noRefund:N_('provider.lifecycle.no_refund'),remainingCommitment:N_('provider.lifecycle.remaining_commitment'),
  recurringAfterTerm:N_('provider.lifecycle.recurring_after_term'),affectedWork:N_('provider.lifecycle.affected_work'),
  resources:N_('provider.lifecycle.resources'),activeWorkWarning:N_('provider.lifecycle.active_work_warning'),
  recordsRetained:N_('provider.lifecycle.records_retained'),recommissionPaid:N_('provider.lifecycle.recommission_paid'),
  confirm:N_('provider.lifecycle.confirm'),cancel:N_('provider.lifecycle.cancel'),blocked:N_('provider.lifecycle.blocked'),
  noAffectedWork:N_('provider.lifecycle.no_affected_work'),noResources:N_('provider.lifecycle.no_resources'),
  item:N_('provider.lifecycle.item'),case:N_('provider.lifecycle.case'),kindVoice:N_('provider.lifecycle.kind.voice'),
  kindMessage:N_('provider.lifecycle.kind.message'),kindMeeting:N_('provider.lifecycle.kind.meeting'),kindProcessing:N_('provider.lifecycle.kind.processing'),kindOther:N_('provider.lifecycle.kind.other'),
  resourceIdentity:N_('provider.lifecycle.resource.identity'),resourceAccess:N_('provider.lifecycle.resource.access'),resourcePhone:N_('provider.lifecycle.resource.phone'),
  resourceDesk:N_('provider.lifecycle.resource.desk'),resourcePeople:N_('provider.lifecycle.resource.people'),resourceLocal:N_('provider.lifecycle.resource.local'),
  resourceCarrier:N_('provider.lifecycle.resource.carrier'),resourceService:N_('provider.lifecycle.resource.service'),resourceMessages:N_('provider.lifecycle.resource.messages'),
  resourceCases:N_('provider.lifecycle.resource.cases'),resourceEngage:N_('provider.lifecycle.resource.engage'),resourceRoom:N_('provider.lifecycle.resource.room'),
  resourceRecorder:N_('provider.lifecycle.resource.recorder'),resourceArchive:N_('provider.lifecycle.resource.archive'),resourceSpeech:N_('provider.lifecycle.resource.speech')
 });
 const FALLBACK=Object.freeze({
  retireService:'Retire service',retirementPending:'Product retirement',effectiveAt:'Effective at minute',commitmentEnds:'Supplier commitment ends at minute',
  reviewRetirement:'Review retirement terms',recommission:'Review paid recommissioning',retainedSetup:'Retained setup cost',noRefund:'The original setup cost is not refunded.',remainingCommitment:'Remaining minimum supplier commitment',
  recurringAfterTerm:'Recurring cost after the minimum term',affectedWork:'Affected active work',resources:'Affected resources',activeWorkWarning:'Active work using this product may fail while retirement takes effect.',
  recordsRetained:'Previously retained records are not deleted by retirement.',recommissionPaid:'Recommissioning is a separate paid order.',confirm:'Confirm retirement',cancel:'Keep service',blocked:'Resolve the retirement quote blockers before continuing.',
  noAffectedWork:'No active work is currently affected.',noResources:'No affected resource list was supplied.',item:'{kind} · {id}',case:'case {id}',kindVoice:'voice call',kindMessage:'digital message',kindMeeting:'meeting',kindProcessing:'processing job',kindOther:'work item',
  resourceIdentity:'Identity',resourceAccess:'Access path',resourcePhone:'Calling platform',resourceDesk:'Service desk',resourcePeople:'Workforce',resourceLocal:'Local service',
  resourceCarrier:'Carrier connection',resourceService:'Customer context',resourceMessages:'Messaging',resourceCases:'Case handling',resourceEngage:'Engagement',resourceRoom:'Meeting room',
  resourceRecorder:'Recording',resourceArchive:'Archive storage',resourceSpeech:'Speech processing'
 });
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function text(key,vars){const label=KEYS[key],translated=typeof g.tr==='function'?g.tr(label,vars):label;if(translated&&translated!==label)return translated;let out=FALLBACK[key]||label;if(vars)out=out.replace(/\{(\w+)\}/g,(m,k)=>vars[k]??m);return out;}
 function money(cents){if(!Number.isFinite(cents))return '—';return `A$${(cents/100).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
 function recordKind(kind){const k=({voice:'kindVoice',message:'kindMessage',meeting:'kindMeeting',processing:'kindProcessing'})[kind]||'kindOther';return text(k);}
 function resourceName(id){const k=({identity:'resourceIdentity',access:'resourceAccess',phone:'resourcePhone',desk:'resourceDesk',people:'resourcePeople',local:'resourceLocal',carrier:'resourceCarrier',service:'resourceService',messages:'resourceMessages',cases:'resourceCases',engage:'resourceEngage',room:'resourceRoom',recorder:'resourceRecorder',archive:'resourceArchive',speech:'resourceSpeech'})[id];return k?text(k):String(id||'');}
 function actions(project){
  if(!project||project.kind!=='operation'||!project.productId||project.status!=='complete')return '';
  if(project.retirement){const r=project.retirement;return `<section class="provider-product-retirement" data-project-id="${esc(project.id)}"><h3>${esc(text('retirementPending'))}</h3><dl><dt>${esc(text('effectiveAt'))}</dt><dd> ${Number.isFinite(r.effectiveAt)?r.effectiveAt:'—'}</dd><dt>${esc(text('commitmentEnds'))}</dt><dd> ${Number.isFinite(r.commitmentEndsAt)?r.commitmentEndsAt:'—'}</dd></dl><button data-provider-action="operation" data-operation="${esc(project.productId)}" data-id="${esc(project.customerId)}">${esc(text('recommission'))}</button></section>`;}
  return `<button data-provider-action="retire-project" data-id="${esc(project.id)}">${esc(text('reviewRetirement'))}</button>`;
 }
 function quote(q){
  if(!q||q.action!=='retire-project')return '';
  const c=q.commercial||{},blocked=Array.isArray(q.blockers)&&q.blockers.length>0,work=Array.isArray(c.affectedWork)?c.affectedWork:[],resources=Array.isArray(c.resources)?c.resources:[];
  const workRows=work.map(x=>{if(!x||typeof x!=='object')return '';const id=String(x.id??''),kind=recordKind(x.kind);return `<li>${esc(text('item',{kind,id}))}${x.caseId?` · ${esc(text('case',{id:String(x.caseId)}))}`:''}</li>`;}).filter(Boolean);
  const resourceRows=resources.map(resourceName).filter(Boolean);
  return `<div class="provider-modal provider-retirement-modal" role="dialog" aria-modal="true" aria-labelledby="provider-retirement-title"><section><h2 id="provider-retirement-title">${esc(text('retireService'))}</h2><p>${esc(text('retainedSetup'))}: ${esc(money(c.retainedSetupCents))}. ${esc(text('noRefund'))}</p><dl><dt>${esc(text('effectiveAt'))}</dt><dd> ${Number.isFinite(c.effectiveAt)?c.effectiveAt:'—'}</dd><dt>${esc(text('commitmentEnds'))}</dt><dd> ${Number.isFinite(c.commitmentEndsAt)?c.commitmentEndsAt:'—'}</dd><dt>${esc(text('remainingCommitment'))}</dt><dd>${esc(money(c.remainingMinimumSupplierCents))}</dd><dt>${esc(text('recurringAfterTerm'))}</dt><dd>${esc(money(c.recurringAfterTermCents))}</dd></dl><section><h3>${esc(text('affectedWork'))}</h3>${workRows.length?`<ul>${workRows.join('')}</ul>`:`<p>${esc(text('noAffectedWork'))}</p>`}</section><section><h3>${esc(text('resources'))}</h3>${resourceRows.length?`<ul>${resourceRows.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p>${esc(text('noResources'))}</p>`}</section><p class="provider-blocked">${esc(text('activeWorkWarning'))}</p><p>${esc(text('recordsRetained'))}</p><p>${esc(text('recommissionPaid'))}</p>${blocked?`<p class="provider-blocked">${esc(text('blocked'))}</p>`:''}<button class="primary" data-provider-action="confirm-quote"${blocked?' disabled':''}>${esc(text('confirm'))}</button><button data-provider-action="cancel-quote">${esc(text('cancel'))}</button></section></div>`;
 }
 const LABEL_FALLBACKS=Object.fromEntries(Object.entries(KEYS).map(([key,label])=>[label,FALLBACK[key]||label]));
 g.SOCProviderLifecycle={actions,quote,keys:KEYS,labelFallbacks:Object.freeze(LABEL_FALLBACKS)};
})(globalThis);
