'use strict';

const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');

async function runRetailJourney({browser,baseUrl,report,OUT,click,snap,startNew,quoteBase,selectMapCustomer}){
 const row={id:'retail-retention-desktop',status:'running',careers:[],errors:[]};report.journeys.push(row);
 const directory=path.join(OUT,row.id);fs.rmSync(directory,{recursive:true,force:true});fs.mkdirSync(directory,{recursive:true});
 async function career(price){
  const kind=price===171000?'discounted':'full-price',folder=path.join(directory,kind);fs.mkdirSync(folder,{recursive:true});
  const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>row.errors.push(`${kind}: ${error.message}`));page.on('console',message=>{if(message.type()==='error')row.errors.push(`${kind}: ${message.text()}`);});
  const state=()=>page.evaluate(()=>{const s=SCP.state,c=s.providerCampaign.customers.find(c=>c.id==='starter-customer');return {clock:s.clock,cash:s.business.balance.cash,customer:c?{status:c.status,retailCents:c.retailCents,retailAgreement:structuredClone(c.retailAgreement),history:c.history.map(h=>({period:h.period,qualified:h.qualified,credit:h.credit,grossRetail:h.grossRetail})),failedStreak:c.failedStreak}:null,incidents:s.providerCampaign.incidents.map(i=>({id:i.id,status:i.status,activatedAt:i.activatedAt,resolvedAt:i.resolvedAt})),jobs:s.providerCampaign.jobs.map(j=>({arrivalAt:j.arrivalAt,status:j.status,completedAt:j.completedAt}))};});
  const step=async name=>{const observed=await state();row.careers.push({kind,name,...observed});await page.screenshot({path:path.join(folder,`${name}.png`),fullPage:true});};
  const pause=async()=>{if(await page.evaluate(()=>!!SCP.speed))await click(page,'[data-provider-action="pause"]');await page.waitForFunction(()=>!SCP.speed&&!SCP.busy);};
  const until=async target=>{const deadline=Date.now()+120000;while((await state()).clock<target){if(Date.now()>deadline)throw Error(`${kind}: clock did not reach ${target}`);if(!await page.evaluate(()=>!!SCP.speed))await click(page,'[data-provider-action="speed"][data-provider-value="8"]');await page.waitForTimeout(100);}await pause();};
  const repair=async()=>{const incident=await page.evaluate(()=>SCP.state.providerCampaign.incidents.find(i=>i.status==='active')?.id);assert.ok(incident,`${kind}: expected active incident`);await click(page,'[data-provider-action="drawer"][data-provider-value="incidents"]');await click(page,`[data-provider-action="select-incident"][data-id="${incident}"]`);await click(page,'.provider-inspector [data-provider-action="respond-incident"][data-operation="repair"]');await page.waitForFunction(id=>SCP.state.providerCampaign.projects.some(p=>p.operationId==='repair'&&p.customerId==='starter-customer'&&p.status!=='cancelled'&&SCP.state.providerCampaign.incidents.some(i=>i.id===id)),incident);};
  const renew=async()=>{assert.equal((await state()).customer.status,'renewal');await selectMapCustomer(page);await click(page,'[data-provider-action="renew"][data-id="starter-customer"]');await page.waitForFunction(()=>SCP.state.providerCampaign.customers.find(c=>c.id==='starter-customer')?.status==='active');};
  try{
   await page.goto(baseUrl);await page.waitForSelector('[data-provider-action="show-new-game"]');await startNew(page,{plan:'swift',id:`retail-${kind}`,seed:73,scenario:'smb'});
   await click(page,'[data-provider-action="drawer"][data-provider-value="deals"]');await click(page,'.provider-rail-body .provider-plan-pair [data-provider-action="quote"][data-offer="starter"][data-plan="swift"]');
   if(price===171000){await click(page,'.provider-starter-retail > summary');const form=page.locator('[data-provider-form="retail-quote"]:visible');await form.locator('[name=retailPrice]').fill('1710');await form.locator('button').click();}
   const quote=await page.evaluate(()=>structuredClone(SOC_PROVIDER_UI.view().quote));assert.equal(quote.commercial.retailRetention.discountThresholdCents,171000);assert.equal(quote.commercial.retailRetention.qualifiedPeriodsRequired,price===171000?1:2);assert.equal(quote.commercial.retailRetention.priceCents,price);const terms=page.locator('.provider-starter-retail');if(!await terms.evaluate(element=>element.open))await terms.locator('summary').click();assert.match(await page.locator('.provider-retail-retention:visible').innerText(),/one of the last three/);await step('visible-price-and-retention-quote');
   await click(page,'[data-provider-action="confirm-quote"]');await page.waitForFunction(expectedPrice=>SCP.state.providerCampaign.customers.find(c=>c.id==='starter-customer')?.retailCents===expectedPrice,price);
   for(const stage of ['base','carrier','partner']){if(stage!=='base')await quoteBase(page,'swift',stage,'starter-customer',{id:row.id});await page.waitForFunction(stage=>SCP.state.providerCampaign.customers.find(c=>c.id==='starter-customer')?.stages[stage]?.status!==null,stage);if((await state()).clock<8)await until(stage==='base'?3:stage==='carrier'?5:8);}
   assert.ok(await page.evaluate(()=>['base','carrier','partner'].every(stage=>SCP.state.providerCampaign.customers[0].stages[stage]?.status==='effective')));await step('paid-service-effective');
   await until(100);await repair();await step('first-incident-repair-funded');await until(240);await renew();await step('first-renewal-accepted');await until(420);await renew();await step('second-renewal-accepted');await until(540);await repair();await step('later-incident-repair-funded');await until(600);
   const observed=await state();assert.deepEqual(observed.customer.history.slice(-3).map(h=>h.qualified),[false,false,true]);assert.equal(observed.customer.status,price===171000?'renewal':'exited');await step('retention-outcome');
   await click(page,'[data-provider-action="drawer"][data-provider-value="menu"]');const downloadPromise=page.waitForEvent('download');await click(page,'[data-provider-action="export"]');const download=await downloadPromise,body=fs.readFileSync(await download.path(),'utf8'),exported=JSON.parse(body);assert.equal(exported.providerCampaign.customers[0].status,observed.customer.status);const file=path.join(folder,'career-export.json');fs.writeFileSync(file,body);await step('visible-save-exported');return {kind,price,observed,exportSha256:crypto.createHash('sha256').update(body).digest('hex'),exportFile:path.relative(OUT,file)};
  }finally{await context.close();}
 }
 try{const full=await career(180000),discount=await career(171000);assert.deepEqual(full.observed.jobs,discount.observed.jobs,'price alone must not change synthetic work');assert.deepEqual(full.observed.incidents.map(i=>[i.activatedAt,i.resolvedAt]),discount.observed.incidents.map(i=>[i.activatedAt,i.resolvedAt]));assert.ok(full.observed.cash>discount.observed.cash,'retention costs recurring revenue');assert.deepEqual(row.errors,[]);row.result={full,discount};row.status='passed';}
 catch(error){row.status='failed';row.failure=String(error.stack||error);throw error;}
}

module.exports={runRetailJourney};
