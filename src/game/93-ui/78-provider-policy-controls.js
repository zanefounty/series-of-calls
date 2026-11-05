/* Pure configuration form and readable review for paid Provider standing policies. */
(function(g){
 'use strict';const N_=g.N_||(x=>x);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=c=>`A$${(Number(c||0)/100).toFixed(2)}`;
 const keys=Object.freeze({
  title:N_('provider.policy.title'),
  intro:N_('provider.policy.intro'),
  scope:N_('provider.policy.scope'),
  template:N_('provider.policy.template'),
  assurance:N_('provider.policy.assurance'),
  provisioning:N_('provider.policy.provisioning'),
  migration:N_('provider.policy.migration'),
  migrationConsolidated:N_('provider.policy.migration_consolidated'),
  headroom:N_('provider.policy.headroom'),
  cashFloor:N_('provider.policy.cash_floor'),
  budget:N_('provider.policy.budget'),
  maxActions:N_('provider.policy.max_actions'),
  maxEngineers:N_('provider.policy.max_engineers'),
  maxSupport:N_('provider.policy.max_support'),
  review:N_('provider.policy.review'),
  quoteRule:N_('provider.policy.quote_rule'),
  funded:N_('provider.policy.funded'),
  noCharge:N_('provider.policy.no_charge'),
  waitingIdle:N_('provider.policy.waiting_idle'),
  waitingBlocked:N_('provider.policy.waiting_blocked'),
  waitingLimited:N_('provider.policy.waiting_limited'),
  ready:N_('provider.policy.ready'),
  confirm:N_('provider.policy.enable'),
  blocked:N_('provider.policy.blocked'),
  idle:N_('provider.policy.idle'),
  disabled:N_('provider.policy.disabled'),
  suspended:N_('provider.policy.suspended'),
  limited:N_('provider.policy.limited'),
  error:N_('provider.policy.error'),
  cost:N_('provider.policy.cost'),
  recurring:N_('provider.policy.recurring'),
  cashAfter:N_('provider.policy.cash_after'),
  remainingBudget:N_('provider.policy.remaining_budget'),
  actionsRemaining:N_('provider.policy.actions_remaining'),
  staffing:N_('provider.policy.staffing'),
  engineers:N_('provider.policy.engineers'),
  support:N_('provider.policy.support'),
  minutes:N_('provider.policy.minutes'),
  templateAssurance:N_('provider.policy.template_assurance'),
  templateProvisioning:N_('provider.policy.template_provisioning'),
  templateMigration:N_('provider.policy.template_migration'),
  templateHeadroom:N_('provider.policy.template_headroom'),
  regionalCustomers:N_('provider.policy.regional_customers'),
  regionalScopeHelp:N_('provider.policy.regional_scope_help'),
  regionalAnchor:N_('provider.policy.regional_anchor'),
  regionalNoCustomers:N_('provider.policy.regional_no_customers')
 });
 const fallback=Object.freeze({
  title:'Standing policy',intro:'Set a funded policy for this customer and its selected opportunity.',scope:'Paid customer scope',template:'Policy template',
  assurance:'Respond to active incidents',provisioning:'Finish carrier and partner setup',migration:'Staged migration',migrationConsolidated:'Consolidated migration',headroom:'Add carrier headroom at 75% sessions',
  cashFloor:'Cash floor (A$)',budget:'Lifetime action budget (A$)',maxActions:'Maximum automatic actions',maxEngineers:'Engineer ceiling per action',maxSupport:'Support ceiling per action',review:'Review policy',
  quoteRule:'Each eligible action uses a fresh quote. Recurring exposure is shown in the quote and checked again before commitment.',
  funded:'Already funded work remains in progress if this policy is suspended.',
  noCharge:'Enabling this policy places no order and charges nothing immediately.',
  waitingIdle:'The policy will wait until eligible work appears.',waitingBlocked:'The policy can be enabled and will wait until the quote blockers clear.',waitingLimited:'The policy can be enabled and will wait without exceeding its configured limits.',
  ready:'Ready for policy activation',confirm:'Enable reviewed policy',blocked:'A current action quote is blocked.',idle:'No eligible work is available yet.',disabled:'This policy is disabled.',suspended:'This policy is suspended.',limited:'A policy limit prevents action now.',
  error:'The policy could not be reviewed: {error}',cost:'Quoted one-time cost',recurring:'Recurring cost per period',cashAfter:'Cash after commitment',remainingBudget:'Lifetime budget remaining',actionsRemaining:'Actions remaining',staffing:'Provider work',engineers:'engineers',support:'support',minutes:'{count} minutes',
  templateAssurance:'Incident assurance',templateProvisioning:'Stage provisioning',templateMigration:'Estate migration',templateHeadroom:'Carrier capacity',
  regionalCustomers:'Provisioning customers in earned markets',
  regionalScopeHelp:'Choose the owned customers this paid policy may provision. Only markets demonstrated by the Regional MSP achievement are listed. Each resulting order still needs a fresh quote, cash and available staff.',
  regionalAnchor:'Policy purchased for',
  regionalNoCustomers:'No eligible owned customers are available in the earned markets.'
 });
 function text(key,vars){const label=keys[key]||`provider.policy.${key}`,raw=typeof g.tr==='function'?g.tr(label,vars):label;if(raw&&raw!==label)return raw;let out=fallback[key]||label;if(vars)out=out.replace(/\{(\w+)\}/g,(m,k)=>vars[k]??m);return out;}
 function value(o,key,defaultValue=''){const v=o?.[key];return v===undefined||v===null?defaultValue:v;}
 function moneyInput(name,labelKey,cents,draftValue){const shown=draftValue===undefined?(Number(cents||0)/100).toFixed(2):String(draftValue);return `<label>${esc(text(labelKey))}<input name="${name}" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(shown)}" required></label>`;}
 function validateConfig(config){const api=g.SOCProviderPolicy;if(api?.validate)api.validate(config);return config;}
 function configFromForm(policy,formValues,context={}){
  const get=k=>typeof formValues?.get==='function'?formValues.get(k):formValues?.[k],many=k=>{if(typeof formValues?.getAll==='function')return formValues.getAll(k);const v=formValues?.[k];return v===undefined||v===null?[]:Array.isArray(v)?v:[v];},decimal=(key)=>{const raw=String(get(key)??'');if(!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(raw))throw new Error('INVALID_POLICY_AMOUNT');const [whole,frac='']=raw.split('.'),cents=Number(whole)*100+Number((frac+'00').slice(0,2));if(!Number.isSafeInteger(cents))throw new Error('INVALID_POLICY_AMOUNT');return cents;},integer=(key,min,max)=>{const raw=String(get(key)??'');if(!/^\d{1,5}$/.test(raw))throw new Error('INVALID_POLICY_LIMIT');const n=Number(raw);if(n<min||n>max)throw new Error('INVALID_POLICY_LIMIT');return n;};
  const customerId=String(get('customerId')||policy?.customerId||'');if(!/^[a-z][a-z0-9-]{0,63}$/.test(customerId))throw new Error('POLICY_CUSTOMER_SCOPE_REQUIRED');if(policy?.customerId&&customerId!==policy.customerId)throw new Error('POLICY_CUSTOMER_SCOPE_MISMATCH');
  const regionalProvisioning=context.regionalProvisioning===true,template=regionalProvisioning?'provisioning':String(get('template')||'assurance'),allowed=['assurance','provisioning','migration','migration-consolidated','headroom'];if(!allowed.includes(template))throw new Error('INVALID_POLICY_TEMPLATE');
  const old=policy?.config||policy||{},actionsUsed=Number.isSafeInteger(old.actionsUsed)?old.actionsUsed:Array.isArray(policy?.actions)?policy.actions.length:0,budgetSpentCents=Number.isSafeInteger(old.budgetSpentCents)?old.budgetSpentCents:Number.isSafeInteger(policy?.spentCents)?policy.spentCents:0;
  let rules;if(template==='assurance')rules=[{id:'assurance-repair',kind:'assurance',enabled:true,customerIds:[],operationId:'repair',stage:null,resourceId:null,thresholdPercent:null}];
  else if(template==='provisioning')rules=['carrier','partner'].map(stage=>({id:`provision-${stage}`,kind:'provisioning',enabled:true,customerIds:[],operationId:null,stage,resourceId:null,thresholdPercent:null}));
  else if(template==='migration'||template==='migration-consolidated')rules=[{id:template==='migration'?'migration-staged':'migration-consolidated',kind:'migration',enabled:true,customerIds:[],operationId:template,stage:null,resourceId:'platform-cutover',thresholdPercent:null}];
  else rules=[{id:'carrier-headroom',kind:'headroom',enabled:true,customerIds:[],operationId:'carrier-headroom',stage:null,resourceId:'carrier',thresholdPercent:75}];
  let customerIds=[customerId];if(regionalProvisioning){const candidates=Array.isArray(context.eligibleCustomers)?context.eligibleCustomers.map(c=>typeof c==='string'?c:c?.id):[],allowedIds=new Set(candidates.filter(id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(id))),selected=many('scopeCustomerId').map(String);if(!selected.length)throw new Error('REGIONAL_SCOPE_REQUIRED');if(selected.length>128||new Set(selected).size!==selected.length||selected.some(id=>!allowedIds.has(id)))throw new Error('REGIONAL_SCOPE_INVALID');customerIds=selected;rules=rules.map(r=>({...r,customerIds:[...selected]}));}
  const config={version:2,enabled:true,suspended:false,cashFloorCents:decimal('cashFloor'),lifetimeBudgetCents:decimal('lifetimeBudget'),budgetSpentCents, maxActions:integer('maxActions',1,10000),actionsUsed,engineerCeiling:integer('maxEngineers',0,1000),supportCeiling:integer('maxSupport',0,1000),customerIds,rules};
  return validateConfig(config);
 }
 function previewContent(review){
  if(review.error)return `<p class="provider-blocked">${esc(text('error',{error:String(review.error).replaceAll('_',' ').toLowerCase()}))}</p>`;
  const p=review.preview;if(!p)return '';
  const status=p.status||'blocked',enableable=['ready','idle','blocked','limited'].includes(status),v=p.preview||{};
  if(status==='ready')return `<div class="provider-policy-preview is-ready"><h3>${esc(text('ready'))}</h3><p>${esc(p.customerName||review.customerName||review.customerId||'')}</p><dl><dt>${esc(text('cost'))}</dt><dd>${money(v.costCents)}</dd>${Number.isFinite(v.recurringCents)?`<dt>${esc(text('recurring'))}</dt><dd>${money(v.recurringCents)}</dd>`:''}<dt>${esc(text('cashAfter'))}</dt><dd>${money(v.cashAfterCents)}</dd><dt>${esc(text('remainingBudget'))}</dt><dd>${money(v.lifetimeBudgetRemainingCents)}</dd><dt>${esc(text('actionsRemaining'))}</dt><dd>${Number(v.actionsRemaining||0)}</dd><dt>${esc(text('staffing'))}</dt><dd>${Number(v.engineers||0)} ${esc(text('engineers'))} · ${Number(v.support||0)} ${esc(text('support'))}${Number.isFinite(v.workMinutes)?` · ${esc(text('minutes',{count:v.workMinutes}))}`:''}</dd></dl><p>${esc(text('quoteRule'))}</p><p>${esc(text('noCharge'))}</p><p>${esc(text('funded'))}</p><button class="primary" data-provider-action="policy-confirm" data-id="${esc(review.customerId||'')}">${esc(text('confirm'))}</button></div>`;
  const statusKey=({blocked:'blocked',idle:'idle',disabled:'disabled',suspended:'suspended',limited:'limited'})[status]||'blocked',waitingKey=({blocked:'waitingBlocked',idle:'waitingIdle',limited:'waitingLimited'})[status];return `<div class="provider-policy-preview is-${esc(status)}"><p>${esc(text(statusKey))}</p>${p.reason?`<small>${esc(String(p.reason).replaceAll('_',' ').toLowerCase())}</small>`:''}${p.blockers?.length?`<ul>${p.blockers.map(x=>`<li>${esc(String(x).replaceAll('_',' ').toLowerCase())}</li>`).join('')}</ul>`:''}${waitingKey?`<p>${esc(text(waitingKey))}</p>`:''}<p>${esc(text('noCharge'))}</p><p>${esc(text('funded'))}</p>${enableable?`<button class="primary" data-provider-action="policy-confirm" data-id="${esc(review.customerId||'')}">${esc(text('confirm'))}</button>`:''}</div>`;
 }
 function render(policy,view={}){
  const config=policy?.config||policy||{},customerId=String(view.customerId||policy?.customerId||config.customerIds?.[0]||''),customerName=String(view.customerName||customerId||text('scope')),draft=view.draft||{},review=view.review&&view.review.customerId===customerId?view.review:null,template=String(draft.template||view.template||'assurance'),regionalProvisioning=view.regionalProvisioning===true,eligibleCustomers=Array.isArray(view.eligibleCustomers)?view.eligibleCustomers.filter(c=>c&&typeof c.id==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(c.id)):[],draftScope=draft.scopeCustomerId===undefined?(config.customerIds||[customerId]):Array.isArray(draft.scopeCustomerId)?draft.scopeCustomerId:[draft.scopeCustomerId],selectedScope=new Set(draftScope.map(String));
  const option=(id,key)=>`<option value="${id}" ${template===id?'selected':''}>${esc(text(key))}</option>`,scope=regionalProvisioning?`<fieldset class="provider-policy-regional-scope"><legend>${esc(text('regionalCustomers'))}</legend><p>${esc(text('regionalScopeHelp'))}</p>${eligibleCustomers.length?eligibleCustomers.map(c=>`<label><input type="checkbox" name="scopeCustomerId" value="${esc(c.id)}" ${selectedScope.has(c.id)?'checked':''}>${esc(c.name||c.id)} · ${esc(c.market||'')}</label>`).join(''):`<p>${esc(text('regionalNoCustomers'))}</p>`}<small>${esc(text('regionalAnchor'))}: ${esc(customerName)}</small></fieldset>`:'',form=`<form data-provider-form="policy" data-customer="${esc(customerId)}"><input type="hidden" name="customerId" value="${esc(customerId)}">${regionalProvisioning?`<input type="hidden" name="regionalProvisioning" value="true"><p><strong>${esc(text('templateProvisioning'))}</strong></p>`:`<label>${esc(text('template'))}<select name="template" required>${option('assurance','templateAssurance')}${option('provisioning','templateProvisioning')}${option('migration','templateMigration')}${option('migration-consolidated','migrationConsolidated')}${option('headroom','templateHeadroom')}</select></label>`}${scope}${moneyInput('cashFloor','cashFloor',value(config,'cashFloorCents',0),draft.cashFloor)}${moneyInput('lifetimeBudget','budget',value(config,'lifetimeBudgetCents',policy?.budgetCents||0),draft.lifetimeBudget)}<label>${esc(text('maxActions'))}<input name="maxActions" type="number" min="1" max="10000" step="1" value="${esc(draft.maxActions===undefined?Number(value(config,'maxActions',8)):String(draft.maxActions))}" required></label><label>${esc(text('maxEngineers'))}<input name="maxEngineers" type="number" min="0" max="1000" step="1" value="${esc(draft.maxEngineers===undefined?Number(value(config,'engineerCeiling',2)):String(draft.maxEngineers))}" required></label><label>${esc(text('maxSupport'))}<input name="maxSupport" type="number" min="0" max="1000" step="1" value="${esc(draft.maxSupport===undefined?Number(value(config,'supportCeiling',2)):String(draft.maxSupport))}" required></label><p>${esc(text('scope'))}: <strong>${esc(customerName)}</strong></p><p>${esc(text('intro'))}</p><p>${esc(text('quoteRule'))}</p><p>${esc(text('noCharge'))}</p><p>${esc(text('funded'))}</p><button type="submit" class="primary">${esc(text('review'))}</button></form>`;
  return `<section class="provider-policy-controls"><h2>${esc(text('title'))}</h2>${form}${review?previewContent({...review,customerId,customerName}):''}</section>`;
 }
 g.SOCProviderPolicyControls={render,configFromForm};
})(globalThis);
