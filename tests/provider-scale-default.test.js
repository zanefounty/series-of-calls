const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const customerId='starter-customer';
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify(q.blockers));return send(s,{...request,quoteRevision:q.atRevision});}
function advance(s,n){for(let minute=0;minute<n;minute++){
 for(const customer of s.providerCampaign.customers.filter(c=>c.status==='renewal'))if(s.business.solvency.status!=='default')s=send(s,{action:'renew',customerId:customer.id});
 for(const incident of s.providerCampaign.incidents.filter(i=>i.status==='active')){s=send(s,{action:'acknowledge-incident',incidentId:incident.id});const operationId=incident.resource==='service'?'service-repair':'repair',request={action:'operation',operationId,customerId};const quote=SOC.provider.quote(s,request);if(!quote.blockers.length)s=send(s,{...request,quoteRevision:quote.atRevision});}
 s=SOC.dispatch(s,{type:'advance',minutes:1});
 }return s;}
function workerDispatch(s,command){const worker={postMessage:()=>{}};vm.createContext(worker);vm.runInContext(SOC.workerSource()+';globalThis.engine=SOC;',worker);return JSON.parse(JSON.stringify(worker.engine.dispatch(SOC.restore(JSON.stringify(s)),command)));}

test('AC-SOC-873 a prepaid scale window stops future tasks at real Provider default and restores cleanly',()=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'hard',seed:73});
 // Fund the customer stages, BPO capacity and scale workflow through provider quotes.
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 s=advance(s,12);s=buy(s,{action:'operation',operationId:'bpo',customerId});s=advance(s,30);
 s=buy(s,{action:'operation',operationId:'paid-scale-workflow',customerId});s=advance(s,20);
 // This real ongoing commitment raises the recurring exposure. The customer renewal
 // is accepted before the high payroll is committed, preserving its active contract.
 s=buy(s,{action:'operation',operationId:'ms-workplace-calling',customerId});s=advance(s,30);s=advance(s,88);
 assert.equal(s.clock,180);assert.equal(s.providerCampaign.customers[0].status,'renewal');
 s=send(s,{action:'renew',customerId});s=send(s,{action:'staff',engineers:20,support:20});
 s=advance(s,175);assert.equal(s.clock,355);assert.equal(s.business.solvency.status,'grace');assert.equal(s.business.solvency.deadline,360);assert.equal(s.providerCampaign.customers[0].status,'active');

 const project=s.providerCampaign.projects.find(p=>p.operationId==='paid-scale-workflow');assert.equal(project.status,'complete');
 s=send(s,{action:'start-scale-window',projectId:project.id});let run=s.providerCampaign.scaleObservation.runs.at(-1);assert.equal(run.status,'open');assert.equal(run.paidJobs.length,2);
 s=advance(s,5);run=s.providerCampaign.scaleObservation.runs.at(-1);
 assert.equal(s.clock,360);assert.deepEqual(s.business.solvency,{status:'default',payable:533616,firstArrearsAt:300,deadline:360,defaultedAt:360});
 assert.deepEqual(run.scheduleStop,{kind:'provider-default',at:360});assert.equal(run.status,'open');assert.equal(run.paidJobs.length,8,'only schedule slots emitted before the default boundary remain');
 assert.ok(run.paidJobs.every(job=>job.scheduledAt<360));assert.equal(run.paidJobs.filter(job=>job.status==='started').length,1);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'the post-settlement stop and live native window survive save restore');
 const posted=s.business.ledger.filter(e=>e.reason==='provider-scale-voice-usage'&&e.scaleRunId===run.id);
 assert.equal(posted.length,7);for(const entry of posted){const job=run.paidJobs.find(j=>j.id===entry.scaleJobId),interaction=s.portfolio.customers.find(c=>c.id===customerId).root.interactions.find(i=>i.id===entry.interactionId);assert.ok(job&&interaction);assert.equal(entry.quantity,interaction.usageMinutes);assert.equal(entry.cents,job.usageCents);assert.equal(job.usageMinutes,interaction.usageMinutes);}

 const refusal=SOC.provider.quote(s,{action:'operation',operationId:'repair',customerId});assert.ok(refusal.blockers.includes('INSOLVENT'));const unchanged=JSON.stringify(s);assert.throws(()=>send(s,{...refusal.request,quoteRevision:refusal.atRevision}),/PROVIDER_QUOTE_BLOCKED/);assert.equal(JSON.stringify(s),unchanged,'default refusal creates no project or payment');
 const next={type:'advance',minutes:1};assert.deepEqual(workerDispatch(s,next),SOC.dispatch(SOC.restore(JSON.stringify(s)),next),'worker and fallback continuation agree immediately after default');

 s=advance(s,5);run=s.providerCampaign.scaleObservation.runs.at(-1);assert.equal(s.clock,365);assert.equal(run.paidJobs.length,8,'a stopped schedule never emits after default');assert.equal(run.status,'failed');assert.equal(run.scheduleStop.at,360);assert.equal(run.result.status,'failed');assert.equal(run.result.schedule.cancelledTasks,4);assert.equal(run.result.checks.scheduleComplete,false);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);assert.ok(s.business.ledger.filter(e=>e.reason==='provider-scale-voice-usage'&&e.scaleRunId===run.id).every(e=>{const i=s.portfolio.customers.find(c=>c.id===customerId).root.interactions.find(x=>x.id===e.interactionId);return e.quantity===i.usageMinutes&&e.cents===e.quantity*50;}));
});
