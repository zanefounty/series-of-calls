const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');

const d=(s,type,payload={})=>SOC.dispatch(s,{type,...payload});
const coreDirectory=s=>structuredClone(s.resources.identity.desired);
const removeIdentity=(s,person)=>{const config=coreDirectory(s);config.identities=config.identities.filter(x=>x!==person);config.entitled=config.entitled.filter(x=>x!==person);return config;};
function callingDirectory(person='bea'){
 const tenant='orchard-repairs',number=person==='bea'?'+61255500201':'+61255500101';
 return {tenants:[{id:tenant,name:'Orchard Repairs'}],identities:[{canonical:person,tenant,endpoint:person==='bea'?'desk':'desk',aliases:[],known:true,emergencyEligible:false,site:'workshop',location:'Workshop entry',number,jurisdiction:'AU'}],federation:[],publicReach:[{number,tenant}]};
}
function startCore({channels=false,callingPack=false,workforcePack=false}={}){
 let s=SOC.create();if(channels)s=d(s,'channels',{command:{action:'start'}});if(callingPack)s=d(s,'calling',{command:{action:'start'}});if(workforcePack)s=d(s,'workforce',{command:{action:'start'}});
 s=d(s,'advance',{minutes:2});
 if(callingPack){s=d(s,'calling',{command:{type:'configure',node:'directory',config:callingDirectory()}});s=d(s,'calling',{command:{type:'configure',node:'services',config:{forwarding:[],fallback:[],groups:[{id:'service-team',tenant:'orchard-repairs',members:['bea'],mailbox:null}],mailboxes:[]}}});s=d(s,'advance',{minutes:1});}
 if(workforcePack){s=d(s,'workforce',{command:{action:'roster',operator:'player',people:[{id:'bea',employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:1,entitlements:['seat-01']}]}});s=d(s,'advance',{minutes:1});}
 return s;
}
function estateConnector(s,actions=['deprovision','firmware']){
 s=d(s,'estate',{command:{action:'start'}});
 const discoveries=[{sourceKey:'user-bea',kind:'user',observedId:'directory-bea',confidence:1,conflicts:[],unknowns:[]}];
 if(s.resources.desk.desired.identity==='bea')discoveries.push({sourceKey:'device-desk',kind:'device',observedId:'desk-bea',confidence:1,conflicts:[],unknowns:[]});
 if(s.resources.room.desired.account==='bea')discoveries.push({sourceKey:'device-room',kind:'device',observedId:'room-bea',confidence:1,conflicts:[],unknowns:[]});
 s=d(s,'estate',{command:{action:'discover',items:discoveries}});s=d(s,'estate',{command:{action:'link',sourceKey:'user-bea',canonicalId:'identity',resource:'identity'}});
 if(discoveries.some(x=>x.sourceKey==='device-desk'))s=d(s,'estate',{command:{action:'link',sourceKey:'device-desk',canonicalId:'desk',resource:'desk'}});
 if(discoveries.some(x=>x.sourceKey==='device-room'))s=d(s,'estate',{command:{action:'link',sourceKey:'device-room',canonicalId:'room',resource:'room'}});
 s=d(s,'estate',{command:{action:'connector',connector:{id:'orchard-sync',actions,resourceKinds:['user','device'],version:1,localDependency:true}}});
 s=d(s,'estate',{command:{action:'recover',connector:'orchard-sync',authenticated:true,delegated:true,reachable:true}});s=d(s,'advance',{minutes:1});return s;
}
function leaverCommand(s,person='bea'){
 const items=[{resource:'identity',config:removeIdentity(s,person),revocations:['identity',...(s.calling?['group-token','number']:[])]}];
 if(s.resources.desk.desired.identity===person)items.push({resource:'desk',config:{...s.resources.desk.desired,registered:false},revocations:['device']});
 if(s.resources.room.desired.account===person)items.push({resource:'room',config:{...s.resources.room.desired,enabled:false},revocations:['device']});
 return {action:'jml',operation:'leaver',connector:'orchard-sync',kind:'user',items};
}
function startLeaver(s,person='bea'){s=d(s,'estate',{command:leaverCommand(s,person)});return s;}

test('AC-SOC-115 leaver stages explicit identity, number, group and device revocations while retaining accepted history',()=>{
 let s=startCore({channels:true,callingPack:true,workforcePack:true});
 s=d(s,'configure',{id:'engage',config:{template:'service-outside-window',botResolves:false}});
 s=d(s,'operations',{command:{action:'configure',kind:'workflow',config:{deliveryReceipts:false}}});s=d(s,'advance',{minutes:1});
 for(const channel of SOC.channels.channels)s=d(s,'channels',{command:{action:'observe',channel,authenticated:true,providerAvailable:true,fault:null}});
 s=d(s,'channels',{command:{action:'permission',tenant:'orchard-repairs',person:'bea',channel:'chatterleaf',purpose:'service',granted:true,expiresAt:null}});
 s=d(s,'interact',{channel:'message',from:'bea',to:'service',caseId:'case-bea',account:'chatterleaf',purpose:'service',template:'service-outside-window'});const interaction=s.interactions.at(-1).id;
 s=d(s,'advance',{minutes:1});const job=s.operations.jobs.find(x=>x.interaction===interaction);assert.equal(job.status,'accepted');
 s=estateConnector(s);s=startLeaver(s);s=d(s,'estate',{command:{action:'retry',job:s.estate.jobs[0].id}});
 assert.deepEqual(s.estate.jobs[0].items.map(x=>x.status),['complete','complete','complete']);
 assert.equal(s.resources.identity.desired.identities.includes('bea'),false);assert.equal(s.resources.identity.effective.identities.includes('bea'),true);
 assert.equal(s.calling.nodes.directory.desired.identities.some(x=>x.canonical==='bea'),false);assert.equal(s.calling.nodes.services.desired.groups[0].members.includes('bea'),false);
 assert.equal(s.operations.numbers.find(x=>x.number==='+61255500201').status,'reserved');assert.equal(s.workforceOps.roster.desired.find(x=>x.id==='bea').available,false);
 s=d(s,'advance',{minutes:1});assert.equal(s.resources.identity.effective.entitled.includes('bea'),false);assert.equal(s.resources.desk.effective.registered,false);assert.equal(s.resources.room.effective.enabled,false);assert.equal(s.workforceOps.roster.effective.find(x=>x.id==='bea').available,false);assert.equal(s.calling.nodes.directory.effective.identities.some(x=>x.canonical==='bea'),false);
 s=d(s,'operations',{command:{action:'receipt',job:job.id,eventId:'delivery-receipt-bea',signature:'synthetic-valid'}});
 assert.equal(s.channels.receipts.find(x=>x.interaction===interaction).kind,'delivery');assert.equal(s.cases['case-bea'].identity,'bea');SOC.validateState(SOC.restore(JSON.stringify(s)));
});

test('AC-SOC-116 leaver retries honor connector authority and per-resource generations; active work remains assigned until safe',()=>{
 let s=startCore();s=estateConnector(s,['deprovision']);s=d(s,'estate',{command:leaverCommand(s,'alex')});const id=s.estate.jobs[0].id;
 s=d(s,'estate',{command:{action:'recover',connector:'orchard-sync',authenticated:false,delegated:true,reachable:true}});s=d(s,'advance',{minutes:1});assert.equal(s.estate.jobs[0].items[0].reason,'CONNECTOR_AUTHORITY');assert.equal(s.resources.identity.desired.identities.includes('alex'),true);
 s=d(s,'estate',{command:{action:'recover',connector:'orchard-sync',authenticated:true,delegated:true,reachable:true}});s=d(s,'configure',{id:'identity',config:{...s.resources.identity.desired,region:'AU'}});s=d(s,'advance',{minutes:1});assert.equal(s.estate.jobs[0].items[0].reason,'STALE_GENERATION');assert.equal(s.resources.identity.desired.identities.includes('alex'),true);
 let busy=startCore({workforcePack:true});busy=estateConnector(busy,['deprovision']);busy=d(busy,'interact',{channel:'voice',from:'alex',to:'+61255500201',caseId:'active-work'});busy=d(busy,'advance',{minutes:1});assert.equal(busy.interactions.at(-1).phase,'handling');busy=startLeaver(busy,'bea');const jobId=busy.estate.jobs[0].id;busy=d(busy,'estate',{command:{action:'retry',job:jobId}});assert.equal(busy.estate.jobs[0].items[0].reason,'WORKFORCE_ASSIGNMENT_ACTIVE');assert.equal(busy.resources.identity.desired.identities.includes('bea'),true);
 busy=d(busy,'advance',{minutes:busy.interactions.at(-1).due-busy.clock+busy.resources.people.effective.wrapMinutes});assert.equal(busy.interactions.at(-1).phase,'resolved');busy=d(busy,'estate',{command:{action:'retry',job:jobId}});assert.equal(busy.estate.jobs[0].items[0].status,'complete');assert.equal(busy.workforceOps.assignments[0].status,'complete');
});

test('AC-SOC-117 native room firmware requires current room product binding and observed room prerequisites',()=>{
 let s=startCore();s=d(s,'products',{command:{action:'start'}});s=d(s,'products',{command:{action:'offer',offer:{id:'room-offer',family:'microsoft:meetings-rooms',edition:'scenario-edition',unit:'room',quantity:1,features:['meetings'],dependencies:{identity:'identity'}}}});s=d(s,'advance',{minutes:1});
 s=d(s,'products',{command:{action:'deploy',id:'room-deployment',offer:'room-offer',productVersion:'scenario-1',mode:'room-deployment',region:'AU',bindings:[{feature:'meetings',resources:['room']}]}});s=d(s,'advance',{minutes:1});
 s=estateConnector(s,['firmware']);
 s=d(s,'estate',{command:{action:'device',connector:'orchard-sync',devices:[{resource:'room',compatible:true,nativeMeeting:false}],firmware:'firmware-3',maintenanceAt:s.clock}});s=d(s,'advance',{minutes:1});assert.equal(s.estate.projects[0].items[0].status,'complete');assert.equal(s.resources.room.desired.firmware,3);
 s=d(s,'configure',{id:'room',config:{camera:false}});s=d(s,'advance',{minutes:1});s=d(s,'estate',{command:{action:'device',connector:'orchard-sync',devices:[{resource:'room',compatible:true,nativeMeeting:false}],firmware:'firmware-4',maintenanceAt:s.clock}});s=d(s,'advance',{minutes:1});assert.equal(s.estate.projects[1].items[0].reason,'FIRMWARE_NOT_NATIVE_MODE');assert.equal(s.resources.room.desired.firmware,3);
});

test('AC-SOC-118 leaver and device state survive worker execution and validated save replay',()=>{
 let s=startCore({callingPack:true});s=estateConnector(s);s=startLeaver(s);const before=JSON.stringify(s);SOC.calculate(s);assert.equal(JSON.stringify(s),before);
 const saved=SOC.restore(JSON.stringify(s));assert.deepEqual(saved.estate.jobs,s.estate.jobs);
 const worker={};vm.createContext(worker);vm.runInContext(SOC.workerSource()+';globalThis.SOC_WORKER=SOC;',worker);
 const command={type:'estate',command:{action:'retry',job:s.estate.jobs[0].id}},local=SOC.dispatch(structuredClone(s),command),remote=worker.SOC_WORKER.dispatch(structuredClone(s),command);
 assert.equal(JSON.stringify(remote),JSON.stringify(local));assert.equal(JSON.stringify(SOC.dispatch(saved,command)),JSON.stringify(local));
});
