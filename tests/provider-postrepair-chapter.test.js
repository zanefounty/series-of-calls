const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications');

const customerId='starter-customer';
const buy=(state,request)=>{const quote=SOC.provider.quote(state,request);assert.deepEqual(quote.blockers,[]);return SOC.dispatch(state,{type:'provider',command:{...quote.request,quoteRevision:quote.atRevision}});};
function repaired(){
 let state=SOC.create({experience:'campaign',opening:'win',seed:1});
 state=buy(state,{action:'plan',offerId:'starter',planId:'swift'});
 while(!state.providerCampaign.incidents.some(row=>row.status==='active'))state=SOC.dispatch(state,{type:'advance',minutes:1});
 const incident=state.providerCampaign.incidents.find(row=>row.status==='active');
 state=buy(state,{action:'respond-incident',incidentId:incident.id,operationId:'repair'});
 while(!state.providerCampaign.incidents.some(row=>row.id===incident.id&&row.status==='resolved'))state=SOC.dispatch(state,{type:'advance',minutes:1});
 return state;
}

test('the 15-minute forecast compares paid cover with shared-cash exposure using the same actual workload',()=>{
 const original=repaired(),before=JSON.stringify(original),start=SOC.provider.inspect(original).postRepairChapter;
 assert.deepEqual([start.from,start.to,start.remainingMinutes,start.offered,start.cover],[25,40,18,0,null]);
 assert.equal(JSON.stringify(original),before,'forecast inspection cannot create work or money');
 const current=SOC.dispatch(original,{type:'advance',minutes:start.to-original.clock});
 const funded=buy(original,{action:'operation',operationId:'bpo',customerId}),covered=SOC.dispatch(funded,{type:'advance',minutes:start.to-funded.clock});
 const a=SOC.provider.inspect(current).postRepairChapter,b=SOC.provider.inspect(covered).postRepairChapter;
 assert.deepEqual([a.offered,b.offered],[7,7],'both strategies face the same authored arrivals');
 assert.deepEqual([a.onTime,a.waiting,b.onTime,b.waiting],[4,3,5,2],'paid handling changes observed queue outcomes');
 assert.equal(a.cover,null);assert.equal(b.cover.status,'complete');
 assert.equal(current.business.balance.cash-covered.business.balance.cash,30000,'BPO setup was paid once');
 const currentBill=SOC.dispatch(current,{type:'advance',minutes:20}).providerCampaign.customers[0].history.at(-1);
 const coverBill=SOC.dispatch(covered,{type:'advance',minutes:20}).providerCampaign.customers[0].history.at(-1);
 assert.equal(currentBill.due,coverBill.due);assert.equal(currentBill.completedOnTime,coverBill.completedOnTime);
 assert.ok(coverBill.wholesale>currentBill.wholesale,'cover creates a real recurring exposure');
});

test('forecast and paid cover survive restore and worker continuation without changing old saves',()=>{
 const state=repaired(),quote=SOC.provider.quote(state,{action:'operation',operationId:'bpo',customerId});
 const funded=SOC.dispatch(state,{type:'provider',command:{...quote.request,quoteRevision:quote.atRevision}});
 const saved=SOC.restore(JSON.stringify(funded)),command={type:'advance',minutes:18},worker=new Function(`${SOC.workerSource()}\nreturn SOC;`)();
 assert.deepEqual(saved,funded);
 assert.deepEqual(worker.dispatch(SOC.restore(JSON.stringify(saved)),command),SOC.dispatch(saved,command));
 assert.equal(SOC.provider.inspect(SOC.create({experience:'campaign',seed:1})).postRepairChapter,null);
});

test('selected customer offers costed BPO cover and a clear current-team choice',()=>{
 const state=repaired(),model=SOC.provider.inspect(state),quote=SOC.provider.quote(state,{action:'operation',operationId:'bpo',customerId});
 model.contextualOperations=[{...model.operations.find(row=>row.id==='bpo'),quote}];
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),w=dom.window;
 const source=file=>fs.readFileSync(path.join(__dirname,'..','src',file),'utf8');
 try{
  for(const file of ['game/93-ui/70-provider-hud.js','game/93-ui/75-provider-panels.js','game/96-map/90-service-scene.js','game/96-map/95-provider-canvas.js'])w.eval(source(file));
  const html=w.SOCProviderPanels.inspector(model,{selection:{customerId}});
  assert.match(html,/The next 15 minutes/);
  assert.match(html,/BPO cover: A\$300 setup, A\$180 per period, 6 minutes to deliver/);
  assert.match(html,/data-provider-action="operation" data-operation="bpo"/);
  assert.match(html,/data-provider-action="speed" data-provider-value="8"/);
  assert.equal(SOC.provider.inspect(state).postRepairChapter.offered,0,'rendering does not create arrivals');
 }finally{w.close();}
});
