/* Contextual paid security comparison; quotes and dispatch remain authoritative. */
(function(g){
 'use strict';
 const N_=g.N_||(value=>value),esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),money=g.SOCProviderHud?.money||(value=>Number.isFinite(value)?`A$${(value/100).toFixed(2)}`:'—'),number=value=>Number.isFinite(value)?Number(value).toLocaleString('en-AU'):'—';
 const COPY=Object.freeze({
  'title':[N_('provider.security.title'),'Paid call security'],
  'control_network':[N_('provider.security.control.network'),'Network packet filtering'],
  'control_sip':[N_('provider.security.control.sip'),'Authenticated SIP signalling'],
  'control_destination':[N_('provider.security.control.destination'),'Outbound destination guard'],
  'control_unknown':[N_('provider.security.control.unknown'),'Security control'],
  'offer_edge_basic':[N_('provider.security.offer.edge_basic'),'Edge Basic · 1,000 PPS clean / 10,000 PPS filtered'],
  'offer_edge_resilient':[N_('provider.security.offer.edge_resilient'),'Edge Resilient · 5,000 PPS clean / 50,000 PPS filtered'],
  'offer_sip_standard':[N_('provider.security.offer.sip_standard'),'Authenticated Invite · 10 attempts/sec · 2,048 bytes'],
  'offer_sip_restricted':[N_('provider.security.offer.sip_restricted'),'Restricted Invite · 5 attempts/sec · 1,024 bytes'],
  'offer_australia_guard':[N_('provider.security.offer.australia_guard'),'Australia Destination Guard · A$1.00/call · A$1.20/60 min'],
  'offer_australia_tight_guard':[N_('provider.security.offer.australia_tight_guard'),'Australia Tight Guard · A$0.20/call · A$0.30/60 min'],
  'offer_unknown':[N_('provider.security.offer.unknown'),'Paid security offer'],
  'status_effective':[N_('provider.security.status.effective'),'Effective'],
  'status_provisioning':[N_('provider.security.status.provisioning'),'Provisioning'],
  'status_stale':[N_('provider.security.status.stale'),'Needs recommissioning'],
  'status_failed':[N_('provider.security.status.failed'),'Failed'],
  'status_not_purchased':[N_('provider.security.status.not_purchased'),'Not purchased'],
  'blocker_active_calls':[N_('provider.security.blocker.active_calls'),'Drain active voice calls before the first control purchase.'],
  'blocker_carrier':[N_('provider.security.blocker.carrier'),"Commission and restore the customer's carrier service first."],
  'blocker_phone':[N_('provider.security.blocker.phone'),"Commission and restore the customer's phone route first."],
  'blocker_pending':[N_('provider.security.blocker.pending'),'This control already has a funded purchase.'],
  'blocker_customer':[N_('provider.security.blocker.customer'),'The customer must be active before ordering this control.'],
  'blocker_cash':[N_('provider.security.blocker.cash'),'The provider needs more available cash for this quote.'],
  'blocker_engineers':[N_('provider.security.blocker.engineers'),'The provider needs an available engineer for this work.'],
  'blocker_support':[N_('provider.security.blocker.support'),'The provider needs available support staff for this work.'],
  'blocker_solvency':[N_('provider.security.blocker.solvency'),'Resolve the provider solvency issue before accepting this quote.'],
  'count':[N_('provider.security.count'),'{effective} of {required} controls effective'],
  'drain_notice':[N_('provider.security.drain_notice'),'Before the first control purchase, drain active calls. The purchase interrupts voice admission until all three separately paid controls become effective.'],
  'partial_notice':[N_('provider.security.partial_notice'),'A partial deployment blocks voice admission; each control must be separately purchased and finish provisioning.'],
  'minimum':[N_('provider.security.minimum'),'Minimum combined three-control commitment: {setup} setup · {period} / period.'],
  'usage':[N_('provider.security.usage'),'Native calls use {rate} per voice minute; Provider wholesale usage is billed separately.'],
  'voice_ready':[N_('provider.security.voice_ready'),'Voice admission is ready with all three paid controls effective.'],
  'voice_blocked':[N_('provider.security.voice_blocked'),'Voice admission remains blocked until all three paid controls are effective.'],
  'voice_before_purchase':[N_('provider.security.voice_before_purchase'),'Ordinary voice admission continues until you begin the first paid control purchase.'],
  'offer_cost':[N_('provider.security.offer_cost'),'{setup} setup · {period} / period'],
  'offer_delivery':[N_('provider.security.offer_delivery'),'{lead} sim min · {engineers} engineers + {support} support'],
  'offers_unavailable':[N_('provider.security.offers_unavailable'),'No paid security offers are available for this customer selection.'],
  'review_quote':[N_('provider.security.review_quote'),'Review paid quote'],
  'quote_interrupt':[N_('provider.security.quote_interrupt'),'This first purchase requires active calls to be drained and interrupts voice admission until all three controls become effective.'],
  'quote_scope':[N_('provider.security.quote_scope'),'This is one separately paid control. Voice stays blocked until all three controls finish provisioning.'],
  'native_clean_capacity':[N_('provider.security.native.clean_capacity'),'Clean packet capacity'],
  'native_filtered_capacity':[N_('provider.security.native.filtered_capacity'),'Filtered packet capacity'],
  'native_mode':[N_('provider.security.native.mode'),'Activation mode'],
  'native_attempt_rate':[N_('provider.security.native.attempt_rate'),'Signalling rate'],
  'native_message_limit':[N_('provider.security.native.message_limit'),'Maximum message size'],
  'native_methods':[N_('provider.security.native.methods'),'Allowed methods'],
  'native_peer_authentication':[N_('provider.security.native.peer_authentication'),'Peer authentication'],
  'native_required':[N_('provider.security.native.required'),'Required'],
  'native_optional':[N_('provider.security.native.optional'),'Optional'],
  'native_prefixes':[N_('provider.security.native.prefixes'),'Allowed destination prefixes'],
  'native_call_cap':[N_('provider.security.native.call_cap'),'Per-call spend limit'],
  'native_rolling_cap':[N_('provider.security.native.rolling_cap'),'Rolling spend limit'],
  'native_attempt_value':[N_('provider.security.native.attempt_value'),'{count} attempts per second'],
  'native_bytes_value':[N_('provider.security.native.bytes_value'),'{count} bytes'],
  'native_rolling_value':[N_('provider.security.native.rolling_value'),'{amount} / {minutes} minutes'],
  'native_mode_always':[N_('provider.security.native.mode_always'),'Always'],
  'native_mode_on_demand':[N_('provider.security.native.mode_on_demand'),'On demand']
 });
 const controls={network:'control_network',sip:'control_sip',destination:'control_destination'};
 const operationControls={'provider-security-network':'network','provider-security-sip':'sip','provider-security-destination':'destination'};
 const controlOrder=['network','sip','destination'];
 const offers={
  'edge-basic':'offer_edge_basic','edge-resilient':'offer_edge_resilient',
  'sip-standard':'offer_sip_standard','sip-restricted':'offer_sip_restricted',
  'australia-guard':'offer_australia_guard','australia-tight-guard':'offer_australia_tight_guard'
 };
 function text(key,fallback,vars){
  const entry=COPY[key],id=entry?.[0]||key,translated=typeof g.tr==='function'?g.tr(id,vars):id;
  const value=translated&&translated!==id?translated:entry?.[1]??fallback;
  return String(value).replace(/\{(\w+)\}/g,(match,name)=>vars?.[name]??match);
 }
 function controlName(control){return text(controls[control]||'control_unknown',({network:'Network packet filtering',sip:'Authenticated SIP signalling',destination:'Outbound destination guard'})[control]||'Security control');}
 function controlForOperation(operationId){return operationControls[operationId]||null;}
 function statusLabel(status){const labels={effective:['status_effective','Effective'],provisioning:['status_provisioning','Provisioning'],stale:['status_stale','Needs recommissioning'],failed:['status_failed','Failed'], 'not-purchased':['status_not_purchased','Not purchased']};const [key,fallback]=labels[status]||labels['not-purchased'];return text(key,fallback);}
 function blockerLabel(code){const labels={
  SECURITY_ACTIVE_CALLS:['blocker_active_calls','Drain active voice calls before the first control purchase.'],
  SECURITY_CARRIER_REQUIRED:['blocker_carrier',"Commission and restore the customer's carrier service first."],
  SECURITY_PHONE_REQUIRED:['blocker_phone',"Commission and restore the customer's phone route first."],
  SECURITY_CONTROL_ALREADY_ORDERED:['blocker_pending','This control already has a funded project in progress.'],
  CUSTOMER_NOT_ACTIVE:['blocker_customer','The customer must be active before ordering this control.'],
  INSUFFICIENT_CASH:['blocker_cash','The provider needs more available cash for this quote.'],
  ENGINEER_CAPACITY:['blocker_engineers','The provider needs an available engineer for this work.'],
  SUPPORT_CAPACITY:['blocker_support','The provider needs available support staff for this work.'],
  INSOLVENT:['blocker_solvency','Resolve the provider solvency issue before accepting this quote.']
 };const row=labels[code];return row?text(row[0],row[1]):String(code||'').replaceAll('_',' ').toLowerCase();}
 function nativeRows(control,config){
  if(!config)return '';
  const rows=[];
  if(control==='network'){
   rows.push([text('native_clean_capacity','Clean packet capacity'),`${number(config.capacityPps)} PPS`]);
   rows.push([text('native_filtered_capacity','Filtered packet capacity'),`${number(config.mitigationPps)} PPS`]);
   const mode={always:text('native_mode_always','Always'),'on-demand':text('native_mode_on_demand','On demand')}[config.activationMode]||'—';
   rows.push([text('native_mode','Activation mode'),mode]);
  }else if(control==='sip'){
   rows.push([text('native_attempt_rate','Signalling rate'),text('native_attempt_value','{count} attempts per second',{count:number(config.attemptsPerSecond)})]);
   rows.push([text('native_message_limit','Maximum message size'),text('native_bytes_value','{count} bytes',{count:number(config.maxMessageBytes)})]);
   rows.push([text('native_methods','Allowed methods'),(config.allowedMethods||[]).join(', ')||'—']);
   rows.push([text('native_peer_authentication','Peer authentication'),config.requireAuthenticatedPeer?text('native_required','Required'):text('native_optional','Optional')]);
  }else if(control==='destination'){
   rows.push([text('native_prefixes','Allowed destination prefixes'),(config.allowedPrefixes||[]).join(', ')||'—']);
   rows.push([text('native_call_cap','Per-call spend limit'),money(config.perCallMaxCents)]);
   rows.push([text('native_rolling_cap','Rolling spend limit'),text('native_rolling_value','{amount} / {minutes} minutes',{amount:money(config.windowSpendLimitCents),minutes:number(config.windowMinutes)})]);
  }
  return `<dl class="provider-security-native">${rows.map(([name,value])=>`<dt>${esc(name)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
 }
 function offerCard(row,customerId){
  const control=row.securityControl||controlForOperation(row.operationId||row.id),operationId=row.operationId||row.id,planId=row.planId||row.selection?.planId,quote=row.quote||{},security=quote.commercial?.security,plan=security?.plan,blockers=quote.blockers||row.blockers||[],available=row.available!==false&&blockers.length===0&&quote.accepted!==false;
  const fallbackName=row.name||planId||'Paid offer',name=text(offers[planId]||'offer_unknown',fallbackName),lead=quote.leadMinutes??quote.workMinutes??row.workMinutes,engineers=quote.engineers??row.engineers,support=quote.support??row.support,setup=quote.setupCents??row.setupCents,period=quote.periodCents??row.periodCents;
  return `<article class="provider-security-offer ${available?'is-available':'is-blocked'}" data-security-offer="${esc(control)}:${esc(planId)}"><h4>${esc(name)}</h4><p>${esc(text('offer_cost','{setup} setup · {period} / period',{setup:money(setup),period:money(period)}))}</p><p>${esc(text('offer_delivery','{lead} sim min · {engineers} engineers + {support} support',{lead:number(lead),engineers:number(engineers),support:number(support)}))}</p>${nativeRows(control,plan?.nativeConfig)}${blockers.length?`<p class="provider-blocked" data-security-blockers>${esc(blockers.map(blockerLabel).join(' '))}</p>`:''}<button type="button" data-provider-action="operation" data-operation="${esc(operationId)}" data-id="${esc(customerId)}" data-operation-config="${esc(JSON.stringify({planId}))}"${available?'':' disabled'}>${esc(text('review_quote','Review paid quote'))}</button></article>`;
 }
 function aggregate(operations){const quotes=(operations||[]).map(row=>row.quote?.commercial?.security).filter(value=>value&&Number.isFinite(value.totalMinimumSetupCents)&&Number.isFinite(value.totalMinimumPeriodCents));quotes.sort((a,b)=>(a.totalMinimumSetupCents+a.totalMinimumPeriodCents)-(b.totalMinimumSetupCents+b.totalMinimumPeriodCents));return quotes[0]||null;}
 function render(customer,operations=[],selection=null){
  if(!customer?.id||!customer.security)return '';
  const security=customer.security,rows=(operations||[]).filter(row=>row.securityControl||controlForOperation(row.operationId||row.id)),known=security.controls||{},effectiveCount=Number.isSafeInteger(security.effectiveControlCount)?security.effectiveControlCount:controlOrder.filter(name=>known[name]?.status==='effective').length,started=typeof security.nativePackStarted==='boolean'?security.nativePackStarted:controlOrder.some(name=>known[name]?.status&&known[name].status!=='not-purchased'),allReady=security.voiceAdmissionReady===true,voiceBlocked=typeof security.voiceAdmissionBlocked==='boolean'?security.voiceAdmissionBlocked:started&&!allReady,min=aggregate(rows),cards=controlOrder.map(control=>{
   const offersForControl=rows.filter(row=>(row.securityControl||controlForOperation(row.operationId||row.id))===control).sort((a,b)=>String(a.planId||a.selection?.planId).localeCompare(String(b.planId||b.selection?.planId)));
   if(!offersForControl.length)return '';
   const current=known[control]||{status:'not-purchased'};
   return `<section class="provider-security-control" data-security-control="${esc(control)}"><header><h3>${esc(controlName(control))}</h3><span class="provider-security-status" data-status="${esc(current.status)}">${esc(statusLabel(current.status))}</span></header>${offersForControl.map(row=>offerCard(row,customer.id)).join('')}</section>`;
  }).join('');
  const condition=allReady?text('voice_ready','Voice admission is ready with all three paid controls effective.'):voiceBlocked?text('voice_blocked','Voice admission remains blocked until all three paid controls are effective.'):text('voice_before_purchase','Ordinary voice admission continues until you begin the first paid control purchase.');
  const firstNotice=!started?text('drain_notice','Before the first control purchase, drain active calls. The purchase interrupts voice admission until all three separately paid controls become effective.'):'';
  const partialNotice=voiceBlocked?text('partial_notice','A partial deployment blocks voice admission; each control must be separately purchased and finish provisioning.'):'';
  const minimum=min?`<p class="provider-security-minimum">${esc(text('minimum','Minimum combined three-control commitment: {setup} setup · {period} / period.',{setup:money(min.totalMinimumSetupCents),period:money(min.totalMinimumPeriodCents)}))}</p>`:'';
  const usage=min?`<p class="provider-security-usage">${esc(text('usage','Native calls use {rate} per voice minute; Provider wholesale usage is billed separately.',{rate:money(min.nativeUsageCentsPerMinute)}))}</p>`:'';
  return `<section class="provider-security" data-provider-security data-context="${esc(selection?.serviceId||'customer')}"><h2>${esc(text('title','Paid call security'))}</h2><p class="provider-security-condition">${esc(condition)} · ${esc(text('count','{effective} of {required} controls effective',{effective:effectiveCount,required:security.requiredControlCount||3}))}</p>${firstNotice||partialNotice?`<p class="provider-security-notice">${esc(firstNotice||partialNotice)}</p>`:''}${minimum}${usage}<div class="provider-security-controls">${cards||`<p>${esc(text('offers_unavailable','No paid security offers are available for this customer selection.'))}</p>`}</div></section>`;
 }
 function quote(q){
  const security=q?.commercial?.security,plan=security?.plan;if(!security||!plan)return '';
  const control=plan.control;
  const minimum=Number.isFinite(security.totalMinimumSetupCents)&&Number.isFinite(security.totalMinimumPeriodCents)?`<p>${esc(text('minimum','Minimum combined three-control commitment: {setup} setup · {period} / period.',{setup:money(security.totalMinimumSetupCents),period:money(security.totalMinimumPeriodCents)}))}</p>`:'';
  const interruption=security.interruptionStartsAtPurchase?`<p class="provider-security-notice">${esc(text('quote_interrupt','This first purchase requires active calls to be drained and interrupts voice admission until all three controls become effective.'))}</p>`:'';
  const usage=Number.isFinite(security.nativeUsageCentsPerMinute)?`<p>${esc(text('usage','Native calls use {rate} per voice minute; Provider wholesale usage is billed separately.',{rate:money(security.nativeUsageCentsPerMinute)}))}</p>`:'';
  return `<section class="provider-security-quote" data-provider-security-quote><h3>${esc(controlName(control))} · ${esc(text(offers[plan.planId]||'offer_unknown',plan.planId))}</h3>${interruption}${minimum}${usage}${nativeRows(control,plan.nativeConfig)}<p>${esc(text('quote_scope','This is one separately paid control. Voice stays blocked until all three controls finish provisioning.'))}</p></section>`;
 }
 g.SOCProviderSecurityUI={render,quote,controlName,controlForOperation};
 if(typeof module!=='undefined'&&module.exports)module.exports=g.SOCProviderSecurityUI;
})(typeof globalThis==='object'?globalThis:window);
