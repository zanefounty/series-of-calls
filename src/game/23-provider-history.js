/* Bounded diagnostic history for owned provider customer roots.
   Settlement facts live in the parent campaign; active work and retained capture stay live. */
function socProviderHistoryKernel(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 function compact(s){
  if(!s.providerCustomer)return;
  const cp=s.providerArchive||(s.providerArchive={version:1,interactions:0,resolved:0,failed:0,cases:0,commands:0,ledgerMinutes:0,assignments:0,throughInteractionId:0});
  const protectedInteractions=new Set((s.records||[]).filter(r=>!r.deleted).map(r=>r.interaction));
  for(const r of [...(s.workforceQuality?.reviews||[]),...(s.providerReviews||[])])if(r.interactionId)protectedInteractions.add(r.interactionId);
  while(s.interactions.length>64){const index=s.interactions.findIndex(i=>['resolved','failed'].includes(i.phase)&&i.finishedAt<s.clock-60&&!protectedInteractions.has(i.id));if(index<0)break;
   const [i]=s.interactions.splice(index,1);cp.interactions++;cp[i.phase]++;const n=Number(i.id.slice(12));if(Number.isSafeInteger(n)){cp.throughInteractionId=Math.max(cp.throughInteractionId,n);s.tracePrunedThrough=Math.max(s.tracePrunedThrough||0,n);}
  }
  const cases=new Set(s.interactions.map(i=>i.caseId));
  for(const n of s.outcomes?.needs||[])cases.add(n.caseId);
  for(const c of s.channels?.conversations||[])cases.add(c.caseId);
  // Specialized review snapshots can retain their case identity after a trace rolls away.
  if(s.workforceQuality)for(const key of Object.keys(s.cases))cases.add(key);
  for(const key of Object.keys(s.cases))if(!cases.has(key)){delete s.cases[key];cp.cases++;}
  if(s.commands.length>128){cp.commands+=s.commands.length-128;s.commands=s.commands.slice(-128);}
  if(s.ledger.length>120){cp.ledgerMinutes+=s.ledger.length-120;s.ledger=s.ledger.slice(-120);}
  if(s.workforceOps&&!s.workforceQuality){const keep=new Set(s.interactions.map(i=>i.workforceAssignment).filter(Boolean)),old=s.workforceOps.assignments;
   s.workforceOps.assignments=old.filter(a=>a.status!=='complete'||keep.has(a.interaction));cp.assignments+=old.length-s.workforceOps.assignments.length;
  }
 }
 function validate(s){
  const p=s.providerArchive;if(p===undefined)return true;
  if(!s.providerCustomer||!p||Object.keys(p).sort().join(',')!=='assignments,cases,commands,failed,interactions,ledgerMinutes,resolved,throughInteractionId,version'||p.version!==1||Object.entries(p).some(([k,v])=>!Number.isSafeInteger(v)||v<0)||p.interactions!==p.resolved+p.failed||p.throughInteractionId>(s.tracePrunedThrough||0)||p.throughInteractionId>=s.nextId)throw new Error('INVALID_PROVIDER_ARCHIVE');
  return true;
 }
 const source=()=>`const SOC_PROVIDER_HISTORY=(${socProviderHistoryKernel.toString()})();`;
 return {compact,validate,source};
}
const SOC_PROVIDER_HISTORY=socProviderHistoryKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_HISTORY;
