const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const {send,info,tick,contract,bind,ready,record,interfaceCommand,transfer,journey}=require('./lib/information-interface-fixture');

function observed(s,c){return send(s,'boundaries',{action:'observe',contract:c.id,observed:{connected:true,cloudLicenceAvailable:true,localLicenceGraceActive:true,localLicenceGraceExpiresAt:s.clock+100,localServicesAvailable:true,localKeyCustodyAvailable:true,adminPathAvailable:true,adminPathLocation:s.jurisdiction}});}
function endpoint(s,resourceId,contractId){
 const c=s.boundaries.contracts.find(x=>x.id===contractId),f=c.effective.flows.find(x=>x.resource===resourceId),r=s.resources[resourceId];
 return {resourceId,resourceGeneration:r.generation,boundaryContractId:c.id,boundaryGeneration:c.generation,flowId:f.id,workload:c.effective.workload,profile:c.effective.profile,informationClass:f.informationClass,accessRoles:structuredClone(f.accessRoles),eligible:true};
}

test('imported interface snapshots cannot redirect a named policy to a different workload',()=>{
 let s=record(ready({administration:true,restrictedCapture:false}));s=tick(info(s,interfaceCommand(true)));
 assert.equal(s.information.interfaces[0].effective.destination.workload,'training');
 const changed=contract(s,'destination-environment','administration',['handover-archive'],'internal');
 s=observed(send(s,'boundaries',{action:'contract',contract:changed}),changed);s=tick(s);
 const forged=structuredClone(s),node=forged.information.interfaces[0];node.generation++;
 const destination=endpoint(forged,'handover-archive','destination-environment');
 node.desired={...node.desired,destination};node.effective=structuredClone(node.desired);
 node.provisioning={status:'ready',due:forged.clock,generation:node.generation,errors:[]};
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_INFORMATION_INTERFACE_CONFIG/);
});

test('historical saves remain importable but stale capture evidence cannot authorize a new transfer or lower classification',()=>{
 let s=ready({administration:true,restrictedCapture:true});
 s=tick(bind(s,contract(s,'archive-environment','administration',['archive'],'internal')));
 s=record(s);s=tick(info(s,interfaceCommand(true)));
 const source=s.records[0];assert.equal(source.origin.classification,'restricted');
 const revised=contract(s,'source-environment','administration',['recorder','room','local'],'internal');
 s=observed(send(s,'boundaries',{action:'contract',contract:revised}),revised);s=tick(s);
 const forged=structuredClone(s),r=forged.records[0];
 r.origin.capture.informationClass='internal';r.origin.classification='internal';r.classification='internal';
 forged.information.originReceipts.find(x=>x.recordId===r.id).origin=structuredClone(r.origin);
 const imported=SOC.restore(JSON.stringify(forged));
 const blocked=transfer(imported,r.id);assert.equal(blocked.information.transfers.at(-1).reason,'SOURCE_CAPTURE_LINEAGE_STALE');
 assert.deepEqual(blocked.records,imported.records);
 const available=info(imported,{action:'cancel',booking:imported.information.bookings[0].id});
 const fresh=record(available);const recovered=transfer(fresh,fresh.records.at(-1).id);
 assert.equal(recovered.information.transfers.at(-1).status,'complete');
});

test('imported completed transfers cannot extend parent retention or broaden access',()=>{
 const complete=transfer(tick(info(record(ready({administration:true,restrictedCapture:false})),interfaceCommand(true))));
 assert.equal(complete.information.transfers.at(-1).status,'complete');
 assert.deepEqual(SOC.restore(JSON.stringify(complete)),complete);
 for(const mutate of [
  s=>{const [parent,copy]=[s.records[0],s.records.at(-1)];copy.expiresAt=parent.expiresAt+10000;},
  s=>s.records.at(-1).access.push('admin'),
  s=>s.records[0].access.push('admin'),
  s=>{delete s.records[0].expiresAt;delete s.records.at(-1).expiresAt;},
 ]){
  const forged=structuredClone(complete);mutate(forged);
  assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_INFORMATION_/);
 }
 const relabelled=journey().expectedState;relabelled.records.at(-1).interfaceTransfer.policyId='defence-admin-to-training-v1';
 assert.throws(()=>SOC.restore(JSON.stringify(relabelled)),/INVALID_INFORMATION_TRANSFER_LINEAGE/);
});

test('transfer copies intersect all access evidence and ordinary derived records cannot broaden it',()=>{
 let s=ready({administration:true,restrictedCapture:false});
 s=SOC.dispatch(s,{type:'configure',id:'archive',config:{access:['supervisor','admin']}});s=tick(s);
 const source=contract(s,'source-environment','administration',['archive','recorder','room','local'],'internal');
 source.requirements.allowedAccessRoles=['supervisor','admin'];source.flows.find(x=>x.resource==='archive').accessRoles=['supervisor','admin'];
 s=tick(bind(s,source));
 s=record(s);s=transfer(tick(info(s,interfaceCommand(true))));
 const copy=s.records.at(-1);assert.deepEqual(copy.access,['supervisor']);
 const forged=structuredClone(s),parent=forged.records.at(-1),child=structuredClone(parent);
 child.id='record-999';child.kind='transcription';child.parents=[parent.id];child.createdAt=forged.clock;
 child.expiresAt=parent.expiresAt+5000;child.retentionDays=100;child.access.push('admin');delete child.interfaceTransfer;
 forged.records.push(child);
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_INFORMATION_/);
});

test('a previously completed transfer remains valid evidence after later recorder contract changes',()=>{
 let s=transfer(tick(info(record(ready({administration:true,restrictedCapture:false})),interfaceCommand(true))));
 const revised=contract(s,'source-environment','administration',['archive','recorder','room','local'],'internal');
 revised.flows.find(x=>x.resource==='recorder').informationClass='internal';
 s=observed(send(s,'boundaries',{action:'contract',contract:revised}),revised);s=tick(s);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
