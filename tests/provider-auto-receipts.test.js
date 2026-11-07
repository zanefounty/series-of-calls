const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');

const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function opening(){let s=SOC.create({experience:'campaign',opening:'win',seed:77}),request={action:'plan',offerId:'starter',planId:'swift'},q=SOC.provider.quote(s,request);return send(s,{...request,quoteRevision:q.atRevision});}

test('new opening issues the first validated no-choice receipt once through campaign policy',()=>{
 let s=opening();assert.equal(s.providerCampaign.autoReceiptPolicy.actions.length,0);
 s=SOC.dispatch(s,{type:'advance',minutes:10});const policy=s.providerCampaign.autoReceiptPolicy;
 assert.equal(policy.actions.length,1);assert.equal(policy.actions[0].sourceId,'progress.goal.bb');
 const receipt=s.providerCampaign.progressionReceipts.receipts[0],event=s.providerCampaign.events.find(x=>x.id===policy.actions[0].eventId);
 assert.equal(receipt.id,policy.actions[0].receiptId);assert.equal(event.policyVersion,1);
 assert.equal(receipt.sourceEvidence.customerId,'starter-customer');
 s=SOC.dispatch(s,{type:'advance',minutes:5});assert.equal(s.providerCampaign.autoReceiptPolicy.actions.length,1);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),JSON.parse(JSON.stringify(s)));
 const forged=structuredClone(s);forged.providerCampaign.autoReceiptPolicy.actions[0].eventId='provider-event-99999';
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_AUTO_RECEIPT_ACTION/);
 const hidden=structuredClone(s);hidden.providerCampaign.autoReceiptPolicy.actions=[];
 assert.throws(()=>SOC.restore(JSON.stringify(hidden)),/INVALID_PROVIDER_AUTO_RECEIPT_ACTION/);
});

test('suspension preserves real eligibility for later validated issuance and old saves remain manual',()=>{
 let s=opening();s=send(s,{action:'configure-auto-receipts',enabled:true,suspended:true,quoteRevision:s.revision});
 s=SOC.dispatch(s,{type:'advance',minutes:12});assert.equal(s.providerCampaign.autoReceiptPolicy.actions.length,0);
 assert.equal(SOC.provider.inspect(s).progression.claims.rows.find(x=>x.sourceId==='progress.goal.bb').status,'ready');
 s=send(s,{action:'configure-auto-receipts',enabled:true,suspended:false,quoteRevision:s.revision});
 s=SOC.dispatch(s,{type:'advance',minutes:3});assert.equal(s.providerCampaign.autoReceiptPolicy.actions.length,1);
 const legacy=SOC.create({experience:'campaign',seed:77});assert.equal(legacy.providerCampaign.autoReceiptPolicy,undefined);
 assert.throws(()=>send(legacy,{action:'configure-auto-receipts',enabled:true,suspended:false,quoteRevision:legacy.revision}),/PROVIDER_AUTO_RECEIPT_POLICY_REQUIRED/);
});

test('receipt issuance changes progression only, not money or delivered work',()=>{
 let automatic=opening(),manual=opening();manual=send(manual,{action:'configure-auto-receipts',enabled:true,suspended:true,quoteRevision:manual.revision});
 automatic=SOC.dispatch(automatic,{type:'advance',minutes:10});manual=SOC.dispatch(manual,{type:'advance',minutes:10});
 assert.equal(automatic.providerCampaign.autoReceiptPolicy.actions.length,1);assert.equal(manual.providerCampaign.autoReceiptPolicy.actions.length,0);
 assert.deepEqual(automatic.business.balance,manual.business.balance);
 assert.deepEqual(automatic.providerCampaign.customers[0].metrics,manual.providerCampaign.customers[0].metrics);
 assert.deepEqual(automatic.providerCampaign.jobs.map(job=>[job.id,job.status]),manual.providerCampaign.jobs.map(job=>[job.id,job.status]));
});

test('worker and restore issue the same receipt at the same observed minute',()=>{
 let s=opening();s=SOC.dispatch(s,{type:'advance',minutes:9});assert.equal(s.providerCampaign.autoReceiptPolicy.actions.length,0);
 const command={type:'advance',minutes:1},expected=SOC.dispatch(SOC.restore(JSON.stringify(s)),command);
 const context={postMessage:value=>{context.response=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);
 context.onmessage({data:{id:'auto-receipt',state:s,command}});
 assert.equal(context.response.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(context.response.state)),expected);
});

test('inherited estate cannot turn its opening work into a player-earned receipt',()=>{
 let s=SOC.create({experience:'campaign',opening:'estate',seed:77});
 s=SOC.dispatch(s,{type:'advance',minutes:10});
 assert.ok(s.providerCampaign.jobs.some(x=>['completed','late'].includes(x.status)));
 assert.equal(s.providerCampaign.progressionReceipts?.receipts.some(x=>x.sourceId==='progress.goal.bb')||false,false);
 assert.equal(s.providerCampaign.autoReceiptPolicy.actions.some(x=>x.sourceId==='progress.goal.bb'),false);
});
