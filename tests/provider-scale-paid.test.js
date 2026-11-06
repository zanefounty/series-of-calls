const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const scale=require('../src/game/23-provider-scale-observation.js');
const customerId='starter-customer';
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify(q.blockers));return send(s,{...request,quoteRevision:q.atRevision});}
function advance(s,n=1){for(let minute=0;minute<n;minute++){
 for(const i of s.providerCampaign.incidents.filter(i=>i.status==='active')){s=send(s,{action:'acknowledge-incident',incidentId:i.id});s=buy(s,{action:'operation',operationId:i.resource==='service'?'service-repair':'repair',customerId});}
 s=SOC.dispatch(s,{type:'advance',minutes:1});
}return s;}
const order=(s,operationId)=>buy(s,{action:'operation',operationId,customerId});
const start=(s)=>send(s,{action:'start-scale-window',projectId:s.providerCampaign.projects.at(-1).id});
function opening(){let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});return advance(s,12);}

test('AC-SOC-848 paid Provider scale baseline fails, separately funded BPO/workflow recovers with actual native work and central usage costs',()=>{
 let s=opening();
 const unfunded=SOC.provider.quote(s,{action:'operation',operationId:'paid-scale-workflow',customerId});assert.ok(unfunded.blockers.includes('SCALE_PAID_BPO_CAPACITY_REQUIRED'));
 s=order(s,'paid-scale-baseline');s=advance(s,3);s=start(s);s=advance(s,10);
 assert.equal(s.providerCampaign.scaleObservation.runs[0].status,'failed');assert.equal(s.providerCampaign.scaleObservation.runs[0].paidJobs.length,0);
 s=advance(s,15);s=order(s,'bpo');s=advance(s,8);s=order(s,'paid-scale-workflow');s=advance(s,10);
 const project=s.providerCampaign.projects.at(-1),before=s.providerCampaign.jobs.length;s=start(s);
 assert.equal(s.providerCampaign.jobs.length,before,'paid short tasks do not inflate ordinary campaign demand');
 assert.equal(s.providerCampaign.scaleObservation.runs[1].paidJobs.length,2);
 const saved=JSON.stringify(s);assert.deepEqual(SOC.restore(saved),s);
 // Exit preserves the funded batch and discloses both active and not-yet-emitted work.
 const exitQuote=SOC.provider.quote(s,{action:'exit',customerId});assert.equal(JSON.stringify(s),saved);
 assert.deepEqual(exitQuote.commercial.scaleContinuations,[{runId:'provider-scale-2',projectId:project.id,dueAt:s.clock+10,activeTasks:2,scheduledTasks:10}]);
 let exited=buy(s,{action:'exit',customerId});const ordinaryIds=exited.providerCampaign.jobs.map(j=>j.id);
 exited=SOC.restore(JSON.stringify(exited));exited=advance(exited,10);
 assert.deepEqual(exited.providerCampaign.jobs.map(j=>j.id),ordinaryIds,'exit creates no new ordinary demand');
 const drained=exited.providerCampaign.scaleObservation.runs[1];assert.equal(drained.paidJobs.length,12);assert.ok(drained.paidJobs.every(j=>j.status==='completed'));
 assert.equal(exited.business.ledger.filter(e=>e.reason==='provider-scale-voice-usage').length,12,'continued paid work bills real usage exactly once');
 assert.deepEqual(SOC.restore(JSON.stringify(exited)),exited);
 assert.throws(()=>send(exited,{action:'start-scale-window',projectId:project.id}),/SCALE_PROJECT_ALREADY_USED|SCALE_ACTIVE_CUSTOMER_REQUIRED/);

 s=advance(s,10);const run=s.providerCampaign.scaleObservation.runs[1];
 assert.equal(run.status,'passed',JSON.stringify(run.result));assert.equal(run.paidJobs.length,12);assert.ok(run.attempts.some(a=>a.origin==='ordinary-job'));
 assert.ok(run.paidJobs.every(j=>j.status==='completed'&&j.person&&j.workforceAssignment&&j.usagePostingId));
 const postings=s.business.ledger.filter(e=>e.reason==='provider-scale-voice-usage');assert.equal(postings.length,12);assert.equal(new Set(postings.map(e=>e.id)).size,12);
 assert.equal(postings.reduce((n,e)=>n+e.cents,0),run.result.counts.paidUsageCents);
 assert.throws(()=>send(s,{action:'start-scale-window',projectId:project.id}),/SCALE_PROJECT_ALREADY_USED/);
 // A paid measurement is consumed in both the project and native window. Removing
 // only its summary (even with recomputed derived pins) must never buy a free rerun.
 const scale=require('../src/game/23-provider-scale-observation.js');
 const reject=mutate=>{const bad=structuredClone(s);mutate(bad);const original=JSON.stringify(bad);assert.throws(()=>SOC.restore(original));assert.throws(()=>send(bad,{action:'start-scale-window',projectId:project.id}));assert.equal(JSON.stringify(bad),original);};
 const repin=bad=>{for(const c of bad.portfolio.customers)c.root.providerScalePins=scale.pins(bad.providerCampaign.scaleObservation,c.id);};
 for(const eraseMarker of [false,true])reject(bad=>{bad.providerCampaign.scaleObservation.runs.pop();bad.providerCampaign.scaleObservation.nextId--;repin(bad);if(eraseMarker)delete bad.providerCampaign.projects.find(p=>p.id===project.id).operationReceipt.measurement;});
 reject(bad=>{delete bad.providerCampaign.scaleObservation;for(const c of bad.portfolio.customers)delete c.root.providerScalePins;for(const p of bad.providerCampaign.projects)if(p.operationReceipt)delete p.operationReceipt.measurement;});
 for(const [key,value] of [['durationMinutes',99],['to','+442079460999'],['scope','global'],['language','fr'],['from','alex']])reject(bad=>{const j=bad.providerCampaign.scaleObservation.runs[1].paidJobs[0];bad.portfolio.customers[0].root.interactions.find(i=>i.id===j.interactionId)[key]=value;});
 reject(bad=>{bad.providerCampaign.scaleObservation.runs[1].paidJobs[0].finishedAt++;});
 reject(bad=>{const [first,,third]=bad.providerCampaign.scaleObservation.runs[1].paidJobs;[first.scheduledAt,third.scheduledAt]=[third.scheduledAt,first.scheduledAt];[first.offsetMinute,third.offsetMinute]=[third.offsetMinute,first.offsetMinute];});
 s=send(s,{action:'claim-progression',sourceId:'progress.goal.'+'tb',quoteRevision:s.revision});
 assert.equal(s.providerCampaign.progressionReceipts.receipts.find(r=>r.sourceId==='progress.goal.'+'tb').unlock.operationId,'managed-scale-workflow');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const continued=advance(s,2);assert.equal(continued.business.ledger.filter(e=>e.reason==='provider-scale-voice-usage').length,12);
 const managed=SOC.provider.quote(s,{action:'operation',operationId:'managed-scale-workflow',customerId});assert.deepEqual(managed.blockers,[]);assert.equal(managed.setupCents,36000);assert.equal(managed.periodCents,16000);assert.equal(managed.engineers,0);assert.equal(managed.workMinutes,12);
 s=order(s,'managed-scale-workflow');const managedId=s.providerCampaign.projects.at(-1).id;s=advance(s,13);s=send(s,{action:'start-scale-window',projectId:managedId});s=advance(s,10);
 const managedRun=s.providerCampaign.scaleObservation.runs.find(r=>r.projectId===managedId);assert.equal(managedRun.status,'failed');assert.equal(managedRun.paidJobs.length,12);assert.equal(managedRun.result.checks.nativeWindow.completion,false);
 const failed=managedRun.paidJobs.filter(j=>j.status==='failed');assert.equal(failed.length,2);for(const j of failed)assert.equal(s.portfolio.customers.find(c=>c.id===customerId).root.interactions.find(i=>i.id===j.interactionId).outcome,'SESSION_CAPACITY');
 assert.equal(s.business.ledger.filter(e=>e.reason==='provider-scale-voice-usage').length,22,'only real used minutes are charged, refused sessions add no usage');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=order(s,'carrier-headroom');s=advance(s,8);s=order(s,'managed-scale-workflow');const retryProject=s.providerCampaign.projects.at(-1).id;s=advance(s,13);s=send(s,{action:'start-scale-window',projectId:retryProject});s=advance(s,10);
 const recovered=s.providerCampaign.scaleObservation.runs.find(r=>r.projectId===retryProject);assert.equal(recovered.status,'passed',JSON.stringify(recovered.result));assert.equal(recovered.paidJobs.filter(j=>j.status==='completed').length,12);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const worker={postMessage:()=>{}};vm.createContext(worker);vm.runInContext(SOC.workerSource()+';globalThis.engine=SOC;',worker);
 const command={type:'advance',minutes:1};assert.deepEqual(JSON.parse(JSON.stringify(worker.engine.dispatch(SOC.restore(saved),command))),SOC.dispatch(SOC.restore(saved),command));
 for(const mutate of [s=>{s.providerCampaign.scaleObservation.runs[1].projectId='provider-project-1';},s=>{s.business.ledger.find(e=>e.reason==='provider-scale-voice-usage').quantity++;},s=>{s.providerCampaign.scaleObservation.runs[1].paidJobs[0].usageCents++;}]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>SOC.restore(JSON.stringify(bad)));}
});

test('AC-SOC-870 effective retirement cancels only the un-emitted paid voice schedule and remains bound after restore',()=>{
 let s=opening();s=send(s,{action:'staff',engineers:2,support:2});s=order(s,'bpo');s=advance(s,8);s=order(s,'ms-workplace-calling');const productId=s.providerCampaign.projects.find(p=>p.customerId===customerId&&p.operationId==='ms-workplace-calling').id;s=advance(s,30);s=order(s,'paid-scale-workflow');s=advance(s,10);s=start(s);
 let run=s.providerCampaign.scaleObservation.runs.at(-1);assert.equal(run.version,scale.RUN_VERSION);assert.equal(s.providerCampaign.projects.find(p=>p.id===run.projectId).operationReceipt.measurement.lifecycleVersion,scale.RUN_VERSION);assert.equal(run.paidJobs.length,2);assert.deepEqual(scale.commitments(s.providerCampaign.scaleObservation,customerId),[{runId:run.id,projectId:run.projectId,dueAt:run.dueAt,activeTasks:2,scheduledTasks:10}]);
 const legacy=structuredClone(s),legacyRun=legacy.providerCampaign.scaleObservation.runs.at(-1),legacyProject=legacy.providerCampaign.projects.find(p=>p.id===legacyRun.projectId);legacyRun.version=1;delete legacyProject.operationReceipt.measurement.lifecycleVersion;delete legacy.providerCampaign.scaleObservation.lifecycleVersion;assert.deepEqual(SOC.restore(JSON.stringify(legacy)),legacy,'supported version-one scale save keeps its prior behavior');
 const partialDowngrade=structuredClone(s);partialDowngrade.providerCampaign.scaleObservation.runs.at(-1).version=1;assert.throws(()=>SOC.restore(JSON.stringify(partialDowngrade)),/INVALID_PROVIDER_SCALE_CONSUMPTION/);
 const openingRun=s;
 const q=SOC.provider.quote(s,{action:'retire-project',projectId:productId});assert.deepEqual(q.blockers,[]);assert.deepEqual(q.commercial.scaleWork,[{runId:run.id,projectId:run.projectId,dueAt:run.dueAt,activeTasks:2,scheduledTasks:10,stopAt:q.commercial.effectiveAt,notEmittedIfAccepted:10}]);s=send(s,{...q.request,quoteRevision:q.atRevision});s=SOC.restore(JSON.stringify(s));
 s=advance(s,1);run=s.providerCampaign.scaleObservation.runs.at(-1);assert.equal(run.paidJobs.length,2,'later schedule slots are not emitted');assert.equal(run.status,'open','the native measurement remains open until its authored close');s=SOC.restore(JSON.stringify(s));s=advance(s,9);run=s.providerCampaign.scaleObservation.runs.at(-1);const child=s.portfolio.customers.find(c=>c.id===customerId).root;
 const retired=s.providerCampaign.projects.find(p=>p.id===productId).retirement;assert.equal(retired.effectiveAt,61);assert.deepEqual(run.scheduleStop,{kind:'resource-retirement',at:retired.effectiveAt,projectId:productId});
 assert.equal(run.paidJobs.length,2,'already-emitted work remains for reconciliation');assert.ok(run.paidJobs.every(j=>j.status==='failed'));assert.ok(run.paidJobs.every(j=>child.interactions.find(i=>i.id===j.interactionId)?.outcome==='PRODUCT_FEATURE_UNAVAILABLE'));
 assert.equal(run.status,'failed');assert.equal(run.result.schedule.totalTasks,12);assert.equal(run.result.schedule.emittedTasks,2);assert.equal(run.result.schedule.notEmittedTasks,10);assert.equal(run.result.schedule.cancelledTasks,10);assert.equal(run.result.checks.scheduleComplete,false);
 assert.equal(s.business.ledger.filter(e=>e.reason==='provider-scale-voice-usage'&&e.scaleRunId===run.id).length,0,'refused voice work has no usage');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const viewBefore=JSON.stringify(s);assert.deepEqual(SOC.provider.inspect(s).scaleObservation.runs.at(-1).schedule,scale.scheduleOutcome(s.providerCampaign.scaleObservation,run.id));assert.equal(JSON.stringify(s),viewBefore,'inspection only annotates its returned copy');
 const tampered=structuredClone(s);tampered.providerCampaign.scaleObservation.runs.at(-1).scheduleStop.at++;assert.throws(()=>SOC.restore(JSON.stringify(tampered)),/INVALID_PROVIDER_SCALE_STOP/);
 assert.equal(scale.commitments(s.providerCampaign.scaleObservation,customerId).some(x=>x.runId===run.id),false,'a terminal run has no outstanding commitment');
 const downgraded=structuredClone(s),oldRun=downgraded.providerCampaign.scaleObservation.runs.at(-1);oldRun.version=1;delete downgraded.providerCampaign.scaleObservation.lifecycleVersion;delete downgraded.providerCampaign.projects.find(p=>p.id===oldRun.projectId).operationReceipt.measurement.lifecycleVersion;
 let continuedOld=SOC.restore(JSON.stringify(downgraded));continuedOld=advance(continuedOld,2);assert.equal(continuedOld.providerCampaign.scaleObservation.runs.at(-1).paidJobs.length,2,'downgrading all optional version markers cannot restart a stopped schedule');
 const erased=structuredClone(downgraded),erasedRun=erased.providerCampaign.scaleObservation.runs.at(-1);delete erasedRun.scheduleStop;delete erasedRun.result.schedule;delete erasedRun.result.checks.scheduleComplete;assert.throws(()=>SOC.restore(JSON.stringify(erased)),/INVALID_PROVIDER_SCALE_TASK_SCHEDULE|INVALID_PROVIDER_SCALE_SCHEDULE|INVALID_PROVIDER_SCALE_STOP/);
 const retained=JSON.stringify(run);s=order(s,'ms-workplace-calling');s=advance(s,30);s=order(s,'paid-scale-workflow');s=advance(s,10);s=start(s);s=advance(s,2);
 assert.equal(JSON.stringify(s.providerCampaign.scaleObservation.runs[0]),retained,'paid recommissioning preserves the earlier stopped result');assert.equal(s.providerCampaign.scaleObservation.runs.at(-1).scheduleStop,undefined);assert.equal(s.providerCampaign.scaleObservation.runs.at(-1).paidJobs.length,4,'a separately paid new window uses the recommissioned service');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);


 // Even after every slot emitted, the stop remains bound to retirement history.
 let late=advance(openingRun,9);late=buy(late,{action:'retire-project',projectId:productId});late=advance(late,3);
 const lateRun=late.providerCampaign.scaleObservation.runs.at(-1);assert.equal(lateRun.paidJobs.length,12);assert.equal(lateRun.scheduleStop.at,70);assert.deepEqual(SOC.restore(JSON.stringify(late)),late);
 const erasedLate=structuredClone(late),erasedLateRun=erasedLate.providerCampaign.scaleObservation.runs.at(-1);delete erasedLateRun.scheduleStop;delete erasedLateRun.result.schedule;delete erasedLateRun.result.checks.scheduleComplete;
 assert.throws(()=>SOC.restore(JSON.stringify(erasedLate)),/INVALID_PROVIDER_SCALE_STOP_HISTORY/);assert.throws(()=>SOC.dispatch(erasedLate,{type:'advance',minutes:1}),/INVALID_PROVIDER_SCALE_STOP_HISTORY/);
 let after=advance(openingRun,12);const finished=JSON.stringify(after.providerCampaign.scaleObservation.runs.at(-1));after=buy(after,{action:'retire-project',projectId:productId});after=advance(after,2);assert.equal(JSON.stringify(after.providerCampaign.scaleObservation.runs.at(-1)),finished,'retiring after finalization never rewrites the prior result');assert.deepEqual(SOC.restore(JSON.stringify(after)),after);

 let unrelated=opening();unrelated=send(unrelated,{action:'staff',engineers:2,support:3});unrelated=order(unrelated,'bpo');unrelated=advance(unrelated,8);unrelated=order(unrelated,'recording');unrelated=advance(unrelated,5);unrelated=order(unrelated,'paid-scale-workflow');unrelated=advance(unrelated,10);unrelated=start(unrelated);const recording=unrelated.providerCampaign.projects.find(p=>p.customerId===customerId&&p.operationId==='recording');
 const recordingQuote=SOC.provider.quote(unrelated,{action:'retire-service-project',projectId:recording.id});assert.deepEqual(recordingQuote.blockers,[]);unrelated=send(unrelated,{...recordingQuote.request,quoteRevision:recordingQuote.atRevision});unrelated=advance(unrelated,2);const unrelatedRun=unrelated.providerCampaign.scaleObservation.runs.at(-1);assert.equal(unrelatedRun.scheduleStop,undefined,'recording-only retirement does not cancel unrelated voice load');assert.equal(unrelatedRun.paidJobs.length,4,'the paid voice schedule continues after recording is withdrawn');assert.deepEqual(SOC.restore(JSON.stringify(unrelated)),unrelated);

});
