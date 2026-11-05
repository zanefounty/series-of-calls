/* Served-origin browser checks; launch/listen failures never count as browser evidence. */
const {chromium}=require('playwright-core');
const LESSONS=require('../src/game/23-training-lessons');
const {campaignJourney,verifyCheckpoint}=require('./lib/campaign-journey');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site=path.resolve(process.env.SOC_BROWSER_BUILD_DIR||path.join(root,'_site')),out=path.resolve(process.env.SOC_BROWSER_EVIDENCE_DIR||path.join(root,'evidence'));
const report={checkedAt:new Date().toISOString(),status:'running',offline:'not-run',results:[],scope:'Compiled Training map lesson through SMB assessment and renewal; explicit Lab configuration and domain consoles; keyboard, separate save/export/import, tab ownership, worker execution and offline reload at a project path. Full scenario matrix remains separate.'};
const SOURCE_FILES=['package.json','package-lock.json','scripts/browser-smoke.js','scripts/build.js','scripts/lib/page.js','scripts/lib/dict.js','scripts/lib/campaign-journey.js'];
function manifest(directory,folders=[],files=[]){
 const hashes={},errors=[],hash=relative=>{try{hashes[relative]=crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,relative))).digest('hex');}catch(error){hashes[relative]=null;errors.push({path:relative,operation:'read',code:error.code||error.name});}};
 const walk=relative=>{let entries;try{entries=fs.readdirSync(path.join(directory,relative),{withFileTypes:true});}catch(error){errors.push({path:relative,operation:'list',code:error.code||error.name});return;}for(const item of entries.sort((a,b)=>a.name.localeCompare(b.name))){const next=path.posix.join(relative,item.name);if(item.isDirectory())walk(next);else if(item.isFile())hash(next);else errors.push({path:next,operation:'inventory',code:'NOT_REGULAR_FILE'});}};
 for(const folder of folders)walk(folder);for(const file of files)hash(file);return {hashes:Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b))),errors};
}
function sourceInputs(directory=root){return manifest(directory,['src','site','content'],SOURCE_FILES);}
function inputDrift(before,after){return [...new Set([...Object.keys(before?.hashes||{}),...Object.keys(after?.hashes||{})])].sort().filter(file=>before?.hashes[file]!==after?.hashes[file]||after?.hashes[file]===null).map(file=>({file,before:before?.hashes[file]??null,after:after?.hashes[file]??null}));}
function smokeViewports(landscape=false){return [{width:1366,height:768},{width:1440,height:900},{width:390,height:844},...(landscape?[{width:844,height:390}]:[])];}
function finishInputEvidence(target,sourceAfter,artifactAfter,canonical){
 target.sourceAfter=sourceAfter;target.artifactAfter=artifactAfter;target.sourceDrift=inputDrift(target.sourceBefore,sourceAfter);target.artifactDrift=inputDrift(target.artifactBefore,artifactAfter);
 target.inputErrors=[...(target.sourceBefore?.errors||[]),...(sourceAfter?.errors||[]),...(target.artifactBefore?.errors||[]),...(artifactAfter?.errors||[])];
 target.inputs={...(target.sourceBefore?.hashes||{}),...(canonical?Object.fromEntries(Object.entries(target.artifactBefore?.hashes||{}).map(([file,hash])=>['_site/'+file,hash])):{})};
 target.noSourceDrift=!!target.sourceBefore&&!!target.artifactBefore&&!target.inputErrors.length&&!target.sourceDrift.length&&!target.artifactDrift.length;
 if(!target.noSourceDrift){if(!['failed','blocked'].includes(target.status))target.status='failed';target.error??='BROWSER_INPUT_DRIFT_OR_INCOMPLETE_MANIFEST';}
 return target;
}

function trainingSmokePlan(){return campaignJourney({scenario:'smb',jurisdiction:'AU',mode:'guided'});}
function trainingLessonAction(command,state){const id=LESSONS.findAction('defence',command,state);if(!id)throw new Error('NO_VISIBLE_TRAINING_LESSON_MAPPING:'+JSON.stringify(command));return {id,selector:`[data-training="lesson-action"][data-id="${id}"]`,alreadyConfigured:command.type==='configure'&&LESSONS.completed('defence',id,state)};}
async function trainingSettings(page,open){
 const sheet=page.locator('.soc-training-settings');
 if(await sheet.isVisible()!==open)await page.locator(`[data-training="${open?'open':'close'}-settings"]`).click();
 await sheet.waitFor({state:open?'visible':'hidden'});
}
async function closeTrainingInspector(page){const close=page.locator('[data-training="close-inspector"]');if(await close.isVisible())await close.click();}
function assertTrainingFirstScreen(observation){
 const {viewport,world,nodes}=observation,minHeight=Math.min(300,viewport.height-110);
 assert.ok(world&&world.visibleHeight>=minHeight,`TRAINING_WORLD_BELOW_FIRST_SCREEN:${JSON.stringify(observation)}`);
 assert.ok(world.visibleWidth>=Math.min(300,viewport.width-24),'TRAINING_WORLD_CLIPPED_HORIZONTALLY');
 assert.equal(observation.settingsOpen,false,'Training settings must be closed on the first screen');
 const primary=nodes.find(node=>node.fullyVisible&&node.hit);
 assert.ok(primary,`TRAINING_PRIMARY_NODE_NOT_REACHABLE_WITHOUT_SCROLL:${JSON.stringify(observation)}`);
 return {...observation,primaryNodeId:primary.id,minWorldHeight:minHeight};
}
async function trainingFirstScreen(page){
 const observation=await page.evaluate(()=>{
  const rect=element=>{if(!element)return null;const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visibleWidth:Math.max(0,Math.min(innerWidth,r.right)-Math.max(0,r.left)),visibleHeight:Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top))};};
  const nodes=[...document.querySelectorAll('.soc-training-node')].map(node=>{const r=rect(node),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {id:node.dataset.id,rect:r,fullyVisible:r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hit:!!hit&&(hit===node||node.contains(hit))};});
  return {viewport:{width:innerWidth,height:innerHeight},scroll:{x:scrollX,y:scrollY},world:rect(document.querySelector('.soc-training-world')),settingsOpen:!document.querySelector('.soc-training-settings')?.hidden,nodes};
 });return assertTrainingFirstScreen(observation);
}
async function exerciseTrainingMap(page){
 const firstScreen=await trainingFirstScreen(page);await trainingSettings(page,true);
 await page.locator('#soc-scenario').selectOption('smb');await page.locator('#soc-jurisdiction').selectOption('AU');await page.locator('#soc-mode').selectOption('guided');await page.locator('[data-soc="new"]').click();await page.waitForFunction(()=>SCT.locked&&!SCT.busy&&SCT.state.clock===0&&SCT.state.experience.kind==='training');
 await trainingSettings(page,false);const configuredScreen=await trainingFirstScreen(page);
 const checkpoints=[];
 for(const step of trainingSmokePlan().steps){
  const state=await page.evaluate(()=>JSON.parse(JSON.stringify(SCT.state)));
  if(step.checkpoint){checkpoints.push(verifyCheckpoint(state,step.checkpoint));continue;}
  const action=trainingLessonAction(step.command,state);if(action.alreadyConfigured)continue;
  assert.equal(await page.locator('#soc-config').count(),0,'Training must retain the map instead of authoring forms');assert.equal(await page.locator('#soc-training-map').count(),1);
  await closeTrainingInspector(page);const control=page.locator(action.selector);await control.waitFor({state:'visible'});assert.equal(await control.isEnabled(),true,action.id);await control.click();await page.waitForFunction(revision=>!SCT.busy&&SCT.state.revision>revision,state.revision);
  const result=await page.evaluate(()=>({error:SCT.error,experience:SCT.state.experience.kind,provider:!!SCT.state.providerCampaign}));assert.equal(result.error,'');assert.equal(result.experience,'training');assert.equal(result.provider,false);
 }
 assert.equal(checkpoints.length,10);assert.ok(checkpoints.every(x=>x.passed));assert.equal(await page.evaluate(()=>document.querySelector('#soc-console').scrollWidth<=innerWidth),true);
 const close=page.locator('[data-training="close-inspector"]');if(await close.isVisible())await close.click();const node=page.locator('[data-training="select"][data-id="people"]');await node.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>SCT.selected),'people');assert.equal(await page.locator('.soc-training-inspector').isVisible(),true,'keyboard map selection explicitly opens the inspector');
 return {experience:'training',firstScreen,configuredScreen,checkpoints};
}
async function verifyOwnedPersistence(page,context,url,experience){
 assert.ok(['training','lab'].includes(experience));assert.equal(await page.evaluate(()=>SCT.state.experience.kind),experience);
 if(experience==='training'){await closeTrainingInspector(page);await trainingSettings(page,true);}
 const saved=await page.evaluate(()=>JSON.stringify(SCT.state)),downloadPromise=page.waitForEvent('download');await page.locator('[data-soc=export]').click();const download=await downloadPromise,exported=fs.readFileSync(await download.path(),'utf8');assert.deepEqual(JSON.parse(exported),JSON.parse(saved));
 const beforeImport=await page.evaluate(()=>SCT.seq);await page.locator('#soc-import').setInputFiles({name:'exercise.json',mimeType:'application/json',buffer:Buffer.from(exported)});await page.waitForFunction(before=>SCT.seq>before,beforeImport);assert.equal(await page.evaluate(()=>JSON.stringify(SCT.state)),saved);
 if(experience==='training')await trainingSettings(page,false);
 const launch=`.provider-launch-actions [data-provider-action="${experience}"]`,second=await context.newPage();await second.goto(url);await second.locator(launch).click();await second.waitForFunction(()=>!!SCT.state);assert.equal(await second.evaluate(()=>SCT.locked),false);assert.equal(await second.evaluate(()=>SCT.state.experience.kind),experience);await second.close();
 await page.reload();await page.locator(launch).click();await page.waitForFunction(()=>SCT.locked);assert.equal(await page.evaluate(()=>JSON.stringify(SCT.state)),saved);
 await context.setOffline(true);await page.reload();await page.locator(launch).click();await page.waitForFunction(()=>SCT.locked);assert.equal(await page.evaluate(()=>JSON.stringify(SCT.state)),saved);assert.equal(await page.evaluate(()=>!!navigator.serviceWorker.controller),true);await context.setOffline(false);
 return {experience,clock:JSON.parse(saved).clock,revision:JSON.parse(saved).revision,exactSave:true,tabLock:true,offline:true};
}

async function main(){
 let browser,server;
 try{
  report.stage='inputs-before';report.sourceBefore=sourceInputs();if(report.sourceBefore.errors.length)throw new Error('INITIAL_BROWSER_INPUT_MANIFEST_INCOMPLETE');
  report.stage='build';require('./build').build({out:site});report.artifactBefore=manifest(site,['']);if(report.artifactBefore.errors.length)throw new Error('BUILT_BROWSER_ARTIFACT_MANIFEST_INCOMPLETE');report.stage='listen';
  server=http.createServer(require('./serve').handler(site));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url=`http://127.0.0.1:${server.address().port}/series-of-calls/`;report.stage='launch';
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});report.browser=browser.version();
  for(const viewport of smokeViewports(process.env.SOC_BROWSER_LANDSCAPE==='1')){
   report.stage='viewport-'+viewport.width;const context=await browser.newContext({viewport,acceptDownloads:true}),errors=[];
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
   await page.locator('.provider-launch-actions [data-provider-action=training]').click();await page.waitForFunction(()=>SCT.locked);
   const training=await exerciseTrainingMap(page),trainingPersistence=await verifyOwnedPersistence(page,context,url,'training');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`training-${viewport.width}.png`),fullPage:true});
   await page.locator('[data-soc=provider-home]').click();await page.locator('.provider-launch-actions [data-provider-action=lab]').click();await page.waitForFunction(()=>SCT.locked&&SCT.state.experience.kind==='lab');
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
   const labPersistence=await verifyOwnedPersistence(page,context,url,'lab');
   fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`lab-${viewport.width}.png`),fullPage:true});assert.deepEqual(errors,[]);
   report.results.push({viewport,status:'passed',training,trainingPersistence,labPersistence,checks:['training-first-screen-world-and-reachable-node','training-explicit-settings-sheet','training-map-lesson-actions','training-smb-ten-checkpoints','training-keyboard-map','separate-training-lab-persistence','expanded-campaign-requirements-fit','configuration','worker','assessment','calling-workforce-estate-consoles','portfolio-market-products-lifecycle-consoles','transport-product-evidence-media-site-managed-shared-security-observation-consoles','responsive','save-reload','export-import','tab-lock','keyboard-topology','offline-reload']});await context.close();
  }
  // A temporary artifact is useful diagnostic evidence, but cannot satisfy the
  // release gate's receipt for the canonical _site artifact.
  report.status=site===path.join(root,'_site')?'passed':'diagnostic-passed';report.offline='passed';report.artifactDirectory=site;
 }catch(error){report.status=/EPERM|EACCES|Operation not permitted/.test(String(error))?'blocked':'failed';report.error=String(error.stack||error);process.exitCode=1;}
 finally{if(browser)await browser.close();if(server?.listening)await new Promise(resolve=>server.close(resolve));finishInputEvidence(report,sourceInputs(),manifest(site,['']),site===path.join(root,'_site'));if(!['passed','diagnostic-passed'].includes(report.status))process.exitCode=1;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,stage:report.stage,offline:report.offline,noSourceDrift:report.noSourceDrift,error:report.error?.split('\n')[0]}));}
}
if(require.main===module)main();
module.exports={trainingSettings,closeTrainingInspector,assertTrainingFirstScreen,trainingFirstScreen,manifest,sourceInputs,inputDrift,smokeViewports,finishInputEvidence,trainingSmokePlan,trainingLessonAction,exerciseTrainingMap,verifyOwnedPersistence,main};
