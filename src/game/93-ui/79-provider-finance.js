/* Pure, translated Finance controls; period selection belongs to the shell view. */
(function(g){
 'use strict';
 const N_=typeof g.N_==='function'?g.N_:x=>x;
 const labels={
  title:[N_("provider.finance.title"), "Settled bill and cash movement"],
  period:[N_("provider.finance.period"), "Billing period"],
  empty:[N_("provider.finance.empty"), "No billing period has settled yet. Forecasts are not earned income."],
  missing:[N_("provider.finance.missing"), "This selected period is no longer retained. Choose another retained period."],
  unavailable:[N_("provider.finance.unavailable"), "Detailed postings or their settlement boundary are unavailable or do not reconcile. Retained settlement totals remain shown; no cash bridge has been invented."],
  archived:[N_("provider.finance.archived"), "Earlier periods are archived."],
  summary:[N_("provider.finance.summary"), "Recorded period result"],
  revenue:[N_("provider.finance.revenue"), "Revenue"],
  cost:[N_("provider.finance.cost"), "Costs including setup, payroll and interest"],
  profit:[N_("provider.finance.profit"), "Operating result before setup investment"],
  investment:[N_("provider.finance.investment"), "Setup investment paid"],
  opening:[N_("provider.finance.opening"), "Opening cash"],
  funding:[N_("provider.finance.funding"), "Borrowed principal"],
  repayment:[N_("provider.finance.repayment"), "Principal repaid"],
  change:[N_("provider.finance.change"), "Cash movement"],
  closing:[N_("provider.finance.closing"), "Closing cash"],
  bridge:[N_("provider.finance.bridge"), "Cash reconciliation"],
  distinction:[N_("provider.finance.distinction"), "Borrowing is not revenue. Principal repayment is not an operating cost. Setup, payroll and interest are included in the recorded operating result."],
  boundary:[N_("provider.finance.boundary"), "Cash amounts end at settlement. Later purchases, including purchases in the same minute, belong to the next bill."],
  postings:[N_("provider.finance.postings"), "Named postings"],
  retail:[N_("provider.finance.retail"), "Retail revenue"],
  credits:[N_("provider.finance.credits"), "Service credits"],
  supplier:[N_("provider.finance.supplier"), "Supplier commitments"],
  operations:[N_("provider.finance.operations"), "Operating service commitments"],
  voice:[N_("provider.finance.voice"), "Voice usage"],
  messages:[N_("provider.finance.messages"), "Message usage"],
  setup:[N_("provider.finance.setup"), "Paid setup and implementation"],
  payroll:[N_("provider.finance.payroll"), "Shared provider payroll"],
  interest:[N_("provider.finance.interest"), "Interest"],
  other:[N_("provider.finance.other"), "Other ledger posting"],
  shared:[N_("provider.finance.shared"), "Shared provider"],
  customer:[N_("provider.finance.customer"), "Customer settlement"],
  net:[N_("provider.finance.net"), "Net retail"],
  usage:[N_("provider.finance.usage"), "Usage cost"],
  delivery:[N_("provider.finance.delivery"), "Due cases completed on time"],
  technical:[N_("provider.finance.technical"), "Posting references"],
  from:[N_("provider.finance.from"), "From minute"],
  to:[N_("provider.finance.to"), "to minute"]
 };
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const t=k=>{const [id,fallback]=labels[k];const translated=typeof g.tr==='function'?g.tr(id):id;return esc(translated&&translated!==id?translated:fallback);};
 const money=n=>g.SOCProviderHud?.money(n)??new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'}).format(n/100);
 function render(finance,view={}){
  const rows=finance?.rows||[],selected=view.financePeriod??rows.at(-1)?.period,row=rows.find(x=>String(x.period)===String(selected));
  let html=`<section class="provider-finance-history"><h3>${t('title')}</h3>`;
  if(!rows.length)return html+`<p>${t('empty')}</p></section>`;
  html+=`<label>${t('period')}<select data-provider-finance-period style="min-height:44px;width:100%">${row?'':`<option value="${esc(selected)}" selected>${t('missing')}</option>`}${rows.slice().reverse().map(r=>`<option value="${r.period}" ${r===row?'selected':''}>${r.period+1} · ${r.from}–${r.to}</option>`).join('')}</select></label>`;
  if(finance.archivedPeriods)html+=`<p>${finance.archivedPeriods} · ${t('archived')}</p>`;
  if(!row)return html+`<p role="status">${t('missing')}</p></section>`;
  const amount=(key,n)=>`<dt>${t(key)}</dt><dd data-finance-value="${key}">${money(n)}</dd>`;
  html+=`<article data-finance-period="${row.period}"><h4>${t('summary')}</h4><p>${t('from')} ${row.from} ${t('to')} ${row.to}</p><dl>${amount('revenue',row.revenue)}${amount('cost',row.cost)}${row.setupInvestment!==undefined?amount('investment',-row.setupInvestment):''}${amount('profit',row.operatingResult)}</dl><p>${t('distinction')}</p>`;
  html+=row.customers.map(c=>`<section class="provider-finance-customer" data-customer="${esc(c.customerId)}"><h4>${esc(c.name)} · ${t('customer')}</h4><p>${c.completedOnTime} / ${c.due} · ${t('delivery')}</p><dl>${amount('retail',c.grossRetail)}${amount('credits',c.credit)}${amount('net',c.netRetail)}${amount('supplier',c.wholesale)}${amount('usage',c.voiceCost+c.messageCost)}</dl><p>${c.voiceMinutes} · ${t('voice')}; ${c.messages} · ${t('messages')}</p></section>`).join('');
  if(!row.bridge)return html+`<p role="status" data-finance-unavailable>${t('unavailable')}</p></article></section>`;
  const b=row.bridge;
  html+=`<h4>${t('bridge')}</h4><dl class="provider-finance-bridge">${amount('opening',b.openingCash)}${amount('profit',b.operatingResult)}${row.setupInvestment!==undefined?amount('investment',-b.setupInvestment):''}${amount('funding',b.funding)}${amount('repayment',b.repayment)}${amount('change',b.cashChange)}${amount('closing',b.closingCash)}</dl><p>${t('boundary')}</p><h4>${t('postings')}</h4><ul class="provider-list">`;
  for(const p of row.postings)html+=`<li data-finance-posting="${esc(p.id)}"><b>${t(p.group)}</b><span>${esc(p.customerName||'')} ${p.customerName?'':t('shared')} · ${money(p.cashDelta)}</span>${p.projectName?`<span>${esc(p.projectName)}</span>`:''}<details><summary>${t('technical')}</summary><p>${esc(p.id)} · ${p.at} · ${esc(p.reason||p.category)}${p.projectId?' · '+esc(p.projectId):''}${p.loan?' · '+esc(p.loan):''}${p.quantity!==undefined?' · '+esc(p.quantity)+' '+esc(p.usageUnit||p.unit||''):''}</p></details></li>`;
  return html+'</ul></article></section>';
 }
 g.SOCProviderFinance={render};
})(globalThis);
