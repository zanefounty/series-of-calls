/* Synthetic application transport. Mbps and Kbps are bandwidth, never seats. */
function socTransportKernel(){
 'use strict';
 const headroomAdvisor=typeof SOC_TRANSPORT_HEADROOM!=='undefined'?SOC_TRANSPORT_HEADROOM:require('./37-transport-headroom.js');
 const PACK='soc-transport-1',copy=x=>JSON.parse(JSON.stringify(x)),fail=x=>{throw Error(x);};
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x),int=(x,min=0,max=1000000)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 const profiles=Object.freeze({message:{kbps:8,directions:1,description:'Synthetic 1 KB message transfer per second; availability probe only'},voice:{kbps:160,directions:2,description:'Synthetic voice including media overhead, both directions'},meeting:{kbps:5000,directions:2,description:'Synthetic two-party room media, both directions'}});
 function siteConfig(c){const legacy=exact(c,['name','region','domain']),expanded=exact(c,['name','region','domain','powerDomain','backupPowerDomain']);if(!(legacy||expanded)||typeof c.name!=='string'||!c.name.trim()||c.name.length>80||!['AU','US','JP','EU'].includes(c.region)||!id(c.domain))fail('INVALID_TRANSPORT_SITE');if(expanded&&(!id(c.powerDomain)||c.backupPowerDomain!==null&&!id(c.backupPowerDomain)||c.backupPowerDomain===c.powerDomain))fail('INVALID_TRANSPORT_SITE');}
 function linkConfig(c){if(!exact(c,['from','to','mode','capacityMbps','latencyMs','domain','leadMinutes','setupCents','periodCents','contract'])||!id(c.from)||!id(c.to)||c.from===c.to||!['purchased','owned'].includes(c.mode)||!int(c.capacityMbps,1,100000)||!int(c.latencyMs,1,1000)||!id(c.domain)||!int(c.leadMinutes,1,1440)||!int(c.setupCents)||!int(c.periodCents)||c.contract!==null&&!id(c.contract)||c.mode==='owned'&&c.contract!==null)fail('INVALID_TRANSPORT_LINK');}
 function node(c,clock){return {desired:copy(c),effective:null,generation:1,provisioning:{status:'pending',due:clock+1,generation:1},observed:{available:true,power:true,...(c.powerDomain?{backupPower:false}:{})}};}
 function create(s){return {pack:PACK,clock:s.clock,startedAt:s.clock,nextId:1,sites:{},links:{},bindings:{},domains:{},reservations:[],repairs:[],leaseRevocationCount:0,spares:0,crews:1,ledger:[],totalCosts:0,lastBill:s.clock};}
 function pack(s){if(!s.transport||s.transport.pack!==PACK)fail('TRANSPORT_NOT_STARTED');return s.transport;}
 function charge(s,cents,reason,object,hooks={},periodEnd=null){const p=pack(s);if(!int(cents))fail('INVALID_TRANSPORT_CHARGE');if(!cents)return;if(p.ledger.length>=2000)fail('TRANSPORT_LEDGER_CAPACITY');const row={id:'transport-invoice-'+p.nextId++,at:s.clock,currency:'AUD',cents,reason,object,...(periodEnd!==null?{periodEnd}:{})};p.ledger.push(row);p.totalCosts+=cents;if(!Number.isSafeInteger(p.totalCosts))fail('TRANSPORT_MONEY_OVERFLOW');if(hooks.bill)hooks.bill(s,copy(row));}
 function contractReady(s,c,except){if(c.contract===null)return true;const b=s.business?.contracts.find(x=>x.id===c.contract),p=pack(s),allocated=Object.entries(p.links).filter(([k,v])=>k!==except&&v.desired.contract===c.contract).reduce((n,[k,v])=>n+v.desired.capacityMbps,0);return !!b&&b.offer==='access'&&b.unit==='Mbps'&&b.status==='active'&&!b.reasons.length&&b.quantity>=c.capacityMbps+allocated;}
 function siteReady(s,key){const p=pack(s),n=p.sites[key],c=n?.effective;if(!c||!n.observed.available||p.domains[c.domain])return false;const primaryAvailable=!c.powerDomain||!p.domains[c.powerDomain];const backupAvailable=!!c.backupPowerDomain&&n.observed.backupPower===true&&!p.domains[c.backupPowerDomain];return primaryAvailable&&n.observed.power||backupAvailable;}
 function linkReady(s,key){const p=pack(s),n=p.links[key],c=n?.effective;return !(p.leaseRevocations||[]).some(r=>r.link===key&&r.status==='active')&&!!c&&n.observed.available&&n.observed.power&&!p.domains[c.domain]&&siteReady(s,c.from)&&siteReady(s,c.to)&&contractReady(s,c,key);}
 function command(s,c,hooks={}){
  const p=pack(s),fields={site:['id','config'],link:['id','config'],bind:['resource','site'],observe:['kind','id','available','power'],domain:['id','failed'],stock:['quantity'],crews:['count'],repair:['link'],'lease-revoke':['link','durationMinutes'],'headroom-upgrade':['link','triggerBps','targetBps','maxCapacityMbps']};
  const validObserve=c?.action==='observe'&&(exact(c,['action','kind','id','available','power'])||c.kind==='site'&&exact(c,['action','kind','id','available','power','backupPower']));
  if(!c||!fields[c.action]||!validObserve&&!exact(c,['action',...fields[c.action]]))fail('INVALID_TRANSPORT_COMMAND');
  if(hooks.authorize&&hooks.authorize(s,c)!==true)fail('TRANSPORT_AUTHORITY_REQUIRED');
  if(c.action==='site'||c.action==='link'){
   if(!id(c.id))fail('INVALID_TRANSPORT_ID');const table=c.action==='site'?p.sites:p.links;
   if(c.action==='site')siteConfig(c.config);else {linkConfig(c.config);if(!p.sites[c.config.from]||!p.sites[c.config.to])fail('TRANSPORT_SITE_MISSING');if(!contractReady(s,c.config,c.id))fail('TRANSPORT_CONTRACT_CAPACITY');}
   if(!table[c.id]&&Object.keys(table).length>=100)fail('TRANSPORT_GRAPH_CAPACITY');
   if(c.action==='link'&&p.repairs.some(x=>x.link===c.id&&x.status==='running'))fail('TRANSPORT_REPAIR_RUNNING');
   const prior=table[c.id],n=prior||node(c.config,s.clock);n.desired=copy(c.config);if(c.action==='site'&&c.config.powerDomain&&typeof n.observed.backupPower!=='boolean')n.observed.backupPower=false;if(prior)n.generation++;n.provisioning={status:'pending',due:s.clock+(c.action==='link'?c.config.leadMinutes:1),generation:n.generation};table[c.id]=n;
   if(c.action==='link')charge(s,c.config.setupCents,'link-order',c.id,hooks);
  }else if(c.action==='headroom-upgrade'){
   const {action,...options}=c,advice=headroomAdvisor.recommend(s,options);if(advice.status!=='upgrade')fail('TRANSPORT_HEADROOM_'+advice.reason.toUpperCase().replace(/-/g,'_'));
   command(s,{action:'link',id:c.link,config:advice.config},hooks);
  }else if(c.action==='lease-revoke'){
   const n=p.links[c.link];if(!n?.effective||n.effective.mode!=='purchased'||!linkReady(s,c.link)||n.provisioning.status!=='ready'||!int(c.durationMinutes,7,60))fail('TRANSPORT_LEASE_REVOCATION_INVALID');
   const rows=p.leaseRevocations||[];if(rows.some(r=>r.status==='active'))fail('TRANSPORT_LEASE_REVOCATION_ACTIVE');if(rows.length>=100)fail('TRANSPORT_LEASE_HISTORY_CAPACITY');
   p.leaseRevocationCount=rows.length+1;p.leaseRevocations=rows;rows.push({id:'lease-revocation-'+(rows.length+1),scope:s.tenant||s.scenario,link:c.link,generation:n.generation,startedAt:s.clock,due:s.clock+c.durationMinutes,durationMinutes:c.durationMinutes,openedRevision:s.revision+1,status:'active',completedAt:null});
  }else if(c.action==='bind'){
   if(!id(c.resource)||!p.sites[c.site]||hooks.resourceExists&&hooks.resourceExists(s,c.resource)!==true)fail('TRANSPORT_BINDING_INVALID');p.bindings[c.resource]=c.site;
  }else if(c.action==='observe'){
   const n=(c.kind==='site'?p.sites:c.kind==='link'?p.links:{})[c.id];if(!n||typeof c.available!=='boolean'||typeof c.power!=='boolean'||c.backupPower!==undefined&&typeof c.backupPower!=='boolean'||c.kind==='link'&&c.backupPower!==undefined||c.kind==='site'&&c.backupPower!==undefined&&!n.effective?.powerDomain&&!n.desired.powerDomain)fail('INVALID_TRANSPORT_OBSERVATION');n.observed={available:c.available,power:c.power,...(c.kind==='site'&&(n.effective?.powerDomain||n.desired.powerDomain)?{backupPower:c.backupPower===undefined?n.observed.backupPower===true:c.backupPower}:{})};
  }else if(c.action==='domain'){
   if(!id(c.id)||typeof c.failed!=='boolean'||!Object.values(p.sites).concat(Object.values(p.links)).some(n=>[n.desired,n.effective].some(x=>[x?.domain,x?.powerDomain,x?.backupPowerDomain].includes(c.id))))fail('INVALID_FAILURE_DOMAIN');p.domains[c.id]=c.failed;
  }else if(c.action==='stock'){
   if(!int(c.quantity,1,100)||p.spares+c.quantity>100)fail('INVALID_SPARES');charge(s,c.quantity*500,'repair-spares','stock',hooks);p.spares+=c.quantity;
  }else if(c.action==='crews'){
   if(!int(c.count,1,10)||c.count<p.repairs.filter(x=>x.status==='running'&&x.mode==='owned').length)fail('TRANSPORT_CREW_CAPACITY');p.crews=c.count;
  }else if(c.action==='repair'){
   const n=p.links[c.link];if(!n?.effective||n.observed.available||p.repairs.some(x=>x.link===c.link&&x.status==='running'))fail('TRANSPORT_REPAIR_NOT_REQUIRED');
   const mode=n.effective.mode;if(mode==='owned'&&(!p.spares||p.repairs.filter(x=>x.status==='running'&&x.mode==='owned').length>=p.crews))fail('TRANSPORT_RECOVERY_RESOURCE');
   if(p.repairs.length>=200)fail('TRANSPORT_REPAIR_CAPACITY');if(mode==='owned')p.spares--;
   charge(s,mode==='owned'?200:100,'link-repair',c.link,hooks);p.repairs.push({id:'repair-'+p.nextId++,link:c.link,mode,generation:n.generation,due:s.clock+(mode==='owned'?2:3),status:'running'});
  }
 }
 function path(s,from,to,kbps,exclude=null){
  const p=pack(s);if(!int(kbps,1,100000000)||!siteReady(s,from)||!siteReady(s,to))return {ready:false,reason:'TRANSPORT_SITE_UNAVAILABLE',edges:[]};
  const load={};for(const r of p.reservations)if(r.id!==exclude)for(const edge of r.edges)load[edge]=(load[edge]||0)+r.kbps;
  const distances={[from]:0},paths={[from]:[]},todo=new Set(Object.keys(p.sites));
  while(todo.size){const current=[...todo].filter(k=>distances[k]!==undefined).sort((a,b)=>distances[a]-distances[b]||a.localeCompare(b))[0];if(current===undefined)break;todo.delete(current);if(current===to)return {ready:true,edges:paths[current],latencyMs:distances[current],kbps,availableKbps:paths[current].length?Math.min(...paths[current].map(key=>p.links[key].effective.capacityMbps*1000-(load[key]||0))):null};
   for(const [key,n] of Object.entries(p.links).sort(([a],[b])=>a.localeCompare(b))){const c=n.effective;if(!linkReady(s,key)||c.capacityMbps*1000-(load[key]||0)<kbps)continue;const next=c.from===current?c.to:c.to===current?c.from:null;if(!next||!todo.has(next))continue;const distance=distances[current]+c.latencyMs;if(distances[next]===undefined||distance<distances[next]){distances[next]=distance;paths[next]=[...paths[current],key];}}
  }return {ready:false,reason:'TRANSPORT_PATH_OR_CAPACITY',edges:[],kbps};
 }
 function resourcePath(s,from,to,profile,exclude=null){const p=pack(s);if(!profiles[profile]||!p.bindings[from]||!p.bindings[to])return {ready:false,reason:'TRANSPORT_BINDING_REQUIRED',edges:[]};return path(s,p.bindings[from],p.bindings[to],profiles[profile].kbps,exclude);}
 function admit(s,interaction,from,to,profile='voice'){const p=pack(s);if(p.reservations.some(x=>x.id===interaction))fail('DUPLICATE_TRANSPORT_RESERVATION');const result=resourcePath(s,from,to,profile);if(result.ready){if(p.reservations.length>=200)fail('TRANSPORT_RESERVATION_CAPACITY');p.reservations.push({id:interaction,from,to,profile,kbps:profiles[profile].kbps,edges:[...result.edges]});}return result;}
 function release(s,interaction){if(s.transport)s.transport.reservations=s.transport.reservations.filter(x=>x.id!==interaction);}
 function advance(s,hooks={}){const p=pack(s);p.clock=s.clock;
  for(const [kind,table] of [['site',p.sites],['link',p.links]])for(const [key,n] of Object.entries(table))if(n.provisioning.status==='pending'&&n.provisioning.due<=s.clock){const ready=kind==='site'||siteReady(s,n.desired.from)&&siteReady(s,n.desired.to)&&contractReady(s,n.desired,key);n.provisioning.status=ready?'ready':'failed';if(ready)n.effective=copy(n.desired);}
  for(const r of p.repairs)if(r.status==='running'&&r.due<=s.clock){const link=p.links[r.link];if(link.generation!==r.generation)r.status='stale';else{link.observed.available=true;r.status='complete';}}
  for(const r of p.leaseRevocations||[])if(r.status==='active'&&r.due<=s.clock){r.status='renumbered';r.completedAt=r.due;}
  for(const r of [...p.reservations]){const next=resourcePath(s,r.from,r.to,r.profile,r.id);if(next.ready)r.edges=[...next.edges];else if(hooks.failed)hooks.failed(s,r.id,next.reason);else release(s,r.id);}
  while(s.clock-p.lastBill>=60){p.lastBill+=60;for(const [key,n] of Object.entries(p.links))if(n.effective&&n.effective.contract===null)charge(s,n.effective.periodCents,'transport-period',key,hooks,p.lastBill);}
 }
 function validateLeaseHistory(s){
  const rows=s.transport?.leaseRevocations||[];
  if(s.transport?.leaseRevocations!==undefined&&!Array.isArray(s.transport.leaseRevocations)||!Array.isArray(rows)||rows.length>100||(s.transport?.leaseRevocationCount!==undefined||rows.length)&&s.transport.leaseRevocationCount!==rows.length)fail('INVALID_TRANSPORT_LEASE_HISTORY');
  let lastRevision=0,lastDue=-1;
  for(const [index,r] of rows.entries()){
   const n=s.transport.links[r?.link];
   if(!exact(r,['id','scope','link','generation','startedAt','due','durationMinutes','openedRevision','status','completedAt'])||r.id!=='lease-revocation-'+(index+1)||r.scope!==(s.tenant||s.scenario)||!n||!int(r.generation,1,n.generation)||!int(r.startedAt,s.transport.startedAt,s.clock)||!int(r.durationMinutes,7,60)||r.due!==r.startedAt+r.durationMinutes||!int(r.openedRevision,lastRevision+1,s.revision)||r.startedAt<lastDue||r.generation===n.generation&&n.effective?.mode!=='purchased'||(r.due>s.clock?(r.status!=='active'||r.completedAt!==null):(r.status!=='renumbered'||r.completedAt!==r.due)))fail('INVALID_TRANSPORT_LEASE_HISTORY');
   lastRevision=r.openedRevision;lastDue=r.due;
   if(Array.isArray(s.commands)){
    const entry=s.commands.find(c=>c.revision===r.openedRevision),q=entry?.command;
    if(entry?(entry.at!==r.startedAt||entry.scope!==r.scope||entry.transportGeneration!==r.generation||q.type!=='transport'||!exact(q.command,['action','link','durationMinutes'])||q.command.action!=='lease-revoke'||q.command.link!==r.link||q.command.durationMinutes!==r.durationMinutes):!(s.commands.length===1000&&r.openedRevision<s.commands[0].revision))fail('TRANSPORT_LEASE_COMMAND_MISSING');
   }
  }
  if(Array.isArray(s.commands))for(const entry of s.commands)if(entry.command?.type==='transport'&&entry.command.command?.action==='lease-revoke'&&entry.scope===(s.tenant||s.scenario)&&!rows.some(r=>r.openedRevision===entry.revision))fail('TRANSPORT_LEASE_HISTORY_MISSING');
 }
 function validate(s){const p=s.transport;if(p===undefined)return true;validateLeaseHistory(s);if(!p||p.pack!==PACK||p.clock!==s.clock||!int(p.startedAt,0,s.clock)||p.lastBill!==p.startedAt+Math.floor((s.clock-p.startedAt)/60)*60||!int(p.nextId,1,Number.MAX_SAFE_INTEGER)||!int(p.spares,0,100)||!int(p.crews,1,10)||!int(p.totalCosts,0,Number.MAX_SAFE_INTEGER)||!int(p.lastBill,0,s.clock))fail('INVALID_TRANSPORT_SAVE');
  for(const [name,check] of [['sites',siteConfig],['links',linkConfig]]){const t=p[name];if(!t||Array.isArray(t)||Object.keys(t).length>100)fail('INVALID_TRANSPORT_GRAPH');for(const [key,n] of Object.entries(t)){if(!id(key)||!n||!int(n.generation,1)||!n.provisioning||n.provisioning.generation!==n.generation||!['pending','ready','failed'].includes(n.provisioning.status)||!int(n.provisioning.due,0,Number.MAX_SAFE_INTEGER)||typeof n.observed?.available!=='boolean'||typeof n.observed?.power!=='boolean'||name==='sites'&&(n.effective?.powerDomain||n.desired?.powerDomain)&&typeof n.observed?.backupPower!=='boolean')fail('INVALID_TRANSPORT_NODE');check(n.desired);if(n.effective)check(n.effective);if(n.provisioning.status==='ready'&&JSON.stringify(n.desired)!==JSON.stringify(n.effective))fail('INVALID_TRANSPORT_EFFECTIVE');if(name==='links')for(const c of [n.desired,n.effective].filter(Boolean))if(!p.sites[c.from]||!p.sites[c.to])fail('TRANSPORT_SITE_MISSING');}}
  if(!p.bindings||Array.isArray(p.bindings)||Object.keys(p.bindings).length>500||Object.entries(p.bindings).some(([key,v])=>!id(key)||!p.sites[v])||!p.domains||Array.isArray(p.domains)||Object.entries(p.domains).some(([key,v])=>!id(key)||typeof v!=='boolean'))fail('INVALID_TRANSPORT_BINDING');
  for(const [key,max] of [['reservations',200],['repairs',200],['ledger',2000]])if(!Array.isArray(p[key])||p[key].length>max||new Set(p[key].map(x=>x?.id)).size!==p[key].length)fail('INVALID_TRANSPORT_COLLECTION');
  for(const r of p.reservations)if(!r||!id(r.id)||!p.bindings[r.from]||!p.bindings[r.to]||!profiles[r.profile]||r.kbps!==profiles[r.profile].kbps||!Array.isArray(r.edges)||new Set(r.edges).size!==r.edges.length||r.edges.some(x=>!p.links[x]))fail('INVALID_TRANSPORT_RESERVATION');
  const loads={};for(const r of p.reservations){let at=p.bindings[r.from];for(const key of r.edges){const c=p.links[key].effective;if(!c||c.from!==at&&c.to!==at)fail('INVALID_TRANSPORT_PATH');at=c.from===at?c.to:c.from;loads[key]=(loads[key]||0)+r.kbps;}if(at!==p.bindings[r.to])fail('INVALID_TRANSPORT_PATH');}for(const [key,kbps] of Object.entries(loads))if(kbps>p.links[key].effective.capacityMbps*1000)fail('INVALID_TRANSPORT_CAPACITY');
  for(const r of p.repairs)if(!r||!id(r.id)||!p.links[r.link]||!['owned','purchased'].includes(r.mode)||!int(r.generation,1)||!int(r.due,0,Number.MAX_SAFE_INTEGER)||!['running','complete','stale'].includes(r.status))fail('INVALID_TRANSPORT_REPAIR');
  if(p.repairs.filter(x=>x.status==='running'&&x.mode==='owned').length>p.crews)fail('TRANSPORT_CREW_CAPACITY');
  for(const l of p.ledger)if(!l||!id(l.id)||!int(l.cents,1)||!int(l.at,0,s.clock)||l.currency!=='AUD'||!['link-order','repair-spares','link-repair','transport-period'].includes(l.reason)||!id(l.object))fail('INVALID_TRANSPORT_LEDGER');const issued=[...p.ledger.map(x=>/^transport-invoice-([1-9][0-9]*)$/.exec(x.id)?.[1]),...p.repairs.map(x=>/^repair-([1-9][0-9]*)$/.exec(x.id)?.[1])].map(Number).sort((a,b)=>a-b);if(issued.length!==p.nextId-1||issued.some((n,i)=>n!==i+1))fail('TRANSPORT_HISTORY_MISSING');const periods=new Set();for(const l of p.ledger)if(l.reason==='transport-period'){const key=l.object+':'+l.periodEnd;if(!int(l.periodEnd,p.startedAt+60,p.lastBill)||(l.periodEnd-p.startedAt)%60!==0||periods.has(key))fail('INVALID_TRANSPORT_PERIOD');periods.add(key);}if(p.spares!==p.ledger.filter(l=>l.reason==='repair-spares').reduce((n,l)=>n+l.cents/500,0)-p.repairs.filter(r=>r.mode==='owned').length)fail('UNRECONCILED_TRANSPORT_SPARES');if(p.ledger.reduce((n,l)=>n+l.cents,0)!==p.totalCosts)fail('UNRECONCILED_TRANSPORT');return true;
 }
 function inspect(s){const p=s.transport;if(!p)return null;return {...copy(p),profiles,siteStatus:Object.fromEntries(Object.keys(p.sites).map(k=>[k,siteReady(s,k)])),linkStatus:Object.fromEntries(Object.keys(p.links).map(k=>[k,linkReady(s,k)]))};}
 function fingerprint(s){const p=s.transport;return p?JSON.stringify([p.pack,p.sites,p.links,p.bindings,p.domains,...(p.leaseRevocations?.length?[p.leaseRevocations]:[])]):null;}
 const source=()=>headroomAdvisor.source()+`const SOC_TRANSPORT=(${socTransportKernel.toString()})();`;
 return {PACK,profiles,headroom:headroomAdvisor.recommend,create,command,advance,validate,validateLeaseHistory,inspect,fingerprint,resourcePath,path,admit,release,source};
}
const SOC_TRANSPORT=socTransportKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_TRANSPORT;
