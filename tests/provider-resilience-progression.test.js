'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const progression=require('../src/game/23-provider-resilience-progression.js');
const SOC=require('../src/game/55-communications.js');

function state({paid=false}={}){
 const customer={id:'provider-customer',portfolioId:'provider-customer',market:'au-sydney',status:'active'};
 const child={providerCustomer:{version:1,id:customer.id},providerResilience:{version:1,installations:[{projectId:'primary-project',postingId:'entry-1',sites:[],links:[]}]},interactions:[],transport:{sites:{},links:{},domains:{},bindings:{}}};
 const project={id:'primary-project',customerId:customer.id,kind:'operation',operationId:'primary-upstream',status:'complete',acceptedAt:0,completedAt:8,setupCents:48000,postingId:'entry-1'};
 return {experience:{version:1,kind:'campaign',custom:false},clock:12,providerCampaign:{pack:'soc-provider-campaign-1',customers:[customer],projects:[project],jobs:[]},portfolio:{customers:[{id:customer.id,root:child}]},business:{ledger:paid?[{id:'entry-1',category:'cost',reason:'provider-operation',cents:48000,customerId:customer.id,projectId:project.id}]:[],ledgerPrunedThrough:0,solvency:{status:'current',payable:0}}};
}

test('an installation marker without a validated paid posting stays incomplete and inspector-safe',()=>{
 const result=progression.evaluate(state());
 assert.equal(result.goals[progression.LN].status,'incomplete');
 assert.ok(result.goals[progression.LN].missing.includes('PAID_PRIMARY_SITE_PROJECT_REQUIRED'));
 assert.equal(result.goals[progression.RD].status,'incomplete');
});

test('paid project with no effective sites reports measured missing topology instead of throwing',()=>{
 const result=progression.evaluate(state({paid:true}));
 assert.equal(result.goals[progression.LN].status,'incomplete');
 assert.ok(result.goals[progression.LN].missing.includes('TWO_DISTINCT_PAID_SITES_REQUIRED'));
 assert.ok(result.goals[progression.LN].missing.includes('PAID_INTER_SITE_LINK_REQUIRED'));
});

const customerId='starter-customer';
const child=s=>s.portfolio.customers.find(c=>c.id===customerId).root;
const projectFor=(s,operationId)=>s.providerCampaign.projects.findLast(p=>p.customerId===customerId&&p.operationId===operationId);
const request=operationId=>({action:'operation',operationId,customerId});
function buy(s,request){const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[],JSON.stringify({clock:s.clock,request,blockers:quote.blockers}));return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});}
function minute(s,minutes=1){const incident=s.providerCampaign.incidents.find(i=>['active','acknowledged'].includes(i.status)&&i.kind!=='transport-domain');if(incident&&!s.providerCampaign.projects.some(p=>p.operationId==='repair'&&['running','commissioning'].includes(p.status))){if(incident.status==='active')s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});const quote=SOC.provider.quote(s,request('repair'));if(!quote.blockers.length)s=buy(s,request('repair'));}for(const c of s.providerCampaign.customers.filter(c=>c.status==='renewal'))s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId:c.id}});return SOC.dispatch(s,{type:'advance',minutes});}
function until(s,predicate,limit=150){for(let n=0;n<limit&&!predicate(s);n++)s=minute(s);assert.ok(predicate(s),'condition did not become true by '+s.clock);return s;}
function sequenceOpening(){let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});for(const stage of ['base','carrier','partner']){const q=SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'steady',stage,...(stage==='base'?{}:{customerId})});assert.deepEqual(q.blockers,[]);s=SOC.dispatch(s,{type:'provider',command:{action:'purchase',offerId:'starter',planId:'steady',stage,...(stage==='base'?{}:{customerId}),quoteRevision:q.atRevision}});}s=until(s,x=>x.providerCampaign.customers[0].status==='active',30);for(const operationId of ['bpo','carrier-headroom','after-call-assistance','primary-upstream','diverse-upstream']){s=until(s,x=>{const blockers=SOC.provider.quote(x,request(operationId)).blockers;assert.ok(blockers.every(b=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(b)),JSON.stringify({operationId,blockers}));return blockers.length===0;},40);s=buy(s,request(operationId));s=until(s,x=>projectFor(x,operationId).status==='complete',50);}return s;}
const sequenceJob=s=>s.providerCampaign.jobs.find(row=>row.customerId===customerId&&row.resilienceSequence);
const phaseInteraction=(s,index)=>{const phase=sequenceJob(s)?.resilienceSequence.phases[index];return phase&&child(s).interactions.find(row=>row.id===phase.interactionId);};
function repairTransport(s){const incident=s.providerCampaign.incidents.find(row=>row.kind==='transport-domain'&&['active','acknowledged'].includes(row.status));assert.ok(incident,'actual paid-path outage was recorded');if(incident.status==='active')s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});return buy(s,request('transport-repair'));}
function reseal(receipt){delete receipt.integrity;let hash=0x811c9dc5;for(const character of JSON.stringify(receipt)){hash^=character.charCodeAt(0);hash=Math.imul(hash,0x01000193);}receipt.integrity=(hash>>>0).toString(16).padStart(8,'0');}

test('a real paid two-site path and resolved human call make only the LN fact ready',()=>{
 const rootHooks={customerRoot:(s,portfolioId)=>s.portfolio.customers.find(row=>row.id===portfolioId)?.root};
 let s=sequenceOpening();s=until(s,x=>{const job=x.providerCampaign.jobs.find(row=>row.customerId===customerId&&row.resilienceSequence);const phase=job?.resilienceSequence.phases[0],i=phase&&child(x).interactions.find(row=>row.id===phase.interactionId);return i?.phase==='resolved';},100);
 const factsBefore=JSON.stringify(s),report=progression.evaluate(s,rootHooks),ln=report.goals[progression.LN],rd=report.goals[progression.RD];assert.equal(JSON.stringify(s),factsBefore,'projection remains pure');
 assert.equal(ln.status,'ready',JSON.stringify(ln.missing));assert.equal(rd.status,'incomplete');assert.equal(ln.evidence.customerId,customerId);assert.ok(ln.evidence.installation.sites.length===2);assert.equal(ln.evidence.phase.admission.selected.edges[0].id,`${customerId}-a-primary`);
 assert.equal(JSON.stringify(s).includes('progressionReceipts'),false,'facts do not award or mutate a receipt');
 const balance=structuredClone(s.business.balance),command={type:'provider',command:{action:'claim-progression',sourceId:progression.LN,quoteRevision:s.revision}};
 s=SOC.dispatch(s,command);assert.equal(s.business.balance.cash,balance.cash);assert.equal(s.business.balance.debt,balance.debt);assert.equal(s.providerCampaign.progressionReceipts.receipts.length,1);assert.equal(s.providerCampaign.progressionReceipts.receipts[0].sourceId,progression.LN);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const duplicate=SOC.dispatch(s,{type:'provider',command:{action:'claim-progression',sourceId:progression.LN,quoteRevision:s.revision}});assert.equal(duplicate.providerCampaign.progressionReceipts.receipts.length,1);assert.equal(duplicate.providerCampaign.events.filter(row=>row.code==='PROGRESSION_EARNED'&&row.sourceId===progression.LN).length,1);
 s=until(s,x=>phaseInteraction(x,1)?.phase==='resolved',50);s=repairTransport(s);s=until(s,x=>sequenceJob(x)?.status==='completed',30);const period=sequenceJob(s).periodIndex;s=until(s,x=>x.clock===(period+1)*60,60);
 const rdFact=progression.evaluate(s,rootHooks).goals[progression.RD];assert.equal(rdFact.status,'ready',JSON.stringify({missing:rdFact.missing,settlement:sequenceJob(s)?.resilienceSettlement,history:s.providerCampaign.customers[0].history.find(row=>row.period===period),global:s.providerCampaign.periodHistory.find(row=>row.period===period)}));assert.equal(sequenceJob(s).resilienceSettlement.customer.due,24);assert.ok(sequenceJob(s).resilienceSettlement.customer.completedOnTime>=22);assert.ok(sequenceJob(s).resilienceSettlement.provider.operatingResult>0);
 const beforeClaim=structuredClone(s.business.balance),rdCommand={type:'provider',command:{action:'claim-progression',sourceId:progression.RD,quoteRevision:s.revision}};let workerReply;const context={postMessage:value=>workerReply=value};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:'resilience-rd-claim',state:s,command:rdCommand}});assert.equal(workerReply.error,undefined);s=SOC.dispatch(s,rdCommand);assert.deepEqual(JSON.parse(JSON.stringify(workerReply.state)),s,'worker and main issue identical earned receipts');assert.equal(s.business.balance.cash,beforeClaim.cash);assert.equal(s.business.balance.debt,beforeClaim.debt);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);assert.ok(s.providerCampaign.progressionReceipts.receipts.some(row=>row.sourceId===progression.RD));
 for(const mutate of [e=>{e.sequence.phases[0].observedUsageMinutes++;},e=>{e.settlement.core.provider.operatingResult++;}]){const forged=structuredClone(s),receipt=forged.providerCampaign.progressionReceipts.receipts.find(row=>row.sourceId===progression.RD);mutate(receipt.sourceEvidence);reseal(receipt);assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_PROGRESSION_RECEIPT/,'re-hashed sequence or settlement forgery is rejected');}
 const target=(period+26)*60;while(s.clock<target)s=minute(s,Math.min(10,target-s.clock));assert.ok(s.providerCampaign.historyCheckpoint?.periods>period,'the originating period is actually pruned');assert.equal(s.providerCampaign.customers[0].history.some(row=>row.period===period),false);assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'the earned receipt remains valid after its ordinary period rows are pruned');
});
