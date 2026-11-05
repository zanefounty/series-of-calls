const test=require('node:test');
const assert=require('node:assert/strict');
const resilience=require('../src/game/23-provider-resilience.js');
const transport=require('../src/game/42-transport.js');

const customer={id:'canopy-customer',portfolioId:'canopy-customer',scenario:'enterprise',market:'au-sydney'};
function root({clock=0,extraEndpoint=false}={}){
 const resources={identity:{kind:'directory'},carrier:{kind:'trunk'},service:{kind:'queue'},desk:{kind:'endpoint'},room:{kind:'room'}};
 if(extraEndpoint)resources['dedicated-endpoint']={kind:'endpoint'};
 return {experience:{version:1,kind:'campaign',custom:false},providerCustomer:{version:1,id:customer.id},tenant:'canopy-tenant',jurisdiction:'AU',clock,resources,transport:transport.create({clock})};
}
function project(operationId,id,acceptedAt,setupCents=48000){return {id,postingId:`posting-${id}`,customerId:customer.id,kind:'operation',operationId,acceptedAt,setupCents,workMinutes:operationId==='managed-diverse-upstream'?10:8,status:'commissioning',configSubmittedAt:acceptedAt};}
function hooks(){return {validatePaidProject:(_provider,_customer,p)=>typeof p?.postingId==='string',managedEligibility:()=>true,resourceOwnedAt:(child,id,at)=>id==='dedicated-endpoint'&&child.dedicatedAt!==undefined&&child.dedicatedAt<=at,validateDomainState:()=>true};}
function apply(child,commands){for(const command of commands)transport.command(child,command,{authorize:()=>true,resourceExists:(_s,id)=>!!child.resources[id]});}
function install(provider,project,child,h){const customerRow=customer;const generated=resilience.commands(provider,customerRow,project,child,h);apply(child,generated.commands);const row=resilience.installation(provider,customerRow,project,child,h);project.operationReceipt={kind:project.operationId,projectId:project.id,postingId:project.postingId,installedAt:row.installedAt};child.providerResilience??={version:1,installations:[]};child.providerResilience.installations.push(row);provider.projects.push(project);return row;}
function advance(child,to){while(child.clock<to){child.clock++;transport.advance(child,{});}}

test('paid primary provisions two fixed sites and one typed 20 Mbps path; diversity adds an independent path without duplicate transport billing',()=>{
 const child=root(),provider={projects:[]},h=hooks(),primary=project('primary-upstream','project-primary',0),primaryReceipt=install(provider,primary,child,h);
 assert.deepEqual(primaryReceipt.bindings,[{resource:'identity',site:'canopy-customer-head'},{resource:'carrier',site:'canopy-customer-head'},{resource:'service',site:'canopy-customer-branch'},{resource:'desk',site:'canopy-customer-branch'},{resource:'room',site:'canopy-customer-branch'}]);
 assert.equal(child.transport.links['canopy-customer-a-primary'].desired.capacityMbps,20);
 assert.equal(child.transport.totalCosts,0);assert.deepEqual(child.transport.ledger,[]);
 assert.equal(resilience.validateCustomer(provider,customer,child,h),true);
 advance(child,8);primary.status='complete';
 const diverse=project('diverse-upstream','project-diverse',8,32000);install(provider,diverse,child,h);
 assert.equal(resilience.validateCustomer(provider,customer,child,h),true);
 assert.equal(child.transport.links['canopy-customer-a-primary'].provisioning.status,'ready');
 assert.equal(child.transport.links['canopy-customer-z-backup'].provisioning.status,'pending');
 advance(child,16);assert.equal(resilience.validateCustomer(provider,customer,child,h),true);
 const view=resilience.inspect(provider,customer,child,{transport});
 assert.equal(view.links.find(x=>x.id==='canopy-customer-z-backup').observed.ready,true);
 assert.deepEqual(view.paths.primary.edges,['canopy-customer-a-primary']);
 assert.equal(view.paths.diverse.ready,true);assert.deepEqual(view.paths.diverse.edges,['canopy-customer-z-backup']);
 assert.equal(view.links.find(x=>x.id==='canopy-customer-a-primary').effective.capacityMbps,20);
 transport.command(child,{action:'domain',id:'canopy-customer-primary-domain',failed:true},{authorize:()=>true});
 assert.equal(resilience.validateCustomer(provider,customer,child,h),true);
 const failed=resilience.inspect(provider,customer,child,{transport});
 assert.deepEqual(failed.paths.primary.edges,[]);assert.equal(failed.paths.primary.ready,false);
 assert.deepEqual(failed.paths.selected.edges,['canopy-customer-z-backup']);assert.equal(failed.paths.selected.ready,true);
 assert.equal(child.transport.totalCosts,0);assert.deepEqual(child.transport.ledger,[]);
});

test('paid installation rejects missing posting authority, extra sites and unpaid link capacity changes',()=>{
 const child=root(),provider={projects:[]},h=hooks(),p=project('primary-upstream','project-primary',0),plan=resilience.plan(p.operationId,customer,child,h);
 assert.throws(()=>resilience.commands(provider,customer,p,child,{}),/PAID_POSTING_REQUIRED/);
 const commands=resilience.commands(provider,customer,p,child,h);apply(child,commands.commands);const row=resilience.installation(provider,customer,p,child,h);p.operationReceipt={kind:p.operationId,projectId:p.id,postingId:p.postingId,installedAt:row.installedAt};child.providerResilience={version:1,installations:[row]};provider.projects.push(p);
 child.transport.links['canopy-customer-a-primary'].desired.capacityMbps=999;
 assert.throws(()=>resilience.validateCustomer(provider,customer,child,h),/INVALID_PROVIDER_RESILIENCE_LINK/);
 child.transport.links['canopy-customer-a-primary'].desired=structuredClone(plan.links[0].config);
 child.transport.links['canopy-customer-a-primary'].effective=structuredClone(plan.links[0].config);child.transport.links['canopy-customer-a-primary'].effectiveGeneration=1;child.transport.links['canopy-customer-a-primary'].provisioning.status='ready';
 assert.throws(()=>resilience.validateCustomer(provider,customer,child,h),/EARLY_EFFECTIVE/);
 child.transport.links['canopy-customer-a-primary'].effective=null;child.transport.links['canopy-customer-a-primary'].effectiveGeneration=null;child.transport.links['canopy-customer-a-primary'].provisioning.status='pending';
 child.transport.sites['canopy-customer-extra']={...structuredClone(child.transport.sites['canopy-customer-head']),id:'canopy-customer-extra'};
 assert.throws(()=>resilience.validateCustomer(provider,customer,child,h),/UNFUNDED_PROVIDER_TRANSPORT_OBJECT/);
});

test('endpoint bought after primary stays unbound until a paid binding extension and does not borrow or add Mbps',()=>{
 const child=root(),provider={projects:[]},h=hooks(),primary=project('primary-upstream','project-primary',0);install(provider,primary,child,h);advance(child,8);primary.status='complete';
 child.clock=9;child.dedicatedAt=9;child.resources['dedicated-endpoint']={kind:'endpoint'};
 assert.equal(child.transport.bindings['dedicated-endpoint'],undefined);
 const quote=resilience.canOrder(provider,customer,'upstream-binding-extension',child,h);assert.equal(quote.eligible,true);
 const extension=project('upstream-binding-extension','project-extension',9,8000),generated=resilience.commands(provider,customer,extension,child,h);
 assert.deepEqual(generated.commands,[{action:'bind',resource:'dedicated-endpoint',site:'canopy-customer-branch'}]);
 apply(child,generated.commands);const row=resilience.installation(provider,customer,extension,child,h);extension.operationReceipt={kind:extension.operationId,projectId:extension.id,postingId:extension.postingId,installedAt:row.installedAt};child.providerResilience.installations.push(row);provider.projects.push(extension);
 assert.equal(resilience.validateCustomer(provider,customer,child,h),true);
 assert.equal(child.transport.bindings['dedicated-endpoint'],'canopy-customer-branch');
 assert.equal(Object.keys(child.transport.links).length,1);assert.equal(child.transport.links['canopy-customer-a-primary'].effective.capacityMbps,20);
});

test('a second diversity order and managed diversity without earned eligibility are refused',()=>{
 const child=root(),provider={projects:[]},h=hooks(),primary=project('primary-upstream','project-primary',0);install(provider,primary,child,h);advance(child,8);primary.status='complete';
 const direct=project('diverse-upstream','project-diverse',8,32000);install(provider,direct,child,h);
 assert.equal(resilience.canOrder(provider,customer,'managed-diverse-upstream',child,{...h,managedEligibility:()=>false}).missing.includes('DIVERSE_PATH_ALREADY_FUNDED'),true);
 assert.throws(()=>resilience.commands(provider,customer,project('managed-diverse-upstream','project-managed',8,16000),child,h),/DIVERSE_PATH_ALREADY_FUNDED/);
});

test('unknown marker versions, orphan links and unreceipted domain changes fail closed while legacy empty roots remain valid',()=>{
 const legacy=root();assert.equal(resilience.validateCustomer({projects:[]},customer,legacy,hooks()),true);
 const child=root(),provider={projects:[]},h=hooks(),p=project('primary-upstream','project-primary',0);install(provider,p,child,h);
 child.providerResilience.version=2;assert.throws(()=>resilience.validateCustomer(provider,customer,child,h),/INVALID_PROVIDER_RESILIENCE_MARKER/);
 child.providerResilience.version=1;child.transport.domains['canopy-customer-primary-domain']=true;
 assert.throws(()=>resilience.validateCustomer(provider,customer,child,{...h,validateDomainState:undefined}),/DOMAIN_EVIDENCE/);
});

test('worker source contains a standalone resilience helper without changing the transport API',()=>{
 const source=resilience.source();assert.match(source,/const SOC_PROVIDER_RESILIENCE=/);assert.match(source,/function socProviderResilienceKernel/);assert.equal(typeof transport.resourcePath,'function');
});
