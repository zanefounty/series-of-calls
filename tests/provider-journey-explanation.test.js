'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),J=require('../src/game/23-provider-journeys'),UI=require('../src/game/93-ui/79-provider-journeys');
test('AC-SOC-644 journey explanation separates real queue, handling, wrap, carrier occupancy and supplier usage without advancing or billing',()=>{
 let s=SOC.create({experience:'campaign',seed:73});
 for(const stage of ['base','carrier','partner']){const request={action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})},quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[]);s=SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});}
 let captured=false;
 for(let n=0;n<18;n++){
  s=SOC.dispatch(s,{type:'advance',minutes:1});const child=s.portfolio.customers[0].root;
  for(const job of s.providerCampaign.jobs.filter(j=>j.channel==='voice')){
   const i=child.interactions.find(i=>i.id===job.interactionId);if(!i||!i.trace.some(t=>t.code==='AGENT_ASSIGNED'))continue;
   const before=JSON.stringify(s),model=SOC.provider.inspect(s).customers[0].journeys.find(j=>j.id===job.id);if(!model)continue;
   const leg=model.lifecycle.legs[0],assigned=i.trace.find(t=>t.code==='AGENT_ASSIGNED'),queued=i.trace.find(t=>t.code==='ENQUEUED'),wrap=i.trace.find(t=>t.code==='WRAP_UP'),end=i.finishedAt??s.clock;
   assert.equal(leg.waitingMinutes,assigned.at-queued.at);assert.equal(leg.handlingMinutes,(wrap?.at??end)-assigned.at);assert.equal(leg.wrapMinutes,wrap?end-wrap.at:0);
   assert.equal(leg.carrierOccupied,['queued','handling'].includes(i.phase));assert.equal(model.lifecycle.supplierUsage.voiceMinutes,job.voiceMinutes);assert.equal(model.lifecycle.supplierUsage.costCents,job.voiceMinutes*SOC.provider.rules.plans.swift.voiceCents);
   for(let render=0;render<3;render++){assert.match(UI.render(model),/Supplier usage/);assert.match(UI.render(model),/customer pays the agreed service-period price/);}
   assert.equal(JSON.stringify(s),before);if(i.phase==='resolved')captured=true;
  }
 }
 assert.equal(captured,true,'a delivered autonomous voice journey was explained');
 const restored=SOC.restore(JSON.stringify(s)),command={type:'advance',minutes:1};let result;const context={postMessage:x=>result=x};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:1,state:restored,command}});assert.equal(result.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(result.state)),SOC.dispatch(s,command));
});
test('AC-SOC-645 journey timing retains transfer intervals and reports missing history without inventing time or charges',()=>{
 const trace=[{at:1,code:'ENQUEUED'},{at:3,code:'AGENT_ASSIGNED'},{at:5,code:'TRANSFER'},{at:6,code:'AGENT_ASSIGNED'},{at:9,code:'WRAP_UP'},{at:10,stage:'outcome',code:'RESOLVED'}],i={id:'i1',startedAt:1,finishedAt:10,channel:'voice',phase:'resolved',usageMinutes:7,trace},root={clock:10,interactions:[i]},job={caseId:'c1',interactionId:'i1',voiceMinutes:7,messageCharged:false},plan={voiceCents:2,messageCents:1};
 assert.deepEqual([J.leg(root,i).waitingMinutes,J.leg(root,i).handlingMinutes,J.leg(root,i).wrapMinutes],[3,5,1]);
 const truncated={...i,trace:trace.slice(1)};assert.equal(J.leg(root,truncated).waitingMinutes,null);
 const model=J.inspect({...root,interactions:[]},job,plan);assert.equal(model.missingInteractions,1);assert.equal(model.supplierUsage.costCents,14);assert.match(UI.render({lifecycle:model}),/no longer retained/);
 const context={};vm.createContext(context);vm.runInContext(J.source()+';globalThis.API=SOC_PROVIDER_JOURNEYS;',context);assert.deepEqual(JSON.parse(JSON.stringify(context.API.inspect(root,job,plan))),J.inspect(root,job,plan));
});
