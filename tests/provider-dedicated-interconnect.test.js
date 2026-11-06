const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const PN=require('../src/game/23-provider-dedicated-interconnect');
const copy=x=>JSON.parse(JSON.stringify(x));
const tick=(s,n=1)=>SOC.dispatch(s,{type:'advance',minutes:n});
// Actual Lab gateway calls wrapped in an isolated Provider helper contract. This is NOT a public paid Provider fixture.
function fixture(){
 let child=SOC.create({experience:'lab',mode:'sandbox',scenario:'enterprise',tenant:'canopy-group'});
 for(const c of SOC.reference(child).filter(c=>c.type==='configure'))child=SOC.dispatch(child,c);
 child=tick(child);child=SOC.dispatch(child,{type:'operations',command:{action:'start'}});child=tick(child);
 child=SOC.dispatch(child,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});child=tick(child);
 const before={carrier:{generation:child.operations.carrier.generation,effective:copy(child.operations.carrier.effective)},phone:{generation:child.resources.phone.generation,effective:copy(child.resources.phone.effective)},trunk:{generation:child.resources.carrier.generation,effective:copy(child.resources.carrier.effective)}};
 const acceptedAt=child.clock,customer={id:'customer-a',portfolioId:'portfolio-a',market:'au-sydney',status:'active'};
 const s={clock:acceptedAt,providerCampaign:{contentVersion:'provider-campaigns-8',dedicatedInterconnectVersion:1,customers:[customer],projects:[],jobs:[],events:[]},portfolio:{customers:[{id:'portfolio-a',root:child}]},business:{ledger:[]}};
 child.providerCustomer={id:customer.id};let delivered;
 const hooks={customerRoot:state=>state.portfolio.customers[0].root,configurationAt:(state,id,at)=>copy(at<acceptedAt+7?before:delivered),supportReady:()=>true,serviceReady:()=>true,validatePaidProject:(state,p)=>state.business.ledger.some(x=>x.id===p.postingId&&x.projectId===p.id&&x.customerId===p.customerId&&x.reason==='provider-operation'&&x.category==='cost'&&x.cents===p.setupCents)};
 const request={customerId:customer.id,operationId:PN.DIRECT},plan=PN.plan(s,request,hooks);
 // Remove isolated marker while exercising real Lab commands; no Provider authority is bypassed.
 delete child.providerCustomer;child=tick(child,6);child=SOC.dispatch(child,{type:'operations',command:{action:'configure',kind:'carrier',config:plan.carrierProfile}});const submittedAt=child.clock;child=tick(child);
 delivered={carrier:{generation:child.operations.carrier.generation,effective:copy(child.operations.carrier.effective)},phone:{generation:child.resources.phone.generation,effective:copy(child.resources.phone.effective)},trunk:{generation:child.resources.carrier.generation,effective:copy(child.resources.carrier.effective)}};
 const project={id:'provider-project-1',postingId:'entry-1',customerId:customer.id,kind:'operation',operationId:PN.DIRECT,acceptedAt,...PN.terms(PN.DIRECT),configSubmittedAt:submittedAt,status:'commissioning'};
 project.operationReceipt=PN.createReceipt(plan,{projectId:project.id,postingId:project.postingId,submittedAt});s.providerCampaign.projects.push(project);s.business.ledger.push({id:project.postingId,projectId:project.id,customerId:project.customerId,category:'cost',reason:'provider-operation',cents:project.setupCents});
 s.clock=child.clock;child.providerCustomer={id:customer.id};s.portfolio.customers[0].root=child;const ready=PN.commissionEvidence(s,project,hooks);assert.ok(ready);project.status='complete';project.completedAt=ready.deliveredAt;project.operationReceipt.deliveredAt=ready.deliveredAt;
 delete child.providerCustomer;
 child=SOC.dispatch(child,{type:'interact',channel:'voice',direction:'outbound',from:'alex',to:'+61255500201',caseId:'pn-out',durationMinutes:3});
 child=SOC.dispatch(child,{type:'interact',channel:'voice',direction:'inbound',from:'+12125550199',to:'+61255500201',caseId:'pn-in',durationMinutes:3});child=tick(child,3);
 s.clock=child.clock;child.providerCustomer={id:customer.id};s.portfolio.customers[0].root=child;
 for(const [index,i] of child.interactions.entries()){const j={id:`provider-job-${index+1}`,customerId:customer.id,channel:'voice',status:'completed',settled:true,contextRetained:true,interactionId:i.id,caseId:i.caseId,arrivalAt:i.startedAt,deadlineAt:i.startedAt+8,completedAt:i.finishedAt,voiceMinutes:i.usageMinutes,observedUsageMinutes:i.usageMinutes};s.providerCampaign.jobs.push(j);s.providerCampaign.events.push({id:`provider-event-${index+1}`,at:i.startedAt,code:'CUSTOMER_WORK_ARRIVED',customerId:customer.id,jobId:j.id,interactionId:i.id,caseId:i.caseId});}
 return {s,hooks,plan,project,before,delivered,child,customer};
}

test('AC-SOC-679 isolated PN plan keeps exact paid alternatives, authenticated carrier generations and no capacity award',()=>{
 const f=fixture(),before=JSON.stringify(f.s);assert.deepEqual(PN.terms(PN.DIRECT),{setupCents:24000,periodCents:6000,workMinutes:6,engineers:1,support:1});assert.deepEqual(PN.terms(PN.MANAGED),{setupCents:12000,periodCents:9000,workMinutes:8,engineers:0,support:1});assert.equal(f.plan.carrierGeneration,f.before.carrier.generation+1);assert.equal(f.delivered.trunk.effective.capacity,f.before.trunk.effective.capacity);assert.equal(PN.validateReceipt(f.s,f.project,f.hooks),true);
 assert.ok(PN.canOrder(f.s,{customerId:'customer-a',operationId:PN.MANAGED},f.hooks).missing.includes('PROVIDER_INTERCONNECT_EARNED_SCOPE_REQUIRED'));
 const receipt={id:'provider-progression-receipt:'+PN.SOURCE_ID,sourceId:PN.SOURCE_ID,allowedMarkets:['au-sydney']},hooks={...f.hooks,earnedReceipt:()=>receipt,validateEarnedReceipt:()=>true};assert.equal(PN.canOrder(f.s,{customerId:'customer-a',operationId:PN.MANAGED},hooks).allowed,true);const managed=PN.plan(f.s,{customerId:'customer-a',operationId:PN.MANAGED},hooks);assert.equal(managed.earnedReceiptId,receipt.id);const originalId=receipt.id;receipt.id='invented-receipt';assert.equal(PN.canOrder(f.s,{customerId:'customer-a',operationId:PN.MANAGED},hooks).allowed,false);receipt.id=originalId;receipt.allowedMarkets=['jp-tokyo'];assert.equal(PN.canOrder(f.s,{customerId:'customer-a',operationId:PN.MANAGED},hooks).allowed,false);assert.equal(JSON.stringify(f.s),before);
});

test('AC-SOC-680 isolated PN evidence requires actual completed admitted inbound and outbound Lab-engine calls',()=>{
 const f=fixture(),before=JSON.stringify(f.s),report=PN.evaluate(f.s,'customer-a',f.hooks);assert.equal(report.status,'ready',JSON.stringify(f.child.interactions.map(i=>({id:i.id,context:i.context,phase:i.phase,usage:i.usageMinutes,trace:i.trace}))));assert.equal(report.evidence.outbound.interaction.direction,'outbound');assert.equal(report.evidence.inbound.interaction.direction,'inbound');assert.equal(PN.validateEvidence(f.s,'customer-a',report.evidence,f.hooks),true);assert.equal(JSON.stringify(f.s),before);assert.equal(PN.pins(report.evidence).interactionIds.length,2);
 for(const edit of [x=>x.providerCampaign.jobs.pop(),x=>x.portfolio.customers[0].root.interactions[0].phase='connected',x=>x.portfolio.customers[0].root.interactions[0].probe=true,x=>x.portfolio.customers[0].root.interactions[0].connectedAt=x.portfolio.customers[0].root.interactions[0].finishedAt,x=>x.portfolio.customers[0].root.interactions[0].media.in=false,x=>x.portfolio.customers[0].root.interactions[0].trace=x.portfolio.customers[0].root.interactions[0].trace.filter(t=>t.code!=='CARRIER_PATH_ADMITTED'),x=>x.portfolio.customers[0].root.interactions[1].trace=x.portfolio.customers[0].root.interactions[1].trace.filter(t=>t.code!=='INBOUND_PERMISSION_ACCEPTED'),x=>x.portfolio.customers[0].root.interactions[0].tenant='wrong-tenant']){const bad=copy(f.s);edit(bad);assert.equal(PN.evaluate(bad,'customer-a',f.hooks).status,'locked');assert.equal(PN.validateEvidence(bad,'customer-a',report.evidence,f.hooks),false);}
});

test('AC-SOC-681 isolated PN rejects unpaid, shared, premature and coherently forged receipt/profile scope',()=>{
 const f=fixture();for(const edit of [x=>x.business.ledger=[],x=>x.providerCampaign.projects[0].setupCents=1,x=>x.providerCampaign.projects[0].operationReceipt.plan.customerId='customer-b',x=>x.providerCampaign.projects[0].operationReceipt.plan.carrierProfile.mode='managed',x=>x.providerCampaign.projects[0].operationReceipt.plan.carrierProfile.peerAuthenticated=false,x=>x.providerCampaign.projects[0].operationReceipt.deliveredAt=x.providerCampaign.projects[0].configSubmittedAt]){const bad=copy(f.s);edit(bad);assert.throws(()=>PN.validateReceipt(bad,bad.providerCampaign.projects[0],f.hooks),/INVALID_PROVIDER_INTERCONNECT/);}
 const changed={...f.hooks,configurationAt:(s,c,at)=>{const v=f.hooks.configurationAt(s,c,at);if(at>=f.project.completedAt)v.carrier.effective.mode='managed';return v;}};assert.equal(PN.evaluate(f.s,'customer-a',changed).status,'locked');assert.equal(PN.evaluate(f.s,'customer-a',{...f.hooks,configurationAt:undefined}).status,'locked');assert.equal(PN.evaluate(f.s,'customer-a',{...f.hooks,supportReady:undefined}).status,'locked');
});

test('AC-SOC-682 isolated PN historical receipt survives later config loss but deleted evidence needs independently validated retention',()=>{
 const f=fixture(),e=PN.evaluate(f.s,'customer-a',f.hooks).evidence;assert.ok(e);const later=copy(f.s);later.clock+=10;const hooks={...f.hooks,configurationAt:(s,c,at)=>{const v=f.hooks.configurationAt(s,c,at);if(at>e.to)v.carrier.effective.peerAuthenticated=false;return v;},serviceReady:()=>false};assert.equal(PN.validateEvidence(later,'customer-a',e,hooks,{historical:true}),true);assert.equal(PN.validateEvidence(later,'customer-a',e,hooks),false);
 later.portfolio.customers[0].root.interactions=[];assert.equal(PN.validateEvidence(later,'customer-a',e,hooks,{historical:true}),false);const originals=[e.outbound,e.inbound],retained={...hooks,retainedWork:(s,c,p)=>originals.some(x=>JSON.stringify(x)===JSON.stringify(p))};assert.equal(PN.validateEvidence(later,'customer-a',e,retained,{historical:true}),true);const forged=copy(e);forged.outbound.interaction.usageMinutes++;forged.outbound.job.voiceMinutes++;forged.outbound.job.observedUsageMinutes++;assert.equal(PN.validateEvidence(later,'customer-a',forged,retained,{historical:true}),false);assert.equal(PN.validateEvidence(later,'customer-b',e,retained,{historical:true}),false);const partial=copy(later);partial.providerCampaign.jobs[0].voiceMinutes++;assert.equal(PN.validateEvidence(partial,'customer-a',e,retained,{historical:true}),false,'retention hook cannot override a conflicting still-retained job');
});

test('AC-SOC-683 isolated PN JSON restoration and self-contained source preserve exact proof and reject unknown version',()=>{
 const f=fixture(),e=PN.evaluate(f.s,'customer-a',f.hooks).evidence;assert.ok(e);assert.equal(PN.validateEvidence(copy(f.s),'customer-a',copy(e),f.hooks,{historical:true}),true);const context={};vm.createContext(context);vm.runInContext(PN.source()+';globalThis.api=SOC_PROVIDER_DEDICATED_INTERCONNECT;',context);assert.deepEqual(copy(context.api.evaluate(copy(f.s),'customer-a',f.hooks)),PN.evaluate(f.s,'customer-a',f.hooks));const bad=copy(e);bad.version=2;assert.equal(PN.validateEvidence(f.s,'customer-a',bad,f.hooks),false);assert.equal(context.api.validateEvidence(f.s,'customer-a',bad,f.hooks),false);
});
