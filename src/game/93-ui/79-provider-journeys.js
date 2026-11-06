/* Human-readable execution and billing units on the selected customer. */
(function(g){
 'use strict';
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const N_=typeof g.N_==='function'?g.N_:x=>x;
 const labels={
  timing:[N_('provider.journey_units.timing'),'Waiting {waiting} min · {handlingLabel} {handling} min · after-call work {wrap} min'],
  talk:[N_('provider.journey_units.talk'),'talk'],handling:[N_('provider.journey_units.handling'),'handling'],
  unknown:[N_('provider.journey_units.unknown'),'not retained'],
  occupancy:[N_('provider.journey_units.occupancy'),'Carrier sessions occupied now: {count}. A queued or connected external call holds one session; after-call work releases it.'],
  usage:[N_('provider.journey_units.usage'),'Supplier usage: {voice} metered voice minutes at {voiceRate} cents; {messages} accepted message attempts at {messageRate} cents. Accrued usage cost: {cost} cents.'],
  definitions:[N_('provider.journey_units.definitions'),'Waiting runs from queue entry to assignment or termination. Talk/handling runs from assignment or endpoint connection to after-call work or termination. After-call work runs from wrap start to completion. Voice metering samples eligible active sessions once per simulation minute; it can include queue time.'],
  retail:[N_('provider.journey_units.retail'),'The customer pays the agreed service-period price, adjusted for partial periods and delivery credits. These supplier usage units do not add a separate customer conversation charge.'],
  missing:[N_('provider.journey_units.missing'),'Some interaction timing is no longer retained. Recorded job usage remains available.']
 };
 function text(key,params={}){const [id,fallback]=labels[key];return typeof g.tr==='function'?g.tr(id,params):fallback.replace(/\{(\w+)\}/g,(_,k)=>params[k]??'');}
 function render(journey){
  const model=journey.lifecycle;if(!model)return '';
  const units=model.supplierUsage,value=x=>x===null?text('unknown'):x;
  return `<section class="provider-journey-units" data-provider-journey-units>${model.legs.map(leg=>`<p>${esc(text('timing',{waiting:value(leg.waitingMinutes),handling:value(leg.handlingMinutes),wrap:value(leg.wrapMinutes),handlingLabel:text(leg.channel==='voice'?'talk':'handling')}))}</p>`).join('')}<p>${esc(text('occupancy',{count:model.legs.filter(l=>l.carrierOccupied).length}))}</p><p>${esc(text('usage',{voice:units.voiceMinutes,voiceRate:units.voiceCentsPerMinute,messages:units.messageDeliveries,messageRate:units.messageCentsPerDelivery,cost:units.costCents}))}</p><p>${esc(text('retail'))}</p>${model.missingInteractions||model.legs.some(l=>!l.timelineComplete)?`<p>${esc(text('missing'))}</p>`:''}<p>${esc(text('definitions'))}</p></section>`;
 }
 g.SOCProviderJourneys={render};if(typeof module!=='undefined'&&module.exports)module.exports=g.SOCProviderJourneys;
})(typeof globalThis!=='undefined'?globalThis:window);
