'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{Worker}=require('node:worker_threads'),readline=require('node:readline'),path=require('node:path');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer';
// First six rows are the six named PLAY-002 authoring classes. Extra rows cover
// adjacent privileged pack entry points; a refusal must be the authority gate,
// not a later missing-pack or malformed-payload error.
const forbidden=[
 ['supplier cost',{type:'business',command:{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:['phone'],sell:true,wholesale:0}}],
 ['arbitrary capacity',{type:'configure',id:'carrier',config:{capacity:999}}],
 ['customer requirements',{type:'customer-needs',command:{action:'configure',id:'smb',config:{voiceSeats:0}}}],
 ['fault event',{type:'fault',id:'carrier',fault:'OUTAGE'}],
 ['task success',{type:'outcomes',command:{action:'task-result',needId:'need-1',interactionId:'interaction-1',intent:'service',succeeded:true,botAnswered:true,integration:'workflow',evidence:['fabricated']}}],
 ['quality grades',{type:'workforce-quality',command:{action:'review',interactionId:'interaction-1',reviewer:'supervisor',scores:{accuracy:5,context:5,resolution:5}}}],
 ['product deployment',{type:'products',command:{action:'start'}}],
 ['workforce roster',{type:'workforce',command:{action:'roster',people:[]}}],
 ['boundary policy',{type:'boundaries',command:{action:'start'}}]
];
const nested=command=>({type:'portfolio',command:{action:'dispatchcustomer',customerId,command}});
function funded(){let s=SOC.create({experience:'campaign',seed:73});const request={action:'purchase',offerId:'starter',planId:'swift',stage:'base'},q=SOC.provider.quote(s,request);return SOC.dispatch(s,{type:'provider',requestId:'provider-1',command:{...request,quoteRevision:q.atRevision}});}
function workerClient(t){
 // Executes the browser's exact serialized kernel in a real separate Node
 // worker isolate. Only its message-port plumbing is adapted; no mock dispatch.
 const worker=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.postMessage=value=>parentPort.postMessage(value);${SOC.workerSource()};parentPort.on('message',data=>globalThis.onmessage({data}));`,{eval:true});
 let serial=0;const pending=new Map();worker.on('message',reply=>{const item=pending.get(reply.id);if(item){clearTimeout(item.timer);pending.delete(reply.id);item.resolve(reply);}});worker.on('error',error=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();});t.after(()=>worker.terminate());
 return (state,command)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Serialized worker response timeout'));},10000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,state,command});});
}
function stdioClient(t){
 const child=spawn(process.execPath,[path.resolve(__dirname,'../scripts/calls-mcp.js')],{cwd:path.resolve(__dirname,'..'),stdio:['pipe','pipe','pipe']});let serial=0,stderr='';const pending=new Map();child.stderr.setEncoding('utf8');child.stderr.on('data',x=>stderr+=x);const lines=readline.createInterface({input:child.stdout});
 const rejectAll=error=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();};
 lines.on('line',line=>{let reply;try{reply=JSON.parse(line);}catch(e){rejectAll(e);return;}const item=pending.get(reply.id);if(item){clearTimeout(item.timer);pending.delete(reply.id);item.resolve(reply);}});child.on('error',rejectAll);child.on('exit',code=>{if(pending.size)rejectAll(new Error('MCP exited '+code+': '+stderr));});
 t.after(async()=>{child.stdin.end();if(child.exitCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});lines.close();assert.equal(stderr,'','actual stdio MCP must not emit unexpected errors');});
 const request=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Actual stdio MCP timeout: '+method+' '+stderr));},10000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 const call=async(name,args={})=>{const reply=await request('tools/call',{name,arguments:args});assert.equal(reply.error,undefined,JSON.stringify(reply));return reply.result;};
 const value=async(name,args={})=>{const result=await call(name,args);assert.equal(result.isError,undefined,JSON.stringify(result));assert.equal(result.content[0].type,'text');return JSON.parse(result.content[0].text);};return {request,call,value};
}

test('PLAY-002 serialized worker rejects each authoring class directly, nested and on an owned customer root without mutation',async t=>{
 const run=workerClient(t),s=funded(),original=JSON.stringify(s),owned=s.portfolio.customers[0].root;assert.equal(owned.business,undefined);assert.equal(owned.providerCustomer.id,customerId);
 for(const [name,command] of forbidden)await t.test(name,async()=>{
  for(const [scope,state,intent] of [['parent',s,command],['nested customer',s,nested(command)],['owned child',owned,command]]){const before=JSON.stringify(state),reply=await run(state,intent);assert.equal(reply.error,'CAMPAIGN_AUTHORING_FORBIDDEN',scope);assert.equal(reply.state,undefined);assert.equal(JSON.stringify(state),before);}
  assert.equal(JSON.stringify(s),original);
 });
 const valid=await run(s,{type:'advance',minutes:1});assert.equal(valid.error,undefined);assert.deepEqual(valid.state,SOC.dispatch(s,{type:'advance',minutes:1}));
});

test('PLAY-002 actual stdio MCP preserves a funded Provider save after every direct and nested authoring refusal',async t=>{
 const client=stdioClient(t),initialized=await client.request('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'provider-authority-regression',version:'1'}});assert.equal(initialized.result.serverInfo.name,'series-of-calls');await client.value('new_provider_campaign',{providerName:'Authority Orchard',scenario:'smb',seed:73});const initial=await client.value('export_exercise'),request={action:'purchase',offerId:'starter',planId:'swift',stage:'base'},quote=await client.value('provider_quote',{request});assert.deepEqual(await client.value('export_exercise'),initial);const committed=await client.value('command',{command:{type:'provider',requestId:'provider-1',command:{...request,quoteRevision:quote.atRevision}}});const s=committed.state;assert.equal(s.business.balance.cash,initial.business.balance.cash-quote.setupCents);assert.equal(s.portfolio.customers[0].root.providerCustomer.id,customerId);assert.equal(s.portfolio.customers[0].root.business,undefined);
 for(const [name,command] of forbidden)await t.test(name,async()=>{for(const intent of [command,nested(command)]){const result=await client.call('command',{command:intent});assert.equal(result.isError,true);assert.equal(result.content[0].text,'CAMPAIGN_AUTHORING_FORBIDDEN');assert.deepEqual(await client.value('export_exercise'),s);}});
 for(const command of [{type:'provider',system:true,command:{action:'staff',engineers:20,support:20}},{type:'provider',command:{action:'purchase',offerId:'starter',planId:'swift',stage:'base',setupCents:0,quoteRevision:s.revision}}]){const result=await client.call('command',{command});assert.equal(result.isError,true);assert.match(result.content[0].text,/INVALID_COMMAND|INVALID_PROVIDER/);assert.deepEqual(await client.value('export_exercise'),s);}
 await client.value('import_exercise',{json:JSON.stringify(s)});assert.deepEqual(await client.value('export_exercise'),s);const next=await client.value('command',{command:{type:'advance',minutes:1}});assert.deepEqual(next.state,SOC.dispatch(s,{type:'advance',minutes:1}));
});

test('worker and actual stdio retain permitted Training configuration and custom Lab fault authoring as separate saves',async t=>{
 const run=workerClient(t),client=stdioClient(t);await client.request('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'experience-authority-regression',version:'1'}});
 for(const mode of ['guided','assessed','sandbox']){
  await client.value('new_exercise',{scenario:'smb',mode});const before=await client.value('export_exercise'),configure={type:'configure',id:'carrier',config:{capacity:9}},worker=await run(before,configure),remote=await client.value('command',{command:configure});assert.equal(worker.error,undefined);assert.deepEqual(remote.state,worker.state);assert.equal(remote.state.resources.carrier.desired.capacity,9);assert.equal(remote.state.providerCampaign,undefined);assert.equal(remote.state.experience.kind,mode==='sandbox'?'lab':'training');assert.equal(remote.state.experience.custom,mode==='sandbox');
  if(mode==='sandbox'){const fault={type:'fault',id:'carrier',fault:'OUTAGE'},changed=await client.value('command',{command:fault});assert.deepEqual(changed.state,(await run(remote.state,fault)).state);assert.equal(changed.state.resources.carrier.fault,'OUTAGE');}
 }
});
