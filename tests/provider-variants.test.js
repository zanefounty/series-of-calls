const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const VARIANTS=require('../src/game/23-provider-variants.js');
const RULES=require('../src/game/24-provider-rules.js');
const source=fs.readFileSync(path.join(__dirname,'../src/game/23-provider-variants.js'),'utf8');

const smb=RULES.data.missions.smb;
function deepFreeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;}

test('variant catalogue is finite, versioned, translated by keys, and returns independent copies',()=>{
 assert.equal(VARIANTS.VERSION,1);assert.deepEqual(VARIANTS.IDS,['standard','peak-window','short-promise']);
 for(const id of VARIANTS.IDS){const value=VARIANTS.get(id);assert.equal(value.id,id);assert.equal(value.version,1);assert.match(value.nameKey,/^provider\.variant\.smb\./);assert.match(value.descriptionKey,/^provider\.variant\.smb\./);assert.equal(VARIANTS.validate({version:1,id}),true);}
 const first=VARIANTS.get('peak-window');first.demand.voiceMinutes[0]=999;assert.equal(VARIANTS.get('peak-window').demand.voiceMinutes[0],1);
 assert.throws(()=>VARIANTS.get('future-variant'),/UNKNOWN_PROVIDER_VARIANT/);assert.throws(()=>VARIANTS.demand('future-variant',smb.demand),/UNKNOWN_PROVIDER_VARIANT/);assert.throws(()=>VARIANTS.incident('future-variant',smb.incident),/UNKNOWN_PROVIDER_VARIANT/);
});

test('standard preserves authored SMB arrivals, durations, deadline and carrier outage exactly',()=>{
 const demand=deepFreeze(JSON.parse(JSON.stringify(smb.demand))),incident=deepFreeze(JSON.parse(JSON.stringify(smb.incident)));
 assert.deepEqual(VARIANTS.demand('standard',demand),demand);assert.deepEqual(VARIANTS.incident('standard',incident),incident);
 assert.notEqual(VARIANTS.demand('standard',demand),demand);assert.notEqual(VARIANTS.incident('standard',incident),incident);
 assert.deepEqual(demand.voiceMinutes,[4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49]);assert.deepEqual(incident,{afterDelivered:4,delayMinutes:4,resource:'carrier',kind:'outage'});
});

test('peak-window has sixteen distinct early voice arrivals, eight later digital arrivals and four-minute voice duration',()=>{
 const base=deepFreeze(JSON.parse(JSON.stringify(smb.demand))),next=VARIANTS.demand('peak-window',base);
 assert.deepEqual(next.voiceMinutes,Array.from({length:16},(_,i)=>i+1));assert.equal(new Set(next.voiceMinutes).size,16);
 assert.deepEqual(next.digitalMinutes,[20,25,30,35,40,45,50,55]);assert.equal(next.digitalMinutes.length,8);
 assert.equal(next.voiceDuration,4);assert.equal(next.deadlineMinutes,8);assert.equal(next.digitalDuration,base.digitalDuration);
 assert.deepEqual(base,smb.demand,'applying a demand alternative does not alter authored base demand');
});

test('short-promise preserves standard demand and schedules a supported service queue capacity fault',()=>{
 const baseDemand=deepFreeze(JSON.parse(JSON.stringify(smb.demand))),baseIncident=deepFreeze(JSON.parse(JSON.stringify(smb.incident)));
 const demand=VARIANTS.demand('short-promise',baseDemand),incident=VARIANTS.incident('short-promise',baseIncident);
 assert.deepEqual(demand.voiceMinutes,baseDemand.voiceMinutes);assert.deepEqual(demand.digitalMinutes,baseDemand.digitalMinutes);
 assert.equal(demand.voiceDuration,baseDemand.voiceDuration);assert.equal(demand.digitalDuration,baseDemand.digitalDuration);assert.equal(demand.deadlineMinutes,5);
 assert.equal(incident.resource,'service','service is the real customer queue resource id');assert.equal(incident.kind,'capacity');
 assert.equal(incident.afterDelivered,baseIncident.afterDelivered);assert.equal(incident.delayMinutes,baseIncident.delayMinutes);
 assert.deepEqual(baseIncident,{afterDelivered:4,delayMinutes:4,resource:'carrier',kind:'outage'});
});

test('choice validation fails closed for unknown versions, ids and arbitrary authoring fields',()=>{
 for(const bad of [null,{}, {version:2,id:'standard'},{version:1,id:'unknown'},{version:1,id:'standard',demand:{voiceMinutes:[1]}},{version:1,id:'short-promise',description:'invented'}])assert.throws(()=>VARIANTS.validate(bad),/INVALID_PROVIDER_VARIANT|UNKNOWN_PROVIDER_VARIANT/);
 assert.throws(()=>VARIANTS.demand('standard',null),/INVALID_PROVIDER_VARIANT_BASE/);assert.throws(()=>VARIANTS.incident('standard',[]),/INVALID_PROVIDER_VARIANT_BASE/);
});

test('worker source serializes the same pure, versioned variant API',()=>{
 const sandbox={},serialized=vm.runInNewContext(`${VARIANTS.source()};SOC_PROVIDER_VARIANTS`,sandbox);
 assert.deepEqual(JSON.parse(JSON.stringify(serialized.IDS)),['standard','peak-window','short-promise']);
 assert.deepEqual(JSON.parse(JSON.stringify(serialized.demand('peak-window',smb.demand).voiceMinutes)),Array.from({length:16},(_,i)=>i+1));
 assert.equal(serialized.incident('short-promise',smb.incident).resource,'service');assert.equal(serialized.validate({version:1,id:'standard'}),true);
});

test('all variant name and description references use static provider.variant.smb N_ markers',()=>{
 const markers=[],sandbox={globalThis:{N_:key=>{markers.push(key);return key;}}};vm.runInNewContext(source,sandbox);
 assert.deepEqual(markers.sort(),[
  'provider.variant.smb.peak_window.description','provider.variant.smb.peak_window.name',
  'provider.variant.smb.short_promise.description','provider.variant.smb.short_promise.name',
  'provider.variant.smb.standard.description','provider.variant.smb.standard.name'
 ].sort());
});
