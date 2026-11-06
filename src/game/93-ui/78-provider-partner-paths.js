/* Contextual controls for paid, tested partner connections. Rendering is pure. */
(function(g){
 'use strict';
 const N_=g.N_||(x=>x),esc=g.SOCProviderHud.esc;
 const keys={name:N_('provider.partner_path.name'),retest:N_('provider.partner_path.retest'),description:N_('provider.partner_path.description'),retestDescription:N_('provider.partner_path.retest_description'),running:N_('provider.partner_path.running'),test:N_('provider.partner_path.test'),waiting:N_('provider.partner_path.waiting'),failed:N_('provider.partner_path.failed'),delivered:N_('provider.partner_path.delivered'),cancelled:N_('provider.partner_path.cancelled'),technical:N_('provider.partner_path.technical'),terms:N_('provider.partner_path.terms')};
 const fallback={name:'Grove and Disco calling connection',retest:'Retest Grove and Disco calling',description:'Connect the two funded calling products. Test their directional compatibility, then deliver a real customer call.',retestDescription:'Fund a fresh compatibility test after a product change or recorded failure, then deliver a real call.',running:'Paid setup is in progress. Resume the simulation to finish installation.',test:'Test this calling connection',waiting:'The test passed. Resume the simulation to deliver a customer call through this connection.',failed:'This test failed. Repair the affected service and purchase a retest.',delivered:'A real customer call used the tested connection and completed.',cancelled:'This commissioning project was cancelled. Existing supplier commitments remain payable.',technical:'Connection evidence',terms:'Both calling products must already be paid and ready. This quote funds connection setup and recurring support; compatibility testing and a completed customer call are still required.'};
 function text(key){const value=typeof g.tr==='function'?g.tr(keys[key]):null;return value&&value!==keys[key]?value:fallback[key];}
 function render(model,customerId,projectId){
  return (model?.projects||[]).filter(p=>p.partnerPathPlan&&p.customerId===customerId&&(!projectId||p.id===projectId)).map(p=>{
   const receipt=p.operationReceipt?.partnerPath,canTest=p.status==='commissioning'&&receipt&&!receipt.test;
   const state=p.status==='complete'?'delivered':p.status==='cancelled'?'cancelled':p.status==='running'?'running':receipt?.test?.test?.result?.status==='blocked'?'failed':receipt?.test?'waiting':null;
   return `<section class="provider-partner-path" data-project-id="${esc(p.id)}"><h3>${esc(text(p.operationId.endsWith('-retest')?'retest':'name'))}</h3>${state?`<p>${esc(text(state))}</p>`:''}${canTest?`<button type="button" class="primary" data-provider-action="test-service-integration" data-id="${esc(p.id)}">${esc(text('test'))}</button>`:''}${receipt?.test?`<details data-provider-detail="partner-path:${esc(p.id)}"><summary>${esc(text('technical'))}</summary><pre>${esc(JSON.stringify(p.operationReceipt.evidence||receipt.test,null,2))}</pre></details>`:''}</section>`;
  }).join('');
 }
 g.SOCProviderPartnerPathsUI={render,text,labelFallbacks:Object.freeze(Object.fromEntries(Object.entries(keys).map(([key,label])=>[label,fallback[key]])))};
})(globalThis);
