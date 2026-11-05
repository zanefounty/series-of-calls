'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const CENTRAL=require('../src/game/23-provider-central-progression');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility');
const L5=CENTRAL.LEVEL5,L6=CENTRAL.LEVEL6,CUSTOMER='starter-customer';
function child(s,id=CUSTOMER){return s.portfolio.customers.find(x=>x.id===id)?.root;}
function centralHooks(){return {customerRoot:(s,portfolioId)=>s.portfolio.customers.find(x=>x.id===portfolioId)?.root,wholesaleStatement:(s,id)=>SOC.provider.inspect(s).customers.find(x=>x.id===id)?.wholesaleStatement,boundaryCheck:(root,id)=>{const contractId=root.boundaries?.bindings?.[id],contract=root.boundaries?.contracts?.find(x=>x.id===contractId);return contract?{...SOC.boundaries.evaluate(root,contractId),contract,flow:contract.effective?.flows?.find(x=>x.resource===id)}:null;},observeResource:(root,id)=>SOC.observe(root,id)};}
function quoteBuy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],`${s.clock} ${request.operationId||request.stage}: ${q.blockers.join(',')} mission=${JSON.stringify(s.providerCampaign.mission)} global=${JSON.stringify(s.providerCampaign.periodHistory.at(-1))}`);return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});}
function rehash(receipt){const unsigned={...receipt};delete unsigned.integrity;let value=0x811c9dc5;for(const char of JSON.stringify(unsigned)){value^=char.charCodeAt(0);value=Math.imul(value,0x01000193);}receipt.integrity=(value>>>0).toString(16).padStart(8,'0');return receipt;}
function tick(s,n=1){for(let i=0;i<n;i++)s=SOC.dispatch(s,{type:'advance',minutes:1});return s;}
function until(s,predicate,max=400){for(let i=0;i<max&&!predicate(s);i++)s=tick(s);assert.ok(predicate(s),`fixture did not reach expected state by ${s.clock}`);return s;}
function buyStages(s,offerId,customerId,planId='swift'){
 for(const stage of ['base','carrier','partner'])s=quoteBuy(s,{action:'purchase',offerId,planId,stage,...(stage==='base'?{}:{customerId})});
 return s;
}
function operationEventually(s,operationId,customerId=CUSTOMER){
 for(let n=0;n<160;n++){
  const request={action:'operation',operationId,customerId},q=SOC.provider.quote(s,request);
  if(!q.blockers.length){s=SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});return until(s,x=>x.providerCampaign.projects.some(p=>p.customerId===customerId&&p.operationId===operationId&&p.status==='complete'),180);}
  assert.ok(q.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(x)),`${operationId} blockers: ${q.blockers.join(',')}`);s=tick(s);
 }
 assert.fail(`${operationId} did not become fundable`);
}
function maintainGovernment(s){
 for(const incident of s.providerCampaign.incidents.filter(x=>x.status==='active')){
  s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
  s=operationEventually(s,'repair',incident.customerId);
 }
 return s;
}
function maintainedTick(s){s=maintainGovernment(s);for(const c of s.providerCampaign.customers.filter(x=>x.status==='renewal'))s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId:c.id}});return tick(s);}
function governmentWin(){
 let s=SOC.create({experience:'campaign',scenario:'government',market:'au-sydney',difficulty:'easy',seed:2});
 s=buyStages(s,'starter',CUSTOMER);
 s=until(s,x=>x.providerCampaign.customers[0].status==='active');
 s=operationEventually(s,'recording');s=operationEventually(s,'transcription');s=operationEventually(s,'compliance');
 s=until(s,x=>x.providerCampaign.incidents.some(i=>i.customerId===CUSTOMER&&i.status==='active'));
 const incident=s.providerCampaign.incidents.find(i=>i.customerId===CUSTOMER&&i.status==='active');assert.equal(incident.kind,'boundary');
 s=maintainGovernment(s);s=until(s,x=>x.providerCampaign.incidents.find(i=>i.id===incident.id)?.status==='resolved');
 while(s.providerCampaign.mission.consecutiveQualifying<2)s=maintainedTick(s);
 assert.ok(s.providerCampaign.customers[0].history.some(h=>h.qualified&&h.evidence.transcripts.length>0));
 s=quoteBuy(s,{action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});
 assert.equal(s.providerCampaign.missionStatus,'won');return s;
}
function level(s,id){return SOC.provider.inspect(s).progression.levels[id];}
function l5Diagnostics(s){return s.providerCampaign.customers.map(c=>{const root=child(s,c.id),work=RESPONSIBILITY.responsibilities(s,c.id,{customerRoot:(state,id)=>state.portfolio.customers.find(x=>x.id===id)?.root,observeResource:(r,id)=>SOC.observe(r,id)}).records.filter(x=>x.role==='msp'),history=c.history.find(x=>x.from===360),rows=SOC.provider.inspect(s).customers.find(x=>x.id===c.id)?.wholesaleStatement?.rows?.filter(x=>x.period===6),jobs=s.providerCampaign.jobs.filter(x=>x.customerId===c.id&&x.channel==='voice'&&x.periodIndex===6&&['completed','late'].includes(x.status)).slice(0,1).map(j=>{const i=root.interactions.find(x=>x.id===j.interactionId),external=i?.trace?.find(x=>x.code==='PROVIDER_EXTERNAL_ADMISSION');return {id:j.id,status:j.status,completedAt:j.completedAt,caseId:j.caseId,contextRetained:j.contextRetained,interaction:i&&{id:i.id,phase:i.phase,startedAt:i.startedAt,finishedAt:i.finishedAt,caseId:i.caseId,agent:i.agent,media:i.media,voicePath:i.voicePath,external,carrier:i.trace.find(x=>x.code==='CARRIER_PATH_ADMITTED')}};});return {id:c.id,status:c.status,acceptedAt:c.retailAgreement.at,history:history&&{period:history.period,from:history.from,to:history.to,qualified:history.qualified,fullPeriod:history.fullPeriod,gross:history.grossRetail,net:history.netRetail,voiceMinutes:history.voiceMinutes,voiceCost:history.voiceCost,messageCost:history.messageCost,wholesale:history.wholesale},support:work.map(x=>({role:x.role,org:x.organisationId,effectiveAt:x.effectiveAt,expiresAt:x.expiresAt,projectId:x.projectId,postingId:x.postingId})),wholesaleRows:rows,voiceJobs:jobs,stages:Object.fromEntries(Object.entries(c.stages).map(([k,v])=>[k,v&&{status:v.status,projectId:v.projectId}])),cisco:s.providerCampaign.projects.filter(p=>p.customerId===c.id&&p.productId==='cisco-provider-operations').map(p=>({id:p.id,status:p.status,completedAt:p.completedAt,postingId:p.postingId}))};});}

test('Government specialist readiness requires the paid boundary incident recovery and earned mission victory',()=>{
 let s=governmentWin();const row=level(s,L6),incident=s.providerCampaign.incidents.find(i=>i.customerId===CUSTOMER),repair=s.providerCampaign.projects.find(p=>p.id===row.evidence?.boundaryRecovery?.repairProjectId);
 assert.equal(row.status,'ready',JSON.stringify({missing:row.missing,mission:s.providerCampaign.missionStatus,proof:s.providerCampaign.mission.victoryProof,incident,repair,gov:child(s).providerGovernment,repairProjects:s.providerCampaign.projects.filter(x=>x.operationId==='repair'),history:s.providerCampaign.customers[0].history.slice(-3).map(h=>({period:h.period,qualified:h.qualified,evidence:h.evidence,from:h.from,to:h.to})),speech:child(s).boundaries.contracts.find(x=>x.id===child(s).boundaries.bindings.speech)}));assert.equal(row.evidence.missionVictory.focusCustomerId,CUSTOMER);
 assert.equal(row.evidence.boundaryRecovery.incidentId,incident.id);assert.equal(row.evidence.boundaryRecovery.repairProjectId,repair.id);
 assert.equal(CENTRAL.validateEvidence(s,L6,row.evidence,centralHooks(),{}),true);
 const pins=CENTRAL.retentionPins(row.evidence,CUSTOMER);assert.ok(pins.incidentIds.includes(incident.id));assert.ok(pins.projectIds.includes(repair.id));assert.ok(pins.processingJobIds.length>0);
 const missingRecovery=structuredClone(row.evidence);delete missingRecovery.boundaryRecovery;assert.equal(CENTRAL.validateEvidence(s,L6,missingRecovery,centralHooks(),{historical:true,claimedAt:s.clock}),false);
 const changedIncident=structuredClone(row.evidence);changedIncident.boundaryRecovery.incidentId='provider-incident-999';assert.equal(CENTRAL.validateEvidence(s,L6,changedIncident,centralHooks(),{historical:true,claimedAt:s.clock}),false);
 const missingVictory=structuredClone(row.evidence);missingVictory.missionVictory.periods[0].qualified=false;assert.equal(CENTRAL.validateEvidence(s,L6,missingVictory,centralHooks(),{historical:true,claimedAt:s.clock}),false);
 const before=s.business.balance.cash;s=SOC.dispatch(s,{type:'provider',command:{action:'claim-progression',sourceId:L6,quoteRevision:s.revision}});
 assert.equal(s.business.balance.cash,before,'qualification grants no cash');assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const marker=child(s).providerCentralPins;assert.ok(marker.pins.incidentIds.includes(incident.id));assert.ok(marker.pins.projectIds.includes(repair.id));
});

test('unrecovered boundary variant and ordinary eligible flows alone do not satisfy Level 6',()=>{
 let s=SOC.create({experience:'campaign',scenario:'government',market:'au-sydney',difficulty:'easy',seed:2});s=buyStages(s,'starter',CUSTOMER);s=until(s,x=>x.providerCampaign.customers[0].status==='active');
 s=operationEventually(s,'recording');s=operationEventually(s,'transcription');s=operationEventually(s,'compliance');
 s=until(s,x=>x.providerCampaign.incidents.some(i=>i.customerId===CUSTOMER&&i.status==='active'));
 const blocked=level(s,L6);assert.equal(blocked.status,'incomplete');assert.equal(blocked.evidence,null);
 const root=child(s),speech=root.boundaries.contracts.find(c=>c.id===root.boundaries.bindings.speech);assert.ok(speech);
});

test('Level 5 retains two independent customers only when both have paid MSP, external calls and matching wholesale settlements',()=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',difficulty:'easy',seed:73});
 s=buyStages(s,'starter',CUSTOMER);s=until(s,x=>x.providerCampaign.customers[0].status==='active');
 s=operationEventually(s,'cisco-provider-operations');
 for(let n=0;n<300&&!s.providerCampaign.periodHistory.some(p=>p.focusCustomerId===CUSTOMER&&p.qualified);n++)s=maintainedTick(s);
 assert.ok(s.providerCampaign.periodHistory.some(p=>p.focusCustomerId===CUSTOMER&&p.qualified),JSON.stringify({clock:s.clock,global:s.providerCampaign.periodHistory,customer:s.providerCampaign.customers[0].history,project:s.providerCampaign.projects.filter(p=>p.customerId===CUSTOMER).map(p=>({op:p.operationId,status:p.status,completedAt:p.completedAt})),incident:s.providerCampaign.incidents,balance:s.business.balance}));
 s=until(s,x=>x.providerCampaign.mission.nextOpportunityAvailable,300);
 s=quoteBuy(s,{action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});
 for(const stage of ['carrier','partner'])s=quoteBuy(s,{action:'purchase',offerId:'next-1',planId:'swift',stage,customerId:'next-1-customer'});
 s=until(s,x=>x.providerCampaign.customers.find(c=>c.id==='next-1-customer')?.status==='active');
 for(let n=0;n<300&&s.providerCampaign.missionStatus!=='won';n++)s=maintainedTick(s);
 assert.equal(s.providerCampaign.missionStatus,'won',JSON.stringify({clock:s.clock,mission:s.providerCampaign.mission,periods:s.providerCampaign.periodHistory.slice(-4),customers:s.providerCampaign.customers.map(c=>({id:c.id,status:c.status,termPeriods:c.termPeriods,history:c.history.slice(-4).map(h=>({period:h.period,full:h.fullPeriod,qualified:h.qualified,offered:h.offered,completed:h.completed,onTime:h.completedOnTime,operating:h.operatingResult}))})),incidents:s.providerCampaign.incidents}));
 for(const c of s.providerCampaign.customers.filter(x=>x.status==='renewal'))s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId:c.id}});
 s=SOC.dispatch(s,{type:'provider',command:{action:'continue-career'}});
 s=operationEventually(s,'cisco-provider-operations','next-1-customer');
 for(let n=0;n<500;n++){const a=s.providerCampaign.customers.find(c=>c.id===CUSTOMER),b=s.providerCampaign.customers.find(c=>c.id==='next-1-customer'),products=s.providerCampaign.projects.filter(p=>p.operationId==='cisco-provider-operations'&&p.status==='complete'),eligibleFrom=Math.max(...products.map(p=>p.completedAt));if(a.history.some(h=>h.qualified&&h.from>=eligibleFrom&&b.history.some(k=>k.qualified&&k.period===h.period&&k.from===h.from&&k.to===h.to)))break;s=maintainedTick(s);}
 {const a=s.providerCampaign.customers.find(c=>c.id===CUSTOMER),b=s.providerCampaign.customers.find(c=>c.id==='next-1-customer');assert.ok(a.history.some(h=>h.qualified&&b.history.some(k=>k.qualified&&k.period===h.period&&k.from===h.from&&k.to===h.to)),JSON.stringify({clock:s.clock,mission:s.providerCampaign.missionStatus, customers:s.providerCampaign.customers.map(c=>({id:c.id,status:c.status,activatedAt:c.activatedAt,terms:c.termPeriods,period:c.period,history:c.history.map(h=>({period:h.period,from:h.from,to:h.to,qualified:h.qualified,voiceMinutes:h.voiceMinutes,wholesale:h.wholesale}))})),projects:s.providerCampaign.projects.filter(p=>p.operationId==='cisco-provider-operations').map(p=>({id:p.id,status:p.status,acceptedAt:p.acceptedAt,completedAt:p.completedAt,receipt:p.operationReceipt})),incidents:s.providerCampaign.incidents}));}
 const report=level(s,L5);assert.equal(report.status,'ready',JSON.stringify({missing:report.missing,clock:s.clock,mission:s.providerCampaign.mission,customers:l5Diagnostics(s)}));
 assert.equal(report.evidence.customers.length,2);assert.notEqual(report.evidence.customers[0].tenant,report.evidence.customers[1].tenant);
 for(const row of report.evidence.customers){assert.ok(row.voice.externalCall.dialled.startsWith('+'));assert.ok(row.voice.externalCall.media.in&&row.voice.externalCall.media.out);assert.ok(row.wholesaleStatement.totalCents>0);assert.ok(row.settlement.costs.some(x=>x.reason==='provider-wholesale-period'||x.reason==='provider-operation-period'));}
 assert.equal(CENTRAL.validateEvidence(s,L5,report.evidence,centralHooks(),{}),true);
 assert.equal(CENTRAL.validateEvidence(s,L5,report.evidence,centralHooks(),{historical:true,claimedAt:s.clock}),true,'the exact live L5 proof must survive receipt validation at its claim minute');
 const forged=structuredClone(report.evidence);forged.customers[1]=structuredClone(forged.customers[0]);assert.equal(CENTRAL.validateEvidence(s,L5,forged,centralHooks(), {historical:true,claimedAt:s.clock}),false);
 const claimAt=s.clock,cash=s.business.balance.cash;s=SOC.dispatch(s,{type:'provider',command:{action:'claim-progression',sourceId:L5,quoteRevision:s.revision}});assert.equal(s.business.balance.cash,cash);
 const target=report.evidence.customers[0].customerId,managedTarget=report.evidence.customers[1].customerId,directRequest={action:'operation',operationId:'national-wholesale-headroom',customerId:target},managedRequest={action:'operation',operationId:'managed-national-wholesale-headroom',customerId:managedTarget},direct=SOC.provider.quote(s,directRequest),managed=SOC.provider.quote(s,managedRequest);
 assert.deepEqual(direct.blockers,[]);assert.deepEqual(managed.blockers,[]);assert.deepEqual([direct.setupCents,direct.periodCents,direct.workMinutes,direct.engineers,direct.support],[26000,6000,6,1,0]);assert.deepEqual([managed.setupCents,managed.periodCents,managed.workMinutes,managed.engineers,managed.support],[14000,9000,8,0,1]);
 s=quoteBuy(s,directRequest);s=until(s,x=>x.providerCampaign.projects.some(p=>p.customerId===target&&p.operationId==='national-wholesale-headroom'&&p.status==='complete'),30);
 s=quoteBuy(s,managedRequest);s=until(s,x=>x.providerCampaign.projects.some(p=>p.customerId===managedTarget&&p.operationId==='managed-national-wholesale-headroom'&&p.status==='complete'),30);
 assert.equal(CENTRAL.validateEvidence(s,L5,report.evidence,centralHooks(),{historical:true,claimedAt:claimAt}),true,'paid direct and managed headroom choices do not erase the historical wholesale claim');
 const restoreMutations=[
  r=>{r.support.terms={free:true};},
  r=>{r.support.scope=['unowned-tenant'];},
  r=>{r.support.evidence.sharedWorkforce={engineers:999,support:999};},
  r=>{r.support.terms.engineers=1;r.support.evidence.sharedWorkforce.engineers=1;},
  r=>{r.support.evidence.sharedWorkforce.personMinutes=1;r.support.evidence.sharedWorkforce.billedMinutes=1;},
  r=>{r.support.acceptedAt=0;},
  r=>{r.serviceProjects[0].acceptedAt=999999;},
  r=>{r.support.evidence.stageProjects[0].acceptedAt=999999;},
  r=>{r.support.id='invented-support';}
 ];
 for(const mutate of restoreMutations){
  const forged=structuredClone(s),receipt=forged.providerCampaign.progressionReceipts.receipts.find(x=>x.sourceId===L5),row=receipt?.sourceEvidence?.customers?.[0];assert.ok(row?.support,'public claim retains the exact support snapshot');mutate(row);rehash(receipt);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_PROGRESSION_RECEIPT/,`public restore rejects support forgery: ${JSON.stringify(row.support)}`);
 }
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 s=SOC.dispatch(s,{type:'provider',command:{action:'staff',engineers:1,support:0}});s=tick(s,61);
 assert.equal(SOC.provider.inspect(s).progression.levels[L5].status,'incomplete','current readiness may change when the live team changes');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'the retained claim remains valid after a lawful staff change and rolling samples advance');
 assert.ok(child(s,CUSTOMER).providerCentralPins.pins.jobIds.includes(report.evidence.customers.find(c=>c.customerId===CUSTOMER).voice.jobId));
});
