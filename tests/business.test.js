const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications'),B=E.business;
const command=(s,c)=>E.dispatch(s,{type:'business',command:c});
const advance=(s,minutes)=>E.dispatch(s,{type:'advance',minutes});
const start=(scenario='smb',jurisdiction='AU')=>command(E.create({scenario,jurisdiction}),{action:'start'});
const order=(offer,s,extra={})=>({action:'order',offer,quantity:B.offers[offer].minimum,unit:B.offers[offer].unit,currency:'AUD',resources:Object.values(s.resources).filter(r=>B.offers[offer].kinds.includes(r.kind)).map(r=>r.id),sell:true,...extra});
const solve=(s)=>E.reference(s).reduce(E.dispatch,s);
test('AC-SOC-015 organisation roles and delegated authority control configuration',()=>{
 let s=start();assert.ok(s.business.organisations['branch-distribution'].roles.includes('distributor'));
 s=E.dispatch(s,{type:'configure',id:'phone',config:{capacity:20}});
 s=command(s,{action:'revoke',grant:'customer-service'});const before=JSON.stringify(s);
 assert.throws(()=>E.dispatch(s,{type:'configure',id:'phone',config:{capacity:40}}),/DELEGATION_REQUIRED/);
 assert.throws(()=>E.dispatch(s,{type:'restore',resources:{phone:s.resources.phone.desired}}),/DELEGATION_REQUIRED/);
 assert.equal(JSON.stringify(s),before);assert.doesNotThrow(()=>E.dispatch(s,{type:'configure',id:'people',config:{people:3}}));
});
test('AC-SOC-016 typed contracts reject mismatched units and distinguish acceptance from readiness',()=>{
 let s=start();assert.throws(()=>command(s,order('access',s,{unit:'seat'})),/CHARGING_DIMENSION/);
 assert.throws(()=>command(s,order('access',s,{currency:'USD'})),/CHARGING_DIMENSION/);
 assert.throws(()=>command(s,order('access',s,{via:'grove-vendor'})),/INVALID_DISTRIBUTOR/);
 s=command(s,order('access',s,{quantity:100,via:'branch-distribution'}));assert.equal(s.business.contracts[0].status,'provisioning');
 s=advance(s,2);assert.equal(s.business.contracts[0].status,'blocked');assert.ok(s.business.contracts[0].reasons.includes('INSUFFICIENT_MBPS:access'));
 s=E.dispatch(s,{type:'configure',id:'access',config:{capacity:100}});s=advance(s,1);assert.equal(s.business.contracts[0].status,'active');
});
test('AC-SOC-017 recurring allowances, wholesale costs, credits and replay reconcile exactly once',()=>{
 let s=advance(start(),1);s=command(s,order('messaging',s));s=advance(s,2);
 const before=structuredClone(s),due=s.business.contracts[0].nextBill,minutes=due-s.clock;
 B.meter(s,'message',100);const expected=structuredClone(s);s=advance(s,minutes);
 const bill=s.business.ledger.find(l=>l.category==='revenue');assert.equal(bill.overage,0);assert.equal(bill.settlementBasis,'period-history-v1');assert.equal(bill.serviceMinutes,60);assert.equal(bill.cents,s.business.contracts[0].price-bill.serviceCredit);
 const second=advance(expected,minutes);assert.deepEqual(second,s);assert.deepEqual(E.restore(JSON.stringify(s)),s);
 const snapshot=JSON.stringify(s);E.calculate(s);E.calculate(s);assert.equal(JSON.stringify(s),snapshot);
 const contract=s.business.contracts[0];s=command(s,{action:'credit',contract:contract.id,cents:500});assert.throws(()=>command(s,{action:'credit',contract:contract.id,cents:501}),/INVALID_CREDIT/);
 const bal=s.business.balance;assert.equal(bal.cash,bal.opening+bal.revenue-bal.cost+bal.funding-bal.repaid);
 assert.ok(before.business.balance.cash>s.business.balance.cash-bill.cents);
 let over=structuredClone(expected);B.meter(over,'message',5);over=advance(over,minutes);assert.equal(over.business.ledger.find(l=>l.category==='revenue').overage,5);
});
test('AC-SOC-018 government procurement requires outcome evidence and approved fictional boundaries',()=>{
 let s=start('government');assert.throws(()=>command(s,{action:'qualify',sector:'government'}),/EVIDENCE_REQUIRED/);
 s=solve(s);s=command(s,{action:'qualify',sector:'government'});
 s=command(s,order('archive',s));s=advance(s,2);assert.equal(s.business.contracts[0].status,'active');
 const bad=E.dispatch(s,{type:'configure',id:'archive',config:{region:'US'}});const ready=advance(bad,1);
 assert.throws(()=>command(ready,order('processing',ready,{resources:['speech']})),/INSUFFICIENT_PROCESSOR-MINUTE/);
});
test('AC-SOC-019 engineers, support staff and skilled contact-centre people are independent',()=>{
 let s=start();s=command(s,{action:'project',resources:['phone'],engineers:2,duration:3});
 assert.throws(()=>command(s,{action:'project',resources:['room'],engineers:1,duration:3}),/ENGINEER_CAPACITY/);
 assert.throws(()=>command(s,{action:'staff',engineers:1,support:1,operator:'player'}),/ENGINEERS_ASSIGNED/);
 s=advance(s,3);assert.equal(s.business.projects[0].status,'complete');assert.equal(s.resources.people.effective.people,0);
 s=advance(s,57);assert.equal(s.business.metrics.handled,0);assert.ok(s.business.metrics.repeated>0);
});
test('AC-SOC-020 financing and acquired subsidiaries do not manufacture consolidated profit',()=>{
 let s=start(),p=E.calculate(s).business.profit;
 s=command(s,{action:'loan',cents:50000});assert.equal(E.calculate(s).business.profit,p);assert.equal(E.calculate(s).business.debt,50000);
 s=command(s,{action:'acquire',organisation:'twig-integrations'});p=E.calculate(s).business.profit;const cash=s.business.balance.cash;
 s=command(s,{action:'transfer',organisation:'twig-integrations',cents:10000});assert.equal(E.calculate(s).business.profit,p);assert.equal(s.business.balance.cash,cash);
 s=command(s,{action:'repay',loan:s.business.loans[0].id,cents:10000});assert.equal(E.calculate(s).business.debt,40000);assert.equal(E.calculate(s).business.profit,p);
 assert.throws(()=>command(s,{action:'repay',loan:s.business.loans[0].id,cents:40001}),/INVALID_REPAYMENT/);
});
test('AC-SOC-021 renewal, cancellation commitments and market events retain contract history',()=>{
 let s=solve(start());s=command(s,order('messaging',s));s=advance(s,180);const c=s.business.contracts[0];assert.equal(c.status,'renewal');
 const billed=c.billedPeriods;s=advance(s,60);assert.equal(s.business.contracts[0].billedPeriods,billed);
 let renewed=command(s,{action:'renew',contract:c.id});renewed=advance(renewed,1);assert.equal(renewed.business.contracts[0].billedPeriods,billed,'renewal must not back-bill the decision interval');
 renewed=command(renewed,{action:'cancel',contract:c.id});assert.ok(renewed.business.ledger.some(l=>l.reason==='minimum-term-exit'&&l.cents===3*B.offers.messaging.wholesale*c.quantity),'renewal starts a new commitment');
 s=command(s,{action:'market',event:'vendor-retirement'});assert.throws(()=>command(s,{action:'renew',contract:c.id}),/OFFER_RETIRED/);
 s=command(s,{action:'cancel',contract:c.id});assert.equal(s.business.contracts[0].status,'cancelled');assert.equal(s.business.contracts.length,1);
 const fresh=command(start(),order('access',start()));const cancelled=command(fresh,{action:'cancel',contract:fresh.business.contracts[0].id});assert.ok(cancelled.business.ledger.some(l=>l.reason==='minimum-term-exit'));
});
test('AC-SOC-038 imported commercial authority and financial obligations retain validated relationships',()=>{
 const s=command(start(),{action:'loan',cents:5000});
 for(const [mutate,code] of [
  [b=>b.grants[0].actions.push('everything'),'INVALID_SAVED_DELEGATION'],
  [b=>b.ownership.phone='unknown','INVALID_RESOURCE_OWNERSHIP'],
  [b=>b.loans[0].principal=4000,'UNRECONCILED_DEBT'],
  [b=>b.workforce.engineers=-1,'INVALID_CAMPAIGN_WORKFORCE'],
  [b=>b.qualifications[b.player].government='forever','INVALID_QUALIFICATIONS']
 ]){const bad=structuredClone(s);mutate(bad.business);assert.throws(()=>E.restore(JSON.stringify(bad)),new RegExp(code));}
});
test('AC-SOC-022 all business tracks require their services and run identically in worker and replay',()=>{
 for(const scenario of Object.keys(B.tracks))for(const jurisdiction of E.jurisdictions){
  let s=start(scenario,jurisdiction);s=E.dispatch(s,{type:'configure',id:'speech',config:{capacity:20}});s=solve(s);
  if(['government','defence'].includes(scenario))s=command(s,{action:'qualify',sector:scenario});
  for(const offer of B.tracks[scenario].offers)s=command(s,order(offer,s));
  let result;const context={postMessage:r=>result=r};vm.createContext(context);vm.runInContext(E.workerSource(),context);context.onmessage({data:{id:3,state:s,command:{type:'advance',minutes:60}}});
  s=advance(s,60);assert.deepEqual(JSON.parse(JSON.stringify(result.state)),s);
  assert.equal(E.calculate(s).business.completion,true,scenario+'/'+jurisdiction);
  s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});assert.equal(E.calculate(s).business.completion,false);
 }
});
