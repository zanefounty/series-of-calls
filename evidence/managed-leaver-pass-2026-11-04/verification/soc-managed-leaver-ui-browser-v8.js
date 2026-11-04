'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root='/tmp/soc-managed-leaver-implementation';
const engine=process.env.SOC_MANAGED_ENGINE||'chromium';assert.ok(['chromium','firefox','webkit'].includes(engine));
const SOC=require(root+'/src/game/55-communications'),{journey}=require(root+'/tests/lib/managed-leaver-fixture'),{sourceManifest,inputDrift}=require(root+'/scripts/browser-campaigns');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),runId=new Date().toISOString().replace(/[:.]/g,'-');
const out=process.env.SOC_MANAGED_OUT||`/tmp/soc-managed-leaver-ui-${engine}-${runId}`;fs.mkdirSync(out,{recursive:true});
const tracked=['tests/lib/managed-leaver-fixture.js','src/game/76-managed-operations-ui.js','src/game/84-portfolio-ui.js','src/game/90-service-admin-ui.js','src/game/87-advanced-admin-ui.js','src/game/96-operations-ui.js','src/game/97-training.js','src/game/98-business-ui.js','src/game/55-communications.js'];
const inputManifest=()=>({...sourceManifest(),...Object.fromEntries(tracked.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]))});
const report={scope:'Synthetic managed identity leaver through visible SOC controls in an AU enterprise portfolio; bounded diagnostic browser evidence, not full-app or release acceptance.',status:'running',startedAt:new Date().toISOString(),driverSha256:sha(fs.readFileSync(__filename)),inputs:inputManifest(),variant:process.env.SOC_MANAGED_VARIANT||'connector-recovery',results:[],errors:[],caseLimitMs:180000,totalLimitMs:1200000,versions:{node:process.version,playwright:require(root+'/node_modules/playwright-core/package.json').version}};
const viewports=[{id:'desktop',width:1440,height:1000},{id:'mobile',width:390,height:844}];
const cases=viewports.map(viewport=>({viewport,engine}));if(process.env.SOC_MANAGED_ONLY)cases.splice(0,cases.length,...cases.filter(c=>c.viewport.id===process.env.SOC_MANAGED_ONLY));
let browser,server;const started=Date.now();
async function waitReady(page,oldRevision){try{await page.waitForFunction(r=>!SCT.busy&&SCT.state.revision>r,oldRevision,{timeout:20000});}catch(error){const state=await page.evaluate(()=>({error:SCT.error,revision:SCT.state.revision,selectedCustomer:SCT.state.portfolio?.selectedCustomer,scenario:SCT.state.scenario,clock:SCT.state.clock}));throw new Error(`UI_DISPATCH_DID_NOT_ADVANCE:${JSON.stringify(state)}:${error.message}`);}const err=await page.evaluate(()=>SCT.error);if(err)throw new Error('UI_ERROR:'+err);}
async function click(page,selector){const rev=await page.evaluate(()=>SCT.state.revision);await page.locator(selector).click();await waitReady(page,rev);}
async function fill(form,name,value){const c=form.locator(`[name="${name}"]`);if(!(await c.count()))throw new Error(`VISIBLE_FIELD_MISSING:${name}`);const tag=await c.evaluate(e=>e.tagName),type=await c.evaluate(e=>e.type);if(type==='checkbox')await c.setChecked(!!value);else if(tag==='SELECT')await c.selectOption(Array.isArray(value)?value.map(String):String(value??''));else await c.fill(Array.isArray(value)?JSON.stringify(value):String(value??''));}
async function submit(page,selector,fields={}){const f=page.locator(selector);for(const [name,value] of Object.entries(fields))await fill(f,name,value);await click(page,selector+' button[type="submit"]');}
async function selectCustomer(page,id,current){if(current.value===id)return;await submit(page,'[data-portfolio-select]',{customerId:id});current.value=id;}
async function chooseResource(page,id){await page.locator(`[data-soc="select"][data-id="${id}"]`).click();await page.waitForFunction(expected=>SCT.selected===expected&&!SCT.busy,id);}
async function executeInner(page,command,profile,selection){
 const type=command.type,q=command.command||{};
 if(type==='configure'){
  await chooseResource(page,command.id);const form=page.locator('#soc-config');
  for(const [k,v] of Object.entries(command.config))await fill(form,k,v);await click(page,'#soc-config button[type="submit"]');return;
 }
 if(type==='business'){
  if(q.action==='start')return click(page,'#soc-business [data-biz="start"]');
  if(q.action==='order'){const f=page.locator('#soc-order');await fill(f,'offer',q.offer);await fill(f,'quantity',q.quantity);await fill(f,'customer',q.customer);await fill(f,'sell',q.sell);if(q.offer==='managed-operations')await fill(f,'managedResources',['identity']);return submit(page,'#soc-order',{});}
 }
 if(type==='estate'){
  if(q.action==='start')return submit(page,'[data-sa-start="estate"]',{});
  if(q.action==='discover'){const item=q.items[0];return submit(page,'[data-sa-form="discover"]',{sourceKey:item.sourceKey,kind:item.kind,observedId:item.observedId,confidence:item.confidence,conflicts:item.conflicts,unknowns:item.unknowns});}
  if(q.action==='link'){
   const selector=`[data-sa-link="${q.sourceKey}"]`;await fill(page.locator(selector),'canonicalId',q.canonicalId);await fill(page.locator(selector),'resource',q.resource);return click(page,selector+' button[type="submit"]');
  }
  if(q.action==='connector'){
   const f=page.locator('[data-sa-form="connector"]');await fill(f,'connectorId',q.connector.id);
   for(const x of await f.locator('[name="action"]').all())await x.setChecked(q.connector.actions.includes(await x.getAttribute('value')));
   for(const x of await f.locator('[name="resourceKind"]').all())await x.setChecked(q.connector.resourceKinds.includes(await x.getAttribute('value')));
   await fill(f,'localDependency',q.connector.localDependency);await fill(f,'version',q.connector.version);return click(page,'[data-sa-form="connector"] button[type="submit"]');
  }
  if(q.action==='recover'){const f=page.locator('[data-sa-form="recover"]');await fill(f,'connector',q.connector);await fill(f,'authenticated',q.authenticated);await fill(f,'delegated',q.delegated);await fill(f,'reachable',q.reachable);return click(page,'[data-sa-form="recover"] button[type="submit"]');}
  if(q.action==='fault'){const f=page.locator('[data-sa-form="fault"]');await fill(f,'connector',q.connector);await fill(f,'fault',q.fault||'');return click(page,'[data-sa-form="fault"] button[type="submit"]');}
 }
 if(type==='channels'){
  if(q.action==='start')return submit(page,'[data-aa-start="channels"]',{});
  if(q.action==='observe'){const f=page.locator(`[data-aa-form="channel-observe"][data-channel="${q.channel}"]`);await fill(f,'authenticated',q.authenticated);await fill(f,'providerAvailable',q.providerAvailable);await fill(f,'fault',q.fault||'');return click(page,`[data-aa-form="channel-observe"][data-channel="${q.channel}"] button[type="submit"]`);}
  if(q.action==='permission'){const f=page.locator('[data-aa-form="permission"]');for(const [k,v] of Object.entries({tenant:q.tenant,person:q.person,account:q.channel,purpose:q.purpose,grant:q.granted,expiresAt:q.expiresAt??''}))await fill(f,k,v);return click(page,'[data-aa-form="permission"] button[type="submit"]');}
 }
 if(type==='operations'&&q.action==='configure'){
  const f=page.locator(`[data-ops-config="${q.kind}"]`);for(const [k,v] of Object.entries(q.config))await fill(f,k,v);return click(page,`[data-ops-config="${q.kind}"] button[type="submit"]`);
 }
 if(type==='operations'&&q.action==='receipt'){
  const f=page.locator('#soc-delivery-receipt');for(const [k,v] of Object.entries({job:q.job,eventid:q.eventId,signature:q.signature}))await fill(f,k,v);return click(page,'#soc-delivery-receipt button[type="submit"]');
 }
 if(type==='advance'){for(let n=0;n<command.minutes;n++)await click(page,'[data-soc="minute"]');return;}
 if(type==='interact'){
  if(command.caseId==='retired-alex'){const f=page.locator('#soc-journey-controls form');for(const [k,v] of Object.entries({channel:command.channel,from:command.from,to:command.to,caseId:command.caseId}))await fill(f,k,v);return click(page,'#soc-journey-controls button[type="submit"]');}
  const f=page.locator('[data-aa-form="channel-interact"]');for(const [k,v] of Object.entries({interactionChannel:command.channel,from:command.from,destination:command.to,caseId:command.caseId,account:command.account||'',purpose:command.purpose||'service',template:command.template||'service-outside-window'}))await fill(f,k,v);return click(page,'[data-aa-form="channel-interact"] button[type="submit"]');
 }
 throw new Error('NO_VISIBLE_CHILD_MAPPING:'+JSON.stringify(command));
}
async function execute(page,command,profile,selection,adapt){
 if(command.type==='advance'){for(let n=0;n<command.minutes;n++)await click(page,'[data-soc="minute"]');return;}
 if(command.type==='portfolio'){
  if(command.command.action==='start')return click(page,'#soc-portfolio [data-portfolio-action="start"]');
  if(command.command.action==='addcustomer'){const {action,...fields}=command.command;return submit(page,'[data-portfolio-add]',fields);}
  if(command.command.action==='dispatchcustomer'){
   const id=command.command.customerId;await selectCustomer(page,id,selection);
   return executeInner(page,command.command.command,profile,selection);
  }
 }
 if(command.type==='managed-operations'){
  if(command.command.action==='start')return click(page,'#soc-managed-operations [data-managed-action="start"]');
  if(command.command.action==='submit'){
   const part=command.command.participants[0],id=part.customerId,card=page.locator(`[data-managed-customer="${id}"]`);
   for(const other of await page.locator('[data-managed-customer]').all()){const otherId=await other.getAttribute('data-managed-customer');if(otherId!==id){const input=other.locator(`[data-managed-principal="${otherId}"]`);if(await input.count()&&await input.isVisible())await input.fill(`unused-${otherId}`);}}
   await card.locator(`[data-managed-include="${id}"]`).check();await card.locator(`[data-managed-operation="${id}"]`).selectOption('leaver');
   await card.locator(`[data-managed-resource="${id}"]`).selectOption('identity');await card.locator(`[data-managed-leaver-existing="${id}"]`).selectOption('alex');await card.locator(`[data-managed-revocation="${id}"]`).check();
   const invalid=await page.evaluate(()=>Array.from(document.querySelectorAll('#soc-managed-operations form [required]:invalid')).map(e=>({name:e.name,value:e.value,customer:e.closest('[data-managed-customer]')?.dataset.managedCustomer})));if(invalid.length)throw new Error('MANAGED_UI_FORM_INVALID:'+JSON.stringify(invalid));
   await click(page,'[data-managed-submit] button[type="submit"]');adapt.uiManagedId=(await page.evaluate(()=>SCT.state.managedOperations.jobs.at(-1)?.id));return;
  }
  if(command.command.action==='retry')return click(page,`[data-managed-action="retry"][data-job="${adapt.uiManagedId||command.command.job}"][data-customer="${command.command.customerId}"]`);
 }
 throw new Error('NO_VISIBLE_MAPPING:'+JSON.stringify(command));
}
function selectedCommand(command){return command;}
function buildAdaptedFixture(fixture,actualCommands,adapt){
 const adapted=[],actualNested=actualCommands.map(selectedCommand).filter(c=>c.type==='portfolio'&&c.command.action==='dispatchcustomer');let selected=null;
 const actionKey=c=>c.type==='configure'?`configure:${c.id}`:c.type==='interact'?'interact':`${c.type}:${c.command?.action||''}`;
 const consumed=new Set();
 for(const original of fixture.commands){
  if(original.type==='portfolio'&&original.command.action==='dispatchcustomer'){
   const id=original.command.customerId;
   if(selected!==id){const select={type:'portfolio',command:{action:'selectcustomer',customerId:id}};adapted.push(select);selected=id;}
   const expectedInner=original.command.command,key=actionKey(expectedInner),index=actualNested.findIndex((candidate,i)=>!consumed.has(i)&&candidate.command.customerId===id&&actionKey(candidate.command.command)===key);
   if(index<0)throw new Error(`ADAPTER_MISSING_VISIBLE_COMMAND:${id}:${key}`);consumed.add(index);
   const actual=actualNested[index];
   // The business order form chooses applicable resources and current retail terms itself. Use that one observed UI payload verbatim.
   adapted.push(key==='business:order'||key==='interact'&&expectedInner.caseId==='retired-alex'?structuredClone(actual):structuredClone(original));continue;
  }
  if(original.type==='managed-operations'&&original.command.action==='submit'){const x=structuredClone(original);x.command.id=adapt.uiManagedId;adapted.push(x);continue;}
  if(original.type==='managed-operations'&&original.command.action==='retry'){const x=structuredClone(original);x.command.job=adapt.uiManagedId||x.command.job;adapted.push(x);continue;}
  adapted.push(structuredClone(original));
 }
 const expectedState=adapted.reduce(SOC.dispatch,SOC.create(fixture.options));
 return {commands:adapted,expectedState,adapter:{portfolioSelections:'Inserted explicit selectcustomer commands when the visible portfolio selector changed customer.',managedJobId:`Visible UI generated ${adapt.uiManagedId}; substituted only the fixture’s explicit id managed-leaver.`,businessOrder:'Replaced only the fixture business order with the visible order form’s captured public dispatch payload because the form supplies applicable resources and current retail terms.',retiredCaller:'Replaced only the fixture interaction with the command emitted by the simple visible test-interaction form; the retired identity is no longer available in the account administration selector. No state fields are dropped or normalized.'}};
}
(async()=>{
 try{
  const build=`/tmp/soc-managed-leaver-build-${runId}`;require(root+'/scripts/build').build({out:build});const files=[];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else files.push([path.relative(build,p),sha(fs.readFileSync(p))]);}}walk(build);report.build={sha256:sha(JSON.stringify(files)),files};
  server=http.createServer(require(root+'/scripts/serve').handler(build));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await require(root+'/node_modules/playwright-core')[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}: {})});report.browser={engine,version:browser.version()};
  for(const testCase of cases){if(Date.now()-started>report.totalLimitMs)throw new Error('TOTAL_RUNTIME_LIMIT');const key=`${engine}-${testCase.viewport.id}-${report.variant}`,row={key,profile:testCase,status:'running',errors:[],steps:[]};report.results.push(row);const context=await browser.newContext({viewport:{width:testCase.viewport.width,height:testCase.viewport.height}});let page,timer;
   try{await Promise.race([(async()=>{
    await context.tracing.start({screenshots:true,snapshots:true,sources:true});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>row.errors.push('pageerror:'+e.message));page.on('console',m=>{if(m.type()==='error')row.errors.push('console:'+m.text());});
    await page.goto(`http://127.0.0.1:${server.address().port}/series-of-calls/`,{waitUntil:'domcontentloaded'});await page.locator('[data-act="training"]').click();await page.waitForFunction(()=>SCT.locked&&!SCT.busy);
    await page.locator('#soc-scenario').selectOption('enterprise');await page.locator('#soc-jurisdiction').selectOption('AU');await page.locator('#soc-mode').selectOption('guided');await page.locator('[data-soc="new"]').click();await page.waitForFunction(()=>SCT.state.scenario==='enterprise'&&SCT.state.jurisdiction==='AU'&&SCT.state.clock===0);
    const fixture=journey({jurisdiction:'AU',variant:report.variant}),selection={value:null},adapt={};row.fixtureOptions=fixture.fixtureOptions;row.fixtureCommands=fixture.commands;row.inputStateSha256=sha(JSON.stringify(fixture.expectedState));
    for(const command of fixture.commands){await execute(page,command,{jurisdiction:'AU'},selection,adapt);row.steps.push({type:command.type,action:command.command?.action||null,selectedCustomer:selection.value,revision:await page.evaluate(()=>SCT.state.revision),clock:await page.evaluate(()=>SCT.state.clock)});if(command.type==='advance'&&report.variant==='connector-recovery'){const blocked=await page.evaluate(()=>SCT.state.managedOperations?.jobs.at(-1)?.participants?.[0]?.items?.[0]?.status==='blocked');if(blocked){row.blockedScreenshot=`${key}-blocked.png`;await page.screenshot({path:path.join(out,row.blockedScreenshot),fullPage:true});}}}
    const state=await page.evaluate(()=>JSON.parse(JSON.stringify(SCT.state))),rawCommands=state.commands.map(x=>x.command);row.rawUiCommands=rawCommands;row.rawUiCommandSha256=sha(JSON.stringify(rawCommands));const exact=rawCommands.reduce(SOC.dispatch,SOC.create({scenario:'enterprise',jurisdiction:'AU'}));assert.deepEqual(state,exact,'full exported root must equal replay of captured raw UI commands');row.exactRawUiReplay=true;
    // Use fixture expected commands plus only explicit UI-default substitutions, and compare every state field.
    const managedId=state.managedOperations.jobs.at(-1).id;adapt.uiManagedId=managedId;
    const adapted=buildAdaptedFixture(fixture,rawCommands,adapt);row.fixtureAdapter=adapted.adapter;row.fixtureAdaptedCommands=adapted.commands;row.fixtureAdaptedStateSha256=sha(JSON.stringify(adapted.expectedState));
    assert.deepEqual(state,adapted.expectedState,'visible root must equal fixture replay after the enumerated control-default adaptations');row.exactAdaptedFixtureReplay=true;
    const child=state.portfolio.customers.find(x=>x.id==='leaver-a').root,managed=SOC.managedOperations.inspect(state);row.outcomes={identityDesired:child.resources.identity.desired.identities,identityEffective:child.resources.identity.effective.identities,historyCase:child.cases['historic-alex']||null,acceptedBefore:child.channels.acceptances.length,receipts:child.channels.receipts.length,latestInteraction:child.interactions.at(-1),managedJob:managed.jobs.at(-1),managedCharges:child.business.managedCharges,otherCustomerIdentity:state.portfolio.customers.find(x=>x.id==='leaver-b').root.resources.identity.effective.identities};
    assert.equal(row.outcomes.latestInteraction.outcome,'UNKNOWN_CALLER');assert.deepEqual(row.outcomes.identityEffective,['bea']);assert.ok(row.outcomes.historyCase);assert.equal(row.outcomes.acceptedBefore,1);assert.equal(row.outcomes.receipts.length,1);assert.deepEqual(row.outcomes.otherCustomerIdentity,['alex','bea']);
    assert.equal(row.outcomes.managedJob.participants[0].items[0].status,'complete');assert.equal(row.outcomes.managedJob.participants[0].items[0].billingStatus,'posted');assert.deepEqual(row.errors,[]);row.finalScreenshot=`${key}-complete.png`;await page.screenshot({path:path.join(out,row.finalScreenshot),fullPage:true});row.status='diagnostic-passed';
   })(),new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('CASE_RUNTIME_LIMIT')),report.caseLimitMs))]);}
   catch(e){row.status='failed';row.error=String(e.stack||e);if(page)try{row.failedScreenshot=`${key}-failed.png`;await page.screenshot({path:path.join(out,row.failedScreenshot),fullPage:true,timeout:5000});}catch(x){row.errors.push('screenshot:'+x.message);}}
   finally{clearTimeout(timer);try{row.trace=`${key}.trace.zip`;await context.tracing.stop({path:path.join(out,row.trace)});}catch(e){row.errors.push('trace:'+e.message);}await context.close();row.artifacts=fs.readdirSync(out).filter(name=>name===row.trace||name.endsWith('.png')).map(name=>({file:name,sha256:sha(fs.readFileSync(path.join(out,name))),bytes:fs.statSync(path.join(out,name)).size}));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(key,row.status);}
   if(row.status==='failed'&&process.env.SOC_MANAGED_CONTINUE!=='1')break;
  }
  report.status=report.results.length===cases.length&&report.results.every(r=>r.status==='diagnostic-passed'&&!r.errors.length)?'diagnostic-passed':'failed';
 }catch(e){report.status='failed';report.errors.push(String(e.stack||e));}
 finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));report.sourceDrift=inputDrift(report.inputs,inputManifest());if(report.sourceDrift.length)report.status='failed';report.finishedAt=new Date().toISOString();report.elapsedMs=Date.now()-started;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,report:path.join(out,'report.json'),cases:report.results.length,sourceDrift:report.sourceDrift}));if(report.status!=='diagnostic-passed')process.exitCode=1;}
})();
