/* Communications training console. The optional SP game keeps its existing canvas and controls. */
const SCT={state:null,slot:'main',selected:'phone',worker:null,job:0,busy:false,locked:false,release:null,seq:0,error:'',checkpoint:null};
const SCT_KEY='series-of-calls:training:',SCT_LOCK='series-of-calls:training-lock:';
const SOC_LABELS={attribution:N_('training.attribution'),license:N_('training.license'),notices:N_('training.notices'),"topology_keys":N_('training.topology_keys'),"title":N_('training.title'),"synthetic":N_('training.synthetic'),"milestone":N_('training.milestone'),"sp":N_('training.sp'),"exercise":N_('training.exercise'),"jurisdiction":N_('training.jurisdiction'),"mode":N_('training.mode'),"guided":N_('training.guided'),"assessed":N_('training.assessed'),"sandbox":N_('training.sandbox'),"new":N_('training.new'),"export":N_('training.export'),"import":N_('training.import'),"clock":N_('training.clock'),"editable":N_('training.editable'),"read_only":N_('training.read_only'),"profit":N_('training.profit'),"consoles":N_('training.consoles'),"ready":N_('training.ready'),"unavailable":N_('training.unavailable'),"provisioning":N_('training.provisioning'),"submit":N_('training.submit'),"checkpoint":N_('training.checkpoint'),"restore":N_('training.restore'),"outage":N_('training.outage'),"repair":N_('training.repair'),"effective":N_('training.effective'),"healthy":N_('training.healthy'),"topology":N_('training.topology'),"journey":N_('training.journey'),"minute":N_('training.minute'),"five":N_('training.five'),"test":N_('training.test'),"meeting":N_('training.meeting'),"disconnect":N_('training.disconnect'),"reconnect":N_('training.reconnect'),"passed":N_('training.passed'),"incomplete":N_('training.incomplete'),"lesson":N_('training.lesson'),"lesson_smb":N_('training.lesson_smb'),"lesson_enterprise":N_('training.lesson_enterprise'),"lesson_government":N_('training.lesson_government'),"lesson_defence":N_('training.lesson_defence'),"trace":N_('training.trace'),"no_trace":N_('training.no_trace'),"records":N_('training.records'),"ledger":N_('training.ledger'),"newer_save":N_('training.newer_save'),"locks_required":N_('training.locks_required'),"slot_busy":N_('training.slot_busy'),"open":N_('training.open'),"sp_note":N_('training.sp_note'),"isp_save":N_('training.isp_save'),"field_enabled":N_('training.field_enabled'),"field_local":N_('training.field_local'),"field_identities":N_('training.field_identities'),"field_entitled":N_('training.field_entitled'),"field_region":N_('training.field_region'),"field_capacity":N_('training.field_capacity'),"field_directory":N_('training.field_directory'),"field_connectivity":N_('training.field_connectivity'),"field_deployment":N_('training.field_deployment'),"field_carriermodel":N_('training.field_carriermodel'),"field_routes":N_('training.field_routes'),"field_extensionscope":N_('training.field_extensionscope'),"field_normalisation":N_('training.field_normalisation'),"field_signalling":N_('training.field_signalling'),"field_mediaout":N_('training.field_mediaout'),"field_mediain":N_('training.field_mediain'),"field_identity":N_('training.field_identity'),"field_extension":N_('training.field_extension'),"field_scope":N_('training.field_scope'),"field_number":N_('training.field_number'),"field_registered":N_('training.field_registered'),"field_firmware":N_('training.field_firmware'),"field_operator":N_('training.field_operator'),"field_people":N_('training.field_people'),"field_entitlements":N_('training.field_entitlements'),"field_skills":N_('training.field_skills'),"field_languages":N_('training.field_languages'),"field_shiftstart":N_('training.field_shiftstart'),"field_shiftend":N_('training.field_shiftend'),"field_handlingminutes":N_('training.field_handlingminutes'),"field_wrapminutes":N_('training.field_wrapminutes'),"field_digitalconcurrency":N_('training.field_digitalconcurrency'),"field_workforce":N_('training.field_workforce'),"field_skill":N_('training.field_skill'),"field_language":N_('training.field_language'),"field_maxwait":N_('training.field_maxwait'),"field_callback":N_('training.field_callback'),"field_approved":N_('training.field_approved'),"field_templates":N_('training.field_templates'),"field_ratelimit":N_('training.field_ratelimit'),"field_identitymapping":N_('training.field_identitymapping'),"field_channel":N_('training.field_channel'),"field_queue":N_('training.field_queue'),"field_crm":N_('training.field_crm'),"field_template":N_('training.field_template'),"field_handoff":N_('training.field_handoff'),"field_botresolves":N_('training.field_botresolves'),"field_retries":N_('training.field_retries'),"field_calendar":N_('training.field_calendar'),"field_account":N_('training.field_account'),"field_mode":N_('training.field_mode'),"field_interop":N_('training.field_interop'),"field_microphone":N_('training.field_microphone'),"field_camera":N_('training.field_camera'),"field_consent":N_('training.field_consent'),"field_archive":N_('training.field_archive'),"field_retentiondays":N_('training.field_retentiondays'),"field_access":N_('training.field_access'),"field_operation":N_('training.field_operation'),"field_licencelocal":N_('training.field_licencelocal'),"field_dns":N_('training.field_dns'),"field_time":N_('training.field_time'),"field_certificates":N_('training.field_certificates'),"field_licensing":N_('training.field_licensing'),"field_backup":N_('training.field_backup')};
const socT=(key,vars)=>tr(SOC_LABELS[key.toLowerCase()]||key,vars);
function socViewState(){const p=SCT.state?.portfolio;return p?.customers.find(c=>c.id===p.selectedCustomer)?.root||SCT.state;}
Object.defineProperty(SCT,'viewState',{get:socViewState});
function socError(e){SCT.error=String(e.message||e);socRender();}
function socStore(){
  if(!SCT.state||!SCT.locked)return;
  const key=SCT_KEY+SCT.slot,old=localStorage.getItem(key),previous=old?JSON.parse(old):null;
  if(previous&&previous.seq>SCT.seq){SCT.locked=false;throw new Error(socT('newer_save'));}
  const data=JSON.stringify({app:SOC.APP,seq:SCT.seq+1,state:SCT.state});localStorage.setItem(key,data);SCT.seq++;return data;
}
async function socAcquire(){
  if(SCT.locked)return true;
  if(!navigator.locks){SCT.error=socT('locks_required');return false;}
  return new Promise(resolve=>navigator.locks.request(SCT_LOCK+SCT.slot,{ifAvailable:true},async lock=>{
    if(!lock){SCT.error=socT('slot_busy');resolve(false);return;}
    SCT.locked=true;resolve(true);await new Promise(done=>SCT.release=done);SCT.locked=false;
  }).catch(e=>{socError(e);resolve(false);}));
}
async function socOpen(){
  UI.speed=0;SCT.error='';
  const existing=document.getElementById('soc-console');if(existing)existing.hidden=false;
  const alreadyOwned=SCT.locked;await socAcquire();
  // Read only after acquisition: another tab may have saved while this console was closed.
  if(!alreadyOwned){try{const raw=localStorage.getItem(SCT_KEY+SCT.slot);if(raw){const saved=JSON.parse(raw);if(saved.app!==SOC.APP||!Number.isSafeInteger(saved.seq)||saved.seq<0)throw new Error('INVALID_SAVE_ENVELOPE');SCT.state=SOC.restore(JSON.stringify(saved.state));SCT.seq=saved.seq;SCT.checkpoint=null;}}catch(e){SCT.locked=false;if(SCT.release){SCT.release();SCT.release=null;}socError(e);}}
  if(!SCT.state)SCT.state=SOC.create();socRender();
}
function socCancel(){SCT.job++;SCT.busy=false;if(SCT.worker){SCT.worker.terminate();SCT.worker=null;}}
function socClose(){socCancel();const el=document.getElementById('soc-console');if(el)el.hidden=true;if(SCT.release){SCT.release();SCT.release=null;}SCT.locked=false;}
function socApply(command){
  if(!SCT.locked)throw new Error(socT('read_only'));
  const selected=SCT.state.portfolio?.selectedCustomer;
  if(command.type==='portfolio')SCT.checkpoint=null;
  if(selected&&!['portfolio','advance','market-qualification','managed-operations'].includes(command.type))command={type:'portfolio',command:{action:'dispatchcustomer',customerId:selected,command}};
  SCT.state=SOC.dispatch(SCT.state,{...command,expectedRevision:SCT.state.revision});SCT.error='';socStore();socRender();
}
function socAdvance(minutes){
  if(SCT.busy)return;
  if(!SCT.locked)return socError(new Error(socT('read_only')));
  const command={type:'advance',minutes,expectedRevision:SCT.state.revision},snapshot=SCT.state,id=++SCT.job;
  const fallback=()=>{if(id!==SCT.job)return;SCT.busy=false;try{socApply({...command,expectedRevision:SCT.state.revision});}catch(e){socError(e);}};
  if(typeof Worker!=='function')return fallback();
  let worker;
  try{const url=URL.createObjectURL(new Blob([SOC.workerSource()],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);}catch(e){return fallback();}
  SCT.worker=worker;SCT.busy=true;socRender();const timer=setTimeout(()=>{worker.terminate();fallback();},5000);
  worker.onerror=()=>{clearTimeout(timer);worker.terminate();fallback();};
  worker.onmessage=e=>{
    clearTimeout(timer);worker.terminate();if(id!==SCT.job||!SCT.locked)return;SCT.worker=null;SCT.busy=false;
    // A newer configuration invalidates the entire result. Re-execute once against current state.
    if(e.data.revision!==SCT.state.revision)return fallback();
    if(e.data.error)return socError(new Error(e.data.error));
    try{SCT.state=SOC.validateState(e.data.state);socStore();socRender();}catch(error){socError(error);}
  };
  worker.postMessage({id,state:snapshot,command});
}
function socField(key,value){
  const id='soc-field-'+key,label=socT('field_'+key);
  if(typeof value==='boolean')return `<label class="soc-toggle"><input id="${id}" name="${key}" type="checkbox"${value?' checked':''}>${esc(label)}</label>`;
  if(Array.isArray(value))return `<label for="${id}">${esc(label)}<textarea id="${id}" name="${key}" rows="${key==='routes'?4:2}">${esc(JSON.stringify(value,null,2))}</textarea></label>`;
  return `<label for="${id}">${esc(label)}<input id="${id}" name="${key}" type="${typeof value==='number'?'number':'text'}"${typeof value==='number'?' min="0" max="100000" step="1"':''} value="${esc(String(value))}"></label>`;
}
function socRender(){
  let el=document.getElementById('soc-console');
  if(!el){el=document.createElement('section');el.id='soc-console';el.setAttribute('aria-label',socT('title'));document.body.appendChild(el);}
  const s=socViewState();if(!s)return;const results=SOC.calculate(s),r=s.resources[SCT.selected]||s.resources.phone,p=SOC.catalogue[r.kind];
  const options=(obj,chosen)=>Object.entries(obj).map(([id,v])=>`<option value="${id}"${id===chosen?' selected':''}>${esc(v.name||v)}</option>`).join('');
  const i=s.interactions.at(-1);
  el.innerHTML=`<header class="soc-header"><div><span class="soc-kicker">${socT('synthetic')}</span><h1>${socT('title')}</h1><p>${socT('milestone')}</p></div><button data-soc="provider-home">Play / Continue</button><button data-soc="close">${socT('sp')}</button></header>${socArtwork(s.scenario,true)}
  <div class="soc-toolbar"><label>${socT('exercise')}<select id="soc-scenario">${options(SOC.scenarios,s.scenario)}</select></label><label>${socT('jurisdiction')}<select id="soc-jurisdiction">${SOC.jurisdictions.map(j=>`<option${j===s.jurisdiction?' selected':''}>${j}</option>`).join('')}</select></label><label>${socT('mode')}<select id="soc-mode">${['guided','assessed','sandbox'].map(m=>`<option value="${m}"${m===s.mode?' selected':''}>${socT(m)}</option>`).join('')}</select></label><button data-soc="new">${socT('new')}</button><button data-soc="export">${socT('export')}</button><label class="soc-file">${socT('import')}<input type="file" id="soc-import" accept="application/json"></label></div>
  <div class="soc-status" role="status">${SCT.error?`<strong>${esc(SCT.error)}</strong>`:esc(socT('clock',{n:s.clock,rev:s.revision}))} · ${SCT.locked?socT('editable'):socT('read_only')} · ${socT('profit',{n:(results.profit/100).toFixed(2)})}</div>
  ${typeof socPortfolioPanel==='function'?socPortfolioPanel():''}<div class="soc-layout"><nav class="soc-nav" aria-label="${socT('consoles')}">${Object.values(s.resources).map(x=>`<button data-soc="select" data-id="${x.id}" class="${x.id===r.id?'selected':''}" aria-current="${x.id===r.id?'page':'false'}"><span>${esc(SOC.catalogue[x.kind].name)}</span><small>${esc(x.id)} · ${socT(results.services[x.id].ready?'ready':'unavailable')}</small></button>`).join('')}</nav>
  <main class="soc-admin soc-${p.console}"><div class="soc-kicker">${esc(p.console)} · ${esc(p.unit)}</div><h2>${esc(p.name)}</h2>${socNarrativeResource(r.kind)}<p>${esc(socT('provisioning',{state:r.provisioning.status}))}</p><form id="soc-config"><div class="soc-fields">${Object.entries(r.desired).map(([k,v])=>socField(k,v)).join('')}</div><div class="soc-buttons"><button type="submit"${!SCT.locked?' disabled':''}>${socT('submit')}</button><button type="button" data-soc="checkpoint">${socT('checkpoint')}</button><button type="button" data-soc="restore"${!SCT.checkpoint?' disabled':''}>${socT('restore')}</button><button type="button" data-soc="fault">${socT(r.fault?'repair':'outage')}</button></div></form>
  <details><summary>${socT('effective')}</summary><pre>${esc(JSON.stringify(r.effective,null,2))}</pre></details><p>${results.services[r.id].reasons.map(esc).join(' · ')||socT('healthy')}</p><canvas id="soc-topology" width="680" height="180" aria-label="${socT('topology')}"></canvas></main>
  <aside class="soc-inspector"><h2>${socT('journey')}</h2><p>${esc(SOC.scenarios[s.scenario].goal)}</p><div class="soc-buttons"><button data-soc="minute"${SCT.busy?' disabled':''}>${socT('minute')}</button><button data-soc="five"${SCT.busy?' disabled':''}>${socT('five')}</button><button data-soc="interaction">${socT('test')}</button><button data-soc="meeting">${socT('meeting')}</button><button data-soc="connect">${socT(s.connected?'disconnect':'reconnect')}</button></div><p class="soc-result">${socT(results.assessment.passed?'passed':'incomplete')}</p><p>${esc(results.assessment.missing.join(', '))}</p>${s.mode==='guided'?`<details open><summary>${socT('lesson')}</summary><p>${socT('lesson_'+s.scenario)}</p></details>`:''}${typeof socInteractionPanel==='function'?socInteractionPanel():''}<h3>${socT('trace')}</h3>${i?`<p>${esc(i.id)} · ${esc(i.phase)} · ${esc(i.outcome||'')}</p><ol class="soc-trace">${i.trace.map(t=>`<li><small>${t.at} · ${esc(t.stage)}</small><strong>${esc(t.code)}</strong><pre>${esc(JSON.stringify(Object.fromEntries(Object.entries(t).filter(([k])=>!['at','stage','code','synthetic'].includes(k))),null,2))}</pre></li>`).join('')}</ol>`:`<p>${socT('no_trace')}</p>`}<details><summary>${socT('records')}</summary><pre>${esc(JSON.stringify(s.records,null,2))}</pre></details><details><summary>${socT('ledger')}</summary><pre>${esc(JSON.stringify(s.ledger.slice(-10),null,2))}</pre></details></aside></div>${typeof socCustomerNeedsPanel==='function'?socCustomerNeedsPanel(s,results):''}${typeof socSpeechModelsPanel==='function'?socSpeechModelsPanel(s,results):''}${typeof socProductEvidencePanel==='function'?socProductEvidencePanel(s,results):''}${typeof socMediaNegotiationPanel==='function'?socMediaNegotiationPanel(s,results):''}${typeof socManagedOperationsPanel==='function'?socManagedOperationsPanel(SCT.state,{managedOperations:SCT.state.managedOperations?SOC.managedOperations.inspect(SCT.state):null}):''}${typeof socSiteOperationsPanel==='function'?socSiteOperationsPanel(s,results):''}${typeof socSpecialistLifecyclePanel==='function'?socSpecialistLifecyclePanel(s,results):''}${typeof socSharedServicesPanel==='function'?socSharedServicesPanel(s,results):''}${typeof socSecurityPanel==='function'?socSecurityPanel(s,results):''}${typeof socObservationPanel==='function'?socObservationPanel(s,results):''}${socServiceAdminPanel(s,results)}${typeof socWorkforcePresencePanel==='function'?socWorkforcePresencePanel(s,results):''}${typeof socWorkforceOffersPanel==='function'?socWorkforceOffersPanel(s,results):''}${typeof socWorkforceQualityPanel==='function'?socWorkforceQualityPanel(s,results):''}${socContactPanel(s,results)}${socInformationPanel(s,results)}${socOperationsPanel(s,results)}${socBusinessPanel(s,results)}${socDomainAdminPanel(s,results)}${socLearningExtensionsPanel(s,results)}${socAdvancedAdminPanel(s,results)}${typeof socWebhookPanel==='function'?socWebhookPanel(s,results):''}${socNarrativePanel()}<footer class="soc-attribution"><p>${esc(socT('attribution'))} · <a href="LICENSE">${esc(socT('license'))}</a> · <a href="THIRD_PARTY_NOTICES.md">${esc(socT('notices'))}</a></p></footer>`;
  el.onclick=e=>{const b=e.target.closest('[data-soc]');if(!b)return;try{socClick(b.dataset.soc,b.dataset.id);}catch(error){socError(error);}};
  document.getElementById('soc-config').onsubmit=e=>{e.preventDefault();try{
    const form=e.target,c={};for(const [k,v] of Object.entries(r.desired)){const input=form.elements[k];c[k]=typeof v==='boolean'?input.checked:typeof v==='number'?Number(input.value):Array.isArray(v)?JSON.parse(input.value):input.value;}
    socApply({type:'configure',id:r.id,config:c});
  }catch(error){socError(error);}};
  document.getElementById('soc-import').onchange=async e=>{try{const file=e.target.files[0];if(!file||file.size>8e6)throw new Error('INVALID_SAVE_SIZE');const next=SOC.restore(await file.text());if(!SCT.locked)throw new Error(socT('read_only'));socCancel();SCT.state=next;SCT.checkpoint=null;socStore();SCT.error='';socRender();}catch(error){socError(error);}};
  if(typeof socBindWebhook==='function')socBindWebhook();
  if(typeof socBindCustomerNeeds==='function')socBindCustomerNeeds();
  if(typeof socBindWorkforceOffers==='function')socBindWorkforceOffers(SCT.state);
  if(typeof socBindWorkforceQuality==='function')socBindWorkforceQuality(SCT.state);
  if(typeof socBindWorkforcePresence==='function')socBindWorkforcePresence();
  if(typeof socBindSpeechModels==='function')socBindSpeechModels();
  if(typeof socBindProductEvidence==='function')socBindProductEvidence();
  if(typeof socBindMediaNegotiation==='function')socBindMediaNegotiation();
  if(typeof socBindManagedOperations==='function')socBindManagedOperations();
  if(typeof socBindSiteOperations==='function')socBindSiteOperations();
  if(typeof socBindInteraction==='function')socBindInteraction();
  if(typeof socBindSecurity==='function')socBindSecurity();
  if(typeof socBindObservation==='function')socBindObservation();
  if(typeof socBindSpecialistLifecycle==='function')socBindSpecialistLifecycle();
  if(typeof socBindSharedServices==='function')socBindSharedServices();
  if(typeof socBindPortfolio==='function')socBindPortfolio();
  socDraw(results);socBindServiceAdmin();socBindContact();socBindInformation();socBindOperations();socBindBusiness();socBindDomainAdmin();socBindLearningExtensions();socBindAdvancedAdmin();
}
function socDraw(results){
  const canvas=document.getElementById('soc-topology'),ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.clearRect(0,0,680,180);ctx.font='14px system-ui';const ids=['identity','phone','carrier','service','people'];
  ids.forEach((id,n)=>{const x=65+n*135;ctx.strokeStyle='#8b9ba5';if(n){ctx.beginPath();ctx.moveTo(x-100,65);ctx.lineTo(x-30,65);ctx.stroke();}ctx.fillStyle=results.services[id].ready?'#176b57':'#b24e3c';ctx.beginPath();ctx.arc(x,65,25,0,Math.PI*2);ctx.fill();if(SCT.selected===id){ctx.strokeStyle='#18313e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,65,30,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;}ctx.fillStyle='#18313e';ctx.textAlign='center';ctx.fillText(id,x,110);});
  canvas.tabIndex=0;canvas.setAttribute('role','group');canvas.setAttribute('aria-label',socT('topology_keys')+' '+SCT.selected);
  const select=id=>{socClick('select',id);document.getElementById('soc-topology').focus();};
  canvas.onclick=e=>{const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const x=(e.clientX-rect.left)*680/rect.width,y=(e.clientY-rect.top)*180/rect.height,n=Math.round((x-65)/135);if(n>=0&&n<ids.length&&Math.hypot(x-(65+n*135),y-65)<=32)select(ids[n]);};
  canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const at=Math.max(0,ids.indexOf(SCT.selected)),n=e.key==='Home'?0:e.key==='End'?ids.length-1:(at+(e.key==='ArrowRight'?1:ids.length-1))%ids.length;select(ids[n]);};
}
function socClick(action,id){
  if(action==='provider-home'){socClose();return providerHome();}if(action==='close')return socClose();if(action==='select'){SCT.selected=id;return socRender();}
  if(action==='new'){
    if(!SCT.locked)throw new Error(socT('read_only'));
    const scenario=document.getElementById('soc-scenario').value,jurisdiction=document.getElementById('soc-jurisdiction').value,mode=document.getElementById('soc-mode').value;
    socCancel();SCT.state=SOC.create({scenario,jurisdiction,mode});SCT.checkpoint=null;socStore();return socRender();
  }
  if(action==='minute'||action==='five')return socAdvance(action==='minute'?1:5);
  if(action==='interaction')return socApply({type:'interact',channel:SOC.scenarios[socViewState().scenario].channel,from:'alex',to:'+61255500201',caseId:'customer-case'});
  if(action==='meeting')return socApply({type:'meeting'});
  if(action==='connect')return socApply({type:'connect',connected:!socViewState().connected});
  if(action==='checkpoint'){SCT.checkpoint=Object.fromEntries(Object.values(socViewState().resources).map(r=>[r.id,JSON.parse(JSON.stringify(r.desired))]));return socRender();}
  if(action==='restore')return socApply({type:'restore',resources:SCT.checkpoint});
  if(action==='fault')return socApply({type:'fault',id:SCT.selected,fault:socViewState().resources[SCT.selected].fault?null:'OUTAGE'});
  if(action==='export'){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(SCT.state,null,2)],{type:'application/json'}));a.href=url;a.download='series-of-calls-exercise.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
Object.assign(ACT,{training:()=>socOpen()});
addEventListener('storage',e=>{if(e.key===SCT_KEY+SCT.slot&&SCT.state){try{if(!e.newValue||JSON.parse(e.newValue).seq>SCT.seq){socCancel();SCT.locked=false;if(SCT.release){SCT.release();SCT.release=null;}SCT.error=socT('newer_save');socRender();}}catch(error){socError(error);}}});
addEventListener('pagehide',()=>{try{socStore();}catch(e){}socClose();});
