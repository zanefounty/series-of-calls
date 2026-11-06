/* Paid, version-scoped synthetic meeting-room interoperability evidence. */
function socProviderRoomIntegrationKernel(){
 'use strict';
 const VERSION=1,OPERATION_ID='direct-room-integration',OPERATION={setupCents:50000,periodCents:12000,workMinutes:8,engineers:1,support:1},
  EDGE_ID='room-to-interop',SOURCE_ID='d-ms-meetings-room',TARGET_ID='d-cisco-meetings-interoperability',
  SOURCE_FAMILY='microsoft:meetings-rooms',TARGET_FAMILY='cisco:meetings-devices',SOURCE_FEATURE='room-devices',TARGET_FEATURE='interop-join',RESOURCE='room',
  SOURCE_ID_REF='uc-new:family:microsoft:meetings-rooms',TARGET_ID_REF='uc-new:family:cisco:meetings-devices',
  copy=x=>x==null?x:JSON.parse(JSON.stringify(x)),plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x),
  exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(','),
  same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),int=x=>Number.isSafeInteger(x)&&x>=0,
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
  const observed=typeof hooks.resourceReady==='function'?hooks.resourceReady(root,RESOURCE):null;
  if(observed!==true&&observed?.ready!==true)missing.push(observed?.reason||'current-room-observation-required');
  const sourceFeature=typeof hooks.featureStatus==='function'?hooks.featureStatus(root,SOURCE_ID,SOURCE_FEATURE):null;
  const targetFeature=typeof hooks.featureStatus==='function'?hooks.featureStatus(root,TARGET_ID,TARGET_FEATURE):null;
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
  const actual=hooks.meetingPath(root,'identity','room','meeting');
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
 function retainedTests(edge){return [edge?.result,...(edge?.testHistory?.version===1&&Array.isArray(edge.testHistory.entries)?edge.testHistory.entries:[]).map(x=>x.result),...(edge?.history||[]).map(x=>x.result)];}
 function currentTest(root,plan,testAt){
  const edge=root?.products?.integrations?.find(x=>x.id===EDGE_ID),result=edge?.result,source=root?.products?.deployments?.find(x=>x.id===SOURCE_ID),target=root?.products?.deployments?.find(x=>x.id===TARGET_ID),retained=retainedTests(edge).some(row=>row?.checkedAt===testAt&&matchingTest(row,plan));
  return !!edge&&edge.source===SOURCE_ID&&edge.target===TARGET_ID&&same(edge.features,[{sourceFeature:SOURCE_FEATURE,targetFeature:TARGET_FEATURE}])&&edge.sourceGeneration===plan.source.generation&&edge.targetGeneration===plan.target.generation&&edge.sourceVersion===plan.source.productVersion&&edge.targetVersion===plan.target.productVersion&&!!source&&!!target&&source.generation===plan.source.generation&&target.generation===plan.target.generation&&source.effective?.productVersion===plan.source.productVersion&&target.effective?.productVersion===plan.target.productVersion&&matchingTest(result,plan)&&retained;
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
 return {VERSION,OPERATION_ID,OPERATION,EDGE_ID,SOURCE_ID,TARGET_ID,SOURCE_FEATURE,TARGET_FEATURE,operationQuote,buildPlan,canOrder,integrationCommands,testCommands,acceptedSnapshot,observeAccepted,sessionEvidence,meetingSession,validateEvidence,validPlan,source};
}
const SOC_PROVIDER_ROOM_INTEGRATION=socProviderRoomIntegrationKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_ROOM_INTEGRATION;
