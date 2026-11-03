const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const SEC=require('../src/game/38-admission-security');

const config={
 network:{enabled:true,capacityPps:100,mitigationPps:1000,activationMode:'always'},
 sip:{enabled:true,attemptsPerSecond:10,allowedMethods:['INVITE'],maxMessageBytes:2048,requireAuthenticatedPeer:true},
 destination:{enabled:true,allowedPrefixes:['+612'],perCallMaxCents:20,windowSpendLimitCents:100,windowMinutes:60}
};
function root(){const s={clock:0,interactions:[],ledger:[]};s.admissionSecurity=SEC.create(s);return s;}
function configure(s,which=['network','sip','destination']){for(const control of which)SEC.command(s,{action:'configure',control,config:config[control]});return s;}
function tick(s){s.clock++;SEC.advance(s);return s;}
function ready(){const s=configure(root());tick(s);SEC.command(s,{action:'peer',id:'synthetic-carrier',available:true,authenticated:true,methods:['INVITE']});return s;}
function call(id='interaction-1',to='+61255500001',phase='arrival'){const i={id,channel:'voice',from:'alex',to,phase,outcome:null,obligations:[],trace:[]};return i;}
const ctx=(overrides={})=>({peerId:'synthetic-carrier',method:'INVITE',messageBytes:128,messageValid:true,destination:'+61255500001',...overrides});
function admit(s,i,context=ctx()){const result=SEC.admit(s,i,context);if(result.allowed)i.trace.push({at:s.clock,stage:'security',code:'SECURITY_CALL_ADMITTED',synthetic:true});return result;}
function accrueAndSettle(s,i){
 i.phase='handling';
 const usage=SEC.admitUsage(s,i.id);assert.equal(usage.allowed,true);
 s.ledger.push({id:`minute-${s.clock}`,minute:s.clock,usage:1,cost:2,voiceInteractions:[i.id]});
 i.phase='resolved';i.outcome='RESOLVED';
 return SEC.settle(s,i.id);
}

test('AC-SOC-169 source rows, original reward and unit distinctions remain explicit',()=>{
 const content=JSON.parse(fs.readFileSync(require.resolve('../content/admission-security.json'),'utf8'));
 assert.equal(content.sourceGoal.id,'progress.goal.scrub');assert.equal(content.sourceGoal.sourceReward,20000);assert.match(content.sourceGoal.sourceRewardUnit,/not mapped to AUD/);
 assert.deepEqual(content.sourceIds,SEC.sourceIds);assert.deepEqual(content.runtime,{PACK:SEC.PACK,VERSION:SEC.VERSION,controls:SEC.controls,methods:SEC.methods,sourceIds:SEC.sourceIds,defaults:SEC.defaults});
 assert.deepEqual(SEC.sourceIds,content.relatedSourceRows.map(x=>x.id).concat('progress.goal.scrub').sort((a,b)=>SEC.sourceIds.indexOf(a)-SEC.sourceIds.indexOf(b)));
 assert.ok(SEC.sourceIds.includes('asset:SCRUB_TIERS:0'));assert.ok(content.controls.network.unit.includes('PPS'));assert.ok(content.controls.destination.unit.includes('AUD cents'));
 assert.equal(SEC.evaluate(ready()).sourceGoalStatus,'core-shared-dispatch-integrated-progression-pending');
});

test('AC-SOC-170 each control stages desired, provisioning, effective and observed state separately',()=>{
 const s=configure(root());for(const key of SEC.controls){const n=s.admissionSecurity.controls[key];assert.equal(n.provisioning.status,'pending');assert.equal(n.effective,null);}
 const before=JSON.stringify(s.admissionSecurity.controls.network);assert.throws(()=>SEC.command(s,{action:'configure',control:'network',config:{mitigationPps:10}}),/INVALID_NETWORK_SECURITY_CONFIG/);assert.equal(JSON.stringify(s.admissionSecurity.controls.network),before);
 tick(s);for(const key of SEC.controls){const n=s.admissionSecurity.controls[key];assert.equal(n.provisioning.status,'ready');assert.deepEqual(n.effective,config[key]);}assert.equal(s.admissionSecurity.controls.network.observed.active,true);
 const unavailable=configure(root(),['sip']);SEC.command(unavailable,{action:'observe',control:'sip',observed:{available:false}});tick(unavailable);assert.equal(unavailable.admissionSecurity.controls.sip.provisioning.status,'failed');assert.equal(unavailable.admissionSecurity.controls.sip.effective,null);
});

test('AC-SOC-171 packet batches use PPS by explicit second and reads never consume or reset the bucket',()=>{
 const s=ready(),filtered=SEC.command(s,{action:'inject-packets',peer:'synthetic-flood-source',packets:500,secondOffset:0});
 assert.equal(filtered.code,'NETWORK_FLOOD_FILTERED');assert.equal(filtered.detail.filteredPackets,400);assert.equal(filtered.detail.protectedPathAvailable,true);
 const before=JSON.stringify(s);SEC.inspect(s);assert.equal(JSON.stringify(s),before);
 const overflow=SEC.command(s,{action:'inject-packets',peer:'synthetic-flood-source',packets:700,secondOffset:0});assert.equal(overflow.detail.bucketPps,1200);assert.equal(overflow.code,'NETWORK_OVER_CAPACITY');assert.equal(s.admissionSecurity.controls.network.observed.protectedPathAvailable,false);
 tick(s);assert.deepEqual(s.admissionSecurity.packetBuckets,{});assert.equal(s.admissionSecurity.controls.network.observed.protectedPathAvailable,true);
 assert.equal(SEC.evaluate(s).controls.network.filteredAttack,true);assert.equal(SEC.evaluate(s).allowedVoiceResolved,false);
 const ondemand=configure(root());SEC.command(ondemand,{action:'configure',control:'network',config:{...config.network,activationMode:'on-demand'}});tick(ondemand);SEC.command(ondemand,{action:'peer',id:'synthetic-carrier',available:true,authenticated:true,methods:['INVITE']});assert.equal(ondemand.admissionSecurity.controls.network.observed.active,false);assert.equal(SEC.preflight(ondemand,call(),ctx()).allowed,true,'normal traffic survives on-demand mode while no flood is present');
 assert.equal(SEC.command(ondemand,{action:'inject-packets',peer:'synthetic-flood-source',packets:500,secondOffset:0}).code,'NETWORK_UNPROTECTED_FLOOD');assert.ok(SEC.preflight(ondemand,call(),ctx()).reasons.some(x=>x.code==='NETWORK_PROTECTED_PATH_UNAVAILABLE'));
});

test('AC-SOC-172 SIP authentication, methods, validity and attempts per second are independent of PPS',()=>{
 const s=ready();SEC.command(s,{action:'peer',id:'untrusted-peer',available:true,authenticated:false,methods:['INVITE']});
 const signal=(peer,attempts,method='INVITE',messageBytes=128,valid=true,secondOffset=0)=>SEC.command(s,{action:'inject-signalling',peer,attempts,method,messageBytes,valid,secondOffset});
 assert.equal(signal('untrusted-peer',1).code,'SIP_AUTH_REQUIRED');assert.equal(signal('synthetic-carrier',1,'REGISTER').code,'SIP_METHOD_BLOCKED');assert.equal(signal('synthetic-carrier',1,'INVITE',3000).code,'SIP_MESSAGE_INVALID');assert.equal(signal('synthetic-carrier',1,'INVITE',128,false).code,'SIP_MESSAGE_INVALID');
 assert.equal(signal('synthetic-carrier',10).code,'SIP_RATE_EXCEEDED');assert.equal(signal('synthetic-carrier',1,'INVITE',128,true,1).code,'SIP_ADMITTED');
 tick(s);assert.equal(signal('synthetic-carrier',1).code,'SIP_ADMITTED');assert.ok(SEC.inspect(s).events.every(e=>e.synthetic&&e.trace[0].code===e.code));
});

test('AC-SOC-173 outbound preflight checks all controls and destination prefixes without mutating state',()=>{
 const s=ready(),i=call(),before=JSON.stringify(s);assert.equal(SEC.preflight(s,i,ctx()).allowed,true);assert.equal(JSON.stringify(s),before);
 assert.ok(SEC.preflight(s,call('interaction-2','+441234567890'),ctx({destination:'+441234567890'})).reasons.some(x=>x.code==='DESTINATION_NOT_ALLOWED'));
 SEC.command(s,{action:'observe',control:'network',observed:{active:false,available:true}});assert.ok(SEC.preflight(s,i,ctx()).reasons.some(x=>x.code==='NETWORK_SCRUBBER_INACTIVE'));
 SEC.command(s,{action:'observe',control:'network',observed:{active:true,available:true}});SEC.command(s,{action:'observe',control:'sip',observed:{available:false}});assert.ok(SEC.preflight(s,i,ctx()).reasons.some(x=>x.code==='SIP_CONTROL_NOT_READY'));
});

test('AC-SOC-174 per-minute spend is reserved before core billing and settles only against attributable minute rows',()=>{
 const s=ready(),i=call();s.interactions.push(i);assert.equal(admit(s,i,ctx()).allowed,true);i.phase='handling';
 assert.equal(SEC.admitUsage(s,i.id).allowed,true);assert.equal(SEC.admitUsage(s,i.id).allowed,false,'a call cannot accrue twice in one minute');
 s.ledger.push({id:'minute-1',minute:1,usage:1,cost:2,voiceInteractions:[i.id]});
 for(let minute=2;minute<=10;minute++){tick(s);assert.equal(SEC.admitUsage(s,i.id).allowed,true);s.ledger.push({id:`minute-${minute}`,minute,usage:1,cost:2,voiceInteractions:[i.id]});}
 tick(s);assert.deepEqual(SEC.admitUsage(s,i.id),{allowed:false,reason:'DESTINATION_CALL_LIMIT'});
 i.phase='resolved';i.outcome='RESOLVED';const result=SEC.settle(s,i.id);assert.equal(result.record.cents,20);assert.equal(result.record.coreRows[0].id,'minute-1');assert.equal(SEC.settle(s,i.id).duplicate,true);assert.equal(s.admissionSecurity.spend.length,10);
 const forged=structuredClone(s);forged.ledger[0].voiceInteractions=[];assert.throws(()=>SEC.validate(forged),/INVALID_SECURITY_USAGE_LEDGER_MISMATCH/);
 const failed=call('interaction-failed');s.interactions.push(failed);assert.equal(admit(s,failed,ctx()).allowed,true);failed.phase='failed';assert.equal(SEC.release(s,failed.id,'ROUTE_FAILURE'),true);
 const capped=configure(root());SEC.command(capped,{action:'configure',control:'destination',config:{...config.destination,windowSpendLimitCents:2,perCallMaxCents:2}});tick(capped);SEC.command(capped,{action:'peer',id:'synthetic-carrier',available:true,authenticated:true,methods:['INVITE']});const first=call('capped-one');capped.interactions.push(first);assert.equal(admit(capped,first,ctx()).allowed,true);const second=call('capped-two');capped.interactions.push(second);assert.ok(SEC.admit(capped,second,ctx()).reasons.some(x=>x.code==='DESTINATION_WINDOW_LIMIT'));
});

test('AC-SOC-175 validators reject invalid linked usage, restore exact saves and serialize worker code',()=>{
 const s=ready(),i=call();s.interactions.push(i);admit(s,i,ctx());accrueAndSettle(s,i);assert.equal(SEC.validate(structuredClone(s)),true);
 const bad=structuredClone(s);bad.admissionSecurity.settlements[0].cents=999;assert.throws(()=>SEC.validate(bad),/INVALID_SECURITY_SETTLEMENT_SAVE/);
 const missingCall=structuredClone(s);missingCall.interactions=[];assert.throws(()=>SEC.validate(missingCall),/INVALID_SECURITY_SETTLEMENT_SAVE/);assert.equal(SEC.evaluate(missingCall).allowedVoiceResolved,false);
 const pruned=structuredClone(s);pruned.interactions=Array.from({length:200},(_,n)=>call(`interaction-${n+2}`));pruned.nextId=202;assert.equal(SEC.validate(pruned),true,'a settlement older than a demonstrably full, newer core ring remains valid');
 const lostTrace=structuredClone(s);const admissionId=lostTrace.admissionSecurity.admissions[0].eventId;lostTrace.admissionSecurity.events=lostTrace.admissionSecurity.events.filter(e=>e.id!==admissionId);assert.throws(()=>SEC.validate(lostTrace),/INVALID_SECURITY_ADMISSION_PROOF/);
 const eventPruned=structuredClone(s);for(let n=0;n<1000;n++)SEC.command(eventPruned,{action:'inject-packets',peer:'synthetic-flood-source',packets:1,secondOffset:n%60});assert.equal(eventPruned.admissionSecurity.events.length,1000);assert.ok(!eventPruned.admissionSecurity.events.some(e=>e.id===admissionId));assert.equal(SEC.validate(eventPruned),true,'a full monotonically newer event ring retains the immutable admission receipt');
 const missingRow=structuredClone(s);missingRow.ledger=[];assert.throws(()=>SEC.validate(missingRow),/INVALID_SECURITY_USAGE_LEDGER_MISSING/);
 const bucket=ready();SEC.command(bucket,{action:'inject-signalling',peer:'unknown-peer',attempts:1,method:'INVITE',messageBytes:128,valid:true,secondOffset:3});assert.equal(SEC.validate(bucket),true);
 const vmContext={};vm.createContext(vmContext);vm.runInContext(SEC.source()+';globalThis.SEC=SOC_ADMISSION_SECURITY;',vmContext);assert.equal(vmContext.SEC.PACK,SEC.PACK);assert.deepEqual(JSON.parse(JSON.stringify(vmContext.SEC.sourceIds)),SEC.sourceIds);assert.equal(JSON.stringify(SEC.inspect(s)),JSON.stringify(vmContext.SEC.inspect(structuredClone(s))));
});

test('AC-SOC-176 synthetic attacks cannot stand in for an admitted, resolved and reconciled voice call',()=>{
 const s=ready();SEC.command(s,{action:'inject-packets',peer:'synthetic-flood-source',packets:500,secondOffset:0});
 SEC.command(s,{action:'inject-signalling',peer:'synthetic-carrier',attempts:1,method:'INVITE',messageBytes:128,valid:true,secondOffset:1});SEC.command(s,{action:'inject-signalling',peer:'synthetic-carrier',attempts:1,method:'REGISTER',messageBytes:128,valid:true,secondOffset:2});
 let result=SEC.evaluate(s);assert.equal(result.allowedVoiceResolved,false);assert.equal(result.passed,false);
 const blocked=call('interaction-blocked','+441234567890');s.interactions.push(blocked);assert.equal(admit(s,blocked,ctx({destination:blocked.to})).allowed,false);
 const i=call();s.interactions.push(i);assert.equal(admit(s,i,ctx()).allowed,true);i.phase='handling';assert.equal(SEC.admitUsage(s,i.id).allowed,true);s.ledger.push({id:'minute-1',minute:1,usage:1,cost:2,voiceInteractions:[i.id]});i.phase='resolved';i.outcome='RESOLVED';SEC.settle(s,i.id);
 result=SEC.evaluate(s);assert.equal(result.controls.network.filteredAttack,true);assert.equal(result.controls.sip.allowedSample,true);assert.equal(result.controls.sip.blockedAbuse,true);assert.equal(result.controls.destination.blockedAbuse,true);assert.equal(result.allowedVoiceResolved,true);assert.equal(result.passed,true);assert.equal(result.sourceGoalStatus,'core-shared-dispatch-integrated-progression-pending');
});
