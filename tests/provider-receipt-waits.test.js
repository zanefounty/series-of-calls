const test=require('node:test');
const assert=require('node:assert/strict');
const {SOC,buy,paidOpening,ccAdvance,ccUntil,ccUntilClock,ccWaitProject,ccOperationComplete,ccStageComplete}=require('./provider-progression-receipts.helpers.js');
const clone=s=>JSON.parse(JSON.stringify(s));
function comparable(s){
 const copy=clone(s);delete copy.commands;
 const visit=x=>{if(!x||typeof x!=='object')return;delete x.revision;for(const v of Object.values(x))visit(v);};visit(copy);return copy;
}
test('explicit receipt clock waits retain each incident, settlement and renewal outcome',()=>{
 const start=paidOpening(35);let baseline=clone(start);while(baseline.clock<200)baseline=ccAdvance(baseline);
 const batched=ccUntilClock(clone(start),200);
 assert.equal(batched.clock,baseline.clock);assert.deepEqual(comparable(batched),comparable(baseline));
 assert.ok(batched.commands.length<baseline.commands.length,'native multi-minute advances reduce only command-boundary validation');
 assert.ok(batched.providerCampaign.incidents.some(i=>i.status==='resolved'));
 assert.ok(batched.providerCampaign.periodHistory.length>=3);
 assert.deepEqual(SOC.restore(JSON.stringify(batched)),batched);
 assert.throws(()=>ccUntilClock(clone(start),NaN),/explicit simulation minute/);
});
test('paid stage and operation waits reach the same first effective minute',()=>{
 let start=SOC.create({experience:'campaign'});
 start=buy(start,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});
 const stageReady=s=>s.providerCampaign.customers[0].stages.base.status==='effective';
 const baseline=ccUntil(clone(start),stageReady),batched=ccStageComplete(clone(start),'base');
 assert.equal(batched.clock,baseline.clock);assert.deepEqual(comparable(batched),comparable(baseline));
 const request={action:'operation',operationId:'recording',customerId:'starter-customer'};
 start=buy(batched,request);
 const ready=s=>s.providerCampaign.projects.findLast(p=>p.operationId==='recording').status==='complete';
 const one=ccUntil(clone(start),ready),many=ccOperationComplete(clone(start),'recording');
 assert.equal(many.clock,one.clock);assert.deepEqual(comparable(many),comparable(one));
 assert.ok(many.commands.length<one.commands.length);
 assert.throws(()=>ccWaitProject(clone(start),s=>s.providerCampaign.projects.findLast(p=>p.operationId==='recording'),ready,1),/fixture stalled/,'original elapsed-minute cap stays binding');
});
