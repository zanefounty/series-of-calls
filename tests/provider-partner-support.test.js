const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications.js'),SUPPORT=require('../src/game/23-provider-partner-support.js');
const customerId='starter-customer',hooks={catalogue:SOC.catalogue};
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);return send(s,{...request,quoteRevision:q.atRevision});}
function advance(s,n){for(let i=0;i<n;i++){for(const incident of s.providerCampaign.incidents.filter(x=>x.status==='active')){s=send(s,{action:'acknowledge-incident',incidentId:incident.id});s=buy(s,{action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId});}s=SOC.dispatch(s,{type:'advance',minutes:1});}return s;}
test('partner support retains only the real paid stage scope and historical payroll authority',()=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 assert.equal(SUPPORT.supportFor(s,customerId,['phone','carrier'],{hooks}).status,'blocked');
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 s=advance(s,60);const before=JSON.stringify(s),proof=SUPPORT.supportFor(s,customerId,['phone','carrier'],{hooks});assert.equal(proof.status,'ready',JSON.stringify(proof));assert.equal(JSON.stringify(s),before);
 const owner=proof.owners[0];assert.equal(owner.role,'msp');assert.equal(owner.organisationId,'orchard-msp');assert.equal(SUPPORT.validateOwner(s,owner,{at:60,hooks}),true);
 assert.equal(SUPPORT.supportFor(s,customerId,['recorder'],{hooks}).status,'blocked','a generic calling contract does not grant recording support');
 s=advance(s,2);assert.deepEqual(SUPPORT.ownerAt(s,customerId,s.clock,hooks),owner,'elapsed payroll counters do not rewrite the stable contract');
 s=send(s,{action:'staff',engineers:2,support:0});s=advance(s,1);assert.equal(SUPPORT.supportFor(s,customerId,['phone','carrier'],{hooks}).status,'blocked');assert.equal(SUPPORT.validateOwner(s,owner,{at:60,hooks}),true,'a later staffing change does not erase historical paid support');
 assert.equal(SUPPORT.validateOwner(s,{...owner,scope:[...owner.scope,'recorder']},{at:60,hooks}),false);assert.equal(SUPPORT.validateOwner(s,{...owner,organisationId:'disco-vendor'},{at:60,hooks}),false);
 const context={};vm.createContext(context);vm.runInContext(SOC.workerSource()+SUPPORT.source()+';globalThis.support=SOC_PROVIDER_PARTNER_SUPPORT;',context);assert.deepEqual(JSON.parse(JSON.stringify(context.support.ownerAt(s,customerId,60,hooks))),owner);assert.equal(context.support.supportFor(s,customerId,['phone','carrier'],{hooks}).status,'blocked');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
