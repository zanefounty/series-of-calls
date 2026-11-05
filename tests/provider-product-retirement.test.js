'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer',productId='ms-workplace-calling';
const child=s=>s.portfolio.customers[0].root;
const tick=(s,n=1)=>SOC.dispatch(s,{type:'advance',minutes:n});
const op=id=>({action:'operation',operationId:id,customerId});
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({command,blockers:q.blockers,clock:s.clock}));return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
function until(s,predicate,limit=120){for(let n=0;n<limit&&!predicate(s);n++){const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status));if(incident){if(incident.status==='active')s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});if(!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){const q=SOC.provider.quote(s,op('repair'));if(!q.blockers.length)s=buy(s,op('repair'));}}s=tick(s);}assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
function opening(){let s=SOC.create({experience:'campaign',seed:73});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=until(s,x=>x.providerCampaign.customers[0].status==='active');s=buy(s,op('recording'));s=until(s,x=>project(x,'recording').status==='complete');s=buy(s,op(productId));return until(s,x=>project(x,productId).status==='complete');}
const retire=s=>({action:'retire-project',projectId:project(s,productId).id});

test('paid product retirement previews active work, refuses stale commitment, fails actual bound calls and retains recordings',()=>{
 let s=opening();s=until(s,x=>child(x).interactions.some(i=>i.channel==='voice'&&i.phase==='handling'));
 const call=child(s).interactions.find(i=>i.channel==='voice'&&i.phase==='handling'),command=retire(s),before=JSON.stringify(s),q=SOC.provider.quote(s,command);
 assert.equal(JSON.stringify(s),before,'preview is pure');assert.deepEqual(q.blockers,[]);assert.ok(q.commercial.affectedWork.some(w=>w.id===call.id));assert.equal(q.commercial.retainedSetupCents,210000);assert.ok(q.commercial.remainingMinimumSupplierCents>0);
 const changed=tick(s),changedBefore=JSON.stringify(changed);assert.throws(()=>SOC.dispatch(changed,{type:'provider',command:{...command,quoteRevision:q.atRevision}}),/STALE_PROVIDER_QUOTE/);assert.equal(JSON.stringify(changed),changedBefore);
 const cash=s.business.balance.cash,records=child(s).records.map(r=>r.id);s=buy(s,command);assert.equal(s.business.balance.cash,cash,'withdrawal never refunds funded setup');
 const d=child(s).products.deployments.find(d=>d.id==='d-'+productId);assert.equal(d.retirement.status,'pending');assert.equal(d.retirement.effectiveAt,s.clock+1);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);s=tick(s);
 assert.equal(child(s).products.deployments.find(d=>d.id==='d-'+productId).retirement.status,'retired');
 const ended=child(s).interactions.find(i=>i.id===call.id);assert.equal(ended.phase,'failed');assert.equal(ended.outcome,'PRODUCT_FEATURE_UNAVAILABLE');assert.equal(child(s).captureReservations.some(r=>r.id===call.id),false);
 assert.ok(records.every(id=>child(s).records.some(r=>r.id===id)),'retirement does not delete prior records');
 assert.ok(SOC.provider.quote(s,command).blockers.includes('PRODUCT_NOT_RETIRABLE'));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('recommissioning a retired product charges full setup again and resumes actual work after funded delivery',()=>{
 let s=opening(),first=project(s,productId);s=buy(s,retire(s));s=tick(s);const cash=s.business.balance.cash;
 s=buy(s,op(productId));assert.equal(s.business.balance.cash,cash-210000);const second=project(s,productId);assert.notEqual(second.id,first.id);assert.equal(second.status,'running');
 s=until(s,x=>project(x,productId).status==='complete');const at=s.clock;
 s=until(s,x=>x.providerCampaign.jobs.some(j=>j.channel==='voice'&&j.arrivalAt>=at&&j.status==='completed'));
 const d=child(s).products.deployments.find(d=>d.id==='d-'+productId);assert.equal(d.retirement,null);assert.ok(d.retirementHistory.some(r=>r.generation===s.providerCampaign.projects.find(p=>p.id===first.id).retirement.generation));
 assert.equal(s.business.ledger.filter(p=>p.reason==='provider-operation'&&p.operationId===productId).length,2);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('retirement retains the product minimum after exit while retained archives remain separately payable',()=>{
 let s=opening(),p=project(s,productId);s=buy(s,retire(s));const retired=s.providerCampaign.projects.find(x=>x.id===p.id),end=retired.retirement.commitmentEndsAt;
 assert.equal(end,Math.max(s.clock+1,p.completedAt+SOC.provider.rules.missions.smb.termPeriods*60));
 s=buy(s,{action:'exit',customerId});s=until(s,x=>x.clock>=Math.ceil(end/60)*60+60,400);
 const actual=s.business.ledger.filter(x=>x.reason==='provider-operation-period').reduce((n,x)=>n+x.cents,0);
 const recording=project(s,'recording'),exit=s.providerCampaign.customers[0].exitAt;
 let expected=0;for(let boundary=60;boundary<=s.clock;boundary+=60){for(const [work,stop] of [[p,end],[recording,Math.max(exit,recording.completedAt+recording.minimumTermPeriods*60)]]){const to=Math.max(work.completedAt,Math.min(boundary,stop)),from=Math.max(work.completedAt,Math.min(boundary-60,to));expected+=Math.floor(work.periodCents*(to-work.completedAt)/60)-Math.floor(work.periodCents*(from-work.completedAt)/60);}}
 const storage=recording.exitStorage;assert.equal(storage.retainedPeriodCents,3000);expected+=Math.floor(3000*Math.max(0,s.clock-storage.commitmentEndsAt)/60);assert.equal(actual,expected);const latest=s.business.ledger.filter(x=>x.reason==='provider-operation-period').at(-1);assert.equal(latest.cents,3000,'the later full-period bill contains archive storage, not renewed product charges');assert.ok(latest.period>=Math.ceil(end/60));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('forged retirement receipts fail restore and pending retirement continues equally in worker and fallback',()=>{
 let s=opening();s=buy(s,retire(s));const bad=structuredClone(s);project(bad,productId).retirement.commitmentEndsAt=bad.clock;assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_RETIREMENT/);
 let reply;const context={postMessage:value=>reply=value};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:1,state:s,command:{type:'advance',minutes:3}}});assert.equal(reply.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(reply.state)),tick(SOC.restore(JSON.stringify(s)),3));
});


test('removing retirement state or forging a higher active generation cannot bypass a paid recommission',()=>{
 let s=opening();s=tick(buy(s,retire(s)));
 for(const advanceGeneration of [false,true]){const bad=structuredClone(s),d=child(bad).products.deployments.find(d=>d.id==='d-'+productId);delete d.retirement;if(advanceGeneration){d.generation++;d.provisioning.generation=d.generation;}
 assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_(?:PRODUCT_RETIREMENT|PROVIDER_RECOMMISSION)/);}
});


test('new quoted supplier minimums survive direct customer exit without first retiring the product',()=>{
 let s=opening(),work=project(s,productId);assert.equal(s.providerCampaign.contentVersion,'provider-campaigns-7');assert.equal(work.minimumTermPeriods,3);
 const exitQuote=SOC.provider.quote(s,{action:'exit',customerId});assert.ok(exitQuote.commercial.remainingMinimumSupplierCents>=work.periodCents*2);
 s=buy(s,{action:'exit',customerId});const exitAt=s.clock;s=until(s,x=>x.clock>=Math.ceil((work.completedAt+180)/60)*60,300);
 const bills=s.business.ledger.filter(r=>r.reason==='provider-operation-period'&&r.at>exitAt);assert.ok(bills.length>=3,'supplier obligation survives exit in subsequent bills');const recording=project(s,'recording'),storage=recording.exitStorage;assert.equal(storage.retainedPeriodCents,3000);assert.equal(bills.reduce((n,r)=>n+r.cents,0),3*(work.periodCents+recording.periodCents)+Math.floor(3000*Math.max(0,s.clock-storage.commitmentEndsAt)/60));
 const bad=structuredClone(s);delete project(bad,productId).minimumTermPeriods;assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_MINIMUM_TERM/);
});

test('version-two campaigns preserve original operation exit terms and restore without invented commitments',()=>{
 let s=SOC.create({experience:'campaign'});s.providerCampaign.contentVersion='provider-campaigns-2';delete s.providerCampaign.externalCollaborationVersion;const raw=JSON.stringify(s);assert.equal(JSON.stringify(SOC.restore(raw)),raw);
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=until(s,x=>x.providerCampaign.customers[0].status==='active');s=buy(s,op('recording'));s=until(s,x=>project(x,'recording').status==='complete');assert.equal(project(s,'recording').minimumTermPeriods,undefined);
 const work=project(s,'recording');s=buy(s,{action:'exit',customerId});const exitAt=s.clock;s=until(s,x=>x.clock>=120);assert.equal(s.business.ledger.filter(r=>r.reason==='provider-operation-period').reduce((n,r)=>n+r.cents,0),Math.floor(work.periodCents*(exitAt-work.completedAt)/60));assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});


test('exit before supplier submission excludes a cancelled product minimum while retaining its paid setup',()=>{
 let s=SOC.create({experience:'campaign'});for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});s=until(s,x=>x.providerCampaign.customers[0].status==='active');
 const before=SOC.provider.quote(s,{action:'exit',customerId}).commercial.remainingMinimumSupplierCents;s=buy(s,op(productId));const work=project(s,productId),cash=s.business.balance.cash;assert.equal(work.configSubmittedAt,null);
 assert.equal(SOC.provider.quote(s,{action:'exit',customerId}).commercial.remainingMinimumSupplierCents,before);s=buy(s,{action:'exit',customerId});assert.equal(s.business.balance.cash,cash);s=until(s,x=>x.clock>=work.dueAt);assert.equal(project(s,productId).status,'cancelled');
 s=until(s,x=>x.clock>=120);assert.equal(s.business.ledger.some(r=>r.reason==='provider-operation-period'),false);assert.equal(s.business.ledger.find(r=>r.id===work.postingId).cents,210000);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
