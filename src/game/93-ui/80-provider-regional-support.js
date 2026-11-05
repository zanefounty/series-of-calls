/* Pure contextual Provider support comparison; mutations remain in SOC.dispatch. */
(function(g){
 'use strict';
 const N_=g.N_||(x=>x),KEYS=Object.freeze({quoteTitle:N_('provider.regional_support.quote_title'),customer:N_('provider.regional_support.customer'),previousCommitment:N_('provider.regional_support.previous_commitment'),newMinimum:N_('provider.regional_support.new_minimum'),replacementScope:N_('provider.regional_support.replacement_scope'),quoteBoundary:N_('provider.regional_support.quote_boundary'),retainedProject:N_('provider.regional_support.retained_project'),assignmentRefs:N_('provider.regional_support.assignment_refs'),minimumAtQuote:N_('provider.regional_support.minimum_at_quote'),busy:N_('provider.regional_support.busy'),replacement:N_('provider.regional_support.replacement'),minimum:N_('provider.regional_support.minimum'),title:N_('provider.regional_support.title'),
  separate:N_('provider.regional_support.separate'),
  condition:N_('provider.regional_support.condition'),
  covered:N_('provider.regional_support.covered'),
  unavailable:N_('provider.regional_support.unavailable'),
  person:N_('provider.regional_support.person'),
  employer:N_('provider.regional_support.employer'),
  market:N_('provider.regional_support.market'),
  language:N_('provider.regional_support.language'),
  slots:N_('provider.regional_support.slots'),
  shift:N_('provider.regional_support.shift'),
  business:N_('provider.regional_support.business'),
  extended:N_('provider.regional_support.extended'),
  scope:N_('provider.regional_support.scope'),
  setup:N_('provider.regional_support.setup'),
  recurring:N_('provider.regional_support.recurring'),
  preparation:N_('provider.regional_support.preparation'),
  minutes:N_('provider.regional_support.minutes'),
  staff:N_('provider.regional_support.staff'),
  staffUnits:N_('provider.regional_support.staff_units'),
  review:N_('provider.regional_support.review'),
  choices:N_('provider.regional_support.choices'),
  requirements:N_('provider.regional_support.requirements'),
  shiftGap:N_('provider.regional_support.shift_gap'),
  paidRequired:N_('provider.regional_support.paid_required'),
  slotsRequired:N_('provider.regional_support.slots_required'),
  scopeLimit:N_('provider.regional_support.scope_limit'),
  pending:N_('provider.regional_support.pending'),
  already:N_('provider.regional_support.already'),
  unknownBlock:N_('provider.regional_support.unknown_block'),
  evidence:N_('provider.regional_support.evidence'),
  history:N_('provider.regional_support.history'),
  earned:N_('provider.regional_support.earned'),
  waiting:N_('provider.regional_support.waiting')});
 const FALLBACK=Object.freeze({quoteTitle:"Named regional support commitment",customer:"Customer",previousCommitment:"Previous assignment minimum still payable",newMinimum:"New setup and minimum recurring commitment",replacementScope:"The new assignment starts after commissioning. It does not erase the earlier assignment, its settled bills or its remaining minimum charges.",quoteBoundary:"Coverage remains subject to the named person\u2019s paid hours, shared support staffing and the quoted customer scope. It does not create customer handling capacity.",retainedProject:"Previous paid assignment",assignmentRefs:"Assignment references",minimumAtQuote:"Review the quote for the exact minimum term and retained obligations.",busy:"Paid implementation work currently occupies the support people needed for this coverage.",replacement:"Extended coverage replaces this person’s business-hours assignment after paid delivery. Existing minimum supplier charges remain due.",minimum:"Minimum term: {count} periods","title": "Regional support", "separate": "These are Provider support people. They do not add customer agents, BPO staff or calling licences.", "condition": "Current coverage", "covered": "Covered now", "unavailable": "Coverage unavailable", "person": "Named support person", "employer": "Employer", "market": "Market", "language": "Support languages", "slots": "Named people / paid support slots", "shift": "Coverage hours", "business": "Business hours: 08:00–20:00", "extended": "Extended: all day", "scope": "Maximum two customers in the same market per person.", "setup": "Setup", "recurring": "Per period", "preparation": "Preparation", "minutes": "{count} minutes", "staff": "Implementation staffing", "staffUnits": "{engineers} engineers, {support} support", "review": "Review coverage quote", "choices": "Compare paid coverage", "requirements": "Coverage requirements", "shiftGap": "The named person is outside their paid coverage hours.", "paidRequired": "Fund and commission named support for this customer.", "slotsRequired": "Increase paid Provider support staffing before assigning another person.", "scopeLimit": "This named person already covers the maximum customer scope.", "pending": "A coverage order is already pending for this customer.", "already": "This customer already has effective named support coverage.", "unknownBlock": "An eligibility check prevents this order. Review the technical evidence.", "evidence": "Technical coverage evidence", "history": "Historical qualification", "earned": "Earned evidence retained; current readiness is assessed separately.", "waiting": "A complete supported 60-minute window is still required."});
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function text(key,vars){const label=KEYS[key],translated=typeof g.tr==='function'?g.tr(label,vars):label;return translated&&translated!==label?translated:(FALLBACK[key]||label).replace(/\{(\w+)\}/g,(m,k)=>vars?.[k]??m);}
 function money(cents){if(!Number.isSafeInteger(cents))return '—';return g.SOCProviderHud?.money(cents)??'A$'+(cents/100).toFixed(2);}
 function reason(code){if(/BUSY_WITH_IMPLEMENTATION/.test(code))return 'busy';if(/OUT_OF_SHIFT/.test(code))return 'shiftGap';if(/SLOTS|PAYROLL/.test(code))return 'slotsRequired';if(/SCOPE_LIMIT/.test(code))return 'scopeLimit';if(/ALREADY_PENDING/.test(code))return 'pending';if(/ALREADY_HAS/.test(code))return 'already';if(/PAID_NAMED|ASSIGNMENT_REQUIRED/.test(code))return 'paidRequired';return 'unknownBlock';}
 function blockers(codes){return [...new Set((codes||[]).map(reason))].map(k=>`<li>${esc(text(k))}</li>`).join('');}
 function render(model){
  if(!model||model.version!==1||!model.customerId)return '';
  const current=model.current||{},person=model.person,capacity=current.capacity||{},offers=Array.isArray(model.offers)?model.offers:[];
  const terms=offer=>{const p=offer.terms||{},request=offer.request||{},eligible=offer.eligible===true&&request.customerId===model.customerId&&request.market===model.market&&request.personId===person?.id;
   return `<article class="provider-support-offer" data-coverage="${esc(request.coverageId)}"><h4>${esc(text(request.coverageId==='business-hours'?'business':'extended'))}</h4><dl><dt>${esc(text('setup'))}</dt><dd>${esc(money(p.setupCents))}</dd><dt>${esc(text('recurring'))}</dt><dd>${esc(money(p.periodCents))}</dd><dt>${esc(text('preparation'))}</dt><dd>${esc(text('minutes',{count:p.workMinutes}))}</dd><dt>${esc(text('staff'))}</dt><dd>${esc(text('staffUnits',{engineers:p.engineers,support:p.support}))}</dd></dl>${offer.supportReplacesProjectId?`<p>${esc(text('replacement'))}</p>`:''}${Number.isSafeInteger(p.minimumTermPeriods)?`<p>${esc(text('minimum',{count:p.minimumTermPeriods}))}</p>`:`<p>${esc(text('minimumAtQuote'))}</p>`}${offer.missing?.length?`<ul>${blockers(offer.missing)}</ul>`:''}<button type="button" style="min-height:44px;width:100%" data-provider-action="quote-regional-support" data-customer="${esc(model.customerId)}" data-market="${esc(model.market)}" data-person="${esc(request.personId)}" data-coverage="${esc(request.coverageId)}"${eligible?'':' disabled'}>${esc(text('review'))}</button></article>`;
  };
  return `<section class="provider-regional-support"><h3>${esc(text('title'))}</h3><p>${esc(text('separate'))}</p><dl><dt>${esc(text('condition'))}</dt><dd>${esc(text(current.eligible===true?'covered':'unavailable'))}</dd><dt>${esc(text('market'))}</dt><dd>${esc(model.market)}</dd>${person?`<dt>${esc(text('person'))}</dt><dd>${esc(person.name||person.id)}</dd><dt>${esc(text('employer'))}</dt><dd>${esc(person.employer)}</dd><dt>${esc(text('language'))}</dt><dd>${esc((person.languages||[]).join(', '))}</dd>`:''}<dt>${esc(text('slots'))}</dt><dd>${esc(capacity.used??0)} / ${esc(capacity.limit??0)}</dd></dl><p>${esc(text('scope'))}</p>${current.missing?.length?`<h4>${esc(text('requirements'))}</h4><ul>${blockers(current.missing)}</ul>`:''}<h4>${esc(text('choices'))}</h4><div class="provider-support-choices">${offers.map(terms).join('')}</div>${model.retainedClaims?.length?`<h4>${esc(text('history'))}</h4><p>${esc(text('earned'))}</p><ul>${model.retainedClaims.map(r=>`<li>${esc(r.sourceId)} · ${esc(r.receiptId)}</li>`).join('')}</ul>`:`<p>${esc(text('waiting'))}</p>`}<details><summary>${esc(text('evidence'))}</summary><pre>${esc(JSON.stringify({current,asOf:model.asOf,retainedClaims:model.retainedClaims||[]},null,2))}</pre></details></section>`;
 }
  function quote(commercial,context={}){
  if(!commercial)return '';
  const plan=commercial.plan||commercial,assignment=plan.supportAssignment||{},minimum=commercial.minimumTermPeriods??plan.minimumTermPeriods;
  if(!plan.customerId||!plan.personId||!plan.coverageId)return '';
  const fields=[[text('customer'),context.customerName||plan.customerId],[text('person'),context.personName||plan.personId],[text('employer'),assignment.employer||context.employer||''],[text('market'),plan.market],[text('language'),(assignment.languages||[]).join(', ')],[text('shift'),text(plan.coverageId==='business-hours'?'business':'extended')]];
  return `<section class="provider-regional-support-quote"><h3>${esc(text('quoteTitle'))}</h3><dl>${fields.map(([key,value])=>`<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl><p>${esc(text('scope'))}</p><p>${esc(text('quoteBoundary'))}</p>${Number.isSafeInteger(minimum)?`<p>${esc(text('minimum',{count:minimum}))}</p><dl><dt>${esc(text('newMinimum'))}</dt><dd>${esc(money(plan.setupCents+minimum*plan.periodCents))}</dd></dl>`:''}${commercial.supportReplacesProjectId?`<p>${esc(text('replacementScope'))}</p><dl><dt>${esc(text('previousCommitment'))}</dt><dd>${esc(money(commercial.remainingPreviousCommitmentCents))}</dd></dl>`:''}<details><summary>${esc(text('assignmentRefs'))}</summary><p>${esc(plan.customerId)} · ${esc(plan.personId)} · ${esc(plan.coverageId)}</p>${commercial.supportReplacesProjectId?`<p>${esc(text('retainedProject'))}: ${esc(commercial.supportReplacesProjectId)}</p>`:''}</details></section>`;
 }
 g.SOCProviderRegionalSupport={render,quote,keys:KEYS,labelFallbacks:Object.freeze(Object.fromEntries(Object.entries(KEYS).map(([k,v])=>[v,FALLBACK[k]])))};
})(globalThis);
