/* Business campaign: synthetic organisations, contracts and integer-minor-unit accounting.
   This factory is serialized unchanged into the communications worker. */
function socBusinessKernel(){
 'use strict';
 const PACK='soc-business-1',PERIOD=60,CURRENCY='AUD';
 const copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=(code)=>{throw new Error(code);};
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
 const integer=(x,min=0,max=100000000)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const organisations={
  'orchard-msp':{name:'Orchard Communications',roles:['msp','reseller','integrator','cpaas-builder'],parent:null},
  'grove-vendor':{name:'Microsnoft Grove',roles:['vendor'],parent:null},
  'disco-vendor':{name:'Disco Collaboration',roles:['vendor','cpaas-supplier'],parent:null},
  'level-tree':{name:'Level Tree',roles:['carrier','wholesaler'],parent:null},
  'branch-distribution':{name:'Branch Distribution',roles:['distributor'],parent:null},
  'people-orchard':{name:'People Orchard',roles:['bpo'],parent:null},
  queueberry:{name:'Queueberry',roles:['vendor'],parent:null,sourceId:'uc-new:actor:genesys',fictional:true,aliasStatus:'proposed-owner-review-required'},
  'twig-integrations':{name:'Twig Integrations',roles:['integrator','reseller'],parent:null,valuation:20000},
  customer:{name:'Customer organisation',roles:['customer'],parent:null}
 };
 // Prices are fictional cents per explicitly accelerated 60-minute training period.
 const offers={
  'managed-operations':{name:'Orchard Managed Change Service',vendor:'twig-integrations',unit:'managed-operation',usageUnit:null,retail:0,wholesale:0,setup:0,allowance:0,overage:50,minimum:1,kinds:[],sectors:['smb','enterprise','government','defence']},
  access:{name:'Level Tree Purchased Access',vendor:'level-tree',unit:'Mbps',usageUnit:null,retail:60,wholesale:30,setup:300,allowance:0,overage:0,minimum:10,kinds:['connectivity'],sectors:['smb','enterprise','government','defence']},
  workplace:{name:'Grove Named Calling',vendor:'grove-vendor',unit:'seat',usageUnit:'minute',retail:900,wholesale:500,setup:400,allowance:20,overage:8,minimum:2,kinds:['uc'],sectors:['smb','enterprise','government']},
  dedicated:{name:'Disco Dedicated Calling',vendor:'disco-vendor',unit:'seat',usageUnit:'minute',retail:1200,wholesale:750,setup:600,allowance:30,overage:7,minimum:2,kinds:['dedicated'],sectors:['enterprise','government','defence']},
  sessions:{name:'Bellwether Concurrent Interconnect',vendor:'level-tree',unit:'session',usageUnit:null,retail:600,wholesale:350,setup:300,allowance:0,overage:0,minimum:1,kinds:['trunk'],sectors:['smb','enterprise','government','defence']},
  contact:{name:'Disco Agent Entitlements',vendor:'disco-vendor',unit:'agent',usageUnit:null,retail:1600,wholesale:900,setup:400,allowance:0,overage:0,minimum:1,kinds:['queue','workforce'],sectors:['smb','enterprise','government','defence']},
  messaging:{name:'Disco Digital Service',vendor:'disco-vendor',unit:'message',usageUnit:'message',retail:10,wholesale:5,setup:250,allowance:1,overage:12,minimum:100,kinds:['channel','workflow','crm'],sectors:['smb','enterprise','government']},
  rooms:{name:'Disco Room Service',vendor:'disco-vendor',unit:'room',usageUnit:null,retail:1000,wholesale:650,setup:400,allowance:0,overage:0,minimum:1,kinds:['room'],sectors:['enterprise','government','defence']},
  archive:{name:'Echo Evidence Storage',vendor:'disco-vendor',unit:'GB',usageUnit:null,retail:100,wholesale:50,setup:300,allowance:0,overage:0,minimum:10,kinds:['archive','recorder'],sectors:['enterprise','government','defence']},
  processing:{name:'Speech Orchard Processing',vendor:'disco-vendor',unit:'processor-minute',usageUnit:'processor-minute',retail:30,wholesale:15,setup:250,allowance:1,overage:40,minimum:20,kinds:['processor'],sectors:['enterprise','government','defence']}
 };
 const tracks={
  smb:{name:'Orchard Repairs digital service',offers:['access','messaging','contact'],arrival:12,channel:'message',requiredEvidence:['context'],budget:12000},
  enterprise:{name:'Canopy Group migration',offers:['access','workplace','rooms','archive'],arrival:16,channel:'voice',requiredEvidence:['recording','meeting'],budget:20000},
  government:{name:'Civic Grove citizen service',offers:['access','workplace','contact','archive','processing'],arrival:20,channel:'voice',requiredEvidence:['recording','transcript'],budget:22000},
  defence:{name:'Wattle continuity service',offers:['access','dedicated','rooms'],arrival:8,channel:'voice',requiredEvidence:['meeting','disconnected'],budget:18000}
 };
 function create(s){
  const orgs=copy(organisations);orgs.customer.name=s.customerName||tracks[s.scenario].name;
  return {pack:PACK,currency:CURRENCY,periodMinutes:PERIOD,startedAt:s.clock,player:'orchard-msp',organisations:orgs,
   grants:[{id:'customer-service',grantor:'customer',grantee:'orchard-msp',resources:Object.keys(s.resources).filter(x=>x!=='people'),actions:['configure','fault','migrate'],expires:s.clock+10000}],
   ownership:Object.fromEntries(Object.keys(s.resources).map(x=>[x,x==='people'?'orchard-msp':'customer'])),
   qualifications:{'orchard-msp':{smb:s.clock+10000,enterprise:s.clock+10000}},contracts:[],allowancePools:[],projects:[],loans:[],ledger:[],nextId:1,
   balance:{opening:100000,cash:100000,revenue:0,cost:0,funding:0,repaid:0},workforce:{engineers:2,support:1,operator:'player',hourlyCents:100},
   metrics:{periods:0,offered:0,handled:0,repeated:0,credits:0},demand:{carry:0,multiplier:100},market:[],events:[],achievements:[],lastPeriod:s.clock,seed:s.seed};
 }
 function group(b,org){const seen=new Set();while(org){if(seen.has(org))fail('OWNERSHIP_CYCLE');if(org===b.player)return true;seen.add(org);org=b.organisations[org]?.parent;}return false;}
 function authorise(s,resource,action){
  const b=s.business;if(!b)return true;
  const owner=b.ownership[resource];if(group(b,owner))return true;
  return b.grants.some(g=>g.grantor===owner&&group(b,g.grantee)&&g.expires>s.clock&&g.resources.includes(resource)&&g.actions.includes(action));
 }
 function event(b,clock,code,details={}){b.events.push({id:'event-'+b.nextId++,clock,code,...details});if(b.events.length>200)b.events.shift();}
 function post(b,s,category,cents,details={}){
  if(!Number.isSafeInteger(cents))fail('INVALID_MONEY');
  const row={id:'entry-'+b.nextId++,at:s.clock,category,cents,currency:b.currency,...details};
  if(category==='revenue'){b.balance.revenue+=cents;b.balance.cash+=cents;}
  else if(category==='cost'){b.balance.cost+=cents;b.balance.cash-=cents;}
  else if(category==='funding'){b.balance.funding+=cents;b.balance.cash+=cents;}
  else if(category==='repayment'){b.balance.repaid+=cents;b.balance.cash-=cents;}
  else if(category!=='internal')fail('INVALID_LEDGER_CATEGORY');
  if(!Object.values(b.balance).every(Number.isSafeInteger))fail('MONEY_OVERFLOW');
  b.ledger.push(row);if(b.ledger.length>1000){const removed=b.ledger.shift();b.ledgerPrunedThrough=Math.max(b.ledgerPrunedThrough||0,Number(removed.id.slice(6)));}return row.id;
 }
 function readiness(s,c,services){
  const reasons=[],p=offers[c.offer];
  for(const kind of p.kinds){const matches=c.resources.filter(id=>s.resources[id]?.kind===kind);if(!matches.length)reasons.push('MISSING_PRODUCT:'+kind);}
  for(const id of c.resources)if(!services[id]?.ready)reasons.push('SERVICE_UNAVAILABLE:'+id);
  if(['government','defence'].includes(s.scenario)){
   for(const id of c.resources){const config=s.resources[id]?.effective;if(config&&config.region!==s.jurisdiction)reasons.push('REGION:'+id);if(s.scenario==='defence'&&config&&!config.local)reasons.push('EXTERNAL_SERVICE:'+id);}
  }
  const capability={connectivity:'capacity',uc:'capacity',dedicated:'capacity',trunk:'capacity',workforce:'entitlements',archive:'capacity',processor:'capacity'};
  for(const id of c.resources){const r=s.resources[id],field=capability[r.kind];if(c.offer!=='managed-operations'&&field&&r.effective&&r.effective[field]<c.quantity)reasons.push('INSUFFICIENT_'+p.unit.toUpperCase()+':'+id);}
  if(p.unit==='room'&&c.resources.filter(id=>s.resources[id]?.kind==='room').length<c.quantity)reasons.push('INSUFFICIENT_ROOMS');
  return reasons;
 }
 function procurement(s,c,services){
  const b=s.business,p=offers[c.offer],reasons=[];
  if(!p.sectors.includes(s.scenario))reasons.push('OFFER_SECTOR');
  if((b.qualifications[b.player]?.[s.scenario]||0)<=s.clock)reasons.push('SUPPLIER_QUALIFICATION');
  if(c.currency!==b.currency||c.unit!==p.unit)reasons.push('CHARGING_DIMENSION');
  if(c.quantity<p.minimum)reasons.push('MINIMUM_COMMITMENT');
  if(c.customer!=='customer'&&!b.organisations[c.customer]?.roles.includes('customer')&&!group(b,c.customer))reasons.push('CUSTOMER_ROLE');
  if(c.supportOwner!==b.player&&!b.organisations[c.supportOwner]?.roles.some(r=>['msp','integrator','bpo'].includes(r)))reasons.push('SUPPORT_RESPONSIBILITY');
  if(c.sell&&c.price>tracks[s.scenario].budget)reasons.push('CUSTOMER_BUDGET');
  if(c.sell&&['government','defence'].includes(s.scenario))reasons.push(...readiness(s,c,services));
  return [...new Set(reasons)];
 }
 function bill(s,c){
  const b=s.business,p=offers[c.offer],period=c.billedPeriods+1;
  const shared=c.allowancePool?b.allowancePools.find(x=>x.id===c.allowancePool):null;
  const included=shared?c.sharedIncluded:p.allowance*c.quantity,overage=Math.max(0,c.usage-included);
  const retail=c.price+overage*p.overage,wholesale=p.wholesale*c.quantity+Math.max(0,c.usage)*Math.ceil(p.overage/2);
  const internal=group(b,c.customer),costInternal=group(b,c.vendor);
  if(c.sell)post(b,s,internal?'internal':'revenue',retail,{contract:c.id,period,unit:p.unit,quantity:c.quantity,usageUnit:p.usageUnit,usage:c.usage,included,overage});
  post(b,s,costInternal?'internal':'cost',wholesale,{contract:c.id,period,unit:p.unit,quantity:c.quantity,usageUnit:p.usageUnit,usage:c.usage,reason:'wholesale'});
  c.billedRetail+=c.sell?retail:0;c.billedPeriods++;c.termBilled++;c.usage=0;c.nextBill+=PERIOD;
 }
 function managedUsage(s,q){
  const b=s.business,c=b?.contracts.find(c=>c.id===q?.contractId),p=offers['managed-operations'];
  if(!b||!q||Object.keys(q).sort().join(',')!=='appliedGeneration,at,contractId,customerId,operator,quantity,resource,unit,usageId'||!id(q.usageId)||!id(q.customerId)||!id(q.resource)||!integer(q.appliedGeneration,1)||q.unit!==p.unit||q.quantity!==1||q.at!==s.clock)fail('INVALID_MANAGED_USAGE');
  const prior=b.managedCharges?.find(x=>x.usageId===q.usageId);if(prior){if(['customerId','contractId','operator','resource','appliedGeneration','unit','quantity'].some(k=>prior[k]!==q[k]))fail('MANAGED_USAGE_IDEMPOTENCY_CONFLICT');const {costEntryId,costCategory,costCents,jobId,...receipt}=prior;return copy(receipt);}
  if(!c||c.offer!=='managed-operations'||c.status!=='active'||!c.sell||c.customer!=='customer'||c.supportOwner!==q.operator||!c.resources.includes(q.resource)||!b.organisations[q.operator]?.roles.some(r=>['msp','integrator','bpo'].includes(r))||!authorise({...s,business:{...b,player:q.operator}},q.resource,'configure'))fail('MANAGED_USAGE_CONTRACT_REQUIRED');
  const resource=s.resources[q.resource],applied=s.estate?.jobs.find(j=>['joiner','mover'].includes(j.operation)&&j.items.some(i=>i.resource===q.resource&&i.status==='complete'&&i.appliedGeneration===q.appliedGeneration&&JSON.stringify(i.config)===JSON.stringify(resource?.effective)));
  if(!applied||resource?.generation!==q.appliedGeneration||resource.provisioning.status!=='ready')fail('MANAGED_USAGE_EFFECTIVE_CHANGE_REQUIRED');
  if((b.managedCharges||[]).length>=1000)fail('MANAGED_USAGE_CAPACITY');
  const details={reason:'managed-operation',usageId:q.usageId,contract:c.id,customerId:q.customerId,operator:q.operator,resource:q.resource,appliedGeneration:q.appliedGeneration,unit:p.unit,quantity:1};
  const entryId=post(b,s,'revenue',p.overage,details),costEntryId=post(b,s,group(b,c.vendor)?'internal':'cost',Math.ceil(p.overage/2),{...details,reason:'managed-operation-wholesale'});
  const receipt={status:'posted',...copy(q),entryId,currency:b.currency,cents:p.overage};b.managedCharges=b.managedCharges||[];b.managedCharges.push({...receipt,jobId:applied.id,costEntryId,costCategory:group(b,c.vendor)?'internal':'cost',costCents:Math.ceil(p.overage/2)});return copy(receipt);
 }
 function resetAllowancePeriod(b,p,period,allowance=p.effectiveAllowance){
  p.periodIndex=period;p.allowance=allowance;p.remaining=allowance;p.consumed=0;
  for(const c of b.contracts)if(c.allowancePool===p.id)c.sharedIncluded=0;
 }
 function allowancePeriod(p,clock,afterBilling=false){const elapsed=clock-p.periodAnchor;if(afterBilling)return Math.max(0,Math.floor(elapsed/p.periodMinutes));const prior=elapsed>0&&elapsed%p.periodMinutes===0?elapsed-1:elapsed;return Math.max(0,Math.floor(prior/p.periodMinutes));}
 function meter(s,unit,amount,contractId=null,afterBilling=false){
  if(!s.business)return;if(!integer(amount))fail('INVALID_USAGE');
  const b=s.business;
  const c=b.contracts.find(c=>c.status==='active'&&offers[c.offer].usageUnit===unit&&(contractId===null||c.id===contractId));
  if(!c)return;
  c.usage+=amount;
  if(c.allowancePool){
   const pool=b.allowancePools.find(x=>x.id===c.allowancePool);
   if(!pool||!pool.everActivated)return;
   const period=allowancePeriod(pool,s.clock,afterBilling);if(period>pool.periodIndex){resetAllowancePeriod(b,pool,period,pool.effectiveAllowance);}
   const included=Math.min(amount,pool.remaining);pool.remaining-=included;pool.consumed+=included;c.sharedIncluded+=included;
  }
 }
 function meterResource(s,unit,amount,resourceIds,afterBilling=false){
  if(resourceIds===undefined)return meter(s,unit,amount,null,afterBilling);
  if(!Array.isArray(resourceIds)||resourceIds.length>30||resourceIds.some(r=>!own(s.resources,r)))fail('INVALID_USAGE_RESOURCES');
  if(!s.business)return;
  const resources=new Set(resourceIds);
  const matches=s.business.contracts.filter(c=>c.status==='active'&&offers[c.offer].usageUnit===unit&&c.resources.some(r=>resources.has(r)));
  matches.sort((a,b)=>{const rank=c=>Math.min(...c.resources.map(r=>resourceIds.indexOf(r)).filter(i=>i>=0));return rank(a)-rank(b)||a.id.localeCompare(b.id);});
  if(matches.length)meter(s,unit,amount,matches[0].id,afterBilling);
 }
 function externalCost(s,invoice){
  const b=s.business,source=invoice?.source===undefined?'transport':invoice.source;if(!b||!invoice||!id(invoice.id)||invoice.currency!==CURRENCY||!integer(invoice.cents,1,1000000)||!['transport','workforce-offers'].includes(source))fail('INVALID_EXTERNAL_INVOICE');
  b.externalInvoices=b.externalInvoices||[];const prior=b.externalInvoices.find(x=>x.id===invoice.id);
  if(prior){if(prior.cents!==invoice.cents||(prior.source||'transport')!==source)fail('EXTERNAL_INVOICE_CONFLICT');return;}
  if(b.externalInvoices.length>=2000)fail('EXTERNAL_INVOICE_CAPACITY');
  const entryId=post(b,s,'cost',invoice.cents,{reason:source+':'+invoice.reason,externalId:invoice.id,unit:'AUD-cent'});b.externalInvoices.push({id:invoice.id,cents:invoice.cents,...(source==='workforce-offers'?{source,entryId}:{})});
 }
 function demand(s,services,workforceSnapshot=null,transportSnapshot=null){
  const b=s.business,t=tracks[s.scenario];b.seed=(b.seed*16807)%2147483647;
  const offered=Math.floor(t.arrival*b.demand.multiplier/100)+(b.seed%3)+b.demand.carry;
  const worker=s.resources.people.effective,queue=s.resources.service.effective,trunk=s.resources.carrier.effective;
  let capacity=0;
  const shift=s.clock%1440;
  if(workforceSnapshot){
   capacity=worker&&queue&&services.people.ready&&services.service.ready?workforceSnapshot.throughput||0:0;
   if(t.channel==='voice')capacity=Math.min(capacity,(trunk?.capacity||0)*PERIOD/Math.max(1,worker?.handlingMinutes||1));
  }else if(worker&&queue&&services.people.ready&&services.service.ready&&worker.skills.includes(queue.skill)&&worker.languages.includes(queue.language)&&shift>=worker.shiftStart&&shift<worker.shiftEnd){
   const concurrency=t.channel==='message'?worker.digitalConcurrency:1;
   capacity=Math.floor(Math.min(worker.people,worker.entitlements)*PERIOD/(worker.handlingMinutes+worker.wrapMinutes)*concurrency);
   if(t.channel==='voice')capacity=Math.min(capacity,(trunk?.capacity||0)*PERIOD/Math.max(1,worker.handlingMinutes));
  }
  const dependencies=t.channel==='voice'?['phone','carrier']:['engage','messages','cases'];
  if(dependencies.some(id=>!services[id]?.ready))capacity=0;
  if(transportSnapshot){if(!transportSnapshot.ready)capacity=0;else if(t.channel==='voice'&&transportSnapshot.availableKbps!==null)capacity=Math.min(capacity,Math.floor(transportSnapshot.availableKbps/transportSnapshot.voiceKbps)*PERIOD/Math.max(1,worker?.handlingMinutes||1));}
  const handled=Math.min(offered,Math.floor(capacity)),repeat=Math.ceil((offered-handled)/2);
  b.metrics.offered+=offered;b.metrics.handled+=handled;b.metrics.repeated+=repeat;b.demand.carry=Math.min(100,repeat);
  event(b,s.clock,'AGGREGATE_DEMAND',{offered,handled,repeat,channel:t.channel,staffedCapacity:capacity,unit:'interaction'});
  meterResource(s,t.channel==='voice'?'minute':'message',t.channel==='voice'?handled*(worker?.handlingMinutes||0):handled,t.channel==='voice'?['phone']:['engage','messages','cases'],true);
 }
 function advance(s,services,assessment,workforceSnapshot=null,transportSnapshot=null){
  if(s.business)migrateLegacy(s);
  const b=s.business;if(!b)return;
  for(const p of b.allowancePools)if(!p.everActivated&&p.status==='provisioning'&&s.clock>=p.readyAt){p.everActivated=true;p.status='active';p.allowance=p.desiredAllowance;p.effectiveAllowance=p.desiredAllowance;p.pendingEffectiveAt=null;resetAllowancePeriod(b,p,Math.max(0,Math.floor((s.clock-p.periodAnchor)/p.periodMinutes)),p.effectiveAllowance);event(b,s.clock,'ALLOWANCE_POOL_READY',{pool:p.id});}
  for(const c of b.contracts){
   c.reasons=readiness(s,c,services);
   if(['provisioning','blocked'].includes(c.status)&&s.clock>=c.readyAt){c.reasons=readiness(s,c,services);c.status=c.reasons.length?'blocked':'active';if(c.status==='active')event(b,s.clock,'CONTRACT_READY',{contract:c.id});}
   if(['cancelled','renewal'].includes(c.status))continue;
   if(s.clock>=c.nextBill){
    // Wholesale commitments remain payable while service is being repaired.
    bill(s,c);
    if(c.sell&&(c.status!=='active'||c.reasons.length)){const credit=Math.floor(c.price/2);post(b,s,group(b,c.customer)?'internal':'revenue',-credit,{contract:c.id,reason:'service-credit'});c.credits+=credit;b.metrics.credits+=credit;}
   }
   if(c.status==='active'&&s.clock>=c.renewAt){c.status='renewal';event(b,s.clock,'RENEWAL_DUE',{contract:c.id});}
  }
  for(const p of b.allowancePools){
   const period=allowancePeriod(p,s.clock,true);
   if(p.everActivated&&p.periodIndex!==period){
    if(p.status==='provisioning'&&p.pendingEffectiveAt!==null&&s.clock>=p.pendingEffectiveAt){p.effectiveAllowance=p.desiredAllowance;p.allowance=p.desiredAllowance;p.status='active';p.pendingEffectiveAt=null;event(b,s.clock,'ALLOWANCE_POOL_READY',{pool:p.id});}
    resetAllowancePeriod(b,p,period,p.effectiveAllowance);
   }
   if(p.everActivated&&p.status==='provisioning'&&s.clock>=p.readyAt&&p.pendingEffectiveAt===null){p.status='active';p.desiredAllowance=p.effectiveAllowance;event(b,s.clock,'ALLOWANCE_POOL_READY',{pool:p.id});}
  }
  for(const p of b.projects)if(p.status==='running'&&s.clock>=p.due){
   if(!p.resources.every(id=>services[id]?.ready)){p.status='blocked';event(b,s.clock,'PROJECT_BLOCKED',{project:p.id});}
   else{p.status='complete';event(b,s.clock,'PROJECT_COMPLETE',{project:p.id});}
  }
  if(s.clock-b.lastPeriod>=PERIOD){
   b.lastPeriod+=PERIOD;b.metrics.periods++;demand(s,services,workforceSnapshot,transportSnapshot);
   const w=b.workforce;
   if(w.operator!=='customer')post(b,s,'cost',(w.engineers+w.support)*w.hourlyCents,{reason:w.operator==='bpo'?'bpo-service':'staff',unit:'person-hour',quantity:w.engineers+w.support});
   for(const loan of b.loans)if(loan.principal>0)post(b,s,'cost',Math.ceil(loan.principal*loan.rateBps/10000),{reason:'interest',loan:loan.id,unit:'period'});
  }
   if(assessment.passed&&tracks[s.scenario].offers.every(offer=>b.contracts.some(c=>c.offer===offer&&c.sell&&c.status==='active'&&c.billedPeriods>0))&&b.metrics.handled>0&&!b.achievements.includes('service-operator'))b.achievements.push('service-operator');
 }
 const fields={start:[],allowancePool:['id','customer','owner','currency','unit','periodMinutes','allowance'],amendAllowancePool:['pool','allowance'],order:['offer','quantity','unit','currency','resources','customer','supportOwner','price','sell','via','allowancePool','customerProfile'],cancel:['contract'],renew:['contract'],credit:['contract','cents'],qualify:['sector'],staff:['engineers','support','operator'],loan:['cents'],repay:['loan','cents'],acquire:['organisation'],transfer:['organisation','cents'],project:['resources','engineers','duration'],retryProject:['project'],revoke:['grant'],market:['event']};
 function command(s,c,services,assessment){
  if(s.business)migrateLegacy(s);
  if(!c||!own(fields,c.action)||Object.keys(c).some(k=>!['action',...fields[c.action]].includes(k)))fail('INVALID_BUSINESS_COMMAND');
  if(c.action==='start'){if(s.business)fail('CAMPAIGN_ALREADY_STARTED');s.business=create(s);return;}
  const b=s.business;if(!b)fail('CAMPAIGN_NOT_STARTED');
  if(c.action==='allowancePool'){
   if(!id(c.id)||b.allowancePools.some(x=>x.id===c.id)||!own(b.organisations,c.customer)||!b.organisations[c.customer].roles.includes('customer')&&!group(b,c.customer)||!own(b.organisations,c.owner)||!b.organisations[c.owner].roles.some(r=>['msp','integrator','bpo'].includes(r))||c.currency!==b.currency||!id(c.unit)||c.periodMinutes!==PERIOD||!integer(c.allowance,1,1000000))fail('INVALID_ALLOWANCE_POOL');
   b.allowancePools.push({id:c.id,customer:c.customer,owner:c.owner,currency:c.currency,unit:c.unit,periodMinutes:c.periodMinutes,allowance:c.allowance,effectiveAllowance:c.allowance,desiredAllowance:c.allowance,status:'provisioning',readyAt:s.clock+2,periodAnchor:s.clock+2,pendingEffectiveAt:null,everActivated:false,periodIndex:0,remaining:c.allowance,consumed:0});
   return;
  }
  if(c.action==='amendAllowancePool'){const p=b.allowancePools.find(x=>x.id===c.pool);if(!p)fail('UNKNOWN_ALLOWANCE_POOL');if(!integer(c.allowance,1,1000000))fail('INVALID_ALLOWANCE_POOL');p.desiredAllowance=c.allowance;p.status='provisioning';p.readyAt=s.clock+2;p.pendingEffectiveAt=p.everActivated?p.periodAnchor+Math.ceil((p.readyAt-p.periodAnchor)/p.periodMinutes)*p.periodMinutes:null;if(!p.everActivated)p.periodAnchor=p.readyAt;return;}
  if(c.action==='order'){
   const p=offers[c.offer];if(!p||!integer(c.quantity,1,10000)||!Array.isArray(c.resources)||!c.resources.length||c.resources.length>30||new Set(c.resources).size!==c.resources.length||c.resources.some(id=>!own(s.resources,id))||typeof c.sell!=='boolean')fail('INVALID_OFFER_ORDER');
   if(c.via!==undefined&&(!b.organisations[c.via]?.roles.includes('distributor')))fail('INVALID_DISTRIBUTOR');
   const pool=c.allowancePool?b.allowancePools.find(x=>x.id===c.allowancePool):null;
   if(c.allowancePool&&!pool)fail('UNKNOWN_ALLOWANCE_POOL');
   if(pool&&(pool.customer!==(c.customer||'customer')||pool.owner!==(c.supportOwner||b.player)||pool.currency!==c.currency||pool.unit!==p.usageUnit||pool.periodMinutes!==PERIOD))fail('ALLOWANCE_POOL_SCOPE_MISMATCH');
   const order={id:'contract-'+b.nextId++,offer:c.offer,quantity:c.quantity,unit:c.unit,currency:c.currency,resources:[...c.resources],customer:c.customer||'customer',supportOwner:c.supportOwner||b.player,vendor:p.vendor,via:c.via||null,price:c.price===undefined?p.retail*c.quantity:c.price,sell:c.sell,allowancePool:pool?.id||null,sharedIncluded:0,status:'provisioning',readyAt:s.clock+2,nextBill:pool?pool.periodAnchor+(Math.floor(Math.max(0,s.clock-pool.periodAnchor)/pool.periodMinutes)+1)*pool.periodMinutes:s.clock+PERIOD,renewAt:pool?pool.periodAnchor+(Math.floor(Math.max(0,s.clock-pool.periodAnchor)/pool.periodMinutes)+3)*pool.periodMinutes:s.clock+PERIOD*3,billedPeriods:0,termBilled:0,billedRetail:0,usage:0,credits:0,reasons:[]};
   if(c.customerProfile!==undefined){const profile=s.customerNeeds?.profiles.find(x=>x.id===c.customerProfile);if(!id(c.customerProfile)||!profile?.effective||profile.segment!==s.scenario||order.customer!=='customer'||!order.sell)fail('CUSTOMER_PROFILE_SCOPE_REQUIRED');order.customerProfile=profile.id;order.customerProfileGeneration=profile.effective.generation;b.customerProfileBindings??=[];b.customerProfileBindings.push({contract:order.id,profile:profile.id,orderedGeneration:profile.effective.generation,orderedRevision:s.revision+1});}
   if(c.offer==='managed-operations'&&(order.price!==0||c.sell!==true||order.customer!=='customer'))fail('INVALID_MANAGED_OPERATION_CONTRACT');
   if(!integer(order.price)||!own(b.organisations,order.customer)||!own(b.organisations,order.supportOwner))fail('INVALID_CONTRACT');
   if(b.contracts.some(x=>x.offer===c.offer&&x.status!=='cancelled'&&(!pool||x.allowancePool!==pool.id)))fail('DUPLICATE_OFFER');
   if(p.usageUnit&&b.contracts.some(x=>x.status!=='cancelled'&&offers[x.offer].usageUnit===p.usageUnit&&x.resources.some(r=>c.resources.includes(r))))fail('OVERLAPPING_USAGE_CONTRACT');
   const reasons=procurement(s,order,services);if(reasons.length)fail('PROCUREMENT:'+reasons.join(','));
   b.contracts.push(order);post(b,s,'cost',p.setup,{contract:order.id,reason:'implementation'});event(b,s.clock,'ORDER_ACCEPTED',{contract:order.id,readiness:false});
  }else if(['cancel','renew','credit'].includes(c.action)){
   const contract=b.contracts.find(x=>x.id===c.contract);if(!contract)fail('UNKNOWN_CONTRACT');
   if(c.action==='cancel'){if(contract.status==='cancelled')fail('ALREADY_CANCELLED');if(contract.termBilled<3)post(b,s,'cost',(3-contract.termBilled)*offers[contract.offer].wholesale*contract.quantity,{contract:contract.id,reason:'minimum-term-exit'});contract.status='cancelled';}
   if(c.action==='renew'){if(contract.status!=='renewal')fail('RENEWAL_NOT_DUE');if(b.market.some(e=>e.event==='vendor-retirement'&&e.offer===contract.offer))fail('OFFER_RETIRED');if(contract.price>tracks[s.scenario].budget*b.demand.multiplier/100)fail('RENEWAL_BUDGET');contract.renewAt=s.clock+PERIOD*3;contract.nextBill=s.clock+PERIOD;contract.termBilled=0;contract.status='provisioning';contract.readyAt=s.clock+1;if(contract.customerProfile)contract.customerProfileGeneration=s.customerNeeds.profiles.find(p=>p.id===contract.customerProfile).effective.generation;}
   if(c.action==='credit'){if(!integer(c.cents,1)||c.cents>contract.billedRetail-contract.credits)fail('INVALID_CREDIT');post(b,s,group(b,contract.customer)?'internal':'revenue',-c.cents,{contract:contract.id,reason:'service-credit'});contract.credits+=c.cents;b.metrics.credits+=c.cents;}
  }else if(c.action==='qualify'){
   if(!['government','defence'].includes(c.sector)||c.sector!==s.scenario)fail('INVALID_QUALIFICATION');
   if(!assessment.passed)fail('QUALIFICATION_EVIDENCE_REQUIRED');
   b.qualifications[b.player][c.sector]=s.clock+PERIOD*10;post(b,s,'cost',1000,{reason:'fictional-procurement-review'});event(b,s.clock,'QUALIFICATION_RECORDED',{sector:c.sector,fictional:true});
  }else if(c.action==='staff'){
   if(b.workforce.operator==='customer')fail('WORKFORCE_CUSTOMER_CONTROLLED');
   if(!integer(c.engineers,0,20)||!integer(c.support,0,20)||!['player','bpo','customer'].includes(c.operator))fail('INVALID_STAFF');
   const allocated=b.projects.filter(p=>p.status==='running').reduce((n,p)=>n+p.engineers,0);if(c.engineers<allocated)fail('ENGINEERS_ASSIGNED');
   Object.assign(b.workforce,{engineers:c.engineers,support:c.support,operator:c.operator});
  }else if(c.action==='loan'){
   if(!integer(c.cents,1,100000)||b.loans.reduce((n,l)=>n+l.principal,0)+c.cents>200000)fail('FINANCING_LIMIT');
   const loan={id:'loan-'+b.nextId++,principal:c.cents,rateBps:100};b.loans.push(loan);post(b,s,'funding',c.cents,{loan:loan.id});
  }else if(c.action==='repay'){
   const loan=b.loans.find(l=>l.id===c.loan);if(!loan||!integer(c.cents,1)||c.cents>loan.principal||c.cents>b.balance.cash)fail('INVALID_REPAYMENT');loan.principal-=c.cents;post(b,s,'repayment',c.cents,{loan:loan.id});
  }else if(c.action==='acquire'){
   const org=b.organisations[c.organisation];if(!org?.valuation||group(b,c.organisation)||b.balance.cash<org.valuation)fail('INVALID_ACQUISITION');post(b,s,'cost',org.valuation,{reason:'acquisition',organisation:c.organisation});org.parent=b.player;event(b,s.clock,'ACQUIRED',{organisation:c.organisation,obligationsPreserved:true});
  }else if(c.action==='transfer'){
   if(!group(b,c.organisation)||c.organisation===b.player||!integer(c.cents,1))fail('INVALID_INTERNAL_TRANSFER');post(b,s,'internal',c.cents,{organisation:c.organisation,reason:'consolidation-elimination'});
  }else if(c.action==='project'){
   if(!Array.isArray(c.resources)||!c.resources.length||c.resources.some(id=>!own(s.resources,id)||!authorise(s,id,'migrate'))||!integer(c.engineers,1,20)||!integer(c.duration,1,1440))fail('INVALID_PROJECT');
   const allocated=b.projects.filter(p=>p.status==='running').reduce((n,p)=>n+p.engineers,0);if(allocated+c.engineers>b.workforce.engineers)fail('ENGINEER_CAPACITY');
   b.projects.push({id:'project-'+b.nextId++,resources:[...c.resources],engineers:c.engineers,duration:c.duration,due:s.clock+c.duration,status:'running',checkpoint:Object.fromEntries(c.resources.map(id=>[id,copy(s.resources[id].desired)]))});post(b,s,'cost',c.engineers*c.duration*10,{reason:'project',unit:'engineer-minute',quantity:c.engineers*c.duration});
  }else if(c.action==='retryProject'){
   const p=b.projects.find(x=>x.id===c.project);if(!p||p.status!=='blocked')fail('PROJECT_NOT_BLOCKED');const allocated=b.projects.filter(x=>x.status==='running').reduce((n,x)=>n+x.engineers,0);if(allocated+p.engineers>b.workforce.engineers)fail('ENGINEER_CAPACITY');p.status='running';p.due=s.clock+p.duration;
  }else if(c.action==='revoke'){
   const grant=b.grants.find(x=>x.id===c.grant);if(!grant)fail('UNKNOWN_GRANT');grant.expires=s.clock;event(b,s.clock,'DELEGATION_REVOKED',{grant:grant.id});
  }else if(c.action==='market'){
   if(!['suite-bundle','vendor-direct','vendor-retirement'].includes(c.event)||b.market.some(x=>x.event===c.event))fail('INVALID_MARKET_EVENT');
   const entry={at:s.clock,event:c.event,offer:tracks[s.scenario].offers[1]};b.market.push(entry);if(c.event==='suite-bundle')b.demand.multiplier=80;if(c.event==='vendor-direct')b.demand.multiplier=60;event(b,s.clock,'MARKET_CHANGED',entry);
  }
  validate(s,{pendingRevision:s.revision+1});
 }
 function migrateLegacy(s){
  const b=s?.business;if(b===undefined||b===null)return s;
  if(!b||typeof b!=='object'||Array.isArray(b))fail('INVALID_CAMPAIGN');
  if(!own(b,'allowancePools'))b.allowancePools=[];
  else if(!Array.isArray(b.allowancePools))fail('INVALID_CAMPAIGN_COLLECTION');
  if(!Array.isArray(b.contracts))fail('INVALID_CAMPAIGN_COLLECTION');
  for(const c of b.contracts){
   if(!c||typeof c!=='object'||Array.isArray(c))fail('INVALID_SAVED_CONTRACT');
   if(!own(c,'allowancePool'))c.allowancePool=null;
   else if(c.allowancePool!==null&&typeof c.allowancePool!=='string')fail('INVALID_SAVED_CONTRACT');
   if(!own(c,'sharedIncluded'))c.sharedIncluded=0;
   else if(!integer(c.sharedIncluded))fail('INVALID_SAVED_CONTRACT');
  }
  return s;
 }
 function validationView(s){
  const b=s?.business;if(b===undefined||b===null||!b||typeof b!=='object'||Array.isArray(b))return s;
  const view={...b};
  if(!own(b,'allowancePools'))view.allowancePools=[];
  if(Array.isArray(b.contracts))view.contracts=b.contracts.map(c=>c&&typeof c==='object'&&!Array.isArray(c)?{...c,...(!own(c,'allowancePool')?{allowancePool:null}:{}),...(!own(c,'sharedIncluded')?{sharedIncluded:0}:{})}:c);
  return {...s,business:view};
 }
 function validate(s,options={}){
  s=validationView(s);
  const b=s.business;if(b===undefined||b===null)return;
  if(b.pack!==PACK||b.currency!==CURRENCY||b.periodMinutes!==PERIOD||!integer(b.nextId,1,Number.MAX_SAFE_INTEGER)||!own(b.organisations,b.player))fail('INVALID_CAMPAIGN');
  for(const [key,max] of Object.entries({contracts:100,allowancePools:100,projects:100,loans:100,ledger:1000,grants:100,market:100,events:200,achievements:100}))if(!Array.isArray(b[key])||b[key].length>max)fail('INVALID_CAMPAIGN_COLLECTION');
  for(const [key,o] of Object.entries(b.organisations)){if(!id(key)||typeof o.name!=='string'||!Array.isArray(o.roles)||o.parent&&!own(b.organisations,o.parent))fail('INVALID_ORGANISATION');group(b,key);}
  if(!b.ownership||Object.keys(b.ownership).length!==Object.keys(s.resources).length||Object.keys(s.resources).some(resource=>!own(b.ownership,resource)||!own(b.organisations,b.ownership[resource])))fail('INVALID_RESOURCE_OWNERSHIP');
  for(const g of b.grants)if(!id(g.id)||!own(b.organisations,g.grantor)||!own(b.organisations,g.grantee)||!Array.isArray(g.resources)||g.resources.some(r=>!own(s.resources,r))||!Array.isArray(g.actions)||g.actions.some(a=>!['configure','fault','migrate'].includes(a))||!integer(g.expires,0,Number.MAX_SAFE_INTEGER))fail('INVALID_SAVED_DELEGATION');
  for(const p of b.projects)if(!id(p.id)||!Array.isArray(p.resources)||!p.resources.length||p.resources.some(r=>!own(s.resources,r))||!integer(p.engineers,1,20)||!integer(p.duration,1,1440)||!integer(p.due,0,Number.MAX_SAFE_INTEGER)||!['running','blocked','complete'].includes(p.status))fail('INVALID_SAVED_PROJECT');
  for(const l of b.loans)if(!id(l.id)||!integer(l.principal,0,200000)||l.rateBps!==100)fail('INVALID_SAVED_LOAN');
  if(b.loans.reduce((n,l)=>n+l.principal,0)!==b.balance.funding-b.balance.repaid)fail('UNRECONCILED_DEBT');
  if(b.ledgerPrunedThrough!==undefined&&(!integer(b.ledgerPrunedThrough,0,b.nextId-1)||b.ledgerPrunedThrough>0&&(b.ledger.length!==1000||b.ledger.some(r=>!/^entry-[1-9]\d*$/.test(r.id)||Number(r.id.slice(6))<=b.ledgerPrunedThrough))))fail('INVALID_CAMPAIGN_LEDGER_PRUNING');
  if(b.externalInvoices!==undefined&&(!Array.isArray(b.externalInvoices)||b.externalInvoices.length>2000||new Set(b.externalInvoices.map(x=>x?.id)).size!==b.externalInvoices.length||b.externalInvoices.some(x=>!x||!id(x.id)||!integer(x.cents,1,1000000)||x.source!==undefined&&!['transport','workforce-offers'].includes(x.source)||x.source==='workforce-offers'&&(!/^entry-[1-9]\d*$/.test(x.entryId)||Number(x.entryId.slice(6))>=b.nextId))))fail('INVALID_EXTERNAL_INVOICES');
  if(b.managedCharges!==undefined){if(!Array.isArray(b.managedCharges)||b.managedCharges.length>1000||new Set(b.managedCharges.map(x=>x.usageId)).size!==b.managedCharges.length)fail('INVALID_MANAGED_CHARGES');const first=Number((b.ledger[0]?.id||'entry-'+b.nextId).split('-')[1]);for(const r of b.managedCharges){const c=b.contracts.find(x=>x.id===r.contractId);if(!r||Object.keys(r).sort().join(',')!=='appliedGeneration,at,cents,contractId,costCategory,costCents,costEntryId,currency,customerId,entryId,jobId,operator,quantity,resource,status,unit,usageId'||r.status!=='posted'||!s.estate?.jobs.some(j=>j.id===r.jobId&&j.items.some(i=>i.resource===r.resource&&i.appliedGeneration===r.appliedGeneration&&i.status==='complete'))||!id(r.usageId)||!id(r.customerId)||!c||c.offer!=='managed-operations'||c.supportOwner!==r.operator||!c.resources.includes(r.resource)||!integer(r.appliedGeneration,1)||!s.resources[r.resource]||r.appliedGeneration>s.resources[r.resource].generation||r.unit!=='managed-operation'||r.quantity!==1||r.currency!=='AUD'||r.cents!==offers['managed-operations'].overage||r.costCents!==Math.ceil(r.cents/2)||!['cost','internal'].includes(r.costCategory)||!integer(r.at)||r.at>s.clock)fail('INVALID_MANAGED_CHARGE');for(const [key,category,cents] of [[r.entryId,'revenue',r.cents],[r.costEntryId,r.costCategory,r.costCents]]){if(!/^entry-[1-9]\d*$/.test(key)||Number(key.split('-')[1])>=b.nextId)fail('INVALID_MANAGED_CHARGE_LEDGER');const row=b.ledger.find(x=>x.id===key);if(!row){if(Number(key.split('-')[1])>=first)fail('MANAGED_CHARGE_LEDGER_MISSING');}else if(row.category!==category||row.cents!==cents||row.contract!==r.contractId||row.usageId!==r.usageId||row.resource!==r.resource||row.appliedGeneration!==r.appliedGeneration||row.unit!==r.unit||row.quantity!==1||row.currency!==r.currency||row.at!==r.at)fail('MANAGED_CHARGE_LEDGER_MISMATCH');}}}
  if(!b.workforce||!integer(b.workforce.engineers,0,20)||!integer(b.workforce.support,0,20)||!['player','bpo','customer'].includes(b.workforce.operator)||b.workforce.hourlyCents!==100)fail('INVALID_CAMPAIGN_WORKFORCE');
  if(!b.qualifications||Object.entries(b.qualifications).some(([org,sectors])=>!own(b.organisations,org)||!sectors||Object.entries(sectors).some(([sector,expires])=>!own(tracks,sector)||!integer(expires,0,Number.MAX_SAFE_INTEGER))))fail('INVALID_QUALIFICATIONS');
  if(!b.balance||!Object.values(b.balance).every(Number.isSafeInteger)||b.balance.cash!==b.balance.opening+b.balance.revenue-b.balance.cost+b.balance.funding-b.balance.repaid)fail('UNRECONCILED_CAMPAIGN_LEDGER');
  for(const p of b.allowancePools)if(!id(p.id)||!own(b.organisations,p.customer)||!b.organisations[p.customer].roles.includes('customer')&&!group(b,p.customer)||!own(b.organisations,p.owner)||!b.organisations[p.owner].roles.some(r=>['msp','integrator','bpo'].includes(r))||p.currency!==b.currency||!id(p.unit)||p.periodMinutes!==PERIOD||!integer(p.allowance,1,1000000)||!integer(p.effectiveAllowance,1,1000000)||!integer(p.desiredAllowance,1,1000000)||!['provisioning','active'].includes(p.status)||!integer(p.readyAt)||!integer(p.periodAnchor)||p.periodAnchor>p.readyAt||p.pendingEffectiveAt!==null&&!integer(p.pendingEffectiveAt)||typeof p.everActivated!=='boolean'||!integer(p.periodIndex)||!integer(p.remaining,0,p.allowance)||!integer(p.consumed,0,p.effectiveAllowance)||p.remaining+p.consumed!==p.effectiveAllowance||p.allowance!==p.effectiveAllowance||new Set(b.allowancePools.map(x=>x.id)).size!==b.allowancePools.length||p.status==='active'&&p.pendingEffectiveAt!==null||p.everActivated===false&&p.status!=='provisioning')fail('INVALID_SAVED_ALLOWANCE_POOL');
  for(const p of b.allowancePools)if(b.contracts.filter(c=>c.allowancePool===p.id).reduce((n,c)=>n+c.sharedIncluded,0)!==p.consumed||b.contracts.filter(c=>c.allowancePool===p.id).some(c=>c.sharedIncluded>c.usage))fail('INVALID_SAVED_ALLOWANCE_USAGE');
  for(const c of b.contracts)if(!id(c.id)||!own(offers,c.offer)||c.unit!==offers[c.offer].unit||c.currency!==b.currency||!integer(c.quantity,1,10000)||!integer(c.price)||!Array.isArray(c.resources)||c.resources.some(id=>!own(s.resources,id))||!['provisioning','blocked','active','renewal','cancelled'].includes(c.status)||!['usage','termBilled','billedPeriods','billedRetail','credits','nextBill','renewAt','readyAt'].every(k=>integer(c[k],0,Number.MAX_SAFE_INTEGER))||c.termBilled>c.billedPeriods||c.vendor!==offers[c.offer].vendor||!own(b.organisations,c.customer)||!own(b.organisations,c.supportOwner)||typeof c.sell!=='boolean'||!integer(c.sharedIncluded)||c.allowancePool!==null&&(!b.allowancePools.some(p=>p.id===c.allowancePool&&p.customer===c.customer&&p.owner===c.supportOwner&&p.currency===c.currency&&p.unit===offers[c.offer].usageUnit&&p.periodMinutes===PERIOD)))fail('INVALID_SAVED_CONTRACT');
  const bindings=b.customerProfileBindings||[];
  if(!Array.isArray(bindings)||bindings.length>b.contracts.length||new Set(bindings.map(x=>x?.contract)).size!==bindings.length)fail('INVALID_CUSTOMER_PROFILE_BINDINGS');
  for(const binding of bindings){const c=b.contracts.find(c=>c.id===binding?.contract),profile=s.customerNeeds?.profiles.find(p=>p.id===binding?.profile);if(!binding||Object.keys(binding).sort().join(',')!=='contract,orderedGeneration,orderedRevision,profile'||!c||c.customerProfile!==binding.profile||!profile?.effective||!integer(binding.orderedGeneration,1)||binding.orderedGeneration>c.customerProfileGeneration||!integer(binding.orderedRevision,1,options.pendingRevision??s.revision))fail('INVALID_CUSTOMER_PROFILE_BINDINGS');const command=s.commands?.find(row=>row.revision===binding.orderedRevision)?.command;if(command&&(command.type!=='business'||command.command?.action!=='order'||command.command.customerProfile!==binding.profile||command.command.offer!==c.offer))fail('INVALID_CUSTOMER_PROFILE_BINDING_LINEAGE');}
  for(const row of s.commands||[])if(row.command?.type==='business'&&row.command.command?.action==='order'&&row.command.command.customerProfile!==undefined&&!bindings.some(binding=>binding.orderedRevision===row.revision&&binding.profile===row.command.command.customerProfile))fail('INVALID_CUSTOMER_PROFILE_BINDING_LINEAGE');
  for(const c of b.contracts){if(c.customerProfile!==undefined&&!bindings.some(binding=>binding.contract===c.id&&binding.profile===c.customerProfile))fail('INVALID_CUSTOMER_PROFILE_BINDINGS');if(c.customerProfile===undefined){if(c.customerProfileGeneration!==undefined)fail('INVALID_CUSTOMER_PROFILE_CONTRACT');continue;}const profile=s.customerNeeds?.profiles.find(p=>p.id===c.customerProfile);if(!id(c.customerProfile)||!profile?.effective||profile.segment!==s.scenario||c.customer!=='customer'||c.sell!==true||!integer(c.customerProfileGeneration,1)||c.customerProfileGeneration>profile.effective.generation)fail('INVALID_CUSTOMER_PROFILE_CONTRACT');}
  for(let i=0;i<b.contracts.length;i++)for(let j=i+1;j<b.contracts.length;j++){const a=b.contracts[i],c=b.contracts[j];if(a.status!=='cancelled'&&c.status!=='cancelled'&&offers[a.offer].usageUnit&&offers[a.offer].usageUnit===offers[c.offer].usageUnit&&a.resources.some(r=>c.resources.includes(r)))fail('INVALID_SAVED_USAGE_CONTRACT_OVERLAP');}
  for(const l of b.ledger)if(!id(l.id)||!Number.isSafeInteger(l.cents)||l.currency!==b.currency||!['revenue','cost','funding','repayment','internal'].includes(l.category))fail('INVALID_CAMPAIGN_LEDGER');
  if(!integer(b.seed,1,2147483646)||!integer(b.lastPeriod)||!integer(b.demand.carry)||!integer(b.demand.multiplier,1,100)||!Object.values(b.metrics).every(x=>integer(x,0,Number.MAX_SAFE_INTEGER)))fail('INVALID_CAMPAIGN_DEMAND');
 }
 function calculate(s,assessment,services){
  const b=s.business;if(!b)return null;
  const outstanding=b.contracts.filter(c=>c.status!=='cancelled').map(c=>({id:c.id,status:c.status,reasons:services?readiness(s,c,services):c.reasons})).filter(c=>c.status!=='active'||c.reasons.length);
  return {pack:b.pack,currency:b.currency,cash:b.balance.cash,profit:b.balance.revenue-b.balance.cost,debt:b.loans.reduce((n,l)=>n+l.principal,0),consolidatedOrganisations:Object.keys(b.organisations).filter(id=>group(b,id)),handled:b.metrics.handled,offered:b.metrics.offered,completion:b.achievements.includes('service-operator')&&!!assessment?.passed&&b.balance.cash>=0&&!outstanding.length&&tracks[s.scenario].offers.every(offer=>b.contracts.some(c=>c.offer===offer&&c.sell&&c.status==='active')),outstanding};
 }
 const source=()=>`const SOC_BUSINESS=(${socBusinessKernel.toString()})();`;
 return {PACK,PERIOD,CURRENCY,offers,tracks,organisations,create,command,advance,meter,meterResource,managedUsage,externalCost,authorise,migrateLegacy,validate,calculate,source};
}
const SOC_BUSINESS=socBusinessKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_BUSINESS;
