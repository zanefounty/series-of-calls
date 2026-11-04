const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const send=(s,type,command,extra={})=>SOC.dispatch(s,{type,command,...extra});
const tick=(s,minutes=1)=>SOC.dispatch(s,{type:'advance',minutes});
const start=({business=true,operator='player'}={})=>{
 let s=SOC.create({scenario:'enterprise'});
 if(business)s=send(s,'business',{action:'start'});
 if(operator!=='player')s=SOC.dispatch(s,{type:'configure',id:'people',config:{operator}});
 s=send(s,'workforce',{action:'start'});
 s=tick(s,1);
 return s;
};
const coach=(s,costCents=125,extra={})=>send(s,'workforce',{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents,...extra});
const costRows=s=>s.business.ledger.filter(x=>x.reason==='workforce-coaching');
const unchangedFailure=(s,command,pattern)=>{const before=JSON.stringify(s);assert.throws(()=>SOC.dispatch(s,command),pattern);assert.equal(JSON.stringify(s),before,'failed coach command is atomic');};
const worker=(s,command)=>{let result;const ctx={postMessage:x=>result=x};vm.createContext(ctx);vm.runInContext(SOC.workerSource(),ctx);ctx.onmessage({data:{id:808,state:s,command}});assert.equal(result.error,undefined);return JSON.parse(JSON.stringify(result.state));};

test('accepted positive coaching posts exactly one typed cost row and delays skill effectiveness',()=>{
 let s=start(),before=s.business.balance.cash;
 s=coach(s,125);
 const job=s.workforceOps.coaching.at(-1),row=costRows(s)[0];
 assert.equal(job.commercialReceipt.status,'posted');assert.equal(job.commercialReceipt.coachingId,job.id);assert.equal(job.commercialReceipt.cents,125);assert.equal(job.commercialReceipt.unit,'AUD-cent');
 assert.equal(costRows(s).length,1);assert.equal(row.id,job.commercialReceipt.entryId);assert.equal(row.category,'cost');assert.equal(row.person,'agent-01');assert.equal(row.skill,'billing');assert.equal(row.minutes,2);assert.equal(row.at,job.startedAt);assert.equal(s.business.balance.cash,before-125);assert.equal(s.business.balance.cost,125);assert.equal(s.business.externalInvoices?.length||0,0);
 assert.ok(s.workforceOps.costEvents.some(e=>e.code==='COACHING_COST'&&e.job===job.id&&e.cents===125&&e.unit==='AUD-cent'));
 assert.ok(!s.workforceOps.roster.effective.find(p=>p.id==='agent-01').skills.includes('billing'));
 s=tick(s,1);assert.equal(costRows(s).length,1);assert.ok(!s.workforceOps.roster.effective.find(p=>p.id==='agent-01').skills.includes('billing'));
 s=tick(s,1);assert.equal(costRows(s).length,1);assert.ok(s.workforceOps.roster.effective.find(p=>p.id==='agent-01').skills.includes('billing'));
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('zero-cost coaching has explicit zero receipt and no ledger row; declared maximum uses direct ledger, not invoice limit',()=>{
 let s=start();const before=s.business.balance; s=coach(s,0);const zero=s.workforceOps.coaching.at(-1);assert.deepEqual(zero.commercialReceipt,{status:'zero',coachingId:zero.id,person:zero.person,skill:zero.skill,startedAt:zero.startedAt,unit:'AUD-cent',currency:'AUD',cents:0,entryId:null});assert.equal(costRows(s).length,0);assert.deepEqual(s.business.balance,before);
 s=coach(s,10000000);const max=s.workforceOps.coaching.at(-1);assert.equal(max.costCents,10000000);assert.equal(max.commercialReceipt.status,'posted');assert.equal(max.commercialReceipt.cents,10000000);assert.equal(costRows(s).length,1);assert.equal(s.business.balance.cost,10000000);assert.equal(s.business.externalInvoices?.length||0,0);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const beforeBad=JSON.stringify(s);assert.throws(()=>coach(s,10000001),/INVALID_COACHING/);assert.equal(JSON.stringify(s),beforeBad);assert.throws(()=>SOC.business.externalCost(structuredClone(s),{id:'invoice-over-cap',currency:'AUD',cents:1000001,reason:'test',source:'workforce-offers'}),/INVALID_EXTERNAL_INVOICE/);
});

test('coaching imports require consistent safe start, due and completion timestamps',()=>{
 const pending=coach(start(),100);
 // Imported time above the old local counter cap remains valid against the root safe-integer clock.
 const lateClock=coach(start({business:false}),0);lateClock.clock=1000001;const lateJob=lateClock.workforceOps.coaching.at(-1);lateJob.startedAt=lateClock.clock;lateJob.due=lateClock.clock+lateJob.minutes;lateClock.workforceOps.costEvents.find(e=>e.job===lateJob.id).minute=lateJob.startedAt;assert.deepEqual(SOC.restore(JSON.stringify(lateClock)),lateClock);
 for(const mutate of [
  x=>{x.workforceOps.coaching.at(-1).startedAt=x.clock+1;x.workforceOps.coaching.at(-1).due=x.clock+3;},
  x=>{x.workforceOps.coaching.at(-1).due+=1;},
  x=>{x.workforceOps.coaching.at(-1).due=x.clock;},
  x=>{x.workforceOps.coaching.at(-1).startedAt=Number.MAX_SAFE_INTEGER+1;},
  x=>{x.workforceOps.coaching.at(-1).completedAt=x.clock+1;}
 ]){const bad=structuredClone(pending);mutate(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)),/COACHING/);}
 let complete=tick(pending,2);assert.equal(complete.workforceOps.coaching.at(-1).status,'complete');
 const beforeDue=structuredClone(complete);beforeDue.workforceOps.coaching.at(-1).completedAt=beforeDue.workforceOps.coaching.at(-1).due-1;assert.throws(()=>SOC.restore(JSON.stringify(beforeDue)),/INVALID_COACHING_RECORD/);
 const afterClock=structuredClone(complete);afterClock.workforceOps.coaching.at(-1).completedAt=afterClock.clock+1;assert.throws(()=>SOC.restore(JSON.stringify(afterClock)),/INVALID_COACHING_RECORD/);
 const late=coach(start({business:false}),0);late.clock+=5;SOC.workforce.advance(late);assert.equal(late.workforceOps.coaching.at(-1).completedAt,late.clock);assert.ok(late.workforceOps.coaching.at(-1).completedAt>late.workforceOps.coaching.at(-1).due);SOC.workforce.validate(late);
});

test('SOC request replay posts one coaching charge and worker command matches public dispatch',()=>{
 const s=start(),command={type:'workforce',command:{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents:500},requestId:'coach-request-once'};
 const dispatched=SOC.dispatch(s,command),replayed=SOC.dispatch(dispatched,command);assert.deepEqual(replayed,dispatched);assert.equal(dispatched.workforceOps.coaching.length,1);assert.equal(costRows(dispatched).length,1);assert.equal(dispatched.receipts.filter(r=>r.id==='coach-request-once').length,1);
 assert.deepEqual(worker(s,command),dispatched);const before=JSON.stringify(dispatched);SOC.calculate(dispatched);SOC.calculate(dispatched);assert.equal(JSON.stringify(dispatched),before);
});

test('customer-controlled and BPO coaching without current scoped coach authority fail atomically',()=>{
 let customer=start({operator:'customer'});unchangedFailure(customer,{type:'workforce',command:{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents:100}},/WORKFORCE_CUSTOMER_CONTROLLED/);
 let bpo=start({operator:'bpo'});unchangedFailure(bpo,{type:'workforce',command:{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents:100}},/WORKFORCE_DELEGATION_REQUIRED/);
 bpo=send(bpo,'workforce',{action:'agreement',id:'coach-config-only',resources:['workforce'],actions:['configure'],expires:bpo.clock+2});unchangedFailure(bpo,{type:'workforce',command:{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents:100}},/WORKFORCE_DELEGATION_REQUIRED/);
 bpo=send(bpo,'workforce',{action:'agreement',id:'coach-scoped',resources:['workforce'],actions:['coach'],expires:bpo.clock+1});bpo=tick(bpo);unchangedFailure(bpo,{type:'workforce',command:{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents:100}},/WORKFORCE_DELEGATION_REQUIRED/);
});

test('current business people ownership grant remains required for commercial coaching',()=>{
 const state=structuredClone(start());state.business.ownership.people='customer';const valid=SOC.restore(JSON.stringify(state));const before=JSON.stringify(valid);
 assert.throws(()=>SOC.dispatch(valid,{type:'workforce',command:{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents:100}}),/DELEGATION_REQUIRED/);assert.equal(JSON.stringify(valid),before);
});

test('standalone coaching and legacy unbilled jobs remain valid after business starts without retrocharge',()=>{
 let s=coach(start({business:false}),900);const job=structuredClone(s.workforceOps.coaching.at(-1));assert.equal(job.commercialReceipt,undefined);assert.equal(s.business,undefined);
 s=send(s,'business',{action:'start'});assert.equal(s.workforceOps.coaching.at(-1).commercialReceipt,undefined);assert.equal(costRows(s).length,0);s=tick(s,2);assert.equal(s.workforceOps.coaching.at(-1).status,'complete');assert.equal(costRows(s).length,0);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('recent missing or contradictory receipts and ledger rows are rejected; genuine pruning preserves the receipt',()=>{
 let s=coach(start(),400);const entry=s.workforceOps.coaching.at(-1).commercialReceipt.entryId;
 const corruptions=[
  x=>{delete x.workforceOps.coaching.at(-1).commercialReceipt;},
  x=>{x.workforceOps.coaching.at(-1).commercialReceipt.cents=399;},
  x=>{x.workforceOps.coaching.at(-1).commercialReceipt.entryId='entry-999';},
  x=>{x.business.ledger.find(row=>row.id===entry).cents=399;},
  x=>{x.business.ledger=x.business.ledger.filter(row=>row.id!==entry);},
  x=>{x.workforceOps.costEvents=[];},
  x=>{x.workforceOps.costEvents[0].cents=399;},
  x=>{x.workforceOps.costEvents[0].minute+=1;},
  x=>{x.workforceOps.costEvents[0].job='coaching-999';},
  x=>{x.workforceOps.costEvents[0].id='workforce-cost-999';}
 ];
 for(const mutate of corruptions){const bad=structuredClone(s);mutate(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)),/COACHING|INVALID_CAMPAIGN|INVALID_WORKFORCE/);}
 const receipt=structuredClone(s.workforceOps.coaching.at(-1).commercialReceipt);
 s=send(s,'business',{action:'loan',cents:2000});const loan=s.business.loans.at(-1);
 for(let n=0;n<999;n++)s=send(s,'business',{action:'repay',loan:loan.id,cents:1});
 assert.equal(s.business.ledger.length,1000);assert.ok(s.business.ledgerPrunedThrough>=Number(entry.slice(6)));assert.ok(!s.business.ledger.some(row=>row.id===entry));assert.deepEqual(s.workforceOps.coaching.at(-1).commercialReceipt,receipt);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});


test('501 public coaching commands prune exact old event IDs and preserve the initial receipt',()=>{
 let s=coach(start(),100),firstJob=structuredClone(s.workforceOps.coaching[0]),firstEvent=structuredClone(s.workforceOps.costEvents[0]);
 for(let n=0;n<500;n++)s=coach(s,0);
 assert.equal(s.workforceOps.coaching.length,501);assert.equal(s.workforceOps.costEvents.length,500);assert.equal(s.workforceOps.costEventsPrunedThrough,Number(firstEvent.id.slice('workforce-cost-'.length)));assert.equal(s.workforceOps.costEventsPrunedThrough,Number(firstJob.id.slice('coaching-'.length))+1);assert.notEqual(s.workforceOps.costEvents[0].id,firstEvent.id);
 assert.equal(costRows(s).length,1);assert.deepEqual(s.workforceOps.coaching[0].commercialReceipt,firstJob.commercialReceipt);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=structuredClone(s);forged.workforceOps.costEventsPrunedThrough++ ;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/COST_EVENT|COACHING/);
});
