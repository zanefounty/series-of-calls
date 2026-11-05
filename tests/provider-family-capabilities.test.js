'use strict';
/* Exact authored family recipes exercised against real work. Faults/configuration
 * below deliberately belong to Lab fixtures; these do not certify paid campaign
 * UI paths, mission completion, or every capability in a source family.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const {recipes}=require('../src/game/23-provider-products');
const market=require('./helpers/market-fixture');
const send=(s,type,command)=>SOC.dispatch(s,{type,command});
const tick=(s,minutes=1)=>SOC.dispatch(s,{type:'advance',minutes});
const configure=(s,id,config)=>SOC.dispatch(s,{type:'configure',id,config});
function fixture(recipeId,scenario='smb'){
 const recipe=recipes[recipeId];
 let s=SOC.create({experience:'lab',scenario,mode:'sandbox'});
 for(const command of SOC.reference(s).filter(c=>c.type==='configure'))s=SOC.dispatch(s,command);
 s=tick(s);s=send(s,'products',{action:'start'});
 for(const command of recipe.preparation?.commands||[])s=SOC.dispatch(s,command);
 for(const [id,patch] of Object.entries(recipe.quote.config||{}))s=configure(s,id,patch);
 s=tick(s);
 s=send(s,'products',{action:'offer',offer:{id:recipe.id,family:recipe.family,edition:recipe.edition,unit:recipe.unit,quantity:recipe.quantity,features:recipe.features,dependencies:recipe.dependencies}});s=tick(s);
 s=send(s,'products',{action:'deploy',id:`d-${recipe.id}`,offer:recipe.id,productVersion:'scenario-1',mode:recipe.mode,region:s.jurisdiction,features:recipe.features,dependencies:recipe.dependencies,bindings:recipe.bindings});
 if(recipe.preparation?.install){s=send(s,'speech-models',{...recipe.preparation.install,deploymentId:`d-${recipe.id}`,region:s.jurisdiction});s=send(s,'speech-models',recipe.preparation.integrationTest);}
 s=tick(s);
 assert.equal(s.products.deployments.at(-1).provisioning.status,'ready',recipeId+' actual recipe readiness');
 return s;
}
function work(s,caseId,channel='voice'){
 s=SOC.dispatch(s,{type:'interact',channel,from:'alex',to:channel==='message'?'service':'+61255500201',caseId});
 return tick(s,12);
}
const last=s=>s.interactions.at(-1);
const recordsForLast=s=>s.records.filter(r=>r.interaction===last(s).id);
function schedule(s){
 s=send(s,'information',{action:'book',start:s.clock,end:s.clock+3,attendees:2,event:false,language:'en'});
 return send(s,'information',{action:'schedule',booking:s.information.bookings.at(-1).id});
}

for(const recipeId of ['ms-workplace-calling','cisco-suite-calling'])test(`${recipeId}: authored carrier binding delivers duration-bearing voice, blocks carrier loss, and recovers`,()=>{
 let s=fixture(recipeId);s=configure(s,'phone',{routes:[{prefix:'+61',target:'desk'}]});s=tick(s);s=work(s,'family-calling-before');
 assert.equal(last(s).phase,'resolved');assert.equal(last(s).outcome,'CONNECTED');
 assert.ok(last(s).usageMinutes>0,'real conversation has metered duration');
 const deployment=s.products.deployments[0];assert.ok(deployment.effective.bindings.some(b=>b.resources.includes('carrier')));
 s=SOC.dispatch(s,{type:'fault',id:'carrier',fault:'OUTAGE'});s=work(s,'family-calling-carrier-loss');
 assert.equal(last(s).phase,'failed');assert.ok(last(s).trace.some(t=>/CARRIER|PRODUCT/.test(t.code)));
 s=SOC.dispatch(s,{type:'fault',id:'carrier',fault:null});s=work(s,'family-calling-recovered');
 assert.equal(last(s).phase,'resolved');assert.equal(last(s).outcome,'CONNECTED');
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('ms-contact-centre: family seat entitlements do not replace eligible humans or mapped customer context',()=>{
 let s=fixture('ms-contact-centre');s=work(s,'family-cc-before','message');assert.equal(last(s).phase,'resolved');assert.ok(last(s).context);
 s=configure(s,'people',{people:0});s=tick(s);s=work(s,'family-cc-no-people','message');
 assert.notEqual(last(s).phase,'resolved');assert.match(JSON.stringify(last(s)),/WORKFORCE|STAFF|AGENT|PRODUCT/,'bound routing feature requires actual workforce');
 s=configure(s,'people',{people:2});s=configure(s,'cases',{identityMapping:false});s=tick(s);s=work(s,'family-cc-no-context','message');
 assert.notEqual(last(s).phase,'resolved');
 s=configure(s,'cases',{identityMapping:true});s=tick(s);s=work(s,'family-cc-recovered','message');
 assert.equal(last(s).phase,'resolved');assert.ok(last(s).context);assert.equal(last(s).caseId,'family-cc-recovered');
});

for(const [recipeId,dependency,patch,repair] of [
 ['ms-meetings-room','calendar',{calendar:false},{calendar:true}],
 ['cisco-meetings-interoperability','interop',{interop:false},{interop:true}]
])test(`${recipeId}: actual room session depends on ${dependency} and a failed join cannot become delivered work`,()=>{
 let s=fixture(recipeId,'enterprise');s=send(s,'information',{action:'start'});s=tick(s);s=schedule(s);
 assert.equal(s.information.meetingSessions.at(-1).status,'active');s=tick(s,3);
 assert.equal(s.information.meetingSessions.at(-1).status,'completed');assert.equal(s.information.meetingSessions.at(-1).endedAt-s.information.meetingSessions.at(-1).startedAt,3);
 s=configure(s,'room',patch);s=tick(s);
 if(dependency==='calendar')assert.throws(()=>schedule(s),/CALENDAR_AUTHORISATION/,'calendar refusal must occur before reserving a room');
 else {s=schedule(s);assert.equal(s.information.meetingSessions.at(-1).status,'failed');assert.ok(s.information.meetingSessions.at(-1).reasons.length);s=tick(s,3);}
 s=configure(s,'room',repair);s=tick(s);s=schedule(s);s=tick(s,3);
 assert.equal(s.information.meetingSessions.at(-1).status,'completed');
 assert.equal(s.information.meetingSessions.filter(x=>x.status==='completed').length,2,'failed session is not retroactively delivered');
});

test('cisco-contact-centre: AI assistance uses consented capture and retains a missing-capture obligation',()=>{
 let s=fixture('cisco-contact-centre','government');s=work(s,'family-ai-before');
 assert.ok(recordsForLast(s).some(r=>r.kind==='recording'));assert.ok(recordsForLast(s).some(r=>r.kind==='transcription'));
 s=configure(s,'recorder',{consent:false});s=tick(s);s=work(s,'family-ai-no-consent');
 assert.equal(recordsForLast(s).some(r=>r.kind==='recording'),false);assert.equal(recordsForLast(s).some(r=>r.kind==='transcription'),false);
 assert.ok(last(s).obligations.length>0,'completed conversation cannot manufacture capture permission');
 s=configure(s,'recorder',{consent:true});s=tick(s);s=work(s,'family-ai-recovered');
 assert.ok(recordsForLast(s).some(r=>r.kind==='recording'));assert.ok(recordsForLast(s).some(r=>r.kind==='transcription'));
});

test('ms-local-deployment: local calling survives isolation only while local licensing remains available',()=>{
 let s=fixture('ms-local-deployment','defence');
 s=SOC.dispatch(s,{type:'connect',connected:false});s=work(s,'family-local-offline');
 assert.equal(last(s).phase,'resolved');assert.equal(s.connected,false);
 s=configure(s,'local',{licensing:false});s=tick(s);s=work(s,'family-local-unlicensed');
 assert.equal(last(s).phase,'failed');assert.equal(SOC.observe(s,'identity').ready,false,'offline identity depends on local licensing');
 s=configure(s,'local',{licensing:true});s=tick(s);s=work(s,'family-local-relicensed');
 assert.equal(last(s).phase,'resolved');assert.equal(s.connected,false);
});

test('cisco-dedicated-uc: effective dedicated platform needs an explicit cohort migration before carrying its calls',()=>{
 let s=fixture('cisco-dedicated-uc');s=send(s,'operations',{action:'start'});s=tick(s);
 assert.equal(SOC.operations.platform(s,'bea'),'phone','commissioning a second platform does not migrate its users');
 s=send(s,'operations',{action:'migration',identities:['bea'],target:'dedicated-platform',cutoverAt:s.clock+1});s=tick(s,2);
 assert.equal(SOC.operations.platform(s,'bea'),'dedicated-platform');
 const call=(state,id)=>tick(SOC.dispatch(state,{type:'interact',channel:'voice',from:'bea',to:'+61255500201',caseId:id}),5);
 s=call(s,'family-dedicated-before');assert.equal(last(s).phase,'resolved');
 assert.ok(last(s).trace.some(t=>t.code==='CALL_REQUEST'&&t.platform==='dedicated-platform'));
 s=SOC.dispatch(s,{type:'fault',id:'dedicated-platform',fault:'OUTAGE'});s=call(s,'family-dedicated-outage');assert.equal(last(s).phase,'failed');
 s=SOC.dispatch(s,{type:'fault',id:'dedicated-platform',fault:null});s=call(s,'family-dedicated-recovery');assert.equal(last(s).phase,'resolved');
 assert.equal(SOC.operations.platform(s,'alex'),'phone','unmigrated identity retains its own platform');
});

test('paid dedicated UC carries autonomous Alex work on its funded platform and copied Lab faults preserve the limitation',()=>{
 const customerId='starter-customer',recipe=recipes['cisco-dedicated-uc'];
 let s=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',seed:73});
 const child=()=>s.portfolio.customers.find(c=>c.id===customerId).root;
 const command=intent=>{s=SOC.dispatch(s,{type:'provider',requestId:`provider-${s.providerRequestSequence+1}`,command:intent});};
 const commit=intent=>{const q=SOC.provider.quote(s,intent);assert.deepEqual(q.blockers,[],JSON.stringify({intent,blockers:q.blockers}));command({...intent,quoteRevision:q.atRevision});return q;};
 const advance=()=>{
  s=tick(s);
  const incident=s.providerCampaign.incidents.find(i=>i.customerId===customerId&&['active','acknowledged'].includes(i.status));
  if(!incident)return;
  if(incident.status==='active')command({action:'acknowledge-incident',incidentId:incident.id});
  if(s.providerCampaign.projects.some(p=>p.customerId===customerId&&p.operationId==='repair'&&['running','commissioning'].includes(p.status)))return;
  const intent={action:'operation',operationId:'repair',customerId},q=SOC.provider.quote(s,intent);
  if(!q.blockers.length)command({...intent,quoteRevision:q.atRevision});
  else assert.ok(q.blockers.every(b=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY'].includes(b)),JSON.stringify(q.blockers));
 };
 for(const stage of ['base','carrier','partner'])commit({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId})});
 for(let n=0;n<30&&s.providerCampaign.customers[0].status!=='active';n++)advance();
 assert.equal(s.providerCampaign.customers[0].status,'active');
 const cash=s.business.balance.cash,q=commit({action:'operation',operationId:recipe.id,customerId});
 assert.equal(q.setupCents,recipe.quote.setupCents);assert.equal(s.business.balance.cash,cash-q.setupCents,'dedicated platform draws the actual authored setup from shared cash');
 const project=()=>s.providerCampaign.projects.find(p=>p.operationId===recipe.id);
 for(let n=0;n<100&&project()?.status!=='complete';n++)advance();
 assert.equal(project()?.status,'complete','funded product must finish deployment and caller migration');
 assert.equal(SOC.operations.platform(child(),'alex'),'dedicated-platform','paid dedicated product must place its autonomous caller onto its own platform');
 const commissionedAt=project().completedAt;
 const delivered=()=>s.providerCampaign.jobs.find(j=>j.customerId===customerId&&j.channel==='voice'&&j.arrivalAt>=commissionedAt&&j.status==='completed'&&child().interactions.some(i=>i.id===j.interactionId&&i.from==='alex'&&i.trace.some(t=>t.code==='CALL_REQUEST'&&t.platform==='dedicated-platform')));
 for(let n=0;n<100&&!delivered();n++)advance();
 assert.ok(delivered(),'autonomous campaign case must be delivered by the paid dedicated platform, not by unrelated existing calls');
 const source=JSON.stringify(s);let lab=SOC.dispatch(s,{type:'copy-to-lab',customerId});
 assert.equal(JSON.stringify(s),source);assert.equal(lab.experience.kind,'lab');assert.equal(lab.experience.custom,true);
 assert.equal(SOC.operations.platform(lab,'alex'),'dedicated-platform');
 lab=SOC.dispatch(lab,{type:'fault',id:'dedicated-platform',fault:'OUTAGE'});lab=work(lab,'dedicated-copy-failed');
 assert.equal(last(lab).phase,'failed');assert.ok(last(lab).trace.some(t=>t.code==='CALL_REQUEST'&&t.platform==='dedicated-platform'));
 lab=SOC.dispatch(lab,{type:'fault',id:'dedicated-platform',fault:null});lab=work(lab,'dedicated-copy-recovered');
 assert.equal(last(lab).phase,'resolved');assert.ok(last(lab).trace.some(t=>t.code==='CALL_REQUEST'&&t.platform==='dedicated-platform'));
 assert.deepEqual(SOC.restore(JSON.stringify(lab)),lab);assert.equal(JSON.stringify(s),source,'Lab failures and recovery cannot rewrite paid campaign history');
});

test('cisco-local-speech: exact recipe output stops after a pipeline scope change until model evidence is reprovisioned',()=>{
 let s=fixture('cisco-local-speech','government');s=work(s,'family-local-speech-before');
 assert.equal(s.information.jobs.at(-1).status,'complete');assert.ok(s.information.jobs.at(-1).speechModel);
 assert.ok(s.records.some(r=>r.kind==='transcription'&&r.interaction===last(s).id));
 s=send(s,'information',{action:'configure',kind:'pipeline',config:{steps:['transcription','summary']}});s=tick(s);s=work(s,'family-local-speech-summary');
 assert.equal(s.information.jobs.some(j=>j.interaction===last(s).id),false,'changed pipeline cannot reuse prior scoped model evidence');
 assert.ok(last(s).obligations.includes('PRODUCT_PROCESSOR_UNAVAILABLE'));
 assert.equal(recordsForLast(s).some(r=>r.kind==='summary'),false);
 s=send(s,'information',{action:'configure',kind:'pipeline',config:{steps:['transcription','diarisation']}});s=tick(s);
 const preparation=recipes['cisco-local-speech'].preparation;
 s=send(s,'speech-models',{...preparation.install,id:'speech-repaired',deploymentId:'d-cisco-local-speech',region:s.jurisdiction});
 s=send(s,'speech-models',{...preparation.integrationTest,id:'speech-integration-repaired',installationId:'speech-repaired'});s=tick(s);
 s=work(s,'family-local-speech-recovered');
 assert.equal(s.information.jobs.at(-1).status,'complete');assert.ok(recordsForLast(s).some(r=>r.kind==='transcription'));
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

for(const recipeId of ['ms-government-boundary','cisco-government-boundary'])test(`${recipeId}: scoped eligibility proof revocation blocks real voice and replacement evidence restores it`,()=>{
 const recipe=recipes[recipeId],gov=market.fixtures.find(x=>x.id==='cust-tokyo'),child=s=>market.child(s,gov.id),dispatch=(s,command)=>market.dispatchCustomer(s,gov.id,command);
 let s=market.setup({customers:[gov]});
 s=dispatch(s,{type:'products',command:{action:'start'}});s=dispatch(s,{type:'product-evidence',command:{action:'start'}});
 for(const [id,patch] of Object.entries(recipe.quote.config)){const config={...child(s).resources[id].desired,...patch};if(JSON.stringify(config)!==JSON.stringify(child(s).resources[id].desired))s=dispatch(s,{type:'configure',id,config});}
 s=dispatch(s,{type:'products',command:{action:'offer',offer:{id:recipe.id,family:recipe.family,edition:recipe.edition,unit:recipe.unit,quantity:recipe.quantity,features:recipe.features,dependencies:recipe.dependencies}}});s=tick(s);
 const deploymentId=`d-${recipe.id}`;
 s=dispatch(s,{type:'products',command:{action:'deploy',id:deploymentId,offer:recipe.id,productVersion:'scenario-1',mode:recipe.mode,region:child(s).jurisdiction,features:recipe.features,dependencies:recipe.dependencies,bindings:recipe.bindings}});
 for(const request of recipe.preparation.requests)s=dispatch(s,{type:'product-evidence',command:{action:'request',id:`proof-${request.feature}`,deploymentId,...request}});
 s=tick(s);assert.equal(child(s).products.deployments[0].provisioning.status,'ready',JSON.stringify(child(s).productEvidence));
 const interact=(s,caseId)=>dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId});
 s=interact(s,'family-gov-before');s=tick(s,8);assert.equal(last(child(s)).phase,'resolved',JSON.stringify(last(child(s))));
 s=dispatch(s,{type:'product-evidence',command:{action:'revoke',id:'proof-eligibility-evidence',reason:'scope-withdrawn'}});
 s=interact(s,'family-gov-revoked');assert.equal(last(child(s)).phase,'failed');assert.equal(last(child(s)).outcome,'PRODUCT_FEATURE_UNAVAILABLE');
 const request=recipe.preparation.requests.find(r=>r.feature==='eligibility-evidence');
 s=dispatch(s,{type:'product-evidence',command:{action:'request',id:'proof-replacement',deploymentId,...request}});s=tick(s);
 s=interact(s,'family-gov-recovered');s=tick(s,8);assert.equal(last(child(s)).phase,'resolved');
 assert.equal(child(s).productEvidence.requests.find(x=>x.id==='proof-eligibility-evidence').revocationReason,'scope-withdrawn','recovery preserves revoked evidence');
 assert.ok(child(s).productEvidence.requests.every(x=>!x.effective||x.effective.externalApprovalClaim===false));
});
