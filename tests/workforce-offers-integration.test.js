const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const send=(s,type,command)=>SOC.dispatch(s,{type,command});
const offer=(s,action,fields={})=>send(s,'workforce-offers',{action,...fields});
const tick=(s,minutes=1)=>SOC.dispatch(s,{type:'advance',minutes});
const report=s=>SOC.calculate(s).workforceOffers;
const integration={id:'queueberry-wfm-workforce',tenant:'wfm-customer',offerId:'queueberry-wfm-standard',offerVersion:'1.0',resource:'people'};
const forecast={channel:'voice',skill:'service',language:'en',horizon:60,method:'mean'};
function base(scenario='enterprise',operator='player'){
 let s=SOC.create({scenario,tenant:'wfm-customer'});
 for(const c of SOC.reference(s))s=SOC.dispatch(s,c);
 s=SOC.dispatch(s,{type:'configure',id:'people',config:{operator,people:2,entitlements:2,skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440}});
 s=SOC.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'service'}]}});
 s=tick(s);s=send(s,'business',{action:'start'});s=send(s,'workforce',{action:'start'});return tick(s);
}
function pending(s=base(),units=1){s=offer(s,'start');s=offer(s,'order',{tenant:s.tenant,units});return offer(s,'integrate',integration);}
function observed(s,available=true){return offer(s,'observe-integration',{supplierAvailable:true,applicationAvailable:available});}
function licensed(s=base(),units=1){s=tick(pending(s,units));s=observed(s);s=offer(s,'test-integration');return offer(s,'bind-person',{person:'agent-01'});}
function unchangedFailure(s,command,error){const before=JSON.stringify(s);assert.throws(()=>SOC.dispatch(s,command),error);assert.equal(JSON.stringify(s),before);}
function rejectsSave(s,edit,error){const original=JSON.stringify(s),bad=structuredClone(s);edit(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)),error);assert.equal(JSON.stringify(s),original);}
function twoCalls(s){for(const caseId of ['wfm-first','wfm-second'])s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId});s=tick(s);const calls=s.interactions.filter(i=>i.caseId==='wfm-first'||i.caseId==='wfm-second');assert.deepEqual(calls.map(i=>i.phase),['handling','handling']);assert.deepEqual(calls.map(i=>i.agent),['agent-01','agent-02']);assert.equal(new Set(calls.map(i=>i.workforceAssignment)).size,2);s=tick(s,6);assert.ok(s.interactions.filter(i=>i.caseId==='wfm-first'||i.caseId==='wfm-second').every(i=>i.phase==='resolved'));return s;}

test('workforce offer dispatch stages prerequisites, provisioning and separately measured integration before binding',()=>{
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

test('workforce offer commands atomically reject wrong tenant, version, resource, support owner and unknown roster identity',()=>{
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

test('one licensed forecast person neither creates nor removes actual contact seats and manual routing remains valid',()=>{
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

test('same-clock new observation invalidates a passed test and requires explicit retest and rebind',()=>{
 let s=licensed();s=offer(s,'forecast',forecast);const old=structuredClone(s.workforceOffers.integration.tests[0]),clock=s.clock;
 s=observed(s,false);assert.equal(s.clock,clock);assert.equal(report(s).integration.currentTest,null);assert.equal(report(s).integration.bindings[0].eligible,false);assert.equal(report(s).integration.forecasts[0].stale,true);
 unchangedFailure(s,{type:'workforce-offers',command:{action:'forecast',...forecast}},/WORKFORCE_OFFER_INTEGRATION_STALE/);
 s=observed(s);assert.equal(report(s).integration.currentTest,null,'a new positive observation does not revive the old test');s=offer(s,'test-integration');assert.equal(report(s).integration.bindings[0].eligible,false);
 s=offer(s,'bind-person',{person:'agent-01'});assert.equal(report(s).integration.bindings[0].eligible,true);assert.equal(s.workforceOffers.integration.bindingHistory.length,1);assert.deepEqual(s.workforceOffers.integration.tests[0],old);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('actual people reconfiguration stales scoped tests while save history survives explicit repair',()=>{
 let s=licensed();const previous=structuredClone(s.workforceOffers.integration.tests[0]),generation=s.resources.people.generation;
 s=SOC.dispatch(s,{type:'configure',id:'people',config:{handlingMinutes:4}});assert.equal(s.resources.people.generation,generation+1);assert.equal(report(s).integration.currentTest,null);assert.equal(report(s).integration.bindings[0].eligible,false);
 unchangedFailure(s,{type:'workforce-offers',command:{action:'bind-person',person:'agent-01'}},/WORKFORCE_OFFER_(INTEGRATION_STALE|PEOPLE_RESOURCE_NOT_READY)/);
 s=tick(s);assert.equal(report(s).integration.currentTest,null);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=observed(s);s=offer(s,'test-integration');s=offer(s,'bind-person',{person:'agent-01'});assert.equal(report(s).integration.bindings[0].eligible,true);assert.equal(s.workforceOffers.integration.bindings[0].resourceGeneration,generation+1);assert.deepEqual(s.workforceOffers.integration.tests[0],previous);
});

test('offer invoices post once per prepaid 60-minute period and cancellation waits for the paid boundary',()=>{
 let s=licensed();const activation=s.clock,invoice=structuredClone(s.workforceOffers.costRecords[0]);assert.equal(invoice.periodStart,activation);assert.equal(invoice.cents,4200);assert.equal(invoice.unit,'agent');assert.equal(invoice.currency,'AUD');assert.equal(invoice.periodMinutes,60);assert.equal(s.business.externalInvoices[0].source,'workforce-offers');assert.equal(s.business.ledger.filter(r=>r.externalId===invoice.id).length,1);
 s=tick(s,59);assert.equal(s.workforceOffers.costRecords.length,1);s=tick(s);assert.equal(s.workforceOffers.costRecords.length,2);assert.equal(s.workforceOffers.costRecords[1].periodStart,activation+60);
 const command={type:'workforce-offers',requestId:'wfm-cancel-once',command:{action:'order',tenant:s.tenant,units:0}};s=SOC.dispatch(s,command);assert.deepEqual(SOC.dispatch(s,command),s);
 s=tick(s,59);assert.equal(s.workforceOffers.effective.units,1);s=tick(s);assert.equal(s.workforceOffers.effective.units,0);assert.equal(s.workforceOffers.nextInvoiceAt,null);assert.equal(s.workforceOffers.costRecords.length,2);assert.equal(s.business.externalInvoices.length,2);
 s=offer(s,'order',{tenant:s.tenant,units:1});s=tick(s);assert.equal(s.workforceOffers.costRecords.at(-1).id,'queueberry-wfm-invoice-3');assert.equal(s.workforceOffers.costRecords.at(-1).periodStart,activation+121);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('workforce offer saves reject contradictory test, binding, forecast and invoice evidence',()=>{
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

test('workforce offer imported chronology cannot defer billing or bind before its retained test',()=>{
 const s=licensed();for(const edit of [
  x=>x.workforceOffers.nextInvoiceAt=x.clock+999,
  x=>x.workforceOffers.integration.observations[0].observedAt=x.clock+1,
  x=>x.workforceOffers.integration.tests[0].testedAt=x.clock+1,
  x=>x.workforceOffers.integration.bindings[0].boundAt=0
 ])rejectsSave(s,edit,/INVALID_WORKFORCE_OFFER/);
});

test('workforce offer invoices coexist with transport and cannot bypass either source reconciliation',()=>{
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

test('full-root workforce offer calculation is pure and dispatch/save are worker-equivalent',()=>{
 const s=licensed(),before=JSON.stringify(s);assert.deepEqual(SOC.calculate(s),SOC.calculate(s));assert.equal(JSON.stringify(s),before);assert.deepEqual(SOC.restore(before),s);
 const commands=[{type:'workforce-offers',command:{action:'forecast',...forecast}},{type:'workforce-offers',command:{action:'order',tenant:s.tenant,units:0}},{type:'advance',minutes:60}];
 let current=s;const sandbox={postMessage:r=>{sandbox.result=r;}};vm.createContext(sandbox);vm.runInContext(SOC.workerSource(),sandbox);
 for(const [id,command] of commands.entries()){sandbox.onmessage({data:{id,state:current,command}});assert.equal(sandbox.result.error,undefined);const expected=SOC.dispatch(current,command);assert.deepEqual(JSON.parse(JSON.stringify(sandbox.result.state)),expected);current=expected;}
 assert.equal(current.workforceOffers.effective.units,0);assert.equal(current.workforceOffers.costRecords.length,1);
});


test('pending cancellation cannot be imported with an earlier unpaid effective boundary',()=>{
 const s=offer(licensed(),'order',{tenant:'wfm-customer',units:0});assert.equal(s.workforceOffers.provisioning.due,s.workforceOffers.nextInvoiceAt);
 rejectsSave(s,x=>{x.workforceOffers.provisioning.due=x.clock+1;},/INVALID_WORKFORCE_OFFER/);
});

test('customer-controlled workforce rejects vendor administration without mutating its roster',()=>{
 const s=base('enterprise','customer');assert.equal(s.workforceOps.operator,'customer');unchangedFailure(s,{type:'workforce-offers',command:{action:'start'}},/WORKFORCE_CUSTOMER_CONTROLLED/);
});

test('actual business ledger eviction preserves an older workforce invoice and import history',()=>{
 let s=licensed(base('government'));for(const c of SOC.reference(s))s=SOC.dispatch(s,c);assert.equal(SOC.assess(s).passed,true);
 const retained=structuredClone(s.workforceOffers.costRecords[0]),invoice=s.business.externalInvoices.find(r=>r.id===retained.id);
 assert.ok(s.business.ledger.some(r=>r.id===invoice.entryId));for(let n=0;n<1001;n++)s=send(s,'business',{action:'qualify',sector:'government'});
 assert.equal(s.business.ledger.length,1000);assert.ok(s.business.ledgerPrunedThrough>=Number(invoice.entryId.slice(6)));assert.equal(s.business.ledger.some(r=>r.id===invoice.entryId),false);
 assert.deepEqual(s.workforceOffers.costRecords[0],retained);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 rejectsSave(s,x=>{delete x.business.ledgerPrunedThrough;},/INVOICE|BILLING/);
});
