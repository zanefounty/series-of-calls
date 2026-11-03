const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications');
const pack=(s,type,action,fields={})=>E.dispatch(s,{type,command:{action,...fields}});
const tick=(s,minutes=1)=>E.dispatch(s,{type:'advance',minutes});
function fixture(){
 let s=E.create();s=E.reference(s).reduce(E.dispatch,s);
 s=pack(s,'business','start');s=pack(s,'customer-needs','start');
 s=pack(s,'customer-needs','select',{id:'smb-needs',segment:'smb'});
 s=pack(s,'customer-needs','configure',{id:'smb-needs',section:'scale',value:{employees:35,sites:1,seats:0,agents:2,rooms:0}});
 return tick(s);
}
const order=s=>pack(s,'business','order',{offer:'contact',quantity:2,unit:'agent',currency:'AUD',resources:['service','people'],sell:true,customerProfile:'smb-needs'});
test('AC-SOC-462 explicit customer profile binding rejects pending, wrong-segment and non-retail scope atomically',()=>{
 let s=fixture();const original=JSON.stringify(s);
 const fields={offer:'contact',quantity:2,unit:'agent',currency:'AUD',resources:['service','people'],sell:true,customerProfile:'missing'};
 assert.throws(()=>pack(s,'business','order',fields),/CUSTOMER_PROFILE_SCOPE_REQUIRED/);
 assert.throws(()=>pack(s,'business','order',{...fields,customerProfile:'smb-needs',sell:false}),/CUSTOMER_PROFILE_SCOPE_REQUIRED/);
 assert.equal(JSON.stringify(s),original);
 s=pack(s,'customer-needs','select',{id:'enterprise-needs',segment:'enterprise'});
 assert.throws(()=>pack(s,'business','order',{...fields,customerProfile:'enterprise-needs'}),/CUSTOMER_PROFILE_SCOPE_REQUIRED/);
 s=tick(s);assert.throws(()=>pack(s,'business','order',{...fields,customerProfile:'enterprise-needs'}),/CUSTOMER_PROFILE_SCOPE_REQUIRED/);
 s=order(s);assert.equal(s.business.contracts[0].customerProfile,'smb-needs');
 assert.equal(s.business.contracts[0].customerProfileGeneration,s.customerNeeds.profiles[0].effective.generation);
});
test('AC-SOC-463 measured customer capacity shortfall blocks renewal, provisioned requirement repair recovers without rewriting invoices',()=>{
 let s=order(fixture());s=tick(s,180);const c=s.business.contracts[0],billed=c.billedRetail;
 assert.equal(c.status,'renewal');
 s=pack(s,'customer-needs','configure',{id:'smb-needs',section:'scale',value:{employees:35,sites:1,seats:0,agents:3,rooms:0}});s=tick(s);
 const original=JSON.stringify(s);assert.throws(()=>pack(s,'business','renew',{contract:c.id}),/CUSTOMER_FIT_RENEWAL_BLOCKED/);assert.equal(JSON.stringify(s),original);
 s=pack(s,'customer-needs','configure',{id:'smb-needs',section:'scale',value:{employees:35,sites:1,seats:0,agents:2,rooms:0}});
 assert.throws(()=>pack(s,'business','renew',{contract:c.id}),/CUSTOMER_FIT_RENEWAL_BLOCKED/,'desired repair is not effective');
 s=tick(s);s=pack(s,'business','renew',{contract:c.id});
 assert.equal(s.business.contracts[0].status,'provisioning');assert.equal(s.business.contracts[0].billedRetail,billed);
 assert.equal(s.business.contracts[0].customerProfileGeneration,s.customerNeeds.profiles[0].effective.generation);
 s=tick(s);assert.equal(s.business.contracts[0].status,'active');assert.deepEqual(E.restore(JSON.stringify(s)),s);
});
test('AC-SOC-464 bound contracts reject forged save scope and reproduce worker command results',()=>{
 const s=fixture(),command={type:'business',command:{action:'order',offer:'contact',quantity:2,unit:'agent',currency:'AUD',resources:['service','people'],sell:true,customerProfile:'smb-needs'}};
 const box={};vm.createContext(box);vm.runInContext(E.workerSource()+';globalThis.engine=SOC;',box);
 const ordered=E.dispatch(s,command);assert.equal(JSON.stringify(box.engine.dispatch(s,command)),JSON.stringify(ordered));
 for(const mutate of [c=>c.customerProfile='missing',c=>c.customerProfileGeneration=999,c=>c.sell=false,c=>delete c.customerProfile]){
  const forged=structuredClone(ordered);mutate(forged.business.contracts[0]);assert.throws(()=>E.restore(JSON.stringify(forged)),/INVALID_CUSTOMER_PROFILE/);
 }
 const stripped=structuredClone(ordered);delete stripped.business.contracts[0].customerProfile;delete stripped.business.contracts[0].customerProfileGeneration;
 assert.throws(()=>E.restore(JSON.stringify(stripped)),/INVALID_CUSTOMER_PROFILE_BINDINGS/);
 delete stripped.business.customerProfileBindings;assert.throws(()=>E.restore(JSON.stringify(stripped)),/INVALID_CUSTOMER_PROFILE_BINDING_LINEAGE/);
 const before=JSON.stringify(ordered);E.calculate(ordered);E.calculate(ordered);assert.equal(JSON.stringify(ordered),before);
});
test('AC-SOC-465 historical availability rejects inconsistent resource summaries, missing dimensions and non-boolean observations',()=>{
 let s=fixture();s=pack(s,'service-observation','start');
 s=E.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});
 s=pack(s,'service-observation','open-window',{goal:'t10'});s=tick(s,15);
 const window=s.serviceObservation.windows[0];assert.equal(window.samples[0].resources.phone,false);
 assert.deepEqual(E.restore(JSON.stringify(s)),s);
 for(const mutate of [
  w=>{for(const sample of w.samples)sample.resourcesReady=true;w.result.checks.resources=true;},
  w=>delete w.samples[0].resources.phone,
  w=>w.samples[0].resources.phone='false'
 ]){const forged=structuredClone(s);mutate(forged.serviceObservation.windows[0]);assert.throws(()=>E.restore(JSON.stringify(forged)),/INVALID_SERVICE_OBSERVATION_SAMPLE/);}
 const repaired=E.dispatch(s,{type:'fault',id:'phone',fault:null});
 assert.deepEqual(E.restore(JSON.stringify(repaired)),repaired,'later repair preserves genuine historical failure');
});
