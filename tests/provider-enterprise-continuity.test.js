'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer';
const child=s=>s.portfolio.customers[0].root;
const tick=s=>SOC.dispatch(s,{type:'advance',minutes:1});
const request=operationId=>({action:'operation',operationId,customerId});
const project=(s,id)=>s.providerCampaign.projects.findLast(p=>p.operationId===id);
function send(s,command){return SOC.dispatch(s,{type:'provider',command});}
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({command,clock:s.clock,blockers:q.blockers}));return send(s,{...command,quoteRevision:q.atRevision});}
function until(s,predicate,limit=150,repair=false){for(let n=0;n<limit&&!predicate(s);n++){s=tick(s);if(repair)s=recover(s);}assert.ok(predicate(s),'condition not reached at '+s.clock);return s;}
function recover(s){
 const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status));if(!incident)return s;
 if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
 if(['running','commissioning'].includes(project(s,'repair')?.status))return s;
 const q=SOC.provider.quote(s,request('repair'));if(q.blockers.length){assert.ok(q.blockers.every(b=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(b)),JSON.stringify(q.blockers));return s;}
 return buy(s,request('repair'));
}
function opening(migrationDecisionVersion,migrationRehearsalVersion){
 let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73,market:'au-sydney',...(migrationDecisionVersion?{migrationDecisionVersion,migrationReservationVersion:1,...(migrationRehearsalVersion?{migrationRehearsalVersion}: {})}:{})});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 s=until(s,x=>x.providerCampaign.customers[0].status==='active',30);
 s=buy(s,request('room'));s=buy(s,request('recording'));
 return until(s,x=>['room','recording'].every(id=>project(x,id)?.status==='complete'),25);
}
function migrated(operationId){let s=buy(opening(),request(operationId));return until(s,x=>child(x).operations?.migrations.some(m=>m.status==='complete'),50,true);}
const interaction=(s,j)=>child(s).interactions.find(i=>i.id===j.interactionId);

test('versioned paid migration waits for a quoted cutover decision and a held plan can resume',()=>{
 let s=buy(opening(1),request('migration'));
 s=until(s,x=>SOC.observe(child(x),'migration-phone').ready,20,true);
 const task=child(s).providerTasks.find(t=>t.decisionVersion===1),funded=project(s,'migration');
 assert.equal(task.projectId,funded.id);assert.equal(task.status,'waiting');
 assert.deepEqual(SOC.provider.inspect(s).migrationDecisions.map(row=>({projectId:row.projectId,status:row.status,cohort:row.cohort,target:row.target,targetReady:row.targetReady})),[{projectId:funded.id,status:'waiting',cohort:['bea'],target:'migration-phone',targetReady:true}]);
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'});dom.window.N_=key=>key;dom.window.SOCProviderCanvas={resourceStatus:()=>''};for(const file of ['23-provider-variants.js','93-ui/70-provider-hud.js','93-ui/74-provider-security.js','93-ui/75-provider-panels.js'])dom.window.eval(fs.readFileSync(path.join(__dirname,'../src/game',file),'utf8'));
 const inspector=dom.window.SOCProviderPanels.inspector(SOC.provider.inspect(s),{selection:{customerId}}),host=dom.window.document.createElement('div');host.innerHTML=inspector;
 assert.equal(host.querySelector('[data-provider-form="migration-decision"]')?.dataset.project,funded.id);
 assert.deepEqual([...host.querySelector('[name="cohort"]').options].map(option=>option.value),['bea','alex-bea']);assert.equal(host.querySelector('[name="cohort"]').value,'bea');
 assert.match(host.textContent,/Migration timeline/);assert.match(host.textContent,/Protect the recorded partner meeting/);
 s=until(s,x=>x.clock>=funded.dueAt+3,20,true);
 assert.equal(child(s).operations.migrations.length,0,'readiness alone cannot schedule a cutover');
 const hold={action:'migration-decision',projectId:funded.id,decision:'hold'},holdQuote=SOC.provider.quote(s,hold);
 assert.deepEqual(holdQuote.blockers,[]);s=send(s,{...hold,quoteRevision:holdQuote.atRevision});
 assert.equal(child(s).providerTasks[0].status,'held');assert.equal(child(s).operations.migrations.length,0);
 let protectedAt=Math.floor(s.clock/60)*60+SOC.provider.rules.missions.enterprise.externalCollaboration.minute;if(protectedAt<=s.clock)protectedAt+=60;
 const protectedQuote=SOC.provider.quote(s,{action:'migration-decision',projectId:funded.id,decision:'go',cutoverAt:protectedAt});
 assert.ok(protectedQuote.blockers.includes('PROTECTED_MEETING_WINDOW'));
 const go={action:'migration-decision',projectId:funded.id,decision:'go',cutoverAt:s.clock+4},goQuote=SOC.provider.quote(s,go);
 assert.deepEqual(goQuote.blockers,[]);const before=JSON.stringify(s);
 const modal=dom.window.document.createElement('div');modal.innerHTML=dom.window.SOCProviderPanels.quote(goQuote,{quoteRequest:go});assert.match(modal.textContent,/Review migration decision/);assert.match(modal.textContent,/No additional setup charge/);assert.match(modal.textContent,/One engineer is reserved/);assert.equal(modal.querySelector('[data-provider-action="confirm-quote"]').disabled,false);
 assert.throws(()=>send(s,{...go,quoteRevision:goQuote.atRevision-1}),/STALE_PROVIDER_QUOTE/);assert.equal(JSON.stringify(s),before);
 s=send(s,{...go,quoteRevision:goQuote.atRevision});const migration=child(s).operations.migrations.at(-1);
 assert.equal(migration.cutoverAt,go.cutoverAt);assert.deepEqual(migration.identities,['bea']);assert.equal(child(s).providerTasks[0].migrationId,migration.id);
 const scheduled=dom.window.document.createElement('div');scheduled.innerHTML=dom.window.SOCProviderPanels.inspector(SOC.provider.inspect(s),{selection:{customerId}});assert.match(scheduled.textContent,/One engineer is reserved/);assert.equal(scheduled.querySelector('[data-provider-form="migration-decision"]'),null);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const altered=structuredClone(s);altered.portfolio.customers[0].root.providerTasks[0].projectId='other-project';assert.throws(()=>SOC.restore(JSON.stringify(altered)),/INVALID_PROVIDER_MIGRATION_DECISION_LINEAGE/);
 dom.window.close();
});

test('coexistence cohort choice sends both identities through the paid cutover and survives save validation',()=>{
 let s=buy(opening(1),request('migration')),projectId=project(s,'migration').id;
 const choice=state=>({action:'migration-decision',projectId,decision:'go',cohort:['alex','bea'],cutoverAt:state.clock+3});
 s=until(s,state=>SOC.provider.quote(state,choice(state)).blockers.length===0,65,true);
 assert.throws(()=>SOC.provider.quote(s,{...choice(s),cohort:['alex']}),/INVALID_PROVIDER_MIGRATION_DECISION/);
 const q=SOC.provider.quote(s,choice(s));assert.deepEqual(q.commercial.migration.cohort,['alex','bea']);assert.deepEqual(q.commercial.migration.engineerReservation,{version:1,engineers:1,fromAt:choice(s).cutoverAt-1,throughAt:choice(s).cutoverAt+1});
 assert.equal(q.setupCents,0,'the funded migration plan receives one setup charge');
 s=send(s,{...choice(s),quoteRevision:q.atRevision});const task=child(s).providerTasks.find(t=>t.projectId===projectId),migration=child(s).operations.migrations.find(m=>m.id===task.migrationId);
 assert.deepEqual(task.cohort,['alex','bea']);assert.deepEqual(migration.identities,task.cohort);assert.equal(migration.target,'migration-phone');
 assert.deepEqual(task.reservation,{version:1,engineers:1,fromAt:migration.cutoverAt-1,throughAt:migration.cutoverAt+1,createdAt:s.clock});
 assert.ok(SOC.provider.quote(s,request('migration-consolidated')).blockers.includes('ENGINEER_CUTOVER_RESERVED'),'a second two-engineer order cannot consume the reserved cutover slot');
 assert.ok(SOC.provider.quote(s,{action:'staff',engineers:0,support:1}).blockers.includes('ENGINEER_CUTOVER_RESERVED'),'the team cannot remove its reserved engineer');
 assert.equal(s.providerCampaign.projects.filter(p=>p.operationId==='migration').length,1);
 s=until(s,state=>child(state).operations.migrations.some(m=>m.id===migration.id&&m.status==='complete'),20,true);
 assert.equal(project(s,'migration').status,'complete');for(const identity of ['alex','bea'])assert.equal(SOC.operations.platform(child(s),identity),'migration-phone');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const altered=structuredClone(s);altered.portfolio.customers[0].root.providerTasks.find(t=>t.projectId===projectId).cohort=['bea'];assert.throws(()=>SOC.restore(JSON.stringify(altered)),/INVALID_PROVIDER_MIGRATION_DECISION_LINEAGE/);
 const forged=structuredClone(s);forged.portfolio.customers[0].root.providerTasks.find(t=>t.projectId===projectId).reservation.throughAt++;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_TASKS|INVALID_PROVIDER_MIGRATION_DECISION_LINEAGE/);
 const erased=structuredClone(s);delete erased.portfolio.customers[0].root.providerTasks.find(t=>t.projectId===projectId).reservation;assert.throws(()=>SOC.restore(JSON.stringify(erased)),/INVALID_PROVIDER_TASKS/);
 const previousVersion=structuredClone(erased);delete previousVersion.migrationReservationVersion;delete previousVersion.portfolio.customers[0].root.providerTasks.find(t=>t.projectId===projectId).reservationVersion;assert.deepEqual(SOC.restore(JSON.stringify(previousVersion)),previousVersion,'older decision saves retain their recorded cutover');
});

test('paid cutover refuses an engineer already occupied by another delivery window',()=>{
 let s=buy(opening(1),request('migration')),migrationProject=project(s,'migration');
 s=until(s,state=>state.clock>=migrationProject.dueAt&&SOC.observe(child(state),'migration-phone').ready,30,true);
 s=send(s,{action:'staff',engineers:1,support:1});
 s=buy(s,request('carrier-headroom'));
 const decision={action:'migration-decision',projectId:migrationProject.id,decision:'go',cutoverAt:s.clock+2},q=SOC.provider.quote(s,decision);
 assert.ok(q.blockers.includes('ENGINEER_CUTOVER_UNAVAILABLE'));
 assert.throws(()=>send(s,{...decision,quoteRevision:q.atRevision}),/PROVIDER_QUOTE_BLOCKED/);
 assert.equal(child(s).operations.migrations.length,0);
});

test('fresh paid migration requires a matching accepted readiness rehearsal before go',()=>{
 let s=buy(opening(1,1),request('migration')),projectId=project(s,'migration').id;
 const cohort=['alex','bea'],decision=state=>({action:'migration-decision',projectId,decision:'rehearse',cohort,cutoverAt:state.clock+3});
 s=until(s,state=>SOC.provider.quote(state,decision(state)).blockers.length===0,65,true);
 const planned=decision(s),premature=SOC.provider.quote(s,{...planned,decision:'go'});
 assert.ok(premature.blockers.includes('MIGRATION_REHEARSAL_REQUIRED'));
 const q=SOC.provider.quote(s,planned);assert.equal(q.commercial.migration.rehearsal.targetReady,true);
 s=send(s,{...planned,quoteRevision:q.atRevision});const rehearsal=child(s).providerTasks.find(t=>t.projectId===projectId).rehearsal;
 assert.deepEqual(rehearsal,{version:1,cohort,cutoverAt:planned.cutoverAt,acceptedAt:s.clock,sourcePlacements:{alex:'phone',bea:'phone'},target:'migration-phone'});
 assert.ok(SOC.provider.quote(s,{...planned,decision:'go',cohort:['bea']}).blockers.includes('MIGRATION_REHEARSAL_REQUIRED'),'a changed cohort needs a new rehearsal');
 assert.ok(SOC.provider.quote(s,{...planned,decision:'go',cutoverAt:planned.cutoverAt+1}).blockers.includes('MIGRATION_REHEARSAL_REQUIRED'),'a changed cutover needs a new rehearsal');
 const go={...planned,decision:'go'},goQuote=SOC.provider.quote(s,go);assert.deepEqual(goQuote.blockers,[]);
 s=send(s,{...go,quoteRevision:goQuote.atRevision});assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=structuredClone(s);forged.portfolio.customers[0].root.providerTasks.find(t=>t.projectId===projectId).rehearsal.cutoverAt++;
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_MIGRATION_DECISION_LINEAGE/);
 const falseSource=structuredClone(s);falseSource.portfolio.customers[0].root.providerTasks.find(t=>t.projectId===projectId).rehearsal.sourcePlacements.bea='migration-phone';
 assert.throws(()=>SOC.restore(JSON.stringify(falseSource)),/INVALID_PROVIDER_MIGRATION_DECISION_LINEAGE/);
});

for(const operationId of ['migration','migration-consolidated'])test(`paid Enterprise ${operationId} preserves identities, number assignments and actual contact work around its cutover`,()=>{
 let s=opening();const before=JSON.stringify(child(s).resources.identity.effective),acceptedAt=s.clock;
 s=buy(s,request(operationId));s=until(s,x=>child(x).operations?.migrations.some(m=>m.status==='complete'),50,true);
 const m=child(s).operations.migrations.find(m=>m.status==='complete'),cutoverAt=m.cutoverAt;
 assert.deepEqual(m.identities,operationId==='migration'?['bea']:['alex','bea']);
 assert.equal(JSON.stringify(child(s).resources.identity.effective),before);
 assert.equal(SOC.operations.platform(child(s),'bea'),operationId==='migration'?'migration-phone':'phone');
 assert.equal(child(s).operations.numbers.find(n=>n.holder==='bea').number,'+61255500201');
 assert.equal(child(s).operations.numbers.find(n=>n.holder==='alex').number,'+61255500101');
 const initialJobs=structuredClone(s.providerCampaign.jobs.filter(j=>j.status==='completed'));
 s=until(s,x=>x.clock>=120,130,true);
 for(const channel of ['voice','message']){
  const jobs=[...initialJobs,...s.providerCampaign.jobs.filter(j=>j.status==='completed')].filter(j=>j.channel===channel);
  assert.ok(jobs.some(j=>j.arrivalAt<cutoverAt),'real '+channel+' work before cutover');
  assert.ok(jobs.some(j=>j.arrivalAt>cutoverAt),'real '+channel+' work after cutover');
  for(const j of jobs){const i=interaction(s,j);assert.equal(i.phase,'resolved');assert.equal(i.caseId,j.caseId);assert.equal(i.context,true);}
 }
 const after=s.providerCampaign.jobs.filter(j=>j.channel==='voice'&&j.status==='completed'&&j.arrivalAt>cutoverAt).map(j=>interaction(s,j));
 for(const identity of ['alex','bea']){
  const target=operationId==='migration'&&identity==='bea'?'migration-phone':'phone';
  assert.ok(after.some(i=>i.from===identity&&i.trace.some(t=>t.code==='CALL_REQUEST'&&t.platform===target)),identity+' must deliver autonomous work on its actual post-cutover platform '+target);
  assert.ok(after.some(i=>i.direction==='inbound'&&i.trace.some(t=>t.code==='INBOUND_NUMBER_ACCEPTED'&&t.holder===identity)&&i.trace.some(t=>t.code==='ORDERED_INBOUND_ROUTE'&&t.platform===target)),identity+' must receive actual autonomous inbound calls on its migrated platform');
 }
 assert.ok(child(s).information.meetingSessions.some(m=>m.status==='completed'&&m.startedAt>cutoverAt&&m.endedAt-m.startedAt===4),'actual duration-bearing meeting after cutover');
 assert.ok(s.providerCampaign.incidents.some(i=>i.status==='resolved'),'room incident receives an actual paid recovery');
 const receipt=s.business.ledger.find(r=>r.id===project(s,operationId).postingId);assert.equal(receipt.cents,project(s,operationId).setupCents);assert.ok(receipt.cents>0);
 assert.ok(acceptedAt<cutoverAt);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 // Real inbound/outbound work and independent room sessions do not prove a
 // supplier number port or room migration. The outage probe below remains Lab.
});

test('Enterprise consolidated delivery occupies the shared engineers and a refused competing order cannot create free work',()=>{
 let s=opening();s=buy(s,request('migration-consolidated'));
 const q=SOC.provider.quote(s,request('carrier-headroom')),before=JSON.stringify(s);
 assert.ok(q.blockers.includes('ENGINEER_CAPACITY'));
 assert.throws(()=>send(s,{...request('carrier-headroom'),quoteRevision:q.atRevision}));assert.equal(JSON.stringify(s),before);
 s=until(s,x=>project(x,'migration-consolidated').status==='complete',30);
 s=buy(s,request('carrier-headroom'));s=until(s,x=>project(x,'carrier-headroom').status==='complete',20);
 assert.equal(child(s).resources.carrier.effective.capacity,8);assert.equal(s.providerCampaign.projects.filter(p=>p.operationId==='carrier-headroom').length,1);
});

test('copied paid Enterprise coexistence routes Bea inbound number through its own platform and a target outage fails only that path',()=>{
 const campaign=migrated('migration'),before=JSON.stringify(campaign);let lab=SOC.dispatch(campaign,{type:'copy-to-lab',customerId});
 const inbound=(state,id)=>{state=SOC.dispatch(state,{type:'interact',channel:'voice',direction:'inbound',from:'+61255500999',to:'+61255500201',caseId:id});for(let n=0;n<10;n++)state=tick(state);return state;};
 lab=inbound(lab,'bea-before');assert.equal(lab.interactions.at(-1).phase,'resolved');
 assert.ok(lab.interactions.at(-1).trace.some(t=>t.code==='ORDERED_INBOUND_ROUTE'&&t.platform==='migration-phone'));
 lab=SOC.dispatch(lab,{type:'fault',id:'migration-phone',fault:'OUTAGE'});lab=inbound(lab,'bea-outage');assert.equal(lab.interactions.at(-1).phase,'failed');
 assert.equal(SOC.observe(lab,'phone').ready,true,'unmigrated platform stays available');
 lab=SOC.dispatch(lab,{type:'fault',id:'migration-phone',fault:null});lab=inbound(lab,'bea-recovered');assert.equal(lab.interactions.at(-1).phase,'resolved');
 assert.equal(lab.operations.numbers.find(n=>n.holder==='bea').number,'+61255500201');assert.equal(JSON.stringify(campaign),before);
 assert.deepEqual(SOC.restore(JSON.stringify(lab)),lab);
});

test('an unrelated paid dedicated product migration cannot certify the Enterprise continuity objective',()=>{
 let s=opening();s=buy(s,request('cisco-dedicated-uc'));
 s=until(s,x=>project(x,'cisco-dedicated-uc').status==='complete',55,true);
 assert.equal(SOC.operations.platform(child(s),'alex'),'dedicated-platform');assert.equal(SOC.operations.platform(child(s),'bea'),'phone');
 assert.equal(s.providerCampaign.projects.some(p=>['migration','migration-consolidated'].includes(p.operationId)),false);
 s=until(s,x=>x.clock>=120,120,true);
 const history=s.providerCampaign.customers[0].history.at(-1);
 assert.ok(history.evidence.meetingSessions.length>0,'unrelated room activity exists to exercise the mission gate');
 assert.equal(history.evidence.migrationComplete,false,'Enterprise migration evidence needs its actual required cohort and continuity, not any completed product migration');
 assert.equal(history.evidence.passed,false);
});


test('Enterprise inbound demand is versioned and old saves keep their original direction mix',()=>{
 let fresh=SOC.create({experience:'campaign',scenario:'enterprise'});
 assert.equal(fresh.providerCampaign.enterpriseContinuityVersion,1);
 for(const version of [null,0,2,'1']){const bad=structuredClone(fresh);bad.providerCampaign.enterpriseContinuityVersion=version;assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_ENTERPRISE_CONTINUITY_VERSION/);}
 delete fresh.providerCampaign.enterpriseContinuityVersion;
 const original=JSON.stringify(fresh);assert.equal(JSON.stringify(SOC.restore(original)),original,'restore does not invent a new demand contract');
 for(const stage of ['base','carrier','partner'])fresh=buy(fresh,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 fresh=until(fresh,s=>s.clock>=45,60);
 assert.equal(child(fresh).interactions.some(i=>i.direction==='inbound'),false);
});
