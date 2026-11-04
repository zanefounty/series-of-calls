const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const A=require('../src/game/33-calling-achievements.js');
const achievementContent=require('../content/calling-achievements.json');
const securityFixture=require('../content/admission-security.json').reference_fixture;

const advance=(s,n=1)=>SOC.dispatch(s,{type:'advance',minutes:n});
const interact=(s,extra={})=>SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'achievement-case',...extra});
function provisions(s){for(const c of SOC.reference(s).filter(x=>x.type==='configure'))s=SOC.dispatch(s,c);s=advance(s);s=SOC.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});return advance(s);}

test('AC-SOC-275 calling goal report is pure, source-scoped and never accepts a raw success assertion',()=>{
 let s=SOC.create();const before=JSON.stringify(s);const report=A.evaluate(s);
 assert.equal(report.pack,A.PACK);assert.equal(report.goals['progress.goal.tr'].status,'incomplete');
 for(const id of A.goalIds)assert.equal(report.goals[id].status,'incomplete');
 assert.equal(JSON.stringify(s),before);assert.equal(A.evidence(s,'progress.goal.scrub'),null);
 assert.deepEqual(A.goalIds,['progress.goal.tr','progress.goal.p5','progress.goal.ca','progress.goal.pn','progress.goal.scrub']);
 assert.deepEqual(achievementContent.runtime,{PACK:A.PACK,VERSION:A.VERSION,goalIds:A.goalIds,sourceIds:A.sourceIds});
 assert.deepEqual(A.sourceIds,A.goalIds,'only preserved mapped source rows are listed as source IDs');
});

test('AC-SOC-276 local speech goal needs retained recording lineage, completed work and effective local dependencies',()=>{
 let s=provisions(SOC.create({scenario:'government'}));
 s=SOC.dispatch(s,{type:'configure',id:'speech',config:{region:'AU',licenceLocal:true,local:true}});
 s=advance(s);s=SOC.dispatch(s,{type:'information',command:{action:'start'}});s=advance(s);
 s=interact(s);assert.equal(s.interactions.at(-1).phase,'connected');assert.equal(s.records.length,0);s=advance(s,3);assert.equal(s.records[0].kind,'recording');assert.equal(A.evaluate(s).goals['progress.goal.ca'].status,'incomplete');
 s=advance(s,12);assert.equal(s.information.jobs[0].status,'complete');
 assert.equal(A.evaluate(s).goals['progress.goal.ca'].status,'ready');
 const proof=A.evidence(s,'progress.goal.ca');assert.equal(proof.kind,'completed-local-speech-processing');assert.equal(A.validateEvidence(s,'progress.goal.ca',proof),true);
 const externalLicence=structuredClone(s);externalLicence.resources.speech.effective.licenceLocal=false;
 assert.equal(A.evidence(externalLicence,'progress.goal.ca'),null);
 const deleted=structuredClone(s);deleted.records.find(r=>r.id===proof.recordingId).deleted=true;
 assert.equal(A.evidence(deleted,'progress.goal.ca'),null);
 const restored=SOC.restore(JSON.stringify(s));assert.deepEqual(A.evidence(restored,'progress.goal.ca'),proof);
 const worker={};vm.createContext(worker);vm.runInContext(SOC.information.source()+SOC.products.source()+SOC.boundaries.source()+A.source()+';globalThis.pack=SOC_CALLING_ACHIEVEMENTS;',worker);
 assert.deepEqual(JSON.parse(JSON.stringify(worker.pack.evidence(structuredClone(s),'progress.goal.ca'))),proof);
});

test('AC-SOC-277 gateway goal cannot pass on configuration or 200 OK alone; both call directions and media are required',()=>{
 let s=provisions(SOC.create());s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:2}});s=advance(s);
 s=SOC.dispatch(s,{type:'operations',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'operations',command:{action:'configure',kind:'carrier',config:{mode:'gateway',provider:'level-tree',planLicensed:true,operatorApproved:true,operatorContract:true,delegation:true,simAssigned:false,mobileEligible:false,sbcCertified:true,tlsTrusted:true,hostnameValid:true,peerAuthenticated:true,codec:'opus'}}});
 s=SOC.dispatch(s,{type:'configure',id:'phone',config:{carrierModel:'gateway'}});
 s=SOC.dispatch(s,{type:'operations',command:{action:'configure',kind:'carrier',config:{mode:'gateway',provider:'level-tree',planLicensed:true,operatorApproved:true,operatorContract:true,delegation:true,simAssigned:false,mobileEligible:false,sbcCertified:true,tlsTrusted:true,hostnameValid:true,peerAuthenticated:true,codec:'opus'}}});
 s=SOC.dispatch(s,{type:'configure',id:'carrier',config:{enabled:true,signalling:true,mediaOut:true,mediaIn:true,capacity:20}});s=advance(s);
 assert.equal(A.evidence(s,'progress.goal.pn'),null);
 const outbound=interact(s);assert.ok(outbound.interactions.at(-1).trace.some(t=>t.code==='200_OK'));
 assert.equal(A.evidence(outbound,'progress.goal.pn'),null);
 const bad=structuredClone(outbound);bad.interactions[0].trace.find(t=>t.code==='MEDIA_PATHS').in=false;
 assert.equal(A.evidence(bad,'progress.goal.pn'),null);
 s=SOC.dispatch(s,{type:'interact',channel:'voice',direction:'outbound',from:'alex',to:'+61255500201',caseId:'gateway-out'});
 s=SOC.dispatch(s,{type:'interact',channel:'voice',direction:'inbound',from:'+12125550199',to:'+61255500201',caseId:'gateway-in'});
 s=advance(s,3);
 const proof=A.evidence(s,'progress.goal.pn');assert.ok(proof);assert.equal(proof.interactions.length,2);
 assert.equal(A.validateEvidence(s,'progress.goal.pn',proof),true);
});

test('AC-SOC-278 external reach needs the owned-number inbound path as well as outbound and a current guest join',()=>{
 let s=SOC.create();s=SOC.dispatch(s,{type:'operations',command:{action:'start'}});s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:2}});s=advance(s);
 const before=SOC.dispatch(s,{type:'information',command:{action:'start'}});s=advance(before);
 s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:2}});s=advance(s);
 s=SOC.dispatch(s,{type:'interact',channel:'voice',direction:'outbound',from:'alex',to:'+61255500201',caseId:'reach-out'});
 assert.equal(A.evidence(s,'progress.goal.tr'),null);
 s=SOC.dispatch(s,{type:'interact',channel:'voice',direction:'inbound',from:'+12125550199',to:'+61255500201',caseId:'reach-in'});
 assert.equal(s.interactions.at(-1).direction,'inbound');assert.equal(A.evidence(s,'progress.goal.tr'),null,'inbound-only and outbound-only fragments need the actual collaboration join');
 s=advance(s,6);
 s=SOC.dispatch(s,{type:'information',command:{action:'book',start:s.clock+1,end:s.clock+20,attendees:2,event:false,language:'en'}});
 const booking=s.information.bookings.at(-1).id;s=advance(s);
 s=SOC.dispatch(s,{type:'information',command:{action:'join',booking}});assert.equal(s.information.bookings.at(-1).lastJoin.success,true);
 s=SOC.dispatch(s,{type:'meeting'});assert.equal(s.lastMeeting.success,true);
 const proof=A.evidence(s,'progress.goal.tr');assert.ok(proof,JSON.stringify({out:s.interactions.map(i=>({id:i.id,direction:i.direction,outcome:i.outcome,phase:i.phase})),booking:s.information.bookings[0],meeting:s.lastMeeting}));assert.equal(proof.inboundProof.trace.some(t=>t.code==='INBOUND_PERMISSION_ACCEPTED'),true);
 assert.equal(A.validateEvidence(s,'progress.goal.tr',proof),true);
 const pruned=structuredClone(s);pruned.interactions=pruned.interactions.filter(i=>![proof.outboundInteraction,proof.inboundInteraction].includes(i.id));assert.equal(A.validateEvidence(pruned,'progress.goal.tr',proof),false,'manual deletion without a full-ring prune cannot preserve historical proof');
 const missingRoute=structuredClone(proof);missingRoute.inboundProof.trace=missingRoute.inboundProof.trace.filter(t=>t.code!=='ORDERED_INBOUND_ROUTE');
 assert.equal(A.validateEvidence(s,'progress.goal.tr',missingRoute),false);
 for(let n=0;n<201;n++)s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:`after-proof-${n}`});
 assert.equal(A.validateEvidence(s,'progress.goal.tr',proof),true,'explicit watermark retains typed proof after actual ring eviction');
 const legacy=structuredClone(s);delete legacy.tracePrunedThrough;
 assert.equal(A.validateEvidence(legacy,'progress.goal.tr',proof),true,'pre-watermark saves retain the bounded full-ring heuristic');
});

test('AC-SOC-350 trace eviction watermark advances only for evicted terminal calls while an older live call remains retained',()=>{
 let s=SOC.dispatch(SOC.create(),{type:'contact',command:{action:'start'}});s=advance(s);s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:1}});s=advance(s);
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'old-active-call'});const active=s.interactions[0];assert.equal(active.phase,'queued');
 for(let n=0;n<201;n++)s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'unknown',to:'+61255509999',caseId:`terminal-${n}`});
 assert.equal(s.interactions.length,200);assert.equal(s.interactions.some(i=>i.id===active.id&&i.phase==='queued'),true);
 const activeSerial=Number(active.id.slice('interaction-'.length));assert.ok(s.tracePrunedThrough>activeSerial);assert.ok(s.tracePrunedThrough<s.nextId);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=structuredClone(s);forged.tracePrunedThrough=forged.nextId;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_TRACE_PRUNE_WATERMARK/);
});

test('AC-SOC-279 five partner-service goal counts distinct current directional tests with supported ownership',()=>{
 let s=SOC.create();s=SOC.dispatch(s,{type:'advance',minutes:1});
 s=SOC.dispatch(s,{type:'business',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'business',command:{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:['phone','carrier','room','recorder','speech'],customer:'customer',supportOwner:'orchard-msp',sell:true}});
 s=SOC.dispatch(s,{type:'products',command:{action:'start'}});s=advance(s);
 const products=(command)=>{s=SOC.dispatch(s,{type:'products',command});};
 const pairs=[
  {left:['microsoft:workplace-phone','telephony','multitenant','phone',{identity:'identity'}],right:['cisco:suite-calling','pstn-supply','multitenant','carrier',{carrier:'carrier'}]},
  {left:['cisco:suite-calling','multitenant-calling','multitenant','phone',{identity:'identity',carrier:'carrier'}],right:['microsoft:workplace-phone','carrier-interconnect','multitenant','carrier',{identity:'identity',carrier:'carrier'}]},
  {left:['microsoft:meetings-rooms','meetings','room-deployment','room',{identity:'identity'}],right:['cisco:meetings-devices','native-join','native-room','room',{identity:'identity',media:'phone'}]},
  {left:['microsoft:meetings-rooms','room-devices','room-deployment','room',{identity:'identity',calendar:'room'}],right:['cisco:meetings-devices','browser-join','native-room','room',{identity:'identity',media:'phone'}]},
  {left:['cisco:contact-center','quality-review','multitenant','recorder',{identity:'identity',recording:'recorder'}],right:['cisco:contact-center','ai-assistance','multitenant','speech',{identity:'identity',processing:'speech'}]}
 ];
 for(let n=0;n<pairs.length;n++){
  const suffix=String(n+1),edge=`service-edge-${suffix}`,deps=[];
  for(const [side,part] of [pairs[n].left,pairs[n].right].entries()){
   const [family,feature,mode,resource,dependencies]=part,offer=`offer-${side}-${suffix}`,deployment=`deployment-${side}-${suffix}`;
   products({action:'offer',offer:{id:offer,family,edition:'scenario',unit:'seat',quantity:1,features:[feature],dependencies}});deps.push({offer,deployment,family,feature,mode,resource});
  }
  s=advance(s);
  for(const d of deps){try{products({action:'deploy',id:d.deployment,offer:d.offer,productVersion:`scenario-${suffix}`,mode:d.mode,region:'AU',bindings:[{feature:d.feature,resources:[d.resource]}]});}catch(error){error.message=`pair-${n+1}/${d.feature}/${d.resource}: ${error.message}`;throw error;}}
  s=advance(s);
  products({action:'integration',id:edge,source:deps[0].deployment,target:deps[1].deployment,features:[{sourceFeature:deps[0].feature,targetFeature:deps[1].feature}]});
  products({action:'test-integration',id:edge});
 }
 const hooks={productBindingAvailable:(state,id,feature,resource)=>SOC.products.bindingStatus(state,id,feature,resource,{
  observeDependency:(root,kind,ref)=>{const o=SOC.observe(root,ref);return {ready:o.ready,generation:root.resources[ref]?.generation};}
 }).available===true};
 const proof=A.evidence(s,'progress.goal.p5',hooks);assert.ok(proof,JSON.stringify({contracts:s.business.contracts,owner:s.business.organisations?.['orchard-msp'],integrations:s.products.integrations.map(e=>({id:e.id,status:e.result?.status,reasons:e.result?.reasons,source:s.products.deployments.find(d=>d.id===e.source)?.effective?.bindings,target:s.products.deployments.find(d=>d.id===e.target)?.effective?.bindings}))}));assert.equal(proof.integrations.length,5);
 const duplicate=structuredClone(s);duplicate.products.integrations[4].id=duplicate.products.integrations[3].id;
 assert.equal(A.evidence(duplicate,'progress.goal.p5',hooks),null);
 const stale=structuredClone(s);stale.products.deployments.find(d=>d.id===stale.products.integrations[0].target).generation++;
 assert.equal(A.evidence(stale,'progress.goal.p5',hooks),null);
});

test('AC-SOC-280 security achievement delegates to the validated three-control engine and requires an actual settled call',()=>{
 let s=SOC.create();s=SOC.dispatch(s,{type:'admission-security',command:{action:'start'}});
 assert.equal(A.evidence(s,'progress.goal.scrub'),null);
 s.admissionSecurity.events.push({kind:'packet-batch',code:'NETWORK_FLOOD_FILTERED'});
 assert.equal(A.evidence(s,'progress.goal.scrub'),null,'an isolated/fabricated filtered-packet observation cannot bypass pack validation');
});

test('AC-SOC-281 security goal passes only after independently configured abuse samples and an actual core settlement',()=>{
 let s=SOC.create();s=SOC.dispatch(s,{type:'admission-security',command:{action:'start'}});
 for(const command of securityFixture.configures)s=SOC.dispatch(s,{type:'admission-security',command});
 s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:2}});s=advance(s);
 s=SOC.dispatch(s,{type:'admission-security',command:securityFixture.packetBatch});
 for(const command of securityFixture.signallingSamples)s=SOC.dispatch(s,{type:'admission-security',command});
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61355500201',caseId:'blocked-destination'});
 assert.equal(s.interactions.at(-1).outcome,'DESTINATION_NOT_ALLOWED');
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'allowed-security-call'});
 const id=s.interactions.at(-1).id;s=advance(s,5);assert.equal(s.interactions.find(i=>i.id===id).phase,'resolved');
 const proof=A.evidence(s,'progress.goal.scrub');assert.ok(proof);assert.equal(proof.assessment.passed,true);
 assert.equal(A.validateEvidence(s,'progress.goal.scrub',proof),true);
 const historical=structuredClone(proof),pruned=structuredClone(s);pruned.interactions=pruned.interactions.filter(i=>i.id!==id);
 assert.equal(A.validateEvidence(pruned,'progress.goal.scrub',historical),false,'manual deletion without a full-ring prune cannot preserve historical proof');
 let ring=structuredClone(s);for(let n=0;n<201;n++)ring=SOC.dispatch(ring,{type:'interact',channel:'message',from:'alex',to:'service',caseId:`security-prune-${n}`});
 assert.equal(ring.interactions.length,200);
 assert.equal(A.validateEvidence(ring,'progress.goal.scrub',historical),true,'a real full-ring eviction preserves the independently reconciled immutable security proof');
 const forged=structuredClone(historical);forged.securityPack.settlements[0].outcome='FAKE_SUCCESS';
 assert.equal(A.validateEvidence(pruned,'progress.goal.scrub',forged),false);
});

test('AC-SOC-282 worker serialization has the same source-scoped pure report',()=>{
 const s=SOC.create(),worker={};vm.createContext(worker);
 vm.runInContext(A.source()+';globalThis.pack=SOC_CALLING_ACHIEVEMENTS;',worker);
 const W=worker.pack;assert.equal(W.PACK,A.PACK);assert.deepEqual(JSON.parse(JSON.stringify(W.goalIds)),A.goalIds);assert.deepEqual(JSON.parse(JSON.stringify(W.sourceIds)),A.sourceIds);
 assert.deepEqual(JSON.parse(JSON.stringify(W.evaluate(s))),A.evaluate(s));
 const saved=A.create(s);assert.equal(A.validatePack(s,saved),true);
 const bad={...saved,sourceIds:['progress.goal.fake']};assert.throws(()=>A.validatePack(s,bad),/INVALID_CALLING_ACHIEVEMENTS_PACK/);
});
