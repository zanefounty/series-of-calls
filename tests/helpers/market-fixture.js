const SOC=require('../../src/game/55-communications.js');

const fixtures=[
 {id:'cust-sydney',tenant:'tenant-sydney',market:'au-sydney',scenario:'smb'},
 {id:'cust-melbourne',tenant:'tenant-melb',market:'au-melbourne',scenario:'smb'},
 {id:'cust-seattle',tenant:'tenant-seattle',market:'us-seattle',scenario:'enterprise'},
 {id:'cust-tokyo',tenant:'tenant-tokyo',market:'jp-tokyo',scenario:'government'},
 {id:'cust-dublin',tenant:'tenant-dublin',market:'eu-dublin',scenario:'defence'}
];
const hooks={
 validatePortfolio:s=>{SOC.validateState(s);return true;},
 resourceReady:(s,id)=>SOC.observe(s,id),
 integrationStatus:(s,id)=>SOC.products.compatibilityStatus(s,id),
 boundaryAssessment:(root,id)=>{const c=root.boundaries?.contracts.find(x=>x.id===id),result=SOC.boundaries.evaluate(root,id),enforcement=SOC.calculate(root).boundaries?.enforcement||{};return {...result,eligible:result.eligible===true&&!!c?.effective?.flows?.length&&c.effective.flows.every(f=>root.boundaries.bindings[f.resource]===id&&enforcement[f.resource]?.eligible===true)};}
};
const dispatch=(s,c)=>SOC.dispatch(s,c);
const child=(s,id)=>s.portfolio.customers.find(x=>x.id===id).root;
const dispatchCustomer=(s,id,command)=>dispatch(s,{type:'portfolio',command:{action:'dispatchcustomer',customerId:id,command}});
function boundaryConfig(root,id){const region=root.jurisdiction,local=root.scenario==='defence',regions=['AU','US','JP','EU'];const one=['AU','JP','EU'].includes(region)?[region]:regions,resources=['identity','access','phone','carrier','desk','people','service','cases',...(['enterprise','government'].includes(root.scenario)?['recorder','archive']:[]),...(root.scenario==='government'?['speech']:[])];return {id,workload:'market-service',profile:region,sensitivity:'confidential',edition:local?'local':'standard',productVersion:'release-1',offeringEvidence:region==='US'?'eligible':'pending',customerAuthorization:'approved',agencyAuthorizationRequired:false,agencyAuthorization:'not-required',serviceRegistration:region==='JP'?'registered':'not-registered',serviceRegistrationId:region==='JP'?'jp-registration':null,usesAi:false,aiUseDecision:'not-required',language:region==='JP'?'ja':'en',supportLanguage:region==='JP'?'ja':'en',requirements:{processingRegions:one,storageRegions:one,backupRegions:one,keyRegions:one,adminRegions:one,supportRegions:one,allowedAccessRoles:['agent','supervisor'],adminAuthorization:'customer-approved',continuity:local?'local':'cloud',allowedTransferMechanisms:[]},flows:resources.map(resource=>({id:`customer-${resource}`,resource,informationClass:'confidential',processingRegions:one,storageRegions:one,backupRegions:one,keyCustodyRegions:one,adminLocations:one,supportRegions:one,adminAuthorization:'customer-approved',accessRoles:['agent','supervisor'],connectivity:local?'hybrid':'cloud',continuity:local?'local':'cloud',licenceMode:local?'local-grace':'cloud',transfer:{parties:[],mechanism:null}}))};}
function setup({customers=fixtures.slice(0,3),productsFor=[],roleByCustomer={},viaCustomers=[]}={}){
 let s=SOC.create({scenario:'smb',mode:'assessed'});s=dispatch(s,{type:'portfolio',command:{action:'start'}});
 for(const c of customers)s=dispatch(s,{type:'portfolio',command:{action:'addcustomer',...c,name:c.id}});
 for(const c of customers){const root=child(s,c.id),employer=roleByCustomer[c.id]||'orchard-msp';s=dispatchCustomer(s,c.id,{type:'business',command:{action:'start'}});const local=root.scenario==='defence';if(local){s=dispatchCustomer(s,c.id,{type:'configure',id:'access',config:{local:true}});s=dispatchCustomer(s,c.id,{type:'configure',id:'carrier',config:{enabled:true,capacity:4,signalling:true,mediaOut:true,mediaIn:true,local:true,region:root.jurisdiction}});s=dispatchCustomer(s,c.id,{type:'connect',connected:true});}else s=dispatchCustomer(s,c.id,{type:'configure',id:'carrier',config:{enabled:true,capacity:4,signalling:true,mediaOut:true,mediaIn:true,local:false,region:root.jurisdiction}});s=dispatchCustomer(s,c.id,{type:'configure',id:'people',config:{people:2,entitlements:2,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:2}});s=dispatchCustomer(s,c.id,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'service'}]}});s=dispatchCustomer(s,c.id,{type:'workforce',command:{action:'start'}});s=dispatchCustomer(s,c.id,{type:'workforce',command:{action:'roster',people:[{id:'support-agent',employer,skills:['service','support'],languages:['en','ja'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:2,entitlements:['seat-01']} ]}});if(productsFor.includes(c.id))s=dispatchCustomer(s,c.id,{type:'products',command:{action:'start'}});}
 // Configure the roots with authentic scenario reference actions and allow resource provisioning.
 s=dispatch(s,{type:'advance',minutes:1});
 for(const c of customers)for(const command of SOC.reference(child(s,c.id))){if(command.type==='advance')s=dispatch(s,{type:'advance',minutes:command.minutes});else s=dispatchCustomer(s,c.id,command);}
 for(const c of customers)if(['government','defence'].includes(c.scenario))s=dispatchCustomer(s,c.id,{type:'business',command:{action:'qualify',sector:c.scenario}});
 for(const c of customers)s=dispatchCustomer(s,c.id,{type:'configure',id:'people',config:{people:2,entitlements:2,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:2}});
 for(const c of customers)if(c.scenario==='defence')s=dispatchCustomer(s,c.id,{type:'connect',connected:true});
 for(const c of customers){const root=child(s,c.id),local=root.scenario==='defence',cfg=boundaryConfig(root,`flow-${c.id}`);s=dispatchCustomer(s,c.id,{type:'boundaries',command:{action:'start'}});s=dispatchCustomer(s,c.id,{type:'boundaries',command:{action:'contract',contract:cfg}});for(const flow of cfg.flows)s=dispatchCustomer(s,c.id,{type:'boundaries',command:{action:'bind',resource:flow.resource,contract:`flow-${c.id}`}});const region=root.jurisdiction;s=dispatchCustomer(s,c.id,{type:'boundaries',command:{action:'observe',contract:`flow-${c.id}`,observed:{connected:true,cloudLicenceAvailable:!local,localLicenceGraceActive:local,localLicenceGraceExpiresAt:local?10000:null,localServicesAvailable:local,localKeyCustodyAvailable:local,adminPathAvailable:true,adminPathLocation:region}}});}
 s=dispatch(s,{type:'advance',minutes:1});
 for(const c of customers){const supportOwner=roleByCustomer[c.id]||'orchard-msp';s=dispatchCustomer(s,c.id,{type:'business',command:{action:'order',offer:'access',quantity:10,unit:'Mbps',currency:'AUD',resources:['access'],customer:'customer',supportOwner,price:5000,sell:true,...(viaCustomers.includes(c.id)?{via:'branch-distribution'}:{})}});if(productsFor.includes(c.id)){s=dispatchCustomer(s,c.id,{type:'products',command:{action:'offer',offer:{id:'phone-offer',family:'microsoft:workplace-phone',edition:'scenario-edition',unit:'seat',quantity:20,features:['telephony'],dependencies:{identity:'identity'}}}});s=dispatchCustomer(s,c.id,{type:'products',command:{action:'offer',offer:{id:'suite-offer',family:'cisco:suite-calling',edition:'scenario-edition',unit:'seat',quantity:20,features:['multitenant-calling'],dependencies:{identity:'identity',carrier:'carrier'}}}});}}
 if(productsFor.length){s=dispatch(s,{type:'advance',minutes:1});for(const id of productsFor){s=dispatchCustomer(s,id,{type:'products',command:{action:'deploy',id:'phone-deployment',offer:'phone-offer',productVersion:'scenario-1',mode:'multitenant',region:child(s,id).jurisdiction,bindings:[{feature:'telephony',resources:['phone']}]}});s=dispatchCustomer(s,id,{type:'products',command:{action:'deploy',id:'suite-deployment',offer:'suite-offer',productVersion:'scenario-1',mode:'multitenant',region:child(s,id).jurisdiction}});}s=dispatch(s,{type:'advance',minutes:1});for(const id of productsFor){s=dispatchCustomer(s,id,{type:'products',command:{action:'integration',id:'suite-to-phone',source:'suite-deployment',target:'phone-deployment',features:[{sourceFeature:'multitenant-calling',targetFeature:'telephony'}]}});s=dispatchCustomer(s,id,{type:'products',command:{action:'test-integration',id:'suite-to-phone'}});}}
 s=dispatch(s,{type:'advance',minutes:2});return s;
}
function startPack(s){return dispatch(s,{type:'market-qualification',command:{action:'start'}});}
function open(s,qualification){return dispatch(s,{type:'market-qualification',command:{action:'open-window',qualification}});}
function tick(s,n=1){for(let i=0;i<n;i++)s=dispatch(s,{type:'advance',minutes:1});return s;}
function addContinuityEvidence(s,customerIds){
 for(const id of customerIds){s=dispatchCustomer(s,id,{type:'transport',command:{action:'start'}});for(const command of [
  {action:'site',id:'origin',config:{name:'Synthetic origin',region:'AU',domain:'origin-site'}},{action:'site',id:'destination',config:{name:'Synthetic service',region:'AU',domain:'service-site'}},
  {action:'link',id:'path-a',config:{from:'origin',to:'destination',mode:'owned',capacityMbps:10,latencyMs:20,domain:'failure-domain-a',leadMinutes:1,setupCents:0,periodCents:0,contract:null}},
  {action:'link',id:'path-b',config:{from:'origin',to:'destination',mode:'owned',capacityMbps:10,latencyMs:40,domain:'failure-domain-b',leadMinutes:1,setupCents:0,periodCents:0,contract:null}},
  {action:'bind',resource:'identity',site:'origin'},{action:'bind',resource:'service',site:'destination'},{action:'bind',resource:'desk',site:'destination'}])s=dispatchCustomer(s,id,{type:'transport',command});
  s=dispatchCustomer(s,id,{type:'service-observation',command:{action:'start'}});
 }
 s=dispatch(s,{type:'advance',minutes:1});
 for(const id of customerIds)s=dispatchCustomer(s,id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:`continuity-${id}`,language:'en'});
 s=dispatch(s,{type:'advance',minutes:2});
 s=dispatch(s,{type:'advance',minutes:1});
 for(const id of customerIds)s=dispatchCustomer(s,id,{type:'service-observation',command:{action:'open-window',goal:'rd'}});
 for(const id of customerIds)s=dispatchCustomer(s,id,{type:'service-observation',command:{action:'inject-incident'}});
 s=dispatch(s,{type:'advance',minutes:1});
 for(const id of customerIds)s=dispatchCustomer(s,id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:`continuity-${id}`,language:'en'});
 s=dispatch(s,{type:'advance',minutes:2});
 for(const id of customerIds)s=dispatchCustomer(s,id,{type:'service-observation',command:{action:'recover-incident'}});
 for(const id of customerIds)s=dispatchCustomer(s,id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:`continuity-${id}`,language:'en'});
 s=dispatch(s,{type:'advance',minutes:2});
 for(const id of customerIds)s=dispatchCustomer(s,id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:`continuity-${id}`,language:'en'});
 return dispatch(s,{type:'advance',minutes:5});
}
module.exports={SOC,fixtures,hooks,dispatch,child,dispatchCustomer,setup,startPack,open,tick,addContinuityEvidence};
