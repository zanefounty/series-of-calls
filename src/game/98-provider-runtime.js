/* Single authoritative campaign clock and persistence controller. UI remains a projection. */
const SCP={atHome:true,state:null,seq:0,locked:false,release:null,lockJob:0,worker:null,busy:false,job:0,speed:0,lastSpeed:1,acc:0,last:0,error:'',host:null,decision:false,decisionSpeed:0,frameStarted:false,autoPauseSpeed:0,pauseReason:'',handoffPromptSeen:false,modelCache:null};
const SCP_KEY='series-of-calls:provider:v1',SCP_LOCK='series-of-calls:provider-lock:v1';
const SCP_LEGACY_ROOTS=['map','hud','left','leftToggle','tabbar','panel','pzBox','hint','coach','toasts','mega','update','bankBox','dash','modal'];
const SCP_LEGACY_VISIBILITY=new WeakMap();
function providerIsolateLegacy(active){for(const id of SCP_LEGACY_ROOTS){const root=document.getElementById(id);if(!root)continue;if(active){if(!SCP_LEGACY_VISIBILITY.has(root))SCP_LEGACY_VISIBILITY.set(root,{hidden:root.hidden,inert:root.inert});root.hidden=true;root.inert=true;}else{const previous=SCP_LEGACY_VISIBILITY.get(root);if(previous){root.hidden=previous.hidden;root.inert=previous.inert;SCP_LEGACY_VISIBILITY.delete(root);}}}}
function providerStoredSequence(raw){
 const e=JSON.parse(raw);
 if(e.app!==SOC.APP||e.experience!=='campaign'||e.version!==1||!Number.isSafeInteger(e.seq)||e.seq<1)throw new Error('INVALID_PROVIDER_SAVE_ENVELOPE');
 const restored=SOC.restore(JSON.stringify(e.state));
 if(!restored.providerCampaign)throw new Error('PROVIDER_SAVE_REQUIRED');
 return e.seq;
}
function providerQuarantine(raw){
 if(!SCP.locked)throw new Error('PROVIDER_SAVE_READ_ONLY');
 if(localStorage.getItem(SCP_KEY)!==raw)throw new Error('PROVIDER_NEWER_SAVE');
 let key=SCP_KEY+':corrupt',index=1;
 while(localStorage.getItem(key)!==null)key=SCP_KEY+':corrupt-'+index++;
 localStorage.setItem(key,raw);
 localStorage.removeItem(SCP_KEY);SCP.seq=0;
}
function providerCancel(){SCP.job++;SCP.busy=false;SCP.acc=0;if(SCP.worker){SCP.worker.terminate();SCP.worker=null;}}
function providerPause(){SCP.speed=0;SCP.acc=0;SCP.last=performance.now();}
function providerError(error){providerPause();const message=String(error?.message||error);let display=message;if(message.includes('STAFF_COMMITMENT_ACTIVE')&&SCP.state?.providerCampaign){try{const minute=SOC.provider.inspect(SCP.state).staffingCommitment?.committedUntil;display=typeof tr==='function'?tr('provider.staff.refusal',{minute}):`The current team is committed through minute ${minute}. Wait until then to reduce staffing.`;}catch{}}SCP.error=display;providerRender();}
function providerRelease(){SCP.lockJob++;providerPause();providerCancel();if(SCP.release){SCP.release();SCP.release=null;}SCP.locked=false;}
async function providerAcquire(){
 if(SCP.locked)return true;
 if(!navigator.locks){SCP.error='This browser cannot safely own a career save. Export remains available.';return false;}
 const lockJob=++SCP.lockJob;
 return new Promise(resolve=>navigator.locks.request(SCP_LOCK,{ifAvailable:true},async lock=>{
  if(lockJob!==SCP.lockJob){resolve(false);return;}
  if(!lock){SCP.error='This career is open in another tab. This view is read-only.';resolve(false);return;}
  SCP.locked=true;resolve(true);await new Promise(done=>SCP.release=done);if(lockJob===SCP.lockJob)SCP.locked=false;
 }).catch(()=>{
  // A native lock may be revoked after its callback acquired ownership. Drop
  // authority immediately, including any worker result already in flight.
  // An older request must never revoke a subsequently acquired career lock.
  if(lockJob===SCP.lockJob){providerRelease();providerError(new Error(typeof tr==='function'?tr('provider.lock_lost'):'Career save ownership was lost. This view is read-only and paused. Reopen it to continue; export remains available.'));}
  resolve(false);
 }));
}
function providerSavedView(value=SOC_PROVIDER_UI.view()){
 const result={handoffPromptSeen:SCP.handoffPromptSeen===true,presentationSeen:Array.isArray(value?.presentationSeen)?value.presentationSeen.filter(id=>typeof id==='string'&&/^(provider-event|provider-job|provider-incident)-[1-9]\d*$/.test(id)).slice(-200):[],reactions:Array.isArray(value?.reactions)?value.reactions.filter(row=>row&&typeof row.sourceId==='string'&&typeof row.message==='string'&&Number.isSafeInteger(row.at)).slice(-3):[],coachDismissed:value?.coachDismissed===true,drawer:['goals','deals','incidents','operations','suppliers','team','finance','automation','help','settings'].includes(value?.drawer)?value.drawer:'goals',layer:['geography','services','workloads','costs'].includes(value?.layer)?value.layer:'services',camera:{x:0,y:0,zoom:1},selection:null};
 if(value?.camera&&['x','y','zoom'].every(k=>Number.isFinite(value.camera[k]))){result.camera={x:Math.max(-10000,Math.min(10000,value.camera.x)),y:Math.max(-10000,Math.min(10000,value.camera.y)),zoom:Math.max(.75,Math.min(1.8,value.camera.zoom))};}
 if(value?.selection?.supplierId&&SCP.state?.business.organisations[value.selection.supplierId])result.selection={supplierId:value.selection.supplierId};
 if(SCP.state?.providerCampaign.customers.some(c=>c.id===value?.selection?.customerId)){result.selection={customerId:value.selection.customerId};const child=SCP.state.portfolio.customers.find(c=>c.id===value.selection.customerId)?.root;if(child?.resources[value.selection.serviceId]||SCP.state.providerCampaign.projects.some(p=>(p.id===value.selection.serviceId||`${p.customerId}:project:${p.id}`===value.selection.serviceId)&&p.customerId===value.selection.customerId))result.selection.serviceId=value.selection.serviceId;if(value.selection.pathId&&typeof SOCServiceScene!=='undefined'&&SOCServiceScene.project(SOC.provider.inspect(SCP.state)).edges.some(e=>e.id===value.selection.pathId&&e.scope===value.selection.customerId))result.selection.pathId=value.selection.pathId;}
 return result;
}
function providerStore(){
 if(!SCP.state||!SCP.locked)throw new Error('PROVIDER_SAVE_READ_ONLY');
 const raw=localStorage.getItem(SCP_KEY),old=raw?JSON.parse(raw):null;
 if(old&&old.seq!==SCP.seq){providerRelease();throw new Error('PROVIDER_NEWER_SAVE');}
 const envelope={app:SOC.APP,experience:'campaign',version:1,seq:SCP.seq+1,state:SCP.state,view:providerSavedView()};
 localStorage.setItem(SCP_KEY,JSON.stringify(envelope));SCP.seq++;
}
function providerModel(inspection){
 if(!SCP.state)return null;
 const m=inspection||SOC.provider.inspect(SCP.state),planComparisons=m.planComparisons;
 const supplierMap=new Map();for(const customer of m.customers){for(const [stage,commitment] of Object.entries(customer.stages)){if(!commitment)continue;const id=SOC.provider.rules.plans[customer.planId]?.[stage]?.supplier,actor=SCP.state.business.organisations[id];if(!actor)continue;if(!supplierMap.has(id))supplierMap.set(id,{id,name:actor.name,roles:actor.roles,commitments:[],scope:'provider'});supplierMap.get(id).commitments.push({customerId:customer.id,stage,status:commitment.status,periodCents:commitment.periodCents});}}
 const suppliers=[...supplierMap.values()],atRisk=m.customers.reduce((n,c)=>n+(c.periodOutcome?.atRisk||0),0),constrained=m.customers.flatMap(c=>c.services.filter(r=>r.pressure?.constrained).map(r=>c.name+' · '+r.name));
 return {...m,planComparisons,suppliers,capacityWarning:constrained.length?constrained.join('; '):atRisk?(typeof tr==='function'?tr('provider.due_soon',{count:atRisk}):`${atRisk} cases due within five minutes`):'',automation:(SCP.state.providerAutomation||[]).map(p=>({...p,name:'Assurance for '+p.customerId})),revision:SCP.state.revision,period:Math.floor(SCP.state.clock/60)+1,periodMinutes:60,
  periodOutcome:m.customers.reduce((n,c)=>({offered:n.offered+(c.periodOutcome?.due||0),completed:n.completed+((c.periodOutcome?.completedOnTime||0)+(c.periodOutcome?.late||0))}),{offered:0,completed:0}),
  team:{...SCP.state.business.workforce},warning:SCP.error||(!SCP.locked?'Read-only: another tab owns this career':''),locked:SCP.locked,busy:SCP.busy};
}
function providerCachedModel(){
 if(!SCP.state)return null;
 if(SCP.modelCache?.state!==SCP.state)SCP.modelCache={state:SCP.state,model:providerModel(),fromWorker:false};
 return {...SCP.modelCache.model,warning:SCP.error||(!SCP.locked?'Read-only: another tab owns this career':''),locked:SCP.locked,busy:SCP.busy};
}
function providerRender(){
 if(!SCP.host||SCP.host.hidden)return;
 SOC_PROVIDER_UI.render(SCP.atHome?null:SCP.state,SCP.atHome?null:providerCachedModel(),{paused:!SCP.speed,speed:SCP.speed||SCP.lastSpeed,pauseReason:SCP.pauseReason,preferences:providerPreferences()});
 let alert=SCP.host.querySelector('[data-provider-error]');if(!alert){alert=document.createElement('div');alert.dataset.providerError='';alert.setAttribute('role','alert');SCP.host.append(alert);}alert.textContent=SCP.error;alert.hidden=!SCP.error;
}
function providerContextualOperations(selection){
 if(!selection?.customerId||!SCP.state)return [];const m=SCP.modelCache?.state===SCP.state?SCP.modelCache.model:SOC.provider.inspect(SCP.state),normal=id=>({processor:'speech',connectivity:'access'})[id]||id;
 const quote=(o,config)=>{const incident=m.incidents.find(i=>i.customerId===selection.customerId&&['active','acknowledged'].includes(i.status)&&(selection.incidentId?i.id===selection.incidentId:!selection.serviceId||normal(i.resource)===normal(selection.serviceId))),response=incident&&['repair','mitigate','service-repair'].includes(o.id),q=SOC.provider.quote(SCP.state,response?{action:'respond-incident',incidentId:incident.id,operationId:o.id}:{action:'operation',operationId:o.id,customerId:selection.customerId,...(config?{config}:{})});return {...o,quote:q,selection:config||null,customerId:selection.customerId,operationId:o.id,available:q.blockers.every(code=>['INSUFFICIENT_CASH','ENGINEER_CAPACITY','SUPPORT_CAPACITY','INSOLVENT'].includes(code)),blockers:q.blockers};};
 const rows=m.operations.filter(o=>!['diagnose-incident','retry-case-followup','provider-support-coverage','site-diverse-ingress','owned-site-operations','site-recovery','managed-site-recovery','site-resource-migration','custody-review'].includes(o.id)).flatMap(o=>o.control&&o.offers?Object.entries(o.offers).map(([planId,offer])=>quote({...o,...offer,securityControl:o.control,planId},{planId})):[quote(o)]);
 const diagnosis=m.operations.find(o=>o.id==='diagnose-incident');if(diagnosis)for(const i of m.incidents||[]){if(i.customerId!==selection.customerId)continue;const selected=selection.incidentId?i.id===selection.incidentId:['active','acknowledged'].includes(i.status)&&(!selection.serviceId||normal(selection.serviceId)===normal(i.resource));if(selected)rows.push(quote(diagnosis,{incidentId:i.id}));}return rows;
}
function providerEnsureMount(){
 providerIsolateLegacy(true);
 let host=document.getElementById('provider-campaign');if(!host){host=document.createElement('section');host.id='provider-campaign';host.setAttribute('aria-label','Provider campaign');document.body.append(host);}SCP.host=host;host.hidden=false;
 if(!host.childElementCount)SOC_PROVIDER_UI.mount(host,{preferences:providerPreferences,policyPreview:(config,customerId)=>SOC.provider.policyPreview(SCP.state,config,customerId),contextualOperations:providerContextualOperations,command:providerCommand,copyToLab:providerCopyToLab,quote:q=>SOC.provider.quote(SCP.state,q),speed:providerSpeed,pause:()=>providerSpeed(SCP.speed?0:SCP.lastSpeed),resumeAfterResponse:providerResumeAfterResponse,decision:providerDecision,save:()=>{try{providerStore();}catch(e){providerError(e);}},export:providerExport,import:providerImport,close:providerHome,openExperience:providerExperience,newGame:providerNew});
 if(!SCP.frameStarted&&!window.__TUBES_TEST__){SCP.frameStarted=true;requestAnimationFrame(providerFrame);}
}
function providerHome(){
 SCP.atHome=true;providerRelease();UI.speed=0;if(typeof socClose==='function')socClose();
 const modal=document.getElementById('modal');if(modal)modal.hidden=true;
 providerEnsureMount();SOC_PROVIDER_UI.render(null,null,{paused:true,speed:SCP.lastSpeed,preferences:providerPreferences()});
}
async function providerOpen(){
 SCP.atHome=false;UI.speed=0;providerEnsureMount();providerPause();SCP.error='';const alreadyOwned=SCP.locked;await providerAcquire();
 if(!alreadyOwned){try{
  const raw=localStorage.getItem(SCP_KEY);SCP.state=null;SCP.seq=0;
  if(raw){const e=JSON.parse(raw);providerStoredSequence(raw);
   const next=SOC.restore(JSON.stringify(e.state));if(!next.providerCampaign)throw new Error('PROVIDER_SAVE_REQUIRED');SCP.state=next;SCP.seq=e.seq;SCP.handoffPromptSeen=e.view?.handoffPromptSeen===true||next.providerCampaign.jobs.some(j=>!!j.handoff);SOC_PROVIDER_UI.render(SCP.state,providerModel(),providerSavedView(e.view));}
 }catch(e){providerError(new Error('Stored career is unreadable. Start a new career or import a valid backup; the original bytes will be preserved. '+String(e?.message||e)));return;}}
 if(!SCP.state){if(!SCP.locked)return providerRender();SCP.state=SOC.create({experience:'campaign',opening:'win',migrationDecisionVersion:1,migrationReservationVersion:1,migrationRehearsalVersion:1});SCP.handoffPromptSeen=false;providerStore();}
 providerRender();providerPromptFirstHandoff();
}
async function providerNew(options={}){
 SCP.atHome=false;try{providerEnsureMount();providerPause();providerCancel();if(!await providerAcquire())return providerRender();
  const raw=localStorage.getItem(SCP_KEY);if(raw){try{SCP.seq=providerStoredSequence(raw);}catch{providerQuarantine(raw);}}
  SCP.state=SOC.create({experience:'campaign',migrationDecisionVersion:1,migrationReservationVersion:1,migrationRehearsalVersion:1,...options});SCP.handoffPromptSeen=false;SCP.error='';SOC_PROVIDER_UI.render(SCP.state,providerModel(),{...providerSavedView(null),selection:SCP.state.providerCampaign.inheritedEstate?{customerId:'starter-customer'}:null,quoteModal:false,quote:null,importOpen:false,newGameOpen:false});providerStore();providerRender();
 }catch(e){providerError(e);}
}
function providerCommand(command){
 try{if(!SCP.locked)throw new Error('PROVIDER_READ_ONLY');providerCancel();
  const envelope={...command,expectedRevision:SCP.state.revision,requestId:'provider-'+(SCP.state.providerRequestSequence+1)};
  SCP.state=SOC.dispatch(SCP.state,envelope);if(command.command?.action==='handoff-case')SCP.handoffPromptSeen=true;SCP.error='';
  // A storage failure does not undo a committed simulation command. Keep the
  // live result exportable and never invite a second purchase as a retry.
  try{providerStore();}catch(error){providerError(error);return {ok:true,persisted:false,error:String(error?.message||error),revision:SCP.state.revision};}
  providerRender();return {ok:true,persisted:true,revision:SCP.state.revision};
 }catch(e){providerError(e);return {ok:false,error:String(e?.message||e)};}
}
function providerEligibleHandoff(state){
 const m=SOC.provider.inspect(state);
 for(const customer of m.customers||[])for(const journey of customer.journeys||[]){
  const q=journey.handoffOffer;
  if(journey.status==='pending'&&!journey.handoff&&q?.action==='handoff-case'&&q.accepted!==false&&!q.blockers?.length&&q.request?.customerId===customer.id&&q.request?.jobId===journey.id)return {customerId:customer.id,jobId:journey.id};
 }
 return null;
}
function providerPromptFirstHandoff(){
 if(SCP.handoffPromptSeen||SCP.atHome||!SCP.locked||!SCP.state)return false;
 const choice=providerEligibleHandoff(SCP.state);
 if(!choice||!SOC_PROVIDER_UI.promptHandoff(choice.customerId,choice.jobId))return false;
 SCP.handoffPromptSeen=true;providerStore();return true;
}
function providerDecision(open){
 if(open&&!SCP.decision){SCP.decisionSpeed=SCP.speed;SCP.decision=true;providerPause();providerCancel();providerRender();}
 else if(!open&&SCP.decision){const speed=SCP.decisionSpeed;SCP.decision=false;SCP.decisionSpeed=0;providerSpeed(speed);}
}
function providerResumeAfterResponse(){if(SCP.pauseReason==='incident'&&SCP.autoPauseSpeed){const speed=SCP.autoPauseSpeed;SCP.autoPauseSpeed=0;SCP.pauseReason='';providerSpeed(speed);}}
function providerCanRun(state=SCP.state){
 const p=state?.providerCampaign;
 return !!p&&state.business?.solvency?.status!=='default'&&(p.status==='operating'||p.status==='failed'&&p.customers.some(c=>!['exited','default'].includes(c.status)));
}
function providerSpeed(value){
 if(![0,.5,1,2,4,8].includes(value))return;
 if(SCP.decision){SCP.decisionSpeed=value;return;}
 if(!SCP.locked||!providerCanRun()||document.hidden)value=0;
 if(!value){providerCancel();SCP.autoPauseSpeed=0;SCP.pauseReason='manual';}else SCP.pauseReason='';SCP.speed=value;if(value)SCP.lastSpeed=value;SCP.acc=0;SCP.last=performance.now();providerRender();
}
function providerBatchMinutes(speed,count){const desired=count>=5?8:count>=3?4:count>=2?2:1;return Math.min(Math.max(1,Math.floor(speed)),desired);}
function providerTick(minutes=1){
 if(SCP.busy||!SCP.locked||!providerCanRun())return;
 const snapshot=SCP.state,revision=snapshot.revision,id=++SCP.job,command={type:'advance',minutes,expectedRevision:revision,...(minutes>1?{stopOnProviderHandoff:true}:{})};SCP.busy=true;
 const current=()=>id===SCP.job&&SCP.locked&&SCP.state.revision===revision;
 const accept=(next,inspection)=>{if(!current())return;SCP.busy=false;SCP.state=SOC.validateState(next);SCP.error='';const p=SCP.state.providerCampaign,previous=snapshot.providerCampaign;
 if(inspection?.clock===SCP.state.clock&&Array.isArray(inspection.customers)&&inspection.customers.length===p.customers.length&&inspection.customers.every((row,index)=>row.id===p.customers[index].id))SCP.modelCache={state:SCP.state,model:providerModel(inspection),fromWorker:true};
 providerPresentationEvents(snapshot,SCP.state);providerStore();
 const newIncident=p.incidents.some(i=>i.status==='active'&&!previous.incidents.some(old=>old.id===i.id&&old.status==='active')),newRenewal=p.customers.some(c=>c.status==='renewal'&&!previous.customers.some(old=>old.id===c.id&&old.status==='renewal'));if(!providerCanRun()||p.status==='failed'&&previous.status!=='failed'||newIncident||newRenewal){SCP.autoPauseSpeed=newIncident?SCP.speed:0;SCP.pauseReason=newIncident?'incident':newRenewal?'renewal':'stopped';providerPause();}providerRender();providerPromptFirstHandoff();};
 const fallback=()=>{if(!current())return;try{accept(SOC.dispatch(snapshot,command));}catch(e){SCP.busy=false;providerError(e);}};
 if(typeof Worker!=='function')return fallback();
 let worker=SCP.worker;
 if(!worker)try{const url=URL.createObjectURL(new Blob([SOC.workerSource()],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);SCP.worker=worker;}catch(e){return fallback();}
 const discard=()=>{worker.terminate();if(SCP.worker===worker)SCP.worker=null;};
 const timer=setTimeout(()=>{discard();fallback();},Math.max(5000,minutes*2500));
 worker.onerror=()=>{clearTimeout(timer);discard();fallback();};
 worker.onmessage=e=>{clearTimeout(timer);if(!current())return;if(e.data.id!==id||e.data.revision!==revision){discard();return fallback();}if(e.data.error){discard();SCP.busy=false;return providerError(new Error(e.data.error));}try{accept(e.data.state,e.data.inspection);}catch(error){providerError(error);}};
 try{worker.postMessage({id,state:snapshot,command});}catch(error){clearTimeout(timer);discard();fallback();}
}
function providerFrame(now){
 requestAnimationFrame(providerFrame);const delta=SCP.last?Math.min(1000,Math.max(0,now-SCP.last)):0;SCP.last=now;
 if(!SCP.host||SCP.host.hidden||!SCP.speed||!SCP.locked||document.hidden||SCP.decision){SCP.acc=0;return;}
 const minutes=providerBatchMinutes(SCP.speed,SCP.state.providerCampaign.customers.length),threshold=2000*minutes;
 SCP.acc=Math.min(threshold,SCP.acc+delta*SCP.speed);
 if(SCP.busy)return;
 if(SCP.acc>=threshold){SCP.acc-=threshold;providerTick(minutes);}
}
function providerExport(){if(!SCP.state)return;const url=URL.createObjectURL(new Blob([JSON.stringify(SCP.state)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='series-of-calls-provider.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function providerImport(text){try{const next=SOC.restore(text);if(!next.providerCampaign)throw new Error('PROVIDER_SAVE_REQUIRED');if(!SCP.locked)throw new Error('PROVIDER_READ_ONLY');providerPause();providerCancel();const raw=localStorage.getItem(SCP_KEY);if(raw){try{SCP.seq=providerStoredSequence(raw);}catch{providerQuarantine(raw);}}SCP.state=next;SCP.error='';SCP.handoffPromptSeen=next.providerCampaign.jobs.some(j=>!!j.handoff);providerStore();providerRender();providerPromptFirstHandoff();}catch(e){providerError(e);}}
async function providerCopyToLab(customerId){
 try{const copy=SOC.dispatch(SCP.state,{type:'copy-to-lab',customerId});providerRelease();if(SCP.host)SCP.host.hidden=true;providerIsolateLegacy(false);socClose();SCT.slot='lab-provider-'+customerId;SCT.state=null;SCT.seq=0;await socOpen();if(!SCT.locked)throw new Error('LAB_READ_ONLY');SCT.state=copy;SCT.error='';socStore();socRender();}catch(error){providerError(error);}
}
async function providerExperience(kind){
 if(kind==='providerCampaign')return providerOpen();
 if(!['training','lab','sp'].includes(kind))return;
 providerRelease();if(SCP.host)SCP.host.hidden=true;providerIsolateLegacy(false);
 if(kind==='sp'){showTitle();return;}
 socClose();SCT.slot=kind==='lab'?'lab':'main';SCT.state=null;SCT.seq=0;
 await socOpen();if(kind==='lab'&&SCT.state?.experience?.kind!=='lab'&&SCT.locked){SCT.state=SOC.create({experience:'lab',mode:'sandbox'});socStore();socRender();}
}
Object.assign(ACT,{provider:providerOpen,providerHome:providerHome,providerLab:()=>providerExperience('lab')});
document.addEventListener('visibilitychange',()=>{if(document.hidden){providerPause();providerCancel();providerRender();}});
addEventListener('pagehide',providerRelease);
addEventListener('storage',e=>{if(e.key!==SCP_KEY||!SCP.state)return;try{if(!e.newValue||JSON.parse(e.newValue).seq!==SCP.seq){providerRelease();SCP.error='The saved career changed in another tab. Reopen it to continue.';providerRender();}}catch(error){providerRelease();providerError(error);}});

function providerPreferences(value){
 if(typeof SOCServicePreferences==='undefined')return null;
 if(!value)return SOCServicePreferences.read(localStorage);
 try{const next=SOCServicePreferences.write(localStorage,value);if(next.sound){try{const Audio=gAudio();if(Audio){providerAudioContext=providerAudioContext||new Audio();providerAudioContext.resume()?.catch(()=>{});}}catch{}}if(next.language!==document.documentElement.lang){localStorage.setItem('soc-sp-lang',next.language);if(SCP.state&&SCP.locked)providerStore();location.reload();}return next;}catch(error){providerError(error);return null;}
}

let providerAudioContext=null;
function providerPresentationEvents(before,after){
 const story=SOC.provider.rules.missions[after.providerCampaign.scenario]?.presentation,reactions=[];
 if(story)for(const customer of after.providerCampaign.customers){
  if(customer.id!=='starter-customer')continue;
  const previous=before.providerCampaign.customers.find(row=>row.id===customer.id),jobs=after.providerCampaign.jobs.filter(job=>job.customerId===customer.id),event=(code)=>after.providerCampaign.events.findLast(row=>row.customerId===customer.id&&row.code===code);
  if(previous&&(previous.metrics.completed||0)===0&&customer.metrics.completed>0){const job=jobs.find(row=>row.status==='completed');if(job)reactions.push({sourceId:job.id,customerId:customer.id,at:after.clock,message:story.firstWork});}
  if(previous&&(previous.metrics.failed||0)===0&&customer.metrics.failed>0){const job=jobs.find(row=>row.status==='failed');if(job)reactions.push({sourceId:job.id,customerId:customer.id,at:after.clock,message:story.firstFailure});}
  const resolved=after.providerCampaign.incidents.find(row=>row.customerId===customer.id&&row.status==='resolved'&&before.providerCampaign.incidents.find(old=>old.id===row.id)?.status!=='resolved');
  if(resolved&&SOC.provider.inspect(after).customers.find(row=>row.id===customer.id)?.services.find(row=>row.id===resolved.resource)?.observed.ready===true)reactions.push({sourceId:resolved.id,customerId:customer.id,at:after.clock,message:story.recovered});
  if(previous&&previous.history.length===0&&customer.history.length){const bill=customer.history.at(-1),receipt=after.providerCampaign.events.findLast(row=>row.code==='PROVIDER_PERIOD_SETTLED'&&row.at===after.clock),money=cents=>`A$${(cents/100).toFixed(2)}`;if(receipt)reactions.push({sourceId:receipt.id,customerId:customer.id,at:after.clock,message:story.firstBill.replace('{net}',money(bill.netRetail)).replace('{credit}',money(bill.credit))});}
  if(story.postRepairCurrent&&after.providerCampaign.staffingCommitmentVersion===1){
   const chapter=SOC.provider.inspect(after).postRepairChapter;
   if(chapter?.customerId===customer.id&&chapter.done&&before.clock<chapter.to&&after.clock>=chapter.to){
    const arrival=after.providerCampaign.events.findLast(row=>row.code==='CUSTOMER_WORK_ARRIVED'&&row.customerId===customer.id&&row.at>chapter.from&&row.at<=chapter.to);
    if(arrival){const values={onTime:chapter.onTime,offered:chapter.offered,failed:chapter.failed,waiting:chapter.waiting,coverStatus:chapter.cover?.status||''},template=chapter.cover?story.postRepairCovered:story.postRepairCurrent,message=template.replace(/\{([a-zA-Z]+)\}/g,(_,key)=>String(values[key]??''));reactions.push({sourceId:arrival.id,customerId:customer.id,at:after.clock,message});}
   }
  }
 }
 if(reactions.length)SOC_PROVIDER_UI.noteEvents(reactions);
 const preferences=providerPreferences();if(!preferences?.sound)return;
 const previous=before.providerCampaign.events.at(-1)?.id;
 const events=after.providerCampaign.events,offset=events.findIndex(e=>e.id===previous);
 if(!events.slice(offset+1).some(e=>['INCIDENT_ACTIVE','PROVIDER_PERIOD_SETTLED','CUSTOMER_RENEWAL_OFFERED','MISSION_WON'].includes(e.code)))return;
 try{const Audio=gAudio();if(!Audio)return;providerAudioContext=providerAudioContext||new Audio();if(providerAudioContext.state!=='running')return;const oscillator=providerAudioContext.createOscillator(),gain=providerAudioContext.createGain(),now=providerAudioContext.currentTime;oscillator.frequency.value=440;gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.001,now+.12);oscillator.connect(gain);gain.connect(providerAudioContext.destination);oscillator.start(now);oscillator.stop(now+.13);}catch{/* Audio failure cannot affect simulation work. */}
}
function gAudio(){return globalThis.AudioContext||globalThis.webkitAudioContext;}
