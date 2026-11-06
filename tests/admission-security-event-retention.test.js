"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const admission=require('../src/game/38-admission-security.js');

function readyRoot({pins=false}={}){
 const root={clock:0,nextId:1,interactions:[],cases:{},ledger:[]};root.admissionSecurity=admission.create(root);
 for(const command of [
  {action:'configure',control:'network',config:{enabled:true,capacityPps:1000,mitigationPps:10000,activationMode:'always'}},
  {action:'configure',control:'sip',config:{enabled:true,attemptsPerSecond:10,allowedMethods:['INVITE'],maxMessageBytes:2048,requireAuthenticatedPeer:true}},
  {action:'configure',control:'destination',config:{enabled:true,allowedPrefixes:['+61'],perCallMaxCents:100,windowSpendLimitCents:120,windowMinutes:60}},
  {action:'peer',id:'synthetic-carrier',authenticated:true,available:true,methods:['INVITE']}
 ])admission.command(root,command);
 root.clock=1;admission.advance(root);
 admission.command(root,{action:'inject-packets',peer:'synthetic-flood-origin',packets:7500,secondOffset:0});
 admission.command(root,{action:'inject-signalling',peer:'synthetic-unknown-origin',attempts:1,messageBytes:128,method:'INVITE',valid:true,secondOffset:0});
 admission.command(root,{action:'inject-packets',peer:'synthetic-flood-origin',packets:7500,secondOffset:1});
 if(pins)root.providerSecurityPins={version:1,eventIds:['security-event-1','security-event-3'],interactionIds:[],jobIds:[],caseIds:[]};
 return root;
}
function admittedCall(root,interactionId='security-call-1'){
 const interaction={id:interactionId,startedAt:root.clock,channel:'voice',phase:'arrival',to:'+61255500201',trace:[]};root.interactions.push(interaction);
 const result=admission.admit(root,interaction,{peerId:'synthetic-carrier',destination:interaction.to,method:'INVITE',messageBytes:128,messageValid:true,secondOffset:0});assert.equal(result.allowed,true);
 interaction.trace.push({stage:'security',code:'SECURITY_CALL_ADMITTED'});interaction.phase='handling';
 const usage=admission.admitUsage(root,interaction.id,0);assert.equal(usage.allowed,true);root.ledger.push({id:'minute-1',minute:1,usage:1,cost:2,voiceInteractions:[interaction.id]});
 interaction.phase='resolved';interaction.outcome='CONNECTED';interaction.obligations=[];interaction.finishedAt=1;return interaction;
}
function generatePressure(root,count=1100){for(let i=0;i<count;i++)admission.command(root,{action:'inject-packets',peer:'synthetic-pressure-source',packets:1,secondOffset:1});}

test('AC-SOC-797 native event pins survive FIFO pressure while an older genuine admission settles through its exact pruned range',()=>{
 const root=readyRoot({pins:true});assert.equal(admission.validate(root),true);const interaction=admittedCall(root);generatePressure(root);
 assert.equal(root.admissionSecurity.events.length,1000);assert.ok(root.admissionSecurity.events.some(x=>x.id==='security-event-1'&&x.code==='NETWORK_FLOOD_FILTERED'));
 assert.ok(root.admissionSecurity.events.some(x=>x.id==='security-event-3'&&x.code==='NETWORK_FLOOD_FILTERED'));
 assert.ok(!root.admissionSecurity.events.some(x=>x.id==='security-event-4'),'the older unpinned admission row was actually evicted');
 assert.deepEqual(root.admissionSecurity.eventHistory,{version:1,prunedRanges:[[2,2],[4,107]]});
 const settled=admission.settle(root,interaction.id);assert.equal(settled.settled,true);assert.equal(settled.record.interactionId,interaction.id);assert.equal(admission.validate(root),true);
 assert.deepEqual(root.admissionSecurity.eventHistory,{version:1,prunedRanges:[[2,2],[4,108]]});
 const worker={};vm.createContext(worker);vm.runInContext(admission.source()+';globalThis.nativeAdmission=SOC_ADMISSION_SECURITY;',worker);assert.equal(worker.nativeAdmission.validate(JSON.parse(JSON.stringify(root))),true,'the imported worker validates the same pinned sparse history');
 const labCopy=structuredClone(root);delete labCopy.providerSecurityPins;assert.equal(admission.validate(labCopy),true,'historical ranges remain valid when a Lab copy removes Provider pin authority');
 admission.command(labCopy,{action:'inject-packets',peer:'lab-copy-pressure',packets:1,secondOffset:2});assert.deepEqual(labCopy.admissionSecurity.eventHistory,{version:1,prunedRanges:[[1,2],[4,108]]});assert.equal(admission.validate(labCopy),true);
 admission.command(labCopy,{action:'inject-packets',peer:'lab-copy-pressure',packets:1,secondOffset:3});assert.deepEqual(labCopy.admissionSecurity.eventHistory,{version:1,prunedRanges:[[1,108]]});assert.equal(admission.validate(labCopy),true);
 assert.deepEqual(root.admissionSecurity.eventHistory,{version:1,prunedRanges:[[2,2],[4,108]]},'copy pressure does not mutate the saved Provider root');
});

test('AC-SOC-798 event history rejects forged counters, gaps, overlaps, missing pinned rows and unknown versions',()=>{
 const root=readyRoot({pins:true}),interaction=admittedCall(root);generatePressure(root);admission.settle(root,interaction.id);assert.equal(admission.validate(root),true);
 const mutations=[
  state=>{state.admissionSecurity.nextId++;},
  state=>{state.admissionSecurity.eventHistory.prunedRanges[0][0]++;},
  state=>{state.admissionSecurity.eventHistory.prunedRanges[0]=[1,103];},
  state=>{state.admissionSecurity.eventHistory.version=2;},
  state=>{state.admissionSecurity.events=state.admissionSecurity.events.filter(x=>x.id!=='security-event-1');},
  state=>{state.admissionSecurity.events.pop();},
  state=>{state.providerSecurityPins.version=2;},
  state=>{state.providerSecurityPins.eventIds.push('security-event-1');}
 ];
 for(const mutate of mutations){const forged=structuredClone(root);mutate(forged);assert.throws(()=>admission.validate(forged),/INVALID_(?:SECURITY_EVENT_HISTORY|PROVIDER_SECURITY_PINS|SECURITY_SETTLEMENT|SECURITY_ADMISSION)/);}
 const allPinned=structuredClone(root);allPinned.providerSecurityPins.eventIds=allPinned.admissionSecurity.events.map(x=>x.id);const before=structuredClone(allPinned.admissionSecurity);assert.throws(()=>admission.command(allPinned,{action:'inject-packets',peer:'capacity-probe',packets:1,secondOffset:2}),/SECURITY_EVENT_CAPACITY/);assert.deepEqual(allPinned.admissionSecurity,before,'capacity refusal leaves the full pinned ring untouched');
});

test('AC-SOC-799 unpinned legacy FIFO saves keep their original admission fallback without eventHistory',()=>{
 const root=readyRoot(),interaction=admittedCall(root);generatePressure(root);
 assert.equal(Object.prototype.hasOwnProperty.call(root.admissionSecurity,'eventHistory'),false);
 assert.equal(root.admissionSecurity.events.length,1000);assert.ok(root.admissionSecurity.events.every(x=>Number(x.id.slice('security-event-'.length))>4));
 const settled=admission.settle(root,interaction.id);assert.equal(settled.settled,true);assert.equal(admission.validate(root),true);
});

test('AC-SOC-814 Provider compaction retains exact terminal security proof and rejects missing or forged archive lineage',()=>{
 const history=require('../src/game/23-provider-history.js'),root=readyRoot(),interaction=admittedCall(root,'interaction-1');admission.settle(root,interaction.id);
 root.nextId=66;root.providerCustomer={version:1,id:'customer-a'};root.commands=[];root.records=[];
 for(let n=2;n<=65;n++)root.interactions.push({id:'interaction-'+n,caseId:'case-'+n,phase:'resolved',channel:'message',startedAt:1,finishedAt:1});
 while(root.clock<63){root.clock++;admission.advance(root);}const original=structuredClone(root);history.compact(root);assert.equal(root.interactions.length,64);assert.ok(!root.interactions.some(i=>i.id===interaction.id));assert.equal(root.providerArchive.interactions,1);
 const settlement=root.admissionSecurity.settlements[0];assert.equal(settlement.archivedInteraction.interactionId,interaction.id);assert.equal(settlement.archivedInteraction.prunedAt,63);assert.equal(settlement.archivedInteraction.admissionEventId,root.admissionSecurity.admissions[0].eventId);assert.equal(admission.validate(root),true);assert.equal(history.validate(root),true);
 for(const mutate of [r=>delete r.admissionSecurity.settlements[0].archivedInteraction,r=>r.admissionSecurity.settlements[0].archivedInteraction.admissionEventId='security-event-9999',r=>r.admissionSecurity.settlements[0].archivedInteraction.finishedAt++,r=>r.admissionSecurity.settlements[0].archivedInteraction.prunedAt=2,r=>r.admissionSecurity.settlements[0].archivedInteraction.obligations=['fabricated'],r=>r.tracePrunedThrough=0]){const bad=structuredClone(root);mutate(bad);assert.throws(()=>admission.validate(bad),/INVALID_SECURITY_SETTLEMENT_SAVE|INVALID_SECURITY_ARCHIVE_EVENT/);}
 const missing=structuredClone(original);missing.interactions.shift();missing.tracePrunedThrough=1;assert.throws(()=>admission.validate(missing),/INVALID_SECURITY_SETTLEMENT_SAVE/,'a scalar prune marker alone cannot replace the deletion receipt');
 const coherent=structuredClone(original);coherent.interactions.shift();coherent.tracePrunedThrough=1;coherent.providerArchive={version:1,interactions:1,resolved:1,failed:0,cases:0,commands:0,ledgerMinutes:0,assignments:0,throughInteractionId:1};coherent.admissionSecurity.settlements[0].archivedInteraction=structuredClone(settlement.archivedInteraction);assert.throws(()=>admission.validate(coherent),/INVALID_SECURITY_SETTLEMENT_SAVE/,'matching archive and aggregate counters without the issued deletion event are refused');
 const altered=structuredClone(root);altered.admissionSecurity.settlements[0].phase='failed';altered.admissionSecurity.settlements[0].archivedInteraction.phase='failed';assert.throws(()=>admission.validate(altered),/INVALID_SECURITY_SETTLEMENT_SAVE/,'changing both terminal records cannot change the actual archive event');
 // Replacing the original settlement event with an archive must not turn a failed call into success.
 const failed=readyRoot(),failedCall=admittedCall(failed,'interaction-1');failedCall.phase='failed';failedCall.outcome='DESTINATION_WINDOW_LIMIT';admission.settle(failed,failedCall.id);
 failed.nextId=66;failed.providerCustomer={version:1,id:'customer-a'};failed.commands=[];failed.records=[];
 for(let n=2;n<=65;n++)failed.interactions.push({id:'interaction-'+n,phase:'resolved',channel:'message',startedAt:1,finishedAt:1});
 while(failed.clock<63){failed.clock++;admission.advance(failed);}const genuineFailed=structuredClone(failed);history.compact(genuineFailed);assert.equal(admission.validate(genuineFailed),true);assert.equal(genuineFailed.admissionSecurity.settlements[0].phase,'failed');
 const forged=structuredClone(failed),fs=forged.admissionSecurity.settlements[0],originalEvent=forged.admissionSecurity.events.find(e=>e.id===fs.settlementEventId),archiveEvent=structuredClone(root.admissionSecurity.events.find(e=>e.id===settlement.archivedInteraction.pruningEventId));
 forged.interactions.shift();forged.tracePrunedThrough=1;forged.providerArchive=structuredClone(root.providerArchive);fs.phase='resolved';fs.outcome='CONNECTED';fs.archivedInteraction=structuredClone(settlement.archivedInteraction);fs.archivedInteraction.pruningEventId=originalEvent.id;archiveEvent.id=originalEvent.id;Object.assign(originalEvent,archiveEvent);
 assert.throws(()=>admission.validate(forged),/INVALID_SECURITY_SETTLEMENT_SAVE/,'a single rewritten settlement event cannot serve as its own later archive proof');
 const downgraded=structuredClone(failed),ds=downgraded.admissionSecurity.settlements[0];delete ds.settlementEventId;ds.phase='resolved';ds.outcome='CONNECTED';downgraded.nextId=202;downgraded.interactions=Array.from({length:200},(_,i)=>({id:'interaction-'+(i+2),phase:'resolved',channel:'message',startedAt:1,finishedAt:1}));assert.throws(()=>admission.validate(downgraded),/INVALID_SECURITY_SETTLEMENT_SAVE/,'legacy ring fallback cannot contradict a retained original settlement event');
 // Older saves without a settlement event reference remain readable; compaction upgrades them from retained work.
 const legacy=structuredClone(original),legacySettlement=legacy.admissionSecurity.settlements[0];delete legacySettlement.settlementEventId;assert.equal(admission.validate(legacy),true);history.compact(legacy);assert.equal(admission.validate(legacy),true);assert.ok(legacy.admissionSecurity.settlements[0].settlementEventId);
 const pressured=structuredClone(root);generatePressure(pressured);assert.ok(pressured.admissionSecurity.events.some(e=>e.id===settlement.archivedInteraction.pruningEventId));assert.ok(pressured.admissionSecurity.events.some(e=>e.id===settlement.settlementEventId));assert.equal(admission.validate(pressured),true,'actual native archive event survives bounded journal pressure');
 const lab=structuredClone(root);delete lab.providerCustomer;delete lab.providerArchive;assert.equal(admission.validate(lab),true,'a Lab copy retains the already validated native settlement history');
 const context={};vm.createContext(context);vm.runInContext(admission.source()+history.source()+`;globalThis.admission=SOC_ADMISSION_SECURITY;globalThis.history=SOC_PROVIDER_HISTORY;`,context);const replay=structuredClone(original);context.history.compact(replay);assert.deepEqual(JSON.parse(JSON.stringify(replay)),root);assert.equal(context.admission.validate(replay),true);
});
