/* Bounded diagnostic history for owned provider customer roots.
   Settlement facts live in the parent campaign; active work and retained capture stay live. */
function socProviderHistoryKernel(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 function compact(s){
  if(!s.providerCustomer){for(const row of s.portfolio?.customers||[])if(row.active&&row.root?.providerCustomer)compact(row.root);return;}
  const cp=s.providerArchive||(s.providerArchive={version:1,interactions:0,resolved:0,failed:0,cases:0,commands:0,ledgerMinutes:0,assignments:0,throughInteractionId:0});
  if(!cp.channels)cp.channels={conversations:0,acceptances:0,deliveries:0,reads:0,webhookDelivered:0,webhookFailed:0,throughAt:0};
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
  compactChannels(s,cp);
 }
 function compactChannels(s,cp){
  const c=s.channels;if(!c)return;
  const aged=at=>Number.isSafeInteger(at)&&at<s.clock-60;
  const interactionById=new Map((s.interactions||[]).map(i=>[i.id,i]));
  const terminalInteraction=id=>{const i=interactionById.get(id);if(i)return ['resolved','failed'].includes(i.phase)&&aged(i.finishedAt);const number=Number(/^interaction-([1-9]\d*)$/.exec(id||'')?.[1]||0);return number>0&&number<=(s.tracePrunedThrough||0);};
  const jobById=new Map((s.operations?.jobs||[]).map(j=>[j.id,j]));
  const receiptsById=new Map((c.receipts||[]).map(r=>[r.id,r]));
  const webhooks=c.webhooks?.deliveries||[];
  const blockedByWebhook=new Set(webhooks.filter(d=>{const r=receiptsById.get(d.receipt);return r&&(!aged(d.createdAt)||!['delivered','failed'].includes(d.status));}).map(d=>receiptsById.get(d.receipt).interaction));
  const acceptanceEligible=new Set();
  const receiptsByInteraction=new Map();for(const r of c.receipts||[]){if(!receiptsByInteraction.has(r.interaction))receiptsByInteraction.set(r.interaction,[]);receiptsByInteraction.get(r.interaction).push(r);}
  for(const a of c.acceptances||[]){const job=jobById.get(a.parentJob),receipts=receiptsByInteraction.get(a.interaction)||[];if(aged(a.authorizedAt)&&terminalInteraction(a.interaction)&&!blockedByWebhook.has(a.interaction)&&receipts.every(r=>aged(r.at))&&(!job||['delivered','failed'].includes(job.status)))acceptanceEligible.add(a.interaction);}
  const removeReceipt=new Set((c.receipts||[]).filter(r=>aged(r.at)&&acceptanceEligible.has(r.interaction)).map(r=>r.id));
  const removeAcceptance=new Set((c.acceptances||[]).filter(a=>acceptanceEligible.has(a.interaction)).map(a=>a.id));
  const removeWebhook=new Set(webhooks.filter(d=>removeReceipt.has(d.receipt)&&aged(d.createdAt)&&['delivered','failed'].includes(d.status)).map(d=>d.id));
  if(removeWebhook.size){c.webhooks.deliveries=webhooks.filter(d=>!removeWebhook.has(d.id));for(const d of webhooks)if(removeWebhook.has(d.id)){if(d.status==='delivered')cp.channels.webhookDelivered++;else cp.channels.webhookFailed++;cp.channels.throughAt=Math.max(cp.channels.throughAt,d.deliveredAt||d.createdAt);}}
  if(removeReceipt.size){for(const r of c.receipts)if(removeReceipt.has(r.id)){if(r.kind==='delivery')cp.channels.deliveries++;else cp.channels.reads++;cp.channels.throughAt=Math.max(cp.channels.throughAt,r.at);}c.receipts=c.receipts.filter(r=>!removeReceipt.has(r.id));}
  if(removeAcceptance.size){for(const a of c.acceptances)if(removeAcceptance.has(a.id)){cp.channels.acceptances++;cp.channels.throughAt=Math.max(cp.channels.throughAt,a.authorizedAt);}c.acceptances=c.acceptances.filter(a=>!removeAcceptance.has(a.id));}
  const retainedAcceptanceConversations=new Set([...(c.acceptances||[]).map(a=>a.conversation),...(c.receipts||[]).map(r=>r.conversation)].filter(Boolean));
  const recentlyUsedConversations=new Set([...(c.acceptances||[]).filter(a=>!aged(a.authorizedAt)).map(a=>a.conversation),...(c.receipts||[]).filter(r=>!aged(r.at)).map(r=>r.conversation)].filter(Boolean));
  const activeCases=new Set((s.interactions||[]).filter(i=>!['resolved','failed'].includes(i.phase)).map(i=>i.caseId));for(const n of s.outcomes?.needs||[])if(['open','pending'].includes(n.status))activeCases.add(n.caseId);
  const removedConversationIds=new Set((c.conversations||[]).filter(x=>aged(x.openedAt)&&!retainedAcceptanceConversations.has(x.id)&&!recentlyUsedConversations.has(x.id)&&!activeCases.has(x.caseId)&&(['expired','closed'].includes(x.status)||x.status==='active')).map(x=>x.id));
  if(removedConversationIds.size){for(const x of c.conversations)if(removedConversationIds.has(x.id)){cp.channels.conversations++;cp.channels.throughAt=Math.max(cp.channels.throughAt,x.openedAt);}c.conversations=c.conversations.filter(x=>!removedConversationIds.has(x.id));}
 }
 function validate(s){
  const p=s.providerArchive;if(p===undefined)return true;
  const keys=Object.keys(p||{}).sort().join(',');if(!s.providerCustomer||!p||!['assignments,cases,commands,failed,interactions,ledgerMinutes,resolved,throughInteractionId,version','assignments,cases,channels,commands,failed,interactions,ledgerMinutes,resolved,throughInteractionId,version'].includes(keys)||p.version!==1||Object.entries(p).filter(([k])=>k!=='channels').some(([k,v])=>!Number.isSafeInteger(v)||v<0)||p.interactions!==p.resolved+p.failed||p.throughInteractionId>(s.tracePrunedThrough||0)||p.throughInteractionId>=s.nextId)throw new Error('INVALID_PROVIDER_ARCHIVE');
  if(p.channels&&(!p.channels||Object.keys(p.channels).sort().join(',')!=='acceptances,conversations,deliveries,reads,throughAt,webhookDelivered,webhookFailed'||Object.values(p.channels).some(v=>!Number.isSafeInteger(v)||v<0)||p.channels.throughAt>s.clock))throw new Error('INVALID_PROVIDER_CHANNEL_ARCHIVE');
  return true;
 }
 const source=()=>`const SOC_PROVIDER_HISTORY=(${socProviderHistoryKernel.toString()})();`;
 return {compact,validate,source};
}
const SOC_PROVIDER_HISTORY=socProviderHistoryKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_HISTORY;
