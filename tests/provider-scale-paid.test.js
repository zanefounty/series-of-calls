const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
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
