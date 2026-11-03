const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications');
const dispatch=(s,type,command)=>E.dispatch(s,{type,command});
const tick=(s,minutes=1)=>E.dispatch(s,{type:'advance',minutes});
function ready(scenario='enterprise') {let s=E.create({scenario});for(const c of E.reference(s).filter(c=>c.type==='configure'))s=E.dispatch(s,c);return tick(s);}
function add(s,id,kind){return E.dispatch(s,{type:'add',id,kind});}
function order(s,offer,resources,pool){const p=E.business.offers[offer];return dispatch(s,'business',{action:'order',offer,quantity:p.minimum,unit:p.unit,currency:'AUD',resources,sell:true,...(pool?{allowancePool:pool}:{})});}
const call=s=>E.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'metered-case'});
test('AC-SOC-402 live voice minutes consume the routed contract pool and replay in the worker',()=>{
 let s=add(ready(),'unused-phone','uc');s=dispatch(s,'business',{action:'start'});s=dispatch(s,'business',{action:'allowancePool',id:'voice-pool',customer:'customer',owner:'orchard-msp',currency:'AUD',unit:'minute',periodMinutes:60,allowance:8});
 s=order(s,'workplace',['unused-phone'],'voice-pool');s=order(s,'workplace',['phone'],'voice-pool');s=tick(s,2);s=call(s);
 const before=JSON.stringify(s),expected=tick(s,2);assert.equal(expected.business.contracts[0].usage,0);assert.equal(expected.business.contracts[1].usage,2);assert.equal(expected.business.allowancePools[0].consumed,2);
 E.calculate(s);E.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(E.restore(JSON.stringify(expected)),expected);
 let result;const context={postMessage:x=>result=x};vm.createContext(context);vm.runInContext(E.workerSource(),context);context.onmessage({data:{id:1,state:s,command:{type:'advance',minutes:2}}});assert.deepEqual(JSON.parse(JSON.stringify(result.state)),expected);
 let unbound=dispatch(s,'business',{action:'cancel',contract:s.business.contracts[1].id});unbound=tick(unbound);assert.equal(unbound.business.contracts[0].usage,0,'no fallback to unrelated active contract');
});
test('AC-SOC-403 direct and delayed message acceptance charge only bound resources once',()=>{
 for(const delayed of [false,true]){
  let s=ready('smb');for(const [id,kind] of [['other-channel','channel'],['other-workflow','workflow'],['other-crm','crm']])s=add(s,id,kind);
  s=dispatch(s,'business',{action:'start'});s=dispatch(s,'business',{action:'allowancePool',id:'digital-pool',customer:'customer',owner:'orchard-msp',currency:'AUD',unit:'message',periodMinutes:60,allowance:8});s=order(s,'messaging',['other-channel','other-workflow','other-crm'],'digital-pool');s=order(s,'messaging',['messages','engage','cases'],'digital-pool');if(delayed)s=dispatch(s,'operations',{action:'start'});s=tick(s,2);
  s=E.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'service',caseId:'digital-meter'});if(delayed){assert.equal(s.business.contracts[1].usage,0);s=tick(s,4);}
  assert.equal(s.business.contracts[0].usage,0);assert.equal(s.business.contracts[1].usage,1);s=tick(s,3);assert.equal(s.business.contracts[1].usage,1,'receipt and handling do not bill acceptance again');
 }
});
test('AC-SOC-404 processing work meters its actual processor and survives faults without billing blocked work',()=>{
 let s=add(ready(),'unused-processor','processor');s=E.dispatch(s,{type:'configure',id:'speech',config:{capacity:20}});s=E.dispatch(s,{type:'configure',id:'unused-processor',config:{capacity:20}});s=dispatch(s,'information',{action:'start'});s=dispatch(s,'business',{action:'start'});s=dispatch(s,'business',{action:'allowancePool',id:'processing-pool',customer:'customer',owner:'orchard-msp',currency:'AUD',unit:'processor-minute',periodMinutes:60,allowance:8});s=order(s,'processing',['unused-processor'],'processing-pool');s=order(s,'processing',['speech'],'processing-pool');s=E.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});s=tick(s,2);s=call(s);assert.equal(s.information.jobs.length,1);
 s=E.dispatch(s,{type:'fault',id:'speech',fault:'OUTAGE'});s=tick(s,2);assert.equal(s.business.contracts[1].usage,0);assert.equal(s.information.jobs[0].status,'blocked');
 s=E.dispatch(s,{type:'fault',id:'speech',fault:null});s=tick(s,8);assert.equal(s.information.jobs[0].status,'complete');assert.equal(s.business.contracts[0].usage,0);assert.ok(s.business.contracts[1].usage>0);assert.deepEqual(E.restore(JSON.stringify(s)),s);
});
test('AC-SOC-405 legacy portfolio and campaign roots migrate only on owned saves and successful dispatch',()=>{
 let s=dispatch(E.create({mode:'sandbox'}),'business',{action:'start'});s=dispatch(s,'campaign',{action:'start'});s=dispatch(s,'portfolio',{action:'start'});s=dispatch(s,'portfolio',{action:'addcustomer',id:'first',tenant:'first-tenant',name:'First',scenario:'smb',market:'au-sydney'});s=dispatch(s,'portfolio',{action:'dispatchcustomer',customerId:'first',command:{type:'business',command:{action:'start'}}});s=dispatch(s,'campaign',{action:'select-track',track:'enterprise'});
 const legacy=structuredClone(s);delete legacy.portfolio.customers[0].root.business.allowancePools;delete legacy.campaign.snapshots.smb.root.business.allowancePools;const before=JSON.stringify(legacy);E.validateState(legacy);assert.equal(JSON.stringify(legacy),before);assert.throws(()=>E.dispatch(legacy,{type:'bogus'}),/INVALID_COMMAND/);assert.equal(JSON.stringify(legacy),before);
 for(const migrated of [E.restore(before),tick(legacy)]){assert.deepEqual(migrated.portfolio.customers[0].root.business.allowancePools,[]);assert.deepEqual(migrated.campaign.snapshots.smb.root.business.allowancePools,[]);}assert.equal(JSON.stringify(legacy),before);
});
