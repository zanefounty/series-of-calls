const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const P=require('../src/game/37-portfolio');
const M=require('../src/game/29-managed-operations');

const clone=x=>JSON.parse(JSON.stringify(x));
function child(id,tenant,resources){
 const root={clock:0,revision:0,commands:[],tenant,scenario:'smb',jurisdiction:'AU',resources:{},business:{contracts:[{id:`managed-${id}`,offer:'managed-operations',unit:'managed-operation',currency:'AUD',customer:'customer',supportOwner:'orchard-msp',resources:[...resources],sell:true,status:'active'}],organisations:{customer:{roles:['customer']},'orchard-msp':{roles:['msp']}},grants:[{id:'customer-service',resources:[...resources],actions:['configure'],expires:100}],ledger:[],managedCharges:[]},estate:{pack:'soc-estate-1',inventory:[],connectors:[{id:'sync',generation:1,effective:{actions:['provision'],resourceKinds:['user'],version:1,localDependency:false},provisioning:{status:'ready',generation:1},observed:{authenticated:true,delegated:true,reachable:true,fault:null}}],jobs:[],nextId:1},testOutcomes:{}};
 for(const resource of resources){const config={enabled:true,local:false,identities:['alex','bea'],entitled:['alex','bea'],region:'AU'};root.resources[resource]={id:resource,kind:'directory',generation:1,desired:clone(config),effective:clone(config),provisioning:{status:'ready',generation:1,due:0}};root.estate.inventory.push({sourceKey:`source-${resource}`,kind:'user',observedId:`observed-${resource}`,canonicalId:resource,resourceId:resource,confidence:1,conflicts:[],unknowns:[],generation:1,observedAt:0});}
 return root;
}
function fixture(){
 const root={clock:0,portfolio:P.create({clock:0})};
 for(const [id,tenant,resources] of [['customer-a','tenant-a',['alice','bob']],['customer-b','tenant-b',['carol']]]){const childRoot=child(id,tenant,resources);root.portfolio.customers.push({id,tenant,name:id,market:'au-sydney',scenario:'smb',jurisdiction:'AU',clock:0,active:true,root:childRoot});}
 root.managedOperations=M.create(root);return root;
}
function dispatchCustomer(root,customerId,command){
 P.command(root.portfolio,{action:'dispatchcustomer',customerId,command},{dispatchCustomer:(old,nested)=>{
  const next=clone(old);next.revision++;next.commands.push({revision:next.revision,at:old.clock,command:clone(nested)});
  if(nested.type!=='estate')throw Error('unexpected child command');const e=nested.command;
  if(e.action==='jml'){
   const items=e.items.map(x=>{const r=next.resources[x.resource],inv=next.estate.inventory.find(v=>v.canonicalId===x.resource);return {resource:x.resource,kind:'user',config:clone(x.config),revocations:[],sourceKey:inv.sourceKey,expectedGeneration:r.generation,status:'pending',reason:null,appliedGeneration:null};});
   next.estate.jobs.push({id:`estate-job-${next.estate.nextId++}`,operation:e.operation,connector:e.connector,items,status:'pending',attempts:0});
  }else if(e.action==='retry'){
   const job=next.estate.jobs.find(x=>x.id===e.job);if(!job)throw Error('JML_JOB_UNAVAILABLE');job.attempts++;
   for(const item of job.items){if(item.status==='complete')continue;if(next.testOutcomes[item.resource]===true){const r=next.resources[item.resource];r.desired=clone(item.config);r.generation++;r.effective=clone(item.config);r.provisioning={status:'ready',generation:r.generation,due:next.clock};item.status='complete';item.reason=null;item.appliedGeneration=r.generation;}else{item.status='failed';item.reason='CONFIGURATION_REJECTED';}}
   job.status=job.items.every(x=>x.status==='complete')?'complete':'partial';
  }else throw Error('unexpected estate command');
  return next;
 },validateCustomer:()=>true});
 return root.portfolio.customers.find(x=>x.id===customerId).root;
}
function hooks(overrides={}){return {
 dispatchCustomer,
 authorizeCustomer:(root,{customerId,contractId,operator,resource,action})=>{const c=root.portfolio.customers.find(x=>x.id===customerId)?.root,b=c?.business;return b?.contracts.some(x=>x.id===contractId&&x.supportOwner===operator&&x.resources.includes(resource))===true&&b.grants.some(g=>g.resources.includes(resource)&&g.actions.includes(action)&&g.expires>root.clock)===true;},
 resourceReadiness:(root,{customerId,resource,generation,config})=>{const r=root.portfolio.customers.find(x=>x.id===customerId)?.root?.resources?.[resource];return !!r&&r.generation===generation&&r.provisioning?.status==='ready'&&r.provisioning.generation===generation&&JSON.stringify(r.effective)===JSON.stringify(config);},
 settleUsage:(root,q)=>{const childRoot=root.portfolio.customers.find(x=>x.id===q.customerId)?.root;if(!childRoot)throw Error('unknown customer');const entry={id:`entry-${childRoot.business.ledger.length+1}`,at:q.at,category:'revenue',cents:50,currency:'AUD',contract:q.contractId,customerId:q.customerId,usageId:q.usageId,operator:q.operator,resource:q.resource,appliedGeneration:q.appliedGeneration,unit:q.unit,quantity:q.quantity};childRoot.business.ledger.push(entry);const receipt={status:'posted',usageId:q.usageId,customerId:q.customerId,contractId:q.contractId,operator:q.operator,resource:q.resource,appliedGeneration:q.appliedGeneration,unit:q.unit,quantity:q.quantity,entryId:entry.id,currency:entry.currency,cents:entry.cents,at:entry.at};childRoot.business.managedCharges.push({...receipt,costEntryId:'entry-99',costCategory:'cost',costCents:25});return receipt;},
 ...overrides
};}
const participant=(customerId,contractId,items,operation='joiner')=>({customerId,contractId,connector:'sync',operation,items:items.map(resource=>{const config={enabled:true,local:false,identities:['alex','bea',`new-${resource}`],entitled:['alex','bea',`new-${resource}`],region:'AU'};return {resource,config};})});

test('AC-SOC-299 cross-customer jobs keep tenant and per-resource outcomes, then retry only unfinished work once',()=>{
 const s=fixture(),h=hooks();
 const job=M.command(s,{action:'submit',id:'managed-batch',participants:[participant('customer-a','managed-customer-a',['alice','bob']),participant('customer-b','managed-customer-b',['carol'])]},h);
 assert.equal(job.status,'submitted');assert.deepEqual(job.participants.map(x=>x.status),['submitted','submitted']);
 const a=s.portfolio.customers.find(x=>x.id==='customer-a').root,j=a.estate.jobs[0];
 a.testOutcomes.alice=true;const alice=a.resources.alice;alice.generation++;alice.desired=clone(j.items[0].config);alice.effective=clone(j.items[0].config);alice.provisioning={status:'ready',generation:alice.generation,due:0};j.items[0].status='complete';j.items[0].appliedGeneration=alice.generation;j.status='partial';j.items[1].status='failed';j.items[1].reason='CONFIGURATION_REJECTED';
 M.advance(s,h);assert.equal(job.participants[0].status,'partial');assert.equal(job.participants[0].items[0].billingStatus,'posted');assert.equal(job.participants[0].items[1].billingStatus,'deferred');assert.equal(job.participants[1].status,'submitted');assert.equal(a.business.ledger.length,1);
 a.testOutcomes.bob=true;M.command(s,{action:'retry',job:job.id,customerId:'customer-a'},h);const aAfter=s.portfolio.customers.find(x=>x.id==='customer-a').root;
 assert.deepEqual(job.participants[0].items.map(x=>x.status),['complete','complete']);assert.deepEqual(job.participants[0].items.map(x=>x.billingStatus),['posted','posted']);assert.equal(aAfter.estate.jobs[0].items[0].appliedGeneration,2);assert.equal(aAfter.business.ledger.length,2,'successful Alice item is not charged again');assert.equal(job.participants[1].status,'submitted','retry for one tenant cannot dispatch in another');
 assert.throws(()=>M.command(s,{action:'retry',job:job.id,customerId:'customer-a'},h),/MANAGED_RETRY_UNAVAILABLE/);assert.equal(M.validate(s),true);
});

test('AC-SOC-300 contract, connector, canonical inventory, resource scope, and child authority fail closed per customer',()=>{
 const s=fixture(),h=hooks();const b=s.portfolio.customers.find(x=>x.id==='customer-b').root;b.business.grants[0].resources=[];
 const job=M.command(s,{action:'submit',id:'partial-admission',participants:[participant('customer-a','managed-customer-a',['alice']),participant('customer-b','managed-customer-b',['carol'])]},h);
 assert.deepEqual(job.participants.map(x=>x.status),['submitted','blocked']);assert.equal(job.participants[1].reason,'MANAGED_AUTHORITY_DENIED');assert.equal(b.estate.jobs.length,0);
 const s2=fixture(),c=s2.portfolio.customers.find(x=>x.id==='customer-a').root;c.estate.connectors[0].observed.reachable=false;
 const denied=M.command(s2,{action:'submit',id:'connector-down',participants:[participant('customer-a','managed-customer-a',['alice'])]},hooks());assert.equal(denied.participants[0].reason,'CONNECTOR_UNREACHABLE');assert.equal(c.estate.jobs.length,0);
 const s3=fixture(),d=s3.portfolio.customers.find(x=>x.id==='customer-a').root;d.business.contracts[0].resources=['bob'];const scope=M.command(s3,{action:'submit',id:'resource-out-of-contract',participants:[participant('customer-a','managed-customer-a',['alice'])]},hooks());assert.equal(scope.participants[0].reason,'MANAGED_CONTRACT_RESOURCE_SCOPE');assert.equal(d.estate.jobs.length,0);
 const extra={...participant('customer-a','managed-customer-a',['alice']),unexpected:true};assert.throws(()=>M.command(s3,{action:'submit',id:'invalid-shape',participants:[extra]},h),/INVALID_MANAGED_JOB/);
});

test('AC-SOC-301 joiner and mover jobs require a meaningful supported identity change instead of billing a no-op',()=>{
 const s=fixture(),h=hooks(),base=s.portfolio.customers[0].root.resources.alice.desired,moverConfig=clone(base);moverConfig.entitled=moverConfig.entitled.filter(x=>x!=='alex');
 const accepted=M.command(s,{action:'submit',id:'entitlement-move',participants:[{customerId:'customer-a',contractId:'managed-customer-a',connector:'sync',operation:'mover',items:[{resource:'alice',config:moverConfig}]}]},h);assert.equal(accepted.participants[0].status,'submitted');assert.equal(accepted.participants[0].items[0].priorConfig.identities.join(','),moverConfig.identities.join(','));
 const forged=clone(s),forgedPart=forged.managedOperations.jobs[0].participants[0],forgedItem=forgedPart.items[0];forgedPart.operation='joiner';forgedItem.config=clone(forgedItem.priorConfig);forgedItem.config.identities.push('jules');forgedItem.config.entitled.push('jules');assert.throws(()=>M.validate(forged),/INVALID_MANAGED_CHILD_LINEAGE/,'a changed managed snapshot cannot diverge from the actual child JML request');
 const noOp=fixture(),same=noOp.portfolio.customers[0].root.resources.alice.desired,blocked=M.command(noOp,{action:'submit',id:'no-op',participants:[{customerId:'customer-a',contractId:'managed-customer-a',connector:'sync',operation:'mover',items:[{resource:'alice',config:clone(same)}]}]},hooks());assert.equal(blocked.participants[0].status,'blocked');assert.equal(blocked.participants[0].reason,'MANAGED_OPERATION_NO_CHANGE');assert.equal(noOp.portfolio.customers[0].root.estate.jobs.length,0);
 const unsupported=fixture(),moveIdentity=clone(unsupported.portfolio.customers[0].root.resources.alice.desired);moveIdentity.identities.push('new-alex');const invalid=M.command(unsupported,{action:'submit',id:'unsupported-move',participants:[{customerId:'customer-a',contractId:'managed-customer-a',connector:'sync',operation:'mover',items:[{resource:'alice',config:moveIdentity}]}]},hooks());assert.equal(invalid.participants[0].status,'blocked');assert.equal(invalid.participants[0].reason,'MANAGED_OPERATION_NO_CHANGE');assert.equal(unsupported.portfolio.customers[0].root.estate.jobs.length,0);
});

test('AC-SOC-302 stale generations and forged job results cannot become delivered or billed evidence',()=>{
 const s=fixture(),h=hooks();const job=M.command(s,{action:'submit',id:'stale-work',participants:[participant('customer-a','managed-customer-a',['alice'])]},h),a=s.portfolio.customers.find(x=>x.id==='customer-a').root,j=a.estate.jobs[0];
 a.resources.alice.generation++;j.items[0].status='blocked';j.items[0].reason='STALE_GENERATION';M.advance(s,h);assert.equal(job.participants[0].items[0].status,'blocked');assert.equal(a.business.ledger.length,0);
 const forged=clone(s);forged.managedOperations.jobs[0].participants[0].items[0].status='complete';forged.managedOperations.jobs[0].participants[0].items[0].appliedGeneration=2;assert.throws(()=>M.validate(forged),/INVALID_MANAGED_CHILD_LINEAGE|INVALID_MANAGED_PARTICIPANT_STATUS/);
});

test('AC-SOC-303 settlement is typed, idempotent per completed item, and never invents a price when no hook exists',()=>{
 const s=fixture(),h=hooks();const job=M.command(s,{action:'submit',id:'settled-work',participants:[participant('customer-a','managed-customer-a',['alice'])]},h),a=s.portfolio.customers.find(x=>x.id==='customer-a').root,j=a.estate.jobs[0];j.items[0].status='complete';j.items[0].appliedGeneration=2;a.resources.alice.generation=2;a.resources.alice.desired=clone(j.items[0].config);a.resources.alice.effective=clone(j.items[0].config);a.resources.alice.provisioning={status:'ready',generation:2,due:0};M.advance(s,h);
 const item=job.participants[0].items[0],before=JSON.stringify(item.billingReceipt);assert.equal(item.billingStatus,'posted');assert.equal(a.business.ledger[0].usageId,item.usageId);assert.equal(a.business.ledger[0].unit,'managed-operation');assert.equal(a.business.ledger[0].quantity,1);assert.equal(a.business.ledger[0].cents,50);M.advance(s,h);assert.equal(a.business.ledger.length,1);assert.equal(JSON.stringify(item.billingReceipt),before);
 const deferred=fixture(),noBilling=hooks({settleUsage:undefined}),pending=M.command(deferred,{action:'submit',id:'deferred-work',participants:[participant('customer-a','managed-customer-a',['alice'])]},noBilling),childRoot=deferred.portfolio.customers.find(x=>x.id==='customer-a').root,childJob=childRoot.estate.jobs[0];childJob.items[0].status='complete';childJob.items[0].appliedGeneration=2;childRoot.resources.alice.generation=2;childRoot.resources.alice.desired=clone(childJob.items[0].config);childRoot.resources.alice.effective=clone(childJob.items[0].config);childRoot.resources.alice.provisioning={status:'ready',generation:2,due:0};M.advance(deferred,noBilling);assert.equal(pending.participants[0].items[0].billingStatus,'deferred');assert.equal(childRoot.business.ledger.length,0);assert.equal(M.inspect(deferred).deferredUsage.length,1);
 const corrupt=clone(s);corrupt.portfolio.customers[0].root.business.ledger[0].cents++;assert.throws(()=>M.validate(corrupt),/INVALID_MANAGED_USAGE_RECEIPT/);const pruned=clone(s);pruned.portfolio.customers[0].root.business.ledger=[];assert.equal(M.validate(pruned),true,'managed-charge lineage retains receipt after bounded ledger pruning');
});

test('AC-SOC-304 estate completion waits for matching effective provisioned and observed resource state before settlement',()=>{
 const s=fixture(),h=hooks(),job=M.command(s,{action:'submit',id:'await-effective',participants:[participant('customer-a','managed-customer-a',['alice'])]},h),childRoot=s.portfolio.customers.find(x=>x.id==='customer-a').root,childJob=childRoot.estate.jobs[0],resource=childRoot.resources.alice;
 childJob.items[0].status='complete';childJob.items[0].appliedGeneration=2;resource.generation=2;resource.desired=clone(childJob.items[0].config);resource.provisioning={status:'pending',generation:2,due:1};M.advance(s,h);
 assert.equal(job.participants[0].items[0].status,'provisioning');assert.equal(job.participants[0].items[0].billingStatus,'deferred');assert.equal(childRoot.business.ledger.length,0);assert.equal(M.validate(s),true);
 assert.throws(()=>M.command(s,{action:'retry',job:job.id,customerId:'customer-a'},h),/MANAGED_RETRY_UNAVAILABLE/,'a complete estate item waiting for provisioning does not burn its retry');assert.equal(job.participants[0].retryCount,0);
 resource.effective=clone(childJob.items[0].config);resource.provisioning={status:'ready',generation:2,due:1};M.advance(s,h);assert.equal(job.participants[0].items[0].status,'complete');assert.equal(job.participants[0].items[0].billingStatus,'posted');assert.equal(childRoot.business.ledger.length,1);resource.generation=3;resource.desired={enabled:false};resource.effective={enabled:false};resource.provisioning={status:'ready',generation:3,due:2};M.advance(s,h);assert.equal(job.participants[0].items[0].status,'complete','later resource changes do not erase historical successful operation');assert.equal(childRoot.business.ledger.length,1);assert.equal(M.validate(s),true);
});

test('AC-SOC-305 read, fingerprints, saves and worker factory are deterministic and mutation resistant',()=>{
 const s=fixture(),before=JSON.stringify(s),report=M.inspect(s),fingerprint=M.fingerprint(s);assert.deepEqual(M.inspect(JSON.parse(before)),report);assert.equal(M.fingerprint(JSON.parse(before)),fingerprint);assert.equal(JSON.stringify(s),before);
 const worker={};vm.createContext(worker);vm.runInContext(M.source()+';globalThis.managed=SOC_MANAGED_OPERATIONS;',worker);assert.equal(worker.managed.PACK,M.PACK);assert.equal(worker.managed.UNIT,'managed-operation');assert.deepEqual(JSON.parse(JSON.stringify(worker.managed.inspect(s))),report);
 const forged=clone(s);forged.managedOperations.jobs.push({...forged.managedOperations.jobs[0],id:'forged-job'});assert.throws(()=>M.validate(forged),/INVALID_MANAGED_OPERATIONS_SAVE/);
});
