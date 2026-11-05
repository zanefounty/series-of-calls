/* Pure, versioned planning contract for scoped Provider standing policies. */
function socProviderPolicyKernel(){
  const VERSION=2,ID=/^[a-z][a-z0-9-]{0,63}$/;
  const POLICY_KEYS=['version','enabled','suspended','cashFloorCents','lifetimeBudgetCents','budgetSpentCents','maxActions','actionsUsed','engineerCeiling','supportCeiling','customerIds','rules'];
  const RULE_KEYS=['id','kind','enabled','customerIds','operationId','stage','resourceId','thresholdPercent'];
  const fail=code=>{throw new Error(code);},int=(v,min=0,max=100000000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const plain=x=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.prototype.toString.call(x)!=='[object Object]')return false;const proto=Object.getPrototypeOf(x);return proto===null||Object.getPrototypeOf(proto)===null;};
  const exact=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(x,k));
  const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
  function uniqueIds(a){return Array.isArray(a)&&a.length<=128&&a.every(x=>typeof x==='string'&&ID.test(x))&&new Set(a).size===a.length;}
  function create(input){
   const p=input===undefined?{version:VERSION,enabled:false,suspended:false,cashFloorCents:0,lifetimeBudgetCents:0,budgetSpentCents:0,maxActions:0,actionsUsed:0,engineerCeiling:0,supportCeiling:0,customerIds:[],rules:[]}:copy(input);
   validate(p);return p;
  }
  function validate(p){
   if(!exact(p,POLICY_KEYS)||p.version!==VERSION||typeof p.enabled!=='boolean'||typeof p.suspended!=='boolean'||!int(p.cashFloorCents)||!int(p.lifetimeBudgetCents)||!int(p.budgetSpentCents)||p.budgetSpentCents>p.lifetimeBudgetCents||!int(p.maxActions,0,10000)||!int(p.actionsUsed,0,10000)||p.actionsUsed>p.maxActions||!int(p.engineerCeiling,0,1000)||!int(p.supportCeiling,0,1000)||!uniqueIds(p.customerIds)||!Array.isArray(p.rules)||p.rules.length>32)fail('INVALID_PROVIDER_POLICY');
   const seen=new Set();for(const r of p.rules){if(!exact(r,RULE_KEYS)||!ID.test(r.id)||seen.has(r.id)||!['assurance','provisioning','migration','headroom'].includes(r.kind)||typeof r.enabled!=='boolean'||!uniqueIds(r.customerIds)||r.operationId!==null&&!(typeof r.operationId==='string'&&ID.test(r.operationId))||r.stage!==null&&!['carrier','partner'].includes(r.stage)||r.resourceId!==null&&!(typeof r.resourceId==='string'&&ID.test(r.resourceId))||r.thresholdPercent!==null&&!int(r.thresholdPercent,1,100))fail('INVALID_PROVIDER_POLICY_RULE');seen.add(r.id);
    if(r.kind==='assurance'&&(r.operationId!=='repair'||r.stage!==null||r.thresholdPercent!==null)||r.kind==='provisioning'&&(r.operationId!==null||!r.stage||r.thresholdPercent!==null)||r.kind==='migration'&&(!['migration','migration-consolidated'].includes(r.operationId)||r.stage!==null||r.thresholdPercent!==null)||r.kind==='headroom'&&(r.operationId!=='carrier-headroom'||r.stage!==null||r.thresholdPercent===null))fail('INVALID_PROVIDER_POLICY_RULE');
    if(r.kind==='headroom'&&r.resourceId===null)fail('INVALID_PROVIDER_POLICY_RULE');
   }
   return true;
  }
  function scoped(p,r,c){return (!p.customerIds.length||p.customerIds.includes(c.id))&&(!r.customerIds.length||r.customerIds.includes(c.id));}
  function alreadyOrdered(model,c,request){return (model.projects||[]).some(p=>p.customerId===c.id&&['running','commissioning'].includes(p.status)&&(request.action==='operation'?p.operationId===request.operationId:p.kind==='stage'&&p.stage===request.stage));}
  function triggerFor(p,r,c,model){
   if(!scoped(p,r,c)||['exited','default'].includes(c.status))return null;
   if(r.kind==='assurance'){const incident=(model.incidents||[]).find(i=>i.customerId===c.id&&['active','acknowledged'].includes(i.status)&&(!r.resourceId||i.resource===r.resourceId));return incident?{kind:'incident',id:incident.id,resource:incident.resource}:null;}
   if(r.kind==='provisioning'){const prior=r.stage==='carrier'?'base':'carrier';if(c.stages?.[r.stage]||c.stages?.[prior]?.status!=='effective')return null;return {kind:'missing-stage',stage:r.stage};}
   if(r.kind==='migration'){const m=[...(model.migrations||[]),...(c.migrations||[]),...(c.migration?[c.migration]:[])].find(x=>x.customerId===c.id&&x.eligible===true&&(!r.resourceId||x.id===r.resourceId));return m?{kind:'migration',id:m.id}:null;}
   if(r.kind==='headroom'){
    const service=(c.services||[]).find(s=>s.id===r.resourceId&&s.pressure?.unit==='concurrent sessions'&&Number.isFinite(s.pressure.used)&&Number.isFinite(s.pressure.limit)&&s.pressure.limit>0&&s.pressure.used/s.pressure.limit*100>=r.thresholdPercent);
    return service?{kind:'headroom',resourceId:service.id,used:service.pressure.used,limit:service.pressure.limit,unit:service.pressure.unit,at:service.pressure.at}:null;
   }
   return null;
  }
  function requestMatches(r,c,t,q){const x=q?.request;if(!plain(x)||x.customerId!==c.id)return false;if(r.kind==='provisioning'){const expectedOffer=c.id==='starter-customer'?'starter':c.id.replace(/-customer$/,'');return x.action==='purchase'&&x.stage===r.stage&&x.offerId===expectedOffer&&x.planId===c.planId;}if(x.action!=='operation'||x.operationId!==r.operationId)return false;return r.kind!=='assurance'||x.operationId==='repair';}
  function plan(p,model,quotes=[]){
   validate(p);if(!plain(model)||!Array.isArray(model.customers)||!Array.isArray(model.projects||[])||!Array.isArray(model.incidents||[])||model.migrations!==undefined&&!Array.isArray(model.migrations)||!Array.isArray(quotes)||model.customers.some(c=>!plain(c)||typeof c.id!=='string'||c.services!==undefined&&!Array.isArray(c.services)||c.stages!==undefined&&!plain(c.stages)))fail('INVALID_PROVIDER_POLICY_INPUT');
   if(!p.enabled)return {status:'disabled',intent:null,reason:'POLICY_DISABLED'};if(p.suspended)return {status:'suspended',intent:null,reason:'POLICY_SUSPENDED'};
   if(p.actionsUsed>=p.maxActions)return {status:'limited',intent:null,reason:'ACTION_LIMIT'};if(p.budgetSpentCents>=p.lifetimeBudgetCents)return {status:'limited',intent:null,reason:'BUDGET_EXHAUSTED'};
   const customers=[...model.customers].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
   for(const r of p.rules){if(!r.enabled)continue;for(const c of customers){const trigger=triggerFor(p,r,c,model);if(!trigger)continue;
    const quote=quotes.find(q=>requestMatches(r,c,trigger,q));if(!quote)return {status:'blocked',intent:null,reason:'QUOTE_REQUIRED',ruleId:r.id,customerId:c.id,trigger};
    if(!Number.isSafeInteger(quote.atRevision)||Number.isSafeInteger(model.revision)&&quote.atRevision!==model.revision)return {status:'blocked',intent:null,reason:'STALE_QUOTE',ruleId:r.id,customerId:c.id,trigger};
    if(!Array.isArray(quote.blockers)||quote.blockers.length)return {status:'blocked',intent:null,reason:'QUOTE_BLOCKED',ruleId:r.id,customerId:c.id,trigger,blockers:copy(quote.blockers||[])};
    const cost=quote.setupCents,engineers=quote.engineers??quote.commercial?.staffing?.requiredEngineers,support=quote.support??quote.commercial?.staffing?.requiredSupport;
    if(!int(cost,1)||!int(engineers,0,1000)||!int(support,0,1000))return {status:'blocked',intent:null,reason:'INVALID_QUOTE',ruleId:r.id,customerId:c.id,trigger};
    if(alreadyOrdered(model,c,quote.request))return {status:'blocked',intent:null,reason:'ACTION_ALREADY_ORDERED',ruleId:r.id,customerId:c.id,trigger};
    if(p.budgetSpentCents+cost>p.lifetimeBudgetCents)return {status:'limited',intent:null,reason:'BUDGET_LIMIT',ruleId:r.id,customerId:c.id,trigger,costCents:cost};
    if(!int(model.cash,0)||model.cash-cost<p.cashFloorCents)return {status:'limited',intent:null,reason:'CASH_FLOOR',ruleId:r.id,customerId:c.id,trigger,costCents:cost};
    if(engineers>p.engineerCeiling||support>p.supportCeiling)return {status:'limited',intent:null,reason:'STAFFING_CEILING',ruleId:r.id,customerId:c.id,trigger,engineers,support};
    const command={...copy(quote.request),quoteRevision:quote.atRevision};return {status:'ready',ruleId:r.id,customerId:c.id,trigger,intent:{type:'provider',command},preview:{costCents:cost,recurringCents:int(quote.periodCents)?quote.periodCents:0,cashAfterCents:model.cash-cost,lifetimeBudgetRemainingCents:p.lifetimeBudgetCents-p.budgetSpentCents-cost,actionsRemaining:p.maxActions-p.actionsUsed-1,engineers,support,workMinutes:quote.workMinutes??null,atRevision:quote.atRevision}};
   }}
   return {status:'idle',intent:null,reason:'NO_ELIGIBLE_WORK'};
  }
  return {VERSION,create,validate,plan};
}
const SOC_PROVIDER_POLICY={...socProviderPolicyKernel(),source:()=>`const SOC_PROVIDER_POLICY=(${socProviderPolicyKernel.toString()})();`};
if(typeof globalThis!=='undefined')globalThis.SOCProviderPolicy=SOC_PROVIDER_POLICY;
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_POLICY;
