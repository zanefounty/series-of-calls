'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications');
test('AC-SOC-859 selected workload path explains actual delivered, failed and pending cases with service and incident controls without mutating work',()=>{
 let s=SOC.create({experience:'campaign',seed:73,difficulty:'easy'});
 const customerId='starter-customer';
 for(const stage of ['base','carrier','partner']){const r={action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})};s=SOC.dispatch(s,{type:'provider',command:{...r,quoteRevision:SOC.provider.quote(s,r).atRevision}});}
 for(let n=0;n<28;n++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 const before=JSON.stringify(s),model=SOC.provider.inspect(s),modelBefore=JSON.stringify(model),customer=model.customers[0];
 const dom=new JSDOM('<!doctype html><main></main>',{runScripts:'dangerously'}),w=dom.window;w.N_=x=>x;
 for(const file of ['93-ui/10-dom.js','93-ui/70-provider-hud.js','93-ui/75-provider-panels.js','93-ui/79-provider-journeys.js','93-ui/79-provider-workload-flow.js'])w.eval(fs.readFileSync(path.join(__dirname,'../src/game',file),'utf8'));
 for(const [status,expected] of [['completed','This case was delivered.'],['failed','calling connection could not be established'],['pending','still in progress']]){
  const journey=customer.journeys.find(j=>j.status===status);assert.ok(journey,status);
  const edge={id:'selected-real-path',type:'workload-flow',scope:customerId,flowId:journey.id,from:customerId+':phone',to:customerId+':service',status:'forged-preview-only'};
  w.SOCServiceScene={project:()=>({suppliers:[],edges:[edge]})};
  w.document.querySelector('main').innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId,pathId:edge.id}});
  const inspector=w.document.querySelector('.provider-workload-flow');assert.ok(inspector);assert.ok(inspector.textContent.includes(expected),inspector.textContent);assert.ok(!inspector.textContent.includes('forged-preview-only'));
  assert.equal(inspector.querySelector('[data-provider-action="select-service"]').dataset.id,'service');
  assert.equal(inspector.querySelector('[data-provider-action="select-incident"]').dataset.id,model.incidents[0].id);
  assert.deepEqual(JSON.parse(inspector.querySelector('pre').textContent),journey.trace);
  assert.match(inspector.textContent,/Supplier usage/);
 }
 const stale=w.SOCProviderWorkloadFlow.render(model,{scope:customerId,flowId:'no-longer-retained'});assert.match(stale,/no longer in the recent map history/);assert.doesNotMatch(stale,/This case was delivered/);
 assert.equal(JSON.stringify(s),before);assert.equal(JSON.stringify(model),modelBefore);w.close();
});
