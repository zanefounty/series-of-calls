/* Read-only archive occupancy and pending processing on the selected map object. */
(function(g){
 'use strict';
 const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const N_=typeof g.N_==='function'?g.N_:value=>value;
 function render(storage){
  if(!storage)return '';
  const text=typeof g.tr==='function'?g.tr(N_('provider.storage_usage'),{used:storage.used,limit:storage.limit,held:storage.held,pending:storage.pending,queued:storage.queued,outputs:storage.remainingOutputs}):`Stored ${storage.used} / ${storage.limit} records (${storage.held} held). ${storage.pending} awaiting admission; ${storage.queued} processing jobs. Remaining work may produce ${storage.remainingOutputs} more records.`;
  return `<section class="provider-storage" data-provider-storage><p>${esc(text)}</p></section>`;
 }
 g.SOCProviderStorageUI={render};
 if(typeof module!=='undefined'&&module.exports)module.exports=g.SOCProviderStorageUI;
})(typeof globalThis!=='undefined'?globalThis:window);
