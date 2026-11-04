/* Single authoritative campaign clock and persistence controller. UI remains a projection. */
const SCP={atHome:true,state:null,seq:0,locked:false,release:null,worker:null,busy:false,job:0,speed:0,lastSpeed:1,acc:0,last:0,error:'',host:null,decision:false,decisionSpeed:0,frameStarted:false};
const SCP_KEY='series-of-calls:provider:v1',SCP_LOCK='series-of-calls:provider-lock:v1';
function providerCancel(){SCP.job++;SCP.busy=false;SCP.acc=0;if(SCP.worker){SCP.worker.terminate();SCP.worker=null;}}
function providerPause(){SCP.speed=0;SCP.acc=0;SCP.last=performance.now();}
function providerError(error){providerPause();SCP.error=String(error?.message||error);providerRender();}
function providerRelease(){providerPause();providerCancel();if(SCP.release){SCP.release();SCP.release=null;}SCP.locked=false;}
async function providerAcquire(){
 if(SCP.locked)return true;
 if(!navigator.locks){SCP.error='This browser cannot safely own a career save. Export remains available.';return false;}
 return new Promise(resolve=>navigator.locks.request(SCP_LOCK,{ifAvailable:true},async lock=>{
  if(!lock){SCP.error='This career is open in another tab. This view is read-only.';resolve(false);return;}
  SCP.locked=true;resolve(true);await new Promise(done=>SCP.release=done);SCP.locked=false;
 }));
}
function providerSavedView(value=SOC_PROVIDER_UI.view()){
 const result={coachDismissed:value?.coachDismissed===true,drawer:['goals','deals','incidents','operations','suppliers','team','finance','automation','help','settings'].includes(value?.drawer)?value.drawer:'goals',layer:['geography','services','workloads','costs'].includes(value?.layer)?value.layer:'services',camera:{x:0,y:0,zoom:1},selection:null};
 if(value?.camera&&['x','y','zoom'].every(k=>Number.isFinite(value.camera[k]))){result.camera={x:Math.max(-10000,Math.min(10000,value.camera.x)),y:Math.max(-10000,Math.min(10000,value.camera.y)),zoom:Math.max(.75,Math.min(1.8,value.camera.zoom))};}
 if(SCP.state?.providerCampaign.customers.some(c=>c.id===value?.selection?.customerId)){result.selection={customerId:value.selection.customerId};const child=SCP.state.portfolio.customers.find(c=>c.id===value.selection.customerId)?.root;if(child?.resources[value.selection.serviceId])result.selection.serviceId=value.selection.serviceId;}
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
 const m=SOC.provider.inspect(SCP.state);
 return {...m,automation:(SCP.state.providerAutomation||[]).map(p=>({...p,name:'Assurance for '+p.customerId})),revision:SCP.state.revision,period:Math.floor(SCP.state.clock/60)+1,periodMinutes:60,
  outcome:m.customers.reduce((n,c)=>({offered:n.offered+c.outcome.offered,completed:n.completed+c.outcome.completed}),{offered:0,completed:0}),
  team:{...SCP.state.business.workforce},warning:SCP.error||(!SCP.locked?'Read-only: another tab owns this career':''),locked:SCP.locked,busy:SCP.busy};
}
function providerRender(){
 if(!SCP.host||SCP.host.hidden)return;
 SOC_PROVIDER_UI.render(SCP.atHome?null:SCP.state,SCP.atHome?null:providerModel(),{paused:!SCP.speed,speed:SCP.speed||SCP.lastSpeed});
 let alert=SCP.host.querySelector('[data-provider-error]');if(!alert){alert=document.createElement('div');alert.dataset.providerError='';alert.setAttribute('role','alert');SCP.host.append(alert);}alert.textContent=SCP.error;alert.hidden=!SCP.error;
}
function providerEnsureMount(){
 let host=document.getElementById('provider-campaign');if(!host){host=document.createElement('section');host.id='provider-campaign';host.setAttribute('aria-label','Provider campaign');document.body.append(host);}SCP.host=host;host.hidden=false;
 if(!host.childElementCount)SOC_PROVIDER_UI.mount(host,{command:providerCommand,copyToLab:providerCopyToLab,quote:q=>SOC.provider.quote(SCP.state,q),speed:providerSpeed,pause:()=>providerSpeed(SCP.speed?0:SCP.lastSpeed),decision:providerDecision,save:()=>{try{providerStore();}catch(e){providerError(e);}},export:providerExport,import:providerImport,close:providerHome,openExperience:providerExperience,newGame:providerNew});
 if(!SCP.frameStarted&&!window.__TUBES_TEST__){SCP.frameStarted=true;requestAnimationFrame(providerFrame);}
}
function providerHome(){
 SCP.atHome=true;providerRelease();UI.speed=0;if(typeof socClose==='function')socClose();
 const modal=document.getElementById('modal');if(modal)modal.hidden=true;
 providerEnsureMount();SOC_PROVIDER_UI.render(null,null,{paused:true,speed:SCP.lastSpeed});
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
  SCP.state=SOC.dispatch(SCP.state,envelope);SCP.error='';providerStore();providerRender();
 }catch(e){providerError(e);}
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
 const accept=next=>{if(!current())return;SCP.busy=false;SCP.worker=null;SCP.state=SOC.validateState(next);SCP.error='';providerStore();const p=SCP.state.providerCampaign,previous=snapshot.providerCampaign;
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
