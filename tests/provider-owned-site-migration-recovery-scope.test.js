'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const OWN=require('../src/game/23-provider-owned-sites');

const CUSTOMER='starter-customer';
const child=s=>s.portfolio.customers.find(row=>row.id===CUSTOMER).root;
const project=(s,id)=>s.providerCampaign.projects.findLast(row=>row.customerId===CUSTOMER&&row.operationId===id);
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function advance(s){for(const c of s.providerCampaign.customers.filter(row=>row.status==='renewal'))s=send(s,{action:'renew',customerId:c.id});return SOC.dispatch(s,{type:'advance',minutes:1});}
function until(s,predicate,limit=180){for(let n=0;n<limit&&!predicate(s);n++)s=advance(s);assert.ok(predicate(s),`condition not reached at minute ${s.clock}`);return s;}
function commit(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,request,blockers:q.blockers}));return send(s,{...request,quoteRevision:q.atRevision});}
function operation(s,id,config){return commit(s,{action:'operation',operationId:id,customerId:CUSTOMER,...(config?{config}:{})});}
function migrationBusy(s,resource){const root=child(s),identity=root.resources[resource]?.effective?.identity||root.resources[resource]?.desired?.identity;return root.transport.reservations.some(r=>[r.from,r.to].includes(resource)||identity&&[r.from,r.to].includes(identity));}
function preparedOwnedSites(){
 let s=SOC.create({experience:'campaign',scenario:'smb',difficulty:'easy',seed:73});
 for(const stage of ['base','carrier','partner'])s=commit(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
 s=until(s,x=>x.providerCampaign.customers[0].status==='active',30);
 for(const [id,limit] of [['cisco-dedicated-uc',60],['primary-upstream',40],['site-diverse-ingress',40],['owned-site-operations',30]]){
  s=operation(s,id);s=until(s,x=>project(x,id)?.status==='complete',limit);
 }
 return s;
}
function migrate(s,config){
  s=operation(s,'site-resource-migration',config);const paid=project(s,'site-resource-migration');
  for(let n=0;n<25&&project(s,'site-resource-migration')?.status!=='complete';n++){
   const internal=child(s).siteOperations.migrations.find(row=>row.id===paid.operationReceipt?.migrationId);
   if(internal?.phase==='partial'&&!migrationBusy(s,config.resourceId)){
    try{s=send(s,{action:'site-response',projectId:paid.id,response:'retry-migration',quoteRevision:s.revision});}
    catch(error){if(!String(error.message).includes('SITE_MIGRATION_ACTIVE_WORK'))throw error;}
   }
   if(project(s,'site-resource-migration')?.status!=='complete')s=advance(s);
  }
  assert.equal(project(s,'site-resource-migration')?.status,'complete',JSON.stringify({clock:s.clock,paid,actual:project(s,'site-resource-migration'),site:child(s).siteOperations&&{bindings:child(s).siteOperations.bindings,migrations:child(s).siteOperations.migrations},transport:child(s).transport&&{reservations:child(s).transport.reservations}}));
 return s;
}
function migrateDesk(s){
 for(const config of [
  {resourceId:'desk',fromSite:OWN.SITE_IDS.head,toSite:OWN.SITE_IDS.branch},
  {resourceId:'dedicated-endpoint',fromSite:OWN.SITE_IDS.branch,toSite:OWN.SITE_IDS.head}
 ]){
  s=migrate(s,config);
  if(config.resourceId==='desk'){
   const before=JSON.stringify(s),request={action:'operation',operationId:'site-recovery',customerId:CUSTOMER,config:{kind:'power',targetSite:OWN.SITE_IDS.head}},quote=SOC.provider.quote(s,request);
   assert.ok(quote.blockers.includes('SITE_RECOVERY_ENDPOINT_ON_EACH_SITE_REQUIRED'));
   assert.throws(()=>send(s,{...request,quoteRevision:quote.atRevision}),/SITE_RECOVERY_ENDPOINT_ON_EACH_SITE_REQUIRED/);
   assert.equal(JSON.stringify(s),before,'refused empty-site exercise leaves paid state unchanged');
  }
 }
 assert.equal(child(s).siteOperations.bindings.desk.site,OWN.SITE_IDS.branch);
 assert.equal(child(s).siteOperations.bindings['dedicated-endpoint'].site,OWN.SITE_IDS.head);
 return s;
}
function repairActive(s){const incident=s.providerCampaign.incidents.find(row=>row.customerId===CUSTOMER&&['active','acknowledged'].includes(row.status));if(!incident)return s;if(incident.status==='active')s=send(s,{action:'acknowledge-incident',incidentId:incident.id});const repair=incident.kind==='transport-domain'?'transport-repair':incident.resource==='service'?'service-repair':'repair';s=operation(s,repair);return until(s,x=>project(x,repair)?.status==='complete',60);}

test('AC-SOC-622 a paid endpoint migration is followed by a real site recovery without invalid route-scope evidence',()=>{
 let s=migrateDesk(preparedOwnedSites()),root=child(s),head=root.siteOperations.sites[OWN.SITE_IDS.head].effective,branch=root.siteOperations.sites[OWN.SITE_IDS.branch].effective;
 s=repairActive(s);root=child(s);head=root.siteOperations.sites[OWN.SITE_IDS.head].effective;branch=root.siteOperations.sites[OWN.SITE_IDS.branch].effective;
 const actualSource=head.endpointResources.find(id=>root.transport.bindings[id]===head.transportSite),actualTarget=branch.endpointResources.find(id=>root.transport.bindings[id]===branch.transportSite);
 const recovery={action:'operation',operationId:'site-recovery',customerId:CUSTOMER,config:{kind:'power',targetSite:OWN.SITE_IDS.head}};
 s=commit(s,recovery);
 s=advance(s);
 const paid=project(s,'site-recovery'),exerciseFor=x=>{const p=project(x,'site-recovery');return child(x).siteOperations.exercises.find(row=>row.id===p?.operationReceipt?.exerciseId);};
 s=until(s,x=>project(x,'site-recovery')?.id===paid.id&&exerciseFor(x)?.phase==='faulted'&&exerciseFor(x)?.continuity.length>0&&exerciseFor(x)?.continuity.every(row=>row.success),35);
 s=send(s,{action:'site-response',projectId:paid.id,response:'recover',quoteRevision:s.revision});
 s=until(s,x=>exerciseFor(x)?.phase==='restoring',20);
 s=send(s,{action:'site-response',projectId:paid.id,response:'restore',quoteRevision:s.revision});
 s=until(s,x=>project(x,'site-recovery')?.id===paid.id&&project(x,'site-recovery')?.status==='complete',35);
 const completed=project(s,'site-recovery'),exercise=child(s).siteOperations.exercises.find(row=>row.id===completed.operationReceipt.exerciseId),baselineWork=child(s).providerSiteWork.find(row=>row.projectId===paid.id&&row.phase==='baseline');
 assert.ok(baselineWork);
 assert.equal(baselineWork.sourceSite,exercise.baseline.sourceSite);
 assert.equal(baselineWork.targetSite,exercise.baseline.targetSite);
 assert.equal(baselineWork.sourceResource,actualSource);
 const exported=JSON.stringify(s);
 assert.deepEqual(SOC.restore(exported),s,'completed real evidence remains valid after restore');
 for(const field of ['sourceSite','targetSite']){
  const forged=JSON.parse(exported),row=forged.portfolio.customers.find(item=>item.id===CUSTOMER).root.providerSiteWork.find(item=>item.projectId===paid.id&&item.phase==='baseline');
  row[field]=field==='sourceSite'?OWN.SITE_IDS.branch+'-transport':OWN.SITE_IDS.head+'-transport';
  assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_SITE_WORK_SCOPE|INVALID_PROVIDER_SITE_WORK_LINEAGE|INVALID_PROVIDER_SITE_WORK/);
 }
 const restored=SOC.restore(exported),expected=SOC.dispatch(restored,{type:'advance',minutes:1}),box={postMessage:value=>{box.result=value;}};
 vm.createContext(box);vm.runInContext(SOC.workerSource(),box);box.onmessage({data:{id:'site-migration-recovery-worker',state:restored,command:{type:'advance',minutes:1}}});
 assert.equal(box.result.error,undefined,box.result.error);assert.equal(JSON.stringify(box.result.state),JSON.stringify(expected),'worker and synchronous continuation are identical');
 s=until(s,x=>!migrationBusy(x,'desk'),30);
 s=migrate(s,{resourceId:'desk',fromSite:OWN.SITE_IDS.branch,toSite:OWN.SITE_IDS.head});
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'historical recovery remains valid after a later paid endpoint move');
});
