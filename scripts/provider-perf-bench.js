#!/usr/bin/env node
'use strict';
// SOC-10: measure the same dispatched campaign saves in the actual built Provider page.
// Generate the fixtures with SOC_PROVIDER_PERF_FIXTURE_DIR=/tmp/soc-provider-fixtures
// node --test tests/provider-segments.test.js, or use the retained gzip fixtures.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const crypto=require('node:crypto');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright-core');
const SOC=require('../src/game/55-communications');
const root=path.resolve(__dirname,'..');
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const directory=path.resolve(arg('--fixtures',path.join(root,'evidence/gameplay-audit-2026-11-13/provider-benchmark/fixtures')));
const output=path.resolve(arg('--out','/tmp/soc-provider-perf-report.json'));
const runs=Number(arg('--runs','5'));
if(!Number.isInteger(runs)||runs<3||runs>30)throw Error('--runs must be an integer from 3 to 30');
if(!output.startsWith('/tmp/'))throw Error('--out must be under /tmp');
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
const percentile=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.ceil(p*s.length)-1)];};
const summarize=a=>({medianMs:+median(a).toFixed(2),p95Ms:+percentile(a,.95).toFixed(2),samplesMs:a.map(x=>+x.toFixed(2))});
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
function fixture(count){
 const json=path.join(directory,`${count}.json`),gz=path.join(directory,`${count}.json.gz`);
 const file=fs.existsSync(json)?json:gz,buffer=fs.readFileSync(file),text=file.endsWith('.gz')?zlib.gunzipSync(buffer).toString('utf8'):buffer.toString('utf8');
 const state=SOC.restore(text);assert.equal(state.providerCampaign.customers.length,count);
 return {text,sha256:sha256(text),clock:state.clock,revision:state.revision,bytes:Buffer.byteLength(text),statuses:state.providerCampaign.customers.map(c=>({id:c.id,status:c.status,scenario:c.scenario}))};
}
async function main(){
 const browser=await chromium.launch({headless:true,...(process.env.SOC_PROVIDER_PERF_CHROME?{executablePath:process.env.SOC_PROVIDER_PERF_CHROME}:{})});
 const report={scope:'SOC-10 Provider benchmark; dispatched one, three and five customer saves; built Chromium page; 1x is one tick per 2000ms and 8x is one tick per 250ms. No synthetic state edits.',runAt:new Date().toISOString(),node:process.version,chromium:browser.version(),host:{platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model||'unknown',logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem()},inputs:Object.fromEntries(['_site/index.html','src/game/55-communications.js','src/game/98-provider-runtime.js','scripts/provider-perf-bench.js','tests/provider-segments.test.js'].map(file=>[file,sha256(fs.readFileSync(path.join(root,file)))])),runs,results:{}};
 try{for(const count of [1,3,5]){
  const f=fixture(count),page=await browser.newPage({viewport:{width:1366,height:768}});
  try{
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(pathToFileURL(path.join(root,'_site/index.html')).href);
   await page.evaluate(text=>{const s=SOC.restore(text);SCP.state=s;SCP.atHome=false;SCP.locked=true;providerEnsureMount();window.__providerPerfState=s;window.__providerPerfModel=providerModel();SOC_PROVIDER_UI.render(s,window.__providerPerfModel,{selection:{customerId:s.providerCampaign.customers.at(-1).id},layer:'services'});},f.text);
   const samples={inspect:[],model:[],render:[],save:[],restore:[],validate:[],dispatch1:[],dispatch8:[],worker1:[],worker8:[]};
   for(let n=0;n<runs;n++){
    const result=await page.evaluate(async()=>{
     const state=window.__providerPerfState,original=JSON.stringify(state),command=s=>({type:'advance',minutes:1,expectedRevision:s.revision});
     const timed=fn=>{const t=performance.now(),value=fn();return {ms:performance.now()-t,value};};
     const inspect=timed(()=>SOC.provider.inspect(state));
     const model=timed(()=>providerModel());
     const render=timed(()=>{SOC_PROVIDER_UI.render(state,model.value);void document.documentElement.offsetHeight;});
     const save=timed(()=>{const raw=JSON.stringify(state);localStorage.setItem('__soc_provider_perf',raw);return raw;});
     const restore=timed(()=>SOC.restore(save.value));
     const dispatch=ticks=>timed(()=>{let next=state;for(let i=0;i<ticks;i++)next=SOC.dispatch(next,command(next));return next;});
     const one=dispatch(1),eight=dispatch(8);
     const validate=timed(()=>SOC.validateState(one.value));
     const workerTick=s=>new Promise((resolve,reject)=>{const t=performance.now(),url=URL.createObjectURL(new Blob([SOC.workerSource()],{type:'text/javascript'})),worker=new Worker(url);URL.revokeObjectURL(url);const timer=setTimeout(()=>{worker.terminate();reject(Error('worker timeout'));},15000);worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message));};worker.onmessage=e=>{clearTimeout(timer);worker.terminate();if(e.data.error)reject(Error(e.data.error));else resolve({state:e.data.state,ms:performance.now()-t});};worker.postMessage({id:1,state:s,command:command(s)});});
     let next=state,worker1=0,worker8=0;
     for(let i=0;i<8;i++){const result=await workerTick(next);next=result.state;if(i===0)worker1=result.ms;worker8+=result.ms;}
     if(JSON.stringify(next)!==JSON.stringify(eight.value)||JSON.stringify(restore.value)!==save.value)throw Error('worker or restored result differs from direct dispatch/save');
     if(JSON.stringify(state)!==original)throw Error('benchmark mutated fixture');
     return {inspect:inspect.ms,model:model.ms,render:render.ms,save:save.ms,restore:restore.ms,validate:validate.ms,dispatch1:one.ms,dispatch8:eight.ms,worker1,worker8};
    });
    for(const [key,value] of Object.entries(result))samples[key].push(value);
   }
   assert.deepEqual(errors,[],'page errors');
   const metrics=Object.fromEntries(Object.entries(samples).map(([key,value])=>[key,summarize(value)]));
   const tickBudget={normalMs:2000,fastMs:250},pipeline=metrics.worker1.medianMs+metrics.validate.medianMs+metrics.model.medianMs+metrics.render.medianMs+metrics.save.medianMs;
   report.results[count]={fixture:{sha256:f.sha256,clock:f.clock,revision:f.revision,bytes:f.bytes,statuses:f.statuses},metrics,tickBudget,pipelineEstimateMedianMs:+pipeline.toFixed(2),budgetShare:{normal:+(pipeline/tickBudget.normalMs).toFixed(3),fast:+(pipeline/tickBudget.fastMs).toFixed(3)},note:'Pipeline estimate sums separate medians for a one-minute tick. worker8 is eight fresh sequential workers, matching the runtime worker lifecycle. Actual frame pacing and rendering may differ.'};
   console.log(`${count} customers: fresh worker ${metrics.worker1.medianMs} ms; model ${metrics.model.medianMs} ms; render ${metrics.render.medianMs} ms; 8 worker ticks ${metrics.worker8.medianMs} ms; 8x budget share ${report.results[count].budgetShare.fast}`);
  }finally{await page.close();}
 }}finally{await browser.close();}
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(`Report: ${output}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
