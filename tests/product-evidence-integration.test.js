const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const market=require('./helpers/market-fixture');

const gov=market.fixtures.find(x=>x.id==='cust-tokyo');
const child=(s)=>market.child(s,gov.id);
const customerCommand=(s,command)=>market.dispatchCustomer(s,gov.id,command);
function setup(){return market.setup({customers:[gov]});}
function provisionProofProfiles(s){
 s=customerCommand(s,{type:'products',command:{action:'start'}});
 s=customerCommand(s,{type:'product-evidence',command:{action:'start'}});
 const profiles=[
  {id:'regional-profile',family:'microsoft:government-clouds',feature:'regional-evidence',dependency:'jurisdiction-evidence',mode:'commercial'},
  {id:'eligible-profile',family:'microsoft:government-clouds',feature:'eligibility-evidence',dependency:'eligibility-evidence',mode:'gcc-high'},
  {id:'lifecycle-profile',family:'cisco:government',feature:'lifecycle-evidence',dependency:'lifecycle-evidence',mode:'sovereign-infrastructure'}
 ];
 for(const p of profiles) s=customerCommand(s,{type:'products',command:{action:'offer',offer:{id:`offer-${p.id}`,family:p.family,edition:'scenario',unit:'seat',quantity:2,features:[p.feature],dependencies:{[p.dependency]:'phone'}}}});
 s=market.dispatch(s,{type:'advance',minutes:1});
 for(const p of profiles){s=customerCommand(s,{type:'products',command:{action:'deploy',id:p.id,offer:`offer-${p.id}`,productVersion:'scenario-1',mode:p.mode,region:child(s).jurisdiction,features:[p.feature],dependencies:{[p.dependency]:'phone'},bindings:[]}});s=customerCommand(s,{type:'product-evidence',command:{action:'request',id:`evidence-${p.id}`,deploymentId:p.id,feature:p.feature,dependency:p.dependency,resourceId:'phone'}});}
 return {s,profiles};
}
function childEvidence(s,id){return child(s).productEvidence.requests.find(x=>x.id===id);}

test('AC-SOC-294 shared dispatch provisions qualification, boundary, and lifecycle evidence only for their real scoped inputs',()=>{
 let {s,profiles}=provisionProofProfiles(setup());assert.equal(child(s).business.qualifications['orchard-msp'].government>child(s).clock,true);
 assert.equal(child(s).boundaries.bindings.phone,`flow-${gov.id}`);assert.equal(child(s).boundaries.contracts.find(x=>x.id===`flow-${gov.id}`).provisioning.status,'ready');
 s=market.dispatch(s,{type:'advance',minutes:1});
 for(const p of profiles){const row=childEvidence(s,`evidence-${p.id}`);assert.equal(row.provisioning.status,'ready',JSON.stringify(row));assert.equal(row.effective.synthetic,true);assert.equal(row.effective.externalApprovalClaim,false);const availability=SOC.calculate(child(s)).productEvidence.requests.find(x=>x.id===row.id).availability;assert.equal(availability.ready,true,JSON.stringify(availability));}
 assert.ok(childEvidence(s,'evidence-regional-profile').effective.source.boundary.contractId);
 assert.ok(childEvidence(s,'evidence-eligible-profile').effective.source.qualification.eventId);
 assert.ok(childEvidence(s,'evidence-lifecycle-profile').effective.source.lifecycle.offerId);
 SOC.validateState(s);
});

test('AC-SOC-295 proof availability follows scope change, explicit revocation, expiry, save restore, and worker dispatch',()=>{
 let {s}=provisionProofProfiles(setup());const before=structuredClone(s),command={type:'advance',minutes:1},box={postMessage:r=>box.result=r};vm.createContext(box);vm.runInContext(SOC.workerSource(),box);box.onmessage({data:{id:1,state:before,command}});const worker=JSON.parse(JSON.stringify(box.result.state));s=SOC.dispatch(s,command);assert.deepEqual(worker,s);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);SOC.validateState(s);
 const get=()=>SOC.calculate(child(s)).productEvidence.requests.find(x=>x.id==='evidence-regional-profile').availability;
 assert.equal(get().ready,true);
 s=customerCommand(s,{type:'products',command:{action:'configure',id:'regional-profile',config:{productVersion:'scenario-2'}}});s=market.dispatch(s,{type:'advance',minutes:1});assert.notEqual(get().ready,true,'deployment generation/version changes stale the prior proof');
 s=customerCommand(s,{type:'product-evidence',command:{action:'revoke',id:'evidence-eligible-profile',reason:'evidence-withdrawn'}});assert.equal(childEvidence(s,'evidence-eligible-profile').revocationReason,'evidence-withdrawn');
 s=market.dispatch(s,{type:'advance',minutes:60});assert.equal(get().ready,false,'effective evidence expires on the saved synthetic clock');SOC.validateState(s);
});
