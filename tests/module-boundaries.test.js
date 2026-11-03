const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/game/48-estate');
const W=require('../src/game/49-workforce');
const C=require('../src/game/50-calling');

const hooks={
 getResource:(s,id)=>s.resources[id]||null,
 applyResource:(s,id,config,generation)=>{const r=s.resources[id];if(!r||r.generation!==generation)throw Error('STALE_GENERATION');r.desired=structuredClone(config);r.generation++;r.provisioning={status:'pending',due:s.clock+1,generation:r.generation};return r;}
};
function estateState(){
 const s={clock:0,connected:true,records:[{id:'record-one',parents:['record-root'],region:'AU',access:['supervisor','auditor'],held:false,deleted:false}],resources:{alice:{id:'alice',estateKind:'user',generation:1,desired:{enabled:true},effective:{enabled:true}},desk:{id:'desk',estateKind:'device',generation:1,desired:{firmware:1},effective:{firmware:1}}}};
 s.estate=E.create(s);return s;
}
function estateCommand(s,c){E.command(s,c,hooks);return s;}
function linkedEstate(){
 const s=estateState();estateCommand(s,{action:'discover',items:[{sourceKey:'directory-alice',kind:'user',observedId:'legacy-17',confidence:.9,conflicts:[],unknowns:[]}]});estateCommand(s,{action:'link',sourceKey:'directory-alice',canonicalId:'alice',resource:'alice'});estateCommand(s,{action:'connector',connector:{id:'orchard-sync',actions:['provision','deprovision','firmware','export','backup'],resourceKinds:['user','device','dependency'],version:1}});estateCommand(s,{action:'recover',connector:'orchard-sync',authenticated:true,delegated:true,reachable:true});s.clock=1;E.advance(s,hooks);return s;
}

test('tampered JML source lineage is rejected on restore validation',()=>{
 const s=linkedEstate();estateCommand(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false}}]});s.estate.jobs[0].items[0].sourceKey='other-source';
 assert.throws(()=>E.validate(s),/INVALID_JML_ITEM_SAVE|IDENTITY_LINK/);
});

test('inventory identity cannot be linked to a resource of a different estate kind',()=>{
 const s=estateState();estateCommand(s,{action:'discover',items:[{sourceKey:'directory-alice',kind:'user',observedId:'legacy-17',confidence:.9,conflicts:[],unknowns:[]}]});
 assert.throws(()=>estateCommand(s,{action:'link',sourceKey:'directory-alice',canonicalId:'alice',resource:'desk'}),/IDENTITY_KIND_MISMATCH|INVALID_IDENTITY_LINK/);
});

test('repeated discovery preserves the reviewed canonical resource link',()=>{
 const s=linkedEstate();estateCommand(s,{action:'discover',items:[{sourceKey:'directory-alice',kind:'user',observedId:'legacy-17',confidence:.95,conflicts:[],unknowns:[]}]});
 assert.equal(s.estate.inventory[0].canonicalId,'alice');assert.equal(s.estate.inventory[0].resourceId,'alice');assert.doesNotThrow(()=>E.validate(s));
});

test('authority revoked after submit blocks background work without aborting simulation advance',()=>{
 const s=linkedEstate();estateCommand(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false}}]});estateCommand(s,{action:'recover',connector:'orchard-sync',authenticated:false,delegated:true,reachable:true});
 assert.doesNotThrow(()=>E.advance(s,hooks));assert.equal(s.estate.jobs[0].items[0].status,'blocked');assert.equal(s.resources.alice.desired.enabled,true);estateCommand(s,{action:'recover',connector:'orchard-sync',authenticated:true,delegated:true,reachable:true});E.advance(s,hooks);assert.equal(s.estate.jobs[0].status,'complete');
});

test('connector fault is independent of desired and effective configuration and recover flags',()=>{
 const s=linkedEstate(),effective=structuredClone(s.estate.connectors[0].effective);estateCommand(s,{action:'fault',connector:'orchard-sync',fault:'OUTAGE'});
 assert.deepEqual(s.estate.connectors[0].effective,effective);assert.equal(s.estate.connectors[0].observed.authenticated,true);assert.throws(()=>estateCommand(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false}}]}),/CONNECTOR_FAULT/);
 estateCommand(s,{action:'recover',connector:'orchard-sync',authenticated:false,delegated:true,reachable:true});assert.equal(s.estate.connectors[0].observed.fault,'OUTAGE');estateCommand(s,{action:'fault',connector:'orchard-sync',fault:null});assert.equal(s.estate.connectors[0].observed.authenticated,false);assert.equal(s.estate.connectors[0].observed.fault,null);
});

test('retry rechecks connector resource-kind scope captured by a pending job',()=>{
 const s=linkedEstate();estateCommand(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false}}]});estateCommand(s,{action:'connector',connector:{id:'orchard-sync',actions:['provision','deprovision'],resourceKinds:['device'],version:2}});
 s.clock=2;E.advance(s,hooks);assert.equal(s.estate.jobs[0].items[0].status,'blocked');assert.equal(s.estate.jobs[0].items[0].reason,'CONNECTOR_CAPABILITY');assert.equal(s.resources.alice.desired.enabled,true);
});

test('failed connector provisioning keeps prior effective capabilities in place',()=>{
 const s=linkedEstate(),old=structuredClone(s.estate.connectors[0].effective);estateCommand(s,{action:'connector',connector:{id:'orchard-sync',actions:['export'],resourceKinds:['dependency'],version:2}});
 estateCommand(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false}}]});s.connected=false;s.clock=2;E.advance(s,hooks);
 assert.equal(s.estate.connectors[0].provisioning.status,'failed');assert.deepEqual(s.estate.connectors[0].effective,old);assert.equal(s.estate.jobs[0].items[0].status,'complete');assert.equal(s.resources.alice.effective.enabled,true);
});

test('estate fingerprint ignores job and transfer progress but tracks control and inventory changes',()=>{
 const s=linkedEstate(),before=E.fingerprint(s);estateCommand(s,{action:'jml',operation:'joiner',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false}}]});assert.equal(E.fingerprint(s),before);E.advance(s,hooks);assert.equal(E.fingerprint(s),before);
 estateCommand(s,{action:'transfer',operation:'export',record:'record-one',connector:'orchard-sync',destinationRegion:'AU',administratorRegion:'AU',keyRegion:'AU',localDependency:true,access:['supervisor']});assert.equal(E.fingerprint(s),before);
 estateCommand(s,{action:'recover',connector:'orchard-sync',authenticated:false,delegated:true,reachable:true});assert.notEqual(E.fingerprint(s),before);const changed=E.fingerprint(s);estateCommand(s,{action:'discover',items:[{sourceKey:'directory-alice',kind:'user',observedId:'legacy-18',confidence:.9,conflicts:[],unknowns:[]}]});assert.notEqual(E.fingerprint(s),changed);
});

test('JML desired configuration may be pending while the old effective configuration stays active',()=>{
 const s=linkedEstate();estateCommand(s,{action:'jml',operation:'mover',connector:'orchard-sync',kind:'user',items:[{resource:'alice',config:{enabled:false}}]});E.advance(s,hooks);
 assert.equal(s.resources.alice.desired.enabled,false);assert.equal(s.resources.alice.effective.enabled,true);assert.equal(s.resources.alice.provisioning.status,'pending');
});

test('firmware cannot claim native meeting compatibility without an explicit compatibility hook',()=>{
 const s=estateState();estateCommand(s,{action:'discover',items:[{sourceKey:'device-desk',kind:'device',observedId:'desk-1',confidence:1,conflicts:[],unknowns:[]}]});estateCommand(s,{action:'link',sourceKey:'device-desk',canonicalId:'desk',resource:'desk'});estateCommand(s,{action:'connector',connector:{id:'orchard-sync',actions:['firmware'],resourceKinds:['device'],version:1}});estateCommand(s,{action:'recover',connector:'orchard-sync',authenticated:true,delegated:true,reachable:true});
 s.clock=1;E.advance(s,hooks);estateCommand(s,{action:'device',connector:'orchard-sync',devices:[{resource:'desk',compatible:true,nativeMeeting:true}],firmware:'firmware-2',maintenanceAt:2});s.clock=2;E.advance(s,hooks);
 assert.equal(s.estate.projects[0].items[0].reason,'NATIVE_MEETING_COMPATIBILITY_UNAVAILABLE');assert.equal(s.resources.desk.desired.firmware,1);
});

test('transfer save validation binds lineage and access metadata to the captured policy',()=>{
 const s=estateState();estateCommand(s,{action:'connector',connector:{id:'orchard-sync',actions:['export','backup'],resourceKinds:['dependency'],version:1}});estateCommand(s,{action:'recover',connector:'orchard-sync',authenticated:true,delegated:true,reachable:true});s.clock=1;E.advance(s,hooks);estateCommand(s,{action:'transfer',operation:'export',record:'record-one',connector:'orchard-sync',destinationRegion:'AU',administratorRegion:'AU',keyRegion:'AU',localDependency:true,access:['supervisor']});
 s.estate.transfers[0].lineage.parents=['unrelated-record'];s.estate.transfers[0].metadata.access=['auditor'];
 assert.throws(()=>E.validate(s),/INVALID_TRANSFER_SAVE|INVALID_TRANSFER_LINEAGE/);
});

function workforceState(){
 const s={clock:1,resources:{people:{desired:{people:1,entitlements:1,skills:['service'],languages:['en'],operator:'player',shiftStart:0,shiftEnd:1440,digitalConcurrency:1,handlingMinutes:10,wrapMinutes:0},effective:{people:1,entitlements:1,skills:['service'],languages:['en'],operator:'player',shiftStart:0,shiftEnd:1440,digitalConcurrency:1,handlingMinutes:10,wrapMinutes:0}}}};
 s.workforceOps=W.create(s);s.workforceOps.roster.effective=structuredClone(s.workforceOps.roster.desired);s.workforceOps.roster.provisioning={status:'ready',due:1,generation:s.workforceOps.roster.generation,errors:[]};return s;
}
function assignment(person='agent-01',entitlement='seat-01',channel='voice'){
 return {id:'assignment-1',interaction:'interaction-1',person,entitlement,channel,status:channel,skill:'service',language:'en',startedAt:1,wrapUntil:null,personSnapshot:{id:person,employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:1,entitlements:[entitlement]}};
}

test('restored workforce assignment cannot invent a person and entitlement snapshot',()=>{
 const s=workforceState();s.workforceOps.assignments.push(assignment('intruder','seat-99'));
 assert.throws(()=>W.validate(s),/INVALID_WORKFORCE_ASSIGNMENT|WORKFORCE_PERSON_MISMATCH/);
});

test('restored assignments cannot exceed one person’s voice or digital concurrency',()=>{
 const s=workforceState();s.workforceOps.roster.effective[0].digitalConcurrency=1;s.workforceOps.assignments.push(assignment('agent-01','seat-01','digital'),{...assignment('agent-01','seat-01','digital'),id:'assignment-2',interaction:'interaction-2'});
 assert.throws(()=>W.validate(s),/WORKFORCE_CONCURRENCY|INVALID_PERSON_CONCURRENCY|INVALID_WORKFORCE_ASSIGNMENT/);
});

test('calling save validation rejects mailbox-message owner and tenant mismatches',()=>{
 const s=C.create(),services=structuredClone(C.defaults.services);services.mailboxes=[{id:'alex-box',owner:'alex',delegate:'bea',tenant:'orchard-repairs',capacity:2,archiveAvailable:true,created:0,retention:30}];
 C.configure(s,{node:'directory',config:{tenants:[{id:'orchard-repairs',name:'Orchard Repairs'}],identities:[{canonical:'alex',endpoint:'alex-phone',tenant:'orchard-repairs',aliases:[],number:'+61255500101',known:true,site:'site-a',location:'Synthetic site',jurisdiction:'AU',emergencyEligible:true}],federation:[],publicReach:[]}});C.configure(s,{node:'services',config:services});
 s.voicemail.push({id:'message-1',mailbox:'alex-box',owner:'bea',tenant:'canopy-group',sourceInteraction:'interaction-1',content:'Synthetic message',created:0,retention:30,readBy:null});
 assert.throws(()=>C.validate(s),/INVALID_CALLING_MESSAGE|INVALID_CALLING_MAILBOX_LINEAGE/);
});

test('calling provisioning keeps prior effective policy until the new generation is ready',()=>{
 const s=C.create(),old=structuredClone(C.defaults.media);C.configure(s,{node:'media',config:old});C.advance(s,1);const effective=structuredClone(s.nodes.media.effective);const next={...old,maxLatencyMs:90};C.configure(s,{node:'media',config:next,at:1});
 assert.deepEqual(s.nodes.media.effective,effective);assert.equal(s.nodes.media.desired.maxLatencyMs,90);assert.equal(s.nodes.media.provisioning.status,'pending');
 const forged=C.create();C.advance(forged,1);forged.nodes.media.effective.maxLatencyMs=1;assert.throws(()=>C.validate(forged),/INVALID_CALLING_SAVE/);
});

test('calling fingerprint tracks policy generations but ignores voicemail and event progress',()=>{
 const s=C.create(),before=C.fingerprint(s);s.voicemail.push({id:'message-1',mailbox:'box-a',owner:'alex',tenant:'orchard-repairs',sourceInteraction:'interaction-1',content:'Synthetic message',created:0,retention:30,readBy:null});s.events.push({code:'MESSAGE_STORED'});assert.equal(C.fingerprint(s),before);
 C.configure(s,{node:'media',config:{...C.defaults.media,maxLatencyMs:90}});assert.notEqual(C.fingerprint(s),before);
});
