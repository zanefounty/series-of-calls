const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications'),B=E.business;
const dispatch=(s,c)=>E.dispatch(s,{type:'business',command:c});
const tick=(s,minutes)=>E.dispatch(s,{type:'advance',minutes});
const start=()=>dispatch(E.create({scenario:'smb',jurisdiction:'AU'}),{action:'start'});
function voiceContract(){
 let s=start();s=dispatch(s,{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:['phone'],sell:true});s=tick(s,2);assert.equal(s.business.contracts[0].status,'active');return s;
}
test('PLAY-011 service settlement retains 57 unavailable minutes after last-minute repair',()=>{
 let s=voiceContract();s=tick(s,58);s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});s=tick(s,57);s=E.dispatch(s,{type:'fault',id:'phone',fault:null});s=tick(s,3);
 const c=s.business.contracts[0],settlement=c.settlements[1],retail=s.business.ledger.filter(row=>row.contract===c.id&&row.category==='revenue')[1];
 assert.equal(settlement.serviceMinutes,60);assert.equal(settlement.unavailableMinutes,57);assert.ok(settlement.readyMinutes<settlement.serviceMinutes);
 assert.equal(retail.settlementBasis,'period-history-v1');assert.equal(retail.serviceCredit,Math.floor(c.price*57/60));assert.equal(retail.cents,Math.max(0,retail.serviceCredit?c.price-retail.serviceCredit:c.price));
 const before=JSON.stringify(s);B.calculate(s);B.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(E.restore(JSON.stringify(s)),s);
});
test('PLAY-011 a final-minute outage preserves the first 59 minutes of delivered readiness',()=>{
 let s=voiceContract();s=tick(s,58);s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});s=tick(s,57);s=E.dispatch(s,{type:'fault',id:'phone',fault:null});s=tick(s,3);s=tick(s,59);s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});s=tick(s,1);
 const c=s.business.contracts[0],settlement=c.settlements[2];assert.equal(settlement.serviceMinutes,60);assert.equal(settlement.unavailableMinutes,1);assert.equal(settlement.readyMinutes,59);
 assert.ok(s.business.ledger.filter(row=>row.contract===c.id&&row.category==='revenue')[2].cents>0);
});
test('PLAY-007 unfunded discretionary projects and orders fail atomically; forecast shows recurring commitments',()=>{
 let s=start();s=dispatch(s,{action:'staff',engineers:20,support:1,operator:'player'});const before=JSON.stringify(s);
 assert.throws(()=>dispatch(s,{action:'project',resources:['phone'],engineers:20,duration:1440}),/INSUFFICIENT_FUNDS/);assert.equal(JSON.stringify(s),before);
 s=dispatch(s,{action:'loan',cents:100000});s=dispatch(s,{action:'project',resources:['phone'],engineers:10,duration:1440});assert.equal(s.business.projects[0].status,'running');
 assert.throws(()=>dispatch(s,{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:['phone'],sell:true,price:100000}),/CUSTOMER_BUDGET/);
 let fresh=start();fresh=dispatch(fresh,{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:['phone'],sell:true});
 const report=E.calculate(fresh).business;assert.equal(report.forecastRecurringRevenue,1800);assert.equal(report.forecastRecurringWholesale,1000);assert.equal(report.forecastRecurringStaff,300);assert.equal(report.forecastRecurringOperatingResult,500);
});
test('PLAY-011 history, billing and worker replay agree',()=>{
 let s=voiceContract();s=tick(s,58);s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});s=tick(s,57);s=E.dispatch(s,{type:'fault',id:'phone',fault:null});s=tick(s,3);s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});let result;const context={postMessage:r=>result=r};vm.createContext(context);vm.runInContext(E.workerSource(),context);context.onmessage({data:{id:71,state:s,command:{type:'advance',minutes:60}}});
 const expected=tick(s,60);assert.deepEqual(JSON.parse(JSON.stringify(result.state)),expected);assert.equal(expected.business.contracts[0].settlements[2].unavailableMinutes,60);
});
test('PLAY-007 unavoidable posted bills enter grace, recover with disclosed funding, or default at the deadline',()=>{
 const trouble=()=>{let s=start();s=dispatch(s,{action:'order',offer:'access',quantity:5000,unit:'Mbps',currency:'AUD',resources:['access'],sell:false});return s;};
 let recovered=tick(trouble(),60);assert.equal(recovered.business.solvency.status,'grace');assert.equal(recovered.business.solvency.payable,-recovered.business.balance.cash);assert.equal(recovered.business.solvency.deadline,120);
 recovered=dispatch(recovered,{action:'loan',cents:100000});assert.equal(recovered.business.solvency.status,'current');assert.equal(recovered.business.solvency.payable,0);assert.equal(recovered.business.balance.cash>0,true);
 let overdue=tick(trouble(),120);assert.equal(overdue.business.solvency.status,'default');assert.equal(overdue.business.solvency.defaultedAt,120);assert.ok(overdue.business.events.some(e=>e.code==='PAYMENT_DEFAULT'));
 assert.throws(()=>dispatch(overdue,{action:'project',resources:['phone'],engineers:1,duration:1}),/INSUFFICIENT_FUNDS/);assert.deepEqual(E.restore(JSON.stringify(overdue)),overdue);
});
test('provider campaign postings use the shared business balance and reject unscoped or forged ledger fields',()=>{
 let s=start();assert.throws(()=>B.postProvider(s,'cost',1,{reason:'setup'}),/INVALID_PROVIDER_POSTING/);s.providerCampaign={version:1};const before=s.business.balance.cash;B.postProvider(s,'cost',100,{reason:'provider-setup'});assert.equal(s.business.balance.cash,before-100);assert.equal(s.business.ledger.at(-1).reason,'provider-setup');
 assert.throws(()=>B.postProvider(s,'cost',100,{cents:0}),/INVALID_PROVIDER_POSTING/);assert.throws(()=>B.postProvider(s,'internal',100,{}),/INVALID_PROVIDER_POSTING/);
});
test('legacy validated saves gain empty period history and reconciled solvency without rewriting the source envelope',()=>{
 let s=voiceContract();delete s.business.solvency;delete s.business.contracts[0].periodHistory;delete s.business.contracts[0].settlements;const source=JSON.stringify(s);
 const migrated=E.restore(source);assert.equal(JSON.stringify(s),source);assert.deepEqual(migrated.business.contracts[0].periodHistory,{from:migrated.clock,minutes:0,readyMinutes:0,usage:0});assert.deepEqual(migrated.business.contracts[0].settlements,[]);assert.deepEqual(migrated.business.solvency,{status:'current',payable:0,firstArrearsAt:null,deadline:null,defaultedAt:null});
});
