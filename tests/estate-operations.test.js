const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const E=require('../src/game/48-estate');
const base=()=>({clock:0,connected:true,records:[{id:'record-one',parents:[],region:'AU',access:['supervisor','auditor'],held:false,deleted:false}],resources:{alice:{id:'alice',estateKind:'user',desired:{enabled:true,entitlement:true},effective:{enabled:true,entitlement:true},generation:1},desk:{id:'desk',estateKind:'device',desired:{firmware:1,platform:'native'},effective:{firmware:1,nativeMeeting:true},generation:1}}});
const hooks={getResource:(s,id)=>s.resources[id],applyResource:(s,id,config,generation)=>{const r=s.resources[id];if(!r||r.generation!==generation)throw Error('STALE_GENERATION');if(r.reject)throw Error('CONFIGURATION_REJECTED');r.desired=structuredClone(config);r.generation++;r.provisioning={status:'pending',generation:r.generation,due:s.clock+1};},nativeMeetingCompatible:()=>true};
const start=()=>{const s=base();s.estate=E.create(s);return s;};
const cmd=(s,c)=>{E.command(s,c,hooks);return s;};
const tick=(s,minutes=1)=>{s.clock+=minutes;E.advance(s,hooks);E.validate(s);return s;};
const connector=(s,config={})=>{cmd(s,{action:'connector',connector:{id:'orchard-sync',actions:['provision','deprovision','firmware','export','backup'],resourceKinds:['user','device','dependency'],version:1,...config}});cmd(s,{action:'recover',connector:'orchard-sync',authenticated:true,delegated:true,reachable:true});tick(s);};
const discover=(s,items=[{sourceKey:'directory-alice',kind:'user',observedId:'a-17',confidence:.7,conflicts:[],unknowns:[]}])=>cmd(s,{action:'discover',items});

test('AC-SOC-059 discovery reconciles idempotently and retains unresolved identity evidence',()=>{
 let s=start();const row={sourceKey:'directory-alice',kind:'user',observedId:'a-17',confidence:.7,conflicts:['duplicate email'],unknowns:['site']};
 cmd(s,{action:'discover',items:[row]});cmd(s,{action:'discover',items:[row]});assert.equal(s.estate.inventory.length,1);assert.equal(s.estate.inventory[0].generation,2);assert.deepEqual(s.estate.inventory[0].conflicts,['duplicate email']);
 assert.throws(()=>cmd(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:true}}]}),/CONNECTOR_UNAVAILABLE/);
 connector(s);assert.throws(()=>cmd(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:true}}]}),/IDENTITY_LINK_REQUIRED/);
 assert.equal(s.resources.alice.generation,1);E.validate(s);
});

test('AC-SOC-060 effective connector scope and observed authority gate exact actions',()=>{
 let s=start();discover(s);cmd(s,{action:'link',sourceKey:'directory-alice',canonicalId:'alice',resource:'alice'});
 connector(s,{actions:['export']});
 assert.throws(()=>cmd(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:true}}]}),/CONNECTOR_CAPABILITY/);
 connector(s,{actions:['provision']});cmd(s,{action:'recover',connector:'orchard-sync',authenticated:false,delegated:true,reachable:true});assert.throws(()=>cmd(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:true}}]}),/CONNECTOR_AUTHORITY/);
 cmd(s,{action:'recover',connector:'orchard-sync',authenticated:true,delegated:true,reachable:false});assert.throws(()=>cmd(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:true}}]}),/CONNECTOR_UNREACHABLE/);
 E.validate(s);
});

test('AC-SOC-061 batch JML can partly fail and retry only the failed item once',()=>{
 let s=start();s.resources.bob=structuredClone(s.resources.alice);s.resources.bob.id='bob';s.resources.bob.reject=true;
 discover(s,[{sourceKey:'directory-alice',kind:'user',observedId:'a-17',confidence:.9,conflicts:[],unknowns:[]},{sourceKey:'directory-bob',kind:'user',observedId:'b-18',confidence:.8,conflicts:[],unknowns:[]}]);
 cmd(s,{action:'link',sourceKey:'directory-alice',canonicalId:'alice',resource:'alice'});cmd(s,{action:'link',sourceKey:'directory-bob',canonicalId:'bob',resource:'bob'});connector(s);
 cmd(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:true,entitlement:true}},{resource:'bob',config:{enabled:true,entitlement:true}}]});tick(s);
 const j=s.estate.jobs[0];assert.equal(j.status,'partial');assert.deepEqual(j.items.map(x=>x.status),['complete','failed']);assert.equal(s.resources.alice.generation,2);
 s.resources.bob.reject=false;cmd(s,{action:'retry',job:j.id});assert.equal(j.status,'complete');assert.equal(j.items[0].appliedGeneration,2);assert.equal(s.resources.alice.generation,2);assert.equal(s.resources.bob.generation,2);E.validate(s);
});

test('AC-SOC-062 stale mover preserves newer state and unsupported leavers stay blocked',()=>{
 let s=start();discover(s);cmd(s,{action:'link',sourceKey:'directory-alice',canonicalId:'alice',resource:'alice'});connector(s);
 cmd(s,{action:'jml',operation:'mover',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false}}]});
 s.resources.alice.generation++;s.resources.alice.desired={...s.resources.alice.desired,entitlement:false};tick(s);const j=s.estate.jobs[0];assert.equal(j.items[0].status,'blocked');assert.equal(j.items[0].reason,'STALE_GENERATION');assert.equal(s.resources.alice.desired.enabled,true);
 assert.throws(()=>cmd(s,{action:'jml',operation:'leaver',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false}}]}),/LEAVER_REVOCATION_INTENT_REQUIRED/);
 cmd(s,{action:'jml',operation:'leaver',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false},revocations:['identity','group-token','number','device']} ]});tick(s);assert.equal(s.estate.jobs[1].items[0].reason,'LEAVER_REVOCATION_UNSUPPORTED');assert.equal(s.resources.alice.desired.enabled,true);E.validate(s);
});

test('AC-SOC-063 device project checks platform support, generation and rollback checkpoint',()=>{
 let s=start();discover(s,[{sourceKey:'device-desk',kind:'device',observedId:'desk-1',confidence:1,conflicts:[],unknowns:[]}]);cmd(s,{action:'link',sourceKey:'device-desk',canonicalId:'desk',resource:'desk'});connector(s);
 cmd(s,{action:'device',connector:'orchard-sync',devices:[{resource:'desk',compatible:true,nativeMeeting:true}],firmware:'firmware-2',maintenanceAt:1});tick(s);
 const p=s.estate.projects[0];assert.equal(p.status,'complete');assert.equal(s.resources.desk.desired.firmware,2);assert.equal(s.resources.desk.effective.nativeMeeting,true);
 cmd(s,{action:'rollback',project:p.id,resource:'desk'});assert.equal(s.resources.desk.desired.firmware,1);
 cmd(s,{action:'device',connector:'orchard-sync',devices:[{resource:'desk',compatible:false,nativeMeeting:true}],firmware:'firmware-3',maintenanceAt:2});tick(s);assert.equal(s.estate.projects[1].items[0].reason,'PLATFORM_INCOMPATIBLE');assert.equal(s.resources.desk.desired.firmware,1);E.validate(s);
});

test('AC-SOC-064 export and backup independently check hold, access, region, administrator, key and local dependencies',()=>{
 let s=start();connector(s);const transfer=(overrides={})=>cmd(s,{action:'transfer',operation:'export',record:'record-one',connector:'orchard-sync',destinationRegion:'AU',administratorRegion:'AU',keyRegion:'AU',localDependency:true,access:['supervisor'],...overrides});
 transfer();const t=s.estate.transfers[0];assert.equal(t.status,'complete');assert.deepEqual(t.metadata.access,['supervisor']);assert.deepEqual(t.lineage.parents,[]);
 transfer({destinationRegion:'US'});assert.ok(s.estate.transfers[1].reasons.includes('DESTINATION_BOUNDARY'));
 transfer({administratorRegion:'JP'});assert.ok(s.estate.transfers[2].reasons.includes('ADMINISTRATOR_BOUNDARY'));
 transfer({keyRegion:'EU'});assert.ok(s.estate.transfers[3].reasons.includes('KEY_CUSTODY_BOUNDARY'));
 transfer({access:['supervisor','root']});assert.ok(s.estate.transfers[4].reasons.includes('ACCESS_NOT_NARROWED'));
 transfer({operation:'backup',destinationRegion:'US'});assert.ok(s.estate.transfers[5].reasons.includes('BACKUP_REGION_MISMATCH'));
 s.records[0].held=true;transfer();assert.ok(s.estate.transfers[6].reasons.includes('RECORD_ON_HOLD'));
 s.records[0].held=false;s.connected=false;transfer({localDependency:false});assert.ok(s.estate.transfers[7].reasons.includes('CONNECTED_DEPENDENCY_UNAVAILABLE'));
 const text=JSON.stringify(s),restored=JSON.parse(text);E.validate(restored);assert.equal(JSON.stringify(restored),text);assert.equal(JSON.stringify(E.inspect(restored)),JSON.stringify(E.inspect(s)));
 const worker={};vm.createContext(worker);vm.runInContext(E.source()+';globalThis.estatePack=SOC_ESTATE;',worker);const workerPack=worker.estatePack;const workerState=structuredClone(s);workerPack.command(workerState,{action:'discover',items:[{sourceKey:'site-main',kind:'site',observedId:'site-9',confidence:1,conflicts:[],unknowns:[]}]},{});cmd(s,{action:'discover',items:[{sourceKey:'site-main',kind:'site',observedId:'site-9',confidence:1,conflicts:[],unknowns:[]}]});assert.equal(JSON.stringify(workerState),JSON.stringify(s));
 assert.equal(JSON.stringify(E.inspect(JSON.parse(text))),JSON.stringify(E.inspect(JSON.parse(text))));
});
