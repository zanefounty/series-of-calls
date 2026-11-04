const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {SOC,apply,child,nested,pack,tick,managed,person,setup,participant,submit,retry}=require('./lib/managed-leaver-fixture');
const part=s=>s.managedOperations.jobs[0].participants[0];
const charges=(s,id='leaver-a')=>child(s,id).business.managedCharges||[];
const identity=s=>child(s).resources.identity;
const untouchedFailure=(s,command,error)=>{const before=JSON.stringify(s);assert.throws(()=>apply(s,command),error);assert.equal(JSON.stringify(s),before);};
const badSave=(s,edit,error)=>{const bad=structuredClone(s);edit(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)),error);};

test('managed leaver retains accepted customer history, retires only that identity and bills one observed complete resource',()=>{
 let s=setup();const before=s,c=child(s),history={case:structuredClone(c.cases['historic-alex']),acceptances:structuredClone(c.channels.acceptances),receipts:structuredClone(c.channels.receipts)},generation=c.resources.identity.generation;
 s=submit(s);assert.equal(part(s).status,'submitted');assert.equal(charges(s).length,0);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=tick(s);assert.equal(identity(s).desired.identities.includes('alex'),false);assert.equal(identity(s).effective.identities.includes('alex'),true);assert.equal(identity(s).generation,generation+1);assert.equal(part(s).items[0].status,'provisioning');assert.equal(charges(s).length,0,'a desired revocation is not chargeable completion');
 s=tick(s);assert.equal(identity(s).effective.identities.includes('alex'),false);assert.equal(identity(s).effective.entitled.includes('alex'),false);assert.equal(part(s).items[0].status,'complete');assert.equal(part(s).items[0].billingStatus,'posted');assert.equal(charges(s).length,1);assert.equal(charges(s)[0].unit,'managed-operation');assert.equal(charges(s)[0].quantity,1);assert.equal(charges(s)[0].cents,50);assert.equal(charges(s)[0].costCents,25);
 assert.deepEqual(child(s).cases['historic-alex'],history.case);assert.deepEqual(child(s).channels.acceptances,history.acceptances);assert.deepEqual(child(s).channels.receipts,history.receipts);assert.deepEqual(child(s,'leaver-b'),child(tick(before,2),'leaver-b'),'the other customer receives only its ordinary clock updates');
 const acceptanceCount=child(s).channels.acceptances.length;s=nested(s,'leaver-a',{type:'interact',channel:'message',from:'alex',to:'service',caseId:'retired-alex',account:'chatterleaf',purpose:'service',template:'service-outside-window'});assert.equal(child(s).interactions.at(-1).outcome,'UNKNOWN_CALLER');assert.equal(child(s).channels.acceptances.length,acceptanceCount);assert.equal(child(s).cases['retired-alex'],undefined);
 s=tick(s,2);assert.equal(charges(s).length,1);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('managed leaver waits for actual observed resource readiness before posting usage',()=>{
 let s=submit(setup({history:false}));s=tick(s);s=nested(s,'leaver-a',{type:'fault',id:'identity',fault:'OUTAGE'});s=tick(s);assert.equal(identity(s).effective.identities.includes('alex'),false);assert.equal(SOC.observe(child(s),'identity').ready,false);assert.equal(part(s).items[0].status,'provisioning');assert.equal(charges(s).length,0);
 s=nested(s,'leaver-a',{type:'fault',id:'identity',fault:null});s=tick(s);assert.equal(part(s).items[0].status,'complete');assert.equal(charges(s).length,1);s=tick(s);assert.equal(charges(s).length,1);
});

test('active named work fails atomically and requires an explicit managed retry after completion',()=>{
 let s=setup({history:false,workforce:true,scopes:['identity','people']});s=nested(s,'leaver-a',{type:'interact',channel:'voice',from:'bea',to:'+61255500201',caseId:'active-alex'});s=tick(s);assert.equal(child(s).interactions.at(-1).agent,'alex');assert.equal(child(s).workforceOps.assignments[0].status,'voice');const beforeIdentity=structuredClone(identity(s));
 s=submit(s);s=tick(s);assert.equal(part(s).items[0].status,'failed');assert.equal(part(s).items[0].reason,'WORKFORCE_ASSIGNMENT_ACTIVE');assert.deepEqual(identity(s),beforeIdentity);assert.equal(charges(s).length,0);assert.equal(child(s).workforceOps.assignments[0].person,'alex');
 s=tick(s,6);assert.equal(child(s).interactions.at(-1).phase,'resolved');assert.equal(child(s).workforceOps.assignments[0].status,'complete');assert.equal(identity(s).desired.identities.includes('alex'),true,'ending work alone does not authorize a managed retry');assert.equal(part(s).retryCount,0);
 s=retry(s);assert.equal(part(s).retryCount,1);assert.equal(identity(s).desired.identities.includes('alex'),false);assert.equal(charges(s).length,0);s=tick(s);assert.equal(part(s).status,'complete');assert.equal(charges(s).length,1);assert.equal(child(s).workforceOps.roster.effective.find(p=>p.id==='alex').available,false);
 untouchedFailure(s,{type:'managed-operations',command:{action:'retry',job:'managed-leaver',customerId:'leaver-a'}},/MANAGED_RETRY_UNAVAILABLE/);assert.equal(charges(s).length,1);
});

test('delayed leaver rechecks cancellation and exact renewal deadline before mutating the child',()=>{
 for(const cancellation of [true,false]){let s=setup({history:false});const contract=child(s).business.contracts[0];if(!cancellation)s=tick(s,contract.renewAt-s.clock-1);s=submit(s);if(cancellation)s=pack(s,'leaver-a','business',{action:'cancel',contract:contract.id});const before=structuredClone(identity(s));s=tick(s);assert.deepEqual(identity(s),before);assert.equal(part(s).items[0].status,'failed');assert.equal(part(s).items[0].reason,'MANAGED_SUPPORT_CONTRACT_REQUIRED');assert.equal(charges(s).length,0);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);}
});

test('delayed leaver rechecks revoked managed operator authority before atomic application',()=>{
 let s=submit(setup({history:false}));s=pack(s,'leaver-a','business',{action:'revoke',grant:'customer-service'});const before=structuredClone(identity(s));s=tick(s);assert.deepEqual(identity(s),before);assert.equal(part(s).items[0].status,'failed');assert.equal(part(s).items[0].reason,'MANAGED_AUTHORITY_DENIED');assert.equal(charges(s).length,0);
});

test('new calling or workforce dependencies after submit cannot enlarge the approved managed scope',()=>{
 for(const dependency of ['calling','workforce']){let s=submit(setup({history:false}));const before=structuredClone(identity(s));s=pack(s,'leaver-a',dependency,{action:'start'});if(dependency==='workforce')s=pack(s,'leaver-a','workforce',{action:'roster',people:[structuredClone(person)],operator:'player'});const snapshot=structuredClone(child(s)[dependency==='calling'?'calling':'workforceOps']);s=tick(s);assert.deepEqual(identity(s),before);assert.equal(part(s).items[0].status,'failed');assert.equal(part(s).items[0].reason,'MANAGED_LEAVER_SCOPE_CHANGED');assert.equal(charges(s).length,0);if(dependency==='calling')assert.deepEqual(child(s).calling.nodes.directory.desired,snapshot.nodes.directory.desired);else assert.equal(child(s).workforceOps.roster.desired[0].available,true);}
});

test('contract scope, connector capability and exact revocation input remain fail-closed',()=>{
 let s=setup({history:false,scopes:['phone']});const before=structuredClone(identity(s));s=submit(s);assert.equal(part(s).reason,'MANAGED_CONTRACT_RESOURCE_SCOPE');assert.equal(part(s).childJobId,null);assert.deepEqual(identity(s),before);assert.equal(charges(s).length,0);
 s=submit(setup({history:false,connectorActions:['provision']}));assert.equal(part(s).reason,'CONNECTOR_CAPABILITY');assert.equal(part(s).childJobId,null);assert.equal(charges(s).length,0);
 s=setup({history:false});for(const revocations of [[],['number'],['identity','number'],['identity','identity']]){const p=participant(s);p.items[0].revocations=revocations;untouchedFailure(s,{type:'managed-operations',command:{action:'submit',id:'malformed-revocation',participants:[p]}},/INVALID_MANAGED_ITEM/);}
});

test('stale identity generations cannot be refreshed by retrying an old leaver snapshot',()=>{
 let s=submit(setup({history:false}));s=nested(s,'leaver-a',{type:'configure',id:'identity',config:{region:'AU'}});s=tick(s);assert.equal(part(s).items[0].reason,'STALE_GENERATION');assert.equal(identity(s).desired.identities.includes('alex'),true);assert.equal(charges(s).length,0);
 const before=JSON.stringify(identity(s));try{s=retry(s);}catch(error){assert.match(error.message,/STALE|SCOPE/);}assert.equal(JSON.stringify(identity(s)),before);assert.equal(charges(s).length,0);
});

test('pending and completed leaver saves validate exact child approval and revocation lineage',()=>{
 for(const completed of [false,true]){let s=submit(setup({history:false}));if(completed)s=tick(s,2);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
  const childJob=x=>child(x).estate.jobs.find(j=>j.id===part(x).childJobId);
  if(completed){const isolated=structuredClone(child(s));assert.equal(isolated.business.managedCharges.length,1);assert.deepEqual(SOC.restore(JSON.stringify(isolated)),isolated);delete isolated.estate.jobs.find(j=>j.id===part(s).childJobId).managedApproval;assert.throws(()=>SOC.restore(JSON.stringify(isolated)),/MANAGED|ESTATE|LEAVER|JML/);}
  for(const edit of [x=>part(x).items[0].revocations=[],x=>childJob(x).items[0].revocations=['number'],x=>{delete childJob(x).managedApproval;},x=>childJob(x).managedApproval.tenant='other-tenant',x=>childJob(x).managedApproval.operator='grove-vendor',x=>childJob(x).managedApproval.requiredResources=['identity','phone']])badSave(s,edit,/MANAGED|ESTATE|LEAVER|JML/);
 }
});

test('completed leaver history survives later contract cancellation and dependency introduction',()=>{
 let s=tick(submit(setup({history:false})),2);assert.equal(charges(s).length,1);const receipt=structuredClone(charges(s)[0]);s=pack(s,'leaver-a','business',{action:'cancel',contract:part(s).contractId});s=pack(s,'leaver-a','calling',{action:'start'});assert.deepEqual(SOC.restore(JSON.stringify(s)),s);assert.deepEqual(charges(s)[0],receipt);
});

test('direct customer estate leaver is a valid alternative with no managed usage charge',()=>{
 let s=setup({history:false}),p=participant(s);s=pack(s,'leaver-a','estate',{action:'jml',operation:'leaver',connector:p.connector,kind:'user',items:p.items});s=tick(s,2);assert.equal(identity(s).effective.identities.includes('alex'),false);assert.equal(child(s).estate.jobs[0].status,'complete');assert.equal(charges(s).length,0);assert.equal(s.managedOperations.jobs.length,0);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('full-root leaver dispatch is worker-equivalent and repeated inspection stays pure',()=>{
 const s=submit(setup()),before=JSON.stringify(s);assert.deepEqual(SOC.calculate(s),SOC.calculate(s));SOC.managedOperations.inspect(s);SOC.validateState(s);assert.equal(JSON.stringify(s),before);
 const command={type:'advance',minutes:2},expected=apply(SOC.restore(before),command),sandbox={};vm.createContext(sandbox);vm.runInContext(SOC.workerSource()+';globalThis.E=SOC;',sandbox);assert.equal(JSON.stringify(sandbox.E.dispatch(SOC.restore(before),command)),JSON.stringify(expected));assert.equal(part(expected).status,'complete');assert.equal(charges(expected).length,1);
});


test('a repaired connector outage requires explicit managed retry and child retry cannot bypass its counter',()=>{
 let s=submit(setup({history:false}));s=pack(s,'leaver-a','estate',{action:'fault',connector:'leaver-sync',fault:'OUTAGE'});const before=structuredClone(identity(s));s=tick(s);assert.equal(part(s).items[0].status,'blocked');assert.equal(part(s).items[0].reason,'CONNECTOR_FAULT');assert.equal(child(s).estate.jobs[0].attempts,1);assert.deepEqual(identity(s),before);assert.equal(charges(s).length,0);
 s=pack(s,'leaver-a','estate',{action:'fault',connector:'leaver-sync',fault:null});s=tick(s,3);assert.equal(part(s).items[0].status,'blocked');assert.equal(child(s).estate.jobs[0].attempts,1);assert.equal(part(s).retryCount,0);assert.deepEqual(identity(s),before);
 const job=child(s).estate.jobs.find(j=>j.id===part(s).childJobId);for(const supplied of [false,true]){const command={type:'portfolio',command:{action:'dispatchcustomer',customerId:'leaver-a',command:{type:'estate',command:{action:'retry',job:job.id,...(supplied?{managedApproval:structuredClone(job.managedApproval)}:{})}}}};untouchedFailure(s,command,/MANAGED/);}
 s=retry(s);assert.equal(part(s).retryCount,1);assert.equal(child(s).estate.jobs[0].attempts,2);assert.equal(identity(s).desired.identities.includes('alex'),false);assert.equal(charges(s).length,0);s=tick(s);assert.equal(part(s).status,'complete');assert.equal(charges(s).length,1);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
