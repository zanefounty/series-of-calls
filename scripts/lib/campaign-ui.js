'use strict';
// Explicit visible-control mappings. Unsupported commands fail rather than falling
// back to page evaluation or direct mutation of the application.
function campaignUiAction(command,clock){
 const c=command.command,form=(selector,fields={})=>({kind:'campaign-form',form:selector,fields}),button=selector=>({kind:'button',selector});
 if(command.type==='campaign'){
  if(c.action==='start')return form('[data-domain-start="campaign"]');
  if(c.action==='select-track')return form('[data-domain-form="campaign-select"]',{track:c.track});
  if(c.action==='open-window')return form('[data-domain-form="campaign-window"]',{kind:c.kind});
  const action={'inject-incident':'inject','recover-incident':'recover',assess:'assess'}[c.action];
  if(action)return form(`[data-domain-form="campaign-${action}"]`);
 }
 if(command.type==='information'){
  if(c.action==='start')return button('[data-info="start"]');
  if(c.action==='configure')return form(`[data-info-config="${c.kind}"]`,c.config);
 }
 if(command.type==='operations'){
  if(c.action==='start')return button('[data-ops="start"]');
  if(c.action==='migration')return form('#soc-migration',{identities:c.identities,target:c.target,delay:c.cutoverAt-clock});
 }
 if(command.type==='business'){
  if(c.action==='start'||c.action==='qualify')return button(`[data-biz="${c.action}"]`);
  if(c.action==='order')return form('#soc-order',{offer:c.offer,quantity:c.quantity,customer:c.customer,sell:c.sell});
  if(c.action==='renew')return button(`[data-biz="renew"][data-id="${c.contract}"]`);
 }
 return null;
}
module.exports={campaignUiAction};
