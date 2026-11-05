#!/usr/bin/env node
/* Bounded real-browser UI coverage of the compact scenario reference paths. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const SOC=require('../src/game/55-communications');
const LESSONS=require('../src/game/23-training-lessons');
const {campaignJourney,verifyCheckpoint}=require('./lib/campaign-journey');
const {campaignUiAction}=require('./lib/campaign-ui');
const ROOT=path.resolve(__dirname,'..'),VIEWPORTS=[{id:'desktop',width:1440,height:1000},{id:'mobile',width:390,height:844},{id:'landscape',width:844,height:390}];
const SCENARIOS=Object.keys(SOC.scenarios),JURISDICTIONS=[...SOC.jurisdictions],MODES=['guided','assessed','sandbox'];
const SCOPE='Compact SOC.reference journeys assessed through visible controls at all scenario, jurisdiction, mode and viewport combinations; each case includes a permitted service interruption whose assessment fails and a repaired journey whose assessment passes. Guided/assessed use map controls; sandbox explicitly uses Lab fault/authoring controls. This does not run the four-window campaign or prove full campaign acceptance.';
const CAMPAIGN_SCOPE='Visible-UI four-window campaign journeys, including prerequisite tracks, all track-required offer orders, delayed activation, incident recovery, three billing periods and renewal. This exercises the current campaign implementation; it does not establish completion of every source-specific product obligation.';
function matrix(){return SCENARIOS.flatMap(scenario=>JURISDICTIONS.flatMap(jurisdiction=>MODES.map(mode=>({scenario,jurisdiction,mode}))));}
function profileExperience(profile){return profile.mode==='sandbox'?'lab':'training';}
function referenceUiAction(command,experience='lab'){
 if(!['training','lab'].includes(experience))throw new Error('REFERENCE_EXPERIENCE_REQUIRED');
 if(experience==='training'){
  if(command?.type==='configure')return {kind:'map-resource',select:`[data-training="select"][data-id="${command.id}"]`,selector:`[data-training="guided-setting"][data-id="${command.id}"]`,fields:command.config};
  if(command?.type==='advance')return {kind:'clock-buttons',buttons:['[data-training="five"]','[data-training="minute"]'],minutes:command.minutes};
  if(command?.type==='interact')return {kind:'map-interaction',selector:'[data-training="interaction"]',channel:command.channel,caseId:'training-map-case'};
  if(command?.type==='meeting'||command?.type==='connect')return {kind:'button',selector:`[data-training="${command.type}"]`};
  throw new Error(`NO_VISIBLE_TRAINING_MAPPING:${command?.type||'invalid'}`);
 }
 if(command?.type==='configure')return {kind:'resource-form',select:`[data-soc="select"][data-id="${command.id}"]`,form:'#soc-config',fields:command.config};
 if(command?.type==='advance')return {kind:'clock-buttons',buttons:['[data-soc="five"]','[data-soc="minute"]'],minutes:command.minutes};
 if(command?.type==='interact')return {kind:'interaction-form',form:'#soc-journey-controls form',fields:{channel:command.channel,from:command.from,to:command.to,caseId:command.caseId}};
 if(command?.type==='meeting')return {kind:'button',selector:'[data-soc="meeting"]'};
 if(command?.type==='connect')return {kind:'button',selector:'[data-soc="connect"]'};
 throw new Error(`NO_VISIBLE_REFERENCE_MAPPING:${command?.type||'invalid'}`);
}
function mappedReference(s){return SOC.reference(s).map(command=>({command,ui:referenceUiAction(command,s.experience.kind)}));}
function advanceButtonPlan(minutes){if(!Number.isSafeInteger(minutes)||minutes<1||minutes>1440)throw new Error('INVALID_ADVANCE_MINUTES');return {five:Math.floor(minutes/5),minute:minutes%5};}
function caseMatrix(profiles=matrix()){return profiles.flatMap(profile=>VIEWPORTS.map(viewport=>({profile,viewport,key:`${profile.scenario}-${profile.jurisdiction.toLowerCase()}-${profile.mode}-${viewport.id}`})));}
function parseShard(value){const m=/^([1-9][0-9]*)\/([1-9][0-9]*)$/.exec(value||'');if(!m)throw new Error('SHARD_MUST_BE_INDEX_COUNT');const index=Number(m[1]),count=Number(m[2]);if(!Number.isSafeInteger(index)||!Number.isSafeInteger(count)||count>144||index>count)throw new Error('SHARD_MUST_BE_INDEX_COUNT');return {index,count};}
function shardCases(cases,shard){if(!shard)return cases;if(!Number.isInteger(shard.index)||!Number.isInteger(shard.count)||shard.index<1||shard.index>shard.count||shard.count>144)throw new Error('SHARD_MUST_BE_INDEX_COUNT');return cases.filter((_,index)=>index%shard.count===shard.index-1);}
function classifyReport(report){
 if(report.status==='blocked')return 'blocked';if(report.status==='failed'||report.sourceDrift?.length||report.errors?.length)return 'failed';
 let cases;try{cases=shardCases(caseMatrix(matrix().slice(0,report.profileCount)),report.shard);}catch{return 'failed';}
 const executed=cases.length>0&&report.results?.length===cases.length&&report.results.every((row,index)=>row.status==='passed'&&!row.errors?.length&&(!report.plannedCaseKeys||row.key===cases[index].key));
 if(!executed)return 'failed';
 if(report.plannedCaseKeys&&JSON.stringify(report.plannedCaseKeys)!==JSON.stringify(cases.map(c=>c.key)))return 'failed';
 if(report.profileCount!==48||report.browser?.playwright!==report.browser?.playwrightLockfile||report.versions?.source!==report.versions?.lockfile||!report.browser?.version)return 'diagnostic';
 return report.shard?'shard-passed':'passed';
}
function parseArgs(argv){
 const out={list:false,browser:process.env.SOC_BROWSER_ENGINE||'chromium',limit:48};
 for(let i=0;i<argv.length;i++){const arg=argv[i];if(arg==='--list')out.list=true;else if(arg==='--journey')out.journey=argv[++i];else if(arg.startsWith('--journey='))out.journey=arg.slice(10);else if(arg==='--browser')out.browser=argv[++i];else if(arg.startsWith('--browser='))out.browser=arg.slice(10);else if(arg==='--shard')out.shard=parseShard(argv[++i]);else if(arg.startsWith('--shard='))out.shard=parseShard(arg.slice(8));else if(arg==='--limit')out.limit=Number(argv[++i]);else if(arg.startsWith('--limit='))out.limit=Number(arg.slice(8));else if(arg==='--help'||arg==='-h')out.help=true;else throw new Error(`UNKNOWN_ARGUMENT:${arg}`);}
 if(out.journey!==undefined&&!['compact','campaign'].includes(out.journey))throw new Error('JOURNEY_MUST_BE_COMPACT_OR_CAMPAIGN');
 if(!['chromium','firefox','webkit'].includes(out.browser))throw new Error('BROWSER_MUST_BE_CHROMIUM_FIREFOX_OR_WEBKIT');
 if(!Number.isInteger(out.limit)||out.limit<1||out.limit>48)throw new Error('LIMIT_MUST_BE_1_TO_48');
 return out;
}
function sha(value){return crypto.createHash('sha256').update(value).digest('hex');}
function fileHash(file){return sha(fs.readFileSync(file));}
function treeManifest(directory){const rows=[];const walk=dir=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,ent.name);if(ent.isDirectory())walk(file);else rows.push([path.relative(directory,file).split(path.sep).join('/'),fileHash(file)]);}};walk(directory);return {files:rows.length,sha256:sha(JSON.stringify(rows)),manifest:rows};}
function sourceManifest(){const files=['package.json','package-lock.json','scripts/browser-campaigns.js','scripts/aggregate-browser-campaigns.js','scripts/lib/campaign-journey.js','scripts/lib/campaign-ui.js','scripts/build.js','scripts/serve.js','scripts/lib/page.js','scripts/lib/dict.js'];for(const base of ['src','site','content']){const walk=dir=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,ent.name);if(ent.isDirectory())walk(file);else files.push(path.relative(ROOT,file).split(path.sep).join('/'));}};walk(path.join(ROOT,base));}return Object.fromEntries([...new Set(files)].sort().map(rel=>[rel,fileHash(path.join(ROOT,rel))]));}
function inputDrift(initial,final){return [...new Set([...Object.keys(initial||{}),...Object.keys(final||{})])].sort().filter(file=>initial[file]!==final[file]).map(file=>({file,before:initial[file]||null,after:final[file]||null}));}
function runId(){return new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');}
async function withinBudget(promise,ms){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`CASE_RUNTIME_LIMIT:${ms}`)),ms);})]);}finally{clearTimeout(timer);}}
function packageVersion(name){try{return require(`${name}/package.json`).version;}catch{return null;}}
function pageIsIdle(){return typeof SCT!=='undefined'&&!SCT.busy;}
function pageRevisionPast(oldRevision){return typeof SCT!=='undefined'&&SCT.state?.revision>oldRevision;}
async function waitIdle(page){await page.waitForFunction(pageIsIdle,null,{timeout:15000});}
async function waitRevision(page,oldRevision){await page.waitForFunction(pageRevisionPast,oldRevision,{timeout:15000});await waitIdle(page);}
async function clickCommand(page,selector){const rev=await page.evaluate(()=>SCT.state.revision);await page.locator(selector).click({timeout:10000});await waitRevision(page,rev);}
async function fillVisibleField(form,field,value){const control=form.locator(`[name="${field}"]`);await control.waitFor({state:'visible',timeout:10000});const kind=await control.evaluate(el=>({tag:el.tagName.toLowerCase(),type:el.type}));if(kind.type==='checkbox')await control.setChecked(Boolean(value));else if(kind.tag==='select')await control.selectOption(String(value));else await control.fill(Array.isArray(value)?JSON.stringify(value):String(value));}
async function prepareJourneySubmit(form,fields){
 const lastField=Object.keys(fields).at(-1);if(!lastField)throw new Error('JOURNEY_FORM_FIELDS_REQUIRED');
 const control=form.locator(`[name="${lastField}"]`);
 // Commit the final typed value and dismiss browser-native suggestion UI before the pointer click.
 await control.press('Escape',{timeout:10000});await control.press('Tab',{timeout:10000});
 const submit=form.locator('button[type="submit"]');await submit.waitFor({state:'visible',timeout:10000});
 if(!await submit.isEnabled())throw new Error('JOURNEY_FORM_SUBMIT_DISABLED');
 return submit;
}
async function runReferenceCommand(page,command){
 const experience=await page.evaluate(()=>SCT.state.experience.kind),ui=referenceUiAction(command,experience);
 if(experience==='training')await openTrainingInspector(page);
 if(ui.kind==='map-resource'){
  await selectTrainingResource(page,command.id);
  const suggestion=await page.evaluate(command=>SOC.reference(SCT.state).filter(c=>c.type==='configure'&&c.id===command.id).findIndex(c=>JSON.stringify(c.config)===JSON.stringify(command.config)),command);
  if(suggestion<0)throw new Error('TRAINING_REFERENCE_SETTING_UNAVAILABLE:'+command.id);
  await clickCommand(page,`${ui.selector}[data-suggestion="${suggestion}"]`);return;
 }
 if(ui.kind==='map-interaction'){
  const channel=await page.evaluate(()=>SOC.scenarios[SCT.state.scenario].channel);if(channel!==command.channel)throw new Error('TRAINING_REFERENCE_CHANNEL_UNAVAILABLE:'+command.channel);
  await clickCommand(page,ui.selector);return;
 }
 if(ui.kind==='resource-form'){
  await page.locator(ui.select).click();const form=page.locator(ui.form);for(const [field,value] of Object.entries(ui.fields))await fillVisibleField(form,field,value);await clickCommand(page,`${ui.form} button[type="submit"]`);
 }else if(ui.kind==='clock-buttons'){
  let minutes=ui.minutes;while(experience==='lab'&&minutes>=60&&await page.locator('[data-biz="period"]').count()){await clickCommand(page,'[data-biz="period"]');minutes-=60;}if(minutes){const plan=advanceButtonPlan(minutes);for(let n=0;n<plan.five;n++)await clickCommand(page,ui.buttons[0]);for(let n=0;n<plan.minute;n++)await clickCommand(page,ui.buttons[1]);}
 }else if(ui.kind==='interaction-form'){
  const form=page.locator(ui.form);for(const [field,value] of Object.entries(ui.fields))await fillVisibleField(form,field,value);await prepareJourneySubmit(form,ui.fields);await clickCommand(page,`${ui.form} button[type="submit"]`);
 }else await clickCommand(page,ui.selector);
}
async function openTrainingInspector(page){
 if(!await page.locator('.soc-training-inspector').isVisible())await page.locator('[data-training="open-inspector"]').click();
 await page.locator('.soc-training-inspector').waitFor({state:'visible'});
}
async function selectTrainingResource(page,id){
 const close=page.locator('[data-training="close-inspector"]');if(await close.isVisible())await close.click();
 await page.locator(`[data-training="select"][data-id="${id}"]`).click();await openTrainingInspector(page);
}
async function setProfile(page,profile){
 await page.locator('#soc-scenario').selectOption(profile.scenario);await page.locator('#soc-jurisdiction').selectOption(profile.jurisdiction);await page.locator('#soc-mode').selectOption(profile.mode);
 const revision=await page.evaluate(()=>SCT.state.revision);await page.locator('[data-soc="new"]').click();await page.waitForFunction(p=>SCT.state.scenario===p.scenario&&SCT.state.jurisdiction===p.jurisdiction&&SCT.state.mode===p.mode&&SCT.state.clock===0,profile,{timeout:10000});await waitIdle(page);const experience=await page.evaluate(()=>SCT.state.experience.kind);if(experience!==profileExperience(profile))throw new Error('PROFILE_EXPERIENCE_MISMATCH:'+experience);return revision;
}
async function enterInteraction(page,channel,caseId){if(await page.evaluate(()=>SCT.state.experience.kind==='training')){await openTrainingInspector(page);if(await page.evaluate(()=>SOC.scenarios[SCT.state.scenario].channel)!==channel)throw new Error('TRAINING_CHANNEL_NOT_PERMITTED');await clickCommand(page,'[data-training="interaction"]');return;}const form=page.locator('#soc-journey-controls form'),fields={channel,from:'alex',to:'+61255500201',caseId};for(const [field,value] of Object.entries(fields))await fillVisibleField(form,field,value);await prepareJourneySubmit(form,fields);await clickCommand(page,'#soc-journey-controls form button[type="submit"]');}
async function phase(page){return page.evaluate(()=>SCT.state.interactions.at(-1)?.phase||null);}
async function assessment(page){return page.evaluate(()=>SOC.assess(SCT.state));}
async function exerciseProfile(page,profile){
 await setProfile(page,profile);
 const refs=await page.evaluate(()=>SOC.reference(SCT.state));for(const command of refs)await runReferenceCommand(page,command);
 const referencePhase=await phase(page),referenceAssessment=await assessment(page);if(referencePhase!=='resolved'||!referenceAssessment.passed)throw new Error(`REFERENCE_ASSESSMENT_FAILED:${profile.scenario}:${referencePhase}:${referenceAssessment.missing.join(',')}`);
 const channel=SOC.scenarios[profile.scenario].channel,resource=channel==='message'?'messages':'phone',experience=profileExperience(profile);
 const interruption=async()=>{if(experience==='training'){await selectTrainingResource(page,resource);await clickCommand(page,`[data-training="toggle-enabled"][data-id="${resource}"]`);await clickCommand(page,'[data-training="minute"]');}else{await page.locator(`[data-soc="select"][data-id="${resource}"]`).click();await clickCommand(page,'[data-soc="fault"]');}};
 await interruption();
 const failureCase=`browser-failure-${profile.scenario}-${profile.jurisdiction.toLowerCase()}-${profile.mode}`;await enterInteraction(page,channel,failureCase);for(let n=0;n<3;n++)await runReferenceCommand(page,{type:'advance',minutes:5});
 const failurePhase=await phase(page),failureAssessment=await assessment(page);if(failurePhase==='resolved'||failureAssessment.passed||failureAssessment.checks.resolved)throw new Error(`OUTAGE_DID_NOT_STOP_ASSESSMENT:${profile.scenario}`);
 await interruption();
 const recoveryCase=`browser-recovery-${profile.scenario}-${profile.jurisdiction.toLowerCase()}-${profile.mode}`;await enterInteraction(page,channel,recoveryCase);await runReferenceCommand(page,{type:'advance',minutes:5});if(experience==='training')await runReferenceCommand(page,{type:'meeting'});
 const recoveryPhase=await phase(page),recoveryAssessment=await assessment(page);if(recoveryPhase!=='resolved'||!recoveryAssessment.passed)throw new Error(`RECOVERY_ASSESSMENT_FAILED:${profile.scenario}:${recoveryPhase}:${recoveryAssessment.missing.join(',')}`);
 return {referencePhase,referenceAssessment,failurePhase,failureAssessment,recoveryPhase,recoveryAssessment,referenceCommands:refs.length,failureResource:resource,experience,failureKind:experience==='training'?'permitted-disabled-service':'lab-outage-fault'};
}
async function exerciseCampaign(page,profile){
 await setProfile(page,{...profile,scenario:'smb'});
 const recipe=campaignJourney(profile),checkpoints=[];
 for(const step of recipe.steps){
  if(step.checkpoint){
   const observed=await page.evaluate(()=>JSON.parse(JSON.stringify(SCT.state)));
   checkpoints.push(verifyCheckpoint(observed,step.checkpoint));continue;
  }
  if(profileExperience(profile)==='training'){
   const observed=await page.evaluate(()=>JSON.parse(JSON.stringify(SCT.state))),actionId=LESSONS.findAction('defence',step.command,observed);
   if(!actionId)throw new Error('NO_VISIBLE_TRAINING_LESSON_MAPPING:'+JSON.stringify(step.command));
   if(step.command.type==='configure'&&LESSONS.completed('defence',actionId,observed))continue;
   const control=page.locator(`[data-training="lesson-action"][data-id="${actionId}"]`);await control.waitFor({state:'visible'});if(!await control.isEnabled())throw new Error('TRAINING_LESSON_CONTROL_DISABLED:'+actionId);
   await clickCommand(page,`[data-training="lesson-action"][data-id="${actionId}"]`);
   if(!await page.locator('#soc-training-map').count())throw new Error('TRAINING_MAP_DISAPPEARED');
   const state=await page.evaluate(()=>({error:SCT.error,experience:SCT.state.experience.kind,provider:!!SCT.state.providerCampaign}));if(state.error||state.experience!=='training'||state.provider)throw new Error('TRAINING_LESSON_BOUNDARY_FAILED:'+JSON.stringify(state));continue;
  }
  const clock=await page.evaluate(()=>SCT.state.clock),ui=campaignUiAction(step.command,clock);
  if(!ui){await runReferenceCommand(page,step.command);continue;}
  if(ui.kind==='button'){await clickCommand(page,ui.selector);continue;}
  const form=page.locator(ui.form);for(const [name,value] of Object.entries(ui.fields))await fillVisibleField(form,name,value);if(ui.form==='#soc-journey-controls form')await prepareJourneySubmit(form,ui.fields);
  await clickCommand(page,`${ui.form} button[type="submit"]`);
 }
 return {scope:CAMPAIGN_SCOPE,experience:profileExperience(profile),tracks:recipe.tracks.map(t=>t.track),commands:recipe.steps.filter(s=>s.command).length,checkpoints};
}
function outputDirectory(id){return path.resolve(process.env.SOC_BROWSER_CAMPAIGN_EVIDENCE_DIR||path.join(ROOT,'evidence','browser-campaigns'),id);}
function maxRuntime(){const value=Number(process.env.SOC_BROWSER_CAMPAIGN_MAX_MS||1200000);return Number.isFinite(value)?Math.max(60000,Math.min(1800000,value)):1200000;}
async function main(argv=process.argv.slice(2)){
 let args;try{args=parseArgs(argv);}catch(error){console.error(error.message);process.exitCode=2;return;}
 if(args.help){console.log('Usage: node scripts/browser-campaigns.js [--list] [--journey compact|campaign] [--browser chromium|firefox|webkit] [--limit 1..48] [--shard index/count]');return;}
 const scope=args.journey==='campaign'?CAMPAIGN_SCOPE:SCOPE;
 const profiles=matrix().slice(0,args.limit),cases=shardCases(caseMatrix(profiles),args.shard);if(!cases.length){console.error('EMPTY_SHARD');process.exitCode=2;return;}if(args.list){console.log(JSON.stringify({scope,profiles:profiles.length,viewports:VIEWPORTS,matrix:profiles,shard:args.shard||null,cases:cases.map(c=>c.key)},null,2));return;}
 const id=runId(),out=outputDirectory(id),started=Date.now(),timeout=maxRuntime(),buildDir=path.join(os.tmpdir(),'soc-browser-campaigns',id,'site');
 const lockfile=JSON.parse(fs.readFileSync(path.join(ROOT,'package-lock.json'),'utf8')),appPackage=require('../package.json'),initialInputs=sourceManifest(),report={id,checkedAt:new Date().toISOString(),status:'running',scope,journey:args.journey||'compact',profileCount:profiles.length,partial:profiles.length!==48||!!args.shard,shard:args.shard||null,plannedCaseKeys:cases.map(c=>c.key),caseRuntimeLimitMs:args.journey==='campaign'?240000:60000,profileMatrix:profiles,viewports:VIEWPORTS,versions:{source:appPackage.version,lockfile:lockfile.packages?.['']?.version||null},browser:{engine:args.browser,version:null,playwright:packageVersion('playwright-core'),playwrightLockfile:lockfile.packages?.['node_modules/playwright-core']?.version||null},node:process.version,lockfileSha256:fileHash(path.join(ROOT,'package-lock.json')),inputs:initialInputs,inputSha256:sha(JSON.stringify(initialInputs)),results:[],errors:[],stage:'initialise',maxRuntimeMs:timeout};
 let browser,server;
 try{
  report.stage='build';require('./build').build({out:buildDir});const artifact=treeManifest(buildDir);fs.mkdirSync(out,{recursive:true});const artifactManifestPath=path.join(out,'artifact-manifest.json');fs.writeFileSync(artifactManifestPath,JSON.stringify({artifactDirectory:buildDir,files:artifact.manifest},null,2)+'\n');report.artifact={directory:buildDir,version:require('../package.json').version,files:artifact.files,sha256:artifact.sha256,manifestPath:artifactManifestPath,manifestSha256:fileHash(artifactManifestPath)};
  report.stage='listen';server=http.createServer(require('./serve').handler(buildDir));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  let playwright;try{playwright=require('playwright-core');}catch{throw new Error('PLAYWRIGHT_CORE_MISSING: install the lockfile dependencies before a real browser run.');}
  const browserType=playwright[args.browser],bin=process.env.SOC_BROWSER_PATH;report.stage='launch';browser=await browserType.launch({headless:true,...(bin?{executablePath:bin}:{}),...(args.browser==='chromium'?{args:['--no-sandbox']}: {})});report.browser.version=browser.version();
  for(const {profile,viewport,key} of cases){
   if(Date.now()-started>timeout){report.status='failed';report.errors.push({stage:'runtime-budget',message:`MAX_RUNTIME_EXCEEDED:${timeout}`});break;}
   const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}}),row={profile,experience:profileExperience(profile),viewport,status:'running',key,errors:[]};let page;
   const trace=path.join(out,`${key}.trace.zip`),shot=path.join(out,`${key}.png`);fs.mkdirSync(out,{recursive:true});
   try{
    const caseBudget=Math.max(1000,Math.min(args.journey==='campaign'?240000:60000,timeout-(Date.now()-started)));await withinBudget((async()=>{
     await context.tracing.start({screenshots:true,snapshots:true,sources:true});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>row.errors.push(`pageerror:${error.message}`));page.on('console',message=>{if(message.type()==='error')row.errors.push(`console:${message.text()}`);});
     await page.goto(`http://127.0.0.1:${server.address().port}/series-of-calls/`,{waitUntil:'domcontentloaded',timeout:15000});
     await page.locator(`.provider-launch-actions [data-provider-action="${profileExperience(profile)}"]`).click({timeout:10000});await page.waitForFunction(()=>SCT.locked&&document.querySelector('#soc-console:not([hidden])'),null,{timeout:15000});
     row.outcomes=await (args.journey==='campaign'?exerciseCampaign:exerciseProfile)(page,profile);row.status='passed';
    })(),caseBudget);
   }catch(error){row.status='failed';row.error=String(error.stack||error);row.errors.push(String(error.message||error));}
   finally{
    if(page)try{await page.screenshot({path:shot,fullPage:true,timeout:10000});row.screenshot=shot;}catch(error){row.errors.push(`screenshot:${error.message}`);}
    try{await context.tracing.stop({path:trace});row.trace=trace;}catch(error){row.errors.push(`trace:${error.message}`);}
    row.consoleErrors=[...row.errors];if(row.status==='passed'&&row.errors.length)row.status='failed';report.results.push(row);await context.close();
   }
  }
  if(report.status==='running')report.status=classifyReport(report);
 }catch(error){const message=String(error.stack||error);report.error=message;report.status=/EPERM|EACCES|Operation not permitted|PLAYWRIGHT_CORE_MISSING|Cannot find module 'playwright-core'|Executable doesn't exist|browserType\.launch:.*not found/i.test(message)?'blocked':'failed';report.errors.push({stage:report.stage,message:message.split('\n')[0]});}
 finally{
  if(browser)await browser.close();if(server?.listening)await new Promise(resolve=>server.close(resolve));
  report.finishedAt=new Date().toISOString();report.elapsedMs=Date.now()-started;
  try{report.sourceDrift=inputDrift(initialInputs,sourceManifest());if(report.sourceDrift.length&&report.status!=='blocked')report.status='failed';report.status=classifyReport(report);fs.mkdirSync(out,{recursive:true});report.artifactDirectory=out;report.reportPath=path.join(out,'browser-campaigns.json');fs.writeFileSync(report.reportPath,JSON.stringify(report,null,2)+'\n');}catch(error){report.errors.push({stage:'report',message:error.message});report.status='failed';}
  console.log(JSON.stringify({status:report.status,stage:report.stage,browser:report.browser,profiles:profiles.length,viewports:VIEWPORTS.length,results:report.results.length,report:report.reportPath,error:report.error?.split('\n')[0]}));
  if(!['passed','shard-passed'].includes(report.status))process.exitCode=1;
 }
}
if(require.main===module)main();
module.exports={profileExperience,caseMatrix,parseShard,shardCases,sourceManifest,SCENARIOS,JURISDICTIONS,MODES,VIEWPORTS,SCOPE,matrix,referenceUiAction,mappedReference,advanceButtonPlan,classifyReport,pageIsIdle,pageRevisionPast,inputDrift,prepareJourneySubmit,parseArgs,main};
