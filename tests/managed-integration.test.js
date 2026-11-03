const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {SOC,child,dispatchChild,setup,participant,submit,advance}=require('./helpers/managed-fixture');

const start=root=>SOC.dispatch(root,{type:'managed-operations',command:{action:'start'}});
const managed=root=>SOC.calculate(root).managedOperations;

test('AC-SOC-306 two real portfolio customers retain independent JML outcomes, delayed readiness, retry, and one typed charge each',()=>{
 let root=start(setup()),participants=[participant(root,'managed-sydney'),participant(root,'managed-melbourne')];
 root=submit(root,participants,'cross-customer-provision');
 const job=root.managedOperations.jobs[0];assert.equal(job.participants.length,2);assert.ok(job.participants.every(x=>x.status==='submitted'));
 root=dispatchChild(root,'managed-melbourne',{type:'estate',command:{action:'fault',connector:'orchard-sync',fault:'OUTAGE'}});
 root=advance(root,1);let snapshot=managed(root),current=root.managedOperations.jobs[0],sydney=current.participants.find(x=>x.customerId==='managed-sydney'),melbourne=current.participants.find(x=>x.customerId==='managed-melbourne');
 assert.equal(sydney.items[0].status,'provisioning','JML application is not effective provisioning yet');assert.equal(sydney.items[0].billingStatus,'deferred');assert.equal(melbourne.items[0].status,'blocked');
 assert.equal(child(root,'managed-sydney').business.managedCharges?.length||0,0);assert.equal(child(root,'managed-melbourne').business.managedCharges?.length||0,0);
 root=advance(root,1);sydney=root.managedOperations.jobs[0].participants.find(x=>x.customerId==='managed-sydney');melbourne=root.managedOperations.jobs[0].participants.find(x=>x.customerId==='managed-melbourne');
 assert.equal(sydney.items[0].status,'complete');assert.equal(sydney.items[0].billingStatus,'posted');assert.equal(child(root,'managed-sydney').business.managedCharges.length,1);assert.equal(melbourne.items[0].status,'blocked');assert.equal(child(root,'managed-melbourne').business.managedCharges?.length||0,0);
 root=dispatchChild(root,'managed-melbourne',{type:'estate',command:{action:'fault',connector:'orchard-sync',fault:null}});
 root=SOC.dispatch(root,{type:'managed-operations',command:{action:'retry',job:'cross-customer-provision',customerId:'managed-melbourne'}});
 assert.equal(root.managedOperations.jobs[0].participants.find(x=>x.customerId==='managed-melbourne').retryCount,1);
 root=advance(root,2);const completed=root.managedOperations.jobs[0].participants;
 assert.ok(completed.every(x=>x.status==='complete'&&x.items[0].status==='complete'&&x.items[0].billingStatus==='posted'));
 for(const id of ['managed-sydney','managed-melbourne']){const c=child(root,id);assert.equal(c.business.managedCharges.length,1);const charge=c.business.managedCharges[0];assert.equal(charge.unit,'managed-operation');assert.equal(charge.quantity,1);assert.equal(charge.cents,50);assert.equal(charge.costCents,25);assert.equal(charge.usageId,completed.find(x=>x.customerId===id).items[0].usageId);}
 root=advance(root,1);assert.equal(child(root,'managed-sydney').business.managedCharges.length,1);assert.equal(child(root,'managed-melbourne').business.managedCharges.length,1);assert.equal(SOC.validateState(root),root);
 assert.equal(snapshot.jobs.length,1);
});

test('AC-SOC-307 stale per-resource generations block before charge and worker/save replay keeps bounded state deterministic',()=>{
 let root=start(setup()),customer='managed-sydney';root=submit(root,[participant(root,customer)],'stale-resource-work');const before=child(root,customer).resources.identity;
 root=dispatchChild(root,customer,{type:'configure',id:'identity',config:{enabled:false}});root=advance(root,1);
 const part=root.managedOperations.jobs[0].participants[0];assert.equal(part.items[0].status,'blocked');assert.equal(part.items[0].reason,'STALE_GENERATION');assert.equal(child(root,customer).business.managedCharges?.length||0,0);
 const save=JSON.stringify(root),restored=SOC.restore(save);assert.deepEqual(restored,root);const command={type:'advance',minutes:1},expected=SOC.dispatch(restored,command),worker={};vm.createContext(worker);vm.runInContext(SOC.workerSource()+';globalThis.engine=SOC;',worker);assert.equal(JSON.stringify(worker.engine.dispatch(SOC.restore(save),command)),JSON.stringify(expected));assert.equal(JSON.stringify(root),save);assert.ok(before.generation<child(root,customer).resources.identity.generation);
});

test('AC-SOC-308 managed-operation history and portfolio clock survive sandbox campaign track changes without impure reads',()=>{
 let root=start(setup(undefined,'sandbox'));root=submit(root,[participant(root,'managed-sydney')],'track-switch-job');root=advance(root,2);
 const beforeJobs=JSON.stringify(root.managedOperations.jobs),portfolioClock=root.portfolio.clock,serialized=JSON.stringify(root);
 SOC.calculate(root);SOC.managedOperations.inspect(root);SOC.validateState(root);assert.equal(JSON.stringify(root),serialized);
 root=SOC.dispatch(root,{type:'campaign',command:{action:'start'}});root=SOC.dispatch(root,{type:'campaign',command:{action:'select-track',track:'enterprise'}});
 assert.equal(root.scenario,'enterprise');assert.equal(root.portfolio.clock,portfolioClock);assert.equal(root.managedOperations.clock,portfolioClock);assert.equal(JSON.stringify(root.managedOperations.jobs),beforeJobs);assert.equal(SOC.validateState(root),root);
});

test('AC-SOC-309 posted managed history remains valid while an inactive portfolio child pauses and later catches up',()=>{
 let root=start(setup()),id='managed-sydney';root=submit(root,[participant(root,id)],'paused-customer-history');root=advance(root,2);
 const row=root.portfolio.customers.find(x=>x.id===id),contract=row.root.business.contracts.find(x=>x.offer==='managed-operations'),pausedAt=row.root.clock;assert.equal(row.root.business.managedCharges.length,1);
 root=dispatchChild(root,id,{type:'business',command:{action:'cancel',contract:contract.id}});root=SOC.dispatch(root,{type:'portfolio',command:{action:'deactivatecustomer',customerId:id}});root=advance(root,2);
 const inactive=root.portfolio.customers.find(x=>x.id===id);assert.equal(inactive.active,false);assert.equal(inactive.root.clock,pausedAt);assert.equal(inactive.root.business.managedCharges.length,1);assert.equal(SOC.validateState(root),root);
 root=SOC.dispatch(root,{type:'portfolio',command:{action:'activatecustomer',customerId:id}});const resumed=root.portfolio.customers.find(x=>x.id===id);assert.equal(resumed.active,true);assert.equal(resumed.root.clock,root.portfolio.clock);assert.equal(resumed.root.business.managedCharges.length,1);assert.equal(SOC.validateState(root),root);
});

test('AC-SOC-310 global managed obligations block portfolio deactivation after the child contract is canceled',()=>{
 let root=start(setup()),id='managed-sydney';root=submit(root,[participant(root,id)],'pause-blocked-job');root=dispatchChild(root,id,{type:'estate',command:{action:'fault',connector:'orchard-sync',fault:'OUTAGE'}});root=advance(root,1);
 const row=root.portfolio.customers.find(x=>x.id===id),contract=row.root.business.contracts.find(x=>x.offer==='managed-operations');assert.equal(root.managedOperations.jobs[0].participants[0].items[0].status,'blocked');
 root=dispatchChild(root,id,{type:'business',command:{action:'cancel',contract:contract.id}});const before=JSON.stringify(root);assert.throws(()=>SOC.dispatch(root,{type:'portfolio',command:{action:'deactivatecustomer',customerId:id}}),/CUSTOMER_HAS_OUTSTANDING_OBLIGATIONS/);assert.equal(JSON.stringify(root),before);
});
