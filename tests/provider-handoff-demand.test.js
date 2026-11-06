const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const vm=require('node:vm');
const demand=require('../src/game/22-provider-demand');
const request=(scenario='smb',ready=true,seed=73)=>({scenario,customerId:'customer-a',seed,periodIndex:0,voiceArrivals:[4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49],digitalArrivals:[5,11,17,23,29,35,41,47],caseIds:Array.from({length:24},(_,i)=>`case-${i+1}`),eligible:{socialMessaging:ready,workplaceChat:ready,video:ready}});
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('AC-SOC-657 versioned SMB handoff reserves one existing optional case and conserves the combined voice budget',()=>{
 for(const seed of [1,73,331,2026,2147483646]){
  const legacy=request('smb',true,seed),input={...legacy,handoffVersion:1},before=JSON.stringify(input),old=demand.plan(legacy),plan=demand.plan(input),reserved=plan.jobs.filter(j=>j.handoffPreference);
  assert.equal(JSON.stringify(input),before);assert.deepEqual(demand.plan(input),plan);
  assert.equal(plan.totalCases,24);assert.equal(new Set(plan.jobs.map(j=>j.caseId)).size,24);assert.equal(new Set(plan.jobs.map(j=>j.sourceCaseIndex)).size,24);
  assert.equal(reserved.length,1);assert.equal(plan.handoffReservations,1);assert.equal(plan.handoffVersion,1);
  assert.equal(plan.actualVoiceCount,13);assert.equal(plan.actualDigitalCount,11);assert.equal(plan.actualVoiceCount-plan.handoffReservations,plan.voiceFloor);
  assert.equal(plan.substitutions.socialMessaging+plan.handoffReservations,old.substitutions.socialMessaging);
  const r=reserved[0],prior=old.jobs.find(j=>j.caseId===r.caseId);assert.equal(prior.preference,'socialMessaging');assert.equal(r.channel,'voice');assert.equal(r.sourceChannel,'voice');assert.equal(r.preference,undefined);assert.equal(r.handoffPreference,'socialMessaging');
  for(const key of ['connectorId','operationId','account','template','workloadKind','arrivalAt','sourceCaseIndex'])assert.equal(r[key],prior[key]);
  assert.deepEqual(plan.jobs.filter(j=>j.caseId!==r.caseId),old.jobs.filter(j=>j.caseId!==r.caseId),'only the reserved existing slot changes');
 }
});

test('AC-SOC-658 legacy demand remains byte-identical for all four missions with and without eligible products',()=>{
 // Golden digests captured from the unchanged planner before adding handoffVersion.
 const golden={smb:['ec16cbe7f5db34a2ccb08769aa3c7eefcae669b5508ce8df9682a1a5df63ace4','4ce54e263542200d7571244bef25b8d4fa1faf59f7b6e4543607f747549a1806'],enterprise:['18e761bf3815c4260c1adfa9fc3f96346e58a6b1254345cb700677cfdaf3d606','1ab27dacb5dfcfedbdc73a59ca1ac9e23ccf4f7555de55eb9704f6faefc30ad8'],government:['cb771d041ccc8c7e70554bb5e68fb4985e454098cd8b8c036462c4b04183ef4e','05888a5abcdb982f7077f0ae876ff97f9bd3a6dc555f7519f1528a74ec07aa6d'],defence:['70d687e01b136e3fefdba098f479e38847c25dd9ed078557177323ce9b65bcb1','cdab66bdfbccf0627d0d622d6265f86d8d998499878939327a033d24dd33155c']};
 for(const [scenario,hashes] of Object.entries(golden))for(const ready of [false,true]){
  const input=request(scenario,ready),plan=demand.plan(input);assert.equal(digest(plan),hashes[Number(ready)]);assert.equal(plan.handoffVersion,undefined);assert.ok(plan.jobs.every(j=>demand.handoffFor(input,j.caseId)===null));
 }
});

test('AC-SOC-659 handoff cannot create eligibility without the product or divert protected mission cases',()=>{
 const missing={...request('smb',false),handoffVersion:1},p=demand.plan(missing);assert.equal(p.handoffReservations,0);assert.equal(p.actualVoiceCount,16);assert.equal(p.actualDigitalCount,8);
 const wrong={...request(),handoffVersion:1};wrong.eligible.socialMessaging=false;assert.equal(demand.plan(wrong).handoffReservations,0,'other ready connectors do not grant social handoff');
 for(const scenario of ['enterprise','government','defence']){
  const input=request(scenario),legacy=demand.plan(input),current=demand.plan({...input,handoffVersion:1});assert.equal(current.handoffReservations,0);assert.deepEqual(current.jobs,legacy.jobs);assert.deepEqual(current.substitutions,legacy.substitutions);
 }
 for(const version of [undefined,null,false,0,2,'1',{},[]])assert.throws(()=>demand.plan({...request(),handoffVersion:version}),/INVALID_PROVIDER_HANDOFF_VERSION/);
 assert.throws(()=>demand.plan({...request(),handoffVersion:1,arbitrary:true}),/INVALID_PROVIDER_DEMAND_REQUEST/);
});

test('AC-SOC-660 handoff reconstruction is pure, case-scoped and identical in serialized worker code',()=>{
 const input={...request(),handoffVersion:1},plan=demand.plan(input),reserved=plan.jobs.find(j=>j.handoffPreference),before=JSON.stringify(input),context={};vm.createContext(context);vm.runInContext(demand.source()+';globalThis.result=SOC_PROVIDER_DEMAND;',context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.result.plan(input))),plan);
 assert.deepEqual(demand.handoffFor(input,reserved.caseId),reserved);assert.deepEqual(JSON.parse(JSON.stringify(context.result.handoffFor(input,reserved.caseId))),reserved);
 const copied=demand.handoffFor(input,reserved.caseId);copied.connectorId='foreign';assert.deepEqual(demand.handoffFor(input,reserved.caseId),reserved);
 for(const job of plan.jobs.filter(j=>!j.handoffPreference))assert.equal(demand.handoffFor(input,job.caseId),null);
 assert.equal(demand.handoffFor(input,'other-customer-case'),null);assert.equal(JSON.stringify(input),before);
});
