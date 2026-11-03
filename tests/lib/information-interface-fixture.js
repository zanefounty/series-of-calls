// Public synthetic commands only. Importing this helper does not register or execute tests.
const assert=require('node:assert/strict');
const SOC=require('../../src/game/55-communications');
const histories=new WeakMap();
function apply(s,command){const next=SOC.dispatch(s,command);histories.set(next,[...(histories.get(s)||[]),structuredClone(command)]);return next;}
const send=(s,type,command)=>apply(s,{type,command});
const info=(s,command)=>send(s,'information',command);
const tick=(s,minutes=1)=>apply(s,{type:'advance',minutes});
function contract(s,id,workload,resources,classification='restricted'){
 const r=s.jurisdiction;
 return {id,workload,profile:r,sensitivity:classification,edition:'local',productVersion:'scenario-1',offeringEvidence:'eligible',customerAuthorization:'approved',agencyAuthorizationRequired:false,agencyAuthorization:'not-required',serviceRegistration:r==='JP'?'registered':'not-registered',serviceRegistrationId:r==='JP'?'fictional-service':null,usesAi:false,aiUseDecision:'not-required',language:r==='JP'?'ja':'en',supportLanguage:r==='JP'?'ja':'en',requirements:{processingRegions:[r],storageRegions:[r],backupRegions:[r],keyRegions:[r],adminRegions:[r],supportRegions:[r],allowedAccessRoles:['supervisor'],adminAuthorization:'customer-approved',continuity:'local',allowedTransferMechanisms:[]},flows:resources.map(resource=>({id:'flow-'+resource,resource,informationClass:classification,processingRegions:[r],storageRegions:[r],backupRegions:[r],keyCustodyRegions:[r],adminLocations:[r],supportRegions:[r],adminAuthorization:'customer-approved',accessRoles:['supervisor'],connectivity:'local',continuity:'local',licenceMode:'local-grace',transfer:{parties:[],mechanism:null}}))};
}
function bind(s,c){
 s=send(s,'boundaries',{action:'contract',contract:c});
 for(const f of c.flows)s=send(s,'boundaries',{action:'bind',resource:f.resource,contract:c.id});
 return send(s,'boundaries',{action:'observe',contract:c.id,observed:{connected:true,cloudLicenceAvailable:true,localLicenceGraceActive:true,localLicenceGraceExpiresAt:s.clock+100,localServicesAvailable:true,localKeyCustodyAvailable:true,adminPathAvailable:true,adminPathLocation:s.jurisdiction}});
}
function ready({jurisdiction='AU',administration=false,businessBeforeDestination=false}={}){
 let s=SOC.create({scenario:'defence',jurisdiction});
 s=apply(s,{type:'configure',id:'local',config:{licensing:true}});
 if(businessBeforeDestination)s=send(s,'business',{action:'start'});
 s=apply(s,{type:'add',id:'handover-archive',kind:'archive',config:{...s.resources.archive.desired}});
 s=info(s,{action:'start'});s=info(s,{action:'configure',kind:'pipeline',config:{enabled:false}});
 s=info(s,{action:'configure',kind:'meeting',config:{recording:true,mediaPlacement:'local'}});
 s=send(s,'boundaries',{action:'start'});
 const source=contract(s,'source-environment',administration?'administration':'restricted-operations',['archive','recorder','room','local'],administration?'internal':'restricted');
 // A restricted captured item may be in an administrative archive, but must not be declassified by its interface.
 if(administration)source.flows.find(f=>f.resource==='recorder').informationClass='restricted';
 s=bind(s,source);s=bind(s,contract(s,'destination-environment',administration?'training':'restricted-operations',['handover-archive'],administration?'internal':'restricted'));
 return tick(s);
}
function record(s){s=info(s,{action:'book',start:s.clock,end:s.clock+40,attendees:2,event:false,language:'en'});s=info(s,{action:'join',booking:s.information.bookings.at(-1).id});assert.equal(s.lastMeeting.success,true,JSON.stringify(s.lastMeeting.reasons));assert.equal(s.records.at(-1).kind,'recording');assert.equal(s.records.at(-1).origin.complete,true);return s;}
const interfaceCommand=(administration=false)=>({action:'interface',id:'scenario-handover',policyId:administration?'defence-admin-to-training-v1':'defence-restricted-handover-v1',sourceResource:'archive',destinationResource:'handover-archive'});
const transfer=(s,recordId=s.records[0].id)=>info(s,{action:'transfer',interfaceId:'scenario-handover',recordId,role:'supervisor'});

function journey(options={}){let state=record(ready(options));state=tick(info(state,interfaceCommand(!!options.administration)));state=transfer(state);return {options:{scenario:'defence',jurisdiction:options.jurisdiction||'AU'},commands:structuredClone(histories.get(state)),expectedState:state};}
module.exports={send,info,tick,contract,bind,ready,record,interfaceCommand,transfer,journey};
