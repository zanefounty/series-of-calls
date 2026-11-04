const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {SOC,send,offer,tick,forecast,base,pending,observed,licensed,journey}=require('./lib/workforce-offer-fixture');
const report=s=>SOC.calculate(s).workforceOffers;
const integration={id:'queueberry-wfm-workforce',tenant:'wfm-customer',offerId:'queueberry-wfm-standard',offerVersion:'1.0',resource:'people'};
function unchangedFailure(s,command,error){const before=JSON.stringify(s);assert.throws(()=>SOC.dispatch(s,command),error);assert.equal(JSON.stringify(s),before);}
function rejectsSave(s,edit,error){const original=JSON.stringify(s),bad=structuredClone(s);edit(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)),error);assert.equal(JSON.stringify(s),original);}
function twoCalls(s){for(const caseId of ['wfm-first','wfm-second'])s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId});s=tick(s);const calls=s.interactions.filter(i=>i.caseId==='wfm-first'||i.caseId==='wfm-second');assert.deepEqual(calls.map(i=>i.phase),['handling','handling']);assert.deepEqual(calls.map(i=>i.agent),['agent-01','agent-02']);assert.equal(new Set(calls.map(i=>i.workforceAssignment)).size,2);s=tick(s,6);assert.ok(s.interactions.filter(i=>i.caseId==='wfm-first'||i.caseId==='wfm-second').every(i=>i.phase==='resolved'));return s;}

test('AC-SOC-512 workforce offer dispatch stages prerequisites, provisioning and separately measured integration before binding',()=>{
 const fresh=SOC.create({scenario:'enterprise',tenant:'wfm-customer'});unchangedFailure(fresh,{type:'workforce-offers',command:{action:'start'}},/WORKFORCE_OFFER_PREREQUISITES/);
 let s=pending();assert.equal(s.workforceOffers.effective,null);assert.equal(s.workforceOffers.integration.effective,null);assert.equal(s.business.externalInvoices,undefined);
 unchangedFailure(s,{type:'workforce-offers',command:{action:'bind-person',person:'agent-01'}},/WORKFORCE_OFFER_UNITS_NOT_EFFECTIVE/);
 s=tick(s);assert.equal(s.workforceOffers.effective.units,1);assert.equal(s.workforceOffers.integration.effective.resource,'people');
 s=offer(s,'test-integration');assert.equal(s.workforceOffers.integration.tests.at(-1).status,'failed');assert.equal(report(s).integration.currentTest,null);
 s=observed(s,false);s=offer(s,'test-integration');assert.equal(s.workforceOffers.integration.tests.at(-1).status,'failed');
 unchangedFailure(s,{type:'workforce-offers',command:{action:'bind-person',person:'agent-01'}},/WORKFORCE_OFFER_INTEGRATION_STALE/);
 s=observed(s);s=offer(s,'test-integration');s=offer(s,'bind-person',{person:'agent-01'});assert.equal(report(s).integration.bindings[0].eligible,true);
 assert.deepEqual(s.business.organisations.queueberry.roles,['vendor']);assert.equal(s.business.organisations.queueberry.aliasStatus,'proposed-owner-review-required');
});

test('AC-SOC-513 workforce offer commands atomically reject wrong tenant, version, resource, support owner and unknown roster identity',()=>{
 const s=licensed();for(const command of [
  {action:'order',tenant:'other',units:2},
  {action:'integrate',...integration,tenant:'other'},
  {action:'integrate',...integration,offerVersion:'9.9'},
  {action:'integrate',...integration,resource:'service'},
  {action:'bind-person',person:'agent-02',supportOwner:'orchard-msp'},
  {action:'bind-person',person:'agent-99'}
 ])unchangedFailure(s,{type:'workforce-offers',command},/INVALID_WORKFORCE_OFFER|WORKFORCE_OFFER_PERSON_NOT_IN_TENANT_ROSTER/);
 unchangedFailure(s,{type:'workforce-offers',command:{action:'bind-person',person:'agent-02'}},/WORKFORCE_OFFER_UNITS_EXCEEDED/);
});

test('AC-SOC-514 one licensed forecast person neither creates nor removes actual contact seats and manual routing remains valid',()=>{
 const manual=twoCalls(base());assert.equal(manual.workforceOffers,undefined);
 let s=licensed();const actual=JSON.stringify({resource:s.resources.people,roster:s.workforceOps.roster});
 s=send(s,'workforce',{action:'arrival',channel:'voice',skill:'service',language:'en',count:40,sampleMinutes:60});
 s=send(s,'workforce',{action:'staffing-forecast',...forecast});s=offer(s,'forecast',forecast);
 const scoped=s.workforceOffers.integration.forecasts.at(-1),all=s.workforceOps.forecasts.at(-1);
 assert.deepEqual(scoped.coveredPeople,['agent-01']);assert.equal(scoped.arrivals,40);assert.equal(scoped.projectedCapacity,15);assert.equal(scoped.projectedGap,25);assert.equal(all.projectedCapacity,30);assert.equal(all.projectedGap,10);
 assert.equal(JSON.stringify({resource:s.resources.people,roster:s.workforceOps.roster}),actual);
 s=send(s,'workforce',{action:'presence',person:'agent-01',state:'offline'});s=offer(s,'forecast',forecast);assert.equal(s.workforceOffers.integration.forecasts.at(-1).projectedCapacity,0,'a licence cannot make an absent person work');assert.equal(scoped.projectedCapacity,15,'the earlier forecast remains historical evidence');
 s=send(s,'workforce',{action:'presence',person:'agent-01',state:'available'});s=offer(s,'forecast',forecast);assert.equal(s.workforceOffers.integration.forecasts.at(-1).projectedCapacity,15);
 s=twoCalls(s);assert.equal(s.workforceOffers.integration.bindings.length,1);assert.deepEqual(s.workforceOps.assignments.map(a=>a.person),['agent-01','agent-02']);
});

test('AC-SOC-515 same-clock new observation invalidates a passed test and requires explicit retest and rebind',()=>{
 let s=licensed();s=offer(s,'forecast',forecast);const old=structuredClone(s.workforceOffers.integration.tests[0]),clock=s.clock;
 s=observed(s,false);assert.equal(s.clock,clock);assert.equal(report(s).integration.currentTest,null);assert.equal(report(s).integration.bindings[0].eligible,false);assert.equal(report(s).integration.forecasts[0].stale,true);
 unchangedFailure(s,{type:'workforce-offers',command:{action:'forecast',...forecast}},/WORKFORCE_OFFER_INTEGRATION_STALE/);
 s=observed(s);assert.equal(report(s).integration.currentTest,null,'a new positive observation does not revive the old test');s=offer(s,'test-integration');assert.equal(report(s).integration.bindings[0].eligible,false);
 s=offer(s,'bind-person',{person:'agent-01'});assert.equal(report(s).integration.bindings[0].eligible,true);assert.equal(s.workforceOffers.integration.bindingHistory.length,1);assert.deepEqual(s.workforceOffers.integration.tests[0],old);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('AC-SOC-516 actual people reconfiguration stales scoped tests while save history survives explicit repair',()=>{
 let s=licensed();const previous=structuredClone(s.workforceOffers.integration.tests[0]),generation=s.resources.people.generation;
 s=SOC.dispatch(s,{type:'configure',id:'people',config:{handlingMinutes:4}});assert.equal(s.resources.people.generation,generation+1);assert.equal(report(s).integration.currentTest,null);assert.equal(report(s).integration.bindings[0].eligible,false);
 unchangedFailure(s,{type:'workforce-offers',command:{action:'bind-person',person:'agent-01'}},/WORKFORCE_OFFER_(INTEGRATION_STALE|PEOPLE_RESOURCE_NOT_READY)/);
 s=tick(s);assert.equal(report(s).integration.currentTest,null);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=observed(s);s=offer(s,'test-integration');s=offer(s,'bind-person',{person:'agent-01'});assert.equal(report(s).integration.bindings[0].eligible,true);assert.equal(s.workforceOffers.integration.bindings[0].resourceGeneration,generation+1);assert.deepEqual(s.workforceOffers.integration.tests[0],previous);
});

test('AC-SOC-517 offer invoices post once per prepaid 60-minute period and cancellation waits for the paid boundary',()=>{
 let s=licensed();const activation=s.clock,invoice=structuredClone(s.workforceOffers.costRecords[0]);assert.equal(invoice.periodStart,activation);assert.equal(invoice.cents,4200);assert.equal(invoice.unit,'agent');assert.equal(invoice.currency,'AUD');assert.equal(invoice.periodMinutes,60);assert.equal(s.business.externalInvoices[0].source,'workforce-offers');assert.equal(s.business.ledger.filter(r=>r.externalId===invoice.id).length,1);
 s=tick(s,59);assert.equal(s.workforceOffers.costRecords.length,1);s=tick(s);assert.equal(s.workforceOffers.costRecords.length,2);assert.equal(s.workforceOffers.costRecords[1].periodStart,activation+60);
 const command={type:'workforce-offers',requestId:'wfm-cancel-once',command:{action:'order',tenant:s.tenant,units:0}};s=SOC.dispatch(s,command);assert.deepEqual(SOC.dispatch(s,command),s);
 s=tick(s,59);assert.equal(s.workforceOffers.effective.units,1);s=tick(s);assert.equal(s.workforceOffers.effective.units,0);assert.equal(s.workforceOffers.nextInvoiceAt,null);assert.equal(s.workforceOffers.costRecords.length,2);assert.equal(s.business.externalInvoices.length,2);
 s=offer(s,'order',{tenant:s.tenant,units:1});s=tick(s);assert.equal(s.workforceOffers.costRecords.at(-1).id,'queueberry-wfm-invoice-3');assert.equal(s.workforceOffers.costRecords.at(-1).periodStart,activation+121);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('AC-SOC-518 workforce offer saves reject contradictory test, binding, forecast and invoice evidence',()=>{
 let s=licensed();s=offer(s,'forecast',forecast);
 for(const edit of [
  x=>x.workforceOffers.integration.tests[0].tenant='other',
  x=>x.workforceOffers.integration.tests[0].supplierAvailable=false,
  x=>x.workforceOffers.integration.bindings[0].testId='missing-test',
  x=>x.workforceOffers.integration.bindings[0].supportOwner='orchard-msp',
  x=>x.workforceOffers.integration.bindings[0].person='agent-99',
  x=>x.workforceOffers.integration.forecasts[0].coveredPeople.push('agent-02'),
  x=>x.workforceOffers.costRecords[0].cents++,
  x=>x.business.externalInvoices[0].cents++,
  x=>x.business.externalInvoices[0].source='transport'
 ])rejectsSave(s,edit,/INVALID_WORKFORCE_OFFER/);
});

test('AC-SOC-519 workforce offer imported chronology cannot defer billing or bind before its retained test',()=>{
 const s=licensed();for(const edit of [
  x=>x.workforceOffers.nextInvoiceAt=x.clock+999,
  x=>x.workforceOffers.integration.observations[0].observedAt=x.clock+1,
  x=>x.workforceOffers.integration.tests[0].testedAt=x.clock+1,
  x=>x.workforceOffers.integration.bindings[0].boundAt=0
 ])rejectsSave(s,edit,/INVALID_WORKFORCE_OFFER/);
});

test('AC-SOC-520 workforce offer invoices coexist with transport and cannot bypass either source reconciliation',()=>{
 let s=send(licensed(),'transport',{action:'start'});for(const id of ['office','branch'])s=send(s,'transport',{action:'site',id,config:{name:id,region:'AU',domain:id+'-power'}});
 s=send(s,'transport',{action:'link',id:'wfm-owned',config:{from:'office',to:'branch',mode:'owned',capacityMbps:1,latencyMs:10,domain:'wfm-trench',leadMinutes:1,setupCents:100,periodCents:30,contract:null}});s=tick(s,2);
 assert.ok(s.transport.ledger.length>0);assert.ok(s.business.externalInvoices.some(r=>r.source==='workforce-offers'));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 rejectsSave(s,x=>{x.business.externalInvoices.find(r=>r.source!=='workforce-offers').source='workforce-offers';},/INVOICE|BILLING/);
 rejectsSave(s,x=>{x.business.externalInvoices.find(r=>r.source==='workforce-offers').source='transport';},/INVOICE|BILLING/);
 rejectsSave(s,x=>{x.business.ledger.find(r=>r.externalId==='queueberry-wfm-invoice-1').cents++;},/INVOICE|BILLING/);
 rejectsSave(s,x=>{x.business.ledger=x.business.ledger.filter(r=>r.externalId!=='queueberry-wfm-invoice-1');},/INVOICE|BILLING/);
 rejectsSave(s,x=>{x.business.ledger=x.business.ledger.filter(r=>r.externalId!=='queueberry-wfm-invoice-1');x.business.ledgerPrunedThrough=1;},/INVOICE|BILLING|PRUNING/);
 const without=structuredClone(s);delete without.workforceOffers;assert.throws(()=>SOC.restore(JSON.stringify(without)),/INVOICE|BILLING|WORKFORCE_OFFER/);
});

test('AC-SOC-521 full-root workforce offer calculation is pure and dispatch/save are worker-equivalent',()=>{
 const s=licensed(),before=JSON.stringify(s);assert.deepEqual(SOC.calculate(s),SOC.calculate(s));assert.equal(JSON.stringify(s),before);assert.deepEqual(SOC.restore(before),s);
 const commands=[{type:'workforce-offers',command:{action:'forecast',...forecast}},{type:'workforce-offers',command:{action:'order',tenant:s.tenant,units:0}},{type:'advance',minutes:60}];
 let current=s;const sandbox={postMessage:r=>{sandbox.result=r;}};vm.createContext(sandbox);vm.runInContext(SOC.workerSource(),sandbox);
 for(const [id,command] of commands.entries()){sandbox.onmessage({data:{id,state:current,command}});assert.equal(sandbox.result.error,undefined);const expected=SOC.dispatch(current,command);assert.deepEqual(JSON.parse(JSON.stringify(sandbox.result.state)),expected);current=expected;}
 assert.equal(current.workforceOffers.effective.units,0);assert.equal(current.workforceOffers.costRecords.length,1);
});


test('AC-SOC-522 pending cancellation cannot be imported with an earlier unpaid effective boundary',()=>{
 const s=offer(licensed(),'order',{tenant:'wfm-customer',units:0});assert.equal(s.workforceOffers.provisioning.due,s.workforceOffers.nextInvoiceAt);
 rejectsSave(s,x=>{x.workforceOffers.provisioning.due=x.clock+1;},/INVALID_WORKFORCE_OFFER/);
});

test('AC-SOC-523 customer-controlled workforce rejects vendor administration without mutating its roster',()=>{
 const s=base('enterprise','customer');assert.equal(s.workforceOps.operator,'customer');unchangedFailure(s,{type:'workforce-offers',command:{action:'start'}},/WORKFORCE_CUSTOMER_CONTROLLED/);
});

test('AC-SOC-524 actual business ledger eviction preserves an older workforce invoice and import history',()=>{
 let s=licensed(base('government'));for(const c of SOC.reference(s))s=SOC.dispatch(s,c);assert.equal(SOC.assess(s).passed,true);
 s=send(s,'business',{action:'qualify',sector:'government'});s=send(s,'business',{action:'order',offer:'contact',quantity:1,unit:'agent',currency:'AUD',resources:['people','service'],customer:'customer',supportOwner:'orchard-msp',price:22000,sell:true});const contract=s.business.contracts.at(-1).id;for(let cycle=0;cycle<20;cycle++){if(s.business.contracts.find(x=>x.id===contract).status==='renewal')s=send(s,'business',{action:'renew',contract});for(let period=0;period<3;period++)s=tick(s,60);}s=send(s,'business',{action:'renew',contract});s=tick(s,60);assert.ok(s.business.balance.cash>1100000,'recurring synthetic government contract revenue funds later qualification costs');
 const retained=structuredClone(s.workforceOffers.costRecords[0]),invoice=s.business.externalInvoices.find(r=>r.id===retained.id);
 assert.ok(s.business.ledger.some(r=>r.id===invoice.entryId));for(let n=0;n<1001;n++)s=send(s,'business',{action:'qualify',sector:'government'});
 assert.equal(s.business.ledger.length,1000);assert.ok(s.business.ledgerPrunedThrough>=Number(invoice.entryId.slice(6)));assert.equal(s.business.ledger.some(r=>r.id===invoice.entryId),false);
 assert.deepEqual(s.workforceOffers.costRecords[0],retained);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 rejectsSave(s,x=>{delete x.business.ledgerPrunedThrough;},/INVOICE|BILLING/);
});


test('AC-SOC-525 BPO delegation expiry blocks offer administration and explicit renewed authority restores it',()=>{
 let s=base();s=send(s,'workforce',{action:'agreement',id:'wfm-initial-authority',resources:['workforce'],actions:['configure'],expires:s.clock+2});
 s=send(s,'workforce',{action:'roster',people:s.workforceOps.roster.desired,operator:'bpo'});s=tick(s);s=tick(pending(s));
 assert.equal(s.workforceOps.operator,'bpo');unchangedFailure(s,{type:'workforce-offers',command:{action:'observe-integration',supplierAvailable:true,applicationAvailable:true}},/WORKFORCE_DELEGATION_REQUIRED/);
 s=send(s,'workforce',{action:'agreement',id:'wfm-renewed-authority',resources:['workforce'],actions:['configure'],expires:s.clock+60});s=observed(s);s=offer(s,'test-integration');s=offer(s,'bind-person',{person:'agent-01'});assert.equal(report(s).integration.bindings[0].eligible,true);
});


test('AC-SOC-526 ready workforce offer imports require consistent desired and effective snapshots',()=>{
 const s=licensed();for(const edit of [
  x=>{x.workforceOffers.desired.units=2;},
  x=>{x.workforceOffers.integration.effective=null;},
  x=>{x.workforceOffers.effective=null;}
 ])rejectsSave(s,edit,/INVALID_WORKFORCE_OFFER/);
 const pendingChange=offer(s,'order',{tenant:s.tenant,units:2});assert.equal(pendingChange.workforceOffers.desired.units,2);assert.equal(pendingChange.workforceOffers.effective.units,1);assert.deepEqual(SOC.restore(JSON.stringify(pendingChange)),pendingChange,'pending state legitimately keeps a different older effective generation');
});


test('AC-SOC-527 public workforce journey replays four jurisdictions without injected poststate',()=>{
 for(const jurisdiction of ['AU','US','JP','EU'])for(const variant of ['success','recovery']){
  const j=journey({jurisdiction,variant});assert.equal(Object.hasOwn(j.options,'tenant'),false);let replay=SOC.create(j.options);for(const command of j.commands)replay=SOC.dispatch(replay,command);assert.deepEqual(replay,j.expectedState);
  assert.equal(replay.workforceOffers.effective.units,0);assert.equal(replay.workforceOffers.costRecords.length,2);assert.equal(replay.workforceOffers.integration.tests.some(t=>t.status==='failed'),variant==='recovery');assert.equal(replay.workforceOffers.integration.tests.at(-1).status,'passed');
  assert.deepEqual(replay.workforceOps.assignments.map(a=>a.person),['agent-01','agent-02']);assert.ok(replay.interactions.filter(i=>i.caseId==='wfm-first'||i.caseId==='wfm-second').every(i=>i.phase==='resolved'));assert.equal(replay.workforceOffers.integration.forecasts[0].projectedCapacity,15);assert.equal(replay.workforceOps.forecasts[0].projectedCapacity,30);
 }
 const explicit=journey({tenant:'explicit-customer',units:2,variant:'success',includeCalls:false,includeBilling:false});assert.equal(explicit.options.tenant,'explicit-customer');assert.equal(explicit.expectedState.workforceOffers.tenant,'explicit-customer');assert.equal(explicit.expectedState.workforceOffers.effective.units,2);assert.deepEqual(explicit.expectedState.workforceOffers.integration.forecasts[0].coveredPeople,['agent-01','agent-02']);assert.equal(explicit.expectedState.workforceOffers.integration.forecasts[0].projectedCapacity,30);
});


test('AC-SOC-530 workforce offer forecast weights observed duration and last-period uses only its contributing sample',()=>{
 let s=licensed();
 for(const observation of [{count:10,sampleMinutes:10},{count:20,sampleMinutes:50}])s=send(s,'workforce',{action:'arrival',channel:'voice',skill:'service',language:'en',...observation});
 s=offer(s,'forecast',forecast);const mean=s.workforceOffers.integration.forecasts.at(-1);assert.equal(mean.samples,2);assert.equal(mean.arrivals,30);assert.equal(mean.projectedCapacity,15);assert.equal(mean.projectedGap,15);
 s=offer(s,'forecast',{...forecast,method:'last-period'});const last=s.workforceOffers.integration.forecasts.at(-1);assert.equal(last.samples,1);assert.equal(last.arrivals,24);assert.equal(last.projectedCapacity,15);assert.equal(last.projectedGap,9);
 assert.equal(mean.arrivals,30);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
