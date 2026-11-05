const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
// REQ-da2a84278c7e5855 / REQ-16191e04129963b0: synthetic scenario interfaces,
// never jurisdiction labels as blanket approval. Every fixture transition is dispatched.
const {send,info,tick,contract,bind,ready,record,interfaceCommand,transfer}=require('./lib/information-interface-fixture');
function worker(s,command){let result;const context={postMessage:r=>result=r};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:71,state:s,command}});assert.equal(result.error,undefined);return JSON.parse(JSON.stringify(result.state));}

test('AC-SOC-471 restricted recording transfer requires a delayed explicit archive interface and preserves classification and custody',()=>{
 for(const jurisdiction of ['AU','US','JP','EU']){
  let s=record(ready({jurisdiction}));const source=structuredClone(s.records[0]);
  s=info(s,interfaceCommand());assert.equal(s.information.interfaces[0].effective,null);
  const pending=transfer(s);assert.equal(pending.information.transfers.at(-1).reason,'INTERFACE_NOT_EFFECTIVE');assert.deepEqual(pending.records,s.records);
  s=tick(pending);assert.equal(s.information.interfaces[0].provisioning.status,'ready');s=transfer(s);
  assert.equal(s.information.transfers.at(-1).status,'complete');const output=s.records.at(-1);
  assert.deepEqual(s.records[0],source);assert.deepEqual(output.parents,[source.id]);assert.equal(output.classification,'restricted');assert.deepEqual(output.origin,source.origin);
  assert.equal(output.storage.boundaryContractId,'destination-environment');assert.equal(output.interfaceTransfer.interfaceId,'scenario-handover');assert.ok(output.expiresAt<=source.expiresAt);assert.deepEqual(output.access,['supervisor']);
  assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));
 }
});
test('AC-SOC-472 administration-to-training cannot declassify restricted capture and retains its blocked attempt without changing records',()=>{
 let s=record(ready({administration:true}));assert.equal(s.records[0].classification,'restricted');s=tick(info(s,interfaceCommand(true)));
 const before=JSON.stringify(s.records),attempts=s.information.transfers.length;s=transfer(s);
 assert.equal(JSON.stringify(s.records),before);assert.equal(s.information.transfers.length,attempts+1);assert.equal(s.information.transfers.at(-1).reason,'POLICY_CLASSIFICATION_EXCEEDED');assert.equal(s.information.audit.at(-1).code,'INFORMATION_TRANSFER_BLOCKED');assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));
});
test('AC-SOC-473 administration-to-training accepts a genuinely internal capture without relabelling a restricted recording',()=>{
 let s=record(ready({administration:true,restrictedCapture:false}));const original=structuredClone(s.records[0]);assert.equal(original.classification,'internal');
 s=transfer(tick(info(s,interfaceCommand(true))));assert.equal(s.information.transfers.at(-1).status,'complete');assert.deepEqual(s.records[0],original);
 assert.equal(s.records.at(-1).classification,'internal');assert.equal(s.records.at(-1).storage.workload,'training');assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));
});
test('AC-SOC-474 direction, stale destination generation, revocation and explicit reprovisioning gate actual transfer recovery',()=>{
 let s=tick(info(record(ready()),interfaceCommand()));s=transfer(s);const returned=s.records.at(-1).id;
 const wrong=transfer(s,returned);assert.equal(wrong.information.transfers.at(-1).reason,'SOURCE_STORAGE_LINEAGE_STALE');assert.deepEqual(JSON.parse(JSON.stringify(wrong.records)),JSON.parse(JSON.stringify(s.records)));s=wrong;
 s=SOC.dispatch(s,{type:'configure',id:'handover-archive',config:{retentionDays:10}});s=tick(s);const stale=transfer(s);assert.equal(stale.information.transfers.at(-1).reason,'DESTINATION_BOUNDARY_STALE_OR_INELIGIBLE');assert.deepEqual(JSON.parse(JSON.stringify(stale.records)),JSON.parse(JSON.stringify(s.records)));
 s=tick(bind(stale,contract(stale,'destination-environment','restricted-operations',['handover-archive'])));
 s=tick(info(s,interfaceCommand()));s=transfer(s);assert.equal(s.information.transfers.at(-1).status,'complete');
 s=info(s,{action:'revoke-interface',interfaceId:'scenario-handover'});assert.equal(transfer(s).information.transfers.at(-1).status,'blocked');s=tick(s);assert.equal(transfer(s).information.transfers.at(-1).reason,'INTERFACE_REVOKED');
 s=tick(info(s,interfaceCommand()));s=transfer(s);assert.equal(s.information.transfers.at(-1).status,'complete');assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));
});
test('AC-SOC-475 worker, save and pure inspection agree for successful and blocked interface transfers',()=>{
 for(const administration of [false,true]){
  let s=record(ready({administration}));const command={type:'information',command:interfaceCommand(administration)};
  assert.deepEqual(worker(s,command),JSON.parse(JSON.stringify(SOC.dispatch(s,command))));s=tick(SOC.dispatch(s,command));
  const transferCommand={type:'information',command:{action:'transfer',interfaceId:'scenario-handover',recordId:s.records[0].id,role:'supervisor'}};
  const expected=SOC.dispatch(s,transferCommand);assert.deepEqual(worker(s,transferCommand),JSON.parse(JSON.stringify(expected)));assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(expected)))),JSON.parse(JSON.stringify(expected)));
  const before=JSON.stringify(expected);SOC.calculate(expected);SOC.information.inspect(expected);SOC.calculate(expected);assert.equal(JSON.stringify(expected),before);
 }
});
test('AC-SOC-476 source storage generation changes require new capture evidence even after interface reprovisioning',()=>{
 let s=tick(info(record(ready()),interfaceCommand()));const original=s.records[0].id;
 s=SOC.dispatch(s,{type:'configure',id:'archive',config:{retentionDays:20}});s=tick(s);
 s=transfer(s,original);assert.equal(s.information.transfers.at(-1).reason,'SOURCE_STORAGE_LINEAGE_STALE');
 s=tick(bind(s,contract(s,'source-environment','restricted-operations',['archive','recorder','room','local'])));
 s=tick(info(s,interfaceCommand()));s=transfer(s,original);assert.equal(s.information.transfers.at(-1).reason,'SOURCE_STORAGE_LINEAGE_STALE');
 s=info(s,{action:'cancel',booking:s.information.bookings[0].id});s=record(s);const captured=s.records.at(-1).id;
 s=transfer(s,captured);assert.equal(s.information.transfers.at(-1).status,'complete');assert.equal(s.records.at(-1).parents[0],captured);assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));
});
test('AC-SOC-491 historical transferred records survive recorder reconfiguration while new copies require fresh capture lineage',()=>{
 let s=ready();s=bind(s,contract(s,'capture-environment','restricted-operations',['recorder']));s=bind(s,contract(s,'source-environment','restricted-operations',['archive','room','local']));s=tick(s);
 s=transfer(tick(info(record(s),interfaceCommand())));const original=s.records[0].id,receipt=structuredClone(s.information.transfers.at(-1)),copied=structuredClone(s.records.at(-1));
 s=SOC.dispatch(s,{type:'configure',id:'recorder',config:{capacity:8}});s=tick(bind(s,contract(s,'capture-environment','restricted-operations',['recorder'],'internal')));
 assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));assert.deepEqual(JSON.parse(JSON.stringify(s.records.find(r=>r.id===copied.id))),JSON.parse(JSON.stringify(copied)));assert.deepEqual(JSON.parse(JSON.stringify(s.information.transfers.find(r=>r.id===receipt.id))),JSON.parse(JSON.stringify(receipt)));
 const enforcement=SOC.calculate(s).boundaries.enforcement;assert.equal(enforcement.archive.eligible,true);assert.equal(enforcement['handover-archive'].eligible,true);
 const before=JSON.stringify(s.records);s=transfer(s,original);assert.equal(s.information.transfers.at(-1).status,'blocked');assert.equal(s.information.transfers.at(-1).reason,'SOURCE_CAPTURE_LINEAGE_STALE');assert.equal(JSON.stringify(s.records),before);
 s=info(s,{action:'cancel',booking:s.information.bookings[0].id});s=record(s);s=transfer(s,s.records.at(-1).id);assert.equal(s.information.transfers.at(-1).status,'complete');assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));
});
test('AC-SOC-477 save validation rejects altered destination custody, lowered classification and removed successful transfer receipts',()=>{
 const s=transfer(tick(info(record(ready()),interfaceCommand())));
 for(const [mutate,error] of [
  [x=>x.records.at(-1).storage.resourceId='archive',/^Error: INVALID_RECORD_STORE_DESTINATION$/],
  [x=>x.records.at(-1).classification='internal',/INVALID_INFORMATION_/],
  [x=>x.information.transfers.pop(),/INVALID_INFORMATION_/]
 ]){
  const forged=structuredClone(s);mutate(forged);assert.throws(()=>SOC.restore(JSON.stringify(forged)),error);
 }
 assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));
});
test('AC-SOC-492 retained transfer policy cannot be relabelled and survives legitimate interface revocation or policy reconfiguration',()=>{
 const complete=transfer(tick(info(record(ready()),interfaceCommand()))),revoked=tick(info(complete,{action:'revoke-interface',interfaceId:'scenario-handover'}));
 let reconfigured=bind(revoked,contract(revoked,'source-environment','administration',['archive','recorder','room','local'],'internal'));
 reconfigured=tick(bind(reconfigured,contract(reconfigured,'destination-environment','training',['handover-archive'],'internal')));reconfigured=tick(info(reconfigured,interfaceCommand(true)));
 assert.equal(reconfigured.information.interfaces[0].effective.policyId,'defence-admin-to-training-v1');
 for(const original of [complete,revoked,reconfigured]){
  assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(original)))),JSON.parse(JSON.stringify(original)));assert.equal(original.records.at(-1).interfaceTransfer.policyId,'defence-restricted-handover-v1');
  const forged=structuredClone(original);forged.records.at(-1).interfaceTransfer.policyId='defence-admin-to-training-v1';assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_INFORMATION_TRANSFER_LINEAGE/);
 }
});
test('AC-SOC-478 matching a forged origin receipt cannot downgrade the retained restricted capture contract',()=>{
 const s=tick(info(record(ready({administration:true})),interfaceCommand(true)));
 assert.equal(s.boundaries.contracts.find(c=>c.id==='source-environment').effective.flows.find(f=>f.resource==='recorder').informationClass,'restricted');
 const rebound=tick(bind(s,contract(s,'recorder-rebound','administration',['recorder'],'restricted')));
 for(const original of [s,rebound]){
  assert.deepEqual(SOC.restore(JSON.stringify(original)),original);
  const forged=structuredClone(original),r=forged.records[0];r.classification='internal';r.origin.classification='internal';r.origin.capture.informationClass='internal';forged.information.originReceipts[0].origin=structuredClone(r.origin);
  assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_INFORMATION_/);
 }
 assert.equal(transfer(s).information.transfers.at(-1).reason,'POLICY_CLASSIFICATION_EXCEEDED');
});
test('AC-SOC-479 processing transferred restricted information cannot silently move it to the pipeline original archive',()=>{
 let s=ready();s=SOC.dispatch(s,{type:'configure',id:'speech',config:{licenceLocal:true}});
 s=tick(bind(s,contract(s,'source-environment','restricted-operations',['archive','recorder','room','local','speech'])));
 s=transfer(tick(info(record(s),interfaceCommand())));const transferred=s.records.at(-1).id;
 s=tick(info(s,{action:'configure',kind:'pipeline',config:{enabled:true,steps:['transcription'],archive:'archive'}}));
 const before=JSON.stringify(s.records);s=info(s,{action:'process',record:transferred});s=tick(s,2);
 assert.equal(JSON.stringify(s.records),before);assert.equal(s.information.jobs.at(-1).status,'blocked');assert.equal(s.information.jobs.at(-1).reason,'PROCESSING_STORAGE_INTERFACE_REQUIRED');
 assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));
});
test('AC-SOC-480 defence-specific interfaces do not break government meeting capture under its own boundary contract',()=>{
 let s=SOC.create({scenario:'government'});for(const command of SOC.reference(s).filter(c=>c.type==='configure'))s=SOC.dispatch(s,command);
 s=info(s,{action:'start'});s=info(s,{action:'configure',kind:'pipeline',config:{enabled:false}});s=info(s,{action:'configure',kind:'meeting',config:{recording:true}});s=send(s,'boundaries',{action:'start'});
 const c=contract(s,'government-environment','customer-service',['archive','recorder','room','local'],'confidential');c.edition='government';c.requirements.continuity='cloud';
 for(const flow of c.flows){flow.connectivity='cloud';flow.continuity='cloud';flow.licenceMode='cloud';}
 s=tick(bind(s,c));s=info(s,{action:'book',start:s.clock,end:s.clock+3,attendees:2,event:false,language:'en'});s=info(s,{action:'schedule',booking:s.information.bookings.at(-1).id});s=tick(s,3);
 assert.equal(s.information.meetingSessions.at(-1).status,'completed');assert.equal(s.records[0].kind,'recording');assert.deepEqual(JSON.parse(JSON.stringify(SOC.restore(JSON.stringify(s)))),JSON.parse(JSON.stringify(s)));
 assert.throws(()=>info(s,interfaceCommand()),/INVALID_SCENARIO_INTERFACE/);
});
test('AC-SOC-481 outer dispatcher authority covers each endpoint independently and rejects denied commands atomically',()=>{
 for(const reverse of [false,true]){
  let s=record(ready({businessBeforeDestination:true}));const config=interfaceCommand();
  if(reverse){config.sourceResource='handover-archive';config.destinationResource='archive';}
  s=tick(info(s,config));s=send(s,'business',{action:'revoke',grant:'customer-service'});
  assert.equal(SOC.business.authorise(s,'archive','configure'),false);assert.equal(SOC.business.authorise(s,'handover-archive','configure'),true);
  const before=JSON.stringify(s);
  for(const command of [config,{action:'revoke-interface',interfaceId:'scenario-handover'},{action:'transfer',interfaceId:'scenario-handover',recordId:s.records[0].id,role:'supervisor'}])assert.throws(()=>info(s,command),/DELEGATION_REQUIRED/);
  assert.equal(JSON.stringify(s),before);
 }
});
