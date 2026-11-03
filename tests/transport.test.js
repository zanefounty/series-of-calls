const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const T=require('../src/game/42-transport');
function base(){const s={clock:0,resources:{identity:{},desk:{}},business:null};s.transport=T.create(s);for(const id of ['office','branch','hub'])T.command(s,{action:'site',id,config:{name:id,region:'AU',domain:id+'-power'}});return s;}
function link(s,id,from='office',to='branch',extra={}){T.command(s,{action:'link',id,config:{from,to,mode:'purchased',capacityMbps:1,latencyMs:10,domain:'trench-one',leadMinutes:1,setupCents:100,periodCents:30,contract:null,...extra}});}
function tick(s,n=1){for(let i=0;i<n;i++){s.clock++;T.advance(s);}T.validate(s);}
function connected(){const s=base();link(s,'first');T.command(s,{action:'bind',resource:'identity',site:'office'});T.command(s,{action:'bind',resource:'desk',site:'branch'});tick(s);return s;}
test('AC-SOC-127 purchased and owned construction has effective capacity only after the specified lead time',()=>{
 const s=base();link(s,'owned','office','branch',{mode:'owned',leadMinutes:3});assert.equal(T.path(s,'office','branch',160).ready,false);tick(s,2);assert.equal(s.transport.links.owned.effective,null);tick(s);assert.equal(T.path(s,'office','branch',160).ready,true);assert.equal(s.transport.totalCosts,100);
 const bad=structuredClone(s);bad.transport.links.owned.desired.capacityMbps='seats';assert.throws(()=>T.validate(bad),/INVALID_TRANSPORT_LINK/);
});
test('AC-SOC-128 explicit bidirectional media profiles consume bandwidth independently from sessions and staff',()=>{
 const s=connected();for(let n=0;n<6;n++)assert.equal(T.admit(s,'call-'+n,'identity','desk').ready,true);assert.equal(T.admit(s,'call-seven','identity','desk').reason,'TRANSPORT_PATH_OR_CAPACITY');assert.equal(T.resourcePath(s,'identity','desk','meeting').ready,false);
 T.release(s,'call-0');assert.equal(T.admit(s,'call-seven','identity','desk').ready,true);T.validate(s);assert.equal(T.profiles.voice.kbps,160);assert.equal(s.resources.identity.people,undefined);
});
test('AC-SOC-129 shared domain failures disable parallel paths while an independent route permits recovery',()=>{
 const s=connected();link(s,'parallel');link(s,'via-hub','office','hub',{domain:'trench-two'});link(s,'to-branch','hub','branch',{domain:'trench-three'});tick(s);
 T.admit(s,'call-one','identity','desk');assert.deepEqual(s.transport.reservations[0].edges,['first']);T.command(s,{action:'domain',id:'trench-one',failed:true});tick(s);assert.deepEqual(s.transport.reservations[0].edges,['via-hub','to-branch']);
 T.command(s,{action:'observe',kind:'site',id:'hub',available:true,power:false});tick(s);assert.equal(s.transport.reservations.length,0);assert.equal(T.path(s,'office','branch',160).ready,false);
});
test('optional site power domains are independent and legacy site saves retain their old schema',()=>{
 const s=connected();assert.deepEqual(Object.keys(s.transport.sites.office.desired).sort(),['domain','name','region']);T.validate(s);
 const expanded={name:'office',region:'AU',domain:'office-site',powerDomain:'utility-a',backupPowerDomain:'generator-a'};T.command(s,{action:'site',id:'office',config:expanded});tick(s);T.command(s,{action:'observe',kind:'site',id:'office',available:true,power:true,backupPower:true});T.command(s,{action:'domain',id:'utility-a',failed:true});assert.equal(T.inspect(s).siteStatus.office,true);T.command(s,{action:'domain',id:'generator-a',failed:true});assert.equal(T.inspect(s).siteStatus.office,false);T.command(s,{action:'domain',id:'generator-a',failed:false});assert.equal(T.inspect(s).siteStatus.office,true);assert.equal(T.validate(s),true);
 const unsupported=structuredClone(s);unsupported.transport.sites.office.desired.backupPowerDomain='utility-a';assert.throws(()=>T.validate(unsupported),/INVALID_TRANSPORT_SITE/);
});
test('AC-SOC-130 owned repair consumes a spare and crew once and cannot clear an independent shared-domain fault',()=>{
 const s=base();link(s,'owned','office','branch',{mode:'owned'});tick(s);T.command(s,{action:'observe',kind:'link',id:'owned',available:false,power:true});assert.throws(()=>T.command(s,{action:'repair',link:'owned'}),/RECOVERY_RESOURCE/);
 T.command(s,{action:'stock',quantity:1});T.command(s,{action:'repair',link:'owned'});assert.equal(s.transport.spares,0);assert.throws(()=>T.command(s,{action:'repair',link:'owned'}),/REPAIR_NOT_REQUIRED/);
 T.command(s,{action:'domain',id:'trench-one',failed:true});tick(s,2);assert.equal(s.transport.repairs[0].status,'complete');assert.equal(T.path(s,'office','branch',160).ready,false);T.command(s,{action:'domain',id:'trench-one',failed:false});assert.equal(T.path(s,'office','branch',160).ready,true);
});
test('AC-SOC-131 reconciled external costs and contract-backed access never bill the same lease twice',()=>{
 const s=base();s.business={contracts:[{id:'access-contract',offer:'access',unit:'Mbps',quantity:10,status:'active',reasons:[]}]};link(s,'access','office','branch',{contract:'access-contract',capacityMbps:10});tick(s,60);assert.equal(s.transport.totalCosts,100);assert.equal(s.transport.ledger.filter(l=>l.reason==='transport-period').length,0);
 assert.throws(()=>link(s,'double','office','hub',{contract:'access-contract'}),/TRANSPORT_CONTRACT_CAPACITY/);
 const standalone=connected();tick(standalone,59);assert.equal(standalone.transport.totalCosts,130);T.advance(standalone);assert.equal(standalone.transport.totalCosts,130);
 const before=JSON.stringify(standalone);T.inspect(standalone);T.path(standalone,'office','branch',160);assert.equal(JSON.stringify(standalone),before);
});
test('AC-SOC-132 worker source, saves and corrupted path/cost rejection preserve transport mechanics',()=>{
 const s=connected();T.admit(s,'call-one','identity','desk');const box={};vm.createContext(box);vm.runInContext(T.source()+';globalThis.T=SOC_TRANSPORT;',box);assert.equal(JSON.stringify(box.T.inspect(structuredClone(s))),JSON.stringify(T.inspect(s)));assert.equal(T.validate(JSON.parse(JSON.stringify(s))),true);
 const bad=structuredClone(s);bad.transport.reservations[0].edges=[];assert.throws(()=>T.validate(bad),/INVALID_TRANSPORT_PATH/);const cost=structuredClone(s);cost.transport.totalCosts++;assert.throws(()=>T.validate(cost),/UNRECONCILED_TRANSPORT/);
});
