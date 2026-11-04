const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const channels=require('../src/game/47-channels');
const providerHistory=require('../src/game/23-provider-history');
const SOC=require('../src/game/55-communications');

function fixture(){
 const s={clock:0,nextId:10000,providerCustomer:{version:1,id:'starter-customer'},interactions:[],records:[],commands:[],ledger:[],cases:{},operations:{jobs:[]}};
 s.channels=channels.create(s);s.clock=3;channels.advance(s.channels,3);
 channels.command(s.channels,{action:'observe',channel:'letterbox',authenticated:true,providerAvailable:true,fault:null});
 channels.command(s.channels,{action:'permission',tenant:'orchard-repairs',person:'alex',channel:'letterbox',purpose:'transactional',granted:true,expiresAt:null});
 return s;
}

test('provider channel compaction archives old terminal receipts while preserving a live conversation',()=>{
 const s=fixture(),context={tenant:'orchard-repairs',canonicalPerson:'alex',account:'letterbox',purpose:'transactional',caseId:'case-1',template:'transaction-update'};
 channels.command(s.channels,{action:'webhook-configure',config:{enabled:true,rateLimit:100,retries:3,backoff:1}});s.clock++;channels.advance(s.channels,s.clock);
 for(let n=1;n<=2400;n++){
  const interaction={id:`interaction-${n}`,caseId:'case-1',phase:'resolved',finishedAt:s.clock};
  const job={id:`delivery-${n}`,interaction:interaction.id,status:'accepted',acceptedAt:s.clock};
  channels.recordAcceptance(s.channels,interaction,context,job);
  s.clock++;channels.advance(s.channels,s.clock);
  channels.recordDelivery(s.channels,interaction,context,{...job,status:'delivered',receiptAt:s.clock});
  s.interactions.push(interaction);if(s.interactions.length>80){const pruned=s.interactions.shift();s.tracePrunedThrough=Math.max(s.tracePrunedThrough||0,Number(pruned.id.slice(12)));}
  providerHistory.compact(s);
 }
 s.clock++;channels.advance(s.channels,s.clock);providerHistory.compact(s);
 assert.ok(s.channels.receipts.length<100,'old channel receipts remain below capacity');
 assert.ok(s.channels.acceptances.length<100,'old channel acceptances remain below capacity');
 assert.equal(s.channels.conversations.length,1,'the active conversation remains available');
 assert.equal(channels.validate(s.channels),true);
 assert.equal(providerHistory.validate(s),true);
 assert.equal(s.providerArchive.channels.deliveries+s.channels.receipts.filter(r=>r.kind==='delivery').length,2400);
 assert.equal(s.providerArchive.channels.acceptances+s.channels.acceptances.length,2400);
 assert.equal(s.providerArchive.channels.webhookDelivered+(s.channels.webhooks.deliveries||[]).filter(x=>x.status==='delivered').length,2400);
 assert.equal(s.providerArchive.channels.conversations,0,'active conversations are never compacted');
});

test('provider compaction retains recent and in-flight channel lineage until terminal and old',()=>{
 const s=fixture(),context={tenant:'orchard-repairs',canonicalPerson:'alex',account:'letterbox',purpose:'transactional',caseId:'case-1',template:'transaction-update'};
 const interaction={id:'interaction-1',caseId:'case-1',phase:'delivery',finishedAt:null},job={id:'delivery-1',interaction:interaction.id,status:'accepted',acceptedAt:s.clock};
 channels.recordAcceptance(s.channels,interaction,context,job);s.interactions.push(interaction);
 s.clock=200;channels.advance(s.channels,s.clock);providerHistory.compact(s);
 assert.equal(s.channels.acceptances.length,1,'in-flight acceptance is retained');
 assert.equal(providerHistory.validate(s),true);
 interaction.phase='resolved';interaction.finishedAt=200;providerHistory.compact(s);
 assert.equal(s.channels.acceptances.length,1,'recent terminal lineage is retained');
 s.clock=300;channels.advance(s.channels,s.clock);providerHistory.compact(s);
 assert.equal(s.channels.acceptances.length,0,'aged terminal lineage is archived');
 assert.equal(s.providerArchive.channels.acceptances,1);
 assert.equal(channels.validate(s.channels),true);
});

test('public campaign keeps more than two thousand real message deliveries through bounded history',{skip:process.env.SOC_PROVIDER_CHANNEL_SOAK!=='1'},()=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney'}),request=0;
 const send=command=>{s=SOC.dispatch(s,{type:'provider',requestId:`provider-${++request}`,command});};
 const tick=()=>{try{s=SOC.dispatch(s,{type:'advance',minutes:1});}catch(error){const child=s.portfolio.customers.find(x=>x.id==='starter-customer')?.root;error.message+=` at=${s.clock} conv=${child?.channels?.conversations?.length} accepts=${child?.channels?.acceptances?.length} receipts=${child?.channels?.receipts?.length} archive=${JSON.stringify(child?.providerArchive?.channels)}`;throw error;}settle();};
 const settle=()=>{
  const p=s.providerCampaign;
  for(const incident of p.incidents.filter(x=>['active','acknowledged'].includes(x.status))){
   if(incident.status==='active')send({action:'acknowledge-incident',incidentId:incident.id});
   if(p.projects.some(x=>x.customerId===incident.customerId&&x.operationId==='repair'&&['running','commissioning'].includes(x.status)))continue;
   let command={action:'operation',operationId:'repair',customerId:incident.customerId},q=SOC.provider.quote(s,command);
   if(q.blockers.some(x=>x==='ENGINEER_CAPACITY'||x==='SUPPORT_CAPACITY')){send({action:'staff',engineers:Math.max(4,q.commercial.staffing.currentEngineers),support:Math.max(4,q.commercial.staffing.currentSupport)});q=SOC.provider.quote(s,command);}
   assert.deepEqual(q.blockers,[],`repair ${incident.id}: ${q.blockers.join(',')}`);send({...command,quoteRevision:s.revision});
  }
  for(const c of p.customers.filter(x=>x.status==='renewal'))send({action:'renew',customerId:c.id});
 };
 const buy=stage=>{const q=SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});assert.deepEqual(q.blockers,[]);send({...q.request,quoteRevision:q.atRevision});};
 buy('base');buy('carrier');buy('partner');
 for(let n=0;n<240&&s.providerCampaign.customers[0].status!=='active';n++)tick();
 assert.equal(s.providerCampaign.customers[0].status,'active');
 const product={action:'operation',operationId:'cisco-programmable-engagement',customerId:'starter-customer'};
 for(let n=0;n<240;n++){
  const q=SOC.provider.quote(s,product);
  if(!q.blockers.length){send({...product,quoteRevision:q.atRevision});break;}
  assert.ok(q.blockers.every(x=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(x)),q.blockers.join(','));tick();
 }
 assert.ok(s.providerCampaign.projects.some(x=>x.operationId==='cisco-programmable-engagement'));
 for(let n=0;n<120&&s.providerCampaign.projects.find(x=>x.operationId==='cisco-programmable-engagement')?.status!=='complete';n++)tick();
 assert.equal(s.providerCampaign.projects.find(x=>x.operationId==='cisco-programmable-engagement')?.status,'complete');
 const start=s.clock,target=start+10080;
 while(s.clock<target){const before=s.clock;try{s=SOC.dispatch(s,{type:'advance',minutes:Math.min(60,target-s.clock)});}catch(error){const child=s.portfolio.customers.find(x=>x.id==='starter-customer')?.root;error.message+=` at=${s.clock} conv=${child?.channels?.conversations?.length} accepts=${child?.channels?.acceptances?.length} receipts=${child?.channels?.receipts?.length} archive=${JSON.stringify(child?.providerArchive?.channels)}`;throw error;}settle();assert.ok(s.clock>before,'public campaign time advances');assert.equal(s.providerCampaign.status,'operating','the provider remains operating through public renewals and repairs');}
 const child=s.portfolio.customers.find(x=>x.id==='starter-customer').root;
 const archived=child.providerArchive.channels;
 assert.ok(archived.deliveries+child.channels.receipts.filter(x=>x.kind==='delivery').length>2000,'more than 2,000 real messages delivered and retained in totals');
 assert.ok(child.channels.receipts.length<2000&&child.channels.acceptances.length<2000&&child.channels.conversations.length<2000,'live collections remain below their caps');
 const restored=SOC.restore(JSON.stringify(s));assert.equal(restored.clock,s.clock,'compacted save restores');
 const worker=vm.runInNewContext(SOC.workerSource()+';SOC'),command={type:'advance',minutes:1};
 assert.equal(JSON.stringify(worker.dispatch(restored,command)),JSON.stringify(SOC.dispatch(s,command)),'worker continuation preserves compacted channel archive and lineage');
});
