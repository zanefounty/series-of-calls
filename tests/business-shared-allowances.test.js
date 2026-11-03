const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/game/55-communications'),B=E.business;
const dispatch=(s,command)=>E.dispatch(s,{type:'business',command});
const advance=(s,minutes)=>E.dispatch(s,{type:'advance',minutes});
function setup(){let s=E.dispatch(E.create({scenario:'enterprise',jurisdiction:'AU'}),{type:'add',id:'phone-two',kind:'uc'});s=dispatch(s,{action:'start'});s=dispatch(s,{action:'allowancePool',id:'voice-bundle',customer:'customer',owner:'orchard-msp',currency:'AUD',unit:'minute',periodMinutes:60,allowance:8});return s;}
function order(s,offer,pool='voice-bundle',resource='phone'){ const p=B.offers[offer];return {action:'order',offer,quantity:p.minimum,unit:p.unit,currency:'AUD',resources:[resource],sell:true,allowancePool:pool};}
test('AC-SOC-374 shared contract allowance is consumed once across eligible contracts and wholesale usage remains charged',()=>{
 let s=setup();s=dispatch(s,order(s,'workplace'));s=dispatch(s,order(s,'workplace','voice-bundle','phone-two'));s=advance(s,2);s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});assert.deepEqual(s.business.allowancePools[0].status,'active');
 const [a,b]=s.business.contracts;B.meter(s,'minute',5,a.id);B.meter(s,'minute',5,b.id);const until=a.nextBill-s.clock;s=advance(s,until);
 const retail=s.business.ledger.filter(x=>x.reason!=='wholesale'&&x.period!==undefined&&x.contract);assert.equal(retail.length,2);assert.equal(retail.reduce((n,x)=>n+x.overage,0),2);
 const wholesale=s.business.ledger.filter(x=>x.reason==='wholesale');assert.equal(wholesale.length,2);assert.equal(wholesale.reduce((n,x)=>n+x.usage,0),10);assert.ok(wholesale.every(x=>x.cents>0));
 const saved=E.restore(JSON.stringify(s));assert.deepEqual(saved,s);
});
test('AC-SOC-375 shared pool rejects incompatible dimensions, customers, and unauthorized owners without mutation',()=>{
 let s=setup();const before=JSON.stringify(s);
 assert.throws(()=>dispatch(s,order(s,'messaging')),/ALLOWANCE_POOL_SCOPE_MISMATCH/);
 assert.throws(()=>dispatch(s,{action:'allowancePool',id:'bad-customer',customer:'grove-vendor',owner:'orchard-msp',currency:'AUD',unit:'minute',periodMinutes:60,allowance:4}),/INVALID_ALLOWANCE_POOL/);
 assert.throws(()=>dispatch(s,{action:'allowancePool',id:'bad-owner',customer:'customer',owner:'grove-vendor',currency:'AUD',unit:'minute',periodMinutes:60,allowance:4}),/INVALID_ALLOWANCE_POOL/);
 assert.equal(JSON.stringify(s),before);
});
test('AC-SOC-376 resource-priority metering selects one matching contract and overlapping contract assignments are rejected',()=>{
 let s=setup();s=dispatch(s,order(s,'workplace'));s=dispatch(s,order(s,'workplace','voice-bundle','phone-two'));s=advance(s,2);const [a,b]=s.business.contracts;
 B.meterResource(s,'minute',3,['phone-two']);assert.equal(a.usage,0);assert.equal(b.usage,3);
 const before=JSON.stringify(s);B.meterResource(s,'minute',7,['room']);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>dispatch(s,order(s,'workplace')),/OVERLAPPING_USAGE_CONTRACT/);assert.equal(JSON.stringify(s),before);
 B.meterResource(s,'minute',2,['phone','phone-two']);assert.equal(a.usage,2,'the earliest matching resource gets deterministic priority');assert.equal(b.usage,3);assert.equal(JSON.stringify(s)===before,false);
 const malformed=structuredClone(s);malformed.business.contracts[1].resources=['phone'];assert.throws(()=>E.restore(JSON.stringify(malformed)),/INVALID_SAVED_USAGE_CONTRACT_OVERLAP/);
 const legacy=structuredClone(s);B.meter(legacy,'minute',2);assert.equal(legacy.business.contracts[0].usage,a.usage+2,'no-context meter retains first matching contract behavior');
});
test('AC-SOC-377 mid-period amendment keeps the old effective pool until the next billing boundary',()=>{
 let s=setup();s=dispatch(s,order(s,'workplace'));s=advance(s,2);s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});const c=s.business.contracts[0];B.meter(s,'minute',5,c.id);s=dispatch(s,{action:'amendAllowancePool',pool:'voice-bundle',allowance:12});assert.equal(s.business.allowancePools[0].allowance,8);assert.equal(s.business.allowancePools[0].effectiveAllowance,8);assert.equal(s.business.allowancePools[0].status,'provisioning');
 const oldRemaining=s.business.allowancePools[0].remaining;B.meter(s,'minute',2,c.id);assert.equal(s.business.allowancePools[0].remaining,oldRemaining-2);s=advance(s,60);assert.equal(s.clock,62);assert.equal(s.business.allowancePools[0].status,'active');assert.equal(s.business.allowancePools[0].allowance,12);assert.ok(s.business.allowancePools[0].remaining+s.business.allowancePools[0].consumed<=12);assert.equal(s.business.allowancePools[0].remaining+s.business.allowancePools[0].consumed,12);
});
test('AC-SOC-378 saved shared consumption rejects allowance counter tampering and canceled contracts cannot consume late usage',()=>{
 let s=setup();s=dispatch(s,order(s,'workplace'));s=advance(s,2);s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});const c=s.business.contracts[0];B.meter(s,'minute',5,c.id);
 for(const mutate of [x=>x.business.allowancePools[0].remaining=8,x=>x.business.contracts[0].sharedIncluded=0,x=>{x.business.allowancePools[0].remaining=8;x.business.allowancePools[0].consumed=0;}]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>E.restore(JSON.stringify(bad)),/INVALID_SAVED_ALLOWANCE_USAGE|INVALID_SAVED_ALLOWANCE_POOL/);}
 s=dispatch(s,{action:'cancel',contract:c.id});const usage=s.business.contracts[0].usage;B.meter(s,'minute',7,c.id);assert.equal(s.business.contracts[0].usage,usage);assert.equal(s.business.allowancePools[0].consumed,5);
});
test('AC-SOC-379 new pool amendment before first activation is included in its initial provisioning',()=>{
 let s=setup();s=dispatch(s,{action:'amendAllowancePool',pool:'voice-bundle',allowance:12});assert.equal(s.business.allowancePools[0].effectiveAllowance,8);s=advance(s,2);assert.equal(s.business.allowancePools[0].allowance,12);assert.equal(s.business.allowancePools[0].effectiveAllowance,12);assert.equal(s.business.allowancePools[0].status,'active');
});

test('AC-SOC-380 legacy validation is pure; explicit migration normalizes only omitted pool fields',()=>{
 let s=dispatch(setup(),order(setup(),'workplace'));const legacy=structuredClone(s);delete legacy.business.allowancePools;for(const c of legacy.business.contracts){delete c.allowancePool;delete c.sharedIncluded;}
 const before=JSON.stringify(legacy);B.validate(legacy);assert.equal(JSON.stringify(legacy),before);
 const malformed=structuredClone(legacy);malformed.business.contracts[0].sharedIncluded='0';const malformedBefore=JSON.stringify(malformed);assert.throws(()=>B.validate(malformed),/INVALID_SAVED_CONTRACT/);assert.equal(JSON.stringify(malformed),malformedBefore);
 const migrated=structuredClone(legacy);assert.equal(B.migrateLegacy(migrated),migrated);assert.deepEqual(migrated.business.allowancePools,[]);assert.equal(migrated.business.contracts[0].allowancePool,null);assert.equal(migrated.business.contracts[0].sharedIncluded,0);assert.equal(JSON.stringify(legacy),before);
});
test('AC-SOC-381 rejected SOC business commands leave a legacy save byte-for-byte unchanged',()=>{
 let s=dispatch(setup(),order(setup(),'workplace'));delete s.business.allowancePools;for(const c of s.business.contracts){delete c.allowancePool;delete c.sharedIncluded;}const before=JSON.stringify(s);
 assert.throws(()=>E.dispatch(s,{type:'business',command:{action:'unknown'}}),/INVALID_BUSINESS_COMMAND/);assert.equal(JSON.stringify(s),before);
});
