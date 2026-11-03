const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../src/game/37-portfolio');
const SOC=require('../src/game/55-communications');
const B=SOC.business;
const hooks={
 createCustomer:(_portfolio,c)=>SOC.create({scenario:c.scenario,jurisdiction:c.jurisdiction,tenant:c.tenant,clock:c.clock,mode:'guided',seed:73}),
 dispatchCustomer:(root,command)=>SOC.dispatch(root,command),
 validateCustomer:root=>{SOC.validateState(root);return true;}
};
const portfolio=()=>P.create();
const add=(s,{id,tenant,market,scenario})=>P.command(s,{action:'addcustomer',id,tenant,name:`Customer ${id}`,market,scenario},hooks);
const childCommand=(s,id,command)=>P.command(s,{action:'dispatchcustomer',customerId:id,command},hooks);
const tick=(s,minutes)=>{for(let i=0;i<minutes;i++)s=P.advance(s,hooks);return s;};
const solveCustomer=(s,id)=>{let root=s.customers.find(x=>x.id===id).root;for(const command of SOC.reference(root)){if(command.type==='advance')s=tick(s,command.minutes);else s=childCommand(s,id,command);root=s.customers.find(x=>x.id===id).root;}return s;};
function setupCustomer(s,id,tenant,market,scenario,offer){
 s=add(s,{id,tenant,market,scenario});
 s=solveCustomer(s,id);
 s=childCommand(s,id,{type:'business',command:{action:'start'}});
 const root=s.customers.find(x=>x.id===id).root,definition=B.offers[offer];
 const resources=Object.values(root.resources).filter(r=>definition.kinds.includes(r.kind)).map(r=>r.id);
 s=childCommand(s,id,{type:'business',command:{action:'order',offer,quantity:definition.minimum,unit:definition.unit,currency:'AUD',resources,sell:true}});
 return s;
}

test('AC-SOC-161 five geographic markets keep geography distinct from jurisdiction',()=>{
 assert.equal(Object.keys(P.markets).length,5);
 assert.equal(P.markets['au-sydney'].jurisdiction,'AU');assert.equal(P.markets['au-melbourne'].jurisdiction,'AU');
 assert.notEqual(P.markets['au-sydney'].geography,P.markets['au-melbourne'].geography);
 assert.deepEqual(['us-seattle','jp-tokyo','eu-dublin'].map(x=>P.markets[x].jurisdiction),['US','JP','EU']);
 let s=add(portfolio(),{id:'sydney-customer',tenant:'tenant-sydney',market:'au-sydney',scenario:'smb'});
 const bad=structuredClone(s);bad.customers[0].jurisdiction='US';assert.throws(()=>P.validate(bad),/PORTFOLIO_MARKET_BINDING_INVALID/);
 assert.throws(()=>add(portfolio(),{id:'wrong-market',tenant:'tenant-wrong',market:'au-sydney',scenario:'alien'}),/INVALID_PORTFOLIO_CUSTOMER/);
 assert.throws(()=>P.command(portfolio(),{action:'addcustomer',id:'bad-root',tenant:'tenant-bad',name:'Bad root',market:'au-sydney',scenario:'smb'},{...hooks,createCustomer:(_s,c)=>SOC.create({scenario:c.scenario,jurisdiction:'US',tenant:c.tenant,clock:c.clock})}),/PORTFOLIO_CUSTOMER_ROOT_INVALID/);
});

test('AC-SOC-162 two real child journeys and accepted contracts stay isolated by customer',()=>{
 let s=setupCustomer(portfolio(),'sydney-customer','tenant-sydney','au-sydney','smb','messaging');
 s=setupCustomer(s,'seattle-customer','tenant-seattle','us-seattle','enterprise','access');
 const a=s.customers.find(x=>x.id==='sydney-customer'),b=s.customers.find(x=>x.id==='seattle-customer');
 assert.notEqual(a.root,b.root);assert.notEqual(a.root.resources,b.root.resources);
 assert.equal(a.root.jurisdiction,'AU');assert.equal(b.root.jurisdiction,'US');
 assert.equal(a.root.tenant,'tenant-sydney');assert.equal(b.root.tenant,'tenant-seattle');
 assert.equal(a.root.interactions.at(-1).phase,'resolved');assert.equal(b.root.interactions.at(-1).phase,'resolved');
 assert.equal(a.root.business.contracts[0].offer,'messaging');assert.equal(b.root.business.contracts[0].offer,'access');
 assert.ok(['provisioning','active','blocked'].includes(a.root.business.contracts[0].status));
 assert.ok(['provisioning','active','blocked'].includes(b.root.business.contracts[0].status));
 const beforeB=JSON.stringify(b.root);
 s=childCommand(s,'sydney-customer',{type:'configure',id:'people',config:{people:3}});
 assert.equal(JSON.stringify(s.customers.find(x=>x.id==='seattle-customer').root),beforeB);
 assert.ok(P.inspect(s).customers.every(x=>x.acceptedContracts.every(c=>c.id.startsWith(`${x.id}:`))));
});

test('AC-SOC-163 every active child ticks once independent of selected view; inactive roots pause',()=>{
 let s=add(add(portfolio(),{id:'one',tenant:'tenant-one',market:'au-sydney',scenario:'smb'}),{id:'two',tenant:'tenant-two',market:'jp-tokyo',scenario:'enterprise'});
 s=tick(s,1);
 s=P.command(s,{action:'selectcustomer',customerId:'one'});
 s=P.command(s,{action:'deactivatecustomer',customerId:'two'});
 s=tick(s,2);
 assert.equal(s.clock,3);assert.equal(s.customers.find(x=>x.id==='one').root.clock,3);assert.equal(s.customers.find(x=>x.id==='two').root.clock,1);
 s=P.command(s,{action:'activatecustomer',customerId:'two'},hooks);s=tick(s,1);
 assert.equal(s.customers.find(x=>x.id==='one').root.clock,4);assert.equal(s.customers.find(x=>x.id==='two').root.clock,4);
 assert.equal(s.selectedCustomer,'one');
});

test('AC-SOC-164 deactivation respects live contracts and obligations',()=>{
 let s=setupCustomer(portfolio(),'customer-one','tenant-one','au-sydney','smb','messaging');
 assert.throws(()=>P.command(s,{action:'deactivatecustomer',customerId:'customer-one'}),/CUSTOMER_HAS_OUTSTANDING_OBLIGATIONS/);
 s=childCommand(s,'customer-one',{type:'business',command:{action:'cancel',contract:s.customers[0].root.business.contracts[0].id}});
 s=P.command(s,{action:'deactivatecustomer',customerId:'customer-one'});assert.equal(s.customers[0].active,false);
 assert.throws(()=>childCommand(s,'customer-one',{type:'connect',connected:false}),/CUSTOMER_INACTIVE/);
});

test('AC-SOC-165 portfolio finance aggregates actual child ledger and excludes internal cash/profit',()=>{
 let s=setupCustomer(portfolio(),'sydney-customer','tenant-sydney','au-sydney','smb','messaging');
 s=setupCustomer(s,'seattle-customer','tenant-seattle','us-seattle','enterprise','access');
 s=tick(s,60);
 const result=P.calculate(s),rows=result.financials.customers;
 assert.equal(rows.length,2);assert.ok(rows.every(x=>x.externalCostCents>0));
 assert.ok(rows.every(x=>x.externalRevenueCents>0));
 assert.equal(result.financials.externalRevenueCents,rows.reduce((n,x)=>n+x.externalRevenueCents,0));
 assert.equal(result.financials.externalCostCents,rows.reduce((n,x)=>n+x.externalCostCents,0));
 assert.equal(result.financials.externalProfitCents,result.financials.externalRevenueCents-result.financials.externalCostCents);
 assert.equal(result.financials.openingCapitalCents,200000);assert.equal(result.financials.cashIncludingOpeningCapitalCents,rows.reduce((n,x)=>n+x.cashIncludingOpeningCapitalCents,0));
 assert.equal(result.financials.externalDebtCents,0);assert.deepEqual(result.financials.portfolioInternalCash,{tracked:false,cents:null});
 const overflow=structuredClone(s);for(const row of overflow.customers){row.root.business.balance.revenue=Number.MAX_SAFE_INTEGER;row.root.business.balance.cost=0;}assert.throws(()=>P.calculate(overflow),/PORTFOLIO_MONEY_OVERFLOW/);
 const internal=structuredClone(s);internal.customers[0].root.business.ledger.push({id:'internal-fake',cents:50000,category:'internal'});
 assert.equal(P.calculate(internal).financials.externalProfitCents,result.financials.externalProfitCents);
});

test('AC-SOC-166 forwarding is strict and rejects nested packs, child time changes and cross-customer swaps',()=>{
 let s=add(portfolio(),{id:'customer-one',tenant:'tenant-one',market:'au-melbourne',scenario:'smb'});
 assert.throws(()=>childCommand(s,'customer-one',{type:'advance',minutes:1}),/PORTFOLIO_CHILD_COMMAND_NOT_ALLOWED/);
 assert.throws(()=>childCommand(s,'customer-one',{type:'portfolio',command:{action:'addcustomer'}}),/PORTFOLIO_CHILD_COMMAND_NOT_ALLOWED/);
 assert.throws(()=>childCommand(s,'customer-one',{type:'campaign',command:{action:'start'}}),/PORTFOLIO_CHILD_COMMAND_NOT_ALLOWED/);
 assert.throws(()=>childCommand(s,'customer-one',{type:'configure',id:'unknown',config:{enabled:false}}),/UNKNOWN_RESOURCE/);
 const before=structuredClone(s),forged=structuredClone(s.customers[0].root);forged.tenant='tenant-other';
 assert.throws(()=>P.command(s,{action:'dispatchcustomer',customerId:'customer-one',command:{type:'connect',connected:false}},{...hooks,dispatchCustomer:()=>forged}),/PORTFOLIO_CUSTOMER_DISPATCH_INVALID/);
 assert.deepEqual(s,before);
});

test('AC-SOC-167 customer identity, market, root, and customer bounds are save-validated',()=>{
 let s=add(portfolio(),{id:'customer-one',tenant:'tenant-one',market:'eu-dublin',scenario:'government'});
 for(const [mutate,code] of [
  [x=>x.customers[0].tenant='tenant-two','PORTFOLIO_MARKET_BINDING_INVALID'],
  [x=>x.customers[0].root.jurisdiction='JP','PORTFOLIO_MARKET_BINDING_INVALID'],
  [x=>x.randomField=true,'INVALID_PORTFOLIO_STATE'],
  [x=>x.customers[0].randomField='tampered','INVALID_PORTFOLIO_CUSTOMER_STATE'],
  [x=>x.customers[0].root.campaign={pack:'soc-campaign-1'},'PORTFOLIO_NESTED_PACK_FORBIDDEN'],
  [x=>x.customers[0].root.clock=1,'PORTFOLIO_MARKET_BINDING_INVALID'],
  [x=>x.selectedCustomer='missing','INVALID_PORTFOLIO_SELECTION']
 ]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>P.validate(bad),new RegExp(code));}
 let full=portfolio();for(let i=0;i<P.MAX_CUSTOMERS;i++)full=add(full,{id:`customer-${i}`,tenant:`tenant-${i}`,market:'au-sydney',scenario:'smb'});
 assert.equal(full.customers.length,20);assert.throws(()=>add(full,{id:'customer-extra',tenant:'tenant-extra',market:'au-sydney',scenario:'smb'}),/INVALID_PORTFOLIO_CUSTOMER/);
 let dormant=add(portfolio(),{id:'dormant',tenant:'tenant-dormant',market:'au-sydney',scenario:'smb'});dormant=tick(dormant,1);dormant=P.command(dormant,{action:'deactivatecustomer',customerId:'dormant'});dormant.clock+=P.MAX_CATCHUP_MINUTES+1;
 assert.throws(()=>P.command(dormant,{action:'activatecustomer',customerId:'dormant'},hooks),/PORTFOLIO_CUSTOMER_CATCHUP_LIMIT/);
});

test('AC-SOC-168 inspect and calculate are pure and deterministic through worker source serialization',()=>{
 let s=setupCustomer(portfolio(),'one','tenant-one','au-sydney','smb','messaging');s=tick(s,1);
 const before=JSON.stringify(s),first=P.calculate(s),second=P.calculate(s);P.inspect(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(first,second);
 const context={};const workerModule=require('node:vm').runInNewContext(P.source()+';SOC_PORTFOLIO',context);assert.equal(typeof workerModule,'object');
 const restored=P.validate(JSON.parse(JSON.stringify(s)));assert.deepEqual(P.calculate(restored),first);assert.equal(P.fingerprint(restored),P.fingerprint(s));
});
