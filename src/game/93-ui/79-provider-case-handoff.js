/* Contextual, read-only presentation of an authored same-case channel choice. */
(function(g){
 'use strict';
 const N_=typeof g.N_==='function'?g.N_:x=>x,esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={
 title:[N_('provider.case_handoff.title'),'Continue this waiting case digitally'],
 review:[N_('provider.case_handoff.review'),'Review digital handoff'],
 deadline:[N_('provider.case_handoff.deadline'),'Original deadline: minute {minute}. Changing channel does not extend it.'],
 waiting:[N_('provider.case_handoff.waiting'),'This voice case has waited {minutes} simulation minutes.'],
 included:[N_('provider.case_handoff.included'),'No additional setup charge: this choice is included in the paid programmable engagement service. Existing commitments remain payable.'],
 setup:[N_('provider.case_handoff.setup'),'Additional setup: {amount}.'],
 usage:[N_('provider.case_handoff.usage'),'Voice usage already incurred: {minutes} minutes at {voiceRate} cents per minute. One accepted digital delivery costs {messageRate} cents; a retry does not create another case.'],
 missing:[N_('provider.case_handoff.missing'),'Current usage prices are unavailable. Review current terms before committing.'],
 humans:[N_('provider.case_handoff.humans'),'The digital case still needs an eligible licensed customer handler, available queue capacity and retained customer context.'],
 identity:[N_('provider.case_handoff.identity'),'Case {caseId} stays one customer obligation. The waiting voice leg ends without a separate delivered resolution.'],
 committed:[N_('provider.case_handoff.committed'),'Channel handoff recorded at minute {minute}.'],
 legs:[N_('provider.case_handoff.legs'),'Voice leg {source} → digital leg {target}. This transition alone does not mean the case is resolved.'],
 blocked:[N_('provider.case_handoff.blocked'),'This choice is not currently eligible.'],
 human_block:[N_('provider.case_handoff.human_block'),'Provide eligible customer handling capacity and case context, then review again.'],
 paid_block:[N_('provider.case_handoff.paid_block'),'Commission the supported paid channel and restore its account, product and boundary dependencies.'],
 queued_block:[N_('provider.case_handoff.queued_block'),'Only an admitted waiting voice case can change channel here; an assigned conversation cannot.'],
 authored_block:[N_('provider.case_handoff.authored_block'),'This case must have an authored optional digital preference; mandatory voice work stays voice.'],
 job_block:[N_('provider.case_handoff.job_block'),'The original case must still be pending, within its deadline and not already handed off.'],
 confirm:[N_('provider.case_handoff.confirm'),'Confirm same-case handoff'],
 cancel:[N_('provider.case_handoff.cancel'),'Keep current case'],
 technical:[N_('provider.case_handoff.technical'),'Technical handoff evidence']
 ,policy_title:[N_('provider.case_handoff.policy_title'),'Waiting-case handoff policy'],
 policy_scope:[N_('provider.case_handoff.policy_scope'),'Only this customer’s consenting, queued voice cases may move to the paid social messaging channel. Mandatory voice, assigned and protected work stay on voice. Active incidents suspend the policy.'],
 policy_limit:[N_('provider.case_handoff.policy_limit'),'Automatic handoffs still need a licensed handler, current channel capacity and the original case deadline. Voice minutes and accepted messages use the existing plan rates.'],
 policy_enable:[N_('provider.case_handoff.policy_enable'),'Enable automatic handoff'],
 policy_deadline:[N_('provider.case_handoff.policy_deadline'),'Minimum minutes left before deadline'],
 policy_period:[N_('provider.case_handoff.policy_period'),'Maximum handoffs per period'],
 policy_open:[N_('provider.case_handoff.policy_open'),'Maximum open digital handoffs'],
 policy_save:[N_('provider.case_handoff.policy_save'),'Save handoff policy']
 };
 const text=(key,params={})=>{const [id,fallback]=labels[key];return typeof g.tr==='function'?g.tr(id,params):fallback.replace(/\{(\w+)\}/g,(_,k)=>params[k]??'');};
 const money=x=>g.SOCProviderHud?.money?g.SOCProviderHud.money(x):'A$'+(x/100).toFixed(2);
 const number=x=>Number.isSafeInteger(x)&&x>=0;
 function reasons(q){const byCode={PROVIDER_CASE_HANDOFF_HUMAN_CAPACITY_REQUIRED:'human_block',PROVIDER_CASE_HANDOFF_PAID_CHANNEL_REQUIRED:'paid_block',PROVIDER_CASE_HANDOFF_QUEUED_VOICE_REQUIRED:'queued_block',PROVIDER_CASE_HANDOFF_AUTHORED_PREFERENCE_REQUIRED:'authored_block',PROVIDER_CASE_HANDOFF_JOB_INELIGIBLE:'job_block'};return (q.blockers||[]).length?`<p class="provider-blocked">${esc(text('blocked'))}</p>${[...new Set(q.blockers.map(code=>byCode[code]).filter(Boolean))].map(key=>`<p>${esc(text(key))}</p>`).join('')}<details><summary>${esc(text('technical'))}</summary><pre>${esc(q.blockers.join('\n'))}</pre></details>`:'';}
 function summary(q){const h=q?.commercial?.caseHandoff;if(!h)return '';const rates=q.commercial.variablePrices,prices=number(rates?.voiceCentsPerMinute)&&number(rates?.messageCentsPerDelivery),setup=q.setupCents;
  return `<div class="provider-case-handoff-summary"><p>${esc(text('identity',{caseId:h.caseId}))}</p>${number(h.deadlineAt)?`<p>${esc(text('deadline',{minute:h.deadlineAt}))}</p>`:''}${number(h.waitingMinutes)?`<p>${esc(text('waiting',{minutes:h.waitingMinutes}))}</p>`:''}${setup===0?`<p>${esc(text('included'))}</p>`:number(setup)?`<p>${esc(text('setup',{amount:money(setup)}))}</p>`:''}${prices&&number(h.sourceUsageMinutes)?`<p>${esc(text('usage',{minutes:h.sourceUsageMinutes,voiceRate:rates.voiceCentsPerMinute,messageRate:rates.messageCentsPerDelivery}))}</p>`:`<p>${esc(text('missing'))}</p>`}<p>${esc(text('humans'))}</p>${reasons(q)}</div>`;
 }
 function render(journey,customerId,clock){
  if(journey.handoff){const r=journey.handoff;if(r.customerId!==customerId||r.jobId!==journey.id)return '';return `<div class="provider-case-handoff-receipt"><p>${esc(text('committed',{minute:r.at}))}</p><p>${esc(text('legs',{source:r.sourceInteractionId,target:r.targetInteractionId}))}</p></div>`;}
  const q=journey.handoffOffer;if(!q||q.action!=='handoff-case'||q.request?.customerId!==customerId||q.request?.jobId!==journey.id||q.request?.connectorId!=='social-messaging'||!q.commercial?.caseHandoff)return '';
  const wait=number(clock)&&number(journey.arrivalAt)&&clock>=journey.arrivalAt?clock-journey.arrivalAt:null;
  return `<div class="provider-case-handoff"><h4>${esc(text('title'))}</h4>${wait!==null?`<p>${esc(text('waiting',{minutes:wait}))}</p>`:''}${summary(q)}<button class="primary" data-provider-action="quote-case-handoff" data-customer="${esc(customerId)}" data-job="${esc(journey.id)}">${esc(text('review'))}</button></div>`;
 }
 function quote(q){const invalid=!q.commercial?.caseHandoff,blocked=invalid||q.accepted===false||q.blockers?.length;return `<div class="provider-modal" role="dialog" aria-modal="true" aria-labelledby="quote-title"><section><h2 id="quote-title">${esc(text('title'))}</h2>${summary(q)}<button class="primary" data-provider-action="confirm-quote" ${blocked?'disabled':''}>${esc(text('confirm'))}</button><button data-provider-action="cancel-quote">${esc(text('cancel'))}</button></section></div>`;}
 function policy(customer,model){if(!customer||customer.scenario!=='smb'||!customer.handoffPolicyAvailable||!['active','renewal'].includes(customer.status))return '';const p=customer.handoffPolicy||{enabled:false,minMinutesRemaining:3,maxPerPeriod:1,maxOpenDigital:1};return `<section class="provider-case-handoff-policy"><h3>${esc(text('policy_title'))}</h3><p>${esc(text('policy_scope'))}</p><p>${esc(text('policy_limit'))}</p><form data-provider-form="handoff-policy" data-customer="${esc(customer.id)}"><label><input type="checkbox" name="enabled" ${p.enabled?'checked':''}>${esc(text('policy_enable'))}</label><label>${esc(text('policy_deadline'))}<input type="number" name="minMinutesRemaining" min="1" max="20" value="${esc(p.minMinutesRemaining)}" required></label><label>${esc(text('policy_period'))}<input type="number" name="maxPerPeriod" min="1" max="4" value="${esc(p.maxPerPeriod)}" required></label><label>${esc(text('policy_open'))}<input type="number" name="maxOpenDigital" min="1" max="4" value="${esc(p.maxOpenDigital)}" required></label><button class="primary">${esc(text('policy_save'))}</button></form></section>`;}
 g.SOCProviderCaseHandoffUI={render,summary,quote,policy,labelFallbacks:Object.freeze(Object.fromEntries(Object.values(labels)))};
 if(typeof module!=='undefined'&&module.exports)module.exports=g.SOCProviderCaseHandoffUI;
})(typeof globalThis!=='undefined'?globalThis:window);
