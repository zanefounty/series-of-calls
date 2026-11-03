/* Guided controls and evidence display for minute-sampled service observation. */
const SOC_OBSERVATION_LABELS={
 title:N_('observation_ui.title'),scope:N_('observation_ui.scope'),start:N_('observation_ui.start'),open:N_('observation_ui.open'),
 inject:N_('observation_ui.inject'),recover:N_('observation_ui.recover'),guide:N_('observation_ui.guide'),status:N_('observation_ui.status'),
 thresholds:N_('observation_ui.thresholds'),actual:N_('observation_ui.actual'),checks:N_('observation_ui.checks'),closed:N_('observation_ui.closed'),
 proofs:N_('observation_ui.proofs'),none:N_('observation_ui.none'),openWindow:N_('observation_ui.open_window'),
 sourceBoundary:N_('observation_ui.source_boundary'),notStarted:N_('observation_ui.not_started'),observing:N_('observation_ui.observing'),passed:N_('observation_ui.passed'),
 failed:N_('observation_ui.failed'),earned:N_('observation_ui.earned'),pending:N_('observation_ui.pending'),incomplete:N_('observation_ui.incomplete'),yes:N_('observation_ui.yes'),no:N_('observation_ui.no'),
 rd:N_('observation_ui.rd'),tb:N_('observation_ui.tb'),t10:N_('observation_ui.t10'),minutes:N_('observation_ui.minutes'),
 journeys:N_('observation_ui.journeys'),completionPercent:N_('observation_ui.completion_percent'),activeBuckets:N_('observation_ui.active_buckets'),
 people:N_('observation_ui.people'),concurrentSamples:N_('observation_ui.concurrent_samples'),concurrent:N_('observation_ui.concurrent'),
 voice:N_('observation_ui.voice'),digital:N_('observation_ui.digital'),meetings:N_('observation_ui.meetings'),caseBoundJourneys:N_('observation_ui.case_bound_journeys'),
 domains:N_('observation_ui.domains'),requiredFaultSamples:N_('observation_ui.fault_samples'),maxLatencyMs:N_('observation_ui.max_latency'),samples:N_('observation_ui.samples'),attempts:N_('observation_ui.attempts'),
 successful:N_('observation_ui.successful'),counts:N_('observation_ui.counts'),errors:N_('observation_ui.errors'),completedAt:N_('observation_ui.completed_at'),
 duration:N_('observation_ui.check.duration'),consecutive:N_('observation_ui.check.consecutive'),configuration:N_('observation_ui.check.configuration'),resources:N_('observation_ui.check.resources'),
 completion:N_('observation_ui.check.completion'),buckets:N_('observation_ui.check.buckets'),concurrency:N_('observation_ui.check.concurrency'),channels:N_('observation_ui.check.channels'),rdEvidence:N_('observation_ui.check.rd_evidence'),
 baseline:N_('observation_ui.check.baseline'),during:N_('observation_ui.check.during'),recovered:N_('observation_ui.check.recovered'),sameCase:N_('observation_ui.check.same_case'),sameIdentity:N_('observation_ui.check.same_identity'),
 sameTenant:N_('observation_ui.check.same_tenant'),independentPath:N_('observation_ui.check.independent_path'),faultHeld:N_('observation_ui.check.fault_held'),preAndPost:N_('observation_ui.check.pre_and_post'),qualityBudget:N_('observation_ui.check.quality_budget'),
 sourceRd:N_('observation_ui.source_rd'),sourceTb:N_('observation_ui.source_tb'),sourceT10:N_('observation_ui.source_t10')
};
const socObservationT=key=>tr(SOC_OBSERVATION_LABELS[key]||key);
const SOC_OBSERVATION_GUIDES={
 tb:N_('observation_ui.guide_tb'),
 t10:N_('observation_ui.guide_t10'),
 rd:N_('observation_ui.guide_rd')
};
function socObservationPanel(s,results){
 const disabled=!SCT.locked||SCT.busy,button=(action,label,off=false,extra='')=>`<button type="button" data-observation-action="${esc(action)}" ${extra}${disabled||off?' disabled':''}>${esc(socObservationT(label))}</button>`;
 const data=results?.serviceObservation||SOC.serviceObservation.calculate(s),pack=s?.serviceObservation,active=pack?.active||null;
 const goals=['rd','tb','t10'],thresholds=SOC.serviceObservation.thresholds;
 const thresholdRows=goal=>Object.entries(thresholds[goal]).map(([key,value])=>`<dt>${esc(socObservationT(key))}</dt><dd>${esc(value)}</dd>`).join('');
 const countRows=counts=>Object.entries(counts||{}).map(([key,value])=>`<dt>${esc(socObservationT(key))}</dt><dd>${esc(value)}</dd>`).join('');
 const checkRows=checks=>Object.entries(checks||{}).map(([key,value])=>`<li>${esc(socObservationT(key))}: <strong>${value?socObservationT('yes'):socObservationT('no')}</strong></li>`).join('');
 const goalCards=goals.map(goal=>{const goalReport=data.goals[goal],status=goalReport?.status||'not-started',isActive=active?.goal===goal,window=pack?.windows.find(x=>x.id===active?.id),counts=isActive?data.active?.result?.counts:null;
  const rd=window?.rd,incident=rd?.incident,canInject=goal==='rd'&&!!rd?.baseline&&!incident,canRecover=goal==='rd'&&!!incident&&!incident.recoveredAt&&(rd?.faultSamples||0)>=1;
  const statusKey=status==='not-started'?'notStarted':status;
  return `<article class="soc-observation-goal" data-observation-goal="${goal}"><h3>${socObservationT(goal)}</h3><p>${socObservationT('status')}: <strong>${esc(socObservationT(statusKey))}</strong></p><details><summary>${socObservationT('thresholds')}</summary><dl>${thresholdRows(goal)}</dl></details><details open><summary>${socObservationT('guide')}</summary><p>${tr(SOC_OBSERVATION_GUIDES[goal])}</p></details>${isActive?`<p>${socObservationT('actual')}: ${socObservationT('samples')} ${counts?.samples||0} / ${thresholds[goal].minutes}</p><details><summary>${socObservationT('counts')}</summary><dl>${countRows(counts)}</dl></details><details><summary>${socObservationT('checks')}</summary><ul>${checkRows(data.active?.result?.checks)}</ul></details>${goal==='rd'?`${button('inject','inject',!canInject,`data-goal="${goal}"`)}${button('recover','recover',!canRecover,`data-goal="${goal}"`)}`:''}`:button('open','openWindow',!pack||!!active,`data-goal="${goal}"`)}</article>`;
 }).join('');
 const closed=(pack?.windows||[]).filter(w=>w.status!=='open').map(w=>`<article data-observation-window="${esc(w.id)}"><h4>${socObservationT(w.goal)} · ${socObservationT(w.status)}</h4><p>${socObservationT('completedAt')}: ${esc(w.completedAt)}</p><details><summary>${socObservationT('counts')}</summary><dl>${countRows(w.result?.counts)}</dl></details>${w.result?.errors?.length?`<p>${socObservationT('errors')}: ${esc(w.result.errors.join(', '))}</p>`:''}</article>`).join('');
 const proofs=(data.proofs||[]).map(p=>`<article data-observation-proof="${esc(p.id)}"><h4>${socObservationT(p.goal)} · ${socObservationT('earned')}</h4><p>${socObservationT('completedAt')}: ${esc(p.completedAt)}</p><details><summary>${socObservationT('counts')}</summary><dl>${countRows(p.result?.counts)}</dl></details><details><summary>${socObservationT('checks')}</summary><ul>${checkRows(p.result?.checks)}</ul></details></article>`).join('');
 const controls=`${pack?'':button('start','start')}${goalCards}`;
 return `<section id="soc-observation" class="soc-business"><h2>${socObservationT('title')}</h2><p>${socObservationT('scope')}</p>${!SCT.locked?`<p>${socT('read_only')}</p>`:''}<details><summary>${socObservationT('sourceBoundary')}</summary><p>${socObservationT('sourceRd')}</p><p>${socObservationT('sourceTb')}</p><p>${socObservationT('sourceT10')}</p></details><div class="soc-op-grid">${controls}</div><section><h3>${socObservationT('closed')}</h3>${closed||`<p>${socObservationT('none')}</p>`}</section><section><h3>${socObservationT('proofs')}</h3>${proofs||`<p>${socObservationT('none')}</p>`}</section></section>`;
}
function socBindObservation(){
 const root=document.getElementById('soc-observation');if(!root)return;
 root.querySelectorAll('[data-observation-action]').forEach(button=>button.addEventListener('click',()=>{if(!SCT.locked||SCT.busy||button.disabled)return;const action=button.dataset.observationAction,goal=button.dataset.goal;let command;if(action==='start')command={type:'service-observation',command:{action:'start'}};else if(action==='open')command={type:'service-observation',command:{action:'open-window',goal}};else if(action==='inject')command={type:'service-observation',command:{action:'inject-incident'}};else if(action==='recover')command={type:'service-observation',command:{action:'recover-incident'}};if(command)try{socApply(command);}catch(error){socError(error);}}));
}
