'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const AUTH=require('../src/game/23-provider-configuration-authority');

const CUSTOMER='starter-customer';
const child=s=>s.portfolio.customers.find(row=>row.id===CUSTOMER).root;
const customer=s=>s.providerCampaign.customers.find(row=>row.id===CUSTOMER);
function command(s,request){const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[]);return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});}
function until(s,predicate,limit=80){for(let n=0;n<limit&&!predicate(s);n++)s=SOC.dispatch(s,{type:'advance',minutes:1});assert.ok(predicate(s),`condition not reached at minute ${s.clock}`);return s;}
function opening(){
 let s=SOC.create({experience:'campaign',seed:73});
 for(const stage of ['base','carrier','partner'])s=command(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER})});
 return until(s,state=>customer(state).status==='active');
}
function deepFreeze(value,seen=new Set()){
 if(!value||typeof value!=='object'||seen.has(value))return value;
 seen.add(value);for(const child of Object.values(value))deepFreeze(child,seen);return Object.freeze(value);
}

test('AC-SOC-771 historical configuration reads are pure on frozen inputs and return isolated values',()=>{
 const s=opening(),root=child(s),c=customer(s),before=JSON.stringify(s);
 deepFreeze(s);
 for(const at of [0,s.clock]){
  const read=AUTH.configurationReaderAt(s.providerCampaign,c,root,at,{catalogue:SOC.catalogue});
  const first=read('carrier');assert.ok(first);const original=structuredClone(first);
  first.config.routes?.push({prefix:'+999',target:'forged'});
  const provenance=read.provenanceAt('carrier');if(provenance)provenance.writes.push({projectId:'forged',at,generation:999});
  assert.deepEqual(read('carrier'),original,'mutating one returned projection must not alter future reads');
  assert.equal(read('not-a-resource'),null);
 }
 assert.equal(JSON.stringify(s),before,'historical reads leave even frozen simulation inputs unchanged');
});

test('AC-SOC-772 the optimized reader still rejects forged paid-generation evidence',()=>{
 const s=opening(),root=child(s),project=s.providerCampaign.projects.find(row=>row.customerId===CUSTOMER&&row.configSubmittedAt!==null);
 assert.ok(project);
 const forged=structuredClone(s);forged.providerCampaign.projects.find(row=>row.id===project.id).expectedGenerations.phone=root.resources.phone.generation+10;
 const forgedCustomer=customer(forged),forgedRoot=child(forged);
 assert.throws(()=>AUTH.configurationReaderAt(forged.providerCampaign,forgedCustomer,forgedRoot,forgedRoot.clock,{catalogue:SOC.catalogue}).provenanceAt('phone'),/INVALID_PROVIDER_CONFIG_AUTHORITY:GENERATION/);
 assert.equal(SOC.restore(JSON.stringify(s)).revision,s.revision,'the unmodified dispatched save remains restorable');
});
