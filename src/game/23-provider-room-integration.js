/* Paid, version-scoped synthetic meeting-room interoperability evidence. */
function socProviderRoomIntegrationKernel(){
 'use strict';
 const VERSION=1,OPERATION_ID='direct-room-integration',OPERATION={setupCents:50000,periodCents:12000,workMinutes:8,engineers:1,support:1},
  EDGE_ID='room-to-interop',SOURCE_ID='d-ms-meetings-room',TARGET_ID='d-cisco-meetings-interoperability',
  SOURCE_FAMILY='microsoft:meetings-rooms',TARGET_FAMILY='cisco:meetings-devices',SOURCE_FEATURE='room-devices',TARGET_FEATURE='interop-join',RESOURCE='room',
  SOURCE_ID_REF='uc-new:family:microsoft:meetings-rooms',TARGET_ID_REF='uc-new:family:cisco:meetings-devices',
  copy=x=>x==null?x:JSON.parse(JSON.stringify(x)),plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x),
  exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(','),
  same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),int=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max,
  fail=code=>{throw new Error(code);};
 function productsApi(){return typeof SOC_PRODUCTS!=='undefined'?SOC_PRODUCTS:require('./45-products.js');}
 function childOf(state,customer){return state?.portfolio?.customers?.find(x=>x.id===customer?.portfolioId||x.id===customer?.id)?.root||null;}
 function customerOf(state,id){return state?.providerCampaign?.customers?.find(x=>x.id===id)||null;}
 function projectOf(state,id){return state?.providerCampaign?.projects?.find(x=>x.id===id)||null;}
 function projectPostingValid(state,project){
  if(!project||project.status!=='complete'||!project.postingId||!int(project.completedAt)||project.completedAt>state.clock)return false;
  const posting=state.business?.ledger?.find(x=>x.id===project.postingId);
  if(posting)return posting.category==='cost'&&posting.cents===project.setupCents&&posting.customerId===project.customerId&&posting.projectId===project.id&&posting.providerCampaign===true;
  const number=Number(/^entry-([1-9]\d*)$/.exec(project.postingId)?.[1]||0);
  return number>0&&number<=(state.business?.ledgerPrunedThrough||0);
 }
 function deployment(root,id,family,feature){
  const row=root?.products?.deployments?.find(x=>x.id===id);if(!row)return {row:null,missing:`deployment-missing:${id}`};
  const config=row.effective,binding=config?.bindings?.find(x=>x.feature===feature&&same(x.resources,[RESOURCE]));
  if(row.provisioning?.status!=='ready'||row.provisioning?.generation!==row.generation||!config||config.family!==family||!config.productVersion||!config.features?.includes(feature)||!binding)return {row,missing:`deployment-not-current:${id}:${feature}`};
  return {row,config,binding:copy(binding)};
 }
 function featureAvailable(value,row,feature){
  return value?.available===true;
 }
 function validatedOperationProject(state,customerId,projectId){
  if(!projectId)return null;const project=projectOf(state,projectId);
  return project?.kind==='operation'&&project.operationId===OPERATION_ID&&project.customerId===customerId&&project.setupCents===OPERATION.setupCents&&project.periodCents===OPERATION.periodCents&&project.workMinutes===OPERATION.workMinutes&&project.engineers===OPERATION.engineers&&project.support===OPERATION.support&&projectPostingValid(state,project)?project:null;
 }
 function setupPostingValid(state,project){
  if(!project||project.kind!=='operation'||project.operationId!==OPERATION_ID||project.setupCents!==OPERATION.setupCents||!project.postingId)return false;
  const posting=state.business?.ledger?.find(x=>x.id===project.postingId);
  if(posting)return posting.category==='cost'&&posting.cents===OPERATION.setupCents&&posting.customerId===project.customerId&&posting.projectId===project.id&&posting.providerCampaign===true;
  const number=Number(/^entry-([1-9]\d*)$/.exec(project.postingId)?.[1]||0);
  return number>0&&number<=(state.business?.ledgerPrunedThrough||0);
 }
 function paidRecipeProject(state,customerId,recipeId){
  const project=state?.providerCampaign?.projects?.findLast(x=>x.customerId===customerId&&x.productId===recipeId&&x.status==='complete'&&projectPostingValid(state,x));
  return project||null;
 }
 function buildPlan(root,hooks={}){
  const missing=[],source=deployment(root,SOURCE_ID,SOURCE_FAMILY,SOURCE_FEATURE),target=deployment(root,TARGET_ID,TARGET_FAMILY,TARGET_FEATURE);
  if(source.missing)missing.push(source.missing);if(target.missing)missing.push(target.missing);
  const room=root?.resources?.room,roomConfig=room?.effective;
  if(!room||room.provisioning?.status!=='ready'||room.provisioning.generation!==room.generation||!roomConfig?.enabled||!roomConfig.calendar)missing.push('effective-meeting-room-required');
  if(roomConfig&&(!['bridge','guest'].includes(roomConfig.mode)||roomConfig.interop!==true))missing.push('room-must-offer-interop-mode');
  let actualPath=null;try{if(typeof hooks.meetingPath==='function')actualPath=hooks.meetingPath(root,'identity','room','meeting');}catch{}
  if(actualPath?.ready!==true||actualPath.kbps!==5000)missing.push('current-room-transport-path-required');
  const observed=typeof hooks.resourceReady==='function'?hooks.resourceReady(root,RESOURCE):null;
  if(observed!==true&&observed?.ready!==true)missing.push(observed?.reason||'current-room-observation-required');
  if(roomConfig?.recording===true){for(const dependency of ['recorder','archive']){const ready=typeof hooks.resourceReady==='function'?hooks.resourceReady(root,dependency):null;if(ready!==true&&ready?.ready!==true)missing.push(`room-recording-dependency-required:${dependency}`);}}
  if(roomConfig?.captions===true){for(const dependency of ['speech','archive']){const ready=typeof hooks.resourceReady==='function'?hooks.resourceReady(root,dependency):null;if(ready!==true&&ready?.ready!==true)missing.push(`room-caption-dependency-required:${dependency}`);}}
  const sourceFeature=!source.missing&&typeof hooks.featureStatus==='function'?hooks.featureStatus(root,SOURCE_ID,SOURCE_FEATURE):null;
  const targetFeature=!target.missing&&typeof hooks.featureStatus==='function'?hooks.featureStatus(root,TARGET_ID,TARGET_FEATURE):null;
  if(!featureAvailable(sourceFeature,source.row,SOURCE_FEATURE))missing.push(sourceFeature?.code||'current-room-device-feature-required');
  if(!featureAvailable(targetFeature,target.row,TARGET_FEATURE))missing.push(targetFeature?.code||'current-interop-feature-required');
  const existing=root?.products?.integrations?.find(x=>x.id===EDGE_ID);
  const pairs=[{sourceFeature:SOURCE_FEATURE,targetFeature:TARGET_FEATURE}];
  if(existing&&(existing.source!==SOURCE_ID||existing.target!==TARGET_ID||!same(existing.features,pairs)))missing.push('room-integration-edge-conflict');
  let edgeAction='create';
  if(existing){edgeAction=existing.sourceGeneration!==source.row?.generation||existing.targetGeneration!==target.row?.generation||existing.sourceVersion!==source.config?.productVersion||existing.targetVersion!==target.config?.productVersion?'rebase':'reuse';}
  const edge={id:EDGE_ID,source:SOURCE_ID,target:TARGET_ID,features:pairs};
  const result={version:VERSION,source:{deploymentId:SOURCE_ID,family:SOURCE_FAMILY,productVersion:source.config?.productVersion||null,generation:source.row?.generation||null,feature:SOURCE_FEATURE,binding:source.binding||null},target:{deploymentId:TARGET_ID,family:TARGET_FAMILY,productVersion:target.config?.productVersion||null,generation:target.row?.generation||null,feature:TARGET_FEATURE,binding:target.binding||null},edge,edgeAction,sourceIds:[SOURCE_ID_REF,TARGET_ID_REF]};
  return {status:missing.length?'blocked':'ready',missing:[...new Set(missing)],plan:source.row&&target.row?result:null};
 }
 function canOrder(state,customerId,hooks={}){
  const missing=[],customer=customerOf(state,customerId),root=childOf(state,customer);
  if(!customer||!root||!['active','renewal'].includes(customer.status)||root.experience?.kind==='lab'||root.mode==='sandbox')missing.push('active-provider-customer-required');
  for(const id of ['ms-meetings-room','cisco-meetings-interoperability'])if(!paidRecipeProject(state,customerId,id))missing.push(`paid-product-project-required:${id}`);
  const prepared=root?buildPlan(root,hooks):{missing:['customer-root-required']};missing.push(...prepared.missing);
  return {eligible:missing.length===0,missing:[...new Set(missing)],plan:prepared.plan};
 }
 function operationQuote(){return {operationId:OPERATION_ID,recipeVersion:VERSION,...OPERATION,resource:'room',sourceIds:['uc-new:domain:room-joining',SOURCE_ID_REF,TARGET_ID_REF]};}
 function validPlan(value){
  return exact(value,['version','source','target','edge','edgeAction','sourceIds'])&&value.version===VERSION&&
   exact(value.source,['deploymentId','family','productVersion','generation','feature','binding'])&&value.source.deploymentId===SOURCE_ID&&value.source.family===SOURCE_FAMILY&&value.source.feature===SOURCE_FEATURE&&typeof value.source.productVersion==='string'&&int(value.source.generation)&&exact(value.source.binding,['feature','resources'])&&value.source.binding.feature===SOURCE_FEATURE&&same(value.source.binding.resources,[RESOURCE])&&
   exact(value.target,['deploymentId','family','productVersion','generation','feature','binding'])&&value.target.deploymentId===TARGET_ID&&value.target.family===TARGET_FAMILY&&value.target.feature===TARGET_FEATURE&&typeof value.target.productVersion==='string'&&int(value.target.generation)&&exact(value.target.binding,['feature','resources'])&&value.target.binding.feature===TARGET_FEATURE&&same(value.target.binding.resources,[RESOURCE])&&
   exact(value.edge,['id','source','target','features'])&&value.edge.id===EDGE_ID&&value.edge.source===SOURCE_ID&&value.edge.target===TARGET_ID&&same(value.edge.features,[{sourceFeature:SOURCE_FEATURE,targetFeature:TARGET_FEATURE}])&&['create','rebase','reuse'].includes(value.edgeAction)&&same(value.sourceIds,[SOURCE_ID_REF,TARGET_ID_REF]);
 }
 function samePlanScope(current,accepted){
  if(!validPlan(current)||!validPlan(accepted))return false;
  const left=copy(current),right=copy(accepted);left.edgeAction='scope';right.edgeAction='scope';return same(left,right);
 }
 function integrationCommands(plan){if(!validPlan(plan))fail('INVALID_PROVIDER_ROOM_INTEGRATION_PLAN');if(plan.edgeAction==='reuse')return [];return [{type:'products',command:plan.edgeAction==='create'?{action:'integration',id:EDGE_ID,source:SOURCE_ID,target:TARGET_ID,features:[{sourceFeature:SOURCE_FEATURE,targetFeature:TARGET_FEATURE}]}:{action:'rebase-integration',id:EDGE_ID}}];}
 function testCommands(plan){if(!validPlan(plan))fail('INVALID_PROVIDER_ROOM_INTEGRATION_PLAN');return [{type:'products',command:{action:'test-integration',id:EDGE_ID}}];}
 function validAcceptance(row,plan,session){
  return exact(row,['version','edgeId','testAt','acceptedAt','meetingProfileGeneration','bookingId','source','target','path'])&&row.version===VERSION&&row.edgeId===EDGE_ID&&int(row.testAt)&&int(row.acceptedAt)&&row.acceptedAt===session.startedAt&&row.acceptedAt>=row.testAt&&row.bookingId===session.bookingId&&row.meetingProfileGeneration===session.joinProfileGeneration&&
   exact(row.source,['deploymentId','productVersion','generation','feature'])&&row.source.deploymentId===SOURCE_ID&&row.source.productVersion===plan.source.productVersion&&row.source.generation===plan.source.generation&&row.source.feature===SOURCE_FEATURE&&
   exact(row.target,['deploymentId','productVersion','generation','feature'])&&row.target.deploymentId===TARGET_ID&&row.target.productVersion===plan.target.productVersion&&row.target.generation===plan.target.generation&&row.target.feature===TARGET_FEATURE&&validPath(row.path,row.acceptedAt);
 }
 function validPath(path,at){return exact(path,['availableKbps','checkedAt','edges','from','kbps','latencyMs','profile','ready','to'])&&path.checkedAt===at&&path.from==='identity'&&path.to==='room'&&path.profile==='meeting'&&path.ready===true&&path.kbps===5000&&Array.isArray(path.edges)&&path.edges.length<=100&&path.edges.every(x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x))&&(path.latencyMs===null||int(path.latencyMs))&&(path.availableKbps===null||int(path.availableKbps));}
 function pathAt(root,at,hooks={}){
  if(typeof hooks.meetingPath!=='function')return null;
  let actual;try{actual=hooks.meetingPath(root,'identity','room','meeting');}catch{return null;}
  if(!actual||actual.ready!==true||actual.kbps!==5000)return null;
  const path={availableKbps:actual.availableKbps??null,checkedAt:at,edges:copy(actual.edges||[]),from:'identity',kbps:5000,latencyMs:actual.latencyMs??null,profile:'meeting',ready:true,to:'room'};
  return validPath(path,at)?path:null;
 }
 function acceptedSnapshot(root,booking,session,at,hooks={}){
  if(!booking||!session||session.joinMethod!=='bridge'||session.startedAt!==null&&session.startedAt!==at||session.bookingId!==booking.id)return null;
  const prepared=buildPlan(root,hooks);if(prepared.status!=='ready'||!prepared.plan)return null;
  const edge=root.products.integrations.find(x=>x.id===EDGE_ID),result=edge?.result;
  if(!matchingTest(result,prepared.plan)||!int(result.checkedAt)||result.checkedAt>at)return null;
  const path=pathAt(root,at,hooks);if(!path)return null;
  const snapshot={version:VERSION,edgeId:EDGE_ID,testAt:result.checkedAt,acceptedAt:at,meetingProfileGeneration:session.joinProfileGeneration,bookingId:booking.id,source:{deploymentId:SOURCE_ID,productVersion:prepared.plan.source.productVersion,generation:prepared.plan.source.generation,feature:SOURCE_FEATURE},target:{deploymentId:TARGET_ID,productVersion:prepared.plan.target.productVersion,generation:prepared.plan.target.generation,feature:TARGET_FEATURE},path};
  return validAcceptance(snapshot,prepared.plan,{...session,startedAt:at})?snapshot:null;
 }
 function observeAccepted(root,booking,session,accepted,at,hooks={}){
  if(!booking||!session||!accepted||accepted.acceptedAt!==session.startedAt||session.bookingId!==booking.id)return null;
  const prepared=buildPlan(root,hooks);if(prepared.status!=='ready'||!prepared.plan||!currentTest(root,prepared.plan,accepted.testAt))return null;
  if(!validAcceptance(accepted,prepared.plan,session))return null;
  const path=pathAt(root,at,hooks);return path?{...copy(accepted),path}:null;
 }
 function matchingTest(result,plan){return result?.status==='scenario-verified'&&result.synthetic===true&&result.externalSupportClaim===false&&result.sourceGeneration===plan.source.generation&&result.targetGeneration===plan.target.generation&&result.sourceVersion===plan.source.productVersion&&result.targetVersion===plan.target.productVersion&&result.checks?.length===1&&result.checks[0].sourceFeature===SOURCE_FEATURE&&result.checks[0].targetFeature===TARGET_FEATURE&&result.checks[0].source?.available===true&&result.checks[0].target?.available===true;}
 function matchingRecordedTest(result,plan){return ['scenario-verified','blocked'].includes(result?.status)&&result.synthetic===true&&result.externalSupportClaim===false&&int(result.checkedAt)&&result.sourceGeneration===plan.source.generation&&result.targetGeneration===plan.target.generation&&result.sourceVersion===plan.source.productVersion&&result.targetVersion===plan.target.productVersion&&Array.isArray(result.checks)&&result.checks.length===1&&result.checks[0].sourceFeature===SOURCE_FEATURE&&result.checks[0].targetFeature===TARGET_FEATURE&&typeof result.checks[0].source?.available==='boolean'&&typeof result.checks[0].target?.available==='boolean'&&Array.isArray(result.reasons);}
 function retainedTests(edge){return [edge?.result,...(edge?.testHistory?.version===1&&Array.isArray(edge.testHistory.entries)?edge.testHistory.entries:[]).map(x=>x.result),...(edge?.history||[]).map(x=>x.result)];}
 function currentTest(root,plan,testAt){
  const edge=root?.products?.integrations?.find(x=>x.id===EDGE_ID),result=edge?.result,source=root?.products?.deployments?.find(x=>x.id===SOURCE_ID),target=root?.products?.deployments?.find(x=>x.id===TARGET_ID),retained=retainedTests(edge).some(row=>row?.checkedAt===testAt&&matchingTest(row,plan));
  return !!edge&&edge.source===SOURCE_ID&&edge.target===TARGET_ID&&same(edge.features,[{sourceFeature:SOURCE_FEATURE,targetFeature:TARGET_FEATURE}])&&edge.sourceGeneration===plan.source.generation&&edge.targetGeneration===plan.target.generation&&edge.sourceVersion===plan.source.productVersion&&edge.targetVersion===plan.target.productVersion&&!!source&&!!target&&source.generation===plan.source.generation&&target.generation===plan.target.generation&&source.effective?.productVersion===plan.source.productVersion&&target.effective?.productVersion===plan.target.productVersion&&matchingTest(result,plan)&&retained;
 }
 function retainedTestMatches(root,plan,test){
  if(!test||!int(test.checkedAt)||!matchingTest(test,plan))return false;
  const edge=root?.products?.integrations?.find(x=>x.id===EDGE_ID);
  return retainedTests(edge).some(row=>row?.checkedAt===test.checkedAt&&same(row,test)&&matchingTest(row,plan));
 }
 function retainedRecordedTestMatches(root,plan,test){
  if(!test||!matchingRecordedTest(test,plan))return false;
  const edge=root?.products?.integrations?.find(x=>x.id===EDGE_ID);
  return retainedTests(edge).some(row=>row?.checkedAt===test.checkedAt&&same(row,test)&&matchingRecordedTest(row,plan));
 }
 function retainedDeployment(root,expected){
  const row=root?.products?.deployments?.find(x=>x.id===expected?.deploymentId);if(!row)return false;
  if(row.generation===expected.generation&&row.effective?.productVersion===expected.productVersion)return true;
  if((row.effectiveHistory||[]).some(x=>x.generation===expected.generation&&x.effective?.productVersion===expected.productVersion))return true;
  return (row.retirementHistory||[]).some(x=>x.configurationGeneration===expected.generation&&x.configuration?.productVersion===expected.productVersion);
 }
 function commissioningProject(state,project){
  return !!project&&project.kind==='operation'&&project.operationId===OPERATION_ID&&project.status==='commissioning'&&project.setupCents===OPERATION.setupCents&&project.periodCents===OPERATION.periodCents&&project.workMinutes===OPERATION.workMinutes&&project.engineers===OPERATION.engineers&&project.support===OPERATION.support&&project.configSubmittedAt===project.dueAt&&project.configSubmittedAt===project.acceptedAt+OPERATION.workMinutes&&int(project.acceptedAt)&&int(project.configSubmittedAt)&&setupPostingValid(state,project);
 }
 function createReceipt(state,projectId,hooks={}){
  const project=projectOf(state,projectId),customer=project&&customerOf(state,project.customerId),root=childOf(state,customer);
  if(!project||project.kind!=='operation'||project.operationId!==OPERATION_ID||!['running','commissioning'].includes(project.status)||!customer||!root||project.setupCents!==OPERATION.setupCents||project.periodCents!==OPERATION.periodCents||project.workMinutes!==OPERATION.workMinutes||project.engineers!==OPERATION.engineers||project.support!==OPERATION.support||!setupPostingValid(state,project))return null;
  const prepared=buildPlan(root,hooks),quoted=project.roomIntegrationPlan;if(!prepared.plan||!validPlan(prepared.plan)||!validPlan(quoted)||!samePlanScope(prepared.plan,quoted))return null;
  return {kind:'provider-room-integration',version:VERSION,projectId:project.id,postingId:project.postingId,customerId:customer.id,submittedAt:state.clock,plan:copy(quoted),test:null,evidence:null};
 }
 function receiptDraftValid(state,project){
  if(!commissioningProject(state,project)&&!(project?.status==='complete'&&project.operationId===OPERATION_ID&&project.kind==='operation'&&project.setupCents===OPERATION.setupCents&&project.periodCents===OPERATION.periodCents&&project.workMinutes===OPERATION.workMinutes&&project.engineers===OPERATION.engineers&&project.support===OPERATION.support&&project.configSubmittedAt===project.dueAt&&project.configSubmittedAt===project.acceptedAt+OPERATION.workMinutes&&int(project.acceptedAt)&&int(project.configSubmittedAt)&&setupPostingValid(state,project)))return false;
  const receipt=project.operationReceipt;
  if(!exact(receipt,['kind','version','projectId','postingId','customerId','submittedAt','plan','test','evidence'])||receipt.kind!=='provider-room-integration'||receipt.version!==VERSION||receipt.projectId!==project.id||receipt.postingId!==project.postingId||receipt.customerId!==project.customerId||receipt.submittedAt!==project.configSubmittedAt||!validPlan(receipt.plan)||!same(project.roomIntegrationPlan,receipt.plan))return false;
  if(receipt.test===null)return true;
  const root=childOf(state,customerOf(state,project.customerId));
  return !!root&&retainedRecordedTestMatches(root,receipt.plan,receipt.test)&&receipt.test.checkedAt>=receipt.submittedAt&&receipt.test.checkedAt<=state.clock;
 }
 function captureTest(state,projectId,hooks={}){
  const project=projectOf(state,projectId);if(!receiptDraftValid(state,project))return false;
  const receipt=project.operationReceipt,customer=customerOf(state,project.customerId),root=childOf(state,customer),prepared=buildPlan(root,hooks),edge=root?.products?.integrations?.find(x=>x.id===EDGE_ID),result=edge?.result;
  if(!prepared.plan||!samePlanScope(prepared.plan,receipt.plan)||!matchingRecordedTest(result,receipt.plan)||result.checkedAt!==state.clock)return false;
  receipt.test=copy(result);return true;
 }
 function meetingOrigin(state,customer,session,booking){
  const p=state?.providerCampaign;if(!p||!customer||!session||!booking||session.status!=='completed')return null;
  const job=p.jobs.find(row=>row.customerId===customer.id&&row.channel==='meeting'&&row.sessionId===session.id);
  if(job){
   const prefix=`pc-${customer.id}-${job.periodIndex}-`,index=Number(job.caseId?.slice(prefix.length));
   if(typeof job.caseId!=='string'||job.interactionId!==null||!['completed','late'].includes(job.status)||job.completedAt!==session.endedAt||job.arrivalAt!==booking.start||job.arrivalAt!==session.scheduledAt||booking.caseId!==job.caseId||booking.end!==job.arrivalAt+3||booking.attendees!==1||job.periodIndex!==Math.floor((job.arrivalAt-1)/60)||!job.caseId.startsWith(prefix)||!int(index,0,23)||job.caseId!==prefix+index||!int(job.deadlineAt,job.arrivalAt)||((job.completedAt<=job.deadlineAt)!==(job.status==='completed')))return null;
   const event=p.events.find(row=>row.code==='CUSTOMER_WORK_ARRIVED'&&row.customerId===customer.id&&row.jobId===job.id&&row.caseId===job.caseId&&row.channel==='meeting'&&row.interactionId===null&&row.at===job.arrivalAt&&row.deadlineAt===job.deadlineAt);
   return event?{kind:'provider-job',id:job.id,eventId:event.id}:null;
  }
  const row=p.meetings.find(row=>row.customerId===customer.id&&row.status==='scheduled'&&row.sessionId===session.id&&row.bookingId===booking.id&&row.attemptedAt===booking.start&&row.attemptedAt===session.scheduledAt&&row.periodIndex===Math.floor((row.attemptedAt-1)/60));
  if(!row||booking.caseId!==undefined)return null;
  const event=p.events.find(event=>event.code==='MISSION_MEETING_BOOKED'&&event.customerId===customer.id&&event.periodIndex===row.periodIndex&&event.sessionId===session.id&&event.at===row.attemptedAt);
  return event?{kind:'mission-meeting',periodIndex:row.periodIndex,eventId:event.id}:null;
 }
 function validMeetingOrigin(state,customer,session,booking,origin){
  if(!origin||!(origin.kind==='provider-job'&&exact(origin,['kind','id','eventId'])||origin.kind==='mission-meeting'&&exact(origin,['kind','periodIndex','eventId'])))return false;
  const actual=meetingOrigin(state,customer,session,booking);return !!actual&&same(origin,actual);
 }
 function meetingEvidenceForProject(state,project,hooks={},historical=false){
  const missing=[],customer=customerOf(state,project?.customerId),root=childOf(state,customer),receipt=project?.operationReceipt;
  if(!customer||!root||!receiptDraftValid(state,project)||!receipt.test){return {ready:false,missing:['paid-room-integration-receipt-required'],evidence:null};}
  if(historical){
   if(!retainedTestMatches(root,receipt.plan,receipt.test)||!retainedDeployment(root,receipt.plan.source)||!retainedDeployment(root,receipt.plan.target))return {ready:false,missing:['retained-room-integration-test-and-deployments-required'],evidence:null};
  }else if(!currentTest(root,receipt.plan,receipt.test.checkedAt))return {ready:false,missing:['current-room-integration-test-required'],evidence:null};
  const sessions=(root.information?.meetingSessions||[]).filter(x=>x.status==='completed'&&x.joinMethod==='bridge'&&int(x.startedAt)&&int(x.endedAt)&&x.startedAt>receipt.submittedAt&&x.startedAt>receipt.test.checkedAt&&x.endedAt>x.startedAt&&(project.status!=='complete'||x.endedAt<=project.completedAt)).sort((a,b)=>a.startedAt-b.startedAt||a.id.localeCompare(b.id));
  let meeting=null;
  for(const session of sessions){
   const booking=root.information?.bookings?.find(x=>x.id===session.bookingId);if(!booking||booking.probeEvidence||booking.nonCommercial===true||session.probe===true||session.endedAt>booking.end)continue;
   const origin=meetingOrigin(state,customer,session,booking);if(!origin)continue;
   if(historical){if(!validHistoricalMeeting(root,session,booking,receipt,project))continue;meeting=historicalMeetingReceipt(root,session,booking);}
   else{const checked=meetingSession(state,customer.id,session.id,{hooks});if(checked.status!=='ready')continue;meeting=checked.evidence;}
   if(meeting){meeting.origin=origin;break;}
  }
  if(!meeting)missing.push('completed-duration-bearing-bridge-meeting-after-test-required');
  const completedAt=project.status==='complete'?project.completedAt:null;
  const evidence=meeting?{version:VERSION,customerId:customer.id,projectId:project.id,postingId:project.postingId,submittedAt:receipt.submittedAt,completedAt,meeting}:null;
  return {ready:missing.length===0,missing,evidence};
 }
 function historicalMeetingReceipt(root,session,booking){
  const accepted=session.productIntegration;
  return {version:VERSION,tenant:typeof root.tenant==='string'?root.tenant:null,customerId:session.customerId||root.providerCustomer?.id||null,sessionId:session.id,bookingId:booking.id,startedAt:session.startedAt,endedAt:session.endedAt,acceptance:copy(accepted),sourceIds:[SOURCE_ID_REF,TARGET_ID_REF]};
 }
 function validHistoricalMeeting(root,session,booking,receipt,project){
  const accepted=session.productIntegration,plan=receipt.plan;if(!accepted||session.productIntegrationAuditId===undefined)return false;
  if(session.id!==project.operationReceipt.evidence?.meeting?.sessionId&&project.operationReceipt.evidence!==null)return false;
  if(!validAcceptance(accepted,plan,session)||accepted.testAt!==receipt.test.checkedAt||accepted.acceptedAt!==session.startedAt||accepted.bookingId!==booking.id||session.startedAt<=receipt.submittedAt||session.startedAt<=receipt.test.checkedAt)return false;
  if(session.endedAt<=session.startedAt||session.endedAt>booking.end||project.status==='complete'&&session.endedAt>project.completedAt)return false;
  if(!retainedTestMatches(root,plan,receipt.test)||!retainedDeployment(root,plan.source)||!retainedDeployment(root,plan.target))return false;
  const auditId=session.productIntegrationAuditId,audit=root.information?.audit?.find(x=>x.auditId===auditId);
  if(audit){if(audit.code!=='MEETING_SESSION_STARTED'||audit.at!==session.startedAt||audit.session!==session.id||audit.booking!==booking.id||!same(audit.productIntegration,accepted))return false;}
  else if(!int(auditId,1,(root.information?.nextAuditId||1)-1)||auditId>(root.information?.auditPrunedThrough||0))return false;
  return true;
 }
 function historicalEvidenceValid(state,project){
  const customer=customerOf(state,project.customerId),root=childOf(state,customer),receipt=project.operationReceipt,evidence=receipt?.evidence;
  if(!customer||!root||!setupPostingValid(state,project)||project.status!=='complete'||!int(project.completedAt)||project.completedAt>state.clock||!exact(receipt,['kind','version','projectId','postingId','customerId','submittedAt','plan','test','evidence'])||receipt.kind!=='provider-room-integration'||receipt.version!==VERSION||receipt.projectId!==project.id||receipt.postingId!==project.postingId||receipt.customerId!==customer.id||receipt.submittedAt!==project.configSubmittedAt||!validPlan(receipt.plan)||!same(project.roomIntegrationPlan,receipt.plan)||!int(receipt.test?.checkedAt)||receipt.test.checkedAt<receipt.submittedAt||!matchingTest(receipt.test,receipt.plan)||!exact(evidence,['version','customerId','projectId','postingId','submittedAt','completedAt','meeting'])||evidence.version!==VERSION||evidence.customerId!==customer.id||evidence.projectId!==project.id||evidence.postingId!==project.postingId||evidence.submittedAt!==receipt.submittedAt||evidence.completedAt!==project.completedAt)return false;
  const meeting=evidence.meeting,session=root.information?.meetingSessions?.find(x=>x.id===meeting?.sessionId),booking=session&&root.information?.bookings?.find(x=>x.id===meeting.bookingId);
  if(!session||!booking||session.status!=='completed'||session.joinMethod!=='bridge'||session.bookingId!==booking.id||session.startedAt<=receipt.submittedAt||session.startedAt<=receipt.test.checkedAt||session.endedAt<=session.startedAt||session.endedAt>project.completedAt||booking.probeEvidence||booking.nonCommercial===true||session.probe===true||session.endedAt>booking.end)return false;
  if(!exact(meeting,['version','tenant','customerId','sessionId','bookingId','startedAt','endedAt','acceptance','sourceIds','origin'])||meeting.version!==VERSION||meeting.tenant!==root.tenant||meeting.customerId!==customer.id||meeting.sessionId!==session.id||meeting.bookingId!==booking.id||meeting.startedAt!==session.startedAt||meeting.endedAt!==session.endedAt||!same(meeting.sourceIds,[SOURCE_ID_REF,TARGET_ID_REF])||!same(meeting.acceptance,session.productIntegration)||!validMeetingOrigin(state,customer,session,booking,meeting.origin))return false;
  return validHistoricalMeeting(root,session,booking,receipt,project);
 }
 function projectEvidence(state,projectId,hooks={}){
  const project=projectOf(state,projectId);if(!project)return {ready:false,missing:['paid-room-integration-project-required'],evidence:null};
  if(project.status==='complete'&&project.operationReceipt?.evidence!==null)return historicalEvidenceValid(state,project)?{ready:true,missing:[],evidence:copy(project.operationReceipt.evidence)}:{ready:false,missing:['retained-paid-room-integration-evidence-invalid'],evidence:null};
  if(!receiptDraftValid(state,project))return {ready:false,missing:['paid-room-integration-receipt-required'],evidence:null};
  return meetingEvidenceForProject(state,project,hooks,false);
 }
 function validUnconfiguredProject(state,project,status){return !!project&&project.kind==='operation'&&project.operationId===OPERATION_ID&&project.status===status&&project.setupCents===OPERATION.setupCents&&project.periodCents===OPERATION.periodCents&&project.workMinutes===OPERATION.workMinutes&&project.engineers===OPERATION.engineers&&project.support===OPERATION.support&&int(project.acceptedAt)&&project.dueAt===project.acceptedAt+OPERATION.workMinutes&&project.configSubmittedAt===null&&project.operationReceipt===undefined&&validPlan(project.roomIntegrationPlan)&&setupPostingValid(state,project);}
 function validateProjectEvidence(state,project,hooks={}){
  if(!project||project.operationId!==OPERATION_ID)return {valid:false,missing:['paid-room-integration-project-required']};
  if(validUnconfiguredProject(state,project,'running')||validUnconfiguredProject(state,project,'cancelled'))return {valid:true,missing:[]};
  if(project.status==='complete')return historicalEvidenceValid(state,project)?{valid:true,missing:[]}:{valid:false,missing:['retained-paid-room-integration-evidence-invalid']};
  return receiptDraftValid(state,project)?{valid:true,missing:[]}:{valid:false,missing:['paid-room-integration-receipt-invalid']};
 }
 function sessionEvidence(root,sessionId,options={}){
  const missing=[],session=root?.information?.meetingSessions?.find(x=>x.id===sessionId),booking=session&&root.information.bookings.find(x=>x.id===session.bookingId);
  if(!session||!booking)missing.push('meeting-session-booking-lineage-required');
  if(session&&(!booking||session.status!=='completed'||!int(session.startedAt)||!int(session.endedAt)||session.endedAt<=session.startedAt||session.endedAt>root.clock))missing.push('completed-duration-bearing-meeting-required');
  if(booking?.probeEvidence||booking?.nonCommercial===true||session?.probe===true)missing.push('non-probe-meeting-required');
  const plan=buildPlan(root,options.hooks||{}).plan;if(!plan)missing.push('current-integration-plan-required');
  const acceptance=session?.productIntegration;
  if(!plan||!validAcceptance(acceptance,plan,session||{}))missing.push('meeting-must-retain-current-two-feature-acceptance');
  if(plan&&acceptance&&!currentTest(root,plan,acceptance.testAt))missing.push('accepted-directional-edge-test-not-current');
  if(session&&booking&&session.endedAt>booking.end)missing.push('meeting-ended-outside-booked-window');
  const evidence=missing.length?null:{version:VERSION,tenant:typeof root.tenant==='string'?root.tenant:null,sessionId,bookingId:booking.id,startedAt:session.startedAt,endedAt:session.endedAt,acceptance:copy(acceptance)};
  return {status:missing.length?'incomplete':'ready',missing:[...new Set(missing)],evidence};
 }
 function meetingSession(state,customerId,sessionId,options={}){
  const customer=customerOf(state,customerId),root=childOf(state,customer),result=sessionEvidence(root,sessionId,options),missing=[...result.missing];
  if(!customer||!root)missing.push('provider-customer-root-required');
  const booking=root?.information?.bookings?.find(x=>x.id===result.evidence?.bookingId);
  if(booking?.tenant!==undefined&&booking.tenant!==root?.tenant)missing.push('meeting-tenant-scope-mismatch');
  if(booking?.externalGuest&&booking.externalGuest.hostTenant!==root?.tenant)missing.push('meeting-foreign-guest-host-scope-mismatch');
  const evidence=missing.length?null:{...result.evidence,customerId,tenant:root.tenant,sourceIds:[SOURCE_ID_REF,TARGET_ID_REF]};
  return {status:missing.length?'incomplete':'ready',missing:[...new Set(missing)],evidence};
 }
 function validateEvidence(state,customerId,evidence,options={}){
  const missing=[];if(!exact(evidence,['version','customerId','tenant','sourceIds','sessionId','bookingId','startedAt','endedAt','acceptance'])||evidence.version!==VERSION||evidence.customerId!==customerId||!Array.isArray(evidence.sourceIds)||!same(evidence.sourceIds,[SOURCE_ID_REF,TARGET_ID_REF])||!int(evidence.startedAt)||!int(evidence.endedAt)||evidence.endedAt<=evidence.startedAt)fail('INVALID_PROVIDER_ROOM_INTEGRATION_EVIDENCE');
  const customer=customerOf(state,customerId),root=childOf(state,customer);if(!customer||!root||root.tenant!==evidence.tenant)fail('INVALID_PROVIDER_ROOM_INTEGRATION_EVIDENCE');
  const found=meetingSession(state,customerId,evidence.sessionId,{hooks:options.hooks});if(found.status!=='ready'||!same(found.evidence,evidence))missing.push(...found.missing,'retained-meeting-evidence-mismatch');
  const edge=root.products?.integrations?.find(x=>x.id===EDGE_ID);const tested=edge?.result?.status==='scenario-verified'&&edge.result.checkedAt===evidence.acceptance.testAt&&edge.result.sourceGeneration===evidence.acceptance.source.generation&&edge.result.targetGeneration===evidence.acceptance.target.generation&&edge.result.sourceVersion===evidence.acceptance.source.productVersion&&edge.result.targetVersion===evidence.acceptance.target.productVersion;
  const historical=(edge?.history||[]).some(x=>x.result?.checkedAt===evidence.acceptance.testAt&&x.result?.status==='scenario-verified'&&x.result.sourceGeneration===evidence.acceptance.source.generation&&x.result.targetGeneration===evidence.acceptance.target.generation&&x.result.sourceVersion===evidence.acceptance.source.productVersion&&x.result.targetVersion===evidence.acceptance.target.productVersion);
  if(!tested&&!historical)missing.push('accepted-directional-edge-test-not-retained');
  if(options.current===true&&(!tested||edge.sourceGeneration!==root.products.deployments.find(x=>x.id===SOURCE_ID)?.generation||edge.targetGeneration!==root.products.deployments.find(x=>x.id===TARGET_ID)?.generation))missing.push('current-room-integration-generation-required');
  return {valid:missing.length===0,missing:[...new Set(missing)]};
 }
 function source(){return `const SOC_PROVIDER_ROOM_INTEGRATION=(${socProviderRoomIntegrationKernel.toString()})();`;}
 return {VERSION,OPERATION_ID,OPERATION,EDGE_ID,SOURCE_ID,TARGET_ID,SOURCE_FEATURE,TARGET_FEATURE,operationQuote,buildPlan,canOrder,integrationCommands,testCommands,acceptedSnapshot,observeAccepted,sessionEvidence,meetingSession,validateEvidence,createReceipt,captureTest,projectEvidence,validateProjectEvidence,validPlan,source};
}
const SOC_PROVIDER_ROOM_INTEGRATION=socProviderRoomIntegrationKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_ROOM_INTEGRATION;
