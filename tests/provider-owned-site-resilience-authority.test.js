'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const resilience=require('../src/game/23-provider-resilience');
const transport=require('../src/game/42-transport');
const SOC=require('../src/game/55-communications');

const customer={id:'canopy-customer',portfolioId:'canopy-customer',scenario:'enterprise',market:'au-sydney'};
const names={head:'canopy-customer-head',branch:'canopy-customer-branch',ingress:'canopy-customer-ingress',primary:'canopy-customer-a-primary',ingressHead:'canopy-customer-ingress-head',ingressBranch:'canopy-customer-ingress-branch',headDomain:'canopy-customer-head-domain',branchDomain:'canopy-customer-branch-domain',primaryDomain:'canopy-customer-primary-domain',ingressDomain:'canopy-customer-ingress-domain',ingressHeadDomain:'canopy-customer-ingress-head-domain',ingressBranchDomain:'canopy-customer-ingress-branch-domain'};
function root(){
 const resources={identity:{kind:'directory'},carrier:{kind:'trunk'},service:{kind:'queue'},desk:{kind:'endpoint'},room:{kind:'room'},'dedicated-endpoint':{kind:'endpoint'},alex:{kind:'identity'},bea:{kind:'identity'}};
 return {experience:{version:1,kind:'campaign',custom:false},providerCustomer:{version:1,id:customer.id,portfolioId:customer.portfolioId},tenant:'canopy-tenant',jurisdiction:'AU',clock:0,resources,transport:transport.create({clock:0})};
}
function project(operationId,id,acceptedAt,setupCents,configSubmittedAt=acceptedAt){return {id,postingId:`posting-${id}`,customerId:customer.id,kind:'operation',operationId,acceptedAt,setupCents,workMinutes:8,status:'commissioning',configSubmittedAt,completedAt:null};}
function makeFixture(){
 const child=root(),provider={projects:[]};let evolution={version:1,sites:[],links:[],bindings:[],domains:[]};
 const hooks={validatePaidProject:()=>true,resourceOwnedAt:(_child,id)=>id==='dedicated-endpoint',authorizedTransportEvolution:()=>evolution,validateDomainState:()=>true};
 const primary=project('primary-upstream','project-primary',0,48000,0),created=resilience.commands(provider,customer,primary,child,hooks);
 for(const command of created.commands)transport.command(child,command,{authorize:()=>true,resourceExists:(_s,id)=>!!child.resources[id]});
 const installation=resilience.installation(provider,customer,primary,child,hooks);primary.operationReceipt={kind:primary.operationId,projectId:primary.id,postingId:primary.postingId,installedAt:installation.installedAt};
 child.providerResilience={version:1,installations:[installation]};provider.projects.push(primary);
 return {child,provider,hooks,setEvolution:value=>{evolution=value;}};
}
function ingressEvolution(project){
 const site={name:'Provider call ingress',region:'AU',domain:names.ingressDomain,powerDomain:`${names.ingress}-power`,backupPowerDomain:null};
 const link=(from,to,domain)=>({from,to,mode:'purchased',capacityMbps:20,latencyMs:18,domain,leadMinutes:8,setupCents:0,periodCents:0,contract:null});
 return {version:1,sites:[{projectId:project.id,postingId:project.postingId,at:project.configSubmittedAt-1,id:names.ingress,config:site,generation:1}],links:[
  {projectId:project.id,postingId:project.postingId,at:project.configSubmittedAt-1,id:names.ingressHead,config:link(names.ingress,names.head,names.ingressHeadDomain),generation:1},
  {projectId:project.id,postingId:project.postingId,at:project.configSubmittedAt-1,id:names.ingressBranch,config:link(names.ingress,names.branch,names.ingressBranchDomain),generation:1}
 ],bindings:[{projectId:project.id,postingId:project.postingId,at:project.configSubmittedAt-1,resource:'carrier',fromSite:names.head,toSite:names.ingress,receiptId:project.id}],domains:[{id:names.ingressDomain},{id:names.ingressHeadDomain},{id:names.ingressBranchDomain},{id:`${names.ingress}-power`}]};
}
function applyIngress(f){
 const {child,provider,setEvolution}=f,projectRow=project('site-diverse-ingress','project-ingress',0,32000,1),evolution=ingressEvolution(projectRow);
 projectRow.operationReceipt={kind:'site-diverse-ingress',version:1,projectId:projectRow.id,postingId:projectRow.postingId,customerId:customer.id,installedAt:0,siteId:names.ingress,siteGeneration:1,links:evolution.links.map(row=>({id:row.id,generation:row.generation})),carrierBinding:{resource:'carrier',from:names.head,to:names.ingress,at:0}};
 child.clock=0;
 transport.command(child,{action:'site',id:names.ingress,config:evolution.sites[0].config},{authorize:()=>true,resourceExists:(_s,id)=>!!child.resources[id]});
 for(const row of evolution.links)transport.command(child,{action:'link',id:row.id,config:row.config},{authorize:()=>true,resourceExists:(_s,id)=>!!child.resources[id]});
 transport.command(child,{action:'bind',resource:'carrier',site:names.ingress},{authorize:()=>true,resourceExists:(_s,id)=>!!child.resources[id]});
 provider.projects.push(projectRow);setEvolution(evolution);return projectRow;
}
function publicIngress(){
 const id='starter-customer',send=(state,command)=>SOC.dispatch(state,{type:'provider',command}),stage=key=>({action:'purchase',offerId:'starter',planId:'swift',stage:key,...(key==='base'?{}:{customerId:id})}),commit=(state,request)=>{const quote=SOC.provider.quote(state,request);assert.deepEqual(quote.blockers,[],JSON.stringify(quote.blockers));return send(state,{...request,quoteRevision:quote.atRevision});};
 let state=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});for(const key of ['base','carrier','partner'])state=commit(state,stage(key));
 const advanceUntil=(predicate,limit=120)=>{for(let i=0;i<limit&&!predicate(state);i++)state=SOC.dispatch(state,{type:'advance',minutes:1});assert.ok(predicate(state),`public fixture did not reach target at ${state.clock}`);};
 advanceUntil(()=>state.providerCampaign.customers[0].status==='active',30);
 const operation=operationId=>{state=commit(state,{action:'operation',operationId,customerId:id});};
 operation('cisco-dedicated-uc');advanceUntil(()=>state.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId==='cisco-dedicated-uc')?.status==='complete');
 operation('primary-upstream');advanceUntil(()=>state.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId==='primary-upstream')?.status==='complete');
 operation('site-diverse-ingress');advanceUntil(()=>state.providerCampaign.projects.findLast(p=>p.customerId===id&&p.operationId==='site-diverse-ingress')?.status==='complete');
 return state;
}

test('paid ingress, owned aliases, and later endpoint migration replay from immutable resilience bindings',()=>{
 const f=makeFixture(),ingress=applyIngress(f);
 assert.equal(resilience.validateCustomer(f.provider,customer,f.child,f.hooks),true);
 while(f.child.clock<2){f.child.clock++;transport.advance(f.child,{});}
 const owned=project('owned-site-operations','project-owned-sites',2,42000,3);
 owned.operationReceipt={kind:'provider-owned-sites',projectId:owned.id,postingId:owned.postingId,customerId:customer.id,installedAt:2,transportBindings:[
  {resource:'identity',from:names.head,to:names.ingress,at:2},
  {resource:'desk',from:names.branch,to:names.head,at:2},
  {resource:'dedicated-endpoint',from:names.branch,to:names.branch,at:2},
  {resource:'bea',from:null,to:names.head,at:2},
  {resource:'alex',from:null,to:names.branch,at:2}
 ]};
 for(const row of owned.operationReceipt.transportBindings){if(row.from!==null)assert.equal(f.child.transport.bindings[row.resource],row.from);transport.command(f.child,{action:'bind',resource:row.resource,site:row.to},{authorize:()=>true,resourceExists:(_s,id)=>!!f.child.resources[id]});}
 f.provider.projects.push(owned);
 const ev=ingressEvolution(ingress);ev.bindings.push(...owned.operationReceipt.transportBindings.map(row=>({projectId:owned.id,postingId:owned.postingId,at:owned.configSubmittedAt-1,resource:row.resource,fromSite:row.from,toSite:row.to,receiptId:owned.id})));
 f.setEvolution(ev);
 assert.equal(resilience.validateCustomer(f.provider,customer,f.child,f.hooks),true);
 while(f.child.clock<4){f.child.clock++;transport.advance(f.child,{});}
 f.child.resources.desk.effective={identity:'bea'};
 f.child.siteOperations={sites:{'provider-owned-head':{effective:{transportSite:names.head}},'provider-owned-branch':{effective:{transportSite:names.branch}}},migrations:[{id:'migration-project-desk-move',phase:'complete',fromSite:'provider-owned-head',toSite:'provider-owned-branch',items:[{resource:'desk',status:'complete',receiptId:'migration-item-desk',at:4}]}]};
 const migration=project('site-resource-migration','project-desk-move',3,12000,5);migration.config={resourceId:'desk',fromSite:'provider-owned-head',toSite:'provider-owned-branch'};migration.status='complete';migration.completedAt=4;migration.operationReceipt={kind:'site-resource-migration',version:1,projectId:migration.id,postingId:migration.postingId,customerId:customer.id,migrationId:'migration-project-desk-move',resourceId:'desk',fromSite:'provider-owned-head',toSite:'provider-owned-branch',completedAt:4};
 f.child.siteOperations.migrations[0].id=migration.operationReceipt.migrationId;
 f.provider.projects.push(migration);f.child.transport.bindings.desk=names.branch;f.child.transport.bindings.bea=names.branch;
 ev.bindings.push({projectId:migration.id,postingId:migration.postingId,at:4,resource:'desk',fromSite:names.head,toSite:names.branch,receiptId:'migration-item-desk'},{projectId:migration.id,postingId:migration.postingId,at:4,resource:'bea',fromSite:names.head,toSite:names.branch,receiptId:'migration-item-desk'});f.setEvolution(ev);
 assert.equal(resilience.validateCustomer(f.provider,customer,f.child,f.hooks),true);
 const view=resilience.inspect(f.provider,customer,f.child);
 assert.ok(view.sites.some(row=>row.id===names.ingress));
 assert.ok(view.links.some(row=>row.id===names.ingressHead));
 assert.ok(view.bindings.some(row=>row.resource==='carrier'&&row.site===names.ingress));
});

test('free binding changes, unreceipted transport objects, unknown domains and malformed evolution order fail closed',()=>{
 const f=makeFixture();applyIngress(f);
 const original=f.child.transport.bindings.carrier;
 f.child.transport.bindings.carrier=names.branch;
 assert.throws(()=>resilience.validateCustomer(f.provider,customer,f.child,f.hooks),/UNFUNDED_PROVIDER_TRANSPORT_BINDING/);
 f.child.transport.bindings.carrier=original;
 f.child.transport.sites['canopy-customer-unpaid']={...structuredClone(f.child.transport.sites[names.ingress])};
 assert.throws(()=>resilience.validateCustomer(f.provider,customer,f.child,f.hooks),/UNFUNDED_PROVIDER_TRANSPORT_OBJECT/);
 delete f.child.transport.sites['canopy-customer-unpaid'];
 f.child.transport.domains['invented-domain']=true;
 assert.throws(()=>resilience.validateCustomer(f.provider,customer,f.child,f.hooks),/UNFUNDED_PROVIDER_TRANSPORT_DOMAIN/);
 delete f.child.transport.domains['invented-domain'];
 const bad=f.provider.projects.find(row=>row.operationId==='site-diverse-ingress');
 f.setEvolution({...ingressEvolution(bad),bindings:[{...ingressEvolution(bad).bindings[0],fromSite:names.branch}]});
 assert.throws(()=>resilience.validateCustomer(f.provider,customer,f.child,f.hooks),/INVALID_PROVIDER_RESILIENCE_EVOLUTION_BINDING/);
 while(f.child.clock<4){f.child.clock++;transport.advance(f.child,{});}
 const earlier=project('owned-site-operations','project-earlier-site-transition',2,42000,4),later=project('owned-site-operations','project-later-site-transition',1,42000,5);
 earlier.operationReceipt={kind:'provider-owned-sites',projectId:earlier.id,postingId:earlier.postingId,customerId:customer.id,installedAt:3,transportBindings:[{resource:'desk',from:names.head,to:names.branch,at:3}]};
 later.operationReceipt={kind:'provider-owned-sites',projectId:later.id,postingId:later.postingId,customerId:customer.id,installedAt:4,transportBindings:[{resource:'desk',from:names.branch,to:names.head,at:4}]};
 f.provider.projects.push(earlier,later);f.child.transport.bindings.desk=names.branch;
 const reordered=ingressEvolution(bad);reordered.bindings.push({projectId:later.id,postingId:later.postingId,at:4,resource:'desk',fromSite:names.branch,toSite:names.head,receiptId:later.id},{projectId:earlier.id,postingId:earlier.postingId,at:3,resource:'desk',fromSite:names.head,toSite:names.branch,receiptId:earlier.id});
 f.setEvolution(reordered);
 assert.throws(()=>resilience.validateCustomer(f.provider,customer,f.child,f.hooks),/INVALID_PROVIDER_RESILIENCE_EVOLUTION_ORDER/);
});

test('evolution cannot use a merely paid but wrong-scope project or a forged site, link or binding receipt',()=>{
 const f=makeFixture(),ingress=applyIngress(f),evo=ingressEvolution(ingress);
 const wrongProject=project('site-diverse-ingress','project-other-customer',0,32000,1);wrongProject.customerId='another-customer';f.provider.projects.push(wrongProject);
 f.setEvolution({...evo,sites:[{...evo.sites[0],projectId:wrongProject.id,postingId:wrongProject.postingId}]});
 assert.throws(()=>resilience.validateCustomer(f.provider,customer,f.child,f.hooks),/INVALID_PROVIDER_RESILIENCE_EVOLUTION_PROJECT/);
 f.setEvolution({...evo,bindings:[{...evo.bindings[0],receiptId:'invented-receipt'}]});
 assert.throws(()=>resilience.validateCustomer(f.provider,customer,f.child,f.hooks),/INVALID_PROVIDER_RESILIENCE_EVOLUTION_BINDING/);
 f.setEvolution({...evo,links:[{...evo.links[0],config:{...evo.links[0].config,capacityMbps:999}},evo.links[1]]});
 assert.throws(()=>resilience.validateCustomer(f.provider,customer,f.child,f.hooks),/INVALID_PROVIDER_RESILIENCE_EVOLUTION_LINK/);
});

test('public Provider restore accepts paid ingress and rejects an unpaid binding transplant',()=>{
 const state=publicIngress(),restored=SOC.restore(JSON.stringify(state));
 assert.equal(restored.portfolio.customers[0].root.transport.bindings.carrier,'starter-customer-ingress');
 const forged=structuredClone(state),root=forged.portfolio.customers.find(row=>row.id==='starter-customer').root;
 root.transport.bindings.carrier='starter-customer-branch';
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/PAID_CALL_INGRESS_BINDING_REQUIRED|UNFUNDED_PROVIDER_TRANSPORT_BINDING/);
});
