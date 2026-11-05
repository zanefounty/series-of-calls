const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const FACTS=require('../src/game/23-provider-progression.js');

const supportSamples=s=>FACTS.decodeSupportObservation(s.providerCampaign.supportObservation);
const oneMinute=s=>SOC.dispatch(s,{type:'advance',minutes:1});
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify({request,blockers:q.blockers}));return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});}
function operation(s,operationId,customerId){return buy(s,{action:'operation',operationId,customerId});}
function project(s,operationId,customerId){return s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId===operationId&&p.status!=='cancelled');}
function stage(s,stageId,customerId,offerId,market){return buy(s,{action:'purchase',offerId,planId:'swift',stage:stageId,...(customerId?{customerId}:{}),...(market?{market}:{})});}
function handleIncidents(s){
 for(const incident of s.providerCampaign.incidents.filter(x=>x.status==='active'))s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
 for(const incident of s.providerCampaign.incidents.filter(x=>x.status==='acknowledged')){
  const pending=s.providerCampaign.projects.some(p=>p.customerId===incident.customerId&&['repair','service-repair'].includes(p.operationId)&&p.status!=='cancelled'&&p.acceptedAt>=incident.acknowledgedAt);
  if(pending)continue;
  const operationId=incident.resource==='service'?'service-repair':'repair',quote=SOC.provider.quote(s,{action:'operation',operationId,customerId:incident.customerId});
  if(!quote.blockers.length)s=SOC.dispatch(s,{type:'provider',command:{action:'operation',operationId,customerId:incident.customerId,quoteRevision:quote.atRevision}});
 }
 return s;
}
function advance(s,minutes=1){for(let i=0;i<minutes;i++){s=handleIncidents(s);for(const customer of s.providerCampaign.customers.filter(c=>c.status==='renewal'))s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId:customer.id}});s=oneMinute(s);}return s;}
function until(s,predicate,limit=420){for(let i=0;i<limit&&!predicate(s);i++)s=advance(s);assert.ok(predicate(s),`condition not reached by minute ${s.clock}; cash=${s.business.balance.cash}; customers=${s.providerCampaign.customers.map(c=>`${c.id}:${c.status}`).join(',')}; projects=${JSON.stringify(s.providerCampaign.projects.filter(p=>p.customerId==='starter-customer'&&['migration','service-boundary-review'].includes(p.operationId)).map(p=>({id:p.id,op:p.operationId,status:p.status,acceptedAt:p.acceptedAt,configSubmittedAt:p.configSubmittedAt,completedAt:p.completedAt,error:p.error,receipt:p.operationReceipt?.kind})))}; child=${JSON.stringify((()=>{const r=s.portfolio.customers.find(c=>c.id==='starter-customer').root;return {placements:r.operations?.placements,migrations:r.operations?.migrations,providerTasks:r.providerTasks,resourceIds:Object.keys(r.resources).filter(x=>x.includes('migration'))};})())}; mission=${s.providerCampaign.missionStatus}; sample=${JSON.stringify(s.providerCampaign.supportObservation?.samples.at(-1)?.participants.map(p=>({id:p.customerId,eligible:p.eligible,missing:p.missing,responsibility:p.responsibility?.id,boundaries:p.boundaries.map(b=>b.id)})))}; window=${JSON.stringify(FACTS.qualifySupportWindow(supportSamples(s)).missing)}`);return s;}
function startCustomer(s,customerId,offerId,market){
 s=stage(s,'base',null,offerId,market);s=until(s,x=>project(x,'purchase',customerId)?.status==='complete'||x.providerCampaign.customers.find(c=>c.id===customerId)?.stages.base?.status==='effective');
 for(const stageId of ['carrier','partner']){s=stage(s,stageId,customerId,offerId);s=until(s,x=>x.providerCampaign.customers.find(c=>c.id===customerId)?.stages[stageId]?.status==='effective');}
 return s;
}
function completeOperation(s,id,customerId){
 let quote=SOC.provider.quote(s,{action:'operation',operationId:id,customerId});
 for(let retry=0;quote.blockers.length&&retry<60;retry++){assert.ok(quote.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(x)),`${id}: ${quote.blockers.join(',')}`);s=advance(s);quote=SOC.provider.quote(s,{action:'operation',operationId:id,customerId});}
 assert.deepEqual(quote.blockers,[],`${id}: ${quote.blockers.join(',')}`);
 s=SOC.dispatch(s,{type:'provider',command:{action:'operation',operationId:id,customerId,quoteRevision:quote.atRevision}});
 return until(s,x=>project(x,id,customerId)?.status==='complete');
}
function setupFirst(s){
 s=startCustomer(s,'starter-customer','starter','au-sydney');
 s=completeOperation(s,'bpo','starter-customer');
 s=until(s,x=>SOC.provider.inspect(x).progression.facts.supportResponsibility.status==='ready',120);
 s=handleIncidents(s);
 for(let attempt=0;attempt<30&&s.providerCampaign.incidents.some(x=>['active','acknowledged'].includes(x.status));attempt++)s=advance(s);
 s=completeOperation(s,'service-boundary-review','starter-customer');
 return s;
}

test('two paid SMB customers qualify from actual 60-minute support samples, fresh human work and central settlements',()=>{
 let s=setupFirst(SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',seed:73}));
 s=until(s,x=>x.providerCampaign.mission.nextOpportunityAvailable,180);
 s=startCustomer(s,'next-1-customer','next-1','au-melbourne');
 s=completeOperation(s,'bpo','next-1-customer');
 s=completeOperation(s,'service-boundary-review','next-1-customer');
 s=until(s,x=>FACTS.qualifySupportWindow(supportSamples(x)).status==='ready'||x.clock>=320,260);
 const sampled=FACTS.qualifySupportWindow(supportSamples(s));assert.ok(sampled.status==='ready',`support window failed: ${JSON.stringify({clock:s.clock,missing:sampled.missing,customers:s.providerCampaign.customers.map(c=>({id:c.id,status:c.status,history:c.history.slice(-2).map(h=>({period:h.period,qualified:h.qualified,due:h.due,failed:h.failed,late:h.late,completedOnTime:h.completedOnTime}))})),incidents:s.providerCampaign.incidents.filter(i=>i.status!=='resolved').map(i=>({id:i.id,status:i.status,resource:i.resource})),samples:supportSamples(s).at(-1)?.participants.map(p=>({id:p.customerId,eligible:p.eligible,missing:p.missing,responsibility:p.responsibility,boundaries:p.boundaries,freshJobs:p.freshJobs,settlements:p.settlements}))})}`);
 const report=SOC.provider.inspect(s).progression;
 assert.equal(report.facts.twoSupportedCustomers.status,'ready');assert.equal(report.levels['progress.progression-level.2'].status,'ready');
 const samples=supportSamples(s),window=FACTS.qualifySupportWindow(samples);
 assert.equal(samples.length,60);assert.deepEqual(window.evidence.interval,{from:samples[0].at-1,to:samples.at(-1).at});assert.deepEqual(window.evidence.customerIds,['next-1-customer','starter-customer']);
 assert.ok(window.evidence.markets.includes('au-sydney')&&window.evidence.markets.includes('au-melbourne'));
 for(const customerId of window.evidence.customerIds){assert.ok(window.evidence.humanJobIds.length>0);assert.ok(window.evidence.settlements.some(x=>x.customerId===customerId));}
 assert.ok(samples.every(x=>x.participants.every(p=>p.eligible&&p.responsibility?.role==='msp'&&p.boundaries.length)));
 const migrationQuote=SOC.provider.quote(s,{action:'operation',operationId:'migration',customerId:'starter-customer'});assert.deepEqual(migrationQuote.blockers,[],JSON.stringify(migrationQuote.blockers));
 s=SOC.dispatch(s,{type:'provider',command:{action:'operation',operationId:'migration',customerId:'starter-customer',quoteRevision:migrationQuote.atRevision}});s=until(s,x=>project(x,'migration','starter-customer')?.status==='complete',100);
 const migratedRoot=s.portfolio.customers.find(c=>c.id==='starter-customer').root,afterMigration=supportSamples(s).at(-1).participants.find(p=>p.customerId==='starter-customer');assert.equal(migratedRoot.operations?.placements?.bea,'migration-phone',JSON.stringify({project:project(s,'migration','starter-customer'),placements:migratedRoot.operations?.placements}));assert.ok(afterMigration.missing.some(x=>x.includes('supported boundary')),JSON.stringify(afterMigration));assert.equal(SOC.provider.inspect(s).progression.levels['progress.progression-level.2'].status,'incomplete','old sampled support is invalid after migration changes its reviewed resource');
 s=completeOperation(s,'service-boundary-review','starter-customer');assert.equal(project(s,'service-boundary-review','starter-customer').operationReceipt.plan.boundaryGeneration,2);
 s=until(s,x=>FACTS.qualifySupportWindow(supportSamples(x)).status==='ready',200);
 const restored=SOC.restore(JSON.stringify(s));assert.deepEqual(restored,s,'current validated support history restores without invention');
 const command={type:'advance',minutes:1},expected=SOC.dispatch(s,command),box={postMessage:r=>box.result=r};vm.createContext(box);vm.runInContext(SOC.workerSource(),box);box.onmessage({data:{id:'support-equal-seed',state:restored,command}});assert.equal(box.result.error,undefined,box.result.error);assert.deepEqual(JSON.parse(JSON.stringify(box.result.state)),expected,'worker and restore sampling produce equal continuation');
 const noSupport=structuredClone(s),quote=SOC.provider.quote(noSupport,{action:'staff',engineers:noSupport.business.workforce.engineers,support:0});assert.deepEqual(quote.blockers,[]);const refused=SOC.dispatch(noSupport,{type:'provider',command:{action:'staff',engineers:noSupport.business.workforce.engineers,support:0}});assert.equal(refused.business.workforce.support,0);assert.equal(SOC.provider.inspect(refused).progression.levels['progress.progression-level.2'].status,'incomplete','same-clock loss of current support suspends eligibility even with a retained past window');
});

test('stale or absent legacy support history never produces Level 2',()=>{
 let s=setupFirst(SOC.create({experience:'campaign',scenario:'smb',seed:73}));
 assert.equal(SOC.provider.inspect(s).progression.levels['progress.progression-level.2'].status,'incomplete');
 const legacy=SOC.create({experience:'campaign',scenario:'smb',seed:73});delete legacy.providerCampaign.supportObservation;
 const restored=SOC.restore(JSON.stringify(legacy));assert.equal(SOC.provider.inspect(restored).progression.levels['progress.progression-level.2'].status,'incomplete');assert.equal(restored.providerCampaign.supportObservation,undefined,'old saves gain no minute samples');
});
