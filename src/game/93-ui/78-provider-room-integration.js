/* Pure paid room-interoperability project panel; tests enter validated Provider dispatch. */
(function(g){
 'use strict';
 const N_=g.N_||(x=>x),esc=g.SOCProviderHud.esc;
 const KEYS=Object.freeze({
  title:N_('provider.room_integration.title'),name:N_('provider.room_integration.name'),description:N_('provider.room_integration.description'),
  purpose:N_('provider.room_integration.purpose'),
  status:N_('provider.room_integration.status'),missing:N_('provider.room_integration.missing'),
  test:N_('provider.room_integration.test'),evidence:N_('provider.room_integration.evidence'),
  completedMinutes:N_('provider.room_integration.completed_minutes'),path:N_('provider.room_integration.path'),
  running:N_('provider.room_integration.status_running'),commissioning:N_('provider.room_integration.status_commissioning'),
  complete:N_('provider.room_integration.status_complete'),cancelled:N_('provider.room_integration.status_cancelled'),
  setupInProgress:N_('provider.room_integration.setup_in_progress'),cancelledCondition:N_('provider.room_integration.cancelled_condition'),
  blockedStatus:N_('provider.room_integration.status_blocked'),waitingTest:N_('provider.room_integration.waiting_test'),
  waitingMeeting:N_('provider.room_integration.waiting_meeting'),blocked:N_('provider.room_integration.blocked'),
  ready:N_('provider.room_integration.ready'),technical:N_('provider.room_integration.technical_details'),
  recordingRequired:N_('provider.room_integration.recording_required'),captionsRequired:N_('provider.room_integration.captions_required'),
  pathRequired:N_('provider.room_integration.path_required')
 });
 const FALLBACK=Object.freeze({
  title:'Grove and Disco room integration',name:'Grove and Disco room integration',
  description:'Paid 8-minute setup installs the current room edge. Run its explicit compatibility test, then complete a real bridge meeting to deliver.',
  purpose:'Commission a tested Microsoft Rooms to Cisco interoperability edge, then complete a real bridge meeting for this customer.',
  status:'Project status',missing:'Current requirements',test:'Test room integration',
  evidence:'Delivery evidence',completedMinutes:'Completed meeting minutes',path:'Observed meeting path',
  running:'Running',commissioning:'Commissioning',complete:'Complete',cancelled:'Cancelled',blockedStatus:'Blocked',
  setupInProgress:'Paid setup is in progress. The exact quoted room configuration is being installed.',cancelledCondition:'This paid setup was cancelled before room configuration was submitted.',
  waitingTest:'Run or repeat the explicit room compatibility test after setup or repair.',
  waitingMeeting:'The integration test passed. Complete a real bridge meeting with measurable duration.',
  blocked:'The room edge or a required endpoint is unavailable. Repair it, then retest.',
  ready:'The test and meeting evidence are ready for delivery.',technical:'Technical details',
  recordingRequired:'This room profile records meetings. Commission its recorder and archive before ordering.',
  captionsRequired:'This room profile uses captions. Commission speech processing and archive before ordering.',
  pathRequired:'Commission a live transport path between identity and the room before ordering this integration.'
 });
 function text(key){const label=KEYS[key],value=typeof g.tr==='function'?g.tr(label):label;return value&&value!==label?value:FALLBACK[key];}
 function render(model,customerId,projectId){
  const rows=Array.isArray(model?.projects)?model.projects:[];
  const project=projectId?rows.find(row=>row.projectId===projectId&&(!customerId||row.customerId===customerId)):rows.find(row=>!customerId||row.customerId===customerId);
  if(!project)return '';
  const evidence=project.evidence||null,meeting=evidence?.meeting||evidence?.session||{};
  const minutes=Number.isSafeInteger(evidence?.actualMinutes)?evidence.actualMinutes:
   Number.isSafeInteger(meeting?.durationMinutes)?meeting.durationMinutes:
   Number.isSafeInteger(meeting?.startedAt)&&Number.isSafeInteger(meeting?.endedAt)?meeting.endedAt-meeting.startedAt:null;
  const path=meeting?.acceptance?.path||meeting?.path;
  const route=Array.isArray(path?.edges)?path.edges.join(' → '):
   Array.isArray(path?.edgeIds)?path.edgeIds.join(' → '):
   Array.isArray(meeting?.edges)?meeting.edges.join(' → '):null;
  const missing=Array.isArray(project.missing)?project.missing:[];
  const statusKey=({running:'running',commissioning:'commissioning',complete:'complete',cancelled:'cancelled',blocked:'blockedStatus'})[project.status]||'blockedStatus';
  const passedTest=project.test?.status==='scenario-verified'||project.tested===true||project.testStatus==='scenario-verified';
  const conditionKey=project.ready===true?'ready':project.status==='running'?'setupInProgress':project.status==='cancelled'?'cancelledCondition':missing.includes('current-room-transport-path-required')?'pathRequired':missing.some(item=>String(typeof item==='string'?item:item?.code||'').startsWith('room-recording-dependency-required'))?'recordingRequired':missing.some(item=>String(typeof item==='string'?item:item?.code||'').startsWith('room-caption-dependency-required'))?'captionsRequired':passedTest?'waitingMeeting':project.testAvailable===true?'waitingTest':project.status==='commissioning'?'waitingMeeting':'blocked';
  return `<section class="provider-room-integration" data-project-id="${esc(project.projectId)}"${project.customerId?` data-customer-id="${esc(project.customerId)}"`:''}><h3>${esc(text('name'))}</h3><p>${esc(text('description'))}</p><dl><dt>${esc(text('status'))}</dt><dd>${esc(text(statusKey))}</dd><dt>${esc(text('missing'))}</dt><dd>${esc(text(conditionKey))}</dd></dl>${project.testAvailable===true?`<button type="button" class="primary" data-provider-action="test-service-integration" data-id="${esc(project.projectId)}">${esc(text('test'))}</button>`:''}${missing.length?`<details><summary>${esc(text('technical'))}</summary><ul>${missing.map(item=>`<li>${esc(typeof item==='string'?item:item?.message||item?.code||'')}</li>`).join('')}</ul></details>`:''}${evidence?`<section class="provider-room-delivery-evidence"><h4>${esc(text('evidence'))}</h4><dl>${minutes!==null?`<dt>${esc(text('completedMinutes'))}</dt><dd>${esc(minutes)}</dd>`:''}${route?`<dt>${esc(text('path'))}</dt><dd>${esc(route)}</dd>`:''}</dl><details><summary>${esc(text('technical'))}</summary><pre>${esc(JSON.stringify(evidence,null,2))}</pre></details></section>`:''}</section>`;
 }
 g.SOCProviderRoomIntegrationUI={render,keys:KEYS,labelFallbacks:Object.freeze(Object.fromEntries(Object.entries(KEYS).map(([key,label])=>[label,FALLBACK[key]])))};
})(globalThis);
