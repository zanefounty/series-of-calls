const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const R=require('../src/game/24-provider-rules');
const products=require('../content/products.json');
const content=JSON.parse(fs.readFileSync(require.resolve('../content/provider-campaigns.json'),'utf8'));

test('authored provider rules exactly mirror versioned JSON and are deeply immutable in worker source',()=>{
 assert.equal(JSON.stringify(R.data),JSON.stringify(content));
 assert.ok(Object.isFrozen(R.data));assert.ok(Object.isFrozen(R.data.missions.smb.demand.voiceMinutes));
 assert.equal(Reflect.set(R.data.missions.smb,'retailCents',1),false);
 const worker=vm.runInNewContext(R.source()+';SOC_PROVIDER_RULES');
 assert.equal(JSON.stringify(worker.data),JSON.stringify(content));assert.equal(Object.isFrozen(worker.data),true);
});

test('two authored SMB plans expose distinct setup, recurring, work and lead tradeoffs',()=>{
 const {swift,steady}=R.data.plans;
 const totalSetup=p=>p.base.setupCents+p.carrier.setupCents+p.partner.setupCents;
 const supplierPeriods=p=>p.base.periodCents+p.carrier.periodCents+p.partner.periodCents;
 assert.equal(totalSetup(swift),600000);assert.equal(totalSetup(steady),1000000);
 assert.equal(supplierPeriods(swift),102000);assert.equal(supplierPeriods(steady),72000);
 assert.equal(swift.base.setupCents,380000);assert.equal(swift.carrier.setupCents,80000);assert.equal(swift.partner.setupCents,140000);
 assert.equal(steady.base.setupCents,700000);assert.equal(steady.carrier.setupCents,120000);assert.equal(steady.partner.setupCents,180000);
 assert.deepEqual(swift.base.resources,['identity','access','phone','desk','people','local']);
 assert.deepEqual(swift.carrier.resources,['carrier']);assert.deepEqual(swift.partner.resources,['service','messages','cases','engage']);
 assert.ok(swift.base.workMinutes<steady.base.workMinutes);assert.ok(swift.carrier.workMinutes<steady.carrier.workMinutes);assert.ok(swift.partner.workMinutes<steady.partner.workMinutes);
 assert.notEqual(swift.carrier.periodCents,steady.carrier.periodCents);
 assert.equal(swift.voiceCents*48+swift.messageCents*8,3000);
 const payroll=R.data.staff.engineers*R.data.staff.payrollCentsPerPerson+R.data.staff.support*R.data.staff.payrollCentsPerPerson;
 assert.equal(payroll,30000);assert.equal(payroll+supplierPeriods(swift)+3000,135000);assert.equal(payroll+supplierPeriods(steady)+3000,105000);
});

test('four authored missions vary operational constraints and reference all existing family profiles',()=>{
 const missions=Object.values(R.data.missions);
 assert.deepEqual(missions.map(x=>x.scenario),['smb','enterprise','government','defence']);
 assert.equal(missions[0].demand.voiceMinutes.length,16);assert.equal(missions[0].demand.digitalMinutes.length,8);
 assert.equal(missions[0].minimumOnTime,22);assert.equal(missions[0].victoryPeriods,2);
 assert.ok(missions[1].requirements.meeting);assert.ok(missions[1].incident.resource==='room');
 assert.ok(missions[2].requirements.transcript);assert.ok(missions[2].incident.resource==='processor');
 assert.ok(missions[3].requirements.local);assert.equal(missions[3].incident.kind,'disconnection');
 const expected=Object.values(products.runtime.families).map(x=>x.sourceID).sort();
 const actual=R.data.families.map(x=>x.sourceId).sort();assert.deepEqual(actual,expected);
 assert.equal(R.data.families.length,14);assert.ok(R.data.operations.every(x=>x.id&&x.setupCents>=0&&x.periodCents>=0&&x.workMinutes>=0&&Array.isArray(x.sourceIds)));
});
