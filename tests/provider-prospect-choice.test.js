const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');

function buy(state,request){const quote=SOC.provider.quote(state,request);assert.deepEqual(quote.blockers,[],JSON.stringify({request,clock:state.clock,blockers:quote.blockers}));return SOC.dispatch(state,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});}
function minute(state){return SOC.dispatch(state,{type:'advance',minutes:1});}
function operate(state,to){while(state.clock<to){const incident=state.providerCampaign.incidents.find(row=>['active','acknowledged'].includes(row.status));if(incident){if(incident.status==='active')state=SOC.dispatch(state,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});const request={action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId},quote=SOC.provider.quote(state,request);if(!quote.blockers.length)state=buy(state,request);}for(const customer of state.providerCampaign.customers.filter(row=>row.status==='renewal'))state=SOC.dispatch(state,{type:'provider',command:{action:'renew',customerId:customer.id}});state=minute(state);}return state;}
function qualifiedOpening(variant='standard'){let state=SOC.create({experience:'campaign',openingVariant:variant});for(const stage of ['base','carrier','partner']){state=buy(state,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});while(state.providerCampaign.customers[0].stages[stage].status!=='effective')state=minute(state);}return operate(state,180);}

test('AC-SOC-885 two first-expansion prospects have different real workloads, prices and immutable deadlines',()=>{
 const state=qualifiedOpening(),view=SOC.provider.inspect(state),regular=view.offers.find(row=>row.id==='next-1'),peak=view.offers.find(row=>row.id==='next-1-a');
 assert.equal(state.providerCampaign.prospectChoiceVersion,2);assert.equal(regular.available,true);assert.equal(peak.available,true);
 assert.deepEqual([regular.retailCents,regular.workload.scheduledVoicePeak,regular.expiresAt],[260000,2,300]);
 assert.deepEqual([peak.retailCents,peak.workload.scheduledVoicePeak,peak.expiresAt],[290000,5,270]);
 const regularQuote=SOC.provider.quote(state,{action:'plan',offerId:regular.id,planId:'swift'}),peakQuote=SOC.provider.quote(state,{action:'plan',offerId:peak.id,planId:'swift'});
 assert.deepEqual([regularQuote.commercial.retailCents,regularQuote.commercial.sla.scheduledVoicePeak,regularQuote.commercial.sla.scheduledCarrierShortfall],[260000,2,0]);
 assert.deepEqual([peakQuote.commercial.retailCents,peakQuote.commercial.sla.scheduledVoicePeak,peakQuote.commercial.sla.scheduledCarrierShortfall],[290000,5,1]);
 assert.equal(view.planComparisons.length,4);
 const later=operate(state,271),laterView=SOC.provider.inspect(later);assert.equal(laterView.offers.find(row=>row.id==='next-1-a').available,false);assert.equal(laterView.offers.find(row=>row.id==='next-1').available,true);
 assert.ok(SOC.provider.quote(later,{action:'purchase',offerId:'next-1-a',planId:'swift',stage:'base'}).blockers.includes('CUSTOMER_OFFER_EXPIRED'));
 assert.deepEqual(SOC.restore(JSON.stringify(later)),later);
});

test('AC-SOC-886 choosing the peak lead persists its scope and executes its own demand through dispatch and worker replay',()=>{
 let state=qualifiedOpening();state=buy(state,{action:'plan',offerId:'next-1-a',planId:'steady'});const customer=state.providerCampaign.customers.find(row=>row.id==='next-1-customer');
 assert.equal(customer.offerId,'next-1-a');assert.equal(customer.prospectDemandId,'peak-window');assert.equal(customer.retailAgreement.budgetCents,290000);assert.match(customer.name,/peak calling workload/);
 state=operate(state,245);const jobs=state.providerCampaign.jobs.filter(row=>row.customerId===customer.id&&row.periodIndex===4&&row.channel==='voice');assert.deepEqual(jobs.slice(0,5).map(row=>row.arrivalAt),[241,242,243,244,245]);
 assert.deepEqual(SOC.restore(JSON.stringify(state)),state);
 const forged=JSON.parse(JSON.stringify(state));forged.providerCampaign.customers.find(row=>row.id===customer.id).prospectDemandId='standard';assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_PROSPECT_DEMAND/);
 const command={type:'advance',minutes:1},expected=SOC.dispatch(state,command),box={postMessage:message=>box.result=message};vm.runInNewContext(SOC.workerSource(),box);box.onmessage({data:{id:1,state:JSON.parse(JSON.stringify(state)),command}});assert.equal(box.result.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(box.result.state)),expected);
});

test('AC-SOC-887 regular and peak prospects support different paid portfolio strategies across settled windows',()=>{
 const run=(offerId,planId)=>{let state=qualifiedOpening();state=buy(state,{action:'plan',offerId,planId});state=operate(state,215);const customerId='next-1-customer';
  if(offerId.endsWith('-a'))for(const operationId of ['bpo','after-call-assistance']){state=buy(state,{action:'operation',operationId,customerId});for(let n=0;n<30&&!state.providerCampaign.projects.some(project=>project.customerId===customerId&&project.operationId===operationId&&project.status==='complete');n++)state=operate(state,state.clock+1);assert.ok(state.providerCampaign.projects.some(project=>project.customerId===customerId&&project.operationId===operationId&&project.status==='complete'));}
  return operate(state,360);
 };
 const narrow=run('next-1','swift'),peak=run('next-1-a','steady');
 const rows=state=>state.providerCampaign.customers.find(customer=>customer.id==='next-1-customer').history.filter(period=>period.fullPeriod);
 assert.ok(rows(narrow).length>=2);assert.ok(rows(peak).length>=2);
 assert.ok(rows(narrow).slice(-2).every(period=>period.due===24&&period.completedOnTime>=22&&period.qualified));
 assert.ok(rows(peak).slice(-2).every(period=>period.due===24&&period.completedOnTime>=22&&period.qualified));
 assert.ok(narrow.providerCampaign.periodHistory.slice(-2).every(period=>period.operatingResult>0));
 assert.ok(peak.providerCampaign.periodHistory.slice(-2).every(period=>period.operatingResult>0));
 assert.deepEqual(SOC.restore(JSON.stringify(peak)),peak);
});

test('AC-SOC-888 older campaigns retain their one-lead offer shape while the authored peak opening gains a lower-demand alternative',()=>{
 const legacy=SOC.create({experience:'campaign'});assert.equal(legacy.providerCampaign.prospectChoiceVersion,undefined);assert.deepEqual(SOC.provider.inspect(legacy).offers.map(row=>row.id),['starter','next-1']);assert.deepEqual(SOC.restore(JSON.stringify(legacy)),legacy);
 const peak=SOC.create({experience:'campaign',openingVariant:'peak-window'}),other=SOC.provider.inspect(peak).offers.find(row=>row.id==='next-1-a');assert.equal(other.workload.scheduledVoicePeak,2);assert.equal(other.retailCents,240000);
 const forged=JSON.parse(JSON.stringify(legacy));forged.providerCampaign.prospectChoiceVersion=1;assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_PROSPECT_CHOICE_VERSION/);
});

test('AC-SOC-910 a continued SMB career chooses cash headroom or a funded short-response premium from equivalent states',()=>{
 let checkpoint=qualifiedOpening();checkpoint=buy(checkpoint,{action:'plan',offerId:'next-1',planId:'swift'});checkpoint=operate(checkpoint,190);
 assert.equal(checkpoint.providerCampaign.status,'won');checkpoint=SOC.dispatch(checkpoint,{type:'provider',command:{action:'continue-career'}});checkpoint=operate(checkpoint,300);
 const view=SOC.provider.inspect(checkpoint),regular=view.offers.find(row=>row.id==='next-2'),short=view.offers.find(row=>row.id==='next-2-a');
 assert.deepEqual([regular.available,regular.retailCents,regular.workload.deadlineMinutes],[true,260000,8]);
 assert.deepEqual([short.available,short.retailCents,short.workload.deadlineMinutes,short.expiresAt],[true,300000,5,view.clock+150]);
 const quote=SOC.provider.quote(checkpoint,{action:'plan',offerId:short.id,planId:'steady'});assert.deepEqual(quote.blockers,[]);assert.equal(quote.commercial.sla.deadlineMinutes,5);assert.equal(quote.commercial.retailCents,300000);
 const previous=structuredClone(checkpoint);previous.providerCampaign.prospectChoiceVersion=1;assert.deepEqual(SOC.provider.inspect(SOC.restore(JSON.stringify(previous))).offers.map(row=>row.id),['starter','next-2']);
 let lean=buy(SOC.restore(JSON.stringify(checkpoint)),{action:'plan',offerId:regular.id,planId:'swift'}),unfunded=buy(SOC.restore(JSON.stringify(checkpoint)),{action:'plan',offerId:short.id,planId:'swift'}),funded=buy(SOC.restore(JSON.stringify(checkpoint)),{action:'plan',offerId:short.id,planId:'steady'});
 funded=operate(funded,315);funded=buy(funded,{action:'operation',operationId:'bpo',customerId:'next-2-customer'});funded=operate(funded,321);funded=buy(funded,{action:'operation',operationId:'after-call-assistance',customerId:'next-2-customer'});
 lean=operate(lean,420);unfunded=operate(unfunded,420);funded=operate(funded,420);
 const outcome=state=>state.providerCampaign.customers.find(row=>row.id==='next-2-customer').history.find(row=>row.period===6),result=state=>state.providerCampaign.periodHistory.find(row=>row.period===6);
 assert.equal(outcome(lean).qualified,true);assert.equal(outcome(unfunded).qualified,false);assert.equal(outcome(funded).qualified,true);
 assert.ok(outcome(funded).completedOnTime>outcome(unfunded).completedOnTime);assert.ok(result(funded).operatingResult>result(lean).operatingResult);
 assert.ok(lean.business.balance.cash>funded.business.balance.cash,'the higher-period return requires an up-front commitment');
 assert.equal(funded.providerCampaign.customers.find(row=>row.id==='next-2-customer').prospectDemandId,'short-promise');assert.deepEqual(SOC.restore(JSON.stringify(funded)),funded);
 const forged=structuredClone(funded);forged.providerCampaign.customers.find(row=>row.id==='next-2-customer').prospectDemandId='standard';assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_PROSPECT_DEMAND/);
 const command={type:'advance',minutes:1},expected=SOC.dispatch(funded,command),box={postMessage:message=>box.result=message};vm.createContext(box);vm.runInContext(SOC.workerSource(),box);box.onmessage({data:{id:910,state:JSON.parse(JSON.stringify(funded)),command}});assert.equal(box.result.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(box.result.state)),expected);
});
