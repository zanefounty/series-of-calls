const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications'),{journey}=require('./lib/workforce-coaching-fixture');
test('coaching scope recovery charges once before grant expiry and later effective skill without retroactive authority',()=>{
 for(const jurisdiction of ['AU','US','JP','EU']){const f=journey({jurisdiction});let s=SOC.create(f.options);for(let i=0;i<f.commands.length;i++){s=SOC.dispatch(s,f.commands[i]);for(const attempt of f.rejectedAttempts.filter(x=>x.afterCommandCount===i+1)){const before=JSON.stringify(s);assert.throws(()=>SOC.dispatch(s,attempt.command),new RegExp(attempt.expectedError));assert.equal(JSON.stringify(s),before);assert.equal(s.workforceOps.coaching.length,0);assert.equal(s.business.balance.cost,0);}}
 assert.deepEqual(s,f.expectedState);const job=s.workforceOps.coaching[0],rows=s.business.ledger.filter(x=>x.reason==='workforce-coaching');assert.equal(job.status,'complete');assert.equal(job.startedAt,1);assert.equal(job.completedAt,3);assert.equal(job.commercialReceipt.entryId,rows[0].id);assert.equal(rows.length,1);assert.equal(rows[0].at,1);assert.equal(s.business.balance.cost,125);assert.ok(s.workforceOps.roster.effective[0].skills.includes('billing'));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const before=JSON.stringify(s);assert.throws(()=>SOC.dispatch(s,f.rejectedAttempts[0].command),/WORKFORCE_DELEGATION_REQUIRED/);assert.equal(JSON.stringify(s),before);
 const receipt=structuredClone(job.commercialReceipt);assert.deepEqual(SOC.business.workforceCoachingCost(s,job),receipt);assert.equal(JSON.stringify(s),before);
 const conflict=structuredClone(s);conflict.workforceOps.coaching[0].costCents++;assert.throws(()=>SOC.business.workforceCoachingCost(conflict,conflict.workforceOps.coaching[0]),/COACHING_COST_IDEMPOTENCY_CONFLICT/);
 }
});
