'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const AUTHORITY=require('../src/game/23-provider-capacity-authority');
const RULES=require('../src/game/24-provider-rules');
const PRODUCTS=require('../src/game/23-provider-products');
const GOVERNMENT=require('../src/game/23-provider-government');

const customerId='starter-customer';
const child=s=>s.portfolio.customers.find(c=>c.id===customerId).root;
const tick=(s,n=1)=>SOC.dispatch(s,{type:'advance',minutes:n});
const operation=id=>({action:'operation',operationId:id,customerId});
function buy(s,command){
 const q=SOC.provider.quote(s,command);
 assert.deepEqual(q.blockers,[],JSON.stringify({command,blockers:q.blockers,clock:s.clock}));
 return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});
}
function open(planId='swift'){
 let s=SOC.create({experience:'campaign',seed:81});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId,stage,...(stage==='base'?{}:{customerId})});
 for(let i=0;i<40&&s.providerCampaign.customers[0].status!=='active';i++)s=tick(s);
 assert.equal(s.providerCampaign.customers[0].status,'active');
 return s;
}
function validate(s){return AUTHORITY.validateCustomer(s.providerCampaign,s.providerCampaign.customers[0],child(s));}
function project(s,id){return s.providerCampaign.projects.findLast(p=>p.operationId===id);}
function stagedService(){
 let s=SOC.create({experience:'campaign',seed:73});
 for(const [stage,minutes] of [['base',3],['carrier',2],['partner',3]]){
  s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
  s=SOC.dispatch(s,{type:'advance',minutes});
 }
 return s;
}

test('three paid SMB stages authorize their typed capacity and reject an edited carrier ceiling',()=>{
 const s=open('swift'),root=child(s),p=s.providerCampaign,c=p.customers[0];
 assert.equal(root.resources.carrier.desired.capacity,4);
 assert.equal(validate(s),true);
 const bad=structuredClone(root);bad.resources.carrier.desired.capacity=999;bad.resources.carrier.effective.capacity=999;
 assert.throws(()=>AUTHORITY.validateCustomer(p,c,bad),/INVALID_PROVIDER_CAPACITY_AUTHORITY/);
 bad.resources.carrier.desired.capacity=999;bad.resources.carrier.effective.capacity=999;
 bad.providerCapacityAuthority={version:1,hash:'edited-cache'};
 assert.throws(()=>AUTHORITY.validateCustomer(p,c,bad),/INVALID_PROVIDER_CAPACITY_AUTHORITY/,'a cache cannot grant additional capacity');
 const imported=structuredClone(s),importedChild=child(imported);
 importedChild.resources.carrier.desired.capacity=999;importedChild.resources.carrier.effective.capacity=999;
 assert.throws(()=>SOC.restore(JSON.stringify(imported)),/INVALID_PROVIDER_CAPACITY_AUTHORITY/,'the public save import rejects the edited capacity');
});

test('non-SMB Provider tracks retain their authored starting people capacity before base delivery',()=>{
 for(const scenario of ['enterprise','government','defence']){
  let s=SOC.create({experience:'campaign',scenario,seed:82});
  const command={action:'purchase',offerId:'starter',planId:'swift',stage:'base'},q=SOC.provider.quote(s,command);
  s=SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});
  assert.equal(child(s).resources.people.desired.people,2,scenario);
  assert.equal(AUTHORITY.validateCustomer(s.providerCampaign,s.providerCampaign.customers[0],child(s)),true,scenario);
  assert.deepEqual(SOC.restore(JSON.stringify(s)),s,scenario);
 }
});

test('paid headroom derives four to eight sessions in effective state',()=>{
 let s=open('swift');
 s=buy(s,operation('carrier-headroom'));
 for(let i=0;i<20&&project(s,'carrier-headroom').configSubmittedAt===null;i++)s=tick(s);
 const root=child(s),p=s.providerCampaign,c=p.customers[0];
 assert.ok(project(s,'carrier-headroom').configSubmittedAt!==null);
 assert.equal(root.resources.carrier.desired.capacity,8);
 assert.equal(root.resources.carrier.effective.capacity,8,'the configured carrier becomes effective in the submitting tick');
 assert.equal(validate(s),true);
 const forged=structuredClone(s),upgrade=project(forged,'carrier-headroom');
 upgrade.operationReceipt.previousCapacity=995;upgrade.operationReceipt.capacity=999;
 forged.portfolio.customers.find(c=>c.id===customerId).root.resources.carrier.desired.capacity=999;
 forged.portfolio.customers.find(c=>c.id===customerId).root.resources.carrier.effective.capacity=999;
 assert.throws(()=>validate(forged),/INVALID_PROVIDER_CAPACITY_AUTHORITY/,'an edited paid receipt cannot turn a four-session upgrade into 999');
 s=SOC.dispatch(s,{type:'advance',minutes:2});
 assert.equal(child(s).resources.carrier.desired.capacity,8);
 assert.equal(child(s).resources.carrier.effective.capacity,8);
 assert.equal(validate(s),true);
});

test('the authored Steady plan retains its distinct paid carrier capacity',()=>{
 const s=open('steady');
 assert.equal(child(s).resources.carrier.desired.capacity,8);
 assert.equal(validate(s),true);
});

test('a later paid recording recommission resets capture capacity instead of inheriting old headroom',()=>{
 let s=open('swift');
 s=buy(s,operation('recording'));
 for(let i=0;i<20&&project(s,'recording').status!=='complete';i++)s=tick(s);
 assert.equal(child(s).resources.recorder.desired.capacity,4);
 s=buy(s,operation('capture-headroom'));
 for(let i=0;i<20&&project(s,'capture-headroom').status!=='complete';i++)s=tick(s);
 assert.equal(child(s).resources.recorder.desired.capacity,8);
 s=buy(s,operation('recording'));
 for(let i=0;i<20&&project(s,'recording').status!=='complete';i++)s=tick(s);
 assert.equal(child(s).resources.recorder.desired.capacity,4);
 assert.equal(validate(s),true);
 const bad=structuredClone(child(s));bad.resources.recorder.desired.capacity=8;bad.resources.recorder.effective.capacity=8;
 assert.throws(()=>AUTHORITY.validateCustomer(s.providerCampaign,s.providerCampaign.customers[0],bad),/INVALID_PROVIDER_CAPACITY_AUTHORITY/);
});

test('paid BPO cover expands people without allowing an unpurchased entitlement increase',()=>{
 let s=open('swift');
 s=buy(s,operation('bpo'));
 for(let i=0;i<20&&project(s,'bpo').status!=='complete';i++)s=tick(s);
 assert.equal(child(s).resources.people.desired.people,4);
 assert.equal(child(s).resources.people.desired.entitlements,4);
 assert.equal(validate(s),true);
 s=buy(s,operation('recording'));
 for(let i=0;i<20&&project(s,'recording').status!=='complete';i++)s=tick(s);
 const op=operation('capture-headroom');s=buy(s,op);
 for(let i=0;i<20&&project(s,'capture-headroom').status!=='complete';i++)s=tick(s);
 assert.equal(child(s).resources.recorder.desired.capacity,8);
 assert.equal(validate(s),true);
 const bad=structuredClone(child(s));bad.resources.people.desired.entitlements=99;
 assert.throws(()=>AUTHORITY.validateCustomer(s.providerCampaign,s.providerCampaign.customers[0],bad),/INVALID_PROVIDER_CAPACITY_AUTHORITY/);
});

test('mitigation cannot duplicate an incident resource to mint another capacity increment',()=>{
 let s=stagedService();
 for(let i=0;i<240&&!s.providerCampaign.incidents.some(x=>x.customerId===customerId&&x.status==='active');i++)s=tick(s);
 let incident=s.providerCampaign.incidents.find(x=>x.customerId===customerId&&x.status==='active');
 assert.ok(incident,'the authored scenario reaches its incident');
 s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
 s=buy(s,operation('mitigate'));
 for(let i=0;i<20&&project(s,'mitigate').status!=='complete';i++)s=tick(s);
 assert.equal(project(s,'mitigate').status,'complete');
 assert.equal(validate(s),true);
 const forged=structuredClone(s),work=project(forged,'mitigate'),target=child(forged),resourceId=work.operationReceipt.resources[0];
 assert.ok(AUTHORITY.fieldsByResource[resourceId]?.includes('capacity'),`mitigation fixture affects tracked capacity ${resourceId}`);
 work.operationReceipt.resources.push(resourceId);
 target.resources[resourceId].desired.capacity++;
 target.resources[resourceId].effective.capacity++;
 assert.throws(()=>AUTHORITY.validateCustomer(forged.providerCampaign,forged.providerCampaign.customers[0],target),/INVALID_PROVIDER_CAPACITY_AUTHORITY/);
});

test('worker source defers dependency lookup until ordered game modules initialize',()=>{
 const context={__rules:RULES,__products:PRODUCTS,__government:GOVERNMENT};vm.createContext(context);
 assert.doesNotThrow(()=>vm.runInContext(AUTHORITY.source(),context));
 vm.runInContext('const SOC_PROVIDER_RULES=__rules; const SOC_PROVIDER_PRODUCTS=__products; const SOC_GOVERNMENT_ARCHITECTURES=__government;',context);
 const s=open('swift');
 context.__provider=s.providerCampaign;context.__customer=s.providerCampaign.customers[0];context.__child=child(s);
 assert.equal(vm.runInContext('SOC_PROVIDER_CAPACITY_AUTHORITY.validateCustomer(__provider,__customer,__child)',context),true);
});

test('worker continuation accepts the same funded state and rejects forged imported capacity',()=>{
 const s=open('swift'),command={type:'advance',minutes:1};
 let reply;const context={postMessage:value=>{reply=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);
 context.onmessage({data:{id:1,state:s,command}});
 assert.equal(reply.error,undefined);
 assert.deepEqual(JSON.parse(JSON.stringify(reply.state)),tick(SOC.restore(JSON.stringify(s)),1));
 const forged=structuredClone(s);child(forged).resources.carrier.desired.capacity=999;child(forged).resources.carrier.effective.capacity=999;
 reply=null;context.onmessage({data:{id:2,state:forged,command}});
 assert.match(reply.error,/INVALID_PROVIDER_CAPACITY_AUTHORITY/);
});
