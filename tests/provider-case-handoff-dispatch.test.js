const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const CUSTOMER='starter-customer';
const clone=x=>JSON.parse(JSON.stringify(x));
const child=s=>s.portfolio.customers.find(c=>c.id===CUSTOMER).root;
function command(s,c,requestId){return SOC.dispatch(s,{type:'provider',...(requestId?{requestId}:{}),command:c});}
function buy(s,c){const q=SOC.provider.quote(s,c);assert.deepEqual(q.blockers,[],JSON.stringify(c));return command(s,{...c,quoteRevision:q.atRevision});}
function tick(s){
 s=SOC.dispatch(s,{type:'advance',minutes:1});
 const incident=s.providerCampaign.incidents.find(i=>i.customerId===CUSTOMER&&['active','acknowledged'].includes(i.status));
 if(incident&&!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){
  if(incident.status==='active')s=command(s,{action:'acknowledge-incident',incidentId:incident.id});
  const c={action:'operation',operationId:'repair',customerId:CUSTOMER};
  if(!SOC.provider.quote(s,c).blockers.length)s=buy(s,c);
 }
 return s;
}
function until(s,predicate,limit=180){for(let n=0;n<limit&&!predicate(s);n++)s=tick(s);assert.ok(predicate(s),'bounded actual delivery');return s;}
function opening(withProduct=true){
 let s=SOC.create({experience:'campaign',scenario:'smb',seed:17});
 s=command(s,{action:'staff',engineers:4,support:4});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
 s=until(s,s=>s.providerCampaign.customers[0].status==='active');
 if(!withProduct)return s;
 s=buy(s,{action:'operation',operationId:'cisco-programmable-engagement',customerId:CUSTOMER});
 return until(s,s=>s.providerCampaign.projects.some(p=>p.operationId==='cisco-programmable-engagement'&&p.status==='complete'));
}
function offer(s){for(const j of s.providerCampaign.jobs.filter(j=>j.handoffPlan&&!j.handoff&&j.status==='pending')){const request={action:'handoff-case',customerId:CUSTOMER,jobId:j.id,connectorId:'social-messaging'},q=SOC.provider.quote(s,request);if(!q.blockers.length)return {job:j,request,q};}return null;}
function worker(s,c){let result;const context={postMessage:r=>{result=r;},setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:1,state:clone(s),command:c}});assert.equal(result.error,undefined);return clone(result.state);}

test('AC-SOC-893 a fast Provider batch stops at the first real queued handoff choice and replays in the Worker',()=>{
 let s=opening(),before=null,single=null;
 for(let n=0;n<160;n++){
  before=s;single=SOC.dispatch(before,{type:'advance',minutes:1});
  if(single.providerCampaign.jobs.some(j=>j.status==='pending'&&j.handoffPlan&&!j.handoff))break;
  s=tick(before);
 }
 assert.ok(single.providerCampaign.jobs.some(j=>j.status==='pending'&&j.handoffPlan&&!j.handoff),'the authored choice actually arrived');
 const command={type:'advance',minutes:8,stopOnProviderHandoff:true},batch=SOC.dispatch(before,command);
 assert.equal(batch.clock,single.clock,'batch stops after the first choice minute');
 for(const key of ['providerCampaign','portfolio','business'])assert.deepEqual(batch[key],single[key],`${key} must match a one-minute dispatch`);
 assert.deepEqual(worker(before,command),batch,'the serialized Worker follows the same stop');
 assert.deepEqual(SOC.restore(JSON.stringify(batch)),batch);
 for(const invalid of [false,0,'true'])assert.throws(()=>SOC.dispatch(before,{...command,stopOnProviderHandoff:invalid}),/INVALID_PROVIDER_HANDOFF_STOP/);
 assert.throws(()=>SOC.dispatch(SOC.create({scenario:'smb'}),command),/INVALID_PROVIDER_HANDOFF_STOP/);
});

test('AC-SOC-686 paid Provider hands one authored queued voice case to a real human digital leg without duplicate obligation or billing',()=>{
 let s=opening();s=until(s,s=>!!offer(s),160);const {job,request,q}=offer(s),before=clone(s),cash=s.business.balance.cash,offered=s.providerCampaign.customers[0].metrics.offered;
 assert.equal(q.setupCents,0);assert.deepEqual(q.commercial.variablePrices,{voiceCentsPerMinute:50,messageCentsPerDelivery:75});
 assert.equal(s.providerCampaign.customers[0].period.demandPlan.result.handoffReservations,1);
 const stale=SOC.dispatch(s,{type:'advance',minutes:1});assert.throws(()=>command(stale,{...request,quoteRevision:q.atRevision}),/STALE_PROVIDER_QUOTE/);
 s=command(s,{...request,quoteRevision:q.atRevision},'provider-1');
 const j=s.providerCampaign.jobs.find(j=>j.id===job.id),r=j.handoff,source=child(s).interactions.find(i=>i.id===r.sourceInteractionId),target=child(s).interactions.find(i=>i.id===r.targetInteractionId);
 assert.equal(source.outcome,'CHANNEL_HANDOFF');assert.equal(source.phase,'failed');assert.equal(target.caseId,source.caseId);assert.equal(target.from,source.from);assert.equal(j.status,'pending');assert.equal(j.deadlineAt,job.deadlineAt);assert.equal(s.business.balance.cash,cash);assert.equal(s.providerCampaign.customers[0].metrics.offered,offered);
 assert.deepEqual(command(s,{...request,quoteRevision:q.atRevision},'provider-1'),s,'duplicate request is exactly idempotent');
 assert.throws(()=>command(s,{...request,quoteRevision:s.revision}),/HANDOFF_JOB_INELIGIBLE/);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const step={type:'advance',minutes:1};assert.deepEqual(worker(s,step),SOC.dispatch(SOC.restore(JSON.stringify(s)),step));
 const forged=clone(s);forged.providerCampaign.jobs.find(row=>row.id===job.id).handoff.targetInteractionId=source.id;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/HANDOFF/);
 s=until(s,s=>s.providerCampaign.jobs.find(j=>j.id===job.id)?.status==='completed',24);
 const done=s.providerCampaign.jobs.find(j=>j.id===job.id),digital=child(s).interactions.find(i=>i.id===r.targetInteractionId);
 assert.equal(done.messageCharged,true);assert.equal(digital.phase,'resolved');assert.ok(digital.agent);assert.ok(digital.trace.some(t=>t.code==='HUMAN_HANDOFF'));assert.ok(digital.trace.some(t=>t.code==='AGENT_ASSIGNED'));
 assert.equal(done.voiceMinutes,source.usageMinutes||0);assert.equal(s.providerCampaign.jobs.filter(j=>j.caseId===job.caseId).length,1);
 const boundary=(job.periodIndex+1)*60;s=until(s,s=>s.clock>=boundary,boundary-s.clock+1);
 assert.equal(s.providerCampaign.jobs.find(j=>j.id===job.id).settled,true);assert.equal(s.providerCampaign.customers[0].history.at(-1).due,24);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);assert.deepEqual(before.providerCampaign.jobs.find(j=>j.id===job.id),job,'input owned copy unchanged');
});


test('AC-SOC-687 actual unpaid and mandatory Provider voice cases refuse handoff without changing their case or treasury',()=>{
 let s=opening(false);s=until(s,s=>s.providerCampaign.jobs.some(j=>j.channel==='voice'&&j.status==='pending'),20);
 const job=s.providerCampaign.jobs.find(j=>j.channel==='voice'&&j.status==='pending'),request={action:'handoff-case',customerId:CUSTOMER,jobId:job.id,connectorId:'social-messaging'},before=JSON.stringify(s),q=SOC.provider.quote(s,request);
 assert.ok(q.blockers.includes('PROVIDER_CASE_HANDOFF_AUTHORED_PREFERENCE_REQUIRED'));assert.ok(q.blockers.includes('PROVIDER_CASE_HANDOFF_PAID_CHANNEL_REQUIRED'));
 assert.throws(()=>command(s,{...request,quoteRevision:s.revision}),/PROVIDER_QUOTE_BLOCKED/);assert.equal(JSON.stringify(s),before);
 const unknown=SOC.provider.quote(s,{...request,customerId:'another-customer'});assert.ok(unknown.blockers.includes('PROVIDER_CASE_HANDOFF_JOB_REQUIRED'));
 const wrong=SOC.provider.quote(s,{...request,connectorId:'arbitrary-channel'});assert.ok(wrong.blockers.includes('PROVIDER_CASE_HANDOFF_REQUEST'));
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('AC-SOC-889 scoped handoff policy re-quotes and dispatches an eligible queued case',()=>{
 let s=opening(),first=until(s,s=>!!offer(s),160);s=first;
 const config={action:'configure-handoff-policy',customerId:CUSTOMER,enabled:true,minMinutesRemaining:1,maxPerPeriod:1,maxOpenDigital:1,quoteRevision:s.revision};
 s=command(s,config);assert.equal(SOC.provider.inspect(s).customers[0].handoffPolicy.enabled,true);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const step={type:'advance',minutes:1};assert.deepEqual(worker(s,step),SOC.dispatch(SOC.restore(JSON.stringify(s)),step));
 const handed=s.providerCampaign.jobs.filter(j=>j.customerId===CUSTOMER&&j.handoff);
 assert.equal(handed.length,1);assert.equal(handed[0].caseId,offer(first).job.caseId);
 assert.ok(s.providerCampaign.events.some(e=>e.code==='CUSTOMER_CASE_HANDED_OFF'&&e.jobId===handed[0].id));
 s=SOC.dispatch(s,step);assert.equal(s.providerCampaign.jobs.filter(j=>j.customerId===CUSTOMER&&j.handoff).length,1);
 const malformed=clone(s);malformed.providerCampaign.handoffPolicies[0].maxOpenDigital=99;assert.throws(()=>SOC.restore(JSON.stringify(malformed)),/INVALID_PROVIDER_HANDOFF_POLICY/);
});

test('AC-SOC-890 policy respects deadline guard, disabled state and stale configuration',()=>{
 let s=opening();s=until(s,s=>!!offer(s),160);const request={action:'configure-handoff-policy',customerId:CUSTOMER,enabled:true,minMinutesRemaining:20,maxPerPeriod:1,maxOpenDigital:1,quoteRevision:s.revision};
 assert.throws(()=>command(SOC.dispatch(s,{type:'advance',minutes:1}),request),/STALE_PROVIDER_QUOTE/);
 s=command(s,request);s=SOC.dispatch(s,{type:'advance',minutes:1});assert.equal(s.providerCampaign.jobs.filter(j=>j.handoff).length,0);
 s=command(s,{...request,enabled:false,minMinutesRemaining:1,quoteRevision:s.revision});s=SOC.dispatch(s,{type:'advance',minutes:1});assert.equal(s.providerCampaign.jobs.filter(j=>j.handoff).length,0);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
