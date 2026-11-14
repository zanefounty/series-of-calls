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
async function snapshot(page){return page.evaluate(()=>({clock:SCP.state.clock,revision:SCP.state.revision,role:SCP.state.careerRole,customerIt:structuredClone(SCP.state.customerIt),mspCash:SCP.state.business.balance.cash}));}
async function journey(browser,plan,report){
 const context=await browser.newContext({viewport:plan.viewport}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto(URL,{waitUntil:'domcontentloaded'});
 await page.locator('[data-provider-action="show-new-game"]').click();
 await page.locator('[name="careerRole"]').selectOption('customer-it');
 await page.locator('[data-provider-form="new-game"] button[type="submit"]').click();
 await page.locator('.provider-customer-it').waitFor({state:'visible'});
 const before=await snapshot(page);assert.equal(before.role,'customer-it');assert.equal(before.customerIt.budgetCents,900000);
 const quote=page.locator(`[data-provider-action="customer-it-commit"][data-provider-value="${plan.choice}"]`);assert.match(await quote.innerText(),/Approve this customer spend/);
 if(plan.choice==='protect'){await quote.focus();assert.equal(await quote.evaluate(node=>document.activeElement===node),true);await page.keyboard.press('Enter');}else await quote.click();
 await page.waitForFunction(choice=>SCP.state?.customerIt?.opening?.choice===choice,plan.choice);
 const funded=await snapshot(page);assert.equal(funded.mspCash,before.mspCash);assert.equal(funded.customerIt.budgetCents,plan.choice==='protect'?550000:400000);
 await page.locator('[data-provider-action="speed"][data-provider-value="1"]').click();
 await page.waitForFunction(()=>SCP.state?.clock>=8,null,{timeout:45000});await page.locator('[data-provider-action="pause"]').click();
 const outage=await snapshot(page);assert.equal(outage.customerIt.outage.status,plan.choice==='protect'?'protected':'interrupted');
 assert.equal(outage.customerIt.sites.south.platform,plan.choice==='migrate'?'managed':'legacy');
 if(plan.choice==='migrate'){
  await page.locator('[data-provider-action="customer-it-repair"]').click();
  await page.waitForFunction(()=>!!SCP.state?.customerIt?.repair);
  await page.locator('[data-provider-action="speed"][data-provider-value="1"]').click();
  await page.waitForFunction(()=>SCP.state?.customerIt?.outage?.status==='recovered',null,{timeout:30000});
  await page.locator('[data-provider-action="pause"]').click();
 }
 const completed=await snapshot(page);await page.locator('[data-provider-action="save"]').click();
 await page.locator('.provider-customer-it').screenshot({path:path.join(OUT,`${plan.id}.png`)});
 const layout=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,customerPanel:Math.round(document.querySelector('.provider-customer-it').getBoundingClientRect().width)}));
 assert.ok(layout.document<=layout.viewport+1,JSON.stringify(layout));
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-provider-action="open"]:visible').first().click();await page.locator('.provider-customer-it').waitFor({state:'visible'});
 const restored=await snapshot(page);assert.deepEqual(restored.customerIt,completed.customerIt);assert.equal(restored.role,completed.role);assert.equal(restored.mspCash,completed.mspCash);assert.deepEqual(errors,[]);
 report.journeys.push({id:plan.id,choice:plan.choice,viewport:plan.viewport,before,funded,outage,completed,restored,layout,screenshot:`${plan.id}.png`,errors});await context.close();
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
