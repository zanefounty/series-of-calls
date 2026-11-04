const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const T=require('../src/game/42-transport'),H=require('../src/game/37-transport-headroom');
function ready({capacity=1,contract=null}={}){
 const s={clock:0,resources:{identity:{},desk:{},room:{},other:{}},business:contract?{contracts:[contract]}:null};s.transport=T.create(s);
 for(const id of ['office','branch','hub'])T.command(s,{action:'site',id,config:{name:id,region:'AU',domain:id+'-power'}});
 const config={from:'office',to:'branch',mode:'purchased',capacityMbps:capacity,latencyMs:10,domain:'trench-one',leadMinutes:1,setupCents:100,periodCents:30,contract:contract?.id||null};
 T.command(s,{action:'link',id:'first',config});
 for(const [resource,site] of [['identity','office'],['desk','branch'],['room','branch'],['other','hub']])T.command(s,{action:'bind',resource,site});
 s.clock++;T.advance(s);T.validate(s);return s;
}
function load(s,link,count,resource='identity',to='desk',profile='message'){
 for(let i=0;i<count;i++)assert.equal(T.admit(s,`r-${link}-${resource}-${i}`,resource,to,profile).ready,true);
}
const advice=(s,opts={})=>H.recommend(s,{link:'first',triggerBps:8000,targetBps:6000,maxCapacityMbps:100,...opts});

test('AC-SOC-605 exact trigger threshold upgrades from actual reserved Kbps using bounded target capacity',()=>{
 const s=ready();load(s,'first',100);const before=JSON.stringify(s),r=advice(s);
 assert.deepEqual({status:r.status,reason:r.reason,link:r.link,loadKbps:r.loadKbps,current:r.currentCapacityMbps,target:r.targetCapacityMbps},{status:'upgrade',reason:'headroom-required',link:'first',loadKbps:800,current:1,target:2});
 assert.deepEqual(r.config,{...s.transport.links.first.desired,capacityMbps:2});assert.equal(JSON.stringify(s),before);
 const below=ready();load(below,'first',99);assert.equal(advice(below).status,'idle');assert.equal(advice(below).loadKbps,792);
});

test('AC-SOC-606 load counts only reservations traversing the selected link across different paths',()=>{
 const s=ready();T.command(s,{action:'link',id:'elsewhere',config:{...s.transport.links.first.desired,from:'office',to:'hub',domain:'trench-two'}});s.clock++;T.advance(s);
 T.command(s,{action:'bind',resource:'other',site:'hub'});
 for(let i=0;i<5;i++)assert.equal(T.admit(s,`selected-${i}`,'identity','desk','voice').ready,true);
 for(let i=0;i<6;i++)assert.equal(T.admit(s,`other-${i}`,'identity','other','voice').ready,true);
 const before=JSON.stringify(s),r=advice(s);assert.equal(r.loadKbps,800);assert.equal(r.status,'upgrade');assert.equal(JSON.stringify(s),before);
});

test('AC-SOC-607 pending reprovisioning blocks advice and reports effective capacity while desired config is newer',()=>{
 const s=ready();const prior=structuredClone(s.transport.links.first.effective);T.command(s,{action:'link',id:'first',config:{...prior,capacityMbps:4,setupCents:250,leadMinutes:5}});
 load(s,'first',100);const r=advice(s);assert.equal(r.status,'blocked');assert.equal(r.reason,'provisioning-pending');assert.equal(r.currentCapacityMbps,1);assert.equal(r.config,null);assert.equal(s.transport.links.first.effective.capacityMbps,1);
});

test('AC-SOC-608 pure repeated calls do not consume or duplicate reservations',()=>{
 const s=ready();load(s,'first',100);const before=JSON.stringify(s),one=advice(s),two=advice(s);assert.deepEqual(two,one);assert.equal(JSON.stringify(s),before);assert.equal(s.transport.reservations.length,100);
});

test('AC-SOC-609 impossible maximum and unavailable, faulted or lease-incident links are blocked',()=>{
 const s=ready();load(s,'first',100);assert.equal(advice(s,{maxCapacityMbps:1}).reason,'maximum-capacity-exceeded');
 const failed=structuredClone(s);failed.transport.links.first.provisioning.status='failed';assert.equal(advice(failed).reason,'provisioning-failed');
 const unavailable=structuredClone(s);unavailable.transport.links.first.observed.available=false;assert.equal(advice(unavailable).reason,'transport-unavailable');
 const siteUnavailable=structuredClone(s);siteUnavailable.transport.sites.office.observed.available=false;assert.equal(advice(siteUnavailable).reason,'transport-unavailable');
 const domain=structuredClone(s);domain.transport.domains['trench-one']=true;assert.equal(advice(domain).reason,'transport-unavailable');
 const leased=structuredClone(s);leased.transport.leaseRevocations=[{link:'first',status:'active'}];assert.equal(advice(leased).reason,'active-lease-incident');
});

test('AC-SOC-610 contract headroom includes every other desired allocation; owned and standalone links do not need a contract',()=>{
 const c={id:'access-contract',offer:'access',unit:'Mbps',quantity:5,status:'active',reasons:[]},s=ready({contract:c});
 T.command(s,{action:'link',id:'other-contract',config:{...s.transport.links.first.desired,from:'office',to:'hub',capacityMbps:4,domain:'trench-two'}});s.clock++;T.advance(s);load(s,'first',100);
 assert.equal(advice(s).reason,'contract-headroom-unavailable');
 s.business.contracts[0].quantity=6;assert.equal(advice(s).status,'upgrade');
 const owned=ready();owned.transport.links.first.effective.mode='owned';owned.transport.links.first.desired.mode='owned';load(owned,'first',100);assert.equal(advice(owned).status,'upgrade');
});

test('AC-SOC-611 invalid typed or out-of-range limits are rejected without coercion',()=>{
 const s=ready();load(s,'first',100);
 for(const opts of [{triggerBps:'8000'},{triggerBps:80.5},{targetBps:null},{targetBps:8000},{maxCapacityMbps:'100'},{maxCapacityMbps:0},{maxCapacityMbps:100001}])assert.equal(advice(s,opts).reason,'invalid-limits');
});

test('AC-SOC-612 worker source exposes the same pure advisor',()=>{
 const s=ready();load(s,'first',100);const context={};vm.createContext(context);vm.runInContext(H.source()+';globalThis.H=SOC_TRANSPORT_HEADROOM;',context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.H.recommend(structuredClone(s),{link:'first',triggerBps:8000,targetBps:6000,maxCapacityMbps:100}))),advice(s));
});
