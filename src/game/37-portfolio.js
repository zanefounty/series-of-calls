/* Concurrent customer portfolio over independently validated SOC roots. */
function socPortfolioKernel(){
 'use strict';
 const PACK='soc-portfolio-1',VERSION=1,CONTENT='soc-portfolio-content-1',MAX_CUSTOMERS=20,MAX_CATCHUP_MINUTES=1440,MAX_JOURNAL=256;
 const copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=code=>{throw new Error(code);},id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,47}$/.test(x),integer=x=>Number.isSafeInteger(x)&&x>=0;
 const markets=Object.freeze({
  'au-sydney':Object.freeze({geography:'Australia / Sydney',jurisdiction:'AU'}),
  'au-melbourne':Object.freeze({geography:'Australia / Melbourne',jurisdiction:'AU'}),
  'us-seattle':Object.freeze({geography:'United States / Seattle',jurisdiction:'US'}),
  'jp-tokyo':Object.freeze({geography:'Japan / Tokyo',jurisdiction:'JP'}),
  'eu-dublin':Object.freeze({geography:'Europe / Dublin',jurisdiction:'EU'})
 });
 const scenarios=Object.freeze(['smb','enterprise','government','defence']);
 const forbiddenChildPacks=['portfolio','campaign','progression','marketQualification','managedOperations'];
 const childCommandTypes=['configure','add','interact','fault','connect','meeting','migrate','restore','business','operations','information','contact','estate','workforce','calling','products','channels','outcomes','transport','boundaries','issue-exercises','service-observation','specialist-lifecycle','site-operations','product-evidence','media-negotiation','shared-services','admission-security'];
 function pack(s){if(!s||s.pack!==PACK)fail('PORTFOLIO_NOT_STARTED');return s;}
 function create({clock=0}={}){if(!integer(clock))fail('INVALID_PORTFOLIO_CLOCK');return {pack:PACK,version:VERSION,contentVersion:CONTENT,clock,revision:0,selectedCustomer:null,customers:[],journal:[],nextId:1,checkpoint:emptyCheckpoint()};}
 function emptyCheckpoint(){return {throughId:0,throughAt:0,count:0,facts:{},digest:digest({throughId:0,throughAt:0,count:0,facts:{}})};}
 function digest(x){let h=2166136261;const text=JSON.stringify(x);for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
 function sealCheckpoint(cp){const body={throughId:cp.throughId,throughAt:cp.throughAt,count:cp.count,facts:cp.facts};cp.digest=digest(body);return cp;}
 function migrateKnown(s){
  if(!s||typeof s!=='object'||Array.isArray(s))fail('INVALID_PORTFOLIO_STATE');
  const out=copy(s);
  if(!own(out,'checkpoint')){
   if(Object.keys(out).some(k=>!['pack','version','contentVersion','clock','revision','nextId','selectedCustomer','customers','journal'].includes(k)))fail('INVALID_PORTFOLIO_STATE');
   if(!integer(out.clock)||!Array.isArray(out.journal)||out.journal.length>2000||out.revision!==out.journal.length||out.nextId!==out.journal.length+1)fail('INVALID_PORTFOLIO_STATE');
   if(out.journal.some((e,i)=>!e||e.id!==`portfolio-event-${i+1}`||!integer(e.at)||e.at>out.clock||typeof e.kind!=='string'||i>0&&e.at<out.journal[i-1].at))fail('INVALID_PORTFOLIO_JOURNAL');
   const cp=emptyCheckpoint();for(const e of out.journal.slice(0,-MAX_JOURNAL))fold(cp,e);out.journal=out.journal.slice(-MAX_JOURNAL);out.checkpoint=cp;
  }
  return out;
 }
 function exactFields(value,fields,code){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!fields.includes(k)))fail(code);}
 function customer(s,key){const c=s.customers.find(x=>x.id===key);if(!c)fail('UNKNOWN_CUSTOMER');return c;}
 function verifyChild(root,config,hooks){
  if(!root||typeof root!=='object'||Array.isArray(root)||root.clock!==config.clock||root.scenario!==config.scenario||root.jurisdiction!==config.jurisdiction||root.tenant!==config.tenant||root.customerName!==undefined&&root.customerName!==config.name||forbiddenChildPacks.some(k=>own(root,k)))fail('PORTFOLIO_CUSTOMER_ROOT_INVALID');
  if(typeof hooks.validateCustomer==='function'&&hooks.validateCustomer(root)!==true)fail('PORTFOLIO_CUSTOMER_VALIDATION_FAILED');
 }
 function hasObligations(root,customerId,hooks={}){
  if(root.interactions?.some(x=>['arrival','delivery','queued','handling','wrap','ringing','shared-active','parked','connected'].includes(x.phase)))return true;
  if(root.business?.contracts?.some(x=>!['cancelled'].includes(x.status)))return true;
  if(root.business?.projects?.some(x=>['running','blocked'].includes(x.status)))return true;
  if(root.business?.loans?.some(x=>x.principal>0))return true;
  if(Object.values(root.resources||{}).some(x=>x.provisioning?.status==='pending'))return true;
  if(root.operations?.jobs?.some(x=>['pending','queued','accepted','delivering'].includes(x.status))||root.operations?.ports?.some(x=>['submitted','scheduled','recovering'].includes(x.status))||root.operations?.portOrders?.some(x=>['submitted','scheduled','recovering'].includes(x.status))||root.operations?.migrations?.some(x=>['scheduled','verifying'].includes(x.status)))return true;
  if(root.outcomes?.needs?.some(x=>['open','pending'].includes(x.status)||x.repeat?.status==='pending'))return true;
  for(const key of ['information','estate','channels'])if(root[key]?.jobs?.some(x=>['pending','queued','running','accepted'].includes(x.status)))return true;
  if(typeof hooks.managedOperationsObligations==='function'){const pending=hooks.managedOperationsObligations(customerId);if(typeof pending!=='boolean')fail('CUSTOMER_OBLIGATIONS_UNAVAILABLE');if(pending)return true;}
  return false;
 }
 function fold(cp,e){cp.throughId=Number(e.id.slice('portfolio-event-'.length));cp.throughAt=e.at;cp.count++;cp.facts[e.kind]=(cp.facts[e.kind]||0)+1;sealCheckpoint(cp);}
 function append(s,kind,details={}){s.journal.push({id:`portfolio-event-${s.nextId++}`,at:s.clock,kind,...copy(details)});if(s.journal.length>MAX_JOURNAL)fold(s.checkpoint,s.journal.shift());}
 function assertCommandEnvelope(s,next,command,oldClock){
  if(!next||next===s||!Array.isArray(next.commands)||!integer(next.revision)||next.clock!==oldClock)fail('PORTFOLIO_CUSTOMER_DISPATCH_INVALID');
  const delta=next.revision-s.revision,action=command.command?.action,derived=command.type==='service-observation'&&['inject-incident','recover-incident'].includes(action);
  if(delta!==(derived?2:1))fail('PORTFOLIO_CUSTOMER_DISPATCH_INVALID');
  const recorded=next.commands.at(-1)?.command;if(JSON.stringify(recorded)!==JSON.stringify(command))fail('PORTFOLIO_CUSTOMER_COMMAND_MISMATCH');
  const tail=next.commands.slice(-delta);if(tail.some((row,n)=>row.revision!==s.revision+n+1||row.at!==oldClock))fail('PORTFOLIO_CUSTOMER_DISPATCH_INVALID');
  if(JSON.stringify(next.commands.slice(0,-delta))!==JSON.stringify(s.commands.slice(-(1000-delta))))fail('PORTFOLIO_CUSTOMER_COMMAND_HISTORY_CHANGED');
  if(derived){const window=s.serviceObservation?.active,domain=action==='inject-incident'?[...(window?.rd?.baseline?.domains||[])].sort()[0]:window?.rd?.failedDomain,expected={type:'transport',command:{action:'domain',id:domain,failed:action==='inject-incident'}};if(!domain||JSON.stringify(tail[0].command)!==JSON.stringify(expected))fail('PORTFOLIO_CUSTOMER_DERIVED_COMMAND_MISMATCH');}
 }

 function command(s,c,hooks={}){
  if(s&&!own(s,'checkpoint')){const upgraded=migrateKnown(s);for(const k of Object.keys(s))delete s[k];Object.assign(s,upgraded);}pack(s);if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.action!=='string')fail('INVALID_PORTFOLIO_COMMAND');
  if(c.action==='addcustomer'){
   exactFields(c,['action','id','tenant','name','market','scenario'],'INVALID_PORTFOLIO_COMMAND');
   if(!id(c.id)||!id(c.tenant)||typeof c.name!=='string'||!c.name.trim()||c.name.length>100||!own(markets,c.market)||!scenarios.includes(c.scenario)||s.customers.length>=MAX_CUSTOMERS||s.customers.some(x=>x.id===c.id||x.tenant===c.tenant))fail('INVALID_PORTFOLIO_CUSTOMER');
   if(typeof hooks.createCustomer!=='function')fail('PORTFOLIO_CUSTOMER_FACTORY_REQUIRED');
   const market=markets[c.market],config={id:c.id,tenant:c.tenant,name:c.name.trim(),market:c.market,scenario:c.scenario,jurisdiction:market.jurisdiction,clock:s.clock};
   const root=hooks.createCustomer(s,copy(config));verifyChild(root,config,hooks);
   const record={...config,active:true,root};s.customers.push(record);if(!s.selectedCustomer)s.selectedCustomer=record.id;
   append(s,'CUSTOMER_ADDED',{customerId:record.id,market:record.market,scenario:record.scenario});
  }else if(c.action==='dispatchcustomer'){
   exactFields(c,['action','customerId','command'],'INVALID_PORTFOLIO_COMMAND');const row=customer(s,c.customerId),nested=c.command;
   if(!row.active)fail('CUSTOMER_INACTIVE');
   if(!nested||typeof nested!=='object'||Array.isArray(nested)||!childCommandTypes.includes(nested.type)||forbiddenChildPacks.some(x=>nested.type===x)||nested.type==='advance')fail('PORTFOLIO_CHILD_COMMAND_NOT_ALLOWED');
   if(typeof hooks.dispatchCustomer!=='function')fail('PORTFOLIO_CUSTOMER_DISPATCH_REQUIRED');
   const old=row.root,next=hooks.dispatchCustomer(old,copy(nested));assertCommandEnvelope(old,next,nested,old.clock);
   const cfg={...row,clock:s.clock};verifyChild(next,cfg,hooks);row.root=copy(next);row.clock=next.clock;
   append(s,'CUSTOMER_COMMAND',{customerId:row.id,childRevision:next.revision,type:nested.type});
  }else if(c.action==='selectcustomer'){
   exactFields(c,['action','customerId'],'INVALID_PORTFOLIO_COMMAND');if(c.customerId!==null)customer(s,c.customerId);s.selectedCustomer=c.customerId;
   append(s,'CUSTOMER_SELECTED',{customerId:c.customerId});
  }else if(c.action==='activatecustomer'||c.action==='deactivatecustomer'){
   exactFields(c,['action','customerId'],'INVALID_PORTFOLIO_COMMAND');const row=customer(s,c.customerId),active=c.action==='activatecustomer';
   if(active===row.active)fail(active?'CUSTOMER_ALREADY_ACTIVE':'CUSTOMER_ALREADY_INACTIVE');
   if(!active&&hasObligations(row.root,row.id,hooks))fail('CUSTOMER_HAS_OUTSTANDING_OBLIGATIONS');
   if(active&&row.root.clock<s.clock){const lag=s.clock-row.root.clock;if(lag>MAX_CATCHUP_MINUTES)fail('PORTFOLIO_CUSTOMER_CATCHUP_LIMIT');if(typeof hooks.dispatchCustomer!=='function')fail('PORTFOLIO_CUSTOMER_CATCHUP_REQUIRED');const old=row.root,cmd={type:'advance',minutes:lag},next=hooks.dispatchCustomer(old,cmd);if(!next||next===old||next.clock!==old.clock+lag||next.revision!==old.revision+1||JSON.stringify(next.commands?.at(-1)?.command)!==JSON.stringify(cmd))fail('PORTFOLIO_CUSTOMER_CATCHUP_FAILED');row.root=copy(next);row.clock=next.clock;verifyChild(row.root,{...row,clock:row.root.clock},hooks);}
   row.active=active;
   append(s,active?'CUSTOMER_ACTIVATED':'CUSTOMER_DEACTIVATED',{customerId:row.id});
  }else fail('INVALID_PORTFOLIO_COMMAND');
  s.revision++;return validate(s,hooks);
 }
 function advance(s,hooks={}){
  if(s&&!own(s,'checkpoint')){const upgraded=migrateKnown(s);for(const k of Object.keys(s))delete s[k];Object.assign(s,upgraded);}pack(s);if(typeof hooks.dispatchCustomer!=='function')fail('PORTFOLIO_CUSTOMER_DISPATCH_REQUIRED');
  for(const row of s.customers.filter(x=>x.active)){
   const old=row.root,cmd={type:'advance',minutes:1},next=hooks.dispatchCustomer(old,cmd);
   if(!next||next===old||next.clock!==s.clock+1||!integer(next.revision)||next.revision!==old.revision+1||!Array.isArray(next.commands)||JSON.stringify(next.commands.at(-1)?.command)!==JSON.stringify(cmd))fail('PORTFOLIO_CUSTOMER_TICK_INVALID');
   const cfg={...row,clock:s.clock+1};verifyChild(next,cfg,hooks);row.root=typeof hooks.adoptAdvancedCustomer==='function'?hooks.adoptAdvancedCustomer(next):copy(next);row.clock=next.clock;
  }
  s.clock++;s.revision++;append(s,'PORTFOLIO_TICK',{activeCustomers:s.customers.filter(x=>x.active).length});return validate(s,hooks);
 }
 function validate(s,hooks={}){
  if(s&&own(s,'checkpoint'))exactFields(s,['pack','version','contentVersion','clock','revision','nextId','selectedCustomer','customers','journal','checkpoint'],'INVALID_PORTFOLIO_STATE');
  else exactFields(s,['pack','version','contentVersion','clock','revision','nextId','selectedCustomer','customers','journal'],'INVALID_PORTFOLIO_STATE');
  if(s&&!own(s,'checkpoint')){const old=migrateKnown(s);return validate(old,hooks);}
  if(!s||s.pack!==PACK||s.version!==VERSION||s.contentVersion!==CONTENT||!integer(s.clock)||!integer(s.revision)||!integer(s.nextId)||!Array.isArray(s.customers)||s.customers.length>MAX_CUSTOMERS||!Array.isArray(s.journal)||s.journal.length>MAX_JOURNAL||s.revision!==s.nextId-1)fail('INVALID_PORTFOLIO_STATE');
  const cp=s.checkpoint;if(!cp||typeof cp!=='object'||Array.isArray(cp)||Object.keys(cp).sort().join(',')!=='count,digest,facts,throughAt,throughId'||!integer(cp.throughId)||!integer(cp.throughAt)||cp.throughAt>s.clock||!integer(cp.count)||cp.count!==cp.throughId||!cp.facts||typeof cp.facts!=='object'||Array.isArray(cp.facts)||Object.entries(cp.facts).some(([k,v])=>!k||!integer(v)||v===0)||Object.values(cp.facts).reduce((a,b)=>a+b,0)!==cp.count||cp.digest!==digest({throughId:cp.throughId,throughAt:cp.throughAt,count:cp.count,facts:cp.facts}))fail('INVALID_PORTFOLIO_CHECKPOINT');
  if(s.journal.length!==Math.min(MAX_JOURNAL,s.revision-cp.count)||s.nextId!==cp.throughId+s.journal.length+1)fail('INVALID_PORTFOLIO_STATE');
  const ids=new Set(),tenants=new Set();
  for(const c of s.customers){
   exactFields(c,['id','tenant','name','market','scenario','jurisdiction','clock','active','root'],'INVALID_PORTFOLIO_CUSTOMER_STATE');
   if(!c||!id(c.id)||!id(c.tenant)||ids.has(c.id)||tenants.has(c.tenant)||typeof c.name!=='string'||!c.name.trim()||c.name.length>100||!own(markets,c.market)||!scenarios.includes(c.scenario)||typeof c.active!=='boolean')fail('INVALID_PORTFOLIO_CUSTOMER_STATE');
   ids.add(c.id);tenants.add(c.tenant);const m=markets[c.market];if(c.jurisdiction!==m.jurisdiction||c.clock!==c.root?.clock||c.root?.jurisdiction!==m.jurisdiction||c.root?.scenario!==c.scenario||!integer(c.root?.clock)||c.root.clock>s.clock||c.active&&c.root.clock!==s.clock||c.root?.tenant!==c.tenant||c.root?.customerName!==undefined&&c.root.customerName!==c.name)fail('PORTFOLIO_MARKET_BINDING_INVALID');
   if(forbiddenChildPacks.some(k=>own(c.root,k)))fail('PORTFOLIO_NESTED_PACK_FORBIDDEN');
   if(typeof hooks.validateCustomer==='function'&&hooks.validateCustomer(c.root)!==true)fail('PORTFOLIO_CUSTOMER_VALIDATION_FAILED');
  }
  if(s.selectedCustomer!==null&&!ids.has(s.selectedCustomer))fail('INVALID_PORTFOLIO_SELECTION');
  if(s.journal.some((e,i)=>!e||e.id!==`portfolio-event-${cp.throughId+i+1}`||!integer(e.at)||e.at>s.clock||typeof e.kind!=='string'||i===0&&e.at<cp.throughAt||i>0&&e.at<s.journal[i-1].at))fail('INVALID_PORTFOLIO_JOURNAL');
  return s;
 }
 function financials(s){
  const rows=s.customers.map(c=>{const b=c.root.business;const revenue=b?.balance?.revenue||0,cost=b?.balance?.cost||0,cash=b?.balance?.cash||0,funding=b?.balance?.funding||0,repaid=b?.balance?.repaid||0,debt=b?.loans?.reduce((n,l)=>n+l.principal,0)||0,opening=b?.balance?.opening||0,internal=b?.ledger?.filter(x=>x.category==='internal').reduce((n,x)=>n+x.cents,0)||0;
   return {customerId:c.id,currency:b?.currency||null,externalRevenueCents:revenue,externalCostCents:cost,externalProfitCents:revenue-cost,openingCapitalCents:opening,cashIncludingOpeningCapitalCents:cash,externalFundingCents:funding,externalRepaidCents:repaid,externalDebtCents:debt,internalLedgerNetCents:internal,coreOperationalRevenueCents:c.root.totals?.revenue||0,coreOperationalCostCents:c.root.totals?.cost||0};});
  const sum=k=>{const value=rows.reduce((n,r)=>n+r[k],0);if(!Number.isSafeInteger(value))fail('PORTFOLIO_MONEY_OVERFLOW');return value;};
  return {currency:'AUD',customers:rows,externalRevenueCents:sum('externalRevenueCents'),externalCostCents:sum('externalCostCents'),externalProfitCents:sum('externalProfitCents'),openingCapitalCents:sum('openingCapitalCents'),cashIncludingOpeningCapitalCents:sum('cashIncludingOpeningCapitalCents'),externalFundingCents:sum('externalFundingCents'),externalRepaidCents:sum('externalRepaidCents'),externalDebtCents:sum('externalDebtCents'),internalLedgerNetCents:sum('internalLedgerNetCents'),coreOperationalRevenueCents:sum('coreOperationalRevenueCents'),coreOperationalCostCents:sum('coreOperationalCostCents'),portfolioInternalCash:{tracked:false,cents:null}};
 }
 function inspect(s){
  pack(s);return {pack:PACK,clock:s.clock,selectedCustomer:s.selectedCustomer,customers:s.customers.map(c=>({id:c.id,tenant:c.tenant,name:c.name,market:c.market,geography:markets[c.market].geography,jurisdiction:c.jurisdiction,scenario:c.scenario,active:c.active,rootClock:c.root.clock,revision:c.root.revision,acceptedContracts:(c.root.business?.contracts||[]).map(x=>({id:`${c.id}:${x.id}`,offer:x.offer,status:x.status,reasons:copy(x.reasons||[]),billedPeriods:x.billedPeriods})),openInteractions:(c.root.interactions||[]).filter(x=>['arrival','delivery','queued','handling','wrap','ringing','shared-active','parked','connected'].includes(x.phase)).map(x=>`${c.id}:${x.id}`)})),financials:financials(s)};
 }
 function calculate(s){pack(s);const f=financials(s);return {pack:PACK,clock:s.clock,customerCount:s.customers.length,activeCustomerCount:s.customers.filter(x=>x.active).length,contractCount:s.customers.reduce((n,c)=>n+(c.root.business?.contracts||[]).filter(x=>x.status!=='cancelled').length,0),financials:f};}
 function fingerprint(s){return JSON.stringify({clock:s.clock,customers:s.customers.map(c=>({id:c.id,tenant:c.tenant,market:c.market,scenario:c.scenario,active:c.active,rootRevision:c.root.revision,rootClock:c.root.clock,config:Object.fromEntries(Object.entries(c.root.resources||{}).map(([id,r])=>[id,{generation:r.generation,desired:r.desired,effective:r.effective,fault:r.fault}]))}))});}
 const source=()=>`const SOC_PORTFOLIO=(${socPortfolioKernel.toString()})();`;
 return {PACK,VERSION,CONTENT,MAX_CUSTOMERS,MAX_CATCHUP_MINUTES,MAX_JOURNAL,markets,scenarios,create,command,advance,validate,migrateKnown,inspect,calculate,fingerprint,source,hasObligations};
}
const SOC_PORTFOLIO=socPortfolioKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PORTFOLIO;
