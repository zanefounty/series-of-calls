"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const AUTH=require('../src/game/23-provider-configuration-authority');
const cid='starter-customer';
const child=s=>s.portfolio.customers.find(c=>c.id===cid).root;
const customer=s=>s.providerCampaign.customers.find(c=>c.id===cid);
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});}
function until(s,predicate){for(let n=0;n<80&&!predicate(s);n++)s=SOC.dispatch(s,{type:'advance',minutes:1});assert.ok(predicate(s));return s;}
const at=(s,id,t)=>AUTH.configurationAt(s.providerCampaign,customer(s),child(s),id,t,{catalogue:SOC.catalogue});
test('historical paid configuration preserves unchanged BPO and repair dependencies without accepting forged writes',()=>{
 let s=SOC.create({experience:'campaign',seed:73});
 for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:cid})});s=until(s,x=>customer(x).stages[stage].status==='effective');}
 const openingAt=s.clock,oldService=at(s,'service',openingAt),oldPeople=at(s,'people',openingAt),oldCarrier=at(s,'carrier',openingAt);
 s=buy(s,{action:'operation',operationId:'bpo',customerId:cid});s=until(s,x=>x.providerCampaign.projects.find(p=>p.operationId==='bpo')?.status==='complete');
 const bpo=s.providerCampaign.projects.find(p=>p.operationId==='bpo');
 assert.equal(bpo.expectedGenerations.service,oldService.generation,'unchanged queue dependency is recorded alongside the workforce write');
 assert.deepEqual(at(s,'service',bpo.configSubmittedAt),oldService);
 assert.equal(at(s,'people',bpo.configSubmittedAt).generation,oldPeople.generation+1);
 s=until(s,x=>x.providerCampaign.incidents.some(i=>i.status==='active'));
 const incident=s.providerCampaign.incidents.find(i=>i.status==='active');assert.equal(incident.resource,'carrier');
 s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
 s=buy(s,{action:'operation',operationId:'repair',customerId:cid});s=until(s,x=>x.providerCampaign.projects.find(p=>p.operationId==='repair')?.status==='complete');
 const repair=s.providerCampaign.projects.find(p=>p.operationId==='repair');
 const before=JSON.stringify(s);assert.deepEqual(at(s,'carrier',repair.configSubmittedAt),oldCarrier);assert.deepEqual(at(s,'service',openingAt),oldService);assert.equal(JSON.stringify(s),before,'historical reads are pure');assert.deepEqual(SOC.restore(before),s);
 for(const minute of [openingAt,bpo.configSubmittedAt,repair.configSubmittedAt,s.clock]){const read=AUTH.configurationReaderAt(s.providerCampaign,customer(s),child(s),minute,{catalogue:SOC.catalogue});for(const id of Object.keys(child(s).resources))assert.deepEqual(read(id),at(s,id,minute));const value=read('carrier');value.config.enabled=!value.config.enabled;assert.deepEqual(read('carrier'),at(s,'carrier',minute),'caller mutation cannot poison the shared historical projection');assert.equal(read('nonexistent'),null);assert.throws(()=>read(null),/READ_TIME/);}
 assert.equal(JSON.stringify(s),before,'shared readers never change paid simulation state');
 for(const generation of [0,oldService.generation-1,child(s).resources.service.generation+1]){const forged=structuredClone(s);forged.providerCampaign.projects.find(p=>p.id===bpo.id).expectedGenerations.service=generation;assert.throws(()=>at(forged,'service',forged.clock),/INVALID_PROVIDER_CONFIG_AUTHORITY:GENERATION/);}
 const forged=structuredClone(s);forged.providerCampaign.projects.find(p=>p.id===bpo.id).expectedGenerations.people=oldPeople.generation;assert.throws(()=>at(forged,'people',forged.clock),/INVALID_PROVIDER_CONFIG_AUTHORITY:GENERATION/,'an actual workforce write must advance its generation');
});


test('historical migration uses the parent version and distinguishes coexistence dependencies from a consolidated write',()=>{
 for(const operationId of ['migration','migration-consolidated']){
  let s=SOC.create({experience:'campaign',scenario:'enterprise',seed:73});
  for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:cid})});s=until(s,x=>customer(x).stages[stage].status==='effective');}
  const beforePhone=at(s,'phone',s.clock),beforeDesk=at(s,'desk',s.clock);
  s=buy(s,{action:'operation',operationId,customerId:cid});
  s=until(s,x=>x.providerCampaign.projects.find(p=>p.operationId===operationId)?.configSubmittedAt!=null);
  const project=s.providerCampaign.projects.find(p=>p.operationId===operationId),phone=at(s,'phone',project.configSubmittedAt);
  assert.deepEqual(at(s,'desk',project.configSubmittedAt),beforeDesk,'migration scheduling does not configure the existing endpoint');
  if(operationId==='migration')assert.deepEqual(phone,beforePhone,'coexistence preserves the existing platform');
  else{assert.equal(phone.generation,beforePhone.generation+1);assert.equal(phone.config.deployment,'dedicated');assert.equal(phone.config.extensionScope,'site');}
  assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
  const forged=structuredClone(s);forged.providerCampaign.projects.find(p=>p.id===project.id).expectedGenerations.phone=operationId==='migration'?beforePhone.generation-1:beforePhone.generation;
  assert.throws(()=>at(forged,'phone',project.configSubmittedAt),/INVALID_PROVIDER_CONFIG_AUTHORITY:GENERATION/);
 }
});
