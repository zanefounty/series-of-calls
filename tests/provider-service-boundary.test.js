const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const BOUNDARY=require('../src/game/43-boundaries.js');
const SERVICE=require('../src/game/23-provider-service-boundary.js');

const hooks={customerRoot:(s,id)=>s.portfolio.customers.find(x=>x.id===id)?.root||null,observeResource:(root,id)=>SOC.observe(root,id)};
const buy=(s,request)=>{const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify(q.blockers));return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});};
const minute=s=>SOC.dispatch(s,{type:'advance',minutes:1});
function paidSmb(){
 let s=SOC.create({experience:'campaign'});
 for(const stage of ['base','carrier','partner']){
  s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
  while(s.providerCampaign.customers[0].stages[stage].status!=='effective')s=minute(s);
 }
 s=buy(s,{action:'operation',operationId:'bpo',customerId:'starter-customer'});
 while(!s.providerCampaign.projects.some(x=>x.customerId==='starter-customer'&&x.operationId==='bpo'&&x.status==='complete'))s=minute(s);
 while(s.clock<120){
  const incident=s.providerCampaign.incidents.find(x=>x.status==='active');
  if(incident){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=buy(s,{action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId});}
  s=minute(s);
 }
 return s;
}
function applyBoundaryCommands(s,plan,commands){
 const root=s.portfolio.customers.find(x=>x.id===plan.portfolioId).root;
 root.boundaries=root.boundaries||BOUNDARY.create(root);
 for(const entry of commands)BOUNDARY.command(root,entry.command);
 return root;
}

test('paid service-boundary planner derives fixed, jurisdiction-scoped flows and commands validate in the boundary domain',()=>{
 const s=paidSmb(),before=JSON.stringify(s),plan=SERVICE.plan(s,'starter-customer',hooks);
 assert.equal(plan.version,SERVICE.VERSION);assert.equal(plan.contentVersion,SERVICE.CONTENT);assert.equal(plan.jurisdiction,s.portfolio.customers[0].root.jurisdiction);assert.deepEqual(plan.dependencies.map(x=>x.id),['identity','phone','engage']);
 assert.ok(plan.boundaryContract.flows.every(f=>f.processingRegions[0]===plan.jurisdiction&&f.storageRegions[0]===plan.jurisdiction&&f.backupRegions[0]===plan.jurisdiction&&f.keyCustodyRegions[0]===plan.jurisdiction&&f.adminLocations[0]===plan.jurisdiction&&f.supportRegions[0]===plan.jurisdiction));
 assert.equal(plan.boundaryContract.customerAuthorization,'approved');assert.equal(plan.boundaryContract.agencyAuthorizationRequired,false);assert.equal(plan.boundaryContract.usesAi,false);
 const commands=SERVICE.startCommands(plan);assert.equal(commands.length,4);assert.deepEqual(commands.map(x=>x.command.action),['contract','bind','bind','bind']);assert.equal(JSON.stringify(s),before,'planning and command previews are pure');
 const root=applyBoundaryCommands(s,plan,commands);BOUNDARY.validate(root);
 root.clock++;BOUNDARY.advance(root,root.clock);
 const hooksThatSeeOwnBoundaryAsPending={...hooks,observeResource:()=>({ready:false,reasons:['OWN_SERVICE_BOUNDARY_PENDING']}),observeServiceResource:(child,id,ownBoundaryId)=>{assert.equal(ownBoundaryId,plan.boundaryContract.id);return SOC.observe(child,id);}};
 const freshObservation=SERVICE.observe(s,plan,hooksThatSeeOwnBoundaryAsPending);assert.equal(freshObservation.eligible,true,'resource readiness ignores this review contract only when caller supplies underlying service readiness');
 const forged=structuredClone(plan);forged.boundaryContract.flows[0].supportRegions=['US'];assert.throws(()=>SERVICE.startCommands(forged),/INVALID_PROVIDER_SERVICE_BOUNDARY_PLAN/);
});

test('service boundary observations follow live resource, network and paid support state',()=>{
 const s=paidSmb(),plan=SERVICE.plan(s,'starter-customer',hooks),root=applyBoundaryCommands(s,plan,SERVICE.startCommands(plan));
 root.clock++;BOUNDARY.advance(root,root.clock);let result=SERVICE.observe(s,plan,hooks);assert.equal(result.eligible,true,JSON.stringify(result));BOUNDARY.command(root,result.command.command);assert.equal(BOUNDARY.evaluate(root,plan.boundaryContract.id).eligible,true);assert.equal(BOUNDARY.evaluate(root,plan.boundaryContract.id).legalApprovalClaim,false);
 root.connected=false;result=SERVICE.observe(s,plan,hooks);assert.equal(result.eligible,false);assert.equal(result.observed.connected,false);BOUNDARY.command(root,result.command.command);assert.equal(BOUNDARY.evaluate(root,plan.boundaryContract.id).eligible,false);
 root.connected=true;result=SERVICE.observe(s,plan,hooks);assert.equal(result.eligible,true);BOUNDARY.command(root,result.command.command);assert.equal(BOUNDARY.evaluate(root,plan.boundaryContract.id).eligible,true,'recovery records a fresh live observation');
 s.providerCampaign.customers[0].retailAgreement.at=s.clock;result=SERVICE.observe(s,plan,hooks);assert.equal(result.eligible,true,'same-price renewal retains the paid boundary review');
 root.resources.identity.generation++;result=SERVICE.observe(s,plan,hooks);assert.equal(result.eligible,false);assert.ok(result.missing.some(x=>x.includes('SERVICE_RESOURCE_NOT_READY:identity')));
});

test('service-boundary planning refuses unsupported experience, customer scope and unowned jurisdictions',()=>{
 const s=paidSmb();assert.throws(()=>SERVICE.plan({...s,experience:{version:1,kind:'training',custom:false}},'starter-customer',hooks),/PROVIDER_CAMPAIGN_REQUIRED/);
 assert.throws(()=>SERVICE.plan(s,'absent-customer',hooks),/PROVIDER_CUSTOMER_NOT_FOUND/);
 const jp=structuredClone(s);jp.portfolio.customers[0].root.jurisdiction='JP';assert.throws(()=>SERVICE.plan(jp,'starter-customer',hooks),/SERVICE_REGISTRATION_NOT_AUTHORED/);
 const owned=paidSmb(),ownedRoot=owned.portfolio.customers[0].root;ownedRoot.boundaries=BOUNDARY.create(ownedRoot);ownedRoot.boundaries.bindings.identity='government-boundary';assert.throws(()=>SERVICE.plan(owned,'starter-customer',hooks),/SERVICE_RESOURCE_BOUNDARY_OWNED:identity/);
 const inactive=structuredClone(s);inactive.providerCampaign.customers[0].status='exited';assert.throws(()=>SERVICE.plan(inactive,'starter-customer',hooks),/ACCEPTED_RETAIL_AGREEMENT_REQUIRED/);
});
