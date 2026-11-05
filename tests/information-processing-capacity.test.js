const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const information=require('../src/game/52-information.js');

function fullQueue(){
 const s={clock:12,scenario:'enterprise',jurisdiction:'AU',connected:true,records:[],interactions:[],resources:{}};
 s.information=information.create(s);
 s.information.pipeline.effective=structuredClone(information.schemas.pipeline);
 s.information.jobs=Array.from({length:200},(_,index)=>({
  id:`processing-${index+1}`,source:`record-source-${index+1}`,parent:`record-source-${index+1}`,
  interaction:`interaction-${index+1}`,status:'processing',stage:0,remaining:1,
  plan:structuredClone(s.information.pipeline.effective),reason:null,createdAt:0
 }));
 s.information.nextId=201;
 s.records=s.information.jobs.map(job=>({id:job.source,kind:'recording',interaction:job.interaction,parents:[],region:'AU',retentionDays:30,access:['supervisor'],createdAt:0,expiresAt:43200,held:false,deleted:false,quality:100}));
 const captured={id:'record-captured',kind:'recording',interaction:'interaction-captured',parents:[],region:'AU',retentionDays:30,access:['supervisor'],createdAt:12,expiresAt:43212,held:false,deleted:false,quality:100};
 s.records.push(captured);
 return {s,captured};
}

test('automatic refusal keeps a versioned capture admission and retries it FIFO with its original plan',()=>{
 const {s,captured}=fullQueue(),jobs=structuredClone(s.information.jobs),originalPlan=structuredClone(s.information.pipeline.effective);
 const result=information.enqueue(s,captured,null,{});
 assert.deepEqual(result,{accepted:false,reasons:['PROCESSING_JOB_CAPACITY']});
 assert.deepEqual(s.information.jobs,jobs,'no active or queued job is dropped to make room');
 assert.deepEqual(captured.processingAdmission,{version:1,capturedAt:12,refusedAt:12,refusalAuditId:1,plan:originalPlan});
 assert.equal(s.information.audit.at(-1).code,'PROCESSING_ADMISSION_REFUSED');

 // A real paid configuration can change the live pipeline before capacity frees.
 s.information.pipeline.effective={...structuredClone(originalPlan),steps:['transcription']};
 s.information.jobs[0].status='complete';
 const later={id:'record-later',kind:'recording',interaction:'interaction-later',parents:[],region:'AU',retentionDays:30,access:['supervisor'],createdAt:12,expiresAt:43212,held:false,deleted:false,quality:100};
 s.records.push(later);
 const next=information.enqueue(s,later,null,{});
 assert.deepEqual(next,{accepted:false,reasons:['PROCESSING_JOB_CAPACITY']});
 const retried=s.information.jobs.find(job=>job.source===captured.id);
 assert.ok(retried,'the previously refused capture receives a job when a terminal row frees capacity');
 assert.deepEqual(retried.plan,originalPlan,'recovery uses the plan active when the recording was captured');
 assert.equal(retried.createdAt,12,'the admission is attempted at the next available minute in this unit fixture');
 assert.equal(captured.processingAdmission,undefined,'pending state clears only after a job is actually admitted');
 assert.equal(later.processingAdmission.version,1,'a newer capture cannot leapfrog the older pending item');
 assert.equal(s.information.jobs.length,200);
 assert.equal(s.information.jobPrunedThrough,1);
 information.validate(s);
});

test('a previously refused capture completes its saved pipeline once queue and storage capacity are available',()=>{
 const {s,captured}=fullQueue();information.enqueue(s,captured,null,{});
 for(const job of s.information.jobs)job.status='complete';
 s.resources.speech={effective:{capacity:100,region:'AU'}};
 s.resources.archive={effective:{capacity:100,region:'AU',retentionDays:30,access:['supervisor']}};
 s.information.boundary.effective={processRegions:['AU'],storageRegions:['AU'],readers:['supervisor']};
 const services={speech:{ready:true},archive:{ready:true}};
 s.clock++;information.advance(s,services,()=>{},()=>{});
 assert.equal(captured.processingAdmission,undefined,'real job admission clears the pending record');
 const job=s.information.jobs.find(row=>row.source===captured.id);assert.ok(job);
 for(let minute=0;minute<20&&job.status!=='complete';minute++){s.clock++;information.advance(s,services,()=>{},()=>{});}
 assert.equal(job.status,'complete');
 assert.ok(s.records.some(record=>record.kind==='transcription'&&record.interaction===captured.interaction));
});

test('retention expiry cancels pending admission explicitly without creating processing work',()=>{
 const {s,captured}=fullQueue();information.enqueue(s,captured,null,{});
 s.clock=captured.expiresAt;
 information.advance(s,{},()=>{},()=>{});
 assert.equal(captured.deleted,true);
 assert.equal(captured.processingAdmission,undefined);
 assert.equal(s.information.jobs.some(job=>job.source===captured.id),false);
 assert.ok(s.information.audit.some(entry=>entry.code==='PROCESSING_ADMISSION_CANCELLED'&&entry.record===captured.id&&entry.reason==='RETENTION_EXPIRED'));
 assert.doesNotThrow(()=>information.validate(s));
});

test('pending admission rejects unknown versions and mismatched refusal snapshots',()=>{
 const {s,captured}=fullQueue();information.enqueue(s,captured,null,{});
 const saved=structuredClone(s);
 captured.processingAdmission.version=2;
 assert.throws(()=>information.validate(s),/INVALID_PROCESSING_ADMISSION/);
 const forged=structuredClone(saved),record=forged.records.find(x=>x.id==='record-captured');
 record.processingAdmission.plan.steps=['transcription'];
 assert.throws(()=>information.validate(forged),/INVALID_PROCESSING_ADMISSION/);
 const missing=structuredClone(saved),orphan=missing.records.find(x=>x.id==='record-captured');
 orphan.processingAdmission.refusalAuditId=499;
 assert.throws(()=>information.validate(missing),/INVALID_PROCESSING_ADMISSION/);
});

test('explicit processing remains atomic at a full queue; worker source agrees on refusal and retry',()=>{
 const {s,captured}=fullQueue(),before=JSON.stringify(s);
 assert.throws(()=>information.command(s,{action:'process',record:captured.id},{captureOrigin:false}),/PROCESSING_JOB_CAPACITY/);
 assert.equal(JSON.stringify(s),before,'explicit refusal leaves record, jobs, IDs and audit unchanged');

 const worker={};vm.createContext(worker);vm.runInContext(information.source()+';globalThis.INFO=SOC_INFORMATION;',worker);
 const sync=fullQueue(),async=fullQueue();
 const expected=information.enqueue(sync.s,sync.captured,null,{});
 const actual=worker.INFO.enqueue(async.s,async.captured,null,{});
 assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected);
 assert.deepEqual(JSON.parse(JSON.stringify(async.s.information)),sync.s.information);
 sync.s.information.jobs[0].status='complete';async.s.information.jobs[0].status='complete';
 const laterSync={id:'record-later',kind:'recording',interaction:'interaction-later',parents:[],region:'AU',retentionDays:30,access:['supervisor'],createdAt:12,expiresAt:43212,held:false,deleted:false,quality:100};
 const laterWorker=structuredClone(laterSync);sync.s.records.push(laterSync);async.s.records.push(laterWorker);
 information.enqueue(sync.s,laterSync,null,{});worker.INFO.enqueue(async.s,laterWorker,null,{});
 assert.deepEqual(JSON.parse(JSON.stringify(async.s.information)),sync.s.information);
});
