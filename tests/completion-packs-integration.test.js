const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const S=require('../src/game/55-communications');
const pack=(s,type,action,fields={})=>S.dispatch(s,{type,command:{action,...fields}});
const tick=(s,minutes=1)=>S.dispatch(s,{type:'advance',minutes});
function worker(){const ctx={};vm.createContext(ctx);vm.runInContext(S.workerSource()+';globalThis.engine=SOC;',ctx);return ctx.engine;}
test('AC-SOC-446 customer profiles retain jurisdiction, independent quantities, provisioning and worker/save equivalence through dispatch',()=>{
 const w=worker();let s=S.create({jurisdiction:'JP'}),other=structuredClone(s);
 const commands=[{type:'customer-needs',command:{action:'start'}},...['smb','enterprise','government','defence'].map(segment=>({type:'customer-needs',command:{action:'select',id:segment+'-needs',segment}})),{type:'advance',minutes:1}];
 for(const command of commands){s=S.dispatch(s,command);other=w.dispatch(other,command);assert.equal(JSON.stringify(other),JSON.stringify(s));}
 assert.ok(s.customerNeeds.profiles.every(p=>p.effective.geography.jurisdictions.includes('JP')));
 assert.equal(s.business,undefined,'a sector profile does not create procurement approval');
 s=pack(s,'customer-needs','configure',{id:'smb-needs',section:'scale',value:{employees:10,sites:1,seats:30,agents:50,rooms:2}});
 assert.equal(s.customerNeeds.profiles[0].effective.scale.agents,4);s=tick(s);
 assert.equal(s.customerNeeds.profiles[0].effective.scale.agents,50);
 const before=JSON.stringify(s);S.calculate(s);S.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(S.restore(before),s);
 assert.throws(()=>pack(s,'customer-needs','configure',{id:'smb-needs',section:'scale',value:{employees:-1}}),/INVALID_CUSTOMER/);assert.equal(JSON.stringify(s),before);
});
test('AC-SOC-447 attendance constrains real queue handling and revoked delegation rejects changes atomically',()=>{
 let s=S.reference(S.create()).reduce(S.dispatch,S.create());s=pack(s,'workforce','start');s=tick(s);
 for(const p of s.workforceOps.roster.effective)s=pack(s,'workforce','presence',{person:p.id,state:'away'});
 s=S.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'attendance-wait'});s=tick(s);
 assert.equal(s.interactions.at(-1).phase,'queued');assert.equal(s.resources.people.effective.entitlements,2);
 s=pack(s,'workforce','presence',{person:'agent-01',state:'available'});s=tick(s);
 assert.equal(s.interactions.at(-1).phase,'handling');assert.equal(s.interactions.at(-1).agent,'agent-01');
 s=pack(s,'business','start');
 // Workforce ownership is normally the MSP's. Delegate a customer-owned workforce
 // through an otherwise valid imported ownership record, then revoke that scope.
 const customerOwned=structuredClone(s);customerOwned.business.ownership.people='customer';
 const before=JSON.stringify(customerOwned);assert.throws(()=>pack(customerOwned,'workforce','presence',{person:'agent-01',state:'offline'}),/DELEGATION_REQUIRED/);assert.equal(JSON.stringify(customerOwned),before);
 assert.deepEqual(S.restore(JSON.stringify(s)),s);
});
test('AC-SOC-448 staffing forecasts scale explicit sample durations and respect upcoming shift boundaries',()=>{
 let s=S.create();s=S.dispatch(s,{type:'configure',id:'people',config:{people:1}});s=tick(s);s=pack(s,'workforce','start');s=tick(s);
 const people=structuredClone(s.workforceOps.roster.desired);people[0].shiftEnd=10;
 s=pack(s,'workforce','roster',{people});s=tick(s);
 s=pack(s,'workforce','arrival',{channel:'voice',skill:'service',language:'en',count:20,sampleMinutes:60});
 s=pack(s,'workforce','staffing-forecast',{channel:'voice',skill:'service',language:'en',horizon:30,method:'mean'});
 const short=s.workforceOps.forecasts.at(-1);assert.equal(short.arrivals,10);assert.ok(short.projectedCapacity<7,'shift ends inside the forecast horizon');
 s=pack(s,'workforce','staffing-forecast',{channel:'voice',skill:'service',language:'en',horizon:60,method:'mean'});
 assert.equal(s.workforceOps.forecasts.at(-1).arrivals,20);assert.equal(s.workforceOps.forecasts.at(-1).projectedCapacity,short.projectedCapacity);
 // Presence cannot grant roster eligibility that the effective configuration denies.
 people[0].available=false;s=pack(s,'workforce','roster',{people});s=tick(s);s=pack(s,'workforce','presence',{person:'agent-01',state:'available'});
 assert.equal(S.workforce.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).capacity,0);
});
test('AC-SOC-449 actual message delivery queues one callback and application recovery does not charge another message',()=>{
 let s=S.create();s=pack(s,'channels','start');
 s=S.dispatch(s,{type:'configure',id:'engage',config:{template:'service-outside-window',botResolves:true}});s=tick(s,2);
 s=pack(s,'channels','observe',{channel:'chatterleaf',authenticated:true,providerAvailable:true,fault:null});
 s=pack(s,'channels','permission',{tenant:'orchard-repairs',person:'alex',channel:'chatterleaf',purpose:'service',granted:true,expiresAt:null});
 s=pack(s,'channels','webhook-configure',{config:{enabled:true,rateLimit:5,retries:3,backoff:1}});s=tick(s);
 s=pack(s,'channels','webhook-observe',{authenticated:true,applicationAvailable:false,supplierAvailable:true});
 s=pack(s,'business','start');s=pack(s,'business','order',{offer:'messaging',quantity:100,unit:'message',currency:'AUD',resources:['messages','engage','cases'],sell:true});s=tick(s,2);
 s=S.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'service',caseId:'callback-case',account:'chatterleaf',purpose:'service',template:'service-outside-window'});s=tick(s,3);
 assert.equal(s.interactions.at(-1).phase,'resolved');assert.equal(s.channels.webhooks.deliveries.length,1);
 assert.equal(s.channels.webhooks.deliveries[0].reason,'APP_UNAVAILABLE');const usage=s.business.contracts[0].usage;
 s=pack(s,'channels','webhook-observe',{authenticated:true,applicationAvailable:true,supplierAvailable:true});
 const w=worker(),command={type:'advance',minutes:2},expected=w.dispatch(structuredClone(s),command);s=S.dispatch(s,command);
 assert.equal(JSON.stringify(s),JSON.stringify(expected));assert.equal(s.channels.webhooks.deliveries[0].status,'delivered');assert.equal(s.business.contracts[0].usage,usage);
 assert.equal(s.channels.webhooks.deliveries[0].caseId,'callback-case');assert.deepEqual(S.restore(JSON.stringify(s)),s);
});
test('AC-SOC-454 external commands cannot fabricate workforce assignments or bypass roster provisioning',()=>{
 let s=S.create();s=S.dispatch(s,{type:'configure',id:'people',config:{people:1}});s=tick(s);s=pack(s,'workforce','start');s=tick(s);
 const before=JSON.stringify(s);
 assert.throws(()=>pack(s,'workforce','admit',{request:{interaction:'orphan-work',channel:'voice',skill:'service',language:'en'}}),/WORKFORCE_INTERNAL_ACTION/);
 assert.throws(()=>pack(s,'workforce','finish',{interaction:'orphan-work'}),/WORKFORCE_INTERNAL_ACTION/);assert.equal(JSON.stringify(s),before);
 const orphan=structuredClone(s);S.workforce.admit(orphan,{interaction:'orphan-work',channel:'voice',skill:'service',language:'en'});
 assert.throws(()=>S.restore(JSON.stringify(orphan)),/ORPHAN_WORKFORCE_ASSIGNMENT/);
 s=pack(s,'workforce','availability',{person:'agent-01',available:false});
 assert.equal(s.workforceOps.actualPresence['agent-01'],'available');assert.equal(S.workforce.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).capacity,1);
 s=tick(s);assert.equal(S.workforce.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).capacity,0);
});
test('AC-SOC-455 imported customer profiles reject changed source lineage and impossible application times',()=>{
 let s=pack(S.create(),'customer-needs','start');s=pack(s,'customer-needs','select',{id:'profile-one',segment:'smb'});
 const wrongSource=structuredClone(s);wrongSource.customerNeeds.profiles[0].sourceId='uc-new:segment:government';assert.throws(()=>S.restore(JSON.stringify(wrongSource)),/INVALID_CUSTOMER_PROFILE/);
 s=tick(s);const future=structuredClone(s);future.customerNeeds.profiles[0].provisioning.due=100;assert.throws(()=>S.restore(JSON.stringify(future)),/INVALID_CUSTOMER_PROFILE_TIME/);
 const tooEarly=structuredClone(s);tooEarly.customerNeeds.profiles[0].observed.at=0;assert.throws(()=>S.restore(JSON.stringify(tooEarly)),/INVALID_CUSTOMER_PROFILE_TIME/);
});
