const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {E,act,tick,siteFixture,exercise}=require('./helpers/site-fixture');
test('AC-SOC-257 site exercises prove real cross-site baseline, surviving inbound calls and asynchronous backup restoration',()=>{
 const initial=siteFixture(),s=exercise(initial),x=s.siteOperations.exercises[0];assert.equal(x.status,'complete');assert.equal(x.baseline.sourceSite,'office-a');assert.equal(x.baseline.targetSite,'office-b');assert.equal(x.continuity[0].sourceSite,'ingress');assert.equal(x.continuity[0].targetResource,'desk');
 for(const sample of [x.baseline,...x.continuity,x.recoveredJourney]){const i=s.interactions.find(i=>i.id===sample.interactionId);assert.equal(i.outcome,'CONNECTED');assert.equal(i.destination,sample.targetResource);assert.deepEqual(i.trace.find(t=>t.code==='MEDIA_TRANSPORT_ADMITTED').edges,sample.edges);}
 assert.equal(s.resources.alexdesk.generation,initial.resources.alexdesk.generation+1);assert.deepEqual(s.resources.alexdesk.effective,x.backupSnapshot.resources.find(r=>r.id==='alexdesk').config);assert.equal(x.restoration.status,'complete');assert.equal(E.calculate(s).siteOperations.goals.ln.status,'ready');assert.equal(E.calculate(s).siteOperations.goals.df.status,'ready');assert.equal(E.calculate(s).siteOperations.goals.m2.status,'incomplete');
 assert.deepEqual(E.restore(JSON.stringify(s)),s);const before=JSON.stringify(s);E.calculate(s);E.calculate(s);assert.equal(JSON.stringify(s),before);
});
test('AC-SOC-351 site historical journeys survive a real interaction-ring eviction but recent deleted proof is rejected',()=>{
 let s=exercise(siteFixture()),old=s.siteOperations.exercises[0].baseline.interactionId;
 for(let n=0;n<201;n++)s=E.dispatch(s,{type:'interact',channel:'voice',from:'unknown',to:'+61255509999',caseId:`site-prune-${n}`});
 assert.ok(s.tracePrunedThrough>=Number(old.slice('interaction-'.length)));
 assert.deepEqual(E.restore(JSON.stringify(s)),s,'typed completed site proof remains valid when its actual call trace ages out');
 s=exercise(s,'power','site-a','post-prune-proof');const recent=s.siteOperations.exercises.find(x=>x.id==='post-prune-proof').baseline.interactionId;
 assert.ok(Number(recent.slice('interaction-'.length))>s.tracePrunedThrough);
 const deleted=structuredClone(s);deleted.interactions=deleted.interactions.filter(i=>i.id!==recent);
 assert.throws(()=>E.restore(JSON.stringify(deleted)),/INVALID_SITE_OPERATIONS_JOURNEY_LINEAGE/,'a missing recent call cannot masquerade as an intentional ring eviction');
});
test('AC-SOC-258 site diversity requires power and whole-site failure of both sites plus an alternate shared-risk path',()=>{
 let s=siteFixture();for(const kind of ['power','site-failure'])for(const site of ['site-a','site-b']){s=exercise(s,kind,site,kind+'-'+site);assert.equal(s.siteOperations.exercises.at(-1).status,'complete');assert.equal(E.calculate(s).siteOperations.goals.m2.status,'incomplete');}
 s=exercise(s,'shared-risk','site-a','shared-exercise');const x=s.siteOperations.exercises.at(-1);assert.equal(x.status,'complete');assert.ok(x.continuity[0].edges.every(id=>s.transport.links[id].effective.domain!=='shared-trench'));assert.equal(E.calculate(s).siteOperations.goals.m2.status,'ready');
 const bad=structuredClone(s);bad.siteOperations.exercises[0].restoration.status='pending';assert.throws(()=>E.restore(JSON.stringify(bad)),/INVALID_SITE/);
});
test('AC-SOC-259 site probe failures remain saved and cannot award continuity when routes, power or media fail',()=>{
 let s=siteFixture();s=E.dispatch(s,{type:'configure',id:'phone',config:{mediaIn:false}});s=tick(s);s=act(s,'site-operations',{action:'exercise',id:'broken-media',kind:'power',sites:['site-a','site-b']});s=tick(s);assert.equal(s.siteOperations.exercises[0].status,'failed');assert.equal(E.calculate(s).siteOperations.goals.ln.status,'incomplete');assert.deepEqual(E.restore(JSON.stringify(s)),s);
 s=siteFixture();s=act(s,'site-operations',{action:'exercise',id:'no-path',kind:'shared-risk',sites:['site-a','site-b']});s=tick(s);for(const id of ['alternate-a','alternate-b'])s=act(s,'transport',{action:'observe',kind:'link',id,available:false,power:true});s=tick(s);assert.equal(s.siteOperations.exercises[0].status,'failed');assert.equal(s.interactions.at(-1).outcome,'TRANSPORT_PATH_OR_CAPACITY');assert.throws(()=>act(s,'site-operations',{action:'recover',kind:'exercise',id:'no-path'}),/SITE_CONTINUITY/);
});
test('AC-SOC-260 site provisioning and restore reject unsupported ownership and unavailable backup dependencies',()=>{
 let s=siteFixture();const c=structuredClone(s.siteOperations.sites['site-a'].desired);c.owner='orchard-msp';c.ownership='provider';s=act(s,'site-operations',{action:'site',id:'site-a',config:c});s=tick(s);assert.equal(s.siteOperations.sites['site-a'].provisioning.status,'failed');assert.equal(s.siteOperations.sites['site-a'].provisioning.reason,'SITE_OWNERSHIP_UNPROVEN');
 s=siteFixture();s=E.dispatch(s,{type:'fault',id:'backup-a',fault:'OUTAGE'});assert.throws(()=>act(s,'site-operations',{action:'exercise',id:'no-backup',kind:'power',sites:['site-a','site-b']}),/SITE_BACKUP_UNAVAILABLE/);
 s=siteFixture();s=act(s,'site-operations',{action:'exercise',id:'restore-fault',kind:'power',sites:['site-a','site-b']});s=tick(s,2);s=act(s,'site-operations',{action:'recover',kind:'exercise',id:'restore-fault'});s=E.dispatch(s,{type:'fault',id:'restore-a',fault:'OUTAGE'});assert.throws(()=>act(s,'site-operations',{action:'restore',kind:'exercise',id:'restore-fault'}),/SITE_EXERCISE_GENERATION_STALE|SITE_RESTORE_UNAVAILABLE/);
});
test('AC-SOC-261 site worker command equivalence and endpoint migration use canonical transport bindings',()=>{
 let s=siteFixture();let output;const box={postMessage:r=>output=r};vm.createContext(box);vm.runInContext(E.workerSource(),box);const command={type:'site-operations',command:{action:'exercise',id:'worker-exercise',kind:'power',sites:['site-a','site-b']}};box.onmessage({data:{id:1,state:s,command}});assert.equal(output.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(output.state)),E.dispatch(s,command));
 const c=structuredClone(s.siteOperations.sites['site-b'].desired);c.endpointResources.push('alexdesk');s=act(s,'site-operations',{action:'site',id:'site-b',config:c});s=tick(s);s=act(s,'site-operations',{action:'plan',id:'move-alex',fromSite:'site-a',toSite:'site-b',resources:['alexdesk']});s=act(s,'site-operations',{action:'cutover',id:'move-alex'});assert.equal(s.siteOperations.migrations[0].phase,'complete');assert.equal(s.transport.bindings.alexdesk,'office-b');assert.equal(s.siteOperations.bindings.alexdesk.site,'site-b');assert.deepEqual(E.restore(JSON.stringify(s)),s);
});
