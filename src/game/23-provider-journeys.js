/* Pure explanations of retained execution evidence; never a metering source. */
function socProviderJourneysKernel(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 function leg(root,interaction){
  const trace=interaction.trace||[],end=interaction.finishedAt??root.clock;
  // A capped trace may have lost its first transition. Do not invent elapsed work.
  const knownTimeline=trace.some(t=>['ENQUEUED','HUMAN_HANDOFF','CONVERSATION_STARTED','AGENT_ASSIGNED'].includes(t.code));
  const complete=trace.length<80&&trace[0]?.at===interaction.startedAt&&(knownTimeline||interaction.phase==='failed');
  const elapsed={waiting:0,handling:0,wrap:0};let phase=null,since=interaction.startedAt;
  const transition=(next,at)=>{if(phase)elapsed[phase]+=Math.max(0,at-since);phase=next;since=at;};
  for(const event of trace){
   if(event.at>end)break;
   if(['ENQUEUED','HUMAN_HANDOFF','TRANSFER'].includes(event.code))transition('waiting',event.at);
   else if(['AGENT_ASSIGNED','CONVERSATION_STARTED'].includes(event.code))transition('handling',event.at);
   else if(event.code==='WRAP_UP')transition('wrap',event.at);
   else if(event.stage==='outcome')transition(null,event.at);
  }
  transition(null,end);
  const carrierAdmitted=trace.some(t=>t.code==='CARRIER_PATH_ADMITTED'&&['inbound','outbound'].includes(t.direction)||t.code==='CARRIER_MODEL_SELECTED'&&(!t.direction||t.direction==='inbound'));
  return {interactionId:interaction.id,channel:interaction.channel,phase:interaction.phase,probe:interaction.probe===true,
   timelineComplete:complete,waitingMinutes:complete?elapsed.waiting:null,handlingMinutes:complete?elapsed.handling:null,wrapMinutes:complete?elapsed.wrap:null,
   carrierOccupied:interaction.channel==='voice'&&carrierAdmitted&&['queued','handling','ringing','shared-active','parked','connected'].includes(interaction.phase),
   meteredVoiceMinutes:interaction.usageMinutes||0,agent:interaction.agent||null};
 }
 function inspect(root,job,plan){
  const ids=job.followup?[job.interactionId,...job.followup.attempts.map(a=>a.interactionId)]:job.handoff?[job.handoff.sourceInteractionId,job.handoff.targetInteractionId]:job.resilienceSequence?job.resilienceSequence.phases.map(p=>p.interactionId):[job.interactionId],interactions=ids.map(id=>root.interactions.find(i=>i.id===id)).filter(Boolean);
  return {caseId:job.caseId,legs:interactions.map(i=>leg(root,i)),missingInteractions:ids.filter(Boolean).length-interactions.length,
   supplierUsage:{voiceMinutes:job.voiceMinutes,messageDeliveries:job.followup?job.messageUnits:(job.messageCharged?1:0),voiceCentsPerMinute:plan.voiceCents,messageCentsPerDelivery:plan.messageCents,costCents:job.voiceMinutes*plan.voiceCents+(job.followup?job.messageUnits*plan.messageCents:(job.messageCharged?plan.messageCents:0))},
   retailBasis:'period-service-with-delivery-credits',trace:copy(interactions.at(-1)?.trace||[])};
 }
 function meeting(root,sessionId){
  const session=root.information?.meetingSessions?.find(s=>s.id===sessionId);
  if(!session)return null;
  return {id:session.id,bookingId:session.bookingId,roomId:session.roomId,status:session.status,scheduledAt:session.scheduledAt,startedAt:session.startedAt,endsAt:session.endsAt,endedAt:session.endedAt,reasons:copy(session.reasons||[]),platformDependency:session.platformDependency?copy(session.platformDependency):null,captureRecordId:session.captureRecordId,audit:copy((root.information.audit||[]).filter(a=>a.session===session.id))};
 }
 function missionMeetings(root,rows){return rows.slice(-6).map(row=>{
  const session=meeting(root,row.sessionId),status=session?({completed:'completed',failed:'failed',cancelled:'failed',scheduled:'pending',active:'pending'}[session.status]||'unknown'):row.status==='blocked'?'failed':'unknown';
  return {id:'mission-meeting-'+row.periodIndex,sourceKind:'mission-meeting',channel:'meeting',arrivalAt:row.attemptedAt,deadlineAt:null,status,failure:row.reason||session?.reasons?.join(',')||null,meeting:session,trace:session?.audit||[]};
 });}
 const source=()=>`const SOC_PROVIDER_JOURNEYS=(${socProviderJourneysKernel.toString()})();`;
 return {leg,inspect,meeting,missionMeetings,source};
}
const SOC_PROVIDER_JOURNEYS=socProviderJourneysKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_JOURNEYS;
