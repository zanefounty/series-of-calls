'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const I=require('../src/game/23-provider-room-integration.js');
// Bounded acceptance for uc-new:domain:room-joining plus the mapped Microsoft
// and Cisco room family records. It does not complete either family profile.

const send=(s,command)=>SOC.dispatch(s,command);
const advance=(s,minutes=1)=>send(s,{type:'advance',minutes});
const pack=(s,command)=>send(s,{type:'products',command});
function readyLab(){
 let s=SOC.create({experience:'lab',mode:'sandbox',scenario:'smb'});
 s=send(s,{type:'products',command:{action:'start'}});
 s=send(s,{type:'information',command:{action:'start'}});
 s=send(s,{type:'transport',command:{action:'start'}});
 s=send(s,{type:'configure',id:'room',config:{mode:'bridge',interop:true,calendar:true}});
 s=send(s,{type:'transport',command:{action:'site',id:'identity-site',config:{name:'Identity site',region:'AU',domain:'path-domain'}}});
 s=send(s,{type:'transport',command:{action:'site',id:'room-site',config:{name:'Room site',region:'AU',domain:'path-domain'}}});
 s=send(s,{type:'transport',command:{action:'link',id:'identity-room-link',config:{from:'identity-site',to:'room-site',mode:'owned',capacityMbps:20,latencyMs:18,domain:'path-link',leadMinutes:1,setupCents:0,periodCents:0,contract:null}}});
 s=send(s,{type:'transport',command:{action:'bind',resource:'identity',site:'identity-site'}});
 s=send(s,{type:'transport',command:{action:'bind',resource:'room',site:'room-site'}});
 s=advance(s);
 s=advance(s);
 s=pack(s,{action:'offer',offer:{id:'ms-room-offer',family:'microsoft:meetings-rooms',edition:'scenario-room',unit:'room',quantity:2,features:['room-devices'],dependencies:{identity:'identity',calendar:'room'}}});
 s=pack(s,{action:'offer',offer:{id:'cisco-interop-offer',family:'cisco:meetings-devices',edition:'scenario-interop',unit:'room',quantity:2,features:['interop-join'],dependencies:{'interop-provider':'room',media:'phone'}}});
 s=advance(s);
 s=pack(s,{action:'deploy',id:I.SOURCE_ID,offer:'ms-room-offer',productVersion:'scenario-room-1',mode:'room-deployment',region:'AU',bindings:[{feature:'room-devices',resources:['room']}]});
 s=pack(s,{action:'deploy',id:I.TARGET_ID,offer:'cisco-interop-offer',productVersion:'scenario-interop-1',mode:'interop-bridge',region:'AU',bindings:[{feature:'interop-join',resources:['room']}]});
 s=advance(s);
 s=pack(s,{action:'integration',id:I.EDGE_ID,source:I.SOURCE_ID,target:I.TARGET_ID,features:[{sourceFeature:I.SOURCE_FEATURE,targetFeature:I.TARGET_FEATURE}]});
 s=pack(s,{action:'test-integration',id:I.EDGE_ID});
 assert.equal(s.products.integrations.find(x=>x.id===I.EDGE_ID).result.status,'scenario-verified');
 return s;
}
function book(s){
 const start=s.clock+1,booked=send(s,{type:'information',command:{action:'book',start,end:start+2,attendees:2,event:false,language:'en'}}),booking=booked.information.bookings.at(-1);
 return send(booked,{type:'information',command:{action:'schedule',booking:booking.id}});
}

test('lab dispatch admits a meeting only with a live tested edge, endpoint gates and actual transport path; recovery works after path repair',()=>{
 let s=readyLab();
 s=book(s);s=advance(s);
 let session=s.information.meetingSessions.at(-1);
 assert.equal(session.status,'active');
 assert.equal(session.productIntegration.testAt,s.products.integrations.find(x=>x.id===I.EDGE_ID).result.checkedAt);
 assert.deepEqual(session.productIntegration.path.edges,['identity-room-link']);
 assert.equal(SOC.transport.resourcePath(s,'identity','room','meeting').ready,true);
 s=send(s,{type:'transport',command:{action:'domain',id:'path-link',failed:true}});
 s=advance(s);
 session=s.information.meetingSessions.at(-1);
 assert.equal(session.status,'failed');
 assert.ok(session.reasons.includes('MEETING_PRODUCT_INTEGRATION_UNAVAILABLE'),JSON.stringify(session.reasons));
 s=send(s,{type:'transport',command:{action:'domain',id:'path-link',failed:false}});s=advance(s);
 s=book(s);s=advance(s);
 session=s.information.meetingSessions.at(-1);
 assert.equal(session.status,'active');
 assert.deepEqual(session.productIntegration.path.edges,['identity-room-link']);
 s=advance(s,2);session=s.information.meetingSessions.at(-1);
 assert.equal(session.status,'completed');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=structuredClone(s);forged.information.meetingSessions.at(-1).productIntegration.path.edges=['forged-link'];
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_MEETING_SESSION/);
});

test('lab dispatch refuses a room session when a current endpoint feature gate is unavailable',()=>{
 let s=readyLab();
 s=pack(s,{action:'lifecycle',offer:'cisco-interop-offer',sale:'available',support:'ended'});s=advance(s);
 s=book(s);s=advance(s);
 const session=s.information.meetingSessions.at(-1);
 assert.equal(session.status,'failed');
 assert.ok(session.reasons.includes('MEETING_PRODUCT_INTEGRATION_UNAVAILABLE')||session.reasons.some(x=>x.startsWith('PRODUCT_FEATURE_UNAVAILABLE:interop-join:')));
 assert.equal(session.productIntegration,undefined);
});

test('serialized worker uses the same meeting edge and path checks as root dispatch',()=>{
 let s=readyLab();s=book(s);
 const command={type:'advance',minutes:1},expected=advance(s),box={postMessage:response=>{box.response=response;}};
 vm.createContext(box);vm.runInContext(SOC.workerSource(),box);
 box.onmessage({data:{id:7,state:structuredClone(s),command}});
 assert.deepEqual(JSON.parse(JSON.stringify(box.response.state)),expected);
 assert.equal(box.response.state.information.meetingSessions.at(-1).status,'active');
 assert.equal(box.response.state.information.meetingSessions.at(-1).productIntegration.edgeId,I.EDGE_ID);
});
