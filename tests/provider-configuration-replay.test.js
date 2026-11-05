'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const authority=require('../src/game/23-provider-configuration-authority');
const products=require('../src/game/45-products');
const customerId='starter-customer';
function child(state,id=customerId){return state.portfolio.customers.find(c=>c.id===id).root;}
function customer(state,id=customerId){return state.providerCampaign.customers.find(c=>c.id===id);}
function command(state,command){const quote=SOC.provider.quote(state,command);assert.deepEqual(quote.blockers,[],JSON.stringify({command,blockers:quote.blockers}));return SOC.dispatch(state,{type:'provider',command:{...command,quoteRevision:quote.atRevision}});}
function advance(state,at){while(state.clock<at)state=SOC.dispatch(state,{type:'advance',minutes:1});return state;}
function opening({stages=['base','carrier','partner'],operation=null}={}){
 let state=SOC.create({experience:'campaign',seed:73});
 for(const stage of stages){state=command(state,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});state=advance(state,state.providerCampaign.projects.at(-1).dueAt);}
 if(operation){state=command(state,{action:'operation',operationId:operation,customerId});state=advance(state,state.providerCampaign.projects.at(-1).dueAt);}
 return state;
}
function validate(state,id=customerId){return authority.validateCustomer(state.providerCampaign,customer(state,id),child(state,id),{catalogue:SOC.catalogue});}

test('canonical replay accepts real staged configs and a funded room operation',()=>{
 const staged=opening();assert.equal(validate(staged),true);
 const room=opening({operation:'room'});assert.equal(room.providerCampaign.projects.some(p=>p.customerId===customerId&&p.operationId==='room'&&p.status==='complete'),true);assert.equal(validate(room),true);
});

test('canonical replay rejects room enablement without an authored submitted project',()=>{
 const state=opening({stages:['base']});const root=child(state);
 root.resources.room.desired.enabled=true;root.resources.room.effective.enabled=true;
 assert.throws(()=>validate(state),/INVALID_PROVIDER_CONFIG_AUTHORITY/);
});

test('canonical replay rejects extra identity entitlements and an unpurchased endpoint',()=>{
 const state=opening({stages:['base']});const root=child(state);
 for(const layer of ['desired','effective']){root.resources.identity[layer].identities.push('unpaid-person');root.resources.identity[layer].entitled.push('unpaid-person');}
 const desk=structuredClone(root.resources.desk);desk.id='unpaid-desk';
 for(const layer of ['desired','effective']){desk[layer].identity='unpaid-person';desk[layer].number='+61255500777';desk[layer].extension='777';}
 root.resources['unpaid-desk']=desk;
 assert.throws(()=>validate(state),/INVALID_PROVIDER_CONFIG_AUTHORITY/);
});

test('numeric non-capacity fields stay bound to the authored endpoint profile',()=>{
 const state=opening({stages:['base']});const root=child(state);
 for(const layer of ['desired','effective'])root.resources.desk[layer].firmware=999;
 assert.throws(()=>validate(state),/INVALID_PROVIDER_CONFIG_AUTHORITY/);
});

test('Provider restore cannot backdate a paid resource generation to its pre-purchase default due',()=>{
 const state=opening({stages:['base']});
 assert.equal(SOC.restore(JSON.stringify(state)).revision,state.revision);
 const forged=structuredClone(state),phone=child(forged).resources.phone;
 phone.provisioning.due=1;phone.provisioning.status='ready';
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_CONFIG_AUTHORITY:PROVISIONING_DUE/);
});

test('product deployment requires a same-customer paid recipe project',()=>{
 const donor=opening();let paid=command(structuredClone(donor),{action:'operation',operationId:'ms-workplace-calling',customerId});
 paid=advance(paid,paid.providerCampaign.projects.at(-1).dueAt);assert.equal(validate(paid),true);
 const recipient=opening();recipient.portfolio.customers[0].root.products=structuredClone(child(paid).products);
 assert.throws(()=>validate(recipient),/INVALID_PROVIDER_PRODUCT_AUTHORITY/);
 const offerOnly=opening();offerOnly.portfolio.customers[0].root.products={pack:'soc-products-1',version:1,nextId:1,offers:structuredClone(child(paid).products.offers),deployments:[],integrations:[],events:[]};
 assert.throws(()=>validate(offerOnly),/INVALID_PROVIDER_PRODUCT_AUTHORITY/,'an imported offer alone is not a paid Provider purchase');
});

test('Provider restore rejects a product deployment marked effective before its paid commissioning due',()=>{
 let pending=opening({operation:'ms-workplace-calling'});
 const root=child(pending),deployment=root.products.deployments.find(d=>d.id==='d-ms-workplace-calling');
 assert.ok(deployment);assert.equal(deployment.provisioning.status,'pending');assert.equal(deployment.provisioning.due,root.clock+1);
 assert.equal(SOC.restore(JSON.stringify(pending)).portfolio.customers[0].root.products.deployments[0].provisioning.status,'pending','the authentic pending export remains restorable');
 const early=structuredClone(pending),earlyRoot=child(early),earlyDeployment=earlyRoot.products.deployments[0];
 earlyDeployment.effective=structuredClone(earlyDeployment.desired);earlyDeployment.provisioning.status='ready';earlyDeployment.provisioning.errors=[];
 assert.throws(()=>SOC.restore(JSON.stringify(early)),/INVALID_PROVIDER_PRODUCT_AUTHORITY/);
 const backdated=structuredClone(pending),backdatedRoot=child(backdated),backdatedDeployment=backdatedRoot.products.deployments[0];
 backdatedDeployment.provisioning.due=backdatedRoot.clock;backdatedDeployment.effective=structuredClone(backdatedDeployment.desired);backdatedDeployment.provisioning.status='ready';backdatedDeployment.provisioning.errors=[];
 assert.throws(()=>SOC.restore(JSON.stringify(backdated)),/INVALID_PROVIDER_PRODUCT_AUTHORITY/,'editing due and status together cannot move the paid commissioning date earlier');
});

test('a paid deployment becomes restorable at its causal due and a recommission is independently funded',()=>{
 let state=opening({operation:'ms-workplace-calling'});
 state=advance(state,child(state).products.deployments[0].provisioning.due);
 assert.equal(child(state).products.deployments[0].provisioning.status,'ready');
 assert.equal(SOC.restore(JSON.stringify(state)).revision,state.revision);

 const originalProject=state.providerCampaign.projects.find(p=>p.operationId==='ms-workplace-calling');
 state=command(state,{action:'retire-project',projectId:originalProject.id});
 state=advance(state,child(state).products.deployments[0].retirement.effectiveAt);
 state=command(state,{action:'operation',operationId:'ms-workplace-calling',customerId});
 const accepted=state.providerCampaign.projects.at(-1);
 state=advance(state,accepted.dueAt);
 const replacement=state.providerCampaign.projects.findLast(p=>p.operationId==='ms-workplace-calling'),deployment=child(state).products.deployments[0];
 assert.equal(replacement.operationReceipt.reinstated,true);
 assert.equal(deployment.provisioning.status,'pending');
 assert.equal(SOC.restore(JSON.stringify(state)).revision,state.revision);
 state=advance(state,deployment.provisioning.due);
 assert.ok(['ready','failed'].includes(child(state).products.deployments[0].provisioning.status),'at the funded due the real dependency check decides readiness');
 assert.equal(SOC.restore(JSON.stringify(state)).revision,state.revision);
});

test('pending same-profile product reconfiguration retains its prior effective generation until due',()=>{
 let state=opening({operation:'ms-workplace-calling'});
 state=advance(state,child(state).products.deployments[0].provisioning.due);
 const current=child(state).products.deployments[0],oldEffective=structuredClone(current.effective);
 assert.equal(current.provisioning.status,'ready');
 products.command(child(state),{action:'configure',id:current.id,config:{productVersion:current.desired.productVersion}});
 const pending=child(state).products.deployments[0];
 assert.equal(pending.provisioning.status,'pending');
 assert.deepEqual(pending.effective,oldEffective);
 assert.equal(SOC.restore(JSON.stringify(state)).portfolio.customers[0].root.products.deployments[0].effective.productVersion,oldEffective.productVersion);
});
