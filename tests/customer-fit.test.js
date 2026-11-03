const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const Needs=SOC.customerNeeds;

function dispatch(s,type,command){return SOC.dispatch(s,{type,command});}
function tick(s,minutes){return SOC.dispatch(s,{type:'advance',minutes});}
function startCustomer(s,{id='customer-fit',segment=s.scenario,scale={employees:35,sites:1,seats:2,agents:2,rooms:0}}={}){
 s=dispatch(s,'customer-needs',{action:'start'});s=dispatch(s,'customer-needs',{action:'select',id,segment});s=dispatch(s,'customer-needs',{action:'configure',id,section:'scale',value:scale});
 s=tick(s,1);return s;
}
function order(s,offer,quantity,unit,resources,id='customer-fit'){
 return dispatch(s,'business',{action:'order',offer,quantity,unit,currency:'AUD',resources,customer:'customer',supportOwner:'orchard-msp',sell:true,customerProfile:id});
}
function fit(s,id='customer-fit'){const services=Object.fromEntries(Object.keys(s.resources).map(resource=>[resource,SOC.observe(s,resource)]));return Needs.evaluate(s,id,services);}
function purchased(s,{seat=2,agent=2,room=1,phoneCapacity=2}={}){
 s=SOC.create({scenario:'enterprise',jurisdiction:'AU'});
 s=SOC.dispatch(s,{type:'configure',id:'phone',config:{capacity:phoneCapacity}});
 s=startCustomer(s,{scale:{employees:35,sites:1,seats:seat,agents:agent,rooms:room}});
 s=dispatch(s,'business',{action:'start'});
 s=order(s,'workplace',seat,'seat',['phone']);
 if(agent)s=order(s,'contact',agent,'agent',['people','service']);
 if(room)s=order(s,'rooms',room,'room',['room']);
 s=tick(s,2);s=tick(s,60);return s;
}

test('AC-SOC-456 source-linked customer fit leaves unbound and incomplete evidence explicitly unproven',()=>{
 let s=SOC.create({scenario:'smb'});s=dispatch(s,'customer-needs',{action:'start'});s=dispatch(s,'customer-needs',{action:'select',id:'customer-fit',segment:'smb'});s=tick(s,1);
 const result=fit(s);assert.equal(result.customerScope,'unbound');assert.equal(result.measuredStatus,'unproven');assert.equal(result.completeFitStatus,'unproven');
 assert.ok(result.criteria.some(x=>x.id==='named-seat-capacity'&&x.status==='unproven'&&x.actual===null));assert.ok(result.criteria.some(x=>x.id==='monthly-customer-retail-cost'&&x.status==='unproven'));
 assert.ok(result.unprovenDimensions.includes('workload-outcomes'));assert.ok(result.unprovenDimensions.includes('customer-service-availability'));
});

test('AC-SOC-457 directly bound recurring subscriptions and effective typed resources meet seat, agent and room needs',()=>{
 const s=purchased(),result=fit(s),byId=Object.fromEntries(result.criteria.map(x=>[x.id,x]));
 assert.equal(result.profileGeneration,s.customerNeeds.profiles[0].effective.generation);assert.equal(result.customerScope,'bound-customer');assert.equal(result.measuredStatus,'met');assert.equal(result.completeFitStatus,'unproven');
 assert.deepEqual(['named-seat-capacity','agent-entitlement-capacity','room-subscription-capacity'].map(id=>[byId[id].status,byId[id].actual.value,byId[id].required.value]),[['met',2,2],['met',2,2],['met',1,1]]);
 assert.equal(byId['monthly-customer-retail-cost'].status,'unproven');assert.equal(byId['monthly-customer-retail-cost'].actual.unit,'cent/AUD/60-minute-training-period');
});

test('AC-SOC-458 alternative typed offers count unique effective resources and cap capacity by purchased quantity',()=>{
 let s=SOC.create({scenario:'enterprise'});s=SOC.dispatch(s,{type:'add',id:'dedicated-two',kind:'dedicated'});s=SOC.dispatch(s,{type:'configure',id:'phone',config:{capacity:4}});s=SOC.dispatch(s,{type:'configure',id:'dedicated-two',config:{capacity:4}});
 s=startCustomer(s,{scale:{employees:35,sites:1,seats:4,agents:0,rooms:0}});s=dispatch(s,'business',{action:'start'});s=order(s,'workplace',2,'seat',['phone']);s=order(s,'dedicated',2,'seat',['dedicated-two']);s=tick(s,2);s=tick(s,60);
 const seats=fit(s).criteria.find(x=>x.id==='named-seat-capacity');assert.equal(seats.status,'met');assert.equal(seats.actual.value,4);assert.deepEqual(seats.actual.resourceIds.sort(),['dedicated-two','phone']);
 s=SOC.dispatch(s,{type:'fault',id:'dedicated-two',fault:'OUTAGE'});const afterFault=fit(s).criteria.find(x=>x.id==='named-seat-capacity');assert.equal(afterFault.status,'unmet');assert.equal(afterFault.actual.value,2,'surplus UC capacity cannot subsidize an unavailable dedicated resource');
});

test('AC-SOC-459 known shortage blocks supported fit and a provisioned profile revision reevaluates against current resources',()=>{
 let s=purchased({seat:2,agent:2,room:1,phoneCapacity:2});
 s=dispatch(s,'customer-needs',{action:'configure',id:'customer-fit',section:'scale',value:{employees:35,sites:1,seats:3,agents:2,rooms:1}});
 const prior=fit(s);assert.equal(prior.profileGeneration,s.customerNeeds.profiles[0].effective.generation);assert.equal(prior.criteria.find(x=>x.id==='named-seat-capacity').status,'met');
 s=tick(s,1);const result=fit(s),seat=result.criteria.find(x=>x.id==='named-seat-capacity');assert.equal(result.profileGeneration,s.customerNeeds.profiles[0].effective.generation);assert.equal(seat.status,'unmet');assert.equal(seat.actual.value,2);assert.equal(seat.required.value,3);assert.ok(seat.actual.contracts.every(x=>x.orderedGeneration<result.profileGeneration));
});

test('AC-SOC-460 observed service unavailability is an unmet dependency outcome, not a passing configured capacity',()=>{
 let s=purchased();s=SOC.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});
 const serviceMap=Object.fromEntries(Object.keys(s.resources).map(resource=>[resource,SOC.observe(s,resource)]));
 const seat=Needs.evaluate(s,'customer-fit',serviceMap).criteria.find(x=>x.id==='named-seat-capacity');assert.equal(seat.status,'unmet');assert.deepEqual(seat.actual.unavailableResourceIds,['phone']);assert.equal(seat.actual.value,0);
});

test('AC-SOC-461 fit inspection is pure and serialized worker evaluator matches the same dispatched root',()=>{
 const s=purchased(),before=JSON.stringify(s),services=Object.fromEntries(Object.keys(s.resources).map(resource=>[resource,SOC.observe(s,resource)]));
 const first=Needs.evaluate(s,'customer-fit',services),second=Needs.evaluate(s,'customer-fit',services);assert.deepEqual(first,second);assert.equal(JSON.stringify(s),before);
 const box={};vm.createContext(box);vm.runInContext(SOC.workerSource()+';globalThis.workerSOC=SOC;',box);const worker=box.workerSOC,workerServices=Object.fromEntries(Object.keys(s.resources).map(resource=>[resource,worker.observe(s,resource)]));
 assert.deepEqual(JSON.parse(JSON.stringify(worker.customerNeeds.evaluate(s,'customer-fit',workerServices))),JSON.parse(JSON.stringify(first)));assert.equal(worker.customerNeeds.validate(s),true);
});
