const test=require('node:test');
const assert=require('node:assert/strict');
const {SOC,setup,child,dispatchChild,advance}=require('./helpers/managed-fixture');

const start=root=>SOC.dispatch(root,{type:'managed-operations',command:{action:'start'}});
function leaverParticipant(root,customerId,options={}){
 const row=root.portfolio.customers.find(x=>x.id===customerId),contract=row.root.business.contracts.find(x=>x.offer==='managed-operations'&&x.status==='active');
 const config=structuredClone(row.root.resources.identity.desired),principal=options.principal||'alex';
 config.identities=config.identities.filter(x=>x!==principal);config.entitled=config.entitled.filter(x=>x!==principal);
 const item={resource:'identity',config};if(Object.prototype.hasOwnProperty.call(options,'revocations'))item.revocations=options.revocations;else item.revocations=['identity'];
 return {customerId,contractId:contract.id,connector:'orchard-sync',operation:'leaver',items:[item]};
}
const submit=(root,participants,id='managed-identity-leaver')=>SOC.dispatch(root,{type:'managed-operations',command:{action:'submit',id,participants}});

test('managed leaver uses one explicit identity revocation, waits for effective readiness, and settles once',()=>{
 let root=start(setup()),participant=leaverParticipant(root,'managed-sydney');
 root=submit(root,[participant]);
 const part=root.managedOperations.jobs[0].participants[0],row=root.portfolio.customers.find(x=>x.id==='managed-sydney');
 assert.equal(part.status,'submitted');assert.deepEqual(part.requiredResources,['identity']);
 const childJob=row.root.estate.jobs.at(-1);assert.equal(childJob.operation,'leaver');assert.deepEqual(childJob.items[0].revocations,['identity']);
 assert.deepEqual(childJob.managedApproval,{tenant:row.root.tenant,contractId:part.contractId,operator:part.operator,requiredResources:['identity']});
 root=advance(root,1);assert.equal(root.managedOperations.jobs[0].participants[0].items[0].status,'provisioning');assert.equal(child(root,'managed-sydney').business.managedCharges?.length||0,0);
 root=advance(root,1);const completed=root.managedOperations.jobs[0].participants[0],retired=child(root,'managed-sydney');
 assert.equal(completed.status,'complete');assert.equal(completed.items[0].billingStatus,'posted');assert.equal(retired.resources.identity.effective.identities.includes('alex'),false);assert.equal(retired.resources.identity.effective.entitled.includes('alex'),false);
 assert.equal(retired.business.managedCharges.length,1);assert.equal(retired.business.managedCharges[0].resource,'identity');assert.equal(retired.business.managedCharges[0].quantity,1);
 root=advance(root,1);assert.equal(child(root,'managed-sydney').business.managedCharges.length,1);assert.equal(SOC.validateState(root),root);
});

test('managed leaver rejects missing, extra, or multiple revocations without child mutation',()=>{
 const root=start(setup());
 for(const [revocations,id] of [[undefined,'missing'],[['identity','number'],'extra'],[['identity','identity'],'duplicate']]){
  const participant=leaverParticipant(root,'managed-sydney',{revocations});
  const before=JSON.stringify(root),command={type:'managed-operations',command:{action:'submit',id:`leaver-${id}`,participants:[participant]}};
  assert.throws(()=>SOC.dispatch(root,command),/INVALID_MANAGED_ITEM|INVALID_MANAGED_JOB/);
  assert.equal(JSON.stringify(root),before);
 }
 const multi=leaverParticipant(root,'managed-sydney');multi.items.push(structuredClone(multi.items[0]));
 assert.throws(()=>SOC.dispatch(root,{type:'managed-operations',command:{action:'submit',id:'leaver-multiple',participants:[multi]}}),/INVALID_MANAGED_JOB/);
 assert.equal(child(root,'managed-sydney').estate.jobs.length,0);
});

test('managed leaver contracts must cover every concrete indirect resource returned by the hook',()=>{
 let root=start(setup());root=dispatchChild(root,'managed-sydney',{type:'calling',command:{action:'start'}});
 const row=root.portfolio.customers.find(x=>x.id==='managed-sydney');
 // A calling pack makes the child leaver hook require phone authority as well as identity.
 const participant=leaverParticipant(root,'managed-sydney');
 root=submit(root,[participant],'leaver-indirect-scope');const submitted=root.managedOperations.jobs[0].participants[0];
 assert.equal(submitted.status,'blocked');assert.equal(submitted.reason,'MANAGED_CONTRACT_RESOURCE_SCOPE');
 assert.equal(child(root,'managed-sydney').estate.jobs.length,0);assert.deepEqual(child(root,'managed-sydney').resources.identity.desired.identities,['alex','bea']);
});
