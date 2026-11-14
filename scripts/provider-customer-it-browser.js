#!/usr/bin/env node
/* Real-control Customer IT opening evidence. Source reads are observational. */
'use strict';
const {chromium}=require('playwright-core');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),URL=process.env.SOC_CUSTOMER_IT_BROWSER_URL||'http://127.0.0.1:8087/',OUT=path.resolve(process.env.SOC_CUSTOMER_IT_BROWSER_OUT||'/tmp/soc-customer-it-browser');
const EXECUTABLE=process.env.SOC_CUSTOMER_IT_BROWSER_EXECUTABLE||process.env.CHROMIUM_PATH;
if(!EXECUTABLE)throw new Error('Set SOC_CUSTOMER_IT_BROWSER_EXECUTABLE to a local Chromium binary.');
if(!OUT.startsWith('/tmp/'))throw new Error('Browser output must be under /tmp.');
function files(dir){return fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).flatMap(entry=>{const rel=path.posix.join(dir,entry.name);return entry.isDirectory()?files(rel):entry.isFile()?[rel]:[];}).sort();}
function inputs(){return Object.fromEntries([...files('src'),...files('site'),'scripts/provider-customer-it-browser.js','scripts/lib/page.js','package.json','package-lock.json'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex')]));}
async function snapshot(page){return page.evaluate(()=>({clock:SCP.state.clock,revision:SCP.state.revision,role:SCP.state.careerRole,customerIt:structuredClone(SCP.state.customerIt),mspCash:SCP.state.business.balance.cash,provider:{customerId:SCP.state.providerCampaign.customers[0]?.id,projectIds:SCP.state.providerCampaign.projects.filter(p=>p.kind==='stage').map(p=>p.id),postingIds:SCP.state.providerCampaign.projects.filter(p=>p.kind==='stage').map(p=>p.postingId),customerRootName:SCP.state.portfolio.customers[0]?.root.customerName,beaPlacement:SCP.state.portfolio.customers[0]?.root.operations?.placements?.bea||'phone',migrationProject:SCP.state.providerCampaign.projects.find(p=>p.operationId==='migration')?.status,accessFault:SCP.state.portfolio.customers[0]?.root.resources.access.fault,readyMinutes:SCP.state.providerCampaign.customers[0]?.period.serviceReadyMinutes,failed:SCP.state.providerCampaign.customers[0]?.metrics.failed}}));}
async function journey(browser,plan,report){
 const context=await browser.newContext({viewport:plan.viewport}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto(URL,{waitUntil:'domcontentloaded'});
 await page.locator('[data-provider-action="show-new-game"]').click();
 await page.locator('[name="careerRole"]').selectOption('customer-it');
 await page.locator('[data-provider-form="new-game"] button[type="submit"]').click();
 await page.locator('.provider-customer-it').waitFor({state:'visible'});
 const before=await snapshot(page);assert.equal(before.role,'customer-it');assert.equal(before.customerIt.version,4);assert.equal(before.customerIt.budgetCents,900000);assert.equal(before.customerIt.providerLink.customerId,before.provider.customerId);assert.equal(before.provider.customerRootName,'Canopy Group');assert.deepEqual(before.customerIt.providerLink.stages.map(row=>row.projectId),before.provider.projectIds);assert.deepEqual(before.customerIt.providerLink.stages.map(row=>row.postingId),before.provider.postingIds);
 const quote=page.locator(`[data-provider-action="customer-it-commit"][data-provider-value="${plan.choice}"]`);assert.match(await quote.innerText(),/Approve this customer spend/);
 if(plan.choice==='protect'){await quote.focus();assert.equal(await quote.evaluate(node=>document.activeElement===node),true);await page.keyboard.press('Enter');}else await quote.click();
 await page.waitForFunction(choice=>SCP.state?.customerIt?.opening?.choice===choice,plan.choice);
 const funded=await snapshot(page);assert.equal(funded.mspCash,before.mspCash);assert.equal(funded.customerIt.budgetCents,plan.choice==='protect'?550000:400000);
 await page.locator('[data-provider-action="customer-it-grant"]').click();await page.waitForFunction(()=>SCP.state?.customerIt?.grant?.grantee==='orchard-msp');const granted=await snapshot(page);assert.equal(granted.customerIt.grant.expiresAt,180);assert.equal(granted.mspCash,before.mspCash);
 if(plan.choice==='protect'){await page.locator('[data-provider-action="customer-it-fund-south"]').click();await page.waitForFunction(()=>!!SCP.state?.customerIt?.migration?.internalFunding);assert.equal((await snapshot(page)).customerIt.budgetCents,50000);}
 await page.locator('[data-provider-action="speed"][data-provider-value="1"]').click();
 await page.waitForFunction(()=>SCP.state?.clock>=12,null,{timeout:45000});await page.locator('[data-provider-action="pause"]').click();
 const outage=await snapshot(page);assert.equal(outage.customerIt.outage.status,plan.choice==='protect'?'protected':'interrupted');assert.equal(outage.provider.accessFault,plan.choice==='protect'?null:'OUTAGE');assert.match(await page.locator('.provider-customer-it-contract').innerText(),/Paid service: access/);
 assert.equal(outage.customerIt.sites.south.platform,'legacy');
 if(plan.choice==='migrate'){
  await page.locator('[data-provider-action="customer-it-repair"]').click();
  await page.waitForFunction(()=>!!SCP.state?.customerIt?.repair);
  await page.locator('[data-provider-action="speed"][data-provider-value="1"]').click();
  await page.waitForFunction(()=>SCP.state?.customerIt?.outage?.status==='recovered',null,{timeout:30000});
  await page.locator('[data-provider-action="pause"]').click();

 }
 const windowButton=page.locator('[data-provider-action="customer-it-window"]').first(),rehearsalButton=page.locator('[data-provider-action="customer-it-rehearse"]').first(),deadline=Date.now()+60000;
 while(!(await windowButton.count())&&!(await rehearsalButton.count())){
  if(Date.now()>=deadline){const detail=await page.evaluate(()=>({clock:SCP.state.clock,speed:SCP.speed,busy:SCP.busy,grant:SCP.state.customerIt.grant,migration:SCP.state.customerIt.migration,windows:SOC.customerIt.inspect(SCP.state).windowQuotes.map(q=>({at:q.request.cutoverAt,blockers:q.blockers}))}));throw new Error('No accepted migration window became available: '+JSON.stringify(detail));}
  if(!await page.evaluate(()=>!!SCP.speed))await page.locator('[data-provider-action="speed"][data-provider-value="1"]').click();
  await page.waitForTimeout(150);
 }
 if(await page.evaluate(()=>!!SCP.speed))await page.locator('[data-provider-action="pause"]').click();
 if(await rehearsalButton.count()){const rehearsalAt=Number(await rehearsalButton.getAttribute('data-cutover'));await rehearsalButton.click();await page.waitForFunction(at=>SCP.state?.portfolio?.customers?.[0]?.root?.providerTasks?.some(task=>task.rehearsal?.cutoverAt===at),rehearsalAt);await windowButton.waitFor({state:'visible'});}
 const cutoverAt=Number(await windowButton.getAttribute('data-cutover'));assert.ok(cutoverAt>12);await windowButton.click();
 await page.waitForFunction(at=>SCP.state?.customerIt?.migration?.cutoverAt===at,cutoverAt);const accepted=await snapshot(page);assert.equal(accepted.customerIt.migration.status,'scheduled');assert.equal(accepted.provider.beaPlacement,'phone');
 await page.locator('[data-provider-action="speed"][data-provider-value="1"]').click();await page.waitForFunction(()=>SCP.state?.customerIt?.migration?.status==='complete',null,{timeout:60000});await page.locator('[data-provider-action="pause"]').click();
 const migrated=await snapshot(page);assert.equal(migrated.customerIt.sites.south.platform,'managed');assert.equal(migrated.provider.beaPlacement,'migration-phone');assert.equal(migrated.provider.migrationProject,'complete');
 if(plan.choice==='migrate'){await page.locator('[data-provider-action="customer-it-revoke"]').click();await page.waitForFunction(()=>SCP.state?.customerIt?.grant?.revokedAt!==null);assert.match(await page.locator('.provider-customer-it-contract').innerText(),/Grant revoked/);}
 const completed=await snapshot(page);if(plan.choice==='migrate')assert.equal(completed.provider.accessFault,null);await page.locator('[data-provider-action="save"]').click();
 await page.locator('.provider-customer-it').screenshot({path:path.join(OUT,`${plan.id}.png`)});
 await page.locator('.provider-customer-it-contract').screenshot({path:path.join(OUT,`${plan.id}-contract.png`)});
 const layout=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,customerPanel:Math.round(document.querySelector('.provider-customer-it').getBoundingClientRect().width)}));
 assert.ok(layout.document<=layout.viewport+1,JSON.stringify(layout));
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-provider-action="open"]:visible').first().click();await page.locator('.provider-customer-it').waitFor({state:'visible'});
 const restored=await snapshot(page);assert.deepEqual(restored.customerIt,completed.customerIt);assert.equal(restored.role,completed.role);assert.equal(restored.mspCash,completed.mspCash);assert.deepEqual(errors,[]);
 report.journeys.push({id:plan.id,choice:plan.choice,viewport:plan.viewport,before,funded,granted,outage,accepted,migrated,completed,restored,layout,screenshot:`${plan.id}.png`,contractScreenshot:`${plan.id}-contract.png`,errors});await context.close();
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});const before=inputs(),report={status:'running',startedAt:new Date().toISOString(),url:URL,browser:null,playwright:require('playwright-core/package.json').version,inputs:before,changedInputs:[],journeys:[],errors:[]};
 let browser;
 try{browser=await chromium.launch({executablePath:EXECUTABLE,headless:true,args:['--no-sandbox']});report.browser=browser.version();
  for(const plan of [{id:'customer-it-protected-desktop',choice:'protect',viewport:{width:1366,height:768}},{id:'customer-it-migration-repair-phone',choice:'migrate',viewport:{width:390,height:844}}])await journey(browser,plan,report);
  const after=inputs();report.changedInputs=Object.keys(before).filter(file=>before[file]!==after[file]);assert.deepEqual(report.changedInputs,[]);report.status='passed';
 }catch(error){report.status='failed';report.errors.push(String(error?.stack||error));process.exitCode=1;}
 finally{if(browser)await browser.close();report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(`Customer IT browser ${report.status}: ${report.journeys.length} journeys; ${report.errors.length} errors; ${report.changedInputs.length} changed inputs`);}
})();
