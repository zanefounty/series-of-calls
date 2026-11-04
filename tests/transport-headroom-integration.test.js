const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),{saturated,fixture,upgrade,call,revoke}=require('./lib/transport-lease-fixture');
const apply=(s,c)=>SOC.dispatch(s,c),tick=(s,minutes)=>apply(s,{type:'advance',minutes});
test('AC-SOC-601 measured headroom upgrade charges once and preserves old capacity during provisioning',()=>{
 let {state:s}=saturated();assert.equal(s.transport.reservations.length,6);const quote=SOC.transport.headroom(s,upgrade.command),cost=s.transport.totalCosts,rows=s.transport.ledger.length;assert.equal(quote.loadKbps,960);assert.equal(quote.targetCapacityMbps,2);
 s=apply(s,upgrade);assert.equal(s.transport.links['leased-path'].desired.capacityMbps,2);assert.equal(s.transport.links['leased-path'].effective.capacityMbps,1);assert.equal(s.transport.totalCosts,cost+100);assert.equal(s.transport.ledger.length,rows+1);
 assert.equal(SOC.transport.headroom(s,upgrade.command).loadKbps,960);const before=JSON.stringify(s);assert.throws(()=>apply(s,upgrade),/PROVISIONING_PENDING/);assert.equal(JSON.stringify(s),before);s=apply(s,call('over-capacity'));assert.equal(s.interactions.at(-1).outcome,'TRANSPORT_PATH_OR_CAPACITY');
 s=tick(s,2);assert.equal(s.transport.links['leased-path'].effective.capacityMbps,1);s=tick(s,1);assert.equal(s.transport.links['leased-path'].effective.capacityMbps,2);s=apply(s,call('after-upgrade'));assert.notEqual(s.interactions.at(-1).phase,'failed');assert.equal(s.transport.totalCosts,cost+100);
});
test('AC-SOC-602 headroom refusal preserves state and money for no demand, limits, outage and authority',()=>{
 for(const [s,c,reason] of [[fixture().state,upgrade,/BELOW_TRIGGER/],[saturated().state,{...upgrade,command:{...upgrade.command,maxCapacityMbps:1}},/MAXIMUM_CAPACITY/],[apply(saturated().state,revoke),upgrade,/ACTIVE_LEASE/],[apply(saturated().state,{type:'business',command:{action:'revoke',grant:'customer-service'}}),upgrade,/DELEGATION_REQUIRED/]]){const before=JSON.stringify(s);assert.throws(()=>apply(s,c),reason);assert.equal(JSON.stringify(s),before);}
});
test('AC-SOC-603 staged capacity upgrade survives save, replay and worker dispatch with exact costs',()=>{
 const f=saturated(),s=apply(f.state,upgrade),ctx={postMessage:r=>ctx.result=r};vm.createContext(ctx);vm.runInContext(SOC.workerSource(),ctx);ctx.onmessage({data:{id:'upgrade',state:structuredClone(f.state),command:upgrade}});assert.deepEqual(JSON.parse(JSON.stringify(ctx.result.state)),s);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);assert.deepEqual([...f.commands,upgrade].reduce(SOC.dispatch,SOC.create(f.options)),s);
});
