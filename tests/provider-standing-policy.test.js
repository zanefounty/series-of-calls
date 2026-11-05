const test=require('node:test'),assert=require('node:assert/strict'),SOC=require('../src/game/55-communications'),P=require('../src/game/23-provider-policy');
const customerId='starter-customer';
function tick(s,n=1){for(let i=0;i<n;i++)s=SOC.dispatch(s,{type:'advance',minutes:1});return s;}
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});}
function setup(stages=['base','carrier','partner']){let s=SOC.create({experience:'campaign'});for(const stage of stages){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=tick(s,4);}s=buy(s,{action:'operation',operationId:'automation',customerId});return tick(s,6);}
function config(s,rules,patch={}){return {...P.create(),enabled:true,cashFloorCents:10000,lifetimeBudgetCents:300000,budgetSpentCents:s.providerAutomation[0].spentCents,maxActions:6,actionsUsed:s.providerAutomation[0].actions.length,engineerCeiling:2,supportCeiling:1,customerIds:[customerId],rules,...patch};}
function rule(kind,patch={}){return {id:kind,kind,enabled:true,customerIds:[customerId],operationId:{assurance:'repair',headroom:'carrier-headroom',migration:'migration',provisioning:null}[kind],stage:kind==='provisioning'?'carrier':null,resourceId:kind==='headroom'?'carrier':null,thresholdPercent:kind==='headroom'?1:null,...patch};}
function configure(s,c){return SOC.dispatch(s,{type:'provider',command:{action:'configure-policy',customerId,config:c}});}
test('paid scoped provisioning quotes and funds missing stages with one shared treasury and deterministic restoration',()=>{
 let s=setup(['base']),c=config(s,[rule('provisioning'),rule('provisioning',{id:'partner',stage:'partner'})]);
 const before=JSON.stringify(s),preview=SOC.provider.policyPreview(s,c);assert.equal(preview.status,'ready');assert.equal(preview.intent.command.stage,'carrier');assert.equal(JSON.stringify(s),before);
 s=configure(s,c);const cash=s.business.balance.cash;s=tick(s,8);assert.equal(s.providerCampaign.customers[0].status,'active');assert.equal(s.providerAutomation[0].actions.length,2);assert.equal(s.providerAutomation[0].spentCents,220000);assert.equal(s.business.balance.cash,cash-220000);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);assert.deepEqual(tick(SOC.restore(JSON.stringify(s)),2),tick(s,2));
});
test('policy budget counters and scope are authority checked; cash and staff ceilings refuse without buying',()=>{
 let s=setup(['base']),c=config(s,[rule('provisioning')],{cashFloorCents:s.business.balance.cash});s=configure(s,c);const cash=s.business.balance.cash;s=tick(s,2);assert.equal(s.providerAutomation[0].actions.length,0);assert.equal(s.business.balance.cash,cash);assert.equal(SOC.provider.policyPreview(s,c).reason,'CASH_FLOOR');
 assert.throws(()=>configure(s,{...c,actionsUsed:1}),/POLICY_COUNTERS_READ_ONLY/);assert.throws(()=>configure(s,{...c,customerIds:[]}),/POLICY_EXPLICIT_SCOPE_REQUIRED/);assert.throws(()=>configure(s,{...c,customerIds:['missing']}),/POLICY_EXPLICIT_SCOPE_REQUIRED/);
 s=setup();while(!SOC.provider.inspect(s).customers[0].services.some(r=>r.id==='carrier'&&r.pressure.used>0))s=tick(s);c=config(s,[rule('headroom')],{engineerCeiling:0});s=configure(s,c);assert.equal(SOC.provider.policyPreview(s,c).reason,'STAFFING_CEILING');s=tick(s,2);assert.equal(s.providerAutomation[0].actions.length,0);
});
test('measured carrier pressure purchases delayed session capacity without increasing seats or fabricating throughput',()=>{
 let s=setup(),c=config(s,[rule('headroom')],{maxActions:1});s=configure(s,c);const child=()=>s.portfolio.customers[0].root,before=child().resources.carrier.effective.capacity,seats=child().resources.phone.effective.capacity;
 for(let n=0;n<20&&!s.providerAutomation[0].actions.length;n++)s=tick(s);assert.equal(s.providerAutomation[0].actions.length,1);assert.equal(child().resources.carrier.effective.capacity,before);s=tick(s,6);assert.equal(child().resources.carrier.effective.capacity,before+4);assert.equal(child().resources.phone.effective.capacity,seats);assert.equal(s.providerAutomation[0].actions.length,1);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=structuredClone(s);forged.providerAutomation[0].actions[0].cents=0;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_AUTOMATION/);
});
test('configured assurance remains suspendable and preserves each paid incident receipt',()=>{
 let s=setup(),c=config(s,[rule('assurance')]);s=configure(s,c);s=SOC.dispatch(s,{type:'provider',command:{action:'automation',customerId,enabled:false}});while(s.clock<60)s=tick(s);assert.equal(s.providerAutomation[0].actions.length,0);assert.ok(s.providerCampaign.incidents.some(i=>i.status==='active'));
 s=SOC.dispatch(s,{type:'provider',command:{action:'automation',customerId,enabled:true}});s=tick(s,7);assert.equal(s.providerAutomation[0].actions.length,1);assert.equal(s.providerAutomation[0].spentCents,8000);assert.ok(s.providerCampaign.incidents.some(i=>i.status==='resolved'));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('migration standing order uses actual placements and preserves worker and saved continuation',()=>{
 let s=setup(),c=config(s,[rule('migration')],{maxActions:1});const q=SOC.provider.policyPreview(s,c);assert.equal(q.status,'ready');assert.equal(q.intent.command.operationId,'migration');s=configure(s,c);s=tick(s);
 assert.equal(s.providerAutomation[0].actions.length,1);assert.equal(s.providerAutomation[0].actions[0].kind,'migration');
 const vm=require('node:vm'),context={postMessage:r=>context.result=r};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);const command={type:'advance',minutes:1};context.onmessage({data:{id:1,state:SOC.restore(JSON.stringify(s)),command}});assert.equal(context.result.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(context.result.state)),SOC.dispatch(s,command));
 s=tick(s,22);const child=s.portfolio.customers[0].root;assert.equal(child.operations.placements.bea,'migration-phone');assert.notEqual(child.operations.placements.alex,'migration-phone');assert.equal(s.providerCampaign.projects.filter(p=>p.operationId==='migration').length,1);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
