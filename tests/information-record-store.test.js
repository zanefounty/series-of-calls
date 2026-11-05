'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const store=require('../src/game/23-information-record-store.js');

function record(index,{region='AU',archiveId='archive',held=false,deleted=false,kind='recording'}={}){
 return {id:`record-${index}`,kind,interaction:`call-${index}`,parents:[],region,archiveId,held,deleted};
}

test('usage is destination and region scoped, includes held and unannotated records, and excludes only meeting probes and deleted payloads',()=>{
 const rows=[
  record(1,{held:true}),
  record(2,{archiveId:'archive-b'}),
  record(3,{region:'EU'}),
  record(4,{deleted:true}),
  record(5,{kind:'meeting-probe'})
 ];
 assert.deepEqual(store.usage(rows,{resourceId:'archive',region:'AU'}),{used:1,held:1});
 assert.deepEqual(store.usage(rows,{resourceId:'archive-b',region:'AU'}),{used:1,held:0});
 assert.deepEqual(store.usage(rows,{resourceId:'archive',region:'EU'}),{used:1,held:0});
});

test('existing paid twenty-unit capacity admits 2,000 rows and refuses the next without adding a fee',()=>{
 const root={recordStore:store.create(),records:Array.from({length:1999},(_,index)=>record(index+1)),resources:{archive:{kind:'archive'}}};
 const atLimit=store.admission(root,{resourceId:'archive',region:'AU',capacityUnits:20,additional:1});
 assert.deepEqual({accepted:atLimit.accepted,used:atLimit.used,limit:atLimit.limit,required:atLimit.required,reason:atLimit.reason},{accepted:true,used:1999,limit:2000,required:2000,reason:null});
 root.records.push(record(2000));
 const full=store.admission(root,{resourceId:'archive',region:'AU',capacityUnits:20,additional:1});
 assert.equal(full.accepted,false);assert.equal(full.reason,'ARCHIVE_CAPACITY');assert.equal(full.used,2000);
 assert.equal(store.limit(20),2000);
});

test('the representation limit is separate from larger paid capacity and same-market archives cannot borrow units',()=>{
 const root={recordStore:store.create(),records:Array.from({length:2000},(_,index)=>record(index+1)),resources:{archive:{kind:'archive'},'archive-b':{kind:'archive'}}};
 const largerPaid=store.admission(root,{resourceId:'archive',region:'AU',capacityUnits:120,additional:1});
 assert.equal(largerPaid.reason,'RECORD_REPRESENTATION_CAPACITY');
 assert.equal(store.limit(120),12000);
 const otherArchive=store.admission(root,{resourceId:'archive-b',region:'AU',capacityUnits:1,additional:1});
 assert.equal(otherArchive.accepted,true);assert.equal(otherArchive.used,0);
});

test('legacy rows remain capped at 500; version one accepts supported rows but rejects unknown versions and finite row overflow',()=>{
 const legacy={records:Array.from({length:501},(_,index)=>record(index+1))};
 assert.throws(()=>store.validate(legacy),/INVALID_RECORD_STORE_VERSION_REQUIRED/);
 const supported={recordStore:store.create(),records:Array.from({length:501},(_,index)=>record(index+1)),resources:{archive:{kind:'archive'}}};
 assert.equal(store.validate(supported).version,1);
 const overfull={...structuredClone(supported),resources:{archive:{kind:'archive',effective:{capacity:1}}}};
 assert.equal(store.validate(overfull).version,1,'a legitimate downsize does not make retained history unrestorable');
 assert.throws(()=>store.validate({...supported,recordStore:{version:2}}),/INVALID_RECORD_STORE_VERSION/);
 assert.throws(()=>store.validate({...supported,records:Array.from({length:4001},(_,index)=>record(index+1))}),/INVALID_RECORD_STORE_CAPACITY/);
});

test('storage identity conflicts reject and serialized byte reporting uses UTF-8',()=>{
 const bad={recordStore:store.create(),records:[{...record(1),storage:{resourceId:'archive-b'}}],resources:{archive:{kind:'archive'},'archive-b':{kind:'archive'}}};
 assert.throws(()=>store.validate(bad),/INVALID_RECORD_STORE_DESTINATION/);
 const value={label:'queue 🟦'};
 assert.equal(store.serializedBytes(value),new TextEncoder().encode(JSON.stringify(value)).length);
 const root={recordStore:store.create(),records:[],resources:{archive:{kind:'archive'}}};
 const projected=store.admission(root,{resourceId:'archive',region:'AU',capacityUnits:20,candidate:record(1),measureBytes:true});
 assert.equal(projected.projectedBytes,projected.currentBytes+store.serializedBytes(record(1))+1);
 const noEffectiveArchive=store.admission(root,{resourceId:'archive',capacityUnits:0});
 assert.deepEqual(noEffectiveArchive,{accepted:false,used:0,limit:0,required:1,rows:0,rowsLimit:4000,currentBytes:null,projectedBytes:null,reason:'ARCHIVE_RESOURCE_UNAVAILABLE'});
});
