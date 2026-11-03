const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const E=require('../src/game/55-communications');
const operationsContent=require('../content/operations.json');

const op=(s,command)=>E.dispatch(s,{type:'operations',command});
const advance=(s,minutes=1)=>{while(minutes>0){const step=Math.min(60,minutes);s=E.dispatch(s,{type:'advance',minutes:step});minutes-=step;}return s;};
const interact=s=>E.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'port-routing-check'});
const start=()=>advance(op(E.create(),{action:'start'}));
const addNumber=(s,number='+61255500301')=>{
 s=op(s,{action:'reserve',number,type:'user'});
 return op(s,{action:'assign',number,holder:'alex'});
};
const order=(s,opts={})=>{
 const leadBusinessDays=opts.leadBusinessDays??1;
 const responseDueAt=E.operations.supplierDueAt(s.clock,leadBusinessDays);
 return op(s,{action:'portOrder',number:opts.number||'+61255500301',target:opts.target||'next-wave',leadBusinessDays,cutoverAt:opts.cutoverAt??responseDueAt+5});
};

test('AC-SOC-239 legacy number-port actions and version 1 rows keep their original behavior',()=>{
 let s=addNumber(start());
 s=op(s,{action:'port',number:'+61255500301',target:'legacy-wave',donorAccepted:true,cutoverAt:s.clock+4});
 const legacy=s.operations.ports[0];assert.equal(legacy.schemaVersion,1);assert.equal(legacy.status,'submitted');
 s=advance(s,2);assert.equal(s.operations.ports[0].status,'scheduled');
 s=advance(s,2);assert.equal(s.operations.numbers.at(-1).provider,'legacy-wave');
 const oldSave=structuredClone(s);delete oldSave.operations.portingSchemaVersion;delete oldSave.operations.portOrders;delete oldSave.operations.ports[0].schemaVersion;
 assert.deepEqual(E.restore(JSON.stringify(oldSave)),oldSave);
 let history=addNumber(start());history=op(history,{action:'port',number:'+61255500301',target:'legacy-wave',donorAccepted:true,cutoverAt:history.clock+3});
 const legacyId=history.operations.ports[0].id;history=advance(history,3);
 const due=E.operations.supplierDueAt(history.clock,1);history=order(history,{leadBusinessDays:1,cutoverAt:due+3});const v2=history.operations.portOrders[0];
 history=advance(history,v2.responseDueAt-history.clock);history=op(history,{action:'portResponse',port:v2.id,accepted:true});history=advance(history,v2.cutoverAt-history.clock);
 const beforeRejectedRecovery=JSON.stringify(history);
 assert.throws(()=>op(history,{action:'recoverPort',port:legacyId}),/PORT_RECOVERY_UNAVAILABLE/);
 assert.equal(JSON.stringify(history),beforeRejectedRecovery,'rejecting stale recovery leaves later port state atomic');
});

test('AC-SOC-240 supplier lead business days use pinned weekday calendar and preserve minute-of-day',()=>{
 const due=E.operations.supplierDueAt;
 assert.equal(due(0,1),1440); // Monday to Tuesday
 assert.equal(due(3*1440+137,2),7*1440+137); // Thursday plus two weekdays is Monday
 assert.equal(due(5*1440+25,1),7*1440+25); // Saturday starts counting on Monday
 assert.throws(()=>due(0,0),/INVALID_SUPPLIER_LEAD_TIME/);
 assert.throws(()=>due(0,61),/INVALID_SUPPLIER_LEAD_TIME/);
});

test('AC-SOC-241 order creation snapshots provider and rejects a cutover before supplier due time',()=>{
 let s=addNumber(start());const due=E.operations.supplierDueAt(s.clock,3);
 assert.throws(()=>order(s,{leadBusinessDays:3,cutoverAt:due-1}),/CUTOVER_BEFORE_SUPPLIER_RESPONSE/);
 s=order(s,{leadBusinessDays:3,cutoverAt:due+10});
 const p=s.operations.portOrders[0];assert.equal(p.schemaVersion,2);assert.equal(p.previousProvider,'level-tree');assert.equal(p.status,'submitted');assert.equal(p.response,null);assert.equal(p.responseDueAt,due);
 assert.throws(()=>order(s),/INVALID_PORT_ORDER/);
});

test('AC-SOC-242 supplier cannot respond before due time and acceptance waits for planned cutover',()=>{
 let s=order(start(),{number:'+61255500101'});const p=s.operations.portOrders[0];
 assert.throws(()=>op(s,{action:'portResponse',port:p.id,accepted:true}),/INVALID_PORT_RESPONSE/);
 s=advance(s,p.responseDueAt-s.clock);s=op(s,{action:'portResponse',port:p.id,accepted:true});
 assert.equal(s.operations.portOrders[0].status,'scheduled');assert.equal(s.operations.numbers[0].provider,'level-tree');
 assert.equal(interact(s).interactions.at(-1).phase,'queued','caller routing remains available before planned cutover');
 s=advance(s,p.cutoverAt-s.clock-1);assert.equal(s.operations.numbers[0].provider,'level-tree');
 s=advance(s);assert.equal(s.operations.portOrders[0].status,'complete');assert.equal(s.operations.numbers[0].provider,'next-wave');
 assert.equal(interact(s).interactions.at(-1).outcome,'CALLER_CARRIER_MISMATCH','core routing observes the provider change only after cutover');
});

test('AC-SOC-243 supplier rejection records its reason and leaves number routing unchanged',()=>{
 let s=order(addNumber(start()));const p=s.operations.portOrders[0];s=advance(s,p.responseDueAt-s.clock);
 s=op(s,{action:'portResponse',port:p.id,accepted:false,reason:'ACCOUNT_MISMATCH'});
 assert.equal(s.operations.portOrders[0].status,'failed');assert.equal(s.operations.portOrders[0].reason,'ACCOUNT_MISMATCH');
 assert.equal(s.operations.numbers.at(-1).provider,'level-tree');
 assert.throws(()=>op(s,{action:'portResponse',port:p.id,accepted:true}),/INVALID_PORT_RESPONSE/);
});

test('AC-SOC-244 missing supplier response at cutover fails without silently changing provider',()=>{
 let s=addNumber(start());const due=E.operations.supplierDueAt(s.clock,1);
 s=order(s,{leadBusinessDays:1,cutoverAt:due+2});const p=s.operations.portOrders[0];
 s=advance(s,p.cutoverAt-s.clock);assert.equal(s.operations.portOrders[0].status,'failed');
 assert.equal(s.operations.portOrders[0].reason,'SUPPLIER_RESPONSE_AFTER_CUTOVER');assert.equal(s.operations.numbers.at(-1).provider,'level-tree');
 assert.throws(()=>op(s,{action:'portResponse',port:p.id,accepted:true}),/INVALID_PORT_RESPONSE/);
});

test('AC-SOC-245 recovery restores the captured previous provider after a completed supplier order',()=>{
 let s=order(addNumber(start()));let p=s.operations.portOrders[0];s=advance(s,p.responseDueAt-s.clock);s=op(s,{action:'portResponse',port:p.id,accepted:true});
 s=advance(s,p.cutoverAt-s.clock);assert.equal(s.operations.numbers.at(-1).provider,'next-wave');
 s=op(s,{action:'recoverPort',port:p.id});assert.equal(s.operations.portOrders[0].status,'recovering');s=advance(s,2);
 assert.equal(s.operations.portOrders[0].status,'recovered');assert.equal(s.operations.numbers.at(-1).provider,'level-tree');
});

test('AC-SOC-246 supplier order history validates, saves, runs in worker, and inspects without mutation',()=>{
 assert.deepEqual(operationsContent.numberPorting,E.operations.numberPorting);assert.ok(operationsContent.sourceIds.includes('uc-new:domain:number-porting'));
 let s=order(addNumber(start()));const p=s.operations.portOrders[0];s=advance(s,p.responseDueAt-s.clock);s=op(s,{action:'portResponse',port:p.id,accepted:false,reason:'DONOR_DATA_CHECK'});
 const before=JSON.stringify(s);E.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(E.restore(JSON.stringify(s)),s);
 let result;const context={postMessage:r=>result=r};vm.createContext(context);vm.runInContext(E.workerSource(),context);
 context.onmessage({data:{id:8,state:s,command:{type:'advance',minutes:1}}});
 assert.deepEqual(JSON.parse(JSON.stringify(result.state)),advance(s));
 const malformed=structuredClone(s);malformed.operations.portOrders[0].responseDueAt++;
 assert.throws(()=>E.restore(JSON.stringify(malformed)),/INVALID_PORT_ORDER_STATE/);
 const premature=structuredClone(s);premature.operations.numbers.find(n=>n.number===p.number).provider='next-wave';
 assert.throws(()=>E.restore(JSON.stringify(premature)),/PORT_NUMBER_PROVIDER_MISMATCH/);
});
