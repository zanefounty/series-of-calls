/* Served-origin browser checks; launch/listen failures never count as browser evidence. */
const {chromium}=require('playwright-core');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site=path.resolve(process.env.SOC_BROWSER_BUILD_DIR||path.join(root,'_site')),out=path.resolve(process.env.SOC_BROWSER_EVIDENCE_DIR||path.join(root,'evidence'));
const report={checkedAt:new Date().toISOString(),status:'running',offline:'not-run',results:[],scope:'Compiled consoles, configuration, topology, keyboard, save/export/import, tab ownership, worker execution and offline reload at a project path. Full scenario acceptance remains separate.'};
function inputs(){const result={},folders=['src','site','content'];if(site===path.join(root,'_site'))folders.push('_site');for(const folder of folders){const walk=dir=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else result[path.relative(root,p)]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}};walk(path.join(root,folder));}return result;}
async function main(){
 let browser,server;
 try{
  report.stage='build';require('./build').build({out:site});report.stage='listen';
  server=http.createServer(require('./serve').handler(site));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url=`http://127.0.0.1:${server.address().port}/series-of-calls/`;report.stage='launch';
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});report.browser=browser.version();
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:844,height:390}]){
   report.stage='viewport-'+viewport.width;const context=await browser.newContext({viewport,acceptDownloads:true}),errors=[];
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
   await page.locator('[data-provider-action=training]').click();await page.waitForFunction(()=>SCT.locked);
   // Expanded failed requirements must remain readable without widening mobile pages.
   await page.locator('[data-biz=start]').click();await page.locator('[data-domain-start=campaign] button').click();
   const requirements=page.locator('#soc-domain-campaign > details').filter({has:page.locator('summary').filter({hasText:/^Requirements$/})});await requirements.locator('summary').click();
   assert.ok(await requirements.locator('li').filter({hasText:'CURRENT_SERVICE:'}).count()>0,'exercise must expose actual unmet service requirements');
   assert.equal(await requirements.locator('ul').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'campaign requirement codes overflow their list');
   assert.equal(await page.evaluate(()=>document.querySelector('#soc-console').scrollWidth<=innerWidth),true,'expanded campaign requirements widen the viewport');
   await page.locator('[data-soc=new]').click();await page.waitForFunction(()=>SCT.locked&&!SCT.state.business&&!SCT.state.campaign);
   await page.locator('[data-soc=select][data-id=people]').click();await page.locator('#soc-config [name=people]').fill('2');await page.locator('#soc-config button[type=submit]').click();
   await page.locator('[data-soc=minute]').click();await page.waitForFunction(()=>!SCT.busy&&SCT.state.clock===1);
   await page.locator('[data-soc=interaction]').click();await page.locator('[data-soc=five]').click();await page.waitForFunction(()=>!SCT.busy&&SOC.assess(SCT.state).passed);
   for(const selector of ['[data-biz=start]','[data-ops=start]','[data-info=start]','[data-contact=start]','[data-sa-start=calling] button','[data-sa-start=workforce] button','[data-sa-start=estate] button'])await page.locator(selector).click();
   await page.locator('[data-soc=minute]').click();await page.waitForFunction(()=>!SCT.busy&&SCT.state.contact.effective);
   // Shared lines require an effective calling directory identity, not merely a started pack.
   await page.locator('[data-sa-form=tenant] button').click();
   await page.locator('[data-sa-form=identity] button').click();
   await page.locator('[data-soc=minute]').click();await page.waitForFunction(()=>!SCT.busy&&SCT.state.calling.nodes.directory.effective?.identities.length>0);
   for(const selector of ['[data-portfolio-action=start]','[data-market-action=start]','[data-aa-start=products] button','[data-lifecycle-action=start]'])await page.locator(selector).click();
   for(const selector of ['[data-domain-start=transport] button','form[data-product-evidence-start] button','form[data-media-start] button','form[data-site-action=start] button','#soc-managed-operations [data-managed-action=start]','form[data-shared-start] button','form[data-security-start] button','[data-observation-action=start]'])await page.locator(selector).click();
   for(const selector of ['#soc-portfolio form[data-portfolio-add]','#soc-market-qualification button[data-market-action=open-window]','#soc-domain-transport form[data-domain-form=link]','#soc-media-negotiation form[data-media-form=endpoint]','#soc-sites form[data-site-action=site]','#soc-managed-operations [data-managed-submit]','#soc-specialist-lifecycle form[data-lifecycle-record-form]','#soc-shared-services-admin form[data-shared-form=configure]','#soc-security-admin form[data-security-form=configure-network]','#soc-observation [data-observation-action=open][data-goal=rd]'])assert.equal(await page.locator(selector).count(),1,`missing or unrendered admin control: ${selector}`);
   assert.equal(await page.locator('#soc-product-evidence').count(),1,'product-evidence console missing');assert.equal(await page.locator('#soc-product-evidence form[data-product-evidence-start]').count(),0,'product-evidence start did not take effect');
   assert.equal(await page.locator('a[href="LICENSE"]').count()>0,true);
   await page.locator('#soc-topology').focus();await page.keyboard.press('End');assert.equal(await page.evaluate(()=>SCT.selected),'people');assert.equal(await page.evaluate(()=>document.activeElement.id),'soc-topology');
   assert.equal(await page.evaluate(()=>document.querySelector('#soc-console').scrollWidth<=innerWidth),true);
   const saved=await page.evaluate(()=>JSON.stringify(SCT.state));const downloadPromise=page.waitForEvent('download');await page.locator('[data-soc=export]').click();const download=await downloadPromise,exported=fs.readFileSync(await download.path(),'utf8');assert.deepEqual(JSON.parse(exported),JSON.parse(saved));
   const beforeImport=await page.evaluate(()=>SCT.seq);await page.locator('#soc-import').setInputFiles({name:'exercise.json',mimeType:'application/json',buffer:Buffer.from(exported)});await page.waitForFunction(before=>SCT.seq>before,beforeImport);assert.equal(await page.evaluate(()=>JSON.stringify(SCT.state)),saved);
   const second=await context.newPage();await second.goto(url);await second.locator('[data-provider-action=training]').click();await second.waitForFunction(()=>!!SCT.state);assert.equal(await second.evaluate(()=>SCT.locked),false);await second.close();
   await page.reload();await page.locator('[data-provider-action=training]').click();await page.waitForFunction(()=>SCT.locked);assert.equal(await page.evaluate(()=>JSON.stringify(SCT.state)),saved);
   await context.setOffline(true);await page.reload();await page.locator('[data-provider-action=training]').click();await page.waitForFunction(()=>SCT.locked);assert.equal(await page.evaluate(()=>JSON.stringify(SCT.state)),saved);
   assert.equal(await page.evaluate(()=>!!navigator.serviceWorker.controller),true);await context.setOffline(false);
   fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`training-${viewport.width}.png`),fullPage:true});assert.deepEqual(errors,[]);
   report.results.push({viewport,status:'passed',checks:['expanded-campaign-requirements-fit','configuration','worker','assessment','calling-workforce-estate-consoles','portfolio-market-products-lifecycle-consoles','transport-product-evidence-media-site-managed-shared-security-observation-consoles','responsive','save-reload','export-import','tab-lock','keyboard-topology','offline-reload']});await context.close();
  }
  // A temporary artifact is useful diagnostic evidence, but cannot satisfy the
  // release gate's receipt for the canonical _site artifact.
  report.status=site===path.join(root,'_site')?'passed':'diagnostic-passed';report.offline='passed';report.inputs=inputs();report.artifactDirectory=site;
 }catch(error){report.status=/EPERM|EACCES|Operation not permitted/.test(String(error))?'blocked':'failed';report.error=String(error.stack||error);process.exitCode=1;}
 finally{if(browser)await browser.close();if(server?.listening)await new Promise(resolve=>server.close(resolve));fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,stage:report.stage,offline:report.offline,error:report.error?.split('\n')[0]}));}
}
main();
