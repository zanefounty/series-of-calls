/* A bounded Customer IT opening with its own budget, estate and outage liability. */
function socCustomerItCareerKernel(){
 'use strict';
 const VERSION=1,OPENING_BUDGET=900000,PROTECT_COST=350000,MIGRATE_COST=500000,REPAIR_COST=200000;
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(x,min=0)=>Number.isSafeInteger(x)&&x>=min;
 const exact=(value,fields)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===fields.slice().sort().join(',');
 const choices={protect:{costCents:PROTECT_COST,siteId:'north',workMinutes:3},migrate:{costCents:MIGRATE_COST,siteId:'south',workMinutes:4}};
 function create(s){return {version:VERSION,role:'customer-it',organisationId:'cedar-customer',startedAt:s.clock,budgetOpeningCents:OPENING_BUDGET,budgetCents:OPENING_BUDGET,spentCents:0,opening:null,repair:null,sites:{north:{owner:'cedar-customer',platform:'legacy',protected:false,status:'effective'},south:{owner:'cedar-customer',platform:'legacy',protected:false,status:'effective'}},outage:{at:s.clock+8,status:'scheduled',affectedSiteId:'north',lostMinutes:0},ledger:[]};}
 function quote(s,request){
  if(!s.customerIt||!request||typeof request!=='object'||Array.isArray(request))fail('CUSTOMER_IT_CAREER_REQUIRED');
  const keys=Object.keys(request).sort().join(',');if(keys!=='action,choice'&&keys!=='action')fail('INVALID_CUSTOMER_IT_QUOTE');
  const c=s.customerIt,blockers=[];let costCents=0,siteId=null,workMinutes=0;
  if(request.action==='opening'){
   const choice=choices[request.choice];if(!choice)fail('INVALID_CUSTOMER_IT_CHOICE');
   ({costCents,siteId,workMinutes}=choice);
   if(c.opening)blockers.push('CUSTOMER_IT_OPENING_ALREADY_FUNDED');
   if(s.clock+workMinutes>c.outage.at)blockers.push('CUSTOMER_IT_OPENING_WINDOW_CLOSED');
  }else if(request.action==='repair'){
   if(request.choice!==undefined)fail('INVALID_CUSTOMER_IT_QUOTE');costCents=REPAIR_COST;siteId='north';workMinutes=2;
   if(c.outage.status!=='interrupted')blockers.push('CUSTOMER_IT_NO_INTERRUPTED_SITE');
   if(c.repair)blockers.push('CUSTOMER_IT_REPAIR_ALREADY_FUNDED');
  }else fail('INVALID_CUSTOMER_IT_ACTION');
  if(c.budgetCents<costCents)blockers.push('CUSTOMER_IT_BUDGET_EXCEEDED');
  return {request:copy(request),atRevision:s.revision,organisationId:c.organisationId,siteId,costCents,budgetCents:c.budgetCents,budgetAfterCents:c.budgetCents-costCents,workMinutes,blockers};
 }
 function command(s,request){
  if(!request||typeof request!=='object'||Array.isArray(request)||!integer(request.quoteRevision)||Object.keys(request).some(k=>!['action','choice','quoteRevision'].includes(k)))fail('INVALID_CUSTOMER_IT_COMMAND');
  if(request.quoteRevision!==s.revision)fail('STALE_CUSTOMER_IT_QUOTE');
  const q=quote(s,{action:request.action,...(request.choice!==undefined?{choice:request.choice}:{})});if(q.blockers.length)fail(q.blockers[0]);
  const c=s.customerIt,entry={id:`customer-it-entry-${c.ledger.length+1}`,at:s.clock,category:'cost',reason:request.action==='opening'?'customer-estate-opening':'customer-outage-repair',siteId:q.siteId,cents:q.costCents};
  c.budgetCents-=q.costCents;c.spentCents+=q.costCents;c.ledger.push(entry);
  if(request.action==='opening'){
   c.opening={choice:request.choice,acceptedAt:s.clock,effectiveAt:s.clock+q.workMinutes,siteId:q.siteId,costCents:q.costCents,entryId:entry.id};
   c.sites[q.siteId].status='provisioning';
  }else{c.repair={acceptedAt:s.clock,effectiveAt:s.clock+q.workMinutes,siteId:q.siteId,costCents:q.costCents,entryId:entry.id};c.sites.north.status='provisioning';}
 }
 function afterMinute(s){
  const c=s.customerIt;if(!c)return;
  if(c.opening&&s.clock>=c.opening.effectiveAt){const site=c.sites[c.opening.siteId];if(c.opening.choice==='protect')site.protected=true;else site.platform='managed';if(site.status==='provisioning')site.status='effective';}
  if(s.clock===c.outage.at){c.outage.status=c.sites.north.protected?'protected':'interrupted';if(c.outage.status==='interrupted')c.sites.north.status='interrupted';}
  if(c.outage.status==='interrupted')c.outage.lostMinutes++;
  if(c.repair&&s.clock>=c.repair.effectiveAt&&c.outage.status==='interrupted'){c.sites.north.status='effective';c.outage.status='recovered';}
 }
 function inspect(s){if(!s.customerIt)return null;const c=s.customerIt;return {...copy(c),clock:s.clock,revision:s.revision,openingQuotes:Object.keys(choices).map(choice=>quote(s,{action:'opening',choice})),repairQuote:quote(s,{action:'repair'}),mspTreasuryCents:s.business?.balance?.cash??null};}
 function validate(s){
  const c=s.customerIt;if(!c)return true;
  if(!s.providerCampaign||s.careerRole!=='customer-it'||s.experience?.kind!=='campaign'||s.scenario!=='enterprise'||!exact(c,['version','role','organisationId','startedAt','budgetOpeningCents','budgetCents','spentCents','opening','repair','sites','outage','ledger'])||c.version!==VERSION||c.role!=='customer-it'||c.organisationId!=='cedar-customer'||!integer(c.startedAt)||c.startedAt>s.clock||c.budgetOpeningCents!==OPENING_BUDGET||!integer(c.budgetCents)||!integer(c.spentCents)||c.budgetCents+c.spentCents!==OPENING_BUDGET||!Array.isArray(c.ledger)||c.ledger.length>2)fail('INVALID_CUSTOMER_IT_CAREER');
  if(!exact(c.sites,['north','south'])||!exact(c.sites.north,['owner','platform','protected','status'])||!exact(c.sites.south,['owner','platform','protected','status'])||!exact(c.outage,['at','status','affectedSiteId','lostMinutes'])||c.outage.at!==c.startedAt+8||c.outage.affectedSiteId!=='north'||!integer(c.outage.lostMinutes))fail('INVALID_CUSTOMER_IT_ESTATE');
  const entries=[c.opening,c.repair].filter(Boolean);if(entries.length!==c.ledger.length||c.spentCents!==entries.reduce((n,x)=>n+x.costCents,0))fail('INVALID_CUSTOMER_IT_BUDGET');
  for(const [index,record] of entries.entries()){
   const isOpening=record===c.opening,choice=isOpening?choices[record.choice]:null,cost=isOpening?choice?.costCents:REPAIR_COST,duration=isOpening?choice?.workMinutes:2,siteId=isOpening?choice?.siteId:'north',row=c.ledger[index];
   if(!exact(record,isOpening?['choice','acceptedAt','effectiveAt','siteId','costCents','entryId']:['acceptedAt','effectiveAt','siteId','costCents','entryId'])||!exact(row,['id','at','category','reason','siteId','cents'])||!integer(record.acceptedAt,c.startedAt)||record.acceptedAt>s.clock||record.effectiveAt!==record.acceptedAt+duration||isOpening&&record.effectiveAt>c.outage.at||record.siteId!==siteId||record.costCents!==cost||record.entryId!==row.id||row.id!==`customer-it-entry-${index+1}`||row.at!==record.acceptedAt||row.category!=='cost'||row.reason!==(isOpening?'customer-estate-opening':'customer-outage-repair')||row.siteId!==siteId||row.cents!==cost)fail('INVALID_CUSTOMER_IT_LEDGER');
  }
  if(s.commands.length<1000){const commands=s.commands.filter(row=>row.command?.type==='customer-it');if(commands.length!==entries.length||commands.some((row,index)=>row.at!==entries[index].acceptedAt||row.command.command.action!==(entries[index]===c.opening?'opening':'repair')||row.command.command.choice!==entries[index].choice))fail('INVALID_CUSTOMER_IT_COMMAND_LINEAGE');}
  if(c.repair&&(c.repair.acceptedAt<c.outage.at||c.opening&&c.repair.acceptedAt<c.opening.acceptedAt))fail('INVALID_CUSTOMER_IT_REPAIR');
  const north=c.sites.north,south=c.sites.south,protectedSite=!!c.opening&&c.opening.choice==='protect'&&s.clock>=c.opening.effectiveAt,migrated=!!c.opening&&c.opening.choice==='migrate'&&s.clock>=c.opening.effectiveAt,repaired=!!c.repair&&s.clock>=c.repair.effectiveAt;
  if(north.owner!==c.organisationId||south.owner!==c.organisationId||north.platform!=='legacy'||south.platform!==(migrated?'managed':'legacy')||north.protected!==protectedSite||south.protected!==false||north.status!==(s.clock<c.outage.at?c.opening?.choice==='protect'&&s.clock<c.opening.effectiveAt?'provisioning':'effective':protectedSite||repaired?'effective':c.repair?'provisioning':'interrupted')||south.status!==(c.opening?.choice==='migrate'&&s.clock<c.opening.effectiveAt?'provisioning':'effective'))fail('INVALID_CUSTOMER_IT_ESTATE');
  const status=s.clock<c.outage.at?'scheduled':protectedSite?'protected':repaired?'recovered':'interrupted';if(c.outage.status!==status||c.outage.lostMinutes!==(status==='interrupted'?s.clock-c.outage.at+1:status==='recovered'?c.repair.effectiveAt-c.outage.at+1:0))fail('INVALID_CUSTOMER_IT_OUTAGE');
  return true;
 }
 function source(){return `const SOC_CUSTOMER_IT_CAREER=(${socCustomerItCareerKernel.toString()})();`;}
 return {VERSION,create,quote,command,afterMinute,inspect,validate,source};
}
const SOC_CUSTOMER_IT_CAREER=socCustomerItCareerKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_CUSTOMER_IT_CAREER;
