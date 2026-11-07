const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const start=()=>SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',difficulty:'normal',seed:77});
const send=(state,command,requestId)=>SOC.dispatch(state,{type:'provider',...(requestId?{requestId}:{}),command});
const tick=state=>SOC.dispatch(state,{type:'advance',minutes:1});

test('complete blueprint is one paid, idempotent order with actual staged delivery',()=>{
 for(const planId of ['swift','steady']){
  let s=start(),request={action:'plan',offerId:'starter',planId},quote=SOC.provider.quote(s,request),cash=s.business.balance.cash;
  assert.deepEqual(quote.blockers,[]);assert.equal(quote.setupCents,quote.commercial.fullPlanSetupCents);
  assert.equal(quote.periodCents,quote.commercial.fullPlanFixedCentsPerPeriod);
  s=send(s,{...request,quoteRevision:quote.atRevision},'provider-1');
  assert.equal(s.business.balance.cash,cash-quote.setupCents);
  assert.equal(s.providerCampaign.projects.length,3);
  assert.deepEqual(s.providerCampaign.projects.map(p=>p.stage),['base','carrier','partner']);
  assert.ok(s.providerCampaign.projects.every(p=>p.postingId&&p.acceptedAt===0));
  assert.deepEqual(send(s,{...request,quoteRevision:quote.atRevision},'provider-1'),s);
  while(s.clock<15&&s.providerCampaign.customers[0].status!=='active')s=tick(s);
  assert.equal(s.providerCampaign.customers[0].status,'active');
  assert.ok(Object.values(s.providerCampaign.customers[0].stages).every(stage=>stage.status==='effective'));
  s=SOC.restore(JSON.stringify(s));assert.equal(s.providerCampaign.projects.length,3);
 }
});

test('complete blueprint refuses unaffordable or stale terms without charging any stage',()=>{
 let s=start();SOC.business.postProvider(s,'cost',1500000,{reason:'test-existing-obligation',unit:'AUD-cent'});
 const request={action:'plan',offerId:'starter',planId:'swift'},quote=SOC.provider.quote(s,request);
 assert.ok(quote.blockers.includes('INSUFFICIENT_CASH'));
 assert.deepEqual(SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'}).blockers,[]);
 const before=JSON.stringify(s);
 assert.throws(()=>send(s,{...request,quoteRevision:quote.atRevision}),/INSUFFICIENT_CASH/);
 assert.equal(JSON.stringify(s),before);
 s=start();const valid=SOC.provider.quote(s,request);s=tick(s);const changed=JSON.stringify(s);
 assert.throws(()=>send(s,{...request,quoteRevision:valid.atRevision}),/STALE_PROVIDER_QUOTE/);
 assert.equal(JSON.stringify(s),changed);
});

test('completed recovery remains complete while its resolved incident stays in history',()=>{
 let s=start(),q=SOC.provider.quote(s,{action:'plan',offerId:'starter',planId:'swift'});
 s=send(s,{action:'plan',offerId:'starter',planId:'swift',quoteRevision:q.atRevision});
 while(s.clock<50&&!s.providerCampaign.incidents.some(i=>i.status==='active'))s=tick(s);
 const incident=s.providerCampaign.incidents.find(i=>i.status==='active');assert.ok(incident);
 s=send(s,{action:'acknowledge-incident',incidentId:incident.id});
 q=SOC.provider.quote(s,{action:'operation',operationId:'repair',customerId:incident.customerId});
 s=send(s,{action:'operation',operationId:'repair',customerId:incident.customerId,quoteRevision:q.atRevision});
 while(s.clock<34)s=tick(s);
 assert.equal(s.providerCampaign.incidents.find(i=>i.id===incident.id).status,'resolved');
 assert.equal(SOC.provider.inspect(s).goals.find(g=>g.id==='recover-incident').status,'complete');
});

test('one scoped response acknowledges and funds repair; stale or wrong scope leaves state unchanged',()=>{
 let s=start(),request={action:'plan',offerId:'starter',planId:'swift'},q=SOC.provider.quote(s,request);
 s=send(s,{...request,quoteRevision:q.atRevision});
 while(s.clock<50&&!s.providerCampaign.incidents.some(i=>i.status==='active'))s=tick(s);
 const incident=s.providerCampaign.incidents.find(i=>i.status==='active');assert.ok(incident);
 const response={action:'respond-incident',incidentId:incident.id,operationId:'repair'},terms=SOC.provider.quote(s,response);
 assert.deepEqual(terms.blockers,[]);assert.equal(terms.setupCents,8000);
 const stale=JSON.stringify(s);assert.throws(()=>send(s,{...response,quoteRevision:terms.atRevision-1}),/STALE_PROVIDER_QUOTE/);assert.equal(JSON.stringify(s),stale);
 assert.throws(()=>SOC.provider.quote(s,{...response,incidentId:'unrelated-incident'}),/INCIDENT_NOT_ACTIONABLE/);
 const cash=s.business.balance.cash;s=send(s,{...response,quoteRevision:terms.atRevision});
 assert.equal(s.business.balance.cash,cash-terms.setupCents);
 assert.equal(s.providerCampaign.incidents.find(i=>i.id===incident.id).status,'acknowledged');
 assert.equal(s.providerCampaign.projects.at(-1).operationId,'repair');
 while(s.clock<40&&s.providerCampaign.incidents.find(i=>i.id===incident.id).status!=='resolved')s=tick(s);
 assert.equal(s.providerCampaign.incidents.find(i=>i.id===incident.id).status,'resolved');
});

test('funded estate opening retains paid provenance and real opening queue',()=>{
 const s=SOC.create({experience:'campaign',opening:'estate',openingVariant:'peak-window',seed:77}),p=s.providerCampaign,estate=p.inheritedEstate;
 assert.equal(s.clock,5);assert.equal(p.customers[0].status,'active');assert.ok(p.jobs.some(j=>j.status==='pending'));
 assert.equal(estate.setupCents,600000);assert.equal(s.business.balance.cash,1400000);
 assert.equal(p.progressionReceipts?.receipts.length||0,0,'inherited construction awards no earned progression receipt');
 assert.deepEqual(estate.projectIds,p.projects.map(j=>j.id));
 assert.deepEqual(estate.postingIds,p.projects.map(j=>j.postingId));
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const quote=SOC.provider.quote(s,{action:'operation',operationId:'carrier-headroom',customerId:'starter-customer'});
 assert.deepEqual(quote.blockers,[],'funded estate offers a real peak capacity investment');
 const forged=JSON.parse(JSON.stringify(s));forged.providerCampaign.inheritedEstate.setupCents=0;
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_INHERITED_ESTATE/);
 const shifted=SOC.create({experience:'campaign',opening:'estate',openingVariant:'peak-window',seed:77,clock:10});
 assert.equal(shifted.clock,15);
 assert.equal(shifted.providerCampaign.inheritedEstate.fundedAt,10);
 assert.deepEqual(SOC.restore(JSON.stringify(shifted)),shifted);
});

test('inherited customer work cannot be claimed as player-earned first-live progression',()=>{
 let s=SOC.create({experience:'campaign',opening:'estate',openingVariant:'peak-window',seed:77});
 while(s.clock<60&&!s.providerCampaign.incidents.some(i=>i.status==='active'))s=tick(s);
 const incident=s.providerCampaign.incidents.find(i=>i.status==='active');assert.ok(incident);
 const response={action:'respond-incident',incidentId:incident.id,operationId:'repair'},quote=SOC.provider.quote(s,response);
 s=send(s,{...response,quoteRevision:quote.atRevision});
 while(s.clock<60)s=tick(s);
 assert.ok(s.providerCampaign.jobs.some(j=>j.status==='completed'),'inherited service delivers actual work');
 const first=SOC.provider.inspect(s).progression.goals['progress.goal.bb'];
 assert.equal(first.status,'incomplete');assert.match(first.missing.join(' '),/inherited/i);
 assert.throws(()=>send(s,{action:'claim-progression',sourceId:'progress.goal.bb',quoteRevision:s.revision}),/PROVIDER_PROGRESSION_EVIDENCE_REQUIRED/);
});

test('new opening staffing has a visible three-period commitment and cannot be toggled around known work',()=>{
 let s=SOC.create({experience:'campaign',opening:'win',seed:77}),before=JSON.stringify(s);
 let quote=SOC.provider.quote(s,{action:'staff',engineers:1,support:1});
 assert.equal(quote.commercial.committedUntil,180);assert.equal(quote.commercial.minimumMinutes,180);
 assert.ok(quote.blockers.includes('STAFF_COMMITMENT_ACTIVE'));
 assert.throws(()=>send(s,{action:'staff',engineers:1,support:1}),/STAFF_COMMITMENT_ACTIVE/);assert.equal(JSON.stringify(s),before);
 assert.equal(SOC.provider.inspect(s).staffingCommitment.committedUntil,180);
 s=SOC.dispatch(s,{type:'advance',minutes:180});assert.equal(s.clock,180);
 assert.equal(s.providerCampaign.payroll.personMinutes,540);assert.equal(s.providerCampaign.payroll.costCents,90000,'the initial three-person commitment incurs its full real payroll');
 s=send(s,{action:'staff',engineers:1,support:1});assert.equal(s.business.workforce.engineers,1);
 s=send(s,{action:'staff',engineers:2,support:1});assert.equal(SOC.provider.inspect(s).staffingCommitment.committedUntil,360);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 assert.throws(()=>send(s,{action:'staff',engineers:1,support:1}),/STAFF_COMMITMENT_ACTIVE/);
 const forged=structuredClone(s);forged.providerCampaign.staffingCommitmentVersion=2;
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_STAFFING_COMMITMENT_VERSION/);
 const legacy=SOC.create({experience:'campaign',seed:77});
 assert.equal(SOC.provider.inspect(legacy).staffingCommitment,null);
 assert.equal(send(legacy,{action:'staff',engineers:1,support:1}).business.workforce.engineers,1);
});

function renewalRun(policyChanges=s=>s,target=180){
 let s=start(),request={action:'plan',offerId:'starter',planId:'swift'},q=SOC.provider.quote(s,request);
 s=send(s,{...request,quoteRevision:q.atRevision});while(s.clock<12)s=tick(s);
 const policy={action:'configure-renewal-policy',quoteRevision:s.revision,customerId:'starter-customer',enabled:true,suspended:false,cashFloorCents:0,minMarginCents:0,maxSupplierExposureCents:1000000,maxCreditCents:1000000,maxRenewals:3};
 s=send(s,policy);s=policyChanges(s,policy);
 while(s.clock<target){s=SOC.dispatch(s,{type:'advance',minutes:target-s.clock});const incident=s.providerCampaign.incidents.find(row=>row.status==='active');if(incident){const response={action:'respond-incident',incidentId:incident.id,operationId:'repair'},quote=SOC.provider.quote(s,response);s=send(s,{...response,quoteRevision:quote.atRevision});}}
 return s;
}

test('bounded unchanged-term renewal follows observed qualified periods and restores once',()=>{
 const s=renewalRun(),c=s.providerCampaign.customers[0],policy=s.providerCampaign.renewalPolicies[0];
 assert.equal(s.clock,180);assert.equal(c.status,'active');assert.equal(c.retailAgreementHistory.entries.length,2);
 assert.equal(policy.actions.length,1);assert.equal(policy.actions[0].retailCents,c.retailCents);
 assert.equal(s.providerCampaign.events.find(e=>e.id===policy.actions[0].eventId).policyVersion,1);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 const forged=structuredClone(s);forged.providerCampaign.renewalPolicies[0].actions[0].retailCents++;
 assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_RENEWAL_POLICY_ACTION/);
});

test('unchanged renewal terms can issue a second receipt without duplicate first action',()=>{
 const s=renewalRun(s=>s,360),policy=s.providerCampaign.renewalPolicies[0],customer=s.providerCampaign.customers[0];
 assert.equal(customer.status,'active');assert.equal(policy.actions.length,2);
 assert.deepEqual(policy.actions.map(action=>action.at),[180,360]);
 assert.equal(new Set(policy.actions.map(action=>action.eventId)).size,2);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});

test('renewal action cap escalates the next due contract',()=>{
 const s=renewalRun((s,p)=>send(s,{...p,quoteRevision:s.revision,maxRenewals:1}),360),policy=SOC.provider.inspect(s).renewalPolicies[0];
 assert.equal(s.providerCampaign.customers[0].status,'renewal');assert.equal(policy.actions.length,1);
 assert.equal(policy.decision.reason,'POLICY_ACTION_LIMIT');
});

test('suspended, cash-limited and changed-term policies leave renewal for explicit choice',()=>{
 for(const change of [
  (s,p)=>send(s,{...p,quoteRevision:s.revision,suspended:true}),
  (s,p)=>send(s,{...p,quoteRevision:s.revision,cashFloorCents:100000000}),
  (s,p)=>{const request={action:'operation',operationId:'carrier-headroom',customerId:p.customerId},q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);return send(s,{...request,quoteRevision:q.atRevision});}
 ]){
  const s=renewalRun(change),policy=SOC.provider.inspect(s).renewalPolicies[0];
  assert.equal(s.providerCampaign.customers[0].status,'renewal');assert.equal(policy.actions.length,0);
  assert.equal(policy.decision.status,'manual');
  assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 }
});

test('renewal policy refuses a stale displayed revision without changing terms',()=>{
 let s=start(),request={action:'plan',offerId:'starter',planId:'swift'},q=SOC.provider.quote(s,request);
 s=send(s,{...request,quoteRevision:q.atRevision});while(s.clock<12)s=tick(s);
 const command={action:'configure-renewal-policy',customerId:'starter-customer',quoteRevision:s.revision,enabled:true,suspended:false,cashFloorCents:0,minMarginCents:0,maxSupplierExposureCents:150000,maxCreditCents:5000,maxRenewals:3};
 s=tick(s);const before=JSON.stringify(s);
 assert.throws(()=>send(s,command),/STALE_PROVIDER_RENEWAL_TERMS/);assert.equal(JSON.stringify(s),before);
});
