/* Paid, named Provider support assignments and market-window evidence. */
function socProviderRegionalSupportKernel(){
 'use strict';
 const PACK='soc-provider-regional-support-1',VERSION=1,CONTENT='provider-regional-support-1';
 const OPERATION_ID='provider-support-coverage',MAX_CUSTOMERS_PER_PERSON=2;
 const C3='progress.goal.'+'c3',C5='progress.goal.'+'c5',T2='progress.goal.'+'t2',LEVEL7='progress.progression-level.7';
 const MARKETS=Object.freeze({
  'au-sydney':Object.freeze({language:'en'}),
  'au-melbourne':Object.freeze({language:'en'}),
  'us-seattle':Object.freeze({language:'en'}),
  'jp-tokyo':Object.freeze({language:'ja'}),
  'eu-dublin':Object.freeze({language:'en'})
 });
 const PERSON_NAMES=Object.freeze({'support-au-sydney-01':'Ari Chen','support-au-melbourne-01':'Sam Patel','support-us-seattle-01':'Morgan Reed','support-jp-tokyo-01':'Ren Sato','support-eu-dublin-01':'Alex Byrne'});
 const PEOPLE=Object.freeze({
  'support-au-sydney-01':Object.freeze({id:'support-au-sydney-01',employer:'orchard-msp',market:'au-sydney',languages:Object.freeze(['en']),skills:Object.freeze(['support'])}),
  'support-au-melbourne-01':Object.freeze({id:'support-au-melbourne-01',employer:'orchard-msp',market:'au-melbourne',languages:Object.freeze(['en']),skills:Object.freeze(['support'])}),
  'support-us-seattle-01':Object.freeze({id:'support-us-seattle-01',employer:'orchard-msp',market:'us-seattle',languages:Object.freeze(['en']),skills:Object.freeze(['support'])}),
  'support-jp-tokyo-01':Object.freeze({id:'support-jp-tokyo-01',employer:'orchard-msp',market:'jp-tokyo',languages:Object.freeze(['ja']),skills:Object.freeze(['support'])}),
  'support-eu-dublin-01':Object.freeze({id:'support-eu-dublin-01',employer:'orchard-msp',market:'eu-dublin',languages:Object.freeze(['en']),skills:Object.freeze(['support'])})
 });
 const COVERAGE=Object.freeze({
  'business-hours':Object.freeze({shiftStart:480,shiftEnd:1200,setupCents:9000,periodCents:8000,workMinutes:4,engineers:0,support:1}),
  extended:Object.freeze({shiftStart:0,shiftEnd:1440,setupCents:18000,periodCents:16000,workMinutes:6,engineers:0,support:1}),
  'distributor-extended':Object.freeze({shiftStart:0,shiftEnd:1440,setupCents:24000,periodCents:12000,workMinutes:8,engineers:0,support:1})
 });
 const fail=code=>{throw new Error(code);},copy=x=>JSON.parse(JSON.stringify(x));
 const integer=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x);
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
 const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
 const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 function responsibilityApi(){return typeof SOC_PROVIDER_RESPONSIBILITY!=='undefined'?SOC_PROVIDER_RESPONSIBILITY:require('./23-provider-responsibility.js');}
 function factsApi(){return typeof SOC_PROVIDER_PROGRESSION_FACTS!=='undefined'?SOC_PROVIDER_PROGRESSION_FACTS:require('./23-provider-progression.js');}
 function productsApi(){return typeof SOC_PRODUCTS!=='undefined'?SOC_PRODUCTS:require('./45-products.js');}
 function rootFor(s,c,hooks={}){return typeof hooks.customerRoot==='function'?hooks.customerRoot(s,c.portfolioId):s?.portfolio?.customers?.find(x=>x.id===c.portfolioId)?.root||null;}
 function customerFor(s,customerId){return s?.providerCampaign?.customers?.find(c=>c.id===customerId)||null;}
 function marketFor(s,c,hooks={}){const row=s?.portfolio?.customers?.find(x=>x.id===c?.portfolioId);return row?.market||c?.market||null;}
 function providerOrganizationReady(s){const org=s?.business?.organisations?.['orchard-msp'];return !!org?.roles?.includes('msp')&&!!org?.roles?.includes('reseller');}
 function replacementEdge(from,to){return from==='business-hours'&&['extended','distributor-extended'].includes(to)||from==='extended'&&to==='distributor-extended'||from==='distributor-extended'&&to==='extended';}
 function earnedReceipt(s,market,receiptId){return s.providerCampaign?.progressionReceipts?.receipts?.find(r=>(!receiptId||r.id===receiptId)&&r.sourceId===LEVEL7&&integer(r.at)&&r.at<=s.clock&&r.unlock?.operationId===OPERATION_ID&&r.unlock?.coverageId==='distributor-extended'&&Array.isArray(r.unlock.allowedMarkets)&&r.unlock.allowedMarkets.includes(market));}
 function earnedTerms(s,customerId,hooks={}){
  const c=customerFor(s,customerId),market=c&&marketFor(s,c),receipt=earnedReceipt(s,market),distributor=c&&distributorEvidence(s,c,hooks),missing=[];
  if(s.providerCampaign?.contentVersion!=='provider-campaigns-8')missing.push('PROVIDER_CONTENT_EIGHT_REQUIRED');
  if(!receipt)missing.push('EARNED_DISTRIBUTOR_SUPPORT_MARKET_REQUIRED');if(!distributor)missing.push('CURRENT_DISTRIBUTOR_SUPPORT_TARIFF_REQUIRED');
  return {eligible:missing.length===0,missing,evidence:missing.length?null:{version:1,sourceId:LEVEL7,receiptId:receipt.id,allowedMarkets:[...receipt.unlock.allowedMarkets],acceptedAt:s.clock,distributor:copy(distributor)}};
 }
 function purchaseCommercialValid(s,project){
  const e=project.supportCommercialEvidence,c=customerFor(s,project.customerId),market=c&&marketFor(s,c),receipt=e&&earnedReceipt(s,market,e.receiptId);
  return s.providerCampaign?.contentVersion==='provider-campaigns-8'&&exact(e,['version','sourceId','receiptId','allowedMarkets','acceptedAt','distributor'])&&e.version===1&&e.sourceId===LEVEL7&&!!receipt&&same(e.allowedMarkets,receipt.unlock.allowedMarkets)&&e.acceptedAt===project.acceptedAt&&receipt.at<=e.acceptedAt&&distributorSnapshotMatches(s,{customerId:project.customerId,distributor:e.distributor},project.acceptedAt);
 }
 function commercialValid(s,project,plan){
  if(plan.coverageId!=='distributor-extended')return project.supportCommercialEvidence===undefined&&project.operationReceipt?.commercial===undefined;
  if(!purchaseCommercialValid(s,project))return false;
  const e=project.operationReceipt?.commercial;if(!exact(e,['version','sourceId','receiptId','allowedMarkets','acceptedAt','distributor','deliveredAt','deliveryDistributor'])||!same(project.supportCommercialEvidence,Object.fromEntries(Object.entries(e).filter(([key])=>!['deliveredAt','deliveryDistributor'].includes(key)))))return false;
  if(project.status!=='complete')return e.deliveredAt===null&&e.deliveryDistributor===null;
  return e.deliveredAt===project.completedAt&&e.deliveredAt>=project.configSubmittedAt&&distributorSnapshotMatches(s,{customerId:project.customerId,distributor:e.deliveryDistributor},e.deliveredAt);
 }
 function completeEligibility(s,project,hooks={}){
  const request=project?.supportRequest;if(request?.coverageId!=='distributor-extended')return {eligible:true,missing:[],commissionEvidence:null};
  const missing=[];if(!purchaseCommercialValid(s,project))missing.push('INVALID_PROVIDER_SUPPORT_COMMERCIAL_LINEAGE');
  const c=customerFor(s,project.customerId),distributor=c&&distributorEvidence(s,c,hooks);if(!distributor)missing.push('CURRENT_DISTRIBUTOR_SUPPORT_TARIFF_REQUIRED');
  return {eligible:missing.length===0,missing,commissionEvidence:missing.length?null:{deliveredAt:s.clock,deliveryDistributor:copy(distributor)}};
 }
 function operationPlan(request){
  if(!exact(request,['customerId','market','personId','coverageId'])||!id(request.customerId)||!MARKETS[request.market]||!COVERAGE[request.coverageId])fail('INVALID_PROVIDER_SUPPORT_PLAN');
  const person=PEOPLE[request.personId];if(!person||person.market!==request.market||!person.languages.includes(MARKETS[request.market].language)||!person.skills.includes('support'))fail('PROVIDER_SUPPORT_PERSON_MARKET_MISMATCH');
  const coverage=COVERAGE[request.coverageId];
  return {version:VERSION,operationId:OPERATION_ID,customerId:request.customerId,market:request.market,personId:person.id,coverageId:request.coverageId,setupCents:coverage.setupCents,periodCents:coverage.periodCents,workMinutes:coverage.workMinutes,engineers:coverage.engineers,support:coverage.support,supportAssignment:{version:VERSION,personId:person.id,employer:person.employer,market:person.market,languages:[...person.languages],skills:[...person.skills],coverageId:request.coverageId,shiftStart:coverage.shiftStart,shiftEnd:coverage.shiftEnd,scopeCustomerIds:[request.customerId]}};
 }
 function paidPostingValid(s,project){
  if(!project||project.kind!=='operation'||!s.providerCampaign.projects.includes(project)||!id(project.id)||!id(project.customerId)||!id(project.postingId))return false;
  const row=s.business?.ledger?.find(x=>x.id===project.postingId);
  if(row)return row.category==='cost'&&row.reason==='provider-operation'&&row.customerId===project.customerId&&row.projectId===project.id&&row.cents===project.setupCents;
  const number=Number(/^entry-([1-9][0-9]*)$/.exec(project.postingId||'')?.[1]||0);
  return number>0&&number<=(s.business?.ledgerPrunedThrough||0);
 }
 function paidProject(s,project){return project?.operationId===OPERATION_ID&&paidPostingValid(s,project);}
 function requestedPlan(s,project){
  const request=project?.supportRequest;if(!request)return null;
  let plan;try{plan=operationPlan(request);}catch{return null;}
  if(project.customerId!==plan.customerId||marketFor(s,customerFor(s,project.customerId))!==plan.market||!paidProject(s,project)||['setupCents','periodCents','workMinutes','engineers','support'].some(k=>project[k]!==plan[k]))return null;
  if(plan.coverageId==='distributor-extended'?!purchaseCommercialValid(s,project):project.supportCommercialEvidence!==undefined)return null;return plan;
 }
 function reservedRows(s,at){
  const rows=allAssignments(s).filter(Boolean).filter(row=>assignmentEffectiveAt(row,at));
  for(const project of s.providerCampaign.projects||[]){
   if(project.operationId!==OPERATION_ID||!['running','commissioning','blocked'].includes(project.status)||project.serviceRetirement)continue;
   const plan=requestedPlan(s,project);if(!plan)fail('INVALID_PROVIDER_SUPPORT_RESERVATION');
   rows.push({project,customer:customerFor(s,project.customerId),assignment:plan.supportAssignment,plan});
  }
  return rows;
 }
 function operationReceiptValid(s,project,plan){
  const r=project?.operationReceipt;
  return exact(r,['kind','version','projectId','postingId','customerId','installedAt','supportAssignment',...(plan.coverageId==='distributor-extended'?['commercial']:[])])&&r.kind===OPERATION_ID&&r.version===VERSION&&r.projectId===project.id&&r.postingId===project.postingId&&r.customerId===project.customerId&&integer(r.installedAt)&&integer(project.configSubmittedAt)&&r.installedAt===project.configSubmittedAt-1&&same(r.supportAssignment,plan.supportAssignment)&&commercialValid(s,project,plan);
 }
 function assignmentForProject(s,project){
  const c=customerFor(s,project?.customerId),a=project?.operationReceipt?.supportAssignment;
  if(!c||!a)return null;
  let plan;try{plan=operationPlan({customerId:c.id,market:marketFor(s,c),personId:a.personId,coverageId:a.coverageId});}catch{return null;}
  if(!exact(a,['version','personId','employer','market','languages','skills','coverageId','shiftStart','shiftEnd','scopeCustomerIds'])||!same(a,plan.supportAssignment)||project.setupCents!==plan.setupCents||project.periodCents!==plan.periodCents||project.workMinutes!==plan.workMinutes||project.engineers!==plan.engineers||project.support!==plan.support||!operationReceiptValid(s,project,plan)||!paidProject(s,project))return null;
  return {project,customer:c,plan,assignment:copy(a)};
 }
 function replacementValid(s,project){
  if(project.supportReplacesProjectId===undefined)return true;
  const prior=s.providerCampaign.projects.find(p=>p.id===project.supportReplacesProjectId),old=prior&&assignmentForProject(s,prior),plan=requestedPlan(s,project);
  return !!old&&!!plan&&prior.customerId===project.customerId&&prior.status==='complete'&&integer(prior.completedAt)&&prior.completedAt<=project.acceptedAt&&(!prior.serviceRetirement||prior.serviceRetirement.effectiveAt>project.acceptedAt)&&old.assignment.personId===plan.personId&&replacementEdge(old.assignment.coverageId,plan.coverageId)&&prior.id!==project.id;
 }
 function allAssignments(s){
  const p=s?.providerCampaign;if(!p||!Array.isArray(p.projects))fail('PROVIDER_SUPPORT_CAMPAIGN_REQUIRED');
  const rows=p.projects.filter(x=>x.operationId===OPERATION_ID&&x.operationReceipt?.supportAssignment).map(project=>assignmentForProject(s,project));
  for(const row of rows.filter(Boolean)){
   const successor=rows.filter(next=>next&&next.project.status==='complete'&&next.project.supportReplacesProjectId===row.project.id&&replacementValid(s,next.project)).sort((a,b)=>a.project.completedAt-b.project.completedAt)[0];
   if(successor)row.replacedAt=successor.project.completedAt;
  }
  return rows;
 }
 function validate(s){
  const p=s?.providerCampaign;if(!p)return true;
  const projects=(p.projects||[]).filter(x=>x.operationId===OPERATION_ID);
  for(const project of projects){
   const receipt=project.operationReceipt;if(!replacementValid(s,project))fail('INVALID_PROVIDER_SUPPORT_REPLACEMENT');
   if(!receipt&&['running','blocked','cancelled'].includes(project.status)){if(!requestedPlan(s,project)||!integer(project.acceptedAt)||!integer(project.dueAt)||project.dueAt!==project.acceptedAt+project.workMinutes)fail('INVALID_PROVIDER_SUPPORT_RESERVATION');continue;}
   if(!receipt||!receipt.supportAssignment||!assignmentForProject(s,project))fail('INVALID_PROVIDER_SUPPORT_ASSIGNMENT');
   if(!['running','commissioning','complete','blocked','cancelled'].includes(project.status)||!integer(project.acceptedAt)||!integer(project.dueAt)||project.dueAt!==project.acceptedAt+project.workMinutes||project.configSubmittedAt!==project.dueAt||project.status==='complete'&&(!integer(project.completedAt)||project.completedAt<project.configSubmittedAt))fail('INVALID_PROVIDER_SUPPORT_PROJECT');
  }
  const rows=reservedRows(s,s.clock),scopeByPerson=new Map(),activeByCustomer=new Map();
  for(const row of rows){if(assignmentEffectiveAt(row,s.clock)||['running','commissioning','blocked'].includes(row.project.status)){const previous=activeByCustomer.get(row.customer.id);if(previous&&!(row.project.status!=='complete'&&row.project.supportReplacesProjectId===previous.id&&previous.status==='complete'))fail('INVALID_PROVIDER_SUPPORT_DUPLICATE_COVERAGE');activeByCustomer.set(row.customer.id,row.project);}const set=scopeByPerson.get(row.assignment.personId)||new Set();for(const customerId of row.assignment.scopeCustomerIds){if(!id(customerId)||marketFor(s,customerFor(s,customerId))!==row.assignment.market)fail('INVALID_PROVIDER_SUPPORT_SCOPE');set.add(customerId);}scopeByPerson.set(row.assignment.personId,set);}
  if([...scopeByPerson.values()].some(scope=>scope.size>MAX_CUSTOMERS_PER_PERSON))fail('INVALID_PROVIDER_SUPPORT_SCOPE_CAPACITY');
  return true;
 }
 function assignmentEffectiveAt(row,at,historical=false){const project=row?.project,retirement=project?.serviceRetirement;return project?.status==='complete'&&integer(project.completedAt)&&project.completedAt<=at&&(!integer(row.customer?.exitAt)||(historical?row.customer.exitAt>=at:row.customer.exitAt>at))&&(!integer(row.replacedAt)||row.replacedAt>at)&&(!retirement||!integer(retirement.effectiveAt)||retirement.effectiveAt>at);}
 function personCapacity(s,personId,candidateCustomerId,at=s?.clock){
  const limit=s?.business?.workforce?.support,rows=reservedRows(s,at),personIds=[...new Set(rows.map(x=>x.assignment.personId))];
  const personRows=rows.filter(x=>x.assignment.personId===personId),scope=new Set(personRows.flatMap(x=>x.assignment.scopeCustomerIds));
  if(candidateCustomerId)scope.add(candidateCustomerId);
  const used=new Set(personIds);if(candidateCustomerId&&!used.has(personId))used.add(personId);
  const missing=[];if(!integer(limit)||limit<1)missing.push('SHARED_PROVIDER_SUPPORT_SLOT_REQUIRED');if(used.size>(limit||0))missing.push('NAMED_SUPPORT_EXCEEDS_PAID_SHARED_SUPPORT_SLOTS');if(scope.size>MAX_CUSTOMERS_PER_PERSON)missing.push('NAMED_SUPPORT_SCOPE_LIMIT');
  return {ready:missing.length===0,missing,used:used.size,limit:integer(limit)?limit:0,personIds:[...used].sort(),personCustomerIds:[...scope].sort(),maximumCustomersPerPerson:MAX_CUSTOMERS_PER_PERSON};
 }
 function capacity(s,{personId,customerId}={}){
  if(personId&&!PEOPLE[personId])return {ready:false,missing:['UNKNOWN_PROVIDER_SUPPORT_PERSON'],used:0,limit:s?.business?.workforce?.support||0,personIds:[],personCustomerIds:[],maximumCustomersPerPerson:MAX_CUSTOMERS_PER_PERSON};
  return personCapacity(s,personId||null,customerId||null);
 }
 function canOrder(s,request,hooks={}){
  if(!s?.providerCampaign||!Array.isArray(s.providerCampaign.projects))return {eligible:false,missing:['PROVIDER_SUPPORT_CAMPAIGN_REQUIRED']};
  let plan;try{plan=operationPlan(request);}catch(error){return {eligible:false,missing:[error.message]};}
  const c=customerFor(s,request.customerId),missing=[];
  if(!c||!['active','renewal'].includes(c.status))missing.push('ACTIVE_PROVIDER_CUSTOMER_REQUIRED');
  if(c&&marketFor(s,c)!==plan.market)missing.push('CUSTOMER_MARKET_MISMATCH');
  if(!providerOrganizationReady(s))missing.push('ORCHARD_MSP_RESELLER_ROLE_REQUIRED');
  if((s.providerCampaign.projects||[]).some(p=>p.customerId===request.customerId&&p.operationId===OPERATION_ID&&['running','commissioning','blocked'].includes(p.status)&&!p.serviceRetirement))missing.push('SUPPORT_COVERAGE_ALREADY_PENDING');
  const current=allAssignments(s).find(x=>x?.customer.id===request.customerId&&assignmentEffectiveAt(x,s.clock));
  const replacement=current?.assignment.personId===plan.personId&&replacementEdge(current.assignment.coverageId,plan.coverageId)?current.project.id:null;
  if(current&&!replacement)missing.push('CUSTOMER_ALREADY_HAS_NAMED_SUPPORT_COVERAGE');
  const cap=personCapacity(s,request.personId,request.customerId,s.clock);if(!cap.ready)missing.push(...cap.missing);
  const commercial=plan.coverageId==='distributor-extended'?earnedTerms(s,request.customerId,hooks):null;if(commercial)missing.push(...commercial.missing);
  return {eligible:missing.length===0,missing:[...new Set(missing)],plan,capacity:cap,supportReplacesProjectId:replacement,earnedTerms:commercial?.evidence||null};
 }
 function activeCandidateRows(s,customerId,at){
  return allAssignments(s).filter(Boolean).filter(x=>x.customer.id===customerId&&assignmentEffectiveAt(x,at)).sort((a,b)=>b.project.completedAt-a.project.completedAt||b.project.acceptedAt-a.project.acceptedAt||b.project.id.localeCompare(a.project.id));
 }
 function implementationSupportAt(s,at,historical=false){return (s.providerCampaign.projects||[]).filter(p=>integer(p.acceptedAt)&&integer(p.dueAt)&&(historical?p.acceptedAt<at:p.acceptedAt<=at)&&at<p.dueAt&&(p.status!=='cancelled'||historical&&p.completedAt>=at)).reduce((n,p)=>n+(integer(p.support)?p.support:0),0);}
 function snapshotFor(s,row,at,limit,payroll,historical=false){
  const personId=row.assignment.personId,effective=allAssignments(s).filter(Boolean).filter(x=>assignmentEffectiveAt(x,at,historical)),samePerson=effective.filter(x=>x.assignment.personId===personId),scope=[...new Set(samePerson.flatMap(x=>x.assignment.scopeCustomerIds))].sort(),used=[...new Set(effective.map(x=>x.assignment.personId))].length;
  return {version:VERSION,projectId:row.project.id,postingId:row.project.postingId,personId,employer:row.assignment.employer,market:row.assignment.market,languages:[...row.assignment.languages],skills:[...row.assignment.skills],coverageId:row.assignment.coverageId,shiftStart:row.assignment.shiftStart,shiftEnd:row.assignment.shiftEnd,scopeCustomerIds:scope,acceptedAt:row.project.acceptedAt,effectiveAt:row.project.completedAt,usedSupportSlots:used,paidSupportSlots:limit,implementationSupportSlots:implementationSupportAt(s,at,historical),payrollPersonMinutes:payroll.personMinutes,payrollBilledMinutes:payroll.billedMinutes};
 }
 function distributorEvidence(s,c,hooks={}){
  const result=typeof hooks.responsibilities==='function'?hooks.responsibilities(s,c.id):responsibilityApi().responsibilities(s,c.id,{customerRoot:(state,portfolioId)=>rootFor(state,{portfolioId},hooks),observeResource:hooks.observeResource});
  const record=result.records?.find(x=>x.customerId===c.id&&x.role==='distributor'&&x.organisationId==='branch-distribution');
  if(!record)return null;
  const certificate=responsibilityApi().qualification(s,c.id,'partner-qualification',{customerRoot:(state,portfolioId)=>rootFor(state,{portfolioId},hooks),observeResource:hooks.observeResource}).certificate;
  return {id:record.id,role:record.role,organisationId:record.organisationId,customerId:record.customerId,scope:[...record.scope].sort(),projectId:record.projectId,postingId:record.postingId,acceptedAt:record.acceptedAt,effectiveAt:record.effectiveAt,expiresAt:record.expiresAt,qualificationId:record.evidence?.qualificationId,qualificationProjectId:record.evidence?.qualificationProjectId,qualificationPostingId:record.evidence?.qualificationPostingId,qualification:certificate?{version:certificate.version,id:certificate.id,customerId:certificate.customerId,issuerOrganizationId:certificate.issuerOrganizationId,holderOrganizationId:certificate.holderOrganizationId,scopes:[...certificate.scopes].sort(),acceptedAt:certificate.acceptedAt,effectiveAt:certificate.effectiveAt,expiresAt:certificate.expiresAt,projectId:certificate.projectId,postingId:certificate.postingId}:null};
 }
 function sample(s,customerId,at=s?.clock,hooks={}){
  const c=customerFor(s,customerId);if(!c||!integer(at))return {eligible:false,missing:['PROVIDER_CUSTOMER_REQUIRED'],namedSupport:null,distributor:null,capacity:{ready:false,missing:['PROVIDER_CUSTOMER_REQUIRED'],used:0,limit:0,personIds:[],personCustomerIds:[],maximumCustomersPerPerson:MAX_CUSTOMERS_PER_PERSON}};
  validate(s);const root=rootFor(s,c,hooks),market=marketFor(s,c,hooks),missing=[],rows=activeCandidateRows(s,c.id,at),selected=rows[0]||null,workforce=s.business?.workforce,payroll=s.providerCampaign?.payroll;
  if(!['active','renewal'].includes(c.status))missing.push('PROVIDER_CUSTOMER_NOT_ACTIVE');
  if(!root||root.providerCustomer?.id!==c.id||root.providerCustomer?.version!==1||root.providerCampaign||root.mode==='sandbox'||root.experience?.kind==='lab')missing.push('VALIDATED_PROVIDER_CUSTOMER_REQUIRED');
  if(!providerOrganizationReady(s))missing.push('NAMED_PROVIDER_EMPLOYER_REQUIRED');
  if(!selected)missing.push('PAID_NAMED_SUPPORT_REQUIRED');
  let capacityResult={ready:false,missing:['NAMED_SUPPORT_ASSIGNMENT_REQUIRED'],used:0,limit:integer(workforce?.support)?workforce.support:0,personIds:[],personCustomerIds:[],maximumCustomersPerPerson:MAX_CUSTOMERS_PER_PERSON};
  let namedSupport=null;
  if(selected){
   const a=selected.assignment,p=PEOPLE[a.personId],shiftMinute=at%1440;
   capacityResult=personCapacity(s,a.personId,null,at);const implementationSlots=implementationSupportAt(s,at);if(capacityResult.used+implementationSlots>capacityResult.limit)missing.push('NAMED_SUPPORT_BUSY_WITH_IMPLEMENTATION');if(!capacityResult.ready)missing.push(...capacityResult.missing);
   if(a.market!==market||p?.market!==market)missing.push('NAMED_SUPPORT_MARKET_MISMATCH');
   if(!MARKETS[market]||!a.languages.includes(MARKETS[market].language))missing.push('NAMED_SUPPORT_LANGUAGE_MISMATCH');
   if(!a.skills.includes('support'))missing.push('NAMED_SUPPORT_SKILL_REQUIRED');
   if(shiftMinute<a.shiftStart||shiftMinute>=a.shiftEnd)missing.push('NAMED_SUPPORT_OUT_OF_SHIFT');
   if(!integer(workforce?.support,1)||!integer(payroll?.personMinutes,1)||!integer(payroll?.billedMinutes,1)||!integer(payroll?.costCents,1))missing.push('PAID_SHARED_SUPPORT_PAYROLL_REQUIRED');
   if(payroll?.personMinutes>0&&payroll?.billedMinutes>0)namedSupport=snapshotFor(s,selected,at,capacityResult.limit,payroll);
  }
  const distributor=distributorEvidence(s,c,hooks);if(selected?.assignment.coverageId==='distributor-extended'&&!distributor)missing.push('CURRENT_DISTRIBUTOR_SUPPORT_TARIFF_REQUIRED');
  return {eligible:missing.length===0,missing:[...new Set(missing)],namedSupport,distributor,capacity:capacityResult};
 }
 function decodeSamples(s,hooks={}){
  if(Array.isArray(hooks.supportSamples))return copy(hooks.supportSamples);
  const observation=s?.providerCampaign?.supportObservation;if(!observation)return [];
  try{return factsApi().decodeSupportObservation(observation);}catch{return [];}
 }
 function retainedNamedSupportMatches(s,participant,at,options={}){
  const proof=participant?.namedSupport;if(!exact(proof,['version','projectId','postingId','personId','employer','market','languages','skills','coverageId','shiftStart','shiftEnd','scopeCustomerIds','acceptedAt','effectiveAt','usedSupportSlots','paidSupportSlots','implementationSupportSlots','payrollPersonMinutes','payrollBilledMinutes'])||proof.version!==VERSION)return false;
  const project=s.providerCampaign.projects.find(x=>x.id===proof.projectId&&x.postingId===proof.postingId&&x.customerId===participant.customerId),row=project&&allAssignments(s).find(x=>x?.project.id===project.id);if(!row||!assignmentEffectiveAt(row,at,true)||project.acceptedAt!==proof.acceptedAt||project.completedAt!==proof.effectiveAt||project.completedAt>at)return false;
  const expected=snapshotFor(s,row,at,proof.paidSupportSlots,{personMinutes:proof.payrollPersonMinutes,billedMinutes:proof.payrollBilledMinutes},true);
  // The per-minute support sample is the retained payroll/headcount observation.
  // The live team may later be downsized; historical verification uses its sampled limit.
  if(!integer(proof.paidSupportSlots,0,20)||!integer(proof.payrollPersonMinutes,1,s.providerCampaign.payroll.personMinutes)||!integer(proof.payrollBilledMinutes,1,Math.min(proof.payrollPersonMinutes,s.providerCampaign.payroll.billedMinutes)))return false;
  const workforce=participant.responsibility?.sharedWorkforce;if(workforce?(proof.paidSupportSlots!==workforce.support||proof.payrollPersonMinutes!==workforce.personMinutes||proof.payrollBilledMinutes!==workforce.billedMinutes):options.allowIneligible!==true)return false;
  if(!same(proof,expected))return false;if(options.allowIneligible===true)return true;if(proof.coverageId==='distributor-extended'&&!distributorSnapshotMatches(s,participant,at))return false;
  const minute=at%1440;return minute>=proof.shiftStart&&minute<proof.shiftEnd&&proof.languages.includes(MARKETS[participant.market]?.language)&&proof.skills.includes('support')&&proof.market===participant.market&&proof.scopeCustomerIds.includes(participant.customerId)&&proof.usedSupportSlots+proof.implementationSupportSlots<=proof.paidSupportSlots;
 }
 function distributorSnapshotMatches(s,participant,at){
  const saved=participant.distributor;if(saved===null||saved===undefined||!exact(saved,['id','role','organisationId','customerId','scope','projectId','postingId','acceptedAt','effectiveAt','expiresAt','qualificationId','qualificationProjectId','qualificationPostingId','qualification'])||!exact(saved.qualification,['version','id','customerId','issuerOrganizationId','holderOrganizationId','scopes','acceptedAt','effectiveAt','expiresAt','projectId','postingId']))return false;
  const api=responsibilityApi(),certificate=saved.qualification,qualificationProject=s.providerCampaign.projects.find(x=>x.id===certificate.projectId&&x.postingId===certificate.postingId&&x.customerId===participant.customerId&&x.operationId==='partner-qualification'&&x.kind==='operation'&&x.status==='complete'),project=s.providerCampaign.projects.find(x=>x.id===saved.projectId&&x.postingId===saved.postingId&&x.customerId===participant.customerId&&x.operationId==='distributor-room'&&x.kind==='operation'&&x.status==='complete');
  const retirement=project?.serviceRetirement;
  if(!qualificationProject||!project||!paidPostingValid(s,qualificationProject)||!paidPostingValid(s,project)||!integer(qualificationProject.completedAt)||qualificationProject.completedAt>at||!integer(project.completedAt)||project.completedAt>at||retirement&&integer(retirement.effectiveAt)&&retirement.effectiveAt<=at||!api.permits(certificate,participant.customerId,'distributor-room',at))return false;
  const qExpected={version:1,id:`provider-qualification-${qualificationProject.id}`,customerId:participant.customerId,issuerOrganizationId:'branch-distribution',holderOrganizationId:'orchard-msp',scopes:[...api.SCOPES].sort(),acceptedAt:qualificationProject.acceptedAt,effectiveAt:qualificationProject.completedAt,expiresAt:qualificationProject.completedAt+api.QUALIFICATION_MINUTES,projectId:qualificationProject.id,postingId:qualificationProject.postingId};
  const expected={id:`provider-responsibility-distributor-${project.id}`,role:'distributor',organisationId:'branch-distribution',customerId:participant.customerId,scope:[...(project.resources||[])].sort(),projectId:project.id,postingId:project.postingId,acceptedAt:project.acceptedAt,effectiveAt:project.completedAt,expiresAt:certificate.expiresAt,qualificationId:certificate.id,qualificationProjectId:certificate.projectId,qualificationPostingId:certificate.postingId,qualification:qExpected};
  const purchase=api.permits(certificate,participant.customerId,'distributor-room',project.acceptedAt)?certificate:s.providerCampaign.contentVersion==='provider-campaigns-8'?api.purchaseQualification(s,participant.customerId,project.acceptedAt):null;return same(saved,expected)&&api.permits(purchase,participant.customerId,'distributor-room',project.acceptedAt);
 }
 function sampleMatches(s,participant,at,hooks,options={}){
  if(participant.eligible!==true||!participant.responsibility||!participant.boundaries?.length||!retainedNamedSupportMatches(s,participant,at))return false;
  if(options.sourceId===LEVEL7)return distributorSnapshotMatches(s,participant,at);
  return true;
 }
 function marketEvidence(s,sourceId,hooks={},options={}){
  const samples=decodeSamples(s,hooks),minimum=60,missing=[];
  if(!Array.isArray(samples)||samples.some(x=>!x||!Array.isArray(x.cohort)||!Array.isArray(x.participants)||x.participants.some(p=>!p||typeof p!=='object')))return {sourceId,status:'incomplete',missing:['INVALID_PROVIDER_SUPPORT_SAMPLES'],evidence:null};
  if(samples.length!==minimum||samples.some((x,i)=>!x||!integer(x.at)||x.at>s.clock||i&&x.at!==samples[i-1].at+1))missing.push('SIXTY_CONSECUTIVE_PROVIDER_SUPPORT_SAMPLES_REQUIRED');
  const first=samples[0],last=samples.at(-1);if(!options.historical&&last?.at!==s.clock)missing.push('CURRENT_SUPPORT_SAMPLE_REQUIRED');const cohort=first?.cohort||[],participants=first?.participants||[];
  if(!Array.isArray(cohort)||cohort.length===0||new Set(cohort).size!==cohort.length||!same(cohort,[...cohort].sort())||!Array.isArray(participants)||participants.length!==cohort.length||!same(participants.map(x=>x.customerId),cohort))missing.push('STABLE_PROVIDER_CUSTOMER_COHORT_REQUIRED');
  if(samples.some(x=>!x||!same(x.cohort,cohort)||!Array.isArray(x.participants)||!same(x.participants.map(p=>p?.customerId),cohort)))missing.push('STABLE_PROVIDER_CUSTOMER_COHORT_REQUIRED');
  for(const row of participants){const c=customerFor(s,row.customerId);if(!c||marketFor(s,c,hooks)!==row.market||options.historical!==true&&!['active','renewal'].includes(c.status))missing.push('CURRENT_MARKET_CUSTOMER_REQUIRED');}
  const markets=[...new Set(participants.map(x=>x.market))].sort(),customerIds=[...cohort].sort();
  const threshold=sourceId===C3?{customers:3,markets:3}:sourceId===C5||sourceId===LEVEL7?{customers:5,markets:5}:{customers:3,markets:2};
  if(customerIds.length<threshold.customers)missing.push('PROVIDER_CUSTOMER_THRESHOLD_NOT_MET');
  if(markets.length<threshold.markets)missing.push('PROVIDER_MARKET_THRESHOLD_NOT_MET');
  if(sourceId===C5||sourceId===LEVEL7)for(const market of Object.keys(MARKETS))if(!markets.includes(market))missing.push(`PROVIDER_MARKET_REQUIRED:${market}`);
  for(const sampleRow of samples){
   if(!sampleRow||!Array.isArray(sampleRow.participants))continue;
   for(const p of sampleRow.participants){
    const initial=participants.find(x=>x.customerId===p.customerId);
    const stableFields=['market','configuration','resources','boundaries','integrations'];
    if(!initial||stableFields.some(k=>!same(p[k]??null,initial[k]??null))||p.namedSupport?.projectId!==initial.namedSupport?.projectId)missing.push(`SUPPORT_CONFIGURATION_CHANGED:${p.customerId}:${sampleRow.at}`);
    if(p.eligible!==true||!p.responsibility||!p.boundaries?.length)missing.push(`PROVIDER_SUPPORT_OR_BOUNDARY_MISSING:${p.customerId}:${sampleRow.at}`);
    if(!sampleMatches(s,p,sampleRow.at,hooks,options))missing.push(`NAMED_SUPPORT_NOT_CURRENT:${p.customerId}:${sampleRow.at}`);
    if(!validateSampleEvidence(s,p,sampleRow.at,sourceId,hooks))missing.push(`NAMED_SUPPORT_EVIDENCE_INVALID:${p.customerId}:${sampleRow.at}`);
    if(sourceId===LEVEL7){
     const requiredLanguage=MARKETS[p.market]?.language;if(!p.namedSupport?.languages?.includes(requiredLanguage))missing.push(`MARKET_LANGUAGE_MISSING:${p.customerId}:${sampleRow.at}`);
     const carrier=p.resources?.some(r=>r.id==='carrier'&&integer(r.generation,1));if(!carrier)missing.push(`CARRIER_NOT_CURRENT:${p.customerId}:${sampleRow.at}`);
     if(!p.distributor||p.distributor.role!=='distributor'||p.distributor.organisationId!=='branch-distribution'||p.distributor.customerId!==p.customerId||p.distributor.expiresAt!==null&&p.distributor.expiresAt<=sampleRow.at||!distributorSnapshotMatches(s,p,sampleRow.at))missing.push(`SCOPED_DISTRIBUTOR_REQUIRED:${p.customerId}:${sampleRow.at}`);
    }
   }
  }
  for(const customerId of customerIds){
   const participantRows=samples.flatMap(x=>x.participants.filter(p=>p.customerId===customerId));
   if(!participantRows.some(p=>(p.settlements||[]).some(q=>q.settledAt>=first.at-1&&q.settledAt<=last.at&&q.revenuePostingId)))missing.push(`NEW_EXTERNAL_BILL_REQUIRED:${customerId}`);
   if(!participantRows.some(p=>(p.freshJobs||[]).some(j=>j.startedAt>=first.at-1&&j.finishedAt<=last.at&&j.finishedAt>=j.startedAt&&j.jobId&&j.interactionId&&j.caseId&&j.person&&j.assignmentId)))missing.push(`FRESH_RESOLVED_HUMAN_WORK_REQUIRED:${customerId}`);
  }
  if(sourceId===T2){
   for(const row of samples){
    const edges=new Set(row.participants.flatMap(p=>(p.integrations||[]).filter(i=>integrationSnapshotValid(s,p,i,row.at,hooks)).map(i=>`${p.customerId}:${i.id}`)));
    if(edges.size<2)missing.push(`TWO_DISTINCT_CURRENT_INTEGRATIONS_REQUIRED:${row.at}`);
   }
  }
  if(!options.historical){
   let currentObservation=null;if(typeof hooks.currentSample!=='function'){try{currentObservation=factsApi().sampleSupport(s,hooks);}catch{currentObservation=null;}}
   for(const customerId of customerIds){
    const live=typeof hooks.currentSample==='function'?hooks.currentSample(s,customerId,s.clock):sample(s,customerId,s.clock,hooks),lastParticipant=last?.participants?.find(x=>x.customerId===customerId),factRow=currentObservation?.participants?.find(x=>x.customerId===customerId);
    if(live?.eligible!==true||factRow&&factRow.eligible!==true)missing.push(`CURRENT_NAMED_SUPPORT_REQUIRED:${customerId}`);
    if(factRow?.namedSupport&&lastParticipant?.namedSupport&&!same(factRow.namedSupport,lastParticipant.namedSupport))missing.push(`CURRENT_NAMED_SUPPORT_CHANGED:${customerId}`);
    if(factRow?.configuration&&lastParticipant?.configuration&&factRow.configuration!==lastParticipant.configuration)missing.push(`CURRENT_SUPPORT_CONFIGURATION_CHANGED:${customerId}`);
    if(sourceId===LEVEL7){
     const c=customerFor(s,customerId),root=c&&rootFor(s,c,hooks),observed=typeof hooks.observeResource==='function'&&hooks.observeResource(root,'carrier');
     if(!(observed===true||observed?.ready===true)||!distributorSnapshotMatches(s,lastParticipant,s.clock))missing.push(`CURRENT_CARRIER_OR_DISTRIBUTOR_REQUIRED:${customerId}`);
    }
   }
  }
  let validated=false;try{validated=typeof hooks.validateSupportSamples==='function'?hooks.validateSupportSamples(s,samples,hooks,{checkCurrent:false}):factsApi().validateSupportSamples(s,samples,hooks,{checkCurrent:false});}catch{validated=false;}
  if(validated!==true)missing.push('SOURCE_SUPPORT_SAMPLE_LINEAGE_INVALID');
  if(missing.length)return {sourceId,status:'incomplete',missing:[...new Set(missing)],evidence:null};
  const evidence={kind:'provider-regional-support-window-v1',version:VERSION,sourceId,interval:{from:first.at-1,to:last.at},customerIds,markets,samples:copy(samples)};
  return {sourceId,status:'ready',missing:[],evidence};
 }
 function integrationSnapshotValid(s,participant,edge,at,hooks={}){
  if(!exact(edge,['id','source','target','sourceVersion','targetVersion','sourceGeneration','targetGeneration','checkedAt','features'])||![edge.id,edge.source,edge.target,edge.sourceVersion,edge.targetVersion].every(x=>typeof x==='string'&&x.length>0)||!integer(edge.sourceGeneration,1)||!integer(edge.targetGeneration,1)||!integer(edge.checkedAt)||edge.checkedAt>at||!Array.isArray(edge.features)||!edge.features.length)return false;
  const c=customerFor(s,participant.customerId),root=c&&rootFor(s,c,hooks);if(!root)return false;
  if(typeof hooks.integrationValidAt==='function')return hooks.integrationValidAt(s,c,edge,at)===true;
  const actual=root.products?.integrations?.find(x=>x.id===edge.id);if(!actual)return false;
  const fieldsMatch=x=>x?.id===edge.id&&x.source===edge.source&&x.target===edge.target&&x.sourceVersion===edge.sourceVersion&&x.targetVersion===edge.targetVersion&&x.sourceGeneration===edge.sourceGeneration&&x.targetGeneration===edge.targetGeneration&&x.result?.status==='scenario-verified'&&x.result.synthetic===true&&x.result.externalSupportClaim===false&&x.result.checkedAt===edge.checkedAt&&same(x.features,edge.features);
  if(!fieldsMatch(actual))return false;
  let status;try{status=typeof hooks.integrationStatus==='function'?hooks.integrationStatus(root,edge.id):productsApi().compatibilityStatus(root,edge.id);}catch{return false;}
  return status?.status==='scenario-verified';
 }
 function validateSampleEvidence(s,participant,at,sourceId,hooks={}){
  if(!participant||!integer(at)||!id(participant.customerId))return false;
  if(participant.namedSupport!==null&&participant.namedSupport!==undefined&&!retainedNamedSupportMatches(s,participant,at))return false;
  if(participant.eligible===true&&!participant.namedSupport)return false;
  if(participant.distributor!==null&&participant.distributor!==undefined&&!distributorSnapshotMatches(s,participant,at))return false;
  if(sourceId===LEVEL7&&!distributorSnapshotMatches(s,participant,at))return false;
  if(participant.integrations!==undefined&&(!Array.isArray(participant.integrations)||participant.integrations.some(edge=>!integrationSnapshotValid(s,participant,edge,at,hooks))))return false;
  return true;
 }
 function evaluate(s,hooks={}){
  if(!s?.providerCampaign||s.experience?.kind!=='campaign'||s.experience?.custom!==false)fail('PROVIDER_REGIONAL_SUPPORT_CAMPAIGN_REQUIRED');
  const levels={};for(const sourceId of [C3,C5,T2,LEVEL7])levels[sourceId]=marketEvidence(s,sourceId,hooks);
  return {pack:PACK,version:VERSION,contentVersion:CONTENT,asOf:s.clock,levels};
 }
 function validateEvidence(s,sourceId,evidence,hooks={},options={}){
  if(![C3,C5,T2,LEVEL7].includes(sourceId))return false;
  if(!exact(evidence,['kind','version','sourceId','interval','customerIds','markets','samples'])||evidence.kind!=='provider-regional-support-window-v1'||evidence.version!==VERSION||evidence.sourceId!==sourceId||!exact(evidence.interval,['from','to'])||!integer(evidence.interval.from)||!integer(evidence.interval.to)||evidence.interval.to-evidence.interval.from!==60||!Array.isArray(evidence.samples)||evidence.samples.length!==60||!Array.isArray(evidence.customerIds)||new Set(evidence.customerIds).size!==evidence.customerIds.length||!same(evidence.customerIds,[...evidence.customerIds].sort())||!Array.isArray(evidence.markets)||!same(evidence.markets,[...evidence.markets].sort()))return false;
  const samples=evidence.samples;if(samples.some((x,i)=>!x||x.at!==evidence.interval.from+1+i||!Array.isArray(x.cohort)||!same(x.cohort,evidence.customerIds)||i&&x.at!==samples[i-1].at+1))return false;
  try{const rebuilt=marketEvidence(s,sourceId,{...hooks,supportSamples:samples},{historical:options.historical===true});return rebuilt.status==='ready'&&same(rebuilt.evidence,evidence);}catch{return false;}
 }
 function retentionPins(evidence,customerId){
  const pins={interactionIds:[],caseIds:[],jobIds:[],processingJobIds:[],recordIds:[],incidentIds:[],projectIds:[],customerIds:[],postingIds:[],boundaryContractIds:[],integrationIds:[],distributorProjectIds:[]};
  if(!evidence||evidence.kind!=='provider-regional-support-window-v1'||evidence.version!==VERSION)return pins;
  const uniq=x=>[...new Set(x.filter(v=>typeof v==='string'&&v.length>0))].sort(),samples=evidence.samples||[],participants=samples.flatMap(x=>x.participants||[]).filter(p=>customerId===undefined||p.customerId===customerId);
  pins.customerIds=uniq(participants.map(p=>p.customerId));
  pins.interactionIds=uniq(participants.flatMap(p=>(p.freshJobs||[]).map(j=>j.interactionId)));
  pins.caseIds=uniq(participants.flatMap(p=>(p.freshJobs||[]).map(j=>j.caseId)));
  pins.jobIds=uniq(participants.flatMap(p=>(p.freshJobs||[]).map(j=>j.jobId)));
  pins.processingJobIds=uniq(participants.flatMap(p=>(p.freshJobs||[]).filter(j=>j.channel==='processing').map(j=>j.jobId)));
  pins.recordIds=uniq(participants.flatMap(p=>(p.records||[]).map(r=>r.id)));
  pins.incidentIds=uniq(participants.flatMap(p=>(p.incidents||[]).map(i=>i.id)));
  pins.projectIds=uniq(participants.flatMap(p=>[p.namedSupport?.projectId,p.responsibility?.projectId,p.distributor?.projectId,p.distributor?.qualificationProjectId]));
  pins.postingIds=uniq(participants.flatMap(p=>[p.namedSupport?.postingId,p.responsibility?.postingId,p.distributor?.postingId,p.distributor?.qualificationPostingId,...(p.settlements||[]).flatMap(q=>[q.revenuePostingId,...(q.costPostingIds||[])])]));
  pins.boundaryContractIds=uniq(participants.flatMap(p=>(p.boundaries||[]).map(b=>b.id)));
  pins.integrationIds=uniq(participants.flatMap(p=>(p.integrations||[]).map(i=>i.id)));
  pins.distributorProjectIds=uniq(participants.flatMap(p=>[p.distributor?.projectId,p.distributor?.qualificationProjectId]));return pins;
 }
 function inspectCustomer(s,customerId,hooks={}){
  const c=customerFor(s,customerId);if(!c)return null;
  const market=marketFor(s,c,hooks),personId=Object.keys(PEOPLE).find(id=>PEOPLE[id].market===market);
  const current=sample(s,customerId,s.clock,hooks);
  return {version:VERSION,customerId,market,asOf:s.clock,current,person:personId?{...copy(PEOPLE[personId]),name:PERSON_NAMES[personId]}:null,offers:personId?Object.keys(COVERAGE).map(coverageId=>{const request={customerId,market,personId,coverageId},result=canOrder(s,request,hooks);return {operationId:OPERATION_ID,request,eligible:result.eligible,missing:result.missing,terms:operationPlan(request),supportReplacesProjectId:result.supportReplacesProjectId||null};}):[]};
 }
 function source(){return `const SOC_PROVIDER_REGIONAL_SUPPORT=(${socProviderRegionalSupportKernel.toString()})();`;}
 return {PACK,VERSION,CONTENT,OPERATION_ID,MAX_CUSTOMERS_PER_PERSON,MARKETS:copy(MARKETS),PEOPLE:copy(PEOPLE),COVERAGE:copy(COVERAGE),GOALS:{C3,C5,T2,LEVEL7},inspectCustomer,operationPlan,canOrder,earnedTerms,completeEligibility,assignment(s,customerId,at=s?.clock){validate(s);const row=activeCandidateRows(s,customerId,at)[0];return row?copy(row.assignment):null;},capacity,sample,validateSampleEvidence,validateNamedSupportSnapshot:retainedNamedSupportMatches,validateDistributorSnapshot:distributorSnapshotMatches,validateIntegrationSnapshot:integrationSnapshotValid,evaluate,validateEvidence,validate,retentionPins,source};
}
const SOC_PROVIDER_REGIONAL_SUPPORT=socProviderRegionalSupportKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_REGIONAL_SUPPORT;
