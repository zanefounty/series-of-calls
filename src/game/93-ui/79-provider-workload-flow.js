/* Read-only explanation of a selected path from an actual customer journey. */
(function(g){
 'use strict';
 const N_=g.N_||(x=>x),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={
  title:[N_('provider.flow.title'),'Customer journey'],
  delivered:[N_('provider.flow.delivered'),'This case was delivered.'],
  late:[N_('provider.flow.late'),'This case was delivered after its deadline.'],
  failed:[N_('provider.flow.failed'),'This attempt failed. Review the recorded cause and affected service before choosing a response.'],
  pending:[N_('provider.flow.pending'),'This case is still in progress. Resume simulation time to observe what happens next.'],
  unknown:[N_('provider.flow.unknown'),'No delivery outcome is retained for this journey.'],
  missing:[N_('provider.flow.missing'),'This journey is no longer in the recent map history. Return to the customer to inspect current work.'],
  channel:[N_('provider.flow.channel'),'Channel'],case:[N_('provider.flow.case'),'Case'],
  arrival:[N_('provider.flow.arrival'),'Arrival minute'],deadline:[N_('provider.flow.deadline'),'Deadline minute'],
  started:[N_('provider.flow.started'),'Meeting started at minute'],finished:[N_('provider.flow.finished'),'Meeting ended at minute'],
  observed:[N_('provider.flow.observed'),'Latest observed minute'],
  evidence:[N_('provider.flow.evidence'),'Recorded journey evidence'],
  incident:[N_('provider.flow.incident'),'Inspect the active service incident'],
  service:[N_('provider.flow.service'),'Inspect affected service'],
  sessions:[N_('provider.flow.sessions'),'All eligible carrier sessions were occupied. Inspect carrier headroom and active calls.'],
  staff:[N_('provider.flow.staff'),'No eligible handler was available. Inspect staff availability, skills and assignments.'],
  media:[N_('provider.flow.media'),'The call could not carry the required media. Inspect the calling path and its observed condition.'],
  meetingCapacity:[N_('provider.flow.meeting_capacity'),'The meeting could not admit its participants or reserve its required capacity. Inspect the room, capture capacity and active incident.'],
  meetingDependency:[N_('provider.flow.meeting_dependency'),'A required meeting service or joining path was unavailable. Inspect the room and its recorded dependency evidence.'],
  signalling:[N_('provider.flow.signalling'),'The calling connection could not be established. Inspect the carrier and any active incident.'],
  cause:[N_('provider.flow.cause'),'Recorded failure: {cause}'],
  voice:[N_('provider.flow.voice'),'Voice'],message:[N_('provider.flow.message'),'Message'],video:[N_('provider.flow.video'),'Video'],meeting:[N_('provider.flow.meeting'),'Meeting']
 };
 function text(key,vars={}){const [id,fallback]=labels[key],value=typeof g.tr==='function'?g.tr(id,vars):id;return value&&value!==id?value:fallback.replace(/\{(\w+)\}/g,(_,k)=>vars[k]??'');}
 function render(model,edge){
  const customer=(model.customers||[]).find(c=>c.id===edge.scope),journey=[...(customer?.journeys||[]),...(customer?.meetingJourneys||[])].find(j=>j.id===edge.flowId);
  if(!journey)return `<section class="provider-workload-flow"><h2>${esc(text('title'))}</h2><p>${esc(text('missing'))}</p></section>`;
  const outcome=['failed','cancelled'].includes(journey.meeting?.status)?'failed':({completed:'delivered',late:'late',failed:'failed',queued:'pending',active:'pending',pending:'pending',running:'pending',handling:'pending'}[journey.status]||'unknown');
  const trace=journey.meeting?.audit||(Array.isArray(journey.trace)?journey.trace:[]),latest=trace.reduce((at,row)=>Number.isFinite(row.at)?Math.max(at??row.at,row.at):at,null),failure=journey.meeting?.reasons?.join(',')||journey.failure;
  const reason=failure?text(journey.meeting?(/CAPACITY|OCCUPIED/.test(failure)?'meetingCapacity':'meetingDependency'):failure==='SESSION_CAPACITY'?'sessions':failure==='SIGNALLING_FAILED'?'signalling':['NO_ELIGIBLE_AGENT','NO_AGENT_AVAILABLE'].includes(failure)?'staff':['MEDIA_FAILED','MEDIA_UNAVAILABLE','MEDIA_PATH_FAILED'].includes(failure)?'media':'cause',{cause:String(failure).replaceAll('_',' ').toLowerCase()}):null;
  const caseId=journey.caseId||journey.lifecycle?.caseId||trace.find(t=>t.code==='CASE_LINKED')?.caseId;
  const values=[['channel',labels[journey.channel]?text(journey.channel):journey.channel],['case',caseId],['arrival',journey.arrivalAt],['deadline',journey.deadlineAt],['observed',latest],['started',journey.meeting?.startedAt],['finished',journey.meeting?.endedAt]].filter(([,v])=>v!==null&&v!==undefined);
  const target=(customer.services||[]).find(s=>`${edge.scope}:${s.id}`===edge.to);
  const incidents=(model.incidents||[]).filter(i=>i.customerId===edge.scope&&['active','acknowledged'].includes(i.status));
  return `<section class="provider-workload-flow" data-provider-view-key="flow:${esc(journey.id)}"><h2>${esc(text('title'))}</h2><p role="status">${esc(text(outcome))}</p>${reason?`<p class="provider-blocked">${esc(reason)}</p>`:''}<dl>${values.map(([key,value])=>`<dt>${esc(text(key))}</dt><dd>${esc(value)}</dd>`).join('')}</dl>${g.SOCProviderJourneys?.render(journey)||''}${g.SOCProviderCaseHandoffUI?.render(journey,edge.scope,model.clock)||''}${g.SOCProviderCaseFollowupUI?.render(journey,edge.scope)||''}${target?`<button data-provider-action="select-service" data-customer="${esc(edge.scope)}" data-id="${esc(target.id)}">${esc(text('service'))}: ${esc(target.name||target.id)}</button>`:''}${incidents.map(i=>`<button class="primary" data-provider-action="select-incident" data-id="${esc(i.id)}">${esc(text('incident'))}</button>`).join('')}<details data-provider-detail="flow-evidence:${esc(journey.id)}"><summary>${esc(text('evidence'))}</summary><pre>${esc(JSON.stringify(trace,null,2))}</pre></details></section>`;
 }
 g.SOCProviderWorkloadFlow={render,labelFallbacks:Object.fromEntries(Object.values(labels))};
 if(typeof module!=='undefined'&&module.exports)module.exports=g.SOCProviderWorkloadFlow;
})(globalThis);
