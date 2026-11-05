'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Worker}=require('node:worker_threads');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer',child=s=>s.portfolio.customers.find(c=>c.id===customerId).root,project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,command,blockers:q.blockers}));return send(s,{...command,quoteRevision:q.atRevision});}
const op=(s,operationId)=>buy(s,{action:'operation',operationId,customerId});
function minute(s){const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status));if(incident&&!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});const q=SOC.provider.quote(s,{action:'operation',operationId:'repair',customerId});if(!q.blockers.length)s=buy(s,q.request);else assert.ok(q.blockers.every(b=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(b)));}for(const c of s.providerCampaign.customers.filter(c=>c.status==='renewal'))s=send(s,{action:'renew',customerId:c.id});return SOC.dispatch(s,{type:'advance',minutes:1});}
function until(s,predicate,limit=150){for(let n=0;n<limit&&!predicate(s);n++)s=minute(s);assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
function opening(migrate=true){let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73,market:'au-sydney'});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=until(s,x=>x.providerCampaign.customers[0].status==='active',30);s=op(s,'room');s=op(s,'recording');s=until(s,x=>['room','recording'].every(id=>project(x,id)?.status==='complete'),30);s=op(s,'bpo');s=until(s,x=>project(x,'bpo')?.status==='complete',30);if(!migrate)return s;s=op(s,'migration');return until(s,x=>project(x,'migration')?.status==='complete',60);}
async function worker(state,command){return new Promise((resolve,reject)=>{const w=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.postMessage=x=>parentPort.postMessage(x);${SOC.workerSource()};parentPort.on('message',data=>globalThis.onmessage({data}));`,{eval:true});const timer=setTimeout(()=>{w.terminate();reject(Error('WORKER_TIMEOUT'));},30000);w.once('error',error=>{clearTimeout(timer);w.terminate();reject(error);});w.once('message',reply=>{clearTimeout(timer);w.terminate();resolve(reply);});w.postMessage({id:'external-reach-parity',state,command});});}

test('external collaboration rejects unknown campaign versions and valid originals restore without added historical evidence',()=>{
 const fresh=SOC.create({experience:'campaign',scenario:'enterprise',seed:73});assert.equal(fresh.providerCampaign.externalCollaborationVersion,1);const original=opening();assert.equal(child(original).providerCustomer.externalCollaborationVersion,1);assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
 for(const version of [null,0,2,'1']){const bad=structuredClone(original);bad.providerCampaign.externalCollaborationVersion=version;assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_EXTERNAL/);} const mismatched=structuredClone(original);delete child(mismatched).providerCustomer.externalCollaborationVersion;assert.throws(()=>SOC.restore(JSON.stringify(mismatched)),/INVALID_PROVIDER_EXTERNAL/);
});

test('a paid pending external reach bundle continues equally through restore and a real worker',async()=>{
 const pending=op(opening(),'direct-external-reach'),command={type:'advance',minutes:1},original=JSON.stringify(pending),expected=SOC.dispatch(pending,command);assert.deepEqual(SOC.dispatch(SOC.restore(original),command),expected);const reply=await worker(pending,command);assert.equal(reply.error,undefined);assert.deepEqual(reply.state,JSON.parse(JSON.stringify(expected)));assert.equal(JSON.stringify(pending),original);
});

test('a completed external collaboration save rejects invented guest duration, identity and generation',()=>{
 const original=until(opening(),s=>child(s).information.meetingSessions.some(m=>m.status==='completed'&&m.externalGuest));assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
 for(const [label,mutate] of [['duration',g=>{g.observedMinutes+=1;}],['same-tenant guest',g=>{g.guestTenant=g.hostTenant;}],['invented guest',g=>{g.guestId='invented-guest';}],['platform generation',g=>{g.platformGeneration+=1;}]]){const bad=structuredClone(original),session=child(bad).information.meetingSessions.find(m=>m.status==='completed'&&m.externalGuest);mutate(session.externalGuest);assert.throws(()=>SOC.restore(JSON.stringify(bad)),undefined,label);}
 assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
});

for(const kind of ['alias','international permission'])test(`an unpaid ${kind} cannot be imported into the original paid Enterprise state`,()=>{
 const original=opening();assert.deepEqual(SOC.restore(JSON.stringify(original)),original);const bad=structuredClone(original);
 if(kind==='alias'){const number=structuredClone(child(bad).operations.numbers.find(n=>n.holder==='alex'));number.number='+6125550191';child(bad).operations.numbers.push(number);}else child(bad).operations.policies.alex.allowInternational=true;
 assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_.*AUTHORITY/);
});

function rehash(receipt){const unsigned={...receipt};delete unsigned.integrity;let value=0x811c9dc5;for(const char of JSON.stringify(unsigned)){value^=char.charCodeAt(0);value=Math.imul(value,0x01000193);}receipt.integrity=(value>>>0).toString(16).padStart(8,'0');}
test('public restore rejects rehashed TR receipts with forged admission or foreign guest evidence',()=>{
 const sourceId='progress.goal.tr';let original=until(opening(),s=>SOC.provider.inspect(s).progression.goals[sourceId]?.status==='ready');original=send(original,{action:'claim-progression',sourceId,quoteRevision:original.revision});assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
 for(const kind of ['inbound customer','outbound media','guest tenant']){const bad=structuredClone(original),r=bad.providerCampaign.progressionReceipts.receipts.find(r=>r.sourceId===sourceId);assert.ok(r);if(kind==='guest tenant')r.sourceEvidence.meeting.session.externalGuest.guestTenant=r.sourceEvidence.tenant;else{const direction=kind==='inbound customer'?'inbound':'outbound',proof=r.sourceEvidence[direction],alter=a=>{if(direction==='inbound')a.customerId='invented-customer';else a.media.in=false;};alter(proof.admission);alter(proof.admissionTrace);for(const t of proof.trace.filter(t=>t.code==='PROVIDER_EXTERNAL_ADMISSION'))alter(t);}rehash(r);assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_/,kind);}
 assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
});

test('paid external reach replays after a prior carrier upgrade and rejects inflated or re-scoped receipts',()=>{
 let original=op(opening(),'carrier-headroom');original=until(original,s=>project(s,'carrier-headroom').status==='complete');const capacity=child(original).resources.carrier.desired.capacity;original=op(original,'direct-external-reach');original=until(original,s=>project(s,'direct-external-reach').status==='complete');assert.equal(child(original).resources.carrier.effective.capacity,capacity+2);assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
 for(const kind of ['capacity','aliases','timestamp','prefix']){const bad=structuredClone(original),r=project(bad,'direct-external-reach').operationReceipt;if(kind==='capacity'){r.previousCapacity++;r.capacity++;child(bad).resources.carrier.desired.capacity++;child(bad).resources.carrier.effective.capacity++;}else if(kind==='aliases')r.aliases[0].holder='bea';else if(kind==='timestamp')r.at--;else r.allowedPrefix='+1';assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_(CAPACITY|CONFIG)_AUTHORITY/,kind);}
});

test('a subsequently paid coexistence platform inherits only the funded external route',()=>{
 let s=op(opening(false),'direct-external-reach');s=until(s,x=>project(x,'direct-external-reach').status==='complete');assert.equal(child(s).resources['migration-phone'],undefined);s=op(s,'migration');s=until(s,x=>project(x,'migration').status==='complete');assert.deepEqual(child(s).resources['migration-phone'].effective.routes,[{prefix:'+61',target:'service'},{prefix:'+44',target:'service'}]);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const bad=structuredClone(s);for(const config of ['desired','effective'])child(bad).resources['migration-phone'][config].routes.push({prefix:'+1',target:'service'});assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_CONFIG_AUTHORITY/);
});
