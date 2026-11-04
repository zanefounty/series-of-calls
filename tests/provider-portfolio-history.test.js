const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const P=require('../src/game/37-portfolio');
const SOC=require('../src/game/55-communications');

const hooks={
 createCustomer:(_portfolio,c)=>SOC.create({scenario:c.scenario,jurisdiction:c.jurisdiction,tenant:c.tenant,clock:c.clock,mode:'guided',seed:73}),
 dispatchCustomer:(root,command)=>SOC.dispatch(root,command),
 validateCustomer:root=>{SOC.validateState(root);return true;}
};
const run=(s,command)=>SOC.dispatch(s,command);
const add=(s)=>run(s,{type:'portfolio',command:{action:'addcustomer',id:'history-client',tenant:'history-tenant',name:'History Client',market:'au-sydney',scenario:'smb'}});

test('portfolio journal checkpoints bounded history while active roots survive save and worker continuation',()=>{
 let s=run(SOC.create({seed:901}),{type:'portfolio',command:{action:'start'}});s=add(s);
 const rootBefore=JSON.stringify(s.customers);
 for(let i=0;i<2001;i++)s=run(s,{type:'advance',minutes:1});
 assert.equal(s.portfolio.clock,2001);assert.equal(s.portfolio.customers[0].root.clock,2001);
 assert.equal(s.portfolio.customers[0].root.tenant,'history-tenant');assert.equal(s.portfolio.customers[0].active,true);
 assert.equal(s.portfolio.journal.length,P.MAX_JOURNAL);
 assert.equal(s.portfolio.checkpoint.throughId,1746);
 assert.equal(s.portfolio.checkpoint.facts.PORTFOLIO_TICK,1745);
 assert.equal(s.portfolio.nextId,2003);assert.equal(s.portfolio.revision,2002);
 assert.notEqual(JSON.stringify(s.portfolio.customers),rootBefore);
 const restored=SOC.restore(JSON.stringify(s));assert.deepEqual(restored.portfolio,s.portfolio);
 const worker=vm.runInNewContext(P.source()+';SOC_PORTFOLIO');
 const before=JSON.stringify(restored);worker.validate(JSON.parse(JSON.stringify(restored.portfolio)),hooks);assert.equal(JSON.stringify(restored),before);
 const next=run(restored,{type:'advance',minutes:1});assert.equal(next.portfolio.clock,2002);assert.equal(next.portfolio.customers[0].root.clock,2002);
 const workerSoc=vm.runInNewContext(SOC.workerSource()+';SOC');
 const workerNext=workerSoc.dispatch(SOC.restore(JSON.stringify(s)),{type:'advance',minutes:1});
 assert.equal(JSON.stringify(workerNext.portfolio),JSON.stringify(next.portfolio));assert.equal(workerNext.revision,next.revision);
});

test('portfolio checkpoint facts are tamper checked and old bounded journals migrate without mutating source',()=>{
 const old=P.create();delete old.checkpoint;old.journal=Array.from({length:300},(_,i)=>({id:`portfolio-event-${i+1}`,at:0,kind:'CUSTOMER_SELECTED',customerId:null}));old.revision=300;old.nextId=301;
 const original=JSON.stringify(old),migrated=P.migrateKnown(old);
 assert.equal(JSON.stringify(old),original);assert.equal(migrated.journal.length,256);assert.equal(migrated.checkpoint.count,44);
 assert.equal(migrated.revision,300);assert.equal(migrated.nextId,301);assert.equal(P.validate(migrated),migrated);
 const forged=structuredClone(migrated);forged.checkpoint.facts.PORTFOLIO_TICK=1;
 assert.throws(()=>P.validate(forged),/INVALID_PORTFOLIO_CHECKPOINT/);
});
