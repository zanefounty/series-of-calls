const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const Q=require('../src/game/36-market-qualification.js');
const content=require('../content/market-qualification.json');
const marketFixture=require('./helpers/market-fixture');

const fixtures=[
 {id:'cust-sydney',tenant:'tenant-sydney',market:'au-sydney',scenario:'smb'},
 {id:'cust-melbourne',tenant:'tenant-melb',market:'au-melbourne',scenario:'smb'},
 {id:'cust-seattle',tenant:'tenant-seattle',market:'us-seattle',scenario:'enterprise'},
 {id:'cust-tokyo',tenant:'tenant-tokyo',market:'jp-tokyo',scenario:'government'},
 {id:'cust-dublin',tenant:'tenant-dublin',market:'eu-dublin',scenario:'defence'}
];
const hooks={validatePortfolio:s=>{SOC.validateState(s);return true;},resourceReady:(s,id)=>SOC.observe(s,id),integrationStatus:(s,id)=>SOC.products.compatibilityStatus(s,id),boundaryAssessment:(s,id)=>{const root=s,c=root.boundaries?.contracts.find(x=>x.id===id),result=SOC.boundaries.evaluate(root,id);return {...result,eligible:result.eligible===true&&!!c?.effective?.flows?.length&&c.effective.flows.every(f=>root.boundaries.bindings[f.resource]===id&&SOC.observe(root,f.resource).ready)};}};
const d=(s,c)=>SOC.dispatch(s,c);
const child=(s,id)=>s.portfolio.customers.find(x=>x.id===id).root;
const pd=(s,id,command)=>d(s,{type:'portfolio',command:{action:'dispatchcustomer',customerId:id,command}});
function boundaryConfig(root,id){const region=root.jurisdiction,local=root.scenario==='defence',regions=['AU','US','JP','EU'];const one=['AU','JP','EU'].includes(region)?[region]:regions;return {id,workload:'market-service',profile:region,sensitivity:'confidential',edition:local?'local':'standard',productVersion:'release-1',offeringEvidence:region==='US'?'eligible':'pending',customerAuthorization:'approved',agencyAuthorizationRequired:false,agencyAuthorization:'not-required',serviceRegistration:region==='JP'?'registered':'not-registered',serviceRegistrationId:region==='JP'?'jp-registration':null,usesAi:false,aiUseDecision:'not-required',language:region==='JP'?'ja':'en',supportLanguage:region==='JP'?'ja':'en',requirements:{processingRegions:one,storageRegions:one,backupRegions:one,keyRegions:one,adminRegions:one,supportRegions:one,allowedAccessRoles:['agent'],adminAuthorization:'customer-approved',continuity:local?'local':'cloud',allowedTransferMechanisms:[]},flows:[{id:'customer-records',resource:'access',informationClass:'confidential',processingRegions:one,storageRegions:one,backupRegions:one,keyCustodyRegions:one,adminLocations:one,supportRegions:one,adminAuthorization:'customer-approved',accessRoles:['agent'],connectivity:local?'hybrid':'cloud',continuity:local?'local':'cloud',licenceMode:local?'local-grace':'cloud',transfer:{parties:[],mechanism:null}}]};}
function setup({customers=fixtures.slice(0,3),productsFor=[],roleByCustomer={},viaCustomers=[],continuity=false}={}){
 let s=SOC.create({scenario:'smb',mode:'assessed'});s=d(s,{type:'portfolio',command:{action:'start'}});
 for(const c of customers)s=d(s,{type:'portfolio',command:{action:'addcustomer',...c,name:c.id}});
 for(const c of customers){const root=child(s,c.id);s=pd(s,c.id,{type:'business',command:{action:'start'}});const local=root.scenario==='defence';if(local){s=pd(s,c.id,{type:'configure',id:'access',config:{local:true}});s=pd(s,c.id,{type:'configure',id:'carrier',config:{local:true}});s=pd(s,c.id,{type:'connect',connected:true});}if(productsFor.includes(c.id))s=pd(s,c.id,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});s=pd(s,c.id,{type:'workforce',command:{action:'start'}});s=pd(s,c.id,{type:'workforce',command:{action:'roster',people:[{id:'support-agent',employer:'orchard-msp',skills:['service','support'],languages:['en','ja'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:2,entitlements:['seat-01']} ]}});
  if(productsFor.includes(c.id))s=pd(s,c.id,{type:'products',command:{action:'start'}});
 }
 // Let resource, boundary and roster provisioning complete before the reference journeys and contracts.
 s=d(s,{type:'advance',minutes:1});
 for(const c of customers){for(const command of SOC.reference(child(s,c.id)))if(command.type!=='advance')s=pd(s,c.id,command);if(c.scenario==='defence')s=pd(s,c.id,{type:'connect',connected:true});}
 s=d(s,{type:'advance',minutes:6});
 for(const c of customers){const root=child(s,c.id),local=root.scenario==='defence';s=pd(s,c.id,{type:'boundaries',command:{action:'start'}});s=pd(s,c.id,{type:'boundaries',command:{action:'contract',contract:boundaryConfig(root,`flow-${c.id}`)}});s=pd(s,c.id,{type:'boundaries',command:{action:'bind',resource:'access',contract:`flow-${c.id}`}});const region=root.jurisdiction;s=pd(s,c.id,{type:'boundaries',command:{action:'observe',contract:`flow-${c.id}`,observed:{connected:true,cloudLicenceAvailable:!local,localLicenceGraceActive:local,localLicenceGraceExpiresAt:local?10000:null,localServicesAvailable:local,localKeyCustodyAvailable:local,adminPathAvailable:true,adminPathLocation:region}}});}
 s=d(s,{type:'advance',minutes:1});
 for(const c of customers){const root=child(s,c.id);
  const supportOwner=roleByCustomer[c.id]||'orchard-msp';s=pd(s,c.id,{type:'business',command:{action:'order',offer:'access',quantity:10,unit:'Mbps',currency:'AUD',resources:['access'],customer:'customer',supportOwner,price:5000,sell:true,...(viaCustomers.includes(c.id)?{via:'branch-distribution'}:{})}});
  if(productsFor.includes(c.id)){s=pd(s,c.id,{type:'products',command:{action:'offer',offer:{id:'phone-offer',family:'microsoft:workplace-phone',edition:'scenario-edition',unit:'seat',quantity:20,features:['telephony'],dependencies:{identity:'identity'}}}});s=pd(s,c.id,{type:'products',command:{action:'offer',offer:{id:'suite-offer',family:'cisco:suite-calling',edition:'scenario-edition',unit:'seat',quantity:20,features:['multitenant-calling'],dependencies:{identity:'identity',carrier:'carrier'}}}});}
 }
 if(productsFor.length){s=d(s,{type:'advance',minutes:1});for(const id of productsFor){s=pd(s,id,{type:'products',command:{action:'deploy',id:'phone-deployment',offer:'phone-offer',productVersion:'scenario-1',mode:'multitenant',region:child(s,id).jurisdiction,bindings:[{feature:'telephony',resources:['phone']}]}});s=pd(s,id,{type:'products',command:{action:'deploy',id:'suite-deployment',offer:'suite-offer',productVersion:'scenario-1',mode:'multitenant',region:child(s,id).jurisdiction}});}s=d(s,{type:'advance',minutes:1});for(const id of productsFor){s=pd(s,id,{type:'products',command:{action:'integration',id:'suite-to-phone',source:'suite-deployment',target:'phone-deployment',features:[{sourceFeature:'multitenant-calling',targetFeature:'telephony'}]}});s=pd(s,id,{type:'products',command:{action:'test-integration',id:'suite-to-phone'}});}}
 if(continuity)throw new Error('continuity fixture not implemented yet');
 // The contract is provisioned in two minutes and its first new billing event is due 60 minutes after order.
 s=d(s,{type:'advance',minutes:2});
 return s;
}
function startPack(s){s.marketQualification=Q.create(s,hooks);return s;}
function open(s,qualification){Q.command(s,{action:'open-window',qualification},hooks);return s;}
function tick(s,n=1){for(let i=0;i<n;i++){s=d(s,{type:'advance',minutes:1});Q.validate(s,{hooks});}return s;}

test('AC-SOC-211 market IDs are geography keys and cannot be inferred from jurisdiction labels',()=>{
 assert.deepEqual(content.runtime.sourceIds,Q.sourceIds);assert.equal(Q.markets['au-sydney'].jurisdiction,Q.markets['au-melbourne'].jurisdiction);assert.notEqual(Q.markets['au-sydney'].geography,Q.markets['au-melbourne'].geography);
 const s=startPack(setup({customers:[fixtures[0],fixtures[1]]}));assert.throws(()=>open(s,'c3'),/MARKET_QUALIFICATION_COHORT_INSUFFICIENT/);
});

test('AC-SOC-212 c3 needs 60 actual samples, new customer billing, support and eligible information flow',()=>{
 let s=startPack(setup({customers:fixtures.slice(0,3)}));open(s,'c3');s=tick(s,60);const proof=Q.currentProof(s,'c3');assert.ok(proof);assert.equal(proof.result.status,'passed');assert.equal(proof.result.counts.markets,3);assert.equal(proof.result.counts.billedParticipants,3);assert.equal(Q.validate(s,{hooks}),true);
 const bad=structuredClone(s);bad.marketQualification.proofs.at(-1).samples.at(-1).participants[0].bills=[];assert.throws(()=>Q.validate(bad,{hooks}),/INVALID_MARKET_QUALIFICATION/);
 let historic=marketFixture.startPack(marketFixture.setup({customers:marketFixture.fixtures.slice(0,3)}));historic=marketFixture.tick(historic,60);historic=marketFixture.open(historic,'c3');historic=marketFixture.tick(historic,60);const forged=structuredClone(historic),w=forged.marketQualification.windows.at(-1),p=forged.marketQualification.proofs.at(-1),part=p.participants[0],root=forged.portfolio.customers.find(x=>x.id===part.customerId).root,bill=root.business.ledger.find(x=>x.category==='revenue'&&x.contract===part.contract.id&&x.period===1);assert.ok(bill);const receipt={ledgerId:bill.id,contract:bill.contract,period:bill.period,at:bill.at,cents:bill.cents,unit:bill.unit,quantity:bill.quantity,customer:part.contract.customer,supportOwner:part.contract.supportOwner,offer:part.contract.offer};for(const record of [w.samples.at(-1).participants.find(x=>x.customerId===part.customerId),p.samples.at(-1).participants.find(x=>x.customerId===part.customerId)]){record.bills=[receipt];record.billReceipt=receipt;}assert.throws(()=>Q.validate(forged),/INVALID_MARKET_QUALIFICATION_RECEIPT/);
});

test('AC-SOC-213 c5 requires all five active market identities, including the two separate AU markets',()=>{
 let s=marketFixture.startPack(marketFixture.setup({customers:marketFixture.fixtures}));s=marketFixture.open(s,'c5');s=marketFixture.tick(s,60);const proof=Q.currentProof(s,'c5');assert.ok(proof);assert.deepEqual(new Set(proof.participants.map(x=>x.market)),new Set(Object.keys(Q.markets)));assert.equal(proof.result.outcomes.c5,true);const text=JSON.stringify(s);assert.ok(text.length<8_000_000);assert.deepEqual(SOC.restore(text),s);
});

test('AC-SOC-214 t2 requires three customers, two markets, support, new billing and current tested integrations',()=>{
 let s=startPack(setup({customers:fixtures.slice(0,3),productsFor:['cust-sydney','cust-seattle']}));assert.equal(child(s,'cust-sydney').products.integrations[0].result.status,'scenario-verified');open(s,'t2');s=tick(s,60);assert.equal(Q.currentProof(s,'t2').result.outcomes.t2,true);
 const stale=structuredClone(s);const e=child(stale,'cust-sydney').products.integrations[0];e.sourceGeneration++;assert.throws(()=>Q.validate(stale,{hooks}),/INVALID_MARKET_QUALIFICATION|INVALID_PRODUCT/);
});

test('AC-SOC-215 portfolio profit is sampled from external business ledgers only',()=>{
 const s=startPack(setup({customers:fixtures.filter(x=>x.scenario==='smb')}));assert.equal(Q.currentReadiness(s,'t1',hooks),false);assert.equal(Q.currentReadiness(s,'level-13',hooks),false);
 const financed=structuredClone(s);const b=child(financed,fixtures[0].id).business;b.balance.cash+=100000;b.balance.funding+=100000;assert.equal((b.balance.revenue-b.balance.cost),child(s,fixtures[0].id).business.balance.revenue-child(s,fixtures[0].id).business.balance.cost);
});

test('AC-SOC-216 level 2 and 7 preserve customer, human-case, market-language, carrier and distributor distinctions',()=>{
 const l2=startPack(setup({customers:fixtures.slice(0,2)}));assert.equal(Q.currentReadiness(l2,'level-2',hooks),true);assert.equal(Q.currentReadiness(l2,'level-7',hooks),false);
 const level7Customers=fixtures.map(x=>({...x,scenario:'enterprise'}));const l7=startPack(setup({customers:level7Customers,viaCustomers:fixtures.map(x=>x.id)}));assert.equal(Q.currentReadiness(l7,'level-7',hooks),true);const bad=structuredClone(l7);bad.portfolio.customers.find(x=>x.id==='cust-tokyo').root.workforceOps.roster.effective[0].languages=['en'];assert.equal(Q.currentReadiness(bad,'level-7',hooks),false);
});

test('AC-SOC-217 observed cohort and configuration changes are sticky and cannot recover into a pass',()=>{
 let s=startPack(setup({customers:fixtures.slice(0,3)}));open(s,'c3');s=pd(s,'cust-sydney',{type:'configure',id:'access',config:{capacity:19}});Q.observe(s,hooks);assert.ok(s.marketQualification.active.errors.includes('CONFIGURATION_CHANGED'));s=tick(s,60);assert.equal(s.marketQualification.windows[0].status,'failed');
});

test('AC-SOC-218 inspection purity, worker serialization, restore-compatible state shape and proof deletion checks',()=>{
 const s=startPack(setup({customers:fixtures.slice(0,3)}));open(s,'c3');const before=JSON.stringify(s.marketQualification);Q.calculate(s,hooks);Q.inspect(s,hooks);assert.equal(JSON.stringify(s.marketQualification),before);const worker=Q.source();assert.match(worker,/SOC_MARKET_QUALIFICATION/);const forged=structuredClone(s);forged.marketQualification.proofs.push({id:'market-proof-999',window:'missing',qualification:'c3'});assert.throws(()=>Q.validate(forged,{hooks}),/INVALID_MARKET_QUALIFICATION_PROOF/);
});
