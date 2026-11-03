const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const C=require('../src/game/50-calling');
const ready=(state)=>C.advance(state,10);
const fixture=()=>{
 const s=C.create();
 const d={tenants:[{id:'orchard-repairs',name:'Orchard Repairs'},{id:'canopy-group',name:'Canopy Group'}],identities:[
  {canonical:'alex',endpoint:'alex-phone',tenant:'orchard-repairs',aliases:['201','front-desk'],number:'+61255500101',known:true,site:'orchard-hq',location:'Synthetic location A',jurisdiction:'AU',emergencyEligible:true},
  {canonical:'bea',endpoint:'bea-phone',tenant:'orchard-repairs',aliases:['202'],number:'+61255500102',known:true,site:'orchard-hq',location:'Synthetic location A',jurisdiction:'AU',emergencyEligible:true},
  {canonical:'cy',endpoint:'cy-phone',tenant:'canopy-group',aliases:['201'],number:'+61255500901',known:true,site:'canopy-hq',location:'Synthetic location B',jurisdiction:'US',emergencyEligible:false}],federation:[],publicReach:[{tenant:'orchard-repairs',number:'+61255500201'}]};
 const sv={forwarding:[],fallback:[],groups:[],mailboxes:[{id:'alex-box',owner:'alex',delegate:'bea',tenant:'orchard-repairs',capacity:1,archiveAvailable:true,created:0,retention:30}]};
 C.configure(s,{node:'directory',config:d});C.configure(s,{node:'services',config:sv});C.configure(s,{node:'media',config:{...C.defaults.media}});C.configure(s,{node:'emergency',config:{jurisdiction:'AU',routes:[],notifications:[]}});ready(s);return s;
};

test('AC-SOC-045 tenant scoped aliases and directed federation do not leak same short extensions',()=>{
 const s=fixture();assert.equal(C.normalise(s,'201','alex').target,'alex');
 assert.equal(C.normalise(s,'cy','alex').code,'FEDERATION_REQUIRED');
 assert.equal(C.normalise(s,'+61255500201','alex').kind,'public');
 const d=structuredClone(s.nodes.directory.desired);d.federation=[{from:'orchard-repairs',to:'canopy-group'}];C.configure(s,{node:'directory',config:d,at:10});C.advance(s,11);
 assert.equal(C.normalise(s,'cy','alex').target,'cy');assert.equal(C.normalise(s,'201','cy').target,'cy');
 assert.deepEqual(C.extensionCandidates(s,'alex').map(x=>x.identity),['alex','bea']);
});
test('AC-SOC-046 forwarding loops stop, while permission denial cannot be bypassed by fallback',()=>{
 const s=fixture(),cfg=structuredClone(s.nodes.services.desired);cfg.forwarding=[{from:'alex',target:'bea',on:'unavailable'},{from:'bea',target:'alex',on:'unavailable'}];
 C.configure(s,{node:'services',config:cfg,at:10});C.advance(s,11);
 assert.equal(C.resolve(s,{from:'alex'},'alex',{'alex-phone':{available:false},'bea-phone':{available:false}}).outcome,'FORWARDING_LOOP');
 const d=structuredClone(s.nodes.directory.desired);d.federation=[];d.identities.find(x=>x.canonical==='bea').tenant='canopy-group';d.tenants.push({id:'civic-grove',name:'Civic'});d.tenants.push({id:'wattle-centre',name:'Wattle'}); // keep the schema complete for the changed tenant
 d.identities.find(x=>x.canonical==='bea').tenant='canopy-group';C.configure(s,{node:'directory',config:d,at:11});C.advance(s,12);
 assert.equal(C.resolve(s,{from:'alex'},'bea',{}).outcome,'FEDERATION_REQUIRED');
});
test('AC-SOC-047 configured fallback runs only for its declared trigger',()=>{
 const s=fixture(),cfg=structuredClone(s.nodes.services.desired);cfg.fallback=[{from:'alex',target:'bea',on:'unavailable'}];C.configure(s,{node:'services',config:cfg,at:10});C.advance(s,11);
 assert.equal(C.resolve(s,{from:'alex'},'alex',{'alex-phone':{available:false}}).target,'bea');
 assert.equal(C.resolve(s,{from:'alex'},'alex',{'alex-phone':{registered:false}}).outcome,'UNREGISTERED');
});
test('AC-SOC-048 reception picks a deterministic available tenant member then mailbox, with owner access',()=>{
 const s=fixture(),cfg=structuredClone(s.nodes.services.desired);cfg.groups=[{id:'reception',tenant:'orchard-repairs',members:['bea','alex'],mailbox:'alex-box'}];C.configure(s,{node:'services',config:cfg,at:10});C.advance(s,11);
 assert.equal(C.reception(s,'reception',{'alex-phone':{available:true},'bea-phone':{available:true}}).identity,'alex');
 assert.equal(C.reception(s,'reception',{'alex-phone':{available:false},'bea-phone':{available:false}}).outcome,'VOICEMAIL');
 const msg=C.voicemail(s,{mailbox:'alex-box',owner:'alex',sourceInteraction:'call-1'});assert.equal(msg.outcome,'STORED');
 assert.equal(C.readVoicemail(s,msg.message,'cy').outcome,'MAILBOX_ACCESS_DENIED');assert.equal(C.readVoicemail(s,msg.message,'bea').outcome,'READ');
});
test('AC-SOC-049 full and unavailable voicemail are distinct from conversation resolution',()=>{
 const s=fixture();assert.equal(C.voicemail(s,{mailbox:'missing',owner:'alex',sourceInteraction:'call-1'}).outcome,'MAILBOX_UNAVAILABLE');
 C.voicemail(s,{mailbox:'alex-box',owner:'alex',sourceInteraction:'call-1'});assert.equal(C.voicemail(s,{mailbox:'alex-box',owner:'alex',sourceInteraction:'call-2'}).outcome,'MAILBOX_FULL');
 const cfg=structuredClone(s.nodes.services.desired);cfg.mailboxes[0].archiveAvailable=false;C.configure(s,{node:'services',config:cfg,at:10});C.advance(s,11);
 assert.equal(C.voicemail(s,{mailbox:'alex-box',owner:'alex',sourceInteraction:'call-3'}).outcome,'ARCHIVE_UNAVAILABLE');
});
test('AC-SOC-050 media failure preserves signalling and reports directional quality dimensions',()=>{
 const s=fixture(),m=C.media(s,{media:{codec:'g729',encrypted:false,natInbound:false,latencyMs:240,jitterMs:44,lossPct:8}});
 assert.equal(m.signalling,true);assert.equal(m.outbound,false);assert.equal(m.inbound,false);assert.equal(m.codecCompatible,false);assert.equal(m.natInbound,false);assert.equal(m.failure,'CODEC_INCOMPATIBLE');
});
test('AC-SOC-051 emergency route requires synthetic intent, eligible location, dependencies and notification',()=>{
 const s=fixture();assert.equal(C.emergency(s,{intent:'ordinary',from:'alex'},{}),null);
 let p=structuredClone(s.nodes.emergency.desired);p.routes=[{id:'au-test',tenant:'orchard-repairs',site:'orchard-hq',carrier:'carrier-a',localDependency:'site-gw',eligible:true}];p.notifications=[{route:'au-test',target:'security-desk'}];C.configure(s,{node:'emergency',config:p,at:10});C.advance(s,11);
 assert.equal(C.emergency(s,{intent:'test-emergency',from:'alex'},{'carrier-a':{available:true},'site-gw':{available:true},'security-desk':{available:true}}).outcome,'TEST_EMERGENCY_ROUTED');
 assert.equal(C.emergency(s,{intent:'test-emergency',from:'cy'},{'carrier-a':{available:true},'site-gw':{available:true},'security-desk':{available:true}}).code,'VALIDATED_LOCATION_REQUIRED');
 assert.equal(C.emergency(s,{intent:'test-emergency',from:'alex'},{'carrier-a':{available:true},'site-gw':{available:true}}).code,'NOTIFICATION_UNAVAILABLE');
 const d=structuredClone(s.nodes.directory.desired);d.identities.find(x=>x.canonical==='alex').jurisdiction='US';C.configure(s,{node:'directory',config:d,at:11});C.advance(s,12);assert.equal(C.emergency(s,{intent:'test-emergency',from:'alex'},{'carrier-a':{available:true},'site-gw':{available:true},'security-desk':{available:true}}).code,'JURISDICTION_MISMATCH');
});
test('AC-SOC-052 failed per-node provisioning preserves effective policy; saves, worker source and inspection are deterministic',()=>{
 const s=fixture(),old=structuredClone(s.nodes.media.effective);const next={...old,maxLatencyMs:90};C.configure(s,{node:'media',config:next,at:11});C.advance(s,12,key=>key!=='media');
 assert.deepEqual(s.nodes.media.effective,old);assert.equal(s.nodes.media.provisioning.status,'failed');assert.equal(C.validate(s),true);
 const before=JSON.stringify(s),fingerprint=C.fingerprint(s);assert.deepEqual(C.inspect(s),C.inspect(s));assert.notEqual(fingerprint,before);assert.equal(C.fingerprint(s),fingerprint);assert.equal(JSON.stringify(s),before);
 const context={};vm.createContext(context);vm.runInContext(C.source()+';globalThis.exportedCalling=SOC_CALLING;',context);assert.equal(context.exportedCalling.PACK,C.PACK);assert.deepEqual(JSON.parse(JSON.stringify(context.exportedCalling.inspect(s))),C.inspect(s));
 const bad=structuredClone(s);bad.nodes.directory.desired.identities.push({});assert.throws(()=>C.validate(bad),/INVALID_CALLING_IDENTITY/);
 assert.throws(()=>C.command(s,{type:'configure',node:'media',config:next,at:12,unexpected:true}),/INVALID_CALLING_COMMAND/);
});
