'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const OWN=require('../src/game/23-provider-owned-sites');

const CUSTOMER='starter-customer';
const child=s=>s.portfolio.customers.find(row=>row.id===CUSTOMER).root;
const project=(s,id)=>s.providerCampaign.projects.findLast(row=>row.customerId===CUSTOMER&&row.operationId===id);
function until(s,predicate,limit=180){for(let n=0;n<limit&&!predicate(s);n++)s=SOC.dispatch(s,{type:'advance',minutes:1});assert.ok(predicate(s),`not reached at ${s.clock}`);return s;}
function commit(s,request){const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[],JSON.stringify(quote.blockers));return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});}
function operation(s,id,config){return commit(s,{action:'operation',operationId:id,customerId:CUSTOMER,...(config?{config}:{})});}
function fixture(){
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 for(const stage of ['base','carrier','partner'])s=commit(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
 s=until(s,x=>x.providerCampaign.customers[0].status==='active',30);
 for(const [id,max] of [['cisco-dedicated-uc',60],['primary-upstream',40],['site-diverse-ingress',40],['owned-site-operations',30]]){s=operation(s,id);s=until(s,x=>project(x,id)?.status==='complete',max);}
 const active=s.providerCampaign.incidents.find(row=>row.customerId===CUSTOMER&&['active','acknowledged'].includes(row.status));
 if(active){if(active.status==='active')s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:active.id}});const repair=active.resource==='service'?'service-repair':'repair';s=operation(s,repair);s=until(s,x=>project(x,repair)?.status==='complete',60);}
 s=operation(s,'site-recovery',{kind:'power',targetSite:OWN.SITE_IDS.head});
 s=until(s,x=>project(x,'site-recovery')?.status==='commissioning',20);
 const recovery=project(s,'site-recovery');
 return until(s,x=>{const row=child(x).siteOperations?.exercises.find(e=>e.id===recovery.operationReceipt.exerciseId);return row?.phase==='faulted'&&row.continuity.length>0&&row.continuity.every(call=>call.success);},40);
}

test('internally admitted two-minute site calls are billed only for their two elapsed service minutes',()=>{
 const s=fixture(),root=child(s),recovery=project(s,'site-recovery');
 const rows=root.providerSiteWork.filter(row=>row.projectId===recovery.id);
 assert.ok(rows.some(row=>row.phase==='baseline'));
 assert.ok(rows.some(row=>row.phase==='faulted'));
 for(const row of rows){
  const interaction=root.interactions.find(i=>i.id===row.interactionId);
  assert.equal(interaction.phase,'resolved');
  assert.equal(interaction.durationMinutes,2);
  assert.equal(interaction.finishedAt-interaction.startedAt,2);
  assert.equal(interaction.usageMinutes,2,`site call ${interaction.id} was metered at its admission tick`);
  assert.equal(row.billedMinutes,2);
  const postings=row.postingIds.map(id=>s.business.ledger.find(entry=>entry.id===id));
  assert.equal(postings.reduce((n,entry)=>n+entry.quantity,0),2);
  assert.equal(postings.reduce((n,entry)=>n+entry.cents,0),2*SOC.provider.rules.plans.swift.voiceCents);
 }
});
