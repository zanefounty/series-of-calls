const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const C=require('../src/game/44-campaign.js');
const content=require('../content/campaign.json');

const hooks={
 configurationFingerprint:s=>JSON.stringify([Object.entries(s.resources).map(([id,r])=>[id,r.generation,r.desired,r.effective]),SOC.operations.fingerprint(s),SOC.information.fingerprint(s),SOC.contact.fingerprint(s),SOC.workforce.fingerprint(s),s.calling?SOC.calling.fingerprint(s.calling):null,s.products?SOC.products.fingerprint(s):null,s.channels?SOC.channels.fingerprint(s.channels):null,s.outcomes?SOC.outcomes.fingerprint(s.outcomes):null,s.boundaries?SOC.boundaries.fingerprint(s):null,s.transport?SOC.transport.fingerprint(s):null]),
 observeResource:(s,id)=>SOC.observe(s,id),
 dispatchRootCommand:(s,command)=>SOC.dispatch(s,command)
};
function ready(scenario='smb',jurisdiction='AU',mode='assessed'){
 let s=SOC.create({scenario,jurisdiction,mode});
 for(const command of SOC.reference(s))s=SOC.dispatch(s,command);
 s.campaign=C.create(s);return s;
}
function tick(s,minutes=1){
 for(let i=0;i<minutes;i++){s=SOC.dispatch(s,{type:'advance',minutes:1});C.advance(s,hooks);}
 return s;
}
function open(s,kind){C.command(s,{action:'open-window',kind},hooks);return s;}
function scenarioRoot(scenario,jurisdiction,mode='sandbox'){
 let s=SOC.create({scenario,jurisdiction,mode});
 if(scenario==='government'){
  s=SOC.dispatch(s,{type:'information',command:{action:'start'}});
  const pipeline={...SOC.information.schemas.pipeline,steps:['transcription']};
  s=SOC.dispatch(s,{type:'information',command:{action:'configure',kind:'pipeline',config:pipeline}});
 }
 for(const command of SOC.reference(s))s=SOC.dispatch(s,command);
 if(scenario==='enterprise'){
  s=SOC.dispatch(s,{type:'migrate',identities:['bea'],target:'phone'});
  s=SOC.dispatch(s,{type:'advance',minutes:1});
 }
 if(scenario==='defence'&&!s.connected){s=SOC.dispatch(s,{type:'connect',connected:true});s=SOC.dispatch(s,{type:'advance',minutes:1});}
 return s;
}
function selectScenario(s,scenario,jurisdiction=s.jurisdiction){
 C.command(s,{action:'select-track',track:scenario},{selectTrack:(_,track)=>scenarioRoot(track,jurisdiction,s.campaign.mode)});
 return s;
}

test('AC-SOC-107 campaign content, source serialization and optional save compatibility are explicit',()=>{
 assert.equal(content.version,C.CONTENT);assert.equal(content.tracks.length,4);
 assert.deepEqual(content.unimplementedSourceObligations.status,'pending');
 for(const track of content.tracks){assert.deepEqual(track.requiredResources,C.tracks[track.id].resources);assert.deepEqual(track.windows,C.tracks[track.id].windows);}
 const s=SOC.create({scenario:'smb'});assert.equal(C.validate(s),true);
 s.campaign=C.create(s);assert.equal(C.validate(s),true);
 const worker={};vm.createContext(worker);vm.runInContext(C.source()+';globalThis.campaignPack=SOC_CAMPAIGN;',worker);
 const W=worker.campaignPack;const restored=structuredClone(s);
 assert.equal(W.validate(restored),true);assert.equal(W.fingerprint(restored),C.fingerprint(s));
 assert.deepEqual(JSON.parse(JSON.stringify(W.inspect(restored))),JSON.parse(JSON.stringify(C.inspect(s))));
});

test('AC-SOC-108 observation windows sample every minute and make configuration changes and skipped samples sticky',()=>{
 let changed=ready();open(changed,'baseline');
 changed=SOC.dispatch(changed,{type:'configure',id:'phone',config:{capacity:12}});
 changed=tick(changed,1);
 let w=changed.campaign.progress.smb.windows[0];assert.equal(w.status,'failed');assert.ok(w.errors.includes('CONFIGURATION_CHANGED:phone'));
 assert.equal(w.samples.length,1);assert.equal(C.validate(changed),true);

 let skipped=ready();open(skipped,'baseline');skipped.clock+=2;C.advance(skipped,hooks);
 w=skipped.campaign.progress.smb.windows[0];assert.equal(w.status,'failed');assert.ok(w.errors.includes('OBSERVATION_SAMPLE_GAP'));
});

test('AC-SOC-109 recovery requires the real validated fault, time under fault, recovery and a new successful journey',()=>{
 let s=ready();open(s,'recovery');
 assert.throws(()=>C.command(s,{action:'inject-incident'}),/CAMPAIGN_VALIDATED_DISPATCH_REQUIRED/);
 C.command(s,{action:'inject-incident'},hooks);assert.throws(()=>C.command(s,{action:'recover-incident'},hooks),/CAMPAIGN_INCIDENT_MINIMUM_HOLD/);s=tick(s,1);
 C.command(s,{action:'recover-incident'},hooks);
 s=SOC.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:'recovery-case'});
 s=tick(s,7);
 const w=s.campaign.progress.smb.windows[0];assert.equal(w.status,'passed');
 assert.equal(s.campaign.progress.smb.incidents[0].recoveredAt>s.campaign.progress.smb.incidents[0].at,true);
 assert.ok(w.evidence.traces.interactions.some(i=>i.caseId==='recovery-case'&&i.phase==='resolved'));
 assert.equal(C.validate(s),true);

 let defence=SOC.create({scenario:'smb',mode:'sandbox'});defence.campaign=C.create(defence);selectScenario(defence,'defence');open(defence,'service');
 defence=SOC.dispatch(defence,{type:'connect',connected:false});
 assert.throws(()=>C.command(defence,{action:'inject-incident'},hooks),/CAMPAIGN_INCIDENT_ALREADY_PRESENT/);
});

test('AC-SOC-110 service assessment needs a newly resolved interaction with retained case context',()=>{
 let noCase=ready();noCase=SOC.dispatch(noCase,{type:'configure',id:'cases',config:{identityMapping:false}});noCase=tick(noCase,1);open(noCase,'service');
 noCase=SOC.dispatch(noCase,{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:'lost-context'});
 noCase=tick(noCase,5);assert.equal(noCase.campaign.progress.smb.windows[0].status,'failed');
 assert.ok(noCase.campaign.progress.smb.windows[0].errors.includes('RESOLVED_CASE_CONTEXT_REQUIRED'));

 let s=ready();open(s,'service');
 s=SOC.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:'retained-context'});
 s=tick(s,5);assert.equal(s.campaign.progress.smb.windows[0].status,'passed');
 assert.equal(C.command(s,{action:'assess'},hooks).passed,false,'other required windows remain incomplete');
});

test('AC-SOC-111 sandbox track switching preserves full root snapshots and does not grant progression rewards',()=>{
 let s=ready('smb','AU','sandbox');
 s=SOC.dispatch(s,{type:'configure',id:'phone',config:{capacity:13}});s=tick(s,1);
 const before=structuredClone(s);const fingerprints=C.fingerprint(s);
 const selectTrack=(state,track,context)=>{
  if(context.targetSnapshot)return structuredClone(context.targetSnapshot.root);
  let next=SOC.create({scenario:track,jurisdiction:state.jurisdiction,mode:state.mode,seed:state.seed});
  while(next.clock<state.clock)next=SOC.dispatch(next,{type:'advance',minutes:1});
  return next;
 };
 C.command(s,{action:'select-track',track:'enterprise'},{selectTrack});
 assert.equal(s.scenario,'enterprise');assert.ok(s.campaign.snapshots.smb.root.business===undefined);
 assert.equal(C.fingerprint(s),fingerprints.replace('smb','enterprise'));
 C.command(s,{action:'select-track',track:'smb'},{selectTrack});
 assert.equal(s.resources.phone.desired.capacity,before.resources.phone.desired.capacity);
 assert.equal(C.validate(s),true);
 assert.equal(C.command(s,{action:'assess'},hooks).award,null);
});

test('AC-SOC-112 jurisdiction and workload constraints stay track-specific and unsupported source objectives remain pending',()=>{
 assert.deepEqual(C.tracks.government.resources.includes('speech'),true);
 assert.deepEqual(C.tracks.defence.resources.includes('local'),true);
 const s=ready();s.campaign.progress.government.status='available';
 s.campaign.progress.government.windows.push({});
 assert.throws(()=>C.validate(s),/INVALID_CAMPAIGN_WINDOW/);
 const clean=ready(),snapshot=JSON.stringify(clean);C.inspect(clean,hooks);assert.equal(JSON.stringify(clean),snapshot);
 assert.equal(C.inspect(clean,hooks).unimplementedSourceObligations.status,'pending');
 for(const jurisdiction of SOC.jurisdictions){
  for(const track of ['smb','enterprise','government','defence']){
   let s=SOC.create({scenario:'smb',jurisdiction,mode:'sandbox'});s.campaign=C.create(s);
   if(track==='smb')for(const command of SOC.reference(s))s=SOC.dispatch(s,command);else selectScenario(s,track,jurisdiction);
   open(s,'baseline');s=tick(s,1);
   assert.equal(s.campaign.progress[track].windows.at(-1).status,'passed',`${track}/${jurisdiction} baseline`);
   open(s,'service');
   if(track==='smb'){
    s=SOC.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:`case-${jurisdiction.toLowerCase()}`});s=tick(s,5);
   }else if(track==='enterprise'){
    s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500123',caseId:`alex-${jurisdiction.toLowerCase()}`});
    s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'bea',to:'+61255500124',caseId:`bea-${jurisdiction.toLowerCase()}`});
    s=SOC.dispatch(s,{type:'meeting'});s=tick(s,10);
   }else if(track==='government'){
    s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500123',caseId:`public-${jurisdiction.toLowerCase()}`});s=tick(s,10);
   }else{
    C.command(s,{action:'inject-incident'},hooks);
    s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500123',caseId:`offline-${jurisdiction.toLowerCase()}`});s=tick(s,5);
   }
   const window=s.campaign.progress[track].windows.at(-1);
   assert.equal(window.status,'passed',`${track}/${jurisdiction}: ${window.errors}`);
   assert.equal(C.validate(s),true);
  }
 }
});

test('AC-SOC-113 save validation binds awards, incident and window structures; inspection and fingerprints are pure',()=>{
 let s=ready();open(s,'baseline');s=SOC.dispatch(s,{type:'configure',id:'phone',config:{capacity:12}});s=tick(s,1);
 const before=JSON.stringify(s),fingerprint=C.fingerprint(s),first=JSON.stringify(C.inspect(s,hooks));
 assert.equal(JSON.stringify(C.inspect(s,hooks)),first);assert.equal(JSON.stringify(s),before);assert.equal(C.fingerprint(s),fingerprint);
 const bad=structuredClone(s);bad.campaign.progress.smb.windows[0].status='passed';bad.campaign.progress.smb.windows[0].errors=[];
 assert.throws(()=>C.validate(bad),/INVALID_CAMPAIGN_EVIDENCE/);
 const badSnapshot=structuredClone(s);badSnapshot.campaign.snapshots.smb={capturedAt:0,scenario:'smb',jurisdiction:'AU',mode:'assessed',track:'smb',root:{campaign:{}}};
 assert.throws(()=>C.validate(badSnapshot),/INVALID_CAMPAIGN_SNAPSHOT/);

 let endpoint=ready();open(endpoint,'baseline');endpoint=tick(endpoint,1);assert.equal(endpoint.campaign.progress.smb.windows[0].status,'passed');
 endpoint=SOC.dispatch(endpoint,{type:'configure',id:'desk',config:{enabled:false}});endpoint=tick(endpoint,1);
 const stale=C.command(endpoint,{action:'assess'},hooks);assert.equal(stale.checks.baseline.passed,false);assert.ok(stale.checks.baseline.errors.includes('EVIDENCE_STALE'));
});

test('AC-SOC-114 campaign readiness is not an award: all four distinct windows and current service readiness are required',()=>{
 let s=ready();open(s,'baseline');s=tick(s,1);
 const report=C.command(s,{action:'assess'},hooks);assert.equal(report.passed,false);assert.equal(report.award,null);
 assert.deepEqual(Object.keys(report.checks).sort(),['baseline','economics','recovery','service'].sort());
 s=SOC.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});
 const after=C.command(s,{action:'assess'},hooks);assert.equal(after.currentReadiness,false);assert.equal(after.award,null);

 s=ready();open(s,'baseline');s=tick(s,1);
 open(s,'service');s=SOC.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:'campaign-service'});s=tick(s,5);
 open(s,'recovery');C.command(s,{action:'inject-incident'},hooks);s=tick(s,1);C.command(s,{action:'recover-incident'},hooks);
 s=SOC.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:'campaign-recovery'});s=tick(s,7);
 s=SOC.dispatch(s,{type:'business',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'business',command:{action:'order',offer:'contact',quantity:1,unit:'agent',currency:'AUD',resources:['people','service'],customer:'customer',supportOwner:'orchard-msp',sell:true}});
 s=tick(s,2);open(s,'economics');s=tick(s,60);
 const award=C.command(s,{action:'assess'},hooks).award;
 assert.deepEqual({unit:award.unit,amount:award.amount,track:award.track},{unit:'training-credit',amount:1,track:'smb'});
 assert.equal(s.campaign.awards.length,1);C.command(s,{action:'assess'},hooks);assert.equal(s.campaign.awards.length,1);
 assert.equal(C.validate(s),true);
});
