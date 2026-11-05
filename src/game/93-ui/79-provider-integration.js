/* Read-only paid integration overlay; every control enters Provider dispatch. */
(function(g){
 'use strict';
 const N_=g.N_||(x=>x),esc=g.SOCProviderHud.esc;
 const keys={title:N_('provider.integration.title'),test:N_('provider.integration.test'),running:N_('provider.integration.running'),
 'awaiting-edge':N_('provider.integration.awaiting_edge'),'awaiting-test':N_('provider.integration.awaiting_test'),'awaiting-work':N_('provider.integration.awaiting_work'),'awaiting-review':N_('provider.integration.awaiting_review'),ready:N_('provider.integration.ready'),stale:N_('provider.integration.stale'),blocked:N_('provider.integration.blocked'),review:N_('provider.integration.review'),retest:N_('provider.integration.retest'),evidence:N_('provider.integration.evidence')};
 const text=k=>typeof tr==='function'?tr(keys[k]||keys.blocked):keys[k]||keys.blocked;
 function render(model,customerId,projectId){
  if(!model?.projects?.length)return '';
  const project=projectId?model.projects.find(p=>p.projectId===projectId):model.projects.at(-1);if(!project)return '';
  const observation=project.observation||model,status=project.status==='running'?'running':observation.status;
  return `<section class="provider-service-integration" data-project-id="${esc(project.projectId)}"><h3>${esc(text('title'))}</h3><p>${esc(text(status))}</p>${project.testAvailable?`<button class="primary" data-provider-action="test-service-integration" data-id="${esc(project.projectId)}">${esc(text('test'))}</button>`:''}${status==='awaiting-review'?`<button data-provider-action="operation" data-operation="quality" data-id="${esc(customerId)}">${esc(text('review'))}</button>`:''}${status==='stale'||status==='blocked'?`<button data-provider-action="operation" data-operation="uc-cc-retest" data-id="${esc(customerId)}">${esc(text('retest'))}</button>`:''}<details><summary>${esc(text('evidence'))}</summary><pre>${esc(JSON.stringify(observation,null,2))}</pre></details></section>`;
 }
 g.SOCProviderIntegrationUI={render};
})(typeof globalThis!=='undefined'?globalThis:window);
