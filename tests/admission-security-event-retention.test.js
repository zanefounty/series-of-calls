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
function admittedCall(root){
 const interaction={id:'security-call-1',channel:'voice',phase:'arrival',to:'+61255500201',trace:[]};root.interactions.push(interaction);
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
