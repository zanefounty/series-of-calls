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

test('AC-SOC-531 managed leaver uses one explicit identity revocation, waits for effective readiness, and settles once',()=>{
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

test('AC-SOC-532 managed leaver rejects missing, extra, or multiple revocations without child mutation',()=>{
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

test('AC-SOC-533 managed leaver contracts must cover every concrete indirect resource returned by the hook',()=>{
 let root=start(setup());root=dispatchChild(root,'managed-sydney',{type:'calling',command:{action:'start'}});
 const row=root.portfolio.customers.find(x=>x.id==='managed-sydney');
 // A calling pack makes the child leaver hook require phone authority as well as identity.
 const participant=leaverParticipant(root,'managed-sydney');
 root=submit(root,[participant],'leaver-indirect-scope');const submitted=root.managedOperations.jobs[0].participants[0];
 assert.equal(submitted.status,'blocked');assert.equal(submitted.reason,'MANAGED_CONTRACT_RESOURCE_SCOPE');
 assert.equal(child(root,'managed-sydney').estate.jobs.length,0);assert.deepEqual(child(root,'managed-sydney').resources.identity.desired.identities,['alex','bea']);
});

test('AC-SOC-549 managed estate approval caps standalone retries and rejects imported attempt three',()=>{
 const fixture=require('./lib/managed-leaver-fixture');let root=fixture.setup({history:false,workforce:true,scopes:['identity','people']});
 root=fixture.nested(root,'leaver-a',{type:'interact',channel:'voice',from:'bea',to:'+61255500201',caseId:'retry-cap-active-work'});root=fixture.tick(root);
 assert.equal(fixture.child(root).workforceOps.assignments[0].status,'voice');root=fixture.submit(root);root=fixture.tick(root);
 let part=root.managedOperations.jobs[0].participants[0],job=fixture.child(root).estate.jobs.find(x=>x.id===part.childJobId);
 assert.equal(part.items[0].reason,'WORKFORCE_ASSIGNMENT_ACTIVE');assert.equal(job.attempts,1);
 root=fixture.retry(root);part=root.managedOperations.jobs[0].participants[0];job=fixture.child(root).estate.jobs.find(x=>x.id===part.childJobId);
 assert.equal(part.retryCount,1);assert.equal(job.attempts,2);assert.equal(part.items[0].reason,'WORKFORCE_ASSIGNMENT_ACTIVE');
 const command={type:'portfolio',command:{action:'dispatchcustomer',customerId:'leaver-a',command:{type:'estate',command:{action:'retry',job:job.id,managedApproval:structuredClone(job.managedApproval)}}}},before=JSON.stringify(root);
 assert.throws(()=>fixture.apply(root,command),/MANAGED_LEAVER_RETRY_LIMIT/);assert.equal(JSON.stringify(root),before);
 const standalone=structuredClone(fixture.child(root));standalone.estate.jobs.find(x=>x.id===job.id).attempts=3;
 assert.throws(()=>SOC.restore(JSON.stringify(standalone)),/INVALID_JML_SAVE/);
});
