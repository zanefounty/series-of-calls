'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const MISSION=require('../src/game/23-provider-owned-site-mission.js');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility.js');
const FACTS=require('../src/game/23-provider-progression.js');

const factHooks={
 customerRoot:(s,id)=>s.portfolio?.customers?.find(row=>row.id===id)?.root||null,
 observeResource:(root,id)=>SOC.observe(root,id)
};
function minute(s){return SOC.dispatch(s,{type:'advance',minutes:1});}
function buy(s,request){const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[],JSON.stringify({request,blockers:quote.blockers}));return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});}
function supportedCustomer(){
 let s=SOC.create({experience:'campaign'});
 for(const stage of ['base','carrier','partner']){
  s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
  while(s.providerCampaign.customers[0].stages[stage].status!=='effective')s=minute(s);
 }
 s=SOC.dispatch(s,{type:'provider',command:{action:'staff',engineers:2,support:1}});
 const repair=()=>{const incident=s.providerCampaign.incidents.find(x=>x.status==='active');if(!incident)return;s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=buy(s,{action:'operation',operationId:'repair',customerId:incident.customerId});};
 while(s.clock<120){repair();s=minute(s);}
 repair();while(s.providerCampaign.incidents.some(x=>x.status==='acknowledged'))s=minute(s);
 return s;
}
function missionSummary(s,customerId='starter-customer'){
 const at=s.clock,scenarios=['defence','enterprise','government','smb'];
 return {version:1,at,missions:scenarios.map((scenario,index)=>({customerId:`${scenario}-winner`,tenant:`tenant-${scenario}`,projectId:`project-${scenario}`,postingId:`entry-${index+1}`,victory:{version:1,eventId:`provider-event-${index+1}`,scenario,at:Math.max(0,at-4+index),focusCustomerId:`${scenario}-focus`,winnerCustomerId:`${scenario}-winner`,qualifiedPeriods:2,nextStage:'base',periods:[{period:1},{period:2}]}}))};
}
function hooks(summary){return {
 currentResponsibility:(s,id)=>RESPONSIBILITY.responsibilities(s,id,{observeResource:factHooks.observeResource}).records.find(x=>x.role==='msp'&&x.customerId===id)||null,
 currentSupportSample:(s)=>FACTS.sampleSupport(s,factHooks),
 validateMissionEvidence:(s,id,value)=>JSON.stringify(value)===JSON.stringify(summary),
 supportSamples:[],factHooks
};}

test('owned-site mission support binds four accepted Provider win references to the actual named MSP customer record',()=>{
 const s=supportedCustomer(),summary=missionSummary(s),h=hooks(summary);
 h.supportSamples=[FACTS.sampleSupport(s,factHooks)];
 const before=JSON.stringify(s),result=MISSION.evaluate(s,'starter-customer',summary,h);
 assert.equal(result.status,'ready',JSON.stringify(result));
 assert.equal(result.evidence.kind,MISSION.KIND);
 assert.equal(result.evidence.missionReferences.length,4);
 assert.deepEqual(result.evidence.missionReferences.map(x=>x.scenario),['defence','enterprise','government','smb']);
 assert.equal(result.evidence.responsibility.role,'msp');
 assert.equal(result.evidence.responsibility.organisationId,'orchard-msp');
 assert.deepEqual(result.evidence.responsibility.evidence.stageProjects.map(x=>x.stageId),['base','carrier','partner']);
 assert.equal(result.evidence.supportSample.at,s.clock);
 assert.equal(result.evidence.payrollPosting.reason,'staff');
 assert.equal(result.evidence.payrollPosting.unit,'person-minute');
 assert.equal(result.evidence.payrollPosting.cents,Math.floor(result.evidence.payrollPosting.quantity*10000/60));
 assert.equal(MISSION.validateEvidence(s,'starter-customer',result.evidence,summary,h),true);
 for(const change of [
  row=>{row.cents++;},
  row=>{row.quantity++;},
  row=>{row.id='entry-999999';},
  row=>{row.reason='provider-implementation';}
 ]){const forged=structuredClone(result.evidence);change(forged.payrollPosting);assert.equal(MISSION.validateEvidence(s,'starter-customer',forged,summary,h),false,'edited or unrelated payroll postings cannot support the proof');}
 assert.equal(JSON.stringify(s),before,'the evidence adapter is a pure projection');
});

test('four victories without current support, another customer MSP record, and altered mission rows remain incomplete',()=>{
 const s=supportedCustomer(),summary=missionSummary(s),h=hooks(summary);
 const unsupported=structuredClone(s);unsupported.business.workforce.support=0;
 const noSupport=MISSION.evaluate(unsupported,'starter-customer',summary,{...h,currentSupportSample:(x)=>FACTS.sampleSupport(x,factHooks)});
 assert.notEqual(noSupport.status,'ready');assert.ok(noSupport.missing.includes('CURRENT_PAID_NAMED_MSP_RESPONSIBILITY_REQUIRED'));
 const wrong=MISSION.evaluate(s,'starter-customer',summary,{...h,currentResponsibility:(state)=>RESPONSIBILITY.responsibilities(state,'starter-customer',{observeResource:factHooks.observeResource}).records.find(x=>x.role==='msp'&&x.customerId==='other-customer')||null});
 assert.notEqual(wrong.status,'ready');
 const missing=structuredClone(summary);missing.missions.pop();
 assert.notEqual(MISSION.evaluate(s,'starter-customer',missing,{...h,validateMissionEvidence:()=>true}).status,'ready');
});

test('historical support survives a later staff reduction only through the trusted retained snapshot hook',()=>{
 const s=supportedCustomer(),summary=missionSummary(s),h=hooks(summary);h.supportSamples=[FACTS.sampleSupport(s,factHooks)];
 const result=MISSION.evaluate(s,'starter-customer',summary,h);assert.equal(result.status,'ready',JSON.stringify(result));
 const pinned=structuredClone(result.evidence),later=structuredClone(s);later.business.workforce.support=0;
 const historicalHooks={...h,supportSamples:[FACTS.sampleSupport(s,factHooks)],validateHistoricalSupportSnapshot:(state,id,at,evidence)=>id==='starter-customer'&&at===pinned.at&&JSON.stringify(evidence)===JSON.stringify(pinned)};
 assert.equal(MISSION.validateEvidence(later,'starter-customer',pinned,summary,historicalHooks,{historical:true,claimedAt:pinned.at}),true,'the earned-time support snapshot is checked independently of current staff');
 const pruned=structuredClone(later),postingNumber=Number(pinned.payrollPosting.id.slice(6));
 pruned.business.ledger=pruned.business.ledger.filter(row=>row.id!==pinned.payrollPosting.id);pruned.business.ledgerPrunedThrough=Math.max(pruned.business.ledgerPrunedThrough||0,postingNumber);
 assert.equal(MISSION.validateEvidence(pruned,'starter-customer',pinned,summary,historicalHooks,{historical:true,claimedAt:pinned.at}),true,'a ledger row proven pruned by the checkpoint remains verifiable from the pinned snapshot');
 const aboveCheckpoint=structuredClone(pinned);aboveCheckpoint.payrollPosting.id=`entry-${(pruned.business.ledgerPrunedThrough||0)+1}`;
 assert.equal(MISSION.validateEvidence(pruned,'starter-customer',aboveCheckpoint,summary,{...historicalHooks,validateHistoricalSupportSnapshot:()=>true},{historical:true,claimedAt:aboveCheckpoint.at}),false,'an absent payroll row beyond the ledger pruning checkpoint is not accepted');
 assert.equal(MISSION.validateEvidence(later,'starter-customer',pinned,summary,{...historicalHooks,validateHistoricalSupportSnapshot:undefined},{historical:true,claimedAt:pinned.at}),false,'historical evidence fails closed without parent retained lineage');
 const forged=structuredClone(pinned);forged.responsibility.evidence.sharedWorkforce.support++;
 assert.equal(MISSION.validateEvidence(later,'starter-customer',forged,summary,historicalHooks,{historical:true,claimedAt:forged.at}),false,'rehashing or editing saved staff evidence cannot match the trusted retained snapshot');
});

test('worker source exposes the same pure owned-site mission adapter',()=>{
 const box={};require('node:vm').createContext(box);
 require('node:vm').runInContext(`${FACTS.source()}${MISSION.source()}globalThis.result=SOC_PROVIDER_OWNED_SITE_MISSION;`,box);
 assert.equal(box.result.PACK,MISSION.PACK);
 assert.equal(typeof box.result.evaluate,'function');
 assert.equal(typeof box.result.validateEvidence,'function');
});
