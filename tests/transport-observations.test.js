const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const T=require('../src/game/42-transport');

function base({alternate=true,primaryLead=1}={}){
 const s={clock:0,resources:{identity:{},desk:{}}};s.transport=T.create(s);
 for(const id of ['office','branch',...(alternate?['hub']:[])])T.command(s,{action:'site',id,config:{name:id,region:'AU',domain:id+'-site'}});
 const link=(id,from,to,domain,latencyMs=10,capacityMbps=1)=>T.command(s,{action:'link',id,config:{from,to,mode:'purchased',capacityMbps,latencyMs,domain,leadMinutes:id==='primary'?primaryLead:1,setupCents:100,periodCents:30,contract:null}});
 link('primary','office','branch','primary-domain');
 if(alternate){link('alternate-a','office','hub','alternate-domain-a');link('alternate-b','hub','branch','alternate-domain-b');}
 T.command(s,{action:'bind',resource:'identity',site:'office'});T.command(s,{action:'bind',resource:'desk',site:'branch'});tick(s,primaryLead);return s;
}
function tick(s,n=1,hooks={}){for(let i=0;i<n;i++){s.clock++;T.advance(s,hooks);}T.validate(s);return s;}

test('a held reservation records immutable actual admission, primary failure reroute, and recovered path snapshots',()=>{
 const s=base(),admitted=T.admit(s,'held-call','identity','desk'),seen=[];
 assert.equal(admitted.ready,true);assert.equal(admitted.observation.version,1);assert.equal(admitted.observation.at,s.clock);assert.deepEqual(admitted.observation.selected.edges.map(x=>x.id),['primary']);
 const original=structuredClone(admitted.observation);T.command(s,{action:'domain',id:'primary-domain',failed:true});tick(s,1,{pathObserved:(_state,_id,o)=>seen.push(o)});
 const reroute=seen.at(-1);assert.equal(reroute.phase,'rerouted');assert.deepEqual(reroute.previous.edges.map(x=>x.id),['primary']);assert.equal(reroute.previous.edges[0].domainFailed,false);assert.equal(reroute.previous.sampledAt,1);assert.deepEqual(reroute.selected.edges.map(x=>x.id),['alternate-a','alternate-b']);assert.equal(reroute.selected.latencyMs,20);assert.equal(reroute.kbps,160);assert.deepEqual(reroute.failedDomains,['primary-domain']);
 assert.deepEqual(admitted.observation,original);assert.deepEqual(s.transport.reservations[0].edges,['alternate-a','alternate-b']);
 T.command(s,{action:'domain',id:'primary-domain',failed:false});tick(s,1,{pathObserved:(_state,_id,o)=>seen.push(o)});
 const recovered=seen.at(-1);assert.equal(recovered.phase,'rerouted');assert.deepEqual(recovered.previous.edges.map(x=>x.id),['alternate-a','alternate-b']);assert.deepEqual(recovered.selected.edges.map(x=>x.id),['primary']);
 const evidence=s.transport.reservations[0].pathObservation;assert.equal(evidence.version,1);assert.equal(evidence.sampleCount,3);assert.deepEqual(evidence.runs.map(x=>[x.firstAt,x.lastAt,x.sampleCount,x.edges]),[[1,1,1,['primary']],[2,2,1,['alternate-a','alternate-b']],[3,3,1,['primary']]]);assert.equal(evidence.transitions.length,3);assert.equal(T.validate(s),true);
});

test('shared-domain outage records the failed old path and releases the held reservation once',()=>{
 const s=base({alternate:false}),admitted=T.admit(s,'shared-call','identity','desk'),seen=[],failed=[];assert.equal(admitted.ready,true);
 T.command(s,{action:'domain',id:'primary-domain',failed:true});tick(s,1,{pathObserved:(_state,_id,o)=>seen.push(o),failed:(_state,id,reason)=>failed.push({id,reason})});
 assert.equal(seen.length,1);assert.equal(seen[0].phase,'failed');assert.equal(seen[0].ready,false);assert.equal(seen[0].reason,'TRANSPORT_PATH_OR_CAPACITY');assert.deepEqual(seen[0].previous.edges.map(x=>x.id),['primary']);assert.deepEqual(seen[0].failedDomains,['primary-domain']);assert.deepEqual(failed,[{id:'shared-call',reason:'TRANSPORT_PATH_OR_CAPACITY'}]);assert.equal(s.transport.reservations.length,0);assert.equal(T.validate(s),true);
});

test('alternate-route capacity exhaustion is observed and does not strand the reservation',()=>{
 const s=base();T.command(s,{action:'domain',id:'primary-domain',failed:true});
 for(let n=0;n<6;n++)assert.equal(T.admit(s,'alternate-load-'+n,'identity','desk').ready,true);
 T.command(s,{action:'domain',id:'primary-domain',failed:false});assert.equal(T.admit(s,'held-on-primary','identity','desk').ready,true);
 T.command(s,{action:'domain',id:'primary-domain',failed:true});const seen=[],failed=[];tick(s,1,{pathObserved:(_state,_id,o)=>seen.push(o),failed:(_state,id,reason)=>failed.push({id,reason})});
 const sample=seen.find(x=>x.interactionId==='held-on-primary');assert.equal(sample.phase,'failed');assert.equal(sample.reason,'TRANSPORT_PATH_OR_CAPACITY');assert.deepEqual(sample.previous.edges.map(x=>x.id),['primary']);assert.deepEqual(sample.selected.edges,[]);assert.deepEqual(failed,[{id:'held-on-primary',reason:'TRANSPORT_PATH_OR_CAPACITY'}]);assert.equal(s.transport.reservations.length,6);assert.equal(T.validate(s),true);
});

test('a paid headroom reprovision preserves old effective generations until the new path commissions',()=>{
 const s=base({alternate:false,primaryLead:3});for(let n=0;n<6;n++)assert.equal(T.admit(s,'headroom-call-'+n,'identity','desk').ready,true);
 const before=s.transport.totalCosts;T.command(s,{action:'headroom-upgrade',link:'primary',triggerBps:8000,targetBps:6000,maxCapacityMbps:10});const pending=s.transport.links.primary;
 assert.equal(s.transport.totalCosts,before+100);assert.equal(pending.effective.capacityMbps,1);assert.equal(pending.effectiveGeneration,1);assert.equal(pending.generation,2);assert.equal(pending.provisioning.status,'pending');
 const observed=[];tick(s,2,{pathObserved:(_state,_id,o)=>observed.push(o)});assert.equal(s.transport.links.primary.effectiveGeneration,1);assert.ok(observed.every(o=>o.selected.edges[0].generation===1&&o.selected.edges[0].capacityMbps===1));
 tick(s,1,{pathObserved:(_state,_id,o)=>observed.push(o)});assert.equal(s.transport.links.primary.effectiveGeneration,2);const completed=observed.at(-1);assert.equal(completed.previous.sampledAt,4);assert.equal(completed.previous.edges[0].generation,1);assert.equal(completed.previous.edges[0].capacityMbps,1);assert.equal(completed.selected.edges[0].generation,2);assert.equal(completed.selected.edges[0].capacityMbps,2);
 const saved=JSON.parse(JSON.stringify(s)),history=saved.transport.reservations[0].pathObservation;assert.equal(T.validate(saved),true);assert.equal(history.sampleCount,4);assert.equal(history.runs.length,3);assert.deepEqual([history.runs[1].firstAt,history.runs[1].lastAt,history.runs[1].sampleCount],[4,5,2]);assert.equal(history.transitions.at(-1).selected.edges[0].capacityMbps,2);
});

test('legacy pending nodes keep their effective generation explicitly unknown',()=>{
 const s=base({alternate:false});delete s.transport.links.primary.effectiveGeneration;for(const n of Object.values(s.transport.sites))delete n.effectiveGeneration;assert.equal(T.validate(s),true);
 const admitted=T.admit(s,'legacy-held','identity','desk');assert.equal(admitted.observation.selected.edges[0].generation,1);
 T.command(s,{action:'link',id:'primary',config:{...s.transport.links.primary.effective,capacityMbps:2,leadMinutes:3}});assert.equal(s.transport.links.primary.effectiveGeneration,undefined);
 const seen=[];tick(s,1,{pathObserved:(_state,_id,o)=>seen.push(o)});assert.equal(seen[0].selected.edges[0].generation,null);assert.equal(seen[0].selected.edges[0].desiredGeneration,2);assert.equal(T.validate(JSON.parse(JSON.stringify(s))),true);
});

test('observation validation rejects unknown versions and corrupted route evidence; inspect and worker source stay pure',()=>{
 const s=base(),admitted=T.admit(s,'worker-call','identity','desk'),before=JSON.stringify(s);assert.equal(T.validateObservation(admitted.observation),true);assert.equal(JSON.stringify(T.inspect(s).reservations),JSON.stringify(s.transport.reservations));assert.equal(JSON.stringify(s),before);
 const unknown=structuredClone(admitted.observation);unknown.version=2;assert.throws(()=>T.validateObservation(unknown),/INVALID_TRANSPORT_OBSERVATION/);
 const bad=structuredClone(s);bad.transport.reservations[0].pathObservation.transitions[0].selected.edges[0].domain='forged-domain';assert.throws(()=>T.validate(bad),/INVALID_TRANSPORT_OBSERVATION/);
 const badHistory=structuredClone(s);badHistory.transport.reservations[0].pathObservation.sampleCount++;assert.throws(()=>T.validate(badHistory),/INVALID_TRANSPORT_OBSERVATION_HISTORY/);
 const unknownHistory=structuredClone(s);unknownHistory.transport.reservations[0].pathObservation.version=2;assert.throws(()=>T.validate(unknownHistory),/INVALID_TRANSPORT_OBSERVATION_HISTORY/);
 const legacy=structuredClone(s);delete legacy.transport.reservations[0].pathObservation;assert.equal(T.validate(legacy),true);
 const box={};vm.createContext(box);vm.runInContext(T.source()+';globalThis.T=SOC_TRANSPORT;',box);assert.deepEqual(JSON.parse(JSON.stringify(box.T.inspect(structuredClone(s)))),T.inspect(s));assert.equal(box.T.validateObservation(admitted.observation),true);
});

test('a same-site zero-edge reservation remains an observed available path',()=>{
 const s=base({alternate:false});T.command(s,{action:'bind',resource:'same-site',site:'office'});const admitted=T.admit(s,'local-call','identity','same-site');assert.equal(admitted.ready,true);assert.deepEqual(admitted.edges,[]);tick(s);assert.equal(s.transport.reservations[0].pathObservation.sampleCount,2);assert.equal(T.validate(s),true);
});
