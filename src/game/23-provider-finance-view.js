/* Read-only settlement projection. No billing, dispatch or saved-state changes. */
(function(g){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x)),sum=(xs,fn)=>xs.reduce((n,x)=>n+fn(x),0);
 const delta=p=>['revenue','funding'].includes(p.category)?p.cents:['cost','repayment'].includes(p.category)?-p.cents:0;
 const groups={'provider-customer-period':'retail','provider-service-credit':'credits','provider-wholesale-period':'supplier','provider-operation-period':'operations','provider-voice-usage':'voice','provider-message-usage':'messages','provider-implementation':'setup','provider-operation':'setup',staff:'payroll',interest:'interest'};
 function group(p){return p.category==='funding'?'funding':p.category==='repayment'?'repayment':groups[p.reason]||'other';}
 function inspect(s){
  const campaign=s?.providerCampaign,b=s?.business;
  if(!campaign||!b)return null;
  const ledger=b.ledger,customers=campaign.customers;
  const boundary=h=>{let result=-1;for(let i=0;i<ledger.length;i++)if(ledger[i].providerCampaign&&ledger[i].period===h.period&&ledger[i].at===h.to)result=i;return result;};
  const rows=campaign.periodHistory.map(h=>{
   const end=boundary(h),first=h.period===Math.floor(campaign.startedAt/60),start=first?-1:boundary({period:h.period-1,to:h.from});
   const customerRows=customers.flatMap(c=>{const x=c.history.find(x=>x.period===h.period);return x?[{customerId:c.id,name:c.name,...Object.fromEntries(['period','from','to','due','completedOnTime','late','failed','grossRetail','credit','netRetail','wholesale','voiceMinutes','messages','voiceCost','messageCost','qualified'].map(key=>[key,x[key]]))}]:[];});
   const base={...copy(h),customers:customerRows,postings:[],bridge:null,unavailable:null};
   // Missing boundary/older postings means summary only, never a reconstructed bill.
   if(end<0||(!first&&start<0)||(first&&(b.ledgerPrunedThrough||0)>0))return {...base,unavailable:'postings-unavailable'};
   const postings=ledger.slice(start+1,end+1);
   const revenue=sum(postings,p=>p.category==='revenue'?p.cents:0),cost=sum(postings,p=>p.category==='cost'?p.cents:0);
   if(revenue!==h.revenue||cost!==h.cost)return {...base,unavailable:'postings-unreconciled'};
   // A contiguous retained suffix lets us reverse current cash to the settlement boundary.
   const closingCash=b.balance.cash-sum(ledger.slice(end+1),delta),cashChange=sum(postings,delta),funding=sum(postings,p=>p.category==='funding'?p.cents:0),repayment=sum(postings,p=>p.category==='repayment'?p.cents:0);
   base.postings=postings.map(p=>({...copy(p),group:group(p),cashDelta:delta(p),customerName:customers.find(c=>c.id===p.customerId)?.name||null,projectName:campaign.projects.find(x=>x.id===p.projectId)?.name||p.operationId||null}));
   base.bridge={openingCash:closingCash-cashChange,revenue,cost,operatingResult:h.operatingResult,funding,repayment,cashChange,closingCash};
   return base;
  });
  return {currency:b.currency,rows,archivedPeriods:campaign.historyCheckpoint?.periods||0,currentCash:b.balance.cash};
 }
 const api={inspect};if(typeof module==='object'&&module.exports)module.exports=api;g.SOC_PROVIDER_FINANCE_VIEW=api;
})(globalThis);
