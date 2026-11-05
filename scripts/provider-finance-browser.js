"use strict";
// Attach to an existing paid journey after settlement. All mutations are visible controls.
const assert=require('node:assert/strict');
async function inspectFinanceBills({page,click,snap,row,requireCredit=true,requireRecovery=true}){
 if(await page.evaluate(()=>!!SCP.speed))await click(page,'[data-provider-action="pause"]');
 await page.waitForFunction(()=>!SCP.busy&&!SCP.speed);
 const model=await page.evaluate(()=>structuredClone(SOC_PROVIDER_FINANCE_VIEW.inspect(SCP.state)));
 assert.ok(model.rows.length>=2,'two actual settled periods are required');
 const credited=model.rows.find(r=>r.bridge&&r.customers.some(c=>c.credit>0));
 if(requireCredit)assert.ok(credited,'a real failure-credit settlement is required');
 const recovery=credited&&model.rows.find(r=>r.period>credited.period&&r.bridge&&r.customers.some(c=>{const old=credited.customers.find(x=>x.customerId===c.customerId);return old&&c.credit<old.credit&&c.completedOnTime>old.completedOnTime;}));
 if(requireRecovery)assert.ok(recovery,'a later period must show measured recovery, not an invented successful bill');
 const selected=[credited||model.rows[0],recovery||model.rows.at(-1)];
 await click(page,'[data-provider-action="drawer"][data-provider-value="finance"]');
 const evidence=[];
 for(const bill of selected){
  await page.locator('[data-provider-finance-period]').selectOption(String(bill.period));
  await page.waitForFunction(period=>document.querySelector('[data-finance-period]')?.dataset.financePeriod===String(period),bill.period);
  const shown=await page.locator('.provider-finance-history').innerText();assert.match(shown,/Borrowing is not revenue/);
  const amounts=await page.evaluate(()=>{const article=document.querySelector('[data-finance-period]');return {postings:[...article.querySelectorAll('[data-finance-posting]')].map(x=>x.dataset.financePosting),bridge:[...article.querySelectorAll('.provider-finance-bridge [data-finance-value]')].map(x=>({key:x.dataset.financeValue,text:x.textContent})),expected:Object.fromEntries(Object.entries(SOC_PROVIDER_FINANCE_VIEW.inspect(SCP.state).rows.find(r=>String(r.period)===article.dataset.financePeriod).bridge).map(([k,v])=>[k,SOCProviderHud.money(v)]))};});
  assert.deepEqual(amounts.postings,bill.postings.map(p=>p.id));
  const keys={opening:'openingCash',profit:'operatingResult',funding:'funding',repayment:'repayment',change:'cashChange',closing:'closingCash'};
  for(const item of amounts.bridge)assert.equal(item.text,amounts.expected[keys[item.key]]);
  assert.equal(bill.bridge.closingCash,bill.bridge.openingCash+bill.bridge.operatingResult+bill.bridge.funding-bill.bridge.repayment);
  await page.locator('[data-finance-posting] summary').first().click();assert.ok(await page.locator('[data-finance-posting] details[open]').count());
  await snap(page,row,'finance-period-'+bill.period);evidence.push({period:bill.period,bill,shown,amounts});
 }
 const period=selected.at(-1).period,at=await page.evaluate(()=>SCP.state.clock);
 await page.locator('[data-provider-finance-period]').focus();
 await click(page,'[data-provider-action="speed"][data-provider-value="8"]');await page.waitForFunction(at=>SCP.state.clock>at||!!SCP.error,at);assert.equal(await page.evaluate(()=>SCP.error||null),null);
 await click(page,'[data-provider-action="pause"]');await page.waitForFunction(()=>!SCP.busy&&!SCP.speed);
 assert.equal(await page.locator('[data-provider-finance-period]').inputValue(),String(period));
 assert.ok(await page.locator('[data-finance-posting] details[open]').count(),'expanded evidence survives ticks');
 row.financeEvidence={scope:'Actual retained settlements and visible posting reconciliation; automated observation, not a human pilot.',periods:evidence,persistentPeriod:period};
 return row.financeEvidence;
}
module.exports={inspectFinanceBills};
