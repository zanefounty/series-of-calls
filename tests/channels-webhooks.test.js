const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const C=require('../src/game/47-channels');

const context={tenant:'orchard-repairs',person:'alex',canonicalPerson:'alex',channel:'message',account:'letterbox',purpose:'transactional',caseId:'case-1',template:'transaction-update'};
function fixture(config={}){
 const s=C.create({clock:0});C.advance(s,1);
 C.command(s,{action:'observe',channel:'letterbox',authenticated:true,providerAvailable:true,fault:null});
 C.command(s,{action:'permission',tenant:context.tenant,person:context.person,channel:'letterbox',purpose:'transactional',granted:true,expiresAt:null});
 C.command(s,{action:'webhook-configure',config:{...s.webhooks.desired,enabled:true,...config}});C.advance(s,2);
 return s;
}
function deliver(s,id){
 const interaction={id,caseId:context.caseId};
 const job={id:`job-${id}`,interaction:id,status:'accepted',acceptedAt:s.clock};
 C.recordAcceptance(s,interaction,context,job);
 const delivered={...job,status:'delivered',receiptAt:s.clock};
 return C.recordDelivery(s,interaction,context,delivered);
}

test('AC-SOC-422 webhook policy provisions separately from observed state and stays effective during amendment',()=>{
 const s=C.create({clock:0}),before=C.fingerprint(s);
 assert.equal(s.webhooks.effective.enabled,false);
 C.command(s,{action:'webhook-configure',config:{...s.webhooks.desired,enabled:true}});
 assert.equal(s.webhooks.provisioning.status,'pending');assert.equal(s.webhooks.effective.enabled,false);assert.equal(s.webhooks.observed.authenticated,true);assert.notEqual(C.fingerprint(s),before);
 C.command(s,{action:'webhook-observe',authenticated:false,applicationAvailable:true,supplierAvailable:false});
 assert.equal(s.webhooks.provisioning.status,'pending');assert.equal(s.webhooks.observed.supplierAvailable,false);C.advance(s,1);
 assert.equal(s.webhooks.provisioning.status,'ready');assert.equal(s.webhooks.effective.enabled,true);assert.equal(s.webhooks.observed.authenticated,false);
 const live=fixture();C.command(live,{action:'webhook-configure',config:{...live.webhooks.desired,enabled:false}});const receipt=deliver(live,'amendment-message');assert.ok(receipt);assert.equal(live.webhooks.effective.enabled,true);assert.equal(live.webhooks.provisioning.status,'pending');C.advance(live,3);assert.equal(live.webhooks.effective.enabled,false);assert.equal(live.webhooks.deliveries[0].status,'delivered');
});

test('AC-SOC-417 synthetic callback authenticates and delivers from the accepted channel conversation with case context',()=>{
 const s=fixture(),receipt=deliver(s,'message-one');
 assert.deepEqual(s.webhooks.deliveries[0],{id:'webhook-4',idempotencyKey:`channel-delivery-${receipt.id}`,receipt:receipt.id,interaction:'message-one',tenant:context.tenant,person:context.person,channel:'letterbox',caseId:context.caseId,status:'pending',attempts:[],attemptCount:0,nextAttemptAt:3,reason:null,createdAt:2,deliveredAt:null});
 C.advance(s,3);
 assert.equal(s.webhooks.deliveries[0].status,'delivered');
 assert.deepEqual(s.webhooks.deliveries[0].attempts,[{number:1,at:3,outcome:'DELIVERED',retryAt:null}]);
});

test('AC-SOC-418 authentication rejection is an application failure, not supplier downtime, and does not retry',()=>{
 const s=fixture();C.command(s,{action:'webhook-observe',authenticated:false,applicationAvailable:true,supplierAvailable:true});deliver(s,'auth-failure');C.advance(s,3);
 const d=s.webhooks.deliveries[0];assert.equal(d.status,'failed');assert.equal(d.reason,'APP_AUTH_REJECTED');assert.equal(d.attemptCount,1);assert.equal(d.attempts[0].outcome,'APP_AUTH_REJECTED');
});

test('AC-SOC-419 transient application and supplier failures back off and recover; duplicate channel receipts keep one idempotency key',()=>{
 const s=fixture({retries:2,backoff:2});C.command(s,{action:'webhook-observe',authenticated:true,applicationAvailable:false,supplierAvailable:true});const receipt=deliver(s,'retry-message');
 assert.equal(C.recordDelivery(s,{id:'retry-message',caseId:context.caseId},context,{id:'job-retry-message',interaction:'retry-message',status:'delivered',acceptedAt:2,receiptAt:2}).id,receipt.id);
 assert.equal(s.webhooks.deliveries.length,1);C.advance(s,3);let d=s.webhooks.deliveries[0];assert.equal(d.attempts[0].outcome,'APP_UNAVAILABLE');assert.equal(d.nextAttemptAt,5);
 C.command(s,{action:'webhook-observe',authenticated:true,applicationAvailable:true,supplierAvailable:false});C.advance(s,5);d=s.webhooks.deliveries[0];assert.equal(d.attempts[1].outcome,'SUPPLIER_UNAVAILABLE');assert.equal(d.nextAttemptAt,9);
 C.command(s,{action:'webhook-observe',authenticated:true,applicationAvailable:true,supplierAvailable:true});C.advance(s,9);assert.equal(d.status,'delivered');assert.equal(d.attempts[2].outcome,'DELIVERED');
});

test('AC-SOC-420 rate limits retry with bounded exponential delay and exhausted jobs fail explicitly before later recovery',()=>{
 const s=fixture({rateLimit:1,retries:1,backoff:1});deliver(s,'rate-one');deliver(s,'rate-two');C.advance(s,3);
 assert.equal(s.webhooks.deliveries[0].status,'delivered');assert.equal(s.webhooks.deliveries[1].reason,'RATE_LIMITED');assert.equal(s.webhooks.deliveries[1].nextAttemptAt,4);
 C.advance(s,4);assert.equal(s.webhooks.deliveries[1].status,'delivered');
 const t=fixture({retries:1});C.command(t,{action:'webhook-observe',authenticated:true,applicationAvailable:false,supplierAvailable:true});deliver(t,'exhausted');C.advance(t,3);C.advance(t,4);assert.equal(t.webhooks.deliveries[0].status,'failed');assert.equal(t.webhooks.deliveries[0].attemptCount,2);
 C.command(t,{action:'webhook-observe',authenticated:true,applicationAvailable:true,supplierAvailable:true});C.advance(t,5);assert.equal(t.webhooks.deliveries[0].status,'failed');
});

test('AC-SOC-421 webhook state validates across JSON save replay and worker source with transactional command rejection',()=>{
 const s=fixture(),receipt=deliver(s,'saved-message'),configFingerprint=C.fingerprint(s);C.advance(s,3);assert.equal(C.fingerprint(s),configFingerprint);const serialized=JSON.stringify(s),restored=JSON.parse(serialized);
 assert.equal(C.validate(restored),true);assert.deepEqual(C.inspect(restored),C.inspect(s));
 const before=JSON.stringify(s);assert.throws(()=>C.command(s,{action:'webhook-configure',config:{...s.webhooks.desired,rateLimit:0}}),/INVALID_WEBHOOK_CONFIG/);assert.equal(JSON.stringify(s),before);
 const sandbox={};vm.createContext(sandbox);vm.runInContext(C.source()+';globalThis.workerChannels=SOC_CHANNELS;',sandbox);
 assert.equal(sandbox.workerChannels.validate(restored),true);assert.deepEqual(JSON.parse(JSON.stringify(sandbox.workerChannels.inspect(restored))),C.inspect(s));
 const workerReplay=structuredClone(restored),localReplay=structuredClone(restored);sandbox.workerChannels.advance(workerReplay,4);C.advance(localReplay,4);assert.deepEqual(JSON.parse(JSON.stringify(sandbox.workerChannels.inspect(workerReplay))),C.inspect(localReplay));
 assert.equal(receipt.id,s.webhooks.deliveries[0].receipt);
 const legacy=JSON.parse(JSON.stringify(s));delete legacy.webhooks;assert.equal(C.validate(legacy),true);const legacyFingerprint=C.fingerprint(legacy);C.advance(legacy,4);assert.ok(legacy.webhooks);assert.equal(C.fingerprint(legacy),legacyFingerprint);
});

test('AC-SOC-423 webhook validation rejects receipt and acceptance lineage tampering',()=>{
 const s=fixture();deliver(s,'lineage-message');C.advance(s,3);
 for(const mutate of [d=>{d.tenant='other-tenant';},d=>{d.person='bea';},d=>{d.channel='chatterleaf';},d=>{d.caseId='other-case';},d=>{d.idempotencyKey='channel-delivery-receipt-other';}]){const bad=structuredClone(s);mutate(bad.webhooks.deliveries[0]);assert.throws(()=>C.validate(bad),/INVALID_WEBHOOK_SAVE/);}
});

test('AC-SOC-424 webhook validation rejects nonmonotonic attempts and terminal status mismatches',()=>{
 const s=fixture();deliver(s,'attempt-message');C.advance(s,3);
 const future=structuredClone(s);future.webhooks.deliveries[0].attempts[0].at=4;assert.throws(()=>C.validate(future),/INVALID_WEBHOOK_ATTEMPT/);
 const mismatch=structuredClone(s);mismatch.webhooks.deliveries[0].status='failed';mismatch.webhooks.deliveries[0].reason='APP_UNAVAILABLE';mismatch.webhooks.deliveries[0].deliveredAt=null;assert.throws(()=>C.validate(mismatch),/INVALID_WEBHOOK_SAVE/);
});
