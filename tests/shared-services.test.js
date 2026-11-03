const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const SS=require('../src/game/35-shared-services');

const people=['alice','bob','charlie','caller','mallory'];
function root(){
 const s={clock:0,nextId:1,interactions:[],resources:{directory:{kind:'directory',effective:{entitled:people.slice(0,4)} }},calling:{nodes:{directory:{effective:{identities:people.map((canonical,n)=>({canonical,tenant:n===4?'tenant-b':'tenant-a',endpoint:`ep-${canonical}`,known:true})),tenants:[{id:'tenant-a',name:'A'},{id:'tenant-b',name:'B'}],federation:[]}}}}};
 for(const person of people.slice(0,4))s.resources[`ep-${person}`]={kind:'endpoint',effective:{directory:'directory',registered:true}};
 s.sharedServices=SS.create(s);return s;
}
function config(overrides={}){return {tenant:'tenant-a',owner:'alice',members:[{person:'alice',permissions:['observe','answer','dnd']},{person:'bob',permissions:['observe','answer','park','retrieve']},{person:'charlie',permissions:['observe']}],capacity:2,parkSlots:1,ringMinutes:1,parkMinutes:2,dnd:false,...overrides};}
function setup(){const s=root();SS.command(s,{action:'configure',id:'sales-line',config:config()});SS.command(s,{action:'observe-line',id:'sales-line',available:true});for(const person of ['alice','bob','charlie'])SS.command(s,{action:'presence',person,state:'available'});s.clock++;SS.advance(s,s.clock);assert.equal(s.sharedServices.lines['sales-line'].provisioning.status,'ready');return s;}
function interaction(s,id='interaction-1',from='caller',tenant='tenant-a'){const i={id,channel:'voice',from,tenant,to:'sales-line',sharedLine:'sales-line',phase:'arrival',trace:[],outcome:null,obligations:[]};s.interactions.push(i);return i;}
const hooks={beforeAction:(s,i,action,actor)=>{i.phase=action==='park'?'parked':'shared-active';i.sharedActor=actor;if(action==='park')i.due=s.clock+s.sharedServices.lines[i.sharedLine].effective.parkMinutes;return true;}};
function ring(s,i,line='sales-line',extra={}){i.phase='ringing';i.to=line;i.sharedLine=line;const result=SS.ringing(s,i,line,extra,extra.hooks||{});if(result.allowed)i.due=result.due;return result;}

test('AC-SOC-201 canonical tenant membership is staged and failed generations preserve prior effective lines',()=>{
 const s=root(),c=config();SS.command(s,{action:'configure',id:'sales-line',config:c});assert.equal(s.sharedServices.lines['sales-line'].effective,null);s.clock++;SS.advance(s,s.clock);assert.equal(s.sharedServices.lines['sales-line'].effective.tenant,'tenant-a');
 const before=JSON.stringify(s.sharedServices.lines['sales-line']);assert.throws(()=>SS.command(s,{action:'configure',id:'sales-line',config:config({members:[...c.members,{person:'mallory',permissions:['answer']}]})}),/SHARED_LINE_MEMBER_IDENTITY_REQUIRED/);assert.equal(JSON.stringify(s.sharedServices.lines['sales-line']),before);
 const fail=setup();SS.command(fail,{action:'configure',id:'sales-line',config:config({capacity:3})});SS.advance(fail,++fail.clock,{endpointReady:(_s,who)=>who.person!=='bob'});const n=fail.sharedServices.lines['sales-line'];assert.equal(n.provisioning.status,'failed');assert.equal(n.effective.capacity,2);assert.equal(n.effectiveGeneration,1);
});

test('AC-SOC-202 member presence and line DND remain independent gates',()=>{
 const s=setup();SS.command(s,{action:'presence',person:'alice',state:'do-not-disturb'});SS.command(s,{action:'presence',person:'bob',state:'available'});const i=interaction(s);assert.deepEqual(ring(s,i).members,['bob']);
 assert.throws(()=>SS.command(s,{action:'dnd',id:'sales-line',actor:'bob',enabled:true}),/SHARED_DND_PERMISSION_DENIED/);
 SS.command(s,{action:'dnd',id:'sales-line',actor:'alice',enabled:true});SS.advance(s,++s.clock);const blocked=interaction(s,'interaction-2');assert.equal(ring(s,blocked).code,'SHARED_LINE_DND');
 SS.command(s,{action:'dnd',id:'sales-line',actor:'alice',enabled:false});SS.advance(s,++s.clock);assert.equal(s.sharedServices.lines['sales-line'].effective.dnd,false);
});

test('AC-SOC-203 ringing and parked calls consume real shared-line occupancy capacity',()=>{
 const s=setup();SS.command(s,{action:'configure',id:'sales-line',config:config({capacity:1})});SS.advance(s,++s.clock);const a=interaction(s),b=interaction(s,'interaction-2');assert.equal(ring(s,a).allowed,true);assert.equal(ring(s,b).code,'SHARED_LINE_CAPACITY');assert.equal(s.sharedServices.occupancy.length,1);
 a.phase='resolved';a.outcome='CONNECTED';assert.equal(SS.release(s,a.id,'terminal'),true);assert.equal(s.sharedServices.occupancy.length,0);SS.validate(s);
});

test('AC-SOC-204 observe, answer, DND, park, and retrieve permissions are evaluated separately',()=>{
 const s=setup(),i=interaction(s);ring(s,i);assert.equal(SS.presence(s,'sales-line','charlie').allowed,true);assert.equal(SS.presence(s,'sales-line','caller').code,'SHARED_PRESENCE_VIEW_DENIED');
 assert.equal(SS.answer(s,i.id,'charlie',{},hooks).code,'SHARED_PICKUP_DENIED');assert.equal(SS.answer(s,i.id,'alice',{},hooks).allowed,true);assert.equal(SS.park(s,i.id,'alice','park-1',{},hooks).code,'SHARED_PARK_DENIED');
});

test('AC-SOC-205 alternate pickup is deterministic, same-tenant, live, and endpoint-aware',()=>{
 const s=setup(),i=interaction(s);assert.deepEqual(ring(s,i).members,['alice','bob']);assert.equal(SS.answer(s,i.id,'bob',{},hooks).allowed,true);assert.equal(s.sharedServices.occupancy[0].actor,'bob');
 const foreign=interaction(s,'interaction-foreign','mallory','tenant-b');assert.equal(ring(s,foreign).code,'SHARED_TENANT_DENIED');
 const unavailable=setup();SS.command(unavailable,{action:'presence',person:'alice',state:'available'});const j=interaction(unavailable);assert.deepEqual(SS.ringing(unavailable,j,'sales-line',{}, {endpointReady:(_s,w)=>w.person!=='alice'}).members,['bob']);
 const stale=interaction(s,'interaction-stale');s.interactions.pop();assert.equal(SS.ringing(s,stale,'sales-line').code,'SHARED_LIVE_INTERACTION_REQUIRED');
});

test('AC-SOC-206 park slots, independent permissions, retrieval, and timeout do not finish calls',()=>{
 const s=setup(),a=interaction(s),b=interaction(s,'interaction-2'),cfg=config();cfg.members[0].permissions.push('park');SS.command(s,{action:'configure',id:'sales-line',config:cfg});SS.advance(s,++s.clock);ring(s,a);ring(s,b);assert.equal(SS.answer(s,a.id,'bob',{},hooks).allowed,true);assert.equal(SS.park(s,a.id,'bob','park-1',{},hooks).allowed,true);assert.equal(SS.answer(s,b.id,'alice',{},hooks).allowed,true);assert.equal(SS.park(s,b.id,'alice','park-1',{},hooks).code,'SHARED_PARK_SLOT_UNAVAILABLE');assert.equal(SS.retrieve(s,a.id,'bob','park-1',{},hooks).allowed,true);assert.equal(a.phase,'shared-active','trusted parent hook advances the real call phase without settling it');
 assert.equal(SS.park(s,a.id,'alice','park-1',{},hooks).code,'SHARED_PARK_DENIED');
 const timeout=setup(),t=interaction(timeout);ring(timeout,t);SS.answer(timeout,t.id,'bob',{},hooks);SS.park(timeout,t.id,'bob','park-1',{},hooks);timeout.clock++;SS.advance(timeout,timeout.clock);timeout.clock++;const result=SS.advance(timeout,timeout.clock);assert.equal(result.expired[0].reason,'PARK_TIMEOUT');assert.equal(t.phase,'parked','the parent owns expiry handling and this module never fabricates call completion');assert.equal(SS.retrieve(timeout,t.id,'bob','park-1',{},hooks).code,'PARK_TIMEOUT');
});

test('AC-SOC-207 reads are pure and failed actions retain state-derived traces only',()=>{
 const s=setup(),i=interaction(s),before=JSON.stringify(s);SS.inspect(s);SS.presence(s,'sales-line','alice');assert.equal(JSON.stringify(s),before);assert.equal(ring(s,i).allowed,true);const occupancy=JSON.stringify(s.sharedServices.occupancy);assert.equal(SS.answer(s,i.id,'charlie',{},hooks).allowed,false);assert.equal(JSON.stringify(s.sharedServices.occupancy),occupancy);assert.ok(s.sharedServices.events.every(e=>e.synthetic));
});

test('AC-SOC-208 worker source, save validation, occupancy lineage, and synthetic source IDs stay exact',()=>{
 const s=setup(),i=interaction(s);ring(s,i);SS.answer(s,i.id,'bob',{},hooks);assert.equal(SS.validate(structuredClone(s)),true);const box={};vm.createContext(box);vm.runInContext(SS.source()+';globalThis.P=SOC_SHARED_SERVICES;',box);assert.equal(JSON.stringify(box.P.inspect(structuredClone(s))),JSON.stringify(SS.inspect(s)));
 const fake=structuredClone(s);fake.sharedServices.occupancy[0].interactionId='interaction-missing';assert.throws(()=>SS.validate(fake),/INVALID_SHARED_OCCUPANCY_SAVE/);const bad=structuredClone(s);bad.sharedServices.occupancy[0].tenant='tenant-b';assert.throws(()=>SS.validate(bad),/INVALID_SHARED_OCCUPANCY_SAVE/);
 const wrongPhase=structuredClone(s);wrongPhase.interactions[0].phase='ringing';assert.throws(()=>SS.validate(wrongPhase),/INVALID_SHARED_OCCUPANCY_SAVE/);const wrongLine=structuredClone(s);wrongLine.interactions[0].sharedLine='other-line';assert.throws(()=>SS.validate(wrongLine),/INVALID_SHARED_OCCUPANCY_SAVE/);
 const ringing=setup(),live=interaction(ringing);ring(ringing,live);const badDeadline=structuredClone(ringing);badDeadline.interactions[0].due++;assert.throws(()=>SS.validate(badDeadline),/INVALID_SHARED_OCCUPANCY_SAVE/);
 const content=JSON.parse(fs.readFileSync(require.resolve('../content/shared-services.json'),'utf8'));assert.deepEqual(content.runtime,{PACK:SS.PACK,VERSION:SS.VERSION,defaults:SS.defaults,rights:SS.rights,presenceStates:SS.presenceStates});assert.deepEqual(content.sourceIds,['uc-new:domain:directory-dialplan','uc-new:domain:signalling','uc-new:domain:identity','uc-new:domain:media','uc-new:domain:continuity','progress.progression-level.10','company-map:player-name:16']);
});

test('retrieved member needs retrieve permission only and an active person cannot take a second call',()=>{
 const s=setup(),c=config({members:[{person:'alice',permissions:['observe','retrieve']},{person:'bob',permissions:['observe','answer','park','retrieve']},{person:'charlie',permissions:['observe']}]});SS.command(s,{action:'configure',id:'sales-line',config:c});SS.advance(s,++s.clock);const a=interaction(s);ring(s,a);assert.equal(SS.answer(s,a.id,'bob',{},hooks).allowed,true);assert.equal(SS.park(s,a.id,'bob','park-1',{},hooks).allowed,true);assert.equal(SS.retrieve(s,a.id,'alice','park-1',{},hooks).allowed,true);assert.equal(SS.validate(s),true);a.phase='resolved';a.outcome='CONNECTED';SS.release(s,a.id,'terminal');
 const c1=interaction(s,'interaction-3'),c2=interaction(s,'interaction-4');ring(s,c1);ring(s,c2);assert.equal(SS.answer(s,c1.id,'bob',{},hooks).allowed,true);assert.equal(SS.answer(s,c2.id,'bob',{},hooks).code,'SHARED_PICKUP_DENIED');
});

test('fingerprints ignore occupancy and historical configuration does not require a live member identity',()=>{
 const s=setup(),i=interaction(s),before=SS.fingerprint(s);ring(s,i);assert.equal(SS.fingerprint(s),before);assert.equal(SS.answer(s,i.id,'bob',{},hooks).allowed,true);assert.equal(SS.fingerprint(s),before);i.phase='resolved';i.outcome='CONNECTED';SS.release(s,i.id,'terminal');
 const leaver=structuredClone(s);for(const cfg of [leaver.sharedServices.lines['sales-line'].desired,leaver.sharedServices.lines['sales-line'].effective])cfg.members[1].person='departed-person';assert.equal(SS.validate(leaver),true);
});
