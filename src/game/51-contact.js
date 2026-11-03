/* Contact-centre work scheduling. Every interaction and callback is synthetic. */
function socContactKernel(){
 'use strict';
 const PACK='soc-contact-1',copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
 const fail=code=>{throw new Error(code);},integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const defaults={ivr:false,menu:[{digit:'1',queue:'service',skill:'service',language:'en'},{digit:'2',queue:'service',skill:'service',language:'ja'}],priority:'oldest',callbacks:true,callbackDelay:3,callbackAttempts:2,supervisors:['supervisor'],qualityThreshold:70};
 function validateConfig(c){
  if(!c||Object.keys(c).sort().join(',')!==Object.keys(defaults).sort().join(',')||typeof c.ivr!=='boolean'||typeof c.callbacks!=='boolean'||!['oldest','voice-first','longest-wait'].includes(c.priority)||!integer(c.callbackDelay,1,60)||!integer(c.callbackAttempts,1,5)||!integer(c.qualityThreshold,0,100)||!Array.isArray(c.supervisors)||!c.supervisors.length||c.supervisors.some(x=>!id(x))||!Array.isArray(c.menu)||!c.menu.length||c.menu.length>10)fail('INVALID_CONTACT_CONFIG');
  if(new Set(c.menu.map(m=>m.digit)).size!==c.menu.length)fail('DUPLICATE_IVR_CHOICE');
  for(const m of c.menu)if(!m||Object.keys(m).sort().join(',')!=='digit,language,queue,skill'||typeof m.digit!=='string'||!/^\d$/.test(m.digit)||!id(m.queue)||!id(m.skill)||!['en','ja','fr','de'].includes(m.language))fail('INVALID_IVR_MENU');
 }
 function create(s){return {pack:PACK,desired:copy(defaults),effective:null,generation:1,provisioning:{status:'pending',due:s.clock+1,generation:1,errors:[]},callbacks:[],wraps:[],reviews:[],nextId:1};}
 function fingerprint(s){return s.contact?[s.contact.generation,s.contact.effective]:null;}
 function ingress(s,i,target,emit){
  if(!s.contact)return {target};const c=s.contact.effective;if(!c)return {error:'CONTACT_NOT_PROVISIONED'};
  if(c.ivr&&s.resources[target]?.kind==='queue'){
   const branch=c.menu.find(m=>m.digit===i.choice);if(!branch)return {error:'IVR_CHOICE_REQUIRED'};
   i.language=branch.language;i.requiredSkill=branch.skill;target=branch.queue;emit(s,i,'automation','IVR_BRANCH',{digit:branch.digit,queue:target,skill:branch.skill,language:branch.language});
  }
  return {target};
 }
 function queued(s){
  const list=s.interactions.filter(i=>i.phase==='queued'),policy=s.contact?.effective?.priority;
  if(policy==='voice-first')return list.sort((a,b)=>(a.channel==='voice'?0:1)-(b.channel==='voice'?0:1)||a.startedAt-b.startedAt);
  if(policy==='longest-wait')return list.sort((a,b)=>(a.queueEnteredAt??a.startedAt)-(b.queueEnteredAt??b.startedAt));
  return list;
 }
 function occupied(s,worker){return (s.contact?.wraps||[]).filter(w=>w.worker===worker&&w.until>s.clock).reduce((n,w)=>n+w.load,0);}
 function released(s,i){
  if(!s.contact||i.phase!=='handling'||!i.worker)return;
  const w=s.resources[i.worker].effective;
  s.contact.wraps.push({interaction:i.id,worker:i.worker,until:s.clock+w.wrapMinutes,load:i.channel==='message'?1/w.digitalConcurrency:1});
 }
 function available(s,target,i,services){
  const q=s.resources[target]?.effective,w=s.resources[q?.workforce]?.effective;
  if(!services[target]?.ready||s.resources[target]?.kind!=='queue'||!w)return false;
  const shift=s.clock%1440;if(shift<w.shiftStart||shift>=w.shiftEnd||!w.skills.includes(q.skill)||!w.languages.includes(i.language))return false;
  const busy=s.interactions.filter(x=>x.worker===q.workforce&&['handling','wrap'].includes(x.phase));
  const load=occupied(s,q.workforce)+busy.reduce((n,x)=>n+(x.channel==='message'?1/w.digitalConcurrency:1),0);
  return load+(i.channel==='message'?1/w.digitalConcurrency:1)<=Math.min(w.people,w.entitlements)&&busy.filter(x=>x.destination===target).length<q.capacity;
 }
 function command(s,c,services,emit,finish){
  const fields={start:[],configure:['config'],transfer:['interaction','target','mode'],callback:['interaction'],review:['interaction','role','score','resolved']};
  if(!c||!own(fields,c.action)||Object.keys(c).some(k=>!['action',...fields[c.action]].includes(k)))fail('INVALID_CONTACT_COMMAND');
  if(c.action==='start'){if(s.contact)fail('CONTACT_ALREADY_STARTED');s.contact=create(s);return;}
  const o=s.contact;if(!o)fail('CONTACT_NOT_STARTED');
  if(c.action==='configure'){
   if(!c.config||Array.isArray(c.config))fail('INVALID_CONTACT_CONFIG');const desired={...o.desired,...copy(c.config)};validateConfig(desired);o.desired=desired;o.generation++;o.provisioning={status:'pending',due:s.clock+1,generation:o.generation,errors:[]};return;
  }
  const i=s.interactions.find(i=>i.id===c.interaction);if(!i)fail('INTERACTION_UNAVAILABLE');
  if(c.action==='transfer'){
   if(!['queued','handling'].includes(i.phase)||!['cold','warm'].includes(c.mode)||s.resources[c.target]?.kind!=='queue'||!services[c.target]?.ready)fail('INVALID_TRANSFER');
   if(c.target===i.destination)fail('TRANSFER_LOOP');
   if(c.mode==='warm'&&!available(s,c.target,i,services))fail('WARM_TRANSFER_NO_AGENT');
   const previous=i.destination;released(s,i);i.worker=null;i.phase='queued';i.destination=c.target;i.requiredSkill=s.resources[c.target].effective.skill;i.queueEnteredAt=s.clock;
   emit(s,i,'handling','TRANSFER',{from:previous,to:c.target,mode:c.mode,caseId:i.caseId,context:i.context});
   if(c.mode==='warm'){const q=s.resources[c.target].effective,w=s.resources[q.workforce].effective;i.phase='handling';i.worker=q.workforce;i.due=s.clock+w.handlingMinutes+(i.context?0:2);emit(s,i,'handling','AGENT_ASSIGNED',{transfer:true});}
  }else if(c.action==='callback'){
   const p=o.effective,q=s.resources[i.destination]?.effective;
   if(!p?.callbacks||!q?.callback||i.channel!=='voice'||!['queued','failed'].includes(i.phase)||i.phase==='failed'&&!['CALLBACK_REQUIRED','ABANDONED'].includes(i.outcome))fail('CALLBACK_UNAVAILABLE');
   if(o.callbacks.some(j=>j.root===i.id))fail('CALLBACK_ALREADY_REQUESTED');
   if(o.callbacks.length>=200)fail('CALLBACK_CAPACITY');
   o.callbacks.push({id:'callback-'+o.nextId++,root:i.id,current:i.id,from:i.from,to:i.dialled||i.to,scope:i.scope,caseId:i.caseId,language:i.language,choice:i.choice||'',status:'scheduled',attempts:0,next:s.clock+p.callbackDelay,limit:p.callbackAttempts,delay:p.callbackDelay,reason:null});
   if(i.phase==='queued')finish(s,i,'CALLBACK_SCHEDULED');emit(s,i,'callback','CALLBACK_SCHEDULED',{due:s.clock+p.callbackDelay});
  }else if(c.action==='review'){
   if(!o.effective?.supervisors.includes(c.role)||!integer(c.score,0,100)||typeof c.resolved!=='boolean'||!['resolved','failed'].includes(i.phase))fail('INVALID_QUALITY_REVIEW');
   const review={interaction:i.id,role:c.role,score:c.score,resolved:c.resolved,at:s.clock,passed:c.resolved&&c.score>=o.effective.qualityThreshold};
   const previous=o.reviews.findIndex(r=>r.interaction===i.id);if(previous<0){if(o.reviews.length>=200)o.reviews.shift();o.reviews.push(review);}else o.reviews[previous]=review;
   emit(s,i,'quality','QUALITY_REVIEW',{score:c.score,resolved:c.resolved,passed:review.passed});
  }
 }
 function advance(s,services,emit,startInteraction){
  const o=s.contact;if(!o)return;
  if(o.provisioning.status==='pending'&&s.clock>=o.provisioning.due){
   const errors=o.desired.menu.some(m=>s.resources[m.queue]?.kind!=='queue')?['IVR_QUEUE_DEPENDENCY']:[];
   o.provisioning={...o.provisioning,status:errors.length?'failed':'ready',errors};if(!errors.length)o.effective=copy(o.desired);
  }
  o.wraps=o.wraps.filter(w=>w.until>s.clock);
  for(const j of o.callbacks){
   if(j.status==='attempting'){
    const i=s.interactions.find(i=>i.id===j.current);
    if(i?.phase==='resolved'){j.status='complete';continue;}
    if(!i||i.phase==='failed'){
     j.reason=i?.outcome||'INTERACTION_EXPIRED';j.status=j.attempts>=j.limit?'failed':'scheduled';j.next=s.clock+j.delay;
    }
   }
   if(j.status!=='scheduled'||s.clock<j.next)continue;
   j.attempts++;startInteraction(s,{channel:'voice',from:j.from,to:j.to,scope:j.scope,caseId:j.caseId,language:j.language,choice:j.choice});
   const i=s.interactions.at(-1);j.current=i.id;j.status='attempting';i.callbackOf=j.root;emit(s,i,'callback','CALLBACK_ATTEMPT',{root:j.root,attempt:j.attempts});
  }
 }
 function assess(s){const i=s.interactions.at(-1),r=s.contact?.reviews.find(r=>r.interaction===i?.id);return !r||r.passed;}
 function inspect(s){return s.contact?{pack:PACK,provisioning:copy(s.contact.provisioning),callbacks:copy(s.contact.callbacks),wraps:copy(s.contact.wraps),reviews:copy(s.contact.reviews)}:null;}
 function validate(s){
  const o=s.contact;if(o===undefined)return;if(!o||o.pack!==PACK||!integer(o.nextId,1)||!integer(o.generation,1))fail('INVALID_CONTACT_SAVE');
  validateConfig(o.desired);if(o.effective)validateConfig(o.effective);
  if(!o.provisioning||o.provisioning.generation!==o.generation||!['pending','ready','failed'].includes(o.provisioning.status)||!integer(o.provisioning.due))fail('INVALID_CONTACT_PROVISIONING');
  for(const [key,max] of Object.entries({callbacks:200,wraps:400,reviews:200}))if(!Array.isArray(o[key])||o[key].length>max)fail('INVALID_CONTACT_COLLECTION');
  for(const j of o.callbacks)if(!id(j.id)||!id(j.root)||!id(j.current)||!id(j.caseId)||typeof j.from!=='string'||j.from.length>80||typeof j.to!=='string'||j.to.length>80||typeof j.scope!=='string'||typeof j.choice!=='string'||!/^\d?$/.test(j.choice)||!['en','ja','fr','de'].includes(j.language)||!integer(j.attempts,0,j.limit)||!integer(j.limit,1,5)||!integer(j.delay,1,60)||!integer(j.next)||!['scheduled','attempting','complete','failed'].includes(j.status))fail('INVALID_CALLBACK_STATE');
  for(const w of o.wraps)if(!id(w.interaction)||s.resources[w.worker]?.kind!=='workforce'||!integer(w.until)||!Number.isFinite(w.load)||w.load<=0||w.load>1)fail('INVALID_TRANSFER_WRAP');
  for(const r of o.reviews)if(!id(r.interaction)||!id(r.role)||!integer(r.score,0,100)||typeof r.resolved!=='boolean'||typeof r.passed!=='boolean'||!integer(r.at))fail('INVALID_QUALITY_STATE');
 }
 const source=()=>`const SOC_CONTACT=(${socContactKernel.toString()})();`;
 return {PACK,defaults,validateConfig,create,fingerprint,ingress,queued,occupied,command,advance,assess,inspect,validate,source};
}
const SOC_CONTACT=socContactKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_CONTACT;
