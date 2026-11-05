'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
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
function opening(){
 let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73,market:'au-sydney'});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 s=until(s,x=>x.providerCampaign.customers[0].status==='active',30);
 s=buy(s,request('room'));s=buy(s,request('recording'));
 return until(s,x=>['room','recording'].every(id=>project(x,id)?.status==='complete'),25);
}
function migrated(operationId){let s=buy(opening(),request(operationId));return until(s,x=>child(x).operations?.migrations.some(m=>m.status==='complete'),50,true);}
const interaction=(s,j)=>child(s).interactions.find(i=>i.id===j.interactionId);

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
