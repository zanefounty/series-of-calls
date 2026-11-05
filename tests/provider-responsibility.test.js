const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require(process.cwd()+'/src/game/55-communications.js');
const RESPONSIBILITY=require('../src/game/23-provider-responsibility.js');

const hooks={customerRoot:(s,id)=>s.portfolio?.customers?.find(x=>x.id===id)?.root||null,observeResource:(root,id)=>SOC.observe(root,id)};
const minute=s=>SOC.dispatch(s,{type:'advance',minutes:1});
const buy=(s,request)=>{const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify({request,blockers:q.blockers}));return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:q.atRevision}});};
function paidOpening({completePartnerPaths=true}={}){
 let s=SOC.create({experience:'campaign'});
 for(const stage of ['base','carrier','partner']){
  s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});
  while(s.providerCampaign.customers[0].stages[stage].status!=='effective')s=minute(s);
 }
 s=buy(s,{action:'operation',operationId:'bpo',customerId:'starter-customer'});
 while(s.clock<120){
  const incident=s.providerCampaign.incidents.find(x=>x.status==='active');
  if(incident){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=buy(s,{action:'operation',operationId:'repair',customerId:incident.customerId});}
  s=minute(s);
 }
 if(!completePartnerPaths)return s;
 s=buy(s,{action:'operation',operationId:'partner-qualification',customerId:'starter-customer'});
 while(s.providerCampaign.projects.find(x=>x.operationId==='partner-qualification').status!=='complete')s=minute(s);
 s=buy(s,{action:'operation',operationId:'distributor-room',customerId:'starter-customer'});
 while(s.providerCampaign.projects.find(x=>x.operationId==='distributor-room').status!=='complete')s=minute(s);
 return s;
}

test('legacy campaigns have unavailable qualification facts; unknown opt-in versions reject',()=>{
 const legacy=SOC.create({experience:'campaign'});delete legacy.providerCampaign.commercialResponsibilityVersion;
 assert.deepEqual(RESPONSIBILITY.qualification(legacy,'starter-customer'),{status:'unavailable',missing:['COMMERCIAL_RESPONSIBILITY_VERSION_NOT_ENABLED'],certificate:null});
 assert.equal(RESPONSIBILITY.inspect(legacy).status,'unavailable');
 const unknown=structuredClone(legacy);unknown.providerCampaign.commercialResponsibilityVersion=2;
 assert.throws(()=>RESPONSIBILITY.inspect(unknown),/INVALID_PROVIDER_RESPONSIBILITY_VERSION/);
 assert.throws(()=>RESPONSIBILITY.validate(unknown),/INVALID_PROVIDER_RESPONSIBILITY_VERSION/);
});

test('pre-purchase qualification readiness reports exact roles, customer, dependency and settlement evidence',()=>{
 const s=paidOpening({completePartnerPaths:false}),before=JSON.stringify(s);
 const ready=RESPONSIBILITY.qualificationReadiness(s,'starter-customer',hooks);
 assert.equal(ready.status,'ready');assert.deepEqual(ready.missing,[]);
 assert.equal(ready.evidence.customerId,'starter-customer');assert.equal(ready.evidence.issuerOrganizationId,'branch-distribution');assert.equal(ready.evidence.holderOrganizationId,'orchard-msp');
 assert.deepEqual(ready.evidence.scopes,['distributor-room','recording']);assert.equal(ready.evidence.checkedAt,120);assert.equal(ready.evidence.period,1);assert.deepEqual(ready.evidence.interval,{from:60,to:120});assert.equal(ready.evidence.globalSettlementAt,120);
 assert.ok(ready.evidence.netRetailCents>0);assert.ok(ready.evidence.revenuePostingId);assert.ok(ready.evidence.costPostingIds.length>0);
 const quote=SOC.provider.quote(s,{action:'operation',operationId:'partner-qualification',customerId:'starter-customer'});
 assert.deepEqual(quote.blockers,[],'the current engine quote accepts the same pre-purchase conditions');
 assert.equal(JSON.stringify(s),before,'readiness and quote checks do not mutate the campaign');
 const noRole=structuredClone(s);noRole.business.organisations['branch-distribution'].roles=[];
 assert.ok(RESPONSIBILITY.qualificationReadiness(noRole,'starter-customer',hooks).missing.includes('NAMED_PARTNER_ROLE_UNAVAILABLE'));
 const noDependency=RESPONSIBILITY.qualificationReadiness(s,'starter-customer',{...hooks,observeResource:(root,id)=>id==='identity'?false:SOC.observe(root,id)});
 assert.ok(noDependency.missing.includes('QUALIFICATION_DEPENDENCY_NOT_READY'));
 const stale=structuredClone(s);stale.clock=181;
 assert.ok(RESPONSIBILITY.qualificationReadiness(stale,'starter-customer',hooks).missing.includes('RECENT_FULL_QUALIFIED_SETTLEMENT_REQUIRED'));
});

test('paid qualification requires a current full qualified settlement, named roles, effective dependencies and matching posting',()=>{
 const s=paidOpening(),before=JSON.stringify(s),q=RESPONSIBILITY.qualification(s,'starter-customer',undefined,hooks);
 assert.equal(q.status,'active');assert.deepEqual(q.missing,[]);
 const cert=q.certificate;assert.equal(cert.id,'provider-qualification-provider-project-6');assert.equal(cert.issuerOrganizationId,'branch-distribution');assert.equal(cert.holderOrganizationId,'orchard-msp');
 assert.deepEqual(cert.scopes,['distributor-room','recording']);assert.equal(cert.effectiveAt,126);assert.equal(cert.expiresAt,306);
 assert.equal(cert.projectId,'provider-project-6');assert.equal(cert.postingId,'entry-21');assert.equal(cert.evidence.period,1);assert.equal(cert.evidence.to,120);assert.ok(cert.evidence.netRetailCents>0);
 assert.ok(s.business.ledger.some(x=>x.id===cert.postingId&&x.projectId===cert.projectId&&x.category==='cost'));
 assert.equal(RESPONSIBILITY.permits(cert,'starter-customer','distributor-room',126),true);assert.equal(RESPONSIBILITY.permits(cert,'other-customer','distributor-room',126),false);assert.equal(RESPONSIBILITY.permits(cert,'starter-customer','unknown-scope',126),false);
 assert.equal(JSON.stringify(s),before,'evaluation is read-only');
 const expired=structuredClone(s);expired.clock=cert.expiresAt;assert.equal(RESPONSIBILITY.qualification(expired,'starter-customer',undefined,hooks).status,'expired');assert.equal(RESPONSIBILITY.permits(cert,'starter-customer','recording',cert.expiresAt),false);
});

test('qualification rejects stale settlement, wrong customer, changed role, unready resources and forged paid lineage',()=>{
 const s=paidOpening(),project=s.providerCampaign.projects.find(x=>x.operationId==='partner-qualification');
 assert.equal(RESPONSIBILITY.qualification(s,'unknown-customer',undefined,hooks).status,'unavailable');
 const stale=structuredClone(s);stale.clock=187;const staleProject=stale.providerCampaign.projects.find(x=>x.id===project.id);staleProject.acceptedAt=181;staleProject.completedAt=187;
 assert.ok(RESPONSIBILITY.qualification(stale,'starter-customer',undefined,hooks).missing.includes('RECENT_FULL_QUALIFIED_SETTLEMENT_REQUIRED'));
 const role=structuredClone(s);role.business.organisations['branch-distribution'].roles=[];assert.ok(RESPONSIBILITY.qualification(role,'starter-customer',undefined,hooks).missing.includes('NAMED_PARTNER_ROLE_UNAVAILABLE'));
 const resource=RESPONSIBILITY.qualification(s,'starter-customer',undefined,{...hooks,observeResource:(root,id)=>id==='identity'?false:SOC.observe(root,id)});assert.ok(resource.missing.includes('QUALIFICATION_DEPENDENCY_NOT_READY'));
 const posting=structuredClone(s);posting.business.ledger=posting.business.ledger.filter(x=>x.id!==project.postingId);assert.ok(RESPONSIBILITY.qualification(posting,'starter-customer',undefined,hooks).missing.includes('PAID_PROJECT_POSTING_REQUIRED'));
});

test('responsibilities require paid completed MSP work, the current shared team, and actual effective BPO people',()=>{
 const s=paidOpening(),before=JSON.stringify(s),out=RESPONSIBILITY.responsibilities(s,'starter-customer',hooks),byRole=Object.fromEntries(out.records.map(x=>[x.role,x]));
 assert.equal(out.status,'available');assert.ok(byRole.msp);assert.ok(byRole.bpo);assert.ok(byRole.distributor);
 assert.equal(byRole.msp.organisationId,'orchard-msp');assert.ok(byRole.msp.terms.setupCents>0);assert.ok(byRole.msp.evidence.sharedWorkforce.personMinutes>0);
 assert.equal(byRole.bpo.organisationId,'people-orchard');assert.equal(byRole.bpo.evidence.people.length,2);assert.ok(byRole.bpo.evidence.people.every(x=>x.employer==='people-orchard'&&x.presence==='available'));
 assert.equal(byRole.distributor.organisationId,'branch-distribution');assert.equal(byRole.distributor.evidence.qualificationProjectId,'provider-project-6');
 const stageOnly=structuredClone(s);stageOnly.providerCampaign.projects=stageOnly.providerCampaign.projects.filter(x=>x.kind==='stage');const stageRoles=RESPONSIBILITY.responsibilities(stageOnly,'starter-customer',hooks);assert.ok(stageRoles.records.some(x=>x.role==='msp'),'paid active stages plus shared paid payroll establish MSP responsibility without a separate operation');assert.ok(!stageRoles.records.some(x=>x.role==='bpo'));
 assert.equal(JSON.stringify(s),before,'responsibility projection does not mutate state');
 const noStaff=structuredClone(s);noStaff.business.workforce.support=0;assert.ok(!RESPONSIBILITY.responsibilities(noStaff,'starter-customer',hooks).records.some(x=>x.role==='msp'));
 const unavailableBpo=RESPONSIBILITY.responsibilities(s,'starter-customer',{...hooks,observeResource:(root,id)=>id==='people'?false:SOC.observe(root,id)});assert.ok(!unavailableBpo.records.some(x=>x.role==='bpo'));
});

test('paid BPO responsibility follows recurring daily shifts and respects actual breaks after a full day',()=>{
 let s=paidOpening({completePartnerPaths:false});
 while(s.clock<1560){
  if(s.providerCampaign.customers[0].status==='renewal')s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId:'starter-customer'}});
  s=SOC.dispatch(s,{type:'advance',minutes:60});
 }
 assert.equal(s.clock,1560);assert.ok(RESPONSIBILITY.responsibilities(s,'starter-customer',hooks).records.some(r=>r.role==='bpo'),'day two retains the paid scheduled workers');
 const breakFixture=structuredClone(s);for(const person of breakFixture.portfolio.customers[0].root.workforceOps.roster.effective.filter(p=>p.employer==='people-orchard'))person.breaks=[{start:120,end:130}];
 assert.ok(!RESPONSIBILITY.responsibilities(breakFixture,'starter-customer',hooks).records.some(r=>r.role==='bpo'),'projection cannot promise current cover during a scheduled break');
});

test('direct and distributor comparisons use engine quotes and include the qualification setup, lead time and shared staffing',()=>{
 const s=paidOpening(),rows=['room','partner-qualification','distributor-room'].map(id=>({id,quote:SOC.provider.quote(s,{action:'operation',operationId:id,customerId:'starter-customer'})}));
 const before=JSON.stringify(s),terms=RESPONSIBILITY.comparison(rows,3);
 assert.deepEqual(terms.direct,{setupCents:75000,recurringCentsPerPeriod:9000,termPeriods:3,quotedTermCents:102000,workMinutes:10,engineers:1,support:0,engineerMinutes:10,supportMinutes:0,blockers:[]});
 assert.equal(terms.qualification.setupCents,20000);assert.equal(terms.qualification.workMinutes,6);assert.equal(terms.qualification.engineers,1);assert.equal(terms.qualification.support,1);
 assert.equal(terms.distributor.setupCents,65000);assert.equal(terms.distributor.recurringCentsPerPeriod,13000);assert.equal(terms.distributor.quotedTermCents,104000);assert.equal(terms.distributor.workMinutes,14);assert.equal(terms.distributor.engineers,1,'sequential staffing is a stage peak, not a sum');assert.equal(terms.distributor.support,1);assert.equal(terms.distributor.engineerMinutes,14);assert.equal(terms.distributor.supportMinutes,6);
 assert.equal(terms.source,'SOC.provider.quote');assert.equal(JSON.stringify(s),before);
});

test('worker source evaluates the same pure helper API',()=>{
 const context={};vm.runInNewContext(RESPONSIBILITY.source()+';this.result=SOC_PROVIDER_RESPONSIBILITY',context);
 assert.equal(context.result.PACK,RESPONSIBILITY.PACK);assert.deepEqual([...context.result.SCOPES],[...RESPONSIBILITY.SCOPES]);
});


test('requalification derives its stable certificate from the latest eligible completed project',()=>{
 const first=paidOpening(),old=RESPONSIBILITY.qualification(first,'starter-customer',undefined,hooks).certificate;
 let s=structuredClone(first);
 while(s.clock<180)s=minute(s);
 if(s.providerCampaign.customers[0].status==='renewal')s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId:'starter-customer'}});
 s=buy(s,{action:'operation',operationId:'partner-qualification',customerId:'starter-customer'});
 const newProject=s.providerCampaign.projects.filter(x=>x.operationId==='partner-qualification').at(-1);
 while(s.providerCampaign.projects.find(x=>x.id===newProject.id).status!=='complete')s=minute(s);
 const current=RESPONSIBILITY.qualification(s,'starter-customer',undefined,hooks);
 assert.equal(current.status,'active');assert.equal(current.certificate.projectId,newProject.id);assert.notEqual(current.certificate.id,old.id);assert.equal(current.certificate.evidence.to,newProject.acceptedAt);assert.equal(current.certificate.expiresAt,s.providerCampaign.projects.find(x=>x.id===newProject.id).completedAt+180);
});

test('expired qualification refuses distributor work at the exact boundary, survives restore and worker dispatch, then requalifies from a new paid settlement',()=>{
 let s=paidOpening(),first=RESPONSIBILITY.qualification(s,'starter-customer',undefined,hooks).certificate;
 while(s.clock<first.expiresAt){
  if(s.providerCampaign.customers[0].status==='renewal')s=SOC.dispatch(s,{type:'provider',command:{action:'renew',customerId:'starter-customer'}});
  s=minute(s);
 }
 assert.equal(s.clock,first.expiresAt);assert.equal(RESPONSIBILITY.qualification(s,'starter-customer',undefined,hooks).status,'expired');
 const request={action:'operation',operationId:'distributor-room',customerId:'starter-customer'},quote=SOC.provider.quote(s,request);
 assert.ok(quote.blockers.includes('DISTRIBUTOR_QUALIFICATION_EXPIRED'));
 const before=JSON.stringify(s),cash=s.business.balance.cash,command={type:'provider',command:{...request,quoteRevision:quote.atRevision}};
 assert.throws(()=>SOC.dispatch(s,command),/DISTRIBUTOR_QUALIFICATION_EXPIRED/);assert.equal(JSON.stringify(s),before);assert.equal(s.business.balance.cash,cash);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 let reply;const context={postMessage:value=>reply=value};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:'expired-distributor',state:s,command}});assert.match(reply.error,/DISTRIBUTOR_QUALIFICATION_EXPIRED/);assert.equal(JSON.stringify(s),before);
 const qualificationRequest={action:'operation',operationId:'partner-qualification',customerId:'starter-customer'};
 s=buy(s,qualificationRequest);const project=s.providerCampaign.projects.filter(x=>x.operationId==='partner-qualification').at(-1);
 while(s.providerCampaign.projects.find(x=>x.id===project.id).status!=='complete')s=minute(s);
 const refreshed=RESPONSIBILITY.qualification(s,'starter-customer',undefined,hooks);
 assert.equal(refreshed.status,'active');assert.equal(refreshed.certificate.projectId,project.id);assert.ok(refreshed.certificate.expiresAt>s.clock);assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
