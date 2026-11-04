// Public synthetic commands only. Importing this helper registers no tests.
const SOC=require('../../src/game/55-communications');
const histories=new WeakMap();
function apply(s,command){const next=SOC.dispatch(s,command);histories.set(next,[...(histories.get(s)||[]),structuredClone(command)]);return next;}
const send=(s,type,command)=>apply(s,{type,command});
const offer=(s,action,fields={})=>send(s,'workforce-offers',{action,...fields});
const tick=(s,minutes=1)=>apply(s,{type:'advance',minutes});
const forecast=Object.freeze({channel:'voice',skill:'service',language:'en',horizon:60,method:'mean'});
const integration=s=>({id:'queueberry-wfm-workforce',tenant:s.workforceOffers?.tenant||s.tenant,offerId:'queueberry-wfm-standard',offerVersion:'1.0',resource:'people'});
function base(scenario='enterprise',operator='player',{tenant='wfm-customer',jurisdiction='AU'}={}){
 let s=SOC.create({scenario,jurisdiction,...(tenant===null?{}:{tenant})});histories.set(s,[]);
 for(const c of SOC.reference(s))s=apply(s,c);
 s=apply(s,{type:'configure',id:'people',config:{operator,people:2,entitlements:2,skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440}});
 s=apply(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'service'}]}});
 s=tick(s);s=send(s,'business',{action:'start'});s=send(s,'workforce',{action:'start'});return tick(s);
}
function pending(s=base(),units=1){s=offer(s,'start');s=offer(s,'order',{tenant:s.workforceOffers.tenant,units});return offer(s,'integrate',integration(s));}
function observed(s,available=true){return offer(s,'observe-integration',{supplierAvailable:true,applicationAvailable:available});}
function licensed(s=base(),units=1){s=tick(pending(s,units));s=observed(s);s=offer(s,'test-integration');return offer(s,'bind-person',{person:'agent-01'});}
function calls(s){for(const caseId of ['wfm-first','wfm-second'])s=apply(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId});s=tick(s);return tick(s,6);}
function journey({tenant,jurisdiction='AU',units=1,variant='recovery',includeCalls=true,includeBilling=true}={}){
 if(!['success','recovery'].includes(variant)||!Number.isInteger(units)||units<1||units>100)throw new Error('INVALID_WORKFORCE_OFFER_FIXTURE_OPTIONS');
 const options={scenario:'enterprise',jurisdiction,...(tenant===undefined?{}:{tenant})};let s=tick(pending(base('enterprise','player',{...options,tenant:tenant===undefined?null:tenant}),units));
 if(variant==='recovery'){s=offer(s,'observe-integration',{supplierAvailable:false,applicationAvailable:true});s=offer(s,'test-integration');}
 s=observed(s);s=offer(s,'test-integration');s=offer(s,'bind-person',{person:'agent-01'});
 if(units>1)s=offer(s,'bind-person',{person:'agent-02'});
 s=send(s,'workforce',{action:'arrival',channel:'voice',skill:'service',language:'en',count:40,sampleMinutes:60});
 s=send(s,'workforce',{action:'staffing-forecast',...forecast});s=offer(s,'forecast',forecast);
 if(includeCalls)s=calls(s);
 if(includeBilling){s=tick(s,s.workforceOffers.nextInvoiceAt-s.clock);s=offer(s,'order',{tenant:s.workforceOffers.tenant,units:0});s=tick(s,s.workforceOffers.nextInvoiceAt-s.clock);}
 return {fixtureOptions:{...(tenant===undefined?{}:{tenant}),jurisdiction,units,variant,includeCalls,includeBilling},options,commands:structuredClone(histories.get(s)),expectedState:s};
}
module.exports={SOC,apply,send,offer,tick,forecast,integration,base,pending,observed,licensed,calls,journey};
