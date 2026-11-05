/* Bounded origins for the actual voice/message work used by support history. */
function socProviderSupportWorkKernel(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const integer=x=>Number.isSafeInteger(x)&&x>=0;
 const keys=(x,expected)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===expected.slice().sort().join(',');
 const fail=()=>{throw new Error('INVALID_PROVIDER_SUPPORT_WORK');};
 const childFor=(s,c)=>s.portfolio?.customers?.find(row=>row.id===c.portfolioId)?.root;
 function work(s,c,j){
  if(!j||j.customerId!==c.id||j.resilienceSequence||!['voice','message'].includes(j.channel)||!['completed','late'].includes(j.status)||j.contextRetained!==true||!integer(j.completedAt))return null;
  const root=childFor(s,c),i=root?.interactions?.find(row=>row.id===j.interactionId),record=root?.cases?.[j.caseId];
  if(!i||i.probe===true||i.phase!=='resolved'||i.channel!==j.channel||i.caseId!==j.caseId||i.finishedAt!==j.completedAt||i.startedAt!==j.arrivalAt||i.context!==true||i.needOutcome&&i.needOutcome.outcome!=='resolved'||record?.tenant!==root.tenant||!record.interactions?.includes(i.id))return null;
  return {root,interaction:i};
 }
 function arrivalFor(p,j){return p.events.find(e=>e.code==='CUSTOMER_WORK_ARRIVED'&&e.jobId===j.id&&e.customerId===j.customerId&&e.caseId===j.caseId&&e.interactionId===j.interactionId&&e.channel===j.channel&&e.at===j.arrivalAt&&e.deadlineAt===j.deadlineAt);}
 function pins(s,customerId){
  const rows=s.providerCampaign?.supportWork?.origins?.filter(row=>row.customerId===customerId)||[];
  if(!rows.length)return undefined;
  return {version:1,jobIds:rows.map(r=>r.jobId),interactionIds:rows.map(r=>r.arrival.interactionId),caseIds:rows.map(r=>r.arrival.caseId)};
 }
 function capture(s,customerId){
  const p=s.providerCampaign;if(p?.contentVersion!=='provider-campaigns-8')return;
  const c=p.customers.find(row=>row.id===customerId);if(!c)return;
  // New v8 runs carry this journal. Never invent origins for old pruned work.
  if(!p.supportWork)p.supportWork={version:1,origins:[]};
  for(const channel of ['voice','message']){
   if(p.supportWork.origins.some(row=>row.customerId===c.id&&row.channel===channel))continue;
   const j=p.jobs.find(j=>j.channel===channel&&work(s,c,j)&&arrivalFor(p,j));if(!j)continue;
   p.supportWork.origins.push({customerId:c.id,channel,jobId:j.id,completedAt:j.completedAt,arrival:copy(arrivalFor(p,j))});
  }
  const root=childFor(s,c),marker=pins(s,c.id);if(root&&marker)root.providerSupportPins=marker;
 }
 function validate(s){
  const p=s.providerCampaign,journal=p?.supportWork;
  if(journal===undefined){if(p?.contentVersion==='provider-campaigns-8')fail();return true;}
  if(p.contentVersion!=='provider-campaigns-8'||!keys(journal,['version','origins'])||journal.version!==1||!Array.isArray(journal.origins)||journal.origins.length>40)fail();
  const seen=new Set();
  for(const row of journal.origins){
   if(!keys(row,['customerId','channel','jobId','completedAt','arrival'])||!['voice','message'].includes(row.channel)||seen.has(row.customerId+'\0'+row.channel))fail();seen.add(row.customerId+'\0'+row.channel);
   const c=p.customers.find(c=>c.id===row.customerId),j=p.jobs.find(j=>j.id===row.jobId),a=row.arrival;
   if(!c||!work(s,c,j)||row.completedAt!==j.completedAt||row.completedAt>s.clock||row.channel!==j.channel||!keys(a,['id','at','code','customerId','jobId','caseId','channel','interactionId','deadlineAt'])||a.code!=='CUSTOMER_WORK_ARRIVED'||a.customerId!==c.id||a.jobId!==j.id||a.caseId!==j.caseId||a.channel!==j.channel||a.interactionId!==j.interactionId||a.at!==j.arrivalAt||a.deadlineAt!==j.deadlineAt)fail();
   const n=Number(/^provider-event-([1-9]\d*)$/.exec(a.id||'')?.[1]||0),actual=p.events.find(e=>e.id===a.id);
   if(!n||n>=p.nextEventId||(actual?!same(actual,a):!(n<=p.eventCheckpoint.count&&p.eventCheckpoint.codes.CUSTOMER_WORK_ARRIVED>0)))fail();
   // Normal Provider demand uses scenario-owned case IDs. Maintenance calls,
   // probes and arbitrary same-tenant interactions cannot become these origins.
   if(!integer(j.periodIndex)||j.periodIndex!==Math.floor((j.arrivalAt-1)/60)||!j.caseId.startsWith('pc-'+c.id+'-'+j.periodIndex+'-')||!/^\d+$/.test(j.caseId.slice(('pc-'+c.id+'-'+j.periodIndex+'-').length)))fail();
  }
  for(const c of p.customers){
   if(!same(childFor(s,c)?.providerSupportPins,pins(s,c.id)))fail();
   for(const channel of ['voice','message'])if(p.jobs.some(j=>j.channel===channel&&work(s,c,j))&&!seen.has(c.id+'\0'+channel))fail();
  }
  return true;
 }
 function origin(s,customerId,interaction,at){
  return s.providerCampaign?.supportWork?.origins?.find(row=>row.customerId===customerId&&row.arrival.interactionId===interaction.id&&row.arrival.caseId===interaction.caseId&&row.channel===interaction.channel&&row.completedAt<=at)?.arrival||null;
 }
 const source=()=>`const SOC_PROVIDER_SUPPORT_WORK=(${socProviderSupportWorkKernel.toString()})();`;
 return {capture,validate,pins,origin,source};
}
const SOC_PROVIDER_SUPPORT_WORK=socProviderSupportWorkKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_SUPPORT_WORK;
