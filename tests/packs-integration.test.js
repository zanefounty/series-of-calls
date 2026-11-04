const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications');
const dispatch=(s,c)=>E.dispatch(s,c),advance=(s,minutes=1)=>dispatch(s,{type:'advance',minutes}),pack=(s,type,command)=>dispatch(s,{type,command});
const completeVoice=s=>{const i=s.interactions.at(-1);return i?.phase==='connected'?advance(s,i.durationMinutes):s;};
const ready=()=>advance(E.create(),1);
const agent=(id,seat,skills=['service'],languages=['en'])=>({id,employer:'orchard-msp',skills,languages,shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:1,entitlements:[seat]});

test('AC-SOC-065 optional packs start on validated dispatch and absent packs preserve old saves',()=>{
 const old=ready(),before=JSON.stringify(old),receipt=E.restore(before);assert.deepEqual(receipt,old);assert.equal(old.calling,undefined);assert.equal(old.estate,undefined);assert.equal(old.workforceOps,undefined);
 let s=pack(old,'calling',{action:'start'});s=pack(s,'estate',{action:'start'});s=pack(s,'workforce',{action:'start'});
 assert.equal(s.calling.pack,E.calling.PACK);assert.equal(s.estate.pack,'soc-estate-1');assert.equal(s.workforceOps.pack,'soc-workforce-1');
 assert.throws(()=>pack(s,'workforce',{action:'start'}),/WORKFORCE_ALREADY_STARTED/);assert.equal(JSON.stringify(old),before);
});

test('AC-SOC-066 per-person queue assignment uses same-person skills, language and licensed-seat cap',()=>{
 let s=E.create();s=dispatch(s,{type:'configure',id:'people',config:{people:2,entitlements:1,digitalConcurrency:1}});s=pack(s,'workforce',{action:'start'});
 s=pack(s,'workforce',{action:'roster',people:[agent('agent-a','seat-01',['service'],['en']),agent('agent-b','seat-02',['service'],['en'])]});s=advance(s,1);
 s=dispatch(s,{type:'interact',channel:'message',from:'alex',to:'service',caseId:'one',language:'en'});s=dispatch(s,{type:'interact',channel:'message',from:'alex',to:'service',caseId:'two',language:'en'});s=advance(s,1);
 assert.equal(s.interactions[0].phase,'handling');assert.equal(s.interactions[0].agent,'agent-a');assert.equal(s.interactions[1].phase,'queued','second named core entitlement does not create a phantom seat');
 assert.equal(s.workforceOps.assignments.filter(a=>['voice','digital','wrap'].includes(a.status)).length,1);
 let aggregate=E.create();aggregate=dispatch(aggregate,{type:'configure',id:'people',config:{people:2,entitlements:2,skills:['service','billing'],languages:['en','ja']}});aggregate=pack(aggregate,'workforce',{action:'start'});
 aggregate=pack(aggregate,'workforce',{action:'roster',people:[agent('agent-a','seat-01',['service'],['ja']),agent('agent-b','seat-02',['billing'],['en'])]});aggregate=pack(aggregate,'business',{action:'start'});aggregate=advance(aggregate,60);
 assert.ok(aggregate.business.metrics.offered>0);assert.equal(aggregate.business.metrics.handled,0,'aggregate campaign demand uses the same person-level skill/language snapshot');
 assert.deepEqual(aggregate.resources.people.effective.skills,['service','billing']);
});

test('AC-SOC-067 workforce warm transfer reserves a different person and retains source wrap',()=>{
 let s=E.create();s=dispatch(s,{type:'configure',id:'people',config:{people:2,entitlements:2,digitalConcurrency:1}});s=dispatch(s,{type:'add',id:'other-queue',kind:'queue'});
 s=pack(s,'workforce',{action:'start'});s=pack(s,'workforce',{action:'roster',people:[agent('agent-a','seat-01'),agent('agent-b','seat-02')]});s=pack(s,'contact',{action:'start'});s=advance(s,1);
 s=dispatch(s,{type:'interact',channel:'message',from:'alex',to:'service',caseId:'warm-case',language:'en'});s=advance(s,1);const i=s.interactions[0];assert.equal(i.phase,'handling');assert.equal(i.agent,'agent-a');
 s=pack(s,'contact',{action:'transfer',interaction:i.id,target:'other-queue',mode:'warm'});
 const moved=s.interactions[0],assignments=s.workforceOps.assignments.filter(a=>['voice','digital','wrap'].includes(a.status));
 assert.equal(moved.agent,'agent-b');assert.equal(moved.destination,'other-queue');assert.equal(moved.phase,'handling');assert.equal(assignments.length,2);
 assert.ok(assignments.some(a=>a.person==='agent-a'&&a.status==='wrap'));assert.ok(assignments.some(a=>a.person==='agent-b'&&a.status==='digital'));
});

test('AC-SOC-068 calling resolves tenants and forwarding, reports directional media and synthetic emergency outcome',()=>{
 let s=E.create();s=pack(s,'operations',{action:'start'});s=dispatch(s,{type:'add',id:'desk2',kind:'endpoint',config:{identity:'bea',extension:'202',scope:'tenant',number:'+61255500202',registered:true,firmware:2,local:true,region:'AU'}});
 s=pack(s,'calling',{action:'start'});
 const directory={tenants:[{id:'orchard-repairs',name:'Orchard Repairs'},{id:'canopy-group',name:'Canopy Group'}],identities:[
  {canonical:'alex',tenant:'orchard-repairs',endpoint:'desk',aliases:['101'],number:'+61255500101',known:true,site:'main',location:'Synthetic site one',jurisdiction:'AU',emergencyEligible:true},
  {canonical:'bea',tenant:'orchard-repairs',endpoint:'desk2',aliases:['202'],number:'+61255500202',known:true,site:'main',location:'Synthetic site one',jurisdiction:'AU',emergencyEligible:false},
  {canonical:'casey',tenant:'canopy-group',endpoint:'desk2',aliases:['303'],number:'+61255500303',known:true,site:'remote',location:'Synthetic site two',jurisdiction:'AU',emergencyEligible:false}],federation:[],publicReach:[{number:'+61255500202',tenant:'orchard-repairs'}]};
 const services={forwarding:[{from:'bea',on:'unavailable',target:'alex'}],fallback:[],groups:[{id:'reception',tenant:'orchard-repairs',members:['bea'],mailbox:'mailbox-one'}],mailboxes:[{id:'mailbox-one',owner:'alex',delegate:null,tenant:'orchard-repairs',capacity:2,created:0,retention:30,archiveAvailable:true}]};
 const media={...E.calling.defaults.media,encryptionRequired:false};
 const emergency={jurisdiction:'AU',routes:[{id:'route-one',tenant:'orchard-repairs',site:'main',carrier:'carrier',localDependency:'local',eligible:true}],notifications:[{route:'route-one',target:'phone'}]};
 for(const [node,config] of Object.entries({directory,services,media,emergency}))s=pack(s,'calling',{type:'configure',node,config});s=advance(s,1);
 s=dispatch(s,{type:'fault',id:'desk2',fault:'OUTAGE'});
 s=completeVoice(dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'bea',caseId:'forward-case'}));assert.equal(s.interactions.at(-1).outcome,'CONNECTED');assert.ok(s.interactions.at(-1).trace.some(x=>x.code==='FORWARDED'));
 s=completeVoice(dispatch(s,{type:'interact',channel:'voice',from:'101',to:'202',caseId:'alias-entitlement-case'}));assert.equal(s.interactions.at(-1).outcome,'CONNECTED');
 const identityConfig=structuredClone(s.resources.identity.desired);identityConfig.entitled=identityConfig.entitled.filter(x=>x!=='alex');s=dispatch(s,{type:'configure',id:'identity',config:identityConfig});s=advance(s,1);
 s=dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'bea',caseId:'unentitled-caller-case'});assert.equal(s.interactions.at(-1).outcome,'IDENTITY_OR_ENTITLEMENT');
 identityConfig.entitled.push('alex');s=dispatch(s,{type:'configure',id:'identity',config:identityConfig});s=advance(s,1);
 const serviceConfig=structuredClone(s.calling.nodes.services.desired);serviceConfig.groups.push({id:'canopy-reception',tenant:'canopy-group',members:['casey'],mailbox:'casey-box'});serviceConfig.mailboxes.push({id:'casey-box',owner:'casey',delegate:null,tenant:'canopy-group',capacity:2,created:s.clock,retention:30,archiveAvailable:true});s=pack(s,'calling',{type:'configure',node:'services',config:serviceConfig});s=advance(s,1);
 const messagesBefore=s.calling.voicemail.length;s=dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'canopy-reception',caseId:'cross-tenant-group-case'});assert.equal(s.interactions.at(-1).outcome,'FEDERATION_REQUIRED');assert.equal(s.calling.voicemail.length,messagesBefore);
 s=dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'casey',caseId:'direct-federation-required'});assert.equal(s.interactions.at(-1).outcome,'FEDERATION_REQUIRED');
 const directoryConfig=structuredClone(s.calling.nodes.directory.desired);directoryConfig.federation.push({from:'orchard-repairs',to:'canopy-group'});s=pack(s,'calling',{type:'configure',node:'directory',config:directoryConfig});s=advance(s,1);
 s=dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'canopy-reception',caseId:'federated-group-case'});assert.equal(s.interactions.at(-1).outcome,'VOICEMAIL_STORED');assert.equal(s.calling.voicemail.length,messagesBefore+1);
 s=dispatch(s,{type:'fault',id:'carrier',fault:'OUTAGE'});s=completeVoice(dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'bea',caseId:'internal-carrier-independent'}));assert.equal(s.interactions.at(-1).outcome,'CONNECTED');
 assert.throws(()=>dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'bea',caseId:'media-path-policy',media:{out:true,in:true}}),/INVALID_INTERACTION/);
 s=dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'bea',caseId:'quality-case',media:{jitterMs:40}});assert.equal(s.interactions.at(-1).outcome,'CALLING_MEDIA_JITTER_THRESHOLD');assert.equal(s.interactions.at(-1).callingMedia.outbound,false);
 s=dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'reception',caseId:'voicemail-case'});assert.equal(s.interactions.at(-1).phase,'failed');assert.equal(s.interactions.at(-1).outcome,'VOICEMAIL_STORED');assert.equal(s.calling.voicemail.filter(x=>x.mailbox==='mailbox-one').length,1);
 s=dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'casey',caseId:'federation-case'});assert.equal(s.interactions.at(-1).outcome,'UNAVAILABLE');
 s=dispatch(s,{type:'fault',id:'carrier',fault:null});s=dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'synthetic-test',caseId:'emergency-case',intent:'test-emergency'});assert.equal(s.interactions.at(-1).outcome,'TEST_EMERGENCY_ROUTED');assert.equal(s.interactions.at(-1).emergency.synthetic,true);
 assert.throws(()=>dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'x',caseId:'invalid-intent',intent:'911'}),/INVALID_INTERACTION/);
});

test('AC-SOC-069 estate changes use central generation/config hooks; unsupported leaver fields remain rejected',()=>{
 let s=ready();s=pack(s,'estate',{action:'start'});s=pack(s,'estate',{action:'connector',connector:{id:'orchard-connector',actions:['provision','deprovision'],resourceKinds:['user'],version:1,localDependency:true}});s=pack(s,'estate',{action:'recover',connector:'orchard-connector',authenticated:true,delegated:true,reachable:true});s=advance(s,1);
 s=pack(s,'estate',{action:'discover',items:[{sourceKey:'source-alex',kind:'user',observedId:'directory-alex',confidence:0.9,conflicts:[],unknowns:[]}]});s=pack(s,'estate',{action:'link',sourceKey:'source-alex',canonicalId:'identity',resource:'identity'});
 const config=structuredClone(s.resources.identity.desired),generation=s.resources.identity.generation;
 s=pack(s,'estate',{action:'jml',operation:'joiner',kind:'user',connector:'orchard-connector',items:[{resource:'identity',config}]});s=advance(s,1);
 assert.equal(s.resources.identity.generation,generation+1);assert.equal(s.resources.identity.provisioning.status,'pending');assert.equal(s.estate.jobs[0].status,'complete');
 const priorIdentity=structuredClone(s.resources.identity.desired);s=pack(s,'estate',{action:'jml',operation:'leaver',kind:'user',connector:'orchard-connector',items:[{resource:'identity',revocations:['identity'],config:{enabled:false,entitlement:false,numberAccess:false,deviceAccess:false}}]});s=advance(s,1);
 assert.equal(s.estate.jobs[1].status,'failed');assert.equal(s.estate.jobs[1].items[0].reason,'LEAVER_IDENTITY_CONFIG_REQUIRED');assert.deepEqual(s.estate.jobs[1].items[0].config,{enabled:false,entitlement:false,numberAccess:false,deviceAccess:false});assert.deepEqual(s.resources.identity.desired,priorIdentity);
});

test('AC-SOC-070 combined packs validate, inspect purely, restore, and serialize to the same worker result',()=>{
 let s=ready();s=pack(s,'estate',{action:'start'});s=pack(s,'workforce',{action:'start'});s=pack(s,'calling',{action:'start'});
 const before=JSON.stringify(s);E.calculate(s);E.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(E.restore(before),s);
 const command={type:'advance',minutes:2};let result;const ctx={postMessage:r=>result=r};vm.createContext(ctx);vm.runInContext(E.workerSource(),ctx);ctx.onmessage({data:{id:70,state:s,command}});
 assert.deepEqual(JSON.parse(JSON.stringify(result.state)),dispatch(s,command));
 for(const [mutate,code] of [[x=>delete x.calling.nodes.media,'INVALID_CALLING_SAVE'],[x=>x.estate.pack='bad','INVALID_ESTATE_SAVE'],[x=>{x.workforceOps.roster.desired.push(agent('bad-agent','seat-01'));x.workforceOps.roster.desired.at(-1).digitalConcurrency=0;},'INVALID_WORKFORCE_PERSON']]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>E.restore(JSON.stringify(bad)),new RegExp(code));}
});
