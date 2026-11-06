'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const I=require('../src/game/23-provider-room-integration.js');

function fixture(){
 const source={id:I.SOURCE_ID,generation:3,provisioning:{status:'ready',generation:3},effective:{family:'microsoft:meetings-rooms',productVersion:'room-v3',features:['room-devices'],bindings:[{feature:'room-devices',resources:['room']}]}};
 const target={id:I.TARGET_ID,generation:5,provisioning:{status:'ready',generation:5},effective:{family:'cisco:meetings-devices',productVersion:'interop-v5',features:['interop-join'],bindings:[{feature:'interop-join',resources:['room']}]}};
 const plan={source:{generation:3,productVersion:'room-v3'},target:{generation:5,productVersion:'interop-v5'}};
 const edge={id:I.EDGE_ID,source:I.SOURCE_ID,target:I.TARGET_ID,sourceGeneration:3,targetGeneration:5,sourceVersion:'room-v3',targetVersion:'interop-v5',features:[{sourceFeature:I.SOURCE_FEATURE,targetFeature:I.TARGET_FEATURE}],result:{checkedAt:10,status:'scenario-verified',synthetic:true,externalSupportClaim:false,sourceGeneration:3,targetGeneration:5,sourceVersion:'room-v3',targetVersion:'interop-v5',checks:[{sourceFeature:I.SOURCE_FEATURE,targetFeature:I.TARGET_FEATURE,source:{available:true},target:{available:true}}]}};
 const root={clock:12,resources:{room:{generation:2,provisioning:{status:'ready',generation:2},effective:{enabled:true,calendar:true,mode:'bridge',interop:true}}},products:{deployments:[source,target],integrations:[edge]}};
 const gate={source:true,target:true,path:true};
 const hooks={resourceReady:()=>({ready:true}),featureStatus:(s,id,feature)=>({available:id===I.SOURCE_ID?gate.source:gate.target}),meetingPath:(s,from,to,profile)=>({ready:gate.path,kbps:5000,edges:['access-room'],latencyMs:18,availableKbps:20000})};
 const booking={id:'booking-1'};
 const session={bookingId:booking.id,joinMethod:'bridge',joinProfileGeneration:7,startedAt:null};
 return {root,hooks,booking,session,gate,plan};
}

test('meeting acceptance binds the retained current product test and live identity-to-room path',()=>{
 const f=fixture(),accepted=I.acceptedSnapshot(f.root,f.booking,f.session,12,f.hooks);
 assert.ok(accepted);
 assert.equal(accepted.testAt,10);
 assert.equal(accepted.acceptedAt,12);
 assert.deepEqual(accepted.path,{availableKbps:20000,checkedAt:12,edges:['access-room'],from:'identity',kbps:5000,latencyMs:18,profile:'meeting',ready:true,to:'room'});
 const active={...f.session,startedAt:12},next=I.observeAccepted(f.root,f.booking,active,accepted,13,f.hooks);
 assert.equal(next.acceptedAt,12);
 assert.equal(next.testAt,10);
 assert.equal(next.path.checkedAt,13);
});

test('a failed endpoint feature or live path blocks admission and active-session recovery observes repaired state',()=>{
 const f=fixture();f.gate.target=false;
 assert.equal(I.acceptedSnapshot(f.root,f.booking,f.session,12,f.hooks),null);
 f.gate.target=true;f.gate.path=false;
 assert.equal(I.acceptedSnapshot(f.root,f.booking,f.session,12,f.hooks),null);
 f.gate.path=true;
 const accepted=I.acceptedSnapshot(f.root,f.booking,f.session,12,f.hooks),active={...f.session,startedAt:12};
 assert.ok(accepted);
 f.gate.path=false;
 assert.equal(I.observeAccepted(f.root,f.booking,active,accepted,13,f.hooks),null);
 f.gate.path=true;
 assert.equal(I.observeAccepted(f.root,f.booking,active,accepted,14,f.hooks).path.checkedAt,14);
});

test('retiring or upgrading an endpoint generation invalidates an accepted room session',()=>{
 const f=fixture(),accepted=I.acceptedSnapshot(f.root,f.booking,f.session,12,f.hooks),active={...f.session,startedAt:12};
 assert.ok(accepted);
 f.root.products.deployments[1].generation++;
 f.root.products.deployments[1].provisioning.generation++;
 assert.equal(I.observeAccepted(f.root,f.booking,active,accepted,13,f.hooks),null);
});

test('a same-generation retest retains the accepted test time while the current test must remain verified',()=>{
 const f=fixture(),edge=f.root.products.integrations[0],accepted=I.acceptedSnapshot(f.root,f.booking,f.session,12,f.hooks),active={...f.session,startedAt:12};
 assert.ok(accepted);
 edge.testHistory={version:1,entries:[{at:13,sourceVersion:edge.sourceVersion,targetVersion:edge.targetVersion,sourceGeneration:edge.sourceGeneration,targetGeneration:edge.targetGeneration,result:structuredClone(edge.result)}]};
 edge.result={...structuredClone(edge.result),checkedAt:13};
 assert.equal(I.observeAccepted(f.root,f.booking,active,accepted,14,f.hooks).testAt,10);
 edge.result={...structuredClone(edge.result),status:'blocked'};
 assert.equal(I.observeAccepted(f.root,f.booking,active,accepted,15,f.hooks),null);
});
