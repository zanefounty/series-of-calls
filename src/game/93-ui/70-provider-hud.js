/* Provider campaign HUD. Render-only: every control is delegated by SOC_PROVIDER_UI. */
(function(g){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>Number.isFinite(+n)?`A$${(+n/100).toLocaleString('en-AU',{minimumFractionDigits:0,maximumFractionDigits:2})}`:'—';
 function render(model,view){
  if(!model)return '<div class="provider-launch-strip"><strong>Series of Calls</strong><span>Provider campaign</span><button data-provider-action="open">Play / Continue</button><button data-provider-action="new-game">New career</button><button data-provider-action="training">Training</button><button data-provider-action="lab">Lab</button></div>';
  const f=model.forecast||{},outcome=model.outcomeAggregate||model.periodOutcome||model.outcome||model.mission?.outcome||{},due=Number(outcome.offered||0),done=Number(outcome.completed??outcome.onTime??0),active=(model.customers||[]).filter(c=>c.status==='active'||c.active).length;
  const warning=model.capacityWarning||model.warning||((model.incidents||[]).some(i=>['active','acknowledged'].includes(i.status))?'Incident needs attention':'');
  const completed=due?`${Math.min(done,due)} / ${due}`:'Awaiting period work';
  const period=Number.isFinite(model.period)?model.period:Math.floor((model.clock||0)/60)+1;
  const clock=`Period ${period} · Minute ${Number(model.minute??(model.clock||0)%60)} / ${Number(model.periodMinutes||60)}`;
  const speeds=[0.5,1,2,4,8];
  return `<header class="provider-hud" aria-label="Provider business status"><button class="provider-brand" data-provider-action="drawer" data-provider-value="menu"><b>${esc(model.providerName||'Series of Calls')}</b><small>Provider campaign</small></button><div class="provider-stat"><small>Cash available</small><strong>${money(model.cash)}</strong></div><div class="provider-stat"><small>Forecast / period</small><strong class="${(+f.operatingResult||0)<0?'is-negative':''}">${money(f.operatingResult)}</strong></div><div class="provider-stat"><small>Customers</small><strong>${active} active</strong></div><div class="provider-stat"><small>Delivered work</small><strong>${esc(completed)}</strong><small>completed / due</small></div><div class="provider-warning" role="status">${esc(warning||(typeof tr==='function'?tr('provider.capacity_unmeasured'):'Inspect measured service capacity'))}</div><div class="provider-time"><strong>${esc(clock)}</strong><div class="provider-speed" role="group" aria-label="Simulation speed"><button data-provider-action="pause" aria-pressed="${view.paused?'true':'false'}">${view.paused?'Resume':'Pause'}</button>${speeds.map(x=>`<button data-provider-action="speed" data-provider-value="${x}" aria-pressed="${Number(view.speed||1)===x?'true':'false'}">${x}×</button>`).join('')}</div></div><button class="provider-icon-action" data-provider-action="drawer" data-provider-value="help" aria-label="Help">?</button></header>`;
 }
 g.SOCProviderHud={render,money,esc};
})(globalThis);
