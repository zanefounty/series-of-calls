const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const run=(s,type,command)=>SOC.dispatch(s,{type,command});
const add=(s,id,market='au-sydney')=>run(s,'portfolio',{action:'addcustomer',id,tenant:id+'-tenant',name:'Customer '+id,scenario:'smb',market});
const child=(s,id,c)=>run(s,'portfolio',{action:'dispatchcustomer',customerId:id,command:c});
test('AC-SOC-185 tenant birth clock and calling plus outcome canonical identity remain consistent',()=>{
 let s=SOC.create({tenant:'fresh-tenant',customerName:'Fresh Customer',clock:25});
 assert.ok(Object.values(s.resources).every(r=>r.provisioning.due===26));
 assert.throws(()=>SOC.create({tenant:'x'.repeat(49)}),/INVALID_EXERCISE/);
 s=run(s,'calling',{action:'start'});assert.ok(Object.values(s.calling.nodes).every(n=>n.provisioning.due===26));
 const identity=(canonical,endpoint,alias,number)=>({canonical,endpoint,tenant:'fresh-tenant',aliases:[alias],number,known:true,site:'office',location:'Synthetic office',jurisdiction:'AU',emergencyEligible:true});
 s=run(s,'calling',{type:'configure',node:'directory',at:s.clock,config:{tenants:[{id:'fresh-tenant',name:'Fresh Customer'}],identities:[identity('alex','laptop','200','+61255500200'),identity('bea','desk','201','+61255500201')],federation:[],publicReach:[{tenant:'fresh-tenant',number:'+61255500201'}]}});
 s=SOC.dispatch(s,{type:'advance',minutes:1});
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'need-case'});
 s=run(s,'outcomes',{action:'start'});
 s=run(s,'outcomes',{action:'configure',config:{supportedIntents:['billing-question'],taskIntegrations:[{intent:'billing-question',integration:'cases',evidence:['case-updated']}]}});
 s=SOC.dispatch(s,{type:'advance',minutes:1});
 s=run(s,'outcomes',{action:'need',tenant:'fresh-tenant',person:'alex',caseId:'need-case',purpose:'Billing support',intent:'billing-question',permittedChannels:['voice']});
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'200',to:'+61255500201',caseId:'need-case',needId:s.outcomes.needs[0].id});
 assert.equal(s.interactions.at(-1).from,'alex');assert.equal(s.interactions.at(-1).tenant,'fresh-tenant');
 assert.equal(SOC.restore(JSON.stringify(s)).customerName,'Fresh Customer');
});
test('AC-SOC-188 portfolio shared dispatch advances all real roots and worker save replay agrees',()=>{
 let s=run(SOC.create(),'portfolio',{action:'start'});s=add(s,'first');s=add(s,'second','us-seattle');
 for(const id of ['first','second'])s=child(s,id,{type:'configure',id:'people',config:{people:2}});
 s=SOC.dispatch(s,{type:'advance',minutes:1});
 for(const id of ['first','second'])s=child(s,id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'same-local-case'});
 s=run(s,'portfolio',{action:'selectcustomer',customerId:'second'});
 const copy=JSON.stringify(s);SOC.calculate(s);assert.equal(JSON.stringify(s),copy);
 const context={};vm.createContext(context);vm.runInContext(SOC.workerSource()+';globalThis.engine=SOC;',context);
 const cmd={type:'advance',minutes:5},next=SOC.dispatch(s,cmd),worker=context.engine.dispatch(SOC.restore(copy),cmd);
 assert.equal(JSON.stringify(next),JSON.stringify(worker));assert.deepEqual(SOC.restore(JSON.stringify(next)),next);
 for(const row of next.portfolio.customers){assert.equal(row.root.clock,6);assert.equal(row.root.interactions[0].phase,'resolved');assert.equal(row.root.cases['same-local-case'].tenant,row.tenant);}
 assert.throws(()=>child(next,'first',{type:'advance',minutes:1}),/CHILD_COMMAND_NOT_ALLOWED/);
 const changedMode=structuredClone(next);changedMode.portfolio.customers[0].root.mode='sandbox';assert.throws(()=>SOC.validateState(changedMode),/PORTFOLIO_CUSTOMER_CONTEXT_MISMATCH/);const changedSeed=structuredClone(next);changedSeed.portfolio.customers[0].root.seed++;assert.throws(()=>SOC.validateState(changedSeed),/PORTFOLIO_CUSTOMER_CONTEXT_MISMATCH/);
 const forged=structuredClone(next);forged.portfolio.customers[0].root.app='seriesoftubes';assert.throws(()=>SOC.validateState(forged));
});
test('AC-SOC-189 concurrent portfolio survives campaign track switching without rewind or duplication',()=>{
 let s=run(SOC.create({mode:'sandbox'}),'campaign',{action:'start'});s=run(s,'portfolio',{action:'start'});s=add(s,'first');
 s=SOC.dispatch(s,{type:'advance',minutes:2});const original=structuredClone(s.portfolio);
 s=run(s,'campaign',{action:'select-track',track:'enterprise'});
 assert.deepEqual(s.portfolio,original);assert.equal(s.campaign.snapshots.smb.root.portfolio,undefined);
 s=SOC.dispatch(s,{type:'advance',minutes:1});assert.equal(s.portfolio.clock,3);assert.equal(s.portfolio.customers[0].root.clock,3);
 s=run(s,'campaign',{action:'select-track',track:'smb'});assert.equal(s.portfolio.clock,3);assert.equal(s.clock,2);
 s=SOC.dispatch(s,{type:'advance',minutes:1});assert.equal(s.portfolio.clock,4);assert.equal(SOC.calculate(s).portfolio.customers.length,1);
});
