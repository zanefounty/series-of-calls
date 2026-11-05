const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');

const recipes=require('../src/game/23-provider-products').recipes;
const recipeIds=Object.keys(recipes).filter(id=>!process.env.SOC_PRODUCT_ONLY||process.env.SOC_PRODUCT_ONLY.split(',').includes(id));
function start(scenario){return SOC.create({experience:'campaign',scenario,market:'au-sydney'});}
function tick(s){return SOC.dispatch(s,{type:'advance',minutes:1});}
function command(s,cmd,sequence){return SOC.dispatch(s,{type:'provider',requestId:`provider-${sequence}`,command:cmd});}

test('all 14 authored product recipes are funded and pass actual campaign deployment readiness',()=>{
 let totalCommands=0;
 for(const recipeId of recipeIds){
  const scenario=['ms-government-boundary','cisco-government-boundary'].includes(recipeId)?'government':'enterprise';
  let s=start(scenario),sequence=1;
  const send=cmd=>{s=command(s,cmd,sequence++);totalCommands++;};
  const buy=stage=>{
   const request={action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})};
   const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[],recipeId+'/'+stage);
   send({...request,quoteRevision:s.revision});
  };
  const project=(id)=>s.providerCampaign.projects.find(x=>x.customerId==='starter-customer'&&x.operationId===id);
  const fundOperation=operationId=>{
   for(let tries=0;tries<100;tries++){
    const request={action:'operation',operationId,customerId:'starter-customer'},quote=SOC.provider.quote(s,request);
    if(!quote.blockers.length){send({...request,quoteRevision:s.revision});return;}
    assert.ok(quote.blockers.every(x=>x==='ENGINEER_CAPACITY'||x==='SUPPORT_CAPACITY'||x.startsWith('OPERATION_REQUIREMENT_')),recipeId+'/'+operationId+' blocker: '+quote.blockers.join(','));
    if(quote.blockers.includes('ENGINEER_CAPACITY')||quote.blockers.includes('SUPPORT_CAPACITY'))send({action:'staff',engineers:Math.max(4,quote.commercial.staffing.currentEngineers),support:Math.max(4,quote.commercial.staffing.currentSupport)});
    s=tick(s);
   }
   assert.fail(recipeId+'/'+operationId+' never became fundable');
  };
  const completeOperation=operationId=>{
   fundOperation(operationId);
   for(let tries=0;tries<100&&project(operationId)?.status!=='complete';tries++){s=tick(s);recoverObservedIncidents();}
   assert.equal(project(operationId)?.status,'complete',recipeId+'/'+operationId+' uses the actual readiness receipt '+JSON.stringify({project:project(operationId),child:s.portfolio.customers[0]?.root?.providerCustomer,resources:Object.fromEntries(['archive','recorder','speech'].map(k=>[k,s.portfolio.customers[0]?.root?.resources?.[k]])),ops:s.portfolio.customers[0]?.root?.operations?.[operationId]}));
  };
  const recoverObservedIncidents=()=>{
   for(let tries=0;tries<12;tries++){
    const incident=s.providerCampaign.incidents.find(x=>x.customerId==='starter-customer'&&['active','acknowledged'].includes(x.status));
    if(!incident)return;
    const outstanding=project('repair');if(outstanding&&['running','commissioning'].includes(outstanding.status)){for(let minute=0;minute<5&&outstanding.status!=='complete';minute++)s=tick(s);if(outstanding.status==='complete')continue;}
    if(incident.status==='active')send({action:'acknowledge-incident',incidentId:incident.id});
    const request={action:'operation',operationId:'repair',customerId:'starter-customer'};let quote=SOC.provider.quote(s,request);
    if(quote.blockers.includes('ENGINEER_CAPACITY')||quote.blockers.includes('SUPPORT_CAPACITY')){send({action:'staff',engineers:Math.max(4,quote.commercial.staffing.currentEngineers),support:Math.max(4,quote.commercial.staffing.currentSupport)});quote=SOC.provider.quote(s,request);}
    assert.deepEqual(quote.blockers,[],recipeId+' incident repair quote');send({...request,quoteRevision:s.revision});
    for(let minute=0;minute<12&&s.providerCampaign.incidents.some(x=>x.id===incident.id&&x.status!=='resolved');minute++)s=tick(s);
    assert.equal(s.providerCampaign.incidents.find(x=>x.id===incident.id)?.status,'resolved',recipeId+' actual incident resolution '+JSON.stringify({incident,projects:s.providerCampaign.projects.filter(x=>x.operationId==='repair'),resources:incident.resource&&s.portfolio.customers[0].root.resources[({processor:'speech',connectivity:'access'})[incident.resource]||incident.resource]}));
    const repair=project('repair');if(repair?.status!=='complete')for(let minute=0;minute<12&&repair?.status!=='complete';minute++)s=tick(s);
   }
  };
  buy('base');
  if(['ms-government-boundary','cisco-government-boundary','cisco-local-speech'].includes(recipeId))completeOperation('recording');
  buy('carrier');buy('partner');
  s=advanceUntil(s,3);
  if(['ms-government-boundary','cisco-government-boundary','cisco-local-speech'].includes(recipeId))completeOperation('transcription');
  if(['ms-government-boundary','cisco-government-boundary'].includes(recipeId))completeOperation('compliance');
  if(['cisco-local-speech','ms-local-deployment'].includes(recipeId))completeOperation('local-deployment');
  for(let tries=0;tries<60&&s.providerCampaign.customers[0].status!=='active';tries++){s=tick(s);recoverObservedIncidents();}
  assert.equal(s.providerCampaign.customers[0].status,'active',recipeId+' starts from effective base/carrier/partner stages');
  const request={action:'operation',operationId:recipeId,customerId:'starter-customer'};let quote=SOC.provider.quote(s,request);
  if(quote.blockers.includes('ENGINEER_CAPACITY')||quote.blockers.includes('SUPPORT_CAPACITY')){send({action:'staff',engineers:Math.max(quote.commercial.staffing.currentEngineers,quote.commercial.staffing.requiredEngineers),support:Math.max(quote.commercial.staffing.currentSupport,quote.commercial.staffing.requiredSupport)});quote=SOC.provider.quote(s,request);}
  assert.deepEqual(quote.blockers,[],recipeId+' authored recipe is selectable from its actual prerequisites');
  const cashBefore=s.business.balance.cash;
  send({...request,quoteRevision:s.revision});
  const paid=project(recipeId);assert.ok(paid,'recipe created a project');
  assert.equal(paid.setupCents,recipes[recipeId].quote.setupCents,recipeId+' uses authored setup quote');
  assert.equal(s.business.balance.cash,cashBefore-paid.setupCents,recipeId+' draws from shared parent treasury');
  for(let tries=0;tries<100&&project(recipeId)?.status!=='complete';tries++){try{s=tick(s);}catch(error){throw new Error(recipeId+': '+error.message+' child='+JSON.stringify({products:s.portfolio.customers[0].root.products,providerTasks:s.portfolio.customers[0].root.providerProductTasks,deployments:s.portfolio.customers[0].root.providerDeployments}));}}
  assert.equal(project(recipeId)?.status,'complete',recipeId+' completes only from product/resource readiness hooks '+JSON.stringify({project:project(recipeId),deployment:s.portfolio.customers[0].root.products?.deployments.find(x=>x.id==='d-'+recipeId),resources:project(recipeId).resources.map(id=>[id,s.portfolio.customers[0].root.resources[id]])}));
  const child=s.portfolio.customers[0].root,deployment=child.products?.deployments.find(x=>x.id==='d-'+recipeId);
  assert.ok(deployment?.effective,recipeId+' actual child deployment is effective');
  assert.equal(deployment.provisioning.status,'ready',recipeId+' actual deployment is ready');
  for(let minute=0;minute<60&&s.providerCampaign.jobs.filter(j=>j.customerId==='starter-customer'&&j.status==='completed').length<4;minute++){s=tick(s);recoverObservedIncidents();}
  const delivered=s.providerCampaign.jobs.filter(j=>j.customerId==='starter-customer'&&j.status==='completed');
  assert.ok(delivered.length>=4,recipeId+' remains attached to actual delivered campaign work');
  assert.ok(delivered.every(j=>j.interactionId&&s.portfolio.customers[0].root.interactions.some(i=>i.id===j.interactionId&&Number.isSafeInteger(i.finishedAt))),recipeId+' delivery evidence comes from completed SOC interactions');
  const duplicate=SOC.provider.quote(s,request);
  assert.ok(duplicate.blockers.includes('PRODUCT_ALREADY_ORDERED'),recipeId+' cannot be charged twice');
 }
 assert.ok(totalCommands>50,'all scenarios were driven through public campaign dispatch');
});

function advanceUntil(s,minutes){for(let minute=0;minute<minutes;minute++)s=tick(s);return s;}
