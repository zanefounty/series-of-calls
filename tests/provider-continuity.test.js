const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const C=require('../src/game/23-provider-continuity');

function child(clock=0){return {clock,connected:true,providerCustomer:{version:1,id:'starter-customer'},providerContinuity:C.create(clock),providerArchive:{throughInteractionId:0},interactions:[],records:[]};}
function receipt(projectId,postingId,at){return {projectId,postingId,at};}

test('local autonomy expires from actual disconnection time and paid spares extend it once',()=>{
 const c=child(20),before=JSON.stringify(c.providerContinuity);
 assert.equal(C.observe(c.providerContinuity,20,true).remainingMinutes,30);
 assert.equal(JSON.stringify(c.providerContinuity),before,'observation is pure');
 c.connected=false;c.clock=21;C.advance(c);
 c.clock=50;C.advance(c);
 assert.equal(C.observe(c.providerContinuity,50,false).expired,false,'29 minutes remain supported');
 c.clock=50;C.advance(c);
 assert.equal(C.observe(c.providerContinuity,50,false).expired,false,'29 minutes from the observed outage start remain supported');
 c.clock=51;C.advance(c);
 assert.equal(C.observe(c.providerContinuity,51,false).expired,true,'the original autonomy limit is observable before the paid extension');
 C.installSpares(c.providerContinuity,51,receipt('provider-project-2','entry-12',51));
 assert.equal(c.providerContinuity.autonomyMinutes,60);
 assert.equal(c.providerContinuity.outageExpiredAt,null,'the extension clears the elapsed 30-minute expiry');
 assert.equal(C.observe(c.providerContinuity,80,false).remainingMinutes,1);
 assert.equal(C.observe(c.providerContinuity,80,false).expired,false);
 assert.equal(C.observe(c.providerContinuity,81,false).expired,true);
 c.clock=81;C.advance(c);
 assert.equal(c.providerContinuity.outageExpiredAt,81,'the new expiry follows the original disconnection time');
 assert.throws(()=>C.installSpares(c.providerContinuity,82,receipt('provider-project-3','entry-13',82)),/ALREADY_INSTALLED/);
 assert.equal(C.validate(c),true);
});

test('advance records actual resolved offline work once and reconnect starts a fresh autonomy window next time',()=>{
 const c=child(5),offline={id:'interaction-1',caseId:'case-1',phase:'resolved',finishedAt:7,probe:false,providerContext:{connected:false},records:['record-1']};
 c.records.push({id:'record-1',interaction:'interaction-1',deleted:false});
 c.interactions.push(offline,{id:'interaction-2',caseId:'case-2',phase:'resolved',finishedAt:8,probe:true,providerContext:{connected:false},records:[]},{id:'interaction-3',caseId:'case-3',phase:'resolved',finishedAt:8,probe:false,providerContext:{connected:true},records:[]});
 c.connected=false;c.clock=8;C.advance(c);C.advance(c);
 assert.deepEqual(c.providerContinuity.pending,[{interactionId:'interaction-1',caseId:'case-1',finishedAt:7,recordId:'record-1'}]);
 assert.equal(C.observe(c.providerContinuity,8,false).elapsedMinutes,0);
 c.clock=15;c.connected=true;C.advance(c);
 assert.equal(c.providerContinuity.outageStartedAt,null);
 c.clock=16;c.connected=false;C.advance(c);
 assert.equal(C.observe(c.providerContinuity,16,false).elapsedMinutes,0);
 assert.equal(C.validate(c),true);
});

test('same-minute internal advancement captures a later completion once, including after synchronization',()=>{
 const c=child(10);c.connected=false;C.advance(c);
 const completed={id:'interaction-11',caseId:'case-11',phase:'resolved',finishedAt:10,probe:false,providerContext:{connected:false},records:[]};
 c.interactions.push(completed);C.advance(c);
 assert.equal(C.observe(c.providerContinuity,10,false).pendingCount,1);
 c.connected=true;C.synchronise(c,'all',receipt('provider-project-12','entry-32',10));
 C.advance(c);
 assert.equal(C.observe(c.providerContinuity,10,true).pendingCount,0);
 assert.equal(c.providerContinuity.syncedCheckpoint.total,1,'a same-minute repeat after sync does not re-add delivered work');
 const next=child(10);next.connected=false;C.advance(next);
 next.interactions.push({...completed,id:'interaction-12',caseId:'case-12'});C.advance(next);
 next.clock=11;C.advance(next);
 assert.equal(C.observe(next.providerContinuity,11,false).pendingCount,1,'the previously observed completion remains pending across later minutes');
 assert.equal(C.validate(next),true);
});

test('record-only sync preserves unrecorded obligations; all sync settles the rest only with a real receipt',()=>{
 const c=child(0);c.connected=false;
 for(let n=1;n<=3;n++){
  const i={id:`interaction-${n}`,caseId:`case-${n}`,phase:'resolved',finishedAt:n,probe:false,providerContext:{connected:false},records:n===1?['record-1']:[]};
  c.interactions.push(i);if(n===1)c.records.push({id:'record-1',interaction:i.id,deleted:false});
 }
 c.clock=3;C.advance(c);
 assert.equal(C.observe(c.providerContinuity,4,true).pendingCount,3);
 assert.throws(()=>C.synchronise(c,'records',receipt('provider-project-8','entry-20',5)),/REQUIRES_CONNECTION/);
 c.connected=true;c.clock=4;C.advance(c);
 const records=C.synchronise(c,'records',receipt('provider-project-8','entry-20',4));
 assert.deepEqual({total:records.total,recorded:records.recorded,unrecorded:records.unrecorded},{total:1,recorded:1,unrecorded:0});
 assert.equal(C.observe(c.providerContinuity,4,true).pendingCount,2);
 assert.throws(()=>C.synchronise(c,'all',{projectId:'provider-project-9',postingId:'entry-21',at:5,amount:999}),/RECEIPT_REQUIRED/);
 const all=C.synchronise(c,'all',receipt('provider-project-9','entry-21',4));
 assert.deepEqual({total:all.total,recorded:all.recorded,unrecorded:all.unrecorded},{total:2,recorded:0,unrecorded:2});
 assert.equal(C.observe(c.providerContinuity,4,true).pendingCount,0);
 assert.deepEqual(c.records,[{id:'record-1',interaction:'interaction-1',deleted:false}],'sync bookkeeping creates no records');
 assert.equal(c.providerContinuity.syncedCheckpoint.total,3);
 assert.equal(C.validate(c),true);
});

test('overflow compacts old obligations into typed counters while preserving all sync totals',()=>{
 const c=child(0);c.connected=false;
 for(let n=1;n<=140;n++)c.interactions.push({id:`interaction-${n}`,caseId:`case-${n}`,phase:'resolved',finishedAt:n,probe:false,providerContext:{connected:false},records:n%2===0?[`record-${n}`]:[]});
 for(let n=2;n<=140;n+=2)c.records.push({id:`record-${n}`,interaction:`interaction-${n}`,deleted:false});
 c.clock=140;C.advance(c);
 assert.equal(c.providerContinuity.pending.length,128);
 assert.deepEqual({total:c.providerContinuity.pendingCheckpoint.total,recorded:c.providerContinuity.pendingCheckpoint.recorded,unrecorded:c.providerContinuity.pendingCheckpoint.unrecorded},{total:12,recorded:6,unrecorded:6});
 c.connected=true;c.clock=141;C.advance(c);
 const receiptA=receipt('provider-project-10','entry-30',141);
 const partial=C.synchronise(c,'records',receiptA);
 assert.deepEqual({total:partial.total,recorded:partial.recorded,unrecorded:partial.unrecorded},{total:70,recorded:70,unrecorded:0});
 assert.equal(C.observe(c.providerContinuity,141,true).pendingCount,70);
 const all=C.synchronise(c,'all',receipt('provider-project-11','entry-31',141));
 assert.deepEqual({total:all.total,recorded:all.recorded,unrecorded:all.unrecorded},{total:70,recorded:0,unrecorded:70});
 assert.equal(c.providerContinuity.syncedCheckpoint.total,140);
 assert.equal(C.validate(c),true);
});

test('validation rejects forged continuity lineage and worker source matches synchronous execution',()=>{
 const c=child();c.connected=false;c.clock=1;c.interactions.push({id:'interaction-1',caseId:'case-1',phase:'resolved',finishedAt:1,probe:false,providerContext:{connected:false},records:[]});C.advance(c);
 const bad=structuredClone(c);bad.providerContinuity.pending[0].caseId='case-forged';assert.throws(()=>C.validate(bad),/LINEAGE/);
 const ctx={};vm.createContext(ctx);vm.runInContext(C.source()+';globalThis.workerContinuity=SOC_PROVIDER_CONTINUITY;',ctx);
 const sync=structuredClone(c),worker=structuredClone(c);sync.clock=2;worker.clock=2;sync.interactions.push({id:'interaction-2',caseId:'case-2',phase:'resolved',finishedAt:2,probe:false,providerContext:{connected:false},records:[]});worker.interactions=structuredClone(sync.interactions);
 C.advance(sync);ctx.workerContinuity.advance(worker);
 assert.deepEqual(JSON.parse(JSON.stringify(worker.providerContinuity)),sync.providerContinuity);
 assert.equal(ctx.workerContinuity.validate(worker),true);
});
