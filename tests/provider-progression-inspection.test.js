"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications'),RECEIPTS=require('../src/game/23-provider-progression-receipts'),SUPPORT=require('../src/game/23-provider-support-work');
const hooks={customerRoot:(s,id)=>s.portfolio.customers.find(c=>c.id===id)?.root,observeResource:(s,id)=>SOC.observe(s,id),supportWorkOrigin:SUPPORT.origin,providerQuote:(s,q)=>SOC.provider.quote(s,q)};
let fixture;
function earned(){
 if(fixture)return structuredClone(fixture);
 let s=SOC.create({experience:'campaign'});
 const buy=q=>{const quote=SOC.provider.quote(s,q);assert.deepEqual(quote.blockers,[]);s=SOC.dispatch(s,{type:'provider',command:{...q,quoteRevision:quote.atRevision}});};
 for(const stage of ['base','carrier','partner'])buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
 while(s.clock<120){const incident=s.providerCampaign.incidents.find(i=>i.status==='active');if(incident){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});buy({action:'operation',operationId:'repair',customerId:'starter-customer'});}s=SOC.dispatch(s,{type:'advance',minutes:1});}
 for(const sourceId of ['progress.goal.bb','progress.progression-level.1'])s=SOC.dispatch(s,{type:'provider',command:{action:'claim-progression',sourceId,quoteRevision:s.revision}});
 fixture=structuredClone(s);return s;
}
function freeze(o){if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;}
test('AC-SOC-795 progression inspection returns independently validated paid proposals without mutating an earned campaign',()=>{
 const s=freeze(earned()),before=JSON.stringify(s),view=RECEIPTS.inspect(s,hooks);
 assert.equal(view.receipts.length,2);
 for(const proposal of view.unlockProposals)assert.deepEqual(proposal,RECEIPTS.unlockProposal(s,proposal.sourceId,hooks));
 assert.equal(view.unlockProposal.status,'available');
 assert.equal(view.unlockProposal.quote.setupCents,8000);
 assert.equal(JSON.stringify(s),before);
 assert.deepEqual(SOC.restore(before),s);
});
test('AC-SOC-796 inspection and standalone proposal revalidate changed receipt authority before offering purchases',()=>{
 const s=earned();RECEIPTS.inspect(s,hooks);
 s.providerCampaign.progressionReceipts.receipts.at(-1).integrity='00000000';
 let quotes=0;const guarded={...hooks,providerQuote:()=>{quotes++;throw new Error('must not quote forged authority');}};
 assert.throws(()=>RECEIPTS.inspect(s,guarded),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 assert.throws(()=>RECEIPTS.unlockProposal(s,'progress.progression-level.1',guarded),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 assert.equal(quotes,0);
 assert.throws(()=>SOC.provider.inspect(s),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
 assert.throws(()=>SOC.restore(JSON.stringify(s)),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);
});
