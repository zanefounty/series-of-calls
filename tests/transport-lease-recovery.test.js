const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),{fixture,revoke,call}=require('./lib/transport-lease-fixture');
const apply=(s,c)=>SOC.dispatch(s,c),tick=(s,minutes)=>apply(s,{type:'advance',minutes});
const path=s=>SOC.transport.resourcePath(s,'identity','service','voice');

test('AC-SOC-593 leased-IP withdrawal blocks real calls until timed renumbering completes',()=>{
 let {state:s}=fixture();const observed=structuredClone(s.transport.links['leased-path'].observed),cost=s.transport.totalCosts;
 s=apply(s,revoke);assert.equal(path(s).ready,false);assert.deepEqual(s.transport.links['leased-path'].observed,observed);
 s=apply(s,call());assert.equal(s.interactions.at(-1).phase,'failed');assert.equal(s.interactions.at(-1).outcome,'TRANSPORT_PATH_OR_CAPACITY');
 s=tick(s,6);assert.equal(path(s).ready,false);s=tick(s,1);assert.equal(path(s).ready,true);assert.equal(s.transport.leaseRevocations[0].status,'renumbered');assert.equal(s.transport.totalCosts,cost);
 s=apply(s,call('recovered'));s=tick(s,5);assert.equal(s.interactions.at(-1).outcome,'RESOLVED');assert.doesNotThrow(()=>SOC.validateState(s));
});
test('AC-SOC-594 an independent owned path preserves an active customer call through lease withdrawal',()=>{
 let {state:s}=fixture({alternate:true});s=apply(s,call());assert.equal(s.transport.reservations[0].edges[0],'leased-path');s=apply(s,revoke);s=tick(s,1);assert.equal(s.transport.reservations[0].edges[0],'owned-path');s=tick(s,4);assert.equal(s.interactions.at(-1).outcome,'RESOLVED');
});
test('AC-SOC-595 renumbering cannot erase independent physical, power or shared-domain outages',()=>{
 let {state:s}=fixture();s=apply(s,revoke);s=apply(s,{type:'transport',command:{action:'domain',id:'primary-trench',failed:true}});s=apply(s,{type:'transport',command:{action:'observe',kind:'link',id:'leased-path',available:false,power:true}});s=tick(s,7);
 assert.equal(s.transport.leaseRevocations[0].status,'renumbered');assert.equal(path(s).ready,false);s=apply(s,{type:'transport',command:{action:'repair',link:'leased-path'}});s=tick(s,3);assert.equal(path(s).ready,false);s=apply(s,{type:'transport',command:{action:'domain',id:'primary-trench',failed:false}});assert.equal(path(s).ready,true);
});
test('AC-SOC-596 invalid, owned, duplicate, unauthorized and unready lease incidents fail atomically',()=>{
 const {state:s}=fixture({alternate:true});for(const command of [{...revoke,command:{...revoke.command,durationMinutes:6}},{...revoke,command:{...revoke.command,link:'owned-path'}},{...revoke,command:{...revoke.command,extra:true}}]){const before=JSON.stringify(s);assert.throws(()=>apply(s,command),/TRANSPORT/);assert.equal(JSON.stringify(s),before);}
 const active=apply(s,revoke),before=JSON.stringify(active);assert.throws(()=>apply(active,revoke),/TRANSPORT/);assert.equal(JSON.stringify(active),before);
 const expired=apply(s,{type:'business',command:{action:'revoke',grant:'customer-service'}});assert.throws(()=>apply(expired,revoke),/DELEGATION_REQUIRED/);
});
test('AC-SOC-597 lease history rejects forged timers, early completion, links and missing command lineage',()=>{
 const s=apply(fixture().state,revoke);for(const mutate of [x=>x.transport.leaseRevocations[0].due++,x=>x.transport.leaseRevocations[0].status='renumbered',x=>x.transport.leaseRevocations[0].link='ghost',x=>x.transport.leaseRevocations[0].openedRevision--,x=>x.transport.leaseRevocations=[],x=>delete x.transport.leaseRevocations,x=>x.commands.pop()]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>SOC.validateState(bad),/TRANSPORT_LEASE/);}
 assert.doesNotThrow(()=>SOC.validateState(SOC.restore(JSON.stringify(s))));
 let later=tick(s,7);later=apply(later,{type:'transport',command:{action:'link',id:'leased-path',config:{...later.transport.links['leased-path'].desired,capacityMbps:20}}});const forged=structuredClone(later);forged.transport.leaseRevocations[0].generation=2;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/TRANSPORT_LEASE_COMMAND_MISSING/);
});
test('AC-SOC-598 legacy saves, pure inspection, worker equivalence and command replay preserve recovery',()=>{
 const f=fixture({alternate:true});assert.equal(f.state.transport.leaseRevocations,undefined);assert.doesNotThrow(()=>SOC.validateState(f.state));const s=apply(f.state,revoke),before=JSON.stringify(s);SOC.calculate(s);SOC.transport.inspect(s);assert.equal(JSON.stringify(s),before);
 const ctx={postMessage:x=>ctx.result=x};vm.createContext(ctx);vm.runInContext(SOC.workerSource(),ctx);ctx.onmessage({data:{id:'lease',state:structuredClone(f.state),command:revoke}});assert.deepEqual(JSON.parse(JSON.stringify(ctx.result.state)),s);
 let replay=SOC.create(f.options);for(const c of [...f.commands,revoke])replay=apply(replay,c);assert.deepEqual(replay,s);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
test('AC-SOC-599 all fictional jurisdictions support withdrawal and alternate-route recovery',()=>{
 for(const jurisdiction of SOC.jurisdictions){let {state:s}=fixture({jurisdiction,alternate:true});s=apply(s,revoke);assert.deepEqual(path(s).edges,['owned-path']);s=tick(s,7);assert.deepEqual(path(s).edges,['leased-path']);assert.doesNotThrow(()=>SOC.validateState(s));}
});
