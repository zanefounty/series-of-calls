"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const H=require('../src/game/23-provider-workforce-history');
const copy=x=>JSON.parse(JSON.stringify(x));
const context=(h,clock)=>{const x=H.at(h,clock,{mode:'current'});return {clock,workforce:{engineers:x.engineers,support:x.support,hourlyCents:10000},payroll:{personMinutes:x.personMinutes,billedMinutes:x.personMinutes,costCents:Math.floor(x.personMinutes*10000/60)}};};
function history(){let h=H.create(0);h=H.resize(h,{at:10,engineers:2,support:0});h=H.resize(h,{at:20,engineers:1,support:2});h=H.resize(h,{at:30,engineers:2,support:1});return h;}
test('historical workforce separates sample boundary from same-minute 1→0→1 commands without adding payroll time',()=>{
 const initial=H.create(),a=H.resize(initial,{at:60,engineers:2,support:0}),b=H.resize(a,{at:60,engineers:2,support:1});
 assert.deepEqual(H.at(a,60),{engineers:2,support:1,personMinutes:180});assert.deepEqual(H.at(a,60,{mode:'current'}),{engineers:2,support:0,personMinutes:180});assert.deepEqual(H.at(a,61),{engineers:2,support:0,personMinutes:182});assert.deepEqual(H.at(b,61),{engineers:2,support:1,personMinutes:183});
 assert.deepEqual(b.resizes.map(x=>x.sequence),[1,2]);assert.equal(H.validate(a,context(a,60)),true);assert.equal(H.validate(b,context(b,60)),true);assert.deepEqual(initial,H.create());assert.equal(a.resizes.length,1);
});
test('integrated person-minutes reflect each paid team interval and validate current roster separately',()=>{
 const h=history(),before=JSON.stringify(h);assert.deepEqual(H.at(h,30),{engineers:1,support:2,personMinutes:80});assert.deepEqual(H.at(h,40),{engineers:2,support:1,personMinutes:110});assert.equal(H.validate(h,context(h,40)),true);
 const wrong=context(h,40);wrong.workforce.engineers=1;wrong.workforce.support=2;assert.throws(()=>H.validate(h,wrong),/CURRENT_TEAM/,'same total payroll does not substitute a different current role allocation');
 const forged=context(h,40);forged.payroll.personMinutes++;assert.throws(()=>H.validate(h,forged),/PAYROLL/);const billed=context(h,40);billed.payroll.billedMinutes++;assert.throws(()=>H.validate(h,billed),/PAYROLL/);const cost=context(h,40);cost.payroll.costCents--;assert.throws(()=>H.validate(h,cost),/PAYROLL/);assert.equal(JSON.stringify(h),before);
});
test('reverse order, broken sequence/from chain and altered canonical initial team refuse',()=>{
 const h=history();assert.throws(()=>H.resize(h,{at:29,engineers:2,support:1}),/RESIZE_ORDER/);
 for(const mutate of [x=>x.resizes.reverse(),x=>x.resizes[1].sequence++,x=>x.resizes[1].from.support=1,x=>x.checkpoint.team.support=2,x=>x.checkpoint.personMinutes=1,x=>x.version=2,x=>x.resizes[0].extra=true]){const bad=copy(h);mutate(bad);assert.throws(()=>H.validate(bad,context(h,40)),/INVALID_PROVIDER_WORKFORCE_HISTORY/);}
 const bad=copy(h);bad.resizes[0].to.support=1;bad.resizes[1].from.support=1;assert.throws(()=>H.validate(bad,context(h,40)),/PAYROLL/,'coordinated changed staff interval must still reconcile original payroll');
 assert.throws(()=>H.validate(h,context(H.create(),20)),/FUTURE/);
});
test('pruning retains the prior boundary anchor and exact later role/minute history',()=>{
 const h=history(),before=JSON.stringify(h),pruned=H.prune(h,22);assert.deepEqual(pruned.checkpoint,{at:21,team:{engineers:1,support:2},personMinutes:53,sequence:2});assert.equal(pruned.resizes.length,1);
 for(let t=21;t<=65;t++)for(const mode of ['sample','current'])assert.deepEqual(H.at(pruned,t,{mode}),H.at(h,t,{mode}));
 assert.throws(()=>H.at(pruned,20),/HISTORY_NOT_RETAINED/);assert.equal(H.validate(pruned,{...context(h,65),oldestSampleAt:22}),true);assert.throws(()=>H.validate(pruned,{...context(h,65),oldestSampleAt:20}),/SAMPLE_RANGE/);
 const atEvent=H.prune(h,21);assert.equal(atEvent.checkpoint.at,20);assert.equal(atEvent.resizes[0].at,20);assert.deepEqual(H.at(atEvent,20),H.at(h,20));assert.deepEqual(H.at(atEvent,20,{mode:'current'}),H.at(h,20,{mode:'current'}));assert.deepEqual(H.prune(pruned,22),pruned);assert.equal(JSON.stringify(h),before);
});
test('empty and zero-person intervals, bounded resize storage and strict options remain explicit',()=>{
 const h=H.resize(H.create(5),{at:5,engineers:0,support:0});assert.deepEqual(H.at(h,5),{engineers:2,support:1,personMinutes:0});assert.deepEqual(H.at(h,6),{engineers:0,support:0,personMinutes:0});assert.equal(H.validate(h,context(h,6)),true);
 assert.throws(()=>H.at(h,4),/HISTORY_NOT_RETAINED/);assert.throws(()=>H.at(h,6,{mode:'invented'}),/READ_MODE/);assert.throws(()=>H.create(-1),/START/);assert.throws(()=>H.resize(h,{at:6,engineers:21,support:0}),/RESIZE_REQUEST/);
 const full=H.create();for(let i=0;i<H.MAX_RESIZES;i++)full.resizes.push({sequence:i+1,at:0,from:{engineers:2,support:1},to:{engineers:2,support:1}});assert.equal(H.validate(full,context(full,1)),true);assert.throws(()=>H.resize(full,{at:1,engineers:2,support:1}),/CAPACITY/);const pruned=H.prune(full,2);assert.equal(pruned.resizes.length,0);assert.equal(H.resize(pruned,{at:2,engineers:2,support:0}).resizes[0].sequence,H.MAX_RESIZES+1);
});
test('serialized worker helper preserves pure historical results and rejects malformed payroll',()=>{
 const sandbox={};vm.createContext(sandbox);vm.runInContext(H.source()+';globalThis.historyApi=SOC_PROVIDER_WORKFORCE_HISTORY;',sandbox);const h=history(),before=JSON.stringify(h),api=sandbox.historyApi;
 assert.deepEqual(copy(api.at(h,25)),H.at(h,25));assert.deepEqual(copy(api.prune(h,22)),H.prune(h,22));assert.equal(api.validate(h,context(h,40)),true);const bad=context(h,40);bad.payroll.costCents=0;assert.throws(()=>api.validate(h,bad),/PAYROLL/);assert.equal(JSON.stringify(h),before);
});
