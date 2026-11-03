'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {webkit}=require('/work/node_modules/playwright-core');
const {sourceManifest,inputDrift}=require('/work/scripts/browser-campaigns');
const out='/evidence/webkit-entry-reproduction/'+new Date().toISOString().replace(/[:.]/g,'-');fs.mkdirSync(out,{recursive:true});
const report={scope:'Isolated repeated first Training entry; diagnostic only, not a campaign or crash root-cause fix',startedAt:new Date().toISOString(),status:'running',inputs:sourceManifest(),results:[],browser:null};
let browser,server;
(async()=>{try{
 require('/work/scripts/build').build({out:'/tmp/soc-webkit-entry-build'});server=http.createServer(require('/work/scripts/serve').handler('/tmp/soc-webkit-entry-build'));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 browser=await webkit.launch({headless:true});report.browser={engine:'webkit',version:browser.version(),playwright:require('/work/node_modules/playwright-core/package.json').version};const start=Date.now();
 for(let i=0;i<20;i++){
  if(Date.now()-start>180000)throw new Error('REPRODUCTION_TOTAL_BUDGET');
  const context=await browser.newContext({viewport:{width:390,height:844}}),row={iteration:i+1,status:'running',errors:[]};let page;
  try{await context.tracing.start({screenshots:true,snapshots:true,sources:true});page=await context.newPage();page.on('crash',()=>row.errors.push('page-process-crash'));page.on('pageerror',e=>row.errors.push('pageerror:'+e.message));page.on('console',m=>{if(m.type()==='error')row.errors.push('console:'+m.text());});await page.goto('http://127.0.0.1:'+server.address().port+'/series-of-calls/',{waitUntil:'domcontentloaded',timeout:15000});await page.locator('[data-act=training]').click({timeout:10000});await page.waitForFunction(()=>SCT.locked&&document.querySelector('#soc-console:not([hidden])'),null,{timeout:15000});row.status=row.errors.length?'failed':'passed';}
  catch(e){row.status='failed';row.error=String(e.stack||e);}
  finally{try{await context.tracing.stop({path:path.join(out,'entry-'+(i+1)+'.trace.zip')});}catch(e){row.errors.push('trace:'+e.message);}await context.close();report.results.push(row);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
 }
 report.status=report.results.length===20&&report.results.every(r=>r.status==='passed'&&!r.errors.length)?'diagnostic-passed':'failed';
}catch(e){report.status='failed';report.error=String(e.stack||e);}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));report.sourceDrift=inputDrift(report.inputs,sourceManifest());if(report.sourceDrift.length)report.status='failed';report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,results:report.results.length,sourceDrift:report.sourceDrift,report:path.join(out,'report.json'),error:report.error}));if(report.status!=='diagnostic-passed')process.exitCode=1;}})();
