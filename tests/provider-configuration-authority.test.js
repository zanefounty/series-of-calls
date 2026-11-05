'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer',child=s=>s.portfolio.customers[0].root;
const rejected=/INVALID_PROVIDER_(?:RESOURCE|PRODUCT|CONFIG|INCIDENT).*AUTHORITY/;
function buy(s,command){const q=SOC.provider.quote(s,command);assert.deepEqual(q.blockers,[],JSON.stringify({command,blockers:q.blockers}));return SOC.dispatch(s,{type:'provider',command:{...command,quoteRevision:q.atRevision}});}
function minute(s,repair=true){const i=s.providerCampaign.incidents.find(i=>i.status==='active');if(i&&repair){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:i.id}});s=buy(s,{action:'operation',operationId:'repair',customerId});}return SOC.dispatch(s,{type:'advance',minutes:1});}
function advance(s,to,repair=true){while(s.clock<to)s=minute(s,repair);return s;}
function opening(stages=['base'],extra={}){let s=SOC.create({experience:'campaign',seed:73,...extra});for(const stage of stages){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});while(s.providerCampaign.customers[0].stages[stage].status!=='effective')s=minute(s);}return s;}
function rejectsExportEdit(original,mutate){const saved=JSON.stringify(original);assert.deepEqual(SOC.restore(saved),original,'the legitimately dispatched original must restore');const modified=JSON.parse(saved);mutate(child(modified),modified);assert.deepEqual(modified.business,original.business,'this attack does not invent money or ledger postings');assert.deepEqual(modified.providerCampaign.projects,original.providerCampaign.projects,'this attack does not invent paid projects');assert.throws(()=>SOC.restore(JSON.stringify(modified)),rejected);assert.equal(JSON.stringify(original),saved,'rejected import preserves its exportable original');}

test('Provider restore rejects enabling an unpaid room despite structurally valid unchanged resource generations',()=>{
 const s=opening();assert.equal(s.providerCampaign.projects.some(p=>p.operationId==='room'),false);assert.equal(SOC.observe(child(s),'room').ready,false);
 rejectsExportEdit(s,c=>{c.resources.room.desired.enabled=true;c.resources.room.effective.enabled=true;});
});

test('Provider restore rejects extra identity entitlements and registered endpoints without a funded blueprint',()=>{
 const s=opening();rejectsExportEdit(s,c=>{for(const layer of ['desired','effective']){c.resources.identity[layer].identities.push('unpaid-person');c.resources.identity[layer].entitled.push('unpaid-person');}const desk=structuredClone(c.resources.desk);desk.id='unpaid-desk';for(const layer of ['desired','effective']){desk[layer].identity='unpaid-person';desk[layer].number='+61255500777';desk[layer].extension='777';}c.resources[desk.id]=desk;});
});

test('Provider restore rejects an extra workforce resource and queue dependency that evade canonical numeric resource IDs',()=>{
 const s=advance(opening(['base','carrier','partner'],{openingVariant:'peak-window'}),60);assert.equal(s.providerCampaign.projects.some(p=>p.operationId==='bpo'),false);
 rejectsExportEdit(s,c=>{const crew=structuredClone(c.resources.people);crew.id='unpaid-crew';for(const layer of ['desired','effective']){crew[layer].people=20;crew[layer].entitlements=20;c.resources.service[layer].workforce=crew.id;}c.resources[crew.id]=crew;});
});

test('Provider restore rejects clearing an actual carrier incident without its paid response lineage',()=>{
 let s=opening(['base','carrier','partner']);while(!s.providerCampaign.incidents.some(i=>i.status==='active'))s=minute(s,false);const incident=s.providerCampaign.incidents.find(i=>i.status==='active');assert.equal(incident.resource,'carrier');assert.equal(child(s).resources.carrier.fault,'OUTAGE');assert.equal(incident.acknowledgedAt,null);assert.equal(s.providerCampaign.projects.some(p=>p.operationId==='repair'),false);
 rejectsExportEdit(s,c=>{c.resources.carrier.fault=null;});
});

test('Provider restore rejects a current product deployment transplanted from a paid donor without the recipient purchase',()=>{
 const ready=opening(['base','carrier','partner']);let donor=buy(structuredClone(ready),{action:'operation',operationId:'ms-workplace-calling',customerId});donor=advance(donor,60);const recipient=advance(ready,60),paid=donor.providerCampaign.projects.find(p=>p.operationId==='ms-workplace-calling');assert.equal(paid.status,'complete');assert.ok(donor.business.ledger.some(e=>e.id===paid.postingId&&e.cents===paid.setupCents));assert.deepEqual(SOC.restore(JSON.stringify(donor)),donor);assert.equal(recipient.providerCampaign.projects.some(p=>p.productId==='ms-workplace-calling'),false);
 rejectsExportEdit(recipient,c=>{c.products=structuredClone(child(donor).products);});
});
