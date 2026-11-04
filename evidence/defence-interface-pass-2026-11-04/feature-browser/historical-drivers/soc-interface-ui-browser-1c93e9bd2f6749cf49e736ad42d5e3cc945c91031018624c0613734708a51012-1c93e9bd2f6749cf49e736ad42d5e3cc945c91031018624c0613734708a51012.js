 'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root='/work',SOC=require(root+'/src/game/55-communications'),{journey}=require(root+'/tests/lib/information-interface-fixture'),{sourceManifest,inputDrift}=require(root+'/scripts/browser-campaigns');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),id=new Date().toISOString().replace(/[:.]/g,'-'),out='/out/'+id;fs.mkdirSync(out,{recursive:true});
const manifest=()=>({...sourceManifest(),'tests/lib/information-interface-fixture.js':sha(fs.readFileSync(root+'/tests/lib/information-interface-fixture.js'))});
const report={scope:'Bounded visible-UI defence information interface journeys; archive creation, boundary contracts, actual meeting capture, delayed provisioning and classification control. Diagnostic feature evidence, not full app or release acceptance.',status:'running',startedAt:new Date().toISOString(),inputs:manifest(),driverSha256:sha(fs.readFileSync(__filename)),results:[],errors:[],mode:process.env.SOC_INTERFACE_MODE||'prototype',caseLimitMs:180000,totalLimitMs:1200000,versions:{node:process.version,playwright:require(root+'/node_modules/playwright-core/package.json').version}};
const variants=[{name:'restricted-handover',administration:false,restrictedCapture:true},{name:'restricted-export-blocked',administration:true,restrictedCapture:true},{name:'internal-training',administration:true,restrictedCapture:false}];
const cases=['AU','US','JP','EU'].flatMap(jurisdiction=>[{id:'desktop',width:1440,height:1000},{id:'mobile',width:390,height:844}].flatMap(viewport=>variants.map(v=>({...v,jurisdiction,viewport})))).filter(c=>!process.env.SOC_INTERFACE_ONLY||c.jurisdiction+'-'+c.viewport.id+'-'+c.name===process.env.SOC_INTERFACE_ONLY).slice(0,Number(process.env.SOC_INTERFACE_LIMIT||24));
assert.ok(cases.length,'NO_BROWSER_CASES_SELECTED');report.plannedCases=cases.map(c=>c.jurisdiction+'-'+c.viewport.id+'-'+c.name);
let browser,server;const started=Date.now();
async function fill(form,name,value,csv=false){const c=form.locator(`[name="${name}"]`);await c.waitFor({state:'visible'});const kind=await c.evaluate(e=>({tag:e.tagName,type:e.type}));if(kind.type==='checkbox')await c.setChecked(!!value);else if(kind.tag==='SELECT')await c.selectOption(String(value??''));else await c.fill(Array.isArray(value)?(csv?value.join(', '):JSON.stringify(value)):String(value??''));}
async function click(page,selector){const rev=await page.evaluate(()=>SCT.state.revision);await page.locator(selector).click();await page.waitForFunction(rev=>SCT.state.revision>rev&&!SCT.busy,rev,{timeout:15000});const error=await page.evaluate(()=>SCT.error);if(error)throw new Error('UI_ERROR:'+error);}
async function submit(page,selector,fields,csv=false){const f=page.locator(selector);for(const [name,value] of Object.entries(fields))await fill(f,name,value,csv);await click(page,selector+' button[type="submit"]');}
async function execute(page,c){
 if(c.type==='configure'){await page.locator(`[data-soc="select"][data-id="${c.id}"]`).click();return submit(page,'#soc-config',c.config);}
 if(c.type==='advance'){for(let n=0;n<c.minutes;n++)await click(page,'[data-soc="minute"]');return;}
 if(c.type==='add'){assert.equal(c.kind,'archive');const {enabled,...fields}=c.config;assert.notEqual(enabled,false);return submit(page,'#soc-information-archive',{id:c.id,...fields},true);}
 const q=c.command;
 if(c.type==='information'){
  if(q.action==='start')return click(page,'[data-info="start"]');
  if(q.action==='configure')return submit(page,`[data-info-config="${q.kind}"]`,q.config);
  if(q.action==='interface'){const {action,...fields}=q;return submit(page,'#soc-information-interface',fields);}
  if(q.action==='transfer'){const {action,...fields}=q;return submit(page,'#soc-information-transfer',fields);}
  if(q.action==='book'){const clock=await page.evaluate(()=>SCT.state.clock);return submit(page,'#soc-information-book',{delay:q.start-clock,duration:q.end-q.start,attendees:q.attendees,event:q.event,language:q.language});}
  if(q.action==='join')return click(page,`[data-info="join"][data-id="${q.booking}"]`);
 }
 if(c.type==='boundaries'){
  if(q.action==='start')return click(page,'[data-domain-start="boundaries"] button');
  if(q.action==='bind')return submit(page,'[data-domain-form="contract-bind"]',{resource:q.resource,contract:q.contract});
  if(q.action==='observe')return submit(page,'[data-domain-form="contract-observe"]',{contract:q.contract,...q.observed});
  if(q.action==='contract'){
   const f=page.locator('[data-domain-form="contract"]'),{requirements,flows,...fields}=q.contract;
   for(const [name,value] of Object.entries(fields))await fill(f,name,value);
   for(const key of ['processingRegions','storageRegions','backupRegions','keyRegions','adminRegions','supportRegions','allowedAccessRoles'])await fill(f,'req_'+key,requirements[key],true);
   await fill(f,'reqAdminAuthorization',requirements.adminAuthorization);await fill(f,'reqContinuity',requirements.continuity);await fill(f,'reqTransfers',requirements.allowedTransferMechanisms,true);
   let count=await f.locator('[data-domain-flow-row]').count();while(count>flows.length){await f.locator('[data-domain-flow-row]').last().locator('[data-domain-remove-flow]').click();count--;}while(count++<flows.length)await f.locator('[data-domain-add-flow]').click();
   for(let i=0;i<flows.length;i++){const v=flows[i],row=f.locator('[data-domain-flow-row]').nth(i),fields={flowId:v.id,flowResource:v.resource,informationClass:v.informationClass,flowProcessing:v.processingRegions,flowStorage:v.storageRegions,flowBackup:v.backupRegions,flowKeys:v.keyCustodyRegions,flowAdmins:v.adminLocations,flowSupport:v.supportRegions,flowRoles:v.accessRoles,flowAdminAuth:v.adminAuthorization,flowConnectivity:v.connectivity,flowContinuity:v.continuity,flowLicence:v.licenceMode,transferParties:v.transfer.parties,transferMechanism:v.transfer.mechanism};for(const [name,value] of Object.entries(fields))await fill(row,name,value,true);}
   return click(page,'[data-domain-form="contract"] button[type="submit"]');
  }
 }
 throw new Error('NO_VISIBLE_MAPPING:'+JSON.stringify(c));
}
(async()=>{try{
 const build='/tmp/soc-interface-ui-build-'+id;require(root+'/scripts/build').build({out:build});const files=[];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else files.push([path.relative(build,p),sha(fs.readFileSync(p))]);}}walk(build);report.artifact={sha256:sha(JSON.stringify(files)),files};
 server=http.createServer(require(root+'/scripts/serve').handler(build));await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await require(root+'/node_modules/playwright-core').chromium.launch({headless:true,args:['--no-sandbox']});report.browser={engine:'chromium',version:browser.version()};
 for(const profile of cases){if(Date.now()-started>report.totalLimitMs)throw new Error('TOTAL_RUNTIME_LIMIT');const key=profile.jurisdiction+'-'+profile.viewport.id+'-'+profile.name,row={key,profile,status:'running',errors:[],steps:[]};report.results.push(row);const context=await browser.newContext({viewport:{width:profile.viewport.width,height:profile.viewport.height}});let page,timer;
 try{await Promise.race([(async()=>{
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>row.errors.push('pageerror:'+e.message));page.on('console',m=>{if(m.type()==='error')row.errors.push('console:'+m.text());});
  await page.goto('http://127.0.0.1:'+server.address().port+'/series-of-calls/',{waitUntil:'domcontentloaded'});await page.locator('[data-act="training"]').click();await page.waitForFunction(()=>SCT.locked&&!SCT.busy);
  await page.locator('#soc-scenario').selectOption('defence');await page.locator('#soc-jurisdiction').selectOption(profile.jurisdiction);await page.locator('#soc-mode').selectOption('guided');await page.locator('[data-soc="new"]').click();await page.waitForFunction(j=>SCT.state.scenario==='defence'&&SCT.state.jurisdiction===j&&SCT.state.clock===0,profile.jurisdiction);
  const fixture=journey(profile),commands=fixture.commands;row.commands=commands;row.exactFixtureOrder=true;
  for(const command of commands){await execute(page,command);row.steps.push({type:command.type,action:command.command?.action||null,revision:await page.evaluate(()=>SCT.state.revision)});}
  const state=await page.evaluate(()=>JSON.parse(JSON.stringify(SCT.state))),expected=commands.reduce(SOC.dispatch,SOC.create(fixture.options));row.actualCommands=state.commands.map(entry=>entry.command);assert.deepEqual(state,row.actualCommands.reduce(SOC.dispatch,SOC.create(fixture.options)));const actualOutcome=structuredClone(state),expectedOutcome=structuredClone(expected);delete actualOutcome.commands;delete expectedOutcome.commands;assert.deepEqual(actualOutcome,expectedOutcome);row.comparison='Exact replay of observed UI commands; fixture semantic outcome compared excluding only command envelope log';row.stateSha256=sha(JSON.stringify(state));row.transfer=state.information.transfers.at(-1);row.records=state.records.map(r=>({id:r.id,classification:r.classification,origin:r.origin,storage:r.storage}));
  assert.equal(row.transfer.status,profile.name==='restricted-export-blocked'?'blocked':'complete');if(row.transfer.status==='blocked')assert.equal(row.transfer.reason,'POLICY_CLASSIFICATION_EXCEEDED');assert.equal(state.records.length,row.transfer.status==='blocked'?1:2);assert.deepEqual(row.errors,[]);
  await page.screenshot({path:path.join(out,key+'.png'),fullPage:true});row.status='diagnostic-passed';
 })(),new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('CASE_RUNTIME_LIMIT')),report.caseLimitMs))]);}
 catch(e){row.status='failed';row.error=String(e.stack||e);if(page)try{await page.screenshot({path:path.join(out,key+'-failed.png'),fullPage:true,timeout:5000});}catch(x){row.errors.push('screenshot:'+x.message);}}
 finally{clearTimeout(timer);try{await context.tracing.stop({path:path.join(out,key+'.trace.zip')});}catch(e){row.errors.push('trace:'+e.message);}await context.close();row.artifacts=fs.readdirSync(out).filter(name=>name.startsWith(key+'.')||name===key+'-failed.png').map(name=>({file:name,sha256:sha(fs.readFileSync(path.join(out,name))),bytes:fs.statSync(path.join(out,name)).size}));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(key,row.status);}
 if(row.status==='failed'&&process.env.SOC_INTERFACE_CONTINUE!=='1')break;
 }
 report.status=report.results.length===cases.length&&report.results.every(r=>r.status==='diagnostic-passed'&&!r.errors.length)?'diagnostic-passed':'failed';
}catch(e){report.status='failed';report.errors.push(String(e.stack||e));}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));report.sourceDrift=inputDrift(report.inputs,manifest());if(report.sourceDrift.length)report.status='failed';report.finishedAt=new Date().toISOString();report.elapsedMs=Date.now()-started;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,report:path.join(out,'report.json'),cases:report.results.length,sourceDrift:report.sourceDrift}));if(report.status!=='diagnostic-passed')process.exitCode=1;}})();
