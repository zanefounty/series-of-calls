/* Partial, evidence-backed communications progression. Source thresholds remain provenance. */
function socProgressionKernel(){
 'use strict';
 const PACK='soc-progression-1',VERSION=1,CONTENT='soc-progression-content-2';
 const observation=typeof SOC_SERVICE_OBSERVATION!=='undefined'?SOC_SERVICE_OBSERVATION:(typeof require==='function'?require('./39-service-observation.js'):null);
 function marketApi(){return typeof SOC_MARKET_QUALIFICATION!=='undefined'?SOC_MARKET_QUALIFICATION:(typeof require==='function'?require('./36-market-qualification.js'):null);}
 function callingApi(){return typeof SOC_CALLING_ACHIEVEMENTS!=='undefined'?SOC_CALLING_ACHIEVEMENTS:(typeof require==='function'?require('./33-calling-achievements.js'):null);}
 function capabilityApi(){return typeof SOC_CAPABILITY_PROGRESSION!=='undefined'?SOC_CAPABILITY_PROGRESSION:(typeof require==='function'?require('./31-capability-progression.js'):null);}
 function siteApi(){return typeof SOC_SITE_OPERATIONS!=='undefined'?SOC_SITE_OPERATIONS:(typeof require==='function'?require('./32-site-operations.js'):null);}
 const copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=code=>{throw new Error(code);},id=x=>typeof x==='string'&&/^[a-z][a-z0-9.-]{0,95}$/.test(x),int=x=>Number.isSafeInteger(x)&&x>=0;
 const keys=(x,want)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===want;
 const goalId=x=>`progress.goal.${x}`,levelId=x=>`progress.progression-level.${x}`;
 const levelIds=Array.from({length:13},(_,i)=>levelId(i+1));
 const goalIds=['bb','tr','ix','p5','ln','bz','rd','ca','pn','scrub','c3','t2','tb','df','m2','c5','gi','t10','t1'].map(goalId);
 const baseGoals=[goalId('bb'),goalId('ix'),goalId('bz'),goalId('rd'),goalId('tb'),goalId('t10'),goalId('c3'),goalId('c5'),goalId('t2'),goalId('t1')],baseLevels=[levelId(1),levelId(2),levelId(7),levelId(13)];
 const callingGoals=callingApi()?.goalIds||['tr','p5','ca','pn','scrub'].map(goalId),cap=capabilityApi(),sites=siteApi();
 const implementedGoals=[...baseGoals,...callingGoals,...(sites?.GOALS||['ln','df','m2'].map(goalId)),...(cap?.goalIds||[goalId('gi')])];
 const implementedLevels=[...baseLevels,...(cap?.levelIds||[3,4,5,6,8,9,10,11,12].map(levelId))];
 function packOf(s){const p=s?.progression;if(!p||p.pack!==PACK)fail('PROGRESSION_NOT_STARTED');return p;}
 function create(s){
  if(!s||!s.campaign||s.campaign.pack!=='soc-campaign-1'||!id(s.campaign.id))fail('PROGRESSION_CAMPAIGN_REQUIRED');
  return {pack:PACK,version:VERSION,contentVersion:CONTENT,campaignId:s.campaign.id,nextId:1,goals:Object.fromEntries(goalIds.map(sourceId=>[sourceId,{status:'pending',evidence:null}])),levels:Object.fromEntries(levelIds.map(sourceId=>[sourceId,{status:'locked',evidence:null}])),awards:[],journal:[]};
 }
 function activeContract(s){
  const b=s.business;if(!b||b.pack!=='soc-business-1')return null;
  return b.contracts.find(c=>c.status==='active'&&c.sell===true&&c.customer==='customer'&&c.billedPeriods>0&&c.supportOwner&&b.organisations?.[c.supportOwner]?.roles?.some(r=>['msp','integrator','bpo'].includes(r))&&
   b.ledger.some(x=>x.contract===c.id&&x.category==='revenue'&&x.currency==='AUD'&&x.cents>0)&&
   b.ledger.some(x=>x.contract===c.id&&x.category==='cost'&&x.currency==='AUD'&&x.cents>0))||null;
 }
 function supportContractForIntegration(s,integration){
  const b=s.business;if(!b)return false;
  const products=s.products,deployments=products?.deployments||[];
  const a=deployments.find(d=>d.id===integration.source),z=deployments.find(d=>d.id===integration.target);
  if(!a||!z)return false;
  const bound=new Set([...(a.effective?.bindings||[]),...(z.effective?.bindings||[])].flatMap(x=>x.resources||[]));
  return (b.contracts||[]).find(c=>c.status==='active'&&c.supportOwner&&b.organisations?.[c.supportOwner]?.roles?.some(r=>['msp','integrator'].includes(r))&&c.resources.some(x=>bound.has(x)))||null;
 }
 function supportedContract(s,contractId,roles=['msp','integrator','bpo']){
  const b=s.business,c=b?.contracts?.find(x=>x.id===contractId);
  return c&&c.customer==='customer'&&c.sell===true&&c.supportOwner&&b.organisations?.[c.supportOwner]?.roles?.some(r=>roles.includes(r))&&
   b.ledger.some(x=>x.contract===c.id&&x.category==='revenue'&&x.currency==='AUD'&&x.cents>0)&&
   b.ledger.some(x=>x.contract===c.id&&x.category==='cost'&&x.currency==='AUD'&&x.cents>0)?c:null;
 }
 function scenarioRoot(s,scenario){
  if(s.scenario===scenario)return s;
  const root=s.campaign?.snapshots?.[scenario]?.root;
  return root&&root.scenario===scenario?{...root,campaign:s.campaign}:null;
 }
 function observationCandidates(s,goal){
  const roots=[s,...Object.values(s.campaign?.snapshots||{}).map(x=>x?.root).filter(Boolean)],seen=new Set();
  return roots.filter(root=>{if(seen.has(root)||!root.serviceObservation)return false;seen.add(root);return root.serviceObservation.pack===observation?.PACK&&root.serviceObservation.proofs?.some(p=>p.goal===goal&&p.result?.status==='passed');}).sort((a,b)=>(b.serviceObservation.proofs.filter(p=>p.goal===goal).at(-1)?.completedAt||0)-(a.serviceObservation.proofs.filter(p=>p.goal===goal).at(-1)?.completedAt||0));
 }
 function observationEvidence(s,sourceId,hooks={},requireCurrent=true){
  if(!observation)return null;const goal=sourceId.slice('progress.goal.'.length);
  for(const root of observationCandidates(s,goal)){
   try{observation.validate(root);}catch{continue;}
   const pack=root.serviceObservation,proof=pack.proofs.filter(x=>x.goal===goal&&x.result.status==='passed').at(-1),window=proof&&pack.windows.find(x=>x.id===proof.window&&x.status==='passed');if(!proof||!window||proof.result?.status!=='passed')continue;
   if(requireCurrent){if(typeof hooks.observeResource!=='function'||observation.configurationFingerprint(root)!==proof.configuration)continue;const ready=observation.required[goal].every(id=>hooks.observeResource(root,id)?.ready===true);if(!ready)continue;}
   return {kind:'sustained-service-observation',sourceId,scenario:root.scenario,campaignId:s.campaign?.id||null,goal,windowId:window.id,configuration:proof.configuration,completedAt:proof.completedAt,at:proof.completedAt,window:copy(window),proof:copy(proof)};
  }
  return null;
 }
 function serviceWindowProof(s,track){
  const award=s.campaign?.progress?.[track]?.award;if(!award)return null;
  const service=s.campaign.progress[track].windows.find(w=>w.kind==='service'&&w.status==='passed'&&award.evidenceIds.includes(w.id));
  if(!service)return null;
  const trace=service.evidence?.traces?.interactions?.find(i=>i.phase==='resolved'&&i.caseId&&i.context===true&&Array.isArray(i.obligations)&&i.obligations.length===0);
  return trace?{awardKey:award.key,windowId:service.id,interaction:copy(trace)}:null;
 }
 function goalEvidence(s,sourceId,hooks={}){
  const marketGoals={ [goalId('c3')]:'c3',[goalId('c5')]:'c5',[goalId('t2')]:'t2',[goalId('t1')]:'t1' };
  if(marketGoals[sourceId])return marketEvidence(s,sourceId,marketGoals[sourceId],hooks);
  if(sourceId===goalId('bz')){
   const c=activeContract(s);return c?{kind:'accepted-supported-billed-contract',scenario:s.scenario,contractId:c.id,offer:c.offer,billedPeriods:c.billedPeriods,customer:c.customer,supportOwner:c.supportOwner,at:s.clock}:null;
  }
  if(sourceId===goalId('ix')){
   const products=s.products;if(products?.pack!=='soc-products-1')return null;
   for(const edge of products.integrations||[]){
    const a=products.deployments.find(d=>d.id===edge.source),b=products.deployments.find(d=>d.id===edge.target);
    const supportContract=supportContractForIntegration(s,edge);
    if(!a?.effective||!b?.effective||edge.sourceGeneration!==a.generation||edge.targetGeneration!==b.generation||edge.sourceVersion!==a.effective.productVersion||edge.targetVersion!==b.effective.productVersion||edge.result?.sourceGeneration!==a.generation||edge.result?.targetGeneration!==b.generation||edge.result?.sourceVersion!==a.effective.productVersion||edge.result?.targetVersion!==b.effective.productVersion||edge.result?.status!=='scenario-verified'||edge.result?.synthetic!==true||edge.result?.externalSupportClaim!==false||!supportContract)continue;
    const checks=edge.result.checks;if(!Array.isArray(checks)||!checks.length||checks.some(x=>x.source?.available!==true||x.target?.available!==true))continue;
    if(typeof hooks.productBindingAvailable!=='function'||edge.features.some(pair=>{
     const sb=(a.effective.bindings||[]).find(x=>x.feature===pair.sourceFeature),tb=(b.effective.bindings||[]).find(x=>x.feature===pair.targetFeature);
     return !sb||!tb||sb.resources.some(r=>hooks.productBindingAvailable(s,a.id,pair.sourceFeature,r)!==true)||tb.resources.some(r=>hooks.productBindingAvailable(s,b.id,pair.targetFeature,r)!==true);
    }))continue;
    const tested=(s.commands||[]).slice().reverse().find(x=>x.command?.type==='products'&&x.command.command?.action==='test-integration'&&x.command.command.id===edge.id);
    if(!tested)continue;
    return {kind:'version-scoped-synthetic-integration',scenario:s.scenario,integrationId:edge.id,source:edge.source,target:edge.target,sourceGeneration:a.generation,targetGeneration:b.generation,sourceVersion:a.effective.productVersion,targetVersion:b.effective.productVersion,sourceFamily:a.effective.family,targetFamily:b.effective.family,sourceMode:a.effective.mode,targetMode:b.effective.mode,features:copy(edge.features),integrationResult:copy(edge.result),testRevision:tested.revision,sourceBindings:copy(edge.features.map(x=>({feature:x.sourceFeature,resources:[...(a.effective.bindings||[]).find(y=>y.feature===x.sourceFeature)?.resources||[]]}))),targetBindings:copy(edge.features.map(x=>({feature:x.targetFeature,resources:[...(b.effective.bindings||[]).find(y=>y.feature===x.targetFeature)?.resources||[]]}))),supportContract:supportContract.id,supportResources:copy(supportContract.resources),at:s.clock};
   }
   return null;
  }
  if(sourceId===goalId('bb')){
   const c=s.campaign,root=scenarioRoot(s,'smb'),trace=serviceWindowProof(s,'smb'),contract=root&&activeContract(root);
   if(!c?.progress?.smb?.award||!root||!trace||!contract)return null;
   return {kind:'campaign-accepted-live-customer',scenario:'smb',campaignId:c.id,track:'smb',campaignAward:trace.awardKey,contractId:contract.id,interactionId:trace.interaction.id,caseId:trace.interaction.caseId,interactionProof:trace.interaction,serviceWindowId:trace.windowId,tenant:root.cases?.[trace.interaction.caseId]?.tenant||null,at:root.clock};
  }
  if(callingGoals.includes(sourceId)){
   const A=callingApi();if(!A)return null;
   const evidence=A.goalEvidence(s,sourceId,hooks);return evidence?{kind:'calling-achievement',sourceId,scenario:s.scenario,at:evidence.at,evidence:copy(evidence)}:null;
  }
  if(sites?.GOALS?.includes(sourceId)){
   if(!s.siteOperations)return null;
   try{const evidence=sites.goalEvidence(s,sourceId,hooks.siteHooks||{});return evidence?.length?{kind:'site-operations-goal',sourceId,scenario:s.scenario,at:s.clock,evidence:copy(evidence)}:null;}catch{return null;}
  }
  if(cap?.goalIds?.includes(sourceId)){
   const report=own(hooks,'capabilityReport')?hooks.capabilityReport:cap.calculate(s,hooks.capabilityHooks||hooks),evidence=report?.goals?.[sourceId]?.evidence;
   return evidence?{kind:'capability-progression-goal',sourceId,scenario:s.scenario,at:s.clock,evidence:copy(evidence)}:null;
  }
  if([goalId('rd'),goalId('tb'),goalId('t10')].includes(sourceId))return observationEvidence(s,sourceId,hooks,true);
  return null;
 }
 function marketHooks(hooks){return typeof hooks.marketQualificationHooks==='function'?hooks.marketQualificationHooks():hooks.marketQualificationHooks||{};}
 function marketEvidence(s,sourceId,qualification,hooks={}){
  const M=marketApi();if(!M||!s.marketQualification)return null;const mh=marketHooks(hooks),proof=M.currentProof(s,qualification);if(!proof||!M.currentReadiness(s,qualification,mh)||!M.proofCurrent(s,proof,mh))return null;
  const window=s.marketQualification.windows.find(x=>x.id===proof.window&&x.status==='passed');if(!window)return null;
  return {kind:'market-qualification-window',sourceId,scenario:s.scenario,qualification,proofId:proof.id,completedAt:proof.completedAt,at:proof.completedAt,window:copy(window),proof:copy(proof)};
 }
 function calculate(s,hooks={}){
  const p=packOf(s);validate(s);
  const calcHooks={...hooks};if(cap){try{calcHooks.capabilityReport=cap.calculate(s,hooks.capabilityHooks||hooks);}catch(error){if(!/^[A-Z][A-Z0-9_]+$/.test(String(error?.message||'')))throw error;calcHooks.capabilityReport=null;}}
  const goalReports={};for(const sourceId of goalIds){const evidence=goalEvidence(s,sourceId,calcHooks);goalReports[sourceId]={sourceId,status:implementedGoals.includes(sourceId)?(evidence?'ready':'incomplete'):'pending',implementation:implementedGoals.includes(sourceId)?'partial':'pending',evidence};}
  const bGoal=goalReports[goalId('bb')],smbRoot=scenarioRoot(s,'smb'),smbBiz=smbRoot?goalEvidence(smbRoot,goalId('bz')):null;
  const campaignAward=!!s.campaign?.progress?.smb?.award;
  const levelReports={};for(const sourceId of levelIds){if(sourceId===levelIds[0]){levelReports[sourceId]={sourceId,status:campaignAward&&bGoal.evidence&&smbBiz?'ready':'locked',implementation:'partial',evidence:campaignAward&&bGoal.evidence&&smbBiz?{kind:'first-smb-service-capability',scenario:'smb',campaignAward:s.campaign.progress.smb.award.key,goalEvidence:[smbBiz.contractId,bGoal.evidence.interactionId],at:smbRoot.clock}:null};continue;}const qualification=sourceId===levelId(2)?'level-2':sourceId===levelId(7)?'level-7':sourceId===levelId(13)?'level-13':null,market=qualification?marketEvidence(s,sourceId,qualification,hooks):null;let capability=null;if(!market&&cap?.levelIds?.includes(sourceId)){const raw=calcHooks.capabilityReport?.levels?.[sourceId]?.evidence;if(raw)capability={kind:'capability-progression-level',sourceId,scenario:s.scenario,at:s.clock,evidence:copy(raw)};}const evidence=market||capability,status=evidence?'ready':implementedLevels.includes(sourceId)?'locked':'pending';levelReports[sourceId]={sourceId,status,implementation:implementedLevels.includes(sourceId)?'partial':'pending',evidence};}
  const unimplemented={sourceProgressionLevels:levelIds.filter(sourceId=>!implementedLevels.includes(sourceId)).length,sourceGoals:goalIds.filter(sourceId=>!implementedGoals.includes(sourceId)).length,status:'partial'};
  return {pack:PACK,version:VERSION,contentVersion:CONTENT,campaignId:p.campaignId,goals:goalReports,levels:levelReports,unimplemented};
 }
 function append(p,kind,details){if(p.journal.length>=2000)fail('PROGRESSION_JOURNAL_CAPACITY');const e={id:`progression-event-${p.nextId++}`,kind,...copy(details)};p.journal.push(e);return e;}
 function command(s,c,hooks={}){
  const p=packOf(s);validate(s);
  if(!c||!['claim-goal','claim-level'].includes(c.action)||Object.keys(c).sort().join(',')!==(c.action==='claim-goal'?'action,goal':'action,level'))fail('INVALID_PROGRESSION_COMMAND');
  const sourceId=c.action==='claim-goal'?c.goal:c.level,table=c.action==='claim-goal'?p.goals:p.levels;
  if(!own(table,sourceId))fail('UNKNOWN_PROGRESSION_SOURCE');
  if(c.action==='claim-goal'&&!implementedGoals.includes(sourceId))fail('SOURCE_GOAL_PENDING');
  if(c.action==='claim-level'&&!implementedLevels.includes(sourceId))fail('SOURCE_LEVEL_PENDING');
  const report=calculate(s,hooks),proof=c.action==='claim-goal'?report.goals[sourceId]:report.levels[sourceId];
  if(proof.status!=='ready'||!proof.evidence)fail('PROGRESSION_EVIDENCE_REQUIRED');
  if(table[sourceId].status==='earned')return copy(table[sourceId]);
  const key=`${p.campaignId}:${sourceId}:${p.contentVersion}`;
  if(p.awards.some(a=>a.key===key))fail('PROGRESSION_AWARD_CONFLICT');
  const award={key,sourceId,campaignId:p.campaignId,contentVersion:p.contentVersion,at:s.clock,evidence:copy(proof.evidence),reward:{kind:'badge',unit:'achievement',amount:1,sourceCashConversion:'none'}};
  table[sourceId]={status:'earned',evidence:copy(award)};p.awards.push(award);append(p,'milestone-earned',{key,sourceId,at:s.clock});return copy(table[sourceId]);
 }
 function validate(s){
  const p=packOf(s);if(Object.keys(p).sort().join(',')!=='awards,campaignId,contentVersion,goals,journal,levels,nextId,pack,version'||p.version!==VERSION||p.contentVersion!==CONTENT||!id(p.campaignId)||s.campaign&&p.campaignId!==s.campaign.id||!int(p.nextId)||!p.goals||!p.levels||!Array.isArray(p.awards)||p.awards.length>32||!Array.isArray(p.journal)||p.journal.length>2000)fail('INVALID_PROGRESSION_SAVE');
  if(Object.keys(p.goals).sort().join(',')!==goalIds.slice().sort().join(',')||Object.keys(p.levels).sort().join(',')!==levelIds.slice().sort().join(','))fail('INVALID_PROGRESSION_ROWS');
  for(const sourceId of goalIds){const row=p.goals[sourceId];if(!row||Object.keys(row).sort().join(',')!=='evidence,status'||!['pending','earned'].includes(row.status)||row.status==='pending'&&row.evidence!==null||row.status==='earned'&&(!implementedGoals.includes(sourceId)||!row.evidence||row.evidence.sourceId!==sourceId||!evidenceExists(s,sourceId,row.evidence.evidence)||row.evidence.campaignId!==p.campaignId||row.evidence.contentVersion!==CONTENT))fail('INVALID_PROGRESSION_GOAL');}
  for(const sourceId of levelIds){const row=p.levels[sourceId];if(!row||Object.keys(row).sort().join(',')!=='evidence,status'||!['locked','earned'].includes(row.status)||row.status==='locked'&&row.evidence!==null||row.status==='earned'&&(!implementedLevels.includes(sourceId)||!row.evidence||row.evidence.sourceId!==sourceId||!evidenceExists(s,sourceId,row.evidence.evidence)||row.evidence.campaignId!==p.campaignId||row.evidence.contentVersion!==CONTENT))fail('INVALID_PROGRESSION_LEVEL');}
  const keys=new Set();for(const a of p.awards){if(!a||Object.keys(a).sort().join(',')!=='at,campaignId,contentVersion,evidence,key,reward,sourceId'||!id(a.sourceId)||keys.has(a.key)||a.campaignId!==p.campaignId||a.contentVersion!==CONTENT||!int(a.at)||!a.evidence||!a.reward||JSON.stringify(a.reward)!==JSON.stringify({kind:'badge',unit:'achievement',amount:1,sourceCashConversion:'none'})||!((goalIds.includes(a.sourceId)&&p.goals[a.sourceId].status==='earned'&&JSON.stringify(p.goals[a.sourceId].evidence)===JSON.stringify(a))||(levelIds.includes(a.sourceId)&&p.levels[a.sourceId].status==='earned'&&JSON.stringify(p.levels[a.sourceId].evidence)===JSON.stringify(a)))||a.key!==`${p.campaignId}:${a.sourceId}:${CONTENT}`)fail('INVALID_PROGRESSION_AWARD');keys.add(a.key);}
  if(p.awards.length!==Object.values(p.goals).filter(x=>x.status==='earned').length+Object.values(p.levels).filter(x=>x.status==='earned').length)fail('INVALID_PROGRESSION_AWARD_COUNT');
  const events=new Set();for(let i=0;i<p.journal.length;i++){const e=p.journal[i],a=p.awards[i];if(!e||Object.keys(e).sort().join(',')!=='at,id,key,kind,sourceId'||e.kind!=='milestone-earned'||e.id!==`progression-event-${i+1}`||events.has(e.id)||!keys.has(e.key)||!goalIds.concat(levelIds).includes(e.sourceId)||!int(e.at)||!a||e.key!==a.key||e.sourceId!==a.sourceId||e.at!==a.at)fail('INVALID_PROGRESSION_JOURNAL');events.add(e.id);}
  if(events.size!==p.awards.length||p.nextId!==p.journal.length+1)fail('INVALID_PROGRESSION_JOURNAL');return true;
 }
 function evidenceRoot(s,e){
  if(e?.kind==='market-qualification-window')return s;
  if(!e||typeof e.scenario!=='string')return null;
  if(s.scenario===e.scenario)return s;
  const snapshot=s.campaign?.snapshots?.[e.scenario]?.root;
  return snapshot&&snapshot.scenario===e.scenario?{...snapshot,campaign:s.campaign}:null;
 }
 function validObservationEvidence(s,sourceId,e){
  if(!observation||!keys(e,'at,campaignId,completedAt,configuration,goal,kind,proof,scenario,sourceId,window,windowId')||e.kind!=='sustained-service-observation'||e.sourceId!==sourceId||e.goal!==sourceId.slice('progress.goal.'.length)||e.campaignId!==s.campaign?.id||e.proof?.goal!==e.goal||e.proof?.window!==e.windowId||e.window?.id!==e.windowId||e.window?.goal!==e.goal||e.window?.status!=='passed'||e.proof?.completedAt!==e.completedAt||e.window?.completedAt!==e.completedAt||e.at!==e.completedAt||e.proof?.configuration!==e.configuration||e.window?.configuration!==e.configuration)return false;
  const archived={clock:e.completedAt,serviceObservation:{pack:observation.PACK,version:observation.VERSION,contentVersion:observation.CONTENT,nextId:1,active:null,windows:[copy(e.window)],proofs:[copy(e.proof)],journal:[],lastClock:e.completedAt}};
  try{observation.validate(archived,{archivedEvidence:true});}catch{return false;}
  const root=evidenceRoot(s,e),saved=root?.serviceObservation?.proofs?.find(x=>x.id===e.proof.id);
  if(root&&saved&&JSON.stringify(saved)!==JSON.stringify(e.proof))return false;
  const award=packOf(s).goals[sourceId];if(award.status==='earned'&&award.evidence?.evidence&&JSON.stringify(award.evidence.evidence)!==JSON.stringify(e))return false;
  return true;
 }
 function evidenceExists(s,sourceId,e,hooks={}){
  const q=evidenceRoot(s,e);if(!q||!int(e.at)||e.at>q.clock)return false;
  const marketGoal={ [goalId('c3')]:'c3',[goalId('c5')]:'c5',[goalId('t2')]:'t2',[goalId('t1')]:'t1',[levelId(2)]:'level-2',[levelId(7)]:'level-7',[levelId(13)]:'level-13' }[sourceId];
  if(marketGoal){
   const M=marketApi();if(!M||!keys(e,'at,completedAt,kind,proof,proofId,qualification,scenario,sourceId,window')||e.kind!=='market-qualification-window'||e.sourceId!==sourceId||typeof e.scenario!=='string'||e.qualification!==marketGoal||e.proofId!==e.proof?.id||e.window?.id!==e.proof?.window||e.window?.qualification!==marketGoal||e.window?.status!=='passed'||e.window?.completedAt!==e.completedAt||e.proof?.completedAt!==e.completedAt||e.at!==e.completedAt||e.proof?.qualification!==marketGoal)return false;
   const nums=[/^market-window-([1-9][0-9]*)$/.exec(e.window.id),/^market-proof-([1-9][0-9]*)$/.exec(e.proofId)].filter(Boolean).map(x=>Number(x[1]));if(nums.length!==2)return false;
   const archived={marketQualification:{pack:M.PACK,version:M.VERSION,contentVersion:M.CONTENT,nextId:Math.max(...nums)+1,active:null,windows:[copy(e.window)],proofs:[copy(e.proof)],journal:[],lastClock:e.completedAt}};
   try{M.validate(archived,{archivedEvidence:true});}catch{return false;}return true;
  }
  if(sourceId===goalId('bz')){
   if(!keys(e,'at,billedPeriods,contractId,customer,kind,offer,scenario,supportOwner'))return false;
   const c=supportedContract(q,e.contractId);
   return e.kind==='accepted-supported-billed-contract'&&!!c&&c.offer===e.offer&&c.customer===e.customer&&c.supportOwner===e.supportOwner&&c.billedPeriods>=e.billedPeriods&&e.billedPeriods>=1;
  }
  if(callingGoals.includes(sourceId)){
   if(!keys(e,'at,evidence,kind,scenario,sourceId')||e.kind!=='calling-achievement'||e.sourceId!==sourceId||!int(e.evidence?.at)||e.at!==e.evidence.at)return false;
   const A=callingApi();try{return !!A&&A.validateEvidence(q,sourceId,e.evidence,hooks.callingAchievementHooks||hooks);}catch{return false;}
  }
  if(sites?.GOALS?.includes(sourceId)){
   if(!keys(e,'at,evidence,kind,scenario,sourceId')||e.kind!=='site-operations-goal'||e.sourceId!==sourceId||!Array.isArray(e.evidence)||!e.evidence.length)return false;
   try{return typeof sites.validateEvidence==='function'&&sites.validateEvidence(q,sourceId,e.evidence,{archived:true,hooks:hooks.siteHooks||{}});}catch{return false;}
  }
  if(cap?.goalIds?.includes(sourceId)){
   if(!keys(e,'at,evidence,kind,scenario,sourceId')||e.kind!=='capability-progression-goal'||e.sourceId!==sourceId||!e.evidence||!int(e.at)||e.at>q.clock)return false;
   try{return cap.validateEvidence(q,sourceId,e.evidence,{archived:true,hooks:hooks.capabilityHooks||hooks});}catch{return false;}
  }
  if(sourceId===goalId('bb')){
   if(!keys(e,'at,campaignAward,campaignId,caseId,contractId,interactionId,interactionProof,kind,scenario,serviceWindowId,tenant,track')||!keys(e.interactionProof,'caseId,channel,context,from,id,needOutcome,obligations,outcome,phase,to'))return false;
   const c=s.campaign,trace=serviceWindowProof(s,'smb');
   return e.kind==='campaign-accepted-live-customer'&&e.campaignId===c?.id&&e.track==='smb'&&c.progress?.smb?.award?.key===e.campaignAward&&!!supportedContract(q,e.contractId)&&!!trace&&trace.awardKey===e.campaignAward&&trace.windowId===e.serviceWindowId&&trace.interaction.id===e.interactionId&&trace.interaction.caseId===e.caseId&&JSON.stringify(trace.interaction)===JSON.stringify(e.interactionProof);
  }
  if(sourceId===goalId('ix')){
   if(!keys(e,'at,features,integrationId,integrationResult,kind,scenario,source,sourceBindings,sourceFamily,sourceGeneration,sourceMode,sourceVersion,supportContract,supportResources,target,targetBindings,targetFamily,targetGeneration,targetMode,targetVersion,testRevision')||!keys(e.integrationResult,'checkedAt,checks,externalSupportClaim,reasons,sourceGeneration,sourceVersion,status,synthetic,targetGeneration,targetVersion')||!Array.isArray(e.features)||!e.features.every(x=>keys(x,'sourceFeature,targetFeature'))||!Array.isArray(e.sourceBindings)||!e.sourceBindings.every(x=>keys(x,'feature,resources')&&Array.isArray(x.resources)&&x.resources.length>0)||!Array.isArray(e.targetBindings)||!e.targetBindings.every(x=>keys(x,'feature,resources')&&Array.isArray(x.resources)&&x.resources.length>0))return false;
   const edge=q.products?.integrations?.find(x=>x.id===e.integrationId),a=q.products?.deployments?.find(x=>x.id===e.source),b=q.products?.deployments?.find(x=>x.id===e.target),support=q.business?.contracts?.find(c=>c.id===e.supportContract),proof=e.integrationResult,bindings=[...(e.sourceBindings||[]),...(e.targetBindings||[])].flatMap(x=>x.resources||[]);
   const commandHistory=q.commands||[],testCommand=commandHistory.some(x=>x.revision===e.testRevision&&x.command?.type==='products'&&x.command.command?.action==='test-integration'&&x.command.command.id===e.integrationId)||(commandHistory.length===1000&&commandHistory[0]?.revision>e.testRevision);
   const featureProof=Array.isArray(e.features)&&Array.isArray(proof?.checks)&&proof.checks.length===e.features.length&&proof.checks.every((x,i)=>keys(x,'source,sourceFeature,target,targetFeature')&&x.sourceFeature===e.features[i].sourceFeature&&x.targetFeature===e.features[i].targetFeature&&keys(x.source,'available,code,mode,productVersion,synthetic')&&x.source.available===true&&x.source.synthetic===true&&x.source.productVersion===e.sourceVersion&&keys(x.target,'available,code,mode,productVersion,synthetic')&&x.target.available===true&&x.target.synthetic===true&&x.target.productVersion===e.targetVersion);
   return e.kind==='version-scoped-synthetic-integration'&&!!edge&&!!a&&!!b&&edge.source===e.source&&edge.target===e.target&&edge.features.length===e.features?.length&&edge.features.every((x,i)=>x.sourceFeature===e.features[i].sourceFeature&&x.targetFeature===e.features[i].targetFeature)&&a.desired.family===e.sourceFamily&&b.desired.family===e.targetFamily&&typeof e.sourceMode==='string'&&typeof e.targetMode==='string'&&int(e.sourceGeneration)&&e.sourceGeneration>0&&int(e.targetGeneration)&&e.targetGeneration>0&&typeof e.sourceVersion==='string'&&typeof e.targetVersion==='string'&&proof?.status==='scenario-verified'&&proof.synthetic===true&&proof.externalSupportClaim===false&&proof.sourceGeneration===e.sourceGeneration&&proof.targetGeneration===e.targetGeneration&&proof.sourceVersion===e.sourceVersion&&proof.targetVersion===e.targetVersion&&int(proof.checkedAt)&&proof.checkedAt<=e.at&&Array.isArray(proof.reasons)&&proof.reasons.length===0&&featureProof&&testCommand&&!!support&&support.customer==='customer'&&support.sell===true&&Array.isArray(e.supportResources)&&e.supportResources.every(id)&&JSON.stringify(support.resources)===JSON.stringify(e.supportResources)&&q.business.organisations?.[support.supportOwner]?.roles?.some(r=>['msp','integrator'].includes(r))&&bindings.some(x=>support.resources.includes(x))&&e.sourceBindings?.length===e.features.length&&e.targetBindings?.length===e.features.length&&e.sourceBindings.every((x,i)=>x.feature===e.features[i].sourceFeature)&&e.targetBindings.every((x,i)=>x.feature===e.features[i].targetFeature);
  }
  if([goalId('rd'),goalId('tb'),goalId('t10')].includes(sourceId))return validObservationEvidence(s,sourceId,e);
  if(sourceId===levelId(1)){
   if(!keys(e,'at,campaignAward,goalEvidence,kind,scenario'))return false;
   const trace=serviceWindowProof(s,'smb'),q=scenarioRoot(s,'smb'),contract=q&&supportedContract(q,e.goalEvidence?.[0]);
   return e.kind==='first-smb-service-capability'&&e.scenario==='smb'&&typeof e.campaignAward==='string'&&e.campaignAward.length<=200&&Array.isArray(e.goalEvidence)&&e.goalEvidence.length===2&&(!s.campaign||s.campaign.progress?.smb?.award?.key===e.campaignAward)&&!!contract&&!!trace&&trace.interaction.id===e.goalEvidence[1];
  }
  if(cap?.levelIds?.includes(sourceId)){
   if(!keys(e,'at,evidence,kind,scenario,sourceId')||e.kind!=='capability-progression-level'||e.sourceId!==sourceId||!e.evidence||!int(e.at)||e.at>q.clock)return false;
   try{return cap.validateEvidence(q,sourceId,e.evidence,{archived:true,hooks:hooks.capabilityHooks||hooks});}catch{return false;}
  }
  return false;
 }
 function inspect(s,hooks={}){const p=packOf(s);validate(s);return calculate(s,hooks);}
 function fingerprint(s){const p=packOf(s);validate(s);return JSON.stringify([p.pack,p.version,p.contentVersion,p.campaignId,p.goals,p.levels,p.awards,p.journal]);}
 const source=()=>`const SOC_PROGRESSION=(${socProgressionKernel.toString()})();`;
 return {PACK,VERSION,CONTENT,levelIds:[...levelIds],goalIds:[...goalIds],implementedLevels:[...implementedLevels],implementedGoals:[...implementedGoals],create,command,calculate,inspect,validate,evidenceExists,fingerprint,source};
}
const SOC_PROGRESSION=socProgressionKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROGRESSION;
