/* Single authoritative campaign clock and persistence controller. UI remains a projection. */
const SCP={atHome:true,state:null,seq:0,locked:false,release:null,lockJob:0,worker:null,busy:false,job:0,speed:0,lastSpeed:1,acc:0,last:0,error:'',host:null,decision:false,decisionSpeed:0,frameStarted:false};
const SCP_KEY='series-of-calls:provider:v1',SCP_LOCK='series-of-calls:provider-lock:v1';
function providerCancel(){SCP.job++;SCP.busy=false;SCP.acc=0;if(SCP.worker){SCP.worker.terminate();SCP.worker=null;}}
function providerPause(){SCP.speed=0;SCP.acc=0;SCP.last=performance.now();}
function providerError(error){providerPause();SCP.error=String(error?.message||error);providerRender();}
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
 const result={coachDismissed:value?.coachDismissed===true,drawer:['goals','deals','incidents','operations','suppliers','team','finance','automation','help','settings'].includes(value?.drawer)?value.drawer:'goals',layer:['geography','services','workloads','costs'].includes(value?.layer)?value.layer:'services',camera:{x:0,y:0,zoom:1},selection:null};
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
function providerModel(){
 if(!SCP.state)return null;
 const m=SOC.provider.inspect(SCP.state),planComparisons=m.planComparisons;
 const supplierMap=new Map();for(const customer of m.customers){for(const [stage,commitment] of Object.entries(customer.stages)){if(!commitment)continue;const id=SOC.provider.rules.plans[customer.planId]?.[stage]?.supplier,actor=SCP.state.business.organisations[id];if(!actor)continue;if(!supplierMap.has(id))supplierMap.set(id,{id,name:actor.name,roles:actor.roles,commitments:[],scope:'provider'});supplierMap.get(id).commitments.push({customerId:customer.id,stage,status:commitment.status,periodCents:commitment.periodCents});}}
 const suppliers=[...supplierMap.values()],atRisk=m.customers.reduce((n,c)=>n+(c.periodOutcome?.atRisk||0),0),constrained=m.customers.flatMap(c=>c.services.filter(r=>r.pressure?.constrained).map(r=>c.name+' · '+r.name));
 return {...m,planComparisons,suppliers,capacityWarning:constrained.length?constrained.join('; '):atRisk?(typeof tr==='function'?tr('provider.due_soon',{count:atRisk}):`${atRisk} cases due within five minutes`):'',automation:(SCP.state.providerAutomation||[]).map(p=>({...p,name:'Assurance for '+p.customerId})),revision:SCP.state.revision,period:Math.floor(SCP.state.clock/60)+1,periodMinutes:60,
  periodOutcome:m.customers.reduce((n,c)=>({offered:n.offered+(c.periodOutcome?.due||0),completed:n.completed+((c.periodOutcome?.completedOnTime||0)+(c.periodOutcome?.late||0))}),{offered:0,completed:0}),
  team:{...SCP.state.business.workforce},warning:SCP.error||(!SCP.locked?'Read-only: another tab owns this career':''),locked:SCP.locked,busy:SCP.busy};
}
function providerRender(){
 if(!SCP.host||SCP.host.hidden)return;
 SOC_PROVIDER_UI.render(SCP.atHome?null:SCP.state,SCP.atHome?null:providerModel(),{paused:!SCP.speed,speed:SCP.speed||SCP.lastSpeed,preferences:providerPreferences()});
 let alert=SCP.host.querySelector('[data-provider-error]');if(!alert){alert=document.createElement('div');alert.dataset.providerError='';alert.setAttribute('role','alert');SCP.host.append(alert);}alert.textContent=SCP.error;alert.hidden=!SCP.error;
}
function providerEnsureMount(){
 let host=document.getElementById('provider-campaign');if(!host){host=document.createElement('section');host.id='provider-campaign';host.setAttribute('aria-label','Provider campaign');document.body.append(host);}SCP.host=host;host.hidden=false;
 if(!host.childElementCount)SOC_PROVIDER_UI.mount(host,{preferences:providerPreferences,policyPreview:(config,customerId)=>SOC.provider.policyPreview(SCP.state,config,customerId),contextualOperations:selection=>{if(!selection?.customerId||!SCP.state)return [];return SOC.provider.inspect(SCP.state).operations.filter(o=>!['retry-case-followup','provider-support-coverage','site-diverse-ingress','owned-site-operations','site-recovery','managed-site-recovery','site-resource-migration','custody-review'].includes(o.id)).map(o=>{const q=SOC.provider.quote(SCP.state,{action:'operation',operationId:o.id,customerId:selection.customerId});return {...o,quote:q,customerId:selection.customerId,operationId:o.id,available:q.blockers.every(code=>['INSUFFICIENT_CASH','ENGINEER_CAPACITY','SUPPORT_CAPACITY','INSOLVENT'].includes(code)),blockers:q.blockers};});},command:providerCommand,copyToLab:providerCopyToLab,quote:q=>SOC.provider.quote(SCP.state,q),speed:providerSpeed,pause:()=>providerSpeed(SCP.speed?0:SCP.lastSpeed),decision:providerDecision,save:()=>{try{providerStore();}catch(e){providerError(e);}},export:providerExport,import:providerImport,close:providerHome,openExperience:providerExperience,newGame:providerNew});
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
  if(raw){const e=JSON.parse(raw);if(e.app!==SOC.APP||e.experience!=='campaign'||e.version!==1||!Number.isSafeInteger(e.seq)||e.seq<1)throw new Error('INVALID_PROVIDER_SAVE_ENVELOPE');
   const next=SOC.restore(JSON.stringify(e.state));if(!next.providerCampaign)throw new Error('PROVIDER_SAVE_REQUIRED');SCP.state=next;SCP.seq=e.seq;SOC_PROVIDER_UI.render(SCP.state,providerModel(),providerSavedView(e.view));}
 }catch(e){providerRelease();providerError(e);return;}}
 if(!SCP.state){if(!SCP.locked)return providerRender();SCP.state=SOC.create({experience:'campaign'});providerStore();}
 providerRender();
}
async function providerNew(options={}){
 SCP.atHome=false;try{providerEnsureMount();providerPause();providerCancel();if(!await providerAcquire())return providerRender();
  const raw=localStorage.getItem(SCP_KEY);if(raw){const old=JSON.parse(raw);if(!Number.isSafeInteger(old.seq))throw new Error('INVALID_PROVIDER_SAVE_ENVELOPE');SCP.seq=old.seq;}
  SCP.state=SOC.create({experience:'campaign',...options});SCP.error='';SOC_PROVIDER_UI.render(SCP.state,providerModel(),{...providerSavedView(null),quoteModal:false,quote:null,importOpen:false,newGameOpen:false});providerStore();providerRender();
 }catch(e){providerError(e);}
}
function providerCommand(command){
 try{if(!SCP.locked)throw new Error('PROVIDER_READ_ONLY');providerCancel();
  const envelope={...command,expectedRevision:SCP.state.revision,requestId:'provider-'+(SCP.state.providerRequestSequence+1)};
  SCP.state=SOC.dispatch(SCP.state,envelope);SCP.error='';
  // A storage failure does not undo a committed simulation command. Keep the
  // live result exportable and never invite a second purchase as a retry.
  try{providerStore();}catch(error){providerError(error);return {ok:true,persisted:false,error:String(error?.message||error),revision:SCP.state.revision};}
  providerRender();return {ok:true,persisted:true,revision:SCP.state.revision};
 }catch(e){providerError(e);return {ok:false,error:String(e?.message||e)};}
}
function providerDecision(open){
 if(open&&!SCP.decision){SCP.decisionSpeed=SCP.speed;SCP.decision=true;providerPause();providerCancel();providerRender();}
 else if(!open&&SCP.decision){const speed=SCP.decisionSpeed;SCP.decision=false;SCP.decisionSpeed=0;providerSpeed(speed);}
}
function providerSpeed(value){
 if(![0,.5,1,2,4,8].includes(value))return;
 if(SCP.decision){SCP.decisionSpeed=value;return;}
 if(!SCP.locked||!SCP.state||document.hidden||SCP.state.providerCampaign.status!=='operating')value=0;
 if(!value)providerCancel();SCP.speed=value;if(value)SCP.lastSpeed=value;SCP.acc=0;SCP.last=performance.now();providerRender();
}
function providerTick(){
 if(SCP.busy||!SCP.locked||!SCP.state)return;
 const snapshot=SCP.state,revision=snapshot.revision,id=++SCP.job,command={type:'advance',minutes:1,expectedRevision:revision};SCP.busy=true;
 const current=()=>id===SCP.job&&SCP.locked&&SCP.state.revision===revision;
 const accept=next=>{if(!current())return;SCP.busy=false;SCP.worker=null;SCP.state=SOC.validateState(next);providerPresentationEvents(snapshot,SCP.state);SCP.error='';providerStore();const p=SCP.state.providerCampaign,previous=snapshot.providerCampaign;
 if(p.status!=='operating'||p.incidents.some(i=>i.status==='active'&&!previous.incidents.some(old=>old.id===i.id&&old.status==='active'))||p.customers.some(c=>c.status==='renewal'&&!previous.customers.some(old=>old.id===c.id&&old.status==='renewal')))providerPause();providerRender();};
 const fallback=()=>{if(!current())return;try{accept(SOC.dispatch(snapshot,command));}catch(e){SCP.busy=false;providerError(e);}};
 if(typeof Worker!=='function')return fallback();
 let worker;
 try{const url=URL.createObjectURL(new Blob([SOC.workerSource()],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);}catch(e){return fallback();}
 SCP.worker=worker;const timer=setTimeout(()=>{worker.terminate();fallback();},5000);
 worker.onerror=()=>{clearTimeout(timer);worker.terminate();fallback();};
 worker.onmessage=e=>{clearTimeout(timer);worker.terminate();if(!current())return;if(e.data.id!==id||e.data.revision!==revision)return fallback();if(e.data.error){SCP.busy=false;return providerError(new Error(e.data.error));}try{accept(e.data.state);}catch(error){providerError(error);}};
 worker.postMessage({id,state:snapshot,command});
}
function providerFrame(now){
 requestAnimationFrame(providerFrame);const delta=SCP.last?Math.min(250,Math.max(0,now-SCP.last)):0;SCP.last=now;
 if(!SCP.host||SCP.host.hidden||!SCP.speed||!SCP.locked||document.hidden||SCP.decision){SCP.acc=0;return;}
 if(SCP.busy){SCP.acc=0;return;}
 SCP.acc+=delta*SCP.speed;if(SCP.acc>=2000){SCP.acc-=2000;providerTick();}
}
function providerExport(){if(!SCP.state)return;const url=URL.createObjectURL(new Blob([JSON.stringify(SCP.state)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='series-of-calls-provider.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function providerImport(text){try{const next=SOC.restore(text);if(!next.providerCampaign)throw new Error('PROVIDER_SAVE_REQUIRED');if(!SCP.locked)throw new Error('PROVIDER_READ_ONLY');providerPause();providerCancel();SCP.state=next;SCP.error='';providerStore();providerRender();}catch(e){providerError(e);}}
async function providerCopyToLab(customerId){
 try{const copy=SOC.dispatch(SCP.state,{type:'copy-to-lab',customerId});providerRelease();if(SCP.host)SCP.host.hidden=true;socClose();SCT.slot='lab-provider-'+customerId;SCT.state=null;SCT.seq=0;await socOpen();if(!SCT.locked)throw new Error('LAB_READ_ONLY');SCT.state=copy;SCT.error='';socStore();socRender();}catch(error){providerError(error);}
}
async function providerExperience(kind){
 if(kind==='providerCampaign')return providerOpen();
 if(!['training','lab','sp'].includes(kind))return;
 providerRelease();if(SCP.host)SCP.host.hidden=true;
 if(kind==='sp'){showTitle();return;}
 socClose();SCT.slot=kind==='lab'?'lab':'main';SCT.state=null;SCT.seq=0;
 await socOpen();if(kind==='lab'&&SCT.state?.experience?.kind!=='lab'&&SCT.locked){SCT.state=SOC.create({experience:'lab',mode:'sandbox'});socStore();socRender();}
}
Object.assign(ACT,{provider:providerOpen,providerHome:providerHome,providerLab:()=>providerExperience('lab')});
addEventListener('visibilitychange',()=>{if(document.hidden){providerPause();providerCancel();providerRender();}});
addEventListener('pagehide',providerRelease);
addEventListener('storage',e=>{if(e.key!==SCP_KEY||!SCP.state)return;try{if(!e.newValue||JSON.parse(e.newValue).seq!==SCP.seq){providerRelease();SCP.error='The saved career changed in another tab. Reopen it to continue.';providerRender();}}catch(error){providerRelease();providerError(error);}});

function providerPreferences(value){
 if(typeof SOCServicePreferences==='undefined')return null;
 if(!value)return SOCServicePreferences.read(localStorage);
 try{const next=SOCServicePreferences.write(localStorage,value);if(next.sound){try{const Audio=gAudio();if(Audio){providerAudioContext=providerAudioContext||new Audio();providerAudioContext.resume()?.catch(()=>{});}}catch{}}if(next.language!==document.documentElement.lang){localStorage.setItem('soc-sp-lang',next.language);if(SCP.state&&SCP.locked)providerStore();location.reload();}return next;}catch(error){providerError(error);return null;}
}

let providerAudioContext=null;
function providerPresentationEvents(before,after){
 const preferences=providerPreferences();if(!preferences?.sound)return;
 const previous=before.providerCampaign.events.at(-1)?.id;
 const events=after.providerCampaign.events,offset=events.findIndex(e=>e.id===previous);
 if(!events.slice(offset+1).some(e=>['INCIDENT_ACTIVE','PROVIDER_PERIOD_SETTLED','CUSTOMER_RENEWAL_OFFERED','MISSION_WON'].includes(e.code)))return;
 try{const Audio=gAudio();if(!Audio)return;providerAudioContext=providerAudioContext||new Audio();if(providerAudioContext.state!=='running')return;const oscillator=providerAudioContext.createOscillator(),gain=providerAudioContext.createGain(),now=providerAudioContext.currentTime;oscillator.frequency.value=440;gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.001,now+.12);oscillator.connect(gain);gain.connect(providerAudioContext.destination);oscillator.start(now);oscillator.stop(now+.13);}catch{/* Audio failure cannot affect simulation work. */}
}
function gAudio(){return globalThis.AudioContext||globalThis.webkitAudioContext;}
