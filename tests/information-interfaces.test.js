const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');

const dispatch=(s,type,command)=>SOC.dispatch(s,{type,command});
const info=(s,command)=>dispatch(s,'information',command);
const tick=(s,n=1)=>SOC.dispatch(s,{type:'advance',minutes:n});

function boundaryContract(s,id,workload,resources,classification){
 const region=s.jurisdiction;
 return {id,workload,profile:region,sensitivity:classification,edition:'local',productVersion:'scenario-1',offeringEvidence:'eligible',customerAuthorization:'approved',agencyAuthorizationRequired:false,agencyAuthorization:'not-required',serviceRegistration:region==='JP'?'registered':'not-registered',serviceRegistrationId:region==='JP'?'fictional-service':null,usesAi:false,aiUseDecision:'not-required',language:region==='JP'?'ja':'en',supportLanguage:region==='JP'?'ja':'en',requirements:{processingRegions:[region],storageRegions:[region],backupRegions:[region],keyRegions:[region],adminRegions:[region],supportRegions:[region],allowedAccessRoles:['supervisor'],adminAuthorization:'customer-approved',continuity:'local',allowedTransferMechanisms:[]},flows:resources.map(resource=>({id:`flow-${resource}`,resource,informationClass:classification,processingRegions:[region],storageRegions:[region],backupRegions:[region],keyCustodyRegions:[region],adminLocations:[region],supportRegions:[region],adminAuthorization:'customer-approved',accessRoles:['supervisor'],connectivity:'local',continuity:'local',licenceMode:'local-grace',transfer:{parties:[],mechanism:null}}))};
}

function fixture({administration=false,restrictedCapture=true}={}){
 let s=SOC.create({scenario:'defence',jurisdiction:'AU'});
 s=SOC.dispatch(s,{type:'configure',id:'local',config:{licensing:true}});
 s=SOC.dispatch(s,{type:'add',id:'handover-archive',kind:'archive',config:{...s.resources.archive.desired}});
 s=info(s,{action:'start'});
 s=info(s,{action:'configure',kind:'pipeline',config:{enabled:false}});
 s=info(s,{action:'configure',kind:'meeting',config:{recording:true,mediaPlacement:'local'}});
 s=dispatch(s,'boundaries',{action:'start'});
 const classValue=administration?'internal':'restricted';
 const source=boundaryContract(s,'source-environment',administration?'administration':'restricted-operations',['archive','recorder','room','local'],classValue);
 if(administration&&restrictedCapture)source.flows.find(x=>x.resource==='recorder').informationClass='restricted';
 const destination=boundaryContract(s,'destination-environment',administration?'training':'restricted-operations',['handover-archive'],classValue);
 for(const c of [source,destination]){
  s=dispatch(s,'boundaries',{action:'contract',contract:c});
  for(const f of c.flows)s=dispatch(s,'boundaries',{action:'bind',resource:f.resource,contract:c.id});
  s=dispatch(s,'boundaries',{action:'observe',contract:c.id,observed:{connected:true,cloudLicenceAvailable:true,localLicenceGraceActive:true,localLicenceGraceExpiresAt:s.clock+100,localServicesAvailable:true,localKeyCustodyAvailable:true,adminPathAvailable:true,adminPathLocation:s.jurisdiction}});
 }
 return tick(s);
}

function captured(s){
 s=info(s,{action:'book',start:s.clock,end:s.clock+20,attendees:2,event:false,language:'en'});
 s=info(s,{action:'join',booking:s.information.bookings.at(-1).id});
 assert.equal(s.lastMeeting.success,true);
 assert.equal(s.records.at(-1).origin.complete,true);
 return s;
}

const interfaceCommand=(admin=false)=>({action:'interface',id:'scenario-interface',policyId:admin?'defence-admin-to-training-v1':'defence-restricted-handover-v1',sourceResource:'archive',destinationResource:'handover-archive'});
const transfer=(s,recordId=s.records[0].id)=>info(s,{action:'transfer',interfaceId:'scenario-interface',recordId,role:'supervisor'});

test('AC-SOC-466 fictional defence interface policies are immutable, explicit, directional and bounded',()=>{
 const policies=SOC.information.interfacePolicies;
 assert.deepEqual(Object.keys(policies).sort(),['defence-admin-to-training-v1','defence-restricted-handover-v1']);
 assert.equal(Object.isFrozen(policies),true);
 assert.equal(Object.isFrozen(policies['defence-restricted-handover-v1']),true);
 assert.equal(policies['defence-admin-to-training-v1'].maximumClassification,'internal');
 assert.equal(policies['defence-restricted-handover-v1'].distinctEnvironment,true);
});

test('AC-SOC-467 restricted copy retains capture classification and destination storage; failed attempts change neither records nor config fingerprint',()=>{
 let s=captured(fixture());
 s=info(s,interfaceCommand());
 const fingerprint=SOC.information.fingerprint(s),before=structuredClone(s.records);
 const inspected=JSON.stringify(s);SOC.information.inspect(s);assert.equal(JSON.stringify(s),inspected);
 s=info(s,{action:'read',record:s.records[0].id,role:'supervisor',region:'AU'});
 assert.deepEqual(SOC.information.fingerprint(s),fingerprint);
 s=transfer(s);
 assert.equal(s.information.transfers.at(-1).reason,'INTERFACE_NOT_EFFECTIVE');
 assert.deepEqual(s.records,before);
 assert.deepEqual(SOC.information.fingerprint(s),fingerprint);
 s=tick(s);s=transfer(s);
 const copy=s.records.at(-1);
 assert.equal(s.information.transfers.at(-1).status,'complete');
 assert.equal(copy.classification,'restricted');
 assert.deepEqual(copy.origin,before[0].origin);
 assert.equal(copy.storage.resourceId,'handover-archive');
 assert.equal(copy.parents[0],before[0].id);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('AC-SOC-468 restricted capture cannot use the lower-class admin-to-training interface or be relabelled on save',()=>{
 let s=captured(fixture({administration:true}));
 assert.equal(s.records[0].classification,'restricted');
 s=tick(info(s,interfaceCommand(true)));
 const records=JSON.stringify(s.records),fingerprint=SOC.information.fingerprint(s);
 s=transfer(s);
 assert.equal(s.information.transfers.at(-1).reason,'POLICY_CLASSIFICATION_EXCEEDED');
 assert.equal(JSON.stringify(s.records),records);
 assert.deepEqual(SOC.information.fingerprint(s),fingerprint);
 const forged=structuredClone(s);forged.records[0].origin.classification='public';forged.records[0].classification='public';
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_INFORMATION_/);
 const downgraded=structuredClone(s),record=downgraded.records[0];record.classification='internal';record.origin.classification='internal';record.origin.capture.informationClass='internal';downgraded.information.originReceipts[0].origin=structuredClone(record.origin);
 assert.throws(()=>SOC.restore(JSON.stringify(downgraded)),/INVALID_INFORMATION_/);
});

test('AC-SOC-469 explicitly internal administration records can pass only through the permitted one-way training interface',()=>{
 let s=captured(fixture({administration:true,restrictedCapture:false}));
 assert.equal(s.records[0].origin.workload,'administration');assert.equal(s.records[0].classification,'internal');
 s=info(s,interfaceCommand(true));s=tick(s);const result=transfer(s);
 assert.equal(result.information.transfers.at(-1).status,'complete');
 assert.equal(result.records.at(-1).classification,'internal');
 assert.equal(result.records.at(-1).storage.workload,'training');
 assert.equal(result.records.at(-1).interfaceTransfer.policyId,'defence-admin-to-training-v1');
 assert.deepEqual(SOC.restore(JSON.stringify(result)),result);
});

test('AC-SOC-470 legacy record without captured origin remains loadable but cannot transfer; worker result matches main command',()=>{
 let s=captured(fixture());s=info(s,interfaceCommand());s=tick(s);
 const legacy=structuredClone(s);delete legacy.records[0].origin;delete legacy.records[0].classification;delete legacy.records[0].storage;legacy.information.originReceipts=[];
 assert.deepEqual(SOC.restore(JSON.stringify(legacy)),legacy);
 const command={type:'information',command:{action:'transfer',interfaceId:'scenario-interface',recordId:legacy.records[0].id,role:'supervisor'}};
 const result=SOC.dispatch(legacy,command);assert.equal(result.information.transfers.at(-1).reason,'SOURCE_ORIGIN_UNPROVEN');
 const worker={};vm.createContext(worker);vm.runInContext(SOC.workerSource()+';globalThis.workerSOC=SOC;',worker);let response;worker.postMessage=x=>response=x;
 worker.onmessage({data:{id:7,state:legacy,command}});
 assert.equal(response.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(response.state)),result);
});
